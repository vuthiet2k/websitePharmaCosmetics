/**
 * data/quiz-questions.js — Câu hỏi cho AI Skin Diagnostic Quiz (Figma node 398:86,
 * Pharma_Cosmetics_Figma_Project/ai-quiz.html — "17 Câu Hỏi Lâm Sàng", 4 giai đoạn:
 * GĐ1 Cơ địa (Q1-7) · GĐ2 Triệu chứng (Q8-9) · GĐ3 Thói quen (Q10-13) · GĐ4 Nhận phác đồ (Q14-17).
 * Mỗi lựa chọn cộng điểm vào 1 skin_type; kết quả = skin_type có điểm cao nhất.
 * Q8 dùng đúng nguyên văn câu hỏi/đáp án mẫu trong ai-quiz.html để giữ đối chiếu 1:1 với Figma.
 */

const quizQuestions = [
  // ── GIAI ĐOẠN 1: CƠ ĐỊA (Q1-7) ─────────────────────────────────────────
  {
    id: 1,
    question: 'Da bạn thường như thế nào vào giữa trưa (chưa rửa mặt từ sáng)?',
    options: [
      { text: 'Bóng dầu toàn mặt, đặc biệt vùng chữ T', skin_type: 'oily' },
      { text: 'Căng, hơi bong nhẹ ở má', skin_type: 'dry' },
      { text: 'Bóng dầu ở chữ T, khô ở má', skin_type: 'combination' },
      { text: 'Bình thường, không bóng không khô', skin_type: 'normal' },
    ],
  },
  {
    id: 2,
    question: 'Da bạn có dễ bị đỏ, châm chích khi dùng sản phẩm mới không?',
    options: [
      { text: 'Rất dễ, gần như sản phẩm nào cũng phải test trước', skin_type: 'sensitive' },
      { text: 'Thỉnh thoảng, tuỳ sản phẩm', skin_type: 'combination' },
      { text: 'Hiếm khi', skin_type: 'normal' },
      { text: 'Không bao giờ', skin_type: 'oily' },
    ],
  },
  {
    id: 3,
    question: 'Bạn có đang gặp vấn đề về sắc tố (nám, tàn nhang, thâm) không?',
    options: [
      { text: 'Có, khá nhiều và rõ', skin_type: 'pigmentation' },
      { text: 'Có nhưng nhẹ', skin_type: 'pigmentation' },
      { text: 'Không, chỉ lo về mụn/dầu', skin_type: 'oily' },
      { text: 'Không, da khá đều màu', skin_type: 'normal' },
    ],
  },
  {
    id: 4,
    question: 'Mối quan tâm lớn nhất về da hiện tại của bạn là gì?',
    options: [
      { text: 'Nếp nhăn, chảy xệ, lão hoá', skin_type: 'aging' },
      { text: 'Mụn viêm, mụn ẩn', skin_type: 'oily' },
      { text: 'Khô ráp, bong tróc', skin_type: 'dry' },
      { text: 'Nám, tàn nhang, không đều màu', skin_type: 'pigmentation' },
    ],
  },
  {
    id: 5,
    question: 'Lỗ chân lông vùng mũi và 2 bên má của bạn thế nào?',
    options: [
      { text: 'To rõ, dễ bít tắc, hay nổi mụn đầu đen', skin_type: 'oily' },
      { text: 'Nhỏ mịn nhưng dễ căng rát khi trời hanh khô', skin_type: 'dry' },
      { text: 'To ở vùng chữ T, mịn ở 2 bên má', skin_type: 'combination' },
      { text: 'Đều, không có vùng nào bất thường', skin_type: 'normal' },
    ],
  },
  {
    id: 6,
    question: 'Sau khi rửa mặt khoảng 30 phút (không thoa gì thêm), da bạn cảm thấy ra sao?',
    options: [
      { text: 'Nhờn trở lại rất nhanh', skin_type: 'oily' },
      { text: 'Căng rát, muốn thoa kem ngay', skin_type: 'dry' },
      { text: 'Vùng chữ T hơi bóng, 2 má vẫn căng', skin_type: 'combination' },
      { text: 'Dễ chịu, không nhờn không căng', skin_type: 'normal' },
    ],
  },
  {
    id: 7,
    question: 'Bạn tiếp xúc trực tiếp với nắng (không kem chống nắng) trung bình bao lâu/ngày?',
    options: [
      { text: 'Hơn 2 giờ, công việc/di chuyển ngoài trời nhiều', skin_type: 'pigmentation' },
      { text: '30 phút - 2 giờ, chủ yếu lúc di chuyển', skin_type: 'aging' },
      { text: 'Dưới 30 phút, chủ yếu trong nhà/văn phòng', skin_type: 'normal' },
      { text: 'Gần như không tiếp xúc trực tiếp', skin_type: 'dry' },
    ],
  },

  // ── GIAI ĐOẠN 2: TRIỆU CHỨNG (Q8-9) — Q8 giữ nguyên văn theo ai-quiz.html ──
  {
    id: 8,
    question: 'Hiện tại nền da của bạn có đang xuất hiện tình trạng sắc tố, đốm nâu hoặc nám mảng không?',
    options: [
      { text: 'Nám mảng đối xứng 2 bên gò má', skin_type: 'pigmentation' },
      { text: 'Đốm nâu chân sâu, sạm màu sau mụn (PIH)', skin_type: 'pigmentation' },
      { text: 'Tàn nhang rải rác, tăng sắc tố khi tiếp xúc nắng', skin_type: 'pigmentation' },
      { text: 'Không có sắc tố, chỉ đỏ rát nhạy cảm & mụn', skin_type: 'sensitive' },
    ],
  },
  {
    id: 9,
    question: 'Mức độ mụn viêm/mụn ẩn hiện tại của bạn ra sao?',
    options: [
      { text: 'Nhiều mụn viêm đỏ, sưng đau, dễ để lại thâm', skin_type: 'oily' },
      { text: 'Mụn ẩn li ti dưới da, ít mụn viêm rõ', skin_type: 'combination' },
      { text: 'Thỉnh thoảng nổi 1-2 nốt quanh chu kỳ nội tiết', skin_type: 'normal' },
      { text: 'Không nổi mụn, nhưng da dễ đỏ rát khó chịu', skin_type: 'sensitive' },
    ],
  },

  // ── GIAI ĐOẠN 3: THÓI QUEN (Q10-13) ─────────────────────────────────────
  {
    id: 10,
    question: 'Quy trình chăm sóc da hiện tại của bạn có bao nhiêu bước (sáng + tối)?',
    options: [
      { text: 'Rất đơn giản: chỉ rửa mặt, thỉnh thoảng kem dưỡng', skin_type: 'normal' },
      { text: '3-4 bước cơ bản: sữa rửa mặt, toner, kem dưỡng, chống nắng', skin_type: 'combination' },
      { text: '5+ bước, có dùng serum đặc trị/hoạt chất mạnh', skin_type: 'aging' },
      { text: 'Rất tối giản vì da dễ kích ứng khi thêm sản phẩm mới', skin_type: 'sensitive' },
    ],
  },
  {
    id: 11,
    question: 'Bạn đã từng dùng Retinoid/AHA/BHA nồng độ điều trị chưa?',
    options: [
      { text: 'Đang dùng thường xuyên, da đáp ứng tốt', skin_type: 'aging' },
      { text: 'Có dùng để giảm mụn/dầu, hiệu quả rõ', skin_type: 'oily' },
      { text: 'Có thử nhưng bị kích ứng, đỏ rát, phải ngưng', skin_type: 'sensitive' },
      { text: 'Chưa từng dùng', skin_type: 'normal' },
    ],
  },
  {
    id: 12,
    question: 'Tần suất bạn thoa lại kem chống nắng trong ngày?',
    options: [
      { text: 'Chỉ thoa 1 lần buổi sáng, hay quên thoa lại', skin_type: 'pigmentation' },
      { text: 'Thoa lại 2-3 lần/ngày đều đặn', skin_type: 'normal' },
      { text: 'Có thoa nhưng hay bị bí da, nổi mụn ẩn', skin_type: 'oily' },
      { text: 'Ưu tiên kem chống nắng vật lý vì da dễ kích ứng', skin_type: 'sensitive' },
    ],
  },
  {
    id: 13,
    question: 'Bạn đã từng can thiệp thẩm mỹ da (laser, peel, meso, lăn kim) chưa?',
    options: [
      { text: 'Đã làm để trị nám/tăng sắc tố', skin_type: 'pigmentation' },
      { text: 'Đã làm để trẻ hoá/căng da', skin_type: 'aging' },
      { text: 'Đã làm nhưng sau đó da yếu, dễ đỏ rát hơn trước', skin_type: 'sensitive' },
      { text: 'Chưa từng can thiệp thẩm mỹ da', skin_type: 'normal' },
    ],
  },

  // ── GIAI ĐOẠN 4: NHẬN PHÁC ĐỒ (Q14-17) ──────────────────────────────────
  {
    id: 14,
    question: 'Ưu tiên hàng đầu của bạn khi nhận phác đồ điều trị là gì?',
    options: [
      { text: 'Kiểm soát dầu nhờn & ngừa mụn tái phát', skin_type: 'oily' },
      { text: 'Phục hồi độ ẩm, giảm khô căng bong tróc', skin_type: 'dry' },
      { text: 'Làm mờ nám/thâm, đều màu da', skin_type: 'pigmentation' },
      { text: 'Giảm nhăn, săn chắc, trẻ hoá tổng thể', skin_type: 'aging' },
    ],
  },
  {
    id: 15,
    question: 'Bạn có tiền sử dị ứng hoặc từng kích ứng nặng với thành phần mỹ phẩm nào không?',
    options: [
      { text: 'Có, da rất dễ dị ứng, cần hoạt chất dịu nhẹ tối đa', skin_type: 'sensitive' },
      { text: 'Có nhưng nhẹ, chỉ cần tránh vài thành phần cụ thể', skin_type: 'combination' },
      { text: 'Không, da dung nạp tốt hầu hết sản phẩm', skin_type: 'normal' },
      { text: 'Không rõ, chưa từng test dị ứng bài bản', skin_type: 'oily' },
    ],
  },
  {
    id: 16,
    question: 'Bạn có đang mang thai hoặc cho con bú không? (một số hoạt chất như Retinoid cần bác sĩ chỉ định riêng)',
    options: [
      { text: 'Có — cần phác đồ an toàn thai kỳ, tránh Retinoid/hoạt chất mạnh', skin_type: 'sensitive' },
      { text: 'Không', skin_type: 'normal' },
      { text: 'Không, nhưng đang có kế hoạch mang thai gần đây', skin_type: 'sensitive' },
      { text: 'Không áp dụng', skin_type: 'normal' },
    ],
  },
  {
    id: 17,
    question: 'Bạn muốn nhận phác đồ chi tiết và tư vấn tiếp theo qua kênh nào?',
    options: [
      { text: 'Zalo (gửi phác đồ + hình ảnh minh hoạ)', skin_type: 'normal' },
      { text: 'Gọi điện tư vấn trực tiếp với bác sĩ/dược sĩ', skin_type: 'sensitive' },
      { text: 'Đặt lịch khám trực tiếp tại phòng khám', skin_type: 'aging' },
      { text: 'Chỉ cần xem online, chưa cần tư vấn thêm', skin_type: 'oily' },
    ],
  },
];

