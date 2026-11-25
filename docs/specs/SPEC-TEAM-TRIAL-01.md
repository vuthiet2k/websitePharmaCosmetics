# SPEC-TEAM-TRIAL-01 — Chạy thử đội Claude Code (gỡ UI-0 nhỏ + docstring ui_* + hồ sơ dữ liệu sản phẩm)

- Ngày: 20/11/2026 · Nhánh: `hugo_dev` · BA: ba-lead · Trạng thái: **ACCEPTED** (nghiệm thu 20/11/2026, mục 9; T2-FIX đạt vòng 1)
- Căn cứ rule (chỉ trích mã, không chép lại): UI-0 (UI-0.2, UI-0.3, UI-0.4, UI-0.4b), UI-2.9, UI-BRAND, ANTI-FAB, RULE-P0-02/P0-06,
  `.claude/agents/*.md` (phạm vi ghi), `docs/TEAMWORK-WORKFLOW.md` chương 0.

## 1. Bối cảnh

Chủ dự án yêu cầu chạy thử đội với 3 việc nhỏ, rủi ro thấp, xong trong 1 lượt, dựa trên `todo_list/vi-pham-css-tailwind.md`.

**Đối soát hiện trạng (20/11/2026) — báo cáo todo_list đã CŨ một phần:**

| Mục trong báo cáo | Thực tế |
|---|---|
| `snippets/section_collection_cta.bwt` có `<style>` | Đã viết lại 100% Tailwind (M-25, 17/11/2026). Chuỗi `<style` còn lại chỉ nằm trong comment ⇒ **không còn việc** |
| `templates/list_collections.bwt` có `<style>` | 0 `<style>`, 0 `style="` ⇒ **không còn việc** |
| `snippets/page_about.bwt`: 1 `<style>` + 1 `style=""` | **Đúng** — khối `<style>` dòng 309–328 (18 dòng CSS: `.about-rail`, `.about-panel`, `.dot`, `@media` tự viết, 6 hex) + `style="max-height:560px"` dòng 109 |
| `<style>` lớn còn lại (`collection.skinhealthy` 206 dòng, `password` 186 dòng, `ajaxcart` 141 dòng, `header_style` ~275 dòng) | Quá lớn cho 1 lượt chạy thử ⇒ không chọn |
| `snippets/header.bwt:2` `style="background: {{settings.color_banner_top}}"` | Màu động từ settings ⇒ muốn chuyển phải thêm biến/màu Tailwind (đụng `tailwind.pc.config.js` KHOÁ + đổi nơi lấy màu) ⇒ **điểm dừng**, không chọn |

**Lựa chọn:**
- fe-feature: `snippets/page_about.bwt` (thuộc phạm vi mặc định `page_*`; 2 nơi include: `templates/page.about.bwt` → `/about-us`, `templates/page.about-us.bwt` → `/gioi-thieu`).
- fe-core: `snippets/ui_trust_badges.bwt` — docstring **thiếu mục "Tham số"** (tham số `cols` có từ commit `1efe96a` nhưng không được ghi), mô tả lỗi thời ("icon FontAwesome/ui_icon" — thực tế chỉ `ui_icon`; liệt kê 3 nơi dùng, thực tế 4 nơi gồm `templates/cart.bwt`), và class `pc-trust-badges` mồ côi (0 quy tắc CSS trong `assets/pc-ui.css`/`ui-src`, 0 móc JS/test — đã quét toàn repo) ⇒ vi phạm UI-0.2. Sau đó fe-core **review chéo** diff của fe-feature.
- data-engineer: hồ sơ chất lượng `data/products-data.json` (5 586 bản ghi, khoá rút gọn `i n a v t g s o m f z av` — đủ 12 khoá ở mọi bản ghi).

## 2. Yêu cầu & tiêu chí nghiệm thu

### REQ-01 (explicit) — Gỡ vi phạm UI-0 trong `snippets/page_about.bwt`, không đổi giao diện

