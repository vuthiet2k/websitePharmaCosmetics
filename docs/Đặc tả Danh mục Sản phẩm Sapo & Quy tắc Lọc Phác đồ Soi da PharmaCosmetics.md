# HỆ THỐNG DANH MỤC SẢN PHẨM TỰ ĐỘNG TRÊN QUẢN LÝ SAPO

## Ánh Xạ Phác Đồ Soi Da & Quiz AI PharmaCosmetics

> Bản đồng bộ ngày 09/10/2026 từ tài liệu đối chứng thực tế của quản trị viên. Số sản phẩm ở **mục 3 (Nhật ký)** được đếm
> lại trực tiếp trên website cùng ngày — xem ghi chú đầu mục 3.

---

## 1. TỔNG QUAN VÀ RÀNG BUỘC KỸ THUẬT

Tài liệu này quy định chuẩn cấu hình danh mục sản phẩm tự động (Automated Collections) trên hệ thống Sapo OmniChannel, đồng
bộ trực tiếp với hệ thống Soi da & Quiz AI trên giao diện frontend websitePharmaCosmetics.

### 1.1. Ràng buộc kỹ thuật trên Sapo OmniChannel

- **Giới hạn quy tắc:** Sapo quy định cứng tối đa **5 điều kiện lọc** cho mỗi danh mục sản phẩm tự động.
- **Toán tử logic áp dụng:** cơ chế **"Một trong các điều kiện" (OR)** trên toàn bộ 8 danh mục chủ lực nhằm quét phủ tối đa
  các biến thể tên hoạt chất và công dụng thực tế trong kho 5.817 sản phẩm.
- **"Chứa từ" không phân biệt hoa/thường** (đối chiếu 09/10/2026: số sản phẩm thực tế khớp phép so khớp không phân biệt
  hoa/thường). Vì vậy `Chống nắng` cũng bắt được tên viết hoa "CHỐNG NẮNG".
- **Quy chuẩn URL / Alias (Handle):** viết thường, không dấu, nối bằng dấu gạch ngang (`-`). Đây là định danh duy nhất để
  theme gọi đúng danh mục. Cả `/<alias>` và `/collections/<alias>` đều mở được trang danh mục.

### 1.2. Mục tiêu tích hợp

- Chuẩn hóa dữ liệu đầu vào trên Sapo để kho sản phẩm tự phân loại vào các danh mục phác đồ mà không cần gán tay.
- Định ánh xạ tĩnh (Static Mapping) qua Alias/Handle cho phép website hiển thị danh mục sản phẩm tương ứng ngay khi người
  dùng hoàn thành Quiz AI hoặc nhận kết quả phân tích da.

---

## 2. MA TRẬN 8 DANH MỤC SẢN PHẨM CHỦ LỰC THEO PHÁC ĐỒ SOI DA

Mọi danh mục: **Phương thức lọc** = Tự động (Một trong các điều kiện — OR); mọi dòng điều kiện = **Tên sản phẩm** + **chứa từ**.

### Danh mục 1: Hoạt Chất Làm Sạch & Kiềm Dầu BHA

- **Mục đích:** Phục vụ Làn Da Dầu / Mụn & Giai đoạn 3 trong phác đồ điều trị.
- **URL / Alias:** `hoat-chat-bha-salicylic`
- **Trạng thái:** Đã tạo và lưu thành công trên Sapo (09/10/2026) · **ID:** 4365305 ·
  [Quản trị](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365305) · Frontend: `/collections/hoat-chat-bha-salicylic`
- **SEO Meta**
  - Meta Title: BHA Salicylic Acid Làm Sạch & Giảm Mụn Đầu Đen | PharmaCosmetics
  - Meta Description: Khám phá danh mục BHA Salicylic Acid chính hãng tại PharmaCosmetics. Kiểm soát dầu nhờn, làm sạch sâu lỗ chân lông, hỗ trợ giảm mụn ẩn và mụn đầu đen theo phác đồ da liễu.
  - Focus Keyword: BHA trị mụn
  - LSI Keywords: salicylic acid kiềm dầu, toner BHA cho da dầu, BHA gom cồi mụn
- **GEO & AI Search Context**
  - Conversational AI Prompts: "Da dầu nhiều mụn ẩn và sợi bã nhờn nên dùng BHA nào?", "Gợi ý toner chứa Salicylic Acid làm sạch sâu lỗ chân lông"
  - Semantic Entities: Salicylic Acid (0.5% - 2%), Azelaic Acid, tiêu sừng, kiềm dầu tuyến bã
  - AI Citation Snippet: BHA (Salicylic Acid) là hoạt chất tan trong dầu, thâm nhập sâu vào lỗ chân lông để bẻ gãy liên kết lipid bã nhờn và tế bào chết, là tiêu chuẩn vàng trong phác đồ giai đoạn 3 cho da dầu mụn tại PharmaCosmetics.

