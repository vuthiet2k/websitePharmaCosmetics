TRẠNG THÁI: ĐANG CHẠY
Vòng: 14 · Việc vừa làm: N08 → DONE (7 khung Chromium + WebKit: toast–fab giao 28/44 → 0px, cách 36px; popup mở: ô nhập bị toast che 30,6 → 0px; hồi quy rect = HEAD 7/7; ui-verify --quick 0 lỗi mới)
Tổng: 65 việc · DONE 12 · TODO 53 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0 (ui-verify --quick kit + Q; baseline đã ghi)
Câu hỏi cho chủ dự án:
- (không có — xung đột M.4 `h-6 w-6` / D.7 "checkbox ≥ 24px" với B.7 "vùng chạm mobile ≥ 44px" đã xử theo A.1: vùng bấm 44px,
  ô nhìn thấy vẫn 24px; nếu chủ dự án muốn khác thì báo lại)

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
- Vòng 8: chạy `ui-loop/checks/D04.mjs` trước khi sửa (không sửa gì của D04, không tính lần thử): 7 khung đạt mọi mục (nút 44px
  17 nút, swiper 44, fab 48, Tab viền solid 2px brand, axe #pc-kit 0 kể cả popup mở) trừ `ui_fab 0/1` ở 844×390 — fab ẩn đúng M.4
  (màn ngang thấp) ⇒ lần 2 của D04 cần ghi mục này là "ẩn đúng M.4", không phải lỗi; còn checkbox ẩn (N06) chưa đạt tiêu chí
  "field checkbox nhìn thấy" ⇒ chuyển làm N06 trước. N06 lần 1: mã để trong cây làm việc (`snippets/ui_field.bwt`,
  `ui-src/css/components.css` v1.3, `assets/vendor_bootstrap.css`, `assets/pc-ui.css`), chưa commit. Lần 2: ô ≥ 44×44 ở < 1024
  (giữ 24×24 ≥ 1024) rồi chạy lại `node ui-loop/checks/N06.mjs` (đã có `evidence/N06/before.json` đo trên bản chưa sửa — đừng chạy
  `--before` trên cây đã sửa). Thêm N09 (đợt 0): `label{display:inline-block!important}` cũ đè `.pc-check` (ô cách chữ 3,7px).
- Vòng 9 xong N06 lần 2: components.css v1.3 — `.pc-check__box` `appearance:none` 44×44 (< 1024) / 24×24 (lg), ô vẽ `::before`
  24×24. Commit gồm `snippets/ui_field.bwt` (file D04, cần cho N06). Lệch ô–chữ (3,7px, lệch dọc ở 1440) vẫn là N09.
- Vòng 10 xong D04 lần 2, commit 78eca07 (không sửa mã snippet; chỉ script kiểm coi fab ẩn ở màn ngang thấp là đúng M.4). Commit gồm 9 snippet
  `ui_*` còn lại + trang kit + ALLOW lint-liquid-globals. Thêm N10 (đợt 0): header cũ (z 9980 / 100 / topbar 10010) nằm trên
  lớp phủ popup z 50; N11 (đợt 0): `.pc-modal__close` nền xám + viền outset của trình duyệt. Ảnh full-page WebKit trông mờ là
  do cách chụp (khung nhìn WebKit bình thường) — đừng coi là lỗi.
- Vòng 11 xong N01: components.css v1.4. Ngoài border-style, ô nhập còn bị CSS cũ global_core `input[type=…]` (0,1,1) đổi màu viền thành
  #EBEBEB ⇒ thêm `:root .pc-input` đặt trước khối .pc-input (focus / aria-invalid vẫn thắng). `.pc-header` chưa được Tailwind sinh trong
  pc-ui.css (chưa template nào dùng — L01) ⇒ N01.mjs biên dịch riêng quy tắc `.pc-header` để đo; khi L01 dùng class này, kiểm lại bằng N01.mjs.
- Vòng 12 xong N02: tokens.css `:where(p a, li a)` (độ ưu tiên 0) + hoãn `a { text-underline-offset }` toàn cục tới D09 (dời gạch chân link cũ "Chính sách bảo mật"); components.css v1.5 `.pc-toast a` underline-offset-4. Kiểm bằng bật/tắt pc-ui.css ngay trong trang (ui-loop/checks/N02.mjs) — so D03 before.json lệch số phần tử nên căn theo tên phần tử. Ảnh 1440: robot `.main-widget` nhấp nháy ⇒ loại vùng widget nới 12px khi so ảnh. Thêm N12 (đợt 8): thẻ "Xem nhiều" TRETINOIN ô ảnh trống.
- N07 (vòng 12): webkit390 /collections/all 90/24 ↔ 120/40 do khối `.pc-col-bestseller` (8 btn-cart) lúc có lúc không ở WebKit, cùng CSS cho cả 2 kết quả; baseline nay ghi 120/40 (bằng Chromium). Nếu ui-verify báo "2 lỗi mới" kiểu này thì chạy lại / đối chiếu N07 trước khi kết luận.
- Vòng 13 xong N09: global_core.scss.bwt `label` → `label:where(:not(.pc-check))` (độ ưu tiên giữ 0,0,1, cùng cách N04). libsass 3.6.6
  biên dịch được `:where` (check:libsass PASS). Ảnh trước sửa không giữ (công cụ không cho đổi tên file) — số đo trước ở reports/N09.md.
- Vòng 14 xong N08 (vòng trước bị ngắt sau lần kiểm, chưa commit ⇒ build + kiểm lại toàn bộ trong vòng này): components.css v1.6 —
  fab nâng lên trên toast khi toast hiện; popup mở + toast ở < 1024: toast xuống đáy, khung trượt nâng lên. Đối chứng HEAD bằng
  `ui-loop/evidence/N08/head-pc-ui.css` (page.route) — sau khi thư viện đổi tiếp, file này chỉ còn đúng cho N08.
- Việc kế tiếp: N10 (TODO đầu tiên đợt 0 theo thứ tự BACKLOG).

Ghi chú dựng vòng lặp:
- Baseline `ui-loop/baseline.json` = quét full bản hiện tại (trước mọi sửa đổi); vòng 1 trộn thêm 18 lượt trang quick, vòng 2 trộn 30 lượt, vòng 3 trộn 18 lượt, vòng 5 trộn 21 lượt, vòng 6 trộn 21 lượt.
- Mốc ui-guard `ui-loop/guard-baseline.json` ghi nợ cũ: inlineStyle 244 · faIcon 356 · extCdn 11 · rawButton 260 · tailwindCdn 1 · styleTag 26 · important 1237 · hexInMarkup 62 · arbitrary 34 · smallText 22 · shadow 24.
