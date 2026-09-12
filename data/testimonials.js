/**
 * data/testimonials.js — Đánh giá khách hàng (giả lập, tên hư cấu, KHÔNG dùng ảnh người thật)
 *
 * Dùng cho: section_testimonials.bwt (đã có), Trang chuyên gia, Trang chủ.
 */

function img(color, text, size = '96x96') {
  return `https://placehold.co/${size}/${color}?text=${encodeURIComponent(text)}`;
}

const testimonials = [
  {
    id: 401,
    name: 'Ngọc Anh, 29 tuổi',
    result_title: 'Chăm sóc da mụn chuyên sâu',
    quote: 'Sau 6 tuần theo phác đồ B5 + Ceramide, da mình giảm hẳn đỏ rát và không còn nổi mụn mới. Chuyên gia theo sát từng tuần rất yên tâm.',
    rating: 5,
    avatar: { src: img('eaf7ee/1F5A3B', 'NA'), alt: 'Khách hàng Ngọc Anh' },
  },
  {
    id: 402,
    name: 'Thu Trang, 34 tuổi',
    result_title: 'Tiêu viêm, ngăn sẹo mụn cấp tốc',
    quote: 'Da mụn viêm nặng của mình cải thiện rõ chỉ sau 3 tuần dùng đúng phác đồ tư vấn, không còn để lại thâm như trước.',
    rating: 5,
    avatar: { src: img('F3DFD1/13241F', 'TT'), alt: 'Khách hàng Thu Trang' },
  },
  {
    id: 403,
    name: 'Minh Khuê, 41 tuổi',
    result_title: 'Giải nhiệt và tái tạo da nhạy cảm',
    quote: 'Da mình vốn rất dễ kích ứng, nhưng phác đồ phục hồi hàng rào da ở đây làm rất kỹ, không hề nóng rát khi dùng thử.',
    rating: 5,
    avatar: { src: img('DE9E7D/13241F', 'MK'), alt: 'Khách hàng Minh Khuê' },
  },
  {
    id: 404,
    name: 'Hải Yến, 26 tuổi',
    result_title: 'Điều trị nám sau sinh',
    quote: 'Nám sau sinh của mình mờ hẳn sau 3 tháng kiên trì theo đúng lộ trình chuyên gia đưa ra, không cần laser xâm lấn.',
    rating: 5,
    avatar: { src: img('3cb371/ffffff', 'HY'), alt: 'Khách hàng Hải Yến' },
  },
  {
    id: 405,
    name: 'Quốc Bảo, 33 tuổi',
    result_title: 'Kiểm soát dầu nhờn & lỗ chân lông to',
    quote: 'Da dầu của mình từng bóng nhờn suốt ngày, sau 5 tuần dùng đúng bộ sản phẩm chuyên gia kê thì lỗ chân lông se khít rõ rệt, makeup lên cũng mịn hơn hẳn.',
    rating: 5,
    avatar: { src: img('264653/ffffff', 'QB'), alt: 'Khách hàng Quốc Bảo' },
  },
  {
    id: 406,
    name: 'Diễm Quỳnh, 22 tuổi',
    result_title: 'Phục hồi da sau mụn ẩn tuổi dậy thì',
    quote: 'Mình bị mụn ẩn dai dẳng suốt 2 năm, đổi bao nhiêu sản phẩm không hết. Đến đây được soi da và kê đúng hoạt chất, da mịn hẳn chỉ sau 6 tuần.',
    rating: 5,
    avatar: { src: img('E76F51/ffffff', 'DQ'), alt: 'Khách hàng Diễm Quỳnh' },
  },
];

module.exports = { testimonials };
