# **HỆ THỐNG DANH MỤC SẢN PHẨM TỰ ĐỘNG TRÊN QUẢN LÝ SAPO**

## **Ánh Xạ Phác Đồ Soi Da & Quiz AI PharmaCosmetics**

---

# **1\. TỔNG QUAN VÀ RÀNG BUỘC KỸ THUẬT**

Tài liệu này quy định chuẩn cấu hình danh mục sản phẩm tự động (Automated Collections) trên hệ thống Sapo OmniChannel, đồng bộ trực tiếp với hệ thống Soi da & Quiz AI trên giao diện frontend [websitePharmaCosmetics](https://github.com/vuthiet2k/websitePharmaCosmetics/tree/hugo-theme-sept2026).

## **1.1. Ràng buộc kỹ thuật trên Sapo OmniChannel**

* **Giới hạn quy tắc:** Sapo quy định cứng tối đa **5 điều kiện lọc** cho mỗi danh mục sản phẩm tự động.  
* **Toán tử logic áp dụng:** Hệ thống áp dụng cơ chế **"Một trong các điều kiện" (OR)** trên toàn bộ 8 danh mục chủ lực nhằm quét phủ tối đa các biến thể tên hoạt chất và công dụng thực tế trong kho 5.817 sản phẩm.  
* **Quy chuẩn URL / Alias (Handle):** Các đường dẫn phải viết thường, không dấu, nối bằng dấu gạch ngang (`-`). Đây là định danh duy nhất để hệ thống Hugo Theme gọi dữ liệu chính xác từ Sapo API.

## **1.2. Mục tiêu tích hợp**

* Chuẩn hóa dữ liệu đầu vào trên Sapo để kho sản phẩm tự phân loại vào các danh mục phác đồ mà không cần gán tay.  
* Định ánh xạ tĩnh (Static Mapping) qua Alias/Handle cho phép website hiển thị danh mục sản phẩm tương ứng ngay khi người dùng hoàn thành Quiz AI hoặc nhận kết quả phân tích da.

---

# **2\. MA TRẬN 8 DANH MỤC SẢN PHẨM CHỦ LỰC THEO PHÁC ĐỒ SOI DA**

## **Danh mục 1: Hoạt Chất Làm Sạch & Kiềm Dầu BHA**

* **Mục đích:** Phục vụ Làn Da Dầu / Mụn & Giai đoạn 3 trong phác đồ điều trị.  
* **URL / Alias:** `hoat-chat-bha-salicylic`  
* **Phương thức lọc:** Tự động (Một trong các điều kiện \- OR)

| STT | Trường lọc | Phép so sánh | Giá trị lọc |
| :---- | :---- | :---- | :---- |
| 1 | Tên sản phẩm | chứa từ | `BHA` |
| 2 | Tên sản phẩm | chứa từ | `Salicylic` |
| 3 | Tên sản phẩm | chứa từ | `Salicylic Acid` |
| 4 | Tên sản phẩm | chứa từ | `Azelaine` |
| 5 | Tên sản phẩm | chứa từ | `Anti Acne` |

* **Mẫu sản phẩm thực tế tự động lọt kho:**  
  * ANGIOPHARM Salicylic Toner 100ml  
  * ANGIOPHARM Anti Acne Tonic 200ml  
  * Bioelements Pore Thing 1.5% Salicylic Acid

---

## **Danh mục 2: Tinh Chất Niacinamide & Kiểm Soát Dầu Nhờn**

* **Mục đích:** Kiểm soát tuyến bã nhờn, thu nhỏ lỗ chân lông và hỗ trợ mờ thâm sau mụn.  
* **URL / Alias:** `tinh-chat-niacinamide`  
* **Phương thức lọc:** Tự động (Một trong các điều kiện \- OR)

| STT | Trường lọc | Phép so sánh | Giá trị lọc |
| :---- | :---- | :---- | :---- |
| 1 | Tên sản phẩm | chứa từ | `Niacinamide` |
| 2 | Tên sản phẩm | chứa từ | `Kiểm soát dầu` |
| 3 | Tên sản phẩm | chứa từ | `Giảm dầu` |
| 4 | Tên sản phẩm | chứa từ | `B-Bomb` |
| 5 | Tên sản phẩm | chứa từ | `Zinc PCA` |

* **Mẫu sản phẩm thực tế tự động lọt kho:**  
  * ANGIOPHARM Niacinamide Serum 30ml  
  * Geek & Gorgeous 101 B-Bomb 10% Niacinamide  
  * Transparent Niacinamide Glow Cream

---

## **Danh mục 3: Phục Hồi Hàng Rào Bảo Vệ Da**

* **Mục đích:** Tái tạo lớp lipid, phục hồi da suy yếu, tổn thương (Giai đoạn 2).  
* **URL / Alias:** `phuc-hoi-hang-rao-bao-ve-da`  
* **Phương thức lọc:** Tự động (Một trong các điều kiện \- OR)

| STT | Trường lọc | Phép so sánh | Giá trị lọc |
| :---- | :---- | :---- | :---- |
| 1 | Tên sản phẩm | chứa từ | `Ceramide` |
| 2 | Tên sản phẩm | chứa từ | `Phục hồi hàng rào` |
| 3 | Tên sản phẩm | chứa từ | `Repair Cream` |
| 4 | Tên sản phẩm | chứa từ | `Centella` |
| 5 | Tên sản phẩm | chứa từ | `Panthenol` |

* **Mẫu sản phẩm thực tế tự động lọt kho:**  
  * ANGIOPHARM Ceramide Repair Cream 50ml  
  * Bioelements Recovery Serum  
  * Dermalogica Hyaluronic Ceramide Mist

---

## **Danh mục 4: Cấp Ẩm Chuyên Sâu & Phục Hồi B5 / HA**

* **Mục đích:** Cấp nước đa tầng, cấp ẩm cấp tốc cho da khô, thiếu nước hoặc đang treatment.  
* **URL / Alias:** `duong-am-phuc-hoi-b5-ha`  
* **Phương thức lọc:** Tự động (Một trong các điều kiện \- OR)

| STT | Trường lọc | Phép so sánh | Giá trị lọc |
| :---- | :---- | :---- | :---- |
| 1 | Tên sản phẩm | chứa từ | `Hyaluronic` |
| 2 | Tên sản phẩm | chứa từ | `Cấp ẩm` |
| 3 | Tên sản phẩm | chứa từ | `B5` |
| 4 | Tên sản phẩm | chứa từ | `Dưỡng ẩm` |
| 5 | Tên sản phẩm | chứa từ | `Moisture` |

* **Mẫu sản phẩm thực tế tự động lọt kho:**  
  * Geek & Gorgeous 101 HA 5 Light  
  * Bioelements Moisture x10  
  * ANGIOPHARM Spray Aloe-Chitosan

---

## **Danh mục 5: Làm Dịu & Ổn Định Nền Da**

* **Mục đích:** Giảm kích ứng, làm dịu da nhạy cảm, đỏ rát hoặc giãn mao mạch (Giai đoạn 1).  
* **URL / Alias:** `lam-diu-on-dinh-nen-da`  
* **Phương thức lọc:** Tự động (Một trong các điều kiện \- OR)

| STT | Trường lọc | Phép so sánh | Giá trị lọc |
| :---- | :---- | :---- | :---- |
| 1 | Tên sản phẩm | chứa từ | `Làm dịu` |
| 2 | Tên sản phẩm | chứa từ | `Dịu nhẹ` |
| 3 | Tên sản phẩm | chứa từ | `Anti Couperose` |
| 4 | Tên sản phẩm | chứa từ | `Amino Acid` |
| 5 | Tên sản phẩm | chứa từ | `Da nhạy cảm` |

* **Mẫu sản phẩm thực tế tự động lọt kho:**  
  * ANGIOPHARM Anti Couperose Tonic 150ml  
  * ANGIOPHARM Anti Couperose Mask 75ml  
  * Sữa rửa mặt Amino Acid

---

## **Danh mục 6: Điều Trị Chuyên Sâu Retinoid & Chống Lão Hóa**

* **Mục đích:** Tăng sinh collagen, làm mờ rãnh nhăn, cải thiện cấu trúc da lão hóa.  
* **URL / Alias:** `retinol-chong-lao-hoa`  
* **Phương thức lọc:** Tự động (Một trong các điều kiện \- OR)

| STT | Trường lọc | Phép so sánh | Giá trị lọc |
| :---- | :---- | :---- | :---- |
| 1 | Tên sản phẩm | chứa từ | `Retinol` |
| 2 | Tên sản phẩm | chứa từ | `Retinoid` |
| 3 | Tên sản phẩm | chứa từ | `Peptide` |
| 4 | Tên sản phẩm | chứa từ | `Anti Age` |
| 5 | Tên sản phẩm | chứa từ | `Chống lão hóa` |

* **Mẫu sản phẩm thực tế tự động lọt kho:**  
  * ANGIOPHARM Liposomal Retinol Tonic  
  * IMAGE AGELESS+ Retinol Treatment  
  * ANGIOPHARM Copper Peptide Serum

---

## **Danh mục 7: Mờ Thâm Nám & Hoạt Chất Sáng Da**

* **Mục đích:** Ức chế melanin, làm đều màu da và triệt tiêu sắc tố thâm nám (Tranexamic Acid / Vitamin C).  
* **URL / Alias:** `tri-nam-sang-da-tranexamic-vitc`  
* **Phương thức lọc:** Tự động (Một trong các điều kiện \- OR)

| STT | Trường lọc | Phép so sánh | Giá trị lọc |
| :---- | :---- | :---- | :---- |
| 1 | Tên sản phẩm | chứa từ | `Tranexamic` |
| 2 | Tên sản phẩm | chứa từ | `Vitamin C` |
| 3 | Tên sản phẩm | chứa từ | `Mờ nám` |
| 4 | Tên sản phẩm | chứa từ | `Dark Spot` |
| 5 | Tên sản phẩm | chứa từ | `Dưỡng sáng` |

* **Mẫu sản phẩm thực tế tự động lọt kho:**  
  * TRANACIX Sterile Facial Solution 10% Tranexamic  
  * ANGIOPHARM Tranexamic Cream 50ml  
  * Bioelements VC10 Dark Spot Solution

---

## **Danh mục 8: Chống Nắng Phổ Rộng & Bảo Vệ Toàn Diện**

* **Mục đích:** Bảo vệ da khỏi tia UVA/UVB, ánh sáng xanh và tác nhân gây hại từ môi trường.  
* **URL / Alias:** `kem-chong-nang-pho-rong`  
* **Phương thức lọc:** Tự động (Một trong các điều kiện \- OR)

| STT | Trường lọc | Phép so sánh | Giá trị lọc |
| :---- | :---- | :---- | :---- |
| 1 | Tên sản phẩm | chứa từ | `Chống nắng` |
| 2 | Tên sản phẩm | chứa từ | `Sunscreen` |
| 3 | Tên sản phẩm | chứa từ | `SPF 50` |
| 4 | Tên sản phẩm | chứa từ | `SPF 30` |
| 5 | Tên sản phẩm | chứa từ | `Phổ rộng` |

* **Mẫu sản phẩm thực tế tự động lọt kho:**  
  * ANGIOPHARM Sunscreen Matrix Cream SPF 50  
  * ANGIOPHARM Sunscreen SPF 30 Fluid 100ml  
  * ANGIOPHARM CC-Cream SPF 30

---

# **3\. QUY TRÌNH CẤU HÌNH TRÊN SAPO OMNICHANNEL**

Nhân viên quản trị hệ thống thực hiện thao tác tạo danh mục theo các bước tiêu chuẩn sau:

1. **Truy cập quản trị:** Đăng nhập vào Sapo OmniChannel \$\\rightarrow\$ Menu bên trái chọn **Sản phẩm** \$\\rightarrow\$ Chọn **Danh mục sản phẩm**.  
2. **Khởi tạo danh mục:** Bấm nút **Thêm danh mục** (màu xanh góc trên bên phải).  
3. **Thông tin chung:**  
   * Nhập **Tên danh mục** chính xác theo ma trận ở Mục 2\.  
   * Thêm **Mô tả ngắn** hướng dẫn sử dụng hoặc mô tả nhóm hoạt chất (nếu cần).  
4. **Cấu hình Điều kiện tự động:**  
   * Tại phần **Điều kiện**, chọn radio **Tự động**.  
   * Chọn kiểu kết hợp: **Một trong các điều kiện** (OR).  
   * Tạo đủ 5 dòng điều kiện: Với mỗi dòng, chọn trường **Tên sản phẩm**, phép so sánh **chứa từ**, và dán chính xác từ khóa tương ứng từ ma trận.  
5. **Cấu hình SEO & Alias:**  
   * Cuộn xuống phần **Tối ưu SEO**.  
   * Tại ô **Đường dẫn / Alias**, nhập đúng chuỗi Handle được quy định (ví dụ: `hoat-chat-bha-salicylic`). *Lưu ý: Không tự ý thay đổi chuỗi này vì sẽ làm đứt gãy liên kết trên website.*  
6. **Xác nhận:** Kiểm tra danh sách sản phẩm xem trước (Preview) được tự động gom vào \$\\rightarrow\$ Bấm **Lưu** để hoàn tất.

---

# **4\. ĐỐI CHIẾU VÀ TÍCH HỢP VỚI MÃ NGUỒN HUGO THEME**

Để đảm bảo kết quả từ bài khảo sát (Quiz AI) và hệ thống soi da tự động điều hướng chính xác sản phẩm trên kho, kiến trúc frontend trên repository [websitePharmaCosmetics](https://github.com/vuthiet2k/websitePharmaCosmetics/tree/hugo-theme-sept2026) xử lý theo 2 cơ chế chính:

## **4.1. Chuyển hướng trực tiếp qua Alias Danh mục (Static Direct Link)**

Khi người dùng bấm vào các **Badge hoạt chất ưu tiên** hoặc **Card giai đoạn điều trị** trên trang kết quả Soi da / Quiz AI:

* **Giai đoạn 1 (Làm dịu / Phục hồi nền):** Frontend kích hoạt link trực tiếp tới `/collections/lam-diu-on-dinh-nen-da`.  
* **Giai đoạn 2 (Phục hồi hàng rào):** Link tới `/collections/phuc-hoi-hang-rao-bao-ve-da`.  
* **Giai đoạn 3 (Đặc trị BHA / Retinoid / Niacinamide):** Link tới danh mục tương ứng như `/collections/hoat-chat-bha-salicylic` hoặc `/collections/retinol-chong-lao-hoa`.

## **4.2. Query thời gian thực qua Sapo Search API (Real-time Popup/Modal)**

Trường hợp kết quả phân tích yêu cầu lọc chính xác theo từ khóa phối hợp hoặc hiển thị danh sách sản phẩm nhanh dạng Modal/Popup mà không chuyển trang:

* Frontend gửi AJAX request tới endpoint:  
  `GET /search?type=product&view=quizjson&query={keyword}`  
* **Ví dụ:** Khi phác đồ yêu cầu gợi ý sản phẩm BHA, script trên Hugo Theme sẽ gọi `/search?type=product&view=quizjson&query=BHA`.  
* Bảng template `quizjson.liquid` trên Sapo sẽ trả về dữ liệu cấu trúc JSON gồm: `title`, `price`, `handle`, `image`, `vendor`. Frontend render danh sách sản phẩm trực tiếp lên giao diện Quiz mà không mất thời gian tải lại trang.

## **4.3. Bảng Tóm Tắt Ánh Xạ Hệ Thống**

| Nhóm Phác Đồ / Kết Quả Quiz | Handle Danh Mục Sapo | URL Trang Website |
| :---- | :---- | :---- |
| Da dầu / Mụn (BHA & Salicylic) | `hoat-chat-bha-salicylic` | `/collections/hoat-chat-bha-salicylic` |
| Kiểm soát bã nhờn / Thu nhỏ lỗ chân lông | `tinh-chat-niacinamide` | `/collections/tinh-chat-niacinamide` |
| Phục hồi hàng rào Lipid (Giai đoạn 2\) | `phuc-hoi-hang-rao-bao-ve-da` | `/collections/phuc-hoi-hang-rao-bao-ve-da` |
| Cấp ẩm / Phục hồi B5 & HA | `duong-am-phuc-hoi-b5-ha` | `/collections/duong-am-phuc-hoi-b5-ha` |
| Làm dịu da nhạy cảm / Đỏ rát (Giai đoạn 1\) | `lam-diu-on-dinh-nen-da` | `/collections/lam-diu-on-dinh-nen-da` |
| Retinoid & Chống lão hóa | `retinol-chong-lao-hoa` | `/collections/retinol-chong-lao-hoa` |
| Sáng da / Mờ thâm nám | `tri-nam-sang-da-tranexamic-vitc` | `/collections/tri-nam-sang-da-tranexamic-vitc` |
| Bảo vệ da / Chống nắng | `kem-chong-nang-pho-rong` | `/collections/kem-chong-nang-pho-rong` |

