# Sapo Pack Kit — đóng gói theme Sapo Web (.bwt) đúng chuẩn, < 5 MB

Bộ script rút ra từ dự án Pharma Cosmetics. Chạy ở dự án khác để ra file zip tải lên Sapo
**không mất CSS, không lỗi `Swiper is not defined`**.

## Vì sao tải lên Sapo bị mất CSS / `Swiper is not defined`

Sapo **KHÔNG biên dịch asset `.bwt` khi tải gói lên**. Mọi file kiểu `assets/swiper.js.bwt`,
`assets/jquery.js.bwt`, `assets/xxx.scss.bwt` nếu nén thẳng vào zip sẽ được Sapo trả về **rỗng**
(HTTP 200, 0 byte) ⇒ thiếu thư viện (Swiper, jQuery, lazy…) và mất CSS. Một file SCSS lỗi còn có thể
làm rỗng cả lô asset.

Cách đúng: **render sẵn** trước khi nén (bước `build-sapo-staging.js`):

| Nguồn trong dự án | Trong zip | Ghi chú |
| :-- | :-- | :-- |
| `assets/x.js.bwt` | `assets/x.js` | Render Liquid (nếu có) rồi minify. JS không được dùng `asset_url` |
| `assets/x.scss.bwt` | `assets/x.css` | Render Liquid rồi biên dịch bằng **libsass** (như Sapo); tham chiếu `x.scss.css` trong template tự đổi thành `x.css` |
| `assets/x.css.bwt` | `assets/x.css` | Render Liquid rồi minify |
| `assets/x.js`, `x.css` thường | giữ nguyên (minify) | Tên file giữ nguyên vì template gọi theo tên |

## Cài đặt (1 lần ở dự án đích)

1. Copy thư mục `scripts/` của kit vào **gốc dự án** (ngang hàng `assets/ configs/ layouts/ snippets/ templates/`).
2. Cài thư viện Node (Node ≥ 18):
   ```bash
   npm i -D liquidjs terser clean-css archiver
   ```
3. Cài libsass cho Python (Sapo biên dịch SCSS bằng libsass, dart-sass dễ tính hơn nên không thay thế được):
   ```bash
   pip install libsass
   ```
4. (Tuỳ chọn) thêm vào `package.json`:
   ```json
   "scripts": { "build:sapo": "node scripts/sapo-build-all.js" }
   ```

## Chạy

```bash
node scripts/sapo-build-all.js        # hoặc: npm run build:sapo
```

Kết quả: `exports/sapo-theme-<version>.zip` (`version` lấy từ `package.json`, không có thì `1.0.0`).
Dòng cuối phải là `PASS: 100% Sapo Compatible`.

Biến môi trường:

| Biến | Tác dụng |
| :-- | :-- |
| `SAPO_KEEP_ALL_IMAGES=1` | **Nên đặt ở dự án khác.** Giữ mọi ảnh trong `assets/`. Mặc định kit chỉ cho icon hệ thống/whitelist ≤ 150 KB (chính sách riêng của Pharma Cosmetics) và âm thầm loại ảnh khác |
| `SAPO_SKIP_LIBSASS=1` | Bỏ bước biên dịch thử SCSS (khi chưa cài Python/libsass; **không khuyến nghị**) |
| `SAPO_STRICT=1` | Asset đọc `settings.*` ⇒ báo lỗi thay vì cảnh báo (xem mục dưới) |

Windows PowerShell: `$env:SAPO_KEEP_ALL_IMAGES='1'; node scripts/sapo-build-all.js`

## Quy tắc zip Sapo (script `validate-sapo-zip.js` kiểm tra đủ)

1. **5 thư mục ở gốc zip, không có thư mục bọc ngoài:** `assets/ configs/ layouts/ snippets/ templates/`
   (số nhiều: `configs`, `layouts`). Được thêm `locales/`, `sections/`.
