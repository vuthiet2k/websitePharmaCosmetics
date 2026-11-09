// L03b42 (vòng 112, 09/11/2026 — chạy lại: node ui-loop/checks/L03b42.mjs before|after [site|frames|all]).
// Việc: gỡ link CDN Font Awesome ở layouts/theme.bwt + layouts/chat.bwt; xoá quy tắc chết `.wd-icon:before` (global_core).
// Đo:
//  site   — 66 trang PAGES của scripts/ui-verify.mjs × Chromium 390 + 1440: request font-awesome, phần tử nhìn thấy mang
//           class fa/fa-*, phần tử/pseudo HIỂN THỊ chữ bằng font Font Awesome, cao trang, lỗi JS.
//  frames — 7 khung × 5 trang (/, /collections/all, PDP, giỏ, /?tpl=page.l03b36-chat = layout chat) như trên + ảnh;
//           /collections/all: chèn đúng markup ô lọc tag của snippets/filter-cate-col.bwt (`<i class="fa"></i>` — chỉ dựng khi
//           mô tả danh mục có <h5>, dữ liệu mẫu không có) vào cột lọc, đo hộp ::before, bấm ô ⇒ checked + tick ::after.
// Ảnh: ui-loop/evidence/L03b42/<mode>-<trình duyệt>-<khung>-<trang>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const PART = process.argv[3] || 'all';
const OUT = 'ui-loop/evidence/L03b42';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-${PART}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const HOST = 'http://localhost:3000';
const src = fs.readFileSync('scripts/ui-verify.mjs', 'utf8');
const PAGES = eval(src.match(/const PAGES = (\[[\s\S]*?\]);/)[1]);
const mob = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const FRAMES = [
  ['chromium', '390', chromium, mob(390, 844)],
  ['webkit', 'iphone13', webkit, devices['iPhone 13']],
  ['chromium', '1440', chromium, { viewport: { width: 1440, height: 900 } }],
  ['chromium', '320', chromium, mob(320, 568)],
  ['chromium', '768', chromium, { viewport: { width: 768, height: 1024 } }],
  ['chromium', '1024', chromium, { viewport: { width: 1024, height: 768 } }],
  ['chromium', '844x390', chromium, mob(844, 390)],
];
const FPAGES = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/?tpl=page.l03b36-chat'];
const beforeFile = `${OUT}/before.json`;
const before = MODE === 'after' && fs.existsSync(beforeFile) ? JSON.parse(fs.readFileSync(beforeFile, 'utf8')) : {};
const data = fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
const fails = [];
const ok = (cond, msg) => { if (!cond) console.log(`✗ ${msg}`); else if (process.env.VERBOSE) console.log(`✔ ${msg}`); if (!cond) fails.push(msg); okN += cond ? 1 : 0; };
let okN = 0;
const near = (a, b, t) => Math.abs(a - b) <= t;

// (a) tĩnh
for (const f of ['layouts/theme.bwt', 'layouts/chat.bwt']) {
  const n = (fs.readFileSync(f, 'utf8').match(/font-awesome/gi) || []).length;
  console.log(`${f}: chuỗi font-awesome ${n}`);
  if (MODE === 'after') ok(n === 0, `${f}: 0 chuỗi font-awesome (${n})`);
}

