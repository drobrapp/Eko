package app.drobr.eko

import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.speech.RecognizerIntent
import android.text.InputType
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.util.Date
import java.util.Locale
import kotlin.random.Random

// Diario: le cuentas tu día a Eko (hablando o escribiendo) y él te contesta. Todo se queda en el móvil.
object Diary {
    data class Entry(val time: Long, val text: String)
    private fun file(c: Context) = File(c.filesDir, "diary.json")

    fun list(c: Context): List<Entry> = try {
        val a = JSONArray(file(c).readText())
        (0 until a.length()).map { val o = a.getJSONObject(it); Entry(o.getLong("t"), o.getString("x")) }
    } catch (_: Exception) { emptyList() }
    private fun save(c: Context, l: List<Entry>) {
        val a = JSONArray(); l.forEach { a.put(JSONObject().put("t", it.time).put("x", it.text)) }
        file(c).writeText(a.toString())
    }
    fun add(c: Context, text: String) = save(c, list(c) + Entry(System.currentTimeMillis(), text))
    fun delete(c: Context, time: Long) = save(c, list(c).filter { it.time != time })
    fun writtenToday(c: Context): Boolean {
        val t = LocalDate.now()
        return list(c).any { java.time.Instant.ofEpochMilli(it.time).atZone(java.time.ZoneId.systemDefault()).toLocalDate() == t }
    }

    // Lo que contesta Eko según lo que le cuentas (palabras clave, sin IA y sin salir del móvil)
    private val REPLIES = listOf(
        listOf("triste", "fatal", "llor", "mal día", "muy mal", "sola", "solo ") to listOf("Vaya… gracias por contármelo. Aquí estoy contigo", "Hay días así. Mañana te espero con un abrazo de plastilina", "Te mando un abrazo enorme. Bueno, de mi tamaño"),
        listOf("estrés", "estres", "agobi", "nervios", "ansie", "prisa", "lío") to listOf("Respira hondo conmigo: uno, dos, tres… Mañana irá mejor", "Qué día más intenso. Ahora toca descansar", "Lo has sacado adelante. Eso es lo importante"),
        listOf("cansad", "agotad", "sueño", "reventad") to listOf("Hoy toca dormir como un tronco. Te lo has ganado", "A la cama pronto, ¿vale? Yo también me acuesto", "Pies arriba y a descansar"),
        listOf("foto", "sesión", "sesion", "cámara", "camara", "editar", "edité") to listOf("¿Y esas fotos? ¡Quiero verlas en mi álbum!", "Qué día más fotográfico. Me encanta", "Seguro que te han quedado preciosas"),
        listOf("comida", "cena", "comí", "comimos", "galleta", "restaurante") to listOf("¿Y no me guardaste nada?", "Qué hambre me ha dado leerte", "Lo importante: ¿había postre?"),
        listOf("paseo", "caminar", "andar", "andando", "salí", "salimos") to listOf("¡Paseíto! Mis piernas lo agradecen", "Qué bien que saliéramos", "Cuantos más paseos, mejor"),
        listOf("feliz", "genial", "contento", "contenta", "increíble", "guay", "bonito", "me encanta", "divertid", "risas") to listOf("¡Qué bien! Me alegro muchísimo", "Esto lo guardo en la página de los días buenos", "Me has contagiado la sonrisa"),
    )
    fun reply(text: String): String {
        val t = text.lowercase(Locale("es", "ES"))
        val hit = REPLIES.firstOrNull { (keys, _) -> keys.any { t.contains(it) } }?.second
            ?: listOf("Gracias por contármelo. Lo guardo en mi diario", "Apuntado. Me gusta saber de tu día", "Qué bien que me lo cuentes")
        return hit[Random.nextInt(hit.size)]
    }
}

class DiaryActivity : Activity() {
    private lateinit var input: EditText
    private lateinit var past: LinearLayout
    private val d by lazy { resources.displayMetrics.density }

