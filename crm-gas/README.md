# CRM Intake GAS độc lập

1. Tạo một dự án Google Apps Script mới, dán nguyên `crm_intake_service.js`.
2. Trước khi chạy setup, đặt `CRM_DRIVE_FOLDER_ID` nếu cần lưu Sheet vào một thư mục Drive cụ thể. Chạy `setupCrmSpreadsheet()` một lần và cấp quyền; hàm sẽ tạo Google Sheet CRM riêng cùng 3 tab `AI_Chat_Results`, `Contact_Leads`, `System_Audit_Logs` và tự lưu `CRM_SPREADSHEET_ID` vào Script Properties.
3. Deploy dự án này như Web app, Execute as: **Me**, Who has access: chọn đúng đối tượng khách truy cập theo chính sách vận hành. Sao chép URL `/exec` vào Theme Settings → `CRM độc lập — Thu thập Chat AI & Liên hệ`.
4. Bật `crm_intake_enabled` sau khi kiểm tra endpoint. Khi URL trống hoặc công tắc tắt, storefront giữ safe-mode và không gửi dữ liệu.

Không dùng lại project, Spreadsheet ID, Script Property hay URL thuộc `mops-gas/`. Không đặt token bí mật vào Theme Settings: giá trị setting được render cho trình duyệt, không phải nơi lưu secret.

Kiểm tra thủ công trước bàn giao: gửi một `save_ai_chat` với `consent: true`, một `submit_contact` với số `0xxxxxxxxx`, xác nhận mỗi tab tăng đúng một hàng; gửi request không consent phải thất bại và không có hàng dữ liệu mới.

## Cập nhật 1.3.0 (10/10/2026) — bắt buộc deploy lại

`get_customer_info` / `lookup_customer` không còn trả dữ liệu hồ sơ khi tra theo SĐT, email hoặc customer_id (endpoint
công khai nên ai cũng gửi được thông tin của người khác). Hồ sơ đầy đủ chỉ trả khi khớp `submission_id` hoặc
`session_id`, là các mã ngẫu nhiên mà trình duyệt của khách tự giữ. Tra theo định danh chỉ trả `found: true, limited: true`.

Cách cập nhật: dán lại toàn bộ `crm_intake_service.js` vào dự án GAS › **Deploy › Manage deployments › Edit › Version:
New version › Deploy**. Giữ nguyên URL `/exec`, không tạo deployment mới.
