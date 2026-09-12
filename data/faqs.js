/**
 * data/faqs.js — Câu hỏi thường gặp (dùng chung nhiều trang: Đặt lịch, PDP, Tài khoản...)
 */

const faqs = {

  booking: [
    { q: 'Đặt lịch khám có mất phí không?', a: 'Buổi tư vấn da đầu tiên hoàn toàn miễn phí. Chỉ tính phí khi bạn quyết định điều trị theo phác đồ cụ thể.' },
    { q: 'Tôi cần chuẩn bị gì trước buổi khám?', a: 'Không trang điểm, mang theo sản phẩm đang dùng (nếu có) để chuyên gia đánh giá chính xác tình trạng da hiện tại.' },
    { q: 'Có thể đổi lịch hẹn không?', a: 'Có, vui lòng báo trước ít nhất 4 giờ để đổi sang khung giờ khác qua hotline hoặc Zalo.' },
    { q: 'Buổi tư vấn diễn ra trong bao lâu?', a: 'Buổi tư vấn + soi da đầu tiên thường kéo dài 30-45 phút, đủ để đánh giá tình trạng da và tư vấn phác đồ phù hợp.' },
    { q: 'Tôi có thể đặt lịch cho người thân không?', a: 'Có, vui lòng cung cấp đúng họ tên và số điện thoại của người sẽ đến khám khi đặt lịch để nhân viên xác nhận chính xác.' },
    { q: 'Nếu đến trễ giờ hẹn thì sao?', a: 'Vui lòng gọi hotline báo trước nếu trễ quá 15 phút — lịch hẹn có thể được dời sang khung giờ gần nhất trong ngày.' },
  ],

  product: [
    { q: 'Sản phẩm có phù hợp với da nhạy cảm không?', a: 'Mỗi sản phẩm đều ghi rõ loại da phù hợp trong phần "Thông số". Nếu chưa chắc, hãy đặt lịch tư vấn miễn phí trước khi dùng.' },
    { q: 'Bao lâu thì thấy hiệu quả?', a: 'Tuỳ hoạt chất và tình trạng da, thường 4-8 tuần với dưỡng ẩm/phục hồi, 8-12 tuần với nám/lão hoá.' },
    { q: 'Có đổi trả nếu không hợp da không?', a: 'Đổi trả trong 7 ngày nếu sản phẩm còn nguyên tem, chưa qua sử dụng, theo chính sách đổi trả 30 ngày của hệ thống.' },
    { q: 'Sản phẩm có kiểm nghiệm an toàn không?', a: 'Toàn bộ sản phẩm đều có phiếu công bố và kiểm nghiệm theo quy định, thông tin công bố được hiển thị ở trang chi tiết sản phẩm.' },
    { q: 'Có nên dùng nhiều sản phẩm hoạt chất mạnh cùng lúc không?', a: 'Không nên tự kết hợp nhiều hoạt chất mạnh (Retinol, AHA/BHA, Vitamin C nồng độ cao) cùng lúc — nên tham khảo phác đồ từ chuyên gia để tránh kích ứng.' },
    { q: 'Sản phẩm có thành phần gây hại cho phụ nữ mang thai không?', a: 'Sản phẩm chứa Retinoid/hoạt chất chống chỉ định thai kỳ đều được ghi chú rõ trong phần "Lưu ý sử dụng" — vui lòng đọc kỹ hoặc hỏi chuyên gia trước khi dùng.' },
  ],

  account: [
    { q: 'Làm sao để tra cứu lịch sử điều trị?', a: 'Đăng nhập tài khoản → mục "Lịch sử điều trị" để xem toàn bộ phác đồ và đơn hàng theo thời gian.' },
    { q: 'Điểm tích luỹ dùng để làm gì?', a: 'Điểm có thể quy đổi trực tiếp thành giảm giá cho đơn hàng hoặc dịch vụ tại các cơ sở Pharma Cosmetics.' },
    { q: 'Làm sao để đổi mật khẩu tài khoản?', a: 'Vào mục "Tài khoản" → "Đổi mật khẩu", nhập mật khẩu cũ và mật khẩu mới để xác nhận thay đổi.' },
    { q: 'Tôi quên mật khẩu thì phải làm sao?', a: 'Chọn "Quên mật khẩu" tại trang đăng nhập, hệ thống sẽ gửi liên kết đặt lại mật khẩu qua email đã đăng ký.' },
    { q: 'Làm sao để cập nhật địa chỉ giao hàng?', a: 'Vào mục "Tài khoản" → "Sổ địa chỉ" để thêm, sửa hoặc đặt địa chỉ mặc định cho các đơn hàng sau.' },
    { q: 'Điểm tích luỹ có thời hạn sử dụng không?', a: 'Điểm tích luỹ có hiệu lực trong 12 tháng kể từ ngày phát sinh, thông tin chi tiết hiển thị tại mục "Lịch sử điểm thưởng".' },
  ],

};

module.exports = { faqs };
