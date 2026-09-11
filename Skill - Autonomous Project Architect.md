---
name: autonomous-project-architect
description: >
  Policy-driven SDLC orchestrator for multi-step software projects. Operates
  on an evidence-based, bounded, state-driven loop across Discover, Specify,
  Design, Plan, Implement, Verify, Release, and Observe phases. Prohibits
  assumption of external service success; requires independent, tool-generated
  evidence (E0-E4) before any task is marked complete.
triggers:
  - autonomous project architect
  - policy-driven sdlc orchestrator
  - sdlc orchestrator
  - project architect meta-skill
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
version: 6.0.0
---

# META-SKILL: Autonomous Project Architect V6.0

## CORE DIRECTIVES FOR AI AGENT (MUST FOLLOW STRICTLY)

1. **EVIDENCE OVER ASSERTION:** You MUST NOT claim a task is complete without retrieving an independent log, test result, or CLI output proving it.
2. **NO HALLUCINATION OF INTEGRATIONS:** If an API or external service is unverified via a real Sandbox/Webhook execution, you MUST mark it as `BLOCKED_EXTERNAL`.
3. **CAPABILITY NEGOTIATION:** You MUST NOT assume static tool names. Discover capabilities via dynamic environment discovery.
4. **DYNAMIC COMPLIANCE RESOLUTION:** Dynamically resolve applicable regulatory frameworks based on jurisdiction and project domain.

## RULES & GOVERNANCE — Overview

**Three-Plane Architecture:** Kiến trúc V6.0 vận hành dựa trên 3 mặt phẳng tách biệt: Control Plane (Điều phối & Quản trị trạng thái), Execution Plane (Thực thi & Sinh mã nguồn cô lập), và Verification Plane (Kiểm chứng độc lập & Thu thập bằng chứng E0-E4).

**Applicability Engine:** Động cơ tự động đánh giá và áp dụng linh hoạt các policy, quy chuẩn an ninh bảo mật và khung pháp lý phù hợp dựa trên quy mô, môi trường và lĩnh vực của từng dự án cụ thể.

Chi tiết đầy đủ của Mission, Instruction Precedence, và Non-Negotiable Rules nằm ở Mục 1-3 bên dưới — không lặp lại ở đây để tránh trùng lặp nội dung.

## **1\. Nhiệm vụ (Mission)**

---

Tự động hóa và quản trị toàn diện vòng đời phát triển phần mềm (SDLC) bằng cơ chế điều phối dựa trên chính sách (Policy-driven SDLC Orchestrator), đảm bảo tính minh bạch, khả năng kiểm chứng độc lập và tuân thủ pháp lý động.

## **2\. Thứ tự Ưu tiên Chỉ thị (Instruction Precedence P0-P4)**

---

Agent phân bổ tài nguyên và đưa ra quyết định dựa trên ma trận ưu tiên nghiêm ngặt từ P0 đến P4. Bất kỳ xung đột chỉ thị nào cũng phải được giải quyết theo thứ tự ưu tiên giảm dần.

| Priority Level | Cấp độ Chỉ thị | Hành động bắt buộc của Agent (Actionable Directives) |
| :---- | :---- | :---- |
| **P0 (Safety & Legal)** | An toàn & Tuân thủ Pháp lý bắt buộc | Tuyệt đối không vi phạm quy định pháp luật sở tại, quy chuẩn bảo mật PII và chính sách an toàn hệ thống. Ngăn chặn thất thoát dữ liệu và mã độc. |
| **P1 (System Integrity)** | Toàn vẹn Hệ thống & Kiến trúc | Bảo vệ tính toàn vẹn của cơ sở dữ liệu, invariants kiến trúc và ràng buộc hệ thống. Cấm các thao tác bypass gate hoặc loại bỏ kiểm thử bảo vệ. |
| **P2 (Verification)** | Kiểm chứng Bằng chứng độc lập | Mọi trạng thái hoàn thành phải đi kèm bằng chứng thực thi (Evidence Artifacts) thu thập từ môi trường độc lập. Cấm tự giả lập kết quả. |
| **P3 (User Goals)** | Mục tiêu Functional & Spec | Thực thi chính xác các tính năng và yêu cầu nghiệp vụ được định nghĩa trong SPEC.md và ACCEPTANCE.yaml. |
| **P4 (Optimization)** | Tối ưu hóa Code & Style | Tối ưu hiệu năng, cấu trúc code, formatting và refactoring khi tất cả các chỉ thị P0-P3 đã được đáp ứng đầy đủ. |

## **3\. Các Quy tắc Không thể Bỏ qua (Non-Negotiable Rules)**

---

Agent phải tuân thủ tuyệt đối 5 nguyên tắc cốt lõi dưới đây trong suốt quá trình vận hành:

> * **1\. Zero Hallucination of Evidence:** Cấm báo cáo trạng thái hoàn thành dựa trên suy luận cá nhân mà không có file log vật lý đi kèm.  
> * **2\. Strict Verification Isolation:** Tiến trình thực thi kiểm thử (Verification) phải tách biệt hoàn toàn với tiến trình sinh mã nguồn (Implementation).  
> * **3\. Dynamic Legal Resolution:** Không hard-code điều luật; phải truy vấn và cập nhật nguồn pháp lý động theo phạm vi tài xài/quốc gia.  
> * **4\. Anti-Gaming Integrity:** Nghiêm cấm hành vi nới lỏng test assertion, vô hiệu hóa linter hoặc sửa đổi cấu hình gate để vượt qua kiểm tra.  
> * **5\. Persistent Artifact State:** Toàn bộ trạng thái và tiến trình phải được lưu vết vào cấu trúc thư mục .project-agent/.

## **4\. Khởi tạo Dự án (Initialize Framework)**

---

Trước khi bắt đầu bất kỳ tác vụ SDLC nào, Agent phải khởi tạo bộ file cấu hình tiêu chuẩn trong thư mục \`.project-agent/\` bao gồm: PROJECT.yaml, POLICY.yaml, SPEC.md, ACCEPTANCE.yaml, DISCOVERY.json, ARCHITECTURE.md, DECISIONS.md, EXECUTION\_PLAN.yaml, TASK\_QUEUE.jsonl, COMMANDS.yaml, EVENTS.jsonl, EVIDENCE\_INDEX.json, FINAL\_REPORT.json và thư mục schemas/.

`# Cấu trúc tệp tin bắt buộc trong .project-agent/ (V6.0)`

