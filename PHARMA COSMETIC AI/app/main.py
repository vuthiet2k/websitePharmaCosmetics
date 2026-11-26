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
GENERIC = frozenset("gi lam nao tot nhat nen dung giup tu van san pham cho toi minh ban co the duoc nhung cac mot sao nhu khong hay la va cua ve voi em anh chi oi a nhe nha hoi can muon may".split())  # 24/11/2026 SPEC-AI-CHAT-TONE-01 vòng 2 (E3): «mấy loại serum» không thành từ khoá «mày»
HELP_RE = re.compile(r"(lam duoc gi|lam nhung gi|lam gi|giup duoc gi|giup gi|co the lam|chuc nang|ban la ai|ho tro gi|huong dan|su dung nhu the nao|ban biet gi)")
BOOK_RE = re.compile(r"(dat lich|hen lich|lich hen|dat hen|gap chuyen gia|tu van truc tiep|kham truc tiep|dang ky kham|dang ky tu van)")
SKIN_RE = re.compile(r"(soi da|phan tich da|kiem tra da|quiz|loai da cua|xac dinh loai da|tinh trang da cua|chan doan da)")
STOP_WORDS = frozenset("la va cua cho toi minh em anh chi co khong the nao nhu bi duoc can muon hay mot nhung cac thi ma voi de o tai".split())
STORE_WORDS = frozenset("dia chi co so dau chi nhanh showroom phong tri lieu skin health giai phong hotline so dien thoai lien he gio mo cua dong zalo ha noi hoang mai ngo ngach website web phong kham hang cho toi minh em anh la va the nao nhu duoc khong co o tai ban oi vay a nhe nha di ve shop may chu nhat thu ngay le tet cuoi tuan lam viec sdt dt ko hai bay sau nam 2 3 4 5 6 7".split())  # từ thuộc câu hỏi về cửa hàng (+ từ đệm) — nếu mọi từ đều nằm ở đây thì không gợi ý SP/bài viết
STORE_KEYS = ("dia chi", "co so", "o dau", "chi nhanh", "showroom", "phong tri lieu", "skin health", "giai phong",
              "hotline", "so dien thoai", "lien he", "gio mo cua", "mo cua", "dong cua", "zalo",
              "cua hang", "sdt shop", "sdt cua hang", "sdt ben", "so dt", "gio lam viec")

# 24/11/2026 (kiểm thử điểm mù AI) — khớp cloudflare/src/index.js:
# Cảnh báo đỏ: thai kỳ/cho con bú hoặc phản ứng cấp ⇒ KHÔNG gợi ý sản phẩm, chuyển Chuyên gia / cơ sở y tế.
RED_RE = re.compile(r"\b(mang thai|co thai|dang bau|mang bau|co bau|thai ky|bau bi|cho con bu|nuoi con bu|"
                    r"sung do|sung tay|sung mat|sung moi|sung mi|bi sung|phu ne|phu mat|kho tho|tuc nguc|"
                    r"noi me day|me day|phat ban|chay mu|ri dich|rat bong|bong rat|nong rat|"
                    r"bi di ung|di ung nang|bi kich ung|kich ung nang|chay mau|noi man|man do|man ngua|ngua rat)\b|"
                    r"(?:^\W*|\b(?:bi|da|mat|moi|tay|mi|co|vung|xong|sau|vao|boi|thoa|nam|than|lung) )do rat\b|\b(?:bi|da|mat|moi|tay|mi|co|vung|xong|sau|vao|boi|thoa|nam|than|lung) rat do\b|"
                    r"\bbi rat(?= (?:do|ngua|bong|sung|rat|khi|sau|luc|va|o|mat|moi|tay|co|chan|lung|tran)\b|\W*$)")  # 24/11/2026 SPEC-AI-CHAT-TONE-01 AC-01.3: «bôi xong bị rát đỏ» trước lọt cảnh báo
