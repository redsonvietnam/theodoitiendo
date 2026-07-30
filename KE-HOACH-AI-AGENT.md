# Kế Hoạch Chỉ Đạo AI Agent — Cải Tổ Hệ Thống Quản Lý Tiến Độ Chỉ Đạo & Chỉ Tiêu

> Tài liệu này được viết để bạn **copy-paste từng Phase** làm prompt cho một AI coding agent (Claude Code, Cursor, Windsurf, v.v.) chạy trực tiếp trên repo. Đã phân tích sẵn codebase thật (không cần agent tự khám phá lại từ đầu → đỡ tốn quota/turn). Mỗi Phase độc lập tương đối, có Definition of Done rõ ràng để agent tự xác nhận trước khi dừng.

---

## 0. Cách dùng tài liệu

1. Làm theo **đúng thứ tự Phase 0 → 8**. Không nhảy cóc — Phase 1 (test an toàn) phải có trước khi refactor (Phase 3), nếu không sẽ không có cách nào biết agent có làm hỏng logic nghiệp vụ hay không.
2. Mỗi Phase bắt đầu một **phiên làm việc mới** với agent (context sạch), dán nguyên khối "🔧 PROMPT CHO AGENT" của Phase đó.
3. Sau khi agent báo xong, tự kiểm tra theo mục "✅ Definition of Done" — đừng chỉ tin lời agent, chạy lệnh thật.
4. Sau mỗi Phase: `git add -A && git commit -m "..."` (agent nên tự làm, nhưng bạn nên xác nhận có commit thật). Nếu Phase làm hỏng thứ gì, `git reset --hard` về commit trước và thử lại với chỉ dẫn kỹ hơn.
5. Không bắt agent làm 2 Phase cùng lúc trong 1 lệnh — càng nhỏ càng dễ review, càng ít quota lãng phí vì phải sửa sai.

---

## 1. Nguyên tắc bất biến (dán vào **đầu mọi Phase**, không được bỏ)

```
NGUYÊN TẮC BẮT BUỘC — không được vi phạm dù bất kỳ lý do gì:
1. Đây là ứng dụng đang chạy thật cho một đơn vị Công an xã, dữ liệu người dùng hiện có
   trong IndexedDB (idb, DB_NAME='theodoitiendo-db') và Excel export/import là bất khả xâm phạm.
   TUYỆT ĐỐI không thay đổi schema AppState (types.ts) theo cách phá vỡ dữ liệu cũ.
   Nếu bắt buộc phải đổi shape dữ liệu, PHẢI viết hàm migration (xem migrateTasks trong
   utils/cancu.ts làm ví dụ pattern đã có sẵn).
2. Không được xoá hoặc rút gọn bất kỳ nghiệp vụ/tính năng nào đang có, kể cả tính năng
   trông "thừa" hay "lạ". Nếu nghi ngờ 1 đoạn code có tác dụng gì, phải đọc kỹ trước khi
   động vào, không suy đoán rồi xoá.
3. Sau MỖI file hoặc MỖI cụm thay đổi nhỏ, chạy:
   - `npm run lint` (tsc --noEmit) → phải PASS, 0 lỗi TypeScript
   - `npm run build` → phải build thành công
   - `npx vitest run` → toàn bộ test hiện có phải PASS
   Nếu bất kỳ lệnh nào fail, DỪNG LẠI và sửa ngay, không được đi tiếp sang phần khác.
4. Giữ nguyên toàn bộ text tiếng Việt hiển thị cho người dùng (UI copy), không dịch,
   không diễn giải lại, không "chuẩn hoá chính tả" trừ khi được yêu cầu rõ ràng.
5. Commit git theo từng bước nhỏ, message dạng: `refactor(scope): mô tả ngắn`.
   KHÔNG gộp nhiều thay đổi không liên quan vào 1 commit.
6. Không thêm dependency mới nếu không được liệt kê rõ trong Phase đang làm.
7. Nếu 1 thay đổi có vẻ sẽ động vào >200 dòng cùng lúc, hãy dừng và chia nhỏ việc đó
   ra làm nhiều bước, báo cáo kế hoạch chia nhỏ trước khi thực thi.
8. Cuối mỗi Phase, viết ra một đoạn tóm tắt "Đã làm gì / Test nào đã chạy / Rủi ro còn
   lại" — không chỉ nói "Done".
```

---

## 2. Bản đồ hiện trạng codebase (đã phân tích sẵn — agent không cần dò lại)

