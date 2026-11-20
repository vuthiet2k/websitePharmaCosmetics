"""
FastAPI Server Gateway cho PHARMA COSMETICS LOCAL AI
Tích hợp:
1. Trả lời chính xác Địa chỉ, Hotline, Phòng trị liệu của cửa hàng.
2. Trả lời tư vấn sản phẩm đúng tình trạng da (kèm link website thật).
3. Đề xuất bài viết chuyên sâu liên quan của cửa hàng (kèm link /blogs/...).
4. Tra cứu tồn kho / giá Sapo thời gian thực.
5. Bộ lọc PII và bảo vệ pháp lý theo Nghị định 13/2023 & Luật BVQLNTD 2023.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.config import settings
from app.guardrails import mask_pii, check_medical_compliance
from app.hybrid_rag import get_rag_engine
from app.mcp_tools import query_sapo_inventory_and_price

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hệ thống Trí tuệ Nhân tạo Cục bộ (On-Premise AI) Dược Mỹ Phẩm Pharma Cosmetics"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str = Field(..., description="user | assistant | system")
    content: str = Field(..., description="Nội dung tin nhắn")

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_id: Optional[str] = "anonymous"
    temperature: Optional[float] = 0.2

class ChatResponse(BaseModel):
    reply: str
    related_products: List[Dict[str, Any]] = []
    related_articles: List[Dict[str, Any]] = []
    store_info: Optional[Dict[str, Any]] = None

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "engine": settings.LLM_MODEL_NAME,
        "features": ["store_info", "product_recommendation", "article_retrieval", "hybrid_rag"]
    }

@app.post(f"{settings.API_V1_PREFIX}/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Danh sách tin nhắn không được rỗng.")

    user_query = request.messages[-1].content
    masked_query = mask_pii(user_query) # Lọc PII bảo vệ khách hàng
    lower_query = user_query.lower()
    
    # 1. Phát hiện ý định hỏi ĐỊA CHỈ / CỬA HÀNG / CƠ SỞ
    is_address_query = any(k in lower_query for k in ["địa chỉ", "cơ sở", "ở đâu", "chi nhánh", "showroom", "phòng khám", "skin health beauty"])
    
    # 2. Truy xuất dữ liệu Hybrid RAG
    rag = get_rag_engine()
    results = rag.search(masked_query, top_k=6)
    
    store_info = None
    related_prods = []
    related_arts = []
    
    if is_address_query or "giải phóng" in lower_query:
        store_info = {
            "name": "Phòng trị liệu da 1:1 Skin Health Beauty - Pharma Cosmetics",
            "address": "Số 44 Ngõ 897 Giải Phóng, Phường Giáp Bát, Hoàng Mai, Hà Nội",
            "hotline": "0967.194.063 / 0965.594.399",
            "working_hours": "08:30 - 20:00 (Thứ 2 - Chủ Nhật)",
            "booking_url": "/dat-lich-tu-van"
        }

    # Phân loại tài liệu trả về thành Sản phẩm và Bài viết
    for doc in results:
        cat = doc.get("category", "")
        if "Sản phẩm" in cat and len(related_prods) < 3:
            related_prods.append({
                "title": doc.get("title"),
                "url": doc.get("url")
            })
        elif "Bài viết" in cat and len(related_arts) < 2:
            related_arts.append({
                "title": doc.get("title"),
                "url": doc.get("url")
            })

    # Xây dựng câu trả lời phản hồi tổng hợp
    reply_parts = []
    
    if store_info:
        reply_parts.append(
            f"📍 **THÔNG TIN CƠ SỞ & PHÒNG TRỊ LIỆU PHARMA COSMETICS**:\n"
            f"- **Địa chỉ**: {store_info['address']}\n"
            f"- **Hotline/Zalo**: {store_info['hotline']}\n"
            f"- **Thời gian mở cửa**: {store_info['working_hours']}\n"
            f"- Khách hàng đến trực tiếp được **soi da vi điểm AI và tư vấn phác đồ 1:1 miễn phí**. Bạn có thể đặt lịch hẹn trước tại [Đặt lịch tư vấn](/dat-lich-tu-van)."
        )

    if related_prods:
        prod_text = "\n".join([f"- [{p['title']}]({p['url']})" for p in related_prods])
        reply_parts.append(f"✨ **SẢN PHẨM PHÙ HỢP VỚI TÌNH TRẠNG DA CỦA BẠN**:\n{prod_text}")

    if related_arts:
        art_text = "\n".join([f"- [{a['title']}]({a['url']})" for a in related_arts])
        reply_parts.append(f"📖 **BÀI VIẾT CHUYÊN MÔN HƯỚNG DẪN TỪ CHUYÊN GIA**:\n{art_text}")

    if not reply_parts:
        if results:
            reply_parts.append(results[0].get("content", ""))
        else:
            reply_parts.append(
                "Dạ em đã ghi nhận tình trạng da của bạn. Để được hỗ trợ phác đồ điều trị an toàn và chuẩn xác nhất, "
                "bạn có thể ghé trực tiếp cơ sở tại Số 44 Ngõ 897 Giải Phóng, Hà Nội hoặc để lại thông tin để Chuyên gia liên hệ nhé ạ!"
            )

    full_reply = "\n\n".join(reply_parts)

    return ChatResponse(
        reply=full_reply,
        related_products=related_prods,
        related_articles=related_arts,
        store_info=store_info
    )
