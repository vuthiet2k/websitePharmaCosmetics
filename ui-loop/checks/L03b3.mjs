// L03b3 (vòng 55, 31/10/2026 — chạy lại: node ui-loop/checks/L03b3.mjs before|after).
// Việc: gỡ Font Awesome ở 9 KHỐI TRANG CHỦ (home_portal): section_ai_guide, section_portal_split, section_solutions,
// section_featured_products, section_spa, section_brand_marquee, section_expert_team, section_portal_blog, section_portal_social
// — thay bằng ui_icon size 'em' trong thẻ <i> bọc cũ.
// Tiêu chí (BACKLOG L03b3): 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13), trang /?tpl=index:
//   · 0 thẻ <i class="fa-…"> trong 9 khối; 0 "PC-ERROR ui_icon";
//   · icon nhìn thấy after ≥ before; lệch tâm trong phần tử cha ≤ 4px; phần tử cha đổi cỡ ≤ 4px; cao icon 60–160 %;
//     0 icon nét bị CSS cũ tô đặc; màu icon = màu chữ phần tử cha; cao trang lệch ≤ 4px;
//   · Tab tới link «Xem tất cả» đầu tiên có icon: có viền focus, Enter mở đúng href; 0 lỗi JS mới.
// Ảnh: ui-loop/evidence/L03b3/<mode>-<trình duyệt>-<khung>-<khối>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b3';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const SECS = ['section_ai_guide', 'section_portal_split', 'section_solutions', 'section_featured_products', 'section_spa', 'section_brand_marquee', 'section_expert_team', 'section_portal_blog', 'section_portal_social'];
const ZONES = SECS.map((s) => '#' + s).join(', ');
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
const before = MODE === 'after' && fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')) : null;
const data = {}; const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };

const measure = (p) => p.evaluate((zones) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.() !== false; };
  const out = []; let fa = 0;
  for (const z of document.querySelectorAll(zones)) {
    for (const i of z.querySelectorAll('i')) {
      const isFa = /(^|\s)fa-|(^|\s)fas(\s|$)/.test(i.className); if (isFa) fa++;
      const svg = i.querySelector(':scope > svg');
      if (!isFa && !svg) continue;
      const t = svg || i; const r = t.getBoundingClientRect(); const pr = i.parentElement.getBoundingClientRect();
      const ir = i.getBoundingClientRect(); // hộp <i> bọc — so với before khi <i> FA bị flex cột kéo giãn (khối spa)
      const filled = svg ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')].filter((e) => getComputedStyle(e).fill !== 'none').length : 0;
      out.push({ zone: z.id, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|fas\s*/g, '').trim(), vis: vis(t) && vis(i),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
        iw: +ir.width.toFixed(1), ih: +ir.height.toFixed(1), irx: +(ir.x + ir.width / 2 - pr.x).toFixed(1), iry: +(ir.y + ir.height / 2 - pr.y).toFixed(1),
        glyphLeft: +(r.x - pr.x).toFixed(1),
        filled, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null, pcolor: getComputedStyle(i.parentElement).color });
    }
  }
  return { icons: out, fa, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
}, ZONES);

const compare = (key, bm, m) => {
  const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
  ok(av.length >= bv.length, `${key}: icon nhìn thấy before ${bv.length} → after ${av.length}`);
  let worst = 0, worstK = '', minR = 9, maxR = 0, parD = 0, parK = '';
  bv.forEach((x, i) => { const y0 = av[i]; if (!y0) return;
    // <i> FA bị kéo giãn (rộng > 2× cao, glyph nằm trái): so hộp <i> bọc before ↔ after (cùng loại hộp)
    const y = x.w > 2 * x.h && y0.iw ? { ...y0, rx: y0.irx, ry: y0.iry } : y0;
    const d = Math.hypot(x.rx - y.rx, x.ry - y.ry); if (d > worst) { worst = d; worstK = x.zone + ' ' + x.cls; }
    const pd = Math.max(Math.abs(x.pw - y.pw), Math.abs(x.ph - y.ph)); if (pd > parD) { parD = pd; parK = x.zone + ' ' + x.cls; }
    const rr = (y.h || 0.01) / (x.h || 0.01); minR = Math.min(minR, rr); maxR = Math.max(maxR, rr); });
  const fill = av.filter((y) => y.filled).map((y) => y.zone + ' ' + y.cls);
  const badColor = av.filter((y) => y.stroke && y.stroke !== y.color).map((y) => `${y.zone} stroke ${y.stroke} ≠ ${y.color}`);
  console.log(`   ${key}: lệch tâm lớn nhất ${worst.toFixed(1)}px (${worstK}) · đổi cỡ phần tử cha lớn nhất ${parD.toFixed(1)}px (${parK}) · tỉ lệ cao icon ${minR.toFixed(2)}–${maxR.toFixed(2)} · cao trang ${bm.docH} → ${m.docH}`);
  av.forEach((y) => console.log(`      ${y.zone} [${y.cls}] ${y.w}×${y.h} màu ${y.color} (cha ${y.pcolor})`));
  ok(worst <= 4 || bv.length === 0, `${key}: lệch tâm icon trong phần tử cha ≤ 4px (đo ${worst.toFixed(1)})`);
  ok(parD <= 4 || bv.length === 0, `${key}: cỡ phần tử chứa icon đổi ≤ 4px (đo ${parD.toFixed(1)})`);
  ok(bv.length === 0 || (minR >= 0.6 && maxR <= 1.6), `${key}: cỡ icon 60–160 % before (${minR.toFixed(2)}–${maxR.toFixed(2)})`);
  ok(fill.length === 0, `${key}: icon nét bị CSS cũ tô đặc = ${fill.length}${fill.length ? ' — ' + fill.slice(0, 3).join(', ') : ''}`);
  ok(badColor.length === 0, `${key}: icon vẽ bằng currentColor = ${av.length - badColor.length}/${av.length}${badColor.length ? ' — ' + badColor.slice(0, 2).join(', ') : ''}`);
  ok(Math.abs(bm.docH - m.docH) <= 4, `${key}: cao trang lệch ${Math.abs(bm.docH - m.docH)}px ≤ 4`);
};

