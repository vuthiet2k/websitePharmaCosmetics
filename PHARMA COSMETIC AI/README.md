# Pharma Cosmetics AI — API tra cứu (bản chạy được trên nền tảng miễn phí)

API nhỏ (FastAPI) giúp khách hỏi nhanh: **địa chỉ / hotline / giờ mở cửa**, **sản phẩm** và **bài viết** liên quan tới tình trạng da.
Nó tìm trong dữ liệu thật của website bằng BM25 và trả về đường dẫn thật. Không GPU, không cơ sở dữ liệu.
Bản Cloudflare Worker có thêm **tầng LLM tuỳ chọn** (Workers AI, miễn phí 10.000 Neurons/ngày) — xem mục «Tầng LLM»; bản Python chỉ có bộ lõi tĩnh.

## Nó làm gì / không làm gì
- Làm: tìm không phân biệt dấu (`mun an` = `mụn ẩn`), trả địa chỉ/hotline/giờ mở cửa lấy từ cấu hình website, gợi ý tối đa 3 sản phẩm + 2 bài viết.
- Thứ tự nhận diện ý định (24/11/2026, SPEC-AI-CHAT-TONE-01; Python và Worker giống hệt từng ký tự): **cảnh báo đỏ** `red` (mang thai/cho con bú, sưng, rát, nổi mẩn, mề đay, khó thở… ⇒ không gợi ý SP, khuyên ngừng sản phẩm, liên hệ Chuyên gia/cơ sở y tế, `needs_contact`) → `claim` (hỏi cam kết «chữa khỏi / dứt điểm / bao lâu thì hết» ⇒ không cam kết, mời đặt lịch Chuyên gia) → `book` (đặt lịch, hỏi Chuyên gia/dược sĩ) → `skin` (soi da/quiz) → `callback` (khách gửi SĐT/email hoặc xin gọi lại ⇒ báo đã ẩn thông tin, KHÔNG hứa gọi lại, chỉ hotline/Zalo) → `faq` (giao hàng, COD, thanh toán, đổi trả, chính hãng, còn hàng ⇒ hotline/Zalo + mục Chính sách, không bịa chính sách) → `price` (hỏi giá không kèm tên SP ⇒ hỏi lại, không báo số tiền) → `store` (địa chỉ, giờ/ngày mở cửa, SĐT shop) → `bye` → `thanks` → `ack` («ok», «ừ», «dạ vâng») → `vent` (than phiền «da xấu quá» ⇒ đồng cảm + mời mô tả/soi da) → `greet`/`help` (chào lần đầu kèm menu; chào lần sau trong phiên không lặp menu) → `product` (có từ khoá thật + có SP/bài viết khớp tiêu đề) → `nomatch` (không khớp gì ⇒ gợi ý cách mô tả + mời liên hệ Chuyên gia, `needs_contact`); `blocked` = câu trả lời bị chặn bởi kiểm tra phát ngôn. Câu chào/«bye»/«cảm ơn» chỉ là ý định xã giao khi KHÔNG còn từ khoá thật (câu chào kèm «mụn ẩn» vẫn ra `product`).
- Giọng điệu: xưng «em – bạn», mọi câu trả lời mở bằng «Dạ», chuỗi cố định (không random), không emoji, không «Bác sĩ». Câu «Thông tin chỉ mang tính tham khảo…» chỉ gắn khi có SP/bài viết hoặc ý định sức khoẻ (`red, skin, claim, nomatch, blocked`). Không bao giờ gợi ý SP có «kê đơn» trong tiêu đề.
- Response có thêm trường `intent` (một trong: `red, claim, book, skin, callback, faq, price, store, bye, thanks, ack, greet, help, vent, product, nomatch, blocked`); các trường cũ giữ nguyên. Lịch sử hội thoại: chỉ đọc tin `assistant` để biết đã gửi menu chưa.
- Phân biệt dấu khi khách gõ CÓ dấu (24/11/2026, SPEC-AI-LLM-01): từ khớp tiêu đề phải cùng dấu — «nám» không ra kem trị «nấm», «mấy» không ra «mày», «gọi» không ra «gội», «dầu» khác «đầu» (coi «hoà»/«hòa» là một); gõ không dấu thì vẫn so bỏ dấu như cũ. Viết tắt `kcn` (kem chống nắng), `srm` (sữa rửa mặt), `tdc` (tẩy da chết), `nhh` (nước hoa hồng). Cảnh báo đỏ bắt «rát» **có dấu** ở mọi vị trí («rát đỏ», «hơi đỏ rát», «da rát»…) — BUG-03.
- Ngưỡng liên quan: chỉ giữ SP/bài viết có **tiêu đề chứa ≥1 từ khoá thật** của câu hỏi (bỏ từ đệm, từ mua bán, danh xưng «bác sĩ / dược sĩ / chuyên gia / tư vấn viên», thứ/ngày trong tuần, «gọi lại/gọi điện», nhãn `[SĐT đã ẩn]`); không còn gì ⇒ `needs_contact=true`.
- Không làm: **không báo giá, tồn kho, khuyến mại** (đổi theo thời gian, chỉ dẫn vào trang sản phẩm); không tạo đơn; không chẩn đoán; không tư vấn phác đồ — việc này do Chuyên gia thực hiện.
- Câu «Thông tin chỉ mang tính tham khảo…» chỉ kèm khi có SP/bài viết hoặc ý định sức khoẻ (`red, skin, claim, nomatch, blocked`); câu xã giao, cửa hàng, FAQ, báo giá, gọi lại, đặt lịch không kèm (AC-02.10).

