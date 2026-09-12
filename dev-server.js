/**
 * Dev Preview Server — PHARMA COSMETICS
 * ──────────────────────────────────────
 * Chạy: npm run preview   (hoặc node dev-server.js)
 * Mở:   http://localhost:3000
 *
 * - Parse .bwt (Liquid) bằng LiquidJS + mock data từ preview-mock.js
 * - Watch toàn bộ .bwt, settings_data.json → tự reload browser qua WebSocket
 * - Phục vụ file tĩnh trong assets/ (CSS, JS, ảnh)
 */

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const { Liquid, Tag, evalToken, Tokenizer } = require('liquidjs');
const chokidar   = require('chokidar');
const { WebSocketServer } = require('ws');
const sass       = require('sass');

const ROOT = __dirname;

// ── Load .env vào process.env (2026-08-04) ───────────────────────────────
// Zero-dep parser (không thêm dotenv để giữ deps tối thiểu). Cho phép build:vercel
// và preview inject MOPS_GAS_URL/... vào Liquid render qua process.env.
// Không throw nếu thiếu .env — chỉ log warn để dev không cần .env khi làm UI thuần.
(function loadDotEnv() {
  try {
    var envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    var src = fs.readFileSync(envPath, 'utf8');
    src.split(/\r?\n/).forEach(function(line) {
      var m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) return;
      var key = m[1], val = m[2];
      // Bỏ quotes nếu có
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    });
  } catch (e) { console.warn('[dev-server] Không đọc được .env:', e.message); }
})();

const PORT = Number(process.env.PORT) || 3000;
const WS_PORT = Number(process.env.WS_PORT) || 3001;
const IS_STATIC_EXPORT = process.env.STATIC_EXPORT === 'true';
// Vercel set process.env.VERCEL='1' tự động lúc runtime — dùng để tắt hẳn dev
// toolbar (badge live-reload + script kết nối ws://localhost:WS_PORT không hề
// tồn tại trên serverless, gây spam lỗi console vô hạn — xem REOPEN 2026-09-11).
const IS_PROD_SERVER = !!process.env.VERCEL;

