// N23a (vòng 46, 30/10/2026) — trang đăng nhập không còn nạp 3 trang HTML 404 thay script hệ thống Sapo (bizweb_asset_url).
// 8 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13 / 1440) × /?tpl=login, /dat-lich-tu-van:
//  · login: /bizweb-api.js, /common.js, /customer.js trả 200 content-type JavaScript ≤ 1 KB, 0 request .js trả HTML;
//  · login: gõ email → Tab sang mật khẩu → Shift+Tab về email; gửi form trống ⇒ trình duyệt chặn (ô :invalid), URL không đổi;
//  · đặt lịch: các ô form .mops-form__input hiển thị (> 0, bằng nhau mọi khung); 0 lỗi JS; ảnh after-<trình duyệt>-<khung>-<trang>.png.
// Chạy: node ui-loop/checks/N23a.mjs
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const OUT = 'ui-loop/evidence/N23'; fs.mkdirSync(OUT, { recursive: true });
const VPS = [
  ['chromium', '390', { viewport: { width: 390, height: 844 } }],
  ['webkit', '390', { ...devices['iPhone 13'] }],
  ['chromium', '320', { viewport: { width: 320, height: 568 } }],
  ['chromium', '768', { viewport: { width: 768, height: 1024 } }],
  ['chromium', '1024', { viewport: { width: 1024, height: 768 } }],
  ['chromium', '1440', { viewport: { width: 1440, height: 900 } }],
  ['webkit', '1440', { viewport: { width: 1440, height: 900 } }],
  ['chromium', '844x390', { viewport: { width: 844, height: 390 } }],
];
let fail = 0;
for (const [bn, vn, ctxOpt] of VPS) {
  const browser = await (bn === 'webkit' ? webkit : chromium).launch();
  const ctx = await browser.newContext(ctxOpt);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  const js = [];
  page.on('response', async (r) => {
    const u = new URL(r.url());
    if (u.origin === BASE && /\.js$/.test(u.pathname)) {
      const ct = r.headers()['content-type'] || ''; let len = 0; try { len = (await r.body()).length; } catch (e) {}
      js.push({ p: u.pathname, s: r.status(), ct, len });
    }
  });
  // ── đăng nhập
  await page.goto(BASE + '/?tpl=login', { waitUntil: 'load' }); await page.waitForTimeout(800);
  const sys = js.filter((x) => /^\/(bizweb-api|common|customer)\.js$/.test(x.p));
  const htmlJs = js.filter((x) => /text\/html/.test(x.ct));
  const sysOk = sys.length === 3 && sys.every((x) => x.s === 200 && /javascript/.test(x.ct) && x.len <= 1024);
  const email = page.locator('#customer_email'), pw = page.locator('#customer_password');
  await email.scrollIntoViewIfNeeded(); await email.click(); await email.fill('');
  await page.keyboard.type('khach@vidu.vn');
  await page.keyboard.press('Tab'); const toPw = await page.evaluate(() => document.activeElement?.id);
  await page.keyboard.press('Shift+Tab'); const backEmail = await page.evaluate(() => document.activeElement?.id);
  await email.fill(''); const url0 = page.url();
  await page.locator('#customer_email').evaluate((el) => el.form.querySelector('button[type=submit]').click());
  await page.waitForTimeout(600);
  const inv = await page.evaluate(() => document.querySelector('#customer_email').matches(':invalid'));
  const stay = page.url() === url0;
  const box = await email.boundingBox();
  const loginOk = sysOk && htmlJs.length === 0 && toPw === 'customer_password' && backEmail === 'customer_email' && inv && stay && box && box.height >= 40;
  if (!loginOk) fail++;
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/after-${bn}-${vn}-login.png` });
  console.log(`${loginOk ? 'ĐẠT' : 'CHƯA'} ${bn} ${vn} /?tpl=login: script Sapo ${sys.map((x) => `${x.p} ${x.s} ${x.ct.split(';')[0]} ${x.len}B`).join(', ')} | .js trả HTML ${htmlJs.length} | Tab→${toPw}, Shift+Tab→${backEmail} | gửi trống: email :invalid=${inv}, ở lại trang=${stay} | ô email cao ${box ? box.height.toFixed(1) : '-'}px`);
  // ── đặt lịch
  js.length = 0;
  await page.goto(BASE + '/dat-lich-tu-van', { waitUntil: 'load' }); await page.waitForTimeout(1000);
  const f = await page.evaluate(() => [...document.querySelectorAll('.mops-form__input')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length);
  const htmlJs2 = js.filter((x) => /text\/html/.test(x.ct));
  const dlOk = f > 0 && htmlJs2.length === 0;
  if (!dlOk) fail++;
  await page.screenshot({ path: `${OUT}/after-${bn}-${vn}-datlich.png` });
  console.log(`${dlOk ? 'ĐẠT' : 'CHƯA'} ${bn} ${vn} /dat-lich-tu-van: ô form hiển thị ${f} | .js trả HTML ${htmlJs2.length}`);
  if (errs.length) { console.log(`${bn} ${vn}: lỗi JS`, errs.slice(0, 3)); fail++; } else console.log(`${bn} ${vn}: lỗi JS 0`);
  await browser.close();
}
console.log(fail ? `KẾT QUẢ: CHƯA ĐẠT (${fail})` : 'KẾT QUẢ: ĐẠT');
