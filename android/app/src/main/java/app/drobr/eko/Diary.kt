package app.drobr.eko

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.speech.RecognizerIntent
import android.view.WindowInsets
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.LocalDate
import java.util.Locale
import kotlin.random.Random

// Diario: le cuentas tu día a Eko (hablando o escribiendo) y él te contesta. Todo se queda en el móvil.
object Diary {
    data class Entry(val time: Long, val text: String)
    private fun file(c: Context) = File(c.filesDir, "diary.json")

    fun list(c: Context): List<Entry> = try {
        val a = JSONArray(file(c).readText())
        (0 until a.length()).map { val o = a.getJSONObject(it); Entry(o.getLong("t"), o.getString("x")) }
    } catch (_: Exception) { emptyList() }
    private fun save(c: Context, l: List<Entry>) {
        val a = JSONArray(); l.forEach { a.put(JSONObject().put("t", it.time).put("x", it.text)) }
        file(c).writeText(a.toString())
    }
    fun add(c: Context, text: String) = save(c, list(c) + Entry(System.currentTimeMillis(), text))
    fun delete(c: Context, time: Long) = save(c, list(c).filter { it.time != time })
    fun writtenToday(c: Context): Boolean {
        val t = LocalDate.now()
        return list(c).any { java.time.Instant.ofEpochMilli(it.time).atZone(java.time.ZoneId.systemDefault()).toLocalDate() == t }
    }

    // Lo que contesta Eko según lo que le cuentas (palabras clave, sin IA y sin salir del móvil)
    private val REPLIES = listOf(
        listOf("triste", "fatal", "llor", "mal día", "muy mal", "sola", "solo ") to listOf("Vaya… gracias por contármelo. Aquí estoy contigo", "Hay días así. Mañana te espero con un abrazo de plastilina", "Te mando un abrazo enorme. Bueno, de mi tamaño"),
        listOf("estrés", "estres", "agobi", "nervios", "ansie", "prisa", "lío") to listOf("Respira hondo conmigo: uno, dos, tres… Mañana irá mejor", "Qué día más intenso. Ahora toca descansar", "Lo has sacado adelante. Eso es lo importante"),
        listOf("cansad", "agotad", "sueño", "reventad") to listOf("Hoy toca dormir como un tronco. Te lo has ganado", "A la cama pronto, ¿vale? Yo también me acuesto", "Pies arriba y a descansar"),
        listOf("foto", "sesión", "sesion", "cámara", "camara", "editar", "edité") to listOf("¿Y esas fotos? ¡Quiero verlas en mi álbum!", "Qué día más fotográfico. Me encanta", "Seguro que te han quedado preciosas"),
        listOf("comida", "cena", "comí", "comimos", "galleta", "restaurante") to listOf("¿Y no me guardaste nada?", "Qué hambre me ha dado leerte", "Lo importante: ¿había postre?"),
        listOf("paseo", "caminar", "andar", "andando", "salí", "salimos") to listOf("¡Paseíto! Mis piernas lo agradecen", "Qué bien que saliéramos", "Cuantos más paseos, mejor"),
        listOf("feliz", "genial", "contento", "contenta", "increíble", "guay", "bonito", "me encanta", "divertid", "risas") to listOf("¡Qué bien! Me alegro muchísimo", "Esto lo guardo en la página de los días buenos", "Me has contagiado la sonrisa"),
    )
    fun reply(text: String): String {
        val t = text.lowercase(Locale("es", "ES"))
        val hit = REPLIES.firstOrNull { (keys, _) -> keys.any { t.contains(it) } }?.second
            ?: listOf("Gracias por contármelo. Lo guardo en mi diario", "Apuntado. Me gusta saber de tu día", "Qué bien que me lo cuentes")
        return hit[Random.nextInt(hit.size)]
    }
}

// Pantalla del diario: la página es assets/eko/diary.html (mismo estilo que su casa); aquí solo el dictado y los datos
class DiaryActivity : Activity() {
    private lateinit var web: WebView
    private var loaded = false
    private var insetTop = 24f
    private var insetBottom = 16f
    private fun js(code: String) = runOnUiThread { if (loaded) web.evaluateJavascript(code, null) }

    inner class Bridge {
        @JavascriptInterface fun list(): String {
            val a = JSONArray(); Diary.list(this@DiaryActivity).forEach { a.put(JSONObject().put("t", it.time).put("x", it.text)) }
            return a.toString()
        }
        @JavascriptInterface fun save(text: String): String {
            Diary.add(this@DiaryActivity, text)
            val r = Diary.reply(text)
            EkoService.instance?.diaryDone(r)
            return r
        }
        @JavascriptInterface fun remove(time: Long) { Diary.delete(this@DiaryActivity, time) }
        @JavascriptInterface fun listen() { runOnUiThread { startListening() } }
        @JavascriptInterface fun close() { runOnUiThread { finish() } }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#D99A63"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            addJavascriptInterface(Bridge(), "App")
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(v: WebView, url: String) { loaded = true; sendInsets() }
            }
            loadUrl("file:///android_asset/eko/diary.html")
        }
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
                // incluye el teclado: así la casilla de texto nunca queda debajo
                val i = ins.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
                insetTop = i.top / d; insetBottom = i.bottom / d
            } else @Suppress("DEPRECATION") run { insetTop = ins.systemWindowInsetTop / d; insetBottom = ins.systemWindowInsetBottom / d }
            sendInsets(); v.onApplyWindowInsets(ins)
        }
        setContentView(web)
    }
    private fun sendInsets() { js("window.setInsets && setInsets($insetTop, $insetBottom)") }

    // Dictado del sistema (Google): no hace falta permiso de micrófono en Eko. Se puede pulsar varias veces y se va añadiendo.
    @Suppress("DEPRECATION")
    private fun startListening() {
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-ES")
            .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            .putExtra(RecognizerIntent.EXTRA_PROMPT, "Cuéntaselo a Eko")
        try { startActivityForResult(i, 7) } catch (_: ActivityNotFoundException) { js("window.toast && toast('Este móvil no tiene dictado por voz')") }
    }
    @Deprecated("Deprecated in Java")
    override fun onActivityResult(req: Int, res: Int, data: Intent?) {
        super.onActivityResult(req, res, data)
        if (req != 7 || res != RESULT_OK) return
        val said = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull() ?: return
        js("window.addText && addText(${JSONObject.quote(said)})")
    }
}