# 24/11/2026 SPEC-AI-CHAT-TONE-01 vòng 2 (E2): «bị rất»/«rất dở»/«đó rất» bỏ dấu trùng «bị rát»/«rát đỏ»/«đỏ rát» ⇒ chuyển sang allow-list
# Câu hỏi mua bán/chính sách: không bịa chính sách ⇒ chỉ dẫn hotline/Zalo + mục Chính sách ở cuối trang.
FAQ_RE = re.compile(r"\b(giao hang|ship|cod|van chuyen|phi ship|thanh toan|chuyen khoan|tra gop|doi tra|doi hang|"
                    r"tra hang|hoan tien|bao hanh|chinh hang|hang that|hang gia|hang fake|nguon goc|xuat xu|"
                    r"con hang|het hang|khuyen mai|ma giam|voucher|don hang|dat hang|mua hang|mua online|giao bao lau|ship bao lau|bao lau nhan|"
                    r"giao ngoai|giao tinh|giao xa|giao noi thanh|giao toan quoc|cam ket gi|bao dam gi)\b")  # 24/11/2026 SPEC-AI-CHAT-TONE-01 vòng 2 (BUG-01, E10): «giao ngoại tỉnh», «shop cam kết gì» là câu hỏi chính sách
# Từ đệm/mua bán/tán gẫu: không tính là «từ khoá thật» khi tìm sản phẩm (tránh «giao hàng» ra sản phẩm có chữ «hàng»)
NOISE = frozenset(("giao hang ship cod van chuyen phi thanh toan khoan tra gop doi hoan tien bao hanh chinh that gia "
                   "fake nguon goc xuat xu con het khuyen mai giam voucher don dat mua online "
                   "hom nay qua troi dep moi vao dang roi lan biet vay sao nhieu luc nhe sdt email so dinh danh").split())
PII_TAG_RE = re.compile(r"\[(SĐT|email|số định danh) đã ẩn\]")

# ---------- 24/11/2026 SPEC-AI-CHAT-TONE-01: ý định mới + giọng điệu (PHẢI khớp cloudflare/src/index.js từng ký tự) ----------
# Thứ tự ưu tiên: red > claim > book > skin > callback > faq > price > store > bye > thanks > ack > vent > greet/help > product > nomatch
# (vent đặt trước greet/help: «da tệ quá» chỉ gồm từ đệm nên nếu để sau sẽ rơi vào menu; câu chào kèm từ khoá thật vẫn ra product)
CLAIM_RE = re.compile(r"(chua khoi|khoi han|khoi hoan toan|dut diem|bao lau (thi |se )?(khoi|het)|co khoi (khong|duoc)|khoi duoc khong|"
                      r"\bco het (khong|duoc khong|mun|nam|tham|seo|ngua|benh|nhan|nep))", re.A)
COMMIT_RE = re.compile(r"\b(cam ket|bao dam)\b", re.A)  # chỉ tính là «hỏi cam kết kết quả» khi KHÔNG phải câu hỏi chính sách (vd «cam kết chính hãng»)
# OQ-6: dấu hiệu thuốc kê đơn trong tiêu đề (đã bỏ dấu). Bản JS: RX_RE trong cloudflare/src/index.js — phải giống hệt.
RX_RE = re.compile(r"\bke don\b|isotretinoin|\bthuoc\b|acuroff|goesing|finpecia|clindatre")
DOCTOR_RE = re.compile(r"(bac si|duoc si|chuyen gia|tu van vien)", re.A)
DOCASK_RE = re.compile(r"(\bco\b(?![a-z0-9 ]*\bkhuyen\b)[a-z0-9 ]*\bkhong\b|\bgap\b|\bhoi\b|noi chuyen)", re.A)
CB_RE = re.compile(r"(goi lai|lien he lai|lien lac lai|de lai so|goi cho (em|minh|toi)|tu van qua (dien thoai|sdt|zalo)|goi dien (cho|lai))", re.A)
CB_WORDS = frozenset("goi lai lien he lac de so cho dien thoai qua tu van sdt em minh toi nhe nha nhan tin ngay som sau vui long xin ho tro".split())
PRICE_RE = re.compile(r"((?<!chuyen )\bgia\b(?! hoa| dinh| vi| han| tang)|bao nhieu(?! tuoi| lan| ngay| lau| phut| gio| thang| phan tram)|\btien\b)", re.A)
PRICE_WORDS = frozenset("tien ca bang dong vnd re mac dat".split())
FAQ_FILL = frozenset("chua cam ket bao dam tinh bang gi may ngay lau bao ngoai thanh noi pho toan quoc hcm sg sai gon ha huyen mat".split())  # từ đệm của câu hỏi giao hàng/thanh toán («giao hàng tỉnh», «thanh toán bằng gì»)
HOURS_RE = re.compile(r"(\b(chu nhat|ngay le|ngay tet|cuoi tuan|thu (2|3|4|5|6|7|hai|ba|bay|sau|nam))\b[a-z0-9 ]{0,20}\b(mo|lam|ban|dong)\b|"
                      r"\bco (mo|lam|ban) (cua )?(khong|ko)\b|\bmay gio (mo|dong|lam|ban)\b|\bgio (mo|dong|lam)\b|\bmay gio\W*$)", re.A)
