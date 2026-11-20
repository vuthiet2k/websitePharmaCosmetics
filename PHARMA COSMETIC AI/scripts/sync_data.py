"""
Module đồng bộ và trích xuất dữ liệu thật từ websitePharmaCosmetics vào PHARMA COSMETIC AI:
1. Thông tin cửa hàng thật (Địa chỉ, Hotline, Cơ sở trị liệu từ configs/settings_data.json)
2. Danh mục 93 bài viết y khoa thật (từ data/articles-data.json)
3. Danh mục sản phẩm & hoạt chất (từ data/products-data.json)
"""
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_REPO = os.path.dirname(BASE_DIR)

def sync_knowledge_base():
    # 1. Đọc settings_data.json lấy thông tin cửa hàng thật
    settings_file = os.path.join(ROOT_REPO, 'configs', 'settings_data.json')
    store_info = {}
    if os.path.exists(settings_file):
        with open(settings_file, 'r', encoding='utf-8') as f:
            cfg = json.load(f).get('current', {})
            store_info = {
                "address": cfg.get("store_address") or "Số 44 Ngõ 897 Giải Phóng, Hoàng Mai, Hà Nội",
                "phone": cfg.get("store_phone") or "0967.194.063",
                "hotline": cfg.get("contact_zalo") or "0967.194.063",
                "clinic_name": "Skin Health Beauty - Phòng trị liệu da 1:1",
                "map_url": "https://maps.app.goo.gl/..."
            }

    kb_items = [
        {
            "id": "KB-STORE-01",
            "category": "Cửa hàng & Chi nhánh",
            "title": "Địa chỉ cơ sở và Phòng trị liệu chuyên sâu Pharma Cosmetics",
            "content": f"Cơ sở chính và Phòng trị liệu 1:1 Skin Health Beauty: Số 44 Ngõ 897 Giải Phóng, Hoàng Mai, Hà Nội. Hotline / Zalo đặt lịch tư vấn: {store_info.get('phone')} hoặc 0965.594.399. Khách hàng tại Hà Nội được Chuyên gia Da liễu trực tiếp soi da và lập phác đồ cá nhân hóa 1:1."
        }
    ]

    # 2. Đọc 93 bài viết thật từ data/articles-data.json
    articles_file = os.path.join(ROOT_REPO, 'data', 'articles-data.json')
    if os.path.exists(articles_file):
        with open(articles_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for art in data.get('articles', []):
                alias = art.get('alias', '')
                blog = art.get('blog', 'tin-tuc')
                url = f"/blogs/{blog}/{alias}"
                title = art.get('title', '')
                summary = art.get('summary', '') or ''
                kb_items.append({
                    "id": f"KB-ART-{alias}",
                    "category": f"Bài viết y khoa ({blog})",
                    "title": title,
                    "url": url,
                    "content": f"Bài viết: {title}. Tóm tắt: {summary}. Đường dẫn đọc chi tiết trên website: {url}"
                })

    # 3. Đọc mẫu các sản phẩm chủ lực và vấn đề da
    products_file = os.path.join(ROOT_REPO, 'data', 'products-data.json')
    if os.path.exists(products_file):
        with open(products_file, 'r', encoding='utf-8') as f:
            prods = json.load(f)
            # Lấy 150 sản phẩm tiêu biểu có tags vấn đề da rõ ràng
            for p in prods[:150]:
                title = p.get('n', '')
                alias = p.get('a', '')
                vendor = p.get('v', '')
                tags = p.get('g', [])
                url = f"/products/{alias}"
                kb_items.append({
                    "id": f"KB-PROD-{p.get('i')}",
                    "category": "Sản phẩm",
                    "title": title,
                    "url": url,
                    "content": f"Sản phẩm: {title} của thương hiệu {vendor}. Phù hợp với tình trạng: {', '.join(tags[:6])}. Xem chi tiết tại: {url}"
                })

    out_file = os.path.join(BASE_DIR, 'data', 'knowledge_base.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(kb_items, f, ensure_ascii=False, indent=2)

    print(f"Đã đồng bộ {len(kb_items)} mục tri thức thật vào {out_file}")

if __name__ == '__main__':
    sync_knowledge_base()

