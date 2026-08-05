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
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamic import to handle spaces in path on Windows
const dbPath = path.join(__dirname, 'server', 'db.js');
const authPath = path.join(__dirname, 'server', 'auth.js');

let getAppState, saveAppState, findUserByUsername, countUsers, createUser;
let verifyPassword, signToken, authMiddleware, hashPassword;
try {
  ({ getAppState, saveAppState, findUserByUsername, countUsers, createUser } =
    await import(pathToFileURL(dbPath).href));
  ({ verifyPassword, signToken, authMiddleware, hashPassword } =
    await import(pathToFileURL(authPath).href));
} catch (e) {
  console.error('============================================================');
  console.error('LOI KHOI DONG: khong the nap module server (server/db.js hoac server/auth.js).');
  console.error('Neu loi ben duoi nhac den "better-sqlite3" hoac "NODE_MODULE_VERSION",');
  console.error('nghia la phien ban Node.js tren may nay KHAC voi phien ban Node.js');
  console.error('da dung de tao goi offline nay (better-sqlite3 co mot file .node');
  console.error('bien dich rieng cho tung phien ban Node). Hay dong bo phien ban Node.js.');
  console.error('============================================================');
  console.error(e);
  process.exitCode = 1;
  throw e;
}

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
  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));

  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        console.error(`[server] Khong tim thay ${path.join(distPath, 'index.html')}.`);
        console.error('[server] Ban da chay "npm run build" va da copy dist/ vao FINAL_PACKAGE chua?');
        next(err);
      }
    });
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

async function initializeDefaultUsers() {
  if (countUsers() === 0) {
    console.log('Cơ sở dữ liệu trống, đang tạo tài khoản mặc định...');
    const DEFAULT_USERS = [
      { username: 'lanhdao', password: 'lanhdao', role: 'lanh_dao' },
      { username: 'canbo', password: 'canbo', role: 'cong_an_xa' },
    ];

    for (const user of DEFAULT_USERS) {
      const passwordHash = await hashPassword(user.password);
      createUser({ username: user.username, passwordHash, role: user.role });
      console.log(`✓ Đã tạo tài khoản "${user.username}" với mật khẩu "${user.password}".`);
    }
    console.log('Hoàn tất tạo tài khoản mặc định.');
  }
}

if (isMainModule) {
  console.log(`[server] __dirname:  ${__dirname}`);
  console.log(`[server] dist path:  ${path.join(__dirname, 'dist')}`);
  console.log(`[server] data path:  ${path.join(__dirname, 'data')}`);
  const app = createServer();
  // Initialize DB before starting server
  initializeDefaultUsers()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`✓ Server đang chạy tại http://localhost:${PORT}`);
        console.log('  Truy cập ứng dụng bằng tài khoản lanhdao/lanhdao hoặc canbo/canbo.');
      });
    })
    .catch(err => {
      console.error('Lỗi nghiêm trọng khi khởi tạo máy chủ:', err);
      process.exit(1);
    });
} else {
  // Extra safety net: if this file is ever executed directly but the check
  // above somehow doesn't match (e.g. run via a symlink or unusual invoker),
  // print a clear message instead of exiting completely silently again.
  console.log('server.js: Module loaded, but not starting app.listen() (imported, not run directly).');
  console.log('--- DEBUG INFO FOR SILENT STARTUP ---');
  console.log(`  process.argv[1]: ${process.argv[1]}`);
  console.log(`  import.meta.url: ${import.meta.url}`);
  if (process.argv[1]) {
    try {
      const argvUrl = pathToFileURL(process.argv[1]).href;
      console.log(`  Converted argv[1] to URL: ${argvUrl}`);
      console.log(`  URLs match? ${import.meta.url === argvUrl}`);
    } catch (e) {
      console.error('  Error converting argv[1] to URL:', e);
    }
  }
  console.log('------------------------------------');
}
