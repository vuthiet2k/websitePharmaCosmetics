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
const crypto  = require('crypto');
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

// Soi da AI 2026-09-24: giới hạn theo IP cho adapter cloud tùy chọn. Luồng mặc
// định vẫn chạy tại thiết bị, do đó không có ảnh nào đi qua route này.
const skinAnalysisRate = new Map();
async function allowSkinAnalysis(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    try {
      const key = `skin-analysis-rate:${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)}`;
      const script = "redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1]); local n=redis.call('ZCARD', KEYS[1]); if n >= 5 then return 0 end; redis.call('ZADD', KEYS[1], ARGV[2], ARGV[3]); redis.call('EXPIRE', KEYS[1], ARGV[4]); return 1";
      const response = await fetch(kvUrl, {
        method: 'POST', headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EVAL', script, '1', key, String(now - windowMs), String(now), `${now}:${crypto.randomBytes(6).toString('hex')}`, '60'])
      });
      if (response.ok) { const result = await response.json(); if (typeof result.result === 'number') return result.result === 1; }
    } catch (_) { /* Trên serverless không được hạ cấp âm thầm sang limiter theo instance. */ }
  }
  // Bộ nhớ tiến trình chỉ dùng trong local preview; trên Vercel mỗi instance có
  // Map riêng nên không thể bảo đảm quota theo IP giữa các lần gọi.
  if (process.env.VERCEL) return null;
  for (const [key, timestamps] of skinAnalysisRate) {
    const active = timestamps.filter((time) => now - time < windowMs);
    if (active.length) skinAnalysisRate.set(key, active);
    else skinAnalysisRate.delete(key);
  }
  if (!skinAnalysisRate.has(ip) && skinAnalysisRate.size >= 5000) return false;
  const recent = (skinAnalysisRate.get(ip) || []).filter((time) => now - time < windowMs);
  if (recent.length >= 5) { skinAnalysisRate.set(ip, recent); return false; }
  recent.push(now); skinAnalysisRate.set(ip, recent);
  return true;
}

function normaliseSkinAnalysis(payload, provider) {
  if (!payload || payload.success === false || typeof payload !== 'object') throw new Error('adapter_invalid_response');
  const source = payload && payload.scores ? payload.scores : payload && payload.data && payload.data.scores ? payload.data.scores : payload && payload.data ? payload.data : payload;
  const keys = ['acne', 'pigmentation', 'wrinkles', 'redness', 'pores'];
  const scores = {};
  keys.forEach((key) => {
    const item = source && source[key];
    if (!item || typeof item !== 'object') throw new Error('adapter_invalid_response');
    const rawValue = item.raw_score != null ? item.raw_score : item.raw;
    const uiValue = item.ui_score != null ? item.ui_score : item.ui;
    const raw = Number(rawValue); const ui = Number(uiValue);
    if (!Number.isFinite(raw) || raw < 0 || raw > 1 || !Number.isFinite(ui) || ui < 50 || ui > 98 || !Number.isInteger(ui)) throw new Error('adapter_invalid_response');
    scores[key] = { raw_score: raw, ui_score: ui, level: String(item.level || '') };
  });
  return { success: true, provider: provider || 'cloud_adapter', scores };
}

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
      .on('tag:endpaginate', () => stream.stop())\n      .on('template', (tpl) => this.templates.push(tpl))\n      .on('end', () => { throw new Error(`tag ${token.getText()} not closed`); });
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
  return `/assets/${src}`;
});

