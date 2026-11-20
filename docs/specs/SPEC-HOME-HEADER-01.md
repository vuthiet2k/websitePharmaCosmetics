# SPEC-HOME-HEADER-01 — Header trang chủ: một cơ chế dính duy nhất + gỡ dải xanh 5px (hồi quy ec87393)

- Ngày: 20/11/2026 · Nhánh: `hugo_dev` (HEAD `ec87393`) · BA: ba-lead · Trạng thái: **ACCEPTED** 20/11/2026 (T1 đạt, chưa commit; xem mục 9)
- Căn cứ rule (chỉ trích mã): UI-0 (UI-0.2 không class tự đặt mới, UI-0.3 không `@media` mới), UI-2.9, UI-BRAND, `docs/UI-STANDARD.md` R1–R10, `.clinerules/01` self-check, `feedback_no_unilateral_schema_changes` (không đụng settings).
- Ngoài phạm vi: mọi thay đổi chưa commit của SPEC-TEAM-TRIAL-01 (`snippets/page_about.bwt`, `snippets/ui_trust_badges.bwt`, `docs/data/`, `scripts/data-profile-products.mjs`, `assets/pc-ui.css` phần do TRIAL sinh). Không commit lẫn.

## 1. Bối cảnh & khảo sát hiện trạng (BA đã đọc code + đo lại, không dựa mù số liệu phiên chính)

**File thật đang render/điều khiển header:**

| Thành phần | Vị trí | Vai trò |
|---|---|---|
| Markup | `snippets/header.bwt:17-18` | `<header class="header[ header-transparent nếu trang chủ]">` › `.card.pb-0` › `.card-header` (topbar) + `.card-body` (1 hàng: logo + `.header-menu` + actions) |
| JS cuộn | `snippets/header.bwt:373-430` | `handleScroll`: `is-scrolled` khi `scrollY>20`; `header-transparent` (chỉ trang chủ); `hSticky` khi `≥992px && scrollY>offsetStickyHeader` — **không loại trừ trang chủ** (dòng 411) |
| JS cuộn trùng | `snippets/footer_script.bwt:15-22` | Toggle `is-scrolled` thêm lần nữa với ngưỡng **>10** (khác ngưỡng 20 của header.bwt) ⇒ ở scrollY 11–20 hai listener giành nhau (trang chủ: `is-scrolled` + `header-transparent` cùng lúc) |
| CSS header trang chủ | `ui-src/css/components.css:14637-14655` | `body.pc-home-v3 header.header{position:absolute}`; `.is-scrolled{position:fixed!important;…;animation:pc-header-slide-down .25s}` (không giới hạn viewport) |
| CSS thu topbar | `components.css:14692-14728` | `is-scrolled` ⇒ `.card-header{max-height:0…}` (transition .3s, rule gốc dòng 366) |
| CSS thanh dính trang thường | `components.css:16791` (khối global_core minify) | `@media(min-width:992px){header.header.hSticky .header-menu{position:fixed;top:0;…;animation:fadeInDown .4s}}` |
| CSS thanh dính (bổ sung) | `components.css:14462, 14497-14511, 14902-14903`; `snippets/pharma_ui_kit.bwt:95,348-373` | z-index/nền, logo/giỏ gọn `.pc-sticky-*` (logo 32px — ý định thu gọn của ec87393), nav-row 64px |
| Dải 5px | `components.css:16791` | `header.header :is(.card,.main-header){padding:0 0 5px 0;background-color:var(--bgHeader);position:sticky;top:0;z-index:100}` |
| Nền xanh `.card` | `components.css:14358` | ec87393 gộp `.pc-site-v3 header.header :is(.card, .main-header){background:var(--bgHeader, var(--mainColor))!important}` (trước đó chỉ `.main-header`, `.card` trắng + `padding:0!important`) |

