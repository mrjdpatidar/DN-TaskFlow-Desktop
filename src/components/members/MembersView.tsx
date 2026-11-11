import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { UserRole } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  Users,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  UserPlus,
  Trash2,
  Building2,
  Share2,
} from 'lucide-react';

export const MembersView: React.FC = () => {
  const {
    currentOrgId,
    currentUserId,
    organizations,
    users,
    changeMemberRole,
    removeMemberFromOrg,
    updateOrganization,
  } = useTaskFlowStore();

  const [copied, setCopied] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');

  const currentOrg = organizations.find((o) => o.id === currentOrgId);
  if (!currentOrg) return null;

  const currentMember = currentOrg.members.find((m) => m.userId === currentUserId);
  const isOwnerOrAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const memberUsers = users.filter((u) => currentOrg.members.some((m) => m.userId === u.id));
  const nonMembers = users.filter((u) => !currentOrg.members.some((m) => m.userId === u.id));

  const handleCopyInviteCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentOrg.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddLocalUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToAdd) return;
    const updatedMembers = [
      ...currentOrg.members,
      {
        userId: selectedUserToAdd,
        role: currentOrg.settings.defaultRole || 'member',
        joinedAt: new Date().toISOString(),
      },
    ];
    updateOrganization(currentOrg.id, { members: updatedMembers });
    setSelectedUserToAdd('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto select-none p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{currentOrg.logo || '🏢'}</span>
            <span>{currentOrg.name} — Team & Access</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage organization members, assign roles, and distribute local invitation codes.
          </p>
        </div>

        {/* Local Invitation Code Card */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 glass-panel rounded-xl border border-black/5 dark:border-white/10 text-xs shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Invitation Code
            </span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
              {currentOrg.inviteCode}
            </span>
          </div>
          <button
            onClick={handleCopyInviteCode}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Local User to Org Bar (for local multi-user testing) */}
      {isOwnerOrAdmin && nonMembers.length > 0 && (
        <form
          onSubmit={handleAddLocalUser}
          className="mb-6 p-4 glass-panel rounded-2xl border border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-500" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Add Existing Local User
              </p>
              <p className="text-[11px] text-slate-400">
                Grant another locally registered user access to this workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedUserToAdd}
              onChange={(e) => setSelectedUserToAdd(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="">Select a user...</option>
              {nonMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selectedUserToAdd}
              className="px-3 py-1.5 font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              Add to Workspace
            </button>
          </div>
        </form>
      )}

      {/* Members Table */}
      <div className="glass-panel rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Joined Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {currentOrg.members.map((member) => {
              const user = users.find((u) => u.id === member.userId);
              const isCurrentUser = member.userId === currentUserId;
              const isOwner = member.role === 'owner';

              return (
                <tr
                  key={member.userId}
                  className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {/* Member Name + Avatar */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={user?.name || 'User'}
                        avatarUrl={user?.avatar}
                        size="sm"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{user?.name || 'Local User'}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] text-indigo-500 font-normal">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {user?.title || 'Team Member'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    {user?.email || '—'}
                  </td>

                  {/* Role Selector or Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {isOwnerOrAdmin && !isOwner && !isCurrentUser ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          changeMemberRole(currentOrg.id, member.userId, e.target.value as UserRole)
                        }
                        className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium capitalize text-slate-700 dark:text-slate-300">
                        <Shield className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{member.role}</span>
                      </span>
                    )}
                  </td>

                  {/* Joined Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-slate-500">
                    {new Date(member.joinedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {isOwnerOrAdmin && !isOwner && !isCurrentUser && (
                      <button
                        onClick={() => removeMemberFromOrg(currentOrg.id, member.userId)}
                        title="Remove member from workspace"
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
