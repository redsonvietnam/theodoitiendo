/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLI để tạo tài khoản không cần interactive input.
 * Chạy: node scripts/create-user-non-interactive.js <username> <password> <role>
 */

import { findUserByUsername, createUser } from '../server/db.js';
import { hashPassword } from '../server/auth.js';

async function main() {
  const [,, username, password, role] = process.argv;

  if (!username || !password || !role) {
    console.error('Usage: node scripts/create-user-non-interactive.js <username> <password> <role>');
    process.exit(1);
  }

  if (findUserByUsername(username)) {
    console.error(`Tên đăng nhập "${username}" đã tồn tại.`);
    process.exit(1);
  }

  if (password.length < 4) {
    console.error('Mật khẩu quá ngắn (tối thiểu 4 ký tự).');
    process.exit(1);
  }

  if (role !== 'cong_an_xa' && role !== 'lanh_dao') {
    console.error('Vai trò không hợp lệ. Chỉ chấp nhận "cong_an_xa" hoặc "lanh_dao".');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  createUser({ username, passwordHash, role });

  console.log(`\n✓ Đã tạo tài khoản "${username}" (${role === 'lanh_dao' ? 'Lãnh đạo' : 'Công an cấp xã'}).`);
}

main().catch(err => {
  console.error('Lỗi:', err);
  process.exit(1);
});
