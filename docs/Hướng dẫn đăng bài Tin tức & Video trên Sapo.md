# ĐĂNG BÀI TIN TỨC & VIDEO (YOUTUBE / FACEBOOK) TRÊN SAPO — HƯỚNG DẪN

Ngày lập: 14/10/2026 · Áp dụng cho theme Pharma Cosmetics (nhánh `hugo-theme-sept2026`)

> Bảng quản lý kèm theo: `exports/quan-ly-blog.xlsx` (tạo lại bằng `npm run sheet:blog`). Sheet "Bài viết" tự ghép
> sẵn ô **"Tag dán vào Sapo"**: điền các cột nền vàng rồi chép nguyên ô đó dán vào ô Tag của bài.

Mục lục: 1. Tổng quan · 2. Tạo danh mục Video · 3. Lấy link video YouTube · 4. Lấy link video Facebook ·
5. Tạo bài video (từng bước) · 6. Gắn video vào bài thường · 7. Tin nổi bật · 8. Tin mới nhất · 9. Quy ước tag ·
10. Kiểm tra & lỗi thường gặp

---

## 1. Tổng quan

| Trang trên web | Là gì trên Sapo | Giao diện phải chọn |
| :-- | :-- | :-- |
| `/tin-tuc` — trang tổng Tin tức & Kiến thức | Danh mục bài viết `tin-tuc` (hoặc Trang nội dung alias `tin-tuc`) | `blog` (mặc định) / `page.tin-tuc` |
| `/bi-quyet`, `/y-kien-chuyen-gia`… — 1 danh mục | Danh mục bài viết | `blog` (mặc định) |
| `/video` — kênh video | Danh mục bài viết handle **`video`** | **`blog.video`** |
| Trang xem 1 video | Bài viết trong danh mục `video` | **`article.video`** |
| Bài viết thường có video kèm | Bài viết trong danh mục bất kỳ | `article` (mặc định) |

Mọi cấu hình nói tới trong tài liệu nằm ở **Sapo Admin › Website › Giao diện › Tuỳ chỉnh › Blog & Bài viết**.

## 2. Tạo danh mục Video (chỉ làm 1 lần)

1. Sapo Admin › **Website › Bài viết › Danh mục bài viết › Thêm danh mục**.
2. Tên: `Video Tư Vấn Skincare` (tuỳ ý) · Đường dẫn / alias: **`video`**.
3. Mục **Giao diện**: chọn **`blog.video`** › **Lưu**.
4. Kiểm tra ô **Blog Video** (`video_blog_handle`) ở Tuỳ chỉnh › Blog & Bài viết đang là `video`. Đổi alias danh mục thì
   phải sửa ô này theo, nếu không các khối video trên web trống.
5. Câu chữ của trang kênh (giới thiệu, link kênh YouTube, Fanpage, nút Đăng ký, khối "Đặt lịch tư vấn"…) sửa ở các ô
   bắt đầu bằng "Video" trong cùng nhóm.

## 3. Lấy link / mã video YouTube

Video phải ở chế độ **Công khai** hoặc **Không công khai (Unlisted)** — video **Riêng tư** không phát được trên web.

**Cách 1 — trên máy tính (khuyên dùng):**
1. Mở video trên YouTube.
2. Bấm **Chia sẻ › Sao chép**. Được link dạng `https://youtu.be/4B9RN_wcl_I`.
3. Có thể dán nguyên link, hoặc chỉ lấy **mã 11 ký tự** sau `youtu.be/` (ở ví dụ là `4B9RN_wcl_I`).

**Cách 2 — từ thanh địa chỉ:** link `https://www.youtube.com/watch?v=4B9RN_wcl_I` ⇒ mã là phần sau `v=`
(bỏ phần từ dấu `&` trở đi nếu có, vd `&t=30s`).

**Video Shorts (quay dọc):** link `https://www.youtube.com/shorts/<mã>` — dán nguyên link, và **thêm tag `khung:doc`**
để khung phát dọc.

Lưu ý: mã **phân biệt chữ hoa/thường** (`4B9RN_wcl_I` khác `4b9rn_wcl_i`). Theme nhận các dạng: mã trần,
`watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `/live/`.

## 4. Lấy link video Facebook

Video phải đăng **Công khai** trên Fanpage (video riêng tư / chỉ bạn bè / trong nhóm kín ⇒ khung báo lỗi trên web).

**Cách 1 — Sao chép liên kết (trên máy tính):**
1. Mở Fanpage › **Video** (hoặc Reels) › bấm vào video cần lấy.
2. Bấm **⋯ (Xem thêm)** › **Sao chép liên kết**.
3. Dán link vào trình duyệt, **Enter, đợi trang mở xong rồi chép lại link trên thanh địa chỉ**. Link đúng có dạng:
   - `https://www.facebook.com/pharmacosmeticsxshb/videos/427805549152968`
   - `https://www.facebook.com/watch/?v=427805549152968`
   - `https://www.facebook.com/reel/<số>` (Reels — theme tự dùng khung dọc)

   Link dạng `facebook.com/share/v/...` hoặc `facebook.com/share/r/...` (thường gặp khi bấm Chia sẻ trên điện thoại) là
   link chuyển hướng — **không dùng trực tiếp**, phải mở ra để lấy link thật như trên.