// ── Sapo Liquid syntax preprocessor ───────────────────────────────────────
// Sapo dùng một số syntax không chuẩn mà LiquidJS không hỗ trợ.
// Preprocessor này chạy trước khi LiquidJS parse template.
function preprocessBwt(content) {
  // Strip Sapo-specific {% layout 'name' %} — dev-server handles layout routing separately
  content = content.replace(/\{%-?\s*layout\s+['"][^'"]*['"]\s*-?%\}/g, '');
  // Sapo dùng {%elseif%} thay vì {% elsif %} chuẩn Liquid
  content = content.replace(/\{%-?\s*elseif\b/g, '{%- elsif');
  return content.replace(/(\{%-?[\s\S]*?-?%\}|\{\{-?[\s\S]*?-?\}\})/g, (match) => {
    return match
      // JS-style logical operators → Liquid keywords
      .replace(/\|\|/g, ' or ')
      .replace(/&&/g,  ' and ')
      // Sapo so sánh boolean dưới dạng string: false == 'false' → false == false
      // LiquidJS dùng strict equality: false !== 'false' → phải chuyển về literal
      .replace(/==\s*'false'/g,  '== false')
      .replace(/==\s*"false"/g,  '== false')
      .replace(/!=\s*'false'/g,  '!= false')
      .replace(/!=\s*"false"/g,  '!= false')
      .replace(/==\s*'true'/g,   '== true')
      .replace(/==\s*"true"/g,   '== true')
      .replace(/!=\s*'true'/g,   '!= true')
      .replace(/!=\s*"true"/g,   '!= true');
  });
}

// ── Custom fs adapter: intercept file reads để preprocess trước khi parse ──
const TEMPLATE_DIRS = [
  path.join(ROOT, 'snippets'),
  path.join(ROOT, 'templates'),
  path.join(ROOT, 'layouts'),
  path.join(ROOT, 'assets'),
  // case-insensitive aliases (Windows)
  path.join(ROOT, 'Snippets'),
  path.join(ROOT, 'Templates'),
  path.join(ROOT, 'Layouts'),
  path.join(ROOT, 'Assets'),
];

const liquidFs = {
  sep: path.sep,
  exists(file) {
    return fs.existsSync(file);
  },
  resolve(root, file, ext) {
    const withExt = file.endsWith(ext) ? file : file + ext;
    if (path.isAbsolute(withExt)) return withExt;
    return path.resolve(root, withExt);
  },
  readFile(file) {
    return Promise.resolve(preprocessBwt(fs.readFileSync(file, 'utf8')));
  },
};

// ── LiquidJS engine ────────────────────────────────────────────────────────
const engine = new Liquid({
  root: TEMPLATE_DIRS,
  extname: '.bwt',
  strictFilters: false,
  strictVariables: false,
  relativeReference: false,
  fs: liquidFs,
});

// ── Custom Liquid block tags (Sapo-specific, không có trong LiquidJS core) ──
// paginate: tag đặc trưng của Sapo/Shopify — giới hạn số item/trang và cung cấp
// đối tượng `paginate` (pages, current_page, parts...).
// Trong dev preview, không phân trang thật — hiện toàn bộ dữ liệu mock (pages=1).
class PaginateTag extends Tag {
  constructor(token, remainTokens, liquid, parser) {
    super(token, remainTokens, liquid);
    this.byExpr = null;
    try {
      const byMatch = /\bby\s+(\S+(?:\.\S+)*)/.exec(token.args);
      if (byMatch) {
        const tok = new Tokenizer(byMatch[1], liquid.options);
        this.byExpr = tok.readValue();
      }
    } catch (_) { /* ignore — dùng pageSize mặc định 12 */ }

    this.templates = [];
    const stream = parser.parseStream(remainTokens)
      .on('tag:endpaginate', () => stream.stop())
      .on('template', (tpl) => this.templates.push(tpl))
      .on('end', () => { throw new Error(`tag ${token.getText()} not closed`); });
    stream.start();
  }

  *render(ctx, emitter) {
    let pageSize = 12;
    if (this.byExpr) {
      try {
        const val = yield evalToken(this.byExpr, ctx);
        pageSize = parseInt(String(val)) || 12;
      } catch (_) { /* giữ default */ }
    }
    ctx.push({
      paginate: {
        pages: 1,
        current_page: 1,
        page_size: pageSize,
        items: 0,
        previous: false,
        next: false,
        parts: [],
      },
    });
    yield this.liquid.renderer.renderTemplates(this.templates, ctx, emitter);
    ctx.pop();
  }
}
engine.registerTag('paginate', PaginateTag);

// form: tag Sapo cho biểu mẫu (customer_address, customer_login...). Preview chỉ cần
// passthrough: bọc <form> + bind đối tượng `form` (từ arg thứ 2 nếu có, vd address).
class FormTag extends Tag {
  constructor(token, remainTokens, liquid, parser) {
    super(token, remainTokens, liquid);
    this.objExpr = null;
    try {
      const parts = token.args.split(',');
      if (parts.length > 1) {
        const tok = new Tokenizer(parts.slice(1).join(',').trim(), liquid.options);
        this.objExpr = tok.readValue();
      }
    } catch (_) { /* không có arg thứ 2 → form rỗng */ }
    this.templates = [];
    const stream = parser.parseStream(remainTokens)
      .on('tag:endform', () => stream.stop())
      .on('template', (tpl) => this.templates.push(tpl))
      .on('end', () => { throw new Error(`tag ${token.getText()} not closed`); });
    stream.start();
  }
  *render(ctx, emitter) {
    let formObj = {};
    if (this.objExpr) {
      try { formObj = (yield evalToken(this.objExpr, ctx)) || {}; } catch (_) { formObj = {}; }
    }
    emitter.write('<form accept-charset="UTF-8" class="preview-form" method="post">');
    ctx.push({ form: formObj });
    yield this.liquid.renderer.renderTemplates(this.templates, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  }
}
engine.registerTag('form', FormTag);

// ── Custom Liquid filters (Sapo-specific) ──────────────────────────────────
engine.registerFilter('img_tag', (url, alt) => {
  if (!url) return '';
  return `<img src="${url}" alt="${alt || ''}">`;
});
engine.registerFilter('asset_url', (src) => {
  if (!src) return '';
  // Trả về route nội bộ /assets/<file>
  return `/assets/${src}`;
});

engine.registerFilter('img_url', (src, size) => {
  // Sapo img objects ({ src, alt }) hoặc string URL — xử lý cả hai
  const url = src && typeof src === 'object' ? (src.src || '') : (src || '');
  if (!url || url.startsWith('http')) return url;
  // Placeholder cho ảnh CDN (asset local, relative path)
  const dim = typeof size === 'string' && size.includes('x')
    ? size
    : '400x400';
  return `https://placehold.co/${dim}/e8f5e9/3cb371?text=img`;
});

engine.registerFilter('money', (price) => {
  if (price == null) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(price)) + ' ₫';
});

engine.registerFilter('stylesheet_tag', (url) => {
  if (!url) return '';
  return `<link rel="stylesheet" href="${url}">`;
});

engine.registerFilter('script_tag', (url) => {
  if (!url) return '';
  return `<script src="${url}"></script>`;
});

engine.registerFilter('url_encode',   (v) => encodeURIComponent(String(v || '')));
engine.registerFilter('url_decode',   (v) => decodeURIComponent(String(v || '')));
engine.registerFilter('strip_html',   (v) => String(v || '').replace(/<[^>]+>/g, ''));
engine.registerFilter('escape',       (v) => String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
engine.registerFilter('link_to',      (v, url) => `<a href="${url}">${v}</a>`);
engine.registerFilter('link_to_vendor', (v) => {
  const name = String(v || '');
  return `<a href="/collections/vendors?q=${encodeURIComponent(name)}" title="${name}">${name}</a>`;
});
engine.registerFilter('link_to_type', (v) => {
  const name = String(v || '');
  return `<a href="/collections/types?q=${encodeURIComponent(name)}" title="${name}">${name}</a>`;
});
engine.registerFilter('date',         (v, fmt) => {
  try {
    return new Date(v).toLocaleDateString('vi-VN');
  } catch { return String(v || ''); }
});
engine.registerFilter('json', (v) => JSON.stringify(v));

// ── Load mock context (reload khi settings thay đổi) ──────────────────────
let mockModule = null;
function loadMock() {
  // Xóa cache preview-mock + TẤT CẢ module trong data/ (nested require)
  // để khi sửa data/*.js hoặc settings-demo.js là reload được, không cần restart.
  const dataDir = path.join(ROOT, 'data');
  Object.keys(require.cache).forEach((key) => {
    if (key === require.resolve('./preview-mock') || key.startsWith(dataDir)) {
      delete require.cache[key];
    }
  });
  mockModule = require('./preview-mock');

  // Zero-Wait Path (2026-08-10): env vars override settings — cho phép build:vercel + local preview
  // dùng GAS_URL / EDGE_URL từ .env thay vì phải nhồi vào settings_data.json.
  if (mockModule && mockModule.settings) {
    if (process.env.MOPS_GAS_URL || process.env.GAS_URL) {
      mockModule.settings.mops_gas_url = process.env.MOPS_GAS_URL || process.env.GAS_URL;
    }
    if (process.env.MOPS_EDGE_URL) {
      mockModule.settings.mops_edge_url = process.env.MOPS_EDGE_URL;
    }
  }
}
loadMock();

// ── Asset compiler (SCSS .bwt → CSS, JS .bwt → JS) ────────────────────────
// Cache: key = request filename (e.g. "main.scss.css"), value = { content, mime }
const assetCache = new Map();

/**
 * Đánh giá một Liquid expression đơn giản (dùng trong asset SCSS/JS).
 * Hỗ trợ: settings.key, 'string', filters: default, asset_url, upcase, downcase, strip
 */
function evalLiquidExpr(expr, settings) {
  // Tách expression và filter chain: "settings.key | default: '#fff' | upcase"
  const parts = expr.split('|').map(s => s.trim());
  const rawExpr = parts[0];
  const filters = parts.slice(1);

  // Lấy giá trị gốc
  let value;
  if (/^settings\.(\w+)$/.test(rawExpr)) {
    const key = rawExpr.match(/^settings\.(\w+)$/)[1];
    value = settings[key] ?? null;
  } else if (/^['"](.+)['"]$/.test(rawExpr)) {
    value = rawExpr.replace(/^['"]|['"]$/g, '');
  } else {
    value = null;
  }

  // Áp dụng filters
  for (const filter of filters) {
    if (/^default\s*:\s*(.+)$/.test(filter)) {
      const fallbackRaw = filter.match(/^default\s*:\s*(.+)$/)[1].trim();
      if (value === null || value === undefined || value === '') {
        if (/^settings\.(\w+)$/.test(fallbackRaw)) {
          const fbKey = fallbackRaw.match(/^settings\.(\w+)$/)[1];
          value = settings[fbKey] ?? '';
        } else {
          value = fallbackRaw.replace(/^['"]|['"]$/g, '');
        }
      }
    } else if (filter === 'asset_url') {
      value = `/assets/${value}`;
    } else if (filter === 'upcase') {
      value = String(value).toUpperCase();
    } else if (filter === 'downcase') {
      value = String(value).toLowerCase();
    } else if (filter === 'strip') {
      value = String(value).trim();
    }
    // stylesheet_tag / script_tag: ignore in SCSS context (handled separately)
  }

  return value ?? '';
}

/**
 * Thay thế tất cả Liquid output tags {{ ... }} trong SCSS/JS bằng giá trị thực.
 * Sau đó xóa tất cả Liquid block tags {% ... %}.
 */
function replaceLiquidInAsset(src, settings) {
  // Thay tất cả {{ ... }} bằng giá trị đã evaluate
  src = src.replace(/\{\{-?\s*([\s\S]+?)\s*-?\}\}/g, (match, expr) => {
    return String(evalLiquidExpr(expr.trim(), settings));
  });

  // Xóa Liquid block tags: {% if %} {% for %} {% assign %} v.v.
  // (dùng non-greedy, multiline)
  src = src.replace(/\{%-?[\s\S]*?-?%\}/g, '');

  return src;
}

/**
 * Compile một asset file theo tên request (e.g. "main.scss.css").
 * Tìm file .bwt tương ứng, replace Liquid, compile nếu là SCSS.
 */
async function compileAsset(requestedName) {
  if (assetCache.has(requestedName)) return assetCache.get(requestedName);

  const assetsDir = path.join(ROOT, 'assets');
  const settings  = mockModule.settings;

  // ── Tìm file nguồn ────────────────────────────────────────────────────────
  let srcPath = null;
  let mime    = 'text/plain';
  let isScss  = false;

  if (requestedName.endsWith('.scss.css')) {
    // main.scss.css → main.scss.bwt
    const bwtName = requestedName.replace(/\.css$/, '.bwt');
    const candidate = path.join(assetsDir, bwtName);
    if (fs.existsSync(candidate)) { srcPath = candidate; mime = 'text/css'; isScss = true; }

  } else if (requestedName.endsWith('.css')) {
    // File CSS thuần (bootstrap-4-3-min.css, bpr-products-module.css, v.v.)
    const direct = path.join(assetsDir, requestedName);
    if (fs.existsSync(direct)) { srcPath = direct; mime = 'text/css'; }
    // .css.bwt fallback
    else {
      const bwt = path.join(assetsDir, requestedName + '.bwt');
      if (fs.existsSync(bwt)) { srcPath = bwt; mime = 'text/css'; }
    }

  } else if (requestedName.endsWith('.js')) {
    // jquery.js → jquery.js.bwt
    const bwt = path.join(assetsDir, requestedName + '.bwt');
    if (fs.existsSync(bwt)) { srcPath = bwt; mime = 'application/javascript'; }
    else {
      const direct = path.join(assetsDir, requestedName);
      if (fs.existsSync(direct)) { srcPath = direct; mime = 'application/javascript'; }
    }

  } else {
    // File tĩnh: ảnh, font, v.v.
    const direct = path.join(assetsDir, requestedName);
    if (fs.existsSync(direct)) { srcPath = direct; mime = guessMime(requestedName); }
  }

  if (!srcPath) return null;

  // ── Đọc và xử lý ──────────────────────────────────────────────────────────
  const raw = fs.readFileSync(srcPath, 'utf8');

  let content = raw;
  let isBinary = false;

  // Chỉ xử lý text files
  const ext = path.extname(requestedName).toLowerCase();
  if (['.png','.jpg','.jpeg','.gif','.webp','.woff','.woff2','.ttf','.eot'].includes(ext)) {
    isBinary = true;
  }

  // Vendor bundles are already compiled JavaScript. Passing a minified bundle
  // through Liquid corrupts syntax that happens to resemble Liquid output
  // delimiters (for example Vue's production build).
  const isRawVendorAsset = requestedName === 'vue.global.prod.js';
  if (!isBinary && !isRawVendorAsset) {
    // Dùng LiquidJS engine.parseAndRender để xử lý TẤT CẢ Liquid ({% assign %}, loops, v.v.)
    try {
      const ctx = mockModule.getContext('index');
      // Thêm settings trực tiếp vào top-level để {{ settings.xxx }} hoạt động
      content = await engine.parseAndRender(raw, { ...ctx, settings });
    } catch (liqErr) {
      console.warn(`[liquid] ${requestedName}: ${liqErr.message} — fallback to regex`);
      content = replaceLiquidInAsset(raw, settings);
    }

    if (isScss) {
      try {
        const result = sass.compileString(content, {
          style: 'compressed',
          sourceMap: false,
          loadPaths: [assetsDir],
          logger: sass.Logger.silent,
        });
        content = result.css;
      } catch (sassErr) {
        console.error(`[sass] Lỗi compile ${requestedName}:`, sassErr.message);
        content = `/* SASS COMPILE ERROR in ${requestedName}: ${sassErr.message} */`;
      }
    }
  }

  const result = { content: isBinary ? null : content, srcPath, mime, isBinary };
  assetCache.set(requestedName, result);
  console.log(`[asset] compile OK: ${requestedName} (${isScss ? 'SCSS→CSS' : mime})`);
  return result;
}

function guessMime(name) {
  const ext = path.extname(name).toLowerCase();
  return {
    '.css': 'text/css', '.js': 'application/javascript',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
    '.json': 'application/json',
  }[ext] || 'text/plain';
}

// ── Dev toolbar injection ──────────────────────────────────────────────────
function devToolbarStyle() {
  return `<style>
  #dev-toolbar {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;
    background: #1e1e2e; color: #cdd6f4; font-family: monospace;
    font-size: 13px; padding: 6px 16px;
    display: flex; align-items: center; justify-content: space-between;
    border-top: 2px solid #89b4fa;
  }
  #dev-toolbar .status { display: flex; align-items: center; gap: 8px; }
  #dev-toolbar .dot {
    width: 8px; height: 8px; border-radius: 50%; background: #a6e3a1;
    animation: blink 2s infinite;
  }
  #dev-toolbar .dot.error { background: #f38ba8; animation: none; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  #dev-toolbar select {
    background: #313244; color: #cdd6f4; border: 1px solid #45475a;
    border-radius: 4px; padding: 2px 6px; font-size: 12px; cursor: pointer;
  }
  #dev-toolbar .tpl-badge {
    background: #313244; padding: 2px 8px; border-radius: 4px;
    color: #89b4fa; font-size: 12px;
  }
  #reload-badge {
    background: #f9e2af; color: #1e1e2e; padding: 2px 10px;
    border-radius: 4px; font-size: 12px; display: none;
  }
  body { padding-bottom: 42px !important; }
</style>`;
}

function devToolbarHtml(tpl) {
  const groups = [
    { label: 'Templates', items: [
      ['index',      'index (Trang chủ)'],
      ['product',    'product (Sản phẩm)'],
      ['collection', 'collection (Danh mục)'],
      ['cart',       'cart (Giỏ hàng)'],
      ['blog',       'blog (Blog)'],
      ['article',    'article (Bài viết)'],
      ['page',       'page (Trang tĩnh)'],
      ['search',     'search (Tìm kiếm)'],
      ['404',        '404 (Không tìm thấy)'],
      ['account',    'account (Tài khoản)'],
      ['orders',     'orders (Lịch sử đơn hàng)'],
      ['order',      'order (Chi tiết đơn)'],
      ['addresses',  'addresses (Sổ địa chỉ)'],
      ['login',      'login (Đăng nhập)'],
      ['register',   'register (Đăng ký)'],
    ]},
    { label: 'Skin Healthy', items: [
      ['page.indexskinhealthy',           'SH · Trang chủ'],
      ['page.skinhealthy-services',       'SH · Dịch vụ'],
      ['page.skinhealthy-service-detail', 'SH · Chi tiết dịch vụ'],
      ['collection.skinhealthy',          'SH · Collection'],
    ]},
    { label: 'MOPS', items: [
      ['page.payment',       'MOPS · Đặt lịch / Thanh toán'],
      ['page.order-lookup',  'MOPS · Tra cứu đơn'],
      ['page.order-tracking','MOPS · Theo dõi đơn'],
      ['page.mops-admin',    'MOPS · Admin'],
    ]},
    { label: 'Trang mới (Figma)', items: [
      ['page.chuyen-gia',    'Trang chuyên gia'],
      ['page.loyalty',       'Loyalty Rewards'],
      ['page.ai-skin-quiz',  'AI Skin Quiz'],
      ['page.dat_lich_tu_van','Đặt lịch khám (+ FAQ)'],
      ['page.patient-portal', 'Patient Clinical Portal'],
      ['page.seo-directory', 'SEO Directory'],
      ['blog.instagram-feed', 'Blog · Instagram Feed (Mobile/Tablet)'],
      ['article', 'Article Detail'],
    ]},
  ];
  const options = groups.map(({ label, items }) =>
    `<optgroup label="${label}">${items.map(([v, l]) =>
      `<option value="${v}"${tpl===v?' selected':''}>${l}</option>`).join('')}</optgroup>`
  ).join('');
  return `<!-- ░░ DEV TOOLBAR ░░ -->
<div id="dev-toolbar">
  <div class="status">
    <div class="dot" id="ws-dot"></div>
    <span id="ws-label">Đang kết nối...</span>
    <span id="reload-badge">🔄 Đã reload</span>
  </div>
  <div style="display:flex;align-items:center;gap:12px;">
    <span>Template:</span>
    <select id="tpl-select" onchange="var v=this.value;location.href=(v==='page.mops-admin'?'/mops-admin':'/?tpl='+v)">${options}</select>
    <span class="tpl-badge">localhost:${PORT}</span>
  </div>
</div>
<script>
(function() {
  const dot   = document.getElementById('ws-dot');
  const label = document.getElementById('ws-label');
  const badge = document.getElementById('reload-badge');
  function connect() {
    const ws = new WebSocket('ws://localhost:${WS_PORT}');
    ws.onopen = () => { dot.classList.remove('error'); label.textContent = 'Live — đang watch .bwt'; };
    ws.onmessage = (e) => {
      if (e.data === 'reload') { badge.style.display = 'inline'; setTimeout(() => location.reload(), 150); }
      if (e.data === 'error')  { dot.classList.add('error'); label.textContent = 'Lỗi render — xem console terminal'; }
    };
    ws.onclose = () => { dot.classList.add('error'); label.textContent = 'Mất kết nối — đang thử lại...'; setTimeout(connect, 2000); };
  }
  connect();
})();
</script>
<script>
/* ── DEV PREVIEW: Bypass lazyBlockProduct IntersectionObserver ──────────────
   lazyBlockProduct (assets/index.js) renders products only when the section
   scrolls into view. In dev preview we inject them immediately instead.
   This script runs after index.js defines lazyBlockProduct but before
   $(document).ready() callbacks fire — so the override takes effect. */
(function() {
  function devInject(sectionName, callback) {
    var sectionEl = document.querySelector('.' + sectionName);
    if (!sectionEl) return;
    var tmplEl = document.querySelector('script[data-template="' + sectionName + '"]');
    var containerEl = sectionEl.querySelector('[data-section="' + sectionName + '"]');
    if (tmplEl && containerEl) {
      containerEl.innerHTML = tmplEl.innerHTML;
    }
    if (typeof callback === 'function') {
      try { callback(); } catch (e) { console.warn('[dev] callback error in ' + sectionName + ':', e.message); }
    }
  }

  // Override global lazyBlockProduct before $(document).ready() callbacks fire
  window.lazyBlockProduct = function(sectionName, rootMargin, callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { devInject(sectionName, callback); });
    } else {
      devInject(sectionName, callback);
    }
  };

  // Fallback: after full load, force-inject any section still showing skeleton items.
  // REOPEN 2026-09-11: đây gần như LUÔN LÀ đường chạy thật (không phải fallback hiếm gặp) —
  // assets/index.js được nạp với defer, nên function lazyBlockProduct(){} khai báo global
  // của nó chạy SAU script override này (override chạy inline ngay khi parse, defer chạy
  // ngay trước DOMContentLoaded) và ghi đè lại window.lazyBlockProduct = bản thật (dùng
  // IntersectionObserver thật, không bao giờ tự kích hoạt khi preview không scroll) trước khi
  // section kịp gọi. Vì nhánh devInject() phía trên gần như không bao giờ chạy được, khối
  // fallback này phải tự re-init Swiper sau khi bơm HTML — nếu không, slide có trong DOM
  // nhưng Swiper chưa từng init nên layout sụp (không có transform/flex, trông như trống rỗng).
  window.addEventListener('load', function() {
    document.querySelectorAll('script[type="text/x-custom-template"][data-template]').forEach(function(tmplEl) {
      var sn = tmplEl.getAttribute('data-template');
      var sectionEl = document.querySelector('.' + sn);
      if (!sectionEl) return;
      var containerEl = sectionEl.querySelector('[data-section="' + sn + '"]');
      if (containerEl && containerEl.querySelector('.item_null')) {
        containerEl.innerHTML = tmplEl.innerHTML;
        console.log('[dev] force-injected:', sn);
        if (typeof Swiper !== 'undefined') {
          sectionEl.querySelectorAll('.swiper-container, .swiper').forEach(function(swiperEl) {
            if (swiperEl.swiper) return;
            try {
              new Swiper(swiperEl, {
                slidesPerView: 2,
                spaceBetween: 16,
                observer: true,
                observeParents: true,
                navigation: {
                  nextEl: swiperEl.querySelector('[class*="__next"], .swiper-button-next'),
                  prevEl: swiperEl.querySelector('[class*="__prev"], .swiper-button-prev'),
                },
                pagination: {
                  el: swiperEl.querySelector('[class*="__pagination"], .swiper-pagination'),
                  clickable: true,
                },
                breakpoints: {
                  480: { slidesPerView: 2, spaceBetween: 12 },
                  768: { slidesPerView: 3, spaceBetween: 16 },
                  993: { slidesPerView: 4, spaceBetween: 20 },
                },
              });
            } catch (e) { console.warn('[dev] swiper re-init failed for ' + sn + ':', e.message); }
          });
        }
      }
    });
  });
})();
</script>`;
}

// ── DEV ONLY: Fake app block — Most Viewed Products ───────────────────────
function devMostViewHtml() {
  const products = [
    {
      href: '/azelderm-20-krem-azelaic-aicd-30g-kem-tri-mun',
      img: 'https://bizweb.dktcdn.net/thumb/large/100/415/053/products/thiet-ke-chua-co-ten-2024-11-25t145955-840.png?v=1773033389693',
      alt: 'AZELDERM 20% KREM AZELAIC AICD 30g',
      name: 'AZELDERM 20% KREM AZELAIC AICD 30g / KEM TRỊ MỤN, LÀM SÁNG VÀ ĐỀU MÀU DA',
      price: '576.000₫', oldPrice: '985.000₫', variantId: '129663001',
    },
    {
      href: '/tretinoin-cream-usp-padagis-giai-phap-chuyen-sau-cho-mun-tham-lao-hoa-da',
      img: 'https://bizweb.dktcdn.net/thumb/large/100/415/053/products/09t84cartontube.png?v=1777434418733',
      alt: 'TRETINOIN CREAM, USP PADAGIS',
      name: 'TRETINOIN CREAM, USP PADAGIS: Giải Pháp Chuyên Sâu Cho Mụn, Thâm & Lão Hóa Da',
      price: '1.690.000₫', oldPrice: null, viewOnly: true,
    },
    {
      href: '/clascon-cream-clascoterone-1-dot-pha-moi-trong-dieu-tri-mun-noi-tiet-giam-nhon',
      img: 'https://bizweb.dktcdn.net/thumb/large/100/415/053/products/kho-ng-co-tie-u-de-1-55183c59-e375-4b63-9ed4-74d4a5b36bda.jpg?v=1773033411343',
      alt: 'CLASCON CREAM (CLASCOTERONE 1%)',
      name: 'CLASCON CREAM (CLASCOTERONE 1%): Đột Phá Mới Trong Điều Trị Mụn Nội Tiết & Giảm Nhờn',
      price: '750.000₫', oldPrice: '980.000₫', variantId: '180270618',
    },
    {
      href: '/sensilis-azelaic-peel-dung-dich-dieu-tiet-ba-nhon-giam-do-va-lam-mo-tham-cho-da-nhay-cam',
      img: 'https://bizweb.dktcdn.net/thumb/large/100/415/053/products/z7622714336177-f05693ac0e7450b1f054a920354c6fa0.jpg?v=1773563205580',
      alt: 'Sensilis Azelaic [Peel]',
      name: 'Sensilis Azelaic [Peel]: Dung Dịch Điều Tiết Bã Nhờn, Giảm Đỏ Và Làm Mờ Thâm Cho Da Nhạy Cảm',
      price: '780.000₫', oldPrice: null, variantId: '194806419',
    },
  ];

  const slides = products.map(p => `
    <div class="most-view-product-element swiper-slide" style="width:280px;margin-right:20px;">
      <a href="${p.href}">
        <div class="most-view-product-img">
          <img src="${p.img}" alt="${p.alt}" loading="lazy">
        </div>
        <div class="most-view-product-content" style="min-height:60px;height:auto">
          <div class="most-view-product-name" style="max-height:-webkit-fill-available">
            <p>${p.name}</p>
          </div>
          <div class="most-view-product-price">
            <span class="money" style="color:#33cc00">${p.price}</span>
            ${p.oldPrice ? `<span class="money most-view-product-oldprice">${p.oldPrice}</span>` : ''}
          </div>
        </div>
      </a>
      <div class="most-view-product-action">
        ${p.viewOnly
          ? `<a class="most-view-btn most-view-btn-cart" href="${p.href}" style="background-color:#fff;color:#000;">Xem sản phẩm</a>`
          : `<form class="most-view-product-to-cart" action="/cart/add" method="post">
              <input type="hidden" name="variantId" value="${p.variantId}">
              <button class="most-view-btn most-view-btn-cart" type="submit" style="background-color:#fff;color:#000;">Mua hàng</button>
            </form>`
        }
      </div>
    </div>`).join('');

  return `<!-- ░░ DEV FAKE: ab-most-view-product-module ░░ -->
<div class="ab-most-view-product-module">
  <div class="most-view-module" style="background-color:#f9f9f9;">
    <input class="most-view-slides-per-view" type="hidden" value="4">
    <div class="most-view-module-heading">
      <div class="most-view-module-pager">
        <button class="most-view-btn most-view-btn-pager most-view-btn-pager-prev most-view-btn-prev-0">&lt;</button>
        <button class="most-view-btn most-view-btn-pager most-view-btn-pager-next most-view-btn-next-0" style="margin-left:3px;">&gt;</button>
      </div>
      <div class="most-view-module-title" style="color:#ff0000;font-size:18px;text-align:left;font-weight:normal;font-style:normal;">
        Sản phẩm xem nhiều nhất
      </div>
    </div>
    <div class="most-view-module-body swiper-container instance-0">
      <div class="most-view-module-products-slide swiper-wrapper">${slides}</div>
    </div>
  </div>
</div>`;
}

// ── Customer templates resolve to templates/customers/<name>.bwt ──────────
const CUSTOMER_TEMPLATES = new Set([
  'account', 'addresses', 'login', 'register',
  'orders', 'order', 'change_password', 'reset_password',
]);
function resolveTemplatePath(tpl) {
  // Đã có prefix → giữ nguyên
  if (tpl.includes('/')) return tpl;
  // Tên customer template không prefix → thêm 'customers/'
  if (CUSTOMER_TEMPLATES.has(tpl)) return `customers/${tpl}`;
  return tpl;
}

// ── Pretty-URL router (REOPEN 2026-09-11) ───────────────────────────────────
// Trước đây dev-server.js CHỈ render qua `/?tpl=<name>` (toolbar) — mọi
// đường dẫn thật mà template tự sinh ra (href="/cart", href="/blogs/...",
// href="{{ product.url }}" = "/<alias>", href="/search?query=...") đều rơi
// vào nhánh 404 cuối handler. Bấm link trên preview vì vậy đổi URL nhưng
// không render trang mới — đúng bug người dùng báo cáo sau khi review bản
// deploy Vercel. resolvePrettyPath ánh xạ các path Sapo thật sang đúng
// {tpl, routeParams} để renderFullPage dùng lại nguyên logic hiện có.
const PAGE_HANDLE_MAP = {
  'about-us':                   'page.about-us',
  'ai-skin-quiz':                'page.ai-skin-quiz',
  'ai-skin-quiz-results':        'page.ai-skin-quiz-results',
  'kham-da-ai':                  'page.ai-skin-quiz', // alias tiếng Việt (T-113) — cùng 1 template, tránh 404 khi vào thẳng /kham-da-ai
  'chuyen-gia':                  'page.chuyen-gia',
  'chuyen-gia-detail':           'page.chuyen-gia-detail',
  'clinical-proof':              'page.clinical-proof',
  'dai-ly-b2b':                  'page.dai-ly-b2b',
  'dat-lich-tu-van':             'page.dat_lich_tu_van',
  'loyalty':                     'page.loyalty',
  'order-lookup':                'page.order-lookup',
  'order-tracking':              'page.order-tracking',
  'patient-portal':              'page.patient-portal',
  'payment':                     'page.payment',
  'seo-directory':               'page.seo-directory',
  'skinhealthy-service-detail':  'page.skinhealthy-service-detail',
  'skinhealthy-services':        'page.skinhealthy-services',
  'spa-services':                'page.spa-services',
  'tra-cuu-hoat-chat':           'page.tra-cuu-hoat-chat',
};

// Tập hợp tất cả slug 1-segment mà chính menu điều hướng của site (data/
// navigation.js, mọi linklist + link con) trỏ tới — tính 1 lần, cache lại.
let _knownNavSlugsCache = null;
function getKnownNavSlugs() {
  if (_knownNavSlugsCache) return _knownNavSlugsCache;
  const slugs = new Set();
  const visit = (link) => {
    if (link && typeof link.url === 'string') {
      const seg = link.url.replace(/^\/+|\/+$/g, '');
      if (seg && !seg.includes('/')) slugs.add(seg);
    }
    (link?.links || []).forEach(visit);
  };
  Object.values(mockModule.linklistsObj || {}).forEach((ll) => (ll.links || []).forEach(visit));
  _knownNavSlugsCache = slugs;
  return slugs;
}

function resolvePrettyPath(pathname, searchParams) {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length === 0) return null; // '/' đã xử lý riêng ở caller

  // /cart
  if (parts.length === 1 && parts[0] === 'cart') return { tpl: 'cart', routeParams: {} };

  // /search?query=...&type=product|article
  if (parts.length === 1 && parts[0] === 'search') {
    return {
      tpl: 'search',
      routeParams: {
        searchQuery: searchParams.get('query') || searchParams.get('q') || '',
        searchType: searchParams.get('type') || 'product',
      },
    };
  }

  // /account, /account/login, /account/register, /account/addresses,
  // /account/orders, /account/orders/:id, /account/logout
  if (parts[0] === 'account') {
    if (parts.length === 1) return { tpl: 'account', routeParams: {} };
    if (parts[1] === 'logout') return { redirect: '/' };
    if (parts.length === 2 && ['login', 'register', 'addresses', 'orders'].includes(parts[1])) {
      return { tpl: parts[1], routeParams: {} };
    }
    if (parts.length === 3 && parts[1] === 'orders') return { tpl: 'order', routeParams: {} };
  }

  // /pages/:handle (hoặc root-level /:handle khi handle khớp PAGE_HANDLE_MAP —
  // codebase dùng lẫn cả 2 kiểu link, hỗ trợ cả 2 tránh vỡ link có sẵn)
  if (parts.length === 2 && parts[0] === 'pages' && PAGE_HANDLE_MAP[parts[1]]) {
    return { tpl: PAGE_HANDLE_MAP[parts[1]], routeParams: {} };
  }

  // /blogs/:blogHandle và /blogs/:blogHandle/:articleHandle
  if (parts[0] === 'blogs') {
    if (parts.length === 1) return { tpl: 'blog', routeParams: {} };
    if (parts.length === 2) return { tpl: 'blog', routeParams: { blogHandle: parts[1] } };
    if (parts.length === 3) {
      return { tpl: 'article', routeParams: { blogHandle: parts[1], articleHandle: parts[2] } };
    }
  }

  // /collections/:handle
  if (parts.length === 2 && parts[0] === 'collections') {
    return { tpl: 'collection', routeParams: { collectionHandle: parts[1] } };
  }

  // Root-level 1-segment slug — thứ tự ưu tiên khớp đúng cách Sapo thật phân
  // giải: trang tùy biến > sản phẩm (byAlias thật) > danh mục (collectionsData
  // thật) > danh mục placeholder CHỈ KHI slug này thật sự được menu điều
  // hướng của site trỏ tới (data/navigation.js) — ví dụ "ĐIỀU TRỊ CHUYÊN
  // NGHIỆP" → /dieu-tri-chuyen-nghiep chưa có collection thật trong demo data,
  // nhưng đây LÀ 1 link thật trên site nên phải render được (khác 1 URL gõ
  // sai/không tồn tại ở đâu cả → vẫn phải 404 thật, xem getKnownNavSlugs()).
  if (parts.length === 1) {
    const slug = parts[0];
    if (PAGE_HANDLE_MAP[slug]) return { tpl: PAGE_HANDLE_MAP[slug], routeParams: {} };
    if (mockModule.byAlias[slug]) return { tpl: 'product', routeParams: { productAlias: slug } };
    if (mockModule.collectionsData[slug]) return { tpl: 'collection', routeParams: { collectionHandle: slug } };
    if (getKnownNavSlugs().has(slug)) return { tpl: 'collection', routeParams: { collectionHandle: slug } };
  }

  return null; // không khớp gì → caller render 404 thật
}

// ── Giỏ hàng thật (cookie-based) ─────────────────────────────────────────
// REOPEN 2026-09-11: "Mua ngay" trước đây không làm gì vì /cart/add.js chưa
// tồn tại (404). Persist qua cookie (không session server-side) để hoạt động
// đúng cả trên Vercel serverless (mỗi request có thể là 1 instance khác).
const CART_COOKIE = 'pc_cart_items';

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').map((p) => p.trim()).filter(Boolean).map((p) => {
    const idx = p.indexOf('=');
    return [decodeURIComponent(p.slice(0, idx)), decodeURIComponent(p.slice(idx + 1))];
  }));
}

function readCartLines(req) {
  try {
    const cookies = parseCookies(req);
    if (!cookies[CART_COOKIE]) return [];
    const raw = Buffer.from(cookies[CART_COOKIE], 'base64').toString('utf8');
    const lines = JSON.parse(raw);
    return Array.isArray(lines) ? lines : [];
  } catch (_) {
    return [];
  }
}

function writeCartCookie(res, lines) {
  const raw = Buffer.from(JSON.stringify(lines)).toString('base64');
  res.setHeader('Set-Cookie', `${CART_COOKIE}=${raw}; Path=/; Max-Age=2592000; SameSite=Lax`);
}

function findVariant(variantId) {
  const { byAlias } = mockModule;
  for (const product of Object.values(byAlias)) {
    const variant = (product.variants || []).find((v) => String(v.id) === String(variantId));
    if (variant) return { product, variant };
  }
  return null;
}

function buildCartFromLines(lines) {
  const items = lines.map((line) => {
    const found = findVariant(line.variantId);
    if (!found) return null;
    const { product, variant } = found;
    return {
      id: variant.id,
      product_id: product.id,
      variant_id: variant.id,
      title: product.name,
      variant_title: variant.title,
      url: product.url,
      image: product.featured_image,
      sku: variant.sku,
      quantity: line.quantity,
      price: variant.price,
      compare_at_price: variant.compare_at_price,
      line_price: variant.price * line.quantity,
      product,
      variant,
      vendor: product.vendor,
      properties: {},
    };
  }).filter(Boolean);
  return {
    item_count: items.reduce((s, i) => s + i.quantity, 0),
    total_price: items.reduce((s, i) => s + i.line_price, 0),
    items,
    note: '',
    attributes: {},
  };
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Parser multipart/form-data tối giản — chỉ đọc field text (name/value), bỏ
// qua file upload. Đủ dùng cho form thêm giỏ hàng của theme này (toàn field
// ẩn text: variantId/quantity...), KHÔNG phải parser tổng quát.
function parseMultipart(raw, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);
  const boundary = boundaryMatch && (boundaryMatch[1] || boundaryMatch[2]);
  if (!boundary) return {};
  const parts = raw.split(`--${boundary}`);
  const result = {};
  for (const part of parts) {
    const nameMatch = /name="([^"]+)"/.exec(part);
    if (!nameMatch) continue;
    const sep = part.indexOf('\r\n\r\n');
    if (sep === -1) continue;
    const value = part.slice(sep + 4).replace(/\r\n--$/, '').replace(/\r\n$/, '');
    result[nameMatch[1]] = value;
  }
  return result;
}

