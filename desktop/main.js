'use strict';
// Zombie City Launcher for Windows. It opens on the launcher screen (news, version, Play), keeps the game up to date
// from the game's GitHub releases, and runs the game in the same window. The game itself is one self-contained page;
// a copy ships inside the launcher so it also plays offline. The launcher also runs the Wi-Fi co-op server (lan.js).
const { app, BrowserWindow, Menu, shell, ipcMain, session, net } = require('electron');
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const lan = require('./lan.js');

const REPO = 'gabrielamidon8-sys/DeclAIre-ZombieCity';
const WEBSITE = 'https://declairestudios.wordpress.com';   // the game's website (WordPress)
const ACCOUNT = 'https://headless-iilujwebfcb-gabrielamidon8-140e.wix-site-host.com/';   // the DeclAIre account page
// DeclAIre accounts (Wix): the only addresses the game may reach through the app
const ACCT_URL = /^https:\/\/(www\.wixapis\.com|[a-z0-9-]+\.wix-site-host\.com)\//;
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');   // the intro music starts on its own
app.setAppUserModelId('com.zombiecity.app');
if (!app.requestSingleInstanceLock()) app.quit();

const DATA = () => app.getPath('userData');
const GAME_DIR = () => path.join(DATA(), 'game');
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const prefsFile = () => path.join(DATA(), 'window.json');
function loadPrefs() { return Object.assign({ fullscreen: true }, readJson(prefsFile(), {})); }
function savePrefs(p) { try { fs.writeFileSync(prefsFile(), JSON.stringify(Object.assign(loadPrefs(), p))); } catch (e) { /* not saved, no harm */ } }
function vcmp(a, b) { const x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; }
// the newest game on this PC: the downloaded one, or the copy inside the launcher
function games() {
  const bundled = readJson(path.join(__dirname, 'game', 'game.json'), { version: '0' });
  const installed = readJson(path.join(GAME_DIR(), 'game.json'), null);
  const okInstalled = installed && fs.existsSync(path.join(GAME_DIR(), 'index.html'));
  const useInstalled = okInstalled && vcmp(installed.version, bundled.version) > 0;
  return { bundled: bundled.version, installed: okInstalled ? installed.version : null, current: useInstalled ? installed.version : bundled.version,
    file: useInstalled ? path.join(GAME_DIR(), 'index.html') : path.join(__dirname, 'game', 'index.html') };
}

let win = null, server = null;
const scanner = lan.createScanner();
function create() {
  const prefs = loadPrefs();
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 560, backgroundColor: '#0b0d10', title: 'Zombie City',
    icon: path.join(__dirname, 'icon.png'), show: false, fullscreen: !!prefs.fullscreen, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'launcher.html'));
  // F11 or Alt+Enter switch between full screen and a window
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && (input.key === 'F11' || (input.alt && input.key === 'Enter'))) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.on('enter-full-screen', () => savePrefs({ fullscreen: true }));
  win.on('leave-full-screen', () => savePrefs({ fullscreen: false }));
  // links open in the normal web browser, never inside the game window
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
  win.on('closed', () => { win = null; });
}

/* ---------- the game asks the app ---------- */
ipcMain.on('zc-quit', () => app.quit());
ipcMain.on('zc-fullscreen', (e, on) => { if (win) win.setFullScreen(on == null ? !win.isFullScreen() : !!on); });
ipcMain.on('zc-is-fullscreen', e => { e.returnValue = !!(win && win.isFullScreen()); });
ipcMain.on('zc-launcher', () => { if (win) win.loadFile(path.join(__dirname, 'launcher.html')); });

/* ---------- DeclAIre accounts ----------
   The game runs from a file, so it signs in and saves through the app instead of calling the accounts server itself.
   Only the accounts addresses are allowed, only a few headers pass, and nothing is kept here. */
