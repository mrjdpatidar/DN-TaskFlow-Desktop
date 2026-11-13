import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { UserRole } from '../../types';
import { OrgLogo, DNLogo } from '../common/DNLogo';
import { Avatar } from '../common/Avatar';
import { useConfirmModal } from '../common/ConfirmModal';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users,
  Layers,
  CheckCircle2,
  Lock,
  KeyRound,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react';

export const SuperAdminView: React.FC = () => {
  const {
    isSuperAdminAuthenticated,
    setSuperAdminAuthenticated,
    superAdminLogin,
    organizations,
    users,
    projects,
    tasks,
    toggleOrganizationStatus,
    deleteOrganization,
    toggleUserStatus,
    deleteUser,
    addMemberToAnyOrg,
    removeMemberFromAnyOrg,
    changeMemberRole,
    createOrganization,
    loadDemoData,
    resetDatabaseToDefault,
  } = useTaskFlowStore();

  const [passkeyInput, setPasskeyInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<'orgs' | 'users' | 'system'>('orgs');
  const [searchQuery, setSearchQuery] = useState('');
  const { confirmAction } = useConfirmModal();

  // Expandable organization member manager
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [userToAdd, setUserToAdd] = useState('');
  const [roleToAdd, setRoleToAdd] = useState<UserRole>('member');

  // Quick Org Creator
  const [isNewOrgModalOpen, setIsNewOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newOrgLogo, setNewOrgLogo] = useState('');

  // If not authenticated, show superadmin login card
  if (!isSuperAdminAuthenticated) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      const res = await superAdminLogin(passkeyInput);
      if (!res.success) {
        setAuthError(res.error || 'Authentication failed');
      } else {
        setPasskeyInput('');
      }
    };

    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-radial-gradient">
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-blue-500/20 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              SuperAdmin Gateway
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Authorized administrator access for system-wide workspace management.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                placeholder="Enter SuperAdmin Passkey (e.g. admin2026)"
                className="w-full pl-10 pr-4 py-2.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/50 text-xs font-mono text-slate-800 dark:text-slate-200"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-500 font-medium">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md active:scale-98"
            >
              Verify Passkey & Enter Portal
            </button>
          </form>

          <p className="text-[11px] text-slate-400">
            Default test passkeys: <code className="text-blue-400">admin2026</code> or <code className="text-blue-400">password123</code>
          </p>
        </div>
      </div>
    );
  }

  // Metrics
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o) => o.status !== 'inactive').length;
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status !== 'inactive').length;
  const totalProjects = projects.length;
  const totalTasks = tasks.length;

  const handleAddMemberToOrg = (orgId: string) => {
    if (!userToAdd) return;
    addMemberToAnyOrg(orgId, userToAdd, roleToAdd);
    setUserToAdd('');
  };

  const handleCreateNewOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    await createOrganization(newOrgName, newOrgDesc, newOrgLogo);
    setNewOrgName('');
    setNewOrgDesc('');
    setIsNewOrgModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              SuperAdmin System Console
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage all organizations, active/inactive workspaces, member assignments, and storage status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSuperAdminAuthenticated(false)}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 transition-colors"
          >
            Lock Console
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Organizations</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalOrgs}
          </div>
          <div className="text-[10px] text-emerald-500 font-medium mt-1">
            {activeOrgs} Active · {totalOrgs - activeOrgs} Inactive
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Users</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalUsers}
          </div>
          <div className="text-[10px] text-emerald-500 font-medium mt-1">
            {activeUsers} Active · {totalUsers - activeUsers} Inactive
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Projects</span>
            <Layers className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalProjects}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">
            Across all workspaces
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalTasks}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">
            Stored in local JSON
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveAdminTab('orgs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeAdminTab === 'orgs'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Organizations Management ({organizations.length})
          </button>
          <button
            onClick={() => setActiveAdminTab('users')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeAdminTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Registered Users ({users.length})
          </button>
          <button
            onClick={() => setActiveAdminTab('system')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeAdminTab === 'system'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Storage & Maintenance
          </button>
        </div>

        {activeAdminTab === 'orgs' && (
          <button
            onClick={() => setIsNewOrgModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Organization</span>
          </button>
        )}
      </div>

      {/* TAB 1: ORGANIZATIONS MANAGEMENT */}
      {activeAdminTab === 'orgs' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {organizations.map((org) => {
            const isActive = org.status !== 'inactive';
            const isExpanded = expandedOrgId === org.id;
            const orgMembers = org.members.map((m) => {
              const u = users.find((user) => user.id === m.userId);
              return { ...m, user: u };
            });
            const nonMembers = users.filter((u) => !org.members.some((m) => m.userId === u.id));

            return (
              <div
                key={org.id}
                className="glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 space-y-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <OrgLogo name={org.name} logo={org.logo} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {org.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive / Suspended'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {org.description || 'No description'} · Invite: <code className="font-mono text-blue-400">{org.inviteCode}</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Active/Inactive Toggle */}
                    <button
                      onClick={() => toggleOrganizationStatus(org.id, isActive ? 'inactive' : 'active')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        isActive
                          ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'
                          : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                      }`}
                    >
                      {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      <span>{isActive ? 'Set Inactive' : 'Activate Org'}</span>
                    </button>

                    {/* Expand Member Manager */}
                    <button
                      onClick={() => setExpandedOrgId(isExpanded ? null : org.id)}
                      className="px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors"
                    >
                      {isExpanded ? 'Close Members' : `Manage Members (${org.members.length})`}
                    </button>

                    {/* Delete Org */}
                    <button
                      onClick={() => {
                        confirmAction({
                          title: `Delete Organization "${org.name}"?`,
                          message: `Are you sure you want to permanently delete "${org.name}" and all of its associated workspaces and tasks?`,
                          confirmText: 'Delete Organization',
                          variant: 'danger',
                          onConfirm: () => deleteOrganization(org.id),
                        });
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                      title="Delete Organization"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Member Manager Panel */}
                {isExpanded && (
                  <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Organization Members
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {orgMembers.map((m) => (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Avatar
                              name={m.user?.name || 'User'}
                              avatarUrl={m.user?.avatar}
                              avatarPreset={m.user?.avatarPreset}
                              size="sm"
                            />
                            <div className="truncate">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                                {m.user?.name || m.userId}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {m.user?.email || ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <select
                              value={m.role}
                              onChange={(e) => changeMemberRole(org.id, m.userId, e.target.value as UserRole)}
                              className="px-2 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </select>

                            <button
                              onClick={() => removeMemberFromAnyOrg(org.id, m.userId)}
                              className="p-1 text-slate-400 hover:text-rose-500"
                              title="Remove from organization"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Member Form */}
                    {nonMembers.length > 0 && (
                      <div className="flex items-center gap-2 pt-2">
                        <select
                          value={userToAdd}
                          onChange={(e) => setUserToAdd(e.target.value)}
                          className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200 flex-1"
                        >
                          <option value="">Select a user to add to this workspace...</option>
                          {nonMembers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>

                        <select
                          value={roleToAdd}
                          onChange={(e) => setRoleToAdd(e.target.value as UserRole)}
                          className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>

                        <button
                          onClick={() => handleAddMemberToOrg(org.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
                        >
                          Add User
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeAdminTab === 'users' && (
        <div className="flex-1 overflow-y-auto glass-panel rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5">
          {users.map((u) => {
            const isActive = u.status !== 'inactive';
            return (
              <div
                key={u.id}
                className="p-3.5 flex items-center justify-between gap-4 text-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={u.name}
                    avatarUrl={u.avatar}
                    avatarPreset={u.avatarPreset}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {u.name}
                      </span>
                      {u.isSuperAdmin && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500">
                          SUPERADMIN
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {isActive ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {u.email} · {u.title || 'Member'} · Privacy: {u.emailPrivacy || 'team_only'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleUserStatus(u.id, isActive ? 'inactive' : 'active')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                      isActive
                        ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'
                        : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                    }`}
                  >
                    {isActive ? 'Suspend' : 'Activate'}
                  </button>

                  <button
                    onClick={() => {
                      confirmAction({
                        title: `Delete User "${u.name}"?`,
                        message: `Are you sure you want to permanently delete user account "${u.email}"?`,
                        confirmText: 'Delete User',
                        variant: 'danger',
                        onConfirm: () => deleteUser(u.id),
                      });
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Delete User"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: STORAGE & MAINTENANCE */}
      {activeAdminTab === 'system' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-500" />
              <span>Local-First JSON Database Health</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              TaskFlow stores records across independent atomic JSON tables in your local operating system application directory.
              Atomic writes prevent database corruption during sudden system shutdowns.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-[10px] text-slate-400 block">users.json</span>
                <span className="font-bold text-slate-200">{users.length} rows</span>
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-[10px] text-slate-400 block">organizations.json</span>
                <span className="font-bold text-slate-200">{organizations.length} rows</span>
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-[10px] text-slate-400 block">projects.json</span>
                <span className="font-bold text-slate-200">{projects.length} rows</span>
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-[10px] text-slate-400 block">tasks.json</span>
                <span className="font-bold text-slate-200">{tasks.length} rows</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Database Seeding & Recovery
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => {
                  confirmAction({
                    title: 'Reset Database?',
                    message: 'Reset database to clean production state? All current tasks, comments, and logs will be wiped clean.',
                    confirmText: 'Reset Database',
                    variant: 'danger',
                    onConfirm: () => resetDatabaseToDefault(),
                  });
                }}
                className="px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-black/10 dark:border-white/10"
              >
                Reset to Clean Production State
              </button>

              <button
                onClick={() => {
                  confirmAction({
                    title: 'Load Staging Demo Data?',
                    message: 'Populate sample demo data with mock tasks and projects for testing?',
                    confirmText: 'Load Demo Data',
                    variant: 'info',
                    onConfirm: () => loadDemoData(),
                  });
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Populate Staging Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Org Inline Modal */}
      {isNewOrgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateNewOrg}
            className="w-full max-w-md glass-panel p-6 rounded-3xl border border-black/10 dark:border-white/10 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Create New Organization
            </h3>
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Workspace / Organization Name"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium"
              autoFocus
            />
            <input
              type="text"
              value={newOrgDesc}
              onChange={(e) => setNewOrgDesc(e.target.value)}
              placeholder="Workspace purpose or description"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewOrgModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs"
              >
                Create Workspace
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

