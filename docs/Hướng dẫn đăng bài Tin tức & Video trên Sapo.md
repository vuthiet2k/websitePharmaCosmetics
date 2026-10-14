# ĐĂNG BÀI TIN TỨC & VIDEO (YOUTUBE / FACEBOOK) TRÊN SAPO — HƯỚNG DẪN

Ngày lập: 14/10/2026 · Áp dụng cho theme Pharma Cosmetics (nhánh `hugo-theme-sept2026`)

> Bảng quản lý kèm theo: `exports/quan-ly-blog.xlsx` (tạo lại bằng `npm run sheet:blog`). Sheet "Bài viết" tự ghép
> sẵn ô **"Tag dán vào Sapo"**: điền các cột nền vàng rồi chép nguyên ô đó dán vào ô Tag của bài.

## 1. Các trang và danh mục liên quan

| Trang trên web | Là gì trên Sapo | Giao diện phải chọn |
| :-- | :-- | :-- |
| `/tin-tuc` — trang tổng Tin tức & Kiến thức | Danh mục bài viết `tin-tuc` (hoặc Trang nội dung alias `tin-tuc`) | `blog` (mặc định) / `page.tin-tuc` |
| `/bi-quyet`, `/y-kien-chuyen-gia`… — 1 danh mục bài | Danh mục bài viết | `blog` (mặc định) |
| `/video` — kênh video | Danh mục bài viết handle **`video`** | **`blog.video`** |
| Trang xem 1 video | Bài viết trong danh mục `video` | **`article.video`** |
| Bài viết thường có video kèm | Bài viết trong danh mục bất kỳ | `article` (mặc định) |

- Trang tổng `/tin-tuc` gom các danh mục khai báo ở **Giao diện › Tuỳ chỉnh › Blog & Bài viết › Danh mục hiển thị**
  (`news_hub_blogs`, hiện là `tin-tuc, bi-quyet, y-kien-chuyen-gia`). Danh mục đầu lên khối "Tin mới nhất"; danh mục
  đầu chưa có bài thì theme tự lấy danh mục kế tiếp có bài.
- Bài gắn tag **`noibat`** lên cột "Tin nổi bật" của trang tổng.
- Danh mục video do ô **Handle danh mục Video** (`video_blog_handle` = `video`) quyết định. Đổi handle danh mục trên
  Sapo thì phải sửa ô này theo, nếu không các khối video trên web sẽ trống.

## 2. Tạo danh mục Video (làm 1 lần)

1. Sapo Admin › **Website › Bài viết › Danh mục bài viết › Thêm danh mục**.
2. Tên: `Video Tư Vấn Skincare` (tuỳ ý) · Đường dẫn/alias: **`video`**.
3. Mục **Giao diện**: chọn **`blog.video`** › Lưu.
4. Câu chữ của trang kênh (giới thiệu, link kênh YouTube, Fanpage, nút Đăng ký, khối "Đặt lịch tư vấn"…) sửa ở
   **Giao diện › Tuỳ chỉnh › Blog & Bài viết** (các ô bắt đầu bằng "Video").

## 3. Đăng 1 video (YouTube hoặc Facebook)

1. **Website › Bài viết › Thêm bài viết**, chọn danh mục **Video**.
2. **Tiêu đề**: tên video. **Nội dung**: mô tả ngắn (có thể chèn link bài viết chi tiết).
3. **Ảnh đại diện**:
   - YouTube: có thể bỏ trống — theme tự lấy ảnh bìa của YouTube.
   - Facebook: **bắt buộc** tải ảnh lên (ảnh bìa ở danh sách video, Facebook không cho lấy tự động).
4. **Tag** (cách nhau dấu phẩy) — xem bảng ở mục 5. Ví dụ:
   - YouTube: `youtube:4B9RN_wcl_I, thoiluong:01:23, chude:Làm sạch da`
   - Facebook ngang: `facebook:https://www.facebook.com/pharmacosmeticsxshb/videos/<số>, thoiluong:01:16, chude:Chống nắng & trang điểm`
   - Facebook quay dọc: thêm `khung:doc` (link dạng `/reel/` thì không cần).
