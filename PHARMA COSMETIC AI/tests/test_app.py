import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["RATE_LIMIT_PER_MIN"] = "5"
os.environ["ALLOWED_ORIGINS"] = "https://pharmacosmetics-vn.com"

from fastapi.testclient import TestClient  # noqa: E402

from app import main  # noqa: E402
from app.guardrails import check_medical_compliance, mask_pii  # noqa: E402
from app.hybrid_rag import fold, tokenize  # noqa: E402

client = TestClient(main.app)


def chat(text, **kw):
    main._hits.clear()
    return client.post("/api/v1/chat", json={"messages": [{"role": "user", "content": text}]}, **kw)


def test_fold_vietnamese():
    assert fold("Mụn ẩn, Đẹp") == "mun an, dep"
    assert tokenize("Mụn,") == tokenize("mun")


def test_accent_insensitive_search():
    a = chat("kem tri mun").json()
    b = chat("kem trị mụn").json()
    assert a["related_products"] and a["related_products"] == b["related_products"]


def test_products_and_articles_have_real_urls():
    r = chat("serum cho da nám tàn nhang").json()
    assert all(p["url"].startswith("/products/") for p in r["related_products"])
    assert all(a["url"].startswith("/blogs/") for a in r["related_articles"])


def test_store_info_from_real_data():
    r = chat("địa chỉ phòng trị liệu ở đâu").json()
    assert r["store_info"]["address"] == "Số 44 Ngõ 897 Giải Phóng, Hoàng Mai, Hà Nội"
    assert "6h30" in r["reply"]


def test_no_price_or_fake_data():
    r = chat("giá retinol bao nhiêu").json()
    assert "123456" not in r["reply"] and "650000" not in r["reply"]


def test_pii_masking():
    assert "0967194063" not in mask_pii("sdt 0967194063 mail a@b.com")
    assert "a@b.com" not in mask_pii("mail a@b.com")
    assert "0967.194.063" not in mask_pii("gọi 0967.194.063")
    assert "1850000" in mask_pii("giá 1850000 đồng")  # không che giá tiền


def test_compliance_word_boundary():
    assert check_medical_compliance("mai chăm sóc da")[0] is True
    assert check_medical_compliance("AI chăm sóc da cho bạn")[0] is False


def test_validation_limits():
    main._hits.clear()
    assert client.post("/api/v1/chat", json={"messages": []}).status_code == 400
    assert chat("x" * 501).status_code == 400
    assert client.post("/api/v1/chat", json={"messages": [{"role": "system", "content": "hi"}]}).status_code == 422


def test_rate_limit():
    main._hits.clear()
    codes = [client.post("/api/v1/chat", json={"messages": [{"role": "user", "content": "mụn"}]}).status_code for _ in range(7)]
    assert codes[:5] == [200] * 5 and 429 in codes[5:]


def test_cors_only_allowed_origin():
    ok = client.get("/", headers={"Origin": "https://pharmacosmetics-vn.com"})
    bad = client.get("/", headers={"Origin": "https://evil.example"})
    assert ok.headers.get("access-control-allow-origin") == "https://pharmacosmetics-vn.com"
    assert "access-control-allow-origin" not in bad.headers


def test_docs_hidden_in_production():
    assert client.get("/docs").status_code == 404


# ---- 24/11/2026: điểm mù từ báo cáo kiểm thử AI (khớp cloudflare/test/parity.test.mjs) ----
RED_CASES = ["tôi đang mang thai dùng retinol được không", "đang cho con bú dùng serum vitamin c được không",
             "bôi kem xong mặt sưng đỏ rát", "dùng xong bị nổi mề đay, khó thở"]
FAQ_CASES = ["shop có giao hàng không", "thanh toán thế nào", "có ship COD không ạ", "đổi trả thế nào",
             "hàng có chính hãng không", "còn hàng không shop"]
CHAT_CASES = ["chào shop, mình mới vào", "hôm nay trời đẹp quá"]  # 24/11/2026 SPEC-AI-CHAT-TONE-01 AC-03.2(a): «0967194063» chuyển sang ý định callback (xem S40)
REAL_CASES = ["da tôi bị mụn ẩn", "retinol", "kem chống nắng cho da dầu", "lỗ chân lông to", "dầu gội trị gàu"]


