#!/usr/bin/env node
/**
 * data-profile-products.mjs — Hồ sơ chất lượng data/products-data.json (SPEC-TEAM-TRIAL-01 / T3).
 *
 * CHỈ ĐỌC data/products-data.json; chỉ GHI docs/data/products-data-quality.{md,json}.
 * Idempotent: không đưa timestamp vào đầu ra, sắp xếp ổn định ⇒ chạy 2 lần ra cùng byte.
 * Chạy: node scripts/data-profile-products.mjs
 *
 * Ý nghĩa khoá rút gọn (xác định từ data/products.js, hàm makeVariant/đọc r.*):
 *   i id | n tên | a alias(handle) | v vendor | t loại (product_type) | g mảng tag | s summary HTML
 *   o tên option | m mảng ảnh | f ảnh đại diện | av còn bán (0/1)
 *   z biến thể [id, title, price, compare_at_price, sku, available, inventory_quantity, ảnh, option1, option2, option3]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data', 'products-data.json');
const OUT_DIR = path.join(ROOT, 'docs', 'data');
const OUT_MD = path.join(OUT_DIR, 'products-data-quality.md');
const OUT_JSON = path.join(OUT_DIR, 'products-data-quality.json');
const MAX_EX = 10;

const rows = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const total = rows.length;

// ---------- tiện ích ----------
const norm = (s) => String(s ?? '').trim().toLowerCase();
const fold = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
const blank = (v) => v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Gom lỗi: { count, examples[] (id), } */
function bucket() { return { count: 0, examples: [] }; }
function hit(b, id) { if (b._last === id) return; b._last = id; b.count++; if (b.examples.length < MAX_EX) b.examples.push(id); }

function dupGroups(keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k === '' || k == null) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r.i);
  }
  const groups = [...map.entries()].filter(([, ids]) => ids.length > 1)
    .sort((x, y) => y[1].length - x[1].length || cmp(String(x[0]), String(y[0])));
  return {
    nhom: groups.length,
    banGhiThua: groups.reduce((s, [, ids]) => s + ids.length - 1, 0),
    vidu: groups.slice(0, MAX_EX).map(([k, ids]) => ({ khoa: String(k).slice(0, 80), ids: ids.slice(0, MAX_EX), soLuong: ids.length })),
  };
}

// ---------- 1. tổng + trùng ----------
const dup = {
  id: dupGroups((r) => r.i),
  alias: dupGroups((r) => r.a),
  ten: dupGroups((r) => norm(r.n).replace(/\s+/g, ' ')),
};

// ---------- 2. trường thiếu/rỗng ----------
const missing = {};
const missDefs = {
  'i (id)': (r) => r.i == null || r.i === '',
  'n (tên)': (r) => blank(r.n),
  'a (alias)': (r) => blank(r.a),
  'v (vendor)': (r) => blank(r.v),
  't (loại)': (r) => blank(r.t),
  'g (tag)': (r) => blank(r.g),
  's (summary HTML)': (r) => blank(r.s) || blank(String(r.s).replace(/<[^>]*>|&nbsp;/g, '')),
  'm (ảnh phụ)': (r) => blank(r.m),
  'f (ảnh đại diện)': (r) => blank(r.f),
  'z (biến thể)': (r) => blank(r.z),
  'giá = 0 hoặc thiếu (mọi biến thể)': (r) => Array.isArray(r.z) && r.z.length > 0 && r.z.every((v) => !(Number(v[2]) > 0)),
  'giá = 0 hoặc thiếu (≥1 biến thể)': (r) => Array.isArray(r.z) && r.z.some((v) => !(Number(v[2]) > 0)),
  'sku rỗng (≥1 biến thể)': (r) => Array.isArray(r.z) && r.z.some((v) => blank(v[4])),
  'av = 0 (hết bán/không bán)': (r) => !r.av,
};
for (const [k, fn] of Object.entries(missDefs)) {
  const b = bucket();
  for (const r of rows) if (fn(r)) hit(b, r.i);
  missing[k] = b;
}
// compare_at_price < price (giá gạch bất hợp lý)
{
  const b = bucket();
  for (const r of rows) if (Array.isArray(r.z) && r.z.some((v) => v[3] && Number(v[3]) > 0 && Number(v[3]) < Number(v[2]))) hit(b, r.i);
  missing['giá gốc (compare) < giá bán (≥1 biến thể)'] = b;
}

