// L03c1 — CDN Sapo trả /thumb/<cỡ>/ cho những loại đường dẫn nào (products / collections / theme_temp / files), cỡ nào hợp lệ.
// Chạy: node ui-loop/checks/L03c1-cdn.mjs
const H = 'https://bizweb.dktcdn.net/';
const P = {
  files: '100/415/053/files/vjbdjv.webp?v=1758533',
  sp: '100/415/053/products/die-u-tri-chuye-n-nghie-p.jpg?v=1758790026057',
};
for (const [k, p] of Object.entries(P)) {
  for (const size of ['', 'pico', 'icon', 'thumb', 'small', 'compact', 'medium', 'large', 'grande', '1024x1024', '2048x2048', 'master', '480x480']) {
    const url = H + (size ? `thumb/${size}/` : '') + p;
    try {
      const r = await fetch(url, { headers: { Accept: 'image/avif,image/webp,*/*' } });
      const b = Buffer.from(await r.arrayBuffer());
      console.log(`${k.padEnd(5)} ${(size || 'gốc').padEnd(10)} ${r.status} ${(r.headers.get('content-type') || '').padEnd(11)} ${String(Math.round(b.length / 1024)).padStart(4)}KB`);
    } catch (e) { console.log(k, size, 'LỖI', e.message); }
  }
}
