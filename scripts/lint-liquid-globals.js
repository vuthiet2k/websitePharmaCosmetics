#!/usr/bin/env node
/**
 * lint-liquid-globals.js (2026-10-03) — phát hiện biến Liquid KHÔNG tồn tại trên Sapo.
 *
 * Bối cảnh: nhiều template từng đọc biến chỉ có ở preview-mock.js (doctors, b2b_tiers, faqs,
 * patient_testimonials...) — preview local vẫn đẹp nhưng trên Sapo thật = nil → trang trắng.
 * Script quét templates/, snippets/, layouts/: lấy mọi định danh cấp đầu được ĐỌC trong
 * {{ }} / {% %}, trừ đi (1) 38 đối tượng Liquid của Sapo (Rule&HDKTXD.md), (2) biến được
 * assign/capture/for/tablerow/increment ở BẤT KỲ file nào (snippet dùng chung scope với file
 * include nó), (3) từ khoá Liquid. Phần còn lại = biến không có nguồn trên Sapo.
 *
 * Thoát mã 1 khi có vi phạm (dùng trong build:sapo). Ngoại lệ có lý do ghi ở ALLOW bên dưới.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['templates', 'snippets', 'layouts'];

// 38 đối tượng Liquid Sapo (Rule&HDKTXD.md — Global / Context / Helper).
const SAPO_OBJECTS = [
  'all_products', 'blogs', 'cart', 'collections', 'content_for_header', 'content_for_layout',
  'current_page', 'current_tags', 'customer', 'linklists', 'pages', 'page_description',
  'page_title', 'settings', 'store', 'template',
  'address', 'article', 'blog', 'collection', 'comment', 'customer_address', 'line_item', 'link',
  'linklist', 'order', 'page', 'product', 'request', 'search', 'shipping_method', 'transaction',
  'variant',
  'country_option_tags', 'forloop', 'form', 'paginate', 'part',
];
// Ngoại lệ đã kiểm chứng — mỗi mục phải có lý do.
const ALLOW = {
  canonical_url: 'biến chuẩn của Sapo layout (dùng cho <link rel="canonical">)',
  tablerowloop: 'helper của {% tablerow %}',
  // Code theme gốc Bizweb/Sapo (không phải mock của repo) — CHƯA xác nhận trên Sapo thật:
  social_login: 'nút đăng nhập MXH Sapo trả về (customers/login, register) — đã có if != blank',
  routes: 'template Mustache ajaxcart gốc Bizweb (routes.cart_url)',
  amount: 'chuỗi định dạng tiền "{{amount}}" trong thư viện Bizweb (ajaxcartfunction)',
  articles: 'articles[handle] của tính năng kiểm duyệt dược sĩ gốc Bizweb (article, tab_product)',
  // Tham số tuỳ chọn của snippet, đã có giá trị mặc định khi không truyền:
  skeleton: "tham số tuỳ chọn mops_admin_state_block (mặc định 'table')",
  booking_url: "tham số tuỳ chọn product_grid_skinhealthy (| default: '/dat-lich-tu-van')",
};
const KEYWORDS = new Set([
  'true', 'false', 'nil', 'null', 'empty', 'blank', 'and', 'or', 'not', 'contains', 'in', 'with',
  'as', 'limit', 'offset', 'reversed', 'cols', 'else', 'elsif', 'elseif', 'endif', 'endfor',
  'endunless', 'endcase', 'endcapture', 'endcomment', 'endraw', 'endtablerow', 'when', 'by',
  'size', 'first', 'last',
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith('.bwt') ? [p] : [];
  });
}

// Bỏ comment/raw và nội dung <script>/<style> KHÔNG chứa Liquid để tránh bắt nhầm JS.
// Giữ nguyên số dòng (thay khối bị bỏ bằng đúng số ký tự xuống dòng) để báo đúng file:dòng.
const blankOut = (m) => m.replace(/[^\n]/g, '');
function stripNonLiquid(src) {
  return src
    .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, blankOut)
    .replace(/\{%-?\s*raw\s*-?%\}[\s\S]*?\{%-?\s*endraw\s*-?%\}/g, blankOut);
}

function tags(src) {
  const out = [];
  const re = /\{\{-?([\s\S]*?)-?\}\}|\{%-?([\s\S]*?)-?%\}/g;
  let m;
  while ((m = re.exec(src))) out.push({ text: (m[1] ?? m[2]).trim(), isOutput: m[1] !== undefined, index: m.index });
  return out;
}

// Định danh cấp đầu trong một biểu thức Liquid (bỏ chuỗi, tên filter, tham số filter dạng key:).
function rootIdents(expr) {
  const noStr = expr.replace(/'[^']*'|"[^"]*"/g, ' ');
  const parts = noStr.split('|');
  const ids = [];
  parts.forEach((part, i) => {
    let seg = part;
    if (i > 0) seg = seg.replace(/^\s*[\w-]+\s*:?/, ' '); // tên filter
    seg = seg.replace(/\b[\w-]+\s*:(?!\/)/g, ' '); // tham số đặt tên key: value
    const re = /(^|[^\w.\]\-])([A-Za-z_][\w-]*)/g;
    let m;
    while ((m = re.exec(seg))) {
      const id = m[2];
      if (!KEYWORDS.has(id) && !/^\d/.test(id)) ids.push(id);
    }
  });
  return ids;
}

const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const defined = new Set();
const uses = []; // { id, file, line }

const parsed = files.map((f) => {
  const src = stripNonLiquid(fs.readFileSync(f, 'utf8'));
  return { f, src, tags: tags(src) };
});

// Lượt 1: thu thập mọi biến được định nghĩa ở bất kỳ file nào.
for (const { tags: ts } of parsed) {
  for (const t of ts) {
    if (t.isOutput) continue;
    let m;
    if ((m = t.text.match(/^(?:assign|capture|increment|decrement)\s+([\w-]+)/))) defined.add(m[1]);
    if ((m = t.text.match(/^(?:for|tablerow)\s+([\w-]+)\s+in\b/))) defined.add(m[1]);
    if ((m = t.text.match(/^paginate\b/))) defined.add('paginate');
    // include 'x', key: val / include 'x' key: val → snippet x nhận biến key;
    // include 'x' with obj → snippet x nhận biến tên x.
    if ((m = t.text.match(/^(?:include|render)\s+['"]([\w-]+)['"]([\s\S]*)$/))) {
      if (/^\s*,?\s*(?:with|for)\b/.test(m[2])) defined.add(m[1]);
      const re = /([\w-]+)\s*:/g;
      const rest = m[2].replace(/'[^']*'|"[^"]*"/g, ' ');
      let k;
      while ((k = re.exec(rest))) defined.add(k[1]);
    }
  }
}

// Lượt 2: thu thập biến được đọc.
for (const { f, src, tags: ts } of parsed) {
  for (const t of ts) {
    let expr = null;
    if (t.isOutput) expr = t.text;
    else {
      let m;
      if ((m = t.text.match(/^(?:if|elsif|elseif|unless|case|when)\b([\s\S]*)$/))) expr = m[1];
      else if ((m = t.text.match(/^assign\s+[\w-]+\s*=([\s\S]*)$/))) expr = m[1];
      else if ((m = t.text.match(/^(?:for|tablerow)\s+[\w-]+\s+in\s+([\s\S]*)$/))) expr = m[1].replace(/\(\s*[\w.\s]+\.\.[\w.\s]+\)/g, (r) => r.replace(/\.\./, ' '));
      else if ((m = t.text.match(/^(?:include|render)\s+(?:'[^']*'|"[^"]*")([\s\S]*)$/))) expr = m[1].replace(/^\s*(?:with|for)\s+/, ' ');
      else if ((m = t.text.match(/^paginate\s+([\s\S]*)$/))) expr = m[1].replace(/\bby\b[\s\S]*$/, '');
    }
    if (!expr) continue;
    const line = src.slice(0, t.index).split('\n').length;
    for (const id of rootIdents(expr)) uses.push({ id, file: path.relative(ROOT, f).replace(/\\/g, '/'), line });
  }
}

const sapo = new Set(SAPO_OBJECTS);
const bad = uses.filter((u) => !sapo.has(u.id) && !defined.has(u.id) && !(u.id in ALLOW));
const byId = {};
bad.forEach((u) => (byId[u.id] = byId[u.id] || []).push(`${u.file}:${u.line}`));

// Kiểm tra 2 (2026-10-03): mọi settings.X đọc trong Liquid phải được khai báo ở
// configs/settings_schema.json — nếu không, admin không sửa được trên Sapo (giá trị kẹt ở
// settings_data hoặc luôn nil). File bỏ qua phải có lý do.
const SETTINGS_IGNORE_FILES = {
  'snippets/popup_sapo.bwt': 'popup demo của theme gốc Sapo, mọi cờ use_thongbao* = false',
  'snippets/section_clinical_banner.bwt': 'snippet không được include ở đâu',
};
const schemaIds = new Set();
JSON.parse(fs.readFileSync(path.join(ROOT, 'configs/settings_schema.json'), 'utf8'))
  .forEach((sec) => sec.settings.forEach((x) => x.id && schemaIds.add(x.id)));
const undeclared = {};
for (const { f, src, tags: ts } of parsed) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  if (rel in SETTINGS_IGNORE_FILES) continue;
  for (const t of ts) {
    const code = t.text.replace(/'[^']*'|"[^"]*"/g, ' ');
    for (const m of code.matchAll(/\bsettings\.([A-Za-z_]\w*)/g)) {
      if (schemaIds.has(m[1])) continue;
      const line = src.slice(0, t.index).split('\n').length;
      (undeclared[m[1]] = undeclared[m[1]] || []).push(`${rel}:${line}`);
    }
  }
}

const ids = Object.keys(byId).sort();
const sids = Object.keys(undeclared).sort();
if (!ids.length && !sids.length) {
  console.log(`[lint:liquid-globals] PASS — ${files.length} file, không có biến ngoài 38 đối tượng Sapo, mọi settings.* đã khai báo trong schema.`);
  process.exit(0);
}
if (ids.length) {
  console.log(`[lint:liquid-globals] FAIL — ${ids.length} biến không có nguồn trên Sapo (nil khi chạy thật):`);
  for (const id of ids) {
    const locs = [...new Set(byId[id])];
    console.log(`  ${id}  (${locs.length} chỗ)  ${locs.slice(0, 6).join(', ')}${locs.length > 6 ? ', ...' : ''}`);
  }
}
if (sids.length) {
  console.log(`[lint:liquid-globals] FAIL — ${sids.length} settings.* chưa khai báo trong configs/settings_schema.json (admin không sửa được):`);
  for (const id of sids) {
    const locs = [...new Set(undeclared[id])];
    console.log(`  settings.${id}  ${locs.slice(0, 4).join(', ')}${locs.length > 4 ? ', ...' : ''}`);
  }
}
process.exit(1);