engine.registerFilter('img_url', (src, size) => {
  const url = src && typeof src === 'object' ? (src.src || '') : (src || '');
  if (!url || url.startsWith('http')) return url;
  const dim = typeof size === 'string' && size.includes('x') ? size : '400x400';
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
engine.registerFilter('alias', (v) => String(v || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, ''));

// ── Load mock context (reload khi settings thay đổi) ──────────────────────
let mockModule = null;
function loadMock() {
  const dataDir = path.join(ROOT, 'data');
  Object.keys(require.cache).forEach((key) => {
    if (key === require.resolve('./preview-mock') || key.startsWith(dataDir)) {
      delete require.cache[key];
    }
  });
  mockModule = require('./preview-mock');

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
const assetCache = new Map();

function evalLiquidExpr(expr, settings) {
  const parts = expr.split('|').map(s => s.trim());
  const rawExpr = parts[0];
  const filters = parts.slice(1);

  let value;
  if (/^settings\.(\w+)$/.test(rawExpr)) {
    const key = rawExpr.match(/^settings\.(\w+)$/)[1];
    value = settings[key] ?? null;
  } else if (/^['"](.+)['"]$/.test(rawExpr)) {
    value = rawExpr.replace(/^['"]|['"]$/g, '');
  } else {
    value = null;
  }

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
  }

  return value ?? '';
}

function replaceLiquidInAsset(src, settings) {
  src = src.replace(/\{\{-?\s*([\s\S]+?)\s*-?\}\}/g, (match, expr) => {
    return String(evalLiquidExpr(expr.trim(), settings));
  });
  src = src.replace(/\{%-?[\s\S]*?-?%\}/g, '');
  return src;
}

async function compileAsset(requestedName) {
  if (assetCache.has(requestedName)) return assetCache.get(requestedName);

  const assetsDir = path.join(ROOT, 'assets');
  const settings  = mockModule.settings;

  let srcPath = null;
  let mime    = 'text/plain';
  let isScss  = false;

  if (requestedName.endsWith('.scss.css')) {
    const bwtName = requestedName.replace(/\.css$/, '.bwt');
    const candidate = path.join(assetsDir, bwtName);
    if (fs.existsSync(candidate)) { srcPath = candidate; mime = 'text/css'; isScss = true; }
  } else if (requestedName.endsWith('.css')) {
    const direct = path.join(assetsDir, requestedName);
    if (fs.existsSync(direct)) { srcPath = direct; mime = 'text/css'; }
    else {
      const bwt = path.join(assetsDir, requestedName + '.bwt');
      if (fs.existsSync(bwt)) { srcPath = bwt; mime = 'text/css'; }
    }
  } else if (requestedName.endsWith('.js')) {
    const bwt = path.join(assetsDir, requestedName + '.bwt');
    if (fs.existsSync(bwt)) { srcPath = bwt; mime = 'application/javascript'; }
    else {
      const direct = path.join(assetsDir, requestedName);
      if (fs.existsSync(direct)) { srcPath = direct; mime = 'application/javascript'; }
    }
  } else {
    const direct = path.join(assetsDir, requestedName);
    if (fs.existsSync(direct)) { srcPath = direct; mime = guessMime(requestedName); }
  }

  if (!srcPath) return null;

  const raw = fs.readFileSync(srcPath, 'utf8');
  let content = raw;
  let isBinary = false;

  const ext = path.extname(requestedName).toLowerCase();
  if (['.png','.jpg','.jpeg','.gif','.webp','.woff','.woff2','.ttf','.eot'].includes(ext)) {
    isBinary = true;
  }

  const isRawVendorAsset = requestedName === 'vue.global.prod.js';
  if (!isBinary && !isRawVendorAsset) {
    try {
      const ctx = mockModule.getContext('index');
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
      ['list_collections', 'list_collections (Tất cả danh mục)'],
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
      ['page.getglowing-micro-peel',       'SH · GetGlowing Micro-Peel'],
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
</script>`;
}

const CUSTOMER_TEMPLATES = new Set([
  'account', 'addresses', 'login', 'order', 'orders', 'register', 'reset_password'
]);

function resolveTemplatePath(tpl) {
  if (CUSTOMER_TEMPLATES.has(tpl)) {
    return path.join(ROOT, 'templates', 'customers', `${tpl}.bwt`);
  }
  return path.join(ROOT, 'templates', `${tpl}.bwt`);
}

const PAGE_HANDLE_MAP = {
  'about-us':                   'page.about-us',
  'gioi-thieu':                 'page.about-us',
  'ai-skin-quiz':                'page.ai-skin-quiz',
  'ai-skin-quiz-results':        'page.ai-skin-quiz-results',
  'kham-da-ai':                  'page.ai-skin-quiz',
  'soi-da':                      'page.ai-skin-quiz',
  'chuyen-gia':                  'page.chuyen-gia',
  'chuyen-gia-detail':           'page.chuyen-gia-detail',
  'clinical-proof':              'page.clinical-proof',
  'chinh-sach-bao-mat':          'page.chinh-sach-bao-mat',
  'dai-ly-b2b':                  'page.dai-ly-b2b',
  'dat-lich-tu-van':             'page.dat_lich_tu_van',
  'loyalty':                     'page.loyalty',
  'order-lookup':                'page.order-lookup',
  'order-tracking':              'page.order-tracking',
  'patient-portal':              'page.patient-portal',
  'payment':                     'page.payment',
  'seo-directory':               'page.seo-directory',
  'spa-services':                'page.spa-services',
  'tra-cuu-hoat-chat':           'page.tra-cuu-hoat-chat',
  'skinhealthy-services':        'page.skinhealthy-services',
  'skinhealthy-service-detail':  'page.skinhealthy-service-detail',
  'getglowing-micro-peel-ha-noi': 'page.getglowing-micro-peel',
  'dich-vu-skin-healthy-beauty': 'page.skinhealthy-services',
  'cham-soc-da-chuyen-sau':      'page.skinhealthy-services',
  'skinhealthy':                 'page.indexskinhealthy',
};

function resolvePrettyPath(pathname, searchParams) {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length === 0) return null;

  if (parts.length === 1 && parts[0] === 'cart') return { tpl: 'cart', routeParams: {} };

  if (parts.length === 1 && parts[0] === 'search') {
    return {
      tpl: 'search',
      routeParams: {
        searchQuery: searchParams.get('query') || searchParams.get('q') || '',
        searchType: searchParams.get('type') || 'product',
      },
    };
  }

  if (parts[0] === 'account') {
    if (parts.length === 1) return { tpl: 'account', routeParams: {} };
    if (parts[1] === 'logout') return { redirect: '/' };
    if (parts.length === 2 && ['login', 'register', 'addresses', 'orders'].includes(parts[1])) {
      return { tpl: parts[1], routeParams: {} };
    }
    if (parts.length === 3 && parts[1] === 'orders') return { tpl: 'order', routeParams: {} };
  }

  if (parts.length === 2 && parts[0] === 'pages' && PAGE_HANDLE_MAP[parts[1]]) {
    return { tpl: PAGE_HANDLE_MAP[parts[1]], routeParams: {} };
  }

  if (parts[0] === 'blogs') {
    if (parts.length === 1) return { tpl: 'blog', routeParams: {} };
    if (parts.length === 2) return { tpl: 'blog', routeParams: { blogHandle: parts[1] } };
    if (parts.length === 3) {
      return { tpl: 'article', routeParams: { blogHandle: parts[1], articleHandle: parts[2] } };
    }
  }

  if (parts[0] === 'collections') {
    if (parts.length === 1) return { tpl: 'list_collections', routeParams: {} };
    if (parts.length === 2) return { tpl: 'collection', routeParams: { collectionHandle: parts[1] } };
  }

  const slug = parts[0];
  if (parts.length === 1) {
    if (PAGE_HANDLE_MAP[slug]) return { tpl: PAGE_HANDLE_MAP[slug], routeParams: {} };
    const prod = mockModule.findProductByAlias(slug);
    if (prod) return { tpl: 'product', routeParams: { productAlias: slug } };
    const col = mockModule.findCollectionByAlias(slug);
    if (col) return { tpl: 'collection', routeParams: { collectionHandle: slug } };
  }

  return null;
}

const CART_COOKIE = 'pc_cart_items';

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}

function readCartLines(req) {
  try {
    const raw = parseCookies(req)[CART_COOKIE];
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeCartCookie(res, lines) {
  const val = encodeURI(JSON.stringify(lines));
  res.setHeader('Set-Cookie', `${CART_COOKIE}=${val}; Path=/; HttpOnly; SameSite=Lax`);
}

function findVariant(variantId) {
  const vid = String(variantId || '').trim();
  for (const p of mockModule.products || []) {
    for (const v of p.variants || []) {
      if (String(v.id) === vid) return { product: p, variant: v };
    }
  }
  return null;
}

function buildCartFromLines(lines) {
  const items = [];
  let total_price = 0;
  let item_count = 0;

  for (const line of lines || []) {
    const found = findVariant(line.variantId);
    if (!found) continue;
    const { product, variant } = found;
    const qty = Math.max(1, parseInt(line.quantity, 10) || 1);
    const line_price = (variant.price || 0) * qty;

    items.push({
      id: variant.id,
      variant_id: variant.id,
      title: `${product.name} - ${variant.title}`,
      name: product.name,
      product_title: product.name,
      variant_title: variant.title,
      price: variant.price || 0,
      line_price,
      original_line_price: line_price,
      quantity: qty,
      url: `/products/${product.alias || product.id}`,
      image: (product.images && product.images[0] && product.images[0].src) || '',
      product_type: product.type || '',
      sku: variant.sku || '',
    });

    total_price += line_price;
    item_count += qty;
  }

  return {
    items,
    item_count,
    total_price,
    requires_shipping: true,
  };
}

function readRequestBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function parseMultipart(raw, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!boundaryMatch) return {};
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const parts = raw.split(`--${boundary}`);
  const result = {};
  for (const part of parts) {
    if (!part || part.trim() === '--') continue;
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headers = part.slice(0, headerEnd);
    const body = part.slice(headerEnd + 4).replace(/\r\n$/, '');
    const nameMatch = /name="([^"]+)"/.exec(headers);
    if (nameMatch) result[nameMatch[1]] = body.trim();
  }
  return result;
}

function parseBody(req, raw) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) {
    try { return JSON.parse(raw); } catch (_) { return {}; }
  }
  if (ct.includes('multipart/form-data')) {
    return parseMultipart(raw, ct);
  }
  const params = new URLSearchParams(raw);
  const obj = {};
  for (const [k, v] of params) obj[k] = v;
  return obj;
}

function detectLayout(tpl) {
  if (tpl === 'page.mops-admin') return 'mops-admin';
  return 'theme';
}

async function renderFullPage(tpl, searchParams, options = {}) {
  const tplFile = resolveTemplatePath(tpl);
  if (!fs.existsSync(tplFile)) {
    throw new Error(`Template không tồn tại: templates/${tpl}.bwt`);
  }

  const rawTpl = fs.readFileSync(tplFile, 'utf8');
  const layoutName = detectLayout(tpl);
  const layoutFile = path.join(ROOT, 'layouts', `${layoutName}.bwt`);
  const rawLayout = fs.readFileSync(layoutFile, 'utf8');

  const ctx = mockModule.getContext(tpl, searchParams);
  if (options.cartOverride) {
    ctx.cart = options.cartOverride;
  }

  const bodyHtml = await engine.parseAndRender(rawTpl, ctx);
  const fullHtml = await engine.parseAndRender(rawLayout, {
    ...ctx,
    content_for_layout: bodyHtml,
  });

  if (IS_PROD_SERVER) {
    return fullHtml;
  }

  const toolbarHtml = devToolbarHtml(tpl);
  const toolbarStyle = devToolbarStyle();
  return fullHtml.replace('</body>', `${toolbarStyle}${toolbarHtml}</body>`);
}

async function requestHandler(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname === '/api/skin-analysis') {
    if (req.method !== 'POST') {
      res.writeHead(405, { Allow: 'POST', 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: 'method_not_allowed' }));
      return;
    }
    const forwardedIp = process.env.VERCEL
      ? (req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'])
      : (req.headers['x-forwarded-for'] || req.socket.remoteAddress);
    const ip = String(forwardedIp || 'unknown').split(',')[0].trim();
    const rateAllowed = await allowSkinAnalysis(ip);
    if (!rateAllowed) {
      res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: 'rate_limited' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, message: 'local_preview_mock' }));
    return;
  }

  if (pathname === '/cart.js') {
    const cart = buildCartFromLines(readCartLines(req));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(cart));
    return;
  }

  if (pathname === '/cart/add' && req.method === 'POST') {
    const raw = await readRequestBody(req);
    const body = parseBody(req, raw);
    const variantId = body.variantId || body.VariantId || body.id;
    const qty = parseInt(body.quantity || 1, 10);
    const lines = readCartLines(req);
    const existing = lines.find((l) => String(l.variantId) === String(variantId));
    if (existing) existing.quantity += qty;
    else lines.push({ variantId, quantity: qty });
    writeCartCookie(res, lines);
    res.writeHead(302, { Location: '/cart' });
    res.end();
    return;
  }

  if (pathname === '/cart/add.js' && req.method === 'POST') {
    const raw = await readRequestBody(req);
    const body = parseBody(req, raw);
    const variantId = body.variantId || body.VariantId || body.id;
    const qty = parseInt(body.quantity || 1, 10);
    const lines = readCartLines(req);
    const existing = lines.find((l) => String(l.variantId) === String(variantId));
    if (existing) existing.quantity += qty;
    else lines.push({ variantId, quantity: qty });
    writeCartCookie(res, lines);
    const cart = buildCartFromLines(lines);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(cart));
    return;
  }

  if (pathname === '/cart/change.js' && req.method === 'POST') {
    const raw = await readRequestBody(req);
    const body = parseBody(req, raw);
    const variantId = body.variantId || body.VariantId || body.id;
    const qty = parseInt(body.quantity || 0, 10);
    let lines = readCartLines(req);
    if (qty <= 0) lines = lines.filter((l) => String(l.variantId) !== String(variantId));
    else {
      const line = lines.find((l) => String(l.variantId) === String(variantId));
      if (line) line.quantity = qty;
    }
    writeCartCookie(res, lines);
    const cart = buildCartFromLines(lines);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(cart));
    return;
  }

  if (pathname === '/cart/clear.js' && req.method === 'POST') {
    writeCartCookie(res, []);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ items: [], item_count: 0, total_price: 0 }));
    return;
  }

  if (pathname.startsWith('/assets/')) {
    const assetName = pathname.replace('/assets/', '');
    const asset = await compileAsset(assetName);
    if (!asset) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Asset không tồn tại: ${assetName}`);
      return;
    }
    res.writeHead(200, { 'Content-Type': asset.mime });
    if (asset.isBinary) {
      fs.createReadStream(asset.srcPath).pipe(res);
    } else {
      res.end(asset.content);
    }
    return;
  }

  const PATH_ROUTES = {
    '/mops-admin': 'page.mops-admin',
    '/dich-vu/getglowing-micro-peel-ha-noi': 'page.getglowing-micro-peel',
  };

  if (Object.prototype.hasOwnProperty.call(PATH_ROUTES, pathname)) {
    try {
      const html = await renderFullPage(PATH_ROUTES[pathname], null, { cartOverride: buildCartFromLines(readCartLines(req)) });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      console.error('[render error]', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Render error: ' + err.message);
    }
    return;
  }

  if (pathname === '/' || pathname === '') {
    const tpl = url.searchParams.get('tpl') || 'index';
    try {
      const html = await renderFullPage(tpl, url.searchParams, { cartOverride: buildCartFromLines(readCartLines(req)) });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      console.error('[render error]', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Render error: ' + err.message);
    }
    return;
  }

  const matched = resolvePrettyPath(pathname, url.searchParams);
  if (matched) {
    if (matched.redirect) {
      res.writeHead(302, { Location: matched.redirect });
      res.end();
      return;
    }
    try {
      const html = await renderFullPage(matched.tpl, url.searchParams, { cartOverride: buildCartFromLines(readCartLines(req)) });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      console.error('[render error]', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Render error: ' + err.message);
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  try {
    const html = await renderFullPage('404', null);
    res.end(html);
  } catch (_) {
    res.end('<h1>404 Not Found</h1>');
  }
}

if (require.main === module) {
  const server = http.createServer(requestHandler);
  server.listen(PORT, () => {
    console.log(`\n🚀 Dev Preview Server chạy tại http://localhost:${PORT}`);
  });
}

module.exports = requestHandler;