```
Tech stack thực tế: React 19 + TypeScript, Vite 6, Tailwind CSS 4, idb (IndexedDB),
exceljs + xlsx, lucide-react, motion, express (chỉ dùng cho backup-server.js).
Test hiện có: 1 file Vitest (src/utils/cancu.test.ts, 191 dòng) — CHƯA có test cho
components hay App.tsx. CHƯA có E2E.

Kích thước file (dòng code):
  src/App.tsx                      1673   ← file "khổng lồ" cần refactor
  src/components/CalendarView.tsx  2438
  src/components/MainSectionBC.tsx 1834
  src/data.ts                      1402   (seed data tĩnh — KHÔNG động vào)
  src/components/ExcelIO.tsx       1592
  src/components/MainBC.tsx        1035
  src/components/ExcelTableView.tsx 981
  src/components/NotificationPanel.tsx 857
  src/utils/cancu.ts                695
  src/components/MainD.tsx          675
  src/components/Dashboard.tsx      579
  src/components/MilestoneManager.tsx 381
  src/components/DeptCombobox.tsx   253
  src/components/Sidebar.tsx        235
  src/utils/documentHelper.ts       660
  src/components/MainA.tsx          117
  src/components/MainB.tsx / MainC.tsx  ~50 mỗi file
  src/db.ts                          38   (wrapper idb, get/setState)
  src/types.ts                       88   (AppState, TaskA/BC/D, MetaData)

App.tsx hiện chứa ~40 useState + hàng chục handler, chia tự nhiên thành các nhóm sau
(dùng nhóm này làm chuẩn khi tách custom hooks ở Phase 3):

  NHÓM A — Core data & persistence (state chính của toàn app):
    state, setState (AppState), isLoading
    useEffect load từ IndexedDB (có logic "one-click restore" đọc /restore.json)
    useEffect auto-save debounce 300ms vào IndexedDB + sendBackupToServer
    updateMeta, updateHiddenSidebarItems, updateStatusA, updateTaskBC,
    addTaskBC, deleteTaskBC, updateTaskD, handleImportState, resetToDefault

  NHÓM B — Backup reminder system:
    daysSinceBackup, backupReminderDismissed
    dismissBackupReminder, isBackupSnoozed, getDaysSinceLastBackup (từ utils/cancu.ts)
    (phần đọc /restore.json nằm trong effect của Nhóm A nhưng thuộc logic backup)

  NHÓM C — View mode / UI preference (persist vào localStorage):
    viewModeB, viewModeC, viewModeBC, viewModeD, sidebarCollapsed, workspaceExpanded,
    showSectionI_IV
    handleSetViewModeB/C/BC/D, handleToggleSectionI_IV

  NHÓM D — Form "Thêm nhanh nhiệm vụ" (quick add), phức tạp nhất:
    loaiVanBan, so, ngay, quickDate, quickDateHetHan, donViBanHanh, trichYeu, noiDung,
    thoiHan, diemGiao, donVi, sanPham, ngayHetHan, gioHetHan, kieuThoiHan, donViTheoDoi,
    ghiChu, danhSachMoc, isExpanded, isGlobalAddOpen, targetSection, soNumberOnly,
    soSymbolOnly, selectedDeptCode, isFromCAT
    handleDocTypeChange, handleDeptCodeChange, handleCATToggle, applyTwoWayParsedResult,
    handleSoNumberChange, handleSymbolKeyDown, handleSoSymbolManualChange,
    handleOpenGlobalAdd, handleGlobalSaveTask, compileThoiHanString (dùng
    suggestDocumentSymbol/parseDocumentNumber/... từ utils/documentHelper.ts)

  NHÓM E — Navigation / transient UI state:
    activeTab, activeEditingTaskId, selectedSectionDIdx, showSaveToast

  Phần renderTabContent() (dòng ~877–1673, ~800 dòng JSX): switch theo activeTab để
  render Dashboard/MainA/MainB/MainC/MainBC/MainD/CalendarView/ExcelIO/Settings, cộng
  với JSX của: modal "thêm nhanh" (dùng Nhóm D), toast lưu (Nhóm E), banner nhắc backup
  (Nhóm B). Đây là phần cần tách thành component riêng ở Phase 3.
```

---

## PHASE 0 — Thiết lập an toàn (bắt buộc, làm trước tiên)

**Mục tiêu:** đảm bảo có lưới an toàn (git, biết chắc app chạy được) trước khi agent động vào bất cứ thứ gì.

