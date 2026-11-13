var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var path2 = __toESM(require("path"), 1);
var fs2 = __toESM(require("fs"), 1);
var https = __toESM(require("https"), 1);

// electron/storage.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);

// src/services/seedData.ts
var INITIAL_SEED_DATA = {
  users: [],
  organizations: [],
  projects: [],
  tasks: [],
  comments: [],
  activities: [],
  notifications: [],
  preferences: {
    theme: "dark",
    accentColor: "#0080fa",
    desktopNotificationsEnabled: true,
    hourlyRemindersEnabled: true,
    reminderIntervalMinutes: 60,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    soundEnabled: true,
    dockBadge: true
  },
  session: {
    currentUserId: null,
    currentOrgId: null,
    rememberMe: false
  }
};

// electron/storage.ts
var LocalJSONStorage = class {
  constructor(userDataPath) {
    this.baseDir = userDataPath;
    this.dbDir = path.join(this.baseDir, "database");
    this.backupDir = path.join(this.baseDir, "backups");
    this.uploadsDir = path.join(this.baseDir, "uploads");
    this.ensureDirectories();
    this.initializeDefaultData();
  }
  ensureDirectories() {
    [this.baseDir, this.dbDir, this.backupDir, this.uploadsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
  initializeDefaultData() {
    const mainDbFile = path.join(this.dbDir, "taskflow_data.json");
    if (!fs.existsSync(mainDbFile)) {
      this.atomicWrite(mainDbFile, JSON.stringify(INITIAL_SEED_DATA, null, 2));
    }
  }
  atomicWrite(targetPath, content) {
    const tempPath = `${targetPath}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tempPath, content, "utf-8");
      fs.renameSync(tempPath, targetPath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
        }
      }
      throw err;
    }
  }
  readDatabase() {
    const mainDbFile = path.join(this.dbDir, "taskflow_data.json");
    try {
      if (!fs.existsSync(mainDbFile)) {
        return INITIAL_SEED_DATA;
      }
      const raw = fs.readFileSync(mainDbFile, "utf-8");
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (err) {
      console.error("[Storage] Error reading database, attempting recovery from backup:", err);
      return this.recoverFromLatestBackup();
    }
  }
  saveDatabase(data) {
    const mainDbFile = path.join(this.dbDir, "taskflow_data.json");
    try {
      this.atomicWrite(mainDbFile, JSON.stringify(data, null, 2));
      this.atomicWrite(path.join(this.dbDir, "users.json"), JSON.stringify(data.users || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, "organizations.json"), JSON.stringify(data.organizations || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, "projects.json"), JSON.stringify(data.projects || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, "tasks.json"), JSON.stringify(data.tasks || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, "comments.json"), JSON.stringify(data.comments || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, "activities.json"), JSON.stringify(data.activities || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, "notifications.json"), JSON.stringify(data.notifications || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, "sessions.json"), JSON.stringify(data.session || {}, null, 2));
      const settingsDir = path.join(this.baseDir, "settings");
      if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
      this.atomicWrite(path.join(settingsDir, "preferences.json"), JSON.stringify(data.preferences || {}, null, 2));
      return true;
    } catch (err) {
      console.error("[Storage] Failed to save database:", err);
      return false;
    }
  }
  createBackup() {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.json`;
    const backupPath = path.join(this.backupDir, filename);
    try {
      const data = this.readDatabase();
      this.atomicWrite(backupPath, JSON.stringify(data, null, 2));
      this.rotateBackups(10);
      return { success: true, filename, timestamp };
    } catch (err) {
      console.error("[Storage] Backup failed:", err);
      return { success: false, filename: "", timestamp: "" };
    }
  }
  rotateBackups(keepCount) {
    try {
      const files = fs.readdirSync(this.backupDir).filter((f) => f.startsWith("backup-") && f.endsWith(".json")).sort().reverse();
      if (files.length > keepCount) {
        files.slice(keepCount).forEach((f) => {
          try {
            fs.unlinkSync(path.join(this.backupDir, f));
          } catch {
          }
        });
      }
    } catch {
    }
  }
  recoverFromLatestBackup() {
    try {
      const files = fs.readdirSync(this.backupDir).filter((f) => f.startsWith("backup-") && f.endsWith(".json")).sort().reverse();
      if (files.length > 0) {
        const latest = path.join(this.backupDir, files[0]);
        const content = fs.readFileSync(latest, "utf-8");
        return JSON.parse(content);
      }
    } catch {
    }
    return INITIAL_SEED_DATA;
  }
};

// electron/scheduler.ts
var DesktopReminderScheduler = class {
  constructor(getDatabase, onSendNotification) {
    this.timer = null;
    this.lastNotifiedMap = /* @__PURE__ */ new Map();
    this.getDatabase = getDatabase;
    this.onSendNotification = onSendNotification;
  }
  start() {
    this.stop();
    setTimeout(() => this.checkPendingReminders(), 3e3);
    this.timer = setInterval(() => {
      this.checkPendingReminders();
    }, 60 * 1e3);
  }
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  isQuietHours(start, end) {
    const now = /* @__PURE__ */ new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = (start || "22:00").split(":").map(Number);
    const [endH, endM] = (end || "08:00").split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    if (startTotal <= endTotal) {
      return currentMinutes >= startTotal && currentMinutes <= endTotal;
    } else {
      return currentMinutes >= startTotal || currentMinutes <= endTotal;
    }
  }
  checkPendingReminders() {
    let db;
    try {
      db = this.getDatabase();
    } catch (err) {
      console.warn("[Scheduler] Error reading database:", err);
      return;
    }
    if (!db) return;
    const desktopEnabled = db.preferences?.desktopNotificationsEnabled ?? true;
    if (!desktopEnabled) return;
    const hourlyEnabled = db.preferences?.hourlyRemindersEnabled ?? true;
    if (!hourlyEnabled) return;
    if (db.preferences?.quietHoursEnabled) {
      if (this.isQuietHours(db.preferences.quietHoursStart, db.preferences.quietHoursEnd)) {
        return;
      }
    }
    const currentUserId = db.session?.currentUserId;
    const now = /* @__PURE__ */ new Date();
    const nowMs = now.getTime();
    const ONE_HOUR_MS = 60 * 60 * 1e3;
    const pendingTasks = (db.tasks || []).filter((t) => {
      if (t.isArchived || t.status === "completed" || t.status === "cancelled") return false;
      if (t.remindersEnabled === false) return false;
      if (currentUserId && Array.isArray(t.assignedTo) && t.assignedTo.length > 0) {
        return t.assignedTo.includes(currentUserId);
      }
      return true;
    });
    for (const task of pendingTasks) {
      if (!task.dueDate) continue;
      const dueDate = new Date(task.dueDate);
      if (isNaN(dueDate.getTime())) continue;
      const diffHours = (dueDate.getTime() - nowMs) / (1e3 * 60 * 60);
      const lastSent = this.lastNotifiedMap.get(task.id) || 0;
      if (nowMs - lastSent < ONE_HOUR_MS) {
        continue;
      }
      if (diffHours < 0) {
        this.lastNotifiedMap.set(task.id, nowMs);
        this.onSendNotification(
          `\u26A0\uFE0F Overdue Task Alert: "${task.title}"`,
          `This task was due on ${dueDate.toLocaleDateString()}. Tap to view or update status.`,
          task.id
        );
      } else if (diffHours <= 24) {
        this.lastNotifiedMap.set(task.id, nowMs);
        const hrs = Math.max(1, Math.round(diffHours));
        this.onSendNotification(
          `\u23F0 Upcoming Deadline: "${task.title}"`,
          `Due in ${hrs} hour${hrs === 1 ? "" : "s"}. Priority: ${(task.priority || "medium").toUpperCase()}.`,
          task.id
        );
      }
    }
  }
};

// electron/main.ts
if (process.platform === "win32") {
  import_electron.app.setAppUserModelId("com.drunall.taskflow");
}
var mainWindow = null;
var tray = null;
var storage = null;
var scheduler = null;
var isQuitting = false;
var hasShownBackgroundNotice = false;
function getAppIconPath() {
  const candidates = [
    path2.join(__dirname, "../public/icon.png"),
    path2.join(__dirname, "../dist/icon.png"),
    path2.join(import_electron.app.getAppPath(), "dist/icon.png"),
    path2.join(import_electron.app.getAppPath(), "public/icon.png"),
    path2.join(process.resourcesPath, "public/icon.png"),
    path2.join(process.resourcesPath, "dist/icon.png")
  ];
  for (const c of candidates) {
    if (fs2.existsSync(c)) return c;
  }
  return "";
}
function createWindow() {
  storage = new LocalJSONStorage(import_electron.app.getPath("userData"));
  const iconPath = getAppIconPath();
  mainWindow = new import_electron.BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    icon: iconPath || void 0,
    frame: process.platform !== "darwin",
    // Frameless on macOS for liquid glass titlebar
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    autoHideMenuBar: true,
    vibrancy: "under-window",
    // macOS native liquid glass vibrancy
    visualEffectState: "active",
    backgroundColor: "#0b0f19",
    webPreferences: {
      preload: path2.join(__dirname, fs2.existsSync(path2.join(__dirname, "preload.cjs")) ? "preload.cjs" : "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  import_electron.Menu.setApplicationMenu(null);
  mainWindow.setMenu(null);
  mainWindow.setMenuBarVisibility(false);
  const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
  if (import_electron.app.isPackaged) {
    mainWindow.loadFile(path2.join(__dirname, "../dist/index.html"));
  } else {
    mainWindow.loadURL(devUrl);
  }
  scheduler = new DesktopReminderScheduler(
    () => storage.readDatabase(),
    (title, message, taskId) => {
      if (import_electron.Notification.isSupported()) {
        const notif = new import_electron.Notification({
          title,
          body: message,
          icon: getAppIconPath() || void 0,
          silent: false
        });
        notif.on("click", () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
            if (taskId) {
              mainWindow.webContents.send("open-task", taskId);
            }
          }
        });
        notif.show();
      }
    }
  );
  scheduler.start();
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      if (!hasShownBackgroundNotice) {
        hasShownBackgroundNotice = true;
        try {
          const flagFile = path2.join(import_electron.app.getPath("userData"), ".bg_notified");
          const alreadyNotified = fs2.existsSync(flagFile);
          if (!alreadyNotified && import_electron.Notification.isSupported()) {
            fs2.writeFileSync(flagFile, "true", "utf-8");
            const bgNotif = new import_electron.Notification({
              title: "DN TaskFlow running in background",
              body: "TaskFlow is minimized to your system tray. You will still receive notifications and deadline alerts.",
              icon: getAppIconPath() || void 0,
              silent: true
            });
            bgNotif.show();
          }
        } catch {
        }
      }
      return false;
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function createTray() {
  try {
    const iconPath = getAppIconPath();
    let trayIcon;
    if (iconPath && fs2.existsSync(iconPath)) {
      trayIcon = import_electron.nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } else {
      trayIcon = import_electron.nativeImage.createEmpty();
    }
    tray = new import_electron.Tray(trayIcon);
    tray.setToolTip("DN TaskFlow - Modern Desktop Task & Workspace Platform");
    const contextMenu = import_electron.Menu.buildFromTemplate([
      {
        label: "Open DN TaskFlow",
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        }
      },
      {
        label: "Check Reminders Now",
        click: () => {
          scheduler?.checkPendingReminders();
        }
      },
      { type: "separator" },
      {
        label: "Quit DN TaskFlow",
        click: () => {
          isQuitting = true;
          import_electron.app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on("click", () => {
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
    console.warn("[Tray] System tray initialization deferred:", err);
  }
}
function setupIPCHandlers() {
  import_electron.ipcMain.handle("database:readAll", async () => {
    return storage ? storage.readDatabase() : null;
  });
  import_electron.ipcMain.handle("database:saveAll", async (_event, data) => {
    return storage ? storage.saveDatabase(data) : false;
  });
  import_electron.ipcMain.handle("database:createBackup", async () => {
    return storage ? storage.createBackup() : { success: false };
  });
  import_electron.ipcMain.handle("database:exportJSON", async () => {
    const data = storage ? storage.readDatabase() : {};
    return JSON.stringify(data, null, 2);
  });
  import_electron.ipcMain.handle("database:importJSON", async (_event, jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (storage) {
        storage.saveDatabase(parsed);
        return { success: true };
      }
      return { success: false, error: "Storage not ready" };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Invalid JSON" };
    }
  });
  import_electron.ipcMain.handle("notifications:send", async (_event, notif) => {
    try {
      if (import_electron.Notification.isSupported()) {
        const iconPath = getAppIconPath();
        const notification = new import_electron.Notification({
          title: notif.title || "DN TaskFlow",
          body: notif.message || "",
          icon: iconPath || void 0,
          silent: false
        });
        notification.on("click", () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
            if (notif.taskId) {
              mainWindow.webContents.send("open-task", notif.taskId);
            }
          }
        });
        notification.show();
        return true;
      }
    } catch (err) {
      console.error("[Notification] Failed to show desktop notification:", err);
    }
    return false;
  });
  function isNewerVersion(latest, current) {
    const lParts = (latest || "").split(".").map((n) => parseInt(n, 10) || 0);
    const cParts = (current || "").split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  }
  import_electron.ipcMain.handle("updater:check", async () => {
    const manifestUrl = "https://app.drunall.com/taskflow/downloads/version.json";
    const currentVersion = import_electron.app.getVersion();
    try {
      const response = await import_electron.net.fetch(manifestUrl);
      if (response.ok) {
        const raw = await response.json();
        const data = Array.isArray(raw) ? raw[0] : raw && Array.isArray(raw.releases) && raw.releases.length > 0 ? raw.releases[0] : raw;
        const hasUpdate = isNewerVersion(data.version, currentVersion);
        return {
          updateAvailable: hasUpdate,
          currentVersion,
          latestVersion: data.version || currentVersion,
          releaseNotes: data.notes || "Production updates & bug fixes",
          downloadUrl: data.url || "https://app.drunall.com/taskflow/downloads/DN%20TaskFlow-Setup.exe",
          pubDate: data.pub_date
        };
      }
    } catch (err) {
      console.warn("[AutoUpdater] Remote manifest fetch failed, falling back:", err);
    }
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseNotes: "You are on the latest version.",
      downloadUrl: ""
    };
  });
  import_electron.ipcMain.handle("updater:downloadAndInstall", async (_event, downloadUrl) => {
    try {
      const targetUrl = downloadUrl || "https://app.drunall.com/taskflow/downloads/DN%20TaskFlow-Setup.exe";
      const tempPath = path2.join(import_electron.app.getPath("temp"), "DN TaskFlow-Setup.exe");
      const fileStream = fs2.createWriteStream(tempPath);
      await new Promise((resolve, reject) => {
        https.get(targetUrl, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            https.get(res.headers.location, (redirectRes) => {
              redirectRes.pipe(fileStream);
              fileStream.on("finish", () => {
                fileStream.close();
                resolve();
              });
            }).on("error", reject);
          } else {
            res.pipe(fileStream);
            fileStream.on("finish", () => {
              fileStream.close();
              resolve();
            });
          }
        }).on("error", reject);
      });
      await import_electron.shell.openPath(tempPath);
      return { success: true };
    } catch (err) {
      console.error("[AutoUpdater] Download/install failed:", err);
      import_electron.shell.openExternal(downloadUrl);
      return { success: true };
    }
  });
  import_electron.ipcMain.on("window:minimize", () => mainWindow?.minimize());
  import_electron.ipcMain.on("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  import_electron.ipcMain.on("window:close", () => mainWindow?.close());
  import_electron.ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized() || false);
}
import_electron.app.whenReady().then(() => {
  setupIPCHandlers();
  createWindow();
  createTray();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      if (mainWindow?.isMinimized()) mainWindow.restore();
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});
import_electron.app.on("before-quit", () => {
  isQuitting = true;
});
import_electron.app.on("window-all-closed", () => {
  if (isQuitting) {
    import_electron.app.quit();
  }
});