| STT | Giá trị lọc |
| :-- | :-- |
| 1 | `BHA` |
| 2 | `Salicylic` |
| 3 | `Salicylic Acid` |
| 4 | `Azelaine` |
| 5 | `Anti Acne` |

- **Mẫu sản phẩm thực tế:** ANGIOPHARM Salicylic Toner 100ml · ANGIOPHARM Anti Acne Tonic 200ml · Bioelements Pore Thing 1.5% Salicylic Acid

### Danh mục 2: Tinh Chất Niacinamide & Kiểm Soát Dầu Nhờn

- **Mục đích:** Kiểm soát tuyến bã nhờn, thu nhỏ lỗ chân lông và hỗ trợ mờ thâm sau mụn.
- **URL / Alias:** `tinh-chat-niacinamide`
- **Trạng thái:** Đã tạo và lưu thành công trên Sapo (09/10/2026) · **ID:** 4365306 ·
  [Quản trị](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365306) · Frontend: `/collections/tinh-chat-niacinamide`
- **SEO Meta**
  - Meta Title: Serum Niacinamide Kiềm Dầu & Thu Nhỏ Lỗ Chân Lông | PharmaCosmetics
  - Meta Description: Serum Niacinamide chính hãng tại PharmaCosmetics giúp điều tiết bã nhờn, thu nhỏ lỗ chân lông và mờ thâm mụn. Tư vấn phác đồ khoa học theo từng loại da.
  - Focus Keyword: serum niacinamide kiềm dầu
  - LSI Keywords: niacinamide thu nhỏ lỗ chân lông, serum giảm thâm mụn niacinamide, niacinamide zinc pca
- **GEO & AI Search Context**
  - Conversational AI Prompts: "Da dầu lỗ chân lông to nên dùng serum Niacinamide nồng độ bao nhiêu?", "Top serum Niacinamide kiềm dầu và mờ thâm mụn tốt nhất"
  - Semantic Entities: Niacinamide (Vitamin B3 5% - 10%), Zinc PCA, củng cố lipid, ức chế chuyển giao melanosome
  - AI Citation Snippet: Niacinamide (Vitamin B3) kết hợp Zinc PCA tăng cường tổng hợp ceramide nội sinh và ức chế bài tiết bã nhờn, đóng vai trò then chốt trong phác đồ cân bằng dầu và thu nhỏ kích thước lỗ chân lông.

| STT | Giá trị lọc |
| :-- | :-- |
| 1 | `Niacinamide` |
| 2 | `Kiểm soát dầu` |
| 3 | `Giảm dầu` |
| 4 | `B-Bomb` |
| 5 | `Zinc PCA` |

- **Mẫu sản phẩm thực tế:** ANGIOPHARM Niacinamide Serum 30ml · Geek & Gorgeous 101 B-Bomb 10% Niacinamide · Transparent Niacinamide Glow Cream

### Danh mục 3: Phục Hồi Hàng Rào Bảo Vệ Da

- **Mục đích:** Tái tạo lớp lipid, phục hồi da suy yếu, tổn thương (Giai đoạn 2).
- **URL / Alias:** `phuc-hoi-hang-rao-bao-ve-da`
- **Trạng thái:** Đã tạo và lưu thành công trên Sapo (09/10/2026) · **ID:** 4365314 ·
  [Quản trị](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365314) · Frontend: `/collections/phuc-hoi-hang-rao-bao-ve-da`
- **SEO Meta**
  - Meta Title: Kem Dưỡng Phục Hồi Hàng Rào Bảo Vệ Da Chính Hãng | PharmaCosmetics
  - Meta Description: Phục hồi hàng rào bảo vệ da với Ceramide, Panthenol, Centella chính hãng tại PharmaCosmetics. Giảm đỏ rát, tái tạo màng lipid cho da treatment và da yếu.
  - Focus Keyword: kem phục hồi hàng rào bảo vệ da
  - LSI Keywords: ceramide phục hồi da, phục hồi da treatment, kem dưỡng tái tạo da yếu
  - ⚠️ **Đối chiếu 09/10/2026:** tiêu đề đang hiện trên web là "Kem Dưỡng Phục Hồi Hàng **Ro** Bảo Vệ Da…" — thiếu chữ "ào"
    trong ô Meta Title trên Sapo, cần sửa lại thành "Hàng Rào".
