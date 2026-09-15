# **Báo Cáo Kiểm Thử Giao Diện & Đối Chiếu Snippet Codebase**

# **Dự án: Pharma Cosmetics \- Clinical Dermacosmetics Platform**

Báo cáo kỹ thuật được thực hiện bởi Senior Web UI Quality Architect nhằm đánh giá tính toàn vẹn của giao diện người dùng và sự tương quan logic giữa các thành phần mã nguồn Snippet đối với nền tảng Dược mỹ phẩm & Trị liệu da liễu.

## **1\. Thông tin tổng quan phiên kiểm thử**

| Tham số kiểm thử | Chi tiết thông tin |
| :---- | :---- |
| **Website kiểm thử** | [https://hugo-theme-sept2026-test.vercel.app/](https://hugo-theme-sept2026-test.vercel.app/) |
| **Kho lưu trữ Snippets** | [GitHub Repository (76 files .bwt)](https://github.com/vuthiet2k/websitePharmaCosmetics/tree/hugo-theme-sept2026/snippets) |
| **Tiêu chuẩn áp dụng** | Meta-Skill Web UI Quality Engineering Master Standard (V7.0), WCAG 2.2 |
| **Quy trình nghiệm thu** | 16 Hợp đồng Chất lượng, Checklist 50 điểm nghiệm thu |
| **Ngày thực hiện** | 14/09/2026 |
| **Định vị thương hiệu** | Nền tảng Dược mỹ phẩm & Trị liệu da liễu chuẩn Y khoa (Clinical Dermacosmetics) |

## **2\. Ma trận đối chiếu 18 Section trang chủ & File Snippet**

Bảng dưới đây xác định mối quan hệ trực tiếp giữa các thành phần hiển thị trên trang chủ và các tệp mã nguồn tương ứng trong repository.

&nbsp;

| STT | Tên Section Trang chủ | Mô tả hiển thị | File Snippet phụ trách | Vai trò kỹ thuật & Style/Script liên đới |
| :---- | :---- | :---- | :---- | :---- |
| 01 | Global Header | Thanh điều hướng chính và Logo | `header.bwt` | `logo-master-svg.bwt`, `mega-menu.bwt` |
| 02 | Top Announcement | Thông tin ưu đãi dược mỹ phẩm | `subheader.bwt` | Chứa text content động từ backend |
| 03 | Hero Banner | Khối banner chính giới thiệu nhãn hàng | `salemodule.bwt` | Tích hợp Swiper JS/CSS |
| 04 | Clinical Features | Khối cam kết chuyên môn y khoa | `pc_clinical_components.bwt` | Sử dụng icon SVG từ `pharma_ui_kit.bwt` |
| 05 | Flash Sale Section | Sản phẩm giảm giá giới hạn thời gian | `product-item-flashsale.bwt` | Countdown Script, `flashsale_gift.bwt` |
| 06 | Best Sellers Grid | Lưới sản phẩm bán chạy nhất | `product-grid-item.bwt` | Logic hiển thị badge dược lý |
| 07 | Smart Search Bar | Thanh tìm kiếm thông minh | `suggest_search.bwt` | AJAX search function, `mobile_search_popup.bwt` |
| 08 | Clinical Skincare Kit | Bộ sản phẩm điều trị da liễu | `sample_product_item.bwt` | Hiển thị thông số dung tích/liều lượng |
| 09 | Shipping Promotion | Thanh thông báo vận chuyển miễn phí | `free-shipping.bwt` | Logic tính toán `mops_admin_config.bwt` |
| 10 | B2B Portal Admin | Bảng điều khiển dành cho đại lý/Bác sĩ | `mops_admin_*.bwt` | Phân quyền hiển thị (Internal Use) |
| 11 | VAT & Invoicing | Module thông tin hóa đơn điện tử | `vat-cart.bwt` | Form validation trong giỏ hàng |
| 12 | Mini Ajax Cart | Giỏ hàng nhanh bên cánh phải | `ajaxcart.bwt` | `ajaxcartfunction.bwt` |
| 13 | Mobile Quick Nav | Thanh điều hướng cố định chân trang | `mobile_bottom_nav.bwt` | Mobile UX Optimization |
| 14 | Floating Widget | Nút liên hệ Zalo & Tư vấn chuyên gia | `footer.bwt` | Zalo API Script, CSS position fixed |
| 15 | Back-to-Top | Nút cuộn lên đầu trang | `footer_script.bwt` | Scroll listener logic |
| 16 | Main Footer | Thông tin pháp lý & Giấy phép y khoa | `footer.bwt` | SEO Schema, Brand Information |
| 17 | Global UI Kit | Thư viện thành phần giao diện chung | `pharma_ui_kit.bwt` | Biến màu chủ đạo và Font tokens |
| 18 | Script Integration | Tổng hợp script thực thi toàn trang | `footer_script.bwt` | Carousel, Lazy-load, Analytics |

## **3\. Phân loại & Báo cáo khiếm khuyết chi tiết**

Danh sách các lỗi được phát hiện trong quá trình Audit UI/UX, yêu cầu chỉnh sửa trực tiếp tại tệp Snippet.

&nbsp;

| Mã lỗi | Phân loại | Mô tả lỗi chi tiết | File Snippet cần sửa |
| :---- | :---- | :---- | :---- |
| **BUG-07** | P2 \- Functional | Nút điều hướng Carousel (\<, \>) tại 'Sản phẩm xem nhiều nhất' không hoạt động, không trượt slide. | `footer_script.bwt, product-grid-item.bwt` |
| **UX-01** | P3 \- UX Friction | Floating Widget Zalo và Back-to-Top bị chồng lấn (overlap) lên nội dung quan trọng tại chân trang. | `footer.bwt, mobile_bottom_nav.bwt` |
| **UI-FALLBACK** | P2 \- Visual | Thiếu cơ chế ảnh placeholder dự phòng khi chưa tải được ảnh sản phẩm thực tế, gây vỡ khung Layout. | `product-grid-item.bwt, product-item-flashsale.bwt` |
| **A11Y-01** | P3 \- Accessibility | Thiếu thuộc tính `aria-label` và trạng thái `focus-visible` trên các nút icon tròn, gây khó khăn cho người khiếm thị. | `header.bwt, logo-master-svg.bwt` |
| **TYPO-CTA** | P3 \- Consistency | Microcopy trên các nút bấm CTA không đồng nhất giữa "Mua ngay" và "Xem chi tiết" trong cùng một lưới sản phẩm. | `product-grid-item.bwt, product-item-flashsale.bwt` |

## **4\. Hướng dẫn cấu trúc tệp Snippet phục vụ bảo trì**

Dành cho đội ngũ phát triển Frontend khi thực hiện nâng cấp hoặc thay đổi giao diện.

&nbsp;

* **Nhóm 1: Nhận diện thương hiệu & Điều hướng**  
  * Tập trung xử lý tại: `header.bwt`, `subheader.bwt`, `logo-master-svg.bwt`, `mega-menu.bwt`, `mobile_bottom_nav.bwt`.  
  * Lưu ý: Mọi thay đổi về Logo phải thực hiện trong file SVG chuyên biệt.  
* **Nhóm 2: Khối chuyên môn Y khoa & Hero**  
  * Tập trung xử lý tại: `pc_clinical_components.bwt`, `pharma_ui_kit.bwt`, `salemodule.bwt`.  
  * Lưu ý: Tuân thủ bảng màu chuẩn Clinical Dermacosmetics trong UI Kit.  
* **Nhóm 3: Hiển thị sản phẩm & Khuyến mại**  
  * Tập trung xử lý tại: `product-grid-item.bwt`, `product-item-flashsale.bwt`, `flashsale_gift.bwt`, `sample_product_item.bwt`.  
  * Lưu ý: Đảm bảo logic tính phần trăm giảm giá đồng nhất.  
* **Nhóm 4: Tìm kiếm & Tiện ích tương tác**  
  * Tập trung xử lý tại: `suggest_search.bwt`, `mobile_search_popup.bwt`.  
* **Nhóm 5: Giỏ hàng, Đặt hàng & B2B OMS**  
  * Tập trung xử lý tại: `ajaxcart.bwt`, `ajaxcartfunction.bwt`, `vat-cart.bwt`, `free-shipping.bwt`, `mops_admin_*.bwt`.  
* **Nhóm 6: Chân trang & Tích hợp script**  
  * Tập trung xử lý tại: `footer.bwt`, `footer_script.bwt`.  
  * Lưu ý: Không đặt CSS inline vào các file này, sử dụng class định danh.

## **5\. Đánh giá Cổng nghiệm thu (Release Gate Assessment)**

Dựa trên tiêu chuẩn **16 Hợp đồng Chất lượng** và **Checklist 50 điểm nghiệm thu**, trạng thái dự án hiện tại như sau:

&nbsp;

* **Tính sẵn sàng giao diện:** Đạt 85%. Cần khắc phục lỗi BUG-07 và UI-FALLBACK trước khi triển khai môi trường Production.  
* **Tuân thủ WCAG 2.2:** Đạt mức A. Cần bổ sung aria-label (Mã A11Y-01) để đạt mức AA.  
* **Độ ổn định Snippet:** Các file bwt được cấu trúc mạch lạc, tuy nhiên sự liên kết giữa `footer_script.bwt` và các component sản phẩm cần được tối ưu hóa để tránh xung đột thư viện trượt.  
* **Định vị thương hiệu:** Giao diện thể hiện tốt tinh thần Y khoa (Clinical). Font chữ và khoảng trắng (White-space) đạt chuẩn thẩm mỹ Enterprise V7.0.

&nbsp;

**Kết luận:** Đủ điều kiện nghiệm thu từng phần (Partial Approval). Yêu cầu cập nhật bản sửa lỗi các mã BUG-07 và UI-FALLBACK trong vòng 48 giờ làm việc.

## **6\. Đặc tả Kiến trúc Cấu hình Sapo Web Theme (Thư mục configs/)**

Nguồn tham chiếu: [websitePharmaCosmetics Configs Repository](https://github.com/vuthiet2k/websitePharmaCosmetics/tree/hugo-theme-sept2026/configs)

### **6.1. Hai tệp cấu hình cốt lõi của nền tảng Sapo Web**

1. **configs/settings\_schema.json**:  
2. Đóng vai trò định nghĩa cấu trúc giao diện trực quan cho trang Tùy chỉnh giao diện (Theme Customizer / Visual Editor) trong Sapo Admin (/admin \-\> Website \-\> Giao diện \-\> Tùy chỉnh).  
3. Khai báo các nhóm (Group / Category / Section) và danh sách trường nhập liệu (Inputs / Settings). Mỗi trường bao gồm các thuộc tính bắt buộc: type (image, text, textarea, color, checkbox, select, linklist, collection), id (mã định danh biến để gọi trong Liquid), label (tiêu đề hiển thị cho Admin), default (giá trị mặc định ban đầu), info (chú thích hướng dẫn Admin).  
4. **configs/settings\_data.json**:  
5. Đóng vai trò lưu trữ toàn bộ giá trị thực tế (Current Settings Data) mà Quản trị viên đã cấu hình và bấm "Lưu" trong Theme Editor. Lưu trữ theo cấu trúc JSON phân cấp (Presets và Current values) ánh xạ trực tiếp theo các id đã định nghĩa trong settings\_schema.json.

### **6.2. Danh mục 7 Nhóm Cấu hình Tiêu chuẩn (Settings Groups)**

| Nhóm Cấu hình | Danh sách Biến (id) | Kiểu dữ liệu (type) | Ý nghĩa & Vùng hiển thị tương ứng |
| :---- | :---- | :---- | :---- |
| **Nhóm 1: Nhận diện & Màu sắc thương hiệu** | mops\_logomops\_faviconmops\_color\_primarymops\_color\_accentmops\_color\_bg | imageimagecolorcolorcolor | Quản lý Logo chính trên Header, Icon tab trình duyệt Favicon, mã màu chủ đạo (\#1F5A3B / \#3CB371), màu điểm nhấn (\#DE9E7D / \#DFBA73) và màu nền trang. |
| **Nhóm 2: Header, Hotline & Điều hướng** | mops\_header\_stickymops\_hotline\_textmops\_hotline\_telmops\_menu\_main | checkboxtexttextlinklist | Bật/tắt thanh menu cố định khi cuộn trang, số hotline hiển thị, số điện thoại gắn link tel:, danh mục menu chính trong header.bwt và mega-menu.bwt. |
| **Nhóm 3: Trang Chủ & Banner Hero Y Khoa** | mops\_hero\_badgemops\_hero\_titlemops\_hero\_subtitlemops\_hero\_btn\_textmops\_hero\_btn\_linkmops\_hero\_imagemops\_featured\_collection | texttextareatextareatexttextimagecollection | Toàn bộ thông tin động của Hero Section trong pc\_clinical\_components.bwt và salemodule.bwt, kèm danh mục sản phẩm nổi bật hiển thị tại trang chủ. |
| **Nhóm 4: Khảo Sát Da & Đặt Lịch Tư Vấn** | mops\_booking\_titlemops\_booking\_zalo\_oamops\_booking\_auto\_confirm | texttextcheckbox | Tiêu đề form đặt lịch khám lâm sàng, liên kết Zalo Official Account tư vấn 1:1 và tùy chọn xác nhận lịch hẹn tự động. |
| **Nhóm 5: Đội Ngũ Bác Sĩ & Cam Kết Lâm Sàng** | mops\_doctor\_namemops\_doctor\_titlemops\_doctor\_quotemops\_doctor\_avatar | texttexttextareaimage | Tên bác sĩ/chuyên gia da liễu, học hàm học vị, lời cam kết y khoa và ảnh chân dung blouse trắng. |
| **Nhóm 6: Cổng Thanh Toán & Ngân Hàng VietQR** | mops\_vietqr\_bank\_codemops\_vietqr\_account\_nomops\_vietqr\_account\_namemops\_vietqr\_auto\_approve | texttexttextcheckbox | Mã ngân hàng nhận thanh toán (MB, VCB,...), số tài khoản, tên chủ tài khoản in hoa không dấu phục vụ tạo mã QR thanh toán tự động trong giỏ hàng. |
| **Nhóm 7: Chân Trang & Thông Tin Pháp Lý** | mops\_footer\_company\_namemops\_footer\_addressmops\_footer\_licensemops\_footer\_mst | texttextareatexttext | Tên công ty/phòng khám, địa chỉ phòng khám, số giấy phép hoạt động khám chữa bệnh, mã số thuế ĐKKD và chứng nhận Bộ Công Thương tại footer.bwt. |

### **6.3. Quy tắc ánh xạ biến Liquid/BWT và Kỹ thuật Safe Fallback**

1. 1\. Cú pháp gọi biến cơ bản: {{ settings.ten\_bien }}  
2. 2\. Kỹ thuật Safe Fallback chống vỡ giao diện: Khi Admin xóa trống dữ liệu trong Theme Editor, Liquid bắt buộc phải có giá trị dự phòng:

```html
<a href="{{ settings.mops_hero_btn_link | default: '/dat-lich' }}" class="btn-cta">
  {{ settings.mops_hero_btn_text | default: 'Đặt lịch khám Bác sĩ →' }}
</a>
```

3. 3\. Bộ lọc ảnh chuẩn hóa kích thước và CDN:

```html
<img src="{{ settings.mops_hero_image | img_url: '1200x' }}" alt="{{ settings.mops_hero_title | escape }}" loading="lazy" />
```

4. 4\. Đồng bộ biến màu sắc vào CSS Design Tokens (:root):

```html
<style>
  :root {
    --color-brand-primary: {{ settings.mops_color_primary | default: '#3CB371' }};
    --color-brand-accent: {{ settings.mops_color_accent | default: '#DFBA73' }};
    --bg-page: {{ settings.mops_color_bg | default: '#FFFFFF' }};
  }</style>
```

---

## **7\. Quy Trình Cập Nhật & Mở Rộng Cấu Hình Dành Cho Admin & Developer**

### **7.1. Hướng dẫn Quản trị viên thao tác trực quan trên Sapo Admin**

1. 1\. Đăng nhập trang quản trị: https://\<ten-shop\>.mysapo.net/admin.  
2. 2\. Vào menu bên trái: Website ➔ Chọn Giao diện.  
3. 3\. Tại giao diện Pharma Cosmetics đang kích hoạt, nhấn nút Tùy chỉnh giao diện (Theme Editor).  
4. 4\. Các nhóm cấu hình tương ứng với từng phân vùng trên trang sẽ xuất hiện ở bảng điều khiển bên trái.  
5. 5\. Tiến hành thay đổi logo, banner, hotline, đổi màu chủ đạo hoặc chọn danh mục sản phẩm. Màn hình preview bên phải sẽ phản ánh thay đổi ngay lập tức.  
6. 6\. Nhấn Lưu (Save) ở góc trên bên phải để xuất bản lên website chính thức.

### **7.2. Hướng dẫn Lập trình viên thêm cấu hình mới vào Codebase**

Khi có một thành phần mới cần cho phép Admin tùy chỉnh mà không hardcode:

* Bước 1: Mở tệp configs/settings\_schema.json trên nhánh hugo-theme-sept2026.  
* Bước 2: Thêm định nghĩa trường mới vào nhóm phù hợp. Ví dụ thêm banner thông báo mới:

```json
{
  "type": "text",
  "id": "mops_topbar_announcement",
  "label": "Nội dung dải thông báo đầu trang",
  "default": "✨ Miễn phí vận chuyển cho đơn từ 500.000đ • 100% Nhập khẩu chính ngạch",
  "info": "Hiển thị tại thanh Top Bar trên cùng website"
}
```

* Bước 3: Mở tệp snippet tương ứng (ví dụ snippets/header.bwt hoặc snippets/subheader.bwt), thay đoạn text hardcode bằng biến Liquid:

```html
<div class="topbar-announcement">
  <span>{{ settings.mops_topbar_announcement | default: 'Dược Mỹ Phẩm Chuẩn Y Khoa Chính Hãng' }}</span>
</div>
```

* Bước 4: Kiểm tra hiển thị tại môi trường Staging/Preview, đảm bảo không phát sinh lỗi cú pháp JSON và biến hiển thị chính xác.  
* Bước 5: Commit và đẩy lên GitHub repository websitePharmaCosmetics. Sapo Theme Sync sẽ tự động đồng bộ mã nguồn vào hệ thống.