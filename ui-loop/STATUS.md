TRẠNG THÁI: ĐANG CHẠY
Vòng: 55 (31/10/2026) · Việc vừa làm: L03b3 → DONE b53aa9d (L03b phần 3 — gỡ Font Awesome ở 9 khối trang chủ home_portal, trừ section_flash_sale).
7 khung Chromium + WebKit, /?tpl=index: `<i fa->` 15 → 0; icon nhìn thấy 14 = 14; lệch tâm ≤ 2,0px; phần tử cha đổi cỡ ≤ 1,7px; cao trang lệch 0px;
lượt 1 chưa đạt (CSS cũ home-portal.css `.shb2__tile svg` ẩn 4 icon chip spa, `.chan svg` tô đặc icon chia sẻ) ⇒ thu hẹp `> svg`, xoá `.chan svg` ⇒ đạt.
ui_icon thêm 6 path Lucide; settings_data KHÔNG đổi (ui_icon ánh xạ giá trị "fa-…" cũ). ui-guard faIcon 272 → 261; build:sapo PASS; --quick 0 lỗi mới.
Việc tiếp theo: L03b tiếp (tách phần 4: khối không ở trang chủ + template trang), L03c, L11, L37 (đợt 3).
Tổng: 89 việc · DONE 34 · TODO 52 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 1 · BLOCKED_OWNER 2
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0 (--quick 7 trang)
Câu hỏi cho chủ dự án (giữ từ vòng 54):
- N25 (proposals/N25.md): cho sửa `snippets/ui_icon.bwt` (KHOÁ) thêm chế độ sprite (`<symbol>` 1 lần + `<use>`) cho menu `header_nav_cate`? Hay ghi lại mốc perf và đóng N25?
- N23 (câu 3 proposals/N23.md): LCP đặt lịch = ảnh mascot widget — cho sửa, hay gộp vào N25/L03c?
- N28: áp bản vá ui-loop/proposals/N28-bestseller.patch và ghi lại mốc webkit390 /collections/all 90/24 → 120/40? (proposals/N28.md)
Vòng: 54 (31/10/2026) · Việc vừa làm: N25 → BLOCKED_OWNER (đã xác định nguyên nhân bằng đo, không sửa file theme). Máy ổn định (TTFB 0,9–1,6 s);
--perf 08:40 + 09:01 lấy tốt nhất: 6/10 đạt, còn vượt giỏ 8 760, /soi-da 13 276, /skinhealthy-services 9 080, đặt lịch 11 448 ms ⇒ do MÃ: HTML 516–720 KB
+ 16–18 file chặn 540–702 KB / 4G 200 KB/s; template menu `header_nav_cate` 235 KB trên mọi trang (252 SVG ui_icon nội tuyến). A/B chặn font
Montserrat: ΔLCP −1 232…+1 088 ms ⇒ không phải font. checks/N25.mjs 8 khung (ảnh đã xem), build:sapo + ui-guard PASS. reports/N25.md, proposals/N25.md.
Việc tiếp theo: L03b (đợt 3), rồi L03c, L11, L37.
Tổng: 88 việc · DONE 33 · TODO 52 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 1 · BLOCKED_OWNER 2
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 4 (--perf, tốt nhất 2 lượt — N25) · --quick không chạy (không đổi file theme)
Câu hỏi cho chủ dự án:
- N25 (proposals/N25.md): cho sửa `snippets/ui_icon.bwt` (KHOÁ) thêm chế độ sprite (`<symbol>` 1 lần + `<use>`) dùng cho menu `header_nav_cate` (ước HTML −110…−120 KB/trang)? Hay ghi lại mốc perf theo kiến trúc hiện tại (baseline 23/10 còn Tailwind CDN + Google Fonts) và đóng N25, để L03b/L03c/D09 lo dung lượng theo B.7?
- N23 (câu 3 proposals/N23.md): đặt lịch LCP = ảnh mascot widget (support_mascot.gif, xong 11 482 ms) — cho sửa, hay gộp vào N25/L03c?
- N28: áp bản vá ui-loop/proposals/N28-bestseller.patch và chấp nhận ghi lại mốc webkit390 /collections/all 90/24 → 120/40 không? (proposals/N28.md)
Vòng: 53 (31/10/2026) · Việc vừa làm: N23 → BLOCKED (lần 4, sau khi chủ dự án duyệt bản vá stub). checks/N23a.mjs 8 khung × 2 trang ĐẠT
(stub 3 script 99–103 B JS, 0 .js trả HTML, Tab/Shift+Tab, gửi trống, 0 lỗi JS; ảnh đã xem). ui-verify --perf 2 lượt (08:13, 08:22) lấy tốt nhất:
login LCP 9 196 ≤ 14 507 ✔; đặt lịch 9 980 > 8 483 ✗; 6 trang không nạp 3 script cũng vượt baseline (/ 10 836, PDP 9 764, giỏ 9 340, /soi-da 13 500,
retinol 10 084, /skinhealthy-services 9 268) ⇒ chậm chung (N25). --quick 6 trang: login/đặt lịch 0 lỗi mới; 2 lỗi mới webkit390 /collections/all = dao động N28.
dev-server.js (stub) commit riêng theo quyết định chủ dự án 31/10 — không git restore. reports/N23.md.
Việc tiếp theo: N25 (đợt 3 — đo chậm chung), rồi L03b, L03c, L11, L37.
Tổng: 88 việc · DONE 33 · TODO 53 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 1 · BLOCKED_OWNER 1
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 2 (--quick, webkit390 /collections/all — N28) · --perf 7 trang (chậm chung N25)
Câu hỏi cho chủ dự án:
- N23 (câu 3 proposals/N23.md): đặt lịch LCP 9 980 ms (ngưỡng 8 483) phụ thuộc HTML 557 KB (template menu 238 KB, file KHOÁ) + ảnh mascot widget nạp sau HTML — cho sửa file KHOÁ, hay gộp hướng xử lý vào N25/L03b và đóng N23 phần login?
- N28: áp bản vá ui-loop/proposals/N28-bestseller.patch và chấp nhận ghi lại mốc webkit390 /collections/all 90/24 → 120/40 không? (proposals/N28.md)
Vòng: 52 (31/10/2026) · Việc vừa làm: N23 → IN_PROGRESS. Chủ dự án duyệt 31/10 áp bản vá stub JS (preview local) ⇒ đã áp
ui-loop/proposals/N23-dev-server.patch vào dev-server.js (node --check OK), tạo ui-loop/RESTART-PREVIEW để script nạp lại preview. Chưa kiểm, chưa commit.
Việc tiếp theo: N23 (kiểm: checks/N23a.mjs 8 khung, ui-verify --perf ≥ 2 lượt cách nhau lấy lượt tốt nhất, --quick; đạt ⇒ commit dev-server.js), rồi N25, L03b, L03c, L11, L37.
Tổng: 88 việc · DONE 33 · TODO 52 · IN_PROGRESS 1 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 1
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: chưa đo vòng này
Câu hỏi cho chủ dự án:
- N28: áp bản vá ui-loop/proposals/N28-bestseller.patch và chấp nhận ghi lại mốc webkit390 /collections/all 90/24 → 120/40 không? (proposals/N28.md)
Vòng: 51 (31/10/2026) · Việc vừa làm: N28 → BLOCKED_OWNER. Nguyên nhân đo được: khối «Bán chạy» (section_collection_bestseller)
chèn thẻ bằng IntersectionObserver rootMargin −200px ⇒ WebKit 390 chỉ 5/10 lượt chèn sau settle(). rootMargin +600px ⇒ WebKit 390 10/10,
Chromium 390 10/10, 6 khung khác 3/3, cuộn thật chèn 8 thẻ, 0 lỗi JS; build:sapo + ui-guard PASS; --quick 3/3 lượt webkit390 120/40 = m390.
Nhưng mốc baseline.json ghi webkit390 /collections/all 90/24 (trạng thái trượt, ghi ở N26) ⇒ bước 7 exit 1 "2 lỗi mới"; không được tự nới
mốc ⇒ đã lưu bản vá ui-loop/proposals/N28-bestseller.patch, git restore snippet. Thêm N30 (đợt 9: next slider «Bán chạy» 320 / 844×390 không đổi slide).
Việc tiếp theo: N25, L03b, L03c, L11, L37 (đợt 3).
Tổng: 88 việc · DONE 33 · TODO 53 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 1 · BLOCKED_OWNER 1
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 2 (webkit390 /collections/all — chỉ khi áp bản vá N28; chưa áp thì dao động)
Câu hỏi cho chủ dự án:
- N28: áp bản vá `ui-loop/proposals/N28-bestseller.patch` và chấp nhận ghi lại mốc webkit390 /collections/all 90/24 → 120/40 (bằng Chromium 390) không? (chi tiết proposals/N28.md)
- N23: ĐÃ TRẢ LỜI 31/10/2026 — CÓ áp dụng bản vá N23-dev-server.patch (preview local). N23 về TODO (BACKLOG).
- N23/N25: ĐÃ TRẢ LỜI 31/10/2026 — --perf đo ≥ 2 lượt cách nhau, lấy lượt tốt nhất từng trang.
Vòng: 50 (31/10/2026) · Việc vừa làm: N27 → DONE (f9b2938): viền focus #3CB371 (2,67:1 trên trắng) thu hẹp về 13 khối nền tối
(footer, .dark-zone, .portal-hero, .sh-*, .svcs-*, .lt-booking, .pc-ncta, .pc-ba-final, .pc-vcta); xoá `a:focus{outline:none}` + 2 khối
outline:none global_core (đè :focus-visible thư viện) và viền .pc-brand / .portal-hero__btn ở home-portal.css. 4 trang × 8 khung, 3 lần:
viền #3CB371 trên nền sáng d1440 209/114/88/54 → 0; viền mới 2px rgb(7,91,64) 8,1:1; footer min 4,5:1; số phần tử có viền trước = sau
32/32 — reports/N27.md. --quick 6 trang 0 lỗi mới 2 lượt; baseline KHÔNG đổi (lượt ghi 1 có fatal do máy chậm, lượt 2 dính dao động N28 —
đã git restore). Thêm N29 (đợt 6: viền focus < 3:1 có từ trước ở 6 trang + thư viện thiếu viền sáng cho nền tối).
Việc tiếp theo: N28 (đợt 2), rồi N25, L03b, L03c, L11, L37.
Tổng: 87 việc · DONE 33 · TODO 53 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 1 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0 (--quick)
Câu hỏi cho chủ dự án (giữ từ vòng 48):
- N23: ĐÃ TRẢ LỜI 31/10/2026 — CÓ áp dụng bản vá N23-dev-server.patch (preview local). N23 về TODO.
- N23/N25: ĐÃ TRẢ LỜI 31/10/2026 — --perf đo ≥ 2 lượt cách nhau, lấy lượt tốt nhất từng trang.
Vòng: 49 (31/10/2026) · Việc vừa làm: N26 → DONE: nút header «Danh mục», «Tìm kiếm» bị tắt viền focus (vendor_bootstrap outline:none!important);
viền cũ #3CB371 chỉ 2,67:1 ⇒ thu hẹp 5 quy tắc cũ bằng :not(:where(…)) (độ ưu tiên giữ) để viền thư viện tokens.css áp dụng: 2px rgb(7,91,64),
nền trắng 8,14:1, nền nút 7,38:1 ở 8 khung Chromium+WebKit; Enter/Escape trả focus đúng; 0 lỗi JS. focusNoRing d1440 /collections/all 19 (4/4 lượt,
trước 21); --quick 6 trang 0 lỗi mới — reports/N26.md. Thêm N27 (đợt 2: viền focus chung #3CB371 2,67:1 trên nền trắng), N28 (đợt 2: webkit390
/collections/all touch<44 / noName dao động cùng mã — có cả khi gỡ N26).
Việc tiếp theo: N27, N28 (đợt 2), rồi N25, L03b, L03c, L11, L37.
Tổng: 86 việc · DONE 32 · TODO 53 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 1 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0 (--quick)
Câu hỏi cho chủ dự án (giữ từ vòng 48):
- N23: áp dụng bản vá chỉ-môi-trường `ui-loop/proposals/N23-dev-server.patch` (stub JS 3 script Sapo ở preview) không?
- N23/N25: số đo tốc độ local dao động > 45 % cùng mã. Chạy vòng lặp khi máy rảnh, hay cho phép --perf ≥ 2 lượt cách nhau, lấy lượt tốt nhất?
Vòng: 48 (31/10/2026) · Việc vừa làm: N23 → BLOCKED (lần 3 chưa đạt, không sửa mã theme). probe-ttfb: đặt lịch 2 096–2 259, login
2 094–2 159, / 2 568–2 958 ms; ui-verify --perf 03:26 (có stub, chạy > 10 phút): 10/10 trang vượt baseline — login LCP 16 204 > 14 507,
đặt lịch 22 768 > 8 483, /soi-da 35 544 ms ⇒ máy đo vẫn nhiễu. Đã `git restore dev-server.js`; bản vá stub (login LCP 16 652 → 11 280 ms
ở vòng 46) lưu ui-loop/proposals/N23-dev-server.patch + câu hỏi proposals/N23.md; đã tạo ui-loop/RESTART-PREVIEW (preview nạp lại dev-server.js).
Việc tiếp theo: N26 (đợt 2), rồi N25, L03b, L03c, L11, L37.
Tổng: 84 việc · DONE 31 · TODO 52 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 1 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 10 (--perf, máy nhiễu — không ghi baseline)
Câu hỏi cho chủ dự án:
- N23: áp dụng bản vá chỉ-môi-trường `ui-loop/proposals/N23-dev-server.patch` (stub JS 3 script Sapo ở preview) không?
- N23/N25: số đo tốc độ local dao động > 45 % cùng mã. Chạy vòng lặp khi máy rảnh, hay cho phép --perf ≥ 2 lượt cách nhau, lấy lượt tốt nhất?
Vòng: 47 (31/10/2026) · Việc vừa làm: N23 → VERIFY_FAIL (lần 2), không sửa mã. Đo lại ui-verify --perf (03:10): cùng mã vòng 46 nhưng 10/10
trang vượt baseline, chậm hơn vòng 46 — login LCP 11 280 → 16 748, đặt lịch 14 644 → 20 176 ms; server render (probe-ttfb) 2,1–3,0 s/trang
(vòng 46: 1,8–2,8) ⇒ máy đo nhiễu/bận, tiêu chí (a) chưa đo được tin cậy. evidence/N23/perf-v47-1.txt, reports/N23.md.
Việc tiếp theo: N23 lần 3 chỉ nên đo khi máy rảnh (lần 3 chưa đạt ⇒ BLOCKED); cân nhắc làm N25 (ổn định máy đo) trước. Sau đó N26, L03b, L03c, L11, L37.
Tổng: 84 việc · DONE 31 · TODO 52 · IN_PROGRESS 0 · VERIFY_FAIL 1 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 10 (--perf, nhiễu máy — không ghi baseline)
Câu hỏi cho chủ dự án:
- N23/N25: số đo tốc độ local dao động > 45 % cùng mã (máy dev bận?). Chạy vòng lặp khi máy rảnh, hay cho phép đo --perf ≥ 2 lượt cách nhau và lấy lượt tốt nhất?
Vòng: 46 (31/10/2026) · Việc vừa làm: N23 → VERIFY_FAIL (lần 1). Stub JS ở dev-server.js ĐẠT phần login: 3 script Sapo trả JS 99–103 B,
0 `.js` trả HTML, ui-verify --perf login LCP 16 652 → 11 280 ms (≤ 14 507); 8 khung Chromium+WebKit form login (gõ, Tab, Shift+Tab,
gửi trống) và đặt lịch đúng, 0 lỗi JS; build:sapo + ui-guard PASS. CHƯA ĐẠT: /dat-lich-tu-van LCP 14 644 ms > 8 483 — nhưng cùng lượt
--perf 8/10 trang vượt baseline (/ 13 400, vòng 42 là 8 772), server render 1,8–2,8 s/trang ⇒ chậm chung, ghi N25 (đợt 3);
ui-verify --quick 1 lỗi mới d1440 /collections/all focusNoRing 20 → 21 (2/2 lượt, trang không nạp 3 script) ⇒ N26 (đợt 2).
dev-server.js chưa commit (để trong cây làm việc). reports/N23.md. Việc tiếp theo: N23 lần 2 (VERIFY_FAIL ưu tiên — nên đo lặp
--perf để tách nhiễu máy), N26 (đợt 2), rồi N25, L03b, L03c, L11, L37.
Tổng: 84 việc · DONE 31 · TODO 52 · IN_PROGRESS 0 · VERIFY_FAIL 1 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 1 (--quick, → N26)
Vòng: 45 (30/10/2026) · Việc đang làm: N23 → IN_PROGRESS (chờ khởi động lại preview — đã tạo ui-loop/RESTART-PREVIEW). Chẩn đoán đo
được (evidence/N23/before.json, probe-timing.mjs, probe-ab.mjs): login chậm do 3 script hệ thống Sapo `bizweb_asset_url` nạp đồng bộ
trong head — ở local 404 và dev-server trả NGUYÊN TRANG HTML ≈ 500 KB/file ⇒ FCP 16 036 / LCP 16 500 ms; A/B trả JS rỗng ⇒ FCP 5 804,
LCP 7 228 ms. Đặt lịch LCP 11 076 ms = GIF widget nạp sau HTML 557 KB (byte tăng từ 23/10: font tự host 238 KB, 248 SVG menu ≈ 117 KB).
Đã sửa dev-server.js (stub JS 3 file), CHƯA kiểm. Vòng sau: chạy N23.mjs after + ui-verify --perf; nếu đặt lịch vẫn > 8 483 ms ⇒ xét
phần HTML menu / font (có thể cần chủ dự án vì ui_icon / tokens.css KHOÁ).
Tổng: 82 việc · DONE 31 · TODO 50 · IN_PROGRESS 1 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: chưa đo vòng này
Vòng: 44 (30/10/2026) · Việc vừa làm: L03b2 → DONE (việc con mới của L03b: gỡ Font Awesome ở thẻ SP, dải voucher / mã giảm giá,
quickview — 23 lượt / 7 snippet; ui_icon thêm info, square-pen, youtube, heart-filled, star-filled). 7 khung × 4 trang Chromium+WebKit:
`<i fa->` /collections/all 99 → 0, icon nhìn thấy before = after, lệch tâm ≤ 2,5px, cha đổi cỡ ≤ 3,7px; lượt 1 chưa đạt (X popup bị
CSS cũ tô đặc, link "Xem tất cả" +4,1px) ⇒ sửa ⇒ lượt 2 đạt; tim bật/tắt đúng, popup voucher mở/đóng 7/7; 0 lỗi JS; ui-verify --quick
0 lỗi mới — commit d4c2852, reports/L03b2.md. Việc tiếp theo: N23 (đợt 3), L03b (phần còn lại: PDP, giỏ, blog, trang nội dung, tài khoản… + 38 trường
settings + quickview.js + gỡ CDN), L03c, L11, L37.
Tổng: 82 việc · DONE 31 · TODO 51 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0 (--quick)
Vòng: 43 (30/10/2026) · Việc vừa làm: N24 → DONE: quy tắc cũ `vendor_bootstrap.css` `:where(button,input)… outline:none!important`
tắt viền focus 2 nút topbar ⇒ loại `.lang-btn`, `.topbar-account-btn` khỏi quy tắc (cách N04/N06), viền 2px có sẵn ở site-topbar.css hiện lại.
8 khung × 2 trang Chromium+WebKit: outline 2px trắng / nền rgb(0,63,45) = 12,01:1; Enter mở, Escape đóng + trả focus; 0 lỗi JS.
ui-verify --quick d1440 /dat-lich-tu-van focusNoRing 10·10·10·10 (4/4 lượt), 0 lỗi mới — reports/N24.md. Đợt 0–2 đã xong hết.
Việc tiếp theo: L03b (phần còn lại, đợt 3), L03c, N23, L11, L37.
Tổng: 81 việc · DONE 30 · TODO 51 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0 (--quick)
Vòng: 42 (30/10/2026) · Việc vừa làm: L03a → DONE (phương án 2): swiper.js + lazy.js `defer`, jQuery giữ đồng bộ; bọc DOMContentLoaded
6 khối khởi tạo lúc parse (product.bwt 2, article.bwt, cart.bwt 2, page_tin_tuc_hub.bwt); section_flash_sale.bwt không đụng.
7 khung × 7 trang so bản đồng bộ: script đồng bộ head 3 → 1, lỗi JS 0 → 0, Swiper khởi tạo bằng nhau (198), slider bấm next như cũ;
/ FCP 7 768 → 7 496 ms. ui-verify --quick 0 lỗi mới — commit e15efb4, reports/L03a.md. LƯU Ý cho chủ dự án: ui-verify --perf báo /dat-lich-tu-van
+ /?tpl=login LCP vượt baseline 23/10 > 10 %, nhưng A/B cùng mã (tạm đổi về đồng bộ) cũng vậy ⇒ không do L03a, ghi N23; nếu muốn hiểu
tiêu chí "--perf không tăng so baseline" theo nghĩa đen thì chuyển L03a về VERIFY_FAIL. Thêm N22 (đợt 9: nút next slider cũ không
chạy — Flash Sale bàn phím, ảnh thẻ cảm nhận, PDP liên quan 844×390), N23 (đợt 3), N24 (đợt 2: viền focus topbar d1440 đặt lịch dao động 10 → 12, có cả khi đồng bộ). Việc tiếp theo: N24 (đợt 2), L03b (phần còn lại), L03c, N23, L11, L37.
Tổng: 81 việc · DONE 29 · TODO 52 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0 (--quick)
Vòng: 41 (30/10/2026) · Việc vừa làm: L03b1 → DONE (việc con mới của L03b: gỡ Font Awesome ở KHUNG CHUNG — header, topbar, menu,
footer, thanh đáy, breadcrumb, widget liên hệ, popup giỏ, tìm kiếm). Mã đã có sẵn trong cây làm việc từ lượt trước bị ngắt (chưa ghi
BACKLOG) ⇒ đăng ký L03b1, kiểm lại toàn bộ. Lượt 1 CHƯA ĐẠT: CSS cũ `svg path {fill}` tô đặc icon nét — tim + giỏ header 1024/1440
(pharma_ui_kit.bwt) và 1 icon widget liên hệ (global_core) ⇒ giới hạn `svg:not([fill="none"])`. Lượt 3 ĐẠT 7 khung × 6 trang: `<i fa->`
khung chung 36 → 0 (trang chủ) / 45 → 0 (tìm kiếm rỗng), icon nhìn thấy before = after, lệch tâm ≤ 4px, tô đặc 0, 0 lỗi JS; ui-verify
--quick 0 lỗi mới — commit 5f38dbb, reports/L03b1.md. Đồng bộ E.7: L03 + L03a ❓ → ⬜ (chủ dự án đã trả lời). Việc tiếp theo: L03a (TODO, phương án 2),
rồi L03b (phần còn lại: 299 lượt FA ngoài khung chung + 38 trường settings + gỡ CDN), L03c, L11, L37.
Tổng: 78 việc · DONE 28 · TODO 50 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0
Vòng: 40 (30/10/2026) · Việc vừa làm: L03a → BLOCKED_OWNER (không sửa mã theme). Phần font đã đạt (N19, N21). Phần JS: thử defer
trần jquery/swiper/lazy bằng page.route (evidence/L03a/probe-defer-gain.mjs, 390 4G CPU 4×): FCP nhanh 0,4–1,5 s nhưng 3–5 lỗi JS
mỗi trang — 45 script nội tuyến gọi jQuery + 8 `new Swiper` chạy lúc parse (≈ 40 file, gồm section_flash_sale.bwt đang sửa dở);
B.5 giữ jQuery cho plugin Sapo (không kiểm được ở local) ⇒ đề xuất ui-loop/proposals/L03a.md. Việc tiếp theo: L03b, rồi L03c, L11, L37.
Tổng: 77 việc · DONE 27 · TODO 49 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 1 (L03a)
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0
Câu hỏi MỚI cho chủ dự án (L03a, xem ui-loop/proposals/L03a.md):
  Chọn (1) defer cả 3 + bọc 53 script nội tuyến trong DOMContentLoaded (≈ 40 file, tách việc con theo nhóm trang, được sửa
  section_flash_sale.bwt) · (2) chỉ defer Swiper + LazyLoad, giữ jQuery đồng bộ (đúng B.5) · (3) bỏ phần JS khỏi L03a?
