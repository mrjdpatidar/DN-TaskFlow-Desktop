/**
 * Electron Main Process - Persistent Background Reminder Scheduler
 * Proactively checks pending tasks and fires native OS notifications
 * even when the window is closed/minimized to tray, respecting quiet hours.
 */

import { DatabaseSchema, Task } from '../src/types';

export class DesktopReminderScheduler {
  private timer: NodeJS.Timeout | null = null;
  private onSendNotification: (title: string, message: string, taskId?: string) => void;
  private getDatabase: () => DatabaseSchema;
  private lastNotifiedMap = new Map<string, number>();

  constructor(
    getDatabase: () => DatabaseSchema,
    onSendNotification: (title: string, message: string, taskId?: string) => void
  ) {
    this.getDatabase = getDatabase;
    this.onSendNotification = onSendNotification;
  }

  public start() {
    this.stop();
    // Run an initial check after 3 seconds
    setTimeout(() => this.checkPendingReminders(), 3000);
    // Recurring check every 60 seconds (1 minute) for responsive alerts
    this.timer = setInterval(() => {
      this.checkPendingReminders();
    }, 60 * 1000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public isQuietHours(start: string, end: string): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (start || '22:00').split(':').map(Number);
    const [endH, endM] = (end || '08:00').split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal <= endTotal) {
      return currentMinutes >= startTotal && currentMinutes <= endTotal;
    } else {
      // Over midnight (e.g. 22:00 to 08:00)
      return currentMinutes >= startTotal || currentMinutes <= endTotal;
    }
  }

  public checkPendingReminders() {
    let db: DatabaseSchema;
    try {
      db = this.getDatabase();
    } catch (err) {
      console.warn('[Scheduler] Error reading database:', err);
      return;
    }

    if (!db) return;

    // Check master desktop notification switch
    const desktopEnabled = db.preferences?.desktopNotificationsEnabled ?? true;
    if (!desktopEnabled) return;

    // Default to true if not explicitly disabled
    const hourlyEnabled = db.preferences?.hourlyRemindersEnabled ?? true;
    if (!hourlyEnabled) return;

    if (db.preferences?.quietHoursEnabled) {
      if (this.isQuietHours(db.preferences.quietHoursStart, db.preferences.quietHoursEnd)) {
        return; // Suppressed during quiet hours
      }
    }

    const currentUserId = db.session?.currentUserId;
    const now = new Date();
    const nowMs = now.getTime();
    const ONE_HOUR_MS = 60 * 60 * 1000;

    // Find all incomplete tasks with reminders enabled
    const pendingTasks = (db.tasks || []).filter((t: Task) => {
      if (t.isArchived || t.status === 'completed' || t.status === 'cancelled') return false;
      if (t.remindersEnabled === false) return false;
      // If current user is logged in, filter for assigned tasks
      if (currentUserId && Array.isArray(t.assignedTo) && t.assignedTo.length > 0) {
        return t.assignedTo.includes(currentUserId);
      }
      return true;
    });

    for (const task of pendingTasks) {
      if (!task.dueDate) continue;
      const dueDate = new Date(task.dueDate);
      if (isNaN(dueDate.getTime())) continue;

      const diffHours = (dueDate.getTime() - nowMs) / (1000 * 60 * 60);

      // Throttling key to avoid spamming: notify at most once per hour per task
      const lastSent = this.lastNotifiedMap.get(task.id) || 0;
      if (nowMs - lastSent < ONE_HOUR_MS) {
        continue;
      }

      if (diffHours < 0) {
        // Overdue task alert
        this.lastNotifiedMap.set(task.id, nowMs);
        this.onSendNotification(
          `⚠️ Overdue Task Alert: "${task.title}"`,
          `This task was due on ${dueDate.toLocaleDateString()}. Tap to view or update status.`,
          task.id
        );
      } else if (diffHours <= 24) {
        // Upcoming deadline alert within 24 hours
        this.lastNotifiedMap.set(task.id, nowMs);
        const hrs = Math.max(1, Math.round(diffHours));
        this.onSendNotification(
          `⏰ Upcoming Deadline: "${task.title}"`,
          `Due in ${hrs} hour${hrs === 1 ? '' : 's'}. Priority: ${(task.priority || 'medium').toUpperCase()}.`,
          task.id
        );
      }
    }
  }
}
