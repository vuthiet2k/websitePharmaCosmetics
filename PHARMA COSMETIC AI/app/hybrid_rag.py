"""
Tìm kiếm tri thức BM25 thuần Python (chỉ cần thư viện chuẩn) — chạy được trên gói miễn phí.

Điểm khác bản cũ:
- Chuẩn hoá tiếng Việt: chữ thường, bỏ dấu (đ→d), tách theo ký tự chữ/số ⇒ «mụn ẩn», «mun an», «Mụn,» đều khớp nhau.
- Chỉ mục ngược (inverted index): mỗi truy vấn chỉ duyệt các tài liệu có chứa từ khoá, không quét toàn bộ.
- Tiêu đề được tính trọng số cao hơn nội dung.
- Có lọc theo nhóm (sản phẩm / bài viết) để luôn lấy đủ mỗi loại.
"""
import json
import math
import os
import re
import unicodedata
from collections import defaultdict
from typing import Any, Dict, List, Optional

_TOKEN = re.compile(r"[a-z0-9]+")
_STOP = {"la", "va", "cua", "cho", "toi", "minh", "em", "anh", "chi", "co", "khong", "the", "nao", "nhu",
         "bi", "duoc", "can", "muon", "hay", "mot", "nhung", "cac", "thi", "ma", "voi", "de", "o", "tai"}


def fold(text: str) -> str:
    """Chữ thường + bỏ dấu tiếng Việt."""
    text = (text or "").lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def tokenize(text: str) -> List[str]:
    return [t for t in _TOKEN.findall(fold(text)) if t not in _STOP]


class LocalHybridRAG:
    K1 = 1.5
    B = 0.75
    TITLE_BOOST = 3  # tiêu đề lặp 3 lần khi lập chỉ mục

    def __init__(self, data_file: Optional[str] = None):
        self.documents: List[Dict[str, Any]] = []
        self.postings: Dict[str, List[tuple]] = defaultdict(list)  # từ -> [(doc_idx, tf)]
        self.doc_len: List[int] = []
        self.idf: Dict[str, float] = {}
        self.avgdl = 1.0
        if data_file and os.path.exists(data_file):
            self.load_data(data_file)

    def load_data(self, data_file: str) -> None:
        with open(data_file, "r", encoding="utf-8") as f:
            self.documents = json.load(f)
        self.postings = defaultdict(list)
        self.doc_len = []
        for idx, doc in enumerate(self.documents):
            toks = tokenize(doc.get("title", "")) * self.TITLE_BOOST + tokenize(doc.get("content", ""))
            self.doc_len.append(len(toks))
            tf: Dict[str, int] = defaultdict(int)
            for t in toks:
                tf[t] += 1
            for t, n in tf.items():
                self.postings[t].append((idx, n))
        n_docs = len(self.documents) or 1
        self.avgdl = (sum(self.doc_len) / n_docs) or 1.0
        self.idf = {t: math.log(1 + (n_docs - len(p) + 0.5) / (len(p) + 0.5)) for t, p in self.postings.items()}

    def search(self, query: str, top_k: int = 4, category_prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.documents:
            return []
        scores: Dict[int, float] = defaultdict(float)
        for q in set(tokenize(query)):
            idf = self.idf.get(q)
            if not idf:
                continue
            for idx, freq in self.postings[q]:
                if category_prefix and not self.documents[idx].get("category", "").startswith(category_prefix):
                    continue
                norm = freq + self.K1 * (1 - self.B + self.B * self.doc_len[idx] / self.avgdl)
                scores[idx] += idf * freq * (self.K1 + 1) / norm
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:top_k]
        out = []
        for idx, sc in ranked:
            doc = dict(self.documents[idx])
            doc["score"] = round(sc, 4)
            out.append(doc)
        return out


_engine: Optional[LocalHybridRAG] = None


def get_rag_engine() -> LocalHybridRAG:
    global _engine
    if _engine is None:
        from app.config import settings
        base = os.path.join(os.path.dirname(__file__), "..")
        path = settings.KNOWLEDGE_FILE if os.path.isabs(settings.KNOWLEDGE_FILE) else os.path.join(base, settings.KNOWLEDGE_FILE)
        _engine = LocalHybridRAG(path)
    return _engine
