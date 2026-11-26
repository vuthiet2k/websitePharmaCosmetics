# Báo cáo: Rule & cách đội làm việc — 26/11/2026 (nhánh `hugopc_dev`, ba-lead)

## 1. Rule cứng đang áp dụng
- **UI-BRAND** — `#3CB371` là màu thương hiệu duy nhất (Topbar, CTA chính, `theme_main_color`); không đổi.
- **UI-0 / UI-STANDARD R1–R2** — markup chỉ class Tailwind theo token (hoặc `pc-*` của thư viện); cấm `style=""`, `<style>`, `@media` mới, hex/px tuỳ ý.
- **UI-2.9** — cỡ chữ chỉ dùng `var(--fs-*)`; cần cỡ mới thì thêm token.
- **Icon (UI-STANDARD R7, thắng UI-9)** — icon qua `snippets/ui_icon.bwt` (SVG), không thêm `fa-…` mới; cấm emoji/ký tự làm icon.
- **Cấu hình hoá** — chữ hiển thị = `settings.<id> | default:`; khai báo ở `settings_schema.json`, giá trị ở `settings_data.json`; dữ liệu có trên object Sapo thì đọc object.
- **ANTI-FAB** — không bịa số liệu, % đã bán, sao đánh giá, lời chứng thực, công dụng.
- **RULE-P0-02** — danh xưng «Chuyên gia», không «Bác sĩ»/«BS.»; cấm «Bộ Y Tế», «cấp phép».
- **1 `<h1>`/trang**; ảnh qua `img_url` + `alt` riêng + `width`/`height` + `lazy`.
- **Mobile** — chữ ≥ 12px, vùng chạm ≥ 44px (cách nhau ≥ 8px), không tràn ngang ở 390px.
- **Liquid (DotLiquid)** — chuỗi rỗng vẫn là true ⇒ kiểm bằng `!= blank`; không so sánh/nối sau `slice`.
- **Lint bắt buộc** — `lint:config`, `lint:guardrails` (--strict), `lint:liquid-globals`, `compliance-lint`, `build:pc`/`build`; `audit:ui` khi đổi giao diện; `test:portal` khi đụng Home Portal.
- **R10** — chỉ báo «xong» khi đã kiểm trên trình duyệt thật (1440px và 390px).
- **Commit** — conventional commits, tiếng Việt có dấu; comment nêu lý do + ngày/mã việc.

## 2. Cách đội làm việc
- **Vai trò** (`.claude/agents/`): `ba-lead` phân tích, viết SPEC + thẻ việc, nghiệm thu (thay Tester) · `fe-core` layout, token, Tailwind, `ui_*`, header/footer · `fe-feature` template, section, thẻ SP/bài, luồng mua · `data-engineer` làm sạch dữ liệu, gói nội dung có nguồn.
- **Phạm vi ghi**: BA `docs/specs/**` · fe-core `layouts/`, `design_tokens`, `ui_*`, header/footer, `ui-src/css`, `configs/` (khi đã duyệt) · fe-feature `templates/`, `section_*`, `product_*`, `article_*`, `blog_*`, `page_*`… · DE `data/**` (ghi đè gốc phải được duyệt), `docs/data/**`, `scripts/data-*`.
- **Luồng `/team`**: yêu cầu → BA (SPEC, `open_questions`; còn câu hỏi thì hỏi chủ dự án) → thẻ việc (chạy song song nếu không chung file) → review chéo 2 FE → BA nghiệm thu (tối đa 2 vòng trả lỗi/thẻ) → phiên chính kiểm diff, báo chủ dự án.
- **Điểm dừng phải hỏi chủ dự án**: đổi schema/settings, đổi bố cục chưa có mockup trong `design/`, nội dung y dược/số liệu chưa có nguồn, merge nhánh agent khác, deploy `--prod`.
- **Cổng nghiệm thu**: parse JSON config · `lint-guardrails --strict` · `compliance-lint` · `lint:liquid-globals` · `lint:config` · `build:pc` · `audit:ui` · `test:portal`.
- **Git**: mỗi máy một nhánh (`hugo_dev`, `hugomac_dev`, `hugopc_dev`, `ui-fix`); chỉ push nhánh của mình, được pull/merge nhánh đồng đội về nhánh mình; không đụng `main`; chỉ commit/push sau khi nghiệm thu PASS (GIT-1).
- **Deploy**: push nhánh ⇒ Vercel **Preview**; production Vercel chỉ đổi khi chạy tay `npx vercel --prod`. **Push `hugopc_dev` = Cloudflare Worker (AI chat) tự deploy production** ⇒ push nhánh này coi như phát hành.

