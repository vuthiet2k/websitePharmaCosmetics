#!/usr/bin/env node
/*
  ui-loop/checks/D06.mjs — kiểm việc D06 (thay Tailwind CDN bằng assets/pc-legacy-tw.css dựng sẵn) trên trình duyệt thật.
  (cần npm run preview ở localhost:3000)

  node ui-loop/checks/D06.mjs before [css]
      Chạy khi theme CÒN CDN. 70 trang × Chromium 390 + 1440:
      (1) gom quy tắc CSS do CDN sinh (CSSOM, kể cả @media) → so với file dựng sẵn [css] (mặc định assets/pc-legacy-tw.css):
          quy tắc CDN không có trong file dựng sẵn = THIẾU (phải 0);
      (2) đổi chỗ ngay trong trang: tắt <style> CDN, chèn nội dung file dựng sẵn làm <style> CUỐI <head> (đúng vị trí CDN
          chèn) → so computed style + khung (x,y,w,h) của MỌI phần tử; đo A (CDN) → B (dựng sẵn) → A' (CDN lại); chỉ tính
          lệch khi A = A' và B ≠ A (lọc nhiễu slider / đồng hồ);
      (3) ghi before.json (chữ ký phần tử) + ảnh before-chromium-{390,1440}-<trang>.png của 10 trang PERF.
  node ui-loop/checks/D06.mjs after
      Chạy khi đã gỡ CDN. 70 trang × 390 + 1440 và 10 trang PERF × 7 khung (Chromium + WebKit iPhone 13, 320, 768, 1024,
      1440, ngang 844×390): 0 request cdn.tailwindcss.com; pc-legacy-tw.css HTTP 200, là stylesheet CUỐI trong <head>;
      không còn <script> CDN / tailwind.config; ảnh after-*; so chữ ký phần tử với before.json (390/1440).
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'D06');
const BASE = 'http://localhost:3000';
const PHASE = process.argv[2] === 'after' ? 'after' : 'before';
const CSS_FILE = path.resolve(ROOT, process.argv[3] || 'assets/pc-legacy-tw.css');
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

const src = fs.readFileSync(path.join(ROOT, 'scripts', 'ui-verify.mjs'), 'utf8');
const list = (name) => JSON.parse(src.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);`))[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
const PAGES = list('PAGES');
const PERF = list('PERF_PAGES');
const slug = (u) => (u === '/' ? 'home' : u.replace(/^\/\?tpl=/, 'tpl-').replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, ''));
const VP = {
  390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  1440: { viewport: { width: 1440, height: 900 } },
};
const CONFIGS = [
  { b: 'chromium', k: '390', ctx: VP[390] },
  { b: 'webkit', k: '390', ctx: { ...devices['iPhone 13'] } },
  { b: 'chromium', k: '320', ctx: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true } },
  { b: 'chromium', k: '768', ctx: { viewport: { width: 768, height: 1024 } } },
  { b: 'chromium', k: '1024', ctx: { viewport: { width: 1024, height: 768 } } },
  { b: 'chromium', k: '1440', ctx: VP[1440] },
  { b: 'chromium', k: '844x390', ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];
const PROPS = ['display', 'position', 'color', 'backgroundColor', 'fontSize', 'fontWeight', 'lineHeight', 'marginTop', 'marginBottom',
  'marginLeft', 'paddingTop', 'paddingLeft', 'gap', 'gridTemplateColumns', 'flexDirection', 'justifyContent', 'alignItems',
  'borderTopWidth', 'borderTopColor', 'borderTopLeftRadius', 'opacity', 'transform', 'zIndex', 'textAlign', 'textDecorationLine',
  'boxShadow', 'overflowX', 'visibility', 'objectFit', 'aspectRatio', 'letterSpacing', 'textTransform', 'width', 'height'];

// Chữ ký mọi phần tử trong <body>: tên ổn định (đường dẫn thẻ) + computed style + khung.
function sig(PROPS) {
  const out = {};
  const seen = {};
  for (const e of document.body.querySelectorAll('*')) {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
    let id = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
    const p = e.parentElement; if (p && p !== document.body) id = (p.id ? '#' + p.id : p.tagName.toLowerCase()) + '>' + id;
    seen[id] = (seen[id] || 0) + 1; const key = id + '@' + seen[id];
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    out[key] = PROPS.map((k) => cs[k]).join('|') + '|' + [r.x, r.y + scrollY, r.width, r.height].map(Math.round).join(',');
  }
  return out;
}
const cdnStyles = () => [...document.querySelectorAll('style')].filter((s) => /--tw-border-spacing-x/.test(s.textContent) && !s.dataset.d06);
function rulesOf(sheet) {
  const out = [];
  const walk = (rules, ctx) => { for (const r of rules) { if (r.cssRules && r.type !== 1) walk(r.cssRules, ctx + (r.conditionText || r.media?.mediaText || r.cssText.split('{')[0]) + ' » '); else out.push(ctx + r.cssText.replace(/\s+/g, ' ')); } };
  walk(sheet.cssRules, '');
  return out;
}

async function open(browser, ctxOpts, url) {
  const ctx = await browser.newContext({ ...ctxOpts, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const net = { cdn: 0, legacy: null };
  page.on('request', (r) => { if (/cdn\.tailwindcss\.com/.test(r.url())) net.cdn++; });
  page.on('response', (r) => { if (/\/pc-legacy-tw\.css(\?|$)/.test(r.url())) net.legacy = r.status(); });
  try { await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 }); } catch { /* kết nối kéo dài — đo sau load */ }
  await page.waitForTimeout(1200);
  return { ctx, page, net };
}
const diffSig = (a, b) => Object.keys(a).filter((k) => k in b && a[k] !== b[k]);

