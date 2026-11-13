import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { ProjectStatus } from '../../types';
import { Check } from 'lucide-react';

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#3b82f6', // Blue
];

export const ProjectModal: React.FC = () => {
  const {
    isCreateProjectOpen,
    setCreateProjectOpen,
    editingProject,
    setEditingProject,
    createProject,
    updateProject,
    currentOrgId,
    currentUserId,
    users,
    organizations,
  } = useTaskFlowStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [icon, setIcon] = useState('Layers');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    currentUserId ? [currentUserId] : []
  );

  React.useEffect(() => {
    if (editingProject) {
      setName(editingProject.name);
      setDescription(editingProject.description || '');
      setColor(editingProject.color || COLOR_PRESETS[0]);
      setIcon(editingProject.icon || 'Layers');
      setStartDate(editingProject.startDate ? editingProject.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setDueDate(editingProject.dueDate ? editingProject.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setSelectedMemberIds(editingProject.memberIds || []);
    } else {
      setName('');
      setDescription('');
      setColor(COLOR_PRESETS[0]);
      setIcon('Layers');
      setStartDate(new Date().toISOString().slice(0, 10));
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().slice(0, 10));
      setSelectedMemberIds(currentUserId ? [currentUserId] : []);
    }
  }, [editingProject, isCreateProjectOpen, currentUserId]);

  if (!isCreateProjectOpen) return null;

  const currentOrg = organizations.find((o) => o.id === currentOrgId);
  const orgMembers = users.filter((u) => currentOrg?.members.some((m) => m.userId === u.id));

  const handleToggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleClose = () => {
    setCreateProjectOpen(false);
    setEditingProject(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProject) {
      await updateProject(editingProject.id, {
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
        memberIds: selectedMemberIds,
        startDate,
        dueDate,
      });
    } else {
      await createProject({
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
        ownerId: currentUserId || 'usr_unknown',
        memberIds: selectedMemberIds,
        startDate,
        dueDate,
        status: 'active',
      });
    }

    handleClose();
  };

  return (
    <Modal
      isOpen={isCreateProjectOpen}
      onClose={handleClose}
      title={editingProject ? 'Edit Project' : 'Create New Project'}
      description={
        editingProject
          ? 'Update project details, timelines, and team member assignments.'
          : 'Projects organize tasks, milestones, and team members into dedicated workspaces.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Name */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
            Project Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mobile Client Redesign"
            required
            autoFocus
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Color presets */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
            Project Theme Color
          </label>
          <div className="flex items-center gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xs"
                style={{ backgroundColor: c }}
              >
                {color === c && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2.5}
            placeholder="Project goals, milestones, roadmap..."
            className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />
        </div>

        {/* Timeline */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Target Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 outline-none font-mono"
            />
          </div>
        </div>

        {/* Project Members */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1.5">
            Assign Project Members
          </label>
          <div className="flex flex-wrap gap-2">
            {orgMembers.map((m) => {
              const isSelected = selectedMemberIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleToggleMember(m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
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

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setCreateProjectOpen(false)}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-sm transition-all"
          >
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  );
};
