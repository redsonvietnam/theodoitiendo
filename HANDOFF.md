# Bàn giao ngữ cảnh — Dự án "Hệ thống Quản lý Tiến độ Chỉ đạo & Chỉ tiêu"

> Dán toàn bộ file này vào đầu phiên chat mới với Claude (kèm file zip project đính kèm) để tiếp tục công việc mà không cần lặp lại từ đầu.

## 1. Bối cảnh dự án

Ứng dụng web client-side (React + TypeScript + Vite + Tailwind) giúp một đơn vị Công an xã tại Việt Nam theo dõi, quản lý, báo cáo nhiệm vụ/chỉ đạo/chỉ tiêu công tác. Dữ liệu lưu trong IndexedDB của trình duyệt, không có backend trung tâm (tính đến thời điểm bàn giao).

**Bối cảnh triển khai thực tế đã xác nhận với người dùng:**
- 1 máy tính dùng chung tại trụ sở (không cần mạng LAN giữa nhiều máy).
- 1-3 người dùng (Công an cấp xã + Lãnh đạo).
- Dữ liệu nội bộ, không đưa lên cloud — mọi thứ chạy local.

## 2. Yêu cầu cải thiện toàn diện — đã thống nhất 5 ưu tiên theo thứ tự

Người dùng đã xếp hạng (kéo-thả) theo đúng thứ tự này:

1. ✅ **Refactor `App.tsx` + tách custom hooks** — ĐÃ XONG
2. ✅ **Viết test tự động (Vitest)** — ĐÃ XONG
3. ✅ **Chuyển state management sang Zustand** — ĐÃ XONG
4. ✅ **Tối ưu UI/UX (loading, error handling)** — ĐÃ XONG
5. ✅ **Xây dựng backend đầy đủ (DB + API + Auth)** — **ĐÃ XONG HOÀN TOÀN, kể cả nối frontend vào backend. Xem mục 4.7.**

## 3. Thiết kế backend — ĐÃ CHỐT và ĐÃ CODE

Đã thảo luận và người dùng đồng ý kiến trúc sau cho ưu tiên #5:

- **Không dùng cloud.** Chạy hoàn toàn local trên 1 máy tại trụ sở.
- **Database: SQLite** (không phải PostgreSQL/MongoDB) — lý do: 1 file `.db` duy nhất, không cần cài đặt server DB riêng, backup = copy file, khớp với tư duy "sao lưu" mà `.bat` hiện tại đang dùng. Quy mô 1-3 người dùng, SQLite thoải mái đủ dùng.
- **API: Express** (đã có sẵn trong `dependencies` của `package.json`, dù chưa dùng tới ngoài `backup-server.js`).
- **Auth: JWT + bcrypt đơn giản.** 2 vai trò: Công an cấp xã / Lãnh đạo. Không cần OAuth/SSO.
- **Kiến trúc:** gộp backend + frontend chạy trên cùng 1 máy qua `localhost` (giống mô hình `npm run start` hiện tại, nhưng thay `backup-server.js` bằng 1 Express server phục vụ luôn cả API lẫn giao diện tĩnh).
- **IndexedDB không bỏ đi** — giữ làm cache cục bộ để app vẫn xem được dữ liệu nếu server tạm gián đoạn.
- **Di trú dữ liệu cũ:** dùng lại tính năng xuất Excel sẵn có (`ExcelIO.tsx`) — xuất dữ liệu hiện tại ra Excel, viết 1 script import một lần để nạp vào SQLite. Không cần công cụ di trú riêng.

## 4. Đã làm được gì (chi tiết kỹ thuật)

### 4.1. Refactor `App.tsx` (1.673 → 911 dòng, giảm ~45%)
Tách 4 custom hook:
- `src/hooks/useAppState.ts` — giờ là wrapper mỏng quanh Zustand store (xem 4.3).
- `src/hooks/useBackupReminder.ts` — banner nhắc backup Excel (dismiss/snooze).
- `src/hooks/useViewPreferences.ts` — chế độ xem (card/excel, list/kanban), sidebar, lưu localStorage.
- `src/hooks/useGlobalAddTaskForm.ts` — toàn bộ form modal "Thêm nhiệm vụ" (~25 state field), gồm logic tự nhận diện/gợi ý ký hiệu văn bản.
- Util dùng chung mới: `src/utils/dateHelpers.ts`.

