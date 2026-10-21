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
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.view.Choreographer
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
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
    private fun prefs() = getSharedPreferences("eko", MODE_PRIVATE)

    // Cada 6 horas mira si hay versión nueva (la primera vez, al minuto de salir)
    private val updateCheck = object : Runnable {
        override fun run() { Updater.check(this@EkoService); handler.postDelayed(this, 6 * 3600 * 1000L) }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") { prefs().edit().putBoolean("out", false).apply(); stopSelf(); return START_NOT_STICKY }
        prefs().edit().putBoolean("out", true).apply()
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
        handler.postDelayed({ say(pick(listOf("¡Hola! Ya estoy aquí", "¡Qué grande es tu pantalla!", "¡Allá voy!"))) }, 900)
        handler.post(tick)
        handler.postDelayed(updateCheck, 60_000)
    }

    // ---------- Bocadillo (ventanita aparte que no captura toques) ----------
    private var bubble: TextView? = null
    private lateinit var bubbleLp: WindowManager.LayoutParams
    private val hideBubble = Runnable { bubble?.visibility = View.GONE }
    private val pick = { l: List<String> -> l[Random.nextInt(l.size)] }
    private fun overlayType() = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    private fun card(color: String) = GradientDrawable().apply { cornerRadius = 18 * dens; setColor(Color.parseColor(color)); setStroke((1 * dens).toInt(), Color.parseColor("#E8D8C8")) }

    private fun say(text: String, ms: Long = 2600) {
        if (menu != null) return
        val b = bubble ?: TextView(this).also { t ->
            t.setTextColor(Color.parseColor("#3B2F2A"))
            t.textSize = 14f
            t.maxWidth = (220 * dens).toInt()
            t.setPadding((13 * dens).toInt(), (8 * dens).toInt(), (13 * dens).toInt(), (8 * dens).toInt())
            t.background = card("#FFFAF6")
            bubbleLp = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, overlayType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            ).apply { gravity = Gravity.TOP or Gravity.START }
            wm.addView(t, bubbleLp)
            bubble = t
        }
        b.text = text
        b.visibility = View.VISIBLE
        placeAbove(b, bubbleLp)
        handler.removeCallbacks(hideBubble)
        handler.postDelayed(hideBubble, ms)
    }

    // Coloca una ventanita (bocadillo o menú) encima de la cabeza de Eko, sin salirse de la pantalla
    private fun placeAbove(v: View, p: WindowManager.LayoutParams) {
        v.measure(View.MeasureSpec.makeMeasureSpec(screenW(), View.MeasureSpec.AT_MOST), View.MeasureSpec.makeMeasureSpec(screenH(), View.MeasureSpec.AT_MOST))
        val w = v.measuredWidth; val h = v.measuredHeight
        p.x = (x + winW / 2f - w / 2f).toInt().coerceIn(0, (screenW() - w).coerceAtLeast(0))
        p.y = (y + winH * 0.12f - h).toInt().coerceAtLeast(0)
        try { wm.updateViewLayout(v, p) } catch (_: Exception) {}
    }

    // ---------- Menú (mantener pulsado) ----------
    private var menu: LinearLayout? = null
    private lateinit var menuLp: WindowManager.LayoutParams

    @SuppressLint("ClickableViewAccessibility")
    private fun openMenu() {
        if (menu != null) return
        handler.removeCallbacks(hideBubble); bubble?.visibility = View.GONE
        st = St.IDLE; until = Long.MAX_VALUE; js("set('idle', $dir)"); js("happy()")
        val m = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            background = card("#FFF4E8")
            setPadding((8 * dens).toInt(), (8 * dens).toInt(), (8 * dens).toInt(), (6 * dens).toInt())
        }
        fun item(icon: Int, label: String, action: () -> Unit) {
            val col = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                setPadding((6 * dens).toInt(), 0, (6 * dens).toInt(), 0)
                setOnClickListener { closeMenu(); action() }
            }
            col.addView(ImageView(this).apply {
                setImageResource(icon)
                scaleType = ImageView.ScaleType.FIT_CENTER
                layoutParams = LinearLayout.LayoutParams((44 * dens).toInt(), (44 * dens).toInt())
            })
            col.addView(TextView(this).apply { text = label; textSize = 11f; setTextColor(Color.parseColor("#5A463D")); gravity = Gravity.CENTER })
            m.addView(col)
        }
        item(R.drawable.eko_cookie, "Galleta") { feed() }
        item(R.drawable.eko_ball, "Jugar") { play() }
        item(R.drawable.eko_bed, "Dormir") { say("Buenas noches…", 1800); handler.postDelayed({ sleep() }, 1200) }
        item(R.drawable.ic_eko, "Su casa") { startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); idle(2000) }
        item(R.drawable.eko_bye, "Guardar") { prefs().edit().putBoolean("out", false).apply(); stopSelf() }
        menuLp = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.TOP or Gravity.START }
        // tocar fuera del menú lo cierra
        m.setOnTouchListener { _, e -> if (e.actionMasked == MotionEvent.ACTION_OUTSIDE) { closeMenu(); idle(1500) }; false }
        wm.addView(m, menuLp)
        menu = m
        placeAbove(m, menuLp)
    }

    private fun closeMenu() {
        val m = menu ?: return
        menu = null
        try { wm.removeView(m) } catch (_: Exception) {}
        if (until == Long.MAX_VALUE) until = 0
    }

    private fun feed() { js("eat()"); idle(3000); handler.postDelayed({ say(pick(listOf("¡Ñam! Gracias", "¡Qué rica!", "Mmm… ¡otra!"))) }, 900) }
    private fun play() { js("spin()"); idle(2500); handler.postDelayed({ say(pick(listOf("¡Voltereta!", "¿Has visto eso?", "¡Otra vez, otra vez!"))) }, 700) }

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

    private var alive = true
    private val tick = object : Choreographer.FrameCallback, Runnable {
        override fun run() { Choreographer.getInstance().postFrameCallback(this) }
        override fun doFrame(frameTimeNanos: Long) {
            if (!alive) return
            val now = SystemClock.uptimeMillis()
            val dt = ((now - last).coerceAtMost(100)) / 1000f
            last = now
            when (st) {
                St.WALK -> {
                    x += dir * 72 * dens * dt
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
                    if (y >= ground()) { y = ground(); vy = 0f; js("land()"); idle(1800); if (Random.nextFloat() < 0.5f) say(pick(listOf("¡Uy, qué vértigo!", "¡Otra vez!", "¡Aterrizaje perfecto!"))) }
                }
                St.DRAG -> {}
            }
            x = x.coerceIn(0f, maxX())
            if (lp.x != x.toInt() || lp.y != y.toInt()) {
                lp.x = x.toInt(); lp.y = y.toInt()
                web?.let { try { wm.updateViewLayout(it, lp) } catch (_: Exception) {} }
                bubble?.let { if (it.visibility == View.VISIBLE) placeAbove(it, bubbleLp) }
            }
            Choreographer.getInstance().postFrameCallback(this)
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
        openMenu()
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
                    st = St.DRAG; js("set('drag', $dir)"); closeMenu()
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
                    if (st == St.SLEEP) { js("wake()"); idle(2500); say(pick(listOf("¡Ya estoy despierto!", "Mmm… ¿qué hora es?"))) }
                    else { js("tap()"); idle(2500); if (Random.nextFloat() < 0.6f) say(pick(listOf("¡Hola!", "¡Jiji, cosquillas!", "¿Jugamos?", "¡Aquí estoy!", "Me gusta tu móvil"))) }
                }
            }
        }
    }

    override fun onDestroy() {
        running = false
        alive = false
        Choreographer.getInstance().removeFrameCallback(tick)
        closeMenu()
        bubble?.let { try { wm.removeView(it) } catch (_: Exception) {} }
        bubble = null
        handler.removeCallbacksAndMessages(null)
        web?.let { try { wm.removeView(it) } catch (_: Exception) {}; it.destroy() }
        web = null
        super.onDestroy()
    }
}