Vòng: 39 (30/10/2026) · Việc vừa làm: N21 → DONE — đổi giá trị 300→400 / 800→700 trong home-portal.css,
home-portal-integration.css, page_collection.scss.bwt (đúng mặt font đang vẽ sau N19). 6 trang Q × 7 khung: phần tử chữ ngoài
400–700 / 33 → 0, /collections/all 38–43 → 0; bề rộng chữ 12 nhóm trước = sau (0px) ⇒ giao diện không đổi; ui-verify --quick
0 lỗi mới (lượt 1 dao động N07) — commit 02ea258, reports/N21.md. Việc tiếp theo: L03a (TODO đầu đợt 3), rồi L03b / L03c, L11, L37.
Tổng: 77 việc · DONE 27 · TODO 50 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0
Vòng: 38 (30/10/2026) · Việc vừa làm: N19 → DONE (phương án 2 — Montserrat tĩnh tự host 400/500/600/700, gỡ Google Fonts ở
theme.bwt + chat.bwt). WebKit mực 600/400 1,01 → 1,68 (Chromium 1,72), 0 request Google Fonts, 12 woff2 /assets 200, ui-verify
--quick 0 lỗi mới — reports/N19.md. Phần font của L03a đã xong (L03a còn JS defer). Thêm N21 (đợt 3): chữ đặt 300/800 ngoài thang
(h1 hero /, 70 phần tử 800 ở / + /collections/all) nay vẽ bằng 400/700. Việc tiếp theo: N21, rồi L03a / L03b / L03c, L11, L37.
Tổng: 77 việc · DONE 26 · TODO 51 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 0
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0
Vòng: 37 (30/10/2026) · Việc vừa làm: L03 → BLOCKED_OWNER (không sửa mã). Kiểm kê: Font Awesome 338 lượt / 103 icon / 72 file +
38 giá trị `fa-…` trong settings_data.json; `ui_icon.bwt` (KHOÁ) có 43 icon, THIẾU 59 ⇒ tiêu chí "0 file Font Awesome" cần thêm
icon thư viện + đổi trường settings (G.6) ⇒ đề xuất ui-loop/proposals/L03.md. N19 đã được chủ dự án đưa về TODO (phương án 2 —
font tự host) ⇒ việc tiếp theo: N19 (TODO đầu đợt 3), rồi L11 / L37.
Tổng: 73 việc · DONE 25 · TODO 47 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 1 (L03)
Câu hỏi MỚI cho chủ dự án (L03, xem ui-loop/proposals/L03.md):
  (1) thêm 59 icon (Lucide) vào snippets/ui_icon.bwt hay duyệt danh sách thay icon gần nghĩa có sẵn?
  (2) cho đổi 38 giá trị trường settings `fa-…` sang tên ui_icon + sửa mô tả schema (không xoá trường)?
  (3) cho tách L03 → L03a (font tự host + JS defer) / L03b (gỡ FA) / L03c (ảnh, trùng L37) để làm dần?