**Bug đã phát hiện và sửa trong lúc refactor:** điều kiện hiện banner "nhắc sao lưu" ban đầu thiếu case `daysSinceBackup === null` (người CHƯA TỪNG backup lần nào sẽ không thấy banner nhắc) — đã sửa đúng logic gốc.

### 4.2. Test tự động (Vitest)
- Cấu hình: `vitest.config.ts`, môi trường `jsdom`, `@testing-library/react`, setup tại `src/test/setup.ts`.
- Script: `npm test` (chạy 1 lần), `npm run test:watch`.
- **84 test, tất cả pass**, phủ:
  - `src/utils/documentHelper.test.ts` (30 test) — logic gõ tắt, tự nhận diện loại văn bản/đơn vị/CAT, chuyển đổi ngày. Trước đây **0 test**.
  - `src/hooks/useAppState.test.ts` (13 test) — load/seed/restore, CRUD, quy tắc "định kỳ tự nhân bản sang Mục C", `saveError`.
  - `src/hooks/useGlobalAddTaskForm.test.ts` (10 test).
  - `src/hooks/useBackupReminder.test.ts` (5 test).
  - `src/hooks/useViewPreferences.test.ts` (5 test).
  - `src/components/ErrorBoundary.test.tsx` (2 test).
  - `src/utils/cancu.test.ts` (19 test, có sẵn từ trước, không đổi).

### 4.3. Zustand
- `src/store/appStore.ts` — store tập trung chứa toàn bộ `AppState` (A/B/C/D + meta) và mọi hành động CRUD, thay cho `useState` khổng lồ.
- Side-effect tự động lưu (debounce 300ms + gọi `backup-server.js` + toast) chạy qua `useAppStore.subscribe()`, **độc lập với vòng đời React** — không phụ thuộc component nào đang render.
- `useAppState.ts` chỉ là wrapper giữ nguyên API cũ → **không cần sửa gì ở `App.tsx`** khi chuyển đổi.
- **Phạm vi có chủ đích:** chỉ chuyển phần dữ liệu chính (`useAppState`) sang Zustand. 3 hook còn lại vẫn dùng `useState` nội bộ vì đã đủ nhỏ gọn, không có nhu cầu chia sẻ cross-component.
- **Việc CHƯA làm (có thể làm sau nếu muốn):** các component con (`Dashboard`, `MainB`, `MainC`...) vẫn nhận dữ liệu qua props từ `App.tsx`, chưa gọi thẳng `useAppStore`. Muốn bỏ hẳn prop-drilling thì cần sửa từng component.

### 4.4. UI/UX
- `src/components/ErrorBoundary.tsx` — bọc toàn app trong `main.tsx`, tránh màn hình trắng khi có lỗi render, trấn an dữ liệu vẫn an toàn trong IndexedDB, có nút tải lại + chi tiết lỗi kỹ thuật gấp gọn.
- `saveError` trong Zustand store — banner đỏ hiển thị khi lưu IndexedDB thất bại (trước đây lỗi này chỉ `console.error`, **người dùng không hề biết dữ liệu không được lưu** — đây là rủi ro dữ liệu nghiêm trọng nhất đã sửa).
- Màn hình loading có spinner động thay vì chỉ chữ tĩnh.

### 4.5. Phát hiện ngoài lề (chưa xử lý, nêu để biết)
- **Dự án chưa cài `@types/react`** — gần như toàn bộ TypeScript trong codebase đang được hiểu ngầm là `any` thay vì kiểm tra kiểu thật. Khớp với mục "Tăng cường Type Safety" trong yêu cầu gốc của người dùng nhưng KHÔNG nằm trong 5 mục đã xếp hạng. Cài `@types/react` sẽ làm lộ ra nhiều lỗi kiểu tiềm ẩn khắp dự án — cần một đợt riêng, cẩn thận, có test bảo vệ (đã có 84 test) trước khi làm.
- Import chết đã dọn: `formatDonViBanHanhDisplay` (không dùng ở đâu trong bản gốc).

