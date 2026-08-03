/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Thin client for the optional local Express backend (`server.js`).
 * The app must keep working exactly as before when no backend is running
 * (plain `npm run dev` / `npm start`, IndexedDB-only) — every function here
 * fails fast and predictably so callers can fall back to IndexedDB.
 */

import { AppState } from '../types';

const TOKEN_KEY = 'theodoitiendo_token';
const HEALTH_CHECK_TIMEOUT_MS = 1500;

export interface AuthUser {
  username: string;
  role: string;
}

/** Thrown by fetchState/pushState when the stored token is missing/expired. */
export class AuthRequiredError extends Error {
  constructor(message = 'Cần đăng nhập lại.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // localStorage can throw in some locked-down/private-browsing contexts.
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Best-effort only; an in-memory token still works for the current tab.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Detects whether a local backend (`node server.js`) is serving this page.
 * Resolves `false` (never rejects) on any network error or timeout, so
 * callers can treat "no backend" and "backend down" identically.
 */
export async function checkBackendHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const res = await fetch('/api/health', { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Throws with the server's Vietnamese error message on failure. */
export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Đăng nhập thất bại.');
  }
  return data;
}

/** Resolves the current user for a stored token (used to restore a session on reload). */
export async function fetchMe(token: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new AuthRequiredError();
  if (!res.ok) throw new Error('Không xác thực được phiên đăng nhập.');
  const data = await res.json();
  return data.user;
}

/** Returns the saved AppState from the server, or null if none exists yet. */
export async function fetchState(token: string): Promise<AppState | null> {
  const res = await fetch('/api/state', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new AuthRequiredError();
  if (!res.ok) throw new Error('Không tải được dữ liệu từ máy chủ.');
  return res.json();
}

export async function pushState(token: string, state: AppState): Promise<void> {
  const res = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(state),
  });
  if (res.status === 401) throw new AuthRequiredError();
  if (!res.ok) throw new Error('Không thể lưu dữ liệu lên máy chủ.');
}
