# Trạng thái thực thi — Unify Font & SHB

Ngày bắt đầu: 19/09/2026

## Gói A — Inventory/baseline

- [x] Đọc AGENTS.md, Rule&HDKTXD.md và hai `.clinerules`.
- [x] Xác nhận working tree đang có thay đổi trước đó; không reset.
- [x] Quét nguồn font và dependency SHB; kết quả nằm ở `font-inventory.txt` và `shb-runtime-inventory.txt`.
- [x] Chụp baseline runtime bằng preview và kiểm tra route SHB ở 1440px; mọi route kiểm tra trả 200, không overflow, không page error.

## Gói B — UI contract

- [x] Hoàn thiện `UI-CONTRACT.md` và áp dụng token Montserrat ở layout/token trung tâm.

## Gói C

- [x] Hợp nhất request font chữ và alias token về Montserrat; giữ font icon.
- [x] Build Tailwind/theme và kiểm tra computed font trên storefront, SHB, AI, portal, payment, chuyên gia.

## Gói D

- [x] SHB tiếp tục dùng `theme.bwt` và khung `.sh-container` 1180px/32px đồng bộ storefront.
- [x] Giới hạn reset/reveal SHB trong `.pc-clinic-content`.
- [x] Chuyển utility SHB còn dùng ra snippet, xoá asset shell `global_skinhealthy.scss.bwt` đã không còn consumer.

## Gói E–G — Chưa bắt đầu

Mỗi mục chỉ đánh dấu khi có lệnh kiểm chứng tương ứng; không dùng ý định thay cho bằng chứng.

## Chốt thực thi 19/09/2026

- Bổ sung `page.skinhealthy-service-detail` vào nhận diện SHB của `theme.bwt`, nên cả trang chi tiết dùng khung/header/footer chung.
- Xoá include stale của `global_skinhealthy.scss.bwt`; ba asset SHB còn lại được giữ vì có consumer thật.
- Montserrat đã được kiểm tra computed style ở body, heading, paragraph, link, button, input và select trên 40 lượt route/viewport (320, 390, 768, 1440, 1920px): tất cả đều trả về Montserrat, không overflow và không page error.
- Portal regression: 18/18 đạt sau khi cập nhật assertion font từ Fraunces sang Montserrat; lần chạy trước có một test cart flaky, chạy riêng đã đạt.
- Còn cảnh báo baseline: patient portal preview trả 404 `/bizweb-api.js`, `/common.js`, `/customer.js`; các route khác không có 404 local.
- Ghi chú: dòng “Gói E–G — Chưa bắt đầu” phía trên là trạng thái trước khi chạy; phần “Chốt thực thi” ngay dưới là trạng thái cuối cùng sau kiểm chứng.
- Trang detail dùng wrapper/style SHB chung nhưng không nạp `skinhealthy_content_script.bwt`; `SHCart` chỉ có ở index/services/collection và test add/remove/reset đã đạt tại 320/768/1440px.
