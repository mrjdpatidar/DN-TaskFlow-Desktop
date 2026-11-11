import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { StatusBadge, getStatusConfig } from '../common/StatusBadge';
import { PriorityIcon } from '../common/PriorityIcon';
import { Avatar } from '../common/Avatar';
import {
  Plus,
  Calendar,
  MessageSquare,
  Paperclip,
  Clock,
  Filter,
  Search,
  ArrowUpDown,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react';

const COLUMNS: { id: TaskStatus; label: string; accentColor: string }[] = [
  { id: 'todo', label: 'To Do', accentColor: 'border-slate-400' },
  { id: 'in_progress', label: 'In Progress', accentColor: 'border-blue-500' },
  { id: 'in_review', label: 'In Review', accentColor: 'border-amber-500' },
  { id: 'blocked', label: 'Blocked', accentColor: 'border-rose-500' },
  { id: 'completed', label: 'Completed', accentColor: 'border-emerald-500' },
];

export const TaskBoardView: React.FC = () => {
  const {
    tasks,
    updateTaskStatus,
    currentOrgId,
    selectedProjectId,
    projects,
    users,
    setActiveTaskId,
    setCreateTaskOpen,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
  } = useTaskFlowStore();

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<TaskStatus | null>(null);

  // Filter tasks
  const orgTasks = tasks.filter((t) => {
    if (t.organizationId !== currentOrgId || t.isArchived) return false;
    if (selectedProjectId && t.projectId !== selectedProjectId) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'all' && !t.assignedTo.includes(assigneeFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchLabel = t.labels.some((l) => l.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchLabel) return false;
    }
    return true;
  });

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== columnId) {
      setActiveDropColumn(columnId);
    }
  };

  const handleDragLeave = () => {
    setActiveDropColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      updateTaskStatus(taskId, columnId);
    }
    setDraggingTaskId(null);
    setActiveDropColumn(null);
  };

  const orgMembers = users.filter((u) =>
    tasks.some((t) => t.organizationId === currentOrgId && t.assignedTo.includes(u.id))
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* Control Strip & Filters */}
      <div className="px-6 py-3 border-b border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks by name, label, or specs..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl outline-none placeholder:text-slate-400 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl outline-none text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>

          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl outline-none text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Assignees</option>
            {orgMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setCreateTaskOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns Canvas */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-5">
        {COLUMNS.map((col) => {
          const colTasks = orgTasks.filter((t) => t.status === col.id);
          const isOver = activeDropColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`w-72 shrink-0 flex flex-col rounded-2xl glass-panel-subtle transition-all duration-150 ${
                isOver
                  ? 'ring-2 ring-indigo-500/60 bg-indigo-500/5'
                  : 'border border-black/5 dark:border-white/5'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full border-2 ${col.accentColor}`} />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {col.label}
                  </h3>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => setCreateTaskOpen(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks List Container */}
              <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 min-h-[300px]">
                {colTasks.map((task) => {
                  const project = projects.find((p) => p.id === task.projectId);
                  const isDragging = draggingTaskId === task.id;
                  const assignees = users.filter((u) => task.assignedTo.includes(u.id));
                  const isOverdue =
                    task.dueDate &&
                    task.status !== 'completed' &&
                    new Date(task.dueDate).getTime() < Date.now();

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => setActiveTaskId(task.id)}
                      className={`group p-3 rounded-xl glass-panel bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all text-xs space-y-2.5 ${
                        isDragging ? 'opacity-40 scale-95' : 'opacity-100'
                      }`}
                    >
                      {/* Top: Project dot + Priority */}
                      <div className="flex items-center justify-between">
                        {project && (
                          <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                            <span className="text-[11px] font-medium text-slate-500 truncate">
                              {project.name}
                            </span>
                          </div>
                        )}
                        <PriorityIcon priority={task.priority} />
                      </div>

                      {/* Title */}
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug line-clamp-2">
                        {task.title}
                      </h4>

                      {/* Labels (Zero-Pill discipline: unboxed subtle text) */}
                      {task.labels.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          {task.labels.slice(0, 2).map((l, idx) => (
                            <React.Fragment key={l}>
                              <span>{l}</span>
                              {idx < Math.min(task.labels.length - 1, 1) && <span>·</span>}
                            </React.Fragment>
                          ))}
                          {task.labels.length > 2 && (
                            <span>+{task.labels.length - 2}</span>
                          )}
                        </div>
                      )}

                      {/* Bottom row: Due Date, Reminders icon, Assignees */}
                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          {task.dueDate && (
                            <div
                              className={`flex items-center gap-1 tabular-nums ${
                                isOverdue ? 'text-rose-500 font-semibold' : ''
                              }`}
                            >
                              {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}

                          {task.attachments.length > 0 && (
                            <div className="flex items-center gap-0.5" title="Attachments">
                              <Paperclip className="w-3 h-3" />
                              <span className="tabular-nums">{task.attachments.length}</span>
                            </div>
                          )}

                          {task.remindersEnabled && (
                            <span title="Hourly Reminder Active">
                              <Clock className="w-3 h-3 text-indigo-400" />
                            </span>
                          )}
                        </div>

                        {/* Assignee Avatars Cluster */}
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {assignees.map((u) => (
                            <Avatar
                              key={u.id}
                              name={u.name}
                              avatarUrl={u.avatar}
                              size="xs"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center text-[11px] text-slate-400 italic">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
