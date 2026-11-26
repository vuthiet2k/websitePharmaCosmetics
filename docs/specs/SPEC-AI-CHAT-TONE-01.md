# SPEC-AI-CHAT-TONE-01 — Chat AI thân thiện hơn + đáp đúng kịch bản khách thật

- Ngày: 24/11/2026 · Nhánh: `hugo_dev` · BA: ba-lead · Trạng thái: **READY** (giao việc được; `open_questions` mục 7 không chặn)
- Yêu cầu nguyên văn (explicit): «tự tiến hành kiểm tra kĩ update cho AI. đảm bảo chat thân thiện 1 chút, đáp ứng kịch bản»
- Căn cứ rule (chỉ trích mã): RULE-P0-02 (Chuyên gia, không «Bác sĩ»), ANTI-FAB (không bịa giá/chính sách/cam kết),
  UI-9.3 (không emoji), RULE-P0-06, `.clinerules/02` (comment tiếng Việt + ngày), điểm dừng BA (settings/deploy).

## 1. Bối cảnh & hiện trạng

Module `PHARMA COSMETIC AI/` có 2 bản phải ra **kết quả giống hệt**: FastAPI `app/main.py` (+ `app/guardrails.py`) và
Worker `cloudflare/src/index.js` (production `https://pharma-cosmetics-ai.vuthiet2k.workers.dev`, tự deploy khi push `hugopc_dev`).
Không LLM: BM25 + regex ý định. Giao diện `templates/page.chat.bwt` gửi **6 tin gần nhất** (cả `assistant`) lên API
(dòng 137, 249) và hiện hotline + Zalo khi `needs_contact` (dòng 256).

Xưng hô hiện tại **«em – bạn»** đã nhất quán ở API và toàn bộ giao diện (lời chào `ai_chat_welcome`, chip «Bạn có thể làm gì?»,
placeholder, thông báo lỗi) ⇒ spec **giữ «em – bạn»** (xem OQ-1).

### 1.1 Baseline (BA chạy 24/11/2026)

| Lệnh | Kết quả |
|---|---|
| `pytest -q tests` (venv scratchpad, Python 3.14) | `17 passed` · exit 0 |
| `node test/parity.test.mjs` (Node 24) | `35 kiểm tra đạt.` · exit 0 |
| Thăm dò 47 câu đời thường trên Python (TestClient) rồi so Worker (in-process) | Python ≡ Worker 47/47 (reply, SP, store, needs_contact) |
| Gọi production 4 câu (urllib UTF-8) | Tái hiện y hệt lỗi bên dưới (prod = code hiện tại) |

### 1.2 Vấn đề phát hiện (câu hỏi → trả lời hiện tại)

**A. Sai kịch bản / gợi ý lạc đề (nghiêm trọng)**

| # | Câu khách | Hiện tại | Lỗi |
|---|---|---|---|
| A1 | «bôi xong bị rát đỏ» | 3 SP: *BIOLIFE VAGISENS… khô âm đạo*, *Cumlaude… vùng kín*, *máy xông hơi*; `needs_contact=false` | `RED_RE` có «đỏ rát» nhưng không có «rát đỏ» ⇒ lọt cảnh báo đỏ, gợi ý SP phụ khoa |
| A2 | «mụn trứng cá nặng có chữa khỏi không» | Gợi ý *Accufine 20mg – **Thuốc kê đơn** Isotretinoin* | Câu hỏi cam kết khỏi + gợi ý thuốc kê đơn |
| A3 | «sđt của em 0912345678 gọi lại tư vấn nhé» | 3 SP **dầu gội** («gọi» → «gội») | Không có ý định «xin gọi lại»; không báo đã ẩn số |
| A4 | «mấy giờ mở cửa» | Thông tin cửa hàng **+ 3 serum lông mày** («mấy» → «mày») | `STORE_WORDS` thiếu «may» |
| A5 | «chủ nhật có mở không» | Không có thông tin cửa hàng, 3 SP lạc đề | Không nhận diện hỏi giờ/ngày mở |
| A6 | «số điện thoại shop» | Cửa hàng + *Genacol xương khớp*, *gel điện giải*… | «shop» không thuộc `STORE_WORDS` |
| A7 | «có giao hàng tỉnh không» | FAQ + 3 SP «**TINH** DẦU / **TINH** CHẤT» | «tỉnh» → «tinh» thành từ khoá |
| A8 | «thanh toán bằng gì» | FAQ + 3 SP «cân **BẰNG**» | «bằng» thành từ khoá |
| A9 | «ừ» | 3 SP *LAIT **U***, son dưỡng | «u» thành từ khoá |
| A10 | «có bác sĩ không» | 3 SP lạc đề (mặt nạ bạc hà, kẹo canxi trẻ em) | Không định tuyến sang Chuyên gia/đặt lịch (RULE-P0-02) |

**B. Cứng nhắc / khô / lặp máy móc**

| # | Câu khách | Hiện tại | Lỗi |
|---|---|---|---|
| B1 | «tạm biệt», «bye shop» | «Dạ em là trợ lý tra cứu…» + **menu 5 dòng** | Không chào tạm biệt |
| B2 | «ok», «ok em», «dạ vâng» | «Dạ em là trợ lý…» + menu 5 dòng | Câu xác nhận ngắn bị trả cả menu |
| B3 | «cảm ơn em nhiều» | «Dạ không có gì ạ…» + **menu 5 dòng** + câu miễn trừ | Dài, máy móc |
| B4 | «xin chào» (lần 2 trong cùng phiên) | Menu lặp lại y nguyên | Không dùng lịch sử hội thoại |
| B5 | «da mình bị mụn ẩn nên dùng gì» (mọi câu có SP) | Mở đầu thẳng «**Sản phẩm tham khảo**…», không «Dạ», không câu mời hỏi tiếp | Khô |
| B6 | «địa chỉ ở đâu» | Mở đầu thẳng khối in đậm tên cơ sở | Khô |
| B7 | «bao nhiêu tiền» | Menu trợ lý | Không hỏi lại sản phẩm nào / không giải thích vì sao không báo giá |
| B8 | «huhu da xấu quá» | `SAFE_FALLBACK` «chưa có thông tin phù hợp…» | Không đồng cảm, không hướng dẫn mô tả tình trạng da |
| B9 | Mọi câu chào/cảm ơn/cửa hàng | Luôn nối câu «Thông tin chỉ mang tính tham khảo…» | Miễn trừ y tế dán vào cả câu xã giao |

Ghi nhận đúng (giữ nguyên): cảnh báo đỏ thai kỳ/dị ứng, FAQ «còn hàng / đổi trả / phí ship / khuyến mãi», soi da, đặt lịch,
gợi ý SP theo vấn đề da (mụn ẩn, da dầu, da khô, nám, retinol, chống nắng da nhạy cảm, trị thâm, nếp nhăn, son).

