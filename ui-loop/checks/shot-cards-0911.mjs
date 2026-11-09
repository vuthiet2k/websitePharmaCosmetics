import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.goto(process.argv[2] || 'http://localhost:3000/', { waitUntil: 'networkidle', timeout: 90000 }); await p.addStyleTag({ content: '#dev-toolbar,.dev-toolbar-show{display:none!important}' });
for (const [i, sel] of ['.section_flash_sale', '.section_featured_products'].entries()) { const el = p.locator(sel).first(); if (!(await el.count())) continue; await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1200);
  console.log(sel, await p.evaluate(s => [...document.querySelectorAll(s + ' .pc-h4-pcard__a .pc-btn')].map(e => e.scrollWidth > e.clientWidth ? 'CUT:' + e.textContent : 'ok').join(','), sel));
  await el.screenshot({ path: `${process.argv[3] || 'ui-loop/evidence/mobile-plan-0911'}-cards${i}.png` }); }
await b.close();
