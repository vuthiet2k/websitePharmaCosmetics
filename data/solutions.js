/**
 * data/solutions.js — REOPEN 2026-09-10 (ADR-007/T-91)
 * "6 Giải Pháp Skin Health Beauty" (SOL-SKH-01..06) — trích ĐÚNG nguyên văn từ sheet
 * 6_Giai_Phap_Skin_Health_Beauty trong SkinHealthBeauty_KhungGiaoDien_ChucNang_Clinic_DichVu.xlsx
 * (không bịa nội dung — đối chiếu trực tiếp file nguồn trước khi viết file này).
 * CTA thống nhất "ĐẶT LỊCH PHÂN TÍCH DA" cho cả 6 giải pháp (tư vấn-only, theo ADR-007 T-92 —
 * KHÔNG áp dụng cho catalogue dịch vụ/liệu trình Sapo product hiện có, xem
 * templates/page.skinhealthy-service-detail.bwt).
 */

const corePhilosophy = {
  title_vi: 'THÔNG ĐIỆP CHUNG TOÀN BỘ WEBSITE',
  title_en: 'Core Treatment Philosophy',
  quote: 'Mỗi làn da một hồ sơ. Mỗi khách hàng một phác đồ.',
  summary: 'KHÔNG CÓ MỘT LIỆU TRÌNH CỐ ĐỊNH CHO TẤT CẢ MỌI NGƯỜI: Tại SKIN HEALTH BEAUTY by PHARMA COSMETICS, mỗi buổi trị liệu đều bắt đầu bằng việc đánh giá lại tình trạng làn da. Chuyên gia sẽ điều chỉnh mục tiêu điều trị, lựa chọn dược mỹ phẩm, hoạt chất và công nghệ phù hợp với nhu cầu sinh học của làn da tại thời điểm đó.',
};

