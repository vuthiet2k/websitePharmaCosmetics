// L03a (vòng 42, 30/10/2026): swiper.js + lazy.js nạp defer, jQuery giữ đồng bộ (phương án 2 — ui-loop/proposals/L03a.md).
// So 2 biến thể trên CÙNG mã đã sửa: "dong-bo" = page.route bỏ defer ở 2 thẻ swiper/lazy (mô phỏng trước khi sửa — các khối
// khởi tạo đã bọc DOMContentLoaded vẫn chạy y như cũ khi Swiper có sẵn), "defer" = bản sửa.
// Đo: script đồng bộ trong head, lỗi JS, số Swiper khởi tạo, bấm next (chuột + bàn phím) đổi slide, ảnh .lazyload màn đầu đã tải.
// Chạy: node ui-loop/checks/L03a.mjs [--perf]   (ảnh: ui-loop/evidence/L03a/after-<trình duyệt>-<khung>-<trang>.png)
import { chromium, webkit, devices } from 'playwright';
import fs from 'fs';
const BASE = 'http://localhost:3000';
const OUT = 'ui-loop/evidence/L03a';
fs.mkdirSync(OUT, { recursive: true });
const PAGES = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/tin-tuc',
  '/blogs/tin-tuc-va-kien-thuc/retinol-thanh-phan-vang-chong-lao-hoa', '/skin-health-beauty'];
