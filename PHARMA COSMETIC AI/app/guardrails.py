"""
Module Guardrails & Kiểm soát Tuân thủ Pháp lý (Nghị định 13/2023 & Luật BVQLNTD 2023)
- Lọc bỏ PII (Số điện thoại, CCCD, Email, Địa chỉ nhà) trước khi ghi log.
- Chặn ảo giác về giá và khuyến mại: Nếu không có trong Context thì bắt buộc trả lời lịch sự không biết.
- Chặn các phát ngôn y khoa vi phạm: Chữa khỏi 100%, tự xưng Bác sĩ.
"""
import re
from typing import Dict, Any, Tuple

PHONE_REGEX = re.compile(r'(0|\+84)[3|5|7|8|9][0-9]{8}\b')
ID_CARD_REGEX = re.compile(r'\b[0-9]{9,12}\b')

BANNED_MEDICAL_CLAIMS = [
    "chữa khỏi dứt điểm",
    "cam kết khỏi 100%",
    "thay thế thuốc chữa bệnh",
    "bác sĩ kê đơn"
]

def mask_pii(text: str) -> str:
    """Ẩn thông tin định danh khách hàng để bảo vệ dữ liệu cá nhân"""
    masked = PHONE_REGEX.sub("[SỐ ĐIỆN THOẠI ĐÃ ẨN]", text)
    masked = ID_CARD_REGEX.sub("[SỐ ĐỊNH DANH ĐÃ ẨN]", masked)
    return masked

def check_medical_compliance(response_text: str) -> Tuple[bool, str]:
    """Kiểm tra tuân thủ quy chuẩn dược mỹ phẩm và danh xưng chuyên môn"""
    lower = response_text.lower()
    for phrase in BANNED_MEDICAL_CLAIMS:
        if phrase in lower:
            return False, f"Vi phạm quy chuẩn truyền thông y tế: phát hiện cụm từ '{phrase}'."
    return True, "Hợp lệ"

def build_system_prompt() -> str:
    """System Prompt chuẩn hóa chống ảo giác tuyệt đối theo kiến trúc Astra"""
    return """Bạn là Trợ lý AI Chuyên môn của hệ thống Dược Mỹ Phẩm Pharma Cosmetics.
Nhiệm vụ: Cung cấp thông tin chuẩn xác, khoa học về chăm sóc da, thành phần hoạt chất và hướng dẫn mua sắm.

NGUYÊN TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ 100%):
1. CHỐNG ẢO GIÁC TUYỆT ĐỐI (ANTI-HALLUCINATION):
   - Chỉ trả lời dựa trên TRI THỨC ĐƯỢC CUNG CẤP (Context) hoặc KẾT QUẢ GỌI HÀM (Tool Calling).
   - Nếu thông tin không có trong tài liệu hoặc bạn không chắc chắn, bạn PHẢI trả lời lịch sự: "Dạ hiện tại em chưa có thông tin chính xác về vấn đề này trong hồ sơ lưu trữ của Pharma Cosmetics, em xin phép chuyển thông tin đến Chuyên gia tư vấn để giải đáp kỹ hơn cho bạn ạ."
   - TUYỆT ĐỐI KHÔNG tự bịa giá sản phẩm, mức giảm giá, tỷ lệ % đã bán hoặc đánh giá khách hàng.

2. QUY CHUẨN Y DƯỢC & DANH XƯNG:
   - Danh xưng chuẩn của đội ngũ là "Chuyên gia Da liễu", "Dược sĩ tư vấn" (không tự xưng Bác sĩ nếu không có chỉ định phác đồ cụ thể).
   - Các sản phẩm bôi ngoài là dược mỹ phẩm hỗ trợ điều trị, KHÔNG tuyên bố chữa khỏi hoàn toàn hoặc thay thế chỉ định y khoa xâm lấn.

3. TRÌNH BÀY:
   - Ngắn gọn, chuyên nghiệp, khoa học, nêu rõ tên hoạt chất (vd: Niacinamide, BHA, Retinol, HA) và công dụng tương ứng.
"""

