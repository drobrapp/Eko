package app.drobr.eko

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.provider.Settings
import android.graphics.drawable.Icon
import org.json.JSONArray
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

// Actualizaciones solas: mira en GitHub Releases si hay un «android-N» más nuevo que el instalado,
// lo descarga y se lo pasa al instalador de Android. Desde la segunda vez (Android 12+) suele instalarse sin preguntar.
@Suppress("DEPRECATION")
object Updater {
    private const val API = "https://api.github.com/repos/drobrapp/eko/releases?per_page=15"
    private data class Rel(val code: Int, val url: String)
    @Volatile private var busy = false

    fun currentCode(ctx: Context): Long {
        val p = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
        return if (Build.VERSION.SDK_INT >= 28) p.longVersionCode else p.versionCode.toLong()
    }

    fun versionName(ctx: Context): String = ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName ?: ""

    private fun latest(): Rel? {
        val c = URL(API).openConnection() as HttpURLConnection
        c.setRequestProperty("Accept", "application/vnd.github+json")
        c.connectTimeout = 10000; c.readTimeout = 15000
        val txt = c.inputStream.bufferedReader().use { it.readText() }
        val arr = JSONArray(txt)
        var best: Rel? = null
        for (i in 0 until arr.length()) {
            val r = arr.getJSONObject(i)
            val tag = r.optString("tag_name")
            if (!tag.startsWith("android-")) continue
            val n = tag.removePrefix("android-").toIntOrNull() ?: continue
            val assets = r.optJSONArray("assets") ?: continue
            for (j in 0 until assets.length()) {
                val u = assets.getJSONObject(j).optString("browser_download_url")
                if (u.endsWith(".apk") && (best == null || n > best.code)) best = Rel(n, u)
            }
        }
        return best
    }

    /** Busca y, si hay versión nueva, la instala. onStatus recibe un texto para enseñar («» si no hay nada). */
    fun check(ctx: Context, onStatus: (String) -> Unit = {}) {
        if (busy) return
        busy = true
        val app = ctx.applicationContext
        Thread {
            try {
                val r = latest()
                if (r == null || r.code <= currentCode(app)) { onStatus(""); return@Thread }
                if (!app.packageManager.canRequestPackageInstalls()) { onStatus("NEEDS_PERMISSION"); return@Thread }
                onStatus("Descargando la versión nueva de Eko…")
                val f = File(app.cacheDir, "eko-update.apk")
                val c = URL(r.url).openConnection() as HttpURLConnection
                c.connectTimeout = 15000; c.readTimeout = 60000; c.instanceFollowRedirects = true
                c.inputStream.use { inp -> f.outputStream().use { inp.copyTo(it) } }
                install(app, f)
                onStatus("Instalando la versión nueva…")
            } catch (_: Exception) {
                onStatus("")
            } finally {
                busy = false
            }
        }.start()
    }

    private fun install(ctx: Context, f: File) {
        val pi = ctx.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        val id = pi.createSession(params)
        pi.openSession(id).use { s ->
            s.openWrite("eko.apk", 0, f.length()).use { out ->
                f.inputStream().use { it.copyTo(out) }
                s.fsync(out)
            }
            val i = Intent(ctx, InstallReceiver::class.java).setAction("app.drobr.eko.INSTALL")
            val flags = if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT else PendingIntent.FLAG_UPDATE_CURRENT
            s.commit(PendingIntent.getBroadcast(ctx, 7, i, flags).intentSender)
        }
    }
}

/** Respuesta del instalador: si Android quiere que confirmes, se abre la pantalla (y se deja también como notificación). */
@Suppress("DEPRECATION")
class InstallReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999) != PackageInstaller.STATUS_PENDING_USER_ACTION) return
        val confirm: Intent = (if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
            else intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)) ?: return
        confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { ctx.startActivity(confirm) } catch (_: Exception) {}
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("eko-upd", "Actualizaciones de Eko", NotificationManager.IMPORTANCE_DEFAULT))
        val pend = PendingIntent.getActivity(ctx, 8, confirm, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = Notification.Builder(ctx, "eko-upd")
            .setSmallIcon(Icon.createWithResource(ctx, R.drawable.ic_eko))
            .setContentTitle("Eko tiene una versión nueva")
            .setContentText("Toca para instalarla")
            .setContentIntent(pend)
            .setAutoCancel(true)
            .build()
        nm.notify(2, n)
    }
}

/** Después de actualizarse, si Eko estaba fuera, vuelve a salir solo. */
class UpdatedReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        EkoNotes.schedule(ctx, force = true)
        val out = ctx.getSharedPreferences("eko", Context.MODE_PRIVATE).getBoolean("out", false)
        if (out && Settings.canDrawOverlays(ctx)) {
            try { ctx.startForegroundService(Intent(ctx, EkoService::class.java)) } catch (_: Exception) {}
        }
    }
}
