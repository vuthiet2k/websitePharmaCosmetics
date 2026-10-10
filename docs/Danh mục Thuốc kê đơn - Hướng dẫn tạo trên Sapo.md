# DANH MỤC THUỐC KÊ ĐƠN TRÊN SAPO — HƯỚNG DẪN TẠO & DANH SÁCH SẢN PHẨM

Ngày lập: 10/10/2026 · Cửa hàng: PHARMA COSMETICS (pharmacosmetics-vn.mysapo.net)

> Danh sách ở mục 3–5 lập tự động từ tên 5.814 sản phẩm đang bán (09/10/2026) và danh mục `isotretinoin` trên web.
> Đây là **ứng viên** — dược sĩ phụ trách phải xác nhận từng sản phẩm trước khi đưa vào danh mục.

## 1. Theme đang nhận diện thuốc kê đơn thế nào

- Sản phẩm thuộc danh mục chọn ở **Giao diện › Tuỳ chỉnh › Trang sản phẩm › "Sản phẩm kê toa"** (`product_rx_collection`)
  ⇒ theme coi là thuốc kê đơn (`snippets/pc_is_rx.bwt`). Khi đó:
  - Thẻ sản phẩm (danh mục, tìm kiếm, kết quả soi da/khảo sát): **không hiện giá, không nút thêm giỏ / xem nhanh**, chỉ
    "Liên hệ tư vấn" + xem chi tiết.
  - Trang chi tiết: khối "THUỐC KÊ ĐƠN · CẦN TƯ VẤN TRƯỚC KHI DÙNG", 3 bước tư vấn Zalo, không nút mua; JSON-LD không có giá.
  - Trang kết quả soi da / khảo sát: không gợi ý sản phẩm kê đơn.
- **Hiện tại** ô này đang chọn danh mục `isotretinoin` ("ISOTRETINOIN (ĐƯỜNG UỐNG)") — chỉ **16 sản phẩm** isotretinoin uống
  được coi là kê đơn. Các thuốc bôi kê đơn khác (tretinoin, adapalene, clindamycin, hydroquinone, tazarotene…) **vẫn hiện
  giá và nút mua** trên web.
- Theme chỉ ẩn được luồng mua **trên giao diện**. Muốn chặn hẳn việc đặt hàng (kể cả qua link giỏ hàng trực tiếp) phải cấu
  hình thêm trong Sapo Admin (vd ẩn sản phẩm khỏi kênh bán / không cho đặt hàng).

## 2. Danh mục cần tạo

| Trường | Giá trị |
| :-- | :-- |
| Tên danh mục | **Thuốc kê đơn** |
| Alias / Đường dẫn | `thuoc-ke-don` (đã kiểm tra 10/10/2026: chưa được dùng) |
| Điều kiện | **Thủ công** (khuyến nghị — xem lý do dưới) |
| Khung giao diện | `collection` |
| Gắn lên menu | Không cần (danh mục dùng để theme nhận diện, không cần hiện ở menu) |
| Meta Title | Thuốc Kê Đơn — Cần Tư Vấn Trước Khi Dùng \| PharmaCosmetics |
| Meta Description | Các thuốc điều trị da cần được tư vấn và kê đơn trước khi sử dụng. Liên hệ chuyên gia PharmaCosmetics qua Zalo để được tư vấn phù hợp. |

**Vì sao chọn "Thủ công" thay vì "Tự động":**
- Tối đa 5 điều kiện "Tên sản phẩm chứa từ" không phủ hết các hoạt chất kê đơn (mục 4 có ≥ 10 hoạt chất).
- Lọc theo tên dễ bắt nhầm: vd `Hydroquinon` bắt cả 3 sản phẩm MARTIDERM ghi "duy trì **sau** hydroquinone" (mỹ phẩm).
  Với thuốc kê đơn, bắt nhầm hay sót đều là rủi ro pháp lý ⇒ dược sĩ chọn đúng từng sản phẩm.
- Sản phẩm kê đơn mới nhập về: thêm vào danh mục này ngay khi tạo sản phẩm.