Vòng 36 (30/10/2026) · Việc vừa làm: N19 → BLOCKED_OWNER (không sửa mã). Nguyên nhân đo được (checks/N19.mjs): Google Fonts trả
1 file Montserrat variable cho mọi độ đậm; WebKit Playwright (Windows) không vẽ trục wght ⇒ MỌI chữ Montserrat mảnh (mực 300/600/800 =
1 075/1 091/1 104; file tĩnh 2 674/5 601/7 759). Sửa = tự host font tĩnh, chạm tokens.css KHOÁ + R7 ⇒ đề xuất ui-loop/proposals/N19.md.
Việc tiếp theo: L03 (TODO đầu tiên đợt 3), rồi L11 / L37.
Vòng 35: N20 → DONE — commit 82ff619, reports/N20.md.
Vòng 34: L02 → DONE — commit 04c14de, reports/L02.md. Thêm N20 (đợt 2).
Vòng 33: L02 giữ IN_PROGRESS — preview khởi động lại thất bại (EADDRINUSE :3001), đã khắc phục ở commit 1c9f36f.
Vòng 32: L02 → IN_PROGRESS (axe color-contrast 4 264 → chỉ còn select thanh dev; đã sửa dev-server.js ⇒ tạo ui-loop/RESTART-PREVIEW, dừng vòng; vòng sau kiểm đủ rồi commit)
Tổng: 73 việc · DONE 25 · TODO 47 · IN_PROGRESS 0 · VERIFY_FAIL 0 · BLOCKED 0 · BLOCKED_OWNER 1
Quét full sạch liên tiếp: 0/2 (clean_runs = 0) · Lỗi mới so với baseline: 0 (lượt --write-baseline N18 lại gặp webkit390 /collections/all 90 → 120 / 24 → 40 = dao động N07, baseline ghi 120/40)
Câu hỏi cho chủ dự án:
- L03a: ĐÃ TRẢ LỜI 30/10/2026 — chọn PHƯƠNG ÁN 2: defer swiper + lazy, giữ jQuery đồng bộ; bọc 8 khối Swiper nội tuyến. L03a về TODO.
- L03: ĐÃ TRẢ LỜI 30/10/2026 — (1) ưu tiên icon gần nghĩa có sẵn, thiếu mới thêm Lucide, logo MXH dùng SVG logo; (2) cho đổi 38 trường settings FA sang tên ui_icon + sửa mô tả schema, không xoá trường, snippet hiểu cả giá trị cũ; (4) tách L03a/b/c. L03 về TODO.
- N19: ĐÃ TRẢ LỜI 30/10/2026 — chọn (2) tự host Montserrat tĩnh 400/500/600/700, sửa tokens.css (đã duyệt), gỡ Google Fonts, gộp vào L03. N19 về TODO.
- N17-a: ĐÃ TRẢ LỜI 25/10/2026 — chọn (2): giữ CSS, tiêu chí WebKit no-preference đo theo trạng thái CSS (không theo khung rAF headless); ngưỡng 400ms giữ cho Chromium; áp dụng cả N18. N17, N18 về TODO.
- N17-b: ĐÃ TRẢ LỜI 25/10/2026 — cho ghi mốc mới 23 (d1440 /collections/all focusNoRing) khi commit N17.
- N17 (cũ): ĐÃ TRẢ LỜI 24/10/2026 — chủ dự án duyệt PHƯƠNG ÁN A (tokens.css .01ms → 0s, xoá khối trùng global_core); N17 về TODO.
- L01: ĐÃ TRẢ LỜI 24/10/2026 — chủ dự án cho sửa luồng ui-verify: mở nhóm đầu cây #header-category-menu rồi đếm link con thật (URL gốc /<handle> như menu Sapo), ngưỡng ≥ 5 giữ nguyên; đã sửa + G.7 cập nhật; luồng L01 đạt 3/3 (11 link).
- D07: đã trả lời 24/10/2026 và đã xử lý (DONE vòng 21).
- N15: ĐÃ TRẢ LỜI 24/10/2026 — script vòng lặp tự khởi động lại preview khi agent tạo file ui-loop/RESTART-PREVIEW (xem PROMPT).
- (không có — xung đột M.4 `h-6 w-6` / D.7 "checkbox ≥ 24px" với B.7 "vùng chạm mobile ≥ 44px" đã xử theo A.1: vùng bấm 44px,
  ô nhìn thấy vẫn 24px; nếu chủ dự án muốn khác thì báo lại)

