# Home Portal v3 — ghi chú tích hợp

Nguồn giao diện: `phase/update new ui home portal/v3-brand-guideline.html` và báo cáo UI/UX cùng thư mục. Ngày cập nhật: 15/09/2026.

## Cách xem

- Chạy `npm run preview`, mở http://127.0.0.1:3000/.
- Ảnh chụp: [desktop](desktop.png), [mobile](mobile.png), [Hero desktop](hero-desktop.png), [Hero mobile](hero-mobile.png).
- Preview dùng dữ liệu mẫu sẵn có của dự án. Khi đưa theme lên Sapo, Liquid đọc dữ liệu của cửa hàng.

## Phạm vi

Trang chủ dùng bảng màu xanh rừng, Fraunces/Inter và bố cục ba chương **Khám phá — Tin cậy — Đồng hành**. Header giữ logo, menu, tài khoản, tìm kiếm và giỏ hàng của dự án. Footer tiếp tục lấy thông tin doanh nghiệp, chính sách và mạng xã hội từ cấu hình thật.

CSS mới chỉ áp dụng khi `template == 'index'` và `home_portal_v3_enable` được bật. Các trang sản phẩm, danh mục, đặt lịch, Skin Health Beauty và MOPS giữ layout tương ứng.

## Ánh xạ nội dung

| Khối | File thực thi | Nguồn dữ liệu |
| --- | --- | --- |
| Bộ điều phối trang chủ | `snippets/home_portal.bwt` | `home_section_1` … `home_section_18`; bỏ qua slot không hợp lệ hoặc trùng |
| Hero + sơ đồ | `portal_hero.bwt`, `portal_skin_diagram.bwt` | `home_hero_*`, `portal_hero_*` |
| Hai thương hiệu | `section_portal_split.bwt` | `portal_shop_*`, `portal_clinic_*`, `home_spa_btn_url` |
| Vấn đề da | `portal_solutions.bwt` | Menu `home_solutions_menu`, dự phòng bằng `home_solutions_1` … `6` |
| Flash Sale | `section_flash_sale.bwt` | Collection, thời hạn và chu kỳ đếm ngược hiện có |
| Sản phẩm bán chạy | `section_featured_products.bwt` | `home_featured_collection`; giữ thứ tự sản phẩm do cửa hàng cấu hình |
| Trị liệu 1:1 | `portal_clinic.bwt` | `home_spa_*`, ba bước `portal_step_*`, liên kết đặt lịch hiện có |
| Thương hiệu | `portal_brands.bwt` | `home_brand_menu`, dự phòng `store.vendors` |
| Minh chứng | `portal_proof.bwt` | `home_testi_*`; chỉ ghi Trước/Sau khi có đủ hai ảnh |
| Hoạt chất | `portal_ingredients.bwt` | `home_ing_menu` hoặc `ing_1_*` … `ing_9_*` |
| Blog | `section_portal_blog.bwt` | Blog được chọn; dự phòng `section_blog_url`; không có bài thì hiện trạng thái cập nhật |
| Mạng xã hội | `section_portal_social.bwt` | Các URL `footer_social_*` đã được cấu hình |
| Bản tin | `section_portal_newsletter.bwt` | `portal_newsletter_action`; ẩn khi chưa có URL tiếp nhận |

Không đưa giá, lượng bán, số người theo dõi, thông tin giấy phép hay bài viết giả trong mockup vào dữ liệu cửa hàng. Khối bản tin không giả lập thông báo thành công.

## Cấu hình Sapo

1. Nhóm **Home Portal v3**: bật giao diện, chọn sơ đồ hoặc ảnh Hero hiện có, đổi nội dung hai thương hiệu, quy trình, blog và bản tin.
2. Nhóm **Trang chủ**: tiếp tục bật/tắt, đổi thứ tự Module 1–18. Bốn lựa chọn mới là Hai thương hiệu, Blog, Mạng xã hội và Bản tin.
3. Nhóm **Home Portal — Hoạt chất**: sửa tên, mô tả và URL các thẻ. Nếu đã chọn menu hoạt chất thì menu được ưu tiên.
4. Bản tin: nhập URL HTTPS form của nhà cung cấp email, nhận trường `EMAIL` (ví dụ URL Mailchimp `/subscribe/post`). Đăng ký và xác nhận do nhà cung cấp xử lý. Chưa cấu hình thì form được ẩn.
5. Có thể tắt `home_portal_v3_enable` để dùng trình bày cũ; slot mới chỉ dành cho v3 và cần sắp xếp lại các slot cũ nếu muốn khôi phục bố cục trước đó.

## Logic và sửa lỗi

- Tái sử dụng thẻ `product_grid_office_sale.bwt` và AJAX cart hiện có: sản phẩm một biến thể thêm vào giỏ; nhiều biến thể/giá liên hệ mở chi tiết; hết hàng vô hiệu hóa; đặt trước giữ luồng đặt trước.
- Nút thêm hàng ghi rõ **Thêm vào giỏ**. Nút carousel dùng `button`, nhãn truy cập và focus bàn phím.
- Ảnh thiếu dùng `no-image.jpg`. Không tạo ảnh hover thứ hai khi sản phẩm chỉ có một ảnh. Bộ xử lý ảnh lỗi loại bỏ `srcset` lỗi trước khi dùng ảnh dự phòng.
- Giữ bộ khởi tạo carousel của app “Sản phẩm xem nhiều nhất”. Khi tất cả sản phẩm đã vừa màn hình, nút tiếp được vô hiệu hóa đúng; màn hình nhỏ vẫn chuyển được.
- Bổ sung route preview `/skin-health-beauty` tới `page.indexskinhealthy`, dùng layout Skin Health Beauty. Đây là URL đã có trong cấu hình và router tên miền của dự án.
- Dev server theo dõi thêm CSS thuần để cập nhật giao diện ngay sau khi lưu.

## Kiểm tra

`npm run test:portal` chạy kiểm tra giao diện, luồng giỏ hàng, phân loại sản phẩm, tìm kiếm mobile, ảnh lỗi, các trạng thái cấu hình, carousel của app và cách ly layout. Viewport: 1440, 768, 390 và 360 px.

`npm run build` tạo gói theme trong `dist`. `npm run build:vercel` kiểm tra render trang chủ/MOPS và xuất tài nguyên trong `vercel-dist`. Chưa xuất bản lên Sapo hoặc Vercel.

Kết quả: **12/12 kiểm tra đạt**; sau khi chốt lưới 4 cột desktop / 2 cột mobile, **4/4 kiểm tra carousel và responsive chạy lại đạt**. Build theme và export Vercel đều thành công. Form bản tin chưa được cấu hình nhà cung cấp nên không có kiểm tra gửi email thật.

Tái tạo ảnh bàn giao bằng `node scripts/capture-portal.js` khi preview đang chạy.
