// L03b37 (vòng 105–106, 09/11/2026 — chạy lại: node ui-loop/checks/L03b37.mjs before|after [khung,khung]).
// Việc: bỏ bộ lọc `remove: 'fa-solid'` thừa ở snippets/lieu_trinh_concerns.bwt (ui_icon đã tự lấy từ cuối + bỏ tiền tố fa-).
// Nhánh ô icon chỉ dựng khi bài «Vấn đề da» không ảnh ⇒ dữ liệu mẫu local `?lt=noimg` (5 bài bỏ ảnh, tag icon: nhiều dạng).
// Đo: 2 trang (?lt=noimg + không tham số) × 7 khung; outerHTML 5 ô .lt-media--icon / HTML khối #service-concerns-section,
//   hộp + màu icon, cao khối, cao trang, chuỗi Tab qua thẻ link của khối, lỗi JS.
// Ảnh: ui-loop/evidence/L03b37/<mode>-<trình duyệt>-<khung>-<trang>.png (cận khối «Vấn đề da»)
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b37';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const BASE = 'http://localhost:3000/elaine-brennan-getglowing-micro-peel-lieu-trinh-peel-chuyen-nghiep-ho-tro-lam-sang-va-cai-thien-be-mat-da';
const PAGES = [['noimg', `${BASE}?lt=noimg`], ['img', BASE]];
const SEC = '#service-concerns-section';
const mob = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const FRAMES = [
  ['chromium', '390', chromium, mob(390, 844)],
  ['webkit', 'iphone13', webkit, devices['iPhone 13']],
  ['chromium', '1440', chromium, { viewport: { width: 1440, height: 900 } }],
  ['chromium', '320', chromium, mob(320, 568)],
  ['chromium', '768', chromium, { viewport: { width: 768, height: 1024 } }],
  ['chromium', '1024', chromium, { viewport: { width: 1024, height: 768 } }],
  ['chromium', '844x390', chromium, mob(844, 390)],
].filter(([, fr]) => !process.argv[3] || process.argv[3].split(',').includes(fr));
const before = MODE === 'after' && fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')) : null;
const data = {}; const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };

