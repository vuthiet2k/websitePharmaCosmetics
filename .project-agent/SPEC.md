# SPEC.md — Đặc tả chức năng (nguồn: 26 màn hình Figma)

Mỗi mục dưới đây tương ứng 1 màn hình trong `Pharma_Cosmetics_Figma_Project/`. Chi tiết
mapping sang file `.bwt` thực tế nằm ở `design/FILE_PLAN.yaml` — file này chỉ mô tả **chức
năng bắt buộc** để tránh lệch khi implement.

## Nhóm A — Core Commerce (M2)

1. **homepage** — Trang chủ chuẩn y khoa: hero brand pharma, danh mục nổi bật, sản phẩm bán
   chạy, tín hiệu tin cậy (chứng nhận, bác sĩ), CTA đặt lịch/quiz da.
2. **about-us** — Giới thiệu "Pharma Cosmetics & Skin Health Clinic": câu chuyện thương hiệu,
   đội ngũ chuyên gia, chứng nhận.
3. **search-filter** — Tìm kiếm & lọc theo tình trạng da / thành phần / dòng sản phẩm.
4. **product-detail** — PDP chuẩn: ảnh, giá, thành phần hoạt tính (liên kết trang "Thành phần
   hoạt tính" đã có trong settings_schema), đánh giá, sản phẩm liên quan.
5. **product-vella** — PDP biến thể cho dòng "Vella Neck Cream" — xem UF-01 trước khi quyết
   định tách template riêng.
6. **cart-checkout** — Giỏ hàng + thanh toán y khoa (đơn thuốc kèm nếu có), tích hợp
   `mops_gas_url` cho xử lý đơn hàng thật.

## Nhóm B — Clinical / AI Experience (M3)

7. **booking** — Đặt lịch khám & soi da AI miễn phí. Form PII: họ tên, SĐT, ngày hẹn, tình
   trạng da → **bắt buộc consent checkbox + policy link** (`pii_form_gate`).
8. **ai-quiz** — Khảo sát da AI 17 câu, tiến trình lưu state client-side, không mất dữ liệu khi
   back/forward.
9. **ai-results** — Kết quả khảo sát + gợi ý "đơn thuốc"/routine sản phẩm. Kết quả có thể chứa
   dữ liệu sức khoẻ suy luận → cùng mức nhạy cảm PII như booking.
10. **doctor-profile** — Hồ sơ chuyên khoa bác sĩ: bằng cấp, chuyên môn, lịch khám, CTA đặt
    lịch trực tiếp với bác sĩ đó.
11. **clinical-proof** — Minh chứng lâm sàng trước/sau: ảnh so sánh, disclaimer y khoa bắt
    buộc (tránh vi phạm quảng cáo y tế quá mức).
12. **spa-services** — Dịch vụ spa & trị liệu chuyên sâu: danh sách dịch vụ, giá, đặt lịch.

## Nhóm C — Content & Account (M4)

13. **blog** — Kiến thức da liễu & blog chuyên gia (listing).
14. **blog-detail** — Chi tiết bài viết, tác giả là chuyên gia/bác sĩ (liên kết doctor-profile).
15. **patient-portal** — Cổng bệnh nhân lâm sàng: lịch sử khám, đơn thuốc/routine, tài liệu.
    Dữ liệu sức khoẻ cá nhân → mức bảo vệ PII cao nhất trong toàn bộ spec.
16. **customer-account** — Tài khoản khách hàng chuẩn Sapo (đã có `customers/account.bwt`).
17. **loyalty-rewards** — Chương trình tích điểm đổi quà.
18. **seo-directory** — Mega SEO directory & clinical taxonomy (đã có `page.seo-directory.bwt`).

## Nhóm D — Internal / Design Reference

19. **ui-design-system** — Không phải trang khách hàng. Tài liệu tham chiếu design tokens +
    component library, dùng nội bộ khi implement M1. Có thể publish như trang ẩn cho QA.

## Nhóm E — MOPS Admin (M5, backend nặng — `POLICY.yaml#mops_gas_backend`)

20. **admin-workspace** — Bàn làm việc tổng quan (đã có, mở rộng theo Figma).
21. **admin-orders** — Quản lý đơn hàng (đã có tab, mở rộng).
22. **admin-waybill-detail** — Chi tiết vận đơn SPX & timeline trạng thái giao hàng.
23. **admin-ghtk-hub** — GHTK Order Operations Hub: tạo/huỷ/tra cứu vận đơn GHTK hàng loạt.
24. **admin-signing** — Quản lý hồ sơ ký số X-Signs (đơn thuốc/chứng từ có chữ ký số).
25. **admin-news** — Quản lý tin tức & bài viết y khoa. Phụ thuộc UF-03 (dùng Sapo blog admin
    hay hệ riêng).
26. **admin-master-oms** — Master OMS & bảng component chuẩn (table atoms) dùng chung cho các
    tab admin khác — vai trò tương tự "ui-design-system" nhưng cho phía admin.

## Ràng buộc phi chức năng chung
- **Không phá vỡ URL/behavior hiện có** của `mops_gas_url` (xem `mops-gas/README.md`).
- **Không xoá/đổi tên** bất kỳ file `.bwt`/snippet đang được các trang khác include.
- Mọi trang mới publish qua layout đã đăng ký (`theme` | `skinhealthy` | `mops-admin`).
- Mọi form PII tuân `POLICY.yaml#pii_form_gate` (Luật 91/2025/QH15).

---

# REOPEN 2026-09-10 (ADR-007) — Nhóm F-H: xlsx Portal B2B/B2C + Clinic (M7-M10)

Nguồn: `Pharma Cosmetics-20260910T092731Z-1-001/Pharma Cosmetics/` (2 file xlsx), THAY THẾ
`Pharma_Cosmetics_Figma_Project/` làm spec chuẩn hiện hành. Các mục dưới đây BỔ SUNG vào Nhóm
A-E ở trên (không xoá/đổi mục cũ — 26 AC cũ vẫn là evidence lịch sử).

## Nhóm F — Design System v2 (M7, áp dụng xuyên suốt Nhóm A-E)

- **Design tokens v2**: thay toàn bộ palette T-10 (`forest/clinical/mint/brandGold/
  brandOrange/flashRed/luxurySand` + Plus Jakarta Sans) bằng palette xlsx
  (`--color-brand-primary #3CB371`, `--color-brand-green #267348`, `--color-brand-dark
  #166B55`, `--color-brand-deep #0F2318`, mint `#D7F3E3`/`#E8F8EE`, gold `#DFBA73`/`#B8860B`,
  peach `#D79A7D`/`#F6E3D8`, neutrals `#13241F`/`#334155`/`#64748B`/`#E2E8F0`/`#F8FAF7`,
  semantic success `#10B981`) + Playfair Display (heading) / Inter (body) — áp dụng cho CẢ
  `theme_pharma` VÀ `theme_skinhealthy` (1 design system chung theo cả 2 xlsx).
- **Dark theme**: cặp token light/dark đầy đủ (WCAG AA/AAA) qua `prefers-color-scheme`/
  `data-theme` — chưa từng có trong build trước.
- **9 component y khoa mới (CMP-01..09)**: reading progress bar, sticky TOC scrollspy, expert
  clinical callout, VISIA before/after comparison, sticky prescription widget, multimedia hub
  (video 2x2 + audio), taxonomy/tag filter bar, verified comments/reviews, Google Translate
  switcher (CMP-09 — **đã tồn tại** trong `snippets/header.bwt`, không cần xây lại).
- **6 quy chuẩn P0 dùng chung (RULE-P0-01..06)**: đa ngữ/Google Translate (đã có), chuẩn hoá
  danh xưng "Chuyên gia" + cấm ngôn từ cơ quan y tế/cấp phép, bảo mật PII (đã có qua Luật
  91/2025), Core Web Vitals, đồng bộ giá/tồn kho GSP/GDP (do nền tảng Sapo đảm nhiệm, không
  phải việc của theme), audit gatekeeper ngôn từ tuân thủ.

## Nhóm G — Module Portal B2B/B2C mới (M8)

- **b2b-distribution** (MOD-04) — Trang Đại lý Phân phối: chính sách giá theo tier, catalogue
  đặt hàng sỉ, form đăng ký đại lý mới. Đăng ký ghi vào `SHEET.B2B_APPLICATIONS` qua mops-gas,
  chuyển trạng thái `pending_review`; xác minh MST cơ quan thuế + chữ ký số hợp đồng =
  `BLOCKED_EXTERNAL` — thay bằng admin duyệt thủ công (mirror `pending_approval`/
  `approveOrder`).
- **ingredient-lookup** (MOD-05) — Tra cứu hoạt chất y khoa: dữ liệu INCI, công dụng, chống chỉ
  định, ma trận tương tác giữa các hoạt chất — đọc-only, không cần backend mới.
- **order-tracking-v2** (MOD-09) — Tra cứu đơn hàng nâng cao: PHẢI dùng lại đúng
  `getShipment`/`_shipmentHistoryList` thật (`mops_01.js`) cho timeline GHTK. Xác thực dùng
  link-token đơn giản (không OTP SMS). KHÔNG có dữ liệu cảm biến IoT chuỗi lạnh (đã loại khỏi
  phạm vi).
- **booking (nâng cấp)** — Bổ sung cơ chế khoá slot thật (`SHEET.BOOKING_SLOTS`) chống trùng
  lịch — hiện tại `createOrder(p,'booking')` không có capacity-check.

## Nhóm H — Clinic rebrand & 6 Flagship Solutions (M9)

- Toàn bộ mảng Clinic (`theme_skinhealthy`) đổi tên hiển thị thành "SKIN HEALTH BEAUTY by
  PHARMA COSMETICS" — chỉ đổi copy/branding, **giữ nguyên slug/đường dẫn kỹ thuật**.
- Nội dung dịch vụ tái cấu trúc theo 6 giải pháp chủ lực (SOL-SKH-01..06) thay taxonomy cũ.
- Mọi trang Clinic chỉ có CTA tư vấn/đặt lịch phân tích da — KHÔNG có ngôn từ/nút mua hàng trực
  tiếp (add-to-cart), theo đúng mô hình "consultation-only" của xlsx Clinic.

## Ràng buộc phi chức năng bổ sung (ADR-007)
- Không xây OTP SMS/Zalo ZNS, không cảm biến IoT, không tự động hoá tra cứu API cơ quan thuế
  hoặc chữ ký số — các hạng mục này là `BLOCKED_EXTERNAL`, thay bằng quy trình thủ công.
- Compliance-language lint (RULE-P0-02/06) và perf budget (RULE-P0-04) chạy bằng script/CLI cục
  bộ, không phải cổng CI/CD tự động (giữ nguyên ranh giới ADR-001).
- `data/*.js` + `SHEET.*` mới tuân đúng convention hiện có (không tạo DB/kiến trúc lưu trữ mới).
