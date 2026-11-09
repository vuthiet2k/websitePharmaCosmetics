// L03b40 (vòng 110, 09/11/2026 — chạy lại: node ui-loop/checks/L03b40.mjs before|after [khung,khung]).
// Việc: tay kéo so sánh trước/sau `.sh2-ba-slider__handle` ở templates/page.indexskinhealthy.bwt — bỏ glyph Font Awesome `\f337`
//   (pseudo ::after) → icon SVG ui_icon (move-horizontal) trong phần tử thật `.sh2-ba-slider__knob`.
// Dữ liệu mẫu local `?ba=demo` (dev-server.js + preview-mock.js BA_DEMO_SETTINGS) ⇒ 2 thanh kéo; trang không tham số ⇒ khối ẩn.
// Đo: số pseudo dùng font FA; hộp icon (before = span đo thử cùng font/cỡ glyph FA ), tâm icon so vòng tròn, màu, vòng tròn
//   36×36 + vị trí, kéo/chạm tới 25% ⇒ tay kéo theo điểm kéo, nhãn Trước/Sau, cao trang, HTML khối (trang không tham số), lỗi JS.
// Ảnh: ui-loop/evidence/L03b40/<mode>-<trình duyệt>-<khung>[-drag].png (cận thanh kéo đầu tiên)
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b40';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const BASE = 'http://localhost:3000/skin-health-beauty';
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
const near = (a, b, t) => Math.abs(a - b) <= t;