**Sau khi lưu danh mục:**
1. Thêm toàn bộ sản phẩm ở **mục 3** (đang được coi là kê đơn) + các sản phẩm ở **mục 4** dược sĩ xác nhận là kê đơn.
2. Vào **Giao diện › Tuỳ chỉnh › Trang sản phẩm › "Sản phẩm kê toa"** → chọn **Thuốc kê đơn** → Lưu.
   (Nếu chưa thêm đủ mục 3 mà đã đổi, 16 sản phẩm isotretinoin sẽ hiện lại giá + nút mua.)
3. Kiểm tra 1 sản phẩm bất kỳ trong danh mục: trang chi tiết phải hiện khối "THUỐC KÊ ĐƠN", không có giá / nút mua.

## 3. Đang được coi là kê đơn — danh mục `isotretinoin` (16 SP, đưa hết vào danh mục mới)

| STT | Sản phẩm | Đường dẫn |
| :-- | :-- | :-- |
| 1 | Accufine 20mg – Thuốc kê đơn chứa Isotretinoin hỗ trợ điều trị mụn trứng cá nặng | `/accufine-20mg-thuoc-ke-don-chua-isotretinoin-ho-tro-dieu-tri-mun-trung-ca-nang` |
| 2 | Accufine 10mg – Thuốc kê đơn chứa Isotretinoin hỗ trợ điều trị mụn trứng cá nặng | `/accufine-10mg-thuoc-ke-don-chua-isotretinoin-ho-tro-dieu-tri-mun-trung-ca-nang` |
| 3 | (Date 2028) Accufine 5mg – Viên Isotretinoin liều thấp điều trị mụn trứng cá nặng | `/accufine-5mg-vien-isotretinoin-lieu-thap-dieu-tri-mun-trung-ca-nang` |
| 4 | Neo-Maxx Acne T10 – Viên Uống Hỗ Trợ Giảm Mụn Dạng Nang Bọc, Giảm Dầu Nhờn Và Giúp Da Mịn Màng | `/neo-maxx-acne-t10-vien-uong-ho-tro-giam-mun-dang-nang-boc-giam-dau-nhon-va-giup-da-min-mang` |
| 5 | Neo-Maxx Acne T20 – Giải Pháp Giảm Mụn Trứng Cá Nặng Và Khó Chữa | `/neo-maxx-acne-t20-giai-phap-dac-tri-mun-trung-ca-nang-va-kho-chua` |
| 6 | ( Date 6/2027) Saferet 5mg ( Isotretinoin ) 30 Tablets – Viên Uống Hỗ Trợ Giảm Mụn Và Điều Hòa Bã Nhờn Cho Làn Da | `/saferet-5mg-isotretinoin-30-tablets-vien-uong-ho-tro-giam-mun-va-dieu-hoa-ba-nhon-cho-lan-da` |
| 7 | Triplivate 10 (Isotretinoin 10mg): Giải Pháp Hỗ Trợ Điều Trị Mụn Trứng Cá Nặng Và Mụn Dạng Bọc | `/triplivate-10-isotretinoin-10mg-giai-phap-dac-tri-mun-trung-ca-nang-va-mun-dang-boc` |
| 8 | Triplivate 20 (Isotretinoin 20mg): Giải Pháp Hỗ Trợ Điều Trị  Mụn Trứng Cá Nặng Và Mụn Dạng Bọc | `/triplivate-isotretinoin-20mg-giai-phap-dac-tri-mun-trung-ca-nang-va-mun-dang-boc` |
| 9 | Acuroff 20mg: Giải Pháp Đặc Trị Mụn Trứng Cá Nặng, Mụn Bọc Và Mụn Viêm | `/acuroff-20mg-giai-phap-dac-tri-mun-trung-ca-nang-mun-boc-va-mun-viem` |
| 10 | Acuroff-10: Giải Pháp Đặc Trị Mụn Trứng Cá Nặng Và Mụn Kết Khối | `/acuroff-10-y-med-giai-phap-dac-tri-mun-trung-ca-nang-va-mun-ket-khoi` |
| 11 | GOESING (ISO 10MG): Giải Pháp Hỗ Trợ Điều Trị Mụn Trứng Cá Nặng & Cải Thiện Da Rõ Rệt | `/goesing-iso-10mg-giai-phap-ho-tro-dieu-tri-mun-trung-ca-nang-cai-thien-da-ro-ret` |
| 12 | SILVER-GSV ISOTRETINOIN 20MG: Giải Pháp Đặc Trị Mụn Trứng Cá Nặng, Ngừa Sẹo Hiệu Quả | `/silver-gsv-isotretinoin-20mg-giai-phap-dac-tri-mun-trung-ca-nang-ngua-seo-hieu-qua` |
| 13 | AJU AKINOL 10MG: Thuốc Đặc Trị Mụn Trứng Cá Nang Sần Nặng (Isotretinoin) | `/aju-akinol-10mg-thuoc-dac-tri-mun-trung-ca-nang-san-nang-isotretinoin` |
| 14 | ACNOTIN 10 / THUỐC ĐIỀU TRỊ MỤN TRỨNG CÁ NẶNG | `/acnotin-10-thuoc-dieu-tri-mun-trung-ca-nang` |
| 15 | ISOTISUN 10MG / THUỐC ĐIỀU TRỊ CÁC DẠNG MỤN TRỨNG CÁ NẶNG, ĐẶC BIỆT LÀ MỤN TRỨNG CÁ DẠNG NANG BỌC | `/isotisun-10mg-thuoc-dieu-tri-cac-dang-mun-trung-ca-nang-dac-biet-la-mun-trung-ca-dang-nang-boc` |
| 16 | ISOTISUN 20 MEDISUN / THUỐC ĐIỀU TRỊ CÁC DẠNG MỤN TRỨNG CÁ NẶNG, MỤN TRỨNG CÁ DẠNG NANG BỌC | `/isotisun-20-medisun-thuoc-dieu-tri-cac-dang-mun-trung-ca-nang-mun-trung-ca-dang-nang-boc` |

