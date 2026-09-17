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
- **Rule không được "sinh ra" từ file báo cáo theo phase.** `phase/<tên-việc>/` vẫn dùng được làm không
  gian làm việc tạm cho một đầu việc cụ thể, nhưng làm xong thì dọn — không để nó thành nơi lưu rule.
  Bất kỳ nguyên tắc đứng vững lâu dài nào phát hiện được trong lúc làm (mapping kiến trúc, quyết định
  thiết kế chốt, v.v.) phải chép thẳng vào `.clinerules/` hoặc `Rule&HDKTXD.md` — xem mục 8/9. Thiết kế
  thay đổi theo thời gian là bình thường; rule chỉ cần phản ánh đúng trạng thái **hiện tại**, không cần
  giữ lại lịch sử "đã từng sai thế nào".

## 8. Home Portal v3 — bản đồ Section ↔ Config ↔ Snippet (nguồn chuẩn duy nhất)

> Thay thế mọi ma trận section/config trong các báo cáo QA/kiểm thử bên ngoài (kể cả các bản đã đính
> chính trước đó trong `phase/`). Khi một báo cáo ngoài mô tả khác mục này → **tin mục này**, không áp
> dụng máy móc đề xuất của báo cáo (xem nguyên tắc ở `.clinerules/01-quy-chuan-theme-sapo.md` mục 0).

**Quyết định chốt:** giữ nguyên hệ biến sẵn có `theme_*` (token màu), `portal_*` (Home Portal v3),
`home_*` (trang chủ), `mops_*` (admin/OMS). **Không** tạo thêm bộ `mops_hero_*`/`mops_color_*` như một
số báo cáo ngoài từng đề xuất — trùng chức năng với `theme_*`/`portal_*` đang chạy, làm mất hiệu lực
dữ liệu Admin đã lưu trong `settings_data.json`.

**Danh xưng (RULE-P0-02):** dùng **"Chuyên gia"**, không dùng "Bác sĩ"/"BS."/"DS.".
`scripts/compliance-lint.js` cảnh báo nếu vi phạm.

**12 section trang chủ** (`home_section_1..18` trong `settings_data.json`, lọc qua whitelist trong
`snippets/home_portal.bwt`):

| # | Section | Snippet | Biến cấu hình chính |
| :-- | :-- | :-- | :-- |
| 1 | Hero | `section_hero.bwt` | `portal_hero_visual`, `portal_hero_highlight`, `home_hero_*` |
| 2 | Chương I — Ngã ba Shop/Clinic | `section_portal_split.bwt` | `portal_chapter_1`, `portal_shop_*`, `portal_clinic_*`, `store_name` |
| 3 | Giải pháp theo tình trạng da | `section_solutions.bwt` | `home_solutions_*` |
| 4 | Flash Sale | `section_flash_sale.bwt` | `home_flashsale_*`, `promo_coupon_home_enable` |
| 5 | Sản phẩm nổi bật | `section_featured_products.bwt` | `home_featured_*` |
| 6 | Chương II — Skin Health Beauty | `section_spa.bwt` | `portal_chapter_2`, `portal_clinic_chips`, `home_spa_*` |
| 7 | Thương hiệu tiêu biểu | `section_brand_marquee.bwt` | `home_brand_*`, `portal_shop_url` |
| 8 | Minh chứng khách hàng | `section_testimonials.bwt` | `home_testi_*` |
| 9 | Hoạt chất / Khoa học | `section_ingredients.bwt` | `home_ing_*` |
| 10 | Chương III — Blog | `section_portal_blog.bwt` | `portal_chapter_3`, `portal_blog*`, `section_blog_url` |
| 11 | Mạng xã hội + Đặt lịch | `section_portal_social.bwt` | `portal_social_*`, `portal_booking_*`, `store_name` |
| 12 | Đăng ký bản tin | `section_portal_newsletter.bwt` | `portal_newsletter_*` |

Dùng chung toàn trang: topbar (`site_topbar.bwt`, `header_topbar_*`), design token (`storefront_theme.bwt`,
`theme_{main_color,forest_color,secondary_green,dark_color,page_background}`), khung section
(`home_portal.bwt`, `home_section_1..18`).

**Kiến trúc Hero/Header v3 hiện tại:**

- Hero (`section_hero.bwt` + `home-portal.css` + `home-hero.js`) là **Swiper ảnh nền full-bleed**;
  lớp nội dung/CTA đứng yên trong thẻ kính trắng mờ căn giữa, chữ dùng hệ màu tối của thiết kế sáng;
  không phủ mask lên toàn ảnh. Ảnh đầu preload + eager/high priority,
  các ảnh sau lazy-load; khung Hero khóa `min-height` để tránh CLS. Fade 700ms mỗi 5s, dừng khi
  hover/focus và tắt autoplay theo `prefers-reduced-motion`. Không dựng lại grid 2 cột cho Hero.
- Header: `header.header` là wrapper trong suốt theo thiết kế — màu nằm ở phần tử con: `.main-header`
  có nền dự phòng `#002E23`, `.pc-topbar` dùng setting riêng (mặc định `#1E7E48`), `.box-hearder`
  (logo/menu) nền trắng. Đo `background-color` phải đo đúng tầng con, không đo `header.header`.
