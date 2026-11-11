import React from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Avatar } from '../common/Avatar';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityIcon } from '../common/PriorityIcon';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Calendar,
  MessageSquare,
  Activity as ActivityIcon,
  ArrowRight,
  TrendingUp,
  Layers,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    tasks,
    projects,
    comments,
    activities,
    users,
    currentOrgId,
    currentUserId,
    setActiveTaskId,
    setActiveTab,
    selectProject,
  } = useTaskFlowStore();

  const orgTasks = tasks.filter((t) => t.organizationId === currentOrgId && !t.isArchived);
  const orgProjects = projects.filter((p) => p.organizationId === currentOrgId);
  const orgActivities = activities.filter((a) => a.organizationId === currentOrgId).slice(0, 8);
  const orgComments = comments.filter((c) => {
    const t = tasks.find((tk) => tk.id === c.taskId);
    return t && t.organizationId === currentOrgId;
  }).slice(0, 5);

  // Key Metrics
  const totalTasks = orgTasks.length;
  const completedTasks = orgTasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = orgTasks.filter((t) => {
    if (t.status === 'completed' || !t.dueDate) return false;
    return new Date(t.dueDate).getTime() < Date.now();
  }).length;
  const myAssignedTasks = orgTasks.filter((t) =>
    t.assignedTo.includes(currentUserId || '') && t.status !== 'completed'
  ).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Status Breakdown
  const statusCounts = {
    todo: orgTasks.filter((t) => t.status === 'todo').length,
    in_progress: orgTasks.filter((t) => t.status === 'in_progress').length,
    in_review: orgTasks.filter((t) => t.status === 'in_review').length,
    blocked: orgTasks.filter((t) => t.status === 'blocked').length,
    completed: completedTasks,
  };

  // Priority Breakdown
  const priorityCounts = {
    urgent: orgTasks.filter((t) => t.priority === 'urgent').length,
    high: orgTasks.filter((t) => t.priority === 'high').length,
    medium: orgTasks.filter((t) => t.priority === 'medium').length,
    low: orgTasks.filter((t) => t.priority === 'low').length,
  };

  // Upcoming Deadlines (within next 7 days and not completed)
  const nowTime = Date.now();
  const upcomingTasks = orgTasks
    .filter((t) => t.status !== 'completed' && t.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto select-none p-6 space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Workspace Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time analytics and task velocity calculated from local JSON storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('board')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors border border-black/5 dark:border-white/5"
          >
            <span>Open Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (Single-Elevation Depth, Zero-Pill) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel rounded-2xl p-4 border border-black/5 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium">Projects</span>
            <FolderKanban className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {orgProjects.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">active workspaces</div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-black/5 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium">Total Tasks</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {totalTasks}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">catalog items</div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-black/5 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {completedTasks}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{completionRate}% finished</div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-black/5 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium">In Progress</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
            {pendingTasks}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">in pipeline</div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-black/5 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium">Assigned to Me</span>
            <UserCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
            {myAssignedTasks}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">action items</div>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-black/5 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2">
            <span className="font-medium">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
            {overdueTasks}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">urgent followups</div>
        </div>
      </div>

      {/* Interactive Charts & Breakdowns (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status Distribution */}
        <div className="glass-panel rounded-2xl p-5 border border-black/5 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Task Status Distribution
            </h3>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {totalTasks} total
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { label: 'Completed', count: statusCounts.completed, color: 'bg-emerald-500' },
              { label: 'In Progress', count: statusCounts.in_progress, color: 'bg-blue-500' },
              { label: 'In Review', count: statusCounts.in_review, color: 'bg-amber-500' },
              { label: 'Blocked', count: statusCounts.blocked, color: 'bg-rose-500' },
              { label: 'To Do', count: statusCounts.todo, color: 'bg-slate-400' },
            ].map((item) => {
              const pct = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {item.label}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="glass-panel rounded-2xl p-5 border border-black/5 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Tasks By Priority Level
            </h3>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              Velocity check
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Urgent', count: priorityCounts.urgent, color: 'text-rose-500', bg: 'bg-rose-500/10' },
              { label: 'High', count: priorityCounts.high, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Medium', count: priorityCounts.medium, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Low', count: priorityCounts.low, color: 'text-slate-400', bg: 'bg-slate-500/10' },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-3 rounded-xl border border-black/5 dark:border-white/5 ${item.bg} flex flex-col justify-between`}
              >
                <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                <span className={`text-xl font-bold font-mono tabular-nums ${item.color}`}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>

          {/* Project Progress Summary */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Project Milestones
            </div>
            {orgProjects.slice(0, 3).map((p) => {
              const pTasks = orgTasks.filter((t) => t.projectId === p.id);
              const pDone = pTasks.filter((t) => t.status === 'completed').length;
              const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    selectProject(p.id);
                    setActiveTab('board');
                  }}
                  className="flex items-center justify-between text-xs cursor-pointer hover:text-indigo-500 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate max-w-[180px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] tabular-nums text-slate-400">
                    <span>{pDone}/{pTasks.length}</span>
                    <span className="w-8 text-right font-bold text-slate-800 dark:text-slate-200">
                      {pPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines & Recent Activities (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming Deadlines */}
        <div className="glass-panel rounded-2xl p-5 border border-black/5 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Upcoming Deadlines</span>
            </h3>
            <button
              onClick={() => setActiveTab('calendar')}
              className="text-[11px] text-indigo-500 hover:underline"
            >
              Full Calendar →
            </button>
          </div>

          <div className="divide-y divide-black/5 dark:divide-white/5 text-xs">
            {upcomingTasks.map((t) => {
              const isOverdue = new Date(t.dueDate).getTime() < nowTime;
              const project = projects.find((p) => p.id === t.projectId);

              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTaskId(t.id)}
                  className="py-2.5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate max-w-[280px]">
                    <PriorityIcon priority={t.priority} />
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {t.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[11px] font-mono tabular-nums ${
                        isOverdue ? 'text-rose-500 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <StatusBadge status={t.status} showIcon={false} />
                  </div>
                </div>
              );
            })}

            {upcomingTasks.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                No upcoming deadlines in this workspace.
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="glass-panel rounded-2xl p-5 border border-black/5 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <ActivityIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Recent Activity Stream</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Audit trail</span>
          </div>

          <div className="relative pl-3 border-l border-black/10 dark:border-white/10 space-y-3 text-xs">
            {orgActivities.map((act) => {
              const u = users.find((user) => user.id === act.userId);
              return (
                <div key={act.id} className="relative flex items-center justify-between">
                  <span className="absolute -left-[19px] w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#0b0f19]" />
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate max-w-[280px]">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {u?.name || 'User'}
                    </span>
                    <span className="truncate">{act.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {orgActivities.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                No recent activity recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
