# Đối chiếu 7 Nhóm Cấu hình Tiêu chuẩn → Section trang chủ → File snippet

Nguồn đối chiếu: `Báo Cáo Kiểm Thử UI_UX & Đối Chiếu Snippets Codebase - Hugo Theme Sept 2026.md` (mục 6.2).
Hiện trạng code: nhánh `hugo-theme-sept2026`, bố cục **Home Portal v3**.

> **Quyết định chốt:** giữ nguyên id biến sẵn có của theme, **không** tạo mới bộ `mops_*` như báo cáo đề xuất.
> Lý do: tiền tố `mops_` trong repo này đã thuộc về khu vực MOPS Admin/OMS (`mops_stores`, `mops_gas_url`,
> `mops_admin_primary`…). Đặt thêm `mops_hero_*`, `mops_color_*` sẽ trùng chức năng với `theme_*` / `portal_*`
> đang chạy và làm mất hiệu lực dữ liệu Admin đã lưu.

---

## 1. Ánh xạ 7 nhóm của báo cáo sang nhóm schema thật

| Nhóm trong báo cáo | Biến báo cáo đề xuất | Nhóm thật trong `settings_schema.json` | Biến thật đang dùng |
| :-- | :-- | :-- | :-- |
| **1. Nhận diện & Màu sắc** | `mops_logo`, `mops_favicon`, `mops_color_primary/accent/bg` | `[0] Theme & Màu sắc` | `favicon.png`, `theme_main_color`, `theme_sub_color`, `theme_body_text_color`, `theme_body_bg`, **`theme_forest_color`**, **`theme_secondary_green`**, **`theme_dark_color`**, **`theme_page_background`** |
| **2. Header, Hotline & Điều hướng** | `mops_header_sticky`, `mops_hotline_*`, `mops_menu_main` | `[2] Header & Điều hướng` | `header_topbar_text`, **`header_topbar_label`**, **`header_topbar_autoplay`**, **`header_topbar_delay`**, `store_phone`, menu chính |
| **3. Trang chủ & Hero** | `mops_hero_*`, `mops_featured_collection` | `[1] Home Portal v3` + `[3] Trang chủ` + `[21] Home Portal — Hoạt chất` | `portal_hero_*`, `home_hero_*`, `home_featured_*`, **`portal_chapter_1/2/3`**, **`portal_shop_btn_text`**, **`portal_clinic_btn_text`** |
| **4. Khảo sát da & Đặt lịch** | `mops_booking_*` | `[1] Home Portal v3` (phần đặt lịch) + `[13] Liên hệ & Hỗ trợ` + `[16] Skin Healthy` | **`portal_booking_text`**, **`portal_booking_url`**, `title_dat_lich_form`, `dat_lich_hotline`, `contact_zalo`, `skinhealthy_booking_page` |
| **5. Đội ngũ chuyên gia** | `mops_doctor_*` | `[14] Trang Về chúng tôi` | `about_expert_1..4_{img,name,role,desc}` — **không hiển thị trên trang chủ v3** |
| **6. Thanh toán & VietQR** | `mops_vietqr_*` | *(chưa có)* | Chưa triển khai — xem mục 5 |
| **7. Chân trang & Pháp lý** | `mops_footer_*` | `[11] Chân trang` | `footer_legal_license_date`, `footer_legal_license_issuer`, nhóm `footer_*` (92 trường) |

**In đậm** = biến vừa được bổ sung vào schema trong lần cập nhật này.

> ⚠️ **Danh xưng:** báo cáo dùng "Bác sĩ" (`mops_doctor_*`, "Bảng điều khiển dành cho đại lý/Bác sĩ").
> Theme áp **RULE-P0-02**: dùng **"Chuyên gia"**, không dùng "Bác sĩ". Các biến hiện có đã đúng
> (`about_expert_*`, label "Chuyên gia 1 — Tên"). `scripts/compliance-lint.js` sẽ cảnh báo nếu vi phạm.

---

## 2. Ma trận 12 Section trang chủ → File snippet → Biến cấu hình

Thứ tự lấy từ `home_section_1..18` trong `settings_data.json`, lọc qua whitelist trong `snippets/home_portal.bwt`.