**Cách 2 — Mã nhúng:**
1. Mở video › **⋯** › **Nhúng** › **Sao chép mã**.
2. Dán nguyên đoạn `<iframe ...>` vào **metafield `custom.video_url`** hoặc vào nội dung bài (chế độ HTML) — theme tự
   tách link video.

**Video quay dọc** dùng link `/videos/` hoặc `/watch/` (không phải `/reel/`) ⇒ **thêm tag `khung:doc`**. Không thêm thì
video vẫn hiện đủ nhưng nhỏ trong khung ngang.

## 5. Tạo bài video — từng bước

1. Sapo Admin › **Website › Bài viết › Thêm bài viết**.
2. **Tiêu đề**: tên video (vd `Hướng dẫn sử dụng toner đúng cách`).
3. **Nội dung**: 2–4 câu mô tả video; nên chèn link tới bài viết chi tiết liên quan. Không bắt buộc.
4. **Danh mục bài viết**: chọn **Video**.
5. **Ảnh đại diện**:
   - YouTube: có thể bỏ trống — theme tự lấy ảnh bìa của YouTube.
   - Facebook: **bắt buộc** tải ảnh lên (dùng làm ảnh bìa ở trang `/video`, khối video trang tin tức, video đề xuất).
     Ảnh ngang 16:9, tối thiểu 1280×720.
6. **Tag** — gõ từng tag, cách nhau dấu phẩy:

   | Trường hợp | Tag mẫu |
   | :-- | :-- |
   | YouTube | `youtube:4B9RN_wcl_I, thoiluong:01:23, chude:Làm sạch da` |
   | YouTube Shorts | `youtube:https://www.youtube.com/shorts/<mã>, khung:doc, thoiluong:00:45, chude:Làm sạch da` |
   | Facebook ngang | `facebook:https://www.facebook.com/pharmacosmeticsxshb/videos/<số>, thoiluong:01:16, chude:Chống nắng & trang điểm` |
   | Facebook quay dọc | `facebook:https://www.facebook.com/watch/?v=<số>, khung:doc, thoiluong:01:16, chude:Chống nắng & trang điểm` |
   | Facebook Reels | `facebook:https://www.facebook.com/reel/<số>, thoiluong:00:30, chude:...` |

   - `thoiluong:` ghi đúng dạng `MM:SS` (hiện trên ảnh bìa + SEO). Không biết thì bỏ.
   - `chude:` gõ **giống hệt** giữa các bài cùng chủ đề (để nút lọc ở trang Video gom đúng).
   - Thêm `chuyengia:<handle>` nếu video do chuyên gia trình bày; thêm `noibat` nếu muốn lên Tin nổi bật (mục 7).
7. **Giao diện** (khung bên phải, mục "Giao diện"/"Template"): chọn **`article.video`**.
8. **Hiển thị**: Hiện › **Lưu**.

Không muốn dùng tag nguồn video thì dán link vào **metafield `custom.video_url`**, hoặc dán link / mã nhúng vào nội
dung bài. Theme đọc theo thứ tự: tag › metafield › nội dung.

**Trên web, khách xem thế nào:**
- YouTube: ảnh bìa + nút Play; bấm 1 lần là phát, có âm thanh.
- Facebook: trình phát Facebook hiện sẵn ảnh bìa khi cuộn tới; bấm Play 1 lần là phát, có âm thanh. (Facebook không cho
  trang web tự phát có tiếng — đây là giới hạn của Facebook/trình duyệt, không phải lỗi theme.)

## 6. Gắn video vào bài viết thường (Bí quyết, Tin tức…)

Thêm tag `youtube:<mã>` hoặc `facebook:<link>` vào bài viết thường (giao diện giữ `article` mặc định) ⇒ khối
**"Video hướng dẫn"** hiện trước nội dung bài.

- Nhiều tag video ⇒ **tag đầu = video chính**, các tag sau = danh sách video bổ trợ (bấm để đổi video trong khung).
- Tên video bổ trợ lấy từ bài cùng mã trong danh mục Video ⇒ nên đăng video đó vào danh mục Video trước (mục 5).

## 7. Đưa 1 tin vào "Tin nổi bật" (trang `/tin-tuc`)

1. Mở bài viết cần đưa lên (bài phải thuộc một danh mục có trong ô **Danh mục hiển thị** — hiện là
   `tin-tuc, bi-quyet, y-kien-chuyen-gia`).
2. Ô **Tag**: thêm **`noibat`** › **Lưu**.
3. Gỡ khỏi Tin nổi bật: xoá tag `noibat` khỏi bài.

Cách theme chọn và xếp:
- Lấy bài có tag `noibat`, duyệt **theo thứ tự danh mục** trong ô Danh mục hiển thị (hết bài nổi bật của `tin-tuc` mới
  tới `bi-quyet`…), trong mỗi danh mục bài mới trước.
