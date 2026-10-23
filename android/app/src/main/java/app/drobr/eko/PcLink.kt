package app.drobr.eko

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Base64
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

// Conexión con el Eko del PC (fase 1: conectar con el QR y adoptar al Eko del PC).
// El QR trae «eko1:ip:puerto:clave». La clave nunca viaja: el móvil se identifica con su SHA-256 (token)
// y el estado llega cifrado (AES-GCM) con esa clave. Solo por la Wi-Fi de casa, sin internet.
object PcLink {
    private fun prefs(c: Context) = c.getSharedPreferences("eko", Context.MODE_PRIVATE)
    fun paired(c: Context) = prefs(c).getString("pcKey", null) != null
    fun petName(c: Context): String = prefs(c).getString("petName", null) ?: "Eko"
    fun born(c: Context): String = prefs(c).getString("born", null) ?: ""

    private fun unhex(h: String) = ByteArray(h.length / 2) { h.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
    private fun hex(b: ByteArray) = b.joinToString("") { "%02x".format(it) }

    // Abre el lector de QR de Google (sin pedir permiso de cámara) y se conecta
    fun pair(a: Activity, done: (ok: Boolean, msg: String) -> Unit) {
        val opts = GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
        GmsBarcodeScanning.getClient(a, opts).startScan()
            .addOnSuccessListener { b ->
                val raw = b.rawValue ?: ""
                val p = raw.split(":")
                if (p.size != 4 || p[0] != "eko1") { done(false, "Ese código no es el de Eko"); return@addOnSuccessListener }
                Thread {
                    val r = connect(a.applicationContext, p[1], p[2].toIntOrNull() ?: 0, p[3])
                    Handler(Looper.getMainLooper()).post { done(r.first, r.second) }
                }.start()
            }
            .addOnCanceledListener { done(false, "") }
            .addOnFailureListener { done(false, "No he podido abrir el lector de códigos") }
    }

    private fun connect(c: Context, ip: String, port: Int, keyHex: String): Pair<Boolean, String> {
        val token = hex(MessageDigest.getInstance("SHA-256").digest(unhex(keyHex)))
        val base = "http://$ip:$port"
        try {
            val (code, _) = http("$base/pair", token, "POST")
            if (code != 200) return false to "El PC no me ha dejado entrar. Vuelve a generar el código en el PC"
        } catch (_: Exception) {
            return false to "No encuentro el PC. ¿Estáis los dos en la misma Wi-Fi? Si Windows preguntó por la red, hay que decirle que sí"
        }
        prefs(c).edit().putString("pcIp", ip).putInt("pcPort", port).putString("pcKey", keyHex).putString("pcToken", token).apply()
        // El PC prepara el estado de Eko en unos segundos: se espera un poco
        repeat(15) {
            try {
                val (code, body) = http("$base/state", token, "GET")
                if (code == 200 && body.contains("\"ct\"")) { adopt(c, decrypt(keyHex, body)); return true to "" }
            } catch (_: Exception) {}
            Thread.sleep(1000)
        }
        return true to "Conectados, pero el PC aún no me ha pasado a Eko. Lo intentaré más tarde"
    }

    private fun http(url: String, token: String, method: String): Pair<Int, String> {
        val k = URL(url).openConnection() as HttpURLConnection
        k.connectTimeout = 4000; k.readTimeout = 8000; k.requestMethod = method
        k.setRequestProperty("X-Eko-Token", token)
        if (method == "POST") { k.doOutput = true; k.setFixedLengthStreamingMode(0); k.outputStream.close() }
        val code = k.responseCode
        val body = (if (code < 400) k.inputStream else k.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
        k.disconnect()
        return code to body
    }

    private fun decrypt(keyHex: String, body: String): JSONObject {
        val j = JSONObject(body)
        val iv = Base64.decode(j.getString("iv"), Base64.DEFAULT)
        val ct = Base64.decode(j.getString("ct"), Base64.DEFAULT)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(unhex(keyHex), "AES"), GCMParameterSpec(128, iv))
        return JSONObject(String(cipher.doFinal(ct), Charsets.UTF_8))
    }

    // El móvil adopta al Eko del PC: nombre, día en que nació y necesidades.
    // Lo propio del móvil (pasos, colección, álbum, diario) no se toca. Se guarda todo para las próximas fases.
    private fun adopt(c: Context, snap: JSONObject) {
        File(c.filesDir, "pc-eko.json").writeText(snap.toString())
        val d = snap.optJSONObject("data") ?: return
        val e = prefs(c).edit()
        try { JSONObject(d.optString("eko-settings", "{}")).optString("petName").takeIf { it.isNotBlank() }?.let { e.putString("petName", it) } } catch (_: Exception) {}
        d.optString("eko-born", "").trim('"').takeIf { it.isNotBlank() }?.let { e.putString("born", it) }
        e.putString("pcProgress", d.optString("eko-progress", ""))
        e.putLong("adoptedAt", System.currentTimeMillis())
        var n: JSONObject? = null
        try { n = JSONObject(d.optString("eko-needs", "{}")) } catch (_: Exception) {}
        if (n != null && n.has("hunger")) {
            val h = n.optDouble("hunger", 75.0).toFloat(); val f = n.optDouble("fun", 70.0).toFloat()
            val l = n.optDouble("love", 70.0).toFloat(); val en = n.optDouble("energy", 85.0).toFloat()
            e.putFloat("hunger", h).putFloat("fun", f).putFloat("love", l).putFloat("energy", en)
            e.apply()
            EkoService.instance?.adopted(h, f, l, en)
        } else { e.apply(); EkoService.instance?.adopted(null, null, null, null) }
    }
}
