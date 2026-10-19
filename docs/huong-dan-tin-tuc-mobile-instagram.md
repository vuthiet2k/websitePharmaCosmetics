# Tin tức trên điện thoại — giao diện kiểu Instagram & bài viết kiểu Facebook

Dành cho người quản trị nội dung trên Sapo (không cần biết code). Có 2 phần độc lập:

| Phần | Hiện ở đâu | Có cần bật không? |
| :-- | :-- | :-- |
| **A. Bảng tin kiểu Instagram** | Trang 1 danh mục bài viết được gán giao diện `blog.instagram-feed` | **Có** — phải gán giao diện cho danh mục (mục A.2) |
| **B. Chi tiết bài kiểu bài đăng Facebook** | Mọi bài viết, **chỉ trên điện thoại** (màn ≤ 767px). Laptop giữ nguyên | Không — tự áp dụng |

> Tình trạng 19/10/2026 (bản xem trước theme 1172841): **chưa có danh mục nào gán `blog.instagram-feed`** — mọi danh mục
> vẫn dùng giao diện `blog` mặc định. Phần B đã chạy sẵn.

---

## A. Bảng tin kiểu Instagram

### A.1. Trang trông như thế nào

Từ trên xuống:

1. **Hàng "story" tròn** — mỗi vòng tròn là 1 chuyên mục (danh mục bài viết). Ảnh trong vòng = ảnh bài mới nhất của chuyên
   mục đó (bài chỉ có video YouTube ⇒ ảnh của video). Có bài đăng trong **7 ngày** ⇒ vòng có nhãn **"Mới"**. Chuyên mục đang
   xem được đánh dấu. Vuốt ngang trên điện thoại.
2. **Bảng tin** — 12 bài mới nhất, xếp **mới → cũ**, gom từ **tất cả** danh mục trong ô *Danh mục hiển thị* (mục A.3).
   Nút **"Xem thêm bài viết"** tải thêm, tối đa 36 bài. Mỗi bài gồm:
   - Dòng đầu: logo · tên tài khoản · chuyên mục · thời gian ("3 giờ trước", "2 ngày trước"; < 1 giờ ⇒ "Vừa đăng").
   - Khung ảnh dọc 4:5. **Bài có video được ưu tiên hiện video** (YouTube trước, rồi Facebook) và tự phát khi cuộn tới;
     bài không có video ⇒ ảnh đại diện bài. Bài đăng < 3 ngày có nhãn "Mới".
   - Hàng nút: Thích · Bình luận · Chia sẻ · Lưu bài.
   - Tiêu đề + tóm tắt 2 dòng, link "xem thêm" mở bài.
   - Hashtag = các tag thường của bài.
   - "Xem bình luận" chỉ hiện khi bài **có bình luận thật**.

**Không có số liệu bịa:** nút Thích/Lưu chỉ ghi nhớ trên máy người xem, **không hiện số lượt thích**. Số bình luận là số thật
của Sapo.

### A.2. Bật giao diện cho 1 danh mục (làm 1 lần)

1. Sapo Admin → **Website › Bài viết › Danh mục bài viết** → chọn danh mục muốn dùng (gợi ý: `tin-tuc-va-kien-thuc`).
2. Ở ô **Giao diện** (khung giao diện / template) chọn **`blog.instagram-feed`** → **Lưu**.
3. Mở `https://pharmacosmetics-vn.com/<handle-danh-mục>` trên điện thoại để kiểm tra.

Lưu ý:

- Bảng tin lấy bài từ **mọi danh mục trong ô "Danh mục hiển thị"** (A.3), không chỉ danh mục đang gán. Danh mục gán giao diện
  chỉ là "địa chỉ" của trang và tên trang (tiêu đề ẩn, dùng cho SEO).
- Giao diện này áp dụng cho **cả laptop** (bảng tin 1 cột ở giữa màn hình). Muốn laptop vẫn là lưới bài thường thì tạo 1 danh
  mục riêng (vd `bang-tin`, chưa cần bài nào) để gán giao diện, rồi đưa link danh mục đó vào menu điện thoại.
