// L03b7 (vòng 62, 31/10/2026 — chạy lại: node ui-loop/checks/L03b7.mjs before|after [khung,khung]).
// Việc: gỡ Font Awesome ở TRANG SOI DA AI / KHẢO SÁT (/ai-skin-quiz): page.ai-skin-quiz.bwt, skin_scan_camera.bwt, skin_profile_notice.bwt
// — thay bằng ui_icon size 'em' trong <i> bọc cũ; icon JS lấy SVG từ <template>.
// 3 trạng thái: 'cam' (tab camera — màn chờ), 'quiz' (tab khảo sát — câu 1), 'done' (bấm hết trả lời nhanh — thẻ kết quả + thanh hồ sơ).
// Ảnh: ui-loop/evidence/L03b7/<mode>-<trình duyệt>-<khung>-<trạng thái|vùng>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b7';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const URL_ = '/ai-skin-quiz';
const ZONES = ['#pcSkinScan', '#aiSkinChatApp', '[data-skin-profile-notice]'];
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

const measure = (p, zones) => p.evaluate((zones) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) !== false; };
  const out = []; let fa = 0;
  for (const z of document.querySelectorAll(zones.join(', '))) {
    for (const i of z.querySelectorAll('i')) {
      const isFa = /(^|\s)fa-|(^|\s)fas(\s|$)/.test(i.className); if (isFa) fa++;
      const svg = i.querySelector(':scope > svg');
      if (!isFa && !svg) continue;
      const t = svg || i; const r = t.getBoundingClientRect(); const par = i.parentElement; const pr = par.getBoundingClientRect();
      const shapes = svg ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')] : [];
      const filled = shapes.filter((e) => getComputedStyle(e).fill !== 'none').length;
      const where = (par.className && String(par.className).split(' ')[0]) || par.tagName.toLowerCase();
      out.push({ zone: where, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|fas\s*|inline-block\s*|leading-none\s*/g, '').trim(), vis: vis(t) && vis(i),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
        filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
    }
  }
  // Toàn trang ngoài header/footer chung (ngoài phạm vi việc): đếm <i fa-> còn lại trong vùng nội dung trang
  const faPage = [...document.querySelectorAll('i')].filter((i) => /(^|\s)fa-/.test(i.className) && !i.closest('header.header, .site-header, footer, #footer, .pc-bottom-nav, .pc-bottomnav, .main-widget, .site-topbar, [class*="topbar"], .ajaxcart, #dev-toolbar')).map((i) => i.className);
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
  const badFill = av.filter((y) => y.filled).map((y) => y.zone + ' ' + y.cls);
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

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const key = `${brn}-${fr}`;
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  // Mặc định /ai-skin-quiz mở tab khảo sát; ?tab=camera mở màn chờ camera (skin-camera.js initialMode).
  await p.goto(BASE + URL_ + '?tab=camera', { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(1500);
  // 1) tab camera — màn chờ
  const mCam = await measure(p, ZONES); data[`${key}-cam`] = mCam;
  await shot(p, '#pcSkinScan', `${OUT}/${MODE}-${brn}-${fr}-cam.png`);
  await shot(p, '.pc-skin-standby__trust', `${OUT}/${MODE}-${brn}-${fr}-trust.png`);
  await shot(p, '.pc-btn-start-pill', `${OUT}/${MODE}-${brn}-${fr}-start.png`);
  await shot(p, '.pc-mcam-bar', `${OUT}/${MODE}-${brn}-${fr}-mcam-bar.png`);
  if (['390', '1440', 'iphone13'].includes(fr)) await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-cam-full.png`, fullPage: true });
  // 2) tab khảo sát — câu 1
  await p.locator('[data-skin-mode="quiz"]').first().click();
  await p.waitForSelector('.quick-reply-chip', { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(600);
  const mQuiz = await measure(p, ZONES); data[`${key}-quiz`] = mQuiz;
  await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-quiz.png` });
  // Bàn phím: Tab tới nút gửi tin nhắn
  await p.locator('#chatTextInput').focus();
  await p.keyboard.press('Tab');
  const kb = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { id: a.id, ow: c.outlineStyle === 'none' ? 0 : parseFloat(c.outlineWidth), oc: c.outlineColor, bs: c.boxShadow.slice(0, 60) }; });
  await shot(p, '.chat-input-bar', `${OUT}/${MODE}-${brn}-${fr}-send-focus.png`);
  data[`${key}|kb`] = kb;
  // 3) bấm hết trả lời nhanh — chọn lựa chọn đầu tiên mỗi câu
  let n = 0;
  for (; n < 40; n++) {
    if (await p.locator('.diagnostic-result-card').count()) break;
    const chip = p.locator('.quick-reply-chip').first();
    try { await chip.waitFor({ state: 'visible', timeout: 6000 }); } catch { break; }
    if (await p.locator('.diagnostic-result-card').count()) break;
    await chip.click();
    await p.waitForTimeout(150);
  }
  await p.waitForSelector('.diagnostic-result-card', { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const result = await p.evaluate(() => { const c = document.querySelector('.diagnostic-result-card'); return c ? { alert: c.classList.contains('diagnostic-result-card--alert'), title: c.querySelector('.result-skin-title')?.textContent.trim().slice(0, 60) } : null; });
  data[`${key}|result`] = result; data[`${key}|answers`] = n;
  const mDone = await measure(p, ZONES); data[`${key}-done`] = mDone;
  await shot(p, '.diagnostic-result-card', `${OUT}/${MODE}-${brn}-${fr}-result.png`);
  await shot(p, '.chat-message-row.user-row', `${OUT}/${MODE}-${brn}-${fr}-usermsg.png`);
  await shot(p, '.quiz-phase-badge', `${OUT}/${MODE}-${brn}-${fr}-phase.png`);
  const notice = await p.evaluate(() => { const n = document.querySelector('[data-skin-profile-notice]'); return n ? !n.hidden : null; });
  if (notice) await shot(p, '[data-skin-profile-notice]', `${OUT}/${MODE}-${brn}-${fr}-notice.png`);
  let noticeClosed = null;
  if (notice) { await p.locator('[data-skin-profile-notice-close]').click(); await p.waitForTimeout(300); noticeClosed = await p.evaluate(() => document.querySelector('[data-skin-profile-notice]').hidden); }
  data[`${key}|notice`] = { notice, noticeClosed };
  if (['390', '1440', 'iphone13'].includes(fr)) await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-full.png`, fullPage: true });
  console.log(`${key}: FA ${mCam.fa}/${mQuiz.fa}/${mDone.fa} · FA ngoài vùng ${mDone.faPage.length} ${mDone.faPage.slice(0, 3).join(' | ')} · icon nhìn thấy ${mCam.icons.filter((x) => x.vis).length}/${mQuiz.icons.filter((x) => x.vis).length}/${mDone.icons.filter((x) => x.vis).length} · trả lời ${n} · kết quả ${JSON.stringify(result)} · hồ sơ ${JSON.stringify(data[`${key}|notice`])} · Tab ${JSON.stringify(kb)} · lỗi JS ${errs.length}${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`);
  if (MODE === 'after') {
    for (const st of ['cam', 'quiz', 'done']) {
      const m = data[`${key}-${st}`];
      ok(m.fa === 0 && m.faPage.length === 0, `${key}-${st}: <i fa-> trong vùng = ${m.fa}, ngoài vùng (trừ header/footer) = ${m.faPage.length}`);
      ok(m.pcErr === 0, `${key}-${st}: PC-ERROR ui_icon = ${m.pcErr}`);
      if (before?.[`${key}-${st}`]) compare(`${key}-${st}`, before[`${key}-${st}`], m, st !== 'done');
    }
    const br_ = before?.[`${key}|result`]; ok(!!result && JSON.stringify(br_) === JSON.stringify(result), `${key}: thẻ kết quả before ${JSON.stringify(br_)} = after ${JSON.stringify(result)} (trả lời ${n}, before ${before?.[`${key}|answers`]})`);
    const bn = before?.[`${key}|notice`]; ok(JSON.stringify(bn) === JSON.stringify(data[`${key}|notice`]) && (!notice || noticeClosed), `${key}: thanh hồ sơ before ${JSON.stringify(bn)} = after ${JSON.stringify(data[`${key}|notice`])}`);
    const bk = before?.[`${key}|kb`]; ok(kb.id === 'btnSendChat' && (kb.ow >= 2 || kb.ow === bk?.ow) && JSON.stringify(bk) === JSON.stringify(kb), `${key}: Tab tới nút gửi ${JSON.stringify(kb)} = before ${JSON.stringify(bk)}`);
    const be = before?.[`${key}|errs`] || []; const nu = errs.filter((e) => !be.includes(e));
    ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`);
  }
  data[`${key}|errs`] = errs;
  await ctx.close();
  await b.close();
}
const prev = process.argv[3] && fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify({ ...prev, ...data }, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
