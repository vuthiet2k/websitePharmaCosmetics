# STATE.md (human-readable, đồng bộ từ STATE.json)

**Phase:** OBSERVE (REOPENED 2026-09-10 → hoàn tất 2026-09-11 — xem ADR-007) — M0-M6 vẫn DONE
(31/31 task, 26/26 AC PASSED). M7-M10 mới (17 task T-70..T-97, 15 AC AC-27..41) đã IMPLEMENT +
VERIFY xong trong 1 phiên liên tục — 13/15 AC PASSED đầy đủ E2, **2 AC (AC-31, AC-33) còn ở E1**
(code mops-gas viết xong, `node --check` PASS, nhưng CHƯA `clasp push`/test sandbox thật —
người dùng xác nhận sẽ tự làm bước này). Dự án CHƯA "COMPLETE" cho tới khi 2 AC đó lên E3 thật.
**Iteration:** 8 — xem `.project-agent/FINAL_REPORT.json#reopen_2026-09-10` cho báo cáo đầy đủ
M7-M10 (báo cáo M0-M6 cũ vẫn giữ nguyên phía trên, không bị ghi đè).

## 🔄 REOPEN 2026-09-10 (ADR-007) — lý do & quyết định phạm vi mới
2 file xlsx mới (`Pharma Cosmetics-20260910T092731Z-1-001/Pharma Cosmetics/`) thay thế
`Pharma_Cosmetics_Figma_Project/` (không còn tồn tại) làm spec chuẩn. 4 quyết định chốt qua
AskUserQuestion: (1) thay toàn bộ design token + font; (2) backend thật nhưng thu hẹp cụ thể —
Sheets làm datastore, bỏ OTP, bỏ IoT, MST/chữ ký số BLOCKED_EXTERNAL (duyệt thủ công); (3) reopen
từ DESIGN, spec mới là canonical; (4) rebrand chính thức Clinic → "SKIN HEALTH BEAUTY by PHARMA
COSMETICS" (giữ nguyên slug). Chi tiết đầy đủ: `DECISIONS.md#ADR-007`.

**Việc còn lại cho người dùng (M7-M10, không chặn release M7/M9/M10):**
1. `cd mops-gas && clasp push` (bản HEAD/dev, KHÔNG deploy production) rồi test thật: tạo 1 đơn
   B2B qua `create_b2b_application` + 2 request đồng thời cùng slot đặt lịch — xác nhận AC-31/
   AC-33 lên E3 trước khi coi M8 hoàn tất đầy đủ.
2. (Tuỳ chọn) Tạo `snippets/mops_admin_tab_b2b.bwt` để duyệt đơn B2B qua giao diện thay vì gọi
   API trực tiếp.
3. (Tuỳ chọn, cần quyết định) Xác nhận có nên đổi 15 chỗ danh xưng "Bác sĩ/BS. CKII" (gắn với 1
   chuyên gia tên thật) sang "Chuyên gia" theo RULE-P0-02 xlsx hay giữ nguyên — xem
   `.project-agent/evidence/compliance/T-95-compliance-lint.log`.

## 3 quyết định vừa chốt (2026-09-07)
1. **UF-01 (ADR-004):** `product-vella` = nội dung khác của `product.bwt`, không tách template.
2. **UF-02 (ADR-005):** grep `mops-gas/` xác nhận:
   - GHTK: backend đầy đủ → `admin-ghtk-hub` chủ yếu là việc UI.
   - SPX: không có API, nhập tay → `admin-waybill-detail` không được giả lập tracking SPX.
   - Ký số X-Signs: **không có backend** → `admin-signing` là tính năng mới hoàn toàn, effort cao.
   - Master OMS: không có khái niệm riêng trong backend → giả định là thư viện component dùng
     chung cho admin — **đã tiến hành xây dựng trên giả định này** (xem T-50 resolution).
3. **UF-03 (ADR-006):** `admin-news` dùng thẳng Sapo blog admin, không xây tab MOPS Admin mới.

## Toàn bộ công việc đã hoàn tất (2026-09-09)
- **M1 (T-10):** design tokens pharma (forest/clinical/mint/brandGold/brandOrange/flashRed/
  luxurySand + font-heading) wire vào `layouts/theme.bwt` qua Tailwind CDN.
- **M2 (T-20..T-25):** homepage, about-us, search-filter, product-detail(+vella), cart-checkout.
- **M3 (T-30..T-35):** booking (+consent), ai-quiz (17 câu)+results, doctor-profile,
  clinical-proof, spa-services.
