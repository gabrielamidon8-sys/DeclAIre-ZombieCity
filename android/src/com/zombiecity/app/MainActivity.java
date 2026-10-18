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
import android.net.wifi.WifiManager;
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
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import org.json.JSONObject;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

        /** Wi-Fi co-op: games a PC is hosting on this Wi-Fi, and the connection to the one the player joins. */
        @JavascriptInterface public void lanScanStart() { scanStart(); }
        @JavascriptInterface public void lanScanStop() { scanStop(true); }
        @JavascriptInterface public String lanScan() { return scanner.list(); }
        @JavascriptInterface public int wsOpen(String url) { return sockets.open(url); }
        @JavascriptInterface public void wsSend(int id, String text) { sockets.send(id, text); }
        @JavascriptInterface public void wsClose(int id) { sockets.close(id); }
        @JavascriptInterface public String wsPoll() { return sockets.poll(); }

        /** DeclAIre accounts: sign-in and cloud saves go through the app (only to the accounts servers). */
        @JavascriptInterface public int httpStart(String method, String url, String headers, String body) { return http.start(method, url, headers, body); }
        @JavascriptInterface public String httpPoll(int id) { return http.poll(id); }
        /** Opens a web page (the account page) in the phone's browser. */
        @JavascriptInterface public void openUrl(String url) {
            if (url == null || !url.startsWith("https://")) return;
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) { /* no browser */ }
        }
    }

    final Http http = new Http();

    /** Requests to the DeclAIre accounts servers, each on its own thread; the page polls for the answer. */
    static final class Http {
        static final Pattern ALLOWED = Pattern.compile("^https://(www\\.wixapis\\.com|[a-z0-9-]+\\.wix-site-host\\.com)/.*");
        static final int MAX_BODY = 4 * 1024 * 1024;
        final AtomicInteger ids = new AtomicInteger(1), running = new AtomicInteger(0);
        final ConcurrentHashMap<Integer, String> done = new ConcurrentHashMap<Integer, String>();

        int start(final String method, final String url, final String headers, final String body) {
            if (url == null || !ALLOWED.matcher(url).matches() || running.get() >= 8) return -1;
            final int id = ids.getAndIncrement();
            running.incrementAndGet();
            Thread t = new Thread(new Runnable() {
                @Override public void run() {
                    try { done.put(id, fetch(method, url, headers, body)); } finally { running.decrementAndGet(); }
                }
            }, "zc-http");
            t.setDaemon(true);
            t.start();
            return id;
        }

        String poll(int id) { String r = done.remove(id); return r == null ? "" : r; }

        static String fetch(String method, String url, String headers, String body) {
            HttpURLConnection c = null;
            try {
                String m = method == null ? "GET" : method.toUpperCase(Locale.ROOT);
                if (!m.equals("GET") && !m.equals("POST") && !m.equals("PUT") && !m.equals("DELETE")) m = "GET";
                c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                c.setUseCaches(false);
                c.setRequestMethod(m);
                if (headers != null && headers.length() > 0) {
                    JSONObject h = new JSONObject(headers);
                    Iterator<String> keys = h.keys();
                    while (keys.hasNext()) {
                        String k = keys.next(), lk = k.toLowerCase(Locale.ROOT);
                        if (lk.equals("authorization") || lk.equals("content-type") || lk.equals("accept")) c.setRequestProperty(k, h.getString(k));
                    }
                }
                if (body != null && body.length() > 0 && (m.equals("POST") || m.equals("PUT"))) {
                    byte[] bytes = body.getBytes("UTF-8");
                    c.setDoOutput(true);
                    c.setFixedLengthStreamingMode(bytes.length);
                    OutputStream out = c.getOutputStream();
                    try { out.write(bytes); } finally { out.close(); }
                }
                int status = c.getResponseCode();
                InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
                String text = "";
                if (in != null) {
                    ByteArrayOutputStream buf = new ByteArrayOutputStream();
                    byte[] chunk = new byte[16384];
                    int n;
                    try { while ((n = in.read(chunk)) > 0) { buf.write(chunk, 0, n); if (buf.size() > MAX_BODY) break; } } finally { in.close(); }
                    text = buf.size() > MAX_BODY ? "" : buf.toString("UTF-8");
                }
                return "{\"status\":" + status + ",\"text\":" + Lan.str(text) + "}";
            } catch (Exception e) {
                return "{\"status\":0,\"error\":" + Lan.str(String.valueOf(e.getMessage())) + "}";
            } finally {
                if (c != null) c.disconnect();
            }
        }
    }

    /* ---------- Wi-Fi co-op ----------
     * A PC running the Zombie City launcher hosts and phones join it. Two pieces live here rather than in the page:
     * finding games (the host announces itself on UDP port 47778 once a second), and the connection itself. The page
     * is a secure (https) page, and WebView won't let it open a plain ws:// connection to a device on the local
     * network, so the app opens the WebSocket and the page reads it through wsOpen / wsSend / wsPoll / wsClose. */
    final Lan.Scanner scanner = new Lan.Scanner();
    final Lan.Sockets sockets = new Lan.Sockets();
    WifiManager.MulticastLock wifiLock;
    volatile boolean scanWanted;

    synchronized void scanStart() {
        scanWanted = true;
        try {
            // many phones drop broadcast packets on Wi-Fi to save battery unless an app asks for them
            if (wifiLock == null) {
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wm != null) { wifiLock = wm.createMulticastLock("zombiecity-lan"); wifiLock.setReferenceCounted(false); }
            }
            if (wifiLock != null && !wifiLock.isHeld()) wifiLock.acquire();
        } catch (Exception e) { /* the beacons may still get through */ }
        scanner.start();
    }

    synchronized void scanStop(boolean forget) {
        if (forget) scanWanted = false;
        scanner.stop();
        try { if (wifiLock != null && wifiLock.isHeld()) wifiLock.release(); } catch (Exception e) { /* already released */ }
    }

    /** The networking itself. Plain Java only (no Android classes), so it can be tested on its own. */
    static final class Lan {
        static final int BEACON_PORT = 47778, MAX_FRAME = 8 * 1024 * 1024, MAX_PENDING = 20000, MAX_CONNS = 4;
        static final String GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
        static final SecureRandom RNG = new SecureRandom();
        static final Pattern PORT = Pattern.compile("\"port\"\\s*:\\s*(\\d{1,5})");

        /** A JSON string literal (also safe to hand to JavaScript). */
        static String str(String s) {
            StringBuilder b = new StringBuilder(s.length() + 16).append('"');
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                if (c == '"' || c == '\\') b.append('\\').append(c);
                else if (c < 0x20 || c == 0x2028 || c == 0x2029) { String h = Integer.toHexString(c); b.append("\\u"); for (int k = h.length(); k < 4; k++) b.append('0'); b.append(h); }
                else b.append(c);
            }
            return b.append('"').toString();
        }

        static String b64(byte[] d) {
            final String A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            StringBuilder b = new StringBuilder();
            for (int i = 0; i < d.length; i += 3) {
                int n = (d[i] & 255) << 16 | (i + 1 < d.length ? (d[i + 1] & 255) << 8 : 0) | (i + 2 < d.length ? d[i + 2] & 255 : 0);
                b.append(A.charAt(n >> 18 & 63)).append(A.charAt(n >> 12 & 63));
                b.append(i + 1 < d.length ? A.charAt(n >> 6 & 63) : '=').append(i + 2 < d.length ? A.charAt(n & 63) : '=');
            }
            return b.toString();
        }

        /** One client-to-server WebSocket frame (RFC 6455: always masked). */
        static byte[] frame(int op, byte[] p) {
            int n = p.length, hl = n < 126 ? 2 : n < 65536 ? 4 : 10;
            byte[] f = new byte[hl + 4 + n];
            f[0] = (byte) (0x80 | op);
            if (n < 126) f[1] = (byte) (0x80 | n);
            else if (n < 65536) { f[1] = (byte) (0x80 | 126); f[2] = (byte) (n >> 8); f[3] = (byte) n; }
            else { f[1] = (byte) (0x80 | 127); for (int i = 4; i < 8; i++) f[2 + i] = (byte) (n >> (8 * (7 - i))); }
            byte[] mk = new byte[4];
            RNG.nextBytes(mk);
            System.arraycopy(mk, 0, f, hl, 4);
            for (int i = 0; i < n; i++) f[hl + 4 + i] = (byte) (p[i] ^ mk[i & 3]);
            return f;
        }

        /** Listens for hosts' announcements; list() gives the ones heard in the last few seconds. */
        static final class Scanner {
            static final class Seen { String ip, raw; long at; }
            final LinkedHashMap<String, Seen> found = new LinkedHashMap<String, Seen>();
            DatagramSocket sock;

            synchronized void start() {
                if (sock != null) return;
                final DatagramSocket s;
                try {
                    s = new DatagramSocket(null);
                    s.setReuseAddress(true);
                    s.setBroadcast(true);
                    s.bind(new InetSocketAddress(BEACON_PORT));
                } catch (Exception e) { return; }
                sock = s;
                Thread t = new Thread(new Runnable() { public void run() { listen(s); } }, "zc-lan-scan");
                t.setDaemon(true);
                t.start();
            }

            void listen(DatagramSocket s) {
                byte[] buf = new byte[2048];
                while (!s.isClosed()) {
                    try {
                        DatagramPacket p = new DatagramPacket(buf, buf.length);
                        s.receive(p);
                        String raw = new String(p.getData(), p.getOffset(), p.getLength(), "UTF-8");
                        if (!raw.startsWith("{") || !raw.contains("\"zc\":\"lan\"")) continue;
                        Matcher m = PORT.matcher(raw);
                        Seen e = new Seen();
                        e.ip = p.getAddress().getHostAddress();
                        e.raw = raw;
                        e.at = System.currentTimeMillis();
                        synchronized (this) { if (sock == s) found.put(e.ip + ":" + (m.find() ? m.group(1) : "0"), e); }
                    } catch (IOException e) {
                        if (s.isClosed()) break;
                    }
                }
            }

            synchronized void stop() {
                if (sock != null) sock.close();
                sock = null;
                found.clear();
            }

            /** [{"ip": "...", "b": "<the host's announcement, as a JSON string>"}] */
            synchronized String list() {
                long now = System.currentTimeMillis();
                StringBuilder b = new StringBuilder("[");
                for (Iterator<Seen> it = found.values().iterator(); it.hasNext(); ) {
                    Seen e = it.next();
                    if (now - e.at > 4000) { it.remove(); continue; }
                    if (b.length() > 1) b.append(',');
                    b.append("{\"ip\":").append(str(e.ip)).append(",\"b\":").append(str(e.raw)).append('}');
                }
                return b.append(']').toString();
            }
        }

        /** WebSocket connections to a host. Each one reads on its own thread; the page collects what arrived with poll(). */
        static final class Sockets {
            final ConcurrentHashMap<Integer, Conn> conns = new ConcurrentHashMap<Integer, Conn>();
            final ConcurrentLinkedQueue<String> events = new ConcurrentLinkedQueue<String>();
            final AtomicInteger pending = new AtomicInteger(), next = new AtomicInteger();

            /** Starts connecting to ws://host:port/path and returns its number (0 if the address is no good). */
            int open(String url) {
                try {
                    URI u = new URI(url);
                    if (!"ws".equalsIgnoreCase(u.getScheme()) || u.getHost() == null || conns.size() >= MAX_CONNS) return 0;
                    String host = u.getHost();
                    if (host.startsWith("[") && host.endsWith("]")) host = host.substring(1, host.length() - 1);
                    String path = (u.getRawPath() == null || u.getRawPath().isEmpty() ? "/" : u.getRawPath()) + (u.getRawQuery() != null ? "?" + u.getRawQuery() : "");
                    Conn c = new Conn(next.incrementAndGet(), host, u.getPort() > 0 ? u.getPort() : 80, path);
                    conns.put(c.id, c);
                    Thread t = new Thread(c, "zc-ws-" + c.id);
                    t.setDaemon(true);
                    t.start();
                    return c.id;
                } catch (Exception e) { return 0; }
            }

            void send(int id, String text) {
                Conn c = conns.get(id);
                if (c == null || !c.open || text == null) return;
                try { c.out.add(frame(1, text.getBytes("UTF-8"))); } catch (Exception e) { /* not sent */ }
            }

            void close(int id) {
                Conn c = conns.get(id);
                if (c == null) return;
                c.why = 1000;
                if (c.open) c.out.add(frame(8, new byte[] { 3, (byte) 232 }));
                c.out.add(new byte[0]);
                if (!c.open) c.shut();
            }

            void closeAll() { for (Integer id : conns.keySet()) close(id); }

            /** Everything that happened since the last call: [[id,"o"], [id,"m","text"], [id,"c",code]] */
            String poll() {
                StringBuilder b = new StringBuilder("[");
                String e;
                while ((e = events.poll()) != null) {
                    pending.decrementAndGet();
                    if (b.length() > 1) b.append(',');
                    b.append(e);
                }
                // only the newest snapshot of the street is handed over; older ones would just be drawn and replaced
                for (Conn c : conns.values()) {
                    String s = c.snap.getAndSet(null);
                    if (s == null) continue;
                    if (b.length() > 1) b.append(',');
                    b.append("[").append(c.id).append(",\"m\",").append(str(s)).append("]");
                }
                return b.append(']').toString();
            }

            void emit(String e) { pending.incrementAndGet(); events.add(e); }

            final class Conn implements Runnable {
                final int id, port;
                final String host, path;
                final Socket sock = new Socket();
                final LinkedBlockingQueue<byte[]> out = new LinkedBlockingQueue<byte[]>();
                final java.util.concurrent.atomic.AtomicReference<String> snap = new java.util.concurrent.atomic.AtomicReference<String>();
                volatile boolean open, done;
                volatile int why;
                OutputStream os;

                Conn(int id, String host, int port, String path) { this.id = id; this.host = host; this.port = port; this.path = path; }

                public void run() {
                    int code = 1006;
                    try {
                        sock.connect(new InetSocketAddress(host, port), 6000);
                        sock.setTcpNoDelay(true);
                        InputStream in = new BufferedInputStream(sock.getInputStream(), 65536);
                        os = sock.getOutputStream();
                        byte[] kb = new byte[16];
                        RNG.nextBytes(kb);
                        String key = b64(kb);
                        String hostHdr = host.indexOf(':') >= 0 ? "[" + host + "]" : host;
                        os.write(("GET " + path + " HTTP/1.1\r\nHost: " + hostHdr + ":" + port + "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                            + "Sec-WebSocket-Key: " + key + "\r\nSec-WebSocket-Version: 13\r\n\r\n").getBytes("UTF-8"));
                        os.flush();
                        String accept = b64(MessageDigest.getInstance("SHA-1").digest((key + GUID).getBytes("UTF-8"))), got = null;
                        String[] head = readHead(in).split("\r\n");
                        if (head.length == 0 || !head[0].matches("HTTP/1\\.[01] 101\\b.*")) throw new IOException("refused");
                        for (String h : head) if (h.toLowerCase(Locale.ROOT).startsWith("sec-websocket-accept:")) got = h.substring(21).trim();
                        if (!accept.equals(got)) throw new IOException("bad handshake");
                        if (why != 0) throw new IOException("closed");
                        open = true;
                        emit("[" + id + ",\"o\"]");
                        Thread w = new Thread(new Runnable() { public void run() { write(); } }, "zc-ws-out-" + id);
                        w.setDaemon(true);
                        w.start();
                        code = read(new DataInputStream(in));
                    } catch (Exception e) { /* reported as a close below */ }
                    finish(code);
                }

                String readHead(InputStream in) throws IOException {
                    ByteArrayOutputStream b = new ByteArrayOutputStream();
                    int st = 0;
                    while (st < 4) {
                        int c = in.read();
                        if (c < 0 || b.size() > 16384) throw new IOException("no answer");
                        b.write(c);
                        st = (c == '\r' && (st == 0 || st == 2)) || (c == '\n' && (st == 1 || st == 3)) ? st + 1 : c == '\r' ? 1 : 0;
                    }
                    return new String(b.toByteArray(), "UTF-8");
                }

                int read(DataInputStream in) throws IOException {
                    ByteArrayOutputStream msg = new ByteArrayOutputStream();
                    while (!done) {
                        int b0 = in.readUnsignedByte(), b1 = in.readUnsignedByte();
                        int op = b0 & 15;
                        long len = b1 & 127;
                        if (len == 126) len = in.readUnsignedShort();
                        else if (len == 127) len = in.readLong();
                        if (len < 0 || len > MAX_FRAME) return 1009;
                        byte[] mk = null;
                        if ((b1 & 0x80) != 0) { mk = new byte[4]; in.readFully(mk); }
                        byte[] p = new byte[(int) len];
                        in.readFully(p);
                        if (mk != null) for (int i = 0; i < p.length; i++) p[i] ^= mk[i & 3];
                        if (op == 8) { out.add(frame(8, new byte[0])); out.add(new byte[0]); return p.length >= 2 ? (p[0] & 255) << 8 | (p[1] & 255) : 1005; }
                        if (op == 9) { out.add(frame(10, p)); continue; }
                        if (op != 0 && op != 1) continue;
                        msg.write(p, 0, p.length);
                        if (msg.size() > MAX_FRAME) return 1009;
                        if ((b0 & 0x80) != 0) {
                            String s = new String(msg.toByteArray(), "UTF-8");
                            msg.reset();
                            // snapshots of the street replace each other; everything else is queued in order
                            if (s.startsWith("{\"t\":\"s\"")) { snap.set(s); continue; }
                            // the page has stopped reading for a long time (the app is in the background): give up rather than pile up
                            if (pending.get() > MAX_PENDING) { why = 4001; return 4001; }
                            emit("[" + id + ",\"m\"," + str(s) + "]");
                        }
                    }
                    return 1000;
                }

                void write() {
                    try {
                        for (;;) {
                            byte[] f = out.take();
                            if (f.length == 0) break;
                            os.write(f);
                            os.flush();
                        }
                    } catch (Exception e) { /* the connection is gone */ }
                    shut();
                }

                void shut() { done = true; try { sock.close(); } catch (Exception e) { /* already closed */ } }

                synchronized void finish(int code) {
                    if (conns.remove(id) == null) return;
                    open = false;
                    out.add(new byte[0]);
                    shut();
                    emit("[" + id + ",\"c\"," + (why != 0 ? why : code) + "]");
                }
            }
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
        if (scanWanted) { scanStop(false); scanWanted = true; }
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
        if (scanWanted) scanStart();
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
        scanStop(true);
        sockets.closeAll();
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
