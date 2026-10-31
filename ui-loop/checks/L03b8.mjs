// L03b8 (vòng 64, 31/10/2026 — chạy lại: node ui-loop/checks/L03b8.mjs before|after [khung,khung]).
// Việc: gỡ Font Awesome ở TRANG KẾT QUẢ SOI DA / KHẢO SÁT (/ai-skin-quiz-results): templates/page.ai-skin-quiz-results.bwt
// — thay bằng ui_icon size 'em' trong <i> bọc cũ; icon do JS dựng lấy SVG từ <template data-res-ic>.
// 4 trạng thái: 'empty' (thiết bị trống — khối chưa có hồ sơ), 'scan' (gieo kết quả soi da như tests/portal/skin-result-profile.spec.js),
// 'open' (scan + bấm «Xem phân tích chi tiết» nếu nút hiện — mobile), 'quiz' (gieo kết quả khảo sát như tests/portal/cart-skin-plan.spec.js).
// Ảnh: ui-loop/evidence/L03b8/<mode>-<trình duyệt>-<khung>-<trạng thái|vùng>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b8';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const BASE = 'http://localhost:3000';
const URL_ = '/ai-skin-quiz-results';
const ZONES = ['.pc-result-page'];
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

// Kết quả mẫu (giữ cố định để before/after giống nhau) — saved_at cố định 31/10/2026 9:00.
const SAVED = new Date(2026, 9, 31, 9, 0).getTime();
const SCAN = { saved_at: SAVED, scores: { acne: { raw_score: 0.8, ui_score: 40, level: 'Cao' }, pigmentation: { raw_score: 0.2, ui_score: 85, level: 'Thấp' }, wrinkles: { raw_score: 0.1, ui_score: 90, level: 'Thấp' }, redness: { raw_score: 0.3, ui_score: 75, level: 'Vừa' }, pores: { raw_score: 0.4, ui_score: 70, level: 'Vừa' } }, primary_concern: 'acne', regimen: [], recommended_products: [] };
const QUIZ = { pc_quiz_skin_type: 'aging', pc_quiz_saved_at: String(SAVED), pc_quiz_result: JSON.stringify({ tier: 4, case_id: 'CASE_3', red_flag: '', top_skin_type: 'aging', safety_flags: ['pregnancy'], excluded_actives: ['retinoid', 'bha', 'aha', 'cysteamine'] }) };

