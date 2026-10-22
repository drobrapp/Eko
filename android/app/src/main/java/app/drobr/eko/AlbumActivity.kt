package app.drobr.eko

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject

// Álbum de Eko: una libreta (assets/eko/album.html) que se pasa deslizando.
// Se abre desde su casa, al compartir fotos con «Eko» o al terminar un paseo de fotos.
class AlbumActivity : Activity() {
    private lateinit var web: WebView
    private var source = "share"

    inner class Bridge {
        @JavascriptInterface fun list(): String {
            val c = this@AlbumActivity
            val photos = JSONArray()
            Album.list(c).forEach { e ->
                photos.put(JSONObject().put("id", e.id).put("time", e.time).put("caption", e.caption)
                    .put("thumb", Uri.fromFile(Album.thumb(c, e.id)).toString())
                    .put("photo", Uri.fromFile(Album.photo(c, e.id)).toString()))
            }
            // Pegatinas: lo que ha encontrado paseando
            val f = Walks.finds(c)
            val st = JSONArray(); Walks.ITEMS.filter { (f[it.id] ?: 0) > 0 }.forEach { st.put(it.emoji) }
            return JSONObject().put("photos", photos).put("stickers", st).toString()
        }
        @JavascriptInterface fun pick() { runOnUiThread { source = "share"; this@AlbumActivity.pick() } }
        @JavascriptInterface fun remove(id: String) { Album.delete(this@AlbumActivity, id) }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#FFF4E8"))
            settings.javaScriptEnabled = true
            settings.allowFileAccess = true          // las fotos del álbum están en la carpeta privada de la app
            webChromeClient = WebChromeClient()      // para el «¿Quitar esta foto?»
            addJavascriptInterface(Bridge(), "AlbumBridge")
            loadUrl("file:///android_asset/eko/album.html")
        }
        setContentView(web)
        handle(intent)
    }

    override fun onNewIntent(i: Intent) { super.onNewIntent(i); handle(i) }
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        web.evaluateJavascript("window.album && album.back()") { r -> if (r != "true") runOnUiThread { finish() } }
    }

    private fun handle(i: Intent?) {
        when (i?.action) {
            Intent.ACTION_SEND -> { source = "share"; uri(i)?.let { import(listOf(it)) } }
            Intent.ACTION_SEND_MULTIPLE -> { source = "share"; import(uris(i)) }
            else -> if (i?.getBooleanExtra("walk", false) == true) { source = "walk"; pick() }
        }
    }
    @Suppress("DEPRECATION")
    private fun uri(i: Intent): Uri? = if (Build.VERSION.SDK_INT >= 33) i.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java) else i.getParcelableExtra(Intent.EXTRA_STREAM)
    @Suppress("DEPRECATION")
    private fun uris(i: Intent): List<Uri> = (if (Build.VERSION.SDK_INT >= 33) i.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java) else i.getParcelableArrayListExtra(Intent.EXTRA_STREAM)) ?: emptyList()

    // Selector de fotos del sistema: no hace falta permiso para leer la galería, solo ve las que eliges
    @Suppress("DEPRECATION")
    private fun pick() {
        val i = if (Build.VERSION.SDK_INT >= 33) Intent(MediaStore.ACTION_PICK_IMAGES).putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, 10)
        else Intent(Intent.ACTION_GET_CONTENT).setType("image/*").putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        try { startActivityForResult(i, 5) } catch (_: Exception) { Toast.makeText(this, "No encuentro la galería", Toast.LENGTH_SHORT).show() }
    }
    @Deprecated("Deprecated in Java")
    override fun onActivityResult(req: Int, res: Int, data: Intent?) {
        super.onActivityResult(req, res, data)
        if (req != 5 || res != RESULT_OK || data == null) return
        val l = mutableListOf<Uri>()
        data.clipData?.let { cd -> for (k in 0 until cd.itemCount) l += cd.getItemAt(k).uri }
        if (l.isEmpty()) data.data?.let { l += it }
        import(l)
    }

    private fun import(l: List<Uri>) {
        if (l.isEmpty()) return
        Toast.makeText(this, "Pegando en su libreta…", Toast.LENGTH_SHORT).show()
        Thread {
            val added = l.mapNotNull { Album.add(this, it, source) }
            runOnUiThread {
                web.evaluateJavascript("window.album && album.reload()", null)
                if (added.isNotEmpty()) {
                    Toast.makeText(this, "Eko: «${added.last().caption}»", Toast.LENGTH_LONG).show()
                    EkoService.instance?.photosAdded(added.size)
                } else Toast.makeText(this, "No he podido guardar esa foto", Toast.LENGTH_SHORT).show()
            }
        }.start()
    }
}
