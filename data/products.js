/**
 * data/products.js — Sản phẩm THẬT của cửa hàng (giả lập Sapo `product` object)
 *
 * Nguồn: https://pharmacosmetics-vn.com/products.json?limit=250&page=N (endpoint công khai của Sapo)
 * Ngày lấy: 2026-11-17 — 5.586 sản phẩm, KHÔNG có sản phẩm giả/demo. Chạy lại script cào ⇒ ghi đè 2 file dữ liệu:
 *   - data/products-data.json     : metadata gọn (tên, alias, hãng, loại, tag, summary, ảnh, biến thể) — tên trường rút gọn
 *   - data/products-content.json.gz: HTML "Mô tả chi tiết" (product.content) — nạp TRỄ khi có template đọc, vì nặng (~36MB giải nén)
 * Ảnh: URL CDN bizweb.dktcdn.net/100/415/053/products/… (gốc, không kèm cỡ) — template gọi `| img_url: 'grande'`… và dev-server
 * đổi sang …/thumb/<cỡ>/… như Sapo. Không có trường nào do dev tự bịa (không đánh giá/bpr, không % đã bán).
 *
 * Cấu trúc mỗi product khớp trường dùng ở product_grid_office*.bwt, product.bwt (xem snippets/tab_product.bwt, pc_is_rx.bwt).
 * product.collections: preview-mock.js dựng từ data/collections.js (membership THẬT lấy ở /collections/<alias>/products.json).
 */
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const IMG_PREFIX = 'https://bizweb.dktcdn.net/100/415/053/products/';
const full = (s) => (s && !/^(https?:)?\/\//.test(s) ? IMG_PREFIX + s : s);

// Sapo gán giao diện riêng (Sản phẩm › Giao diện) — products.json KHÔNG trả trường này. 6 sản phẩm dưới đây là liệu trình/dịch vụ
// trên store thật đã dùng templates/product.lieu-trinh.bwt (xác nhận ở đợt dựng 2026-10-17, khớp id trên live).
const LIEU_TRINH_IDS = new Set([90539969, 60047072, 59349849, 59142604, 59000476, 59000102]);

// Nội dung HTML mô tả — nạp trễ lần đầu có template đọc `product.content` (gunzip ~1s), các lần sau dùng cache.
let contentMap = null;
function getContent(alias) {
  if (!contentMap) {
    try {
      contentMap = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'products-content.json.gz'))).toString('utf8'));
    } catch (e) {
      contentMap = {};
    }
  }
  return contentMap[alias] || '';
}

function makeVariant(v, options) {
  const [id, title, price, compare, sku, available, qty, img, o1, o2, o3] = v;
  const opts = [o1, o2, o3].filter((x) => x != null);
  return {
    id,
    title,
    option1: o1 != null ? o1 : title,
    option2: o2 != null ? o2 : null,
    option3: o3 != null ? o3 : null,
    // T-131: Bizweb.OptionSelectors đọc variant.options[] song song product.options[] — giữ đúng hình dạng Sapo.
    options: opts.length ? opts : [title],
    price,
    compare_at_price: compare || 0,
    available: !!available,
    sku,
    inventory_quantity: qty,
    inventory_policy: 'deny',
    featured_image: img ? { src: full(img) } : null,
  };
}

function makeProduct(r) {
  const variants = r.z.map((v) => makeVariant(v, r.o));
  const first = variants.find((v) => v.available) || variants[0];
  const images = r.m.map((src) => ({ src: full(src), alt: r.n }));
  const featuredSrc = r.f ? full(r.f) : (images[0] && images[0].src);
  const p = {
    id: r.i,
    name: r.n,
    alias: r.a,
    url: `/${r.a}`,
    description: '',
    summary: r.s,
    vendor: r.v || '',
    type: r.t || '',
    available: !!r.av,
    price: first.price,
    compare_at_price: first.compare_at_price,
    inventory_quantity: first.inventory_quantity,
    inventory_policy: 'deny',
    options: r.o && r.o.length ? r.o : ['Title'],
    template_suffix: LIEU_TRINH_IDS.has(r.i) ? 'lieu-trinh' : '',
    featured_image: featuredSrc ? { src: featuredSrc, alt: r.n } : null,
    images,
    tags: r.g,
    // preview-mock.js gán lại theo membership thật của data/collections.js khi dựng trang chi tiết.
    collections: [],
    variants,
    selected_or_first_available_variant: first,
    metafields: { custom: { Video: '', Quycach: '' } },
  };
  // `content` nặng ⇒ getter nạp trễ (enumerable để template/`| json` vẫn thấy như trường thường).
  Object.defineProperty(p, 'content', { enumerable: true, configurable: true, get: () => getContent(r.a) });
  return p;
}

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'products-data.json'), 'utf8'));
const products = raw.map(makeProduct);

const byId = {};
const byAlias = {};
products.forEach((p) => { byId[p.id] = p; byAlias[p.alias] = p; });

module.exports = { products, byId, byAlias };