### 🔧 PROMPT CHO AGENT
```
[dán NGUYÊN TẮC BẤT BIẾN ở mục 1]

Nhiệm vụ Phase 0 — CHỈ làm đúng các việc sau, không refactor gì cả:
1. Kiểm tra xem thư mục đã là git repo chưa (`git status`). Nếu chưa, chạy `git init`
   và commit toàn bộ trạng thái hiện tại với message "chore: baseline snapshot trước
   khi cải tổ".
2. Chạy `npm install`, báo cáo có lỗi/warning nghiêm trọng nào không.
3. Chạy `npm run build` và `npm run dev` (mở rồi tắt sau khi xác nhận server start
   thành công, không cần giữ chạy). Xác nhận ứng dụng build/chạy được ở trạng thái
   HIỆN TẠI, trước khi có bất kỳ thay đổi nào.
4. Chạy `npx vitest run`, ghi lại kết quả (bao nhiêu test pass) làm baseline.
5. Tạo file `docs/BASELINE.md` ghi lại: kết quả 3 lệnh trên, ngày giờ, commit hash.
6. Tạo branch mới `refactor/phase-1-testing` để bắt đầu làm việc từ Phase 1 trở đi
   (không làm trực tiếp trên main/master).
```

### ✅ Definition of Done
- Có git history, có commit baseline.
- `docs/BASELINE.md` tồn tại và có số liệu thật (không phải agent bịa).
- Đang đứng ở branch `refactor/phase-1-testing`.

---

## PHASE 1 — Xây lưới an toàn bằng test TRƯỚC khi refactor

**Vì sao làm trước Phase refactor:** nếu viết test sau khi đã refactor, test sẽ được viết để khớp với code đã bị thay đổi (có thể đã sai) chứ không phải khớp với hành vi gốc. Test phải "chụp ảnh" hành vi đúng của bản gốc trước.

### 🔧 PROMPT CHO AGENT
```
[dán NGUYÊN TẮC BẤT BIẾN]

Nhiệm vụ Phase 1 — CHỈ viết test, KHÔNG sửa code nghiệp vụ (nếu phát hiện bug khi
viết test, ghi chú lại trong docs/BUGS-FOUND.md, KHÔNG tự ý sửa).

1. Unit test (Vitest) cho toàn bộ hàm public trong:
   - src/utils/cancu.ts: migrateTasks, compileCanCu, isRecurringText, cleanInlineText,
     formatParagraphText, daysUntil, getDaysSinceLastBackup (mở rộng thêm case cho
     cancu.test.ts hiện có, không xoá test cũ).
   - src/utils/documentHelper.ts: suggestDocumentSymbol, parseDocumentNumber,
     formatDonViBanHanhDisplay, parseDocumentSymbolTwoWay, tryExpandShorthand,
     formatToDDMMYY, parseQuickDate.
   Mỗi hàm cần: case bình thường, case biên (empty string, null/undefined nếu type
   cho phép), và ít nhất 1 case dựa trên input thực tế thấy trong src/data.ts (seed
   data) để đảm bảo test phản ánh dữ liệu thật.

2. Cài Playwright: `npm install -D @playwright/test && npx playwright install`.
   Viết 4 kịch bản E2E tối thiểu (chạy trên `npm run dev`):
   a. Thêm 1 nhiệm vụ mới ở mục B qua form "Thêm nhanh" → xuất hiện trong danh sách.
   b. Sửa trạng thái 1 nhiệm vụ (updateTaskBC) → trạng thái cập nhật đúng, badge
      màu đổi đúng theo hạn (đúng hạn/trễ hạn/chưa hoàn thành).
   c. Xoá 1 nhiệm vụ → biến mất khỏi danh sách, không ảnh hưởng nhiệm vụ khác.
   d. Export ra Excel (ExcelIO) → file tải về tồn tại và không rỗng (kiểm tra qua
      Playwright download API, không cần đọc nội dung Excel).
   Lưu tất cả vào thư mục `e2e/`.

3. Thêm script vào package.json: `"test": "vitest run"`, `"test:e2e": "playwright test"`.

4. Chạy toàn bộ, đảm bảo 100% pass. Commit: "test: thêm unit test cho utils và E2E
   baseline trước khi refactor".
```

### ✅ Definition of Done
- `npx vitest run` pass toàn bộ, coverage rõ ràng tăng so với Phase 0.
- `npx playwright test` chạy pass cả 4 kịch bản trên máy thật (không phải chỉ agent tự nói).
- Có `docs/BUGS-FOUND.md` (có thể trống nếu không phát hiện gì).

---

## PHASE 2 — Tăng cường Type Safety

**Mục tiêu:** loại bỏ `any`, siết kiểu dữ liệu, TRƯỚC KHI refactor cấu trúc — vì sửa type dễ gây lỗi biên dịch rõ ràng (dễ agent tự phát hiện), nên làm khi codebase còn ở cấu trúc quen thuộc sẽ an toàn hơn.