Ghi chú:
- Vòng 32 (L02, chưa commit mã): cây làm việc có ~28 file sửa của L02 (xem BACKLOG). `configs/settings_data.json`: L02 chỉ đổi 5 dòng
  màu (`theme_main_color`, `color_price`, `contact_us_color`, `header_topbar_bg`, `skinhealthy_main_color`) — khi commit phải tách
  riêng (vd `git diff` → patch chỉ 5 dòng → `git apply --cached`), KHÔNG cuốn dòng `home_skin_scan_image` / newline của chủ dự án.
  `snippets/section_flash_sale.bwt` không thuộc L02. Quét `scan` không được chạy trong lúc sửa file (preview tự nạp lại ⇒ lượt lỗi
  "Execution context was destroyed"). Đổi giá trị trong CSS cũ / design_tokens (đóng băng R1/B.3) là cách duy nhất đạt L02 khi
  không được thêm CSS — ghi rõ ở báo cáo L02.
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
- Vòng 15 xong N10: components.css v1.7 — popup mở ⇒ `header.header` `isolate z-header` (30); desktop header static nên cần
  `isolate` để gói `.main-header` z 100 / topbar 10010 / `.header-menu` dính 10020. Đối chứng HEAD bằng `ui-loop/evidence/N10/head-pc-ui.css`.
  Ảnh N10 vẫn thấy nút đóng popup nền xám (N11).