- Muốn tắt: đổi Giao diện về `blog` → Lưu.

### A.3. Cấu hình trong Giao diện › Tuỳ chỉnh › **Blog & Bài viết**

| Ô cấu hình | Giá trị hiện tại | Tác dụng |
| :-- | :-- | :-- |
| Danh mục hiển thị (`news_hub_blogs`) | `bi-quyet, y-kien-chuyen-gia, tin-tuc-va-kien-thuc` | **Nguồn bài của bảng tin** (dùng chung với khối "Tin mới nhất" trang `/tin-tuc`). Thêm `video` nếu muốn bài video vào bảng tin |
| Instagram feed — các chuyên mục ở hàng story (`feed_story_blogs`) | `tin-tuc-va-kien-thuc,bi-quyet,video,truoc-va-sau-1,hoat-chat,chuyen-gia` | Thứ tự vòng tròn story. Handle sai/không tồn tại ⇒ vòng đó tự ẩn |
| Instagram feed — tên tài khoản hiển thị | `pharmacosmetics` | Tên ở đầu mỗi bài |
| … nhãn bài mới / chữ "Vừa đăng" | `Mới` / `Vừa đăng` | |
| … nhãn nút Thích / Bình luận / Chia sẻ / Lưu bài | | Chữ đọc màn hình + chữ hiện cạnh icon |
| … link "xem thêm" / "Xem bình luận" / nút "Xem thêm bài viết" | | |
| … chữ khi chưa có bài | `Chuyên mục đang cập nhật bài viết.` | |
| … thông báo đã lưu / đã chép link | | Hiện thoáng qua khi bấm Lưu / Chia sẻ trên máy không hỗ trợ chia sẻ |

Handle = phần cuối đường dẫn danh mục (vd `https://pharmacosmetics-vn.com/bi-quyet` ⇒ `bi-quyet`). Các handle đúng trên Sapo
xem bảng "Danh mục bài viết" trong `.clinerules/02-du-an-pharma-cosmetics.md`.

### A.4. Viết bài để hiện đẹp trên bảng tin

| Muốn | Làm |
| :-- | :-- |
| Ảnh đẹp | Ảnh đại diện bài **dọc 4:5** (vd 1080×1350) hoặc vuông; chủ thể ở giữa (khung cắt 4:5) |
| Hiện video | Tag `youtube:<mã video>` hoặc `facebook:<số video>`, hoặc nhúng video trong nội dung — cách lấy mã xem `docs/Hướng dẫn đăng bài Tin tức & Video trên Sapo.md` |
| Tên chuyên mục riêng | Tag `chude:<Tên hiển thị>` (không có ⇒ dùng tên danh mục) |
| Hashtag | Tag thường (vd `trị mụn`). Tag dạng `khoá:giá trị` (`chude:`, `youtube:`…) là tag hệ thống, **không** hiện thành hashtag |
| Tóm tắt | Ô **Mô tả ngắn** của bài (không có ⇒ cắt từ nội dung). Chỉ 2 dòng đầu hiện trước "xem thêm" |
| Thời gian đúng | Ngày đăng của bài trên Sapo — bài hẹn giờ chỉ hiện khi tới giờ |

---

## B. Chi tiết bài viết kiểu bài đăng Facebook (chỉ điện thoại)

Tự áp dụng cho **mọi bài viết** khi xem trên màn ≤ 767px; laptop không đổi.

1. **Dòng tác giả** trên cùng: ảnh chuyên gia (bài có tag `chuyengia:<handle>`) hoặc logo · tên đậm + dấu tích · ngày đăng ·
   chuyên mục · biểu tượng công khai.