WEEKEND_RE = re.compile(r"(chu nhat|ngay le|ngay tet|cuoi tuan)", re.A)
SOCIAL_RE = re.compile(r"\b(thoi em di day|thoi di day|bai bai|hen gap lai|chao nhe|di day|chuc ngu ngon|thank you|goodbye|good bye)\b", re.A)
BYE_RE = re.compile(r"\b(thoi em di day|thoi di day|tam biet|bye|bai bai|hen gap lai|chao nhe|di day|chuc ngu ngon|goodbye|good bye)\b", re.A)
THANKS_RE = re.compile(r"\b(cam on|camon|thanks|thank|thank you|tks|thks)\b", re.A)
GREET_RE = re.compile(r"\b(xin chao|chao|hello|hi|hey|alo)\b", re.A)
VENT_RE = re.compile(r"\b(huhu|hu hu|hic|chan qua|chan da|chan nan|da (minh |em )?(xau|te)|tu ti|buon qua|buon vi|that vong|met moi qua|stress|lo lang)\b", re.A)
VENT_WORDS = frozenset("huhu hic chan xau nan buon that vong met stress lang".split())
ACK_CORE = frozenset("ok oke okie oki okay vang u uh um uhm hmm hm uk ukm roi da o".split())
ACK_FILL = frozenset("em shop ad a nhe nha ne duoc ha ak ah".split())
KEEP2 = frozenset("ha uv ph bb cc".split())  # chữ ≤2 ký tự vẫn là từ khoá thật (HA, UV, pH, BB/CC cream); còn lại («u», «ừ», «ờ») bị bỏ
NOISE = NOISE | frozenset("camon thks okie oki okay uh um uhm hmm hm uk ukm ak ah".split())
# 24/11/2026 SPEC-AI-CHAT-TONE-01 vòng 2 (BUG-02, E4, E5/E6): cụm KHÔNG phải từ khoá sản phẩm — danh xưng (bác sĩ…), thứ/ngày, «gọi lại/gọi điện» («gọi» ≈ «gội»)
NONKEY_RE = re.compile(r"\b(?:(?:bac si|duoc si|chuyen gia|tu van vien)(?: da lieu)?|chu nhat|cuoi tuan|ngay le|ngay tet|thu (?:2|3|4|5|6|7|hai|ba|bay|sau|nam)|goi (?:dien(?: thoai)?|lai|cho|ngay|giup|minh|em|toi))\b", re.A)

