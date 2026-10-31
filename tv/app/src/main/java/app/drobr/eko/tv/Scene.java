package app.drobr.eko.tv;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.net.Uri;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

/**
 * La escena del Valle (assets/eko-tv/tv.html) en una WebView. La usan el salvapantallas y la vista previa.
 * Los archivos se sirven desde una dirección interna (la que usa WebViewAssetLoader de Android): así la escena y el
 * marco de Eko son del mismo sitio y se hablan sin problemas. Esa dirección la contesta la propia app; nunca sale a internet.
 */
final class Scene {
    static final String HOST = "appassets.androidplatform.net";

    private Scene() {}

    @SuppressLint("SetJavaScriptEnabled")
    static WebView create(final Context c, String query) {
        WebView w = new WebView(c);
        w.setBackgroundColor(Color.parseColor("#9CC9EE"));
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        w.setFocusable(false);
        w.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!HOST.equals(u.getHost())) return notFound();   // nada de internet
                String path = u.getPath() == null ? "" : u.getPath().replaceFirst("^/", "");
                if (path.contains("..")) return notFound();
                try {
                    InputStream in = c.getAssets().open(path);
                    return new WebResourceResponse(mime(path), mime(path).startsWith("text/") ? "utf-8" : null, in);
                } catch (IOException e) {
                    return notFound();
                }
            }
        });
        // Los mensajes de la página (errores de JS incluidos) van al log de Android con la etiqueta EkoTV
        w.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) {
                Log.i("EkoTV", m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
                return true;
            }
        });
        w.loadUrl("https://" + HOST + "/eko-tv/tv.html" + (query == null ? "" : query));
        return w;
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", Collections.<String, String>emptyMap(), null);
    }

    private static String mime(String p) {
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }
}
