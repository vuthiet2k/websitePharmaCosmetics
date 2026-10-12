# **BÁO CÁO KỸ THUẬT: DANH SÁCH LINK IFRAME YOUTUBE CHO CHUYÊN MỤC BLOGS/BI-QUYET**

**Đơn vị thực hiện:** Pharma Cosmetics Dev & Media Team  
**Tiêu chuẩn quy trình:** Astra Agentic Workflow  
**Ngày cập nhật:** 12/10/2026

# **1\. TỔNG QUAN & NGUỒN DỮ LIỆU ĐỐI CHIẾU**

Tài liệu này được lập nhằm đồng bộ hóa nội dung video trực quan từ kênh YouTube chính thức của thương hiệu vào hệ thống bài viết chuyên mục **Bí Quyết Làm Đẹp** trên nền tảng website storefront Pharma Cosmetics. Hiện tại, hệ thống Sapo Web / Hugo Theme chưa có danh mục bài viết riêng tên là "Video" (handle: `video` / đường dẫn: `/blogs/video`). Cần khởi tạo và triển khai danh mục bài viết Video này.

* **Kênh YouTube chính thức:** [Pharma Cosmetics YouTube](https://www.youtube.com/@pharmacosmetics)  
* **Trang Facebook chính thức:** [Pharma Cosmetics Facebook Fanpage](https://www.facebook.com/pharmacosmeticsxshb)  
* **Trang đích hiển thị:** [Bí Quyết Làm Đẹp (/blogs/bi-quyet)](https://hugo-theme-sept2026-test.vercel.app/blogs/bi-quyet)  
* **Kho mã nguồn:** [GitHub vuthiet2k/websitePharmaCosmetics (nhánh hugo-theme-sept2026)](https://github.com/vuthiet2k/websitePharmaCosmetics/tree/hugo-theme-sept2026)  
* **Thư mục lưu trữ tài liệu:** [Google Drive \- danh sách sản phẩm](https://drive.google.com/drive/folders/1zVutCeTZA-MkAAR40um24RZaDhOu5ims)

# **2\. PHÂN TÍCH KIẾN TRÚC MÃ NGUỒN THEO HUGO THEME SEPT 2026**

## **2.1. Cấu trúc Blog và Bài viết (data/articles.js)**

Trong mã nguồn theme Sapo Web Liquid (`.bwt`), chuyên mục `bi-quyet` được khởi tạo tại `data/articles.js` với handle `bi-quyet`, tên hiển thị "Bí Quyết Làm Đẹp", chứa 5 bài viết chuyên sâu:

1. `double-cleansing-rua-mat-2-buoc-sach-sau` (ID: 221\) \- Double Cleansing: Vì sao cần rửa mặt 2 bước để da sạch sâu thật sự.  
2. `duong-am-ban-dem-dung-cach` (ID: 222\) \- Dưỡng ẩm ban đêm đúng cách: Khoá ẩm để da phục hồi khi ngủ.  
3. `5-bi-quyet-cham-da-mua-hanh-kho` (ID: 223\) \- 5 bí quyết chăm da mùa hanh khô không bị bong tróc, căng rát.  
4. `chon-kem-nen-khong-gay-bi-da-mun` (ID: 224\) \- Cách chọn kem nền không gây bí da cho người da dầu mụn.  
5. `tay-te-bao-chet-dung-tan-suat` (ID: 225\) \- Tẩy tế bào chết đúng tần suất: Bao lâu 1 lần là đủ, không hại da?

## **2.2. Khối Multimedia Hub (templates/blog.bwt)**

Trang danh mục blog `templates/blog.bwt` (dòng 93-116) tích hợp thành phần CMP-06 Multimedia Hub (.pc-cmp-multimedia-hub\_\_videos), thiết kế hiển thị tối đa 4 video tư vấn chuyên sâu. Điều kiện lọc: các bài viết được gắn tag `video` trong mảng article.tags.

## **2.3. Khung nhúng trong bài viết chi tiết (templates/article.bwt)**

Trong trang chi tiết bài viết templates/article.bwt (dòng 132), nội dung được tải qua parser {% include 'shortcode' load: article.content %}. Đoạn mã nhúng video dạng iframe được chèn trực tiếp vào RTE article.content với lớp bọc tỷ lệ khung hình `aspect-video`.

# **3\. DANH SÁCH CHI TIẾT LINK IFRAME YOUTUBE CHO TỪNG BÀI VIẾT**

## **3.1. Bài 1: Double Cleansing: Vì sao cần rửa mặt 2 bước để da sạch sâu thật sự**

* **Đường dẫn bài viết:** `/blogs/bi-quyet/double-cleansing-rua-mat-2-buoc-sach-sau`  
* **Video chính:** [3 SAI LẦM NGHIÊM TRỌNG KHI SỬ DỤNG DẦU TẨY TRANG KHIẾN DA BỊ MỤN](https://www.youtube.com/watch?v=4B9RN_wcl_I)  
  * **Mã Video ID:** `4B9RN_wcl_I`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/4B9RN_wcl_I`  
  * **Thời lượng:** 1 phút 23 giây  
  * **Giá trị nội dung:** Hướng dẫn kỹ thuật nhũ hóa đúng cách, chỉ ra sai lầm dùng dầu tẩy trang gây bít tắc lỗ chân lông.  
* **Video bổ trợ (Bước 2 \- Chọn sữa rửa mặt):** [DA MỤN VIÊM NÊN DÙNG SỮA RỬA MẶT NÀO?](https://www.youtube.com/watch?v=owJAHSiHkpI)  
  * **Mã Video ID:** `owJAHSiHkpI`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/owJAHSiHkpI`  
  * **Thời lượng:** 1 phút 13 giây  
* **Video bổ trợ (Cân bằng da sau làm sạch):** [HƯỚNG DẪN SỬ DỤNG TONER ĐÚNG CÁCH](https://www.youtube.com/watch?v=lWOH7jyT97c)  
  * **Mã Video ID:** `lWOH7jyT97c`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/lWOH7jyT97c`  
  * **Thời lượng:** 1 phút 24 giây

## **3.2. Bài 2: Dưỡng ẩm ban đêm đúng cách: Khoá ẩm để da phục hồi khi ngủ**

* **Đường dẫn bài viết:** `/blogs/bi-quyet/duong-am-ban-dem-dung-cach`  
* **Video chính:** [\[CẬN CẢNH\] KEM DƯỠNG ĐÊM GIGI NEW AGE G4](https://www.youtube.com/watch?v=nBlNtLT5n88)  
  * **Mã Video ID:** `nBlNtLT5n88`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/nBlNtLT5n88`  
  * **Thời lượng:** 1 phút 17 giây  
  * **Giá trị nội dung:** Phân tích kết cấu kem dưỡng ẩm ban đêm chứa peptide tái tạo và cơ chế khóa ẩm trong giấc ngủ.  
* **Video bổ trợ (Phục hồi da tổn thương & treatment):** [KEM DƯỠNG PHỤC HỒI DÀNH CHO DA ĐANG ĐIỀU TRỊ MỤN \[treatment\]](https://www.youtube.com/watch?v=G3GtdkB7Src)  
  * **Mã Video ID:** `G3GtdkB7Src`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/G3GtdkB7Src`  
  * **Thời lượng:** 1 phút 14 giây  
* **Video bổ trợ (Liều lượng tinh chất trước khóa ẩm):** [BÔI SERUM LIỀU LƯỢNG BAO NHIÊU LÀ ĐỦ?](https://www.youtube.com/watch?v=dl1TfHMgSF0)  
  * **Mã Video ID:** `dl1TfHMgSF0`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/dl1TfHMgSF0`  
  * **Thời lượng:** 1 phút 04 giây

## **3.3. Bài 3: 5 bí quyết chăm da mùa hanh khô không bị bong tróc, căng rát**

* **Đường dẫn bài viết:** `/blogs/bi-quyet/5-bi-quyet-cham-da-mua-hanh-kho`  
* **Video chính:** [MẶT NẠ GIẢM STRESS CHO DA \- Christina Unstress Optimal Hydration Mask](https://www.youtube.com/watch?v=SiYXKgJw__Q)  
  * **Mã Video ID:** `SiYXKgJw__Q`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/SiYXKgJw__Q`  
  * **Thời lượng:** 1 phút 20 giây  
  * **Giá trị nội dung:** Cấp cứu khẩn cấp cho làn da mất nước, đỏ rát, bong tróc trong mùa đông khô hanh.  
* **Video bổ trợ (Thời điểm vàng cấp ẩm):** [NÊN ĐẮP MẶT NẠ KHI NÀO ?](https://www.youtube.com/watch?v=bEZ_f-RkUoc)  
  * **Mã Video ID:** `bEZ_f-RkUoc`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/bEZ_f-RkUoc`  
  * **Thời lượng:** 1 phút 22 giây  
* **Video chuyên sâu (Chăm sóc giãn mao mạch & da nhạy cảm khô):** [COUPEROSE LÀ GÌ? CÁCH CHĂM SÓC DA BỊ COUPEROSE](https://www.youtube.com/watch?v=MbKvzlYKsDg)  
  * **Mã Video ID:** `MbKvzlYKsDg`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/MbKvzlYKsDg`  
  * **Thời lượng:** 2 phút 06 giây

## **3.4. Bài 4: Cách chọn kem nền không gây bí da cho người da dầu mụn**

* **Đường dẫn bài viết:** `/blogs/bi-quyet/chon-kem-nen-khong-gay-bi-da-mun`  
* **Video chính:** [\[CẬN CẢNH\] CUSHION RENODERM DAYLONG BB CREAM](https://www.youtube.com/watch?v=QkNOHb_aWPE)  
  * **Mã Video ID:** `QkNOHb_aWPE`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/QkNOHb_aWPE`  
  * **Thời lượng:** 1 phút 36 giây  
  * **Giá trị nội dung:** Giới thiệu cushion/BB Cream chuẩn y khoa mỏng nhẹ, thông thoáng, không chứa thành phần gây bít tắc (non-comedogenic).  
* **Video bổ trợ (Chống nắng nâng tone thay thế kem nền):** [KEM CHỐNG NẮNG SHADOW SPF 30 GEL CÓ NÂNG TONE KHÔNG?](https://www.youtube.com/watch?v=-TdXxYfFqb0)  
  * **Mã Video ID:** `-TdXxYfFqb0`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/-TdXxYfFqb0`  
  * **Thời lượng:** 1 phút 24 giây  
* **Video bổ trợ (Kỹ thuật thoa lại nền/chống nắng giữa ngày):** [Cách thoa lại kem chống nắng đúng cách cho da không trang điểm](https://www.youtube.com/watch?v=4YYquUKj4gk)  
  * **Mã Video ID:** `4YYquUKj4gk`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/4YYquUKj4gk`  
  * **Thời lượng:** 1 phút 31 giây

## **3.5. Bài 5: Tẩy tế bào chết đúng tần suất: Bao lâu 1 lần là đủ, không hại da?**

* **Đường dẫn bài viết:** `/blogs/bi-quyet/tay-te-bao-chet-dung-tan-suat`  
* **Video chính:** [Niacinamide \- Thành phần 'must-have' trong mọi Skincare Routine](https://www.youtube.com/watch?v=GwHODtAvPBQ)  
  * **Mã Video ID:** `GwHODtAvPBQ`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/GwHODtAvPBQ`  
  * **Thời lượng:** 1 phút 07 giây  
  * **Giá trị nội dung:** Phục hồi màng ẩm sinh học, làm dịu và kiềm dầu sau các đợt peel/tẩy da chết BHA/AHA.  
* **Video bổ trợ (Layer hoạt chất điều trị thâm sạm):** [SERUM LACABINE 2% TRANEXAMIC ACID CÓ TỐT KHÔNG?](https://www.youtube.com/watch?v=lIdqImbX_h4)  
  * **Mã Video ID:** `lIdqImbX_h4`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/lIdqImbX_h4`  
  * **Thời lượng:** 1 phút 33 giây  
* **Video bổ trợ (Liều lượng thoa hoạt chất điều trị an toàn):** [BÔI SERUM LIỀU LƯỢNG BAO NHIÊU LÀ ĐỦ?](https://www.youtube.com/watch?v=dl1TfHMgSF0)  
  * **Mã Video ID:** `dl1TfHMgSF0`  
  * **Link Iframe Embed:** `https://www.youtube.com/embed/dl1TfHMgSF0`  
  * **Thời lượng:** 1 phút 04 giây

# **4\. BẢNG TỔNG HỢP 4 VIDEO TIÊU BIỂU CHO KHỐI MULTIMEDIA HUB TRANG TỔNG**

| Thứ tự | Chủ đề chuyên môn | Tiêu đề Video YouTube | Video ID | Link xem video | Link iframe nhúng |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 1 | Làm sạch chuyên sâu | 3 SAI LẦM NGHIÊM TRỌNG KHI SỬ DỤNG DẦU TẨY TRANG KHIẾN DA BỊ MỤN | `4B9RN_wcl_I` | Xem Video | `https://www.youtube.com/embed/4B9RN_wcl_I` |
| 2 | Cân bằng & Chuẩn bị | HƯỚNG DẪN SỬ DỤNG TONER ĐÚNG CÁCH | `lWOH7jyT97c` | Xem Video | `https://www.youtube.com/embed/lWOH7jyT97c` |
| 3 | Tái tạo ban đêm | \[CẬN CẢNH\] KEM DƯỠNG ĐÊM GIGI NEW AGE G4 | `nBlNtLT5n88` | Xem Video | `https://www.youtube.com/embed/nBlNtLT5n88` |
| 4 | Cấp ẩm phục hồi | MẶT NẠ GIẢM STRESS CHO DA (Christina Unstress Mask) | `SiYXKgJw__Q` | Xem Video | `https://www.youtube.com/embed/SiYXKgJw__Q` |

# **5\. MÃ NGUỒN HTML NHÚNG IFRAME RESPONSIVE CHUẨN THEME**

Khi chèn trực tiếp vào khung soạn thảo HTML của bài viết trên Sapo Admin hoặc trong file template, sử dụng cấu trúc wrapper chuẩn Tailwind CSS / Sapo theme sau để đảm bảo video tự động co giãn theo tỷ lệ 16:9, không bị vỡ giao diện trên di động:\<div class="relative w-full aspect-video rounded-xl overflow-hidden my-6 shadow-sm border border-gray-100"\>

  \<iframe 

    class="w-full h-full" 

    src="https\://www\.youtube.com/embed/4B9RN\_wcl\_I" 

    title="3 SAI LẦM NGHIÊM TRỌNG KHI SỬ DỤNG DẦU TẨY TRANG KHIẾN DA BỊ MỤN" 

    frameborder="0" 

    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 

    referrerpolicy="strict-origin-when-cross-origin" 

    allowfullscreen\>

  \</iframe\>

\</div\>

# **5.1. MÃ NGUỒN NHÚNG FACEBOOK VIDEO IFRAME RESPONSIVE**

Đối với các video bài viết phát sóng trên Facebook Watch / Fanpage chính thức, sử dụng cấu trúc Facebook Embedded Video Player iframe URL tích hợp responsive wrapper tương thích:\<div class="relative w-full aspect-video rounded-xl overflow-hidden my-6 shadow-sm border border-gray-100"\>

  \<iframe 

    class="w-full h-full" 

    src="https\://www\.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fpharmacosmeticsxshb%2Fvideos%2F123456789%2F\&show\_text=false\&width=560" 

    style="border:none;overflow:hidden" 

    scrolling="no" 

    frameborder="0" 

    allowfullscreen="true" 

    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"\>

  \</iframe\>

\</div\>

# **6\. PHƯƠNG ÁN KỸ THUẬT TRIỂN KHAI DANH MỤC BÀI VIẾT "VIDEO" (/BLOGS/VIDEO)**

1. **Đối với từng bài viết trong Sapo Admin:**  
   * Mở bài viết tương ứng trong phần quản trị Blog/Website.  
   * Chuyển chế độ soạn thảo sang mã nguồn HTML (`<>`).  
   * Chèn đoạn mã iframe tương ứng vào vị trí phù hợp (đầu bài viết hoặc sau đoạn phân tích lý thuyết).  
2. **Kích hoạt khối CMP-06 Multimedia Hub trên trang danh mục `/blogs/bi-quyet`:**  
   * Gắn thêm tag `video` vào danh sách thẻ tags của bài viết mong muốn xuất hiện trên Multimedia Hub.  
   * Nhập đường dẫn video vào trường dữ liệu `metafields.custom.video_url` nếu dùng trình phát video native hoặc cập nhật iframe template.

3. **Khởi tạo và cấu trúc danh mục bài viết "Video" (/blogs/video):**  
   * Khởi tạo danh mục `video` trong cấu trúc dữ liệu (`data/articles.js` / Sapo Admin Blog Category) với tên hiển thị "Blogs Video" hoặc "Video Tư Vấn Skincare".  
   * Cấu trúc nhúng đa nền tảng: Hỗ trợ nhúng chuẩn cả YouTube Iframe và Facebook Video Iframe vào bài viết chi tiết và trang danh mục.  
   * Cập nhật quy trình gắn tag `video` / metafield bài viết video trong trang danh mục `/blogs/video` và các trang chi tiết bài viết video để tự động đồng bộ lên giao diện storefront.

---

# **7\. LỘ TRÌNH PHÁT TRIỂN BASE CODE CHUYÊN MỤC VIDEO CHUẨN HÓA (BASE CODE ROADMAP)**

**Ngày cập nhật:** 12/10/2026  
**Tiêu chuẩn thực thi:** Astra Agentic Workflow Engine  
**Nhánh mã nguồn phát triển:** [gemini-spark/feat-video-category](https://github.com/vuthiet2k/websitePharmaCosmetics/tree/gemini-spark/feat-video-category)  
---

## **7.1. ĐÁNH GIÁ KỸ THUẬT & CÁC KHOẢNG TRỐNG (TECHNICAL GAPS) CẦN KHẮC PHỤC**

Qua rà soát thực tế, nếu chỉ dừng lại ở việc chèn thẻ iframe thủ công vào nội dung bài viết (`article.content`) sẽ phát sinh 4 vấn đề kỹ thuật lớn:

1. **Dữ liệu bị chôn cứng (Data Coupling):** Iframe nằm trong văn bản khiến hệ thống không thể tự động bóc tách được `video_id`, thời lượng, và nguồn (YouTube hay Facebook) để phục vụ cho các trang danh mục (`/blogs/video`), widget video trang chủ hay thanh video gợi ý.  
2. **Nguy cơ sụt giảm điểm Core Web Vitals:** Mỗi iframe YouTube tải kèm \~500KB \- 1MB scripts nặng từ Google; iframe Facebook tải SDK cồng kềnh. Trang danh mục có nhiều video tải đồng thời sẽ khiến điểm PageSpeed di động tụt dốc và gây giật lag giao diện (CLS/TBT).  
3. **Trải nghiệm trang xem chi tiết chưa chuẩn rạp chiếu:** Template `article.bwt` hiện tại được tối ưu cho việc đọc bài viết văn bản dạng tạp chí, không phải không gian xem video chuyên nghiệp với khung Player rạp chiếu 16:9, thanh tương tác kênh, hộp mô tả xám và sidebar video đề xuất.  
4. **Thiếu Schema SEO Video:** Google không thể tự nhận diện bài viết là VideoObject nếu thiếu dữ liệu cấu trúc chuẩn, làm mất cơ hội xếp hạng Video Rich Snippets trên kết quả tìm kiếm Google.

---

## **7.2. MÔ HÌNH KIẾN TRÚC BASE CODE 4 TẦNG (TARGET ARCHITECTURE)**

Hệ thống được thiết kế theo 4 tầng tách biệt, bảo đảm tính module hóa và khả năng mở rộng lâu dài:

* **Tầng 1 \- Data Taxonomy Layer:** Quy chuẩn hóa cách thức lưu trữ dữ liệu video trên Sapo Admin qua hệ thống thẻ Tag (`youtube:<id>`, `facebook:<url>`, `thoiluong:<MM:SS>`, `chude:<tên>`) và Metafield (`metafields.custom.video_url`).  
* **Tầng 2 \- Parser & Embed Engine:** Xây dựng `snippets/video_embed.bwt` (bộ giải mã và nhúng tự động), `snippets/video_card.bwt` (thẻ video tái sử dụng 16:9) và cơ chế Facade Pattern (chỉ tải iframe thật khi bấm Play).  
* **Tầng 3 \- View & Template Layer:** Triển khai `templates/blog.video.bwt` (giao diện lưới video danh mục) và `templates/article.video.bwt` (giao diện xem chi tiết phong cách YouTube Watch Page).  
* **Tầng 4 \- Performance & SEO Layer:** Tích hợp Schema JSON-LD `VideoObject` và tối ưu bộ nhớ đệm.

---

## **7.3. LỘ TRÌNH PHÁT TRIỂN 4 GIAI ĐOẠN (SPRINT ROADMAP)**

### **Giai đoạn 1: Chuẩn hóa Schema Dữ liệu & Bộ Parser Engine**

* **Nội dung:** Xây dựng `snippets/video_embed.bwt` và `snippets/video_card.bwt`.  
* **Mục tiêu:** Biên tập viên nhập liệu bằng bất kỳ hình thức nào (tag, metafield, hoặc dán link trong bài), theme đều tự động nhận diện chính xác nguồn video YouTube hoặc Facebook và render khung responsive tỷ lệ 16:9 an toàn.  
* **Tiến độ:** Đã hoàn thành trên nhánh `gemini-spark/feat-video-category`.

### **Giai đoạn 2: Xây dựng Giao diện Rạp Chiếu (YouTube Watch Page) & Danh Mục Video**

* **Nội dung:**  
  * Triển khai `templates/article.video.bwt` & `snippets/article_video_layout.bwt`: Khung rạp chiếu Cinema 16:9 phía trên, H1 tiêu đề, thanh tương tác kênh ([Kênh YouTube Pharma Cosmetics](https://www.youtube.com/@pharmacosmetics) / Fanpage), hộp mô tả xám kiểu YouTube và sidebar danh sách video đề xuất dạng thẻ ngang bên phải.  
  * Triển khai `templates/blog.video.bwt` & `snippets/blog_video_layout.bwt`: Featured Video Hero đầu trang, thanh lọc nguồn (Tất cả / YouTube / Facebook), lưới video 3 cột hiện đại.  
* **Mục tiêu:** Tạo trải nghiệm xem video tương tự YouTube Watch Page trên website thương hiệu.  
* **Tiến độ:** Đã hoàn thành trên nhánh `gemini-spark/feat-video-category`.

### **Giai đoạn 3: Tối ưu Tốc độ Tải trang (Facade Pattern) & Schema SEO Video**

* **Nội dung:**  
  * Áp dụng cơ chế Facade Pattern: Ban đầu chỉ hiển thị ảnh bìa chất lượng cao kèm nút Play; chỉ chèn iframe thật khi người dùng click vào.  
  * Nhúng Schema JSON-LD `@type: "VideoObject"` đầy đủ thuộc tính `name`, `description`, `thumbnailUrl`, `uploadDate`, `embedUrl`.  
* **Mục tiêu:** Bảo toàn điểm số Google PageSpeed 90+ và xuất hiện Video Rich Snippet trên Google Search.

### **Giai đoạn 4: Kiểm thử, Tích hợp Mock Preview & Bàn giao Sapo Admin**

* **Nội dung:**  
  * Cập nhật mock data `data/articles.js` với 7 video thực tế (YouTube & Facebook) cho blog `video`.  
  * Chạy quy trình kiểm tra `npm run lint:liquid-globals` và `npm run build:sapo` theo quy chế [Rule\&HDKTXD.md](https://github.com/vuthiet2k/websitePharmaCosmetics/blob/hugo-theme-sept2026/Rule&HDKTXD.md).  
  * Bàn giao hướng dẫn nhập liệu cho đội ngũ Content Creator của Pharma Cosmetics.

---

## **7.4. BẢNG TIÊU CHUẨN NGHIỆM THU KỸ THUẬT (ACCEPTANCE CRITERIA)**

| Tiêu chí kỹ thuật | Yêu cầu đạt chuẩn | Phương pháp kiểm chứng |
| :---- | :---- | :---- |
| **Đa nền tảng** | Nhúng chuẩn xác cả video YouTube và Facebook Video Plugin | Kiểm thử trên các đường link video thực tế của cả 2 nền tảng |
| **Responsive 16:9** | Tỷ lệ khung hình luôn chuẩn 16:9 từ màn hình 320px đến 1920px | Kiểm tra F12 DevTools trên Mobile, Tablet và Desktop |
| **Khả năng tự thích ứng** | Tự động nhận diện dù nhập qua Tag, Metafield hay dán link vào bài | Kiểm thử 3 kịch bản tạo bài viết thủ công khác nhau trên Sapo Admin |
| **Bố cục YouTube Watch** | Đầy đủ Player rạp chiếu, thanh kênh, mô tả xám, sidebar video đề xuất | Đối chiếu trực quan với layout YouTube Watch Page |
| **Hiệu năng Core Web Vitals** | Điểm số tải trang không bị suy giảm khi trang chứa nhiều video | Đo bằng Google Lighthouse / PageSpeed Insights |
| **Chuẩn đóng gói Sapo Web** | Build thành công, tương thích hoàn toàn engine Sapo Liquid (.bwt) | Chạy lệnh `npm run build:sapo` thoát mã 0, file zip \< 5MB |

---

## **7.5. QUY TRÌNH BIÊN TẬP VIÊN ĐĂNG BÀI VIDEO TRÊN SAPO ADMIN**

1. **Bước 1:** Vào Sapo Admin → **Website** → **Blog & Bài viết** → Chọn Danh mục **Video**.  
2. **Bước 2:** Nhập Tiêu đề bài viết và tải lên Ảnh đại diện Thumbnail (tỷ lệ 16:9).  
3. **Bước 3 (Gán nguồn video):** Gắn thẻ tags bài viết:  
   * Video YouTube: Gắn tag `youtube:<VIDEO_ID>` (Ví dụ: `youtube:4B9RN_wcl_I`)  
   * Video Facebook: Gắn tag `facebook:<URL_VIDEO>`  
   * Thời lượng: Gắn tag `thoiluong:<MM:SS>` (Ví dụ: `thoiluong:01:23`)  
   * Chủ đề: Gắn tag `chude:<Tên_chủ_đề>` (Ví dụ: `chude:Làm sạch da`)  
4. **Bước 4:** Tại mục **Giao diện bài viết** bên cột phải, chọn template `article.video`.  
5. **Bước 5:** Bấm **Lưu bài viết**. Giao diện bài viết sẽ tự động hiển thị theo định dạng rạp chiếu phong cách YouTube\!