## 3. Đối chiếu thật thà (bằng chứng từ git, 20–26/11)
1. **Rule tự mâu thuẫn**: AGENTS.md GIT-1 gọi `hugopc_dev` là «nhánh của người khác», còn `.clinerules/04` bảo chỉ push `hugopc_dev`; `.clinerules/04` **chưa được commit** (đang untracked). AGENTS.md (UI-9 Font Awesome, UI-0 «không class tự đặt») lệch với UI-STANDARD (ui_icon SVG, cho phép `pc-*`).
2. **Không qua SPEC/thẻ việc**: từ 20/11 chỉ có 3 SPEC (`TEAM-TRIAL-01`, `HOME-HEADER-01`, `AI-CHAT-TONE-01`); chuỗi Trước & Sau (b04fdc5, 19a0980, 5e39b1d, 2b0ab40, c48dbd5, 8db669b, a80eb53) và các sửa lỗi 2.1/2.3 (045b21d, 7b29048, 81697e7) làm thẳng, không có SPEC/AC/nghiệm thu BA.
3. **Đổi schema không thấy ghi duyệt**: 5e39b1d thêm 5 ô `home_testi_*`; f808566 gỡ ô `free_consultation_svc_handle` — commit không ghi chủ dự án duyệt (2b0ab40 thì có ghi).
4. **Làm lại do chưa chốt yêu cầu**: thanh tiến trình băng Trước & Sau thêm ngày 25/11 (19a0980, b04fdc5) rồi bỏ ngày 26/11 (a80eb53); hàng lọc dịch vụ «cuộn ngang» (1b429e0) → đổi sang Swiper «hết thanh cuộn» (8db669b). Riêng `section_testimonials.bwt` bị sửa 4 lần trong 2 ngày.
5. **Thiếu bằng chứng kiểm trên trình duyệt**: b04fdc5 có ghi «đã kiểm 1440/390»; c48dbd5, 8db669b, a80eb53 không ghi kiểm thử nào (R10).
6. **Sửa dữ liệu ngoài vai**: c48dbd5 thêm 13 bài (218 dòng) vào `data/articles-data.json` — phạm vi của data-engineer, không thẻ việc. 13 bài đều `author` rỗng; nội dung lấy từ tiêu đề short YouTube (chưa đối chiếu nguồn).
7. **Nhãn chưa có nguồn**: `templates/article.truoc-va-sau.bwt` gắn mặc định «Ca thực tế; Trị liệu 1:1 cùng chuyên gia» cho **mọi** ca, kể cả 13 ca «Cá nhân hoá từ xa» (dễ sai sự thật, ANTI-FAB). Byline in `article.author` kèm nhãn «Chuyên gia phụ trách»: 5 ca hiện có tác giả là tên tài khoản đăng bài, chưa xác nhận người đó là chuyên gia phụ trách.
8. **Không tìm thấy** trong repo chỗ gán «tác giả mặc định»: byline chỉ hiện khi `article.author != blank`.
9. **Rác làm việc**: `phase/*` (3 thư mục) và `scripts/qa-*.js`, `scripts/test-*-qa.js` untracked, chưa dọn hoặc đưa vào rule (trái AGENTS.md mục phase).

## 4. Đề xuất 5 việc cải thiện
1. **Chốt yêu cầu trước khi code**: mỗi việc giao diện có ảnh mẫu/ảnh chụp hiện trạng + 3–5 AC đo được, chủ dự án xác nhận 1 lần (`/team`, kể cả việc nhỏ ⇒ SPEC rút gọn 10 dòng).
2. **Checklist sau mỗi thay đổi giao diện**: ảnh chụp 1440px + 390px, 0 tràn ngang, vùng chạm ≥ 44px, 0 lỗi console; dán số đo vào commit/SPEC (R10).
3. **Đầu mỗi phiên**: `git fetch` + merge nhánh đồng đội vào nhánh mình, chạy `build:pc` + lint trước khi sửa, tránh xung đột và hồi quy.
4. **Gộp rule về một nguồn**: sửa GIT-1 theo mô hình «mỗi máy một nhánh», commit `.clinerules/04`, thống nhất icon/UI-0 giữa AGENTS.md và UI-STANDARD.
5. **Cổng nội dung**: mọi nhãn/claim mặc định (vd «Trị liệu 1:1», «Chuyên gia phụ trách») và dữ liệu mẫu trong `data/` đi qua data-engineer + chủ dự án duyệt nguồn; push `hugopc_dev` (deploy Worker) chỉ sau nghiệm thu PASS.

## open_questions
- OQ-1: Xác nhận mô hình Git mới (mỗi máy một nhánh) để sửa GIT-1 trong AGENTS.md?
- OQ-2: Nhãn «Trị liệu 1:1 cùng chuyên gia» có đúng cho ca «Cá nhân hoá từ xa» không, hay tách theo `dichvu:`?
- OQ-3: Giữ hay gỡ 13 bài mẫu trong `data/articles-data.json`?