| # | Section | File snippet | Nhóm | Biến cấu hình |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Hero | `section_hero.bwt` | 3 | `portal_hero_visual`, `portal_hero_highlight`, `home_hero_{badge,title,desc,image,btn1_text,btn1_url,btn2_text,btn2_url}` |
| 2 | Chương I — Ngã ba Shop/Clinic | `section_portal_split.bwt` | 1, 3 | `portal_chapter_1`, `portal_shop_{url,title,desc,btn_text}`, `portal_clinic_{title,desc,btn_text}`, `home_spa_btn_url`, `store_name` |
| 3 | Giải pháp theo tình trạng da | `section_solutions.bwt` | 3 | `home_solutions_{eyebrow,title,subtitle,menu}` |
| 4 | Flash Sale | `section_flash_sale.bwt` | 3 | `home_flashsale_{collection,limit,title,countdown_*}`, `promo_coupon_home_enable` |
| 5 | Sản phẩm nổi bật | `section_featured_products.bwt` | 3 | `home_featured_{collection,limit,eyebrow,title,subtitle,viewall_text}` |
| 6 | Chương II — Skin Health Beauty | `section_spa.bwt` | 3, 4 | `portal_chapter_2`, `portal_clinic_{chips,desc}`, `home_spa_{eyebrow,title,desc,btn_text,btn_url}`, `home_hero_btn1_{text,url}` |
| 7 | Thương hiệu tiêu biểu | `section_brand_marquee.bwt` | 3 | `home_brand_{lead,title,url,viewall_text,menu}`, `portal_shop_url` |
| 8 | Minh chứng khách hàng | `section_testimonials.bwt` | 3 | `home_testi_{eyebrow,title,subtitle,disclaimer}` |
| 9 | Hoạt chất / Khoa học | `section_ingredients.bwt` | 3 | `home_ing_{eyebrow,title,subtitle,menu}` |
| 10 | Chương III — Blog | `section_portal_blog.bwt` | 3 | `portal_chapter_3`, `portal_blog{,_eyebrow,_title,_menu}`, `section_blog_url` |
| 11 | Mạng xã hội + Đặt lịch | `section_portal_social.bwt` | 1, 4 | `portal_social_{eyebrow,desc}`, `portal_booking_{text,url}`, `store_name`, `footer_social_*` |
| 12 | Đăng ký bản tin | `section_portal_newsletter.bwt` | 3 | `portal_newsletter_{action,title,desc}` |

Dùng chung toàn trang (ngoài 12 section trên):

| Vùng | File snippet | Nhóm | Biến |
| :-- | :-- | :-- | :-- |
| Topbar thông báo | `site_topbar.bwt` | 2 | `header_topbar_{text,label,autoplay,delay}`, `store_phone` |
| Design token thương hiệu | `storefront_theme.bwt` | 1 | `theme_{main_color,forest_color,secondary_green,dark_color,page_background}` |
| Khung section + chống trùng slot | `home_portal.bwt` | 3 | `home_section_1..18` |

---

## 3. Đã sửa trong lần cập nhật này

### `configs/settings_schema.json` — thêm 22 trường, sửa 4 default

**Nhóm 1** (`[0] Theme & Màu sắc`) — 4 biến màu mà `storefront_theme.bwt` đang gọi nhưng chưa khai báo,
nên Admin không chỉnh được, toàn bộ design token v3 bị khoá cứng ở giá trị mặc định:
`theme_forest_color` `#003F2D`, `theme_secondary_green` `#075B40`, `theme_dark_color` `#002E23`,
`theme_page_background` `#F4F7F4`.

Sửa 4 default còn sót từ theme gốc mua sẵn (màu đỏ/cam/kem, không phải brand Pharma Cosmetics).
Dữ liệu thật trong `settings_data.json` đã đúng nên **site đang chạy không đổi gì**; chỉ ảnh hưởng
khi Admin bấm khôi phục mặc định hoặc khi cài mới:

| Biến | Default cũ | Default mới |
| :-- | :-- | :-- |
| `theme_main_color` | `#8d251c` | `#3CB371` |
| `theme_sub_color` | `#faa519` | `#1F5A3B` |
| `theme_body_text_color` | `#333333` | `#13241F` |
| `theme_body_bg` | `#f1e8d7` | `#F5F6F1` |