const measure = (p) => p.evaluate(() => {
  const FA = /awesome/i;
  const vis = (el) => { const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden'; };
  let faEls = 0, faGlyph = 0; const samples = [];
  for (const el of document.querySelectorAll('body *')) {
    const cls = typeof el.className === 'string' ? el.className : (el.getAttribute('class') || '');
    if (/(^|\s)(fa|fas|far|fab|fa-solid|fa-regular|fa-brands|fa-[a-z0-9-]+)(\s|$)/.test(cls) && vis(el)) { faEls++; if (samples.length < 4) samples.push(el.tagName + '.' + cls.slice(0, 40)); }
    const c = getComputedStyle(el);
    if (FA.test(c.fontFamily) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && vis(el)) { faGlyph++; if (samples.length < 4) samples.push('txt:' + el.tagName); }
    for (const ps of ['::before', '::after']) {
      const s = getComputedStyle(el, ps);
      if (s.content && s.content !== 'none' && s.content !== 'normal' && s.content !== '""' && FA.test(s.fontFamily) && s.display !== 'none' && vis(el)) { faGlyph++; if (samples.length < 4) samples.push(ps + ':' + el.tagName + '.' + cls.slice(0, 30)); }
    }
  }
  return { faEls, faGlyph, samples, docH: document.documentElement.scrollHeight };
});

async function visit(p, url) {
  await p.goto(HOST + url, { waitUntil: 'load', timeout: 60000 });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(900);
  try { return await measure(p); } catch { await p.waitForLoadState('load'); await p.waitForTimeout(1500); return measure(p); }
}

// Ô lọc tag filter-cate-col: chèn markup y nguyên snippet vào cột lọc.
async function filterBox(p) {
  return p.evaluate(async () => {
    // Đúng chỗ snippet in ra: ngay sau .aside-filter-groups trong .filter-container (snippets/aside-filter.bwt dòng 234)
    const host = document.querySelector('.filter-container > .aside-filter-groups');
    if (!host) return { err: 'không thấy cột lọc' };
    const wrap = document.createElement('div');
    wrap.innerHTML = `<aside class="aside-item filter-tag-style-1 tag-filtster" id="l03b42-tag"><div class="aside-title"><h2 class="title-head margin-top-0"><span>Loại da</span></h2></div><div class="aside-content filter-group"><ul><li class="filter-item filter-item--check-box filter-item--green"><span><label for="filter-da-dau"><input type="checkbox" id="filter-da-dau" data-group="tag21" data-field="tags" data-text="Da dầu" value="(Da dầu)" data-operator="OR"><i class="fa"></i>Da dầu</label></span></li></ul></div></aside>`;
    const node = wrap.firstChild;
    host.after(node);
    const i = node.querySelector('i.fa'); const inp = node.querySelector('input'); const lab = node.querySelector('label');
    const g = (r) => [+(r.x).toFixed(1), +(r.y).toFixed(1), +(r.width).toFixed(1), +(r.height).toFixed(1)];
    const ps = (el, w) => { const s = getComputedStyle(el, w); return { content: s.content, w: s.width, h: s.height, border: s.borderTopWidth + ' ' + s.borderTopColor, bg: s.backgroundImage.slice(0, 40), pos: s.position, top: s.top, left: s.left, ff: s.fontFamily.slice(0, 40) }; };
    const visible = getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().height > 0;
    const lr = lab.getBoundingClientRect(); const ir = i.getBoundingClientRect();
    const res = { visible, i: g(ir), iRel: [+(ir.x - lr.x).toFixed(1), +(ir.y - lr.y).toFixed(1)], label: [+(lr.width).toFixed(1), +(lr.height).toFixed(1)], iDisplay: getComputedStyle(i).display, iFF: getComputedStyle(i).fontFamily.slice(0, 40), before: ps(i, '::before') };
    node.scrollIntoView({ block: 'center' });
    return res;
  });
}

// So 2 ảnh PNG từng điểm ảnh trong trình duyệt (repo không có pngjs/pixelmatch).
async function pxDiff(b, fa, fb) {
  if (!fs.existsSync(fa) || !fs.existsSync(fb)) return { missing: true };
  const ctx = await b.newContext(); const p = await ctx.newPage();
  const u = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const r = await p.evaluate(async ([a, c]) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(a), load(c)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { sameSize: false, a: [ia.width, ia.height], b: [ib.width, ib.height] };
    const px = (i) => { const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const x = cv.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
    const da = px(ia), db = px(ib); let n = 0;
    for (let k = 0; k < da.length; k += 4) if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2]) n++;
    return { sameSize: true, size: [ia.width, ia.height], diffPx: n };
  }, [u(fa), u(fb)]);
  await ctx.close(); return r;
}

async function runSite() {
  for (const [brn, fr, br, opt] of FRAMES.filter(([, f]) => f === '390' || f === '1440')) {
    const b = await br.launch();
    for (const url of PAGES) {
      const key = `site-${brn}-${fr}-${url}`;
      const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      const errs = [], faReq = [];
      p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
      p.on('request', (r) => { if (/font-?awesome/i.test(r.url())) faReq.push(r.url().slice(-60)); });
      let m; try { m = await visit(p, url); } catch (e) { m = { err: String(e).slice(0, 100) }; }
      m.errs = errs.length; m.faReq = faReq.length;
      data[key] = m;
      const bm = before[key];
      console.log(`${key}: req FA ${m.faReq} · class fa nhìn thấy ${m.faEls} · glyph FA ${m.faGlyph} ${m.samples?.length ? JSON.stringify(m.samples) : ''} · cao ${m.docH}${bm ? ' (before ' + bm.docH + ')' : ''} · lỗi JS ${m.errs}`);
      if (MODE === 'after') {
        ok(!m.err, `${key}: mở trang ${m.err || ''}`);
        ok(m.faReq === 0, `${key}: 0 request font-awesome (${m.faReq}; before ${bm?.faReq})`);
        ok(m.faEls === 0 && m.faGlyph === 0, `${key}: 0 class fa / glyph FA (${m.faEls}/${m.faGlyph}; before ${bm?.faEls}/${bm?.faGlyph})`);
        ok(bm && bm.faGlyph === 0, `${key}: before 0 glyph FA hiển thị ⇒ không icon nào mất (${bm?.faGlyph})`);
        ok(bm && near(m.docH, bm.docH, 2), `${key}: cao trang ${m.docH} vs before ${bm?.docH}`);
        ok(m.errs <= (bm?.errs ?? 0), `${key}: lỗi JS ${m.errs} ≤ before ${bm?.errs}`);
      }
      await ctx.close();
    }
    await b.close();
  }
}

