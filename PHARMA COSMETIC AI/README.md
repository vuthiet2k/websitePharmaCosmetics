# PHARMA COSMETICS LOCAL AI (HỆ THỐNG TRÍ TUỆ NHÂN TẠO CỤC BỘ)
> **Kiến trúc On-Premise AI chuyên sâu cho Thương mại Bán lẻ Dược - Mỹ phẩm**  
> Tuân thủ Nghị định 13/2023/NĐ-CP, Luật Bảo vệ quyền lợi Người tiêu dùng 2023 & Luật Giao dịch điện tử 2023.

---

## 1. TỔNG QUAN HỆ THỐNG
Dự án **PHARMA COSMETIC AI** là hệ thống AI Assistant On-Premise được thiết kế chuyên biệt để giải quyết 3 bài toán thương mại bán lẻ cốt lõi:
1. **Tra cứu & Tư vấn thông số sản phẩm / hoạt chất**: Kết hợp Hybrid RAG (Qdrant + BM25) chống ảo giác tuyệt đối.
2. **Kiểm tra tồn kho, giá niêm yết thời gian thực**: Kết nối cơ chế MCP (Model Context Protocol) / Function Calling với cơ sở dữ liệu Sapo POS/ERP, không trả lời giá từ bộ nhớ LLM.
3. **Bảo mật PII & Pháp lý giao dịch điện tử**: Toàn bộ dữ liệu nằm cục bộ, xác thực OTP trước khi tạo đơn, lưu trữ log giao dịch toàn vẹn.

---

## 2. CẤU TRÚC THƯ MỤC
```
PHARMA COSMETIC AI/
├── app/                      # Mã nguồn Python backend & AI pipeline
│   ├── main.py               # FastAPI gateway phục vụ API AI
│   ├── config.py             # Cấu hình môi trường, model, port, timeout
│   ├── hybrid_rag.py         # Module Hybrid Search (Vector + BM25 keyword)
│   ├── mcp_tools.py          # Function calling tra cứu giá, tồn kho, tạo đơn Sapo
│   ├── guardrails.py         # Kiểm duyệt ảo giác, lọc PII và câu hỏi ngoài chuyên môn
│   └── cache.py              # Semantic Caching trên Redis/Memory
├── data/                     # Dữ liệu tri thức cục bộ (Sản phẩm, Hoạt chất, FAQ)
│   ├── knowledge_base.json   # Tri thức tĩnh: chính sách, thông số kỹ thuật, bảo hành
│   └── products_catalog.json # Danh mục sản phẩm & hoạt chất đồng bộ từ website
├── docs/                     # Tài liệu nghiên cứu & pháp lý
│   ├── NGHIEN-CUU-TRIEN-KHAI-AI-CUC-BO.md # Báo cáo nghiên cứu đầy đủ (400KB)
│   └── KIEN-TRUC-HE-THONG.md              # Sơ đồ và luồng xử lý chi tiết
├── scripts/                  # Kịch bản triển khai & kiểm thử
│   ├── setup_env.sh          # Cài đặt môi trường ảo và thư viện
│   ├── benchmark_load.py     # Đo hiệu năng, TTFT và TPS
│   └── run_local.sh          # Chạy cụm dịch vụ cục bộ
├── docker-compose.yml        # Docker compose dựng vLLM/Qdrant/Redis/App
├── requirements.txt          # Danh sách thư viện Python
└── README.md                 # Hướng dẫn cài đặt và vận hành
```

---

## 3. CÔNG NGHỆ & MÔ HÌNH KHUYẾN NGHỊ
- **LLM Engine**: `vLLM` hoặc `SGLang` (khuyến cáo không dùng Ollama cho môi trường sản xuất đa luồng).
- **Mô hình**: `Qwen2.5-7B-Instruct` hoặc `Qwen2.5-14B-Instruct` (hỗ trợ Tiếng Việt xuất sắc, định dạng JSON Structured Outputs chuẩn xác).
- **Vector DB**: `Qdrant` (hiệu năng cao, hỗ trợ Payload filtering và Hybrid search native).
- **Embedding Model**: `BAAI/bge-m3` (đa ngôn ngữ, hỗ trợ cả Dense và Sparse vectors).
- **Backend API**: `FastAPI` (Python 3.11+ / Async / Streaming Response).

---

## 4. HƯỚNG DẪN CÀI ĐẶT & CHẠY NHANH

### Bước 1: Khởi tạo môi trường ảo Python
```bash
cd "PHARMA COSMETIC AI"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Bước 2: Chuẩn bị dữ liệu tri thức
```bash
python3 -c "from app.hybrid_rag import init_knowledge_base; init_knowledge_base()"
```

### Bước 3: Chạy máy chủ AI Cục bộ
```bash
# Chạy ở chế độ phát triển
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API Swagger Docs sẽ sẵn sàng tại: `http://localhost:8000/docs`

---

## 5. TÍCH HỢP VỚI THEME WEBSITE PHARMA COSMETICS
- Endpoint trò chuyện: `POST http://localhost:8000/api/v1/chat`
- Endpoint soi da / phân tích hoạt chất: `POST http://localhost:8000/api/v1/analyze-routine`
- Có thể kết nối trực tiếp vào giao diện theme Sapo (`templates/page.ai-skin-quiz.bwt` hoặc widget chat nổi).