## 2. Yêu cầu & tiêu chí nghiệm thu

Quy ước kiểm: mọi AC dưới đây phải được kiểm **tự động ở cả hai bản** — pytest (`tests/test_app.py`) và
`cloudflare/test/parity.test.mjs` — đọc **chung** một file kịch bản `tests/scenarios.json` (mục 3).

### REQ-01 (explicit) — Đáp đúng kịch bản khách thật

| AC | Nội dung đo kiểm | Nguồn |
|---|---|---|
| AC-01.1 | Mọi dòng trong bảng kịch bản (mục 3, ≥ 40 dòng) cho đúng `intent`, đúng có/không `related_products`, đúng `needs_contact`, đúng có/không `store_info`, và `reply` chứa đủ các chuỗi `must` / không chứa chuỗi `must_not` — ở **cả hai** bản | explicit |
| AC-01.2 | Response bổ sung trường `intent` (chuỗi, một trong: `red, claim, book, skin, callback, faq, price, store, bye, thanks, ack, greet, help, vent, product, nomatch, blocked`). Trường thêm mới, không đổi/bỏ trường cũ (`reply, related_products, related_articles, store_info, needs_contact`) | inferred |
| AC-01.3 | Cảnh báo đỏ bắt thêm: «rát đỏ», «bị rát», «nổi mẩn», «mẩn đỏ», «ngứa rát» (A1). «da nhạy cảm sau điều trị», «kem chống nắng cho da nhạy cảm», «da khô bong tróc» **không** thành `red` | inferred |
| AC-01.4 | Câu hỏi cam kết kết quả («chữa khỏi», «khỏi hẳn», «dứt điểm», «bao lâu thì khỏi/hết», «có hết không», «cam kết») ⇒ `intent=claim`: 0 SP, 0 bài viết, `needs_contact=true`, `store_info` có; reply nói không cam kết kết quả + mời đặt lịch Chuyên gia. Ưu tiên sau `red`, trước mọi ý định khác | inferred (ANTI-FAB, RULE-P0-06) |
| AC-01.5 | Không bao giờ gợi ý SP có tiêu đề chứa «kê đơn» (lọc trong bước `pick`, cả hai bản) — hiện có 2 SP Accufine | inferred (xem OQ-2) |
| AC-01.6 | «Bác sĩ / dược sĩ / chuyên gia / tư vấn viên» + «có … không / gặp / hỏi» ⇒ `intent=book`; reply **không** chứa «Bác sĩ»/«bác sĩ» dù khách gõ chữ đó | explicit (RULE-P0-02) |
| AC-01.7 | Khách gửi SĐT/email **hoặc** xin gọi lại («gọi lại», «liên hệ lại», «để lại số», «gọi cho em/mình», «tư vấn qua điện thoại») mà **không** có từ khoá SP thật ⇒ `intent=callback`: 0 SP, `needs_contact=true`, `store_info` có; reply nói đã ẩn thông tin và **không** hứa gọi lại (bot không gọi được — ANTI-FAB). Có SĐT kèm từ khoá thật (vd «tư vấn retinol, sđt 0967194063») ⇒ vẫn gợi ý SP như câu không SĐT **và** thêm 1 câu báo đã ẩn số | inferred |
| AC-01.8 | Hỏi giờ/ngày mở cửa, số điện thoại, «shop ở đâu» (A4–A6: «mấy giờ mở cửa», «mấy giờ đóng cửa», «chủ nhật có mở không», «thứ 7 có làm không», «ngày lễ có mở không», «số điện thoại shop», «sđt shop», «cửa hàng ở đâu») ⇒ `intent=store`, `store_info` có, 0 SP, 0 bài viết | explicit (A4–A6 tái hiện) |
| AC-01.9 | FAQ có từ đệm («giao hàng **tỉnh**», «thanh toán **bằng gì**», «ship **mấy ngày**», «giao **bao lâu**», «**ngoại** thành») ⇒ `intent=faq`, 0 SP; «serum vitamin c có chính hãng không» vẫn có SP + `needs_contact=true` (giữ hành vi cũ) | inferred |
| AC-01.10 | Từ 1–2 chữ cái / tiếng đệm («ừ», «u», «uh», «um», «ờ», «hmm», «??», «...») không thành từ khoá tìm kiếm (A9) | inferred |
| AC-01.11 | Hỏi giá **không** kèm tên/vấn đề («bao nhiêu tiền», «giá sao», «bảng giá») ⇒ `intent=price`, 0 SP, `needs_contact=false`, reply hỏi lại sản phẩm/vấn đề quan tâm và nói giá xem ở trang SP. Hỏi giá **có** từ khoá («giá serum vitamin c bao nhiêu») ⇒ `intent=product` + có SP + reply có câu «giá … xem tại trang sản phẩm». Không bao giờ có số tiền trong reply (regex `\d[\d.,]*\s*(đ|₫|k|vnđ|nghìn|triệu)` = 0) | explicit (ANTI-FAB) |
| AC-01.12 | Không có ý định nào khớp và không có SP/bài viết khớp tiêu đề ⇒ `intent=nomatch`, `needs_contact=true`, reply gợi ý cách mô tả cụ thể (ví dụ loại da/vấn đề) + mời liên hệ Chuyên gia. `SAFE_FALLBACK` chỉ còn dùng khi phát ngôn bị chặn bởi `check_medical_compliance` (`intent=blocked`) | inferred |
| AC-01.13 | Thứ tự ưu tiên ý định cố định và giống nhau ở hai bản: `red > claim > book > skin > callback > faq > price(không từ khoá) > store(chỉ cửa hàng) > bye > thanks > ack > greet/help > vent > product > nomatch`. Câu chào **kèm** từ khoá thật («chào shop, da mình bị mụn ẩn») ⇒ `product` (có SP) nhưng reply mở bằng lời chào | inferred |

### REQ-02 (explicit) — Giọng điệu thân thiện, nhất quán, ngắn gọn

