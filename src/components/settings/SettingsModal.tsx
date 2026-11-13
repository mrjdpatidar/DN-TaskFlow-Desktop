import React, { useState, useEffect, useRef } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { DNLogo, OrgLogo } from '../common/DNLogo';
import { useConfirmModal } from '../common/ConfirmModal';
import { compressImage } from '../../services/imageUtils';
import { ipcBridge } from '../../services/ipcBridge';
import { updaterService, UpdateCheckResult, CURRENT_APP_VERSION, DIRECT_EXE_DOWNLOAD_URL } from '../../services/updater';
import { EmailPrivacyLevel } from '../../types';
import {
  User,
  Building2,
  Palette,
  Bell,
  HardDrive,
  Info,
  Check,
  Moon,
  Sun,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Clock,
  Volume2,
  AlertOctagon,
  Copy,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  KeyRound,
  Camera,
} from 'lucide-react';

interface SettingsModalProps {
  initialTab?: 'profile' | 'organization' | 'appearance' | 'notifications' | 'about';
}

export const SettingsModal: React.FC<SettingsModalProps> = () => {
  const {
    isSettingsOpen,
    setSettingsOpen,
    settingsInitialTab,
    currentUserId,
    currentOrgId,
    users,
    organizations,
    preferences,
    updatePreferences,
    addNotification,
    updateProfile,
    changePassword,
    updateOrganization,
    createBackupNow,
    exportDatabaseJSON,
    importDatabaseJSON,
    resetDatabaseToDefault,
  } = useTaskFlowStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'appearance' | 'notifications' | 'about'>(
    (settingsInitialTab && settingsInitialTab !== ('storage' as any) ? settingsInitialTab : 'profile') as any
  );

  useEffect(() => {
    if (settingsInitialTab) {
      setActiveTab(settingsInitialTab);
    }
  }, [settingsInitialTab]);

  const currentUser = users.find((u) => u.id === currentUserId);
  const currentOrg = organizations.find((o) => o.id === currentOrgId);

  // Profile Form States
  const [name, setName] = useState(currentUser?.name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [avatarPreset, setAvatarPreset] = useState(currentUser?.avatarPreset || '');
  const [title, setTitle] = useState(currentUser?.title || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [emailPrivacy, setEmailPrivacy] = useState<EmailPrivacyLevel>(currentUser?.emailPrivacy || 'team_only');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-Update States
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const orgLogoFileRef = useRef<HTMLInputElement>(null);

  // Org Form States
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [orgDesc, setOrgDesc] = useState(currentOrg?.description || '');
  const [orgLogo, setOrgLogo] = useState(currentOrg?.logo || '');
  const [orgCopied, setOrgCopied] = useState(false);

  const currentMember = currentOrg?.members?.find((m) => m.userId === currentUserId);
  const isOrgAdminOrOwner = currentMember?.role === 'owner' || currentMember?.role === 'admin' || currentUser?.isSuperAdmin;

  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name || '');
      setOrgDesc(currentOrg.description || '');
      setOrgLogo(currentOrg.logo || '');
    }
  }, [currentOrg]);

  const { confirmAction } = useConfirmModal();

  const handleOrgLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'Please select an image file (PNG, JPG, SVG, WebP).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Logo image must be smaller than 5MB.' });
      return;
    }
    try {
      const compressed = await compressImage(file, 360);
      setOrgLogo(compressed);
      if (currentOrg) {
        await updateOrganization(currentOrg.id, { logo: compressed });
      }
      setProfileMsg({ type: 'success', text: 'Workspace logo updated and saved successfully!' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Failed to process logo image.' });
    }
  };

  // Storage stats
  const [storageStats, setStorageStats] = useState<{
    totalRecords: number;
    estimatedSizeKB: number;
    lastSaved: string;
    storageLocation: string;
  } | null>(null);

  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSettingsOpen) {
      ipcBridge.database.getStorageStats().then(setStorageStats);
    }
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      name,
      avatar,
      avatarPreset,
      title,
      bio,
      emailPrivacy,
    });
    setProfileMsg({ type: 'success', text: 'Profile and privacy settings saved.' });
    setTimeout(() => setProfileMsg(null), 3000);
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'Please select an image file (PNG, JPG, WebP).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Avatar image must be under 5MB.' });
      return;
    }
    try {
      const compressed = await compressImage(file, 360);
      setAvatar(compressed);
      setAvatarPreset('');
      await updateProfile({ avatar: compressed, avatarPreset: '' });
      setProfileMsg({ type: 'success', text: 'Profile photo updated and saved successfully!' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'Failed to process profile photo.' });
    }
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateMsg(null);
    try {
      const result = await updaterService.checkForUpdates();
      setUpdateInfo(result);
    } catch (err) {
      setUpdateMsg('Could not verify remote update server.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadAndInstall = async (url: string) => {
    setIsUpdating(true);
    setUpdateMsg('Downloading update installer from https://app.drunall.com/taskflow/downloads/...');
    const res = await updaterService.installUpdate(url);
    setIsUpdating(false);
    if (res.success) {
      setUpdateMsg('Installer ready. Launching setup executable...');
    } else {
      setUpdateMsg(res.error || 'Update failed');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setProfileMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    const res = await changePassword(oldPassword, newPassword);
    if (!res.success) {
      setProfileMsg({ type: 'error', text: res.error || 'Failed to change password.' });
    } else {
      setProfileMsg({ type: 'success', text: 'Password changed successfully.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setProfileMsg(null), 3000);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    await updateOrganization(currentOrg.id, {
      name: orgName,
      description: orgDesc,
      logo: orgLogo,
    });
    setProfileMsg({ type: 'success', text: 'Organization settings saved.' });
    setTimeout(() => setProfileMsg(null), 3000);
  };

  const handleExportJSON = async () => {
    const json = await exportDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      const res = await importDatabaseJSON(content);
      if (res.success) {
        setBackupMsg('Database restored successfully from JSON backup!');
        ipcBridge.database.getStorageStats().then(setStorageStats);
      } else {
        setBackupMsg(`Import failed: ${res.error}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateBackup = async () => {
    const res = await createBackupNow();
    if (res.success) {
      setBackupMsg(`Local atomic backup created: ${res.filename}`);
      setTimeout(() => setBackupMsg(null), 4000);
    }
  };

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="Settings & Preferences"
      description="Manage your profile, notifications, and workspace data."
      maxWidth="3xl"
    >
      <div className="flex flex-col md:flex-row gap-6 text-xs min-h-[420px]">
        {/* Settings Navigation Tabs */}
        <div className="w-full md:w-48 shrink-0 space-y-1 border-b md:border-b-0 md:border-r border-black/5 dark:border-white/5 pb-4 md:pb-0 md:pr-4">
          {[
            { id: 'profile', label: 'User Profile', icon: User },
            { id: 'organization', label: 'Organization', icon: Building2 },
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'notifications', label: 'Reminders & Quiet', icon: Bell },
            { id: 'about', label: 'About Desktop', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Tab Contents */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2">
          {profileMsg && (
            <div
              className={`p-3 rounded-xl mb-4 text-xs font-medium ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {profileMsg.text}
            </div>
          )}

          {/* TAB 1: USER PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Personal Details & Identity
                </h4>

                {/* Avatar Uploader */}
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-3">
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => avatarFileRef.current?.click()}
                      className="relative group cursor-pointer"
                    >
                      <Avatar
                        name={name || 'User'}
                        avatarUrl={avatar}
                        size="xl"
                      />
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs block">
                        Profile Photo
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Upload a JPG, PNG, or WebP photo to personalize your account across team boards, comments, and tasks.
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          ref={avatarFileRef}
                          onChange={handleAvatarFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => avatarFileRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Photo</span>
                        </button>
                        {avatar && (
                          <button
                            type="button"
                            onClick={() => {
                              confirmAction({
                                title: 'Remove Profile Photo',
                                message: 'Are you sure you want to remove your profile photo? Your avatar will revert to your name initials.',
                                confirmText: 'Remove Photo',
                                onConfirm: async () => {
                                  setAvatar('');
                                  setAvatarPreset('');
                                  await updateProfile({ avatar: '', avatarPreset: '' });
                                  setProfileMsg({ type: 'success', text: 'Profile photo removed.' });
                                  setTimeout(() => setProfileMsg(null), 3000);
                                },
                              });
                            }}
                            className="px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Job Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Lead Designer"
                      className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Bio / Role Scope</label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Short bio visible to team members"
                    className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Email Address</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.email || ''}
                    className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl opacity-60 font-mono text-slate-600 dark:text-slate-400"
                  />
                </div>

                {/* Email Privacy Settings Card */}
                <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Email Privacy Settings
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Control how your email address is shared across projects and team member lists.
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1.5">
                    {[
                      { id: 'public', label: 'Public', desc: 'Visible to all workspace members' },
                      { id: 'team_only', label: 'Team Only', desc: 'Visible only to Admins & Owners' },
                      { id: 'hidden', label: 'Hidden / Masked', desc: 'Masked as s***@domain.com' },
                    ].map((p) => {
                      const isSel = emailPrivacy === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setEmailPrivacy(p.id as EmailPrivacyLevel)}
                          className={`p-2.5 rounded-xl text-left border transition-all ${
                            isSel
                              ? 'border-blue-500 bg-blue-500/10 shadow-xs'
                              : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {p.label}
                            </span>
                            {isSel && <Check className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          <span className="text-[10px] text-slate-400 block leading-tight">
                            {p.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">
                      Account Recovery Key
                    </span>
                    <span className="font-mono text-blue-500 text-[11px]">
                      {currentUser?.recoveryKey || 'TASK-RECO-XXXX'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 max-w-[140px] text-right">
                    Used to reset local password if forgotten
                  </span>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-xs"
                >
                  Save Profile & Privacy Settings
                </button>
              </form>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="pt-4 border-t border-black/5 dark:border-white/5 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Change Password
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl transition-colors"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: ORGANIZATION */}
          {activeTab === 'organization' && currentOrg && (
            <form onSubmit={handleSaveOrg} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Organization Settings
                </h4>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  isOrgAdminOrOwner
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                }`}>
                  {isOrgAdminOrOwner ? 'Admin Access' : 'Member (Read-Only)'}
                </span>
              </div>

              {!isOrgAdminOrOwner && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
                  <Shield className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Only Organization Owners and Administrators can modify workspace profile, upload logo, or rename this workspace.</span>
                </div>
              )}

              {/* Workspace Logo Upload Section */}
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <OrgLogo name={orgName || currentOrg.name} logo={orgLogo} size="lg" />
                  <div className="min-w-0">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{orgName || currentOrg.name}</h5>
                    <p className="text-[11px] text-slate-400">Workspace Identity & Logo</p>
                  </div>
                </div>

                {isOrgAdminOrOwner && (
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="file"
                      ref={orgLogoFileRef}
                      onChange={handleOrgLogoUpload}
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => orgLogoFileRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {orgLogo ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    {orgLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          confirmAction({
                            title: 'Remove Workspace Logo',
                            message: 'Are you sure you want to remove the workspace logo? It will revert to the organization initials.',
                            confirmText: 'Remove Logo',
                            onConfirm: async () => {
                              setOrgLogo('');
                              if (currentOrg) {
                                await updateOrganization(currentOrg.id, { logo: '' });
                              }
                              setProfileMsg({ type: 'success', text: 'Workspace logo removed.' });
                              setTimeout(() => setProfileMsg(null), 3000);
                            },
                          });
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Remove Logo"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isOrgAdminOrOwner}
                  className={`w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none font-semibold ${
                    isOrgAdminOrOwner
                      ? 'text-slate-800 dark:text-slate-200 focus:border-blue-500'
                      : 'text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-80'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Description</label>
                <textarea
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  disabled={!isOrgAdminOrOwner}
                  rows={3}
                  className={`w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none ${
                    isOrgAdminOrOwner
                      ? 'text-slate-800 dark:text-slate-200 focus:border-blue-500'
                      : 'text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-80'
                  }`}
                />
              </div>

              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block text-xs">
                    Workspace Invite Code
                  </span>
                  <span className="font-mono text-blue-500 text-sm font-bold">
                    {currentOrg.inviteCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(currentOrg.inviteCode);
                    setOrgCopied(true);
                    setTimeout(() => setOrgCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  {orgCopied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              {isOrgAdminOrOwner && (
                <button
                  type="submit"
                  className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm"
                >
                  Save Workspace Settings
                </button>
              )}
            </form>
          )}

          {/* TAB 3: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Theme
              </h4>

              {/* Theme Mode Toggle */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => updatePreferences({ theme: 'dark' })}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                    preferences.theme === 'dark'
                      ? 'border-blue-500 bg-slate-900 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-800 bg-slate-950 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-white">
                    <span className="font-bold">Dark Slate</span>
                    <Moon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    High contrast, deep slate background with frosted glass layers.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => updatePreferences({ theme: 'light' })}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                    preferences.theme === 'light'
                      ? 'border-blue-500 bg-white shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-100 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-900">
                    <span className="font-bold">Light Crystal</span>
                    <Sun className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Airy, luminous glass panels with soft translucent shadows.
                  </span>
                </button>
              </div>

              {/* Theme Accent Color Section */}
              <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-blue-500" />
                      <span>Theme Accent Color</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Sets primary highlights, active badges, navigation indicators, and action buttons. Default: <code className="font-mono text-[10px] text-blue-500 font-bold">#0080fa</code>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updatePreferences({ accentColor: '#0080fa' })}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 transition-colors"
                  >
                    Reset Default
                  </button>
                </div>

                {/* Preset Color Swatches */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {[
                    { label: 'Default Blue', hex: '#0080fa' },
                    { label: 'Royal Indigo', hex: '#6366f1' },
                    { label: 'Cyan Aurora', hex: '#06b6d4' },
                    { label: 'Emerald Mint', hex: '#10b981' },
                    { label: 'Amber Flame', hex: '#f59e0b' },
                    { label: 'Rose Coral', hex: '#f43f5e' },
                    { label: 'Electric Violet', hex: '#8b5cf6' },
                    { label: 'Obsidian Slate', hex: '#64748b' },
                  ].map((item) => {
                    const isSelected = (preferences.accentColor || '#0080fa').toLowerCase() === item.hex.toLowerCase();
                    return (
                      <button
                        key={item.hex}
                        type="button"
                        onClick={() => updatePreferences({ accentColor: item.hex })}
                        title={`${item.label} (${item.hex})`}
                        className="group relative flex items-center gap-1.5 p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                      >
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs ring-2 ${
                            isSelected ? 'ring-offset-2 ring-blue-500 ring-offset-white dark:ring-offset-slate-900 scale-105' : 'ring-transparent'
                          }`}
                          style={{ backgroundColor: item.hex }}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </span>
                      </button>
                    );
                  })}

                  {/* Custom Color Input */}
                  <div className="flex items-center gap-2 pl-2 border-l border-black/10 dark:border-white/10">
                    <label
                      htmlFor="custom-accent-picker"
                      className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <input
                        id="custom-accent-picker"
                        type="color"
                        value={preferences.accentColor || '#0080fa'}
                        onChange={(e) => updatePreferences({ accentColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-200 uppercase font-semibold">
                        {preferences.accentColor || '#0080fa'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Accent Color Live Preview
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-white font-medium text-xs shadow-xs transition-opacity"
                      style={{ backgroundColor: preferences.accentColor || '#0080fa' }}
                    >
                      Primary Action Button
                    </button>
                    <span
                      className="px-2.5 py-1 rounded-md text-xs font-semibold"
                      style={{
                        backgroundColor: `${preferences.accentColor || '#0080fa'}20`,
                        color: preferences.accentColor || '#0080fa',
                      }}
                    >
                      Active Highlight Tag
                    </span>
                    <span
                      className="text-xs font-bold font-mono"
                      style={{ color: preferences.accentColor || '#0080fa' }}
                    >
                      Tabular Metric: 100%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS & REMINDERS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Windows Notifications & Task Reminders
                </h4>
                <p className="text-slate-500 leading-relaxed text-xs mt-1">
                  Configure native Windows Action Center toasts, hourly task reminders, and quiet focus hours.
                </p>
              </div>

              {/* Master Windows Desktop Notifications Toggle */}
              <div className="p-3.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">
                        Windows Desktop Notifications (Master Toggle)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Receive native Windows Action Center banner alerts on assignment, comments, and deadlines
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.desktopNotificationsEnabled !== false}
                    onChange={(e) => updatePreferences({ desktopNotificationsEnabled: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-blue-500/15">
                  <span className="text-[11px] text-slate-400">
                    Windows Alert Status:{' '}
                    <strong className={preferences.desktopNotificationsEnabled !== false ? 'text-emerald-500' : 'text-rose-400'}>
                      {preferences.desktopNotificationsEnabled !== false ? 'Active (ON)' : 'Disabled (OFF)'}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      addNotification(
                        '🔔 Windows Alert Active',
                        'Windows Action Center toast notification is working properly in DN TaskFlow!',
                        undefined,
                        'system'
                      );
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    Send Test Toast
                  </button>
                </div>
              </div>

              {/* Master Hourly Toggle */}
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">
                      Hourly Task Reminders
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Background reminder engine continuously checks active pending tasks and upcoming deadlines
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.hourlyRemindersEnabled}
                  onChange={(e) => updatePreferences({ hourlyRemindersEnabled: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Quiet Hours */}
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">
                        Quiet Hours
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Pause all sounds and desktop notifications during your focus or rest hours
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.quietHoursEnabled}
                    onChange={(e) => updatePreferences({ quietHoursEnabled: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                {preferences.quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Quiet Start Time</label>
                      <input
                        type="time"
                        value={preferences.quietHoursStart}
                        onChange={(e) => updatePreferences({ quietHoursStart: e.target.value })}
                        className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Quiet End Time</label>
                      <input
                        type="time"
                        value={preferences.quietHoursEnd}
                        onChange={(e) => updatePreferences({ quietHoursEnd: e.target.value })}
                        className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Audio Chime */}
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">
                      Sound Effects
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Play liquid glass chimes when tasks are assigned, completed, or notified
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.soundEnabled}
                  onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Windows System Info Box */}
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  <strong className="text-slate-700 dark:text-slate-300 block mb-0.5">Windows System Settings:</strong>
                  You can also manage notification banners, sounds, and Focus Assist directly in Windows Settings:{' '}
                  <span className="font-mono text-[10px] px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded">Win + I → System → Notifications → DN TaskFlow</span>.
                  When closed, TaskFlow continues running quietly in your system tray to deliver timely task reminders.
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ABOUT DESKTOP & AUTO-UPDATES */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DNLogo variant="badge" size="lg" />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                      <span>DN TaskFlow</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                        2026 Production
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Version v{CURRENT_APP_VERSION} ({ipcBridge.isElectron ? 'Windows Desktop Client' : 'Web Client'})
                    </p>
                  </div>
                </div>

                {/* Check for updates is shown strictly in Electron app */}
                {ipcBridge.isElectron && (
                  <button
                    onClick={handleCheckUpdates}
                    disabled={isCheckingUpdate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>{isCheckingUpdate ? 'Checking Server...' : 'Check for Updates'}</span>
                  </button>
                )}
              </div>

              {/* In-App Auto-Update Card (Electron only) */}
              {ipcBridge.isElectron && updateInfo && (
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>{updateInfo.updateAvailable ? `New Update Available: v${updateInfo.latestVersion}` : 'TaskFlow is Up to Date'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Target: v{updateInfo.latestVersion}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {updateInfo.releaseNotes}
                  </p>

                  <div className="pt-1 flex items-center gap-2">
                    {updateInfo.updateAvailable ? (
                      <button
                        onClick={() => handleDownloadAndInstall(updateInfo.downloadUrl)}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isUpdating ? 'Downloading Installer...' : 'Download & Install Update (In-App)'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>You are running the latest version</span>
                      </span>
                    )}

                    <a
                      href={updateInfo.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>Direct .exe Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {updateMsg && (
                    <p className="text-[11px] text-amber-400 font-mono mt-1">{updateMsg}</p>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
