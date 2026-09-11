# X-Signs (Ký số điện tử) — Design Note, KHÔNG phải kế hoạch triển khai

**Trạng thái:** Ghi chú thiết kế sơ bộ (T-55). KHÔNG có backend nào tồn tại cho tính năng này —
ADR-005 (`.project-agent/DECISIONS.md`) xác nhận đã grep toàn bộ `mops-gas/*.js` và không tìm
thấy bất kỳ endpoint/khái niệm "X-Signs"/ký số điện tử nào.

**Frontend liên quan:** `snippets/mops_admin_tab_signing.bwt` — UI shell tĩnh, mọi nút hành động
đã bị disable, không có toast giả lập thành công cho hành động ký. Không sửa file đó để "bật"
tính năng cho tới khi backend thật tồn tại và đã qua review.

---

## 1. Vì sao KHÔNG tự động triển khai

Ký số điện tử cho văn bản lao động/hành chính là năng lực có rủi ro pháp lý và bảo mật cao hơn
hẳn các tính năng admin khác trong dự án này:

- **Giá trị pháp lý chữ ký** — cần xác định chữ ký điện tử ở đây có giá trị pháp lý theo Luật
  Giao dịch điện tử hiện hành hay chỉ là xác nhận nội bộ (không thay thế chữ ký tay/con dấu cho
  hợp đồng lao động chính thức nếu luật yêu cầu).
- **Chống chối bỏ (non-repudiation)** — cần cơ chế xác thực danh tính người ký (OTP/SĐT đã xác
  minh, hoặc tài khoản nhân viên có MFA) và lưu bằng chứng không thể chối bỏ sau này.
- **PII trong văn bản đã ký** — hợp đồng lao động chứa dữ liệu cá nhân đầy đủ (tên, CCCD, lương,
  địa chỉ) → áp dụng Luật 91/2025/QH15 (xem `POLICY.yaml#compliance`).
- **Tính toàn vẹn/chống giả mạo** — văn bản sau khi ký không được sửa được nữa; cần hash + khoá
  version tại thời điểm ký.

Vì các lý do trên, mục 3 bên dưới chỉ là điểm khởi đầu cho review bảo mật/pháp lý, **không phải
đặc tả sẵn sàng code**.

## 2. Phạm vi nghiệp vụ tối thiểu (theo Figma `admin-signing.html`)

- Danh sách hồ sơ ký số, trạng thái: Nháp / Đang chờ / Chờ bạn ký / Hoàn thành / Đã hủy-Từ chối.
- Mỗi hồ sơ có thể có nhiều bước ký tuần tự (vd. "Ký tuần tự (3 bước)").
- Hạn ký (deadline) + cảnh báo quá hạn.
- Bộ lọc nâng cao theo loại văn bản (Lao động / Văn bản điều hành / Hành chính / ...).

## 3. Data model đề xuất (Sheets hoặc KV — cần benchmark trước khi chọn, xem
`mops-gas/docs/performance-playbook.md` về giới hạn Sheets ở quy mô lớn)

Theo đúng quy ước idempotency/schema-validation đã dùng cho ghi đơn hàng/tồn kho
(`POLICY.yaml#mops_gas_backend.quality_gates.data_integrity_gate`):

- **`SigningDossier`**: `dossier_id` (idempotency key khi tạo), `title`, `doc_type`, `status`,
  `created_at`, `sign_deadline`, `created_by_staff_id`, `document_hash` (hash nội dung gốc, để
  phát hiện sửa sau khi phát hành ký), `current_step_index`.
- **`SigningStep`**: `dossier_id`, `step_index`, `signer_staff_id` (hoặc `signer_external_id` nếu
  người ký không phải nhân viên), `status` (pending/signed/rejected), `signed_at`.
- **`SignatureEvent`** (audit, append-only — theo đúng nguyên tắc `EVENTS.jsonl` append-only đã
  dùng ở `.project-agent/`): `dossier_id`, `step_index`, `actor_id`, `action`
  (viewed/signed/rejected/reassigned), `timestamp`, `ip_or_device_fingerprint` (nếu thu thập,
  phải có mục đích rõ + tuân thủ Luật 91/2025 như mọi form PII khác trong dự án — xem
  `POLICY.yaml#pii_form_gate`), `signature_payload_hash`.

Ghi dữ liệu phải validate schema đầu vào trước khi ghi (đúng data_integrity_gate hiện có), và
mỗi thao tác tạo/ký phải có idempotency key để tránh double-submit qua mạng chập chờn (pattern
đã áp dụng cho ghi đơn hàng).

## 4. API surface đề xuất (Apps Script, theo đúng style file hiện có `mops_0X.js`)

- `createSigningDossier(payload)` — tạo hồ sơ + bước ký, validate schema, trả `dossier_id`.
- `addSigner(dossier_id, signer)` — thêm người ký vào 1 bước (chỉ khi dossier ở trạng thái Nháp).
- `getSigningDossier(dossier_id)` / `listSigningDossiers(filter)` — đọc, có phân trang.
- `captureSignature(dossier_id, step_index, signature_payload)` — bước nhạy cảm nhất: phải xác
  thực danh tính người ký TRƯỚC khi ghi (không chỉ dựa vào token phiên admin hiện có — cần xác
  định lại yêu cầu xác thực bổ sung, vd. OTP), ghi `SignatureEvent`, cập nhật `current_step_index`.
- `rejectSignature(dossier_id, step_index, reason)`.
- `verifyDossierIntegrity(dossier_id)` — so sánh `document_hash` hiện tại với hash tại thời điểm
  tạo, phát hiện tài liệu bị sửa sau khi đã có người ký.

## 5. Việc PHẢI làm trước khi viết code thật

1. Review bảo mật: mô hình xác thực người ký, lưu trữ signature payload, chống giả mạo.
2. Review pháp lý: chữ ký điện tử ở đây có cần đáp ứng chuẩn nào của Luật Giao dịch điện tử để
   có giá trị thay thế chữ ký tay cho hợp đồng lao động hay không; nếu không, hồ sơ ký ở đây chỉ
   nên là xác nhận nội bộ (kèm bản in ký tay song song), cần làm rõ ràng với người dùng cuối.
3. Xác nhận nơi lưu trữ document_hash/signature_payload có đáp ứng yêu cầu lưu trữ/retention
   theo Luật 91/2025 (thời hạn lưu, quyền xoá dữ liệu cá nhân của người ký).
4. Benchmark Sheets vs KV cho khối lượng hồ sơ dự kiến (xem performance-playbook.md).
5. Thiết kế xong mới tạo `EXECUTION_PLAN.yaml` task riêng cho triển khai backend, theo đúng
   `POLICY.yaml#mops_gas_backend` (deploy vào đúng `deploymentId` cố định, test sandbox trước).

**KHÔNG được tự động triển khai từ ghi chú này mà không có review bảo mật/pháp lý riêng.**
