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
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import kotlin.math.PI
import kotlin.math.acos
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.tan
import kotlin.random.Random

// Hora dorada: aviso antes del atardecer para salir a hacer fotos.
// Sin GPS: eliges tu ciudad una vez y la hora del atardecer se calcula en el móvil, sin internet.
object GoldenHour {
    val CITIES = linkedMapOf(
        "Granada" to (37.177 to -3.599), "Almería" to (36.834 to -2.464), "Málaga" to (36.721 to -4.421), "Jaén" to (37.779 to -3.785),
        "Córdoba" to (37.888 to -4.779), "Sevilla" to (37.389 to -5.984), "Cádiz" to (36.527 to -6.288), "Huelva" to (37.261 to -6.945),
        "Murcia" to (37.992 to -1.131), "Alicante" to (38.345 to -0.481), "Valencia" to (39.470 to -0.376), "Madrid" to (40.417 to -3.704),
        "Barcelona" to (41.385 to 2.173), "Zaragoza" to (41.649 to -0.889), "Bilbao" to (43.263 to -2.935), "Valladolid" to (41.652 to -4.724),
        "A Coruña" to (43.362 to -8.411), "Palma" to (39.570 to 2.650), "Las Palmas" to (28.124 to -15.436), "Santa Cruz de Tenerife" to (28.464 to -16.252),
    )
    private const val CH = "eko-golden"
    private const val BEFORE_MIN = 75L       // aviso 75 min antes del atardecer (la hora dorada empieza ~1 h antes)
    private fun prefs(c: Context) = c.getSharedPreferences("eko", Context.MODE_PRIVATE)

    fun city(c: Context): String? = prefs(c).getString("golden", null)
    fun setCity(c: Context, name: String?) {
        prefs(c).edit().apply { if (name == null) remove("golden") else putString("golden", name) }.apply()
        schedule(c)
    }

    // Atardecer (algoritmo de la NOAA, precisión de ~1 minuto)
    fun sunset(c: Context, date: LocalDate = LocalDate.now()): ZonedDateTime? {
        val (lat, lon) = CITIES[city(c) ?: return null] ?: return null
        val g = 2 * PI / 365 * (date.dayOfYear - 1)
        val eq = 229.18 * (0.000075 + 0.001868 * cos(g) - 0.032077 * sin(g) - 0.014615 * cos(2 * g) - 0.040849 * sin(2 * g))
        val decl = 0.006918 - 0.399912 * cos(g) + 0.070257 * sin(g) - 0.006758 * cos(2 * g) + 0.000907 * sin(2 * g) - 0.002697 * cos(3 * g) + 0.00148 * sin(3 * g)
        val la = Math.toRadians(lat)
        val x = cos(Math.toRadians(90.833)) / (cos(la) * cos(decl)) - tan(la) * tan(decl)
        if (x < -1 || x > 1) return null
        val ha = Math.toDegrees(acos(x))
        val min = 720 - 4 * (lon - ha) - eq
        return date.atStartOfDay(ZoneOffset.UTC).plusSeconds((min * 60).toLong()).withZoneSameInstant(ZoneId.systemDefault())
    }

    private fun alarm(c: Context) = PendingIntent.getBroadcast(c, 9, Intent(c, NoteReceiver::class.java).setAction("GOLDEN"),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    fun schedule(c: Context) {
        val am = c.getSystemService(AlarmManager::class.java)
        am.cancel(alarm(c))
        if (city(c) == null) return
        val now = System.currentTimeMillis()
        var at = sunset(c)?.minusMinutes(BEFORE_MIN)?.toInstant()?.toEpochMilli() ?: return
        if (at <= now + 60_000) at = sunset(c, LocalDate.now().plusDays(1))?.minusMinutes(BEFORE_MIN)?.toInstant()?.toEpochMilli() ?: return
        // ventana de 10 min: no necesita el permiso de alarmas exactas
        am.setWindow(AlarmManager.RTC_WAKEUP, at, 10 * 60_000L, alarm(c))
    }

    fun fire(c: Context) {
        val s = sunset(c); schedule(c)
        val name = city(c) ?: return
        s ?: return
        val f = DateTimeFormatter.ofPattern("H:mm")
        val gold = s.minusMinutes(60).format(f); val set = s.format(f)
        val text = listOf(
            "Hora dorada en $name a las $gold (el sol se pone a las $set). ¿Salimos a hacer fotos?",
            "Dentro de un rato la luz se pone bonita: hora dorada a las $gold. ¡Coge la cámara!",
            "A las $gold empieza la hora dorada. Yo me pido salir en una foto",
            "Hoy el sol se pone a las $set. La mejor luz, desde las $gold. ¿Paseo de fotos?",
        )[Random.nextInt(4)]
        EkoService.instance?.goldenSay()
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val nm = c.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH, "Hora dorada", NotificationManager.IMPORTANCE_DEFAULT))
        val open = PendingIntent.getActivity(c, 10, Intent(c, HouseActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE)
        nm.notify(3, Notification.Builder(c, CH)
            .setSmallIcon(Icon.createWithResource(c, R.drawable.ic_eko))
            .setContentTitle("Eko · hora dorada")
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setContentIntent(open).setAutoCancel(true).build())
    }
}
