# Hướng dẫn tạo bài TRƯỚC & SAU (ca khách hàng)

Mỗi ca khách hàng là **1 bài viết Sapo** trong danh mục bài viết **Trước và sau** (handle `truoc-va-sau`). Một bài nhập xong sẽ
tự hiện ở 3 nơi:

| Nơi hiển thị | Hiện gì |
| :-- | :-- |
| Trang **/truoc-sau-cham-soc-da-tu-xa** — phần "Kết quả của khách hàng" | Ca được gom theo nhóm vấn đề da (tag `nhom:`), có nút ‹ › chuyển ca, link "Xem chi tiết ca". Ca đầu tiên còn làm ảnh hero nếu chưa cài ảnh hero riêng. |
| **Trang chi tiết ca** `/<đường dẫn bài>` trên Sapo (bản dev: `/blogs/truoc-va-sau/<đường dẫn bài>`) (giao diện `article.truoc-va-sau`) | Nhóm · tiêu đề (H1) · tóm tắt · bảng thông tin ca · cặp ảnh TRƯỚC/SAU · nội dung câu chuyện · ca khác cùng nhóm · khối CTA |
| Trang **liệu trình** (sản phẩm giao diện `product.lieu-trinh`) — phần "Trước – sau" | Chỉ khi bài có tag `lieutrinh:<alias sản phẩm>` (tối đa 4 ca/trang) |

> **Chỉ đăng ca thật**, đã được khách đồng ý công bố. Ảnh trước và sau phải cùng góc chụp, cùng ánh sáng và không chỉnh sửa.
> Không dùng ảnh của hãng hoặc ảnh của liệu trình khác làm kết quả. Phần nào chưa có dữ liệu thì để trống, trang sẽ tự ẩn phần đó.

---

## 1. Chuẩn bị (chỉ làm 1 lần)

**Thực tế trên Sapo (đối soát 17/10/2026):**

| Thành phần | Trên Sapo | Trạng thái |
| :-- | :-- | :-- |
| Trang giới thiệu Trước & Sau | Trang nội dung alias **`truoc-sau-cham-soc-da-tu-xa`**, giao diện `page.clinical-proof` → `/truoc-sau-cham-soc-da-tu-xa` | Đã có. **Không có** đường dẫn `/clinical-proof` trên Sapo (chỉ là tên route ở bản dev). |
| Danh mục bài viết ca | **Trước và sau**, handle `truoc-va-sau` | Đã có, **0 bài** ⇒ phần "Kết quả của khách hàng" trống |
| Ảnh hero TRƯỚC/SAU | Cấu hình theme › Trang Trước & Sau › Hero — ảnh TRƯỚC / ảnh SAU | Trống ⇒ hero lấy cặp ảnh của ca đầu tiên; chưa có ca ⇒ hero chỉ còn chữ |

Ảnh trên bản dev (localhost/Vercel) chỉ là ô giữ chỗ "[ẢNH TRƯỚC] / [ẢNH SAU]" của dữ liệu mẫu — theme **không** đưa
ảnh nào lên Sapo. Ảnh thật phải nhập theo mục 2.

1. **Website › Bài viết › Danh mục bài viết**: đã có danh mục **Trước và sau**, đường dẫn `truoc-va-sau`.
   Nếu dùng đường dẫn khác thì chọn lại ở **Cấu hình theme › Trang Trước & Sau (/truoc-sau-cham-soc-da-tu-xa) › Blog ca điều trị**.
2. Ảnh hero (tuỳ chọn): **Cấu hình theme › Trang Trước & Sau** › **Hero — ảnh TRƯỚC** + **Hero — ảnh SAU** (phải đủ cả
   hai; thiếu một ⇒ dùng ca đầu tiên). Ảnh khách thật đã đồng ý công bố, vuông 1:1.
3. Ô **Chi tiết ca — link nút quay lại** phải là `/truoc-sau-cham-soc-da-tu-xa` (bản cũ mặc định `/clinical-proof` ⇒ 404).
4. Trong cùng mục cấu hình đó, có thể sửa chữ dùng chung: tiêu đề phần kết quả, ghi chú dưới kết quả, nút Zalo,
   nhãn link **"Xem chi tiết ca"** (để trống thì ẩn link), và các nhãn của trang chi tiết (`Chi tiết ca — …`):
   nút quay lại và link của nút, tiêu đề phần nội dung, tiêu đề "Ca khác cùng nhóm", nhãn Tuổi / Tỉnh/thành /
   Thời gian theo dõi / Phác đồ / Liệu trình / Chuyên gia phụ trách.

