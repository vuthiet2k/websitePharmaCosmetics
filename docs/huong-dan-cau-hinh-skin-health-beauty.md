# Cấu hình khu Skin Health Beauty trên Sapo

Dành cho người quản trị website (không cần biết code). Skin Health Beauty (SHB) là khu dịch vụ trị liệu da của Pharma
Cosmetics, dùng chung header/footer với cửa hàng nhưng có giao diện riêng cho từng trang.

Tài liệu liên quan: tạo 1 liệu trình mới → [huong-dan-tao-lieu-trinh.md](huong-dan-tao-lieu-trinh.md) · thêm ca Trước & Sau →
[huong-dan-tao-ca-truoc-sau.md](huong-dan-tao-ca-truoc-sau.md).

---

## 1. Bản đồ các trang

| Đường dẫn | Là gì trên Sapo | Giao diện phải chọn | Nội dung lấy từ |
| :-- | :-- | :-- | :-- |
| `/skin-health-beauty` | Trang nội dung | `page.indexskinhealthy` | Cấu hình **Skin Healthy — Cấu hình Theme** (mục 3) |
| `/dich-vu-skin-healthy-beauty` | Trang nội dung | `page.skinhealthy-services` | Menu nhóm dịch vụ + danh mục sản phẩm (mục 4) |
| `/dieu-tri-chuyen-nghiep` … | Danh mục sản phẩm | `collection.skinhealthy` | Sản phẩm trong danh mục |
| Từng liệu trình (vd `/elaine-brennan-getglowing-…`) | **Sản phẩm** | **`product.lieu-trinh`** | Chính sản phẩm đó — xem tài liệu tạo liệu trình |
| `/tra-cuu-hoat-chat` | Trang nội dung | `page.tra-cuu-hoat-chat` | Blog `hoat-chat` |
| `/dat-lich-tu-van` | Trang nội dung | `page.dat_lich_tu_van` | Form đặt lịch |
| `/kham-da-ai` | Trang nội dung | `page.ai-skin-quiz` | Soi da AI |
| `/truoc-sau-cham-soc-da-tu-xa` | Trang nội dung | `page.clinical-proof` | Blog `truoc-va-sau-1` |
| `/skin-health-beauty-chi-tiet` | Trang nội dung | `page.skinhealthy-service-detail` | **Không dùng để xem dịch vụ** — xem mục 6 |

Cách chọn giao diện: Sapo Admin → mở trang / danh mục / sản phẩm → ô **Giao diện** (khung giao diện) ở cột phải → chọn → **Lưu**.

---

## 2. Vào chỗ cấu hình

Sapo Admin → **Website › Giao diện** → theme đang dùng → **Tuỳ chỉnh**. Các nhóm liên quan:

| Nhóm | Dùng cho |
| :-- | :-- |
| **Skin Healthy — Cấu hình Theme** | Toàn bộ trang `/skin-health-beauty` + trang dịch vụ (mục 3, 4) |
| **Skin Health Beauty — Giỏ dịch vụ** | Chữ trên thanh "dịch vụ đã chọn" (nhãn, nút đặt lịch, nút xoá, tiền cọc) |
| **Trang chủ › Dịch vụ trị liệu (Spa)** | Khối giới thiệu SHB trên trang chủ Pharma Cosmetics; nút dẫn sang `/skin-health-beauty` |
| **Trang liệu trình** (`lt_*`) | Danh mục liệu trình, các blog Vấn đề da / Hoạt chất / FAQ — xem tài liệu tạo liệu trình |

> Cấu hình nằm **trong từng theme**. Upload theme mới (file zip) thì theme mới mang cấu hình của file zip — các chỉnh sửa đã
> làm trong Tuỳ chỉnh của theme cũ phải làm lại (hoặc báo dev chép vào `configs/settings_data.json` trước khi đóng gói).

---

## 3. Trang `/skin-health-beauty` — từng khối, từ trên xuống

Tất cả trong **Skin Healthy — Cấu hình Theme**.

