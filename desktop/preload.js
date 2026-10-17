'use strict';
// What the launcher screen and the game can ask the Windows app to do: quit, switch full screen, go back to the
// launcher, run and find Wi-Fi co-op games, and (on the launcher screen) check for and install game updates.
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
  lanScanStop: () => ipcRenderer.invoke('zc-lan-scan-stop')
});
contextBridge.exposeInMainWorld('ZCLauncher', {
  info: () => ipcRenderer.invoke('zl-info'),
  check: () => ipcRenderer.invoke('zl-check'),
  update: latest => ipcRenderer.invoke('zl-update', latest),
  play: () => ipcRenderer.invoke('zl-play'),
  open: url => ipcRenderer.invoke('zl-open', String(url || '')),
  onProgress: fn => { ipcRenderer.removeAllListeners('zl-progress'); ipcRenderer.on('zl-progress', (e, f) => fn(f)); }
});