const measure = (p) => p.evaluate(() => {
  const r1 = (v) => +(+v).toFixed(1);
  // Pseudo-element dùng font Font Awesome trên cả trang
  let faPseudo = 0;
  for (const el of document.querySelectorAll('body *')) for (const ps of ['::before', '::after']) {
    const c = getComputedStyle(el, ps); if (c.content && c.content !== 'none' && c.content !== 'normal' && /Font Awesome/i.test(c.fontFamily)) faPseudo++;
  }
  const sliders = [...document.querySelectorAll('[data-ba-slider]')].map((s) => {
    const sr = s.getBoundingClientRect();
    const h = s.querySelector('.sh2-ba-slider__handle'); const hr = h.getBoundingClientRect();
    const knob = h.querySelector('.sh2-ba-slider__knob');
    const pa = getComputedStyle(h, '::after');
    let circle, icon;
    if (knob) {
      const kr = knob.getBoundingClientRect(); const kc = getComputedStyle(knob);
      circle = { w: r1(kr.width), h: r1(kr.height), cx: r1(kr.x + kr.width / 2 - sr.x), cy: r1(kr.y + kr.height / 2 - sr.y), bg: kc.backgroundColor, radius: kc.borderRadius, shadow: kc.boxShadow, src: 'knob' };
      const svgs = [...knob.querySelectorAll('svg')]; const sv = svgs[0]; const ir = sv?.getBoundingClientRect();
      icon = { n: svgs.length, vis: svgs.filter((x) => { const b = x.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).length,
        w: ir ? r1(ir.width) : 0, h: ir ? r1(ir.height) : 0, cx: ir ? r1(ir.x + ir.width / 2 - sr.x) : 0, cy: ir ? r1(ir.y + ir.height / 2 - sr.y) : 0,
        color: sv ? getComputedStyle(sv).color : '', stroke: sv ? getComputedStyle(sv).stroke : '', ariaHidden: sv?.closest('[aria-hidden="true"]') ? 1 : 0,
        path: sv?.innerHTML.slice(0, 80) || '' };
    } else {
      // Vòng tròn = ::after (translate -50% quanh tâm thanh 2px) ⇒ tâm = tâm thanh; glyph đo bằng span thử cùng font/cỡ
      const pw = parseFloat(pa.width), ph = parseFloat(pa.height);
      circle = { w: r1(pw), h: r1(ph), cx: r1(hr.x + hr.width / 2 - sr.x), cy: r1(hr.y + hr.height / 2 - sr.y), bg: pa.backgroundColor, radius: pa.borderRadius, shadow: pa.boxShadow, src: '::after' };
      const t = document.createElement('span');
      t.textContent = ''; Object.assign(t.style, { position: 'absolute', left: '0', top: '0', fontFamily: pa.fontFamily, fontWeight: pa.fontWeight, fontSize: pa.fontSize, lineHeight: pa.lineHeight, whiteSpace: 'nowrap' });
      document.body.appendChild(t); const tr = t.getBoundingClientRect(); t.remove();
      // Hộp glyph = bề rộng advance × 1em (hộp dòng ${tr.height} là line-height); mực glyph đo bằng canvas measureText (tham khảo)
      const cv = document.createElement('canvas').getContext('2d'); cv.font = `${pa.fontWeight} ${pa.fontSize} ${pa.fontFamily}`; const mt = cv.measureText('');
      const ink = `mực ${r1(mt.actualBoundingBoxLeft + mt.actualBoundingBoxRight)}×${r1(mt.actualBoundingBoxAscent + mt.actualBoundingBoxDescent)} · hộp dòng ${r1(tr.height)}`;
      icon = { n: pa.content !== 'none' ? 1 : 0, vis: 1, w: r1(tr.width), h: r1(parseFloat(pa.fontSize)), ink, cx: circle.cx, cy: circle.cy, color: pa.color, stroke: '', ariaHidden: 1, path: `glyph ${pa.content} ${pa.fontFamily} ${pa.fontSize} · ${ink}` };
    }
    const labels = [...s.querySelectorAll('.sh2-ba-slider__label')].map((l) => { const b = l.getBoundingClientRect(); return `${l.textContent.trim()}@${r1(b.x - sr.x)},${r1(b.y - sr.y)} ${r1(b.width)}×${r1(b.height)}`; });
    return { sw: r1(sr.width), sh: r1(sr.height), handleX: r1(hr.x + hr.width / 2 - sr.x), handleW: r1(hr.width), handleH: r1(hr.height), circle, icon, labels, fontSize: getComputedStyle(knob || h).fontSize };
  });
  const sec = document.querySelector('[data-ba-slider]')?.closest('section');
  return { sliders, faPseudo, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR/g) || []).length,
    baSecs: document.querySelectorAll('[data-ba-slider]').length, secHtml: sec ? sec.outerHTML.length : 0 };
});

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  for (const pg of ['demo', 'plain']) {
    const key = `${brn}-${fr}-${pg}`;
    const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await p.goto(pg === 'demo' ? `${BASE}?ba=demo` : BASE, { waitUntil: 'load', timeout: 60000 });
    await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
    await p.waitForTimeout(900);
    let m; try { m = await measure(p); } catch (e) { await p.waitForLoadState('load'); await p.waitForTimeout(1500); m = await measure(p); }
    if (pg === 'demo' && m.sliders.length) {
      const loc = p.locator('[data-ba-slider]').first();
      await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
      await loc.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}.png` }).catch(() => {});
      // Kéo / chạm tới 25%
      const box = await loc.boundingBox();
      const tx = box.x + box.width * 0.25, ty = box.y + box.height / 2;
      if (opt.hasTouch || brn === 'webkit') await p.touchscreen.tap(tx, ty);
      else { await p.mouse.move(tx, ty); await p.mouse.down(); await p.mouse.up(); } // bấm chuột tại điểm (pointerdown ⇒ setPos); kéo ảnh gốc bị dragstart của <img> cắt ngang — có từ trước
      await p.waitForTimeout(250);
      const d = await measure(p);
      m.drag = { target: +(box.width * 0.25).toFixed(1), handleX: d.sliders[0].handleX, circleCx: d.sliders[0].circle.cx, iconCx: d.sliders[0].icon.cx };
      await loc.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-drag.png` }).catch(() => {});
    }
    m.errs = errs;
    data[key] = m;
    console.log(`${key}: thanh kéo ${m.baSecs} · pseudo FA ${m.faPseudo} · PC-ERROR ${m.pcErr} · cao trang ${m.docH} · lỗi JS ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
    m.sliders.forEach((s, k) => {
      console.log(`   #${k + 1} khung ${s.sw}×${s.sh} · thanh x=${s.handleX} ${s.handleW}×${s.handleH} · vòng ${s.circle.src} ${s.circle.w}×${s.circle.h} @${s.circle.cx},${s.circle.cy} nền ${s.circle.bg} bo ${s.circle.radius} bóng ${s.circle.shadow}`);
      console.log(`      icon ${s.icon.n} (thấy ${s.icon.vis}) ${s.icon.w}×${s.icon.h} @${s.icon.cx},${s.icon.cy} màu ${s.icon.color} nét ${s.icon.stroke} aria-hidden ${s.icon.ariaHidden} · ${s.icon.path}`);
      console.log(`      nhãn ${s.labels.join(' · ')} · cỡ chữ ${s.fontSize}`);
    });
    if (m.drag) console.log(`   kéo 25%: đích ${m.drag.target} · thanh ${m.drag.handleX} · vòng ${m.drag.circleCx} · icon ${m.drag.iconCx}`);
    if (MODE === 'after') {
      const bm = before?.[key];
      ok(m.faPseudo === 0, `${key}: pseudo font FA = 0 (${m.faPseudo}; before ${bm?.faPseudo})`);
      ok(m.pcErr === (bm?.pcErr ?? 0), `${key}: PC-ERROR ${m.pcErr} = before ${bm?.pcErr}`);
      ok(errs.length === 0, `${key}: 0 lỗi JS`);
      ok(bm && near(m.docH, bm.docH, 2), `${key}: cao trang ${m.docH} vs before ${bm?.docH}`);
      ok(bm && m.baSecs === bm.baSecs, `${key}: số thanh kéo ${m.baSecs} = before ${bm?.baSecs}`);
      if (pg === 'plain') ok(bm && m.secHtml === bm.secHtml, `${key}: không tham số — khối BA ${m.secHtml} = before ${bm?.secHtml} (ẩn)`);
      m.sliders.forEach((s, k) => {
        const bs = bm?.sliders?.[k]; if (!bs) { ok(false, `${key} #${k + 1}: thiếu before`); return; }
        ok(s.icon.n === 1 && s.icon.vis === 1, `${key} #${k + 1}: đúng 1 icon SVG nhìn thấy (${s.icon.n}/${s.icon.vis})`);
        ok(near(s.icon.w, bs.icon.w, 2) && near(s.icon.h, bs.icon.h, 2), `${key} #${k + 1}: icon ${s.icon.w}×${s.icon.h} vs glyph ${bs.icon.w}×${bs.icon.h} (±2)`);
        ok(near(s.icon.cx, s.circle.cx, 1) && near(s.icon.cy, s.circle.cy, 1), `${key} #${k + 1}: tâm icon lệch vòng ${(s.icon.cx - s.circle.cx).toFixed(1)},${(s.icon.cy - s.circle.cy).toFixed(1)} (≤ 1)`);
        ok(s.icon.color === bs.icon.color, `${key} #${k + 1}: màu ${s.icon.color} = before ${bs.icon.color}`);
        ok(s.icon.ariaHidden === 1, `${key} #${k + 1}: aria-hidden`);
        ok(s.circle.w === bs.circle.w && s.circle.h === bs.circle.h && s.circle.bg === bs.circle.bg && s.circle.radius === bs.circle.radius && s.circle.shadow === bs.circle.shadow,
          `${key} #${k + 1}: vòng ${s.circle.w}×${s.circle.h} ${s.circle.bg} ${s.circle.radius} = before ${bs.circle.w}×${bs.circle.h} ${bs.circle.bg} ${bs.circle.radius}`);
        ok(near(s.circle.cx, bs.circle.cx, 0.5) && near(s.circle.cy, bs.circle.cy, 0.5), `${key} #${k + 1}: vị trí vòng @${s.circle.cx},${s.circle.cy} vs ${bs.circle.cx},${bs.circle.cy}`);
        ok(s.handleX === bs.handleX && s.handleH === bs.handleH && s.sw === bs.sw && s.sh === bs.sh, `${key} #${k + 1}: thanh/khung = before`);
        ok(s.labels.join('|') === bs.labels.join('|'), `${key} #${k + 1}: nhãn Trước/Sau = before`);
      });
      if (m.drag) {
        ok(near(m.drag.handleX, m.drag.target, 1.5) && near(m.drag.circleCx, m.drag.target, 1.5) && near(m.drag.iconCx, m.drag.target, 1.5),
          `${key}: kéo 25% — thanh ${m.drag.handleX} / vòng ${m.drag.circleCx} / icon ${m.drag.iconCx} vs đích ${m.drag.target} (before thanh ${bm?.drag?.handleX})`);
      }
    }
    await ctx.close();
  }
  await b.close();
}
if (MODE === 'before') fs.writeFileSync(`${OUT}/before.json`, JSON.stringify(data, null, 1));
else fs.writeFileSync(`${OUT}/after.json`, JSON.stringify(data, null, 1));
console.log(MODE === 'after' ? `KẾT QUẢ: ${fails.length ? fails.length + ' ✗' : 'ĐẠT'}` : 'Đã ghi before.json');
process.exit(MODE === 'after' && fails.length ? 1 : 0);
