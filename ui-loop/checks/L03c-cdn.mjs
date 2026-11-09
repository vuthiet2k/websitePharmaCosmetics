// L03c — CDN Sapo (bizweb.dktcdn.net) có trả bản thu nhỏ /thumb/<cỡ>/ cho từng loại đường dẫn ảnh đang dùng không, cỡ bao nhiêu,
// có trả WebP khi trình duyệt gửi Accept: image/webp không. Chạy: node ui-loop/checks/L03c-cdn.mjs
const H = 'https://bizweb.dktcdn.net/';
const P = {
  sp: '100/415/053/products/die-u-tri-chuye-n-nghie-p.jpg?v=1758790026057',
  hero: '100/415/053/theme_temp/1137941/assets/screenshot-2026-06-22-155834-d46675ce-d207-4b65-8d90-529e1f165b4d.png?1782118883116',
  bst: '100/415/053/collections/thie-t-ke-chu-a-co-te-n-85.png?v=1771644280640',
  soida: '100/415/053/theme_temp/1173669/assets/pharmacosmetics-f1be2c3f-6187-490b-b947-57751fafe824.jpg?1792592941234',
};
const dims = (buf, ct) => {
  if (/png/.test(ct)) return buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20);
  if (/webp/.test(ct)) { const t = buf.toString('ascii', 12, 16); if (t === 'VP8 ') return (buf.readUInt16LE(26) & 0x3fff) + 'x' + (buf.readUInt16LE(28) & 0x3fff); if (t === 'VP8X') return (1 + buf.readUIntLE(24, 3)) + 'x' + (1 + buf.readUIntLE(27, 3)); if (t === 'VP8L') { const b = buf.readUInt32LE(21); return (1 + (b & 0x3fff)) + 'x' + (1 + ((b >> 14) & 0x3fff)); } }
  if (/jpe?g/.test(ct)) { let i = 2; while (i < buf.length) { if (buf[i] !== 0xff) { i++; continue; } const m = buf[i + 1]; if (m >= 0xc0 && m <= 0xc3) return buf.readUInt16BE(i + 7) + 'x' + buf.readUInt16BE(i + 5); i += 2 + buf.readUInt16BE(i + 2); } }
  return '?';
};
for (const [k, path] of Object.entries(P)) {
  for (const size of ['', 'small', 'large', 'grande', '1024x1024', '2048x2048']) {
    for (const acc of ['*/*', 'image/avif,image/webp,*/*']) {
      const url = H + (size ? `thumb/${size}/` : '') + path;
      try { const r = await fetch(url, { headers: { Accept: acc } }); const buf = Buffer.from(await r.arrayBuffer()); const ct = r.headers.get('content-type') || '';
        console.log(`${k.padEnd(5)} ${(size || 'gốc').padEnd(9)} Accept=${acc.slice(0, 10).padEnd(10)} ${r.status} ${ct.padEnd(10)} ${String(Math.round(buf.length / 1024)).padStart(4)}KB ${dims(buf, ct)}`);
      } catch (e) { console.log(k, size, 'LỖI', e.message); }
    }
  }
}
