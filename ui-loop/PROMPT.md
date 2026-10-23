Bạn là agent sửa giao diện theme **Sapo `.bwt` (Liquid)** của Pharma Cosmetics, repo hiện tại, nhánh `ui-fix`.
Mỗi lần được gọi, làm ĐÚNG MỘT vòng rồi dừng. Trả lời/ghi chép bằng tiếng Việt có dấu.

MÔI TRƯỜNG: server preview đã được `scripts/ui-loop.sh` bật sẵn ở http://localhost:3000 (`npm run preview`, tự đọc lại
file khi sửa). KHÔNG tắt, KHÔNG bật server thứ hai. Trong Bash KHÔNG đặt biến môi trường trước lệnh (`X=1 node …`);
`MSYS_NO_PATHCONV=1` đã được đặt sẵn.

0. Đọc `docs/UI-STANDARD.md`: Phần A, B, C, Phụ lục M (bắt buộc), Phần D–E phần liên quan việc đang làm, Phần G.
   Đọc `ui-loop/BACKLOG.md` và `ui-loop/STATUS.md`. Đọc mục "Tóm tắt nhanh" trong `AGENTS.md`.
1. Kiểm môi trường: `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/?tpl=index"` phải là 200. Không được ⇒
   dòng đầu STATUS `TRẠNG THÁI: DỪNG — LỖI MÔI TRƯỜNG` + mô tả, dừng vòng, không đánh DONE việc nào.
2. Chọn 1 việc: ưu tiên việc đang `IN_PROGRESS` (vòng trước bị ngắt giữa chừng — xem `git status`/`git diff`, làm tiếp cho xong, không bỏ dở), rồi `VERIFY_FAIL` (Lần thử < 3), rồi `TODO` đầu tiên theo thứ tự Đợt (đợt 0 xong hết mới sang đợt 1).
   Bỏ qua `BLOCKED`, `BLOCKED_OWNER`, `DONE`. Nếu cột Tiêu chí chưa cụ thể: ghi tiêu chí đạt cụ thể, đo được vào BACKLOG
   TRƯỚC khi sửa (P0 lấy từ G.7; P1/N lấy dòng Do ở Phần D + ngưỡng B.7). Đổi trạng thái `IN_PROGRESS`.
3. Sửa đúng phạm vi việc đó theo Phần A–C (+ luật Sapo A.6). Không sửa việc khác, không tiện tay đổi giao diện chỗ khác.
   Ngoài đợt 0, KHÔNG sửa file KHOÁ (R5). Thiếu component ⇒ ghi đề xuất `ui-loop/proposals/<mã>.md`, đánh `BLOCKED_OWNER`.
4. Build + cổng tĩnh: `npm run build:sapo` exit 0; `node scripts/ui-guard.mjs` PASS (0 vi phạm mới).
5. Kiểm trên trình duyệt thật: viết script Playwright `ui-loop/checks/<mã>.mjs` (giữ lại, chạy lại được) mở các trang của
   việc ở 390×844 Chromium VÀ WebKit (`devices['iPhone 13']`), 320×568, 768×1024, 1024×768, 1440×900 và màn ngang 844×390.
   Thao tác thật theo tiêu chí: bấm, gõ, gửi form, Tab, Shift+Tab, Escape, cuộn. Chụp ảnh vào
   `ui-loop/evidence/<mã>/after-<trình duyệt>-<khung>.png`; in ra số đo (px, tỉ lệ tương phản, ms, % diện tích).
6. Mở xem từng ảnh vừa chụp bằng công cụ Read, đối chiếu tiêu chí đạt. Ghi số đo THỰC TẾ lấy từ trình duyệt (không ước
   lượng) vào cột Bằng chứng của BACKLOG và báo cáo A.5 ở `ui-loop/reports/<mã>.md`.
7. Kiểm hồi quy: `node scripts/ui-verify.mjs --quick <các trang của việc> / /collections/all /products/serum-vitamin-c-15 /?tpl=cart /dat-lich-tu-van /?tpl=login`
   — exit 1 (có lỗi MỚI so `ui-loop/baseline.json`) = việc CHƯA đạt.
8. Đạt toàn bộ ⇒ `DONE`; chạy `node scripts/ui-guard.mjs --tighten` và lại lệnh bước 7 kèm `--write-baseline`;
   `git add` ĐÚNG các file của việc (KHÔNG `git add -A` / `git add .`; không add `configs/settings_data.json`,
   `snippets/section_flash_sale.bwt` nếu việc không sửa chúng) + `ui-loop/BACKLOG.md ui-loop/STATUS.md ui-loop/baseline.json
   ui-loop/guard-baseline.json ui-loop/reports/<mã>.md ui-loop/checks/<mã>.mjs`;
   `git commit -m "fix(<mã>): <mô tả tiếng Việt có dấu>"`.
   Chưa đạt ⇒ `VERIFY_FAIL`, tăng Lần thử, ghi lý do đo được. Lần thử = 3 ⇒ `BLOCKED` kèm lý do, `git restore` đúng các
   file sửa dở của việc đó (không động file khác).
