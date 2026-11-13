import React, { useState, useEffect } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import {
  Search,
  CheckSquare,
  FolderKanban,
  Plus,
  Moon,
  Sun,
  HardDrive,
  Users,
  Settings,
  Calendar,
  AlertCircle,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  Activity as ActivityIcon,
  ShieldAlert,
} from 'lucide-react';
import { PriorityIcon } from '../common/PriorityIcon';
import { StatusBadge } from '../common/StatusBadge';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    tasks,
    projects,
    currentOrgId,
    setActiveTaskId,
    setActiveTab,
    selectProject,
    setCreateTaskOpen,
    setCreateProjectOpen,
    setSettingsOpen,
    toggleTheme,
    exportDatabaseJSON,
  } = useTaskFlowStore();

  const [query, setQuery] = useState('');

  // Keyboard shortcut listener: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const orgTasks = tasks.filter((t) => t.organizationId === currentOrgId && !t.isArchived);
  const orgProjects = projects.filter((p) => p.organizationId === currentOrgId);

  const filteredTasks = query.trim()
    ? orgTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.description.toLowerCase().includes(query.toLowerCase()) ||
          t.labels.some((l) => l.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 6)
    : orgTasks.slice(0, 4);

  const filteredProjects = query.trim()
    ? orgProjects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : orgProjects.slice(0, 3);

  const actions = [
    {
      id: 'create_task',
      label: 'Create New Task',
      icon: Plus,
      action: () => {
        setCommandPaletteOpen(false);
        setCreateTaskOpen(true);
      },
    },
    {
      id: 'create_project',
      label: 'Create New Project',
      icon: FolderKanban,
      action: () => {
        setCommandPaletteOpen(false);
        setCreateProjectOpen(true);
      },
    },
    {
      id: 'toggle_theme',
      label: 'Toggle Dark / Light Theme',
      icon: Moon,
      action: () => {
        toggleTheme();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'view_logs',
      label: 'View Audit Logs & Activity History',
      icon: ActivityIcon,
      action: () => {
        selectProject(null);
        setActiveTab('logs');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'backup_json',
      label: 'Export Local JSON Database Backup',
      icon: HardDrive,
      action: async () => {
        const json = await exportDatabaseJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setCommandPaletteOpen(false);
      },
    },
  ];

  const filteredActions = query.trim()
    ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Palette Panel */}
      <div className="relative w-full max-w-xl glass-dropdown rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a task name, project, or command..."
            className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            autoFocus
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/5 dark:bg-white/10 text-slate-500">
            ESC
          </kbd>
        </div>

        <div className="p-2 max-h-96 overflow-y-auto space-y-3">
          {/* Tasks Results */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Tasks
              </div>
              <div className="space-y-0.5 mt-0.5">
                {filteredTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTaskId(t.id);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PriorityIcon priority={t.priority} />
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {t.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={t.status} showIcon={false} />
                      <ArrowRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Projects Results */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Projects
              </div>
              <div className="space-y-0.5 mt-0.5">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      selectProject(p.id);
                      setActiveTab('board');
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">Jump to board</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Commands & Shortcuts
              </div>
              <div className="space-y-0.5 mt-0.5">
                {filteredActions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={act.action}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredTasks.length === 0 && filteredProjects.length === 0 && filteredActions.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching tasks, projects, or commands found
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with mouse or arrow keys</span>
          <span>Press ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
};
