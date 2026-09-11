# PROMPT_LOOP_TASKS.md — hàng đợi việc tiếp theo (human-readable, đồng bộ EXECUTION_PLAN.yaml)

## ✅ Đã xong — T-01, T-02, T-03 (2026-09-07)
- **T-01 (ADR-004):** product-vella = nội dung khác của product.bwt, không tách template.
- **T-02 (ADR-005):** GHTK backend đầy đủ · SPX không API (nhập tay) · Signing X-Signs KHÔNG có
  backend (tính năng mới, effort cao) · Master OMS = giả định thư viện component (cần xác nhận
  lại ở T-50).
- **T-03 (ADR-006):** admin-news dùng thẳng Sapo blog admin có sẵn.

## ✅ Đã xong — T-10 (2026-09-09)
- **T-10 (AC-DESIGN-01):** design tokens (forest/clinical/mint/brandGold/brandOrange/flashRed/
  luxurySand + font-heading Plus Jakarta Sans) trích từ `ui-design-system.html` + `css/style.css`,
  merge vào `tailwind.config.js`, wire vào `layouts/theme.bwt` (Tailwind CDN + config nhúng,
  cùng quy ước `layouts/skinhealthy.bwt`). `build_tailwind` PASSED.

## ✅ M1-M6 HOÀN TẤT (2026-09-09)
31/31 task DONE. Xem `.project-agent/FINAL_REPORT.json` cho báo cáo đầy đủ + known gaps.

- **M2:** T-20 homepage · T-21 about-us · T-22 search-filter · T-23/24 product-detail+vella ·
  T-25 cart-checkout.
- **M3:** T-30 booking (+consent) · T-31/32 ai-quiz (17 câu) + ai-results · T-33 doctor-profile ·
  T-34 clinical-proof · T-35 spa-services.
- **M4:** T-40 blog · T-41 blog-detail · T-42 patient-portal · T-43 customer-account ·
  T-44 loyalty · T-45 seo-directory.
- **M5:** T-50 master-oms atoms · T-51 workspace · T-52 orders (no-op) · T-53 waybill-detail ·
  T-54 ghtk-hub · T-55 signing (UI shell + design note, KHÔNG backend thật) · T-56 admin-news.
- **M6:** T-60 QA/release — build sạch, secret_scan sạch, 18 template + 7 tab admin render sạch.

Việc còn lại từ M1-M6 là quyết định của người dùng (privacy policy page, xác nhận nhân vật bác
sĩ trùng tên, review bảo mật cho backend ký số) — xem
`FINAL_REPORT.json#known_gaps_requiring_followup`.

## 🔄 REOPEN 2026-09-10 (ADR-007) — hàng đợi mới M7-M10

Xlsx spec mới (`Pharma Cosmetics-20260910T092731Z-1-001/Pharma Cosmetics/`) thay thế
`Pharma_Cosmetics_Figma_Project/` (không còn tồn tại). Xem `DECISIONS.md#ADR-007` cho toàn bộ 4
quyết định phạm vi (token replace toàn bộ, backend scope thu hẹp, respec, rebrand).

**M7 — Design System v2 (token + dark mode):**
27. T-70 tokens-v2-config (thay palette T-10 bằng palette xlsx, cả theme + skinhealthy) ·
28. T-71 dark-mode-tokens · 29. T-72 apply-tokens-theme · 30. T-73 apply-tokens-skinhealthy ·
31. T-74 new-components (CMP-01..08, CMP-09 Google Translate đã có sẵn — bỏ qua).

**M8 — Module Portal mới (MOD-04/05/09) + booking backend:**
32. T-80 b2b-distribution-page · 33. T-81 b2b-onboarding-backend (Sheets + duyệt thủ công,
MST/chữ ký số BLOCKED_EXTERNAL) · 34. T-82 ingredient-lookup · 35. T-83 booking-slot-locking
(Sheets, không OTP) · 36. T-84 link-verification · 37. T-85 order-tracking-enhanced (reuse
getShipment thật, không IoT).

**M9 — Clinic rebrand + 6 Flagship Solutions:**
38. T-90 rebrand-skinhealthy-copy ("SKIN HEALTH BEAUTY by PHARMA COSMETICS", giữ nguyên slug) ·
39. T-91 six-flagship-solutions · 40. T-92 clinic-cta-audit (chỉ CTA tư vấn, không add-to-cart).

**M10 — Compliance evidence + release:**
41. T-95 compliance-language-lint · 42. T-96 perf-budget-check (Lighthouse cục bộ) ·
43. T-97 qa-release-m7-10.

## Hàng đợi M5 (MOPS Admin — gate nặng hơn, xem POLICY.yaml#mops_gas_backend)
19. T-50 admin-master-oms (làm TRƯỚC — **xác nhận lại giả định "thư viện component" với người
    dùng trước khi build**, xem ADR-005) · 20. T-51 admin-workspace · 21. T-52 admin-orders ·
22. T-53 admin-waybill-detail (timeline thật cho GHTK, thủ công cho SPX) ·
23. T-54 admin-ghtk-hub (chủ yếu UI, backend đã có) ·
24. T-55 admin-signing (⚠️ HIGH EFFORT — backend hoàn toàn mới) ·
25. T-56 admin-news (dùng Sapo blog admin, không tạo tab mới)

## M6
26. T-60 QA xuyên brand + release checklist

---
**Quy tắc tiêu thụ hàng đợi (theo 22. Agentic REPL Loop):** xử lý đúng 1 task/lần, cập nhật
`STATE.json` + `EVENTS.jsonl` ngay sau khi xong, không tự ý sửa file ngoài phạm vi task hiện
tại (Strict Boundary Respect).
