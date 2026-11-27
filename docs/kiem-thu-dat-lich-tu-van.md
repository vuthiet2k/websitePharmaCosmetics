# Kiểm thử trang Đặt lịch tư vấn (`/dat-lich-tu-van`) — bản form liên hệ Sapo

> Viết ngày 27/11/2026, theo code hiện tại của `templates/page.dat_lich_tu_van.bwt` (commit `7b29048`, `3334b1e`, `5c5976a`).
> Từ 26/11/2026 trang **không còn dùng MOPS/GAS**: không đặt cọc, không mã QR. Khi khách gửi form, **Sapo gửi email về
> hộp thư cửa hàng**, đồng thời một bản ghi được gửi song song vào CRM (Google Sheet `Contact_Leads`).
> Mỗi mục chỉ tính là xong khi có **video tự test trên cả máy tính và điện thoại**, giống quy định trong báo cáo lỗi 26/11.

## 0. Chuẩn bị trước khi test

| # | Kiểm tra | Ở đâu | Giá trị đúng |
| :-- | :-- | :-- | :-- |
| P1 | Trang nội dung `dat-lich-tu-van` dùng giao diện **`page.dat_lich_tu_van`** | Sapo › Website › Trang nội dung | Mở `/dat-lich-tu-van` thấy form mới (mục 2) |
| P2 | Email nhận thông báo liên hệ | Sapo › Cài đặt › Thông báo / Email cửa hàng | Hộp thư có người theo dõi hằng ngày |
| P3 | Hotline đặt lịch | Cấu hình theme › Đặt lịch › Hotline (`dat_lich_hotline`) | Hiện là `0965594399`. ⚠ Khác số Zalo `0967194063` (`contact_zalo`): cần xác nhận đây là chủ ý |
| P4 | Danh sách chi nhánh | Cấu hình theme › Đặt lịch (`list_room_booking`) | Mỗi chi nhánh ngăn bằng dấu `;`. Hiện có 1: «Cơ sở Hoàng Mai (Số 44 Ngõ 897 Giải Phóng, Hoàng Mai, Hà Nội)» |
| P5 | Bản đồ | Cấu hình theme › Liên hệ & Hỗ trợ (`contactr_contact_maps`) | Link nhúng Google Maps, `https://www.google.com/maps/embed?...` |
| P6 | Bộ nút tab | Cấu hình theme › Đặt lịch › nút 1, 2, 3 | Nút 1 «Gọi tư vấn ngay» bật · Nút 2 «Đặt lịch tư vấn» bật · **Nút 3 «Tiếp thị liên kết» TẮT** |
| P7 | Chat AI | Cấu hình theme › Chat AI (`ai_chat_enable`) | Bật. Trang `/pages/chat-ai` tồn tại |
| P8 | CRM | Cấu hình theme › CRM (`crm_intake_enabled`, `crm_intake_url`) | Bật, URL là web app của `crm-gas` (không phải `mops-gas`) |
| P9 | FAQ (không bắt buộc) | Danh mục bài viết `cau-hoi-dat-lich` | Có bài thì hiện khối «Câu Hỏi Thường Gặp» cuối trang |

Dùng **tab ẩn danh** khi test để không bị dữ liệu cũ (đăng nhập, bộ nhớ trình duyệt) ảnh hưởng.
Ghi lại: ngày giờ test, thiết bị, trình duyệt.

## 1. Bảng ca kiểm thử

Cột KQ: ghi **Đạt / Không đạt** kèm link video hoặc ảnh. MT = máy tính (Chrome, rộng ≥ 1280px); ĐT = điện thoại thật
(1 máy Android Chrome + 1 iPhone Safari nếu có).

### A. Hiển thị trang

