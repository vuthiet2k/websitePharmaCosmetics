/**
 * data/b2b-tiers.js — REOPEN 2026-09-10 (ADR-007/T-80, MOD-04 xlsx Portal B2B/B2C)
 * Chính sách giá theo tier cho Đại Lý Phân Phối. Mock preview (mock_policy#frontend_theme) —
 * số liệu minh hoạ, KHÔNG phải bảng giá thật đã ký hợp đồng.
 */

const b2bTiers = [
  {
    id: 'starter',
    name: 'Đại lý Khởi Điểm',
    min_order_value: '10.000.000đ / đơn',
    discount_pct: '15%',
    features: [
      'Chiết khấu 15% trên giá niêm yết',
      'Hỗ trợ catalogue + hình ảnh sản phẩm chuẩn hoá',
      'Giao hàng toàn quốc, thanh toán COD',
    ],
  },
  {
    id: 'bronze',
    name: 'Đại lý Đồng',
    min_order_value: '20.000.000đ / đơn',
    discount_pct: '18%',
    features: [
      'Chiết khấu 18% trên giá niêm yết',
      'Ưu tiên xử lý đơn trong 48h',
      'Hỗ trợ mẫu thử (tester) theo từng đợt phát hàng mới',
    ],
  },
  {
    id: 'growth',
    name: 'Đại lý Phát Triển',
    min_order_value: '30.000.000đ / đơn',
    discount_pct: '22%',
    features: [
      'Chiết khấu 22% trên giá niêm yết',
      'Ưu tiên xử lý đơn trong 24h',
      'Nhân viên kinh doanh phụ trách riêng khu vực',
      'Hỗ trợ đào tạo tư vấn sản phẩm cho nhân viên đại lý',
    ],
    featured: true,
  },
  {
    id: 'silver',
    name: 'Đại lý Bạc',
    min_order_value: '50.000.000đ / đơn',
    discount_pct: '25%',
    features: [
      'Chiết khấu 25% trên giá niêm yết',
      'Ưu tiên xử lý đơn trong 12h',
      'Hỗ trợ chi phí trưng bày (merchandising) hàng quý',
      'Được tham gia chương trình dùng thử sản phẩm mới sớm',
    ],
  },
  {
    id: 'strategic',
    name: 'Đối Tác Chiến Lược',
    min_order_value: '80.000.000đ / đơn',
    discount_pct: '30%',
    features: [
      'Chiết khấu 30% trên giá niêm yết',
      'Hợp đồng phân phối độc quyền khu vực (thoả thuận riêng)',
      'Hỗ trợ marketing tại điểm bán (POSM)',
      'Ưu tiên nhập hàng mới trước thị trường',
    ],
  },
  {
    id: 'exclusive',
    name: 'Nhà Phân Phối Độc Quyền',
    min_order_value: '150.000.000đ / đơn',
    discount_pct: '35%',
    features: [
      'Chiết khấu 35% trên giá niêm yết',
      'Độc quyền phân phối theo tỉnh/thành (thoả thuận hợp đồng riêng)',
      'Đội ngũ hỗ trợ kỹ thuật + đào tạo chuyên sâu định kỳ',
      'Ưu tiên tuyệt đối nguồn hàng khi có biến động cung ứng',
    ],
  },
];

module.exports = { b2bTiers };
