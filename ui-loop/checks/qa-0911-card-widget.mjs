// QA 09/11/2026: &nbsp; mô tả thẻ trang chủ · link bỏ qua · nút X bảng liên hệ · thẻ kê toa · nút «Hết hàng»
import { chromium, webkit, devices } from 'playwright'; import { Liquid } from 'liquidjs';
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✗ ') + m); if (!c) fail++; };
const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const L = s => { const [r, g, b] = s.match(/\d+(\.\d+)?/g).map(Number); return .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b); };
const CR = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
// 1) chuỗi lọc mô tả (cùng chuỗi filter như snippets/home_product_card.bwt)
{ const liq = new Liquid(); const out = await liq.parseAndRender("{{ s | strip_html | replace: '&nbsp;', ' ' | replace: '&#160;', ' ' | replace: '&amp;', '&' | strip_newlines | strip | truncate: 90 | escape }}", { s: '<p>Thương hiệu:&nbsp;Obagi&nbsp;– Xuất xứ:&#160;Mỹ &amp; Canada</p>' });
  console.log('== mô tả:', out); ok(!/nbsp|#160/.test(out) && out.includes('Mỹ &amp; Canada'), '&nbsp; / &#160; không còn hiện thành chữ, & hiện đúng 1 lần'); }
for (const [name, eng, opt] of [['chromium390', chromium, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['webkit-iPhone13', webkit, devices['iPhone 13']], ['desk1440', chromium, { viewport: { width: 1440, height: 900 } }]]) {
  console.log('==', name); const b = await eng.launch(); const p = await b.newPage(opt);
  await p.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 90000 }); await p.addStyleTag({ content: '#dev-toolbar{display:none!important}' }); await p.waitForTimeout(1000);
  // 2) link bỏ qua
  const sk = () => p.evaluate(() => { const r = document.querySelector('.portal-skip-link').getBoundingClientRect(); return { y: Math.round(r.y), act: document.activeElement.id || document.activeElement.className.toString().slice(0, 20) }; });
  ok((await sk()).y < 0, 'link bỏ qua ẩn khi tải trang');
  if (name !== 'webkit-iPhone13') { // WebKit/Safari mặc định không Tab tới link
    await p.keyboard.press('Tab'); const a = await sk(); ok(a.y >= 0 && a.act.includes('portal-skip-link'), `Tab ⇒ link hiện (y=${a.y})`);
    await p.keyboard.press('Enter'); await p.waitForTimeout(300); const c = await sk(); ok(c.y < 0 && c.act === 'portal-main', `Enter ⇒ focus sang main (${c.act}), link ẩn lại (y=${c.y})`); }
  // 3) nút X đầu bảng liên hệ
  await p.evaluate(() => scrollTo(0, 0)); await p.locator('#toggle-widget-btn').click(); await p.waitForTimeout(700);
  const x = await p.evaluate(() => { const e = document.querySelector('.close-widget-btn'); const r = e.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const hit = [[-21, 0], [21, 0], [0, -21], [0, 21]].map(([dx, dy]) => { const t = document.elementFromPoint(cx + dx, cy + dy); return !!(t && t.closest('.close-widget-btn')); });
    return { w: Math.round(r.width), hit, role: e.getAttribute('role'), tab: e.tabIndex }; });
  ok(x.hit.every(Boolean) && x.role === 'button' && x.tab === 0, `nút X bảng liên hệ: vòng ${x.w}px, vùng chạm 44×44 (${x.hit}), role=button, Tab được`);
  await p.locator('.close-widget-btn').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.querySelector('.main-widget').classList.contains('widget-opened')), 'Enter trên nút X đóng bảng');
  // 4) + 5) thẻ kê toa / hết hàng — dựng lại trên thẻ thật của trang (dữ liệu mẫu không có SP kê toa / hết hàng ở trang chủ)
  const card = await p.evaluate(() => { const cards = [...document.querySelectorAll('.section_featured_products .pc-h4-pcard')]; const [c1, c2] = cards;
    const pr = c1.querySelector('.pc-h4-pcard__p'); const rx = document.createElement('p'); rx.className = 'pc-h4-pcard__rx'; rx.innerHTML = '<b>Cần tư vấn</b><span>Liên hệ để được tư vấn</span>'; pr.replaceWith(rx);
    const sp = rx.querySelector('span').getBoundingClientRect(), bb = rx.querySelector('b').getBoundingClientRect();
    const btn = c2.querySelector('.pc-h4-pcard__a .pc-btn'); const dis = document.createElement('button'); dis.type = 'button'; dis.className = 'pc-btn pc-btn--primary pc-btn--block'; dis.disabled = true; dis.textContent = 'Hết hàng'; btn.replaceWith(dis);
    const s = getComputedStyle(dis); return { spW: Math.round(sp.width), bW: Math.round(bb.width), fg: s.color, bg: s.backgroundColor, op: s.opacity, h: Math.round(dis.getBoundingClientRect().height) }; });
  ok(card.spW <= 1 && card.bW > 20, `thẻ kê toa: còn nhãn «Cần tư vấn» (${card.bW}px), câu «Liên hệ…» chỉ cho trình đọc màn (${card.spW}px)`);
  const cr = CR(card.fg, card.bg); ok(card.op === '1' && cr >= 4.5 && card.h >= 44, `«Hết hàng»: ${card.fg} trên ${card.bg}, opacity ${card.op}, tương phản ${cr.toFixed(2)}:1, cao ${card.h}`);
  await b.close();
}
console.log(fail ? `FAIL ${fail}` : 'PASS'); process.exit(fail ? 1 : 0);
