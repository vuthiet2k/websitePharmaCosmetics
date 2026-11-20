# TODO đợt mới (BA lập cùng PO) — chưa giao team

Nhánh làm việc: `hugopc_dev`. Mỗi mục đã chốt, không còn câu hỏi treo. Trạng thái: CHỜ DUYỆT.

| Mã | Trang / khổ | Hiện trạng | Kết quả mong muốn (PO chốt) | Phạm vi | Ưu tiên |
|---|---|---|---|---|---|
| T-01 | Trang Dịch vụ (desktop, ảnh 70) | Padding trên và dưới toàn trang rộng, khoảng trắng lớn giữa tiêu đề «Dịch vụ», đường kẻ và hàng thẻ | Giảm khoảng cách trên và dưới toàn trang (padding đầu trang, cuối trang, khoảng giữa tiêu đề và thẻ đầu tiên) | Template trang Dịch vụ; kiểm 1440, 1024, 390 | TB |
| T-02 | Trang Dịch vụ, thẻ dịch vụ | Nút «Đặt lịch» nền xanh đậm tối (brand-deep) | Nền màu thương hiệu #3CB371 (token `bg-primary`/`bg-btn`), chữ trắng; CHỈ nút «Đặt lịch» ở thẻ dịch vụ, «Liên hệ tư vấn» giữ viền nhạt | `snippets/lieu_trinh_card.bwt` (+ class `lt-btn--primary`) | TB |
| T-03 | Widget chat «Chat hỗ trợ» (mọi trang, desktop + mobile) | Nút × nằm sát robot, khó bấm, dính ảnh | Bỏ nút × nhỏ sát robot; kéo thả robot vào vùng × (giữa đáy màn hình, kiểu Messenger) thì ẩn; hiện lại ở chân trang (giữ cơ chế `data-contact-show`); vùng × lớn ≥44px, có hiệu ứng; mobile kéo cảm ứng được; vị trí mặc định giữ nguyên (giữa mép phải) | `snippets/support.bwt`, `footer_script.bwt` | Cao |
| T-04 | Trang chủ, khối `#section_spa` 4 card | Card có thể là link và có hover đổi màu khi `portal_step_N_url` được cấu hình | GIỮ khung card nguyên dạng; bỏ link, bỏ hover đổi màu, bỏ con trỏ tay (card thành khối tĩnh); giữ 2 chip và nút «Đặt lịch phân tích da» ở cột trái | `snippets/section_spa.bwt` (nhánh `<a>` của `portal_step_*_url`) | Thấp |

## Ghi chú QA
- T-04: hiện chưa có `portal_step_*_url` trong settings_data, nên khi bỏ link phải bỏ cả cấu hình URL trong `settings_schema.json` (để `lint:config` không báo trường thừa).
- T-03: thao tác kéo dùng pointer events, tôn trọng `prefers-reduced-motion`; không dùng style inline do JS (UI-0: dùng class Tailwind bật tắt).
- Mọi mục: chỉ dùng Tailwind + token, không `!important` mới, chạy `build:pc`, `lint:guardrails`, `lint:liquid-globals`.

## Việc tồn từ trước (PO chưa quyết đưa vào đợt này)
Lỗi chữ «…234;n», nút ☰ ở khổ hẹp, hiệu ứng số trượt Flash sale, hai request `[object Object]`, file `.clinerules/04-quy-dinh-nhanh-va-luu-tru.md` chưa theo dõi.

## Bổ sung (ảnh 72 — trang bài viết, laptop)
| Mã | Trang / khổ | Hiện trạng | Kết quả mong muốn | Phạm vi | Ưu tiên |
|---|---|---|---|---|---|
| T-05 | Bài viết, thanh công cụ dọc bên trái (lg+) | Nút «+» (tăng cỡ chữ, `#btn-zoom-in`) trống: `ui_icon` không có icon `plus`/`minus` (R5 khóa thư viện). Nút «−» đang dùng ký tự văn bản | Nút «+» hiện đủ, cùng kiểu với «−» (ký tự «+» như «−», không thêm icon mới); soát luôn 9 nút còn lại đều hiện icon, cùng cỡ | `templates/article.bwt` dòng ~27-29 | Cao |
| T-06 | Bài viết, cột phải «Tin liên quan» + «Sản phẩm liên quan» (lg+, laptop) | Bài dài: cột phải hết nội dung sớm → trống 1 bên | Cột phải `position: sticky` (class `sticky top-24`, CÙNG cách bám như thanh nút chức năng bên trái, PO chốt) khi cuộn; cần `items-start`/`self-start` ở lưới cha để sticky hoạt động; nếu cột cao hơn khung nhìn thì `max-h-screen` + cuộn trong; mobile giữ nguyên; kiểm 1280/1440/1920 và bài ngắn không bị lỗi | `templates/article.bwt` (khối aside phải, dòng ~229-300) | Cao |

