/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SQLite layer for the backend. Deliberately simple for the target scale
 * (1-3 concurrent users on a single office PC):
 *  - `users` is a normal table (auth).
 *  - `app_state` stores the *entire* AppState (sections A/B/C/D + meta) as
 *    one JSON blob in a single row, mirroring exactly what the frontend
 *    already keeps in IndexedDB. This avoids a risky full relational
 *    redesign; it can be normalized into per-task rows later if/when the
 *    team grows enough to need real concurrent multi-row editing.
 *
 * PATH NOTE: __dirname here is the folder this file lives in on disk, i.e.
 * <install>/server (this file is server/db.js). path.join(__dirname, '..', 'data')
 * therefore resolves to <install>/data — one level UP from server/, which is the
 * install root — not to a folder outside the install. This only breaks if db.js
 * is ever moved to a different depth without updating the '..' here. Verified
 * empirically for FINAL_PACKAGE\server\db.js -> FINAL_PACKAGE\data.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.THEODOITIENDO_DB_PATH || path.join(DATA_DIR, 'theodoitiendo.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
console.log(`[db] Using database file: ${DB_PATH}`);

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('cong_an_xa', 'lanh_dao')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function getAppState() {
  const row = db.prepare('SELECT data, updated_at as updatedAt FROM app_state WHERE id = 1').get();
  if (!row) return null;
  return { data: JSON.parse(row.data), updatedAt: row.updatedAt };
}

export function saveAppState(data) {
  const json = JSON.stringify(data);
  db.prepare(`
    INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(json);
  return getAppState();
}

export function findUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function createUser({ username, passwordHash, role }) {
  return db
    .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, passwordHash, role);
}

export function countUsers() {
  return db.prepare('SELECT COUNT(*) as c FROM users').get().c;
}

export function listUsers() {
  return db.prepare('SELECT id, username, role, created_at FROM users').all();
}
