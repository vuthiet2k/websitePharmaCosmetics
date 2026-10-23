TRẠNG THÁI: ĐANG CHẠY
Vòng: 4 · Việc vừa làm: D04 → VERIFY_FAIL lần 1 (10 snippet + trang kit xong; PC-ERROR ngoài ô thử 0, ô thử 11/11, ô 16px, axe #pc-kit 0 ở 5/7 khung; chưa đạt: nút 39,6/41,3px do html 14,4/15px → N03, focus button bị !important cũ → N04, pc-bottom-nav cũ che thanh mua → N05, checkbox ẩn → N06)
Tổng: 59 việc · DONE 3 · TODO 55 · VERIFY_FAIL 1 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0
Câu hỏi cho chủ dự án:
- (không có)

Ghi chú:
- Vòng 1 thêm N01 (đợt 0, xếp sau D04): viền thư viện thiếu `border-style` / `box-sizing` do preflight tắt.
- Vòng 3 thêm N02 (đợt 0, hồi quy của D03): quy tắc nền `p a, li a` trong tokens.css gạch chân + đổi màu menu header desktop, breadcrumb, link trong li/p (937 lượt underline mới / 42 lượt đo); ảnh "Xem nhiều" trang chủ 320/768 đổi cỡ. ui-verify không bắt được loại thay đổi này — kiểm bằng ui-loop/checks/D03.mjs (so before.json).
- ui-verify có thể báo lỗi mới giả `axe:color-contrast` ở topbar trang chủ 1440 (slider tự chạy — L38); chạy lại để xác nhận.
- `configs/settings_data.json`, `snippets/section_flash_sale.bwt`: phần sửa dở của chủ dự án vẫn để nguyên, chưa commit.
- D03 commit 8cfaccb.
- Vòng 4 thêm N03–N06 (đợt 0, phát hiện khi kiểm D04). D04 phụ thuộc N03 (rem), N04 (focus), N05 (thanh đáy cũ): làm lại D04 trước khi xong 3 việc này sẽ đo ra cùng số. Mã D04 (10 snippet ui_*, trang kit, ALLOW lint-liquid-globals) để trong cây làm việc, chưa commit.
- Việc kế tiếp theo luật chọn: D04 (VERIFY_FAIL lần 1).

Ghi chú dựng vòng lặp:
- Baseline `ui-loop/baseline.json` = quét full bản hiện tại (trước mọi sửa đổi); vòng 1 trộn thêm 18 lượt trang quick, vòng 2 trộn 30 lượt, vòng 3 trộn 18 lượt.
- Mốc ui-guard `ui-loop/guard-baseline.json` ghi nợ cũ: inlineStyle 244 · faIcon 356 · extCdn 11 · rawButton 260 · tailwindCdn 1 · styleTag 26 · important 1237 · hexInMarkup 62 · arbitrary 34 · smallText 22 · shadow 24.
