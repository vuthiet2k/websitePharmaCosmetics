# Hướng dẫn tạo bài TRƯỚC & SAU (ca khách hàng)

Mỗi ca khách hàng là **1 bài viết Sapo** trong danh mục bài viết **Trước & Sau** (handle **`truoc-va-sau-1`** — alias `truoc-va-sau` đã thuộc một Trang nội dung). Một bài nhập xong sẽ
tự hiện ở 3 nơi:

| Nơi hiển thị | Hiện gì |
| :-- | :-- |
| Trang **/truoc-sau-cham-soc-da-tu-xa** — phần "Kết quả của khách hàng" | Thanh **nav tab lọc** (gạch chân) theo nhóm vấn đề da (tự sinh từ các giá trị tag `nhom:` đang có ca; "Kết quả khác" luôn cuối) + **khung trình chiếu 1 ca/lần**: cặp ảnh TRƯỚC (trái) / SAU (phải) full ngang tỉ lệ 4:3, không nhãn đè trên ảnh, nút ‹ › + chấm, vuốt trên điện thoại. Chữ (tiêu đề · Tóm tắt · tuổi · số tuần · "Xem chi tiết ca") chỉ trượt lên khi rê chuột vào ảnh; điện thoại hiện sẵn dưới ảnh. Bấm vào ca mở trang chi tiết. Ca đầu tiên còn làm ảnh hero nếu chưa cài ảnh hero riêng. |
| **Trang chi tiết ca** `/<đường dẫn bài>` trên Sapo (bản dev: `/blogs/truoc-va-sau-1/<đường dẫn bài>`) (giao diện `article.truoc-va-sau`) | Khung **bài viết blog** như mọi bài khác. Cột chính: thẻ đầu bài (nhãn nhóm · H1 · chuyên gia · ngày/tỉnh · tóm tắt · hồ sơ ca 4 ô) → ảnh TRƯỚC/SAU 50/50 có nhãn tuần → nhận định chuyên gia → lộ trình diễn tiến → câu chuyện. Sidebar: đặt lịch + hotline + Zalo → liệu trình & sản phẩm đồng hành → ca khác cùng nhóm. Mobile: sidebar xuống dưới + thanh đặt lịch bám đáy |
| Trang **liệu trình** (sản phẩm giao diện `product.lieu-trinh`) — phần "Trước – sau" | Chỉ khi bài có tag `lieutrinh:<alias sản phẩm>` (tối đa 4 ca/trang) |

> **Chỉ đăng ca thật**, đã được khách đồng ý công bố. Ảnh trước và sau phải cùng góc chụp, cùng ánh sáng và không chỉnh sửa.
> Không dùng ảnh của hãng hoặc ảnh của liệu trình khác làm kết quả. Phần nào chưa có dữ liệu thì để trống, trang sẽ tự ẩn phần đó.

---

## 1. Chuẩn bị (chỉ làm 1 lần)

**Thực tế trên Sapo (đối soát 17/10/2026):**

| Thành phần | Trên Sapo | Trạng thái |
| :-- | :-- | :-- |
| Trang giới thiệu Trước & Sau | Trang nội dung alias **`truoc-sau-cham-soc-da-tu-xa`**, giao diện `page.clinical-proof` → `/truoc-sau-cham-soc-da-tu-xa` | Đã có. **Không có** đường dẫn `/clinical-proof` trên Sapo (chỉ là tên route ở bản dev). |
| Danh mục bài viết ca | **Trước & Sau**, handle **`truoc-va-sau-1`** (`/truoc-va-sau` là Trang nội dung "Trước và sau", không phải danh mục) | Có 1 bài "[DEMO] Hành trình 8 tuần…" — gỡ/ẩn trước khi công bố. Ô **Blog ca điều trị** phải chọn danh mục này |
| Ảnh hero TRƯỚC/SAU | Cấu hình theme › Trang Trước & Sau › Hero — ảnh TRƯỚC / ảnh SAU | Trống ⇒ hero lấy cặp ảnh của ca đầu tiên; chưa có ca ⇒ hero chỉ còn chữ |

