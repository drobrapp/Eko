package app.drobr.eko

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.random.Random

// Álbum de Eko: fotos que le das (desde su casa, al compartir con «Eko» o tras un paseo de fotos).
// Se guarda una copia reducida dentro de la app (nunca sale del móvil), con la fecha y un comentario suyo.
object Album {
    data class Entry(val id: String, val time: Long, val caption: String, val source: String)

    private fun dir(c: Context) = File(c.filesDir, "album").apply { mkdirs() }
    private fun index(c: Context) = File(dir(c), "index.json")
    fun photo(c: Context, id: String) = File(dir(c), "$id.jpg")
    fun thumb(c: Context, id: String) = File(dir(c), "$id-t.jpg")

    fun list(c: Context): List<Entry> {
        val f = index(c); if (!f.exists()) return emptyList()
        return try {
            val a = JSONArray(f.readText())
            (0 until a.length()).map { val o = a.getJSONObject(it); Entry(o.getString("id"), o.getLong("t"), o.optString("c"), o.optString("s")) }
        } catch (_: Exception) { emptyList() }
    }
    private fun save(c: Context, l: List<Entry>) {
        val a = JSONArray(); l.forEach { a.put(JSONObject().put("id", it.id).put("t", it.time).put("c", it.caption).put("s", it.source)) }
        index(c).writeText(a.toString())
    }

    private val CAPTIONS = mapOf(
        "walk" to listOf("Del paseo de fotos. ¡Qué buen ojo!", "Cazada en nuestro paseo", "Reto cumplido. Para enmarcar", "Esta la hicimos juntos. Bueno, tú"),
        "share" to listOf("¡Me la has regalado!", "Una de tus favoritas, seguro", "Qué luz más bonita", "Esta me encanta", "La guardo con cariño", "Para mi colección de cosas bonitas"),
    )
    fun caption(source: String) = (CAPTIONS[source] ?: CAPTIONS["share"]!!).let { it[Random.nextInt(it.size)] }

    // Copia reducida (máx. 1600 px y miniatura de 360 px), girada según la foto
    fun add(c: Context, uri: Uri, source: String): Entry? = try {
        val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        c.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
        var sample = 1
        while (maxOf(opts.outWidth, opts.outHeight) / (sample * 2) >= 1600) sample *= 2
        var bmp = c.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) }
            ?: throw IllegalStateException("no image")
        val rot = try {
            c.contentResolver.openInputStream(uri)?.use {
                when (ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> 90f; ExifInterface.ORIENTATION_ROTATE_180 -> 180f; ExifInterface.ORIENTATION_ROTATE_270 -> 270f; else -> 0f
                }
            } ?: 0f
        } catch (_: Exception) { 0f }
        if (rot != 0f) bmp = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, Matrix().apply { postRotate(rot) }, true)
        bmp = scale(bmp, 1600)
        val id = System.currentTimeMillis().toString(36) + Random.nextInt(1000)
        photo(c, id).outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 88, it) }
        thumb(c, id).outputStream().use { scale(bmp, 360).compress(Bitmap.CompressFormat.JPEG, 80, it) }
        val e = Entry(id, System.currentTimeMillis(), caption(source), source)
        save(c, list(c) + e)
        e
    } catch (_: Exception) { null }

    private fun scale(b: Bitmap, max: Int): Bitmap {
        val m = maxOf(b.width, b.height); if (m <= max) return b
        val k = max.toFloat() / m
        return Bitmap.createScaledBitmap(b, (b.width * k).toInt(), (b.height * k).toInt(), true)
    }

    fun delete(c: Context, id: String) {
        photo(c, id).delete(); thumb(c, id).delete()
        save(c, list(c).filter { it.id != id })
    }
}
