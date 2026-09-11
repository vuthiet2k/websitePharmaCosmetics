# MOPS GAS Backend — clasp project

> Nguồn sự thật (source of truth) của Google Apps Script backend cho MOPS.
> Thay thế `docs/code.gs` (mirror cũ — sẽ deprecate sau khi clasp chạy ổn).
> Kế hoạch tái cấu trúc: `../docs/implementation/phase-07-gas-refactor.md`.

---

## ⛓️ Quy tắc BẤT BIẾN (đọc trước khi làm gì)

### 1. `push` để test — `deploy -i` để phát hành. KHÔNG bao giờ `clasp deploy` trần.
Frontend Sapo trỏ tới **1 URL cố định** lưu ở `../configs/settings_data.json → mops_gas_url`
(`https://script.google.com/macros/s/AKfycby3.../exec`), đọc bởi ~15 file `.bwt`/`.js.bwt`.

- `clasp deploy` **(không tham số)** → tạo deployment MỚI → **URL /exec MỚI** → **GÃY TOÀN BỘ frontend**.
- **Deployment production (đã xác định 2026-07-24, khớp `mops_gas_url` @5):**
  ```
  AKfycby3CJub4AtuXZ_q8mkC2mvIBuhqZ4Po8NOTHrr6e08tvDdw-eWgzEXtSFt0HnEQSbx4
  ```
- Luôn phát hành vào ĐÚNG ID này để **giữ nguyên URL**:
  ```bash
  clasp deploy -i AKfycby3CJub4AtuXZ_q8mkC2mvIBuhqZ4Po8NOTHrr6e08tvDdw-eWgzEXtSFt0HnEQSbx4 -d "phase-07: <mô tả>"
  ```
  (Script ID — khác deploymentId: `1Cqc-VwUe0aPZuPLyE8mn5tsk5uwvZyAdQXCnlAEP5kZNrktbm45bicuu`)

### 2. Một chiều: sửa ở VS Code → `clasp push`. KHÔNG sửa trên web editor nữa.
Sửa cả 2 nơi → `clasp push` đè mất thay đổi trên web / conflict.

### 3. Mỗi `deploy` = 1 giai đoạn refactor. Giữ version cũ trong GAS để rollback 1-click.

---

## Workflow hằng ngày

```bash
clasp push            # đẩy code lên bản HEAD để test (URL /dev, chỉ owner)
clasp push --watch    # tự push mỗi khi Ctrl+S
clasp pull            # kéo về nếu lỡ sửa trên web
clasp deployments     # xem danh sách deployment + ID
clasp deploy -i <deploymentId> -d "..."   # PHÁT HÀNH: cập nhật đúng bản → URL không đổi
```

Git: commit/branch như thường sau mỗi bước.

---

## ⚠️ Kiểm tra `appsscript.json` SAU khi `clasp clone`

Clone sẽ kéo `appsscript.json` thật từ cloud. **Đối chiếu** 2 field sống-còn (đừng đè mù):

```json
{
  "timeZone": "Asia/Ho_Chi_Minh",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  },
  "runtimeVersion": "V8"
}
```

- `access: "ANYONE_ANONYMOUS"` — BẮT BUỘC. Checkout công khai (khách không đăng nhập Google). Đổi sang `ANYONE` (cần tài khoản Google) → khách không thanh toán được.
- `timeZone: "Asia/Ho_Chi_Minh"` — hygiene. (Lưu ý: code đã tự phòng lệch giờ bằng UTC-ISO + hardcode TZ, xem BS-11 — field này KHÔNG "sửa" drift, chỉ để nhất quán môi trường.)

---

## Thiết lập lần đầu (chạy 1 lần)

Xem chuỗi lệnh chi tiết trong phase-07 §8.1. Tóm tắt:
```bash
npm install -g @google/clasp
clasp login                    # bật Apps Script API = ON tại script.google.com/home/usersettings
# lấy Script ID: GAS editor > ⚙️ Cài đặt dự án > ID tập lệnh
clasp clone "<SCRIPT_ID>"      # clone vào ĐÚNG thư mục này (mops-gas/)
```