## 4. Ứng viên theo hoạt chất kê đơn (38 SP — dược sĩ xác nhận từng dòng)

| STT | Sản phẩm | Hoạt chất trong tên | Đường dẫn |
| :-- | :-- | :-- | :-- |
| 1 | ( Bản Mỹ) Differin Adapalene Gel 0.1%: Giải Pháp Trị Mụn Retinoid Chuẩn Y Khoa Cho Làn Da Sạch Mụn | Adapalene | `/differin-adapalene-gel-0-1-giai-phap-tri-mun-retinoid-chuan-y-khoa-cho-lan-da-sach-mun` |
| 2 | ( DATE 12/2026) Clinobit Solution (Clindamycin Phosphate Topical Solution USP 1%) : Dung Dịch Kháng Khuẩn Đặc Trị Mụn Viêm Với Clindamycin 1% | Clindamycin (kháng sinh) | `/clinobit-solution-clindamycin-phosphate-topical-solution-usp-1-dung-dich-khang-khuan-dac-tri-mun-viem-voi-clindamycin-1` |
| 3 | (Date 5/2027) Tazarotene Cream 0.1% – Giải Pháp Retinoid Mạnh Mẽ Cho Làn Da Mụn Và Lão Hóa | Tazarotene | `/tazarotene-cream-0-1-giai-phap-retinoid-manh-me-cho-lan-da-mun-va-lao-hoa` |
| 4 | (Date 5/2028) Obagi Tretinoin 0.05% Gel – Gel Dưỡng Hỗ Trợ Giảm Mụn & Tinh Chỉnh Bề Mặt Da Mịn Màng | Tretinoin (bôi) | `/obagi-tretinoin-0-05-gel-gel-duong-ho-tro-giam-mun-tinh-chinh-be-mat-da-min-mang` |
| 5 | (Hàng Công Ty) DIFFERIN CREAM 0.1%: Kem Đặc Trị Mụn Chứa Adapalene – Giảm Mụn Viêm & Cải Thiện Làn Da | Adapalene | `/differin-cream-0-1-kem-dac-tri-mun-chua-adapalene-giam-mun-viem-cai-thien-lan-da` |
| 6 | ACNELYSE KREM TRETINOIN 20G: Kem Trị Mụn & Trẻ Hóa Da | Tretinoin (bôi) | `/acnelyse-krem-tretinoin-20g-kem-tri-mun-tre-hoa-da` |
| 7 | ADAPALENE GEL ADAFERIN 0.1%: Gel Đặc Trị Mụn Ẩn, Mụn Đầu Đen - Cho Làn Da Láng Mịn | Adapalene | `/adapalene-gel-adaferin-0-1-gel-dac-tri-mun-an-mun-dau-den-cho-lan-da-lang-min` |
| 8 | AKLIEF® Trifarotene Cream 0.005% (30g) Retinoid thế hệ mới hỗ trợ điều trị mụn mặt & mụn cơ thể | Trifarotene | `/aklief-trifarotene-cream-0-005-30g-retinoid-the-he-moi-ho-tro-dieu-tri-mun-mat-mun-co-the` |
| 9 | Aldocont C Gel: Giải Pháp Hỗ Trợ Điều Trị Mụn Trứng Cá, Mụn Viêm & Dày Sừng Từ Adapalene & Clindamycin | Adapalene, Clindamycin (kháng sinh) | `/aldocont-c-gel-giai-phap-dac-tri-mun-trung-ca-mun-viem-day-sung-tu-adapalene-clindamycin` |
| 10 | Assos Tre %0.05 Krem (30g) – Kem Bôi Giảm Mụn Trứng Cá, Tái Tạo Bề Mặt Da Về Tretinoin 0.05% | Tretinoin (bôi) | `/assos-tre-0-05-krem-30g-kem-boi-giam-mun-trung-ca-tai-tao-be-mat-da-ve-tretinoin-0-05` |
| 11 | Cliface Lotion (Clindamycin 1%): Giải Pháp Kháng Sinh Điều Trị Mụn Trứng Cá Hiệu Quả | Clindamycin (kháng sinh), Ghi "kháng sinh" | `/cliface-lotion-clindamycin-1-giai-phap-khang-sinh-dieu-tri-mun-trung-ca-hieu-qua` |
| 12 | Clindamycine and Adapalene Gel Melacare Acne 15g: Giải Pháp Giảm Mụn Viêm Chuyên Sâu | Adapalene, Clindamycin (kháng sinh) | `/clindamycine-and-adapalene-gel-melacare-acne-15g-giai-phap-dac-tri-mun-viem-chuyen-sau` |
| 13 | DermaQuest Tretinoin Cream USP 0.1% – Giải Pháp Vàng Điều Trị Mụn Và Trẻ Hóa Da Toàn Diện | Tretinoin (bôi) | `/dermaquest-tretinoin-cream-usp-0-1-giai-phap-vang-dieu-tri-mun-va-tre-hoa-da-toan-dien` |
| 14 | GALDERMA RETACNYL TRETINOIN CREAM 0,025% / KEM HỖ TRỢ ĐIỀU TRỊ MỤN CÁM | Tretinoin (bôi) | `/galderma-retacnyl-tretinoin-cream-0-025-kem-ho-tro-dieu-tri-mun-cam` |
| 15 | GALDERMA RETACNYL TRETINOIN CREAM 0,05% / KEM HỖ TRỢ ĐIỀU TRỊ MỤN, NGỪA LÃO HÓA | Tretinoin (bôi) | `/galderma-retacnyl-tretinoin-cream-0-05-kem-ho-tro-dieu-tri-mun-ngua-lao-hoa` |
| 16 | Goldampill 300: Thuốc Kháng Sinh Điều Trị Nhiễm Khuẩn Hiệu Quả | Ghi "kháng sinh" | `/goldampill-300-thuoc-khang-sinh-dieu-tri-nhiem-khuan-hieu-qua` |
| 17 | KEM TRETINOIN TRETIHEAL: Giải Pháp Vàng Cho Da Mụn & Chống Lão Hóa Toàn Diện | Tretinoin (bôi) | `/kem-tretinoin-tretiheal-giai-phap-vang-cho-da-mun-chong-lao-hoa-toan-dien` |
| 18 | Ketoconazole CREAM (2% w/w) : Kem Đặc Trị Nấm Da, Hắc Lào, Lang Ben & Viêm Da Tiết Bã | Ketoconazole | `/ketoconazole-cream-2-w-w-kem-dac-tri-nam-da-hac-lao-lang-ben-viem-da-tiet-ba` |
| 19 | Klena Gel Adapalene 0.1% – Gel Bôi Nhẹ Dịu Giúp Giảm Mụn Và Làm Mịn Bề Mặt Da | Adapalene | `/klena-gel-adapalene-0-1-gel-boi-nhe-diu-giup-giam-mun-va-lam-min-be-mat-da` |
| 20 | MELACARE AJANTA- Kem Đặc Trị Nám - Công Thức Vàng Hydroquinone 2% , Tretinoin & Corticosteroid | Tretinoin (bôi), Hydroquinone | `/melacare-ajanta-25g-kem-dac-tri-nam-cong-thuc-vang-hydroquinone-tretinoin-corticosteroid` |
| 21 | MELACARE FORTE AJANTA- Kem Đặc Trị Nám Chuyên Sâu - Hydroquinone 4%, Tretinoin & Mometasone | Tretinoin (bôi), Hydroquinone, Mometasone (corticoid) | `/melacare-forte-ajanta-kem-dac-tri-nam-chuyen-sau-hydroquinone-4-tretinoin-mometasone` |
| 22 | Melalite Forte Hydroquinone Cream USP Abbott 30g: Giải Pháp Làm Mờ Nám, Sạm Da Và Tàn Nhang Chuyên Sâu | Hydroquinone | `/melalite-forte-hydroquinone-cream-usp-abbott-30g-giai-phap-dac-tri-nam-sam-da-va-tan-nhang-chuyen-sau` |
| 23 | Metrogyl Gel (Metronidazole 2%): Giải Pháp Kháng Khuẩn, Trị Mụn Và Viêm Da Hiệu Quả | Metronidazole (kháng sinh) | `/metrogyl-gel-metronidazole-2-giai-phap-khang-khuan-tri-mun-va-viem-da-hieu-qua` |
| 24 | Munderm Isotretinoin 0.05% & Eritromicin 2% Jel: Giải Pháp Hỗ Trợ Điều Trị  Mụn Trứng Cá Viêm & Mụn Nặng Với Isotretinoin và Erythromycin | Isotretinoin (uống), Tretinoin (bôi) | `/munderm-isotretinoin-0-05-eritromicin-2-jel-giai-phap-dac-tri-mun-trung-ca-viem-mun-nang-voi-isotretinoin-va-erythromycin` |
| 25 | Mytret-C Aqueous Gel: Giải Pháp Điều Trị Mụn Kết Hợp Tretinoin & Clindamycin | Tretinoin (bôi), Clindamycin (kháng sinh) | `/mytret-c-aqueous-gel-giai-phap-dieu-tri-mun-ket-hop-tretinoin-clindamycin` |
| 26 | NEOVA ACTIVE SPOT VANISH HYDROQUINONE 2% / SERUM LÀM TRẮNG, TRỊ NÁM & XÓA ĐỒI MỒI | Hydroquinone | `/serum-neova-active-spot-vanish-hydroquinone-2` |
| 27 | Obagi Tretinoin 0.025% Cream – Kem Dưỡng Hỗ Trợ Giảm Mụn & Cải Thiện Bề Mặt Da Mịn Màng | Tretinoin (bôi) | `/obagi-tretinoin-0-025-cream-kem-duong-ho-tro-giam-mun-cai-thien-be-mat-da-min-mang` |
| 28 | Obagi Tretinoin 0.05% Cream – Kem Dưỡng Hỗ Trợ Giảm Mụn & Cải Thiện Bề Mặt Da Tươi Trẻ | Tretinoin (bôi) | `/obagi-tretinoin-0-05-cream-kem-duong-ho-tro-giam-mun-cai-thien-be-mat-da-tuoi-tre` |
| 29 | Obagi Tretinoin 0.1% Cream – Kem Dưỡng Chuyên Sâu Tối Ưu Bề Mặt & Hỗ Trợ Giảm Mụn Cấp Độ Cao | Tretinoin (bôi) | `/obagi-tretinoin-0-1-cream-kem-duong-chuyen-sau-toi-uu-be-mat-ho-tro-giam-mun-cap-do-cao` |
| 30 | Peroclin Gel (Clindamycin-Benzoyl Peroxide Gel 5%): Giải Pháp Hỗ Trợ Điều Trị  Mụn Trứng Cá Vừa Đến Nặng Với Clindamycin & Benzoyl Peroxide | Clindamycin (kháng sinh) | `/peroclin-gel-clindamycin-benzoyl-peroxide-gel-5-giai-phap-dac-tri-mun-trung-ca-vua-den-nang-voi-clindamycin-benzoyl-peroxide` |
| 31 | Roza 0,75% Metronidazol: Giải Pháp Đặc Trị Chứng Đỏ Mặt Rosacea Và Viêm Da Demodex | Metronidazole (kháng sinh) | `/roza-0-75-metronidazol-giai-phap-dac-tri-chung-do-mat-rosacea-va-viem-da-demodex` |
| 32 | Tacrolimus Lotion 0.1% (Taxomus): Giải Pháp Hiệu Quả Cho Viêm Da Cơ Địa | Tacrolimus | `/tacrolimus-lotion-0-1-taxomus-giai-phap-hieu-qua-cho-viem-da-co-dia` |
| 33 | TAZAROTENE GEL 0.05% (TAZRET GEL): Gel Trị Mụn & Phục Hồi Sẹo Thâm - Tái Tạo Làn Da Sáng Khỏe | Tazarotene | `/tazarotene-gel-0-05-tazret-gel-gel-tri-mun-phuc-hoi-seo-tham-tai-tao-lan-da-sang-khoe` |
| 34 | TAZAROTENE GEL 0.1% (TAZRET GEL): Gel Đặc Trị Mụn, Sẹo & Dày Sừng - Tái Tạo Làn Da Khỏe Mạnh | Tazarotene | `/tazarotene-gel-0-1-tazret-gel-gel-dac-tri-mun-seo-day-sung-tai-tao-lan-da-khoe-manh` |
| 35 | TRETINOIN ARET GEL USP MENARINI: Giải Pháp Toàn Diện Cho Làn Da Mụn, Lão Hóa & Sắc Tố | Tretinoin (bôi) | `/tretinoin-gel-usp-menarini-giai-phap-toan-dien-cho-lan-da-mun-lao-hoa-sac-to` |
| 36 | TRETINOIN CREAM, USP PADAGIS: Giải Pháp Chuyên Sâu Cho Mụn, Thâm & Lão Hóa Da | Tretinoin (bôi) | `/tretinoin-cream-usp-padagis-giai-phap-chuyen-sau-cho-mun-tham-lao-hoa-da` |
| 37 | TRETINOIN MICROSPHERE MICRO RET GEL: Giải Pháp Vàng Trị Mụn & Trẻ Hóa Da Công Nghệ Vi Cầu | Tretinoin (bôi) | `/tretinoin-microsphere-micro-ret-gel-giai-phap-vang-tri-mun-tre-hoa-da-cong-nghe-vi-cau` |
| 38 | TRETINOIN TARO CREAM USP: Liệu Pháp Đặc Trị Mụn, Nếp Nhăn & Sắc Tố Với Hiệu Quả Đã Được FDA Công Nhận | Tretinoin (bôi) | `/tretinoin-taro-cream-usp-lieu-phap-dac-tri-mun-nep-nhan-sac-to-voi-hieu-qua-da-duoc-fda-cong-nhan` |