const SHOT = { '/': 'home', '/products/serum-vitamin-c-15': 'pdp', '/?tpl=cart': 'cart', '/tin-tuc': 'tintuc' };
const FRAMES = [
  { name: 'chromium-390', br: 'chromium', ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { name: 'webkit-390', br: 'webkit', ctx: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', br: 'chromium', ctx: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true } },
  { name: 'chromium-768', br: 'chromium', ctx: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', br: 'chromium', ctx: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', br: 'chromium', ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-844x390', br: 'chromium', ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];
const SYNC_RE = /<script defer src="([^"]*\/(swiper|lazy)\.js[^"]*)"><\/script>/g;

// Phần đo tốc độ route CẢ 2 biến thể (bản defer giữ nguyên HTML): HTML qua route.fetch không chịu giới hạn băng thông CDP
// như request thường — lượt 1 vòng 42 chỉ route bản đồng bộ nên bản đồng bộ được lợi giả (FCP / 7 588 vs 8 716 ms).
async function routeSync(target, keep) {
  await target.route((u) => u.origin === BASE && !/\/assets\//.test(u.pathname), async (route) => {
    const r = await route.fetch(); const t = await r.text(); const h = keep ? t : t.replace(SYNC_RE, '<script src="$1"></script>');
    await route.fulfill({ response: r, body: h });
  });
}

async function measure(ctx, pth, variant, shot) {
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
  if (variant === 'dong-bo') await routeSync(p);
  await p.goto(BASE + pth, { waitUntil: 'load', timeout: 90000 });
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const sw = [...document.querySelectorAll('.swiper-container-initialized, .swiper-initialized')];
    const lazyTop = [...document.querySelectorAll('img.lazyload')].filter((i) => { const r = i.getBoundingClientRect(); return vis(i) && r.top < innerHeight && r.bottom > 0; });
    return {
      syncHead: [...document.querySelectorAll('head script[src]:not([async]):not([defer]):not([type=module])')].map((s) => s.src.split('/').pop().split('?')[0]),
      swipers: sw.length,
      lazyTop: lazyTop.length, lazyTopLoaded: lazyTop.filter((i) => i.complete && i.naturalWidth > 0).length,
    };
  });
  if (shot) await p.screenshot({ path: shot, fullPage: false });
  // Bấm next từng Swiper có nút next nhìn thấy, chưa vô hiệu; đo transform wrapper đổi. Lẻ = chuột, chẵn = bàn phím (focus + Enter).
  const n = info.swipers; const clicks = [];
  for (let i = 0; i < n; i++) {
    const r = await p.evaluate(async (i) => {
      const el = [...document.querySelectorAll('.swiper-container-initialized, .swiper-initialized')][i];
      const sw = el.swiper; if (!sw) return { skip: 'no-instance' };
      const nx = sw.navigation && sw.navigation.$nextEl && sw.navigation.$nextEl[0];
      if (!nx) return { skip: 'no-next' };
      const rr = nx.getBoundingClientRect(); const cs = getComputedStyle(nx);
      if (rr.width === 0 || cs.display === 'none' || cs.visibility === 'hidden' || nx.classList.contains('swiper-button-disabled') || sw.isEnd) return { skip: 'next-an-hoac-het' };
      nx.scrollIntoView({ block: 'center' });
      nx.setAttribute('data-l03a-next', String(i));
      return { cls: (el.className || '').split(' ').filter((c) => !/^swiper-/.test(c)).slice(0, 2).join('.') || el.className.split(' ')[0], before: sw.activeIndex, tf: getComputedStyle(sw.wrapperEl).transform };
    }, i);
    if (r.skip) { clicks.push({ i, skip: r.skip }); continue; }
    const loc = p.locator(`[data-l03a-next="${i}"]`);
    const how = i % 2 ? 'chuot' : 'ban-phim';
    try {
      if (how === 'chuot') await loc.click({ timeout: 3000, force: true });
      else { await loc.focus(); await p.keyboard.press('Enter'); }
    } catch (e) { clicks.push({ i, cls: r.cls, how, ok: false, err: 'khong-bam-duoc' }); continue; }
    await p.waitForTimeout(900);
    const a = await p.evaluate((i) => { const el = [...document.querySelectorAll('.swiper-container-initialized, .swiper-initialized')][i]; return { after: el.swiper.activeIndex, tf: getComputedStyle(el.swiper.wrapperEl).transform }; }, i);
    clicks.push({ i, cls: r.cls, how, ok: a.after !== r.before || a.tf !== r.tf });
  }
  // Escape không gây lỗi; Tab / Shift+Tab đi được
  await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Escape');
  await p.close();
  return { ...info, errs, clicks };
}

const results = [];
const brs = { chromium: await chromium.launch(), webkit: await webkit.launch() };
const PERF_ONLY = process.argv.includes('--perf-only');
// --no-route=<nhãn>: đo đúng như ui-verify --perf (không page.route) trạng thái mã hiện tại, 1 biến thể — dùng để so A/B bằng cách
// tạm đổi thẻ script trong theme.bwt (vòng 42: biến thể đồng bộ đo xong đã hoàn lại defer).
const NO_ROUTE = (process.argv.find((x) => x.startsWith('--no-route=')) || '').slice(11);
for (const f of PERF_ONLY ? [] : FRAMES) {
  for (const pth of PAGES) {
    const row = { frame: f.name, path: pth };
    for (const v of ['dong-bo', 'defer']) {
      const ctx = await brs[f.br].newContext(f.ctx);
      const shot = v === 'defer' && SHOT[pth] ? `${OUT}/after-${f.name}-${SHOT[pth]}.png` : null;
      try { row[v] = await measure(ctx, pth, v, shot); } catch (e) { row[v] = { fail: e.message.slice(0, 120) }; }
      await ctx.close();
    }
    const s = row['dong-bo'], d = row.defer;
    const newErr = (d.errs || []).filter((e) => !(s.errs || []).includes(e));
    const okS = (s.clicks || []).filter((c) => c.ok).length, okD = (d.clicks || []).filter((c) => c.ok).length;
    // Tiêu chí: từng slider đổi slide NHƯ bản đồng bộ (slider đã không bấm được từ trước ⇒ ghi riêng, không tính hồi quy).
    const sOk = new Map((s.clicks || []).map((c) => [c.i, c.ok]));
    const badD = (d.clicks || []).filter((c) => c.ok === false && sOk.get(c.i) !== false);
    const oldBad = (d.clicks || []).filter((c) => c.ok === false && sOk.get(c.i) === false);
    if (oldBad.length) console.log(`   (lỗi CŨ, bản đồng bộ cũng vậy) ${f.name} ${pth}: ${oldBad.map((c) => c.cls + '/' + c.how + (c.err ? '/' + c.err : '')).join(', ')}`);
    row.pass = !d.fail && !s.fail && newErr.length === 0 && d.swipers === s.swipers && okD >= okS && badD.length === 0
      && !(d.syncHead || []).some((x) => /swiper|lazy/.test(x)) && d.lazyTopLoaded >= s.lazyTopLoaded;
    results.push(row);
    console.log(`${row.pass ? 'ĐẠT ' : 'CHƯA'} ${f.name.padEnd(16)} ${pth.padEnd(28).slice(0, 28)} head đồng bộ [${(d.syncHead || []).join(',')}] (trước [${(s.syncHead || []).join(',')}]) · Swiper ${s.swipers}→${d.swipers} · bấm next đổi slide ${okS}→${okD}/${(d.clicks || []).filter((c) => !c.skip).length}${badD.length ? ' HỎNG ' + badD.map((c) => c.cls + '/' + c.how).join(',') : ''} · lazy màn đầu tải ${s.lazyTopLoaded}/${s.lazyTop}→${d.lazyTopLoaded}/${d.lazyTop} · lỗi JS ${(s.errs || []).length}→${(d.errs || []).length}, mới ${newErr.length}${newErr.length ? ' — ' + newErr.join(' | ') : ''}${d.fail ? ' FAIL ' + d.fail : ''}`);
  }
}
await brs.chromium.close(); await brs.webkit.close();
if (!PERF_ONLY) fs.writeFileSync(`${OUT}/after-run.json`, JSON.stringify(results, null, 1));
const bad = results.filter((r) => !r.pass);
console.log(`\nTỔNG: ${results.length - bad.length}/${results.length} lượt đạt`);

if (process.argv.includes('--perf') || PERF_ONLY) {
  // Cùng điều kiện ui-verify --perf: 390 Chromium, 1,6 Mbps, RTT 150ms, CPU 4×, tắt cache, trung vị 3 lần.
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const br = await chromium.launch();
  const PP = (process.argv.find((x) => x.startsWith('--pages=')) || '').slice(8);
  for (const pth of PP ? PP.split(',') : ['/', '/collections/all', '/products/serum-vitamin-c-15', '/tin-tuc']) {
    const out = {};
    for (const v of NO_ROUTE ? [NO_ROUTE] : ['dong-bo', 'defer']) {
      const rs = [];
      for (let k = 0; k < 3; k++) {
        const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
        const p = await ctx.newPage(); if (!NO_ROUTE) await routeSync(p, v === 'defer');
        const cdp = await ctx.newCDPSession(p);
        await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await p.addInitScript(() => { window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); });
        await p.goto(BASE + pth, { waitUntil: 'load', timeout: 180000 }); await p.waitForTimeout(2500);
        rs.push(await p.evaluate(() => ({ fcp: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0), lcp: Math.round(window.__lcp) })));
        await ctx.close();
      }
      out[v] = { fcp: med(rs.map((r) => r.fcp)), lcp: med(rs.map((r) => r.lcp)) };
    }
    if (NO_ROUTE) { console.log(`PERF [${NO_ROUTE}, không route] ${pth}: FCP ${out[NO_ROUTE].fcp} ms · LCP ${out[NO_ROUTE].lcp} ms`); continue; }
    const ok = out.defer.fcp <= out['dong-bo'].fcp * 1.1 && out.defer.lcp <= out['dong-bo'].lcp * 1.1;
    console.log(`PERF ${ok ? 'ĐẠT ' : 'CHƯA'} ${pth}: FCP ${out['dong-bo'].fcp} → ${out.defer.fcp} ms · LCP ${out['dong-bo'].lcp} → ${out.defer.lcp} ms`);
  }
  await br.close();
}