- Vòng 16 xong N11: components.css v1.8 — `.pc-modal__close` `m-0 border-0 border-none bg-transparent p-0 cursor-pointer`. Lần đo đầu
  dùng `border-solid` ra "solid 0px" ⇒ đổi `border-none` cho khớp chữ tiêu chí rồi build + đo lại toàn bộ. Đối chứng HEAD bằng
  `ui-loop/evidence/N11/head-pc-ui.css`. Nút đóng chưa có hành vi đóng (bấm / Escape) — thuộc D05.
- Vòng 17 xong D05: `assets/pc-ui.js` (nạp defer ở theme.bwt + chat.bwt), components.css v1.9 (khoá cuộn `html:has(.pc-modal:not([hidden]))`,
  `.pc-swiper > .swiper` overflow hidden), `ui_field` ô lỗi luôn có icon + `[data-pc-error-text]`, form kit có `data-pc-form` + nút "Gửi"
  (D04.mjs đếm nút sẽ thấy thêm 1 nút). Swiper 6.6.2 đóng gói thiếu module keyboard/a11y ⇒ pc-ui.js tự làm phím mũi tên. API cho
  việc sau: `PC.toast(msg, {actionLabel, actionHref})`, `PC.openModal(id, opener)` / `PC.closeModal()`, `PC.swiper(el)`, `PC.form(form)`.
  Thêm N13 (đợt 5): `.pc-fab` che chữ lỗi / ô nhập trang kit khi cuộn. Lượt `--write-baseline` lại gặp dao động N07 (webkit390
  /collections/all 90 → 120) — baseline ghi 120/40.
