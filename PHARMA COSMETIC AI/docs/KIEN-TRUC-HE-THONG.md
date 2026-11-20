# KIẾN TRÚC HỆ THỐNG TRÍ TUỆ NHÂN TẠO CỤC BỘ (PHARMA COSMETICS ON-PREMISE AI)

## 1. SƠ ĐỒ LUỒNG DỮ LIỆU & BẢO MẬT (DATA FLOW)
```
[ Khách hàng / Storefront Theme ]
               │
               ▼  (HTTP POST /api/v1/chat)
┌────────────────────────────────────────────────────────┐
│               PHARMA COSMETICS AI GATEWAY              │
│                                                        │
│  1. Guardrail Layer: Lọc PII (Ẩn SĐT, CCCD)           │
│  2. Intent Classifier: Phân luồng truy vấn             │
│                                                        │
│     ┌──────────────────┬──────────────────┐            │
│     ▼                  ▼                  ▼            │
│ [Semantic Cache]  [Hybrid RAG]     [MCP Tool Calling]  │
│  (Redis Cache)    (Qdrant + BM25)  (Sapo POS / ERP)    │
│  Tri thức lặp lại Tri thức Y khoa  Giá & Tồn kho live  │
│     └──────────────────┼──────────────────┘            │
│                        ▼                               │
│              [vLLM Inference Engine]                   │
│          (Qwen2.5-7B/14B-Instruct Local)               │
│                        │                               │
│  3. Compliance Checker: Kiểm định Y dược & Pháp lý    │
│     - Không mạo danh Bác sĩ                            │
│     - Không cam kết khỏi 100%                          │
│     - Không bịa giá / bịa % khuyến mại                 │
└────────────────────────┬───────────────────────────────┘
                         ▼
        [ Phản hồi Khoa học, Chính xác 100% ]
```

## 2. NGUYÊN TẮC BẢO VỆ PHÁP LÝ & DỮ LIỆU
1. **Nghị định 13/2023/NĐ-CP & Luật Bảo vệ dữ liệu cá nhân 2025**:
   - Dữ liệu cuộc trò chuyện được lưu trữ 100% On-Premise trên máy chủ nội bộ.
   - Hàm `mask_pii()` tự động làm mờ số điện thoại, định danh công dân trước khi đưa vào luồng log.
2. **Luật Bảo vệ quyền lợi người tiêu dùng 2023**:
   - AI không bao giờ được tự suy đoán hoặc báo sai giá sản phẩm.
   - Mọi thông tin về giá và tồn kho bắt buộc phải truy xuất qua hàm `query_sapo_inventory_and_price()`.
3. **Luật Giao dịch điện tử 2023 (Điều 35 về Hợp đồng tự động)**:
   - Khi tạo đơn hàng tự động (`create_draft_order_with_otp`), hệ thống bắt buộc gửi mã OTP về số điện thoại khách hàng và lưu vết toàn vẹn (Audit log) để bảo vệ giá trị pháp lý.
