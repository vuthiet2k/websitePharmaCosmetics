"""
MCP (Model Context Protocol) & Realtime Function Calling Tools
Tra cứu thông tin động từ Sapo POS / ERP: Tồn kho, Giá niêm yết, Tạo đơn hàng có xác thực OTP.
"""
from typing import Dict, Any, List

def query_sapo_inventory_and_price(sku_or_name: str) -> Dict[str, Any]:
    """
    Tra cứu tồn kho và giá niêm yết thực tế từ phần mềm quản lý Sapo.
    Tool này ngăn ngừa hoàn toàn hiện tượng AI báo sai giá hoặc sai khuyến mại.
    """
    # Demo mock kết nối thực tế với POS Sapo
    mock_catalog = {
        "BIOTRADE-HYDRO": {
            "title": "Biotrade Keratolin Hydro Body Lotion 8% Urea 400ml",
            "price": 650000,
            "sale_price": 585000,
            "inventory": 42,
            "status": "Còn hàng",
            "branches": ["Cơ sở 1: Hoàng Mai, Hà Nội", "Kho tổng: Giao hàng toàn quốc"]
        },
        "MEDIK8-R6": {
            "title": "Medik8 Crystal Retinal 6 (0.06% Retinal)",
            "price": 1850000,
            "sale_price": 1850000,
            "inventory": 15,
            "status": "Còn hàng",
            "branches": ["Cơ sở 1: Hoàng Mai, Hà Nội"]
        }
    }
    
    key = sku_or_name.upper().strip()
    for k, v in mock_catalog.items():
        if k in key or key in v["title"].upper():
            return {
                "success": True,
                "data": v
            }
            
    return {
        "success": False,
        "message": f"Không tìm thấy mã sản phẩm hoặc tên '{sku_or_name}' trong kho dữ liệu thời gian thực."
    }

def create_draft_order_with_otp(phone: str, items: List[Dict[str, Any]], otp_code: str = None) -> Dict[str, Any]:
    """
    Tạo đơn hàng dự thảo (Draft Order).
    Tuân thủ Luật Giao dịch điện tử 2023: Yêu cầu xác thực OTP trước khi chốt đơn hợp đồng.
    """
    if not otp_code or otp_code != "123456": # Mock OTP demo
        return {
            "success": False,
            "requires_otp": True,
            "message": "Cần nhập mã OTP 6 số đã gửi về số điện thoại khách hàng để xác thực giao dịch."
        }
    
    return {
        "success": True,
        "order_id": "ORD-SAPO-99882",
        "status": "Đã tạo đơn thành công",
        "phone": phone[:3] + "****" + phone[-3:],
        "message": "Đơn hàng đã được ghi nhận trên hệ thống Sapo. Chuyên viên sẽ gọi xác nhận trong 15 phút."
    }

TOOL_DEFINITIONS = [
    {
        "name": "query_sapo_inventory_and_price",
        "description": "Tra cứu tồn kho, mức giá niêm yết và chi nhánh còn hàng từ hệ thống Sapo POS thời gian thực.",
        "parameters": {
            "type": "object",
            "properties": {
                "sku_or_name": {
                    "type": "string",
                    "description": "Tên sản phẩm hoặc mã SKU cần tra cứu"
                }
            },
            "required": ["sku_or_name"]
        }
    },
    {
        "name": "create_draft_order_with_otp",
        "description": "Tạo đơn hàng dự thảo khi khách hàng đồng ý mua, yêu cầu xác thực OTP để bảo đảm tính pháp lý.",
        "parameters": {
            "type": "object",
            "properties": {
                "phone": {"type": "string", "description": "Số điện thoại nhận hàng"},
                "items": {"type": "array", "description": "Danh sách sản phẩm và số lượng"},
                "otp_code": {"type": "string", "description": "Mã xác thực OTP"}
            },
            "required": ["phone", "items"]
        }
    }
]
