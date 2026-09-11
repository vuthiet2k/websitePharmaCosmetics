/**
 * preview-mock.js — Loader giả lập Sapo Liquid context cho dev-server.js
 *
 * Data thực được tách riêng trong data/ theo từng đối tượng:
 *   data/store.js           → store
 *   data/products.js        → products, byId, byAlias
 *   data/collections.js     → collectionsData, makeFallbackCollection
 *   data/navigation.js      → linklists
 *   data/pages.js           → pages
 *   data/cart.js            → cart
 *   data/articles.js        → articles, blogs, currentArticle
 *   data/settings-demo.js   → demoSettings, overrideSettings
 *
 * API công khai (không đổi — dev-server.js dùng):
 *   getContext(templateName) → object truyền vào LiquidJS engine
 *   settings                 → settings đang active (merged)
 *   store                    → thông tin cửa hàng
 */

const fs   = require('fs');
const path = require('path');

// Local-only environment overrides. Never commit .env; production theme
// settings remain unchanged and are not used as the local demo source.
function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return {};

  return fs.readFileSync(envPath, 'utf8').split(/\r?\n/).reduce((env, line) => {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || match[1].startsWith('#')) return env;
    env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    return env;
  }, {});
}

const localEnv = loadLocalEnv();

// ── 1. Settings thực từ configs/settings_data.json ────────────────────────
let realSettings = {};
try {
  const raw  = fs.readFileSync(path.join(__dirname, 'configs/settings_data.json'), 'utf8');
  const data = JSON.parse(raw.replace(/^﻿/, ''));  // strip BOM (Windows UTF-8-BOM)
  realSettings = data.current || {};
} catch (e) {
  console.warn('[mock] Không đọc được settings_data.json:', e.message);
}

// ── 2. Demo settings overlay (từ data/settings-demo.js) ───────────────────
const { demoSettings, overrideSettings } = require('./data/settings-demo');

// Merge: realSettings (cao nhất) > demoSettings (bổ sung) > overrideSettings (override UI)
// Thứ tự spread: overrideSettings ghi đè tất cả.
const settings = { ...demoSettings, ...realSettings, ...overrideSettings };
if (Object.prototype.hasOwnProperty.call(localEnv, 'MOPS_GAS_URL')) {
  settings.mops_gas_url = localEnv.MOPS_GAS_URL;
}

// ── 3. Data objects ───────────────────────────────────────────────────────
const { store }                            = require('./data/store');
const { products, byId, byAlias }          = require('./data/products');
const { collectionsData, makeFallbackCollection } = require('./data/collections');
const { linklists }                        = require('./data/navigation');
const { pages }                            = require('./data/pages');
const { cart }                             = require('./data/cart');
const { articles, blogs, currentArticle }  = require('./data/articles');
const { doctors }                          = require('./data/doctors');
const { testimonials: patientTestimonials } = require('./data/testimonials');
const { faqs }                             = require('./data/faqs');
const { loyaltyTiers }                     = require('./data/loyalty-tiers');
const { quizQuestions, quizResults }       = require('./data/quiz-questions');
const { b2bTiers }                         = require('./data/b2b-tiers');
const { ingredients }                      = require('./data/ingredients');
const { solutions, corePhilosophy }        = require('./data/solutions');

// Inject phone_number thực từ settings nếu có
if (settings.store_phone) store.phone_number = settings.store_phone;

// ── 4. Plain objects (LiquidJS không trigger Proxy.get cho dynamic key access)
//       → Dùng plain object với tất cả handles được populate sẵn.

// ── buildFlatObject: tạo plain object với fallback cho mọi key chưa biết ──

function buildLinklistsObj() {
  const obj = { ...linklists };
  // Thêm fallback cho mọi handle được tham chiếu trong settings
  Object.values(settings).forEach(v => {
    if (typeof v === 'string' && v && !obj[v]) {
      obj[v] = { title: v, handle: v, links: [] };
    }
  });
  return obj;
}

function buildPagesObj() {
  const obj = { ...pages };
  Object.values(settings).forEach(v => {
    if (typeof v === 'string' && v && !obj[v]) {
      obj[v] = { title: v, url: `/${v}`, alias: v, content: '', published: true };
    }
  });
  return obj;
}

function buildBlogsObj() {
  const obj = { ...blogs };
  Object.values(settings).forEach(v => {
    if (typeof v === 'string' && v && !obj[v]) {
      obj[v] = { title: v, handle: v, url: `/blogs/${v}`, articles: [] };
    }
  });
  return obj;
}

