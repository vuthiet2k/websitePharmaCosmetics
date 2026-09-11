/**
 * data/loyalty-tiers.js — Hạng thành viên cho page.loyalty.bwt (Loyalty Rewards & Points)
 */

const loyaltyTiers = [
  {
    id: 'member',
    name: 'Thành viên',
    threshold_points: 0,
    perks: ['Tích 1 điểm / 10.000đ', 'Ưu đãi sinh nhật 10%'],
    color: '#DBDFD5',
  },
  {
    id: 'silver',
    name: 'Bạc',
    threshold_points: 500,
    perks: ['Tích 1.2 điểm / 10.000đ', 'Ưu đãi sinh nhật 15%', 'Tư vấn da ưu tiên'],
    color: '#B9C4BE',
  },
  {
    id: 'gold',
    name: 'Vàng',
    threshold_points: 2000,
    perks: ['Tích 1.5 điểm / 10.000đ', 'Ưu đãi sinh nhật 20%', 'Miễn phí 1 buổi soi da/năm', 'Quà tặng độc quyền theo quý'],
    color: '#DE9E7D',
  },
  {
    id: 'platinum',
    name: 'Bạch Kim',
    threshold_points: 5000,
    perks: ['Tích 2 điểm / 10.000đ', 'Ưu đãi sinh nhật 25%', 'Chuyên gia da riêng', 'Ưu tiên đặt lịch mọi khung giờ'],
    color: '#3cb371',
  },
  {
    id: 'diamond',
    name: 'Kim Cương',
    threshold_points: 10000,
    perks: ['Tích 2.5 điểm / 10.000đ', 'Ưu đãi sinh nhật 30%', 'Miễn phí 2 buổi soi da/năm', 'Quà tặng độc quyền theo tháng', 'Đường dây tư vấn ưu tiên 24/7'],
    color: '#7C3AED',
  },
  {
    id: 'ambassador',
    name: 'Đại Sứ Thương Hiệu',
    threshold_points: 20000,
    perks: ['Tích 3 điểm / 10.000đ', 'Ưu đãi sinh nhật 35%', 'Mời tham gia sự kiện ra mắt sản phẩm mới', 'Chuyên gia da riêng đồng hành trọn năm', 'Trải nghiệm miễn phí toàn bộ liệu trình mới trước khi ra mắt'],
    color: '#B8860B',
  },
];

module.exports = { loyaltyTiers };
