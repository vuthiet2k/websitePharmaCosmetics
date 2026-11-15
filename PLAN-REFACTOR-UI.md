# KẾ HOẠCH TOÀN DIỆN: TỐI ƯU GIAO DIỆN STOREFRONT (TAILWIND UTILITY & CARD PATTERN)
**Dự án:** Pharma Cosmetics (`websitePharmaCosmetics`) — Nhánh: `ui-fix`  
**Ngày lập:** 15/11/2026  
**Nguồn quy chuẩn tối cao:** [AGENTS.md](file:///e:/PHARMA%20COSMETICS/websitePharmaCosmetics/AGENTS.md), [03-chuan-giao-dien-ui.md](file:///e:/PHARMA%20COSMETICS/websitePharmaCosmetics/.clinerules/03-chuan-giao-dien-ui.md), [UI-STANDARD.md](file:///e:/PHARMA%20COSMETICS/websitePharmaCosmetics/docs/UI-STANDARD.md).

---

## I. MỤC TIÊU CHIẾN LƯỢC & NGUYÊN TẮC CỐT LÕI

1. **Màu thương hiệu bất di bất dịch (RULE CỨNG UI-BRAND):**
   - `#3CB371` (MediumSeaGreen) là **MÀU XANH THƯƠNG HIỆU DUY NHẤT** của Pharma Cosmetics.
   - Bắt buộc áp dụng cho: Topbar (`header_topbar_bg`), nút CTA chính, icon chủ đạo, badge, viền nhấn, màu chủ đạo theme (`theme_main_color`). Tuyệt đối không tự ý đổi Topbar hay màu chính sang bất kỳ mã màu nào khác.

2. **100% Class Tailwind Utility (RULE CỨNG UI-0):**
   - Mọi markup mới hoặc được sửa phải dùng 100% utility class của Tailwind (`flex`, `items-center`, `justify-between`, `grid`, `p-0`, `py-2`, `bg-primary`, `bg-btn`, `bg-card`...).
   - **Triệt tiêu dứt điểm hiện tượng:** Không đặt thêm class CSS tự chế, không viết `style=""` / `<style>`, không viết `@media` thủ công mới, không dùng CSS ngoài để override đè padding/margin khi đã có utility class của Tailwind.

3. **Chuẩn hoá Card Pattern:**
   - Cấu trúc giao diện rõ ràng, tường minh theo Card chuẩn:
     - Thẻ bao ngoài Card: `<div class="card">`
     - Header của Card: `<div class="card-header bg-primary">`
     - Body của Card: `<div class="card-body p-0">` (padding triệt tiêu hoặc co giãn trực tiếp bằng Tailwind class).
   - Loại bỏ hoàn toàn các class chắp vá thừa thãi (như `header-card`, `main-header`, `box-hearder`).

4. **Kiểm soát Cỡ chữ theo Token (UI-2.9):**
   - Mọi kích thước font chữ phải tuân thủ token hệ thống `var(--fs-*)` hoặc class Tailwind typography đã định cấu hình, không hardcode `px` / `rem` / `pt`.

---

## II. ĐÃ THỰC HIỆN: DỌN DẸP FILE THỪA & TÀI LIỆU CŨ KHÔNG ĐÚNG

Đã rà soát và dọn dẹp sạch sẽ các tệp tin rác phát sinh và tài liệu lệch stack:

1. **Xoá 29 file ảnh chụp màn hình debug tạm bợ** nằm rải rác ở thư mục gốc:
   - `card-header-*.png`, `header-*.png` (các ảnh đối soát quan trọng đã được lưu trữ an toàn trong thư mục Artifacts của phiên làm việc).
2. **Xoá file CSS thừa không còn dùng:**
   - `assets/pc-legacy-tw.css` (đã được thay thế hoàn toàn bởi `assets/pc-ui.css` tập trung).
3. **Xoá tài liệu nháp cũ không đúng stack kỹ thuật:**
   - `docs/Chuẩn triển khai UX-UI - Pharma Cosmetics.md` (dung lượng 3.3 MB, bản thảo cũ viết cho Hugo trước 24/10/2026, đã có [docs/UI-STANDARD.md](file:///e:/PHARMA%20COSMETICS/websitePharmaCosmetics/docs/UI-STANDARD.md) chính thức của Sapo theme thay thế hoàn toàn).
4. **Xoá log GPU crash tạm thời:**
   - `debug.log`.

---

## III. CHI TIẾT CÁC GIAI ĐOẠN TRIỂN KHAI (ROADMAP)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Header & Điều hướng (ĐÃ HOÀN THÀNH 100%)                      │
│ └─ Thẻ card thuần + card-header + card-body p-0 + Tailwind flexbox     │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 2: Dọn sạch class tự chế pc-*-v3                                 │
│ └─ Xoá pc-section-v3, pc-btn-v3 trong snippets & templates             │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 3: Chuẩn hoá Template Auth & Khách hàng                          │
│ └─ Chuyển login, register, addresses sang Tailwind Grid & Card         │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 4: Chuẩn hoá Giỏ hàng & Pop-up mua sắm                           │
│ └─ Chuyển cart, ajaxcart, popup_tragop, quickview sang Tailwind        │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 5: Chuẩn hoá Trang nội dung & Form Dịch vụ                       │
│ └─ Chuyển article, dat_lich_tu_van, payment, b2b sang Tailwind         │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 6: Thẩm định Visual & Đóng gói Sapo Theme                        │
│ └─ Chạy audit visual 1440px / 390px, lint:guardrails, build:sapo PASS  │
└────────────────────────────────────────────────────────────────────────┘
```

---

### GIAI ĐOẠN 1: HEADER & ĐIỀU HƯỚNG *(ĐÃ HOÀN THÀNH 100%)*
- **Tập tin xử lý:** [snippets/header.bwt](file:///e:/PHARMA%20COSMETICS/websitePharmaCosmetics/snippets/header.bwt), [snippets/site_topbar.bwt](file:///e:/PHARMA%20COSMETICS/websitePharmaCosmetics/snippets/site_topbar.bwt), [snippets/pharma_ui_kit.bwt](file:///e:/PHARMA%20COSMETICS/websitePharmaCosmetics/snippets/pharma_ui_kit.bwt), [ui-src/css/components.css](file:///e:/PHARMA%20COSMETICS/websitePharmaCosmetics/ui-src/css/components.css).
- **Kết quả đạt được:**
  - Khối Card chuẩn: `<div class="card">` bọc ngoài.
  - Topbar chuẩn: `<div class="card-header">` màu `#3CB371` (tự động ẩn khi cuộn trang `is-scrolled`).
  - Thân Header chuẩn: `<div class="card-body p-0">` (bám dính đỉnh fixed khi cuộn).
  - Hàng nội dung chính: `<div class="header-row flex items-center justify-between min-h-[68px] relative w-full">` (thay thế triệt để `row d-flex align-items-center pc-header-row` và các class `col-*`).
  - Hàng điều hướng menu: `<div class="nav-row flex items-center flex-nowrap justify-center">` (thay thế `row`).
  - Xoá sạch toàn bộ các dòng CSS đè padding ngoài: `padding-top: 0 !important; padding-bottom: 0 !important;`.
  - Giảm 3 lỗi `!important` trong guardrails baseline (từ 88 xuống 85).
  - Đã chụp ảnh kiểm chứng visual hoàn hảo ở Desktop 1440px & Mobile 390px.

---

### GIAI ĐOẠN 2: XOÁ SỔ HOÀN TOÀN CÁC CLASS TỰ CHẾ `pc-*-v3`
- **Mục tiêu:** Xoá sạch tàn dư của đợt đổi tên cũ (D02) sinh ra các class `pc-section-v3`, `pc-btn-v3`. Chuyển sang class chuẩn semantic và Tailwind utility.
- **Danh sách tập tin:**
  1. `snippets/section_why_us.bwt`:
     - Đổi `<section class="pc-section-v3 section--subtle pc-why-us-section">` $\rightarrow$ `<section class="section section--subtle pc-why-us-section">`.
     - Đổi nút `<a class="pc-btn-v3 pc-btn-primary pc-why-us-cta">` $\rightarrow$ dùng class button Tailwind chuẩn theo UI-0 (`inline-flex items-center justify-center font-semibold rounded-lg bg-btn text-btn-text hover:bg-btn-hover`).
  2. `snippets/section_collection_bestseller.bwt`:
     - Đổi `<section class="pc-section-v3 section--subtle pc-col-bestseller">` $\rightarrow$ `<section class="section section--subtle pc-col-bestseller">`.
  3. `snippets/section_collection_cta.bwt`:
     - Đổi `<section class="pc-section-v3 pc-col-cta-section">` $\rightarrow$ `<section class="section pc-col-cta-section">`.
  4. `templates/customers/order.bwt`:
     - Đổi các nút mua lại và hỗ trợ `<button class="pc-btn-v3 pc-btn-primary">` và `<a class="pc-btn-v3 pc-btn-secondary">` $\rightarrow$ class nút Tailwind.
  5. `templates/customers/orders.bwt`:
     - Đổi các nút hành động rỗng `<a class="pc-btn-v3 pc-btn-primary">` $\rightarrow$ class nút Tailwind.
  6. `templates/page.indexskinhealthy.bwt`:
     - Loại bỏ các class `pc-*-v3`.
- **Cập nhật CSS đồng bộ:**
  - Cập nhật selector trong `ui-src/css/components.css` để hỗ trợ `:is(.section, .pc-section-v3)` và dọn dẹp các selector `pc-btn-v3`.

---

### GIAI ĐOẠN 3: CHUẨN HOÁ TEMPLATE TÀI KHOẢN & AUTH (LOGIN / REGISTER / ACCOUNT)
- **Mục tiêu:** Thay thế toàn bộ hệ thống lưới Bootstrap `row` / `col-lg-6 col-12` sang Tailwind Grid hiện đại và cấu trúc Card chuẩn.
- **Danh sách tập tin:**
  1. `templates/customers/login.bwt`:
     - Thay thế `<div class="row pc-auth-row">` và `<div class="col-lg-6 col-12 pc-auth-form-col">` $\rightarrow$ `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full">`.
     - Chuẩn hoá form đăng nhập bên trong theo Card pattern: `<div class="card bg-white p-6 md:p-8 rounded-2xl shadow-sm">`.
  2. `templates/customers/register.bwt`:
     - Tương tự trang login, dùng Tailwind Grid 2 cột (form tạo tài khoản bên trái, banner giới thiệu bên phải).
  3. `templates/customers/addresses.bwt`:
     - Thay thế `row` và `col-*` trong danh sách sổ địa chỉ sang `grid grid-cols-1 md:grid-cols-2 gap-6`.
  4. `templates/customers/order.bwt` & `orders.bwt`:
     - Thay thế `row` trong thông tin đơn hàng và địa chỉ giao nhận sang Tailwind flex/grid.

---

### GIAI ĐOẠN 4: CHUẨN HOÁ GIỎ HÀNG & POP-UP MUA SẮM
- **Mục tiêu:** Tối ưu các bảng tính tiền, popup trả góp, modal mua nhanh không phụ thuộc class `row` / `col-*`.
- **Danh sách tập tin:**
  1. `templates/cart.bwt`:
     - Chuẩn hoá layout giỏ hàng (danh sách sản phẩm 8 cột / tổng tiền 4 cột) sang Tailwind Grid: `grid grid-cols-1 lg:grid-cols-12 gap-8`.
  2. `snippets/ajaxcart.bwt` & `snippets/cart_initial_ssr.bwt`:
     - Dọn dẹp các class Bootstrap cũ trong drawer giỏ hàng trượt.
  3. `snippets/popup_tragop.bwt`:
     - Thay thế modal trả góp sang flexbox/grid Tailwind.
  4. `snippets/quickview-buy.bwt` & `snippets/quickview-template.bwt`:
     - Chuẩn hoá popup xem nhanh sản phẩm.

---

### GIAI ĐOẠN 5: CHUẨN HOÁ TRANG NỘI DUNG & FORM DỊCH VỤ
- **Mục tiêu:** Tối ưu bài viết tin tức, trang đặt lịch tư vấn và trang đại lý B2B.
- **Danh sách tập tin:**
  1. `templates/article.bwt` & `templates/article.truoc-va-sau.bwt`:
     - Thay thế `row` / `col-lg-8` (nội dung bài viết) và `col-lg-4` (sidebar bài viết liên quan) sang Tailwind Grid: `grid grid-cols-1 lg:grid-cols-12 gap-8`.
  2. `templates/page.dat_lich_tu_van.bwt` & `templates/page.payment.bwt`:
     - Chuẩn hoá form đặt lịch khám và bảng thanh toán sang Tailwind Grid.
  3. `templates/page.dai-ly-b2b.bwt` & `snippets/collection_hero.bwt`:
     - Dọn dẹp các class `col-*` sang Tailwind flexbox / grid.

---

### GIAI ĐOẠN 6: KIỂM THỬ TOÀN DIỆN, THẨM ĐỊNH VISUAL & ĐÓNG GÓI
- **Mỗi giai đoạn sau khi code xong đều phải vượt qua:**
  1. `npm run build:pc`: Biên dịch Tailwind CSS sang `assets/pc-ui.css`.
  2. `npm run lint:guardrails`: Đảm bảo không phát sinh bất kỳ vi phạm mới nào về CSS tĩnh hay mã màu hardcode.
  3. `npm run build:sapo`: Đóng gói `exports/sapo-theme-1.0.0.zip` đạt chuẩn 100% Sapo Compatible (< 5MB).
  4. Chụp ảnh đối soát thực tế với Playwright trên cả 2 khung nhìn:
     - **Desktop 1440px**
     - **Mobile 390px**

---

## IV. KHU VỰC NGOẠI LỆ (KHÔNG CAN THIỆP)

- **MOPS Admin Portal:** [templates/page.mops-admin.bwt](file:///e:/PHARMA%20COSMETICS/websitePharmaCosmetics/templates/page.mops-admin.bwt) và các snippet [snippets/mops_admin_tab_*.bwt](file:///e:/PHARMA%20COSMETICS/websitePharmaCosmetics/snippets/).
  - *Lý do:* Đây là hệ thống ứng dụng quản trị nội bộ độc lập (có engine Vue/SPA, hệ thống icon Material Symbols và bảng biểu dữ liệu chuyên dụng). Không can thiệp vào khu vực này để bảo đảm tuyệt đối tính ổn định của hệ thống quản lý đơn/kho/vận chuyển.