| AC | Nội dung đo kiểm | Nguồn |
|---|---|---|
| AC-02.1 | Mọi reply HTTP 200 **bắt đầu bằng «Dạ»** | explicit |
| AC-02.2 | Xưng hô nhất quán «em – bạn»: reply không chứa «anh/chị», «quý khách», «tôi» (xưng của bot), «mình» (xưng của bot). Kiểm: regex `\b(anh/chị|quý khách)\b` = 0 trên toàn bộ kịch bản | explicit (giữ khớp UI hiện có; OQ-1) |
| AC-02.3 | `bye` («tạm biệt», «bye», «hẹn gặp lại», «chào nhé em đi đây»): chào tạm biệt + mời quay lại; **không** menu, không câu miễn trừ, ≤ 160 ký tự | explicit |
| AC-02.4 | `thanks` («cảm ơn», «thanks», «tks»): đáp lời + mời hỏi tiếp; không menu, không câu miễn trừ, ≤ 160 ký tự. Cảm ơn + tạm biệt cùng câu ⇒ `bye` | explicit |
| AC-02.5 | `ack` («ok», «oke», «dạ», «vâng», «ừ», «được rồi», «ok em»): 1 câu ngắn mời hỏi tiếp; không menu, không SP, ≤ 120 ký tự | explicit |
| AC-02.6 | `greet` lần đầu trong phiên (không có tin `assistant` nào chứa «Em có thể giúp bạn» trong `messages`): chào + menu + câu hỏi mở. `greet` khi lịch sử **đã** có menu: chào ngắn + câu hỏi mở, **không** lặp menu (B4). `help` («bạn làm được gì», «bạn là ai») luôn có menu | explicit («không lặp máy móc») |
| AC-02.7 | `product`: reply có câu mở «Dạ, em tìm được …» trước danh sách và **một câu mời** sau danh sách (gợi ý kỹ hơn theo loại da / đặt lịch Chuyên gia) trước câu miễn trừ | explicit |
| AC-02.8 | `store`: câu mở «Dạ, thông tin cửa hàng bên em …» trước khối thông tin; câu mời hỏi tiếp sau khối | explicit |
| AC-02.9 | `vent` («huhu da xấu quá», «da tệ quá», «chán da quá», «tự ti vì mụn» khi không có từ khoá SP khớp…): 1 câu đồng cảm + mời mô tả vấn đề da / soi da bằng dấu **+**; 0 SP; `needs_contact=false`. Câu đồng cảm không chứa nhận định y khoa | inferred |
| AC-02.10 | Câu miễn trừ «Thông tin chỉ mang tính tham khảo, không thay thế tư vấn trực tiếp từ Chuyên gia.» **chỉ** xuất hiện khi có SP/bài viết hoặc `intent ∈ {red, skin, claim, nomatch, blocked}`; không xuất hiện ở `greet, help, thanks, bye, ack, store, faq, price, callback, book, vent` (B9) | inferred (xem OQ-3) |
| AC-02.11 | Không emoji / ký tự biểu tượng trong reply: regex `\p{Extended_Pictographic}` = 0 trên toàn kịch bản | inferred (UI-9.3) |
| AC-02.12 | Mọi chuỗi giọng điệu là **hằng số** (không random) để hai bản ra cùng chữ; bộ chữ đề xuất ở mục 4 — owner được chỉnh câu chữ nhưng phải giữ các chuỗi `must` của kịch bản | inferred |

### REQ-03 (inferred) — Hai bản giống hệt nhau, không hồi quy

| AC | Nội dung đo kiểm |
|---|---|
| AC-03.1 | File vàng `tests/golden_replies.json` (sinh từ bản Python bằng `UPDATE_GOLDEN=1 pytest -k golden`) chứa toàn bộ response của mọi dòng kịch bản; pytest so Python == vàng, parity so Worker == vàng — **khớp từng ký tự** `reply`, `intent`, `related_products`, `related_articles`, `needs_contact`, `!!store_info` |
| AC-03.2 | 17 test pytest cũ + 35 kiểm tra parity cũ vẫn đạt, **trừ** 2 khẳng định được đổi có chủ đích: (a) «0967194063» không còn ra menu mà ra `callback`; (b) «cảm ơn nhé» không còn ra menu mà ra `thanks`. Đổi bằng cách cập nhật khẳng định, không xoá test |
| AC-03.3 | Giữ nguyên: CORS, rate limit, giới hạn đầu vào, `/healthz`, ẩn `/docs`, che PII, chặn phát ngôn cấm, điểm BM25 song song 16 truy vấn |
| AC-03.4 | Lịch sử hội thoại: chỉ đọc tin `assistant` để biết đã gửi menu chưa (AC-02.6); không đưa nội dung tin cũ của khách vào tìm kiếm; không ghi log nội dung |
| AC-03.5 | Không sửa `data/`, `cloudflare/public/idx/`, `cloudflare/src/store.json`, `app/hybrid_rag.py`, `scripts/` (chỉ mục BM25 không đổi ⇒ không cần build lại chỉ mục) |

## 3. Bảng kịch bản (nguồn cho `tests/scenarios.json`)

Cột: `SP` = có `related_products` (✓ có / – không); `NC` = `needs_contact`; `ST` = có `store_info`. `must`/`must_not` = chuỗi
con của `reply`. `hist` = có tin `assistant` trước đó chứa «Em có thể giúp bạn».

