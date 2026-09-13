---
description: Tự tìm hiểu và xử lý một vấn đề cụ thể trên theme (bug, báo cáo QA, yêu cầu nhỏ), tự quyết định cách sửa, rồi báo cáo kết quả — độc lập, KHÔNG dùng lại hệ thống .project-agent/ đã bị xoá trước đây.
argument-hint: <mô tả vấn đề, hoặc đường dẫn tới file báo cáo/kết quả kiểm thử>
---

Vấn đề cần xử lý: $ARGUMENTS

Đây là phiên bản MỚI, nhẹ, của lệnh `/goal` — chạy MỘT LẦN cho đúng vấn đề được đưa vào ở trên,
KHÔNG phải vòng lặp nền liên tục, và KHÔNG được dựng lại kiến trúc `.project-agent/`
(STATE.json / ACCEPTANCE.yaml / EXECUTION_PLAN.yaml / FINAL_REPORT.json...) mà người dùng đã chủ
động xoá bỏ trước đây (xem commit `58bda23`, `952d950`). Không tạo lại các file/thư mục đó dưới
bất kỳ hình thức nào trong quá trình xử lý.

## Quy trình xử lý

1. **Đọc vấn đề cho kỹ.** Nếu $ARGUMENTS trỏ tới một file (báo cáo kiểm thử, ảnh chụp, log lỗi...),
   đọc toàn bộ nội dung file đó trước khi làm gì khác — không chỉ đọc phần tóm tắt/kết luận.

2. **Đối chiếu với code THẬT trước khi sửa.** Báo cáo (đặc biệt báo cáo QA từ bên ngoài) có thể mô
   tả một bản build cũ, hoặc đề xuất cách sửa xung đột với một quyết định thiết kế đã được chốt gần
   đây. Trước khi áp dụng bất kỳ đề xuất nào, kiểm tra: `git log` gần đây, các comment
   "REOPEN"/"T-xxx" trong code, và thư mục `design/` (mockup đã được chọn). KHÔNG áp dụng máy móc
   đoạn code/gợi ý trong báo cáo nếu nó mâu thuẫn với hướng thiết kế đã chốt — tự đo giá trị màu,
   layout, dữ liệu thật trong code hiện tại rồi mới quyết định sửa gì.

3. **Tự quyết định, không hỏi lại giữa chừng.** Không dừng lại xin xác nhận từng bước nhỏ. Đưa ra
   phán đoán hợp lý nhất dựa trên dữ liệu đo được trong code, quy ước đã có trong repo, và mức độ
   rủi ro. Chỉ dừng lại hỏi người dùng nếu hành động có tính phá huỷ thật sự không thể hoàn tác dễ
   dàng (xoá dữ liệu, force-push, đổi hướng thiết kế đã chốt trên diện rộng, sửa vào vùng dữ liệu
   khách hàng thật) — còn lại thì làm rồi báo cáo, không xin phép trước.

4. **Không tự bịa dữ liệu.** Không thêm số liệu/nội dung giả (% đã bán, đánh giá khách hàng, thống
   kê...) chỉ để "trông đẹp hơn". Nếu một đề xuất đòi hỏi dữ liệu không có thật, bỏ qua đề xuất đó
   và ghi rõ lý do trong báo cáo cuối.

5. **Sửa trực tiếp trong code.** File nào không sửa trực tiếp được (do cấu trúc, do phụ thuộc dữ
   liệu admin/settings...), tìm cách khác để đạt cùng mục tiêu (thêm biến settings, CSS override,
   sửa template/snippet khác cùng ảnh hưởng...) — không bỏ sót lỗi chỉ vì file "khó sửa".

6. **Kiểm tra tối thiểu, đúng trọng tâm.** Chỉ chạy kiểm tra/build liên quan trực tiếp đến phần vừa
   sửa (vd: dry-compile riêng phần SCSS vừa đổi, hoặc soi nhanh 1 khu vực vừa sửa). KHÔNG chạy lại
   toàn bộ bộ test Playwright/QA một cách máy móc trừ khi vấn đề yêu cầu rõ ràng.

7. **Báo cáo kết quả cuối bằng tiếng Việt, ngắn gọn, có cấu trúc:**
   - Tóm tắt đã hiểu vấn đề là gì
   - Đã sửa gì, ở file/dòng nào, vì sao đó là cách sửa đúng
   - Đã CỐ TÌNH không sửa gì (và lý do — ví dụ mâu thuẫn thiết kế đã chốt, thiếu dữ liệu thật, rủi
     ro cao cần xác nhận trước)
   - Việc còn lại (nếu có) cần người dùng quyết định hoặc cung cấp thêm dữ liệu

Không tạo file trạng thái/roadmap riêng lưu trên đĩa giữa các lần chạy (không STATE.json, không
`.project-agent/`) — toàn bộ "lộ trình" nằm trong 7 bước trên, thực hiện ngay trong phiên làm việc
hiện tại rồi báo cáo kết quả.
