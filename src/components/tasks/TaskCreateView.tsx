import React, { useState, useRef, useEffect } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { TaskPriority, TaskStatus, TaskAttachment, TaskChecklistItem } from '../../types';
import { Avatar } from '../common/Avatar';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityIcon } from '../common/PriorityIcon';
import { emailService } from '../../services/emailService';
import {
  ArrowLeft,
  Check,
  Plus,
  Clock,
  Tag,
  Paperclip,
  Image as ImageIcon,
  FileText,
  FileArchive,
  Table as TableIcon,
  X,
  Calendar,
  AlertCircle,
  FolderPlus,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Upload,
  Send,
  Sparkles,
  Link2,
  Trash2,
  Eye,
} from 'lucide-react';

const PROJECT_COLORS = [
  '#0080fa',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#64748b',
];

export const TaskCreateView: React.FC = () => {
  const {
    projects,
    currentOrgId,
    selectedProjectId,
    users,
    organizations,
    currentUserId,
    createTask,
    createProject,
    setActiveTab,
    setActiveTaskId,
  } = useTaskFlowStore();

  const currentOrg = organizations.find((o) => o.id === currentOrgId);
  const orgProjects = projects.filter((p) => p.organizationId === currentOrgId);
  const orgMembers = users.filter((u) => currentOrg?.members.some((m) => m.userId === u.id));
  const currentUser = users.find((u) => u.id === currentUserId);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>(selectedProjectId || orgProjects[0]?.id || '');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [estimatedTime, setEstimatedTime] = useState('4h');
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  // Assignees & Auto-Invite Search States
  const [assignedTo, setAssignedTo] = useState<string[]>(currentUserId ? [currentUserId] : []);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [pendingInviteEmails, setPendingInviteEmails] = useState<string[]>([]);
  const [isInviteChecking, setIsInviteChecking] = useState(false);

  // Labels
  const [labels, setLabels] = useState<string[]>(['Feature']);
  const [labelInput, setLabelInput] = useState('');

  // Checklists / Subtasks (clean empty state)
  const [checklists, setChecklists] = useState<TaskChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Attachments (ZIP, Images, Docs, Excels, All)
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorFileInputRef = useRef<HTMLInputElement>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Inline Project Creator State
  const [isCreatingProjectInline, setIsCreatingProjectInline] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Auto-sync project selection if empty
  useEffect(() => {
    if (!projectId && orgProjects.length > 0) {
      setProjectId(orgProjects[0].id);
    }
  }, [orgProjects, projectId]);

  // Handle Assignee Toggle
  const handleToggleAssignee = (userId: string) => {
    setAssignedTo((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Handle Add Pending Email Invite
  const handleTogglePendingEmail = (email: string) => {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    if (pendingInviteEmails.includes(clean)) {
      setPendingInviteEmails((prev) => prev.filter((e) => e !== clean));
    } else {
      setPendingInviteEmails((prev) => [...prev, clean]);
    }
  };

  // Add Label
  const handleAddLabel = () => {
    const clean = labelInput.trim();
    if (clean && !labels.includes(clean)) {
      setLabels((prev) => [...prev, clean]);
      setLabelInput('');
    }
  };

  // Remove Label
  const handleRemoveLabel = (tagToRemove: string) => {
    setLabels((prev) => prev.filter((l) => l !== tagToRemove));
  };

  // Add Checklist
  const handleAddChecklist = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newChecklistText.trim()) return;
    setChecklists((prev) => [
      ...prev,
      { id: 'chk_' + Date.now(), text: newChecklistText.trim(), completed: false },
    ]);
    setNewChecklistText('');
  };

  // Toggle Checklist
  const handleToggleChecklist = (id: string) => {
    setChecklists((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );
  };

  // Remove Checklist
  const handleRemoveChecklist = (id: string) => {
    setChecklists((prev) => prev.filter((c) => c.id !== id));
  };

  // Quick Date Helpers
  const handleSetDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().slice(0, 10));
  };

  // Markdown Formatting Helpers
  const insertFormatting = (prefix: string, suffix = '') => {
    const textarea = descTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || 'text';
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newText =
      textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    setDescription(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  // Process File Uploads (Images, Zips, Docs, Excels, All)
  const processFiles = (files: FileList | File[], insertInEditor = false, messageTag = 'Task Description Attachment') => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = () => {
        const url = reader.result as string;
        const newAttachment: TaskAttachment = {
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUserId || 'usr_unknown',
          messageTag,
        };

        setAttachments((prev) => [...prev, newAttachment]);

        // If requested to insert directly into editor
        if (insertInEditor) {
          const isImage = file.type.startsWith('image/');
          const markdownToken = isImage
            ? `\n![${file.name}](${url})\n`
            : `\n[📎 Download ${file.name} (${formatFileSize(file.size)})](${url})\n`;

          setDescription((prev) => prev + markdownToken);
        }
      };

      reader.readAsDataURL(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileCategory = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext || '')) {
      return 'image';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
      return 'archive';
    }
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return 'spreadsheet';
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'].includes(ext || '')) {
      return 'document';
    }
    return 'generic';
  };

  // Inline Project Creator Action
  const handleSaveInlineProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const created = await createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || 'Project for task deliverables',
        color: newProjectColor,
        icon: 'Layers',
        ownerId: currentUserId || '',
        memberIds: currentUserId ? [currentUserId] : [],
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        status: 'active',
      });

      setProjectId(created.id);
      setIsCreatingProjectInline(false);
      setNewProjectName('');
      setNewProjectDesc('');
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to create new project');
    }
  };

  // Final Task Creation Action
  const handleCreateTaskSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitError('');

    if (!title.trim()) {
      setSubmitError('Please enter a task title.');
      return;
    }
    if (!projectId) {
      setSubmitError('Please select or create a project for this task.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Dispatch email invites to pending invitees via Hostinger PHP mailer
      if (pendingInviteEmails.length > 0 && currentOrg) {
        for (const inviteEmail of pendingInviteEmails) {
          await emailService.sendInvite(
            inviteEmail,
            currentOrg.name,
            currentUser?.name || 'Workspace Lead',
            currentOrg.inviteCode,
            'member'
          );
          useTaskFlowStore.getState().notifyInvitedUser(
            inviteEmail,
            currentOrg.name,
            currentOrg.inviteCode,
            'member'
          );
        }
      }

      // 2. Create the task with complete data
      const created = await createTask({
        projectId,
        title: title.trim(),
        description: description.trim(),
        assignedTo,
        priority,
        status,
        startDate,
        dueDate,
        labels,
        checklists,
        estimatedTime,
        remindersEnabled,
        attachments,
      });

      setIsSubmitting(false);

      // 3. View created task or return to board
      setActiveTaskId(created.id);
      setActiveTab('board');
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err?.message || 'Failed to save task.');
    }
  };

  // Filtered members for assignee picker
  const filteredMembers = orgMembers.filter((m) => {
    const q = assigneeSearch.toLowerCase().trim();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const isEmailQuery =
    assigneeSearch.includes('@') &&
    assigneeSearch.includes('.') &&
    !orgMembers.some((m) => m.email.toLowerCase() === assigneeSearch.toLowerCase().trim());

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F7F9FB]/80 dark:bg-slate-950/60 select-none">
      {/* Top Navigation Header */}
      <div className="px-8 py-3.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('board')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Board</span>
          </button>

          <div className="h-4 w-px bg-black/10 dark:bg-white/10" />

          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Create New Task</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Workspace: <strong>{currentOrg?.name || 'General'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => handleCreateTaskSubmit()}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition-all active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating Task...' : 'Publish Task'}</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-white/20 rounded">
              ⌘+Enter
            </kbd>
          </button>
        </div>
      </div>

      {/* Main Form Body (2 Columns Layout) */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Core Content & Editors */}
          <div className="lg:col-span-2 space-y-6">
            {submitError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Task Title */}
            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleCreateTaskSubmit();
                  }
                }}
                placeholder="e.g. Implement client-side notification reminders & audio alerts..."
                autoFocus
                className="w-full text-base sm:text-lg font-bold bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none border-b border-black/10 dark:border-white/10 pb-2 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Rich Text Description Editor */}
            <div className="glass-panel rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Rich Description Editor
                </span>

                {/* Formatting Tools Strip */}
                <div className="flex items-center gap-1 flex-wrap text-slate-600 dark:text-slate-300 text-xs">
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    title="Bold"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    title="Italic"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('# ')}
                    title="Heading 1"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Heading1 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('## ')}
                    title="Heading 2"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('- ')}
                    title="Bullet List"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('1. ')}
                    title="Numbered List"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('- [ ] ')}
                    title="Checklist item"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('```\n', '\n```')}
                    title="Code Block"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('> ')}
                    title="Quote"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n---\n')}
                    title="Divider"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5" />

                  {/* Direct Insert Media into Editor */}
                  <input
                    type="file"
                    ref={editorFileInputRef}
                    multiple
                    onChange={(e) => {
                      if (e.target.files) processFiles(e.target.files, true, 'Inline Editor Embed');
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editorFileInputRef.current?.click()}
                    title="Direct Media Upload into Editor"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Upload & Embed</span>
                  </button>
                </div>
              </div>

              {/* Textarea with Drag & Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files) {
                    processFiles(e.dataTransfer.files, true, 'Drag & Drop Editor Embed');
                  }
                }}
                className={`relative p-5 transition-all ${
                  isDraggingFile ? 'bg-blue-500/10 ring-2 ring-blue-500 ring-inset' : ''
                }`}
              >
                <textarea
                  ref={descTextareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  placeholder="Provide detailed requirements, user flows, acceptance criteria, or drag-and-drop media directly into this box..."
                  className="w-full text-xs font-sans leading-relaxed bg-transparent text-slate-800 dark:text-slate-200 outline-none resize-y"
                />

                {isDraggingFile && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-600/15 backdrop-blur-xs pointer-events-none">
                    <p className="text-xs font-bold text-blue-500 flex items-center gap-2">
                      <Upload className="w-4 h-4 animate-bounce" />
                      <span>Drop file to upload and embed in text editor</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Dedicated Multi-Media Uploads Box (ZIP, Images, Docs, Excels, All) */}
            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-blue-500" />
                    <span>Multi-Media & File Assets Box</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports ZIP archives, Images, PDF docs, Excel spreadsheets, and raw data files.
                  </p>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    onChange={(e) => {
                      if (e.target.files) processFiles(e.target.files, false, 'Task Media Box');
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 border border-black/5 dark:border-white/10 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse Files</span>
                  </button>
                </div>
              </div>

              {/* Upload Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files) {
                    processFiles(e.dataTransfer.files, false, 'Task Media Box');
                  }
                }}
                className="border-2 border-dashed border-black/10 dark:border-white/10 hover:border-blue-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-black/5 dark:bg-white/5"
              >
                <div className="flex justify-center gap-3 text-slate-400 mb-2">
                  <FileArchive className="w-5 h-5 text-amber-500" />
                  <ImageIcon className="w-5 h-5 text-blue-500" />
                  <FileText className="w-5 h-5 text-blue-500" />
                  <TableIcon className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Drop ZIPs, images, documents, or excel spreadsheets here
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Files are saved locally and can be mapped directly to discussion messages.
                </p>
              </div>

              {/* Uploaded Files Matrix & Message Mapping */}
              {attachments.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Uploaded Media ({attachments.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((att) => {
                      const category = getFileCategory(att.type, att.name);
                      return (
                        <div
                          key={att.id}
                          className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 truncate">
                              {category === 'image' && (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-10 h-10 object-cover rounded-lg border border-black/10 dark:border-white/10 shrink-0"
                                />
                              )}
                              {category === 'archive' && (
                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                  <FileArchive className="w-5 h-5" />
                                </div>
                              )}
                              {category === 'spreadsheet' && (
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                  <TableIcon className="w-5 h-5" />
                                </div>
                              )}
                              {(category === 'document' || category === 'generic') && (
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {att.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {formatFileSize(att.size)}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                              }
                              className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Message / Thread Mapping Selector */}
                          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Link2 className="w-3 h-3 text-blue-400" />
                              <span>Map to message:</span>
                            </span>
                            <select
                              value={att.messageTag || 'Main Task Spec'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAttachments((prev) =>
                                  prev.map((a) =>
                                    a.id === att.id ? { ...a, messageTag: val } : a
                                  )
                                );
                              }}
                              className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md px-2 py-0.5 text-[10px] text-slate-700 dark:text-slate-300 outline-none"
                            >
                              <option value="Main Task Spec">Task Description Spec</option>
                              <option value="Initial Message">Initial Message Thread</option>
                              <option value="Review Deliverable">Review Deliverable</option>
                              <option value="Asset Archive">Asset Archive (ZIP/Docs)</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Checklists & Subtasks */}
            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  <span>Checklists & Subtasks</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {checklists.filter((c) => c.completed).length} of {checklists.length} done
                </span>
              </div>

              <div className="space-y-2">
                {checklists.map((chk) => (
                  <div
                    key={chk.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs group"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={chk.completed}
                        onChange={() => handleToggleChecklist(chk.id)}
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                      <span
                        className={`truncate ${
                          chk.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-800 dark:text-slate-200 font-medium'
                        }`}
                      >
                        {chk.text}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveChecklist(chk.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add checklist input */}
              <form onSubmit={handleAddChecklist} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="Add actionable subtask or checklist requirement..."
                  className="flex-1 px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 border border-black/5 dark:border-white/10"
                >
                  Add Item
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: Project, Assignees & Attributes */}
          <div className="space-y-6">
            {/* Project Selection + Inline Project Creator */}
            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Target Project *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingProjectInline(!isCreatingProjectInline)}
                  className="text-xs font-semibold text-blue-500 hover:underline flex items-center gap-1"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{isCreatingProjectInline ? 'Select Existing' : '+ New Project'}</span>
                </button>
              </div>

              {!isCreatingProjectInline ? (
                <div>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    {orgProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Inline Project Creator Card */
                <form
                  onSubmit={handleSaveInlineProject}
                  className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2.5 text-xs"
                >
                  <span className="font-bold text-blue-500 block">Create Project On-the-Fly</span>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Project Name *</label>
                    <input
                      type="text"
                      required
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g. Mobile iOS Client v2"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Project Color</label>
                    <div className="flex gap-2">
                      {PROJECT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewProjectColor(c)}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            newProjectColor === c ? 'scale-110 ring-2 ring-white' : ''
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingProjectInline(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500"
                    >
                      Create & Select
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Status & Priority Selection */}
            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                  Workflow Status (8 Stages)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
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
                <div className="mt-2">
                  <StatusBadge status={status} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <div className="mt-2">
                  <PriorityIcon priority={priority} showLabel />
                </div>
              </div>
            </div>

            {/* Team Assignees with Name / Email Search & Auto-Invite */}
            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Assign Team Members
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {assignedTo.length} assigned
                </span>
              </div>

              {/* Live Search by Name or Email */}
              <input
                type="text"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                placeholder="Search by name or enter email..."
                className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
              />

              {/* Auto-Invite Card if user not in workspace */}
              {isEmailQuery && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-blue-500 font-semibold">
                    <Send className="w-3.5 h-3.5" />
                    <span>User not in workspace yet</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Would you like to send an invitation email to <strong>{assigneeSearch}</strong> upon creating this task?
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1 font-semibold text-slate-800 dark:text-slate-100">
                    <input
                      type="checkbox"
                      checked={pendingInviteEmails.includes(assigneeSearch.toLowerCase().trim())}
                      onChange={() => handleTogglePendingEmail(assigneeSearch)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <span>Invite & assign {assigneeSearch}</span>
                  </label>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredMembers.map((m) => {
                  const isAssigned = assignedTo.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleToggleAssignee(m.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                        isAssigned
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          name={m.name}
                          avatarUrl={m.avatar}
                          avatarPreset={m.avatarPreset}
                          size="xs"
                        />
                        <div className="text-left truncate">
                          <p className="truncate leading-tight">{m.name}</p>
                          <p className={`text-[10px] truncate ${isAssigned ? 'text-blue-200' : 'text-slate-400'}`}>
                            {m.email}
                          </p>
                        </div>
                      </div>
                      {isAssigned && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dates & Timeline */}
            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Timeline & Deadlines
              </label>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Start Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 font-mono outline-none"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Due Date *</span>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 font-mono outline-none"
                  />
                  {/* Quick Pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => handleSetDateOffset(0)}
                      className="px-2 py-0.5 rounded text-[10px] bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-slate-300"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDateOffset(1)}
                      className="px-2 py-0.5 rounded text-[10px] bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-slate-300"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDateOffset(7)}
                      className="px-2 py-0.5 rounded text-[10px] bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-slate-300"
                    >
                      +1 Week
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDateOffset(30)}
                      className="px-2 py-0.5 rounded text-[10px] bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-slate-300"
                    >
                      +1 Month
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Estimated Hours</span>
                  <input
                    type="text"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="e.g. 4h, 2d, 1w"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Labels & Tags */}
            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Labels & Tags
              </label>

              <div className="flex flex-wrap gap-1.5">
                {labels.map((lbl) => (
                  <span
                    key={lbl}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  >
                    <span>{lbl}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(lbl)}
                      className="hover:text-rose-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel();
                    }
                  }}
                  placeholder="Add label (press enter)..."
                  className="flex-1 px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddLabel}
                  className="px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 border border-black/5 dark:border-white/10"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Hourly Reminders */}
            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-blue-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Hourly Desktop Reminders
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Dispatches alert tone every hour near deadline
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(e) => setRemindersEnabled(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