2. **Tiêu đề** + tóm tắt + hashtag màu xanh.
3. **Ảnh bài tràn ngang màn hình**. Bài có video ⇒ khung video là ảnh chính (không lặp thêm ảnh).
4. **Thanh Thích · Bình luận · Chia sẻ**:
   - Thích: ghi trên máy người xem, **không hiện số lượt**.
   - Bình luận: danh mục **bật bình luận** ⇒ nhảy tới ô bình luận; danh mục **tắt bình luận** ⇒ nút đổi thành
     **"Hỏi chuyên gia"** dẫn tới trang đặt lịch.
   - Chia sẻ: mở bảng chia sẻ của điện thoại (Zalo, Messenger…); máy không hỗ trợ ⇒ chép link + thông báo.
5. Dòng tác giả / dải ngày / thẻ tag / nút chia sẻ kiểu cũ **ẩn trên điện thoại** (laptop vẫn hiện).

Cấu hình: Giao diện › Tuỳ chỉnh › **Blog & Bài viết**:

| Ô | Mặc định |
| :-- | :-- |
| Bài viết (mobile kiểu Facebook) — nút Thích (`fbm_like_label`) | Thích |
| Bài viết (mobile) — nút Bình luận (blog bật bình luận) (`fbm_comment_label`) | Bình luận |
| Bài viết (mobile) — nút thay Bình luận khi blog tắt bình luận (`fbm_ask_label`) | Hỏi chuyên gia |
| Bài viết (mobile) — link nút Hỏi chuyên gia (`fbm_comment_url`) | `/dat-lich-tu-van` |
| Bài viết (mobile) — nút Chia sẻ (`fbm_share_label`) | Chia sẻ |

Bật/tắt bình luận: Sapo Admin → Danh mục bài viết → chọn danh mục → mục **Bình luận**.

---

## C. Kiểm tra sau khi cấu hình

- [ ] Mở trang danh mục đã gán `blog.instagram-feed` trên **điện thoại thật**: hàng story vuốt ngang được, bài mới nhất ở đầu.
- [ ] Bài có video: khung hiện video, tự phát khi cuộn tới (không tiếng).
- [ ] Không thấy số lượt thích nào; "Xem bình luận" chỉ hiện ở bài có bình luận thật.
- [ ] Bấm "Xem thêm bài viết" tải thêm bài, không lặp bài.
- [ ] Mở 1 bài trên điện thoại: dòng tác giả trên cùng, ảnh tràn ngang, thanh Thích · Bình luận/Hỏi chuyên gia · Chia sẻ.
- [ ] Mở cùng bài trên laptop: giao diện cũ, không có thanh kiểu Facebook.

## D. Lỗi thường gặp

| Hiện tượng | Nguyên nhân | Cách sửa |
| :-- | :-- | :-- |
| Trang danh mục vẫn là lưới thẻ | Chưa gán giao diện, hoặc đang xem trên bản theme khác | Kiểm tra ô Giao diện của danh mục = `blog.instagram-feed`; theme đúng đang xuất bản |
| Thiếu 1 vòng story | Handle trong `feed_story_blogs` sai hoặc danh mục không còn | Sửa handle theo đường dẫn thật |
| Bảng tin thiếu bài của 1 danh mục | Danh mục không có trong `news_hub_blogs` | Thêm handle vào ô Danh mục hiển thị |
| Ảnh bị cắt mất đầu/chân | Ảnh ngang hoặc chủ thể sát mép | Dùng ảnh dọc 4:5, chủ thể ở giữa |
| Hiện "Chuyên mục đang cập nhật bài viết." | Các danh mục nguồn chưa có bài đã công bố | Đăng bài / kiểm tra trạng thái Hiển thị của bài |

---

*Kỹ thuật (cho dev):* `templates/blog.instagram-feed.bwt` + `assets/page_blog_feed.scss.bwt`; phần B ở `templates/article.bwt`
(khối `.pc-fbm-*`) + `assets/page_blog.scss.bwt`. Nguồn bài dùng chung `snippets/page_tin_tuc_hub.bwt` (khối "Tin mới nhất").
