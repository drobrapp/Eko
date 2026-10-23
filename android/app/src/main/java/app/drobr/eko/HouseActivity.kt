package app.drobr.eko

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.WindowInsets
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.time.format.DateTimeFormatter

// Casa de Eko: su salón (assets/eko/house.html) es el menú. Eko vive dentro y cada cosa de la casa abre algo.
// Mientras estás en casa, el Eko de la pantalla se esconde (ha vuelto a casa).
class HouseActivity : Activity() {
    private lateinit var web: WebView
    private var loaded = false
    private var insetTop = 24f
    private var insetBottom = 16f
    private fun prefs() = getSharedPreferences("eko", Context.MODE_PRIVATE)
    private fun js(code: String) = runOnUiThread { web.evaluateJavascript(code, null) }

    // Lo que pide el Eko de dentro (el mismo overlay.html, en un marco): bocadillos y saltitos los hace la casa
    inner class EkoBridge {
        @JavascriptInterface fun say(text: String, ms: Int) { js("window.house && house.say(${JSONObject.quote(text)}, ${if (ms > 0) ms else 2800})") }
        @JavascriptInterface fun hop(v: Double) { js("window.house && house.hop($v)") }
        @JavascriptInterface fun hold(ms: Int) { js("window.house && house.hold($ms)") }
        @JavascriptInterface fun big(on: Boolean) {}
        @JavascriptInterface fun hit(l: Int, t: Int, r: Int, b: Int) {}
        @JavascriptInterface fun tall(on: Boolean) {}
        @JavascriptInterface fun accMode(): String = prefs().getString("acc", "auto") ?: "auto"
        @JavascriptInterface fun born(): String = PcLink.born(this@HouseActivity)
        @JavascriptInterface fun petName(): String = PcLink.petName(this@HouseActivity)
    }

