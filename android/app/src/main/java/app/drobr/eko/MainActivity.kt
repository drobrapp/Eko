package app.drobr.eko

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.WindowInsets
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject

// Ajustes de Eko (se abren desde los cajones de la cómoda de su casa). La página es assets/eko/settings.html,
// con el mismo estilo que la casa; aquí solo están las acciones de Android.
class MainActivity : Activity() {
    private lateinit var web: WebView
    private var loaded = false
    private var insetTop = 24f
    private var insetBottom = 16f
    private var updMsg = ""
    private fun prefs() = getSharedPreferences("eko", MODE_PRIVATE)
    private fun js(code: String) = runOnUiThread { if (loaded) web.evaluateJavascript(code, null) }
    private fun refresh() = js("window.render && render()")

    inner class Bridge {
        @JavascriptInterface fun state(): String {
            val c = this@MainActivity
            return JSONObject()
                .put("name", PcLink.petName(c)).put("level", PcLink.level(c)).put("born", PcLink.born(c))
                .put("overlay", Settings.canDrawOverlays(c)).put("out", EkoService.running)
                .put("where", if (PcLink.paired(c)) PcLink.where(c) else "phone")
                .put("paired", PcLink.paired(c)).put("follow", prefs().getBoolean("followPc", true))
                .put("access", EkoAccess.enabled(c))
                .put("notes", EkoNotes.enabled(c))
                .put("notif", Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
                .put("version", Updater.versionName(c)).put("upd", updMsg)
                .toString()
        }
        @JavascriptInterface fun toggleOut() { runOnUiThread { if (EkoService.running) putAway() else bringOut() } }
        @JavascriptInterface fun overlayPerm() { runOnUiThread { startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))) } }
        @JavascriptInterface fun connectPc() {
            runOnUiThread {
                PcLink.pair(this@MainActivity) { ok, msg ->
                    refresh()
                    when {
                        ok && msg.isEmpty() -> js("toast(${JSONObject.quote("¡${PcLink.petName(this@MainActivity)} ya está aquí!")})")
                        msg.isNotEmpty() -> js("toast(${JSONObject.quote(msg)}, 6000)")
                    }
                }
            }
        }
        @JavascriptInterface fun toggleFollow() { prefs().edit().putBoolean("followPc", !prefs().getBoolean("followPc", true)).apply(); refresh() }
        @JavascriptInterface fun accessSettings() { runOnUiThread { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) } }
        @JavascriptInterface fun appInfo() { runOnUiThread { startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) } }
        @JavascriptInterface fun toggleNotes() { EkoNotes.setEnabled(this@MainActivity, !EkoNotes.enabled(this@MainActivity)); refresh() }
        @JavascriptInterface fun testNote() { runOnUiThread { EkoNotes.fire(this@MainActivity, test = true); js("toast('Eko te ha escrito')") } }
        @JavascriptInterface fun notifPerm() { runOnUiThread { if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1) } }
        @JavascriptInterface fun checkUpdate() { runOnUiThread { checkUpd() } }
        @JavascriptInterface fun unknownSources() { runOnUiThread { startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName"))) } }
        @JavascriptInterface fun album() { runOnUiThread { startActivity(Intent(this@MainActivity, AlbumActivity::class.java)) } }
        @JavascriptInterface fun diary() { runOnUiThread { startActivity(Intent(this@MainActivity, DiaryActivity::class.java)) } }
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
                override fun onPageFinished(v: WebView, url: String) { loaded = true; sendInsets(); refresh() }
            }
            loadUrl("file:///android_asset/eko/settings.html")
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
            if (Build.VERSION.SDK_INT >= 30) { val i = ins.getInsets(WindowInsets.Type.systemBars()); insetTop = i.top / d; insetBottom = i.bottom / d }
            else @Suppress("DEPRECATION") run { insetTop = ins.systemWindowInsetTop / d; insetBottom = ins.systemWindowInsetBottom / d }
            sendInsets(); v.onApplyWindowInsets(ins)
        }
        setContentView(web)
    }
    private fun sendInsets() { js("window.setInsets && setInsets($insetTop, $insetBottom)") }

    // Atrás: primero vuelve a la portada de los ajustes; desde la portada, cierra
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (!loaded) { finish(); return }
        web.evaluateJavascript("window.back && back()") { r -> if (r != "true") runOnUiThread { finish() } }
    }

    override fun onResume() {
        super.onResume()
        EkoNotes.seen(this); EkoNotes.schedule(this); GoldenHour.schedule(this)
        refresh()
        checkUpd()
    }
    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, res: IntArray) {
        super.onRequestPermissionsResult(code, perms, res); refresh()
    }

    private fun checkUpd() {
        updMsg = "Buscando novedades…"; refresh()
        Updater.check(this) { msg -> updMsg = msg; refresh() }
    }

    private fun bringOut() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        if (!Settings.canDrawOverlays(this)) {
            js("toast('Activa «Mostrar sobre otras apps» para Eko y vuelve', 5000)")
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            return
        }
        prefs().edit().putBoolean("out", true).apply()
        startForegroundService(Intent(this, EkoService::class.java))
        moveTaskToBack(true)
    }
    private fun putAway() {
        prefs().edit().putBoolean("out", false).apply()
        stopService(Intent(this, EkoService::class.java))
        web.postDelayed({ refresh() }, 300)
    }
}
