const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Frameless window like Jarvis UI
    transparent: true,
    icon: path.join(__dirname, 'public/tray-icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Check if we are in production or dev
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    // In development, load the Next.js server
    // In development, load the Next.js server on port 3333 to avoid port 3000 conflicts
    mainWindow.loadURL('http://localhost:3333');
  } else {
    // In production, we'll serve the static export or the bundled server
    mainWindow.loadURL('http://localhost:3333');
  }

    // Create tray icon if it exists
    const iconPath = path.join(__dirname, 'public/tray-icon.png');
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Joya', click: () => mainWindow.show() },
        { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
      ]);
      tray.setToolTip('Joya AI');
      tray.setContextMenu(contextMenu);
    }

  // Setup IPC for background wake word (kept for API triggers if needed)
  ipcMain.on('wake-up', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  // Register a global shortcut to toggle the window mode (App vs Desktop Pet)
  globalShortcut.register('CommandOrControl+Shift+J', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.webContents.send('toggle-mode');
    }
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