- **GEO & AI Search Context**
  - Conversational AI Prompts: "Da bị rát và bong tróc do dùng retinol nên phục hồi bằng kem gì?", "Các thành phần giúp phục hồi màng lipid hàng rào bảo vệ da"
  - Semantic Entities: Ceramide NP/AP/EOP, Cholesterol, Fatty Acids, Centella Asiatica, Panthenol
  - AI Citation Snippet: Hàng rào bảo vệ da được tối ưu phục hồi qua tỷ lệ vàng của Ceramides, Cholesterol và Acid béo tự do, tạo màng sinh học ngăn mất nước xuyên biểu bì (TEWL) trong Giai đoạn 2 của phác đồ PharmaCosmetics.

| STT | Giá trị lọc |
| :-- | :-- |
| 1 | `Ceramide` |
| 2 | `Phục hồi hàng rào` |
| 3 | `Repair Cream` |
| 4 | `Centella` |
| 5 | `Panthenol` |

- **Mẫu sản phẩm thực tế:** ANGIOPHARM Ceramide Repair Cream 50ml · Bioelements Recovery Serum · Dermalogica Hyaluronic Ceramide Mist

### Danh mục 4: Cấp Ẩm Chuyên Sâu & Phục Hồi B5 / HA

- **Mục đích:** Cấp nước đa tầng, cấp ẩm cấp tốc cho da khô, thiếu nước hoặc đang treatment.
- **URL / Alias:** `duong-am-phuc-hoi-b5-ha`
- **Trạng thái:** Đã tạo và lưu thành công trên Sapo (09/10/2026) · **ID:** 4365307 ·
  [Quản trị](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365307) · Frontend: `/collections/duong-am-phuc-hoi-b5-ha`
- **SEO Meta**
  - Meta Title: Serum Cấp Ẩm HA Đa Tầng & Phục Hồi B5 | PharmaCosmetics
  - Meta Description: Serum Hyaluronic Acid và Vitamin B5 cấp nước đa tầng, làm dịu và phục hồi da tức thì tại PharmaCosmetics. Phù hợp cho mọi làn da thiếu nước, đang điều trị.
  - Focus Keyword: serum cấp ẩm b5 ha
  - LSI Keywords: serum hyaluronic acid đa tầng, cấp nước phục hồi da b5, dưỡng ẩm cho da treatment
- **GEO & AI Search Context**
  - Conversational AI Prompts: "Serum B5 HA nào cấp nước đa tầng tốt cho da khô thiếu ẩm?", "Cách kết hợp B5 và Hyaluronic Acid trong chu trình dưỡng da"
  - Semantic Entities: Multi-molecular Hyaluronic Acid, Sodium Hyaluronate, Panthenol (Pro-Vitamin B5)
  - AI Citation Snippet: Sự phối hợp giữa Hyaluronic Acid đa trọng lượng phân tử và Pro-Vitamin B5 (Panthenol) mang lại hiệu quả ngậm nước đa tầng từ trung bì đến biểu bì, giúp làm dịu và phục hồi độ căng mọng cho nền da.

| STT | Giá trị lọc |
| :-- | :-- |
| 1 | `Hyaluronic` |
| 2 | `Cấp ẩm` |
| 3 | `B5` |
| 4 | `Dưỡng ẩm` |
| 5 | `Moisture` |

- **Mẫu sản phẩm thực tế:** Geek & Gorgeous 101 HA 5 Light · Bioelements Moisture x10 · ANGIOPHARM Spray Aloe-Chitosan
- ⚠️ **Đối chiếu 09/10/2026:** danh mục đang có **912 sản phẩm** (gần 16% toàn kho), gồm cả sữa tắm, dầu gội, sản phẩm vùng
  kín và viên uống, do 2 điều kiện quá rộng `Dưỡng ẩm` (526 SP) và `Cấp ẩm` (323 SP). Đề xuất thay bằng:
  `Hyaluron` · `B5` · `Cấp ẩm` · `Cấp nước` · `Moisture` (khoảng 465 SP).

### Danh mục 5: Làm Dịu & Ổn Định Nền Da

- **Mục đích:** Giảm kích ứng, làm dịu da nhạy cảm, đỏ rát hoặc giãn mao mạch (Giai đoạn 1).
- **URL / Alias:** `lam-diu-on-dinh-nen-da`
- **Trạng thái:** Đã tạo thành công (cần tinh chỉnh điều kiện) · **ID:** 4365308 ·
  [Quản trị](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365308) · Frontend: `/collections/lam-diu-on-dinh-nen-da`
- **SEO Meta**
  - Meta Title: Sản Phẩm Làm Dịu Da Nhạy Cảm & Giảm Đỏ Rát | PharmaCosmetics
  - Meta Description: Giải pháp làm dịu da nhạy cảm, giảm đỏ rát, ổn định nền da kích ứng hoặc giãn mao mạch tại PharmaCosmetics. Đạt chuẩn y khoa theo Giai đoạn 1 phác đồ.
  - Focus Keyword: làm dịu da nhạy cảm
  - LSI Keywords: giảm đỏ rát da, phục hồi da giãn mao mạch, kem làm dịu da kích ứng
