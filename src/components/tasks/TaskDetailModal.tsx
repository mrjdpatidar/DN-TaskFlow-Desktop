import React, { useState, useRef } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { TaskStatus, TaskPriority, TaskAttachment } from '../../types';
import { Avatar } from '../common/Avatar';
import { StatusBadge, getStatusConfig } from '../common/StatusBadge';
import { PriorityIcon, getPriorityConfig } from '../common/PriorityIcon';
import {
  X,
  Calendar,
  Clock,
  User,
  Tag,
  Paperclip,
  MessageSquare,
  History,
  Trash2,
  Copy,
  Archive,
  Send,
  CornerDownRight,
  Plus,
  FileText,
  FileArchive,
  Table as TableIcon,
  Image as ImageIcon,
  Check,
  ChevronDown,
  Download,
  Bold,
  Italic,
  List,
  Code,
  CheckSquare,
  Sparkles,
  Pencil,
  Smile,
  Ban,
  MessageCircle,
  Users,
  UserPlus,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useConfirmModal } from '../common/ConfirmModal';

export const TaskDetailModal: React.FC = () => {
  const {
    activeTaskId,
    setActiveTaskId,
    tasks,
    updateTask,
    updateTaskStatus,
    duplicateTask,
    archiveTask,
    deleteTask,
    addAttachment,
    removeAttachment,
    comments,
    addComment,
    editComment,
    deleteComment,
    toggleCommentReaction,
    activities,
    users,
    projects,
    currentUserId,
    currentOrgId,
    organizations,
  } = useTaskFlowStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentInput, setCommentInput] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);

  // Threading, copying, and reactions state
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set());
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);
  const [activeReactionPickerCommentId, setActiveReactionPickerCommentId] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');

  const { confirmAction } = useConfirmModal();

  const QUICK_REACTIONS = ['👍', '❤️', '🚀', '👀', '🎉', '🔥'];

  const toggleThread = (commentId: string) => {
    setExpandedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const handleCopyComment = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCommentId(id);
      setTimeout(() => setCopiedCommentId(null), 2000);
    }
  };

  // Mention auto-suggest
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  if (!activeTaskId) return null;
  const task = tasks.find((t) => t.id === activeTaskId);
  if (!task) return null;

  const project = projects.find((p) => p.id === task.projectId);
  const currentOrg = organizations.find((o) => o.id === currentOrgId);
  const currentMember = currentOrg?.members.find((m) => m.userId === currentUserId);
  const currentUser = users.find((u) => u.id === currentUserId);
  const isOwnerOrAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin' || currentUser?.isSuperAdmin;
  const isTaskOwner = task.createdBy === currentUserId;
  const canDeleteTask = isOwnerOrAdmin || isTaskOwner;
  const orgMembers = users.filter((u) => currentOrg?.members.some((m) => m.userId === u.id));
  const assignedUsers = users.filter((u) => task.assignedTo.includes(u.id));
  const taskComments = comments.filter((c) => c.taskId === task.id);
  const taskActivities = activities.filter((a) => a.taskId === task.id);

  // Root comments and replies
  const rootComments = taskComments.filter((c) => !c.parentId);

  const handleStatusChange = (status: TaskStatus) => {
    updateTaskStatus(task.id, status);
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    updateTask(task.id, { priority });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTask(task.id, { dueDate: e.target.value });
  };

  const handleAssigneeToggle = (userId: string) => {
    const isAssigned = task.assignedTo.includes(userId);
    const newAssigned = isAssigned
      ? task.assignedTo.filter((id) => id !== userId)
      : [...task.assignedTo, userId];
    updateTask(task.id, { assignedTo: newAssigned });
  };

  const handleRemoveAssignee = (userId: string) => {
    const newAssigned = task.assignedTo.filter((id) => id !== userId);
    updateTask(task.id, { assignedTo: newAssigned });
  };

  const handleAddAssignee = (userId: string) => {
    if (!task.assignedTo.includes(userId)) {
      updateTask(task.id, { assignedTo: [...task.assignedTo, userId] });
    }
  };

  const canManageAssignees = isOwnerOrAdmin || isTaskOwner;

  const handleSaveDescription = () => {
    updateTask(task.id, { description: descDraft });
    setIsEditingDesc(false);
  };

  const handleSaveTitle = () => {
    if (titleDraft.trim()) {
      updateTask(task.id, { title: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelInput.trim()) return;
    const label = newLabelInput.trim();
    if (!task.labels.includes(label)) {
      updateTask(task.id, { labels: [...task.labels, label] });
    }
    setNewLabelInput('');
    setIsAddingLabel(false);
  };

  const handleRemoveLabel = (label: string) => {
    updateTask(task.id, { labels: task.labels.filter((l) => l !== label) });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        addAttachment(task.id, {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    addComment(task.id, commentInput.trim());
    setCommentInput('');
    setMentionQuery(null);
  };

  const handleReplySubmit = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyInput.trim()) return;
    addComment(task.id, replyInput.trim(), parentId);
    setReplyInput('');
    setReplyingToId(null);
  };

  const handleInsertMention = (name: string, isReply = false) => {
    if (isReply) {
      setReplyInput((prev) => prev + `@${name} `);
    } else {
      setCommentInput((prev) => prev + `@${name} `);
    }
    setMentionQuery(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setActiveTaskId(null)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Detail Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full max-w-2xl h-full bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 shadow-2xl overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {project && (
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span>{project.name}</span>
              </span>
            )}
            <span>·</span>
            <span className="font-mono text-[11px] text-slate-400">
              {task.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isOwnerOrAdmin && (
              <>
                <button
                  onClick={() => duplicateTask(task.id)}
                  title="Duplicate Task"
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => archiveTask(task.id)}
                  title={task.isArchived ? 'Unarchive Task' : 'Archive Task'}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </>
            )}

            {canDeleteTask && (
              <button
                onClick={() => {
                  confirmAction({
                    title: `Delete Task "${task.title}"?`,
                    message: 'This task, its attachments, subtasks, and all discussion thread messages will be permanently deleted.',
                    confirmText: 'Delete Task',
                    variant: 'danger',
                    onConfirm: async () => {
                      await deleteTask(task.id);
                      setActiveTaskId(null);
                    },
                  });
                }}
                title="Delete Task"
                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-1" />

            <button
              onClick={() => setActiveTaskId(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-100/70 dark:bg-[#0b101b]">
          {/* Title */}
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs">
            {isEditingTitle && isOwnerOrAdmin ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="w-full text-lg font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-blue-500 pb-1 outline-none"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md"
                >
                  Save
                </button>
              </div>
            ) : (
              <h2
                onClick={() => {
                  if (isOwnerOrAdmin) {
                    setTitleDraft(task.title);
                    setIsEditingTitle(true);
                  }
                }}
                className={`text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug ${
                  isOwnerOrAdmin
                    ? 'hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors'
                    : 'cursor-default'
                }`}
              >
                {task.title}
              </h2>
            )}
            {!isOwnerOrAdmin && (
              <p className="text-[11px] text-slate-400 mt-1 italic">
                Protected task: Invited members can update status, attachments, and add comments.
              </p>
            )}
          </div>

          {/* Quick Properties Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 text-xs shadow-xs">
            {/* Status Selector - All 8 Statuses Available */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Status
              </span>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer focus:ring-1 focus:ring-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="in_review">Ready for Review</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="ready_for_deployment">Ready for Deployment</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Priority {!isOwnerOrAdmin && '(Admin only)'}
              </span>
              <select
                value={task.priority}
                disabled={!isOwnerOrAdmin}
                onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                className={`w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200 outline-none text-xs ${
                  !isOwnerOrAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Due Date {!isOwnerOrAdmin && '(Admin only)'}
              </span>
              <input
                type="date"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                disabled={!isOwnerOrAdmin}
                onChange={handleDueDateChange}
                className={`w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-200 outline-none text-xs font-mono ${
                  !isOwnerOrAdmin ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {/* Hourly Reminder Toggle */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Hourly Alert
              </span>
              <button
                onClick={() => updateTask(task.id, { remindersEnabled: !task.remindersEnabled })}
                className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  task.remindersEnabled
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{task.remindersEnabled ? 'Enabled' : 'Muted'}</span>
              </button>
            </div>
          </div>

          {/* Assignees */}
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>Assigned Team ({assignedUsers.length})</span>
              </span>
              {canManageAssignees && (
                <button
                  type="button"
                  onClick={() => setIsAssigneePickerOpen(!isAssigneePickerOpen)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAssigneePickerOpen ? 'Close Picker' : '+ Assign Member'}</span>
                </button>
              )}
            </div>

            {/* Currently Assigned Members Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {assignedUsers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 group"
                >
                  <Avatar
                    name={member.name}
                    avatarUrl={member.avatar}
                    avatarPreset={member.avatarPreset}
                    size="xs"
                  />
                  <span>{member.name}</span>
                  {canManageAssignees && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignee(member.id)}
                      title={`Remove ${member.name} from task`}
                      className="p-0.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {assignedUsers.length === 0 && (
                <p className="text-xs text-slate-400 italic py-1">No team members assigned to this task yet.</p>
              )}
            </div>

            {/* Interactive Assignee Picker Dropdown */}
            {isAssigneePickerOpen && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in duration-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={assigneeSearchQuery}
                    onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                    placeholder="Search workspace members by name or email..."
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {orgMembers
                    .filter((m) => {
                      if (!assigneeSearchQuery.trim()) return true;
                      const q = assigneeSearchQuery.toLowerCase();
                      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
                    })
                    .map((member) => {
                      const isAssigned = task.assignedTo.includes(member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            if (isAssigned) {
                              handleRemoveAssignee(member.id);
                            } else {
                              handleAddAssignee(member.id);
                            }
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                            isAssigned
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={member.name}
                              avatarUrl={member.avatar}
                              avatarPreset={member.avatarPreset}
                              size="xs"
                            />
                            <span>{member.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({member.email})</span>
                          </div>
                          {isAssigned ? (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Assigned
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Add
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span>Labels & Tags</span>
              </span>
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsAddingLabel(!isAddingLabel)}
                  className="text-[11px] text-blue-500 hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Label</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {task.labels.map((lbl) => (
                <span
                  key={lbl}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  <span>{lbl}</span>
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => handleRemoveLabel(lbl)}
                      className="hover:text-rose-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}

              {isAddingLabel && isOwnerOrAdmin && (
                <form onSubmit={handleAddLabel} className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    placeholder="Label name"
                    autoFocus
                    className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg shadow-xs"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Rich Description */}
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Description</span>
              </span>
              {!isEditingDesc && isOwnerOrAdmin && (
                <button
                  onClick={() => {
                    setDescDraft(task.description);
                    setIsEditingDesc(true);
                  }}
                  className="text-[11px] text-blue-500 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingDesc ? (
              <div className="space-y-2">
                {/* Formatting helper buttons */}
                <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-lg text-slate-600 dark:text-slate-300 text-xs">
                  <button
                    type="button"
                    onClick={() => setDescDraft((d) => d + ' **bold** ')}
                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescDraft((d) => d + ' *italic* ')}
                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescDraft((d) => d + '\n- Item ')}
                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescDraft((d) => d + '\n- [ ] Task checkbox ')}
                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                    title="Checklist"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescDraft((d) => d + ' `code` ')}
                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                    title="Inline Code"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  rows={5}
                  className="w-full p-3 text-xs bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200 font-sans leading-relaxed"
                  placeholder="Add details, acceptance criteria, markdown notes..."
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingDesc(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDescription}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  setDescDraft(task.description);
                  setIsEditingDesc(true);
                }}
                className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer hover:border-blue-500/30 transition-colors whitespace-pre-wrap"
              >
                {task.description || (
                  <span className="italic text-slate-400">
                    No description added yet. Click to write notes, checklist, or specs.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Media & Attachments */}
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                <span>Attachments ({task.attachments.length})</span>
              </span>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {task.attachments.map((att) => {
                const isImage = att.type.startsWith('image/');
                const ext = att.name.split('.').pop()?.toLowerCase();
                const isArchive = ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '');
                const isSpreadsheet = ['xlsx', 'xls', 'csv'].includes(ext || '');

                return (
                  <div
                    key={att.id}
                    className="group relative flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-colors text-xs"
                  >
                    <div
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                      onClick={() => isImage && setPreviewAttachmentUrl(att.url)}
                    >
                      {isImage ? (
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-800">
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : isArchive ? (
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <FileArchive className="w-4 h-4" />
                        </div>
                      ) : isSpreadsheet ? (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <TableIcon className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-500 transition-colors">
                          {att.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatFileSize(att.size)}
                          </span>
                          {att.messageTag && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-blue-500/10 text-blue-400 font-semibold truncate max-w-[120px]">
                              {att.messageTag}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {att.url && (
                        <a
                          href={att.url}
                          download={att.name}
                          title="Download"
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => removeAttachment(task.id, att.id)}
                        title="Delete attachment"
                        className="p-1 text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {task.attachments.length === 0 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="col-span-full border border-dashed border-black/10 dark:border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-blue-500/40 transition-colors text-xs text-slate-400"
                >
                  <Paperclip className="w-4 h-4 mx-auto mb-1 opacity-50" />
                  <span>Click or drag files here to upload attachments</span>
                </div>
              )}
            </div>
          </div>

          {/* Threaded Comments & @Mentions */}
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>Conversation ({taskComments.length})</span>
              </span>
            </div>

            {/* Comment Input */}
            <form onSubmit={handleCommentSubmit} className="space-y-2 mb-4">
              <div className="relative">
                <textarea
                  value={commentInput}
                  onChange={(e) => {
                    setCommentInput(e.target.value);
                    const match = e.target.value.match(/@([a-zA-Z0-9_]*)$/);
                    if (match) {
                      setMentionQuery(match[1].toLowerCase());
                    } else {
                      setMentionQuery(null);
                    }
                  }}
                  rows={2}
                  placeholder="Write a comment... use @name to mention colleagues"
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-blue-500"
                />

                {/* @Mention Suggestion popup */}
                {mentionQuery !== null && (
                  <div className="absolute bottom-full left-0 mb-1 w-52 bg-white dark:bg-slate-800 rounded-xl p-1 z-30 shadow-2xl border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="px-2 py-1 text-[10px] text-slate-400 uppercase font-semibold">
                      Mention Member
                    </div>
                    {orgMembers
                      .filter((m) => m.name.toLowerCase().includes(mentionQuery))
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleInsertMention(m.name, false)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left"
                        >
                          <Avatar name={m.name} avatarUrl={m.avatar} size="xs" />
                          <span className="truncate">{m.name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Mentions:</span>
                  {orgMembers.slice(0, 3).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleInsertMention(m.name, false)}
                      className="hover:text-blue-500 font-mono"
                    >
                      @{m.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl transition-all shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </div>
            </form>

            {/* Comments Stream with Threading */}
            <div className="space-y-3">
              {rootComments.map((c) => {
                const author = users.find((u) => u.id === c.userId);
                const isAuthorOrAdmin = c.userId === currentUserId || isOwnerOrAdmin;
                const isEditing = editingCommentId === c.id;
                const isCopied = copiedCommentId === c.id;
                const showReactionPicker = activeReactionPickerCommentId === c.id;
                const replies = taskComments.filter((reply) => reply.parentId === c.id);
                const isThreadExpanded = expandedThreadIds.has(c.id) || replyingToId === c.id;

                return (
                  <div
                    key={c.id}
                    className="group relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f172a]/80 p-3.5 text-xs space-y-2 transition-all shadow-xs"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          name={author?.name || 'User'}
                          avatarUrl={author?.avatar}
                          avatarPreset={author?.avatarPreset}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {author?.name || 'User'}
                            </span>
                            {c.userId === currentUserId && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-blue-500/10 text-blue-500">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <span className="tabular-nums">
                              {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {c.isEdited && !c.isDeleted && (
                              <span className="italic text-slate-400/90 font-medium">(edited)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Hover Action Toolbar (Copy, React, Reply, Edit, Delete) */}
                      {!c.isDeleted && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {/* Quick Emoji Reaction Trigger */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveReactionPickerCommentId(showReactionPicker ? null : c.id)
                              }
                              title="Add Reaction"
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>

                            {/* Emoji Picker Popup */}
                            {showReactionPicker && (
                              <div className="absolute right-0 bottom-full mb-1 flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30">
                                {QUICK_REACTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      toggleCommentReaction(c.id, emoji);
                                      setActiveReactionPickerCommentId(null);
                                    }}
                                    className="p-1 hover:scale-125 transition-transform text-sm"
                                    title={emoji}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Copy Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyComment(c.id, c.content)}
                            title="Copy message"
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Reply in thread */}
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(replyingToId === c.id ? null : c.id);
                              setExpandedThreadIds((prev) => new Set([...prev, c.id]));
                            }}
                            title="Reply in thread"
                            className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                          >
                            <CornerDownRight className="w-3 h-3" />
                            <span>Reply</span>
                          </button>

                          {/* Edit Button */}
                          {isAuthorOrAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(isEditing ? null : c.id);
                                setEditingCommentText(c.content);
                              }}
                              title="Edit message"
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {isAuthorOrAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                confirmAction({
                                  title: 'Delete Message?',
                                  message: 'Are you sure you want to delete this message? It will be marked as deleted in the discussion thread.',
                                  confirmText: 'Delete Message',
                                  variant: 'danger',
                                  onConfirm: () => deleteComment(c.id, false),
                                });
                              }}
                              title="Delete message"
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message Body */}
                    {c.isDeleted ? (
                      <div className="flex items-center gap-2 text-xs italic text-slate-400 dark:text-slate-500 pl-9 py-1 bg-black/5 dark:bg-white/5 rounded-lg">
                        <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>This message was deleted</span>
                      </div>
                    ) : isEditing ? (
                      <div className="pl-9 space-y-2 mt-2">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          rows={2}
                          className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200 focus:border-blue-500"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (editingCommentText.trim()) {
                                await editComment(c.id, editingCommentText.trim());
                                setEditingCommentId(null);
                              }
                            }}
                            className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 dark:text-slate-200 pl-9 whitespace-pre-wrap leading-relaxed text-xs">
                        {c.content}
                      </p>
                    )}

                    {/* Reactions Display */}
                    {!c.isDeleted && c.reactions && c.reactions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pl-9 pt-1">
                        {c.reactions.map((r) => {
                          const hasReacted = currentUserId && r.userIds.includes(currentUserId);
                          return (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() => toggleCommentReaction(c.id, r.emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border ${
                                hasReacted
                                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                              title={`${r.userIds.length} ${r.userIds.length === 1 ? 'reaction' : 'reactions'}`}
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[11px] font-mono">{r.userIds.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Thread Summary Pill for Root Comments */}
                    {replies.length > 0 && (
                      <div className="pl-9 pt-1.5 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleThread(c.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all border border-blue-500/20"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>
                            {replies.length} {replies.length === 1 ? 'reply in thread' : 'replies in thread'}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            {isThreadExpanded ? '▲ Hide thread' : '▼ View thread'}
                          </span>
                        </button>
                        <span className="text-[10px] text-slate-400">
                          Last reply {new Date(replies[replies.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Thread Replies List (Expanded) */}
                    {isThreadExpanded && (
                      <div className="ml-9 pl-3.5 border-l-2 border-blue-500/30 space-y-2.5 mt-2.5 pt-1">
                        {replies.map((reply) => {
                          const replyAuthor = users.find((u) => u.id === reply.userId);
                          const isReplyAuthorOrAdmin = reply.userId === currentUserId || isOwnerOrAdmin;
                          const isReplyEditing = editingCommentId === reply.id;
                          const isReplyCopied = copiedCommentId === reply.id;
                          const showReplyReactionPicker = activeReactionPickerCommentId === reply.id;

                          return (
                            <div
                              key={reply.id}
                              className="group relative rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#111827] p-3 text-xs space-y-1.5 transition-all shadow-xs"
                            >
                              {/* Reply Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar
                                    name={replyAuthor?.name || 'User'}
                                    avatarUrl={replyAuthor?.avatar}
                                    avatarPreset={replyAuthor?.avatarPreset}
                                    size="xs"
                                  />
                                  <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                      {replyAuthor?.name || 'User'}
                                    </span>
                                    {reply.userId === currentUserId && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-blue-500/10 text-blue-500">
                                        You
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 tabular-nums">
                                      {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {reply.isEdited && !reply.isDeleted && (
                                      <span className="italic text-slate-400/90 font-medium text-[10px]">(edited)</span>
                                    )}
                                  </div>
                                </div>

                                {/* Reply Hover Actions */}
                                {!reply.isDeleted && (
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    {/* Reaction */}
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveReactionPickerCommentId(showReplyReactionPicker ? null : reply.id)
                                        }
                                        title="Add Reaction"
                                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      >
                                        <Smile className="w-3 h-3" />
                                      </button>
                                      {showReplyReactionPicker && (
                                        <div className="absolute right-0 bottom-full mb-1 flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30">
                                          {QUICK_REACTIONS.map((emoji) => (
                                            <button
                                              key={emoji}
                                              type="button"
                                              onClick={() => {
                                                toggleCommentReaction(reply.id, emoji);
                                                setActiveReactionPickerCommentId(null);
                                              }}
                                              className="p-1 hover:scale-125 transition-transform text-xs"
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Copy */}
                                    <button
                                      type="button"
                                      onClick={() => handleCopyComment(reply.id, reply.content)}
                                      title="Copy message"
                                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                      {isReplyCopied ? (
                                        <Check className="w-3 h-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>

                                    {/* Edit */}
                                    {isReplyAuthorOrAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCommentId(isReplyEditing ? null : reply.id);
                                          setEditingCommentText(reply.content);
                                        }}
                                        title="Edit message"
                                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    )}

                                    {/* Delete */}
                                    {isReplyAuthorOrAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          confirmAction({
                                            title: 'Delete Reply?',
                                            message: 'Are you sure you want to delete this reply? It will be marked as deleted.',
                                            confirmText: 'Delete Reply',
                                            variant: 'danger',
                                            onConfirm: () => deleteComment(reply.id, false),
                                          });
                                        }}
                                        title="Delete message"
                                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Reply Body */}
                              {reply.isDeleted ? (
                                <div className="flex items-center gap-2 text-xs italic text-slate-400 dark:text-slate-500 pl-7 py-0.5">
                                  <Ban className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>This message was deleted</span>
                                </div>
                              ) : isReplyEditing ? (
                                <div className="pl-7 space-y-1.5 mt-1">
                                  <textarea
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    rows={2}
                                    className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200 focus:border-blue-500"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setEditingCommentId(null)}
                                      className="px-2 py-0.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (editingCommentText.trim()) {
                                          await editComment(reply.id, editingCommentText.trim());
                                          setEditingCommentId(null);
                                        }
                                      }}
                                      className="px-2.5 py-0.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-700 dark:text-slate-200 pl-7 whitespace-pre-wrap leading-relaxed text-xs">
                                  {reply.content}
                                </p>
                              )}

                              {/* Reply Reactions */}
                              {!reply.isDeleted && reply.reactions && reply.reactions.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pl-7 pt-1">
                                  {reply.reactions.map((r) => {
                                    const hasReacted = currentUserId && r.userIds.includes(currentUserId);
                                    return (
                                      <button
                                        key={r.emoji}
                                        type="button"
                                        onClick={() => toggleCommentReaction(reply.id, r.emoji)}
                                        className={`flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[11px] transition-all border ${
                                          hasReacted
                                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                      >
                                        <span>{r.emoji}</span>
                                        <span className="font-mono text-[10px]">{r.userIds.length}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Inline Reply Form inside thread */}
                        <form
                          onSubmit={(e) => handleReplySubmit(e, c.id)}
                          className="flex gap-2 pt-1.5"
                        >
                          <input
                            type="text"
                            value={replyingToId === c.id ? replyInput : ''}
                            onFocus={() => setReplyingToId(c.id)}
                            onChange={(e) => {
                              setReplyingToId(c.id);
                              setReplyInput(e.target.value);
                            }}
                            placeholder={`Reply to thread...`}
                            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200 focus:border-blue-500"
                          />
                          <button
                            type="submit"
                            disabled={replyingToId !== c.id || !replyInput.trim()}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl transition-all shadow-xs"
                          >
                            Reply
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}

              {rootComments.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No conversation yet. Write a message above to start a thread!
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-blue-500" />
              <span>Activity Timeline</span>
            </div>

            <div className="relative pl-4 border-l border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              {taskActivities.map((act) => {
                const actUser = users.find((u) => u.id === act.userId);
                return (
                  <div key={act.id} className="relative flex items-center justify-between">
                    <span className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#131b2e]" />
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {actUser?.name || 'System'}
                      </span>
                      <span>{act.details}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {new Date(act.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Image Preview Lightbox */}
      {previewAttachmentUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-6"
          onClick={() => setPreviewAttachmentUrl(null)}
        >
          <img
            src={previewAttachmentUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