2. **File bắt buộc:** `layouts/theme.bwt`, `configs/settings_schema.json`, `configs/settings_data.json`.
3. **10 template bắt buộc:** `templates/index.bwt`, `product`, `collection`, `cart`, `blog`, `article`, `page`,
   `list_collections`, `search`, `404` (đều `.bwt`).
4. `layouts/theme.bwt` có `{{ content_for_header }}` **trước `</head>`** và `{{ content_for_layout }}`.
5. `layouts/ templates/ snippets/ sections/` chỉ chứa `.bwt`; `configs/ locales/` chỉ chứa `.json` hợp lệ.
6. Mọi `{% include 'x' %}` có `snippets/x.bwt`; mọi `{% layout 'x' %}` có `layouts/x.bwt`;
   mọi `'file' | asset_url` trỏ tới file có trong `assets/`.
7. **Không có asset `.bwt` trong zip** (kit tự render), không file nguồn `.scss .sass .ts .tsx .map`,
   không rác (`__MACOSX .DS_Store Thumbs.db .git node_modules .vercel`).
8. `settings_schema.json`: mảng nhóm `{name, settings[]}`; kiểu hợp lệ `header paragraph color font checkbox text textarea
   select radio image collection blog page link_list snippet`. `default` phải là chuỗi (checkbox: boolean).
   Kiểu `font collection blog page link_list snippet image` **không được có `default`**. `id` không trùng.
9. **Dung lượng zip < 5.000.000 byte.** Vượt ⇒ `package-sapo.js` xoá zip và in 10 file nặng nhất.
10. **Đường dẫn trong zip dùng `/`.** `Compress-Archive` của PowerShell 5.1 ghi `\` ⇒ Sapo từ chối. Kit dùng `archiver` nên đúng.

## Lưu ý khi đổi cấu hình trong Admin Sapo

Asset (`.js.bwt`, `.scss.bwt`) được render **lúc build** bằng giá trị mặc định + `settings_data.json`. Nếu asset đọc
`settings.xxx` (ví dụ màu chủ đạo) thì giá trị bị gắn cứng: đổi trong Admin sẽ **không** đổi asset cho tới khi build + tải
gói lại. Build in cảnh báo kèm danh sách cấu hình này. Cách bền: khai báo biến CSS (`:root{--x:{{ settings.x }}}`)
trong `layouts/theme.bwt`/snippet rồi để SCSS dùng `var(--x)`; JS đọc biến toàn cục do snippet in ra.

## Gỡ lỗi nhanh

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
| :-- | :-- | :-- |
| `Swiper is not defined`, mất jQuery | `swiper.js.bwt`/`jquery.js.bwt` bị nén nguyên ⇒ Sapo trả rỗng | Dùng kit (bước staging render ra `.js`); kiểm tra trong zip file `assets/swiper.js` > 0 byte |
| Mất toàn bộ CSS | `.scss.bwt` nén nguyên, hoặc 1 SCSS lỗi libsass | Chạy `check-sapo-libsass.js`; tránh `min()/max()` trộn đơn vị |
| Zip bị báo "Giao diện không hợp lệ" | Zip lồng thư mục / thiếu `configs`,`layouts` / thiếu template bắt buộc | Chạy `validate-sapo-zip.js` đọc danh sách lỗi |
| `settings_schema` bị từ chối | Kiểu field lạ, `default` ở kiểu không cho phép | Xem lỗi từ `validate-sapo-zip.js` |
| Mất ảnh | Ảnh trong `assets/` bị chính sách ảnh loại | Đặt `SAPO_KEEP_ALL_IMAGES=1` |
| `không chạy được Python + libsass` | Chưa `pip install libsass` | Cài rồi chạy lại |

## Chạy lẻ từng bước

```bash
node scripts/clean-sapo.js            # xoá sapo-dist/ + zip cũ
node scripts/build-sapo-staging.js    # dựng sapo-dist/
node scripts/check-sapo-libsass.js    # thử biên dịch SCSS
node scripts/package-sapo.js          # nén zip
node scripts/validate-sapo-zip.js [đường-dẫn-zip]
```