**Hồi quy do ec87393** (`git show ec87393 -- ui-src/css/components.css snippets/header.bwt`): bỏ `padding:0!important` + `background:#FFFFFF!important` ở `header.header .card` (dòng 365), gộp `.card` vào rule nền xanh (dòng 14358), xoá khối cuối file "19/11/2026: Triệt tiêu hoàn toàn dải xanh thừa…" (của c3fecad), đổi markup `card pb-0 p-0 m-0 bg-white…` → `card pb-0`. Lưu ý: class Tailwind `pb-0` (0,1,0) **không thắng** được `header.header :is(.card,…)` (0,2,2) ⇒ fix 5c82ff2 bằng `pb-0` vốn không có hiệu lực. Ý định **cần giữ** của ec87393: logo thanh dính 32px/max 160px (dòng 14503, 14903), nút "Danh mục" 36px (dòng 14461).

**Đo lại 20/11/2026** (Chrome thật, dev-server `localhost:3000`, chờ 700ms sau mỗi lần cuộn — trạng thái đã ổn định):

| Trang · viewport | scrollY | class header | header pos/top/cao | `.header-menu` pos/top/cao | `.card` pb / nền |
|---|---|---|---|---|---|
| `/` · 1440 | 0 | `header-transparent` | absolute/0/110 | static/47.3/45.5 | 5px / trong suốt |
| `/` · 1440 | 20–100 | `is-scrolled` | **fixed**/0/74 | static/11.3/45.5 | 5px / trắng |
| `/` · 1440 | 120–1200 | `is-scrolled hSticky` | **fixed**/0/74 | **fixed**/0/**64** | 5px / trắng |
| `/collections/all` · 1440 | 0 | — | static/0/110 | static/47.3/45.5 | **5px / rgb(60,179,113)** |
| `/collections/all` · 1440 | ≥120 | `is-scrolled hSticky` | static/−y/110 | fixed/0/64 | 5px / trắng |
| `/` · 1024 | như 1440 (fixed 74 + menu fixed 64 từ y=120) | | | | |
| `/` · 390 | 0 → 20 → ≥100 | `header-transparent` → `is-scrolled` → `+mb-compact` | fixed/0/93 → 57 → 63 | ẩn (cao 0) | 0px |

Kết luận: (1) Trang chủ ≥992px có **2 lớp fixed chồng nhau** (header fixed 74px + menu fixed 64px) ⇒ dải 10px của `.header-row`/`.card` lộ dưới thanh menu, logo nhảy 44px → 32px ở mốc ~110 (nhịp thứ 2, kèm animation `fadeInDown` lần 2). Số liệu −9/−20 của phiên chính là trạng thái **giữa animation/transition** — đúng là nhảy nhiều nhịp. (2) Trang thường: dải xanh 5px dưới header lúc chưa cuộn — xác nhận. (3) 390px không có `hSticky` (JS chặn bằng `desktopHeader`), header không có dải; chỉ chịu ảnh hưởng listener trùng ở `footer_script`.

## 2. Phương án (BA chốt mặc định, FE làm ngay)

1. **Trang chủ chỉ dùng một cơ chế dính = header fixed (`is-scrolled`)**. JS `header.bwt` dòng 411 thêm điều kiện `!isHomeWithHero` ⇒ trang chủ không bao giờ có `hSticky`. Trang thường giữ nguyên `hSticky` (header static + menu fixed 64px).
2. **Giữ ý định thu gọn khi cuộn trên trang chủ ≥992px**: khi `is-scrolled`, logo chính `.header-logo .pc-logo-master-img` cao 32px/max 160px (bằng logo thanh dính trang thường) — làm bằng cách **mở rộng danh sách selector của rule có sẵn** `.pc-site-v3 header.header.hSticky .pc-sticky-logo img{height:32px;max-width:160px}` (dòng 14903, đã nằm trong `@media (min-width:992px)` có sẵn). Nút "Danh mục" 36px giữ nguyên (đã áp mọi trạng thái).
3. **Một nguồn bật `is-scrolled`**: gỡ listener trùng ở `snippets/footer_script.bwt:15-22` (header.bwt luôn có trong `layouts/theme.bwt`; 0 nơi khác đọc `is-scrolled`/`hSticky` ngoài header.bwt, pharma_ui_kit.bwt, components.css — BA đã grep `assets/*.js`, `snippets/`, `templates/`).
4. **Gỡ hồi quy 5px/nền xanh** bằng sửa rule cũ: (a) dòng 365 `header.header .card{…}` khôi phục `background:#FFFFFF!important;padding:0!important`; (b) dòng 14358 tách lại `.pc-site-v3 header.header .main-header{background:var(--bgHeader, var(--mainColor))!important}` + `.pc-site-v3 header.header .card{background:#FFFFFF!important;padding:0!important}`. **Không** dựng lại khối "19/11/2026" cuối file (trùng lặp). Rule trong suốt trang chủ `body.pc-home-v3 …header-transparent:not(.is-scrolled) .card{background:transparent!important}` có độ ưu tiên cao hơn ⇒ vẫn thắng (đo lại AC-02.1).

Ràng buộc CSS (UI-0): chỉ **sửa/gỡ/mở rộng selector** rule đã có trong `ui-src/css/components.css`; **không** thêm tên class mới, **không** `@media`/`@keyframes` mới, không `style=""`/`<style>`, cỡ chữ (nếu chạm) dùng `var(--fs-*)`. Không sửa khối minify dòng 16791 (ghi đè bằng rule có sẵn ở trên là đủ). `assets/pc-ui.css` chỉ sinh bằng `npm run build:pc`. Không đụng `configs/*`.

## 3. Yêu cầu & tiêu chí nghiệm thu

Cách đo chung: Chrome thật (Playwright `channel:'chrome'` — browser cache ổ D: đã mất), dev-server `npm run preview` (`localhost:3000`). "Ổn định" = chờ ≥ 600ms sau `scrollTo`. `H` = `header.header`, `M` = `H.querySelector('.header-menu')`.

### REQ-01 (explicit) — Trang chủ ≥992px: một lớp dính, không dải lộ, không nhảy nhiều nhịp

| AC | Nội dung đo kiểm | Nguồn |
|---|---|---|
| AC-01.1 | `/` 1440×900 và 1024×768, mọi mốc scrollY ∈ {0,20,60,100,120,160,400,1200}: `H.classList.contains('hSticky') === false` và `getComputedStyle(M).position !== 'fixed'` | explicit (một cơ chế) |
| AC-01.2 | scrollY=0: H `absolute`, top 0, `header-transparent` có, `is-scrolled` không; cao 105±1 (110 − 5px đệm đã gỡ) | inferred |
| AC-01.3 | scrollY ∈ {20,60,100,120,160,400,1200} (ổn định): H `fixed`, `top`=0, **cùng một chiều cao `Hs`** ở mọi mốc (chênh ≤ 0.5px) với `Hs ∈ [56,70]`; `M.getBoundingClientRect().top ≥ 0` và `M.bottom ≤ Hs` | explicit |
| AC-01.4 | 0 dải lộ: tại x ∈ {20, 720, 1420}, `document.elementFromPoint(x, Hs+1)` không nằm trong `H`; `getComputedStyle(H.querySelector('.card')).paddingBottom === '0px'` | explicit |
| AC-01.5 | Thu gọn giữ ý định ec87393: scrollY ≥ 20 (ổn định), `.header-logo .pc-logo-master-img` cao 32±1px; scrollY=0 giữ 44±1px (như hiện tại); nút `.sudes-cate-header .title.js-menu-toggle` cao 36±1px ở 1440 | explicit (giữ ý định) |
| AC-01.6 | Không nhảy nhiều nhịp: cuộn liên tục 0→1200 (bước 20px, mỗi bước 50ms) rồi 1200→0, ghi chuỗi class của H mỗi bước: `is-scrolled` đổi trạng thái đúng **1 lần** mỗi chiều, `hSticky` không bao giờ xuất hiện; lấy mẫu mỗi 50ms trong 600ms sau khi vượt mốc 20: `M.top` không bao giờ < −20 và **không có lần dịch chuyển thứ hai** sau khi đã ổn định (≥ 450ms sau mốc, `M.top` không đổi nữa) | explicit |
| AC-01.7 | Cuộn ngược về 0: khôi phục đúng trạng thái AC-01.2 (`header-transparent`, topbar hiện, logo 44px), không kẹt `is-scrolled` | inferred |
| AC-01.8 | Mega-menu "Danh mục" mở được khi đã cuộn (scrollY=400): bấm nút ⇒ `.sudes-list-cate` có `active`, panel nằm dưới H (top ≥ `Hs`−1), Esc đóng được | inferred (không hồi quy) |
| AC-01.9 | Sau `resize` 1440→1024→1440 ở scrollY=400 (chờ 300ms): vẫn thoả AC-01.1/01.3 | inferred |

### REQ-02 (explicit) — Trang thường không hồi quy, không dải xanh 5px

Trang kiểm: `/collections/all`, `/blogs/bi-quyet`, `/azelderm-20-krem-azelaic-aicd-30g-kem-tri-mun` (sản phẩm), `/pages/skin-health-beauty` (SHB: body không có `pc-home-v3` ⇒ đi luồng trang thường).

| AC | Nội dung đo kiểm | Nguồn |
|---|---|---|
| AC-02.1 | 1440, scrollY=0: `.card` `paddingBottom` = `0px`, nền `rgb(255, 255, 255)`; header cao 105±1; tại x ∈ {20,720,1420} điểm `y = H.bottom − 2` không có màu xanh `rgb(60,179,113)` (`elementFromPoint` + computed bg ≠ xanh) | explicit |
| AC-02.2 | 1440, scrollY ∈ {400,1200}: `hSticky` có, M `fixed`, top 0, cao 64±1, logo `.pc-sticky-logo img` 32±1px (giữ ý định ec87393); điểm (720, 65) không thuộc `.card`/`.header-row` | explicit |
| AC-02.3 | Các trang trên: cao trang (`document.documentElement.scrollHeight`) lệch ≤ 6px so với baseline trước sửa (chỉ được giảm đúng 5px đệm) | inferred |
| AC-02.4 | Trang chủ trong suốt lúc chưa cuộn vẫn đúng: `/` scrollY=0 nền `.card` = trong suốt (`rgba(0, 0, 0, 0)`) — rule màu không làm hỏng hero | inferred |
| AC-02.5 | Topbar xanh thương hiệu giữ nguyên: `.card-header` nền computed = `rgb(60, 179, 113)` trên `/collections/all` scrollY=0 | explicit (UI-BRAND) |

### REQ-03 (explicit) — Mobile 390px & tablet không hồi quy

| AC | Nội dung đo kiểm | Nguồn |
|---|---|---|
| AC-03.1 | `/` 390×844: các mốc scrollY {0,20,100,400} cho H fixed top 0, cao lần lượt 93/57/57/57 (±1; sửa 20/11 theo quyết định D2 mục 9.1); không `hSticky`; 0 tràn ngang (`scrollWidth ≤ innerWidth`) | explicit |
| AC-03.2 | `/` 390: scrollY 11–20 không còn trạng thái lai (`is-scrolled` chỉ bật khi scrollY ≥ 20 — sửa theo D1 mục 9.1) | inferred (gỡ listener trùng) |
| AC-03.3 | `/collections/all` 390: header (sticky mobile `pc-mh-sticky`) giữ hành vi hiện tại — cao và top ở scrollY {0,400} = baseline FE đo trước khi sửa (±1) | explicit |
| AC-03.4 | Drawer menu mobile mở/đóng được ở `/` scrollY=400 (`.header-menu.current` hiện, nút đóng hoạt động) | inferred |

### REQ-04 (inferred) — Cổng kỹ thuật

| AC | Nội dung | Nguồn |
|---|---|---|
| AC-04.1 | `git diff --name-only` của thẻ chỉ gồm: `snippets/header.bwt`, `snippets/footer_script.bwt`, `ui-src/css/components.css`, `assets/pc-ui.css` | explicit |
| AC-04.2 | Diff `components.css`: 0 tên class mới (so `grep -o '\.[a-zA-Z][a-zA-Z0-9_-]*'` dòng thêm ⊆ tập class đã có trước), 0 `@media`/`@keyframes` mới, 0 hex mới ngoài `#FFFFFF` khôi phục; mỗi chỗ sửa có comment tiếng Việt `20/11/2026 SPEC-HOME-HEADER-01: lý do` | explicit (UI-0) |
| AC-04.3 | `lint-guardrails --strict` exit 0, không chỉ số nào của `snippets/header.bwt`/`snippets/footer_script.bwt` tăng; `compliance-lint` exit 0; `lint:liquid-globals` exit 0; `lint:config` không tệ hơn baseline (2 trường cũ); `build:pc` exit 0; `test:portal` không tệ hơn baseline FE chạy trước khi sửa; `audit:ui` không phát sinh lỗi mới ở header | explicit |

## 4. File đụng tới

| File | Thay đổi dự kiến |
|---|---|
| `snippets/header.bwt` | Dòng 411: `const sticky = desktopHeader.matches && !isHomeWithHero && currentY > offsetStickyHeader;` + comment. Không đổi markup |
| `snippets/footer_script.bwt` | Gỡ IIFE dòng 15–22 (toggle `is-scrolled` >10) + comment lý do (nguồn duy nhất ở header.bwt) |
| `ui-src/css/components.css` | Dòng 365 (khôi phục `background:#FFFFFF!important;padding:0!important`), dòng 14358 (tách `.main-header` / `.card`), dòng 14903 (mở rộng selector logo 32px cho `body.pc-home-v3 header.header.is-scrolled .header-logo .pc-logo-master-img`). Nếu sau đó `Hs` vẫn > 70 thì chỉnh đệm hàng bằng rule có sẵn trong khối `@media (min-width:992px)` dòng ~14890–14904 |
| `assets/pc-ui.css` | Chỉ sinh lại bằng `npm run build:pc` |

Không có diff schema/settings. Không cần data-engineer.

## 5. Rủi ro

- R1: `assets/pc-ui.css` đang có thay đổi chưa commit của SPEC-TEAM-TRIAL-01 ⇒ `build:pc` sinh lại sẽ chứa cả hai. Commit phải tách: commit TRIAL trước (do phiên chính quyết) hoặc ghi rõ trong commit message. FE **không** `git checkout` file này.
- R2: Đổi logo 44→32px tại mốc 20 trùng lúc topbar thu (transition .3s) + slide-down .25s ⇒ vẫn là **một** nhịp chuyển trạng thái; nếu chủ dự án muốn mượt hơn có thể thêm `transition:height` vào rule logo có sẵn (không bắt buộc).
- R3: Cascade khối minify dòng 16791 (sau trong file) — các rule sửa phải có `!important` hoặc độ ưu tiên cao hơn `header.header :is(.card,.main-header)` (0,2,2); đo computed, không suy đoán.
- R4: `offsetStickyHeader` trang thường giảm 5px (110→105) ⇒ `hSticky` bật sớm hơn 5px — chấp nhận.
- R5: 390px hiện cao 57 → 63 khi `mb-compact` (thu gọn mà lại cao hơn) — ghi nhận, **ngoài phạm vi**, không sửa trong thẻ này.

## 6. Thẻ việc

### T1 — owner: **fe-core** · Header trang chủ một cơ chế dính + gỡ dải 5px
- File được ghi (duy nhất): `snippets/header.bwt`, `snippets/footer_script.bwt` (BA chỉ định, thuộc `footer*` của fe-core), `ui-src/css/components.css`, `assets/pc-ui.css` (chỉ qua `npm run build:pc`).
- Làm theo mục 2 (phương án) và mục 4. Trước khi sửa: đo baseline AC-02.3 (cao trang 4 URL), AC-03.3, chạy `npm run test:portal` + `npm run audit:ui` ghi kết quả nền.
- AC phải đạt: AC-01.1 → AC-04.3.
- Lệnh kiểm tra:
  ```bash
  node -e "JSON.parse(require('fs').readFileSync('configs/settings_schema.json','utf8'));JSON.parse(require('fs').readFileSync('configs/settings_data.json','utf8'))"
  node scripts/lint-guardrails.js --strict
  node scripts/compliance-lint.js
  npm run lint:liquid-globals
  npm run lint:config
  npm run build:pc
  npm run audit:ui
  npm run test:portal
  git status --porcelain   # chỉ 4 file trên + file TRIAL có sẵn
  ```
  + script đo Playwright (`channel:'chrome'`) theo các mốc AC-01/02/03 — nộp bảng số đo kèm báo cáo.
- Phụ thuộc: không. Song song: không có thẻ khác (một thẻ duy nhất, không chia file).
- Không commit; trả diff + bảng đo cho BA nghiệm thu.

## 7. open_questions (không chặn — FE làm theo mặc định đã chọn)

1. Trang chủ khi cuộn (≥992px): thu gọn logo 44→32px như thanh dính trang thường (**mặc định đã chọn**, giữ ý định ec87393), hay giữ logo 44px trên trang chủ?
2. ec87393 gộp `.card` vào rule nền `--bgHeader` (xanh) — có phải chủ dự án muốn header có viền/dải xanh dưới không? **Mặc định**: không (coi là hồi quy, khôi phục `.card` trắng, đệm 0 như c3fecad).
3. Hiệu ứng khi cuộn trên trang chủ: giữ slide-down .25s hiện có (**mặc định**) hay bỏ hẳn animation cho cảm giác "đứng yên"?

## 8. Trạng thái nền (baseline) — chạy 20/11/2026 trước khi giao việc

| Lệnh | Exit | Ghi chú |
|---|---|---|
| parse `settings_schema.json` + `settings_data.json` | 0 | |
| `node scripts/lint-guardrails.js --strict` | 0 | Tổng: hex 563, `style=""` tĩnh 249, SVG nhúng tay 177, `!important` 77 (không quét `ui-src/`, không tính `pc-ui.css`) |
| `node scripts/compliance-lint.js` | 0 | 247 file; vi phạm cứng 0; cảnh báo "Bác sĩ" 0 |
| `npm run lint:liquid-globals` | 0 | 229 file PASS |
| `npm run lint:config` | 1 | Có sẵn: 2 trường không được code đọc (`skinhealthy_services_groups_menu`, `skinhealthy_services_all_url`) — không thuộc việc này |
| `npm run build:pc`, `audit:ui`, `test:portal` | chưa chạy | Tránh sinh lại `pc-ui.css` khi đang có WIP TRIAL; FE chạy baseline đầu T1 |

## 9. Nghiệm thu

**Kết luận: ACCEPTED** (20/11/2026, BA tự đo lại trên Chrome thật, không dùng số liệu FE báo). Chưa commit — việc commit/tách TRIAL do phiên chính quyết (R1).

### 9.1 Quyết định 2 điểm lệch SPEC (BA chốt, không cần hỏi chủ dự án)

| # | Lệch | Quyết định | Lý do |
|---|---|---|---|
| D1 | Ngưỡng `is-scrolled` là `>= 20` thay vì `> 20` | **Chấp nhận `>= 20`**. Sửa AC-03.2 thành: "`is-scrolled` chỉ bật khi scrollY ≥ 20; scrollY 11–19 không có trạng thái lai" | Lỗi do SPEC tự mâu thuẫn (AC-01.3/AC-03.1 coi mốc 20 là trạng thái đã cuộn). Lệch 1px không ảnh hưởng cảm nhận; mục tiêu thật của AC-03.2 (gỡ trạng thái lai do 2 listener) đã đạt: đo y=11/15/19 chỉ có `header-transparent` |
| D2 | 390px `mb-compact` cao 57 thay vì 63 | **Chấp nhận 57**. Sửa kỳ vọng AC-03.1 thành 93/57/57/57; AC-03.3 tương ứng 93 → 57 | 63 chính là hệ quả của hồi quy ec87393 (đệm `.card` bị gỡ ⇒ đệm 6px của `mb-compact` lọt vào) — R5 đã ghi "thu gọn mà lại cao hơn" là bất thường. Khôi phục `padding:0!important` của `.card` (đúng phương án 2.4) đưa về trạng thái trước ec87393. Hệ quả: `mb-compact` hiện không làm đổi chiều cao — xem open_question 4 (không chặn) |

### 9.2 Bảng AC

Script đo: `ba-accept.cjs`, `ba-accept2.cjs` (scratchpad phiên, Playwright `channel:'chrome'`, gỡ `#modal-banner`, chờ 700ms/mốc), dev-server `node dev-server.js` (localhost:3000).

| AC | Kết quả | Số đo thực tế |
|---|---|---|
| AC-01.1 | PASS | `/` 1440 & 1024, 12 mốc (0…1200): không lần nào có `hSticky`; `.header-menu` luôn `static` |
| AC-01.2 | PASS | y=0: absolute/top 0/cao **105**, `header-transparent`, không `is-scrolled` |
| AC-01.3 | PASS | y∈{20…1200}: fixed/top 0/cao **69** ở mọi mốc (cả 1440 và 1024); M top 11.3 (1024: 13), bottom 56.8 (55) ≤ 69 |
| AC-01.4 | PASS | `elementFromPoint(x∈{20,720,1420}, 70)` không thuộc H; `.card` pb `0px` |
| AC-01.5 | PASS | logo 44 (y=0) → **32** (y≥20); nút Danh mục 36 |
| AC-01.6 | PASS | Cuộn 0→1200→0 bước 20px/50ms: `is-scrolled` đổi đúng 2 lần (1/chiều), `hSticky` không xuất hiện. Lấy mẫu sau mốc: M.top 22.3 → −2.6 (50ms, > −20) → 2.7 → 8.1 → 11.1 → 11.3 ổn định từ 200ms, không dịch lần 2 |
| AC-01.7 | PASS | Về y=0: `header-transparent`, cao 105, logo 44 |
| AC-01.8 | PASS | y=400 bấm Danh mục: `.sudes-list-cate.active`, panel top 68 ≥ Hs−1; Esc đóng |
| AC-01.9 | PASS | resize 1440→1024→1440 ở y=400: fixed/69, không `hSticky` |
| AC-02.1 | PASS | 4 trang 1440 y=0: `.card` pb 0, nền `rgb(255,255,255)`, cao 105, không xanh ở đáy header |
| AC-02.2 | PASS | 4 trang y∈{400,1200}: `hSticky`, M fixed/top 0/cao 64, logo dính 32; điểm (720,65) nằm ngoài `.card/.header-row` |
| AC-02.3 | PASS | So với mô phỏng đệm 5px cũ: collections/blog/sản phẩm giảm đúng **5px** (cả 1440 và 390); SHB 0px (header absolute) |
| AC-02.4 | PASS | `/` y=0 nền `.card` `rgba(0,0,0,0)` |
| AC-02.5 | PASS | Topbar `rgb(60,179,113)` trên cả 4 trang (UI-BRAND) |
| AC-03.1 | PASS (theo D2) | `/` 390: 93 / 57 / 57 / 57, fixed top 0, không `hSticky`, scrollWidth 390 = innerWidth |
| AC-03.2 | PASS (theo D1) | y=11/15/19: chỉ `header-transparent`; y=20: chỉ `is-scrolled` |
| AC-03.3 | PASS (theo D2) | `/collections/all` 390: sticky top 0, cao 93 (y=0) → 57 (y=364, cuối trang) |
| AC-03.4 | PASS | `/` 390 y=400: `#btn-menu-mobile` ⇒ `.header-menu.current` 390×844; `.close-mb-menu` ⇒ đóng |
| AC-04.1 | PASS | File của T1 đúng 4 file; các file còn lại trong `git status` là TRIAL/tài liệu đội có sẵn trước T1 (`AGENTS.md`, `docs/TEAMWORK-WORKFLOW.md`, `page_about.bwt`, `ui_trust_badges.bwt`, `ui-loop/checks/L03b11.mjs`, `.claude/`, `docs/data/`, `scripts/data-profile-products.mjs`, `todo_list/`) |
| AC-04.2 | PASS | Dòng thêm chỉ dùng class đã có (`pc-logo-master-img` có 6 lần ở HEAD); 0 `@media`/`@keyframes` mới; hex mới chỉ `#FFFFFF`; đủ comment `20/11/2026 SPEC-HOME-HEADER-01`. `assets/pc-ui.css` có đủ 3 rule mới (đã grep) |
| AC-04.3 | PASS (có ghi chú) | Xem 9.3 |

### 9.3 Cổng lệnh (BA chạy lại sau sửa)

| Lệnh | Exit | Ghi chú |
|---|---|---|
| parse 2 file JSON config | 0 | |
| `node scripts/lint-guardrails.js --strict` | 0 | Tổng 563/249/177/77 = baseline, không tăng |
| `node scripts/compliance-lint.js` | 0 | 247 file, cứng 0, "Bác sĩ" 0 |
| `npm run lint:liquid-globals` | 0 | 229 file PASS |
| `npm run lint:config` | 1 | = baseline (2 trường skinhealthy cũ) |
| `npm run build:pc` | không chạy lại | BA không có quyền ghi `assets/`; đã xác nhận `pc-ui.css` chứa đủ rule mới |
| `npm run test:portal` (config gốc) | 1 | **76 fail / 2 pass = baseline**. 75 fail do thiếu `chromium_headless_shell` (ổ D: mất), 1 fail `ENOENT product_grid_office_sale` — không liên quan header |
| `test:portal` với Chrome hệ thống (config tạm ở scratchpad, `use.channel:'chrome'`) | 1 | **44 fail / 34 pass** (24 phút; không có baseline Chrome trước sửa để so số). Rà log: 2 test liên quan header — `home-portal.spec.js:102` chờ `.pc-topbar-v3`, `:160` chờ `.pc-header-row` — đều fail vì 2 selector này có **0 lần** trong `snippets/header.bwt` cả ở HEAD lẫn sau sửa ⇒ không do T1. Các fail còn lại thuộc giỏ/soi da/collection/flash sale (`.concerns`, `.swiper_sale`, `#add-to-cart-form`…), không chạm header. Lưu ý: test này còn kỳ vọng trang chủ có `hSticky` khi y=900 — **trái với quyết định REQ-01** ⇒ cần cập nhật test (thẻ T2) |
| `npm run audit:ui` | không chạy | Thiếu browser bundle (giống FE); thay bằng đo Chrome thật ở 9.2 |

### 9.4 Ghi nhận ngoài phạm vi (không chặn)

- `/pages/skin-health-beauty` 390: header `absolute`, cuộn khỏi màn hình (không dính) — không do T1 gây ra (JS chỉ đổi nhánh `pc-home-v3`, CSS chỉ đổi nền/đệm/logo trang chủ); ghi để rà riêng nếu chủ dự án muốn header dính ở SHB mobile.

### 9.5 Thẻ việc tiếp theo

**T2 — owner: fe-core** · Cập nhật test header trang chủ theo REQ-01. File được ghi: `tests/portal/home-portal.spec.js` (BA chỉ định). Nội dung: thay selector cũ `.pc-header-row` (dòng 164) và `.pc-topbar-v3` (dòng 105) bằng phần tử header/topbar hiện có; ở trang chủ y=900 kỳ vọng `is-scrolled` + header `fixed` top 0, cao 69±1, **không** `hSticky`. Kiểm: chạy riêng test bằng Chrome hệ thống. Phụ thuộc: T1 commit. Không chạy song song với thẻ nào đụng file này.

## 10. open_questions (sau nghiệm thu, không chặn)

4. 390px: trạng thái `mb-compact` nay không đổi chiều cao (57 = trạng thái `is-scrolled`). Chủ dự án có muốn header mobile thu thêm khi cuộn sâu (vd 52px) không? Mặc định: giữ 57 (như trước ec87393).
