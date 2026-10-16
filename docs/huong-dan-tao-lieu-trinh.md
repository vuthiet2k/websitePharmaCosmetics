# Hướng dẫn tạo sản phẩm LIỆU TRÌNH (Skin Health Beauty)

Áp dụng cho mọi liệu trình/dịch vụ trị liệu da bán dưới dạng **sản phẩm Sapo** trong danh mục liệu trình
(hiện tại: **Điều trị chuyên nghiệp** — `dieu-tri-chuyen-nghiep`). Trang chi tiết dùng giao diện
**`product.lieu-trinh`** — bố cục theo hồ sơ thiết kế bàn giao IT của GetGlowing Micro-Peel (2026-10-17), tự co giãn
**laptop (≥ 992px), tablet và mobile (390px)**. Mẫu chuẩn đã nhập đủ: sản phẩm
*Elaine Brennan GetGlowing Micro-Peel* (mục 8).

> Nguyên tắc: **chỉ nhập dữ liệu thật**. Phần nào chưa có dữ liệu thì để trống — trang tự ẩn phần đó, không hiện ô trống,
> ảnh giả hay số liệu bịa. Ảnh trước–sau chỉ dùng ca thật của chính liệu trình, khách đã đồng ý.

---

## 1. Bố cục trang & nguồn dữ liệu

| # | Phần trên trang | Lấy dữ liệu từ | Trống thì |
| :-- | :-- | :-- | :-- |
| 1 | **Banner** toàn ngang | Ảnh sản phẩm có alt chứa `[banner]` (+ `[banner-mobile]`) | Không hiện dải banner |
| 2 | **Giới thiệu**: nhãn nhỏ · H1 · tiêu đề phụ · đoạn giới thiệu · 2 nút | Tag `nhan:` (mặc định trong cấu hình) · tag `tieude:` (mặc định = tên SP) · tag `phude:` · **Mô tả ngắn** · cấu hình | Ẩn dòng tương ứng |
| 2b | Ảnh bên phải phần giới thiệu (khi không có banner) | Ảnh alt `[hero]` → ảnh `[sanpham]` → ảnh đầu tiên | Chữ chiếm toàn ngang |
| 3 | **Vấn đề da** (thẻ, ảnh 4:3, tên CHỮ HOA) | Tag `vande:<handle bài>` → bài trong blog **Vấn đề da** (`van-de-da`) | Ẩn cả phần |
| 4 | **Công nghệ & hoạt chất**: nhãn = hãng · tiêu đề = tên ngắn (CHỮ HOA) · mô tả · ảnh · thẻ hoạt chất | **Nhà cung cấp/Hãng** · tag `tenngan:` · tag `congthuc:` · ảnh `[congthuc]` (→ `[sanpham]`) · tag `hoatchat:<handle>` → blog **Hoạt chất** (`hoat-chat`) | Ẩn phần/ảnh |
| 5 | **Quy trình 1:1** (5 bước, dùng chung mọi liệu trình) | Cấu hình theme › "Trang liệu trình (sản phẩm)"; ảnh bước = ảnh SP alt `[buoc-1]`…`[buoc-5]`, không có thì ảnh chung trong cấu hình | Bước thiếu ảnh hiện khung icon |
| 6 | **Thông tin chi tiết** (thu gọn, nút "Xem thêm") | **Mô tả chi tiết** sản phẩm | Ẩn |
| 7 | **Trước – sau** | Bài blog **Trước & Sau** (`truoc-va-sau`) có tag `lieutrinh:<alias SP>` + `anhtruoc:` + `anhsau:` | Ẩn cả phần |
| 8 | **Thông tin & đặt lịch**: bảng · nút đặt lịch · hotline · dòng thương hiệu | Tag `hinhthuc:` `thoigian:` `sobuoi:` `diadiem:` · **giá sản phẩm** (0 ⇒ "Liên hệ tư vấn") · cấu hình | Dòng trống ẩn / dùng mặc định |
| 9 | **FAQ** (+ JSON-LD FAQPage cho Google) | Bài blog **Câu hỏi liệu trình** (`cau-hoi-lieu-trinh`) có tag `sanpham:<alias SP>` | Ẩn |
| — | Thanh đặt lịch bám đáy (mobile) | Cấu hình `lt_sticky_cta` | — |

Nút **Đặt lịch** tự mở `/dat-lich-tu-van?handle=<alias SP>` ⇒ trang đặt lịch chọn sẵn đúng liệu trình.

---

## 2. Chuẩn bị 1 lần (đã có thì bỏ qua)

