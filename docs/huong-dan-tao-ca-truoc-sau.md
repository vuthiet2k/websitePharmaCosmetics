# Hướng dẫn tạo bài TRƯỚC & SAU (ca khách hàng)

Mỗi ca khách hàng là **1 bài viết Sapo** trong danh mục bài viết **Trước & Sau** (handle **`truoc-va-sau`**; 13/11/2026 đổi từ `truoc-va-sau-1`). Một bài nhập xong sẽ
tự hiện ở các nơi sau:

| Nơi hiển thị | Hiện gì |
| :-- | :-- |
| Trang **/truoc-sau-cham-soc-da-tu-xa** — phần "Kết quả của khách hàng" | Thanh **tab lọc** theo nhóm vấn đề da (tự sinh từ tag `nhom:`; "Kết quả khác" luôn cuối) + **lưới thẻ theo nhóm** (2 cột, điện thoại 1 cột), **4 thẻ / trang** có phân trang. Mỗi thẻ: tên nhóm + "Case x / n", ảnh, nút ‹ › + chấm (vuốt trên điện thoại) để chuyển ca, dòng mô tả ngắn (tuổi · tỉnh · theo dõi n tuần / Phác đồ) và nút **Tư vấn phác đồ qua Zalo**. Ca có cặp ảnh đánh dấu ⇒ 2 ảnh TRƯỚC/SAU có nhãn; ca không đánh dấu ⇒ **mỗi ảnh 1 slide nguyên khung** (xem 2.1). Thẻ không link sang bài chi tiết. |
| **Trang chi tiết ca** `/<đường dẫn bài>` trên Sapo (bản dev: `/blogs/truoc-va-sau/<đường dẫn bài>`) (giao diện `article.truoc-va-sau`) | Khung **bài viết blog** như mọi bài khác. Cột chính: thẻ đầu bài (nhãn nhóm · H1 · chuyên gia · ngày/tỉnh · tóm tắt · hồ sơ ca 4 ô) → ảnh TRƯỚC/SAU 50/50 có nhãn tuần → nhận định chuyên gia → lộ trình diễn tiến → câu chuyện. Sidebar: đặt lịch + hotline + Zalo → liệu trình & sản phẩm đồng hành → ca khác cùng nhóm. Mobile: sidebar xuống dưới + thanh đặt lịch bám đáy |
| Trang **liệu trình** (sản phẩm giao diện `product.lieu-trinh`) — phần "Trước – sau" | Chỉ khi bài có tag `lieutrinh:<alias sản phẩm>` (tối đa 8 ca, trình chiếu ‹ ›) |
| **Trang chủ** — mục "Kết quả thực tế · Hành trình da của khách hàng" | Chỉ khi bài có tag **`ghim-trang-chu`** và đủ ảnh trước/sau (tối đa **3 bài mới nhất**). Tab = `nhom:` (trống ⇒ tiêu đề) – `khach:`; panel = ảnh TRƯỚC/SAU · tiêu đề · dòng khách (`khach:`, `tuoi:`, `tinh:` · Tác giả) · Tình trạng ban đầu (`tinhtrang:`, trống ⇒ `nhom:`) · Hành trình (danh sách số đầu tiên trong Nội dung, trống ⇒ Tóm tắt) · Sản phẩm sử dụng (`phacdo:`) · Thời gian theo dõi (`tuan:`) · link "Xem chi tiết ca". Đổi tag ghim: Cấu hình theme › Trước & Sau (Testimonials) › **Hành trình da — Tag ghim ca lên trang chủ**. Không bài nào được ghim ⇒ trang chủ dùng Thẻ 1–3 nhập tay như trước |

> **Chỉ đăng ca thật**, đã được khách đồng ý công bố. Ảnh trước và sau phải cùng góc chụp, cùng ánh sáng và không chỉnh sửa.
> Không dùng ảnh của hãng hoặc ảnh của liệu trình khác làm kết quả. Phần nào chưa có dữ liệu thì để trống, trang sẽ tự ẩn phần đó.

---

> **Cách nhanh (13/11/2026): gán giao diện cho danh mục, không cần Trang nội dung.** Website › Bài viết › Danh mục bài viết › **Trước & Sau** › ô **Giao diện** chọn **`blog.truoc-va-sau`**. Khi đó `/truoc-va-sau` hiện luôn trang Trước & Sau (hero, các bước, kết quả theo nhóm); ca = các bài trong danh mục này. Cùng cách đó với danh mục **Video** (`/video`) → giao diện **`blog.video`**. Trang tin tức tổng vẫn là Trang nội dung riêng, không đổi.