function parseBody(req, raw) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    try { return JSON.parse(raw || '{}'); } catch (_) { return {}; }
  }
  if (contentType.includes('multipart/form-data')) {
    // Submit form gốc của trình duyệt (enctype="multipart/form-data") khi JS
    // chưa kịp intercept — xem route /cart/add (không .js).
    return parseMultipart(raw || '', contentType);
  }
  // application/x-www-form-urlencoded — Bizweb.addItemFromForm() dùng
  // jQuery(form).serialize() + $.ajax(string data) nên LUÔN gửi urlencoded
  // (enctype="multipart/form-data" trên thẻ <form> chỉ áp dụng cho submit
  // form gốc của trình duyệt, không áp dụng cho đường đi AJAX thật này —
  // xem snippets/ajaxcartfunction.bwt formOverride()).
  const params = new URLSearchParams(raw || '');
  return Object.fromEntries(params.entries());
}

// ── Detect layout: đọc {% layout 'name' %} từ dòng đầu template ─────────────
function detectLayout(tpl) {
  const resolvedTpl = resolveTemplatePath(tpl);
  for (const dir of TEMPLATE_DIRS) {
    const filepath = path.join(dir, resolvedTpl + '.bwt');
    if (fs.existsSync(filepath)) {
      // Không giới hạn vài trăm ký tự đầu: các template lớn thường mở đầu bằng
      // comment mô tả dài trước {% layout %}. Cắt ngắn làm preview chọn nhầm
      // layout theme, khiến trang MOPS mất các dependency (Vue/CSS) của nó.
      const source = fs.readFileSync(filepath, { encoding: 'utf8' });
      const m = source.match(/\{%-?\s*layout\s+['"](\w[\w-]*)['"]\s*-?%\}/);
      return m ? m[1] : 'theme';
    }
  }
  return 'theme';
}

// ── Render full page via layouts/theme.bwt ────────────────────────────────
// routeParams: khớp với getContext(templateName, routeParams) trong preview-mock.js
// — chỉ router pretty-URL (resolvePrettyPath) hoặc route /search truyền vào.
async function renderFullPage(tpl = 'index', queryParams = null, routeParams = {}) {
  const finalRouteParams = { ...routeParams };
  if (tpl === 'search' && queryParams && !Object.prototype.hasOwnProperty.call(finalRouteParams, 'searchQuery')) {
    finalRouteParams.searchQuery = queryParams.get('query') || queryParams.get('q') || '';
    finalRouteParams.searchType = queryParams.get('type') || 'product';
  }
  const ctx = mockModule.getContext(tpl, finalRouteParams);
  const resolvedTpl = resolveTemplatePath(tpl);

  // 1. Render template body → content_for_layout
  let contentForLayout = '';
  try {
    contentForLayout = await engine.renderFile(resolvedTpl, ctx);
  } catch (e) {
    console.warn(`[render] template ${resolvedTpl}.bwt:`, e.message);
    contentForLayout = `<div class="container" style="padding:40px 0;">
      <div style="background:#fff0f0;border:1px solid #f00;padding:20px;border-radius:8px;">
        <strong>Lỗi render template <code>${resolvedTpl}.bwt</code>:</strong><br><pre style="font-size:12px;">${e.message}</pre>
      </div></div>`;
  }

  // 2. Render full layout (detect từ {% layout %} tag của template)
  const layoutName = detectLayout(tpl);
  const fullCtx = { ...ctx, content_for_layout: contentForLayout, content_for_header: '' };
  let html;
  try {
    html = await engine.renderFile(layoutName, fullCtx);
  } catch (e) {
    console.error(`[render] ${layoutName}.bwt:`, e.message);
    throw e;
  }

  // 3. Chỉ inject công cụ preview khi chạy local (KHÔNG bật trên Vercel — badge
  //    live-reload + script bypass lazyBlockProduct chỉ có ý nghĩa cho dev
  //    local; trên site thật, IntersectionObserver gốc của assets/index.js
  //    tự hoạt động đúng khi người xem thật cuộn trang).
  if (!IS_STATIC_EXPORT && !IS_PROD_SERVER) {
    html = html.replace('</head>', devToolbarStyle() + '\n</head>');
    html = html.replace('</body>', devToolbarHtml(tpl) + '\n</body>');
  }

  // 4. Inject fake app blocks (dev only) — chỉ trên homepage.
  //    Đổ vào ĐÚNG container thật (.ab-most-view-product-module ở cuối index.bwt)
  //    để khớp thứ tự production: ...sections... → Sản phẩm xem nhiều nhất → Danh mục nổi bật → footer.
  if (!IS_STATIC_EXPORT && tpl === 'index') {
    var mostViewHolder = '<div class="ab-most-view-product-module ab-hide"></div>';
    if (html.indexOf(mostViewHolder) !== -1) {
      html = html.replace(mostViewHolder, devMostViewHtml());
    } else {
      // fallback: chèn trước footer nếu không tìm thấy container
      html = html.replace('<footer class="footer">', devMostViewHtml() + '\n<footer class="footer">');
    }
  }

  return html;
}

// (legacy, unused — kept for reference)
function _buildPage(renderedHeader, renderedBody, activeTemplate) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Preview — PHARMA COSMETICS</title>

<!-- Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<!-- Bootstrap 4 (CDN thay cho file local) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">

<!-- Sapo CSS từ assets/ (qua route /assets/) -->
<link rel="stylesheet" href="/assets/main.scss.css" onerror="console.warn('main.scss.css chưa compile — dùng Grunt để build')">

<style>
  html { font-size: 62.5%; }
  body { font-family: "Be Vietnam Pro", sans-serif; font-size: 1.4rem; color: #333; }

  /* Dev toolbar */
  #dev-toolbar {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;
    background: #1e1e2e; color: #cdd6f4; font-family: monospace;
    font-size: 13px; padding: 6px 16px;
    display: flex; align-items: center; justify-content: space-between;
    border-top: 2px solid #89b4fa;
  }
  #dev-toolbar .status { display: flex; align-items: center; gap: 8px; }
  #dev-toolbar .dot {
    width: 8px; height: 8px; border-radius: 50%; background: #a6e3a1;
    animation: blink 2s infinite;
  }
  #dev-toolbar .dot.error { background: #f38ba8; animation: none; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  #dev-toolbar .tpl-badge {
    background: #313244; padding: 2px 8px; border-radius: 4px;
    color: #89b4fa; font-size: 12px;
  }
  #dev-toolbar select {
    background: #313244; color: #cdd6f4; border: 1px solid #45475a;
    border-radius: 4px; padding: 2px 6px; font-size: 12px; cursor: pointer;
  }
  #reload-badge {
    background: #f9e2af; color: #1e1e2e; padding: 2px 10px;
    border-radius: 4px; font-size: 12px; display: none;
  }
  body { padding-bottom: 42px; }
