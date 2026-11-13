/**
 * Central State Store for TaskFlow
 * Integrates all modules with the Electron IPC JSON Storage Engine.
 * 
 * Production Live Deployment:
 * // Live URL: https://app.drunall.com/taskflow
 * // Electron Executable: https://app.drunall.com/taskflow/downloads/DN TaskFlow-Setup.exe
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
  EmailPrivacyLevel,
} from '../types';
import { ipcBridge } from '../services/ipcBridge';
import { hashPassword, verifyPassword, generateUUID, generateRecoveryKey, generateInviteCode } from '../services/crypto';
import { reminderScheduler } from '../services/reminderScheduler';
import { DEMO_SEED_DATA } from '../services/seedData';
import { emailService } from '../services/emailService';
import { serverStorage } from '../services/serverStorage';

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

  // SuperAdmin Portal State
  isSuperAdminAuthenticated: boolean;
  setSuperAdminAuthenticated: (val: boolean) => void;

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
  loginWithOrg: (
    orgIdentifier: string,
    email: string,
    password?: string,
    otpCode?: string
  ) => Promise<{ success: boolean; needsPasswordSet?: boolean; error?: string }>;
  registerOrganizationWithAdmin: (
    orgData: { name: string; description?: string; logo?: string },
    adminData: { name: string; email: string; password?: string; title?: string }
  ) => Promise<{ success: boolean; inviteCode?: string; error?: string }>;
  setPassword: (userId: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (googleUser: {
    email: string;
    name: string;
    avatar?: string;
    googleId?: string;
  }) => Promise<{ success: boolean; error?: string; isNewUser?: boolean; recoveryKey?: string }>;
  register: (name: string, email: string, password: string, avatar?: string, title?: string) => Promise<{ success: boolean; error?: string; recoveryKey?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  recoverPassword: (email: string, recoveryKey: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: {
    name?: string;
    avatar?: string;
    avatarPreset?: string;
    title?: string;
    bio?: string;
    emailPrivacy?: EmailPrivacyLevel;
    notificationSettings?: {
      emailNotifications: boolean;
      assignmentAlerts: boolean;
      deadlineAlerts: boolean;
      desktopAlerts: boolean;
    };
  }) => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;

  // Organization Actions
  switchOrganization: (orgId: string) => void;
  createOrganization: (name: string, description: string, logo?: string) => Promise<Organization>;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => Promise<void>;
  deleteOrganization: (orgId: string) => Promise<void>;
  toggleOrganizationStatus: (orgId: string, status: 'active' | 'inactive') => Promise<void>;
  joinOrganizationWithCode: (inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  removeMemberFromOrg: (orgId: string, userId: string) => Promise<void>;
  changeMemberRole: (orgId: string, userId: string, newRole: UserRole) => Promise<void>;
  leaveOrganization: (orgId: string) => Promise<void>;

  // SuperAdmin Operations
  toggleUserStatus: (userId: string, status: 'active' | 'inactive') => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addMemberToAnyOrg: (orgId: string, userId: string, role: UserRole) => Promise<void>;
  removeMemberFromAnyOrg: (orgId: string, userId: string) => Promise<void>;
  superAdminLogin: (passkey: string) => Promise<{ success: boolean; error?: string }>;
  clearAllLogs: () => Promise<void>;
  loadDemoData: () => Promise<void>;

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
  deleteComment: (id: string, permanent?: boolean) => Promise<void>;
  toggleCommentReaction: (commentId: string, emoji: string) => Promise<void>;

  // Activity Actions
  logActivity: (action: Activity['action'], details: string, taskId?: string, projectId?: string, oldValue?: string, newValue?: string) => void;

  // Notification Actions
  addNotification: (title: string, message: string, taskId?: string, type?: AppNotification['type'], targetUserId?: string) => void;
  notifyUsers: (targetUserIds: string[], title: string, message: string, taskId?: string, type?: AppNotification['type']) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;
  notifyInvitedUser: (email: string, orgName: string, inviteCode: string, role: string) => void;

  // Cloud Sync Actions
  syncWithServer: () => Promise<void>;

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

  // Synchronize to Hostinger Server: data/{company}/xxx.json
  const currentOrg = state.organizations.find((o) => o.id === state.currentOrgId) || state.organizations[0];
  if (currentOrg && currentOrg.name) {
    serverStorage.writeCompanyData(currentOrg.name, db).catch((err) => {
      console.warn('[ServerSync] Background remote sync error:', err);
    });
  }
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
  isSuperAdminAuthenticated: false,
  setSuperAdminAuthenticated: (val) => set({ isSuperAdminAuthenticated: val }),

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
    accentColor: '#0080fa',
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
      const currentUserId = db.session?.currentUserId || null;
      const currentOrgId = db.session?.currentOrgId || (currentUserId && db.organizations.length > 0 ? db.organizations[0].id : null);

      // Apply theme to document
      if (db.preferences?.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Apply accent color to document
      const accent = db.preferences?.accentColor || '#0080fa';
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
          accentColor: '#0080fa',
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

      // Trigger initial server synchronization to fetch latest company data & members
      setTimeout(() => {
        get().syncWithServer().catch(() => {});
      }, 500);

      // Auto-sync when window gains focus or on periodic 25s interval
      if (typeof window !== 'undefined' && !(window as any).__taskflow_sync_attached) {
        (window as any).__taskflow_sync_attached = true;
        window.addEventListener('focus', () => {
          get().syncWithServer().catch(() => {});
        });
        setInterval(() => {
          get().syncWithServer().catch(() => {});
        }, 25000);
      }
    } catch (err) {
      console.error('Initialization error:', err);
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveTaskId: (id) => set({ activeTaskId: id }),
  setCreateTaskOpen: (open) => {
    set({ isCreateTaskOpen: open });
    if (open) {
      set({ activeTab: 'create_task' });
    }
  },
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

  loginWithOrg: async (orgIdentifier, email, password, otpCode) => {
    const cleanOrg = orgIdentifier.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Match organization by invite code, name, or id in local memory
    let org = get().organizations.find(
      (o) =>
        o.inviteCode.toLowerCase() === cleanOrg ||
        o.name.toLowerCase() === cleanOrg ||
        o.id.toLowerCase() === cleanOrg
    );

    // 2. If not found locally, query Hostinger server storage (data/{company}/...)
    if (!org) {
      const serverOrg = await serverStorage.lookupOrganization(cleanOrg);
      if (serverOrg.success && serverOrg.organization) {
        const serverDataRes = await serverStorage.readCompanyData(serverOrg.organization.slug || serverOrg.organization.name);
        if (serverDataRes.success && serverDataRes.data) {
          const sData = serverDataRes.data;
          set({
            users: [...get().users, ...(sData.users || [])],
            organizations: [...get().organizations, ...(sData.organizations || [])],
            projects: [...get().projects, ...(sData.projects || [])],
            tasks: [...get().tasks, ...(sData.tasks || [])],
            comments: [...get().comments, ...(sData.comments || [])],
            activities: [...get().activities, ...(sData.activities || [])],
            notifications: [...get().notifications, ...(sData.notifications || [])],
          });
          org = sData.organizations?.[0] || get().organizations.find(
            (o) =>
              o.inviteCode.toLowerCase() === cleanOrg ||
              o.name.toLowerCase() === cleanOrg ||
              o.id.toLowerCase() === cleanOrg
          );
        }
      }
    }

    if (!org) {
      return {
        success: false,
        error: `Workspace "${orgIdentifier}" was not found. Please verify the Organization Name or Invite Code.`,
      };
    }

    // Flow 1: OTP Login
    if (otpCode) {
      const verify = emailService.verifyOTP(cleanEmail, otpCode);
      if (!verify.valid) {
        return { success: false, error: verify.error || 'Invalid or expired OTP verification code.' };
      }

      let user = get().users.find((u) => u.email.toLowerCase() === cleanEmail);
      let users = [...get().users];
      let orgs = [...get().organizations];
      let isBrandNew = false;

      if (!user) {
        // Create user
        isBrandNew = true;
        const dummyPass = await hashPassword(generateUUID());
        user = {
          id: 'usr_' + generateUUID().slice(0, 8),
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          passwordHash: dummyPass,
          recoveryKey: generateRecoveryKey(),
          title: 'Team Member',
          status: 'active',
          avatarPreset: '',
          createdAt: new Date().toISOString(),
        };
        users.push(user);
      }

      // Ensure user is added to organization
      const isMember = org.members.some((m) => m.userId === user!.id);
      let newActivities = [...get().activities];
      let newNotifications = [...get().notifications];

      if (!isMember) {
        const assignedRole = (org.settings?.defaultRole || 'member') as UserRole;
        orgs = orgs.map((o) =>
          o.id === org.id
            ? {
                ...o,
                members: [
                  ...o.members,
                  { userId: user!.id, role: assignedRole, joinedAt: new Date().toISOString() },
                ],
              }
            : o
        );

        // Record Join Activity
        const joinAct: Activity = {
          id: 'act_' + generateUUID().slice(0, 8),
          organizationId: org.id,
          userId: user.id,
          action: 'joined_workspace',
          details: `${user.name} accepted invitation and joined workspace`,
          createdAt: new Date().toISOString(),
        };
        newActivities = [joinAct, ...newActivities];

        // Notify Admins
        const orgAdmins = org.members.filter((m) => m.role === 'owner' || m.role === 'admin');
        orgAdmins.forEach((adm) => {
          newNotifications.unshift({
            id: 'notif_' + generateUUID().slice(0, 8),
            userId: adm.userId,
            title: 'Invitation Accepted 🎉',
            message: `${user.name} (${user.email}) accepted your invitation and joined ${org.name}.`,
            type: 'system',
            read: false,
            createdAt: new Date().toISOString(),
          });
        });

        // Welcome Notification for Joining User
        newNotifications.unshift({
          id: 'notif_' + generateUUID().slice(0, 8),
          userId: user.id,
          title: `Welcome to ${org.name}!`,
          message: `You have successfully joined ${org.name} as ${assignedRole}.`,
          type: 'system',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      set({
        users,
        organizations: orgs,
        activities: newActivities,
        notifications: newNotifications,
        currentUserId: user.id,
        currentOrgId: org.id,
      });

      await syncToIPC(get);
      return { success: true, needsPasswordSet: isBrandNew || true };
    }

    // Flow 2: Password Login
    if (!password) {
      return { success: false, error: 'Please enter your password, or use "Login with Email OTP".' };
    }

    const user = get().users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return {
        success: false,
        error: `No account found for "${cleanEmail}" in ${org.name}. Try logging in with Email OTP or register.`,
      };
    }

    const isMember = org.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return {
        success: false,
        error: `Account "${cleanEmail}" does not belong to ${org.name}.`,
      };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Incorrect password entered.' };
    }

    set({ currentUserId: user.id, currentOrgId: org.id });
    await syncToIPC(get);
    return { success: true };
  },

  registerOrganizationWithAdmin: async (orgData, adminData) => {
    const cleanOrgName = orgData.name.trim();
    const cleanEmail = adminData.email.trim().toLowerCase();

    if (!cleanOrgName) {
      return { success: false, error: 'Organization name is required.' };
    }
    if (!adminData.name.trim() || !cleanEmail) {
      return { success: false, error: 'Full name and email are required.' };
    }

    let user = get().users.find((u) => u.email.toLowerCase() === cleanEmail);
    let users = [...get().users];
    const passwordHash = adminData.password
      ? await hashPassword(adminData.password)
      : await hashPassword(generateUUID());
    const recoveryKey = generateRecoveryKey();

    if (!user) {
      user = {
        id: 'usr_' + generateUUID().slice(0, 8),
        name: adminData.name.trim(),
        email: cleanEmail,
        passwordHash,
        recoveryKey,
        title: adminData.title?.trim() || 'Workspace Owner',
        avatarPreset: '',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      users.push(user);
    } else if (adminData.password) {
      users = users.map((u) => (u.id === user!.id ? { ...u, passwordHash } : u));
    }

    // Generate Invite Code
    const prefix = cleanOrgName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'TF';
    const inviteCode = `TF-${prefix}${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrg: Organization = {
      id: 'org_' + generateUUID().slice(0, 8),
      name: cleanOrgName,
      logo: orgData.logo || '',
      description: orgData.description?.trim() || `${cleanOrgName} Workspace`,
      inviteCode,
      status: 'active',
      members: [{ userId: user.id, role: 'owner', joinedAt: new Date().toISOString() }],
      settings: { defaultRole: 'member', allowMemberInvites: true },
      createdAt: new Date().toISOString(),
    };

    // Default Starter Project
    const starterProject: Project = {
      id: 'prj_' + generateUUID().slice(0, 8),
      organizationId: newOrg.id,
      name: 'General Deliverables',
      description: 'Default project tracking workspace deliverables.',
      icon: 'Layers',
      color: '#0080fa',
      ownerId: user.id,
      memberIds: [user.id],
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    set({
      users,
      organizations: [...get().organizations, newOrg],
      projects: [...get().projects, starterProject],
      currentUserId: user.id,
      currentOrgId: newOrg.id,
    });

    await syncToIPC(get);
    return { success: true, inviteCode };
  },

  setPassword: async (userId, newPass) => {
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    const passwordHash = await hashPassword(newPass);
    const updatedUsers = get().users.map((u) =>
      u.id === userId ? { ...u, passwordHash } : u
    );
    set({ users: updatedUsers });
    await syncToIPC(get);
    return { success: true };
  },

  loginWithGoogle: async (googleUser) => {
    const cleanEmail = googleUser.email.trim().toLowerCase();
    const existing = get().users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      // Existing user: log in directly
      const userOrg = get().organizations.find((o) => o.members.some((m) => m.userId === existing.id));
      const orgId = userOrg ? userOrg.id : (get().organizations[0]?.id || null);
      
      // Update avatar if provided and not set
      if (googleUser.avatar && !existing.avatar) {
        const updatedUsers = get().users.map((u) =>
          u.id === existing.id ? { ...u, avatar: googleUser.avatar } : u
        );
        set({ users: updatedUsers });
      }

      set({ currentUserId: existing.id, currentOrgId: orgId });
      await syncToIPC(get);
      return { success: true, isNewUser: false };
    }

    // New Google User: Register automatically
    const dummyPass = generateUUID();
    const passwordHash = await hashPassword(dummyPass);
    const recoveryKey = generateRecoveryKey();

    const newUser: User = {
      id: 'usr_' + generateUUID().slice(0, 8),
      name: googleUser.name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      passwordHash,
      avatar: googleUser.avatar,
      recoveryKey,
      title: 'Team Member',
      status: 'active',
      emailPrivacy: 'team_only',
      createdAt: new Date().toISOString(),
    };

    let orgs = [...get().organizations];
    let currentOrgId = get().currentOrgId;

    if (orgs.length === 0) {
      const defaultOrg: Organization = {
        id: 'org_' + generateUUID().slice(0, 8),
        name: `${newUser.name.split(' ')[0]}'s Workspace`,
        logo: '',
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
    return { success: true, isNewUser: true, recoveryKey };
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

  createOrganization: async (name, description, logo = '') => {
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

  deleteOrganization: async (orgId) => {
    const updated = get().organizations.filter((o) => o.id !== orgId);
    const updatedProjects = get().projects.filter((p) => p.organizationId !== orgId);
    const updatedTasks = get().tasks.filter((t) => t.organizationId !== orgId);
    const nextOrg = updated[0]?.id || null;
    set({
      organizations: updated,
      projects: updatedProjects,
      tasks: updatedTasks,
      currentOrgId: nextOrg,
    });
    await syncToIPC(get);
  },

  toggleOrganizationStatus: async (orgId, status) => {
    const updated = get().organizations.map((o) =>
      o.id === orgId ? { ...o, status } : o
    );
    set({ organizations: updated });
    await syncToIPC(get);
  },

  toggleUserStatus: async (userId, status) => {
    const updated = get().users.map((u) =>
      u.id === userId ? { ...u, status } : u
    );
    set({ users: updated });
    await syncToIPC(get);
  },

  deleteUser: async (userId) => {
    const updatedUsers = get().users.filter((u) => u.id !== userId);
    // Remove user from all orgs
    const updatedOrgs = get().organizations.map((o) => ({
      ...o,
      members: o.members.filter((m) => m.userId !== userId),
    }));
    set({ users: updatedUsers, organizations: updatedOrgs });
    await syncToIPC(get);
  },

  addMemberToAnyOrg: async (orgId, userId, role) => {
    const updatedOrgs = get().organizations.map((o) => {
      if (o.id === orgId) {
        const filtered = o.members.filter((m) => m.userId !== userId);
        return {
          ...o,
          members: [...filtered, { userId, role, joinedAt: new Date().toISOString() }],
        };
      }
      return o;
    });
    set({ organizations: updatedOrgs });
    await syncToIPC(get);
  },

  removeMemberFromAnyOrg: async (orgId, userId) => {
    await get().removeMemberFromOrg(orgId, userId);
  },

  superAdminLogin: async (passkey) => {
    // Master passkey or matching superadmin password
    if (passkey.trim() === 'superadmin123' || passkey.trim() === 'password123' || passkey.trim() === 'admin2026') {
      set({ isSuperAdminAuthenticated: true });
      return { success: true };
    }
    return { success: false, error: 'Invalid SuperAdmin passkey' };
  },

  clearAllLogs: async () => {
    set({ activities: [] });
    await syncToIPC(get);
  },

  loadDemoData: async () => {
    set({
      users: DEMO_SEED_DATA.users,
      organizations: DEMO_SEED_DATA.organizations,
      projects: DEMO_SEED_DATA.projects,
      tasks: DEMO_SEED_DATA.tasks,
      comments: DEMO_SEED_DATA.comments,
      activities: DEMO_SEED_DATA.activities,
      notifications: DEMO_SEED_DATA.notifications,
      currentUserId: DEMO_SEED_DATA.session.currentUserId,
      currentOrgId: DEMO_SEED_DATA.session.currentOrgId,
    });
    await syncToIPC(get);
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
    const assigneesToNotify = newTask.assignedTo.filter((id) => id !== uid);
    if (assigneesToNotify.length > 0) {
      get().notifyUsers(
        assigneesToNotify,
        'New Task Assigned 📋',
        `You have been assigned to "${newTask.title}".`,
        newTask.id,
        'assignment'
      );
    }

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

    // Notify task creator, other assignees, and organization admins
    const currentUid = get().currentUserId;
    const currentUserName = get().users.find((u) => u.id === currentUid)?.name || 'Team member';
    const currentOrg = get().organizations.find((o) => o.id === get().currentOrgId);
    const adminIds = (currentOrg?.members || [])
      .filter((m) => m.role === 'owner' || m.role === 'admin')
      .map((m) => m.userId);

    const targetRecipients = [
      task.createdBy,
      ...(task.assignedTo || []),
      ...adminIds,
    ];

    if (status === 'completed') {
      get().notifyUsers(
        targetRecipients,
        `Task Completed ✅: "${task.title}"`,
        `${currentUserName} completed the task "${task.title}".`,
        id,
        'system'
      );
    } else {
      get().notifyUsers(
        targetRecipients,
        `Task Status: ${status.replace(/_/g, ' ')}`,
        `${currentUserName} moved "${task.title}" to ${status.replace(/_/g, ' ')}.`,
        id,
        'system'
      );
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
    const task = get().tasks.find((t) => t.id === id);
    const uid = get().currentUserId;
    const org = get().organizations.find((o) => o.id === get().currentOrgId);
    const member = org?.members.find((m) => m.userId === uid);
    const isOwnerOrAdmin = member?.role === 'owner' || member?.role === 'admin' || get().users.find((u) => u.id === uid)?.isSuperAdmin;
    const isTaskCreator = task?.createdBy === uid;

    // RBAC: Workspace Admin/Owner OR Task Creator can delete
    if (!isOwnerOrAdmin && !isTaskCreator) {
      console.warn('[deleteTask] Denied: Only task creator or workspace admin can delete tasks.');
      return;
    }

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

    // Notify task creator, assignees, mentioned users, and workspace admins
    const task = get().tasks.find((t) => t.id === taskId);
    if (task) {
      const currentOrg = get().organizations.find((o) => o.id === get().currentOrgId);
      const adminIds = (currentOrg?.members || [])
        .filter((m) => m.role === 'owner' || m.role === 'admin')
        .map((m) => m.userId);

      // Parent comment author if reply
      const parentComment = parentId ? get().comments.find((c) => c.id === parentId) : null;
      const parentAuthorId = parentComment ? parentComment.userId : null;

      // Find mentioned users (@name)
      const mentionedUserIds = get().users
        .filter((u) => {
          const handle = `@${u.name.replace(/\s+/g, '')}`;
          return content.includes(handle) || content.toLowerCase().includes(`@${u.name.toLowerCase()}`);
        })
        .map((u) => u.id);

      const targetRecipients = [
        task.createdBy,
        ...(task.assignedTo || []),
        ...(parentAuthorId ? [parentAuthorId] : []),
        ...mentionedUserIds,
        ...adminIds,
      ];

      const commenterName = get().users.find((u) => u.id === uid)?.name || 'Team member';
      const cleanSnippet = content.length > 60 ? content.slice(0, 57) + '...' : content;

      get().notifyUsers(
        targetRecipients,
        parentId ? `Thread Reply on "${task.title}" 💬` : `New Comment on "${task.title}" 💬`,
        `${commenterName}: "${cleanSnippet}"`,
        taskId,
        parentId ? 'reply' : 'comment'
      );
    }

    await syncToIPC(get);
    return newComment;
  },

  editComment: async (id, content) => {
    const updated = get().comments.map((c) =>
      c.id === id ? { ...c, content, isEdited: true, updatedAt: new Date().toISOString() } : c
    );
    set({ comments: updated });
    await syncToIPC(get);
  },

  deleteComment: async (id, permanent = false) => {
    if (permanent) {
      set({ comments: get().comments.filter((c) => c.id !== id && c.parentId !== id) });
    } else {
      // Soft-delete: preserve message thread context and show "This message was deleted"
      const updated = get().comments.map((c) =>
        c.id === id ? { ...c, isDeleted: true, updatedAt: new Date().toISOString() } : c
      );
      set({ comments: updated });
    }
    await syncToIPC(get);
  },

  toggleCommentReaction: async (commentId, emoji) => {
    const uid = get().currentUserId;
    if (!uid) return;

    const updated = get().comments.map((c) => {
      if (c.id !== commentId) return c;
      const reactions = c.reactions || [];
      const existingIdx = reactions.findIndex((r) => r.emoji === emoji);

      let newReactions = [...reactions];
      if (existingIdx >= 0) {
        const existing = newReactions[existingIdx];
        if (existing.userIds.includes(uid)) {
          const filtered = existing.userIds.filter((u) => u !== uid);
          if (filtered.length === 0) {
            newReactions.splice(existingIdx, 1);
          } else {
            newReactions[existingIdx] = { ...existing, userIds: filtered };
          }
        } else {
          newReactions[existingIdx] = { ...existing, userIds: [...existing.userIds, uid] };
        }
      } else {
        newReactions.push({ emoji, userIds: [uid] });
      }

      return { ...c, reactions: newReactions };
    });

    set({ comments: updated });
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
  addNotification: (title, message, taskId, type = 'system', targetUserId?: string) => {
    const recipientId = targetUserId || get().currentUserId;
    if (!recipientId) return;

    const notif: AppNotification = {
      id: 'notif_' + generateUUID().slice(0, 8),
      userId: recipientId,
      title,
      message,
      taskId,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set({ notifications: [notif, ...get().notifications] });

    // Send native desktop OS toast notification if for the active user on this machine
    if (recipientId === get().currentUserId) {
      const desktopEnabled = get().preferences?.desktopNotificationsEnabled ?? true;
      if (desktopEnabled) {
        ipcBridge.notifications.send({ title, message, taskId }).catch(() => {});
      }
    }
  },

  notifyUsers: (targetUserIds, title, message, taskId, type = 'system') => {
    const currentUid = get().currentUserId;
    // Collect unique recipients, omitting empty ids
    const recipients = Array.from(new Set(targetUserIds.filter((id) => id && id.trim().length > 0)));
    if (recipients.length === 0) return;

    const newNotifs: AppNotification[] = recipients.map((targetId) => ({
      id: 'notif_' + generateUUID().slice(0, 8),
      userId: targetId,
      title,
      message,
      taskId,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    }));

    set({ notifications: [...newNotifs, ...get().notifications] });

    // If current user is in the recipient list, fire desktop toast
    if (currentUid && recipients.includes(currentUid)) {
      const desktopEnabled = get().preferences?.desktopNotificationsEnabled ?? true;
      if (desktopEnabled) {
        ipcBridge.notifications.send({ title, message, taskId }).catch(() => {});
      }
    }
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
    
    // Smooth transition from top-right corner to bottom-left
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        get().updatePreferences({ theme: next });
      });
    } else {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('theme-transitioning');
        setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 500);
      }
      get().updatePreferences({ theme: next });
    }
  },

  notifyInvitedUser: (email, orgName, inviteCode, role) => {
    const clean = email.trim().toLowerCase();
    const existingUser = get().users.find((u) => u.email.toLowerCase() === clean);
    const notifId = 'notif_' + generateUUID().slice(0, 8);
    const notif: AppNotification = {
      id: notifId,
      userId: existingUser ? existingUser.id : 'pending_' + clean,
      title: 'Workspace Invitation 📩',
      message: `You have been invited to join "${orgName}" as ${role}. Use Invite Code "${inviteCode}" to join!`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    };

    const act: Activity = {
      id: 'act_' + generateUUID().slice(0, 8),
      organizationId: get().currentOrgId || '',
      userId: get().currentUserId || '',
      action: 'created',
      details: `Dispatched workspace invitation to ${email} (${role})`,
      createdAt: new Date().toISOString(),
    };

    set({
      notifications: [notif, ...get().notifications],
      activities: [act, ...get().activities],
    });
    syncToIPC(get);
  },

  syncWithServer: async () => {
    const state = get();
    const currentOrg = state.organizations.find((o) => o.id === state.currentOrgId) || state.organizations[0];
    if (!currentOrg || !currentOrg.name) return;

    try {
      const serverRes = await serverStorage.readCompanyData(currentOrg.slug || currentOrg.name);
      if (!serverRes.success || !serverRes.data) return;

      const remote = serverRes.data;

      // 1. Merge users
      const userMap = new Map<string, User>();
      (remote.users || []).forEach((u) => userMap.set(u.id, u));
      get().users.forEach((u) => {
        userMap.set(u.id, { ...userMap.get(u.id), ...u });
      });
      const mergedUsers = Array.from(userMap.values());

      // 2. Merge organizations (merge members list!)
      const orgMap = new Map<string, Organization>();
      (remote.organizations || []).forEach((o) => orgMap.set(o.id, o));
      get().organizations.forEach((localOrg) => {
        const remoteOrg = orgMap.get(localOrg.id);
        if (remoteOrg) {
          const memberMap = new Map<string, OrganizationMember>();
          (remoteOrg.members || []).forEach((m) => memberMap.set(m.userId, m));
          (localOrg.members || []).forEach((m) => {
            if (!memberMap.has(m.userId)) {
              memberMap.set(m.userId, m);
            }
          });
          orgMap.set(localOrg.id, {
            ...remoteOrg,
            ...localOrg,
            logo: localOrg.logo || remoteOrg.logo,
            members: Array.from(memberMap.values()),
          });
        } else {
          orgMap.set(localOrg.id, localOrg);
        }
      });
      const mergedOrgs = Array.from(orgMap.values());

      // 3. Merge tasks
      const taskMap = new Map<string, Task>();
      (remote.tasks || []).forEach((t) => taskMap.set(t.id, t));
      get().tasks.forEach((t) => taskMap.set(t.id, { ...taskMap.get(t.id), ...t }));
      const mergedTasks = Array.from(taskMap.values());

      // 4. Merge projects
      const projMap = new Map<string, Project>();
      (remote.projects || []).forEach((p) => projMap.set(p.id, p));
      get().projects.forEach((p) => projMap.set(p.id, { ...projMap.get(p.id), ...p }));
      const mergedProjects = Array.from(projMap.values());

      // 5. Merge activities
      const actMap = new Map<string, Activity>();
      (get().activities || []).forEach((a) => actMap.set(a.id, a));
      (remote.activities || []).forEach((a) => {
        if (!actMap.has(a.id)) {
          actMap.set(a.id, a);
        }
      });
      const mergedActivities = Array.from(actMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // 6. Merge notifications & detect newly arrived alerts for current user
      const notifMap = new Map<string, AppNotification>();
      (get().notifications || []).forEach((n) => notifMap.set(n.id, n));
      const myId = get().currentUserId;
      const newlyArrivedForMe: AppNotification[] = [];

      (remote.notifications || []).forEach((n) => {
        if (!notifMap.has(n.id)) {
          notifMap.set(n.id, n);
          if (myId && n.userId === myId && !n.read) {
            newlyArrivedForMe.push(n);
          }
        }
      });
      const mergedNotifs = Array.from(notifMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // 7. Merge comments
      const commMap = new Map<string, Comment>();
      (remote.comments || []).forEach((c) => commMap.set(c.id, c));
      get().comments.forEach((c) => commMap.set(c.id, c));
      const mergedComments = Array.from(commMap.values());

      set({
        users: mergedUsers,
        organizations: mergedOrgs,
        tasks: mergedTasks,
        projects: mergedProjects,
        activities: mergedActivities,
        notifications: mergedNotifs,
        comments: mergedComments,
      });

      // Dispatch native desktop notification for newly arrived alerts on this machine
      if (newlyArrivedForMe.length > 0) {
        const desktopEnabled = get().preferences?.desktopNotificationsEnabled ?? true;
        if (desktopEnabled) {
          const newest = newlyArrivedForMe[0];
          const summary = newlyArrivedForMe.length > 1
            ? `${newest.message} (+${newlyArrivedForMe.length - 1} more updates)`
            : newest.message;

          ipcBridge.notifications.send({
            title: newest.title,
            message: summary,
            taskId: newest.taskId,
          }).catch(() => {});
        }
      }

      // Update local storage
      const db: DatabaseSchema = {
        users: mergedUsers,
        organizations: mergedOrgs,
        projects: mergedProjects,
        tasks: mergedTasks,
        comments: mergedComments,
        activities: mergedActivities,
        notifications: mergedNotifs,
        preferences: get().preferences,
        session: {
          currentUserId: get().currentUserId,
          currentOrgId: get().currentOrgId,
          rememberMe: get().preferences.dockBadge,
        },
      };
      await ipcBridge.database.saveAll(db);
    } catch (err) {
      console.warn('[syncWithServer] Error:', err);
    }
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
