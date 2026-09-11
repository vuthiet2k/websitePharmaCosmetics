# ROADMAP — Pharma Cosmetics Theme Package

Nguồn tham chiếu: 26 màn hình trong `Pharma_Cosmetics_Figma_Project/` (Figma file
`gMxiqp3nLgPGT90nAmEMPW`). Không bỏ bất cứ gì đang chạy (theme `skinhealthy`, MOPS Admin,
backend `mops-gas`) — chỉ bổ sung/mở rộng.

## Nguyên tắc xuyên suốt mọi milestone
- **REUSE_BEFORE_CREATE**: trước khi tạo `.bwt`/snippet mới, kiểm tra `templates/`, `snippets/`,
  `layouts/` xem có thể mở rộng cái đang có không. Lý do reuse/tạo mới ghi vào
  `design/FILE_PLAN.yaml`.
- **LAYOUT_REUSE**: mọi trang mới phải khai báo `layout_ref` (`theme`, `skinhealthy`, hoặc
  `mops-admin`) — không tự dựng lại header/footer/sidebar.
- Theme `skinhealthy` tiếp tục nhận cải tiến song song, không bị "đóng băng" vì ưu tiên pharma.

## M0 — Framework & Discovery ✅ (2026-09-07)
- Khởi tạo `.project-agent/` (khung này).
- Đối chiếu 26 màn hình Figma với `templates/`, `snippets/`, `layouts/` hiện có →
  `design/FILE_PLAN.yaml`.
- Ghi nhận `unresolved_facts` (UF-01..03 trong `DISCOVERY.json`).

## M1 — Design Foundation
- Trích xuất design tokens từ `ui-design-system.html` (màu forest/clinical, spacing, type scale,
  component states) và đối chiếu với `tailwind.config.js` + section "Theme & Màu sắc" trong
  `configs/settings_schema.json`.
- Xác nhận bảng màu "pharma" (clinical green/forest) không phá vỡ token đang dùng bởi
  `skinhealthy`.
- Output: cập nhật `tailwind.config.js` (nếu cần thêm token), ghi ADR nếu đổi token global.

## M2 — Core Commerce Surface (money path)
Trang: `homepage`, `about-us`, `search-filter`, `product-detail` (+ `product-vella`, chờ UF-01),
`cart-checkout`.
- Đây là luồng khách hàng chính — ưu tiên cao nhất sau design foundation.
- Gate bắt buộc: `frontend_theme` (build + visual QA + accessibility + không phá luồng
  checkout hiện có).

## M3 — Clinical / AI Experience (điểm khác biệt của brand pharma)
Trang: `booking` (đặt lịch khám & soi da AI), `ai-quiz` (17 câu), `ai-results`, `doctor-profile`
(chuyên gia), `clinical-proof` (minh chứng lâm sàng trước/sau), `spa-services`.
- Đây là các trang thu thập dữ liệu cá nhân/sức khoẻ nhạy cảm nhất → bắt buộc qua
  `pii_form_gate` trong `POLICY.yaml`.
- `doctor-profile` cần thêm template detail (hiện `page.chuyen-gia.bwt` có vẻ là trang danh
  sách) — xác nhận khi bắt đầu task tương ứng.

## M4 — Content & Account
Trang: `blog`, `blog-detail`, `patient-portal`, `customer-account`, `loyalty-rewards`,
`seo-directory`.
- Giải quyết UF-03 (tin tức: dùng Sapo blog admin sẵn có hay cần hệ quản trị riêng) trước khi
  làm `admin-news` ở M5.

## M5 — MOPS Admin Expansion (backend nặng hơn — theo `POLICY.yaml#mops_gas_backend`)
Trang: `admin-workspace` (extend), `admin-orders` (extend), `admin-waybill-detail` (mới),
`admin-ghtk-hub` (mới), `admin-signing` (mới), `admin-news` (mới, phụ thuộc M4/UF-03),
`admin-master-oms` (mới).
- Trước khi build UI, grep `mops-gas/*.js` để xác nhận UF-02 (endpoint đã có hay cần thêm).
- Bất kỳ thay đổi nào chạm `mops-gas/` phải theo kỷ luật deploy cố định `deploymentId`
  (xem `mops-gas/README.md` + `POLICY.yaml#release_discipline`) — không tự `clasp deploy` trần.

## M6 — QA xuyên brand & Release Readiness
- Visual QA đối chiếu từng trang với HTML Figma tham chiếu, trên cả 3 surface
  (pharma / skinhealthy / mops-admin).
- Audit consent/PII trên toàn bộ form đã liệt kê ở M3.
- Nếu có thay đổi `mops-gas/`: chạy qua `integration_gate` (sandbox trước, không chỉ HTTP 200)
  trước khi release vào deploymentId production.
- Cập nhật `FINAL_REPORT.json` khi tất cả AC trong `ACCEPTANCE.yaml` đạt PASSED.

## 🔄 REOPEN 2026-09-10 (ADR-007) — M0-M6 DONE, spec nguồn đổi

`Pharma_Cosmetics_Figma_Project/` không còn tồn tại trên đĩa. Spec chuẩn hiện hành chuyển sang
2 file xlsx tại `Pharma Cosmetics-20260910T092731Z-1-001/Pharma Cosmetics/`. 26 AC cũ (M1-M6)
giữ nguyên làm evidence lịch sử — KHÔNG bị xoá/ghi đè. Chi tiết quyết định: `DECISIONS.md#ADR-007`.

## M7 — Design System v2 (token + dark mode)
Thay toàn bộ palette T-10 (forest/clinical/brandGold + Plus Jakarta Sans) bằng palette xlsx mới
(mint `#3CB371` + Playfair Display/Inter) cho CẢ `theme` và `skinhealthy`; thêm dark mode
(`prefers-color-scheme`/`data-theme`); build 8 component y khoa mới (CMP-01..08).

## M8 — Module Portal B2B/B2C mới (MOD-04/05/09) + booking backend
`b2b-distribution` (mới, Sheets + duyệt thủ công — MST/chữ ký số BLOCKED_EXTERNAL),
`ingredient-lookup` (mới, đọc-only), `order-tracking-v2` (reuse `getShipment` thật, không IoT),
nâng cấp `booking` với khoá slot thật (`SHEET.BOOKING_SLOTS`) và xác thực link-token (không OTP).

## M9 — Clinic rebrand + 6 Flagship Solutions
Đổi tên hiển thị `theme_skinhealthy` → "SKIN HEALTH BEAUTY by PHARMA COSMETICS" (giữ nguyên
slug/đường dẫn); tái cấu trúc nội dung dịch vụ theo SOL-SKH-01..06; enforce CTA tư vấn-only
(không add-to-cart) trên toàn bộ trang Clinic.

## M10 — Compliance evidence + Release
Script `compliance-lint` (RULE-P0-02/06) + Lighthouse CLI cục bộ (RULE-P0-04) làm bằng chứng
E2 — KHÔNG dựng CI/CD enterprise (giữ nguyên ranh giới ADR-001). QA xuyên M7-M9, cập nhật
`FINAL_REPORT.json`.

## Trạng thái hiện tại
Xem `STATE.md` / `STATE.json` — cập nhật realtime theo `PROMPT_LOOP_TASKS.md`.
