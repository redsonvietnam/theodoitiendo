/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unified local server: serves the built frontend (dist/) and the API
 * (auth + app state) on a single port. Designed to run on one office PC,
 * not on the public internet.
 *
 * Usage:
 *   npm run build          # builds dist/
 *   node scripts/setup-users.js   # create the first user account
 *   npm run backend        # starts this server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { getAppState, saveAppState, findUserByUsername } from './server/db.js';
import { verifyPassword, signToken, authMiddleware } from './server/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3002;

export function createServer() {
  const app = express();
  app.use(cors()); // local tool only, not exposed to the internet — permissive CORS is fine
  app.use(express.json({ limit: '15mb' }));

  // --- Auth ---
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu.' });
    }

    const user = findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const token = signToken(user);
    res.json({ token, user: { username: user.username, role: user.role } });
  });

  app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ user: { username: req.user.username, role: req.user.role } });
  });

  // --- App state (protected) ---
  app.get('/api/state', authMiddleware, (req, res) => {
    const state = getAppState();
    res.json(state ? state.data : null);
  });

  app.put('/api/state', authMiddleware, (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    }
    try {
      const saved = saveAppState(req.body);
      res.json({ ok: true, updatedAt: saved.updatedAt });
    } catch (e) {
      console.error('Lỗi khi lưu app state:', e);
      res.status(500).json({ error: 'Không thể lưu dữ liệu vào máy chủ.' });
    }
  });

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // --- Serve the built frontend (must run `npm run build` first) ---
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return app;
}

// Only start listening when run directly (not when imported by tests).
// Compare via pathToFileURL (not manual string concatenation) so this works
// correctly on Windows too, where process.argv[1] uses backslashes and no
// leading slash before the drive letter (e.g. C:\Users\...\server.js),
// while import.meta.url is always a proper file:// URL with forward slashes.
const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`✓ Server đang chạy tại http://localhost:${PORT}`);
    console.log(`  Nếu chưa có tài khoản, chạy: npm run backend:create-user`);
  });
} else {
  // Extra safety net: if this file is ever executed directly but the check
  // above somehow doesn't match (e.g. run via a symlink or unusual invoker),
  // print a clear message instead of exiting completely silently again.
  console.log('server.js: đã nạp module, nhưng không khởi động app.listen() (được import, không phải chạy trực tiếp).');
}
