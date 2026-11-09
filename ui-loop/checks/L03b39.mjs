// L03b39 (vòng 108, 09/11/2026 — chạy lại: node ui-loop/checks/L03b39.mjs before|after [khung,khung]).
// Việc: dấu tick bước «xong» ở thanh tiến trình /order-lookup dùng glyph Font Awesome trong CSS nội tuyến
//   (.pl-node.done .pl-dot::after content "\f00c") → ui_icon check size em (lấy từ <template id="pl-check-icon">, JS chèn vào chấm done).
// Bước «xong» chỉ dựng khi tra cứu thành công ⇒ giả lập phản hồi GAS (script.google.com) bằng route Playwright — không sửa dev-server.
// Kịch bản: bấm «Tìm kiếm» trống ⇒ toast; gõ mã + SĐT ⇒ DELIVERING (3 xong, 1 đang), DELIVERED (4 xong, 1 đang), CANCELLED (2 xong, 3 lỗi).
// Ảnh: ui-loop/evidence/L03b39/<mode>-<trình duyệt>-<khung>-<kịch bản>.png (+ -rail.png cận thanh tiến trình)
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b39';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const URL_ = 'http://localhost:3000/order-lookup';
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
const base = { success: true, product_name: 'Serum Vitamin C 15%', customer_name: 'Nguyễn Thị Mẫu', customer_phone: '0901234567',
  created_at: '2026-11-08T09:30:00+07:00', payment_method: 'VIETQR', total_amount: 550000, pay_amount: 550000 };
const SCEN = {
  delivering: { ...base, order_id: 'PC-20261108-001', status: 'PAID', fulfillment_status: 'delivering', carrier: 'GHN', tracking_code: 'LGHV3K52A78' },
  delivered: { ...base, order_id: 'PC-20261108-002', status: 'PAID', fulfillment_status: 'delivered', carrier: 'GHN', tracking_code: 'LGHV3K52A79' },
  cancelled: { ...base, order_id: 'PC-20261108-003', status: 'CANCELLED', fulfillment_status: 'cancelled' },
};
const EXPECT = { delivering: 3, delivered: 4, cancelled: 2 };
const before = MODE === 'after' && fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')) : null;
const data = {}; const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

