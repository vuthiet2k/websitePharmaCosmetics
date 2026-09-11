# DECISIONS.md — Architecture Decision Records

## ADR-001 — Governance profile rút gọn cho frontend, giữ nguyên mức nặng cho mops-gas
**Ngày:** 2026-09-07
**Bối cảnh:** Skill "Autonomous Project Architect V6.0" định nghĩa một bộ gate cấp doanh
nghiệp đầy đủ (mutation testing, SAST/SCA/DAST, SLSA/SBOM, incident response, DR, SLO...).
Dự án này là 1 theme Sapo (.bwt + Tailwind + JS) không có DB/server riêng ở tầng theme, nhưng
đi kèm 1 backend Google Apps Script thật (~16.9K LOC) đang xử lý checkout ẩn danh, đơn hàng,
vận đơn, ký số.
**Quyết định:**
- Tầng `frontend_theme` (pharma theme, skinhealthy theme, mops-admin UI): áp gate rút gọn —
  build, lint/syntax, visual/UX QA đối chiếu Figma, accessibility, PII-form checklist. Bỏ
  mutation testing / SAST-SCA-DAST enterprise / SLSA-SBOM / incident response / SLO vì không có
  hạ tầng tương ứng để tạo bằng chứng thật (sẽ vi phạm chính "Zero Hallucination of Evidence").
- Tầng `mops_gas_backend`: GIỮ các gate nặng — release discipline (deployment ID cố định),
  data integrity (idempotency/validate trước ghi), integration gate (verify payload/signature
  thật qua sandbox trước production), secrets lifecycle, compliance PII cho checkout.
