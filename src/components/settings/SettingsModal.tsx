import React, { useState, useEffect, useRef } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { ipcBridge } from '../../services/ipcBridge';
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
} from 'lucide-react';

interface SettingsModalProps {
  initialTab?: 'profile' | 'organization' | 'appearance' | 'notifications' | 'storage' | 'about';
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
    updateProfile,
    changePassword,
    updateOrganization,
    createBackupNow,
    exportDatabaseJSON,
    importDatabaseJSON,
    resetDatabaseToDefault,
  } = useTaskFlowStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'appearance' | 'notifications' | 'storage' | 'about'>(
    settingsInitialTab || 'profile'
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
  const [title, setTitle] = useState(currentUser?.title || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Org Form States
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [orgDesc, setOrgDesc] = useState(currentOrg?.description || '');
  const [orgLogo, setOrgLogo] = useState(currentOrg?.logo || '🏢');
  const [orgCopied, setOrgCopied] = useState(false);

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
    await updateProfile({ name, avatar, title });
    setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    setTimeout(() => setProfileMsg(null), 3000);
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
      title="Application Preferences"
      description="Configure user profile, appearance, hourly reminder engine, and local storage."
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
            { id: 'storage', label: 'Storage & Backup', icon: HardDrive },
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
                    ? 'bg-indigo-600 text-white shadow-xs'
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
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Personal Details
                </h4>

                <div className="flex items-center gap-4">
                  <Avatar name={name || 'User'} avatarUrl={avatar} size="lg" />
                  <div className="flex-1">
                    <label className="block text-slate-500 font-medium mb-1">
                      Avatar Image URL
                    </label>
                    <input
                      type="url"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                    />
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
                      className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Local Email</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.email || ''}
                    className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl opacity-60 font-mono text-slate-600 dark:text-slate-400"
                  />
                </div>

                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">
                      Account Recovery Key
                    </span>
                    <span className="font-mono text-indigo-500 text-[11px]">
                      {currentUser?.recoveryKey || 'TASK-RECO-XXXX'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 max-w-[140px] text-right">
                    Used to reset local password if forgotten
                  </span>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
                >
                  Save Profile Changes
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
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Organization Settings
              </h4>

              <div className="flex gap-2">
                <div className="w-16">
                  <label className="block text-slate-500 font-medium mb-1">Logo</label>
                  <input
                    type="text"
                    value={orgLogo}
                    onChange={(e) => setOrgLogo(e.target.value)}
                    className="w-full text-center px-2 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-slate-500 font-medium mb-1">Workspace Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Description</label>
                <textarea
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block">
                    Workspace Invite Code
                  </span>
                  <span className="font-mono text-indigo-500 text-sm font-bold">
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
                  className="px-3 py-1.5 text-xs font-medium bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  {orgCopied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              <button
                type="submit"
                className="px-4 py-2 font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
              >
                Save Workspace Settings
              </button>
            </form>
          )}

          {/* TAB 3: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Liquid Glass Theme
              </h4>
              <p className="text-slate-500 leading-relaxed">
                TaskFlow Desktop utilizes Apple Liquid Glass translucency, subtle saturation curves, and background blur filters.
              </p>

              {/* Theme Mode Toggle */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => updatePreferences({ theme: 'dark' })}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                    preferences.theme === 'dark'
                      ? 'border-indigo-500 bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-800 bg-slate-950 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-white">
                    <span className="font-bold">Dark Slate</span>
                    <Moon className="w-4 h-4 text-indigo-400" />
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
                      ? 'border-indigo-500 bg-white shadow-md ring-2 ring-indigo-500/20'
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
                      <Palette className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Theme Accent Color</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Sets primary highlights, active badges, navigation indicators, and action buttons. Default: <code className="font-mono text-[10px] text-indigo-500 font-bold">#5b8def</code>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updatePreferences({ accentColor: '#5b8def' })}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 transition-colors"
                  >
                    Reset Default
                  </button>
                </div>

                {/* Preset Color Swatches */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {[
                    { label: 'Default Blue', hex: '#5b8def' },
                    { label: 'Royal Indigo', hex: '#6366f1' },
                    { label: 'Cyan Aurora', hex: '#06b6d4' },
                    { label: 'Emerald Mint', hex: '#10b981' },
                    { label: 'Amber Flame', hex: '#f59e0b' },
                    { label: 'Rose Coral', hex: '#f43f5e' },
                    { label: 'Electric Violet', hex: '#8b5cf6' },
                    { label: 'Obsidian Slate', hex: '#64748b' },
                  ].map((item) => {
                    const isSelected = (preferences.accentColor || '#5b8def').toLowerCase() === item.hex.toLowerCase();
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
                            isSelected ? 'ring-offset-2 ring-indigo-500 ring-offset-white dark:ring-offset-slate-900 scale-105' : 'ring-transparent'
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
                        value={preferences.accentColor || '#5b8def'}
                        onChange={(e) => updatePreferences({ accentColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-200 uppercase font-semibold">
                        {preferences.accentColor || '#5b8def'}
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
                      style={{ backgroundColor: preferences.accentColor || '#5b8def' }}
                    >
                      Primary Action Button
                    </button>
                    <span
                      className="px-2.5 py-1 rounded-md text-xs font-semibold"
                      style={{
                        backgroundColor: `${preferences.accentColor || '#5b8def'}20`,
                        color: preferences.accentColor || '#5b8def',
                      }}
                    >
                      Active Highlight Tag
                    </span>
                    <span
                      className="text-xs font-bold font-mono"
                      style={{ color: preferences.accentColor || '#5b8def' }}
                    >
                      Tabular Metric: 100%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS & HOURLY REMINDER ENGINE */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Desktop Notifications & Hourly Reminders
              </h4>
              <p className="text-slate-500 leading-relaxed">
                The persistent background engine checks active tasks assigned to you and sends native desktop reminders.
              </p>

              {/* Master Hourly Toggle */}
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      Hourly Task Reminders
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Scans incomplete tasks and triggers notifications every hour
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.hourlyRemindersEnabled}
                  onChange={(e) => updatePreferences({ hourlyRemindersEnabled: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Quiet Hours */}
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Quiet Hours Schedule
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Suppress all audible chimes and desktop popups during this window
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.quietHoursEnabled}
                    onChange={(e) => updatePreferences({ quietHoursEnabled: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {preferences.quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                    <div>
                      <label className="block text-slate-400 mb-1">Quiet Start Time</label>
                      <input
                        type="time"
                        value={preferences.quietHoursStart}
                        onChange={(e) => updatePreferences({ quietHoursStart: e.target.value })}
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Quiet End Time</label>
                      <input
                        type="time"
                        value={preferences.quietHoursEnd}
                        onChange={(e) => updatePreferences({ quietHoursEnd: e.target.value })}
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Audio Chime */}
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      Liquid Glass Sound Chimes
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Synthesized harmonic desktop tone on assignment and reminders
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.soundEnabled}
                  onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 5: LOCAL JSON STORAGE & BACKUP */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Local-First JSON Storage Architecture
              </h4>
              <p className="text-slate-500 leading-relaxed">
                All application records are securely maintained on your device in structured JSON files under the Electron application userData directory. No external cloud database is accessed.
              </p>

              {backupMsg && (
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-medium">
                  {backupMsg}
                </div>
              )}

              {/* Storage Stats Box */}
              {storageStats && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <span className="text-slate-400 text-[11px] block">Total Database Records</span>
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                      {storageStats.totalRecords} entities
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <span className="text-slate-400 text-[11px] block">JSON Database Footprint</span>
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                      {storageStats.estimatedSizeKB} KB
                    </span>
                  </div>
                </div>
              )}

              {/* Backup & Export Actions */}
              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-3">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                  Data Portability & Backup Tools
                </span>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCreateBackup}
                    className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Create Atomic Backup</span>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON Database</span>
                  </button>

                  <div>
                    <input
                      type="file"
                      accept=".json"
                      ref={fileInputRef}
                      onChange={handleImportFile}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import / Restore JSON</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                <span className="font-semibold text-rose-600 dark:text-rose-400 block">
                  Reset Local Storage
                </span>
                <p className="text-slate-400 text-[11px]">
                  Resets the local database to the fresh factory seed state. Use this if testing initial onboarding workflows.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Reset all local JSON data to default template?')) {
                      resetDatabaseToDefault();
                    }
                  }}
                  className="px-3 py-1.5 text-rose-600 border border-rose-500/30 hover:bg-rose-500/10 rounded-xl font-medium"
                >
                  Reset Database
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: ABOUT DESKTOP */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-lg">
                  TF
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    TaskFlow Desktop
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Version 1.2.0-desktop (macOS & Windows)
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <p>
                  <strong>Design Language:</strong> Apple Liquid Glass with translucency, blur filters, and zero-pill typography discipline.
                </p>
                <p>
                  <strong>Architecture:</strong> Local-first Electron application. All data is written to structured JSON files in your local userData directory. No telemetry, no external databases.
                </p>
                <p>
                  <strong>IPC Security:</strong> Context isolation enabled with sanitized preload bridge. Renderer components never communicate directly with Node.js APIs.
                </p>
                <p>
                  <strong>Hourly Scheduler:</strong> Persistent background reminder service respecting custom quiet hours schedules.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