    private fun btn(label: String, color: String, on: () -> Unit) = Button(this).apply {
        text = label; isAllCaps = false; textSize = 16f; setTextColor(Color.WHITE)
        background = GradientDrawable().apply { cornerRadius = 22 * d; setColor(Color.parseColor(color)) }
        layoutParams = LinearLayout.LayoutParams(0, (52 * d).toInt(), 1f).apply { marginStart = (4 * d).toInt(); marginEnd = (4 * d).toInt() }
        setOnClickListener { on() }
    }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding((20 * d).toInt(), (24 * d).toInt(), (20 * d).toInt(), (24 * d).toInt()) }
        root.addView(TextView(this).apply { text = "Diario con Eko"; textSize = 30f; setTextColor(Color.parseColor("#5A463D")); gravity = Gravity.CENTER })
        root.addView(TextView(this).apply {
            text = SimpleDateFormat("EEEE d 'de' MMMM", Locale("es", "ES")).format(Date()).replaceFirstChar { it.uppercase() } + "\n¿Qué tal ha ido el día?"
            textSize = 15f; setTextColor(Color.parseColor("#7A6458")); gravity = Gravity.CENTER; setPadding(0, (6 * d).toInt(), 0, (12 * d).toInt())
        })
        input = EditText(this).apply {
            hint = "Cuéntaselo hablando (🎤) o escribiendo…"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
            minLines = 4; gravity = Gravity.TOP; textSize = 16f
            background = GradientDrawable().apply { cornerRadius = 16 * d; setColor(Color.WHITE) }
            setPadding((14 * d).toInt(), (12 * d).toInt(), (14 * d).toInt(), (12 * d).toInt())
        }
        root.addView(input)
        root.addView(LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL; setPadding(0, (12 * d).toInt(), 0, (16 * d).toInt())
            addView(btn("🎤 Hablar", "#6F94C2") { listen() })
            addView(btn("Guardar", "#5FA88E") { saveEntry() })
        })
        past = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(past)
        setContentView(ScrollView(this).apply { isFillViewport = true; setBackgroundColor(Color.parseColor("#FFF4E8")); addView(root) })
        refresh()
    }

    // Dictado del sistema (Google): no hace falta permiso de micrófono en Eko. Se puede pulsar varias veces y se va añadiendo.
    @Suppress("DEPRECATION")
    private fun listen() {
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-ES")
            .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            .putExtra(RecognizerIntent.EXTRA_PROMPT, "Cuéntaselo a Eko")
        try { startActivityForResult(i, 7) } catch (_: ActivityNotFoundException) { Toast.makeText(this, "Este móvil no tiene dictado por voz", Toast.LENGTH_SHORT).show() }
    }
    @Deprecated("Deprecated in Java")
    override fun onActivityResult(req: Int, res: Int, data: Intent?) {
        super.onActivityResult(req, res, data)
        if (req != 7 || res != RESULT_OK) return
        val said = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull() ?: return
        val cur = input.text.toString().trim()
        val add = said.replaceFirstChar { it.uppercase() }
        input.setText(if (cur.isEmpty()) "$add." else "$cur $add.")
        input.setSelection(input.text.length)
    }

    private fun saveEntry() {
        val t = input.text.toString().trim()
        if (t.isEmpty()) { Toast.makeText(this, "Cuéntale algo primero", Toast.LENGTH_SHORT).show(); return }
        Diary.add(this, t)
        input.setText("")
        val r = Diary.reply(t)
        EkoService.instance?.diaryDone(r)
        AlertDialog.Builder(this).setTitle("Eko dice…").setMessage(r).setPositiveButton("Gracias, Eko", null).show()
        refresh()
    }

    private fun refresh() {
        past.removeAllViews()
        val all = Diary.list(this).reversed()
        if (all.isEmpty()) return
        past.addView(TextView(this).apply { text = "Días anteriores"; textSize = 18f; setTextColor(Color.parseColor("#5A463D")); setPadding(0, 0, 0, (8 * d).toInt()) })
        val f = SimpleDateFormat("EEEE d 'de' MMMM · H:mm", Locale("es", "ES"))
        all.forEach { e ->
            past.addView(TextView(this).apply {
                text = f.format(Date(e.time)).replaceFirstChar { it.uppercase() } + "\n" + e.text
                textSize = 15f; setTextColor(Color.parseColor("#5A463D"))
                background = GradientDrawable().apply { cornerRadius = 14 * d; setColor(Color.parseColor("#F3DCC6")) }
                setPadding((14 * d).toInt(), (10 * d).toInt(), (14 * d).toInt(), (10 * d).toInt())
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = (8 * d).toInt() }
                setOnLongClickListener {
                    AlertDialog.Builder(this@DiaryActivity).setMessage("¿Borrar esta página del diario?")
                        .setPositiveButton("Borrar") { _, _ -> Diary.delete(this@DiaryActivity, e.time); refresh() }
                        .setNegativeButton("No", null).show(); true
                }
            })
        }
    }
}
