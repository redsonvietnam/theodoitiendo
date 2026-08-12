/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppState } from '../types';

// Mock the IndexedDB wrapper module so tests run without a real browser DB.
vi.mock('../db', () => ({
  getState: vi.fn(),
  setState: vi.fn(),
}));

import { getState as getDbState, setState as setDbState } from '../db';
import { useAppStore, buildDefaultState } from './appStore';
import { clearToken, setToken } from '../api/backendClient';

const mockedGetDbState = vi.mocked(getDbState);
const mockedSetDbState = vi.mocked(setDbState);

const sampleState: AppState = {
  meta: { donVi: 'Công an xã Nâm Nung', thang: '08/2026' },
  A: [], B: [], C: [], D: [], hiddenSidebarItems: [],
};

/** Builds a fetch mock that answers per-endpoint, matching what the real backend returns. */
function mockFetchRoutes(routes: Record<string, any>) {
  return vi.fn().mockImplementation((url: string, opts?: any) => {
    const key = `${opts?.method || 'GET'} ${url}`;
    const handler = routes[key] ?? routes[url];
    if (!handler) return Promise.reject(new Error(`unmocked route: ${key}`));
    return Promise.resolve(typeof handler === 'function' ? handler(opts) : handler);
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  useAppStore.setState({
    state: buildDefaultState(),
    isLoading: true,
    hasLoaded: false,
    showSaveToast: false,
    saveError: null,
    backendAvailable: null,
    needsAuth: false,
    authToken: null,
    authUser: null,
    authError: null,
    isAuthenticating: false,
  });
  window.alert = vi.fn();
});

describe('load() — phát hiện backend', () => {
  it('không có backend (health check fail) → rơi về luồng IndexedDB như cũ', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('no server'));
    mockedGetDbState.mockResolvedValue(sampleState);

    await useAppStore.getState().load();

    const s = useAppStore.getState();
    expect(s.backendAvailable).toBe(false);
    expect(s.needsAuth).toBe(false);
    expect(s.isLoading).toBe(false);
    expect(s.state.meta.thang).toBe('08/2026');
  });

  it('có backend nhưng chưa đăng nhập → needsAuth = true, không đụng tới IndexedDB', async () => {
    globalThis.fetch = mockFetchRoutes({
      'GET /api/health': { ok: true },
    });

    await useAppStore.getState().load();

    const s = useAppStore.getState();
    expect(s.backendAvailable).toBe(true);
    expect(s.needsAuth).toBe(true);
    expect(s.isLoading).toBe(false);
    expect(mockedGetDbState).not.toHaveBeenCalled();
  });

  it('có backend + token hợp lệ → nạp dữ liệu từ /api/state và cache vào IndexedDB', async () => {
    setToken('valid-token');
    globalThis.fetch = mockFetchRoutes({
      'GET /api/health': { ok: true },
      'GET /api/state': { ok: true, status: 200, json: () => Promise.resolve(sampleState) },
      'GET /api/auth/me': { ok: true, status: 200, json: () => Promise.resolve({ user: { username: 'an', role: 'cong_an_xa' } }) },
    });

    await useAppStore.getState().load();

    const s = useAppStore.getState();
    expect(s.needsAuth).toBe(false);
    expect(s.isLoading).toBe(false);
    expect(s.authUser).toEqual({ username: 'an', role: 'cong_an_xa' });
    expect(s.state.meta.thang).toBe('08/2026');
    expect(mockedSetDbState).toHaveBeenCalledWith(expect.objectContaining({ meta: sampleState.meta }));
  });

  it('có backend + token hết hạn (401) → xoá token, needsAuth = true', async () => {
    setToken('expired-token');
    globalThis.fetch = mockFetchRoutes({
      'GET /api/health': { ok: true },
      'GET /api/state': { status: 401, ok: false },
      'GET /api/auth/me': { status: 401, ok: false },
    });

    await useAppStore.getState().load();

    const s = useAppStore.getState();
    expect(s.needsAuth).toBe(true);
    expect(s.authToken).toBeNull();
    expect(useAppStore.getState().authToken).toBeNull();
  });
});

describe('login()', () => {
  it('đăng nhập thành công → lưu token, tải dữ liệu, needsAuth = false', async () => {
    globalThis.fetch = mockFetchRoutes({
      'POST /api/auth/login': {
        ok: true, status: 200,
        json: () => Promise.resolve({ token: 'new-token', user: { username: 'an', role: 'lanh_dao' } }),
      },
      'GET /api/state': { ok: true, status: 200, json: () => Promise.resolve(sampleState) },
      'GET /api/auth/me': { ok: true, status: 200, json: () => Promise.resolve({ user: { username: 'an', role: 'lanh_dao' } }) },
    });
    useAppStore.setState({ needsAuth: true, isLoading: false });

    await useAppStore.getState().login('an', 'matkhau');

    const s = useAppStore.getState();
    expect(s.needsAuth).toBe(false);
    expect(s.authToken).toBe('new-token');
    expect(s.authUser?.username).toBe('an');
    expect(s.authError).toBeNull();
  });

  it('sai mật khẩu → giữ nguyên needsAuth, hiển thị authError, không lưu token', async () => {
    globalThis.fetch = mockFetchRoutes({
      'POST /api/auth/login': { ok: false, json: () => Promise.resolve({ error: 'Sai tên đăng nhập hoặc mật khẩu.' }) },
    });
    useAppStore.setState({ needsAuth: true, isLoading: false });

    await useAppStore.getState().login('an', 'sai');

    const s = useAppStore.getState();
    expect(s.needsAuth).toBe(true);
    expect(s.authToken).toBeNull();
    expect(s.authError).toMatch(/Sai tên đăng nhập/);
  });
});

describe('logout()', () => {
  it('xoá token và bật lại needsAuth', () => {
    setToken('some-token');
    useAppStore.setState({ authToken: 'some-token', authUser: { username: 'an', role: 'cong_an_xa' } });

    useAppStore.getState().logout();

    const s = useAppStore.getState();
    expect(s.authToken).toBeNull();
    expect(s.authUser).toBeNull();
    expect(s.needsAuth).toBe(true);
  });
});

describe('tự động lưu khi có backend', () => {
  it('đẩy dữ liệu lên /api/state (PUT) sau khi state thay đổi, vẫn giữ cache IndexedDB', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const pushMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    globalThis.fetch = mockFetchRoutes({ 'PUT /api/state': pushMock });

    useAppStore.setState({
      state: sampleState, isLoading: false, hasLoaded: true,
      backendAvailable: true, authToken: 'valid-token',
    });

    useAppStore.getState().updateStatusA(0, 'dam_bao'); // no-op on empty A, but still triggers a state change
    useAppStore.setState({ state: { ...sampleState, meta: { ...sampleState.meta, thang: '09/2026' } } });

    await vi.advanceTimersByTimeAsync(350);

    expect(mockedSetDbState).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('token hết hạn khi lưu (401) → xoá token, bật needsAuth, báo saveError', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    globalThis.fetch = mockFetchRoutes({ 'PUT /api/state': { ok: false, status: 401 } });

    useAppStore.setState({
      state: sampleState, isLoading: false, hasLoaded: true,
      backendAvailable: true, authToken: 'expiring-token',
    });
    useAppStore.setState({ state: { ...sampleState, meta: { ...sampleState.meta, thang: '10/2026' } } });

    await vi.advanceTimersByTimeAsync(350);

    const s = useAppStore.getState();
    expect(s.authToken).toBeNull();
    expect(s.needsAuth).toBe(true);
    expect(s.saveError).toMatch(/hết hạn/);
    vi.useRealTimers();
  });
});
