# Dữ liệu cấu hình đang lưu

- `settings.csv`: bảng kiểm tra bằng Excel, có nhãn và nhóm cấu hình.
- `current.json`: toàn bộ giá trị hiện tại.
- `settings_data.json` và `settings_schema.json`: bản xuất nguyên vẹn để đối chiếu/khôi phục.
- Các JSON đánh số: dữ liệu tách theo từng nhóm, kèm định nghĩa trường.
- `unmapped.json`: các giá trị chưa có định nghĩa trong schema.

Đây là bản xuất để kiểm tra. Website vẫn đọc `configs/settings_data.json` theo chuẩn Sapo; chỉnh bản xuất không tự thay đổi website.
