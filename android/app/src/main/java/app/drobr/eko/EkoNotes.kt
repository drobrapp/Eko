package app.drobr.eko

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Icon
import android.os.Build
import android.provider.Settings
import java.util.Calendar
import kotlin.random.Random

// Eko te escribe: de vez en cuando manda una notificación con su voz.
// Como mucho 2 al día, solo entre 10:00 y 21:30, nunca si has estado con él hace poco ni en «No molestar».
object EkoNotes {
    private const val CH = "eko-notes"
    private fun prefs(c: Context) = c.getSharedPreferences("eko", Context.MODE_PRIVATE)

    fun enabled(c: Context) = prefs(c).getBoolean("notes", true)
    fun setEnabled(c: Context, on: Boolean) {
        prefs(c).edit().putBoolean("notes", on).apply()
        if (on) schedule(c) else cancel(c)
    }
    // Lo has visto o tocado: cuenta como «estar juntos»
    fun seen(c: Context) { prefs(c).edit().putLong("lastSeen", System.currentTimeMillis()).apply() }

    private fun alarm(c: Context) = PendingIntent.getBroadcast(c, 7, Intent(c, NoteReceiver::class.java).setAction("NOTE"),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    // Próximo intento entre 2,5 y 4,5 horas (alarma inexacta: no gasta batería ni pide permisos)
    fun schedule(c: Context, force: Boolean = false) {
        if (!enabled(c)) return
        val p = prefs(c); val now = System.currentTimeMillis()
        if (!force && p.getLong("noteAt", 0) > now) return
        val at = now + Random.nextLong(150, 270) * 60_000
        c.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, alarm(c))
        p.edit().putLong("noteAt", at).apply()
    }
    private fun cancel(c: Context) {
        c.getSystemService(AlarmManager::class.java).cancel(alarm(c))
        prefs(c).edit().remove("noteAt").apply()
    }

    fun fire(c: Context, test: Boolean = false) {
        if (!test) schedule(c, force = true)
        if (!enabled(c) && !test) return
        val p = prefs(c); val now = System.currentTimeMillis()
        val cal = Calendar.getInstance()
        val hm = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        val day = cal.get(Calendar.YEAR) * 1000 + cal.get(Calendar.DAY_OF_YEAR)
        if (p.getInt("noteDay", -1) != day) p.edit().putInt("noteDay", day).putInt("noteCount", 0).apply()
        val count = p.getInt("noteCount", 0)
        val away = now - p.getLong("lastSeen", 0)
        val nm = c.getSystemService(NotificationManager::class.java)
        if (!test) {
            if (hm < 600 || hm > 1290) return
            if (count >= 2) return
            if (away < 90 * 60_000L) return
            if (nm.currentInterruptionFilter > NotificationManager.INTERRUPTION_FILTER_ALL) return
        }
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return

        val text = pickText(cal, away, p.getFloat("hunger", 80f), p.getString("lastNote", "") ?: "", Walks.todaySteps(c),
            if (Walks.allowed(c)) Walks.week(c).sumOf { it.second } else 0)
        nm.createNotificationChannel(NotificationChannel(CH, "Eko te escribe", NotificationManager.IMPORTANCE_DEFAULT))
        // Al tocarla, Eko sale a la pantalla y te saluda (si aún no tiene permiso para salir, se abre su casa)
        val open = if (Settings.canDrawOverlays(c))
            PendingIntent.getForegroundService(c, 8, Intent(c, EkoService::class.java).setAction("NOTE"), PendingIntent.FLAG_IMMUTABLE)
        else PendingIntent.getActivity(c, 8, Intent(c, HouseActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(c, CH)
            .setSmallIcon(Icon.createWithResource(c, R.drawable.ic_eko))
            .setContentTitle("Eko")
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        nm.notify(2, n)
        p.edit().putInt("noteCount", count + (if (test) 0 else 1)).putString("lastNote", text).apply()
    }

    private fun pickText(cal: Calendar, away: Long, hunger: Float, last: String, steps: Int, week: Int): String {
        val h = cal.get(Calendar.HOUR_OF_DAY); val wd = cal.get(Calendar.DAY_OF_WEEK)
        val m = cal.get(Calendar.MONTH) + 1; val d = cal.get(Calendar.DAY_OF_MONTH)
        val l = mutableListOf<String>()
        when {
            m == 10 && d == 31 -> l += listOf("¡Buuu! Hoy voy disfrazado. Sácame y lo ves", "Feliz Halloween. ¿Truco o galleta?")
            m == 12 && (d == 24 || d == 25) -> l += listOf("¡Feliz Navidad! Llevo gorro y todo", "Hoy toca mimos navideños, ¿no?")
            m == 1 && d == 1 -> l += listOf("¡Feliz año nuevo! Este año, más paseos juntos", "Primer día del año… ¿empezamos con una galleta?")
        }
        if (away > 24 * 3600_000L) l += listOf("Hace mucho que no me sacas… ¿sigues ahí?", "Te echo de menos. Poquito. Bueno, bastante", "Te guardo un hueco en la pantalla, por si vuelves")
        if (hunger < 30f) l += listOf("Me suenan las tripas… ¿me traes una galleta?", "Tengo un hambre de plastilina…", "Si me das de comer, prometo no hacer travesuras. Hoy")
        if (l.isEmpty()) {
            when {
                h < 12 -> l += listOf("¡Buenos días! ¿Qué toca hoy?", "Me he despertado con ganas de verte", "Yo ya he desayunado aire. ¿Y tú?")
                h < 16 -> l += listOf("¿Has comido ya?", "Pausa: estira, respira y bebe agua. Te lo digo yo, que soy de plastilina", "Estaba aquí pensando en mis cosas… y en ti")
                h < 20 -> l += listOf("¿Cómo va el día? Yo he contado nubes", "Si te aburres, ya sabes dónde estoy", "Me he aprendido un truco nuevo. Bueno, casi")
                else -> l += listOf("¿Qué tal ha ido hoy?", "No te acuestes tarde, ¿eh?", "Yo ya tengo sueño… ¿y tú?")
            }
            if (wd == Calendar.SATURDAY || wd == Calendar.SUNDAY) l += "¡Es fin de semana! ¿Hacemos algo?"
            if (wd == Calendar.FRIDAY && h >= 16) l += "¡Por fin viernes!"
            if (wd == Calendar.MONDAY && h < 13) l += "Lunes… vamos con calma, ¿vale?"
            if (h >= 19 && steps >= 3000) {
                val n = String.format(java.util.Locale("es", "ES"), "%,d", steps)
                l += listOf("Hoy hemos dado $n pasos. ¡Buen paseo!", "$n pasos hoy… mis piernecitas están orgullosas")
            }
            // Domingo por la tarde: resumen de la semana de paseos (sale seguro si hay datos)
            if (wd == Calendar.SUNDAY && h >= 18 && week >= 5000 && !last.contains("semana")) {
                val n = String.format(java.util.Locale("es", "ES"), "%,d", week)
                return listOf("Esta semana hemos andado $n pasos juntos. ¿Lo vemos en mi casa?", "Resumen de la semana: $n pasos. ¡Menudo equipo!").random()
            }
        }
        val pool = l.filter { it != last }.ifEmpty { l }
        return pool[Random.nextInt(pool.size)]
    }
}

class NoteReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        when (i.action) {
            Intent.ACTION_BOOT_COMPLETED -> { EkoNotes.schedule(c, force = true); GoldenHour.schedule(c) }
            "GOLDEN" -> GoldenHour.fire(c)
            else -> EkoNotes.fire(c)
        }
    }
}