5. Mục **Giao diện** của bài: chọn **`article.video`** › Lưu (hiển thị: Hiện).

Không muốn dùng tag nguồn video thì có thể: dán link video vào metafield **`custom.video_url`**, hoặc dán link / mã
nhúng (iframe) YouTube/Facebook vào nội dung bài. Theme đọc theo thứ tự: tag › metafield › nội dung.

## 4. Gắn video vào bài viết thường (Bí quyết, Tin tức…)

Thêm tag `youtube:<mã>` / `facebook:<link>` vào bài viết thường ⇒ khối **"Video hướng dẫn"** hiện trước nội dung bài.
Nhiều tag ⇒ tag đầu là video chính, các tag sau là danh sách video bổ trợ (bấm để đổi video trong khung). Tên video bổ
trợ lấy từ bài cùng mã trong danh mục Video — nên đăng video đó vào danh mục Video trước.

## 5. Quy ước tag

| Tag | Ví dụ | Tác dụng |
| :-- | :-- | :-- |
| `youtube:<mã hoặc link>` | `youtube:4B9RN_wcl_I` | Nguồn video YouTube. Mã 11 ký tự, **phân biệt hoa/thường**; dán cả link `watch?v=`, `youtu.be/`, `/shorts/` cũng được. |
| `facebook:<link video>` | `facebook:https://www.facebook.com/watch/?v=427805549152968` | Nguồn video Facebook. Nhận link `/videos/`, `/watch/?v=`, `/reel/`, `fb.watch`, mã nhúng iframe. |
| `khung:doc` | `khung:doc` | Video quay dọc ⇒ khung phát 9:16. Không có tag ⇒ khung ngang 16:9 (video dọc vẫn đủ nhưng nhỏ). |
| `thoiluong:<MM:SS>` | `thoiluong:01:23` | Thời lượng trên ảnh bìa + dữ liệu SEO. |
| `chude:<Nhãn>` | `chude:Làm sạch da` | Nhãn chủ đề + nút lọc ở trang Video. Gõ **giống hệt** nhau giữa các bài. |
| `chuyengia:<handle>` | `chuyengia:chuyen-gia-thanh-hang` | Hiện chuyên gia phụ trách (bài trong danh mục `chuyen-gia`). |
| `noibat` | `noibat` | Lên cột "Tin nổi bật" ở `/tin-tuc`. |
| `sanpham:<alias SP>` | `sanpham:serum-vitamin-c-15` | Gắn bài với sản phẩm (khối bài viết liên quan ở trang sản phẩm). |

Tag có dấu `:` không hiện ra thành nhãn trên web.

## 6. Video Facebook — điều kiện để xem được

- Video phải ở chế độ **Công khai** trên Fanpage (video riêng tư / chỉ bạn bè / nhóm kín ⇒ khung báo lỗi).
- Lấy link: mở video trên Facebook › **⋯ › Sao chép liên kết**, hoặc **Nhúng** rồi dán cả mã iframe — theme tự tách link.
- Trên web: trình phát Facebook hiện sẵn ảnh bìa; khách **bấm Play 1 lần là phát có âm thanh**. (Theme không tự phát
  video Facebook: Facebook không hỗ trợ tự phát có tiếng khi nhúng.)
- Video YouTube: bấm Play trên ảnh bìa là phát ngay, có âm thanh.

## 7. Kiểm tra sau khi đăng

1. Mở `/video` — video mới nằm đầu hàng "Video mới nhất", đúng nhãn chủ đề, nhãn nguồn YouTube/Facebook.
2. Mở bài — bấm Play phải phát được; video dọc hiện khung dọc không bị cắt.
3. Bài viết thường có tag video — khối "Video hướng dẫn" hiện trước nội dung.
4. Theme mới chỉ có hiệu lực trên web thật sau khi **tải bản zip mới lên Sapo và xuất bản** (`npm run build:sapo`
   ⇒ `exports/sapo-theme-1.0.0.zip`).