const measure = (p) => p.evaluate(() => {
  const nodes = [];
  for (const nd of document.querySelectorAll('#pl-rail .pl-node')) {
    const dot = nd.querySelector('.pl-dot'); const dr = dot.getBoundingClientRect();
    const af = getComputedStyle(dot, '::after');
    const hasAfter = af.content && af.content !== 'none' && af.content !== 'normal';
    const faAfter = hasAfter && /Font Awesome/i.test(af.fontFamily);
    const svg = dot.querySelector('svg');
    let tick = null;
    if (faAfter) {
      const s = document.createElement('span'); s.textContent = af.content.replace(/^"|"$/g, '');
      s.style.cssText = `position:absolute;left:-9999px;top:0;font-family:${af.fontFamily};font-weight:${af.fontWeight};font-size:${af.fontSize};line-height:1;white-space:nowrap`;
      document.body.appendChild(s); const gw = s.getBoundingClientRect().width; s.remove();
      tick = { kind: 'fa', w: +gw.toFixed(1), h: +parseFloat(af.fontSize).toFixed(1), dx: 0, dy: 0, color: af.color };
    } else if (svg) {
      const r = svg.getBoundingClientRect(); const wrap = svg.closest('i') || svg;
      if (r.width > 0 && r.height > 0) {
        tick = { kind: 'svg', w: +r.width.toFixed(1), h: +r.height.toFixed(1),
          dx: +(r.x + r.width / 2 - (dr.x + dr.width / 2)).toFixed(1), dy: +(r.y + r.height / 2 - (dr.y + dr.height / 2)).toFixed(1),
          color: getComputedStyle(svg).color, aria: wrap.getAttribute('aria-hidden') };
      }
    }
    const lbl = nd.querySelector('.pl-nlbl');
    nodes.push({ cls: nd.className.replace('pl-node', '').trim() || '-', dot: `${dr.width.toFixed(1)}x${dr.height.toFixed(1)}`,
      dotBg: getComputedStyle(dot).backgroundColor, other: !faAfter && hasAfter ? af.content : '',
      label: lbl.textContent.trim(), lblColor: getComputedStyle(lbl).color, tick });
  }
  let faPseudo = 0;
  for (const e of document.querySelectorAll('body *')) for (const ps of ['::before', '::after']) {
    const c = getComputedStyle(e, ps); if (c.content && c.content !== 'none' && c.content !== 'normal' && /Font Awesome|FontAwesome/i.test(c.fontFamily)) faPseudo++;
  }
  const rr = document.querySelector('.pl-rail').getBoundingClientRect();
  return { nodes, faPseudo, rail: `${rr.width.toFixed(1)}x${rr.height.toFixed(1)}`, docH: document.documentElement.scrollHeight,
    pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length,
    title: document.getElementById('pl-status-title').textContent.trim() };
});

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const key = `${brn}-${fr}`; data[key] = {};
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  let scen = 'delivering';
  await p.route('**/script.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SCEN[scen]) }));
  await p.goto(URL_, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(800);
  // Tab từ ô nhập ⇒ phần tử kế tiếp
  await p.focus('#pl-primary'); await p.keyboard.press('Tab');
  data[key].tab = await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  await p.keyboard.press('Shift+Tab');
  data[key].shiftTab = await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  // Bấm trống ⇒ toast
  await p.click('#pl-submit');
  data[key].emptyToast = await p.$eval('#pl-toast', (e) => (e.classList.contains('show') ? e.textContent.trim() : ''));
  for (const sc of Object.keys(SCEN)) {
    scen = sc;
    await p.fill('#pl-primary', SCEN[sc].order_id);
    await p.fill('#pl-secondary', '0901 234 567');
    if (sc === 'delivered') await p.press('#pl-primary', 'Enter'); else await p.click('#pl-submit');
    await p.waitForFunction(() => getComputedStyle(document.getElementById('pl-result')).display !== 'none', null, { timeout: 8000 });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    data[key][sc] = await measure(p);
    await p.locator('.pl-rail').scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${sc}.png` });
    await p.locator('.pl-rail').screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${sc}-rail.png` }).catch(() => {});
  }
  data[key].errs = errs;
  await b.close();

  const d = data[key];
  console.log(`\n[${key}] trống ⇒ toast "${d.emptyToast}" · Tab ⇒ ${d.tab} · Shift+Tab ⇒ ${d.shiftTab}`);
  for (const sc of Object.keys(SCEN)) {
    const m = d[sc];
    console.log(`  ${sc}: «${m.title}» rail ${m.rail} · cao trang ${m.docH} · faPseudo ${m.faPseudo} · PC-ERROR ${m.pcErr}`);
    m.nodes.forEach((s, i) => console.log(`    nút ${i + 1} [${s.cls}] chấm ${s.dot} ${s.other} «${s.label}» tick: ${s.tick ? `${s.tick.kind} ${s.tick.w}×${s.tick.h} lệch (${s.tick.dx},${s.tick.dy}) ${s.tick.color}` : '—'}`));
  }
  if (MODE === 'after') {
    const bf = before?.[key];
    ok(!!bf, `${key}: có số đo before`);
    if (!bf) continue;
    ok(d.emptyToast && d.emptyToast === bf.emptyToast, `${key}: bấm trống ⇒ toast «${d.emptyToast}» = before`);
    ok(d.tab === bf.tab && d.shiftTab === bf.shiftTab, `${key}: Tab ${d.tab} / Shift+Tab ${d.shiftTab} = before`);
    for (const sc of Object.keys(SCEN)) {
      const m = d[sc], o = bf[sc];
      const nA = m.nodes.filter((s) => s.tick).length, nB = o.nodes.filter((s) => s.tick).length;
      ok(nA === nB && nA === EXPECT[sc], `${key} ${sc}: số tick nhìn thấy ${nA} = before ${nB} (kỳ vọng ${EXPECT[sc]})`);
      ok(m.faPseudo === 0, `${key} ${sc}: 0 glyph Font Awesome (pseudo ${m.faPseudo}, before ${o.faPseudo})`);
      ok(m.pcErr === 0, `${key} ${sc}: PC-ERROR 0`);
      m.nodes.forEach((s, i) => {
        const t = s.tick, tb = o.nodes[i].tick, on = o.nodes[i];
        ok(s.cls === on.cls && s.dot === on.dot && s.label === on.label && s.other === on.other, `${key} ${sc} nút ${i + 1}: trạng thái/chấm ${s.dot}/ký hiệu «${s.other}»/nhãn = before`);
        ok(s.dotBg === on.dotBg && s.lblColor === on.lblColor, `${key} ${sc} nút ${i + 1}: màu chấm/nhãn = before`);
        if (t && tb) {
          ok(Math.abs(t.h - tb.h) <= 1 && Math.abs(t.w - tb.w) <= 2, `${key} ${sc} nút ${i + 1}: tick ${t.w}×${t.h} ~ glyph cũ ${tb.w}×${tb.h} (cao lệch ≤ 1, rộng ≤ 2)`);
          ok(Math.abs(t.dx) <= 2 && Math.abs(t.dy) <= 2, `${key} ${sc} nút ${i + 1}: lệch tâm trong chấm (${t.dx},${t.dy}) ≤ 2px`);
          const dc = Math.max(...rgb(t.color).map((v, k) => Math.abs(v - rgb(tb.color)[k])));
          ok(dc <= 10, `${key} ${sc} nút ${i + 1}: màu tick ΔRGB ${dc} ≤ 10`);
          ok(t.aria === 'true', `${key} ${sc} nút ${i + 1}: tick aria-hidden`);
        }
      });
      ok(Math.abs(m.docH - o.docH) <= 2, `${key} ${sc}: cao trang ${m.docH} vs ${o.docH} (≤ 2px)`);
      const [rw, rh] = m.rail.split('x').map(Number), [ow, oh] = o.rail.split('x').map(Number);
      ok(Math.abs(rw - ow) <= 2 && Math.abs(rh - oh) <= 2, `${key} ${sc}: thanh tiến trình ${m.rail} vs ${o.rail} (≤ 2px)`);
    }
    ok(d.errs.length === 0, `${key}: 0 lỗi JS ${d.errs.join(' | ')}`);
  }
}
if (MODE === 'before') fs.writeFileSync(`${OUT}/before.json`, JSON.stringify(data, null, 1));
else fs.writeFileSync(`${OUT}/after.json`, JSON.stringify(data, null, 1));
console.log(`\n${MODE}: ${fails.length} ✗`);
process.exit(fails.length ? 1 : 0);