### 🔧 PROMPT CHO AGENT
```
[dán NGUYÊN TẮC BẤT BIẾN]

Nhiệm vụ Phase 2:
1. Bật chế độ nghiêm ngặt hơn trong tsconfig.json: thêm "strict": true (nếu chưa có),
   "noImplicitAny": true, "noUncheckedIndexedAccess": true. Nếu bật lên gây quá nhiều
   lỗi (>50), báo cáo số lượng lỗi theo từng file, KHÔNG tự tắt lại flag, mà xử lý
   từng file một, ưu tiên file nhỏ trước (MainA.tsx, MainB.tsx, MainC.tsx, DeptCombobox.tsx)
   rồi đến file lớn.
2. Tìm toàn bộ `any` trong src/ (`grep -rn ": any" src/` và `grep -rn "as any" src/`),
   liệt kê ra docs/TYPE-SAFETY-TODO.md trước, rồi xử lý từng chỗ:
   - Ưu tiên thay bằng type cụ thể từ types.ts (TaskA/TaskBC/TaskD/AppState).
   - Nếu thực sự cần kiểu động (ví dụ dữ liệu Excel import chưa rõ shape), dùng
     `unknown` + type guard thay vì `any`.
3. Với updateTaskBC(section, idx, fieldOrFields, value?) trong App.tsx — chữ ký hàm
   này đang nhận cả 1 field đơn hoặc cả object Partial<TaskBC>, hãy viết overload
   type rõ ràng cho 2 trường hợp thay vì dùng `any` cho value.
4. Sau mỗi file sửa xong: chạy lint + build + vitest, xác nhận pass rồi mới sang
   file kế tiếp.
5. Commit theo từng file/nhóm nhỏ: "refactor(types): siết kiểu dữ liệu cho ExcelIO.tsx"
   (ví dụ), không gộp tất cả vào 1 commit.
```

### ✅ Definition of Done
- `tsc --noEmit` pass với "strict": true, không còn `any` (trừ những chỗ có comment
  giải thích rõ tại sao bắt buộc phải dùng, ví dụ tương tác với thư viện exceljs không
  có type tốt).
- Toàn bộ test Phase 1 vẫn pass nguyên vẹn.

---

## PHASE 3 — Refactor App.tsx: tách component & custom hooks

**Mục tiêu:** đưa App.tsx từ 1673 dòng xuống dưới ~150 dòng (chỉ còn compose hooks + layout), theo đúng 5 nhóm đã liệt kê ở mục 2.

