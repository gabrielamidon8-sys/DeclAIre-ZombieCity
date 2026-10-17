'use strict';
// The few things the game can ask the Windows app to do: quit, and switch full screen.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ZCDesktop', {
  quit: () => ipcRenderer.send('zc-quit'),
  fullscreen: on => ipcRenderer.send('zc-fullscreen', on),
  isFullscreen: () => ipcRenderer.sendSync('zc-is-fullscreen')
});
