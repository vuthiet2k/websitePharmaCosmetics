// ui-loop/checks/L02.mjs — L02 tương phản (G.7): axe color-contrast 73 trang × m390 / d1440 + computed topbar, footer, giá, nút.
// Chạy: node ui-loop/checks/L02.mjs scan <tên>        quét axe toàn bộ PAGES (ghi ui-loop/evidence/L02/<tên>.json)
//       node ui-loop/checks/L02.mjs scan <tên> /a /b   chỉ các trang chỉ định
//       node ui-loop/checks/L02.mjs computed <tên>     đo computed + ảnh 7 khung (Chromium + WebKit)
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = 'http://localhost:3000';
const EV = path.resolve('ui-loop/evidence/L02'); fs.mkdirSync(EV, { recursive: true });
const args = process.argv.slice(2).map((a) => a.replace(/^[A-Za-z]:[\\/](?:Program Files[\\/])?Git(?=[\\/])/i, '').replace(/\\/g, '/'));
const mode = args[0] || 'scan'; const tag = args[1] || 'run';
const src = fs.readFileSync('scripts/ui-verify.mjs', 'utf8');
const PAGES = args.slice(2).filter((a) => a.startsWith('/')).length ? args.slice(2).filter((a) => a.startsWith('/'))
  : eval(src.match(/const PAGES = (\[[\s\S]*?\]);/)[1]);
const VP = { m390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, d1440: { viewport: { width: 1440, height: 900 } } };

async function settle(page) {
  await page.evaluate(async () => { for (let y = 0, i = 0; y < document.body.scrollHeight && i < 40; y += 700, i++) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
  await page.waitForTimeout(400);
}

async function scanOne(browser, vp, p) {
  const ctx = await browser.newContext({ ...VP[vp], reducedMotion: 'reduce' }); const page = await ctx.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  const out = { vp, path: p, nodes: [] };
  try {
    await page.goto(BASE + p, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(800); await settle(page);
    await page.evaluate(() => scrollTo(0, Math.min(1500, document.body.scrollHeight / 2))); await page.waitForTimeout(400);
    await page.evaluate(() => scrollTo(0, 0));
    await page.addScriptTag({ content: AXE_SRC });
    out.nodes = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
      const v = r.violations.find((x) => x.id === 'color-contrast'); if (!v) return [];
      return v.nodes.map((n) => { const d = (n.any[0] || {}).data || {}; const el = document.querySelector(n.target[0]);
        const cls = el ? el.tagName.toLowerCase() + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).trim().split(/\s+/).slice(0, 2).join('.') : '';
        return { t: n.target.join(' ').slice(0, 100), cls, fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio, fs: d.fontSize, txt: el ? (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) : '' }; });
    });
  } catch (e) { out.err = e.message.slice(0, 160); }
  await ctx.close(); return out;
}

async function scan() {
  const br = await chromium.launch(); const jobs = []; for (const p of PAGES) for (const vp of ['m390', 'd1440']) jobs.push([vp, p]);
  const res = []; let i = 0;
  await Promise.all([0, 1, 2, 3].map(async () => { while (i < jobs.length) { const [vp, p] = jobs[i++]; res.push(await scanOne(br, vp, p)); process.stdout.write('.'); } }));
  await br.close();
  const total = res.reduce((s, r) => s + r.nodes.length, 0); const pagesBad = res.filter((r) => r.nodes.length).length;
  const groups = {}; for (const r of res) for (const n of r.nodes) { const k = n.cls + ' | ' + n.fg + ' on ' + n.bg; (groups[k] = groups[k] || { n: 0, ratio: n.ratio, pages: new Set(), txt: n.txt }).n++; groups[k].pages.add(r.vp + ' ' + r.path); }
  const g = Object.entries(groups).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => ({ k, n: v.n, ratio: v.ratio, pages: v.pages.size, txt: v.txt, ex: [...v.pages].slice(0, 3) }));
  fs.writeFileSync(path.join(EV, tag + '.json'), JSON.stringify({ when: new Date().toISOString(), total, pagesBad, runs: res.length, errors: res.filter((r) => r.err).map((r) => r.vp + ' ' + r.path + ' ' + r.err), groups: g, res }, null, 1));
  console.log(`\n${tag}: ${res.length} lượt, ${pagesBad} lượt có lỗi, tổng ${total} nút color-contrast`);
  const byVp = {}; res.forEach((r) => { byVp[r.vp] = (byVp[r.vp] || 0) + r.nodes.length; }); console.log(byVp);
  g.slice(0, 80).forEach((x) => console.log(String(x.n).padStart(4), String(x.pages).padStart(3) + 'tr', x.ratio, x.k, '«' + x.txt + '»'));
  if (res.some((r) => r.err)) console.log('LỖI:', res.filter((r) => r.err).map((r) => r.vp + ' ' + r.path + ' ' + r.err));
}

