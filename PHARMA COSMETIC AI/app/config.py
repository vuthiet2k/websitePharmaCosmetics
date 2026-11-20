import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Pharma Cosmetics Local AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # LLM Engine config (vLLM / SGLang / Local server)
    LLM_API_BASE: str = os.getenv("LLM_API_BASE", "http://localhost:8001/v1")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "EMPTY")
    TEMPERATURE: float = 0.2
    MAX_TOKENS: int = 1024
    
    # Vector DB & Embeddings
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", 6333))
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    COLLECTION_NAME: str = "pharma_knowledge"
    
    # Redis Cache
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", 6379))
    SEMANTIC_CACHE_ENABLED: bool = True
    CACHE_SIMILARITY_THRESHOLD: float = 0.92

    # Tuân thủ pháp lý & Dược mỹ phẩm (ANTI-FAB & Quy chuẩn y tế)
    EXPERT_TITLE: str = "Chuyên gia Da liễu" # Cấm mạo nhận Bác sĩ nếu không đủ giấy phép CKI/CKII
    STRICT_ANTI_HALLUCINATION: bool = True

settings = Settings()