| AC | Nội dung đo kiểm | Nguồn |
|---|---|---|
| AC-01.1 | `grep -c "<style" snippets/page_about.bwt` = 0 và `grep -c 'style="' snippets/page_about.bwt` = 0 | explicit |
| AC-01.2 | Không còn class tự đặt có CSS: `grep -nE "about-rail|about-panel|class=\"dot\"" snippets/page_about.bwt` = 0 kết quả trong thuộc tính `class` (id `aboutRail`, `about-story`… giữ nguyên làm móc JS/neo) | explicit (UI-0.2) |
| AC-01.3 | Không thêm `@media`, không thêm quy tắc vào `ui-src/css/*`/`assets/*.scss.bwt`; responsive bằng tiền tố Tailwind; **không dùng class `hidden` gốc** (ẩn mobile dùng `max-lg:hidden` hoặc tương đương — có tiền lệ `snippets/section_footer_brands.bwt`) | explicit (UI-0.3) |
| AC-01.4 | Màu chỉ qua token Tailwind (không hex): `#4B5B54`→`text-ink-secondary`, `#E8F5E9`→`bg-primary-tint`, `#267348`→`text-primary-deep`, `#3CB371`→`bg-primary`, `#EEF2F0`→`border-line-soft`; `#E2E8F0` (chấm chưa chọn) → `bg-slate-200` (slate có trong config cho nền trung tính) hoặc `bg-line`. Lệch sắc độ nhỏ do quy về token là chấp nhận theo UI-0.1 | inferred |
| AC-01.5 | Cỡ chữ link rail giữ `var(--fs-body)` (14px) — dùng `text-[length:var(--fs-body)]` hoặc `text-sm` (14px), computed font-size = 14px | inferred (UI-2.9) |
| AC-01.6 | Trạng thái chọn do JS gắn `is-active` vẫn hiển thị: dùng biến thể `[&.is-active]:…` trên `<a>` và `group` + `group-[.is-active]:bg-primary` cho chấm (tiền lệ `[&.is-active]:` ở `snippets/aside-filter.bwt`). JS (dòng 329–360) **không đổi logic**; nếu JS chọn phần tử bằng class bị gỡ thì đổi sang id/data-attr | inferred |
| AC-01.7 | **1440px** `/about-us` và `/gioi-thieu`: rail hiện (display flex, cột 220px), dính khi cuộn (`getBoundingClientRect().top` ≈ 96px ±2 sau cuộn 800px), link: padding 9/12px, gap 10px, bo 8px (±1px); khoảng đệm panel 44px trên/dưới, panel đầu `padding-top:0`, panel cuối không viền dưới + `padding-bottom:0`; ảnh câu chuyện `max-height` 560px. Cao trang lệch ≤ 2px so với trước khi sửa | explicit (không đổi giao diện) |
| AC-01.8 | **390px**: rail không hiển thị (offsetHeight 0), 0 tràn ngang (`scrollWidth <= innerWidth`), không rò `{{`/`{%`, 0 lỗi console | explicit |
| AC-01.9 | Cuộn ở 1440 đổi link active đúng panel; bấm link rail cuộn mượt tới panel (hành vi = trước) | inferred |
| AC-01.10 | Cổng: `node scripts/lint-guardrails.js --strict` exit 0 (chỉ số `page_about` giảm hoặc giữ, không tăng); `npm run lint:liquid-globals` exit 0; `node scripts/compliance-lint.js` exit 0 (0 vi phạm cứng, 0 cảnh báo mới); `npm run build:pc` exit 0 và class mới có trong `assets/pc-ui.css` | explicit |

Ngoài phạm vi (ghi nhận, KHÔNG sửa trong thẻ này): file còn nhiều class `emerald-*`/`gray-*` không có trong bảng màu `tailwind.pc.config.js` (khả năng không sinh CSS trong `pc-ui.css`) và `shadow-xl` (boxShadow chỉ có `none`) — xem rủi ro R3.

### REQ-02 (explicit, chọn bởi BA) — Docstring + dọn class mồ côi `snippets/ui_trust_badges.bwt`