## 2. Thêm mới 1 ca: Website › Bài viết › Đăng bài viết mới

Nhập lần lượt các ô trên màn hình **Đăng bài viết mới**:

| Ô trên Sapo | Nhập | Hiện ở đâu |
| :-- | :-- | :-- |
| **Tiêu đề** | Tên ca ngắn gọn, nêu vấn đề và thời gian. Ví dụ: *Hành trình 8 tuần cải thiện da mụn viêm* | Tiêu đề trang chi tiết (H1), alt của ảnh, thẻ "Ca khác cùng nhóm" |
| **Nội dung bài viết** | **Ảnh 1 = TRƯỚC, ảnh 2 = SAU** (xem 2.1), sau đó là câu chuyện của ca | Khung so sánh TRƯỚC/SAU và phần "Hành trình chăm sóc da" |
| **Tóm tắt** (bấm "Thêm tóm tắt") | 1–2 câu tóm tắt ca: tình trạng ban đầu, phác đồ và kết quả ghi nhận | Đoạn dưới H1 trang chi tiết, mô tả SEO/JSON-LD |
| **Xem trước kết quả tìm kiếm** (Tùy chỉnh SEO) | Tiêu đề ≤ 60 ký tự, mô tả ≤ 160 ký tự, đường dẫn ngắn không dấu | Google |
| **Trạng thái** | **Hiển thị** (hoặc Đặt lịch hiển thị) | Chọn **Ẩn** thì ca không hiện ở cả 3 nơi |
| **Ảnh bài viết** | Ảnh đại diện: ảnh SAU hoặc ảnh ghép trước/sau, tỉ lệ 1:1 | Danh sách bài của blog, ảnh chia sẻ Facebook/Zalo. Không dùng làm khung so sánh. |
| **Tác giả** | Chuyên gia phụ trách ca | Dòng "Chuyên gia phụ trách" trên trang chi tiết |
| **Danh mục** | **Trước và sau** (bắt buộc) | Bài ở danh mục khác sẽ không được trang đọc |
| **Tag** | Các tag dạng `khoá:giá trị` (xem 2.2) | Nhóm, bảng thông tin ca, liên kết liệu trình |
| **Khung giao diện** | **`article.truoc-va-sau`** (bắt buộc) | Nếu để `article`, trang chi tiết hiện như bài tin tức thường |

### 2.1. Chèn ảnh trước/sau vào nội dung

1. Đặt con trỏ ở **đầu** ô Nội dung, bấm biểu tượng **Chèn ảnh** trên thanh công cụ và tải **ảnh TRƯỚC** lên.
2. Xuống dòng, chèn tiếp **ảnh SAU**.
3. Xuống dòng và viết câu chuyện của ca (xem gợi ý 2.3).

Theme tự lấy **2 ảnh đầu tiên** trong nội dung làm cặp TRƯỚC/SAU, rồi gỡ 2 ảnh này khỏi phần nội dung để ảnh không bị lặp.
Ảnh thứ 3 trở đi (ví dụ ảnh tuần 4) vẫn hiện trong phần nội dung.

- Ảnh vuông 1:1, tối thiểu 800×800 px, định dạng JPG/WebP, dung lượng dưới 300 KB.
- Ca chưa đủ 2 ảnh thì **không** hiện ở trang Trước & Sau và trang liệu trình. Trang chi tiết vẫn mở được nhưng không có khung so sánh.
- Cách cũ vẫn dùng được: tag `anhtruoc:<link ảnh>` + `anhsau:<link ảnh>`. Khi có cả 2 tag này, theme ưu tiên tag thay vì ảnh trong nội dung.

### 2.2. Tag

Gõ từng tag rồi bấm Enter. Giá trị **không được chứa dấu phẩy**, vì Sapo tách tag theo dấu phẩy; thay dấu phẩy bằng "–" hoặc "và".
Tag thiếu thì dòng tương ứng tự ẩn.

