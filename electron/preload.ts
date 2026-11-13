/**
 * Electron Preload Script - Secure IPC Context Isolation Bridge
 * Adheres strictly to security requirements:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - No direct fs or child_process access in renderer
 */

import { contextBridge, ipcRenderer } from 'electron';
import { DatabaseSchema } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  database: {
    readAll: () => ipcRenderer.invoke('database:readAll'),
    writeTable: (table: keyof DatabaseSchema, data: unknown) => ipcRenderer.invoke('database:writeTable', table, data),
    saveAll: (data: DatabaseSchema) => ipcRenderer.invoke('database:saveAll', data),
    createBackup: () => ipcRenderer.invoke('database:createBackup'),
    exportJSON: () => ipcRenderer.invoke('database:exportJSON'),
    importJSON: (jsonString: string) => ipcRenderer.invoke('database:importJSON', jsonString),
    resetToDefault: () => ipcRenderer.invoke('database:resetToDefault'),
    getStorageStats: () => ipcRenderer.invoke('database:getStorageStats'),
  },
  notifications: {
    send: (notification: { title: string; message: string; taskId?: string }) =>
      ipcRenderer.invoke('notifications:send', notification),
    requestPermission: async () => true,
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  system: {
    platform: process.platform as 'darwin' | 'win32' | 'linux',
    appVersion: '1.0.1-desktop',
    userDataPath: '',
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    downloadAndInstall: (url: string) => ipcRenderer.invoke('updater:downloadAndInstall', url),
  },
});
