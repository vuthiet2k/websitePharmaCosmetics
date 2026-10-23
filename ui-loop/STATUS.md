TRẠNG THÁI: ĐANG CHẠY
Vòng: 7 · Việc vừa làm: N05 → DONE (phần tử nổi cũ nhường thư viện: 8 khung Chromium + WebKit, thanh mua 118,8 → 64px, nút + giá trúng 9/9, toast giao thanh mua 0px, nút nổi 3 → 1, popup 25/25, axe target-size 0; hồi quy Q 0/72)
Tổng: 61 việc · DONE 6 · TODO 54 · VERIFY_FAIL 1 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0 (ui-verify --quick kit + Q; đã ghi baseline)
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
- Vòng 7 xong N05: components.css v1.2 — thanh mua 1 hàng; nhóm 13 "Chuyển tiếp" ẩn `.pc-bottom-nav` / `.main-widget` / `.backtop`
  khi trang có thanh mua / nút nổi / popup thư viện mở (trang cũ không đổi). Thêm N08 (đợt 0): toast thư viện che `.pc-fab` 28px
  và ô nhập popup 31px ở < 1024. Cách đo hồi quy `.backtop`: nút tự ẩn 1,4s sau khi ngừng cuộn ⇒ đo sau 2s (N05.mjs).
- Việc kế tiếp: D04 lần 2 (VERIFY_FAIL, ưu tiên theo bước 2; N03–N05 đã xong). Lưu ý: checkbox `ui_field` còn ẩn (N06) — nếu
  tiêu chí "field checkbox nhìn thấy" của D04 vì thế chưa đạt thì cân nhắc làm N06 trước. N01, N08 cũng đo trên trang kit.

Ghi chú dựng vòng lặp:
- Baseline `ui-loop/baseline.json` = quét full bản hiện tại (trước mọi sửa đổi); vòng 1 trộn thêm 18 lượt trang quick, vòng 2 trộn 30 lượt, vòng 3 trộn 18 lượt, vòng 5 trộn 21 lượt, vòng 6 trộn 21 lượt.
- Mốc ui-guard `ui-loop/guard-baseline.json` ghi nợ cũ: inlineStyle 244 · faIcon 356 · extCdn 11 · rawButton 260 · tailwindCdn 1 · styleTag 26 · important 1237 · hexInMarkup 62 · arbitrary 34 · smallText 22 · shadow 24.