const quizResults = {
  oily:         { skin_type: 'Da dầu / Mụn',      recommend: ['Niacinamide', 'Salicylic Acid (BHA)', 'Gel dưỡng không dầu'] },
  dry:          { skin_type: 'Da khô',            recommend: ['Ceramide', 'Hyaluronic Acid', 'Kem dưỡng phục hồi hàng rào'] },
  combination:  { skin_type: 'Da hỗn hợp',        recommend: ['Niacinamide', 'Serum cấp ẩm nhẹ', 'Kem dưỡng cân bằng'] },
  sensitive:    { skin_type: 'Da nhạy cảm',       recommend: ['Centella Asiatica', 'Ceramide', 'Kem chống nắng vật lý'] },
  normal:       { skin_type: 'Da thường',         recommend: ['Vitamin C', 'Kem dưỡng ẩm cân bằng', 'Chống nắng phổ rộng'] },
  pigmentation: { skin_type: 'Da có vấn đề sắc tố', recommend: ['Tranexamic Acid', 'Vitamin C', 'Retinol nồng độ thấp'] },
  aging:        { skin_type: 'Da lão hoá',        recommend: ['Retinol', 'Peptide', 'Kem chống nắng phổ rộng'] },
};

module.exports = { quizQuestions, quizResults };