// computed: topbar, footer, giá, nút ở 7 khung; chữ #3CB371 trên nền sáng / chữ trắng trên #3CB371
const CPAGES = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/about-us'];
const FRAMES = [['chromium', '390', VP.m390], ['webkit', '390', devices['iPhone 13']], ['chromium', '320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }],
  ['chromium', '768', { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }], ['chromium', '1024', { viewport: { width: 1024, height: 768 } }],
  ['chromium', '1440', VP.d1440], ['chromium', '844x390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }]];
function probe() {
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return c.slice(0, 3); } return [255, 255, 255]; };
  const vis = (el) => { const b = el.getBoundingClientRect(); if (!b.width || !b.height) return false; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } return true; };
  const pick = (sel) => [...document.querySelectorAll(sel)].filter(vis);
  const o = {};
  const tb = pick('.pc-topbar-v3, .pc-topbar')[0]; o.topbarBg = tb ? getComputedStyle(tb).backgroundColor : null;
  // vòng 34: chọn footer của site (trang /about-us có <footer> trích dẫn trong blockquote đứng trước)
  const ft = pick('footer.footer, .pc-foot, #footer')[0]; o.footerBg = ft ? getComputedStyle(ft).backgroundColor : null;
  const deco = [60, 179, 113]; const eq = (a, b) => a.length >= 3 && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  o.decoText = []; o.whiteOnDeco = []; o.prices = []; o.btns = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const seen = new Set();
  while (tw.nextNode()) { const el = tw.currentNode.parentElement; if (!el || seen.has(el) || tw.currentNode.textContent.trim().length < 1) continue; seen.add(el); if (el.closest('script,style,noscript,svg') || !vis(el)) continue;
    const c = rgb(getComputedStyle(el).color); const bg = bgOf(el); const lab = el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\s+/)[0] + '«' + el.textContent.trim().slice(0, 18) + '»';
    if (eq(c, deco) && lum(bg) > 0.4) o.decoText.push(lab + ' ' + ratio(c, bg));
    if (eq(bg, deco) && lum(c) > 0.9) o.whiteOnDeco.push(lab + ' ' + ratio(c, bg)); }
  pick('.price, .product-price, .pc-card__price, .special-price, .current-price, [class*="price"]:not([class*="old"]):not([class*="compare"])').slice(0, 6).forEach((el) => { const c = rgb(getComputedStyle(el).color); o.prices.push(el.className.split(' ')[0] + ' ' + getComputedStyle(el).color + ' ' + ratio(c, bgOf(el))); });
  // vòng 34: màu chữ lấy ở phần tử thật chứa chữ (vd div.mua_shop > a); nền gradient ⇒ tỉ lệ xấu nhất giữa các điểm màu;
  // nền ảnh (url) ⇒ không tính được, ghi vào btnsImg để xem ảnh chụp (axe cũng xếp loại này vào "incomplete")
  o.btnsImg = [];
  const textEl = (el) => { for (const n of el.querySelectorAll('*')) if ([...n.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim()) && vis(n)) return n; return el; };
  // Phần tử trong khung nhìn: duyệt chồng phần tử thật tại tâm (elementsFromPoint, đúng thứ tự vẽ — header position:absolute đè
  // ảnh hero thì ảnh nằm trước body); ngoài khung nhìn: đi theo cây tổ tiên. Gặp <img>/<video>/ảnh nền ⇒ null (không tính được).
  const bgsOf = (el) => { const b = el.getBoundingClientRect(); const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const all = cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight ? document.elementsFromPoint(cx, cy) : [];
    // bỏ lớp phủ nằm TRÊN phần tử (thanh dev / thanh đáy fixed che nút sát đáy màn) — chỉ xét từ chính nó / tổ tiên trở xuống
    const at = all.findIndex((e) => e === el || e.contains(el)); const stack = at >= 0 ? all.slice(at) : [];
    const chain = stack.length ? stack : (() => { const a = []; for (let e = el; e; e = e.parentElement) a.push(e); return a; })();
    for (const e of chain) { if (e.tagName === 'IMG' || e.tagName === 'VIDEO') return null; const s = getComputedStyle(e); const c = rgb(s.backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return [c.slice(0, 3)];
      if (s.backgroundImage.includes('url(')) return null;
      if (s.backgroundImage.includes('gradient')) { const st = (s.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(rgb).filter((x) => x[3] === undefined || x[3] > 0.5).map((x) => x.slice(0, 3)); if (st.length) return st; } }
    return [[255, 255, 255]]; };
  pick('button, a.btn, .btn, [class*="btn"]').slice(0, 400).forEach((el) => { if (!el.textContent.trim()) return; const te = textEl(el); const c = rgb(getComputedStyle(te).color); const bgs = bgsOf(te);
    const lab = el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + '«' + el.textContent.trim().slice(0, 14) + '»';
    const clip = getComputedStyle(te).webkitBackgroundClip === 'text' || getComputedStyle(te).backgroundClip === 'text';
    if (!bgs || clip) { o.btnsImg.push(lab + (clip ? ' (chữ tô gradient)' : '')); return; } const r = Math.min(...bgs.map((b) => ratio(c, b))); if (r < 4.5) o.btns.push(lab + ' ' + r); });
  return o;
}
async function computed() {
  const rows = []; const browsers = { chromium: await chromium.launch(), webkit: await webkit.launch() };
  for (const [bn, fr, opt] of FRAMES) for (const p of CPAGES) {
    const ctx = await browsers[bn].newContext({ ...opt, reducedMotion: 'reduce' }); const page = await ctx.newPage();
    await page.goto(BASE + p, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(1200); await settle(page);
    const o = await page.evaluate(probe); rows.push({ bn, fr, p, ...o });
    console.log(`${bn} ${fr} ${p}: topbar ${o.topbarBg} · footer ${o.footerBg} · chữ#3CB371/nền sáng ${o.decoText.length} · trắng/#3CB371 ${o.whiteOnDeco.length} · nút<4.5 ${o.btns.length} · giá ${o.prices.slice(0, 2).join(' ; ')}`);
    if (o.decoText.length) console.log('   deco:', o.decoText.slice(0, 5).join(' | '));
    if (o.whiteOnDeco.length) console.log('   trắng/deco:', o.whiteOnDeco.slice(0, 5).join(' | '));
    if (o.btns.length) console.log('   nút:', o.btns.slice(0, 5).join(' | '));
    if (o.btnsImg.length) console.log('   nút trên nền ảnh (xem ảnh chụp):', o.btnsImg.slice(0, 5).join(' | '));
    if (p === '/' || p === '/products/serum-vitamin-c-15') {
      const name = `${tag}-${bn}-${fr}${p === '/' ? '' : '-pdp'}.png`;
      await page.screenshot({ path: path.join(EV, name) });
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(EV, name.replace('.png', '-footer.png')) });
    }
    await ctx.close();
  }
  await browsers.chromium.close(); await browsers.webkit.close();
  fs.writeFileSync(path.join(EV, tag + '-computed.json'), JSON.stringify(rows, null, 1));
}
if (mode === 'scan') await scan(); else await computed();
