/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import './server/test-env.js';
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from './server.js';
import { db, createUser } from './server/db.js';
import { hashPassword } from './server/auth.js';

const app = createServer();

beforeEach(() => {
  db.exec('DELETE FROM users; DELETE FROM app_state;');
});

async function loginAs(username, password, role) {
  const passwordHash = await hashPassword(password);
  createUser({ username, passwordHash, role });
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.body.token;
}

describe('POST /api/auth/login', () => {
  it('đăng nhập thành công trả về token và thông tin người dùng', async () => {
    await createUser({ username: 'test1', passwordHash: await hashPassword('12345'), role: 'cong_an_xa' });

    const res = await request(app).post('/api/auth/login').send({ username: 'test1', password: '12345' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toEqual({ username: 'test1', role: 'cong_an_xa' });
  });

  it('sai mật khẩu trả về 401', async () => {
    await createUser({ username: 'test1', passwordHash: await hashPassword('12345'), role: 'cong_an_xa' });

    const res = await request(app).post('/api/auth/login').send({ username: 'test1', password: 'sai' });
    expect(res.status).toBe(401);
  });

  it('tên đăng nhập không tồn tại trả về 401 (không lộ thông tin tài khoản nào sai)', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'khong_ton_tai', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('thiếu username/password trả về 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET/PUT /api/state - yêu cầu xác thực', () => {
  it('GET /api/state không có token trả về 401', async () => {
    const res = await request(app).get('/api/state');
    expect(res.status).toBe(401);
  });

  it('PUT /api/state không có token trả về 401', async () => {
    const res = await request(app).put('/api/state').send({ meta: {}, A: [], B: [], C: [], D: [] });
    expect(res.status).toBe(401);
  });

  it('GET /api/state trả về null khi chưa có dữ liệu', async () => {
    const token = await loginAs('u1', 'pass1234', 'cong_an_xa');

    const res = await request(app).get('/api/state').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it('PUT rồi GET trả về đúng dữ liệu vừa lưu', async () => {
    const token = await loginAs('u2', 'pass1234', 'lanh_dao');
    const payload = {
      meta: { donVi: 'Công an xã Nâm Nung', thang: '07/2026' },
      A: [], B: [{ id: 'b1', stt: 1, noiDung: 'test' }], C: [], D: [],
      hiddenSidebarItems: [],
    };

    const putRes = await request(app)
      .put('/api/state')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(putRes.status).toBe(200);
    expect(putRes.body.ok).toBe(true);

    const getRes = await request(app).get('/api/state').set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual(payload);
  });
});

describe('GET /api/health', () => {
  it('không cần xác thực, luôn trả 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