### 4.6. Backend (ưu tiên #5) — DB + API + Auth (đã nối vào frontend — xem mục 4.7)

**File mới:**
- `server/db.js` — SQLite (`better-sqlite3`). 2 bảng: `users` (auth) và `app_state` (lưu **toàn bộ AppState dưới dạng 1 blob JSON**, y hệt cấu trúc IndexedDB hiện tại — quyết định có chủ đích để giảm rủi ro, không redesign quan hệ (relational) vội với quy mô 1-3 người dùng).
- `server/auth.js` — bcrypt (băm mật khẩu) + JWT (`jsonwebtoken`). Secret JWT tự sinh (`crypto.randomBytes`) và lưu vào `data/jwt-secret.txt` ở lần chạy đầu, không hardcode.
- `server.js` (root) — Express server hợp nhất, export `createServer()` (dùng để test) và tự `listen()` khi chạy trực tiếp. Route:
  - `POST /api/auth/login` — đăng nhập, trả JWT.
  - `GET /api/auth/me` — thông tin user hiện tại (cần token).
  - `GET /api/state` / `PUT /api/state` — đọc/ghi toàn bộ AppState (cần token).
  - `GET /api/health` — không cần token.
  - Phục vụ tĩnh `dist/` (frontend đã build) cho mọi route khác.
- `scripts/setup-users.js` — CLI tạo tài khoản đăng nhập đầu tiên (hỏi tên đăng nhập/mật khẩu/vai trò qua terminal). Chạy: `npm run backend:create-user`.
- `scripts/migrate-from-backup.js` — di trú dữ liệu 1 lần. **Quan trọng:** dùng file `backups/latest_backup.json` (do tính năng backup tự động hiện có ghi ra) làm nguồn, KHÔNG parse Excel — vì đây chính xác là cấu trúc AppState gốc, không có rủi ro sai lệch định dạng. Chạy: `npm run backend:migrate`.
- `server/test-env.js` — helper cho test, trỏ DB/JWT-secret sang thư mục tạm để test không đụng dữ liệu thật.

**Test đã viết (34 test mới, tổng cộng giờ là 109 test):**
- `server/db.test.js` (8 test) — users, app_state, ràng buộc UNIQUE/CHECK, round-trip lưu/đọc.
- `server/auth.test.js` (8 test) — hash mật khẩu, JWT sign/verify, middleware xác thực.
- `server.test.js` (9 test, dùng `supertest`) — test tích hợp qua HTTP thật: login, route được bảo vệ, PUT/GET state round-trip.
- Đã tự tay chạy thử server thật (không chỉ test tự động): build frontend, khởi động `server.js`, tạo user, login qua `curl`, GET/PUT `/api/state` — toàn bộ luồng hoạt động đúng.

**2 bug có sẵn từ trước đã phát hiện và sửa (không liên quan trực tiếp đến việc code backend mới, nhưng liên quan tới cùng khu vực code):**
1. `backup-server.js` **không chạy được** — dùng cú pháp CommonJS (`require`) trong khi `package.json` khai `"type": "module"` → lỗi `ReferenceError: require is not defined`. Đã đổi tên thành `backup-server.cjs` (không đổi logic bên trong) và cập nhật script `backup:server` trong `package.json`.
2. Script `"clean": "rm -rf dist server.js"` trong `package.json` — coi `server.js` là file build tự sinh (có thể còn sót từ cấu hình cũ nào đó). **Nguy hiểm** vì giờ `server.js` là source code thật. Đã sửa thành `"clean": "rm -rf dist"`.

**Script mới trong `package.json`:**
```json
"backend": "node server.js",
"backend:create-user": "node scripts/setup-users.js",
"backend:migrate": "node scripts/migrate-from-backup.js"
```

**`.gitignore`** đã thêm `data/` (chứa file `.db` + JWT secret) và `backups/`.

#### 4.7. Nối frontend vào backend — ĐÃ XONG (hoàn thành ưu tiên #5)