| Tag | Ý nghĩa | Ví dụ |
| :-- | :-- | :-- |
| `nhom:` | Nhóm vấn đề da: gom ca trên trang Trước & Sau, làm nhãn trên H1 và chọn "Ca khác cùng nhóm". Mọi ca cùng nhóm phải viết **giống hệt nhau**. Không có tag này thì ca vào nhóm "Kết quả khác". | `nhom:Mụn` · `nhom:Thâm – nám – tăng sắc tố` · `nhom:Đỏ da – nhạy cảm` |
| `tuoi:` | Tuổi khách (chỉ ghi số) | `tuoi:24` |
| `tinh:` | Tỉnh/thành | `tinh:Hà Nội` |
| `tuan:` | Số tuần theo dõi (chỉ ghi số, chữ "tuần" tự thêm) | `tuan:8` |
| `phacdo:` | Phác đồ hoặc hoạt chất chính | `phacdo:BHA + Niacinamide` |
| `lieutrinh:` | Alias **sản phẩm liệu trình**, giúp ca hiện ở trang liệu trình đó và hiện link "Liệu trình" trên trang chi tiết. Có thể gắn nhiều tag. | `lieutrinh:elaine-brennan-getglowing-micro-peel-…` |

Thứ tự nhóm trên trang Trước & Sau theo thứ tự bài mới nhất. Mỗi trang đọc tối đa 50 bài mới nhất của danh mục.

### 2.3. Gợi ý nội dung câu chuyện

Dùng Heading 2/3, chữ đậm và gạch đầu dòng. Không chỉnh cỡ chữ hoặc màu chữ bằng tay. Gợi ý các mục:

1. **Tình trạng ban đầu**: loại da, vấn đề chính, những gì khách đã dùng trước đó.
2. **Phác đồ**: các giai đoạn, sản phẩm/hoạt chất, buổi trị liệu (nếu có).
3. **Diễn tiến**: các mốc tuần 2, 4, 8… (có thể chèn thêm ảnh mốc từ ảnh thứ 3 trở đi).
4. **Kết quả và lưu ý**: viết đúng những gì đã ghi nhận được, không hứa hẹn kết quả. Danh xưng dùng "Chuyên gia", không dùng "Bác sĩ".

---

## 3. Ví dụ hoàn chỉnh

- **Tiêu đề**: `Hành trình 8 tuần cải thiện da mụn viêm`
- **Nội dung**: [ảnh trước] · [ảnh sau] · *Tình trạng ban đầu… Phác đồ… Diễn tiến…*
- **Tóm tắt**: `Khách hàng nữ 24 tuổi, da mụn viêm mức độ trung bình, theo dõi 8 tuần với phác đồ BHA + Niacinamide.`
- **Tác giả**: `Chuyên gia Thanh Hằng` · **Danh mục**: `Trước và sau` · **Khung giao diện**: `article.truoc-va-sau`
- **Tag**: `nhom:Mụn`, `tuoi:24`, `tinh:Hà Nội`, `tuan:8`, `phacdo:BHA + Niacinamide`

## 4. Kiểm tra trước khi công bố (laptop + điện thoại)

1. Mở **/truoc-sau-cham-soc-da-tu-xa** (Sapo; bản dev là `/clinical-proof`): ca nằm đúng nhóm, ảnh TRƯỚC bên trái và SAU bên phải, số "Case x / y" đúng, link "Xem chi tiết ca" mở được.
2. Mở trang chi tiết ca: có 1 tiêu đề H1, bảng thông tin đúng, phần nội dung không lặp lại 2 ảnh trước/sau, nút Zalo mở đúng số.
3. Nếu có tag `lieutrinh:`: mở trang liệu trình đó và kiểm tra phần "Trước – sau".
4. Dev: `npm run preview`, sau đó chạy
   `AUDIT_PAGES="/clinical-proof,/blogs/truoc-va-sau/<đường dẫn bài>" npm run audit:ui` (route bản dev)
   (Git Bash thêm `MSYS_NO_PATHCONV=1`). Kết quả cần 0 lỗi ở 1440px và 390px.
