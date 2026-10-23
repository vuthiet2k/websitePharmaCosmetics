#!/usr/bin/env node
/*
  ui-loop/checks/N03.mjs — kiểm việc N03: cỡ thư viện pc-* không còn co theo `html { font-size }` của CSS cũ.
  7 khung: Chromium 390 / 320 / 768 / 1024 / 1440 / ngang 844×390 + WebKit iPhone 13.
  Đo: html font-size (phải giữ như cũ); cao/rộng .pc-btn, .pc-btn--lg, .pc-swiper-btn, .pc-fab, .pc-modal__close (popup mở);
  cuộn tới nút, bấm nút mở popup, Tab tới nút; ảnh trang kit.
  Tĩnh: quy tắc ngoài `.pc-*` trong assets/pc-ui.css trùng 100% bản trước sửa (ui-loop/evidence/N03/pc-ui.before.css).
  Chạy: node ui-loop/checks/N03.mjs   (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N03');
const URL = 'http://localhost:3000/?tpl=page.ui-kit';
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

// 0) Tĩnh: quy tắc ngoài thư viện không đổi, quy tắc .pc-* không còn rem
const rulesOf = (file, pc) => { const o = []; postcss.parse(fs.readFileSync(file, 'utf8')).walkRules((r) => {
  if (r.selector.includes('.pc-') === pc) o.push((r.parent.type === 'atrule' ? '@' + r.parent.params : '') + r.selector + '{' + r.nodes.map(String).join(';') + '}');
}); return o; };
const before = path.join(EVD, 'pc-ui.before.css');
const after = path.join(ROOT, 'assets', 'pc-ui.css');
if (fs.existsSync(before)) {
  const a = rulesOf(before, false); const b = rulesOf(after, false);
  ok(a.join('\n') === b.join('\n'), `quy tắc ngoài .pc-*: ${b.length}/${a.length}, trùng trước/sau = ${a.join('\n') === b.join('\n')}`);
}
const remLeft = rulesOf(after, true).filter((r) => /\d(rem)\b/.test(r));
ok(remLeft.length === 0, `quy tắc .pc-* còn rem: ${remLeft.length}`);

// Số đo html font-size của D04 (trước sửa) — phải giữ nguyên
const ROOT_FS = { 'chromium-390': '14.4px', 'webkit-390': '14.4px', 'chromium-320': '14.4px', 'chromium-768': '14.4px', 'chromium-1024': '15px', 'chromium-1440': '15px', 'chromium-844x390': null };
const FRAMES = [
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 } } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];
const d04 = (() => { try { return Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'ui-loop/evidence/D04/result.json'), 'utf8')).map((r) => [r.frame, r.rootFs])); } catch { return {}; } })();

const browsers = {}; const summary = [];
for (const f of FRAMES) {
  console.log(`\n[N03] ${f.name}`);
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext(f.opts); const page = await ctx.newPage();
  const res = await page.goto(URL, { waitUntil: 'load' });
  ok(res.status() === 200, `HTTP ${res.status()}`);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  const rootFs = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  const exp = d04[f.name] || ROOT_FS[f.name];
  ok(!exp || rootFs === exp, `html font-size ${rootFs} (trước sửa: ${exp || 'không ghi'})`);

  // Cuộn tới khối nút (thao tác thật) rồi đo
  await page.locator('[data-kit="ui_button"]').scrollIntoViewIfNeeded();
  const m = await page.evaluate(() => {
    const sz = (s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && getComputedStyle(e).display !== 'none'; })
      .map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; });
    return { btn: sz('#pc-kit .pc-btn:not(.pc-btn--lg):not(.pc-btn--link)'), link: sz('#pc-kit .pc-btn--link'), lg: sz('#pc-kit .pc-btn--lg'), swiper: sz('#pc-kit .pc-swiper-btn'), fab: sz('.pc-fab'), bar: sz('.pc-actionbar .pc-btn') };
  });
  const minH = (a) => a.length ? Math.min(...a.map((x) => x.h)) : null;
  ok(minH(m.btn) >= 44, `pc-btn (${m.btn.length}) cao nhỏ nhất ${minH(m.btn)}px · nút link (${m.link.length}) ${minH(m.link)}px · nút thanh mua ${minH(m.bar)}px`);
  ok(minH(m.link) === null || minH(m.link) >= 44, `pc-btn--link cao ${minH(m.link)}px`);
  ok(minH(m.lg) >= 48, `pc-btn--lg (${m.lg.length}) cao nhỏ nhất ${minH(m.lg)}px`);
  ok(m.swiper.length > 0 && m.swiper.every((x) => x.w === 44 && x.h === 44), `pc-swiper-btn: ${m.swiper.map((x) => `${x.w}×${x.h}`).join(', ')}`);
  if (f.name === 'chromium-844x390') ok(m.fab.length === 0, `pc-fab ẩn ở màn ngang (M.4): ${m.fab.length} hiển thị`);
  else ok(m.fab.length === 1 && m.fab[0].w === 48 && m.fab[0].h === 48, `pc-fab: ${m.fab.map((x) => `${x.w}×${x.h}`).join(', ')}`);

  // Tab tới nút đầu tiên của khối nút — đo kích thước phần tử đang focus
  await page.click('[data-kit="ui_button"] h2');
  await page.keyboard.press('Tab');
  const foc = await page.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return `${a.tagName}.${[...a.classList].join('.')} ${Math.round(r.width)}×${Math.round(r.height * 10) / 10}`; });
  console.log(`  · Tab → ${foc}`);
  await page.screenshot({ path: path.join(EVD, `after-${f.name}.png`), fullPage: true });

  // Popup: bấm nút mở (JS là D05) rồi bỏ hidden; đo nút đóng
  await page.click('[data-pc-modal-open="kit-modal"]');
  await page.evaluate(() => { document.getElementById('kit-modal').hidden = false; document.querySelector('[data-pc-modal-overlay="kit-modal"]').hidden = false; });
  const close = await page.evaluate(() => { const r = document.querySelector('#kit-modal .pc-modal__close').getBoundingClientRect(); return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; });
  ok(close.w >= 44 && close.h >= 44, `pc-modal__close ${close.w}×${close.h}px`);
  await page.screenshot({ path: path.join(EVD, `after-${f.name}-modal.png`) });
  summary.push({ frame: f.name, rootFs, btnMin: minH(m.btn), link: minH(m.link), lg: minH(m.lg), bar: minH(m.bar), swiper: m.swiper, fab: m.fab, close, focus: foc });
  await ctx.close();
}
for (const b of Object.values(browsers)) await b.close();
fs.writeFileSync(path.join(EVD, 'result.json'), JSON.stringify(summary, null, 1));
console.log(`\n[N03] ${fail ? 'CHƯA ĐẠT — ' + fail + ' mục' : 'ĐẠT'}`);
process.exit(fail ? 1 : 0);