1. **Blog** (Website › Bài viết › Danh mục bài viết): `van-de-da` (Vấn đề da), `cau-hoi-lieu-trinh` (Câu hỏi liệu trình),
   `hoat-chat` (đã có), `truoc-va-sau` (đã có). Đổi handle khác thì sửa ở Cấu hình theme › "Trang liệu trình (sản phẩm)".
2. **Cấu hình theme › "Trang liệu trình (sản phẩm)"**: chữ dùng chung (nhãn, tiêu đề các phần, 5 bước quy trình, nhãn bảng
   thông tin, nút, dòng thương hiệu). `[ten]` trong chữ tự thay bằng tên ngắn liệu trình. Ảnh chung cho 5 bước (tuỳ chọn).

## 3. Tạo sản phẩm liệu trình

| Trường Sapo | Nhập |
| :-- | :-- |
| Tên sản phẩm | Tên đầy đủ (SEO). H1 trên trang dùng tag `tieude:` nếu có. |
| Mô tả ngắn | **Đoạn giới thiệu** đầu trang (1–2 đoạn, chữ thường, không tô màu). |
| Mô tả chi tiết | Bài đầy đủ: ưu điểm, thành phần, đối tượng phù hợp, **trường hợp cần thận trọng**, quy trình, phục hồi, chăm sóc sau. Dùng Heading/đậm/gạch đầu dòng; không chỉnh cỡ chữ/màu thủ công. |
| Nhà cung cấp | Tên hãng (vd `Elaine Brennan`) — hiện thành nhãn nhỏ phần công nghệ. |
| Giá | Giá liệu trình (0 ⇒ "Liên hệ tư vấn"). |
| Danh mục | **Điều trị chuyên nghiệp** (và danh mục khác nếu cần). |
| **Giao diện** | **`product.lieu-trinh`** (bắt buộc — không chọn thì hiện như sản phẩm thường). |
| SEO | Tiêu đề ≤ 60 ký tự, mô tả ≤ 160 ký tự, đường dẫn ngắn không dấu. |

### 3.1. Ảnh sản phẩm (sửa "Văn bản thay thế/alt" từng ảnh)

Ghi **khoá trong ngoặc vuông** ở đầu alt để theme nhận diện ảnh, sau đó là mô tả thật của ảnh (phần mô tả giúp SEO; trang liệu trình dùng tên liệu trình làm alt hiển thị).

| Khoá alt | Ảnh | Kích thước gợi ý |
| :-- | :-- | :-- |
| *(ảnh đầu tiên)* | Ảnh đại diện — hiện ở thẻ sản phẩm danh mục, nên là lọ/sản phẩm nền sáng | 1:1, ≥ 1000px |
| `[sanpham]` | Lọ sản phẩm chính hãng (không có thì dùng ảnh đầu) | 1:1 |
| `[banner]` | Banner đã duyệt, toàn ngang | 1920×900, WebP |
| `[banner-mobile]` | Banner bản dọc cho điện thoại (tuỳ chọn) | ~1080×1350 |
| `[hero]` | Ảnh bên phải phần giới thiệu khi không có banner | 1:1 |
| `[congthuc]` | Infographic công thức/hoạt chất | 1:1 |
| `[buoc-1]`…`[buoc-5]` | Ảnh thực tế từng bước tại Skin Health Beauty | 4:3, 1200×900 |

Ví dụ alt: `[buoc-3] Chuyên viên thực hiện GetGlowing Micro-Peel tại Skin Health Beauty`.
Ảnh trước–sau **không** đưa vào ảnh sản phẩm để làm kết quả — xem mục 6.

### 3.2. Tag khoá:giá trị

Giá trị **không được chứa dấu phẩy** (Sapo tách tag theo dấu phẩy — thay bằng "–" hoặc "và"). Tag SEO thường (không có `:`) vẫn giữ được.

| Tag | Ý nghĩa | Ví dụ |
| :-- | :-- | :-- |
| `tenngan:` | Tên ngắn — tiêu đề phần công nghệ, bảng thông tin, `[ten]` | `tenngan:GetGlowing Micro-Peel` |
| `tieude:` | H1 (khác tên sản phẩm) | `tieude:GetGlowing Micro-Peel – Liệu trình peel da đa mục tiêu tại Hà Nội` |
| `nhan:` | Nhãn nhỏ trên H1 | `nhan:SKIN HEALTH BEAUTY · TRỊ LIỆU DA 1:1` |
| `phude:` | Tiêu đề phụ | `phude:Một liệu trình – Nhiều mục tiêu cải thiện làn da` |
| `congthuc:` | Mô tả ngắn phần công nghệ | `congthuc:Công thức peel chuyên nghiệp hướng tới cải thiện kết cấu – bít tắc và sắc tố trên bề mặt da.` |
| `hinhthuc:` | Hình thức (mặc định "Trị liệu da 1:1") | `hinhthuc:Trị liệu da 1:1` |
| `thoigian:` | Thời gian thực hiện | `thoigian:Khoảng 30–60 phút tùy quy trình` |
| `sobuoi:` | Liệu trình/số buổi (mặc định "Cá nhân hóa sau khi đánh giá da") | `sobuoi:Tham khảo 6 buổi – cách nhau 2–6 tuần` |
| `diadiem:` | Địa điểm (mặc định trong cấu hình) | `diadiem:Skin Health Beauty – Hà Nội` |
| `vande:` | 1 vấn đề da (lặp lại, theo thứ tự hiển thị) | `vande:mun-va-bit-tac` |
| `hoatchat:` | 1 hoạt chất (lặp lại, theo thứ tự) | `hoatchat:resorcinol` |

