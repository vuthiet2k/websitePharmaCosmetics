#!/usr/bin/env node
/*
  ui-loop/checks/N18.mjs — kiểm việc N18: icon mở/đóng ≡ (`.open_mnu`) của cây danh mục drawer ☰ (D.6 + D.20 + B.7).
    < 1024 (Chromium 390 / 320 / 768 / 844×390 + WebKit iPhone 13), mỗi khung 2 chế độ reducedMotion no-preference + reduce, bấm ☰:
      (1) mục cấp 1 có con: đúng 1 SVG `ui_icon` nhìn thấy trong `.open_mnu`, khung vẽ ≥ 20×20px; mục không con 0 icon;
      (2) no-preference: icon nhìn thấy ≤ 400ms sau khi bấm ☰; reduce: chênh với link cấp 1 ≤ 50ms (ghi số ms);
      (3) ảnh ô icon có ≥ 20 điểm ảnh tương phản ≥ 3:1 với nền; màu nét / nền ≥ 3:1;
      (4) `.open_mnu::before` cây danh mục background-image none;
      (5) tâm dọc icon lệch tâm link ≤ 2px;
      (6) bấm icon mở nhóm (link con nhìn thấy), bấm lại đóng — icon vẫn nhìn thấy;
      (7) `#nav .open_mnu::before` giữ ảnh nền icon-list; 0 lỗi JS.
    ≥ 1024 (1024×768, 1440×900): (7) link menu ngang + mega-menu Danh mục giữ chữ + cỡ ±1px so evidence/N18/before.json.
  Ảnh: ui-loop/evidence/N18/<mode>-<trình duyệt>-<khung>[-<reducedMotion>][-open|-icon].png
  Chạy: node ui-loop/checks/N18.mjs [before|after]
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N18');
fs.mkdirSync(EVD, { recursive: true });
const BASE = 'http://localhost:3000';
const MODE = process.argv[2] || 'after';
const AFTER = MODE !== 'before';
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (AFTER && !cond) fail++; };

const FRAMES = [
  { name: 'chromium-390', br: 'chromium', opt: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  { name: 'webkit-iphone13', br: 'webkit', opt: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', br: 'chromium', opt: { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-768', br: 'chromium', opt: { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-844x390', br: 'chromium', opt: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-1024', br: 'chromium', opt: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', br: 'chromium', opt: { viewport: { width: 1440, height: 900 } } },
];

const HID = `(e) => { for (; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return true; } return false; }`;
const VIS = `(a) => { const r = a.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= innerWidth) return false; return !(${HID})(a); }`;
const TXT = `(a) => a.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40)`;
const TOP = '#header-category-menu .sudes-main-cate > li';

// độ sáng tương đối WCAG
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

// Đếm điểm ảnh tương phản ≥ 3:1 với màu nền trong ảnh chụp ô icon — giải mã PNG bằng canvas của 1 trang trống
const countInk = async (ctx, buf, bg) => {
  const p = await ctx.newPage();
  const n = await p.evaluate(async ({ b64, bg }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const L = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lb = 0.2126 * L(bg[0]) + 0.7152 * L(bg[1]) + 0.0722 * L(bg[2]);
    let k = 0;
    for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * L(d[i]) + 0.7152 * L(d[i + 1]) + 0.0722 * L(d[i + 2]); const [x, y] = l > lb ? [l, lb] : [lb, l]; if ((x + 0.05) / (y + 0.05) >= 3) k++; }
    return k;
  }, { b64: buf.toString('base64'), bg });
  await p.close();
  return n;
};

const open = async (page, url) => {
  const res = await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  return res;
};

const before = AFTER && fs.existsSync(path.join(EVD, 'before.json')) ? JSON.parse(fs.readFileSync(path.join(EVD, 'before.json'), 'utf8')) : {};
const result = {};

for (const f of FRAMES) {
  const w = f.opt.viewport.width;
  for (const rm of w < 1024 ? ['no-preference', 'reduce'] : ['reduce']) {
    const key = `${f.name}-${rm}`;
    console.log(`\n=== ${f.name} · reducedMotion ${rm} ===`);
    const browser = await (f.br === 'webkit' ? webkit : chromium).launch();
    const ctx = await browser.newContext({ ...f.opt, reducedMotion: rm });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const rec = (result[key] = {});
    try {
      await open(page, '/');
      if (w < 1024) {
        // đo thời điểm nhìn thấy (rAF) tính từ lúc bấm ☰
        await page.evaluate(`(() => { const hid = ${HID}; window.__t = {}; let t0 = 0;
          const tick = () => { if (t0) { const now = Math.round(performance.now() - t0);
              const a = document.querySelector('${TOP} > a'), s = document.querySelector('${TOP} > .open_mnu svg'), i = document.querySelector('${TOP} > .open_mnu');
              if (a && !hid(a) && window.__t.link == null) window.__t.link = now;
              if (s && !hid(s) && window.__t.svg == null) window.__t.svg = now;
              if (i && !hid(i) && getComputedStyle(i, '::before').visibility !== 'hidden' && getComputedStyle(i, '::before').content !== 'none' && window.__t.before == null) window.__t.before = now; }
            requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
          document.querySelector('#btn-menu-mobile').addEventListener('click', () => { t0 = performance.now(); }, { capture: true }); })()`);
        await page.click('#btn-menu-mobile');
        await page.waitForFunction(() => window.__t.link != null && (window.__t.svg != null || window.__t.before != null), null, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(300);
        const t = await page.evaluate(() => window.__t);
        rec.t = t;
        console.log(`  thời điểm nhìn thấy sau khi bấm ☰: link cấp 1 ${t.link ?? '—'}ms · icon SVG ${t.svg ?? '—'}ms · ::before ${t.before ?? '—'}ms`);

        const top = await page.evaluate(`(() => { const vis = ${VIS}, txt = ${TXT};
          return [...document.querySelectorAll('${TOP}')].filter((li) => vis(li.querySelector(':scope > a'))).map((li) => {
            const a = li.querySelector(':scope > a'), ic = li.querySelector(':scope > .open_mnu'), r = a.getBoundingClientRect();
            const svgs = ic ? [...ic.querySelectorAll('svg')].filter(vis) : []; const sr = svgs[0] ? svgs[0].getBoundingClientRect() : null;
            const b = ic ? getComputedStyle(ic, '::before') : null;
            let bg = 'rgba(0, 0, 0, 0)'; for (let e = ic || a; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) { bg = c; break; } }
            return { t: txt(a), kids: li.querySelectorAll(':scope > ul > li > a').length, svg: svgs.length,
              sw: sr ? +sr.width.toFixed(1) : 0, sh: sr ? +sr.height.toFixed(1) : 0, sRect: sr ? [sr.x, sr.y, sr.width, sr.height] : null,
              off: sr ? +Math.abs((sr.top + sr.height / 2) - (r.top + r.height / 2)).toFixed(1) : null,
              color: svgs[0] ? getComputedStyle(svgs[0]).color : (ic ? getComputedStyle(ic).color : null), bg,
              beforeBg: b ? b.backgroundImage.slice(0, 60) : null, beforeW: b ? b.width : null };
          }); })()`);
        rec.top = top;
        for (const x of top) console.log(`  ${x.t} (${x.kids} con): svg ${x.svg}${x.svg ? ` ${x.sw}×${x.sh} lệch tâm ${x.off}px màu ${x.color} / nền ${x.bg}` : ''} · ::before ${x.beforeBg} ${x.beforeW}`);
        const kidsTop = top.filter((x) => x.kids > 0), noKid = top.filter((x) => x.kids === 0);
        if (AFTER) {
          ok(kidsTop.length > 0 && kidsTop.every((x) => x.svg === 1 && x.sw >= 20 && x.sh >= 20) && noKid.every((x) => x.svg === 0),
            `(1) ${kidsTop.length} mục có con, mỗi mục 1 icon SVG ≥ 20×20 (nhỏ nhất ${Math.min(...kidsTop.map((x) => x.sw))}×${Math.min(...kidsTop.map((x) => x.sh))}); ${noKid.length} mục không con 0 icon`);
          if (rm === 'no-preference') ok(t.svg != null && t.svg <= 400, `(2) no-preference: icon nhìn thấy sau ${t.svg}ms ≤ 400ms`);
          else ok(t.svg != null && t.link != null && t.svg - t.link <= 50, `(2) reduce: icon ${t.svg}ms − link ${t.link}ms = ${t.svg - t.link}ms ≤ 50ms (phần trễ chung của link thuộc N17)`);
          ok(top.every((x) => x.beforeBg === 'none'), `(4) .open_mnu::before cây danh mục không còn ảnh nền (${top.filter((x) => x.beforeBg !== 'none').length} còn)`);
          ok(kidsTop.every((x) => x.off != null && x.off <= 2), `(5) tâm icon lệch tâm link ≤ 2px (lớn nhất ${Math.max(...kidsTop.map((x) => x.off ?? 99))}px)`);
        }
        await page.screenshot({ path: path.join(EVD, `${MODE}-${f.name}-${rm}.png`) });

        // (3) ảnh ô icon: điểm ảnh tương phản ≥ 3:1 với nền
        const k0 = kidsTop[0];
        if (k0) {
          const ir = await page.evaluate(`(() => { const i = document.querySelector('${TOP} > .open_mnu'); const r = i.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`);
          const buf = await page.screenshot({ clip: { x: ir[0], y: ir[1], width: ir[2], height: ir[3] } });
          fs.writeFileSync(path.join(EVD, `${MODE}-${f.name}-${rm}-icon.png`), buf);
          const bgc = rgb(k0.bg); const ink = await countInk(ctx, buf, bgc);
          const ratio = k0.color ? +cr(rgb(k0.color), bgc).toFixed(2) : 0;
          rec.ink = { px: ink, ratio, cell: ir.map(Math.round) };
          console.log(`  ô icon ${ir.map(Math.round).join(',')}: ${ink} điểm ảnh tương phản ≥ 3:1 với nền ${k0.bg}; màu nét ${k0.color} / nền = ${ratio}:1`);
          if (AFTER) ok(ink >= 20 && ratio >= 3, `(3) icon được vẽ: ${ink} điểm ảnh ≥ 20, màu nét/nền ${ratio}:1 ≥ 3:1`);

          // (6) bấm icon mở nhóm rồi bấm lại đóng
          const li = page.locator(TOP, { has: page.locator(':scope > a', { hasText: k0.t }) }).first();
          await li.locator(':scope > .open_mnu').click(); await page.waitForTimeout(700);
          const st1 = await page.evaluate(`((t) => { const vis = ${VIS}, txt = ${TXT}; const li = [...document.querySelectorAll('${TOP}')].find((x) => txt(x.querySelector(':scope > a')) === t);
            return { kids: [...li.querySelectorAll(':scope > ul > li > a')].filter(vis).length, svg: [...li.querySelectorAll(':scope > .open_mnu svg')].filter(vis).length }; })(${JSON.stringify(k0.t)})`);
          await page.screenshot({ path: path.join(EVD, `${MODE}-${f.name}-${rm}-open.png`) });
          await li.locator(':scope > .open_mnu').click(); await page.waitForTimeout(700);
          const st2 = await page.evaluate(`((t) => { const vis = ${VIS}, txt = ${TXT}; const li = [...document.querySelectorAll('${TOP}')].find((x) => txt(x.querySelector(':scope > a')) === t);
            return { kids: [...li.querySelectorAll(':scope > ul > li > a')].filter(vis).length, svg: [...li.querySelectorAll(':scope > .open_mnu svg')].filter(vis).length }; })(${JSON.stringify(k0.t)})`);
          rec.toggle = { open: st1, closed: st2 };
          console.log(`  bấm icon "${k0.t}": mở ${st1.kids} link con, icon ${st1.svg} · bấm lại: ${st2.kids} link con, icon ${st2.svg}`);
          if (AFTER) ok(st1.kids > 0 && st2.kids === 0 && st1.svg === 1 && st2.svg === 1, `(6) bấm icon mở (${st1.kids} link con) / đóng (${st2.kids}), icon vẫn nhìn thấy (${st1.svg}/${st2.svg})`);
        }

        // (7) #nav giữ ảnh nền ::before
        const nav = await page.evaluate(() => [...document.querySelectorAll('#nav .open_mnu')].map((i) => getComputedStyle(i, '::before').backgroundImage.includes('icon-list')));
        rec.nav = nav;
        console.log(`  #nav .open_mnu::before có icon-list: ${nav.filter(Boolean).length}/${nav.length}`);
        // trang chủ preview: #nav không có .open_mnu (before.json 0/0) ⇒ so số lượng + mọi phần tử còn ảnh nền
        if (AFTER) { const b = before[key]?.nav || []; ok(nav.length === b.length && nav.every(Boolean), `(7) #nav .open_mnu::before giữ ảnh nền icon-list ${nav.filter(Boolean).length}/${nav.length} (trước ${b.filter(Boolean).length}/${b.length})`); }
      } else {
        const navL = await page.evaluate(`(() => { const vis = ${VIS}, txt = ${TXT}; return [...document.querySelectorAll('#nav > li > a')].filter(vis).map((a) => ({ t: txt(a), h: +a.getBoundingClientRect().height.toFixed(1), w: +a.getBoundingClientRect().width.toFixed(1) })); })()`);
        await page.locator('.js-menu-toggle').first().click(); await page.waitForTimeout(800);
        const mega = await page.evaluate(`(() => { const vis = ${VIS}, txt = ${TXT}; return [...document.querySelectorAll('#header-category-menu a')].filter(vis).map((a) => ({ t: txt(a), h: +a.getBoundingClientRect().height.toFixed(1), w: +a.getBoundingClientRect().width.toFixed(1) })); })()`);
        const icons = await page.evaluate(`(() => { const vis = ${VIS}; return [...document.querySelectorAll('#header-category-menu .open_mnu')].filter(vis).length; })()`);
        rec.desk = { navL, mega, icons };
        await page.screenshot({ path: path.join(EVD, `${MODE}-${f.name}.png`) });
        console.log(`  menu ngang ${navL.length} link; mega-menu ${mega.length} link; .open_mnu nhìn thấy ${icons}`);
        if (AFTER) {
          const b = before[key]?.desk;
          const same = (A, B) => !!B && A.length === B.length && A.every((x, i) => x.t === B[i].t && Math.abs(x.h - B[i].h) <= 1 && Math.abs(x.w - B[i].w) <= 1);
          ok(same(navL, b?.navL), `(7) menu ngang ${navL.length} link giữ chữ + cỡ ±1px (trước ${b?.navL.length})`);
          ok(same(mega, b?.mega), `(7) mega-menu ${mega.length} link giữ chữ + cỡ ±1px (trước ${b?.mega.length})`);
          ok(icons === b?.icons, `(7) .open_mnu nhìn thấy ở desktop ${icons} = trước ${b?.icons}`);
        }
      }
      ok(errs.length === 0, `0 lỗi JS (${errs.length}) ${errs.slice(0, 2).join(' | ')}`);
    } catch (e) { ok(false, 'lỗi chạy: ' + e.message.split('\n')[0]); }
    await browser.close();
  }
}

fs.writeFileSync(path.join(EVD, `${AFTER ? 'after' : 'before'}.json`), JSON.stringify(result, null, 1));
console.log(AFTER ? `\n${fail ? 'CHƯA ĐẠT: ' + fail + ' mục' : 'ĐẠT toàn bộ'}` : '\nĐã ghi evidence/N18/before.json');
process.exit(fail ? 1 : 0);