## Cấu trúc
```
app/main.py         API (/, /healthz, POST /api/v1/chat) + CORS + rate limit
app/hybrid_rag.py   BM25 + chuẩn hoá tiếng Việt
app/guardrails.py   che SĐT/email/CMND-CCCD, chặn phát ngôn y khoa vi phạm
app/config.py       biến môi trường
data/               knowledge_base.json + store_info.json (SINH RA từ website — xem bên dưới)
scripts/sync_data.py  đồng bộ dữ liệu từ website
tests/              pytest (24 test) + scenarios.json (141 kịch bản dùng chung với Worker) + golden_replies.json (response vàng sinh từ Python: UPDATE_GOLDEN=1 pytest -k golden)
Dockerfile          ảnh nhỏ, chạy user thường, đọc cổng từ biến PORT
```

## Chạy thử
```bash
python -m venv .venv && . .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python scripts/sync_data.py                          # chạy khi nội dung website đổi, rồi commit 2 file trong data/
APP_ENV=development uvicorn app.main:app --reload    # /docs chỉ mở khi APP_ENV=development
pytest -q tests
(cd cloudflare && node test/parity.test.mjs && node test/llm.test.mjs)    # Worker khớp bản Python + file vàng; tầng LLM với AI giả
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
Theme đã gọi API này: `templates/page.chat.bwt` (nhúng iframe qua `snippets/ai_chat.bwt`) đọc địa chỉ từ cấu hình theme `ai_chat_api_url`, bật/tắt bằng `ai_chat_enable`.

## Tầng LLM — Cloudflare Workers AI (24/11/2026, SPEC-AI-LLM-01; chỉ bản Worker)
Mã: `cloudflare/src/llm.js`, bật bằng `AI_LLM = "on"` + binding `[ai]` trong `cloudflare/wrangler.toml`.
- **Tầng 1 — bộ lõi tĩnh (0 Neuron):** ẩn PII → cảnh báo đỏ → 17 ý định (FAQ, cửa hàng, giá, chào hỏi…). Các ý định này **không bao giờ** gọi LLM.
- **Tầng 2 — chọn SP + lời dẫn** (chỉ ý định `product`): BM25 lấy ≤8 SP ứng viên (đã lọc dấu, lọc «kê đơn») → `@cf/google/gemma-4-26b-a4b-it` (Llama 3.1 8B fp8 đã ngừng 20/11/2026) trả JSON `{"chon":[…],"loi":"Dạ…"}`: chọn ≤3 SP **trong danh sách** (loại SP lạc ngữ cảnh, vd «da dầu» ra dầu gội) + 1–3 câu dẫn giọng «Dạ… em – bạn». Danh sách link, câu mời Chuyên gia và câu miễn trừ vẫn là chuỗi tĩnh.
- **Tầng 3 — chuẩn hoá câu** (chỉ khi BM25 không ra gì): `llama-3.2-3b-instruct` thêm dấu/sửa chính tả/viết đủ viết tắt rồi tìm lại một lần; câu chuẩn hoá lộ dấu hiệu đỏ ⇒ cảnh báo đỏ.
- **Cổng an toàn lời dẫn** (`leadOk`): phải mở bằng «Dạ», ≤420 ký tự, ≤3 câu, một đoạn, không chữ số, không viết hoa giữa câu (tên thuốc/hãng), chặn các nhóm từ: thuốc & hoạt chất kê đơn, thai kỳ/cho bú, hứa hiệu quả («trị, khỏi, dứt, an toàn, tuyệt đối, hiệu quả, cam kết»), chẩn đoán/bệnh/viêm/nấm, xưng hô sai («bác sĩ, BS, anh, chị, mẹ…»), giá/mua; không link/@/markdown/emoji, phải là tiếng Việt có dấu, qua `complianceOk`. Trượt ⇒ câu dẫn tĩnh. JSON hỏng / số thứ tự lạ ⇒ bỏ toàn bộ kết quả LLM.
- **Hạ cấp tự động:** lỗi, quá `AI_TIMEOUT_MS` (4 giây) hoặc hết 10.000 Neurons/ngày ⇒ trả lời bằng bộ lõi tĩnh (y hệt khi không có LLM); hết hạn mức thì cầu dao tắt LLM tới 00:00 UTC, lỗi khác tắt 60 giây.
- **Chi phí ước tính** (đơn giá chính thức 18/11/2026): chọn SP bằng Gemma 4 ~8,2 Neuron/lượt ⇒ ~1.200 lượt tư vấn/ngày miễn phí; chuẩn hoá câu ~2 Neuron/lượt. Câu chuẩn hoá phải qua lại cảnh báo đỏ / cam kết / đặt lịch / chính sách trước khi tìm SP.
- **Riêng tư:** chỉ gửi câu hỏi cuối đã che SĐT/email/CCCD + tên SP công khai; không gửi lịch sử chat; không ghi log. Workers AI không dùng dữ liệu khách để huấn luyện. Không bật cache/log của AI Gateway (chúng lưu câu hỏi).
- **Theo dõi:** header `X-Answer-Source: static | llm | llm-rewrite` (JSON trả về không đổi, theme không phải sửa).
- **Chưa kiểm với model thật:** test dùng AI giả (`node test/llm.test.mjs`). Sau khi triển khai phải thử thật bộ câu tư vấn, xem tỉ lệ `X-Answer-Source: llm` và chất lượng lời dẫn; tắt bằng `AI_LLM = "off"`.

## Hướng phát triển (chưa làm)
- Tìm kiếm ngữ nghĩa Vectorize (gói Free: 5 triệu chiều lưu, 30 triệu chiều truy vấn/tháng tính theo (số truy vấn + số vector lưu) × số chiều): 5.680 mục × 768 chiều = 4,36 triệu ⇒ ~33.000 truy vấn/tháng. Dùng `@cf/qwen/qwen3-embedding-0.6b` (rút được số chiều) thay `bge-m3` (cố định 1.024 chiều ⇒ 5,8 triệu, vượt trần). Cần chủ tài khoản Cloudflare tạo index và nạp vector.
- Tài liệu nghiên cứu phương án máy chủ riêng: `docs/NGHIEN-CUU-TRIEN-KHAI-AI-CUC-BO.md` — nghiên cứu, **không phải hiện trạng**.
