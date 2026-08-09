const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Frameless window like Jarvis UI
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Check if we are in production or dev
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    // In development, load the Next.js server
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // In production, we'll serve the static export or the bundled server
    mainWindow.loadURL('http://localhost:3000');
  }

    // Create tray icon
    tray = new Tray(path.join(__dirname, 'public/tray-icon.png'));
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Joya', click: () => mainWindow.show() },
      { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('Joya AI');
    tray.setContextMenu(contextMenu);

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