| AC | Nội dung đo kiểm | Nguồn |
|---|---|---|
| AC-02.1 | Docstring đầu file có mục **"Tham số:"** ghi `cols` (chuỗi class lưới, mặc định `'grid-cols-2 lg:grid-cols-4'`) + lưu ý biến include lọt từ phạm vi cha (truyền rõ khi cần khác mặc định) | inferred (luật fe-core: docstring tham số) |
| AC-02.2 | Docstring liệt kê đủ 4 nơi include: `templates/cart.bwt` (cols `grid-cols-1 sm:grid-cols-2`), `templates/product.bwt`, `snippets/collection_hero.bwt`, `snippets/section_portal_split.bwt`; bỏ chữ "FontAwesome" (icon = `ui_icon`); ghi nguồn chữ `settings.collection_hero_usp_N_*` → fallback `settings.home_trust_N_*` → default | inferred |
| AC-02.3 | Gỡ class `pc-trust-badges` khỏi `<ul>` (0 CSS, 0 JS, 0 test tham chiếu — BA đã quét). Không đổi class Tailwind nào khác, không đổi markup/chữ/thứ tự ⇒ HTML render chỉ khác đúng 1 token class | inferred (UI-0.2) |
| AC-02.4 | Hiển thị 4 nơi include không đổi ở 1440/390 (khối cam kết: số cột, cỡ icon, chữ) — kiểm nhanh `/products/<alias bất kỳ>`, `/collections/all`, `/cart`, `/` | explicit |
| AC-02.5 | Cổng: `lint-guardrails --strict` exit 0, `lint:liquid-globals` exit 0, `build:pc` exit 0 **và `assets/pc-ui.css` không đổi do thẻ này** (class bị gỡ không có CSS) | explicit |

### REQ-03 (explicit) — Hồ sơ chất lượng `data/products-data.json` (chỉ đọc)

| AC | Nội dung đo kiểm | Nguồn |
|---|---|---|
| AC-03.1 | Script đọc-only `scripts/data-profile-products.mjs` chạy được bằng `node scripts/data-profile-products.mjs`, idempotent (chạy 2 lần ra cùng kết quả), **không ghi** vào `data/**` (kiểm `git status --porcelain data/` rỗng sau khi chạy) | explicit |
| AC-03.2 | Báo cáo `docs/data/products-data-quality.md` có bảng số liệu: tổng bản ghi; trùng `i` (id), trùng `a` (alias), trùng `n` (tên, so sánh sau trim + lowercase); trường thiếu/rỗng theo từng khoá (đặc biệt `n`, `a`, `v`, `t`, `s`, ảnh/giá nếu xác định được khoá); alias sai định dạng (ký tự ngoài `[a-z0-9-]`, `--`, đầu/cuối `-`) | explicit |
| AC-03.3 | Tag (`g`): số tag có dấu phẩy (Sapo tách tag theo dấu phẩy), khoảng trắng đầu/cuối, trùng khác hoa/thường trong cùng SP, tag kết thúc bằng dấu chấm, top 20 tag gần trùng | explicit |
| AC-03.4 | Vendor (`v`): danh sách biến thể viết khác nhau của cùng thương hiệu (gom theo khoá chuẩn hoá: bỏ dấu, lowercase, bỏ khoảng trắng/ký tự đặc biệt), kèm số SP mỗi biến thể; tương tự cho loại (`t`) | explicit |
| AC-03.5 | HTML mô tả (`s`): số SP có `style=` inline, `font-family`/`font-size` cứng, thẻ rỗng (`<p></p>`, `<p>&nbsp;</p>`) — chỉ đếm + ví dụ id | inferred |
| AC-03.6 | Mỗi loại lỗi có ≤ 10 ví dụ `i` cụ thể; ghi ý nghĩa các khoá rút gọn đã xác định được (không đoán — khoá chưa rõ ghi "chưa xác định") | explicit (ANTI-FAB) |
| AC-03.7 | Mục "Đề xuất chuẩn hoá" (quy tắc, không áp dụng) + "Cần chủ dự án quyết" (vd vendor nào là tên chuẩn). Không ghi đè dữ liệu gốc | explicit |
| AC-03.8 | Không có dữ liệu khách hàng; `node scripts/compliance-lint.js` exit 0; JSON gốc vẫn parse được | explicit |

