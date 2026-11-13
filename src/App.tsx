/**
 * TaskFlow - Modern Apple Liquid Glass Desktop Task Management Application
 * Local-First Architecture with JSON file persistence & secure IPC bridge
 * 
 * Production Live Deployment:
 * // Live URL: https://app.drunall.com/taskflow
 * // Electron Download: https://app.drunall.com/taskflow/downloads/DN TaskFlow-Setup.exe
 */

import React, { useEffect } from 'react';
import { useTaskFlowStore } from './stores/useTaskFlowStore';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/layout/CommandPalette';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { TaskBoardView } from './components/tasks/TaskBoardView';
import { TaskListView } from './components/tasks/TaskListView';
import { TaskCalendarView } from './components/tasks/TaskCalendarView';
import { TaskDetailModal } from './components/tasks/TaskDetailModal';
import { TaskCreateView } from './components/tasks/TaskCreateView';
import { ProjectModal } from './components/projects/ProjectModal';
import { ProjectsView } from './components/projects/ProjectsView';
import { MembersView } from './components/members/MembersView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsModal } from './components/settings/SettingsModal';
import { AuthModal } from './components/auth/AuthModal';
import { LogsView } from './components/logs/LogsView';
import { SuperAdminView } from './components/admin/SuperAdminView';
import { DNLogo } from './components/common/DNLogo';
import { ConfirmModal } from './components/common/ConfirmModal';

const VALID_TABS = [
  'dashboard',
  'board',
  'all_tasks',
  'my_tasks',
  'overdue',
  'calendar',
  'projects',
  'members',
  'logs',
  'admin',
  'create_task',
];

export default function App() {
  const { isInitialized, initialize, activeTab, setActiveTab } = useTaskFlowStore();

  useEffect(() => {
    initialize();

    // 1. Initial Route Detection from Hash or LocalStorage
    if (typeof window !== 'undefined') {
      const parseHash = () => {
        const rawHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
        if (VALID_TABS.includes(rawHash)) {
          setActiveTab(rawHash as any);
        } else if (rawHash.includes('admin') || window.location.pathname.toLowerCase().endsWith('/admin')) {
          setActiveTab('admin');
        } else {
          const savedTab = localStorage.getItem('taskflow_active_tab');
          if (savedTab && VALID_TABS.includes(savedTab)) {
            setActiveTab(savedTab as any);
          }
        }
      };

      parseHash();

      const handleHashChange = () => parseHash();
      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, [initialize, setActiveTab]);

  // 2. Synchronize activeTab back to URL hash & localStorage on tab change
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTab) {
      localStorage.setItem('taskflow_active_tab', activeTab);
      const currentHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
      if (currentHash !== activeTab) {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    }
  }, [activeTab]);

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F7F9FB] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 select-none">
        <div className="flex flex-col items-center gap-4">
          <DNLogo variant="full" size="md" />
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium tracking-normal mt-2">
            <div className="w-3.5 h-3.5 border-2 border-[#0080fa]/20 border-t-[#0080fa] rounded-full animate-spin" />
            <span>Loading workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F7F9FB] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden font-sans select-none antialiased transition-colors duration-200">
      {/* Native Apple Liquid Glass TitleBar */}
      <TitleBar />

      {/* Main Desktop Window Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Translucent Sidebar */}
        <Sidebar />

        {/* Central Workspace Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F7F9FB]/80 dark:bg-slate-950/40">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'board' && <TaskBoardView />}
          {activeTab === 'all_tasks' && <TaskListView filterMode="all" />}
          {activeTab === 'my_tasks' && <TaskListView filterMode="my" />}
          {activeTab === 'overdue' && <TaskListView filterMode="overdue" />}
          {activeTab === 'calendar' && <TaskCalendarView />}
          {activeTab === 'projects' && <ProjectsView />}
          {activeTab === 'members' && <MembersView />}
          {activeTab === 'logs' && <LogsView />}
          {activeTab === 'admin' && <SuperAdminView />}
          {activeTab === 'create_task' && <TaskCreateView />}
        </main>
      </div>

      {/* Modals & Overlays */}
      <TaskDetailModal />
      <ProjectModal />
      <SettingsModal />
      <NotificationDrawer />
      <CommandPalette />
      <AuthModal />
      <ConfirmModal />
    </div>
  );
}
