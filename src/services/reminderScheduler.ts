/**
 * Client-Side Reminder & Notification Scheduler
 * Coordinates with IPC bridge to deliver hourly desktop notifications,
 * checks overdue/upcoming deadlines, and respects quiet hours.
 */

import { Task, UserPreferences } from '../types';
import { ipcBridge } from './ipcBridge';

export class AppReminderScheduler {
  private static instance: AppReminderScheduler;
  private intervalId: number | null = null;
  private lastNotifiedTasks = new Set<string>();

  private constructor() {}

  public static getInstance(): AppReminderScheduler {
    if (!AppReminderScheduler.instance) {
      AppReminderScheduler.instance = new AppReminderScheduler();
    }
    return AppReminderScheduler.instance;
  }

  public isQuietHours(preferences: UserPreferences): boolean {
    if (!preferences.quietHoursEnabled) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (preferences.quietHoursStart || '22:00').split(':').map(Number);
    const [endH, endM] = (preferences.quietHoursEnd || '08:00').split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (startTotal <= endTotal) {
      return currentMins >= startTotal && currentMins <= endTotal;
    }
    return currentMins >= startTotal || currentMins <= endTotal;
  }

  public checkTasks(
    tasks: Task[],
    currentUserId: string,
    preferences: UserPreferences,
    onAddNotification?: (title: string, message: string, taskId: string, type: 'deadline' | 'overdue' | 'hourly_reminder') => void
  ) {
    if (!preferences.hourlyRemindersEnabled) return;
    if (this.isQuietHours(preferences)) return;

    const now = new Date();

    const assignedPending = tasks.filter(t => 
      !t.isArchived && 
      t.status !== 'completed' && 
      t.remindersEnabled && 
      t.assignedTo.includes(currentUserId)
    );

    for (const task of assignedPending) {
      if (!task.dueDate) continue;
      const dueDate = new Date(task.dueDate);
      const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Notification key for throttling within same hour
      const throttleKey = `${task.id}_${Math.floor(now.getTime() / (60 * 60 * 1000))}`;
      if (this.lastNotifiedTasks.has(throttleKey)) continue;

      if (diffHours < 0) {
        // Overdue!
        const title = `⚠️ Overdue Task Alert`;
        const message = `"${task.title}" is overdue (${dueDate.toLocaleDateString()}). Please update status.`;
        ipcBridge.notifications.send({ title, message, taskId: task.id });
        onAddNotification?.(title, message, task.id, 'overdue');
        this.lastNotifiedTasks.add(throttleKey);
      } else if (diffHours <= 24) {
        // Approaching deadline!
        const hrs = Math.max(1, Math.round(diffHours));
        const title = `⏰ Deadline Approaching`;
        const message = `"${task.title}" is due in ${hrs} hour${hrs === 1 ? '' : 's'}.`;
        ipcBridge.notifications.send({ title, message, taskId: task.id });
        onAddNotification?.(title, message, task.id, 'deadline');
        this.lastNotifiedTasks.add(throttleKey);
      }
    }
  }

  public start(
    getTasks: () => Task[],
    getCurrentUserId: () => string | null,
    getPreferences: () => UserPreferences,
    onAddNotification?: (title: string, message: string, taskId: string, type: 'deadline' | 'overdue' | 'hourly_reminder') => void
  ) {
    this.stop();
    // Run initial pass after 4 seconds
    setTimeout(() => {
      const uid = getCurrentUserId();
      if (uid) {
        this.checkTasks(getTasks(), uid, getPreferences(), onAddNotification);
      }
    }, 4000);

    // Run every 60 seconds to check if hour has ticked or reminders needed
    this.intervalId = window.setInterval(() => {
      const uid = getCurrentUserId();
      if (uid) {
        this.checkTasks(getTasks(), uid, getPreferences(), onAddNotification);
      }
    }, 60000);
  }

  public stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const reminderScheduler = AppReminderScheduler.getInstance();
