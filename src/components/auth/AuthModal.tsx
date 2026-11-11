import React, { useState } from 'react';
import { useTaskFlowStore } from '../../stores/useTaskFlowStore';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { Shield, KeyRound, UserCheck, ArrowRight, Check, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    currentUserId,
    users,
    login,
    register,
    recoverPassword,
    switchUser,
    isSwitchUserModalOpen,
    setSwitchUserModalOpen,
  } = useTaskFlowStore();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [avatar, setAvatar] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [registeredKey, setRegisteredKey] = useState<string | null>(null);
  const [recoveredSuccess, setRecoveredSuccess] = useState(false);

  // If user is already logged in, only show switch modal if explicitly requested
  if (currentUserId && !isSwitchUserModalOpen) {
    return null;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = await login(email, password, rememberMe);
    if (!res.success) {
      setErrorMessage(res.error || 'Login failed');
    } else {
      setSwitchUserModalOpen(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    const res = await register(name, email, password, avatar, title);
    if (!res.success) {
      setErrorMessage(res.error || 'Registration failed');
    } else {
      setRegisteredKey(res.recoveryKey || null);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = await recoverPassword(email, recoveryKey, newPassword);
    if (!res.success) {
      setErrorMessage(res.error || 'Password recovery failed');
    } else {
      setRecoveredSuccess(true);
      setTimeout(() => {
        setRecoveredSuccess(false);
        setMode('login');
      }, 2500);
    }
  };

  // If opening switch user modal while logged in:
  if (isSwitchUserModalOpen) {
    return (
      <Modal
        isOpen={isSwitchUserModalOpen}
        onClose={() => setSwitchUserModalOpen(false)}
        title="Switch Local Workspace User"
        description="Select an existing local team account to simulate multi-user collaboration."
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
                    ? 'border-indigo-500 bg-indigo-500/10 font-medium'
                    : 'border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} avatarUrl={u.avatar} size="sm" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{u.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] text-indigo-500">(Active)</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{u.email} · {u.title || 'Member'}</div>
                  </div>
                </div>
                {isCurrent && <Check className="w-4 h-4 text-indigo-500" />}
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
              className="text-[11px] text-indigo-500 hover:underline"
            >
              + Create New Local Account
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

  // Not logged in: Show Authentication dialog
  return (
    <Modal
      isOpen={!currentUserId}
      onClose={() => {}}
      showCloseButton={false}
      maxWidth="md"
    >
      <div className="text-xs space-y-4">
        {/* Brand Lockup */}
        <div className="text-center pb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-md mb-2">
            TF
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            TaskFlow Desktop
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Local-First Task Architecture with Apple Liquid Glass UI
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Successful Registration Screen with Recovery Key */}
        {registeredKey ? (
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
              <Check className="w-4 h-4" />
              <span>Registration Successful!</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
              Here is your local <strong>Account Recovery Key</strong>. Save this in case you forget your password:
            </p>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg font-mono font-bold text-center text-sm border border-indigo-500/30 text-indigo-500 select-all">
              {registeredKey}
            </div>
            <button
              onClick={() => {
                setRegisteredKey(null);
                setMode('login');
              }}
              className="w-full py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-500 transition-colors"
            >
              Continue to Workspace
            </button>
          </div>
        ) : mode === 'login' ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Local Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@taskflow.local"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-500 font-medium">Password</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-indigo-500 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 accent-indigo-600 rounded"
                />
                <span>Remember me on this machine</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
            >
              Sign In
            </button>

            {/* Quick Demo Login Preset shortcuts */}
            <div className="pt-2 text-center text-slate-400">
              <span className="text-[11px]">Instant Demo Accounts (Default password: password123):</span>
              <div className="flex justify-center gap-2 mt-1.5">
                {users.slice(0, 3).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setEmail(u.email);
                      setPassword('password123');
                    }}
                    className="px-2 py-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 font-medium transition-colors"
                  >
                    {u.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-black/5 dark:border-white/5 text-center">
              <span className="text-slate-400">Don't have an account yet? </span>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-indigo-500 font-medium hover:underline"
              >
                Register
              </button>
            </div>
          </form>
        ) : mode === 'register' ? (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Chen"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@taskflow.local"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Job Title (Optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product Designer"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
            >
              Create Account
            </button>

            <div className="pt-2 border-t border-black/5 dark:border-white/5 text-center">
              <span className="text-slate-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-indigo-500 font-medium hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        ) : (
          /* FORGOT PASSWORD SIMULATION */
          <form onSubmit={handleRecoverySubmit} className="space-y-3">
            <p className="text-slate-500 text-xs">
              Enter your registered email and the Recovery Key you received upon creating your local account.
            </p>

            {recoveredSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Password updated! Returning to login...
              </div>
            )}

            <div>
              <label className="block text-slate-500 font-medium mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@taskflow.local"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Recovery Key</label>
              <input
                type="text"
                required
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value.toUpperCase())}
                placeholder="TASK-RECO-XXXX-XXXX"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none font-mono text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-colors"
            >
              Reset Password
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
