// L03b4 (vòng 56, 31/10/2026) — quét HTML preview: trang sản phẩm nào render icon Font Awesome nào (chọn trang kiểm).
// Chạy: node ui-loop/checks/L03b4-scan.mjs
const BASE = 'http://localhost:3000';
import { createRequire } from 'node:module';
const { products } = createRequire(import.meta.url)('../../data/products.js');
const handles = products.map((p) => p.alias || p.handle).filter(Boolean);
const extra = ['/?tpl=product.favorite', '/?tpl=product.viewed'];
const urls = [...handles.map((h) => '/products/' + h), ...extra];
for (const u of urls) {
  const html = await (await fetch(BASE + u)).text();
  const fa = {}; for (const m of html.matchAll(/<i class="(fa-[^"]*)"/g)) fa[m[1]] = (fa[m[1]] || 0) + 1;
  const tags = ['pc-pdp-expert-section', 'Hỏi chuyên gia về sản phẩm', 'play-video', 'modal-store-product', 'popup-video', 'tragop-button', 'pc-stars"', 'modal-specifications'].filter((t) => html.includes(t));
  console.log(u, JSON.stringify(fa), tags.join(','));
}