- Vòng 18 xong D06 (vòng trước bị ngắt sau `D06.mjs before` + 1 lượt after chưa ghi — vòng này build + đo lại toàn bộ): theme.bwt
  gỡ CDN, nạp `pc-legacy-tw.css` cuối `<head>` (sau `content_for_header`, đúng chỗ CDN chèn `<style>`) ⇒ 36 class trùng khác khai
  báo với pc-ui.css (`text-*`, `rounded-xl/2xl`) bản cũ vẫn thắng như thời CDN — `ui-loop/css-inventory.md`. `D06.mjs after` so
  before.json còn lệch do nhiễu: đồng hồ Flash Sale, giờ tin nhắn, `div.container` marginLeft 0↔80px giữa các lần nạp
  (`evidence/D06/probe-margin.mjs`). Class chỉ có trong nội dung Sapo thật (không có trong `data/`) không được sinh ⇒ thêm safelist.
- Vòng 20 xong D08 (D07 lúc chọn việc còn BLOCKED_OWNER; chủ dự án trả lời trong lúc vòng chạy): chỉ sửa `preview-mock.js` (server
  tự nạp lại). Mẫu URL tag bài viết cho L08: `/search?query=tags:(<tag>)&type=article` (cú pháp `tags:(…)` theme gốc đã dùng ở
  header.bwt:235, tab_product.bwt:248 — chưa đối chiếu Sapo thật). Gợi ý tìm kiếm ở local cần chuyển `https://localhost/search…`
  về http:3000 bằng `page.route` (N14). Thêm N14, N15 (đợt 9). Mã D07 vẫn trong cây làm việc, không nằm trong commit D08.
