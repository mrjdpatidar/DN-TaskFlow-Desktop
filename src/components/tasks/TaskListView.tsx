import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityIcon } from '../common/PriorityIcon';
import { Avatar } from '../common/Avatar';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Calendar,
  Clock,
  Paperclip,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const TaskListView: React.FC<{ filterMode?: 'all' | 'my' | 'overdue' }> = ({
  filterMode = 'all',
}) => {
  const {
    tasks,
    projects,
    users,
    currentOrgId,
    currentUserId,
    selectedProjectId,
    setActiveTaskId,
    setCreateTaskOpen,
    updateTaskStatus,
    deleteTask,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder,
  } = useTaskFlowStore();

  const orgTasks = tasks.filter((t) => {
    if (t.organizationId !== currentOrgId || t.isArchived) return false;
    if (selectedProjectId && t.projectId !== selectedProjectId) return false;

    // Filter mode variations
    if (filterMode === 'my' && !t.assignedTo.includes(currentUserId || '')) return false;
    if (filterMode === 'overdue') {
      if (t.status === 'completed' || !t.dueDate) return false;
      if (new Date(t.dueDate).getTime() >= Date.now()) return false;
    }

    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchLabel = t.labels.some((l) => l.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchLabel) return false;
    }
    return true;
  });

  // Sorting
  const sortedTasks = [...orgTasks].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'dueDate') {
      comp = new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
    } else if (sortBy === 'priority') {
      const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
      comp = (weight[b.priority] || 0) - (weight[a.priority] || 0);
    } else if (sortBy === 'title') {
      comp = a.title.localeCompare(b.title);
    } else if (sortBy === 'created') {
      comp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* Search & Filter Strip */}
      <div className="px-6 py-3 border-b border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl outline-none placeholder:text-slate-400 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {filterMode === 'all' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          )}

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl outline-none text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={toggleSortOrder}
            title="Toggle sort direction"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="capitalize">{sortBy} ({sortOrder})</span>
          </button>

          <button
            onClick={() => setCreateTaskOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Dense Data Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="glass-panel rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4 w-10">Done</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Priority</th>
                <th className="py-2.5 px-4">Task Title</th>
                <th className="py-2.5 px-4">Project</th>
                <th className="py-2.5 px-4">Assignees</th>
                <th className="py-2.5 px-4">Due Date</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {sortedTasks.map((task) => {
                const project = projects.find((p) => p.id === task.projectId);
                const assignees = users.filter((u) => task.assignedTo.includes(u.id));
                const isOverdue =
                  task.dueDate &&
                  task.status !== 'completed' &&
                  new Date(task.dueDate).getTime() < Date.now();

                return (
                  <tr
                    key={task.id}
                    onClick={() => setActiveTaskId(task.id)}
                    className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    {/* Quick check toggle */}
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() =>
                          updateTaskStatus(
                            task.id,
                            task.status === 'completed' ? 'in_progress' : 'completed'
                          )
                        }
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          task.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-600 text-white'
                            : 'border-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={task.status} />
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      <PriorityIcon priority={task.priority} showLabel />
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {task.title}
                      </div>
                      {task.labels.length > 0 && (
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {task.labels.join(' · ')}
                        </div>
                      )}
                    </td>

                    {/* Project */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {project ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {project.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Assignees */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {assignees.map((u) => (
                          <Avatar
                            key={u.id}
                            name={u.name}
                            avatarUrl={u.avatar}
                            size="xs"
                          />
                        ))}
                        {assignees.length === 0 && (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                      {task.dueDate ? (
                        <div
                          className={`flex items-center gap-1.5 ${
                            isOverdue ? 'text-rose-500 font-semibold' : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => deleteTask(task.id)}
                        title="Delete Task"
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    No tasks found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
