/**
 * data/ingredients.js — REOPEN 2026-09-10 (ADR-007/T-82, MOD-05 xlsx "Tra Cứu Hoạt Chất Y Khoa")
 * Dữ liệu INCI + ma trận tương tác, đọc-only. Mock preview (mock_policy#frontend_theme) — nội
 * dung minh hoạ tổng hợp kiến thức da liễu phổ thông, KHÔNG thay thế tư vấn y khoa trực tiếp
 * (xem disclaimer bắt buộc ở templates/page.tra-cuu-hoat-chat.bwt).
 */

const ingredients = [
  {
    id: 'retinol',
    name: 'Retinol',
    inci_name: 'Retinol',
    group: 'Chống lão hoá / Tái tạo da',
    summary: 'Dẫn xuất Vitamin A, thúc đẩy tái tạo tế bào biểu bì, giảm nếp nhăn và mờ thâm.',
    caution: 'Có thể gây khô/kích ứng khi mới dùng — bắt đầu tần suất thấp (2-3 lần/tuần), luôn dùng kem chống nắng ban ngày.',
    interacts_with: ['vitamin-c', 'aha-bha'],
    interaction_note: 'Tránh dùng CÙNG LÚC với AHA/BHA hoặc Vitamin C nồng độ cao trong 1 buổi — nên tách sáng/tối hoặc luân phiên ngày để giảm kích ứng.',
  },
  {
    id: 'vitamin-c',
    name: 'Vitamin C (Ascorbic Acid)',
    inci_name: 'L-Ascorbic Acid',
    group: 'Chống oxy hoá / Làm sáng da',
    summary: 'Chống oxy hoá mạnh, hỗ trợ làm sáng da và mờ thâm nám, tăng sinh collagen.',
    caution: 'Dễ oxy hoá khi tiếp xúc ánh sáng/không khí — bảo quản kín, dùng trong 3 tháng sau khi mở nắp.',
    interacts_with: ['retinol'],
    interaction_note: 'Nên dùng vào buổi sáng, cách thời điểm dùng Retinol (buổi tối) ít nhất vài giờ.',
  },
  {
    id: 'niacinamide',
    name: 'Niacinamide',
    inci_name: 'Niacinamide',
    group: 'Phục hồi hàng rào da',
    summary: 'Vitamin B3, hỗ trợ củng cố hàng rào lipid, giảm nhờn và kiểm soát thâm mụn.',
    caution: 'Nồng độ cao (>10%) có thể gây ửng đỏ với da nhạy cảm — nên test vùng nhỏ trước.',
    interacts_with: [],
    interaction_note: 'Tương thích tốt với hầu hết hoạt chất khác, thường được dùng làm nền phối hợp.',
  },
  {
    id: 'aha-bha',
    name: 'AHA/BHA (Glycolic & Salicylic Acid)',
    inci_name: 'Glycolic Acid / Salicylic Acid',
    group: 'Tẩy tế bào chết hoá học',
    summary: 'AHA tan trong nước (tẩy da chết bề mặt), BHA tan trong dầu (sâu trong lỗ chân lông, hỗ trợ mụn).',
    caution: 'Tăng nhạy cảm ánh sáng — bắt buộc chống nắng; không dùng cùng lúc với Retinol nồng độ cao.',
    interacts_with: ['retinol'],
    interaction_note: 'Kết hợp với Retinol có thể gây kích ứng/bong tróc nặng — khuyến nghị luân phiên theo lịch chuyên gia hướng dẫn, không tự ý phối cùng buổi.',
  },
  {
    id: 'centella',
    name: 'Centella Asiatica (Rau Má)',
    inci_name: 'Centella Asiatica Extract',
    group: 'Làm dịu / Phục hồi',
    summary: 'Chiết xuất rau má, làm dịu da kích ứng, hỗ trợ phục hồi sau các liệu trình lột tẩy/laser.',
    caution: 'Hiếm khi gây kích ứng, phù hợp da nhạy cảm — vẫn nên test trước với cơ địa dị ứng thực vật.',
    interacts_with: [],
    interaction_note: 'Thường phối hợp AN TOÀN với hầu hết hoạt chất khác để làm dịu tác dụng phụ.',
  },
  {
    id: 'hyaluronic-acid',
    name: 'Hyaluronic Acid (HA)',
    inci_name: 'Sodium Hyaluronate',
    group: 'Cấp ẩm',
    summary: 'Phân tử giữ nước mạnh, cấp ẩm sâu, hỗ trợ làm đầy nếp nhăn li ti do khô da.',
    caution: 'Nên dùng trên da còn ẩm (xịt khoáng/toner) để tránh hút ngược ẩm từ da trong môi trường hanh khô.',
    interacts_with: [],
    interaction_note: 'Tương thích với hầu hết mọi hoạt chất, thường dùng làm bước nền cấp ẩm.',
  },
];

module.exports = { ingredients };
