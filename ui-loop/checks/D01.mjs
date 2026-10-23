#!/usr/bin/env node
/*
  ui-loop/checks/D01.mjs — kiểm việc D01 (nguồn CSS thư viện + build:pc) trên trình duyệt thật.
  1) assets/pc-ui.css: HTTP 200 từ preview, gzip ≤ 50KB, có ĐỦ class pc-* thư viện đang được tham chiếu trong .bwt/pc-ui.js.
  2) Bản biên dịch đủ 47 class (content = components.css, cùng config + nguồn) dựng trang mẫu ở 7 khung (Chromium + WebKit),
     đo: nút cao ≥ 44px, màu token, bo góc mobile 12px / desktop 0 (R4), ô nhập 16px × 44px, viền focus 2px khi Tab, shadow none.
  Chạy: node ui-loop/checks/D01.mjs   (cần npm run preview ở localhost:3000; tạo trước ui-loop/evidence/D01/pc-all-classes.css bằng
        npx tailwindcss -c tailwind.pc.config.js -i ui-src/css/main.css -o ui-loop/evidence/D01/pc-all-classes.css --content ui-src/css/components.css --minify)
*/
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'D01');
const BASE = 'http://localhost:3000';
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

// ---- 1) Tĩnh: class thư viện được tham chiếu vs class có trong assets/pc-ui.css
const libSrc = fs.readFileSync(path.join(ROOT, 'ui-src/css/components.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const libClasses = [...new Set([...libSrc.matchAll(/\.(pc-[a-zA-Z0-9_-]+)/g)].map((m) => m[1]))].sort();
function walk(d, out = []) { const a = path.join(ROOT, d); if (!fs.existsSync(a)) return out; for (const e of fs.readdirSync(a, { withFileTypes: true })) { const r = path.join(d, e.name); if (e.isDirectory()) walk(r, out); else if (/\.bwt$/.test(e.name)) out.push(r); } return out; }
const contentText = ['layouts', 'templates', 'snippets'].flatMap((d) => walk(d)).map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n')
  + (fs.existsSync(path.join(ROOT, 'assets/pc-ui.js')) ? fs.readFileSync(path.join(ROOT, 'assets/pc-ui.js'), 'utf8') : '');
const tokens = new Set(contentText.split(/[^a-zA-Z0-9_-]+/));
const used = libClasses.filter((c) => tokens.has(c));
const built = fs.readFileSync(path.join(ROOT, 'assets/pc-ui.css'), 'utf8');
const builtSet = new Set([...built.matchAll(/\.(pc-[a-zA-Z0-9_-]+)/g)].map((m) => m[1]));
const missing = used.filter((c) => !builtSet.has(c));
const gz = zlib.gzipSync(built).length;
console.log(`[D01] Thư viện components.css: ${libClasses.length} class pc-*; đang tham chiếu trong .bwt/pc-ui.js: ${used.length} (${used.join(', ')})`);
ok(missing.length === 0, `assets/pc-ui.css có đủ class đang dùng (thiếu: ${missing.join(', ') || 0})`);
ok(gz <= 50 * 1024, `assets/pc-ui.css: ${built.length} B, gzip ${gz} B (≤ 51200)`);
const all = fs.readFileSync(path.join(EVD, 'pc-all-classes.css'), 'utf8');
const allSet = new Set([...all.matchAll(/\.(pc-[a-zA-Z0-9_-]+)/g)].map((m) => m[1]));
ok(libClasses.every((c) => allSet.has(c)), `bản biên dịch đủ thư viện: ${allSet.size}/${libClasses.length} class, gzip ${zlib.gzipSync(all).length} B`);

// ---- 2) Trình duyệt thật
const FIXTURE = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>D01</title></head>
<body class="pc-has-bottomnav"><a class="pc-skip-link" href="#main">Đến nội dung chính</a>
<div class="pc-topbar">Miễn phí giao hàng đơn từ 500.000đ</div>
<main id="main" class="pc-container pc-section">
  <div class="flex gap-3"><button id="b1" class="pc-btn pc-btn--primary">Thêm vào giỏ</button>
  <button id="b2" class="pc-btn pc-btn--secondary">Đặt lịch</button><a id="b3" class="pc-btn pc-btn--link" href="#">Xem thêm</a></div>
  <div class="grid grid-cols-2 gap-3 mt-4" style="max-width:420px"><article id="card" class="pc-card"><div class="pc-card__media"><span class="pc-card__badge"><span class="pc-badge pc-badge--sale">-20%</span></span></div>
  <h3 class="pc-card__title">Serum Vitamin C 15% sáng da mờ thâm</h3><p><span class="pc-card__price">450.000₫</span><span class="pc-card__price-old">560.000₫</span></p></article></div>
  <div class="pc-field mt-4"><label class="pc-label" for="f1">Số điện thoại</label><input id="f1" class="pc-input" type="tel"><p class="pc-hint">Gợi ý</p><p class="pc-error">Vui lòng nhập số điện thoại</p></div>
</main>
<nav class="pc-bottomnav"><a class="pc-bottomnav__item" aria-current="page" href="#">Trang chủ</a><a class="pc-bottomnav__item" href="#">Danh mục</a><a class="pc-bottomnav__item" href="#">Soi da</a><a class="pc-bottomnav__item" href="#">Tài khoản</a></nav>
<div class="pc-toast">Đã thêm vào giỏ <a href="#">Xem giỏ</a></div></body></html>`;

const FRAMES = [
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 } } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];
const browsers = {};
for (const f of FRAMES) {
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext(f.opts); const page = await ctx.newPage();
  // pc-ui.css thật tải qua HTTP từ preview
  const res = await page.request.get(BASE + '/assets/pc-ui.css');
  await page.setContent(FIXTURE); await page.addStyleTag({ content: all });
  // pc-btn có transition-colors 150ms — đo sau khi mọi transition chạy xong
  await page.waitForTimeout(100);
  await page.waitForFunction(() => document.getAnimations().length === 0, null, { timeout: 5000 });
  const w = page.viewportSize().width; const desktop = w >= 1024;
  const m = await page.evaluate(() => {
    const cs = (s) => getComputedStyle(document.querySelector(s));
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return {
      btnH: r('#b1').height, btnBg: cs('#b1').backgroundColor, btnRadius: cs('#b1').borderTopLeftRadius, btnShadow: cs('#b1').boxShadow, btnFs: cs('#b1').fontSize,
      secBorder: cs('#b2').borderTopWidth + ' ' + cs('#b2').borderTopColor, cardRadius: cs('#card').borderTopLeftRadius,
      inputFs: cs('#f1').fontSize, inputH: r('#f1').height, errColor: cs('.pc-error').color, badgeFs: cs('.pc-badge').fontSize,
      // Ghi nhận (không chấm): preflight tắt ⇒ border-style lấy theo trình duyệt (việc N01)
      bstyle: ['#b1', '#b2', '#card', '#f1'].map((s) => s + ':' + cs(s).borderTopStyle + '/' + cs(s).borderBottomStyle).join(' '),
      topbarBg: cs('.pc-topbar').backgroundColor, navDisplay: cs('.pc-bottomnav').display, navH: r('.pc-bottomnav').height,
    };
  });
  // WebKit mặc định Tab bỏ qua link ⇒ Tab tối đa 5 lần tới khi gặp nút chính
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement.id === 'b1')) break; }
  await page.waitForTimeout(50);
  const focus = await page.evaluate(() => { const e = document.activeElement; const c = getComputedStyle(e); return { id: e.id, outline: c.outlineWidth + ' ' + c.outlineStyle + ' ' + c.outlineColor }; });
  const shot = path.join(EVD, `after-${f.name}.png`); await page.screenshot({ path: shot, fullPage: true });
  console.log(`[${f.name}] pc-ui.css HTTP ${res.status()} · nút h=${m.btnH}px nền=${m.btnBg} bo=${m.btnRadius} bóng=${m.btnShadow} chữ=${m.btnFs} · nút phụ viền=${m.secBorder} · thẻ bo=${m.cardRadius} · ô nhập ${m.inputFs}/${m.inputH}px · lỗi=${m.errColor} · nhãn ${m.badgeFs} · topbar=${m.topbarBg} · thanh đáy=${m.navDisplay}/${m.navH}px · focus #${focus.id} ${focus.outline}\n    ghi nhận border-style: ${m.bstyle}`);
  ok(res.status() === 200, `${f.name}: pc-ui.css 200`);
  ok(m.btnH >= 44, `${f.name}: nút cao ${m.btnH} ≥ 44`);
  ok(m.btnBg === 'rgb(7, 91, 64)' && m.topbarBg === 'rgb(0, 63, 45)' && m.errColor === 'rgb(185, 28, 28)', `${f.name}: màu token brand/footer/sale`);
  // shadow-none của Tailwind sinh các lớp bóng trong suốt 0px (rgba(0,0,0,0)) — tương đương không bóng
  ok(m.btnShadow === 'none' || m.btnShadow.split(/,(?![^(]*\))/).every((s) => /rgba\(0, 0, 0, 0\)/.test(s)), `${f.name}: không đổ bóng`);
  ok(m.secBorder === '2px rgb(7, 91, 64)', `${f.name}: nút phụ viền ${m.secBorder}`);
  ok(desktop ? (m.btnRadius === '0px' && m.cardRadius === '0px') : (m.btnRadius === '12px' && m.cardRadius === '12px'), `${f.name}: bo góc R4 nút ${m.btnRadius} thẻ ${m.cardRadius}`);
  ok(m.inputFs === '16px' && m.inputH >= 44, `${f.name}: ô nhập ${m.inputFs} × ${m.inputH}px`);
  ok(desktop ? m.navDisplay === 'none' : true, `${f.name}: thanh đáy ${m.navDisplay}`);
  ok(focus.id === 'b1' && focus.outline.startsWith('2px solid'), `${f.name}: Tab → nút chính có viền focus ${focus.outline}`);
  await ctx.close();
}
for (const b of Object.values(browsers)) await b.close();
console.log(fail ? `[D01] CHƯA ĐẠT — ${fail} mục` : '[D01] ĐẠT');
process.exit(fail ? 1 : 0);
