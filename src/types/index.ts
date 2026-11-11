/**
 * TaskFlow Desktop - Core Data Models & IPC Types
 * Local-First Desktop Task Management Application
 */

export type UserRole = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  recoveryKey: string;
  title?: string;
  createdAt: string;
}

export interface OrganizationMember {
  userId: string;
  role: UserRole;
  joinedAt: string;
}

export interface OrganizationSettings {
  defaultRole: UserRole;
  allowMemberInvites: boolean;
}

export interface Organization {
  id: string;
  name: string;
  logo?: string;
  description: string;
  inviteCode: string;
  members: OrganizationMember[];
  settings: OrganizationSettings;
  createdAt: string;
}

export type ProjectStatus = 'active' | 'completed' | 'archived' | 'on_hold';

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  ownerId: string;
  memberIds: string[];
  startDate: string;
  dueDate: string;
  status: ProjectStatus;
  createdAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string; // Base64 data URL or local filepath in storage
  uploadedAt: string;
  uploadedBy: string;
}

export interface Task {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description: string;
  assignedTo: string[]; // user IDs
  createdBy: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  dueDate: string;
  labels: string[];
  attachments: TaskAttachment[];
  estimatedTime?: string;
  remindersEnabled: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  parentId?: string; // For threaded replies
  attachments?: { name: string; url: string; size?: number }[];
  createdAt: string;
  updatedAt?: string;
}

export type ActivityAction =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'reassigned'
  | 'commented'
  | 'attachment_uploaded'
  | 'due_date_changed'
  | 'completed'
  | 'archived'
  | 'duplicated';

export interface Activity {
  id: string;
  organizationId: string;
  projectId?: string;
  taskId?: string;
  userId: string;
  action: ActivityAction;
  details: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export type NotificationType =
  | 'assignment'
  | 'comment'
  | 'reply'
  | 'deadline'
  | 'overdue'
  | 'hourly_reminder'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  taskId?: string;
  read: boolean;
  createdAt: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  accentColor: string; // e.g. '#5b8def'
  hourlyRemindersEnabled: boolean;
  reminderIntervalMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string;   // e.g. "08:00"
  soundEnabled: boolean;
  dockBadge: boolean;
  lastReminderCheck?: string;
}

export interface DatabaseSchema {
  users: User[];
  organizations: Organization[];
  projects: Project[];
  tasks: Task[];
  comments: Comment[];
  activities: Activity[];
  notifications: AppNotification[];
  preferences: UserPreferences;
  session: {
    currentUserId: string | null;
    currentOrgId: string | null;
    rememberMe: boolean;
  };
}

export type NavigationTab =
  | 'dashboard'
  | 'my_tasks'
  | 'all_tasks'
  | 'board'
  | 'calendar'
  | 'overdue'
  | 'projects'
  | 'members'
  | 'settings';
