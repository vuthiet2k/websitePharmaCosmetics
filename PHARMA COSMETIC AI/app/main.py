"""
FastAPI Server Gateway cho PHARMA COSMETICS LOCAL AI
Tích hợp:
1. Endpoint chat tư vấn bán lẻ y khoa có Hybrid RAG & MCP.
2. Endpoint tra cứu tồn kho / giá Sapo thời gian thực.
3. Bộ lọc PII và bảo vệ pháp lý theo Nghị định 13/2023 & Luật BVQLNTD 2023.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.config import settings
from app.guardrails import mask_pii, check_medical_compliance, build_system_prompt
from app.hybrid_rag import get_rag_engine
from app.mcp_tools import query_sapo_inventory_and_price, create_draft_order_with_otp

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
    sources: List[Dict[str, Any]] = []
    tool_calls: Optional[List[Dict[str, Any]]] = None

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "engine": settings.LLM_MODEL_NAME,
        "compliance": "Nghị định 13/2023/NĐ-CP & Luật BVQLNTD 2023 Active"
    }

@app.post(f"{settings.API_V1_PREFIX}/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Danh sách tin nhắn không được rỗng.")

    user_query = request.messages[-1].content
    masked_query = mask_pii(user_query) # Lọc PII bảo vệ khách hàng
    
    # 1. Kiểm tra intent gọi tool thời gian thực (Giá & Tồn kho Sapo)
    lower_query = user_query.lower()
    tool_results = []
    if any(k in lower_query for k in ["giá", "bao nhiêu", "còn hàng", "tồn kho"]):
        for kw in ["biotrade", "retinal", "urea", "medik8"]:
            if kw in lower_query:
                res = query_sapo_inventory_and_price(kw)
                if res.get("success"):
                    tool_results.append(res)
                    break

    # 2. Hybrid RAG - Tra cứu tri thức chuẩn
    rag = get_rag_engine()
    retrieved_docs = rag.search(masked_query, top_k=2)
    
    # 3. Tổng hợp phản hồi (Nếu có kết quả tool Sapo thì ưu tiên phản hồi chính xác 100%)
    if tool_results:
        item = tool_results[0]["data"]
        reply = (
            f"Dạ theo dữ liệu thời gian thực từ hệ thống kho Pharma Cosmetics:\n"
            f"- Sản phẩm: **{item['title']}**\n"
            f"- Giá niêm yết: **{item['sale_price']:,}đ** (Giá gốc: {item['price']:,}đ)\n"
            f"- Tình trạng: **{item['status']}** (Còn {item['inventory']} sản phẩm tại {item['branches'][0]})\n\n"
            f"Bạn có muốn chuyên viên hỗ trợ tạo đơn giữ hàng ngay không ạ?"
        )
    elif retrieved_docs:
        doc = retrieved_docs[0]
        reply = f"{doc['content']}\n\n*(Thông tin trích dẫn từ tài liệu chuyên môn: {doc['title']} - Pharma Cosmetics)*"
    else:
        # Cơ chế Chống Ảo Giác: Không biết thì xin lỗi và từ chối bịa đặt
        reply = (
            "Dạ hiện tại em chưa tìm thấy thông tin chính xác về nội dung này trong tài liệu y khoa lưu trữ của Pharma Cosmetics. "
            "Để đảm bảo an toàn tuyệt đối cho làn da, em xin phép ghi nhận câu hỏi và chuyển đến Chuyên gia Da liễu tư vấn chi tiết cho bạn nhé ạ!"
        )

    # 4. Kiểm tra tuân thủ y khoa lần cuối
    is_valid, msg = check_medical_compliance(reply)
    if not is_valid:
        reply = "Dạ thông tin đang được cập nhật lại theo quy chuẩn dược mỹ phẩm an toàn."

    return ChatResponse(
        reply=reply,
        sources=[{"id": d.get("id"), "title": d.get("title")} for d in retrieved_docs],
        tool_calls=tool_results if tool_results else None
    )

@app.post(f"{settings.API_V1_PREFIX}/inventory")
def check_inventory(sku_or_name: str):
    """API trực tiếp tra cứu tồn kho qua Sapo"""
    return query_sapo_inventory_and_price(sku_or_name)