</style>
</head>
<body>

${renderedHeader}

<!-- ░░ PAGE BODY PLACEHOLDER ░░ -->
<div style="min-height:600px; background:#f5f5f5; padding:40px 0;">
  <div class="container">
    <div style="background:#fff; border-radius:8px; padding:32px; max-width:700px;">
      <h2 style="font-size:2rem; color:var(--mainColor, #3cb371); margin-bottom:16px;">
        Preview: <code style="font-size:1.6rem;">${activeTemplate}</code>
      </h2>
      <p style="color:#666; line-height:1.8;">
        Body của trang được render tại đây khi chọn template từ toolbar bên dưới.<br>
        Hiện tại đang preview <strong>Header</strong> + <strong>Header-menu</strong>.
      </p>
      ${renderedBody}
    </div>
  </div>
</div>

<!-- ░░ DEV TOOLBAR ░░ -->
<div id="dev-toolbar">
  <div class="status">
    <div class="dot" id="ws-dot"></div>
    <span id="ws-label">Đang kết nối...</span>
    <span id="reload-badge">🔄 Đã reload</span>
  </div>
  <div style="display:flex; align-items:center; gap:12px;">
    <span>Template:</span>
    <select id="tpl-select" onchange="location.href='/?tpl='+this.value">
      <option value="index" ${activeTemplate==='index'?'selected':''}>index (Trang chủ)</option>
      <option value="product" ${activeTemplate==='product'?'selected':''}>product (Sản phẩm)</option>
      <option value="collection" ${activeTemplate==='collection'?'selected':''}>collection (Danh mục)</option>
      <option value="cart" ${activeTemplate==='cart'?'selected':''}>cart (Giỏ hàng)</option>
      <option value="blog" ${activeTemplate==='blog'?'selected':''}>blog (Blog)</option>
    </select>
    <span class="tpl-badge">localhost:${PORT}</span>
  </div>
