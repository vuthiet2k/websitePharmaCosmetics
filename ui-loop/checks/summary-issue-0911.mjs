// 09/11/2026 — tìm lỗi Chrome «Interactive element inside of a <summary>» (Audits ElementAccessibilityIssue) theo trang, 390px
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:3000';
const paths = (process.argv[3] || '/,/collections/all,/kem-duong-retinol-0-3-peptide,/tin-tuc,/account/login,/skin-health-beauty,/dat-lich-tu-van').split(',');
const b = await chromium.launch(); let total = 0;
for (const path of paths) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); const is = []; cdp.on('Audits.issueAdded', e => { if (e.issue.code === 'ElementAccessibilityIssue') is.push(e.issue.details.elementAccessibilityIssueDetails); }); await cdp.send('Audits.enable');
  try { await p.goto(base + path, { waitUntil: 'networkidle', timeout: 90000 }); } catch (e) { console.log(path, 'ERR', e.message.slice(0, 80)); }
  await p.waitForTimeout(1500);
  const where = await p.evaluate(() => [...document.querySelectorAll('summary')].flatMap(s => [...s.querySelectorAll('a,button,input,select,textarea,[tabindex],iframe,label')].map(e => (s.closest('[class]')?.className || '').toString().slice(0, 40) + ' > ' + e.outerHTML.slice(0, 120))));
  console.log(path, 'issues=' + is.length, is.map(i => i.elementAccessibilityIssueReason).join(','), '\n   ' + where.join('\n   ')); total += is.length; await ctx.close();
}
await b.close(); console.log('TOTAL', total); process.exit(total ? 1 : 0);
