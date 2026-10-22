package app.drobr.eko

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

// Primera versión de la app: de momento solo sirve para sacar a Eko a la pantalla o guardarlo.
// (Más adelante será su casa: salón, valle, libreta y ajustes.)
class MainActivity : Activity() {

    private lateinit var status: TextView
    private lateinit var upd: TextView
    private lateinit var kb: Button
    private lateinit var notes: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val d = resources.displayMetrics.density
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#FFF4E8"))
            setPadding((28 * d).toInt(), (28 * d).toInt(), (28 * d).toInt(), (28 * d).toInt())
        }
        val title = TextView(this).apply {
            text = "Eko"
            textSize = 40f
            setTextColor(Color.parseColor("#5A463D"))
            gravity = Gravity.CENTER
        }
        status = TextView(this).apply {
            textSize = 16f
            setTextColor(Color.parseColor("#7A6458"))
            gravity = Gravity.CENTER
            setPadding(0, (12 * d).toInt(), 0, (24 * d).toInt())
        }
        fun button(label: String, color: String, onClick: () -> Unit) = Button(this).apply {
            text = label
            isAllCaps = false
            textSize = 17f
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply { cornerRadius = 22 * d; setColor(Color.parseColor(color)) }
            setOnClickListener { onClick() }
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (56 * d).toInt()).apply { topMargin = (12 * d).toInt() }
        }
        root.addView(title)
        root.addView(status)
        root.addView(button("Sacar a Eko a la pantalla", "#5FA88E") { bringOut() })
        root.addView(button("Guardar a Eko", "#D0795A") { putAway() })
        kb = button("", "#9B85CC") { askAccess() }
        root.addView(kb)
        notes = button("", "#6F94C2") { EkoNotes.setEnabled(this, !EkoNotes.enabled(this)); showNotes() }
        root.addView(notes)
        // Mantener pulsado: manda una de prueba ahora (sin esperar ni mirar las reglas)
        notes.setOnLongClickListener { EkoNotes.fire(this, test = true); Toast.makeText(this, "Eko te ha escrito", Toast.LENGTH_SHORT).show(); true }
        upd = TextView(this).apply {
            textSize = 14f
            setTextColor(Color.parseColor("#9A8478"))
            gravity = Gravity.CENTER
            setPadding(0, (22 * d).toInt(), 0, 0)
        }
        root.addView(upd)
        setContentView(root)
    }

    override fun onResume() {
        super.onResume()
        status.text = when {
            !Settings.canDrawOverlays(this) -> "Para que Eko pueda pasear por tu móvil, activa «Mostrar sobre otras apps»."
            EkoService.running -> "Eko está paseando por tu pantalla. Tócalo, arrástralo… y mantén pulsado para volver aquí."
            else -> "Eko está aquí dentro, esperando a salir."
        }
        upd.text = "Versión ${Updater.versionName(this)} · buscando novedades…"
        kb.text = if (EkoAccess.enabled(this)) "Teclado y toques ✓" else "Teclado y toques"
        showNotes()
        EkoNotes.seen(this); EkoNotes.schedule(this)
        Updater.check(this) { msg ->
            runOnUiThread {
                when (msg) {
                    "" -> upd.text = "Versión ${Updater.versionName(this)} · está al día"
                    "NEEDS_PERMISSION" -> {
                        upd.text = "Hay una versión nueva. Toca aquí y activa «Permitir de esta fuente» para que Eko pueda actualizarse solo."
                        upd.setOnClickListener { startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName"))) }
                    }
                    else -> upd.text = msg
                }
            }
        }
    }

    private fun bringOut() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
        if (!Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Activa «Mostrar sobre otras apps» para Eko y vuelve", Toast.LENGTH_LONG).show()
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            return
        }
        startForegroundService(Intent(this, EkoService::class.java))
        moveTaskToBack(true)
    }

    private fun showNotes() { notes.text = if (EkoNotes.enabled(this)) "Eko te escribe ✓" else "Eko te escribe: no" }

    // Permiso de accesibilidad (opcional): solo para saber dónde está el teclado
    private fun askAccess() {
        if (EkoAccess.enabled(this)) { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)); return }
        AlertDialog.Builder(this)
            .setTitle("Teclado y toques")
            .setMessage("Con el permiso de Accesibilidad, Eko se sube encima del teclado cuando lo abres, y los toques alrededor de él llegan a la app de debajo (sin él, Android los bloquea). También sabe qué app tienes abierta (solo su nombre) para comentarla. Nunca lee lo que escribes ni lo que hay en la pantalla.\n\n1. En Accesibilidad, entra en «Eko · teclado y toques» y actívalo.\n\n2. Si Android dice que es un «ajuste restringido»: vuelve aquí, toca «Información de la app», pulsa ⋮ arriba a la derecha → «Permitir ajustes restringidos» y repite el paso 1.")
            .setPositiveButton("Ir a Accesibilidad") { _, _ -> startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
            .setNeutralButton("Información de la app") { _, _ -> startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) }
            .setNegativeButton("Ahora no", null)
            .show()
    }

    private fun putAway() {
        getSharedPreferences("eko", MODE_PRIVATE).edit().putBoolean("out", false).apply()
        stopService(Intent(this, EkoService::class.java))
        status.text = "Eko está aquí dentro, esperando a salir."
    }
}
