# Hồ sơ chất lượng `data/products-data.json`

> Sinh tự động bởi `node scripts/data-profile-products.mjs` (đọc-only, idempotent, không timestamp). Không sửa tay — chạy lại script để cập nhật.
> Phạm vi: chỉ đo; **chưa áp dụng** bất kỳ thay đổi nào lên dữ liệu gốc. Không có dữ liệu khách hàng trong báo cáo.

## 1. Tổng quan và ý nghĩa khoá rút gọn

Tổng bản ghi: **5586**. Số bản ghi có từng khoá: `a`=5586, `av`=5586, `f`=5586, `g`=5586, `i`=5586, `m`=5586, `n`=5586, `o`=5586, `s`=5586, `t`=5586, `v`=5586, `z`=5586.

| Khoá | Ý nghĩa | Căn cứ |
|---|---|---|
| `i` | id sản phẩm | `data/products.js` (r.i → id) |
| `n` | tên | `data/products.js` |
| `a` | alias (handle) | `data/products.js` |
| `v` | vendor (hãng) | tiêu đề file `products.js`: "tên, alias, hãng, loại, tag…" |
| `t` | loại sản phẩm (product_type) | như trên |
| `g` | mảng tag | như trên, dữ liệu là mảng chuỗi |
| `s` | summary HTML | như trên, dữ liệu mẫu là HTML |
| `o` | tên option | `products.js`: `options: r.o` |
| `m` | mảng ảnh phụ (tên file) | `products.js`: `images = r.m.map` |
| `f` | ảnh đại diện | `products.js`: `featuredSrc = r.f` |
| `z` | biến thể `[id,title,price,compare_at_price,sku,available,qty,img,opt1,opt2,opt3]` | `products.js` `makeVariant` |
| `av` | còn bán (0/1) | `products.js`: `available: !!r.av` |

Ghi chú: chưa có khoá mô tả chi tiết trong file này (nằm ở `products-content.json.gz`, ngoài phạm vi báo cáo). Khoá `s` ở đây là summary.

## 2. Trùng lặp

| Khoá trùng | Số nhóm trùng | Bản ghi dư | Ví dụ (khoá → id) |
|---|---|---|---|
| id (`i`) | 0 | 0 | — |
| alias (`a`) | 0 | 0 | — |
| tên (`n`, trim+lowercase+gộp khoảng trắng) | 24 | 25 | dr.belter stimula superior night care/ kem dưỡng ban đêm cho da lão hóa dr.belte → 26573961/26562836/26562823; dbh cellular hydration masque / mặt nạ dưỡng ẩm & thư giãn cho làn da khỏe mạnh → 50428229/50416444; dr.belter bel- energen relax cream ultima lift cream/ kem dưỡng cho da lão hoá d → 26562826/26557916; dr.belter bio - classica bio resouce 24 cream/ kem dưỡng cho da khô dr.belter bi → 26558648/26554745; dr.belter bio classica night care plus/ kem phục hồi ban đêm cho da thiếu dưỡng  → 26572046/26562868; dr.belter hand cream/ kem dưỡng chống lão hóa bàn tay dr.belter hand cream → 26574139/26551410; dr.belter line n cleansing gel/ sữa rửa mặt cho da hỗn hợp , da nhạy cảm , da kh → 26557156/26551483; dr.belter lumination secret radiance performance mask/ mặt nạ ức chế melamin, là → 26575192/26574604; dr.belter rich baobab mask/ mặt nạ dưỡng ẩm sâu và cung cấp dưỡng chất dr.belter → 26575196/26574620; dr.belter stimula bio resource elixir/ kem dưỡng cho da lão hóa từ 35 tuổi trở l → 26574225/26555054 |

## 3. Trường thiếu / rỗng / bất hợp lý

