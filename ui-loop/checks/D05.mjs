#!/usr/bin/env node
/*
  ui-loop/checks/D05.mjs — kiểm việc D05: assets/pc-ui.js (data-pc-modal, data-pc-toast, data-pc-swiper, data-pc-form).
  Trang kit /?tpl=page.ui-kit, 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13), giảm chuyển động bật:
    (a) pc-ui.js HTTP 200, thẻ script defer, window.PC sẵn sàng; 0 lỗi JS từ pc-ui.js ở kit + 6 trang Q;
    (b) popup: mở bằng nút, focus trong popup, Tab ×12 / Shift+Tab ×12 không thoát, Escape đóng + trả focus, nút đóng, lớp phủ;
        khoá cuộn nền (PageDown ×3, bánh xe ở Chromium ⇒ scrollY lệch 0), đóng thì cuộn lại được;
    (c) thông báo: toast mở sẵn ẩn sau 4,5–5,6s tính từ DOMContentLoaded; PC.toast ×2 ⇒ 1 cái, nội dung sau, ẩn 4,5–5,6s;
    (d) form data-pc-form: gửi khi Họ tên trống + SĐT "123" ⇒ không gửi, 0 sự kiện invalid (bóng trình duyệt), lỗi tiếng Việt
        dưới 2 ô cùng lúc + icon + aria-invalid, focus ô sai đầu; email "abc" rời ô ⇒ lỗi; sửa đúng ⇒ lỗi ẩn; đủ ⇒ gửi được;
    (e) slider: nút Sau / Trước, phím → / ←, chấm không bấm, tự chạy thử: giảm chuyển động ⇒ không chạy, bình thường ⇒ chạy;
        trang không cuộn ngang;
    (f) axe WCAG 2.2 A/AA trong #pc-kit = 0 (popup đóng + mở).
  Ảnh: ui-loop/evidence/D05/after-<trình duyệt>-<khung>-{modal,form,toast}.png
  Chạy: node ui-loop/checks/D05.mjs   (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'D05');
fs.mkdirSync(EVD, { recursive: true });
const BASE = 'http://localhost:3000';
const KIT = '/?tpl=page.ui-kit';
const Q = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/dat-lich-tu-van', '/?tpl=login'];
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

const FRAMES = [
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 } } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];

// Ghi thời điểm (performance.now) thông báo đổi class hidden
const INIT = () => {
  window.__toastLog = [];
  new MutationObserver((ms) => ms.forEach((m) => {
    if (m.target.nodeType === 1 && m.target.hasAttribute('data-pc-toast') && m.attributeName === 'class') {
      window.__toastLog.push({ t: performance.now(), hidden: m.target.classList.contains('hidden'), text: m.target.textContent.trim() });
    }
  })).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
};

const browsers = {};
const newPage = async (f, reduced = true) => {
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext({ ...f.opts, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text() + ' @' + (m.location().url || '')); });
  await page.addInitScript(INIT);
  return { ctx, page, errs };
};
const gotoKit = async (page) => {
  let jsStatus = null;
  page.on('response', (r) => { if (/pc-ui\.js/.test(r.url())) jsStatus = r.status(); });
  const res = await page.goto(BASE + KIT, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  return { status: res.status(), jsStatus: () => jsStatus };
};
const pcErrs = (errs) => errs.filter((e) => /pc-ui\.js/.test(e));
const tag = (f) => `${f.engine.name()}-${f.name.split('-')[1]}`;
const active = (page) => page.evaluate(() => { const a = document.activeElement; return { id: a.id, cls: a.className && a.className.baseVal === undefined ? a.className : '', inModal: !!a.closest('#kit-modal'), opener: a.hasAttribute('data-pc-modal-open') }; });
const modalState = (page) => page.evaluate(() => ({
  modal: !document.getElementById('kit-modal').hidden, overlay: !document.querySelector('[data-pc-modal-overlay="kit-modal"]').hidden,
  htmlOverflow: getComputedStyle(document.documentElement).overflowY, y: Math.round(scrollY),
}));
const runAxe = async (page) => {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE_SRC });
  return page.evaluate(async () => (await window.axe.run({ include: [['#pc-kit']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))
    .violations.map((v) => `${v.id}×${v.nodes.length}`));
};

const summary = {};
for (const f of FRAMES) {
  const t = tag(f);
  console.log(`\n== ${f.name}`);
  const { ctx, page, errs } = await newPage(f, true);
  const nav = await gotoKit(page);
  const vw = f.opts.viewport.width;

  // (a)
  const tagInfo = await page.evaluate(() => { const s = document.querySelector('script[src*="pc-ui.js"]'); return { has: !!s, defer: !!(s && s.defer), ready: !!(window.PC && window.PC.__ready), n: document.querySelectorAll('script[src*="pc-ui.js"]').length }; });
  ok(nav.status === 200 && nav.jsStatus() === 200, `${t}: trang kit ${nav.status}, pc-ui.js HTTP ${nav.jsStatus()}`);
  ok(tagInfo.has && tagInfo.defer && tagInfo.n === 1 && tagInfo.ready, `${t}: script pc-ui.js ×${tagInfo.n} defer=${tagInfo.defer}, PC sẵn sàng=${tagInfo.ready}`);

  // (c1) toast mở sẵn tự ẩn
  await page.waitForFunction(() => window.__toastLog.some((l) => l.hidden), null, { timeout: 9000 }).catch(() => {});
  const toast1 = await page.evaluate(() => {
    const dcl = performance.getEntriesByType('navigation')[0].domContentLoadedEventStart;
    const h = window.__toastLog.find((l) => l.hidden); return { hideAfter: h ? Math.round(h.t - dcl) : null };
  });
  ok(toast1.hideAfter !== null && toast1.hideAfter >= 4500 && toast1.hideAfter <= 5600, `${t}: toast mở sẵn ẩn sau ${toast1.hideAfter} ms (từ DOMContentLoaded)`);

  // (c2) PC.toast ×2
  const t0 = await page.evaluate(() => { window.__toastLog.length = 0; window.PC.toast('Đã lưu sản phẩm yêu thích'); return performance.now(); });
  await page.waitForTimeout(800);
  const t1 = await page.evaluate(() => { window.PC.toast('Đã thêm vào giỏ hàng', { actionLabel: 'Xem giỏ', actionHref: '/cart' }); return performance.now(); });
  await page.waitForTimeout(300);
  const tv = await page.evaluate(() => { const v = [...document.querySelectorAll('.pc-toast')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).display !== 'none'; });
    return { n: v.length, text: v[0] ? v[0].textContent.trim() : '' }; });
  ok(tv.n === 1 && /giỏ hàng/.test(tv.text) && !/yêu thích/.test(tv.text), `${t}: PC.toast ×2 ⇒ ${tv.n} thông báo nhìn thấy, chữ "${tv.text}"`);
  await page.screenshot({ path: path.join(EVD, `after-${t}-toast.png`) });
  await page.waitForFunction(() => window.__toastLog.some((l) => l.hidden), null, { timeout: 9000 }).catch(() => {});
  const hide2 = await page.evaluate((s) => { const h = window.__toastLog.find((l) => l.hidden); return h ? Math.round(h.t - s) : null; }, t1);
  ok(hide2 !== null && hide2 >= 4500 && hide2 <= 5600, `${t}: thông báo ẩn ${hide2} ms sau lần gọi cuối (lần đầu cách ${Math.round(t1 - t0)} ms)`);

  // (f) axe popup đóng
  const axeClosed = await runAxe(page);
  ok(axeClosed.length === 0, `${t}: axe #pc-kit (popup đóng) ${axeClosed.length}${axeClosed.length ? ' — ' + axeClosed.join(', ') : ''}`);

  // (b) popup
  const opener = page.locator('[data-pc-modal-open="kit-modal"]');
  await opener.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -100));
  await page.waitForTimeout(200);
  await opener.click();
  await page.waitForTimeout(250);
  const s1 = await modalState(page);
  const a1 = await active(page);
  ok(s1.modal && s1.overlay && a1.inModal, `${t}: bấm mở ⇒ popup ${s1.modal}, lớp phủ ${s1.overlay}, focus trong popup ${a1.inModal} (${a1.cls || a1.id})`);
  let inside = 0;
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); if ((await active(page)).inModal) inside++; }
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Shift+Tab'); if ((await active(page)).inModal) inside++; }
  ok(inside === 24, `${t}: Tab ×12 + Shift+Tab ×12 ⇒ focus trong popup ${inside}/24`);
  const y0 = (await modalState(page)).y;
  for (let i = 0; i < 3; i++) { await page.keyboard.press('PageDown'); await page.waitForTimeout(120); }
  let wheel = 'không hỗ trợ';
  try { await page.mouse.move(Math.round(vw / 2), 10); await page.mouse.wheel(0, 800); wheel = 'có'; } catch { /* WebKit mobile không có bánh xe */ }
  await page.waitForTimeout(400);
  const s2 = await modalState(page);
  ok(s2.y === y0 && s2.htmlOverflow === 'hidden', `${t}: popup mở, PageDown ×3 + bánh xe (${wheel}) ⇒ scrollY ${y0} → ${s2.y} (lệch ${s2.y - y0}px), html overflow ${s2.htmlOverflow}`);
  const axeOpen = await runAxe(page);
  ok(axeOpen.length === 0, `${t}: axe #pc-kit (popup mở) ${axeOpen.length}${axeOpen.length ? ' — ' + axeOpen.join(', ') : ''}`);
  await page.screenshot({ path: path.join(EVD, `after-${t}-modal.png`) });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const s3 = await modalState(page); const a3 = await active(page);
  ok(!s3.modal && !s3.overlay && a3.opener, `${t}: Escape ⇒ popup ẩn ${!s3.modal}, lớp phủ ẩn ${!s3.overlay}, focus về nút mở ${a3.opener}`);
  // nút đóng
  await opener.click(); await page.waitForTimeout(200);
  await page.locator('#kit-modal .pc-modal__close').click(); await page.waitForTimeout(200);
  const s4 = await modalState(page); const a4 = await active(page);
  ok(!s4.modal && !s4.overlay && a4.opener, `${t}: nút đóng ⇒ popup ẩn ${!s4.modal}, focus về nút mở ${a4.opener}`);
  // lớp phủ
  await opener.click(); await page.waitForTimeout(200);
  const hitOverlay = await page.evaluate(() => { const e = document.elementFromPoint(6, 6); return !!(e && e.hasAttribute('data-pc-modal-overlay')); });
  await page.mouse.click(6, 6); await page.waitForTimeout(200);
  const s5 = await modalState(page); const a5 = await active(page);
  ok(hitOverlay && !s5.modal && !s5.overlay && a5.opener, `${t}: bấm lớp phủ (6,6 trúng lớp phủ ${hitOverlay}) ⇒ popup ẩn ${!s5.modal}, focus về nút mở ${a5.opener}`);
  // cuộn lại được
  const yb = (await modalState(page)).y;
  await page.keyboard.press('PageDown'); await page.waitForTimeout(400);
  const s6 = await modalState(page);
  ok(s6.y > yb && s6.htmlOverflow !== 'hidden', `${t}: đóng popup ⇒ PageDown cuộn ${yb} → ${s6.y}, html overflow ${s6.htmlOverflow}`);

  // (d) form
  const form = page.locator('#kit-form');
  await form.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    window.__inv = 0; window.__sent = 0;
    const fm = document.getElementById('kit-form');
    fm.addEventListener('invalid', () => window.__inv++, true);
    fm.addEventListener('submit', (e) => { window.__sent++; e.preventDefault(); });
  });
  const url0 = page.url();
  await page.locator('#kit-form button[type="submit"]').click();
  await page.waitForTimeout(250);
  const fr = await page.evaluate(() => {
    const st = (id) => { const i = document.getElementById(id); const e = document.getElementById(id + '-error'); const r = e.getBoundingClientRect();
      return { inv: i.getAttribute('aria-invalid'), vis: !e.classList.contains('hidden') && r.height > 0, text: e.textContent.trim(), icon: !!e.querySelector('svg') && e.querySelector('svg').getBoundingClientRect().width > 0,
        below: r.top >= i.getBoundingClientRect().bottom - 1 }; };
    // Ô sai đầu không bị phần tử nổi (header dính, thanh mua…) che: 5 điểm trên nhãn + 5 điểm trên ô trúng chính nó
    const pts = (el) => { const r = el.getBoundingClientRect(); return [[.1, .5], [.5, .5], [.9, .5], [.5, .15], [.5, .85]].map(([x, y]) => [r.left + r.width * x, r.top + r.height * y]); };
    const inp = document.getElementById('pc-f-kit_name'); const lab = document.querySelector('label[for="pc-f-kit_name"]');
    const hit = [...pts(lab).map((p) => lab.contains(document.elementFromPoint(...p))), ...pts(inp).map((p) => document.elementFromPoint(...p) === inp)].filter(Boolean).length;
    return { name: st('pc-f-kit_name'), phone: st('pc-f-kit_phone'), email: st('pc-f-kit_email'), act: document.activeElement.id, inv: window.__inv, sent: window.__sent, nov: document.getElementById('kit-form').noValidate, hit };
  });
  ok(page.url() === url0 && fr.sent === 0 && fr.inv === 0 && fr.nov, `${t}: gửi form sai ⇒ không gửi (submit tới trang ${fr.sent}), sự kiện invalid ${fr.inv}, novalidate ${fr.nov}`);
  ok(fr.name.vis && fr.name.inv === 'true' && /^Vui lòng nhập họ và tên/.test(fr.name.text) && fr.name.icon && fr.name.below,
    `${t}: ô Họ tên — lỗi "${fr.name.text}" hiện ${fr.name.vis}, dưới ô ${fr.name.below}, icon ${fr.name.icon}, aria-invalid ${fr.name.inv}`);
  ok(fr.phone.vis && fr.phone.inv === 'true' && /10 chữ số/.test(fr.phone.text) && fr.phone.icon && fr.phone.below,
    `${t}: ô SĐT "123" — lỗi "${fr.phone.text}" hiện ${fr.phone.vis}, dưới ô ${fr.phone.below}, aria-invalid ${fr.phone.inv}`);
  ok(!fr.email.vis && fr.email.inv === null, `${t}: ô Email trống (không bắt buộc) không báo lỗi`);
  ok(fr.act === 'pc-f-kit_name' && fr.hit === 10, `${t}: focus vào ô sai đầu tiên: #${fr.act}; nhãn + ô không bị che ${fr.hit}/10 điểm`);
  await page.screenshot({ path: path.join(EVD, `after-${t}-form.png`) });
  await page.locator('#pc-f-kit_email').fill('abc');
  await page.keyboard.press('Tab'); await page.waitForTimeout(150);
  const em = await page.evaluate(() => { const e = document.getElementById('pc-f-kit_email-error'); return { vis: !e.classList.contains('hidden'), text: e.textContent.trim(), inv: document.getElementById('pc-f-kit_email').getAttribute('aria-invalid') }; });
  ok(em.vis && em.inv === 'true' && /Email chưa đúng/.test(em.text), `${t}: email "abc" rời ô ⇒ lỗi "${em.text}"`);
  await page.locator('#pc-f-kit_phone').fill('0912345678');
  await page.locator('#pc-f-kit_name').fill('Nguyễn Minh An');
  await page.locator('#pc-f-kit_email').fill('an@gmail.com');
  await page.waitForTimeout(150);
  const fx = await page.evaluate(() => ['pc-f-kit_name', 'pc-f-kit_phone', 'pc-f-kit_email'].map((id) => ({ id, hid: document.getElementById(id + '-error').classList.contains('hidden'), inv: document.getElementById(id).getAttribute('aria-invalid') })));
  ok(fx.every((x) => x.hid && x.inv === null), `${t}: sửa đúng ⇒ lỗi ẩn + bỏ aria-invalid: ${fx.map((x) => `${x.id.slice(9)} ${x.hid && x.inv === null ? 'ẩn' : 'CÒN'}`).join(', ')}`);
  await page.locator('#kit-form button[type="submit"]').click(); await page.waitForTimeout(200);
  const sent = await page.evaluate(() => window.__sent);
  ok(sent === 1, `${t}: đủ thông tin ⇒ form gửi đi (sự kiện submit tới trang ${sent})`);

  // (e) slider
  const sw = page.locator('[data-pc-swiper="kit-swiper"]');
  await sw.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
  const idx = () => page.evaluate(() => document.getElementById('kit-swiper').swiper ? document.getElementById('kit-swiper').swiper.activeIndex : -1);
  const init = await idx();
  await page.locator('[data-pc-swiper-next="kit-swiper"]').click(); await page.waitForTimeout(250); const iNext = await idx();
  await page.locator('[data-pc-swiper-prev="kit-swiper"]').click(); await page.waitForTimeout(250); const iPrev = await idx();
  ok(init === 0 && iNext === 1 && iPrev === 0, `${t}: slider khởi tạo (chỉ số ${init}); "Slide sau" ⇒ ${iNext}; "Slide trước" ⇒ ${iPrev}`);
  await page.locator('[data-pc-swiper-next="kit-swiper"]').focus();
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250); const kR = await idx();
  const live = await page.evaluate(() => (document.querySelector('[data-pc-swiper="kit-swiper"] [aria-live]') || {}).textContent || '');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250); const kL = await idx();
  ok(kR === 1 && kL === 0, `${t}: phím → ⇒ ${kR}, ← ⇒ ${kL}; vùng đọc "${live}"`);
  const dots = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-pc-swiper-dots="kit-swiper"] .swiper-pagination-bullet')];
    return { n: b.length, focusable: b.filter((x) => x.hasAttribute('tabindex') || x.getAttribute('role') === 'button' || x.tagName === 'BUTTON').length }; });
  ok(dots.n === 3 && dots.focusable === 0, `${t}: chấm phân trang ${dots.n}, chấm bấm/focus được ${dots.focusable}`);
  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(hscroll <= 0, `${t}: trang cuộn ngang ${hscroll}px`);
  const autoplayProbe = (p) => p.evaluate(async () => {
    const w = document.createElement('div'); w.setAttribute('data-pc-swiper', 'kit-auto'); w.setAttribute('data-pc-swiper-autoplay', '300'); w.className = 'pc-swiper';
    w.innerHTML = '<div class="swiper" id="kit-auto"><div class="swiper-wrapper"><div class="swiper-slide">A</div><div class="swiper-slide">B</div><div class="swiper-slide">C</div></div></div>';
    document.getElementById('pc-kit').appendChild(w); const s = window.PC.swiper(w);
    await new Promise((r) => setTimeout(r, 1300));
    const res = { running: !!(s && s.autoplay && s.autoplay.running), index: s ? s.activeIndex : -1 }; s && s.destroy(); w.remove(); return res;
  });
  const apReduce = await autoplayProbe(page);
  ok(!apReduce.running && apReduce.index === 0, `${t}: giảm chuyển động ⇒ slider tự chạy thử: running ${apReduce.running}, sau 1,3s chỉ số ${apReduce.index}`);
  summary[t] = { toast1, hide2, inside, scrollLock: s2.y - y0, form: fr, apReduce, axeClosed, axeOpen };

  ok(pcErrs(errs).length === 0, `${t}: lỗi JS từ pc-ui.js trên kit ${pcErrs(errs).length}${pcErrs(errs).length ? ' — ' + pcErrs(errs)[0].slice(0, 200) : ''}`);
  await ctx.close();

  // đối chứng tự chạy khi KHÔNG giảm chuyển động (Chromium 390 + WebKit)
  if (f.name === 'chromium-390' || f.name === 'webkit-390') {
    const n = await newPage(f, false); await gotoKit(n.page);
    const ap = await autoplayProbe(n.page);
    ok(ap.running && ap.index > 0, `${t}: đối chứng không giảm chuyển động ⇒ tự chạy: running ${ap.running}, sau 1,3s chỉ số ${ap.index}`);
    await n.ctx.close();
  }

  // (a) 6 trang Q: 0 lỗi JS từ pc-ui.js
  const qErr = [];
  for (const u of Q) {
    const q = await newPage(f, true);
    await q.page.goto(BASE + u, { waitUntil: 'load' }); await q.page.waitForTimeout(500);
    const ready = await q.page.evaluate(() => !!(window.PC && window.PC.__ready));
    if (!ready) qErr.push(`${u}: PC chưa sẵn sàng`);
    pcErrs(q.errs).forEach((e) => qErr.push(`${u}: ${e.slice(0, 160)}`));
    await q.ctx.close();
  }
  ok(qErr.length === 0, `${t}: 6 trang Q — PC sẵn sàng 6/6, lỗi JS từ pc-ui.js ${qErr.length}${qErr.length ? ' — ' + qErr.join(' | ') : ''}`);
}
for (const b of Object.values(browsers)) await b.close();
fs.writeFileSync(path.join(EVD, 'after.json'), JSON.stringify(summary, null, 2));
console.log(fail ? `\nD05: CHƯA ĐẠT — ${fail} mục sai` : '\nD05: ĐẠT mọi mục');
process.exit(fail ? 1 : 0);