| # | Câu khách | intent | SP | NC | ST | must | must_not |
|---|---|---|---|---|---|---|---|
| S01 | xin chào | greet | – | F | F | «Em có thể giúp bạn» | «tham khảo, không thay thế» |
| S02 | xin chào (hist) | greet | – | F | F | «Dạ em chào bạn» | «Em có thể giúp bạn» |
| S03 | alo shop ơi | greet | – | F | F | «Dạ em chào bạn» | |
| S04 | bạn có thể làm những gì | help | – | F | F | «Em có thể giúp bạn» | |
| S05 | bạn là ai (hist) | help | – | F | F | «Em có thể giúp bạn» | |
| S06 | cảm ơn em nhiều | thanks | – | F | F | «không có gì» | «Em có thể giúp bạn», «tham khảo, không thay thế» |
| S07 | thanks shop | thanks | – | F | F | «không có gì» | «Em có thể giúp bạn» |
| S08 | tạm biệt | bye | – | F | F | «cảm ơn bạn» | «Em có thể giúp bạn» |
| S09 | bye shop, cảm ơn nhé | bye | – | F | F | «cảm ơn bạn» | «Em có thể giúp bạn» |
| S10 | ok em | ack | – | F | F | «Dạ vâng» | «Em có thể giúp bạn» |
| S11 | ừ | ack | – | F | F | «Dạ vâng» | |
| S12 | dạ vâng | ack | – | F | F | «Dạ vâng» | |
| S13 | da mình bị mụn ẩn nên dùng gì | product | ✓ | F | F | «Dạ, em tìm được», «đặt lịch» | |
| S14 | chào shop, da mình bị mụn ẩn | product | ✓ | F | F | «Dạ em chào bạn» | |
| S15 | da dầu mụn dùng sữa rửa mặt nào | product | ✓ | F | F | «Sản phẩm tham khảo» | |
| S16 | kem chống nắng cho da nhạy cảm | product | ✓ | F | F | | «cơ sở y tế» |
| S17 | da khô bong tróc | product | ✓ | F | F | | «cơ sở y tế» |
| S18 | nám tàn nhang | product | ✓ | F | F | | |
| S19 | retinol | product | ✓ | F | F | | |
| S20 | giá serum vitamin c bao nhiêu | product | ✓ | F | F | «trang sản phẩm» | |
| S21 | bao nhiêu tiền | price | – | F | F | «sản phẩm nào» | |
| S22 | còn hàng không shop | faq | – | T | T | «Chính sách» | |
| S23 | có giao hàng tỉnh không | faq | – | T | T | «Chính sách» | |
| S24 | thanh toán bằng gì | faq | – | T | T | «Chính sách» | |
| S25 | đổi trả thế nào | faq | – | T | T | «Chính sách» | |
| S26 | có khuyến mãi không | faq | – | T | T | «Chính sách» | |
| S27 | serum vitamin c có chính hãng không | faq→product (intent=product) | ✓ | T | – | «Chính sách» | |
| S28 | địa chỉ ở đâu | store | – | F | T | «Dạ, thông tin cửa hàng», «Giải Phóng» | «tham khảo, không thay thế» |
| S29 | mấy giờ mở cửa | store | – | F | T | «6h30» | |
| S30 | chủ nhật có mở không | store | – | F | T | «chủ nhật» | |
| S31 | số điện thoại shop | store | – | F | T | «0967.194.063» | |
| S32 | đặt lịch tư vấn | book | – | F | T | «Đặt lịch tư vấn» | |
| S33 | có bác sĩ không | book | – | F | T | «Chuyên gia» | «Bác sĩ», «bác sĩ» |
| S34 | soi da giúp em | skin | – | F | F | «dấu **+**», «tab=quiz» | |
| S35 | em đang mang thai dùng gì được | red | – | T | T | «cơ sở y tế», «Chuyên gia» | |
| S36 | bôi xong bị rát đỏ | red | – | T | T | «tạm ngừng» | |
| S37 | da bị nổi mẩn đỏ ngứa | red | – | T | T | «cơ sở y tế» | |
| S38 | mụn trứng cá nặng có chữa khỏi không | claim | – | T | T | «không thể cam kết», «Chuyên gia» | «kê đơn», «khỏi hẳn» |
| S39 | sđt của em 0912345678 gọi lại tư vấn nhé | callback | – | T | T | «đã ẩn» | «0912345678», «gội», «sẽ gọi lại» |
| S40 | 0967194063 | callback | – | T | T | «đã ẩn» | «0967194063» |
| S41 | tư vấn retinol, sđt 0967194063 | product | ✓ (= S19) | F | F | «đã ẩn» | «0967194063» |
| S42 | huhu da xấu quá | vent | – | F | F | «dấu **+**» | «chưa có thông tin phù hợp» |
| S43 | hôm nay trời đẹp quá | help | – | F | F | «Em có thể giúp bạn» | |
| S44 | abcxyz không có từ này | nomatch | – | T | F | «Chuyên gia» | |
| S45 | tư vấn cho mẹ tôi 50 tuổi bị nếp nhăn | product | ✓ | F | F | | |
| S46 | dùng xong bị nổi mề đay, khó thở | red | – | T | T | «cơ sở y tế» | |

Áp dụng thêm cho **mọi** dòng: AC-02.1 (bắt đầu «Dạ»), AC-02.2, AC-02.11, AC-01.11 (không số tiền), không chứa «Bác sĩ».
Nếu dòng có SP: mọi `url` bắt đầu `/products/`, không tiêu đề chứa «kê đơn».
Nếu DE/owner thấy dữ liệu chỉ mục làm một dòng ✓ không ra SP: báo BA, **không** sửa chỉ mục.

## 4. Bộ chữ đề xuất (hằng số, dùng chung hai bản — owner được chỉnh câu nhưng giữ chuỗi `must`)

| Khoá | Chuỗi |
|---|---|
| GREET_FIRST | «Dạ em chào bạn ạ. Em là trợ lý tra cứu của Pharma Cosmetics.» + menu hiện có + «Bạn đang quan tâm vấn đề da nào ạ?» |
| GREET_AGAIN | «Dạ em chào bạn ạ. Bạn đang quan tâm vấn đề da nào, cứ nhắn em nhé.» |
| HELP | «Dạ em là trợ lý tra cứu của Pharma Cosmetics ạ.» + menu hiện có |
| THANKS | «Dạ không có gì ạ, em rất vui được hỗ trợ bạn. Cần gì thêm bạn cứ nhắn em nhé.» |
| BYE | «Dạ em cảm ơn bạn đã ghé Pharma Cosmetics ạ. Chúc bạn một ngày vui, cần gì bạn cứ quay lại nhắn em nhé.» |
| ACK | «Dạ vâng ạ. Bạn cần em hỗ trợ thêm gì cứ nhắn em nhé.» |
| PRODUCT_OPEN | «Dạ, em tìm được vài gợi ý liên quan để bạn tham khảo ạ:» (nếu có lời chào: tiền tố «Dạ em chào bạn ạ. » thay «Dạ, ») |
| PRODUCT_CLOSE | «Bạn muốn em gợi ý kỹ hơn theo loại da, hay đặt lịch với Chuyên gia để được tư vấn trực tiếp ạ?» |
| PRICE_NOTE | «Giá có thể thay đổi theo thời điểm, bạn bấm vào từng sản phẩm để xem giá mới nhất ạ.» (đặt ngay sau PRODUCT_OPEN; giữ cụm «trang sản phẩm» ở tiêu đề danh sách) |
| PRICE_ASK | «Dạ giá sản phẩm thay đổi theo thời điểm nên em không báo giá trực tiếp ạ. Bạn đang quan tâm sản phẩm nào hoặc vấn đề da gì, em gửi đường dẫn để bạn xem giá mới nhất nhé.» |
| STORE_OPEN / CLOSE | «Dạ, thông tin cửa hàng bên em đây ạ:» … «Bạn cần em hỗ trợ thêm gì cứ nhắn em nhé.» (S30: thêm «Bên em mở cả chủ nhật và ngày lễ ạ.» **chỉ suy từ** `store.hours` có chữ «chủ nhật»; không có thì không nói) |
| FAQ | «Dạ, về giao hàng, thanh toán, đổi trả, nguồn gốc và tình trạng còn hàng, chính sách có thể thay đổi theo thời điểm nên em không trả lời thay được ạ. Bạn gọi hoặc nhắn **hotline/Zalo** bên dưới, hoặc xem mục **Chính sách** ở cuối trang website nhé.» |
| BOOK | «Dạ, bên em có Chuyên gia tư vấn trực tiếp ạ. Bạn đặt lịch giúp em tại đây nhé:» + khối cửa hàng |
| CALLBACK | «Dạ, để bảo vệ thông tin của bạn, em đã ẩn số điện thoại/email bạn gửi và không lưu lại ạ. Em chưa tự liên hệ lại được, bạn gọi hoặc nhắn **hotline/Zalo** bên dưới để được hỗ trợ nhanh nhất nhé.» |
| PII_NOTE (kèm SP) | «Em đã ẩn số điện thoại/email bạn gửi để bảo vệ thông tin của bạn ạ.» |
| CLAIM | «Dạ, hiệu quả phụ thuộc cơ địa và mức độ của từng người nên em không thể cam kết kết quả ạ. Bạn nên đặt lịch với Chuyên gia để được đánh giá và tư vấn lộ trình phù hợp nhé.» + khối cửa hàng |
| VENT | «Dạ em hiểu, da chưa như ý thật dễ khiến mình lo lắng ạ. Bạn kể giúp em da đang gặp vấn đề gì (ví dụ mụn, thâm, nám, khô, nhạy cảm) để em gợi ý sát hơn, hoặc soi da bằng ảnh: bấm dấu **+** cạnh ô nhập nhé.» |
| NOMATCH | «Dạ em chưa tìm thấy thông tin phù hợp với câu hỏi này ạ. Bạn thử mô tả cụ thể hơn (ví dụ loại da, vấn đề mụn, nám, khô) hoặc liên hệ Chuyên gia để được tư vấn trực tiếp nhé.» |
| RED, SKIN | Giữ nguyên chữ hiện có (đã mở bằng «Dạ» / thêm «Dạ, » vào SKIN) |