    // Lo que pide la casa
    inner class HouseBridge {
        @JavascriptInterface fun name(): String = PcLink.petName(this@HouseActivity)
        @JavascriptInterface fun born(): String = PcLink.born(this@HouseActivity)
        // Dónde está Eko: "pc" o "phone" (lo último que se sabe; se comprueba cada 10 s)
        @JavascriptInterface fun where(): String = if (PcLink.paired(this@HouseActivity)) PcLink.where(this@HouseActivity) else "phone"
        // «¡Ven aquí!»: lo trae del PC
        @JavascriptInterface fun come() {
            Thread {
                val ok = PcLink.come(this@HouseActivity)
                if (ok) EkoService.instance?.cameFromPc()
                js(if (ok) "window.house && house.arrive()" else "window.house && house.comeFailed()")
            }.start()
        }
        @JavascriptInterface fun open(what: String) { runOnUiThread { openThing(what) } }
        @JavascriptInterface fun give(kind: String) { runOnUiThread { giveNeed(kind) } }
        @JavascriptInterface fun accMode(): String = prefs().getString("acc", "auto") ?: "auto"
        @JavascriptInterface fun setAcc(id: String) { prefs().edit().putString("acc", id).apply() }
        @JavascriptInterface fun lastPhoto(): String = Album.list(this@HouseActivity).lastOrNull()?.let { Uri.fromFile(Album.thumb(this@HouseActivity, it.id)).toString() } ?: ""
        @JavascriptInterface fun finds(): String {
            val f = Walks.finds(this@HouseActivity)
            val a = JSONArray(); Walks.ITEMS.filter { (f[it.id] ?: 0) > 0 }.forEach { a.put(it.emoji) }
            return a.toString()
        }
        @JavascriptInterface fun sunsetMin(): Int = GoldenHour.sunset(this@HouseActivity)?.let { it.hour * 60 + it.minute } ?: -1
        @JavascriptInterface fun needs(): String = EkoService.instance?.needsJson() ?: prefs().let { p ->
            JSONObject().put("hunger", p.getFloat("hunger", 75f)).put("fun", p.getFloat("fun", 70f))
                .put("love", p.getFloat("love", 70f)).put("energy", p.getFloat("energy", 85f)).toString()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        WebView.setWebContentsDebuggingEnabled(true)   // para poder inspeccionar la casa desde Chrome del PC si algo falla
        web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#D99A63"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true            // la última foto del álbum (carpeta privada de la app)
            addJavascriptInterface(EkoBridge(), "Android")
            addJavascriptInterface(HouseBridge(), "House")
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(v: WebView, url: String) { loaded = true; sendInsets() }
            }
            loadUrl("file:///android_asset/eko/house.html")
        }
        // De borde a borde: la casa se pinta también bajo las barras del sistema (la página deja hueco con --top/--bottom)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.setSystemBarsAppearance(0, android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS)
            window.isNavigationBarContrastEnforced = false
        }
        web.setOnApplyWindowInsetsListener { v, ins ->
            val d = resources.displayMetrics.density
            if (Build.VERSION.SDK_INT >= 30) {
                val i = ins.getInsets(WindowInsets.Type.systemBars())
                insetTop = i.top / d; insetBottom = i.bottom / d
            } else {
                @Suppress("DEPRECATION") run { insetTop = ins.systemWindowInsetTop / d; insetBottom = ins.systemWindowInsetBottom / d }
            }
            sendInsets()
            v.onApplyWindowInsets(ins)
        }
        setContentView(web)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
    }
    private fun sendInsets() { if (loaded) js("window.setInsets && setInsets($insetTop, $insetBottom)") }

    // Cada 10 s (con la casa abierta) se pregunta al PC dónde está Eko
    private val whereTick = object : Runnable {
        override fun run() { checkWhere(); web.postDelayed(this, 5_000) }
    }
    private var whereBusy = false
    private fun checkWhere() {
        if (!PcLink.paired(this) || whereBusy) return
        whereBusy = true
        Thread {
            val prev = PcLink.where(this)
            val w = PcLink.askWhere(this)
            // Si no encuentra el PC, aquí tienes a Eko igualmente
            val now = w ?: "phone"
            if (w != null) PcLink.setWhere(this, w)
            whereBusy = false
            js("window.house && house.setWhere('$now')")
            // El PC lo ha llamado: la casa hace la magia y, cuando ya ha desaparecido (≈ 2,1 s), se lo pasa al PC
            if (prev != "pc" && w == "pc") {
                val needs = JSONObject(EkoService.instance?.needsJson() ?: prefs().let { p ->
                    JSONObject().put("hunger", p.getFloat("hunger", 75f).toDouble()).put("fun", p.getFloat("fun", 70f).toDouble())
                        .put("love", p.getFloat("love", 70f).toDouble()).put("energy", p.getFloat("energy", 85f).toDouble()).toString()
                })
                Thread.sleep(2100)
                PcLink.giveBack(this, needs)
            }
        }.start()
    }
    override fun onStart() { super.onStart(); web.postDelayed(whereTick, 5_000) }
    override fun onStop() { super.onStop(); web.removeCallbacks(whereTick) }

    override fun onResume() {
        super.onResume()
        checkWhere()
        EkoService.instance?.homeVisit(true)          // Eko ha vuelto a casa
        EkoNotes.seen(this); EkoNotes.schedule(this); GoldenHour.schedule(this)
        js("window.houseRefresh && houseRefresh()")
    }
    override fun onPause() {
        super.onPause()
        EkoService.instance?.homeVisit(false)         // y vuelve a tu pantalla
    }

    private fun giveNeed(kind: String) {
        val s = EkoService.instance
        if (s != null) { s.houseGive(kind); return }
        // Eko está guardado: se apunta directamente
        val p = prefs(); val e = p.edit()
        fun add(k: String, v: Float, d: Float) { e.putFloat(k, (p.getFloat(k, d) + v).coerceIn(0f, 100f)) }
        when (kind) {
            "feed" -> { add("hunger", 35f, 75f); add("love", 3f, 70f) }
            "play" -> { add("fun", 30f, 70f); add("love", 4f, 70f); add("energy", -3f, 85f) }
            "pet" -> add("love", 4f, 70f)
        }
        e.apply()
    }

    private fun openThing(what: String) {
        when (what) {
            "door" -> goOut()
            "settings" -> startActivity(Intent(this, MainActivity::class.java))
            "album", "photo" -> startActivity(Intent(this, AlbumActivity::class.java))
            "diary" -> startActivity(Intent(this, DiaryActivity::class.java))
            "walks" -> walksDialog()
            "finds" -> findsDialog()
        }
    }

    // Puerta: Eko sale a tu pantalla
    private fun goOut() {
        if (!Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Activa «Mostrar sobre otras apps» para Eko y vuelve", Toast.LENGTH_LONG).show()
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            return
        }
        prefs().edit().putBoolean("out", true).apply()
        startForegroundService(Intent(this, EkoService::class.java))
        moveTaskToBack(true)
    }

    private fun fmt(n: Int) = String.format(java.util.Locale("es", "ES"), "%,d", n)

    // Ventana: paseos de hoy, semana, racha y hora dorada
    private fun walksDialog() {
        if (!Walks.has(this)) { Toast.makeText(this, "Este móvil no tiene podómetro", Toast.LENGTH_SHORT).show(); return }
        if (!Walks.allowed(this) && Build.VERSION.SDK_INT >= 29) { requestPermissions(arrayOf(Manifest.permission.ACTIVITY_RECOGNITION), 41); return }
        val d = resources.displayMetrics.density
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding((20 * d).toInt(), (8 * d).toInt(), (20 * d).toInt(), 0) }
        box.addView(TextView(this).apply {
            text = "Hoy: ${fmt(Walks.todaySteps(this@HouseActivity))} de ${fmt(Walks.todayGoal(this@HouseActivity))} pasos"
            textSize = 18f; setTextColor(Color.parseColor("#5A463D")); gravity = Gravity.CENTER
        })
        box.addView(WeekView(this).apply { set(Walks.week(this@HouseActivity), Walks.todayGoal(this@HouseActivity)) })
        val s = Walks.streak(this)
        box.addView(TextView(this).apply {
            text = (if (s > 0) "Racha: $s ${if (s == 1) "día" else "días"}\n" else "") +
                "Esta semana: ${fmt(Walks.week(this@HouseActivity).sumOf { it.second })} · Mejor día: ${fmt(Walks.best(this@HouseActivity))}" +
                (GoldenHour.sunset(this@HouseActivity)?.let { "\nHora dorada hoy en ${GoldenHour.city(this@HouseActivity)}: desde las ${it.minusMinutes(60).format(DateTimeFormatter.ofPattern("H:mm"))}" } ?: "")
            textSize = 14f; setTextColor(Color.parseColor("#7A6458")); gravity = Gravity.CENTER
        })
        AlertDialog.Builder(this).setTitle("Nuestros paseos").setView(box)
            .setPositiveButton("Vale", null)
            .setNeutralButton(if (GoldenHour.city(this) == null) "Avisarme de la hora dorada" else "Cambiar ciudad") { _, _ -> pickCity() }
            .show()
    }
    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, res: IntArray) {
        super.onRequestPermissionsResult(code, perms, res)
        if (code == 41 && Walks.allowed(this)) { EkoService.instance?.walksOn(); walksDialog() }
    }
    private fun pickCity() {
        val names = GoldenHour.CITIES.keys.toList()
        AlertDialog.Builder(this).setTitle("¿Dónde haces fotos?")
            .setItems((names + "No avisarme").toTypedArray()) { _, i ->
                GoldenHour.setCity(this, names.getOrNull(i))
                js("window.houseRefresh && houseRefresh()")
                GoldenHour.sunset(this)?.let { s -> Toast.makeText(this, "Hoy el sol se pone a las ${s.format(DateTimeFormatter.ofPattern("H:mm"))}. Te aviso antes.", Toast.LENGTH_LONG).show() }
            }.show()
    }

    // Baldas: colección de lo que ha encontrado paseando
    private fun findsDialog() {
        val f = Walks.finds(this)
        val seasons = mapOf("autumn" to "(otoño) ", "winter" to "(invierno) ", "spring" to "(primavera) ", "summer" to "(verano) ")
        val txt = Walks.ITEMS.joinToString("\n") { i ->
            val n = f[i.id] ?: 0
            if (n > 0) "${i.emoji}  ${i.name.trim('¡', '!')}  ×$n" else "❔  ${if (i.rare) "(rara) " else ""}${seasons[i.season] ?: ""}???"
        }
        AlertDialog.Builder(this).setTitle("Mi colección · ${f.size} de ${Walks.ITEMS.size}").setMessage(txt).setPositiveButton("Vale", null).show()
    }
}
