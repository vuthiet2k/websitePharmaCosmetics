# Rule 01 — Quy chuẩn BẮT BUỘC khi phát triển Theme Sapo Web

> Nguồn chuẩn duy nhất: **`Rule&HDKTXD.md`** ở gốc repo (Cẩm nang Quy chế, Rule & Hướng dẫn Kỹ thuật
> phát triển Theme Sapo Web — 9 phần: checklist review, theme.bwt, Liquid, 38 objects, settings_schema,
> kỹ thuật tính năng cốt lõi, tối ưu hiệu năng/SEO, quy chế đối tác, danh mục tài liệu tham khảo).
> File dưới đây chỉ chắt lọc phần BẮT BUỘC để agent/dev không vi phạm. Khi cần chi tiết (cú pháp đầy
> đủ, danh mục object, quy trình duyệt, chia sẻ doanh thu 70/30, bảo hành) → **đọc file gốc**, không
> suy diễn lại.

## 0. Nguyên tắc áp dụng

- Mọi thay đổi trong `templates/`, `snippets/`, `layouts/`, `configs/`, `assets/` phải tuân rule này.
- Cẩm nang > sở thích cá nhân. Nếu một đề xuất (kể cả từ báo cáo QA bên ngoài) mâu thuẫn cẩm nang
  hoặc hướng thiết kế đã chốt trong `design/` → không áp dụng máy móc, phải nêu lý do trong báo cáo.

## 1. Layout master (`layouts/theme.bwt`)

- `{{ content_for_header }}` đặt ngay trước `</head>` — bắt buộc tuyệt đối.
- `{{ content_for_layout }}` **hoặc** `{% block "ContentPlaceHolder" %}{% endblock %}` trong `<body>`.
  Repo này dùng `{{ content_for_layout }}`; storefront dùng chung `theme.bwt`, kể cả Skin Health Beauty
  và AI tư vấn da. Layout chuyên biệt còn lại: `chat.bwt`, `mops-admin.bwt`.
- 4 thành phần giao diện bắt buộc: (1) Logo hoặc `{{ store.name }}` bọc link về `/`;
  (2) main menu từ `linklists['main-menu']`; (3) footer menu từ `linklists['footer']`;
  (4) ô/nút tìm kiếm trỏ `/search`.
- Quy chuẩn thẻ `<body>`:
  `<body class="{{ template | replace: '.', ' ' | truncatewords: 1, '' }}" id="{{ page_title | alias }}">`

## 2. Cấu trúc & asset

- 5 thư mục cốt lõi: `assets/`, `configs/`, `layouts/`, `snippets/`, `templates/`.
- `settings_schema.json` + `settings_data.json` phải là JSON hợp lệ (kiểm tra ngay sau khi sửa).
- Tên thư mục **`configs/` & `layouts/` (số nhiều)** — cả repo lẫn gói nộp Sapo. Kiểm chứng 2026-10-05: gói
  dùng `config/` & `layout/` (như cẩm nang cũ ghi) bị trình tải lên Sapo Web báo thiếu
  `layouts/theme.bwt`, `configs/settings_*.json`. Bắt buộc có `templates/page.bwt` (template trang tĩnh mặc định).
- Asset dùng biến `settings`: file phải có đuôi `.scss.bwt` hoặc `.js.bwt`, gọi qua
  `{{ 'app.css' | asset_url | stylesheet_tag }}`.

### 2.2. Gói zip nộp Sapo — `npm run build:sapo` (chốt 2026-10-03)

- Chuỗi: `clean:sapo` → `audit:assets` → `lint:guardrails` (chỉ cảnh báo, mục 2.4) →
  `compile:sapo` (staging `sapo-dist/`) → `pack:sapo` (`exports/sapo-theme-<version>.zip`) →
  `validate:sapo`. Bước nào fail là dừng, exit 1.
- Zip **< 5.000.000 bytes** (vượt thì xoá zip + in top 10 file nặng); root zip phẳng
  `assets/ configs/ layouts/ snippets/ templates/`, không thư mục bọc, không file rác.
- **Không** nén tay bằng `Compress-Archive` của Windows PowerShell 5.1: nó ghi đường dẫn bằng dấu
  backslash (validator báo lỗi). Luôn dùng `npm run pack:sapo`.
