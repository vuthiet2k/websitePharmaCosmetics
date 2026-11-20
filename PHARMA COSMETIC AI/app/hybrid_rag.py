"""
Hybrid Search (Qdrant Vector Search + BM25 Lexical Keyword Search)
Khôi phục tri thức chính xác cho hoạt chất và sản phẩm y khoa.
"""
import os
import json
from typing import List, Dict, Any
from rank_bm25 import BM25Okapi

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
            
        # Tách từ phục vụ BM25
        self.corpus = [doc["content"].lower().split() for doc in self.documents]
        self.bm25 = BM25Okapi(self.corpus)

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Truy xuất lai kết hợp từ khóa chính xác và ngữ cảnh"""
        if not self.bm25 or not self.documents:
            return []
            
        tokenized_query = query.lower().split()
        scores = self.bm25.get_scores(tokenized_query)
        
        # Sắp xếp theo điểm BM25 cao nhất
        ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
        
        results = []
        for idx in ranked_indices:
            if scores[idx] > 0.1: # Ngưỡng relevance
                doc = self.documents[idx].copy()
                doc["score"] = float(scores[idx])
                results.append(doc)
                
        return results

# Singleton instance
rag_engine = None

def get_rag_engine() -> LocalHybridRAG:
    global rag_engine
    if rag_engine is None:
        path = os.path.join(os.path.dirname(__file__), "..", "data", "knowledge_base.json")
        rag_engine = LocalHybridRAG(path)
    return rag_engine
