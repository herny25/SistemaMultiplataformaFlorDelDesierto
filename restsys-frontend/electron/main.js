const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on('print-comanda', (event, html) => {
  const tmpFile = path.join(os.tmpdir(), `comanda-${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf-8');

  const win = new BrowserWindow({ show: false });
  win.loadFile(tmpFile);

  win.webContents.once('did-finish-load', () => {
    win.webContents.print({ silent: true, printBackground: false }, () => {
      win.close();
      try { fs.unlinkSync(tmpFile); } catch { /* ignorar */ }
    });
  });
});
