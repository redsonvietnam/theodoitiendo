/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkBackendHealth, login, fetchMe, fetchState, pushState,
  getToken, setToken, clearToken, AuthRequiredError,
} from './backendClient';

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

describe('token storage', () => {
  it('lưu, đọc, và xoá token qua localStorage', () => {
    expect(getToken()).toBeNull();
    setToken('abc123');
    expect(getToken()).toBe('abc123');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('checkBackendHealth', () => {
  it('trả về true khi /api/health phản hồi ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    await expect(checkBackendHealth()).resolves.toBe(true);
  });

  it('trả về false khi không có server (fetch reject) — không throw', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('no server'));
    await expect(checkBackendHealth()).resolves.toBe(false);
  });

  it('trả về false khi phản hồi không ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    await expect(checkBackendHealth()).resolves.toBe(false);
  });
});

describe('login', () => {
  it('trả về token + user khi đăng nhập thành công', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 't1', user: { username: 'an', role: 'cong_an_xa' } }),
    });
    const result = await login('an', 'matkhau');
    expect(result.token).toBe('t1');
    expect(result.user.username).toBe('an');
  });

  it('ném lỗi với thông báo từ server khi sai mật khẩu', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Sai tên đăng nhập hoặc mật khẩu.' }),
    });
    await expect(login('an', 'sai')).rejects.toThrow('Sai tên đăng nhập hoặc mật khẩu.');
  });
});

describe('fetchState / pushState / fetchMe', () => {
  it('fetchState ném AuthRequiredError khi token hết hạn (401)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false });
    await expect(fetchState('expired')).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('fetchState trả về null khi server chưa có dữ liệu', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(null) });
    await expect(fetchState('valid')).resolves.toBeNull();
  });

  it('pushState gửi kèm Authorization header và ném lỗi khi thất bại', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    globalThis.fetch = fetchMock;
    await expect(pushState('valid', { meta: { donVi: 'x', thang: '01/2026' }, A: [], B: [], C: [], D: [], hiddenSidebarItems: [] }))
      .rejects.toThrow('Không thể lưu dữ liệu lên máy chủ.');
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer valid');
  });

  it('fetchMe trả về user khi token hợp lệ', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ user: { username: 'an', role: 'lanh_dao' } }),
    });
    await expect(fetchMe('valid')).resolves.toEqual({ username: 'an', role: 'lanh_dao' });
  });
});