function buildCollectionsObj() {
  // Bắt đầu với các collections đã định nghĩa
  const obj = { ...collectionsData };

  // Với mọi string-value trong settings có thể là collection handle,
  // tự động thêm fallback → mock products vẫn render dù handle là handle thật của store
  Object.values(settings).forEach(v => {
    if (typeof v === 'string' && v && v !== 'none' && !obj[v] && !v.includes(' ') && !v.startsWith('#')) {
      obj[v] = makeFallbackCollection(v);
    }
  });

  return obj;
}

const linklistsObj   = buildLinklistsObj();
const pagesObj       = buildPagesObj();
const blogsObj       = buildBlogsObj();
const collectionsObj = buildCollectionsObj();

// ── 4.5 Mock customer (dùng cho preview customer/account, orders, addresses…)
//        Sapo trả customer = null khi guest. Chỉ inject mock khi đang preview
//        template trong nhóm CUSTOMER_TEMPLATES.
const CUSTOMER_TEMPLATES = new Set([
  'account', 'addresses', 'orders', 'order', 'change_password', 'reset_password',
  'page.patient-portal',
]);

function buildMockCustomer() {
  const addr1 = {
    id: 1,
    first_name: 'Hoàng',
    last_name: 'Nguyễn',
    name: 'Nguyễn Hoàng',
    address1: 'Số 12, Ngõ 88 Trung Kính',
    address2: 'Tầng 5, Tòa A',
    company: 'PHARMA COSMETICS',
    city: 'Hà Nội',
    district: 'Cầu Giấy',
    province: 'Hà Nội',
    country: 'Việt Nam',
    zip: '100000',
    phone: '0987 654 321',
    street: '88 Trung Kính',
    default: true,
  };
  const addr2 = {
    ...addr1, id: 2, default: false,
    address1: 'Lô A12 KĐT Vinhomes Smart City', address2: '',
    city: 'Hà Nội', district: 'Nam Từ Liêm', street: 'Đại Mỗ',
  };

  // Tạo line item từ product mock thứ `idx` → để khối "Mua lại" có nhiều SP khác nhau
  function lineFrom(idx, qty) {
    const p = products[idx] || products[0] || {};
    const v = (p.variants && p.variants[0]) || { id: 1001 + idx };
    return {
      id: 9001 + idx,
      title: p.name || ('Sản phẩm demo ' + (idx + 1)),
      variant_title: 'Default Title',
      variant_id: v.id || (1001 + idx),
      variant: v,
      sku: 'PC-DEMO-' + (idx + 1),
      quantity: qty || 1,
      price: p.price || 350000,
      image: p.featured_image || { src: '', alt: '' },
      product: { id: p.id || (idx + 1), name: p.name || 'Sản phẩm demo', url: p.url || '/products/demo' },
    };
  }
  const sampleLine = lineFrom(0, 2);

  const recentOrder = {
    id: 10025,
    name: '#ĐH10025',
    order_number: 10025,
    created_on: new Date(Date.now() - 2*24*60*60*1000).toISOString(), // 2 ngày trước
    cancelled: false,
    cancelled_on: null,
    cancel_reason: null,
    status: 'open',
    financial_status: 'paid',
    fulfillment_status: 'partial',
    shipping_status: 'delivering',
    email: 'hoang.nguyen@example.com',
    note: 'Giao giờ hành chính',
    gateway: 'cod',
    total_price: 700000,
    subtotal_price: 700000,
    total_line_items_price: 750000,
    total_discounts: 50000,
    shipping_price: 30000,
    customer_url: '/account/orders/10025',
    shipping_address: addr1,
    billing_address: addr1,
    line_items: [lineFrom(0, 1), lineFrom(1, 2), lineFrom(2, 1)],
    shipping_methods: [{ title: 'Giao hỏa tốc', price: 30000 }],
    discount: { code: 'WELCOME50', savings: 50000 },
    discounts: [{ code: 'WELCOME50', savings: 50000 }],
    transactions: [],
  };

  const olderOrder = {
    ...recentOrder,
    id: 10018, name: '#ĐH10018', order_number: 10018,
    created_on: new Date(Date.now() - 15*24*60*60*1000).toISOString(),
    financial_status: 'paid',
    shipping_status: 'delivered',
    fulfillment_status: 'fulfilled',
    line_items: [lineFrom(3, 1), lineFrom(4, 1)],
    customer_url: '/account/orders/10018',
    total_price: 1250000, subtotal_price: 1250000, total_line_items_price: 1250000, total_discounts: 0,
  };

  const cancelledOrder = {
    ...recentOrder,
    id: 10005, name: '#ĐH10005', order_number: 10005,
    created_on: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
    cancelled: true,
    cancelled_on: new Date(Date.now() - 29*24*60*60*1000).toISOString(),
    cancel_reason: 'customer changed/cancelled order',
    status: 'cancelled',
    shipping_status: 'cancelled',
    customer_url: '/account/orders/10005',
    total_price: 420000,
  };

  // Hai đơn active thêm (demo) → tổng 3 đơn đang xử lý/giao, để thấy "hiện N + (+M đơn khác)"
  const activeOrder2 = {
    ...recentOrder,
    id: 10031, name: '#ĐH10031', order_number: 10031,
    created_on: new Date(Date.now() - 1*24*60*60*1000).toISOString(),
    shipping_status: 'delivering', fulfillment_status: 'unfulfilled',
    customer_url: '/account/orders/10031', total_price: 540000,
    line_items: [lineFrom(1, 1)],
  };
  const activeOrder3 = {
    ...recentOrder,
    id: 10030, name: '#ĐH10030', order_number: 10030,
    created_on: new Date(Date.now() - 1*24*60*60*1000).toISOString(),
    shipping_status: null, fulfillment_status: 'unfulfilled', financial_status: 'pending',
    customer_url: '/account/orders/10030', total_price: 300000,
    line_items: [lineFrom(0, 1)],
  };

  return {
    id: 12345,
    first_name: 'Hoàng',
    last_name: 'Nguyễn',
    name: 'Nguyễn Hoàng',
    email: 'hoang.nguyen@example.com',
    phone: '0987 654 321',
    tier: 'Vàng',
    points: 10,
    accepts_marketing: true,
    has_account: true,
    addresses: [addr1, addr2],
    addresses_count: 2,
    default_address: addr1,
    orders: [recentOrder, activeOrder2, activeOrder3, olderOrder, cancelledOrder],
    orders_count: 5,
    last_order: recentOrder,
    total_spent: 1950000,
    tags: ['VIP', 'loyal-customer'],
  };
}