## Bổ sung (ảnh 73 — trang blog chuyên mục «Bí Quyết Làm Đẹp», laptop)
| Mã | Trang / khổ | Hiện trạng | Kết quả mong muốn (PO chốt) | Phạm vi | Ưu tiên |
|---|---|---|---|---|---|
| T-07 | Trang blog chuyên mục (desktop lg+, mọi blog dùng template này) | (a) Hàng nút pill lọc chuyên mục «Tất cả / Bí Quyết Làm Đẹp / Video Skincare»; (b) sidebar phải «Danh mục sản phẩm» và «Tin nổi bật» là khối card có khung, viền, bo | (a) BỎ HẲN hàng nút lọc chuyên mục; (b) sidebar: bỏ khung card/nền/viền/bo, mỗi khối là tiêu đề chữ + 1 `hr` ngang dưới tiêu đề, các dòng bên trong cách nhau bằng `hr` (kiểu text + hr như trang tin tức), giữ sticky; mẫu tham chiếu: sidebar «Tin nổi bật» ở trang `/blogs/tin-tuc-va-kien-thuc` (không card) | `templates/blog.bwt` + `snippets/aside-blog.bwt`/`aside-menu` (FE xác định đúng file); kiểm 1024/1280/1440, mobile giữ nguyên | TB |

Ghi chú QA T-07: bỏ hàng nút lọc → trang vẫn phải điều hướng được giữa các blog qua menu; nếu hàng nút do cấu hình bật/tắt thì xóa cấu hình thừa để `lint:config` qua. Nút lọc ở trang blog khác (Instagram feed/story) KHÔNG nằm trong phạm vi.

## Bổ sung (ảnh 74 — trang tìm kiếm, laptop)
| Mã | Trang / khổ | Hiện trạng | Kết quả mong muốn | Phạm vi | Ưu tiên |
|---|---|---|---|---|---|
| T-08 | Trang tìm kiếm (mọi khổ) | Tiêu đề «Kết quả tìm kiếm cho “Chống nắng l&#234;n tone”» lộ mã entity: đây là nguồn lỗi «…234;n» tồn từ trước. `search.terms` của Sapo đã được escape, template `templates/search.bwt:32` (`{{search.terms}}`) và các chỗ `| escape` (dòng 101 ô tìm kiếm, tiêu đề, breadcrumb, thẻ title/meta) làm escape thêm lần hai | Từ khóa hiển thị đúng tiếng Việt có dấu («Chống nắng lên tone») ở tiêu đề, ô tìm kiếm, breadcrumb, `<title>`, meta; không lộ `&#…;`/`&amp;`; không mở lỗ XSS (vẫn phải an toàn khi từ khóa chứa `<`, `"`) | `templates/search.bwt`, `snippets/ui_search*`/header ô tìm kiếm, dev-server mock `search.terms` cho giống Sapo thật (mock phải trả chuỗi đã escape như Sapo); quét mọi chỗ in `search.terms` / `query` | Cao |
| T-09 | Phân trang mọi trang (collection, search, blog, thương hiệu...) | Có ít nhất 2 snippet phân trang riêng (`paginate-pages.bwt`, `collection-paginate-pages.bwt`) + bản riêng ở `page_thuong_hieu`, `page_tin_tuc_hub`, `blog*` → không đồng nhất; chữ số trang không căn giữa dọc trong nút | MỘT snippet phân trang dùng chung (theo UI-STANDARD, ví dụ `ui_pagination`) cho mọi trang; nút trang `inline-flex items-center justify-center min-h-[44px] min-w-[44px]`, chữ căn giữa dọc và ngang; trạng thái hiện tại/disabled/prev-next đồng nhất; 1 hàng không rớt dòng ở 390; xoá bản trùng, kiểm mọi nơi gọi | `snippets/*paginate*`, `templates/collection*.bwt`, `search.bwt`, `blog*.bwt`, `page_*` ; R5: nếu cần `ui_*` mới hoặc thay snippet khóa → PO duyệt (mục này coi như PO yêu cầu trực tiếp) | Cao |
Ghi chú QA T-09: PO chưa chỉ trang cụ thể bị lệch chữ; áp cho TẤT CẢ trang có phân trang. Kiểm bằng ảnh ở 390/1440 trên `/collections/all?page=2`, `/search?q=kem&page=2`, blog.