- Vòng 21 xong D07: chỉ sửa ngưỡng bbox trong `ui-loop/checks/D07.mjs` theo duyệt chủ dự án (mã snippet/lint/rule/kit từ vòng 19
  đi vào commit c336e40). Đợt 0 đã DONE hết.
- Vòng 22 xong L01: chỉ XOÁ quy tắc `.header-menu .sudes-cate-header { display:none!important }` (global_core ≤ 991px — cây danh mục đã
  được main.js / shim header dựng vào drawer, chỉ bị ẩn) + đổi GIÁ TRỊ thanh đáy trong settings_data (products bật, nhãn "Danh mục"; tắt
  "Trước Sau"; slot blog → "Soi da & Dịch vụ" /truoc-sau-cham-soc-da-tu-xa = trang "DỊCH VỤ" của menu header). Commit chỉ stage đúng các dòng
  thanh đáy của settings_data (`git apply --cached`), phần `home_skin_scan_image` của chủ dự án vẫn để trong cây làm việc.
  WebKit: nội dung drawer `visibility:hidden` ~1,3s sau khi bấm ☰ ⇒ L01.mjs chờ hết ẩn rồi mới đo (ghi số ms) — N17. Thêm N16 (kiểu cây
  danh mục drawer: mục 31px, icon ≡, ô ảnh 72px), N17 (đợt 1).
