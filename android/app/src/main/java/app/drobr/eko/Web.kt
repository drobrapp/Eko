package app.drobr.eko

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject
import java.io.ByteArrayInputStream

// Todo lo que comparten las ventanas web de Eko: el código del Eko de escritorio (assets/web, copiado de src/ al compilar)
// servido como una web local, el puente «Tauri» (assets/mob/shim.js) y el correo de eventos entre ventanas.

interface Host {
    fun pos(x: Double, y: Double) {}
    fun clip(l: Double, t: Double, w: Double, h: Double) {}
    fun show(on: Boolean) {}
    fun focus(on: Boolean) {}
    fun close() {}
    fun screen(): String = "{}"
    fun raw(): String = "null"
}

object Hub {
    const val ORIGIN = "https://appassets.androidplatform.net"
    val main = Handler(Looper.getMainLooper())
    val webs = mutableSetOf<WebView>()
    val pages = mutableMapOf<String, WebActivity>()

    fun emit(name: String, json: String) {
        main.post {
            val code = "window.__ekoBus&&__ekoBus(${JSONObject.quote(name)},${JSONObject.quote(json)})"
            webs.toList().forEach { it.evaluateJavascript(code, null) }
        }
    }

    private val MIME = mapOf(
        "html" to "text/html", "js" to "text/javascript", "css" to "text/css", "json" to "application/json",
        "webp" to "image/webp", "png" to "image/png", "jpg" to "image/jpeg", "svg" to "image/svg+xml", "gif" to "image/gif",
        "woff2" to "font/woff2", "woff" to "font/woff", "ttf" to "font/ttf", "mp3" to "audio/mpeg", "ogg" to "audio/ogg", "wav" to "audio/wav", "txt" to "text/plain"
    )

    @SuppressLint("SetJavaScriptEnabled")
    fun setup(ctx: Context, w: WebView, kind: String, host: Host, page: String) {
        WebView.setWebContentsDebuggingEnabled(true)
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.settings.mediaPlaybackRequiresUserGesture = false
        w.settings.textZoom = 100
        w.isVerticalScrollBarEnabled = false
        w.isHorizontalScrollBarEnabled = false
        w.addJavascriptInterface(Bridge(ctx.applicationContext, ctx, w, kind, host), "Android")
        w.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, req: WebResourceRequest): WebResourceResponse? {
                val u = req.url
                if (u.host != "appassets.androidplatform.net") return null
                val path = (u.path ?: "/").trimStart('/')
                val ext = path.substringAfterLast('.', "").lowercase()
                return try {
                    val bytes = ctx.assets.open(path).use { it.readBytes() }
                    val body = if (ext == "html") inject(String(bytes, Charsets.UTF_8), kind).toByteArray(Charsets.UTF_8) else bytes
                    WebResourceResponse(MIME[ext] ?: "application/octet-stream", if (ext in setOf("html", "js", "css", "json", "txt", "svg")) "utf-8" else null, ByteArrayInputStream(body))
                        .apply { responseHeaders = mapOf("Access-Control-Allow-Origin" to "*", "Cache-Control" to "no-cache") }
                } catch (_: Exception) {
                    WebResourceResponse("text/plain", "utf-8", 404, "Not found", mapOf(), ByteArrayInputStream(ByteArray(0)))
                }
            }
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                val u = req.url
                if (u.host == "appassets.androidplatform.net") return false
                try { ctx.startActivity(Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) {}
                return true
            }
        }
        webs.add(w)
        w.loadUrl("$ORIGIN/web/$page")
    }

    // El puente va lo primero de todo (antes que el código de Eko) y, en la ventana de Eko, lo del móvil al final
    private fun inject(html: String, kind: String): String {
        var h = html.replaceFirst("<head>", "<head><script src=\"/mob/shim.js\"></script>")
        if (kind == "overlay") h = h.replace("</body>", "<script src=\"/mob/mobile.js\"></script></body>")
        return h
    }

    fun openPage(ctx: Context, page: String) {
        ctx.startActivity(Intent(ctx, WebActivity::class.java).putExtra("page", page)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP))
    }
}

