package app.drobr.eko

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.BatteryManager
import androidx.core.content.ContextCompat
import java.util.Calendar
import kotlin.math.sqrt
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
import android.webkit.JavascriptInterface
import android.webkit.WebView
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.random.Random

// Eko paseando por encima de las demás apps: una ventanita del tamaño de Eko que se mueve por la pantalla.
// Kotlin decide dónde está y qué hace (andar, quedarse quieto, dormir, caer); la página web solo lo dibuja y lo anima.
class EkoService : Service() {

    companion object { var running = false }

    private enum class St { IDLE, WALK, SLEEP, DRAG, FALL, PEEK }

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
    private var awakeUntil = 0L  // tras tocarlo o despertarse, un rato sin siestas
    private var last = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    // ---------- Ahorro ----------
    // Ventana pequeña normalmente (tapa poco de la app de debajo) y grande solo para trucos, saltos y bailes
    // Tamaño fijo: cambiar el tamaño de la ventana a mitad de un gesto hacía que el WebView se recolocara y diera tirones
    private val SMALL_W = 160
    private val SMALL_H = 200
    private val BIG_W = 160
    private val BIG_H = 200
    private fun resize(big: Boolean) {
        val w = web ?: return
        val nw = ((if (big) BIG_W else SMALL_W) * dens).toInt()
        val nh = ((if (big) BIG_H else SMALL_H) * dens).toInt()
        if (nw == winW && nh == winH) return
        // los pies se quedan donde están: abajo y en el centro
        val dx = (winW - nw) / 2f; val dy = (winH - nh).toFloat()
        x += dx; y += dy; startX += dx; startY += dy; targetX += dx
        winW = nw; winH = nh
        lp.width = nw; lp.height = nh; lp.x = x.toInt(); lp.y = y.toInt()
        try { wm.updateViewLayout(w, lp) } catch (_: Exception) {}
    }
    private fun buzz(strong: Boolean = false) {
        try {
            val v = getSystemService(android.os.Vibrator::class.java)
            v.vibrate(if (Build.VERSION.SDK_INT >= 29) android.os.VibrationEffect.createPredefined(if (strong) android.os.VibrationEffect.EFFECT_HEAVY_CLICK else android.os.VibrationEffect.EFFECT_TICK)
                else android.os.VibrationEffect.createOneShot(if (strong) 25 else 12, if (strong) 160 else 70))
        } catch (_: Exception) {}
    }
    // Pantalla apagada: se congela todo (dibujo y bucle) para no gastar batería
    private var paused = false
    private fun pause(on: Boolean) {
        if (on == paused) return
        paused = on
        if (on) { web?.onPause() }
        else { web?.onResume(); last = SystemClock.uptimeMillis(); Choreographer.getInstance().postFrameCallback(tick) }
    }
    private fun powerSave() = getSystemService(android.os.PowerManager::class.java).isPowerSaveMode
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
    // Suelo: la barra de abajo o, si hay teclado (EkoAccess), el borde de arriba del teclado
    private fun ground(): Float {
        val floor = (screenH() - bottomInset() - winH - yOffset - (6 * dens).toInt()).toFloat()
        val k = EkoAccess.kbTop
        if (k <= 0) return floor
        val onKb = (k - winH - yOffset + (4 * dens).toInt()).toFloat()
        return if (onKb < floor && onKb > screenH() * 0.15f) onKb else floor
    }
    // Si el suelo se mueve (se abre o cierra el teclado): salta a él o se cae
    private fun settle(): Boolean {
        val g = ground(); val d = y - g
        if (abs(d) <= 2 * dens) { y = g; return false }
        st = St.FALL; hopping = true
        if (d < 0) { vy = 0f; talk("kbGone", 0.4) }
        else { vy = -sqrt(2f * 2400 * dens * (d + 30 * dens)); talk("keyboard", 0.35) }
        js("set('fall', $dir)")
        return true
    }
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
        winW = (SMALL_W * dens).toInt()
        winH = (SMALL_H * dens).toInt()
        val w = WebView(this)
        w.setBackgroundColor(Color.TRANSPARENT)
        w.settings.javaScriptEnabled = true
        w.settings.allowFileAccess = true
        w.isVerticalScrollBarEnabled = false
        w.isHorizontalScrollBarEnabled = false
        w.addJavascriptInterface(Bridge(), "Android")
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
        handler.postDelayed({ js("lowPower(${powerSave()})") }, 1500)
        handler.postDelayed({ calibrate() }, 3000)
        last = SystemClock.uptimeMillis()
        idle(2000)
        handler.postDelayed({ talk("hello") }, 900)
        loadNeeds()
        nextChat = SystemClock.uptimeMillis() + 90_000
        nextAntic = SystemClock.uptimeMillis() + Random.nextLong(3 * 60_000, 6 * 60_000)
        handler.post(tick)
        val f = IntentFilter().apply {
            addAction(Intent.ACTION_POWER_CONNECTED); addAction(Intent.ACTION_BATTERY_CHANGED)
            addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_USER_PRESENT)
            addAction(Intent.ACTION_SCREEN_ON); addAction(android.os.PowerManager.ACTION_POWER_SAVE_MODE_CHANGED)
        }
        ContextCompat.registerReceiver(this, sysReceiver, f, ContextCompat.RECEIVER_NOT_EXPORTED)
        startSensors()
        getSystemService(AudioManager::class.java).registerAudioDeviceCallback(audioCb, handler)
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
        // Tamaño fijo = el medido (con WRAP_CONTENT Android lo recalculaba más ancho y se cortaba en el borde)
        p.width = w; p.height = h
        val m = (8 * dens).toInt()
        p.x = (x + winW / 2f - w / 2f).toInt().coerceIn(m, (screenW() - w - m).coerceAtLeast(m))
        p.y = (y + winH - 150 * dens - h).toInt().coerceAtLeast(0)
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
        item(R.drawable.eko_bed, "Dormir") { talk("sleep"); handler.postDelayed({ sleep() }, 1200) }
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

    private fun feed() { give(h = 35f, l = 3f); js("eat()"); idle(3000); handler.postDelayed({ talk("eat") }, 900) }
    private fun play() { give(f = 30f, l = 4f, e = -3f); js("spin()"); idle(2500); handler.postDelayed({ talk("play") }, 700) }

    // ---------- Lo que Eko nota del móvil (sin permisos) ----------
    // Batería, pantalla apagada/desbloqueo, agitar el móvil, ponerlo boca abajo y auriculares.
    private var lowSaid = false
    private var screenOffAt = 0L
    private var lastDizzy = 0L
    private val sysReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            val now = SystemClock.uptimeMillis()
            when (i.action) {
                Intent.ACTION_POWER_CONNECTED -> {
                    if (st == St.SLEEP) js("wake()")
                    js("happy()"); idle(2500)
                    talk("charge")
                }
                Intent.ACTION_BATTERY_CHANGED -> {
                    val lvl = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                    val scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, 100).coerceAtLeast(1)
                    val pct = lvl * 100 / scale
                    val plugged = i.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) != 0
                    if (pct in 0..15 && !plugged && !lowSaid) { lowSaid = true; talk("lowBattery") }
                    if (pct > 30 || plugged) lowSaid = false
                }
                Intent.ACTION_SCREEN_OFF -> {
                    screenOffAt = now; closeMenu(); stopSensors()
                    if (st != St.DRAG && st != St.FALL) { st = St.SLEEP; until = Long.MAX_VALUE; js("set('sleep', $dir)") }
                    handler.postDelayed({ if (!getSystemService(android.os.PowerManager::class.java).isInteractive) pause(true) }, 300)
                }
                Intent.ACTION_SCREEN_ON -> pause(false)
                android.os.PowerManager.ACTION_POWER_SAVE_MODE_CHANGED -> js("lowPower(${powerSave()})")
                Intent.ACTION_USER_PRESENT -> {
                    pause(false)
                    startSensors()
                    if (st == St.SLEEP) { awakeUntil = now + 3 * 60_000; js("wake()"); idle(2000) }
                    if (screenOffAt > 0 && now - screenOffAt > 5 * 60_000) talk("missed")
                }
            }
        }
    }

    private val sensors by lazy { getSystemService(SensorManager::class.java) }
    private val motion = object : SensorEventListener {
        var peaks = 0
        var firstPeak = 0L
        var downSince = 0L
        override fun onSensorChanged(e: SensorEvent) {
            val ax = e.values[0]; val ay = e.values[1]; val az = e.values[2]
            val g = sqrt(ax * ax + ay * ay + az * az) / 9.81f
            val now = SystemClock.uptimeMillis()
            // agitar: 3 sacudidas fuertes en poco más de un segundo
            if (g > 2.3f) {
                if (now - firstPeak > 1200) { firstPeak = now; peaks = 0 }
                peaks++
                if (peaks >= 3 && now - lastDizzy > 4000) { lastDizzy = now; peaks = 0; dizzy() }
            }
            // boca abajo un par de segundos: siesta
            if (az < -8.5f && abs(ax) < 2.5f && abs(ay) < 2.5f) {
                if (downSince == 0L) downSince = now
                else if (now - downSince > 2500 && st != St.SLEEP && st != St.DRAG) { downSince = now + 60_000; faceDown() }
            } else if (downSince in 1..now) downSince = 0L
        }
        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }
    private fun startSensors() {
        sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let { sensors.registerListener(motion, it, SensorManager.SENSOR_DELAY_UI) }
    }
    private fun stopSensors() { sensors.unregisterListener(motion) }
    private fun dizzy() {
        if (st == St.DRAG || st == St.FALL) return
        if (st == St.SLEEP) js("wake()")
        js("dizzy()"); idle(3200)
        talk("shake"); handler.postDelayed({ talk("dizzy") }, 2600)
    }
    private fun faceDown() {
        talk("faceDown")
        handler.postDelayed({ st = St.SLEEP; until = SystemClock.uptimeMillis() + 5 * 60_000; js("set('sleep', $dir)") }, 1500)
    }

    private val HEADS = setOf(AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_BLE_HEADSET)
    private val audioCb = object : AudioDeviceCallback() {
        var ready = false
        override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>) {
            if (!ready) { ready = true; return }          // la primera llamada son los que ya estaban conectados
            if (added.any { it.isSink && it.type in HEADS }) { js("happy()"); talk("music") }
        }
        override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>) {
            if (removed.any { it.isSink && it.type in HEADS }) talk("musicOff")
        }
    }

    // ---------- Necesidades: barriga, juego, mimos y energía (0–100, se guardan en el móvil) ----------
    private var hunger = 75f
    private var fun_ = 70f
    private var love = 70f
    private var energy = 85f
    private var needsAt = 0L
    private var nextHint = 0L
    private fun loadNeeds() {
        val p = prefs()
        hunger = p.getFloat("hunger", 75f); fun_ = p.getFloat("fun", 70f); love = p.getFloat("love", 70f); energy = p.getFloat("energy", 85f)
        // mientras no estaba fuera, baja poquito (como mucho 12 h y con suelo): al volver, como mucho tiene hambre y ganas de verte
        val h = ((System.currentTimeMillis() - p.getLong("needsT", System.currentTimeMillis())) / 3_600_000f).coerceIn(0f, 12f)
        hunger = maxOf(minOf(hunger, 30f), hunger - 6f * h / 2)
        fun_ = maxOf(minOf(fun_, 35f), fun_ - 10f * h / 2)
        love = maxOf(minOf(love, 30f), love - 8f * h / 2)
        energy = (energy + 10f * h).coerceAtMost(100f)
        needsAt = SystemClock.uptimeMillis()
        saveNeeds()
    }
    private fun saveNeeds() {
        prefs().edit().putFloat("hunger", hunger).putFloat("fun", fun_).putFloat("love", love).putFloat("energy", energy)
            .putLong("needsT", System.currentTimeMillis()).apply()
    }
    private fun needsTick(now: Long) {
        if (now - needsAt < 60_000) return
        val h = (now - needsAt) / 3_600_000f
        needsAt = now
        val asleep = st == St.SLEEP
        hunger = (hunger - 6f * h * (if (asleep) 0.4f else 1f)).coerceIn(0f, 100f)
        fun_ = (fun_ - (if (asleep) 0f else 10f) * h).coerceIn(0f, 100f)
        love = (love - (if (asleep) 2f else 8f) * h).coerceIn(0f, 100f)
        energy = (energy + (if (asleep) 30f else -5f) * h).coerceIn(0f, 100f)
        saveNeeds()
        js("brows('${if (minOf(hunger, fun_, love) < 25f) "sad" else if (minOf(hunger, fun_, love) < 40f) "worried" else "none"}')")
        // de vez en cuando te pide lo que más le falta (como mucho cada 20 min)
        if (asleep || menu != null || now < nextHint) return
        val low = listOf("hunger" to hunger, "fun" to fun_, "love" to love, "energy" to energy).minByOrNull { it.second } ?: return
        if (low.second >= 30f) return
        nextHint = now + 20 * 60_000L
        when (low.first) {
            "hunger" -> say(pick(listOf("Tengo hambre… ¿una galleta?", "Me suenan las tripas", "Mantenme pulsado y dame algo de comer")), 3200)
            "fun" -> say(pick(listOf("Me aburro… ¿jugamos?", "¿Hacemos algo divertido?")), 3000)
            "love" -> say(pick(listOf("¿Me haces un mimito?", "Hace mucho que no me tocas…")), 3000)
            "energy" -> { say("Estoy agotado… voy a dormir un poco", 2600); handler.postDelayed({ sleep() }, 1800) }
        }
    }
    private fun give(h: Float = 0f, f: Float = 0f, l: Float = 0f, e: Float = 0f) {
        hunger = (hunger + h).coerceIn(0f, 100f); fun_ = (fun_ + f).coerceIn(0f, 100f)
        love = (love + l).coerceIn(0f, 100f); energy = (energy + e).coerceIn(0f, 100f)
        saveNeeds()
    }

    // ---------- Travesuras: de vez en cuando hace algo por su cuenta ----------
    private var nextAntic = 0L
    private fun antic() {
        when (Random.nextInt(4)) {
            0 -> { // se asoma por un borde de la pantalla
                val left = x < maxX() / 2
                dir = if (left) -1 else 1
                targetX = if (left) -winW * 0.55f else maxX() + winW * 0.55f
                st = St.PEEK; until = 0L; js("set('walk', $dir)"); talk("peek", 0.6)
            }
            1 -> { // salto bien alto
                st = St.FALL; vy = -1500 * dens; js("set('fall', $dir)")
                talk("jump")
            }
            2 -> { js("dance(6)"); idle(6000); talk("dance") }
            else -> { js("spin()"); talk("play") }
        }
    }

    // Lo que dice lo elige talk.js (frases del Eko de escritorio + las del móvil, sin repetir); aquí solo se pinta el bocadillo
    private fun talk(ev: String, chance: Double = 1.0) = js("talk('$ev', $chance)")
    inner class Bridge {
        @JavascriptInterface fun say(text: String, ms: Int) { handler.post { this@EkoService.say(text, ms.toLong()) } }
        // Saltos de los trucos (ta-chán, voltereta): la ventana sube y cae de verdad
        @JavascriptInterface fun hop(v: Double) { handler.post {
            if (st == St.IDLE || st == St.WALK) { st = St.FALL; hopping = true; vy = -(v.toFloat() * dens).coerceAtMost(900 * dens); js("set('fall', $dir)") }
        } }
        // Ventana grande solo mientras hace algo que la necesita
        @JavascriptInterface fun big(on: Boolean) { handler.post { resize(on) } }
        // Que no se ponga a andar en mitad de un gesto
        @JavascriptInterface fun hold(ms: Int) { handler.post { if (st == St.IDLE || st == St.WALK) idle(ms.toLong()) } }
    }
    private var nextChat = 0L
    private var hopping = false
    private var dragVx = 0f
    private var dragVy = 0f
    private var lastMoveAt = 0L
    private var dragStart = 0L
    private var heldSaid = false

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
            if (!alive || paused) return
            val now = SystemClock.uptimeMillis()
            val dt = ((now - last).coerceAtMost(100)) / 1000f
            needsTick(now)
            if ((st == St.IDLE || st == St.WALK) && menu == null && bubble?.visibility != View.VISIBLE && now > nextChat) {
                nextChat = now + Random.nextLong(2 * 60_000, 4 * 60_000); js("chatter()")
            }
            if (st == St.DRAG && !heldSaid && now - dragStart > 3500) { heldSaid = true; talk("held") }
            if (st == St.IDLE && menu == null && now > nextAntic && nextAntic > 0) { nextAntic = now + Random.nextLong(4 * 60_000, 10 * 60_000); antic() }
            last = now
            when (st) {
                St.WALK -> {
                    x += dir * 72 * dens * dt
                    if ((dir > 0 && x >= targetX) || (dir < 0 && x <= targetX) || x <= 0f || x >= maxX()) {
                        x = x.coerceIn(0f, maxX()); idle(Random.nextLong(1500, 6000))
                    }
                    settle()
                }
                St.IDLE -> {
                    if (!settle() && now > until) { val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY); val nap = if (now < awakeUntil) 0f else if (h >= 23 || h < 7) 0.45f else 0.12f; val r = Random.nextFloat(); if (r < nap) sleep() else if (r < nap + 0.15f) idle(Random.nextLong(2000, 5000)) else walk() }
                }
                St.SLEEP -> { if (!settle() && now > until) { awakeUntil = now + 2 * 60_000; js("wake()"); idle(1500) } }
                St.FALL -> {
                    vy += 2400 * dens * dt
                    y += vy * dt
                    js("v(0, ${(vy / dens).toInt()})")
                    if (vy >= 0 && y >= ground()) { if (vy > 1200 * dens) buzz(true); y = ground(); vy = 0f; js("land()"); idle(1800); if (!hopping) talk("drop", 0.6); hopping = false }
                }
                St.DRAG -> {}
                St.PEEK -> {
                    settle()
                    if (until == 0L) {
                        x += dir * 72 * dens * dt
                        if ((dir < 0 && x <= targetX) || (dir > 0 && x >= targetX)) { x = targetX; until = now + 6000; js("set('idle', ${-dir})") }
                    } else if (now > until) { x = x.coerceIn(0f, maxX()); walk(); talk("peekBack", 0.5) }
                }
            }
            if (st != St.PEEK) x = x.coerceIn(0f, maxX())
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
        buzz()
        openMenu()
    }

    private fun touch(e: MotionEvent) {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = e.rawX; downY = e.rawY; startX = x; startY = y
                awakeUntil = SystemClock.uptimeMillis() + 3 * 60_000
                dragging = false; longDone = false
                handler.postDelayed(longPress, 650)
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = e.rawX - downX
                val dy = e.rawY - downY
                if (!dragging && hypot(dx, dy) > 12 * dens) {
                    dragging = true; handler.removeCallbacks(longPress)
                    st = St.DRAG; js("set('drag', $dir)"); closeMenu(); hopping = false
                    dragVx = 0f; dragVy = 0f; lastMoveAt = SystemClock.uptimeMillis()
                    dragStart = SystemClock.uptimeMillis(); heldSaid = false; talk("grab", 0.5); buzz()
                }
                if (dragging) {
                    if (abs(dx) > 2) dir = if (startX + dx > x) 1 else -1
                    val nx = (startX + dx).coerceIn(0f, maxX())
                    val ny = (startY + dy).coerceIn(0f, ground())
                    val now = SystemClock.uptimeMillis()
                    val dts = ((now - lastMoveAt).coerceIn(8, 100)) / 1000f
                    dragVx = dragVx * 0.5f + (nx - x) / dts / dens * 0.5f
                    dragVy = dragVy * 0.5f + (ny - y) / dts / dens * 0.5f
                    lastMoveAt = now
                    x = nx; y = ny
                    js("v(${dragVx.toInt()}, ${dragVy.toInt()})")
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                handler.removeCallbacks(longPress)
                if (dragging) { st = St.FALL; vy = 0f; js("set('fall', $dir)") }
                else if (!longDone) {
                    if (st == St.SLEEP) { js("wake()"); idle(2500); talk("wake") }
                    else { give(l = 4f); js("tap()"); idle(2500); talk("poke", 0.7); buzz() }
                }
            }
        }
    }

    override fun onDestroy() {
        running = false
        alive = false
        Choreographer.getInstance().removeFrameCallback(tick)
        closeMenu()
        try { unregisterReceiver(sysReceiver) } catch (_: Exception) {}
        stopSensors()
        try { getSystemService(AudioManager::class.java).unregisterAudioDeviceCallback(audioCb) } catch (_: Exception) {}
        bubble?.let { try { wm.removeView(it) } catch (_: Exception) {} }
        bubble = null
        handler.removeCallbacksAndMessages(null)
        web?.let { try { wm.removeView(it) } catch (_: Exception) {}; it.destroy() }
        web = null
        super.onDestroy()
    }
}
