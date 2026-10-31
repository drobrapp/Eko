package app.drobr.eko.tv;

import android.service.dreams.DreamService;
import android.webkit.WebView;

/** Salvapantallas: el Valle con Eko a pantalla completa. Cualquier botón del mando lo cierra. */
public class EkoDream extends DreamService {
    private WebView web;

    @Override public void onAttachedToWindow() {
        super.onAttachedToWindow();
        setInteractive(false);
        setFullscreen(true);
        setScreenBright(true);
        web = Scene.create(this, null);
        setContentView(web);
    }

    @Override public void onDreamingStopped() {
        if (web != null) web.onPause();
        super.onDreamingStopped();
    }

    @Override public void onDetachedFromWindow() {
        if (web != null) { web.destroy(); web = null; }
        super.onDetachedFromWindow();
    }
}
