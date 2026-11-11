import React from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { reminderScheduler } from '../../services/reminderScheduler';
import {
  Bell,
  X,
  CheckCheck,
  Clock,
  AlertTriangle,
  MessageSquare,
  UserCheck,
  CheckCircle2,
  Trash2,
  Play,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationDrawer: React.FC = () => {
  const {
    isNotificationDrawerOpen,
    setNotificationDrawerOpen,
    notifications,
    currentUserId,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    setActiveTaskId,
    tasks,
    preferences,
    addNotification,
  } = useTaskFlowStore();

  if (!isNotificationDrawerOpen) return null;

  const userNotifications = notifications.filter((n) => n.userId === currentUserId);
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'deadline':
      case 'overdue':
      case 'hourly_reminder':
        return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'assignment':
        return <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />;
      case 'comment':
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const handleTestHourlyReminder = () => {
    if (currentUserId) {
      reminderScheduler.checkTasks(tasks, currentUserId, preferences, (title, message, taskId, type) => {
        addNotification(title, message, taskId, type);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setNotificationDrawerOpen(false)}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-sm h-full glass-panel bg-white/95 dark:bg-slate-900/95 border-l border-black/5 dark:border-white/10 flex flex-col z-10 shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Desktop Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={() => setNotificationDrawerOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hourly Reminder Test Banner */}
        <div className="px-4 py-2.5 bg-indigo-500/5 border-b border-indigo-500/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
            <Clock className="w-3.5 h-3.5" />
            <span>Hourly Scheduler: {preferences.hourlyRemindersEnabled ? 'Active' : 'Disabled'}</span>
          </div>
          <button
            onClick={handleTestHourlyReminder}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-all active:scale-95"
            title="Trigger an immediate reminder scan for pending tasks"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Test Reminders</span>
          </button>
        </div>

        {/* Action Bar */}
        {userNotifications.length > 0 && (
          <div className="px-5 py-2 flex items-center justify-between text-xs text-slate-500 border-b border-black/5 dark:border-white/5">
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="flex items-center gap-1 hover:text-indigo-500 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
            <span className="text-[11px] opacity-75">
              {userNotifications.length} alerts
            </span>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {userNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                markNotificationAsRead(notif.id);
                if (notif.taskId) {
                  setActiveTaskId(notif.taskId);
                  setNotificationDrawerOpen(false);
                }
              }}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                notif.read
                  ? 'bg-transparent border-black/5 dark:border-white/5 opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                  : 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20 shadow-xs hover:border-indigo-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                  {getIcon(notif.type)}
                  <span>{notif.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(notif.id);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <p className="mt-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                {notif.message}
              </p>

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span className="tabular-nums">
                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {notif.taskId && (
                  <span className="text-indigo-500 dark:text-indigo-400 font-medium hover:underline">
                    View Task →
                  </span>
                )}
              </div>
            </div>
          ))}

          {userNotifications.length === 0 && (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto opacity-30 text-emerald-500" />
              <p className="font-medium text-slate-600 dark:text-slate-300">
                You are all caught up!
              </p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                Task assignments, replies, and hourly reminders will appear here.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
