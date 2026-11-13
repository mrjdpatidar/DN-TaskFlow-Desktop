import { DatabaseSchema } from '../types';

/**
 * Production-Ready Clean Initial Seed State
 * Pure empty baseline state: zero dummy accounts, zero dummy tasks, zero auto-login.
 * Every user registers fresh and sets up their own workspace.
 */
export const INITIAL_SEED_DATA: DatabaseSchema = {
  users: [],
  organizations: [],
  projects: [],
  tasks: [],
  comments: [],
  activities: [],
  notifications: [],
  preferences: {
    theme: 'dark',
    accentColor: '#0080fa',
    desktopNotificationsEnabled: true,
    hourlyRemindersEnabled: true,
    reminderIntervalMinutes: 60,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    soundEnabled: true,
    dockBadge: true,
  },
  session: {
    currentUserId: null,
    currentOrgId: null,
    rememberMe: false,
  },
};

export const DEMO_SEED_DATA: DatabaseSchema = INITIAL_SEED_DATA;
