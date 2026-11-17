import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('ERR', String(e).slice(0, 200)));
await p.goto('http://localhost:3000/?tpl=customers/addresses', { waitUntil: 'load' });
await p.waitForTimeout(800);
const chain = () => p.evaluate(() => {
  const i = document.getElementById('address_default_address_'); let e = i; const ch = [];
  while (e && e !== document.body) { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); ch.push(`${e.tagName}.${String(e.className).slice(0, 50)}#${e.id} d=${c.display} v=${c.visibility} o=${c.opacity} ${r.width}x${r.height}`); e = e.parentElement; }
  return [typeof Bizweb, typeof Bizweb !== 'undefined' && typeof Bizweb.CustomerAddress, ...ch].join('\n');
});
console.log(await chain());
await p.locator('.pc-acc-addr-add').first().click(); await p.waitForTimeout(600);
console.log('---'); console.log(await chain());
await b.close();
