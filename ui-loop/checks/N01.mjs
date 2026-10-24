#!/usr/bin/env node
/*
  ui-loop/checks/N01.mjs — kiểm việc N01 (preflight tắt ⇒ viền pc-* thiếu border-style, pc-input thiếu box-sizing) trên trình duyệt thật.
  Trang kit /?tpl=page.ui-kit, 7 khung: Chromium 390 / 320 / 768 / 1024 / 1440 / ngang 844×390 + WebKit iPhone 13.
  Đo từng cạnh (style / width / màu) của phần tử pc-* có viền theo M.4: cạnh có viền ⇒ solid đúng độ dày; cạnh không viền ⇒ 0px.
  `.pc-header` / `.pc-bottomnav` chưa có snippet (L01) ⇒ chèn tạm 1 phần tử vào trang để đo, đo xong xoá.
  `.pc-modal__close` thuộc N11 — chỉ in ra, không tính.
  Hồi quy: quy tắc ngoài `.pc-` trong assets/pc-ui.css trùng 100% bản trước (evidence/N01/pc-ui.before.css).
    node ui-loop/checks/N01.mjs --before   (bản chưa sửa: ghi evidence/N01/before.json + pc-ui.before.css, ảnh before-*)
    node ui-loop/checks/N01.mjs            (bản đã sửa: kiểm tiêu chí, ảnh after-*)
  Cần npm run preview ở localhost:3000.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N01');
const BASE = 'http://localhost:3000';
const BEFORE = process.argv.includes('--before');
const TAG = BEFORE ? 'before' : 'after';
fs.mkdirSync(EVD, { recursive: true });
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

// Cạnh có viền theo M.4 (T R B L); lg = khung ≥ 1024
const ALL1 = [1, 1, 1, 1];
const EXPECT = (lg) => ({
  'button.pc-btn--secondary': [2, 2, 2, 2],
  'button.pc-btn--primary': [0, 0, 0, 0],
  'a.pc-btn--link': [0, 0, 0, 0],
  '.pc-card': ALL1,
  'input.pc-input': ALL1,
  'textarea.pc-input': ALL1,
  '.pc-swiper-btn': ALL1,
  '.pc-fab': ALL1,
  '.pc-actionbar': lg ? [0, 0, 0, 0] : [1, 0, 0, 0],
  '.pc-modal': lg ? ALL1 : [1, 0, 0, 0],
  '.pc-toast': [0, 0, 0, 0],
  '.pc-badge': [0, 0, 0, 0],
  '.pc-header': [0, 0, 1, 0],
  '.pc-bottomnav': [1, 0, 0, 0],
});

// Màu viền theo token (B.2): brand #075B40, line #E2E8F0, line-control #64748B
const BRAND = 'rgb(7, 91, 64)'; const SALE = 'rgb(185, 28, 28)'; const LINE = 'rgb(226, 232, 240)'; const CTRL = 'rgb(100, 116, 139)';
const COLOR = { 'button.pc-btn--secondary': BRAND, '.pc-card': LINE, 'input.pc-input': CTRL, 'textarea.pc-input': CTRL,
  '.pc-swiper-btn': CTRL, '.pc-fab': LINE, '.pc-actionbar': LINE, '.pc-modal': LINE, '.pc-header': LINE, '.pc-bottomnav': LINE };

const measure = (page, sels) => page.evaluate((sels) => {
  const out = {};
  for (const s of [...sels, '.pc-modal__close']) {
    const els = [...document.querySelectorAll(s)].filter((e) => getComputedStyle(e).display !== 'none');
    out[s] = els.map((e) => {
      const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
      const side = (k) => ({ style: cs[`border${k}Style`], w: parseFloat(cs[`border${k}Width`]), c: cs[`border${k}Color`] });
      return { sides: ['Top', 'Right', 'Bottom', 'Left'].map(side), box: cs.boxSizing, h: Math.round(r.height * 10) / 10,
        w: Math.round(r.width * 10) / 10, bg: cs.backgroundColor, invalid: e.getAttribute('aria-invalid') === 'true' };
    });
  }
  return out;
}, sels);

// `.pc-header` chưa có template dùng (header thư viện thuộc L01) ⇒ Tailwind không sinh quy tắc trong pc-ui.css.
// Biên dịch riêng thư viện với 1 file nội dung chỉ có class header (cùng config + bước rem→px của build:pc), lấy đúng các quy
// tắc `.pc-header…`, chèn tạm vào trang khi đo phần tử header thử.
const headerCss = (() => {
  const html = path.join(EVD, 'probe-content.html'); const out = path.join(EVD, 'probe-header.css');
  fs.writeFileSync(html, '<header class="pc-header"><div class="pc-header__inner"></div></header>');
  execSync(`npx tailwindcss -c tailwind.pc.config.js -i ui-src/css/main.css --content "${html}" -o "${out}" --minify`, { cwd: ROOT, stdio: 'ignore' });
  execSync(`node scripts/pc-css-px.mjs "${out}"`, { cwd: ROOT, stdio: 'ignore' });
  const keep = [];
  const walk = (txt, wrap) => {
    for (const r of splitRules(txt)) {
      const head = r.slice(0, r.indexOf('{')).trim();
      if (head.startsWith('@media') || head.startsWith('@layer')) walk(r.slice(r.indexOf('{') + 1, -1), head.startsWith('@media') ? head : wrap);
      else if (/\.pc-header(?![\w-])/.test(head) && !head.includes(':focus')) keep.push(wrap ? `${wrap}{${r}}` : r);
    }
  };
  walk(fs.readFileSync(out, 'utf8'), '');
  return keep.join('\n');
})();
if (!BEFORE) console.log(`[N01] CSS .pc-header biên dịch riêng (${headerCss.length} B):\n${headerCss}`);

const browsers = {};
const summary = []; const store = {};
for (const f of FRAMES) {
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext(f.opts); const page = await ctx.newPage();
  const res = await page.goto(BASE + '/?tpl=page.ui-kit', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  const vw = page.viewportSize().width; const lg = vw >= 1024;
  console.log(`\n[N01] ${f.name} (HTTP ${res.status()})`);

  // Ảnh: cả trang + cận 3 khối có viền (nút, thẻ, ô nhập)
  await page.screenshot({ path: path.join(EVD, `${TAG}-${f.name}.png`), fullPage: true });
  for (const k of ['ui_button', 'ui_product_card', 'ui_field', 'ui_swiper_nav']) {
    const loc = page.locator(`[data-kit="${k}"]`);
    await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
    await loc.screenshot({ path: path.join(EVD, `${TAG}-${f.name}-${k.replace('ui_', '')}.png`) });
  }

  // Mở popup (pc-ui.js chưa có — D05) + chèn tạm header / thanh đáy để đo
  await page.evaluate((css) => {
    if (!document.querySelector('style[data-n01-probe]') && css) document.head.insertAdjacentHTML('beforeend', `<style data-n01-probe>${css}</style>`);
    document.getElementById('kit-modal').hidden = false;
    document.querySelector('[data-pc-modal-overlay="kit-modal"]').hidden = false;
    const kit = document.getElementById('pc-kit');
    kit.insertAdjacentHTML('afterbegin', '<header class="pc-header" data-n01-probe><div class="pc-header__inner">Header thử</div></header>');
    kit.insertAdjacentHTML('beforeend', '<nav class="pc-bottomnav" data-n01-probe><a class="pc-bottomnav__item" href="/">Trang chủ</a></nav>');
  }, headerCss);
  await page.waitForTimeout(150);
  // Viền khi focus ô nhập (thông tin: focus:border-brand phải vẫn thắng sau khi tăng độ ưu tiên màu viền thường)
  await page.focus('input.pc-input[name=kit_name]');
  const focusC = await page.evaluate(() => getComputedStyle(document.querySelector('input.pc-input[name=kit_name]')).borderTopColor);
  await page.evaluate(() => document.activeElement.blur());
  console.log(`    input.pc-input khi focus: màu viền ${focusC}`);
  if (!BEFORE) ok(focusC === BRAND, `ô nhập focus viền brand (${focusC})`);
  await page.screenshot({ path: path.join(EVD, `${TAG}-${f.name}-modal.png`) });
  const exp = EXPECT(lg);
  const m = await measure(page, Object.keys(exp).filter((s) => s !== '.pc-bottomnav'));
  // Thanh đáy bị ẩn khi trang có thanh mua (M.4 nhóm 9) ⇒ đo thanh đáy sau khi gỡ tạm thanh mua (chỉ < 1024, lg:hidden)
  await page.evaluate(() => document.querySelector('.pc-actionbar')?.remove());
  Object.assign(m, await measure(page, ['.pc-bottomnav']));
  await page.evaluate(() => document.querySelectorAll('[data-n01-probe]').forEach((e) => e.remove()));
  store[f.name] = m;
  if (lg) delete exp['.pc-bottomnav'];
  if (f.name === 'chromium-844x390') { delete exp['.pc-fab']; delete exp['.pc-bottomnav']; } // ẩn ở màn ngang thấp (M.4)

  let bad = 0; let n = 0; const lines = [];
  for (const [s, want] of Object.entries(exp)) {
    const list = m[s];
    if (!list.length) { bad++; lines.push(`${s}: không hiện`); continue; }
    list.forEach((el, i) => {
      n++;
      const errs = [];
      el.sides.forEach((sd, j) => {
        const eff = sd.style === 'none' || sd.style === 'hidden' ? 0 : sd.w;
        if (want[j] > 0 && (sd.style !== 'solid' || Math.abs(sd.w - want[j]) > 0.1)) errs.push(`${'TRBL'[j]} ${sd.style} ${sd.w}px`);
        const wantC = el.invalid ? SALE : COLOR[s];
        if (want[j] > 0 && wantC && sd.c !== wantC) errs.push(`${'TRBL'[j]} màu ${sd.c}`);
        if (want[j] === 0 && eff > 0) errs.push(`${'TRBL'[j]} thừa ${sd.style} ${sd.w}px`);
      });
      if (errs.length) { bad++; lines.push(`${s}[${i}]: ${errs.join(', ')}`); }
    });
    const e0 = list[0];
    console.log(`    ${s} ×${list.length}: ${e0.sides.map((sd) => `${sd.style} ${sd.w}`).join(' / ')} · màu ${e0.sides.find((sd) => sd.w > 0)?.c || '—'} · ${e0.box} · ${e0.w}×${e0.h}`);
  }
  const cl = m['.pc-modal__close'][0];
  console.log(`    (N11, không tính) .pc-modal__close: ${cl ? cl.sides[0].style + ' ' + cl.sides[0].w + 'px nền ' + cl.bg : 'không hiện'}`);
  const inp = m['input.pc-input']; const ta = m['textarea.pc-input'];
  const inpH = [...new Set(inp.map((e) => e.h))]; const inpBox = [...new Set([...inp, ...ta].map((e) => e.box))];
  const taH = Math.min(...ta.map((e) => e.h));
  if (!BEFORE) {
    ok(bad === 0, `${n} phần tử pc-* × 4 cạnh: ${bad} sai${lines.length ? ' — ' + lines.slice(0, 6).join(' ; ') : ''}`);
    ok(inpBox.length === 1 && inpBox[0] === 'border-box', `.pc-input box-sizing: ${inpBox.join(', ')}`);
    ok(inpH.length === 1 && Math.abs(inpH[0] - 44) < 0.6, `input.pc-input cao ${inpH.join(', ')}px (×${inp.length})`);
    ok(taH >= 96, `textarea.pc-input cao ${taH}px (≥ 96)`);
  } else {
    console.log(`    trước: ${bad}/${n} phần tử sai — ${lines.slice(0, 8).join(' ; ')}`);
    console.log(`    trước: .pc-input ${inpBox.join(',')} cao ${inpH.join(',')} · textarea ${taH}`);
  }
  summary.push({ frame: f.name, n, bad, inpH: inpH.join(','), box: inpBox.join(','), taH });
  await ctx.close();
}
for (const b of Object.values(browsers)) await b.close();

// Hồi quy CSS: quy tắc ngoài .pc- trong pc-ui.css
function splitRules(css) {
  const out = []; let depth = 0; let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) { out.push(css.slice(start, i + 1)); start = i + 1; } }
  }
  return out;
}
const nonPc = (css) => {
  // tách cả quy tắc lồng trong @media / @layer
  const rules = [];
  const walk = (txt, ctx) => {
    for (const r of splitRules(txt)) {
      const head = r.slice(0, r.indexOf('{')).trim();
      if (head.startsWith('@media') || head.startsWith('@supports') || head.startsWith('@layer')) walk(r.slice(r.indexOf('{') + 1, -1), ctx + head);
      else if (!head.includes('.pc-')) rules.push(ctx + '|' + r.trim());
    }
  };
  walk(css, '');
  return rules;
};
const cur = fs.readFileSync(path.join(ROOT, 'assets', 'pc-ui.css'), 'utf8');
if (BEFORE) {
  fs.copyFileSync(path.join(ROOT, 'assets', 'pc-ui.css'), path.join(EVD, 'pc-ui.before.css'));
  fs.writeFileSync(path.join(EVD, 'before.json'), JSON.stringify({ summary, store }, null, 1));
  console.log(`\n[N01] đã ghi before.json + pc-ui.before.css (${nonPc(cur).length} quy tắc ngoài .pc-)`);
} else {
  const a = nonPc(fs.readFileSync(path.join(EVD, 'pc-ui.before.css'), 'utf8')); const b2 = nonPc(cur);
  const sa = new Set(a); const diff = b2.filter((r) => !sa.has(r)).length + a.filter((r) => !new Set(b2).has(r)).length;
  console.log('\n[N01] hồi quy CSS');
  ok(diff === 0 && a.length === b2.length, `quy tắc ngoài .pc- trong pc-ui.css: trước ${a.length} / sau ${b2.length}, lệch ${diff}`);
  fs.writeFileSync(path.join(EVD, 'after.json'), JSON.stringify({ summary, store }, null, 1));
  console.log('\n' + summary.map((s) => `${s.frame}: ${s.n} phần tử, sai ${s.bad}; input ${s.box} ${s.inpH}px; textarea ${s.taH}px`).join('\n'));
  console.log(fail ? `\n[N01] CHƯA ĐẠT: ${fail} mục` : '\n[N01] ĐẠT');
  process.exit(fail ? 1 : 0);
}