for (const [brn, fr, br, opt] of FRAMES) {
  const key = `${brn}-${fr}`;
  const b = await br.launch();
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto(BASE + '/?tpl=index', { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove()); // thanh công cụ preview (dev-server), không thuộc theme
  await p.waitForTimeout(800);
  // cuộn hết trang để khối hiện dần ([data-reveal]) + ảnh lazy hiện ra, rồi về đầu
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } scrollTo(0, 0); });
  await p.waitForTimeout(600);
  const m = await measure(p);
  data[key] = m;
  const visN = m.icons.filter((x) => x.vis).length;
  if (MODE === 'after') {
    ok(m.fa === 0, `${key}: <i fa-> trong 9 khối = ${m.fa}`);
    ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
    if (before?.[key]) compare(key, before[key], m);
  } else console.log(`${key}: icon FA ${m.fa} · nhìn thấy ${visN}`);
  // ảnh cận từng khối có icon
  for (const s of SECS) {
    const has = m.icons.some((x) => x.zone === s && x.vis); if (!has) continue;
    const loc = p.locator('#' + s); await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
    const box = await loc.boundingBox(); const vp = p.viewportSize();
    await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${s.replace('section_', '')}.png`, clip: { x: 0, y: Math.max(0, box.y), width: vp.width, height: Math.min(vp.height, box.height) }, fullPage: false }).catch(() => loc.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${s.replace('section_', '')}.png` }));
  }
  // (c) bàn phím: link «Xem tất cả» đầu tiên (có icon) trong 9 khối
  const link = p.locator(SECS.map((s) => `#${s} a.pc-viewall:visible`).join(', ')).first();
  if (await link.count()) {
    const href = await link.getAttribute('href');
    await link.scrollIntoViewIfNeeded();
    // WebKit (Safari) mặc định Tab bỏ qua link (Alt+Tab cũng không vào được ở Playwright — đo before) ⇒ WebKit chỉ focus() + Enter
    await link.focus();
    if (brn !== 'webkit') { await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); }
    const f = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { txt: a.textContent.trim().slice(0, 40), href: a.getAttribute('href'), ow: c.outlineStyle === 'none' ? 0 : parseFloat(c.outlineWidth), oc: c.outlineColor, fv: a.matches(':focus-visible') }; });
    await link.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-viewall-focus.png` }).catch(() => {});
    await Promise.all([p.waitForURL((u) => u.pathname !== '/', { timeout: 30000 }).catch(() => {}), p.keyboard.press('Enter')]);
    await p.waitForTimeout(300);
    const url = new URL(p.url());
    const want = new URL(href, BASE);
    console.log(`   ${key} focus: ${JSON.stringify(f)} → Enter mở ${url.pathname}${url.search}`);
    data[`${key}|kb`] = { f, url: url.pathname + url.search };
    if (MODE === 'after') {
      ok(f.href === href && (f.ow >= 2 || brn === 'webkit'), `${key}: ${brn === 'webkit' ? 'focus()' : 'Tab'} tới «${f.txt}» viền focus ${f.ow}px ${f.oc}`);
      ok(url.pathname === want.pathname && url.search === want.search, `${key}: Enter mở đúng ${want.pathname}${want.search} (thực ${url.pathname}${url.search})`);
    }
  }
  data[`${key}|errs`] = errs;
  console.log(`   ${key} lỗi JS: ${errs.length}${errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''}`);
  if (MODE === 'after') { const be = before?.[`${key}|errs`] || []; const nu = errs.filter((e) => !be.includes(e)); ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`); }
  await b.close();
}
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify(data, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
