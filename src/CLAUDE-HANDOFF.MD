# Handoff — phiên làm việc với Claude về `public/data-viewer.html`

Dự án: **theodoitiendo** (theo dõi tiến độ văn bản/nhiệm vụ A/B/C/D cho Công an xã Nâm Nung). File làm việc chính: `public/data-viewer.html` — trang HTML tĩnh độc lập, đọc trực tiếp IndexedDB (`theodoitiendo-db` / store `app-state` / key `main-state`) của ứng dụng React, và (mới) có thể chuyển sang xem dữ liệu từ Backend SQLite qua API.

## Mô hình sử dụng đã xác nhận (quan trọng, quyết định toàn bộ kiến trúc backup)

- Phần lớn thời gian: **1 người, 1 máy**, chạy `npm run dev`.
- Thỉnh thoảng: chạy `npm start` để **các máy khác trong cùng LAN xem tạm** (không phải luôn luôn mở).
- Nhu cầu backup: **chỉ cần bản mới nhất**, không cần xem lại lịch sử/rollback theo thời điểm cũ.

→ Quyết định: **bỏ hẳn lớp JSON backup-server** (`backup-server.cjs`, `restore.js`, `PhucHoiDuLieu.bat`, thư mục `backups/`). Giữ lại 3 lớp: IndexedDB (chính) + Backend SQLite (khi bật LAN, giờ xem được trực tiếp trong `data-viewer.html`) + Excel export (định kỳ, đọc tay, không cần chạy app nào để mở).

## Đã đọc và xác minh trong phiên này

- `backup-server.cjs`: HTTP server độc lập trên `localhost:3001`, chỉ có 2 route, cả hai đều POST:
  - `POST /backup` — nhận `AppState` JSON, ghi đè `backups/latest_backup.json` + lưu thêm bản có timestamp (`backups/backup-<ISO-time>.json`) làm lịch sử.
  - `POST /delete-restore-file` — xóa `public/restore.json` nếu có.
  - **Không có** `GET /latest` — bản `data-viewer.html` trước đó gọi route này để preview sẽ luôn lỗi 404. Không còn quan trọng nữa vì đã quyết định bỏ lớp này.
- `restore.js`: script chạy tay (không phải server), copy `backups/latest_backup.json` → `public/restore.json`, rồi nhắc người dùng refresh app chính. Suy luận: app React lúc khởi động kiểm tra `public/restore.json`, nếu có thì nạp lại rồi gọi `/delete-restore-file` để dọn dẹp (chưa xác nhận trực tiếp trong code phía app — không còn cần xác minh nữa vì lớp này sẽ bị bỏ).

## Việc cần làm thủ công (ngoài phạm vi Claude sửa được — đây là file chạy server/máy bạn)

1. Xoá (hoặc archive riêng ra ngoài repo nếu muốn giữ tham khảo): `backup-server.cjs`, `restore.js`, `PhucHoiDuLieu.bat`, thư mục `backups/`.
2. Nếu có script trong app chính (`npm run backup:server`, hoặc code gọi `fetch('http://localhost:3001/backup', ...)` định kỳ) — cần tìm và gỡ luôn lời gọi đó, nếu không server sẽ báo lỗi kết nối liên tục không hại gì nhưng gây nhiễu log. **Claude chưa có source app chính (**`src/`**) nên chưa xác minh được vị trí gọi này.**
3. Kiểm tra `package.json` xem có script nào tham chiếu `backup-server.cjs` / `restore.js` không, gỡ luôn.

## Đã làm xong (đã áp dụng vào `public/data-viewer.html` — file đính kèm phiên này)

