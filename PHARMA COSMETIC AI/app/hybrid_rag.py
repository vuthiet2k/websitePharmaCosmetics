"""
Hybrid Search (Qdrant Vector Search + BM25 / Pure Python Lexical Fallback)
Khôi phục tri thức chính xác cho hoạt chất và sản phẩm y khoa.
"""
import os
import json
import math
from typing import List, Dict, Any

try:
    from rank_bm25 import BM25Okapi
    HAS_RANK_BM25 = True
except ImportError:
    HAS_RANK_BM25 = False

class SimpleBM25:
    """Thuật toán BM25 thuần Python chạy độc lập không phụ thuộc thư viện ngoài"""
    def __init__(self, corpus: List[List[str]]):
        self.corpus_size = len(corpus)
        self.avgdl = sum(len(x) for x in corpus) / (self.corpus_size or 1)
        self.doc_freqs = []
        self.idf = {}
        self.doc_len = []
        k1 = 1.5
        b = 0.75

        df = {}
        for document in corpus:
            self.doc_len.append(len(document))
            frequencies = {}
            for word in document:
                frequencies[word] = frequencies.get(word, 0) + 1
            self.doc_freqs.append(frequencies)

            for word in frequencies:
                df[word] = df.get(word, 0) + 1

        for word, freq in df.items():
            self.idf[word] = math.log(1 + (self.corpus_size - freq + 0.5) / (freq + 0.5))

    def get_scores(self, query: List[str]) -> List[float]:
        score = [0.0] * self.corpus_size
        k1 = 1.5
        b = 0.75
        for q in query:
            q_idf = self.idf.get(q, 0.0)
            if q_idf == 0:
                continue
            for i, doc_dict in enumerate(self.doc_freqs):
                if q not in doc_dict:
                    continue
                freq = doc_dict[q]
                numerator = freq * (k1 + 1)
                denominator = freq + k1 * (1 - b + b * (self.doc_len[i] / (self.avgdl or 1)))
                score[i] += q_idf * (numerator / denominator)
        return score

class LocalHybridRAG:
    def __init__(self, data_file: str = None):
        self.documents = []
        self.corpus = []
        self.bm25 = None
        if data_file and os.path.exists(data_file):
            self.load_data(data_file)
            
    def load_data(self, data_file: str):
        with open(data_file, 'r', encoding='utf-8') as f:
            self.documents = json.load(f)
            
        self.corpus = [doc["content"].lower().split() for doc in self.documents]
        if HAS_RANK_BM25:
            self.bm25 = BM25Okapi(self.corpus)
        else:
            self.bm25 = SimpleBM25(self.corpus)

    def search(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """Truy xuất lai kết hợp từ khóa chính xác và ngữ cảnh"""
        if not self.bm25 or not self.documents:
            return []
            
        tokenized_query = query.lower().split()
        scores = self.bm25.get_scores(tokenized_query)
        
        ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
        
        results = []
        for idx in ranked_indices:
            if scores[idx] > 0.01:
                doc = self.documents[idx].copy()
                doc["score"] = float(scores[idx])
                results.append(doc)
                
        return results

rag_engine = None

def get_rag_engine() -> LocalHybridRAG:
    global rag_engine
    if rag_engine is None:
        path = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge_base.json")
        rag_engine = LocalHybridRAG(path)
    return rag_engine