## 3. File đụng tới

| File | Thẻ | Loại |
|---|---|---|
| `snippets/page_about.bwt` | T1 | sửa |
| `assets/pc-ui.css` | T1 (chỉ sinh qua `npm run build:pc`) | sinh lại |
| `snippets/ui_trust_badges.bwt` | T2 | sửa |
| `scripts/data-profile-products.mjs` | T3 | tạo mới |
| `docs/data/products-data-quality.md` | T3 | tạo mới |
| `docs/data/products-data-quality.json` (tuỳ chọn, số liệu máy đọc) | T3 | tạo mới |
| `docs/specs/SPEC-TEAM-TRIAL-01.md` | BA | nghiệm thu |

Diff schema dự kiến: **không có** (không đụng `configs/settings_schema.json` / `settings_data.json`).
`scripts/guardrails-baseline.json`: **không ai sửa** trong lượt này (chỉ số giảm vẫn PASS; hạ baseline là việc riêng của phiên chính sau nghiệm thu).

## 4. Dữ liệu cần DE chuẩn bị cho FE
Không có. Trang `/about-us` dùng `settings.about_*` sẵn có trong dev-server.

## 5. Rủi ro

| Mã | Rủi ro | Giảm thiểu |
|---|---|---|
| R1 | Comment T-147 cảnh báo `.hidden{display:none !important}` toàn cục phá `hidden lg:flex` | Không dùng class `hidden` gốc; dùng `max-lg:hidden` (tên class khác, không đụng `.hidden` toàn cục) — đo thật AC-01.7/01.8 |
| R2 | Thang spacing `rem` co theo cỡ chữ gốc 14px (UI-0.4b) ⇒ `top-24`, `gap-1`… ra số khác CSS cũ | Dùng giá trị tuỳ ý px khi cần khớp (`lg:top-[96px]`, `py-[44px]`, `rounded-[8px]`…), có tiền lệ `min-h-[44px]`, `lg:grid-cols-[220px_1fr]` |
| R3 | `page_about` còn nhiều class màu ngoài bảng màu (`emerald-*`, `gray-*`) và `shadow-xl` | Ngoài phạm vi T1; ghi vào việc tồn đọng, không lan sửa |
| R4 | T1 và T2 cùng chạy `build:pc` ⇒ cùng ghi `assets/pc-ui.css` | `assets/pc-ui.css` giao cho T1; T2 chạy build để kiểm nhưng phải xác nhận file không đổi (AC-02.5), nếu đổi ⇒ `git checkout -- assets/pc-ui.css` và báo BA |
| R5 | Script DE đọc file 6,6 MB | Đọc bằng Node, không đổ nội dung vào ngữ cảnh; báo cáo chỉ in số liệu + id ví dụ |

## 6. Thẻ việc

### T1 — owner: **fe-feature** · Gỡ `<style>` + `style=""` trong `snippets/page_about.bwt`
- **File được ghi:** `snippets/page_about.bwt`; `assets/pc-ui.css` (chỉ qua `npm run build:pc`).
- **AC:** AC-01.1 → AC-01.10.
- **Lệnh kiểm tra:**
  ```bash
  grep -c "<style" snippets/page_about.bwt; grep -c 'style="' snippets/page_about.bwt
  node scripts/lint-guardrails.js --strict
  node scripts/compliance-lint.js
  npm run lint:liquid-globals
  npm run build:pc
  npm run preview   # đo /about-us và /gioi-thieu ở 1440 và 390 (trước/sau), hoặc npm run audit:ui
  git status --porcelain
  ```
