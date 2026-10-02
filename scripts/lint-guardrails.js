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

const LABELS = { hex: 'hex hardcode', important: '!important', inlineStyle: 'style="" tĩnh', aiComment: 'comment AI rỗng' };
console.log('[lint:guardrails] Tổng hiện tại:', Object.entries(totals).map(([k, v]) => `${LABELS[k] || k} ${v}`).join(', '));
if (!regressions.length) {
  console.log('[lint:guardrails] PASS — không có vi phạm mới so với baseline.');
  process.exit(0);
}
console.warn(`[lint:guardrails] CẢNH BÁO — ${regressions.length} chỉ số vượt baseline (code mới nên dùng token trong ${TOKEN_FILE}, class thay cho style="", tránh !important):`);
for (const regression of regressions) console.warn(`  ! ${regression}`);
process.exit(process.argv.includes('--strict') ? 1 : 0);
