/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLI đơn giản để tạo tài khoản đăng nhập cho backend.
 * Chạy: npm run backend:create-user
 */

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { findUserByUsername, createUser, listUsers } from '../server/db.js';
import { hashPassword } from '../server/auth.js';

const rl = readline.createInterface({ input: stdin, output: stdout });

async function main() {
  const existing = listUsers();
  if (existing.length > 0) {
    console.log('Các tài khoản hiện có:');
    existing.forEach(u => console.log(`  - ${u.username} (${u.role === 'lanh_dao' ? 'Lãnh đạo' : 'Công an cấp xã'})`));
    console.log('');
  }

  const username = (await rl.question('Tên đăng nhập mới: ')).trim();
  if (!username) {
    console.error('Tên đăng nhập không được để trống.');
    process.exit(1);
  }
  if (findUserByUsername(username)) {
    console.error(`Tên đăng nhập "${username}" đã tồn tại.`);
    process.exit(1);
  }

  const password = (await rl.question('Mật khẩu: ')).trim();
  if (password.length < 4) {
    console.error('Mật khẩu quá ngắn (tối thiểu 4 ký tự).');
    process.exit(1);
  }

  const roleInput = (await rl.question('Vai trò (1 = Công an cấp xã, 2 = Lãnh đạo) [1]: ')).trim();
  const role = roleInput === '2' ? 'lanh_dao' : 'cong_an_xa';

  const passwordHash = await hashPassword(password);
  createUser({ username, passwordHash, role });

  console.log(`\n✓ Đã tạo tài khoản "${username}" (${role === 'lanh_dao' ? 'Lãnh đạo' : 'Công an cấp xã'}).`);
  rl.close();
}

main().catch(err => {
  console.error('Lỗi:', err);
  process.exit(1);
});
