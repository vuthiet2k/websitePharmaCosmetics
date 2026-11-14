#!/usr/bin/env node
/*
  scripts/ui-guard.mjs — cổng mẫu cấm theo docs/UI-STANDARD.md (A.2, A.3, F.3). KHOÁ (R5).
  Code cũ còn hàng nghìn vi phạm ⇒ so với mốc ui-loop/guard-baseline.json: mỗi (file × luật) KHÔNG ĐƯỢC TĂNG.
  Thư viện snippets/ui_*.bwt + ui-src/css/* + assets/pc-ui.js: tuyệt đối 0 vi phạm.
    node scripts/ui-guard.mjs              # exit 1 khi có vi phạm mới
    node scripts/ui-guard.mjs --tighten    # hạ mốc về số hiện tại ở chỗ đã GIẢM (không bao giờ nâng mốc)
    node scripts/ui-guard.mjs --init       # tạo mốc lần đầu (chỉ dùng khi chưa có file mốc)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_FILE = path.join(ROOT, 'ui-loop', 'guard-baseline.json');
const DIRS = ['layouts', 'snippets', 'templates', 'assets', 'ui-src'];
const GENERATED = /(^|\/)(pc-ui\.css|pc-legacy-tw\.css|mops-tailwind\.css)$/;
const VENDOR = /(^|\/)(vendor_[^/]*|[^/]*[.-]min\.[^/]*|vue\.global\.prod\.js|jquery[^/]*|swiper\.js(\.bwt)?|sweetalert-min\.js\.bwt|bootstrap-datepicker\.js\.bwt)$/i;
const LIB = /^(snippets\/ui_[^/]+\.bwt|ui-src\/css\/[^/]+\.css|assets\/pc-ui\.js)$/;
// Ngoại lệ có chủ đích trong thư viện: !important duy nhất ở khối prefers-reduced-motion của tokens.css (M.1)
const LIB_ALLOW = { 'ui-src/css/tokens.css': { important: 4 } };

const RULES = {
  inlineStyle:  { files: /\.bwt$/, re: /\sstyle\s*=\s*["'][^"'{]*["']/g, label: 'R1 style="" tĩnh' },
  styleTag:     { files: /\.bwt$/, re: /<style[\s>]/gi, label: 'R1 thẻ <style>' },
  important:    { files: /\.(bwt|css|js)$/, re: /!\s*important/gi, label: 'R1 !important' },
  hexInMarkup:  { files: /\.bwt$/, re: /(?:class|style)\s*=\s*["'][^"']*#[0-9a-fA-F]{3,8}\b/g, label: 'R2 mã hex trong markup' },
  arbitrary:    { files: /\.(bwt|js)$/, re: /class(?:Name)?\s*=\s*["'][^"']*\b[a-z-]+-\[[^\]]+\]/g, label: 'R2 class giá trị tuỳ ý' },
  shadow:       { files: /\.(bwt|js)$/, re: /class(?:Name)?\s*=\s*["'][^"']*\b(shadow-(sm|md|lg|xl|2xl|inner)|drop-shadow)/g, label: 'R4 đổ bóng' },
  tailwindCdn:  { files: /\.bwt$/, re: /cdn\.tailwindcss\.com/g, label: 'R7 Tailwind CDN' },
  faIcon:       { files: /\.(bwt|js)$/, re: /\bfa-(solid|regular|brands)\b/g, label: 'R7 icon Font Awesome' },
  extCdn:       { files: /\.bwt$/, re: /<(script|link)[^>]+(src|href)=["']https?:\/\/(?!(www\.)?(google|googletagmanager|facebook|zalo|sapo|bizweb|mysapo))[^"']+/gi, label: 'R7 tài nguyên CDN ngoài' },
  // rawButton: disabled in BATCH-09
  smallText:    { files: /\.bwt$/, re: /\btext-\[(?:[0-9]|1[01])px\]/g, label: 'A.3 chữ < 12px' },
  decoAsText:   { files: /\.bwt$/, re: /\b(text-brand-deco|bg-brand-deco[^"']*text-white|text-white[^"']*bg-brand-deco)\b/g, label: 'A.3 #3CB371 làm chữ/nền chữ trắng' },
};

function walk(dir, out = []) { const abs = path.join(ROOT, dir); if (!fs.existsSync(abs)) return out; for (const e of fs.readdirSync(abs, { withFileTypes: true })) { const rel = path.posix.join(dir, e.name); if (e.isDirectory()) walk(rel, out); else out.push(rel); } return out; }
function stripComments(src, rel) { let s = src.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, ''); s = s.replace(/<!--[\s\S]*?-->/g, ''); if (/\.(css|js)$/.test(rel) || /\.scss\.bwt$/.test(rel)) s = s.replace(/\/\*[\s\S]*?\*\//g, ''); return s; }

function collect() {
  const counts = {}; const cssFiles = [];
  for (const rel of DIRS.flatMap((d) => walk(d))) {
    if (GENERATED.test(rel) || VENDOR.test(rel) || /mops/i.test(rel)) continue;
    if (/^assets\/.*\.(css|scss\.bwt)$/.test(rel) || /^snippets\/.*_style\.bwt$/.test(rel)) cssFiles.push(rel);
    if (!/\.(bwt|css|js)$/.test(rel)) continue;
    const src = stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'), rel);
    for (const [k, r] of Object.entries(RULES)) { if (!r.files.test(rel)) continue; if (r.skipLib && LIB.test(rel)) continue; const n = (src.match(r.re) || []).length; if (n) (counts[rel] = counts[rel] || {})[k] = n; }
  }
  return { counts, cssFiles: cssFiles.sort() };
}
function includeParams() { // include 'ui_button' phải có label:
  const bad = [];
  for (const rel of ['layouts', 'snippets', 'templates'].flatMap((d) => walk(d)).filter((f) => f.endsWith('.bwt'))) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const m of src.matchAll(/\{%-?\s*include\s+'ui_button'([^%]*)%\}/g)) if (!/\blabel\s*:/.test(m[1])) bad.push(rel + ': include ui_button thiếu label');
    for (const m of src.matchAll(/\{%-?\s*include\s+'ui_product_card'([^%]*)%\}/g)) if (!/\bproduct\s*:/.test(m[1])) bad.push(rel + ': include ui_product_card thiếu product');
    for (const m of src.matchAll(/\{%-?\s*include\s+'ui_field'([^%]*)%\}/g)) if (!/\bname\s*:/.test(m[1]) || !/\blabel\s*:/.test(m[1])) bad.push(rel + ': include ui_field thiếu name/label');
  }
  return bad;
}

const now = collect();
if (process.argv.includes('--init')) {
  if (fs.existsSync(BASE_FILE)) { console.error('[ui-guard] Đã có mốc — không ghi đè. Dùng --tighten để hạ mốc.'); process.exit(1); }
  fs.mkdirSync(path.dirname(BASE_FILE), { recursive: true }); fs.writeFileSync(BASE_FILE, JSON.stringify(now, null, 1) + '\n');
  console.log('[ui-guard] Đã tạo mốc:', Object.keys(now.counts).length, 'file,', now.cssFiles.length, 'file CSS cũ.'); process.exit(0);
}
if (!fs.existsSync(BASE_FILE)) { console.error('[ui-guard] Thiếu ui-loop/guard-baseline.json'); process.exit(2); }
const base = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8'));
const viol = [];
for (const [rel, m] of Object.entries(now.counts)) for (const [k, n] of Object.entries(m)) {
  const allowed = LIB.test(rel) ? ((LIB_ALLOW[rel] || {})[k] || 0) : ((base.counts[rel] || {})[k] || 0);
  if (n > allowed) viol.push(`VI PHẠM [${RULES[k].label}] ${rel}: ${allowed} → ${n}`);
}
for (const f of now.cssFiles) if (!base.cssFiles.includes(f)) viol.push(`VI PHẠM [R1 file CSS mới] ${f}`);
viol.push(...includeParams().map((s) => 'VI PHẠM [C.1 tham số] ' + s));

if (process.argv.includes('--tighten')) {
  let lowered = 0; for (const [rel, m] of Object.entries(base.counts)) for (const k of Object.keys(m)) { const cur = (now.counts[rel] || {})[k] || 0; if (cur < m[k]) { m[k] = cur; lowered++; } }
  base.cssFiles = base.cssFiles.filter((f) => now.cssFiles.includes(f));
  fs.writeFileSync(BASE_FILE, JSON.stringify(base, null, 1) + '\n'); console.log('[ui-guard] Hạ mốc', lowered, 'chỉ số.');
}
if (viol.length) { viol.forEach((v) => console.log(v)); console.log(`[ui-guard] FAIL — ${viol.length} vi phạm mới.`); process.exit(1); }
const tot = {}; Object.values(now.counts).forEach((m) => Object.entries(m).forEach(([k, n]) => { tot[k] = (tot[k] || 0) + n; }));
console.log('[ui-guard] PASS — 0 vi phạm mới. Nợ cũ còn:', Object.entries(tot).map(([k, n]) => k + '=' + n).join(' · '));