| ID | Bước | Kết quả đúng | MT | ĐT |
| :-- | :-- | :-- | :-- | :-- |
| A1 | Mở `/dat-lich-tu-van` | Cột trái: khung trắng có nhãn **«Miễn phí»**, tiêu đề (H1) «Đặt lịch tư vấn miễn phí», «Dịch vụ: Tư vấn da cùng Chuyên gia». **Bản đồ nằm ngay dưới khung này** | | |
| A2 | Nhìn toàn trang | **Không** có khung đỏ «Chưa cấu hình dịch vụ…», **không** có bảng «Quét QR để đặt cọc» hay nút «Tôi đã chuyển khoản xong», **không** có tab «Tiếp thị liên kết» | | |
| A3 | Ctrl+U (xem mã nguồn), Ctrl+F lần lượt tìm `Quét QR`, `khám chữa bệnh`, `lịch khám`, `affiliate` | **0 kết quả** cho cả 4 từ | | — |
| A4 | Đọc câu cam kết dưới form | «…chỉ dùng để xác nhận lịch hẹn và tư vấn liệu trình phù hợp — không chia sẻ cho bên thứ ba.» Ô đồng ý ghi «…cho mục đích đặt lịch tư vấn» | | |
| A5 | Tab «Gọi tư vấn ngay» / «Đặt lịch tư vấn» (chỉ có khi bật P6) | Chỉ có 2 tab. Bấm «Gọi tư vấn ngay» thì hiện nút Gọi + Nhắn Zalo; bấm «Đặt lịch tư vấn» thì quay lại form | | |
| A6 | Điện thoại: cuộn hết trang | Không trượt ngang, chữ không tràn, nút và ô nhập đủ to để chạm (≥ 44px) | — | |

### B. Kiểm tra dữ liệu nhập (chưa gửi thật)

| ID | Bước | Kết quả đúng | MT | ĐT |
| :-- | :-- | :-- | :-- | :-- |
| B1 | Để trống hết, bấm «Đặt lịch tư vấn miễn phí» | Trình duyệt báo thiếu ở ô bắt buộc đầu tiên; **form không gửi** | | |
| B2 | Ô Số điện thoại: gõ `0965 594 399` | Dấu cách tự bị bỏ, còn `0965594399`. Trên ĐT bật bàn phím số | | |
| B3 | SĐT `12345678` hoặc `096559` | Báo «Số điện thoại 9–10 số, bắt đầu bằng 0»; không gửi | | |
| B4 | Email `abc` (thiếu @) | Trình duyệt báo email sai; không gửi | | |
| B5 | Ô Ngày đến | Mặc định là **hôm nay**; **không chọn được ngày đã qua** | | |
| B6 | Ô Chi nhánh | Có đúng các chi nhánh ở P4 | | |
| B7 | Ô Thời gian | 3 lựa chọn Sáng / Chiều / Tối, mặc định «Sáng»; chọn ô nào thì ô đó tô xanh | | |
| B8 | Điền đủ nhưng **không tick** ô đồng ý | Báo phải tick; không gửi | | |
| B9 | Đã đăng nhập tài khoản khách rồi mở trang | Họ tên và Email tự điền sẵn | | |

### C. Gửi thật

Dùng **dữ liệu test dễ nhận ra**: Họ tên `TEST ĐẶT LỊCH <ngày> <MT/ĐT>`, SĐT của người test, ghi chú `Test — bỏ qua`.

| ID | Bước | Kết quả đúng | MT | ĐT |
| :-- | :-- | :-- | :-- | :-- |
| C1 | Điền đủ, tick đồng ý, bấm gửi | Nút mờ đi trong lúc gửi (tối đa ~3 giây), trang tải lại và hiện khung xanh **«Đặt lịch thành công!»** | | |
| C2 | Mở hộp thư cửa hàng (P2) | Có **1 email liên hệ** chứa: name, phone, email, body (ghi chú), **Chi_nhanh, Ngay_den, Khung_gio, Dich_vu** = «Tư vấn da cùng Chuyên gia (miễn phí)», **Nguon** = «Trang Đặt lịch tư vấn». Ghi lại thời gian email về | | |
| C3 | Mở Google Sheet CRM, tab `Contact_Leads` | Có 1 dòng mới, nguồn `clinic_booking`, đúng họ tên, SĐT, chi nhánh, ngày, khung giờ | | |
| C4 | Gửi thêm 1 lần nữa với cùng dữ liệu | Vẫn thành công. Ghi lại nếu Sapo hiện **mã xác minh (captcha)** hoặc chặn gửi lặp | | |
| C5 | Không bắt buộc: F12 › Network › chặn `script.google.com` (Request blocking) rồi gửi | Form **vẫn gửi** sau tối đa ~2,5 giây, vẫn có email (C2). CRM không có dòng mới là đúng | | — |
| C6 | Không bắt buộc: thử bỏ trống email bằng cách xoá thuộc tính `required` của ô Email trong F12 rồi gửi | Ghi lại Sapo **có bắt buộc email không**. Nếu không bắt buộc, có thể bỏ dấu * cho khách đỡ phải nhập | | — |