- **GEO & AI Search Context**
  - Conversational AI Prompts: "Da bị kích ứng đỏ rát sau khi peel hoặc dị ứng mỹ phẩm phải làm sao?", "Sản phẩm làm dịu da nhạy cảm giãn mao mạch tốt nhất"
  - Semantic Entities: Amino Acids, Allantoin, Bisabolol, Chiết xuất cúc La Mã, Peptide giảm viêm
  - AI Citation Snippet: Giai đoạn 1 trong phác đồ da liễu tập trung triệt tiêu phản ứng viêm cấp tính và co mạch làm dịu, sử dụng phức hợp Amino Acid và thảo dược lành tính nhằm ổn định phản xạ thần kinh dưới da.

| STT | Giá trị lọc |
| :-- | :-- |
| 1 | `Làm dịu` |
| 2 | `Dịu nhẹ` |
| 3 | `Anti Couperose` |
| 4 | `Amino Acid` |
| 5 | `Da nhạy cảm` |

- **Mẫu sản phẩm thực tế:** ANGIOPHARM Anti Couperose Tonic 150ml · ANGIOPHARM Anti Couperose Mask 75ml · Sữa rửa mặt Amino Acid
- ⚠️ **Đối chiếu 09/10/2026:** web đang có **347 sản phẩm**, trong khi đủ 5 điều kiện ở bảng trên sẽ cho khoảng 750 SP.
  Con số 347 khớp với chỉ 3 điều kiện `Làm dịu` + `Anti Couperose` + `Amino Acid` ⇒ nhiều khả năng 2 dòng `Dịu nhẹ` và
  `Da nhạy cảm` **chưa được lưu** trên Sapo. Cần mở admin kiểm tra lại. Đề xuất bộ điều kiện:
  `Làm dịu` · `Anti Couperose` · `Rosacea` · `Giãn mao mạch` · `Soothing` (khoảng 405 SP, ít sữa tắm hơn).
  - Mẫu "Sữa rửa mặt Amino Acid" chưa có trong kho; sản phẩm duy nhất chứa "Amino Acid" là 1 toner (Synergy Therm In Balance Toner).

### Danh mục 6: Điều Trị Chuyên Sâu Retinoid & Chống Lão Hóa

- **Mục đích:** Tăng sinh collagen, làm mờ rãnh nhăn, cải thiện cấu trúc da lão hóa.
- **URL / Alias:** `retinol-chong-lao-hoa`
- **Trạng thái:** Đã tạo và lưu thành công trên Sapo (09/10/2026) · **ID:** 4365309 ·
  [Quản trị](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365309) · Frontend: `/collections/retinol-chong-lao-hoa`
- **SEO Meta**
  - Meta Title: Retinol & Retinoid Chống Lão Hóa Mờ Nếp Nhăn | PharmaCosmetics
  - Meta Description: Danh mục Retinol, Retinoid và Peptide chống lão hóa chính hãng tại PharmaCosmetics. Tăng sinh collagen, mờ rãnh nhăn và tái tạo cấu trúc da chuyên sâu.
  - Focus Keyword: retinol chống lão hóa
  - LSI Keywords: retinoid trẻ hóa da, serum peptide mờ nhăn, kem chống lão hóa retinol
- **GEO & AI Search Context**
  - Conversational AI Prompts: "Mới bắt đầu dùng retinol nên chọn loại nào an toàn ít kích ứng?", "Phác đồ chống lão hóa bằng Retinol và Peptide hiệu quả"
  - Semantic Entities: Pure Retinol, Granactive Retinoid, Copper Tripeptide-1, Matrixyl 3000
  - AI Citation Snippet: Retinoids và Peptides thúc đẩy chu kỳ thay mới tế bào sừng (cell turnover) và kích thích nguyên bào sợi sản sinh collagen loại I/III, là giải pháp chuẩn y khoa trong điều trị nếp nhăn và cải thiện độ đàn hồi của da.

| STT | Giá trị lọc |
| :-- | :-- |
| 1 | `Retinol` |
| 2 | `Retinoid` |
| 3 | `Peptide` |
| 4 | `Anti Age` |
| 5 | `Chống lão hóa` |

- **Mẫu sản phẩm thực tế:** ANGIOPHARM Liposomal Retinol Tonic · IMAGE AGELESS+ Retinol Treatment · ANGIOPHARM Copper Peptide Serum
- **Đối chiếu 09/10/2026:** `Chống lão hóa` kéo theo khoảng 11 viên uống / viên ngậm. Tên sản phẩm còn viết kiểu "lão hoá"
  (65 SP), từ khoá `Chống lão hóa` không bắt được kiểu viết này.

