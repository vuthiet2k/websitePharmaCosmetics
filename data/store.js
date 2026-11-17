/**
 * data/store.js — Thông tin cửa hàng THẬT (giả lập Sapo `store` object)
 *
 * Nguồn: https://pharmacosmetics-vn.com/ (JSON-LD HealthAndBeautyBusiness, chân trang, products.json) — lấy 2026-11-17.
 * vendors / types / products_count / collections_count được suy từ CHÍNH catalog thật (data/products.js, data/collections.js)
 * để luôn khớp; email/điện thoại/địa chỉ/mạng xã hội chép từ trang live.
 */
const _p = require('./products').products;
const _uniqSorted = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
module.exports = {
  store: {
    // ── Thông tin cơ bản ──────────────────────────────────────────────────
    name:             'PHARMA COSMETICS',
    description:      'Nền tảng online dược mỹ phẩm toàn cầu — chuẩn quốc tế, hiệu quả thực sự.',
    domain:           'pharmacosmetics-vn.com',
    permanent_domain: 'pharmacosmetics-vn.bizwebvietnam.net',
    url:              'https://pharmacosmetics-vn.com',
    email:            'support@pharmacosmetics-vn.com',
    address:          'Số 897 Đường Giải Phóng, Phường Giáp Bát, Quận Hoàng Mai, Thành phố Hà Nội',
    phone_number:     '0967 194 063',

    // ── Tiền tệ ───────────────────────────────────────────────────────────
    currency:                    'VND',
    currency_symbol:             '₫',
    // 2026-10-16: theo định dạng VNĐ của Sapo (không số lẻ, dấu chấm ngăn nghìn, ký hiệu ₫ tách bằng khoảng trắng)
    // — trên Sapo thật giá trị này do Admin › Cấu hình › Định dạng tiền tệ quyết định.
    money_format:                '{{amount_no_decimals_with_comma_separator}} ₫',
    money_with_currency_format:  '{{amount_no_decimals_with_comma_separator}} VND',
    locale:                      'vi',
    country:                     'Việt Nam',

    // ── Thống kê (suy từ catalog thật) ───────────────────────────────────
    products_count:    _p.length,
    collections_count: 456,   // số URL trong sitemap_collections_1.xml của store thật (2026-11-17)

    // ── Mật khẩu bảo vệ ──────────────────────────────────────────────────
    password_message: '',

    // ── Metafields (Sapo API only — để trống trong mock) ─────────────────
    metafields: {},

    // ── Nhà sản xuất / Thương hiệu (store.vendors) — toàn bộ vendor thật trong catalog ─────
    vendors: _uniqSorted(_p.map((x) => x.vendor)),

    // ── Loại sản phẩm (store.types) — toàn bộ product_type thật ──────────
    types: _uniqSorted(_p.map((x) => x.type)),

    // ── Social (custom — dùng trong footer): chỉ các kênh LIVE có link ───
    social: {
      facebook:  'https://www.facebook.com/pharmacosmeticsvn',
      instagram: 'https://www.instagram.com/pharmacosmeticsvietnam',
      zalo:      'https://zalo.me/0967194063',
    },
  },
};
