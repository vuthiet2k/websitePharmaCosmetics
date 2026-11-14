---
description: Vòng lặp cưỡng chế đại trùng tu giao diện & dọn dẹp CSS/Snippets theo plan.md (Astra Multi-Model Antigravity v2.0). Chạy tự động tuần tự 16 Micro-Batches, tự kiểm định cơ học, commit từng bước đến khi hoàn tất.
argument-hint: [để trống = tự chạy Batch tiếp theo theo checklist | mã Batch cụ thể ví dụ BATCH-02 | status]
---

# LỆNH /goal — VÒNG LẶP CƯỠNG CHẾ ĐẠI TRÙNG TU (ANTIGRAVITY MULTI-MODEL)

> **Mục tiêu**: Thực thi 16 Micro-Batches theo kế hoạch `plan.md` nhằm xoá sổ CSS rác, đồng bộ 1 thẻ sản phẩm, dọn snippets, cải tổ Customizer và sửa triệt để 7 mã lỗi mobile (`BUG-01`..`BUG-07`).

---

## BƯỚC 0: KHỞI ĐỘNG CỔNG KIỂM SOÁT TRẠNG THÁI (STATE AUTHORITY GATE)

Hành động đầu tiên bắt buộc của model là chạy lệnh:
```bash
node scripts/overhaul-tracker.mjs --status
```
1. Đọc stdout để xác định **`BATCH-xx` TIẾP THEO** đang có trạng thái `PENDING` hoặc `VERIFY_FAIL` (với `attempts < 2`).
2. Nếu `$ARGUMENTS` chỉ định rõ một Batch (ví dụ `/goal BATCH-04`), thực hiện đúng Batch đó nếu các phụ thuộc (`depends_on`) đã `DONE`.
3. Nếu một `BATCH-xx` bị `attempts >= 2` và `VERIFY_FAIL`: In thông báo yêu cầu chuyển đổi sang model **Claude Sonnet / GPT cơ bản** trên Antigravity trước khi chạy tiếp.

---

## BƯỚC 1: NẠP NGỮ CẢNH TỐI THIỂU (SCOPED CONTEXT LOADING)

- Model **CHỈ ĐƯỢC PHÉP ĐỌC** các file nằm trong danh sách `target_files` của đúng `BATCH-xx` đang làm (tối đa 4 file), cùng với mô tả kỹ thuật của Batch đó trong `c:\Users\user\Downloads\plan.md`.
- Tuyệt đối cấm đọc lan man sang các file của Batch khác để bảo vệ context window (đặc biệt khi dùng **Gemini 3.8 Flash**).

---

## BƯỚC 2: QUY TẮC THỰC THI PHẪU THUẬT (SURGICAL CODE INVARIANTS)

1. **CẤM DÙNG COMMENT CẮT NGẮN**: Tuyệt đối không viết `<!-- ... giữ nguyên ... -->` hoặc `/* ... rest of code ... */` khi ghi file. Mọi thay đổi phải là nội dung hoàn chỉnh hoặc dùng tool edit thay thế chính xác.
2. **SAPO .NET LIQUID INVARIANT**:
   - Khi sửa `.bwt`, cấm dùng filter `slice` rồi so sánh hoặc nối chuỗi (tránh lỗi `TakeIterator` của Sapo .NET).
   - Bắt buộc dùng tiền tố `'§'` + `contains` (ví dụ: `assign t_m = tag | downcase | prepend: '§' | if t_m contains '§nhan:'`).
3. **TAILWIND TOKEN WHITELIST INVARIANT (`tailwind.pc.config.js`)**:
   - **Màu nền**: `bg-primary`, `bg-primary-hover`, `bg-btn`, `bg-card`, `bg-card-btn`, `bg-flash`, `bg-sale`, `bg-white`, `bg-transparent`.
   - **Màu chữ**: `text-primary`, `text-btn-text`, `text-card-btn-text`, `text-flash-text`, `text-ink`, `text-ink-secondary`, `text-price`, `text-sale`, `text-white`.
   - **Viền**: `border-primary`, `border-card-line`, `border-line-soft`, `border-transparent`.
   - **Bo góc**: `rounded-none`, `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-full` (9999px). CẤM `rounded-md`, `rounded-lg`.
   - **Đổ bóng**: CẤM `shadow-*` (luật R4).
4. **MOBILE ANTI-BREAKING INVARIANT**:
   - Mọi container flexbox ngang trên mobile phải có `flex-wrap`.
   - Mã SKU, Giá, Số sao, Tên tác giả, Ngày đăng, Nhãn giảm giá phải có `whitespace-nowrap`.

---

## BƯỚC 3: CỔNG KIỂM ĐỊNH CƠ HỌC BẮT BUỘC (MECHANICAL GATE)

Sau khi sửa code của `BATCH-xx`, model bắt buộc chạy lệnh:
```bash
node scripts/overhaul-tracker.mjs --verify <BATCH-ID>
```
- Nếu có file CSS hoặc `.bwt` thay đổi: script tự động chạy kèm `npm run build:pc` và `node scripts/ui-guard.mjs`.
- Nếu có sửa `snippets/` hoặc `configs/`: script tự động chạy kèm `python scripts/export-config-sheet.py --check` (`npm run lint:config`).
- **NẾU FAIL (exit code 1)**: Đọc kỹ log lỗi do script in ra, sửa lại đúng các lỗi đó rồi chạy lại lệnh `--verify`. Không được commit khi chưa pass!

---

## BƯỚC 4: COMMIT NGUYÊN TỬ & TỰ ĐỘNG CHUYỂN TIẾP (AUTO-CONTINUE)

Khi `node scripts/overhaul-tracker.mjs --verify <BATCH-ID>` trả về **`exit code 0`** (`DONE`):
1. Chạy lệnh commit nguyên tử:
   ```bash
   git add <các_file_thuộc_batch> ui-loop/OVERHAUL-CHECKLIST.json
   git commit -m "refactor(<batch-id>): <mô tả thay đổi bằng tiếng Việt có dấu>"
   ```
2. **TỰ ĐỘNG TIẾP TỤC**:
   - Chạy lại `node scripts/overhaul-tracker.mjs --status`.
   - Nếu còn Batch kế tiếp ở trạng thái `PENDING`: Model **TỰ ĐỘNG BẮT ĐẦU NGAY BATCH TIẾP THEO** mà không dừng lại hỏi người dùng!
   - Chỉ dừng lại khi: Toàn bộ 16 Batch đạt `DONE`, hoặc gặp lỗi cần chuyển model (`attempts >= 2`), hoặc người dùng yêu cầu dừng.

---

## BƯỚC 5: BÁO CÁO KẾT THÚC LƯỢT

Báo cáo ngắn gọn cho chủ dự án:
- Batch vừa hoàn tất và kết quả kiểm định cơ học.
- Các file đã sửa / xoá và commit hash tương ứng.
- Trạng thái tổng thể tiến độ (xx/16 Batches).
- Batch tiếp theo sẵn sàng chạy.
