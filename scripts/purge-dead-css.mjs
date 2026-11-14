/**
 * scripts/purge-dead-css.mjs (14/11/2026, UI-0.4) — gỡ quy tắc CSS CHẾT khỏi file CSS/SCSS cũ khi chuyển markup sang class Tailwind.
 *
 * Quy tắc "chết" = mọi nhánh selector (tách theo dấu phẩy) đều chứa ÍT NHẤT 1 class không còn xuất hiện ở bất kỳ nguồn nào
 * có thể sinh markup: layouts/ templates/ snippets/ (.bwt), assets/*.js(.bwt), configs/settings_data.json, data/, dev-preview/.
 * Tìm theo CHUỖI CON (an toàn: tên class ghép động kiểu 'afw-chip--' + x vẫn được giữ). Class do app Sapo / thư viện ngoài sinh
 * (không có trong repo) được giữ theo tiền tố ở KEEP_PREFIX.
 *
 * Cách chạy:  node scripts/purge-dead-css.mjs assets/page_collection.scss.bwt [--write]
 *   - Không --write: chỉ báo cáo số quy tắc / class chết.
 *   - --write: biên dịch SCSS → CSS thuần (sass), bỏ quy tắc chết, ghi đè file (vẫn là SCSS hợp lệ). Comment `//` mất, `/* *​/` giữ.
 * File có Liquid ({{ }} / {% %}) không xử lý.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const file = process.argv[2];
const write = process.argv.includes('--write');
if (!file) { console.error('Thiếu đường dẫn file CSS/SCSS'); process.exit(1); }
const src = fs.readFileSync(file, 'utf8');
if (/\{\{|\{%/.test(src)) { console.error('File có Liquid — không xử lý tự động.'); process.exit(1); }

const KEEP_PREFIX = ['sapo-', 'bizweb-', 'bpr-', 'swiper-', 'ui-', 'noUi-', 'fa-', 'fb-', 'fb_', 'zalo', 'ab-', 'mfp-', 'slick-', 'owl-', 'lazy', 'grecaptcha', 'js-'];
const KEEP_EXACT = new Set(['active', 'open', 'show', 'hide', 'hidden', 'current', 'disabled', 'loaded', 'loading', 'in', 'fade', 'collapse', 'collapsed', 'selected', 'checked', 'error', 'success', 'container', 'row', 'clearfix']);

// Gom mọi nguồn có thể sinh markup thành 1 chuỗi lớn
const roots = ['layouts', 'templates', 'snippets', 'data', 'dev-preview'];
let hay = '';
const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(bwt|js|json|html)$/.test(e.name)) hay += '\n' + fs.readFileSync(p, 'utf8'); } };
roots.forEach(walk);
for (const f of fs.readdirSync('assets')) if (/\.js(\.bwt)?$/.test(f)) hay += '\n' + fs.readFileSync(path.join('assets', f), 'utf8');
hay += '\n' + fs.readFileSync('configs/settings_data.json', 'utf8');

const cache = new Map();
const alive = (cls) => {
  if (cache.has(cls)) return cache.get(cls);
  let ok = KEEP_EXACT.has(cls) || KEEP_PREFIX.some((p) => cls.startsWith(p)) || hay.includes(cls);
  // Class ghép động: `pc-voucher--{{ loai }}`, 'afw-chip--' + x, `x-${y}` ⇒ còn sống nếu tiền tố (cắt tại - hoặc _) đứng ngay trước chỗ nối
  for (let i = cls.length - 1; i > 2 && !ok; i--) {
    if (cls[i - 1] !== '-' && cls[i - 1] !== '_') continue;
    const pre = cls.slice(0, i);
    ok = ['{{', '{%', "' +", '" +', "'+", '"+', '${'].some((t) => hay.includes(pre + t));
  }
  cache.set(cls, ok); return ok;
};

const css = sass.compileString(src, { style: 'expanded', charset: false }).css;
const root = postcss.parse(css);
const dead = new Map(); let removed = 0, total = 0;
root.walkRules((rule) => {
  if (rule.parent && rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
  total++;
  const keep = [];
  let ast; try { ast = selectorParser().astSync(rule.selector); } catch { return; }
  ast.each((sel) => {
    let deadCls = null;
    sel.walkClasses((c) => { if (!deadCls && !alive(c.value)) deadCls = c.value; });
    if (deadCls) dead.set(deadCls, (dead.get(deadCls) || 0) + 1); else keep.push(String(sel).trim());
  });
  if (!keep.length) { rule.remove(); removed++; } else if (keep.length !== ast.length) rule.selector = keep.join(',\n');
});
// @media / @supports rỗng
let again = true; while (again) { again = false; root.walkAtRules((at) => { if (at.nodes && at.nodes.length === 0) { at.remove(); again = true; } }); }

const top = [...dead.entries()].sort((a, b) => b[1] - a[1]);
console.log(`${file}: ${total} quy tắc, chết ${removed}; ${top.length} class không còn dùng.`);
console.log(top.slice(0, 40).map(([c, n]) => `${c}(${n})`).join(' '));
if (write) {
  const out = `/* ${path.basename(file)} — 14/11/2026: đã biên dịch phẳng + gỡ quy tắc chết bằng scripts/purge-dead-css.mjs (UI-0.4).\n   File CŨ đang được thay dần bằng class Tailwind — KHÔNG thêm quy tắc mới vào đây. */\n` + root.toString() + '\n';
  fs.writeFileSync(file, out);
  console.log(`Đã ghi: ${(src.length / 1024).toFixed(0)} KB → ${(out.length / 1024).toFixed(0)} KB`);
}