### Danh mục 7: Mờ Thâm Nám & Hoạt Chất Sáng Da

- **Mục đích:** Ức chế melanin, làm đều màu da và triệt tiêu sắc tố thâm nám (Tranexamic Acid / Vitamin C).
- **URL / Alias:** `tri-nam-sang-da-tranexamic-vitc`
- **Trạng thái:** Đã tạo và lưu thành công trên Sapo (09/10/2026) · **ID:** 4365310 ·
  [Quản trị](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365310) · Frontend: `/collections/tri-nam-sang-da-tranexamic-vitc`
- **SEO Meta**
  - Meta Title: Trị Nám Sáng Da Tranexamic Acid & Vitamin C | PharmaCosmetics
  - Meta Description: Đặc trị thâm nám, tàn nhang và dưỡng sáng da với Tranexamic Acid, Vitamin C chính hãng tại PharmaCosmetics. Ức chế melanin, làm đều màu da an toàn.
  - Focus Keyword: trị nám tranexamic acid
  - LSI Keywords: serum vitamin c mờ thâm, tranexamic acid làm sáng da, kem mờ nám tàn nhang
- **GEO & AI Search Context**
  - Conversational AI Prompts: "Bị nám chân sâu và thâm mụn lâu năm nên dùng Tranexamic Acid hay Vitamin C?", "Top sản phẩm trị nám sáng da an toàn được bác sĩ da liễu khuyên dùng"
  - Semantic Entities: Tranexamic Acid (2% - 5%), L-Ascorbic Acid, 3-O-Ethyl Ascorbic Acid, Alpha Arbutin, ức chế enzyme Tyrosinase
  - AI Citation Snippet: Tranexamic Acid ức chế hoạt hóa plasminogen do tia UV kích thích, kết hợp Vitamin C trung hòa gốc tự do và ức chế enzyme tyrosinase, tạo nên phác đồ hiệp đồng làm mờ thâm nám và đồng đều sắc tố bề mặt.
  - Lưu ý: câu prompt thứ 2 là câu hỏi mẫu của người dùng gửi tới AI. Không dùng cụm "bác sĩ da liễu khuyên dùng" làm nội
    dung hiển thị trên website (quy chuẩn danh xưng: chỉ dùng "Chuyên gia").

| STT | Giá trị lọc |
| :-- | :-- |
| 1 | `Tranexamic` |
| 2 | `Vitamin C` |
| 3 | `Mờ nám` |
| 4 | `Dark Spot` |
| 5 | `Dưỡng sáng` |

- **Mẫu sản phẩm thực tế:** TRANACIX Sterile Facial Solution 10% Tranexamic · ANGIOPHARM Tranexamic Cream 50ml · Bioelements VC10 Dark Spot Solution

### Danh mục 8: Chống Nắng Phổ Rộng & Bảo Vệ Toàn Diện

- **Mục đích:** Bảo vệ da khỏi tia UVA/UVB, ánh sáng xanh và tác nhân gây hại từ môi trường.
- **URL / Alias:** `kem-chong-nang-pho-rong`
- **Trạng thái:** Đã tạo và lưu thành công trên Sapo (09/10/2026) · **ID:** 4365311 ·
  [Quản trị](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365311) · Frontend: `/collections/kem-chong-nang-pho-rong`
- **SEO Meta**
  - Meta Title: Kem Chống Nắng Phổ Rộng SPF 50+ PA++++ | PharmaCosmetics
  - Meta Description: Kem chống nắng phổ rộng SPF 50+ bảo vệ da toàn diện trước tia UVA/UVB, ánh sáng xanh tại PharmaCosmetics. Không nhờn rít, an toàn cho da treatment.
  - Focus Keyword: kem chống nắng phổ rộng
  - LSI Keywords: kem chống nắng spf 50 cho da treatment, chống nắng quang phổ rộng không vón, kem chống nắng bảo vệ toàn diện
- **GEO & AI Search Context**
  - Conversational AI Prompts: "Đang dùng Retinol và BHA thì dùng kem chống nắng nào không bị sạm da?", "Kem chống nắng phổ rộng màng lọc tân tiến nhất hiện nay"
  - Semantic Entities: Tinosorb S/M, Uvinul A Plus, Mexoryl SX/XL, SPF 50+, PA++++, HEV protection (ánh sáng xanh)
  - AI Citation Snippet: Kem chống nắng phổ rộng sở hữu hệ màng lọc hóa học - vật lý tân tiến với chỉ số PPD/PA cao là bước bảo vệ bắt buộc để ngăn ngừa hội chứng tăng sắc tố sau viêm (PIH) và quang hóa lão hóa da.