# Chuỗi giọng điệu — HẰNG SỐ (không random) để hai bản ra cùng chữ. Xưng hô «em – bạn». Giữ nguyên các chuỗi `must` của tests/scenarios.json.
HELP_MENU_HEAD = "Em có thể giúp bạn:"
GREET_FIRST = "Dạ em chào bạn ạ. Em là trợ lý tra cứu của Pharma Cosmetics."
GREET_ASK = "Bạn đang quan tâm vấn đề da nào ạ?"
GREET_AGAIN = "Dạ em chào bạn ạ. Bạn đang quan tâm vấn đề da nào, cứ nhắn em nhé."
HELP_INTRO = "Dạ em là trợ lý tra cứu của Pharma Cosmetics ạ."
THANKS_REPLY = "Dạ không có gì ạ, em rất vui được hỗ trợ bạn. Cần gì thêm bạn cứ nhắn em nhé."
BYE_REPLY = "Dạ em cảm ơn bạn đã ghé Pharma Cosmetics ạ. Chúc bạn một ngày vui, cần gì bạn cứ quay lại nhắn em nhé."
ACK_REPLY = "Dạ vâng ạ. Bạn cần em hỗ trợ thêm gì cứ nhắn em nhé."
PRODUCT_OPEN = "Dạ, em tìm được vài gợi ý liên quan để bạn tham khảo ạ:"
PRODUCT_OPEN_GREET = "Dạ em chào bạn ạ. Em tìm được vài gợi ý liên quan để bạn tham khảo ạ:"
PRODUCT_OPEN_ALSO = "Em cũng tìm được vài gợi ý liên quan để bạn tham khảo ạ:"
PRODUCT_CLOSE = "Bạn muốn em gợi ý kỹ hơn theo loại da, hay đặt lịch với {expert} để được tư vấn trực tiếp ạ?"
PRICE_NOTE = "Giá có thể thay đổi theo thời điểm, bạn bấm vào từng sản phẩm để xem giá mới nhất ạ."
PRICE_ASK = ("Dạ giá sản phẩm thay đổi theo thời điểm nên em không báo giá trực tiếp ạ. Bạn đang quan tâm sản phẩm nào hoặc vấn đề da gì, "
             "em gửi đường dẫn để bạn xem giá mới nhất nhé.")
STORE_OPEN = "Dạ, thông tin cửa hàng bên em đây ạ:"
STORE_CLOSE = "Bạn cần em hỗ trợ thêm gì cứ nhắn em nhé."
FAQ_REPLY = ("Dạ, về giao hàng, thanh toán, đổi trả, nguồn gốc và tình trạng còn hàng, chính sách có thể thay đổi theo thời điểm nên em không "
             "trả lời thay được ạ. Bạn gọi hoặc nhắn **hotline/Zalo** bên dưới, hoặc xem mục **Chính sách** ở cuối trang website nhé.")
FAQ_MIXED = ("Về giao hàng, thanh toán, đổi trả, nguồn gốc và tình trạng còn hàng, chính sách có thể thay đổi theo thời điểm nên em không "
             "trả lời thay được ạ. Bạn gọi hoặc nhắn **hotline/Zalo** bên dưới, hoặc xem mục **Chính sách** ở cuối trang website nhé.")
BOOK_REPLY = "Dạ, bên em có {expert} tư vấn trực tiếp ạ. Bạn đặt lịch giúp em tại đây nhé:"
CALLBACK_REPLY = ("Dạ, để bảo vệ thông tin của bạn, em đã ẩn số điện thoại/email bạn gửi và không lưu lại ạ. Em chưa tự liên hệ lại được, "
                  "bạn gọi hoặc nhắn **hotline/Zalo** bên dưới để được hỗ trợ nhanh nhất nhé.")
PII_NOTE = "Em đã ẩn số điện thoại/email bạn gửi để bảo vệ thông tin của bạn ạ."
CLAIM_REPLY = ("Dạ, hiệu quả phụ thuộc cơ địa và mức độ của từng người nên em không thể cam kết kết quả ạ. Bạn nên đặt lịch với {expert} "
               "để được đánh giá và tư vấn lộ trình phù hợp nhé.")
