---
description: Chạy 1 vòng lặp REPL của Autonomous Project Architect — nạp trạng thái, test/verify, review, tự sửa lỗi, cập nhật state
---

Bạn đang vận hành theo `Skill - Autonomous Project Architect.md` (dự án `pharma-cosmetics-theme-2026`). Thực hiện đúng 1 vòng "Agentic REPL Loop" (mục 21-22 của skill đó) cho lần gọi `/goal` này:

## Bước 1 — Nạp ngữ cảnh (KHÔNG bỏ qua)
Đọc lại (không giả định từ trí nhớ, có thể đã đổi kể từ lần trước):
- `.project-agent/STATE.json` + `STATE.md` — phase hiện tại, `next_tasks`, `acceptance_status`
- `.project-agent/PROMPT_LOOP_TASKS.md` + `TASK_QUEUE.jsonl` — hàng đợi việc kế tiếp
- `.project-agent/ACCEPTANCE.yaml` + `EXECUTION_PLAN.yaml` — AC nào đang PENDING/E1, task nào chưa DONE
- `.project-agent/POLICY.yaml` — ngưỡng evidence bắt buộc theo từng profile (`frontend_theme` = E2, `mops_gas_backend` = E3)
- `.project-agent/FINAL_REPORT.json` (đặc biệt block `reopen_2026-09-10` nếu có) — known_gaps chưa xử lý

## Bước 2 — Xác định việc cần làm ngay
Ưu tiên theo thứ tự:
1. Nếu người dùng vừa báo "đã deploy xong" / "chạy test" / "review và fix" → đây là tín hiệu chạy lại **VERIFY** cho các AC đang ở E1 (ví dụ AC-31 B2B application, AC-33 booking slot-locking — xem `mops-gas/` có push chưa qua `git log`/hỏi người dùng nếu cần).
2. Nếu có `next_tasks` cụ thể trong STATE.json → xử lý đúng 1 task đầu tiên (Single Task Focus, mục 22.1).
3. Nếu không có gì PENDING → chạy full QA sweep (build_theme, build_tailwind, secret_scan, compliance_lint, render sweep toàn bộ template qua `npm run preview` + curl) để xác nhận trạng thái thật, không tin STATE.json cũ nếu nghi ngờ đã lệch.

## Bước 3 — Test / Review / Fix
- Chạy các lệnh verify tương ứng trong `COMMANDS.yaml` (không tự chế lệnh mới nếu đã có sẵn).
- Nếu phát hiện lỗi: phân loại (CODE_DEFECT/TEST_DEFECT/ENV_FAILURE — mục 34), sửa, chạy lại targeted test, rồi chạy lại regression scope liên quan — tối đa 3 lần tự sửa cho 1 vấn đề (mục 22.7) trước khi dừng và báo cáo cho người dùng thay vì lặp vô hạn.
- KHÔNG nới lỏng assertion/threshold để "cho qua" (Anti-Gaming Integrity, mục 3).
- Với các thay đổi chạm `mops-gas/`: tuyệt đối không tự `clasp deploy` vào production; nếu cần push để test, hỏi xác nhận trước (đã là quy ước đã thống nhất với người dùng trong phiên REOPEN 2026-09-10).

## Bước 4 — Cập nhật trạng thái (bắt buộc trước khi kết thúc)
- Cập nhật `status`/`evidence_grade`/`resolution` tương ứng trong `EXECUTION_PLAN.yaml`, `ACCEPTANCE.yaml`, `TASK_QUEUE.jsonl`, `STATE.json`, `STATE.md`.
- Nếu đây là lần đưa 1 AC từ E1 lên E3 thật (ví dụ sau khi người dùng xác nhận đã `clasp push` + test sandbox) → cập nhật `FINAL_REPORT.json#reopen_2026-09-10` tương ứng, không tạo báo cáo trùng lặp.
- Lưu log/evidence thật vào `.project-agent/evidence/` (không khẳng định PASSED nếu không có log kèm theo — Zero Hallucination of Evidence, mục 1).

## Bước 5 — Báo cáo ngắn gọn cho người dùng
Tóm tắt: đã test gì, tìm thấy lỗi gì (nếu có) và đã sửa ra sao, AC nào vừa đổi trạng thái, còn gì cần người dùng quyết định tiếp (nếu có) — không lặp lại toàn bộ log dài, chỉ nêu kết luận + đường dẫn evidence.
