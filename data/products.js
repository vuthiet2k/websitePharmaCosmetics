/**
 * data/products.js — Danh sách sản phẩm demo (giả lập Sapo `product` object)
 *
 * Cấu trúc mỗi product khớp chính xác với các trường được dùng trong:
 *   - product_grid_office.bwt
 *   - product_grid_office_sale.bwt
 *   - product.bwt (trang chi tiết)
 *
 * Ảnh placeholder: placehold.co — thay bằng img_url thực khi có asset.
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function img(color, label, size = '400x400') {
  return `https://placehold.co/${size}/${color}?text=${encodeURIComponent(label)}`;
}

// T-131 (2026-09-12): lỗi JS THẬT trên mọi trang chi tiết sản phẩm (bắt được qua pageerror
// Playwright, có sẵn từ trước đợt sửa này — đã đối chứng bằng cách stash toàn bộ thay đổi):
//   TypeError: Cannot read properties of undefined (reading 'element')
//     at a.selectVariant → selectVariantFromDropdown → initDropdown → new Bizweb.OptionSelectors
// Thư viện chọn biến thể của Sapo (Bizweb.OptionSelectors) đọc product.options[] và
// variant.options[]/option1 để dựng dropdown; dữ liệu mock trước đây chỉ có `title` nên thư viện
// gặp undefined ngay lúc khởi tạo → toàn bộ script sau đó trên trang ngừng chạy.
// Bổ sung đúng hình dạng dữ liệu Sapo thật trả về (option1 + options[]), không đụng template.
function variant(id, title, price, comparePrice, sku, available = true, qty = 20) {
  return {
    id,
    title,
    option1: title,
    option2: null,
    option3: null,
    options: [title],
    price,
    compare_at_price: comparePrice || 0,
    available,
    sku,
    inventory_quantity: available ? qty : 0,
    inventory_policy: 'deny',
  };
}

function makeProduct({
  id, name, alias, type, tags, price, comparePrice,
  variants, images, available, metafields, description, votes,
}) {
  const firstAvailable = variants.find(v => v.available) || variants[0];
  const isAvailable    = available !== false && variants.some(v => v.available);
  return {
    id,
    name,
    alias,
    url:         `/${alias}`,
    description: description || `<p>Sản phẩm <strong>${name}</strong> — chất lượng dược mỹ phẩm chuẩn quốc tế.</p>`,
    vendor:      'PHARMA COSMETICS',
    type:        type || 'Dược mỹ phẩm',
    available:   isAvailable,
    price:       firstAvailable.price,
    compare_at_price: firstAvailable.compare_at_price,
    inventory_quantity: firstAvailable.inventory_quantity,
    inventory_policy: 'deny',
    // T-131: xem ghi chú ở hàm variant() — product.options phải khớp số option của variant.
    options: ['Dung tích'],
    featured_image: { src: images[0], alt: name },
    images: images.map((src, i) => ({ src, alt: `${name} — ảnh ${i + 1}` })),
    tags:    tags || [],
    collections: [],
    variants,
    selected_or_first_available_variant: firstAvailable,
    metafields: {
      custom: { Video: '', Quycach: '', ...((metafields || {}).custom || {}) },
      // T-128 (2026-09-12): trước đây chỉ có `votes` → trang chi tiết hiện trơ trọi "(170 đánh
      // giá)" KHÔNG có ngôi sao nào (widget .sapo-product-reviews-badge là chỗ app Sapo Product
      // Reviews đổ vào trên store thật, ở bản preview này rỗng). Bổ sung điểm trung bình DEMO
      // (tất định theo id để mỗi lần render ra cùng 1 giá trị, không nhảy số) cho widget sao có
      // dữ liệu mà vẽ. Trên store Sapo thật, app reviews vẫn ghi đè badge như cũ.
      bpr:    { votes: votes ?? 50, rating: Math.round((4.4 + ((id % 7) * 0.1)) * 10) / 10 },
    },
  };
}

// ── Danh sách 15 sản phẩm ────────────────────────────────────────────────

const products = [

  // 1 ─ Retinol 0.3% + Peptide (chống lão hoá)
  makeProduct({
    id: 1001, name: 'Kem Dưỡng Retinol 0.3% + Peptide Chống Lão Hoá', alias: 'kem-duong-retinol-0-3-peptide',
    type: 'Kem dưỡng', votes: 170,
    description: 'Chống lão hoá chuyên sâu — da căng mướt, đầy sức sống.',
    tags: ['ban-chay', 'chong-lao-hoa', 'retinol', 'san-pham-noi-bat', 'khuyen-mai'],
    variants: [
      variant(10011, '30ml', 850000, 1200000, 'PC-RET-30', true,  25),
      variant(10012, '50ml', 1250000, 1650000, 'PC-RET-50', true,  12),
    ],
    images: [
      img('d4a373/ffffff', 'Retinol 0.3%'),
      img('c68642/ffffff', 'Retinol – Mặt sau'),
    ],
  }),

  // 2 ─ Serum Vitamin C 15%
  makeProduct({
    id: 1002, name: 'Serum Vitamin C 15% Làm Sáng & Đều Màu Da', alias: 'serum-vitamin-c-15',
    type: 'Serum', votes: 199,
    description: 'Làm sáng đều màu, xoá thâm & rạng rỡ rõ từ tuần đầu.',
    tags: ['lam-sang', 'vitamin-c', 'duong-trang', 'serum', 'san-pham-noi-bat', 'quycach_30ml'],
    variants: [
      variant(10021, '30ml', 650000, 0, 'PC-VTC-30', true, 30),
    ],
    images: [
      img('f4a261/ffffff', 'Vitamin C 15%'),
      img('e76f51/ffffff', 'Vitamin C – Mặt sau'),
    ],
    metafields: { custom: { Quycach: '30ml' } },
  }),

  // 3 ─ Kem chống nắng SPF50+ PA++++
  makeProduct({
    id: 1003, name: 'Kem Chống Nắng Mineral SPF50+ PA++++ Không Nhờn', alias: 'kem-chong-nang-mineral-spf50',
    type: 'Kem chống nắng', votes: 49,
    description: 'Bảo vệ da toàn diện — nhẹ thoáng, không bết dính suốt ngày.',
    tags: ['ban-chay', 'chong-nang', 'spf50', 'khuyen-mai', 'san-pham-noi-bat'],
    variants: [
      variant(10031, '50ml', 480000, 560000, 'PC-SPF-50', true, 40),
    ],
    images: [
      img('90e0ef/333333', 'SPF50+ PA++++'),
      img('48cae4/333333', 'Chống nắng – Mặt sau'),
    ],
  }),

  // 4 ─ Sữa rửa mặt amino acid (2 sizes)
  makeProduct({
    id: 1004, name: 'Sữa Rửa Mặt Tạo Bọt Amino Acid Dịu Nhẹ', alias: 'sua-rua-mat-amino-acid',
    type: 'Làm sạch', votes: 187,
    description: 'Làm sạch dịu nhẹ, giữ ẩm tự nhiên cho da nhạy cảm.',
    tags: ['ban-chay', 'lam-sach-da', 'khuyen-mai'],
    variants: [
      variant(10041, '100ml', 280000, 320000, 'PC-SRM-100', true, 50),
      variant(10042, '200ml', 480000, 540000, 'PC-SRM-200', true, 35),
    ],
    images: [
      img('95d5b2/333333', 'Sữa rửa mặt'),
      img('74c69d/333333', 'SRM – Mặt sau'),
    ],
  }),

  // 5 ─ Toner Niacinamide 5% + Zinc
  makeProduct({
    id: 1005, name: 'Toner Niacinamide 5% + Zinc Kiểm Soát Dầu & Thu Nhỏ Lỗ Chân Lông', alias: 'toner-niacinamide-5-zinc',
    type: 'Toner', votes: 83,
    description: 'Thu nhỏ lỗ chân lông, kiểm soát dầu hiệu quả suốt 8 giờ.',
    tags: ['kiem-soat-dau', 'niacinamide', 'tri-mun', 'ban-chay'],
    variants: [
      variant(10051, '200ml', 320000, 0, 'PC-TON-200', true, 28),
    ],
    images: [
      img('c77dff/ffffff', 'Niacinamide 5%'),
      img('9d4edd/ffffff', 'Toner – Mặt sau'),
    ],
  }),

  // 6 ─ Kem dưỡng ẩm Hyaluronic Acid
  makeProduct({
    id: 1006, name: 'Kem Dưỡng Ẩm Hyaluronic Acid 3 Tầng Căng Mướt Suốt Ngày', alias: 'kem-duong-am-hyaluronic-acid',
    type: 'Kem dưỡng', votes: 165,
    description: 'Cấp ẩm 3 tầng, da căng mướt và mềm mịn cả ngày dài.',
    tags: ['duong-am', 'hyaluronic', 'ban-chay', 'san-pham-noi-bat', 'khuyen-mai'],
    variants: [
      variant(10061, '50ml', 580000, 720000, 'PC-HAC-50', true, 22),
    ],
    images: [
      img('48cae4/ffffff', 'Hyaluronic Acid'),
      img('0096c7/ffffff', 'HA – Mặt sau'),
    ],
  }),

  // 7 ─ Serum AHA 10% / BHA 2%
  makeProduct({
    id: 1007, name: 'Serum Tái Tạo Da AHA 10% / BHA 2% Mịn Màng & Sáng Đều', alias: 'serum-aha-10-bha-2',
    type: 'Serum', votes: 107,
    description: 'Tái tạo da chuyên sâu, mịn màng sáng đều sau 4 tuần.',
    tags: ['tay-da-chet', 'aha-bha', 'ban-chay', 'serum', 'khuyen-mai', 'san-pham-noi-bat'],
    variants: [
      variant(10071, '30ml', 720000, 890000, 'PC-AHA-30', true, 18),
    ],
    images: [
      img('f08080/ffffff', 'AHA 10% BHA 2%'),
      img('e05252/ffffff', 'AHA/BHA – Mặt sau'),
    ],
  }),

  // 8 ─ Mặt nạ Centella (sold out)
  makeProduct({
    id: 1008, name: 'Mặt Nạ Dưỡng Phục Hồi Centella Asiatica (Hộp 5 Miếng)', alias: 'mat-na-centella-asiatica',
    type: 'Mặt nạ', votes: 30, available: false,
    description: 'Phục hồi da kích ứng — dịu mát, tái tạo hàng rào bảo vệ da.',
    tags: ['phuc-hoi', 'centella', 'duong-am'],
    variants: [
      variant(10081, 'Hộp 5 miếng', 180000, 0, 'PC-CTL-5', false, 0),
    ],
    images: [
      img('52b788/ffffff', 'Centella Mask'),
      img('40916c/ffffff', 'Centella – Mặt sau'),
    ],
  }),

  // 9 ─ Kem trị nám Cyspera (cao cấp)
  makeProduct({
    id: 1009, name: 'Kem Trị Nám Cyspera Intensive Pigment Corrector', alias: 'kem-tri-nam-cyspera-intensive',
    type: 'Kem đặc trị', votes: 135,
    description: 'Giảm nám, thâm nám chuyên sâu theo phác đồ chuyên gia da liễu.',
    tags: ['tri-nam', 'cyspera', 'chuyen-nghiep', 'lam-sang', 'quycach_25ml'],
    variants: [
      variant(10091, '25ml', 1850000, 0, 'PC-CYS-25', true, 8),
    ],
    images: [
      img('fff3e0/6d4c41', 'Cyspera Intensive'),
      img('ffe0b2/5d4037', 'Cyspera – Mặt sau'),
    ],
    metafields: { custom: { Quycach: '25ml' } },
  }),

  // 10 ─ Serum Collagen + Tế bào gốc
  makeProduct({
    id: 1010, name: 'Serum Collagen 5000mg + Tế Bào Gốc Phục Hồi & Trẻ Hoá', alias: 'serum-collagen-te-bao-goc',
    type: 'Serum', votes: 118,
    description: 'Collagen kép 5000mg tái tạo da từ bên trong, trẻ hoá rõ rệt.',
    tags: ['collagen', 'te-bao-goc', 'chong-lao-hoa', 'ban-chay', 'serum', 'khuyen-mai', 'san-pham-noi-bat'],
    variants: [
      variant(10101, '30ml', 980000, 1350000, 'PC-COL-30', true, 15),
    ],
    images: [
      img('ffd60a/333333', 'Collagen 5000mg'),
      img('ffbe0b/333333', 'Collagen – Mặt sau'),
    ],
  }),

  // 11 ─ Retinol Advanced 0.5% Night Serum (2 sizes)
  makeProduct({
    id: 1011, name: 'Retinol Advanced 0.5% Night Serum Chống Lão Hoá Chuyên Sâu', alias: 'retinol-advanced-0-5-night-serum',
    type: 'Serum', votes: 146,
    description: 'Tái tạo da ban đêm — xoá nhăn, mờ đốm sắc tố qua từng đêm ngủ.',
    tags: ['retinol', 'chong-lao-hoa', 'ban-dem', 'serum', 'chuyen-nghiep'],
    variants: [
      variant(10111, '15ml', 980000,  0, 'PC-RAS-15', true, 10),
      variant(10112, '30ml', 1200000, 0, 'PC-RAS-30', true, 6),
    ],
    images: [
      img('c9a0b1/ffffff', 'Retinol 0.5%'),
      img('b5838d/ffffff', 'Retinol Advanced – Mặt sau'),
    ],
  }),

  // 12 ─ Kem mắt Peptide 3D
  makeProduct({
    id: 1012, name: 'Kem Mắt Peptide 3D Chống Quầng Thâm & Nhăn Vùng Mắt', alias: 'kem-mat-peptide-3d',
    type: 'Kem mắt', votes: 153,
    description: 'Chống quầng thâm, xoá nhăn vùng mắt với Peptide 3D.',
    tags: ['kem-mat', 'peptide', 'chong-lao-hoa', 'khuyen-mai', 'san-pham-noi-bat'],
    variants: [
      variant(10121, '15ml', 680000, 850000, 'PC-EYE-15', true, 14),
    ],
    images: [
      img('cdb4db/333333', 'Kem Mắt Peptide'),
      img('b89cba/333333', 'Kem mắt – Mặt sau'),
    ],
  }),

  // 13 ─ Gel trị mụn Benzoyl Peroxide 5%
  makeProduct({
    id: 1013, name: 'Gel Trị Mụn Benzoyl Peroxide 5% Diệt Khuẩn & Ngăn Tái Phát', alias: 'gel-tri-mun-benzoyl-peroxide-5',
    type: 'Gel đặc trị', votes: 99,
    description: 'Diệt khuẩn mụn tức thì, ngăn tái phát — hiệu quả từ đêm đầu.',
    tags: ['tri-mun', 'benzoyl-peroxide', 'ban-chay', 'khuyen-mai', 'quycach_20g'],
    variants: [
      variant(10131, '20g', 195000, 240000, 'PC-GEL-20', true, 60),
    ],
    images: [
      img('b7e4c7/333333', 'Benzoyl Peroxide 5%'),
      img('95d5b2/333333', 'Gel mụn – Mặt sau'),
    ],
    metafields: { custom: { Quycach: '20g' } },
  }),

  // 14 ─ Kem phục hồi Ceramide + Niacinamide
  makeProduct({
    id: 1014, name: 'Kem Phục Hồi Hàng Rào Da Ceramide + Niacinamide Chuyên Sâu', alias: 'kem-phuc-hoi-ceramide-niacinamide',
    type: 'Kem dưỡng', votes: 124,
    description: 'Củng cố hàng rào da, nuôi dưỡng chuyên sâu cho da khô & nhạy cảm.',
    tags: ['phuc-hoi', 'ceramide', 'duong-am', 'chuyen-nghiep', 'san-pham-noi-bat'],
    variants: [
      variant(10141, '50ml', 760000, 0, 'PC-CRM-50', true, 17),
    ],
    images: [
      img('dee2ff/333333', 'Ceramide Repair'),
      img('c5b8e8/333333', 'Ceramide – Mặt sau'),
    ],
  }),

  // 15 ─ Serum Tranexamic Acid 3%
  makeProduct({
    id: 1015, name: 'Serum Mờ Thâm Tranexamic Acid 3% & Niacinamide Đều Màu Da', alias: 'serum-tranexamic-acid-3',
    type: 'Serum', votes: 136,
    description: 'Mờ thâm nám, đều màu da — hiệu quả kép rõ từ tuần thứ 2.',
    tags: ['mo-tham', 'tranexamic', 'lam-sang', 'serum', 'khuyen-mai', 'ban-chay'],
    variants: [
      variant(10151, '30ml', 850000, 1000000, 'PC-TXA-30', true, 20),
    ],
    images: [
      img('fec89a/333333', 'Tranexamic Acid 3%'),
      img('fca55a/333333', 'TXA – Mặt sau'),
    ],
  }),

];

// ── Tra nhanh theo id hoặc alias ────────────────────────────────────────────

const byId    = Object.fromEntries(products.map(p => [p.id, p]));
const byAlias = Object.fromEntries(products.map(p => [p.alias, p]));

module.exports = { products, byId, byAlias };
