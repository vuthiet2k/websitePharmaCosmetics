---
description: Tự review + sửa giao diện/lỗi theme theo bộ rule chuẩn (.clinerules 01/02/03), mở trình duyệt thật kiểm toàn site, commit + push + deploy rồi báo cáo. Bản nhẹ — KHÔNG dùng .project-agent/.
argument-hint: [để trống = review toàn site | mô tả vấn đề | đường dẫn báo cáo QA | danh sách trang "/,/collections/all"]
---

Việc cần làm: $ARGUMENTS

Lệnh chạy **một lượt** trong phiên hiện tại rồi báo cáo — không phải vòng lặp nền, không dựng lại
`.project-agent/` (STATE.json / ACCEPTANCE.yaml / FINAL_REPORT.json…), không tạo file trạng thái/báo cáo theo phase.

## 0. Xác định phạm vi

- **$ARGUMENTS trống** ⇒ chế độ **REVIEW TOÀN SITE**: kiểm mọi trang trong danh sách của `scripts/audit-ui.js`
  theo `.clinerules/03-chuan-giao-dien-ui.md`.
- **Danh sách đường dẫn** (bắt đầu bằng `/`) ⇒ chỉ review các trang đó (`AUDIT_PAGES="..."`).
- **Mô tả vấn đề / file báo cáo** ⇒ đọc toàn bộ (cả file đính kèm, ảnh), xử lý đúng vấn đề đó, cuối cùng vẫn chạy
  `audit:ui` cho các trang bị ảnh hưởng.

## 1. Đọc rule trước khi đụng code

`.clinerules/01-quy-chuan-theme-sapo.md`, `.clinerules/02-du-an-pharma-cosmetics.md`,
`.clinerules/03-chuan-giao-dien-ui.md` (tiêu chí UI-x.y). Rule là chuẩn — không "phát hiện" rule mới rồi để trong
báo cáo; nguyên tắc lâu dài mới phải ghi thẳng vào `.clinerules/`.

## 2. Mở web thật và đo

1. Đảm bảo preview chạy: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` ≠ 200 ⇒ `npm run preview` (nền).
2. `npm run audit:ui` (hoặc `AUDIT_PAGES="..." npm run audit:ui`) — trình duyệt thật, 1440px + 390px.
   Lỗi ✱ in theo mã UI-x.y; ảnh toàn trang ở `test-results/audit-ui/`.
3. **Mở xem ảnh chụp** từng trang (ưu tiên mobile) để duyệt mục ◇: lệch trục, khung không đồng bộ, khoảng cách
   section lệch, nút/thẻ khác kiểu, chữ to nhỏ lẫn lộn, phần tử nổi che nội dung, trạng thái rỗng trơ trọi.
   Cần nhìn kỹ một khối thì chụp riêng phần tử đó (Playwright `element.screenshot`).

## 3. Sửa — tự quyết, không hỏi giữa chừng

- Sửa hết lỗi ✱ và mọi lỗi ◇ nhìn thấy. Đối chiếu `git log` gần đây, comment `REOPEN`/`T-xxx`, mockup `design/`
  trước khi đổi thứ đã được chốt; báo cáo QA bên ngoài phải xác minh trên code thật, không chép máy móc.
- CSS scope theo class trang/section; token có sẵn (`--ts-*`, `--pc-container-*`, `design_tokens.bwt`);
  không `rem` cho cỡ chữ; không cấu hình trong `assets/*.bwt`; nội dung hiển thị phải cấu hình hoá.
- **Chỉ dừng hỏi** khi: xoá field settings / đổi nguồn dữ liệu của phần tử, tái cấu trúc layout lớn trái mockup,
  thao tác phá huỷ (xoá dữ liệu, force-push). Không bịa dữ liệu (đánh giá, % đã bán, thống kê).
- Không đụng thay đổi dở dang không phải của mình trong working tree (vd file đang bị xoá chưa commit) — chỉ báo lại.

## 4. Kiểm lại

1. Chạy lại `audit:ui` cho trang đã sửa tới khi sạch ✱; xem lại ảnh sau sửa.
2. `node -e "JSON.parse(...)"` nếu sửa `configs/*.json`; `npm run test:portal` nếu sửa snippet Home Portal;
   `PYTHONIOENCODING=utf-8 npm run build:sapo` trước commit. Lỗi có sẵn từ trước (không do mình) ⇒ xác minh bằng
   cách tạm bỏ thay đổi, rồi ghi rõ trong báo cáo.

## 5. Commit · push · deploy

- `git add` **đúng file mình sửa**; conventional commit + tiếng Việt có dấu; body: vấn đề → cách sửa → file.
- `git push origin hugo-theme-sept2026`.
- Deploy production **một lần cuối lượt**: tạo worktree sạch từ HEAD (`git worktree add --detach <scratchpad>/deploy-wt HEAD`,
  chép `.vercel/project.json`), `npx vercel --prod --yes` trong đó, rồi `git worktree remove --force` (không junction
  `node_modules` vào worktree). Xác minh bằng marker CSS/HTML mới + `X-Vercel-Cache`, và
  `AUDIT_URL=https://hugo-theme-sept2026-test.vercel.app npm run audit:ui` cho các trang đã sửa.

## 6. Báo cáo (tiếng Việt, ngắn gọn)

- Đã kiểm gì (số trang × 2 màn hình), lỗi tìm thấy theo mã UI-x.y.
- Đã sửa gì — file nào, vì sao.
- Cố tình không sửa gì và lý do (mâu thuẫn thiết kế đã chốt, thiếu dữ liệu thật, cần quyết định của người dùng).
- Commit, trạng thái deploy, kết quả `audit:ui` trên production.