## 1. Chuẩn bị (chỉ làm 1 lần)

**Thực tế trên Sapo (đối soát 17/10/2026):**

| Thành phần | Trên Sapo | Trạng thái |
| :-- | :-- | :-- |
| Trang giới thiệu Trước & Sau | Trang nội dung alias **`truoc-sau-cham-soc-da-tu-xa`**, giao diện `page.clinical-proof` → `/truoc-sau-cham-soc-da-tu-xa` | Đã có. **Không có** đường dẫn `/clinical-proof` trên Sapo (chỉ là tên route ở bản dev). |
| Danh mục bài viết ca | **Trước & Sau**, handle **`truoc-va-sau`** (`/truoc-va-sau` là Trang nội dung "Trước và sau", không phải danh mục) | Có 1 bài "[DEMO] Hành trình 8 tuần…" — gỡ/ẩn trước khi công bố. Ô **Blog ca điều trị** phải chọn danh mục này |
| Ảnh / video hero | **Ô Mô tả của danh mục bài viết Trước & Sau** (Website › Bài viết › Danh mục bài viết › Trước & Sau): có nhúng video (iframe YouTube…) ⇒ hero là video; không có video, có ảnh ⇒ ảnh đầu tiên (1 ảnh, nguyên khung) | Mô tả không có ảnh/video ⇒ dùng cặp ảnh Cấu hình theme › Trang Trước & Sau › Hero (nếu đủ 2 ảnh) ⇒ ca đầu tiên; chưa có ca ⇒ hero chỉ còn chữ |

Ảnh trên bản dev (localhost/Vercel) chỉ là ô giữ chỗ "[ẢNH TRƯỚC] / [ẢNH SAU]" của dữ liệu mẫu — theme **không** đưa
ảnh nào lên Sapo. Ảnh thật phải nhập theo mục 2.

1. **Website › Bài viết › Danh mục bài viết**: đã có danh mục **Trước & Sau**, đường dẫn `truoc-va-sau`.
   Nếu dùng đường dẫn khác thì chọn lại ở **Cấu hình theme › Trang Trước & Sau (/truoc-sau-cham-soc-da-tu-xa) › Blog ca điều trị**.
2. Ảnh / video hero (12/11/2026): mở danh mục bài viết **Trước & Sau**, trong ô **Mô tả** chèn **1 ảnh** (nút Chèn ảnh)
   hoặc **nhúng 1 video** (nút Mã HTML › dán mã `<iframe>` của YouTube). Có video thì ưu tiên video. Ô Mô tả trống ảnh/video
   ⇒ dùng **Cấu hình theme › Trang Trước & Sau › Hero — ảnh TRƯỚC + ảnh SAU** (đủ cả hai) ⇒ ca đầu tiên.
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
| **Nội dung bài viết** | Ảnh của ca (xem 2.1), sau đó là câu chuyện của ca | Thẻ ca ở trang Trước & Sau, khung so sánh trang chi tiết và phần "Hành trình chăm sóc da" |
| **Tóm tắt** (bấm "Thêm tóm tắt") | 1–2 câu tóm tắt ca: tình trạng ban đầu, phác đồ và kết quả ghi nhận | Đoạn dưới H1 trang chi tiết, mô tả SEO/JSON-LD |
| **Xem trước kết quả tìm kiếm** (Tùy chỉnh SEO) | Tiêu đề ≤ 60 ký tự, mô tả ≤ 160 ký tự, đường dẫn ngắn không dấu | Google |
| **Trạng thái** | **Hiển thị** (hoặc Đặt lịch hiển thị) | Chọn **Ẩn** thì ca không hiện ở cả 3 nơi |
| **Ảnh bài viết** | Ảnh đại diện: thường là ảnh ghép trước–sau | Danh sách bài, ảnh chia sẻ Facebook/Zalo. Ca **không đánh dấu** trước/sau (2.1 cách A) ⇒ ảnh đại diện là slide đầu tiên của ca trên trang Trước & Sau |
| **Tác giả** | Chuyên gia phụ trách ca | Dòng "Chuyên gia phụ trách" trên trang chi tiết |
| **Danh mục** | **Trước & Sau** (`truoc-va-sau`, bắt buộc) | Bài ở danh mục khác sẽ không được trang đọc |
| **Tag** | Các tag dạng `khoá:giá trị` (xem 2.2) | Nhóm, bảng thông tin ca, liên kết liệu trình |
| **Khung giao diện** | **`article.truoc-va-sau`** (bắt buộc) | Nếu để `article`, trang chi tiết hiện như bài tin tức thường |