- Ảnh dưới fold dùng lazyload (`class="lazyload"`/`data-src`) — phải `scrollTo(0, document.body.scrollHeight)`
  để trigger trước khi đo `naturalWidth` (tránh nhầm "chưa tải" thành ảnh 404).

**Quyết định tương phản hiện tại cho topbar/footer — tính bằng công thức WCAG 2.x relative luminance:**

| Cặp màu (chữ trắng #FFF trên nền) | Contrast ratio | WCAG 2.2 AA (≥4.5:1 văn bản thường) |
| :-- | :-- | :-- |
| nền `--mainColor` #3CB371 | **2.66:1** | ❌ Trượt — không dùng được cho nền có chữ |
| nền `--mainColorDark` #267348 | **5.78:1** | ✅ Đạt AA |
| nền/dark token `#002E23` | **14.85:1** | ✅ Vượt cả AAA (≥7:1) |

`mainColor` #3CB371 không được ghép với chữ trắng vì chỉ đạt 2.66:1. Trạng thái chuẩn hiện tại:

- Topbar dùng cặp setting `header_topbar_bg` / `header_topbar_text_color`; mặc định `#1E7E48` +
  `#FFFFFF` đạt **5.08:1**. Thông báo phân tách bằng `;`, chuyển dọc 600ms mỗi 4s, dừng khi hover và
  tắt autoplay theo `prefers-reduced-motion`; icon phone/user/chevron dùng SVG inline.
- Footer dùng Logo Master SVG chung với header; nền là `mainColorDark` (biến thể đậm của xanh thương
  hiệu) và toàn bộ chữ/icon trắng. Không dùng trực tiếp `mainColor` #3CB371 với chữ trắng vì cặp đó
  chỉ đạt ~2.66:1; `mainColorDark` mặc định của storefront là `#003F2D`, đạt ~11.7:1 với trắng.
- Khi đổi một màu nền, phải đo lại và đổi đồng bộ màu chữ/icon để giữ tối thiểu 4.5:1 cho văn bản.

**Còn thiếu (ngoài phạm vi trang chủ, chưa triển khai):** nhóm Thanh toán & VietQR (`vietqr_bank_code`,
`vietqr_account_no`, `vietqr_account_name`, `vietqr_auto_approve`); khối "Đội ngũ chuyên gia" trên trang
chủ (`about_expert_*` hiện chỉ hiển thị ở trang Về chúng tôi, muốn lên trang chủ phải dựng section mới —
là thêm tính năng, không phải sửa lỗi).

## 9. Cách đọc báo cáo/spec bên ngoài — luôn xác minh, không copy số liệu

Kiểm chứng 16/09/2026 với báo cáo "Báo Cáo Kiểm Thử UI_UX & Đối Chiếu Snippets Codebase - Hugo Theme
Sept 2026.md" (bản report hay tái xuất hiện — xem cảnh báo ở `AGENTS.md`): đối chiếu từng dòng với repo
thật cho kết quả:

- **Danh sách 115 file snippet chia "6 nhóm chức năng"**: chỉ **15/115** tên file có thật — đúng bằng
  nhóm Home Portal v3 đã liệt kê ở mục 8. **100/115 tên còn lại không tồn tại** trong `snippets/`
  (`site_header.bwt`, `logo.bwt`, `cart_item_row.bwt`, `clinical_intake_survey.bwt`, `vietqr_modal.bwt`,
  `blog_post_card.bwt`...). Tổng số 115 khớp chỉ vì trùng con số, danh sách chi tiết là bịa.
- **Mọi ví dụ biến trong phần "Config Architecture"** của report đó (`mops_logo`, `mops_hero_btn_link`,
  `mops_hero_image`, `mops_hero_title`, `mops_color_primary`, `mops_color_accent`, `mops_color_bg`,
  `mops_menu_main`, `footer_company_name`, `theme_color_primary`) — **không tồn tại** trong
  `configs/settings_schema.json`. Tự mâu thuẫn với chính quyết định "giữ theme\_\*/portal\_\*/home\_\*,
  không dùng mops\_\*" mà report đó nêu ngay phần đầu.
- **Số liệu "995 biến cấu hình"**: không khớp cả tổng bảng 22 nhóm của chính report (cộng tay ra 718)
  lẫn số `"id"` thật đo trực tiếp trong schema (1037) — không dùng con số nào trong 3 số này.
- Tên 22 nhóm cấu hình (Theme & Màu sắc, Home Portal v3, Header & Điều hướng...) và mô tả kiến trúc
  `settings_schema.json` ↔ `settings_data.json` thì **đúng** — kiến trúc tổng quan không sai, chỉ sai
  danh sách file/tên biến/số đếm chi tiết.

**Quy tắc rút ra:** report dạng này thường đúng ở tầng kiến trúc tổng quan nhưng bịa gần hết chi tiết cụ
thể (tên file, tên biến, số đếm) để trông đầy đủ/chuyên nghiệp. Không copy danh sách filename hay tên
biến từ báo cáo/spec bên ngoài vào code hay vào rule mà không chạy lệnh xác minh trước:

```bash
# Danh sách snippet thật
ls snippets/*.bwt

# Danh sách biến cấu hình thật
grep -o '"id"[[:space:]]*:[[:space:]]*"[a-z_]*"' configs/settings_schema.json
```
