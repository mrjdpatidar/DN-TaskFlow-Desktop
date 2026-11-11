/**
 * Central State Store for TaskFlow Desktop
 * Integrates all modules with the Electron IPC JSON Storage Engine.
 */

import { create } from 'zustand';
import {
  DatabaseSchema,
  User,
  Organization,
  Project,
  Task,
  Comment,
  Activity,
  AppNotification,
  UserPreferences,
  TaskStatus,
  TaskPriority,
  NavigationTab,
  UserRole,
} from '../types';
import { ipcBridge } from '../services/ipcBridge';
import { hashPassword, verifyPassword, generateUUID, generateRecoveryKey, generateInviteCode } from '../services/crypto';
import { reminderScheduler } from '../services/reminderScheduler';

interface TaskFlowState {
  // Loaded state
  isInitialized: boolean;
  activeTab: NavigationTab;
  currentUserId: string | null;
  currentOrgId: string | null;
  selectedProjectId: string | null; // null = all projects in current org
  activeTaskId: string | null;      // open task detail modal/drawer
  isCreateTaskOpen: boolean;
  isCreateProjectOpen: boolean;
  editingProject: Project | null;
  isSettingsOpen: boolean;
  settingsInitialTab?: 'profile' | 'organization' | 'appearance' | 'notifications' | 'storage' | 'about';
  isNotificationDrawerOpen: boolean;
  isCommandPaletteOpen: boolean;
  isSwitchUserModalOpen: boolean;

  // Filters & Search
  searchQuery: string;
  statusFilter: TaskStatus | 'all';
  priorityFilter: TaskPriority | 'all';
  assigneeFilter: string | 'all';
  sortBy: 'dueDate' | 'priority' | 'created' | 'title';
  sortOrder: 'asc' | 'desc';

  // Database Records
  users: User[];
  organizations: Organization[];
  projects: Project[];
  tasks: Task[];
  comments: Comment[];
  activities: Activity[];
  notifications: AppNotification[];
  preferences: UserPreferences;

  // Actions
  initialize: () => Promise<void>;
  setActiveTab: (tab: NavigationTab) => void;
  setActiveTaskId: (id: string | null) => void;
  setCreateTaskOpen: (open: boolean) => void;
  setCreateProjectOpen: (open: boolean) => void;
  setEditingProject: (project: Project | null) => void;
  setSettingsOpen: (open: boolean, initialTab?: 'profile' | 'organization' | 'appearance' | 'notifications' | 'storage' | 'about') => void;
  setNotificationDrawerOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSwitchUserModalOpen: (open: boolean) => void;

  // Filter Actions
  setSearchQuery: (q: string) => void;
  setStatusFilter: (s: TaskStatus | 'all') => void;
  setPriorityFilter: (p: TaskPriority | 'all') => void;
  setAssigneeFilter: (a: string | 'all') => void;
  setSortBy: (sort: 'dueDate' | 'priority' | 'created' | 'title') => void;
  toggleSortOrder: () => void;
  selectProject: (id: string | null) => void;

  // Auth & Session Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, avatar?: string, title?: string) => Promise<{ success: boolean; error?: string; recoveryKey?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  recoverPassword: (email: string, recoveryKey: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: { name?: string; avatar?: string; title?: string }) => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;