### D. Đặt lịch kèm dịch vụ (`?handle=`)

| ID | Bước | Kết quả đúng | MT | ĐT |
| :-- | :-- | :-- | :-- | :-- |
| D1 | Mở `/dat-lich-tu-van?handle=<đường dẫn 1 sản phẩm/liệu trình thật>` | Sau ~1 giây: «Dịch vụ: <tên sản phẩm>», nhãn đổi thành «Đặt lịch», mô tả lấy từ tóm tắt sản phẩm | | |
| D2 | Gửi form ở D1 | Email có **Dich_vu = tên sản phẩm**. Dòng CRM có ghi chú «Dịch vụ: <tên>» | | |
| D3 | `/dat-lich-tu-van?handle=khong-ton-tai` | Giữ «Tư vấn da cùng Chuyên gia», không báo lỗi | | |

### E. Lối phụ và các nút dẫn vào trang

| ID | Bước | Kết quả đúng | MT | ĐT |
| :-- | :-- | :-- | :-- | :-- |
| E1 | Bấm «Hỏi nhanh Chat AI» dưới form | Mở khung chat AI nổi (hoặc trang `/pages/chat-ai`) | | |
| E2 | Bấm «Gọi 0965594399» | MT: hỏi mở ứng dụng gọi · ĐT: mở trình gọi đúng số | | |
| E3 | Bấm «Nhắn Zalo» | Mở `zalo.me/0967194063` | | |
| E4 | Bấm nút đặt lịch ở: Hero trang chủ, trang Giới thiệu, khối Spa, CTA cuối danh mục, trang Liệu trình, sản phẩm kê toa (nút tư vấn), kết quả Khám da AI, trang chi tiết ca Trước & Sau | Đều về `/dat-lich-tu-van` (một số kèm `?handle=`), **không trang nào báo lỗi** | | |

### F. Sạch lỗi

| ID | Bước | Kết quả đúng | MT | ĐT |
| :-- | :-- | :-- | :-- | :-- |
| F1 | F12 › Console khi mở trang và khi gửi | Không có lỗi đỏ của theme. Lỗi `anSettings is not defined` (ứng dụng anhnoi) là **lỗi đã biết 2.6**, ghi riêng | | — |
| F2 | Khối «Câu Hỏi Thường Gặp» (nếu có P9) | Bấm từng câu thì mở ra/thu lại được | | |

## 2. Những điều đã thay đổi so với bản cũ (để không báo nhầm là lỗi)

- **Không còn đặt cọc** và mã QR. Dịch vụ cần thu cọc thì nhân viên xử lý khi gọi xác nhận.
- **Không còn chống trùng khung giờ**: 2 khách có thể chọn cùng chi nhánh, ngày, khung giờ. Nhân viên sắp xếp khi gọi lại.
- Lịch hẹn **chỉ về email cửa hàng và CRM**, không còn vào MOPS admin.
- Ô **Email là bắt buộc**, vì form liên hệ Sapo dùng ô này. Kết quả C6 sẽ cho biết có bỏ bắt buộc được không.

## 3. Bảng tổng hợp gửi lại

| Nhóm | Số ca | Đạt | Không đạt | Ghi chú / link video |
| :-- | :-- | :-- | :-- | :-- |
| A. Hiển thị | 6 | | | |
| B. Dữ liệu nhập | 9 | | | |
| C. Gửi thật | 6 | | | |
| D. Kèm dịch vụ | 3 | | | |
| E. Lối phụ, nút dẫn vào | 4 | | | |
| F. Sạch lỗi | 2 | | | |

Ca **Không đạt**: ghi rõ bước làm, kết quả thấy được, ảnh hoặc video, thiết bị. Nhớ xoá các email và dòng CRM có chữ `TEST`
sau khi test xong.