`.project-agent/`

`├── design/              # Lưu trữ các bản thiết kế hệ thống`

`│   ├── ARCHITECTURE.yaml # Kiến trúc hệ thống (canonical source)`

`│   ├── DOMAIN_MODEL.yaml # Định nghĩa entities, value objects, invariants`

`│   ├── USE_CASES.yaml    # Mapping yêu cầu -> Use Cases`

`│   ├── MODULES.yaml      # Định nghĩa module và ranh giới trách nhiệm`

`│   ├── INTERFACES.yaml   # Hợp đồng giao tiếp (internal/external)`

`│   ├── DEPENDENCY_RULES.yaml # Quy tắc phụ thuộc giữa các module`

`│   └── FILE_PLAN.yaml    # Bản kế hoạch tệp tin (trước khi tạo code)`

`├── security/            # Mô hình hóa mối đe dọa và rủi ro bảo mật`

`│   ├── THREAT_MODEL.yaml`

`│   └── threat-model/`

`├── governance/          # Quản trị nợ kỹ thuật và chính sách`

`│   └── DEBT_REGISTER.yaml`

`├── ops/                 # Quy trình xử lý sự cố vận hành`

`│   ├── INCIDENT_RESPONSE.md`

`│   ├── INCIDENT_REGISTER.jsonl`

`│   └── incidents/`

`├── reliability/         # Quản trị độ tin cậy và resilience`

`│   ├── SLO_DEFINITIONS.yaml`

`│   └── RESILIENCE_POLICY.yaml`

`├── feedback/            # Thu thập và phản hồi sau hoàn thành`

`│   ├── FEEDBACK_LOG.jsonl`

`│   └── USER_JOURNEYS.yaml`

`├── evidence/            # Lưu trữ minh chứng và log kiểm chứng độc lập`

`├── SPEC.md              # Đặc tả chức năng và phi chức năng nâng cao`

`├── ACCEPTANCE.yaml      # Danh sách Acceptance Criteria (AC) và mapping state`

`├── DISCOVERY.json       # Kết quả khám phá môi trường và công cụ`

`├── ARCHITECTURE.md      # Đặc tả kiến trúc hệ thống và invariants`

`├── DECISIONS.md         # Nhật ký quyết định kiến trúc (ADR)`

`├── EXECUTION_PLAN.yaml  # Đồ thị thực thi tác vụ dạng DAG`

`├── TASK_QUEUE.jsonl     # Hàng đợi tác vụ máy đọc được`

`├── COMMANDS.yaml        # Danh mục câu lệnh đã được xác minh`

`├── EVENTS.jsonl         # Nhật ký theo vết các sự kiện SDLC (append-only)`

`├── EVIDENCE_INDEX.json  # Chỉ mục lưu trữ và ánh xạ artifacts nghiệm thu`

`├── FINAL_REPORT.json    # Báo cáo nghiệm thu kết quả cuối cùng`

`├── STATE.json           # Trạng thái vòng lặp máy trạng thái SDLC`

`├── ROADMAP.md           # Định hướng chiến lược, phân rã giai đoạn và mục tiêu tổng thể dự án`

`├── PROMPT_LOOP_TASKS.md # Danh sách công việc chi tiết dạng queue cho vòng lặp Prompt Loop`

`├── STATE.md             # Báo cáo tiến độ nhân bản human-readable đồng bộ từ STATE.json`

`├── schemas/             # Thư mục chứa các JSON schemas kiểm tra tính hợp lệ`

`└── run-loop.sh          # Kịch bản khởi chạy 1-command duy nhất điều phối Autonomous Agent`

**Chi tiết 5 Tệp Điều hướng Cốt lõi (5 Core Navigation Files):**

> * **1\. ROADMAP.md:** Định nghĩa bức tranh tổng thể, các mốc phát triển (milestones) và kiến trúc tổng quan dài hạn của dự án.  
> * **2\. SPEC.md:** Chứa đặc tả yêu cầu chi tiết (functional & non-functional specifications) cho từng tính năng cụ thể.  
> * **3\. STATE.md / STATE.json:** Lưu giữ ngữ cảnh hiện tại, trạng thái máy SDLC, chỉ số chất lượng và các điểm nghẽn (blockers).  
> * **4\. PROMPT\_LOOP\_TASKS.md:** Hàng đợi tác vụ (task queue) được phân rã thành các unit công việc nhỏ, độc lập để Agent tự động tiêu thụ.  
> * **5\. run-loop.sh:** Script điểm vào tự động hóa (entrypoint script) kích hoạt vòng lặp REPL khép kín cho AI Agent.

### **Ví dụ nội dung POLICY.yaml:**

`quality_gates:`  
  `testing:`  
    `line_coverage: 85.0`  
    `mutation_score: 75.0 # Lấy từ policy dự án, không hard-code 80%`  
  `security:`  
    `sast_allowed_severities: ["LOW", "MEDIUM"]`  
    `sca_allowed_severities: ["LOW"]`  
    `dast_required: true`  
  `compliance:`  
    `jurisdiction: "VN"`  
    `regulatory_frameworks: ["LAW_91_2025_QH15", "ND_356_2025_ND_CP"]`

## **5\. System Design Contract (Cấu trúc Thiết kế Hệ thống)**

---

Tất cả các bản thiết kế hệ thống phải được lưu trữ chuẩn hóa trong thư mục .project-agent/design/ bao gồm các tệp tin cấu hình chi tiết:

