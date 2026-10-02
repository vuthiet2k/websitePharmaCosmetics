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
- Tên thư mục: cẩm nang Sapo ghi `config/` & `layout/`, còn repo này đóng gói `configs/` & `layouts/`
  (xem `scripts/build-theme.js`, `vercel.json`) — **giữ nguyên theo repo**, nhưng khi chuẩn bị nộp
  theme cho Sapo review phải đối chiếu lại tên thư mục theo checklist duyệt.
- Asset dùng biến `settings`: file phải có đuôi `.scss.bwt` hoặc `.js.bwt`, gọi qua
  `{{ 'app.css' | asset_url | stylesheet_tag }}`.

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

- Mỗi trang chỉ **01** thẻ `<h1>`.
- Mọi `<img>` có `alt` mô tả; mỗi ảnh một alt riêng (không dùng chung alt cho nhiều ảnh).
- Đủ `<title>`, `<meta name="description">`, Open Graph; JSON-LD: Product + AggregateRating
  (`product.bwt`), BreadcrumbList + Organization.
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
