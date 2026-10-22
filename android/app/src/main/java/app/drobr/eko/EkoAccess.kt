package app.drobr.eko

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.graphics.Rect
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityWindowInfo

// Servicio de accesibilidad (opcional) para que Eko se suba encima del teclado.
// Solo mira DÓNDE está la ventana del teclado. Nunca lee lo que escribes ni lo que hay en pantalla.
class EkoAccess : AccessibilityService() {
    companion object {
        @Volatile var kbTop = -1   // borde de arriba del teclado (px de pantalla); -1 = no hay teclado

        fun enabled(c: Context): Boolean {
            val s = Settings.Secure.getString(c.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
            val full = "${c.packageName}/${EkoAccess::class.java.name}"
            val short = "${c.packageName}/.EkoAccess"
            return s.split(':').any { it.equals(full, true) || it.equals(short, true) }
        }
    }

    private val r = Rect()

    override fun onServiceConnected() { check() }
    override fun onAccessibilityEvent(e: AccessibilityEvent?) { check() }

    private fun check() {
        if (!EkoService.running) { kbTop = -1; return }
        var top = -1
        try {
            for (w in windows) {
                if (w.type != AccessibilityWindowInfo.TYPE_INPUT_METHOD) continue
                w.getBoundsInScreen(r)
                if (r.height() > 0 && (top < 0 || r.top < top)) top = r.top
            }
        } catch (_: Exception) {}
        kbTop = top
    }

    override fun onInterrupt() {}
    override fun onUnbind(intent: Intent?): Boolean { kbTop = -1; return super.onUnbind(intent) }
}
