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
| Zip nộp Sapo | `npm run build:sapo` → `exports/sapo-theme-<version>.zip` (< 5.000.000 bytes; xem `.clinerules/01` mục 2.2–2.3) |
| Test portal | `npm run test:portal` (Playwright, `playwright.portal.config.js`, `tests/portal/`) |
| Kiểm tra JSON | `node -e "JSON.parse(require('fs').readFileSync('configs/settings_schema.json','utf8'))"` |
| Deploy production | `npx vercel --prod --yes` (**cần auth** — xem mục 5) |
| Kiểm tra trường cấu hình | `npm run lint:config` — FAIL nếu có trường trong schema mà code thật (bỏ comment) không đọc; đã gắn vào `build:sapo`. Thêm trường mới phải dùng ngay trong code; bỏ chỗ dùng thì xoá trường (hỏi trước) |
| Cấu hình trong asset | **Cấm** `settings.*` trong `assets/*.bwt` — Sapo không render Liquid trong asset nên build phải gắn cứng giá trị, Admin đổi không có tác dụng (`compile:sapo` FAIL). CSS: `var(--…, mặc định)` + khai báo ở `snippets/design_tokens.bwt`; bật/tắt CSS: class trên `<body>` (layouts/theme.bwt) hoặc để HTML tự ẩn; JS: `window.PC_CFG` (`snippets/theme_runtime_config.bwt`), MOPS: `window.PC_MOPS_CFG` (`layouts/mops-admin.bwt`) |
| Mẫu Google Sheet cấu hình | `npm run sheet:config` (= `python scripts/export-config-sheet.py`) → `exports/cau-hinh-theme.xlsx` (sinh từ schema/data; chạy lại mỗi khi schema đổi). Khách điền các cột ★ (Hành động / Giá trị mới / Ghi chú / Trạng thái); agent áp thay đổi theo cột **ID**, đổi cấu trúc (nhãn, ẩn/xoá/di chuyển, trường mới) vẫn phải hỏi trước |

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