// ---------- 3. alias sai định dạng ----------
const aliasBad = {
  'ký tự ngoài [a-z0-9-]': bucket(),
  'chứa "--"': bucket(),
  'bắt đầu bằng "-"': bucket(),
  'kết thúc bằng "-"': bucket(),
  'alias có chữ hoa': bucket(),
  'alias rỗng': bucket(),
};
for (const r of rows) {
  const a = r.a;
  if (blank(a)) { hit(aliasBad['alias rỗng'], r.i); continue; }
  if (/[^a-z0-9-]/.test(a)) hit(aliasBad['ký tự ngoài [a-z0-9-]'], r.i);
  if (/[A-Z]/.test(a)) hit(aliasBad['alias có chữ hoa'], r.i);
  if (a.includes('--')) hit(aliasBad['chứa "--"'], r.i);
  if (a.startsWith('-')) hit(aliasBad['bắt đầu bằng "-"'], r.i);
  if (a.endsWith('-')) hit(aliasBad['kết thúc bằng "-"'], r.i);
}

// ---------- 4. tag ----------
const tagStat = {
  'tổng tag (lượt)': 0,
  'tag duy nhất (nguyên văn)': 0,
  'tag chứa dấu phẩy': bucket(),
  'tag có khoảng trắng đầu/cuối': bucket(),
  'tag có khoảng trắng kép bên trong': bucket(),
  'tag trùng khác hoa/thường trong cùng SP': bucket(),
  'tag trùng y hệt trong cùng SP': bucket(),
  'tag kết thúc bằng dấu chấm': bucket(),
  'tag rỗng': bucket(),
};
const tagCountRaw = new Map();   // nguyên văn -> số lượt
const tagVariants = new Map();   // khoá chuẩn hoá (fold) -> Map(nguyên văn -> số lượt)
const tagDotSet = new Map();
const tagCommaSet = new Map();
for (const r of rows) {
  const g = Array.isArray(r.g) ? r.g : [];
  const seenNorm = new Map();
  const seenRaw = new Set();
  let dupCase = false, dupExact = false;
  for (const t of g) {
    tagStat['tổng tag (lượt)']++;
    const s = String(t);
    tagCountRaw.set(s, (tagCountRaw.get(s) || 0) + 1);
    const fk = fold(s);
    if (fk) {
      if (!tagVariants.has(fk)) tagVariants.set(fk, new Map());
      const m = tagVariants.get(fk);
      m.set(s, (m.get(s) || 0) + 1);
    }
    if (s.trim() === '') hit(tagStat['tag rỗng'], r.i);
    if (s.includes(',')) { hit(tagStat['tag chứa dấu phẩy'], r.i); tagCommaSet.set(s, (tagCommaSet.get(s) || 0) + 1); }
    if (s !== s.trim()) hit(tagStat['tag có khoảng trắng đầu/cuối'], r.i);
    if (/\s{2,}/.test(s.trim())) hit(tagStat['tag có khoảng trắng kép bên trong'], r.i);
    if (s.trim().endsWith('.')) { hit(tagStat['tag kết thúc bằng dấu chấm'], r.i); tagDotSet.set(s, (tagDotSet.get(s) || 0) + 1); }
    const nk = norm(s).replace(/\s+/g, ' ');
    if (seenRaw.has(s)) dupExact = true;
    else if (seenNorm.has(nk)) dupCase = true;
    seenRaw.add(s);
    seenNorm.set(nk, s);
  }
  if (dupCase) hit(tagStat['tag trùng khác hoa/thường trong cùng SP'], r.i);
  if (dupExact) hit(tagStat['tag trùng y hệt trong cùng SP'], r.i);
}
tagStat['tag duy nhất (nguyên văn)'] = tagCountRaw.size;