- **Phụ thuộc:** không. **Song song:** được (với T2, T3).
- Ghi chú: chụp số đo TRƯỚC khi sửa (rect rail, padding panel, cao trang) để so sau.

### T2 — owner: **fe-core** · Docstring + gỡ class mồ côi `snippets/ui_trust_badges.bwt`
- **File được ghi:** `snippets/ui_trust_badges.bwt` (duy nhất).
- **AC:** AC-02.1 → AC-02.5.
- **Lệnh kiểm tra:**
  ```bash
  grep -rn "include 'ui_trust_badges'" templates snippets layouts
  node scripts/lint-guardrails.js --strict
  npm run lint:liquid-globals
  npm run build:pc && git diff --stat -- assets/pc-ui.css   # phải rỗng do thẻ này
  git status --porcelain
  ```
- **Phụ thuộc:** không. **Song song:** được (với T1, T3).

### T4 — owner: **fe-core** · Review chéo diff T1
- **File được ghi:** không (chỉ đọc; nhận xét trả về trong báo cáo).
- **Nội dung review:** đối chiếu diff `snippets/page_about.bwt` với UI-0.2/0.3/0.4b, UI-2.9; class tồn tại trong `assets/pc-ui.css` sau build; không dùng `hidden` gốc; JS không vỡ; không lan sửa ngoài khối `<style>`/`style=""`.
- **Phụ thuộc:** T1 xong. **Song song:** chạy sau T1 và sau T2 (cùng owner).

### T3 — owner: **data-engineer** · Hồ sơ chất lượng `data/products-data.json`
- **File được ghi:** `scripts/data-profile-products.mjs`, `docs/data/products-data-quality.md`, `docs/data/products-data-quality.json` (tuỳ chọn). **Cấm ghi** `data/**`.
- **AC:** AC-03.1 → AC-03.8.
- **Lệnh kiểm tra:**
  ```bash
  node scripts/data-profile-products.mjs
  node scripts/data-profile-products.mjs   # lần 2: kết quả giống hệt
  git status --porcelain data/             # phải rỗng
  node -e "JSON.parse(require('fs').readFileSync('data/products-data.json','utf8'))"
  node scripts/compliance-lint.js
  git status --porcelain
  ```
- **Phụ thuộc:** không. **Song song:** được (không chung file với T1/T2).

### Thứ tự
`T1 ∥ T2 ∥ T3` → `T4` (review chéo) → BA nghiệm thu (mục 8).

## 7. open_questions (không chặn — BA đã chọn mặc định theo rule)
1. **Quy hex → token ở `page_about`** (AC-01.4): sắc độ có thể lệch nhẹ so với hex cũ. Mặc định: theo UI-0.1 (rule chủ dự án đã chốt 14/11/2026), chấp nhận lệch sắc độ, không thêm màu mới. Chủ dự án muốn giữ đúng hex ⇒ phải thêm ô màu (điểm dừng schema) — báo lại.
2. **Hạ `scripts/guardrails-baseline.json`** sau khi các chỉ số `page_about` giảm: để phiên chính quyết (không thuộc thẻ nào lượt này).
3. **Tồn đọng R3** (`emerald-*`, `gray-*`, `shadow-xl` ngoài bảng màu ở `page_about`) — có mở thẻ riêng không.
4. `todo_list/vi-pham-css-tailwind.md` đã cũ (ít nhất `section_collection_cta`, `list_collections` đã sạch) — có cập nhật/dọn todo_list không (ngoài quyền ghi của BA).

## 8. Trạng thái nền (baseline) — chạy 20/11/2026 trước khi giao việc