Kiểm `check_medical_compliance` trên mọi chuỗi trên: không chứa cụm cấm (đã rà: «không thể cam kết kết quả» không khớp
«cam kết khỏi 100%»).

## 5. File đụng tới

| File | Thay đổi |
|---|---|
| `PHARMA COSMETIC AI/app/main.py` | Ý định mới, thứ tự ưu tiên, hằng chuỗi giọng điệu, đọc lịch sử `assistant`, lọc «kê đơn», trường `intent` |
| `PHARMA COSMETIC AI/app/guardrails.py` | Chỉ nếu cần thêm hằng (vd NOMATCH); giữ `SAFE_FALLBACK`, `mask_pii`, cụm cấm |
| `PHARMA COSMETIC AI/cloudflare/src/index.js` | Port 1:1 các thay đổi trên |
| `PHARMA COSMETIC AI/tests/scenarios.json` (mới) | Bảng mục 3 dạng máy đọc |
| `PHARMA COSMETIC AI/tests/golden_replies.json` (mới) | Response vàng sinh từ Python |
| `PHARMA COSMETIC AI/tests/test_app.py` | Test kịch bản + vàng + cập nhật 1 khẳng định (S40) |
| `PHARMA COSMETIC AI/cloudflare/test/parity.test.mjs` | Test kịch bản + vàng + cập nhật 1 khẳng định («cảm ơn nhé») |
| `PHARMA COSMETIC AI/README.md` | Cập nhật đoạn «Thứ tự nhận diện ý định» (dòng 8) + trường `intent` |

**Không đụng:** `templates/page.chat.bwt`, `configs/*`, `data/`, `cloudflare/public/idx/`, `cloudflare/src/store.json`,
`app/hybrid_rag.py`, `app/config.py`, `scripts/`. Không có diff schema. Không cần DE chuẩn bị dữ liệu.

## 6. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Regex ý định mới bắt nhầm câu SP thật (vd «tinh chất» bị bỏ «tinh», «bỏng» vs «bong tróc») | Dòng S15–S19, S45 bắt buộc vẫn có SP; owner thêm câu đối chứng nếu thêm từ vào NOISE |
| Lệch Python/JS (regex `\b` với chữ đã bỏ dấu, thứ tự `dict.fromkeys` vs `Set`) | File vàng so từng ký tự ở cả hai bản (AC-03.1) |
| Push `hugopc_dev` = deploy production tự động | Owner **chỉ commit trên `hugo_dev`**; merge/push `hugopc_dev` là điểm dừng — chờ chủ dự án |
| Bỏ câu miễn trừ ở câu xã giao bị coi là giảm tuân thủ | Vẫn giữ ở mọi câu có nội dung sức khoẻ/SP + dòng ghi chú cố định trên giao diện (`ai_chat_note`); OQ-3 |
| Lịch sử chỉ 6 tin ⇒ menu có thể lặp sau phiên dài | Chấp nhận (UI gửi 6 tin) |

## 6b. Thẻ việc

### T1 — owner: **fe-feature** (BA chỉ định: module AI không thuộc phạm vi mặc định vai nào; một thẻ duy nhất vì Python + JS + test dùng chung kịch bản)

- File được ghi (chính xác):
  - `PHARMA COSMETIC AI/app/main.py`
  - `PHARMA COSMETIC AI/app/guardrails.py`
  - `PHARMA COSMETIC AI/cloudflare/src/index.js`
  - `PHARMA COSMETIC AI/tests/test_app.py`
  - `PHARMA COSMETIC AI/tests/scenarios.json` (mới)
  - `PHARMA COSMETIC AI/tests/golden_replies.json` (mới)
  - `PHARMA COSMETIC AI/cloudflare/test/parity.test.mjs`
  - `PHARMA COSMETIC AI/README.md`
- AC: REQ-01 (AC-01.1 → AC-01.13), REQ-02 (AC-02.1 → AC-02.12), REQ-03 (AC-03.1 → AC-03.5).
- Lệnh kiểm (chạy trong `PHARMA COSMETIC AI/`; venv có `requirements-dev.txt`):
  ```bash
  PYTHONIOENCODING=utf-8 <venv>/python -m pytest -q -p no:cacheprovider tests      # exit 0
  cd cloudflare && node test/parity.test.mjs                                         # exit 0
  git status --porcelain   # chỉ 8 file trên
  ```
  Lưu ý: parity spawn `python` hệ thống để so BM25 — `app/hybrid_rag.py` không cần fastapi, giữ nguyên như vậy.
- Comment tiếng Việt kèm ngày `24/11/2026` + mã `SPEC-AI-CHAT-TONE-01`. Commit conventional tiếng Việt trên `hugo_dev`;
  **không** push `hugopc_dev`.
- Phụ thuộc: không.

### T2 — owner: **fe-core** · Review chéo diff T1 (chỉ đọc)

- File được ghi: không (ghi nhận xét vào phản hồi cho BA).
- Kiểm: hai bản port 1:1 (thứ tự ý định, danh sách từ, chuỗi), không regex bắt nhầm câu SP, không cụm cấm, không «Bác sĩ».
- Phụ thuộc: T1 xong. Không chạy song song với T1.

Không có thẻ giao diện: xưng hô «em – bạn» đã nhất quán ở `templates/page.chat.bwt`. Nếu OQ-1 chốt «anh/chị» ⇒ BA mở
thẻ T3 (fe-feature: `templates/page.chat.bwt`; đổi default `ai_chat_welcome`/`ai_chat_chips` là điểm dừng cấu hình).

| Thẻ | Owner | File | Phụ thuộc | Song song |
|---|---|---|---|---|
| T1 | fe-feature | 8 file trong `PHARMA COSMETIC AI/` (liệt kê trên) | – | – |
| T2 | fe-core | (chỉ đọc) | T1 | Không |

