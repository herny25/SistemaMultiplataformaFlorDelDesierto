const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printComanda: (html) => ipcRenderer.send('print-comanda', html),
  isElectron: true,
});