**Người quyết định:** Người dùng (xác nhận qua AskUserQuestion 2026-09-07: "Rút gọn phù hợp
theme frontend" + làm rõ "mops là cả 1 hệ thống lớn" nên giữ nặng cho phần đó).
**Hệ quả:** `POLICY.yaml` có 2 profile riêng biệt (`frontend_theme`, `mops_gas_backend`) thay vì
1 policy chung cho toàn dự án.

## ADR-002 — Không tạo thư mục ops/reliability/supply-chain đầy đủ ở giai đoạn hiện tại
**Ngày:** 2026-09-07
**Bối cảnh:** Cấu trúc chuẩn V6.0 yêu cầu `ops/INCIDENT_RESPONSE.md`,
`reliability/SLO_DEFINITIONS.yaml`, SBOM/SLSA attestation.
**Quyết định:** Bỏ qua các artifact này ở M0-M6 hiện tại (không phù hợp quy mô 1 theme +
1 GAS backend không có CI/CD chuẩn). Sẽ bổ sung `ops/INCIDENT_RESPONSE.md` rút gọn NẾU xảy ra
sự cố thật liên quan tới `mops-gas` (checkout lỗi, mất đơn hàng...) — tạo theo nhu cầu thực tế
thay vì tạo trước rồi bỏ trống.
**Hệ quả:** `.project-agent/` không có `ops/`, `reliability/` ở lần khởi tạo này. Có thể thêm
sau nếu policy thay đổi.

## ADR-004 — UF-01 resolved: product-vella KHÔNG tách template riêng
**Ngày:** 2026-09-07
**Quyết định người dùng:** "nội dung khác của sản phẩm thôi" — `product-vella.html` chỉ là nội
dung khác (SKU khác) hiển thị qua `templates/product.bwt` hiện có, KHÔNG tạo
`product.vella.bwt`.
**Hệ quả:** `design/FILE_PLAN.yaml#product-vella` đổi từ `PENDING_DECISION` sang `EXTEND
templates/product.bwt`. `T-24-product-vella` không còn là task tạo template riêng mà gộp vào
`T-23-product-detail` (đảm bảo `product.bwt` render đúng cho nhiều dòng sản phẩm khác nhau,
bao gồm Vella Neck Cream).

## ADR-005 — UF-02 resolved: khảo sát thực tế backend mops-gas cho 4 tính năng admin mới
**Ngày:** 2026-09-07
**Phương pháp:** grep `mops-gas/mops_*.js` theo function/case name (không chỉ full-text) +
đối chiếu snippet admin hiện có (`mops_admin_tab_shipping.bwt`, `mops_admin_tab_orders.bwt`).
**Kết quả:**
- **GHTK (admin-ghtk-hub):** Backend ĐẦY ĐỦ — `ghtkCreateShipment`, `ghtkCancelShipment`,
  `ghtkCalcFee`, `ghtkRefreshTracking`, `ghtkConnectByLogin`, `ghtkSyncPickAddresses` đã có
  trong `mops_01.js`. Đây chủ yếu là task UI (dựng hub thao tác hàng loạt trên các hàm đã có),
  KHÔNG cần thiết kế backend mới.
- **SPX / Waybill chi tiết (admin-waybill-detail):** CHỈ CÓ MỘT PHẦN. `mops_admin_tab_shipping.bwt`
  đã có báo cáo tổng hợp (`total_waybills`, breakdown theo carrier). Nhưng: (a) SPX/Shopee
  Express KHÔNG có API — nhân viên nhập tay mã vận đơn (xem comment trong
  `mops_admin_tab_orders.bwt:1149`), nên KHÔNG THỂ có timeline tự động thật cho đơn SPX; (b) GHTK
  có `ghtkRefreshTracking` nên timeline chi tiết CHỈ khả thi đầy đủ cho đơn GHTK. `admin-waybill-detail`
  cần thu hẹp phạm vi: hiển thị timeline thật cho GHTK, hiển thị trạng thái nhập tay (không giả
  lập tracking) cho SPX.
- **X-Signs / ký số (admin-signing):** KHÔNG TÌM THẤY bất kỳ hàm/case nào liên quan trong toàn
  bộ `mops-gas/`. Đây là tính năng HOÀN TOÀN MỚI — cần thiết kế backend (lưu trữ hồ sơ ký số,
  quy trình ký, xác thực chữ ký) TRƯỚC khi xây UI, không chỉ là việc dựng giao diện cho API có
  sẵn. Rủi ro/effort cao hơn 3 tính năng admin còn lại — tách thành nhánh riêng, không gộp
  chung tốc độ với waybill/ghtk.
- **Master OMS (admin-master-oms):** KHÔNG tìm thấy khái niệm "OMS" riêng biệt trong backend.
  `page.mops-admin.bwt` đã có kiến trúc 11-tab quản lý (Tổng quan/Đơn hàng/Sản phẩm/Khách
  hàng/Tài chính/...). **Giả định (cần người dùng xác nhận khi bắt đầu T-50):** màn hình
  `admin-master-oms` trong Figma đóng vai trò thư viện component/table-atom dùng chung cho các
  tab admin (giống vai trò `ui-design-system` nhưng cho phía admin), KHÔNG phải một module
  nghiệp vụ OMS mới. Nếu sai, cần điều chỉnh lại FILE_PLAN/EXECUTION_PLAN cho T-50.
**Hệ quả:** Cập nhật `design/FILE_PLAN.yaml`, `EXECUTION_PLAN.yaml`, `ACCEPTANCE.yaml`,
`TASK_QUEUE.jsonl`, `security/THREAT_MODEL.yaml` theo kết quả trên.

## ADR-006 — UF-03 resolved: admin-news dùng Sapo blog admin có sẵn
**Ngày:** 2026-09-07
**Quyết định người dùng:** "dùng sapo luôn" — quản lý tin tức/bài viết y khoa dùng thẳng khu
vực quản trị Blog có sẵn của Sapo, KHÔNG xây `mops_admin_tab_news.bwt` mới trong MOPS Admin.
**Hệ quả:** `admin-news` trong `design/FILE_PLAN.yaml` đổi sang `USE_EXISTING_SAPO_BLOG_ADMIN`.
Việc còn lại chỉ là: (a) đảm bảo `templates/blog.bwt`/`templates/article.bwt` (M4) hiển thị
đúng nội dung tạo từ Sapo blog admin, (b) cân nhắc thêm 1 link điều hướng nhanh tới Sapo blog
admin trong `page.mops-admin.bwt` nếu người dùng muốn tiện truy cập — KHÔNG bắt buộc. Vì không
tạo code GAS mới, task này thuộc profile `frontend_theme` (không cần `mops_gas_backend` gate
nặng) dù nằm trong nhóm màn hình admin.

## ADR-003 — Giữ THREAT_MODEL rút gọn (không STRIDE đầy đủ)
**Ngày:** 2026-09-07
**Bối cảnh:** Có form thu thập dữ liệu sức khoẻ (booking, ai-quiz, patient-portal) và checkout
ẩn danh xử lý tiền thật — có trust boundary thật cần ghi nhận, nhưng không đến mức cần STRIDE
đầy đủ cho một theme không tự host server.
**Quyết định:** `security/THREAT_MODEL.yaml` chỉ liệt kê các trust boundary + PII touchpoint
chính và mitigation tương ứng, không phân tích đầy đủ 6 hạng mục STRIDE cho từng thành phần.

## ADR-007 — REOPEN từ pha DESIGN: xlsx mới thay thế toàn bộ reference design cũ
**Ngày:** 2026-09-10
**Bối cảnh:** Dự án đã đạt `STATE.json phase: DONE` (26/26 AC PASSED, 2026-09-09). Người dùng
cập nhật `Skill - Autonomous Project Architect.md` lên bản mới và bổ sung 2 tài liệu spec xlsx
chi tiết hơn nhiều (`PharmaCosmetics_KhungGiaoDien_ChucNang_Portal_B2B_B2C.xlsx` — 9 module
MOD-01..09, 45 section, 26 quy chuẩn P0; `SkinHealthBeauty_KhungGiaoDien_ChucNang_Clinic_DichVu.xlsx`)
tại `Pharma Cosmetics-20260910T092731Z-1-001/Pharma Cosmetics/`. Thư mục tham chiếu cũ
`Pharma_Cosmetics_Figma_Project/` (căn cứ của 26 AC đã PASSED) không còn tồn tại trên đĩa — 2
file xlsx mới là spec văn bản duy nhất còn lại.
**Quyết định (xác nhận qua AskUserQuestion, 2026-09-10):**
1. **Design tokens:** Thay thế toàn bộ palette T-10 (`forest/clinical/mint/brandGold/
   brandOrange/flashRed/luxurySand` + Plus Jakarta Sans) bằng palette mới trong xlsx
   (`--color-brand-primary #3CB371`, `--color-brand-dark #166B55`, `--color-brand-deep
   #0F2318`, mint/gold/peach families, cặp light/dark đầy đủ theo WCAG) + Playfair Display/
   Inter — áp dụng cho CẢ HAI surface khách hàng (`theme_pharma` và `theme_skinhealthy`), vì cả
   2 file xlsx đều quy định chung 1 design system. `mops_admin_ui` (ma-* atoms) KHÔNG đổi.
2. **Phạm vi backend:** Cố gắng build backend thật nhưng thu hẹp cụ thể — dùng Google Sheets
   qua `mops-gas` hiện có làm datastore (không tạo DB mới); BỎ xác thực OTP (dùng xác thực đơn
   giản hơn — capture SĐT/email + link-token, tái dùng quy ước `expire_at` của luồng deposit);
   BỎ HOÀN TOÀN cảm biến IoT chuỗi lạnh; API tra cứu MST cơ quan thuế + chữ ký số cho B2B
   onboarding = `BLOCKED_EXTERNAL`, thay bằng hàng đợi admin duyệt thủ công (mirror pattern
   `pending_approval`/`approveOrder` đã có trong `mops_02.js`).
3. **Re-spec:** Coi 2 file xlsx là spec chuẩn mới, REOPEN dự án từ pha DESIGN (theo §39
   Post-Completion Feedback Loop) — bổ sung milestone mới M7-M10 vào SPEC.md/ACCEPTANCE.yaml/
   EXECUTION_PLAN.yaml, KHÔNG xoá/ghi đè 26 AC đã PASSED (vẫn giữ nguyên làm evidence lịch sử).
4. **Rebrand:** Đổi tên hiển thị surface `theme_skinhealthy` thành "SKIN HEALTH BEAUTY by
   PHARMA COSMETICS" trong copy/tài liệu — KHÔNG đổi tên file/slug/đường dẫn kỹ thuật để tránh
   phá vỡ layout/link đã có.
**Người quyết định:** Người dùng (AskUserQuestion 2026-09-10, 4 câu hỏi liên tiếp — token
replace, backend scope theo từng hạng mục cụ thể, respec vs additive, rebrand).
**Hệ quả:** Milestone mới M7 (design system v2 + dark mode), M8 (module Portal mới: B2B
distribution, tra cứu hoạt chất, tra cứu đơn hàng nâng cao + booking slot-locking backend), M9
(rebrand Clinic + 6 Flagship Solutions), M10 (compliance evidence + release) — task T-70 trở
đi, AC-27 trở đi, tiếp nối đúng quy ước numbering hiện có (không phá vỡ T-00..T-60/AC-01..26 đã
DONE). RULE-P0-04 (Core Web Vitals) và RULE-P0-06 (audit ngôn từ tuân thủ) trong xlsx được đáp
ứng bằng script/log thực thi cục bộ (Lighthouse CLI, compliance-lint), KHÔNG dựng CI/CD doanh
nghiệp mới — nhất quán với ranh giới đã lập ở ADR-001 (không có hạ tầng CI thật để tạo bằng
chứng E3/E4 cho các gate này).
