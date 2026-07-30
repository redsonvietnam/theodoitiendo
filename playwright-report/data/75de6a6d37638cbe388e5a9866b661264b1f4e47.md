# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: export-excel.spec.ts >> E2E: Export an Excel file
- Location: e2e\export-excel.spec.ts:17:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Xuất file Excel báo cáo' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('button', { name: 'Xuất file Excel báo cáo' })

```

```yaml
- complementary:
  - text: CA
  - heading "CÔNG AN XÃ NÂM NUNG" [level=1]
  - paragraph: Theo dõi chỉ tiêu công việc
  - button "Thu nhỏ menu"
  - navigation:
    - button "Tổng quan"
    - button "Lịch nhiệm vụ Mới"
    - button "I. Tiêu chí chung 6"
    - button "II & III. Hiển thị chung 63"
    - button "II. Có thời hạn 25"
    - button "III. Thường xuyên 38"
    - button "IV. Chỉ tiêu QĐ11 63"
    - button "I. CHỈ TIÊU MỆNH LỆNH ĐẢNG ỦY CATW, BỘ CÔNG AN GIAO"
    - button "II. CHỈ TIÊU CÔNG TÁC CHUYÊN MÔN"
    - button "1. Công tác tham mưu"
    - button "2. Công tác bảo vệ an ninh quốc gia"
    - button "3. Công tác đấu tranh phòng, chống tội phạm"
    - button "3.1. Công tác điều tra, xử lý tội phạm"
    - button "3.2. Công tác đấu tranh phòng, chống tội phạm về trật tự xã hội"
    - button "3.3. Công tác đấu tranh phòng, chống tội phạm về kinh tế, tham nhũng, buôn lậu, môi trường"
    - button "3.4. Công tác đấu tranh phòng, chống tội phạm và vi phạm pháp luật về ma túy"
    - button "4. Công tác quản lý nhà nước"
    - button "6. Công tác nghiệp vụ cơ bản của lực lượng An ninh nhân dân"
    - button "7. Công tác nghiệp vụ cơ bản của lực lượng Cảnh sát nhân dân"
    - button "8. Công tác xây dựng phong trào toàn dân bảo vệ ANTQ, xây dựng Công an phường kiểu mẫu, Công an xã"
    - button "9. Công tác xây dựng Đảng, xây dựng lực lượng"
    - button "9.1. Công tác xây dựng Đảng, công tác chính trị, tổ chức cán bộ"
    - button "9.2. Công tác tổ chức cán bộ"
    - button "9.3. Công tác thanh tra, kiểm tra, giải quyết khiếu nại tố cáo"
    - button "III. CÁC NHÓM CHỈ TIÊU LỚN GIAI ĐOẠN 2026 - 2030"
    - button "Nhập / Xuất Excel"
    - button "Cấu hình"
  - text: Dữ liệu tự lưu trên thiết bị