## 7. open_questions (không chặn — BA đã chọn mặc định theo rule)

- **OQ-1** Xưng hô: giữ «em – bạn» (mặc định, khớp toàn bộ giao diện chat hiện có) hay đổi «em – anh/chị»? Đổi ⇒ phải sửa
  cả default `ai_chat_welcome`, chip, placeholder trong `templates/page.chat.bwt` (điểm dừng cấu hình).
- **OQ-2** Lọc khỏi gợi ý chat mọi SP có «kê đơn» trong tiêu đề (hiện 2 SP Accufine — Isotretinoin). Mặc định: **lọc**. Có muốn
  mở rộng (vd «thuốc») không?
- **OQ-3** Câu miễn trừ y tế: mặc định chỉ hiện khi có SP/bài viết hoặc nội dung sức khoẻ (AC-02.10), bỏ ở câu xã giao/cửa hàng.
  Nếu chủ dự án muốn giữ ở mọi câu ⇒ đổi AC-02.10, không ảnh hưởng phần khác.
- **OQ-4** «sau sinh» có tính là cảnh báo đỏ (đang cho con bú) không? Mặc định: **không** (tránh chặn câu «trị nám sau sinh»).
- **OQ-5** Deploy production: sau nghiệm thu, merge `hugo_dev` → `hugopc_dev` (tự deploy Worker) cần chủ dự án duyệt.
- Báo cáo 28 test case của chủ dự án chưa lưu được: khi có, BA đối chiếu bổ sung vào mục 3.

## 8. Nghiệm thu

### 8.1 Lần 1 — T1 (24/11/2026, code chưa commit) · Kết luận: **FAIL có điều kiện** (2 lỗi trả fe-feature, 1 lỗi tài liệu)

Cổng đã chạy (trong `PHARMA COSMETIC AI/`, venv scratchpad Python 3.14, Node 24):

| Lệnh | Kết quả thật |
|---|---|
| `PYTHONIOENCODING=utf-8 <venv>/python -m pytest -q -p no:cacheprovider tests` | `24 passed, 1 warning` · exit 0 |
| `cd cloudflare && node test/parity.test.mjs` | `39 kiểm tra đạt.` · exit 0 |
| Bộ kiểm độc lập của BA (scratchpad `acc/`): 46 dòng S01–S46 tự mã hoá lại từ mục 3 + 47 câu baseline + 61 câu bổ sung theo từng AC = 154 ca, chạy Python (TestClient) và Worker (in-process) | Python ≡ Worker **154/154** (reply, intent, SP, bài viết, needs_contact, store_info); luật chung + S01–S46: **0 lỗi** |
| `git diff --stat` trên `data/ cloudflare/public cloudflare/src/store.json app/hybrid_rag.py app/guardrails.py app/config.py scripts/` | rỗng |

| AC | KQ | Bằng chứng |
|---|---|---|
| AC-01.1 | PASS | 46/46 dòng S01–S46 đúng intent/SP/NC/ST/must/must_not ở cả hai bản; `scenarios.json` 95 dòng bao trọn S01–S46 |
| AC-01.2 | PASS | 154/154 có `intent` hợp lệ + đủ 5 trường cũ |
| AC-01.3 | PASS | «bị rát», «nổi mẩn», «mẩn đỏ», «ngứa rát», S36/S37 ⇒ red; «da nhạy cảm sau điều trị», S16, S17 ⇒ product |
| AC-01.4 | PASS | «khỏi hẳn được không», «trị mụn dứt điểm», «bao lâu thì khỏi», «bao lâu thì hết nám», «dùng có hết không», «shop cam kết không», S38 ⇒ claim, 0 SP/0 bài, NC=T, ST có |
| AC-01.5 | PASS (theo chữ) | 0 SP có «kê đơn». Xem OQ-6: SP isotretinoin/«THUỐC» vẫn được gợi ý |
| AC-01.6 | PASS | «có bác sĩ/dược sĩ không», «muốn hỏi chuyên gia», «gặp tư vấn viên» ⇒ book; 0 reply chứa «ác sĩ» |
| AC-01.7 | PASS | S39, S40, «liên hệ lại cho em», «để lại số», «gọi cho mình nhé», «tư vấn qua điện thoại…», «email em là a@b.com» ⇒ callback; S41 SP = S19 + «đã ẩn» |
| AC-01.8 | PASS | 8/8 câu mẫu ⇒ store, 0 SP, 0 bài |
| AC-01.9 | PASS (câu mẫu) / lỗi BUG-01 | «giao hàng tỉnh», «bằng gì», «ship mấy ngày», «giao bao lâu», «giao hàng/ship ngoại thành» ⇒ faq; S27 giữ hành vi cũ. Nhưng «giao ngoại tỉnh» lặp lại đúng lỗi A7 |
| AC-01.10 | PASS | «ừ, u, uh, um, ờ, hmm» ⇒ ack; «??», «...» ⇒ help; 0 SP |
| AC-01.11 | PASS | «bao nhiêu tiền / giá sao / bảng giá» ⇒ price, NC=F; S20 product + «trang sản phẩm»; regex số tiền = 0/154 |
| AC-01.12 | PASS | S44 nomatch NC=T; `SAFE_FALLBACK` chỉ ở nhánh `check_medical_compliance` (main.py:397, index.js:375) |
| AC-01.13 | PASS (chấp nhận lệch) | Thứ tự thực tế `… ack > vent > greet/help …` — xem 8.2. «chào shop, da mình bị mụn ẩn» ⇒ product mở bằng lời chào |
| AC-02.1 / 02.2 / 02.11 | PASS | 154/154 mở «Dạ»; 0 «anh/chị», «quý khách», «tôi»; 0 emoji (regex BA không gồm ©®™) |
| AC-02.3 / 02.4 / 02.5 | PASS | bye/thanks ≤160, ack ≤120 ký tự, không menu, không miễn trừ; «cảm ơn, tạm biệt» ⇒ bye |
| AC-02.6 | PASS | S01 có menu, S02 không lặp, S05 help (hist) có menu |
| AC-02.7 / 02.8 | PASS | «Dạ, em tìm được…» + câu mời; «Dạ, thông tin cửa hàng bên em…» |
| AC-02.9 | PASS | «huhu da xấu quá», «da tệ quá», «chán da quá» ⇒ vent, 0 SP, NC=F, có «dấu **+**» |
| AC-02.10 | PASS | 0 ca miễn trừ ở intent xã giao không SP; mọi ca có SP/bài hoặc red/skin/claim/nomatch đều có |
| AC-02.12 | PASS | Chuỗi hằng; parity từng ký tự 154/154 |
| AC-03.1 | PASS | `golden_replies.json` sinh từ Python; pytest + parity so vàng đạt |
| AC-03.2 | PASS | 17 test cũ còn đủ; chỉ đổi 2 khẳng định (S40 ⇒ callback, «cảm ơn nhé» ⇒ thanks) kèm comment, không xoá test |
| AC-03.3 | PASS | Test CORS, rate limit, giới hạn đầu vào, `/healthz`, PII, phát ngôn cấm vẫn đạt (pytest + parity) |
| AC-03.4 | PASS | [user «retinol», user «hôm nay trời đẹp»] ⇒ help 0 SP; diff không thêm print/log/console |
| AC-03.5 | PASS | diff rỗng trên các đường dẫn cấm |
| README (mục 5) | FAIL nhỏ | DOC-01 |