Ảnh trên bản dev (localhost/Vercel) chỉ là ô giữ chỗ "[ẢNH TRƯỚC] / [ẢNH SAU]" của dữ liệu mẫu — theme **không** đưa
ảnh nào lên Sapo. Ảnh thật phải nhập theo mục 2.

1. **Website › Bài viết › Danh mục bài viết**: đã có danh mục **Trước & Sau**, đường dẫn `truoc-va-sau-1`.
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
| **Danh mục** | **Trước & Sau** (`truoc-va-sau-1`, bắt buộc) | Bài ở danh mục khác sẽ không được trang đọc |
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
| `lieutrinh:` | Alias **sản phẩm liệu trình**: ca hiện ở trang liệu trình đó, hiện thẻ ở khối "Phác đồ & sản phẩm đồng hành", nút đặt lịch tự chọn sẵn liệu trình. Có thể gắn nhiều tag. | `lieutrinh:elaine-brennan-getglowing-micro-peel-…` |
| `tinhtrang:` | Ô "Tình trạng ban đầu" của hồ sơ ca (không có thì dùng `nhom:`) | `tinhtrang:Mụn viêm và bít tắc` |
| `sanpham:` | Alias **sản phẩm** dùng trong phác đồ — thẻ ở khối "Phác đồ & sản phẩm đồng hành" (tối đa 4 thẻ cùng `lieutrinh:`). Lặp được. | `sanpham:toner-niacinamide-5-zinc` |
| `chupanh:` | Ghi chú cách chụp ảnh, hiện dưới cặp ảnh (chỉ ghi điều **đúng thật** với ca này) | `chupanh:Ảnh chụp bằng máy soi da OBSERV 520x – không chỉnh sửa` |
| `nhantruoc:` / `nhansau:` | Ghi đè nhãn trên ảnh (mặc định "Tuần 0 · Trước điều trị" / "Tuần <tuan> · Sau điều trị") | `nhansau:Tuần 8 · Sạch nhân mụn` |

Thứ tự nhóm trên trang Trước & Sau theo thứ tự bài mới nhất. Mỗi trang đọc tối đa 50 bài mới nhất của danh mục.

### 2.3. Hai phần đặc biệt trong Nội dung (trình soạn thảo Sapo)

