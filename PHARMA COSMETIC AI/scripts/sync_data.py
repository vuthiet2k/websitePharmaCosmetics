"""
Đồng bộ dữ liệu THẬT từ website vào gói AI. Chạy lại mỗi khi nội dung website đổi, rồi commit 2 file sinh ra:
  - data/store_info.json    : địa chỉ, hotline, giờ mở cửa lấy từ configs/settings_data.json (không gõ tay)
  - data/knowledge_base.json: cửa hàng + toàn bộ bài viết + toàn bộ sản phẩm (tên, thương hiệu, loại, từ khoá). KHÔNG chứa giá.

Dùng:  python scripts/sync_data.py
"""
import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_REPO = os.path.dirname(BASE_DIR)


def _read(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _strip_html(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or "")).strip()


def build_store():
    cfg = _read(os.path.join(ROOT_REPO, "configs", "settings_data.json")).get("current", {})
    raw_addr = cfg.get("store_address") or ""
    m = re.search(r"Địa chỉ\s*:\s*(.+)", raw_addr, re.IGNORECASE)
    address = (m.group(1) if m else raw_addr).strip()
    phones = [p for p in [cfg.get("store_phone"), cfg.get("dat_lich_hotline")] if p]
    store = {
        "clinic_name": "Skin Health Beauty - Phòng trị liệu da 1:1 (Pharma Cosmetics)",
        "address": address,
        "phone": " / ".join(dict.fromkeys(phones)),
        "hours": cfg.get("about_contact_hours") or "",
        "booking_url": "/dat-lich-tu-van",
    }
    missing = [k for k in ("address", "phone") if not store[k]]
    if missing:
        raise SystemExit(f"Thiếu dữ liệu cửa hàng trong settings_data.json: {missing}")
    return store


def build_kb(store):
    items = [{
        "id": "KB-STORE-01", "category": "Cửa hàng", "title": "Địa chỉ và phòng trị liệu Pharma Cosmetics",
        "url": "/dat-lich-tu-van",
        "content": f"Địa chỉ {store['address']}. Hotline Zalo {store['phone']}. Giờ mở cửa {store['hours']}. Phòng trị liệu da 1:1 Skin Health Beauty.",
    }]

    for art in _read(os.path.join(ROOT_REPO, "data", "articles-data.json")).get("articles", []):
        alias, blog = art.get("alias", ""), art.get("blog", "tin-tuc")
        title, summary = art.get("title", ""), _strip_html(art.get("summary"))
        tags = ", ".join(art.get("tags") or [])
        items.append({
            "id": f"KB-ART-{alias}", "category": f"Bài viết ({blog})", "title": title,
            "url": f"/blogs/{blog}/{alias}", "content": f"{summary} {tags}".strip(),
        })

    for p in _read(os.path.join(ROOT_REPO, "data", "products-data.json")):
        if not p.get("a") or not p.get("n"):
            continue
        tags = ", ".join(p.get("g") or [])
        items.append({
            "id": f"KB-PROD-{p.get('i')}", "category": "Sản phẩm", "title": p["n"], "url": f"/products/{p['a']}",
            "content": f"{p.get('v', '')} {p.get('t', '')} {tags}".strip(),
        })
    return items


def main():
    store = build_store()
    kb = build_kb(store)
    os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)
    with open(os.path.join(BASE_DIR, "data", "store_info.json"), "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)
    with open(os.path.join(BASE_DIR, "data", "knowledge_base.json"), "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, separators=(",", ":"))
    print(f"OK: {len(kb)} mục tri thức, thông tin cửa hàng: {store['address']} | {store['phone']} | {store['hours']}")


if __name__ == "__main__":
    main()
