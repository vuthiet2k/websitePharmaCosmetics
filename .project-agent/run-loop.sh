#!/bin/bash
# .project-agent/run-loop.sh — entrypoint theo mục 21 (5-Step Implementation Process) /
# 22 (Agentic REPL Loop) của "Skill - Autonomous Project Architect.md".
#
# KHÁC BIỆT CÓ CHỦ ĐÍCH so với template chung chung (vd. bản dùng `opencode run ... \
# --dangerously-skip-permissions` trong 1 vòng `while true` vô hạn):
#   1. Không có CLI agent ngoài nào tên "opencode" được cài trong môi trường này — gọi nó
#      sẽ chỉ lỗi "command not found" lặp vô hạn.
#   2. PROMPT_LOOP_TASKS.md của dự án này KHÔNG dùng định dạng checkbox "Status: `[ ]`" —
#      nguồn trạng thái thật là EXECUTION_PLAN.yaml (status: PENDING/DONE) + STATE.json.
#   3. Điều phối viên (agent) trong dự án này chính là phiên Claude Code đang chạy —
#      không cần (và không an toàn khi) một tiến trình bash riêng tự động lặp vô hạn và
#      tự cấp quyền "skip permissions" để tự ý sửa file/commit không giám sát.
#
# Vì vậy script này chỉ làm ĐÚNG 1 việc mỗi lần gọi (Rule 22.1 Single Task Focus):
# đọc trạng thái hàng đợi thật và in ra tác vụ ưu tiên tiếp theo, để agent (Claude Code)
# tự xử lý đúng 1 task rồi cập nhật STATE.json/EVENTS.jsonl (Rule 22.5), sau đó có thể gọi
# lại script này để lấy trạng thái kế tiếp — đúng cơ chế Crash Resilience (mục 23.1) mà
# không cần vòng lặp bash tách biệt hay --dangerously-skip-permissions.
set -eo pipefail
cd "$(dirname "$0")/.."

PLAN=".project-agent/EXECUTION_PLAN.yaml"
STATE=".project-agent/STATE.json"

REMAINING=$(grep -c "status: PENDING" "$PLAN" || true)

echo "=================================================================="
echo "Pharma Cosmetics — Agentic REPL Loop status ($(date))"
echo "=================================================================="

if [ "$REMAINING" -eq 0 ]; then
  echo "🎉 Không còn task PENDING trong EXECUTION_PLAN.yaml."
  echo "➡️  Tổng hợp EVIDENCE_INDEX.json -> FINAL_REPORT.json (T-60-qa-release) rồi đóng vòng lặp."
  exit 0
fi

echo "🔄 Task PENDING còn lại trong EXECUTION_PLAN.yaml: $REMAINING"
echo "➡️  Ưu tiên tiếp theo (STATE.json#next_tasks):"
grep '"next_tasks"' "$STATE"
echo
echo "Theo Rule 22 (Single Task Focus + Strict Boundary Respect): xử lý đúng 1 task ở trên,"
echo "cập nhật STATE.json/EVENTS.jsonl/EXECUTION_PLAN.yaml ngay sau khi xong, không tự ý sửa"
echo "file ngoài phạm vi task đó, rồi gọi lại ./.project-agent/run-loop.sh."