### 8.2 Đánh giá các điểm lệch SPEC fe-feature báo

| Lệch | Quyết định BA | Lý do |
|---|---|---|
| vent xếp trước greet/help | **Chấp nhận** | Than phiền cụ thể hơn lời chào («chào shop, da tệ quá» ⇒ vent đồng cảm là đúng). AC-01.13 coi như sửa thành `… ack > vent > greet/help > product …` |
| HELP chỉ khi không có từ khoá thật | **Chấp nhận** | Cùng tinh thần AC-01.13 (chào kèm từ khoá ⇒ product) |
| Bỏ từ khoá ≤2 ký tự trừ ha/uv/ph/bb/cc | **Chấp nhận** | Đã thử «kem dưỡng ha», «chống nắng uv», «sữa rửa mặt ph thấp», «kem bb», «kem cc», «vitamin b5» ⇒ SP đúng |
| Test emoji JS bỏ ©®™ | **Chấp nhận** | ©®™ đến từ tên SP thật (dữ liệu Sapo), không phải icon bot tự thêm (UI-9.3 nhắm icon) |
| Loại «bị rất…» khỏi cảnh báo đỏ | **Chấp nhận** | «bị rất» bỏ dấu trùng «bị rát»; «bị rất nhiều mụn», «da bị rất khô» ⇒ product; «bị rất ngứa» vẫn red (do «ngứa») — hợp lý |

### 8.3 Thẻ lỗi trả fe-feature

