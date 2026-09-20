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
  tích hợp loyalty thật (`appbulk-loyalty-widgets.bwt`, `page.loyalty.bwt`, `data/loyalty-tiers.js`)
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
- **Chưa dọn (audit G02, cần người dùng quyết định):** 10 option "chết" trong dropdown
  `home_section_1..18` của `settings_schema.json` (`section_why_us`, `section_feedback`,
  `section_collection_bestseller`, `section_collection_cta`, `section_stats`,
  `section_expert_team`, `section_clinical_banner`, `section_trust_strip`, `section_protocol`,
  `section_zalo_consult`) — snippet vẫn tồn tại nhưng KHÔNG có trong `valid_sections` của
  `home_portal.bwt` nên chọn xong không hiện gì; `settings_data.json` preset mặc định còn trỏ 1 giá
  trị chết (`home_section_9: section_expert_team`). Không tự xoá/thêm — theo nguyên tắc không tự ý
  đổi settings_schema/settings_data khi chưa được hỏi.
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

## Font UI chung (19/09/2026)

- Font chữ UI chuẩn của storefront, SHB, tài khoản, AI chat và MOPS là **Montserrat**; các alias `--pc-font-*`, `--font-*`, `--f-*`, `--sh-*`, `--chat-font-*` phải trỏ về stack Montserrat/system.
- Nguồn chữ nội dung chỉ tải một request Montserrat với các weight đang dùng; không khôi phục Inter, Fraunces, Playfair Display, IBM Plex Mono, Roboto hoặc font UI khác.
- Font icon (Font Awesome, Material Symbols, swiper-icons), logo vector và vùng mã/JSON monospace là ngoại lệ có chủ đích; không dùng selector toàn cục ép font làm hỏng glyph.