| Lệnh | Exit | Kết quả |
|---|---|---|
| `node scripts/lint-guardrails.js --strict` | 0 | Tổng: hex hardcode 569, `style=""` tĩnh 250, SVG nhúng tay 177, `!important` 79 — PASS, không vượt baseline. Mục `snippets/page_about.bwt` trong baseline: hex 6, important 2, inlineStyle 1 |
| `npm run lint:liquid-globals` | 0 | PASS — 229 file, không biến ngoài 38 object, mọi `settings.*` đã khai báo, `img_url` đúng size |
| `node scripts/compliance-lint.js` | 0 | 247 file; vi phạm cứng RULE-P0-06: 0; cảnh báo danh xưng RULE-P0-02: 0 |
| Build `pc-ui.css` ra thư mục tạm, so `cmp` với `assets/pc-ui.css` | — | ĐỒNG BỘ (mọi thay đổi `pc-ui.css` sau này đều do thẻ T1) |
| `git status --porcelain` | — | Có sẵn trước lượt: ` M AGENTS.md`, ` M docs/TEAMWORK-WORKFLOW.md`, `?? .claude/agents/`, `?? .claude/commands/team.md`, `?? todo_list/` (không thuộc thẻ nào) |

## 9. Nghiệm thu — 20/11/2026 (BA tự chạy, không dựa báo cáo agent)

**Kết luận: REJECTED (chỉ do T2/AC-02.2 — sửa 1 dòng docstring).** T1, T3, T4/T4b đạt. Sau khi T2-FIX xong, BA chỉ cần kiểm lại AC-02.2 + `lint:liquid-globals`, không cần chạy lại toàn bộ cổng.

### 9.1 Cổng kiểm tra

| Lệnh | Exit | Kết quả |
|---|---|---|
| Parse `configs/settings_schema.json` + `settings_data.json` | 0 | OK |
| `node scripts/lint-guardrails.js --strict` | 0 | hex 563 (trước 569), `style=""` 249 (250), SVG 177 (177), `!important` 77 (79) — PASS |
| `node scripts/compliance-lint.js` | 0 | 247 file; RULE-P0-06: 0; cảnh báo "Bác sĩ" RULE-P0-02: 0 (không có chỗ cần rà tay) |
| `npm run lint:liquid-globals` | 0 | PASS — 229 file |
| `npm run lint:config` | **1** | 2 trường không được code đọc: `skinhealthy_services_groups_menu`, `skinhealthy_services_all_url`. **Có sẵn từ HEAD** (`git grep` ở HEAD: 0 nơi đọc trong templates/snippets/layouts/assets; 2 trường có trong schema HEAD); không thẻ nào đụng ⇒ không tính vào lượt này, ghi tồn đọng |
| `npm run build:pc` | 0 | md5 `assets/pc-ui.css` trước/sau build = `19404ccecc7f9ad0682b98e02aee87c7` ⇒ không đổi thêm; diff so với HEAD chỉ do T1 |
| `node scripts/data-profile-products.mjs` ×2 | 0 / 0 | md5 `docs/data/products-data-quality.{md,json}` trước, sau lần 1, sau lần 2 trùng nhau; stdout 2 lần giống hệt ⇒ idempotent |
| `git status --porcelain data/` | — | rỗng |
| Parse `data/products-data.json` | 0 | OK |
| Dev-server (`PORT=3123 node dev-server.js`) + curl + Playwright (Edge hệ thống, vì Chromium của Playwright nằm ở ổ D: đã mất) | — | Xem 9.2; đã tắt server sau khi đo |

### 9.2 Bảng AC

