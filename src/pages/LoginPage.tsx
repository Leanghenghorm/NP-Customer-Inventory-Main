import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Shield, Lock, User } from 'lucide-react';
import { motion } from 'motion/react';
import { safeFetch } from '../lib/utils';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await safeFetch<any>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (data.success) {
        if (data.mfaRequired) {
          setShowMfa(true);
          setTempUser(data.user);
        } else {
          login(data.user);
        }
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await safeFetch<any>('/api/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUser.id, code: mfaCode }),
      });

      if (data.success) {
        login(data.user);
      } else {
        setError(data.message || 'Invalid MFA code');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    }
  };

  if (showMfa) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">MFA Required</h1>
            <p className="text-zinc-500 text-sm">Enter your 6-digit code or backup code</p>
          </div>

          <form onSubmit={handleMfaSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">MFA Code / Backup Code</label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.toUpperCase())}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-center tracking-[0.2em] text-xl font-mono"
                placeholder="000000"
                maxLength={12}
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-3 rounded-xl transition-colors"
            >
              Verify
            </button>
            
            <button
              type="button"
              onClick={() => setShowMfa(false)}
              className="w-full text-zinc-500 hover:text-white text-sm font-medium transition-colors"
            >
              Back to Login
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Identity & Application Security</h1>
          <p className="text-zinc-500 text-sm">Customer Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-3 rounded-xl transition-colors"
          >
            Sign In
          </button>
        </form>
      </motion.div>
    </div>
  );
}
