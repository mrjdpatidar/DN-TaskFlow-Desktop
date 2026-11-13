import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { ipcBridge } from '../../services/ipcBridge';
import { Avatar } from '../common/Avatar';
import { DNLogo, OrgLogo } from '../common/DNLogo';
import {
  Search,
  Bell,
  Plus,
  Moon,
  Sun,
  Shield,
  Clock,
  Sparkles,
  ChevronDown,
  UserCheck,
  LogOut,
  Settings,
  HardDrive,
  Users,
  Camera,
  RotateCw,
} from 'lucide-react';

export const TitleBar: React.FC = () => {
  const {
    currentUserId,
    currentOrgId,
    selectedProjectId,
    activeTab,
    users,
    organizations,
    projects,
    notifications,
    preferences,
    setCommandPaletteOpen,
    setNotificationDrawerOpen,
    setCreateTaskOpen,
    setSettingsOpen,
    setSwitchUserModalOpen,
    toggleTheme,
    syncWithServer,
    logout,
  } = useTaskFlowStore();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await syncWithServer();
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const currentUser = users.find((u) => u.id === currentUserId);
  const currentOrg = organizations.find((o) => o.id === currentOrgId);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const unreadCount = notifications.filter((n) => !n.read && n.userId === currentUserId).length;

  const handleMinimize = () => ipcBridge.window.minimize();
  const handleMaximize = () => ipcBridge.window.maximize();
  const handleClose = () => ipcBridge.window.close();

  const getBreadcrumbTitle = () => {
    if (selectedProject) return selectedProject.name;
    switch (activeTab) {
      case 'dashboard':
        return 'Overview';
      case 'my_tasks':
        return 'My Tasks';
      case 'board':
        return 'Board';
      case 'all_tasks':
        return 'All Tasks';
      case 'calendar':
        return 'Calendar';
      case 'overdue':
        return 'Overdue';
      case 'projects':
        return 'Projects';
      case 'members':
        return 'Members';
      case 'logs':
        return 'Activity Logs';
      case 'create_task':
        return 'New Task';
      case 'admin':
        return 'SuperAdmin';
      case 'settings':
        return 'Settings';
      default:
        return 'Workspace';
    }
  };

  return (
    <header className="h-12 w-full glass-panel-subtle border-b border-black/5 dark:border-white/5 flex items-center justify-between px-3 sm:px-4 shrink-0 select-none z-30 transition-colors">
      {/* Left: macOS Traffic Lights + Breadcrumb Trail */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-1.5 group pr-1">
          <button
            onClick={handleClose}
            aria-label="Close Window"
            className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 border border-rose-600/30 transition-transform active:scale-90"
          />
          <button
            onClick={handleMinimize}
            aria-label="Minimize Window"
            className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 border border-amber-600/30 transition-transform active:scale-90"
          />
          <button
            onClick={handleMaximize}
            aria-label="Zoom Window"
            className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 border border-emerald-600/30 transition-transform active:scale-90"
          />
        </div>

        {/* Clean Breadcrumb Hierarchy */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="hidden sm:flex items-center pr-1 border-r border-black/10 dark:border-white/10">
            <DNLogo variant="full" size="xs" />
          </div>
          <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-200 font-semibold truncate max-w-[140px]">
            <OrgLogo name={currentOrg?.name} logo={currentOrg?.logo} size="xs" />
            <span className="truncate">{currentOrg?.name || 'Workspace'}</span>
          </span>
          <span className="opacity-40 font-mono">/</span>
          <span className="text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
            {getBreadcrumbTitle()}
          </span>
        </div>
      </div>

      {/* Center: Command Palette Search Bar */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-md px-4">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg border border-black/5 dark:border-white/5 transition-all shadow-inner"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 opacity-60" />
            <span>Search tasks, commands, or jump to...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/70 dark:bg-slate-800/80 border border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-300">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions, Notifications, Theme, User */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Create Task Button */}
        <button
          onClick={() => setCreateTaskOpen(true)}
          style={{ backgroundColor: preferences.accentColor || '#0080fa' }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 active:scale-95 rounded-lg shadow-sm transition-all whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Task</span>
        </button>

        {/* Refresh & Sync Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh & sync workspace with cloud"
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Dark/Light Mode"
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
        >
          {preferences.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setNotificationDrawerOpen(true)}
          title="Notifications & Reminders"
          className="relative p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0b0f19] animate-pulse" />
          )}
        </button>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Avatar
              name={currentUser?.name || 'User'}
              avatarUrl={currentUser?.avatar}
              avatarPreset={currentUser?.avatarPreset}
              size="sm"
            />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isProfileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl py-1.5 z-50 text-xs">
                <div className="px-3.5 py-2.5 border-b border-black/5 dark:border-white/5">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {currentUser?.name || 'Local User'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {currentUser?.email || 'user@taskflow.local'}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400">
                    <Shield className="w-3 h-3" />
                    <span>{currentUser?.title || 'Team Member'}</span>
                  </div>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setSettingsOpen(true, 'profile');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-500" />
                    <span>Change Profile Photo</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setSettingsOpen(true, 'profile');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setSwitchUserModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Switch Local User</span>
                  </button>

                  <div className="my-1 border-t border-black/5 dark:border-white/5" />

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