| Kiểm tra | Số SP | Tỷ lệ | Ví dụ id (≤10) |
|---|---|---|---|
| i (id) | 0 | 0.0% | — |
| n (tên) | 0 | 0.0% | — |
| a (alias) | 0 | 0.0% | — |
| v (vendor) | 68 | 1.2% | 89513946, 89507156, 89204491, 87691478, 85261175, 82706987, 80659492, 78917851, 74746182, 74745273 |
| t (loại) | 8 | 0.1% | 63128365, 59000476, 41729614, 36348184, 35845613, 33997795, 33862739, 33769667 |
| g (tag) | 1149 | 20.6% | 87114121, 81359086, 74098743, 65766928, 65759643, 63313131, 63308250, 62529985, 61610118, 60558707 |
| s (summary HTML) | 24 | 0.4% | 96838975, 89513946, 87114121, 85261175, 82022486, 80014804, 78917851, 75001423, 75001205, 74734280 |
| m (ảnh phụ) | 2 | 0.0% | 56180555, 34636324 |
| f (ảnh đại diện) | 2 | 0.0% | 56180555, 34636324 |
| z (biến thể) | 0 | 0.0% | — |
| giá = 0 hoặc thiếu (mọi biến thể) | 176 | 3.2% | 95134081, 92172051, 92171710, 92019237, 88422093, 88421858, 88421552, 74366000, 72977336, 66542975 |
| giá = 0 hoặc thiếu (≥1 biến thể) | 183 | 3.3% | 95134081, 92172051, 92171710, 92019237, 88422093, 88421858, 88421552, 74366000, 72977336, 66542975 |
| sku rỗng (≥1 biến thể) | 31 | 0.6% | 97344973, 87691478, 81359086, 78917851, 73772865, 60167580, 60157026, 59631552, 59630901, 59119444 |
| av = 0 (hết bán/không bán) | 205 | 3.7% | 83334296, 83068226, 79476118, 78541047, 76187220, 75993006, 75899041, 74736679, 72123661, 72123230 |
| giá gốc (compare) < giá bán (≥1 biến thể) | 7 | 0.1% | 27411446, 27400014, 26424050, 26423930, 26423919, 26422848, 26302146 |

## 4. Alias sai định dạng (chuẩn `[a-z0-9-]`, không `--`, không đầu/cuối `-`)

| Lỗi | Số SP | Tỷ lệ | Ví dụ id |
|---|---|---|---|
| ký tự ngoài [a-z0-9-] | 0 | 0.0% | — |
| chứa "--" | 0 | 0.0% | — |
| bắt đầu bằng "-" | 0 | 0.0% | — |
| kết thúc bằng "-" | 0 | 0.0% | — |
| alias có chữ hoa | 0 | 0.0% | — |
| alias rỗng | 0 | 0.0% | — |

## 5. Tag (`g`)

Tổng lượt tag: **48533**; tag duy nhất (nguyên văn): **23163**.

| Lỗi | Số SP | Tỷ lệ | Ví dụ id |
|---|---|---|---|
| tag chứa dấu phẩy | 0 | 0.0% | — |
| tag có khoảng trắng đầu/cuối | 0 | 0.0% | — |
| tag có khoảng trắng kép bên trong | 4 | 0.1% | 63094730, 38733852, 38472069, 26954728 |
| tag trùng khác hoa/thường trong cùng SP | 0 | 0.0% | — |
| tag trùng y hệt trong cùng SP | 0 | 0.0% | — |
| tag kết thúc bằng dấu chấm | 2113 | 37.8% | 97344973, 96994248, 96843126, 96838975, 96835665, 96498237, 96497129, 96442408, 96441275, 96436391 |
| tag rỗng | 0 | 0.0% | — |

Tag kết thúc bằng dấu chấm (top): `PHARMACOSMETICS.` (473); `dược mỹ phẩm.` (88); `Mỹ.` (73); `chăm sóc da.` (34); `Pharmacosmetics.` (32); `da nhạy cảm.` (31); `Bioelements Hoa Kỳ.` (27); `làm đẹp da.` (23); `Hàn Quốc.` (17); `PharmaCosmetics.` (17)

### Top 20 nhóm tag gần trùng (cùng khoá bỏ dấu/hoa thường/ký tự đặc biệt, ≥2 cách viết) — tổng 1930 nhóm