| # | Khối | Mục cấu hình | Ghi chú |
| :-- | :-- | :-- | :-- |
| 0 | Thanh thông báo, menu trái | I–III: Tên thương hiệu, màu, `Menu trái` (`skinhealthy-nav`), Thông báo | Menu tạo ở **Website › Menu** |
| 1 | **Hero** | IV › Hero: ảnh nền, eyebrow, tiêu đề H1, phụ đề, nút | **Ảnh nền phải là ẢNH KHÔNG CÓ CHỮ** (chữ do theme in đè lên). Ngang ≥ 1920px; chủ thể ở giữa (điện thoại cắt 2 bên) |
| 2 | Mua sắm theo nhu cầu da | Menu nhu cầu da (`tinh-trang-lan-da`) | Mỗi link trỏ 1 **danh mục sản phẩm**; ảnh thẻ = **ảnh của danh mục** (Sản phẩm › Danh mục › Ảnh) |
| 3 | Mua sắm theo danh mục | Menu danh mục (`thanh-phan-hoat-chat`) | Như trên |
| 4 | Banner "Chẩn đoán da cá nhân hoá" + **Virtual Clinic Tour** | Banner Editorial: Ảnh phòng khám 1–5, chữ, nút; Virtual Clinic Tour: tên + mô tả 3 phòng, YouTube ID | 5 ảnh dùng chung cho cả 2 khối; ảnh 1–3 = Phòng chẩn đoán / Lab / Phòng trị liệu (theo thứ tự). Ô ảnh trống ⇒ bỏ qua |
| 5 | **Liệu trình** (thẻ video dọc) | Liệu trình: Link trang liệu trình; nguồn thẻ = danh mục `lt_collection` (`dieu-tri-chuyen-nghiep`) | Thẻ ưu tiên video (tag `youtube:` / `facebook:` của sản phẩm), không có ⇒ ảnh đại diện |
| 6 | Liên kết Pharma Cosmetics | IV-B | |
| 7 | Ảnh Trước & Sau theo 6 nhóm | IV-C: Ảnh Trước/Sau + chú thích từng nhóm | Ảnh vuông ~320×320. Nhóm trống ⇒ ẩn khung so sánh. **Chỉ dùng ca thật, có đồng ý của khách** |
| 8 | Hành trình 6 bước | IV-D: ảnh, thời lượng, mô tả 6 bước | ⚠ Mô tả mặc định có chữ **"[DEMO]"** — phải thay bằng mô tả thật trước khi công bố |
| 9 | Câu chuyện quyết định | IV-E: 2 câu chuyện | Để trống cả 2 ⇒ khối ẩn hẳn |
| 10 | Dòng cam kết | IV-F | |
| 11 | Triết lý điều trị | IV-G | |
| 12 | Chuyên gia phụ trách | IV-H — **tắt mặc định** | Chỉ bật khi có ảnh + tên + chức danh chuyên gia thật. Dùng "Chuyên gia", không dùng "Bác sĩ" |
| 13 | Câu hỏi thường gặp | IV-I: 6 câu hỏi/trả lời | Để trống ⇒ dùng câu mặc định của theme |

---

## 4. Trang dịch vụ `/dich-vu-skin-healthy-beauty`

- **Nhóm dịch vụ** = mục **V. TRANG DỊCH VỤ**:
  - Cách nên dùng: tạo menu (Website › Menu), mỗi link trỏ 1 danh mục sản phẩm dịch vụ, chọn menu đó ở ô **Menu nhóm dịch vụ**.
  - Để trống ⇒ theme dùng 3 danh mục dự phòng: *nhóm 1* `dieu-tri-chuyen-nghiep`, *nhóm 2* `dieu-tri-chuyen-sau`,
    *nhóm 3* `dieu-tri-chuyen-nghiep-1`.
- **Tên nhóm hiện trên trang = tên danh mục trên Sapo** ⇒ đặt tên danh mục cho rõ (đang có nhóm tên
  "Điều trị chuyên nghiệp 1" — nên đổi tên danh mục, vd "Điều trị nhắm mục tiêu").
- Danh mục chưa có sản phẩm ⇒ nhóm hiện "Dịch vụ đang được cập nhật" (hiện nhóm 2 `dieu-tri-chuyen-sau` đang trống).
- Mỗi thẻ dịch vụ: ảnh, tên, giá, nút **Xem chi tiết** (mở trang sản phẩm của dịch vụ) và **Đặt ngay** (thêm vào giỏ dịch vụ).

---

## 5. Thêm 1 liệu trình mới

Làm theo [huong-dan-tao-lieu-trinh.md](huong-dan-tao-lieu-trinh.md). Ba điểm hay quên:

1. Sản phẩm phải chọn giao diện **`product.lieu-trinh`** (Bước 6). Quên bước này ⇒ trang hiện như sản phẩm bán online:
   nút "Mua ngay · Giao hàng tận nơi", "Thêm vào giỏ hàng", "Sản phẩm liên quan" là dược mỹ phẩm.