1. **UI tìm kiếm/lọc** (từ phiên trước, giữ nguyên): search + Refresh cùng hàng; chip lọc nhanh (Quá hạn/Trễ hạn/Sắp đến hạn/Còn hạn/Đạt/Chưa) có đếm live, chọn nhiều (OR); lọc khoảng ngày ban hành và hạn nộp (parse cả `dd/mm/yyyy` lẫn `yyyy-mm-dd`); lọc theo Loại VB/Đơn vị/Kiểu thời hạn; nút "Thu gọn tất cả".
2. **Tô màu nổi bật** (từ phiên trước, giữ nguyên): badge số hiệu văn bản riêng biệt; dòng/ô quá hạn-sắp hết hạn có nền màu.
3. **Sửa/Xóa trực tiếp trên IndexedDB** (từ phiên trước, giữ nguyên): nút ✎ Sửa/🗑 Xóa trên mỗi dòng mở rộng, ghi thẳng qua `persistData()`. **Chỉ hoạt động khi đang xem nguồn IndexedDB** — khi chuyển sang xem Backend SQLite, các nút này tự ẩn, thay bằng nhãn "🔒 Chỉ xem".
4. **MỚI — Toggle nguồn dữ liệu (IndexedDB ⇄ Backend SQLite)**:
   - 2 nút ở đầu trang: "IndexedDB (local)" / "Backend (SQLite qua API)".
   - Chọn "Backend" → gọi `checkBackendHealth()` (`GET /api/health`, timeout 1.5s) rồi `fetchBackendState()` (`GET /api/state` kèm `Authorization: Bearer <token>` từ `localStorage['theodoitiendo_token']`) → đổ vào cùng bộ hàm render đang dùng cho IndexedDB.
   - Ở chế độ Backend: **khóa Sửa/Xóa** (chỉ xem) để tránh ghi đè chéo không kiểm soát giữa hai nguồn dữ liệu độc lập — rủi ro này đã cảnh báo từ phiên trước, giờ được xử lý bằng UI thay vì chỉ ghi chú.
5. **Status panel** (từ phiên trước, cập nhật): còn lại **3 dòng** (đã bỏ dòng "Backup toàn project" vì lớp đó không còn tồn tại):
   - IndexedDB: luôn xanh, hiện số mục.
   - Backend SQLite: nếu không kết nối được → hiện màu xám "bình thường nếu chỉ chạy npm run dev" (không còn hiện đỏ/báo lỗi, vì việc backend tắt là trạng thái bình thường trong mô hình sử dụng hiện tại, không phải sự cố).
   - Excel Backup: giữ nguyên logic cũ (ngưỡng 7 ngày, đọc `localStorage['ca-xa-last-backup-export-ts']`).

## Chưa làm / cần làm tiếp

1. **Chưa xác nhận cấu hình proxy** `/api` **trong** `vite.config.ts` — status panel + toggle Backend giả định `data-viewer.html` được serve cùng origin với backend Express lúc chạy `npm start`. Nếu mở trực tiếp qua `file://`, `fetch('/api/health')` sẽ luôn fail — đúng ra phải hiện xám ("chưa bật LAN"), nhưng cần test thật để chắc chắn không hiện nhầm thành lỗi.
2. **Chưa test thực tế trên trình duyệt** — mọi kiểm tra tới giờ chỉ dừng ở `node -e "new Function(...)"` để bắt lỗi cú pháp JS, chưa chạy thử với dữ liệu thật, cả hai chế độ IndexedDB và Backend.
3. **Chưa gỡ các tham chiếu tới** `backup-server.cjs`**/**`restore.js` **trong app chính** (script npm, code gọi `fetch(...:3001/backup')` định kỳ nếu có) — cần bạn tự tìm trong `src/` vì Claude chưa có các file đó.
4. `HANDOFF.md` **gốc ở root project** (nếu có nội dung cũ khác bản này) — bản này nên **thay thế** nội dung liên quan tới backup-server (đã lỗi thời), nhưng nếu file gốc có phần khác (vd lịch sử sửa đổi các phần khác của app) thì nên hợp nhất thủ công, không ghi đè toàn bộ.

## File đính kèm phiên này

- `data-viewer.html` — bản cập nhật: bỏ toggle/preview JSON backup, thêm toggle xem IndexedDB ⇄ Backend SQLite (khóa sửa/xóa khi xem Backend), status panel còn 3 dòng.
- `HANDOFF.md` — file này.

## Gợi ý bước tiếp theo cho phiên sau

1. Copy `data-viewer.html` đè vào `public/data-viewer.html` (và `dist/` nếu build lại), test trên trình duyệt thật với cả `npm run dev` (chỉ IndexedDB) và `npm start` (có thêm Backend SQLite).
2. Xóa `backup-server.cjs`, `restore.js`, `PhucHoiDuLieu.bat`, thư mục `backups/`; gỡ script liên quan trong `package.json` và mọi lời gọi `fetch(...:3001/backup...)` trong `src/`.
3. Nếu sau này đổi ý muốn có lịch sử/rollback theo thời điểm, cân nhắc lại — nhưng với SQLite hiện tại (dường như chỉ lưu 1 bản state mới nhất, chưa versioned) thì cần thêm cơ chế mới, không phải khôi phục lại backup-server cũ.