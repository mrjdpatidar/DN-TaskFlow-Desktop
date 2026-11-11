/**
 * TaskFlow Desktop - Modern Apple Liquid Glass Desktop Task Management Application
 * Local-First Architecture with JSON file persistence & secure IPC bridge
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
import { TaskCreateModal } from './components/tasks/TaskCreateModal';
import { ProjectModal } from './components/projects/ProjectModal';
import { ProjectsView } from './components/projects/ProjectsView';
import { MembersView } from './components/members/MembersView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsModal } from './components/settings/SettingsModal';
import { AuthModal } from './components/auth/AuthModal';

export default function App() {
  const { isInitialized, initialize, activeTab, currentUserId } = useTaskFlowStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0b0f19] text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-lg animate-pulse">
          TF
        </div>
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Booting TaskFlow Desktop Local Storage Engine...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden font-sans select-none antialiased transition-colors duration-200">
      {/* Native Apple Liquid Glass TitleBar */}
      <TitleBar />

      {/* Main Desktop Window Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Translucent Sidebar */}
        <Sidebar />

        {/* Central Workspace Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-white/40 dark:bg-slate-950/40">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'board' && <TaskBoardView />}
          {activeTab === 'all_tasks' && <TaskListView filterMode="all" />}
          {activeTab === 'my_tasks' && <TaskListView filterMode="my" />}
          {activeTab === 'overdue' && <TaskListView filterMode="overdue" />}
          {activeTab === 'calendar' && <TaskCalendarView />}
          {activeTab === 'projects' && <ProjectsView />}
          {activeTab === 'members' && <MembersView />}
        </main>
      </div>

      {/* Modals & Overlays */}
      <TaskDetailModal />
      <TaskCreateModal />
      <ProjectModal />
      <SettingsModal />
      <NotificationDrawer />
      <CommandPalette />
      <AuthModal />
    </div>
  );
}