## 5. Cần dược sĩ quyết định / nhiều khả năng KHÔNG phải thuốc kê đơn (8 SP)

| STT | Sản phẩm | Lý do để riêng | Đường dẫn |
| :-- | :-- | :-- | :-- |
| 1 | MARTIDERM PIGMENT ZERO DSP RENOVATION CREAM KEM ĐÊM LÀM SÁNG DA, MỜ SẮC TỐ, DUY TRÌ SAU HYDROQUINONE | Tên ghi "duy trì SAU hydroquinone" — mỹ phẩm, không chứa hydroquinone | `/martiderm-pigment-zero-dsp-renovation-creme-kem-dem-lam-sang-mo-sac-to` |
| 2 | MARTIDERM PIGMENT ZERO DSP SERUM ILLUMINATOR / TINH CHẤT LÀM SÁNG DA, MỜ THÂM, DUY TRÌ SAU ĐIỀU TRỊ HYDROQUINONE | Tên ghi "duy trì SAU hydroquinone" — mỹ phẩm, không chứa hydroquinone | `/martiderm-pigment-zero-dsp-serum-illuminator-tinh-chat-lam-sang-da-mo-tham-duy-tri-sau-dieu-tri-hydroquinone` |
| 3 | MARTIDERM PIGMENT ZERO DSP SPF50+ CREAM KEM ĐIỀU TRỊ BAN NGÀY CHỐNG NẮNG LÀM SÁNG DA, MỜ SẮC TỐ, DUY TRÌ SAU HYDROQUINONE | Tên ghi "duy trì SAU hydroquinone" — mỹ phẩm, không chứa hydroquinone | `/martiderm-pigment-zero-dsp-spf50-cream-kem-dieu-tri-ban-ngay-chong-nang-lam-sang-da-mo-sac-to` |
| 4 | RADIANCE BEAUVA TRETINOIN - TRANEXAMIC PEEL / PEEL TRỊ MỤN, TRỊ THÂM, LÀM SÁNG DA, THU NHỎ LỖ CHÂN LÔNG, TRẺ HOÁ VÀ CĂNG BÓNG DA CHO DA NHIỀU MỤN & NHIỀU THÂM & NHIỀU DẦU. | Peel chuyên nghiệp có tretinoin — dược sĩ quyết định | `/radiance-beauva-tretinoin-tranexamic-peel-peel-tri-mun-tri-tham-lam-sang-da-thu-nho-lo-chan-long-tre-hoa-va-cang-bong-da-cho-da-nhieu-mun-nhieu-tham-n` |
| 5 | RADIANCE BEAUVA TRETINOIN HA PEEL / PEEL TRẺ HOÁ DA, TRỊ MỤN, LÀM SÁNG VÀ CĂNG BÓNG DA CHO DA NHẠY CẢM & ÍT MỤN | Peel chuyên nghiệp có tretinoin — dược sĩ quyết định | `/radiance-beauva-tretinoin-ha-peel-peel-tre-hoa-da-tri-mun-lam-sang-va-cang-bong-da-cho-da-nhay-cam-it-mun` |
| 6 | SKINOREN GEL 15% AZELAIC ACID 30G: GEL HỖ TRỢ ĐIỀU TRỊ MỤN, GIẢM BÍT TẮC VÀ CẢI THIỆN THÂM SAU MỤN | Azelaic acid 15–20% đăng ký thuốc — dược sĩ quyết định | `/skinoren-gel-15-azelaic-acid-30g-gel-ho-tro-dieu-tri-mun-giam-bit-tac-va-cai-thien-tham-sau-mun` |
| 7 | AZELDERM 20% KREM AZELAIC AICD 30g / KEM TRỊ MỤN, LÀM SÁNG VÀ ĐỀU MÀU DA | Azelaic acid 15–20% đăng ký thuốc — dược sĩ quyết định | `/azelderm-20-krem-azelaic-aicd-30g-kem-tri-mun` |
| 8 | Skinoren Acidum Azelaicum: Kem Trị Mụn, Mờ Thâm & Điều Trị Rosacea Chuyên Sâu | Azelaic acid 15–20% đăng ký thuốc — dược sĩ quyết định | `/skinoren-acidum-azelaicum-kem-tri-mun-mo-tham-dieu-tri-rosacea-chuyen-sau` |

## 6. Nhật ký

| Ngày | Việc | Người làm |
| :-- | :-- | :-- |
| | Tạo danh mục `thuoc-ke-don` (ID: …) | |
| | Đổi "Sản phẩm kê toa" trong Tuỳ chỉnh giao diện sang `thuoc-ke-don` | |