| # | Các cách viết (số lượt) |
|---|---|
| 1 | `PHARMACOSMETICS` (2120); `PHARMACOSMETICS.` (473); `Pharma Cosmetics` (108); `Pharmacosmetics` (98); `Pharmacosmetics.` (32); `PharmaCosmetics.` (17); `Pharma Cosmetics.` (13); `pharmacosmetics` (2); `pharmacosmetics.` (1) |
| 2 | `chống lão hóa` (274); `CHỐNG LÃO HÓA` (218); `Chống lão hóa` (9); `chống lão hóa.` (7); `chống lão hoá` (2); `CHỐNG LÃO HÓA.` (1); `chonglaohoa` (1) |
| 3 | `CHĂM SÓC DA` (121); `chăm sóc da` (80); `chăm sóc da.` (34); `Chăm sóc da` (6); `CHĂM SÓC DA.` (1); `Chăm Sóc Da` (1); `chamsocda` (1) |
| 4 | `dược mỹ phẩm PHARMACOSMETICS` (79); `dược mỹ phẩm Pharmacosmetics` (17); `dược mỹ phẩm Pharmacosmetics.` (10); `dược mỹ phẩm PHARMACOSMETICS.` (8); `dược mỹ phẩm pharma cosmetics.` (1); `dược mỹ phẩm pharmacosmetics` (1); `dược mỹ phẩm pharmacosmetics.` (1) |
| 5 | `chăm sóc da mặt` (19); `CHĂM SÓC DA MẶT` (13); `Chăm sóc da mặt` (13); `CHĂM SÓC DA MẮT` (6); `chăm sóc da mắt` (6); `chăm sóc da mặt.` (6); `chăm sóc da mắt.` (1) |
| 6 | `BETA-GLUCAN` (10); `BETA GLUCAN` (8); `Beta-Glucan` (5); `Beta-glucan` (1); `Betaglucan` (1); `beta glucan` (1); `beta-glucan` (1) |
| 7 | `làm sáng da` (181); `LÀM SÁNG DA` (140); `Làm sáng da` (9); `làm sáng da.` (3); `LÀM SẠNG DA` (2); `LÀM SÁNG DA.` (1) |
| 8 | `HYALURONIC ACID` (220); `hyaluronic acid` (40); `Hyaluronic Acid` (39); `Hyaluronic acid` (5); `Hyaluronic Acid.` (2); `hyaluronic acid.` (1) |
| 9 | `Coenzyme Q10` (10); `COENZYME Q10` (8); `CO-ENZYME Q10` (1); `CoEnzyme Q10` (1); `coenzyme Q10` (1); `coenzyme q10.` (1) |
| 10 | `trẻ hóa da mắt` (2); `TRẺ HÓA DA MẮT` (1); `TRẺ HÓA DA MẶT` (1); `trẻ hóa da mắt.` (1); `trẻ hóa da mặt` (1); `trẻ hóa da mặt.` (1) |
| 11 | `TÁI TẠO DA` (240); `tái tạo da` (107); `Tái tạo da` (6); `tái tạo da.` (3); `TÁI TẠO DA.` (1) |
| 12 | `DA NHẠY CẢM` (175); `da nhạy cảm` (127); `da nhạy cảm.` (31); `Da nhạy cảm` (11); `Da Nhạy Cảm` (1) |
| 13 | `dưỡng ẩm` (184); `DƯỠNG ẨM` (40); `Dưỡng ẩm` (9); `dưỡng ẩm.` (6); `duongam` (1) |
| 14 | `VITAMIN C` (120); `vitamin C` (31); `Vitamin C` (25); `Vitamin C.` (1); `vitamin C.` (1) |
| 15 | `SALICYLIC ACID` (69); `Salicylic Acid` (30); `salicylic acid` (9); `Salicylic Acid.` (1); `salicylic acid.` (1) |
| 16 | `da dầu` (57); `DA DẦU` (32); `Da dầu` (8); `da dầu.` (2); `da đầu` (2) |
| 17 | `CHĂM SÓC DA NHẠY CẢM` (45); `Chăm sóc da nhạy cảm` (8); `chăm sóc da nhạy cảm` (5); `Chăm sóc da nhạy cảm.` (4); `chăm sóc da nhạy cảm.` (2) |
| 18 | `DA DẦU MỤN` (39); `da dầu mụn` (18); `Da dầu - mụn` (2); `da dầu mụn.` (2); `Da dầu mụn` (1) |
| 19 | `ALLANTOIN` (39); `Allantoin` (8); `allantoin` (6); `Allantoin.` (1); `allantoin.` (1) |
| 20 | `BƠ HẠT MỠ` (30); `bơ hạt mỡ` (5); `Bơ Hạt Mỡ` (2); `Bơ hạt mỡ` (1); `bơ hạt mỡ.` (1) |

## 6. Vendor (`v`)

Giá trị duy nhất (nguyên văn): **420**; sau chuẩn hoá: **408**; nhóm có ≥2 cách viết: **12**; rỗng: **68** (id: 89513946, 89507156, 89204491, 87691478, 85261175, 82706987, 80659492, 78917851, 74746182, 74745273); khoảng trắng thừa: **0** (id: —).

Top 10 vendor theo số SP: DR.BELTER (143); BIOLOGIQUE RECHERCHE (123); ERICSON LABORATOIRE (106); IMAGE SKINCARE (105); DR.GRANDEL (95); DBH DERMAESTHETIC (93); DMK (89); skinclinic (83); VALMONT (81); GIGI Laboratories (75).

