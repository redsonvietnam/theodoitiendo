/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import './test-env.js';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  getAppState,
  saveAppState,
  findUserByUsername,
  createUser,
  countUsers,
  listUsers,
} from './db.js';

beforeEach(() => {
  db.exec('DELETE FROM users; DELETE FROM app_state;');
});

describe('db - users', () => {
  it('trả về null khi tìm tên đăng nhập chưa tồn tại', () => {
    expect(findUserByUsername('khong_ton_tai')).toBeUndefined();
  });

  it('tạo và tìm lại được người dùng', () => {
    createUser({ username: 'anhducca', passwordHash: 'hashed123', role: 'cong_an_xa' });

    const user = findUserByUsername('anhducca');
    expect(user).toBeDefined();
    expect(user.username).toBe('anhducca');
    expect(user.role).toBe('cong_an_xa');
    expect(user.password_hash).toBe('hashed123');
  });

  it('không cho phép trùng tên đăng nhập (ràng buộc UNIQUE)', () => {
    createUser({ username: 'trung_ten', passwordHash: 'h1', role: 'cong_an_xa' });
    expect(() =>
      createUser({ username: 'trung_ten', passwordHash: 'h2', role: 'lanh_dao' })
    ).toThrow();
  });

  it('chỉ chấp nhận role hợp lệ (ràng buộc CHECK)', () => {
    expect(() =>
      createUser({ username: 'sai_role', passwordHash: 'h1', role: 'admin' })
    ).toThrow();
  });

  it('countUsers/listUsers phản ánh đúng số lượng đã tạo', () => {
    expect(countUsers()).toBe(0);
    createUser({ username: 'u1', passwordHash: 'h', role: 'cong_an_xa' });
    createUser({ username: 'u2', passwordHash: 'h', role: 'lanh_dao' });
    expect(countUsers()).toBe(2);
    expect(listUsers().map(u => u.username).sort()).toEqual(['u1', 'u2']);
  });
});

describe('db - app_state', () => {
  it('trả về null khi chưa từng lưu dữ liệu', () => {
    expect(getAppState()).toBeNull();
  });

  it('lưu rồi đọc lại đúng dữ liệu (round-trip)', () => {
    const sample = {
      meta: { donVi: 'Công an xã Nâm Nung', thang: '07/2026' },
      A: [{ id: 'a1', stt: 1, content: 'x', maxPoints: 10, unit: 'điểm', status: '' }],
      B: [], C: [], D: [],
      hiddenSidebarItems: [],
    };

    saveAppState(sample);
    const result = getAppState();

    expect(result).not.toBeNull();
    expect(result.data).toEqual(sample);
    expect(result.updatedAt).toBeTruthy();
  });

  it('lưu lần 2 ghi đè lần 1 (không tạo thêm dòng)', () => {
    saveAppState({ meta: { donVi: 'X', thang: '1' }, A: [], B: [], C: [], D: [] });
    saveAppState({ meta: { donVi: 'Y', thang: '2' }, A: [], B: [], C: [], D: [] });

    const rowCount = db.prepare('SELECT COUNT(*) as c FROM app_state').get().c;
    expect(rowCount).toBe(1);
    expect(getAppState().data.meta.donVi).toBe('Y');
  });
});
