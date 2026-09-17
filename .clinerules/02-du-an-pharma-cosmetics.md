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
- **Không tự ý xoá hoặc tạo mới field trong `settings_schema.json`/`settings_data.json`, không tự ý
  đổi kiến trúc giao diện (đổi cách 1 phần tử lấy màu/dữ liệu từ đâu, gộp/tách setting, đổi cấu trúc
  section) khi việc được giao chỉ là chỉnh 1 giá trị/màu cụ thể.** Nếu thấy có setting trùng chức năng
  hoặc muốn tái cấu trúc, phải hỏi trước và được đồng ý rồi mới làm — không tự quyết. Sự cố 17/09/2026:
  xoá nhầm `header_topbar_bg`/`header_topbar_text_color` khi "gộp" topbar vào mainColor mà không hỏi,
  làm mất một cấu hình Admin đang dùng (xem mục 8).
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
| 8 | Minh chứng khách hàng | `section_testimonials.bwt` | `home_testi_*` (mỗi thẻ tối đa 3 ảnh: `home_testi_{n}_image_1..3`, xem bằng swiper — 17/09/2026 thay cho cặp `_before`/`_after`, vì không phải case nào cũng có đúng 1 ảnh trước + 1 ảnh sau) |
| 9 | Hoạt chất / Khoa học | `section_ingredients.bwt` | `home_ing_*` |
| 10 | Chương III — Blog | `section_portal_blog.bwt` | `portal_chapter_3`, `portal_blog*`, `section_blog_url` |
| 11 | Mạng xã hội + Đặt lịch | `section_portal_social.bwt` | `portal_social_*`, `portal_booking_*`, `store_name` |
| 12 | Đăng ký bản tin | `section_portal_newsletter.bwt` | `portal_newsletter_*` |

Dùng chung toàn trang: topbar (`site_topbar.bwt`, `header_topbar_*`), design token (`storefront_theme.bwt`,
`theme_{main_color,forest_color,secondary_green,dark_color,page_background}`), khung section
(`home_portal.bwt`, `home_section_1..18`).

**Kiến trúc Hero/Header v3 hiện tại:**

- Hero (`section_hero.bwt` + `home-portal.css` + `home-hero.js`) là **Swiper ảnh nền full-bleed**;
  lớp nội dung/CTA đứng yên trong thẻ kính trắng mờ (`background:rgba(255,255,255,.94)`,
  `backdrop-filter:blur(16px)`), neo **góc trái** wrap (`justify-content:flex-start`, cập nhật
  17/09/2026 — trước đó từng căn giữa) để ảnh nền vẫn hiện rõ phần còn lại; chữ dùng hệ màu tối của
  thiết kế sáng, riêng cụm từ nhấn mạnh trong H1 (`<em>`, từ `settings.portal_hero_highlight`) tô
  `var(--green)`/mainColor. Không phủ mask lên toàn ảnh. Ảnh đầu preload + eager/high priority,
  các ảnh sau lazy-load; khung Hero khóa `min-height` để tránh CLS. Fade 700ms mỗi 5s, dừng khi
  hover/focus và tắt autoplay theo `prefers-reduced-motion`. Không dựng lại grid 2 cột cho Hero.
- Header: `header.header` là wrapper trong suốt theo thiết kế — màu nằm ở phần tử con: `.main-header`
  có nền dự phòng `#002E23`, `.pc-topbar` lấy nền từ `--mainColor` (schema-admin, xem dưới),
  `.box-hearder` (logo/menu) nền trắng. Main header desktop cao 68px; khi cuộn chỉ `.header-menu` cao
  48px được fixed với nền trắng đục, stacking riêng và shadow. Logo/icon dùng `mainColorDark` đủ
  tương phản, còn `mainColor` dùng cho accent. Đo `background-color` phải đo đúng tầng con, không đo
  wrapper.
