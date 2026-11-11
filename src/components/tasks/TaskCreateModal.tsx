import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Modal } from '../common/Modal';
import { TaskPriority, TaskStatus } from '../../types';
import { Avatar } from '../common/Avatar';
import { Check, Plus, Clock, Tag } from 'lucide-react';

export const TaskCreateModal: React.FC = () => {
  const {
    isCreateTaskOpen,
    setCreateTaskOpen,
    createTask,
    projects,
    currentOrgId,
    selectedProjectId,
    users,
    organizations,
    currentUserId,
    setActiveTaskId,
  } = useTaskFlowStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(selectedProjectId || projects[0]?.id || '');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [assignedTo, setAssignedTo] = useState<string[]>(currentUserId ? [currentUserId] : []);
  const [labelsInput, setLabelsInput] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('4h');
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  if (!isCreateTaskOpen) return null;

  const orgProjects = projects.filter((p) => p.organizationId === currentOrgId);
  const currentOrg = organizations.find((o) => o.id === currentOrgId);
  const orgMembers = users.filter((u) => currentOrg?.members.some((m) => m.userId === u.id));

  const handleToggleAssignee = (userId: string) => {
    setAssignedTo((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    const labels = labelsInput
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const created = await createTask({
      projectId,
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      priority,
      status,
      dueDate,
      labels,
      estimatedTime,
      remindersEnabled,
      attachments: [],
    });

    setCreateTaskOpen(false);
    setActiveTaskId(created.id);

    // Reset form
    setTitle('');
    setDescription('');
    setLabelsInput('');
  };

  return (
    <Modal
      isOpen={isCreateTaskOpen}
      onClose={() => setCreateTaskOpen(false)}
      title="Create New Task"
      description="Add a task to your project workspace with deadline and team assignments."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Title */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
            Task Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement client-side notification reminders"
            required
            autoFocus
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Project & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Project *
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
            >
              {orgProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Due Date & Estimated Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Estimated Time
            </label>
            <input
              type="text"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              placeholder="e.g. 4h, 2d"
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>
        </div>

        {/* Assignees */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
            Assign To Team Members
          </label>
          <div className="flex flex-wrap gap-2">
            {orgMembers.map((m) => {
              const isSelected = assignedTo.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleToggleAssignee(m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  <Avatar name={m.name} avatarUrl={m.avatar} size="xs" />
                  <span>{m.name}</span>
                  {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Labels & Tags */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
            Labels (comma separated)
          </label>
          <input
            type="text"
            value={labelsInput}
            onChange={(e) => setLabelsInput(e.target.value)}
            placeholder="Frontend, UX, Priority"
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Provide context, acceptance criteria, or links..."
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />
        </div>

        {/* Reminders Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                Hourly Desktop Reminders
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Receive notifications every hour when deadline is near or overdue
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={remindersEnabled}
            onChange={(e) => setRemindersEnabled(e.target.checked)}
            className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setCreateTaskOpen(false)}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-sm transition-all"
          >
            Create Task
          </button>
        </div>
      </form>
    </Modal>
  );
};
