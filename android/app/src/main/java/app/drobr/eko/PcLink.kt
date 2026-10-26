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
        prefs(c).edit().putString("pcIp", ip).putInt("pcPort", port).putString("pcKey", keyHex).putString("pcToken", token).putString("where", "phone").apply()
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

    private fun http(url: String, token: String, method: String, send: String? = null): Pair<Int, String> {
        val k = URL(url).openConnection() as HttpURLConnection
        k.connectTimeout = 4000; k.readTimeout = 8000; k.requestMethod = method
        k.setRequestProperty("X-Eko-Token", token)
        if (method == "POST") {
            val bytes = (send ?: "").toByteArray(Charsets.UTF_8)
            k.doOutput = true; k.setRequestProperty("Content-Type", "application/json"); k.setFixedLengthStreamingMode(bytes.size)
            k.outputStream.use { it.write(bytes) }
        }
        val code = k.responseCode
        val body = (if (code < 400) k.inputStream else k.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
        k.disconnect()
        return code to body
    }

    // ---------- Fase 2: la mudanza ----------
    // where: "pc" (está en el PC) o "phone" (está aquí). Si no se puede preguntar al PC, aquí tiene a Eko igualmente.
    fun where(c: Context): String = prefs(c).getString("where", "phone") ?: "phone"
    fun setWhere(c: Context, w: String) { prefs(c).edit().putString("where", w).apply() }
    private fun base(c: Context): String? {
        val p = prefs(c); val ip = p.getString("pcIp", null) ?: return null
        return "http://$ip:${p.getInt("pcPort", 47913)}"
    }
    private fun token(c: Context) = prefs(c).getString("pcToken", "") ?: ""

    // Pregunta al PC dónde está Eko. null = no lo encuentra (otra Wi-Fi, PC apagado…). No llamar en el hilo principal.
    // De paso apunta cuánto lleva el PC sin tocarse (lastPcIdle, en segundos), para que Eko te siga.
    @Volatile var lastPcIdle = 0
    fun askWhere(c: Context): String? {
        val b = base(c) ?: return null
        return try {
            val (code, body) = http("$b/where", token(c), "GET")
            if (code == 200) { val j = JSONObject(body); lastPcIdle = j.optInt("pcIdle", 0); j.optString("where", "pc") } else null
        } catch (_: Exception) { null }
    }

    // «¡Ven aquí!» desde el móvil: el PC lo deja ir y nos pasa su estado. No llamar en el hilo principal.
    fun come(c: Context): Boolean {
        val b = base(c) ?: return false
        val key = prefs(c).getString("pcKey", null) ?: return false
        return try {
            val (code, body) = http("$b/come", token(c), "POST")
            if (code != 200) return false
            if (body.contains("\"ct\"")) adopt(c, decrypt(key, body), quiet = true)
            setWhere(c, "phone")
            true
        } catch (_: Exception) { false }
    }

    // Eko se ha ido al PC: se le pasan sus necesidades de aquí. No llamar en el hilo principal.
    fun giveBack(c: Context, needs: JSONObject): Boolean {
        val b = base(c) ?: return false
        val key = prefs(c).getString("pcKey", null) ?: return false
        return try {
            Reminders.cancelAll(c)
            val led = Progress.peekLedger(c)
            val plain = JSONObject().put("app", "eko").put("v", 1).put("from", "phone").put("at", System.currentTimeMillis()).put("needs", needs)
                .put("done", Reminders.takeDone(c)).put("recap", recap(c)).put("progress", led)
            val (code, _) = http("$b/give", token(c), "POST", encrypt(key, plain.toString()))
            if (code == 200) Progress.commitLedger(c, led)   // el PC ya tiene los puntos: no se vuelven a mandar
            code == 200
        } catch (_: Exception) { false }
    }

    // Lo que ha pasado en el móvil desde que llegó (para que el PC lo comente al volver)
    private fun recap(c: Context): JSONObject {
        val p = prefs(c)
        val photos = (Album.list(c).size - p.getInt("adoptPhotos", 0)).coerceAtLeast(0)
        val before = p.getString("adoptFinds", "") ?: ""
        val now = Walks.finds(c)
        val newFinds = org.json.JSONArray()
        Walks.ITEMS.filter { (now[it.id] ?: 0) > 0 && !before.split(',').contains(it.id) }.take(3).forEach { newFinds.put(it.name.trim('¡', '!')) }
        return JSONObject().put("steps", if (Walks.allowed(c)) Walks.todaySteps(c) else 0).put("goal", if (Walks.allowed(c)) Walks.todayGoal(c) else 0)
            .put("streak", if (Walks.allowed(c)) Walks.streak(c) else 0).put("photos", photos).put("finds", newFinds).put("diary", Diary.writtenToday(c))
    }
    fun level(c: Context): Int = Progress.level(c)

    private fun encrypt(keyHex: String, plain: String): String {
        val iv = ByteArray(12).also { java.security.SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(unhex(keyHex), "AES"), GCMParameterSpec(128, iv))
        val ct = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        return JSONObject().put("iv", Base64.encodeToString(iv, Base64.NO_WRAP)).put("ct", Base64.encodeToString(ct, Base64.NO_WRAP)).toString()
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
    private fun adopt(c: Context, snap: JSONObject, quiet: Boolean = false) {
        File(c.filesDir, "pc-eko.json").writeText(snap.toString())
        val d = snap.optJSONObject("data") ?: return
        val e = prefs(c).edit()
        try { JSONObject(d.optString("eko-settings", "{}")).optString("petName").takeIf { it.isNotBlank() }?.let { e.putString("petName", it) } } catch (_: Exception) {}
        d.optString("eko-born", "").trim('"').takeIf { it.isNotBlank() }?.let { e.putString("born", it) }
        e.putString("pcProgress", d.optString("eko-progress", ""))
        e.putLong("adoptedAt", System.currentTimeMillis())
        snap.optJSONObject("extra")?.optInt("level", 0)?.takeIf { it > 0 }?.let { e.putInt("level", it) }
        snap.optJSONObject("extra")?.let { x -> if (x.has("xp") && !x.isNull("xp")) Progress.adoptBase(c, x.optDouble("xp").toFloat()) }
        // punto de partida para contar lo que pasa en el móvil (fotos y hallazgos nuevos)
        e.putInt("adoptPhotos", Album.list(c).size)
        e.putString("adoptFinds", Walks.finds(c).filter { it.value > 0 }.keys.joinToString(","))
        // recordatorios del PC: mientras Eko esté aquí, te los da el móvil
        try { Reminders.schedule(c, org.json.JSONArray(d.optString("eko-reminders", "[]"))) } catch (_: Exception) {}
        var n: JSONObject? = null
        try { n = JSONObject(d.optString("eko-needs", "{}")) } catch (_: Exception) {}
        if (n != null && n.has("hunger")) {
            val h = n.optDouble("hunger", 75.0).toFloat(); val f = n.optDouble("fun", 70.0).toFloat()
            val l = n.optDouble("love", 70.0).toFloat(); val en = n.optDouble("energy", 85.0).toFloat()
            e.putFloat("hunger", h).putFloat("fun", f).putFloat("love", l).putFloat("energy", en)
            e.apply()
            if (quiet) EkoService.instance?.setNeedsQuiet(h, f, l, en) else EkoService.instance?.adopted(h, f, l, en)
        } else { e.apply(); if (!quiet) EkoService.instance?.adopted(null, null, null, null) }
    }
}