def test_red_flag_no_products_and_contact():
    for q in RED_CASES:
        r = chat(q).json()
        assert r["related_products"] == [] and r["related_articles"] == [], q
        assert r["needs_contact"] is True and r["store_info"], q
        assert "cơ sở y tế" in r["reply"] and "Chuyên gia" in r["reply"], q


def test_faq_routes_to_hotline_without_off_topic_products():
    for q in FAQ_CASES:
        r = chat(q).json()
        assert r["related_products"] == [] and r["related_articles"] == [], q
        assert r["needs_contact"] is True and r["store_info"]["phone"], q
        assert "Chính sách" in r["reply"], q


def test_faq_with_real_keyword_still_suggests():
    r = chat("serum vitamin c có chính hãng không").json()
    assert r["related_products"] and r["needs_contact"] is True


def test_small_talk_and_bare_phone_give_help_not_products():
    for q in CHAT_CASES:
        r = chat(q).json()
        assert r["related_products"] == [] and r["related_articles"] == [], q
        assert "Em có thể giúp bạn" in r["reply"], q
    # 24/11/2026 AC-03.2(a): chỉ gửi SĐT ⇒ báo đã ẩn số + hotline/Zalo, không còn ra menu, không gợi ý SP
    r = chat("0967194063").json()
    assert r["intent"] == "callback" and "đã ẩn" in r["reply"] and "0967194063" not in r["reply"]
    assert r["related_products"] == [] and r["needs_contact"] is True


def test_pii_tag_does_not_leak_into_search():
    with_phone = chat("tư vấn retinol, sđt 0967194063").json()
    plain = chat("tư vấn retinol").json()
    assert with_phone["related_products"] == plain["related_products"]
    assert "0967194063" not in with_phone["reply"]


def test_relevance_threshold_title_must_match():
    for q in REAL_CASES:
        r = chat(q).json()
        assert r["related_products"], q
    r = chat("abcxyz không có từ này").json()
    assert r["related_products"] == [] and r["needs_contact"] is True


# ---- 24/11/2026 SPEC-AI-CHAT-TONE-01: kịch bản dùng chung với cloudflare/test/parity.test.mjs + file vàng ----
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
SCEN = json.load(open(os.path.join(TESTS_DIR, "scenarios.json"), encoding="utf-8"))["scenarios"]
GOLDEN_FILE = os.path.join(TESTS_DIR, "golden_replies.json")
INTENTS = {"red", "claim", "book", "skin", "callback", "faq", "price", "store", "bye", "thanks", "ack", "greet", "help", "vent",
           "product", "nomatch", "blocked"}
DISCLAIMER = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn trực tiếp từ Chuyên gia."
DISCLAIMER_INTENTS = {"red", "skin", "claim", "nomatch", "blocked"}
MONEY_RE = re.compile(r"\d[\d.,]*\s*(đ|₫|k|vnđ|nghìn|triệu)", re.I)
EMOJI_RE = re.compile("[\U0001F000-\U0001FAFF\u2190-\u21FF\u2300-\u23FF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D]")
PRIOR_ASSISTANT = "Dạ em chào bạn ạ. Em là trợ lý tra cứu của Pharma Cosmetics.\n\nEm có thể giúp bạn:\n- ..."


def scenario_messages(d):
    msgs = []
    if d["hist"]:
        msgs = [{"role": "user", "content": "xin chào"}, {"role": "assistant", "content": PRIOR_ASSISTANT}]
    return msgs + [{"role": "user", "content": d["q"]}]


def run_scenario(d):
    main._hits.clear()
    resp = client.post("/api/v1/chat", json={"messages": scenario_messages(d)})
    assert resp.status_code == 200, d["id"]
    return resp.json()


