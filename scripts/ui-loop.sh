#!/usr/bin/env bash
# scripts/ui-loop.sh — vòng lặp sửa giao diện theo docs/UI-STANDARD.md (Phần G). Chạy trong Git Bash ở thư mục repo:
#   bash scripts/ui-loop.sh
# Mỗi vòng = 1 lần gọi `claude -p` với ngữ cảnh mới; trạng thái nằm trong ui-loop/* nên dừng (Ctrl+C) rồi chạy lại vẫn tiếp.
# Biến tuỳ chọn: UI_LOOP_MAX (mặc định 200 vòng), UI_LOOP_MODEL (mặc định opus), UI_BASE (mặc định http://localhost:3000).
set -u
cd "$(dirname "$0")/.." || exit 2
MAX="${UI_LOOP_MAX:-200}"
MODEL="${UI_LOOP_MODEL:-opus}"
BASE="${UI_BASE:-http://localhost:3000}"
export MSYS_NO_PATHCONV=1   # Git Bash không đổi "/collections/all" thành đường dẫn Windows
mkdir -p ui-loop

branch="$(git branch --show-current)"
if [ "$branch" != "ui-fix" ]; then echo "Đang ở nhánh '$branch' — chuyển sang nhánh ui-fix trước (git switch ui-fix)."; exit 2; fi
if ! command -v claude >/dev/null 2>&1; then echo "Không thấy lệnh claude (Claude Code)."; exit 2; fi

# Server preview: dùng cái đang chạy, nếu chưa có thì bật và tắt khi kết thúc
SERVER_PID=""
if ! curl -s -o /dev/null -w "%{http_code}" "$BASE/?tpl=index" | grep -q 200; then
  echo "Bật npm run preview…"
  npm run preview > ui-loop/preview.log 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 60); do curl -s -o /dev/null -w "%{http_code}" "$BASE/?tpl=index" | grep -q 200 && break; sleep 1; done
  curl -s -o /dev/null -w "%{http_code}" "$BASE/?tpl=index" | grep -q 200 || { echo "Không bật được preview — xem ui-loop/preview.log"; exit 2; }
fi
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null; }
trap cleanup EXIT INT TERM

# Chưa có mốc so sánh ⇒ chờ (quét mốc đang chạy) — không có mốc thì bước kiểm hồi quy luôn "0 lỗi mới" (cho qua sai)
for _ in $(seq 1 120); do [ -s ui-loop/baseline.json ] && break; echo "Chờ ui-loop/baseline.json…"; sleep 30; done
[ -s ui-loop/baseline.json ] || { echo "Chưa có ui-loop/baseline.json — chạy: node scripts/ui-verify.mjs --full --write-baseline"; exit 2; }

# Mảng (không gộp chuỗi): mỗi quy tắc có dấu cách như "Bash(npm run:*)" phải là 1 đối số
ALLOWED=(Read Edit Write Glob Grep
  "Bash(npm run:*)" "Bash(npm install:*)" "Bash(npx tailwindcss:*)" "Bash(npx playwright:*)" "Bash(node:*)"
  "Bash(git status:*)" "Bash(git diff:*)" "Bash(git log:*)" "Bash(git add:*)" "Bash(git commit:*)" "Bash(git restore:*)" "Bash(git show:*)"
  "Bash(curl:*)" "Bash(ls:*)" "Bash(cat:*)" "Bash(head:*)" "Bash(tail:*)" "Bash(wc:*)" "Bash(grep:*)" "Bash(mkdir:*)" "Bash(cp:*)" "Bash(mv:*)" "Bash(gzip:*)" "Bash(sort:*)")
DENIED=("Bash(git push:*)" "Bash(npx vercel:*)" "Bash(vercel:*)" "Bash(git reset:*)" "Bash(git checkout:*)" "Bash(git clean:*)"
  "Bash(git add -A:*)" "Bash(git add .:*)" "Bash(git add --all:*)" "Bash(rm -rf:*)")