if (PHASE === 'before') {
  const staticCss = fs.readFileSync(CSS_FILE, 'utf8');
  const browser = await chromium.launch();
  const out = {};
  const missingAll = new Map();
  let totalDiff = 0;
  for (const k of ['390', '1440']) {
    for (const url of PAGES) {
      const { ctx, page } = await open(browser, VP[k], url);
      const r = await page.evaluate(async ({ staticCss, PROPS, sigSrc, rulesSrc, cdnSrc }) => {
        const sig = eval('(' + sigSrc + ')'); const rulesOf = eval('(' + rulesSrc + ')'); const cdnStyles = eval('(' + cdnSrc + ')');
        const wait = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 150))));
        const cdn = cdnStyles();
        if (!cdn.length) return { err: 'không thấy <style> CDN' };
        const cdnRules = cdn.flatMap((s) => rulesOf(s.sheet));
        const st = document.createElement('style'); st.dataset.d06 = '1'; st.media = 'not all'; st.textContent = staticCss;
        document.head.appendChild(st);
        const statRules = new Set(rulesOf(st.sheet));
        const missing = cdnRules.filter((r) => !statRules.has(r));
        const A = sig(PROPS);
        cdnStyles().forEach((s) => { s.media = 'not all'; }); st.media = 'all'; await wait();
        const B = sig(PROPS);
        st.media = 'not all'; cdnStyles().forEach((s) => { s.media = 'all'; }); await wait();
        const A2 = sig(PROPS);
        const diffs = Object.keys(A).filter((key) => A[key] === A2[key] && key in B && B[key] !== A[key]).map((key) => [key, A[key], B[key]]);
        return { nCdn: cdnRules.length, missing, diffs, sig: A, lastHead: document.head.lastElementChild === st };
      }, { staticCss, PROPS, sigSrc: sig.toString(), rulesSrc: rulesOf.toString(), cdnSrc: cdnStyles.toString() });
      if (r.err) { ok(false, `${k} ${url}: ${r.err}`); await ctx.close(); continue; }
      r.missing.forEach((m) => missingAll.set(m, (missingAll.get(m) || 0) + 1));
      totalDiff += r.diffs.length;
      console.log(`  ${k} ${url}: quy tắc CDN ${r.nCdn} · thiếu ${r.missing.length} · phần tử lệch khi đổi CDN→dựng sẵn ${r.diffs.length}/${Object.keys(r.sig).length}`);
      r.diffs.slice(0, 4).forEach((d) => console.log(`      ${d[0]}\n        CDN: ${d[1]}\n        mới: ${d[2]}`));
      out[`${k}|${url}`] = r.sig;
      if (PERF.includes(url)) await page.screenshot({ path: path.join(EVD, `before-chromium-${k}-${slug(url)}.png`), fullPage: true });
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(EVD, 'before.json'), JSON.stringify(out));
  console.log(`\nQuy tắc CDN thiếu trong file dựng sẵn: ${missingAll.size}`);
  [...missingAll].slice(0, 40).forEach(([m, n]) => console.log(`  [${n} trang] ${m}`));
  ok(missingAll.size === 0, `0 quy tắc CDN thiếu trong ${path.relative(ROOT, CSS_FILE)} (đo được ${missingAll.size})`);
  ok(totalDiff === 0, `0 phần tử đổi computed style / khung khi thay CDN bằng file dựng sẵn (đo được ${totalDiff})`);
} else {
  const before = JSON.parse(fs.readFileSync(path.join(EVD, 'before.json'), 'utf8'));
  const runs = [];
  for (const c of CONFIGS) {
    const pages = (c.b === 'chromium' && (c.k === '390' || c.k === '1440')) ? PAGES : PERF;
    const browser = await (c.b === 'webkit' ? webkit : chromium).launch();
    let cdnReq = 0, bad = [], changed = 0, compared = 0;
    for (const url of pages) {
      const { ctx, page, net } = await open(browser, c.ctx, url);
      const m = await page.evaluate(({ PROPS, sigSrc }) => {
        const sig = eval('(' + sigSrc + ')');
        const sheets = [...document.head.querySelectorAll('link[rel=stylesheet], style')].filter((e) => !/#dev-toolbar/.test(e.textContent)); // style thanh công cụ preview (dev-server) không thuộc theme
        const last = sheets[sheets.length - 1];
        return { lastIsLegacy: !!last && /pc-legacy-tw\.css/.test(last.getAttribute('href') || ''),
          nLegacy: document.querySelectorAll('link[href*="pc-legacy-tw.css"]').length,
          cdnTag: !!document.querySelector('script[src*="cdn.tailwindcss.com"], #pharma-tailwind-config'),
          cdnStyle: [...document.querySelectorAll('style')].some((s) => /--tw-border-spacing-x/.test(s.textContent) && !/pc-legacy/.test(s.textContent) && s.closest('head') && !s.sheet?.href),
          sig: sig(PROPS) };
      }, { PROPS, sigSrc: sig.toString() });
      cdnReq += net.cdn;
      if (net.legacy !== 200 || !m.lastIsLegacy || m.nLegacy !== 1 || m.cdnTag) bad.push(`${url} (HTTP ${net.legacy}, cuối head ${m.lastIsLegacy}, số link ${m.nLegacy}, thẻ CDN ${m.cdnTag})`);
      const b = c.b === 'chromium' ? before[`${c.k}|${url}`] : null;
      if (b) { const d = diffSig(b, m.sig); compared++; changed += d.length;
        if (d.length) {
          // In thuộc tính nào lệch — đối chiếu nhiễu (đồng hồ, slider, giờ tin nhắn) với lệch thật do CSS.
          const props = [...PROPS, 'x,y,w,h'];
          const what = (k) => { const x = b[k].split('|'), y = m.sig[k].split('|'); return props.filter((_, i) => x[i] !== y[i]).map((p, j) => p).join(',') + ` [${x.filter((v, i) => v !== y[i]).join(' / ')} → ${y.filter((v, i) => v !== x[i]).join(' / ')}]`; };
          console.log(`  ${c.b}-${c.k} ${url}: ${d.length} phần tử khác before.json`);
          d.slice(0, 6).forEach((k) => console.log(`      ${k}: ${what(k)}`));
        } }
      if (PERF.includes(url)) await page.screenshot({ path: path.join(EVD, `after-${c.b}-${c.k}-${slug(url)}.png`), fullPage: c.b === 'chromium' && (c.k === '390' || c.k === '1440') });
      if (c.k === '1440' && url === '/') {
        const foc = [];
        for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); foc.push(await page.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return `${e.tagName.toLowerCase()}:${s.outlineStyle} ${s.outlineWidth}`; })); }
        await page.keyboard.press('Shift+Tab');
        console.log(`  Tab 6 lần + Shift+Tab ở / 1440: ${foc.join(' · ')}`);
      }
      await ctx.close();
    }
    await browser.close();
    runs.push({ k: `${c.b}-${c.k}`, pages: pages.length, cdnReq, bad, changed, compared });
    console.log(`${c.b}-${c.k}: ${pages.length} trang · request CDN ${cdnReq} · trang sai nạp ${bad.length}${compared ? ` · phần tử khác before.json ${changed} (${compared} trang so)` : ''}`);
    bad.slice(0, 5).forEach((x) => console.log('    ' + x));
  }
  const cdnTotal = runs.reduce((a, r) => a + r.cdnReq, 0);
  ok(cdnTotal === 0, `0 request cdn.tailwindcss.com (đo được ${cdnTotal})`);
  ok(runs.every((r) => !r.bad.length), 'mọi trang × khung: pc-legacy-tw.css HTTP 200, 1 link, là stylesheet cuối <head>, không còn thẻ CDN');
  fs.writeFileSync(path.join(EVD, 'after.json'), JSON.stringify(runs, null, 1));
}
console.log(fail ? `\nD06 ${PHASE}: CHƯA ĐẠT (${fail} mục)` : `\nD06 ${PHASE}: ĐẠT`);
process.exit(fail ? 1 : 0);