VENT_REPLY = ("Dạ em hiểu, da chưa như ý thật dễ khiến bạn lo lắng ạ. Bạn kể giúp em da đang gặp vấn đề gì (ví dụ mụn, thâm, nám, khô, nhạy cảm) "
              "để em gợi ý sát hơn, hoặc soi da bằng ảnh: bấm dấu **+** cạnh ô nhập nhé.")
NOMATCH_REPLY = ("Dạ em chưa tìm thấy thông tin phù hợp với câu hỏi này ạ. Bạn thử mô tả cụ thể hơn (ví dụ loại da, vấn đề mụn, nám, khô) "
                 "hoặc liên hệ {expert} để được tư vấn trực tiếp nhé.")
DISCLAIMER = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn trực tiếp từ {expert}."
# Câu miễn trừ chỉ gắn khi có SP/bài viết hoặc ý định nội dung sức khoẻ (AC-02.10, OQ-3)
DISCLAIMER_INTENTS = ("red", "skin", "claim", "nomatch", "blocked")


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
    intent: str = ""  # 24/11/2026 SPEC-AI-CHAT-TONE-01 AC-01.2: trường thêm mới (red, claim, book, skin, callback, faq, price, store, bye, thanks, ack, greet, help, vent, product, nomatch, blocked)


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
    masked = mask_pii(last.content)
    has_pii = bool(PII_TAG_RE.search(masked))
    query = PII_TAG_RE.sub(" ", masked)
    folded = fold(query)
    rag = get_rag_engine()
    expert = settings.EXPERT_TITLE

    # 24/11/2026 SPEC-AI-CHAT-TONE-01 AC-03.4: chỉ đọc tin `assistant` để biết đã gửi menu chưa (không đưa tin cũ vào tìm kiếm)
    hist_menu = any(m.role == "assistant" and HELP_MENU_HEAD in m.content for m in body.messages[:-1])

    # 23/11/2026: nhận diện Ý ĐỊNH trước khi gợi ý sản phẩm/bài viết — khớp cloudflare/src/index.js
    toks = re.findall(r"[a-z0-9]+", folded)
    ctoks = re.findall(r"[a-z0-9]+", NONKEY_RE.sub(" ", SOCIAL_RE.sub(" ", folded)))
    is_faq = bool(FAQ_RE.search(folded))
    skip = SMALL | GENERIC | STOP_WORDS | NOISE | (FAQ_FILL if is_faq else frozenset())
    content = [t for t in dict.fromkeys(ctoks)
               if t not in skip and not (len(t) <= 2 and not re.search(r"\d", t) and t not in KEEP2)]
    has_store_key = any(k in folded for k in STORE_KEYS) or bool(HOURS_RE.search(folded))
    is_cb = (has_pii or bool(CB_RE.search(folded))) and not [t for t in content if t not in CB_WORDS]
    price_only = bool(PRICE_RE.search(folded)) and not [t for t in content if t not in PRICE_WORDS]
    store_ask = bool(STORE) and has_store_key and (not content or all(t in STORE_WORDS for t in toks))
    vent_only = bool(VENT_RE.search(folded)) and not [t for t in content if t not in VENT_WORDS]
    is_ack = bool(toks) and all(t in ACK_CORE or t in ACK_FILL for t in toks) and any(t in ACK_CORE for t in toks)

    intent = ""
    if RED_RE.search(folded):
        intent = "red"
    elif CLAIM_RE.search(folded) or (COMMIT_RE.search(folded) and not is_faq):
        intent = "claim"
    elif BOOK_RE.search(folded) or (DOCTOR_RE.search(folded) and DOCASK_RE.search(folded)):
        intent = "book"
    elif SKIN_RE.search(folded):
        intent = "skin"
    elif is_cb:
        intent = "callback"
    elif is_faq and not content:
        intent = "faq"
    elif price_only:
        intent = "price"
    elif store_ask:
        intent = "store"
    elif not content and BYE_RE.search(folded):
        intent = "bye"
    elif not content and THANKS_RE.search(folded):
        intent = "thanks"
    elif not content and is_ack:
        intent = "ack"
    elif vent_only:
        intent = "vent"
    elif not content:
        intent = "greet" if (GREET_RE.search(folded) and not HELP_RE.search(folded)) else "help"

    store_info = STORE if (STORE and (has_store_key or intent in ("book", "red", "faq", "claim", "callback"))) else None

    def pick(cat: str, k: int) -> List[Dict[str, str]]:
        # Ngưỡng liên quan: tiêu đề phải chứa ≥1 từ khoá thật của câu hỏi (điểm BM25 tuyệt đối không tách được câu lạc đề)
        cs = set(content)
        hits = [d for d in rag.search(" ".join(content), 8, cat) if cs & set(tokenize(d["title"]))]
        if cat == "Sản phẩm":  # 24/11/2026 AC-01.5 (OQ-2): không bao giờ gợi ý SP «kê đơn» trong chat
            hits = [d for d in hits if not RX_RE.search(fold(d["title"]))]
        return [{"title": d["title"], "url": d["url"]} for d in hits[:k]]

    products: List[Dict[str, str]] = []
    articles: List[Dict[str, str]] = []
    if not intent:
        products = pick("Sản phẩm", 3)
        articles = pick("Bài viết", 2)
        if products or articles:
            intent = "product"
        elif VENT_RE.search(folded):
            intent = "vent"
        elif store_info:
            intent = "store"
        else:
            intent = "nomatch"
    if intent not in ("store", "book", "red", "faq", "claim", "callback", "product"):
        store_info = None  # intent không in khối cửa hàng ⇒ không trả store_info

    book_url = (STORE or {}).get("booking_url") or "/dat-lich-tu-van"
    skin_url = os.getenv("SKIN_PAGE_URL", "/kham-da-ai").rstrip("/")

    def store_block(si: Dict[str, Any]) -> str:
        lines = [f"**{si.get('clinic_name', 'Pharma Cosmetics')}**"]
        if si.get("address"):
            lines.append(f"- Địa chỉ: {si['address']}")
        if si.get("phone"):
            lines.append(f"- Hotline/Zalo: {si['phone']}")
        if si.get("hours"):
            lines.append(f"- Giờ mở cửa: {si['hours']}")
        lines.append(f"- Đặt lịch với {expert}: [Đặt lịch tư vấn]({si.get('booking_url', '/dat-lich-tu-van')})")
        return "\n".join(lines)

    menu = "\n".join([
        HELP_MENU_HEAD,
        "- **Địa chỉ, giờ mở cửa, hotline** của cửa hàng",
        "- **Soi da bằng ảnh hoặc camera**: bấm dấu **+** cạnh ô nhập",
        f"- **Làm quiz xác định loại da**: [Làm quiz]({skin_url}?tab=quiz)",
        "- **Gợi ý sản phẩm, bài viết** khi bạn nói tình trạng da hoặc hoạt chất quan tâm (ví dụ «mụn ẩn», «retinol»)",
        f"- **Đặt lịch với {expert}**: [Đặt lịch tư vấn]({book_url})"])

    parts: List[str] = []
    needs_contact = intent in ("red", "claim", "callback", "faq", "nomatch")  # true ⇒ trang chat hiện số hotline + nút Zalo
    if intent == "red":
        parts.append(f"Dạ, trường hợp này (đang mang thai/cho con bú, hoặc da có dấu hiệu sưng, rát, dị ứng) em không gợi ý "
                     f"sản phẩm được ạ. Bạn nên **tạm ngừng sản phẩm đang dùng** và liên hệ {expert} để được tư vấn trực tiếp.")
        parts.append("Nếu sưng nhiều, khó thở, tức ngực hoặc nổi mề đay toàn thân, bạn hãy **đến cơ sở y tế gần nhất ngay**.")
        if store_info:
            parts.append(store_block(store_info))
    elif intent == "claim":
        parts.append(CLAIM_REPLY.replace("{expert}", expert))
        if store_info:
            parts.append(store_block(store_info))
    elif intent == "book":
        parts.append(BOOK_REPLY.replace("{expert}", expert))
        if store_info:
            parts.append(store_block(store_info))
    elif intent == "skin":
        parts.append("\n".join([
            "Dạ, em hỗ trợ soi da theo 2 cách:",
            "- **Gửi ảnh hoặc bật camera ngay trong khung chat**: bấm dấu **+** cạnh ô nhập (ảnh được phân tích ngay trên thiết bị của bạn, không gửi đi đâu)",
            f"- **Làm quiz** trả lời vài câu hỏi để biết loại da: [Làm quiz]({skin_url}?tab=quiz)"]))
        parts.append(f"Kết quả chỉ để tham khảo. Muốn có phác đồ phù hợp, bạn nên đặt lịch với {expert}: [Đặt lịch tư vấn]({book_url})")
    elif intent == "callback":
        parts.append(CALLBACK_REPLY)
        if store_info:
            parts.append(store_block(store_info))
    elif intent == "faq":
        parts.append(FAQ_REPLY)
        if store_info:
            parts.append(store_block(store_info))
    elif intent == "price":
        parts.append(PRICE_ASK)
    elif intent == "store":
        parts.append(STORE_OPEN)
        if store_info:
            parts.append(store_block(store_info))
        # chỉ nói «mở chủ nhật/ngày lễ» khi suy được từ store.hours (ANTI-FAB)
        hours_f = fold((store_info or {}).get("hours", ""))
        weekend = ""
        if WEEKEND_RE.search(folded) and "chu nhat" in hours_f:
            weekend = "Bên em mở cả chủ nhật và ngày lễ ạ. " if "ngay le" in hours_f else "Bên em mở cả chủ nhật ạ. "
        parts.append(weekend + STORE_CLOSE)
    elif intent == "bye":
        parts.append(BYE_REPLY)
    elif intent == "thanks":
        parts.append(THANKS_REPLY)
    elif intent == "ack":
        parts.append(ACK_REPLY)
    elif intent == "vent":
        parts.append(VENT_REPLY)
    elif intent == "greet":
        if hist_menu:
            parts.append(GREET_AGAIN)  # đã gửi menu trong phiên ⇒ chào ngắn, không lặp menu
        else:
            parts.extend([GREET_FIRST, menu, GREET_ASK])
    elif intent == "help":
        parts.extend([HELP_INTRO, menu])
    elif intent == "product":
        if store_info:
            parts.append(STORE_OPEN)
            parts.append(store_block(store_info))
            parts.append(PRODUCT_OPEN_ALSO)
        else:
            parts.append(PRODUCT_OPEN_GREET if GREET_RE.search(folded) else PRODUCT_OPEN)
        if PRICE_RE.search(folded):
            parts.append(PRICE_NOTE)  # hỏi giá: không báo số tiền, chỉ dẫn xem tại trang sản phẩm
        if products:
            parts.append("**Sản phẩm tham khảo** (xem giá và thành phần chi tiết tại trang sản phẩm):\n"
                         + "\n".join(f"- [{p['title']}]({p['url']})" for p in products))
        if articles:
            parts.append("**Bài viết tham khảo**:\n" + "\n".join(f"- [{a['title']}]({a['url']})" for a in articles))
        if is_faq:
            parts.append(FAQ_MIXED)
            needs_contact = True
        parts.append(PRODUCT_CLOSE.replace("{expert}", expert))
        if has_pii:
            parts.append(PII_NOTE)
    else:  # nomatch
        parts.append(NOMATCH_REPLY.replace("{expert}", expert))
    if products or articles or intent in DISCLAIMER_INTENTS:
        parts.append(DISCLAIMER.replace("{expert}", expert))

    reply = "\n\n".join(parts)
    ok, _ = check_medical_compliance(reply)
    if not ok:
        reply, products, articles = SAFE_FALLBACK, [], []
        needs_contact = True
        intent = "blocked"

    return ChatResponse(reply=reply, related_products=products, related_articles=articles, store_info=store_info,
                        needs_contact=needs_contact, intent=intent)