- **M4 (T-40..T-45):** blog, blog-detail (author→doctor binding), patient-portal (phát hiện+sửa
  1 gap auth/PII thật), customer-account, loyalty, seo-directory.
- **M5 (T-50..T-56):** master-oms atoms library, workspace/overview, orders (no-op, đã vượt
  Figma), waybill-detail (timeline thật cho GHTK only), ghtk-hub (COD withdrawal disable vì
  chưa có backend), **signing (THU HẸP PHẠM VI có chủ đích: UI shell + design note, KHÔNG tự
  triển khai backend ký số thật — xem lý do trong `EXECUTION_PLAN.yaml#T-55`)**, admin-news
  (verify only).
- **M6 (T-60):** build_theme/build_tailwind/secret_scan PASSED, 18 template + 7 tab MOPS Admin
  render sạch. `FINAL_REPORT.json` tổng hợp toàn bộ.

**Bug tự phát hiện + tự sửa trong phiên:** `snippets/pharma_ui_kit.bwt` ban đầu dùng tên class
trùng CSS site-wide sẵn có (`.btn-primary`/`.nav-link`/`.badge-*`) — có nguy cơ đè style toàn
site đang chạy thật. Đã đổi sang tiền tố `pc-kit-*`, rà soát lại mọi file liên quan, re-verify
sạch.

## Việc còn lại cho người dùng (không chặn, chỉ cần quyết định)
Xem đầy đủ tại `.project-agent/FINAL_REPORT.json#known_gaps_requiring_followup`:
- Tạo trang privacy policy thật (nhiều nơi đang link placeholder).
- Xác nhận 2 nhân vật bác sĩ "Minh Anh" (DS. #301 vs BS.CKII #300) là cùng 1 người hay khác nhau.
- Đồng bộ tag vocabulary giữa homepage và search filter.
- Review bảo mật/pháp lý cho `mops-gas/docs/SIGNING_BACKEND_DESIGN_NOTE.md` trước khi triển
  khai backend ký số thật.
- Khuyến nghị: 1 lượt visual QA thủ công qua trình duyệt thật (responsive 390/768/1280) trước
  khi release — phiên này chỉ verify qua render HTTP 200 phía server, không có browser tool.

## Tổng quan tiến độ theo milestone
| Milestone | Trạng thái |
|---|---|
| M0 Framework & Discovery | ✅ DONE |
| M1 Design Foundation | ✅ DONE |
| M2 Core Commerce | ✅ DONE |
| M3 Clinical/AI | ✅ DONE |
| M4 Content & Account | ✅ DONE |
| M5 MOPS Admin | ✅ DONE |
| M6 QA & Release | ✅ DONE |
| M7 Design System v2 | ✅ DONE (T-70..T-74, AC-27/28/29 PASSED) |
| M8 Portal modules mới | ⚠️ DONE (frontend E2; AC-31/AC-33 backend còn E1, chưa sandbox thật) |
| M9 Clinic rebrand | ✅ DONE (T-90..T-92, 1 ngoại lệ CTA đã xác nhận) |
| M10 Compliance & Release | ✅ DONE (T-95..T-97) |
| M11 Header/Footer UI bugfix (yêu cầu người dùng) | ✅ DONE (T-98..T-108, AC-42..AC-52 — Visual Regression Gate 39 trang + 8 bug UI/UX (dropdown transparency-typo, solutions icon, spa caption, dropdown overflow, phone format, search bar bị ẩn + lỗi JS Object.keys crash, menu wrap 2 dòng ở mọi độ rộng desktop) tìm+sửa qua Playwright thật (đo boundingClientRect/gõ phím/click thật, không chỉ ảnh chụp); 8 mục audit khác xác nhận là content/Sapo-platform/thiết kế có chủ đích, không phải code bug; +1 ENV_FAILURE môi trường "localhost" đã sửa) |
| M12 Demo data completeness (yêu cầu người dùng) | ✅ DONE (T-109, AC-53 — 7 mục data <6 phần tử mở rộng lên 6 (testimonials/articles x2 blog/faqs x3/b2b-tiers/loyalty-tiers/navigation x3); +3 bug thật có sẵn từ trước phát hiện khi verify thật: loyalty title hardcode sai số, blog page trống hoàn toàn do thiếu field blog.name/articles_count, "Invalid Date" do sai tên field published_at/published_on, avatar hiện fallback trùng lặp do thiếu CSS) |
