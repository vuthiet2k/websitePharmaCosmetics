# Kiểm kê CSS cũ ↔ thư viện (UI-STANDARD B.6)

## Class trùng giữa `assets/pc-legacy-tw.css` và `assets/pc-ui.css` (D06, 24/10/2026)

Đo bằng `node ui-loop/evidence/D06/overlap.mjs` (so từng cặp ngữ cảnh @media + selector, đã chuẩn hoá khác biệt do minify
và tiền tố autoprefixer): **454 selector trùng · 418 khai báo giống · 36 khai báo khác**.

**Thứ tự nạp hiện tại:** `pc-legacy-tw.css` là stylesheet CUỐI `<head>` — đúng chỗ Tailwind CDN cũ chèn `<style>` lúc chạy,
nên D06 không đổi giao diện: ở 36 class khác nhau dưới đây, **bản cũ (legacy) vẫn thắng** như thời CDN. Câu "pc-ui.css nạp
sau nên thang mới thắng" ở B.6 chỉ đúng khi đảo thứ tự nạp / xoá legacy (đợt 12, D09) — đó là thay đổi giao diện có chủ đích,
phải kiểm ảnh riêng, không làm trong D06.

| Class | Khác ở đâu (legacy → pc-ui) |
| :-- | :-- |
| `text-xs` `text-sm` `text-base` `text-lg` `text-xl` `text-2xl` `text-3xl` | Cỡ chữ: `var(--fs-*)` + line-height tỉ lệ (thang cũ, nhân `theme_font_scale`) → px cố định 12/14/16/18/20/24/30 + line-height px (B.4) |
| `rounded-xl` `rounded-2xl` | `.75rem` / `1rem` (theo cỡ chữ html 14,4–15px ⇒ 10,8–15px) → 12px / 16px |
| `truncate` `line-clamp-1` `line-clamp-2` `border-y` | Cùng kết quả — bản minify của pc-ui gộp/tách khai báo sang quy tắc khác (`white-space:nowrap`, `overflow:hidden`, `border-bottom-width`) |
| `bg-white/15` `/20` `/25`, `hover:bg-white/10` `/15` `/25`, `border-white/40`, `bg-slate-50/50` | Cùng màu, cú pháp `rgb(… / a)` ↔ `hsla()` (minify) |
| `-translate-x-1/2` `-translate-y-1/2` `translate-x-1` `rotate-180` `active:scale-95` `active:scale-[.98]` `group-hover:*` `blur` `invert` | Chuỗi `transform` / `filter` có thêm biến (cùng kết quả) |
| `transition` `transition-all` `transition-colors` `transition-transform` `duration-300` | Danh sách thuộc tính / đơn vị (`300ms` ↔ `.3s`), tiền tố -webkit- |

Danh sách đầy đủ 36 dòng (khai báo từng bên): `ui-loop/evidence/D06/overlap.txt`.
