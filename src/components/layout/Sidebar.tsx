import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { NavigationTab } from '../../types';
import { OrgLogo, DNLogo } from '../common/DNLogo';
import {
  LayoutDashboard,
  CheckSquare,
  Kanban,
  ListOrdered,
  Calendar,
  AlertCircle,
  FolderKanban,
  Users,
  Settings,
  Plus,
  ChevronDown,
  Layers,
  Sparkles,
  Building2,
  KeyRound,
  Check,
  Activity as ActivityIcon,
  ShieldAlert,
  Pencil,
} from 'lucide-react';
import { motion } from 'motion/react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    organizations,
    currentOrgId,
    switchOrganization,
    projects,
    selectedProjectId,
    selectProject,
    tasks,
    users,
    currentUserId,
    preferences,
    setCreateProjectOpen,
    setEditingProject,
    setSettingsOpen,
  } = useTaskFlowStore();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isJoinOrgOpen, setIsJoinOrgOpen] = useState(false);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newOrgLogo, setNewOrgLogo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const currentOrg = organizations.find((o) => o.id === currentOrgId) || organizations[0];
  const currentMember = currentOrg?.members?.find((m) => m.userId === currentUserId);
  const currentUser = users.find((u) => u.id === currentUserId);
  const isOrgAdminOrOwner = currentMember?.role === 'owner' || currentMember?.role === 'admin' || currentUser?.isSuperAdmin;

  // Counts
  const orgTasks = tasks.filter((t) => t.organizationId === currentOrgId && !t.isArchived);
  const myTasksCount = orgTasks.filter((t) => t.assignedTo.includes(currentUserId || '') && t.status !== 'completed').length;
  const overdueCount = orgTasks.filter((t) => {
    if (t.status === 'completed' || !t.dueDate) return false;
    return new Date(t.dueDate).getTime() < Date.now();
  }).length;

  const orgProjects = projects.filter((p) => {
    if (p.organizationId !== currentOrgId) return false;
    if (isOrgAdminOrOwner) return true;
    return (
      p.ownerId === currentUserId ||
      (p.memberIds && p.memberIds.includes(currentUserId || '')) ||
      orgTasks.some((t) => t.projectId === p.id && t.assignedTo.includes(currentUserId || ''))
    );
  });

  const allNavItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my_tasks', label: 'My Tasks', icon: CheckSquare, badge: myTasksCount },
    { id: 'board', label: 'Board', icon: Kanban },
    { id: 'all_tasks', label: 'All Tasks', icon: ListOrdered },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'overdue', label: 'Overdue', icon: AlertCircle, badge: overdueCount },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'logs', label: 'Activity Logs', icon: ActivityIcon },
  ];

  const navItems = allNavItems.filter((item) => {
    if (item.id === 'members' && !isOrgAdminOrOwner) return false;
    return true;
  });

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    const res = await useTaskFlowStore.getState().joinOrganizationWithCode(inviteCodeInput);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to join');
    } else {
      setIsJoinOrgOpen(false);
      setIsOrgDropdownOpen(false);
      setInviteCodeInput('');
      setErrorMsg('');
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    await useTaskFlowStore.getState().createOrganization(newOrgName, newOrgDesc, newOrgLogo);
    setIsCreateOrgOpen(false);
    setIsOrgDropdownOpen(false);
    setNewOrgName('');
    setNewOrgDesc('');
  };

  return (
    <aside className="w-64 glass-panel border-r border-black/5 dark:border-white/5 flex flex-col shrink-0 select-none overflow-hidden h-[calc(100vh-3rem)] transition-all">
      {/* Workspace Switcher */}
      <div className="p-3 border-b border-black/5 dark:border-white/5 relative">
        <button
          onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <OrgLogo name={currentOrg?.name} logo={currentOrg?.logo} size="md" />
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {currentOrg?.name || 'My Organization'}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {isOrgAdminOrOwner
                  ? `${currentOrg?.members?.length || 1} team members`
                  : currentMember?.role === 'admin'
                  ? 'Workspace Admin'
                  : 'Workspace Member'}
              </p>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform shrink-0" />
        </button>

        {/* Workspace Dropdown */}
        {isOrgDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsOrgDropdownOpen(false);
                setIsJoinOrgOpen(false);
                setIsCreateOrgOpen(false);
              }}
            />
            <div className="absolute top-14 left-3 right-3 glass-dropdown rounded-xl p-2 z-50 shadow-2xl text-xs space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Workspaces
              </div>
              <div className="max-h-44 overflow-y-auto space-y-0.5">
                {organizations.map((org) => {
                  const isSelected = org.id === currentOrgId;
                  return (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setIsOrgDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <OrgLogo name={org.name} logo={org.logo} size="xs" />
                        <span className="truncate">{org.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5 mt-1 border-t border-black/5 dark:border-white/5 space-y-1">
                <button
                  onClick={() => {
                    setIsCreateOrgOpen(true);
                    setIsJoinOrgOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-left transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                  <span>Create Workspace</span>
                </button>
                <button
                  onClick={() => {
                    setIsJoinOrgOpen(true);
                    setIsCreateOrgOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-left transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  <span>Join with Invite Code</span>
                </button>
              </div>

              {/* Inline Join Code Form */}
              {isJoinOrgOpen && (
                <form onSubmit={handleJoinOrg} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg mt-1 space-y-2">
                  <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    Enter Invite Code (e.g. TF-ACM892)
                  </p>
                  <input
                    type="text"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                    placeholder="TF-XXXXXX"
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono"
                    autoFocus
                  />
                  {errorMsg && <p className="text-[10px] text-rose-500">{errorMsg}</p>}
                  <div className="flex gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsJoinOrgOpen(false)}
                      className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md"
                    >
                      Join
                    </button>
                  </div>
                </form>
              )}

              {/* Inline Create Org Form */}
              {isCreateOrgOpen && (
                <form onSubmit={handleCreateOrg} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg mt-1 space-y-2">
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Workspace / Company Name"
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newOrgDesc}
                    onChange={(e) => setNewOrgDesc(e.target.value)}
                    placeholder="Short description (optional)"
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsCreateOrgOpen(false)}
                      className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      {/* Primary Navigation Tabs */}
      <div className="p-2 space-y-0.5 overflow-y-auto flex-1">
        <div className="px-1 pb-2">
          <button
            onClick={() => {
              selectProject(null);
              setActiveTab('create_task');
            }}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold shadow-xs transition-all ${
              activeTab === 'create_task'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>

        <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Views
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && selectedProjectId === null;
          return (
            <button
              key={item.id}
              onClick={() => {
                selectProject(null);
                setActiveTab(item.id);
              }}
              style={
                isActive
                  ? {
                      color: preferences.accentColor || '#0080fa',
                      backgroundColor: `${preferences.accentColor || '#0080fa'}18`,
                    }
                  : undefined
              }
              className={`w-full relative flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  style={isActive ? { color: preferences.accentColor || '#0080fa' } : undefined}
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? '' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Projects Section */}
        <div className="pt-4 pb-1">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Projects ({orgProjects.length})
            </span>
            <button
              onClick={() => setCreateProjectOpen(true)}
              title="Add New Project"
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5 mt-1">
            {orgProjects.map((proj) => {
              const isSelected = selectedProjectId === proj.id;
              const count = orgTasks.filter((t) => t.projectId === proj.id && t.status !== 'completed').length;
              return (
                <div
                  key={proj.id}
                  style={
                    isSelected
                      ? {
                          color: preferences.accentColor || '#0080fa',
                          backgroundColor: `${preferences.accentColor || '#0080fa'}18`,
                        }
                      : undefined
                  }
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all group ${
                    isSelected
                      ? 'font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      selectProject(proj.id);
                      setActiveTab('board');
                    }}
                    className="flex items-center gap-2.5 truncate flex-1 text-left cursor-pointer"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: proj.color || '#6366f1' }}
                    />
                    <span className="truncate">{proj.name}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject(proj);
                      }}
                      title="View & Edit Project Details"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}

            {orgProjects.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-slate-400 text-center italic">
                No projects yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Preferences / Settings */}
      <div className="p-3 border-t border-black/5 dark:border-white/5 space-y-1">
        <button
          onClick={() => setSettingsOpen(true, 'profile')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