## Bổ sung (ảnh 75 — trang sản phẩm, màn lớn)
| Mã | Trang / khổ | Hiện trạng | Kết quả mong muốn (PO chốt) | Phạm vi | Ưu tiên |
|---|---|---|---|---|---|
| T-10 | Trang sản phẩm, khối 2 nút mua (desktop lg+) | «MUA NGAY» và dòng phụ «Giao hàng tận nơi và kiểm tra hàng trước thanh toán» xếp 2 dòng chồng nhau, icon nhỏ, nội dung căn giữa; nút «Thêm vào giỏ hàng» icon nhỏ căn giữa | Màn lớn: «MUA NGAY» + dòng phụ GỘP MỘT HÀNG (nhãn đậm trái, dòng phụ nhạt hơn cùng hàng, không wrap, `whitespace-nowrap`, cắt gọn bằng `truncate` chỉ khi hết chỗ ở khổ lg nhỏ); CẢ 2 NÚT: icon + chữ căn TRÁI (`justify-start`), icon 24px; mobile giữ nguyên bố cục hiện tại (kiểm không vỡ) | Snippet khối mua trang sản phẩm (FE xác định: `product-buy*`/`pdp_*`/template product); kiểm 1024/1280/1440/1920 | TB |

## Bổ sung (ảnh 76 — trang tìm kiếm, chế độ xem danh sách)
| Mã | Trang / khổ | Hiện trạng | Kết quả mong muốn (PO chốt) | Phạm vi | Ưu tiên |
|---|---|---|---|---|---|
| T-11 | Chế độ xem DẠNG LIST của lưới sản phẩm (nút chuyển lưới/list cạnh «Sắp xếp»), desktop | List đang là col-12: mỗi card chiếm cả hàng, nhìn dài/thưa | List chuyển sang col-6: mỗi hàng 2 card ngang (ảnh trái, thông tin phải) rộng 1/2 mỗi card; CHỈ áp cho chế độ list (chế độ lưới giữ nguyên 4 cột); mobile giữ nguyên; áp ở mọi trang dùng cùng lưới + nút chuyển (tìm kiếm, danh mục) vì cùng snippet; card không vỡ ở lg nhỏ (1024: ảnh/nút/giá không tràn, tên 2 dòng) | `snippets/products-grid-item.bwt`/`collection-sortby.bwt`/`ui_product_card` chế độ list + `templates/search.bwt`, `collection.bwt`; kiểm 1024/1280/1440/1920 | TB |