### 🔧 PROMPT CHO AGENT
```
[dán NGUYÊN TẮC BẤT BIẾN]

Nhiệm vụ Phase 3 — thực hiện TỪNG BƯỚC nhỏ theo đúng thứ tự dưới đây, sau MỖI bước
chạy lại lint + build + vitest + playwright, commit riêng, RỒI MỚI làm bước tiếp theo.
Không làm gộp nhiều bước cùng lúc.

BƯỚC 1 — src/hooks/useViewPreferences.ts (rủi ro thấp nhất, làm trước để làm quen):
  Tách toàn bộ NHÓM C (viewModeB/C/BC/D, sidebarCollapsed, workspaceExpanded,
  showSectionI_IV + các handler tương ứng, bao gồm cả logic đọc/ghi localStorage
  đang nằm trong các useState initializer dạng `useState(() => {...localStorage...})`).
  Hook trả về: { viewModeB, viewModeC, viewModeBC, viewModeD, sidebarCollapsed,
  workspaceExpanded, showSectionI_IV, setViewModeB, setViewModeC, setViewModeBC,
  setViewModeD, setSidebarCollapsed, setWorkspaceExpanded, toggleSectionI_IV }.
  Cập nhật App.tsx dùng hook này thay cho state cũ, KHÔNG đổi tên biến dùng trong JSX
  (để diff nhỏ, dễ review).

BƯỚC 2 — src/hooks/useBackupSystem.ts (NHÓM B):
  Tách daysSinceBackup, backupReminderDismissed, dismissBackupReminder, isBackupSnoozed.
  Phần đọc /restore.json hiện đang nằm lồng trong effect load dữ liệu (NHÓM A) — TÁCH
  RA thành 1 hàm độc lập `attemptRestoreFromBackupFile(): Promise<AppState | null>`
  trong hook này, để useAppData (Bước 4) gọi hàm này trước khi tự load từ IndexedDB.
  Giữ nguyên toàn bộ log console.log/console.error hiện có (dùng để debug thực địa).

BƯỚC 3 — src/hooks/useQuickAddForm.ts (NHÓM D, phần phức tạp nhất):
  Tách toàn bộ 24 state + 9 handler liệt kê ở NHÓM D. Đây là logic có nhiều quy tắc
  nghiệp vụ đặc thù (parse số hiệu văn bản, gợi ý ký hiệu) — đọc kỹ handleSoNumberChange,
  handleSymbolKeyDown, handleSoSymbolManualChange, applyTwoWayParsedResult TRƯỚC KHI
  di chuyển, đảm bảo copy nguyên văn logic, không "tối ưu lại" cách viết trong lúc
  di chuyển (tối ưu nếu muốn thì làm ở Phase riêng, không trộn với việc di chuyển vị trí).
  Hook nhận vào callback `onSave: (task: Omit<TaskBC,'id'|'stt'>, section:'B'|'C') => void`
  (chính là addTaskBC từ App, sẽ được nối ở Bước 4) để giữ hook này không phụ thuộc
  trực tiếp vào state chính của app.

BƯỚC 4 — src/hooks/useAppData.ts (NHÓM A, quan trọng nhất, làm sau cùng khi đã quen):
  Tách state (AppState), isLoading, 2 useEffect (load + auto-save debounce),
  updateMeta, updateHiddenSidebarItems, updateStatusA, updateTaskBC, addTaskBC,
  deleteTaskBC, updateTaskD, handleImportState, resetToDefault.
  Effect load PHẢI gọi attemptRestoreFromBackupFile() từ useBackupSystem (Bước 2)
  trước, giữ nguyên thứ tự logic gốc: thử restore trước, nếu không có mới đọc
  IndexedDB, nếu IndexedDB cũng rỗng mới dùng SEED_A/B/C/D.
  Giữ nguyên hành vi debounce 300ms và gọi sendBackupToServer sau khi lưu.

BƯỚC 5 — NHÓM E (navigation) → src/hooks/useAppNavigation.ts:
  activeTab, activeEditingTaskId, selectedSectionDIdx, showSaveToast + setter tương ứng.
  (showSaveToast thực chất được set bởi useAppData sau khi save — cân nhắc để
  showSaveToast SỐNG trong useAppData và useAppNavigation chỉ giữ 3 state còn lại;
  agent tự quyết định chỗ hợp lý nhất, miễn có comment giải thích lý do.)

BƯỚC 6 — Tách phần JSX renderTabContent() (dòng ~877–1673) thành các component:
  - src/components/layout/AppShell.tsx: khung layout chính (Sidebar + khu vực nội dung).
  - src/components/layout/GlobalQuickAddModal.tsx: modal "thêm nhanh nhiệm vụ", dùng
    useQuickAddForm.
  - src/components/layout/SaveStatusToast.tsx: toast báo đã lưu.
  - src/components/layout/BackupReminderBanner.tsx: banner nhắc backup, dùng
    useBackupSystem.
  - src/components/layout/TabContent.tsx: switch theo activeTab render
    Dashboard/MainA/MainB/MainC/MainBC/MainD/CalendarView/ExcelIO/Settings (các
    component con này ĐÃ tồn tại sẵn, chỉ cần truyền đúng props).

BƯỚC 7 — App.tsx cuối cùng chỉ còn: gọi 5 custom hooks ở trên + render <AppShell>
  với các props/callbacks tương ứng. Xác nhận số dòng còn lại (mục tiêu <150 dòng,
  báo cáo con số thật).

Sau BƯỚC 7: chạy lại toàn bộ 4 kịch bản E2E ở Phase 1 — đây là bài kiểm tra quan
trọng nhất, nếu bất kỳ kịch bản nào fail nghĩa là refactor đã làm hỏng hành vi,
PHẢI sửa cho pass 100% trước khi coi Phase 3 là xong.
```

### ✅ Definition of Done
- App.tsx < 150 dòng.
- Có đủ 5 file trong `src/hooks/` và 5 file trong `src/components/layout/`.
- `tsc --noEmit`, `npm run build`, `npx vitest run`, `npx playwright test` — TẤT CẢ pass.
- Test bằng tay: mở app thật, thêm/sửa/xoá 1 nhiệm vụ, export Excel, xem còn hoạt động y hệt trước refactor không.

---

## PHASE 4 — Chuyển sang Zustand

**Mục tiêu:** thay `useAppData` (dùng useState + useEffect) bằng Zustand store, có middleware persist bất đồng bộ vào IndexedDB.

