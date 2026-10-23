#!/usr/bin/env node
/*
  ui-loop/checks/D04.mjs — kiểm việc D04 (10 snippet ui_* + trang kit /?tpl=page.ui-kit) trên trình duyệt thật.
  7 khung: Chromium 390 (mobile) / 320 / 768 / 1024 / 1440 / ngang 844×390 + WebKit iPhone 13.
  Đo: HTTP 200; đủ 10 snippet nhìn thấy; PC-ERROR ngoài/trong ô thử; axe WCAG 2.2 A/AA trong #pc-kit (thường + modal mở);
  cao nút ≥ 44px; ô nhập 16px; Tab / Shift+Tab có viền focus ≥ 2px; gõ vào ô; bấm checkbox; bấm nút mở popup.
  Hành vi popup (focus trap, Escape, khoá cuộn) thuộc D05 (assets/pc-ui.js) — ở đây mở popup bằng cách bỏ thuộc tính hidden.
  Chạy: node ui-loop/checks/D04.mjs   (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'D04');
const URL = 'http://localhost:3000/?tpl=page.ui-kit';
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

const EXPECTED_ERR = [
  'PC-ERROR ui_button: variant "xyz" không hợp lệ',
  'PC-ERROR ui_badge: tone "red" không hợp lệ',
  'PC-ERROR ui_field: thiếu name',
  'PC-ERROR ui_product_card: context "sidebar" không hợp lệ',
  'PC-ERROR ui_swiper_nav: thiếu id',
  'PC-ERROR ui_action_bar: cần href hoặc form',
  'PC-ERROR ui_modal: thiếu title',
  'PC-ERROR ui_toast: thiếu message',
  'PC-ERROR ui_fab: thiếu aria_label',
  'PC-ERROR ui_icon: name "khong-co" không có trong bộ icon',
  'PC-ERROR ui_icon: size "lon" không hợp lệ',
];
const KIT_SEL = {
  ui_button: '[data-kit="ui_button"] .pc-btn', ui_product_card: '[data-kit="ui_product_card"] .pc-card',
  ui_field: '[data-kit="ui_field"] .pc-field', ui_badge: '[data-kit="ui_badge"] .pc-badge',
  ui_swiper_nav: '[data-kit="ui_swiper_nav"] .pc-swiper-btn', ui_modal: '[data-kit="ui_modal"] [data-pc-modal-open]',
  ui_icon: '[data-kit="ui_icon"] svg', ui_action_bar: '.pc-actionbar', ui_toast: '.pc-toast', ui_fab: '.pc-fab',
};
const FRAMES = [
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 } } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];
const axeKit = (page) => page.evaluate(async () => (await window.axe.run({ include: [['#pc-kit']] }, {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'],
})).violations.map((v) => `${v.id}×${v.nodes.length} (${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')})`));
const ring = (page) => page.evaluate(() => {
  const a = document.activeElement; const cs = getComputedStyle(a);
  return { el: a.tagName + '.' + [...a.classList].join('.') + ' "' + (a.textContent || '').trim().slice(0, 30) + '"', style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: cs.outlineColor };
});

const browsers = {};
const summary = [];
for (const f of FRAMES) {
  console.log(`\n[D04] ${f.name}`);
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext(f.opts); const page = await ctx.newPage();
  const jsErr = []; page.on('pageerror', (e) => jsErr.push(e.message));
  const res = await page.goto(URL, { waitUntil: 'load' });
  ok(res.status() === 200, `HTTP ${res.status()}`);
  await page.waitForTimeout(800);
  // Thanh công cụ của preview (dev-server.js) không có trên Sapo — ui-verify cũng bỏ qua nó
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await page.addScriptTag({ content: AXE_SRC });
  const rootFs = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);

  // 1) Đủ component nhìn thấy
  const vis = await page.evaluate((sel) => Object.fromEntries(Object.entries(sel).map(([k, s]) => {
    const els = [...document.querySelectorAll(s)];
    const shown = els.filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; });
    return [k, `${shown.length}/${els.length}`];
  })), KIT_SEL);
  const allShown = Object.values(vis).every((v) => +v.split('/')[0] > 0);
  ok(allShown, 'đủ 10 snippet nhìn thấy: ' + Object.entries(vis).map(([k, v]) => `${k} ${v}`).join(' · '));

  // 2) PC-ERROR
  const err = await page.evaluate(() => {
    const out = { inCell: [], outside: [] }; const cell = document.getElementById('pc-kit-error');
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.data.includes('PC-ERROR')) (cell.contains(n) ? out.inCell : out.outside).push(n.data.trim());
    out.cellVisible = [...cell.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().height > 0).length;
    out.cellText = cell.textContent.trim().length; out.cellH = cell.getBoundingClientRect().height;
    return out;
  });
  ok(err.outside.length === 0, `PC-ERROR ngoài ô thử: ${err.outside.length}${err.outside.length ? ' — ' + err.outside.join(' | ') : ''}`);
  ok(JSON.stringify(err.inCell) === JSON.stringify(EXPECTED_ERR), `ô thử: ${err.inCell.length}/11 chuỗi PC-ERROR đúng thứ tự + nội dung`);
  ok(err.cellVisible === 0 && err.cellText === 0, `ô thử: ${err.cellVisible} phần tử hiển thị, ${err.cellText} ký tự chữ, cao ${err.cellH}px`);

  // 3) Kích thước: nút, ô nhập
  const m = await page.evaluate(() => {
    const h = (s) => [...document.querySelectorAll('#pc-kit ' + s)].filter((e) => e.getBoundingClientRect().height > 0).map((e) => Math.round(e.getBoundingClientRect().height * 10) / 10);
    const inp = [...document.querySelectorAll('#pc-kit input.pc-input, #pc-kit textarea.pc-input')].map((e) => getComputedStyle(e).fontSize);
    const btn1 = document.querySelector('[data-kit="ui_button"] .pc-btn--primary'); const cs = getComputedStyle(btn1);
    const card = document.querySelector('.pc-card'); const ccs = getComputedStyle(card);
    return { btn: h('.pc-btn'), swiper: h('.pc-swiper-btn'), fab: h('.pc-fab'), inp, btnBg: cs.backgroundColor, btnRadius: cs.borderTopLeftRadius, btnFs: cs.fontSize, cardRadius: ccs.borderTopLeftRadius, cardShadow: ccs.boxShadow, scrollX: document.documentElement.scrollWidth - innerWidth };
  });
  const minBtn = Math.min(...m.btn, ...m.swiper, ...m.fab);
  ok(minBtn >= 44, `[html font-size ${rootFs}] cao nhỏ nhất: pc-btn ${Math.min(...m.btn)}px (${m.btn.length} nút) · swiper ${Math.min(...m.swiper)}px · fab ${m.fab[0]}px`);
  ok(m.inp.every((x) => x === '16px'), `ô nhập font-size: ${[...new Set(m.inp)].join(',')} (${m.inp.length} ô)`);
  console.log(`  · nút chính nền ${m.btnBg}, bo ${m.btnRadius}, chữ ${m.btnFs}; thẻ SP bo ${m.cardRadius}, shadow ${m.cardShadow}; cuộn ngang ${m.scrollX}px`);

  // 4) Thao tác: gõ, bấm checkbox, Tab / Shift+Tab
  await page.fill('#pc-f-kit_name', 'Nguyễn Văn A');
  const typed = await page.inputValue('#pc-f-kit_name');
  await page.click('label.pc-check');
  const checked = await page.isChecked('#pc-f-kit_agree');
  ok(typed === 'Nguyễn Văn A' && checked, `gõ ô "Họ và tên" = "${typed}"; bấm nhãn checkbox ⇒ checked=${checked}`);
  await page.click('[data-kit="ui_button"] h2');
  await page.keyboard.press('Tab'); const r1 = await ring(page);
  await page.keyboard.press('Tab'); const r2 = await ring(page);
  await page.keyboard.press('Shift+Tab'); const r3 = await ring(page);
  ok([r1, r2, r3].every((r) => r.style !== 'none' && r.width >= 2) && r3.el === r1.el,
    `Tab → ${r1.el} viền ${r1.style} ${r1.width}px ${r1.color}; Tab → ${r2.el} ${r2.width}px; Shift+Tab về ${r3.el} ${r3.width}px`);

  // 5) axe trang kit (trạng thái thường)
  await page.evaluate(() => window.scrollTo(0, 0));
  const ax1 = await axeKit(page);
  ok(ax1.length === 0, `axe #pc-kit: ${ax1.length} vi phạm${ax1.length ? ' — ' + ax1.join(' ; ') : ''}`);
  await page.screenshot({ path: path.join(EVD, `after-${f.name}.png`), fullPage: true });

  // 6) Popup: bấm nút mở (chưa có JS — D05) rồi mở bằng cách bỏ hidden; đo nút đóng + axe
  await page.click('[data-pc-modal-open="kit-modal"]');
  const autoOpen = await page.evaluate(() => !document.getElementById('kit-modal').hidden);
  await page.evaluate(() => { document.getElementById('kit-modal').hidden = false; document.querySelector('[data-pc-modal-overlay="kit-modal"]').hidden = false; });
  const mm = await page.evaluate(() => {
    const d = document.getElementById('kit-modal').getBoundingClientRect(); const c = document.querySelector('#kit-modal .pc-modal__close').getBoundingClientRect();
    return { top: Math.round(d.top), bottom: Math.round(d.bottom), left: Math.round(d.left), w: Math.round(d.width), close: `${c.width}×${c.height}`, closeH: c.height, closeW: c.width, vh: innerHeight };
  });
  ok(mm.closeH >= 44 && mm.closeW >= 44, `popup: hộp ${mm.w}px, top ${mm.top} bottom ${mm.bottom}/${mm.vh}; nút đóng ${mm.close}px (mở bằng JS: ${autoOpen ? 'có' : 'chưa — D05'})`);
  const ax2 = await axeKit(page);
  ok(ax2.length === 0, `axe #pc-kit khi popup mở: ${ax2.length} vi phạm${ax2.length ? ' — ' + ax2.join(' ; ') : ''}`);
  await page.screenshot({ path: path.join(EVD, `after-${f.name}-modal.png`) });
  ok(jsErr.length === 0, `lỗi JS: ${jsErr.length}${jsErr.length ? ' — ' + jsErr.slice(0, 2).join(' | ') : ''}`);
  summary.push({ frame: f.name, rootFs, btnBg: m.btnBg, btnRadius: m.btnRadius, cardRadius: m.cardRadius, vis, minBtn, inputs: [...new Set(m.inp)], focus: r1.width, axe: ax1.length, axeModal: ax2.length, err: err.inCell.length, errOutside: err.outside.length, modal: mm, scrollX: m.scrollX });
  await ctx.close();
}
for (const b of Object.values(browsers)) await b.close();
fs.writeFileSync(path.join(EVD, 'result.json'), JSON.stringify(summary, null, 1));
console.log(`\n[D04] ${fail ? 'CHƯA ĐẠT — ' + fail + ' mục' : 'ĐẠT'}`);
process.exit(fail ? 1 : 0);
