const { app, BrowserWindow, Menu, Tray, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize settings store
const store = new Store();

let mainWindow;
let tray;

// Default settings
const defaultSettings = {
  selectedMonitor: 0,
  opacity: 0.9,
  alwaysOnTop: false,
  position: { x: 100, y: 100 },
  size: { width: 1200, height: 800 },
  autoStart: true
};

function createWindow() {
  // Get saved settings
  const settings = { ...defaultSettings, ...store.get('settings', {}) };
  
  // Use default position (screen module will be available after app ready)
  const x = settings.position.x;
  const y = settings.position.y;

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: settings.size.width,
    height: settings.size.height,
    x: x,
    y: y,
    frame: false, // Remove window frame for widget look
    transparent: true, // Enable transparency
    alwaysOnTop: settings.alwaysOnTop,
    skipTaskbar: true, // Don't show in taskbar
    resizable: true,
    movable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // Don't show until ready
  });

  // Set opacity
  mainWindow.setOpacity(settings.opacity);

  // Load the app
  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Development tools (remove in production)
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Save window position and size when moved/resized
  mainWindow.on('moved', saveWindowState);
  mainWindow.on('resized', saveWindowState);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function saveWindowState() {
  if (mainWindow) {
    const position = mainWindow.getPosition();
    const size = mainWindow.getSize();
    
    store.set('settings.position', { x: position[0], y: position[1] });
    store.set('settings.size', { width: size[0], height: size[1] });
  }
}

function createTray() {
  // Create tray icon (simple for now)
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Hide Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Choose Monitor',
      submenu: [
        {
          label: 'Primary Monitor',
          type: 'radio',
          checked: true,
          click: () => {
            // Monitor selection functionality can be added later
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: store.get('settings.alwaysOnTop', false),
      click: (item) => {
        store.set('settings.alwaysOnTop', item.checked);
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(item.checked);
        }
      }
    },
    {
      label: 'Opacity',
      submenu: [
        { label: '100%', type: 'radio', checked: store.get('settings.opacity', 0.9) === 1.0, click: () => setOpacity(1.0) },
        { label: '90%', type: 'radio', checked: store.get('settings.opacity', 0.9) === 0.9, click: () => setOpacity(0.9) },
        { label: '80%', type: 'radio', checked: store.get('settings.opacity', 0.9) === 0.8, click: () => setOpacity(0.8) },
        { label: '70%', type: 'radio', checked: store.get('settings.opacity', 0.9) === 0.7, click: () => setOpacity(0.7) }
      ]
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Life Dashboard');
  tray.setContextMenu(contextMenu);
}

function setOpacity(opacity) {
  store.set('settings.opacity', opacity);
  if (mainWindow) {
    mainWindow.setOpacity(opacity);
  }
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createTray();
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

// Display change handling can be added later when needed

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} 