def check_scenario(d, r):
    sid, reply = d["id"], r["reply"]
    assert r["intent"] in INTENTS and r["intent"] == d["intent"], f"{sid} intent={r['intent']}"
    assert bool(r["related_products"]) == d["products"], sid
    assert r["needs_contact"] is d["needs_contact"], sid
    assert bool(r["store_info"]) == d["store_info"], sid
    for m in d["must"]:
        assert m in reply, f"{sid} thiếu «{m}»"
    for m in d["must_not"]:
        assert m not in reply, f"{sid} không được chứa «{m}»"
    # luật chung cho mọi dòng (AC-02.1, 02.2, 02.11, 01.11, RULE-P0-02)
    assert reply.startswith("Dạ"), sid
    assert not re.search(r"\b(anh/chị|quý khách)\b", reply, re.I), sid
    assert not EMOJI_RE.search(reply), sid
    assert not MONEY_RE.search(reply), sid
    assert "bác sĩ" not in reply.lower(), sid
    for p in r["related_products"]:
        assert p["url"].startswith("/products/") and "kê đơn" not in p["title"].lower(), sid
    for a in r["related_articles"]:
        assert a["url"].startswith("/blogs/"), sid
    # câu miễn trừ y tế (AC-02.10, OQ-3)
    has_dis = DISCLAIMER in reply
    assert has_dis == bool(r["related_products"] or r["related_articles"] or r["intent"] in DISCLAIMER_INTENTS), sid
    # độ dài / menu (AC-02.3 → 02.6)
    if r["intent"] in ("bye", "thanks", "ack"):
        assert "Em có thể giúp bạn" not in reply and len(reply) <= {"bye": 160, "thanks": 160, "ack": 120}[r["intent"]], sid
    if r["intent"] in ("callback", "claim", "red"):
        assert r["related_products"] == [] and r["related_articles"] == [], sid


def golden_view(r):
    return {"reply": r["reply"], "intent": r["intent"], "related_products": r["related_products"],
            "related_articles": r["related_articles"], "needs_contact": r["needs_contact"], "store_info": bool(r["store_info"])}


def test_scenarios_count_and_ids():
    assert len(SCEN) >= 46 and len({d["id"] for d in SCEN}) == len(SCEN)


def test_scenarios_all_rules():
    results = {}
    for d in SCEN:
        r = run_scenario(d)
        check_scenario(d, r)
        results[d["id"]] = r
    for d in SCEN:  # S41: có SĐT + từ khoá thật ⇒ cùng danh sách SP với câu không SĐT
        if d.get("same_products_as"):
            assert results[d["id"]]["related_products"] == results[d["same_products_as"]]["related_products"], d["id"]


def test_golden_replies_match():
    """File vàng sinh từ bản Python: UPDATE_GOLDEN=1 pytest -k golden. Worker so cùng file này ở parity.test.mjs."""
    current = {d["id"]: golden_view(run_scenario(d)) for d in SCEN}
    if os.environ.get("UPDATE_GOLDEN") == "1":
        with open(GOLDEN_FILE, "w", encoding="utf-8", newline="\n") as f:
            json.dump(current, f, ensure_ascii=False, indent=1)
            f.write("\n")
    golden = json.load(open(GOLDEN_FILE, encoding="utf-8"))
    assert set(golden) == set(current)
    for sid, g in golden.items():
        assert current[sid] == g, sid


def test_response_keeps_old_fields_and_adds_intent():
    r = chat("retinol").json()
    for k in ("reply", "related_products", "related_articles", "store_info", "needs_contact", "intent"):
        assert k in r


def test_never_suggest_prescription_products():
    for q in ["mụn trứng cá nặng dùng thuốc gì", "isotretinoin", "accufine", "trị mụn nặng"]:
        r = chat(q).json()
        assert all("kê đơn" not in p["title"].lower() for p in r["related_products"]), q


def test_greeting_again_does_not_repeat_menu():
    main._hits.clear()
    first = client.post("/api/v1/chat", json={"messages": [{"role": "user", "content": "xin chào"}]}).json()
    assert "Em có thể giúp bạn" in first["reply"]
    msgs = [{"role": "user", "content": "xin chào"}, {"role": "assistant", "content": first["reply"]},
            {"role": "user", "content": "xin chào"}]
    again = client.post("/api/v1/chat", json={"messages": msgs}).json()
    assert again["intent"] == "greet" and "Em có thể giúp bạn" not in again["reply"]


def test_old_user_messages_do_not_leak_into_search():
    # AC-03.4: tin cũ của khách không đi vào tìm kiếm — câu «ok» sau câu hỏi retinol vẫn chỉ là xác nhận
    main._hits.clear()
    msgs = [{"role": "user", "content": "retinol"}, {"role": "assistant", "content": "Dạ, em tìm được..."}, {"role": "user", "content": "ok"}]
    r = client.post("/api/v1/chat", json={"messages": msgs}).json()
    assert r["intent"] == "ack" and r["related_products"] == []
