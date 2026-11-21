# Pharma Cosmetics AI — API tra cứu (bản chạy được trên nền tảng miễn phí)

API nhỏ (FastAPI) giúp khách hỏi nhanh: **địa chỉ / hotline / giờ mở cửa**, **sản phẩm** và **bài viết** liên quan tới tình trạng da.
Nó tìm trong dữ liệu thật của website bằng BM25 và trả về đường dẫn thật. **Không dùng LLM, không GPU, không cơ sở dữ liệu.**

## Nó làm gì / không làm gì
- Làm: tìm không phân biệt dấu (`mun an` = `mụn ẩn`), trả địa chỉ/hotline/giờ mở cửa lấy từ cấu hình website, gợi ý tối đa 3 sản phẩm + 2 bài viết.
- Không làm: **không báo giá, tồn kho, khuyến mại** (đổi theo thời gian, chỉ dẫn vào trang sản phẩm); không tạo đơn; không chẩn đoán; không tư vấn phác đồ — việc này do Chuyên gia thực hiện.
- Câu trả lời luôn kèm lời nhắc: chỉ mang tính tham khảo.

## Cấu trúc
```
app/main.py         API (/, /healthz, POST /api/v1/chat) + CORS + rate limit
app/hybrid_rag.py   BM25 + chuẩn hoá tiếng Việt
app/guardrails.py   che SĐT/email/CMND-CCCD, chặn phát ngôn y khoa vi phạm
app/config.py       biến môi trường
data/               knowledge_base.json + store_info.json (SINH RA từ website — xem bên dưới)
scripts/sync_data.py  đồng bộ dữ liệu từ website
tests/              pytest (11 test)
Dockerfile          ảnh nhỏ, chạy user thường, đọc cổng từ biến PORT
```

## Chạy thử
```bash
python -m venv .venv && . .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python scripts/sync_data.py                          # chạy khi nội dung website đổi, rồi commit 2 file trong data/
APP_ENV=development uvicorn app.main:app --reload    # /docs chỉ mở khi APP_ENV=development
pytest -q tests
```

## Biến môi trường (xem `.env.example`)
| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `ALLOWED_ORIGINS` | Domain được gọi API (CSV). **Bắt buộc đặt đúng domain website khi deploy**; trống = chặn mọi domain khác | trống |
| `RATE_LIMIT_PER_MIN` | Số yêu cầu / phút / IP | 20 |
| `TRUST_PROXY` | `true` khi chạy sau proxy của nền tảng để lấy đúng IP khách | false |
| `MAX_CHARS` / `MAX_MESSAGES` | Giới hạn độ dài câu hỏi / số tin | 500 / 20 |
| `APP_ENV` | `production` tắt `/docs` | production |

## Deploy miễn phí trên Cloudflare Workers (khuyên dùng — không cần máy chủ, không cần thẻ)
Thư mục [`cloudflare/`](./cloudflare/) là bản port cùng hành vi sang Cloudflare Workers (JavaScript). Gói miễn phí giới hạn **100.000 yêu cầu/ngày** và **~10ms CPU/lần gọi**, nên chỉ mục BM25 được **tính sẵn** (`python scripts/build_cf_index.py`) thay vì dựng lúc chạy.
- Hướng dẫn cài từng bước (viết để giao cho Claude trong Chrome làm giúp): [`cloudflare/HUONG-DAN-CAI-DAT-CLOUDFLARE.md`](./cloudflare/HUONG-DAN-CAI-DAT-CLOUDFLARE.md)
- Kiểm thử: `cd cloudflare && node test/parity.test.mjs` (so khớp điểm với bản Python + kiểm hành vi API)
- Khi nội dung website đổi: `python scripts/sync_data.py && python scripts/build_cf_index.py`, commit `data/` và `cloudflare/` rồi push — Cloudflare tự triển khai lại.

## Deploy miễn phí bằng Docker (Python)
Ảnh Docker chỉ cần ~100MB RAM, phù hợp các gói miễn phí hỗ trợ Docker hoặc Python (Hugging Face Spaces, Render, Cloud Run...). Điều kiện miễn phí của từng nền tảng hay đổi — kiểm tra lại trước khi chọn.
1. Chạy `python scripts/sync_data.py`, commit `data/knowledge_base.json` và `data/store_info.json`.
2. Đặt biến môi trường: `ALLOWED_ORIGINS=https://<domain website>`, `TRUST_PROXY=true`.
3. Lưu ý gói miễn phí thường **ngủ khi không có khách**: lần gọi đầu có thể chậm hàng chục giây — widget chat nên hiển thị trạng thái «đang kết nối».
4. Dữ liệu chạy trên máy chủ của bên thứ ba: **không còn là «on-premise»**. Chỉ lưu thông tin công khai của website; câu hỏi khách được che SĐT/email/CMND trước khi xử lý và **không bị ghi log**. Cập nhật chính sách bảo mật của website cho khớp.

## Gọi từ website
`POST {API}/api/v1/chat` với `{"messages":[{"role":"user","content":"..."}]}` → `{reply, related_products, related_articles, store_info}`.
Theme chưa gọi API này. Khi nối vào widget chat: lấy địa chỉ API từ **cấu hình theme** (không gõ cứng trong snippet), gọi qua HTTPS.

## Hướng phát triển (chưa làm)
Nếu muốn câu trả lời tự nhiên bằng LLM: dùng API của nhà cung cấp, có đánh giá pháp lý riêng (chuyển dữ liệu ra ngoài, Nghị định 13/2023). Tài liệu nghiên cứu phương án máy chủ riêng nằm ở `docs/NGHIEN-CUU-TRIEN-KHAI-AI-CUC-BO.md` — đó là nghiên cứu, **không phải hiện trạng**.
