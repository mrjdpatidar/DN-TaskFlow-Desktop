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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  // Mention auto-suggest
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  if (!activeTaskId) return null;
  const task = tasks.find((t) => t.id === activeTaskId);
  if (!task) return null;

  const project = projects.find((p) => p.id === task.projectId);
  const currentOrg = organizations.find((o) => o.id === currentOrgId);
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
        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
      />

      {/* Detail Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full max-w-2xl h-full glass-panel bg-white/95 dark:bg-slate-900/95 border-l border-black/5 dark:border-white/10 flex flex-col z-10 shadow-2xl overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="px-6 py-3.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
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
            <button
              onClick={() => deleteTask(task.id)}
              title="Delete Task"
              className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="w-full text-lg font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-indigo-500 pb-1 outline-none"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md"
                >
                  Save
                </button>
              </div>
            ) : (
              <h2
                onClick={() => {
                  setTitleDraft(task.title);
                  setIsEditingTitle(true);
                }}
                className="text-lg font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors leading-snug"
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* Quick Properties Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-black/5 dark:border-white/5 text-xs">
            {/* Status Selector */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Status
              </span>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-lg px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200 outline-none text-xs"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-1">
                Priority
              </span>
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-lg px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200 outline-none text-xs"
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
                Due Date
              </span>
              <input
                type="date"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                onChange={handleDueDateChange}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-200 outline-none text-xs font-mono"
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
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                    : 'bg-black/5 dark:bg-white/5 text-slate-400 border-black/5 dark:border-white/10'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{task.remindersEnabled ? 'Enabled' : 'Muted'}</span>
              </button>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Assigned Team
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {orgMembers.map((member) => {
                const isAssigned = task.assignedTo.includes(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => handleAssigneeToggle(member.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isAssigned
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <Avatar name={member.name} avatarUrl={member.avatar} size="xs" />
                    <span>{member.name}</span>
                    {isAssigned && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Labels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Labels & Tags
              </span>
              <button
                onClick={() => setIsAddingLabel(!isAddingLabel)}
                className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Label</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {task.labels.map((lbl) => (
                <span
                  key={lbl}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/5"
                >
                  <span>{lbl}</span>
                  <button
                    onClick={() => handleRemoveLabel(lbl)}
                    className="hover:text-rose-500 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {isAddingLabel && (
                <form onSubmit={handleAddLabel} className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    placeholder="Label name"
                    autoFocus
                    className="px-2 py-0.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md outline-none"
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-md"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Rich Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Description
              </span>
              {!isEditingDesc && (
                <button
                  onClick={() => {
                    setDescDraft(task.description);
                    setIsEditingDesc(true);
                  }}
                  className="text-[11px] text-indigo-500 hover:underline"
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
                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
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
                className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer hover:border-indigo-500/30 transition-colors whitespace-pre-wrap"
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
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Attachments ({task.attachments.length})
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
                  className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {task.attachments.map((att) => {
                const isImage = att.type.startsWith('image/');
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
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-500 transition-colors">
                          {att.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {formatFileSize(att.size)}
                        </p>
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
                  className="col-span-full border border-dashed border-black/10 dark:border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/40 transition-colors text-xs text-slate-400"
                >
                  <Paperclip className="w-4 h-4 mx-auto mb-1 opacity-50" />
                  <span>Click or drag files here to upload attachments</span>
                </div>
              )}
            </div>
          </div>

          {/* Threaded Comments & @Mentions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Conversation ({taskComments.length})
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
                  className="w-full p-3 text-xs bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                />

                {/* @Mention Suggestion popup */}
                {mentionQuery !== null && (
                  <div className="absolute bottom-full left-0 mb-1 w-52 glass-dropdown rounded-xl p-1 z-20 shadow-xl text-xs">
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
                          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-left"
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
                      className="hover:text-indigo-500 font-mono"
                    >
                      @{m.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-all"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </div>
            </form>

            {/* Comments Stream with Threading */}
            <div className="space-y-3">
              {rootComments.map((comment) => {
                const author = users.find((u) => u.id === comment.userId);
                const replies = taskComments.filter((c) => c.parentId === comment.id);

                return (
                  <div
                    key={comment.id}
                    className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={author?.name || 'User'}
                          avatarUrl={author?.avatar}
                          size="sm"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {author?.name || 'Local User'}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2 tabular-nums">
                            {new Date(comment.createdAt).toLocaleDateString()}{' '}
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                          className="px-2 py-1 text-[11px] text-slate-400 hover:text-indigo-500 rounded hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>Reply</span>
                        </button>
                        {comment.userId === currentUserId && (
                          <>
                            <button
                              onClick={() => {
                                setEditingCommentId(editingCommentId === comment.id ? null : comment.id);
                                setEditingCommentText(comment.content);
                              }}
                              title="Edit comment"
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteComment(comment.id)}
                              title="Delete comment"
                              className="p-1 text-slate-400 hover:text-rose-500 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="pl-9 space-y-2">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          rows={2}
                          className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200"
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
                                await editComment(comment.id, editingCommentText.trim());
                                setEditingCommentId(null);
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 dark:text-slate-300 pl-9 whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>
                    )}

                    {/* Threaded Replies */}
                    {replies.length > 0 && (
                      <div className="ml-9 pt-2 space-y-2 border-t border-black/5 dark:border-white/5">
                        {replies.map((reply) => {
                          const replyAuthor = users.find((u) => u.id === reply.userId);
                          return (
                            <div key={reply.id} className="flex items-start gap-2 text-xs">
                              <Avatar
                                name={replyAuthor?.name || 'User'}
                                avatarUrl={replyAuthor?.avatar}
                                size="xs"
                              />
                              <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-lg p-2.5">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-slate-900 dark:text-slate-100">
                                    {replyAuthor?.name || 'User'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 tabular-nums">
                                    {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {reply.content}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline Reply Form */}
                    {replyingToId === comment.id && (
                      <form
                        onSubmit={(e) => handleReplySubmit(e, comment.id)}
                        className="ml-9 mt-2 flex gap-2"
                      >
                        <input
                          type="text"
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          placeholder="Reply to thread..."
                          autoFocus
                          className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg"
                        >
                          Reply
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}

              {rootComments.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  No comments yet. Start the conversation!
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Activity Timeline</span>
            </div>

            <div className="relative pl-4 border-l border-black/10 dark:border-white/10 space-y-3 text-xs">
              {taskActivities.map((act) => {
                const actUser = users.find((u) => u.id === act.userId);
                return (
                  <div key={act.id} className="relative flex items-center justify-between">
                    <span className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 ring-2 ring-[#0b0f19]" />
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