Các nhóm viết khác nhau của cùng vendor (tối đa 40 nhóm, sắp theo số SP):

| Khoá chuẩn hoá | Biến thể → số SP (id mẫu) |
|---|---|
| purles | `PURLES` → 44 (73108120/73058969/73058897); `Purlés` → 10 (73263930/73258416/73253830) |
| swissline | `SWISS LINE` → 44 (34344579/34343534/34343347); `SWISSLINE` → 5 (96843126/96838975/96835665) |
| mesoestetic | `MESOESTETIC` → 47 (82705002/82704465/82704008); `Mesoestetic®` → 1 (82704273) |
| skinderma | `SKINDERMA` → 46 (76371142/76352408/76349937); `Skinderma` → 1 (76350325) |
| martiderma | `MARTI DERMA` → 31 (40007839/33331073/33331022); `MARTIDERMA` → 9 (57540986/57534766/57533213) |
| drdifferent | `DR.DIFFERENT` → 26 (94682621/84124675/38584080); `Dr. Different` → 1 (84124832) |
| rvblab | `RVB LAB` → 24 (69667301/62101847/61963903); `RVBLAB` → 1 (69664841) |
| vivant | `VIVANT` → 21 (57987202/33041949/33041076); `Vivant` → 1 (78993220) |
| ohoh | `OH! OH!` → 17 (80541415/55955386/55953993); `oh!oh!` → 1 (90078047) |
| webbernaturals | `WEBBER NATURALS` → 6 (45043210/45042706/45039636); `Webber Naturals` → 1 (77765877) |
| decorte | `DECORTE` → 2 (69205235/36344254); `DECORTÉ` → 2 (69221070/69215282) |
| spatreatment | `SPA TREATMENT` → 1 (31691776); `Spa Treatment` → 1 (30649551) |

## 7. Loại (`t`)

Giá trị duy nhất (nguyên văn): **450**; sau chuẩn hoá: **440**; nhóm có ≥2 cách viết: **10**; rỗng: **8** (id: 63128365, 59000476, 41729614, 36348184, 35845613, 33997795, 33862739, 33769667); khoảng trắng thừa: **3** (id: 34690626, 33063009, 31484299).

Top 10 loại theo số SP: kem dưỡng (1213); Tinh chất (778); MẶT NẠ (391); SERUM (365); SỮA RỬA MẶT (326); Kem chống nắng (264); TONER (121); dưỡng mắt (105); DUNG DỊCH PEEL (85); peel (73).

Các nhóm viết khác nhau của cùng loại (tối đa 40 nhóm, sắp theo số SP):

| Khoá chuẩn hoá | Biến thể → số SP (id mẫu) |
|---|---|
| kemduong | `kem dưỡng` → 1112 (96835665/96598901/96497129); `KEM DƯỠNG` → 101 (47005357/46273583/45865726) |
| tinhchat | `Tinh chất` → 730 (96994248/96843126/96838975); `TINH CHẤT` → 48 (46278066/44933032/42286506) |
| peel | `peel` → 71 (95141030/95134081/90539969); `PEEL` → 2 (57777457/54982177) |
| huyetthanh | `HUYẾT THANH` → 62 (91149477/68866640/68856507); `HUYÉT THANH` → 1 (33751667) |
| dieutrichuyennghiep | `ĐIỀU TRỊ CHUYÊN NGHIỆP` → 18 (62533107/62173548/60899440); `ĐIỀU TRỊ CHUYÊN NGHIÊP` → 13 (82706987/63126985/63112361) |
| botruamat | `bọt rửa mặt` → 8 (73964885/70503551/61963591); `BỘT RỬA MẶT` → 3 (88751519/80293505/68138682) |
| ampoule | `AMPOULE` → 9 (73360820/73360515/73360276); `Ampoule` → 1 (73268740) |
| phannen | `PHẤN NỀN` → 3 (68841935/36567983/36565451); `PHẤN NÉN` → 1 (34010973) |
| taytrangmatmoi | `TẨY TRANG MẮT MÔI` → 1 (57472673); `TẨY TRANG MẮT, MÔI` → 1 (28863079) |
| tretinoin | `TRETINOIN` → 1 (61939039); `Tretinoin` → 1 (78541047) |

## 8. HTML summary (`s`)

SP có summary không rỗng: **5562**/5586.

