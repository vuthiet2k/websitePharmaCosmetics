---
description: Giao yêu cầu cho đội 4 agent (ba-lead → fe-core / fe-feature / data-engineer → ba-lead nghiệm thu). Phiên chính chỉ điều phối.
argument-hint: <yêu cầu / vấn đề của chủ dự án>
---

# /team — Điều phối đội phát triển Pharma Cosmetics

Yêu cầu của chủ dự án: **$ARGUMENTS**

Phiên chính là **điều phối viên**: không tự sửa mã theme, chỉ gọi agent theo đúng thứ tự dưới đây (Agent tool, `subagent_type` = tên agent), chuyển nguyên văn yêu cầu + đường dẫn SPEC, và báo lại chủ dự án.

1. **Phân tích — `ba-lead`**: gửi nguyên văn yêu cầu. BA khảo sát hiện trạng, viết `docs/specs/SPEC-<mã>.md` với REQ/AC + thẻ việc.
   - Có `open_questions` / `WAITING_INPUT` ⇒ dừng, hỏi chủ dự án (AskUserQuestion), có câu trả lời thì gửi lại cho BA cập nhật SPEC. Không đoán thay.
2. **Thực thi** theo bảng thẻ việc của BA:
   - Thẻ không phụ thuộc nhau và **không chung file** ⇒ gọi song song trong cùng một lượt (`fe-core`, `fe-feature`, `data-engineer`).
   - Thẻ phụ thuộc (vd fe-feature cần token mới của fe-core, cần dữ liệu của data-engineer) ⇒ chạy tuần tự.
   - Mỗi lượt gọi gửi: đường dẫn SPEC, mã thẻ, danh sách file được ghi, AC phải đạt.
3. **Review chéo** (khi có cả 2 FE): gọi `fe-core` đọc diff của fe-feature (và ngược lại nếu fe-core sửa `ui_*` mà fe-feature dùng) — chỉ review, ghi nhận lỗi; sửa do owner.
4. **Nghiệm thu — `ba-lead`**: chạy cổng nghiệm thu, đối chiếu AC. FAIL ⇒ trả thẻ lỗi về owner (tối đa 2 vòng/thẻ; vòng 3 vẫn FAIL ⇒ dừng, báo chủ dự án kèm nguyên nhân).
5. **Báo cáo chủ dự án** (tiếng Việt, ngắn): đã làm gì, AC PASS/FAIL, lệnh đã chạy, việc chờ duyệt. Commit/push/deploy theo chế độ hiện hành trong memory của dự án; không deploy `--prod`.

Kiểm tra kết quả của agent trước khi báo (xem `git diff`, chạy lại lệnh quan trọng) — báo cáo của agent không phải bằng chứng.
