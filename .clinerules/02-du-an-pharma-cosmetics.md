# Rule 02 — Vận hành dự án Pharma Cosmetics (theme Sapo `.bwt`)

Bổ sung cho `01-quy-chuan-theme-sapo.md` (quy chuẩn nền tảng Sapo). File này mô tả **thực tế repo này**.

## 1. Bản chất hệ thống

- Đây là theme **Sapo Web (.bwt)** viết bằng Liquid, đồng thời chạy được như site thật nhờ 3 tầng:
  - `dev-server.js` — server preview Node (LiquidJS) + chokidar + WebSocket live-reload + dev toolbar,
    có preprocessor cho syntax Sapo (`{%elseif%}` → `elsif`, strip `{% layout 'x' %}`).
  - `api/index.js` — entry serverless Vercel, **tái dùng nguyên handler của `dev-server.js`**
    (không viết logic riêng cho Vercel để tránh lệch codebase; dev-server tự tắt watch/WS khi bị require).
  - Sapo production — nơi theme `.bwt` được biên dịch thật.
- Repo: `vuthiet2k/websitePharmaCosmetics`. Nhánh làm việc: **`hugo-theme-sept2026`**.
- Vercel project: `hugo-theme-sept2026-test` (`.vercel/project.json`, team `vuthiet2ks-projects`),
  `vercel.json` route toàn bộ `/(.*)` → `/api/index.js`.
- Hệ sinh thái phụ: `mops-gas/` (Google Apps Script backend MOPS), `assets/mops-*.js` (admin UI).

## 2. Lệnh thường dùng

| Việc | Lệnh |
| :--- | :--- |
| Preview local | `npm run preview` → http://localhost:3000 (đổi bằng `PORT`), live-reload WS `3001` |
| Đóng gói theme | `npm run build` → `build:tailwind` + `scripts/build-theme.js` (copy 5 thư mục vào `dist/`) |
| Build bản tĩnh | `npm run build:vercel` → `vercel-dist/` (đã gitignore) |
| Test portal | `npm run test:portal` (Playwright, `playwright.portal.config.js`, `tests/portal/`) |
| Kiểm tra JSON | `node -e "JSON.parse(require('fs').readFileSync('configs/settings_schema.json','utf8'))"` |
| Deploy production | `npx vercel --prod --yes` (**cần auth** — xem mục 5) |

## 3. Quy ước code

- Comment **tiếng Việt**, nêu **lý do** + ngày + mã vấn đề khi liên quan (`REOPEN 2026-09-11`,
  `T-106`, `MOPS`, `Zero-Wait 2026-08-10`...) — theo đúng phong cách có sẵn trong `dev-server.js`,
  `snippets/section_spa.bwt`, `assets/mops-*.js`.
- **Cấu hình hoá mọi thứ**: mọi nhãn/nút/URL/tiêu đề hiển thị phải có `id` + `default` trong
  `configs/settings_schema.json`; giá trị thật nằm trong `configs/settings_data.json`; snippet chỉ
  đọc `settings.<id>` kèm `| default:` — không hardcode chuỗi trong `.bwt`.
- Nhóm tên setting: `theme_*` (bảng màu/token), `portal_*` (home portal v3), `home_*` (trang chủ),
  `mops_*` (admin/backend), `header_*`/`footer_*`.
- Vị trí file: snippet `snippets/section_*.bwt`, `snippets/portal_*.bwt`; layout `layouts/*.bwt`;
  template `templates/<type>.<view>.bwt` (vd `page.dat_lich_tu_van.bwt`, `collection.skinhealthy.bwt`).
- CSS tích hợp nằm ở `assets/*.css` (vd `home-portal-integration.css`, `storefront-v3.css`) — class
  mới thêm phải scope theo block cha (vd `.pc-home-v3 .pc-portal .shb-media`) để không rò rỉ style.
- Không "sửa" syntax Sapo thành LiquidJS thuần trong file `.bwt`; nếu cần, xử lý ở preprocessor.
- Commit: **conventional commits + mô tả tiếng Việt có dấu**, ví dụ
  `feat(storefront-v3): tái cấu trúc trang chủ thành Home Portal + hệ thiết kế v3`,
  `fix(home-portal-v3): ...`. Body nêu ngắn: vấn đề → cách sửa → file liên quan.

## 4. Kiểm chứng (đã dùng thực tế, nên lặp lại)

- Parse JSON sau khi sửa `configs/*.json`.
- Đối chiếu bản deploy bằng `Invoke-WebRequest`/curl + **marker duy nhất** của thay đổi (vá dụ CSS class
  mới) thay vì đọc bằng mắt; kiểm tra header `X-Vercel-Cache` (`MISS` = nội dung thật, `HIT` = cache CDN).
- `tests/portal/home-portal.spec.js` render snippet trực tiếp bằng LiquidJS engine → chạy khi sửa
  snippet home portal; **không** chạy lại toàn bộ Playwright một cách máy móc (xem `.claude/commands/goal.md`).

## 5. Deploy Vercel — thực trạng & giới hạn (đo ngày 2026-09-15)

- Push nhánh `hugo-theme-sept2026` → Vercel tạo **Preview** deployment (GitHub commit status `Vercel`,
  GitHub deployment `environment=Preview`). **Production alias KHÔNG tự đổi.**
- Production alias `https://hugo-theme-sept2026-test.vercel.app` chỉ đổi khi deploy thủ công:
  `npx vercel --prod --yes` (đúng project link trong `.vercel/project.json`), hoặc Promote/Redeploy
  trên dashboard Vercel. Production deployment cuối cùng qua Git integration là 2026-04-11 trên `main`.
- Máy dev **không lưu credential Vercel** (`.vercel/`, `%APPDATA%\com.vercel.cli`, `~/.now` đều không có)
  ⇒ `vercel --prod` báo `No existing credentials found`. Cần `VERCEL_TOKEN` hoặc `npx vercel login`.
- `vercel deploy --temporary` (không cần login) chỉ tạo bản **tạm, hết hạn ~59 phút**, phải claim —
  chỉ dùng để review UI, **không** thay thế production và **không** báo là "đã deploy prod".
- `.vercel/` là gitignored: không commit. Sau khi chạy CLI, kiểm tra `.vercel/` vẫn giữ đúng
  `project.json` gốc (CLI có thể tạo output build trong đó — phải dọn/khôi phục).

## 6. Biến môi trường (chi tiết ở `.env.example`)

`GAS_URL`, `MOPS_GAS_URL` (legacy alias), `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `MOPS_EDGE_SECRET`,
`PORT`, `WS_PORT`, `STATIC_EXPORT`. Vercel đọc qua Project Settings → Environment Variables.

## 7. Việc phải tránh

- Không dựng lại kiến trúc `.project-agent/` (STATE.json / ACCEPTANCE.yaml / FINAL_REPORT.json...) —
  đã bị xoá có chủ ý (commit `58bda23`, `952d950`).
- Không bịa dữ liệu (% đã bán, đánh giá khách hàng, thống kê) để "trông đẹp hơn".
- Không tự ý đổi giá trị `settings_data.json` của khách nếu không được yêu cầu.
- Không commit `dist/`, `vercel-dist/`, `node_modules/`, `.env*` thật, `.vercel/`.