### 🔧 PROMPT CHO AGENT
```
[dán NGUYÊN TẮC BẤT BIẾN]

Nhiệm vụ Phase 4:
1. `npm install zustand`.
2. Tạo `src/store/useTaskStore.ts`:
   - State: toàn bộ AppState (meta, A, B, C, D, hiddenSidebarItems) + isLoading.
   - Actions: updateMeta, updateHiddenSidebarItems, updateStatusA, updateTaskBC,
     addTaskBC, deleteTaskBC, updateTaskD, importState, resetToDefault, loadInitialData
     (gộp logic attemptRestoreFromBackupFile + getState từ IndexedDB + seed fallback
     đang có trong useAppData).
   - Dùng `persist` middleware của zustand với storage tùy chỉnh (KHÔNG dùng
     localStorage) — viết 1 custom storage adapter gọi db.ts (getState/setState hiện
     có, dựa trên idb) theo interface StateStorage async của zustand/persist
     (getItem/setItem/removeItem trả về Promise). Giữ nguyên tên DB_NAME/STORE_NAME/KEY
     trong db.ts để dữ liệu người dùng cũ đọc được bình thường — TUYỆT ĐỐI không đổi
     tên các hằng số này.
   - Giữ nguyên hành vi debounce 300ms trước khi ghi xuống IndexedDB + gọi
     sendBackupToServer sau khi ghi thành công (có thể dùng subscribe của zustand
     thay vì useEffect, hoặc middleware riêng — agent tự chọn cách rõ ràng nhất,
     giải thích lựa chọn bằng comment).
3. Tạo `src/store/useViewPreferenceStore.ts` tương tự cho NHÓM C (view mode, sidebar
   collapsed...), dùng persist middleware với localStorage (trường hợp này localStorage
   là phù hợp vì bản gốc vốn đã dùng localStorage cho nhóm này — không đổi sang IndexedDB).
4. Xoá hook `useAppData.ts` cũ, thay mọi nơi gọi bằng `useTaskStore()`. Tương tự xoá
   `useViewPreferences.ts`, thay bằng `useViewPreferenceStore()`.
5. Sau khi xong, chạy lại đầy đủ bộ test (unit + E2E) — đặc biệt kỹ càng với kịch bản
   "tải lại trang, dữ liệu vẫn còn" (test thủ công: thêm 1 task, F5, kiểm tra task
   vẫn còn) vì đây là chỗ dễ vỡ nhất khi đổi cơ chế persist.
6. KHÔNG chuyển useQuickAddForm và useAppNavigation sang Zustand — 2 hook đó là state
   cục bộ hợp lý (form nhập liệu tạm thời, không cần global store), giữ nguyên dạng
   useState.
```

### ✅ Definition of Done
- Toàn bộ actions CRUD hoạt động qua Zustand store, không còn prop-drilling state
  chính qua nhiều tầng component.
- Reload trang giữ nguyên dữ liệu (kiểm tra thủ công bắt buộc, không chỉ tin test).
- Toàn bộ test Phase 1 vẫn pass.

---

## PHASE 5 — Tối ưu UI/UX: loading & error states

### 🔧 PROMPT CHO AGENT
```
[dán NGUYÊN TẮC BẤT BIẾN]

Nhiệm vụ Phase 5:
1. Rà toàn bộ chỗ gọi async trong store (Zustand) và các component còn lại
   (ExcelIO import/export, ghi IndexedDB, gọi backup-server) — liệt kê trong
   docs/ASYNC-AUDIT.md: chỗ nào có try/catch, chỗ nào chưa có, chỗ nào lỗi bị nuốt
   (chỉ console.error mà không hiển thị gì cho người dùng).
2. Thêm loading skeleton nhất quán (dùng Tailwind, không thêm thư viện mới) cho:
   khởi động app (đang có isLoading nhưng UI hiện tại hiển thị gì khi loading — kiểm
   tra và cải thiện nếu đang là màn hình trắng), import Excel (file lớn có thể mất
   vài giây), export Excel.
3. Thêm error boundary React ở cấp App (component mới src/components/ErrorBoundary.tsx)
   để bắt lỗi runtime không mong muốn, hiển thị màn hình lỗi thân thiện bằng tiếng Việt
   thay vì màn hình trắng, có nút "Tải lại trang".
4. Với các thao tác có thể thất bại (import Excel sai định dạng, ghi IndexedDB thất
   bại do hết dung lượng, restore file lỗi format) — thay console.error đơn thuần
   bằng thông báo toast/alert tiếng Việt rõ ràng cho người dùng, dùng lại pattern
   toast đã có (SaveStatusToast từ Phase 3) hoặc tạo biến thể lỗi của nó.
5. Không đổi luồng nghiệp vụ, chỉ thêm phản hồi trực quan.
```

### ✅ Definition of Done
- Danh sách trong ASYNC-AUDIT.md không còn chỗ nào lỗi bị nuốt âm thầm.
- Thử cố tình: import file Excel sai định dạng → thấy thông báo lỗi rõ ràng thay vì
  im lặng hoặc crash trắng màn hình.

---

## PHASE 6 — Test toàn diện sau refactor

