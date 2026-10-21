package app.drobr.eko

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.Icon
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.core.content.ContextCompat
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.sqrt

// Eko paseando por encima de las demás apps. Es el Eko de escritorio de verdad (src/), dentro de una página web:
// su «ventana» de 420×380 se mueve por la pantalla y Android solo muestra el trocito donde está Eko (y sus bocadillos o su menú),
// para que el resto de la pantalla siga funcionando con normalidad.
class EkoService : Service(), Host {

    companion object { var running = false }

    private lateinit var wm: WindowManager
    private lateinit var lp: WindowManager.LayoutParams
    private var web: WebView? = null
    private var box: FrameLayout? = null
    private val handler = Handler(Looper.getMainLooper())
    private var dens = 1f

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

    // ---------- Pantalla ----------
    private fun screenW(): Int = if (Build.VERSION.SDK_INT >= 30) wm.currentWindowMetrics.bounds.width() else resources.displayMetrics.widthPixels
    private fun screenH(): Int = if (Build.VERSION.SDK_INT >= 30) wm.currentWindowMetrics.bounds.height() else resources.displayMetrics.heightPixels
    private fun inset(top: Boolean): Int {
        if (Build.VERSION.SDK_INT >= 30) {
            val i = wm.currentWindowMetrics.windowInsets.getInsetsIgnoringVisibility(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
            return if (top) i.top else i.bottom
        }
        val id = resources.getIdentifier(if (top) "status_bar_height" else "navigation_bar_height", "dimen", "android")
        return if (id > 0) resources.getDimensionPixelSize(id) else 0
    }
    // En algunos móviles la «y» de la ventana empieza debajo de la barra de estado: se mide dónde acaba de verdad
    private var yOffset = 0
    private fun calibrate() {
        val b = box ?: return
        val loc = IntArray(2)
        b.getLocationOnScreen(loc)
        if (loc[1] != 0 || lp.y == 0) yOffset = loc[1] - lp.y
    }
    // margen bajo los pies, para que no pise la barra de gestos
    private val FOOT = 6

    @Volatile private var sc = "{}"
    private fun measure() {
        sc = "{\"w\":${(screenW() / dens).roundToInt()},\"h\":${(screenH() / dens).roundToInt()},\"top\":${(inset(true) / dens).roundToInt()},\"bottom\":${(inset(false) / dens).roundToInt() + FOOT}}"
    }

    // ---------- Host: lo que pide la página ----------
    @Volatile private var vx = 0.0
    @Volatile private var vy = 0.0
    @Volatile private var cl = 150.0
    @Volatile private var ct = 220.0
    @Volatile private var cw = 120.0
    @Volatile private var ch = 160.0
    @Volatile private var rawX = 0f
    @Volatile private var rawY = 0f
    @Volatile private var pending = false
    private val apply = Runnable {
        pending = false
        val b = box ?: return@Runnable
        val w = web ?: return@Runnable
        lp.x = ((vx + cl) * dens).roundToInt()
        lp.y = ((vy + ct) * dens).roundToInt() - yOffset
        val nw = (cw * dens).roundToInt().coerceAtLeast(1)
        val nh = (ch * dens).roundToInt().coerceAtLeast(1)
        lp.width = nw; lp.height = nh
        w.translationX = (-cl * dens).toFloat()
        w.translationY = (-ct * dens).toFloat()
        try { wm.updateViewLayout(b, lp) } catch (_: Exception) {}
    }
    private fun schedule() { if (!pending) { pending = true; handler.post(apply) } }
    override fun pos(x: Double, y: Double) { vx = x; vy = y; schedule() }
    override fun clip(l: Double, t: Double, w: Double, h: Double) { cl = l; ct = t; cw = w; ch = h; schedule() }
    override fun screen(): String = sc
    override fun raw(): String = "{\"x\":${rawX / dens},\"y\":${rawY / dens}}"
    override fun show(on: Boolean) { box?.visibility = if (on) View.VISIBLE else View.GONE }
    override fun focus(on: Boolean) {
        val b = box ?: return
        val f = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        lp.flags = if (on) lp.flags and f.inv() else lp.flags or f
        try { wm.updateViewLayout(b, lp) } catch (_: Exception) {}
        if (on) web?.requestFocus()
    }
    override fun close() { prefs().edit().putBoolean("out", false).apply(); stopSelf() }

    @SuppressLint("ClickableViewAccessibility")
    private fun addOverlay() {
        wm = getSystemService(WindowManager::class.java)
        dens = resources.displayMetrics.density
        measure()
        val w = WebView(this)
        w.setBackgroundColor(Color.TRANSPARENT)
        // La página siempre mide 420×380 (como la ventana del PC); la ventana de Android es solo un recorte
        w.layoutParams = FrameLayout.LayoutParams((420 * dens).roundToInt(), (380 * dens).roundToInt())
        val b = object : FrameLayout(this) {
            override fun dispatchTouchEvent(e: MotionEvent): Boolean { rawX = e.rawX; rawY = e.rawY; return super.dispatchTouchEvent(e) }
        }
        b.clipChildren = true
        b.addView(w)
        lp = WindowManager.LayoutParams(
            (cw * dens).roundToInt(), (ch * dens).roundToInt(),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        )
        lp.gravity = Gravity.TOP or Gravity.START
        vx = (screenW() / dens) * 0.6 - 210; vy = (screenH() / dens) - 380.0
        web = w; box = b
        apply.run()
        wm.addView(b, lp)
        Hub.setup(this, w, "overlay", this, "index.html")
        handler.postDelayed({ calibrate(); schedule() }, 400)
        handler.postDelayed({ calibrate(); schedule() }, 3000)
        handler.postDelayed(remeasure, 2000)
        val f = IntentFilter().apply {
            addAction(Intent.ACTION_POWER_CONNECTED); addAction(Intent.ACTION_BATTERY_CHANGED)
            addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_USER_PRESENT)
        }
        ContextCompat.registerReceiver(this, sysReceiver, f, ContextCompat.RECEIVER_NOT_EXPORTED)
        startSensors()
        getSystemService(AudioManager::class.java).registerAudioDeviceCallback(audioCb, handler)
        handler.postDelayed(updateCheck, 60_000)
    }
    // Si giras el móvil o cambian las barras, el suelo se recoloca
    private val remeasure = object : Runnable { override fun run() { measure(); handler.postDelayed(this, 2000) } }

