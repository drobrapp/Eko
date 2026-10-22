package app.drobr.eko

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.SystemClock
import android.provider.Settings

// Qué app tienes abierta (solo su nombre, gracias al permiso de «teclado y toques»). Nunca lo que hay dentro.
// Eko comenta de vez en cuando según el tipo de app, y avisa si llevas mucho rato en redes o vídeos.
class AppSense(private val c: Context, private val say: (String, String, String) -> Unit, private val canTalk: () -> Boolean) {
    private var curPkg = ""
    private var curCat = ""
    private var since = 0L
    private var scrollSaid = 0L
    private var lastAny = 0L
    private val home by lazy {
        c.packageManager.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)?.activityInfo?.packageName ?: ""
    }

    private val KNOWN = mapOf(
        "com.instagram.android" to "social", "com.instagram.barcelona" to "social", "com.zhiliaoapp.musically" to "social",
        "com.ss.android.ugc.trill" to "social", "com.twitter.android" to "social", "com.facebook.katana" to "social",
        "com.reddit.frontpage" to "social", "com.pinterest" to "social", "com.bereal.ft" to "social",
        "com.whatsapp" to "chat", "org.telegram.messenger" to "chat", "com.google.android.apps.messaging" to "chat",
        "org.thoughtcrime.securesms" to "chat", "com.discord" to "chat",
        "com.google.android.GoogleCamera" to "camera", "com.android.camera" to "camera", "com.sec.android.app.camera" to "camera",
        "com.google.android.apps.photos" to "gallery",
        "com.adobe.lrmobile" to "edit", "com.niksoftware.snapseed" to "edit", "com.vsco.cam" to "edit", "com.canva.editor" to "edit",
        "com.spotify.music" to "music", "com.google.android.apps.youtube.music" to "music", "com.apple.android.music" to "music",
        "com.google.android.youtube" to "video", "com.netflix.mediaclient" to "video", "com.amazon.avod.thirdpartyclient" to "video",
        "com.disney.disneyplus" to "video", "tv.twitch.android.app" to "video",
        "com.google.android.apps.maps" to "maps", "com.waze" to "maps",
        "com.google.android.gm" to "mail", "com.microsoft.office.outlook" to "mail",
        "com.amazon.mShop.android.shopping" to "shop", "com.wallapop" to "shop", "fr.vinted" to "shop",
        "com.android.settings" to "settings", "com.google.android.calendar" to "calendar",
        "com.android.chrome" to "web", "org.mozilla.firefox" to "web",
    )
    private val LONG = setOf("social", "video")     // donde se pierde la noción del tiempo

    private fun ime() = Settings.Secure.getString(c.contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)?.substringBefore('/') ?: ""

    private fun category(pkg: String): String {
        KNOWN[pkg]?.let { return it }
        val info = try { c.packageManager.getApplicationInfo(pkg, 0) } catch (_: Exception) { return "" }
        return when (info.category) {
            ApplicationInfo.CATEGORY_GAME -> "game"
            ApplicationInfo.CATEGORY_AUDIO -> "music"
            ApplicationInfo.CATEGORY_VIDEO -> "video"
            ApplicationInfo.CATEGORY_IMAGE -> "gallery"
            ApplicationInfo.CATEGORY_SOCIAL -> "social"
            ApplicationInfo.CATEGORY_MAPS -> "maps"
            else -> ""
        }
    }
    private fun label(pkg: String): String =
        try { c.packageManager.getApplicationLabel(c.packageManager.getApplicationInfo(pkg, 0)).toString() } catch (_: Exception) { "esa app" }

    // Comenta una vez cada app al abrirla por primera vez en el día (si en ese momento no puede hablar, lo intenta la próxima vez)
    private val prefs by lazy { c.getSharedPreferences("eko", Context.MODE_PRIVATE) }
    private fun today(): Int { val k = java.util.Calendar.getInstance(); return k.get(java.util.Calendar.YEAR) * 1000 + k.get(java.util.Calendar.DAY_OF_YEAR) }
    private fun saidToday(): MutableSet<String> {
        if (prefs.getInt("appsDay", -1) != today()) prefs.edit().putInt("appsDay", today()).putStringSet("appsSaid", emptySet()).apply()
        return HashSet(prefs.getStringSet("appsSaid", emptySet()) ?: emptySet())
    }

    fun onApp(pkg: String) {
        if (pkg.isEmpty() || pkg == curPkg || pkg == c.packageName || pkg == "com.android.systemui" || pkg == ime()) return
        val now = SystemClock.elapsedRealtime()
        curPkg = pkg; since = now; scrollSaid = 0
        if (pkg == home) { curCat = "home"; return }
        val cat = category(pkg).ifEmpty { "other" }; curCat = cat
        val said = saidToday()
        if (pkg in said || !canTalk() || now - lastAny < 15_000L) return
        lastAny = now
        said.add(pkg); prefs.edit().putStringSet("appsSaid", said).apply()
        say("app_$cat", label(pkg), pkg)
    }

    // Cada medio minuto: ¿llevas más de 25 minutos seguidos en redes o vídeos?
    fun tick() {
        if (curCat !in LONG) return
        val now = SystemClock.elapsedRealtime()
        if (now - since < 25 * 60_000L || now - scrollSaid < 25 * 60_000L || !canTalk()) return
        scrollSaid = now; lastAny = now
        say("scroll", label(curPkg), curPkg)
    }

    fun reset() { curPkg = ""; curCat = "" }
}