### 🔧 PROMPT CHO AGENT
```
[dán NGUYÊN TẮC BẤT BIẾN]

Nhiệm vụ Phase 6:
1. Viết unit test (Vitest + @testing-library/react, cài thêm nếu chưa có) cho từng
   custom hook tạo ở Phase 3–4: useQuickAddForm, useAppNavigation, useTaskStore,
   useViewPreferenceStore, useBackupSystem — dùng `renderHook` từ
   @testing-library/react.
2. Mở rộng E2E Playwright thêm các luồng: sửa nhiều nhiệm vụ liên tiếp (kiểm tra
   không bị mất dữ liệu do debounce save), chuyển đổi view mode (card/excel/kanban)
   giữ đúng lựa chọn sau F5, banner nhắc backup xuất hiện/biến mất đúng theo logic
   isBackupSnoozed, luồng "Cài đặt" (Settings.tsx) đổi tên đơn vị/tháng đánh giá.
3. Thêm coverage report: `vitest run --coverage`, mục tiêu tối thiểu 70% cho
   src/hooks/, src/store/, src/utils/ (KHÔNG bắt buộc coverage cao cho các component
   hiển thị thuần UI như CalendarView — ưu tiên logic, không ưu tiên JSX render).
4. Thêm GitHub Actions workflow (`.github/workflows/ci.yml`) chạy lint + build +
   vitest + playwright trên mỗi push/PR.
```

### ✅ Definition of Done
- Coverage report tồn tại, đạt ngưỡng trên cho các thư mục logic.
- CI chạy xanh (nếu có GitHub repo thật để test).

---

## PHASE 7 — Nâng cấp Backend đầy đủ (việc lớn nhất, làm riêng, không vội)

**Lưu ý quan trọng:** đây là thay đổi kiến trúc lớn (từ client-only sang có server thật + multi-user). Khuyến nghị: **không làm chung 1 lệnh**, mà chia làm các sub-phase 7a→7e, mỗi sub-phase review kỹ trước khi sang bước sau, vì rủi ro mất dữ liệu/khoá tài khoản người dùng thật là cao nhất trong toàn bộ kế hoạch.

### 7a — Thiết kế schema & lựa chọn công nghệ
```
[dán NGUYÊN TẮC BẤT BIẾN]

Nhiệm vụ: CHỈ thiết kế, KHÔNG code gì cả ở bước này.
1. Đề xuất schema PostgreSQL (dùng Prisma làm ORM) ánh xạ từ AppState/TaskA/TaskBC/TaskD
   hiện có trong types.ts, giữ đúng tên field tiếng Việt hiện có (donVi, thang, canCu,
   loaiVanBan, v.v.) làm tên cột — không dịch sang tiếng Anh để tránh phải viết tầng
   mapping thừa. Cân nhắc: 1 bảng `organizations` (đơn vị Công an xã), 1 bảng `users`
   (thuộc 1 organization, có role: 'quan_ly' | 'lanh_dao'), 1 bảng `app_states` (1-1
   với organization, lưu meta), và các bảng `tasks_a/b_c/d` liên kết theo organization_id.
2. Đề xuất API endpoints (Express hoặc NestJS — agent so sánh ưu/nhược trong bối cảnh
   dự án nhỏ, 1 đơn vị dùng, đề xuất phương án đơn giản hơn nếu 2 bên tương đương).
3. Đề xuất luồng Auth: JWT hay session? Vì chỉ có 2 role và số lượng user rất nhỏ
   (1 đơn vị xã), đề xuất phương án ĐƠN GIẢN nhất đủ an toàn (ví dụ JWT + refresh token,
   không cần OAuth2/SSO phức tạp).
4. Viết toàn bộ thiết kế trên vào docs/BACKEND-DESIGN.md, KHÔNG code. Dừng lại chờ
   người dùng đọc và duyệt thiết kế trước khi sang 7b.
```

### 7b — Dựng backend (API + DB), CHƯA đấu nối frontend
```
[dán NGUYÊN TẮC BẤT BIẾN]

Dựa theo docs/BACKEND-DESIGN.md đã duyệt:
1. Tạo thư mục `server/` riêng biệt (KHÔNG động vào src/ của frontend ở bước này).
2. Setup Express/NestJS + Prisma + PostgreSQL (dùng Docker Compose để chạy Postgres
   local, viết docker-compose.yml).
3. Viết migration Prisma theo schema đã duyệt.
4. Implement API CRUD đầy đủ cho tasks A/B/C/D + meta, có auth middleware JWT.
5. Viết test API (Vitest hoặc Jest + supertest) cho từng endpoint.
6. KHÔNG xoá backup-server.js hay đổi gì trong src/ — 2 hệ thống chạy song song,
   độc lập, cho đến khi có bước migrate rõ ràng ở 7d.
```

