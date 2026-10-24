#!/usr/bin/env node
/*
  ui-loop/checks/D07.mjs — kiểm việc D07: bộ icon SVG `snippets/ui_icon.bwt` đủ icon đang dùng (thay Font Awesome) +
  lint-guardrails miễn ui_icon.bwt / luật icon ghi R7 + `.clinerules/03` UI-9 ghi "thay bằng UI-STANDARD R7".
    (a) tĩnh: ui_icon có đúng 43 tên (8 cũ + 35 mới), trùng danh sách lưới #pc-kit-icons của trang kit;
    (b) trang kit /?tpl=page.ui-kit, 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13):
        43/43 svg nhìn thấy, 24×24 (size 24), getBBox cạnh dài ≥ 12px, cạnh ngắn ≥ 4px (chủ dự án duyệt 24/10/2026 — chevron Lucide giữ hình gốc) và nằm trong viewBox (−1…25), aria-hidden="true" +
        focusable="false" (trang trí), 8 icon có label ⇒ role="img" + aria-label; tương phản nét / nền ≥ 3:1;
    (c) 0 PC-ERROR ngoài #pc-kit-error; axe WCAG 2.2 A/AA trong #pc-kit = 0;
    (d) lint-guardrails: exit 0, 0 dòng nhắc snippets/ui_icon.bwt, không còn "Font Awesome 6 Free"; .clinerules/03 có ghi R7.
  Ảnh: ui-loop/evidence/D07/after-<trình duyệt>-<khung>.png (lưới icon) + zoom-1440.png (phóng 3× để xem hình).
  Chạy: node ui-loop/checks/D07.mjs   (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'D07');
fs.mkdirSync(EVD, { recursive: true });
const BASE = 'http://localhost:3000';
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

// (a) tĩnh
console.log('(a) Bộ tên icon');
const iconSrc = fs.readFileSync(path.join(ROOT, 'snippets', 'ui_icon.bwt'), 'utf8');
const names = [...iconSrc.matchAll(/{%-?\s*when\s+'([a-z0-9-]+)'\s*-?%}/g)].map((m) => m[1]);
const kitSrc = fs.readFileSync(path.join(ROOT, 'dev-preview', 'templates', 'page.ui-kit.bwt'), 'utf8');
const kitNames = (kitSrc.match(/kit_icon_names = '([^']+)'/) || [, ''])[1].split(',');
ok(names.length === 43 && new Set(names).size === 43, `ui_icon có ${names.length} tên (không trùng: ${new Set(names).size}) — cần 43`);
ok(names.slice().sort().join() === kitNames.slice().sort().join(), `lưới kit liệt kê ${kitNames.length} tên trùng bộ ui_icon`);

// (d) lint + rule
console.log('(d) lint-guardrails + .clinerules/03');
let lintOut = ''; let lintExit = 0;
try { lintOut = execFileSync('node', [path.join(ROOT, 'scripts', 'lint-guardrails.js')], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (e) { lintExit = e.status; lintOut = (e.stdout || '') + (e.stderr || ''); }
ok(lintExit === 0, `lint-guardrails exit ${lintExit}`);
ok(!/ui_icon\.bwt/.test(lintOut), `0 dòng lint nhắc snippets/ui_icon.bwt (${(lintOut.match(/ui_icon\.bwt.*/g) || []).join(' | ') || 'không có'})`);
const lintSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'lint-guardrails.js'), 'utf8');
ok(!/Font Awesome 6 Free/.test(lintSrc) && /R7/.test(lintSrc), 'lint-guardrails.js: luật icon ghi R7, không còn "Font Awesome 6 Free"');
ok(/THAY BẰNG UI-STANDARD R7/.test(fs.readFileSync(path.join(ROOT, '.clinerules', '03-chuan-giao-dien-ui.md'), 'utf8')), '.clinerules/03 UI-9 ghi "thay bằng UI-STANDARD R7"');

const FRAMES = [
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 } } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];

const measure = () => {
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const [r, g, b] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255, 255, 255)'; };
  const grid = [...document.querySelectorAll('#pc-kit-icons > li')].map((li) => {
    const svg = li.querySelector('svg'); if (!svg) return { name: li.dataset.icon, svg: false };
    const r = svg.getBoundingClientRect(); const bb = svg.getBBox(); const cs = getComputedStyle(svg);
    const stroke = cs.stroke && cs.stroke !== 'none' ? cs.stroke : cs.color;
    return { name: li.dataset.icon, svg: true, w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      bb: [bb.x, bb.y, bb.width, bb.height].map((v) => +v.toFixed(1)), visible: r.width > 0 && cs.visibility === 'visible' && cs.display !== 'none' && +cs.opacity > 0,
      hidden: svg.getAttribute('aria-hidden'), focusable: svg.getAttribute('focusable'), role: svg.getAttribute('role'),
      contrast: +ratio(stroke, bgOf(li)).toFixed(2), inView: r.right <= innerWidth + 0.5 && r.left >= -0.5 };
  });
  const labelled = [...document.querySelectorAll('[data-kit="ui_icon"] > div svg')].map((s) => ({ role: s.getAttribute('role'), label: s.getAttribute('aria-label'), hidden: s.getAttribute('aria-hidden') }));
  // PC-ERROR ngoài #pc-kit-error
  const errs = []; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/PC-ERROR/.test(n.nodeValue) && !n.parentElement.closest('#pc-kit-error')) errs.push(n.nodeValue.trim());
  return { grid, labelled, errs, scrollW: document.documentElement.scrollWidth, vw: innerWidth };
};

console.log('(b)(c) Trình duyệt');
const browsers = {};
const summary = [];
for (const f of FRAMES) {
  console.log(`— ${f.name}`);
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext({ ...f.opts, reducedMotion: 'reduce' }); const page = await ctx.newPage();
  const res = await page.goto(BASE + '/?tpl=page.ui-kit', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  ok(res.status() === 200, `HTTP ${res.status()}`);
  const sec = page.locator('[data-kit="ui_icon"]');
  await sec.scrollIntoViewIfNeeded();
  const m = await page.evaluate(measure);
  const g = m.grid;
  const bad = g.filter((i) => !i.svg || !i.visible || i.w !== 24 || i.h !== 24 || Math.max(i.bb[2], i.bb[3]) < 12 || Math.min(i.bb[2], i.bb[3]) < 4 || i.bb[0] < -1 || i.bb[1] < -1
    || i.bb[0] + i.bb[2] > 25 || i.bb[1] + i.bb[3] > 25 || i.hidden !== 'true' || i.focusable !== 'false' || i.role || i.contrast < 3 || !i.inView);
  ok(g.length === 43 && bad.length === 0, `lưới ${g.length} icon, sai ${bad.length}${bad.length ? ': ' + JSON.stringify(bad.slice(0, 4)) : ''}`);
  const bbMin = Math.min(...g.map((i) => Math.min(i.bb[2], i.bb[3])));
  const bbLongMin = Math.min(...g.map((i) => Math.max(i.bb[2], i.bb[3])));
  const cMin = Math.min(...g.map((i) => i.contrast));
  console.log(`    cỡ svg ${[...new Set(g.map((i) => i.w + '×' + i.h))].join(',')} · bbox cạnh ngắn nhỏ nhất ${bbMin}px · cạnh dài nhỏ nhất ${bbLongMin}px · tương phản nhỏ nhất ${cMin}:1 · cuộn ngang ${m.scrollW - m.vw}px`);
  ok(m.labelled.length === 8 && m.labelled.every((s) => s.role === 'img' && s.label && s.hidden === null), `8 icon có label: role="img" + aria-label (${m.labelled.filter((s) => s.role === 'img' && s.label).length}/8)`);
  ok(m.errs.length === 0, `PC-ERROR ngoài #pc-kit-error: ${m.errs.length}`);
  await page.addScriptTag({ content: AXE_SRC });
  const axe = await page.evaluate(async () => (await axe.run('#pc-kit', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map((v) => `${v.id}×${v.nodes.length}`));
  ok(axe.length === 0, `axe #pc-kit: ${axe.length ? axe.join(', ') : '0'}`);
  await sec.screenshot({ path: path.join(EVD, `after-${f.name}.png`) });
  summary.push({ frame: f.name, icons: g.length, bad: bad.length, bbMin, bbLongMin, cMin, axe: axe.length, errs: m.errs.length });
  await ctx.close();
}
// Ảnh phóng to để mắt xem hình từng icon
{
  const ctx = await browsers.chromium.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 }); const page = await ctx.newPage();
  await page.goto(BASE + '/?tpl=page.ui-kit', { waitUntil: 'load' }); await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await page.locator('#pc-kit-icons').screenshot({ path: path.join(EVD, 'zoom-1440.png') });
  await ctx.close();
}
for (const b of Object.values(browsers)) await b.close();
fs.writeFileSync(path.join(EVD, 'result.json'), JSON.stringify({ names: names.length, lintExit, summary }, null, 2));
console.log(fail ? `KẾT QUẢ: CHƯA ĐẠT (${fail} mục sai)` : 'KẾT QUẢ: ĐẠT');
process.exit(fail ? 1 : 0);
