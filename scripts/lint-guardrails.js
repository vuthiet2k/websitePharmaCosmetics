'use strict';

/*
 * Guardrail CSS/markup (2026-10-03) — chặn vi phạm MỚI, không bắt sửa ngược code cũ.
 * Đếm theo từng file: mã hex hardcode (ngoài snippets/design_tokens.bwt), !important, thuộc tính
 * style="" tĩnh trong .bwt (style có {{ }} — vd URL ảnh từ settings — được phép) và comment rỗng
 * nghĩa kiểu "Updated by AI". So với scripts/guardrails-baseline.json; file nào vượt baseline thì
 * cảnh báo. Comment nêu lý do + ngày/mã ticket theo AGENTS.md KHÔNG bị tính.
 *
 * Dùng: node scripts/lint-guardrails.js [--update-baseline] [--strict]
 *   --update-baseline  ghi lại baseline theo số hiện tại (chỉ chạy khi đã chủ động giảm/chấp nhận).
 *   --strict           exit 1 khi có vượt baseline (mặc định chỉ cảnh báo).
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const baselinePath = path.join(__dirname, 'guardrails-baseline.json');
const SCAN_DIRS = ['assets', 'layouts', 'snippets', 'templates'];
const TOKEN_FILE = 'snippets/design_tokens.bwt';
// Vendor/thư viện bên thứ ba: không sửa, không tính.
const VENDOR = /(^|\/)(vendor_[^/]*|[^/]*[.-]min\.[^/]*|vue\.global\.prod\.js|jquery[^/]*|swiper\.js\.bwt|sweetalert-min\.js\.bwt|bootstrap-datepicker\.js\.bwt|mops-tailwind\.css)$/i;
const STYLE_FILE = /\.(css|scss\.bwt)$/i;
const MARKUP_FILE = /\.bwt$/i;

const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/g;
const IMPORTANT = /!\s*important/gi;
const STATIC_INLINE_STYLE = /\sstyle\s*=\s*("[^"]*"|'[^']*')/gi;
const AI_COMMENT = /\b(updated|generated|modified|fixed|written|refactored|created)\s+by\s+(ai|claude|chatgpt|gpt-?\d*|gemini|copilot)\b|\bai[- ]generated\b/gi;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function countMetrics(rel, source) {
  const isStyle = STYLE_FILE.test(rel);
  const isMarkup = MARKUP_FILE.test(rel) && !isStyle;
  const metrics = {};
  if ((isStyle || isMarkup) && rel !== TOKEN_FILE) {
    // Bỏ entity HTML (&#123;) và id trong href="#abc" để không đếm nhầm thành mã màu.
    const cleaned = source.replace(/&#x?[0-9a-f]+;/gi, '').replace(/(href|data-target|data-bs-target|aria-controls)\s*=\s*["']#[^"']*["']/gi, '');
    metrics.hex = (cleaned.match(HEX) || []).length;
  }
  if (isStyle || isMarkup) metrics.important = (source.match(IMPORTANT) || []).length;
  if (isMarkup) {
    metrics.inlineSvg = (source.match(/<svg[\s>]/gi) || []).length; // UI-9: SVG nhúng tay không được tăng
    metrics.inlineStyle = [...source.matchAll(STATIC_INLINE_STYLE)].filter((m) => !/\{\{|\{%/.test(m[1])).length;
  }
  metrics.aiComment = (source.match(AI_COMMENT) || []).length;
  return metrics;
}

function collect() {
  const result = {};
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(rootDir, dir))) {
      const rel = path.relative(rootDir, file).split(path.sep).join('/');
      if (VENDOR.test(rel) || !/\.(css|bwt|js)$/i.test(rel)) continue;
      const metrics = countMetrics(rel, fs.readFileSync(file, 'utf8'));
      const nonZero = Object.fromEntries(Object.entries(metrics).filter(([, value]) => value > 0));
      if (Object.keys(nonZero).length) result[rel] = nonZero;
    }
  }
  return result;
}

/*
 * RULE CỨNG UI-2.9 (2026-10-17, .clinerules/03): cỡ chữ chỉ lấy từ token --fs-* (snippets/design_tokens.bwt).
 * Cấm font-size / font: shorthand ghi px, rem, pt, hay em phân số (<1) trong theme storefront — luôn FAIL (không
 * baseline). Cho phép: var(--fs-*) (kể cả fallback bên trong var()), clamp() chỉ gồm var()/vw, 0, inherit, 100%,
 * em ≥ 1 (icon/mũi tên tỉ lệ theo chữ cha). Ngoại lệ có chủ đích: MOPS admin (layout riêng không nạp design_tokens,
 * thang Material + bản in hoá đơn dùng pt) và vendor.
 */
