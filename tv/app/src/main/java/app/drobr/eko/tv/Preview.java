package app.drobr.eko.tv;

import android.app.Activity;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;

/**
 * Vista previa del salvapantallas, para probar sin cambiar los ajustes de la tele.
 * Extras opcionales: demo (true = comenta a menudo), h (hora fingida, p. ej. "22.5"), debug (true = datos en pantalla).
 * Atrás la cierra.
 */
public class Preview extends Activity {
    private WebView web;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        StringBuilder q = new StringBuilder();
        if (getIntent().getBooleanExtra("demo", true)) q.append("&demo=1");
        String h = getIntent().getStringExtra("h");
        if (h != null) q.append("&h=").append(h);
        if (getIntent().getBooleanExtra("debug", false)) q.append("&debug=1");
        web = Scene.create(this, q.length() > 0 ? "?" + q.substring(1) : null);
        setContentView(web);
    }

    @Override protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
