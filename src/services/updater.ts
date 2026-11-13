/**
 * In-App Auto-Update Client Service for TaskFlow
 * Checks update manifest at https://app.drunall.com/taskflow/downloads/version.json
 * Enables direct in-app download and installation of https://app.drunall.com/taskflow/downloads/DN TaskFlow-Setup.exe
 */

import { AppUpdateInfo } from '../types';

export const CURRENT_APP_VERSION = '1.0.2';
export const UPDATE_MANIFEST_URL = 'https://app.drunall.com/taskflow/downloads/version.json';
export const DIRECT_EXE_DOWNLOAD_URL = 'https://app.drunall.com/taskflow/downloads/DN%20TaskFlow-Setup.exe';

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  pubDate?: string;
}

class UpdaterService {
  /**
   * Compare semver strings (e.g. "1.0.0" vs "1.0.1")
   */
  private isNewer(latest: string, current: string): boolean {
    const lParts = latest.split('.').map((n) => parseInt(n, 10) || 0);
    const cParts = current.split('.').map((n) => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  }

  /**
   * Check for remote updates
   */
  public async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      // In electron, if native updater handler is configured
      if (typeof window !== 'undefined' && window.electronAPI?.updater?.check) {
        const res = await window.electronAPI.updater.check();
        return res;
      }

      // HTTP fallback check
      const response = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' });
      if (response.ok) {
        const raw = await response.json();
        // Support array of releases, object with releases array, or flat object
        const data = Array.isArray(raw)
          ? raw[0]
          : (raw && Array.isArray(raw.releases) && raw.releases.length > 0)
            ? raw.releases[0]
            : raw;

        const hasUpdate = this.isNewer(data.version, CURRENT_APP_VERSION);
        return {
          updateAvailable: hasUpdate,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: data.version || CURRENT_APP_VERSION,
          releaseNotes: data.notes || 'Performance enhancements, bug fixes, and new features.',
          downloadUrl: data.url || DIRECT_EXE_DOWNLOAD_URL,
          pubDate: data.pub_date,
        };
      }
    } catch (err) {
      console.warn('[Updater] Remote manifest fetch error:', err);
    }

    // Default simulated response if offline
    return {
      updateAvailable: true,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: '1.0.1',
      releaseNotes: '⚡ TaskFlow v1.0.1: Production Ready Release, In-App Auto-Updates, Hostinger Native PHP Mailer, SuperAdmin Control Panel, and Email Privacy.',
      downloadUrl: DIRECT_EXE_DOWNLOAD_URL,
    };
  }

  /**
   * Starts in-app download and installation
   */
  public async installUpdate(
    downloadUrl: string,
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    // If running inside Electron, trigger native download & execute installer
    if (typeof window !== 'undefined' && window.electronAPI?.updater?.downloadAndInstall) {
      return window.electronAPI.updater.downloadAndInstall(downloadUrl);
    }

    // In web preview: trigger download link
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'DN TaskFlow-Setup.exe';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return { success: true };
  }
}

export const updaterService = new UpdaterService();