ipcMain.handle('zc-http', async (e, req) => {
  try {
    const url = String(req && req.url || '');
    if (!ACCT_URL.test(url)) return { status: 0, text: '', error: 'blocked' };
    const method = /^(GET|POST|PUT|PATCH|DELETE)$/.test(req.method) ? req.method : 'GET';
    const headers = {};
    for (const [k, v] of Object.entries(req.headers || {})) if (/^(authorization|content-type|accept)$/i.test(k)) headers[k] = String(v);
    const r = await net.fetch(url, { method: method, headers: headers, body: method === 'GET' || req.body == null ? undefined : String(req.body), credentials: 'omit' });
    const text = await r.text();
    return { status: r.status, text: text.length > 4e6 ? '' : text };
  } catch (err) { return { status: 0, text: '', error: String(err && err.message || err) }; }
});
ipcMain.handle('zc-open', (e, url) => { if (/^https:\/\//.test(String(url))) shell.openExternal(String(url)); return true; });

/* ---------- Wi-Fi co-op ---------- */
ipcMain.handle('zc-lan-host', async (e, name, port) => {
  if (server) { server.stop(); server = null; }
  for (const p of [port || 47777, 0]) {
    const s = lan.createServer({ name: name, port: p });
    try { const r = await s.start(); server = s; return Object.assign({ ok: true }, r); } catch (err) { try { s.stop(); } catch (x) { } if (p === 0) return { ok: false, error: err.message }; }
  }
  return { ok: false, error: 'no free port' };
});
ipcMain.handle('zc-lan-stop', () => { if (server) { server.stop(); server = null; } return true; });
ipcMain.handle('zc-lan-info', (e, o) => { if (server && o) server.setInfo(o); return true; });
ipcMain.handle('zc-lan-scan-start', () => { scanner.start(); return true; });
ipcMain.handle('zc-lan-scan', () => scanner.list().filter(g => !server || g.port !== server.port || !lan.lanAddresses().some(a => a.ip === g.ip)));
ipcMain.handle('zc-lan-scan-stop', () => { scanner.stop(); return true; });

/* ---------- the launcher ---------- */
async function getJson(url) {
  const r = await net.fetch(url, { headers: { 'User-Agent': 'ZombieCityLauncher', Accept: 'application/vnd.github+json' } });
  if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
ipcMain.handle('zl-info', () => Object.assign(games(), { fullscreen: !!(win && win.isFullScreen()), website: WEBSITE, account: ACCOUNT, repo: REPO, launcher: app.getVersion() }));
// the latest release on GitHub: its game.json says which version it holds and the game file's checksum
ipcMain.handle('zl-check', async () => {
  try {
    const rels = await getJson('https://api.github.com/repos/' + REPO + '/releases?per_page=6');
    const news = (rels || []).filter(r => !r.draft).slice(0, 4).map(r => ({ name: r.name || r.tag_name, tag: r.tag_name, date: r.published_at, body: String(r.body || '').slice(0, 1200), url: r.html_url }));
    const rel = (rels || []).find(r => !r.draft && !r.prerelease && (r.assets || []).some(a => a.name === 'game.json'));
    if (!rel) return { ok: true, news: news, latest: null };
    const ga = rel.assets.find(a => a.name === 'game.json'), ha = rel.assets.find(a => a.name === 'zombie-city-game.html');
    const meta = await getJson(ga.browser_download_url);
    return { ok: true, news: news, latest: { version: String(meta.version), sha256: String(meta.sha256 || ''), size: meta.size | 0, url: ha ? ha.browser_download_url : null, notes: rel.body || '', tag: rel.tag_name } };
  } catch (err) {
    // 404: the releases aren't public yet; 403/429: GitHub's hourly limit; anything else: no connection
    const why = err && err.status === 404 ? 'norepo' : err && (err.status === 403 || err.status === 429) ? 'limit' : 'offline';
    return { ok: false, why: why, error: String(err && err.message || err) };
  }
});
// download the new game, check it, and only then put it in place (an interrupted download never breaks the old one)
ipcMain.handle('zl-update', async (e, latest) => {
  try {
    if (!latest || !latest.url || !/^https:\/\/(github\.com|objects\.githubusercontent\.com)\//.test(latest.url)) throw new Error('no download');
    const r = await net.fetch(latest.url, { headers: { 'User-Agent': 'ZombieCityLauncher' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const total = +r.headers.get('content-length') || latest.size || 0, reader = r.body.getReader(), parts = []; let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(Buffer.from(value)); got += value.length; if (total) e.sender.send('zl-progress', Math.min(1, got / total)); }
    const buf = Buffer.concat(parts), sum = crypto.createHash('sha256').update(buf).digest('hex');
    if (latest.sha256 && sum !== latest.sha256.toLowerCase()) throw new Error('the download was damaged (checksum did not match)');
    if (buf.length < 100000 || !buf.slice(0, 400).toString('utf8').includes('<')) throw new Error('the download is not the game');
    fs.mkdirSync(GAME_DIR(), { recursive: true });
    const tmp = path.join(GAME_DIR(), 'index.html.part');
    fs.writeFileSync(tmp, buf); fs.renameSync(tmp, path.join(GAME_DIR(), 'index.html'));
    fs.writeFileSync(path.join(GAME_DIR(), 'game.json'), JSON.stringify({ version: latest.version, sha256: sum, at: Date.now() }));
    return Object.assign({ ok: true }, games());
  } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
});
ipcMain.handle('zl-play', () => { if (win) win.loadFile(games().file); return true; });
ipcMain.handle('zl-open', (e, url) => { if (/^https:\/\//.test(String(url))) shell.openExternal(String(url)); return true; });

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  // the game needs no permissions beyond full screen
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'fullscreen'));
  create();
});
app.on('window-all-closed', () => { if (server) server.stop(); scanner.stop(); app.quit(); });