    // Avisos del móvil para el Eko de escritorio (assets/mob/mobile.js decide qué hace y qué dice)
    private fun mob(ev: String) { web?.evaluateJavascript("window.EkoMobile&&EkoMobile.on('$ev')", null) }

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
                    mob("charge")
                }
                Intent.ACTION_BATTERY_CHANGED -> {
                    val lvl = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                    val scale = i.getIntExtra(BatteryManager.EXTRA_SCALE, 100).coerceAtLeast(1)
                    val pct = lvl * 100 / scale
                    val plugged = i.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) != 0
                    if (pct in 0..15 && !plugged && !lowSaid) { lowSaid = true; mob("lowBattery") }
                    if (pct > 30 || plugged) lowSaid = false
                }
                Intent.ACTION_SCREEN_OFF -> {
                    screenOffAt = now; stopSensors()
                }
                Intent.ACTION_USER_PRESENT -> {
                    startSensors()
                    if (screenOffAt > 0 && now - screenOffAt > 5 * 60_000) handler.postDelayed({ mob("missed") }, 1200)
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
                if (peaks >= 3 && now - lastDizzy > 4000) { lastDizzy = now; peaks = 0; mob("shake") }
            }
            // boca abajo un par de segundos: siesta
            if (az < -8.5f && abs(ax) < 2.5f && abs(ay) < 2.5f) {
                if (downSince == 0L) downSince = now
                else if (now - downSince > 2500) { downSince = now + 60_000; mob("faceDown") }
            } else if (downSince in 1..now) downSince = 0L
        }
        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }
    private fun startSensors() {
        sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let { sensors.registerListener(motion, it, SensorManager.SENSOR_DELAY_UI) }
    }
    private fun stopSensors() { sensors.unregisterListener(motion) }
    private val HEADS = setOf(AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_BLE_HEADSET)
    private val audioCb = object : AudioDeviceCallback() {
        var ready = false
        override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>) {
            if (!ready) { ready = true; return }          // la primera llamada son los que ya estaban conectados
            if (added.any { it.isSink && it.type in HEADS }) mob("music")
        }
        override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>) {
            if (removed.any { it.isSink && it.type in HEADS }) mob("musicOff")
        }
    }

    override fun onDestroy() {
        running = false
        try { unregisterReceiver(sysReceiver) } catch (_: Exception) {}
        stopSensors()
        try { getSystemService(AudioManager::class.java).unregisterAudioDeviceCallback(audioCb) } catch (_: Exception) {}
        handler.removeCallbacksAndMessages(null)
        web?.let { Hub.webs.remove(it) }
        box?.let { try { wm.removeView(it) } catch (_: Exception) {} }
        web?.destroy()
        web = null; box = null
        super.onDestroy()
    }
}