- **BUG-01 (trung bình, AC-01.9 / A7)** — Bước: POST `/api/v1/chat` `{"messages":[{"role":"user","content":"giao ngoại tỉnh"}]}` (tương tự «giao ngoại thành không»), cả Python và Worker. Thực tế: `intent=product`, `needs_contact=false`, 3 SP «TINH CHẤT…» (MESOTECH IDEALSKIN, COMFORT ZONE…, SESDERMA SESLASH). Mong đợi: `intent=faq`, 0 SP, NC=T, ST có. Nguyên nhân: `FAQ_RE` (main.py:73) cần «giao hang», không bắt «giao» + từ chỉ nơi/thời gian; `FAQ_FILL` chỉ áp khi `is_faq` nên «tinh» thành từ khoá. Thêm dòng kịch bản + cập nhật vàng.
- **BUG-02 (trung bình, REQ-01 / A10)** — Bước: «bác sĩ ơi da em bị mụn», «bác sĩ tư vấn giúp em trị mụn». Thực tế: product với SP lạc đề (mặt nạ bạc hà TRANDMI, kẹo canxi VITABIOTICS OSTEOCARE, Nordic Naturals Children's DHA); trong khi «da em bị mụn» cho SP trị mụn đúng. Mong đợi: «bác sĩ / dược sĩ / chuyên gia / tư vấn viên» không thành từ khoá tìm kiếm (thêm vào NOISE/từ đệm), kết quả bằng câu bỏ cụm đó. Reply không chứa «Bác sĩ» (đang đạt). Thêm dòng kịch bản.
- **DOC-01 (nhỏ)** — `PHARMA COSMETIC AI/README.md:13` vẫn ghi «Câu trả lời luôn kèm lời nhắc: chỉ mang tính tham khảo.» mâu thuẫn AC-02.10 ⇒ sửa thành «chỉ kèm khi có SP/bài viết hoặc ý định sức khoẻ».

Sau khi sửa: chạy lại pytest + parity (exit 0), BA chạy lại bộ 154 ca. T2 (fe-core review chéo) chạy sau khi BUG-01/02 đóng.

### 8.4 Ghi nhận ngoài phạm vi T1

- **OQ-6 — ĐÃ CHỐT 26/11/2026 (chủ dự án chấp nhận đề xuất):** `pick` loại thêm SP có tiêu đề chứa «thuốc» / «isotretinoin» / tên thuốc kê đơn (Acuroff, Goesing, Finpecia, ClindaTre) — regex `RX_RE` giống hệt ở `cloudflare/src/index.js` và `app/main.py`; không lọc theo «mg» vì kéo theo ~20 thực phẩm chức năng. Ghi chú gốc: **OQ-6 (điểm dừng — y dược nhạy cảm, chờ chủ dự án):** «isotretinoin», «trị mụn nặng», «thuốc trị mụn» vẫn gợi ý thuốc kê đơn thực tế (Accufine 5mg, Triplivate 10 Isotretinoin, AJU AKINOL 10MG, ISOTISUN, ACNOTIN) vì tiêu đề không có chữ «kê đơn». Có mở rộng bộ lọc (vd «isotretinoin», «thuốc») không? Cần danh sách/nhãn từ chủ dự án — BA không tự quyết.
- «bạn là ai, da dầu dùng gì» ⇒ gợi ý dầu gội (BM25 khớp «dầu»): chất lượng xếp hạng chỉ mục, không thuộc T1 (AC-03.5 cấm đụng chỉ mục).
- Untracked `23.11_hugo.zip` ở gốc repo không thuộc T1 — không commit.

### 8.5 Lần 2 — T1 (24/11/2026, sau sửa BUG-01/02, DOC-01, E1–E8, E10; code đã commit `02f9859` trong lúc BA chạy cổng — chạy lại trên HEAD cho cùng kết quả) · Kết luận: **FAIL** (1 lỗi an toàn trả fe-feature)

Cổng đã chạy (trong `PHARMA COSMETIC AI/`, venv scratchpad, `PYTHONIOENCODING=utf-8`):

| Lệnh | Kết quả thật |
|---|---|
| `<venv>/python -m pytest -q -p no:cacheprovider tests` | `24 passed, 1 warning` · exit 0 |
| `cd cloudflare && node test/parity.test.mjs` | `39 kiểm tra đạt.` · exit 0 |
| `tests/scenarios.json` | 123 dòng |
| Bộ 154 ca BA (`scratchpad/acc/check.py`), Python + Worker | parity **154/154**; luật chung + S01–S46: **0 lỗi** |
| Bộ dò hồi quy mới (`scratchpad/acc2/`): 86 ca (35 cảnh báo đỏ, 8 câu «rất/đỏ» dễ bắt nhầm, 43 câu SP/cửa hàng/FAQ/danh xưng) + 22 ca «rát/đỏ/ngứa» | parity **108/108**; 0 lỗi giọng điệu (mở «Dạ», không «Bác sĩ», không «anh/chị»); **9 câu đau rát/ngứa không ra `red`** (dưới) |
| So `RED_RE` bản HEAD (trước T1) trên cùng câu | 5 câu HEAD ra `red`, nay ra `product` ⇒ hồi quy |
| `git diff --stat` trên `data/ cloudflare/public cloudflare/src/store.json app/hybrid_rag.py app/guardrails.py app/config.py scripts/` | rỗng |
| `git status --porcelain` | chỉ 8 file T1 + SPEC + `23.11_hugo.zip` (không thuộc T1) |

| AC | KQ | Bằng chứng |
|---|---|---|
| AC-01.1, 01.2 | PASS | 154/154 + 108/108; 123 dòng kịch bản đạt trong pytest/parity |
| **AC-01.3** | **FAIL** | «rát đỏ», «rát đỏ quá», «rát đỏ sau khi bôi», «mặt hơi rát đỏ» ⇒ `product` (gợi ý kem dưỡng) — «rát đỏ» nằm nguyên văn trong AC. Hồi quy so HEAD: «vừa bôi xong thì đỏ rát», «hơi đỏ rát», «thấy đỏ rát», «vẫn còn đỏ rát», «bị ửng đỏ rát» trước là `red`, nay `product`. Phần «không bắt nhầm» đạt: «da rất khô», «da mình rất dầu», «son màu đỏ rất đẹp», «da bị rất nhiều mụn», «nốt đỏ do mụn» ⇒ product |
| AC-01.4 | PASS | «cam kết trị khỏi mụn không» ⇒ claim; «shop cam kết gì» ⇒ faq (E10) |
| AC-01.5 | PASS (theo chữ) | 0 SP «kê đơn»; OQ-6 vẫn chờ chủ dự án — không tính FAIL |
| AC-01.6 | PASS | «có bác sĩ/chuyên gia không» ⇒ book; «bác sĩ ơi da em bị mụn», «bác sĩ da liễu ơi trị nám», «tư vấn viên ơi, da em bị lỗ chân lông to», «chuyên gia tư vấn kem chống nắng» ⇒ product, SP đúng chủ đề (**BUG-02 đóng**) |
| AC-01.7, 01.8 | PASS | «mấy giờ», «thứ 7 có mở cửa không», «chủ nhật có mở cửa không», «thứ hai shop làm việc không» ⇒ store; «mấy giờ thì nên bôi retinol» ⇒ product (không ra store) |
| AC-01.9 | PASS | «giao ngoại tỉnh», «giao ngoại thành không», «ship ra tỉnh mất mấy ngày», «giao hàng đi xa được không», «tiền ship bao nhiêu» ⇒ faq 0 SP (**BUG-01 đóng**); «kem này có chính hãng không» ⇒ product + NC=T (giữ hành vi S27) |
| AC-01.10 → 01.13 | PASS | «bao nhiêu tiền», «giá bao nhiêu» ⇒ price; «giá serum vitamin c» ⇒ product; «gia vị» ⇒ help (không ra price); regex số tiền = 0 |
| REQ-02 (AC-02.1 → 02.12) | PASS | Như 8.1, chạy lại 154 + 108 ca |
| REQ-03 (AC-03.1 → 03.5) | PASS | pytest/parity exit 0; vàng khớp; diff đường dẫn cấm rỗng |
| DOC-01 | PASS | `README.md:9`, `:13` đã nói miễn trừ chỉ kèm khi có SP/bài viết hoặc ý định sức khoẻ |

Rủi ro fe-feature tự báo — BA chấp nhận: «rất đỏ mặt khi uống rượu» không ra red (không phải phản ứng sau dùng SP); «chuyên gia» một mình ⇒ help (AC-01.6 chỉ yêu cầu book khi kèm «có…không/gặp/hỏi»).

#### Thẻ lỗi vòng 2 — trả fe-feature

- **BUG-03 (cao — an toàn y tế, AC-01.3 + hồi quy so HEAD)** — URL: POST `/api/v1/chat`, cả Python và Worker. Bước: gửi lần lượt
  «rát đỏ», «rát đỏ sau khi bôi», «mặt hơi rát đỏ», «vừa bôi xong thì đỏ rát», «hơi đỏ rát», «thấy đỏ rát», «vẫn còn đỏ rát», «bị ửng đỏ rát».
  Thực tế: `intent=product`, `needs_contact=false`, 3 SP (POSTQUAM NUTRIACTION CREAM, DR.GRANDEL CLEANSING MILK, BIOLIFE VAGISENS…).
  Mong đợi: `intent=red`, 0 SP, NC=T, ST có, reply có «tạm ngừng».
  Nguyên nhân: vòng 2 (E2) đổi `do rat`/`rat do` sang allow-list từ đứng trước (`bi|da|mat|…`) — từ đệm «thì/hơi/thấy/còn/ửng» và đầu câu «rát đỏ» rơi ra ngoài (main.py:67–71, index.js tương ứng).
  Gợi ý (owner quyết cách làm): khớp chữ **có dấu** trên chuỗi gốc đã lowercase/NFC trước — «rát», «đỏ rát», «rát đỏ», «ngứa» không trùng nghĩa khi có dấu; chỉ dùng allow-list bản bỏ dấu khi câu không có dấu.
  Không được hồi quy: «da rất khô», «da mình rất dầu», «son màu đỏ rất đẹp», «da bị rất nhiều mụn», «bị rất nhiều mụn», «nốt đỏ do mụn», «phòng ngừa mụn» ⇒ không red.
  Nên (inferred, cùng nhóm phản ứng sau dùng SP — không bắt buộc để đóng thẻ): «da rát», «dùng kem xong da rát», «rát quá», «rát và đỏ», «mặt đỏ và rát», «da ửng đỏ, rát», «bôi xong ngứa», «ngứa quá sau khi bôi retinol», «da bị ngứa sau khi dùng kem» ⇒ red (HEAD cũng chưa bắt — không tính hồi quy).
  Thêm các câu bắt buộc vào `scenarios.json` + cập nhật vàng; chạy lại pytest + parity.

Sau khi đóng BUG-03: BA chạy lại 154 ca + 108 ca `acc2/`. T2 (fe-core review chéo) chỉ cần soát lại diff `RED_RE`/`RED_OK` hai bản.

#### Ghi nhận (ngoài T1, không chặn)

- «nên bôi retinol», «mấy giờ thì nên bôi retinol» ⇒ SP không chứa retinol; «nám dùng gì» ⇒ Clotrifox/INTRACAN (kem trị **nấm** — «nam» bỏ dấu trùng «nấm»). Do xếp hạng chỉ mục BM25 bỏ dấu (AC-03.5 cấm đụng) — đề xuất việc riêng: xếp hạng ưu tiên khớp có dấu. «kem trị nám» vẫn đúng.