## Bổ sung (ảnh 77–80 — trang «Về chúng tôi», laptop)
| Mã | Trang / khổ | Hiện trạng | Kết quả mong muốn (PO chốt) | Phạm vi | Ưu tiên |
|---|---|---|---|---|---|
| T-12 | Về chúng tôi — thanh số liệu dưới hero (10+ / 400+ / 100% / 1:1) | Nền xám nhạt, chữ xám nhạt gần như tàng hình, không phân cấp | Dải nền xanh thương hiệu `#3CB371` (token `bg-primary`) rộng hết; số TRẮNG lớn đậm, nhãn trắng mờ (`text-white/80`); 4 cột đều, căn giữa; số ĐẾM LÊN (count-up) khi cuộn tới | `snippets/page_about.bwt` (+ JS count-up dùng class bật tắt, không style inline) | Cao |
| T-13 | Về chúng tôi — 3 khối: «Sứ mệnh» (+3 trụ cột), «Quy trình» (3 bước), «Thông tin đăng ký kinh doanh» | Chữ trần trên nền trắng/xám, không có màu sắc bố cục | Mỗi mục là THẺ MÀU NHẸ: nền `bg-brand-tint`, viền mảnh xanh (`border-primary/20`…, token), bo `rounded-2xl`; icon (trụ cột) và số bước (01/02/03) nằm trong VÒNG XANH thương hiệu; tiêu đề xanh đậm (`text-brand-deep`), nhãn nhỏ («TRỤ CỘT 01», «HÀNH TRÌNH CÙNG BẠN», «Hồ sơ pháp lý») màu thương hiệu; các thẻ xen kẽ nền trắng/nền xanh nhạt cho nhịp bố cục; khối «Thông tin đăng ký kinh doanh» dạng thẻ có nền nhạt, nhãn trường đậm, nội dung dễ đọc; giữ nội dung pháp lý nguyên văn | `snippets/page_about.bwt` (các khối Sứ mệnh/Quy trình/Pháp lý) | Cao |
| T-14 | Về chúng tôi — animate (T-12, T-13) | Không có chuyển động | Hiện dần lên khi cuộn tới (fade-up, IntersectionObserver gắn/gỡ class Tailwind, không style inline) + số đếm lên (T-12) + icon nảy nhẹ khi rê chuột thẻ; TẤT CẢ dưới `motion-safe:` (tắt khi giảm chuyển động); keyframes mới (vd `fade-up`) khai báo trong `tailwind.pc.config.js` — PO đồng ý thêm | `tailwind.pc.config.js`, `page_about.bwt`, JS nhỏ | TB |
Ghi chú QA: kiểm màu tương phản ≥4.5:1 (chữ trắng trên #3CB371 chỉ ~2.5:1 → số lớn đậm ≥24px đạt ngưỡng chữ lớn 3:1; nhãn nhỏ dùng `text-white` đậm hoặc đặt bóng nhẹ/`bg-brand-deep` nếu không đạt); mobile 390 không vỡ; nút chat không che dải số liệu.

## Bổ sung (ảnh 81 — Về chúng tôi, mục Đội ngũ)
| Mã | Trang / khổ | Hiện trạng | Kết quả mong muốn (PO chốt) | Phạm vi | Ưu tiên |
|---|---|---|---|---|---|
| T-15 | Về chúng tôi — «Đội ngũ SKIN HEALTH BEAUTY» (4 thẻ chuyên gia, mọi khổ) | Thẻ ghi tên riêng: «Chuyên gia Nguyễn Phương Anh», «…Trần Minh Châu», «…Lê Thu Trang», «…Vũ Hà Phương» (giá trị ở `about_expert_N_name`) | KHÔNG hiển thị tên riêng. Dòng tên riêng được thay bằng «Chuyên gia» (chung); dòng vai trò giữ nguyên (`about_expert_N_role`: Giám đốc Chuyên môn / Chuyên gia Điều trị Da / Chuyên gia Tư vấn & Soi Da / Chuyên gia Thẩm mỹ Lâm sàng). Để không lặp «Chuyên gia / Chuyên gia Điều trị Da», FE chọn cách gọn: bỏ dòng tên, chỉ còn 1 dòng đậm = vai trò (thẻ 1 ghi «Chuyên gia Giám đốc Chuyên môn»); mô tả giữ, không có tên người ở mô tả; tuân RULE-P0-02 (dùng «Chuyên gia», không «Bác sĩ») | `configs/settings_data.json` (`about_expert_1..4_name`), `settings_schema.json` default tương ứng, `snippets/page_about.bwt`; quét các trang khác có hiển thị tên 4 người này (trang chuyên gia, schema JSON-LD, alt ảnh, meta) và loại tên riêng | TB |

## Bổ sung (ảnh 82 — Về chúng tôi, mục Hoạt chất)
| Mã | Trang / khổ | Hiện trạng | Kết quả mong muốn (PO chốt) | Phạm vi | Ưu tiên |
|---|---|---|---|---|---|
| T-16 | Về chúng tôi — «Hoạt chất kiểm chứng lâm sàng — Nguồn gốc chính ngạch» | Nhãn «400+ THƯƠNG HIỆU TOÀN CẦU» đặt trên danh sách ~28 hoạt chất (chip chữ, xuống dòng nhiều hàng, trơ) | (a) Dùng DANH SÁCH THẬT (collection hoạt chất, ~29 mục từ settings/data — KHÔNG bịa tên), đổi nhãn thành đúng số liệu thật «29+ hoạt chất» (lấy số từ dữ liệu, không gõ tay); (b) hiển thị dạng marquee ngang 2–3 hàng chip, mỗi hàng nhân đôi nội dung để vòng lặp liền mạch, hàng chạy NGƯỢC CHIỀU nhau, mờ dần hai mép, rê chuột thì DỪNG; (c) `motion-safe:` — khi bật giảm chuyển động chip hiện thành lưới/dòng xuống hàng tĩnh; (d) mobile cũng chạy, chip ≥44px chạm nếu là link; chip dẫn về trang hoạt chất nếu có URL | `snippets/page_about.bwt` (khối hoạt chất), `tailwind.pc.config.js` (keyframes `marquee`/`marquee-reverse`, PO đồng ý thêm), dữ liệu hoạt chất | TB |
Ghi chú QA T-16: con số «29+» phải lấy từ độ dài danh sách thật (Liquid `size`), không hardcode; animation chỉ dùng class Tailwind; `hover:` dừng bằng `hover:[animation-play-state:paused]` là giá trị tùy ý → FE dùng utility `hover:pause` nếu thêm vào config, tránh arbitrary; kiểm không tràn ngang trang (overflow-hidden bao ngoài).

## Bổ sung (ảnh 83 — trang Thương hiệu đối tác chính hãng, mobile)
| Mã | Trang / khổ | Hiện trạng | Kết quả mong muốn (PO chốt) | Phạm vi | Ưu tiên |
|---|---|---|---|---|---|
| T-17 | Trang Thương hiệu (`snippets/page_thuong_hieu.bwt`) — banner xanh «TUẦN LỄ THƯƠNG HIỆU / SĂN DEAL SIÊU HOT» (dòng ~100–135) + nhãn trên từng thẻ thương hiệu (dòng ~162–170) | Toàn bộ chữ ưu đãi VIẾT CỨNG, không có dữ liệu/chương trình thật: «ưu đãi đến 50%», «Voucher 200.000đ đơn từ 1.500K», «Bộ mẫu thử minisize», «Miễn phí giao hàng toàn quốc», nút «Khám phá thương hiệu»; nhãn xoay vòng theo thứ tự thẻ: «Ưu đãi đến 50%», «Mua 1 tặng 1», «MUA LÀ CÓ QUÀ», «Voucher đến 100K», «Chính hãng 100%». Mobile hiển thị cả khối banner chiếm gần hết màn hình | (a) MOBILE: ẨN HẲN banner (không đủ không gian) — `max-lg:hidden`; (b) DESKTOP: giữ khung banner nhưng nội dung chỉ là thông tin THẬT về thương hiệu đối tác (không khuyến mãi chưa được trình): nhãn nhỏ «Thương hiệu đối tác chính hãng», tiêu đề kiểu «Phân phối chính hãng từ các thương hiệu dược mỹ phẩm hàng đầu», đoạn mô tả nêu cam kết chính hãng/nhập khẩu chính ngạch (khớp nội dung đã có trên site), số lượng thương hiệu lấy từ dữ liệu menu (`linklists` size, không gõ tay); (c) BỎ nút «Khám phá thương hiệu»; (d) BỎ toàn bộ chip DEAL/QUÀ/FREE và nhãn xoay vòng trên thẻ thương hiệu (thay bằng thông tin thật: số sản phẩm của thương hiệu nếu có `b_count`, hoặc không nhãn); (e) nội dung banner đưa vào settings (`settings_schema/data`) để PO sửa, mặc định chỉ chứa câu thông tin thật ở (b) | `snippets/page_thuong_hieu.bwt`, `configs/settings_schema.json` + `settings_data.json`; kiểm 390/768/1024/1440 | Cao |
Ghi chú QA T-17 (nguyên tắc dự án «không bịa dữ liệu»): sau T-17 FE grep toàn site tìm các cụm khuyến mãi viết cứng tương tự («tặng 1», «đến 50%», «MUA LÀ CÓ QUÀ», «minisize», «Miễn phí giao»...) trong snippets/templates/settings default; mục nào không có nguồn dữ liệu thật thì báo BA để đưa vào TODO, không tự giữ.