- Tối đa **9 tin** (`news_featured_count`), mỗi trang **3 tin** (`news_featured_per_page`), có nút ‹ › chuyển trang,
  đánh số 1, 2, 3…
- **Không bài nào có tag `noibat`** ⇒ cột này tự đổi thành các bài mới nhất của danh mục thứ 2 trong danh sách (tiêu đề
  cột = tên danh mục đó).
- Đổi tên tag (vd `hot`) ở ô **Tag đánh dấu tin nổi bật** (`news_featured_tag`); đổi tiêu đề cột ở `news_featured_title`.
- Sapo chỉ trả về cho theme một số bài mới nhất của mỗi danh mục ⇒ bài rất cũ dù có tag `noibat` có thể không được xét.
  Muốn đẩy bài cũ lên, cập nhật lại ngày đăng của bài.

## 8. "Tin mới nhất" được lấy tự động thế nào

Không cần thao tác gì — đăng bài (Hiện) vào một danh mục trong **Danh mục hiển thị** là bài tự lên.

- Theme gom bài của **tất cả danh mục** trong ô Danh mục hiển thị, xếp theo **ngày đăng mới → cũ**.
- **3 bài mới nhất** (`news_lead_count`) chạy trong slider lớn; **6 bài kế tiếp** (`news_grid_count`) ở lưới 2 cột
  bên dưới. Tổng 9 bài.
- Muốn một bài lên đầu: đặt ngày đăng của bài mới nhất. Muốn bài biến mất: chuyển bài sang Ẩn.
- Nút "Tất cả" cạnh tiêu đề mở danh mục đầu tiên có bài.
- Danh mục `video` không nằm trong Danh mục hiển thị ⇒ video không lẫn vào Tin mới nhất; video có khối riêng
  "Video tư vấn" (4 video mới nhất của danh mục Video) bên dưới.

> Lưu ý kỹ thuật (14/10/2026): cách gom "mọi danh mục theo ngày đăng" là thay đổi mới của `snippets/page_tin_tuc_hub.bwt`.
> Bản theme trước đó chỉ lấy bài của **danh mục đầu tiên có bài**. Kiểm tra bản đang chạy trên Sapo trước khi hướng dẫn
> người đăng bài.

"Tin quan tâm của tôi" (dưới Tin nổi bật) = các bài **chính khách đó đã đọc** trên máy của họ — không cần cấu hình;
khách chưa đọc bài nào thì khối ẩn.

## 9. Quy ước tag

| Tag | Ví dụ | Tác dụng |
| :-- | :-- | :-- |
| `youtube:<mã hoặc link>` | `youtube:4B9RN_wcl_I` | Nguồn video YouTube. |
| `facebook:<link video>` | `facebook:https://www.facebook.com/watch/?v=427805549152968` | Nguồn video Facebook. |
| `khung:doc` | `khung:doc` | Video quay dọc ⇒ khung phát 9:16 (link `/reel/` tự nhận). |
| `thoiluong:<MM:SS>` | `thoiluong:01:23` | Thời lượng trên ảnh bìa + SEO. |
| `chude:<Nhãn>` | `chude:Làm sạch da` | Nhãn chủ đề + nút lọc ở trang Video. |
| `chuyengia:<handle>` | `chuyengia:chuyen-gia-thanh-hang` | Hiện chuyên gia phụ trách (bài trong danh mục `chuyen-gia`). |
| `noibat` | `noibat` | Lên cột "Tin nổi bật" ở `/tin-tuc`. |
| `sanpham:<alias SP>` | `sanpham:serum-vitamin-c-15` | Gắn bài với sản phẩm (bài viết liên quan ở trang sản phẩm). |

Tag có dấu `:` không hiện ra thành nhãn trên web. Viết thường, không dấu cách quanh dấu `:`.

## 10. Kiểm tra sau khi đăng & lỗi thường gặp

1. Mở `/video` — video mới nằm đầu hàng "Video mới nhất", đúng nhãn chủ đề, nhãn nguồn YouTube/Facebook.
2. Mở bài — bấm Play phải phát được, có tiếng; video dọc hiện khung dọc.
3. Mở `/tin-tuc` — bài mới lên "Tin mới nhất"; bài có `noibat` lên "Tin nổi bật".

| Hiện tượng | Nguyên nhân thường gặp |
| :-- | :-- |
| Khung video trống / báo "video không khả dụng" | Video Facebook/YouTube chưa Công khai; link `share/...` chưa mở ra lấy link thật; sai hoa/thường mã YouTube. |
| Trang bài hiện như bài viết thường, không có khung video lớn | Bài chưa chọn giao diện `article.video`. |
| Video dọc nhỏ, có viền hai bên | Thiếu tag `khung:doc`. |
| Ảnh bìa video Facebook xám | Bài Facebook chưa có ảnh đại diện. |
| Bài không lên trang `/tin-tuc` | Bài đang Ẩn, hoặc danh mục của bài không có trong ô Danh mục hiển thị. |
| Sửa theme ở máy nhưng web không đổi | Chưa tải bản zip mới lên Sapo và xuất bản (`npm run build:sapo` ⇒ `exports/sapo-theme-1.0.0.zip`). |
