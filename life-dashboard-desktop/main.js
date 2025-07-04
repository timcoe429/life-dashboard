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
<<<<<<< HEAD
    frame: false, // Remove window frame for clean look
    skipTaskbar: true, // Don't show in taskbar
    alwaysOnTop: false, // Stay behind other windows
=======
    frame: false,
    skipTaskbar: true,
    alwaysOnTop: false,
>>>>>>> 33ba8d89e4971ba754bba81d352a85f1afdb90bc
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
<<<<<<< HEAD
    backgroundColor: '#f0f0f0' // Light gray background
  });

  mainWindow.loadFile('index.html');
  
  // Show dev tools to see what's happening
  mainWindow.webContents.openDevTools();

  // Keep it behind other windows
  mainWindow.on('focus', () => {
    mainWindow.blur(); // Lose focus immediately
=======
    backgroundColor: '#f0f0f0'
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();

  mainWindow.on('focus', () => {
    mainWindow.blur(); // Stay behind other windows
>>>>>>> 33ba8d89e4971ba754bba81d352a85f1afdb90bc
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
<<<<<<< HEAD

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} 
=======
>>>>>>> 33ba8d89e4971ba754bba81d352a85f1afdb90bc
