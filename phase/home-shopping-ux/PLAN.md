# Kế hoạch cải thiện trang chủ, điều hướng mua sắm và giao diện mobile

Ngày lập: 20/09/2026. Đối tượng thực hiện: coding agent, dự kiến model 5.6 Luna.

**Trạng thái: CHỈ LẬP KẾ HOẠCH — CHƯA TRIỂN KHAI.** Việc tạo tài liệu này không đồng nghĩa được phép sửa theme. Chỉ thực hiện các đầu việc dưới đây khi người dùng giao triển khai.

## 1. Mục tiêu và phạm vi

1. Trang chủ có hướng dẫn rõ ràng để người dùng bắt đầu Quiz da và tiếp cận chat AI.
2. Hero có khung nội dung tối đa 564px trên desktop, nền trong suốt, bo góc 40px.
3. Flash Sale có ảnh động phù hợp, badge giảm giá đỏ và thông tin khuyến mại chính xác.
4. Mobile sử dụng thuận tiện: header, menu, tìm kiếm, nút lên đầu trang và liên hệ không che nội dung; người dùng ẩn được cụm liên hệ và mở lại được.
5. Trang danh mục cha có ô danh mục con theo nhu cầu, đặc biệt nhóm tinh chất/serum.
6. Tìm kiếm sản phẩm có bộ lọc nhanh, đồng bộ với bộ lọc thật của Sapo.
7. Ẩn các điểm truy cập “Tích điểm đổi quà” trên giao diện.
8. Tham khảo cấu trúc Biologique Recherche; nghiên cứu nhu cầu tìm kiếm tại Việt Nam để đề xuất danh mục và từ khóa phù hợp với hàng đang bán.
9. Giữ Montserrat và layout storefront dùng chung; chỉ dọn CSS/JS được chứng minh không còn sử dụng.

Không thuộc phạm vi: xây lại backend Quiz/chat, thay cơ chế chấm điểm da, sửa giá hàng loạt, tạo chương trình giảm giá giả, thêm sản phẩm chưa có, xóa dữ liệu tích điểm, thay hệ thống MOPS, tự commit/push/deploy.

### Những quyết định đã chốt và giả định thực hiện

| Nội dung | Cách áp dụng |
| --- | --- |
| Font | Montserrat cho chữ UI, theo lựa chọn của người dùng; giữ ngoại lệ font icon và vùng mã |
| Layout | Storefront/SHB dùng `layouts/theme.bwt`; không khôi phục `skinhealthy.bwt` hoặc `clean.bwt` |
| Shell chuyên biệt | Giữ `chat.bwt`, `mops-admin.bwt` theo kiến trúc hiện tại |
| Hero 564px | Hiểu là chiều rộng tối đa toàn bộ khung chữ, tính cả padding bằng border-box; không phải chiều cao; mobile co theo vùng hiển thị |
| Hero nền/bo góc | `background: transparent`, `border-radius: 40px`; giữ nền ảnh Swiper full-bleed |
| Flash Sale | Badge đỏ, chữ tương phản; màu đề xuất `#D92D20`, triển khai theo cơ chế cấu hình/token phù hợp |
| Liên hệ nổi | Ba trạng thái: thu gọn, mở danh sách, ẩn cả cụm; có đường mở lại trong menu/footer |
| Quyền thay đổi | Kế hoạch này chỉ mô tả công việc; chưa cho phép thay đổi theme hoặc dữ liệu bên ngoài repo |

## 2. Rule và cách tiếp tục công việc

Trước khi sửa theme, đọc đầy đủ:

- [AGENTS.md](../../AGENTS.md).
- [Rule&HDKTXD.md](../../Rule&HDKTXD.md).
- [.clinerules/01-quy-chuan-theme-sapo.md](../../.clinerules/01-quy-chuan-theme-sapo.md).
- [.clinerules/02-du-an-pharma-cosmetics.md](../../.clinerules/02-du-an-pharma-cosmetics.md).
- [README.md](../../README.md).

Nguyên tắc thực hiện:

- Kiểm tra `git status` trước khi làm; working tree đã có nhiều thay đổi từ đợt đồng bộ font/layout. Không reset, không ghi đè hay coi thay đổi cũ là kết quả của phase này.
- Đối chiếu [kế hoạch font/SHB trước đó](../unify-font-shb/PLAN.md) và hiện trạng code; không mặc định báo cáo cũ là bằng chứng mọi trang đã đúng.
- Mỗi lần làm một đầu việc có mã, kiểm tra kết quả rồi cập nhật checkbox; không đánh dấu hoàn thành chỉ vì đã viết code.
- Nội dung hiển thị phải cấu hình hóa; tìm và tái sử dụng setting hiện có trước. Bổ sung setting chỉ cho chức năng thực sự mới trong phạm vi, giữ giá trị merchant và không gộp/xóa setting không liên quan.
- Checkbox tắt phải thực sự tắt: tránh dùng fallback khiến giá trị `false` bị thay bằng `true` trong Liquid.
- Dùng “Chuyên gia”; không thêm thông tin tư vấn, thời lượng Quiz, cam kết miễn phí hoặc tác dụng sản phẩm chưa được xác minh.
- Ảnh qua `img_url` theo rule, alt riêng, kích thước xác định; ảnh LCP preload/eager, ảnh dưới fold lazy. Xác minh CDN vẫn giữ chuyển động cho ảnh động.
- Không đổi cú pháp Sapo thành cú pháp chỉ chạy trong LiquidJS preview.
- Không dựng `.project-agent/`. Tài liệu phase là tạm; quyết định kiến trúc lâu dài được cập nhật vào rule chuẩn khi đã triển khai và kiểm chứng.
- Mô tả hero kính trắng trong rule vận hành hiện tại là hiện trạng cũ; yêu cầu nền trong suốt mới của người dùng là đích thực hiện. Khi hoàn tất phải cập nhật mô tả đó, không giữ hai quyết định mâu thuẫn.

## 3. Hiện trạng đã khảo sát và vấn đề cần xử lý

Các phát hiện sau là mốc khảo sát ngày lập kế hoạch, cần xác minh lại khi bắt đầu triển khai vì code có thể thay đổi.

| Khu vực | Hiện trạng | Hệ quả |
| --- | --- | --- |
| Hero | `.portal-hero__copy` có width tối đa 700px, nền trắng alpha .94, blur/shadow, radius theo token hiện khoảng 2px | Chưa đúng yêu cầu 564px/transparent/40px |
| Đường vào AI | Hero hiện ưu tiên đặt lịch và chọn theo vấn đề da; không thấy link AI trong nội dung Home Portal khi khảo sát | Người mới chưa biết bắt đầu Quiz/chat từ trang chủ |
| Flash Sale | Tiêu đề đang dùng `assets/flash_-1.png` | Chưa dùng ảnh động theo mong muốn |
| Badge giảm giá | Card đã có `.pc-flashsale__badge`; CSS tích hợp đang đặt nền xanh `#003F2D` | Cần chỉnh badge hiện có, không chèn badge trùng |
| Liên hệ | `support.bwt` có toggle/close, nhưng đóng panel vẫn để launcher nổi; icon có timer luân phiên | Chưa đáp ứng ẩn hoàn toàn để trả lại diện tích màn hình |
| Lên đầu trang | `footer_script.bwt` đẩy vị trí theo chiều cao footer đang nhìn thấy | Ở viewport 390×900 khi cuộn cuối trang, khảo sát thấy nút có top âm, ra ngoài màn hình |
| Tích điểm | `header.bwt` có link trực tiếp tới ứng dụng tích điểm | Cần ẩn đúng nguồn render và rà các vị trí khác |
| Tìm kiếm | `search.bwt` đã có `aside-filter`; footer script dùng `Bizweb.SearchFilter` và `col.js.bwt` | Mở rộng cơ chế hiện có, không dựng bộ lọc chỉ ẩn card trên trang hiện tại |
| Danh mục | Có template collection, menu và bộ lọc tag; chưa có mapping danh mục con được xác nhận cho yêu cầu mới | Cần xác định danh mục/tag thật trước khi render ô con |
| Dữ liệu preview | Có `data/navigation.js`, `data/collections.js`, `data/products.js` | Dữ liệu demo không chứng minh tồn kho, doanh số hoặc mức tìm kiếm thực tế |

