'use strict';
// Zombie City for Windows: the same game as the web page and the Android app, in its own window.
// It runs entirely from the files next to this one; nothing is downloaded.
const { app, BrowserWindow, Menu, shell, ipcMain, session } = require('electron');
const path = require('path'), fs = require('fs');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');   // the intro music starts on its own
app.setAppUserModelId('com.zombiecity.app');
if (!app.requestSingleInstanceLock()) app.quit();

const prefsFile = () => path.join(app.getPath('userData'), 'window.json');
function loadPrefs() { try { return JSON.parse(fs.readFileSync(prefsFile(), 'utf8')); } catch (e) { return { fullscreen: true }; } }
function savePrefs(p) { try { fs.writeFileSync(prefsFile(), JSON.stringify(p)); } catch (e) { /* not saved, no harm */ } }

let win = null;
function create() {
  const prefs = loadPrefs();
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 500, backgroundColor: '#0e1115', title: 'Zombie City',
    icon: path.join(__dirname, 'icon.png'), show: false, fullscreen: prefs.fullscreen !== false, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'index.html'));
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
ipcMain.on('zc-quit', () => app.quit());
ipcMain.on('zc-fullscreen', (e, on) => { if (win) win.setFullScreen(on == null ? !win.isFullScreen() : !!on); });
ipcMain.on('zc-is-fullscreen', e => { e.returnValue = !!(win && win.isFullScreen()); });
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  // the game needs no permissions beyond full screen
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'fullscreen'));
  create();
});
app.on('window-all-closed', () => app.quit());
