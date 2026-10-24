#!/usr/bin/env node
/*
  ui-loop/checks/N08.mjs — kiểm việc N08: thông báo `.pc-toast` (z 60) không che nút nổi `.pc-fab` và không che ô nhập / nút
  trong popup `.pc-modal` đang mở (< 1024 là khung trượt đáy).
  Trang kit /?tpl=page.ui-kit ở 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13), cuộn giữa + cuối,
  có và không có thanh mua (gỡ .pc-actionbar):
    (a) toast + fab cùng hiện ⇒ giao 0px, 5 điểm fab trúng fab, khoảng cách toast–fab ≥ 8px;
    (b) popup mở + toast hiện ⇒ toast nhìn thấy (tâm trúng toast), giao toast–popup 0px, giao toast với ô / nút / tiêu đề trong
        popup 0px, đỉnh popup ≥ 0;
    (c) toast giao thanh mua 0px; (d) toast rộng ≥ 200px, chữ 1 hàng (scrollWidth ≤ clientWidth);
    (e) hồi quy: không fab + popup đóng ⇒ rect toast = bản HEAD; popup mở không toast ⇒ rect popup = bản HEAD
        (bản HEAD = ui-loop/evidence/N08/head-pc-ui.css, nạp thay pc-ui.css bằng page.route trong cùng lần chạy);
        quy tắc ngoài `.pc-` trong pc-ui.css trùng 100% bản HEAD; axe target-size #pc-kit = 0.
  Chạy: node ui-loop/checks/N08.mjs   (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N08');
const BASE = 'http://localhost:3000';
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const HEAD_CSS = fs.readFileSync(path.join(EVD, 'head-pc-ui.css'), 'utf8');
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

const FRAMES = [
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 } } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];

const browsers = {};
const open = async (f, head) => {
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext({ ...f.opts, reducedMotion: 'reduce' }); const page = await ctx.newPage();
  if (head) await page.route(/pc-ui\.css/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: HEAD_CSS }));
  const res = await page.goto(BASE + '/?tpl=page.ui-kit', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  return { ctx, page, status: res.status() };
};

// Đo trong trang
const measure = () => {
  const R = (e) => { const r = e.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const vis = (e) => { if (!e) return false; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05 && r.width > 0 && r.height > 0
      && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const inter = (a, b) => { const r1 = a.getBoundingClientRect(); const r2 = b.getBoundingClientRect();
    const w = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left); const h = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
    return w > 0 && h > 0 ? +(Math.min(w, h)).toFixed(1) : 0; };
  const gap = (a, b) => { const r1 = a.getBoundingClientRect(); const r2 = b.getBoundingClientRect();
    const dx = Math.max(r2.left - r1.right, r1.left - r2.right, 0); const dy = Math.max(r2.top - r1.bottom, r1.top - r2.bottom, 0);
    return +Math.max(dx, dy).toFixed(1); };
  const pts = (el, pad) => { const r = el.getBoundingClientRect();
    return [[.5, .5], [0, 0], [1, 0], [0, 1], [1, 1]].map(([i, j]) => [r.left + pad + (r.width - 2 * pad) * i, r.top + pad + (r.height - 2 * pad) * j]); };
  const hits = (el, pad) => pts(el, pad).filter(([x, y]) => { const h = document.elementFromPoint(x, y); return h && el.contains(h); }).length;
  const toast = document.querySelector('.pc-toast'); const fab = document.querySelector('.pc-fab');
  const ab = document.querySelector('.pc-actionbar'); const modal = document.getElementById('kit-modal');
  const msg = toast?.querySelector('[data-pc-toast-message]');
  const o = { vw: innerWidth, toastVis: vis(toast), fabVis: vis(fab), modalOpen: !!modal && !modal.hidden };
  if (o.toastVis) {
    o.toast = R(toast); o.toastHit = hits(toast, 6);
    o.toastLines = msg ? Math.round(msg.getBoundingClientRect().height / parseFloat(getComputedStyle(msg).lineHeight)) : 0;
    o.toastOverflow = msg ? msg.scrollWidth - msg.clientWidth : 0;  }
  if (o.fabVis) { o.fab = R(fab); o.fabHit = hits(fab, 8); }
  if (o.toastVis && o.fabVis) { o.toastFab = inter(toast, fab); o.toastFabGap = gap(toast, fab); }
  o.abFixed = !!ab && getComputedStyle(ab).position === 'fixed';
  if (o.toastVis && o.abFixed) o.toastAb = inter(toast, ab);
  if (o.modalOpen) {
    o.modal = R(modal);
    if (o.toastVis) {
      o.toastModal = inter(toast, modal);
      // Phần NHÌN THẤY của phần tử = rect giao khung cuộn của popup (phần bị popup tự cắt khi nội dung dài không tính là "bị toast
      // che"); script đo ở popup cuộn đầu VÀ cuộn cuối để mọi phần tử đều có lúc nằm trong khung
      const mr = modal.getBoundingClientRect(); const tr = toast.getBoundingClientRect();
      o.inner = [...modal.querySelectorAll('.pc-input, .pc-btn, .pc-modal__close, .pc-modal__title, .pc-label')].filter(vis).map((e) => {
        const r = e.getBoundingClientRect();
        const v = { left: Math.max(r.left, mr.left), right: Math.min(r.right, mr.right), top: Math.max(r.top, mr.top), bottom: Math.min(r.bottom, mr.bottom) };
        const shown = v.right > v.left && v.bottom > v.top; const full = shown && v.top <= r.top + 0.5 && v.bottom >= r.bottom - 0.5;
        const w = Math.min(v.right, tr.right) - Math.max(v.left, tr.left); const h = Math.min(v.bottom, tr.bottom) - Math.max(v.top, tr.top);
        return { el: e.className.split(' ')[0], shown, full, cover: shown && w > 0 && h > 0 ? +Math.min(w, h).toFixed(1) : 0, hit: full ? hits(e, 4) : null };
      });
    }
  }
  return o;
};
const openModal = (page) => page.evaluate(() => { document.getElementById('kit-modal').hidden = false; document.querySelector('[data-pc-modal-overlay="kit-modal"]').hidden = false; });
const axeTarget = (page) => page.evaluate(async () => (await window.axe.run({ include: [['#pc-kit']] }, {
  runOnly: { type: 'rule', values: ['target-size'] }, resultTypes: ['violations'],
})).violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))));
const scrollTo = (page, pos) => page.evaluate((p) => window.scrollTo(0, p === 'mid' ? document.documentElement.scrollHeight / 2 - innerHeight / 2 : document.documentElement.scrollHeight), pos);

const out = {};
for (const f of FRAMES) {
  const rec = out[f.name] = { head: {}, after: {} };
  for (const mode of ['head', 'after']) {
    const head = mode === 'head';
    console.log(`\n[N08] ${f.name} — ${head ? 'bản HEAD (đối chứng)' : 'bản sửa'}`);
    const r = rec[mode];
    for (const ab of ['co-thanh-mua', 'khong-thanh-mua']) {
      const { ctx, page, status } = await open(f, head);
      if (!head && ab === 'co-thanh-mua') ok(status === 200, `HTTP ${status}`);
      if (ab === 'khong-thanh-mua') await page.evaluate(() => document.querySelector('.pc-actionbar')?.remove());
      for (const pos of ['mid', 'end']) {
        await scrollTo(page, pos); await page.waitForTimeout(400);
        const m = r[`${ab}-${pos}`] = await page.evaluate(measure);
        const tag = `${ab} ${pos}`;
        console.log(`  · ${tag}: toast ${m.toast ? `${m.toast.left}–${m.toast.right} × ${m.toast.top}–${m.toast.bottom} (${m.toast.w}×${m.toast.h})` : 'ẩn'}; fab ${m.fab ? `${m.fab.left}–${m.fab.right} × ${m.fab.top}–${m.fab.bottom}` : 'ẩn'}; giao ${m.toastFab ?? '—'}px, cách ${m.toastFabGap ?? '—'}px`);
        if (head) continue;
        ok(m.toastVis && m.toastHit === 5, `${tag}: toast nhìn thấy, 5 điểm trúng toast (${m.toastHit ?? 0}/5)`);
        if (m.fabVis) {
          ok(m.toastFab === 0, `${tag}: giao toast–fab ${m.toastFab}px`);
          ok(m.toastFabGap >= 8, `${tag}: toast cách fab ${m.toastFabGap}px (≥ 8)`);
          ok(m.fabHit === 5, `${tag}: 5 điểm fab trúng fab ${m.fabHit}/5`);
        } else ok(f.name === 'chromium-844x390', `${tag}: fab ẩn (chỉ đúng ở màn ngang thấp — M.4)`);
        if (m.abFixed) ok(m.toastAb === 0, `${tag}: toast giao thanh mua ${m.toastAb}px`);
        ok(m.toast.w >= 200 && m.toastOverflow <= 0 && m.toastLines === 1, `${tag}: toast rộng ${m.toast.w}px, ${m.toastLines} hàng chữ, tràn ${m.toastOverflow}px`);
        if (pos === 'mid' && ab === 'co-thanh-mua') await page.screenshot({ path: path.join(EVD, `after-${f.name}.png`) });
      }
      // Popup mở + toast hiện — đo ở popup cuộn đầu rồi cuộn cuối
      await openModal(page); await page.waitForTimeout(300);
      for (const ms of ['dau', 'cuoi']) {
        if (ms === 'cuoi') { await page.evaluate(() => { const m = document.getElementById('kit-modal'); m.scrollTop = m.scrollHeight; }); await page.waitForTimeout(200); }
        const mm = r[`${ab}-modal-${ms}`] = await page.evaluate(measure);
        const t = `${ab} popup mở (cuộn ${ms})`;
        console.log(`  · ${t}: popup ${mm.modal.top}–${mm.modal.bottom}; toast ${mm.toast ? `${mm.toast.top}–${mm.toast.bottom}` : 'ẩn'}; giao popup ${mm.toastModal ?? '—'}px; trong popup: ${(mm.inner || []).map((x) => `${x.el} ${x.shown ? (x.full ? 'đủ' : 'một phần') : 'ngoài khung'} che ${x.cover}px`).join(', ')}`);
        if (head) continue;
        ok(mm.toastVis && mm.toastHit === 5, `${t}: toast nhìn thấy (${mm.toastHit ?? 0}/5 điểm)`);
        ok(mm.toastModal === 0, `${t}: giao toast–popup ${mm.toastModal}px`);
        const bad = (mm.inner || []).filter((x) => x.cover > 0 || (x.full && x.hit < 5));
        ok(mm.inner?.length >= 4 && bad.length === 0, `${t}: ${mm.inner?.length} phần tử trong popup, bị toast che ${bad.length}${bad.length ? ' — ' + bad.map((x) => `${x.el} ${x.cover}px ${x.hit}/5`).join(', ') : ''}`);
        ok(mm.modal.top >= 0, `${t}: đỉnh popup ${mm.modal.top}px (≥ 0)`);
      }
      if (!head) {
        const seen = new Set(['dau', 'cuoi'].flatMap((ms) => r[`${ab}-modal-${ms}`].inner.filter((x) => x.full).map((x) => x.el)));
        ok(seen.size >= 4, `${ab} popup: phần tử nhìn thấy trọn ở đầu/cuối cuộn: ${[...seen].join(', ')}`);
        await page.evaluate(() => { document.getElementById('kit-modal').scrollTop = 0; });
        if (ab === 'co-thanh-mua') {
          await page.screenshot({ path: path.join(EVD, `after-${f.name}-modal.png`) });
          await page.addScriptTag({ content: AXE_SRC });
          const ax = await axeTarget(page);
          ok(ax.length === 0, `axe target-size #pc-kit (popup mở): ${ax.length}${ax.length ? ' — ' + ax.join(' ; ') : ''}`);
        }
      }
      // (e) hồi quy: popup mở, toast ẩn ⇒ rect popup; popup đóng, không fab ⇒ rect toast
      await page.evaluate(() => document.querySelector('.pc-toast').classList.add('hidden')); await page.waitForTimeout(200);
      r[`${ab}-modal-notoast`] = (await page.evaluate(measure)).modal;
      await page.evaluate(() => { document.getElementById('kit-modal').hidden = true; document.querySelector('[data-pc-modal-overlay="kit-modal"]').hidden = true; });
      await scrollTo(page, 'mid'); await page.waitForTimeout(300);
      r[`${ab}-fab-notoast`] = (await page.evaluate(measure)).fab ?? 'ẩn';
      await page.evaluate(() => { document.querySelector('.pc-toast').classList.remove('hidden'); document.querySelector('.pc-fab')?.remove(); });
      await scrollTo(page, 'mid'); await page.waitForTimeout(300);
      r[`${ab}-nofab`] = (await page.evaluate(measure)).toast;
      if (!head && ab === 'co-thanh-mua') {
        await page.addScriptTag({ content: AXE_SRC }).catch(() => {});
        const ax = await axeTarget(page);
        ok(ax.length === 0, `axe target-size #pc-kit (thường): ${ax.length}${ax.length ? ' — ' + ax.join(' ; ') : ''}`);
      }
      await ctx.close();
    }
  }
  for (const ab of ['co-thanh-mua', 'khong-thanh-mua']) {
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    ok(eq(rec.head[`${ab}-nofab`], rec.after[`${ab}-nofab`]), `hồi quy ${ab}: không fab, popup đóng ⇒ rect toast HEAD ${JSON.stringify(rec.head[`${ab}-nofab`])} = sau ${JSON.stringify(rec.after[`${ab}-nofab`])}`);
    ok(eq(rec.head[`${ab}-fab-notoast`], rec.after[`${ab}-fab-notoast`]), `hồi quy ${ab}: toast ẩn ⇒ rect fab HEAD = sau (${JSON.stringify(rec.after[`${ab}-fab-notoast`])})`);
    ok(eq(rec.head[`${ab}-modal-notoast`], rec.after[`${ab}-modal-notoast`]), `hồi quy ${ab}: popup mở không toast ⇒ rect popup HEAD = sau (${JSON.stringify(rec.after[`${ab}-modal-notoast`])})`);
  }
}
for (const b of Object.values(browsers)) await b.close();

// Hồi quy CSS: quy tắc ngoài .pc- trong pc-ui.css trùng bản HEAD
function splitRules(css) {
  const res = []; let depth = 0; let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) { res.push(css.slice(start, i + 1)); start = i + 1; } }
  }
  return res;
}
const nonPc = (css) => { const rules = [];
  const walk = (txt, ctx) => { for (const r of splitRules(txt)) { const h = r.slice(0, r.indexOf('{')).trim();
    if (h.startsWith('@media') || h.startsWith('@supports') || h.startsWith('@layer')) walk(r.slice(r.indexOf('{') + 1, -1), ctx + h);
    else if (!h.includes('.pc-')) rules.push(ctx + '|' + r.trim()); } };
  walk(css, ''); return rules; };
const a = nonPc(HEAD_CSS); const b2 = nonPc(fs.readFileSync(path.join(ROOT, 'assets', 'pc-ui.css'), 'utf8'));
const sa = new Set(a); const sb = new Set(b2);
const diff = b2.filter((x) => !sa.has(x)).length + a.filter((x) => !sb.has(x)).length;
console.log('\n[N08] hồi quy CSS');
ok(diff === 0 && a.length === b2.length, `quy tắc ngoài .pc- trong pc-ui.css: HEAD ${a.length} / sau ${b2.length}, lệch ${diff}`);

fs.writeFileSync(path.join(EVD, 'result.json'), JSON.stringify(out, null, 1));
console.log(`\n[N08] ${fail ? 'CHƯA ĐẠT — ' + fail + ' mục sai' : 'ĐẠT mọi mục'}`);
process.exit(fail ? 1 : 0);
