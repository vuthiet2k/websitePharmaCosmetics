import os
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
CHAT_CASES = ["chào shop, mình mới vào", "hôm nay trời đẹp quá", "0967194063"]
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