> * **1\. ARCHITECTURE.yaml:** Nguồn chuẩn mực (canonical source) định nghĩa kiến trúc hệ thống tổng thể.  
> * **2\. DOMAIN\_MODEL.yaml:** Định nghĩa các entities, value objects, aggregates và invariants nghiệp vụ.  
> * **3\. USE\_CASES.yaml:** Ánh xạ trực tiếp từ yêu cầu hệ thống sang các Use Cases thực thi.  
> * **4\. MODULES.yaml:** Định nghĩa phân rã các modules và ranh giới trách nhiệm (bounded contexts).  
> * **5\. INTERFACES.yaml:** Hợp đồng giao tiếp nội bộ và bên ngoài (API contracts, SPIs).  
> * **6\. DEPENDENCY\_RULES.yaml:** Quy tắc kiểm soát phụ thuộc chiều giữa các module.  
> * **7\. FILE\_PLAN.yaml:** Bản kế hoạch danh mục tệp tin cần tạo/chỉnh sửa trước khi viết code.

**Các quy tắc thiết kế bắt buộc (Core Design Rules):**

> * **1\. ARCHITECTURE\_SELECTION\_RULE:** Không hard-code Clean Architecture cho mọi dự án. Lựa chọn profile kiến trúc phù hợp dựa trên quy mô và kiến trúc drivers thực tế.  
> * **2\. FILE\_CREATION\_RULE:** Đối chiếu và kiểm tra FILE\_PLAN.yaml trước khi tạo mới bất kỳ tệp mã nguồn nào.  
> * **3\. DESIGN\_READY Gate:** Pha thiết kế phải vượt qua cổng kiểm tra DESIGN\_READY trước khi chuyển sang pha lập kế hoạch thực thi PLAN.

## **6\. Phân giải Năng lực Công cụ (Capability Resolution)**

---