</div>

<!-- ░░ Live Reload via WebSocket ░░ -->
<script>
(function() {
  const dot   = document.getElementById('ws-dot');
  const label = document.getElementById('ws-label');
  const badge = document.getElementById('reload-badge');

  function connect() {
    const ws = new WebSocket('ws://localhost:${WS_PORT}');

    ws.onopen = () => {
      dot.classList.remove('error');
      label.textContent = 'Live — đang watch .bwt';
    };

    ws.onmessage = (e) => {
      if (e.data === 'reload') {
        badge.style.display = 'inline';
        setTimeout(() => location.reload(), 150);
      }
      if (e.data === 'error') {
        dot.classList.add('error');
        label.textContent = 'Lỗi render — xem console terminal';
      }
    };

    ws.onclose = () => {
      dot.classList.add('error');
      label.textContent = 'Mất kết nối — thử lại sau 2s...';
      setTimeout(connect, 2000);
    };
  }

  connect();
})();
</script>

</body>
</html>`;
}

// ── WebSocket server (live reload) + File watcher ─────────────────────────
// Chỉ có ý nghĩa cho local dev preview (1 process sống, filesystem thật) —
// bỏ qua hoàn toàn trên Vercel serverless (xem guard require.main === module
// cuối file). `clients`/`broadcast` khai báo sẵn ở scope ngoài vì requestHandler
// gọi broadcast('error') khi render lỗi — trên serverless đây là no-op an toàn
// (clients luôn rỗng vì wss không được tạo).
const clients = new Set();
function broadcast(msg) {
  clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  });
}

if (require.main === module) {
  const wss = new WebSocketServer({ port: WS_PORT });
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  let reloadTimer = null;
  chokidar.watch([
    path.join(ROOT, 'snippets/**/*.bwt'),
    path.join(ROOT, 'Snippets/**/*.bwt'),
    path.join(ROOT, 'templates/**/*.bwt'),
    path.join(ROOT, 'layouts/**/*.bwt'),
    path.join(ROOT, 'assets/*.bwt'),
    path.join(ROOT, 'Assets/*.bwt'),
    path.join(ROOT, 'configs/settings_data.json'),
    path.join(ROOT, 'data/**/*.js'),
    path.join(ROOT, 'preview-mock.js'),
  ], { ignoreInitial: true, usePolling: false }).on('all', (event, filePath) => {
    const rel = path.relative(ROOT, filePath);
    console.log(`\n[watch] ${event}: ${rel}`);

    // Reload mock + xóa asset cache nếu settings HOẶC mock data (data/, preview-mock) thay đổi
    const isMockData = filePath.includes('settings_data.json')
      || filePath.startsWith(path.join(ROOT, 'data'))
      || filePath.includes('preview-mock.js');
    if (isMockData) {
      loadMock();
      assetCache.clear();
      console.log('[cache] Reload mock + xóa asset cache (settings/data thay đổi)');
    }

    // Xóa cache của asset .scss.bwt / .js.bwt bị thay đổi
    // dùng toLowerCase() vì Windows path có thể là Assets/ hoặc assets/
    if (filePath.toLowerCase().includes(path.join(ROOT, 'assets').toLowerCase())) {
      const baseName = path.basename(filePath);
      // main.scss.bwt → invalidate "main.scss.css"
      const cacheKey = baseName.replace(/\.bwt$/, '.css');
      assetCache.delete(cacheKey);
      assetCache.delete(baseName.replace(/\.bwt$/, ''));
      console.log('[cache] Xóa cache:', baseName, '→', cacheKey);
    }

    // Debounce 200ms để tránh nhiều event cùng lúc
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => broadcast('reload'), 200);
  });
}

// ── HTTP server ────────────────────────────────────────────────────────────
// requestHandler — tách riêng khỏi http.createServer(...) để export dùng lại
// được cho Vercel serverless (api/index.js require('../dev-server.js') lấy
// đúng hàm này, không khởi động chokidar/WebSocket/server.listen ở dưới —
// xem guard `require.main === module` cuối file).
async function requestHandler(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ── Route: /assets/<file> — compile .scss.bwt → CSS, .js.bwt → JS, serve statics
  if (pathname.startsWith('/assets/')) {
    const fileName = decodeURIComponent(pathname.replace('/assets/', ''));

    try {
      const asset = await compileAsset(fileName);

      if (!asset) {
        // Ảnh thiếu → trả về placeholder SVG thay vì 404
        const imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
        const ext = path.extname(fileName).toLowerCase();
        if (imgExts.includes(ext)) {
          const label = encodeURIComponent(fileName.replace(/\.[^.]+$/, ''));
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#e8f5e9"/>
  <rect x="150" y="140" width="100" height="80" rx="6" fill="#c8e6c9"/>
  <circle cx="175" cy="160" r="12" fill="#a5d6a7"/>
  <polygon points="150,220 200,170 250,220" fill="#a5d6a7"/>
  <text x="200" y="270" font-family="sans-serif" font-size="13" fill="#555" text-anchor="middle">${decodeURIComponent(label)}</text>
  <text x="200" y="290" font-family="sans-serif" font-size="11" fill="#aaa" text-anchor="middle">placeholder</text>
</svg>`;
          res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' });
          res.end(svg);
        } else {
          res.writeHead(404); res.end(`/* 404: ${fileName} */`);
        }
        return;
      }

      if (asset.isBinary) {
        // File nhị phân: stream trực tiếp
        res.writeHead(200, { 'Content-Type': asset.mime });
        fs.createReadStream(asset.srcPath).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Type': asset.mime + '; charset=utf-8',
          'Cache-Control': 'no-cache',
        });
        res.end(asset.content);
      }
    } catch (err) {
      console.error('[asset error]', fileName, err.message);
      res.writeHead(500); res.end(`/* asset error: ${err.message} */`);
    }
    return;
  }

  // ── Route: /cart.js — Sapo Cart API (giỏ hàng thật lưu cookie, xem đầu file)
  if (pathname === '/cart.js') {
    const cart = buildCartFromLines(readCartLines(req));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(cart));
    return;
  }

  // ── Route: /cart/add — submit form gốc (không qua AJAX, enctype=multipart
  // hoặc khi JS ajaxcartfunction.bwt lỗi/chưa init kịp) — thêm hàng thật rồi
  // 303 redirect về /cart, đúng kiểu progressive enhancement thay vì im lặng
  // không làm gì (bug gốc "Mua ngay không phản hồi" người dùng báo cáo).
  if (pathname === '/cart/add' && req.method === 'POST') {
    const raw = await readRequestBody(req);
    const body = parseBody(req, raw);
    const variantId = body.variantId || body.VariantId || body.id;
    const quantity = parseInt(body.quantity, 10) || 1;
    const lines = readCartLines(req);
    if (variantId && findVariant(variantId)) {
      const existing = lines.find((l) => String(l.variantId) === String(variantId));
      if (existing) existing.quantity += quantity;
      else lines.push({ variantId, quantity });
      writeCartCookie(res, lines);
    }
    res.writeHead(303, { Location: '/cart' });
    res.end();
    return;
  }

  // ── Route: /cart/add.js — thêm dòng hàng (Bizweb.addItemFromForm real path)
  if (pathname === '/cart/add.js' && req.method === 'POST') {
    const raw = await readRequestBody(req);
    const body = parseBody(req, raw);
    const variantId = body.variantId || body.VariantId || body.id;
    const quantity = parseInt(body.quantity, 10) || 1;
    if (!variantId || !findVariant(variantId)) {
      res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 422, message: 'Not found', description: 'variant not found' }));
      return;
    }
    const lines = readCartLines(req);
    const existing = lines.find((l) => String(l.variantId) === String(variantId));
    if (existing) existing.quantity += quantity;
    else lines.push({ variantId, quantity });
    writeCartCookie(res, lines);
    const cart = buildCartFromLines(lines);
    const addedItem = cart.items.find((i) => String(i.variant_id) === String(variantId));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(addedItem));
    return;
  }

  // ── Route: /cart/change.js — sửa số lượng 1 dòng hàng (quantity=0 → xoá)
  if (pathname === '/cart/change.js' && req.method === 'POST') {
    const raw = await readRequestBody(req);
    const body = parseBody(req, raw);
    const variantId = body.variantId || body.VariantId || body.id || body.line;
    const quantity = parseInt(body.quantity, 10);
    let lines = readCartLines(req);
    if (variantId != null) {
      if (!quantity) lines = lines.filter((l) => String(l.variantId) !== String(variantId));
      else {
        const existing = lines.find((l) => String(l.variantId) === String(variantId));
        if (existing) existing.quantity = quantity;
      }
    }
    writeCartCookie(res, lines);
    const cart = buildCartFromLines(lines);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(cart));
    return;
  }

  // ── Route: /cart/clear.js — xoá sạch giỏ hàng
  if (pathname === '/cart/clear.js' && req.method === 'POST') {
    await readRequestBody(req);
    writeCartCookie(res, []);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(buildCartFromLines([])));
    return;
  }

  // ── Path-based routes (pretty URLs) ──────────────────────────────────────
  // MOPS Admin phải có URL riêng, không dùng ?tpl=, vì Vue app trong page.mops-admin
  // dùng history.replaceState + `url.search = ''` để đồng bộ ?tab=/?sub= — sẽ xoá
  // mất tpl và live-reload rơi về `index`. Giữ pathname cố định thì reload luôn
  // đúng trang, kể cả sau khi đã click sang tab khác trong app.
  const PATH_ROUTES = {
    '/mops-admin': 'page.mops-admin',
  };
  if (Object.prototype.hasOwnProperty.call(PATH_ROUTES, pathname)) {
    try {
      const html = await renderFullPage(PATH_ROUTES[pathname], null, { cartOverride: buildCartFromLines(readCartLines(req)) });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      console.error('[render error]', err);
      broadcast('error');
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Render error: ' + err.message);
    }
    return;
  }

  // ── Route: / — render preview
  if (pathname === '/' || pathname === '') {
    const tpl = url.searchParams.get('tpl') || 'index';
    try {
      const html = await renderFullPage(tpl, url.searchParams, { cartOverride: buildCartFromLines(readCartLines(req)) });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      console.error('[render error]', err);
      broadcast('error');
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Render error: ' + err.message);
    }
    return;
  }

  // ── Pretty-URL routes (cart, search, account/*, blogs/*, collections/*,
  // pages/*, /:alias sản phẩm|danh mục|trang tuỳ biến) — xem resolvePrettyPath.
  {
    const matched = resolvePrettyPath(pathname, url.searchParams);
    if (matched) {
      if (matched.redirect) {
        res.writeHead(302, { Location: matched.redirect });
        res.end();
        return;
      }
      try {
        const routeParams = { ...matched.routeParams, cartOverride: buildCartFromLines(readCartLines(req)) };
        const html = await renderFullPage(matched.tpl, url.searchParams, routeParams);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        console.error('[render error]', matched.tpl, err);
        broadcast('error');
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Render error: ' + err.message);
      }
      return;
    }
  }

  // ── Route: /__data.json — raw JSON context (dùng với fetch / Postman)
  if (pathname === '/__data.json') {
    const ctx = mockModule.getContext('index');
    // Serialize an toàn: bỏ circular / quá sâu
    const payload = {
      settings:    ctx.settings,
      store:       ctx.store,
      home_sections: Object.fromEntries(
        Array.from({length:18},(_,i)=>i+1)
          .map(i=>[`home_section_${i}`, ctx.settings[`home_section_${i}`]||null])
          .filter(([,v])=>v)
      ),
      collections: Object.fromEntries(
        Object.entries(ctx.collections).map(([k,v])=>[k, {
          name: v.name, alias: v.alias, products_count: v.products_count,
        }])
      ),
      linklists: Object.fromEntries(
        Object.entries(ctx.linklists).map(([k,v])=>[k,{
          title: v.title, links_count: (v.links||[]).length,
        }])
      ),
      sample_product: ctx.collections['all']?.products?.[0] || null,
      articles_count: (ctx.articles||[]).length,
      cart: { item_count: ctx.cart?.item_count, total_price: ctx.cart?.total_price },
    };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(payload, null, 2));
    return;
  }

  // ── Route: /debug — trang debug HTML trực quan
  if (pathname === '/debug') {
    const ctx  = mockModule.getContext('index');
    const s    = ctx.settings;

    // Home sections đang active
    const homeSections = Array.from({length:18},(_,i)=>i+1)
      .map(i=>({ slot:`home_section_${i}`, value: s[`home_section_${i}`]||null }))
      .filter(x=>x.value && x.value !== 'none');

    // Collections summary
    const collSummary = Object.entries(ctx.collections)
      .sort((a,b)=> b[1].products_count - a[1].products_count)
      .slice(0, 40)
      .map(([k,v])=>({ handle:k, name:v.name, count:v.products_count }));

    // Settings: chỉ lấy key ngắn có giá trị có nghĩa
    const settingsRows = Object.entries(s)
      .filter(([k,v])=> typeof v !== 'object' && String(v).length < 200)
      .sort(([a],[b])=>a.localeCompare(b));

    // Sample product
    const sp = ctx.collections['all']?.products?.[0];

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🔍 Debug — PHARMA COSMETICS Preview</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:monospace;font-size:13px;background:#0f1117;color:#e2e8f0;line-height:1.5}
  .header{background:#1e293b;padding:16px 24px;border-bottom:2px solid #3cb371;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:10}
  .header h1{font-size:16px;color:#3cb371}
  .header a{color:#94a3b8;text-decoration:none;font-size:12px;padding:4px 10px;border:1px solid #334155;border-radius:4px}
  .header a:hover{background:#1e293b;color:#e2e8f0}
  .tabs{display:flex;gap:0;padding:0 24px;background:#1a2232;border-bottom:1px solid #2d3748}
  .tab{padding:10px 18px;cursor:pointer;color:#64748b;font-size:13px;border-bottom:2px solid transparent;user-select:none}
  .tab.active{color:#3cb371;border-bottom-color:#3cb371}
  .panel{display:none;padding:20px 24px;max-height:calc(100vh - 110px);overflow-y:auto}
  .panel.active{display:block}
  .section-title{font-size:12px;color:#3cb371;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;margin-top:20px}
  .section-title:first-child{margin-top:0}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#1e293b;color:#94a3b8;text-align:left;padding:6px 10px;position:sticky;top:0}
  td{padding:5px 10px;border-bottom:1px solid #1e293b;vertical-align:top;word-break:break-all}
  tr:hover td{background:#1a2232}
  .badge{display:inline-block;padding:2px 7px;border-radius:3px;font-size:11px}
  .badge.green{background:#14532d;color:#4ade80}
  .badge.gray{background:#1e293b;color:#64748b}
  .badge.yellow{background:#422006;color:#fbbf24}
  .badge.red{background:#450a0a;color:#f87171}
  .search{background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:6px 12px;border-radius:4px;font-size:12px;width:100%;margin-bottom:12px;font-family:monospace}
  .search:focus{outline:none;border-color:#3cb371}
  pre{background:#1e293b;padding:16px;border-radius:6px;overflow-x:auto;font-size:11px;color:#a5f3fc;line-height:1.6}
  .kv-key{color:#93c5fd;min-width:200px}
  .kv-val{color:#e2e8f0}
  .kv-val.bool-true{color:#4ade80}
  .kv-val.bool-false{color:#f87171}
  .kv-val.num{color:#fbbf24}
  .slot-name{color:#93c5fd}
  .slot-val{color:#4ade80}
  .slot-none{color:#475569}
</style>
</head>
<body>
<div class="header">
  <h1>🔍 Debug — Mock Data Context</h1>
  <a href="/">← Preview</a>
  <a href="/__data.json" target="_blank">JSON raw</a>
  <span style="margin-left:auto;color:#475569;font-size:11px">localhost:${PORT}</span>
</div>

<div class="tabs">
  <div class="tab active" onclick="showTab('sections')">Home Sections</div>
  <div class="tab" onclick="showTab('collections')">Collections</div>
  <div class="tab" onclick="showTab('product')">Sample Product</div>
  <div class="tab" onclick="showTab('settings')">Settings (${settingsRows.length})</div>
  <div class="tab" onclick="showTab('nav')">Navigation</div>
</div>

<!-- TAB: Home Sections -->
<div class="panel active" id="tab-sections">
  <div class="section-title">Slots đang active (home_section_1..18)</div>
  <table>
    <tr><th>Slot</th><th>Section snippet</th><th>Collection</th><th>Products</th></tr>
    ${homeSections.map(({slot,value})=>{
      const colKey = s[slot.replace('home_section_','section_col_')] ||
                     s['section_sale_col'] ||
                     s['section_tab_1_col_1'] || '';
      const col = ctx.collections[colKey];
      const pCount = col ? col.products_count : '—';
      return `<tr>
        <td class="kv-key">${slot}</td>
        <td><span class="slot-val">${value}</span></td>
        <td class="slot-name">${colKey||'—'}</td>
        <td>${pCount}</td>
      </tr>`;
    }).join('')}
  </table>
  <div class="section-title" style="margin-top:24px">Slot trống (none / chưa dùng)</div>
  <table>
    <tr><th>Slot</th><th>Giá trị</th></tr>
    ${Array.from({length:18},(_,i)=>i+1)
      .filter(i=>!s[`home_section_${i}`] || s[`home_section_${i}`]==='none')
      .map(i=>`<tr><td class="kv-key">home_section_${i}</td><td class="slot-none">${s[`home_section_${i}`]||'(chưa có)'}</td></tr>`)
      .join('')}
  </table>
  <p style="margin-top:16px;color:#475569;font-size:11px">
    Muốn thêm section: sửa <code style="color:#93c5fd">data/settings-demo.js</code> → <code style="color:#4ade80">overrideSettings</code>
  </p>
</div>

<!-- TAB: Collections -->
<div class="panel" id="tab-collections">
  <input class="search" id="coll-search" placeholder="Tìm handle collection..." oninput="filterTable(this,'coll-table')">
  <table id="coll-table">
    <tr><th>Handle</th><th>Tên</th><th>Products</th><th>Nguồn</th></tr>
    ${collSummary.map(({handle,name,count})=>{
      const isReal = !require('./data/collections').collectionsData[handle];
      return `<tr data-search="${handle} ${name}">
        <td class="kv-key">${handle}</td>
        <td>${name||'—'}</td>
        <td><span class="badge ${count>0?'green':'gray'}">${count}</span></td>
        <td><span class="badge ${isReal?'yellow':'gray'}">${isReal?'fallback (real store)':'mock data'}</span></td>
      </tr>`;
    }).join('')}
  </table>
</div>

<!-- TAB: Sample Product -->
<div class="panel" id="tab-product">
  <div class="section-title">Sản phẩm đầu tiên trong collection "all"</div>
  ${sp ? `
  <table style="margin-bottom:16px">
    <tr><th>Trường</th><th>Giá trị</th></tr>
    ${[
      ['id',sp.id],['name',sp.name],['alias',sp.alias],['url',sp.url],
      ['available',sp.available],['price',sp.price],['compare_at_price',sp.compare_at_price],
      ['variants count',sp.variants?.length],
      ['variants[0].title',sp.variants?.[0]?.title],
      ['variants[0].price',sp.variants?.[0]?.price],
      ['variants[0].compare_at_price',sp.variants?.[0]?.compare_at_price],
      ['variants[0].id',sp.variants?.[0]?.id],
      ['variants[0].sku',sp.variants?.[0]?.sku],
      ['featured_image.src',sp.featured_image?.src],
      ['images count',sp.images?.length],
      ['tags',sp.tags?.join(', ')],
      ['selected_or_first_available_variant.price',sp.selected_or_first_available_variant?.price],
      ['metafields.custom.Video',sp.metafields?.custom?.Video||'(trống)'],
      ['metafields.custom.Quycach',sp.metafields?.custom?.Quycach||'(trống)'],
    ].map(([k,v])=>{
      const cls = typeof v==='boolean' ? (v?'bool-true':'bool-false') : typeof v==='number' ? 'num' : '';
      return `<tr><td class="kv-key">${k}</td><td class="kv-val ${cls}">${v}</td></tr>`;
    }).join('')}
  </table>
  <div class="section-title">Full JSON</div>
  <pre>${JSON.stringify(sp, null, 2).replace(/</g,'&lt;')}</pre>
  ` : '<p>Không có sản phẩm</p>'}
</div>

<!-- TAB: Settings -->
<div class="panel" id="tab-settings">
  <input class="search" id="set-search" placeholder="Tìm key hoặc value settings..." oninput="filterTable(this,'set-table')">
  <table id="set-table">
    <tr><th>Key</th><th>Value</th><th>Type</th></tr>
    ${settingsRows.map(([k,v])=>{
      const type = typeof v;
      const cls  = type==='boolean' ? (v?'bool-true':'bool-false') : type==='number' ? 'num' : '';
      const badge= type==='boolean' ? `<span class="badge ${v?'green':'red'}">${v}</span>` :
                   type==='number'  ? `<span class="badge yellow">${v}</span>` : '';
      return `<tr data-search="${k} ${v}">
        <td class="kv-key">${k}</td>
        <td class="kv-val ${cls}">${badge||String(v).slice(0,120)}</td>
        <td style="color:#475569">${type}</td>
      </tr>`;
    }).join('')}
  </table>
</div>

<!-- TAB: Navigation -->
<div class="panel" id="tab-nav">
  ${Object.entries(ctx.linklists)
    .filter(([,v])=>(v.links||[]).length>0)
    .map(([handle, ll])=>`
    <div class="section-title">${handle} — "${ll.title}" (${(ll.links||[]).length} links)</div>
    <table style="margin-bottom:16px">
      <tr><th>Title</th><th>URL</th><th>Sub-links</th></tr>
      ${(ll.links||[]).map(l=>`<tr>
        <td>${l.title}</td>
        <td class="kv-key">${l.url}</td>
        <td style="color:#475569">${(l.links||[]).length>0?(l.links||[]).map(s=>s.title).join(', '):''}</td>
      </tr>`).join('')}
    </table>
  `).join('')}
</div>

<script>
function showTab(id) {
  document.querySelectorAll('.tab').forEach((t,i)=>{
    const ids=['sections','collections','product','settings','nav'];
    t.classList.toggle('active', ids[i]===id);
  });
  document.querySelectorAll('.panel').forEach(p=>{
    p.classList.toggle('active', p.id==='tab-'+id);
  });
}
function filterTable(input, tableId) {
  const q = input.value.toLowerCase();
  document.querySelectorAll('#'+tableId+' tr[data-search]').forEach(row=>{
    row.style.display = row.dataset.search.toLowerCase().includes(q) ? '' : 'none';
  });
}
</script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(html);
    return;
  }

  try {
    const html = await renderFullPage('404', null, { cartOverride: buildCartFromLines(readCartLines(req)) });
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

const server = http.createServer(requestHandler);

// ── Chỉ chạy chokidar/WebSocket/server.listen khi `node dev-server.js` chạy
// trực tiếp (local dev preview). Khi file này bị require() bởi api/index.js
// (Vercel serverless) — module.exports = requestHandler bên dưới — các side
// effect này KHÔNG chạy: serverless không có filesystem watch, không giữ 1
// process sống để nhận WebSocket, và không tự listen port (Vercel tự quản lý).
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   PHARMA COSMETICS — Dev Preview Server          ║
╠══════════════════════════════════════════════════╣
║  🌐  Preview : http://localhost:${PORT}              ║
║  🛠  MOPS    : http://localhost:${PORT}/mops-admin   ║
║  🔍  Debug   : http://localhost:${PORT}/debug        ║
║  📦  JSON    : http://localhost:${PORT}/__data.json  ║
║  🔌  WS      : ws://localhost:${WS_PORT}             ║
║  👁  Watching: snippets/, assets/, configs/      ║
╚══════════════════════════════════════════════════╝

Save bất kỳ file .bwt nào → browser tự reload.
`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} đang bận. Tắt process khác hoặc đổi PORT trong dev-server.js`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

module.exports = requestHandler;
