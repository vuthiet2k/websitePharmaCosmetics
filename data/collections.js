/**
 * data/collections.js — Bộ sưu tập (danh mục) THẬT (giả lập Sapo `collections` object)
 *
 * Nguồn: https://pharmacosmetics-vn.com/ — 456 danh mục trong sitemap_collections_1.xml; tên (h1), ảnh danh mục (CDN bizweb) lấy từ
 * trang /<alias>, danh sách sản phẩm THẬT (đúng thứ tự live) lấy từ /collections/<alias>/products.json. Ngày lấy: 2026-11-17.
 * Dữ liệu thô: data/collections-data.json ({ alias: { id, name, description, image, products: [alias sản phẩm] } }).
 *
 * Số liệu khớp live: 16 ô hoạt chất trang chủ (RETINOL 55 SP, HYALURONIC ACID (HA) 29, TRETINOIN 19, …), 8 thương hiệu tiêu biểu
 * (OBAGI CLINICAL 35, SKINCEUTICALS 29, ZO SKIN HEALTH 45, MESOESTETIC 62, MARTIDERM 40, IS CLINICAL 19, HISTOLAB 65, IMAGE SKINCARE 102).
 * `id`: Sapo không lộ id danh mục ra HTML/JSON công khai — id cũ giữ lại nếu đã biết từ lần dựng trước, còn lại là số nội bộ preview
 * (≥ 7.000.000) chỉ để template không gặp id rỗng; không dùng làm dữ liệu thật.
 * Không có danh mục nào được gán sản phẩm "demo": thiếu thì rỗng.
 */
const { products, byAlias } = require('./products');
const raw = require('./collections-data.json');

const uniq = (arr) => [...new Set(arr.filter(Boolean))];

function makeCollection(handle, r, internalId) {
  const list = r.products.map((a) => byAlias[a]).filter(Boolean);
  return {
    id:              r.id || internalId,
    name:            r.name,
    alias:           handle,
    url:             `/${handle}`,
    description:     r.description || '',
    products_count:  list.length,
    products:        list,
    // Sapo: collection.image là object { src, alt } (chuỗi trần ⇒ ô ảnh danh mục mất ảnh).
    image:           r.image ? { src: r.image, alt: r.name } : null,
    all_vendors:     uniq(list.map((p) => p.vendor)),
    all_types:       uniq(list.map((p) => p.type)),
    current_vendor:  null,
    current_type:    null,
    default_sort_by: 'manual',
    template_layout: 'collection',
    tags:            uniq(list.flatMap((p) => p.tags || [])),
  };
}

const collectionsData = {};
Object.keys(raw).forEach((handle, i) => {
  collectionsData[handle] = makeCollection(handle, raw[handle], 7000000 + i);
});

// Sapo luôn có collection "all" (/collections/all) chứa toàn bộ sản phẩm — không nằm trong sitemap.
// products_count = số thật (5.586). `products` chỉ giữ ALL_PREVIEW_LIMIT sản phẩm đầu: dev-server (thẻ paginate) KHÔNG cắt trang như
// Sapo, nên đưa cả 5.586 SP vào sẽ render ~24MB / ~100s mỗi lần mở /collections/all. Các danh mục khác để nguyên membership thật.
const ALL_PREVIEW_LIMIT = 120;
collectionsData.all = {
  id: 0, name: 'Tất cả sản phẩm', alias: 'all', url: '/collections/all', description: '',
  products_count: products.length, products: products.slice(0, ALL_PREVIEW_LIMIT), image: null,
  all_vendors: uniq(products.map((p) => p.vendor)), all_types: uniq(products.map((p) => p.type)),
  current_vendor: null, current_type: null, default_sort_by: 'created-desc', template_layout: 'collection',
  tags: [],
};

// ── Factory fallback ──────────────────────────────────────────────────────
// Slug không phải danh mục thật trên live (trang tĩnh/chính sách do Sapo Admin › Trang nội dung quản lý, hoặc link menu trỏ tới
// slug chưa tạo). Không tự gán sản phẩm: products rỗng, tên lấy từ nhãn menu điều hướng (có dấu) nếu có, không thì dùng slug.
let _navTitleBySlug = null;
function getNavTitleBySlug(handle) {
  if (!_navTitleBySlug) {
    _navTitleBySlug = new Map();
    let linklists;
    try { ({ linklists } = require('./navigation')); } catch (e) { linklists = null; }
    const visit = (link) => {
      if (link && typeof link.url === 'string' && link.title) {
        const seg = link.url.replace(/^\/+|\/+$/g, '');
        if (seg && !seg.includes('/') && !_navTitleBySlug.has(seg)) _navTitleBySlug.set(seg, link.title);
      }
      (link && link.links ? link.links : []).forEach(visit);
    };
    Object.values(linklists || {}).forEach((ll) => (ll && ll.links ? ll.links : []).forEach(visit));
  }
  return _navTitleBySlug.get(handle) || null;
}

function makeFallbackCollection(handle) {
  return {
    id: 0, name: getNavTitleBySlug(handle) || handle, alias: handle, url: `/${handle}`,
    description: '', products_count: 0, products: [], image: null,
    all_vendors: [], all_types: [], current_vendor: null, current_type: null,
    default_sort_by: 'created-desc', template_layout: 'collection', tags: [],
  };
}

module.exports = { collectionsData, makeFallbackCollection };
