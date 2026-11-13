import React, { useState } from 'react';
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
  Volume2,
  VolumeX,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type NotificationFilter = 'all' | 'unread' | 'mentions' | 'due' | 'assignments' | 'system';

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
    updatePreferences,
    addNotification,
  } = useTaskFlowStore();

  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isNotificationDrawerOpen) return null;

  const userNotifications = notifications.filter((n) => n.userId === currentUserId);
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const filteredNotifications = userNotifications.filter((n) => {
    // Filter by category
    if (activeFilter === 'unread' && n.read) return false;
    if (activeFilter === 'mentions' && n.type !== 'comment' && n.type !== 'reply') return false;
    if (activeFilter === 'due' && n.type !== 'deadline' && n.type !== 'overdue' && n.type !== 'hourly_reminder') return false;
    if (activeFilter === 'assignments' && n.type !== 'assignment') return false;
    if (activeFilter === 'system' && n.type !== 'system') return false;

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'deadline':
      case 'overdue':
      case 'hourly_reminder':
        return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'assignment':
        return <UserCheck className="w-4 h-4 text-blue-500 shrink-0" />;
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

  const handleSendTestDesktopNotification = () => {
    addNotification(
      '🔔 Windows Desktop Alert Active',
      'DN TaskFlow notifications are working! Background alerts will appear even when minimized.',
      undefined,
      'system'
    );
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
        className="relative w-full max-w-md h-full glass-panel bg-white/95 dark:bg-slate-900/95 border-l border-black/5 dark:border-white/10 flex flex-col z-10 shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Notification Center
            </h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
              title={preferences.soundEnabled ? 'Mute notification sound' : 'Unmute notification sound'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {preferences.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
            </button>
            <button
              onClick={() => setNotificationDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-black/5 dark:border-white/5 space-y-2 bg-black/[0.01] dark:bg-white/[0.01]">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'assignments', label: 'Assigned' },
              { id: 'due', label: 'Due / Alerts' },
              { id: 'mentions', label: 'Comments' },
              { id: 'system', label: 'System' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as NotificationFilter)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeFilter === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Quick Bar */}
        <div className="px-5 py-2 border-b border-black/5 dark:border-white/5 flex items-center justify-between text-xs bg-black/[0.02] dark:bg-white/[0.02]">
          {userNotifications.length > 0 ? (
            <button
              onClick={markAllNotificationsAsRead}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">Desktop Alerts Active</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendTestDesktopNotification}
              className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 transition-colors font-medium"
              title="Test Windows desktop toast alert"
            >
              <Bell className="w-3 h-3" />
              <span>Test Alert</span>
            </button>
            <button
              onClick={handleTestHourlyReminder}
              className="flex items-center gap-1 text-[11px] text-amber-500 hover:text-amber-600 transition-colors font-medium"
              title="Check upcoming task reminders now"
            >
              <Play className="w-3 h-3" />
              <span>Scan Reminders</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-1">
                <Bell className="w-5 h-5 stroke-[1.5]" />
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">All caught up</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                No new notifications right now. We'll let you know when someone assigns a task, replies, or when a deadline approaches.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3.5 rounded-xl border text-xs transition-all relative group ${
                    notif.read
                      ? 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5'
                      : 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4
                          className={`font-semibold truncate ${
                            notif.read
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed break-words">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {notif.taskId && (
                          <button
                            onClick={() => {
                              setActiveTaskId(notif.taskId!);
                              markNotificationAsRead(notif.id);
                              setNotificationDrawerOpen(false);
                            }}
                            className="text-blue-500 hover:text-blue-400 font-semibold"
                          >
                            View Task →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.read && (
                      <button
                        onClick={() => markNotificationAsRead(notif.id)}
                        title="Mark as read"
                        className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => clearNotification(notif.id)}
                      title="Dismiss"
                      className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};
