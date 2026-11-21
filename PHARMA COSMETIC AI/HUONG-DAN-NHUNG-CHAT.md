# Nhúng trang chat toàn năng bằng iframe

Trang chat (`templates/page.chat.bwt`, layout riêng `layouts/chat.bwt` — không header/footer) gồm: chat AI tra cứu, gửi ảnh để soi da,
bật camera soi da ngay trong chat, kết quả trả lời trong chat, lối vào quiz.

## Tạo trang trên Sapo (1 lần)
Website › Trang nội dung › Thêm trang: tiêu đề **Chat AI**, đường dẫn `chat-ai`, giao diện **page.chat**. Địa chỉ: `/pages/chat-ai`.
Cấu hình theme › Liên hệ › Chat AI tư vấn: bật, nhập **Địa chỉ API** (Cloudflare Worker) và **Đường dẫn trang chat** (`/pages/chat-ai`).

## Nhúng vào trang bất kỳ
```html
<iframe src="/pages/chat-ai" title="Chat Pharma Cosmetics" allow="camera" loading="lazy"
        style="width:100%;height:640px;border:0;border-radius:16px"></iframe>
```
- `allow="camera"` **bắt buộc** nếu muốn bật camera trong iframe.
- Trang chat gửi `postMessage({type:'pc-ai-chat:close'})` cho trang cha khi khách bấm nút X (chỉ khung nổi của theme dùng tới).
- Nhúng sang **website khác tên miền**: Sapo/CDN phải cho phép đóng khung (không gửi `X-Frame-Options: SAMEORIGIN`); và `ALLOWED_ORIGINS`
  của Worker phải có tên miền trang chat (là tên miền Sapo, không phải tên miền trang cha). Chưa kiểm tra trên Sapo thật.

## Bảo mật & giới hạn
- Ảnh chỉ xử lý trong trình duyệt khách (không gửi đi); API chat chỉ nhận chữ khách gõ.
- Chưa có model ONNX (`ai_skin_scan_onnx_model_url` trống) ⇒ kết quả là phép đo ảnh thử nghiệm; thẻ kết quả ghi rõ điều này.
