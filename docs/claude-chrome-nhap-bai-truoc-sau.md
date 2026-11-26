# Claude in Chrome — Nhập bài TRƯỚC & SAU (Shorts YouTube) lên Sapo

> Tài liệu giao việc cho **Claude in Chrome** (tiện ích Claude trên Chrome) để tạo các bài trong danh mục bài viết
> **Trước & Sau** từ short YouTube của kênh [@pharmacosmetics](https://www.youtube.com/@pharmacosmetics/shorts).
> Dữ liệu ở mục 5 đã được **cào và làm sạch ngày 25/11/2026**. Nguồn duy nhất là trang của từng short: tiêu đề, mã video,
> thời lượng và ngày đăng. **Cả 14 short đều để trống phần mô tả**, nên bài viết không được có thêm câu chuyện, kết quả
> hay thông tin khách nào ngoài các giá trị đã có ở mục 5.
> Cách theme đọc các ô và tag: [huong-dan-tao-ca-truoc-sau.md](./huong-dan-tao-ca-truoc-sau.md).

## 0. Cách giao việc

1. Chủ dự án **tự đăng nhập** trang quản trị Sapo trên Chrome. Claude không nhập mật khẩu hay mã xác thực.
2. Mở tiện ích Claude in Chrome, dán **toàn bộ khối lệnh ở mục 1**, rồi dán tiếp **phần dữ liệu của các bài cần nhập**
   lấy từ mục 5. Nên giao **1 bài trước** để duyệt, đạt yêu cầu rồi mới giao các bài còn lại.
3. Claude in Chrome phải chạy trên **chính máy có repo**, vì ảnh đại diện nằm ở
   `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\<đường dẫn bài>.jpg`
   (ảnh bìa dọc 1080×1920 của chính short đó, mỗi ảnh dưới 300 KB). Nếu Chrome chạy ở máy khác thì để trống ảnh và
   ghi vào báo cáo. Theme vẫn tự dùng ảnh bìa short trên trang chủ, nhưng trang /truoc-va-sau sẽ không hiện ca chưa có ảnh.

## 1. Khối lệnh dán cho Claude in Chrome

```text
Bạn nhập bài viết lên trang quản trị Sapo của Pharma Cosmetics (tôi đã đăng nhập sẵn).
Việc: với MỖI bài trong phần DỮ LIỆU tôi dán bên dưới, vào Website › Bài viết › Đăng bài viết mới và điền đúng các ô.

LUẬT BẮT BUỘC — vi phạm thì dừng lại và báo tôi:
1. CHỈ dùng đúng giá trị trong DỮ LIỆU, dán nguyên văn. Không viết thêm, không diễn giải, không "làm hay hơn".
   KHÔNG thêm: tên/tuổi/tỉnh của khách, số buổi, sản phẩm, hoạt chất, tình trạng da, % cải thiện, lời chuyên gia,
   đánh giá sao, số lượt xem. Kênh YouTube để trống mô tả nên những thông tin này KHÔNG có nguồn.
2. Không dùng các từ "điều trị", "chữa", "khỏi hẳn", "cam kết", "100%", "Bác sĩ", "BS.", "DS.". Danh xưng chỉ dùng "Chuyên gia".
3. Tag: mỗi tag gõ xong bấm Enter. Gõ đúng dạng khoá:giá trị như dữ liệu, không thêm dấu cách quanh dấu ":",
   không có dấu phẩy. Không thêm tag nào khác.
4. Nội dung: bấm nút "Mã HTML" (biểu tượng <>) của trình soạn thảo, xoá hết nội dung cũ trong ô, dán khối HTML, rồi tắt
   chế độ Mã HTML. Không thêm trích dẫn (blockquote), danh sách đánh số hay ảnh khác: theme sẽ hiểu nhầm chúng là
   "nhận định chuyên gia" hoặc "lộ trình".
5. Chỉ tạo bài mới. KHÔNG sửa, ẩn hay xoá bài có sẵn (kể cả bài [DEMO]). Không đổi Cấu hình theme, danh mục, menu.
6. Gặp bất cứ điều gì khác với dữ liệu thì DỪNG và hỏi tôi, không tự quyết, ví dụ:
   - đường dẫn bị báo trùng;
   - không có danh mục "Trước & Sau";
   - không có khung giao diện "article.truoc-va-sau";
   - đã có bài trùng tiêu đề hoặc trùng mã youtube.
7. Trước khi bấm Lưu: đọc lại từng ô so với dữ liệu (đặc biệt Tag, Đường dẫn, Danh mục, Khung giao diện).

CÁC Ô CẦN ĐIỀN (theo thứ tự trên màn hình Đăng bài viết mới):
- Tiêu đề: giá trị "Tiêu đề".
- Nội dung: khối HTML (luật 4).
- Tóm tắt: bấm "Thêm tóm tắt", dán giá trị "Tóm tắt".
- Tuỳ chỉnh SEO (Xem trước kết quả tìm kiếm): Tiêu đề trang, Mô tả trang, Đường dẫn = các giá trị SEO.
  Đường dẫn phải đúng chuỗi không dấu đã cho; Sapo tự thêm phần đầu.
- Ảnh bài viết: tải lên file ảnh ở đường dẫn đã cho. Không tìm thấy file thì để trống và ghi vào báo cáo.
- Danh mục: chọn "Trước & Sau" (handle truoc-va-sau). Chỉ chọn danh mục này.
- Tag: các tag đã cho (luật 3).
- Khung giao diện: chọn "article.truoc-va-sau".
- Tác giả: để mặc định, không đổi.
- Trạng thái: Hiển thị.
Bấm Lưu. Sau khi lưu, mở trang bài ngoài website (nút Xem/biểu tượng mắt) và kiểm:
  có H1 đúng Tiêu đề, video phát được, không có chữ thừa.

THỨ TỰ: nhập từ bài có số LỚN NHẤT đến bài số NHỎ NHẤT. Bài lưu sau hiện trước trên trang chủ, nên làm vậy để
trang chủ hiện đúng thứ tự Bài 1, 2, 3…

BÁO CÁO CUỐI (bảng): Số bài | Tiêu đề | Đường dẫn thật sau khi lưu | Đã có ảnh? | Ghi chú/khác biệt.

DỮ LIỆU:
(dán phần dữ liệu các bài từ mục 5 ở đây)
```

## 2. Quy tắc làm sạch đã áp dụng (để soát lại khi thêm short mới)

| Quy tắc | Áp dụng |
| :-- | :-- |
| Tiêu đề bài | Lấy tiêu đề short. Bỏ đuôi «By/by Pharma Cosmetics», «x SHB», «cùng PHARMA COSMETICS». Viết hoa đầu câu (không VIẾT HOA cả câu). Sửa lỗi gõ rõ ràng (vd thiếu «hoá»). Thống nhất chính tả **«hoá»**. Mở đầu bằng «Trước và sau» cho đồng bộ danh mục. ≤ 60 ký tự. |
| Đường dẫn | Không dấu, chữ thường, nối bằng «-», **duy nhất**, có số tháng và dịch vụ để không trùng (vd 2 ca «6 tháng từ xa» khác nhau ở chữ «boi-thoa»). |
| SEO — Tiêu đề trang | = Tiêu đề bài. Thêm « \| Pharma Cosmetics» chỉ khi tổng ≤ 60 ký tự (hiện chưa ca nào đủ chỗ). |
| SEO — Mô tả trang | 1 câu nêu thời gian + hình thức chăm sóc theo đúng tiêu đề short, kèm câu miễn trừ «Kết quả … tuỳ … cơ địa». ≤ 160 ký tự. |
| Tóm tắt | 1 câu, chỉ nhắc lại dữ kiện của tiêu đề. |
| Tag `thoigian:` / `dichvu:` | Chỉ gắn khi **tiêu đề short nói rõ**. Không rõ ⇒ không gắn và đánh dấu ⚠ chờ chủ dự án chốt. |
| Ảnh đại diện | Ảnh bìa dọc của chính short (`i.ytimg.com/vi/<ID>/oar2.jpg`). Không dùng ảnh của ca khác hay ảnh của hãng. |
| Không đưa vào | Short không có tiêu đề (`UQBaishcp4E`, 54 giây, đăng 09/10/2025) và các short review/kiến thức sản phẩm. |

## 3. Kiểm tra sau khi nhập (chủ dự án)

- Trang chủ, khối **Trước & Sau**:
  - tab tự hiện «Cá nhân hoá từ xa / Chăm sóc tại nhà / Phòng 1:1 + tại nhà»;
  - nhãn thời gian đúng;
  - rê chuột thì video **tự phát** (tắt tiếng) ngay trong thẻ; bấm thẻ thì mở **trang chi tiết bài viết** của ca (video nhúng trong bài);
  - thẻ **không có biểu tượng ▶**; không có thanh tiến trình dưới băng trượt (cập nhật 26/11/2026, chủ dự án);
  - dải thông tin dưới thẻ: **đang chờ chủ dự án chốt** (chữ «Cá nhân hoá chăm sóc da từ xa» lặp ở mọi thẻ là thừa).
- **6 bài [DEMO] cũ** của danh mục cũng hiện trong khối, dưới dạng thẻ không có video. Muốn bỏ thì chủ dự án tự Ẩn/Xoá
  trên Sapo (Claude in Chrome không được làm việc này).
- Trang **/truoc-va-sau** gom ca theo tag `nhom:`, tức vấn đề da. Tiêu đề short không nêu vấn đề da nên các bài này
  **không có `nhom:`** và sẽ nằm chung nhóm «Kết quả khác». Muốn chia nhóm thì chủ dự án (người biết ca thật) thêm `nhom:`
  vào từng bài sau. Không để Claude đoán.
- Thư mục `phase/truoc-sau-shorts/` là chỗ làm tạm: nhập xong thì xoá.

## 4. Thêm short mới về sau

Cào lại trang kênh để lấy tiêu đề, mã video và ngày đăng, rồi áp dụng bảng mục 2 và thêm 1 khối dữ liệu theo mẫu
mục 5. Không thêm ca nào chưa có short công khai trên kênh.

## 5. Dữ liệu 13 bài (thứ tự hiển thị mong muốn trên trang chủ)

**Chủ dự án đã chốt 25/11/2026** cho 3 bài thiếu dữ kiện: Bài 6 không gắn `thoigian:`; Bài 8 vào tab «Chăm sóc tại nhà»;
Bài 13 không gắn `dichvu:` và `thoigian:` (chỉ hiện ở tab «Tất cả»). Nhập đúng như dữ liệu dưới đây.

### Bài 1 — Trước và sau 6 tháng cá nhân hoá chăm sóc da từ xa

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/8DIFL9D6fZA — «Da trước và sau 6 tháng cá nhân hoá chăm sóc da từ xa By Pharma Cosmetics» · 10s · đăng 2026-11-20 |
| **Tiêu đề** | Trước và sau 6 tháng cá nhân hoá chăm sóc da từ xa |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 6 tháng khi được cá nhân hoá chăm sóc da từ xa cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (50/60) | Trước và sau 6 tháng cá nhân hoá chăm sóc da từ xa |
| **SEO — Mô tả trang** (157/160) | Video thực tế của Pharma Cosmetics: da khách hàng trước và sau 6 tháng khi được cá nhân hoá chăm sóc da từ xa. Kết quả khác nhau tuỳ tình trạng da và cơ địa. |
| **SEO — Đường dẫn** | `truoc-va-sau-6-thang-ca-nhan-hoa-cham-soc-da-tu-xa` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-6-thang-ca-nhan-hoa-cham-soc-da-tu-xa.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:8DIFL9D6fZA`<br>`dichvu:Cá nhân hoá từ xa`<br>`thoigian:6 tháng`<br>`phacdo:Cá nhân hoá chăm sóc da từ xa` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 6 tháng khi được cá nhân hoá chăm sóc da từ xa cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/8DIFL9D6fZA" title="Trước và sau 6 tháng cá nhân hoá chăm sóc da từ xa" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 2 — Trước và sau 12 tháng cá nhân hoá chăm sóc da từ xa

> Ghi chú làm sạch: Tiêu đề YouTube viết «cá nhân chăm sóc» (thiếu «hoá») — đã sửa chính tả

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/4LK_AMoadts — «Trước và sau 12 tháng cá nhân chăm sóc da từ xa By Pharma Cosmetics» · 10s · đăng 2026-11-20 |
| **Tiêu đề** | Trước và sau 12 tháng cá nhân hoá chăm sóc da từ xa |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 12 tháng khi được cá nhân hoá chăm sóc da từ xa cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (51/60) | Trước và sau 12 tháng cá nhân hoá chăm sóc da từ xa |
| **SEO — Mô tả trang** (158/160) | Video thực tế của Pharma Cosmetics: da khách hàng trước và sau 12 tháng khi được cá nhân hoá chăm sóc da từ xa. Kết quả khác nhau tuỳ tình trạng da và cơ địa. |
| **SEO — Đường dẫn** | `truoc-va-sau-12-thang-ca-nhan-hoa-cham-soc-da-tu-xa` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-12-thang-ca-nhan-hoa-cham-soc-da-tu-xa.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:4LK_AMoadts`<br>`dichvu:Cá nhân hoá từ xa`<br>`thoigian:12 tháng`<br>`phacdo:Cá nhân hoá chăm sóc da từ xa` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 12 tháng khi được cá nhân hoá chăm sóc da từ xa cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/4LK_AMoadts" title="Trước và sau 12 tháng cá nhân hoá chăm sóc da từ xa" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 3 — Trước và sau 3 năm cá nhân hoá chăm sóc da từ xa

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/Y4rbmmZri3s — «Trước và sau 3 năm cá nhân hoá chăm sóc da từ xa By Pharma Cosmetics» · 10s · đăng 2026-11-20 |
| **Tiêu đề** | Trước và sau 3 năm cá nhân hoá chăm sóc da từ xa |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 3 năm khi được cá nhân hoá chăm sóc da từ xa cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (48/60) | Trước và sau 3 năm cá nhân hoá chăm sóc da từ xa |
| **SEO — Mô tả trang** (155/160) | Video thực tế của Pharma Cosmetics: da khách hàng trước và sau 3 năm khi được cá nhân hoá chăm sóc da từ xa. Kết quả khác nhau tuỳ tình trạng da và cơ địa. |
| **SEO — Đường dẫn** | `truoc-va-sau-3-nam-ca-nhan-hoa-cham-soc-da-tu-xa` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-3-nam-ca-nhan-hoa-cham-soc-da-tu-xa.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:Y4rbmmZri3s`<br>`dichvu:Cá nhân hoá từ xa`<br>`thoigian:3 năm`<br>`phacdo:Cá nhân hoá chăm sóc da từ xa` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 3 năm khi được cá nhân hoá chăm sóc da từ xa cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/Y4rbmmZri3s" title="Trước và sau 3 năm cá nhân hoá chăm sóc da từ xa" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 4 — Trước và sau 4 tháng cá nhân hoá chăm sóc da từ xa

> Ghi chú làm sạch: Tiêu đề YouTube viết «chăm sóc từ xa» (thiếu «da») — đã thêm cho thống nhất

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/92Yz7YmUBTs — «Trước và sau 4 tháng cá nhân hoá chăm sóc từ xa by Pharma Cosmetics» · 10s · đăng 2026-11-20 |
| **Tiêu đề** | Trước và sau 4 tháng cá nhân hoá chăm sóc da từ xa |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 4 tháng khi được cá nhân hoá chăm sóc da từ xa cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (50/60) | Trước và sau 4 tháng cá nhân hoá chăm sóc da từ xa |
| **SEO — Mô tả trang** (157/160) | Video thực tế của Pharma Cosmetics: da khách hàng trước và sau 4 tháng khi được cá nhân hoá chăm sóc da từ xa. Kết quả khác nhau tuỳ tình trạng da và cơ địa. |
| **SEO — Đường dẫn** | `truoc-va-sau-4-thang-ca-nhan-hoa-cham-soc-da-tu-xa` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-4-thang-ca-nhan-hoa-cham-soc-da-tu-xa.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:92Yz7YmUBTs`<br>`dichvu:Cá nhân hoá từ xa`<br>`thoigian:4 tháng`<br>`phacdo:Cá nhân hoá chăm sóc da từ xa` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 4 tháng khi được cá nhân hoá chăm sóc da từ xa cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/92Yz7YmUBTs" title="Trước và sau 4 tháng cá nhân hoá chăm sóc da từ xa" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 5 — Trước và sau 6 tháng kiên trì bôi thoa cá nhân hoá từ xa

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/2dAaKAGGqVU — «Trước và sau 6 tháng kiên trì bôi thoa cá nhân hoá từ xa By Pharma Cosmetics» · 10s · đăng 2026-11-19 |
| **Tiêu đề** | Trước và sau 6 tháng kiên trì bôi thoa cá nhân hoá từ xa |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 6 tháng khi kiên trì bôi thoa theo hướng dẫn cá nhân hoá từ xa cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (56/60) | Trước và sau 6 tháng kiên trì bôi thoa cá nhân hoá từ xa |
| **SEO — Mô tả trang** (157/160) | Video thực tế: da khách hàng trước và sau 6 tháng khi kiên trì bôi thoa theo hướng dẫn cá nhân hoá từ xa cùng Pharma Cosmetics. Kết quả tuỳ cơ địa mỗi người. |
| **SEO — Đường dẫn** | `truoc-va-sau-6-thang-kien-tri-boi-thoa-ca-nhan-hoa-tu-xa` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-6-thang-kien-tri-boi-thoa-ca-nhan-hoa-tu-xa.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:2dAaKAGGqVU`<br>`dichvu:Cá nhân hoá từ xa`<br>`thoigian:6 tháng`<br>`phacdo:Bôi thoa cá nhân hoá từ xa` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 6 tháng khi kiên trì bôi thoa theo hướng dẫn cá nhân hoá từ xa cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/2dAaKAGGqVU" title="Trước và sau 6 tháng kiên trì bôi thoa cá nhân hoá từ xa" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 6 — Da trước và sau cá nhân hoá chăm sóc da từ xa

> Đã chốt 25/11/2026: tiêu đề không ghi thời gian ⇒ không gắn `thoigian:`.

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/w-KH01h6oBo — «Da trước và sau cá nhân hoá chăm sóc da từ xa By Pharma Cosmetics» · 10s · đăng 2026-11-20 |
| **Tiêu đề** | Da trước và sau cá nhân hoá chăm sóc da từ xa |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau khi được cá nhân hoá chăm sóc da từ xa cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (45/60) | Da trước và sau cá nhân hoá chăm sóc da từ xa |
| **SEO — Mô tả trang** (149/160) | Video thực tế của Pharma Cosmetics: da khách hàng trước và sau khi được cá nhân hoá chăm sóc da từ xa. Kết quả khác nhau tuỳ tình trạng da và cơ địa. |
| **SEO — Đường dẫn** | `da-truoc-va-sau-ca-nhan-hoa-cham-soc-da-tu-xa` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\da-truoc-va-sau-ca-nhan-hoa-cham-soc-da-tu-xa.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:w-KH01h6oBo`<br>`dichvu:Cá nhân hoá từ xa`<br>`phacdo:Cá nhân hoá chăm sóc da từ xa` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau khi được cá nhân hoá chăm sóc da từ xa cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/w-KH01h6oBo" title="Da trước và sau cá nhân hoá chăm sóc da từ xa" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 7 — Trước và sau 18 tháng cá nhân hoá chăm sóc da tại nhà từ xa

> Ghi chú làm sạch: Tiêu đề YouTube không có chữ «Trước và sau» — đã thêm cho thống nhất danh mục

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/Nd6zX0--xTM — «18 tháng cá nhân hóa chăm sóc da tại nhà từ xa cùng PHARMA COSMETICS» · 9s · đăng 2026-11-06 |
| **Tiêu đề** | Trước và sau 18 tháng cá nhân hoá chăm sóc da tại nhà từ xa |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 18 tháng khi chăm sóc da tại nhà theo hướng dẫn cá nhân hoá từ xa cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (59/60) | Trước và sau 18 tháng cá nhân hoá chăm sóc da tại nhà từ xa |
| **SEO — Mô tả trang** (160/160) | Video thực tế: da khách hàng trước và sau 18 tháng khi chăm sóc da tại nhà theo hướng dẫn cá nhân hoá từ xa cùng Pharma Cosmetics. Kết quả tuỳ cơ địa mỗi người. |
| **SEO — Đường dẫn** | `truoc-va-sau-18-thang-ca-nhan-hoa-cham-soc-da-tai-nha-tu-xa` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-18-thang-ca-nhan-hoa-cham-soc-da-tai-nha-tu-xa.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:Nd6zX0--xTM`<br>`dichvu:Chăm sóc tại nhà`<br>`thoigian:18 tháng`<br>`phacdo:Chăm sóc da tại nhà từ xa` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 18 tháng khi chăm sóc da tại nhà theo hướng dẫn cá nhân hoá từ xa cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/Nd6zX0--xTM" title="Trước và sau 18 tháng cá nhân hoá chăm sóc da tại nhà từ xa" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 8 — Trước và sau 6 tháng kiên trì bôi thoa tại nhà cá nhân hoá từ xa

> Đã chốt 25/11/2026: tiêu đề có cả «tại nhà» và «từ xa» ⇒ tab «Chăm sóc tại nhà».

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/jBRkBbuK11s — «Trước và sau 6 tháng kiên trì bôi thoa tại nhà cá nhân hoá từ xa By Pharma Cosmetics» · 10s · đăng 2026-11-20 |
| **Tiêu đề** | Trước và sau 6 tháng kiên trì bôi thoa tại nhà cá nhân hoá từ xa |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 6 tháng khi bôi thoa tại nhà theo hướng dẫn cá nhân hoá từ xa cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (56/60) | Trước và sau 6 tháng bôi thoa tại nhà, cá nhân hoá từ xa |
| **SEO — Mô tả trang** (156/160) | Video thực tế: da khách hàng trước và sau 6 tháng khi bôi thoa tại nhà theo hướng dẫn cá nhân hoá từ xa cùng Pharma Cosmetics. Kết quả tuỳ cơ địa mỗi người. |
| **SEO — Đường dẫn** | `truoc-va-sau-6-thang-boi-thoa-tai-nha-ca-nhan-hoa-tu-xa` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-6-thang-boi-thoa-tai-nha-ca-nhan-hoa-tu-xa.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:jBRkBbuK11s`<br>`dichvu:Chăm sóc tại nhà`<br>`thoigian:6 tháng`<br>`phacdo:Bôi thoa tại nhà – cá nhân hoá từ xa` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 6 tháng khi bôi thoa tại nhà theo hướng dẫn cá nhân hoá từ xa cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/jBRkBbuK11s" title="Trước và sau 6 tháng kiên trì bôi thoa tại nhà cá nhân hoá từ xa" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 9 — Trước và sau 4 tháng kiên trì bôi thoa tại nhà

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/9b_svlpErJM — «Trước và sau 4 tháng kiên trì bôi thoa tại nhà By Pharma Cosmetics» · 10s · đăng 2026-11-19 |
| **Tiêu đề** | Trước và sau 4 tháng kiên trì bôi thoa tại nhà |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 4 tháng khi kiên trì bôi thoa tại nhà cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (46/60) | Trước và sau 4 tháng kiên trì bôi thoa tại nhà |
| **SEO — Mô tả trang** (148/160) | Video thực tế của Pharma Cosmetics: da khách hàng trước và sau 4 tháng khi kiên trì bôi thoa tại nhà. Kết quả khác nhau tuỳ tình trạng da và cơ địa. |
| **SEO — Đường dẫn** | `truoc-va-sau-4-thang-kien-tri-boi-thoa-tai-nha` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-4-thang-kien-tri-boi-thoa-tai-nha.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:9b_svlpErJM`<br>`dichvu:Chăm sóc tại nhà`<br>`thoigian:4 tháng`<br>`phacdo:Kiên trì bôi thoa tại nhà` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 4 tháng khi kiên trì bôi thoa tại nhà cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/9b_svlpErJM" title="Trước và sau 4 tháng kiên trì bôi thoa tại nhà" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 10 — Trước và sau 8 tháng cá nhân hoá chăm sóc da tại nhà

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/rhnfHUa6ZgU — «Trước và sau 8 tháng cá nhân hoá chăm sóc da tại nhà by Pharma Cosmetics» · 10s · đăng 2026-11-15 |
| **Tiêu đề** | Trước và sau 8 tháng cá nhân hoá chăm sóc da tại nhà |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 8 tháng khi được cá nhân hoá chăm sóc da tại nhà cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (52/60) | Trước và sau 8 tháng cá nhân hoá chăm sóc da tại nhà |
| **SEO — Mô tả trang** (159/160) | Video thực tế của Pharma Cosmetics: da khách hàng trước và sau 8 tháng khi được cá nhân hoá chăm sóc da tại nhà. Kết quả khác nhau tuỳ tình trạng da và cơ địa. |
| **SEO — Đường dẫn** | `truoc-va-sau-8-thang-ca-nhan-hoa-cham-soc-da-tai-nha` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-8-thang-ca-nhan-hoa-cham-soc-da-tai-nha.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:rhnfHUa6ZgU`<br>`dichvu:Chăm sóc tại nhà`<br>`thoigian:8 tháng`<br>`phacdo:Cá nhân hoá chăm sóc da tại nhà` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 8 tháng khi được cá nhân hoá chăm sóc da tại nhà cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/rhnfHUa6ZgU" title="Trước và sau 8 tháng cá nhân hoá chăm sóc da tại nhà" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 11 — Trước và sau 4 tháng cá nhân hoá chăm sóc da tại nhà

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/TGUo0MstxbI — «Trước và sau 4 tháng cá nhân hoá chăm sóc da tại nhà by Pharma Cosmetics» · 10s · đăng 2026-11-15 |
| **Tiêu đề** | Trước và sau 4 tháng cá nhân hoá chăm sóc da tại nhà |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 4 tháng khi được cá nhân hoá chăm sóc da tại nhà cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (52/60) | Trước và sau 4 tháng cá nhân hoá chăm sóc da tại nhà |
| **SEO — Mô tả trang** (159/160) | Video thực tế của Pharma Cosmetics: da khách hàng trước và sau 4 tháng khi được cá nhân hoá chăm sóc da tại nhà. Kết quả khác nhau tuỳ tình trạng da và cơ địa. |
| **SEO — Đường dẫn** | `truoc-va-sau-4-thang-ca-nhan-hoa-cham-soc-da-tai-nha` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-4-thang-ca-nhan-hoa-cham-soc-da-tai-nha.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:TGUo0MstxbI`<br>`dichvu:Chăm sóc tại nhà`<br>`thoigian:4 tháng`<br>`phacdo:Cá nhân hoá chăm sóc da tại nhà` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 4 tháng khi được cá nhân hoá chăm sóc da tại nhà cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/TGUo0MstxbI" title="Trước và sau 4 tháng cá nhân hoá chăm sóc da tại nhà" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 12 — Trước và sau 9 tháng phục hồi tại Spa và chăm sóc da tại nhà

> Ghi chú làm sạch: Bỏ «kiên trì» và «x SHB» cho tiêu đề ≤ 60 ký tự

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/2MEedOR1tvY — «Trước và sau 9 tháng kiên trì phục hồi tại Spa và chăm sóc da tại nhà by Pharma Cosmetics x SHB» · 10s · đăng 2026-11-15 |
| **Tiêu đề** | Trước và sau 9 tháng phục hồi tại Spa và chăm sóc da tại nhà |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau 9 tháng khi kết hợp phục hồi tại Spa và chăm sóc da tại nhà cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (60/60) | Trước và sau 9 tháng phục hồi tại Spa và chăm sóc da tại nhà |
| **SEO — Mô tả trang** (154/160) | Video thực tế: da khách hàng trước và sau 9 tháng khi kết hợp phục hồi tại Spa và chăm sóc da tại nhà cùng Pharma Cosmetics. Kết quả tuỳ cơ địa mỗi người. |
| **SEO — Đường dẫn** | `truoc-va-sau-9-thang-phuc-hoi-tai-spa-va-cham-soc-da-tai-nha` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-9-thang-phuc-hoi-tai-spa-va-cham-soc-da-tai-nha.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:2MEedOR1tvY`<br>`dichvu:Phòng 1:1 + tại nhà`<br>`thoigian:9 tháng`<br>`phacdo:Phục hồi tại Spa + chăm sóc tại nhà` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau 9 tháng khi kết hợp phục hồi tại Spa và chăm sóc da tại nhà cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/2MEedOR1tvY" title="Trước và sau 9 tháng phục hồi tại Spa và chăm sóc da tại nhà" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

### Bài 13 — Trước và sau phác đồ phục hồi da cá nhân hoá

> Đã chốt 25/11/2026: tiêu đề không nói dịch vụ và thời gian ⇒ không gắn `dichvu:`/`thoigian:`.

| Ô trên Sapo | Giá trị (dán nguyên văn) |
| :-- | :-- |
| Nguồn | https://www.youtube.com/shorts/f5xyDZ7P5k0 — «TRƯỚC & SAU PHÁC ĐỒ PHỤC HỒI DA CÁ NHÂN HOÁ BY PHARMA COSMETICS» · 10s · đăng 2026-11-20 |
| **Tiêu đề** | Trước và sau phác đồ phục hồi da cá nhân hoá |
| **Tóm tắt** | Video ngắn ghi lại làn da của khách hàng trước và sau với phác đồ phục hồi da cá nhân hoá cùng Pharma Cosmetics. |
| **SEO — Tiêu đề trang** (44/60) | Trước và sau phác đồ phục hồi da cá nhân hoá |
| **SEO — Mô tả trang** (146/160) | Video thực tế của Pharma Cosmetics: da khách hàng trước và sau với phác đồ phục hồi da cá nhân hoá. Kết quả khác nhau tuỳ tình trạng da và cơ địa. |
| **SEO — Đường dẫn** | `truoc-va-sau-phac-do-phuc-hoi-da-ca-nhan-hoa` |
| **Ảnh bài viết** | `E:\PHARMA COSMETICS\websitePharmaCosmetics\phase\truoc-sau-shorts\anh-dai-dien\truoc-va-sau-phac-do-phuc-hoi-da-ca-nhan-hoa.jpg` |
| **Tag** (mỗi dòng 1 tag, Enter) | `youtube:f5xyDZ7P5k0`<br>`phacdo:Phác đồ phục hồi da cá nhân hoá` |

**Nội dung** (bấm nút Mã HTML `<>` của trình soạn thảo rồi dán):

```html
<p>Video ngắn ghi lại làn da của khách hàng trước và sau với phác đồ phục hồi da cá nhân hoá cùng Pharma Cosmetics.</p>
<p><iframe width="315" height="560" src="https://www.youtube.com/embed/f5xyDZ7P5k0" title="Trước và sau phác đồ phục hồi da cá nhân hoá" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>
<p><em>Kết quả khác nhau tuỳ tình trạng da, cơ địa và mức độ tuân thủ phác đồ.</em></p>
```