// Top 20 nhóm tag gần trùng: cùng khoá chuẩn hoá (bỏ dấu/hoa thường/ký tự đặc biệt) nhưng ≥2 cách viết
const nearDup = [...tagVariants.entries()]
  .filter(([, m]) => m.size > 1)
  .map(([k, m]) => ({
    khoa: k.slice(0, 60),
    tongLuot: [...m.values()].reduce((a, b) => a + b, 0),
    bienThe: [...m.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).map(([t, c]) => ({ tag: t, luot: c })),
  }))
  .sort((a, b) => b.bienThe.length - a.bienThe.length || b.tongLuot - a.tongLuot || cmp(a.khoa, b.khoa));
const nearDupTotal = nearDup.length;
const nearDupTop = nearDup.slice(0, 20);

// ---------- 5. vendor / type ----------
function variantsReport(field) {
  const byKey = new Map();
  const empties = bucket();
  for (const r of rows) {
    const raw = r[field];
    if (blank(raw)) { hit(empties, r.i); continue; }
    const k = fold(raw);
    if (!byKey.has(k)) byKey.set(k, new Map());
    const m = byKey.get(k);
    if (!m.has(raw)) m.set(raw, { n: 0, ids: [] });
    const e = m.get(raw);
    e.n++;
    if (e.ids.length < 3) e.ids.push(r.i);
  }
  const all = [...byKey.entries()].map(([k, m]) => ({
    khoa: k,
    tong: [...m.values()].reduce((s, e) => s + e.n, 0),
    bienThe: [...m.entries()].sort((a, b) => b[1].n - a[1].n || cmp(a[0], b[0])).map(([v, e]) => ({ gia_tri: v, soSP: e.n, idMau: e.ids })),
  }));
  const conflicting = all.filter((x) => x.bienThe.length > 1).sort((a, b) => b.tong - a.tong || cmp(a.khoa, b.khoa));
  // Giá trị có khoảng trắng đầu/cuối hoặc kép
  const spaceBad = bucket();
  for (const r of rows) {
    const v = r[field];
    if (typeof v === 'string' && (v !== v.trim() || /\s{2,}/.test(v))) hit(spaceBad, r.i);
  }
  return {
    giaTriDuyNhat: all.reduce((s, x) => s + x.bienThe.length, 0),
    nhomChuanHoa: all.length,
    nhomNhieuCachViet: conflicting.length,
    rong: empties,
    khoangTrangThua: spaceBad,
    nhomXungDot: conflicting.slice(0, 40),
    top10: all.slice().sort((a, b) => b.tong - a.tong || cmp(a.khoa, b.khoa)).slice(0, 10)
      .map((x) => ({ gia_tri: x.bienThe[0].gia_tri, soSP: x.tong })),
  };
}
const vendor = variantsReport('v');
const type = variantsReport('t');

// ---------- 6. HTML summary (s) ----------
const htmlDefs = {
  'có style= inline': /\sstyle\s*=/i,
  'có font-family cứng': /font-family\s*:/i,
  'có font-size cứng': /font-size\s*:/i,
  'có thẻ <font>': /<font[\s>]/i,
  'thẻ rỗng (<p></p>, <p>&nbsp;</p>, <span></span>, <div></div>...)':
    /<(p|span|div|strong|em|b|i|h[1-6]|li)(\s[^>]*)?>\s*(?:&nbsp;|\s|<br\s*\/?>)*<\/\1>/i,
  'có <br> liên tiếp (≥3)': /(<br\s*\/?>\s*){3,}/i,
  'có thẻ <script>': /<script[\s>]/i,
  'có &nbsp; liên tiếp (≥3)': /(&nbsp;\s*){3,}/i,
};
const html = {};
for (const k of Object.keys(htmlDefs)) html[k] = bucket();
let hasS = 0;
for (const r of rows) {
  if (blank(r.s)) continue;
  hasS++;
  const s = String(r.s);
  for (const [k, re] of Object.entries(htmlDefs)) if (re.test(s)) hit(html[k], r.i);
}

// ---------- 7. tên ----------
const nameIssues = {
  'tên có khoảng trắng đầu/cuối hoặc kép': bucket(),
  'tên toàn chữ HOA (có ≥ 6 chữ cái)': bucket(),
  'tên dài > 120 ký tự': bucket(),
};
for (const r of rows) {
  const n = String(r.n ?? '');
  if (n !== n.trim() || /\s{2,}/.test(n)) hit(nameIssues['tên có khoảng trắng đầu/cuối hoặc kép'], r.i);
  const letters = n.replace(/[^\p{L}]/gu, '');
  if (letters.length >= 6 && n === n.toUpperCase()) hit(nameIssues['tên toàn chữ HOA (có ≥ 6 chữ cái)'], r.i);
  if (n.length > 120) hit(nameIssues['tên dài > 120 ký tự'], r.i);
}