- **Link trang nội dung Sapo là `/<alias>`, KHÔNG có tiền tố `/pages/`** (người dùng chốt 2026-10-08: Sapo không cho
  đặt dạng `/pages/...`). Vd `/dat-lich-tu-van`, `/ai-skin-quiz-results`. Áp dụng cả giá trị mặc định trong schema/settings_data.

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
- **18/09/2026 (sự cố — comment bịa "theo yêu cầu người dùng"):** commit `58bda23` (12/09/2026, tiêu đề
  chỉ nói về sửa màu icon header/mobile) lén kèm theo việc tạo mới `layouts/auth.bwt` (layout tách
  riêng, split-screen, KHÔNG có header/topbar/menu/search/cart) và viết lại toàn bộ
  `templates/customers/login.bwt`/`register.bwt` để dùng layout đó, kèm comment ghi "T-112, theo yêu
  cầu người dùng (Phần III/IV báo cáo audit 2026-09-12)". Xác minh 18/09/2026: **không có file báo cáo
  audit nào như vậy** trong repo hay git history — chỉ có `T-106-ui-ux-audit-fixes.log` (mã khác) trong
  `.project-agent/` cũ (đã xoá). Kết luận: đây là 1 agent tự quyết đổi kiến trúc trang rồi ghi chú như
  đã được duyệt — vi phạm đúng nguyên tắc ở đầu mục này. Đã khôi phục: `login.bwt`/`register.bwt` dùng
  lại layout chung `theme.bwt` (đầy đủ header), xoá `layouts/auth.bwt` và phần CSS shell riêng
  (`.pc-auth-body/-topbar/-shell/-panel*/-formzone`) trong `assets/page_account.scss.bwt`; giữ lại các
  fix hợp lệ không liên quan tới layout (toggle ẩn/hiện mật khẩu, ẩn khối social khi rỗng — T-134).
  **`layouts/chat.bwt` — đã đối chiếu, GIỮ NGUYÊN:** dùng đúng câu chữ tương tự ("T-113, REOPEN
  2026-09-12, Phần V báo cáo audit 2026-09-12") — cùng nguồn báo cáo bịa. Xác minh: không template nào
  dùng `{% layout 'chat' %}` (tính năng chat AI thật, `page.ai-skin-quiz.bwt`, hiện dùng `layouts/theme.bwt`), không có CSS `pc-chat-*` nào,
  không có field settings mồ côi. Vậy `layouts/chat.bwt` là file chết về mặt kỹ thuật, nhưng người dùng
  yêu cầu giữ lại nguyên trạng (18/09/2026: "vẫn giữ - mục này tôi dùng") — không xoá.
  `configs/settings_schema.json`/`settings_data.json` vẫn còn field `auth_panel_image`,
  `auth_panel_headline`, `auth_trust_badge_1..3` (dựng riêng cho layout đã xoá) — CHƯA xoá vì mục 7 cấm
  tự ý xoá field settings, cần hỏi người dùng trước.
  **Sửa lại nhận định (cùng ngày):** sau khi đưa login/register về 1 cột đơn giản, người dùng phản hồi
  bố cục ĐÚNG phải là 2 cột 6-6 (form + ảnh minh hoạ), theo đúng mockup thật tại `design/auth/login.html`
  / `register.html` / `auth.css` (thêm có chủ đích ở commit `b6019d2`, khác hẳn `layouts/auth.bwt` bịa).
  Rút kinh nghiệm: comment "theo yêu cầu người dùng" bịa chỉ làm mất hiệu lực CĂN CỨ đã nêu, không có
  nghĩa là bố cục split-screen tự nó sai — bố cục đó có nguồn thật, chỉ là chưa ai tra trước khi sửa.
  **Rule mới:** trước khi đổi/viết lại bố cục 1 trang, luôn `Glob`/`Grep` thư mục `design/` tìm mockup
  tương ứng và bám theo cấu trúc đó (mã màu/font đổi theo token thật của theme, không copy nguyên giá
  trị cứng trong mockup); chỉ tự đề xuất bố cục khi thật sự không có mockup nào, và phải hỏi trước khi
  làm — không tự quyết như các lần trước.

## Layout storefront dùng chung (19/09/2026)

- `theme.bwt` là layout chung storefront, gồm `page.indexskinhealthy`, `page.skinhealthy-services`,
  `collection.skinhealthy`, `page.skinhealthy-service-detail`, `page.ai-skin-quiz`. Bỏ `layouts/skinhealthy.bwt` và `layouts/clean.bwt`.
- CSS nội dung Skin Health, reveal và giỏ dịch vụ nằm trong `snippets/skinhealthy_content_style.bwt`
  và `skinhealthy_content_script.bwt`, nạp có điều kiện; header/footer dùng chung Pharma.
- `indexskinhealthy` không phải Home Portal: không nạp CSS/JS và skip link của Portal.
- CSS AI chat phải giới hạn trong `.ai-skin-chat-app`, không khoá cuộn toàn trang.
- Giữ `layouts/chat.bwt` theo quyết định trước đó và `layouts/mops-admin.bwt` cho quản trị.

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
  neo **góc trái** wrap (`justify-content:flex-start`, cập nhật 17/09/2026 — trước đó từng căn
  giữa) để ảnh nền vẫn hiện rõ phần còn lại. Cập nhật 20/09/2026 (phase home-shopping-ux, thay cho
  bản kính trắng mờ trước đó): `.portal-hero__copy` nền **trong suốt** (`background:transparent`),
  rộng tối đa **564px tính cả padding** (`box-sizing:border-box`), `border-radius:40px`; không còn
  viền/box-shadow/backdrop-filter. Độ rõ chữ trên ảnh lấy từ `.portal-hero__mask` — gradient tối phủ
  từ trái (phía text) sang phải, đã bật lại thay cho `display:none` cũ — cộng với chữ/nút **trắng**
  (`h1`, `.sub`, `.btn-o` đổi từ token `--ink`/`--ink-2`/`--line` sang trắng/alpha trắng; `.eyebrow`
  và `<em>` nhấn mạnh vẫn giữ `var(--green)`/mainColor vì đã đủ tương phản trên nền tối). Ảnh đầu
  preload + eager/high priority, các ảnh sau lazy-load; khung Hero khóa `min-height` để tránh CLS.
  Fade 700ms mỗi 5s, dừng khi hover/focus và tắt autoplay theo `prefers-reduced-motion`. Không dựng
  lại grid 2 cột cho Hero.
- Khối hướng dẫn Quiz da AI (`section_ai_guide.bwt`, phase home-shopping-ux 20/09/2026): section
  Home Portal đăng ký qua `home_portal.bwt` `valid_sections` + `home_section_N`, mặc định đặt ngay
  sau Hero (`home_section_2`). CTA trỏ `/kham-da-ai` (alias thật của `page.ai-skin-quiz.bwt`, xem
  `dev-server.js` `PAGE_HANDLE_MAP`). Toggle lối vào trong menu mobile: `home_ai_guide_menu_enable`
  (mặc định bật) — không dựng nút nổi mới, dùng đúng `<ul class="mb-drawer-secondary">` có sẵn
  trong `header.bwt`.
- Ẩn "Tích điểm đổi quà" khỏi menu mobile: gate bằng `settings.header_loyalty_enable` (checkbox,
  mặc định **tắt**) trong `header.bwt` — loại hẳn khỏi DOM khi tắt (không phải CSS ẩn). Dữ liệu/
  tích hợp loyalty thật (`appbulk-loyalty-widgets.bwt`, `page.loyalty.bwt`, hạng `loyalty_tier_1..6_*` trong settings)
  giữ nguyên, bật lại được bất kỳ lúc nào chỉ bằng setting này.
- Cụm liên hệ nổi (`support.bwt`) có 3 trạng thái: thu gọn, mở panel (`.widget-opened`, như cũ), và
  **ẩn hoàn toàn** (`.widget-hidden`, `display:none` thật — thêm 20/09/2026). Trạng thái ẩn lưu qua
  `sessionStorage` (`pc_contact_widget_hidden`), có nút "Ẩn nút liên hệ" trong panel và nút mở lại
  "Hiện lại nút liên hệ nhanh" ở khối copyright footer (`footer.bwt`, CSS trong `global_core.scss.bwt`
  `.copyright .footer-contact-reopen`) — luôn hiện, bấm là hiện lại cụm nổi bất kể trạng thái hiện tại.
- Backtop/main-widget tránh đè footer (`footer_script.bwt`): thay công thức `innerHeight - footer.top`
  (có thể vượt viewport khi footer cao hơn màn hình, đẩy widget "top âm" ra ngoài — lỗi đã khảo sát ở
  mobile 390×900) bằng phần giao thật của footer với viewport (`clamp` theo `rect.top/bottom` và
  `window.innerHeight`) **cộng** một chặn cuối theo `el.offsetHeight` để đáy widget không bao giờ vượt
  quá viewport (20/09/2026).
- Drawer menu mobile (`header.bwt` `#btn-menu-mobile` → `.header-menu.current`) có 2 nơi toggle class
  độc lập (shim inline chạy trước, jQuery thật trong `main.js.bwt` chạy sau khi
  `window.__pcMenuJSReady=true`) — không sửa logic mở/đóng ở 1 trong 2 nơi mà mong đủ. Khoá cuộn nền
  (`body.pc-drawer-open`, CSS trong `global_core.scss.bwt`), `aria-expanded` và trả focus khi đóng
  (Escape/nút X/overlay) implement bằng 1 `MutationObserver` quan sát class `.current` — chạy đúng dù
  bên nào toggle, không lặp code ở 2 nơi (thêm 20/09/2026, D01).
- Badge % giảm giá (`.pc-flashsale__badge`) dùng token riêng `--flashsale-badge-bg:#D92D20`
  (header_style.bwt), KHÔNG dùng chung `--sale-color` (#cc3d00, vẫn giữ cho nút CTA/progress bar).
  Vị trí chuẩn: top-right. Có 4 nơi định nghĩa/override selector này — sửa màu/vị trí phải sửa cả 4:
  `product_grid_office_sale.bwt` (base), `home-portal-integration.css` (Portal v3, cùng file cũng
  đặt badge quy cách `.badge` ở bottom-left để tránh đè), `section_featured_products.bwt`,
  `section_collection_bestseller.bwt`, `section_product_viewed.bwt` (đã bỏ override xanh riêng).
  Icon tiêu đề Flash Sale (`flash_-1.png`) dùng `@keyframes pc-pulsescale` định nghĩa trong
  `page_home.scss.bwt` (load cho mọi trang `template contains 'index'`) — đã có sẵn từ trước, chỉ
  thêm `.pc-flashsale__title img{animation:none}` vào block `prefers-reduced-motion` sẵn có.
- **Option "chết" trong dropdown `home_section_1..18` (audit G02 — người dùng chốt 2026-10-03):**
  9 giá trị (`section_why_us`, `section_feedback`, `section_collection_bestseller`,
  `section_collection_cta`, `section_stats`, `section_clinical_banner`, `section_trust_strip`,
  `section_protocol`, `section_zalo_consult`) KHÔNG có trong `valid_sections` của `home_portal.bwt` nên
  chọn xong không hiện gì — GIỮ option (không xoá, tránh vỡ preset cũ), label gắn `[Chưa kích hoạt]`.
  `section_expert_team` ĐÃ BẬT (2026-10-03, người dùng chốt): có trong `valid_sections`, đặt ở chương II
  "Tin cậy" ngay sau `section_testimonials` (`home_section_10`), viết theo khung v3 (wrap /
  section-head / lưới `.proof` + thẻ `.pcase`), 3 chuyên gia mới nhất của blog chuyên gia, tiêu đề cấu
  hình `home_expert_*`.
- **SEO/GEO cấu hình hoá (2026-10-03):** Section "SEO" của `settings_schema.json` chứa mã xác minh
  Google/Bing, hậu tố tiêu đề, ảnh `og:image` mặc định, `geo_region`/`geo_placename`, toạ độ,
  link Google Maps, giờ mở cửa, mức giá. Dùng ở `layouts/theme.bwt` (meta), `fb-open-graph-tags.bwt`
  và `schema.bwt` (HealthAndBeautyBusiness). Toạ độ/giờ/giá/Maps mặc định TRỐNG và chỉ in khi admin
  nhập — không điền số giả. `product_wishlist_collection` cố ý giữ ở section này.
- **Trang chuyên khoa đọc dữ liệu Sapo thật (2026-10-03, người dùng chốt):** không dùng biến mock
  `doctors`/`b2b_tiers`/`loyalty_tiers`/`ingredients`/`patient_testimonials`/`faqs` (chỉ có ở preview, trên Sapo = nil → trang trắng).
  Cấu hình ở section "Trang chuyên khoa" của `settings_schema.json`.
  - Chuyên gia = bài viết trong blog `settings.expert_blog_handle` (mặc định `chuyen-gia`): tiêu đề =
    tên, ảnh bài = chân dung, summary = trích dẫn, content = học vấn + kinh nghiệm; tag `chucdanh:`,
    `chuyenkhoa:`, `kinhnghiem:`, tuỳ chọn `benhnhan:`/`hieuqua:`/`danhgia:` (chỉ hiện khi có).
    Đọc tag qua `snippets/expert_fields.bwt`. `/pages/chuyen-gia-detail` hiện bài
    `expert_flagship_handle` (trống = bài đầu blog). Byline bài viết thường: tag `chuyengia:<handle>`.
  - Hoạt chất = bài viết trong blog `settings.ingredient_blog_handle` (mặc định `hoat-chat`): tag
    `nhom:`, `inci:`, `tuongtac:<handle>` (lặp được) dựng ma trận tương tác.
  - Đánh giá khách hàng (trang chuyên gia + 3 bài ở trang sản phẩm) = bài viết trong blog
    `settings.testimonial_blog_handle` (mặc định `danh-gia-khach-hang`): tiêu đề = tên khách, ảnh bài
    = avatar, summary (hoặc content) = lời đánh giá, tag `ketqua:`. Blog trống → ẩn khối; không dùng
    biến mock `patient_testimonials`, không đăng đánh giá bịa.
  - FAQ trang sản phẩm = bài viết trong blog `settings.product_faq_blog_handle` (mặc định
    `cau-hoi-san-pham`, field ở section "Trang sản phẩm"): tiêu đề = câu hỏi, content = trả lời.
    Blog trống → ẩn khối. Cùng cách cho FAQ trang Đặt lịch (`booking_faq_blog_handle`, mặc định
    `cau-hoi-dat-lich`, section "Liên hệ & Hỗ trợ") và trang Tài khoản (`account_faq_blog_handle`,
    mặc định `cau-hoi-tai-khoan`, section "Tài khoản khách hàng"); biến mock `faqs` đã gỡ.
  - "Ý kiến chuyên gia" trang sản phẩm = bài viết trong blog `settings.expert_opinion_blog_handle`
    (mặc định `y-kien-chuyen-gia`, section "Trang sản phẩm"): summary/content = trích dẫn, tag
    `sanpham:<alias>` (nhiều được) chọn sản phẩm, `chuyengia:<handle>` lấy tên/ảnh/năm KN. Sản phẩm
    không có ý kiến riêng → ẩn khối — KHÔNG hiện 1 câu khen chung cho mọi sản phẩm.
  - "Thành phần hoạt chất" trang sản phẩm (CHỈ 1 khối `pc-pdp-ingredients-section`; khối trùng trong
    phần mô tả + khối ý kiến dùng `doctors[0]` đã xoá) đọc blog hoạt chất: SẢN PHẨM gắn tag
    `hoatchat:<handle>` (thứ tự theo tag), thẻ = tiêu đề + summary, tag `icon:` tuỳ chọn trên bài.
    Không có tag → ẩn khối. `tab_product.bwt` loại tag `hoatchat:` khỏi danh sách tag hiển thị.
  - Trang Dịch vụ trị liệu (`page.spa-services`): thông điệp = `spa_philosophy_quote`/`_signature`;
    giải pháp = blog `spa_solution_blog_handle` (mặc định `giai-phap-skin-health`), tag `en:`,
    `phuhop:` (lặp), `tagline:`. AI Skin Quiz: bảng kết quả theo loại da dùng chung
    `snippets/quiz_results_data.bwt` (logic ứng dụng, không phải nội dung admin); bài khuyên đọc ở
    trang kết quả lấy blog `quiz_article_blog_handle` (mặc định `tin-tuc`).
- **Chặn biến mock tái phát:** `npm run lint:liquid-globals` (nằm trong `build:sapo`) báo mọi biến
  Liquid không thuộc 38 đối tượng Sapo và không được assign/capture/for/tham số include ở đâu. Ngoại
  lệ phải ghi lý do trong `ALLOW` của `scripts/lint-liquid-globals.js`. Đã kiểm trên shop Sapo thật
  (2026-10-03): `social_login`, `routes.cart_url` hợp lệ; `articles[handle]` chưa đối chiếu được.
  `Bizweb.money_format` gán bằng `{{ store.money_format | json }}` — chuỗi placeholder amount viết
  thẳng trong file .bwt sẽ bị Liquid nuốt (shop thật ra "$", formatMoney không truyền format ném lỗi).
  Lint này cũng FAIL khi template đọc `settings.X` mà X chưa khai báo trong `settings_schema.json`
  (admin không sửa được) — bỏ qua có lý do: `popup_sapo.bwt` (demo theme gốc, tắt),
  `section_clinical_banner.bwt` (không được include).
- **Không bịa dữ liệu hiển thị cho khách (rà 2026-10-03):** đã gỡ khuyến mãi demo "Tặng tinh dầu
  Moroccanoil…" (`header_search_promo`, `header_search_gg_title`), số điện thoại giả fallback
  (`0987.654.321`, `1900xxxx` → dùng `settings.store_phone`), hồ sơ sức khoẻ bịa ở
  `page.patient-portal` (chỉ giữ tên + đơn hàng thật), ca bệnh/số liệu bịa ở `page.clinical-proof`
  (giới thiệu + 4 chỉ số = `clinical_*` settings, mặc định trống; ca điều trị = blog
  `clinical_case_blog_handle`, mặc định `truoc-va-sau`, ảnh trước/sau qua tag `anhtruoc:`/`anhsau:`).
- **Audit Checklist Sapo tự động:** `BASE=http://localhost:3000 npm run audit:sapo-review` (Playwright,
  33 route): 1 `<h1>`/trang, `<img>` có alt + width/height, ảnh dưới màn hình đầu lazy, không lỗi
  JS/console/HTTP ≥400, không tràn ngang @375px. Chỉ thêm width/height cho ảnh khi CSS đã cố định CẢ 2
  chiều (w-full h-full, absolute inset-0…) — nếu không thuộc tính height sẽ đổi kích thước hiển thị.
- Checkbox: `global_core.scss.bwt` (theme gốc) ẩn MỌI `input[type=checkbox]` (opacity 0, absolute,
  width 100%) cho checkbox tự vẽ bằng label. Ô đồng ý dùng checkbox gốc phải có class
  `pc-checkbox-native` (đã gắn: about-us, đặt lịch, đăng ký) — nếu không khách không thấy ô bắt buộc.
- AI Skin Quiz: 18 câu hỏi (từ 2026-10-05) = `snippets/quiz_questions_data.bwt` (nguồn duy nhất; `data/quiz-questions.js`
  đã xoá) — trước đây Sapo chỉ chạy bộ dự phòng 5 câu.
- `npm run test:portal` (39 test) PASS 2026-10-03. Test bám hook ổn định (`data-result-disclaimer`,
  `data-scan-stage-products`, `data-skin-*`) — không bám class Tailwind/khung. CRM `save_skin_analysis` gửi
  `analysis_result` gồm `scores`, `monk_skin_tone`, `tech_neck`, `skin_type`, `skin_age`, `primary_concern`,
  `regimen`, `recommended_products` (KHÔNG ảnh). Từ 2026-10-09 trang kết quả đổ **danh mục tự động**
  (`settings.skin_result_col_*`) vào 3 thẻ giai đoạn + badge hoạt chất; handle trong `recommended_products` của
  skin-routine-matcher không có trên Sapo nên không dùng làm link.
- Kết quả soi da / khảo sát lưu qua `window.PharmaResultStore` (`snippets/pc_result_store.bwt`, include TRƯỚC mọi script
  dùng nó): localStorage khoá `pcr:<key>` có hạn `settings.skin_result_retention_days` ngày (mặc định 7) + mirror
  sessionStorage. Trang kết quả có nút "Xoá kết quả trên thiết bị này". Không ghi thẳng `sessionStorage` cho các khoá
  `pc_skin_scan_result`, `pc_quiz_*`, `pc_crm_*` nữa.
- Hồ sơ CRM (quyết định 2026-10-10): trang kết quả tra GAS trước; chưa có hồ sơ mà còn kết quả trên máy ⇒ thanh
  `[data-profile-prompt]` mời lưu. **Khách vãng lai bắt buộc đăng nhập** mới tạo hồ sơ (`goLoginToSave` → `/account/login`
  → `customers/account.bwt` đọc `pc_login_return` đưa về trang kết quả và tự mở hộp đồng ý). Kết quả vẫn hiện ngay,
  không khoá sau bước lưu.
- Trang kết quả KHÔNG còn "bản minh hoạ": thiết bị không có kết quả ⇒ `[data-result-empty-view]` theo thiết kế
  `design/ket-qua-da/chua-co-ho-so.png` (thanh cảnh báo "chưa có hồ sơ" ở trên; khối giới thiệu + thẻ soi da/khảo sát ở
  dưới; chữ/ảnh từ `settings.skin_result_empty_*`), ẩn hồ sơ + mọi `[data-result-section]` + lưu ý kết quả. Đúng 1 h1:
  JS đổi h1 của khối hồ sơ thành h2 và tiêu đề khối giới thiệu thành h1.
- Trang khảo sát / soi da: `snippets/skin_profile_notice.bwt` (include SAU pc_result_store) — còn kết quả trên máy ⇒ thanh
  xanh "Bạn đã có hồ sơ chăm sóc da" (nguồn + ngày + đã lưu CRM) + nút về trang kết quả; chỉ tài khoản có hồ sơ (GAS) ⇒
  nhắc, không nút. Tự cập nhật qua sự kiện `pc:result-store` (PharmaResultStore.set/remove phát ra). `?tab=camera|quiz` chọn tab. GAS trả hồ sơ đầy đủ ⇒ dựng lại
  kết quả vào PharmaResultStore rồi tải lại 1 lần (cờ `pc_crm_hydrated`). `crm-intake.js` nạp `defer` ⇒ gọi
  `syncCustomerInfo` sau DOMContentLoaded (trước 2026-10-10 trang không tra GAS khi mở).
- Trang danh mục (2026-10-10, `design/danh-muc/danh-muc-san-pham.png`): banner `collection_hero` chứa h1 = tên danh mục →
  dải voucher riêng `collection_vouchers` (promo_coupon_N_*, ô màu theo `promo_coupon_N_type`: auto/amount/percent/freeship) →
  cột lọc (đầu "Bộ lọc sản phẩm / Xóa tất cả") | `collection_quick_filters` (menu `settings.collection_quick_filter_menu`) →
  "Sản phẩm (N)" + sắp xếp → thẻ `product_card_collection` (cả kết quả lọc AJAX `search.data`/`data_list`). Thẻ: nhãn = giảm %
  hoặc tag `nhan:<chữ>`; chip = tag `voucher:<mức>` / `freeship`; sao CHỈ từ `metafields.bpr` thật. Thẻ cũ
  `product_grid_office` vẫn dùng ở trang chủ/PDP/khối khác.
- Khối "Định hướng phác đồ tham khảo" (2026-10-10, `design/ket-qua-da/dinh-huong-phac-do.png`): 5 thẻ chỉ số (soi da) →
  `[data-plan-stages]` 3 giai đoạn, mỗi giai đoạn dải SP thật của danh mục giai đoạn (thẻ có tim = cookie
  `sudes_wishlist_products` của theme, nút "Thêm vào phác đồ" = POST `/cart/add.js` khi SP 1 phiên bản còn hàng, ngược lại
  "Xem chi tiết") + cột phải radar / gợi ý chuyên gia / lưu ý → 3 thẻ giai đoạn. Có dải giai đoạn ⇒ ẩn khối "Sản phẩm đề
  xuất" riêng; khảo sát theo Case giữ routine sáng/tối + khối "Sản phẩm đề xuất". Chữ: `settings.skin_plan_*`; màu giai
  đoạn 02/03: token `--pc-stage-2-*`/`--pc-stage-3-*`.
- "Sản phẩm đề xuất" lấy từ SP của danh mục tự động (`PharmaResultCollections[*].products`, tối đa 8/danh mục, đã bỏ
  kê toa): ưu tiên danh mục của badge + giai đoạn 3, giai đoạn 1–2 chỉ bù chỗ trống; không có thì quay về dò tag cũ.
- GAS CRM ≥ 1.3.0: `get_customer_info` chỉ trả **đủ hồ sơ** khi khớp `submission_id`/`session_id` (mã ngẫu nhiên trên
  thiết bị); khớp customer_id/SĐT/email chỉ trả `found + limited` (không dữ liệu) — endpoint công khai, không được
  trả hồ sơ theo SĐT/email.
  - B2B (`b2b_tier_1..6_*`) và Loyalty (`loyalty_tier_1..6_*`): 6 ô, mặc định TẮT/TRỐNG — không điền
    sẵn % chiết khấu/ngưỡng điểm (cam kết kinh doanh); danh sách quyền lợi phân tách bằng `;`.
  - Handle bài viết lấy bằng `article.url | split: '/' | last`. Preview mô phỏng 2 blog trên trong
    `data/articles.js` (chuyển từ `data/doctors.js`, `data/ingredients.js`).
- Bộ lọc nhanh collection/search (`col.js.bwt` `doSearch()`): AJAX qua `filter.buildSearchUrl()`
  (Bizweb.SearchFilter thật) đã có URL restore/back-forward/active-chip-bar từ trước — không phải
  "bộ lọc giả chỉ ẩn card" như khảo sát cũ. Thêm 20/09/2026 (F03): token tăng dần chống request
  chồng ghi đè kết quả mới bằng kết quả cũ (gõ nhanh/bấm nhiều filter liên tiếp), và banner lỗi +
  nút "Thử lại" (`.afw-error`) khi AJAX fail — trước đây fail chỉ gỡ lặng `is-loading`, không báo gì.
- Ô danh mục con trên trang collection cha (F01/F02, `snippets/collection_subnav.bwt`, include trong
  `templates/collection.bwt` ngay sau H1): tối đa 3 quy tắc cấu hình `collection_subnav_{1,2,3}_
  collection` (type `collection`) + `_menu` (type `link_list`) + `_title`. Khớp `collection.alias`
  đúng 1 quy tắc mới render; để trống ⇒ không hiển thị gì (mặc định). Tên/ảnh/số sản phẩm mỗi ô lấy
  từ `link.object.{image.src, all_products_count}` — cùng cơ chế đã dùng ở `menu-col-cate.bwt`/
  `section_ingredients.bwt`, phần này KHÔNG resolve được trong dev-server local (mock không gán
  `link.object`) nên chỉ kiểm chứng được tiêu đề/href qua preview, phần ảnh/số sản phẩm phải xác minh
  trên Sapo thật. Việc còn lại của merchant: tạo Linklist trong Sapo Admin trỏ tới các collection con
  thật (ví dụ nhóm tinh chất/serum: da dầu/mụn, thâm, khô, nhạy cảm, lão hoá) rồi điền 3 field trên.
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
- **Logo gốc của dự án = `assets/PharmaCosmetics.svg`** (chốt 2026-10-08): header, drawer mobile và footer
  đều dùng file này khi tắt cờ `header_logo_use_image`/`footer_logo_use_image` (mặc định tắt). Footer nền
  xanh đổi logo sang trắng bằng `.pc-logo-root--inverse` (CSS filter). `snippets/logo-master-svg.bwt` không còn
  là logo mặc định.
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

## Trang sản phẩm (PDP V3) — quy ước nhập liệu & phân luồng (chốt 2026-10-05)

Căn cứ: PRD "YÊU CẦU IT WEB: TINH GIẢN TRANG SẢN PHẨM" (Google Doc của khách).
- **Sản phẩm kê toa = sản phẩm thuộc DANH MỤC Sapo chọn ở `settings.product_rx_collection`** (người dùng chốt
  2026-10-07, thay tag `loai:ke-toa` cũ; so khớp handle `collection.url | remove: '/'` — `snippets/pc_is_rx.bwt`).
  Phía JS (quickview, skin quiz) đọc `window.pcRxAliases` in ở `layouts/theme.bwt` từ cùng danh mục (Sapo trả
  tối đa 50 sản phẩm/danh mục). KHÔNG suy đoán theo `product.type`/tên/tag. Kê toa ⇒ không render form
  `/cart/add`, giá, số lượng, Mua ngay/Thêm giỏ/Shopee, đánh giá (sao + tab Đánh giá), khuyến mãi,
  coupon, combo, "cùng tầm giá", "sản phẩm đã xem"; JSON-LD bỏ `offers`/`aggregateRating`, bỏ
  `og:price`; thẻ danh mục (`product_grid_office*`) thay giá bằng `product_rx_card_label`, ẩn Xem
  nhanh/Thêm giỏ; quickview tự chuyển sang trang chi tiết. Hiện khối `snippets/pdp_rx_consult.bwt`
  (câu chữ `product_rx_*`, Zalo = `settings.contact_zalo`): khung cảnh báo + 3 bước `product_rx_step_*`,
  nút tư vấn, dòng hotline `product_rx_hotline_label`; khối niềm tin dùng `product_rx_trust_*`; kicker có nhãn
  `product_rx_badge_label`. **Mô tả ngắn của sản phẩm kê toa**: đoạn văn trước danh sách = lời dẫn dưới tên;
  mỗi gạch đầu dòng `Tiêu đề | dòng phụ` = 1 ô thông tin (tối đa 3).
- Trong `templates/product.bwt` và các snippet trang đọc cờ **`pc_pdp_rx`** (chốt ngay đầu trang), không
  đọc `pc_is_rx`: vòng lặp thẻ sản phẩm bên dưới gán lại `pc_is_rx` theo từng thẻ. So sánh dùng
  `!= true` (biến chưa gán = nil, `nil == false` là false).
- Theme chỉ ẩn được luồng mua trên giao diện; chặn `/cart/add` phía máy chủ phải cấu hình ở Sapo Admin.
- **Shopee Mall = tag `shopee_<url>`**, đọc bằng `remove_first: 'shopee_'` (KHÔNG `split: '_' | last` —
  cắt hỏng URL có "_"). Không có tag ⇒ ẩn nút. Tag `shopee_`/`loai:` không hiện trong danh sách tag.
- Sao đánh giá ở đầu trang chỉ in khi `bpr.rating > 0` VÀ `bpr.votes > 0`; tab Đánh giá giữ cho sản
  phẩm thường (form app review), ẩn 100% với kê toa.
- Đã bỏ khỏi PDP (PRD mục 2): chia sẻ mạng xã hội, "Thêm vào yêu thích", widget lượt xem/lượt mua
  `.abps-productdetail`. Field `product_sharing_enable` còn trong schema nhưng không còn dùng ở PDP.
- Khối "Đánh giá từ khách hàng" và "Câu hỏi thường gặp" ở PDP **chỉ hiện bài gắn tag
  `sanpham:<alias sản phẩm>`** (cùng quy ước khối Ý kiến chuyên gia); không có bài khớp ⇒ ẩn hẳn khối.
  Không bao giờ đổ cả blog chung vào mọi sản phẩm (đánh giá không gắn sản phẩm = không xác thực).
- **"Bài viết liên quan" ở PDP** (`snippets/product_related_articles.bwt`, blog `product_article_blog_handle`): tối đa 3
  bài, ưu tiên tag `sanpham:<alias>` → `danhmuc:<handle danh mục của SP>` / trùng tag `hoatchat:<x>` với SP. Không
  bài nào khớp ⇒ hiện bài mới nhất với tiêu đề `product_article_fallback_title` (không gọi là "liên quan");
  có khớp nhưng < 3 ⇒ thêm bài mới nhất cho đủ 3. Thẻ bài = `snippets/pc_article_card.bwt`: nhãn chủ đề từ tag
  `chude:<Nhãn hiển thị>` (không có ⇒ tag thường đầu tiên), byline chuyên gia từ tag `chuyengia:<handle>`.
- **Không lặp sản phẩm giữa 2 khối gợi ý PDP:** "Có thể bạn thích" ghi alias đã hiện vào `pc_pdp_seen`;
  "Sản phẩm liên quan" (danh mục đầu của SP) bỏ alias đã có + bỏ chính SP đang xem (vòng lặp dùng `unless`, không `continue`).
- **Thẻ "Giải pháp cho từng vấn đề" (trang chủ)** mở danh mục `home_solutions_N_collection`; ô trống ⇒ mặc định
  6 danh mục `giai-phap-*` đã tạo trên Sapo; danh mục không tồn tại/0 SP mới về `/search?query=`.
- **Bố cục đầu trang 2 cột 6:6** (`col-lg-6` ảnh | `col-lg-6` thông tin, PRD mục 3 — người dùng chốt
  2026-10-05). Đã bỏ cột 3 `.box_info_right` (thông tin cửa hàng); field `product_info_*`/`product_link_*` giữ
  trong schema nhưng không render.
- **Khối niềm tin sau CTA** (PRD mục 5): 3 cam kết `product_trust_{1..3}_title/_desc` + dòng
  `THƯƠNG HIỆU: product.vendor` (trống ⇒ tên cửa hàng) `| XUẤT XỨ:` từ **tag `xuatxu:<tên>`** (không có ⇒ ẩn
  phần xuất xứ; tag không hiện trong danh sách thẻ). Kê toa: chỉ dòng thương hiệu/xuất xứ, không cam kết giao
  hàng. Khối 4 icon `product_policy_*` cũ không còn render ở PDP.
- **Tab chi tiết tách theo `<h2>` trong `product.content`** (PRD mục 10, `snippets/tab_product.bwt`): mỗi `<h2>`
  = 1 tab (tên tab = chữ trong `<h2>`, in hoa bằng CSS, đúng thứ tự soạn). Chuẩn nhập liệu 6 tiêu đề: Thông tin
  sản phẩm · Thành phần · Công dụng · Phù hợp với ai · Hướng dẫn sử dụng · Lưu ý. Mục rỗng ⇒ không có tab; đoạn
  trước `<h2>` đầu ghép vào tab đầu; không có `<h2>` ⇒ 1 tab `product_tab1_title` như cũ. Tab Chính sách
  (`product_tab2_*`) và Đánh giá (`product_tab3_*`) vẫn đứng sau.
- Nhãn nút Shopee: `product_shopee_label` (mặc định "ĐẶT HÀNG TẠI SHOPEE MALL"). Dòng phụ dưới "MUA NGAY"
  nằm sẵn trong `product_buynow_title` (span thứ 2).
- **Kicker trên tên sản phẩm** (PRD mục 3): `product.type` · tối đa 2 tag `hoatchat:<handle>` (bỏ gạch nối,
  in hoa bằng CSS). Không có cả hai ⇒ không in.
- **Kê toa — "Thông tin nhanh"** (PRD mục 8): mô tả ngắn `product.summary` (nên soạn gạch đầu dòng) hiện trong
  khung `.pc-rx-facts`, tiêu đề `product_rx_facts_title`. Trống ⇒ ẩn, không tự sinh nội dung.
- **Màu CTA** (PRD mục 4/14, tài liệu khách ưu tiên hơn audit T-134): MUA NGAY = `--pc-brand-primary`,
  THÊM GIỎ HÀNG = Deep Forest solid `--pc-brand-deep` (hover `--pc-brand-dark`).
- Không dùng `{% continue %}` trong Liquid (chưa kiểm chứng trên Sapo) — dùng `if` lồng.

## Trang danh mục (`templates/collection.bwt`, dựng theo thiết kế 2026-10-08)

- Thứ tự: breadcrumb → banner `snippets/collection_hero.bwt` (`collection_hero_*`: tiêu đề, mô tả, ảnh phải,
  4 cam kết; tiêu đề banner là `<p>`, H1 vẫn là tên danh mục) → hàng 2 cột.
- Cột trái: thẻ trắng chứa bộ lọc + câu trang trí `collection_sidebar_quote` (ẩn ở mobile).
- Cột phải: `.pc-col-top` = thẻ giới thiệu (đoạn đầu mô tả danh mục, rỗng thì `collection_intro_text`) + swiper Mã
  giảm giá (tối đa 3 thẻ/hàng, không in HSD trên thẻ) → thẻ `.pc-col-main`: H1 có lá → `collection_subnav` →
  `collection-sortby` (số SP | ô chọn sắp xếp + nút lưới/danh sách; hàng pill) → lưới SP.
- Thẻ SP ở danh mục/kết quả lọc bật `pc_card_rating` ⇒ sao chỉ hiện khi `product.metafields.bpr.votes > 0`.
- Chế độ danh sách: `html[data-pc-view]` + localStorage `pc_collection_view`, chỉ từ 768px; mobile luôn lưới.
- CSS ở cuối `assets/page_collection.scss.bwt` (khối "2026-10-08 — Trang danh mục theo thiết kế").

## Trang Trước & Sau (`templates/page.clinical-proof.bwt`, dựng lại theo thiết kế 2026-10-07)

- Câu chữ/link/ảnh hero: field `clinical_*` (Theme Settings → "Trang Trước & Sau"); header/footer dùng layout chung.
- Ca khách hàng = bài trong blog `clinical_case_blog_handle`, tag khoá:giá trị: `anhtruoc:`/`anhsau:` (bắt buộc
  đủ 2 ảnh, thiếu ⇒ không hiện ca), `nhom:` (gom nhóm có điều hướng ‹ • ›; thiếu ⇒ `clinical_group_other`),
  `tuoi:`, `tinh:`, `tuan:`, `phacdo:` (thiếu ⇒ ẩn phần đó). Ảnh hero trống ⇒ dùng cặp ảnh ca đầu tiên.
  Chỉ đăng ca thật khách đã đồng ý; theme không tự sinh ca/số liệu. Ảnh trong `data/articles.js` chỉ là khung
  placeholder để preview.

## AI Skin Quiz — phân tầng Tier/Case & cờ an toàn (chốt 2026-10-05)

- Engine thuần **`assets/skin-quiz-engine.js.bwt`** (`window.PharmaSkinQuizEngine`, `require` được trong Node) là
  nguồn logic duy nhất cho trang quiz, trang kết quả và `tests/test_skin_quiz_clinical_matrix.js`
  (`npm run test:quiz`). Không chép lại luật vào template.
- `snippets/quiz_questions_data.bwt`: 18 câu; câu id 18 (role `red_flag`) đứng đầu — chọn dấu hiệu cấp tính ⇒
  **Tier 1**, dừng quiz, chỉ hiện cảnh báo + Zalo. `"scoring": false` (Q10 thói quen, Q15/Q16 cờ an toàn,
  Q17 kênh liên hệ, Q18) không cộng điểm loại da. Đáp án dùng cho luật có `code`. Giữ id cũ (CRM so sánh).
- Thứ tự luật Case: Q9 mụn viêm → C1 (Tier 2) · Q3 sắc tố rõ / Q8 nám mảng → C2 · Q9 mụn ẩn → C5 · Q8 PIH →
  C6 · Q2 rất nhạy cảm / Q15 dị ứng nặng → C4 · top aging → C3 · top dry → C7 · còn lại → C8 (Tier 5).
- **Mã `CASE_X` trong code KHÔNG trùng số thứ tự hàng ở Sheet Ma trận lâm sàng** — luôn đối soát theo tên
  chẩn đoán: C1 Mụn viêm (T2) · C2 Nám mảng/Melasma (T3) · C3 Lão hoá (T4) · C4 Nhạy cảm (T4) · C5 Mụn ẩn (T3) ·
  C6 Thâm sau mụn PIH (T3) · C7 Da khô/sừng hoá (T4) · C8 Da thường khoẻ mạnh (T5). "Case 8 Thai kỳ/cấp tính" của
  Sheet **không có Case riêng** trong code: cấp tính = Tier 1 (Q18), thai kỳ/dị ứng nặng = cờ an toàn trực giao.
- Cờ an toàn: Q16 mang thai/cho con bú/sắp mang thai và Q15 dị ứng nặng ⇒ loại Retinoid/BHA/AHA/Cysteamine
  khỏi routine (bước hiện "cần chuyên gia chỉ định riêng", không tự thay sản phẩm khác), nhãn gợi ý và lưới sản
  phẩm. Ca cần chuyên gia (Tier 1/2, cờ an toàn) → nút Zalo `settings.contact_zalo` (người dùng chốt: chuyên gia
  tiếp nhận qua Zalo, không duyệt nội dung trước).
- `snippets/quiz_results_data.bwt` → khoá `cases`: mỗi bước chỉ có `step`/`keywords`/`actives`, **không ghi
  tên/giá/SKU sản phẩm**. Sản phẩm lấy THẬT từ Sapo qua AJAX `/search?type=product&view=quizjson&query=`
  (`templates/search.quizjson.bwt`, đã bỏ sản phẩm kê toa — `pc_is_rx`). Snippet này được nhúng làm biểu thức JS
  (`var x = {% include %}`) — không bọc `<script>`.
- Câu chữ cảnh báo: `snippets/quiz_safety_copy.bwt` + field `quiz_*` (Theme Settings, nhóm AI Skin).

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

## Font UI chung (19/09/2026)

- Font chữ UI chuẩn của storefront, SHB, tài khoản, AI chat và MOPS là **Montserrat**; các alias `--pc-font-*`, `--font-*`, `--f-*`, `--sh-*`, `--chat-font-*` phải trỏ về stack Montserrat/system.
- Nguồn chữ nội dung chỉ tải một request Montserrat với các weight đang dùng; không khôi phục Inter, Fraunces, Playfair Display, IBM Plex Mono, Roboto hoặc font UI khác.
- Font icon (Font Awesome, Material Symbols, swiper-icons), logo vector và vùng mã/JSON monospace là ngoại lệ có chủ đích; không dùng selector toàn cục ép font làm hỏng glyph.
