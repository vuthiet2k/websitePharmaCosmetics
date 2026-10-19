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
| [`docs/`](./docs) | Hướng dẫn nhập liệu cho người quản trị Sapo: tạo liệu trình (`huong-dan-tao-lieu-trinh.md`), cấu hình khu Skin Health Beauty (`huong-dan-cau-hinh-skin-health-beauty.md`), tin tức mobile kiểu Instagram/Facebook (`huong-dan-tin-tuc-mobile-instagram.md`), ca Trước & Sau, đăng tin & video, danh mục kê đơn, vận hành Soi da AI |
| [`mops-gas/docs/`](./mops-gas/docs) | Playbook backend Google Apps Script / MOPS (hiệu năng, ghi chú thiết kế) |
| [`tests/portal/`](./tests/portal) | Kịch bản Playwright cho Home Portal |

## Hướng dẫn sử dụng cho người quản trị Sapo (`docs/`)

Dành cho người nhập nội dung / vận hành website trên **Sapo Admin** — không cần biết code. Tìm việc cần làm ở cột trái,
mở tài liệu tương ứng và làm theo từng bước; cuối mỗi tài liệu có danh sách kiểm tra sau khi làm xong.

| Bạn cần làm gì | Đọc tài liệu |
| :-- | :-- |
| Cấu hình khu **Skin Health Beauty** (trang `/skin-health-beauty`, trang dịch vụ, chọn giao diện cho từng trang) + danh sách lỗi đang chờ xử lý | [`docs/huong-dan-cau-hinh-skin-health-beauty.md`](docs/huong-dan-cau-hinh-skin-health-beauty.md) |
| **Thêm 1 liệu trình** mới (sản phẩm dịch vụ, ảnh, tag, FAQ, chọn giao diện `product.lieu-trinh`) | [`docs/huong-dan-tao-lieu-trinh.md`](docs/huong-dan-tao-lieu-trinh.md) |
| Thêm **ca Trước & Sau** (ảnh khách hàng) | [`docs/huong-dan-tao-ca-truoc-sau.md`](docs/huong-dan-tao-ca-truoc-sau.md) |
| **Đăng tin tức, bài video** YouTube/Facebook; đưa tin vào "Tin nổi bật" | [`docs/Hướng dẫn đăng bài Tin tức & Video trên Sapo.md`](<docs/Hướng dẫn đăng bài Tin tức & Video trên Sapo.md>) |
| Bật **bảng tin kiểu Instagram** trên điện thoại; chi tiết bài kiểu bài đăng Facebook | [`docs/huong-dan-tin-tuc-mobile-instagram.md`](docs/huong-dan-tin-tuc-mobile-instagram.md) |
| Tạo / cập nhật danh mục **thuốc kê đơn** (ẩn mua online, chuyển sang tư vấn) | [`docs/Danh mục Thuốc kê đơn - Hướng dẫn tạo trên Sapo.md`](<docs/Danh mục Thuốc kê đơn - Hướng dẫn tạo trên Sapo.md>) |
| Danh mục **6 vấn đề da** ở trang chủ ("Giải pháp cho từng vấn đề") | [`docs/Đặc tả Danh mục Vấn đề Da Trang chủ PharmaCosmetics.md`](<docs/Đặc tả Danh mục Vấn đề Da Trang chủ PharmaCosmetics.md>) |
| Danh mục sản phẩm cho **phác đồ Soi da / Quiz AI** | [`docs/Đặc tả Danh mục Sản phẩm Sapo & Quy tắc Lọc Phác đồ Soi da PharmaCosmetics.md`](<docs/Đặc tả Danh mục Sản phẩm Sapo & Quy tắc Lọc Phác đồ Soi da PharmaCosmetics.md>) |
| **Soi da AI** gặp sự cố: tạm tắt, khôi phục | [`docs/skin-scan-operations.md`](docs/skin-scan-operations.md) |
| Danh sách link video YouTube cho blog Bí quyết (tham khảo) | [`docs/Danh sách Link Iframe YouTube - Trang Blogs Bí Quyết (Pharma Cosmetics).md`](<docs/Danh sách Link Iframe YouTube - Trang Blogs Bí Quyết (Pharma Cosmetics).md>) |

Lưu ý chung:

- **Cấu hình theme nằm trong từng theme Sapo.** Upload gói theme mới (`exports/sapo-theme-*.zip`) thì các chỉnh sửa trong
  *Giao diện › Tuỳ chỉnh* của theme cũ không tự sang — báo dev chép vào `configs/settings_data.json` trước khi đóng gói.
- Xem trước theme chưa xuất bản: `https://pharmacosmetics-vn.com/?previewThemeId=<mã theme>`; luôn kiểm tra trên **điện thoại thật**.
- Không nhập số liệu, đánh giá, ảnh trước/sau không có thật; dùng "Chuyên gia", không dùng "Bác sĩ".
- Tài liệu sai so với màn hình Sapo / trang web ⇒ báo dev cập nhật tài liệu (dev: sửa tính năng nào thì sửa luôn tài liệu đó).

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