async function runFrames() {
  for (const [brn, fr, br, opt] of FRAMES) {
    const b = await br.launch();
    for (const url of FPAGES) {
      const slug = url === '/' ? 'home' : url.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      const key = `fr-${brn}-${fr}-${slug}`;
      const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      const errs = [], faReq = [];
      p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
      p.on('request', (r) => { if (/font-?awesome/i.test(r.url())) faReq.push(r.url().slice(-60)); });
      const m = await visit(p, url);
      m.errs = errs.length; m.faReq = faReq.length;
      if (url === '/collections/all') {
        // < 1024px cột lọc nằm trong bảng trượt — mở bằng nút «Bộ lọc» như người dùng
        const openBtn = p.locator('.btn-filter-mobile:visible').first();
        if (await openBtn.count()) { await openBtn.click(); await p.waitForTimeout(600); m.openedPanel = true; }
        m.box = await filterBox(p);
        if (m.box.err) throw new Error(m.box.err);
        await p.waitForTimeout(200);
        const lab = p.locator('#l03b42-tag label');
        const st = [await p.locator('#filter-da-dau').isChecked()];
        await lab.click({ force: true }).catch(async () => p.evaluate(() => document.getElementById('filter-da-dau').click()));
        await p.waitForTimeout(250);
        st.push(await p.locator('#filter-da-dau').isChecked());
        m.tick = await p.evaluate(() => { const i = document.querySelector('#l03b42-tag i.fa'); const s = getComputedStyle(i, '::after'); return { content: s.content, w: s.width, h: s.height, bg: s.backgroundImage.slice(0, 50) }; });
        m.checked = st.join('→');
        await p.locator('#l03b42-tag').screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-filtertag.png` }).catch(() => {});
        console.log(`   ô lọc tag: ${JSON.stringify(m.box)} · bấm ${m.checked} · tick ::after ${JSON.stringify(m.tick)}`);
      }
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(200);
      await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${slug}.png` }).catch(() => {});
      data[key] = m;
      const bm = before[key];
      console.log(`${key}: req FA ${m.faReq} · class fa ${m.faEls} · glyph FA ${m.faGlyph} ${m.samples?.length ? JSON.stringify(m.samples) : ''} · cao ${m.docH}${bm ? ' (before ' + bm.docH + ')' : ''} · lỗi JS ${m.errs}`);
      if (MODE === 'after') {
        ok(m.faReq === 0, `${key}: 0 request font-awesome (${m.faReq}; before ${bm?.faReq})`);
        ok(m.faEls === 0 && m.faGlyph === 0, `${key}: 0 class fa / glyph FA (${m.faEls}/${m.faGlyph})`);
        ok(bm && bm.faGlyph === 0, `${key}: before 0 glyph FA hiển thị (${bm?.faGlyph})`);
        ok(bm && near(m.docH, bm.docH, 2), `${key}: cao trang ${m.docH} vs before ${bm?.docH}`);
        ok(m.errs <= (bm?.errs ?? 0), `${key}: lỗi JS ${m.errs} ≤ before ${bm?.errs}`);
        if (m.box) {
          const bb = bm.box;
          ok(m.box.visible === bb.visible, `${key}: ô lọc hiển thị ${m.box.visible} = before`);
          // <i class="fa"> rỗng 0×0 — chỉ ghi để tham khảo; quyết định bằng hộp ::before + so ảnh từng điểm ảnh khối ô lọc
          console.log(`   <i.fa> trong nhãn ${m.box.iRel} (before ${bb.iRel}) · display ${m.box.iDisplay} (before ${bb.iDisplay})`);
          ok(m.box.label.every((v, i) => near(v, bb.label[i], 1)), `${key}: nhãn ô lọc ${m.box.label} vs ${bb.label}`);
          const diff = await pxDiff(b, `${OUT}/before-${brn}-${fr}-filtertag.png`, `${OUT}/after-${brn}-${fr}-filtertag.png`);
          console.log(`   so ảnh khối ô lọc (đã tick) với before: ${JSON.stringify(diff)}`);
          ok(diff.sameSize && diff.diffPx === 0, `${key}: ảnh ô lọc đã tick = before (${JSON.stringify(diff)})`);
          const kb = ['content', 'w', 'h', 'border', 'pos', 'top', 'left'];
          ok(kb.every((k) => m.box.before[k] === bb.before[k]), `${key}: hộp ::before = before (${JSON.stringify(m.box.before)} vs ${JSON.stringify(bb.before)})`);
          ok(m.checked === bm.checked && m.checked === 'false→true', `${key}: bấm ô ${m.checked} (before ${bm.checked})`);
          ok(m.tick.content === bm.tick.content && m.tick.w === bm.tick.w && m.tick.bg === bm.tick.bg, `${key}: tick ::after = before (${JSON.stringify(m.tick)})`);
        }
      }
      await ctx.close();
    }
    await b.close();
  }
}

if (PART === 'site' || PART === 'all') await runSite();
if (PART === 'frames' || PART === 'all') await runFrames();
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify(data, null, 1));
console.log(MODE === 'after' ? `KẾT QUẢ (${PART}): ${okN} ✔ / ${fails.length} ✗ ${fails.length ? '' : 'ĐẠT'}` : `Đã ghi ${MODE}.json (${PART})`);
process.exit(MODE === 'after' && fails.length ? 1 : 0);
