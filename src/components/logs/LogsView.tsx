import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Avatar } from '../common/Avatar';
import { useConfirmModal } from '../common/ConfirmModal';
import { ActivityAction } from '../../types';
import {
  Activity as ActivityIcon,
  Search,
  Filter,
  Download,
  Trash2,
  Calendar,
  Layers,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

export const LogsView: React.FC = () => {
  const { confirmAction } = useConfirmModal();
  const {
    activities,
    users,
    projects,
    tasks,
    organizations,
    currentOrgId,
    currentUserId,
    setActiveTaskId,
    clearAllLogs,
  } = useTaskFlowStore();

  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<ActivityAction | 'all'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');

  const currentOrg = organizations.find((o) => o.id === currentOrgId);
  const currentMember = currentOrg?.members?.find((m) => m.userId === currentUserId);
  const currentUser = users.find((u) => u.id === currentUserId);
  const isOrgAdminOrOwner = currentMember?.role === 'owner' || currentMember?.role === 'admin' || currentUser?.isSuperAdmin;

  // Task IDs assigned to or created by current user
  const myAssignedTaskIds = new Set(
    tasks
      .filter((t) => t.organizationId === currentOrgId && (t.assignedTo.includes(currentUserId || '') || t.creatorId === currentUserId))
      .map((t) => t.id)
  );

  // Filter activities for current organization with RBAC enforcement
  const orgActivities = activities.filter((a) => {
    if (a.organizationId !== currentOrgId) return false;
    if (isOrgAdminOrOwner) return true;
    // For regular members: ONLY their own actions OR actions on their assigned tasks
    return a.userId === currentUserId || (a.taskId && myAssignedTaskIds.has(a.taskId));
  });

  const filteredActivities = orgActivities.filter((act) => {
    if (selectedAction !== 'all' && act.action !== selectedAction) return false;
    if (selectedUserId !== 'all' && act.userId !== selectedUserId) return false;
    if (selectedProjectId !== 'all' && act.projectId !== selectedProjectId) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const user = users.find((u) => u.id === act.userId);
      const matchesText =
        act.details.toLowerCase().includes(q) ||
        (user && user.name.toLowerCase().includes(q)) ||
        (act.oldValue && act.oldValue.toLowerCase().includes(q)) ||
        (act.newValue && act.newValue.toLowerCase().includes(q));
      if (!matchesText) return false;
    }
    return true;
  });

  const getActionBadge = (action: ActivityAction) => {
    switch (action) {
      case 'created':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Created</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">Completed</span>;
      case 'status_changed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">Status</span>;
      case 'priority_changed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">Priority</span>;
      case 'assigned':
      case 'reassigned':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">Assigned</span>;
      case 'commented':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">Comment</span>;
      case 'archived':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">Archived</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">Activity</span>;
    }
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Details', 'Old Value', 'New Value', 'Task ID', 'Project ID'];
    const rows = filteredActivities.map((a) => {
      const user = users.find((u) => u.id === a.userId);
      return [
        `"${a.createdAt}"`,
        `"${user?.name || a.userId}"`,
        `"${a.action}"`,
        `"${a.details.replace(/"/g, '""')}"`,
        `"${(a.oldValue || '').replace(/"/g, '""')}"`,
        `"${(a.newValue || '').replace(/"/g, '""')}"`,
        `"${a.taskId || ''}"`,
        `"${a.projectId || ''}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taskflow-activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(filteredActivities, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taskflow-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Audit Logs & Activity History
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comprehensive audit trail of all task modifications, assignments, role updates, and workspace events.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl transition-colors font-medium text-xs border border-black/5 dark:border-white/5"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl transition-colors font-medium text-xs border border-black/5 dark:border-white/5"
            title="Download JSON log file"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-500" />
            <span>Export JSON</span>
          </button>

          {isOrgAdminOrOwner && filteredActivities.length > 0 && (
            <button
              onClick={() => {
                confirmAction({
                  title: 'Clear Activity Logs?',
                  message: 'Are you sure you want to permanently clear all activity and audit log records? This cannot be undone.',
                  confirmText: 'Clear History',
                  variant: 'danger',
                  onConfirm: () => clearAllLogs(),
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors font-medium text-xs border border-rose-500/20"
              title="Clear audit logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-4 shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search details or user..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Action Filter */}
        <div>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value as any)}
            className="w-full px-3 py-1.5 text-xs bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Action Types</option>
            <option value="created">Created</option>
            <option value="completed">Completed</option>
            <option value="status_changed">Status Changed</option>
            <option value="priority_changed">Priority Changed</option>
            <option value="assigned">Assigned</option>
            <option value="commented">Commented</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* User Filter */}
        <div>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Team Members</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project Filter */}
        <div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="flex-1 overflow-y-auto glass-panel rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5">
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <ActivityIcon className="w-10 h-10 stroke-1 text-slate-400/40 mb-2" />
            <p className="text-sm font-medium">No activity log entries found</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Events and changes will automatically appear here as tasks, projects, and comments are updated.
            </p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const user = users.find((u) => u.id === act.userId);
            const task = act.taskId ? tasks.find((t) => t.id === act.taskId) : null;
            const project = act.projectId ? projects.find((p) => p.id === act.projectId) : null;

            return (
              <div
                key={act.id}
                className="p-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors flex items-start justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar
                    name={user?.name || 'User'}
                    avatarUrl={user?.avatar}
                    avatarPreset={user?.avatarPreset}
                    size="sm"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {user?.name || 'Unknown User'}
                      </span>
                      {getActionBadge(act.action)}
                      {project && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          in <span className="font-medium text-slate-300">{project.name}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {act.details}
                    </p>

                    {(act.oldValue || act.newValue) && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded w-fit">
                        {act.oldValue && (
                          <span className="line-through text-slate-500">{act.oldValue}</span>
                        )}
                        {act.oldValue && act.newValue && <ArrowRight className="w-3 h-3 text-slate-500" />}
                        {act.newValue && (
                          <span className="text-emerald-500 font-semibold">{act.newValue}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono tabular-nums flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(act.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {task && (
                    <button
                      onClick={() => setActiveTaskId(task.id)}
                      className="text-[11px] text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 hover:underline"
                    >
                      <span>Open Task</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