## 4. Bài "Vấn đề da" (blog `van-de-da`) — dùng chung giữa các liệu trình

| Trường bài viết | Nhập |
| :-- | :-- |
| Tiêu đề | Tên vấn đề (trang tự in CHỮ HOA) — vd `Mụn và bít tắc` |
| Đường dẫn (handle) | Không dấu — đúng giá trị gắn ở tag `vande:` — vd `mun-va-bit-tac` |
| Trích dẫn (tóm tắt) | 1 câu mô tả — vd *Hỗ trợ giảm tích tụ tế bào sừng và tình trạng bít tắc nang lông.* |
| Ảnh đại diện | 4:3 (1200×900) — ảnh lâm sàng có bản quyền hoặc ảnh khách đồng ý. Có ảnh ⇒ dưới lưới hiện ghi chú "Ảnh minh họa…, không phải kết quả". |

## 5. Bài "Hoạt chất" (blog `hoat-chat`) — dùng chung với trang sản phẩm

Tiêu đề = tên hoạt chất · handle = giá trị tag `hoatchat:` · Trích dẫn = công dụng 1–2 câu · tag `vaitro:` = nhãn vai trò
(vd `vaitro:TÁI TẠO BỀ MẶT`) · tag `nhom:`/`inci:` như thư viện hoạt chất. **Chỉ ghi nồng độ khi đã đối chiếu INCI/tài liệu kỹ thuật chính thức.**

## 6. Bài "Trước – sau" (blog `truoc-va-sau`) — chỉ ca thật

Tiêu đề = tên ca (vd *Sắc tố và kết cấu da*) · tag `lieutrinh:<alias sản phẩm>` · `anhtruoc:<link ảnh>` · `anhsau:<link ảnh>`
(bắt buộc đủ 2 ảnh, cùng góc chụp/ánh sáng, không chỉnh sửa) · tuỳ chọn `tuan:<số tuần>` · `phacdo:<phương pháp kết hợp>`.
**Không dùng** ảnh của hãng hay của liệu trình khác (vd Skin Renewal Peeling System) làm kết quả. Tối đa 4 ca/trang.

## 7. Bài "Câu hỏi liệu trình" (blog `cau-hoi-lieu-trinh`)

Tiêu đề = câu hỏi · Nội dung = trả lời · tag `sanpham:<alias sản phẩm>` (1 câu dùng cho nhiều liệu trình thì gắn nhiều tag).

---

## 8. Mẫu đã nhập: GetGlowing Micro-Peel (alias `elaine-brennan-getglowing-micro-peel-lieu-trinh-peel-chuyen-nghiep-ho-tro-lam-sang-va-cai-thien-be-mat-da`)

**Việc cần làm trên Sapo Admin** (preview đã mô phỏng đúng các giá trị dưới):

1. Sản phẩm › Giao diện: `product.lieu-trinh`.
2. Mô tả ngắn (thay "THƯƠNG HIỆU / XUẤT XỨ" — thông tin này đã có ở Nhà cung cấp và Mô tả chi tiết):
   > GetGlowing Micro-Peel là liệu trình tái tạo bề mặt đa mục tiêu dành cho nền da phù hợp, hỗ trợ cải thiện bít tắc, thâm mụn, sắc tố không đồng đều, bề mặt thô ráp và các dấu hiệu lão hóa sớm.
   >
   > Tại Skin Health Beauty, mỗi làn da được phân tích, cá nhân hóa và theo dõi xuyên suốt liệu trình bởi chuyên gia có hơn 10 năm kinh nghiệm trong lĩnh vực chăm sóc và trị liệu da.