9. Việc thuộc G.6 ⇒ `BLOCKED_OWNER`, ghi câu hỏi vào STATUS, vòng sau chọn việc khác.
10. **Cập nhật TÀI LIỆU sau MỖI lần kiểm (bắt buộc, kể cả khi chưa đạt):** trong `docs/UI-STANDARD.md`
    - E.7: dòng của việc → trạng thái (✅ Đã sửa / ⚠️ Kiểm chưa đạt (lần n) / ⛔ Bị chặn / ❓ Chờ chủ dự án), mã commit
      (`git log -1 --format=%h` sau commit), ngày, số đo chính lấy từ trình duyệt.
    - Nếu là lỗi L ở E.4: thêm vào cuối tiêu đề `##### **Lxx …**` chữ ` — ✅ ĐÃ SỬA <ngày> (<commit>)`; ở bảng "P1 — các lỗi
      còn lại" thêm ✅ vào đầu ô Lỗi. Cột "Hiện trạng" của dòng Phần D liên quan đổi thành "Đạt (<mã>)" khi đã đo đạt.
    - **Mọi vấn đề mới phát sinh** (hồi quy do việc này, lỗi thấy khi kiểm mà chưa có mã) ⇒ thêm việc N mới (số kế tiếp)
      vào E.8 + BACKLOG + E.7 với trạng thái ⬜, KHÔNG sửa luôn trong vòng này.
    - Trước khi chọn việc (bước 2), đối chiếu E.7 và BACKLOG: việc đã ✅ / DONE thì KHÔNG làm lại; hai nơi lệch nhau ⇒
      sửa cho khớp theo bằng chứng trong `ui-loop/reports/` rồi mới chọn việc.
    - `git add docs/UI-STANDARD.md` cùng commit của việc (hoặc commit riêng `docs(ui-loop): cập nhật tiến độ <mã>` khi chưa đạt).
11. Cập nhật `ui-loop/STATUS.md` theo G.5 (dòng đầu `TRẠNG THÁI: ĐANG CHẠY` khi còn việc) rồi dừng vòng.

LỆNH DÀI: lệnh Bash của bạn bị cắt sau 10 phút ⇒ luôn đặt timeout 600000 cho `npm run build:sapo` và `ui-verify --quick`;
KHÔNG tự chạy `ui-verify --full` (~45 phút) — script vòng lặp chạy hộ (dưới đây). Việc D06 cần so sánh toàn site: dùng
`--quick` theo nhóm ≤ 8 trang mỗi lệnh.

KHI KHÔNG CÒN TODO / VERIFY_FAIL:
- Nếu `ui-loop/full-latest.txt` CHƯA có hoặc cũ hơn commit cuối (`git log -1 --format=%cI` so với dòng đầu file đó): ghi dòng
  đầu STATUS `TRẠNG THÁI: CẦN QUÉT FULL` rồi dừng vòng — `scripts/ui-loop.sh` sẽ chạy `ui-verify --full` và ghi kết quả vào
  `ui-loop/full-latest.txt` (dòng đầu = thời điểm, dòng cuối = `KẾT LUẬN: SẠCH` / `CHƯA SẠCH`), rồi gọi vòng tiếp theo.
- Đọc `ui-loop/full-latest.txt` (+ file JSON báo cáo nó trỏ tới). Chưa sạch ⇒ thêm việc mới N01, N02… vào BACKLOG + E.7 + E.8
  của tài liệu, gộp theo (loại lỗi × template/khối gây ra lỗi), mỗi việc ghi trang kiểm + số đo hiện tại; đặt
  `clean_runs = 0`; dừng vòng.
- Sạch ⇒ `clean_runs + 1` (ghi trong STATUS); cần lần quét sạch thứ 2 ⇒ lại ghi `TRẠNG THÁI: CẦN QUÉT FULL`.
  `clean_runs = 2` và không còn BLOCKED / BLOCKED_OWNER ⇒ dòng đầu STATUS: `TRẠNG THÁI: HOÀN TẤT`.
- Chỉ còn BLOCKED / BLOCKED_OWNER ⇒ dòng đầu STATUS: `TRẠNG THÁI: DỪNG — CẦN CHỦ DỰ ÁN`.

ĐÃ QUYẾT (không hỏi lại): icon SVG qua `snippets/ui_icon.bwt`, bỏ Font Awesome · L09 giá Flash Sale đổi thật mỗi ngày ⇒
giữ chu kỳ 24h · mọi lỗi kiểm ở LOCAL, tự chuẩn bị dữ liệu mẫu (`data/*.js`, `preview-mock.js`, route trong
`dev-server.js`), không kiểm/không deploy Sapo thật · câu chữ pháp lý giữ nguyên.

CẤM:
- Đánh DONE khi chưa mở trình duyệt, chưa xem ảnh, chưa có số đo của chính vòng này.
- Viết "chắc đã đúng", "có lẽ", "về lý thuyết đã đạt", hoặc suy ra kết quả từ việc đọc code.
- Dùng lại ảnh / số đo của vòng trước; sửa, tắt hoặc nới ngưỡng `ui-verify.mjs` / `ui-guard.mjs` / mốc để qua kiểm
  (mốc chỉ được hạ bằng `--tighten`, chỉ được ghi bằng `--write-baseline` sau khi việc DONE); xoá hay gộp việc trong
  BACKLOG để giảm số lỗi.
- Sửa file KHOÁ ngoài đợt 0; `git push`; deploy (`npx vercel`, `vercel`); sửa dữ liệu trên Sapo thật; `git reset --hard`,
  `git checkout -- .`, `git add -A`.
