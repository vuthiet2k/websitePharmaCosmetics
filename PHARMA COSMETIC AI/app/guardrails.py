"""
Guardrails: che thông tin cá nhân trước khi xử lý/ghi log + chặn phát ngôn y khoa vi phạm trong câu trả lời.
"""
import re
from typing import Tuple

# SĐT VN: 0xxxxxxxxx hoặc +84xxxxxxxxx, cho phép dấu chấm/cách/gạch giữa các số
PHONE_REGEX = re.compile(r"(?<!\d)(?:\+?84|0)[35789](?:[\s.\-]?\d){8}(?!\d)")
EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
# CMND 9 số / CCCD 12 số (chỉ che khi đứng riêng, không che giá tiền, mã đơn dài hơn)
ID_CARD_REGEX = re.compile(r"(?<![\d.,])(?:\d{9}|\d{12})(?![\d.,])")

# Cụm bị cấm — khớp theo ranh giới từ (tránh «mai chăm sóc» bị nhận nhầm là «ai chăm sóc»)
BANNED_MEDICAL_CLAIMS = [
    "chữa khỏi dứt điểm",
    "cam kết khỏi 100%",
    "thay thế thuốc chữa bệnh",
    "bác sĩ kê đơn",
    "ai chăm sóc",
    "ai điều trị",
    "ai khám da",
    "ai tư vấn phác đồ",
    "ai thay thế chuyên gia",
]
_BANNED_RE = [(p, re.compile(r"(?<!\w)" + re.escape(p) + r"(?!\w)", re.IGNORECASE)) for p in BANNED_MEDICAL_CLAIMS]

SAFE_FALLBACK = (
    "Dạ em chưa có thông tin phù hợp để trả lời chính xác. Bạn vui lòng liên hệ Chuyên gia của "
    "Pharma Cosmetics để được tư vấn trực tiếp nhé ạ."
)


def mask_pii(text: str) -> str:
    """Che SĐT, email, CMND/CCCD."""
    masked = PHONE_REGEX.sub("[SĐT đã ẩn]", text)
    masked = EMAIL_REGEX.sub("[email đã ẩn]", masked)
    return ID_CARD_REGEX.sub("[số định danh đã ẩn]", masked)


def check_medical_compliance(response_text: str) -> Tuple[bool, str]:
    for phrase, rx in _BANNED_RE:
        if rx.search(response_text):
            return False, f"Phát hiện cụm từ không được dùng: '{phrase}'."
    return True, "Hợp lệ"
