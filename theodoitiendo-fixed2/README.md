<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f5f751cb-3728-460e-b78e-bf25bfcd5227

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Chạy với backend (tuỳ chọn — nhiều máy/nhiều người dùng có xác thực)

Mặc định (`npm run dev` / `npm start`) app chạy hoàn toàn trong trình duyệt, dữ liệu lưu trong IndexedDB, không cần đăng nhập — không có gì thay đổi so với trước.

Nếu muốn dùng backend cục bộ (SQLite + Express + đăng nhập), xem chi tiết trong `HANDOFF.md`. Tóm tắt:

```bash
npm run build                  # build frontend vào dist/
npm run backend:create-user    # tạo tài khoản đăng nhập đầu tiên (chạy 1 lần)
npm run backend                # chạy tại http://localhost:3002
```

Khi vào `http://localhost:3002`, app sẽ tự phát hiện có backend và hiện màn hình đăng nhập. Cách cũ (`npm run dev`/`npm start`, không cần đăng nhập) vẫn hoạt động song song, không bị ảnh hưởng.
