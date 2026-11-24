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
from app.hybrid_rag import fold, get_rag_engine, tokenize

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
SMALL = frozenset("xin chao hello hi hey alo ban oi a nhe nha ad admin shop em anh chi minh cam on thanks thank tks ok oke vang da bye tam biet".split())
GENERIC = frozenset("gi lam nao tot nhat nen dung giup tu van san pham cho toi minh ban co the duoc nhung cac mot sao nhu khong hay la va cua ve voi em anh chi oi a nhe nha hoi can muon".split())
HELP_RE = re.compile(r"(lam duoc gi|lam nhung gi|lam gi|giup duoc gi|giup gi|co the lam|chuc nang|ban la ai|ho tro gi|huong dan|su dung nhu the nao|ban biet gi)")
BOOK_RE = re.compile(r"(dat lich|hen lich|lich hen|dat hen|gap chuyen gia|tu van truc tiep|kham truc tiep|dang ky kham|dang ky tu van)")
SKIN_RE = re.compile(r"(soi da|phan tich da|kiem tra da|quiz|loai da cua|xac dinh loai da|tinh trang da cua|chan doan da)")
STOP_WORDS = frozenset("la va cua cho toi minh em anh chi co khong the nao nhu bi duoc can muon hay mot nhung cac thi ma voi de o tai".split())
STORE_WORDS = frozenset("dia chi co so dau chi nhanh showroom phong tri lieu skin health giai phong hotline so dien thoai lien he gio mo cua dong zalo ha noi hoang mai ngo ngach website web phong kham hang cho toi minh em anh la va the nao nhu duoc khong co o tai ban oi vay a nhe nha di ve".split())  # từ thuộc câu hỏi về cửa hàng (+ từ đệm) — nếu mọi từ đều nằm ở đây thì không gợi ý SP/bài viết
STORE_KEYS = ("dia chi", "co so", "o dau", "chi nhanh", "showroom", "phong tri lieu", "skin health", "giai phong",
              "hotline", "so dien thoai", "lien he", "gio mo cua", "mo cua", "dong cua", "zalo")

# 24/11/2026 (kiểm thử điểm mù AI) — khớp cloudflare/src/index.js:
# Cảnh báo đỏ: thai kỳ/cho con bú hoặc phản ứng cấp ⇒ KHÔNG gợi ý sản phẩm, chuyển Chuyên gia / cơ sở y tế.
RED_RE = re.compile(r"\b(mang thai|co thai|dang bau|mang bau|co bau|thai ky|bau bi|cho con bu|nuoi con bu|"
                    r"sung do|sung tay|sung mat|sung moi|sung mi|bi sung|phu ne|phu mat|kho tho|tuc nguc|"
                    r"noi me day|me day|phat ban|chay mu|ri dich|do rat|rat bong|bong rat|nong rat|"
                    r"bi di ung|di ung nang|bi kich ung|kich ung nang|chay mau)\b")
# Câu hỏi mua bán/chính sách: không bịa chính sách ⇒ chỉ dẫn hotline/Zalo + mục Chính sách ở cuối trang.
FAQ_RE = re.compile(r"\b(giao hang|ship|cod|van chuyen|phi ship|thanh toan|chuyen khoan|tra gop|doi tra|doi hang|"
                    r"tra hang|hoan tien|bao hanh|chinh hang|hang that|hang gia|hang fake|nguon goc|xuat xu|"
                    r"con hang|het hang|khuyen mai|ma giam|voucher|don hang|dat hang|mua hang|mua online)\b")
# Từ đệm/mua bán/tán gẫu: không tính là «từ khoá thật» khi tìm sản phẩm (tránh «giao hàng» ra sản phẩm có chữ «hàng»)
NOISE = frozenset(("giao hang ship cod van chuyen phi thanh toan khoan tra gop doi hoan tien bao hanh chinh that gia "
                   "fake nguon goc xuat xu con het khuyen mai giam voucher don dat mua online "
                   "hom nay qua troi dep moi vao dang roi lan biet vay sao nhieu luc nhe sdt email so dinh danh").split())
