package app.drobr.eko

import android.app.Activity
import android.content.Intent
import android.content.pm.ActivityInfo
import android.graphics.Color
import android.os.Bundle
import android.webkit.WebView

// Las otras ventanas del Eko de escritorio (ajustes, el valle, «Nuestra semana»…) abiertas a pantalla completa.
// Comparten con Eko los datos guardados (es la misma web local) y se hablan con él por el correo de eventos.
class WebActivity : Activity(), Host {
    private var web: WebView? = null
    private var page = ""
    private var exited = false

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        load(intent)
    }

    override fun onNewIntent(i: Intent) {
        super.onNewIntent(i)
        setIntent(i)
        if (Hub.pages[page] === this) Hub.pages.remove(page)
        web?.let { Hub.webs.remove(it); it.destroy() }
        load(i)
    }

    private fun load(i: Intent) {
        page = i.getStringExtra("page") ?: "settings.html"
        requestedOrientation = if (page == "world.html") ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE else ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        val w = WebView(this)
        w.setBackgroundColor(if (page == "wrapped.html") Color.parseColor("#2B211D") else Color.parseColor("#FFF7EE"))
        setContentView(w)
        web = w
        Hub.pages[page] = this
        Hub.setup(this, w, "page", this, page)
    }

    override fun close() { exited = true; finish() }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        val w = web
        if (w != null && w.canGoBack()) w.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        // si sales del valle con «atrás», Eko vuelve igual que si salieras por la puerta
        if (page == "world.html" && !exited) Hub.emit("world-exit", "null")
        if (Hub.pages[page] === this) Hub.pages.remove(page)
        web?.let { Hub.webs.remove(it); it.destroy() }
        web = null
        super.onDestroy()
    }
}
