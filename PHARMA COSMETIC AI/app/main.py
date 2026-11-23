"""
API tra cứu Pharma Cosmetics (FastAPI, không cần GPU/DB — chạy được trên gói miễn phí).

- Trả lời địa chỉ / hotline / giờ mở cửa từ dữ liệu cửa hàng thật (data/store_info.json, do sync_data.py sinh từ cấu hình website).
- Gợi ý sản phẩm và bài viết liên quan bằng BM25 trên dữ liệu website (kèm đường dẫn thật). KHÔNG đưa giá/tồn kho/khuyến mại:
  giá đổi theo thời gian nên chỉ dẫn khách vào trang sản phẩm.
- Che SĐT/email/CMND trước khi xử lý; không ghi nội dung khách nhập vào log.
- Giới hạn: CORS theo domain khai báo, rate limit theo IP, giới hạn số tin & độ dài.
"""
import json
import os
import re
import time
from collections import defaultdict, deque
from typing import Any, Deque, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.guardrails import SAFE_FALLBACK, check_medical_compliance, mask_pii
from app.hybrid_rag import fold, get_rag_engine

_docs_on = settings.APP_ENV != "production"
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs" if _docs_on else None,
    redoc_url=None,
    openapi_url="/openapi.json" if _docs_on else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# ---------- Dữ liệu cửa hàng ----------
def _load_store() -> Optional[Dict[str, Any]]:
    base = os.path.join(os.path.dirname(__file__), "..")
    path = settings.STORE_FILE if os.path.isabs(settings.STORE_FILE) else os.path.join(base, settings.STORE_FILE)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


STORE = _load_store()
STORE_WORDS = frozenset("dia chi co so dau chi nhanh showroom phong tri lieu skin health giai phong hotline so dien thoai lien he gio mo cua dong zalo ha noi hoang mai ngo ngach website web phong kham hang cho toi minh em anh la va the nao nhu duoc khong co o tai ban oi vay a nhe nha di ve".split())  # từ thuộc câu hỏi về cửa hàng (+ từ đệm) — nếu mọi từ đều nằm ở đây thì không gợi ý SP/bài viết
STORE_KEYS = ("dia chi", "co so", "o dau", "chi nhanh", "showroom", "phong tri lieu", "skin health", "giai phong",
              "hotline", "so dien thoai", "lien he", "gio mo cua", "mo cua", "dong cua", "zalo")


# ---------- Giới hạn tần suất (trong bộ nhớ, đủ cho 1 instance miễn phí) ----------
_hits: Dict[str, Deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    if settings.TRUST_PROXY:
        xff = request.headers.get("x-forwarded-for", "")
        if xff:
            return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit(ip: str) -> None:
    now = time.monotonic()
    q = _hits[ip]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= settings.RATE_LIMIT_PER_MIN:
        raise HTTPException(status_code=429, detail="Bạn gửi quá nhanh, vui lòng thử lại sau ít phút.")
    q.append(now)
    if len(_hits) > 5000:  # tránh phình bộ nhớ
        for k in [k for k, v in _hits.items() if not v or now - v[-1] > 60]:
            _hits.pop(k, None)


# ---------- Mô hình ----------
class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., max_length=2000)


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
    related_products: List[Dict[str, Any]] = []
    related_articles: List[Dict[str, Any]] = []
    store_info: Optional[Dict[str, Any]] = None


@app.get("/")
def health_check():
    return {"status": "online", "service": settings.PROJECT_NAME, "version": settings.VERSION}


@app.get("/healthz")
def healthz():
    return {"ok": True, "documents": len(get_rag_engine().documents), "store": bool(STORE)}


@app.post(f"{settings.API_V1_PREFIX}/chat", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest, request: Request):
    _rate_limit(_client_ip(request))
    if not body.messages or len(body.messages) > settings.MAX_MESSAGES:
        raise HTTPException(status_code=400, detail="Số lượng tin nhắn không hợp lệ.")
    last = body.messages[-1]
    if last.role != "user" or not last.content.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn cuối phải là câu hỏi của khách.")
    if len(last.content) > settings.MAX_CHARS:
        raise HTTPException(status_code=400, detail=f"Câu hỏi tối đa {settings.MAX_CHARS} ký tự.")

    query = mask_pii(last.content)
    folded = fold(query)
    rag = get_rag_engine()

    store_info = STORE if (STORE and any(k in folded for k in STORE_KEYS)) else None
    # 23/11/2026: câu hỏi CHỈ về cửa hàng (địa chỉ / giờ mở cửa / hotline) ⇒ không kèm sản phẩm, bài viết (trước đây kèm vài mục không liên quan)
    store_only = bool(store_info) and all(t in STORE_WORDS for t in re.findall(r"[a-z0-9]+", folded))
    products = [] if store_only else [{"title": d["title"], "url": d["url"]} for d in rag.search(query, 3, "Sản phẩm")]
    articles = [] if store_only else [{"title": d["title"], "url": d["url"]} for d in rag.search(query, 2, "Bài viết")]

    parts: List[str] = []
    if store_info:
        lines = [f"**{store_info.get('clinic_name', 'Pharma Cosmetics')}**"]
        if store_info.get("address"):
            lines.append(f"- Địa chỉ: {store_info['address']}")
        if store_info.get("phone"):
            lines.append(f"- Hotline/Zalo: {store_info['phone']}")
        if store_info.get("hours"):
            lines.append(f"- Giờ mở cửa: {store_info['hours']}")
        lines.append(f"- Đặt lịch với {settings.EXPERT_TITLE}: [Đặt lịch tư vấn]({store_info.get('booking_url', '/dat-lich-tu-van')})")
        parts.append("\n".join(lines))
    if products:
        parts.append("**Sản phẩm tham khảo** (xem giá và thành phần chi tiết tại trang sản phẩm):\n"
                     + "\n".join(f"- [{p['title']}]({p['url']})" for p in products))
    if articles:
        parts.append("**Bài viết tham khảo**:\n" + "\n".join(f"- [{a['title']}]({a['url']})" for a in articles))
    if not parts:
        parts.append(SAFE_FALLBACK)
    parts.append("Thông tin chỉ mang tính tham khảo, không thay thế tư vấn trực tiếp từ " + settings.EXPERT_TITLE + ".")

    reply = "\n\n".join(parts)
    ok, _ = check_medical_compliance(reply)
    if not ok:
        reply, products, articles = SAFE_FALLBACK, [], []

    return ChatResponse(reply=reply, related_products=products, related_articles=articles, store_info=store_info)