### 7c — Viết script migrate dữ liệu từ IndexedDB export sang Postgres
```
[dán NGUYÊN TẮC BẤT BIẾN]

1. Viết script `server/scripts/import-from-excel-export.ts` nhận vào file Excel
   xuất ra từ tính năng "Sao lưu Excel" hiện có (ExcelIO.tsx) làm input, parse và
   insert vào Postgres qua Prisma. Đây là con đường di chuyển AN TOÀN NHẤT vì
   không cần động vào IndexedDB của trình duyệt người dùng — người dùng chỉ cần
   xuất Excel như bình thường rồi đưa cho script.
2. Viết test cho script này bằng 1 file Excel export mẫu thật (yêu cầu người dùng
   cung cấp, hoặc tự tạo qua chạy tính năng export của app hiện tại).
3. KHÔNG tự động chạy migrate lên môi trường thật — chỉ chuẩn bị công cụ, việc chạy
   migrate thật do người vận hành quyết định thời điểm.
```

### 7d — Đấu nối frontend với backend mới (thay IndexedDB bằng API calls)
```
[dán NGUYÊN TẮC BẤT BIẾN]

1. Thêm 1 lớp `src/api/client.ts` gọi backend REST đã dựng ở 7b.
2. Sửa `useTaskStore` (Zustand, Phase 4) để CÓ THỂ chạy ở 1 trong 2 chế độ qua 1
   feature flag (biến môi trường VITE_BACKEND_MODE='local' | 'server'):
   - 'local': hành vi y hệt hiện tại (IndexedDB), dùng làm fallback/offline mode.
   - 'server': gọi API thay vì IndexedDB.
   Giữ chế độ 'local' làm mặc định cho đến khi người vận hành xác nhận backend ổn
   định, để không có rủi ro gián đoạn cho đơn vị đang dùng thật.
3. Thêm màn hình đăng nhập (login) đơn giản khi VITE_BACKEND_MODE='server'.
```

### 7e — Chuyển đổi cuối cùng
```
Chỉ thực hiện SAU KHI người vận hành đã dùng thử chế độ 'server' song song ít nhất
vài ngày và xác nhận ổn định. Không đưa vào phạm vi tự động của agent — đây là quyết
định vận hành, cần con người quyết định thời điểm, không phải AI agent.
```

---

## PHASE 8 — Dọn dẹp & tài liệu hoá cuối cùng

### 🔧 PROMPT CHO AGENT
```
[dán NGUYÊN TẮC BẤT BIẾN]

1. Cập nhật README.md: kiến trúc mới (hooks/store/components/layout), cách chạy
   test (unit + E2E), cách chạy chế độ backend mới (nếu đã làm Phase 7).
2. Xoá code chết (dead code), console.log dùng để debug tạm thời (KHÔNG xoá
   console.error/console.log có mục đích rõ ràng phục vụ chẩn đoán tại hiện trường
   như trong logic restore — giữ lại, chỉ xoá log kiểu debug tạm bợ do quá trình
   refactor tạo ra).
3. Chạy `npm run lint`, `npm run build`, `npx vitest run`, `npx playwright test` lần
   cuối, đảm bảo tất cả xanh. Viết docs/FINAL-REPORT.md tóm tắt: trước/sau (số dòng
   App.tsx, số test, coverage %), rủi ro còn tồn đọng nếu có.
```

---

## 3. Tổng kết thứ tự & ước lượng độ rủi ro

| Phase | Nội dung | Rủi ro làm hỏng app | Bắt buộc trước Phase nào |
|---|---|---|---|
| 0 | Git + baseline | Rất thấp | — |
| 1 | Unit + E2E test nền | Rất thấp | Bắt buộc trước Phase 3 |
| 2 | Type safety | Thấp | — |
| 3 | Tách hooks/component | **Cao** | Cần Phase 1 xong trước |
| 4 | Zustand | **Cao** (đổi cơ chế persist) | Cần Phase 3 xong trước |
| 5 | UI/UX loading/error | Thấp | — |
| 6 | Test toàn diện | Rất thấp | Sau Phase 3–4 |
| 7 | Backend thật | **Rất cao**, ảnh hưởng vận hành thật | Làm riêng, có con người duyệt từng bước |
| 8 | Dọn dẹp | Thấp | Cuối cùng |

**Khuyến nghị nếu muốn tiết kiệm quota hơn nữa:** làm Phase 0–1 trước, dừng lại tự
kiểm tra kỹ (đây là phần rẻ nhưng quan trọng nhất), rồi mới quyết định có đi tiếp
Phase 3–4 (phần tốn quota nhất vì file lớn) hay không.
