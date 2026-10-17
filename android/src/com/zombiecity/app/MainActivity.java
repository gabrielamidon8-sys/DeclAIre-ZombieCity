package com.zombiecity.app;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.ComponentCallbacks2;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.webkit.JavascriptInterface;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.InputStream;

/**
 * Zombie City for Android: a full-screen WebView that runs the game from the app's own assets.
 * The game is served from a reserved https address so storage, audio and file picking behave like a normal web page,
 * but nothing is fetched from the internet.
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String HOME = "https://" + HOST + "/index.html";
    static final int PICK_FILE = 7;
    static final int BG = 0xFF0E1115;

    WebView web;
    ValueCallback<Uri[]> pendingPick;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        w.setBackgroundDrawable(new ColorDrawable(BG));
        w.setStatusBarColor(BG);
        w.setNavigationBarColor(BG);

        web = new WebView(this);
        web.setBackgroundColor(BG);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        web.setWebViewClient(new AssetClient());
        web.setWebChromeClient(new Chrome());
        web.addJavascriptInterface(new Native(), "ZCNative");
        setContentView(web);
        refreshCacheOnUpdate();
        web.loadUrl(HOME);
    }

    /** After an app update, clear the WebView's cache once so nothing from the old version lingers. */
    void refreshCacheOnUpdate() {
        try {
            @SuppressWarnings("deprecation")
            int ver = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
            SharedPreferences prefs = getSharedPreferences("zc", MODE_PRIVATE);
            if (prefs.getInt("ver", -1) != ver) {
                web.clearCache(true);
                prefs.edit().putInt("ver", ver).apply();
            }
        } catch (Exception e) { /* keep going with whatever cache there is */ }
    }

    /** Device facts the game uses to pick its quality level: memory, chip, screen refresh, battery saver, heat. */
    class Native {
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public String info() {
            StringBuilder b = new StringBuilder("{");
            try {
                ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
                ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
                am.getMemoryInfo(mi);
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                int thermal = Build.VERSION.SDK_INT >= 29 ? pm.getCurrentThermalStatus() : 0;
                String soc = Build.VERSION.SDK_INT >= 31 ? Build.SOC_MANUFACTURER + " " + Build.SOC_MODEL : Build.HARDWARE;
                float hz = getWindowManager().getDefaultDisplay().getRefreshRate();
                b.append("\"model\":").append(q(Build.MANUFACTURER + " " + Build.MODEL))
                 .append(",\"soc\":").append(q(soc))
                 .append(",\"sdk\":").append(Build.VERSION.SDK_INT)
                 .append(",\"cores\":").append(Runtime.getRuntime().availableProcessors())
                 .append(",\"totalMem\":").append(mi.totalMem)
                 .append(",\"availMem\":").append(mi.availMem)
                 .append(",\"lowMemory\":").append(mi.lowMemory)
                 .append(",\"lowRam\":").append(am.isLowRamDevice())
                 .append(",\"hz\":").append(hz)
                 .append(",\"powerSave\":").append(pm.isPowerSaveMode())
                 .append(",\"thermal\":").append(thermal);
            } catch (Exception e) { /* report what we have */ }
            return b.append("}").toString();
        }

        /** A short buzz for big hits, explosions and lightning (only when the player has Vibration on). */
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void vibrate(int ms) {
            try {
                android.os.Vibrator v = (android.os.Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                long d = Math.max(5, Math.min(200, ms));
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(android.os.VibrationEffect.createOneShot(d, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                else v.vibrate(d);
            } catch (Exception e) { /* no buzz, no problem */ }
        }
    }

    static String q(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    /** Android asks apps to give memory back; the game trims its graphics caches when it does. */
    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (web != null) web.evaluateJavascript("window.zcTrim && window.zcTrim(" + level + ")", null);
    }

    @Override
    public void onLowMemory() {
        super.onLowMemory();
        onTrimMemory(ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL);
    }

    static String mime(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    /** Serves files from assets/www for the reserved host; everything else opens outside the app. */
    class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!HOST.equals(u.getHost())) return null;
            String path = u.getPath();
            if (path == null || path.length() < 2) path = "/index.html";
            String type = mime(path);
            try {
                InputStream in = getAssets().open("www" + path);
                boolean text = type.startsWith("text/") || type.equals("application/javascript") || type.equals("application/json");
                return new WebResourceResponse(type, text ? "UTF-8" : null, in);
            } catch (Exception e) {
                WebResourceResponse missing = new WebResourceResponse("text/plain", "UTF-8", null);
                missing.setStatusCodeAndReasonPhrase(404, "Not Found");
                return missing;
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (HOST.equals(u.getHost())) return false;
            try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { /* no browser */ }
            return true;
        }
    }

    /** Lets the radio's Bluetooth option open the phone's file picker (several songs at once). */
    class Chrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (pendingPick != null) pendingPick.onReceiveValue(null);
            pendingPick = callback;
            boolean many = params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE;
            try {
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("audio/*");
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, many);
                startActivityForResult(Intent.createChooser(i, "Choose songs"), PICK_FILE);
            } catch (Exception e) {
                try {
                    startActivityForResult(params.createIntent(), PICK_FILE);
                } catch (Exception e2) {
                    pendingPick = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == PICK_FILE && pendingPick != null) {
            Uri[] out = null;
            if (resultCode == RESULT_OK && data != null) {
                android.content.ClipData clip = data.getClipData();
                if (clip != null && clip.getItemCount() > 0) {
                    out = new Uri[clip.getItemCount()];
                    for (int k = 0; k < out.length; k++) out[k] = clip.getItemAt(k).getUri();
                } else if (data.getData() != null) {
                    out = new Uri[] { data.getData() };
                }
            }
            pendingPick.onReceiveValue(out);
            pendingPick = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    /** Back closes menus or pauses the run; on the title screen it leaves the app. */
    @Override
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("(window.zcBack && window.zcBack()) ? 1 : 0", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String handled) {
                if (!"1".equals(handled)) finish();
            }
        });
    }

    @Override
    protected void onPause() {
        if (web != null) {
            web.evaluateJavascript("window.zcAppPause && window.zcAppPause()", null);
            web.onPause();
            web.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.resumeTimers();
            web.onResume();
            web.evaluateJavascript("window.zcAppResume && window.zcAppResume()", null);
        }
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @SuppressWarnings("deprecation")
    void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