- Minify giữ nguyên tên file (template gọi asset theo tên); `.scss.bwt` và `.js.bwt` có Liquid được
  copy nguyên bản.

### 2.2b. Đặc tả Sapo đã kiểm chứng — `validate:sapo` chặn ngay khi build (chốt 2026-10-05)

Nguồn: https://support.sapo.vn/settings-schema, /gioi-thieu-ve-template-liquid, các trang bộ lọc
/bo-loc-*; kiểu field tài liệu không ghi thì bám schema gốc theme (commit `f31bbd0`, bản Sapo đã nhận).
Mỗi lần tải lên Sapo chỉ báo 1 lỗi đầu tiên ⇒ mọi quy tắc dưới đây phải nằm trong validator, không đợi Sapo báo.
- **Thuộc tính theo kiểu field** (ngoài `type`): `header` content, info · `paragraph` content ·
  `color` id, label, default, info · `text`/`textarea`/`checkbox` id, label, default, info ·
  `select` id, label, default, options · `image` id, label, info · `collection`/`blog`/`page`/`link_list`/
  `snippet`/`font` id, label, info — **kiểu chọn dữ liệu KHÔNG có `default`** (giá trị mặc định đặt
  `| default:` trong Liquid + `settings_data.json`). Kiểu menu là `link_list` (không phải `linklist`).
- `default` của checkbox là boolean, các kiểu khác là chuỗi; `options` = `[{ "value", "label" }]` và
  `default` của select phải nằm trong options; `id` không trùng.
- Template bắt buộc: index, product, collection, cart, blog, article, page, list_collections, search, 404
  (+ `layouts/theme.bwt` có `content_for_header` trước `</head>` và `content_for_layout`).
- `{% include %}` / `{% layout %}` phải trỏ tới file có thật; `'<file>' | asset_url` phải có file trong
  gói (`x.scss.css` ← `x.scss.bwt`).
- Thẻ/bộ lọc Liquid: chỉ dùng thứ có trong tài liệu Sapo hoặc đã có ở theme gốc. Đã đối chiếu 2026-10-05:
  không thẻ mới; bộ lọc mới `alias`, `floor`, `newline_to_br` đều có trong tài liệu. Không dùng `continue`.

### 2.3. Ảnh: `assets/` chỉ chứa ảnh hệ thống — nguồn chuẩn `scripts/lib/sapo-asset-policy.js`

- Sapo **không có** `image_picker` / `section.settings` (đó là Shopify). Input ảnh duy nhất là
  `type: "image"`, có 2 dạng:
  - `id` = tên file (vd `"logo.png"`): admin upload thì Sapo ghi đè `assets/<id>`, template gọi
    `'<id>' | asset_url`. File mặc định được phép nằm trong `assets/`.
  - `id` thường (vd `footer_qr_image`): render trong `{% if settings.<id> != blank %}` bằng
    `{{ settings.<id> | img_url: '…' }}`. **Ảnh nội dung mới (banner, QR, logo đối tác, ảnh demo…)
    dùng dạng này**, để trống thì ẩn.
- Được phép trong `assets/` (mỗi file ≤ 150 KB): SVG `icon-*/flag-*/lang-*/sprite.svg`; icon UI
  trong `UI_ICON_WHITELIST`; ảnh mặc định của field `type:"image"` id = tên file. Ngoài ra thì
  `audit:assets` fail. Icon UI mới phải thêm vào whitelist, **không** tạo field schema cho icon.
- Ảnh dự phòng khi thiếu ảnh: `{% include 'placeholder_img_url' %}` (lấy `settings.placeholder_image`
  hoặc khung SVG inline), không gọi `'no-image.jpg' | asset_url`.
- Ảnh gốc đã gỡ khỏi `assets/` (để admin upload lại) nằm ở `design/seed-images/`.

### 2.4. Design token — SSOT `snippets/design_tokens.bwt` (chốt 2026-10-03)

- **Mọi** custom property `:root` của theme khai báo tại `snippets/design_tokens.bwt` (include trong
  `<head>` của `layouts/theme.bwt` và `layouts/chat.bwt`). Không thêm `:root { … }` ở snippet/asset
  khác. Ngoại lệ còn lại: vendor (`vendor_bootstrap.css`, swiper trong `global_core`),
  `layouts/mops-admin.bwt` (app admin riêng), `--chat-*` trong `page_ai_skin_quiz.scss.bwt`.
