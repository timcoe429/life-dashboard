const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

// Fix GPU errors on Windows
app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    x: 50,
    y: 50,
    frame: false, // Remove window frame for clean look
    skipTaskbar: true, // Don't show in taskbar
    alwaysOnTop: false, // Stay behind other windows
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#f0f0f0' // Light gray background
  });

  mainWindow.loadFile('index.html');
  
  // Show dev tools to see what's happening
  mainWindow.webContents.openDevTools();

  // Keep it behind other windows
  mainWindow.on('focus', () => {
    mainWindow.blur(); // Lose focus immediately
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}
