package app.drobr.eko

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.SystemClock
import java.time.LocalDate
import kotlin.random.Random

// Paseos: pasos del día con el podómetro del móvil (sin GPS, no sabe por dónde vas).
// El podómetro cuenta solo por hardware; Eko lo lee con la pantalla encendida, así que no gasta batería.
// Meta que se adapta a tu media, racha de días, cosas que encuentra por el camino y semana de paseos.
class Walks(private val c: Context, private val onEvent: (String, Int, String) -> Unit) : SensorEventListener {

    data class Item(val id: String, val emoji: String, val name: String, val season: String = "", val rare: Boolean = false)

    companion object {
        val ITEMS = listOf(
            Item("stone", "🪨", "una piedrita lisa"), Item("leaf", "🍃", "una hoja verde"), Item("stick", "🪵", "un palito perfecto"),
            Item("feather", "🪶", "una pluma"), Item("cap", "🔘", "una chapa"), Item("clover", "☘️", "un trébol"),
            Item("snail", "🐌", "una concha de caracol"), Item("button", "🧷", "un botón perdido"),
            Item("dryleaf", "🍂", "una hoja seca crujiente", "autumn"), Item("acorn", "🌰", "una bellota", "autumn"), Item("mushroom", "🍄", "una seta (no se come)", "autumn"),
            Item("pinecone", "🌲", "una piña", "winter"), Item("snowflake", "❄️", "un copo de nieve (ya se derrite)", "winter"), Item("chestnut", "🌰", "una castaña", "winter"),
            Item("flower", "🌼", "una florecilla", "spring"), Item("ladybug", "🐞", "una mariquita (la he dejado ir)", "spring"), Item("petal", "🌸", "un pétalo", "spring"),
            Item("shell", "🐚", "una concha", "summer"), Item("sunflower", "🌻", "una pipa de girasol", "summer"), Item("icecream", "🍦", "un palito de helado", "summer"),
            Item("clover4", "🍀", "¡un trébol de cuatro hojas!", rare = true), Item("coin", "🪙", "¡una moneda antigua!", rare = true),
            Item("marble", "🔮", "¡una canica brillante!", rare = true), Item("key", "🗝️", "¡una llave misteriosa!", rare = true),
            Item("crystal", "💎", "¡un cristal precioso!", rare = true),
        )
        private const val MAX_FINDS_DAY = 12

        fun allowed(c: Context) = Build.VERSION.SDK_INT < 29 ||
            c.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED
        fun has(c: Context) = c.getSystemService(SensorManager::class.java).getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
        private fun prefs(c: Context) = c.getSharedPreferences("eko", Context.MODE_PRIVATE)
        private fun today() = LocalDate.now().toEpochDay()
        fun season(): String = when (LocalDate.now().monthValue) { 3, 4, 5 -> "spring"; 6, 7, 8 -> "summer"; 9, 10, 11 -> "autumn"; else -> "winter" }

        // Historial: "día:pasos:meta;..." (últimos 40 días, sin hoy)
        private fun hist(c: Context): MutableList<Triple<Long, Int, Int>> =
            (prefs(c).getString("w.hist", "") ?: "").split(';').mapNotNull {
                val p = it.split(':'); if (p.size == 3) Triple(p[0].toLong(), p[1].toInt(), p[2].toInt()) else null
            }.toMutableList()
        private fun saveHist(c: Context, h: List<Triple<Long, Int, Int>>) =
            prefs(c).edit().putString("w.hist", h.takeLast(40).joinToString(";") { "${it.first}:${it.second}:${it.third}" }).apply()

        // Meta adaptativa: tu media de los últimos 7 días + 10 %, redondeada a 500 (entre 3.000 y 15.000)
        fun goalFor(c: Context): Int {
            val t = today(); val last = hist(c).filter { it.first >= t - 7 && it.first < t }
            if (last.size < 3) return 5000
            val avg = last.map { it.second }.average() * 1.1
            return ((Math.round(avg / 500.0) * 500).toInt()).coerceIn(3000, 15000)
        }

        // Si el día guardado ya no es hoy, se archiva y empieza uno nuevo. Devuelve los avisos del cambio de día.
        fun rollover(c: Context): List<String> {
            val p = prefs(c); val t = today(); val d = p.getLong("w.day", -1)
            if (d == t) return emptyList()
            val ev = mutableListOf<String>()
            val h = hist(c)
            if (d >= 0) {
                h.add(Triple(d, p.getInt("w.steps", 0), p.getInt("w.goal", 5000))); saveHist(c, h)
                val by = h.associateBy { it.first }
                fun runFrom(start: Long): Int { var r = 0; var k = start; while (true) { val e = by[k] ?: break; if (e.second < e.third) break; r++; k-- }; return r }
                val dMet = by[d]?.let { it.second >= it.third } ?: false
                val run = if (dMet) runFrom(d) else runFrom(d - 1)
                // Racha rota: el último día no se cumplió o hubo días sin salir entre medias
                if ((!dMet || d < t - 1) && run >= 2) ev += "streakLost:$run"
            }
            val two = h.filter { it.first == t - 1 || it.first == t - 2 }
            if (two.size == 2 && two.all { it.second < 1500 }) ev += "lazy:0"
            p.edit().putLong("w.day", t).putInt("w.steps", 0).putInt("w.goal", goalFor(c)).putInt("w.mile", 0)
                .putInt("w.findNext", Random.nextInt(500, 1100)).putInt("w.findsToday", 0).apply()
            return ev
        }

        fun todaySteps(c: Context): Int { rollover(c); return prefs(c).getInt("w.steps", 0) }
        fun todayGoal(c: Context): Int { rollover(c); return prefs(c).getInt("w.goal", 5000) }
        fun best(c: Context): Int = prefs(c).getInt("w.best", 0)

        // Racha: días seguidos (hasta ayer) cumpliendo la meta, +1 si hoy ya la has cumplido
        fun streak(c: Context): Int {
            val p = prefs(c); val t = today()
            val byDay = hist(c).associateBy { it.first }
            var n = 0; var day = t - 1
            while (true) { val e = byDay[day] ?: break; if (e.second < e.third) break; n++; day-- }
            if (p.getLong("w.day", -1) == t && p.getInt("w.steps", 0) >= p.getInt("w.goal", 5000)) n++
            return n
        }

        // Últimos 7 días (el último es hoy)
        fun week(c: Context): List<Pair<LocalDate, Int>> {
            rollover(c)
            val t = today(); val byDay = hist(c).associateBy { it.first }
            return (6 downTo 0).map { i ->
                val d = t - i
                LocalDate.ofEpochDay(d) to (if (i == 0) prefs(c).getInt("w.steps", 0) else byDay[d]?.second ?: 0)
            }
        }

        // Colección: "id:veces;..."
        fun finds(c: Context): Map<String, Int> =
            (prefs(c).getString("w.finds", "") ?: "").split(';').mapNotNull {
                val p = it.split(':'); if (p.size == 2) p[0] to p[1].toInt() else null
            }.toMap()
        private fun addFind(c: Context, id: String) {
            val m = finds(c).toMutableMap(); m[id] = (m[id] ?: 0) + 1
            prefs(c).edit().putString("w.finds", m.entries.joinToString(";") { "${it.key}:${it.value}" }).apply()
        }
        private fun draw(): Item {
            val s = season()
            val r = Random.nextFloat()
            val pool = when {
                r < 0.06f -> ITEMS.filter { it.rare }
                r < 0.40f -> ITEMS.filter { it.season == s }
                else -> ITEMS.filter { it.season.isEmpty() && !it.rare }
            }
            return pool[Random.nextInt(pool.size)]
        }
        fun lastStepAt(c: Context) = prefs(c).getLong("w.lastStepAt", 0L)
    }

