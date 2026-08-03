/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import './test-env.js';
import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword, signToken, verifyToken, authMiddleware } from './auth.js';

describe('hashPassword / verifyPassword', () => {
  it('mật khẩu đúng thì verify trả về true', async () => {
    const hash = await hashPassword('matkhau123');
    expect(await verifyPassword('matkhau123', hash)).toBe(true);
  });

  it('mật khẩu sai thì verify trả về false', async () => {
    const hash = await hashPassword('matkhau123');
    expect(await verifyPassword('sai-mat-khau', hash)).toBe(false);
  });

  it('không lưu mật khẩu dạng chữ thường (phải được băm)', async () => {
    const hash = await hashPassword('matkhau123');
    expect(hash).not.toBe('matkhau123');
    expect(hash.length).toBeGreaterThan(20);
  });
});

describe('signToken / verifyToken', () => {
  const user = { id: 1, username: 'anhducca', role: 'cong_an_xa' };

  it('token ký ra có thể verify lại đúng thông tin người dùng', () => {
    const token = signToken(user);
    const payload = verifyToken(token);
    expect(payload.username).toBe('anhducca');
    expect(payload.role).toBe('cong_an_xa');
  });

  it('token giả mạo (sai chữ ký) verify phải throw lỗi', () => {
    const token = signToken(user);
    const tampered = token.slice(0, -3) + 'xxx';
    expect(() => verifyToken(tampered)).toThrow();
  });
});

describe('authMiddleware', () => {
  const makeRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it('trả 401 khi thiếu header Authorization', () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('trả 401 khi token không hợp lệ', () => {
    const req = { headers: { authorization: 'Bearer token-gia' } };
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('gọi next() và gắn req.user khi token hợp lệ', () => {
    const token = signToken({ id: 2, username: 'lanhdao1', role: 'lanh_dao' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user.username).toBe('lanhdao1');
    expect(req.user.role).toBe('lanh_dao');
  });
});