2. Thêm sản phẩm vào danh mục **`dieu-tri-chuyen-nghiep`** để hiện ở khối Liệu trình trang `/skin-health-beauty`
   và trong nhóm dịch vụ.
3. Gắn tag `liệu trình`.

---

## 6. Trang `/skin-health-beauty-chi-tiet`

Trang này **không** hiển thị được 1 dịch vụ cụ thể (Sapo không cho trang nội dung đọc tham số `?handle=` trên đường dẫn).
Thẻ dịch vụ đã đổi sang mở thẳng trang sản phẩm. Ai mở trực tiếp trang này sẽ thấy lời dẫn + nút về danh sách dịch vụ
(chữ chỉnh ở ô *Trang chi tiết dịch vụ mở trực tiếp* trong mục II). Có thể ẩn trang khỏi menu / sitemap.

---

## 7. Kiểm tra sau khi cấu hình

- [ ] `/skin-health-beauty` trên điện thoại: chữ Hero đọc rõ (ảnh nền không có chữ), không còn ô "NO IMAGE AVAILABLE".
- [ ] Không còn chữ "[DEMO]" ở Hành trình 6 bước.
- [ ] Thẻ "Mua sắm theo nhu cầu da / theo danh mục" có ảnh (danh mục đã có ảnh).
- [ ] Virtual Clinic Tour: bộ đếm đúng số ảnh (vd "1 / 5"), tên phòng khớp ảnh.
- [ ] `/dich-vu-skin-healthy-beauty`: tên nhóm rõ nghĩa, không nhóm nào trống; bấm "Xem chi tiết" mở đúng trang liệu trình.
- [ ] Mỗi liệu trình: có khối Vấn đề da / Hoạt chất / Quy trình / Đặt lịch — **không** có nút giao hàng/giỏ hàng.

## 8. Kết quả rà soát bản xem trước theme 1172841 (19/10/2026)

Đo trên 33 trang SHB, điện thoại 390px + máy tính 1440px: mọi trang mở được (200), không lỗi Liquid, không cuộn ngang.

| # | Vấn đề | Mức | Ai xử lý | Trạng thái |
| :-- | :-- | :-- | :-- | :-- |
| 1 | 9/10 liệu trình chưa chọn giao diện `product.lieu-trinh` ⇒ hiện như hàng bán online | Nặng | Người nhập liệu (mục 5) | Chờ làm |
| 2 | Nút "Xem chi tiết" thẻ dịch vụ dẫn tới trang trống `/skin-health-beauty-chi-tiet?handle=…` | Nặng | Dev | **Đã sửa** — mở trang sản phẩm |
| 3 | Mô tả sản phẩm tự chia tab không chạy trên Sapo; dòng XUẤT XỨ in "SYSTEM.LINQ…" (lỗi filter `slice` của Sapo) | Nặng | Dev | **Đã sửa** (cần upload theme mới) |
| 4 | Ảnh 1 Banner Editorial + Virtual Tour "NO IMAGE AVAILABLE", đếm "1 / 6" | Nặng | Dev | **Đã sửa** |
| 5 | Hành trình 6 bước hiện "[DEMO] …" | Nặng | Nội dung (mục 3, #8) | Chờ mô tả thật |
| 6 | Hero: tiêu đề đè lên chữ có sẵn trong ảnh banner | Nặng | Nội dung (mục 3, #1) | Chờ ảnh không chữ |
| 7 | Trang liệu trình có 2–3 thẻ H1 (mô tả nhập kèm H1) | Vừa | Dev | **Đã sửa** — hạ xuống H2 |
| 8 | Mega menu: 17 danh mục không ảnh hiện "NO IMAGE AVAILABLE" | Vừa | Dev + nội dung | **Đã sửa** (hiện icon); nên thêm ảnh danh mục |
| 9 | Thẻ "Mua sắm theo nhu cầu da" không có ảnh | Vừa | Nội dung (ảnh danh mục) | Chờ làm |
| 10 | Nhóm dịch vụ "Điều trị chuyên nghiệp 1" (tên trùng) + nhóm "Điều trị chuyên sâu" trống | Vừa | Nội dung (mục 4) | Chờ làm |
| 11 | Lỗi JavaScript `anSettings is not defined` trên mọi trang — từ app **Ảnh nổi** (app.anhnoi.com) | Nhẹ | Quản trị app Sapo | Kiểm tra cấu hình / gỡ app |
| 12 | App "Sản phẩm liên quan" (productsrecommend.sapoapps.vn) trả lỗi 500 ở trang Elaine Brennan | Nhẹ | Hỗ trợ app Sapo | Theo dõi |