const FONT_EXEMPT = /(^|\/)(mops[^/]*|page_mops_admin\.scss\.bwt|page\.mops-admin\.bwt|design_tokens\.bwt)$/i;
function fontHardcodes(rel, source) {
  const out = [];
  source.split(/\r?\n/).forEach((line, i) => {
    const decls = line.match(/(?:font-size\s*:|(?<![\w-])font\s*:)[^;{}"'`]*/gi) || [];
    for (const d of decls) {
      const noVar = d.replace(/\/\*.*?(\*\/|$)/g, '').replace(/var\([^()]*(\([^()]*\)[^()]*)*\)/g, ''); // bỏ var(--fs-x, fallback)
      const value = noVar.replace(/^[^:]*:/, '');
      const sizePart = /^\s*font-size/i.test(d) ? value : (value.split('/')[0] || '');
      const hard = /\d*\.?\d+(px|rem|pt)\b/i.test(sizePart) && !/^\s*0(px)?\s*(!important)?\s*$/i.test(sizePart);
      const fracEm = /(^|[^\d.])0?\.\d+em\b/i.test(sizePart);
      if (hard || fracEm) out.push(`${rel}:${i + 1}  ${d.trim().slice(0, 90)}`);
    }
  });
  return out;
}
const fontViolations = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(path.join(rootDir, dir))) {
    const rel = path.relative(rootDir, file).split(path.sep).join('/');
    if (VENDOR.test(rel) || FONT_EXEMPT.test(rel) || !/\.(css|bwt)$/i.test(rel) || /\.js\.bwt$/i.test(rel)) continue;
    fontViolations.push(...fontHardcodes(rel, fs.readFileSync(file, 'utf8')));
  }
}
if (fontViolations.length && !process.argv.includes('--update-baseline')) {
  console.error(`[lint:guardrails] FAIL — ${fontViolations.length} cỡ chữ ghi cứng (UI-2.9: dùng var(--fs-*) trong ${TOKEN_FILE}):`);
  for (const v of fontViolations.slice(0, 60)) console.error(`  ✗ ${v}`);
  process.exit(1);
}

/*
 * RULE CỨNG UI-9 (2026-10-17, .clinerules/03): icon dùng chung Font Awesome 6 Free (CDN cdnjs trong layouts/theme.bwt).
 * FAIL khi: cú pháp FA cũ (fas/far/fab, "fa fa-x", tên v4/v5 đã đổi ở v6), emoji/ký tự dùng làm icon trong markup,
 * icon dạng ảnh (icon_*.png / *.gif). SVG nhúng tay: không FAIL nhưng là chỉ số baseline "inlineSvg" — không được tăng.
 * Ngoại lệ: MOPS admin (Material Symbols, layout riêng), vendor, nội dung trong comment.
 */
const ICON_EXEMPT = /(^|\/)(mops[^/]*|page_mops_admin\.scss\.bwt|page\.mops-admin\.bwt)$/i;
const FA_LEGACY_PREFIX = /(?:class(?:Name)?\s*=\s*["'][^"']*|el\(\s*'i'\s*,\s*'|default:\s*')\b(fas|far|fab|fa)\s+fa-[a-z0-9-]+/gi;
const FA_V5_NAMES = /\bfa-(times|close|user-md|phone-alt|check-circle|shield-alt|map-marker-alt|edit|calendar-alt|info-circle|search|shopping-bag|shopping-cart|user-cog|money|sparkles|home|trash-alt|exclamation-triangle|sync|sync-alt|times-circle|question-circle|star-half-alt|tint-slash|external-link-alt)\b(?![\w-])/g;
const EMOJI_ICON = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2194}-\u{21FF}]/u;
// Ảnh nhãn đồ hoạ có chữ (không phải icon): lớp phủ "Đặt trước" trên ảnh SP, nhãn "Order" cạnh menu — được phép.
const IMG_ICON = /['"][^'"]*\bicon[_-](?!pre_order\.png|menu_order\.png)[a-z0-9_-]+\.(png|gif|jpe?g)['"]/i;
function stripComments(src) {
  return src
    .replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
}
const iconViolations = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(path.join(rootDir, dir))) {
    const rel = path.relative(rootDir, file).split(path.sep).join('/');
    if (VENDOR.test(rel) || ICON_EXEMPT.test(rel) || !/\.(css|bwt|js)$/i.test(rel)) continue;
    const lines = stripComments(fs.readFileSync(file, 'utf8')).split(/\r?\n/);
    lines.forEach((line, i) => {
      const at = `${rel}:${i + 1}`;
      if (FA_LEGACY_PREFIX.test(line)) iconViolations.push(`${at}  cú pháp FA cũ (dùng fa-solid/fa-regular/fa-brands): ${line.trim().slice(0, 80)}`);
      FA_LEGACY_PREFIX.lastIndex = 0;
      const v5 = line.match(FA_V5_NAMES);
      if (v5 && /fa-(solid|regular|brands)|class|\.fa-/.test(line)) iconViolations.push(`${at}  tên icon FA v4/v5: ${v5.join(', ')}`);
      if (/\.bwt$/i.test(rel) && EMOJI_ICON.test(line)) iconViolations.push(`${at}  emoji/ký tự làm icon (dùng <i class="fa-solid …">): ${line.trim().slice(0, 80)}`);
      if (IMG_ICON.test(line)) iconViolations.push(`${at}  icon dạng ảnh: ${line.trim().slice(0, 80)}`);
    });
  }
}
if (iconViolations.length && !process.argv.includes('--update-baseline')) {
  console.error(`[lint:guardrails] FAIL — ${iconViolations.length} vi phạm quy tắc icon (UI-9: Font Awesome 6 Free):`);
  for (const v of iconViolations.slice(0, 60)) console.error(`  ✗ ${v}`);
  process.exit(1);
}

