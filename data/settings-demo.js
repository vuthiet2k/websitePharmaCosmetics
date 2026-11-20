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
  home_flashsale_title:             'Flash sale',
  home_flashsale_limit:             8,
  home_flashsale_countdown_enable:  true,
  home_flashsale_countdown_title:   'Thời gian khuyến mãi',

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
  section_blog_col:       'tin-tuc-va-kien-thuc',
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
  home_hero_title:          'Chăm sóc da <em>khoa học</em><br>Tự tin mỗi ngày',
  home_hero_btn1_text:      'Khám phá ngay',
  home_hero_btn1_url:       '/san-pham-noi-bat',



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
  skinhealthy_col_maintenance:      'dieu-tri-chuyen-nghiep',
  skinhealthy_col_targeted:         'tri-nam',
  skinhealthy_col_invasive:         'tri-mun',
  skinhealthy_programs_url:         '/lieu-trinh',
  skinhealthy_services_url:         '/skinhealthy-services',
  // Ưu tiên env (build:vercel / preview có .env với real GAS URL); thiếu thì để trống (không dùng URL giả).
  // Xem .env.example — copy sang .env và điền Web App URL được phép trước khi build staging.
  mops_gas_url:                     process.env.MOPS_GAS_URL || '',

};

// ── Override mạnh (luôn thắng settings thực — dùng khi test UI mới) ──────────
const overrideSettings = {
  // 2026-11-18 (M-07): popup ảnh THẬT trên live (#modal-banner, https://pharmacosmetics-vn.com/ — ảnh nằm trong <script
  // type="text/x-custom-template">). settings_data.json đang để popup_banner_enable=false và chưa có ảnh nên phải ghi đè ở đây
  // (settings thật thắng demoSettings) để dev-server hiện đúng như live. Nguồn: phase/mobile-parity-2026-11/du-lieu/06-popup-canh-bao.json
  popup_banner_enable: true,
  popup_banner_url:    '/', // ảnh popup trỏ về trang chủ LOCAL (không nhảy sang live)
  // Trang chủ live hiển thị đúng 16 hoạt chất (menu 'mua-sam-theo-thanh-phan' có 29) ⇒ dùng menu 16 mục như live
  home_ing_menu:       'hoat-chat-trang-chu',
  popup_banner_image:  'https://bizweb.dktcdn.net/thumb/large/100/415/053/theme_temp/1180781/assets/798396ba-50c3-41aa-a587-79cb680df688-1-d33312b9-e283-47f9-94c1-dfeaae78e5af.jpg',
};

module.exports = { demoSettings, overrideSettings };
