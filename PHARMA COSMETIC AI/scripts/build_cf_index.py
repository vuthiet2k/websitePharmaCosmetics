"""
Dựng chỉ mục BM25 đã tính sẵn cho bản chạy trên Cloudflare Workers (gói miễn phí chỉ cho ~10ms CPU / lần gọi ⇒
KHÔNG được dựng chỉ mục lúc chạy). Đầu vào: data/knowledge_base.json + data/store_info.json (do sync_data.py sinh).
Đầu ra (commit kèm): cloudflare/public/idx/*.json và cloudflare/src/store.json.

  idx/meta.json   : {n, avgdl, k1, b, pshards, dshard, len[], cat[]}   cat: 0 = Cửa hàng, 1 = Bài viết, 2 = Sản phẩm
  idx/p<N>.json   : {từ: [doc, tf, doc, tf, ...]}   chia theo băm FNV-1a của từ (phải KHỚP hàm băm trong src/index.js)
  idx/d<K>.json   : [[tiêu đề, url], ...]           mỗi mảnh DSHARD tài liệu liên tiếp

Dùng:  python scripts/build_cf_index.py     (chạy lại mỗi khi sync_data.py sinh dữ liệu mới)
"""
import json
import os
import shutil
import sys
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)

from app.hybrid_rag import LocalHybridRAG  # noqa: E402  (dùng lại đúng fold/tokenize/TITLE_BOOST của bản Python)

PSHARDS = 64
DSHARD = 200
OUT_IDX = os.path.join(BASE, "cloudflare", "public", "idx")
OUT_SRC = os.path.join(BASE, "cloudflare", "src")


def fnv1a(s: str) -> int:
    h = 0x811C9DC5
    for ch in s:  # từ đã bỏ dấu ⇒ chỉ có a-z0-9 (ASCII)
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def cat_code(category: str) -> int:
    if category.startswith("Sản phẩm"):
        return 2
    if category.startswith("Bài viết"):
        return 1
    return 0


def main():
    rag = LocalHybridRAG(os.path.join(BASE, "data", "knowledge_base.json"))
    if not rag.documents:
        raise SystemExit("Thiếu data/knowledge_base.json — chạy scripts/sync_data.py trước.")

    if os.path.isdir(OUT_IDX):
        shutil.rmtree(OUT_IDX)
    os.makedirs(OUT_IDX, exist_ok=True)
    os.makedirs(OUT_SRC, exist_ok=True)

    meta = {
        "n": len(rag.documents),
        "avgdl": rag.avgdl,
        "k1": rag.K1,
        "b": rag.B,
        "pshards": PSHARDS,
        "dshard": DSHARD,
        "len": rag.doc_len,
        "cat": [cat_code(d.get("category", "")) for d in rag.documents],
    }
    with open(os.path.join(OUT_IDX, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, separators=(",", ":"))

    shards = defaultdict(dict)
    for tok, plist in rag.postings.items():
        flat = []
        for idx, tf in plist:
            flat.extend((idx, tf))
        shards[fnv1a(tok) % PSHARDS][tok] = flat
    for k in range(PSHARDS):
        with open(os.path.join(OUT_IDX, f"p{k}.json"), "w", encoding="utf-8") as f:
            json.dump(shards.get(k, {}), f, ensure_ascii=False, separators=(",", ":"))

    n_dshards = (len(rag.documents) + DSHARD - 1) // DSHARD
    for k in range(n_dshards):
        chunk = [[d.get("title", ""), d.get("url", "")] for d in rag.documents[k * DSHARD:(k + 1) * DSHARD]]
        with open(os.path.join(OUT_IDX, f"d{k}.json"), "w", encoding="utf-8") as f:
            json.dump(chunk, f, ensure_ascii=False, separators=(",", ":"))

    shutil.copyfile(os.path.join(BASE, "data", "store_info.json"), os.path.join(OUT_SRC, "store.json"))

    total = sum(os.path.getsize(os.path.join(OUT_IDX, x)) for x in os.listdir(OUT_IDX))
    biggest = max(os.path.getsize(os.path.join(OUT_IDX, x)) for x in os.listdir(OUT_IDX))
    print(f"OK: {meta['n']} tài liệu, {len(rag.postings)} từ, {PSHARDS} mảnh chỉ mục + {n_dshards} mảnh tiêu đề; "
          f"tổng {total/1024:.0f} KB, mảnh lớn nhất {biggest/1024:.0f} KB")


if __name__ == "__main__":
    main()
