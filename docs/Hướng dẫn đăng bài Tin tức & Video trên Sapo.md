# ĐĂNG BÀI TIN TỨC & VIDEO (YOUTUBE / FACEBOOK) TRÊN SAPO — HƯỚNG DẪN

Ngày lập: 14/10/2026 · Áp dụng cho theme Pharma Cosmetics (nhánh `hugo-theme-sept2026`)

> Bảng quản lý kèm theo: `exports/quan-ly-blog.xlsx` (tạo lại bằng `npm run sheet:blog`). Sheet "Bài viết" tự ghép
> sẵn ô **"Tag dán vào Sapo"**: điền các cột nền vàng rồi chép nguyên ô đó dán vào ô Tag của bài.

Mục lục: 1. Tổng quan · 2. Tạo danh mục Video · 3. Lấy link video YouTube · 4. Lấy số video Facebook ·
5. Tạo bài video (từng bước) · 6. Gắn video vào bài thường · 7. Tin nổi bật · 8. Tin mới nhất · 9. Quy ước tag ·
10. Kiểm tra & lỗi thường gặp

---

## 1. Tổng quan

| Trang trên web | Là gì trên Sapo | Giao diện phải chọn |
| :-- | :-- | :-- |
| `/tin-tuc` — trang tổng Tin tức & Kiến thức | **Trang nội dung** alias `tin-tuc` (không phải danh mục bài viết) | `page.tin-tuc` |
| `/bi-quyet`, `/y-kien-chuyen-gia`, `/tin-tuc-va-kien-thuc` — 1 danh mục | Danh mục bài viết | `blog` (mặc định) |
| `/video` — kênh video | Danh mục bài viết handle **`video`** | **`blog.video`** |
| Trang xem 1 video | Bài viết trong danh mục `video` | **`article.video`** |
| Bài viết thường có video kèm | Bài viết trong danh mục bất kỳ | `article` (mặc định) |

Mọi cấu hình nói tới trong tài liệu nằm ở **Sapo Admin › Website › Giao diện › Tuỳ chỉnh › Blog & Bài viết**.

### Danh mục bài viết đang có trên Sapo (đối soát 17/10/2026)

| Tên trên Sapo | Handle (alias) — ghi đúng chữ này vào cấu hình | Số bài |
| :-- | :-- | :-- |
| Bí Quyết Làm Đẹp | `bi-quyet` | 56 |
| Video Tư Vấn Skincare | `video` | 24 |
| ý kiến chuyên gia (ID 784009) | `y-kien-chuyen-gia` | 0 |
| Tin tức (ID 509691) | **`tin-tuc-va-kien-thuc`** — KHÔNG phải `tin-tuc` | 0 |
| Trước và sau | `truoc-va-sau` | 0 |

- `tin-tuc` là alias của **Trang nội dung** trang tổng, không có danh mục bài viết nào tên `tin-tuc`. Ghi `tin-tuc` vào
  ô nhận handle danh mục (Danh mục hiển thị, Blog lấy bài viết khuyên đọc…) là trỏ vào danh mục không tồn tại.
- Ô **Danh mục hiển thị** (`news_hub_blogs`) trên Sapo đang là: `bi-quyet, y-kien-chuyen-gia, tin-tuc-va-kien-thuc`.
- Danh mục 0 bài tự ẩn trên web; đăng bài vào là tự hiện, không cần sửa cấu hình.

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

## 4. Lấy số video Facebook

Mỗi video Facebook có **một dãy số riêng** (mã video). Người đăng bài **chỉ cần dãy số này** — không cần iframe, không
cần mã nhúng. Video phải đăng **Công khai** trên Fanpage (riêng tư / chỉ bạn bè / trong nhóm kín ⇒ khung báo lỗi).

**Cách lấy (trên máy tính):**
1. Mở Fanpage › mục **Video** (hoặc **Reels**) › bấm vào video cần lấy để video mở ra.
2. Nhìn **thanh địa chỉ** của trình duyệt. Dãy số dài sau `/videos/`, sau `?v=` hoặc sau `/reel/` chính là số video:

   | Thanh địa chỉ hiện | Số video |
   | :-- | :-- |
   | `facebook.com/pharmacosmeticsxshb/videos/427805549152968` | `427805549152968` |
   | `facebook.com/watch/?v=427805549152968` | `427805549152968` |
   | `facebook.com/reel/427805549152968` | `427805549152968` (Reels là video dọc ⇒ thêm `khung:doc`) |

3. Chép dãy số đó, ghi vào tag theo **một trong hai kiểu** (theme hiểu cả hai, chọn kiểu nào cũng được):
   - `facebook:427805549152968`
   - `facebook:fb_video_427805549152968` ← kiểu cũ đang dùng trên Sapo, **vẫn dùng tiếp được**.

**Lưu ý:**
- Chỉ ghi **chữ số**, không dấu cách, không dấu chấm. Thiếu hoặc thừa 1 chữ số là ra video khác / không có video.
- Link chia sẻ trên điện thoại dạng `facebook.com/share/v/AbC123...` **không chứa số video** — mở link đó trên máy tính
  để thanh địa chỉ chuyển sang dạng có số như bảng trên, rồi mới lấy số.
- Kiểm tra nhanh số đúng hay sai: dán `https://www.facebook.com/watch/?v=<số>` vào trình duyệt — mở ra đúng video là
  được; báo "Nội dung này hiện không hiển thị" là sai số hoặc video chưa Công khai.
