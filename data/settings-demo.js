/**
 * data/settings-demo.js — Settings bổ sung cho preview (KHÔNG sửa settings_data.json)
 *
 * Các key ở đây sẽ được MERGE lên settings thực (configs/settings_data.json > current).
 * Chỉ chứa những key CHƯA có trong settings_data.json hiện tại,
 * hoặc cần override cho mục đích preview giao diện mới.
 *
 * Ưu tiên: settings thực > demoSettings (settings_data.json luôn thắng nếu đã có key).
 * Để override ngược lại, di chuyển key cần test vào overrideSettings bên dưới.
 */

// ── Bổ sung (merge sau settings thực) ────────────────────────────────────────
const demoSettings = {

  // ── section_featured_products (Sản phẩm nổi bật — Swiper) ───────────────
  home_featured_collection:  'san-pham-ban-chay-noi-bat',
  home_featured_title:       'Sản phẩm bán chạy nhất',
  home_featured_subtitle:    'Được chuyên gia da liễu kiểm chứng — hiệu quả thực sự.',
  home_featured_eyebrow:     'Best Sellers',
  home_featured_limit:       10,
  home_featured_viewall_text:'Xem tất cả',

  // ── section_product_1 (Sản phẩm nổi bật — legacy grid) ──────────────────
  title_col_1:            'Sản phẩm bán chạy nổi bật',
  section_col_1:          'san-pham-ban-chay-noi-bat',
  section_col_1_limit:    8,
  product1_enable:        false,
  product_1_menu_enable:  false,

  // ── section_product_2 (Serum nổi bật — legacy grid) ─────────────────────
  title_col_2:            'Serum nổi bật',
  section_col_2:          'top-san-pham-serum-ban-chay',
  section_col_2_limit:    8,
  product2_enable:        false,
  product_2_menu_enable:  false,

  // ── section_flash_sale ───────────────────────────────────────────────────
  home_flashsale_collection:        'flash-sale-1',
  home_flashsale_title:             'Flash Sale Hôm Nay',
  home_flashsale_limit:             8,
  home_flashsale_countdown_enable:  true,
  home_flashsale_countdown_title:   'Kết thúc sau:',
  home_flashsale_countdown_end:     '2026-12-31T23:59:59',

  // ── section_product_tab_1 ────────────────────────────────────────────────
  section_tab_1_title:    'Mua sắm theo nhu cầu',
  section_tab_1_col_1:    'top-kem-duong-noi-bat',
  section_tab_1_name_1:   'Kem dưỡng',
  section_tab_1_col_2:    'da-mun-dau',
  section_tab_1_name_2:   'Da mụn & dầu',
  section_tab_1_col_3:    'top-san-pham-serum-ban-chay',
  section_tab_1_name_3:   'Serum',
  section_tab_1_col_4:    'top-kem-chong-nang-noi-bat',
  section_tab_1_name_4:   'Chống nắng',
  section_tab_1_limit:    8,

  // ── section_product_viewed ───────────────────────────────────────────────
  viewed_eyebrow:         'Gần đây',
  viewed_title:           'Sản phẩm đã xem',

  // ── section_blog ─────────────────────────────────────────────────────────
  section_blog_title:     'Kiến thức skincare',
  section_blog_col:       'tin-tuc',
  section_blog_limit:     3,

  // ── section_category ────────────────────────────────────────────────────
  section_cate_title:     'Danh mục sản phẩm',
  section_cate_menu:      'danh-muc',

  // ── section_collection_bestseller (Best Seller trong trang Collection) ───
  col_bestseller_col:     'flash-sale-1',
  col_bestseller_tag:     'ban-chay',
  col_bestseller_eyebrow: 'Bán chạy nhất',
  col_bestseller_title:   'Khách hàng yêu thích trong danh mục này',
  col_bestseller_viewall: 'Xem tất cả',

  // ── Quickview & Wishlist ─────────────────────────────────────────────────
  quickview_enable:       true,
  iwish_enable:           true,
  metafield_show:         false,

  // ── pc-section_hero ───────────────────────────────────────────────────────
  home_hero_badge:          'Dược mỹ phẩm chuẩn quốc tế',
  home_hero_title:          'Chăm sóc da <em>khoa học</em><br>Tự tin mỗi ngày',
  home_hero_desc:           'Sản phẩm được chuyên gia da liễu kiểm chứng. Thành phần hoạt tính nồng độ cao — hiệu quả thực sự, không phô trương.',
  home_hero_btn1_text:      'Khám phá ngay',
  home_hero_btn1_url:       '/san-pham-noi-bat',
  home_hero_btn2_text:      'Tư vấn miễn phí',
  home_hero_btn2_url:       '/lien-he',

  // ── pc-section_stats ─────────────────────────────────────────────────────
  home_stat_1_target: 98,    home_stat_1_suffix: '%',  home_stat_1_label: 'Khách hàng hài lòng',
  home_stat_2_target: 15,    home_stat_2_suffix: '+',  home_stat_2_label: 'Thương hiệu độc quyền',
  home_stat_3_target: 10000, home_stat_3_suffix: '+',  home_stat_3_label: 'Đơn hàng mỗi tháng',
  home_stat_4_text:   '24/7',                           home_stat_4_label: 'Hỗ trợ tư vấn',

  // ── pc-section_solutions ─────────────────────────────────────────────────
  solutions_title:    'Giải pháp theo vấn đề da',
  solutions_subtitle: 'Tìm đúng sản phẩm cho từng mối lo của làn da bạn.',
  solutions_enable_1: true, solutions_icon_1: 'fa-solid fa-circle-dot', solutions_label_1: 'Trị mụn',       solutions_url_1: '/tri-mun',
  solutions_enable_2: true, solutions_icon_2: 'fa-solid fa-sun',         solutions_label_2: 'Trị nám',       solutions_url_2: '/tri-nam',
  solutions_enable_3: true, solutions_icon_3: 'fa-solid fa-face-smile',  solutions_label_3: 'Chống lão hoá', solutions_url_3: '/chong-lao-hoa',
  solutions_enable_4: true, solutions_icon_4: 'fa-solid fa-droplet',     solutions_label_4: 'Dưỡng ẩm',     solutions_url_4: '/duong-am',
  solutions_enable_5: true, solutions_icon_5: 'fa-solid fa-shield',      solutions_label_5: 'Chống nắng',   solutions_url_5: '/chong-nang',
  solutions_enable_6: true, solutions_icon_6: 'fa-solid fa-leaf',        solutions_label_6: 'Phục hồi',     solutions_url_6: '/duong-am',

  // ── pc-section_brand_marquee ──────────────────────────────────────────────
  display_brand_1:  true,  brand_1_link:  'san-pham-ban-chay-noi-bat',
  display_brand_2:  true,  brand_2_link:  'da-mun-dau',
  display_brand_3:  true,  brand_3_link:  'phuc-hoi-sau-xam-lan',
  display_brand_4:  true,  brand_4_link:  'top-san-pham-serum-ban-chay',
  display_brand_5:  true,  brand_5_link:  'top-kem-chong-nang-noi-bat',
  display_brand_6:  true,  brand_6_link:  'top-kem-duong-noi-bat',
  display_brand_7:  true,  brand_7_link:  'top-san-pham-toner-noi-bat',
  display_brand_8:  true,  brand_8_link:  'top-san-pham-sua-rua-mat-noi-bat',
  display_brand_9:  true,  brand_9_link:  'cham-soc-da-vung-mat-ban-chay',
  display_brand_10: true,  brand_10_link: 'top-bo-san-pham-ban-chay',

  // ── section_footer_categories (Mega Footer SEO — render từ linklist 'footer-categories') ──
  footer_cate_enable:   true,
  footer_cate_title:    'DANH MỤC SẢN PHẨM',
  footer_cate_subtitle: '',
  footer_cate_menu:     'footer-categories',

  // ── Tra cứu hàng đầu (footer top-search) — bật để xem trong preview ──
  enable_top_search:    true,
  title_top_search_2:   'Tra cứu hàng đầu',

  // ── Skin Healthy pages ────────────────────────────────────────────────────
  skinhealthy_services_groups_menu: 'skinhealthy-services',
  skinhealthy_col_maintenance:      'dieu-tri-chuyen-nghiep',
  skinhealthy_col_targeted:         'tri-nam',
  skinhealthy_col_invasive:         'tri-mun',
  skinhealthy_programs_url:         '/lieu-trinh',
  skinhealthy_services_url:         '/skinhealthy-services',
  // Ưu tiên env (build:vercel / preview có .env với real GAS URL); demo fallback nếu thiếu.
  // Xem .env.example — copy sang .env và điền Web App URL được phép trước khi build staging.
  mops_gas_url:                     process.env.MOPS_GAS_URL || 'https://script.google.com/macros/s/demo/exec',

};

// ── Override mạnh (luôn thắng settings thực — dùng khi test UI mới) ──────────
const overrideSettings = {
  // Ví dụ: ép màu chủ đạo để test palette mới
  // main_color: '#0a3d62',
  // sub_color:  '#1e5f74',
};

module.exports = { demoSettings, overrideSettings };