# Chờ tới giờ làm mới khi gặp giới hạn sử dụng ("You've hit your session limit · resets 1:10am")
wait_for_reset() {
  local msg="$1" t secs
  t="$(echo "$msg" | grep -oE 'resets [0-9]{1,2}(:[0-9]{2})? ?(am|pm)' | head -1 | sed 's/resets //')"
  if [ -n "$t" ] && target=$(date -d "$t" +%s 2>/dev/null); then
    now=$(date +%s); [ "$target" -le "$now" ] && target=$((target + 86400)); secs=$((target - now + 120))
  else secs=900; fi
  echo "Giới hạn sử dụng — chờ $((secs/60)) phút (tới $(date -d "@$(( $(date +%s) + secs ))" '+%H:%M'))…" | tee -a ui-loop/run.log
  sleep "$secs"
}

i=0; fast_fail=0
while [ "$i" -lt "$MAX" ]; do
  i=$((i+1)); echo "===== Vòng $i — $(date '+%F %T') =====" | tee -a ui-loop/run.log
  t0=$(date +%s); before="$(md5sum ui-loop/STATUS.md ui-loop/BACKLOG.md 2>/dev/null)"
  claude -p "$(cat ui-loop/PROMPT.md)" \
    --model "$MODEL" \
    --permission-mode acceptEdits \
    --allowedTools "${ALLOWED[@]}" \
    --disallowedTools "${DENIED[@]}" \
    2>&1 | tee ui-loop/last-round.log | tee -a ui-loop/run.log
  out="$(tail -n 5 ui-loop/last-round.log)"
  if echo "$out" | grep -qiE "hit your (session|usage|weekly) limit|usage limit|rate limit|overloaded|resets [0-9]"; then
    i=$((i-1)); wait_for_reset "$out"; continue        # không tính là 1 vòng
  fi
  after="$(md5sum ui-loop/STATUS.md ui-loop/BACKLOG.md 2>/dev/null)"
  if [ $(( $(date +%s) - t0 )) -lt 60 ] && [ "$before" = "$after" ]; then
    fast_fail=$((fast_fail+1)); i=$((i-1))
    echo "Vòng hỏng nhanh lần $fast_fail (không tiến triển): $(echo "$out" | tail -1)" | tee -a ui-loop/run.log
    [ "$fast_fail" -ge 5 ] && { echo "Dừng — 5 vòng liên tiếp hỏng ngay khi chạy, xem ui-loop/last-round.log"; exit 4; }
    sleep $((fast_fail * 120)); continue
  fi
  fast_fail=0
  first="$(head -n 1 ui-loop/STATUS.md 2>/dev/null)"
  # Quét toàn site (~45 phút) do script chạy hộ — lệnh Bash của agent bị cắt sau 10 phút
  if [[ "$first" == "TRẠNG THÁI: CẦN QUÉT FULL"* ]]; then
    echo "Chạy ui-verify --full…" | tee -a ui-loop/run.log
    { date -Iseconds; node scripts/ui-verify.mjs --full 2>&1 | grep -v '^[.,p]*$'; } > ui-loop/full-latest.txt
    tail -n 3 ui-loop/full-latest.txt | tee -a ui-loop/run.log
    sed -i '1s/.*/TRẠNG THÁI: ĐANG CHẠY (đã quét full — xem ui-loop\/full-latest.txt)/' ui-loop/STATUS.md
    continue
  fi
  case "$first" in
    "TRẠNG THÁI: HOÀN TẤT"*) echo "Hoàn tất: hết việc, 2 lần quét toàn site sạch."; exit 0 ;;
    "TRẠNG THÁI: DỪNG"*)     echo "Dừng — xem ui-loop/STATUS.md ($first)"; exit 3 ;;
  esac
done
echo "Chạm giới hạn $MAX vòng — xem ui-loop/STATUS.md"; exit 1
