import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { Shield, UserPlus, Trash2, Key, Check, X, ShieldAlert, RefreshCw, Copy, Eye, EyeOff, Unlock } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { safeFetch } from '../lib/utils';

export default function UserManagementPage() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<{ username: string, role: 'admin' | 'user' }>({ username: '', role: 'user' });
  const [error, setError] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [alertMessage, setAlertMessage] = useState<{ isOpen: boolean, message: string }>({ isOpen: false, message: '' });

  const fetchUsers = async (signal?: AbortSignal) => {
    try {
      const data = await safeFetch<User[]>('/api/users', { signal });
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch users:', error);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(controller.signal);
    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';
    
    try {
      await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ username: '', role: 'user' });
      fetchUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to save user');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ username: user.username, role: user.role });
    setIsModalOpen(true);
  };

  const toggleMFA = async (user: User & { mfaEnabled?: boolean }) => {
    try {
      await safeFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaEnabled: !user.mfaEnabled }),
      });
      fetchUsers();
    } catch (error: any) {
      setAlertMessage({ isOpen: true, message: error.message || 'Failed to toggle MFA' });
    }
  };

  const deleteUser = async (id: string) => {
    if (id === authUser?.id) {
      setAlertMessage({ isOpen: true, message: "You cannot delete your own account." });
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user?',
      onConfirm: async () => {
        try {
          await safeFetch(`/api/users/${id}`, { method: 'DELETE' });
          fetchUsers();
        } catch (error: any) {
          setAlertMessage({ isOpen: true, message: error.message || 'Failed to delete user' });
        }
      }
    });
  };

  const resetPassword = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Password',
      message: 'Reset password to "password"?',
      onConfirm: async () => {
        try {
          await safeFetch(`/api/users/${id}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'password' }),
          });
          setAlertMessage({ isOpen: true, message: 'Password reset to "password"' });
        } catch (error: any) {
          setAlertMessage({ isOpen: true, message: error.message || 'Failed to reset password' });
        }
      }
    });
  };

  const resetMFA = async (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset MFA',
      message: 'Reset MFA for this user? This will disable MFA and clear backup codes.',
      onConfirm: async () => {
        try {
          await safeFetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mfaEnabled: false }),
          });
          fetchUsers();
        } catch (error: any) {
          setAlertMessage({ isOpen: true, message: error.message || 'Failed to reset MFA' });
        }
      }
    });
  };

  const unblockUser = async (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Unblock User',
      message: 'Unblock this user?',
      onConfirm: async () => {
        try {
          await safeFetch(`/api/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isBlocked: false, failedLoginAttempts: 0 }),
          });
          fetchUsers();
        } catch (error: any) {
          setAlertMessage({ isOpen: true, message: error.message || 'Failed to unblock user' });
        }
      }
    });
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-zinc-500">Manage system access and security settings</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setFormData({ username: '', role: 'user' }); setIsModalOpen(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-zinc-950 border-bottom border-zinc-800">
            <tr>
              <th className="px-6 py-4 text-zinc-400 font-medium text-sm">User</th>
              <th className="px-6 py-4 text-zinc-400 font-medium text-sm">Role</th>
              <th className="px-6 py-4 text-zinc-400 font-medium text-sm">Status</th>
              <th className="px-6 py-4 text-zinc-400 font-medium text-sm">MFA Status</th>
              <th className="px-6 py-4 text-zinc-400 font-medium text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-zinc-950/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                      {u.username[0].toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{u.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                    u.role === 'admin' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {u.isBlocked ? (
                    <span className="px-2 py-1 rounded text-[10px] font-bold bg-red-500/10 text-red-500">
                      BLOCKED
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                      ACTIVE
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => toggleMFA(u)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      u.mfaEnabled 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}
                  >
                    {u.mfaEnabled ? <Shield className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    {u.mfaEnabled ? 'MFA Enabled' : 'MFA Disabled'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {u.mfaEnabled && (
                      <>
                        <button 
                          onClick={() => setShowBackupCodes(showBackupCodes === u.id ? null : u.id)}
                          className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
                          title="View Backup Codes"
                        >
                          {showBackupCodes === u.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => resetMFA(u)}
                          className="p-2 text-zinc-500 hover:text-orange-500 transition-colors"
                          title="Reset MFA"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {u.isBlocked && (
                      <button 
                        onClick={() => unblockUser(u)}
                        className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
                        title="Unblock User"
                      >
                        <Unlock className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => resetPassword(u.id)}
                      className="p-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Reset Password"
                      disabled={u.id === authUser?.id}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openEditModal(u)}
                      className="p-2 text-zinc-500 hover:text-white transition-colors"
                      title="Edit User"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteUser(u.id)}
                      className="p-2 text-zinc-500 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={u.id === '1' || u.id === authUser?.id}
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {showBackupCodes === u.id && u.backupCodes && (
                    <div className="mt-2 p-2 bg-zinc-950 rounded border border-zinc-800 text-left">
                      <div className="text-[10px] text-zinc-500 mb-1 flex justify-between">
                        <span>BACKUP CODES</span>
                        <button onClick={() => {
                          navigator.clipboard.writeText(u.backupCodes.join('\n'));
                        }} className="hover:text-emerald-500 flex items-center gap-1">
                          <Copy className="w-2 h-2" /> Copy
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {u.backupCodes.map((code: string, i: number) => (
                          <div key={i} className="text-[10px] font-mono text-zinc-400">{code}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e: any) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <p className="text-xs text-zinc-500 italic">Default password will be set to 'password'</p>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                {editingUser ? 'Save Changes' : 'Create User'}
              </button>
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

      {/* Alert Dialog */}
      {alertMessage.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-2">Notice</h2>
            <p className="text-zinc-400 mb-6">{alertMessage.message}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertMessage({ ...alertMessage, isOpen: false })}
                className="px-4 py-2 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