// ---------- kết quả ----------
const result = {
  nguon: 'data/products-data.json',
  tongBanGhi: total,
  khoaTonTai: (() => { const c = {}; rows.forEach((r) => Object.keys(r).forEach((k) => (c[k] = (c[k] || 0) + 1))); return Object.fromEntries(Object.entries(c).sort((a, b) => cmp(a[0], b[0]))); })(),
  trung: dup,
  truongThieu: missing,
  aliasSaiDinhDang: aliasBad,
  tag: {
    ...tagStat,
    nhomGanTrungTong: nearDupTotal,
    nhomGanTrungTop20: nearDupTop,
    tagKetThucDauChamTop: [...tagDotSet.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).slice(0, 10).map(([t, c]) => ({ tag: t, luot: c })),
    tagCoDauPhayTop: [...tagCommaSet.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).slice(0, 10).map(([t, c]) => ({ tag: t, luot: c })),
  },
  vendor,
  loai: type,
  htmlSummary: { soSPCoSummary: hasS, ...html },
  ten: nameIssues,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(result, (k, v) => (k === '_last' ? undefined : v), 2) + '\n', 'utf8');

// ---------- Markdown ----------
const pct = (n) => (total ? ((n / total) * 100).toFixed(1) + '%' : '0%');
const ex = (b) => (b.examples.length ? b.examples.join(', ') : '—');
const rowB = (name, b) => `| ${name} | ${b.count} | ${pct(b.count)} | ${ex(b)} |`;
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const L = [];
L.push('# Hồ sơ chất lượng `data/products-data.json`');
L.push('');
L.push('> Sinh tự động bởi `node scripts/data-profile-products.mjs` (đọc-only, idempotent, không timestamp). Không sửa tay — chạy lại script để cập nhật.');
L.push('> Phạm vi: chỉ đo; **chưa áp dụng** bất kỳ thay đổi nào lên dữ liệu gốc. Không có dữ liệu khách hàng trong báo cáo.');
L.push('');
L.push('## 1. Tổng quan và ý nghĩa khoá rút gọn');
L.push('');
L.push(`Tổng bản ghi: **${total}**. Số bản ghi có từng khoá: ${Object.entries(result.khoaTonTai).map(([k, v]) => `\`${k}\`=${v}`).join(', ')}.`);
L.push('');
L.push('| Khoá | Ý nghĩa | Căn cứ |');
L.push('|---|---|---|');
L.push('| `i` | id sản phẩm | `data/products.js` (r.i → id) |');
L.push('| `n` | tên | `data/products.js` |');
L.push('| `a` | alias (handle) | `data/products.js` |');
L.push('| `v` | vendor (hãng) | tiêu đề file `products.js`: "tên, alias, hãng, loại, tag…" |');
L.push('| `t` | loại sản phẩm (product_type) | như trên |');
L.push('| `g` | mảng tag | như trên, dữ liệu là mảng chuỗi |');
L.push('| `s` | summary HTML | như trên, dữ liệu mẫu là HTML |');
L.push('| `o` | tên option | `products.js`: `options: r.o` |');
L.push('| `m` | mảng ảnh phụ (tên file) | `products.js`: `images = r.m.map` |');
L.push('| `f` | ảnh đại diện | `products.js`: `featuredSrc = r.f` |');
L.push('| `z` | biến thể `[id,title,price,compare_at_price,sku,available,qty,img,opt1,opt2,opt3]` | `products.js` `makeVariant` |');
L.push('| `av` | còn bán (0/1) | `products.js`: `available: !!r.av` |');
L.push('');
L.push('Ghi chú: chưa có khoá mô tả chi tiết trong file này (nằm ở `products-content.json.gz`, ngoài phạm vi báo cáo). Khoá `s` ở đây là summary.');
L.push('');
L.push('## 2. Trùng lặp');
L.push('');
L.push('| Khoá trùng | Số nhóm trùng | Bản ghi dư | Ví dụ (khoá → id) |');
L.push('|---|---|---|---|');
for (const [name, d] of [['id (`i`)', dup.id], ['alias (`a`)', dup.alias], ['tên (`n`, trim+lowercase+gộp khoảng trắng)', dup.ten]]) {
  const v = d.vidu.map((x) => `${esc(x.khoa)} → ${x.ids.join('/')}`).join('; ') || '—';
  L.push(`| ${name} | ${d.nhom} | ${d.banGhiThua} | ${v} |`);
}
L.push('');
L.push('## 3. Trường thiếu / rỗng / bất hợp lý');
L.push('');
L.push('| Kiểm tra | Số SP | Tỷ lệ | Ví dụ id (≤10) |');
L.push('|---|---|---|---|');
for (const [k, b] of Object.entries(missing)) L.push(rowB(k, b));
L.push('');
L.push('## 4. Alias sai định dạng (chuẩn `[a-z0-9-]`, không `--`, không đầu/cuối `-`)');
L.push('');
L.push('| Lỗi | Số SP | Tỷ lệ | Ví dụ id |');
L.push('|---|---|---|---|');
for (const [k, b] of Object.entries(aliasBad)) L.push(rowB(k, b));
L.push('');
L.push('## 5. Tag (`g`)');
L.push('');
L.push(`Tổng lượt tag: **${tagStat['tổng tag (lượt)']}**; tag duy nhất (nguyên văn): **${tagStat['tag duy nhất (nguyên văn)']}**.`);
L.push('');
L.push('| Lỗi | Số SP | Tỷ lệ | Ví dụ id |');
L.push('|---|---|---|---|');
for (const [k, b] of Object.entries(tagStat)) if (typeof b === 'object') L.push(rowB(k, b));
L.push('');
if (result.tag.tagCoDauPhayTop.length) {
  L.push('Tag chứa dấu phẩy (top): ' + result.tag.tagCoDauPhayTop.map((x) => `\`${esc(x.tag)}\` (${x.luot})`).join('; '));
  L.push('');
}
if (result.tag.tagKetThucDauChamTop.length) {
  L.push('Tag kết thúc bằng dấu chấm (top): ' + result.tag.tagKetThucDauChamTop.map((x) => `\`${esc(x.tag)}\` (${x.luot})`).join('; '));
  L.push('');
}
L.push(`### Top 20 nhóm tag gần trùng (cùng khoá bỏ dấu/hoa thường/ký tự đặc biệt, ≥2 cách viết) — tổng ${nearDupTotal} nhóm`);
L.push('');
L.push('| # | Các cách viết (số lượt) |');
L.push('|---|---|');
nearDupTop.forEach((g, i) => L.push(`| ${i + 1} | ${g.bienThe.map((b) => `\`${esc(b.tag)}\` (${b.luot})`).join('; ')} |`));
L.push('');
function vtSection(title, d, label) {
  L.push(`## ${title}`);
  L.push('');
  L.push(`Giá trị duy nhất (nguyên văn): **${d.giaTriDuyNhat}**; sau chuẩn hoá: **${d.nhomChuanHoa}**; nhóm có ≥2 cách viết: **${d.nhomNhieuCachViet}**; rỗng: **${d.rong.count}** (id: ${ex(d.rong)}); khoảng trắng thừa: **${d.khoangTrangThua.count}** (id: ${ex(d.khoangTrangThua)}).`);
  L.push('');
  L.push(`Top 10 ${label} theo số SP: ${d.top10.map((x) => `${esc(x.gia_tri)} (${x.soSP})`).join('; ')}.`);
  L.push('');
  if (d.nhomXungDot.length) {
    L.push(`Các nhóm viết khác nhau của cùng ${label} (tối đa 40 nhóm, sắp theo số SP):`);
    L.push('');
    L.push(`| Khoá chuẩn hoá | Biến thể → số SP (id mẫu) |`);
    L.push('|---|---|');
    for (const g of d.nhomXungDot) L.push(`| ${esc(g.khoa)} | ${g.bienThe.map((b) => `\`${esc(b.gia_tri)}\` → ${b.soSP} (${b.idMau.join('/')})`).join('; ')} |`);
    L.push('');
  }
}
vtSection('6. Vendor (`v`)', vendor, 'vendor');
vtSection('7. Loại (`t`)', type, 'loại');
L.push('## 8. HTML summary (`s`)');
L.push('');
L.push(`SP có summary không rỗng: **${hasS}**/${total}.`);
L.push('');
L.push('| Dấu hiệu | Số SP | Tỷ lệ (trên tổng) | Ví dụ id |');
L.push('|---|---|---|---|');
for (const k of Object.keys(htmlDefs)) L.push(rowB(k, html[k]));
L.push('');
L.push('## 9. Tên (`n`)');
L.push('');
L.push('| Dấu hiệu | Số SP | Tỷ lệ | Ví dụ id |');
L.push('|---|---|---|---|');
for (const [k, b] of Object.entries(nameIssues)) L.push(rowB(k, b));
L.push('');
L.push('## 10. Đề xuất chuẩn hoá (CHƯA áp dụng; không ghi đè dữ liệu gốc)');
L.push('');
L.push('Mỗi quy tắc dưới đây sẽ viết thành script `scripts/data-clean-products.mjs` ghi ra file mới (`data/products-data.clean.json` hoặc bản diff), idempotent, chờ BA/chủ dự án duyệt.');
L.push('');
L.push('1. Tag: `trim`, gộp khoảng trắng kép; bỏ dấu chấm cuối; **tách** tag chứa dấu phẩy thành nhiều tag (Sapo tách theo dấu phẩy); khử trùng lặp không phân biệt hoa/thường trong cùng SP (giữ cách viết xuất hiện đầu).');
L.push('2. Tag gần trùng toàn cục: lập bảng ánh xạ "cách viết chuẩn" cho các nhóm ở mục 5 (chủ dự án chọn dạng chuẩn, mặc định lấy dạng nhiều lượt nhất).');
L.push('3. Vendor/loại: lập bảng ánh xạ về một tên chuẩn cho mỗi nhóm ở mục 6–7; trim khoảng trắng thừa.');
L.push('4. Alias: chỉ báo cáo, **không tự đổi** alias đang chạy (đổi alias làm gãy URL/SEO); nếu cần đổi phải kèm redirect 301 do chủ dự án duyệt.');
L.push('5. HTML summary: bỏ `style=`/`font-family`/`font-size`/`<font>` inline, xoá thẻ rỗng, gộp `<br>`/`&nbsp;` thừa — chạy trên bản sao, so sánh diff trước khi duyệt.');
L.push('6. SP trùng id/alias/tên (mục 2): chỉ liệt kê để chủ dự án quyết định giữ/ẩn, không tự xoá.');
L.push('7. Tên toàn chữ hoa: chỉ gắn cờ; chuyển kiểu chữ chỉ làm bằng CSS ở giao diện, không sửa dữ liệu.');
L.push('');
L.push('## 11. Cần chủ dự án quyết / cung cấp');
L.push('');
L.push('- Tên chuẩn của từng vendor và loại có nhiều cách viết (mục 6–7); và dạng chuẩn của các nhóm tag gần trùng (mục 5).');
L.push('- Quyết định với SP trùng tên/alias (mục 2): giữ, ẩn hay gộp.');
L.push('- SP thiếu vendor / loại / tag / summary / ảnh / giá (mục 3): nội dung và giá thật do chủ dự án cung cấp — không được suy đoán hay bịa.');
L.push('- Có cho phép đổi alias sai định dạng không (kèm redirect 301) — mục 4.');
L.push('- Tag có dấu phẩy/dấu chấm: duyệt cách tách và danh sách tag chuẩn (mục 5).');
L.push('');
L.push('## 12. Cách chạy lại');
L.push('');
L.push('```bash');
L.push('node scripts/data-profile-products.mjs   # ghi docs/data/products-data-quality.{md,json}');
L.push('git status --porcelain data/             # phải rỗng');
L.push('```');
L.push('');
fs.writeFileSync(OUT_MD, L.join('\n'), 'utf8');
console.log(`OK: ${total} bản ghi → ${path.relative(ROOT, OUT_MD)}, ${path.relative(ROOT, OUT_JSON)}`);
