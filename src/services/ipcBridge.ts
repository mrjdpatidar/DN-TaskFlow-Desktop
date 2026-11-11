/**
 * Secure IPC Bridge for TaskFlow Desktop
 * Adheres to: "Do not access Node.js filesystem APIs directly from React components.
 * All file operations must go through secure IPC communication."
 */

import { DatabaseSchema, AppNotification } from '../types';
import { INITIAL_SEED_DATA } from './seedData';
import { playNotificationSound } from './audio';

export interface ElectronBridge {
  isElectron: boolean;
  database: {
    readAll: () => Promise<DatabaseSchema>;
    writeTable: <K extends keyof DatabaseSchema>(table: K, data: DatabaseSchema[K]) => Promise<boolean>;
    saveAll: (data: DatabaseSchema) => Promise<boolean>;
    createBackup: () => Promise<{ success: boolean; filename: string; timestamp: string }>;
    exportJSON: () => Promise<string>;
    importJSON: (jsonString: string) => Promise<{ success: boolean; error?: string }>;
    resetToDefault: () => Promise<boolean>;
    getStorageStats: () => Promise<{
      totalRecords: number;
      estimatedSizeKB: number;
      lastSaved: string;
      storageLocation: string;
    }>;
  };
  notifications: {
    send: (notification: { title: string; message: string; taskId?: string }) => Promise<boolean>;
    requestPermission: () => Promise<boolean>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
  };
  system: {
    platform: 'darwin' | 'win32' | 'linux';
    appVersion: string;
    userDataPath: string;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronBridge;
  }
}

const STORAGE_KEYS = {
  DB: 'taskflow_desktop_database_v1',
  BACKUP_PREFIX: 'taskflow_desktop_backup_',
  LAST_BACKUP: 'taskflow_desktop_last_backup',
};

// Fallback Browser-Local Engine implementing full IPC contract
class BrowserIPCBridge implements ElectronBridge {
  isElectron = false;

  system = {
    platform: (typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac') ? 'darwin' : 'win32') as 'darwin' | 'win32',
    appVersion: '1.2.0-desktop',
    userDataPath: '~/Library/Application Support/TaskFlowDesktop/database',
  };

  database = {
    readAll: async (): Promise<DatabaseSchema> => {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.DB);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.tasks && parsed.users && parsed.organizations) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Storage read fallback triggered:', err);
      }
      // Initialize with seed data on first launch
      localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(INITIAL_SEED_DATA));
      return JSON.parse(JSON.stringify(INITIAL_SEED_DATA));
    },

    writeTable: async <K extends keyof DatabaseSchema>(table: K, data: DatabaseSchema[K]): Promise<boolean> => {
      try {
        const current = await this.database.readAll();
        current[table] = data;
        localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(current));
        return true;
      } catch (err) {
        console.error('Failed to write table through IPC:', err);
        return false;
      }
    },

    saveAll: async (data: DatabaseSchema): Promise<boolean> => {
      try {
        localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(data));
        return true;
      } catch (err) {
        console.error('Failed to save database state:', err);
        return false;
      }
    },

    createBackup: async (): Promise<{ success: boolean; filename: string; timestamp: string }> => {
      try {
        const current = await this.database.readAll();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `taskflow-backup-${timestamp}.json`;
        localStorage.setItem(`${STORAGE_KEYS.BACKUP_PREFIX}${timestamp}`, JSON.stringify(current));
        localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp);
        return { success: true, filename, timestamp };
      } catch {
        return { success: false, filename: '', timestamp: '' };
      }
    },

    exportJSON: async (): Promise<string> => {
      const current = await this.database.readAll();
      return JSON.stringify(current, null, 2);
    },

    importJSON: async (jsonString: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed.tasks || !parsed.users || !parsed.organizations) {
          return { success: false, error: 'Invalid TaskFlow schema format' };
        }
        localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(parsed));
        return { success: true };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Invalid JSON file' };
      }
    },

    resetToDefault: async (): Promise<boolean> => {
      localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(INITIAL_SEED_DATA));
      return true;
    },

    getStorageStats: async () => {
      const db = await this.database.readAll();
      const raw = JSON.stringify(db);
      const totalRecords =
        (db.users?.length || 0) +
        (db.organizations?.length || 0) +
        (db.projects?.length || 0) +
        (db.tasks?.length || 0) +
        (db.comments?.length || 0) +
        (db.activities?.length || 0) +
        (db.notifications?.length || 0);

      return {
        totalRecords,
        estimatedSizeKB: Math.round((raw.length * 2) / 1024),
        lastSaved: new Date().toLocaleTimeString(),
        storageLocation: 'Electron userData /database/*.json',
      };
    },
  };

  notifications = {
    send: async (notification: { title: string; message: string; taskId?: string }): Promise<boolean> => {
      // Play audio chime
      playNotificationSound();

      // Check native browser Notification support
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
          });
          return true;
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
            });
            return true;
          }
        }
      }
      return true;
    },

    requestPermission: async (): Promise<boolean> => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      }
      return false;
    },
  };

  window = {
    minimize: () => {
      console.log('[IPC] window:minimize');
    },
    maximize: () => {
      console.log('[IPC] window:maximize');
    },
    close: () => {
      console.log('[IPC] window:close');
    },
    isMaximized: async () => false,
  };
}

// Export singleton IPC Bridge
export const ipcBridge: ElectronBridge =
  typeof window !== 'undefined' && window.electronAPI ? window.electronAPI : new BrowserIPCBridge();
