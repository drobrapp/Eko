package app.drobr.eko.tv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.TextView;

/**
 * PRUEBA (no es parte de Eko TV): ¿puede la app dibujar encima del menú de Google TV y saber qué app hay delante?
 * Durante 60 s pone un recuadro abajo a la izquierda con la app que está delante y lo apunta en el log (EkoProbe).
 * Solo lo puede arrancar ADB (permiso DUMP): adb shell am start-foreground-service -n app.drobr.eko.tv/.OverlayProbe
 */
public class OverlayProbe extends Service {
    private static final String TAG = "EkoProbe";
    private final Handler h = new Handler(Looper.getMainLooper());
    private WindowManager wm;
    private TextView box;
    private int ticks = 0;
    private String fg = "?";

    @Override public IBinder onBind(Intent i) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("probe", "Prueba", NotificationManager.IMPORTANCE_LOW));
        Notification n = new Notification.Builder(this, "probe").setContentTitle("Eko TV · prueba").setSmallIcon(android.R.drawable.ic_menu_info_details).build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(1, n);

        boolean canDraw = Settings.canDrawOverlays(this);
        Log.i(TAG, "canDrawOverlays=" + canDraw);
        if (canDraw && box == null) {
            wm = getSystemService(WindowManager.class);
            box = new TextView(this);
            box.setTextColor(Color.WHITE);
            box.setTextSize(22);
            box.setPadding(28, 18, 28, 18);
            box.setBackgroundColor(Color.parseColor("#CC12324a"));
            WindowManager.LayoutParams p = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
                    PixelFormat.TRANSLUCENT);
            p.gravity = Gravity.BOTTOM | Gravity.START;
            p.x = 60; p.y = 60;
            try { wm.addView(box, p); Log.i(TAG, "overlay añadido"); }
            catch (Exception e) { Log.i(TAG, "overlay falló: " + e); box = null; }
        }
        h.post(tick);
        return START_NOT_STICKY;
    }

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            fg = foreground();
            Log.i(TAG, "t=" + (ticks * 2) + "s delante=" + fg + " overlay=" + (box != null));
            if (box != null) box.setText("Eko · prueba de capa\ndelante: " + fg);
            if (++ticks <= 30) h.postDelayed(this, 2000);
            else stopSelf();
        }
    };

    /** La última app que ha pasado a primer plano (necesita el permiso de estadísticas de uso) */
    private String foreground() {
        try {
            UsageStatsManager u = getSystemService(UsageStatsManager.class);
            long now = System.currentTimeMillis();
            UsageEvents ev = u.queryEvents(now - 6 * 3600_000L, now);
            UsageEvents.Event e = new UsageEvents.Event();
            String last = null;
            while (ev.hasNextEvent()) {
                ev.getNextEvent(e);
                if (e.getEventType() == UsageEvents.Event.ACTIVITY_RESUMED) last = e.getPackageName();
            }
            return last == null ? "(sin datos: falta permiso de uso)" : last;
        } catch (Exception ex) {
            return "(error: " + ex.getClass().getSimpleName() + ")";
        }
    }

    @Override public void onDestroy() {
        h.removeCallbacks(tick);
        if (box != null && wm != null) { try { wm.removeView(box); } catch (Exception ignored) {} box = null; }
        Log.i(TAG, "fin de la prueba");
        super.onDestroy();
    }
}
