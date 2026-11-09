// L03b41 (vòng 111, 09/11/2026 — chạy lại: node ui-loop/checks/L03b41.mjs before|after [khung,khung]).
// Việc: glyph Font Awesome `\f00c` (font-family FontAwesome) ở `.checkbox.style input:checked + label:after` trong
//   assets/page_account.scss.bwt. Không markup/JS nào mang class `checkbox` + `style` ⇒ khối CSS chết ⇒ xoá cả khối.
// Đo: CSS phục vụ (/assets/page_account.scss.css) có FontAwesome / \f00c / .checkbox.style; trên 5 trang customers:
//   số phần tử .checkbox.style, pseudo font FA, cao trang, lỗi JS; /addresses: mở form «Thêm địa chỉ», bấm ô
//   «Đặt là địa chỉ mặc định» 2 lần ⇒ checked; hộp ô chọn + nhãn.
// Ảnh: ui-loop/evidence/L03b41/<mode>-<trình duyệt>-<khung>.png (form thêm địa chỉ sau khi tick)
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b41';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const HOST = 'http://localhost:3000';
const PAGES = ['customers/addresses', 'customers/account', 'customers/orders', 'customers/change_password', 'customers/register'];
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

// (a) CSS phục vụ
const css = await (await fetch(`${HOST}/assets/page_account.scss.css`)).text();
data.css = { len: css.length, fa: (css.match(/FontAwesome/g) || []).length, f00c: (css.match(/\\f00c|/g) || []).length, styleRule: (css.match(/\.checkbox\.style/g) || []).length };
console.log(`CSS page_account.scss.css: ${data.css.len} B · FontAwesome ${data.css.fa} · f00c ${data.css.f00c} · .checkbox.style ${data.css.styleRule}`);
if (MODE === 'after') {
  ok(data.css.fa === 0 && data.css.f00c === 0, `CSS: 0 FontAwesome / f00c (${data.css.fa}/${data.css.f00c}; before ${before?.css?.fa}/${before?.css?.f00c})`);
  ok(data.css.styleRule === 0, `CSS: 0 quy tắc .checkbox.style (${data.css.styleRule}; before ${before?.css?.styleRule})`);
}

const measure = (p) => p.evaluate(() => {
  let faPseudo = 0;
  for (const el of document.querySelectorAll('body *')) for (const ps of ['::before', '::after']) {
    const c = getComputedStyle(el, ps); if (c.content && c.content !== 'none' && c.content !== 'normal' && /FontAwesome|Font Awesome/i.test(c.fontFamily)) faPseudo++;
  }
  return { faPseudo, styleEls: document.querySelectorAll('.checkbox.style').length, docH: document.documentElement.scrollHeight,
    pcErr: (document.documentElement.outerHTML.match(/PC-ERROR/g) || []).length };
});
const r1 = (v) => +(+v).toFixed(1);

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  for (const pg of PAGES) {
    const key = `${brn}-${fr}-${pg.split('/')[1]}`;
    const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await p.goto(`${HOST}/?tpl=${pg}`, { waitUntil: 'load', timeout: 60000 });
    await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
    await p.waitForTimeout(800);
    let m; try { m = await measure(p); } catch { await p.waitForLoadState('load'); await p.waitForTimeout(1500); m = await measure(p); }
    if (pg === 'customers/addresses') {
      const add = p.locator('.pc-acc-addr-add').first();
      await add.scrollIntoViewIfNeeded(); await add.click(); await p.waitForTimeout(500);
      // Local không có Bizweb.CustomerAddress (script Sapo thật) ⇒ bấm nút báo lỗi có từ trước; giả lập toggleNewForm = hiện #add_address
      await p.evaluate(() => { const f = document.getElementById('add_address'); if (f && getComputedStyle(f).display === 'none') f.style.display = 'block'; });
      await p.waitForTimeout(300);
      const cb = p.locator('#address_default_address_');
      const lab = p.locator('label:has(#address_default_address_)');
      const st = [await cb.isChecked()];
      const geo = async () => p.evaluate(() => {
        const i = document.getElementById('address_default_address_'); const l = i.closest('label'); const s = l.querySelector('.c-indicator');
        const g = (e) => { const r = e.getBoundingClientRect(); return [+(r.x).toFixed(1), +(r.y + scrollY).toFixed(1), +(r.width).toFixed(1), +(r.height).toFixed(1)]; };
        const ps = getComputedStyle(l, '::after');
        return { input: g(i), label: g(l), text: g(s), labelAfter: ps.content, accent: getComputedStyle(i).accentColor, vis: getComputedStyle(i).display };
      });
      await lab.scrollIntoViewIfNeeded();
      await cb.click(); await p.waitForTimeout(150); st.push(await cb.isChecked());
      m.geo = await geo();
      const card = p.locator('label:has(#address_default_address_)').locator('xpath=ancestor::form[1]');
      await lab.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-tick.png` }).catch(() => {});
      await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}.png` }).catch(() => {});
      await cb.click(); await p.waitForTimeout(150); st.push(await cb.isChecked());
      m.checked = st.join('→');
      void card;
      console.log(`   ô chọn: ${m.checked} · input ${m.geo.input} (${m.geo.vis}) · nhãn ${m.geo.label} · chữ ${m.geo.text} · label::after ${m.geo.labelAfter}`);
    }
    m.errs = errs;
    data[key] = m;
    console.log(`${key}: .checkbox.style ${m.styleEls} · pseudo FA ${m.faPseudo} · PC-ERROR ${m.pcErr} · cao trang ${m.docH} · lỗi JS ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
    if (MODE === 'after') {
      const bm = before?.[key];
      ok(m.styleEls === 0 && bm?.styleEls === 0, `${key}: 0 phần tử .checkbox.style (before ${bm?.styleEls})`);
      ok(m.faPseudo === 0, `${key}: pseudo font FA = 0 (${m.faPseudo}; before ${bm?.faPseudo})`);
      ok(m.pcErr === (bm?.pcErr ?? 0), `${key}: PC-ERROR ${m.pcErr} = before`);
      ok(errs.length <= (bm?.errs?.length ?? 0), `${key}: lỗi JS ${errs.length} ≤ before ${bm?.errs?.length}`);
      ok(bm && near(m.docH, bm.docH, 2), `${key}: cao trang ${m.docH} vs before ${bm?.docH}`);
      if (m.geo) {
        ok(m.checked === 'false→true→false', `${key}: bấm ô chọn ${m.checked}`);
        const same = ['input', 'label', 'text'].every((k) => m.geo[k].every((v, i) => near(v, bm.geo[k][i], 1)));
        ok(same, `${key}: hộp ô chọn/nhãn/chữ = before ±1 (${JSON.stringify(m.geo.input)} vs ${JSON.stringify(bm?.geo?.input)})`);
      }
    }
    await ctx.close();
  }
  await b.close();
}
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify(data, null, 1));
console.log(MODE === 'after' ? `KẾT QUẢ: ${fails.length ? fails.length + ' ✗' : 'ĐẠT'}` : 'Đã ghi before.json');
process.exit(MODE === 'after' && fails.length ? 1 : 0);
