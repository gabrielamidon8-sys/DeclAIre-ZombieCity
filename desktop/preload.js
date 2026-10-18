'use strict';
// What the launcher screen and the game can ask the Windows app to do: quit, switch full screen, go back to the
// launcher, run and find Wi-Fi co-op games, sign in to a DeclAIre account, and (on the launcher screen) check for and
// install game updates.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ZCDesktop', {
  quit: () => ipcRenderer.send('zc-quit'),
  fullscreen: on => ipcRenderer.send('zc-fullscreen', on),
  isFullscreen: () => ipcRenderer.sendSync('zc-is-fullscreen'),
  launcher: () => ipcRenderer.send('zc-launcher'),
  lanHost: (name, port) => ipcRenderer.invoke('zc-lan-host', String(name || ''), port | 0),
  lanStop: () => ipcRenderer.invoke('zc-lan-stop'),
  lanInfo: o => ipcRenderer.invoke('zc-lan-info', o && typeof o === 'object' ? { run: !!o.run, name: o.name ? String(o.name) : undefined } : {}),
  lanScanStart: () => ipcRenderer.invoke('zc-lan-scan-start'),
  lanScan: () => ipcRenderer.invoke('zc-lan-scan'),
  lanScanStop: () => ipcRenderer.invoke('zc-lan-scan-stop'),
  // DeclAIre accounts: the game's sign-in and cloud-save requests, and opening the account page in the browser
  http: req => ipcRenderer.invoke('zc-http', { method: String(req && req.method || 'GET'), url: String(req && req.url || ''), headers: req && req.headers && typeof req.headers === 'object' ? Object.assign({}, req.headers) : {}, body: req && req.body != null ? String(req.body) : null }),
  open: url => ipcRenderer.invoke('zc-open', String(url || ''))
});
contextBridge.exposeInMainWorld('ZCLauncher', {
  info: () => ipcRenderer.invoke('zl-info'),
  check: () => ipcRenderer.invoke('zl-check'),
  update: latest => ipcRenderer.invoke('zl-update', latest),
  play: () => ipcRenderer.invoke('zl-play'),
  open: url => ipcRenderer.invoke('zl-open', String(url || '')),
  onProgress: fn => { ipcRenderer.removeAllListeners('zl-progress'); ipcRenderer.on('zl-progress', (e, f) => fn(f)); }
});