- Ảnh dưới fold dùng lazyload (`class="lazyload"`/`data-src`) — phải `scrollTo(0, document.body.scrollHeight)`
  để trigger trước khi đo `naturalWidth` (tránh nhầm "chưa tải" thành ảnh 404).

**Quyết định tương phản hiện tại cho topbar/footer — tính bằng công thức WCAG 2.x relative luminance:**

| Cặp màu | Contrast ratio | WCAG 2.2 AA (≥4.5:1 văn bản thường) |
| :-- | :-- | :-- |
| nền `--mainColor` #3CB371 + chữ trắng #FFF | **2.66:1** | ❌ Trượt |
| nền `--mainColor` #3CB371 + chữ dark ink `--pc-brand-dark` #002E23 | **5.57:1** | ✅ Đạt AA |
| nền/dark token `#002E23` + chữ trắng | **14.85:1** | ✅ Vượt cả AAA (≥7:1) |

**Cập nhật 17/09/2026 — topbar và footer khớp `mainColor` của schema-admin:**

- Footer (`.footer`/`.mid-footer`/`.bg-footer-bottom`, `assets/storefront-v3.css`) dùng thẳng
  `background:var(--mainColor)` (chuỗi token `settings.theme_main_color` → `--pc-brand-primary` →
  `--mainColor`, xem `storefront_theme.bwt`) — đổi `theme_main_color` ở Admin (Màu sắc) là đổi luôn
  footer, không có setting riêng cho footer.
- Topbar (`.pc-topbar`) **vẫn giữ setting riêng** `header_topbar_bg` / `header_topbar_text_color`
  (`configs/settings_schema.json`, truyền qua `--pc-topbar-bg`/`--pc-topbar-fg` trong
  `site_topbar.bwt`) — KHÔNG xoá field này. Giá trị mặc định hiện tại: `#3CB371` (khớp `mainColor`)
  + **chữ trắng `#FFFFFF`** — người dùng chủ đích chọn lại chữ trắng ngày 17/09/2026 sau khi đã thử
  dark ink, dù chỉ đạt ~2.66:1 (dưới AA 4.5:1). Đây là quyết định thẩm mỹ có chủ đích, không phải lỗi
  — không tự ý đổi lại sang dark ink nếu không được yêu cầu (xem mục 7).
- Footer dùng **cùng chữ trắng `#fff`** cho chữ/icon/logo (đồng bộ thẩm mỹ với topbar, cùng ngày
  17/09/2026) — cũng dưới AA (~2.66:1), cũng là lựa chọn chủ đích, không tự ý đổi sang dark ink.
  Footer border-top dùng `--mainColorDark` (`theme_forest_color`) để có viền phân cách nhìn được
  (không lặp lại chính màu nền).
- Topbar: thông báo phân tách bằng `;`, chuyển dọc 600ms mỗi 4s, dừng khi hover và tắt autoplay theo
  `prefers-reduced-motion`; icon phone/user/chevron dùng SVG inline, kế thừa `currentColor` (trắng).
- Footer dùng Logo Master SVG chung với header, kế thừa `currentColor` (trắng) qua `.pc-footer-logo`.
- Khi đổi một màu nền/chữ theo yêu cầu mới, chỉ đổi đúng giá trị được yêu cầu — không tự suy ra và đổi
  thêm màu khác "cho đủ AA" nếu không được hỏi trước (xem mục 7); nếu phát hiện contrast dưới AA thì
  báo cho người dùng biết, không tự ý sửa.
- **17/09/2026 (sự cố):** đã từng xoá nhầm field `header_topbar_bg`/`header_topbar_text_color` khỏi
  schema+data khi "gộp" topbar vào mainColor mà không hỏi trước — vi phạm mục 7 (không tự ý đổi
  `settings_data.json`) và làm mất một cấu hình Admin đang dùng. Đã khôi phục. Xem quy tắc bắt buộc
  ở mục 7.

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
