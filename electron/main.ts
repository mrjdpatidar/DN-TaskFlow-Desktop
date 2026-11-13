/**
 * Electron Main Process Entry Point for TaskFlow
 * Configures Native Window, Apple Liquid Glass vibrancy, Tray API, IPC Handlers, and Hourly Scheduler
 */

import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, shell, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { LocalJSONStorage } from './storage';
import { DesktopReminderScheduler } from './scheduler';
import { DatabaseSchema } from '../src/types';

// Set AppUserModelId for Windows Action Center / Toast Notifications
if (process.platform === 'win32') {
  app.setAppUserModelId('com.drunall.taskflow');
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let storage: LocalJSONStorage | null = null;
let scheduler: DesktopReminderScheduler | null = null;
let isQuitting = false;
let hasShownBackgroundNotice = false;

function getAppIconPath(): string {
  const candidates = [
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, '../dist/icon.png'),
    path.join(app.getAppPath(), 'dist/icon.png'),
    path.join(app.getAppPath(), 'public/icon.png'),
    path.join(process.resourcesPath, 'public/icon.png'),
    path.join(process.resourcesPath, 'dist/icon.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return '';
}

function createWindow() {
  storage = new LocalJSONStorage(app.getPath('userData'));

  const iconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    icon: iconPath || undefined,
    frame: process.platform !== 'darwin', // Frameless on macOS for liquid glass titlebar
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    vibrancy: 'under-window', // macOS native liquid glass vibrancy
    visualEffectState: 'active',
    backgroundColor: '#0b0f19',
    webPreferences: {
      preload: path.join(__dirname, fs.existsSync(path.join(__dirname, 'preload.cjs')) ? 'preload.cjs' : 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Hide default system menu bar (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);
  mainWindow.setMenu(null);
  mainWindow.setMenuBarVisibility(false);

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL(devUrl);
  }

  // Setup Hourly/Proactive Reminder Scheduler
  scheduler = new DesktopReminderScheduler(
    () => storage!.readDatabase(),
    (title, message, taskId) => {
      if (Notification.isSupported()) {
        const notif = new Notification({
          title,
          body: message,
          icon: getAppIconPath() || undefined,
          silent: false,
        });
        notif.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
            if (taskId) {
              mainWindow.webContents.send('open-task', taskId);
            }
          }
        });
        notif.show();
      }
    }
  );
  scheduler.start();

  // Minimize to System Tray when close (X) is clicked instead of destroying process
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();

      // Show informative background toast only once (never spam on repeated closes)
      if (!hasShownBackgroundNotice) {
        hasShownBackgroundNotice = true;
        try {
          const flagFile = path.join(app.getPath('userData'), '.bg_notified');
          const alreadyNotified = fs.existsSync(flagFile);
          if (!alreadyNotified && Notification.isSupported()) {
            fs.writeFileSync(flagFile, 'true', 'utf-8');
            const bgNotif = new Notification({
              title: 'DN TaskFlow running in background',
              body: 'TaskFlow is minimized to your system tray. You will still receive notifications and deadline alerts.',
              icon: getAppIconPath() || undefined,
              silent: true,
            });
            bgNotif.show();
          }
        } catch {
          // Ignore filesystem error
        }
      }
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    const iconPath = getAppIconPath();
    let trayIcon: nativeImage;
    if (iconPath && fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } else {
      trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('DN TaskFlow - Modern Desktop Task & Workspace Platform');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open DN TaskFlow',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        },
      },
      {
        label: 'Check Reminders Now',
        click: () => {
          scheduler?.checkPendingReminders();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit DN TaskFlow',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        createWindow();
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

  ipcMain.handle('notifications:send', async (_event: unknown, notif: { title: string; message: string; taskId?: string }) => {
    try {
      if (Notification.isSupported()) {
        const iconPath = getAppIconPath();
        const notification = new Notification({
          title: notif.title || 'DN TaskFlow',
          body: notif.message || '',
          icon: iconPath || undefined,
          silent: false,
        });

        notification.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
            if (notif.taskId) {
              mainWindow.webContents.send('open-task', notif.taskId);
            }
          }
        });

        notification.show();
        return true;
      }
    } catch (err) {
      console.error('[Notification] Failed to show desktop notification:', err);
    }
    return false;
  });

  function isNewerVersion(latest: string, current: string): boolean {
    const lParts = (latest || '').split('.').map((n) => parseInt(n, 10) || 0);
    const cParts = (current || '').split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  }

  // In-App Auto-Update Handlers
  ipcMain.handle('updater:check', async () => {
    const manifestUrl = 'https://app.drunall.com/taskflow/downloads/version.json';
    const currentVersion = app.getVersion();
    try {
      const response = await net.fetch(manifestUrl);
      if (response.ok) {
        const raw: any = await response.json();
        // Support array of releases, object with releases array, or flat object
        const data: any = Array.isArray(raw)
          ? raw[0]
          : (raw && Array.isArray(raw.releases) && raw.releases.length > 0)
            ? raw.releases[0]
            : raw;

        const hasUpdate = isNewerVersion(data.version, currentVersion);
        return {
          updateAvailable: hasUpdate,
          currentVersion: currentVersion,
          latestVersion: data.version || currentVersion,
          releaseNotes: data.notes || 'Production updates & bug fixes',
          downloadUrl: data.url || 'https://app.drunall.com/taskflow/downloads/DN%20TaskFlow-Setup.exe',
          pubDate: data.pub_date,
        };
      }
    } catch (err) {
      console.warn('[AutoUpdater] Remote manifest fetch failed, falling back:', err);
    }
    return {
      updateAvailable: false,
      currentVersion: currentVersion,
      latestVersion: currentVersion,
      releaseNotes: 'You are on the latest version.',
      downloadUrl: '',
    };
  });

  ipcMain.handle('updater:downloadAndInstall', async (_event: unknown, downloadUrl: string) => {
    try {
      const targetUrl = downloadUrl || 'https://app.drunall.com/taskflow/downloads/DN%20TaskFlow-Setup.exe';
      const tempPath = path.join(app.getPath('temp'), 'DN TaskFlow-Setup.exe');
      
      const fileStream = fs.createWriteStream(tempPath);
      await new Promise<void>((resolve, reject) => {
        https.get(targetUrl, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            https.get(res.headers.location, (redirectRes) => {
              redirectRes.pipe(fileStream);
              fileStream.on('finish', () => { fileStream.close(); resolve(); });
            }).on('error', reject);
          } else {
            res.pipe(fileStream);
            fileStream.on('finish', () => { fileStream.close(); resolve(); });
          }
        }).on('error', reject);
      });

      // Launch installer
      await shell.openPath(tempPath);
      return { success: true };
    } catch (err: any) {
      console.error('[AutoUpdater] Download/install failed:', err);
      // Fallback: open URL in system browser
      shell.openExternal(downloadUrl);
      return { success: true };
    }
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
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      if (mainWindow?.isMinimized()) mainWindow.restore();
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Keep app running in background tray to fire desktop notifications
  if (isQuitting) {
    app.quit();
  }
});
