# QUY TRÌNH PHỐI HỢP LÀM VIỆC NHÓM (TEAMWORK COLLABORATION WORKFLOW)
## HỆ THỐNG VẬN HÀNH 4 VAI TRÒ (1 BA + 2 FE + 1 TESTER) THEO CHUẨN ASTRA AGENTIC WORKFLOW TRÊN NỀN TẢNG GEMINI 3.8 FLASH (LOW) CHO THEME SAPO WEB PHARMA COSMETICS

**Mã tài liệu:** `SOP-PC-TEAMWORK-01`  
**Phiên bản:** `v1.0-RELEASE`  
**Ngày ban hành:** 2026-11-19  
**Dự án áp dụng:** Theme Sapo Web (`.bwt`) — Pharma Cosmetics Storefront  
**Nhánh làm việc:** `hugo-theme-sept2026` / `ui-fix`  
**Tài liệu tham chiếu tối thượng:**
1. Đặc tả Vận hành Agentic Workflow Astra (`E:\AI_SKILL\geminiplan\Dac-ta-van-hanh-Agentic-Workflow-GPT-6-Astra.md`)
2. Quản Trị Đội Ngũ AI — Autonomous AI Agent Team Management (`E:\AI_SKILL\geminiplan\manage-project\Quản Trị Đội Ngũ AI.md`)
3. Chỉ dẫn AI Agent kho Pharma Cosmetics (`AGENTS.md`)
4. Cẩm nang Quy chế, Rule & Hướng dẫn Kỹ thuật phát triển Theme Sapo Web (`Rule&HDKTXD.md`)
5. Chuẩn Triển khai UX/UI Pharma Cosmetics (`docs/UI-STANDARD.md`)
6. Bộ Quy chuẩn Kỹ thuật Theme & Giao diện (`.clinerules/01-03`)

---

## CHƯƠNG 0: ĐỘI CLAUDE CODE (BA LEAD + 2 FE + DE) — ÁP DỤNG TỪ 20/11/2026

Khi làm việc trên Claude Code, đội gồm 4 agent khai báo ở `.claude/agents/` (định nghĩa agent là nguồn chuẩn về
phạm vi ghi & tự kiểm; các chương sau vẫn dùng cho mô hình Gemini/Tester cũ). Gọi cả đội bằng lệnh **`/team <yêu cầu>`**
(`.claude/commands/team.md`).

| Agent | Vai trò | Ghi được | Không được ghi |
|---|---|---|---|
| `ba-lead` | Phân tích yêu cầu, khảo sát hiện trạng, viết SPEC + thẻ việc, **nghiệm thu** (thay Tester: chạy cổng kiểm tra, PASS/FAIL theo AC) | `docs/specs/**` | mọi mã theme, `configs/`, `data/` |
| `fe-core` | Layout, design tokens, Tailwind config/build, `ui_*`, header/footer, schema dùng chung (khi đã duyệt) | xem mục 3.3 + file thẻ việc ghi đích danh | section/template nghiệp vụ, `data/` |
| `fe-feature` | Template, section, thẻ SP/bài viết, luồng mua hàng — tiêu thụ `ui_*` + token | xem mục 3.4 + file thẻ việc ghi đích danh | layout, token, `ui_*`, Tailwind config, `configs/`, `data/` |
| `data-engineer` | Hồ sơ chất lượng dữ liệu, làm sạch/chuẩn hoá, gói nội dung có nguồn thật, dữ liệu mẫu dev preview | `data/**` (ghi đè gốc phải được duyệt), `docs/data/**`, `scripts/data-*`, `exports/*.xlsx` | mã theme, `configs/` (giá trị settings giao bảng cho BA/fe-core) |

Luồng: yêu cầu → `ba-lead` (SPEC + `open_questions`; còn câu hỏi ⇒ hỏi chủ dự án) → thẻ việc chạy song song khi
không chung file, tuần tự khi phụ thuộc → review chéo 2 FE → `ba-lead` nghiệm thu (tối đa 2 vòng trả lỗi/thẻ) →
phiên chính kiểm lại diff và báo chủ dự án. Đổi schema/settings, đổi bố cục chưa có mockup, nội dung y dược/số liệu
chưa có nguồn ⇒ luôn hỏi chủ dự án trước.

---

## MỤC LỤC TỔNG QUAN

