/**
 * data/doctors.js — Đội ngũ chuyên gia da liễu (giả lập cho "Trang chuyên gia")
 *
 * Dùng cho: page.chuyen-gia.bwt, section_why_us.bwt (đội ngũ), author byline ở article/blog.
 * Tên đồng bộ với các tác giả đã dùng trong data/articles.js và trang Tin tức đã dựng.
 */

function img(color, text, size = '480x480') {
  return `https://placehold.co/${size}/${color}?text=${encodeURIComponent(text)}`;
}

const doctors = [

  {
    // T-114 (2026-09-12): id 300 và id 301 cũ (2 hồ sơ cùng tên "Minh Anh", danh xưng y tế khác
    // nhau — xem NOTE(T-33) cũ) đã được người dùng xác nhận trực tiếp là CÙNG 1 NGƯỜI — hợp nhất
    // thành 1 hồ sơ duy nhất, đổi tên thành "Thanh Hằng", danh xưng "Chuyên gia" (RULE-P0-02,
    // quyết định người dùng 2026-09-12, áp dụng cho toàn bộ đội ngũ trong file này). Giữ id 300
    // + giữ vị trí đầu mảng (index 0) vì templates/product.bwt#L684 dùng doctors[0] theo chỉ
    // số, không theo alias — đổi alias vẫn an toàn. 9 bài blog trước đây gán cho "DS. Nguyễn
    // Minh Anh" (data/articles.js) đã cập nhật author sang tên mới để khớp byline binding
    // (templates/article.bwt so khớp doc.name == article.author).
    id:          300,
    name:        'Chuyên gia Thanh Hằng',
    alias:       'chuyen-gia-thanh-hang',
    title:       'Chuyên gia Da liễu Cao cấp',
    specialty:   'Cố Vấn Chuyên Môn Cấp Cao — Trưởng Hội đồng Chuyên môn Pharma Cosmetics Clinic',
    years_experience: 18,
    bio:         'Thành viên Hội Da liễu Việt Nam & Hiệp hội Da liễu Châu Âu (EADV). 2008–2018: Chuyên gia điều trị khoa Laser & Phục hồi da, Bệnh viện Da Liễu Trung Ương. Từ 2018: Trưởng Hội đồng Chuyên môn & Cố vấn Trưởng Pharma Cosmetics Clinic, trực tiếp đào tạo và xây dựng phác đồ lâm sàng cho hơn 200+ Chuyên gia Da liễu toàn quốc. Chuyên sâu về hoạt chất Retinoid, Peptide sinh học và phác đồ phục hồi da nhạy cảm.',
    education:   'Chuyên khoa II Da liễu — Đại học Y Hà Nội (Loại Xuất Sắc); Chứng chỉ Hoạt chất Dược Mỹ Phẩm Lâm Sàng (EADV); Chứng nhận Chuyên gia Phục hồi màng Lipid da tổn thương — Viện Da Liễu Trung Ương.',
    photo:       { src: img('0B4F30/ffffff', 'Chuyen gia Thanh Hang'), alt: 'Chuyên gia Thanh Hằng' },
    quote:       '"18 năm hành nghề dạy tôi rằng phục hồi hàng rào bảo vệ da luôn phải đi trước mọi hoạt chất mạnh."',
    stats: {
      patients_treated: '15.200+',
      clinical_efficacy: '98.8%',
      rating: '4.95/5',
      rating_count: '1.842',
    },
  },

  {
    id:          302,
    name:        'Chuyên gia Trần Thu Hương',
    alias:       'chuyen-gia-tran-thu-huong',
    title:       'Chuyên gia Da liễu',
    specialty:   'Điều trị nám, tăng sắc tố & làm sáng da',
    years_experience: 12,
    bio:         'Hơn 10 năm điều trị nám và rối loạn sắc tố bằng phác đồ kết hợp uống-bôi-laser. Thành viên Hội Da liễu Việt Nam.',
    education:   'Đại học Y Hà Nội',
    photo:       { src: img('1F5A3B/ffffff', 'CG Thu Huong'), alt: 'Chuyên gia Trần Thu Hương' },
    quote:       '"Nám là bệnh lý mãn tính cần kiên trì — cam kết lộ trình tối thiểu 12 tuần mới đánh giá đúng hiệu quả."',
  },

  {
    id:          303,
    name:        'Chuyên gia Lê Thị Lan',
    alias:       'chuyen-gia-le-thi-lan',
    title:       'Chuyên gia Da liễu',
    specialty:   'Trị liệu chuyên sâu & phục hồi da sau xâm lấn',
    years_experience: 15,
    bio:         'Phụ trách các ca điều trị nám khó, da tổn thương do dùng corticoid kéo dài, và phác đồ phục hồi sau laser/lăn kim.',
    education:   'Đại học Y Dược TP.HCM',
    photo:       { src: img('267348/ffffff', 'CG Thi Lan'), alt: 'Chuyên gia Lê Thị Lan' },
    quote:       '"Phục hồi màng lipid luôn là bước đầu tiên trước khi bắt đầu bất kỳ hoạt chất mạnh nào."',
  },

  {
    id:          304,
    name:        'Chuyên gia Trần Phương Linh',
    alias:       'chuyen-gia-tran-phuong-linh',
    title:       'Thạc sĩ - Chuyên gia Da liễu',
    specialty:   'Chăm sóc da mụn viêm & kiểm soát dầu',
    years_experience: 8,
    bio:         'Nghiên cứu chuyên sâu về hệ vi sinh da (skin microbiome) và vai trò của B5, Ceramide trong phục hồi da mụn viêm.',
    education:   'Đại học Y Dược TP.HCM',
    photo:       { src: img('DE9E7D/13241F', 'CG P.Linh'), alt: 'Chuyên gia Trần Phương Linh' },
    quote:       '"Mụn viêm không phải lúc nào cũng cần kháng sinh — đôi khi chỉ cần đúng công thức phục hồi hàng rào da."',
  },

  {
    id:          305,
    name:        'Chuyên gia Lê Hoàng Nam',
    alias:       'chuyen-gia-le-hoang-nam',
    title:       'Chuyên gia Da liễu',
    specialty:   'Chống nắng & dự phòng lão hoá da do ánh sáng',
    years_experience: 6,
    bio:         'Tư vấn phác đồ chống nắng cá nhân hoá theo chỉ số SPF/PA và loại da, đồng hành cùng các ca điều trị duy trì sau laser.',
    education:   'Đại học Y khoa Phạm Ngọc Thạch',
    photo:       { src: img('E35D5D/ffffff', 'CG Hoang Nam'), alt: 'Chuyên gia Lê Hoàng Nam' },
    quote:       '"Chống nắng đúng cách là khoản đầu tư rẻ nhất cho làn da trẻ lâu."',
  },

];

module.exports = { doctors };
