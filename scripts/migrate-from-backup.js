/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Di trú dữ liệu một lần từ file backup JSON (được tạo tự động bởi tính năng
 * "Sao lưu & Phục hồi" hiện có — backup-server.cjs / sendBackupToServer) vào
 * SQLite. Dùng file JSON thay vì parse lại Excel vì đây chính xác là cấu
 * trúc AppState gốc, không có rủi ro mất/sai dữ liệu khi chuyển đổi định dạng.
 *
 * Chạy:
 *   node scripts/migrate-from-backup.js
 *   node scripts/migrate-from-backup.js duong/dan/toi/file.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAppState, saveAppState } from '../server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BACKUP_PATH = path.join(__dirname, '..', 'backups', 'latest_backup.json');
const backupPath = process.argv[2] || DEFAULT_BACKUP_PATH;

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(backupPath)) {
  fail(
    `Không tìm thấy file: ${backupPath}\n` +
    `  Hãy chỉ định đường dẫn file JSON đã xuất, ví dụ:\n` +
    `  node scripts/migrate-from-backup.js duong/dan/toi/file.json\n` +
    `  (File này thường nằm ở thư mục backups/ cạnh backup-server.cjs)`
  );
}

if (getAppState()) {
  fail(
    'SQLite đã có dữ liệu sẵn — huỷ di trú để tránh ghi đè.\n' +
    '  Nếu chắc chắn muốn ghi đè, hãy xoá file data/theodoitiendo.db rồi chạy lại lệnh này.'
  );
}

let data;
try {
  data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
} catch (e) {
  fail(`File không phải JSON hợp lệ: ${e.message}`);
}

if (!data || !data.meta || !Array.isArray(data.B) || !Array.isArray(data.C)) {
  fail('File không đúng định dạng AppState (thiếu "meta" hoặc mảng "B"/"C").');
}

saveAppState(data);

console.log(`✓ Đã di trú thành công từ ${backupPath}`);
console.log(
  `  Tổng: Mục A=${data.A?.length || 0}, B=${data.B?.length || 0}, ` +
  `C=${data.C?.length || 0}, D=${data.D?.length || 0}`
);
