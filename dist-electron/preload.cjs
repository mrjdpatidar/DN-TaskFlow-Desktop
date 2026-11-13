// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  database: {
    readAll: () => import_electron.ipcRenderer.invoke("database:readAll"),
    writeTable: (table, data) => import_electron.ipcRenderer.invoke("database:writeTable", table, data),
    saveAll: (data) => import_electron.ipcRenderer.invoke("database:saveAll", data),
    createBackup: () => import_electron.ipcRenderer.invoke("database:createBackup"),
    exportJSON: () => import_electron.ipcRenderer.invoke("database:exportJSON"),
    importJSON: (jsonString) => import_electron.ipcRenderer.invoke("database:importJSON", jsonString),
    resetToDefault: () => import_electron.ipcRenderer.invoke("database:resetToDefault"),
    getStorageStats: () => import_electron.ipcRenderer.invoke("database:getStorageStats")
  },
  notifications: {
    send: (notification) => import_electron.ipcRenderer.invoke("notifications:send", notification),
    requestPermission: async () => true
  },
  window: {
    minimize: () => import_electron.ipcRenderer.send("window:minimize"),
    maximize: () => import_electron.ipcRenderer.send("window:maximize"),
    close: () => import_electron.ipcRenderer.send("window:close"),
    isMaximized: () => import_electron.ipcRenderer.invoke("window:isMaximized")
  },
  system: {
    platform: process.platform,
    appVersion: "1.0.1-desktop",
    userDataPath: ""
  },
  updater: {
    check: () => import_electron.ipcRenderer.invoke("updater:check"),
    downloadAndInstall: (url) => import_electron.ipcRenderer.invoke("updater:downloadAndInstall", url)
  }
});