- Video quay dọc ⇒ **thêm tag `khung:doc`** (không thêm thì video vẫn hiện đủ nhưng nhỏ trong khung ngang).
- Người rành kỹ thuật có thể dán thẳng link video hoặc mã nhúng (nút "Nhúng" của Facebook) — theme cũng hiểu, nhưng
  **không bắt buộc**; cách ghi số ở trên là đủ.

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
   | Facebook ngang | `facebook:fb_video_427805549152968, thoiluong:01:16, chude:Chống nắng & trang điểm` |
   | Facebook quay dọc / Reels | `facebook:fb_video_427805549152968, khung:doc, thoiluong:01:16, chude:Chống nắng & trang điểm` |

   - `thoiluong:` ghi đúng dạng `MM:SS` (hiện trên ảnh bìa + SEO). Không biết thì bỏ.
   - `chude:` gõ **giống hệt** giữa các bài cùng chủ đề (để nút lọc ở trang Video gom đúng).
   - Thêm `chuyengia:<handle>` nếu video do chuyên gia trình bày; thêm `noibat` nếu muốn lên Tin nổi bật (mục 7).
7. **Giao diện** (khung bên phải, mục "Giao diện"/"Template"): chọn **`article.video`**.
8. **Hiển thị**: Hiện › **Lưu**.

(Nâng cao, không bắt buộc: theme cũng đọc link video trong metafield `custom.video_url` hoặc link / mã nhúng dán trong
nội dung bài. Thứ tự ưu tiên: tag › metafield › nội dung.)

**Trên web, khách xem thế nào:**
- YouTube: ảnh bìa + nút Play; bấm 1 lần là phát, có âm thanh.
- Facebook: trình phát Facebook hiện sẵn ảnh bìa khi cuộn tới; bấm Play 1 lần là phát, có âm thanh. (Facebook không cho
  trang web tự phát có tiếng — đây là giới hạn của Facebook/trình duyệt, không phải lỗi theme.)

## 6. Gắn video vào bài viết thường (Bí quyết, Tin tức…)

Thêm tag `youtube:<mã>` hoặc `facebook:fb_video_<số>` vào bài viết thường (giao diện giữ `article` mặc định) ⇒ khối
**"Video hướng dẫn"** hiện trước nội dung bài.

- Nhiều tag video ⇒ **tag đầu = video chính**, các tag sau = danh sách video bổ trợ (bấm để đổi video trong khung).
- Tên video bổ trợ lấy từ bài cùng mã trong danh mục Video ⇒ nên đăng video đó vào danh mục Video trước (mục 5).

## 7. Đưa 1 tin vào "Tin nổi bật" (trang `/tin-tuc`)

1. Mở bài viết cần đưa lên (bài phải thuộc một danh mục có trong ô **Danh mục hiển thị** — hiện là
   `bi-quyet, y-kien-chuyen-gia, tin-tuc-va-kien-thuc`).
2. Ô **Tag**: thêm **`noibat`** › **Lưu**.
3. Gỡ khỏi Tin nổi bật: xoá tag `noibat` khỏi bài.

Cách theme chọn và xếp:
- Lấy bài có tag `noibat`, duyệt **theo thứ tự danh mục** trong ô Danh mục hiển thị (hết bài nổi bật của `bi-quyet` mới
  tới `y-kien-chuyen-gia`…), trong mỗi danh mục bài mới trước.
- Tối đa **9 tin** (`news_featured_count`), mỗi trang **3 tin** (`news_featured_per_page`), có nút ‹ › chuyển trang,
  đánh số 1, 2, 3…
- **Không bài nào có tag `noibat`** ⇒ cột này tự đổi thành các bài mới nhất của danh mục thứ 2 trong danh sách (tiêu đề
  cột = tên danh mục đó); danh mục thứ 2 chưa có bài ⇒ lấy bài mới của danh mục đầu (trùng "Tin mới nhất") — vì vậy nên
  luôn gắn `noibat` cho vài bài.
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

> Lưu ý kỹ thuật (17/10/2026): khối "Tin mới nhất" + "Tin nổi bật" chỉ hiện khi trong ô Danh mục hiển thị có ít nhất 1
> danh mục có bài. Bản theme trước commit `ad4e647` (17/10/2026) bị ẩn cả khối nếu danh mục **đầu tiên** không tồn tại trên
> Sapo (vd ghi `tin-tuc`) — tải bản zip mới lên Sapo để có bản sửa.

"Tin quan tâm của tôi" (dưới Tin nổi bật) = các bài **chính khách đó đã đọc** trên máy của họ — không cần cấu hình;
khách chưa đọc bài nào thì khối ẩn.

## 9. Quy ước tag

| Tag | Ví dụ | Tác dụng |
| :-- | :-- | :-- |
| `youtube:<mã hoặc link>` | `youtube:4B9RN_wcl_I` | Nguồn video YouTube. |
| `facebook:<số video>` | `facebook:fb_video_427805549152968` hoặc `facebook:427805549152968` | Nguồn video Facebook (lấy số ở mục 4). |
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
| Khung video báo "Video unavailable" / "không khả dụng" | Sai số video Facebook (thừa/thiếu chữ số, số mẫu) hoặc video chưa Công khai; sai hoa/thường mã YouTube. |
| Trang bài hiện như bài viết thường, không có khung video lớn | Bài chưa chọn giao diện `article.video`. |
| Video dọc nhỏ, có viền hai bên | Thiếu tag `khung:doc`. |
| Ảnh bìa video Facebook xám | Bài Facebook chưa có ảnh đại diện. |
| Bài không lên trang `/tin-tuc` | Bài đang Ẩn, hoặc danh mục của bài không có trong ô Danh mục hiển thị, hoặc ô này ghi sai handle (vd `tin-tuc` thay vì `tin-tuc-va-kien-thuc`). |
| Sửa theme ở máy nhưng web không đổi | Chưa tải bản zip mới lên Sapo và xuất bản (`npm run build:sapo` ⇒ `exports/sapo-theme-1.0.0.zip`). |