**File mới:**
- `src/api/backendClient.ts` — client gọi API mới:
  - `checkBackendHealth()` — gọi `GET /api/health` với timeout 1.5s qua `AbortController`. **Không bao giờ throw** — luôn trả `true`/`false`, kể cả khi mất mạng/timeout. Đây là nền tảng để phân biệt "chạy `npm run dev`/`npm start` không backend" (hành vi cũ, không đổi) với "chạy qua `node server.js`".
  - `login()`, `fetchMe()`, `fetchState()`, `pushState()` — gọi các route tương ứng, đính kèm `Authorization: Bearer <token>`.
  - `AuthRequiredError` — lỗi riêng khi server trả 401 (token thiếu/hết hạn), để store phân biệt được "lỗi mạng tạm thời" (fallback IndexedDB) với "cần đăng nhập lại" (hiện màn hình login).
  - Token lưu ở `localStorage` (key `theodoitiendo_token`) — chấp nhận được với quy mô 1-3 người dùng nội bộ (đã ghi trong quyết định kiến trúc gốc, mục 3, bước 3).
- `src/components/Login.tsx` — màn hình đăng nhập (username/password), chỉ hiện khi store báo `needsAuth === true`. Không có route riêng, App.tsx chỉ render component này thay vì nội dung chính.

**File đã sửa:**
- `src/store/appStore.ts` (Zustand) — đây là thay đổi trung tâm:
  - Thêm state: `backendAvailable` (`null` = chưa kiểm tra, `true`/`false` sau khi kiểm tra), `needsAuth`, `authToken`, `authUser`, `authError`, `isAuthenticating`.
  - Thêm action `login(username, password)`, `logout()`, và một action nội bộ `loadFromBackendState(token)` dùng chung bởi cả `load()` (khi đã có token cũ từ lần trước) và `login()` (ngay sau khi đăng nhập thành công) — tránh phải gọi lại `load()` (vốn bị chặn bởi cờ `hasLoaded` chỉ chạy 1 lần).
  - `load()` — **giữ nguyên logic restore.json cũ y hệt**, chỉ chèn thêm bước kiểm tra backend **sau** bước đó và **trước** bước đọc IndexedDB:
    1. Không có backend (health check thất bại/timeout) → rơi thẳng vào đúng luồng IndexedDB cũ, không đổi hành vi khi chạy `npm run dev`/`npm start`.
    2. Có backend, chưa có token trong `localStorage` → `needsAuth = true`, dừng lại, chờ người dùng đăng nhập.
    3. Có backend, có token → gọi `/api/state` + `/api/auth/me`. Thành công thì dùng dữ liệu từ server (đồng thời ghi xuống IndexedDB làm cache, theo đúng quyết định kiến trúc mục 3). Token hết hạn (401) → xoá token, `needsAuth = true`. Lỗi mạng khác (backend "sập" giữa chừng ngay sau health check) → rơi về IndexedDB như trường hợp 1.
    
> Historical note: references to the old `restore.json` flow in earlier sections describe the pre-T2-F2 implementation/history only. They are NOT part of the current production completion/restore contract. Do not reintroduce or restore `/restore.json` without an explicit new task/product decision.
  - Side-effect tự động lưu (debounce 300ms) — vẫn luôn ghi IndexedDB trước tiên (cache cục bộ không đổi), sau đó nếu có `backendAvailable && authToken` thì gọi thêm `PUT /api/state`. Token hết hạn giữa chừng lúc lưu → tự xoá token, bật lại `needsAuth`, báo `saveError` rõ ràng (dữ liệu vẫn an toàn trong IndexedDB, không mất).
- `src/hooks/useAppState.ts` — expose thêm `backendAvailable`, `needsAuth`, `authUser`, `logout` ra ngoài (theo đúng pattern wrapper cũ).
- `src/App.tsx` — thêm nhánh render `<Login />` khi `needsAuth === true` (đặt ngay sau màn hình loading, trước nội dung chính). Truyền `authUser`/`logout` xuống `Settings`.
- `src/components/Settings.tsx` — thêm khối hiển thị tài khoản đang đăng nhập + nút "Đăng xuất", **chỉ hiện khi `authUser` tồn tại** (tức chỉ khi chạy qua backend — chạy `npm run dev`/`npm start` không thấy khối này).

