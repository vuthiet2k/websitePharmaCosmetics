// 09/11/2026 — đo hiện trạng các mục kế hoạch «tinh chỉnh mobile» (PLAN-2026-MOBILE-UI-01) trên preview local, 390px.
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:3000/';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage(); const cons = []; p.on('console', m => { if (m.type() === 'error') cons.push(m.text().slice(0, 160)); });
const cdp = await ctx.newCDPSession(p); const issues = []; cdp.on('Audits.issueAdded', e => issues.push(e.issue)); await cdp.send('Audits.enable');
await p.goto(URL, { waitUntil: 'networkidle', timeout: 90000 }); await p.addStyleTag({ content: '#dev-toolbar,.dev-toolbar-show{display:none!important}' });
for (let y = 0; y < 30000; y += 700) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(60); } await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800);
const r = await p.evaluate(() => {
  const R = e => { const x = e.getBoundingClientRect(); return { x: Math.round(x.x), y: Math.round(x.y), w: Math.round(x.width), h: Math.round(x.height) }; };
  const out = {};
  const cards = [...document.querySelectorAll('.pc-h4-pcard')]; out.cards = cards.length;
  const c = cards[0]; if (c) { const cs = getComputedStyle(c), m = c.querySelector('.pc-h4-pcard__media'), mr = R(m), cr = R(c);
    out.card = { pad: cs.padding, radius: cs.borderRadius, card: cr, media: mr, gapTop: mr.y - cr.y, gapL: mr.x - cr.x, gapR: (cr.x + cr.w) - (mr.x + mr.w), mediaRadius: getComputedStyle(m).borderRadius, fit: getComputedStyle(m.querySelector('img')).objectFit };
    const v = c.querySelector('.pc-h4-pcard__v'); out.vendor = v ? { txt: v.textContent, h: R(v).h, disp: getComputedStyle(v).display } : null;
    const t = c.querySelector('.pc-h4-pcard__t'); out.title = { h: R(t).h, lh: getComputedStyle(t).lineHeight };
    const off = c.querySelector('.pc-h4-pcard__off'); out.off = off ? { r: R(off), mediaR: mr } : null; }
  out.btns = [...document.querySelectorAll('.pc-h4-pcard__a .pc-btn')].slice(0, 40).map(e => { const s = getComputedStyle(e), lh = parseFloat(s.lineHeight) || 16; const span = e.querySelector('span') || e;
      return { t: e.textContent.trim(), w: R(e).w, h: R(e).h, rad: s.borderRadius, pad: s.paddingLeft, lines: Math.round(span.getBoundingClientRect().height / lh) }; })
    .filter((v, i, a) => a.findIndex(z => z.t === v.t && z.lines === v.lines) === i);
  // widget nổi góc phải
  out.fixed = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); return s.position === 'fixed' && s.display !== 'none' && s.visibility !== 'hidden' && R(e).w > 0 && R(e).h > 0; })
    .map(e => ({ sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + [...e.classList].slice(0, 3).join('.'), r: R(e), bottom: getComputedStyle(e).bottom, right: getComputedStyle(e).right })).slice(0, 15);
  const nav = document.querySelector('.mobile-bottom-nav, [class*="bottom-nav"]'); out.nav = nav ? { sel: nav.className, r: R(nav), pb: getComputedStyle(nav).paddingBottom } : null;
  out.bodyPb = getComputedStyle(document.body).paddingBottom;
  out.lazyNoDim = [...document.querySelectorAll('img[loading=lazy]')].filter(i => !i.getAttribute('width') || !i.getAttribute('height')).map(i => (i.className || '') + ' ' + i.src.slice(-50)).slice(0, 20);
  out.summaryInteractive = [...document.querySelectorAll('summary')].map(s => [...s.querySelectorAll('a,button,input,select,textarea,[tabindex],h1,h2,h3,h4,h5,h6')].map(e => e.tagName)).flat();
  return out; });
await p.waitForTimeout(500);
console.log(JSON.stringify(r, null, 1));
console.log('ISSUES', JSON.stringify(issues.map(i => i.code + ' ' + JSON.stringify(i.details).slice(0, 220)), null, 1));
console.log('CONSOLE', cons);
await p.screenshot({ path: process.argv[3] || 'ui-loop/evidence/mobile-plan-0911-before.png' });
await b.close();
