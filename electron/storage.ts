/**
 * Electron Main Process - Centralized JSON Storage Service
 * Handles reading and atomic writes to local JSON files in app.getPath('userData')/database
 */

import * as fs from 'fs';
import * as path from 'path';
import { DatabaseSchema } from '../src/types';
import { INITIAL_SEED_DATA } from '../src/services/seedData';

export class LocalJSONStorage {
  private baseDir: string;
  private dbDir: string;
  private backupDir: string;
  private uploadsDir: string;

  constructor(userDataPath: string) {
    this.baseDir = userDataPath;
    this.dbDir = path.join(this.baseDir, 'database');
    this.backupDir = path.join(this.baseDir, 'backups');
    this.uploadsDir = path.join(this.baseDir, 'uploads');
    this.ensureDirectories();
    this.initializeDefaultData();
  }

  private ensureDirectories() {
    [this.baseDir, this.dbDir, this.backupDir, this.uploadsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private initializeDefaultData() {
    const mainDbFile = path.join(this.dbDir, 'taskflow_data.json');
    if (!fs.existsSync(mainDbFile)) {
      this.atomicWrite(mainDbFile, JSON.stringify(INITIAL_SEED_DATA, null, 2));
    }
  }

  private atomicWrite(targetPath: string, content: string): void {
    const tempPath = `${targetPath}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, targetPath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
      throw err;
    }
  }

  public readDatabase(): DatabaseSchema {
    const mainDbFile = path.join(this.dbDir, 'taskflow_data.json');
    try {
      if (!fs.existsSync(mainDbFile)) {
        return INITIAL_SEED_DATA;
      }
      const raw = fs.readFileSync(mainDbFile, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (err) {
      console.error('[Storage] Error reading database, attempting recovery from backup:', err);
      return this.recoverFromLatestBackup();
    }
  }

  public saveDatabase(data: DatabaseSchema): boolean {
    const mainDbFile = path.join(this.dbDir, 'taskflow_data.json');
    try {
      this.atomicWrite(mainDbFile, JSON.stringify(data, null, 2));

      // Also persist individual structured JSON files as specified in architecture
      this.atomicWrite(path.join(this.dbDir, 'users.json'), JSON.stringify(data.users || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, 'organizations.json'), JSON.stringify(data.organizations || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, 'projects.json'), JSON.stringify(data.projects || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, 'tasks.json'), JSON.stringify(data.tasks || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, 'comments.json'), JSON.stringify(data.comments || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, 'activities.json'), JSON.stringify(data.activities || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, 'notifications.json'), JSON.stringify(data.notifications || [], null, 2));
      this.atomicWrite(path.join(this.dbDir, 'sessions.json'), JSON.stringify(data.session || {}, null, 2));

      const settingsDir = path.join(this.baseDir, 'settings');
      if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
      this.atomicWrite(path.join(settingsDir, 'preferences.json'), JSON.stringify(data.preferences || {}, null, 2));

      return true;
    } catch (err) {
      console.error('[Storage] Failed to save database:', err);
      return false;
    }
  }

  public createBackup(): { success: boolean; filename: string; timestamp: string } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const backupPath = path.join(this.backupDir, filename);
    try {
      const data = this.readDatabase();
      this.atomicWrite(backupPath, JSON.stringify(data, null, 2));
      this.rotateBackups(10);
      return { success: true, filename, timestamp };
    } catch (err) {
      console.error('[Storage] Backup failed:', err);
      return { success: false, filename: '', timestamp: '' };
    }
  }

  private rotateBackups(keepCount: number) {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length > keepCount) {
        files.slice(keepCount).forEach(f => {
          try { fs.unlinkSync(path.join(this.backupDir, f)); } catch {}
        });
      }
    } catch {}
  }

  private recoverFromLatestBackup(): DatabaseSchema {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length > 0) {
        const latest = path.join(this.backupDir, files[0]);
        const content = fs.readFileSync(latest, 'utf-8');
        return JSON.parse(content);
      }
    } catch {}
    return INITIAL_SEED_DATA;
  }
}
