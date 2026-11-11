/**
 * Electron Main Process - Persistent Hourly Reminder Scheduler
 * Checks active pending tasks and fires OS notifications respecting quiet hours.
 */

import { DatabaseSchema, Task } from '../src/types';

export class DesktopReminderScheduler {
  private timer: NodeJS.Timeout | null = null;
  private onSendNotification: (title: string, message: string, taskId?: string) => void;
  private getDatabase: () => DatabaseSchema;

  constructor(
    getDatabase: () => DatabaseSchema,
    onSendNotification: (title: string, message: string, taskId?: string) => void
  ) {
    this.getDatabase = getDatabase;
    this.onSendNotification = onSendNotification;
  }

  public start() {
    this.stop();
    // Run an initial check after 5 seconds
    setTimeout(() => this.checkPendingReminders(), 5000);
    // Recurring 1-hour interval (or user configured interval)
    this.timer = setInterval(() => {
      this.checkPendingReminders();
    }, 60 * 60 * 1000);
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

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
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
    const db = this.getDatabase();
    if (!db || !db.preferences?.hourlyRemindersEnabled) return;

    if (db.preferences.quietHoursEnabled) {
      if (this.isQuietHours(db.preferences.quietHoursStart, db.preferences.quietHoursEnd)) {
        return; // Suppressed during quiet hours
      }
    }

    const currentUserId = db.session?.currentUserId;
    if (!currentUserId) return;

    const now = new Date();

    // Find all incomplete tasks assigned to current user with reminders enabled
    const pendingTasks = db.tasks.filter((t: Task) => {
      if (t.isArchived || t.status === 'completed') return false;
      if (!t.remindersEnabled) return false;
      return t.assignedTo.includes(currentUserId);
    });

    for (const task of pendingTasks) {
      const dueDate = new Date(task.dueDate);
      const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 0) {
        // Overdue
        this.onSendNotification(
          `Overdue Task Alert: "${task.title}"`,
          `This task was due ${dueDate.toLocaleDateString()}. Tap to update status.`,
          task.id
        );
      } else if (diffHours <= 24) {
        // Approaching deadline
        this.onSendNotification(
          `Upcoming Deadline: "${task.title}"`,
          `Due in ${Math.max(1, Math.round(diffHours))} hours. Status: ${task.status.replace('_', ' ')}.`,
          task.id
        );
      }
    }
  }
}