    private val sm = c.getSystemService(SensorManager::class.java)
    private var on = false
    private var firstRead = true
    private val recent = ArrayDeque<Pair<Long, Int>>()   // (momento, pasos) para saber si estás andando ahora
    private var walkSaid = 0L

    fun start() {
        if (on || !allowed(c)) return
        val s = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return
        firstRead = true
        on = sm.registerListener(this, s, SensorManager.SENSOR_DELAY_NORMAL)
    }
    fun stop() { if (on) sm.unregisterListener(this); on = false; recent.clear() }

    override fun onSensorChanged(e: SensorEvent) {
        val out = mutableListOf<Triple<String, Int, String>>()
        rollover(c).forEach { val (k, v) = it.split(':'); out += Triple(k, v.toInt(), "") }

        val counter = e.values[0].toInt()          // pasos desde que se encendió el móvil
        val p = prefs(c)
        val last = p.getInt("w.last", -1)
        val delta = when { last < 0 -> 0; counter >= last -> counter - last; else -> counter }  // reinicio del móvil
        val goal = p.getInt("w.goal", 5000)
        val before = p.getInt("w.steps", 0)
        val steps = before + delta
        val ed = p.edit().putInt("w.last", counter).putInt("w.steps", steps)
        if (delta > 0 || p.getLong("w.lastStepAt", 0L) == 0L) ed.putLong("w.lastStepAt", System.currentTimeMillis())
        if (steps > p.getInt("w.best", 0)) ed.putInt("w.best", steps)

        // Vuelves de un paseo largo con el móvil en el bolsillo
        if (firstRead && delta >= 1500) out += Triple("longWalk", delta, "")
        firstRead = false

        // Hitos del día: mitad, meta y meta y media
        var mile = p.getInt("w.mile", 0)
        val marks = listOf(1 to goal / 2, 2 to goal, 4 to goal * 3 / 2)
        val names = mapOf(1 to "half", 2 to "goal", 4 to "beyond")
        var hit = 0
        for ((bit, n) in marks) if (mile and bit == 0 && steps >= n) { mile = mile or bit; hit = bit }
        ed.putInt("w.mile", mile)

        // Cosas que encuentra por el camino
        var next = p.getInt("w.findNext", 800); var count = p.getInt("w.findsToday", 0)
        val found = mutableListOf<Item>()
        while (steps >= next && count < MAX_FINDS_DAY) { val it = draw(); addFind(c, it.id); found += it; count++; next += Random.nextInt(600, 1200) }
        ed.putInt("w.findNext", next).putInt("w.findsToday", count)
        ed.apply()

        if (hit != 0) out += Triple(names[hit]!!, marks.first { it.first == hit }.second, "")
        when (found.size) {
            0 -> {}
            1 -> out += Triple("find", 1, found[0].emoji + " " + found[0].name)
            else -> out += Triple("findMany", found.size, found.joinToString(" ") { it.emoji })
        }

        // ¿Estás andando ahora? (30+ pasos en el último medio minuto) → una vez cada 2 horas
        val now = SystemClock.elapsedRealtime()
        recent.addLast(now to steps)
        while (recent.isNotEmpty() && now - recent.first().first > 30_000) recent.removeFirst()
        if (recent.size > 1 && steps - recent.first().second >= 30 && now - walkSaid > 2 * 3600_000L) {
            walkSaid = now; out += Triple("walking", steps, "")
        }
        out.forEach { onEvent(it.first, it.second, it.third) }
    }
    override fun onAccuracyChanged(s: Sensor?, a: Int) {}
}
