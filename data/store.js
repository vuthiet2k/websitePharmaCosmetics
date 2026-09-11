/**
 * data/store.js — Thông tin cửa hàng (giả lập Sapo `store` object)
 *
 * Khớp đầy đủ với Sapo Liquid `store` object:
 * https://support.sapo.vn/sapo-liquid/object/store
 */
module.exports = {
  store: {
    // ── Thông tin cơ bản ──────────────────────────────────────────────────
    name:             'PHARMA COSMETICS',
    description:      'Nền tảng online dược mỹ phẩm toàn cầu — chuẩn quốc tế, hiệu quả thực sự.',
    domain:           'pharmacosmetics-vn.mysapo.net',
    permanent_domain: 'pharmacosmetics-vn.bizwebvietnam.net',
    url:              'https://pharmacosmetics-vn.mysapo.net',
    email:            'info@pharmacosmetics-vn.com',
    address:          'Tầng 4, Tòa nhà Hanoi Group, 442 Đội Cấn, Ba Đình, Hà Nội',
    phone_number:     '0967 194 063',

    // ── Tiền tệ ───────────────────────────────────────────────────────────
    currency:                    'VND',
    currency_symbol:             '₫',
    money_format:                '{{ amount }}đ',
    money_with_currency_format:  '{{ amount }} VND',
    locale:                      'vi',
    country:                     'Việt Nam',

    // ── Thống kê ─────────────────────────────────────────────────────────
    products_count:    15,   // demo — store thật có nhiều hơn
    collections_count: 50,   // từ console log thực tế

    // ── Mật khẩu bảo vệ ──────────────────────────────────────────────────
    password_message: '',

    // ── Metafields (Sapo API only — để trống trong mock) ─────────────────
    metafields: {},

    // ── Nhà sản xuất / Thương hiệu (store.vendors) ───────────────────────
    // Dùng trong {% for v in store.vendors %} hoặc section marquee
    vendors: [
      'La Roche-Posay',
      'CeraVe',
      'The Ordinary',
      "Paula's Choice",
      'Skin1004',
      'COSRX',
      'Bioderma',
      'Avène',
      'Obagi Medical',
      'Hada Labo',
    ],

    // ── Loại sản phẩm (store.types) ──────────────────────────────────────
    // Dùng trong {% for t in store.types %}
    types: [
      'Kem dưỡng',
      'Serum',
      'Kem chống nắng',
      'Toner',
      'Mặt nạ',
      'Kem đặc trị',
      'Gel đặc trị',
      'Kem mắt',
      'Làm sạch',
    ],

    // ── Social (custom — không phải Sapo standard, dùng trong footer) ─────
    social: {
      facebook:  'https://facebook.com/pharmacosmetics.vn',
      instagram: 'https://instagram.com/pharmacosmetics.vn',
      youtube:   'https://youtube.com/@pharmacosmetics',
      tiktok:    'https://tiktok.com/@pharmacosmetics.vn',
    },
  },
};
