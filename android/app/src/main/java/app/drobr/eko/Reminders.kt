package app.drobr.eko

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Icon
import android.os.Build
import org.json.JSONArray

// Recordatorios del PC que te da el móvil mientras Eko está aquí.
// Llegan con Eko (en su estado). Se programan con alarmas de Android (con un margen de 1 min, sin permisos especiales)
// y, al devolver a Eko al PC, se le dice cuáles ya te ha dado para que no se repitan.
object Reminders {
    private const val CH = "eko-remind"
    private fun prefs(c: Context) = c.getSharedPreferences("eko", Context.MODE_PRIVATE)

    private fun alarm(c: Context, at: Long, text: String) = PendingIntent.getBroadcast(c, (at % 100000).toInt() + 1000,
        Intent(c, NoteReceiver::class.java).setAction("REMIND").putExtra("at", at).putExtra("text", text),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    // [{at, text}, …] tal como los guarda el PC
    fun schedule(c: Context, list: JSONArray) {
        cancelAll(c)
        val am = c.getSystemService(AlarmManager::class.java)
        val now = System.currentTimeMillis()
        val keep = JSONArray()
        for (i in 0 until list.length()) {
            val o = list.optJSONObject(i) ?: continue
            val at = o.optLong("at", 0); val text = o.optString("text", "")
            if (at <= 0 || text.isBlank()) continue
            val whenMs = if (at < now) now + 5_000 else at          // si ya tocaba, en unos segundos
            am.setWindow(AlarmManager.RTC_WAKEUP, whenMs, 60_000L, alarm(c, at, text))
            keep.put(o)
        }
        prefs(c).edit().putString("remPending", keep.toString()).apply()
    }

    fun cancelAll(c: Context) {
        val am = c.getSystemService(AlarmManager::class.java)
        val list = try { JSONArray(prefs(c).getString("remPending", "[]")) } catch (_: Exception) { JSONArray() }
        for (i in 0 until list.length()) {
            val o = list.optJSONObject(i) ?: continue
            am.cancel(alarm(c, o.optLong("at"), o.optString("text")))
        }
        prefs(c).edit().putString("remPending", "[]").apply()
    }

    // Los que ya te ha dado (para el PC) y se olvidan aquí
    fun takeDone(c: Context): JSONArray {
        val d = try { JSONArray(prefs(c).getString("remDone", "[]")) } catch (_: Exception) { JSONArray() }
        prefs(c).edit().putString("remDone", "[]").apply()
        return d
    }

    fun fire(c: Context, at: Long, text: String) {
        // Si Eko ya ha vuelto al PC, el recordatorio lo da el PC
        if (PcLink.paired(c) && PcLink.where(c) == "pc") return
        val p = prefs(c)
        val done = try { JSONArray(p.getString("remDone", "[]")) } catch (_: Exception) { JSONArray() }
        done.put(at)
        val pending = try { JSONArray(p.getString("remPending", "[]")) } catch (_: Exception) { JSONArray() }
        val left = JSONArray(); for (i in 0 until pending.length()) pending.optJSONObject(i)?.let { if (it.optLong("at") != at) left.put(it) }
        p.edit().putString("remDone", done.toString()).putString("remPending", left.toString()).apply()

        EkoService.instance?.remind(text)
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val nm = c.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH, "Recordatorios", NotificationManager.IMPORTANCE_HIGH))
        val open = PendingIntent.getActivity(c, 11, Intent(c, HouseActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE)
        nm.notify((at % 100000).toInt() + 100, Notification.Builder(c, CH)
            .setSmallIcon(Icon.createWithResource(c, R.drawable.ic_eko))
            .setContentTitle("⏰ ${PcLink.petName(c)} te recuerda")
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setContentIntent(open).setAutoCancel(true).build())
    }
}