- Màu thương hiệu lấy từ Customizer qua `--pc-brand-*` (`settings.theme_*_color`).
  **Không dùng `var(--primary)`**: `vendor_bootstrap.css` nạp sau và ghi đè `--primary: #007bff`
  (cũng trùng `--white`, `--gray`, `--secondary`, `--success`…). Token mới đặt tên không trùng Bootstrap 4.
- Thay hex bằng token **chỉ khi cùng giá trị** và token đó **không có biến thể dark** (nếu không
  giao diện dark đổi màu). Kiểm chứng bằng diff computed style sáng/tối trước-sau, không chỉ nhìn mắt.
- Không dùng `var()` bên trong hàm SCSS (`rgba(#fff,.5)`, `darken()`…) — Sapo biên dịch SCSS sẽ lỗi.
- `npm run lint:guardrails` đếm hex hardcode / `!important` / `style=""` tĩnh / comment kiểu
  "Updated by AI" theo file, so với `scripts/guardrails-baseline.json`: chỉ cảnh báo phần **tăng
  thêm**. Khi chủ động giảm số cũ thì chạy `--update-baseline`. Comment nêu lý do + ngày/mã
  ticket (AGENTS.md) **không** bị coi là rác.

### 2.1. Container chuẩn — mép trái/phải mọi section phải thẳng hàng với header

- **Nguồn duy nhất (SSOT):** khối `CONTAINER-SSOT` đầu `assets/storefront-v3.css`, với 2 biến
  `--pc-container-max` (1280px) và `--pc-container-gutter` (20px ≤680px · 32px 681–1199px · 30px ≥1200px).
  Header, footer, thân trang và home portal (`home-portal*.css`) đều đọc 2 biến này. Muốn đổi bề rộng hay
  lề của site thì **chỉ sửa 2 biến này**.
- **Cấm** khai báo thêm `max-width`/`padding`/`width` chung cho `.container` ở bất kỳ file nào khác
  (`vendor_bootstrap.css`, `global_core.scss.bwt` hay snippet `<style>`). Các định nghĩa cũ ở
  `vendor_bootstrap.css` (15px/1140px) và `global_core.scss.bwt` (14px/30px, 960/1280px) chỉ còn là
  fallback, bị SSOT đè. Không "vá" bằng cách sửa chúng hay thêm `!important`. Chúng từng chồng nhau với
  header 32px, footer 32px và `.container` của Tailwind CDN, làm khung nhảy lệch mép giữa các trang.
  Tailwind CDN đã tắt `container` (`corePlugins.container: false` trong `layouts/theme.bwt`).
- Rule thân trang dùng `:where(.pc-site-v3) .container` (độ ưu tiên 0,1,0), **không `!important`**.
  Nhờ vậy khung hẹp có chủ đích vẫn ghi đè được theo ngữ cảnh, ví dụ `.ot-page .container` 640px,
  `.mops-hero .container` 720px, `.header-menu > .container`. Ngoại lệ mới phải scope theo class
  trang/section, kèm comment lý do.
- Khung nội dung của **mọi** section storefront (breadcrumb, hero, các module) dùng class `.container`
  — **giống hệt** `snippets/header.bwt`. Nền full-width (gradient, màu nền) đặt ở thẻ `<section>` ngoài,
  `.container` nằm bên trong. Code CSS/JS không được ghi số px trùng giá trị container. Phải dùng
  `var(--pc-container-gutter)` để giá trị không bị lệch khi đổi biến.