| Dấu hiệu | Số SP | Tỷ lệ (trên tổng) | Ví dụ id |
|---|---|---|---|
| có style= inline | 5358 | 95.9% | 97344973, 97094861, 96994248, 96843126, 96835665, 96599802, 96599436, 96598901, 96500329, 96499930 |
| có font-family cứng | 277 | 5.0% | 78493293, 76645791, 74903694, 73772865, 73739129, 73725259, 73698741, 73645553, 70521632, 70513730 |
| có font-size cứng | 38 | 0.7% | 78493293, 76645791, 74903694, 73772865, 73739129, 73725259, 73698741, 73645553, 70521632, 70513730 |
| có thẻ <font> | 815 | 14.6% | 91720015, 78493293, 76645791, 74903694, 73772865, 73739129, 73725259, 73698741, 73645553, 71788209 |
| thẻ rỗng (<p></p>, <p>&nbsp;</p>, <span></span>, <div></div>...) | 911 | 16.3% | 96497129, 96082656, 96077772, 96076147, 96075526, 96074735, 96073085, 96035251, 96030242, 93902568 |
| có <br> liên tiếp (≥3) | 0 | 0.0% | — |
| có thẻ <script> | 0 | 0.0% | — |
| có &nbsp; liên tiếp (≥3) | 0 | 0.0% | — |

## 9. Tên (`n`)

| Dấu hiệu | Số SP | Tỷ lệ | Ví dụ id |
|---|---|---|---|
| tên có khoảng trắng đầu/cuối hoặc kép | 778 | 13.9% | 80594167, 76647778, 76519892, 76187220, 71820489, 71766171, 71615552, 71607523, 69449463, 69363297 |
| tên toàn chữ HOA (có ≥ 6 chữ cái) | 2614 | 46.8% | 97344973, 96994248, 96843126, 96838975, 96835665, 96401752, 96361054, 96082656, 96077772, 96076147 |
| tên dài > 120 ký tự | 300 | 5.4% | 96599802, 96500329, 96498869, 96442408, 94682621, 91287291, 91286281, 91285793, 89552831, 89550905 |

## 10. Đề xuất chuẩn hoá (CHƯA áp dụng; không ghi đè dữ liệu gốc)

Mỗi quy tắc dưới đây sẽ viết thành script `scripts/data-clean-products.mjs` ghi ra file mới (`data/products-data.clean.json` hoặc bản diff), idempotent, chờ BA/chủ dự án duyệt.

1. Tag: `trim`, gộp khoảng trắng kép; bỏ dấu chấm cuối; **tách** tag chứa dấu phẩy thành nhiều tag (Sapo tách theo dấu phẩy); khử trùng lặp không phân biệt hoa/thường trong cùng SP (giữ cách viết xuất hiện đầu).
2. Tag gần trùng toàn cục: lập bảng ánh xạ "cách viết chuẩn" cho các nhóm ở mục 5 (chủ dự án chọn dạng chuẩn, mặc định lấy dạng nhiều lượt nhất).
3. Vendor/loại: lập bảng ánh xạ về một tên chuẩn cho mỗi nhóm ở mục 6–7; trim khoảng trắng thừa.
4. Alias: chỉ báo cáo, **không tự đổi** alias đang chạy (đổi alias làm gãy URL/SEO); nếu cần đổi phải kèm redirect 301 do chủ dự án duyệt.
5. HTML summary: bỏ `style=`/`font-family`/`font-size`/`<font>` inline, xoá thẻ rỗng, gộp `<br>`/`&nbsp;` thừa — chạy trên bản sao, so sánh diff trước khi duyệt.
6. SP trùng id/alias/tên (mục 2): chỉ liệt kê để chủ dự án quyết định giữ/ẩn, không tự xoá.
7. Tên toàn chữ hoa: chỉ gắn cờ; chuyển kiểu chữ chỉ làm bằng CSS ở giao diện, không sửa dữ liệu.

## 11. Cần chủ dự án quyết / cung cấp

- Tên chuẩn của từng vendor và loại có nhiều cách viết (mục 6–7); và dạng chuẩn của các nhóm tag gần trùng (mục 5).
- Quyết định với SP trùng tên/alias (mục 2): giữ, ẩn hay gộp.
- SP thiếu vendor / loại / tag / summary / ảnh / giá (mục 3): nội dung và giá thật do chủ dự án cung cấp — không được suy đoán hay bịa.
- Có cho phép đổi alias sai định dạng không (kèm redirect 301) — mục 4.
- Tag có dấu phẩy/dấu chấm: duyệt cách tách và danh sách tag chuẩn (mục 5).

## 12. Cách chạy lại

```bash
node scripts/data-profile-products.mjs   # ghi docs/data/products-data-quality.{md,json}
git status --porcelain data/             # phải rỗng
```
