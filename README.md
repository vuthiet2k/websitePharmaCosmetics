# Pharma Cosmetics — Website theme Sapo Web (`.bwt`)

Repo giao diện website Pharma Cosmetics, viết bằng **Liquid `.bwt`** cho nền tảng **Sapo Web**, kèm
một môi trường preview Node + deployment Vercel để review UI trước khi cài lên Sapo.

- **Nhánh làm việc**: `hugo-theme-sept2026`
- **Bản review**: https://hugo-theme-sept2026-test.vercel.app
- **Kỹ thuật**: Liquid (`.bwt`), TailwindCSS (build cho khu vực MOPS admin), Node preview server
  (LiquidJS + chokidar + WebSocket), Vercel Serverless (`api/index.js`), Google Apps Script (`mops-gas/`)

## Bắt đầu nhanh

```bash
npm install
npm run preview          # http://localhost:3000 (đổi bằng biến PORT), live-reload WS 3001
npm run test:portal      # Playwright — kiểm thử trang chủ Home Portal
npm run build            # đóng gói theme vào dist/ (assets, configs, layouts, snippets, templates)
```

Tuỳ chọn: copy `.env.example` → `.env` để nạp `GAS_URL`, `KV_REST_API_*`, `MOPS_EDGE_SECRET`
(xem `.env.example`). Thiếu `.env` vẫn chạy được khi chỉ làm UI.

## Tài liệu dự án (đọc theo thứ tự này)

| Tài liệu | Nội dung |
| :--- | :--- |
| [`Rule&HDKTXD.md`](./Rule&HDKTXD.md) | **Cẩm nang Quy chế, Rule & Hướng dẫn Kỹ thuật phát triển Theme Sapo Web** — checklist review theme, quy chuẩn `theme.bwt`, cú pháp Liquid, 38 objects, `settings_schema.json`, kỹ thuật tính năng cốt lõi, tối ưu hiệu năng/SEO, quy chế đối tác & quy trình duyệt |
| [`.clinerules/`](./.clinerules) | Rule bắt buộc cho AI agent/dev: `01-quy-chuan-theme-sapo.md` (quy chuẩn nền tảng) và `02-du-an-pharma-cosmetics.md` (vận hành riêng repo: lệnh, quy ước code/commit, thực trạng deploy) |
| [`design/`](./design) | Mockup & concept giao diện đã chốt (`home-portal-v3/`, `homepage-concepts/`, brand guideline…) |
| [`phase/`](./phase) | Nhật ký từng giai đoạn: báo cáo kiểm thử, đối chiếu cấu hình, phạm vi thay đổi |
| [`mops-gas/docs/`](./mops-gas/docs) | Playbook backend Google Apps Script / MOPS (hiệu năng, ghi chú thiết kế) |
| [`tests/portal/`](./tests/portal) | Kịch bản Playwright cho Home Portal |
| [`exports/theme-settings/`](./exports/theme-settings) | Ảnh chụp cấu hình theme theo nhóm (đối chiếu trước/sau khi dọn) |

## Cấu trúc thư mục

| Đường dẫn | Vai trò |
| :--- | :--- |
| `assets/` | CSS/JS/SCSS/ảnh của theme (gồm `*.scss.bwt`, `*.js.bwt`, `mops-*.js`, CSS layout v3) |
| `configs/` | `settings_schema.json` (định nghĩa cấu hình) + `settings_data.json` (giá trị cấu hình thật) |
| `layouts/` | Layout chung storefront: `theme.bwt` (gồm Skin Health Beauty và AI tư vấn da); layout chuyên biệt: `chat.bwt`, `mops-admin.bwt` |
| `snippets/` | Snippet tái sử dụng (`header`, `footer`, `product-item`, `section_*`, `portal_*`…) |
| `templates/` | Template theo loại URL / theo view (`index.bwt`, `product.bwt`, `collection.*.bwt`, `page.*.bwt`…) |
| `api/` | Entry serverless cho Vercel (`index.js` — bọc lại handler của `dev-server.js`; `vercel.json` route toàn bộ request vào đây) |
| `dev-server.js` | Preview server + preprocessor Liquid syntax Sapo (tái dùng cho cả Vercel) |
| `scripts/` | Script build: `build-theme.js` (đóng gói theme), `build-vercel.js`, `strip-css-comments.js` |
| `mops-gas/` | Backend Google Apps Script (MOPS): nghiệp vụ, báo cáo, tài liệu kỹ thuật |
| `design/`, `phase/`, `exports/`, `tests/` | Tài liệu thiết kế, nhật ký giai đoạn, ảnh cấu hình, kiểm thử |

## Triển khai

- **Preview tự động**: push lên nhánh `hugo-theme-sept2026` → Vercel tạo deployment **Preview**
  (GitHub commit status `Vercel`), không tự đổi alias production.
- **Production alias** `https://hugo-theme-sept2026-test.vercel.app` chỉ cập nhật khi deploy thủ công:

```bash
npx vercel --prod --yes        # cần đăng nhập/token: npx vercel login  hoặc VERCEL_TOKEN
```

Chi tiết thực trạng & giới hạn deploy: `.clinerules/02-du-an-pharma-cosmetics.md` (mục 5).
Biến môi trường production khai báo trong Vercel → Project Settings → Environment Variables.

## Quy ước đóng góp

- Mọi thay đổi phải tuân [`Rule&HDKTXD.md`](./Rule&HDKTXD.md) và `.clinerules/`.
- Cấu hình hoá nội dung: chuỗi/nút/URL dùng `settings.<id>` + `| default:`, khai báo trong
  `configs/settings_schema.json` và giá trị trong `configs/settings_data.json`.
- Commit theo **conventional commits + tiếng Việt có dấu** (vd `fix(home-portal-v3): …`),
  mô tả rõ vấn đề → cách sửa.
- Kiểm tra tối thiểu trước khi commit: parse JSON config, `npm run build` khi sửa asset,
  `npm run test:portal` khi sửa snippet Home Portal.

Font UI chuẩn hiện tại là **Montserrat**. `theme.bwt` là layout storefront dùng chung cho các trang Pharma và Skin Health Beauty; `chat.bwt` và `mops-admin.bwt` giữ shell riêng nhưng cũng dùng Montserrat cho chữ UI.
