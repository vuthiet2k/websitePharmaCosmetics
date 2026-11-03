// N47 (vòng 94, 03/11/2026): đo ô chọn quận/huyện trong popup cửa hàng trang SP (thấy khi kiểm L03b28) — chữ có đè mũi tên không.
import { chromium, webkit, devices } from 'playwright';
for (const [n, br, opt] of [['webkit-iphone13', webkit, devices['iPhone 13']], ['chromium-390', chromium, { viewport: { width: 390, height: 844 } }], ['chromium-1440', chromium, { viewport: { width: 1440, height: 900 } }]]) {
  const b = await br.launch(); const p = await (await b.newContext(opt)).newPage();
  await p.goto('http://localhost:3000/products/demo-l03b28-trang-sp', { waitUntil: 'load' });
  await p.evaluate(() => window.jQuery && jQuery('.modalstore-product').show()); await p.waitForTimeout(300);
  const r = await p.evaluate(() => [...document.querySelectorAll('.modal-store-product select')].map((s) => {
    const c = getComputedStyle(s); const o = s.options[s.selectedIndex]; const t = document.createElement('span');
    t.textContent = o ? o.text : ''; t.style.cssText = `position:absolute;font:${c.font};white-space:nowrap`; document.body.appendChild(t);
    const tw = t.getBoundingClientRect().width; t.remove(); const w = s.getBoundingClientRect().width;
    return { text: o?.text, w: +w.toFixed(1), textW: +tw.toFixed(1), pl: c.paddingLeft, pr: c.paddingRight, room: +(w - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight) - tw).toFixed(1) };
  }));
  console.log(n, JSON.stringify(r)); await b.close();
}