const measure = (p, zones) => p.evaluate((zones) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) !== false; };
  const out = []; let fa = 0;
  for (const z of document.querySelectorAll(zones.join(', '))) {
    for (const i of z.querySelectorAll('i')) {
      const isFa = /(^|\s)fa-|(^|\s)fa[srb](\s|$)/.test(i.className); if (isFa) fa++;
      const svg = i.querySelector(':scope > svg');
      if (!isFa && !svg) continue;
      const t = svg || i; let r = t.getBoundingClientRect(); const par = i.parentElement; const pr = par.getBoundingClientRect();
      // Lần 1 (vòng 64): <i> FA là con flex bị kéo giãn (vd .pc-plan__notes li, dải lưu ý) ⇒ hộp <i> cao hơn glyph; glyph ::before nằm ở dòng
      // đầu (đầu hộp), không ở giữa. Đo hộp glyph = dòng đầu (line-height) tính từ mép trên nội dung — trừ khi <i> là flex (glyph căn giữa).
      // Lần 1b: hộp <i> còn bị kéo NGANG (cột lưới 28px) hoặc là ô tròn inline-flex 38px ⇒ đo glyph thật: dựng span ẩn cùng font/cỡ/ký tự ::before
      // (glyph FA cao 1em), đặt theo căn lề thực tế (flex ⇒ giữa; còn lại ⇒ mép trái nội dung theo text-align, dòng đầu).
      if (isFa) { const c = getComputedStyle(i); const cb = getComputedStyle(i, '::before'); const fs = parseFloat(cb.fontSize || c.fontSize); const lh = parseFloat(c.lineHeight) || fs;
        const s = document.createElement('span'); s.textContent = (cb.content || '').replace(/^"|"$/g, '');
        s.style.cssText = `position:absolute;left:-9999px;top:0;font-family:${cb.fontFamily};font-weight:${cb.fontWeight};font-size:${cb.fontSize};line-height:1;white-space:nowrap`;
        document.body.appendChild(s); const gw = s.getBoundingClientRect().width || r.width; s.remove();
        const pl = parseFloat(c.paddingLeft) + parseFloat(c.borderLeftWidth), pr_ = parseFloat(c.paddingRight) + parseFloat(c.borderRightWidth), pt = parseFloat(c.paddingTop) + parseFloat(c.borderTopWidth), pb = parseFloat(c.paddingBottom) + parseFloat(c.borderBottomWidth);
        const cw = r.width - pl - pr_, chh = r.height - pt - pb;
        if (/flex|grid/.test(c.display)) r = { x: r.x + pl + (cw - gw) / 2, y: r.y + pt + (chh - fs) / 2, width: gw, height: fs };
        else { const al = /center/.test(c.textAlign) ? (cw - gw) / 2 : /right|end/.test(c.textAlign) ? cw - gw : 0; const line = Math.min(chh, Math.max(lh, fs)); r = { x: r.x + pl + al, y: r.y + pt + (line - fs) / 2, width: gw, height: fs }; } }
      const shapes = svg ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')] : [];
      const filled = shapes.filter((e) => getComputedStyle(e).fill !== 'none').length;
      const where = (par.className && String(par.className).split(' ')[0]) || par.tagName.toLowerCase();
      out.push({ zone: where, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|fa[srb]\s+|inline-block\s*|leading-none\s*/g, '').trim(), vis: vis(t) && vis(i),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
        filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
    }
  }
  const faPage = [...document.querySelectorAll('i')].filter((i) => /(^|\s)fa-|(^|\s)fa[srb](\s|$)/.test(i.className) && !i.closest('header.header, .site-header, footer, #footer, .pc-bottom-nav, .pc-bottomnav, .main-widget, .site-topbar, [class*="topbar"], .ajaxcart, #dev-toolbar, .breadcrumb, .bread-crumb')).map((i) => i.className);
  return { icons: out, fa, faPage, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
}, zones);

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const compare = (key, bm, m, checkH) => {
  const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
  ok(av.length >= bv.length, `${key}: icon nhìn thấy before ${bv.length} → after ${av.length}`);
  let worst = 0, worstK = '', minR = 9, maxR = 0, parD = 0, parK = '', colD = 0, colK = '', rK = '';
  bv.forEach((x, i) => { const y = av[i]; if (!y) return;
    const d = Math.hypot(x.rx - y.rx, x.ry - y.ry); if (d > worst) { worst = d; worstK = x.zone + ' ' + x.cls; }
    const pd = Math.max(Math.abs(x.pw - y.pw), Math.abs(x.ph - y.ph)); if (pd > parD) { parD = pd; parK = x.zone + ' ' + x.cls; }
    const rr = (y.h || 0.01) / (x.h || 0.01); if (rr < minR) { minR = rr; rK = x.zone; } maxR = Math.max(maxR, rr);
    const a = rgb(x.color), b = rgb(y.color); const cd = Math.max(...a.map((v, k) => Math.abs(v - b[k]))); if (cd > colD) { colD = cd; colK = `${x.zone} ${x.cls} ${x.color} → ${y.color}`; } });
  // Tim tô đặc trong nút yêu thích = heart-filled (thay FA solid heart) — chủ đích, không phải icon nét bị tô.
  const badFill = av.filter((y) => y.filled && !(y.zone === 'pc-plan-card__wish' && y.shapes === 1)).map((y) => y.zone + ' ' + y.cls);
  const badColor = av.filter((y) => y.stroke && y.stroke !== y.color).map((y) => `${y.zone} stroke ${y.stroke} ≠ ${y.color}`);
  console.log(`   ${key}: lệch tâm lớn nhất ${worst.toFixed(1)}px (${worstK}) · đổi cỡ phần tử cha lớn nhất ${parD.toFixed(1)}px (${parK}) · tỉ lệ cao icon ${minR.toFixed(2)} (${rK})–${maxR.toFixed(2)} · màu lệch ${colD} (${colK}) · cao trang ${bm.docH} → ${m.docH}`);
  bv.forEach((x, i) => { const y = av[i] || {}; console.log(`      ${x.zone} [${x.cls}] ${x.w}×${x.h} @${x.rx},${x.ry} cha ${x.pw}×${x.ph} → [${y.cls}] ${y.w}×${y.h} @${y.rx},${y.ry} cha ${y.pw}×${y.ph} màu ${y.color} tô ${y.filled}/${y.shapes}`); });
  ok(worst <= 4 || bv.length === 0, `${key}: lệch tâm icon trong phần tử cha ≤ 4px (đo ${worst.toFixed(1)})`);
  ok(parD <= 4 || bv.length === 0, `${key}: cỡ phần tử chứa icon đổi ≤ 4px (đo ${parD.toFixed(1)})`);
  ok(bv.length === 0 || (minR >= 0.6 && maxR <= 1.6), `${key}: cỡ icon 60–160 % before (${minR.toFixed(2)}–${maxR.toFixed(2)})`);
  ok(colD <= 8, `${key}: màu icon = màu glyph cũ (ΔRGB ${colD})`);
  ok(badFill.length === 0, `${key}: icon nét bị CSS cũ tô đặc = ${badFill.length}${badFill.length ? ' — ' + badFill.slice(0, 3).join(', ') : ''}`);
  ok(badColor.length === 0, `${key}: icon vẽ bằng currentColor = ${av.length - badColor.length}/${av.length}${badColor.length ? ' — ' + badColor.slice(0, 2).join(', ') : ''}`);
  if (checkH) ok(Math.abs(bm.docH - m.docH) <= 4, `${key}: cao trang lệch ${Math.abs(bm.docH - m.docH)}px ≤ 4`);
};