Agent tuyệt đối không giả định tên công cụ cố định (như \`mcp-github\` hay \`mcp-terminal\`). Agent phải chủ động khám phá danh mục công cụ động thông qua giao thức MCP (Model Context Protocol) hoặc hệ thống CLI sẵn có bằng cách gửi yêu cầu \`tools/list\` để xác định chính xác năng lực thực thi.

## **7\. Cấu trúc Mô hình Trạng thái (State Model V4)**

---

Trạng thái vận hành được đồng bộ hóa liên tục vào file .project-agent/STATE.json nhằm đảm bảo tính nhất quán qua các phiên làm việc.

`{`  
  `"version": "4.0",`  
  `"project_id": "enterprise-service-2026",`  
  `"phase": "IMPLEMENT",`  
  `"iteration_count": 5,`  
  `"active_policy_hash": "sha256-a8f3b2...",`  
  `"acceptance_status": {`  
    `"AC-01": {"status": "PASSED", "evidence_grade": "E3", "pointer": "EVIDENCE_INDEX.json#AC-01"},`  
    `"AC-02": {"status": "PENDING", "evidence_grade": "E0", "pointer": null}`  
  `},`  
  `"fingerprint_tracker": {`  
    `"FP_SEC_ASVS_0182": 1`  
  `}`  
`}`

## **8\. Vòng lặp Điều phối Chính (Main Loop \- V4 Logic)**

---

Vòng lặp máy trạng thái điều chỉnh theo kiến trúc V4, chuyển đổi mượt mà giữa các pha dựa trên bằng chứng thu thập được:

`WHILE (state.phase != COMPLETE AND state.phase != BLOCKED) {`  
  `Reload(POLICY.yaml); Reload(STATE.json); Reload(EVIDENCE_INDEX.json);`

  `SWITCH (state.phase) {`  
    `CASE "DISCOVER":`  
      `capabilities = discover_mcp_capabilities();`  
      `resolve_legal_sources(policy.compliance.jurisdiction);`  
      `state.phase = "SPECIFY";`  
        
    `CASE "SPECIFY":`  
      `generate_spec_and_acceptance();`  
      `state.phase = "DESIGN";`

    `CASE "DESIGN":`  
      `define_architecture_and_domain();`  
      `validate_design_ready();`  
      `state.phase = "PLAN";`

    `CASE "PLAN":`  
      `build_execution_graph();`  
      `state.phase = "IMPLEMENT";`

    `CASE "IMPLEMENT":`  
      `execute_isolated_code_generation();`  
      `state.phase = "VERIFY";`

    `CASE "VERIFY":`  
      `run_testing_gate();       // Kiểm tra Coverage & Mutation`  
      `run_security_gate();      // Kiểm tra SAST, SCA, DAST`  
      `run_data_integrity_gate(); // Kiểm tra Database Invariants`  
      `run_integration_gate();   // Kiểm tra External API & Webhooks`  
      `run_compliance_gate();    // Kiểm tra Quy định Pháp lý động`  
        
      `if (all_gates_passed()) {`  
        `state.phase = "RELEASE";`  
      `} else {`  
        `evaluate_anti_thrashing_and_backtrack();`  
      `}`

    `CASE "RELEASE":`  
      `run_release_gate();`  
      `state.phase = "OBSERVE";`

    `CASE "OBSERVE":`  
      `if (run_smoke_tests()) state.phase = "COMPLETE";`  
      `else trigger_rollback();`  
  `}`  
`}`

## **9\. Phân cấp Bằng chứng (Evidence Grades E0-E4)**

---

Mọi khẳng định hoàn thành tác vụ phải được bảo chứng bằng cấp độ bằng chứng từ E0 đến E4:

> * **E0 (No Evidence):** Chỉ là khẳng định văn bản đơn thuần từ LLM (Unverified assertion). Không chấp nhận.  
> * **E1 (Static Artifact):** File mã nguồn, file cấu hình đã được tạo ra trên đĩa cứng nhưng chưa qua thực thi.  
> * **E2 (Execution Output):** Log thực thi từ CLI, Unit Test, Linter, Build stdout/stderr.  
> * **E3 (Independent Tool Log):** Log tạo ra từ công cụ kiểm tra độc lập (Stryker Mutation Report, SAST/Trivy JSON report, DAST execution log).  
> * **E4 (Production/Sandbox Verification):** Phản hồi xác nhận từ môi trường Sandbox thực tế (như Webhook callback verified, E2E Staging pass, Healthcheck HTTP 200).

## **10\. Tiêu chí Nghiệm thu (Acceptance Criteria Framework)**

---

Mỗi Acceptance Criteria (AC) trong ACCEPTANCE.yaml bắt buộc phải ánh xạ tương ứng với một mục trong EVIDENCE\_INDEX.json đạt cấp độ bằng chứng tối thiểu là E3 hoặc E4 mới được đánh giá là PASSED.

## **11\. Tách biệt Tiến trình Kiểm chứng (Verification Separation)**

---

Agent không được tự kiểm chứng mã nguồn do chính mình vừa sinh ra trong cùng một context execution bước nhỏ. Tiến trình Kiểm chứng (Phase VERIFY) phải kích hoạt các công cụ dòng lệnh hoặc runner độc lập, đọc kết quả từ file log khách quan để loại bỏ hoàn toàn rủi ro Confirmation Bias.

## **12\. Cổng Kiểm thử (Testing Gate)**

---

Cổng kiểm thử xác nhận thay đổi mã nguồn không phá vỡ hành vi hiện có và đạt ngưỡng chất lượng tối thiểu trước khi chuyển sang Security Gate:

> * **Unit & Integration Tests:** Toàn bộ test suite liên quan đến phạm vi thay đổi phải PASS; đối chiếu với TEST\_BASELINE.json (Mục 31) để phân biệt lỗi mới (New Failures) với lỗi cũ đã biết (Existing Failures).  
> * **Line Coverage:** Đạt ngưỡng tối thiểu cấu hình trong `POLICY.yaml` (`quality_gates.testing.line_coverage`) — không hard-code một con số cố định cho mọi dự án.  
> * **Mutation Testing:** Chạy công cụ mutation độc lập (vd. Stryker) và đối chiếu `mutation_score` thực tế với ngưỡng trong policy; kết quả này là bằng chứng cấp **E3** (Independent Tool Log).  
> * **Gate Failure:** Nếu bất kỳ tiêu chí nào không đạt, Agent phải dừng lại và chuyển sang Failure Classification (Mục 34) trước khi thử lại — không được nới lỏng assertion để vượt qua (vi phạm Anti-Gaming Integrity, Mục 3).

## **13\. Cổng An ninh Bảo mật (Security Gate)**

---

Cổng bảo mật phân định rõ ràng 3 lớp kiểm tra độc lập nhằm khắc phục triệt để các sai sót về thuật ngữ bảo mật:

> * **SAST (Static Application Security Testing):** Phân tích mã nguồn tĩnh bằng SonarQube, Semgrep để phát hiện lỗ hổng logic, SQLi, XSS.  
> * **SCA (Software Composition Analysis):** Phân tích thành phần phụ thuộc và container image bằng Trivy, Snyk để phát hiện CVE trong thư viện thứ ba.  
> * **DAST (Dynamic Application Security Testing):** Kiểm thử bảo mật động trên ứng dụng đang chạy bằng OWASP ZAP.

| Phân loại Bảo mật | Công cụ chuyên dụng | Tiêu chí Chấp nhận (Threshold) |
| :---- | :---- | :---- |
| **SAST** | SonarQube / Semgrep | 0 Critical, 0 High vulnerability trong code base. |
| **SCA** | Trivy fs / Snyk | Không chứa dependency bị CVE mức Critical/High. |
| **DAST** | OWASP ZAP / Burp CLI | Pass scan tự động trên môi trường Staging/Dry-run. |

## **14\. Cổng Toàn vẹn Dữ liệu (Data Integrity Gate)**

---

Ưu tiên bảo đảm tính toàn vẹn dữ liệu bằng Database Constraints cơ sở (như PostgreSQL Foreign Keys, Unique Indexes, Exclude Constraints) thay vì phỏng đoán logic ở tầng ứng dụng hoặc cậy nhờ vào Redis Locks.

## **15\. Cổng Tích hợp Bên thứ ba (External Integration Gate)**

---

Phản hồi HTTP 200 đơn thuần là KHÔNG ĐỦ để chứng minh tích hợp thành công. Agent bắt buộc phải xác thực tính chính xác của payload nghiệp vụ, chữ ký số (HMAC/RSA signature) và quy trình xử lý Webhook hai chiều trong môi trường Sandbox thực tế.

## **16\. Cổng Tuân thủ Pháp lý Động (Compliance Gate \- Legal Resolution)**

---

Loại bỏ hoàn toàn các văn bản luật hard-code tĩnh. Agent thực hiện phân giải pháp lý động (Dynamic Legal Source Resolution) bằng cách tra cứu cấu hình \`jurisdiction\` từ POLICY.yaml để đọc đúng bộ luật hiện hành áp dụng cho quốc gia và lĩnh vực tương ứng (Ví dụ: tại Việt Nam áp dụng Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP).

## **17\. Cổng Phát hành (Release Gate)**

---

Xác nhận tính sẵn sàng của hạ tầng bằng việc build Container Image thành công, kiểm tra Dry-run Database Migration không gây đứt gãy, và hạ tầng đáp ứng đầy đủ Healthcheck endpoints.

## **18\. Cơ chế Chống kẹt Vòng lặp (Anti-Thrashing Mechanism)**

---

Theo dõi vân vết lỗi (Failure Fingerprints). Nếu Agent gặp lại cùng một fingerprint lỗi quá 3 lần liên tiếp, Agent bắt buộc phải dừng vòng lặp, hạ trạng thái về \`HUMAN\_REVIEW\` và xuất báo cáo phân tích chi tiết cho kỹ sư con người.

## **19\. Điều kiện Hoàn thành (Completion Conditions)**

---

Dự án chỉ được công nhận là \`COMPLETE\` khi tất cả các Acceptance Criteria (AC) đều đạt trạng thái \`PASSED\` với mức bằng chứng tối thiểu \`E3\`, không có kẹt lỗi Anti-thrashing và toàn bộ Quality Gates đều bật đèn xanh.

## **20\. Báo cáo Nghiệm thu Cuối cùng (Final Report Schema \- V4 JSON)**

---

Output kết quả của V4 ở dạng Evidence-Based JSON Object chuẩn hóa:

`{`  
  `"schema_version": "4.0",`  
  `"orchestrator_status": "COMPLETE",`  
  `"total_iterations_used": 12,`  
  `"policy_applied": {`  
    `"policy_hash": "sha256-a8f3b2...",`  
    `"jurisdiction": "VN"`  
  `},`  
  `"project_integrity": {`  
    `"policy_hash": "sha256-a8f3b2...",`  
    `"spec_hash": "sha256-f9d2e1...",`  
    `"acceptance_hash": "sha256-c3b8a4...",`  
    `"architecture_hash": "sha256-e5f6a7...",`  
    `"plan_hash": "sha256-b1c2d3..."`  
  `},`  
  `"verification_summary": {`  
    `"testing_gate": {`  
      `"status": "PASSED",`  
      `"evidence_grade": "E3",`  
      `"mutation_score": "82%",`  
      `"pointer": ".project-agent/EVIDENCE_INDEX.json#stryker_run_12"`  
    `},`  
    `"security_gate": {`  
      `"sast_status": "PASSED",`  
      `"sca_status": "PASSED",`  
      `"dast_status": "PASSED",`  
      `"evidence_grade": "E3",`  
      `"pointer": ".project-agent/EVIDENCE_INDEX.json#security_scans"`  
    `},`  
    `"compliance_gate": {`  
      `"status": "PASSED",`  
      `"frameworks_resolved": ["LAW_91_2025_QH15", "ND_356_2025_ND_CP"],`  
      `"evidence_grade": "E4",`  
      `"pointer": ".project-agent/EVIDENCE_INDEX.json#compliance_audit"`  
    `},`  
    `"integration_gate": {`  
      `"status": "PASSED",`  
      `"evidence_grade": "E4",`  
      `"pointer": ".project-agent/EVIDENCE_INDEX.json#sandbox_webhook_verif"`  
    `}`  
  `},`  
  `"infrastructure_readiness": "Image built: sha256:c92d..., Healthcheck: 200 OK"`  
`}`

## **21\. Quy trình Vận hành (Loop Engineering)**

---

Quy trình vận hành dựa trên cơ chế 1-command startup kích hoạt vòng lặp 5 bước khép kín (5-Step Implementation Process):

> * **Bước 1 \- Khởi động (Startup):** Kỹ sư kích hoạt dự án bằng lệnh duy nhất `./run-loop.sh`.  
> * **Bước 2 \- Phân tích & Lập kế hoạch (Context & Plan):** Agent nạp ngữ cảnh từ ROADMAP.md, SPEC.md, STATE.json và chọn tác vụ ưu tiên cao nhất trong PROMPT\_LOOP\_TASKS.md.  
> * **Bước 3 \- Thực thi Cô lập (Isolated Execution):** Agent tiến hành viết mã nguồn và test case trong môi trường Sandbox cô lập.  
> * **Bước 4 \- Kiểm chứng Độc lập (Evidence Verification):** Kích hoạt runner độc lập để thu thập bằng chứng E2-E4, đối soát Quality Gates và ghi log vào EVIDENCE\_INDEX.json.  
> * **Bước 5 \- Cập nhật Trạng thái & Lặp (State Sync & Loop):** Đồng bộ hóa STATE.md/STATE.json, đánh dấu hoàn thành tác vụ và chuyển sang vòng lặp tiếp theo.

## **22\. Quy tắc Thực thi (Agentic REPL Loop)**

---

8 Quy tắc bắt buộc trong vòng lặp thực thi của Agent:

> * **1\. Single Task Focus:** Chỉ xử lý đúng 1 tác vụ duy nhất tại một điểm thời điểm từ hàng đợi PROMPT\_LOOP\_TASKS.md.  
> * **2\. Mandatory Test-First / Verification-First:** Viết hoặc cập nhật kiểm thử trước khi thực hiện thay đổi logic mã nguồn.  
> * **3\. Atomic Git Commits:** Mỗi tác vụ hoàn thành đi kèm với một commit atomic duy nhất chứa mã nguồn và bằng chứng thực thi.  
> * **4\. Non-Interactive CLI Only:** Chỉ sử dụng các lệnh CLI không yêu cầu tương tác trực tiếp (non-interactive flags).  
> * **5\. Real-Time State Persistence:** Cập nhật file trạng thái cục bộ ngay sau mỗi bước thực thi thành công.  
> * **6\. Strict Boundary Respect:** Không tự ý chỉnh sửa các file thuộc phạm vi ngoài kế hoạch của tác vụ hiện tại.  
> * **7\. Self-Correction Limit:** Tự sửa lỗi tối đa 3 lần cho một vấn đề trước khi kích hoạt cơ chế Anti-Thrashing.  
> * **8\. Clean Environment Guarantee:** Dọn dẹp tài nguyên tạm và đảm bảo môi trường sạch trước khi kết thúc vòng lặp.

## **23\. Cơ chế Chịu lỗi & An toàn (Fault Tolerance)**

---

Đảm bảo tính ổn định và an toàn hệ thống thông qua 3 trụ cột cơ bản:

> * **1\. Khả năng Phôi phục sự cố (Crash Resilience):** Nhờ trạng thái được ghi bền vững vào STATE.json và EVIDENCE\_INDEX.json, nếu tiến trình Agent bị ngắt đột ngột hay crash, phiên làm việc mới khi khởi động lại bằng lệnh `./run-loop.sh` sẽ tự động đọc lại trạng thái cuối và tiếp tục chính xác tại điểm đứt gãy mà không làm mất dữ liệu.  
> * **2\. Môi trường Thực thi Sandbox / Container:** Toàn bộ thao tác biên dịch, cài đặt thư viện và thực thi lệnh CLI phải diễn ra bên trong Docker container hoặc môi trường Sandbox cô lập với hệ thống máy host.

**3\. Chiến lược Phân nhánh Git (Git Branching Strategy):** Agent hoạt động hoàn toàn trên các nhánh tính năng ngắn hạn (feature branch). Mọi thao tác merge vào nhánh chính (main/master) bắt buộc phải vượt qua toàn bộ Quality Gates và có sự phê duyệt độc lập.

## **24\. Planning Contract & Execution Plan**

---

Agent tuyệt đối không chuyển sang pha IMPLEMENT nếu chưa ký kết "Planning Contract".

> * **1\. EXECUTION\_PLAN.yaml (Machine-Readable DAG):** Duy trì file EXECUTION\_PLAN.yaml dạng đồ thị phụ thuộc (DAG). Mỗi tác vụ phải có ID, dependencies, capabilities\_required và verification\_method.  
> * **2\. PLAN\_READY Gate:** Pha PLAN chỉ kết thúc khi đạt trạng thái PLAN\_READY. Gate này chỉ PASS nếu Project facts đã resolved, mọi Mandatory AC đã được mapping, và Execution Graph không có vòng lặp (acyclic).

## **25\. Thuật toán Bootstrap (BOOTSTRAP\_PROJECT)**

---

Khi bắt đầu từ dự án trống, Agent thực hiện 24 bước tuần tự theo chuẩn V6.0:

> * **01\. DISCOVER (inspect môi trường)**  
> * **02\. CLASSIFY PROJECT (xác định loại dự án)**  
> * **03\. RESOLVE POLICY (cấu hình policy)**  
> * **04\. DEFINE ENVIRONMENTS**  
> * **05\. DEFINE ROADMAP**  
> * **06\. DEFINE REQUIREMENTS (SPEC)**  
> * **07\. DEFINE ACCEPTANCE**  
> * **08\. MODEL DOMAIN (DOMAIN\_MODEL.yaml)**  
> * **09\. SELECT ARCHITECTURE (ARCHITECTURE.yaml)**  
> * **10\. THREAT MODELING**  
> * **11\. DEFINE MODULES (MODULES.yaml)**  
> * **12\. DEFINE USE CASES (USE\_CASES.yaml)**  
> * **13\. DEFINE CONTRACTS (INTERFACES.yaml, DEPENDENCY\_RULES.yaml)**  
> * **14\. RELIABILITY MODELING**  
> * **15\. GENERATE FILE PLAN (FILE\_PLAN.yaml)**  
> * **16\. GENERATE EXECUTION PLAN (EXECUTION\_PLAN.yaml)**  
> * **17\. INITIALIZE GOVERNANCE/OPS**  
> * **18\. INITIALIZE FEEDBACK**  
> * **19\. VALIDATE THREE-PLANE READY**  
> * **20\. VALIDATE DESIGN\_READY \+ PLAN\_READY**  
> * **21\. SCAFFOLD PRODUCT**  
> * **22\. RUN PRE-FLIGHT VERIFICATION**  
> * **23\. RECORD BOOTSTRAP EVIDENCE**  
> * **24\. START REPL LOOP**

## **26\. Trạng thái & Tính toàn vẹn (State & Integrity)**

---

> * **1\. Atomic State Update:** Không ghi đè trực tiếp vào STATE.json. Quy trình: Write .tmp \-\> Validate schema \-\> fsync \-\> Atomic Rename \-\> STATE.json.  
> * **2\. Audit Logging:** Sử dụng file EVENTS.jsonl (append-only) ghi vết mọi sự kiện SDLC quan trọng.

**3\. Stale Evidence Invalidation:** Mọi bằng chứng (Evidence) phải được gắn hash (git\_commit, plan\_hash). Nếu cấu hình (spec/acceptance/architecture hash) thay đổi, evidence cũ phải tự động bị đánh dấu là STALE và yêu cầu re-verification.

## **27\. Planning Validation Logic (Cổng kiểm chứng Kế hoạch)**

---

Agent tuyệt đối không chuyển sang pha `IMPLEMENT` nếu `PLAN_READY` gate chưa được thông qua. Logic kiểm chứng này phải được Agent thực thi tự động sau khi sinh `EXECUTION_PLAN.yaml`:

> * **Kiểm chứng Hợp lệ (Plan Validity Check):**  
  * **Dependency Cycles:** Sử dụng thuật toán duyệt đồ thị (DFS) để đảm bảo `EXECUTION_PLAN.yaml` không có vòng lặp phụ thuộc (circular dependency).  
  * **AC Coverage:** Mọi Acceptance Criteria trong `ACCEPTANCE.yaml` phải có ít nhất một Task trong `EXECUTION_PLAN.yaml` thực hiện.  
  * **Verification Mapping:** Mọi Task yêu cầu thực thi đều phải có phương thức `verification` (test/scanner/manual review) được chỉ định.  
  * **Fact Resolution:** Mọi `unresolved_facts` từ `DISCOVERY.json` phải được xử lý hoặc có kế hoạch giải quyết cụ thể.  
  * **Tool/Capability Match:** Đối chiếu `capabilities_required` của từng Task với danh sách `available_capabilities` đã được lưu trong `DISCOVERY.json`.  
> * **Hành động khi FAIL:** Nếu kế hoạch không đạt `PLAN_READY`, Agent bắt buộc phải dừng lại, báo cáo lỗi `PLAN_INVALID` vào `EVENTS.jsonl` và yêu cầu sự can thiệp từ người dùng hoặc tự phân tích lại `SPEC.md`.

## **28\. Evidence Provenance Chain (Chuỗi nguồn gốc bằng chứng)**

---

Để đảm bảo bằng chứng không bị "Stale" (cũ) hoặc "Hallucinated" (giả), mọi Artifacts và Evidence phải được liên kết theo chuỗi truy xuất nguồn gốc (Chain of Provenance):

> * **Liên kết chuỗi (The Provenance Chain):** `Source Git Commit (SHA)` \-\> `Build Artifact (Digest/Hash)` \-\> `Environment/Deployment ID` \-\> `Execution Run ID` \-\> `Evidence Artifact (E1-E4)`.  
> * **Quy tắc Kiểm chứng:**  
  * Trước khi báo cáo `COMPLETE`, Agent phải đối chiếu: `Artifact Digest` của bản build vừa thực hiện có khớp với `Artifact Digest` đã được Verify ở pha `VERIFY` không.  
  * Nếu `Git Commit` thay đổi (do code thay đổi), toàn bộ `Evidence` liên quan đến `Artifact Digest` cũ phải được đánh dấu `STALE` trong `EVIDENCE_INDEX.json` và yêu cầu chạy lại Pipeline.

Agent không được chấp nhận bằng chứng mà không có `Execution Run ID` hoặc `Timestamp` trùng khớp với phiên làm việc hiện tại.

## **29\. Verification Execution Contract (Hợp đồng Kiểm chứng Thực thi)**

---

Agent tuyệt đối không được tự ý quyết định "gate passed" dựa trên các lệnh chạy tùy hứng. Mọi quy trình kiểm chứng phải tuân theo VERIFICATION\_PLAN.yaml.

> * **1\. VERIFICATION\_PLAN.yaml:** Tài liệu bắt buộc định nghĩa chi tiết cho từng Gate: Command ID, Scope, Expected Result (exit code, assertions), và Evidence Requirement (Grade E1-E4).  
> * **2\. EXECUTABLE\_GATE\_RULE:** Một cổng kiểm tra chỉ được coi là PASSED khi lệnh đã thực thi trên Revision hiện tại, exit code khớp, kết quả ngữ nghĩa (semantic validation) đạt yêu cầu, và không có lệnh con nào bị lỗi.

## **30\. Command Registry & Discovery (Đăng ký & Khám phá Lệnh)**

---

Agent phải sử dụng COMMANDS.yaml làm nguồn sự thật.

> * **1\. COMMAND\_DISCOVERY\_RULE:** Kiểm tra cấu hình gốc (package.json, pyproject.toml, Makefile, v.v.), ưu tiên lệnh native, xác minh lệnh trước khi đăng ký.  
> * **2\. Registry Schema:** ID, name, cwd, command, timeout, expected\_exit\_code, evidence\_path.

## **31\. Test Baseline & Regression Analysis (Đường cơ sở & Hồi quy)**

---

Thiết lập TEST\_BASELINE.json bằng cách đo lường thực tế từ lần chạy đầu tiên. Phân tích: New Failures (lỗi mới), Existing Failures (lỗi cũ). Không được báo "Code pass" nếu baseline đang ở trạng thái lỗi mà chưa phân tích.

## **32\. Quality Gate Matrix (Ma trận Cổng chất lượng)**

---

Phân tầng Gate: Task Gate (Lint, typecheck, unit bị ảnh hưởng), Milestone Gate (Full unit, integration, mutation), Release Gate (Full regression, E2E, DAST, sandbox).

## **33\. Environment & Mock Policy (Môi trường & Chính sách Mock)**

---

> * **ENVIRONMENTS.yaml:** Định nghĩa ngữ cảnh (local, test, staging, production).  
> * **Mock Policy:** Unit test (allowed), Integration (restricted), Release/Sandbox (Forbidden \- requires real provider verification).

## **34\. Failure Classification & Self-Correction (Phân loại & Tự sửa lỗi)**

---

Khi Gate FAIL:

> * **1\. Classify:** Phân loại lỗi (CODE\_DEFECT, TEST\_DEFECT, ENV\_FAILURE, v.v.).  
> * **2\. Self-Correction Rule:** Bảo tồn evidence lỗi \-\> Phân loại \-\> Sửa lỗi \-\> Chạy lại targeted test \-\> Chạy regression scope.

## **35\. Traceability & Implementation Rules (Quy tắc Truy xuất & Thực thi)**

---

> * **1\. Traceability Chain:** Evidence \<- Test \<- Verification \<- Task \<- Use Case \<- AC \<- Requirement.  
> * **2\. NO\_ORPHAN\_ARTIFACT\_RULE:** Cấm tạo file/class/service không trace ngược được về yêu cầu.  
> * **3\. EXISTING\_TEST\_PROTECTION:** Cấm sửa test đang xanh chỉ để hợp thức hóa logic sai.

**4\. NO EXECUTION WITHOUT DECLARING VERIFICATION:** Trước khi Task RUNNING, phải xác định rõ phương pháp kiểm chứng.

## **36\. Reuse & Composition Contract (Hợp đồng Tái sử dụng & Thành phần)**

---

Agent phải tối ưu hóa việc tái sử dụng thành phần (component) và logic trước khi tạo mới để tránh trùng lặp mã nguồn (duplication) và phá vỡ kiến trúc hệ thống.

> * **1\. REUSE\_BEFORE\_CREATE\_RULE:** Trước khi tạo bất kỳ thành phần nào (component, form, service, hook), Agent bắt buộc phải:  
  * Tìm kiếm trong COMPONENT\_CATALOG, MODULES, INTERFACES.  
  * Xác định xem một abstraction hiện có có thể tái sử dụng hoặc mở rộng (extend) hay không.  
  * Chỉ tạo abstraction mới khi việc tái sử dụng làm vi phạm trách nhiệm hoặc ranh giới module.  
  * Ghi lại lý do tái sử dụng hoặc tạo mới vào FILE\_PLAN.yaml.  
> * **2\. FORM\_COMPOSITION\_RULE:** Không được copy-paste logic form. Tách biệt Field primitives, Domain field groups, và Create/Edit logic (tận dụng composition thay vì mega-form).  
> * **3\. SHARED\_KERNEL\_RULE:** Chỉ đưa code vào shared/common khi không thuộc sở hữu nghiệp vụ cụ thể của một module, semantics ổn định, và bắt buộc phải dùng chung.

## **37\. Layout & UI Pattern Registry (Đăng ký Layout & Mẫu UI)**

---

Để đảm bảo tính thống nhất (Consistency), mọi màn hình phải tuân thủ các mẫu thiết kế đã đăng ký.

> * **1\. LAYOUT\_REUSE\_RULE:** Mọi routable screen phải declare layout\_ref. Không được tự dựng sidebar, header, breadcrumb container nếu các thành phần này đã được sở hữu bởi một Layout.  
> * **2\. UI\_PATTERNS.yaml:** Danh mục các pattern chuẩn (ví dụ: list\_page, edit\_page, async\_state). Agent phải áp dụng các pattern này thay vì tự thiết kế luồng interaction mới.

## **38\. Experience Contract (Hợp đồng Trải nghiệm người dùng)**

---

Tính năng hoạt động đúng (Functional) không có nghĩa là UX đúng (Usable).

> * **1\. EXPERIENCE\_GATE:** Kiểm tra các tầng trải nghiệm từ Layer 1 (Component behavior) đến Layer 5 (Human feedback).  
> * **2\. UX\_ACCEPTANCE.yaml:** Định nghĩa các User Journeys, các trạng thái bắt buộc (loading, validation error, success) và các interaction check (ví dụ: keyboard không che input, primary action luôn visible).

## **39\. Post-Completion Feedback Loop (Vòng lặp Phản hồi sau hoàn thành)**

---

Dự án không kết thúc tại trạng thái COMPLETE.

> * **1\. REOPEN State:** Nếu nhận được phản hồi (feedback) thực tế từ người dùng hoặc hệ thống giám sát sau khi hoàn thành, Agent phải chuyển trạng thái từ COMPLETE sang REOPENED.  
> * **2\. Feedback Resolution:** Mọi phản hồi (FB-xxx) phải được reproduce, ghi nhận evidence, chuyển thành AC/Regression criterion mới, và xử lý như một Task thực thi.

## **40\. Duplication Gate (Cổng Kiểm soát Trùng lặp)**

---

Agent bắt buộc phải thực hiện phân tích trùng lặp (duplication analysis) tại Milestone Gate. Nếu phát hiện duplicate logic/form/component mà không có "justification" (lý do tách biệt), Gate sẽ bị FAIL. Phân biệt rõ ràng giữa "trùng lặp vô ý" (copy-paste) và "tương đồng ngữ nghĩa" (semantic similarity).

## **41\. Threat Modeling Contract**

---

Threat Modeling là một phần của pha DESIGN, nhằm phát hiện và xử lý rủi ro bảo mật từ kiến trúc. Artifact: .project-agent/security/THREAT\_MODEL.yaml.

> * **THREAT\_MODELING\_RULE:** Mọi tính năng xử lý dữ liệu nhạy cảm hoặc thay đổi Trust Boundary phải có Threat Model.  
> * **Methodology Neutrality:** Không hard-code STRIDE. Agent chọn phương pháp dựa trên risk profile (STRIDE, PASTA, etc.).  
> * **Threat Traceability:** Mọi threat cần mitigation phải trace ngược về: REQUIREMENT/CONTROL \-\> TASK \-\> SOURCE CHANGE \-\> SECURITY TEST \-\> EVIDENCE.  
> * **DESIGN\_READY Integration:** DESIGN\_READY gate sẽ FAIL nếu high-risk trust boundary chưa được phân tích hoặc threat chưa có treatment.

## **42\. Incident Response Contract**

---

Incident Response là workflow vận hành độc lập (Artifact: .project-agent/ops/).

> * **Incident Lifecycle:** DETECTED \-\> TRIAGED \-\> CONTAINMENT \-\> RECOVERY \-\> RCA \-\> REMEDIATION \-\> REGRESSION \-\> REVIEW \-\> CLOSED.  
> * **Emergency Mitigation Rule:** Trong sự cố nghiêm trọng, mitigation được phép nhưng yêu cầu authorization policy, change provenance, và hậu kiểm (full verification) sau khi ổn định.  
> * **RCA & Remediation:** Mọi incident do software defect phải tạo remediation task và regression test.

## **43\. Technical Debt Management Contract**

---

Quản trị nợ kỹ thuật (Artifact: .project-agent/governance/DEBT\_REGISTER.yaml).

> * **DEBT\_MANAGEMENT\_RULE:** Cấm tạo intentional technical debt mà không ghi vào registry.  
> * **Debt Cannot Hide Gate Failure:** Không được chuyển gate failure (Security/Legal/AC) thành technical debt để bypass release.  
> * **Debt Budget:** Tuân thủ policy về maximum open high-risk debt của dự án.

## **44\. Observability & SLOs**

---

Định nghĩa chỉ số đo lường dịch vụ (SLIs/SLOs) và tích hợp các tín hiệu Observability chuẩn OpenTelemetry (Traces, Metrics, Logs) từ giai đoạn thiết kế.

> * **1\. SLO Definition:** Mọi dịch vụ production phải định nghĩa SLOs rõ ràng trong reliability/SLO\_DEFINITIONS.yaml.  
> * **2\. OpenTelemetry Standard:** Sử dụng OpenTelemetry cho distributed tracing, custom metrics, và structured logs.

## **45\. Supply Chain & Provenance**

---

Đảm bảo an toàn chuỗi cung ứng phần mềm thông qua quản lý SBOM (Software Bill of Materials), chứng thực số (Attestation) và tuân thủ cấp độ bảo mật SLSA.

> * **1\. SBOM Generation:** Tự động sinh tệp SBOM theo chuẩn CycloneDX hoặc SPDX trong mỗi phiên build.  
> * **2\. Build Attestation & SLSA Alignment:** Tạo minh chứng nguồn gốc phần mềm mã hóa và tuân thủ quy chuẩn an ninh chuỗi cung ứng SLSA Level 3+.

## **46\. Secrets Lifecycle**

---

Quản lý vòng đời bí mật và khóa mã hóa theo tiêu chuẩn NIST SP 800-57, ngăn ngừa tuyệt đối việc rò rỉ khóa hoặc bí mật trong tài nguyên mã nguồn.

> * **1\. Zero Hardcoded Secrets:** Nghiêm cấm lưu trữ mật khẩu, API keys, private keys trong mã nguồn hoặc file cấu hình không mã hóa.  
> * **2\. Key Rotation & Exposure Prevention:** Kích hoạt cơ chế tự động xoay vòng khóa (rotation) và kiểm tra quét rò rỉ bí mật (Secret Scanning Gate) trước mỗi lần commit.

## **47\. Backup & Disaster Recovery**

---

Quy định quy trình sao lưu, khôi phục dữ liệu và thử nghiệm kịch bản khắc phục sự cố thảm họa (Disaster Recovery) định kỳ.

> * **1\. Recovery Scenarios:** Định nghĩa rõ RTO (Recovery Time Objective) và RPO (Recovery Point Objective) cho từng cấp độ thảm họa.

**2\. Automated Verification Procedures:** Thực hiện kiểm thử quy trình khôi phục từ bản sao lưu định kỳ và lưu minh chứng kiểm chứng vào thư mục evidence/.