- [CHƯƠNG 1: TỔNG QUAN, BỐI CẢNH & TRIẾT LÝ VẬN HÀNH](#chương-1-tổng-quan-bối-cảnh--triết-lý-vận-hành)
  - [1.1. Bối cảnh dự án & Mục tiêu tối thượng](#11-bối-cảnh-dự-án--mục-tiêu-tối-thượng)
  - [1.2. Nền tảng kiến trúc: Astra Agentic Workflow tích hợp đặc thù Sapo Web Theme (.bwt)](#12-nền-tảng-kiến-trúc-astra-agentic-workflow-tích-hợp-đặc-thù-sapo-web-theme-bwt)
  - [1.3. Triết lý cốt lõi: Tách biệt Control Path & Data Path, 6 Bất biến vận hành tối thượng](#13-triết-lý-cốt-lõi-tách-biệt-control-path--data-path-6-bất-biến-vận-hành-tối-thượng)
  - [1.4. Tối ưu hóa triệt để cho Gemini 3.8 Flash (Low Reasoning Effort) bằng Ray dẫn hướng cơ học](#14-tối-ưu-hóa-triệt-để-cho-gemini-38-flash-low-reasoning-effort-bằng-ray-dẫn-hướng-cơ-học)
- [CHƯƠNG 2: HỒ SƠ VẬN HÀNH GEMINI 3.8 FLASH (LOW) & CÁC RÀO CHẮN CƠ HỌC](#chương-2-hồ-sơ-vận-hành-gemini-38-flash-low--các-rào-chắn-cơ-học)
  - [2.1. Phân tích ma trận rủi ro & đặc tính vận hành của Gemini 3.8 Flash (Low)](#21-phân-tích-ma-trận-rủi-ro--đặc-tính-vận-hành-của-gemini-38-flash-low)
  - [2.2. Các giải pháp chế ngự & Hệ thống Ray dẫn hướng cơ học (Mechanical Rails)](#22-các-giải-pháp-chế-ngự--hệ-thống-ray-dẫn-hướng-cơ-học-mechanical-rails)
    - [2.2.1. Đầu vào có cấu trúc cao (Structured Inputs) & Tác vụ nguyên tử (Atomic Scopes)](#221-đầu-vào-có-cấu-trúc-cao-structured-inputs--tác-vụ-nguyên-tử-atomic-scopes)
    - [2.2.2. Kiến trúc bộ nhớ lưu bền vững trên File (Hot/Cold Memory Persistence) & Cách ly Thư mục Trạng thái Scratch (GAP-08)](#222-kiến-trúc-bộ-nhớ-lưu-bền-vững-trên-file-hotcold-memory-persistence--cách-ly-thư-mục-trạng-thái-scratch-gap-08)
    - [2.2.3. Chốt chặn xác định bằng Exit Code Script (Deterministic Script Gating - GAP-01 & GAP-02)](#223-chốt-chặn-xác-định-bằng-exit-code-script-deterministic-script-gating---gap-01--gap-02)
    - [2.2.4. Rào chắn cứng (Hard Guardrails) vs Rào chắn mềm & Quy trình Three Questions Triage](#224-rào-chắn-cứng-hard-guardrails-vs-rào-chắn-mềm--quy-trình-three-questions-triage)
    - [2.2.5. Bảo vệ màu thương hiệu `#3CB371`, quy chuẩn cỡ chữ biến, tuyệt đối chống bịa số liệu (ANTI-FAB - GAP-03)](#225-bảo-vệ-màu-thương-hiệu-3cb371-quy-chuẩn-cỡ-chữ-biến-tuyệt-đối-chống-bịa-số-liệu-anti-fab---gap-03)
- [CHƯƠNG 3: ĐỊNH DANH & CẤU TRÚC CHI TIẾT 4 VAI TRÒ](#chương-3-định-danh--cấu-trúc-chi-tiết-4-vai-trò)
  - [3.1. Sơ đồ tương quan và luồng giá trị khép kín giữa 4 vai trò](#31-sơ-đồ-tương-quan-và-luồng-giá-trị-khép-kín-giữa-4-vai-trò)
  - [3.2. Vai trò 1: Business Analyst (BA / Requirements Engineer)](#32-vai-trò-1-business-analyst-ba--requirements-engineer)
  - [3.3. Vai trò 2: Frontend Developer 1 (FE 1 - Core, Layout, Tokens & Shared UI)](#33-vai-trò-2-frontend-developer-1-fe-1---core-layout-tokens--shared-ui)
  - [3.4. Vai trò 3: Frontend Developer 2 (FE 2 - Features, Sections & Pages)](#34-vai-trò-3-frontend-developer-2-fe-2---features-sections--pages)
  - [3.5. Vai trò 4: Tester (QA & Integrity Verifier)](#35-vai-trò-4-tester-qa--integrity-verifier)
- [CHƯƠNG 4: CHI TIẾT 6 CƠ CHẾ PHỐI HỢP THEN CHỐT](#chương-4-chi-tiết-6-cơ-chế-phối-hợp-then-chốt)
  - [4.1. Cơ chế 1: Tương tác & Giao tiếp (Interaction & Communication)](#41-cơ-chế-1-tương-tác--giao-tiếp-interaction--communication)
  - [4.2. Cơ chế 2: Giao thức bắt tay bàn giao (Handoff Protocols)](#42-cơ-chế-2-giao-thức-bắt-tay-bàn-giao-handoff-protocols)
  - [4.3. Cơ chế 3: Review chéo giữa 2 FE (Cross-Review FE 1 - FE 2)](#43-cơ-chế-3-review-chéo-giữa-2-fe-cross-review-fe-1---fe-2)
  - [4.4. Cơ chế 4: Phối hợp BA - FE - Tester xuyên suốt chu trình tính năng (Lifecycle Alignment)](#44-cơ-chế-4-phối-hợp-ba---fe---tester-xuyên-suốt-chu-trình-tính-năng-lifecycle-alignment)
  - [4.5. Cơ chế 5: Vòng lặp phản hồi lỗi & Chống rung giật (Feedback Loops & Oscillation Guard)](#45-cơ-chế-5-vòng-lặp-phản-hồi-lỗi--chống-rung-giật-feedback-loops--oscillation-guard)
  - [4.6. Cơ chế 6: Giải quyết xung đột & Quy trình nghiệm thu nhóm (Conflict Resolution & Team Acceptance)](#46-cơ-chế-6-giải-quyết-xung-đột--quy-trình-nghiệm-thu-nhóm-conflict-resolution--team-acceptance)
- [CHƯƠNG 5: TÍCH HỢP RÀNG BUỘC DỰ ÁN PHARMA COSMETICS SAPO WEB](#chương-5-tích-hợp-ràng-buộc-dự-án-pharma-cosmetics-sapo-web)
- [CHƯƠNG 6: KỊCH BẢN VẬN HÀNH MẪU END-TO-END](#chương-6-kịch-bản-vận-hành-mẫu-end-to-end)
- [CHƯƠNG 7: PHỤ LỤC BIỂU MẪU CHUẨN (APPENDICES)](#chương-7-phụ-lục-biểu-mẫu-chuẩn-appendices)

---

## CHƯƠNG 1: TỔNG QUAN, BỐI CẢNH & TRIẾT LÝ VẬN HÀNH

### 1.1. Bối cảnh dự án & Mục tiêu tối thượng

Dự án **websitePharmaCosmetics** là hệ thống giao diện thương mại điện tử chuyên ngành Dược — Mỹ phẩm vận hành trên nền tảng **Sapo Web (công nghệ template DotLiquid `.bwt`)**. Đây là lĩnh vực kinh doanh đặc thù chịu sự giám sát nghiêm ngặt về quy chuẩn y tế, thông tin công bố và trải nghiệm người dùng theo tiêu chuẩn Bộ Công Thương và pháp luật Dược phẩm Việt Nam.

Mục tiêu tối thượng của tài liệu này là xác lập một **Quy trình làm việc nhóm (Teamwork Collaboration Workflow)** chuẩn mực, có tính kỷ luật cao và khả năng tự kiểm chứng cho đội ngũ 4 vai trò AI Agents:
- **01 Business Analyst (BA / Requirements Engineer)**
- **01 Frontend Developer 1 (FE 1 — Core, Layout, Tokens & Shared UI)**
- **01 Frontend Developer 2 (FE 2 — Features, Sections & Pages)**
- **01 Tester (QA & Integrity Verifier)**

Hệ thống được thiết kế bám sát **Đặc tả Vận hành Agentic Workflow Astra (`Dac-ta-van-hanh-Agentic-Workflow-GPT-6-Astra.md`)** và được tối ưu hóa đặc thù cho mô hình ngôn ngữ **Gemini 3.8 Flash (Reasoning Effort: Low)**.

### 1.2. Nền tảng kiến trúc: Astra Agentic Workflow tích hợp đặc thù Sapo Web Theme (.bwt)

Kiến trúc Astra Workflow mang lại sự bảo đảm vững chắc về mặt công kỹ nghệ phần mềm cho các hệ thống đa tác tử tự chủ (Multi-Agent Systems). Khi áp dụng vào nền tảng Sapo Web, quy trình giải quyết trực diện 3 thách thức cốt tử:
1. **Sự sai khác giữa DotLiquid runtime của Sapo và chuẩn Liquid thông thường:** Các cạm bẫy như chuỗi rỗng luôn là `truthy`, bộ lọc `slice` sinh kiểu `System.Linq`, hay việc CDN Sapo không biên dịch file asset `.bwt`.
2. **Cấu trúc theme đóng gói nghiêm ngặt:** Bắt buộc phẳng ở root zip, dung lượng nghiêm cấm vượt quá 5.000.000 bytes, bắt buộc 10 template cốt lõi và các thư mục cấu hình số nhiều (`configs/`, `layouts/`).
3. **Môi trường suy luận giới hạn (Low Reasoning Effort):** Loại bỏ hoàn toàn sự phụ thuộc vào trực giác của mô hình bằng cách thiết lập các "Ray dẫn hướng cơ học" (Mechanical Rails) và cổng kiểm tra tự động (Deterministic Verification Gates).

```
+-------------------------------------------------------------------------------------------------+
|                                KIẾN TRÚC PHỐI HỢP ASTRA - SAPO WEB                              |
|                                                                                                 |
|   [Yêu cầu PRD / Nghiệp vụ Dược]                                                                |
|                │                                                                                |
|                ▼                                                                                |
|   ┌────────────────────────────────────────────────────────┐                                    |
|   │  ROLE 1: BUSINESS ANALYST (BA)                         │ ◄─── Ingestion Gate I1–I7          |
|   │  - Trích xuất AC (explicit vs inferred)                │ ◄─── Ánh xạ 38 Sapo Objects        |
|   │  - Thiết kế configs/settings_schema.json diffs         │ ◄─── Luật RULE-P0-02 ("Chuyên gia")|
|   └──────────────────────────┬─────────────────────────────┘                                    |
|                              │                                                                  |
|               3-Way Spec Sign-off (Cổng G0)                                                     |
|                              │                                                                  |
|       ┌──────────────────────┴──────────────────────┐                                           |
|       ▼                                             ▼                                           |
|   ┌─────────────────────────────────────────┐   ┌───────────────────────────────────────────┐   |
|   │ ROLE 2: FRONTEND DEVELOPER 1 (FE 1)     │   │ ROLE 3: FRONTEND DEVELOPER 2 (FE 2)       │   |
|   │ [TẦNG CUNG ỨNG NỀN TẢNG - PROVIDER]     │   │ [TẦNG TIÊU THỤ TÍNH NĂNG - CONSUMER]      │   |
|   │ - layouts/theme.bwt                     │   │ - templates/*.bwt                         │   |
|   │ - snippets/design_tokens.bwt            ├──►│ - snippets/section_*.bwt                  │   |
|   │ - tailwind.pc.config.js & pc-ui.css     │   │ - 100% Tailwind class & ui_* snippets     │   |
|   │ - snippets/ui_*.bwt library             │   │ - Cấu hình hoá: settings.<id> | default   │   |
|   └────────────────────┬────────────────────┘   └─────────────────────┬─────────────────────┘   |
|                        │                                              │                         |
|                        └───────────────┬──────────────────────────────┘                         |
|                                        │ Cross-Review & Pre-check Pass                          |
|                                        ▼                                                        |
|   ┌────────────────────────────────────────────────────────┐                                    |
|   │  ROLE 4: TESTER (QA & INTEGRITY VERIFIER)              │ ◄─── Benny Agent Pattern           |
|   │  - Kiểm định tự động: lint, build:sapo, audit:ui       │ ◄─── UI-0 / UI-2.9 Guardrails      |
|   │  - Đối soát 100% AC, quét lỗi 1440px & 390px          │ ◄─── Oscillation Guard (Cap = 2)   |
|   └──────────────────────────┬─────────────────────────────┘                                    |
|                              │                                                                  |
|                     5-Layer Team Acceptance                                                     |
|                              │                                                                  |
|                              ▼                                                                  |
|   [NGHIỆM THU ĐÓNG GÓI - PRODUCTION READY THEME ZIP]                                            |
+-------------------------------------------------------------------------------------------------+
```

### 1.3. Triết lý cốt lõi: Tách biệt Control Path & Data Path, 6 Bất biến vận hành tối thượng

Tuân thủ nghiêm ngặt Mục 1 và Mục 1.1 của `Dac-ta-van-hanh-Agentic-Workflow-GPT-6-Astra.md`, quy trình áp dụng 2 nguyên tắc nền tảng:

#### 1. Tách biệt Tuyệt đối Đường Dữ liệu (Data Path) và Đường Điều khiển (Control Path):
- **Đường Dữ liệu (Data Path - Thụ động):** Mã nguồn Liquid, tệp cấu hình JSON, tài liệu PRD, bug log, dữ liệu mock `data/*.js`. Dữ liệu chỉ dùng để đọc, phân tích và xử lý; tự bản thân dữ liệu không có quyền hạn chuyển đổi trạng thái hệ thống.
- **Đường Điều khiển (Control Path - Chủ động):** Chỉ Orchestrator và các Cổng kiểm định tất định (Deterministic Verification Gates) mới có thẩm quyền chuyển đổi trạng thái nghiệp vụ của hệ thống (từ `SPECIFYING` sang `PLANNING`, `EXECUTING`, `VERIFYING`, `COMPLETED`). Lời văn do AI sinh ra (như *"Tôi đã hoàn thành 100%"*) hoàn toàn vô hiệu nếu không có bằng chứng exit code thành công từ script kiểm tra.

#### 2. Sáu Bất biến Vận hành Tối thượng (The 6 Operational Invariants):
1. **Bất biến 1 (Traceability Baseline):** Mọi lượt chạy (run) bắt buộc phải gắn chặt với `repo_revision`, commit hash, `prd_version`, `schema_version` và `plan_version` xác định.
2. **Bất biến 2 (Forensic Grounding):** Mọi kết luận kỹ thuật về mã nguồn hoặc nghiệp vụ phải trích dẫn đường dẫn file và số dòng cụ thể; mọi tuyên bố "đã kiểm thử" phải đính kèm nhật ký thực thi thực tế (log output) và kết quả lệnh.
3. **Bất biến 3 (State Authority):** Quyền lực thuộc về Orchestrator và Script Gating. Model không được tự đánh dấu hoàn thành nhiệm vụ.
4. **Bất biến 4 (Gated Execution & Idempotency):** Mọi thao tác ghi mã nguồn chỉ được kích hoạt sau khi kế hoạch đã được phê duyệt (`plan_validated=true`), kiểm tra phạm vi (`write_scope`), kiểm tra hash chống nguồn cũ (`STALE_SOURCE`), và có khóa chống lặp (`operation_id`).
5. **Bất biến 5 (Verification Linkage):** Mỗi tác vụ hoàn tất bắt buộc phải có liên kết hai chiều tới mã Tiêu chí nghiệm thu (`AC-xxx`) tương ứng và bằng chứng kiểm thử (ảnh chụp hoặc log).
6. **Bất biến 6 (Invalidation & Freshness):** Bằng chứng kiểm thử lập tức mất hiệu lực (invalidated) khi bất kỳ mã nguồn hoặc tệp cấu hình liên quan có sự thay đổi; toàn bộ kiểm định bắt buộc phải chạy lại từ đầu.

### 1.4. Tối ưu hóa triệt để cho Gemini 3.8 Flash (Low Reasoning Effort) bằng Ray dẫn hướng cơ học

Mô hình **Gemini 3.8 Flash** ở chế độ `reasoning_effort: low` có tốc độ xử lý vượt trội và chi phí vận hành tối ưu, nhưng đi kèm với các giới hạn bản thể: dung lượng suy luận ngầm nông, dễ bị phân tán chú ý khi context dài, có xu hướng nhảy cóc kết luận và dễ ảo giác nếu thiếu dữ liệu đầu vào chuẩn.

Để biến Gemini 3.8 Flash thành một cỗ máy sản xuất mã nguồn chuẩn xác, hệ thống thiết lập cơ chế **"Ray dẫn hướng cơ học" (Mechanical Rails)**:
- Thay thế toàn bộ "lời nhắc nhở chung chung" bằng **bộ khung mẫu có cấu trúc khắt khe (Structured Markdown Templates / JSON Schemas)**.
- Phân rã công việc thành các **tác vụ nguyên tử (Atomic Tasks)** có phạm vi đọc/ghi cô lập.
- Sử dụng các **kịch bản kiểm tra độc lập (Automated CLI Linters)** làm rào chắn cơ học không thể vượt qua: nếu script trả về exit code khác 0, mã lập tức bị từ chối và đẩy về vòng lặp sửa lỗi có kiểm soát.

---

## CHƯƠNG 2: HỒ SƠ VẬN HÀNH GEMINI 3.8 FLASH (LOW) & CÁC RÀO CHẮN CƠ HỌC

### 2.1. Phân tích ma trận rủi ro & đặc tính vận hành của Gemini 3.8 Flash (Low)

Khi vận hành trên nền tảng Gemini 3.8 Flash với Reasoning Effort mức Low, nhóm kỹ thuật phải đối mặt và chế ngự 6 rủi ro cốt lõi:

| # | Rủi ro Đặc thù | Biểu hiện Thực tế khi Thực thi | Nguy cơ đối với Theme Sapo Web |
|---|---|---|---|
| **R1** | **Suy luận ngầm nông (Shallow Reasoning)** | Bỏ qua các trường hợp biên (edge cases), chỉ xử lý luồng thuận (happy path); không nhận diện được điều kiện DotLiquid lồng nhau. | Giao diện vỡ khi `products.size == 0`, vỡ layout khi chuỗi rỗng `""` được DotLiquid đánh giá là `true`. |
| **R2** | **Trôi dạt ngữ cảnh (Context Drift)** | Sau nhiều lượt trao đổi hoặc khi context dài hơn 30.000 tokens, mô hình quên mất các quy tắc bắt buộc trong system prompt. | Tự ý dùng màu xanh lạ thay vì `#3CB371`; tự ý hardcode px thay vì dùng biến `var(--fs-*)`. |
| **R3** | **Bỏ qua xác minh (Verification Skipping)** | Tự tin tuyên bố "Đã test toàn bộ và không có lỗi" mà không thực sự chạy lệnh hoặc chỉ kiểm tra bằng mắt giả lập. | Mã chứa lỗi cú pháp DotLiquid, lỗi mồ côi `settings_schema.json` làm gãy lệnh đóng gói `build:sapo`. |
| **R4** | **Nguy cơ Ảo giác & Bịa số liệu (Hallucination / Fabrication)** | Khi không tìm thấy biến trong object Sapo, tự ý bịa thêm biến mới hoặc bịa các con số đánh giá 5 sao, % đã bán giả lập. | Vi phạm luật Dược và quy định chống bịa đặt dữ liệu của dự án (`AGENTS.md`, RULE-P0-02). |
| **R5** | **Xâm lấn phạm vi (Scope Creep / File Trespassing)** | Khi được giao sửa 1 snippet, tiện tay sửa định dạng CSS toàn cục hoặc sửa file layout của agent khác. | Gây xung đột Git merge nghiêm trọng; làm mất hiệu lực toàn bộ bằng chứng kiểm thử trước đó. |
| **R6** | **Rung giật sửa lỗi (Defect Oscillation)** | Sửa lỗi A làm phát sinh lỗi B; sửa lỗi B quay lại làm tái phát lỗi A (vòng lặp vô tận). | Hao phí tài nguyên token, làm bẩn lịch sử commit, dự án rơi vào trạng thái bế tắc kỹ thuật. |

### 2.2. Các giải pháp chế ngự & Hệ thống Ray dẫn hướng cơ học (Mechanical Rails)

Để triệt tiêu hoàn toàn 6 rủi ro trên, hệ thống áp dụng bộ 5 giải pháp công kỹ nghệ cơ học:

#### 2.2.1. Đầu vào có cấu trúc cao (Structured Inputs) & Tác vụ nguyên tử (Atomic Scopes)
- **Cấu trúc hóa đầu vào:** Không bao giờ giao việc cho Gemini 3.8 Flash bằng ngôn ngữ tự nhiên mơ hồ (ví dụ: *"Hãy làm cho trang sản phẩm đẹp hơn"*). Mọi nhiệm vụ đều phải đóng gói dưới dạng bảng biểu: Mục tiêu, Input Files, Output Files, Quy tắc bắt buộc, và Danh sách kiểm tra (Rubric Checklist).
- **Nguyên tắc Tác vụ Nguyên tử (Atomic Tasks - Astra Section 5.3):** Mỗi task chỉ giải quyết duy nhất một vấn đề cụ thể với `read_scope` (tối đa 3–5 file) và `write_scope` (tối đa 1–2 file) được phân định rõ ràng.
- **Cưỡng chế Ranh giới Ghi trước bàn giao (Mechanical Write Scope Enforcement via Git Diff - GAP-05):** Trước khi bàn giao bất kỳ handoff report nào, tác tử bắt buộc phải thực thi lệnh `git status --porcelain` và `git diff --name-only <base_branch>...HEAD` (hoặc `git diff --name-only`) để tự động đối soát rằng 100% tệp đã sửa đổi hoặc tạo mới đều nằm trọn vẹn trong `write_scope` được phân công. Nếu phát hiện bất kỳ file nào nằm ngoài phạm vi ghi (ví dụ FE 2 sửa file của FE 1, hoặc Tester sửa file `.bwt`), lượt bàn giao bị hủy bỏ ngay lập tức (FAIL exit 1), ngăn chặn triệt để hiện tượng Scope Creep và File Trespassing.

#### 2.2.2. Kiến trúc bộ nhớ lưu bền vững trên File (Hot/Cold Memory Persistence) & Cách ly Thư mục Trạng thái Scratch (GAP-08)
Tuân thủ Mục 3 của Astra Workflow và quy chuẩn Teamwork Framework, hệ thống loại bỏ sự phụ thuộc vào bộ nhớ hội thoại ngắn hạn (Conversation Context) bằng cách tổ chức bộ nhớ trên hệ thống tệp:
- **Hot Memory (Bộ nhớ nóng - Cục bộ):** Mỗi agent duy trì một file `BRIEFING.md` trong thư mục state cá nhân dung lượng < 100 dòng.
  - Các mục đánh dấu 🔒 (`## 🔒 My Identity`, `## 🔒 Key Constraints`) là **BẤT BIẾN / APPEND-ONLY**: không bao giờ bị ghi đè hay xóa bỏ, giúp mô hình tái tạo ngay lập tức danh tính và các ràng buộc cốt lõi sau mỗi lượt nén context.
  - File `progress.md` đóng vai trò nhịp tim ghi nhận trạng thái tức thời.
- **Quy chuẩn Đường dẫn State & Cách ly Phiên (Teamwork Scratch State Isolation):** Toàn bộ thư mục trạng thái tác tử (`BRIEFING.md`, `progress.md`, `DISPATCH.md`, `handoff.md`, `plan.md`) **TUYỆT ĐỐI KHÔNG ĐƯỢC ĐẶT TẠI THƯ MỤC GỐC WORKSPACE DỰ ÁN** (không tạo `.agents/teamwork/` tại root repo). Thư mục state bắt buộc lưu trữ độc lập tại đường dẫn scratch ngoài workspace: `<appDataDir>/scratch/teamwork/<run_id>/.agents/teamwork/<agent_id>/`. Điều này bảo đảm cách ly triệt để giữa các phiên chạy đồng thời (multi-run isolation), tránh xung đột file state và không làm ô nhiễm lịch sử Git. Đồng thời, thư mục `.agents/` bắt buộc được ghi nhận trong tệp `.gitignore` của repository để chặn đứng hoàn toàn việc commit nhầm file state.
- **Cold Memory (Bộ nhớ lạnh - Toàn cục):** Toàn bộ kho mã nguồn Git, tài liệu PRD, tài liệu `docs/specs/`, `docs/qa/`, `Rule&HDKTXD.md`, và log thực thi lệnh được lưu trữ bền vững tại workspace. Agent chỉ truy xuất khi cần thông qua đường dẫn tuyệt đối.

#### 2.2.3. Chốt chặn xác định bằng Exit Code Script (Deterministic Script Gating - GAP-01 & GAP-02)
- Tuyệt đối không chấp nhận các câu tự nhận xét định tính từ mô hình. Lời văn khẳng định "đã test hoàn tất" hoàn toàn vô giá trị nếu không có bằng chứng exit code thành công.
- Mọi trạng thái chuyển pha đều phụ thuộc vào kết quả trả về của các lệnh CLI nội bộ. Exit code = 0 là điều kiện tiên quyết để được xét duyệt; Exit code != 0 lập tức kích hoạt cơ chế sửa lỗi.
- **Cưỡng chế Cờ Nghiêm ngặt (Strict Flag Enforcement):**
  * **Linter bảo vệ giao diện:** BẮT BUỘC thực thi với cờ nghiêm ngặt: `node scripts/lint-guardrails.js --strict` (hoặc `npm run lint:guardrails -- --strict`). Khi có cờ `--strict`, script kích hoạt `process.exit(1)` ngay lập tức nếu xuất hiện bất kỳ chỉ số hồi quy nào vượt baseline (mã màu hex hardcode lạ, inline `style=""`, cỡ chữ px cứng, `!important`). Lệnh mặc định không có cờ chỉ in cảnh báo và thoát mã 0, khiến cổng kiểm định bị vô hiệu hóa!
  * **Linter tuân thủ quy chuẩn y tế/Dược:** BẮT BUỘC thực thi với cờ nghiêm ngặt: `node scripts/compliance-lint.js --fail-on-warn`. Cờ này biến mọi cảnh báo liên quan đến danh xưng "Bác sĩ" / "BS." (vi phạm RULE-P0-02) thành Exit Code 1 ngay lập tức, chặn đứng nguy cơ vi phạm pháp lý Dược ở cấp hệ điều hành.

#### 2.2.4. Rào chắn cứng (Hard Guardrails) vs Rào chắn mềm & Quy trình Three Questions Triage
- **Rào chắn mềm (Soft Guardrails):** Lời nhắc nhở trong prompt. Theo tài liệu `Quản Trị Đội Ngũ AI.md`, rào chắn mềm có tỷ lệ tuân thủ suy giảm về 0% khi context mở rộng.
- **Rào chắn cứng (Hard Guardrails):** AST parsers, linters tĩnh (`lint:guardrails --strict`, `compliance-lint.js --fail-on-warn`, `lint:liquid-globals`, `lint:config`, `check:libsass`). Khi vi phạm, lệnh build lập tức FAIL ở cấp hệ điều hành.
- **Quy trình Triệt tiêu Lỗi 3 Câu hỏi (Three Questions Triage):**
  Khi một lỗi kỹ thuật hoặc vi phạm quy chuẩn tái diễn lần thứ 2:
  1. *Câu hỏi 1:* Làm thế nào để biến quy định này thành một cấu trúc bắt buộc hoặc linter tự động?
  2. *Câu hỏi 2:* Làm thế nào để CI/CD hoặc bộ script test phát hiện và chặn đứng vi phạm này ngay lập tức?
  3. *Câu hỏi 3:* Làm thế nào để tái cấu trúc môi trường làm việc nhằm triệt tiêu vĩnh viễn khả năng phát sinh lỗi này từ gốc rễ?

#### 2.2.5. Bảo vệ màu thương hiệu `#3CB371`, quy chuẩn cỡ chữ biến, tuyệt đối chống bịa số liệu (ANTI-FAB - GAP-03)
1. **Màu thương hiệu bất biến (UI-BRAND):** `#3CB371` (MediumSeaGreen) là màu xanh thương hiệu duy nhất của Pharma Cosmetics. Dùng cho Topbar (`header_topbar_bg`), nút CTA chính, icon chủ đạo, badge, viền nhấn, màu chủ đạo theme (`theme_main_color`). Bất kỳ mã nguồn nào chứa màu xanh hardcode khác đều bị linter đánh FAIL.
2. **Cỡ chữ bằng biến thiết kế (UI-2.9):** 100% `font-size` và shorthand `font:` bắt buộc dùng `var(--fs-*)` hoặc `var(--ts-*)` từ `snippets/design_tokens.bwt`. Nghiêm cấm ghi cứng px, rem, pt.
3. **Tuyệt đối chống bịa đặt dữ liệu (ANTI-FAB - Verification Rules & Concrete Regex Scanning Patterns):**
   - Nghiêm cấm tự tạo đánh giá 5 sao giả lập (`★`), số lượng % đã bán ảo, số lượng review tĩnh để giao diện trông "đầy đặn".
   - **Bộ Mẫu Regex Quét Tĩnh Bắt buộc (Static Regex Verification Patterns):**
     Mọi file template và snippet `.bwt` mới hoặc sửa đổi đều phải vượt qua bộ quét regex chống bịa đặt tĩnh:
     * *Pattern Đánh giá / Sao giả lập:* `(★|☆|[0-9](\.[0-9])?\s*(sao|star)|đánh giá\s*\([0-9]+\)|[0-9]+(\.[0-9]+)?\s*\/5)`
     * *Pattern % Đã bán / Doanh số ảo:* `(đã bán\s*[0-9]+%?|[0-9]+%\s*đã bán|sold\s*[0-9]+|đã mua\s*[0-9]+)`
     * *Pattern Số lượng Review Tĩnh:* `([0-9]{2,}\s*đánh giá|[0-9]{2,}\s*nhận xét|[0-9]{2,}\s*reviews?)`
   - **Nguyên tắc Phán quyết:** Nếu các chuỗi khớp với pattern trên xuất hiện dưới dạng văn bản HTML tĩnh (hardcoded static text) mà không được bọc trong các biểu thức Liquid động đọc từ thuộc tính chuẩn của 38 Sapo Objects (ví dụ: `product.metafields...` hoặc app đánh giá hợp lệ), hệ thống coi đây là lỗi **CRITICAL ANTI-FAB VIOLATION** và kích hoạt Exit Code 1. Nếu giao diện chưa có dữ liệu động thật từ Sapo, bắt buộc phải ẩn toàn bộ khối hiển thị đó (Defensive Liquid: `{% if ... != blank %}`) hoặc hiển thị trạng thái rỗng chuẩn mực (Empty State).

---

## CHƯƠNG 3: ĐỊNH DANH & CẤU TRÚC CHI TIẾT 4 VAI TRÒ

### 3.1. Sơ đồ tương quan và luồng giá trị khép kín giữa 4 vai trò

Chu trình sản xuất tính năng vận hành theo mô hình chuỗi cung ứng khép kín giữa 4 vai trò:

```
[Khách hàng / PRD / Nghiệp vụ Dược]
               │
               ▼
┌──────────────────────────────────────────────┐
│ VAI TRÒ 1: BUSINESS ANALYST (BA)             │
│ - Bóc tách PRD -> AC-xxx                     │
│ - Ánh xạ 38 Sapo Objects                     │
│ - Cấu hình hoá Schema & Luật Dược            │
└──────┬────────────────────────────────┬──────┘
       │                                │
       ▼                                ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ VAI TRÒ 2: FE 1 (CORE/LAYOUT)│ │ VAI TRÒ 3: FE 2 (FEATURES)   │
│ - Master Layout (theme.bwt)  │ │ - Templates & Sections (.bwt)│
│ - Tokens (design_tokens.bwt) │ │ - Tiêu thụ 100% Tailwind     │
│ - Library snippets/ui_*.bwt  │ │ - Lắp ghép ui_* snippets     │
│ - Biên dịch assets/pc-ui.css │ │ - Xử lý DotLiquid an toàn    │
└──────────────┬───────────────┘ └──────────────┬───────────────┘
               │                                │
               │   ┌────────────────────────────┘
               │   │ (Review chéo FE2 -> FE1)
               ▼   ▼
┌──────────────────────────────────────────────┐
│ VAI TRÒ 4: TESTER (QA & VERIFIER)            │
│ - Chạy bộ script kiểm định tự động           │
│ - UI Audit Playwright (1440px & 390px)       │
│ - Lập Defect Tickets chuẩn kèm bằng chứng    │
│ - Thẩm định AC & Ký duyệt nghiệm thu         │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
         [RELEASE GATE / ORCHESTRATOR]
```

---

### 3.2. Vai trò 1: Business Analyst (BA / Requirements Engineer)

#### Sứ mệnh:
Chuyển hóa toàn diện yêu cầu nghiệp vụ, định hướng kinh doanh và tri thức ngành Dược thành bản Đặc tả Kỹ thuật Tính năng (Feature Specification) có cấu trúc chặt chẽ, khả thi trên nền tảng Sapo Web và không chứa đựng sự mơ hồ.

#### Nhiệm vụ Cốt lõi:
1. **Trích xuất Tiêu chí Nghiệm thu (Acceptance Criteria - AC) theo chuẩn Astra 2.5:**
   - Phân rã yêu cầu thành các phát biểu đơn nguyên, gán mã định danh duy nhất (`AC-001`, `AC-002`...).
   - Phân loại rõ ràng:
     * `classification`: `"explicit"` (yêu cầu tường minh từ tài liệu) vs `"inferred"` (yêu cầu suy luận kỹ thuật bắt buộc để hệ thống chạy được).
     * `status`: `"confirmed"` (đã xác nhận) vs `"needs_confirmation"` (còn nghi vấn, cần làm rõ).
   - Tuyệt đối không tự ý nâng hạng tiêu chí `inferred` thành `explicit` khi chưa có sự xác nhận của chủ dự án.
2. **Ánh xạ 38 Đối tượng Sapo (Sapo Objects Mapping):**
   - Đối chiếu từng trường hiển thị với danh mục 38 objects chuẩn của Sapo (Mục 2.3 `SPEC-MINER-SAPO-02`).
   - Cưỡng chế nguyên tắc: Dữ liệu đã có sẵn trên Sapo Object (giá, tên, tồn kho, tags, vendor) thì bắt buộc đọc từ Object; tuyệt đối không tạo trường nhập tay trong schema gây dư thừa dữ liệu.
3. **Thiết kế & Thẩm định Thuộc tính Schema sớm (Early Schema Attribute Validation - GAP-04):**
   - Khai báo trường cấu hình mới tuân thủ 15 kiểu field hợp lệ của Sapo (`text`, `textarea`, `checkbox`, `radio`, `select`, `color`, `font`, `collection`, `blog`, `page`, `link_list`, `image`, `video`, `html`, `snippet`).
   - **RÀNG BUỘC CỨNG THẨM ĐỊNH THUỘC TÍNH (Early Schema Attribute Validation):** Trước khi bàn giao Spec cho FE, BA không chỉ chạy `JSON.parse` kiểm tra cú pháp JSON, mà bắt buộc phải chạy thẩm định cấu trúc thuộc tính schema: Kiểm tra từng field trong mảng `settings`. Nghiêm cấm tuyệt đối gán thuộc tính `"default"` cho các kiểu dữ liệu chọn (`collection`, `blog`, `page`, `link_list`, `snippet`, `font`, `image`). Chỉ cho phép thuộc tính hợp lệ (`type`, `id`, `label`, `info`, `min`, `max`, `step`, `unit`, `options`). Mọi giá trị mặc định phải xử lý bằng `| default:` trong Liquid. Lệnh thẩm định thuộc tính schema:
     `node -e "const s = JSON.parse(require('fs').readFileSync('configs/settings_schema.json','utf8')); const noDef = ['collection','blog','page','link_list','snippet','font','image']; let err = 0; s.forEach(b => (b.settings||[]).forEach(f => { if (noDef.includes(f.type) && 'default' in f) { console.error('LỖI SCHEMA: Kiểu ' + f.type + ' (id: ' + f.id + ') cấm có default!'); err++; } })); process.exit(err > 0 ? 1 : 0);"` (Exit code 1 nếu vi phạm).
4. **Cưỡng chế Quy tắc Chuyên ngành Dược & Pháp lý:**
   - Cưỡng chế quy tắc danh xưng: Bắt buộc dùng **"Chuyên gia"**, tuyệt đối KHÔNG dùng "Bác sĩ", "BS.", "DS." (RULE-P0-02).
   - Cưỡng chế quy tắc cấm hàm ý cấp phép y tế: Tuyệt đối không dùng "Bộ Y Tế", "cấp phép", "chứng nhận y tế" (RULE-P0-06).
   - Cưỡng chế quy tắc chống bịa đặt dữ liệu (ANTI-FAB): Không tạo số liệu % đã bán, đánh giá sao giả lập.
5. **Cấu hình hoá hiển thị:** Toàn bộ văn bản tĩnh phải gắn mã `settings.<id>` để người quản trị có thể thay đổi trong Admin.

#### Ranh giới Quyền hạn File (File Access Scope):
- **Quyền Đọc (Read Scope):** Toàn bộ repository (`docs/`, `configs/`, `templates/`, `snippets/`, `layouts/`, `Rule&HDKTXD.md`, `AGENTS.md`).
- **Quyền Ghi (Write Scope):** 
  - `docs/specs/SPEC-<feature-id>.md`
  - `docs/specs/RFC-*.md`
  - Thư mục state cá nhân (`<appDataDir>/scratch/teamwork/<run_id>/.agents/teamwork/ba_*/`)
  - *CẤM GHI:* Tuyệt đối không chỉnh sửa file mã nguồn theme (`.bwt`, `.css`, `.js`, `assets/`, `layouts/`).
- **Quy tắc Kiểm tra Ranh giới Ghi (Pre-Handoff Write Scope Verification via Git Diff - GAP-05):** Trước khi nộp handoff report, BA bắt buộc thực thi lệnh `git status --porcelain` và `git diff --name-only <base_branch>...HEAD` để bảo đảm 100% file thay đổi chỉ nằm trong `docs/specs/*` và thư mục state scratch. Nếu có bất kỳ file mã nguồn nào bị tác động, handoff bị REJECT ngay lập tức.

#### Đầu vào (Inputs):
- Bản mô tả yêu cầu tính năng (PRD), yêu cầu người dùng, tài liệu chiến dịch.
- `AGENTS.md`, `Rule&HDKTXD.md`, `docs/UI-STANDARD.md`.

#### Đầu ra (Outputs):
- Bản đặc tả kỹ thuật hoàn chỉnh: `docs/specs/SPEC-<feature-id>.md`.
- Bảng ánh xạ Sapo Objects & Bảng thiết kế diff schema JSON.

#### Tiêu chuẩn Hoàn thành (Definition of Done - DoD của BA):
- [ ] 100% yêu cầu có mã truy vết `REQ-xxx` -> `AC-xxx`.
- [ ] Toàn bộ AC phân loại rõ `explicit` / `inferred` và đều đạt trạng thái `confirmed`.
- [ ] Danh sách `open_questions` rỗng; nếu còn câu hỏi chưa rõ, giữ ở trạng thái `WAITING_INPUT`.
- [ ] Đoạn mã cấu hình `settings_schema.json` diff hợp lệ cú pháp JSON và vượt qua kiểm định thuộc tính schema (0 vi phạm luật cấm `default` trên kiểu chọn dữ liệu).
- [ ] `git diff --name-only` xác nhận 100% thay đổi nằm trong Write Scope của BA.
- [ ] Đạt chữ ký đồng thuận tại Cổng 3-Way Spec Sign-off với FE và Tester.

---

### 3.3. Vai trò 2: Frontend Developer 1 (FE 1 - Core, Layout, Tokens & Shared UI)

#### Sứ mệnh:
Kiến trúc sư nền tảng giao diện; chịu trách nhiệm duy trì tính toàn vẹn của Master Layout, hệ thống Design Tokens, cấu hình Tailwind, trình biên dịch CSS và Thư viện thành phần dùng chung (`snippets/ui_*.bwt`).

#### Nhiệm vụ Cốt lõi:
1. **Quản trị Master Layout (`layouts/theme.bwt`):**
   - Đảm bảo cấu trúc chuẩn Sapo: Thẻ `{{ content_for_header }}` đặt ngay trước `</head>`; thẻ `{{ content_for_layout }}` nằm trong `<body>`.
   - Quản lý thẻ `<body>` theo chuẩn alias: `<body class="{{ template | replace: '.', ' ' | truncatewords: 1, '' }}" id="{{ page_title | alias }}">`.
   - Kiểm soát thứ tự nạp stylesheet: `assets/pc-ui.css` (Tailwind compiled) bắt buộc nạp cuối cùng trong `<head>` để có độ ưu tiên cao nhất.
2. **Quản trị Design Tokens (`snippets/design_tokens.bwt`):**
   - Định nghĩa toàn bộ biến CSS Custom Properties: Bảng màu thương hiệu (neo cứng `--pc-color-primary: #3CB371`), bảng cỡ chữ chuẩn `var(--fs-*)`, thang đo khoảng cách, bo góc và bóng đổ.
   - Khi cần thêm cỡ chữ mới, bổ sung trực tiếp bậc token vào `design_tokens.bwt`; tuyệt đối không cho phép dùng giá trị px hardcode.
3. **Cấu hình & Biên dịch Tailwind CSS:**
   - Quản trị `tailwind.pc.config.js` và `ui-src/css/main.css`.
   - Thực thi biên dịch CSS bằng lệnh `npm run build:pc` sinh ra file phân phối `assets/pc-ui.css`. Đảm bảo file CSS được nén tối ưu, không phình dung lượng.
4. **Xây dựng & Bảo trì Thư viện UI Dùng chung (`snippets/ui_*.bwt`):**
   - Cung cấp các snippet component nền tảng theo chuẩn `docs/UI-STANDARD.md`: `ui_button.bwt`, `ui_icon.bwt`, `ui_card.bwt`, `ui_badge.bwt`, `ui_modal.bwt`, `ui_drawer.bwt`, `ui_input.bwt`.
   - Mỗi snippet phải có docstring chú thích rõ ràng các tham số nhận vào (props), kiểu dữ liệu và giá trị mặc định ở đầu file.
5. **Kiểm soát Khung Bố cục Toàn site (CONTAINER-SSOT):**
   - Duy trì khối căn lề SSOT trong `assets/storefront-v3.css`: `--pc-container-max: 1280px`, lề thay đổi theo breakpoint (20px ≤680px, 32px 681–1199px, 30px ≥1200px).
   - Bảo đảm mép trái logo Header trùng khớp hoàn toàn với mép trái chữ section trên màn hình 1440px.
6. **Đóng vai trò Cố vấn Kiến trúc & Reviewer cho FE 2:** Tiếp nhận các yêu cầu Token RFC từ FE 2, cấp phát token mới và tham gia duyệt chéo mã nguồn.

#### Ranh giới Quyền hạn File (File Access Scope):
- **Quyền Đọc (Read Scope):** Toàn bộ repository.
- **Quyền Ghi (Write Scope):**
  - `layouts/theme.bwt`, `layouts/chat.bwt`
  - `snippets/design_tokens.bwt`
  - `snippets/ui_*.bwt` (thư viện component dùng chung)
  - `snippets/portal_header*.bwt`, `snippets/portal_footer*.bwt`
  - `tailwind.pc.config.js`, `ui-src/css/*`
  - `configs/settings_schema.json`, `configs/settings_data.json` (phần dùng chung)
  - Thư mục state cá nhân (`<appDataDir>/scratch/teamwork/<run_id>/.agents/teamwork/fe1_*/`)
  - *CẤM GHI:* Tuyệt đối không chỉnh sửa các file section nghiệp vụ của FE 2 (`snippets/section_*.bwt`, `templates/product*.bwt`, `templates/cart*.bwt`).
- **Quy tắc Kiểm tra Ranh giới Ghi (Pre-Handoff Write Scope Verification via Git Diff - GAP-05):** Trước khi bàn giao nền tảng hoặc nộp review, FE 1 bắt buộc thực thi lệnh `git status --porcelain` và `git diff --name-only <base_branch>...HEAD` để bảo đảm không sửa nhầm các file section của FE 2. Nếu phát hiện vi phạm, lượt bàn giao bị hủy bỏ ngay lập tức.

#### Đầu vào (Inputs):
- `docs/specs/SPEC-<feature-id>.md` từ BA.
- `docs/UI-STANDARD.md`, `Rule&HDKTXD.md`.
- Các yêu cầu Token RFC từ FE 2.

#### Đầu ra (Outputs):
- Cập nhật master layout, design tokens và thư viện `ui_*`.
- File CSS đã biên dịch `assets/pc-ui.css` (đồng bộ qua `build:pc`).
- Các bản review chéo và phản hồi RFC cho FE 2.

#### Tiêu chuẩn Hoàn thành (Definition of Done - DoD của FE 1):
- [ ] `npm run build:pc` exit code 0; `assets/pc-ui.css` được cập nhật sạch sẽ.
- [ ] `node scripts/lint-guardrails.js --strict` PASS (Exit code 0, 0 vi phạm mới so với baseline).
- [ ] `npm run check:libsass` exit code 0; không có lỗi cú pháp SCSS.
- [ ] `npm run lint:config` exit code 0; không có trường cấu hình mồ côi trong schema.
- [ ] Mọi component `ui_*` mới tạo đều có tài liệu hướng dẫn tham số chi tiết.
- [ ] Bảo đảm màu `#3CB371` luôn hiện diện đúng vị trí chủ đạo; không có class lạ ngoài Tailwind.
- [ ] `git diff --name-only` xác nhận 100% thay đổi nằm trong Write Scope của FE 1.

---

### 3.4. Vai trò 3: Frontend Developer 2 (FE 2 - Features, Sections & Pages)

#### Sứ mệnh:
Kỹ sư hiện thực hóa tính năng nghiệp vụ người dùng; trực tiếp lắp ghép các giao diện trang, section, và luồng tương tác thương mại điện tử bằng cách tiêu thụ 100% tiện ích từ thư viện và tokens do FE 1 cung cấp.

#### Nhiệm vụ Cốt lõi:
1. **Triển khai Templates & Sections Nghiệp vụ:**
   - Xây dựng và cập nhật các template URL: `templates/product*.bwt`, `templates/collection*.bwt`, `templates/cart*.bwt`, `templates/blog*.bwt`, `templates/page*.bwt`.
   - Xây dựng các section linh hoạt: `snippets/section_*.bwt`, `snippets/portal_*.bwt`.
2. **Cưỡng chế Tuyệt đối Luật UI-0 & Tiêu thụ Thư viện:**
   - Sử dụng 100% class Tailwind tiện ích (`bg-primary`, `bg-btn`, `bg-card`, `text-heading`...).
   - **CẤM TUYỆT ĐỐI:** Không tự đặt class CSS mới, không viết thẻ `<style>`, không dùng thuộc tính inline `style=""`, không tự ý thêm `@media` truy vấn mới.
   - Bắt buộc gọi các component `snippets/ui_*.bwt` (ví dụ: `{% include 'ui_button', text: '...', variant: 'primary' %}`, `{% include 'ui_icon', name: 'check' %}`). Cấm viết thẻ `<button>` thô hoặc nhúng icon thủ công.
3. **Lập trình DotLiquid An toàn & Phòng thủ (Defensive DotLiquid):**
   - Luôn kiểm tra chuỗi rỗng bằng `!= blank` hoặc `== blank` (ví dụ: `{% if settings.section_title != blank %}`).
   - Không lặp mảng bằng index biến; không dùng `'' | split: ''` để tạo mảng rỗng.
   - Bộ lọc `slice` chỉ dùng ở vị trí cuối cùng, không dùng so sánh Linq.
   - Ảnh bắt buộc qua filter `img_url` nằm trong whitelist 10 kích thước hợp lệ của Sapo; bắt buộc có thuộc tính `alt` riêng, kích thước `width`/`height` tường minh và `loading="lazy"` (trừ ảnh hero/LCP thì preload).
4. **Cấu hình hoá Nội dung (Config-driven Markup):**
   - Mọi tiêu đề, nhãn nút, thông báo đều phải đọc từ `settings.<id>` kèm giá trị dự phòng `| default: "..."`.
   - Không được hardcode bất kỳ chuỗi tiếng Việt nào trực tiếp trong HTML nếu không có fallback cấu hình.
5. **Đảm bảo Trải nghiệm Responsive Mobile-First & Touch Target Chuẩn:**
   - Vùng bấm tương tác trên mobile (touch target) bắt buộc ≥ 44px (`min-h-[44px]`, `min-w-[44px]`), khoảng cách giữa các vùng bấm liền kề ≥ 8px theo tiêu chuẩn `docs/UI-STANDARD.md` (R5, R6). Tuyệt đối không chấp nhận các nút bấm 32px hay 36px.
   - Cỡ chữ trên mobile bắt buộc ≥ 12px (`var(--fs-xs)` hoặc `var(--fs-sm)`); không làm tràn màn hình theo chiều ngang (Zero horizontal overflow).

#### Ranh giới Quyền hạn File (File Access Scope):
- **Quyền Đọc (Read Scope):** Toàn bộ repository.
- **Quyền Ghi (Write Scope):**
  - `templates/*.bwt` (trừ layout master)
  - `snippets/section_*.bwt`, `snippets/product_*.bwt`, `snippets/cart_*.bwt`, `snippets/collection_*.bwt`
  - `data/*.js` (mock data cho dev preview)
  - Thư mục state cá nhân (`<appDataDir>/scratch/teamwork/<run_id>/.agents/teamwork/fe2_*/`)
  - *CẤM GHI:* Tuyệt đối không chỉnh sửa `layouts/theme.bwt`, `snippets/design_tokens.bwt`, `tailwind.pc.config.js`, `ui-src/css/*`.
- **Quy tắc Kiểm tra Ranh giới Ghi (Pre-Handoff Write Scope Verification via Git Diff - GAP-05):** Trước khi nộp yêu cầu review chéo hoặc bàn giao cho Tester, FE 2 bắt buộc chạy `git status --porcelain` và `git diff --name-only <base_branch>...HEAD` xác nhận 100% file thay đổi thuộc các template nghiệp vụ và section. Tuyệt đối không can thiệp vào file của FE 1.

#### Đầu vào (Inputs):
- `docs/specs/SPEC-<feature-id>.md` từ BA.
- Component library `snippets/ui_*.bwt` và Design Tokens từ FE 1.

#### Đầu ra (Outputs):
- Mã nguồn templates và section snippets hoàn thiện, tuân thủ 100% UI-0 và DotLiquid an toàn.
- Yêu cầu Token RFC gửi FE 1 (nếu phát sinh nhu cầu token mới).
- Phiếu yêu cầu Review chéo nộp cho FE 1 kèm Git diff.

#### Tiêu chuẩn Hoàn thành (Definition of Done - DoD của FE 2):
- [ ] `node scripts/lint-guardrails.js --strict` PASS (Exit code 0, 0 vi phạm màu hardcode, 0 inline style, 0 font-size px).
- [ ] `npm run lint:liquid-globals` PASS (100% biến Liquid thuộc 38 Sapo objects hoặc đã khai báo).
- [ ] 0 inline `style=""`, 0 thẻ `<style>`, 100% markup dùng Tailwind hoặc `ui_*`.
- [ ] Preview hiển thị trơn tru, không có rò rỉ cú pháp Liquid (`{{`, `{%`).
- [ ] 100% vùng bấm tương tác mobile đạt tối thiểu 44px (`min-h-[44px] min-w-[44px]`), cỡ chữ ≥ 12px.
- [ ] `git diff --name-only` xác nhận 100% thay đổi nằm trong Write Scope của FE 2.
- [ ] Đạt chứng nhận Approved từ FE 1 trong phiên Review chéo.

---

### 3.5. Vai trò 4: Tester (QA & Integrity Verifier)

#### Sứ mệnh:
Người gác cổng chất lượng độc lập và Kiểm toán viên Pháp y mã nguồn (Forensic Auditor); chịu trách nhiệm kiểm định độc lập, khách quan, xác thực mọi tiêu chí nghiệm thu AC bằng chứng cứ thực thi thực tế trước khi phát hành.

#### Nhiệm vụ Cốt lõi:
1. **Thiết lập Ma trận Kiểm thử Tiêu chí Nghiệm thu (AC Verification Matrix):**
   - Thiết kế các ca kiểm thử bám sát 100% `AC-xxx` trong `SPEC-<feature-id>.md`.
   - Bao phủ ca kiểm thử bình thường (Positive), ca kiểm thử giá trị biên (Boundary), và ca kiểm thử lỗi dữ liệu (Negative/Edge cases).
2. **Thực thi Hệ thống Kiểm định Tự động Toàn diện (Strict Linters):**
   - Chạy và lưu trữ log thực thi của:
     * `node scripts/lint-guardrails.js --strict` (quét vi phạm hex color, px font-size, AI comments; bắt buộc cờ `--strict` để kích hoạt Exit 1 khi có hồi quy so với baseline - GAP-01).
     * `node scripts/compliance-lint.js --fail-on-warn` (quét vi phạm danh xưng Dược và cơ quan y tế; bắt buộc cờ `--fail-on-warn` để biến mọi cảnh báo "Bác sĩ" / "BS." thành Exit 1 - GAP-02).
     * `npm run lint:liquid-globals` (quét biến Liquid bất hợp pháp ngoài 38 Sapo objects).
     * `npm run lint:config` (quét trường cấu hình mồ côi).
     * `npm run check:libsass` (quét tương thích Libsass).
     * `npm run build:sapo` (kiểm tra đóng gói zip Sapo < 5MB).
     * `npm run test:portal` (kiểm tra tương thích portal nếu có).
3. **Thực thi UI Browser Audit Tự động & Soát xét Mắt người Đa Viewport (1440px, 768px/1024px, 390px) & Cưỡng chế Vùng Bấm 44px:**
   - Khởi động môi trường preview và thực thi kiểm định trên 3 nhóm viewport chính:
     * **Desktop 1440px** (1440x900): Kiểm tra căn lề mép trái logo (UI-1.2), độ sắc nét, tương phản màu thương hiệu `#3CB371`.
     * **Tablet 768px** (768x1024) & đối soát responsive 1024px: Kiểm tra lưới grid phân cột `md:` và `lg:`, đảm bảo không vỡ khung layout, không tràn chữ khi xoay ngang/dọc.
     * **Mobile 390px** (390x844): Kiểm tra hiển thị gọn gàng, 0 lỗi tràn ngang (`overflowX: 0`), cỡ chữ ≥ 12px.
   - **Cưỡng chế Đo lường Vùng Bấm ≥ 44px (Strict Touch Target Enforcement):**
     *Lưu ý pháp y:* Script kiểm tra tự động `scripts/audit-ui.js` có thể mang ngưỡng lọc kỹ thuật cũ là `r.height < 32 || r.width < 32`. Tuy nhiên, chuẩn giao diện bắt buộc của Pharma Cosmetics (`docs/UI-STANDARD.md` R5, R6) quy định: **Vùng bấm tương tác mobile bắt buộc ≥ 44px (`min-h-[44px] min-w-[44px]`)**. Tester không được ỷ lại vào exit code của script cũ khi script chỉ lọc < 32px (khiến nút 36px lọt qua); Tester bắt buộc thực hiện kiểm tra với ngưỡng chuẩn `r.height < 44 || r.width < 44` hoặc Playwright assertion chuyên biệt để bảo đảm 100% nút bấm, link CTA và icon tương tác đạt kích thước tối thiểu 44px.
   - Kiểm tra kết quả `test-results/audit-ui/report.json`: Đảm bảo 0 lỗi rách ảnh (`brokenImages: 0`), 0 lỗi tràn ngang (`overflowX: 0`), 0 lỗi rò rỉ Liquid (`liquidLeak: 0`), duy nhất 1 thẻ h1 (`h1Count: 1`), 0 lỗi console (`pageerror: 0`).
4. **Lập Thẻ Lỗi (Defect Tickets) Chuẩn mực & Tái hiện Độc lập (Benny Agent Pattern):**
   - Khi phát hiện sai lệch, Tester không mô tả chung chung mà bắt buộc lập ticket có đầy đủ: URL, viewport, các bước tái hiện (Steps to Reproduce), Kết quả thực tế (Actual), Kết quả mong đợi (Expected theo AC), và ảnh chụp bằng chứng.
   - Gắn thẻ nguyên nhân gốc rễ (Root-Cause Tag) để phân phối đúng vai trò chịu trách nhiệm.
   - **Theo dõi Lỗi Đột biến (Defect Mutation Tracking - GAP-07):** Nếu lỗi phát sinh do tác dụng phụ của lần sửa trước, ghi nhận trường `parent_defect_id: DEFECT-xxx` để liên kết chuỗi lỗi.
5. **Ký duyệt Nghiệm thu Kỹ thuật (Sign-off Authority):**
   - Cấp chứng chỉ PASS/FAIL cho từng AC trong hồ sơ nghiệm thu.
   - Có quyền phủ quyết (VETO) chặn đứng việc phát hành nếu có bất kỳ lỗi Critical hoặc Blocker nào chưa được khắc phục.

#### Ranh giới Quyền hạn File (File Access Scope):
- **Quyền Đọc (Read Scope):** Toàn bộ repository.
- **Quyền Ghi (Write Scope):**
  - `docs/qa/QA-REPORT-<feature-id>.md`
  - `docs/qa/DEFECT-*.md`
  - `docs/acceptance/ACCEPTANCE-*.md`
  - `tests/*`, `test-results/*`
  - Thư mục state cá nhân (`<appDataDir>/scratch/teamwork/<run_id>/.agents/teamwork/tester_*/`)
  - *CẤM GHI:* Tuyệt đối không chỉnh sửa bất kỳ tệp mã nguồn theme nào trong `templates/`, `snippets/`, `layouts/`, `configs/`, `assets/`.
- **Quy tắc Kiểm tra Ranh giới Ghi (Pre-Handoff Write Scope Verification via Git Diff - GAP-05):** Tester bắt buộc chạy `git status --porcelain` và `git diff --name-only <base_branch>...HEAD` bảo đảm 100% thay đổi chỉ nằm trong `docs/qa/*`, `docs/acceptance/*`, `tests/*`, `test-results/*` và thư mục state scratch. CẤM can thiệp vào bất kỳ file theme nào.

#### Đầu vào (Inputs):
- `docs/specs/SPEC-<feature-id>.md` từ BA.
- Gói mã nguồn đã qua Cross-Review từ FE 1 và FE 2 kèm Git commit hash.
- Môi trường chạy thử nghiệm dev preview local.

#### Đầu ra (Outputs):
- Báo cáo kiểm định chất lượng: `docs/qa/QA-REPORT-<feature-id>.md`.
- Các defect tickets (nếu có lỗi).
- Biên bản ký duyệt nghiệm thu: `docs/acceptance/ACCEPTANCE-<feature-id>.md`.
- Artifacts: File log CLI và ảnh chụp màn hình kiểm chứng.

#### Tiêu chuẩn Hoàn thành (Definition of Done - DoD của Tester):
- [ ] 100% AC có trạng thái nghiệm thu kèm bằng chứng liên kết (log/screenshot).
- [ ] `npm run build:sapo` PASS (exit 0, zip < 5MB).
- [ ] `node scripts/lint-guardrails.js --strict` PASS (exit code 0).
- [ ] `node scripts/compliance-lint.js --fail-on-warn` PASS (exit code 0, 0 vi phạm "Bác sĩ", 0 vi phạm "Bộ Y Tế").
- [ ] `npm run audit:ui` và kiểm tra đa viewport PASS trên Desktop 1440px, Tablet 768px/1024px, Mobile 390px (0 critical UI errors, 100% touch targets ≥ 44px).
- [ ] 0 lỗi JavaScript runtime console.
- [ ] `git diff --name-only` xác nhận 100% thay đổi nằm trong Write Scope của Tester.
- [ ] Báo cáo nghiệm thu được ký xác nhận đầy đủ.

---

## CHƯƠNG 4: CHI TIẾT 6 CƠ CHẾ PHỐI HỢP THEN CHỐT

### 4.1. Cơ chế 1: Tương tác & Giao tiếp (Interaction & Communication)

*Ánh xạ Astra Workflow:* Phân định Data Path & Control Path (Mục 1), Quản lý bộ nhớ bền vững (Mục 3.1), Phối hợp bất đồng bộ (Mục 6.6).

Để bảo đảm Gemini 3.8 Flash (Low) không bị phân tán và duy trì sự mạch lạc dài hạn, cơ chế giao tiếp tuân thủ 4 nguyên tắc sắt:

#### 1. Nguyên tắc: Files for Content Delivery — Messages for Coordination
- **Nội dung công việc (Báo cáo, Spec, Diff, Ticket, Test Results):** BẮT BUỘC ghi ra file Markdown có cấu trúc trên ổ đĩa. Tuyệt đối không paste văn bản dài hàng trăm dòng vào tin nhắn chat.
- **Tin nhắn (`send_message`):** CHỈ DÙNG để điều phối, thông báo trạng thái, phát tín hiệu bàn giao và chỉ dẫn đường dẫn file.

#### 2. Cấu trúc Hợp đồng Tin nhắn Bắt buộc (Message Contract):
Mọi tin nhắn gửi qua lại giữa các agent bắt buộc phải tuân theo đúng 4 trường thông tin:
```markdown
**Context**: [Mã tính năng / ID Task / Giai đoạn hiện tại]
**Content**: [Thông điệp súc tích 1-2 câu: Đã hoàn thành bàn giao / Cần review / Phát hiện lỗi]
**File Reference**: [Đường dẫn tuyệt đối hoặc tương đối đến file báo cáo/artifact bàn giao]
**Action Expected**: [Hành động cụ thể mong đợi ở người nhận kèm tiêu chuẩn chấp thuận]
```

#### 3. Nhịp tim Sự sống (Liveness Heartbeat via `progress.md`):
- Mỗi agent cập nhật file `progress.md` trong thư mục state cá nhân ngay sau khi hoàn thành một bước nguyên tử.
- Cấu trúc dòng nhịp tim bắt buộc: `Last visited: [ISO-8601 UTC Timestamp]`.
- Khi chạy lệnh dài (như build zip hoặc audit browser), agent cập nhật nhịp tim trước và sau khi thực thi. Nếu quá 5 phút không có nhịp tim mới, Orchestrator sẽ kích hoạt cơ chế kiểm tra treo (Hang Detection) và can thiệp.

#### 4. Phối hợp Bất đồng bộ Không Polling (Async Reactive Wakeup):
- Nghiêm cấm mọi hình thức chạy vòng lặp sleep (`while sleep`) để chờ tin nhắn của agent khác.
- Sau khi gửi tin nhắn bàn giao, agent kết thúc lượt gọi (yield control) và chuyển sang trạng thái nhàn rỗi (idle).
- Hệ thống Reactive Wakeup sẽ tự động kích hoạt lại agent khi có tin nhắn phản hồi đến hoặc khi một background task hoàn tất.

---

### 4.2. Cơ chế 2: Giao thức bắt tay bàn giao (Handoff Protocols)

*Ánh xạ Astra Workflow:* Bất biến 2 & 5 (Mục 1.1), Máy trạng thái 12 trạng thái (Mục 5.1), Kiểm soát chất lượng bàn giao (Mục 6).

Mọi hoạt động chuyển giao công việc giữa các vai trò đều phải thông qua một **Handoff Report Tự Chứa (Self-Contained Handoff Report)**. Người nhận có thể thực hiện tiếp công việc ngay lập tức mà không cần đặt câu hỏi làm rõ.

#### Cấu trúc Handoff 5 Thành phần Bắt buộc:
1. **Observation (Quan sát thực tế):** Đường dẫn file chính xác, số dòng, hash commit, kết quả lệnh CLI nguyên văn.
2. **Logic Chain (Chuỗi suy luận):** Các bước lập luận logic chặt chẽ dẫn từ quan sát đến giải pháp triển khai.
3. **Caveats (Điểm lưu ý & Rủi ro):** Các vùng mã chưa can thiệp, các giả định kỹ thuật, các trường hợp biên cần lưu tâm.
4. **Conclusion (Kết luận bàn giao):** Tuyên bố dứt khoát về trạng thái hoàn thành và gói bàn giao.
5. **Verification Method (Phương pháp kiểm chứng):** Các câu lệnh CLI cụ thể và đường dẫn file để người nhận tự mình chạy kiểm chứng lại độc lập.

```
+───────────────────────────────────────────────────────────────────────────────────+
|                           4 LƯỢT BẮT TAY BÀN GIAO CHUẨN HOÁ                       |
|                                                                                   |
|  [Khởi tạo Yêu cầu]                                                               |
|         │                                                                         |
|         ▼                                                                         |
|  BẮT TAY 1: BA ──► FE 1 & FE 2                                                    |
|  - Bàn giao: docs/specs/SPEC-<id>.md                                              |
|  - Cổng kiểm tra: 100% AC xác nhận, 0 open questions, settings_schema hợp lệ      |
|         │                                                                         |
|         ▼                                                                         |
|  BẮT TAY 2: FE 1 ──► FE 2                                                         |
|  - Bàn giao: snippets/ui_*.bwt, snippets/design_tokens.bwt, assets/pc-ui.css       |
|  - Cổng kiểm tra: build:pc PASS, check:libsass PASS, docstring props đầy đủ       |
|         │                                                                         |
|         ▼                                                                         |
|  BẮT TAY 3: FE 2 ──► FE 1 (Review chéo) & FE 1+2 ──► Tester                       |
|  - Bàn giao: Git commit hash, diff mã nguồn, IMPLEMENTATION-REPORT.md             |
|  - Cổng kiểm tra: lint:guardrails PASS, lint:liquid-globals PASS, 100% Tailwind   |
|         │                                                                         |
|         ▼                                                                         |
|  BẮT TAY 4: Tester ──► FE (Bug Ticket) hoặc Tester ──► BA & Release (Sign-off)   |
|  - Bàn giao: QA-REPORT.md, DEFECT-*.md, test-results/audit-ui/                     |
|  - Cổng kiểm tra: 100% AC PASS, build:sapo PASS (<5MB), audit:ui PASS             |
+───────────────────────────────────────────────────────────────────────────────────+
```

#### Chi tiết 4 Lượt Bắt tay:

##### Bắt tay 1: BA -> FE 1 & FE 2 (Bàn giao Đặc tả Kỹ thuật)
- **Tài liệu:** `docs/specs/SPEC-<feature-id>.md`.
- **Checklist Cổng Tiếp nhận:**
  - [ ] Mọi AC có ID chuẩn (`AC-001`, `AC-002`...), phân loại rõ `explicit` vs `inferred`.
  - [ ] Ánh xạ chính xác các biến từ 38 Sapo objects, không suy diễn trường ảo.
  - [ ] Schema diffs không gán `default` cho kiểu `collection`/`blog`/`page`/`link_list` và đã vượt qua Early Schema Attribute Validation (GAP-04).
  - [ ] Đạt chuẩn danh xưng Dược ("Chuyên gia", không có "Bác sĩ") và màu `#3CB371`.
  - [ ] Danh sách `open_questions` hoàn toàn rỗng.
  - [ ] `git diff --name-only` xác nhận 100% thay đổi nằm trong Write Scope của BA (GAP-05).

##### Bắt tay 2: FE 1 -> FE 2 (Bàn giao Nền tảng, Tokens & Shared UI)
- **Tài liệu/Mã nguồn:** `snippets/ui_*.bwt`, `snippets/design_tokens.bwt`, `tailwind.pc.config.js`, `assets/pc-ui.css`.
- **Checklist Cổng Tiếp nhận:**
  - [ ] `npm run build:pc` exit code 0; `assets/pc-ui.css` đã biên dịch mới nhất.
  - [ ] `node scripts/lint-guardrails.js --strict` exit code 0 (GAP-01).
  - [ ] `npm run check:libsass` exit code 0; không lỗi tương thích libsass.
  - [ ] Toàn bộ component `ui_*` có docstring mô tả chi tiết các tham số nhận vào.
  - [ ] Token cỡ chữ mới đã được cập nhật vào `design_tokens.bwt`.
  - [ ] `git diff --name-only` xác nhận 100% thay đổi nằm trong Write Scope của FE 1 (GAP-05).

##### Bắt tay 3: FE 2 -> FE 1 (Review chéo) & FE 1+2 -> Tester (Bàn giao Mã nguồn Hoàn tất)
- **Tài liệu/Mã nguồn:** Commit hash trên nhánh làm việc, `docs/handoffs/IMPLEMENTATION-REPORT-<id>.md`.
- **Checklist Cổng Tiếp nhận:**
  - [ ] `node scripts/lint-guardrails.js --strict` PASS (0 lỗi hex color, 0 lỗi px font-size, 0 inline style - GAP-01).
  - [ ] `npm run lint:liquid-globals` PASS (0 biến Liquid ngoài 38 objects).
  - [ ] `npm run lint:config` PASS (0 trường mồ côi trong schema).
  - [ ] 100% class dùng Tailwind tiện ích hoặc `ui_*`, 0 thẻ `<style>`, 0 inline `style=""`.
  - [ ] Mọi hình ảnh có `img_url` whitelist + `alt` riêng + kích thước + `loading="lazy"`.
  - [ ] 100% vùng bấm tương tác mobile đạt ≥ 44px (`min-h-[44px] min-w-[44px]`), cỡ chữ ≥ 12px.
  - [ ] `git diff --name-only` xác nhận 100% thay đổi nằm trong Write Scope của FE 2 (GAP-05).

##### Bắt tay 4: Tester -> FE (Trả lỗi) hoặc Tester -> BA & Release (Nghiệm thu)
- **Tài liệu:** `docs/qa/QA-REPORT-<feature-id>.md` và `docs/acceptance/ACCEPTANCE-<feature-id>.md`.
- **Checklist Cổng Tiếp nhận:**
  - [ ] 100% AC được đối chiếu và xác nhận trạng thái bằng kết quả thực tế.
  - [ ] `node scripts/compliance-lint.js --fail-on-warn` PASS (0 vi phạm "Bác sĩ", 0 vi phạm "Bộ Y Tế" - GAP-02).
  - [ ] `npm run build:sapo` PASS (zip < 5.000.000 bytes, exit code 0).
  - [ ] `npm run audit:ui` PASS trên cả Desktop 1440px, Tablet 768px/1024px, Mobile 390px, 100% touch targets ≥ 44px.
  - [ ] Nếu có lỗi, kèm Defect Ticket đầy đủ thông tin tái hiện, `parent_defect_id` (nếu đột biến) và bằng chứng screenshot.
  - [ ] `git diff --name-only` xác nhận 100% thay đổi nằm trong Write Scope của Tester (GAP-05).

---

### 4.3. Cơ chế 3: Review chéo giữa 2 FE (Cross-Review FE 1 - FE 2)

*Ánh xạ Astra Workflow:* Phân định quyền tài nguyên & Ngăn chặn xung đột đồng thời (Mục 3.3), Rào chắn cứng độc lập (Mục 4.2).

Để giải quyết triệt để điểm yếu của Gemini 3.8 Flash (Low) trong việc tự rà soát mã nguồn, mô hình thiết lập cơ chế kiểm duyệt song song giữa 2 lập trình viên Frontend:

#### 1. Phân định Ranh giới Module: Provider (FE 1) vs Consumer (FE 2):
- **FE 1 (Provider - Tầng Cung ứng):** Độc quyền sở hữu Layout, Design Tokens, cấu hình Tailwind và thư viện `ui_*`.
- **FE 2 (Consumer - Tầng Tiêu thụ):** Độc quyền xây dựng Section và Template nghiệp vụ bằng cách tiêu thụ tài nguyên của FE 1.
- **Ranh giới Bất biến:** FE 2 tuyệt đối không được phép chỉnh sửa các file thuộc quyền sở hữu của FE 1 để "chữa cháy" giao diện. Khi cần token hoặc class mới, FE 2 bắt buộc phải tạo **Yêu cầu Bổ sung Token (Token RFC)** gửi FE 1.

#### 2. Giao thức Yêu cầu Bổ sung Token (Token RFC Protocol):
Khi FE 2 gặp một yêu cầu thiết kế chưa có token hoặc component tương ứng trong thư viện:
1. FE 2 tạo file `docs/specs/RFC-TOKEN-<id>.md` nêu rõ:
   - Tên token / component cần bổ sung.
   - Giá trị đề xuất (theo biến hoặc thang đo UI-STANDARD).
   - Vị trí sử dụng dự kiến trong section.
2. FE 1 tiếp nhận, đánh giá tính tương thích toàn cục. Nếu hợp lệ, FE 1 cập nhật `snippets/design_tokens.bwt` hoặc `snippets/ui_*.bwt`, chạy `npm run build:pc` và phản hồi hoàn tất cho FE 2.

#### 3. Checklist Phê duyệt Review Chéo (Cross-Review Approval Rubric - 5 Tiêu chí):
Trước khi bàn giao mã cho Tester, FE 1 bắt buộc đối soát mã nguồn của FE 2 theo bảng 5 tiêu chí cứng:
- [ ] **Tiêu chí 1 (Tuân thủ UI-0 Tuyệt đối):** Có class CSS tự chế hay không? Có thẻ `<style>` hoặc inline `style=""` không? (Nếu có -> REJECT ngay).
- [ ] **Tiêu chí 2 (Khai thác Thư viện Component):** Nút bấm, thẻ sản phẩm, icon có gọi `ui_button`, `ui_card`, `ui_icon` không? Có tự viết thẻ `<button>` hay chèn thẻ `<i>` Font Awesome thô không?
- [ ] **Tiêu chí 3 (DotLiquid An toàn):** Các câu lệnh điều kiện có dùng `!= blank` không? Có khởi tạo mảng sai quy chuẩn không? Ảnh có filter `img_url` whitelist không?
- [ ] **Tiêu chí 4 (Cấu hình hoá Toàn diện):** Có chuỗi text tiếng Việt nào bị hardcode không? Toàn bộ nhãn có đi kèm `settings.<id> | default:` không?
- [ ] **Tiêu chí 5 (Độ ưu tiên CSS Layering):** Đảm bảo không ghi đè độ ưu tiên của `assets/pc-ui.css`.

**Quyền Phủ quyết (Veto Power):** FE 1 có toàn quyền từ chối phê duyệt (REJECT) nếu FE 2 vi phạm bất kỳ tiêu chí nào trong 5 tiêu chí trên, yêu cầu FE 2 sửa lại kèm chỉ định số dòng cụ thể.

---

### 4.4. Cơ chế 4: Phối hợp BA - FE - Tester xuyên suốt chu trình tính năng (Lifecycle Alignment)

*Ánh xạ Astra Workflow:* Vòng đời tác vụ 12 trạng thái (Mục 5.1), Trích xuất AC từ PRD (Mục 2.5), Bộ kiểm tra chấp nhận kiến trúc E01–E15 (Mục 10.2).

Chu trình phát triển một tính năng mới trải qua 5 chặng phát triển khép kín:

| Chặng | Pha Astra | Hoạt động của BA | Hoạt động của FE 1 & FE 2 | Hoạt động của Tester | Điểm Gating Phê duyệt |
|---|---|---|---|---|---|
| **Chặng 1: Kick-off & Spec** | `INGESTING`<br>`SPECIFYING` | - Bóc tách PRD -> AC.<br>- Thiết kế schema diffs.<br>- Thẩm định thuộc tính schema sớm (GAP-04).<br>- Định nghĩa luật Dược. | - FE 1 rà soát token & component hiện có.<br>- FE 2 đánh giá cấu trúc Liquid template. | - Phân tích AC để chuẩn bị Test Matrix.<br>- Bắt lỗi câu hỏi mơ hồ (E01). | **3-Way Spec Sign-off Gate:** Cả 3 vai trò cùng ký duyệt Spec. CẤM viết mã khi spec chưa khóa. |
| **Chặng 2: Planning & DAG** | `PLANNING`<br>`READY` | - Kiểm tra tính toàn vẹn của kế hoạch.<br>- Duyệt các đề xuất schema. | - FE 1 lập branch, chuẩn bị layout/tokens.<br>- FE 2 lập task breakdown chi tiết.<br>- Xác định read/write scopes. | - Thiết lập môi trường test, chuẩn bị mock data `data/*.js`. | **Plan Schema Validation Gate:** Validator xác nhận DAG không chu trình; cấp quyền tool ghi mã. |
| **Chặng 3: Implementation** | `EXECUTING` | - Thường trực tiếp nhận và giải quyết Mid-flight RFC. | - FE 1 bàn giao components.<br>- FE 2 lắp ghép section.<br>- Tiến hành Cross-Review FE1-FE2. | - Viết sẵn test scripts và kịch bản Playwright. | **Pre-Test Gate:** 100% linters tĩnh (`lint:guardrails --strict`, `lint:config`, `lint:liquid-globals`) PASS. |
| **Chặng 4: Verification** | `VERIFYING` | - Theo dõi tiến độ nghiệm thu từng AC. | - Nhận Defect Tickets và sửa lỗi cục bộ (không sửa lan man). | - Thực thi `audit:ui` (1440/768/390px), `build:sapo`.<br>- Lập Defect Tickets nếu có lỗi. | **QA Clean Sheet Gate:** 100% AC PASS, 0 lỗi blocker/critical, 0 lỗi rò rỉ Liquid. |
| **Chặng 5: Team Acceptance** | `COMPLETED` | - Xác nhận tính năng đáp ứng hoàn hảo nghiệp vụ kinh doanh. | - Chuẩn bị commit Git tiếng Việt có dấu, sẵn sàng nộp PR. | - Xuất bản báo cáo QA toàn diện, đóng dấu xác nhận. | **Triad Final Sign-Off Gate:** Ký biên bản nghiệm thu 3 bên gửi Orchestrator. |

#### Giao thức Làm rõ Giữa chặng (Mid-flight Clarification Protocol - RFC):
Nếu trong quá trình viết mã hoặc kiểm thử, FE/Tester phát hiện tình huống nghiệp vụ chưa được định nghĩa trong Spec:
1. FE/Tester lập file `docs/specs/RFC-<feature-id>-<seq>.md` mô tả tình huống chưa rõ.
2. Gửi tin nhắn ngắn thông báo cho BA.
3. BA thẩm định, đưa ra quyết định chính thức, cập nhật trực tiếp vào `SPEC-<feature-id>.md` và nâng version spec (`v1.1`).
4. **CẤM TUYỆT ĐỐI:** FE không được tự ý "đoán mò" logic hoặc tự bịa ra cách xử lý khi chưa có xác nhận văn bản từ BA.

#### Ma trận Trách nhiệm RACI theo từng Chặng:
*(R: Responsible - Thực hiện, A: Accountable - Chịu trách nhiệm chính, C: Consulted - Tham vấn, I: Informed - Thông báo)*

| Chặng | BA | FE 1 | FE 2 | Tester |
|---|:---:|:---:|:---:|:---:|
| **Chặng 1: Kick-off & Spec** | **A / R** | C | C | C |
| **Chặng 2: Planning & DAG** | A | R | R | C |
| **Chặng 3: Implementation** | C | **A / R** (Core) | **A / R** (Features) | I |
| **Chặng 4: Verification** | I | R (Fix) | R (Fix) | **A / R** |
| **Chặng 5: Team Acceptance** | **A** | R | R | **A** |

---

### 4.5. Cơ chế 5: Vòng lặp phản hồi lỗi & Chống rung giật (Feedback Loops & Oscillation Guard)

*Ánh xạ Astra Workflow:* Benny Agent Pattern (Quản Trị Đội Ngũ AI), Nắp chặn vòng lặp (Mục 8.4), Bảo vệ chống hồi quy (Mục 1.1 - Bất biến 6), Runbook xử lý lỗi (Mục 9).

#### 1. Mô hình Tái hiện Lỗi Độc lập Benny Agent:
Khi phát hiện lỗi hoặc tiếp nhận phản ánh, Tester không chỉ ghi nhận xét mơ hồ mà bắt buộc phải thực thi 4 bước:
1. Xác định chính xác Route / Template URL / Component trên theme.
2. Tái hiện lại lỗi trong môi trường Chromium thật, chụp ảnh màn hình vùng lỗi hoặc xuất console log.
3. Tạo Defect Ticket với các bước tái hiện (Steps to Reproduce) chi tiết đến từng thao tác chuột/bàn phím.
4. Sau khi FE thông báo đã sửa xong, Tester chạy lại chính xác kịch bản tái hiện đó trên nhánh mới để chứng minh lỗi đã được khắc phục hoàn toàn.

#### 2. Cấu trúc Thẻ Lỗi Chuẩn (Defect Ticket Schema - GAP-07):
Mọi lỗi phát hiện bắt buộc lưu tại `docs/qa/DEFECT-<id>.md` theo schema chuẩn:
```markdown
### DEFECT-<id>: [Tiêu đề lỗi súc tích]
- **Mã AC liên quan**: AC-xxx
- **Mã lỗi Cha (Parent Defect ID)**: [none | DEFECT-xxx] (Để liên kết lỗi đột biến / tác dụng phụ)
- **Thế hệ Lỗi Biến thể (Mutation Generation)**: [0 (Gốc) | 1 (Đột biến lần 1) | 2 (Đột biến lần 2)]
- **Mức độ nghiêm trọng**: [BLOCKER | CRITICAL | MAJOR | MINOR]
- **Môi trường & Viewport**: [Desktop 1440px | Tablet 768px/1024px | Mobile 390px | Cả ba]
- **URL / Template**: [Đường dẫn URL kiểm thử]
- **Các bước tái hiện (Steps to Reproduce)**:
  1. Truy cập URL...
  2. Bấm vào nút...
  3. Cuộn đến khối...
- **Kết quả thực tế (Actual Result)**: [Mô tả chi tiết lỗi, số đo px sai lệch, hoặc log lỗi console]
- **Kết quả mong đợi (Expected Result)**: [Mô tả đúng chuẩn theo Spec / UI-STANDARD]
- **Bằng chứng thực nghiệm (Evidence)**: [Đường dẫn file ảnh chụp: test-results/audit-ui/...png hoặc đoạn log lỗi]
- **Root-Cause Tag**: `[SPEC_GAP]` | `[FE1_CORE]` | `[FE2_FEATURE]` | `[DATA_MISSING]` | `[REGRESSION]` | `[ENV_HARNESS_FLAKE]`
```

*Lưu ý tag `[ENV_HARNESS_FLAKE]`*: Dành riêng cho sự cố mạng chậm, browser timeout hoặc dev-server chưa khởi động kịp thời, không tính vào chu kỳ sửa lỗi của lập trình viên.

#### 3. Cơ chế Chống Rung giật (Oscillation Guard - Chống Sửa Quẩn & Theo dõi Lỗi Đột biến - GAP-07):
- **Bản chất vấn đề:** Do reasoning effort thấp, Gemini 3.8 Flash khi sửa một lỗi CSS thường có xu hướng làm hỏng một phần tử khác (Defect Mutation). Nếu Tester đóng ticket cũ và tạo ticket mới với `Cycle Count = 1`, hệ thống có thể lặp vô tận (A -> B -> C -> A) mà không bao giờ kích hoạt Halt.
- **Hệ thống Nắp Chặn Vòng Lặp Kép (Dual-Level Oscillation Guard):**
  1. **Nắp chặn Cấp Ticket (Ticket-Level Cycle Cap ≤ 2):**
     Một defect ticket đơn lẻ chỉ được phép sửa tối đa **2 chu kỳ (Cycle Count ≤ 2)** giữa FE và Tester.
  2. **Nắp chặn Cấp Phiên Tính Năng (Feature Cycle Cap / Session Defect Cap ≤ 3):**
     Tổng số lượt chạy lại kiểm định (Verification Attempts) hoặc tổng số defect tickets phát sinh trong một phiên phát hành tính năng (tính gộp cả các lỗi đột biến liên kết qua `parent_defect_id`) **tuyệt đối không vượt quá 3 lần**. Khi chạm mốc 3 lần xác minh mà tính năng vẫn chưa đạt 100% PASS, hệ thống lập tức kích hoạt HALT.
  3. **Nắp chặn Chuyển Giao Nội Bộ (Internal Bounce Cap ≤ 1):**
     Khi chuyển giao lỗi nội bộ giữa FE 1 và FE 2, chỉ cho phép **tối đa 01 lần chuyển giao**. Nếu cả 2 FE đều từ chối nhận trách nhiệm (FE 2 cho rằng do component của FE 1, FE 1 cho rằng FE 2 truyền props sai), ticket lập tức được đẩy lên BA / Orchestrator phân xử, cấm hiện tượng ping-pong né tránh trách nhiệm.
- **Thẩm quyền Chuyển đổi Trạng thái (Astra Invariant 3 - State Authority):**
  - **Tester đề xuất / gắn cờ (Flag / Propose Halt):** Khi chạm ngưỡng Cap = 2 ở ticket hoặc Cap = 3 ở session, Tester ghi nhận cờ HALT trong báo cáo QA và phát tin nhắn yêu cầu dừng. Tester KHÔNG có quyền tự đổi trạng thái nghiệp vụ của hệ thống.
  - **Orchestrator thực thi (Execute Halt):** **Orchestrator (Control Path)** là thực thể duy nhất có thẩm quyền thực thi chuyển đổi trạng thái hệ thống sang **`DEFECT_TRIAGE_HALT`**:
    * Lập tức đình chỉ quyền ghi mã nguồn của các Workers liên quan.
    * Triệu tập phiên đối soát kỹ thuật khẩn cấp giữa BA, FE 1, FE 2 và Tester.
    * Đánh giá nguyên nhân gốc rễ: Do xung đột CSS kế thừa, do token tính toán sai hay do giới hạn của DotLiquid runtime.
    * Đưa ra giải pháp dứt điểm, cập nhật lại Spec nếu cần, rồi mới cấp quyền mở lại chu kỳ viết mã.

```
                      +-----------------------------+
                      | Tester phát hiện lỗi qua    |
                      | audit:ui / AC verification  |
                      +--------------+--------------+
                                     │
                                     ▼
                      +-----------------------------+
                      | Phân loại Root-Cause Tag    |
                      | [SPEC] / [CORE] / [FEATURE] |
                      +--------------+--------------+
                                     │
                                     ▼
                      +-----------------------------+
                      | Khởi tạo Defect Ticket      |
                      | Liên kết parent_defect_id   |
                      | Ghi log bằng chứng thực tế  |
                      +--------------+--------------+
                                     │
               ┌─────────────────────┼─────────────────────┐
               ▼                     ▼                     ▼
        [Tag: SPEC_GAP]       [Tag: FE1_CORE]       [Tag: FE2_FEATURE]
        Chuyển cho BA         Chuyển cho FE 1       Chuyển cho FE 2
               │                     │                     │
               └─────────────────────┼─────────────────────┘
                                     │
                                     ▼
                      +---------------------------------------+
                      | Đếm chu kỳ sửa (Cycle Count ≤ 2)     |
                      | & Tổng số lần kiểm định session (≤ 3) |
                      +--------------+------------------------+
                                     │
                        ┌────────────┴────────────┐
             Cycle ≤ 2 && Session ≤ 3      Cycle > 2 || Session > 3
                        │                         │
                        ▼                         ▼
            +-----------------------+   +------------------------------------+
            | FE sửa mã nguồn       |   | Tester gắn cờ ĐỀ XUẤT HALT        |
            | Chạy lại linters      |   | Orchestrator CHUYỂN TRẠNG THÁI     |
            | Bàn giao lại Tester   |   | DEFECT_TRIAGE_HALT                 |
            +-----------------------+   | Khóa quyền ghi, họp 3 bên dứt điểm |
                                        +------------------------------------+
```

#### 4. Rào chắn Chống Hồi quy Toàn diện (Full Regression Guard Command Chain):
- Áp dụng Bất biến số 6 của Astra Workflow: **Bất kỳ một thay đổi mã nguồn nào cũng làm mất hiệu lực toàn bộ bằng chứng kiểm thử trước đó.**
- Sau khi FE bàn giao bản sửa lỗi, Tester không chỉ kiểm tra lại đúng con bug đó mà bắt buộc phải chạy lại **Chuỗi Lệnh Kiểm định Hồi quy Toàn diện (Full Regression Command Chain)**:
  ```powershell
  npm run test:portal && node scripts/compliance-lint.js --fail-on-warn && node scripts/lint-guardrails.js --strict && npm run build:sapo && npm run audit:ui
  ```
  Chuỗi lệnh này đảm bảo:
  * Không làm gãy luồng tương tác Home Portal v3 (`test:portal`).
  * Không làm lọt từ ngữ Dược cấm "Bác sĩ" / "BS." (`compliance-lint.js --fail-on-warn`).
  * Không làm lọt mã màu hardcode hoặc cỡ chữ px (`lint:guardrails --strict`).
  * Đóng gói zip theme Sapo < 5MB thành công (`build:sapo`).
  * Giao diện sạch lỗi tràn ngang và rò rỉ mã trên cả Desktop 1440px, Tablet 768px/1024px, Mobile 390px với vùng bấm ≥ 44px (`audit:ui`).

---

### 4.6. Cơ chế 6: Giải quyết xung đột & Quy trình nghiệm thu nhóm (Conflict Resolution & Team Acceptance)

*Ánh xạ Astra Workflow:* Bản ghi xung đột kỹ thuật (Mục 2.4), Tính nguyên tử & Chống ghi đè im lặng E10 (Mục 6.5 & 10.2), Cổng hoàn tất và lưu trữ bằng chứng (Mục 1.1 & 10.1).

#### 1. Ma trận Giải quyết Xung đột (Conflict Resolution Matrix):
Khi xuất hiện bất đồng ý kiến hoặc va chạm kỹ thuật, các bên áp dụng nguyên tắc khách quan dựa trên chứng cứ thực tế:

| Loại Xung đột | Kịch bản Thường gặp | Thẩm quyền & Nguyên tắc Phán quyết | Quy trình Xử lý Chuẩn |
|---|---|---|---|
| **Xung đột Code / Merge** (FE 1 vs FE 2) | Cả 2 FE cùng sửa một file hoặc xung đột class Tailwind trong `assets/pc-ui.css`. | **FE 1 thắng về Kiến trúc & Tokens.** FE 2 thắng về Logic Section. | FE 2 rebase theo nhánh của FE 1. FE 1 cấp bổ sung token/class chuẩn. Chạy lại `npm run build:sapo` để xác nhận. |
| **Xung đột Cấu hình JSON Schema** (`settings_schema.json`) | Cả 2 nhánh cùng bổ sung setting vào cùng một block gây Git conflict cú pháp. | **FE 1 (Kiến trúc sư nền tảng) là vai trò DUY NHẤT có quyền mở file và giải quyết xung đột.** FE 2 chỉ nộp diff đề xuất. | FE 1 thực hiện merge và thẩm định cú pháp JSON cùng luật cấm `default` trên kiểu chọn dữ liệu. FE 2 tuyệt đối không ghi vào schema. |
| **Xung đột Đặc tả Kỹ thuật** (BA vs FE) | BA yêu cầu chức năng vượt quá khả năng của DotLiquid (ví dụ: giỏ hàng tính khuyến mãi lồng nhau phức tạp), FE từ chối làm. | **Sapo Technical Reality & HDKTXD thắng.** Ràng buộc nền tảng là bất khả kháng. | FE dẫn chứng điều khoản trong `Rule&HDKTXD.md` hoặc giới hạn DotLiquid. BA điều chỉnh Spec sang giải pháp khả thi trên Sapo. |
| **Bất đồng Nghiệm thu** (FE vs Tester) | FE cho rằng "lệch 2px là không đáng kể" hoặc nút 36px chấp nhận được, Tester từ chối ký vì vi phạm UI-STANDARD. | **UI-STANDARD (Touch target ≥ 44px) & Script Linters thắng tuyệt đối.** Không có sự châm chước định tính. | Lấy kết quả từ `audit:ui` (ngưỡng 44px) và `lint:guardrails --strict` làm trọng tài. Nếu script báo FAIL, FE bắt buộc phải sửa. |

#### Ghi nhận Xung đột Bất khả kháng (`conflict_record`):
Nếu xảy ra xung đột không thể giải quyết trong phạm vi 4 vai trò, BA có trách nhiệm lập file `docs/specs/CONFLICT-<id>.md` ghi rõ: 2 luồng ý kiến, căn cứ kỹ thuật, rủi ro đối với dự án và tạm dừng nhánh công việc liên quan để leo thang lên Orchestrator / Chủ dự án giải quyết (Astra Section 2.4).

#### 2. Quy trình Nghiệm thu Nhóm Cổng Kiểm định 5 Lớp (5-Layer Team Acceptance Gating):
Trước khi tính năng được đóng gói bàn giao, sản phẩm bắt buộc phải vượt qua 5 cổng kiểm định tuần tự:

```
[MÃ NGUỒN HOÀN TẤT TỪ 2 FE]
         │
         ▼
[CỔNG 1: CẤU HÌNH & SCHEMA] ──► Parse JSON configs, Early Schema Attribute Check, npm run lint:config PASS
         │
         ▼
[CỔNG 2: BẢO VỆ NGUYÊN TẮC]  ──► lint:guardrails --strict, compliance-lint.js --fail-on-warn, lint:liquid-globals PASS
         │
         ▼
[CỔNG 3: ĐÓNG GÓI SAPO]     ──► npm run build:sapo PASS, zip < 5.000.000 bytes, exit code 0
         │
         ▼
[CỔNG 4: UI TRÌNH DUYỆT THẬT]──► npm run audit:ui (1440px, 768px/1024px, 390px) 0 tràn mép, touch targets ≥ 44px
         │
         ▼
[CỔNG 5: NGHIỆM THU TAM GIÁC]──► BA xác nhận 100% AC đạt; FE xác nhận sạch code; Tester cấp chứng chỉ PASS
         │
         ▼
[PHÊ DUYỆT HOÀN THÀNH — READY FOR RELEASE]
```

#### 3. Hồ sơ Ký duyệt Nghiệm thu (Sign-off Dossier):
Biên bản nghiệm thu kỹ thuật lưu vĩnh viễn tại `docs/acceptance/ACCEPTANCE-<feature-id>.md` với chữ ký đồng thuận của cả 4 vai trò (xem mẫu chi tiết tại Phụ lục E).

---

## CHƯƠNG 5: TÍCH HỢP RÀNG BUỘC DỰ ÁN PHARMA COSMETICS SAPO WEB

Toàn bộ hoạt động phối hợp của 4 vai trò phải tuyệt đối tuân thủ 9 ràng buộc dự án bất biến:

### 5.1. Màu Thương hiệu Bất biến: `#3CB371` (UI-BRAND)
- `#3CB371` (MediumSeaGreen) là **MÀU XANH THƯƠNG HIỆU DUY NHẤT** của Pharma Cosmetics (chốt ngày 14/11/2026).
- Bắt buộc áp dụng cho: Topbar (`header_topbar_bg`), nút CTA chính, icon chủ đạo, badge, viền nhấn, màu chủ đạo theme (`theme_main_color`).
- Nghiêm cấm mọi hành vi tự ý đổi màu Topbar hoặc màu chính sang mã màu xanh khác (như Emerald, Teal, ForestGreen).

### 5.2. Chuẩn UI-0: 100% Tailwind Class Tiện ích & Cấu hình Theme
- Toàn bộ markup mới hoặc sửa đổi phải sử dụng 100% class Tailwind (`bg-primary`, `bg-btn`, `bg-card`, `text-heading`...).
- Màu sắc chỉ được phép thay đổi tại Cấu hình theme > Màu sắc.
- Nghiêm cấm tự đặt class CSS mới, cấm thuộc tính inline `style=""`, cấm thẻ `<style>` nội tuyến, cấm thêm truy vấn `@media` mới.
- Cấm dark mode tự động: Neo cứng `:root { color-scheme: light }`.
- Dữ liệu đã có trên Sapo Object thì đọc trực tiếp từ Object, không tạo ô nhập tay trùng lặp.

### 5.3. Chuẩn UI-2.9: Cỡ chữ bằng Biến Thiết kế `var(--fs-*)`
- Mọi thuộc tính `font-size` và shorthand `font:` bắt buộc sử dụng biến token: `var(--fs-xs)`, `var(--fs-sm)`, `var(--fs-base)`, `var(--fs-md)`, `var(--fs-lg)`, `var(--fs-xl)`, `var(--fs-2xl)`, `var(--fs-3xl)` từ `snippets/design_tokens.bwt`.
- Lệnh `npm run lint:guardrails` sẽ kích hoạt lỗi FAIL exit 1 ngay lập tức nếu phát hiện bất kỳ giá trị font-size px, rem, pt nào được ghi cứng trong mã nguồn.

### 5.4. Chuẩn Icon: Font Awesome 6 Free CDN & SVG Nội tuyến (UI-9 & UI-STANDARD R7)
- Hệ thống icon legacy: Sử dụng Font Awesome 6 Free CDN nạp tập trung tại `layouts/theme.bwt` (`fa-solid fa-*` kèm `aria-hidden="true"`). Nghiêm cấm cú pháp cũ (`fas`, `fa fa-`).
- Thành phần giao diện mới (theo `docs/UI-STANDARD.md` R7): Bắt buộc dùng SVG nội tuyến tối ưu qua snippet: `{% include 'ui_icon', name: 'tên-icon' %}` từ `snippets/ui_icon.bwt`. Nghiêm cấm nhúng các đoạn mã SVG tự vẽ lạ ngoài thư viện chuẩn.

### 5.5. Chuẩn Cú pháp DotLiquid Sapo & Danh mục 38 Objects
- DotLiquid chuỗi rỗng `""` được đánh giá là `truthy` ⇒ Luôn dùng `!= blank` hoặc `== blank` trong câu lệnh điều kiện.
- Không gán biến bằng keyword `blank` (`assign x = blank` gây lỗi runtime DotLiquid.Util.Symbol).
- Toàn bộ thẻ `<img>` bắt buộc đi qua filter `img_url` kèm whitelist 10 kích thước hợp lệ của Sapo CDN (`pico`, `icon`, `thumb`, `small`, `compact`, `medium`, `large`, `grande`, `1024x1024`, `2048x2048`), bắt buộc có thuộc tính `alt` riêng, kích thước `width`/`height` tường minh và `loading="lazy"`.
- Duy nhất 01 thẻ `<h1>` trên mỗi trang.
- Mọi biến Liquid sử dụng phải nằm trong danh mục 38 Sapo Objects được kiểm soát bởi `scripts/lint-liquid-globals.js`.

### 5.6. Chuẩn Từ vựng Dược RULE-P0-02 & RULE-P0-06
- **RULE-P0-02:** Bắt buộc dùng danh xưng **"Chuyên gia"**, tuyệt đối KHÔNG dùng "Bác sĩ", "BS.", "DS." trong toàn bộ giao diện và nội dung mẫu.
- **RULE-P0-06:** CẤM nhắc tới cơ quan y tế nhà nước hoặc hàm ý cấp phép chính thức: "Bộ Y Tế", "cấp phép", "chứng nhận y tế", "cơ quan y tế". Giữ nguyên câu chữ pháp lý đã chốt ngày 24/10/2026.

### 5.7. Nguyên tắc Chống Bịa đặt Dữ liệu (Anti-Fabrication & Concrete Verification - GAP-03)
- Tuyệt đối không bịa đặt số liệu thống kê, đánh giá khách hàng 5 sao giả lập (`★`), số lượng % đã bán để giao diện trông "đầy đặn". Nếu tính năng thiếu dữ liệu động từ Sapo, giao diện bắt buộc phải ẩn phần tử hoặc hiển thị trạng thái rỗng hợp lệ (Defensive Liquid: `{% if ... != blank %}`).
- **Bộ Mẫu Regex Quét Tĩnh Cưỡng Chế:**
  Bắt buộc kiểm tra định kỳ bằng công cụ quét regex trên toàn bộ templates/snippets:
  * Đánh giá / sao giả lập: `(★|☆|[0-9](\.[0-9])?\s*(sao|star)|đánh giá\s*\([0-9]+\)|[0-9]+(\.[0-9]+)?\s*\/5)`
  * % Đã bán / số liệu ảo: `(đã bán\s*[0-9]+%?|[0-9]+%\s*đã bán|sold\s*[0-9]+|đã mua\s*[0-9]+)`
  * Số lượng review tĩnh: `([0-9]{2,}\s*đánh giá|[0-9]{2,}\s*nhận xét|[0-9]{2,}\s*reviews?)`
  Mọi xuất hiện của chuỗi tĩnh khớp với các pattern trên mà không đọc từ thuộc tính chuẩn của 38 Sapo Objects đều bị đánh FAIL ngay lập tức (Exit 1).

### 5.8. Quy chuẩn Git Commit Tiếng Việt Có Dấu
- Áp dụng chuẩn Conventional Commits với thông điệp **viết bằng tiếng Việt có dấu** rõ ràng:
  - `feat(storefront-v3): bổ sung section flash sale dược mỹ phẩm`
  - `fix(core-layout): sửa căn lề mép trái logo header trên desktop 1440px`
- Ghi chú giải thích trong code bằng tiếng Việt nêu rõ lý do kèm mã ticket (`REOPEN`, `T-xxx`, `MOPS`).

### 5.9. Sổ tay Tra cứu Các Lệnh Kiểm định Tự động (Command Ledger)

| Lệnh CLI | Mục đích Kiểm định | Tiêu chí Đạt (Pass Criteria) | Vai trò Thực thi |
|---|---|---|---|
| `node -e "JSON.parse(require('fs').readFileSync('configs/settings_schema.json','utf8'))"` | Kiểm tra cú pháp JSON thô của schema cấu hình | Exit code 0, không parse error | BA, FE 1 |
| `node -e "const s = JSON.parse(require('fs').readFileSync('configs/settings_schema.json','utf8')); const noDef = ['collection','blog','page','link_list','snippet','font','image']; let err = 0; s.forEach(b => (b.settings||[]).forEach(f => { if (noDef.includes(f.type) && 'default' in f) { console.error('LỖI: Kiểu ' + f.type + ' (id: ' + f.id + ') cấm có default!'); err++; } })); process.exit(err > 0 ? 1 : 0);"` | **Early Schema Attribute Validation (GAP-04):** Quét cấm thuộc tính `default` trên 7 kiểu dữ liệu chọn | Exit code 0, 0 field vi phạm | BA, FE 1 |
| `npm run lint:config` | Kiểm tra trường mồ côi giữa schema và mã nguồn | Exit code 0, mọi field schema đều được đọc | FE 1, Tester |
| `node scripts/lint-guardrails.js --strict` | **Quét vi phạm nghiêm ngặt (GAP-01):** Bắt buộc `--strict` để Exit 1 khi có hex color lạ, inline `style=""`, px font-size, `!important` | Exit code 0, không tăng vi phạm so với baseline | FE 1, FE 2, Tester |
| `npm run lint:liquid-globals` | Quét biến Liquid không thuộc danh mục 38 Sapo objects | Exit code 0, không có biến mồ côi | FE 2, Tester |
| `npm run check:libsass` | Kiểm tra tính tương thích biên dịch của LIBSASS cho SCSS | Exit code 0, biên dịch SCSS sạch sẽ | FE 1, Tester |
| `node scripts/compliance-lint.js --fail-on-warn` | **Quét tuân thủ Dược nghiêm ngặt (GAP-02):** Bắt buộc `--fail-on-warn` để biến cảnh báo "Bác sĩ" / "BS." thành Exit 1 | Exit code 0, 0 vi phạm "Bác sĩ", 0 vi phạm "Bộ Y Tế" | BA, Tester |
| `git diff --name-only <base_branch>...HEAD` | **Cưỡng chế Ranh giới Ghi (GAP-05):** Kiểm tra tệp sửa đổi so với Write Scope phân công | Exit code 0, 100% file thuộc Write Scope của vai trò | BA, FE 1, FE 2, Tester |
| `npm run preview` & `npm run audit:ui` | Quét UI tự động trên Chromium thật (Desktop 1440px, Tablet 768px/1024px, Mobile 390px); kiểm tra vùng bấm ≥ 44px | Exit code 0, 0 broken images, 0 overflow, 0 liquid leak, touch targets ≥ 44px | Tester |
| `npm run test:portal` | Kiểm tra tính tương thích luồng Home Portal v3 Playwright | Exit code 0, 100% tests passed | Tester |
| `npm run build:sapo` | Biên dịch, quét toàn diện và đóng gói zip theme Sapo | Exit code 0, file zip < 5.000.000 bytes tại exports/ | FE 1, Tester |
| `npm run test:portal && node scripts/compliance-lint.js --fail-on-warn && node scripts/lint-guardrails.js --strict && npm run build:sapo && npm run audit:ui` | **Full Regression Command Chain:** Chuỗi kiểm định hồi quy hợp nhất trước nghiệm thu | Exit code 0 toàn bộ chuỗi lệnh | Tester |

---

## CHƯƠNG 6: KỊCH BẢN VẬN HÀNH MẪU END-TO-END

**Đề bài kịch bản:** Khách hàng yêu cầu bổ sung section mới **"Flash Sale Dược Mỹ Phẩm"** trên Trang chủ (`index.bwt`) với đồng hồ đếm ngược, danh sách sản phẩm giảm giá có nhãn tiết kiệm và nút mua nhanh.

Dưới đây là từng bước vận hành phối hợp thực tế giữa 4 vai trò:

---

### Pha 1: Tiếp nhận Yêu cầu & BA Bóc tách Spec (Trạng thái `INGESTING` -> `SPECIFYING`)
1. **BA khảo sát mã nguồn hiện tại:**
   - Đọc `snippets/home_portal.bwt` để hiểu cơ chế nạp section trang chủ.
   - Đọc `configs/settings_schema.json` để chuẩn bị vùng cấu hình mới.
2. **BA lập tài liệu `docs/specs/SPEC-FEAT-FLASHSALE.md`:**
   - Trích xuất Acceptance Criteria:
     * `AC-FS-001 (explicit)`: Section hiển thị tiêu đề cấu hình được, đồng hồ đếm ngược đếm về 00:00:00.
     * `AC-FS-002 (explicit)`: Hiển thị tối đa 8 sản phẩm lấy từ collection chỉ định trong settings.
     * `AC-FS-003 (inferred)`: Khi collection rỗng hoặc sản phẩm hết hàng, tự động ẩn section (Defensive Liquid).
     * `AC-FS-004 (explicit)`: Màu badge giảm giá và thanh đếm ngược phải dùng mã xanh thương hiệu `#3CB371`.
     * `AC-FS-005 (inferred)`: Vùng bấm nút mua nhanh trên mobile ≥ 44px; cỡ chữ ≥ 12px; không vỡ layout trên tablet 768px.
     * `AC-FS-006 (explicit)`: Danh xưng tư vấn đi kèm (nếu có) phải dùng "Chuyên gia", tuyệt đối không dùng "Bác sĩ".
   - Thiết kế schema diff: Thêm block `flash_sale` vào `settings_schema.json` (kiểu `collection` không có thuộc tính `default`).
   - **BA thẩm định thuộc tính schema sớm (GAP-04):** Chạy lệnh kiểm tra thuộc tính, xác nhận 0 vi phạm thuộc tính `default` trên kiểu `collection`.
   - **BA kiểm tra write scope (GAP-05):** Chạy `git diff --name-only` xác nhận chỉ chạm vào `docs/specs/*`.
3. **BA gửi tin nhắn điều phối:**
   ```markdown
   **Context**: Khởi tạo tính năng Flash Sale Dược Mỹ Phẩm (FEAT-FLASHSALE)
   **Content**: Đã hoàn thành bản đặc tả kỹ thuật và schema diffs hợp lệ. Sẵn sàng cho phiên họp 3-Way Sign-off.
   **File Reference**: docs/specs/SPEC-FEAT-FLASHSALE.md
   **Action Expected**: FE1, FE2 và Tester đọc spec và tham gia phiên ký duyệt Spec Gate.
   ```

---

### Pha 2: Họp 3 Bên & Ký duyệt 3-Way Spec Sign-off (Trạng thái `SPECIFYING` -> `PLANNING`)
1. **FE 1 rà soát:** Xác nhận đã có token `--pc-color-primary: #3CB371`, cần bổ sung component đếm ngược dùng chung `snippets/ui_countdown.bwt`.
2. **FE 2 rà soát:** Xác nhận nguồn dữ liệu đọc từ `collections[settings.flash_sale_collection].products`, kiểm tra cú pháp DotLiquid an toàn.
3. **Tester rà soát:** Thiết lập bảng ma trận kiểm thử cho 6 AC (bao gồm Desktop 1440px, Tablet 768px, Mobile 390px, Touch target 44px), xác nhận không còn câu hỏi mở (`open_questions` rỗng).
4. **Cả 3 bên ký duyệt:** Đánh dấu Spec đạt trạng thái `LOCKED`. Gateway mở quyền cho pha Planning.

---

### Pha 3: FE 1 Triển khai Nền tảng, Tokens & Shared UI (Trạng thái `PLANNING` -> `EXECUTING`)
1. **FE 1 tạo branch làm việc:** `feat/flashsale-core-fe1`.
2. **FE 1 triển khai component nền tảng:**
   - Tạo file `snippets/ui_countdown.bwt` hỗ trợ hiển thị Ngày : Giờ : Phút : Giây, nhận tham số `end_time`.
   - Cập nhật schema diffs vào `configs/settings_schema.json` và giá trị mẫu vào `configs/settings_data.json`.
3. **FE 1 tự kiểm tra (Self-Verification):**
   - Chạy `npm run check:libsass` -> PASS.
   - Chạy `node scripts/lint-guardrails.js --strict` -> PASS.
   - Chạy `npm run lint:config` -> PASS.
   - Chạy `git diff --name-only` -> Xác nhận 100% file thuộc Write Scope của FE 1 (GAP-05).
4. **FE 1 bàn giao cho FE 2 (Bắt tay 2):**
   Gửi tin nhắn kèm đường dẫn `snippets/ui_countdown.bwt` và hướng dẫn gọi props.

---

### Pha 4: FE 2 Triển khai Section & Gửi Review Chéo (Trạng thái `EXECUTING`)
1. **FE 2 tạo branch làm việc:** `feat/flashsale-section-fe2`.
2. **FE 2 viết mã section `snippets/section_flash_sale.bwt`:**
   - Nhúng `ui_countdown`: `{% include 'ui_countdown', end_time: settings.flash_sale_end %}`.
   - Vòng lặp sản phẩm:
     ```liquid
     {% assign fs_col = collections[settings.flash_sale_collection] %}
     {% if fs_col != blank and fs_col.products.size > 0 %}
       <div class="pc-container py-8 bg-card">
         <h2 class="text-heading font-bold" style="font-size: var(--fs-2xl)">
           {{ settings.flash_sale_title | default: 'Flash Sale Dược Mỹ Phẩm' }}
         </h2>
         <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
           {% for product in fs_col.products limit: 8 %}
             {% include 'ui_product_card', product: product %}
           {% endfor %}
         </div>
       </div>
     {% endif %}
     ```
3. **FE 2 chạy pre-check nội bộ:**
   - `npm run lint:liquid-globals` -> PASS.
   - `git diff --name-only` -> Xác nhận 100% file thuộc Write Scope của FE 2 (GAP-05).
4. **FE 2 nộp yêu cầu Review chéo cho FE 1 (Bắt tay 3A).**

---

### Pha 5: FE 1 Review Chéo & Orchestrator Hợp nhất Nhánh (Trạng thái `EXECUTING` - GAP-06)
1. **FE 1 kiểm tra mã của FE 2 theo 5 tiêu chí:**
   - Phát hiện FE 2 viết inline style: `style="font-size: var(--fs-2xl)"` thay vì class Tailwind.
   - FE 1 gửi thông báo từ chối (REJECT): *"Vi phạm tiêu chí UI-0. Hãy dùng class Tailwind `text-2xl` đã được cấu hình ánh xạ tới `var(--fs-2xl)`."*
2. **FE 2 sửa đổi:** Đổi thành `<h2 class="text-heading font-bold text-2xl">`.
3. **FE 1 kiểm tra lại:** 100% đạt chuẩn UI-0. **FE 1 cấp chứng nhận APPROVE trên Ticket Review.**
4. **Orchestrator Merge Authority (GAP-06):** Sau khi FE 1 phê duyệt, **Orchestrator (Control Path)** thực hiện lệnh Git merge nhánh `feat/flashsale-section-fe2` vào nhánh kiểm thử chung `feat/flashsale-integrated`. Điều này bảo đảm tuân thủ nghiêm ngặt ranh giới Write Scope của Worker và Bất biến 3 của Astra (Workers tuyệt đối không có quyền tự ý merge vào các nhánh integration dùng chung).

---

### Pha 6: Tester Kiểm thử Tự động & Bắt lỗi Rung giật (Trạng thái `VERIFYING`)
1. **Tester nhận bàn giao từ Orchestrator & 2 FE:** Khởi động môi trường preview và chạy toàn bộ test suite.
2. **Kết quả kiểm tra tự động:**
   - `node scripts/lint-guardrails.js --strict` -> PASS.
   - `node scripts/compliance-lint.js --fail-on-warn` -> PASS.
   - `npm run build:sapo` -> PASS (zip = 4.210.000 bytes < 5MB).
3. **Thực thi `npm run audit:ui` đa viewport (1440px, 768px, 390px):**
   - Viewport Desktop 1440px -> PASS.
   - Viewport Tablet 768px -> PASS.
   - **Viewport Mobile 390px -> FAIL!**
   - Phát hiện: Khối đồng hồ đếm ngược bị tràn mép ngang màn hình (`overflowX: 18px`), gây vỡ khung container ở 390px.
4. **Tester lập `DEFECT-FS-001`:**
   - Gắn thẻ: `[FE2_FEATURE]`.
   - Mức độ: `CRITICAL`.
   - `parent_defect_id`: `none` (Thế hệ lỗi gốc 0).
   - Đính kèm ảnh chụp màn hình mobile bị cuộn ngang.
5. **FE 2 sửa lỗi (Chu kỳ 1):**
   - FE 2 giảm khoảng cách `gap-4` xuống `gap-2` và thu nhỏ padding trên mobile.
   - FE 2 bàn giao lại.
6. **Tester kiểm tra lại (Chu kỳ 2 - Phát hiện Lỗi Đột biến & Kích hoạt HALT):**
   - Lỗi tràn ngang đã hết, nhưng phát hiện: Cỡ chữ nhãn đếm ngược bị thu nhỏ xuống `10px` (vi phạm chuẩn mobile ≥ 12px) và nút mua nhanh bị bóp méo vùng bấm còn `36px` (vi phạm chuẩn touch target ≥ 44px của `docs/UI-STANDARD.md` R5).
   - **Tester lập `DEFECT-FS-002` (Lỗi đột biến):**
     * `parent_defect_id`: `DEFECT-FS-001` (Mutation Generation 1).
     * Gắn cờ cảnh báo: Lần sửa lỗi trước đã gây ra tác dụng phụ phá vỡ kích thước touch target 44px và cỡ chữ.
   - **KÍCH HOẠT OSCILLATION GUARD!** Số chu kỳ sửa của chuỗi lỗi chạm ngưỡng Cap = 2 và chạm Feature Cycle Cap (Session Defect Cap).
   - **Tester đề xuất dừng khẩn cấp (Flag Halt):** Tester gửi báo cáo QA ghi nhận cờ HALT.
   - **Orchestrator Chuyển trạng thái (GAP-06 & GAP-07):** **Orchestrator (Control Path)** thực thi chuyển trạng thái task sang **`DEFECT_TRIAGE_HALT`**, khóa quyền ghi mã nguồn của FE, dừng khẩn cấp việc code.

---

### Pha 7: Xử lý Bế tắc Kỹ thuật & Sửa dứt điểm (Trạng thái `DEFECT_TRIAGE_HALT` -> `EXECUTING`)
1. **Họp Triage 3 bên:**
   - BA, FE 1, FE 2 và Tester cùng xem xét hiện trạng trên mobile 390px.
   - FE 1 chỉ ra nguyên nhân gốc rễ: Do FE 2 cố ép hiển thị cả 4 ô (Ngày, Giờ, Phút, Giây) trên cùng một hàng ngang chật hẹp nên các ô bị chèn ép co cụm lại, khiến nút bị bóp nhỏ còn 36px.
   - Giải pháp dứt điểm từ FE 1: Thiết kế lại component `ui_countdown` cho phép ẩn ô "Ngày" trên mobile (chỉ hiện Giờ:Phút:Giây) và dùng flex wrap linh hoạt với `min-h-[44px] min-w-[44px]`.
2. **Orchestrator cấp quyền ghi mã (Unfreeze):** Mở lại trạng thái `EXECUTING`.
3. **FE 1 cập nhật `ui_countdown`:** Đảm bảo chữ luôn ≥ 12px (`text-xs`), kích thước vùng bấm đạt chuẩn ≥ 44px.
4. **FE 2 tích hợp lại:** Bố cục thoáng đãng, class Tailwind chuẩn.
5. **Tester kiểm tra lại toàn diện:**
   - Viewport 390px: 0 overflow, font-size = 12px, touch target = 44px.
   - Viewport 768px: Hiển thị 2 cột cân đối, không tràn viền.
   - Viewport 1440px: Giữ nguyên vẻ đẹp hoàn hảo.
   - DEFECT-FS-001 và DEFECT-FS-002 được đóng (CLOSED).

---

### Pha 8: Kiểm định Hồi quy Toàn diện & Nghiệm thu Nhóm (Trạng thái `VERIFYING` -> `COMPLETED`)
1. **Tester chạy Chuỗi Lệnh Kiểm định Hồi quy Toàn diện (Full Regression Command Chain):**
   ```powershell
   npm run test:portal && node scripts/compliance-lint.js --fail-on-warn && node scripts/lint-guardrails.js --strict && npm run build:sapo && npm run audit:ui
   ```
   - Kết quả: 100% GREEN (PASS toàn bộ cả 5 bài kiểm tra).
2. **Đối soát 100% AC:**
   - `AC-FS-001` -> PASS (Đồng hồ đếm ngược mượt mà).
   - `AC-FS-002` -> PASS (Hiển thị đúng 8 sản phẩm flash sale).
   - `AC-FS-003` -> PASS (Ẩn an toàn khi collection rỗng).
   - `AC-FS-004` -> PASS (Màu badge và đồng hồ chuẩn `#3CB371`).
   - `AC-FS-005` -> PASS (Touch target mobile đạt ≥ 44px, chữ đạt ≥ 12px, responsive 768px mượt mà).
   - `AC-FS-006` -> PASS (Không xuất hiện từ "Bác sĩ", danh xưng chuẩn "Chuyên gia", 0 vi phạm Dược).
3. **Xuất bản Biên bản Nghiệm thu `ACCEPTANCE-FEAT-FLASHSALE.md`:**
   - Cả 4 vai trò ký tên xác nhận cam kết chất lượng.
   - **Orchestrator (Control Path)** đóng tính năng, thực hiện nộp Pull Request và merge vào nhánh chính `hugo-theme-sept2026` với thông điệp:
     `feat(home-portal): hoàn tất tích hợp section flash sale dược mỹ phẩm chuẩn astra workflow`.

---

## CHƯƠNG 7: PHỤ LỤC BIỂU MẪU CHUẨN (APPENDICES)

### Phụ lục A: Mẫu Đặc tả Tính năng `docs/specs/SPEC-<id>.md`

```markdown
# ĐẶC TẢ TÍNH NĂNG KỸ THUẬT: [TÊN TÍNH NĂNG]
- **Mã tính năng**: FEAT-xxx
- **Phiên bản Spec**: v1.0
- **Tác giả (BA)**: [Tên BA]
- **Ngày lập**: YYYY-MM-DD
- **Trạng thái**: [DRAFT | LOCKED | COMPLETED]

## 1. Mục tiêu Nghiệp vụ & Phạm vi
[Mô tả mục tiêu kinh doanh, giá trị mang lại cho người dùng storefront Pharma Cosmetics]

## 2. Danh mục Tiêu chí Nghiệm thu (Acceptance Criteria - AC)
| Mã AC | Yêu cầu Kỹ thuật (Statement) | Phân loại | Trạng thái | Phương pháp Kiểm chứng | Kết quả Mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-001 | Topbar hiển thị đúng màu xanh thương hiệu | explicit | confirmed | audit:ui / report.json | Mã hex chính xác #3CB371 |
| AC-002 | Danh xưng hiển thị chuẩn ngành Dược | explicit | confirmed | compliance-lint.js --fail-on-warn | Bắt buộc "Chuyên gia", cấm "Bác sĩ" |
| AC-003 | Vùng bấm tương tác mobile >= 44px, cỡ chữ >= 12px, responsive 768px | inferred | confirmed | audit:ui (390px, 768px) | 100% touch targets >= 44px, 0 overflow |
| AC-004 | Tự động ẩn khi danh mục sản phẩm rỗng (Defensive Liquid) | inferred | confirmed | Test case empty data | Section không render thẻ HTML rỗng |

## 3. Bảng Ánh xạ 38 Sapo Objects
| Tên Trường trên UI | Nguồn Sapo Object | Thuộc tính Object | Xử lý khi Dữ liệu Rỗng (Fallback) |
| :--- | :--- | :--- | :--- |
| Tên sản phẩm | product | product.title | Không hiển thị thẻ rỗng |
| Giá bán khuyến mãi | product | product.price | Ẩn giá nếu là dịch vụ (pc_is_service) |
| Ảnh đại diện | product.featured_image | img_url: 'medium' | Ảnh placeholder chuẩn của theme |

## 4. Thiết kế Schema Diff (`configs/settings_schema.json`)
```json
{
  "name": "Tên khối cấu hình",
  "settings": [
    {
      "type": "text",
      "id": "custom_title",
      "label": "Tiêu đề khối",
      "default": "Tiêu đề mặc định"
    },
    {
      "type": "collection",
      "id": "custom_collection",
      "label": "Chọn danh mục"
    }
  ]
}
```
*(Lưu ý: Các kiểu dữ liệu chọn như collection, blog, page, link_list, snippet, font, image tuyệt đối không có trường "default". Bắt buộc chạy Early Schema Attribute Validation)*

## 5. Câu hỏi Mở & Rủi ro Kỹ thuật (Open Questions)
- [x] Không còn câu hỏi mở. Spec đã sẵn sàng ký duyệt 3-Way Sign-off.
- [x] Đã chạy Early Schema Attribute Validation: 0 vi phạm luật default.
- [x] `git diff --name-only` xác nhận 100% file nằm trong Write Scope của BA.
```

---

### Phụ lục B: Mẫu Yêu cầu Làm rõ / Bổ sung `docs/specs/RFC-<id>.md`

```markdown
# YÊU CẦU LÀM RÕ KỸ THUẬT / BỔ SUNG TOKEN (RFC)
- **Mã RFC**: RFC-xxx
- **Mã tính năng liên quan**: FEAT-xxx
- **Người khởi tạo**: [FE 1 | FE 2 | Tester]
- **Người tiếp nhận**: [BA | FE 1]
- **Ngày tạo**: YYYY-MM-DD
- **Trạng thái**: [PENDING | APPROVED | REJECTED]

## 1. Vấn đề Phát sinh / Nhu cầu Kỹ thuật
[Mô tả chi tiết tình huống biên chưa được định nghĩa trong Spec hoặc token CSS còn thiếu]

## 2. Phương án Đề xuất
- **Phương án 1 (Khuyến nghị)**: [Mô tả chi tiết giải pháp kỹ thuật, token đề xuất]
- **Phương án 2 (Thay thế)**: [Mô tả phương án dự phòng]

## 3. Quyết định Chính thức từ Người tiếp nhận
- **Người phê duyệt**: [BA / FE 1]
- **Nội dung phê duyệt**: [Ghi rõ quyết định cuối cùng và hướng dẫn thực thi]
- **Cập nhật Spec**: Đã cập nhật vào SPEC-<id> phiên bản v1.1 ngày YYYY-MM-DD.
```

---

### Phụ lục C: Mẫu Báo cáo Lỗi `docs/qa/DEFECT-<id>.md` (Bổ sung Defect Mutation Tracking - GAP-07)

```markdown
# BÁO CÁO LỖI KỸ THUẬT (DEFECT TICKET)
- **Mã Ticket**: DEFECT-xxx
- **Mã AC liên quan**: AC-xxx
- **Tính năng**: [Tên tính năng]
- **Mã lỗi Cha (Parent Defect ID)**: [none | DEFECT-xxx] (Để liên kết lỗi đột biến / tác dụng phụ)
- **Thế hệ Lỗi Biến thể (Mutation Generation)**: [0 (Gốc) | 1 (Đột biến lần 1) | 2 (Đột biến lần 2)]
- **Mức độ nghiêm trọng**: [BLOCKER | CRITICAL | MAJOR | MINOR]
- **Môi trường & Viewport**: [Desktop 1440px | Tablet 768px/1024px | Mobile 390px | Tất cả]
- **Đường dẫn URL / Template**: [Ví dụ: /products/kem-duong-pharma]
- **Root-Cause Tag**: `[SPEC_GAP]` | `[FE1_CORE]` | `[FE2_FEATURE]` | `[DATA_MISSING]` | `[REGRESSION]` | `[ENV_HARNESS_FLAKE]`
- **Chu kỳ sửa lỗi (Cycle Count)**: [1 | 2 | >2 -> HALT]
- **Tổng số chu kỳ phiên (Feature Session Attempts)**: [1 | 2 | 3 | >3 -> HALT]

## 1. Các bước Tái hiện Lỗi (Steps to Reproduce)
1. Khởi động môi trường preview local (`npm run preview`).
2. Mở trình duyệt ở kích thước [1440px / 768px / 390px].
3. Truy cập đường dẫn URL...
4. Quan sát thành phần [Tên component]...

## 2. Kết quả Thực tế (Actual Result)
[Mô tả chính xác hành vi sai lệch, kèm số đo px tràn lề, kích thước touch target < 44px, mã lỗi console, hoặc chuỗi leak Liquid]

## 3. Kết quả Mong đợi (Expected Result)
[Mô tả chính xác hành vi đạt chuẩn theo Spec và UI-STANDARD (Touch target >= 44px, chữ >= 12px)]

## 4. Bằng chứng Thực nghiệm (Evidence)
- **Ảnh chụp màn hình**: `test-results/audit-ui/screenshots/defect-xxx.png`
- **Đoạn log console**:
```text
[Dán log lỗi tại đây]
```

## 5. Nhật ký Sửa lỗi & Tái kiểm tra
- **Lần sửa 1**: [FE mô tả cách sửa] -> Tester kiểm tra: [PASS / FAIL] (nếu phát sinh lỗi mới, liên kết Parent Defect ID)
- **Lần sửa 2**: [FE mô tả cách sửa] -> Tester kiểm tra: [PASS / FAIL]
- **Kết luận cuối cùng**: [CLOSED | ĐỀ XUẤT ORCHESTRATOR KÍCH HOẠT DEFECT_TRIAGE_HALT]
```

---

### Phụ lục D: Mẫu Báo cáo Bắt tay Bàn giao `docs/handoffs/HANDOFF-<from>-<to>-<id>.md`

```markdown
# BÁO CÁO BẮT TAY BÀN GIAO (HANDOFF REPORT)
- **Mã Bàn giao**: HANDOFF-xxx
- **Bên bàn giao (From)**: [BA | FE 1 | FE 2 | Tester]
- **Bên tiếp nhận (To)**: [FE 1 | FE 2 | Tester | Release]
- **Mã tính năng**: FEAT-xxx
- **Thời điểm bàn giao**: YYYY-MM-DD HH:mm:ss UTC

## 1. Observation (Quan sát Thực tế)
- **Mã nguồn / Commit Hash**: [commit_hash]
- **Xác nhận Ranh giới Ghi (Write Scope Check - GAP-05)**:
  * Lệnh: `git diff --name-only <base_branch>...HEAD`
  * Kết quả: 100% file thay đổi nằm trọn vẹn trong Write Scope của vai trò.
- **Các file đã can thiệp**:
  * `file/path/1.bwt`: dòng X đến dòng Y
  * `file/path/2.json`: dòng A đến dòng B
- **Kết quả lệnh CLI tự kiểm tra**:
  * `node scripts/lint-guardrails.js --strict`: PASS (exit code 0 - GAP-01)
  * `npm run check:libsass`: PASS (exit code 0)

## 2. Logic Chain (Chuỗi Suy luận)
[Lập luận từng bước giải thích tại sao giải pháp này đáp ứng trọn vẹn yêu cầu trong Spec và giải quyết triệt để vấn đề mà không phá vỡ kiến trúc chung]

## 3. Caveats (Điểm Lưu ý & Vùng Chưa Can thiệp)
- Vùng mã chưa can thiệp: [Liệt kê các module liên quan không sửa đổi trong đợt này]
- Giả định kỹ thuật: [Các điều kiện giả định về dữ liệu mock hoặc cấu hình admin]

## 4. Conclusion (Kết luận Bàn giao)
[Tuyên bố rõ ràng: Gói bàn giao đã sẵn sàng 100% để bên tiếp nhận tiến hành công đoạn tiếp theo]

## 5. Verification Method (Phương pháp Kiểm chứng Độc lập)
Bên tiếp nhận có thể kiểm chứng lại bằng cách chạy các lệnh sau:
```powershell
# 1. Kiểm tra linter nghiêm ngặt
node scripts/lint-guardrails.js --strict

# 2. Kiểm tra tuân thủ Dược
node scripts/compliance-lint.js --fail-on-warn

# 3. Kiểm tra đóng gói
npm run build:sapo
```
```

---

### Phụ lục E: Mẫu Biên bản Nghiệm thu Kỹ thuật `docs/acceptance/ACCEPTANCE-<id>.md`

```markdown
# BIÊN BẢN NGHIỆM THU KỸ THUẬT TÍNH NĂNG (SIGN-OFF DOSSIER)
- **Mã Tính năng**: FEAT-xxx
- **Tên Tính năng**: [Tên tính năng hoàn chỉnh]
- **Mã Commit cuối cùng (Git Hash)**: [commit_hash]
- **Phiên bản Spec cơ sở**: SPEC-<id> v1.0
- **Ngày nghiệm thu**: YYYY-MM-DD
- **Trạng thái**: [APPROVED FOR PRODUCTION]

## 1. Bảng Đối soát 100% Tiêu chí Nghiệm thu (AC Compliance Ledger)
| Mã AC | Tóm tắt Tiêu chí | Trạng thái | Bằng chứng Thực thi (Artifact Reference) | Người Xác nhận |
| :--- | :--- | :---: | :--- | :--- |
| AC-001 | Topbar xanh thương hiệu #3CB371 | PASS | audit-ui/report.json, screenshot-topbar.png | Tester |
| AC-002 | Không dùng từ "Bác sĩ", dùng "Chuyên gia" | PASS | compliance-lint.js --fail-on-warn stdout | Tester |
| AC-003 | Vùng bấm mobile >= 44px, chữ >= 12px, tablet 768px | PASS | audit-ui (390px, 768px screenshots) | Tester |
| AC-004 | Đóng gói zip Sapo < 5.000.000 bytes | PASS | build:sapo stdout (exports/sapo-theme.zip) | Tester |
| AC-005 | Không rò rỉ mã DotLiquid | PASS | audit-ui (liquidLeak: 0) | Tester |
| AC-006 | Vượt qua Full Regression Chain | PASS | test:portal && compliance-lint && guardrails | Tester |

## 2. Kết quả Vượt qua Cổng Kiểm định 5 Lớp
- [x] **Cổng 1 (Cấu hình & Schema)**: JSON parse hợp lệ, Early Schema Attribute Check (0 default trên kiểu chọn dữ liệu), `lint:config` exit code 0.
- [x] **Cổng 2 (Bảo vệ Nguyên tắc)**: `node scripts/lint-guardrails.js --strict`, `node scripts/compliance-lint.js --fail-on-warn`, `lint:liquid-globals`, `check:libsass`, Anti-Fabrication static regex check exit code 0.
- [x] **Cổng 3 (Đóng gói Sapo)**: `build:sapo` exit code 0, dung lượng zip đạt chuẩn < 5MB.
- [x] **Cổng 4 (Trình duyệt UI Thật)**: `npm run test:portal` PASS, `audit:ui` đạt chuẩn trên Desktop 1440px, Tablet 768px/1024px, Mobile 390px với 100% touch targets >= 44px.
- [x] **Cổng 5 (Nghiệm thu Tam giác)**: 3 bên đồng thuận không có lỗi tồn đọng, 0 vi phạm Write Scope.

## 3. Xác nhận Phê duyệt Tam giác Nghiệp vụ (Triad Sign-off)
Bằng việc ký xác nhận dưới đây, cả 4 vai trò cam kết tính năng đã hoàn thiện trọn vẹn, không có sự che giấu lỗi, và sẵn sàng phát hành lên môi trường thực tế:

- [x] **Business Analyst (BA)**:
  * *Xác nhận*: Tính năng phản ánh trung thực 100% yêu cầu nghiệp vụ Dược và trải nghiệm người dùng.
  * *Chữ ký điện tử*: `BA-SIGNED-OFF-20261119`

- [x] **Frontend Developer 1 (FE 1 - Core & Architecture)**:
  * *Xác nhận*: Master layout, tokens, CSS và thư viện dùng chung hoàn toàn ổn định và được bảo vệ.
  * *Chữ ký điện tử*: `FE1-SIGNED-OFF-20261119`

- [x] **Frontend Developer 2 (FE 2 - Features & Sections)**:
  * *Xác nhận*: Mã nguồn tuân thủ 100% UI-0, sạch cú pháp DotLiquid, không có CSS tự chế.
  * *Chữ ký điện tử*: `FE2-SIGNED-OFF-20261119`

- [x] **Lead Tester (QA & Integrity Verifier)**:
  * *Xác nhận*: Đã kiểm chứng độc lập bằng chứng thực nghiệm qua Full Regression Command Chain. Cấp chứng chỉ PASS toàn diện.
  * *Chữ ký điện tử*: `TESTER-SIGNED-OFF-20261119`
```

- [x] **Frontend Developer 2 (FE 2 - Features & Sections)**:
  * *Xác nhận*: Mã nguồn tuân thủ 100% UI-0, sạch cú pháp DotLiquid, không có CSS tự chế.
  * *Chữ ký điện tử*: `FE2-SIGNED-OFF-20261119`

- [x] **Lead Tester (QA & Integrity Verifier)**:
  * *Xác nhận*: Đã kiểm chứng độc lập bằng chứng thực nghiệm. Cấp chứng chỉ PASS toàn diện.
  * *Chữ ký điện tử*: `TESTER-SIGNED-OFF-20261119`
```

---
*Tài liệu Quy trình Làm việc Nhóm này có hiệu lực kể từ ngày ban hành và là kim chỉ nam bắt buộc cho toàn bộ đội ngũ AI Agent phát triển theme Pharma Cosmetics.*
