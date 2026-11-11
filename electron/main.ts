/**
 * Electron Main Process Entry Point for TaskFlow Desktop
 * Configures Native Window, Apple Liquid Glass vibrancy, Tray API, IPC Handlers, and Hourly Scheduler
 */

import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { LocalJSONStorage } from './storage';
import { DesktopReminderScheduler } from './scheduler';
import { DatabaseSchema } from '../src/types';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let storage: LocalJSONStorage | null = null;
let scheduler: DesktopReminderScheduler | null = null;

function createWindow() {
  storage = new LocalJSONStorage(app.getPath('userData'));

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    frame: process.platform !== 'darwin', // Frameless on macOS for liquid glass titlebar
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    vibrancy: 'under-window', // macOS native liquid glass vibrancy
    visualEffectState: 'active',
    backgroundColor: '#0b0f19',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL(devUrl);
  }

  // Setup Hourly Reminder Scheduler
  scheduler = new DesktopReminderScheduler(
    () => storage!.readDatabase(),
    (title, message, taskId) => {
      if (Notification.isSupported()) {
        const notif = new Notification({
          title,
          body: message,
          silent: false,
        });
        notif.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.webContents.send('open-task', taskId);
          }
        });
        notif.show();
      }
    }
  );
  scheduler.start();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    tray.setToolTip('TaskFlow Desktop - Local-First Task Manager');
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open TaskFlow',
        click: () => {
          if (mainWindow?.isMinimized()) mainWindow.restore();
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      {
        label: 'Run Hourly Reminder Check',
        click: () => {
          scheduler?.checkPendingReminders();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit TaskFlow',
        click: () => {
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow?.show();
        mainWindow?.focus();
      }
    });
  } catch (err) {
    console.warn('[Tray] System tray initialization deferred:', err);
  }
}

// IPC Handlers
function setupIPCHandlers() {
  ipcMain.handle('database:readAll', async () => {
    return storage ? storage.readDatabase() : null;
  });

  ipcMain.handle('database:saveAll', async (_event: unknown, data: DatabaseSchema) => {
    return storage ? storage.saveDatabase(data) : false;
  });

  ipcMain.handle('database:createBackup', async () => {
    return storage ? storage.createBackup() : { success: false };
  });

  ipcMain.handle('database:exportJSON', async () => {
    const data = storage ? storage.readDatabase() : {};
    return JSON.stringify(data, null, 2);
  });

  ipcMain.handle('database:importJSON', async (_event: unknown, jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (storage) {
        storage.saveDatabase(parsed);
        return { success: true };
      }
      return { success: false, error: 'Storage not ready' };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Invalid JSON' };
    }
  });

  ipcMain.handle('notifications:send', async (_event: unknown, notif: { title: string; message: string }) => {
    if (Notification.isSupported()) {
      new Notification({
        title: notif.title,
        body: notif.message,
      }).show();
      return true;
    }
    return false;
  });

  // Window Controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() || false);
}

app.whenReady().then(() => {
  setupIPCHandlers();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
