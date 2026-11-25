# Kiến trúc hiện tại (v1.1)

```
Website (Sapo)  --HTTPS-->  FastAPI  /api/v1/chat
                              1. rate limit theo IP, kiểm độ dài/số tin
                              2. mask_pii (SĐT, email, CMND/CCCD)
                              3. BM25 trên data/knowledge_base.json (sản phẩm, bài viết, cửa hàng)
                              4. ghép câu trả lời từ dữ liệu thật + đường dẫn thật
                              5. check_medical_compliance trên câu trả lời, vi phạm ⇒ câu trả lời an toàn
```

## Nguyên tắc
- **Không bịa dữ liệu:** không giá, tồn kho, khuyến mại, % đã bán, đánh giá. Chỉ trả những gì có trong dữ liệu website; thiếu ⇒ mời liên hệ Chuyên gia.
- **Vai trò con người là trung tâm:** khám da, đánh giá, phác đồ do Chuyên gia thực hiện; hệ thống chỉ là công cụ tra cứu. Danh xưng «Chuyên gia», không dùng «Bác sĩ» (RULE-P0-02).
- **Dữ liệu cửa hàng lấy từ `configs/settings_data.json`** qua `scripts/sync_data.py`, không gõ tay trong mã.
- **Riêng tư:** nội dung khách nhập chỉ xử lý trong bộ nhớ, không ghi log, không lưu. Không có tài khoản/đơn hàng.
- **Bảo vệ khi công khai:** CORS theo danh sách domain, rate limit, giới hạn độ dài, tắt `/docs` ở production, chạy bằng user không phải root.

## Đã loại khỏi bản cũ (vì chưa từng chạy hoặc không phù hợp miễn phí)
vLLM/Qwen, Qdrant, Redis, bge-m3, semantic cache, MCP tra giá Sapo (dữ liệu mẫu cứng), tạo đơn bằng OTP mẫu.
Muốn làm lại các phần này phải có thiết kế thật (nguồn giá thật, OTP thật, lưu vết) và đánh giá pháp lý trước. Xem tài liệu nghiên cứu để tham khảo.

## Hạn chế đã biết
- Gợi ý theo từ khoá nên có lúc lệch ngữ cảnh (vd. hỏi «mụn» có thể ra cả sản phẩm kê toa). Cần Chuyên gia/nội dung duyệt nếu đưa lên giao diện khách.
- Rate limit nằm trong bộ nhớ: chỉ chính xác với 1 instance; nhiều instance cần kho dùng chung.
