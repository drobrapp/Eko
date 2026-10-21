package app.drobr.eko

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowInsets
import android.view.WindowManager
import android.webkit.WebView
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.random.Random

// Eko paseando por encima de las demás apps: una ventanita del tamaño de Eko que se mueve por la pantalla.
// Kotlin decide dónde está y qué hace (andar, quedarse quieto, dormir, caer); la página web solo lo dibuja y lo anima.
class EkoService : Service() {

    companion object { var running = false }

    private enum class St { IDLE, WALK, SLEEP, DRAG, FALL }

    private lateinit var wm: WindowManager
    private lateinit var lp: WindowManager.LayoutParams
    private var web: WebView? = null
    private val handler = Handler(Looper.getMainLooper())

    private var dens = 1f
    private var winW = 0
    private var winH = 0
    private var x = 0f
    private var y = 0f
    private var vy = 0f
    private var dir = 1
    private var targetX = 0f
    private var st = St.IDLE
    private var until = 0L
    private var last = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") { stopSelf(); return START_NOT_STICKY }
        goForeground()
        if (web == null) addOverlay()
        running = true
        return START_STICKY
    }

    private fun goForeground() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("eko", "Eko en tu pantalla", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1, Intent(this, EkoService::class.java).setAction("STOP"), PendingIntent.FLAG_IMMUTABLE)
        val icon = Icon.createWithResource(this, R.drawable.ic_eko)
        val n = Notification.Builder(this, "eko")
            .setContentTitle("Eko está contigo")
            .setContentText("Toca para abrir su casa")
            .setSmallIcon(icon)
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(Notification.Action.Builder(icon, "Guardar a Eko", stop).build())
            .build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        else startForeground(1, n)
    }

    // Tamaño de la pantalla y suelo (justo encima de la barra de navegación)
    private fun screenW(): Int = if (Build.VERSION.SDK_INT >= 30) wm.currentWindowMetrics.bounds.width() else resources.displayMetrics.widthPixels
    private fun screenH(): Int = if (Build.VERSION.SDK_INT >= 30) wm.currentWindowMetrics.bounds.height() else resources.displayMetrics.heightPixels
    private fun navBar(): Int {
        val id = resources.getIdentifier("navigation_bar_height", "dimen", "android")
        return if (id > 0) resources.getDimensionPixelSize(id) else 0
    }
    // Barra de abajo (gestos o botones) según Android, y desfase real de la ventana: en algunos móviles
    // la «y» de la ventana empieza debajo de la barra de estado, así que se mide dónde acaba de verdad.
    private var yOffset = 0
    private fun bottomInset(): Int =
        if (Build.VERSION.SDK_INT >= 30) wm.currentWindowMetrics.windowInsets
            .getInsetsIgnoringVisibility(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout()).bottom
        else navBar()
    private fun ground(): Float = (screenH() - bottomInset() - winH - yOffset - (6 * dens).toInt()).toFloat()
    private fun calibrate() {
        val w = web ?: return
        val loc = IntArray(2)
        w.getLocationOnScreen(loc)
        if (loc[1] != 0 || lp.y == 0) yOffset = loc[1] - lp.y
    }
    private fun maxX(): Float = (screenW() - winW).toFloat()

    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    private fun addOverlay() {
        wm = getSystemService(WindowManager::class.java)
        dens = resources.displayMetrics.density
        winW = (130 * dens).toInt()
        winH = (160 * dens).toInt()
        val w = WebView(this)
        w.setBackgroundColor(Color.TRANSPARENT)
        w.settings.javaScriptEnabled = true
        w.settings.allowFileAccess = true
        w.isVerticalScrollBarEnabled = false
        w.isHorizontalScrollBarEnabled = false
        w.loadUrl("file:///android_asset/eko/overlay.html")
        lp = WindowManager.LayoutParams(
            winW, winH,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )
        lp.gravity = Gravity.TOP or Gravity.START
        x = maxX() * 0.7f
        y = ground()
        lp.x = x.toInt(); lp.y = y.toInt()
        wm.addView(w, lp)
        web = w
        w.setOnTouchListener { _, e -> touch(e); true }
        handler.postDelayed({ calibrate(); y = ground() }, 400)
        handler.postDelayed({ calibrate() }, 3000)
        last = SystemClock.uptimeMillis()
        idle(2000)
        handler.post(tick)
    }

    private fun js(code: String) { web?.evaluateJavascript("window.eko && eko.$code", null) }

    private fun idle(ms: Long) { st = St.IDLE; until = SystemClock.uptimeMillis() + ms; js("set('idle', $dir)") }
    private fun walk() {
        targetX = Random.nextFloat() * maxX()
        if (abs(targetX - x) < 60 * dens) targetX = if (x > maxX() / 2) x - 160 * dens else x + 160 * dens
        targetX = targetX.coerceIn(0f, maxX())
        dir = if (targetX > x) 1 else -1
        st = St.WALK; js("set('walk', $dir)")
    }
    private fun sleep() { st = St.SLEEP; until = SystemClock.uptimeMillis() + Random.nextLong(40_000, 90_000); js("set('sleep', $dir)") }

    private val tick = object : Runnable {
        override fun run() {
            val now = SystemClock.uptimeMillis()
            val dt = ((now - last).coerceAtMost(100)) / 1000f
            last = now
            when (st) {
                St.WALK -> {
                    x += dir * 42 * dens * dt
                    if ((dir > 0 && x >= targetX) || (dir < 0 && x <= targetX) || x <= 0f || x >= maxX()) {
                        x = x.coerceIn(0f, maxX()); idle(Random.nextLong(1500, 6000))
                    }
                    y = ground()
                }
                St.IDLE -> {
                    y = ground()
                    if (now > until) { val r = Random.nextFloat(); if (r < 0.75f) walk() else if (r < 0.88f) idle(Random.nextLong(2000, 5000)) else sleep() }
                }
                St.SLEEP -> { y = ground(); if (now > until) { js("wake()"); idle(1500) } }
                St.FALL -> {
                    vy += 2400 * dens * dt
                    y += vy * dt
                    if (y >= ground()) { y = ground(); vy = 0f; js("land()"); idle(1800) }
                }
                St.DRAG -> {}
            }
            x = x.coerceIn(0f, maxX())
            if (lp.x != x.toInt() || lp.y != y.toInt()) {
                lp.x = x.toInt(); lp.y = y.toInt()
                web?.let { try { wm.updateViewLayout(it, lp) } catch (_: Exception) {} }
            }
            handler.postDelayed(this, 33)
        }
    }

    // Tocar: reacciona · Arrastrar: lo coges y al soltarlo cae · Mantener pulsado: abre su casa (la app)
    private var downX = 0f
    private var downY = 0f
    private var startX = 0f
    private var startY = 0f
    private var dragging = false
    private var longDone = false
    private val longPress = Runnable {
        longDone = true
        js("happy()")
        startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    private fun touch(e: MotionEvent) {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = e.rawX; downY = e.rawY; startX = x; startY = y
                dragging = false; longDone = false
                handler.postDelayed(longPress, 650)
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = e.rawX - downX
                val dy = e.rawY - downY
                if (!dragging && hypot(dx, dy) > 12 * dens) {
                    dragging = true; handler.removeCallbacks(longPress)
                    st = St.DRAG; js("set('drag', $dir)")
                }
                if (dragging) {
                    if (abs(dx) > 2) dir = if (startX + dx > x) 1 else -1
                    x = (startX + dx).coerceIn(0f, maxX())
                    y = (startY + dy).coerceIn(0f, ground())
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                handler.removeCallbacks(longPress)
                if (dragging) { st = St.FALL; vy = 0f; js("set('fall', $dir)") }
                else if (!longDone) {
                    if (st == St.SLEEP) { js("wake()"); idle(2500) } else { js("tap()"); idle(2500) }
                }
            }
        }
    }

    override fun onDestroy() {
        running = false
        handler.removeCallbacksAndMessages(null)
        web?.let { try { wm.removeView(it) } catch (_: Exception) {}; it.destroy() }
        web = null
        super.onDestroy()
    }
}