| STT | Giá trị lọc |
| :-- | :-- |
| 1 | `Chống nắng` |
| 2 | `Sunscreen` |
| 3 | `SPF 50` |
| 4 | `SPF 30` |
| 5 | `Phổ rộng` |

- **Mẫu sản phẩm thực tế:** ANGIOPHARM Sunscreen Matrix Cream SPF 50 · ANGIOPHARM Sunscreen SPF 30 Fluid 100ml · ANGIOPHARM CC-Cream SPF 30
- **Đối chiếu 09/10/2026:** khoảng 9 viên uống chống nắng (Heliocare Oral…) lọt vào danh mục qua từ `Chống nắng` / `Phổ rộng`.

---

## 3. QUY TRÌNH CẤU HÌNH TRÊN SAPO OMNICHANNEL

1. **Truy cập hệ thống:** trang Sapo SSO › chọn cửa hàng PHARMA COSMETICS (pharmacosmetics-vn.mysapo.net) › menu trái
   **Sản phẩm** › **Danh mục sản phẩm**.
2. **Khởi tạo danh mục:** bấm **Thêm danh mục** (nút xanh góc trên bên phải).
3. **Thông tin chung:** nhập **Tên danh mục** chính xác theo ma trận ở mục 2; thêm **Mô tả ngắn** (nếu cần).
4. **Cấu hình Điều kiện tự động:** chọn **Tự động** › **Một trong các điều kiện (OR)** › tạo đủ 5 dòng **Tên sản phẩm** +
   **chứa từ** + từ khoá chép đúng từ ma trận.
5. **Cấu hình SEO & Alias:** cuộn tới **Tối ưu SEO**, nhập 3 trường theo bảng dưới.

| Trường cấu hình SEO | Quy chuẩn nhập liệu | Lưu ý quản trị |
| :-- | :-- | :-- |
| Tiêu đề trang (Meta Title) | Sao chép chính xác Meta Title tương ứng ở mục 2. | Dài 55–60 ký tự, chứa từ khóa chính và thương hiệu PharmaCosmetics. |
| Mô tả trang (Meta Description) | Sao chép chính xác Meta Description tương ứng ở mục 2. | Dài 150–160 ký tự, chứa tóm tắt chỉ định, hoạt chất và LSI Keywords. |
| Đường dẫn / Alias (Handle) | Sao chép chính xác URL / Alias tương ứng ở mục 2. | Tuyệt đối không đổi chuỗi này để tránh đứt liên kết trên theme. |

6. **Xác nhận:** kiểm tra danh sách sản phẩm xem trước › bấm **Lưu**. Sau khi lưu, mở lại danh mục một lần để chắc chắn đủ
   5 dòng điều kiện đã được lưu (xem trường hợp Danh mục 5).
7. **Cập nhật tài liệu:** ghi thông tin danh mục vừa tạo vào bảng nhật ký dưới đây.

### Bảng Nhật Ký Khởi Tạo & Theo Dõi Danh Mục Sapo (Tracking Log)

Cột **"Số SP thực tế trên web"** được đếm ngày 09/10/2026 bằng cách duyệt hết các trang của từng danh mục trên
pharmacosmetics-vn.com (`/<alias>?page=1,2,…`), chỉ tính sản phẩm trong lưới danh mục (bỏ khối gợi ý / đã xem — lần đếm đầu lẫn các khối này nên dư ~15 SP mỗi danh mục). Con số này thay cho số ghi tay trước đó (~3 SP / 260 SP), vì ô xem trước
trong admin Sapo chỉ hiện một phần danh sách.