| Nhập trong Nội dung | Nút trên thanh công cụ | Trang hiện thành |
| :-- | :-- | :-- |
| Đoạn **Trích dẫn** đầu tiên — nhận định/kết luận của chuyên gia (2–3 câu) | Trích dẫn (dấu ") | Khung "Nhận định của chuyên gia" ngay dưới tiêu đề, kèm tên Tác giả |
| **Danh sách đánh số** đầu tiên — mỗi dòng `Nhãn: mô tả`, vd `Giai đoạn 1 (Tuần 1–2): Làm dịu, kháng viêm…` | Danh sách số (1. 2. 3.) | Khối "Lộ trình diễn tiến" (thẻ đánh số; mobile thành dòng thời gian) |

Hai phần này được tách khỏi phần câu chuyện (không lặp). Không có thì khối tương ứng tự ẩn.

### 2.4. Gợi ý nội dung câu chuyện

Dùng Heading 2/3, chữ đậm và gạch đầu dòng. Không chỉnh cỡ chữ hoặc màu chữ bằng tay. Gợi ý các mục:

1. **Tình trạng ban đầu**: loại da, vấn đề chính, những gì khách đã dùng trước đó.
2. **Phác đồ**: các giai đoạn, sản phẩm/hoạt chất, buổi trị liệu (nếu có).
3. **Diễn tiến**: các mốc tuần 2, 4, 8… (có thể chèn thêm ảnh mốc từ ảnh thứ 3 trở đi).
4. **Kết quả và lưu ý**: viết đúng những gì đã ghi nhận được, không hứa hẹn kết quả. Danh xưng dùng "Chuyên gia", không dùng "Bác sĩ".

---

## 3. Ví dụ hoàn chỉnh

- **Tiêu đề**: `Hành trình 8 tuần cải thiện da mụn viêm`
- **Nội dung** (theo thứ tự):
  1. [ảnh trước] · [ảnh sau]
  2. *Trích dẫn*: `Da dầu mụn viêm cần làm dịu và phục hồi hàng rào bảo vệ trước, sau đó mới đưa hoạt chất điều trị vào. Tuân thủ chống nắng và tái khám đúng hẹn là yếu tố quyết định kết quả ổn định.`
  3. *Danh sách đánh số*:
     `Giai đoạn 1 (Tuần 1–2): Làm dịu, kháng viêm và phục hồi hàng rào bảo vệ da.`
     `Giai đoạn 2 (Tuần 3–4): Peel nhẹ tại spa, thông thoáng nang lông và gom cồi mụn.`
     `Giai đoạn 3 (Tuần 5–8): BHA 2% và Niacinamide 10% duy trì, cấp ẩm phục hồi, mờ thâm sau viêm.`
  4. Heading 2 *Tình trạng ban đầu* + đoạn văn · Heading 2 *Diễn tiến* + đoạn văn (+ ảnh mốc) · Heading 2 *Lưu ý* + đoạn văn
- **Tóm tắt**: `Khách hàng nữ 24 tuổi, da dầu mụn viêm mức độ trung bình. Phác đồ 2 giai đoạn: phục hồi hàng rào da rồi kết hợp BHA và Niacinamide; nền da thông thoáng, giảm viêm rõ sau 8 tuần.`
- **Tác giả**: `Chuyên gia Thanh Hằng` · **Danh mục**: `Trước & Sau` · **Khung giao diện**: `article.truoc-va-sau`
- **Tag**: `nhom:Mụn`, `tuoi:24`, `tinh:Hà Nội`, `tuan:8`, `phacdo:BHA + Niacinamide`, `tinhtrang:Mụn viêm và bít tắc`,
  `chupanh:Ảnh chụp cùng góc và ánh sáng – không chỉnh sửa`, `lieutrinh:<alias liệu trình>`, `sanpham:<alias sản phẩm>`

Bản dev có sẵn ca mẫu này đủ 6 khối: `/blogs/truoc-va-sau-1/hanh-trinh-8-tuan-cai-thien-da-mun-viem`.

## 4. Kiểm tra trước khi công bố (laptop + điện thoại)

1. Mở **/truoc-sau-cham-soc-da-tu-xa** (Sapo; bản dev là `/clinical-proof`): ca nằm đúng nhóm, ảnh TRƯỚC bên trái và SAU bên phải, số "Case x / y" đúng, link "Xem chi tiết ca" mở được.
2. Mở trang chi tiết ca: có 1 tiêu đề H1, hồ sơ ca 4 ô đúng, nhãn tuần trên ảnh đúng, nhận định chuyên gia + lộ trình không lặp lại trong phần câu chuyện, thẻ liệu trình/sản phẩm mở đúng trang, nút đặt lịch + hotline đúng số; điện thoại: cuộn xuống thấy thanh "Đặt lịch tư vấn 1:1" bám đáy.
3. Nếu có tag `lieutrinh:`: mở trang liệu trình đó và kiểm tra phần "Trước – sau".
4. Dev: `npm run preview`, sau đó chạy
   `AUDIT_PAGES="/clinical-proof,/blogs/truoc-va-sau-1/<đường dẫn bài>" npm run audit:ui` (route bản dev)
   (Git Bash thêm `MSYS_NO_PATHCONV=1`). Kết quả cần 0 lỗi ở 1440px và 390px.
