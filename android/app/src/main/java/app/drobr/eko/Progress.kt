package app.drobr.eko

import android.content.Context
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalTime

// Amistad en el móvil, con las MISMAS reglas que el PC (progress.js):
//  · lo primero del día cuenta entero (hasta 40 puntos) y luego al 25 %
//  · lo primero de cada tipo en cada franja (mañana, tarde, noche) da 2 puntos extra
//  · niveles 1–20: pasar de n a n+1 cuesta 40 + 10·n puntos
// Lo ganado aquí se guarda en un «libro» que viaja al PC cuando Eko vuelve (el PC lo suma y cuenta los logros).
// El nivel que se ve aquí = puntos del PC cuando Eko llegó + lo ganado aquí desde entonces.
object Progress {
    private fun prefs(c: Context) = c.getSharedPreferences("eko", Context.MODE_PRIVATE)
    private val PTS = mapOf("pet" to 2f, "feed" to 4f, "play" to 6f, "hug" to 3f,
        "walkGoal" to 10f, "beyond" to 4f, "photo" to 4f, "diary" to 6f, "find" to 1f)
    private const val DAY_FULL = 40f
    const val MAX = 20
    private fun cost(n: Int) = 40 + 10 * n
    fun xpFor(lvl: Int): Int { var t = 0; for (n in 1 until lvl) t += cost(n); return t }

    // Lo que desbloquea cada nivel (los mismos textos que en el PC)
    val LEVELS = mapOf(
        2 to "el juego ¿Qué mano?", 3 to "el truco de la voltereta", 4 to "unas gafas", 5 to "el juego del escondite",
        6 to "¡su propia casa en el PC!", 7 to "el truco de la pirueta", 8 to "una pajarita", 9 to "el juego atrapa galletas",
        10 to "una bufanda (¡y fiesta!)", 11 to "el equilibrio a la pata coja", 12 to "una maceta para su casa", 13 to "el juego tócame donde brille",
        14 to "una corona", 15 to "el truco de los malabares", 16 to "el cuadro «Eko dormilón»", 17 to "unos auriculares",
        18 to "el juego adivina qué pienso", 19 to "el truco de magia", 20 to "el título «Mejor amigo» y un trofeo")

    private fun ledger(c: Context): JSONObject = try { JSONObject(prefs(c).getString("pLedger", "{}") ?: "{}") } catch (_: Exception) { JSONObject() }
    private fun pcXp(c: Context): Float = try { JSONObject(prefs(c).getString("pcProgress", "") ?: "").optDouble("xp", 0.0).toFloat() } catch (_: Exception) { 0f }
    // Puntos «de base»: los del PC al llegar (o lo acumulado aquí si nunca se ha conectado)
    private fun base(c: Context): Float { val b = prefs(c).getFloat("pBase", -1f); return if (b >= 0f) b else pcXp(c) }
    fun xp(c: Context): Float = base(c) + ledger(c).optDouble("xp", 0.0).toFloat()
    fun level(c: Context): Int { val x = xp(c); var l = 1; while (l < MAX && x >= xpFor(l + 1)) l++; return l }

    // Gana puntos por algo que habéis hecho. Devuelve el nivel nuevo si ha subido (o null).
    fun earn(c: Context, src: String): Int? {
        var pts = PTS[src] ?: return null
        val p = prefs(c)
        val before = level(c)
        val today = LocalDate.now().toString()
        var dayPts = p.getFloat("pDayPts", 0f)
        var slots = p.getString("pSlots", "") ?: ""
        if (p.getString("pDay", "") != today) { dayPts = 0f; slots = "" }
        if (dayPts >= DAY_FULL) pts *= 0.25f
        val h = LocalTime.now().hour
        val slot = (if (h in 6..13) "m" else if (h in 14..20) "t" else "n") + ":" + src
        if (!slots.split(',').contains(slot)) { pts += 2f; slots = if (slots.isEmpty()) slot else "$slots,$slot" }
        dayPts += pts
        val l = ledger(c)
        l.put("xp", l.optDouble("xp", 0.0) + pts)
        val cnt = l.optJSONObject("cnt") ?: JSONObject()
        // eventos que cuentan para logros del PC (galletas, pasos, fotos, diario, hallazgos)
        val ev = when (src) { "feed" -> "feed"; "walkGoal" -> "walkGoal"; "photo" -> "photo"; "diary" -> "diary"; "find" -> "find"; else -> null }
        if (ev != null) cnt.put(ev, cnt.optInt(ev, 0) + 1)
        l.put("cnt", cnt)
        if (h in 5..7) l.put("early", true)
        if (h in 0..3) l.put("night", true)
        p.edit().putString("pLedger", l.toString()).putString("pDay", today).putFloat("pDayPts", dayPts).putString("pSlots", slots).apply()
        val after = level(c)
        return if (after > before) after else null
    }

    // Para mandar al PC (sin borrarlo todavía)
    fun peekLedger(c: Context): JSONObject = ledger(c)
    // El PC ya lo tiene: se pasa a la base y se vacía el libro
    fun commitLedger(c: Context, sent: JSONObject) {
        val x = sent.optDouble("xp", 0.0).toFloat()
        val now = ledger(c)
        // lo que se haya ganado mientras se enviaba se queda para la próxima vez
        val rest = JSONObject().put("xp", (now.optDouble("xp", 0.0) - x).coerceAtLeast(0.0))
        val cnt = JSONObject(); val a = now.optJSONObject("cnt"); val b = sent.optJSONObject("cnt")
        a?.keys()?.forEach { k -> val left = a.optInt(k) - (b?.optInt(k) ?: 0); if (left > 0) cnt.put(k, left) }
        rest.put("cnt", cnt)
        prefs(c).edit().putFloat("pBase", base(c) + x).putString("pLedger", rest.toString()).apply()
    }
    // Eko llega del PC: su base pasan a ser los puntos que trae (lo que haya en el libro sigue pendiente de enviar)
    fun adoptBase(c: Context, pcXp: Float?) {
        if (pcXp == null || pcXp < 0f) return
        prefs(c).edit().putFloat("pBase", pcXp).apply()
    }
}
