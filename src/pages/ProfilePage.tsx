import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Shield, Key, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';
import { safeFetch } from '../lib/utils';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [copied, setCopied] = useState(false);

  const [mfaSetupData, setMfaSetupData] = useState<{ qrCodeUrl: string, secret: string } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchUser = async (signal?: AbortSignal) => {
    if (!authUser) return;
    setLoading(true);
    setError(null);
    try {
      const userData = await safeFetch<User>(`/api/users/${authUser.id}`, { signal });
      console.log('Fetched user data:', userData);
      if (userData) {
        setUser(userData);
      } else {
        setError('User profile not found');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch user profile:', err);
        setError(err.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchUser(controller.signal);
    return () => controller.abort();
  }, [authUser]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    try {
      await safeFetch(`/api/users/${authUser?.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordData.new }),
      });

      setMessage({ type: 'success', text: 'Password updated successfully' });
      setIsChangingPassword(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password' });
    }
  };

  const toggleMFA = async () => {
    if (!user) return;
    try {
      if (!user.mfaEnabled) {
        // Initiate setup
        const data = await safeFetch<{ qrCodeUrl: string, secret: string }>('/api/auth/mfa/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authUser?.id }),
        });
        setMfaSetupData(data);
      } else {
        // Disable
        setConfirmDialog({
          isOpen: true,
          title: 'Disable MFA',
          message: 'Are you sure you want to disable MFA? This will reduce your account security.',
          onConfirm: async () => {
            try {
              await safeFetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mfaEnabled: false }),
              });
              fetchUser();
              setMessage({ type: 'success', text: 'MFA disabled' });
            } catch (error: any) {
              setMessage({ type: 'error', text: error.message || 'Failed to disable MFA' });
            }
          }
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to initiate MFA toggle' });
    }
  };

  const activateMFA = async () => {
    try {
      await safeFetch('/api/auth/mfa/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser?.id, code: mfaVerifyCode }),
      });
      
      setMfaSetupData(null);
      setMfaVerifyCode('');
      fetchUser();
      setMessage({ type: 'success', text: 'MFA enabled successfully' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to activate MFA' });
    }
  };

  const copyBackupCodes = () => {
    if (!user?.backupCodes) return;
    navigator.clipboard.writeText(user.backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-zinc-500 animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-red-500 font-medium">{error}</p>
        <button 
          onClick={() => fetchUser()}
          className="px-4 py-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">My Profile</h1>
        <p className="text-zinc-500">Manage your account security and preferences</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6">
        {/* Account Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-2xl font-bold text-zinc-400">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.username}</h2>
              <p className="text-zinc-500 capitalize">{user.role} Account</p>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => setIsChangingPassword(true)}
              className="w-full flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                <span className="text-white font-medium">Change Password</span>
              </div>
              <RefreshCw className="w-4 h-4 text-zinc-600" />
            </button>
          </div>
        </div>

        {/* MFA Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield className={user.mfaEnabled ? "text-emerald-500" : "text-zinc-500"} />
              <h2 className="text-xl font-bold text-white">Multi-Factor Authentication</h2>
            </div>
            <button 
              onClick={toggleMFA}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                user.mfaEnabled 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' 
                : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-600'
              }`}
            >
              {user.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
            </button>
          </div>

          {user.mfaEnabled && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-zinc-400">Backup Recovery Codes</span>
                  <button 
                    onClick={copyBackupCodes}
                    className="text-emerald-500 hover:text-emerald-400 flex items-center gap-2 text-sm"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {user.backupCodes?.map((code, i) => (
                    <div key={i} className="font-mono text-sm text-zinc-300 bg-zinc-900 p-2 rounded border border-zinc-800 text-center">
                      {code}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-zinc-500">
                  Store these codes securely. They can be used to access your account if you lose your MFA device.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MFA Setup Modal */}
      {mfaSetupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Setup MFA</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code to verify.
            </p>
            
            <div className="bg-white p-4 rounded-xl mb-6 flex justify-center">
              <img src={mfaSetupData.qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" referrerPolicy="no-referrer" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaVerifyCode}
                  onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white text-center tracking-[0.5em] text-xl font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="000000"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setMfaSetupData(null)}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={activateMFA}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  Verify & Enable
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Password Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  Update
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-2">{confirmDialog.title}</h2>
            <p className="text-zinc-400 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className="px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
