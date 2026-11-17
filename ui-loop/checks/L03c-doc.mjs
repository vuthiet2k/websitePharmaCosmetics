// Vòng 115 (09/11/2026): cập nhật docs/UI-STANDARD.md E.7 (L03c + L03c1–5 + N70) và E.8 (N70). Chạy 1 lần.
import fs from 'node:fs';
const F = 'docs/UI-STANDARD.md';
const L = fs.readFileSync(F, 'utf8').split('\n');
if (L.some((l) => l.startsWith('| L03c1 |'))) { console.log('đã có'); process.exit(0); }
const i = L.findIndex((l) => l.startsWith('| L03c |'));
L[i] = '| L03c | 3 | Tốc độ phần c: ảnh đúng cỡ (`img_url` theo khung), srcset, WebP khi có, preload ảnh LCP (gộp phần lớn L37 + phần N23) | ⬜ Chưa sửa (đã kiểm kê, tách L03c1–5) | — | 09/11/2026 | Vòng 115 kiểm kê 10 trang PERF (checks/L03c.mjs): FCP 4G ≈ lúc HTML 283–501 KB tải xong (7,4–11,2 s) ⇒ G.7 không đạt bằng phần ảnh (N70); preview img_url trả nguyên URL ⇒ ảnh SP 2000×2000 203–445 KB (L03c1); icon hoạt chất 500–900px vào ô 56px (L03c2); LCP /soi-da ảnh 201 KB 15,7 s (L03c3); LCP /dat-lich-tu-van linh vật GIF 53 KB 12,0 s (L03c4); logo màn đầu lazy (L03c5); srcset 0 ảnh |';
L.splice(i + 1, 0,
  '| L03c1 | 3 | L03c phần 1 — preview mô phỏng img_url Sapo cho ảnh CDN bizweb (`/thumb/<cỡ>/`, dev-server.js) | ⬜ | — | 09/11/2026 | before: /collections/all 5 ảnh > 200 KB (2000×2000 → 181px), /skinhealthy-services 3 |',
  '| L03c2 | 3 | L03c phần 2 — icon nhóm hoạt chất trang chủ lấy img_url ≤ 240px | ⬜ | — | 09/11/2026 | before: 11 icon 300–959px, 12–211 KB, hiển thị 56×56 |',
  '| L03c3 | 3 | L03c phần 3 — /soi-da ảnh chờ (LCP): srcset theo khung + ưu tiên tải | ⬜ | — | 09/11/2026 | before: 1437×1078 201 KB; LCP 4G 15 708 ms, FCP 11 192 |',
  '| L03c4 | 3 | L03c phần 4 — linh vật support_mascot.gif (LCP /dat-lich-tu-van): bỏ GIF, ≤ 20 KB, không thành LCP muộn | ⬜ | — | 09/11/2026 | before: 96×96 53 KB GIF lazy ở màn đầu; LCP 4G 11 984 ms (FCP 7 616) |',
  '| L03c5 | 3 | L03c phần 5 — logo PharmaCosmetics.svg màn đầu bỏ loading=lazy | ⬜ | — | 09/11/2026 | before: 10/10 trang có bản logo lazy ở màn đầu |');
const j = L.findIndex((l) => l.startsWith('| N69 | 7 | Tim app'));
L.splice(j + 1, 0, '| N70 | 3 | Preview không nén gzip/br ⇒ FCP 4G local ≈ lúc HTML tải xong; cần chủ dự án duyệt đổi môi trường đo | ⬜ | — | 09/11/2026 | / HTML 373 KB xong 10 069 ms, FCP 9 364 |');
const k = L.findIndex((l) => l.startsWith('| N69 | Vòng 113'));
L.splice(k + 1, 0, '| N70 | Vòng 115 / 09/11/2026 | Preview (dev-server.js) không nén HTML/CSS/JS (không content-encoding khi Accept-Encoding gzip) trong khi Sapo thật nén ⇒ 4G 1,6 Mbps: FCP ≈ lúc HTML 283–501 KB tải xong (5,1–10,1 s) ở 10 trang PERF — ngưỡng G.7 FCP ≤ 1,8s không đo đúng ở local | 10 trang PERF | Kiểm kê L03c | ⬜ |');
fs.writeFileSync(F, L.join('\n'));
console.log('ok', i, j, k);