3. Thêm tag (giữ các tag SEO đang có):
   `tenngan:GetGlowing Micro-Peel`, `tieude:GetGlowing Micro-Peel – Liệu trình peel da đa mục tiêu tại Hà Nội`,
   `phude:Một liệu trình – Nhiều mục tiêu cải thiện làn da`,
   `congthuc:Công thức peel chuyên nghiệp hướng tới cải thiện kết cấu – bít tắc và sắc tố trên bề mặt da.`,
   `thoigian:Khoảng 30–60 phút tùy quy trình`, `diadiem:Skin Health Beauty – Hà Nội`,
   `vande:mun-va-bit-tac`, `vande:tham-sau-mun`, `vande:sac-to-khong-dong-deu`, `vande:be-mat-san-rap`, `vande:dau-hieu-lao-hoa-som`,
   `hoatchat:resorcinol`, `hoatchat:salicylic-acid`, `hoatchat:kojic-acid`.
4. Alt 8 ảnh hiện có (theo thứ tự trên Sapo):

   | Ảnh | Nội dung | Alt |
   | :-- | :-- | :-- |
   | 1 | Lọ sản phẩm nền trắng | `[sanpham] Lọ Elaine Brennan GetGlowing Micro-Peel` |
   | 2 | Banner GETGLOWING MICRO-PEEL (vuông) | `[hero] GetGlowing Micro-Peel – peel chuyên nghiệp làm sáng và cải thiện bề mặt da` |
   | 3 | Infographic "Công thức đa tác động" | `[congthuc] Công thức đa tác động: Resorcinol – Kojic Acid – Salicylic Acid` |
   | 4, 6, 8 | Ảnh trước–sau (không rõ là khách SHB) | Không gắn khoá — **không dùng làm kết quả** |
   | 5 | Thao tác với lọ, xông hơi | `[buoc-2] Làm sạch và chuẩn bị bề mặt trước khi peel` |
   | 7 | Thao tác với lọ trên mặt khách | `[buoc-3] Thực hiện GetGlowing Micro-Peel` |

5. Tạo 5 bài **Vấn đề da**: `mun-va-bit-tac` (Mụn và bít tắc), `tham-sau-mun` (Thâm sau mụn), `sac-to-khong-dong-deu`
   (Sắc tố không đồng đều), `be-mat-san-rap` (Bề mặt sần ráp), `dau-hieu-lao-hoa-som` (Dấu hiệu lão hóa sớm) — trích dẫn
   theo hồ sơ bàn giao (đã có trong dữ liệu mẫu `data/articles.js`).
6. Tạo 3 bài **Hoạt chất**: `resorcinol` (`vaitro:TÁI TẠO BỀ MẶT`), `salicylic-acid` (`vaitro:KIỂM SOÁT BÍT TẮC`),
   `kojic-acid` (`vaitro:HỖ TRỢ ĐIỀU HÒA SẮC TỐ`).
7. Tạo 4 bài **Câu hỏi liệu trình** (bong da · số buổi · da nhạy cảm · chăm sóc sau peel) với tag `sanpham:<alias>`.
8. SEO sản phẩm — Tiêu đề: `GetGlowing Micro-Peel tại Hà Nội | Skin Health Beauty`; Mô tả: `GetGlowing Micro-Peel tại Hà Nội.
   Liệu trình peel đa mục tiêu hỗ trợ cải thiện bít tắc, thâm mụn, sắc tố và bề mặt da. Trị liệu cá nhân hóa 1:1.`
9. Trang nội dung cũ `/getglowing-micro-peel-ha-noi` vẫn hiện liệu trình này (cấu hình `lt_page_product`) với thẻ canonical về URL
   sản phẩm — nên tạo **chuyển hướng 301** trang đó → URL sản phẩm (Website › Chuyển hướng URL).

**Ảnh còn thiếu (cần chụp/thiết kế, đặt alt theo bảng 3.1):** banner 1920×900 đã duyệt (`[banner]`), ảnh bước 1/4/5
(`[buoc-1]`, `[buoc-4]`, `[buoc-5]` hoặc ảnh chung trong cấu hình), ảnh 4:3 cho 5 bài vấn đề da, ảnh trước–sau ca thật đã đồng ý.

---

## 9. Kiểm tra trước khi công bố (laptop + mobile)

1. Mở URL sản phẩm trên laptop và điện thoại: H1 đúng, nút đặt lịch mở trang đặt lịch đã chọn sẵn liệu trình, không có
   phần trống/ảnh vỡ, tên vấn đề da/hoạt chất CHỮ HOA, thanh đặt lịch bám đáy không che nút liên hệ.
2. Dev: `npm run preview` rồi `AUDIT_PAGES="/<alias>" npm run audit:ui` (Git Bash: thêm `MSYS_NO_PATHCONV=1`) — 0 lỗi ở 1440px và 390px.
3. Danh mục liệu trình: thẻ sản phẩm hiện ảnh đầu tiên (ảnh đại diện) gọn, tên không lộ dòng thứ 3.