- **Cấm** tự dựng khung bằng Tailwind `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (hay `max-w-6xl`,
  `max-w-screen-xl`…). Lý do: `html { font-size: 87.5% }` (`settings.theme_font_scale`) làm 1rem = 14px
  ⇒ `max-w-7xl` chỉ còn 1120px, `lg:px-8` = 28px ⇒ nội dung hẹp hơn header ~156px, logo/giỏ hàng lệch
  khỏi mép breadcrumb/hero (lỗi trang GetGlowing Micro-Peel, 2026-10-02).
- Cột đọc hẹp (FAQ, CTA, tiêu đề section) được phép `max-w-3xl/4xl mx-auto` nhưng phải là **con bên
  trong** `.container`, không thay thế nó.
- Không thêm `px-*` lên chính thẻ `.container` (padding đã do theme quản lý).
- Self-check: ở 1440px, mép trái chữ breadcrumb/hero phải trùng mép trái logo header, mép phải card/khối
  cuối phải trùng mép phải icon giỏ hàng.

## 3. Liquid

- 3 thành phần: Tag `{% ... %}`, Object `{{ ... }}`, Filter `{{ x | filter }}`.
- **Chuỗi rỗng `""` vẫn là TRUE**; chỉ `false`/`null` là false ⇒ luôn dùng `{% if x != blank %}`,
  `{% unless settings.k == blank %}` thay vì `{% if x %}` khi xét nội dung.
- Nhúng snippet: `{% include 'ten-snippet' %}` (không đuôi `.bwt`). Kiểm tra template bằng `contains`
  (`{% if template contains 'product' %}`).
- Alias/Handle: kebab-case không dấu (`handleize`).
- Lập trình phòng thủ trước khi render/lặp:
  - `{% unless settings.banner_title == blank %}` hoặc dùng `| default:`.
  - `{% unless settings.col == blank or collections[settings.col].empty? %}`
  - `{% if collection.products.size > 0 %}` (tránh sinh khối HTML rỗng).
- Fallback giá trị mặc định: `{{ settings.home_title | default: store.name }}`.
- Thẻ thông dụng: `if/elsif/else/unless/case-when`, `for` (+`limit`,`offset`,`reversed`,`forloop`),
  `cycle`, `tablerow`, `assign`, `capture`, `increment/decrement`, `comment`, `include`, `form`,
  `paginate` (tối đa 50 item/trang), `raw`.

## 4. Ảnh, hiệu năng & Core Web Vitals

- Mọi ảnh sản phẩm/banner **bắt buộc** đi qua `img_url` với size phù hợp (`thumb`, `small`, `compact`,
  `medium`, `large`, `grande`, `1024x1024`) + `loading="lazy"`.
- Ảnh Hero/LCP: **KHÔNG** `loading="lazy"`, phải thêm `<link rel="preload" as="image" href="...">`.
- Mọi `<img>` phải có `width` + `height` (hoặc CSS `aspect-ratio`) để chống CLS.
- Không để lỗi JS/Uncaught trong Console; script không thiết yếu dùng `defer`/`async`; Critical CSS
  nhúng trong `<head>`.
- Responsive thông suốt 320px → 1920px, không phát sinh scrollbar ngang.

## 5. SEO onpage

- Mỗi trang chỉ **01** thẻ `<h1>` (kể cả các nhánh rỗng/không có kết quả). Trang không có tiêu đề
  hiển thị thì dùng `<h1 class="visually-hidden">` — không đổi giao diện. Không lồng `<h1>` trong `<h1>`.
- Mọi `<img>` có `alt` mô tả; mỗi ảnh một alt riêng (không dùng chung alt cho nhiều ảnh). Ảnh trang
  trí đứng cạnh chữ (vd cờ ngôn ngữ + "English") dùng `alt=""` là đúng chuẩn.
- Đủ `<title>`, `<meta name="description">`, Open Graph. Structured data **chỉ dùng JSON-LD**,
  không thêm microdata `itemscope/itemprop` (2 dạng song song tạo 2 thực thể trùng). Nguồn
  (chốt 2026-10-03): `snippets/schema.bwt` (BreadcrumbList, HealthAndBeautyBusiness, WebSite),
  `snippets/product_schema.bwt` (Product + Offer + AggregateRating từ `metafields.bpr`),
  `templates/article.bwt` (Article).
- Trong JSON-LD: mọi chuỗi qua `| json` (không `"{{ x }}"`); trường tuỳ chọn bọc `{% if x != blank %}`
  để không ra `"a": ,`; URL chuẩn hoá `| remove: 'https:' | remove: 'http:' | prepend: 'https:'`
  (store.url / img_url có thể là `//domain`). Item mảng in dấu phẩy **đứng trước**.
  Kiểm bằng `JSON.parse` từng khối `ld+json` trên trang render, kể cả dữ liệu có dấu `"` và trường rỗng.