const mockCustomer = buildMockCustomer();

// ── 5. getContext(templateName, routeParams) ──────────────────────────────
// routeParams — chỉ được truyền bởi router pretty-URL thật (dev-server.js
// resolvePrettyPath) khi request đến từ 1 đường dẫn thật (/blogs/:h, /:alias,
// /search?query=...) thay vì toolbar ?tpl=. Khi không có routeParams (dùng
// toolbar) → giữ nguyên hành vi cũ hoàn toàn (suy luận từ templateName).
function getContext(templateName = 'index', routeParams = {}) {
  // Sản phẩm đơn dùng cho template product.bwt — ưu tiên alias thật từ URL.
  const currentProduct = routeParams.productAlias
    ? (byAlias[routeParams.productAlias] || products[0])
    : (byAlias[templateName] || products[0]);

  // `collection` chỉ có giá trị khi đang xem trang /collection — đúng hành vi Sapo thực.
  // Trên index / product / blog / ... → null.
  const collectionTemplates = ['collection', 'collection.skinhealthy'];
  const currentCollection = routeParams.collectionHandle
    ? (collectionsObj[routeParams.collectionHandle] || makeFallbackCollection(routeParams.collectionHandle))
    : (collectionTemplates.includes(templateName)
      ? (collectionsData[templateName] || collectionsData['all'])
      : null);

  // Customer chỉ inject khi đang preview trang account/orders/addresses…
  // Trên các trang khác giữ null để khớp behavior Sapo thực (guest).
  const currentCustomer = CUSTOMER_TEMPLATES.has(templateName) ? mockCustomer : null;

  // Order context cho template 'order' (chi tiết đơn) — Sapo inject vào ctx.order
  const currentOrder = templateName === 'order' ? mockCustomer.orders[0] : null;

  // Sapo đặt template = 'customers/<name>' cho trang tài khoản (khác tên tpl param).
  // header_style.bwt nạp page_account.scss qua {% if template contains 'customers' %}
  // → phải khớp giá trị này, nếu không CSS account sẽ KHÔNG load trong preview.
  const sapoTemplate = CUSTOMER_TEMPLATES.has(templateName) ? ('customers/' + templateName) : templateName;

  // Trang tĩnh (page.*) → inject page object (Sapo inject {{ page.name }}, {{ page.content }}, ...)
  const PAGE_NAMES = {
    'page':                          'Demo Page',
    'page.indexskinhealthy':         'Skin Healthy',
    'page.skinhealthy-services':     'Dịch vụ Skin Healthy',
    'page.skinhealthy-service-detail': 'Chi tiết dịch vụ',
    'page.payment':                  'Đặt lịch & Thanh toán',
    'page.order-lookup':             'Tra cứu đơn hàng',
    'page.order-tracking':           'Theo dõi đơn hàng',
    'page.mops-admin':               'MOPS Admin',
  };
  const currentPage = (templateName === 'page' || templateName.startsWith('page.'))
    ? {
        name:    PAGE_NAMES[templateName] || templateName,
        content: '<p>Nội dung trang demo.</p>',
        alias:   templateName.replace(/^page\.?/, '') || 'page',
        url:     '/' + (templateName.replace(/^page\.?/, '') || ''),
      }
    : null;

  // Blog/article — ưu tiên handle thật từ URL (/blogs/:handle, /blogs/:handle/:article).
  const currentBlog = routeParams.blogHandle
    ? (blogsObj[routeParams.blogHandle] || blogsObj['tin-tuc'])
    : blogsObj['tin-tuc'];
  let resolvedArticle = currentArticle;
  if (routeParams.articleHandle) {
    const allArticles = Object.values(blogsObj).flatMap((b) => b.articles || []);
    resolvedArticle = allArticles.find((a) => a.handle === routeParams.articleHandle) || currentArticle;
  }

  // Search — thật theo query string khi router truyền vào; nếu không (toolbar
  // ?tpl=search) giữ nguyên demo tĩnh cũ.
  let search;
  if (Object.prototype.hasOwnProperty.call(routeParams, 'searchQuery')) {
    const raw = routeParams.searchQuery || '';
    const q = raw.toLowerCase().trim();
    const searchType = routeParams.searchType === 'article' ? 'article' : 'product';
    const results = !q ? [] : (searchType === 'article'
      ? Object.values(blogsObj).flatMap((b) => b.articles || []).filter((a) => a.title.toLowerCase().includes(q))
      : products.filter((p) => p.name.toLowerCase().includes(q)));
    search = { performed: true, terms: raw, types: [searchType], results, results_count: results.length };
  } else {
    search = { results: products.slice(0, 6), results_count: products.length, terms: 'demo', performed: false, types: ['product'] };
  }

  return {
    // Core Sapo globals
    settings,
    store,
    template:         sapoTemplate,
    page_title:       store.name,
    page_description: store.description,
    canonical_url:    `https://${store.domain}/`,
    current_page:     1,
    current_tags:     [],
    content_for_header: '',
    content_for_layout: '',
    country_option_tags: '<option value="Việt Nam" selected>Việt Nam</option>', // stub cho {% form customer_address %} preview

    // Auth
    customer: currentCustomer,

    // Order (chỉ trên template order detail)
    order: currentOrder,

    // Cart — routeParams.cartOverride (giỏ hàng thật lưu trong cookie, xem
    // dev-server.js readCartCookie) ghi đè giỏ hàng demo tĩnh khi có.
    cart: routeParams.cartOverride || cart,

    // Navigation
    linklists: linklistsObj,

    // Static pages
    page:  currentPage,
    pages: pagesObj,

    // Blog
    blogs:   blogsObj,
    blog:    currentBlog,
    article: resolvedArticle,
    articles,

    // Product / Collection context
    product:     currentProduct,
    collection:  currentCollection,
    collections: collectionsObj,

    // Search
    search,

    // Trang chuyên gia / loyalty / booking FAQ / AI quiz
    doctors,
    patient_testimonials: patientTestimonials,
    faqs,
    loyalty_tiers: loyaltyTiers,
    quiz_questions: quizQuestions,
    quiz_results: quizResults,

    // REOPEN 2026-09-10 (ADR-007/T-80/T-82) — B2B distribution + ingredient lookup
    b2b_tiers: b2bTiers,
    ingredients,
    solutions,
    core_philosophy: corePhilosophy,

    // Pagination
    paginate: {
      current_page: 1,
      pages:        Math.ceil(products.length / 12),
      items:        products.length,
      page_size:    12,
      next:     { url: '?page=2', title: 'Trang sau' },
      previous: { url: null,      title: 'Trang trước' },
    },

    // Errors
    errors: null,
  };
}

// byAlias/collectionsData/blogsObj — export thêm để dev-server.js (resolvePrettyPath)
// kiểm tra tồn tại 1 slug khi định tuyến URL đẹp (/:alias, /collections/:handle,
// /blogs/:handle) mà không phải require lại từng file data/ riêng lẻ.
module.exports = { getContext, settings, store, byAlias, collectionsData, blogsObj, linklistsObj };
