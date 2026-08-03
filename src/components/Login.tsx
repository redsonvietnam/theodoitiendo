/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, User, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/appStore';

/**
 * Shown instead of the main app when a backend (`node server.js`) is detected
 * but no valid session token is held. Plain `npm run dev`/`npm start` (no
 * backend) never renders this — the app behaves exactly as before.
 */
export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useAppStore(s => s.login);
  const isAuthenticating = useAppStore(s => s.isAuthenticating);
  const authError = useAppStore(s => s.authError);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    login(username.trim(), password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f4f2ec] px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-[#0f2444]">Đăng nhập</h1>
          <p className="text-sm text-slate-500 mt-1">Hệ thống quản lý tiến độ chỉ đạo & chỉ tiêu</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2444]/30 focus:border-[#0f2444]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2444]/30 focus:border-[#0f2444]"
              />
            </div>
          </div>

          {authError && (
            <div className="flex items-start gap-2 text-sm text-[#a3212e] bg-[#a3212e]/5 border border-[#a3212e]/20 rounded-lg p-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isAuthenticating || !username.trim() || !password}
            className="w-full py-2 rounded-lg bg-[#0f2444] text-white text-sm font-semibold hover:bg-[#0f2444]/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isAuthenticating ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          Chưa có tài khoản? Liên hệ người quản trị để tạo bằng lệnh <code>npm run backend:create-user</code>.
        </p>
      </div>
    </div>
  );
}
