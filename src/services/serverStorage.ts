/**
 * TaskFlow Server Storage Service
 * Synchronizes workspace data with the Hostinger server under:
 *   data/{company}/tasks.json
 *   data/{company}/projects.json
 *   data/{company}/users.json
 *   data/{company}/comments.json
 *   data/{company}/activities.json
 *   data/{company}/organization.json
 *   data/{company}/notifications.json
 * 
 * Enables multi-device access, cross-device login, and secure remote backup.
 */

import { DatabaseSchema, Organization } from '../types';
import { API_BASE_URL } from './emailService';

export interface ServerOrgIndexEntry {
  id: string;
  slug: string;
  name: string;
  logo?: string;
  description?: string;
  inviteCode: string;
  status: 'active' | 'inactive';
  memberCount: number;
  taskCount: number;
  createdAt?: string;
  updatedAt?: string;
}

class ServerStorageService {
  private endpoint = `${API_BASE_URL}/storage.php`;

  /**
   * Sanitizes company slug for local and remote consistency
   */
  public getCompanySlug(nameOrCode: string): string {
    const clean = (nameOrCode || 'default').trim().toLowerCase();
    const slug = clean.replace(/[^a-z0-9_\-]/g, '_').replace(/^_+|_+$/g, '');
    return slug.slice(0, 64) || 'default';
  }

  /**
   * Reads all database tables for a specific company from server: data/{company}/xxx.json
   */
  public async readCompanyData(
    companyIdentifier: string
  ): Promise<{ success: boolean; data?: DatabaseSchema; error?: string }> {
    try {
      const response = await fetch(`${this.endpoint}?action=read&company=${encodeURIComponent(companyIdentifier)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error || 'Could not parse company data from server' };
    } catch (err: any) {
      console.warn('[ServerStorage] Failed to read from server storage (offline or local preview):', err);
      return { success: false, error: err.message || 'Network error connecting to storage server' };
    }
  }

  /**
   * Writes all database tables for a specific company to server: data/{company}/xxx.json
   */
  public async writeCompanyData(
    companyIdentifier: string,
    data: DatabaseSchema
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.endpoint}?action=write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: companyIdentifier,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const result = await response.json();
      return { success: Boolean(result.success) };
    } catch (err: any) {
      console.warn('[ServerStorage] Failed to write to server storage:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Searches server global index for organization by Name or Invite Code
   */
  public async lookupOrganization(
    query: string
  ): Promise<{ success: boolean; organization?: ServerOrgIndexEntry; error?: string }> {
    try {
      const response = await fetch(`${this.endpoint}?action=lookup_org&query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.organization) {
          return { success: true, organization: result.organization };
        }
      }
      return { success: false, error: 'Organization not found on server' };
    } catch (err: any) {
      console.warn('[ServerStorage] Lookup org server error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Lists all organizations registered on server
   */
  public async listOrganizations(): Promise<ServerOrgIndexEntry[]> {
    try {
      const response = await fetch(`${this.endpoint}?action=list_organizations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.organizations || [];
      }
      return [];
    } catch (err) {
      console.warn('[ServerStorage] List orgs error:', err);
      return [];
    }
  }
}

export const serverStorage = new ServerStorageService();