| AC | Kết quả | Bằng chứng |
|---|---|---|
| AC-01.1 | PASS | `grep -c "<style"` = 0, `grep -c 'style="'` = 0 |
| AC-01.2 | PASS | 0 class `about-rail`/`about-panel`/`dot`; quét `templates snippets layouts assets ui-src ui-loop/checks scripts`: 0 tham chiếu còn sót |
| AC-01.3 | PASS | 0 `@media`; ẩn mobile bằng `max-lg:hidden` (không dùng `hidden` gốc); không thêm quy tắc vào `ui-src`/`*.scss.bwt` |
| AC-01.4 | PASS | Chỉ token: `text-ink-secondary`, `[&.is-active]:bg-primary-tint`/`text-primary-deep`, `group-[.is-active]:bg-primary`, `border-line-soft`, `bg-slate-200`. Đo: nền active `rgb(232,245,238)` (cũ `#E8F5E9`), viền `rgb(225,237,229)` (cũ `#EEF2F0`, đậm hơn nhẹ), chấm active `rgb(60,179,113)` = `#3CB371` — lệch nhỏ chấp nhận theo OQ1/UI-0.1 |
| AC-01.5 | PASS | `text-[length:var(--fs-body)]`, computed 14px |
| AC-01.6 | PASS | Mọi class mới có trong `assets/pc-ui.css` (kiểm từng class, gồm `.group.is-active .group-\[\.is-active\]\:bg-primary`); JS không đổi, chọn theo `#aboutRail` + `href` |
| AC-01.7 | PASS | 1440 `/about-us`, `/gioi-thieu`: rail flex, rộng 220, top 96 sau cuộn 800px, link padding 9/12, gap 10, bo 8; panel đầu `0 0 44px`, panel giữa viền 1px, panel cuối `44px 0 0` không viền; ảnh `max-height` 560px. Cao trang 6478px; so với **mô phỏng bản cũ** (đổi ngược class + chèn lại khối `<style>` cũ trên cùng DOM): lệch 0px |
| AC-01.8 | PASS | 390: rail `display:none`, offsetHeight 0; không tràn ngang; 0 `{{`/`{%` ngoài `<script>/<style>`; 0 pageerror. Cao trang = bản mô phỏng cũ (lệch 0px) |
| AC-01.9 | PASS | Cuộn tới `#about-team` ⇒ active `#about-team`; bấm link `#about-lab` ⇒ panel vào màn (top 72), active `#about-lab` |
| AC-01.10 | PASS | Xem 9.1 |
| AC-02.1 | PASS | Docstring có "Tham số:" `cols`, mặc định, lưu ý biến lọt phạm vi cha |
| AC-02.2 | **FAIL** | Docstring ghi 4 nơi include "kiểm 20/11/2026", thực tế **5**: thiếu `snippets/page_thuong_hieu.bwt:77` (có từ HEAD, commit 19/11). Lỗi gốc ở SPEC (BA đếm thiếu) — T2 làm đúng chữ SPEC nhưng docstring sai sự thật ⇒ thẻ T2-FIX |
| AC-02.3 | PASS | Diff chỉ comment + gỡ token `pc-trust-badges`; HTML render 5 trang: 0 `pc-trust-badges`, class `<ul>` = `m-0 p-0 list-none grid {cols} gap-4 sm:gap-6` |
| AC-02.4 | PASS | Render dev-server: `/`, `/products/<alias>`, `/collections/all`, `/thuong-hieu` ⇒ 1440: 4 cột, icon 38px; 390: 2 cột, icon 32px; không tràn. `/cart` (giỏ trống trên dev-server): `<ul>` render đúng `grid-cols-1 sm:grid-cols-2` nhưng khối bị ẩn (offsetHeight 0) do trạng thái giỏ trống, không do thẻ. Đủ bằng chứng vì class gỡ có 0 quy tắc CSS ⇒ computed style không thể đổi |
| AC-02.5 | PASS | Guardrails/liquid-globals exit 0; `pc-ui.css` không có quy tắc `pc-trust-badges` (trước và sau) ⇒ thẻ không làm đổi CSS |
| AC-03.1 | PASS | Exit 0 ×2, idempotent, `data/` sạch; script chỉ `writeFileSync` vào `docs/data/` |
| AC-03.2 | PASS | Mục 1–4: tổng 5586; trùng id 0, alias 0, tên 24 nhóm; thiếu theo khoá; alias sai định dạng |
| AC-03.3 | PASS | Mục 5 (tag: dấu phẩy, khoảng trắng, trùng hoa/thường, dấu chấm, top 20 gần trùng) |
| AC-03.4 | PASS | Mục 6–7 (vendor, loại) |
| AC-03.5 | PASS | Mục 8 (style= 5358, font-family 277, font-size 38, `<font>` 815, thẻ rỗng 911) |
| AC-03.6 | PASS | ≤10 id/ví dụ; bảng ý nghĩa khoá có cột "Căn cứ" trỏ `data/products.js` (không đoán) |
| AC-03.7 | PASS | Mục 10 "Đề xuất chuẩn hoá (CHƯA áp dụng)", mục 11 "Cần chủ dự án quyết" |
| AC-03.8 | PASS | Không có dữ liệu khách hàng; compliance exit 0; JSON gốc parse OK |