- main:
  - heading "HỆ THỐNG QUẢN LÝ TIẾN ĐỘ CHỈ ĐẠO & CHỈ TIÊU" [level=1]
  - paragraph: "Đơn vị: Công an xã Nâm Nung • Tháng theo dõi: 07/2026"
  - button "THÊM NHIỆM VỤ MỚI"
  - button "63"
  - text: "Nhắc sao lưu dữ liệu: Bạn chưa từng xuất Excel để sao lưu trên trình duyệt này. Toàn bộ dữ liệu chỉ đang lưu trong trình duyệt này — xoá cache/đổi máy sẽ mất dữ liệu."
  - button "Xuất Excel ngay"
  - button "Nhắc lại sau 3 ngày"
  - heading "ĐỒNG BỘ DỮ LIỆU EXCEL HAI CHIỀU" [level=2]
  - paragraph: Nhập và xuất báo cáo dưới định dạng bảng tính Excel (.xlsx) gốc để sao lưu hoặc đồng bộ dữ liệu.
  - heading "Xuất file Excel báo cáo" [level=3]
  - paragraph: Download report worksheet
  - paragraph: Tạo file bảng tính Excel đầy đủ 4 mục tiêu chí (I, II, III, IV) và bảng tổng hợp điểm tự động dựa trên các trạng thái đánh giá, ngày hết hạn và ghi chú hiện tại của bạn.
  - text: "Cấu trúc trang tính khi xuất:"
  - button "Gộp chung 1 SheetTất cả các mục nằm chung trên một trang tính duy nhất"
  - button "Tách thành 5 Sheet1 trang Tổng hợp kết quả và 4 trang chi tiết từng Mục (I, II, III, IV)"
  - text: "Chọn mục cần xuất file:"
  - button "Tất cả các mục (I, II, III, IV)Xuất đầy đủ báo cáo 4 mục"
  - button "Chỉ Mục II (Có thời hạn) ★Mục thường xuyên theo dõi nhất"
  - button "Mục II & Mục IIIViệc có thời hạn & việc thường xuyên"
  - button "Chỉ Mục I (Tiêu chí chung)Tiêu chí Hướng dẫn 20-HD/ĐUCA"
  - button "Chỉ Mục III (Thường xuyên)Nhiệm vụ báo cáo định kỳ"
  - button "Chỉ Mục IV (Chỉ tiêu QĐ 11)Chỉ tiêu Công an tỉnh giao"
  - text: "Lọc thời gian nhiệm vụ:"
  - button "15 tháng trước - 14 tháng nàyChu kỳ đánh giá thường sử dụng nhất"
  - button "Việc trong tháng nàyLọc theo tháng dương lịch hiện tại"
  - button "Tùy chỉnh khoảng ngàyChọn khoảng ngày bắt đầu - kết thúc"
  - button "Tất cả thời gianXuất toàn bộ nhiệm vụ hiện có"
  - checkbox "Giữ lại nhiệm vụ thường xuyên (không có ngày cố định)" [checked]
  - text: "Giữ lại nhiệm vụ thường xuyên (không có ngày cố định) Trạng thái nhiệm vụ xuất:"
  - checkbox "Hoàn thành đúng hạn" [checked]
  - text: Hoàn thành đúng hạn
  - checkbox "Hoàn thành trễ hạn" [checked]
  - text: Hoàn thành trễ hạn
  - checkbox "Chưa hoàn thành" [checked]
  - text: Chưa hoàn thành
  - checkbox "Không áp dụng" [checked]
  - text: Không áp dụng
  - checkbox "Mới / Chưa đánh giá" [checked]
  - text: Mới / Chưa đánh giá
  - button "Chọn tất cả"
  - button "Bỏ chọn tất cả"
  - button "Xuất file Excel (1 Sheet tổng hợp)"
  - heading "Nhập file Excel đồng bộ" [level=3]
  - paragraph: Upload & Sync worksheet
  - paragraph: Tải lên file Excel (.xlsx) đã điền thông tin đánh giá hoặc thời hạn hoàn thành của các mục để đồng bộ dữ liệu nhanh vào phần mềm trên thiết bị này.
  - text: Kéo thả file Excel vào đây hoặc click để duyệtChấp nhận .xlsx hoặc .xls
  - button "Choose File"
  - heading "Bảng log tiến độ đồng bộ dữ liệu" [level=3]
  - button "Khôi phục dữ liệu gốc"
  - text: Sẵn sàng. Chưa có thao tác nào.
- text: Tự động lưu...
```

```
Error: page.waitForEvent: Test ended.
=========================== logs ===========================
waiting for event "download"
============================================================
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import path from 'path';
  3  | import fs from 'fs';
  4  | import { fileURLToPath } from 'url';
  5  | 
  6  | const __filename = fileURLToPath(import.meta.url);
  7  | const __dirname = path.dirname(__filename);
  8  | const downloadsPath = path.join(__dirname, '..', 'downloads_e2e');
  9  | 
  10 | test.beforeAll(() => {
  11 |   if (fs.existsSync(downloadsPath)) {
  12 |     fs.rmSync(downloadsPath, { recursive: true, force: true });
  13 |   }
  14 |   fs.mkdirSync(downloadsPath, { recursive: true });
  15 | });
  16 | 
  17 | test('E2E: Export an Excel file', async ({ page }) => {
  18 |   await page.goto('http://localhost:3000');
  19 |   await expect(page.locator('text=Đang tải dữ liệu...')).not.toBeVisible({ timeout: 20000 });
  20 | 
  21 |   // 1. Navigate to the Excel IO tab
  22 |   await page.getByRole('button', { name: 'Nhập / Xuất Excel' }).click();
  23 | 
  24 |   // 2. Start waiting for the download
> 25 |   const downloadPromise = page.waitForEvent('download');
     |                                ^ Error: page.waitForEvent: Test ended.
  26 | 
  27 |   // 3. Click the export button
  28 |   const exportButton = page.getByRole('button', { name: 'Xuất file Excel báo cáo' });
  29 |   await expect(exportButton).toBeVisible({ timeout: 10000 });
  30 |   await exportButton.click();
  31 | 
  32 |   // 4. Wait for the download to complete
  33 |   const download = await downloadPromise;
  34 | 
  35 |   // 5. Save the download to a temporary file
  36 |   const tempFilePath = path.join(downloadsPath, download.suggestedFilename());
  37 |   await download.saveAs(tempFilePath);
  38 | 
  39 |   // 6. Verify the file exists and is not empty
  40 |   expect(fs.existsSync(tempFilePath)).toBeTruthy();
  41 |   const stats = fs.statSync(tempFilePath);
  42 |   expect(stats.size).toBeGreaterThan(1000); // Expect a reasonable file size
  43 | });
  44 | 
```