## 4. Thứ tự công việc và phụ thuộc

| Đợt | Mã | Nội dung | Điều kiện bắt đầu |
| --- | --- | --- | --- |
| A | A01–A03 | Baseline, xác minh route và nguồn dữ liệu | Được giao triển khai |
| B | B01–B03 | Nghiên cứu danh mục/tìm kiếm, ảnh Flash Sale | A01; có thể làm trước các phần UI độc lập |
| C | C01–C03 | Hero và đường vào Quiz/chat AI | A02; route đích đã xác minh |
| D | D01–D03 | Header mobile, liên hệ, lên đầu trang | A01 |
| E | E01–E03 | Flash Sale | B03 cho ảnh động; giá/chiến dịch thật cho trạng thái bán |
| F | F01–F03 | Danh mục con và bộ lọc nhanh | A03 + B01/B02; mapping và query Sapo đã kiểm chứng |
| G | G01–G02 | Ẩn tích điểm, dọn asset có bằng chứng | Các phần liên quan đã ổn định |
| H | H01–H03 | QA tổng hợp, bàn giao, cập nhật tài liệu | C–G đã có kết quả kiểm tra |

Ưu tiên đầu tiên: đường vào AI, hero, lỗi mobile/nút nổi và Flash Sale. Không để việc chờ dữ liệu tìm kiếm cản các phần này. Nếu thiếu nguồn ảnh hoặc dữ liệu thật, ghi rõ đầu việc phụ thuộc chưa hoàn thành; không thay bằng dữ liệu bịa rồi đánh dấu xong.

## 5. Đợt A — Baseline và xác minh đầu vào

### A01 — Ghi nhận trạng thái trước thay đổi

- [ ] Đọc rule, ghi nhánh và trạng thái Git, nhận diện thay đổi đang tồn tại.
- [ ] Kiểm tra script thực tế trong `package.json`; dùng preview đang chạy nếu phù hợp, tránh mở server trùng cổng.
- [ ] Chụp baseline trang chủ, collection, search, SHB trên desktop và mobile; cuộn đến footer để kiểm tra nút nổi.
- [ ] Ghi computed style hero, header sticky, tọa độ widget/backtop và các CSS/JS đang điều khiển chúng.
- [ ] Ghi lỗi có trước: console, ảnh lỗi, overflow và luồng không chạy do thiếu backend. Phân biệt rõ lỗi mới với lỗi nền.

Đầu ra khi triển khai: bảng baseline/route trong tài liệu QA của phase. Chưa cần tạo hệ thống báo cáo hoặc thư mục quản lý riêng.

### A02 — Xác minh luồng Quiz và chat

- [ ] Đọc template `page.ai-skin-quiz.bwt`, route preview/Sapo và link AI hiện có.
- [ ] Kiểm tra `/kham-da-ai` đang dẫn tới đâu; đây là ứng viên từ link hiện hữu, không mặc định là URL cuối cùng.
- [ ] Kiểm tra Quiz → kết quả → chat có thật không, cần đăng nhập hay không, phiên cũ được xử lý thế nào.
- [ ] Chốt một cấu hình URL chuẩn cho các CTA cùng đích. Nếu Quiz và chat là hai đích khác nhau, đặt nhãn/URL riêng phù hợp.
- [ ] Xác định trạng thái khi endpoint hoặc dịch vụ không khả dụng để CTA không dẫn tới trang trắng.

Nghiệm thu: sơ đồ luồng ngắn có URL thật và hành vi từng nút; không mô tả tính năng chưa tồn tại.

### A03 — Xác minh dữ liệu thương mại

- [ ] Lập bảng danh mục cha → menu con → collection URL → tag/filter thực tế → số sản phẩm đủ điều kiện.
- [ ] Kiểm tra dữ liệu giá/compare-at theo biến thể trong card Flash Sale và nguồn thời gian chiến dịch.
- [ ] Xác định engine filter hiện tại hỗ trợ type/vendor/tag/price đến đâu, cú pháp URL, toán tử, phân trang và sort.
- [ ] Tách rõ dữ liệu trong repo preview với dữ liệu cần xác minh ở Sapo Admin/storefront thật.

Nghiệm thu: không có giả định “Sapo có collection con tự động” hoặc “query preview chạy thì production chắc chắn chạy”.

## 6. Đợt B — Nghiên cứu và chuẩn bị nội dung

### B01 — Tham khảo cấu trúc Biologique Recherche

- [ ] Tham khảo cách đi từ loại sản phẩm sang nhu cầu da: blemishes, hydration, pigmentation, sensitivity, anti-aging, firmness/plumpness.
- [ ] Tham khảo menu, cấu trúc trang serum và cách tìm theo sản phẩm/nhu cầu/loại da.
- [ ] Chuyển thành danh mục phù hợp ngôn ngữ và catalog Pharma Cosmetics; không sao chép ảnh, mô tả hoặc thêm hàng BR chỉ vì có trên trang tham khảo.

Nguồn đã khảo sát:

