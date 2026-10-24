#!/usr/bin/env node
/*
  ui-loop/checks/L34.mjs — kiểm việc L34 (D.8 + B.7): thanh đáy mobile nhãn đọc trọn, `aria-current`, mục trỏ đúng trang nhãn hứa.
    (a) đúng 4 mục Trang chủ · Danh mục · Soi da & Dịch vụ · Tài khoản; nhãn không cắt (scrollWidth ≤ clientWidth, không ellipsis,
        chữ trọn trong khung link), nhãn kề nhau giao 0px, chữ ≥ 12px.
    (b) `aria-current="page"` đúng 1 mục, trùng mục `.is-active`, đúng mục theo trang.
    (c) bấm từng mục ⇒ HTTP 200, URL = href, h1 nhìn thấy; trang "Soi da & Dịch vụ" có chữ "Soi da" + "dịch vụ".
    (d) link mục ≥ 44×44px, không chồng nhau.  (e) 1024 / 1440: thanh đáy ẩn.
  Khung: Chromium 390×844 / 320×568 / 768×1024 / 844×390 / 1024×768 / 1440×900 + WebKit iPhone 13.
  Ảnh: ui-loop/evidence/L34/<mode>-<trình duyệt>-<khung>-<trang>.png (cắt vùng đáy màn) + ảnh toàn khung trang chủ.
  Chạy: node ui-loop/checks/L34.mjs [before|after]
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'L34');
fs.mkdirSync(EVD, { recursive: true });
const BASE = 'http://localhost:3000';
const MODE = process.argv[2] || 'after';
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

const NAV_EXPECT = ['Trang chủ', 'Danh mục', 'Soi da & Dịch vụ', 'Tài khoản'];
// Trang kiểm → mục phải mang aria-current (null = không thuộc mục nào, cho phép ≤ 1)
const PAGES = [
  { url: '/', slug: 'home', cur: 'Trang chủ' },
  { url: '/collections/all', slug: 'collection', cur: 'Danh mục' },
  { url: '/truoc-sau-cham-soc-da-tu-xa', slug: 'soi-da', cur: 'Soi da & Dịch vụ' },
  { url: '/?tpl=login', slug: 'login', cur: 'Tài khoản' },
  { url: '/account', slug: 'account', cur: 'Tài khoản' },
  { url: '/dat-lich-tu-van', slug: 'dat-lich', cur: null },
];

const FRAMES = [
  { name: 'chromium-390', br: 'chromium', opt: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  { name: 'webkit-iphone13', br: 'webkit', opt: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', br: 'chromium', opt: { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-768', br: 'chromium', opt: { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-844x390', br: 'chromium', opt: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-1024', br: 'chromium', opt: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', br: 'chromium', opt: { viewport: { width: 1440, height: 900 } } },
];

const open = async (page, url) => {
  const res = await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  return res;
};

// Đo thanh đáy: nhìn thấy?, từng mục (nhãn, rect link, rect nhãn, cắt?, cỡ chữ, aria-current, is-active, href)
const measure = (page) => page.evaluate(() => {
  const nav = document.querySelector('nav.pc-bottom-nav');
  if (!nav) return { present: false };
  const ns = getComputedStyle(nav), nr = nav.getBoundingClientRect();
  const visible = ns.display !== 'none' && ns.visibility !== 'hidden' && nr.height > 0 && nr.top < innerHeight;
  const R = (r) => ({ x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
  const items = [...nav.querySelectorAll('li.pc-bottom-nav__item')].map((li) => {
    const a = li.querySelector('a'), lb = li.querySelector('.pc-bottom-nav__label');
    const ls = getComputedStyle(lb);
    // Rect chữ thật (Range) — so với khung link để bắt chữ tràn ra ngoài
    const rg = document.createRange(); rg.selectNodeContents(lb); const tr = rg.getBoundingClientRect();
    return {
      label: lb.textContent.trim(), href: a.getAttribute('href'), current: a.getAttribute('aria-current'),
      active: li.classList.contains('is-active'), link: R(a.getBoundingClientRect()), lab: R(lb.getBoundingClientRect()), text: R(tr),
      sw: lb.scrollWidth, cw: lb.clientWidth, ellipsis: ls.textOverflow, fs: parseFloat(ls.fontSize), lines: Math.round(tr.height / parseFloat(ls.lineHeight || ls.fontSize * 1.2) || 1),
    };
  });
  return { present: true, visible, navH: +nr.height.toFixed(1), items };
});

const result = {};
for (const fr of FRAMES) {
  const mobile = !fr.name.endsWith('1024') && !fr.name.endsWith('1440');
  console.log(`\n== ${fr.name}`);
  const browser = await (fr.br === 'webkit' ? webkit : chromium).launch();
  const ctx = await browser.newContext(fr.opt);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  result[fr.name] = {};
  for (const pg of PAGES) {
    const res = await open(page, pg.url);
    const m = await measure(page);
    result[fr.name][pg.slug] = m;
    if (!mobile) { ok(m.present && !m.visible, `${pg.slug}: thanh đáy ẩn ở ${fr.name}`); continue; }
    if (!m.visible) { console.log(`  · ${pg.slug}: thanh đáy không hiện (HTTP ${res.status()})`); if (fr.name !== 'chromium-844x390') ok(false, `${pg.slug}: thanh đáy phải hiện ở ${fr.name}`); continue; }
    const labels = m.items.map((i) => i.label);
    ok(JSON.stringify(labels) === JSON.stringify(NAV_EXPECT), `${pg.slug}: 4 mục đúng thứ tự (${labels.join(' · ')})`);
    for (const it of m.items) {
      const cut = it.sw > it.cw + 0.5 || it.ellipsis === 'ellipsis' && it.sw > it.cw;
      const inside = it.text.x >= it.link.x - 0.5 && it.text.x + it.text.w <= it.link.x + it.link.w + 0.5 && it.text.y >= it.link.y - 0.5 && it.text.y + it.text.h <= it.link.y + it.link.h + 0.5;
      ok(!cut && inside, `${pg.slug} "${it.label}": nhãn không cắt — scroll ${it.sw} / client ${it.cw}px, chữ ${it.text.w}×${it.text.h} trong link ${it.link.w}×${it.link.h} (${inside ? 'trọn' : 'TRÀN'}), ${it.lines} dòng, overflow ${it.ellipsis}`);
      ok(it.fs >= 12, `${pg.slug} "${it.label}": chữ ${it.fs}px ≥ 12`);
      ok(it.link.w >= 44 && it.link.h >= 44, `${pg.slug} "${it.label}": link ${it.link.w}×${it.link.h} ≥ 44×44`);
    }
    for (let i = 1; i < m.items.length; i++) {
      const A = m.items[i - 1].text, B = m.items[i].text;
      const ov = Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x));
      const lv = Math.max(0, Math.min(m.items[i - 1].link.x + m.items[i - 1].link.w, m.items[i].link.x + m.items[i].link.w) - Math.max(m.items[i - 1].link.x, m.items[i].link.x));
      ok(ov === 0 && lv < 0.5, `${pg.slug}: chữ "${m.items[i - 1].label}" × "${m.items[i].label}" giao ${ov.toFixed(1)}px, link giao ${lv.toFixed(1)}px`);
    }
    const curs = m.items.filter((i) => i.current === 'page');
    const acts = m.items.filter((i) => i.active);
    if (pg.cur) ok(curs.length === 1 && curs[0].label === pg.cur && acts.length === 1 && acts[0].label === pg.cur, `${pg.slug}: aria-current = [${curs.map((i) => i.label)}], is-active = [${acts.map((i) => i.label)}] (mong đợi "${pg.cur}")`);
    else ok(curs.length <= 1 && JSON.stringify(curs.map((i) => i.label)) === JSON.stringify(acts.map((i) => i.label)), `${pg.slug}: aria-current = [${curs.map((i) => i.label)}] (≤ 1, trùng is-active)`);
    console.log(`  · ${pg.slug}: thanh cao ${m.navH}px`);
    // Ảnh vùng đáy màn (thanh đáy)
    const vp = page.viewportSize();
    await page.screenshot({ path: path.join(EVD, `${MODE}-${fr.name}-${pg.slug}.png`), clip: { x: 0, y: Math.max(0, vp.height - 140), width: vp.width, height: Math.min(140, vp.height) } });
  }
  // (c) bấm từng mục từ trang chủ
  if (mobile && result[fr.name].home.visible) {
    for (const lab of NAV_EXPECT) {
      await open(page, '/');
      const a = page.locator('nav.pc-bottom-nav a', { hasText: lab }).first();
      const href = await a.getAttribute('href');
      const [resp] = await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), a.click()]);
      await page.waitForTimeout(500);
      const u = new URL(page.url());
      const h1 = await page.evaluate(() => [...document.querySelectorAll('h1')].filter((h) => { const r = h.getBoundingClientRect(); const s = getComputedStyle(h); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; }).map((h) => h.textContent.trim().replace(/\s+/g, ' ').slice(0, 50)));
      let extra = '';
      let good = resp && resp.status() === 200 && u.pathname === href && h1.length >= 1;
      if (lab === 'Soi da & Dịch vụ') {
        const txt = await page.evaluate(() => document.body.innerText);
        const sd = /soi da/i.test(txt), dv = /dịch vụ/i.test(txt);
        extra = `, có "Soi da" ${sd}, "dịch vụ" ${dv}`; good = good && sd && dv;
      }
      ok(good, `bấm "${lab}" ⇒ HTTP ${resp && resp.status()}, ${u.pathname} (href ${href}), h1 [${h1.join(' | ')}]${extra}`);
    }
  }
  await open(page, '/');
  await page.screenshot({ path: path.join(EVD, `${MODE}-${fr.name}.png`) });
  ok(errs.length === 0, `0 lỗi JS (${errs.length})`);
  await browser.close();
}
fs.writeFileSync(path.join(EVD, `${MODE}.json`), JSON.stringify(result, null, 1));
console.log(`\n${fail ? 'CHƯA ĐẠT' : 'ĐẠT'} — ${fail} mục sai · ${MODE}.json + ảnh ở ui-loop/evidence/L34/`);
process.exit(fail ? 1 : 0);