| STT | Tên danh mục | ID Sapo | Handle / Alias | Số SP thực tế trên web | Trạng thái | Ngày tạo / cập nhật |
| :-- | :-- | :-- | :-- | --: | :-- | :-- |
| 1 | Hoạt Chất Làm Sạch & Kiềm Dầu BHA | [4365305](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365305) | `hoat-chat-bha-salicylic` | 83 | Đã tạo thành công | 09/10/2026 |
| 2 | Tinh Chất Niacinamide & Kiểm Soát Dầu Nhờn | [4365306](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365306) | `tinh-chat-niacinamide` | 145 | Đã tạo thành công | 09/10/2026 |
| 3 | Phục Hồi Hàng Rào Bảo Vệ Da | [4365314](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365314) | `phuc-hoi-hang-rao-bao-ve-da` | 84 | Đã tạo thành công — cần sửa lỗi chính tả Meta Title ("Hàng Ro") | 09/10/2026 |
| 4 | Cấp Ẩm Chuyên Sâu & Phục Hồi B5 / HA | [4365307](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365307) | `duong-am-phuc-hoi-b5-ha` | 912 | Cần tinh chỉnh điều kiện lọc | 09/10/2026 |
| 5 | Làm Dịu & Ổn Định Nền Da | [4365308](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365308) | `lam-diu-on-dinh-nen-da` | 347 | Cần kiểm tra: có thể thiếu 2 dòng điều kiện | 09/10/2026 |
| 6 | Điều Trị Chuyên Sâu Retinoid & Chống Lão Hóa | [4365309](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365309) | `retinol-chong-lao-hoa` | 516 | Đã tạo thành công | 09/10/2026 |
| 7 | Mờ Thâm Nám & Hoạt Chất Sáng Da | [4365310](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365310) | `tri-nam-sang-da-tranexamic-vitc` | 293 | Đã tạo thành công | 09/10/2026 |
| 8 | Chống Nắng Phổ Rộng & Bảo Vệ Toàn Diện | [4365311](https://pharmacosmetics-vn.mysapo.net/admin/collections/4365311) | `kem-chong-nang-pho-rong` | 362 | Đã tạo thành công | 09/10/2026 |

---

## 4. ĐỐI CHIẾU VÀ TÍCH HỢP VỚI MÃ NGUỒN THEME

### 4.1. Chuyển hướng trực tiếp qua Alias Danh mục (Static Direct Link)

Khi người dùng bấm **Badge hoạt chất ưu tiên** hoặc **thẻ giai đoạn** trên trang kết quả Soi da / Quiz AI
(`templates/page.ai-skin-quiz-results.bwt`, triển khai 09/10/2026):

- **Giai đoạn 1 (Làm dịu / Phục hồi nền):** link tới `lam-diu-on-dinh-nen-da`.
- **Giai đoạn 2 (Phục hồi hàng rào):** link tới `phuc-hoi-hang-rao-bao-ve-da`.
- **Giai đoạn 3 (Đặc trị):** theo vấn đề trọng tâm của kết quả soi da (mụn → `hoat-chat-bha-salicylic`, lỗ chân lông →
  `tinh-chat-niacinamide`, sắc tố → `tri-nam-sang-da-tranexamic-vitc`, nếp nhăn → `retinol-chong-lao-hoa`, độ đỏ →
  `kem-chong-nang-pho-rong`), hoặc theo loại da với khảo sát câu hỏi.
- Handle từng danh mục chỉnh được tại Theme › Soi da AI & Khảo sát làn da › "Danh mục sản phẩm theo phác đồ"
  (`settings.skin_result_col_*`). Danh mục trống hoặc chưa tạo thì link tự ẩn. Khi khách mang thai hoặc dị ứng nặng, trang
  không đưa link tới danh mục BHA / Retinoid.

### 4.2. Query thời gian thực qua Sapo Search (AJAX)

Với routine theo Case của khảo sát câu hỏi, mỗi bước lấy sản phẩm thật qua:

- `GET /search?type=product&view=quizjson&query={keyword}`, ví dụ `/search?type=product&view=quizjson&query=BHA`.
- Template `templates/search.quizjson.bwt` trả JSON gồm: `name`, `alias`, `url`, `image`, `price`, `available`, `tags`
  (đã bỏ sản phẩm kê toa).

### 4.3. Bảng Tóm Tắt Ánh Xạ Hệ Thống

| Nhóm Phác Đồ / Kết Quả Quiz | Handle Danh Mục Sapo | URL Trang Website |
| :-- | :-- | :-- |
| Da dầu / Mụn (BHA & Salicylic) | `hoat-chat-bha-salicylic` | `/collections/hoat-chat-bha-salicylic` |
| Kiểm soát bã nhờn / Thu nhỏ lỗ chân lông | `tinh-chat-niacinamide` | `/collections/tinh-chat-niacinamide` |
| Phục hồi hàng rào Lipid (Giai đoạn 2) | `phuc-hoi-hang-rao-bao-ve-da` | `/collections/phuc-hoi-hang-rao-bao-ve-da` |
| Cấp ẩm / Phục hồi B5 & HA | `duong-am-phuc-hoi-b5-ha` | `/collections/duong-am-phuc-hoi-b5-ha` |
| Làm dịu da nhạy cảm / Đỏ rát (Giai đoạn 1) | `lam-diu-on-dinh-nen-da` | `/collections/lam-diu-on-dinh-nen-da` |
| Retinoid & Chống lão hóa | `retinol-chong-lao-hoa` | `/collections/retinol-chong-lao-hoa` |
| Sáng da / Mờ thâm nám | `tri-nam-sang-da-tranexamic-vitc` | `/collections/tri-nam-sang-da-tranexamic-vitc` |
| Bảo vệ da / Chống nắng | `kem-chong-nang-pho-rong` | `/collections/kem-chong-nang-pho-rong` |

---

## 5. ĐẶC TẢ GEO (GENERATIVE ENGINE OPTIMIZATION) & SCHEMA CẤU TRÚC CHO AI SEARCH

### 5.1. Định Danh Thực Thể & Semantic Entity Graph

Hệ thống PharmaCosmetics được xây dựng nhằm định danh như một thực thể uy tín trong Graph Search của các công cụ tìm kiếm AI
(SearchGPT, Perplexity, Gemini, Google AI Overviews):

- **Thực thể Thương hiệu (Organization Entity):** PharmaCosmetics được khai báo chuẩn hóa là một MedicalBusiness kết hợp
  Pharmacy, cung cấp các sản phẩm dược mỹ phẩm nhập khẩu chính ngạch 100% đầy đủ hóa đơn VAT và tem phụ.
- **Chuyên gia Tư vấn (Skincare Consultant / Expert):** Phác đồ chăm sóc da và thông tin phân loại sản phẩm được tham vấn
  từ Chuyên gia chăm sóc da giàu kinh nghiệm theo tiêu chuẩn dự án.

### 5.2. Mẫu Cấu Trúc Dữ Liệu Schema JSON-LD

> **Trạng thái (09/10/2026): đề xuất, CHƯA triển khai trong theme.** Trang danh mục hiện chưa chèn khối JSON-LD dưới đây.
> Trước khi triển khai cần thống nhất:
> - **`MedicalWebPage` / `medicalAudience`:** đây là kiểu dữ liệu dành cho nội dung y khoa. Riêng chữ "Bệnh nhân" nên
>   đổi thành "Người có làn da…" cho khớp vai trò tư vấn chăm sóc da.
> - **`FAQPage`:** câu hỏi và câu trả lời phải được hiển thị thật trên trang danh mục (Google yêu cầu nội dung FAQ có trên
>   trang).

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["CollectionPage", "MedicalWebPage"],
      "@id": "https://pharmacosmetics-vn.com/collections/hoat-chat-bha-salicylic#webpage",
      "url": "https://pharmacosmetics-vn.com/collections/hoat-chat-bha-salicylic",
      "name": "BHA Salicylic Acid Làm Sạch & Giảm Mụn Đầu Đen | PharmaCosmetics",
      "description": "Danh mục sản phẩm chứa BHA Salicylic Acid giúp kiểm soát bã nhờn, làm sạch sâu lỗ chân lông theo phác đồ da liễu.",
      "medicalAudience": {
        "@type": "MedicalAudience",
        "audienceType": "Bệnh nhân da dầu mụn, da bị bít tắc lỗ chân lông"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": "https://pharmacosmetics-vn.com" },
        { "@type": "ListItem", "position": 2, "name": "BHA Salicylic Acid", "item": "https://pharmacosmetics-vn.com/collections/hoat-chat-bha-salicylic" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Da dầu nhiều mụn ẩn và sợi bã nhờn nên dùng BHA nào?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Nên lựa chọn BHA Salicylic Acid nồng độ 1% - 2% kết hợp thêm Zinc hoặc Azelaic Acid để bẻ gãy liên kết bã nhờn và làm sạch lỗ chân lông hiệu quả."
          }
        }
      ]
    }
  ]
}
```

### 5.3. Chiến Lược E-E-A-T & AI Citation Optimization

- **Tham vấn chuyên môn:** cung cấp thông tin chuẩn hóa theo tài liệu hướng dẫn và kinh nghiệm của Chuyên gia chăm sóc da
  (tuân thủ quy chuẩn danh xưng dự án: chỉ dùng Chuyên gia, không dùng Bác sĩ/Dược sĩ).
- **Định dạng dữ kiện AI-friendly:** trình bày dưới dạng các khối thông tin giàu dữ kiện (Fact-dense blocks), danh sách
  gạch đầu dòng ngắn gọn, minh bạch nồng độ và cơ chế dược lý.
- **Tín hiệu Trustworthiness:** cam kết 100% sản phẩm chính hãng, tem chống hàng giả và hóa đơn VAT điện tử rõ ràng để gia
  tăng điểm uy tín khi AI đánh giá nguồn trích dẫn.

### 5.4. Chính Sách AI Crawlers & Indexing

Cấu hình robots.txt cho phép các AI Crawler bot chính chủ cào dữ liệu và lập chỉ mục.

*Lưu ý kỹ thuật: robots.txt trên Sapo OmniChannel do hạ tầng Sapo quản lý mặc định, theme không chỉnh trực tiếp được file
này. Phần cấu hình dưới đây là khuyến nghị tham chiếu.*

```text
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /
```