  // Organization Actions
  switchOrganization: (orgId: string) => void;
  createOrganization: (name: string, description: string, logo?: string) => Promise<Organization>;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => Promise<void>;
  joinOrganizationWithCode: (inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  removeMemberFromOrg: (orgId: string, userId: string) => Promise<void>;
  changeMemberRole: (orgId: string, userId: string, newRole: UserRole) => Promise<void>;
  leaveOrganization: (orgId: string) => Promise<void>;

  // Project Actions
  createProject: (data: Omit<Project, 'id' | 'organizationId' | 'createdAt'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;

  // Task Actions
  createTask: (data: Omit<Task, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'isArchived'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  duplicateTask: (id: string) => Promise<Task | null>;
  archiveTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addAttachment: (taskId: string, file: { name: string; size: number; type: string; url: string }) => Promise<void>;
  removeAttachment: (taskId: string, attachmentId: string) => Promise<void>;

  // Comment Actions
  addComment: (taskId: string, content: string, parentId?: string) => Promise<Comment>;
  editComment: (id: string, content: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;

  // Activity Actions
  logActivity: (action: Activity['action'], details: string, taskId?: string, projectId?: string, oldValue?: string, newValue?: string) => void;

  // Notification Actions
  addNotification: (title: string, message: string, taskId?: string, type?: AppNotification['type']) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;

  // Preferences & Themes
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  toggleTheme: () => void;

  // Storage and Backups
  createBackupNow: () => Promise<{ success: boolean; filename: string }>;
  exportDatabaseJSON: () => Promise<string>;
  importDatabaseJSON: (jsonStr: string) => Promise<{ success: boolean; error?: string }>;
  resetDatabaseToDefault: () => Promise<void>;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function applyAccentColor(hex: string) {
  if (typeof document === 'undefined') return;
  const rgb = hexToRgb(hex);
  document.documentElement.style.setProperty('--primary-accent', hex);
  if (rgb) {
    document.documentElement.style.setProperty('--primary-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    const hoverR = Math.max(0, Math.min(255, Math.round(rgb.r * 0.9)));
    const hoverG = Math.max(0, Math.min(255, Math.round(rgb.g * 0.9)));
    const hoverB = Math.max(0, Math.min(255, Math.round(rgb.b * 0.9)));
    document.documentElement.style.setProperty('--primary-accent-hover', `rgb(${hoverR}, ${hoverG}, ${hoverB})`);
  }
}

// Helpers
const syncToIPC = async (get: () => TaskFlowState) => {
  const state = get();
  const db: DatabaseSchema = {
    users: state.users,
    organizations: state.organizations,
    projects: state.projects,
    tasks: state.tasks,
    comments: state.comments,
    activities: state.activities,
    notifications: state.notifications,
    preferences: state.preferences,
    session: {
      currentUserId: state.currentUserId,
      currentOrgId: state.currentOrgId,
      rememberMe: state.preferences.dockBadge,
    },
  };
  await ipcBridge.database.saveAll(db);
};

export const useTaskFlowStore = create<TaskFlowState>((set, get) => ({
  isInitialized: false,
  activeTab: 'dashboard',
  currentUserId: null,
  currentOrgId: null,
  selectedProjectId: null,
  activeTaskId: null,
  isCreateTaskOpen: false,
  isCreateProjectOpen: false,
  editingProject: null,
  isSettingsOpen: false,
  settingsInitialTab: 'profile',
  isNotificationDrawerOpen: false,
  isCommandPaletteOpen: false,
  isSwitchUserModalOpen: false,

  searchQuery: '',
  statusFilter: 'all',
  priorityFilter: 'all',
  assigneeFilter: 'all',
  sortBy: 'dueDate',
  sortOrder: 'asc',

  users: [],
  organizations: [],
  projects: [],
  tasks: [],
  comments: [],
  activities: [],
  notifications: [],
  preferences: {
    theme: 'dark',
    accentColor: '#5b8def',
    hourlyRemindersEnabled: true,
    reminderIntervalMinutes: 60,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    soundEnabled: true,
    dockBadge: true,
  },

  initialize: async () => {
    try {
      const db = await ipcBridge.database.readAll();
      const currentUserId = db.session?.currentUserId || (db.users.length > 0 ? db.users[0].id : null);
      const currentOrgId = db.session?.currentOrgId || (db.organizations.length > 0 ? db.organizations[0].id : null);

      // Apply theme to document
      if (db.preferences?.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Apply accent color to document
      const accent = db.preferences?.accentColor || '#5b8def';
      applyAccentColor(accent);

      set({
        isInitialized: true,
        users: db.users || [],
        organizations: db.organizations || [],
        projects: db.projects || [],
        tasks: db.tasks || [],
        comments: db.comments || [],
        activities: db.activities || [],
        notifications: db.notifications || [],
        preferences: db.preferences || {
          theme: 'dark',
          accentColor: '#5b8def',
          hourlyRemindersEnabled: true,
          reminderIntervalMinutes: 60,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          soundEnabled: true,
          dockBadge: true,
        },
        currentUserId,
        currentOrgId,
      });

      // Start reminder scheduler
      reminderScheduler.start(
        () => get().tasks,
        () => get().currentUserId,
        () => get().preferences,
        (title, message, taskId, type) => {
          get().addNotification(title, message, taskId, type);
        }
      );
    } catch (err) {
      console.error('Initialization error:', err);
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveTaskId: (id) => set({ activeTaskId: id }),
  setCreateTaskOpen: (open) => set({ isCreateTaskOpen: open }),
  setCreateProjectOpen: (open) => set({ isCreateProjectOpen: open }),
  setEditingProject: (project) => set({ editingProject: project }),
  setSettingsOpen: (open, initialTab = 'profile') => set({ isSettingsOpen: open, settingsInitialTab: initialTab }),
  setNotificationDrawerOpen: (open) => set({ isNotificationDrawerOpen: open }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setSwitchUserModalOpen: (open) => set({ isSwitchUserModalOpen: open }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setPriorityFilter: (priorityFilter) => set({ priorityFilter }),
  setAssigneeFilter: (assigneeFilter) => set({ assigneeFilter }),
  setSortBy: (sortBy) => set({ sortBy }),
  toggleSortOrder: () => set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' })),
  selectProject: (selectedProjectId) => set({ selectedProjectId }),

  // Auth
  login: async (email, password, rememberMe = true) => {
    const user = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: 'User with this email not found' };
    }
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Incorrect password' };
    }

    // Find first organization user belongs to
    const userOrg = get().organizations.find((o) => o.members.some((m) => m.userId === user.id));
    const orgId = userOrg ? userOrg.id : (get().organizations[0]?.id || null);

    set({ currentUserId: user.id, currentOrgId: orgId });
    await syncToIPC(get);
    return { success: true };
  },

  register: async (name, email, password, avatar, title) => {
    const existing = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const passwordHash = await hashPassword(password);
    const recoveryKey = generateRecoveryKey();
    const newUser: User = {
      id: 'usr_' + generateUUID().slice(0, 8),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4f46e5`,
      recoveryKey,
      title: title?.trim() || 'Team Member',
      createdAt: new Date().toISOString(),
    };

    // If an org exists, add as member; otherwise create default organization
    let orgs = [...get().organizations];
    let currentOrgId = get().currentOrgId;

    if (orgs.length === 0) {
      const defaultOrg: Organization = {
        id: 'org_' + generateUUID().slice(0, 8),
        name: `${name.split(' ')[0]}'s Workspace`,
        logo: '💼',
        description: 'Primary team workspace',
        inviteCode: generateInviteCode(),
        members: [{ userId: newUser.id, role: 'owner', joinedAt: new Date().toISOString() }],
        settings: { defaultRole: 'member', allowMemberInvites: true },
        createdAt: new Date().toISOString(),
      };
      orgs.push(defaultOrg);
      currentOrgId = defaultOrg.id;
    } else if (currentOrgId) {
      orgs = orgs.map((o) => {
        if (o.id === currentOrgId && !o.members.some((m) => m.userId === newUser.id)) {
          return {
            ...o,
            members: [...o.members, { userId: newUser.id, role: o.settings.defaultRole || 'member', joinedAt: new Date().toISOString() }],
          };
        }
        return o;
      });
    }

    set({
      users: [...get().users, newUser],
      organizations: orgs,
      currentUserId: newUser.id,
      currentOrgId,
    });

    await syncToIPC(get);
    return { success: true, recoveryKey };
  },

  logout: async () => {
    set({ currentUserId: null });
    await syncToIPC(get);
  },

  switchUser: async (userId) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return;
    const userOrg = get().organizations.find((o) => o.members.some((m) => m.userId === userId));
    set({
      currentUserId: userId,
      currentOrgId: userOrg ? userOrg.id : get().currentOrgId,
      isSwitchUserModalOpen: false,
    });
    await syncToIPC(get);
  },

  recoverPassword: async (email, recoveryKey, newPassword) => {
    const user = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: 'Account not found with this email' };
    }
    const cleanKey = recoveryKey.trim().toUpperCase().replace(/\s+/g, '');
    const userKey = user.recoveryKey.trim().toUpperCase().replace(/\s+/g, '');
    if (cleanKey !== userKey) {
      return { success: false, error: 'Invalid recovery key' };
    }

    const newHash = await hashPassword(newPassword);
    const updatedUsers = get().users.map((u) => (u.id === user.id ? { ...u, passwordHash: newHash } : u));
    set({ users: updatedUsers });
    await syncToIPC(get);
    return { success: true };
  },

  updateProfile: async (updates) => {
    const uid = get().currentUserId;
    if (!uid) return;
    const updatedUsers = get().users.map((u) => (u.id === uid ? { ...u, ...updates } : u));
    set({ users: updatedUsers });
    await syncToIPC(get);
  },

  changePassword: async (oldPass, newPass) => {
    const uid = get().currentUserId;
    if (!uid) return { success: false, error: 'Not authenticated' };
    const user = get().users.find((u) => u.id === uid);
    if (!user) return { success: false, error: 'User not found' };

    const valid = await verifyPassword(oldPass, user.passwordHash);
    if (!valid) return { success: false, error: 'Current password is incorrect' };

    const newHash = await hashPassword(newPass);
    const updatedUsers = get().users.map((u) => (u.id === uid ? { ...u, passwordHash: newHash } : u));
    set({ users: updatedUsers });
    await syncToIPC(get);
    return { success: true };
  },

  // Organizations
  switchOrganization: (orgId) => {
    set({ currentOrgId: orgId, selectedProjectId: null });
    syncToIPC(get);
  },

  createOrganization: async (name, description, logo = '🏢') => {
    const uid = get().currentUserId;
    const newOrg: Organization = {
      id: 'org_' + generateUUID().slice(0, 8),
      name: name.trim(),
      description: description.trim(),
      logo,
      inviteCode: generateInviteCode(),
      members: uid ? [{ userId: uid, role: 'owner', joinedAt: new Date().toISOString() }] : [],
      settings: { defaultRole: 'member', allowMemberInvites: true },
      createdAt: new Date().toISOString(),
    };
    set({
      organizations: [...get().organizations, newOrg],
      currentOrgId: newOrg.id,
      selectedProjectId: null,
    });
    await syncToIPC(get);
    return newOrg;
  },

  updateOrganization: async (orgId, updates) => {
    const updated = get().organizations.map((o) => (o.id === orgId ? { ...o, ...updates } : o));
    set({ organizations: updated });
    await syncToIPC(get);
  },

  joinOrganizationWithCode: async (inviteCode) => {
    const code = inviteCode.trim().toUpperCase();
    const org = get().organizations.find((o) => o.inviteCode.toUpperCase() === code);
    if (!org) {
      return { success: false, error: 'No organization found matching this invitation code' };
    }
    const uid = get().currentUserId;
    if (!uid) return { success: false, error: 'Must be logged in to join' };

    if (org.members.some((m) => m.userId === uid)) {
      set({ currentOrgId: org.id });
      return { success: true };
    }

    const updatedOrgs = get().organizations.map((o) => {
      if (o.id === org.id) {
        return {
          ...o,
          members: [...o.members, { userId: uid, role: o.settings.defaultRole || 'member', joinedAt: new Date().toISOString() }],
        };
      }
      return o;
    });

    set({ organizations: updatedOrgs, currentOrgId: org.id });
    await syncToIPC(get);
    return { success: true };
  },

  removeMemberFromOrg: async (orgId, userId) => {
    const updated = get().organizations.map((o) => {
      if (o.id === orgId) {
        return {
          ...o,
          members: o.members.filter((m) => m.userId !== userId),
        };
      }
      return o;
    });
    set({ organizations: updated });
    await syncToIPC(get);
  },

  changeMemberRole: async (orgId, userId, newRole) => {
    const updated = get().organizations.map((o) => {
      if (o.id === orgId) {
        return {
          ...o,
          members: o.members.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)),
        };
      }
      return o;
    });
    set({ organizations: updated });
    await syncToIPC(get);
  },

  leaveOrganization: async (orgId) => {
    const uid = get().currentUserId;
    if (!uid) return;
    await get().removeMemberFromOrg(orgId, uid);
    const otherOrgs = get().organizations.filter((o) => o.id !== orgId && o.members.some((m) => m.userId === uid));
    set({ currentOrgId: otherOrgs[0]?.id || null });
  },

  // Projects
  createProject: async (data) => {
    const orgId = get().currentOrgId || 'org_default';
    const newProject: Project = {
      ...data,
      id: 'prj_' + generateUUID().slice(0, 8),
      organizationId: orgId,
      createdAt: new Date().toISOString(),
    };
    set({ projects: [...get().projects, newProject], selectedProjectId: newProject.id });
    get().logActivity('created', `created project "${newProject.name}"`, undefined, newProject.id);
    await syncToIPC(get);
    return newProject;
  },

  updateProject: async (id, updates) => {
    const updated = get().projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
    set({ projects: updated });
    await syncToIPC(get);
  },

  deleteProject: async (id) => {
    const updatedProjects = get().projects.filter((p) => p.id !== id);
    const updatedTasks = get().tasks.filter((t) => t.projectId !== id);
    set({
      projects: updatedProjects,
      tasks: updatedTasks,
      selectedProjectId: get().selectedProjectId === id ? null : get().selectedProjectId,
    });
    await syncToIPC(get);
  },

  archiveProject: async (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return;
    const newStatus = project.status === 'archived' ? 'active' : 'archived';
    await get().updateProject(id, { status: newStatus });
  },

  // Tasks
  createTask: async (data) => {
    const uid = get().currentUserId || 'usr_unknown';
    const orgId = get().currentOrgId || 'org_acme';
    const newTask: Task = {
      ...data,
      id: 'tsk_' + generateUUID().slice(0, 8),
      organizationId: orgId,
      createdBy: uid,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set({ tasks: [newTask, ...get().tasks] });
    get().logActivity('created', `created task "${newTask.title}"`, newTask.id, newTask.projectId);

    // Notify assigned users (excluding creator)
    newTask.assignedTo.forEach((assigneeId) => {
      if (assigneeId !== uid) {
        get().addNotification(
          'New Task Assigned',
          `You have been assigned to "${newTask.title}"`,
          newTask.id,
          'assignment'
        );
      }
    });

    await syncToIPC(get);
    return newTask;
  },

  updateTask: async (id, updates) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updatedTasks = get().tasks.map((t) => (t.id === id ? updatedTask : t));
    set({ tasks: updatedTasks });

    // Track activity changes
    if (updates.priority && updates.priority !== task.priority) {
      get().logActivity('priority_changed', `changed priority to ${updates.priority}`, id, task.projectId, task.priority, updates.priority);
    }
    if (updates.dueDate && updates.dueDate !== task.dueDate) {
      get().logActivity('due_date_changed', `changed due date to ${updates.dueDate}`, id, task.projectId);
    }

    await syncToIPC(get);
  },

  updateTaskStatus: async (id, status) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;

    const oldStatus = task.status;
    const updatedTasks = get().tasks.map((t) =>
      t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
    );
    set({ tasks: updatedTasks });

    get().logActivity(
      status === 'completed' ? 'completed' : 'status_changed',
      status === 'completed' ? 'marked task as Completed' : `moved task from ${oldStatus.replace('_', ' ')} to ${status.replace('_', ' ')}`,
      id,
      task.projectId,
      oldStatus,
      status
    );

    // If completed, inform assignees
    if (status === 'completed') {
      task.assignedTo.forEach((assigneeId) => {
        if (assigneeId !== get().currentUserId) {
          get().addNotification('Task Completed', `"${task.title}" was marked as completed.`, id, 'system');
        }
      });
    }

    await syncToIPC(get);
  },

  duplicateTask: async (id) => {
    const original = get().tasks.find((t) => t.id === id);
    if (!original) return null;

    const copy: Task = {
      ...original,
      id: 'tsk_' + generateUUID().slice(0, 8),
      title: `${original.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [...original.attachments],
    };

    set({ tasks: [copy, ...get().tasks], activeTaskId: copy.id });
    get().logActivity('duplicated', `duplicated from "${original.title}"`, copy.id, copy.projectId);
    await syncToIPC(get);
    return copy;
  },

  archiveTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const newArchived = !task.isArchived;
    const updated = get().tasks.map((t) => (t.id === id ? { ...t, isArchived: newArchived } : t));
    set({ tasks: updated });
    get().logActivity('archived', newArchived ? 'archived this task' : 'unarchived this task', id, task.projectId);
    await syncToIPC(get);
  },

  deleteTask: async (id) => {
    set({
      tasks: get().tasks.filter((t) => t.id !== id),
      comments: get().comments.filter((c) => c.taskId !== id),
      activities: get().activities.filter((a) => a.taskId !== id),
      activeTaskId: get().activeTaskId === id ? null : get().activeTaskId,
    });
    await syncToIPC(get);
  },

  addAttachment: async (taskId, file) => {
    const uid = get().currentUserId || 'usr_unknown';
    const newAtt = {
      id: 'att_' + generateUUID().slice(0, 8),
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.url,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uid,
    };

    const updated = get().tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          attachments: [...t.attachments, newAtt],
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    set({ tasks: updated });
    get().logActivity('attachment_uploaded', `uploaded file "${file.name}"`, taskId);
    await syncToIPC(get);
  },

  removeAttachment: async (taskId, attachmentId) => {
    const updated = get().tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          attachments: t.attachments.filter((a) => a.id !== attachmentId),
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    set({ tasks: updated });
    await syncToIPC(get);
  },

  // Comments & Mentions
  addComment: async (taskId, content, parentId) => {
    const uid = get().currentUserId || 'usr_unknown';
    const newComment: Comment = {
      id: 'cmt_' + generateUUID().slice(0, 8),
      taskId,
      userId: uid,
      content,
      parentId,
      createdAt: new Date().toISOString(),
    };

    set({ comments: [...get().comments, newComment] });
    get().logActivity('commented', `added a comment`, taskId);

    // Notify task creator or parent comment author
    const task = get().tasks.find((t) => t.id === taskId);
    if (task && task.createdBy !== uid) {
      get().addNotification(
        'New Comment on Task',
        `New comment added to "${task.title}"`,
        taskId,
        parentId ? 'reply' : 'comment'
      );
    }

    await syncToIPC(get);
    return newComment;
  },

  editComment: async (id, content) => {
    const updated = get().comments.map((c) =>
      c.id === id ? { ...c, content, updatedAt: new Date().toISOString() } : c
    );
    set({ comments: updated });
    await syncToIPC(get);
  },

  deleteComment: async (id) => {
    set({ comments: get().comments.filter((c) => c.id !== id && c.parentId !== id) });
    await syncToIPC(get);
  },

  // Activities
  logActivity: (action, details, taskId, projectId, oldValue, newValue) => {
    const uid = get().currentUserId || 'usr_unknown';
    const orgId = get().currentOrgId || 'org_acme';
    const act: Activity = {
      id: 'act_' + generateUUID().slice(0, 8),
      organizationId: orgId,
      projectId,
      taskId,
      userId: uid,
      action,
      details,
      oldValue,
      newValue,
      createdAt: new Date().toISOString(),
    };
    set({ activities: [act, ...get().activities.slice(0, 199)] });
  },

  // Notifications
  addNotification: (title, message, taskId, type = 'system') => {
    const uid = get().currentUserId;
    if (!uid) return;
    const notif: AppNotification = {
      id: 'notif_' + generateUUID().slice(0, 8),
      userId: uid,
      title,
      message,
      taskId,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set({ notifications: [notif, ...get().notifications] });
  },

  markNotificationAsRead: (id) => {
    set({
      notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    });
    syncToIPC(get);
  },

  markAllNotificationsAsRead: () => {
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    });
    syncToIPC(get);
  },

  clearNotification: (id) => {
    set({
      notifications: get().notifications.filter((n) => n.id !== id),
    });
    syncToIPC(get);
  },

  // Preferences
  updatePreferences: async (updates) => {
    const updated = { ...get().preferences, ...updates };
    set({ preferences: updated });

    if (updates.theme) {
      if (updates.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    if (updates.accentColor) {
      applyAccentColor(updates.accentColor);
    }

    await syncToIPC(get);
  },

  toggleTheme: () => {
    const next = get().preferences.theme === 'dark' ? 'light' : 'dark';
    get().updatePreferences({ theme: next });
  },

  // Storage / Backups
  createBackupNow: async () => {
    const res = await ipcBridge.database.createBackup();
    return { success: res.success, filename: res.filename };
  },

  exportDatabaseJSON: async () => {
    return await ipcBridge.database.exportJSON();
  },

  importDatabaseJSON: async (jsonStr) => {
    const res = await ipcBridge.database.importJSON(jsonStr);
    if (res.success) {
      await get().initialize();
    }
    return res;
  },

  resetDatabaseToDefault: async () => {
    await ipcBridge.database.resetToDefault();
    await get().initialize();
  },
}));