PII_TAG_RE = re.compile(r"\[(SĐT|email|số định danh) đã ẩn\]")


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
    needs_contact: bool = False


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

    # 24/11/2026: bỏ nhãn «[SĐT đã ẩn]»… trước khi tìm — trước đây nhãn này sinh từ khoá «sdt da an» ⇒ ra sản phẩm lạc đề
    query = PII_TAG_RE.sub(" ", mask_pii(last.content))
    folded = fold(query)
    rag = get_rag_engine()

    # 23/11/2026: nhận diện Ý ĐỊNH trước khi gợi ý sản phẩm/bài viết — khớp cloudflare/src/index.js
    # Thứ tự: red (cảnh báo y tế) > book > skin > faq (mua bán/chính sách) > help (chào / câu không có từ khoá thật)
    toks = re.findall(r"[a-z0-9]+", folded)
    content = [t for t in dict.fromkeys(toks) if t not in SMALL and t not in GENERIC and t not in STOP_WORDS and t not in NOISE]
    has_store_key = any(k in folded for k in STORE_KEYS)
    is_faq = bool(FAQ_RE.search(folded))
    intent = ""
    if RED_RE.search(folded):
        intent = "red"
    elif BOOK_RE.search(folded):
        intent = "book"
    elif SKIN_RE.search(folded):
        intent = "skin"
    elif is_faq and not content:
        intent = "faq"
    elif not has_store_key and not is_faq and (HELP_RE.search(folded) or not content):
        intent = "help"
    store_info = STORE if (STORE and (has_store_key or intent in ("book", "red", "faq"))) else None
    store_only = bool(store_info) and all(t in STORE_WORDS for t in toks)
    no_suggest = bool(intent) or store_only or not content

    def pick(cat: str, k: int) -> List[Dict[str, str]]:
        # Ngưỡng liên quan: tiêu đề phải chứa ≥1 từ khoá thật của câu hỏi (điểm BM25 tuyệt đối không tách được câu lạc đề)
        cs = set(content)
        hits = [d for d in rag.search(" ".join(content), 8, cat) if cs & set(tokenize(d["title"]))]
        return [{"title": d["title"], "url": d["url"]} for d in hits[:k]]

    products = [] if no_suggest else pick("Sản phẩm", 3)
    articles = [] if no_suggest else pick("Bài viết", 2)
    book_url = (STORE or {}).get("booking_url") or "/dat-lich-tu-van"
    skin_url = os.getenv("SKIN_PAGE_URL", "/kham-da-ai").rstrip("/")
    expert = settings.EXPERT_TITLE

    parts: List[str] = []
    needs_contact = False  # true ⇒ trang chat hiện số hotline + nút Zalo
    if intent == "red":
        parts.append(f"Dạ, trường hợp này (đang mang thai/cho con bú, hoặc da có dấu hiệu sưng, rát, dị ứng) em không gợi ý "
                     f"sản phẩm được ạ. Bạn nên **tạm ngừng sản phẩm đang dùng** và liên hệ {expert} để được tư vấn trực tiếp.")
        parts.append("Nếu sưng nhiều, khó thở, tức ngực hoặc nổi mề đay toàn thân, bạn hãy **đến cơ sở y tế gần nhất ngay**.")
        needs_contact = True
    elif intent == "help":
        thanks = re.search(r"(cam on|thanks|thank|tks)", folded)
        hello = re.search(r"(xin chao|chao|hello|\bhi\b|hey|alo)", folded)
        parts.append("Dạ không có gì ạ. Cần gì thêm bạn cứ hỏi em nhé." if thanks else "Dạ chào bạn ạ." if hello else "Dạ em là trợ lý tra cứu của Pharma Cosmetics ạ.")
        parts.append("\n".join([
            "Em có thể giúp bạn:",
            "- **Địa chỉ, giờ mở cửa, hotline** của cửa hàng",
            "- **Soi da bằng ảnh hoặc camera**: bấm dấu **+** cạnh ô nhập",
            f"- **Làm quiz xác định loại da**: [Làm quiz]({skin_url}?tab=quiz)",
            "- **Gợi ý sản phẩm, bài viết** khi bạn nói tình trạng da hoặc hoạt chất quan tâm (ví dụ «mụn ẩn», «retinol»)",
            f"- **Đặt lịch với {expert}**: [Đặt lịch tư vấn]({book_url})"]))
    elif intent == "skin":
        parts.append("\n".join([
            "Em hỗ trợ soi da theo 2 cách:",
            "- **Gửi ảnh hoặc bật camera ngay trong khung chat**: bấm dấu **+** cạnh ô nhập (ảnh được phân tích ngay trên thiết bị của bạn, không gửi đi đâu)",
            f"- **Làm quiz** trả lời vài câu hỏi để biết loại da: [Làm quiz]({skin_url}?tab=quiz)"]))
        parts.append(f"Kết quả chỉ để tham khảo. Muốn có phác đồ phù hợp, bạn nên đặt lịch với {expert}: [Đặt lịch tư vấn]({book_url})")
    elif intent == "book":
        parts.append(f"Để được tư vấn trực tiếp, bạn đặt lịch với {expert} ạ:")
    if is_faq and intent != "red":
        parts.append("Về giao hàng, thanh toán, đổi trả, nguồn gốc hàng và tình trạng còn hàng: chính sách có thể thay đổi theo "
                     "thời điểm nên em không trả lời thay được ạ. Bạn vui lòng gọi **hotline/Zalo** bên dưới hoặc xem mục "
                     "**Chính sách** ở cuối trang website nhé.")
        needs_contact = True
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
        needs_contact = True
    parts.append("Thông tin chỉ mang tính tham khảo, không thay thế tư vấn trực tiếp từ " + settings.EXPERT_TITLE + ".")

    reply = "\n\n".join(parts)
    ok, _ = check_medical_compliance(reply)
    if not ok:
        reply, products, articles = SAFE_FALLBACK, [], []
        needs_contact = True

    return ChatResponse(reply=reply, related_products=products, related_articles=articles, store_info=store_info, needs_contact=needs_contact)