### 2.1. Ảnh của ca (cập nhật 12/11/2026)

Có 2 cách — chọn 1:

**Cách A — đơn giản (khuyên dùng): 1 ảnh, không cần đánh dấu.** Tải ảnh đại diện (thường là **ảnh ghép trước–sau** đã
dựng sẵn) và chèn thêm ảnh vào Nội dung nếu muốn. Trên trang Trước & Sau, **mỗi ảnh là 1 slide nguyên khung** (ảnh đại
diện trước, rồi các ảnh trong Nội dung theo thứ tự), không gắn nhãn TRƯỚC/SAU, không cắt. Theme **không tự đoán** ảnh nào
là trước hay sau — tải ảnh bình thường thì không thể chia đúng.

**Cách B — cặp TRƯỚC/SAU có đánh dấu.** Chèn 2 ảnh vào Nội dung và điền **Mô tả ảnh** (alt, trong hộp Chèn ảnh) cho từng ảnh:
ảnh trước có chữ **"trước"** (vd `Ảnh trước`), ảnh sau có chữ **"sau"** (vd `Ảnh sau`). Theme dựng khung so sánh TRƯỚC/SAU
có nhãn và gỡ 2 ảnh này khỏi phần nội dung để không lặp. Mô tả ảnh chứa cả "trước" lẫn "sau" ⇒ coi là ảnh ghép (cách A).
Cách cũ vẫn dùng được: tag `anhtruoc:<link ảnh>` + `anhsau:<link ảnh>` (ưu tiên hơn ảnh trong nội dung).

- Ảnh tối thiểu 800 px cạnh ngắn, JPG/WebP, dưới 300 KB.
- Ca không có ảnh nào ⇒ không hiện ở trang Trước & Sau.
- **Trang chủ** (mục Hành trình da) và **trang liệu trình** chỉ hiện ca **cách B** (cần cặp TRƯỚC/SAU); ca cách A chỉ hiện ở
  trang Trước & Sau và trang chi tiết (ảnh nằm trong phần nội dung).

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
| `ghim-trang-chu` | (tag thường, không có dấu `:`) Đưa ca lên mục "Hành trình da của khách hàng" ở trang chủ — tối đa 3 bài mới nhất có tag này | `ghim-trang-chu` |
| `khach:` | Tên/danh xưng khách **đã đồng ý công bố**, hiện trên tab và dòng khách ở trang chủ (trống ⇒ ẩn) | `khach:Chị Lan` |
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

Bản dev có sẵn ca mẫu này đủ 6 khối: `/blogs/truoc-va-sau/hanh-trinh-8-tuan-cai-thien-da-mun-viem`.

## 4. Kiểm tra trước khi công bố (laptop + điện thoại)

1. Mở **/truoc-sau-cham-soc-da-tu-xa** (Sapo; bản dev là `/clinical-proof`): ca nằm đúng nhóm, ảnh TRƯỚC bên trái và SAU bên phải, số "Case x / y" đúng, link "Xem chi tiết ca" mở được.
2. Mở trang chi tiết ca: có 1 tiêu đề H1, hồ sơ ca 4 ô đúng, nhãn tuần trên ảnh đúng, nhận định chuyên gia + lộ trình không lặp lại trong phần câu chuyện, thẻ liệu trình/sản phẩm mở đúng trang, nút đặt lịch + hotline đúng số; điện thoại: cuộn xuống thấy thanh "Đặt lịch tư vấn 1:1" bám đáy.
3. Nếu có tag `lieutrinh:`: mở trang liệu trình đó và kiểm tra phần "Trước – sau".
4. Dev: `npm run preview`, sau đó chạy
   `AUDIT_PAGES="/clinical-proof,/blogs/truoc-va-sau/<đường dẫn bài>" npm run audit:ui` (route bản dev)
   (Git Bash thêm `MSYS_NO_PATHCONV=1`). Kết quả cần 0 lỗi ở 1440px và 390px.