**Test đã viết (19 test mới, tổng cộng giờ là 128 test — 103 frontend + 25 backend):**
- `src/api/backendClient.test.ts` (10 test) — health check (up/down/không-ok), login (thành công/sai mật khẩu), fetchState (401 → `AuthRequiredError`, null khi server chưa có dữ liệu), pushState (kèm header `Authorization`, lỗi khi thất bại), fetchMe, token storage.
- `src/store/appStore.test.ts` (9 test) — 4 kịch bản của `load()` (không backend / có backend chưa đăng nhập / có backend + token hợp lệ / token hết hạn), `login()` (thành công / sai mật khẩu), `logout()`, và 2 kịch bản tự động lưu khi có backend (lưu thành công lên server / token hết hạn giữa chừng khi lưu).
- Toàn bộ 109 test cũ (84 frontend + 25 backend) **không đổi, vẫn pass nguyên** — không có breaking change nào với luồng IndexedDB-only.

**Đã tự tay chạy thử server thật (không chỉ test tự động), luồng đầy đủ:**
```
npm install && npm test && npx tsc --noEmit && npm run build   # sạch, 128/128 pass
node server.js                                                 # start
curl /api/health                                                → {"ok":true}
curl -X POST /api/auth/login ...                                → token + user
curl /api/auth/me -H "Authorization: Bearer <token>"             → user
curl /api/state -H "Authorization: Bearer <token>"               → null (chưa có dữ liệu)
curl -X PUT /api/state -H "Authorization: Bearer <token>" -d ... → {"ok":true,...}
curl /api/state -H "Authorization: Bearer <token>"               → đúng dữ liệu vừa lưu
curl /api/state (không có token)                                 → 401
```
Toàn bộ luồng hoạt động đúng như thiết kế ở mục 3.

**Bug nhỏ phát hiện và sửa trong lúc code phần này:** trong `loadFromBackendState`, dòng cache xuống IndexedDB ban đầu viết `setDbState(savedState).catch(...)` — nếu môi trường test (hoặc bất kỳ nơi nào) trả về `undefined` thay vì `Promise` thì `.catch` sẽ crash (`Cannot read properties of undefined`). Đã sửa thành `Promise.resolve(setDbState(savedState)).catch(...)` để an toàn ở cả hai trường hợp.

**Không có việc gì bắt buộc còn lại cho ưu tiên #5.** Vài ý tưởng *tuỳ chọn* nếu muốn làm thêm sau này (không cấp thiết, quy mô 1-3 người dùng không thực sự cần):
- Xoay vòng (rotate) JWT secret / rút ngắn thời hạn token (hiện là 30 ngày, chấp nhận được cho 1 máy văn phòng).
- Trang quản trị tài khoản trong UI thay vì chỉ CLI (`npm run backend:create-user`).
- Đồng bộ hai chiều thông minh hơn nếu sau này có nhiều máy cùng sửa đồng thời (hiện tại "ai lưu sau cùng thắng" — chấp nhận được với 1 máy dùng chung).



## 5. Cách xác minh mọi thứ vẫn ổn (chạy sau MỖI thay đổi)

```bash
npm install       # nếu chưa có node_modules
npm test          # 128 test phải pass (103 frontend + 25 backend)
npx tsc --noEmit  # phải sạch, không lỗi
npm run build     # phải build thành công (build frontend, cần trước khi chạy `npm run backend`)
```

Test thử backend thật (không chỉ test tự động), ví dụ:
```bash
npm run build
npm run backend:create-user   # tạo tài khoản đầu tiên, trả lời 3 câu hỏi trên terminal
npm run backend                # chạy tại http://localhost:3002
# ở terminal khác:
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"...","password":"..."}'
```

Lưu ý registry npm: nếu gặp lỗi không resolve được package, dùng:
```bash
npm install --registry https://registry.npmjs.org/
```
(registry mặc định của môi trường có thể trỏ tới mirror bị chặn mạng).

## 6. Việc tiếp theo

Cả 5 ưu tiên đã hoàn thành, bao gồm việc nối frontend vào backend (xem mục 4.7). Không còn việc bắt buộc nào.