**Nhóm 2** — `header_topbar_label`, `header_topbar_autoplay`, `header_topbar_delay`.

**Nhóm 3** — `portal_chapter_1/2/3`, `portal_shop_btn_text`, `portal_clinic_btn_text`,
`home_brand_{lead,title,url,viewall_text}`, `home_solutions_eyebrow`, `home_spa_eyebrow`,
`home_testi_disclaimer`, `portal_social_eyebrow`.

**Nhóm 4** — `portal_booking_text`, `portal_booking_url`.

Mọi `default` trong schema được đặt **đúng bằng** giá trị `| default:` mà snippet đang dùng, nên
giao diện hiện tại không đổi — chỉ khác ở chỗ Admin đã chỉnh được.

### Snippet — bỏ hardcode

| File | Trước | Sau |
| :-- | :-- | :-- |
| `section_portal_split.bwt` | `<div class="kicker">Pharma Cosmetics</div>` | đọc từ `settings.store_name` |
| `section_portal_social.bwt` | `<p class="eyebrow">Theo dõi hành trình mỗi ngày</p>` | đọc từ `settings.portal_social_eyebrow` |
| `section_portal_social.bwt` | Nút `Đặt lịch tư vấn →`, link mượn `home_hero_btn1_url` | `portal_booking_text` + `portal_booking_url`, vẫn fallback về `home_hero_btn1_url` |

Không đổi: `home_brand_url` và `portal_booking_url` cố ý **không đặt default** để giữ nguyên chuỗi
fallback đang chạy (`home_brand_url` → `portal_shop_url` → `/collections/all`).

---

## 4. Sai lệch của báo cáo so với repo thật

Báo cáo mô tả cấu trúc **trước** Home Portal v3 và có một số chi tiết không khớp:

- Báo cáo ghi repo có **76 file `.bwt`** — thực tế **115**.
- **7/21 snippet báo cáo nêu tên không tồn tại**: `subheader.bwt`, `salemodule.bwt`,
  `product-item-flashsale.bwt`, `product-grid-item.bwt`, `suggest_search.bwt`,
  `sample_product_item.bwt`, `mops_admin_config.bwt`.
- Ma trận "18 Section trang chủ" của báo cáo trộn lẫn section trang chủ với thành phần toàn site
  (giỏ hàng, footer, script). Trang chủ v3 thực tế có **12 section** — xem mục 2.
- Báo cáo gán Hero cho `salemodule.bwt` / `pc_clinical_components.bwt`; thực tế Hero nằm ở
  `section_hero.bwt`, còn `pc_clinical_components.bwt` chỉ cung cấp component dùng lại.

Vì vậy mục 2 của tài liệu này thay thế ma trận 18 dòng trong báo cáo.

---

## 5. Còn thiếu — chưa làm lần này

**Ngoài phạm vi trang chủ** (5 biến đang được gọi nhưng chưa khai báo trong schema):

| Biến | File | Nhóm |
| :-- | :-- | :-- |
| `footer_support_3_enable`, `footer_support_4_enable`, `fot_social` | `footer.bwt` | 7 |
| `home_page_keywords`, `sale_pop` | `theme.bwt` | SEO / popup |

**Nhóm 6 — Thanh toán & VietQR:** theme chưa có biến nào. Cần `vietqr_bank_code`,
`vietqr_account_no`, `vietqr_account_name`, `vietqr_auto_approve` và điểm gắn trong luồng
giỏ hàng (`vat-cart.bwt` / trang thanh toán). Đây là việc của luồng thanh toán, không phải trang chủ.

**Nhóm 5 — Đội ngũ chuyên gia:** dữ liệu `about_expert_*` chỉ hiển thị ở trang *Về chúng tôi*.
Muốn có khối chuyên gia trên trang chủ thì phải dựng section mới — là thêm tính năng,
không nằm trong phạm vi "đưa dữ liệu vào đúng chỗ".

**Các lỗi BUG-07 / UX-01 / UI-FALLBACK / A11Y-01 / TYPO-CTA** ở mục 3 báo cáo: chưa xử lý lần này.
Riêng **UI-FALLBACK** đã có cơ chế sẵn trong `layouts/theme.bwt` (gỡ `srcset`/`data-srcset` rồi
thay `no-image.jpg`) và trong `section_portal_blog.bwt`.