- Vòng 23 xong L34: chỉ XOÁ khai báo cũ cắt nhãn (`comp_mobile_nav.scss.bwt` nowrap/ellipsis/max-width 72px + padding link; nhãn 11px trang
  chủ trong `home-portal-integration.css`) + snippet so `page.url` với `mobile_nav_blog_url` để tô/`aria-current` trang "Soi da & Dịch vụ".
  Preview trả `page.url` theo tên template (`/clinical-proof`) ⇒ `preview-mock.js` thêm `SAPO_PAGE_HANDLE` (page.clinical-proof →
  `truoc-sau-cham-soc-da-tu-xa`) như Sapo thật. Nhãn "Soi da & Dịch vụ" xuống 2 dòng ở 390/320 (đọc trọn; ngắt dòng gọn hơn khi chuyển
  sang `pc-bottomnav` — C.2 #8). Thanh đáy còn hiện ở 844×390 (L06), icon còn Font Awesome (L03).
- Việc kế tiếp: N16, rồi N17 (đợt 1), sau đó đợt 2 (L02).
  N12 thuộc đợt 8, N13 đợt 5, N14/N15 đợt 9.

Ghi chú dựng vòng lặp:
- Baseline `ui-loop/baseline.json` = quét full bản hiện tại (trước mọi sửa đổi); vòng 1 trộn thêm 18 lượt trang quick, vòng 2 trộn 30 lượt, vòng 3 trộn 18 lượt, vòng 5 trộn 21 lượt, vòng 6 trộn 21 lượt.
- Mốc ui-guard `ui-loop/guard-baseline.json` ghi nợ cũ: inlineStyle 244 · faIcon 356 · extCdn 11 · rawButton 260 · tailwindCdn 1 · styleTag 26 · important 1237 · hexInMarkup 62 · arbitrary 34 · smallText 22 · shadow 24.
- Vòng 24 xong N16: bean-menu-cate.bwt bỏ TRANG CHỦ khỏi cây danh mục (cả mega-menu desktop — cùng markup), icon ≡ link con chỉ khi menu con có link, utility A.3 (py-3 … lg:p-0) thay padding cũ đã xoá ở global_core; ô thay thế bỏ min-height 64px (storefront-v3), desktop giữ bằng lg:min-h-16; header.bwt dời khối Quiz da / ngôn ngữ vào vùng cuộn drawer + mb-16 chừa thanh đáy. Thêm N18 (đợt 1): WebKit không thấy icon ≡. Lượt --write-baseline gặp `a.backtop` WebKit 390 trang chủ lúc có lúc không (touch<44 64 → 65, noName 42 → 43 trong mốc) — nút tự ẩn 1,4s sau cuộn, không do N16.
- Vòng 25 N17 → BLOCKED_OWNER (không sửa mã, không build): probe trong trang (`ui-loop/evidence/N17/probe.mjs`, `probe-fix.mjs`,
  `probe-swiper.mjs`) cho thấy độ trễ chỉ có khi `prefers-reduced-motion: reduce` — quy tắc `*{transition-duration:.01ms!important}`
  (tokens.css KHOÁ + global_core) tạo chuyển tiếp `visibility` từng tầng. Các script L01/N16 chạy `reducedMotion: 'reduce'` nên luôn
  thấy độ trễ này. Vòng sau làm N18.
- Vòng 26 (bị ngắt): ghi tiêu chí N18 + probe; chủ dự án duyệt N17 phương án A trong lúc đó (proposals/N17.md, N17 về TODO).
- Vòng 27 N18 → VERIFY_FAIL lần 1. Mã N18 ĐỂ TRONG CÂY LÀM VIỆC, chưa commit: `snippets/bean-menu-cate.bwt` (icon ui_icon 'menu' + lg:hidden),
  `assets/global_core.scss.bwt` (xoá `.down_icon:before`, `.current:before`, `transition .5s all` — khối cây danh mục drawer, ~dòng 3440–3530),
  `assets/pc-ui.css` + `assets/pc-legacy-tw.css` (sinh). Mọi mục N18.mjs đạt trừ (2) WebKit: reduce chênh icon–link 325–359ms (tầng SVG thêm
  1 bước chuyển tiếp `.01ms` của tokens.css), no-preference 403/433ms (= thời điểm link hết ẩn, nhiễu WebKit). `evidence/N18/probe-n17fix.mjs`:
  phương án A ⇒ chênh 0ms, link 127–266ms.
  **VÒNG SAU: làm N17 TRƯỚC (đã duyệt — như vòng 5 làm N03 trước D04), rồi chạy lại `node ui-loop/checks/N18.mjs` (không chạy `before`
  — before.json đo trên bản chưa sửa).** Commit N17 không cuốn hunk N18 trong global_core.scss.bwt (lọc patch + `git apply --cached`) —
  hoặc nếu N18 đạt ngay sau N17 thì commit N18 riêng tiếp theo.
- Vòng 28 N17 → BLOCKED_OWNER lần 1 (câu hỏi N17-a, N17-b ở trên). Mã N17 ĐỂ TRONG CÂY LÀM VIỆC, chưa commit: `ui-src/css/tokens.css`
  (`transition-duration: 0s`), `assets/global_core.scss.bwt` (xoá khối `*` .01ms cuối file, ~dòng 5566 — cùng file với hunk N18 ~dòng 3440–3530),
  `assets/pc-ui.css` (sinh). Kiểm: `node ui-loop/checks/N17.mjs` (Swiper so đối chứng chèn `.01ms` trong trang); đối chứng HEAD:
  `evidence/N17/head-pc-ui.css` + chèn lại khối `.01ms` (probe-nopref/probe-focus/probe-hero/probe-voucher-nav.mjs). Chữ hero 1440 mờ = L11 (như HEAD).
  Vòng sau: N18 (VERIFY_FAIL lần 1) đo được với mã N17 trong cây, nhưng tiêu chí (2) no-preference WebKit ≤ 400ms vướng đúng N17-a ⇒
  nếu chủ dự án chưa trả lời N17-a, chạy `node ui-loop/checks/N18.mjs` sẽ lại có thể ✗ ở mục đó.
- Vòng 29 N18 → BLOCKED_OWNER lần 2 (không sửa mã; build:sapo + ui-guard PASS; N18.mjs after-run3 đạt hết, after-run4 ✗ WebKit no-preference
  433ms). Thêm N19 (đợt 3): chữ drawer/thanh đáy WebKit vẽ mảnh dù computed Montserrat 600 (evidence/N18/probe-font-weight.mjs).
  **Cây làm việc vẫn giữ mã N17 + N18 chưa commit** (tokens.css, global_core.scss.bwt 2 vùng ~3440–3530 và ~5566, bean-menu-cate.bwt,
  pc-ui.css / pc-legacy-tw.css sinh). Vòng sau làm L02 (đợt 2): KHÔNG cuốn các hunk này vào commit L02 (lọc patch + `git apply --cached`
  nếu L02 phải sửa cùng file); file sinh pc-ui.css/pc-legacy-tw.css sẽ chứa cả phần N17/N18 — ghi rõ trong báo cáo L02.
- Vòng 30 N17 → DONE (commit 1c2f1f9). Owner chuyển N17/N18 về TODO trong lúc vòng chạy ⇒ đổi việc từ L02 sang N17 (đợt 1 trước đợt 2).
  L02 chỉ mới ghi tiêu chí cụ thể + viết `ui-loop/checks/L02.mjs` (chưa sửa, chưa có số đo — lượt quét `scan before` bị dừng giữa chừng, file
  evidence/L02/before-scan.txt không dùng được). Commit N17 chỉ mang phần N17 (stage bằng `ui-loop/evidence/N17/stage-n17.mjs`).
  **Cây làm việc vẫn giữ mã N18 chưa commit** (global_core.scss.bwt ~3440–3530, bean-menu-cate.bwt, pc-ui.css `lg:hidden`, pc-legacy-tw.css).
  **Vòng sau: N18 (TODO, Lần thử 2)** — chạy `node ui-loop/checks/N18.mjs` (KHÔNG chạy `before`); tiêu chí (2) WebKit no-preference đo
  setTimeout + getComputedStyle theo N17-a (sửa N18.mjs như N17.mjs vòng 30). Sau đó N19 thuộc đợt 3 ⇒ L02 (đợt 2) trước.
- Vòng 31 N18 → DONE lần 3: không sửa mã; checks/N18.mjs đo WebKit no-preference bằng setTimeout + getComputedStyle (N17-a). Commit gồm mã N18
  từ vòng 27 (bean-menu-cate.bwt, global_core.scss.bwt chỉ hunk N18, pc-ui.css / pc-legacy-tw.css sinh). Cây làm việc hết mã N17/N18 chưa commit.
  **Vòng sau: L02 (đợt 2, TODO, Lần thử 0)** — tiêu chí + `ui-loop/checks/L02.mjs` đã viết vòng 30 (chưa commit, chưa đo); chạy
  `node ui-loop/checks/L02.mjs` ghi số đo trước khi sửa (evidence/L02/before-scan.txt cũ không dùng được).
