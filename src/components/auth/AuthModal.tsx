import React, { useState, useEffect } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { DNLogo, OrgLogo } from '../common/DNLogo';
import { emailService } from '../../services/emailService';
import {
  Shield,
  KeyRound,
  Building2,
  Mail,
  Send,
  Lock,
  Sparkles,
  Check,
  AlertCircle,
  Copy,
  ArrowRight,
  RefreshCw,
  UserCheck,
  ChevronRight,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    currentUserId,
    users,
    organizations,
    loginWithOrg,
    registerOrganizationWithAdmin,
    setPassword,
    recoverPassword,
    switchUser,
    isSwitchUserModalOpen,
    setSwitchUserModalOpen,
  } = useTaskFlowStore();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(
    organizations.length === 0 ? 'register' : 'login'
  );

  // Login Method: 'password' or 'otp'
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');

  // Form Fields
  const [orgIdentifier, setOrgIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPasswordInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSentMsg, setOtpSentMsg] = useState('');

  // Register Fields (Organization Registration)
  const [orgName, setOrgName] = useState('');
  const [orgLogo, setOrgLogo] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminTitle, setAdminTitle] = useState('Workspace Owner');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // Post-OTP Set Password Dialog State
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [newPostPassword, setNewPostPassword] = useState('');
  const [newPostConfirmPassword, setNewPostConfirmPassword] = useState('');
  const [setPasswordMsg, setSetPasswordMsg] = useState('');

  // Forgot Password / Recovery Fields
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newRecoverPassword, setNewRecoverPassword] = useState('');
  const [recoveredSuccess, setRecoveredSuccess] = useState(false);

  // Success / Error States
  const [errorMessage, setErrorMessage] = useState('');
  const [registeredOrgInfo, setRegisteredOrgInfo] = useState<{
    orgName: string;
    inviteCode: string;
  } | null>(null);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [detectedInvitation, setDetectedInvitation] = useState<{ org: string; code: string } | null>(null);

  // Auto-detect invitation links from URL query / hash
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';

      const getParam = (paramName: string) => {
        const full = hash + '&' + search.replace('?', '');
        const match = full.match(new RegExp('[#&?]' + paramName + '=([^&]+)'));
        return match ? decodeURIComponent(match[1]) : null;
      };

      const inviteJoin = getParam('join');
      const urlOrg = getParam('org');
      const urlEmail = getParam('email');

      if (inviteJoin || urlOrg) {
        const code = inviteJoin || urlOrg || '';
        const orgLabel = urlOrg || inviteJoin || '';
        setOrgIdentifier(code);
        setMode('login');
        setLoginMethod('otp'); // Route directly to Email OTP for invited members!
        setDetectedInvitation({ org: orgLabel, code });
      }

      if (urlEmail) {
        setEmail(urlEmail);
      }
    }
  }, []);

  // If user is already logged in and not switching:
  if (currentUserId && !isSwitchUserModalOpen && !showSetPasswordModal) {
    return null;
  }

  // Handle Organization Registration
  const handleRegisterOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (adminPassword !== adminConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (adminPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    const res = await registerOrganizationWithAdmin(
      { name: orgName, logo: orgLogo, description: orgDesc },
      { name: adminName, email, password: adminPassword, title: adminTitle }
    );

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to register organization.');
    } else {
      setRegisteredOrgInfo({
        orgName,
        inviteCode: res.inviteCode || 'TF-PROD01',
      });
    }
  };

  // Handle Dispatching Login OTP
  const handleSendLoginOtp = async () => {
    setErrorMessage('');
    if (!email.trim()) {
      setErrorMessage('Please enter your work email address first.');
      return;
    }

    setIsSendingOtp(true);
    const otpRes = await emailService.sendOTP(email.trim(), 'Team Member', 'login');
    setIsSendingOtp(false);

    if (otpRes.success) {
      setOtpSentMsg(
        otpRes.simulatedOtp
          ? `6-digit code sent to ${email} (Demo code: ${otpRes.simulatedOtp})`
          : `6-digit verification code dispatched to ${email}`
      );
    } else {
      setErrorMessage(otpRes.error || 'Failed to dispatch email verification code.');
    }
  };

  // Handle Workspace Login Submit
  const handleWorkspaceLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!orgIdentifier.trim()) {
      setErrorMessage('Please enter your Organization Name or Invite Code.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (loginMethod === 'otp') {
      if (!otpCode.trim()) {
        setErrorMessage('Please enter the 6-digit OTP sent to your email.');
        return;
      }

      const res = await loginWithOrg(orgIdentifier, email, undefined, otpCode);
      if (!res.success) {
        setErrorMessage(res.error || 'OTP verification failed.');
      } else {
        setSwitchUserModalOpen(false);
        if (res.needsPasswordSet) {
          setShowSetPasswordModal(true);
        }
      }
    } else {
      if (!password) {
        setErrorMessage('Please enter your password or choose "Login with Email OTP".');
        return;
      }

      const res = await loginWithOrg(orgIdentifier, email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Login failed. Please check your workspace and credentials.');
      } else {
        setSwitchUserModalOpen(false);
      }
    }
  };

  // Handle Setting Password post-OTP
  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetPasswordMsg('');

    if (newPostPassword !== newPostConfirmPassword) {
      setSetPasswordMsg('Passwords do not match.');
      return;
    }
    if (newPostPassword.length < 6) {
      setSetPasswordMsg('Password must be at least 6 characters.');
      return;
    }

    if (currentUserId) {
      const res = await setPassword(currentUserId, newPostPassword);
      if (res.success) {
        setShowSetPasswordModal(false);
      } else {
        setSetPasswordMsg(res.error || 'Could not save password.');
      }
    }
  };

  // Handle Recovery Submit
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const res = await recoverPassword(email, recoveryKey, newRecoverPassword);
    if (!res.success) {
      setErrorMessage(res.error || 'Password recovery failed. Check recovery key.');
    } else {
      setRecoveredSuccess(true);
      setTimeout(() => {
        setRecoveredSuccess(false);
        setMode('login');
      }, 2000);
    }
  };

  // Switch User Modal (if opened while logged in)
  if (isSwitchUserModalOpen) {
    return (
      <Modal
        isOpen={isSwitchUserModalOpen}
        onClose={() => setSwitchUserModalOpen(false)}
        title="Switch Local Workspace User"
        description="Select an existing team account in this workspace."
        maxWidth="md"
      >
        <div className="space-y-2 text-xs">
          {users.map((u) => {
            const isCurrent = u.id === currentUserId;
            return (
              <button
                key={u.id}
                onClick={() => switchUser(u.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-500/10 font-medium'
                    : 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} avatarUrl={u.avatar} avatarPreset={u.avatarPreset} size="sm" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{u.name}</span>
                      {isCurrent && <span className="text-[10px] text-blue-500 font-bold">(Active)</span>}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {u.email} · {u.title || 'Member'}
                    </div>
                  </div>
                </div>
                {isCurrent && <Check className="w-4 h-4 text-blue-500" />}
              </button>
            );
          })}

          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex justify-between">
            <button
              onClick={() => {
                setSwitchUserModalOpen(false);
                setMode('register');
                useTaskFlowStore.setState({ currentUserId: null });
              }}
              className="text-[11px] text-blue-500 font-semibold hover:underline"
            >
              + Register New Organization
            </button>
            <button
              onClick={() => setSwitchUserModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Set Password Prompt Modal (Post-OTP Login)
  if (showSetPasswordModal) {
    return (
      <Modal
        isOpen={showSetPasswordModal}
        onClose={() => setShowSetPasswordModal(false)}
        title="Set Your Account Password"
        description="You logged in via Email OTP. Set a password so you can sign in directly in the future."
        maxWidth="md"
      >
        <form onSubmit={handleSetPasswordSubmit} className="space-y-3.5 text-xs">
          {setPasswordMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
              {setPasswordMsg}
            </div>
          )}

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
              New Password *
            </label>
            <input
              type="password"
              required
              value={newPostPassword}
              onChange={(e) => setNewPostPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              required
              value={newPostConfirmPassword}
              onChange={(e) => setNewPostConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSetPasswordModal(false)}
              className="px-3.5 py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs"
            >
              Save Password
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  // Not Logged In: Master Auth Modal
  return (
    <Modal
      isOpen={!currentUserId}
      onClose={() => {}}
      showCloseButton={false}
      maxWidth="md"
    >
      <div className="text-xs space-y-4">
        {/* Brand Lockup */}
        <div className="text-center pb-2 flex flex-col items-center">
          <DNLogo variant="full" size="md" className="mx-auto mb-2" />
          <p className="text-slate-500 text-xs mt-0.5">
            Desktop Task & Workspace Management Platform
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* REGISTRATION SUCCESS CARD WITH INVITE CODE */}
        {registeredOrgInfo ? (
          <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
              <Check className="w-5 h-5 text-blue-500" />
              <span>Workspace Registered Successfully!</span>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Your organization <strong>{registeredOrgInfo.orgName}</strong> is ready. Team members can join your workspace using this invite code:
            </p>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-blue-500/30 flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-blue-500 tracking-wider">
                {registeredOrgInfo.inviteCode}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(registeredOrgInfo.inviteCode);
                  setHasCopiedCode(true);
                  setTimeout(() => setHasCopiedCode(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-500 font-semibold"
              >
                {hasCopiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{hasCopiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setRegisteredOrgInfo(null);
                setSwitchUserModalOpen(false);
              }}
              className="w-full py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors"
            >
              Enter TaskFlow Workspace
            </button>
          </div>
        ) : mode === 'login' ? (
          /* WORKSPACE LOGIN FLOW */
          <div className="space-y-4">
            {detectedInvitation && (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>Workspace Invitation Detected</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  You are invited to collaborate in <strong>{detectedInvitation.org}</strong>. Enter your email and verify with OTP to join immediately.
                </p>
              </div>
            )}

            <div className="flex items-center justify-center p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                className={`flex-1 py-1.5 font-semibold rounded-lg transition-all ${
                  loginMethod === 'password'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('otp')}
                className={`flex-1 py-1.5 font-semibold rounded-lg transition-all ${
                  loginMethod === 'otp'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Login with Email OTP
              </button>
            </div>

            <form onSubmit={handleWorkspaceLoginSubmit} className="space-y-3.5">
              {/* Organization Name or Invite Code */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1 flex items-center justify-between">
                  <span>Organization Name or Invite Code *</span>
                  <span className="text-[10px] text-slate-400">e.g. Acme Corp / TF-PROD01</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={orgIdentifier}
                    onChange={(e) => setOrgIdentifier(e.target.value)}
                    placeholder="Enter workspace name or invite code..."
                    className="w-full pl-9 pr-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200 font-medium"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Work Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200 font-medium"
                  />
                </div>
              </div>

              {loginMethod === 'password' ? (
                /* Password Input */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-600 dark:text-slate-300 font-medium">Password *</label>
                    <button
                      type="button"
                      onClick={() => setLoginMethod('otp')}
                      className="text-[11px] text-blue-500 font-semibold hover:underline"
                    >
                      No password? Use Email OTP
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              ) : (
                /* OTP Verification Input */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-600 dark:text-slate-300 font-medium">
                      6-Digit Email OTP *
                    </label>
                    <button
                      type="button"
                      onClick={handleSendLoginOtp}
                      disabled={isSendingOtp}
                      className="text-[11px] text-blue-500 font-semibold hover:underline flex items-center gap-1"
                    >
                      {isSendingOtp ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      <span>{isSendingOtp ? 'Sending...' : 'Send OTP Code'}</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit verification code"
                    className="w-full px-3 py-2 text-center tracking-widest font-mono font-bold bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200 text-sm"
                  />

                  {otpSentMsg && (
                    <p className="text-[11px] text-emerald-500 font-medium">{otpSentMsg}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-xs transition-colors"
              >
                {loginMethod === 'otp' ? 'Verify OTP & Enter Workspace' : 'Sign In to Workspace'}
              </button>

              <div className="pt-2 border-t border-black/5 dark:border-white/5 text-center flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-slate-400 hover:text-blue-500 transition-colors"
                >
                  Forgot password?
                </button>
                <div>
                  <span className="text-slate-400">New here? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage('');
                    }}
                    className="text-blue-500 font-bold hover:underline"
                  >
                    Register Organization
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : mode === 'register' ? (
          /* ORGANIZATION REGISTRATION FLOW */
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs">
              <span className="font-bold block">Register Organization Workspace</span>
              <span className="text-[11px] text-slate-300">
                Setup your team workspace and create your administrator profile.
              </span>
            </div>

            <form onSubmit={handleRegisterOrgSubmit} className="space-y-3">
              {/* Organization Name */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Technologies"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200 font-semibold"
                />
              </div>

              {/* Admin Name & Role */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Administrator Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Sarah Chen"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={adminTitle}
                    onChange={(e) => setAdminTitle(e.target.value)}
                    placeholder="Founder, Lead"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Admin Email */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors mt-2"
              >
                Register Workspace & Administrator
              </button>

              <div className="pt-2 border-t border-black/5 dark:border-white/5 text-center">
                <span className="text-slate-400">Already have an organization? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                  }}
                  className="text-blue-500 font-bold hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* FORGOT PASSWORD / RECOVERY FLOW */
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs">
              <span className="font-bold block">Reset Account Password</span>
              <span className="text-[11px] text-slate-300">
                Enter your registered email and Account Recovery Key to reset your password.
              </span>
            </div>

            {recoveredSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Password updated successfully! Redirecting to login...</span>
              </div>
            )}

            <form onSubmit={handleRecoverySubmit} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Account Recovery Key *
                </label>
                <input
                  type="text"
                  required
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="TF-ADMIN-RECO-XXXX"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={newRecoverPassword}
                  onChange={(e) => setNewRecoverPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors"
              >
                Reset Password
              </button>

              <div className="pt-2 border-t border-black/5 dark:border-white/5 text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-blue-500 font-semibold hover:underline"
                >
                  ← Back to Workspace Sign In
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
};