class Bridge(private val app: Context, private val ctx: Context, private val web: WebView, private val kind: String, private val host: Host) {
    @JavascriptInterface fun kind(): String = kind
    @JavascriptInterface fun version(): String = BuildConfig.DESK_VERSION
    @JavascriptInterface fun screen(): String = host.screen()
    @JavascriptInterface fun raw(): String = host.raw()
    @JavascriptInterface fun pos(x: Double, y: Double) = host.pos(x, y)
    @JavascriptInterface fun clip(l: Double, t: Double, w: Double, h: Double) = host.clip(l, t, w, h)
    @JavascriptInterface fun show(on: Boolean) { Hub.main.post { host.show(on) } }
    @JavascriptInterface fun focus(on: Boolean) { Hub.main.post { host.focus(on) } }
    @JavascriptInterface fun close() { Hub.main.post { host.close() } }
    @JavascriptInterface fun emit(name: String, json: String) = Hub.emit(name, json)
    @JavascriptInterface fun vibrate() {
        try {
            val v = app.getSystemService(Vibrator::class.java)
            if (Build.VERSION.SDK_INT >= 29) v.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK))
            else v.vibrate(VibrationEffect.createOneShot(15, 80))
        } catch (_: Exception) {}
    }

    private fun reply(id: Int, ok: Boolean, json: String?) {
        Hub.main.post { web.evaluateJavascript("window.__ekoRes&&__ekoRes($id,$ok,${if (json == null) "null" else JSONObject.quote(json)})", null) }
    }

    // Las órdenes que en el PC hace Rust. Las que no tienen sentido en el móvil fallan y el código de Eko ya sabe qué decir.
    @JavascriptInterface fun invoke(id: Int, cmd: String, args: String) {
        val a = try { JSONObject(args) } catch (_: Exception) { JSONObject() }
        val q = { s: String -> JSONObject.quote(s) }
        try {
            when (cmd) {
                "set_sound_menu", "set_discretion", "set_autostart", "corner_interact" -> reply(id, true, null)
                "get_autostart" -> reply(id, true, "false")
                "app_version" -> reply(id, true, q(BuildConfig.DESK_VERSION))
                "set_main_visible" -> { Hub.main.post { host.show(a.optBoolean("on", true)) }; reply(id, true, null) }
                "open_settings" -> { Hub.openPage(ctx, "settings.html"); reply(id, true, null) }
                "world_show" -> { Hub.openPage(ctx, "world.html"); reply(id, true, null) }
                "wrapped_show" -> { Hub.openPage(ctx, "wrapped.html"); reply(id, true, null) }
                "world_hide", "wrapped_hide" -> { val pg = cmd.removeSuffix("_hide") + ".html"; Hub.main.post { Hub.pages[pg]?.close() }; reply(id, true, null) }
                "open_site" -> { open(Uri.parse(a.optString("url"))); reply(id, true, null) }
                "web_search" -> { open(Uri.parse("https://www.google.com/search?q=" + Uri.encode(a.optString("q")))); reply(id, true, null) }
                "check_update_now" -> { Hub.main.post { Updater.check(app) }; reply(id, true, null) }
                "volume" -> {
                    val am = app.getSystemService(AudioManager::class.java)
                    val d = when (a.optString("dir")) { "up" -> AudioManager.ADJUST_RAISE; "down" -> AudioManager.ADJUST_LOWER; else -> AudioManager.ADJUST_TOGGLE_MUTE }
                    am.adjustStreamVolume(AudioManager.STREAM_MUSIC, d, AudioManager.FLAG_SHOW_UI)
                    reply(id, true, null)
                }
                else -> reply(id, false, q("No disponible en el móvil"))
            }
        } catch (e: Exception) { reply(id, false, q(e.message ?: "error")) }
    }

    private fun open(u: Uri) { ctx.startActivity(Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}