const measure = (p) => p.evaluate((SEC) => {
  const sec = document.querySelector(SEC);
  if (!sec) return { none: true, docH: document.documentElement.scrollHeight };
  const boxes = [...sec.querySelectorAll('.lt-media--icon')];
  const icons = boxes.map((b) => { const s = b.querySelector('svg'); const r = s?.getBoundingClientRect(); const br = b.getBoundingClientRect();
    return { html: b.outerHTML, vis: !!(r && r.width > 0 && r.height > 0), w: r ? +r.width.toFixed(1) : 0, h: r ? +r.height.toFixed(1) : 0,
      cx: r ? +(r.x + r.width / 2 - br.x).toFixed(1) : 0, cy: r ? +(r.y + r.height / 2 - br.y).toFixed(1) : 0,
      color: s ? getComputedStyle(s).color : '', stroke: s ? getComputedStyle(s).stroke : '' }; });
  const sr = sec.getBoundingClientRect();
  return { cards: sec.querySelectorAll('.lt-concern').length, imgs: sec.querySelectorAll('.lt-media img').length, icons,
    secHtml: sec.outerHTML, secH: +sr.height.toFixed(1), docH: document.documentElement.scrollHeight,
    pcErr: (sec.outerHTML.match(/PC-ERROR/g) || []).length,
    faSec: [...sec.querySelectorAll('i')].filter((i) => /(^|\s)fa-/.test(i.className)).length };
}, SEC);
// Tab: focus phần tử ngay trước khối, Tab qua các link trong khối (5 thẻ) + Shift+Tab.
const focusSeq = async (p) => {
  const n = await p.evaluate((SEC) => { const sec = document.querySelector(SEC); const links = sec ? [...sec.querySelectorAll('a[href]')] : [];
    const all = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')];
    const prev = links[0] ? all[all.indexOf(links[0]) - 1] : null; if (prev) { prev.focus(); } return links.length; }, SEC);
  const seq = [];
  for (let k = 0; k < n; k++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a);
    return `${a.tagName}.${String(a.className).split(' ')[0]}[${(a.getAttribute('href') || '').split('/').pop()}]:${c.outlineStyle === 'none' ? 0 : c.outlineWidth}`; })); }
  await p.keyboard.press('Shift+Tab'); seq.push('S:' + await p.evaluate(() => (document.activeElement.getAttribute('href') || document.activeElement.tagName).split('/').pop()));
  return seq.join(' > ');
};

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  for (const [pg, url] of PAGES) {
    const key = `${brn}-${fr}-${pg}`;
    const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await p.goto(url, { waitUntil: 'load', timeout: 60000 });
    await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
    await p.waitForTimeout(800);
    const m = await measure(p);
    if (!m.none) {
      await p.locator(SEC).scrollIntoViewIfNeeded();
      await p.waitForTimeout(400);
      await p.locator(SEC).screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pg}.png` }).catch(() => {});
      m.focus = brn === 'webkit' ? 'bỏ (WebKit Tab không qua link mặc định)' : await focusSeq(p);
    }
    m.errs = errs;
    data[key] = m;
    console.log(`${key}: thẻ ${m.cards} · ảnh ${m.imgs} · ô icon ${m.icons?.length} (nhìn thấy ${m.icons?.filter((x) => x.vis).length}) · FA ${m.faSec} · PC-ERROR ${m.pcErr} · cao khối ${m.secH} · cao trang ${m.docH} · lỗi JS ${errs.length}`);
    (m.icons || []).forEach((x, k) => console.log(`      ô ${k + 1}: ${x.w}×${x.h} tâm @${x.cx},${x.cy} màu ${x.color} nét ${x.stroke} · ${x.html.match(/<path[^>]*d="([^"]{0,24})/)?.[1] || ''}`));
    console.log(`   focus: ${m.focus}`);
    if (MODE === 'after') {
      const bm = before?.[key];
      if (!bm) ok(false, `${key}: có số đo before`);
      else {
        ok(m.cards === bm.cards && m.cards === 5, `${key}: thẻ «Vấn đề da» ${bm.cards} → ${m.cards}`);
        ok(m.pcErr === 0 && m.faSec === 0, `${key}: PC-ERROR ${m.pcErr} · <i fa-> ${m.faSec}`);
        if (pg === 'noimg') {
          ok(m.icons.length === 5 && m.icons.every((x) => x.vis), `${key}: 5 ô icon nhìn thấy (${m.icons.filter((x) => x.vis).length}/${m.icons.length})`);
          m.icons.forEach((x, k) => { const y = bm.icons[k];
            ok(y && x.html === y.html, `${key} ô ${k + 1}: outerHTML after = before`);
            if (y) { const a = (x.color.match(/[\d.]+/g) || []).map(Number), c = (y.color.match(/[\d.]+/g) || []).map(Number);
              const cd = Math.max(...a.slice(0, 3).map((v, j) => Math.abs(v - c[j])));
              ok(cd <= 10 && x.w === y.w && x.h === y.h && Math.hypot(x.cx - y.cx, x.cy - y.cy) <= 0.5, `${key} ô ${k + 1}: ${y.w}×${y.h} → ${x.w}×${x.h}, ΔRGB ${cd}, lệch tâm ${Math.hypot(x.cx - y.cx, x.cy - y.cy).toFixed(1)}px`); } });
        } else {
          ok(m.imgs === 5 && m.secHtml === bm.secHtml, `${key}: 5 ảnh, HTML khối after = before (ảnh ${m.imgs})`);
        }
        ok(Math.abs(m.secH - bm.secH) <= 2, `${key}: cao khối ${bm.secH} → ${m.secH}`);
        ok(Math.abs(m.docH - bm.docH) <= 2, `${key}: cao trang ${bm.docH} → ${m.docH}`);
        ok(m.focus === bm.focus, `${key}: chuỗi Tab before = after (${m.focus})`);
        const nu = errs.filter((e) => !(bm.errs || []).includes(e)); ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`);
      }
    }
    await ctx.close();
  }
  await b.close();
}
for (const k of Object.keys(data)) delete data[k].secHtml_; // giữ secHtml để so
const prev = process.argv[3] && fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify({ ...prev, ...data }, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