const solutions = [
  {
    id: 'SOL-SKH-01',
    name_vi: '01. Phục Hồi Hàng Rào Bảo Vệ Da',
    name_en: 'Barrier Recovery',
    summary: 'Một hàng rào bảo vệ khỏe mạnh là nền tảng của mọi làn da khỏe. Chúng tôi ưu tiên phục hồi chức năng sinh lý của da trước khi áp dụng các liệu pháp chuyên sâu.',
    suitable_for: ['Da nhạy cảm', 'Rosacea', 'Da giãn mao mạch (Couperose)', 'Da kích ứng, đỏ rát', 'Da sau laser', 'Da sau peel', 'Da sau vi kim', 'Da mất nước', 'Da suy yếu hàng rào bảo vệ'],
    treatment_goals: ['Phục hồi hàng rào bảo vệ da', 'Giảm mất nước qua biểu bì (TEWL)', 'Làm dịu phản ứng viêm', 'Cân bằng hệ vi sinh vật trên da', 'Tăng khả năng dung nạp hoạt chất'],
    personalization_note: 'Mỗi buổi trị liệu bắt đầu bằng đánh giá lại tình trạng hàng rào bảo vệ, mức độ viêm và khả năng dung nạp. Dược mỹ phẩm, hoạt chất và công nghệ được điều chỉnh linh hoạt theo tình trạng thực tế của làn da.',
    tagline: 'Khoa học – Cá nhân hóa – Đồng hành: Không có một liệu trình cố định cho tất cả mọi người',
  },
  {
    id: 'SOL-SKH-02',
    name_vi: '02. Điều Hòa Sinh Học Da Tăng Sắc Tố',
    name_en: 'Pigment Regulation',
    summary: 'Tăng sắc tố là một quá trình sinh học phức tạp, chịu ảnh hưởng bởi viêm, stress oxy hóa, tín hiệu tế bào sắc tố và nhiều yếu tố khác. Mục tiêu là điều hòa quá trình hình thành sắc tố và duy trì kết quả lâu dài.',
    suitable_for: ['Nám', 'Tăng sắc tố sau viêm (PIH)', 'Da không đều màu', 'Da xỉn màu', 'Đốm nâu', 'Tàn nhang', 'Sạm da do ánh nắng'],
    treatment_goals: ['Điều hòa quá trình tạo melanin', 'Giảm viêm nền', 'Hạn chế tái phát tăng sắc tố', 'Cải thiện độ sáng và đều màu', 'Duy trì sức khỏe hàng rào bảo vệ'],
    personalization_note: 'Chuyên gia đánh giá nguyên nhân sắc tố, tình trạng viêm, khả năng dung nạp và tiền sử điều trị để điều chỉnh phác đồ trong từng buổi.',
    tagline: 'Mỗi làn da một hồ sơ. Mỗi khách hàng một phác đồ.',
  },
  {
    id: 'SOL-SKH-03',
    name_vi: '03. Điều Trị Mụn & Cân Bằng Da Dầu',
    name_en: 'Acne Management',
    summary: 'Mụn là bệnh lý mạn tính của đơn vị nang lông – tuyến bã. Chúng tôi điều trị mụn dựa trên nguyên nhân, đồng thời phục hồi hàng rào bảo vệ da để giảm nguy cơ tái phát.',
    suitable_for: ['Mụn không viêm (đầu trắng, đầu đen, mụn ẩn)', 'Mụn viêm (sẩn, mủ, bọc, nang)', 'Mụn nội tiết', 'Mụn người trưởng thành', 'Da dầu, lỗ chân lông to', 'Thâm/đỏ sau mụn'],
    treatment_goals: ['Kiểm soát quá trình hình thành mụn', 'Giảm viêm', 'Điều hòa bã nhờn', 'Phục hồi hàng rào bảo vệ', 'Cân bằng hệ vi sinh', 'Giảm thâm sau mụn'],
    personalization_note: 'Mỗi buổi điều trị đều đánh giá lại loại mụn, mức độ viêm, lượng dầu, khả năng dung nạp và đáp ứng điều trị để điều chỉnh hoạt chất, dược mỹ phẩm và công nghệ phù hợp.',
    tagline: 'Phục hồi chức năng sinh học và duy trì sức khỏe làn da trong nhiều năm về sau',
  },
  {
    id: 'SOL-SKH-04',
    name_vi: '04. Tái Tạo & Trẻ Hóa Sinh Học',
    name_en: 'Skin Regeneration',
    summary: 'Lão hóa là quá trình thay đổi cấu trúc và chức năng của da theo thời gian. Chúng tôi tập trung cải thiện chất lượng nền da thông qua các giải pháp tái tạo sinh học và kích thích phục hồi tự nhiên.',
    suitable_for: ['Nếp nhăn', 'Da chùng nhão', 'Da thiếu săn chắc', 'Da xỉn màu', 'Da lão hóa', 'Kết cấu da không đồng đều', 'Lỗ chân lông to'],
    treatment_goals: ['Tăng sinh collagen và elastin', 'Cải thiện độ đàn hồi', 'Nâng cao chất lượng nền da', 'Cải thiện kết cấu', 'Làm chậm quá trình lão hóa'],
    personalization_note: 'Tùy theo độ tuổi, chất lượng nền da và mục tiêu điều trị, chuyên gia sẽ lựa chọn hoạt chất, công nghệ và phương pháp tái tạo phù hợp trong từng giai đoạn.',
    tagline: 'Kích thích phục hồi tự nhiên và tái tạo sinh học cấu trúc da',
  },
  {
    id: 'SOL-SKH-05',
    name_vi: '05. Sẹo & Tái Cấu Trúc Da',
    name_en: 'Scar Remodeling',
    summary: 'Điều trị sẹo là quá trình tái cấu trúc mô và cải thiện chất lượng nền da trong thời gian dài. Mỗi loại sẹo cần một chiến lược điều trị khác nhau.',
    suitable_for: ['Sẹo rỗ đáy nhọn (Ice Pick)', 'Sẹo đáy vuông (Boxcar)', 'Sẹo lượn sóng (Rolling)', 'Sẹo hỗn hợp', 'Sẹo sau mụn', 'Sẹo sau thủ thuật', 'Sẹo sau thủy đậu'],
    treatment_goals: ['Tái cấu trúc mô', 'Kích thích tăng sinh collagen', 'Cải thiện độ sâu của sẹo', 'Cải thiện kết cấu da', 'Nâng cao chất lượng nền da'],
    personalization_note: 'Mỗi phác đồ được xây dựng dựa trên loại sẹo, độ sâu, thời gian hình thành và khả năng phục hồi của da. Phương pháp và dược mỹ phẩm được điều chỉnh linh hoạt theo từng giai đoạn điều trị.',
    tagline: 'Chiến lược điều trị chuyên biệt theo từng loại mô sẹo và khả năng phục hồi',
  },
  {
    id: 'SOL-SKH-06',
    name_vi: '06. Duy Trì & Quản Lý Sức Khỏe Làn Da',
    name_en: 'Skin Health Maintenance',
    summary: 'Điều trị thành công không đồng nghĩa với việc kết thúc chăm sóc. Chúng tôi đồng hành cùng khách hàng để duy trì kết quả, phòng ngừa tái phát và quản lý sức khỏe làn da lâu dài.',
    suitable_for: ['Sau điều trị mụn', 'Sau điều trị nám', 'Sau trẻ hóa', 'Sau phục hồi hàng rào bảo vệ', 'Khách hàng chăm sóc định kỳ'],
    treatment_goals: ['Duy trì kết quả', 'Phòng ngừa tái phát', 'Theo dõi sức khỏe làn da', 'Điều chỉnh phác đồ theo từng giai đoạn', 'Duy trì hàng rào bảo vệ khỏe mạnh'],
    personalization_note: 'Mỗi lần tái khám, chuyên gia sẽ đánh giá lại hồ sơ sức khỏe làn da, cập nhật chỉ số tiến triển và điều chỉnh quy trình chăm sóc phù hợp với sự thay đổi của làn da theo thời gian.',
    tagline: 'Đồng hành lâu dài - Quản lý sức khỏe làn da đa tầng bền vững',
  },
];

module.exports = { solutions, corePhilosophy };
