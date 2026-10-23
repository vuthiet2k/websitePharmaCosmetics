TRẠNG THÁI: ĐANG CHẠY
Vòng: 6 · Việc vừa làm: N04 → DONE (796c8e8; viền focus thư viện: 8 khung Chromium + WebKit, Tab 17–21 phần tử pc-* 0 sai viền — solid 2px rgb(7,91,64); ô nhập + nút đóng popup 2px brand; 389 lượt focus phần tử cũ đổi 0)
Tổng: 60 việc · DONE 5 · TODO 54 · VERIFY_FAIL 1 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0 (2 lỗi webkit390 /collections/all có cả ở HEAD → N07; đã ghi baseline)
Câu hỏi cho chủ dự án:
- (không có)

Ghi chú:
- Vòng 1 thêm N01 (đợt 0, xếp sau D04): viền thư viện thiếu `border-style` / `box-sizing` do preflight tắt.
- Vòng 3 thêm N02 (đợt 0, hồi quy của D03): quy tắc nền `p a, li a` trong tokens.css gạch chân + đổi màu menu header desktop, breadcrumb, link trong li/p (937 lượt underline mới / 42 lượt đo); ảnh "Xem nhiều" trang chủ 320/768 đổi cỡ. ui-verify không bắt được loại thay đổi này — kiểm bằng ui-loop/checks/D03.mjs (so before.json).
- ui-verify có thể báo lỗi mới giả `axe:color-contrast` ở topbar trang chủ 1440 (slider tự chạy — L38); chạy lại để xác nhận.
- `configs/settings_data.json`, `snippets/section_flash_sale.bwt`: phần sửa dở của chủ dự án vẫn để nguyên, chưa commit.
- Vòng 4 thêm N03–N06 (đợt 0, phát hiện khi kiểm D04). Mã D04 (10 snippet ui_*, trang kit, ALLOW lint-liquid-globals) để trong cây làm việc, chưa commit.
- Vòng 5 chọn N03 thay vì D04 (VERIFY_FAIL lần 1) vì D04 phụ thuộc N03–N05: làm lại D04 lúc này sẽ đo ra cùng số và đốt một lần thử. N03 xong (`scripts/pc-css-px.mjs`, bước mới trong build:pc). `assets/pc-ui.css` trong commit N03 đã gồm class của snippet D04 (file sinh).
- Vòng 6 xong N04: `vendor_bootstrap.css` thu hẹp `outline:none!important` bỏ phần tử pc-*; components.css v1.1 thêm viền focus chung `:root :is(.pc-btn…):focus-visible`. Thêm N07 (đợt 9): baseline webkit390 /collections/all đếm thiếu thẻ SP — ui-verify báo 2 lỗi "mới" có cả ở HEAD 5390119 (đã thử đặt lại file N04 về HEAD).
- Việc kế tiếp: N05 (phần tử nổi cũ); sau đó làm lại D04 (lần 2). N01, N06 cũng đo được trên trang kit.

Ghi chú dựng vòng lặp:
- Baseline `ui-loop/baseline.json` = quét full bản hiện tại (trước mọi sửa đổi); vòng 1 trộn thêm 18 lượt trang quick, vòng 2 trộn 30 lượt, vòng 3 trộn 18 lượt, vòng 5 trộn 21 lượt, vòng 6 trộn 21 lượt.
- Mốc ui-guard `ui-loop/guard-baseline.json` ghi nợ cũ: inlineStyle 244 · faIcon 356 · extCdn 11 · rawButton 260 · tailwindCdn 1 · styleTag 26 · important 1237 · hexInMarkup 62 · arbitrary 34 · smallText 22 · shadow 24.
