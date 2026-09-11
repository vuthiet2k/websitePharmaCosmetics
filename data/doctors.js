/**
 * data/doctors.js — Đội ngũ bác sĩ / chuyên gia (giả lập cho "Trang chuyên gia")
 *
 * Dùng cho: page.chuyen-gia.bwt, section_why_us.bwt (đội ngũ), author byline ở article/blog.
 * Tên đồng bộ với các tác giả đã dùng trong data/articles.js và trang Tin tức đã dựng.
 */

function img(color, text, size = '480x480') {
  return `https://placehold.co/${size}/${color}?text=${encodeURIComponent(text)}`;
}

const doctors = [

  {
    id:          300,
    name:        'BS. CKII Nguyễn Minh Anh',
    alias:       'bs-ckii-nguyen-minh-anh',
    title:       'Bác sĩ Chuyên khoa II Da liễu',
    specialty:   'Cố Vấn Chuyên Môn Cấp Cao — Trưởng Hội đồng Chuyên môn Pharma Cosmetics Clinic',
    years_experience: 18,
    bio:         'Thành viên Hội Da liễu Việt Nam & Hiệp hội Da liễu Châu Âu (EADV). 2008–2018: Bác sĩ điều trị khoa Laser & Phục hồi da, Bệnh viện Da Liễu Trung Ương. Từ 2018: Trưởng Hội đồng Chuyên môn & Cố vấn Trưởng Pharma Cosmetics Clinic, trực tiếp đào tạo và xây dựng phác đồ lâm sàng cho hơn 200+ Bác sĩ Da liễu toàn quốc.',
    education:   'Bác sĩ Chuyên khoa II — Đại học Y Hà Nội (Loại Xuất Sắc); Chứng chỉ Hoạt chất Dược Mỹ Phẩm Lâm Sàng (EADV); Chứng nhận Chuyên gia Phục hồi màng Lipid da tổn thương — Viện Da Liễu Trung Ương.',
    photo:       { src: img('0B4F30/ffffff', 'BS.CKII Minh Anh'), alt: 'BS. CKII Nguyễn Minh Anh' },
    quote:       '"18 năm hành nghề dạy tôi rằng phục hồi hàng rào bảo vệ da luôn phải đi trước mọi hoạt chất mạnh."',
    stats: {
      patients_treated: '15.200+',
      clinical_efficacy: '98.8%',
      rating: '4.95/5',
      rating_count: '1.842',
    },
  },

  {
    // NOTE(T-33): giữ nguyên id 301 "DS. Nguyễn Minh Anh" (dược sĩ) — đây là tác giả blog
    // trong data/articles.js (3 bài), KHÔNG phải cùng người với "BS. CKII Nguyễn Minh Anh"
    // (id 300, bác sĩ, hồ sơ chuyên khoa flagship theo doctor-profile.html). Trùng tên
    // "Minh Anh" là mâu thuẫn nội dung có sẵn trong dự án trước T-33 — KHÔNG tự ý đổi id 301
    // vì sẽ làm sai byline 3 bài blog đang tham chiếu "DS. Nguyễn Minh Anh". Cần chủ dự án
    // xác nhận đây có phải 2 nhân vật khác nhau hay là lỗi trùng tên cần hợp nhất.
    id:          301,
    name:        'DS. Nguyễn Minh Anh',
    alias:       'ds-nguyen-minh-anh',
    title:       'Dược sĩ Lâm sàng Da liễu',
    specialty:   'Chống lão hoá & Phục hồi hàng rào bảo vệ da',
    years_experience: 9,
    bio:         'Chuyên sâu về hoạt chất Retinoid, Peptide sinh học và phác đồ phục hồi da nhạy cảm. Tư vấn hơn 3.000 ca cá nhân hoá phác đồ tại hệ thống Pharma Cosmetics.',
    education:   'Đại học Dược Hà Nội',
    photo:       { src: img('3cb371/ffffff', 'DS. Minh Anh'), alt: 'DS. Nguyễn Minh Anh' },
    quote:       '"Da khoẻ trước, đẹp sau — không có phác đồ nào đi tắt được bước phục hồi hàng rào bảo vệ da."',
  },

  {
    id:          302,
    name:        'BS.CKI Trần Thu Hương',
    alias:       'bs-cki-tran-thu-huong',
    title:       'Bác sĩ Chuyên khoa I Da liễu',
    specialty:   'Điều trị nám, tăng sắc tố & làm sáng da',
    years_experience: 12,
    bio:         'Hơn 10 năm điều trị nám và rối loạn sắc tố bằng phác đồ kết hợp uống-bôi-laser. Thành viên Hội Da liễu Việt Nam.',
    education:   'Đại học Y Hà Nội',
    photo:       { src: img('1F5A3B/ffffff', 'BS. Thu Huong'), alt: 'BS.CKI Trần Thu Hương' },
    quote:       '"Nám là bệnh lý mãn tính cần kiên trì — cam kết lộ trình tối thiểu 12 tuần mới đánh giá đúng hiệu quả."',
  },

  {
    id:          303,
    name:        'BS.CKII Lê Thị Lan',
    alias:       'bs-ckii-le-thi-lan',
    title:       'Bác sĩ Chuyên khoa II Da liễu',
    specialty:   'Trị liệu chuyên sâu & phục hồi da sau xâm lấn',
    years_experience: 15,
    bio:         'Phụ trách các ca điều trị nám khó, da tổn thương do dùng corticoid kéo dài, và phác đồ phục hồi sau laser/lăn kim.',
    education:   'Đại học Y Dược TP.HCM',
    photo:       { src: img('267348/ffffff', 'BS. Thi Lan'), alt: 'BS.CKII Lê Thị Lan' },
    quote:       '"Phục hồi màng lipid luôn là bước đầu tiên trước khi bắt đầu bất kỳ hoạt chất mạnh nào."',
  },

  {
    id:          304,
    name:        'ThS. BS Trần Phương Linh',
    alias:       'ths-bs-tran-phuong-linh',
    title:       'Thạc sĩ - Bác sĩ Da liễu',
    specialty:   'Chăm sóc da mụn viêm & kiểm soát dầu',
    years_experience: 8,
    bio:         'Nghiên cứu chuyên sâu về hệ vi sinh da (skin microbiome) và vai trò của B5, Ceramide trong phục hồi da mụn viêm.',
    education:   'Đại học Y Dược TP.HCM',
    photo:       { src: img('DE9E7D/13241F', 'ThS.BS P.Linh'), alt: 'ThS. BS Trần Phương Linh' },
    quote:       '"Mụn viêm không phải lúc nào cũng cần kháng sinh — đôi khi chỉ cần đúng công thức phục hồi hàng rào da."',
  },

  {
    id:          305,
    name:        'BS. Lê Hoàng Nam',
    alias:       'bs-le-hoang-nam',
    title:       'Bác sĩ Da liễu',
    specialty:   'Chống nắng & dự phòng lão hoá da do ánh sáng',
    years_experience: 6,
    bio:         'Tư vấn phác đồ chống nắng cá nhân hoá theo chỉ số SPF/PA và loại da, đồng hành cùng các ca điều trị duy trì sau laser.',
    education:   'Đại học Y khoa Phạm Ngọc Thạch',
    photo:       { src: img('E35D5D/ffffff', 'BS. Hoang Nam'), alt: 'BS. Lê Hoàng Nam' },
    quote:       '"Chống nắng đúng cách là khoản đầu tư rẻ nhất cho làn da trẻ lâu."',
  },

];

module.exports = { doctors };
