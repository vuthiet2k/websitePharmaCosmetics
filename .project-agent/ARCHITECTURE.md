# ARCHITECTURE.md

Theo `9. ARCHITECTURE_SELECTION_RULE` — không áp Clean Architecture/microservices giả định.
Đây là kiến trúc THẬT của hệ thống, không phải kiến trúc mong muốn.

## Sơ đồ tổng quan

```
                    ┌───────────────────────────┐
                    │     Sapo Platform          │
                    │  (hosting, routing, đơn    │
                    │   hàng, khách hàng lõi)    │
                    └────────────┬────────────────┘
                                 │ render .bwt (liquid-like)
                ┌────────────────┼─────────────────┐
                │                │                 │
        layouts/theme.bwt  layouts/skinhealthy.bwt  layouts/mops-admin.bwt
         (brand pharma)      (brand skinhealthy)      (nội bộ vận hành)
                │                │                 │
          templates/*.bwt   templates/*.skinhealthy.bwt   page.mops-admin.bwt
          snippets/*.bwt    (dùng chung nhiều snippet)     + mops_admin_tab_*.bwt
                │
        assets/*.scss.bwt, *.js.bwt (build qua tailwind + build-theme.js)
                │
        Vercel Edge (api/gas.js proxy) ── KV (rate limit/cache/queue) ──┐
                │                                                       │
                └──────────────► mops-gas/ (Google Apps Script) ◄───────┘
                                  mops_00..05.js + mops_shared.js (16.9K LOC)
                                  - checkout ẩn danh (ANYONE_ANONYMOUS)
                                  - đơn hàng / tồn kho
                                  - vận đơn GHTK / SPX
                                  - ký số X-Signs
                                  Deploy CỐ ĐỊNH 1 deploymentId (xem mops-gas/README.md)
```

## Local dev / preview
- `dev-server.js` (Node, chokidar + ws) render `.bwt` bằng `liquidjs`, mock data từ `data/*.js`,
  hot reload qua websocket. Đây là công cụ verify duy nhất cho tầng frontend — không có
  staging server riêng.
- `scripts/build-theme.js` / `build-vercel.js` đóng gói theme để publish lên Sapo / Vercel.

## Vì sao KHÔNG áp toàn bộ V6.0
- Không có database riêng ở tầng theme -> không có "Data Integrity Gate" kiểu FK/constraint.
- Không có server tự host ở tầng theme -> không có SAST/DAST kiểu enterprise (không có target
  để scan).
- Có backend thật (mops-gas) -> áp `POLICY.yaml#mops_gas_backend`, nhưng release gate ở đây là
  **kỷ luật deploy thủ công theo `mops-gas/README.md`**, không phải CI/CD tự động (vì clasp
  không chạy trong pipeline hiện có).

## Design token nguồn
- Hiện tại: `tailwind.config.js` + section "Theme & Màu sắc" / "Skin Healthy — Cấu hình Theme"
  trong `configs/settings_schema.json`.
- Bổ sung (M1): trích xuất từ `Pharma_Cosmetics_Figma_Project/ui-design-system.html`
  (forest-800/900, clinical-600/700 theo đoạn Tailwind config nhúng trong `index.html`).