- **Không hardcode cam kết kinh doanh** (phí ship, thời gian giao, số ngày/phí đổi trả) trong JSON-LD.
  `shippingDetails` / `hasMerchantReturnPolicy` chỉ in khi admin bật `enable_shipping_policy` /
  `enable_return_policy` (nhóm "Trang sản phẩm", mặc định tắt) và mọi số liệu là số nguyên hợp lệ —
  thiếu/sai thì bỏ cả khối (chốt 2026-10-03).
- `sameAs` đọc `settings.footer_social_fb` / `footer_social_insta` (field social thật; không có
  `footer_social_zalo`/`_yt`). Ngày JSON-LD dạng ISO `'%Y-%m-%dT%H:%M:%S+07:00'` từ `article.published_on`.
- Dev server (`dev-server.js`) **không** mô phỏng đúng filter `date` (bỏ qua format) và `asset_url`
  (trả `/assets/…` thay vì `//bizweb.dktcdn.net/…`) — ngày/logo JSON-LD trên local sai là bình thường.
- Bản bàn giao: zip chuẩn + `settings_data.json` chứa dữ liệu mẫu để cài là có giao diện như demo.

## 6. Luồng TMĐT

- Thêm giỏ: POST `/cart/add` (`id` biến thể + `quantity`); AJAX: `/cart/add.js`, `/cart.js` (GET),
  `/cart/change.js` (POST).
- Variant selector cập nhật giá, giá so sánh, SKU, còn/hết hàng và ảnh theo biến thể.
- Giỏ hàng AJAX: debounce khi đổi số lượng, optimistic UI, đồng bộ trạng thái bằng custom event
  (`cart:updated`) cho header count / mini cart / cart page — không reload trang.
- Form hệ thống (đăng ký, đăng nhập, liên hệ, nhận tin) phải validate và gửi thành công (qua `{% form %}`).
- Tìm kiếm: `/search?q=`, tham số `type` (product/article/page), `field`, `sortby`, `view`;
  dùng `search.json.bwt` cho live search AJAX.

## 7. `settings_schema.json`

- Cấu trúc: section → danh sách `settings` với `type`, `id`, `label`, `default`.
- 15 input types hợp lệ: `header`, `paragraph`, `color`, `font`, `text`, `textarea`, `image`,
  `checkbox`, `radio`, `select`, `collection`, `blog`, `page`, `link_list`, `snippet`.

## 8. Self-check bắt buộc trước khi báo hoàn thành

1. `configs/*.json` parse được; `npm run build` chạy không lỗi (khi sửa asset/config).
2. Không hardcode nội dung cấu hình: mọi chuỗi/nút/URL có `setting + default`.
3. Ảnh: đúng `img_url`, `alt` riêng, `width/height`, lazy đúng chỗ (hero thì preload thay vì lazy).
4. Responsive 320–1920 OK, không scrollbar ngang, không console error; khung section dùng `.container`
   thẳng hàng header (mục 2.1).
5. SEO: 1 `<h1>`, meta/OG đủ, JSON-LD khi trang có sản phẩm/breadcrumb.
6. Đã chạy kiểm tra tối thiểu, đúng trọng tâm và báo cáo bằng tiếng Việt có cấu trúc.

### 8.1. Checkpoint Release (bắt buộc sau khi import zip lên cửa hàng Sapo thật)

1. `npm run build:sapo` exit 0, upload `exports/sapo-theme-<version>.zip`.
2. **Google Rich Results Test** (https://search.google.com/test/rich-results) cho tối thiểu: 1 trang
   sản phẩm (Product/Offer, AggregateRating nếu có đánh giá), 1 bài viết (Article — kiểm
   `datePublished` đúng ISO, không phải chuỗi format thô), 1 trang danh mục (BreadcrumbList), trang chủ
   (HealthAndBeautyBusiness — logo là URL https tuyệt đối). 0 lỗi; cảnh báo phải được ghi nhận.
3. Nếu bật chính sách giao hàng/đổi trả: số liệu hiển thị trong Rich Results khớp chính sách thực tế.
