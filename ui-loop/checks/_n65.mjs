import { chromium } from 'playwright';
const b = await chromium.launch();
for (const w of [390, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('http://localhost:3000/?tpl=customers/addresses', { waitUntil: 'load' });
  await p.evaluate(() => { document.getElementById('add_address').style.display = 'block'; });
  await p.waitForTimeout(400);
  console.log(w, JSON.stringify(await p.evaluate(() => {
    const f = document.getElementById('add_address');
    const sel = f.querySelector('select'); const fs = sel.closest('fieldset') || sel.parentElement;
    const lab = fs.querySelector('label'); const g = (e) => { const r = e.getBoundingClientRect(); return [+r.x.toFixed(1), +r.y.toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)]; };
    const sr = sel.getBoundingClientRect(); const cs = getComputedStyle(sel);
    return { name: sel.name, value: sel.options[sel.selectedIndex]?.text, label: lab?.textContent.trim(), labRect: lab ? g(lab) : null, selRect: g(sel),
      selPadTop: cs.paddingTop, selFont: cs.fontSize, selLine: cs.lineHeight, labFont: lab ? getComputedStyle(lab).fontSize : null,
      textTopApprox: +(sr.y + parseFloat(cs.paddingTop)).toFixed(1) };
  })));
  await p.close();
}
await b.close();
