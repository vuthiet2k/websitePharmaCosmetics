"""Cấu hình đọc từ biến môi trường (an toàn cho nền tảng miễn phí: không file bí mật, không dịch vụ phụ)."""
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Pharma Cosmetics AI Tra cứu"
    VERSION: str = "1.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # production ⇒ tắt /docs, /openapi.json
    APP_ENV: str = "production"

    # Domain được gọi API (CSV). VD: "https://pharmacosmetics-vn.com,https://www.pharmacosmetics-vn.com".
    # Để trống ⇒ KHÔNG cho trình duyệt nào gọi chéo domain (an toàn mặc định).
    ALLOWED_ORIGINS: str = ""

    # Giới hạn chống lạm dụng (bản miễn phí, công khai)
    RATE_LIMIT_PER_MIN: int = 20
    MAX_MESSAGES: int = 20
    MAX_CHARS: int = 500
    # true khi chạy sau proxy của nền tảng (Render/HF/Cloud Run): lấy IP khách từ X-Forwarded-For
    TRUST_PROXY: bool = False

    # Tri thức (do scripts/sync_data.py sinh ra từ dữ liệu website, commit kèm khi deploy)
    KNOWLEDGE_FILE: str = "data/knowledge_base.json"
    STORE_FILE: str = "data/store_info.json"

    # Danh xưng chuẩn theo RULE-P0-02 (không dùng «Bác sĩ»)
    EXPERT_TITLE: str = "Chuyên gia"

    @property
    def origins(self) -> List[str]:
        return [o.strip().rstrip("/") for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