/*
 * RULE CỨNG UI-1.2 / .clinerules/01 mục 2.1 (2026-10-17): khung nội dung = .container chung. FAIL khi markup tự dựng
 * khung bằng Tailwind (max-w-4xl…7xl + mx-auto + px-N), hoặc gắn max-w-N / px-N lên chính .container.
 * Cột đọc hẹp được phép: max-w-* mx-auto KHÔNG kèm px-*, đặt bên trong .container.
 */
const frameViolations = [];
for (const dir of ['snippets', 'templates', 'layouts']) {
  for (const file of walk(path.join(rootDir, dir))) {
    const rel = path.relative(rootDir, file).split(path.sep).join('/');
    if (!/\.bwt$/i.test(rel) || /mops/i.test(rel)) continue;
    stripComments(fs.readFileSync(file, 'utf8')).split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(/class\s*=\s*"([^"{}]*)"/g)) {
        const t = m[1].split(/\s+/);
        const hasPx = t.some((c) => /^(sm:|md:|lg:)?px-\d/.test(c));
        const selfFrame = t.some((c) => /^max-w-(4|5|6|7)xl$|^max-w-screen-/.test(c)) && t.includes('mx-auto') && hasPx;
        const dirtyContainer = t.includes('container') && (hasPx || t.some((c) => /^max-w-/.test(c)));
        if (selfFrame || dirtyContainer) frameViolations.push(`${rel}:${i + 1}  ${selfFrame ? 'khung tự dựng' : '.container gắn max-w/px'}: class="${m[1].slice(0, 70)}"`);
      }
    });
  }
}
if (frameViolations.length && !process.argv.includes('--update-baseline')) {
  console.error(`[lint:guardrails] FAIL — ${frameViolations.length} khung tự dựng thay cho .container chung (.clinerules/01 2.1, UI-1.2):`);
  for (const v of frameViolations.slice(0, 40)) console.error(`  ✗ ${v}`);
  process.exit(1);
}

const current = collect();
const totals = {};
for (const metrics of Object.values(current)) {
  for (const [key, value] of Object.entries(metrics)) totals[key] = (totals[key] || 0) + value;
}

if (process.argv.includes('--update-baseline')) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`[lint:guardrails] Đã ghi baseline (${Object.keys(current).length} file):`, totals);
  process.exit(0);
}

const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : {};
const regressions = [];
for (const [file, metrics] of Object.entries(current)) {
  for (const [key, value] of Object.entries(metrics)) {
    const allowed = (baseline[file] && baseline[file][key]) || 0;
    if (value > allowed) regressions.push(`${file}: ${key} ${allowed} → ${value} (+${value - allowed})`);
  }
}

const LABELS = { inlineSvg: 'SVG nhúng tay', hex: 'hex hardcode', important: '!important', inlineStyle: 'style="" tĩnh', aiComment: 'comment AI rỗng' };
console.log('[lint:guardrails] Tổng hiện tại:', Object.entries(totals).map(([k, v]) => `${LABELS[k] || k} ${v}`).join(', '));
if (!regressions.length) {
  console.log('[lint:guardrails] PASS — không có vi phạm mới so với baseline.');
  process.exit(0);
}
console.warn(`[lint:guardrails] CẢNH BÁO — ${regressions.length} chỉ số vượt baseline (code mới nên dùng token trong ${TOKEN_FILE}, class thay cho style="", tránh !important):`);
for (const regression of regressions) console.warn(`  ! ${regression}`);
process.exit(process.argv.includes('--strict') ? 1 : 0);
