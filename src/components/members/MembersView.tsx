import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { UserRole } from '../../types';
import { Avatar } from '../common/Avatar';
import { OrgLogo } from '../common/DNLogo';
import { emailService } from '../../services/emailService';
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
  Mail,
  Send,
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
    notifyInvitedUser,
  } = useTaskFlowStore();

  const [copied, setCopied] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [inviteRoleInput, setInviteRoleInput] = useState<UserRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentOrg = organizations.find((o) => o.id === currentOrgId);
  if (!currentOrg) return null;

  const currentMember = currentOrg.members.find((m) => m.userId === currentUserId);
  const currentUser = users.find((u) => u.id === currentUserId);
  const isOwnerOrAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin' || currentUser?.isSuperAdmin;

  if (!isOwnerOrAdmin) {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Administrator Access Required
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          The workspace member roster, invite code, and role management are exclusively visible to Organization Owners and Administrators.
        </p>
      </div>
    );
  }

  const memberUsers = users.filter((u) => currentOrg.members.some((m) => m.userId === u.id));
  const nonMembers = users.filter((u) => !currentOrg.members.some((m) => m.userId === u.id));

  const getDisplayEmail = (user?: any) => {
    if (!user) return '—';
    if (user.id === currentUserId || isOwnerOrAdmin) {
      return user.email;
    }
    if (user.emailPrivacy === 'hidden') {
      const [local, domain] = user.email.split('@');
      return `${(local || '').slice(0, 2)}***@${domain || 'private'}`;
    }
    if (user.emailPrivacy === 'team_only' && !isOwnerOrAdmin) {
      return 'Hidden (Team Only)';
    }
    return user.email;
  };

  const handleCopyInviteCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentOrg.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInviteEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmailInput.trim()) return;

    setIsInviting(true);
    setInviteMessage(null);

    const currentUser = users.find((u) => u.id === currentUserId);
    const res = await emailService.sendInvite(
      inviteEmailInput.trim(),
      currentOrg.name,
      currentUser?.name || 'Workspace Administrator',
      currentOrg.inviteCode,
      inviteRoleInput
    );

    // Also push in-app notification if target user is in the system
    notifyInvitedUser(inviteEmailInput.trim(), currentOrg.name, currentOrg.inviteCode, inviteRoleInput);

    setIsInviting(false);
    if (res.success) {
      setInviteMessage({
        type: 'success',
        text: `Invitation dispatched to ${inviteEmailInput.trim()}! They can join using OTP.`,
      });
      setInviteEmailInput('');
      setTimeout(() => setInviteMessage(null), 5000);
    } else {
      setInviteMessage({
        type: 'error',
        text: res.error || 'Failed to dispatch invitation email. Please check network.',
      });
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
            <OrgLogo name={currentOrg.name} logo={currentOrg.logo} size="sm" />
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
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
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

      {/* Invite Member via Email (Hostinger PHP Mailer + In-App Alert) */}
      {isOwnerOrAdmin && (
        <form
          onSubmit={handleInviteEmailSubmit}
          className="mb-4 p-4 glass-panel rounded-2xl border border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Invite Colleague via Email
              </p>
              <p className="text-[11px] text-slate-400">
                Dispatches an invitation email with OTP join link and creates an in-app alert.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="email"
              placeholder="colleague@domain.com"
              value={inviteEmailInput}
              onChange={(e) => setInviteEmailInput(e.target.value)}
              className="px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-slate-200 text-xs w-56 focus:border-blue-500"
            />
            <select
              value={inviteRoleInput}
              onChange={(e) => setInviteRoleInput(e.target.value as UserRole)}
              className="px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={isInviting || !inviteEmailInput.trim()}
              className="px-3.5 py-1.5 font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isInviting ? 'Sending...' : 'Send Invite'}</span>
            </button>
          </div>
          {inviteMessage && (
            <div className={`w-full text-[11px] font-semibold mt-1 ${inviteMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {inviteMessage.text}
            </div>
          )}
        </form>
      )}

      {/* Add Local User to Org Bar (for local multi-user testing) */}
      {isOwnerOrAdmin && nonMembers.length > 0 && (
        <form
          onSubmit={handleAddLocalUser}
          className="mb-6 p-4 glass-panel rounded-2xl border border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-500" />
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
              className="px-3 py-1.5 font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
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
                        avatarPreset={user?.avatarPreset}
                        size="sm"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{user?.name || 'Local User'}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] text-blue-500 font-normal">
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
                    <span className="flex items-center gap-1">
                      {user?.emailPrivacy === 'hidden' && <Shield className="w-3 h-3 text-amber-500 shrink-0" />}
                      <span>{getDisplayEmail(user)}</span>
                    </span>
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
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
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
