# BACKLOG — vòng lặp sửa giao diện (docs/UI-STANDARD.md, Phần G)

Trạng thái: TODO · IN_PROGRESS · VERIFY_FAIL · DONE · BLOCKED (thử 3 lần chưa đạt) · BLOCKED_OWNER (cần chủ dự án).
Chỉ agent đổi trạng thái theo G.2; chỉ chủ dự án chuyển BLOCKED* về TODO. Đợt 0 xong hết mới sang đợt 1.
Tiêu chí "G.7 — Lxx" = bảng G.7; "D.x + B.7" = dòng Do nhóm D.x + ngưỡng B.7 — agent ghi cụ thể (số, trang, khung) trước khi sửa.
Trang kiểm viết tắt: Q = 6 trang quick mặc định (/, /collections/all, /products/serum-vitamin-c-15, /?tpl=cart, /dat-lich-tu-van, /?tpl=login).

| Mã | Đợt | Việc | Trang kiểm | Tiêu chí đạt (đo được) | Trạng thái | Lần thử | Bằng chứng |
|-----|-----|------|------------|------------------------|------------|---------|------------|
| D01 | 0 | Nguồn CSS + build: `ui-src/css/tokens.css`, `components.css`, `main.css` theo M.1/M.3/M.4; `tailwind.pc.config.js` theo M.2; script `build:pc` + chèn vào `build` và `build:sapo` | toàn site | `npm run build:sapo` exit 0; `assets/pc-ui.css` có đủ class pc-* đang dùng, gzip ≤ 50KB; ui-guard PASS | TODO | 0 | — |
| D02 | 0 | Đổi tên 3 class cũ trùng thư viện: `pc-btn`→`pc-btn-v3`, `pc-section`→`pc-section-v3`, `pc-topbar`→`pc-topbar-v3` (CSS + markup + JS) | Q + /?tpl=search + /skinhealthy-services | grep 0 tham chiếu tên cũ ngoài thư viện; ảnh 390/1440 trước/sau không đổi bố cục; ui-verify --quick 0 lỗi mới | TODO | 0 | — |
| D03 | 0 | Nạp `pc-ui.css` trong `layouts/theme.bwt` (+ `layouts/chat.bwt`) SAU CSS cũ | Q | `pc-ui.css` HTTP 200 trên 6 trang Q; ui-verify --quick 0 lỗi mới | TODO | 0 | — |
| D04 | 0 | 12 snippet `ui_*` (button, product_card, field, badge, swiper_nav, action_bar, modal, toast, fab, icon + header/bottom-nav theo C.2 là việc L01) + trang kiểm thư viện CHỈ dev `dev-preview/templates/page.ui-kit.bwt` (`/?tpl=page.ui-kit`) | /?tpl=page.ui-kit | Trang kit hiện đủ component ở 390 và 1440 (ảnh); 0 `PC-ERROR` với tham số đúng; 1 ô thử tham số sai in đúng `PC-ERROR`; axe 0 lỗi trên trang kit; nút cao ≥ 44px | TODO | 0 | — |
| D05 | 0 | `assets/pc-ui.js` (JS thuần, `defer`): `data-pc-modal`, `data-pc-toast`, `data-pc-swiper`, `data-pc-form` | /?tpl=page.ui-kit | Modal: focus vào trong, Tab không thoát, Escape đóng + trả focus, khoá cuộn nền; toast: 1 cái, tự ẩn 5s; form gửi trống: lỗi tiếng Việt dưới từng ô, focus ô sai đầu, không bóng trình duyệt; swiper không tự chạy khi reduced-motion | TODO | 0 | — |
| D06 | 0 | Thay Tailwind CDN: `tailwind.legacy.config.js` (chép cấu hình CDN trong `layouts/theme.bwt`) → `assets/pc-legacy-tw.css` (script `build:tw-legacy`, chèn vào build:sapo); gỡ `<script src="https://cdn.tailwindcss.com">` + `tailwind.config` inline | 70 trang | 0 request `cdn.tailwindcss.com`; ui-verify --full 0 lỗi mới so baseline; ảnh 390/1440 của 10 trang PERF không đổi bố cục (xem ảnh trước/sau) | TODO | 0 | — |
| D07 | 0 | `snippets/ui_icon.bwt` (SVG Lucide MIT, đủ icon đang dùng ở header/footer/thẻ/form) + `scripts/lint-guardrails.js`: miễn `pc-ui.css`, `pc-legacy-tw.css` (file sinh) và SVG trong `ui_icon.bwt`; `.clinerules/03` UI-9 ghi "thay bằng UI-STANDARD R7" | /?tpl=page.ui-kit | `npm run build:sapo` exit 0; trang kit hiện icon đúng, `aria-hidden` khi trang trí | TODO | 0 | — |
| D08 | 0 | Dữ liệu mẫu local cho mục trước đây cần Sapo: trang `chinh-xach-doi-tra` (handle Sapo thật), route tag bài viết đúng mẫu URL Sapo (tra Rule&HDKTXD.md), gợi ý tìm kiếm có kết quả cho "retinol" | 3 URL | Cả 3 trả HTTP 200 với nội dung đúng (trang đổi trả có tiêu đề; trang tag liệt kê ≥ 1 bài có tag; gợi ý hiện ≥ 1 SP) | TODO | 0 | — |
| L01 | 1 | Menu ☰ mobile có cây danh mục SP (menu `main-menu`); thanh đáy 4 mục theo C.2 (Trang chủ · Danh mục · Soi da & Dịch vụ · Tài khoản) | /, /collections/all | G.7 — L01 | TODO | 0 | — |
| L34 | 1 | Thanh đáy: nhãn đọc trọn, `aria-current`, mục trỏ đúng trang nhãn hứa | Q | D.8 + B.7 (luồng L01-thanh-day-danh-muc đạt; 0 nhãn bị cắt) | TODO | 0 | — |
| L02 | 2 | Tương phản: topbar/footer nền #003F2D; giá, nhãn, link, nút theo token | 70 trang | G.7 — L02 | TODO | 0 | — |
| L03 | 3 | Tốc độ: JS `defer`, rút font còn 400/500/600/700, gỡ Font Awesome (thay `ui_icon`), ảnh đúng cỡ/WebP, preload LCP | 10 trang PERF | G.7 — L03 | TODO | 0 | — |
| L11 | 3 | Hero trang chủ: tiêu đề + nút hiện ngay, chữ trên ảnh có lớp phủ ≥ 4,5:1 | / | D.19 + D.4: h1 opacity 1 ở t=0; LCP 4G ≤ 2,5s; axe color-contrast 0 trên hero | TODO | 0 | — |
| L37 | 3 | Ảnh quá cỡ / nặng (`img_url` đúng cỡ, srcset, ảnh nội dung ≤ 200KB) | /, /skin-health-beauty, /about-us, /blogs/van-de-da | D.18 + B.7 | TODO | 0 | — |
| L04 | 4 | Form: lỗi tiếng Việt dưới ô (`ui_field` + `data-pc-form`) cho 6 form | /account/login, /account/register, /dat-lich-tu-van, /dai-ly-b2b, /about-us, /order-lookup | G.7 — L04 | TODO | 0 | — |
| L05 | 4 | Ô nhập 16px, cao 44px | 6 trang form + /?tpl=search | G.7 — L05 | TODO | 0 | — |
| L18 | 4 | Nhãn form, autocomplete, inputmode | 6 trang form, 2 trang SP, /collections/all | D.7 + axe label/select-name = 0 | TODO | 0 | — |
| L06 | 5 | Phần tử nổi ≤ 15%, 1 lớp đáy, 1 nút nổi | /, /collections/all, /products/serum-vitamin-c-15, /skinhealthy-services, /?tpl=product.lieu-trinh | G.7 — L06 | TODO | 0 | — |
| L07 | 5 | PDP: thanh mua `ui_action_bar`, link đổi trả cạnh nút mua | /products/serum-vitamin-c-15, /products/kem-duong-retinol-0-3-peptide | G.7 — L07 | TODO | 0 | — |
| L29 | 5 | Giỏ: thành tiền dòng, xoá có hoàn tác, tổng + thanh toán dính đáy, CLS ≤ 0,1 | /?tpl=cart (có hàng) | D.12 + B.7 | TODO | 0 | — |
| L10 | 6 | Viền focus mọi phần tử, skip link mọi trang | 70 trang | G.7 — L10 | TODO | 0 | — |
| L16 | 6 | Landmark: 1 `<main id="main">` mọi trang; trang AI không trùng banner/contentinfo | 70 trang | D.20: mainLandmark = 0 lỗi; axe landmark = 0 | TODO | 0 | — |
| L13 | 6 | Bộ lọc mobile dùng `ui_modal` + nút "Xem N sản phẩm" | /collections/all | D.9 + B.7 | TODO | 0 | — |
| L15 | 6 | Popup voucher dùng `ui_modal`; nhãn "Sao chép mã" → "Đã sao chép"; ẩn trường trống | /collections/all | luồng L15-popup-chuan đạt + D.15 | TODO | 0 | — |
| L17 | 6 | Tab mô tả PDP dùng được bằng bàn phím (accordion mobile) | 2 trang SP | D.11 + axe scrollable-region-focusable = 0 | TODO | 0 | — |
| L19 | 6 | Tên truy cập cho link ảnh/nút icon; link mơ hồ có ngữ cảnh | 70 trang | noName = 0 | TODO | 0 | — |
| L41 | 6 | Widget liên hệ: nút đóng là `<button>` ≥ 44px | / | D.16 + B.7 | TODO | 0 | — |
| L08 | 7 | Link tag bài viết + nhóm dịch vụ đúng URL Sapo | bài retinol, /?tpl=blog.instagram-feed, /?tpl=collection.skinhealthy | G.7 — L08 (local) | TODO | 0 | — |
| L20 | 7 | Gỡ handle/chữ demo hiển thị (`DIEU-TRI-CHUYEN-SAU`, `chong-lao-hoa`, `bac-si-tu-van`, "Nội dung trang demo.") | /skinhealthy-services, /skin-health-beauty-chi-tiet, bài retinol, /blogs/truoc-va-sau-1, /dat-lich-tu-van | D.15: demoText = 0, 0 chuỗi dạng handle hiển thị | TODO | 0 | — |
| L21 | 7 | Breadcrumb mục cuối = tên trang | /?tpl=cart, /?tpl=login, /?tpl=account | D.8 | TODO | 0 | — |
| L22 | 7 | `<title>` bỏ ` tagged ""` (`{% if current_tags != blank %}`) | 70 trang | badTitle = 0 | TODO | 0 | — |
| L23 | 7 | h1 luôn hiển thị, không rỗng | /payment, /skin-health-beauty-thanh-toan, /dang-ky-lieu-trinh-tri-mun, /?tpl=collection.lieu-trinh, /?tpl=page | h1Count = 0 lỗi | TODO | 0 | — |
| L26 | 8 | 3 cấp nút qua `ui_button`; 1 nút chính mỗi khối; nhãn thống nhất | Q + /skinhealthy-services | D.5 + R8 | TODO | 0 | — |
| L27 | 8 | Gộp thẻ "Xem nhiều" vào `ui_product_card` | / | D.10 | TODO | 0 | — |
| L28 | 8 | Thông báo thống nhất `ui_toast` | /collections/all, PDP | D.16 | TODO | 0 | — |
| L36 | 8 | Bỏ chữ HOA tiêu đề (trừ tên thương hiệu B.0) | 70 trang | D.3 | TODO | 0 | — |
| L44 | 8 | Mega-menu desktop: icon khác nhau hoặc bỏ icon | / (1440) | D.8 | TODO | 0 | — |
| L12 | 9 | Danh mục mobile: SP đầu trong màn đầu | /collections/all, /collections/flash-sale-1 | D.10 + CLS ≤ 0,1 | TODO | 0 | — |
| L14 | 9 | Tìm kiếm: gợi ý có kết quả, icon đúng, focus desktop | /?tpl=search, / | D.9 (local, dữ liệu mẫu D08) | TODO | 0 | — |
| L24 | 9 | Vùng chạm ≥ 44px (mobile), ≥ 24px tuyệt đối | 70 trang | touch<24 = 0; touch<44 = 0 | TODO | 0 | — |
| L25 | 9 | Chữ ≥ 12px mobile | 70 trang | text<12 = 0 | TODO | 0 | — |
| L30 | 9 | Tin tức/bài viết căn trái | /tin-tuc, bài retinol | D.3 | TODO | 0 | — |
| L31 | 9 | PDP hàng mã/đánh giá không vỡ | 2 trang SP | D.3 | TODO | 0 | — |
| L32 | 9 | Trình xem ảnh SP tối đa 3 nút | 2 trang SP | D.11 | TODO | 0 | — |
| L33 | 9 | Khảo sát da: đáp án không bị che, placeholder không cắt | /ai-skin-quiz | D.14 | TODO | 0 | — |
| L35 | 9 | Một trục căn; lề form đúng gutter | /dat-lich-tu-van, /?tpl=login | D.2 | TODO | 0 | — |
| L38 | 9 | Carousel/topbar không tự chạy khi giảm chuyển động; có nút dừng | /skin-health-beauty, / | autoplayReduced = 0 | TODO | 0 | — |
| L39 | 9 | Soi da không camera: nút tải ảnh cạnh thông báo | /soi-da | D.14 | TODO | 0 | — |
| L40 | 9 | Trang chủ: khoảng cách section đúng thang | / | D.2 + B.7 | TODO | 0 | — |
| L42 | 9 | Alt ảnh không lặp chữ bên cạnh | /, /?tpl=list_collections | axe image-redundant-alt = 0 | TODO | 0 | — |
| L43 | 9 | ID trùng, heading nhảy bậc | 70 trang | axe heading-order = 0, duplicate-id = 0 | TODO | 0 | — |
| L09 | 10 | Flash Sale: giữ chu kỳ 24h (đã quyết giá đổi mỗi ngày) — chỉ kiểm | / | G.7 — L09 | TODO | 0 | — |
| D09 | 11 | Khoá thư viện: bật preflight, xoá `pc-legacy-tw.css` + CSS cũ không còn tham chiếu, cập nhật cột Hiện trạng Phần D | 70 trang | ui-verify --full sạch | TODO | 0 | — |
