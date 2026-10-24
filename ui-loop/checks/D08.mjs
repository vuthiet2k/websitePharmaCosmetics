#!/usr/bin/env node
/*
  ui-loop/checks/D08.mjs — kiểm việc D08: dữ liệu mẫu local cho 3 mục trước đây cần Sapo thật.
    (a) /chinh-xach-doi-tra (handle THẬT của trang đổi trả, menu Sapo `chinh-sach`): HTTP 200, đúng 1 h1 nhìn thấy chứa "ĐỔI/ TRẢ";
    (b) URL tag bài viết theo cú pháp tìm theo tag của Sapo `/search?query=tags:(<tag>)&type=article`
        (theme gốc: snippets/header.bwt:235, snippets/tab_product.bwt:248): ≥ 1 bài, 100 % bài có tag; tag không có ⇒ 0 bài;
        tìm từ khoá thường cho số kết quả (search_count) bằng lúc trước khi sửa;
    (c) gợi ý tìm kiếm: view=smartjson / smartjsonar trả JSON ≥ 1 kết quả; gõ "retinol" vào ô tìm kiếm header ⇒ ≥ 1 .product-smart
        nhìn thấy (theme fetch `https://<hostname>/search…` — chuyển về server local bằng page.route), link SP đầu HTTP 200;
    (d) 0 lỗi JS (pageerror) trên các trang kiểm.
  7 khung: Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13. Ảnh: ui-loop/evidence/D08/after-<khung>-{page,tag,suggest}.png
  Chạy: node ui-loop/checks/D08.mjs [before]   (before = chỉ đo HTTP, ghi evidence/D08/before.json)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'D08');
fs.mkdirSync(EVD, { recursive: true });
const BASE = 'http://localhost:3000';
const MODE = process.argv[2] || 'after';
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

// Tag mong đợi lấy thẳng từ dữ liệu mẫu (không ghi tay danh sách bài)
const { articles = [], blogs = {} } = (await import('node:module')).createRequire(import.meta.url)(path.join(ROOT, 'data', 'articles.js'));
const allArticles = [...new Map([...articles, ...Object.values(blogs).flatMap((b) => b.articles || [])].map((a) => [a.url || a.title, a])).values()];
const titlesWithTag = (t) => allArticles.filter((a) => (a.tags || []).includes(t)).map((a) => a.title);

const HTTP_URLS = {
  page: '/chinh-xach-doi-tra',
  tag1: '/search?query=tags:(retinol)&type=article',
  tag2: '/search?query=tags:((retinol))&type=article',
  tagNone: '/search?query=tags:(khong-co-tag-nay)&type=article',
  kwProduct: '/search?query=retinol&type=product',
  kwArticle: '/search?query=retinol&type=article',
  smart: '/search?q=retinol&view=smartjson&type=product',
  smartAr: '/search?q=retinol&view=smartjsonar&type=article',
};

const httpProbe = async () => {
  const out = {};
  for (const [k, u] of Object.entries(HTTP_URLS)) {
    const r = await fetch(BASE + u);
    const body = await r.text();
    const rec = { url: u, status: r.status, bytes: body.length };
    if (k.startsWith('smart')) {
      try { const j = JSON.parse(body); rec.json = true; rec.keys = Object.keys(j).filter((x) => x !== 'searchResultCount'); rec.items = rec.keys.map((x) => j[x]); }
      catch { rec.json = false; rec.head = body.slice(0, 120); }
    } else {
      rec.searchCount = (body.match(/class="search_count">(\d+)</) || body.match(/Có (\d+) kết quả tìm kiếm/) || [])[1] ?? null;
      rec.articleTitles = [...body.matchAll(/<div class="blog_content">\s*<h3><a [^>]*title="([^"]*)"/g)].map((m) => m[1]);
    }
    out[k] = rec;
  }
  return out;
};

const http = await httpProbe();
if (MODE === 'before') {
  fs.writeFileSync(path.join(EVD, 'before.json'), JSON.stringify(http, null, 2));
  for (const [k, r] of Object.entries(http)) console.log(k, r.status, r.url, 'search_count', r.searchCount ?? '-', 'bài', r.articleTitles?.length ?? '-', 'json', r.json ?? '-', 'mục', r.keys?.length ?? '-');
  process.exit(0);
}

const before = JSON.parse(fs.readFileSync(path.join(EVD, 'before.json'), 'utf8'));
console.log('HTTP / dữ liệu:');
const expTag = titlesWithTag('retinol');
for (const k of ['page', 'tag1', 'tag2', 'tagNone', 'kwProduct', 'kwArticle', 'smart', 'smartAr']) ok(http[k].status === 200, `${http[k].url} HTTP ${http[k].status}`);
for (const k of ['tag1', 'tag2']) {
  const t = http[k].articleTitles;
  ok(t.length >= 1, `${k}: liệt kê ${t.length} bài (dữ liệu có ${expTag.length} bài tag retinol)`);
  ok(t.length > 0 && t.every((x) => expTag.includes(x)), `${k}: ${t.filter((x) => expTag.includes(x)).length}/${t.length} bài có tag retinol`);
  ok(t.length === expTag.length, `${k}: đủ ${t.length}/${expTag.length} bài có tag`);
}
ok(http.tagNone.articleTitles.length === 0, `tag không có: ${http.tagNone.articleTitles.length} bài`);
ok(http.kwProduct.searchCount === before.kwProduct.searchCount, `từ khoá SP "retinol": search_count ${before.kwProduct.searchCount} → ${http.kwProduct.searchCount}`);
ok(http.kwArticle.searchCount === before.kwArticle.searchCount, `từ khoá bài "retinol": search_count ${before.kwArticle.searchCount} → ${http.kwArticle.searchCount} (bài hiển thị ${before.kwArticle.articleTitles.length} → ${http.kwArticle.articleTitles.length})`);
ok(http.smart.json && http.smart.keys.length >= 1 && http.smart.items.every((i) => i.name && i.url && i.price), `smartjson: JSON ${http.smart.json}, ${http.smart.keys?.length} SP (trước ${before.smart.keys?.length}) — ${http.smart.items?.map((i) => i.name + ' ' + i.price).join(' | ')}`);
ok(http.smartAr.json && http.smartAr.keys.length >= 1 && http.smartAr.items.every((i) => i.name && i.url), `smartjsonar: JSON ${http.smartAr.json}, ${http.smartAr.keys?.length} bài (trước ${before.smartAr.keys?.length})`);

const FRAMES = [
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];
const browsers = {};
for (const f of FRAMES) {
  console.log(`\n${f.name}:`);
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext({ ...f.opts });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  // Theme gọi https://<hostname>/search… (Sapo luôn https) — local là http:3000
  await page.route(/^https:\/\/localhost\/search/, async (route) => {
    const u = new URL(route.request().url());
    const r = await fetch(BASE + u.pathname + u.search);
    route.fulfill({ status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' }, body: await r.text() });
  });

  // (a) trang đổi trả
  const resp = await page.goto(BASE + HTTP_URLS.page, { waitUntil: 'load' });
  const h1 = await page.$$eval('h1', (hs) => hs.map((h) => { const r = h.getBoundingClientRect(); const s = getComputedStyle(h); return { t: h.textContent.trim(), vis: r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0', y: Math.round(r.top + scrollY), fs: s.fontSize }; }));
  ok(resp.status() === 200 && h1.length === 1 && h1[0].vis && h1[0].t.includes('ĐỔI/ TRẢ'), `đổi trả: HTTP ${resp.status()}, h1 ×${h1.length} "${h1[0]?.t}" nhìn thấy ${h1[0]?.vis} (y ${h1[0]?.y}px, ${h1[0]?.fs})`);
  await page.screenshot({ path: path.join(EVD, `after-${f.name}-page.png`) });

  // (b) trang tag
  await page.goto(BASE + HTTP_URLS.tag1, { waitUntil: 'load' });
  const cards = await page.$$eval('.item-blog-all', (cs) => cs.map((c) => { const r = c.getBoundingClientRect(); return { t: c.querySelector('h3 a')?.textContent.trim(), vis: r.width > 0 && r.height > 0 }; }));
  ok(cards.length >= 1 && cards.every((c) => c.vis && expTag.includes(c.t)), `tag retinol: ${cards.filter((c) => c.vis).length}/${cards.length} thẻ bài nhìn thấy, có tag: ${cards.filter((c) => expTag.includes(c.t)).length}`);
  const first = await page.$('.item-blog-all');
  if (first) await first.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(EVD, `after-${f.name}-tag.png`) });

  // (c) gợi ý tìm kiếm trong header
  await page.goto(BASE + '/', { waitUntil: 'load' });
  const input = await page.evaluateHandle(() => [...document.querySelectorAll('.header_tim_kiem input[type="text"], .search-mobile input[type="text"]')].find((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(i).visibility !== 'hidden'; }) || null);
  let opened = 'ô hiện sẵn';
  const headerInp = await input.evaluate((i) => !!i);
  const hdr = await page.$eval('.header_tim_kiem input[name="query"]', (i) => { const r = i.getBoundingClientRect(); return `${Math.round(r.width)}×${Math.round(r.height)}`; }).catch(() => 'không có');
  if (!headerInp) {
    // Ô header (nơi JS gợi ý theme.bwt lắng nghe) không nhìn thấy ⇒ dùng ô tìm kiếm thật người dùng thấy: overlay #mb-search-popup
    const trig = await page.$('#mb-search-open');
    if (trig && await trig.isVisible()) { await trig.click(); opened = 'bấm #mb-search-open → overlay'; await page.waitForTimeout(500); }
  }
  const inp = await page.evaluateHandle(() => [...document.querySelectorAll('.header_tim_kiem input[type="text"], .search-mobile input[type="text"], #mb-search-input')].find((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(i).visibility !== 'hidden'; }) || null);
  const hasInp = await inp.evaluate((i) => !!i);
  const inpId = hasInp ? await inp.evaluate((i) => i.id || i.className) : '-';
  ok(hasInp, `ô tìm kiếm nhìn thấy — thông tin: ô .header_tim_kiem nhìn thấy ${headerInp} (.header_tim_kiem — nơi JS gợi ý lắng nghe) nhìn thấy: ${headerInp} (cỡ ${hdr}); ô thật người dùng gõ: ${inpId} (${opened})`);
  if (hasInp) {
    await inp.click();
    await page.keyboard.type('retinol', { delay: 40 });
    await page.waitForFunction(() => [...document.querySelectorAll('.list-search .product-smart')].some((a) => a.getBoundingClientRect().height > 0), null, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const sug = await page.$$eval('.list-search .product-smart', (as) => as.map((a) => { const r = a.getBoundingClientRect(); return { name: (a.title || a.querySelector('.product-name')?.textContent || a.textContent).trim().replace(/\s+/g, ' '), href: a.getAttribute('href'), vis: r.width > 0 && r.height > 0, top: Math.round(r.top), h: Math.round(r.height) }; }));
    const ars = await page.$$eval('.list-search2 .art-smart', (as) => as.length);
    const notFound = await page.$$eval('.list-search .not-pro', (n) => n.length);
    const vis = sug.filter((s) => s.vis);
    ok(vis.length >= 1 && notFound === 0, `gợi ý "retinol": ${vis.length} SP nhìn thấy (${vis.map((s) => s.name).join(' | ')}), bài ${ars}, "Không có thấy" ${notFound}`);
    if (vis[0]) {
      const r = await fetch(BASE + vis[0].href);
      ok(r.status === 200, `link SP gợi ý đầu ${vis[0].href} HTTP ${r.status} (khung gợi ý top ${vis[0].top}px, cao ${vis[0].h}px)`);
    }
    await page.screenshot({ path: path.join(EVD, `after-${f.name}-suggest.png`) });
  }
  ok(errs.length === 0, `lỗi JS: ${errs.length}${errs.length ? ' — ' + errs.slice(0, 3).join(' / ') : ''}`);
  await ctx.close();
}
for (const b of Object.values(browsers)) await b.close();
console.log(`\nKẾT QUẢ D08: ${fail === 0 ? 'ĐẠT' : 'CHƯA ĐẠT (' + fail + ' mục ✗)'}`);
process.exit(fail ? 1 : 0);
