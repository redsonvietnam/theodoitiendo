/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLI to automatically create default user accounts if they don't exist.
 */

import { findUserByUsername, createUser, listUsers } from '../server/db.js';
import { hashPassword } from '../server/auth.js';

const DEFAULT_USERS = [
  {
    username: 'lanhdao',
    password: 'lanhdao',
    role: 'lanh_dao',
    roleName: 'Lãnh đạo'
  },
  {
    username: 'canbo',
    password: 'canbo',
    role: 'cong_an_xa',
    roleName: 'Công an cấp xã'
  }
];

async function main() {
  console.log('Kiểm tra và tạo tài khoản mặc định...');

  let createdCount = 0;

  for (const user of DEFAULT_USERS) {
    if (findUserByUsername(user.username)) {
      console.log(`- Tài khoản "${user.username}" đã tồn tại.`);
    } else {
      const passwordHash = await hashPassword(user.password);
      createUser({ username: user.username, passwordHash, role: user.role });
      console.log(`✓ Đã tạo tài khoản "${user.username}" (${user.roleName}) với mật khẩu "${user.password}".`);
      createdCount++;
    }
  }

  if (createdCount > 0) {
    console.log(`\nHoàn tất! Đã tạo ${createdCount} tài khoản mới.`);
  } else {
    console.log('\nKhông có tài khoản mới nào được tạo. Tất cả tài khoản mặc định đã tồn tại.');
  }

  console.log('\nCác tài khoản hiện có:');
  const existing = listUsers();
  existing.forEach(u => console.log(`  - ${u.username} (${u.role === 'lanh_dao' ? 'Lãnh đạo' : 'Công an cấp xã'})`));
}

main().catch(err => {
  console.error('Lỗi:', err);
  process.exit(1);
});