### 9.3 Phạm vi ghi (`git status --porcelain`)
Do các thẻ: `snippets/page_about.bwt`, `assets/pc-ui.css` (T1) · `snippets/ui_trust_badges.bwt` (T2) · `scripts/data-profile-products.mjs`, `docs/data/` (T3) · `ui-loop/checks/L03b11.mjs` (T4b — **không có trong mục 6**, phiên chính giao sau; diff đúng 1 dòng selector `.about-rail` → `#aboutRail`, cần thiết vì class cũ đã gỡ ⇒ BA chấp nhận, ghi bổ sung owner fe-core) · `docs/specs/` (BA).
Có sẵn trước lượt (mục 8): `AGENTS.md`, `docs/TEAMWORK-WORKFLOW.md`, `.claude/agents/`, `.claude/commands/team.md`, `todo_list/`. Không có file ngoài phạm vi.

### 9.4 Thẻ lỗi

**T2-FIX — owner: fe-core** · File được ghi: `snippets/ui_trust_badges.bwt` (duy nhất, chỉ khối comment đầu file).
- Tái hiện: `grep -rn "include 'ui_trust_badges'" templates snippets layouts` ⇒ 5 kết quả.
- Thực tế: docstring liệt kê 4 nơi, thiếu `snippets/page_thuong_hieu.bwt` (trang `/thuong-hieu`, mặc định cols).
- Mong đợi: liệt kê đủ 5 nơi (thêm dòng `snippets/page_thuong_hieu.bwt — mặc định (trang thương hiệu)`); không đổi markup.
- Kiểm: grep trên ra 5 = số dòng trong docstring; `npm run lint:liquid-globals` exit 0.
- AC-02.2 sửa lại thành "liệt kê đủ **mọi** nơi include (hiện 5)".

### 9.5 Ghi nhận (không chặn)
- **Chế độ 1 cột của `page_about`** (chỉ khi ≤ 1 mục có nội dung — dữ liệu hiện tại 6 mục nên không thấy): CSS cũ do độ ưu tiên selector khiến panel duy nhất có đệm 0/0; bản mới giữ `py-[44px]` (+88px). T4 ghi "có chủ ý" (khớp ý đồ dòng `--solo` cũ). Khác REQ-01 "không đổi giao diện" ở trường hợp biên ⇒ hỏi chủ dự án (OQ5).
- Class nút rail lặp 6 lần, rail chỉ PC (T4) — chấp nhận, không mở thẻ.

### 9.6 open_questions bổ sung (trả chủ dự án)
5. Chế độ 1 cột `page_about`: giữ đệm 44px (bản mới) hay trả về 0 như hiển thị cũ?
6. `lint:config` đang FAIL sẵn từ HEAD vì 2 trường `skinhealthy_services_groups_menu`, `skinhealthy_services_all_url` không được code đọc — xoá trường (điểm dừng schema) hay nối code đọc? Hiện chặn `build:sapo`.
7. Hạ `scripts/guardrails-baseline.json` (hex −6, inlineStyle −1, important −2) — giữ nguyên OQ2.

**Tái nghiệm thu T2-FIX (20/11/2026):** docstring `ui_trust_badges.bwt` liệt kê 5 nơi include, khớp `grep -rnE "include\s+['\"]ui_trust_badges" templates snippets layouts` = 5; `npm run lint:liquid-globals` exit 0; `lint-guardrails --strict` exit 0 ⇒ AC-02.2 PASS. **Kết luận cuối: ACCEPTED.**