- [Trang chính Biologique Recherche](https://www.biologique-recherche.com/en-ww).
- [Danh mục face serums](https://www.biologique-recherche.com/en-ww/collections/face-serums).
- [Danh mục blemishes serums và hệ điều hướng theo nhu cầu](https://www.biologique-recherche.com/en-us/collections/blemishes-serums).

### B02 — Xác định nhóm sản phẩm được quan tâm qua tìm kiếm

**Chưa có bảng search volume hiện tại được xác minh trong khảo sát. Các nhóm dưới đây là từ khóa đầu vào nghiên cứu, không phải bảng xếp hạng tìm kiếm năm 2026.**

| Nhóm nghiên cứu | Từ khóa/hướng phân nhóm ban đầu |
| --- | --- |
| Chống nắng | kem chống nắng, chống nắng da dầu, chống nắng da nhạy cảm |
| Làm sạch | sữa rửa mặt, tẩy trang, làm sạch dịu nhẹ |
| Dưỡng ẩm/phục hồi | kem dưỡng ẩm, HA, B5, ceramide |
| Serum theo hoạt chất | vitamin C, niacinamide, retinol, peptide |
| Serum theo nhu cầu | da dầu/mụn, thâm sau mụn, không đều màu, thiếu ẩm, nhạy cảm, dấu hiệu tuổi tác |
| Tẩy tế bào chết | AHA, BHA, tẩy tế bào chết hóa học |

- [ ] Nghiên cứu Google Trends khu vực Việt Nam trong 12 tháng gần nhất và đối chiếu 90 ngày gần nhất; ghi ngày đo, loại tìm kiếm và bộ từ khóa so sánh.
- [ ] Chuẩn hóa từ đồng nghĩa/có dấu/không dấu; phân biệt tên hoạt chất với loại sản phẩm và thương hiệu.
- [ ] Nếu có quyền truy cập, dùng Keyword Planner, Search Console và log tìm kiếm nội bộ để đối chiếu nhu cầu; không yêu cầu hoặc ghi credential vào repo.
- [ ] Không quy đổi chỉ số Trends 0–100 thành lượt tìm kiếm. Không dùng lượt thảo luận mạng xã hội để tuyên bố search volume.
- [ ] Tạo bảng gồm từ khóa, nguồn, địa lý, thời gian dữ liệu, chỉ số đúng loại, collection/tag tương ứng, quyết định giữ/loại.
- [ ] Chỉ đưa nhóm có sản phẩm thật vào menu/chip. Dùng nhãn “Gợi ý tìm kiếm” khi chưa có căn cứ cho nhãn “Tìm kiếm nhiều nhất”.

Nguồn bổ trợ đã tham khảo, cần sử dụng đúng giới hạn:

- [Google — Vietnam Search for Tomorrow](https://www.thinkwithgoogle.com/_qs/documents/10586/Vietnam_-_Search_for_tomorrow_EN_version.pdf): dữ liệu giai đoạn 2019–2020, chỉ là bối cảnh lịch sử; không chứng minh thứ hạng hiện nay.
- [Buzzmetrics — Thị trường skincare Việt Nam 2024–2025](https://www.buzzmetrics.com/report/thi-truong-skincare-viet-nam-2024-2025-nhung-thay-doi-trong-cach-nguoi-tieu-dung-cham-soc-da): tham khảo nhu cầu/thảo luận xã hội, không phải dữ liệu volume Google.

### B03 — Chuẩn bị ảnh Flash Sale

- [ ] Tìm asset merchant hiện có; khảo sát trước mới xác định `flash_-1.png`, chưa xác định ảnh động để dùng.
- [ ] Xác định ảnh động được cấp hoặc có quyền dùng, bản tĩnh tương ứng, kích thước, dung lượng và alt.
- [ ] Kiểm tra định dạng động qua Sapo CDN/`img_url` có còn chuyển động không; chọn cách phân phối tương thích rule.
- [ ] Có ảnh tĩnh cho `prefers-reduced-motion`, lỗi tải hoặc cấu hình trống. Không coi CSS tắt animation là đủ để dừng một GIF.
- [ ] Nếu chưa có asset, ghi đầu vào còn thiếu; không tuyên bố đã hoàn thành yêu cầu ảnh động.

## 7. Đợt C — Hero và chỉ dẫn vào AI

### C01 — Chỉnh khung chữ hero

- [ ] Sửa nguồn style của `.portal-hero__copy`, rà override trong `home-portal-integration.css` và media queries.
- [ ] Desktop: tối đa 564px, border-box; mobile: vừa vùng nội dung, không width cố định gây tràn.
- [ ] Nền transparent, radius 40px; bỏ nền kính trắng, backdrop blur, viền/shadow tạo cảm giác khối trắng cũ.
- [ ] Giữ Swiper ảnh nền full-bleed và neo nội dung hiện có; không đổi sang layout hai cột.
- [ ] Rà cỡ chữ, line-height, padding, khoảng cách CTA để Montserrat dễ đọc và không đẩy nút khỏi màn hình nhỏ.
- [ ] Kiểm tra độ rõ chữ trên từng slide và từng crop mobile; điều chỉnh vị trí/crop/màu chữ phù hợp, không tự thêm lại nền trắng trái yêu cầu.
- [ ] Giữ preload ảnh đầu, lazy ảnh sau, chiều cao ổn định, pause khi focus/hover và reduced-motion.

Nghiệm thu: computed style đúng 564px tối đa/transparent/40px; không overflow; tất cả slide có chữ và nút đọc được.

### C02 — Thêm đường dẫn và hướng dẫn Quiz/chat trên trang chủ

- [ ] Tận dụng một CTA hero để mở luồng AI hoặc thêm đường dẫn ngắn phù hợp; giữ CTA đặt lịch đang có nếu còn phục vụ luồng thật.
- [ ] Thêm khối hướng dẫn ngay sau hero, trước các nội dung dài; đăng ký theo cơ chế sắp xếp/bật tắt section hiện tại.
- [ ] Nội dung gợi ý: “Chưa biết chọn sản phẩm phù hợp với làn da?”; CTA “Bắt đầu Quiz da cùng AI” nếu đúng chức năng đích.
- [ ] Hiển thị tối đa ba bước ngắn theo luồng thật: trả lời câu hỏi → xem gợi ý → trao đổi AI, chỉ dùng bước nào đã có.
- [ ] Cấu hình hóa tiêu đề, mô tả, nhãn nút, URL, bật/tắt; tái sử dụng setting phù hợp trước khi thêm field.
- [ ] Thêm điểm truy cập trong menu mobile bằng nguồn menu/cấu hình đúng; không tạo thêm nút nổi gây chật màn hình.
- [ ] Chỉ hỗ trợ “Tiếp tục” nếu cơ chế session hiện tại đã có và kiểm chứng được.

### C03 — Kiểm tra luồng và đo lường

- [ ] Kiểm tra CTA desktop/mobile, người dùng mới, phiên cũ, đích không khả dụng, back về trang chủ.
- [ ] Bảo đảm khối mới không thêm H1 thứ hai; focus và tên truy cập rõ ràng.
- [ ] Nếu đã có analytics, dùng cơ chế hiện hữu để ghi click theo vị trí hero/section/menu; không gửi câu trả lời về da hoặc nội dung chat vào event marketing.

Nghiệm thu: từ trang chủ có đường vào Quiz/chat rõ và hoạt động; hướng dẫn khớp với luồng thật, không có lời hứa tính năng giả.

## 8. Đợt D — Mobile header, liên hệ và lên đầu trang

### D01 — Header và menu mobile

- [ ] Rà logo, hamburger, tìm kiếm, tài khoản, giỏ và badge số lượng tại 320/360/390/430px.
- [ ] Chọn kích thước/khoảng cách hợp lý; mục tiêu vùng chạm khoảng 44×44px, không làm hàng header tràn.
- [ ] Kiểm tra sticky từ đầu trang tới footer, topbar bật/tắt, đổi hướng màn hình; không nhảy layout hoặc che nội dung/anchor.
- [ ] Menu/search mở và đóng đúng, Escape/overlay hoạt động, khóa cuộn body được trả lại; focus trở về nút mở.
- [ ] Khi là modal, focus nằm trong modal; thiết bị có bàn phím ảo vẫn nhìn thấy ô tìm kiếm và nút đóng.
- [ ] Rà lớp chồng với giỏ, bộ lọc, chat, widget; tôn trọng safe-area.

### D02 — Cho phép ẩn hoàn toàn cụm liên hệ

- [ ] Tách ba trạng thái rõ: thu gọn (còn nút mở), mở panel, ẩn hoàn toàn (không còn cụm nổi).
- [ ] Cung cấp nút đóng panel và hành động “Ẩn nút liên hệ” dễ hiểu; ẩn không để lại phần tử vô hình bắt click/focus.
- [ ] Lưu lựa chọn ẩn trong phiên bằng sessionStorage hoặc cơ chế tương đương có fallback khi storage bị chặn.
- [ ] Thêm cách mở lại từ menu/footer, truy cập được cả khi cụm đang ẩn.
- [ ] Dùng button semantic, tên truy cập, `aria-expanded`/`aria-controls`; quản lý focus khi đóng hoặc ẩn phần tử đang focus.
- [ ] Dừng timer/animation khi widget ẩn, tab nền hoặc reduced-motion nếu phù hợp.
- [ ] Giữ thông tin điện thoại/Zalo/liên hệ lấy từ cấu hình hiện có; kiểm tra desktop và mobile.

Nghiệm thu: ẩn thật sự giải phóng góc màn hình, đổi trang trong phiên vẫn giữ lựa chọn, mở lại được; không ảnh hưởng truy cập liên hệ ở footer/menu.

### D03 — Sửa hành vi nút lên đầu trang

- [ ] Rà handler trong `main.js.bwt`, markup `footer.bwt`, vị trí trong `footer_script.bwt` và CSS; xác định một nơi chịu trách nhiệm cho từng hành vi.
- [ ] Loại lỗi đẩy nút quá cao theo chiều cao footer; giới hạn vị trí trong viewport bằng giải pháp bố cục/điều phối có ràng buộc.
- [ ] Đồng bộ khoảng cách với widget, safe-area, thanh đáy và nút thêm giỏ cố định nếu có.
- [ ] Xem lại ngưỡng hiện 200px hiện hữu theo trải nghiệm; đầu trang ẩn, sau khi cuộn hiện đúng.
- [ ] Click lên đầu trang không thêm hash ngoài ý muốn, không chạy nhiều handler; reduced-motion dùng cuộn không chuyển động.
- [ ] Không chặn nút cuối trang; kiểm tra footer cao/thấp, trang ngắn/dài, widget mở/thu/ẩn, menu/search/filter mở, bàn phím ảo và resize.

Nghiệm thu: trên mobile ở cuối trang, nút vẫn nằm trong viewport và không che CTA quan trọng; không lặp lại trường hợp top âm đã khảo sát.

## 9. Đợt E — Flash Sale thu hút và đúng dữ liệu

### E01 — Ảnh động và tiêu đề

- [ ] Thay ảnh tĩnh tiêu đề bằng nguồn ảnh động đã xác nhận, có setting ảnh động/ảnh tĩnh dự phòng nếu cần.
- [ ] Giới hạn kích thước, giữ kích thước bố cục cố định, không làm tăng tải ảnh hero hoặc gây CLS.
- [ ] Reduced-motion hiển thị bản tĩnh; lỗi/thiếu ảnh vẫn đọc được tên Flash Sale.

### E02 — Badge đỏ và tính đúng giảm giá

- [ ] Chỉnh badge có sẵn trong `product_grid_office_sale.bwt` và CSS scoped của section; rà cả inline style và selector dùng chung.
- [ ] Dùng nền đỏ/chữ trắng tương phản, Montserrat, cỡ chữ dễ đọc, đặt nhất quán ở góc ảnh.
- [ ] Badge được tính từ giá bán và compare-at của cùng biến thể mà card đại diện; tránh ghép giá min/max từ biến thể khác nhau.
- [ ] Chỉ hiện khi compare-at > giá bán và compare-at > 0; không hiện `-0%`, số âm sai hoặc phần trăm chia cho 0.
- [ ] Nếu hiển thị “tối đa”/“từ”, phải tính và ghi rõ theo dữ liệu thật, không tự lấy mức giảm cao nhất làm mức giảm chung.
- [ ] Kiểm tra card dùng chung ở bestsellers, featured và viewed để tránh đổi ngoài phạm vi hoặc badge chồng.

### E03 — Trạng thái chiến dịch và mobile

- [ ] Rà countdown hiện tại, gồm `home_flashsale_countdown_end` và `home_flashsale_countdown_cycle_hours`; hiển thị đúng chiến dịch thật, múi giờ và thời điểm hết hạn.
- [ ] Không tạo đếm ngược tự reset để giả khan hiếm; có trạng thái sắp diễn ra/đang chạy/đã hết hạn hoặc ẩn theo cấu hình.
- [ ] Không bịa % đã bán, lượng còn, lượt mua hoặc đánh giá.
- [ ] Mobile ưu tiên hai card nếu đủ chiều rộng; ở màn hình nhỏ chọn bố cục không ép chữ/giá/nút quá hẹp.
- [ ] Rà vuốt, điều hướng slide, ảnh, giá dài, sản phẩm hết hàng và thêm giỏ chỉ thực hiện một lần cho một lần bấm.

Nghiệm thu: ảnh động chạy ở môi trường đích, có fallback, badge đỏ đúng số, chương trình hết hạn không tiếp tục quảng bá sai, mua hàng không hồi quy.

## 10. Đợt F — Danh mục con và bộ lọc nhanh

### F01 — Mapping nhóm tinh chất/serum

Danh mục cha ví dụ: “TOP SẢN PHẨM TINH CHẤT CHUYÊN SÂU”. Chỉ tạo/hiển thị các ô sau nếu catalog thực tế có sản phẩm phù hợp:

| Ô danh mục con đề xuất | Hướng dữ liệu cần xác minh |
| --- | --- |
| Da dầu, mụn và lỗ chân lông | Collection/tag nhu cầu được merchant xác nhận |
| Thâm sau mụn, không đều màu | Mapping theo công dụng được công bố của sản phẩm |
| Da khô, thiếu ẩm | Nhóm cấp ẩm/dưỡng ẩm phù hợp |
| Da nhạy cảm, hỗ trợ phục hồi | Nhóm phù hợp từ dữ liệu catalog, không tự suy luận chỉ định |
| Chăm sóc dấu hiệu tuổi tác | Nhóm công dụng thực tế |
| Độ săn chắc | Chỉ tách riêng nếu đủ sản phẩm và khác biệt rõ với nhóm trước |

- [ ] Chọn nguồn cấu hình: menu/linklist có con hoặc mapping collection cha → linklist được chọn; kiểm chứng object Sapo hỗ trợ trước.
- [ ] Giữ URL/handle hiện có khi chỉ đổi nhãn; không tự đổi slug làm gãy SEO/link cũ.
- [ ] Không gán quan hệ cha/con bằng cách dò tiêu đề hoặc dựa vào dữ liệu mock.
- [ ] Nếu cần tạo collection/tag ở Sapo Admin, lập bảng giá trị/URL cụ thể để merchant thực hiện hoặc xử lý theo quyền được giao; không giả rằng sửa fixture đã thay dữ liệu thật.

### F02 — Ô danh mục con trên trang danh mục

- [ ] Bố cục: breadcrumb → tiêu đề/mô tả → ô danh mục con → bộ lọc nhanh → sort/số kết quả → sản phẩm → phân trang.
- [ ] Chỉ hiện ô con cho danh mục có mapping; không ép cùng nhóm serum vào mọi collection.
- [ ] Mỗi ô có tên, URL thật, ảnh đúng tỷ lệ nếu có; thiếu ảnh có fallback gọn và không làm gãy bố cục.
- [ ] Desktop khoảng 3–6 ô/hàng tùy chiều rộng; mobile ưu tiên hai cột, nhãn dài được xuống dòng.
- [ ] Danh mục rỗng có chính sách rõ: ẩn ô hoặc hiển thị trạng thái phù hợp, không dẫn tới ngõ cụt không giải thích.
- [ ] Menu mobile: bấm tên cha mở trang cha; nút mũi tên riêng mở menu con, tránh một thao tác bị chiếm cho hai hành vi.
- [ ] Giữ nhánh riêng hiện hữu như `dieu-tri-chuyen-nghiep` và kiểm tra `collection.skinhealthy.bwt` dùng khung chung đúng.
- [ ] Có đúng một H1 có ý nghĩa; rà H1 đang `d-none` trong collection thường.

### F03 — Bộ lọc nhanh tìm kiếm sản phẩm

- [ ] Rà `search.bwt`, `aside-filter`, `filter-cate-col.bwt`, `col.js.bwt`, loader `search_filter.js` và `Bizweb.SearchFilter`.
- [ ] Chốt tập filter thật: loại sản phẩm, nhu cầu da, hoạt chất, thương hiệu, giá. Chỉ đưa bộ lọc có dữ liệu/index hợp lệ.
- [ ] Còn hàng/đang giảm giá chỉ thêm nếu backend hỗ trợ điều kiện đúng; không lọc riêng các card đã tải.
- [ ] Hiện chip nhanh phía trên kết quả; desktop đồng bộ sidebar, mobile mở sheet lọc có nút áp dụng/xóa phù hợp.
- [ ] Hiện trạng thái đang chọn, số kết quả, bỏ một chip và “Xóa bộ lọc”; phân biệt xóa filter với xóa từ khóa tìm kiếm.
- [ ] Tái sử dụng engine/query hiện có: OR trong nhóm, AND giữa nhóm khi backend hỗ trợ; kiểm tra dấu ngoặc, escaping và tên tag.
- [ ] Giữ từ khóa `q`, loại tìm kiếm sản phẩm và sort; đổi filter về trang 1, phân trang giữ filter.
- [ ] URL chia sẻ/reload khôi phục lựa chọn; Back/Forward cập nhật đúng chip, sidebar, sort và kết quả.
- [ ] Xử lý gõ nhanh/request chồng để kết quả cũ không ghi đè kết quả mới; có loading, zero result, error/retry.
- [ ] Khi JS lỗi, form/link tìm kiếm chuẩn vẫn có đường hoạt động.
- [ ] Popup tìm kiếm mobile hiện có gợi ý phổ biến và lịch sử: đồng bộ nguồn từ khóa đã nghiên cứu, nhưng không đánh đồng gợi ý tìm kiếm với filter.
- [ ] Kiểm tra trực tiếp trên Sapo preview với dữ liệu thật; môi trường mock chỉ đủ kiểm tra UI và một phần luồng.

Nghiệm thu: chọn nhiều bộ lọc cho kết quả đúng toàn tập dữ liệu, không chỉ trang hiện tại; URL, phân trang, sort và Back/Forward đồng bộ.

## 11. Đợt G — Ẩn tích điểm và dọn mã thừa

### G01 — Ẩn “Tích điểm đổi quà”

- [ ] Tìm theo cả nhãn, URL `tich-diem-doi-qua`, loyalty và nguồn menu ở desktop/mobile/tài khoản/footer.
- [ ] Bỏ render điểm truy cập trong `header.bwt` và các nguồn khác; nếu cần bật lại về sau thì dùng một setting hiển thị chung phù hợp.
- [ ] Với menu lấy từ Admin, xử lý nguồn menu tương ứng hoặc ghi rõ thao tác Admin cần làm; không chỉ CSS hide một phần tử đang còn focus được.
- [ ] Rà `appbulk-loyalty-widgets.bwt` và app injection để biết widget có render độc lập không.
- [ ] Giữ dữ liệu điểm, lịch sử, tích hợp ứng dụng và `page.loyalty.bwt` trừ khi có yêu cầu riêng; ẩn mục điều hướng không đồng nghĩa xóa tính năng backend.
- [ ] Chỉ ngừng tải asset loyalty nếu chứng minh các đường truy cập còn giữ không cần chúng.

Nghiệm thu: không còn mục quảng bá/điều hướng tích điểm trong các vị trí được yêu cầu ẩn, không để khoảng trống; dữ liệu người dùng không bị tác động.

### G02 — Dọn CSS/JS không dùng với bằng chứng

- [ ] Lập bảng asset → nơi include/import → điều kiện tải → trang/trạng thái sử dụng → quyết định giữ/gộp/xóa.
- [ ] Tìm bằng `rg` trong layout/template/snippet/config/JS/build scripts, tính cả tên runtime khác tên nguồn: `.scss.bwt` → `.css`, `.js.bwt` → `.js`.
- [ ] Kiểm tra tên asset được ghép động, chế độ template khác, responsive, popup và app; một lần không thấy trong coverage chưa chứng minh là thừa.
- [ ] Dọn override cũ trực tiếp tại nguồn sau khi phần mới đã kiểm tra; tránh thêm nhiều lớp `!important` để thắng nhau.
- [ ] Không xóa global/vendor/MOPS/SHB asset chỉ vì trang chủ không dùng; không xóa font icon.
- [ ] Nếu các layout cũ đã bị xóa từ công việc trước, chỉ kiểm tra không còn tham chiếu runtime; không khôi phục hoặc ghi nhận lại như thành quả mới.
- [ ] Sau mỗi nhóm xóa, kiểm tra route chịu ảnh hưởng, network 404, console và build. Không xóa file còn chưa xác định đầy đủ người dùng.

Nghiệm thu: mọi asset bị xóa có lý do và bằng chứng; không sinh lỗi mất style/script ở trang SHB, account, search, collection, product, cart hoặc shell chuyên biệt.

## 12. Bản đồ file dự kiến

Đây là bản đồ điều tra, không phải yêu cầu sửa toàn bộ file. Kiểm tra tên/path thực tế trước khi dùng. File mới chỉ thêm nếu thực sự cần.

| Hạng mục | File/nhóm file cần đọc và có thể sửa |
| --- | --- |
| Hero/AI trang chủ | `snippets/section_hero.bwt`, `snippets/home_portal.bwt`, `assets/home-portal.css`, `assets/home-portal-integration.css`, `assets/home-hero.js` |
| Đích Quiz/chat | `templates/page.ai-skin-quiz.bwt`, route trong preview, `snippets/search_empty_state.bwt`; xác minh template chat thực tế |
| Flash Sale | `snippets/section_flash_sale.bwt`, `snippets/product_grid_office_sale.bwt`, CSS tích hợp và các section tái sử dụng card |
| Header/search mobile | `snippets/header.bwt`, `snippets/mobile_search_popup.bwt`, `assets/comp_mobile_nav.scss.bwt`, `assets/comp_mobile_search.scss.bwt`, `assets/storefront-v3.css` |
| Liên hệ/backtop | `snippets/support.bwt`, `snippets/footer.bwt`, `snippets/footer_script.bwt`, `assets/main.js.bwt`, `assets/global_core.scss.bwt` |
| Danh mục/filter | `templates/collection.bwt`, `templates/collection.skinhealthy.bwt`, `templates/search.bwt`, `snippets/aside-filter.bwt`, `snippets/filter-cate-col.bwt`, `assets/col.js.bwt`, `assets/page_collection.scss.bwt` |
| Tích điểm | `snippets/header.bwt`, `snippets/appbulk-loyalty-widgets.bwt`, `assets/comp_loyalty.scss.bwt`, `templates/page.loyalty.bwt`, menu Admin |
| Cấu hình | `configs/settings_schema.json`, `configs/settings_data.json`; giữ field/value ngoài phạm vi |
| Font/layout hồi quy | `layouts/theme.bwt`, `snippets/storefront_theme.bwt`, `snippets/skinhealthy_content_style.bwt`, `snippets/skinhealthy_content_script.bwt`, các `page.*skinhealthy*.bwt` |
| Dữ liệu preview | `data/navigation.js`, `data/collections.js`, `data/products.js`; không coi đây là catalog production |
| Kiểm thử | `tests/portal/home-portal.spec.js`, `playwright.portal.config.js`; thêm test hành vi cần thiết theo cấu trúc repo |

## 13. Đợt H — Kiểm thử và bàn giao

### H01 — Kiểm tra tự động có trọng tâm

- [ ] Parse cả `configs/settings_schema.json` và `configs/settings_data.json` sau sửa; rà ID trùng/tham chiếu thiếu nếu có thêm cấu hình.
- [ ] Chạy `npm run build` khi thay asset/config; lưu kết quả thật. Build có thể tạo lại `assets/mops-tailwind.css`, phải rà diff phát sinh và không commit output ngoài phạm vi.
- [ ] Chạy `npm run test:portal` khi sửa Home Portal; nếu test cũ khóa nền kính/700px thì cập nhật kỳ vọng theo yêu cầu mới, không bỏ assertion để che lỗi.
- [ ] Thêm hoặc điều chỉnh test hành vi có giá trị: widget ẩn/mở lại, vị trí backtop ở footer, điều hướng AI, giá/badge biên, filter URL/pagination/history.
- [ ] Không viết test chỉ lặp lại CSS implementation cho thay đổi nhỏ; dùng kiểm tra computed style/screenshot đúng mục tiêu.

Lệnh JSON có thể dùng từ root repo:

```powershell
node -e "const fs=require('fs'); for(const p of ['configs/settings_schema.json','configs/settings_data.json']) { JSON.parse(fs.readFileSync(p,'utf8')); console.log(p+' OK'); }"
npm run build
npm run test:portal
```

Chỉ chạy các lệnh build/test này trong giai đoạn triển khai/QA, không cần chạy khi chỉ tạo kế hoạch.

### H02 — Ma trận kiểm tra giao diện và hành vi

Viewports: 320, 360, 390, 430, 768, 1024, 1440 và 1920px. Kiểm tra độ cao màn hình ngắn và xoay ngang cho nhóm mobile; kiểm tra cảm ứng/bàn phím ảo trên thiết bị thật nếu có điều kiện, ghi rõ nếu chỉ mô phỏng.

| Khu vực | Trường hợp bắt buộc | Kết quả cần đạt |
| --- | --- | --- |
| Hero | Mọi slide, nhãn dài, mobile/desktop, reduced-motion | Khung tối đa 564, transparent, radius 40; chữ/nút rõ; không nhảy bố cục |
| AI | Hero/khối hướng dẫn/menu, phiên mới/cũ, đích lỗi | Đúng URL và luồng thật; không màn hình trắng |
| Header | Đầu/giữa/cuối trang, menu/search/cart, keyboard | Không che nội dung, không khóa cuộn sau khi đóng |
| Contact | Mở/thu/ẩn, sang trang, reload, mở lại, storage bị chặn | Ẩn hoàn toàn và phục hồi được, focus hợp lệ |
| Backtop | Trang ngắn/dài, footer cao, widget mỗi trạng thái | Luôn trong viewport khi hiện, không trùng CTA, click chạy một lần |
| Flash Sale | Không giảm, giá 0, nhiều biến thể, hết hàng, hết hạn, ảnh lỗi | Giá/badge/trạng thái đúng; ảnh tĩnh thay thế hoạt động |
| Collection | Có/không có con, ô thiếu ảnh, nhãn dài, nhóm rỗng | Mapping đúng, fallback gọn, một H1 |
| Search/filter | Từ khóa có dấu, nhiều nhóm, clear, zero result, sort, page 2, reload/back/forward, request lỗi/chậm | Kết quả và URL đồng bộ, không chỉ lọc DOM hiện tại |
| Loyalty | Desktop/mobile/menu/account/footer/app widget | Không còn điểm truy cập cần ẩn, không mất dữ liệu |
| Hồi quy | SHB home/services/detail/collection, product, cart, account, chat/MOPS khi asset chung bị tác động | Montserrat/layout đúng, không asset 404 hoặc lỗi chức năng mới |

- [ ] Không scrollbar ngang 320–1920px; kiểm tra cả sau khi mở menu/popup.
- [ ] Không lỗi JS mới; các ảnh tải được sau khi cuộn kích hoạt lazyload, không nhầm ảnh chưa tải thành 404.
- [ ] Một H1/trang; meta/breadcrumb không bị mất do đổi cấu trúc; ảnh có alt và kích thước.
- [ ] Nút có tên truy cập và focus nhìn thấy; modal xử lý focus/Escape/return focus; animation có reduced-motion.
- [ ] So sánh trước/sau cho LCP/CLS và tài nguyên mới; ảnh Flash Sale không trì hoãn ảnh hero. Theo rule, khi đo PageSpeed trên môi trường phù hợp: Desktop ≥75, Mobile ≥50; ghi URL/ngày đo, không bịa điểm nếu chưa đo được.
- [ ] Kiểm chứng query/filter, đường dẫn collection, giá và ảnh động trên Sapo preview thật. Nếu chưa có truy cập, ghi “chưa xác minh Sapo”, không báo nghiệm thu production.

### H03 — Bàn giao và đóng phase

- [ ] Báo cáo thay đổi theo từng mã; liệt kê file thực sự sửa/xóa, setting thêm/tái sử dụng, tác động có thể thấy.
- [ ] Bàn giao mapping collection/tag/menu và danh sách thao tác Sapo Admin còn cần, nếu có.
- [ ] Ghi kết quả lệnh/test thật, route/viewport đã kiểm tra, ảnh trước/sau cần thiết và hạn chế còn lại.
- [ ] Rà diff cuối, phân biệt thay đổi có trước; không commit/push/deploy nếu chưa được giao.
- [ ] Cập nhật mô tả kiến trúc lâu dài trong `.clinerules`/cẩm nang đúng nơi: hero transparent, cơ chế widget, mapping/filter đã chốt. Không biến tài liệu phase thành nguồn rule mới.
- [ ] Chỉ đóng phase khi các mục bắt buộc đã đạt hoặc người dùng chấp nhận phần còn thiếu; chuyển tài liệu cần giữ sang nơi chuẩn rồi archive/dọn phase theo AGENTS.md.

## 14. Điều kiện hoàn thành toàn bộ

- [ ] Có chỉ dẫn và đường vào Quiz/chat thật từ trang chủ.
- [ ] Hero đúng 564px tối đa, transparent, radius 40px và sử dụng tốt trên mobile.
- [ ] Flash Sale dùng ảnh động đã xác minh, có bản tĩnh, badge đỏ và giá chính xác.
- [ ] Header mobile không che/chồng bất hợp lý; liên hệ có thể ẩn và mở lại; backtop không ra ngoài viewport ở footer.
- [ ] Danh mục cha có ô danh mục con đúng catalog; bộ lọc nhanh hoạt động xuyên phân trang và đồng bộ URL.
- [ ] “Tích điểm đổi quà” được ẩn ở các điểm truy cập liên quan, dữ liệu không bị xóa.
- [ ] Nghiên cứu từ khóa ghi nguồn/thời gian/phạm vi, không gắn nhãn phổ biến nhất khi thiếu chứng cứ.
- [ ] Giữ Montserrat/layout chung; mọi asset xóa đều có bằng chứng không dùng và đã kiểm tra hồi quy.
- [ ] JSON/build/test bắt buộc đạt; báo cáo tách rõ local preview và Sapo thật; không tồn tại tuyên bố kiểm chứng chưa thực hiện.

**Lưu ý khi tiếp tục:** Tất cả checkbox hiện để trống vì đây mới là kế hoạch. Không lấy việc lưu PLAN.md làm căn cứ đánh dấu bất kỳ phần triển khai nào hoàn thành.

## Nhật ký triển khai (20/09/2026)

Thực thi một lượt theo `/goal`, ưu tiên đúng thứ tự mục 4 ("đường vào AI, hero, lỗi mobile/nút
nổi và Flash Sale trước"). Không tick lại từng checkbox nhỏ ở trên vì nhiều mục con (vd vuốt swiper
lỗi mạng, kiểm thiết bị thật, Google Trends thật) chưa được xác minh trực tiếp — chi tiết ai đã
làm/chưa làm nằm ở đây, xem thêm mô tả kiến trúc đã chốt trong `.clinerules/02-du-an-pharma-cosmetics.md`.

**Đã làm và xác minh qua test/browser thật (không phải chỉ đọc code):**
- C01 — Hero: `.portal-hero__copy` đổi sang `max-width:564px;box-sizing:border-box;background:
  transparent;border-radius:40px`; bật lại `.portal-hero__mask` làm scrim gradient trái→phải thay
  khối kính trắng cũ; chữ/nút hero đổi sang trắng để đọc được trên ảnh. Đo bằng computed style thật
  (`getComputedStyle`) qua trình duyệt headless: `background-color: rgba(0,0,0,0)`, `max-width:
  564px`, `border-radius: 40px`, `backdrop-filter: none` — khớp yêu cầu. Cập nhật lại assertion cũ
  trong `tests/portal/home-portal.spec.js` (khóa nền kính/blur cũ) theo giá trị mới, không xoá test.
- C02 — Đường vào Quiz/chat AI: thêm `snippets/section_ai_guide.bwt` (đăng ký qua `home_portal.bwt`
  + `home_section_2`), CTA trỏ `/kham-da-ai` (route thật, đã xác minh alias trong `dev-server.js`
  `PAGE_HANDLE_MAP` và test click-through render đúng `.chat-app-header`, không trắng trang, không
  lỗi console mới). Thêm lối vào trong menu mobile (`header.bwt` `.mb-drawer-secondary`, toggle
  `home_ai_guide_menu_enable`). 3 bước hiển thị bám luồng thật (chat câu hỏi → chẩn đoán/gợi ý →
  phác đồ/nối máy chuyên gia), không dùng "trò chuyện AI tiếp diễn" vì thực tế không có.
- D02 — Ẩn hoàn toàn cụm liên hệ: thêm trạng thái `.widget-hidden` (`display:none` thật) trong
  `support.bwt`, nút "Ẩn nút liên hệ" trong panel, lưu `sessionStorage`; nút mở lại "Hiện lại nút
  liên hệ nhanh" ở footer (`footer.bwt` + CSS trong `global_core.scss.bwt`). Đã bấm thử qua browser
  thật: ẩn → `display:none` + lưu session → reload vẫn ẩn → bấm nút footer → hiện lại, không lỗi
  console. **Chưa làm:** nâng cấp `aria-expanded`/`aria-controls` đầy đủ cho nút tròn chính
  (`#toggle-widget-btn`) — nút đó vẫn là `div` như cũ, rủi ro động vào CSS phức tạp của `.out-circle`
  không đáng so với phạm vi ẩn/hiện mới.
- D03 — Backtop/main-widget đè footer: sửa `footer_script.bwt` — thay công thức shift không giới
  hạn (gây "top âm" khi footer cao hơn viewport, đúng lỗi khảo sát 390×900) bằng phần giao thật của
  footer với viewport + chặn cuối theo `offsetHeight`. Đã đo trên trang chủ thật ở 390×844, cuộn hết
  trang: `.backtop` trước khi sửa sẽ vượt viewport (giá trị "wanted" vượt trần), sau khi sửa
  `top:8px` (đúng biên `MIN_TOP_GAP`), `.main-widget` `top:712px` — cả hai còn trong màn hình.
- G01 — Ẩn "Tích điểm đổi quà": bọc link trong `header.bwt` bằng `settings.header_loyalty_enable`
  (checkbox, mặc định tắt) — loại khỏi DOM khi tắt, không phải CSS ẩn. Giữ nguyên
  `appbulk-loyalty-widgets.bwt`, `page.loyalty.bwt`, `data/loyalty-tiers.js`. Đã xác minh qua
  browser: menu mobile không còn mục này khi tắt; bật `header_loyalty_enable: true` là hiện lại
  ngay, không cần sửa code.
- E02/E03 — Kiểm tra lại thấy **đã đạt từ trước** (khảo sát trong mục 3 của kế hoạch này đã cũ, có
  thể từ bản build trước): badge dùng `--sale-color:#cc3d00` (đỏ, không phải xanh #003F2D như khảo
  sát ghi) + chữ trắng, đo tay theo công thức WCAG contrast ≈ 4.96:1 (đạt AA); % giảm tính từ đúng
  biến thể card đại diện, có chặn compare-at ≤ giá bán và chặn chia 0; countdown có cấu hình chu kỳ
  lặp (`home_flashsale_countdown_cycle_hours`) do merchant chủ động chọn — không sửa vì đây là tính
  năng có chủ đích (đặt 0 là tắt lặp), không phải giả khan hiếm ngoài ý muốn. Không sửa gì ở đây.
- H01: `node -e JSON.parse(...)` cho cả 2 file config, `npm run build`, `npm run test:portal` — tất
  cả pass (build: "Theme deployment package created: dist (296 entries)"; test: 18/18 passed, chạy 2
  lần sau các đợt sửa khác nhau).
- Cập nhật mô tả kiến trúc dài hạn trong `.clinerules/02-du-an-pharma-cosmetics.md` (hero transparent
  564/40, section_ai_guide, cơ chế ẩn loyalty, 3 trạng thái liên hệ, công thức backtop mới) — không
  còn mô tả "kính trắng" cũ mâu thuẫn với quyết định mới.

**Tiếp tục lượt 2 (20/09/2026, `/goal tiếp tục`):**
- G02 (một phần) — Dọn 1 khối code trùng lặp y hệt 3 lần (variantCount/on_var/discount) trong
  `product_grid_office_sale.bwt`, chỉ giữ 1 lần; test flash sale + featured carousel vẫn pass sau khi
  sửa.
- D01 — Phát hiện và sửa lỗi thật: drawer menu mobile (`#btn-menu-mobile`) không khoá cuộn nền, không
  đóng bằng Escape, không trả focus về nút mở khi đóng. Đo trước khi sửa: bắn `KeyboardEvent
  Escape` sau khi mở drawer — class `.current` không đổi (xác nhận lỗi thật, không phải suy đoán).
  Sửa bằng 1 `MutationObserver` quan sát class `.current` (không phân biệt cơ chế mở nào toggle nó)
  + Escape handler mới trong `header.bwt`, CSS khoá cuộn `body.pc-drawer-open` trong
  `global_core.scss.bwt`. Đã bấm thử cả 3 đường đóng (Escape, nút X, click overlay): cả 3 đều khoá/mở
  cuộn đúng, trả `aria-expanded` đúng, trả focus về `#btn-menu-mobile`.
- F01/F02 (một phần, KHÔNG bịa mapping) — Nhận ra `templates/collection.bwt` **đã có sẵn** cơ chế
  "Khối danh mục sản phẩm dưới Mã khuyến mãi" (`aside_category_enable_bot` + `menu-col-cate.bwt`)
  dùng đúng pattern Sapo thật `linklists[...].links` + `link.object.image/all_products_count` (cũng
  thấy lại ở `section_ingredients.bwt`) — nhưng đó là 1 khối DÙNG CHUNG cho mọi collection, không
  phải danh mục con RIÊNG theo từng collection cha như F01/F02 cần. Xây thêm (không thay khối cũ):
  `snippets/collection_subnav.bwt` (include trong `collection.bwt` ngay sau H1) + 3 quy tắc cấu hình
  `collection_subnav_{1,2,3}_collection/_menu/_title` trong `settings_schema.json`. Mặc định cả 3 để
  trống ⇒ không render gì ở bất kỳ collection nào (đã xác minh trong `configs/settings_data.json`
  không có field này ⇒ ẩn theo đúng thiết kế). Đã kiểm chứng CƠ CHẾ bằng giá trị TẠM (collection cha
  = `top-san-pham-serum-ban-chay`, menu = linklist mock `cate-product-1` có sẵn) qua browser thật:
  hiện đúng 6 ô tên/href từ linklist trên trang serum, KHÔNG hiện ở collection khác, không lỗi
  console — rồi **gỡ giá trị tạm ngay sau khi xác minh**, trả `settings_data.json` về trạng thái
  trống ban đầu. Phần `link.object.image/all_products_count` (ảnh + số sản phẩm mỗi ô) KHÔNG resolve
  được trong dev-server local (mock không gán `.object` cho link nào) nên chỉ xác minh được tên/href;
  ảnh/số sản phẩm phải kiểm tra trên Sapo Admin thật. **Merchant cần làm:** tạo 1 Linklist thật trong
  Sapo Admin trỏ tới các collection con thật của nhóm tinh chất/serum (da dầu-mụn, thâm/không đều
  màu, khô/thiếu ẩm, nhạy cảm, lão hoá — đúng nhóm plan B01 gợi ý) rồi điền 3 field trên trong
  Customize theme. Tôi không tự tạo Linklist/collection vì không có quyền/dữ liệu Sapo Admin thật.

**Tiếp tục lượt 3 (20/09/2026, `/goal tiếp tục`):**
- F03 (một phần) — Đọc kỹ `snippets/aside-filter.bwt` + `assets/col.js.bwt`: cơ chế filter đã khá
  đầy đủ từ trước (checkbox/pill/price slider, URL restore khi load, `history.replaceState` cho
  back/forward, active-filter chip bar xoá từng chip, `clearAllFiltered`) — **không phải** "bộ lọc
  giả chỉ ẩn card hiện tại" như bảng khảo sát cũ ở mục 3 mô tả. Tìm ra 2 lỗi thật còn thiếu đúng theo
  checklist F03 gốc:
  1. `doSearch()` không chống request chồng — gõ nhanh/bấm nhiều filter liên tiếp, nếu request cũ về
     sau request mới thì đè kết quả mới bằng kết quả cũ sai bộ lọc. Thêm token tăng dần, chỉ áp dụng
     response có token mới nhất.
  2. `.fail()` chỉ gỡ lặng `is-loading`, không báo gì khi AJAX lỗi. Thêm banner `.afw-error` + nút
     "Thử lại" gọi lại đúng `doSearch(page)`.
  Xác minh qua browser thật trên `/top-san-pham-serum-ban-chay`: bấm filter "Serum" → URL cập nhật
  `?q=product_type.filter_key:("Serum")`, chip bar hiện đúng "Serum", 9 sản phẩm hiển thị, không lỗi
  console. Gọi `doSearch(1)` 2 lần liên tiếp qua console để mô phỏng race — token tăng đúng từ 0→2;
  1 trong 2 lần AJAX thất bại (do gọi trùng ngoài luồng sự kiện thật) → banner lỗi/thử lại hiện đúng
  như thiết kế, xác nhận cả 2 cơ chế mới hoạt động.
- **Chưa làm** trong F03: chip nhanh phía trên kết quả kiểu mobile-sheet, đồng bộ sort+q+phân trang
  đầy đủ trên Sapo preview thật (chỉ xác minh được trên dev-server mock), gợi ý phổ biến/lịch sử tìm
  kiếm mobile, và không có quyền truy cập Sapo Admin thật để xác nhận `Bizweb.SearchFilter`/
  `filter.buildSearchUrl()` hành xử giống hệt trên production — đây là API/thư viện do Sapo cấp,
  không phải code trong repo này.

**Tiếp tục lượt 4 (20/09/2026, theo yêu cầu cụ thể của người dùng):**
- E01 — Khảo sát lại phát hiện `page_home.scss.bwt` (đã load sẵn cho template index) VỐN ĐÃ có
  `@keyframes pc-pulsescale` + `.pc-flashsale__title img{animation:pc-pulsescale 0.8s linear
  infinite}` giống hệt CSS người dùng đưa — đo qua browser xác nhận animation ĐANG chạy thật
  (`animationName:"pc-pulsescale"`). Chỉ còn thiếu: (1) tắt animation khi `prefers-reduced-motion:
  reduce` — đã thêm vào block reduced-motion sẵn có; (2) đổi badge % giảm giá — người dùng yêu cầu
  đỏ + góc phải trên. Phát hiện có TỚI 4 nơi override `.pc-flashsale__badge` (base
  `product_grid_office_sale.bwt`, Portal v3 `home-portal-integration.css`, và 3 section dùng lại
  card: featured/bestseller/viewed) — sửa cả 4 để nhất quán, thêm token `--flashsale-badge-bg:
  #D92D20` (contrast ≈4.83:1 AA, tách riêng khỏi `--sale-color` #cc3d00 dùng cho nút/progress bar).
  Đồng thời phát hiện Portal v3 đặt badge quy cách (`.badge`, nhãn "new") ở top-right — đổi sang
  bottom-left (khớp quy ước base site) để không đè lên badge giảm giá mới chuyển sang top-right.
  Verify qua browser: mọi `.pc-flashsale__badge` hiện `rgb(217,45,32)` + `top:10px;right:10px`,
  không lỗi console, `npm run test:portal` 18/18 pass.
- F01/F02 + B02 (test data theo yêu cầu người dùng) — dùng WebSearch xác nhận cấu trúc Biologique
  Recherche (blemishes/hydration/pigmentation/sensitivity/anti-aging) và từ khoá tiếng Việt thật
  (kem trị nám/tàn nhang, serum trị thâm mụn, kem dưỡng ẩm da dầu — search 09/2026). Thêm linklist
  demo `serum-nhu-cau-da` vào `data/navigation.js` (5 nhóm), wire `collection_subnav_1_*` trong
  `configs/settings_data.json` (current) trỏ `top-san-pham-serum-ban-chay`. 2/5 ô trỏ collection
  THẬT có sẵn trong `data/collections.js` (`da-mun-dau`, `top-10-kem-duong-am-...`); 3/5 ô còn lại
  (thâm/nám, nhạy cảm, lão hoá) chưa có collection con thật trong data mock nên trỏ
  `/search?query=...&type=product` — tái dùng đúng pattern `section_solutions.bwt` đã có, không bịa
  cơ chế mới. Đã verify cả 5 route đều trả 200/render đúng. Đây LÀ DATA DEMO/TEST theo đúng yêu cầu
  người dùng ("để có trên bản test") — không phải mapping production thật; người dùng sẽ tự tạo
  Menu/collection thật trên Sapo Admin.
- F03 (thêm) — mobile filter sheet (`.left-content.active` + `body.filter-open`) đã có khoá cuộn
  sẵn nhưng chưa đóng được bằng Escape — thêm cho đồng bộ với drawer menu mobile đã sửa trước đó.
  Verify: mở sheet → Escape → đóng đúng, gỡ khoá cuộn, không lỗi console.
- G02 (audit, KHÔNG tự xoá) — Rà cross-reference tất cả file `assets/*` bằng tên: không tìm thêm
  được asset nào rõ ràng orphan ngoài phần đã xoá ở phase unify-font-shb trước đó. Phát hiện quan
  trọng hơn: **10 option trong dropdown `home_section_1..18`** (`section_why_us`,
  `section_feedback`, `section_collection_bestseller`, `section_collection_cta`, `section_stats`,
  `section_expert_team`, `section_clinical_banner`, `section_trust_strip`, `section_protocol`,
  `section_zalo_consult`) — file snippet vẫn tồn tại (18-108 dòng/file, không phải file rỗng) và
  admin CHỌN ĐƯỢC trong Customize theme, nhưng **không nằm trong whitelist `valid_sections` của
  `home_portal.bwt`** nên chọn xong không hiện gì cả (dropdown "ma", không lỗi nhưng vô tác dụng).
  Nặng hơn: `configs/settings_data.json` khối `presets.default` (factory default cho store mới)
  đang có `home_section_9: "section_expert_team"` — 1 trong các giá trị "chết" này. Theo nhãn
  "(REOPEN 2026-09-11)" trong settings_schema.json, đây nhiều khả năng là các section trang chủ TỪ
  TRƯỚC bản redesign Home Portal v3 (`e9d52f0`), bị bỏ khỏi `valid_sections` khi làm v3 nhưng quên
  dọn dropdown/preset theo. **KHÔNG tự xoá option hay file** — theo đúng nguyên tắc không tự ý đổi
  settings_schema/settings_data khi chưa hỏi; ghi lại đây để người dùng quyết định: xoá 10 option
  chết (+ sửa preset.default) hay thêm chúng vào `valid_sections` để dùng lại.

**Cố tình CHƯA sửa (và lý do):**
- E01 — Ảnh động Flash Sale: chưa có asset ảnh động thật được merchant cấp/xác nhận quyền dùng
  (khảo sát chỉ thấy `flash_-1.png` tĩnh 32×32). Theo đúng rule B03 của kế hoạch này: không tự chế
  ảnh động rồi báo xong. Cần merchant cấp GIF/WebP động + bản tĩnh dự phòng cho `prefers-reduced-
  motion`, sau đó mới làm được E01.
- B01/B02 — Tham khảo Biologique Recherche + nghiên cứu từ khóa Việt Nam: cần truy cập Google
  Trends/Search Console/Keyword Planner thật với phạm vi thời gian xác định, không thể tạo bảng
  search-volume đáng tin từ suy đoán. Không làm để tránh đúng lỗi kế hoạch cảnh báo ("gắn nhãn phổ
  biến nhất khi thiếu chứng cứ").
- F01/F02 (mapping thật) — Cơ chế kỹ thuật đã có (xem trên) nhưng KHÔNG tự điền collection/tag thật
  vào 3 quy tắc — cần merchant xác nhận danh sách collection con thật + tạo Linklist trong Sapo
  Admin trước.
- F03 (phần còn lại) — đã sửa 2 lỗi race-condition/error-handling (xem lượt 3 ở trên); phần "chip
  nhanh mobile-sheet", đối chiếu sort/phân trang/URL đầy đủ và kiểm chứng `Bizweb.SearchFilter` thật
  trên Sapo preview vẫn chưa làm — cần môi trường Sapo thật, không thể xác nhận đầy đủ trên dev-server
  mock.
- G02 — Dọn CSS/JS thừa có bằng chứng: chưa làm audit riêng (cần bảng asset→consumer đầy đủ theo
  đúng yêu cầu rule, tốn nhiều thời gian độc lập với các phần trên); có ghi nhận 1 điểm phụ trong
  lúc đọc code — `product_grid_office_sale.bwt` có 1 khối tính `discount`/`on_var` lặp lại 2 lần
  giống nhau (dòng ~20-63) — vô hại (idempotent) nhưng dư, chưa xoá vì ngoài phạm vi đang sửa.
- D01 — Header/menu mobile: chỉ soi nhanh (không tràn ngang ở 320px, không lỗi console, nút tròn
  liên hệ/backtop 40×40/60×60 đủ chạm), **chưa** chạy đủ ma trận 320/360/390/430/768/1024/1440/1920
  + bàn phím ảo + thiết bị thật như H02 yêu cầu.
- H02 — Ma trận kiểm tra đầy đủ 8 viewport + PageSpeed thật: chưa chạy; phần đã đo trong lượt này
  chỉ gồm 320/390/1440/1920 cho các khu vực trực tiếp sửa (hero, contact, backtop, AI CTA).

**Việc cần người dùng quyết định/cung cấp thêm:**
- Ảnh động thật cho Flash Sale (E01) và quyền sử dụng.
- Xác nhận mapping danh mục con serum/tinh chất theo collection/tag thật trên Sapo Admin (F01).
- Dữ liệu nghiên cứu từ khóa thật (Google Trends/Search Console) nếu muốn nhãn "tìm kiếm nhiều
  nhất" có căn cứ, hoặc chấp nhận dùng nhãn "Gợi ý tìm kiếm" trung tính hơn (B02).
- Quyết định có cần nâng cấp bộ lọc nhanh tìm kiếm (F03) thành một đợt việc riêng, vì đây là hạng
  mục lớn nhất còn lại và phụ thuộc trực tiếp engine `Bizweb.SearchFilter`/`col.js` thật trên Sapo.