**Trước khi đưa vào dùng thật ở trụ sở, nên làm (không phải sửa code, chỉ vận hành):**
1. Chạy `npm run backend:create-user` trên máy thật để tạo tài khoản cho từng người dùng (Công an cấp xã / Lãnh đạo).
2. Nếu đã có dữ liệu cũ trong IndexedDB của trình duyệt (từ trước khi có backend), dùng `npm run backend:migrate` để nạp từ `backups/latest_backup.json` vào SQLite (xem mục 4.6) — nếu chưa có backup nào thì bỏ qua, app sẽ seed dữ liệu mẫu như bình thường.
3. Quyết định người dùng nào chạy qua backend (`node server.js`, cần đăng nhập) và người nào vẫn dùng cách cũ (`npm start`, không đăng nhập, chỉ IndexedDB) — cả hai cách vẫn chạy song song được, không xung đột (dữ liệu không tự đồng bộ giữa hai cách nếu dùng cả hai trên cùng máy).

**Việc tuỳ chọn (không cấp thiết) đã liệt kê ở cuối mục 4.7** — có thể bỏ qua nếu không cần: xoay vòng JWT secret, trang quản trị tài khoản trong UI, đồng bộ hai chiều thông minh hơn cho nhiều máy.

## 7. File đính kèm

File zip project đầy đủ (đã bao gồm mọi thay đổi ở mục 4) nằm cùng tin nhắn này trên Claude.ai — hãy tải về và tải lên lại ở phiên chat mới cùng với file `HANDOFF.md` này.

## CURRENT CHECKPOINT — 2026-08-12

### Git checkpoint

Latest commit:
211bbe2 test: exclude package artifacts from vitest discovery

Previous relevant checkpoint:
f2438e8 fix: close T2-F2 completion and restore flow

### Closed work

- T2-F2: CLOSED
- FIX-2: CLOSED
- Vitest test-discovery audit: CLOSED
- Vitest test-discovery fix: CLOSED

### Test baseline

The authoritative root project test baseline is now:
128 tests / 12 test files

Breakdown:
- 103 source/frontend tests
- 25 root/server tests
- Total: 128

The previous 160-test discovery was NOT a new project baseline.
It consisted of:
- 128 intentional project tests
- 32 accidental duplicate tests from package artifacts

The 32 accidental tests were:
- FINAL_PACKAGE/server/auth.test.js — 8
- FINAL_PACKAGE/server/db.test.js — 8
- FINAL_PACKAGE_nodel_modules/server/auth.test.js — 8
- FINAL_PACKAGE_nodel_modules/server/db.test.js — 8

SHA-256 verification established that the package copies of auth.test.js and db.test.js are exact duplicates of the corresponding root/server tests.

### Verification

- `npx vitest run src/hooks/useAppState.test.ts` → 13/13 PASS
- `npx vitest run src/store/appStore.test.ts` → 9/9 PASS
- `npm test` → 128 tests PASS / 12 test files
- `npx tsc --noEmit` → exit 0
- `git diff --check` → clean

### Commit scope

Commit `211bbe2 test: exclude package artifacts from vitest discovery` contains ONLY:

`vitest.config.ts`

No production source, test files, `.gitignore`, `package.json`, or package artifacts were changed in this commit.

### Artifact status

The following remain untouched:

- `FINAL_PACKAGE/`
- `FINAL_PACKAGE_nodel_modules/`
- historical report/audit artifacts

No cleanup has been performed. Cleanup must remain a separate explicit task.

### Working-tree status

Working-tree status not re-verified in this documentation-only task; known untracked artifacts remain from the previous audit.

### Current decision

All five original priorities are complete. The Vitest discovery issue is also closed. There is currently no approved implementation task. The next task requires an explicit owner decision.

Known deferred areas:

- artifact/report cleanup
- stale documentation review
- ExcelIO regression coverage
- status-model ambiguity
- optional TypeScript type-safety work

Do NOT automatically start any of them.

### Vitest fix

`vitest.config.ts` now explicitly excludes:

```text
FINAL_PACKAGE/**
FINAL_PACKAGE_nodel_modules/**
```