const shot = async (p, sel, file) => {
  const loc = p.locator(sel).first(); if (!(await loc.count()) || !(await loc.isVisible())) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(200);
  await loc.screenshot({ path: file }).catch(() => {}); return true;
};

const open = async (b, opt, seed) => {
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  await ctx.addInitScript(([seed, scan, quiz]) => {
    window.PharmaCrmIntakeConfig = { enabled: false, endpoint: '', timeout_ms: '10000' };
    if (seed === 'scan') localStorage.setItem('pcr:pc_skin_scan_result', JSON.stringify({ v: scan, exp: Date.now() + 3600e3 }));
    if (seed === 'quiz') Object.entries(quiz).forEach(([k, v]) => sessionStorage.setItem(k, v));
  }, [seed, JSON.stringify(SCAN), QUIZ]);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  await p.goto(BASE + URL_, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(1800);
  return { ctx, p, errs };
};

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const key = `${brn}-${fr}`;
  const errsAll = [];
  // 1) empty
  { const { ctx, p, errs } = await open(b, opt, 'none');
    data[`${key}-empty`] = await measure(p, ZONES);
    await shot(p, '[data-result-empty-view]', `${OUT}/${MODE}-${brn}-${fr}-empty.png`);
    await shot(p, '[data-result-disclaimer]', `${OUT}/${MODE}-${brn}-${fr}-disclaimer.png`);
    await shot(p, '.pc-result-empty__actions', `${OUT}/${MODE}-${brn}-${fr}-empty-actions.png`);
    // Bấm X thanh cảnh báo ⇒ ẩn
    const closeBtn = p.locator('[data-result-empty-close]');
    let closed = null; if (await closeBtn.isVisible().catch(() => false)) { await closeBtn.click(); await p.waitForTimeout(200); closed = await p.evaluate(() => document.querySelector('[data-result-empty-warning]').hidden); }
    data[`${key}|emptyClose`] = closed;
    errsAll.push(...errs); await ctx.close(); }
  // 2) scan (+ open)
  { const { ctx, p, errs } = await open(b, opt, 'scan');
    data[`${key}-scan`] = await measure(p, ZONES);
    const st = await p.evaluate(() => ({ demo: document.getElementById('pcQuizResultsRoot')?.dataset.demo, badge: document.querySelector('[data-crm-status-badge]')?.textContent.trim(), cards: document.querySelectorAll('.pc-plan-card').length, stages: document.querySelectorAll('.pc-plan-stage').length, articles: document.querySelectorAll('[data-sapo-articles-grid] article').length, scores: document.querySelectorAll('[data-scan-score]').length, toggle: (() => { const t = document.querySelector('[data-result-details-toggle]'); return t && t.getBoundingClientRect().height > 0; })() }));
    data[`${key}|scanState`] = st;
    for (const [sel, n] of [['.pc-result-overview', 'overview'], ['.pc-plan__head', 'plan-head'], ['.pc-plan__scores', 'scores'], ['.pc-plan-stage', 'stage'], ['.pc-plan__aside', 'aside'], ['[data-stage-section]', 'stage-cards'], ['[data-result-products-section]', 'products'], ['[data-result-blogs-section]', 'blogs'], ['.pc-result-actions', 'actions'], ['[data-result-details-toggle]', 'toggle'], ['[data-profile-prompt]', 'prompt']]) await shot(p, sel, `${OUT}/${MODE}-${brn}-${fr}-scan-${n}.png`);
    if (['390', '1440', 'iphone13'].includes(fr)) await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-scan-full.png`, fullPage: true });
    // Bàn phím: focus link «Đặt lịch» trong khối hành động rồi Tab ⇒ hàng kế tiếp; ghi viền focus.
    await p.locator('.pc-result-actions__cta--outline').focus();
    await p.keyboard.press('Tab');
    const kb = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { cls: String(a.className).split(' ')[0], ow: c.outlineStyle === 'none' ? 0 : parseFloat(c.outlineWidth), bs: c.boxShadow.slice(0, 40) }; });
    data[`${key}|kb`] = kb;
    // Nút sau của dải SP giai đoạn (nếu có): bấm ⇒ dải cuộn
    const nx = p.locator('[data-plan-next]').first(); let slid = null;
    if (await nx.isVisible().catch(() => false)) { const tr = p.locator('.pc-plan-stage__track').first(); const x0 = await tr.evaluate((e) => e.scrollLeft); await nx.click(); await p.waitForTimeout(700); slid = (await tr.evaluate((e) => e.scrollLeft)) > x0; }
    data[`${key}|slide`] = slid;
    // Mobile: bấm «Xem phân tích chi tiết» ⇒ mở, chevron xoay
    const tg = p.locator('[data-result-details-toggle]');
    let opened = null;
    if (await tg.isVisible().catch(() => false)) {
      await tg.click(); await p.waitForTimeout(400);
      opened = await p.evaluate(() => ({ exp: document.querySelector('[data-result-details-toggle]').getAttribute('aria-expanded'), rot: getComputedStyle(document.querySelector('.pc-result-details-toggle__chev')).transform }));
      data[`${key}-open`] = await measure(p, ZONES);
      await shot(p, '[data-result-details-toggle]', `${OUT}/${MODE}-${brn}-${fr}-open-toggle.png`);
      await shot(p, '.pc-plan__scores', `${OUT}/${MODE}-${brn}-${fr}-open-scores.png`);
      await shot(p, '.pc-plan__aside', `${OUT}/${MODE}-${brn}-${fr}-open-aside.png`);
    }
    data[`${key}|opened`] = opened;
    console.log(`${key} scan: ${JSON.stringify(st)} · Tab ${JSON.stringify(kb)} · trượt ${slid} · mở chi tiết ${JSON.stringify(opened)}`);
    errsAll.push(...errs); await ctx.close(); }
  // 3) quiz
  { const { ctx, p, errs } = await open(b, opt, 'quiz');
    data[`${key}-quiz`] = await measure(p, ZONES);
    const st = await p.evaluate(() => ({ demo: document.getElementById('pcQuizResultsRoot')?.dataset.demo, alert: !document.querySelector('[data-quiz-alert]')?.hidden, cards: document.querySelectorAll('.pc-plan-card').length }));
    data[`${key}|quizState`] = st;
    await shot(p, '.pc-plan', `${OUT}/${MODE}-${brn}-${fr}-quiz-plan.png`);
    if (['390', '1440'].includes(fr)) await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-quiz-full.png`, fullPage: true });
    console.log(`${key} quiz: ${JSON.stringify(st)}`);
    errsAll.push(...errs); await ctx.close(); }
  const sts = ['empty', 'scan', 'open', 'quiz'].filter((s) => data[`${key}-${s}`]);
  console.log(`${key}: FA ${sts.map((s) => s + ' ' + data[`${key}-${s}`].fa).join(' / ')} · ngoài vùng ${sts.map((s) => data[`${key}-${s}`].faPage.length).join('/')} · icon nhìn thấy ${sts.map((s) => data[`${key}-${s}`].icons.filter((x) => x.vis).length).join('/')} · X cảnh báo ${data[`${key}|emptyClose`]} · lỗi JS ${errsAll.length}${errsAll.length ? ' — ' + errsAll.slice(0, 2).join(' | ') : ''}`);
  if (MODE === 'after') {
    for (const st of sts) {
      const m = data[`${key}-${st}`];
      ok(m.fa === 0 && m.faPage.length === 0, `${key}-${st}: <i fa-> trong vùng = ${m.fa}, ngoài vùng (trừ header/footer/breadcrumb) = ${m.faPage.length}${m.faPage.length ? ' — ' + m.faPage.slice(0, 3).join(' | ') : ''}`);
      ok(m.pcErr === 0, `${key}-${st}: PC-ERROR ui_icon = ${m.pcErr}`);
      if (before?.[`${key}-${st}`]) compare(`${key}-${st}`, before[`${key}-${st}`], m, true);
      else ok(st !== 'open' || !before?.[`${key}|opened`], `${key}-${st}: có số đo before`);
    }
    for (const k of ['emptyClose', 'scanState', 'quizState', 'kb', 'slide', 'opened']) {
      const bv = JSON.stringify(before?.[`${key}|${k}`]), av = JSON.stringify(data[`${key}|${k}`]);
      ok(bv === av, `${key}: ${k} before ${bv} = after ${av}`);
    }
    const be = before?.[`${key}|errs`] || []; const nu = errsAll.filter((e) => !be.includes(e));
    ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`);
  }
  data[`${key}|errs`] = errsAll;
  await b.close();
}
const prev = process.argv[3] && fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify({ ...prev, ...data }, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
