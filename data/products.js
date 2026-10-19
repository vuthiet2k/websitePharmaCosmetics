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
  variants, images, available, metafields, description, votes, content, summary, collections, vendor, template_suffix, imageAlts, options,
}) {
  const firstAvailable = variants.find(v => v.available) || variants[0];
  const isAvailable    = available !== false && variants.some(v => v.available);
  return {
    id,
    name,
    alias,
    url:         `/${alias}`,
    description: description || `<p>Sản phẩm <strong>${name}</strong> — chất lượng dược mỹ phẩm chuẩn quốc tế.</p>`,
    content:     content || '',
    summary:     summary || '',
    vendor:      vendor || 'PHARMA COSMETICS',
    type:        type || 'Dược mỹ phẩm',
    available:   isAvailable,
    price:       firstAvailable.price,
    compare_at_price: firstAvailable.compare_at_price,
    inventory_quantity: firstAvailable.inventory_quantity,
    inventory_policy: 'deny',
    // T-131: xem ghi chú ở hàm variant() — product.options phải khớp số option của variant.
    options: options || ['Dung tích'],
    // 2026-10-17: giao diện riêng sản phẩm (Sapo › Sản phẩm › Giao diện), vd 'lieu-trinh' ⇒ templates/product.lieu-trinh.bwt
    template_suffix: template_suffix || '',
    featured_image: { src: images[0], alt: (imageAlts && imageAlts[0]) || name },
    images: images.map((src, i) => ({ src, alt: (imageAlts && imageAlts[i]) || `${name} — ảnh ${i + 1}` })),
    tags:    tags || [],
    // 2026-10-07: danh mục chứa sản phẩm ({ name, alias, url }) — snippets/pc_is_rx.bwt nhận kê toa theo danh mục.
    collections: collections || [],
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

// 2026-10-18: ẢNH MẪU (khung chỗ) cho các vị trí ảnh GetGlowing CHƯA có ảnh thật — để bản dev + ảnh chụp trong
// docs/huong-dan-tao-lieu-trinh.md thấy đủ bố cục và biết ảnh nào đặt ở đâu. Chữ trên ảnh = khoá alt + kích thước.
// KHÔNG phải ảnh thật; trên Sapo thay bằng ảnh chụp/thiết kế đã duyệt (mục "Ảnh cần chuẩn bị" trong tài liệu).
const ltSlot = (w, h, bg, fg, label) => `https://placehold.co/${w}x${h}/${bg}/${fg}?text=${encodeURIComponent(label)}`;
const LT_DEMO_SLOTS = [
  [ltSlot(1920, 900, '003F2D', 'FFFFFF', 'ẢNH MẪU · [banner] 1920×900'), '[banner] ẢNH MẪU – banner GetGlowing Micro-Peel'],
  [ltSlot(1080, 1350, '003F2D', 'FFFFFF', 'ẢNH MẪU · [banner-mobile] 1080×1350'), '[banner-mobile] ẢNH MẪU – banner dọc'],
  [ltSlot(1200, 900, 'DCE5DF', '075B40', 'ẢNH MẪU · [buoc-1] 1200×900'), '[buoc-1] ẢNH MẪU – phân tích da'],
  [ltSlot(1200, 900, 'DCE5DF', '075B40', 'ẢNH MẪU · [buoc-4] 1200×900'), '[buoc-4] ẢNH MẪU – chăm sóc sau peel'],
  [ltSlot(1200, 900, 'DCE5DF', '075B40', 'ẢNH MẪU · [buoc-5] 1200×900'), '[buoc-5] ẢNH MẪU – theo dõi và điều chỉnh'],
];

const products = [

  // 1 ─ Retinol 0.3% + Peptide (chống lão hoá)
  makeProduct({
    id: 1001, name: 'Kem Dưỡng Retinol 0.3% + Peptide Chống Lão Hoá', alias: 'kem-duong-retinol-0-3-peptide',
    type: 'Kem dưỡng', votes: 170,
    description: 'Chống lão hoá chuyên sâu — da căng mướt, đầy sức sống.',
    tags: ['ban-chay', 'chong-lao-hoa', 'retinol', 'san-pham-noi-bat', 'khuyen-mai', 'hoatchat:retinol', 'hoatchat:hyaluronic-acid'],
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
    // 2026-10-05: URL Shopee có dấu "_" — fixture kiểm bug cắt link `split: '_' | last` (PDP V3).
    tags: ['lam-sang', 'vitamin-c', 'duong-trang', 'serum', 'san-pham-noi-bat', 'quycach_30ml', 'hoatchat:vitamin-c', 'hoatchat:niacinamide', 'shopee_https://shopee.vn/Serum_Vitamin_C_15-i.123456.789', 'xuatxu:Việt Nam'],
    // 2026-10-05 (PDP V3 — PRD mục 10): fixture mô tả chia mục bằng <h2> ⇒ tách thành tab; mục "Lưu ý" rỗng
    // để kiểm tab trống bị bỏ. Câu chữ minh hoạ preview, không phải dữ liệu lâm sàng.
    content: '<p>Đoạn mở đầu.</p><h2>Thông tin sản phẩm</h2><p>Serum dạng lỏng nhẹ, chai 30ml.</p>'
      + '<h2 style="text-align:left">Thành phần</h2><p>Vitamin C, Niacinamide.</p>'
      + '<h2>Hướng dẫn sử dụng</h2><p>Dùng buổi sáng sau bước làm sạch.</p><h2>Lưu ý</h2><p> </p>',
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
    tags: ['nhan:Bán chạy', 'voucher:-10%', 'ban-chay', 'lam-sach-da', 'khuyen-mai'],
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
    tags: ['nhan:Hàng mới', 'voucher:-10%', 'freeship', 'duong-am', 'hyaluronic', 'ban-chay', 'san-pham-noi-bat', 'khuyen-mai', 'hoatchat:hyaluronic-acid', 'hoatchat:centella'],
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
    tags: ['nhan:Đề xuất', 'freeship', 'phuc-hoi', 'centella', 'duong-am'],
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
    tags: ['nhan:Yêu thích', 'phuc-hoi', 'ceramide', 'duong-am', 'chuyen-nghiep', 'san-pham-noi-bat'],
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

  // 16 ─ Sản phẩm KÊ TOA (2026-10-05, PDP V3) — kiểm ẩn giá/nút mua/đánh giá.
  // 2026-10-07: nhận kê toa theo DANH MỤC (settings.product_rx_collection = thuoc-ke-don), không còn tag loai:ke-toa.
  makeProduct({
    id: 1016, name: 'Altreno Lotion 0.05% (Tretinoin)', alias: 'altreno-lotion-0-05-tretinoin',
    type: 'Tretinoin', vendor: 'Altreno', votes: 0,
    description: 'Thuốc kê đơn dùng ngoài da — sử dụng theo chỉ định và hướng dẫn của chuyên gia.',
    tags: ['tretinoin', 'xuatxu:Mỹ', 'shopee_https://shopee.vn/Altreno_Test-i.1.2'],
    // 2026-10-08: thuộc cả danh mục thật ISOTRETINOIN (settings.product_rx_collection đang chọn trên store) lẫn
    // danh mục demo thuoc-ke-don ⇒ preview/test nhận kê toa với cả hai cấu hình.
    collections: [{ name: 'Thuốc kê đơn', alias: 'thuoc-ke-don', url: '/thuoc-ke-don' }, { name: 'ISOTRETINOIN (ĐƯỜNG UỐNG)', alias: 'isotretinoin', url: '/isotretinoin' }],
    // 2026-10-07: mô tả ngắn = đoạn dẫn + gạch đầu dòng "Tiêu đề | dòng phụ" ⇒ 3 ô thông tin. Câu chữ minh hoạ preview.
    summary: '<p>Thuốc bôi ngoài da kê đơn, chứa tretinoin 0.05% dạng lotion. Chỉ định và cách dùng theo nhãn sản phẩm và hướng dẫn của người có chuyên môn.</p>'
      + '<ul><li>Điều trị mụn trứng cá | Theo chỉ định trên nhãn sản phẩm</li><li>Dạng lotion 0.05% | Bôi ngoài da</li><li>Bán theo đơn | Đơn của chuyên gia, dược sĩ duyệt</li></ul>',
    variants: [
      variant(10161, '45g', 1250000, 0, 'ALT05', true, 10),
    ],
    images: [
      img('e6f2ec/003F2D', 'Altreno 0.05%'),
    ],
  }),

  // 2026-10-17 — LIỆU TRÌNH (giao diện product.lieu-trinh): dữ liệu THẬT của sản phẩm trên pharmacosmetics-vn.com (tên, alias, hãng,
  // giá, 8 ảnh, Mô tả chi tiết) + tag khoá:giá trị / alt [khoá] theo docs/huong-dan-tao-lieu-trinh.md. Ảnh 3/5/7 là ảnh trước–sau
  // KHÔNG rõ là khách của Skin Health Beauty ⇒ không gắn khoá, trang liệu trình không dùng làm "kết quả".
  makeProduct({
    id: 90539969, name: "Elaine Brennan GetGlowing Micro-Peel – Liệu Trình Peel Chuyên Nghiệp Hỗ Trợ Làm Sáng Và Cải Thiện Bề Mặt Da", alias: "elaine-brennan-getglowing-micro-peel-lieu-trinh-peel-chuyen-nghiep-ho-tro-lam-sang-va-cai-thien-be-mat-da",
    vendor: 'Elaine Brennan', type: 'peel', votes: 0, template_suffix: 'lieu-trinh', options: ['Title'],
    collections: [{ name: 'Điều trị chuyên nghiệp', alias: 'dieu-tri-chuyen-nghiep', url: '/dieu-tri-chuyen-nghiep' }],
    tags: ["GetGlowing Micro-Peel tại Skin Health Beauty.", "peel da ít thời gian nghỉ dưỡng", "peel Resorcinol Kojic Acid Salicylic Acid", "peel cải thiện sắc tố", "peel da chuyên nghiệp", "Elaine Brennan GetGlowing Micro-Peel",
      'tenngan:GetGlowing Micro-Peel', 'tieude:GetGlowing Micro-Peel – Liệu trình peel da đa mục tiêu tại Hà Nội',
      'phude:Một liệu trình – Nhiều mục tiêu cải thiện làn da',
      'congthuc:Công thức peel chuyên nghiệp hướng tới cải thiện kết cấu – bít tắc và sắc tố trên bề mặt da.',
      'thoigian:Khoảng 30–60 phút tùy quy trình', 'diadiem:Skin Health Beauty – Hà Nội',
      'vande:mun-va-bit-tac', 'vande:tham-sau-mun', 'vande:sac-to-khong-dong-deu', 'vande:be-mat-san-rap', 'vande:dau-hieu-lao-hoa-som',
      'hoatchat:resorcinol', 'hoatchat:salicylic-acid', 'hoatchat:kojic-acid'],
    summary: '<p>GetGlowing Micro-Peel là liệu trình tái tạo bề mặt đa mục tiêu dành cho nền da phù hợp, hỗ trợ cải thiện bít tắc, thâm mụn, sắc tố không đồng đều, bề mặt thô ráp và các dấu hiệu lão hóa sớm.</p><p>Tại Skin Health Beauty, mỗi làn da được phân tích, cá nhân hóa và theo dõi xuyên suốt liệu trình bởi chuyên gia có hơn 10 năm kinh nghiệm trong lĩnh vực chăm sóc và trị liệu da.</p>',
    content: "<h1 data-end=\"109\" data-section-id=\"2gwdnf\" data-start=\"0\">Elaine Brennan GetGlowing Micro-Peel – Liệu Trình Peel Chuyên Nghiệp Hỗ Trợ Làm Sáng Và Cải Thiện Bề Mặt Da</h1>\n<p><strong data-end=\"170\" data-start=\"130\">Elaine Brennan GetGlowing Micro-Peel</strong> là liệu trình peel da chuyên nghiệp sử dụng công thức dạng kem nhằm hỗ trợ loại bỏ tế bào chết, làm mới bề mặt và thúc đẩy quá trình tái tạo tự nhiên của da. Liệu trình hướng đến việc cải thiện làn da xỉn màu, không đều màu, bề mặt thô ráp, dấu vết sau mụn và các đường nhăn nhỏ.</p>\n<p>GetGlowing Micro-Peel được phát triển dành cho những khách hàng mong muốn hiệu quả làm mới da của phương pháp Elaine Brennan nhưng cần thời gian phục hồi ngắn hơn so với <strong data-end=\"658\" data-start=\"622\">Elaine Brennan Skin Renewal Peel</strong>. Phác đồ cần được điều chỉnh theo loại da, tình trạng thực tế và mục tiêu dài hạn của từng khách hàng.</p>\n<p><strong data-end=\"870\" data-start=\"860\">Lưu ý:</strong> Đây là sản phẩm dành riêng cho người hành nghề chăm sóc da có chuyên môn, không bán và không được tự peel tại nhà.</p>\n<p>&nbsp;</p>\n<p><strong>ƯU ĐIỂM NỔI BẬT</strong></p>\n<p><strong data-end=\"1031\" data-start=\"1009\">Làm mới bề mặt da:</strong> Hỗ trợ loại bỏ tế bào chết, cải thiện tình trạng da thô ráp và kém mịn màng.</p>\n<p><strong data-end=\"1140\" data-start=\"1112\">Hỗ trợ cải thiện sắc tố:</strong> Giúp làm đều màu, giảm vẻ xỉn màu và hỗ trợ cải thiện các đốm sắc tố bề mặt.</p>\n<p><strong data-end=\"1260\" data-start=\"1221\">Tác động trên nhiều vấn đề thẩm mỹ:</strong> Hướng đến tình trạng nếp nhăn nhỏ, dấu vết sau mụn, bề mặt không đồng đều và da chịu ảnh hưởng từ ánh nắng, ô nhiễm.</p>\n<p><strong data-end=\"1405\" data-start=\"1381\">Mức độ peel nhẹ hơn:</strong> So với Elaine Brennan Skin Renewal Peel, GetGlowing tạo quá trình bong nhẹ hơn và có thời gian phục hồi dễ sắp xếp hơn.</p>\n<p><strong data-end=\"1562\" data-start=\"1529\">Cá nhân hóa theo từng nền da:</strong> Tần suất và liệu trình được điều chỉnh dựa trên loại da, khả năng phục hồi và mục tiêu chăm sóc.</p>\n<p><strong data-end=\"1695\" data-start=\"1663\">Hiệu quả cải thiện tích lũy:</strong> Có thể nhận thấy thay đổi sau lần đầu, đồng thời kết quả tiếp tục được cải thiện qua các buổi thực hiện kế tiếp.</p>\n<p>&nbsp;</p>\n<p><strong>THÀNH PHẦN VÀ CÔNG DỤNG CỦA&nbsp;Elaine Brennan GetGlowing Micro-Peel</strong></p>\n<p><strong>Thành phần chính</strong></p>\n<p><strong data-end=\"1848\" data-start=\"1833\">Resorcinol:</strong> Hoạt chất tiêu sừng giúp làm mềm và loại bỏ lớp tế bào chết thô ráp, hỗ trợ làm thông thoáng bề mặt và cải thiện kết cấu da.</p>\n<p><strong data-end=\"1992\" data-start=\"1977\">Kojic Acid:</strong> Hoạt chất chống oxy hóa và hỗ trợ làm sáng, tác động lên quá trình hình thành Melanin, giúp cải thiện tình trạng da xỉn màu và không đều màu.</p>\n<p><strong data-end=\"2157\" data-start=\"2138\">Salicylic Acid:</strong> BHA tan trong dầu giúp loại bỏ tế bào chết, hỗ trợ làm sạch lỗ chân lông, giảm bít tắc và cải thiện da dầu, mụn đầu đen, mụn đầu trắng.</p>\n<p><strong>Công dụng</strong></p>\n<p>Tẩy tế bào chết và làm mới bề mặt da.</p>\n<p>Cải thiện kết cấu da thô ráp, sần và kém mềm mại.</p>\n<p>Hỗ trợ làm đều màu và cải thiện vẻ xỉn màu.</p>\n<p>Giảm sự xuất hiện của các đường nhăn nhỏ.</p>\n<p>Hỗ trợ cải thiện dấu vết và sắc tố sau mụn.</p>\n<p>Làm thông thoáng bề mặt da dễ bít tắc.</p>\n<p>Hỗ trợ cải thiện những dấu hiệu da chịu tác động từ ánh nắng và ô nhiễm.</p>\n<p>Giúp làn da sau giai đoạn phục hồi trông tươi sáng, mịn màng hơn.</p>\n<p>GetGlowing Micro-Peel không phải liệu trình cấp ẩm trực tiếp. Hiệu ứng căng bóng phụ thuộc vào quá trình làm mới bề mặt, chăm sóc phục hồi và chống nắng sau peel.</p>\n<p>&nbsp;</p>\n<p><strong>Đối tượng phù hợp&nbsp;CỦA&nbsp;Elaine Brennan GetGlowing Micro-Peel</strong></p>\n<p>Da xỉn màu, không đều màu.</p>\n<p>Da thô ráp, bề mặt sần hoặc dày sừng.</p>\n<p>Da có mụn đầu đen, mụn đầu trắng và bít tắc nhẹ.</p>\n<p>Da có vết thâm hoặc dấu vết sau mụn.</p>\n<p>Da có đường nhăn nhỏ và dấu hiệu lão hóa sớm.</p>\n<p>Da chịu ảnh hưởng từ ánh nắng, khói bụi và môi trường.</p>\n<p>Người muốn thực hiện peel chuyên nghiệp nhưng không phù hợp với thời gian phục hồi dài của Elaine Brennan Skin Renewal Peel.</p>\n<p>&nbsp;</p>\n<p><strong>Trường hợp cần thận trọng</strong></p>\n<p>Da đang có vết thương hở, nhiễm trùng hoặc cháy nắng.</p>\n<p>Da đang đỏ rát, bong tróc hoặc có hàng rào bảo vệ suy yếu.</p>\n<p>Mụn viêm nặng, tổn thương lan rộng hoặc đang rỉ dịch.</p>\n<p>Da đang bùng phát Eczema, Psoriasis, Rosacea hoặc viêm da.</p>\n<p>Người đang sử dụng Isotretinoin, Retinoid hoặc thuốc làm tăng độ nhạy cảm của da.</p>\n<p>Người có tiền sử dị ứng với Resorcinol, Salicylic Acid hoặc Aspirin.</p>\n<p>Phụ nữ mang thai, đang cho con bú hoặc đang điều trị bệnh lý cần thông báo đầy đủ với người thực hiện trước khi peel.</p>\n<p>Chỉ tiến hành sau khi được thăm khám và xác định không có chống chỉ định.</p>\n<p>&nbsp;</p>\n<p><strong>Quy trình và liệu trình tham khảo</strong></p>\n<p><strong data-end=\"4322\" data-start=\"4308\">Thăm khám:</strong> Đánh giá loại da, tình trạng sắc tố, mức độ nhạy cảm, thuốc và các hoạt chất đang sử dụng.</p>\n<p><strong data-end=\"4441\" data-start=\"4417\">Thời gian thực hiện:</strong> Khoảng 30–60 phút tùy quy trình tại cơ sở.</p>\n<p><strong data-end=\"4510\" data-start=\"4488\">Số buổi tham khảo:</strong> Một liệu trình tối ưu thường gồm khoảng <strong data-end=\"4561\" data-start=\"4551\">6 buổi</strong>.</p>\n<p><strong data-end=\"4596\" data-start=\"4566\">Khoảng cách giữa các buổi:</strong> Từ <strong data-end=\"4612\" data-start=\"4600\">2–6 tuần</strong>, tùy loại da và khả năng phục hồi.</p>\n<p><strong data-end=\"4664\" data-start=\"4651\">Hiệu quả:</strong> Có thể nhận thấy da mềm và tươi mới hơn sau lần đầu; mức cải thiện thường tăng dần qua từng buổi.</p>\n<p>&nbsp;</p>\n<p><strong>Thời gian phục hồi</strong></p>\n<p>Trong khoảng một tuần sau liệu trình, da sẽ trải qua quá trình thay mới bề mặt. Khách hàng có thể gặp:</p>\n<p>Khô và căng nhẹ.</p>\n<p>Đỏ hoặc ngứa nhẹ.</p>\n<p>Có hoặc không xuất hiện bong da.</p>\n<p>Nếu bong, hiện tượng này thường bắt đầu vào ngày thứ 4 hoặc thứ 5 và kéo dài khoảng 3 ngày.</p>\n<p>Mức độ phản ứng khác nhau tùy nền da và cường độ thực hiện; “ít thời gian nghỉ dưỡng” không đồng nghĩa hoàn toàn không bong hoặc không kích ứng.</p>\n<p>&nbsp;</p>\n<p><strong>Chăm sóc sau peel</strong></p>\n<p>Làm sạch bằng sản phẩm dịu nhẹ.</p>\n<p>Tập trung serum cấp ẩm và kem dưỡng phục hồi.</p>\n<p>Sử dụng kem chống nắng phổ rộng và che chắn kỹ.</p>\n<p>Không cạy, bóc hoặc chà xát phần da đang bong.</p>\n<p>Tạm ngưng Retinoid, AHA, BHA, Benzoyl Peroxide, tẩy tế bào chết và các hoạt chất mạnh theo thời gian được chuyên viên hướng dẫn.</p>\n<p>Tránh xông hơi, tập luyện quá nóng, hồ bơi và tiếp xúc nắng mạnh trong giai đoạn da đang nhạy cảm.</p>\n<p>Liên hệ cơ sở thực hiện nếu xuất hiện sưng, phồng rộp, đau rát tăng dần hoặc đỏ kéo dài bất thường.</p>\n<p style=\"display: block; width: 0px; height: 0px; padding: 0px; border: 0px; margin: 0px; position: absolute; top: 0px; left: -9999px; opacity: 0; overflow: hidden;\">&nbsp;</p>",
    variants: [variant(905399691, 'Default Title', 4000000, 0, 'GG-MICROPEEL', true, 99)],
    images: ["https://bizweb.dktcdn.net/100/415/053/products/kho-ng-co-tie-u-de-1-8b507349-501b-48e2-bb09-78e401bbdc17.jpg?v=1788837104357","https://bizweb.dktcdn.net/100/415/053/products/kho-ng-co-tie-u-de-1-6f139bdd-7dd6-41d7-893d-37ab90b70a2d.jpg?v=1789442304080","https://bizweb.dktcdn.net/100/415/053/products/kho-ng-co-tie-u-de-1-aa7c0758-4508-4f05-a1a5-22765e0897da.jpg?v=1789442389240","https://bizweb.dktcdn.net/100/415/053/products/kho-ng-co-tie-u-de-1-004199eb-409b-4de6-a227-698024413c48.jpg?v=1789442381737","https://bizweb.dktcdn.net/100/415/053/products/1788837047154-2229272533530168505-4823401761719881638-49f36d99966f2ecbb1bccf00b8d96c49.jpg?v=1789442381737","https://bizweb.dktcdn.net/100/415/053/products/1788837047247-2229272533530168505-4823401761719881638-65306cda4ce5d20a73a77a2e7cc1a3a4.jpg?v=1789442381737","https://bizweb.dktcdn.net/100/415/053/products/1788837047427-2229272533530168505-4823401761719881638-4c5a34c2c9087b9bfcd09797d4840fc0.jpg?v=1789442381737","https://bizweb.dktcdn.net/100/415/053/products/1788837047690-2229272533530168505-4823401761719881638-9dd96ab243bfa1ca69ae4813912fea75.jpg?v=1789442381737", ...LT_DEMO_SLOTS.map((x) => x[0])],
    imageAlts: [
      '[sanpham] Lọ Elaine Brennan GetGlowing Micro-Peel',
      '[hero] GetGlowing Micro-Peel – peel chuyên nghiệp làm sáng và cải thiện bề mặt da',
      '[congthuc] Công thức đa tác động: Resorcinol – Kojic Acid – Salicylic Acid',
      'Ảnh tham khảo của hãng',
      '[buoc-2] Làm sạch và chuẩn bị bề mặt trước khi peel',
      'Ảnh tham khảo của hãng',
      '[buoc-3] Thực hiện GetGlowing Micro-Peel',
      'Ảnh tham khảo của hãng',
      ...LT_DEMO_SLOTS.map((x) => x[1]),
    ],
  }),

  // 2026-10-18: DEMO tag video (khối Liệu trình trang Skin Health Beauty): DECAAR = youtube, DERMICA = facebook, INFINI = cả 2
  // (youtube thắng). Video thật của kênh Pharma Cosmetics nhưng KHÔNG phải video của các liệu trình này — chỉ để thử bố cục.
  // 2026-10-17 — 5 liệu trình THẬT khác trên pharmacosmetics-vn.com (tên/ảnh/giá/mô tả), chưa gắn tag khoá:giá trị ⇒ minh hoạ trang
  // liệu trình khi thiếu dữ liệu (phần vấn đề da/hoạt chất tự ẩn) và thẻ ở danh mục liệu trình.
  makeProduct({ id: 59349849, name: "DECAAR ALGAE PEELING REGIMEN: Vi Tảo Sinh Trị Liệu Gen", alias: "decaar-algae-peeling-regimen-vi-tao-sinh-tri-lieu-gen", type: 'Liệu trình', vendor: 'Skin Health Beauty', votes: 0, template_suffix: 'lieu-trinh', options: ['Title'],
    collections: [{ name: 'Điều trị chuyên nghiệp', alias: 'dieu-tri-chuyen-nghiep', url: '/dieu-tri-chuyen-nghiep' }],
    tags: ['youtube:4B9RN_wcl_I', "liệu trình"], summary: "<h3><b>DECAAR ALGAE PEELING REGIMEN: Vi Tảo Sinh Trị Liệu Gen</b></h3>\n<p>Làn da bạn đang gặp đa vấn đề (mụn, sắc tố, lão hóa) và không đáp ứng với điều trị? <b>ALGAE PEELING REGIMEN</b> từ <b>DECAAR (Châu Âu)</b> là liệu pháp vi tảo sinh học đột phá, tác động trực tiếp lên <b>Gen Da</b> để phục hồi chức năng tự nhiên của da. Liệu trình giúp <b>thải độc, điều trị mụn, cân bằng sắc tố</b> và <b>tái tạo da</b> mạnh mẽ từ tầng sâu. Trải nghiệm ngay để sở hữu làn da khỏe mạnh, ổn định và rạng rỡ.</p>", content: "<h3><b>DECAAR ALGAE PEELING REGIMEN: Vi Tảo Sinh Trị Liệu Gen</b></h3>\n<p>Tại <b>PHARMA COSMETICS</b>, chúng tôi hiểu rằng mỗi làn da là một câu chuyện riêng. Đó là lý do tại sao mọi liệu trình, bao gồm cả liệu pháp <b>ALGAE PEELING REGIMEN</b>, đều được thực hiện tại phòng chăm sóc da riêng biệt <b>SKIN HEALTH BEAUTY</b> với mô hình điều trị 1:1.</p>\n<ul>\n<li>\n<p><b>Tập trung hoàn toàn cho bạn:</b> Chuyên viên của chúng tôi sẽ dành toàn bộ thời gian và sự tập trung để thăm khám, phân tích và thực hiện liệu trình chuyên biệt, phù hợp 100% với tình trạng da của bạn.</p></li>\n<li>\n<p><b>Phác đồ cá nhân hóa:</b> Không có một liệu trình chung cho tất cả. Chúng tôi sẽ thiết kế một phác đồ độc quyền để giải quyết đồng thời các vấn đề da phức tạp mà bạn đang gặp phải.</p></li></ul>\n<p>&nbsp;</p>\n<h3><b>Giới Thiệu Về Liệu Trình ALGAE PEELING REGIMEN</b></h3>\n<p><b>ALGAE PEELING REGIMEN</b> là liệu pháp vi tảo sinh học độc quyền, đến từ thương hiệu dược mỹ phẩm thế hệ mới <b>DECAAR (Đảo Síp – Châu Âu)</b>. Liệu trình dựa trên cơ chế hoạt động <b>\"Inside Out\"</b> (Từ trong ra ngoài), kết hợp vi tảo <b>Spongilla Spicules</b> và <b>Sinh Trị Liệu Bảo Cũ (Cenolytic)</b>.</p>\n<p>Công nghệ này tác động trực tiếp lên <b>Gen Da (Gen Cân bằng nội môi)</b>, kích hoạt quá trình tái tạo tế bào, chống lão hóa và phục hồi da mạnh mẽ từ tầng sâu, <b>phù hợp cho mọi loại gen, mọi bệnh lý</b> và tình trạng da \"khó trị\".</p>\n<p>&nbsp;</p>\n<h3><b>Tác Dụng Chính Của ALGAE PEELING REGIMEN</b></h3>\n<p>Liệu trình mang lại hiệu quả vượt trội trong việc điều trị và phục hồi đa vấn đề da:</p>\n<ul>\n<li>\n<p><b>Phục hồi &amp; Tái tạo làn da:</b> Tăng tốc quá trình chữa lành, phục hồi các tế bào tổn thương, giúp da khỏe mạnh từ bên trong.</p></li>\n<li>\n<p><b>Điều hòa miễn dịch &amp; Cân bằng sắc tố:</b> Kích thích tế bào Langerhans, giúp điều trị và cân bằng các đốm sắc tố, nám, tàn nhang dai dẳng.</p></li>\n<li>\n<p><b>Kháng viêm &amp; Điều trị mụn toàn diện:</b> Kháng khuẩn, kháng viêm mạnh mẽ, hỗ trợ điều trị mụn và ngăn ngừa sẹo rỗ sau mụn.</p></li>\n<li>\n<p><b>Thanh lọc &amp; Điều tiết hoạt động da:</b> Kích thích bạch huyết, đào thải độc tố, điều tiết hoạt động của bã nhờn và mức độ sừng hóa, giúp da thông thoáng.</p></li></ul>\n<p>&nbsp;</p>\n<h3><b>Chỉ Định Loại Da &amp; Nhu Cầu Da</b></h3>\n<p>Liệu pháp <b>ALGAE PEELING REGIMEN</b> là giải pháp lý tưởng cho các tình trạng da sau:</p>\n<ul>\n<li>\n<p><b>Mụn:</b> Mụn viêm/phức tạp, mụn nội tiết, mụn ẩn, mụn đầu trắng, mụn nhiễm khuẩn, mụn trứng cá.</p></li>\n<li>\n<p><b>Sắc tố:</b> Nám, sạm thâm mụn, tăng sắc tố, tàn nhang.</p></li>\n<li>\n<p><b>Tổn thương:</b> Da nhiễm độc, da mỏng, yếu, lộ mao mạch.</p></li>\n<li>\n<p><b>Lão hóa:</b> Da có nếp nhăn bề mặt/sâu, chảy xệ, kém đàn hồi.</p></li>\n<li>\n<p><b>Mất Cân Bằng:</b> Da dầu, sưng, bít tắc lỗ chân lông nhưng chưa hình thành mụn.</p></li></ul>\n<p>&nbsp;</p>\n<h3><b>Quy Trình Tư Vấn và Điều Trị Chuyên Nghiệp tại SKIN HEALTH BEAUTY</b></h3>\n<p>Tại <b>SKIN HEALTH BEAUTY</b>, phòng trị liệu của <b>PHARMA COSMETICS</b>, chúng tôi thực hiện quy trình điều trị chuẩn y khoa, được cá nhân hóa trong mô hình 1:1.</p>\n<p><b>1. Tư Vấn &amp; Phân Tích Chuyên Sâu:</b></p>\n<ul>\n<li>\n<p>Chuyên viên thăm khám, phân tích tình trạng da và xác định <b>Gen Cân bằng nội môi</b> của bạn.</p></li>\n<li>\n<p>Xây dựng phác đồ điều trị độc quyền, bao gồm số lần trị liệu (thường <b>3-5 lần</b>, mỗi lần cách nhau <b>1-2 tuần</b>) và sản phẩm chăm sóc tại nhà.</p></li></ul>\n<p><b>2. Quy Trình Trị Liệu 10 Bước Chuyên Sâu:</b></p>\n<table>\n<thead>\n<tr>\n\t<td>Giai Đoạn</td>\n\t<td>Bước</td>\n\t<td>Tên Sản Phẩm &amp; Công Dụng</td>\n</tr>\n</thead>\n<tbody>\n<tr>\n\t<td><b>Giai đoạn 1: Làm Sạch Kép</b></td>\n\t<td><b>Bước 1-2</b></td>\n\t<td><b>Cleansing Milk &amp; Gel:</b> Làm sạch sâu lớp trang điểm, bụi bẩn, cân bằng độ ẩm.</td>\n</tr>\n<tr>\n\t<td><b>Giai đoạn 2: Chuẩn Bị Da</b></td>\n\t<td><b>Bước 3-5</b></td>\n\t<td><b>Purifying Scrub &amp; Oxygen Scrub &amp; Pro Cleansing Gel:</b> Tẩy tế bào chết enzyme, oxy hóa và làm sạch sâu lỗ chân lông, cân bằng pH.</td>\n</tr>\n<tr>\n\t<td><b>Giai đoạn 3: Thực Hiện Peel</b></td>\n\t<td><b>Bước 6.1-6.3</b></td>\n\t<td><b>Algae Peeling Regimen &amp; pH Balancing Lotion:</b> Thoa dung dịch <b>vi tảo sinh học</b>, massage nhẹ nhàng để vi tảo thẩm thấu sâu, kích hoạt tái tạo tế bào, sau đó cân bằng lại pH da.</td>\n</tr>\n<tr>\n\t<td><b>Giai đoạn 4: Phục Hồi Tức Thì</b></td>\n\t<td><b>Bước 7-9</b></td>\n\t<td><b>Calming Mask, Calming Gel &amp; Serum Chuyên Dụng:</b> Đắp mặt nạ làm dịu, giảm cảm giác châm chích tức thì, sau đó thoa serum chuyên dụng (Anti-Acne/Anti-Aging) để phục hồi.</td>\n</tr>\n<tr>\n\t<td><b>Giai đoạn 5: Bảo Vệ &amp; Kết Thúc</b></td>\n\t<td><b>Bước 10</b></td>\n\t<td><b>Oxygen Cream SPF30/SPF50:</b> Thoa kem chống nắng sinh học giúp bảo vệ và cung cấp oxy cho da, hoàn tất liệu trình.</td>\n</tr>\n</tbody></table>\n<p>&nbsp;</p>\n<p>Hãy để <b>ALGAE PEELING REGIMEN</b> tại <b>PHARMA COSMETICS</b> giúp bạn tìm lại làn da khỏe mạnh, rạng rỡ và ổn định từ cấp độ gen.</p>\n<p><a _ngcontent-ng-c3871257529=\"\" _nghost-ng-c1065320308=\"\" externallink=\"\" href=\"https://www.google.com/search?q=https://www.pharma-cosmetics.vn/dat-lich\" jslog=\"197247;track:generic_click,impression,attention;BardVeMetadataKey:[[&quot;r_0e3b7c22e9622048&quot;,&quot;c_84779666c334f4de&quot;,null,&quot;rc_4687acd34706267f&quot;,null,null,&quot;vi&quot;,null,1,null,null,1,0]]\" rel=\"noopener\" target=\"_blank\">ĐẶT LỊCH TƯ VẤN NGAY</a></p>",
    variants: [variant(593498491, 'Default Title', 1200000, 0, 'LT-59349849', true, 99)],
    images: ["https://bizweb.dktcdn.net/100/415/053/products/die-u-tri-chuye-n-nghie-p-09-36-20.jpg?v=1758877359357","https://bizweb.dktcdn.net/100/415/053/products/kho-ng-co-tie-u-de-1-6a947f43-4816-449d-958a-6de539699ecc.jpg?v=1758877726203","https://bizweb.dktcdn.net/100/415/053/products/du.jpg?v=1758877729803","https://bizweb.dktcdn.net/100/415/053/products/487931047-3902266160021603-6230927656667762761-n.jpg?v=1758877723933","https://bizweb.dktcdn.net/100/415/053/products/484188804-609041915285573-1322352291372574528-n.jpg?v=1758877723933","https://bizweb.dktcdn.net/100/415/053/products/484091295-608322055357559-6642756301331756442-n.jpg?v=1758877723933","https://bizweb.dktcdn.net/100/415/053/products/505165095-671770245679406-8242771059722856685-n.jpg?v=1758877723933"] }),
  makeProduct({ id: 60047072, name: "DERMICA ACNEZON: Giải Pháp Meso Tiêu Viêm, Ngăn Sẹo Mụn Cấp Tốc", alias: "dermica-acnezon-giai-phap-tieu-viem-ngan-seo-mun-cap-toc", type: 'Liệu trình', vendor: 'Skin Health Beauty', votes: 0, template_suffix: 'lieu-trinh', options: ['Title'],
    collections: [{ name: 'Điều trị chuyên nghiệp', alias: 'dieu-tri-chuyen-nghiep', url: '/dieu-tri-chuyen-nghiep' }],
    tags: ['facebook:fb_video_427805549152968', "liệu trình"], summary: "<h3><b>MESO DERMICA ACNEZON: Tiêu Viêm, Ngăn Sẹo Mụn Cấp Tốc</b></h3>\n<p>Bạn đang lo lắng về <b>mụn viêm ổ to</b> và nguy cơ để lại <b>sẹo lõm</b>? <b>MESO DERMICA ACNEZON</b> là giải pháp mesotherapy chuẩn y khoa từ Thụy Sĩ. Sử dụng huyết thanh giàu <b>Zinc Gluconate</b> và <b>Acid Amin</b>, liệu trình giúp <b>giảm viêm nhanh chỉ sau 24h</b>, kiểm soát dầu thừa và thúc đẩy lành thương. Trải nghiệm ngay để <b>triệt tiêu mụn tận gốc</b>, ngăn ngừa thâm sẹo và phục hồi làn da mịn màng, khỏe mạnh.</p>", content: "<h3><b>DERMICA ACNEZON: Giải Pháp Meso Tiêu Viêm, Ngăn Sẹo Mụn Cấp Tốc</b></h3>\n<p>Bạn đang đối mặt với những nốt <b>mụn viêm ổ to</b> kéo dài, có nguy cơ phá hủy mô da và để lại <b>sẹo lõm</b> vĩnh viễn? Nếu mụn không được xử lý đúng cách, thâm sẹo sẽ trở nên nặng hơn. <b>MESO DERMICA ACNEZON</b> chính là phác đồ vàng, sử dụng huyết thanh trị mụn chuẩn y khoa từ Thụy Sĩ, giúp <b>tiêu viêm cấp tốc</b> và <b>ngăn ngừa sẹo</b> tối đa.</p>\n<p>&nbsp;</p>\n<h3><b>Giới Thiệu Về Liệu Trình MESO DERMICA ACNEZON</b></h3>\n<p><b>Dermica AcneZon</b> là huyết thanh điều trị vô trùng, được các chuyên gia da liễu tin dùng, ứng dụng linh hoạt trong các liệu trình mesotherapy, điện di hoặc lăn kim. Công thức tiên tiến được nghiên cứu lâm sàng tại Thụy Sĩ, tập trung giải quyết toàn diện các vấn đề của da mụn thông qua ba giai đoạn:</p>\n<ol start=\"1\">\n<li>\n<p><b>Điều trị mụn viêm hiện tại:</b> Tiêu viêm, giảm sưng, và hạn chế lây lan.</p></li>\n<li>\n<p><b>Triệt tiêu nhân mụn tiềm ẩn:</b> Diệt khuẩn, giảm dầu thừa, ngăn chặn hình thành mụn mới.</p></li>\n<li>\n<p><b>Phòng ngừa tái phát:</b> Phục hồi hàng rào da, xác định nguyên nhân và xây dựng routine chăm sóc tại nhà.</p></li></ol>\n<p><b>AcneZon</b> là sản phẩm an toàn, có thể dùng được ngay cả trên các vết thương hở do mụn, đảm bảo hiệu quả cho mọi cấp độ và cơ địa da.</p>\n<p>&nbsp;</p>\n<h3><b>Tác Dụng Chính Của MESO DERMICA ACNEZON</b></h3>\n<ul>\n<li>\n<p><b>Giảm Viêm Nhanh Chóng (Chỉ sau 24h):</b> Nhờ <b>Zinc Gluconate</b> và <b>Acid Amin (Leucine, Valine)</b> giúp ức chế vi khuẩn <i>C.Acnes</i>, giảm bã nhờn, và tiêu viêm cấp tốc.</p></li>\n<li>\n<p><b>Ngăn Ngừa Sẹo và Thâm:</b> <b>Retinyl Palmitate</b> và <b>Sodium Hyaluronate</b> thúc đẩy tái tạo tế bào, giảm nguy cơ hình thành sẹo lõm và ngăn ngừa tăng sắc tố (thâm mụn).</p></li>\n<li>\n<p><b>Kiểm Soát Dầu và Se Khít Lỗ Chân Lông:</b> <b>Salicylic Acid (BHA)</b> tan trong dầu giúp làm tan bã nhờn, thông thoáng lỗ chân lông, kết hợp với chiết xuất <b>cây Phỉ</b> giúp se khít.</p></li>\n<li>\n<p><b>Tăng Cường Lành Thương và Phục Hồi:</b> <b>Panthenol (Vitamin B5)</b>, <b>Bisabolol (từ hoa cúc La Mã)</b> và chiết xuất <b>Calendula</b> giúp làm dịu da, tăng khả năng phân bào, thúc đẩy lành thương.</p></li></ul>\n<p>&nbsp;</p>\n<h3><b>Chỉ Định Loại Da &amp; Nhu Cầu Da</b></h3>\n<p>Liệu trình <b>MESO DERMICA ACNEZON</b> lý tưởng cho:</p>\n<ul>\n<li>\n<p>Da bị mụn viêm nặng, mụn bọc, mụn nang, mụn đầu đen tích tụ.</p></li>\n<li>\n<p>Da có nguy cơ cao hình thành sẹo lõm do mụn kéo dài.</p></li>\n<li>\n<p>Da dầu nhờn, lỗ chân lông to, thường xuyên bị tắc nghẽn.</p></li>\n<li>\n<p>Da nhạy cảm, dễ kích ứng cần giải pháp điều trị chuyên sâu nhưng an toàn.</p></li>\n<li>\n<p>Khách hàng mong muốn rút ngắn thời gian điều trị mụn và ngăn ngừa thâm sẹo tối đa.</p></li></ul>\n<p>&nbsp;</p>\n<h3><b>Quy Trình Tư Vấn và Điều Trị Chuyên Nghiệp tại SKIN HEALTH BEAUTY</b></h3>\n<p>Tại <b>SKIN HEALTH BEAUTY</b>, phòng trị liệu của <b>PHARMA COSMETICS</b>, chúng tôi cam kết mang đến trải nghiệm điều trị <b>1:1</b> an toàn, hiệu quả và được cá nhân hóa.</p>\n<p><b>1. Thăm Khám &amp; Phân Tích Chuyên Sâu:</b></p>\n<ul>\n<li>\n<p>Chuyên viên sẽ thăm khám trực tiếp để xác định cấp độ mụn (viêm, không viêm, tiềm ẩn) và đánh giá tình trạng da.</p></li>\n<li>\n<p>Xây dựng <b>Phác đồ Cá Nhân Hóa</b> sử dụng Dermica AcneZon kết hợp với các công nghệ hỗ trợ (như ánh sáng xanh Elight/Laser) để tối ưu hóa hiệu quả tiêu diệt khuẩn và kiểm soát dầu.</p></li></ul>\n<p><b>2. Quy Trình Trị Liệu Meso AcneZon:</b></p>\n<ul>\n<li>\n<p><b>Bước 1: Làm sạch da:</b> Làm sạch sâu, loại bỏ tạp chất và tế bào chết.</p></li>\n<li>\n<p><b>Bước 2: Xử lý nhân mụn:</b> Lấy nhân mụn chuẩn y khoa, hạn chế tối đa tổn thương da.</p></li>\n<li>\n<p><b>Bước 3: Vô cảm (Tê):</b> Thoa tê để đảm bảo quá trình Mesotherapy diễn ra thoải mái.</p></li>\n<li>\n<p><b>Bước 4: Mesotherapy AcneZon:</b> Đưa huyết thanh <b>AcneZon</b> trực tiếp vào tầng da, nơi vi khuẩn và tuyến bã nhờn hoạt động, nhằm phát huy tối đa công dụng giảm viêm, kháng khuẩn.</p></li>\n<li>\n<p><b>Bước 5: Ánh sáng sinh học (Elight/Laser Xanh):</b> Chiếu ánh sáng chuyên biệt để diệt khuẩn <i>C.Acnes</i> còn sót lại và điều tiết dầu thừa.</p></li>\n<li>\n<p><b>Bước 6: Làm dịu và phục hồi:</b> Sử dụng các sản phẩm chứa <b>Panthenol</b> và <b>Bisabolol</b> để làm dịu da, giảm đỏ và thúc đẩy lành thương.</p></li>\n<li>\n<p><b>Bước 7: Chăm sóc tại nhà:</b> Hướng dẫn sử dụng <b>ACNEZON Cream</b> và routine skincare phù hợp để phòng ngừa tái phát và giảm thâm sẹo.</p></li></ul>\n<hr />\n<p>Đừng để mụn phá hủy cấu trúc da và sự tự tin của bạn. <b>MESO DERMICA ACNEZON</b> là chìa khóa để đạt được làn da sạch mụn, mịn màng và không tỳ vết.</p>\n\n<p><a _ngcontent-ng-c517841802=\"\" _nghost-ng-c1335158831=\"\" data-hveid=\"0\" data-ved=\"0CAAQ_4QMahgKEwjj37HV3oeQAxUAAAAAHQAAAAAQhwE\" decode-data-ved=\"1\" externallink=\"\" href=\"https://zalo.me/0965594399\" jslog=\"197247;track:generic_click,impression,attention;BardVeMetadataKey:[[&quot;r_fe5aff426b3a2cb1&quot;,&quot;c_744fba3bc13e0bfd&quot;,null,&quot;rc_b304d8b494947ce7&quot;,null,null,&quot;vi&quot;,null,1,null,null,1,0]]\" target=\"_blank\">ĐẶT LỊCH TƯ VẤN NGAY</a></p>",
    variants: [variant(600470721, 'Default Title', 1500000, 0, 'LT-60047072', true, 99)],
    images: ["https://bizweb.dktcdn.net/100/415/053/products/die-u-tri-chuye-n-nghie-p-00292c3e-2443-4461-af62-ddfd77c2a1d3.jpg?v=1759485745270","https://bizweb.dktcdn.net/100/415/053/products/1-b4daeaa9-754a-4b53-a06d-9362ed711e19.jpg?v=1759485756160","https://bizweb.dktcdn.net/100/415/053/products/2-00feb4db-017a-4014-9414-5cf3313bea10.jpg?v=1759485758980","https://bizweb.dktcdn.net/100/415/053/products/kho-ng-co-tie-u-de-1-695487ac-1273-4311-b4e1-a54efb0877fb.jpg?v=1759485761883","https://bizweb.dktcdn.net/100/415/053/products/4-2f714c22-a991-4e98-bbc8-9dacba92ee71.jpg?v=1759485764633","https://bizweb.dktcdn.net/100/415/053/products/5-cdbf1177-492d-4a2f-843b-118a6814a6f6.jpg?v=1759485767367"] }),
  makeProduct({ id: 59000102, name: "INFINI PREMIUM MESO F5: Giải Pháp Meso Trẻ Hóa Tế Bào Toàn Diện", alias: "infini-premium-meso-f5-giai-phap-meso-tre-hoa-te-bao-toan-dien", type: 'Liệu trình', vendor: 'Skin Health Beauty', votes: 0, template_suffix: 'lieu-trinh', options: ['Title'],
    collections: [{ name: 'Điều trị chuyên nghiệp', alias: 'dieu-tri-chuyen-nghiep', url: '/dieu-tri-chuyen-nghiep' }],
    tags: ['facebook:fb_video_427805549152968', 'youtube:lWOH7jyT97c', "liệu trình"], summary: "<p>Làn da lão hóa, chảy xệ và thiếu sức sống? <b>INFINI PREMIUM MESO F5</b> là câu trả lời. Đây là liệu pháp mesotherapy cao cấp, đưa các phức hợp độc quyền như Axit Hyaluronic, Axit Succinic và Collagen vào sâu trong da. Liệu trình giúp phục hồi tế bào, kích thích sản sinh collagen, làm đầy nếp nhăn và cung cấp độ ẩm tối ưu. Làn da của bạn sẽ được trẻ hóa từ cấp độ tế bào, lấy lại vẻ căng mịn, đàn hồi và tươi trẻ dài lâu.</p>", content: "<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Nếu bạn đang tìm kiếm một phương pháp vượt trội để đảo ngược các dấu hiệu lão hóa, <b>INFINI PREMIUM MESO F5</b> chính là lựa chọn lý tưởng. Đây là một liệu trình mesotherapy tiên tiến, sử dụng phức hợp hoạt chất độc đáo để tái tạo da từ cấp độ tế bào, mang lại làn da căng bóng, săn chắc và tươi trẻ.</span></span></p>\n<hr />\n<h1><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Giới Thiệu Về Liệu Trình INFINI PREMIUM MESO F5</b></span></span></h1>\n\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>INFINI PREMIUM MESO F5</b> là một phức hợp điều trị vô trùng được nghiên cứu và phát triển dựa trên những tiến bộ y học thẩm mỹ mới nhất. Sản phẩm là sự kết hợp hoàn hảo giữa các thành phần mạnh mẽ:</span></span></p>\n\n<ul>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Axit Hyaluronic CUBE3®:</b> Cấp ẩm sâu, làm đầy các nếp nhăn và giúp da căng mịn tức thì.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Axit Succinic:</b> Hoạt chất chống oxy hóa mạnh mẽ, bảo vệ DNA tế bào, cải thiện quá trình hô hấp tế bào và làm chậm quá trình lão hóa.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Collagen Thủy Phân, RNA &amp; DNA:</b> Kích thích sản sinh collagen và elastin tự nhiên, phục hồi cấu trúc da, cải thiện độ đàn hồi và mật độ da.</span></span></p></li></ul>\n\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Sự kết hợp hiệp đồng của các thành phần này không chỉ giúp phục hồi các tổn thương mà còn nuôi dưỡng làn da từ bên trong, mang lại hiệu quả trẻ hóa vượt trội và lâu dài.</span></span></p>\n\n<hr />\n<h2><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Tác Dụng Chính Của INFINI PREMIUM MESO F5</b></span></span></h2>\n\n<ul>\n<li>\n<h2><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Trẻ Hóa &amp; Tái Tạo Toàn Diện:</b> Phục hồi mạnh mẽ các mô da, kích thích sản sinh collagen và elastin, giúp da trở nên săn chắc và đàn hồi hơn.</span></span></h2></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Cải Thiện Nếp Nhăn &amp; Sẹo:</b> Làm đầy các nếp nhăn, rãnh cười và các vết sẹo lõm, sẹo mụn nhẹ.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Cấp Ẩm Chuyên Sâu:</b> Cung cấp độ ẩm tối ưu, giúp da luôn căng mọng, mịn màng và tràn đầy sức sống.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Chống Lão Hóa &amp; Bảo Vệ Da:</b> Bảo vệ DNA tế bào khỏi stress oxy hóa, làm chậm quá trình lão hóa da hiệu quả.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Làm Đều Màu Da:</b> Cải thiện tông màu da không đồng đều, mang lại làn da sáng và rạng rỡ.</span></span></p></li></ul>\n\n<hr />\n<h3><strong><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Chỉ Định Loại Da &amp; Nhu Cầu Da&nbsp;</span></span><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Liệu trình INFINI PREMIUM MESO F5 đặc biệt phù hợp với:</span></span></strong></h3>\n\n<ul>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Da lão hóa, chảy xệ, thiếu săn chắc.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Da khô, mất nước, xỉn màu.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Da xuất hiện nếp nhăn, rãnh nhăn sâu.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Da có sẹo lõm, sẹo mụn.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Người muốn cải thiện mật độ và độ đàn hồi của da.</span></span></p></li></ul>\n\n<hr />\n<h4><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Quy Trình Tư Vấn và Điều Trị Chuyên Nghiệp tại SKIN HEALTH BEAUTY</b></span></span></h4>\n\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Tại <b>SKIN HEALTH BEAUTY</b>, phòng trị liệu của <b>PHARMA COSMETICS</b>, chúng tôi cam kết mang đến trải nghiệm điều trị an toàn, hiệu quả và được cá nhân hóa cho từng khách hàng.</span></span></p>\n\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>1. Tư Vấn Chuyên Sâu &amp; Phân Tích Da:</b></span></span></p>\n\n<ul>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Chuyên gia&nbsp;của chúng tôi sẽ lắng nghe các vấn đề của bạn, thăm khám và phân tích tình trạng da một cách kỹ lưỡng.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Dựa trên kết quả phân tích, chúng tôi sẽ xây dựng phác đồ điều trị phù hợp nhất, kết hợp liệu trình Meso F5 với các sản phẩm chăm sóc tại nhà để tối ưu hóa kết quả.</span></span></p></li></ul>\n\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>2. Quy Trình Điều Trị Chuẩn Y Khoa:</b></span></span></p>\n\n<ul>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Bước 1: Làm sạch da:</b> Da sẽ được làm sạch sâu để loại bỏ bụi bẩn, dầu thừa, giúp các dưỡng chất thẩm thấu tốt nhất.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Bước 2: Vô cảm bề mặt (nếu cần):</b> Tùy thuộc vào ngưỡng chịu đau của khách hàng, Điều Dưỡng&nbsp;sẽ thoa tê nhẹ để mang lại cảm giác thoải mái nhất.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Bước 3: Thực hiện Mesotherapy:</b> Sử dụng kim chuyên dụng để đưa phức hợp Meso F5 vào sâu trong lớp trung bì của da. Liệu pháp này kích thích cơ chế tự phục hồi của da, đồng thời cung cấp trực tiếp các dưỡng chất quý giá.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Bước 4: Điện di và làm dịu da:</b> Sau khi tiêm, da được điện di lạnh với các sản phẩm chuyên biệt để làm dịu, giảm sưng đỏ và khóa ẩm.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Bước 5: Hướng dẫn chăm sóc tại nhà:</b> Điều Dưỡng&nbsp;sẽ hướng dẫn chi tiết về cách chăm sóc da sau liệu trình, bao gồm việc sử dụng kem dưỡng phục hồi và chống nắng để duy trì hiệu quả lâu dài.</span></span></p></li></ul>\n\n<hr />\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Hãy để <b>INFINI PREMIUM MESO F5</b> tại <b>SKIN HEALTH BEAUTY</b> giúp bạn tìm lại làn da tươi trẻ, rạng ngời từ cấp độ tế bào.</span></span></p>\n\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><a _ngcontent-ng-c516517738=\"\" _nghost-ng-c820698568=\"\" externallink=\"\" href=\"https://zalo.me/0965594399\" jslog=\"197247;track:generic_click,impression,attention;BardVeMetadataKey:[[&quot;r_dafad8a35d208587&quot;,&quot;c_36f60938dcfd3a72&quot;,null,&quot;rc_a22d9f0ac89a3cc2&quot;,null,null,&quot;vi&quot;,null,1,null,null,1,0]]\" target=\"_blank\">ĐẶT LỊCH TƯ VẤN NGAY</a></span></span></p>",
    variants: [variant(590001021, 'Default Title', 4000000, 0, 'LT-59000102', true, 99)],
    images: ["https://bizweb.dktcdn.net/100/415/053/products/die-u-tri-chuye-n-nghie-p-89634ddc-9ee5-4702-8944-b6e8fccaa03c.jpg?v=1759639388943","https://bizweb.dktcdn.net/100/415/053/products/1-3b182e24-5a61-4a22-8426-05b69144662e.jpg?v=1759639445730","https://bizweb.dktcdn.net/100/415/053/products/hieu-qua-khi-dung-infini-premium-meso-f5.jpg?v=1759639443667","https://bizweb.dktcdn.net/100/415/053/products/cocktail-giam-nhan-tai-tao-va-tre-hoa-lan-da-sang-min-infini-premium-meso-f5.png?v=1759639443667","https://bizweb.dktcdn.net/100/415/053/products/495534480-1284962750295862-3946518630346490957-n.jpg?v=1759639443667"] }),
  makeProduct({ id: 59142604, name: "LIỆU PHÁP ENZYME THERAPY: Phục Hồi Làn Da \"Không Dung Nạp Điều Trị", alias: "lieu-phap-enzyme-therapy-phuc-hoi-lan-da-khong-dung-nap-dieu-tri", type: 'Liệu trình', vendor: 'Skin Health Beauty', votes: 0, template_suffix: 'lieu-trinh', options: ['Title'],
    collections: [{ name: 'Điều trị chuyên nghiệp', alias: 'dieu-tri-chuyen-nghiep', url: '/dieu-tri-chuyen-nghiep' }],
    tags: ["liệu trình"], summary: "<p><span style=\"font-size:20px;\">Nếu làn da của bạn đã \"kháng trị\" với mọi phương pháp, hãy thử liệu pháp <b>Enzyme Therapy</b> độc quyền từ DMK. Đây không phải là một liệu trình thông thường, mà là một giải pháp sinh học giúp phục hồi chức năng tự nhiên của da. Bằng cách kích thích tuần hoàn máu, thải độc và tăng sinh collagen từ sâu bên trong, liệu pháp này giúp da tự tái tạo, khỏe mạnh và trở nên rạng rỡ. Trải nghiệm ngay để làn da được \"hồi sinh\" và lấy lại sức sống.</span></p>", content: "<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Bạn đã thử qua vô số phương pháp nhưng làn da vẫn \"bất trị\"? Bạn đang đối mặt với nhiều vấn đề cùng lúc: mụn dai dẳng, lão hóa sớm, sắc tố sạm màu, da khô nhạy cảm? Nếu làn da của bạn đã không còn \"dung nạp\" bất kỳ sản phẩm hay liệu trình nào, hãy tìm đến giải pháp đột phá: <b>LIỆU PHÁP ENZYME THERAPY</b> từ DMK (Danne Montague-King).</span></span></p>\n<hr />\n<h1><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>DMK ENZYME THERAPY: Khoa Học Chăm Sóc Da Độc Quyền</b></span></span></h1>\n\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Không giống các liệu trình thông thường chỉ tác động trên bề mặt, <b>Enzyme Therapy</b> là một liệu pháp sinh học toàn diện. DMK không chỉ xử lý triệu chứng, mà còn giải quyết tận gốc các vấn đề da bằng cách phục hồi chức năng tự nhiên của tế bào.</span></span></p>\n\n<ul>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Cải Thiện Tuần Hoàn Máu và Bạch Huyết:</b> Liệu pháp kích thích hệ thống tuần hoàn, bơm máu giàu oxy và dưỡng chất đến từng tế bào da, đồng thời loại bỏ độc tố tích tụ. Quá trình này giúp da tự \"thanh lọc\" và khỏe mạnh từ bên trong.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Kích Hoạt Tế Bào Sống:</b> Tăng cường sản sinh collagen và elastin, giúp da săn chắc, đàn hồi, giảm nếp nhăn và cải thiện cấu trúc da.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Làm Sạch Sâu Từng Lỗ Chân Lông:</b> Phân hủy tế bào chết và bã nhờn, giải phóng lỗ chân lông bị tắc nghẽn, giúp da \"thở\" và hấp thụ dưỡng chất tốt hơn.</span></span></p></li></ul>\n\n<hr />\n<h2><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Hiệu Ứng Plasmatic Effect: Dấu Hiệu Của Một Làn Da Tái Sinh</b></span></span></h2>\n\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Sau mỗi liệu trình, bạn sẽ trải nghiệm một dấu hiệu độc đáo: <b>Hiệu ứng Plasmatic</b> – những đường vân đỏ li ti nổi lên trên da. Đây không phải là kích ứng, mà là bằng chứng khoa học cho thấy máu đã được tuần hoàn mạnh mẽ, oxy và dưỡng chất đang được cung cấp dồi dào, đánh thức mọi tế bào da đang \"ngủ quên\".</span></span></p>\n\n<hr />\n<h3><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Dịch Vụ Điều Trị Enzyme Therapy Chuyên Sâu 1:1 Tại Phòng SKIN HEALTH BEAUTY</b></span></span></h3>\n\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Tại <b>PHARMA COSMETICS</b>, chúng tôi hiểu rằng mỗi làn da là một câu chuyện riêng. Đó là lý do tại sao mọi liệu trình <b>Enzyme Therapy</b> đều được thực hiện tại phòng chăm sóc da riêng biệt <b>SKIN HEALTH BEAUTY</b> với mô hình điều trị 1:1.</span></span></p>\n\n<ul>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Tập Trung Hoàn Toàn Cho Bạn:</b> Chuyên viên của chúng tôi sẽ dành toàn bộ thời gian và sự tập trung để thăm khám, phân tích và thực hiện liệu trình chuyên biệt, phù hợp 100% với tình trạng da của bạn.</span></span></p></li>\n<li>\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><b>Phác Đồ Cá Nhân Hóa:</b> Chúng tôi sẽ thiết kế một phác đồ độc quyền để giải quyết đồng thời các vấn đề da phức tạp mà bạn đang gặp phải.</span></span></p></li></ul>\n\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\">Nếu bạn đã mất niềm tin vào các phương pháp điều trị truyền thống, nếu làn da của bạn cần một giải pháp đột phá để tái sinh, <b>LIỆU PHÁP ENZYME THERAPY</b> chính là câu trả lời. Hãy để <b>PHARMA COSMETICS</b> đồng hành cùng bạn trên hành trình tìm lại làn da khỏe mạnh và rạng rỡ từ sâu bên trong.</span></span></p>\n\n<hr />\n<p><span style=\"font-size:20px;\"><span style=\"font-family:Arial,Helvetica,sans-serif;\"><a _ngcontent-ng-c2797846721=\"\" _nghost-ng-c2462084179=\"\" externallink=\"\" href=\"https://zalo.me/0965594399\" jslog=\"197247;track:generic_click,impression,attention;BardVeMetadataKey:[[&quot;r_f334918094dc436c&quot;,&quot;c_36f60938dcfd3a72&quot;,null,&quot;rc_77f161e1a13b057f&quot;,null,null,&quot;vi&quot;,null,1,null,null,1,0]]\" target=\"_blank\">ĐẶT LỊCH TƯ VẤN NGAY</a></span></span></p>",
    variants: [variant(591426041, 'Default Title', 2000000, 0, 'LT-59142604', true, 99)],
    images: ["https://bizweb.dktcdn.net/100/415/053/products/die-u-tri-chuye-n-nghie-p-919e8edb-83c1-450a-98bc-cbd350167d0a.jpg?v=1758791568247","https://bizweb.dktcdn.net/100/415/053/products/thie-t-ke-chu-a-co-te-n-3.jpg?v=1758791565593","https://bizweb.dktcdn.net/100/415/053/products/thie-t-ke-chu-a-co-te-n-4-423a4691-2318-4e1f-9149-1b31dea19e3e.jpg?v=1758791565593","https://bizweb.dktcdn.net/100/415/053/products/thie-t-ke-chu-a-co-te-n-5-3ed62a7d-8e92-4d3d-8498-b46d4d61b985.jpg?v=1758791565593"] }),
  makeProduct({ id: 59000476, name: "TRỊ LIỆU VOLAYON VERDOSO: Giải Pháp \"Giải Nhiệt\" và Tái Tạo Toàn Diện Cho Làn Da Nhạy Cảm", alias: "tri-lieu-volayon-verdoso-giai-phap-giai-nhiet-va-tai-tao-toan-dien-cho-lan-da-nhay-cam", type: 'Liệu trình', vendor: 'Skin Health Beauty', votes: 0, template_suffix: 'lieu-trinh', options: ['Title'],
    collections: [{ name: 'Điều trị chuyên nghiệp', alias: 'dieu-tri-chuyen-nghiep', url: '/dieu-tri-chuyen-nghiep' }],
    tags: ["liệu trình"], summary: "<p>Bạn đang đối mặt với làn da nhạy cảm, mẩn đỏ, và dễ nổi mụn? Nguyên nhân có thể là do \"nhiệt của da\". <b>Liệu trình Volayon Verdoso</b> tại <b>PHARMA COSMETICS</b> là giải pháp đột phá, sử dụng <b>Tảo Spirulina</b> cao cấp để làm dịu, \"giải nhiệt\" và phục hồi hàng rào bảo vệ da. Trải nghiệm ngay liệu trình 1:1, giúp làn da khỏe mạnh, giảm kích ứng, và lấy lại vẻ tươi trẻ, rạng rỡ từ bên trong.</p>", content: "<h1><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>TRỊ LIỆU VOLAYON VERDOSO: Giải Pháp \"Giải Nhiệt\" và Tái Tạo Toàn Diện Cho Làn Da Nhạy Cảm</b></span></span></h1>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b><img data-thumb=\"original\" original-height=\"768\" original-width=\"1366\" src=\"//bizweb.dktcdn.net/100/415/053/files/thie-t-ke-chu-a-co-te-n-1-877497f7-2ad6-4e4d-a8da-44bd4b56af7a.jpg?v=1758533556193\" /></b></span></span></p>\n<h1><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\">Tại <b>PHARMA COSMETICS</b>, chúng tôi hiểu rằng một làn da khỏe mạnh bắt nguồn từ sự cân bằng. Liệu trình <b>Volayon Verdoso</b>, được thực hiện tại phòng chăm sóc da riêng biệt <b>SKIN HEALTH BEAUTY</b>, chính là giải pháp độc quyền giúp \"hạ nhiệt\" và phục hồi làn da đang gặp vấn đề do nhiệt độ cao. Đây không chỉ là một liệu pháp, mà còn là một trải nghiệm chăm sóc da 1:1, được thiết kế riêng cho bạn.</span></span></h1>\n<hr />\n<h2><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Giới Thiệu Về Liệu Trình Volayon Verdoso</b></span></span></h2>\n\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\">Làn da nhạy cảm, khô ráp, nổi mụn hay lão hóa sớm có thể bắt nguồn từ một \"kẻ thù\" thầm lặng: <b>nhiệt của da</b>. Dưới tác động của môi trường, bụi mịn, căng thẳng, nhiệt độ da tăng cao làm suy yếu hàng rào bảo vệ, dẫn đến viêm, tăng tiết bã nhờn và suy giảm collagen.</span></span></p>\n\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Volayon Verdoso</b> là liệu pháp đột phá đến từ Hàn Quốc, sử dụng sức mạnh của <b>Tảo Spirulina</b> cao cấp – một \"siêu nguyên liệu\" giàu dưỡng chất. Với công nghệ độc quyền, các hạt tảo siêu mịn dễ dàng thẩm thấu sâu, giúp giải tỏa nhiệt, làm dịu và phục hồi da từ cấp độ tế bào.</span></span></p>\n\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><img data-thumb=\"original\" original-height=\"720\" original-width=\"1280\" src=\"//bizweb.dktcdn.net/100/415/053/files/vjbdjv.webp?v=1758533602766\" /></span></span></p>\n\n<hr />\n<h2><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Tác Dụng Chính Của Liệu Trình Volayon Verdoso</b></span></span></h2>\n\n<ul>\n<li>\n<h2><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Hạ Nhiệt &amp; Làm Dịu Da:</b> Giúp làm mát và giảm nhiệt độ biểu bì, giảm tình trạng viêm, sưng đỏ và kích ứng.</span></span></h2></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Phục Hồi Hàng Rào Bảo Vệ:</b> Cải thiện chức năng hàng rào bảo vệ da, giúp da trở nên khỏe mạnh và tăng sức đề kháng trước các tác nhân gây hại.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Thải Độc &amp; Chống Lão Hóa:</b> Tảo Spirulina giàu chất chống oxy hóa giúp loại bỏ gốc tự do, bảo vệ DNA tế bào, làm chậm quá trình lão hóa và ngăn ngừa nếp nhăn.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Dưỡng Ẩm Chuyên Sâu:</b> Các thành phần như <b>Polyglutamic acid</b> và <b>Sodium hyaluronate</b> cung cấp độ ẩm vượt trội, giúp da căng mọng, đàn hồi.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Hỗ Trợ Điều Trị Mụn:</b> Khả năng kháng khuẩn, chống viêm của tảo và trà xanh giúp giảm mụn, làm dịu tổn thương và thúc đẩy quá trình chữa lành.</span></span></p></li></ul>\n\n<hr />\n<h3><img data-thumb=\"original\" original-height=\"720\" original-width=\"1280\" src=\"//bizweb.dktcdn.net/100/415/053/files/vjbdjvgggg.webp?v=1758533580092\" /></h3>\n\n<h3><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Quy Trình Tư Vấn và Điều Trị Chuyên Nghiệp tại SKIN HEALTH BEAUTY</b></span></span></h3>\n\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\">Tại <b>SKIN HEALTH BEAUTY</b>, mọi liệu trình <b>Volayon Verdoso</b> được thực hiện theo mô hình 1:1, đảm bảo sự tập trung và hiệu quả tối đa cho làn da của bạn.</span></span></p>\n\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>1. Thăm Khám &amp; Phân Tích Chuyên Sâu:</b></span></span></p>\n\n<ul>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\">Chuyên viên sẽ dành thời gian lắng nghe, thăm khám trực tiếp để xác định \"nhiệt của da\" và các vấn đề liên quan.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\">Dựa trên kết quả, chúng tôi sẽ xây dựng phác đồ điều trị cá nhân hóa, kết hợp liệu trình Volayon Verdoso với các sản phẩm chăm sóc phù hợp.</span></span></p></li></ul>\n\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>2. Quy Trình Trị Liệu 13 Bước Chuẩn Y Khoa:</b></span></span></p>\n\n<ul>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 1: MAKE UP REMOVE (Tẩy trang):</b> Loại bỏ lớp trang điểm và bụi bẩn.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 2: PURPLEINKLIN (Tẩy da chết):</b> Sử dụng dung dịch làm sạch đa chức năng, giúp da thông thoáng và sẵn sàng hấp thu dưỡng chất.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 3: STEAMING UP (Xông hơi nóng):</b> Giúp làm sạch sâu lỗ chân lông.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 4: DEEP CLEANSING (Hút mụn):</b> Loại bỏ bã nhờn, mụn đầu đen để giúp da trở nên sạch sâu.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 5: ACNE EXTRUSION (Lấy mụn):</b>&nbsp;(nếu có).</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 6: LOTIONIQUE (Cân bằng độ pH):</b> Dùng dung dịch cân bằng da, chuẩn bị cho các bước tiếp theo.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 7: SPINTURA (Kích hoạt tế bào):</b>&nbsp;Kích hoạt miễn dịch và tăng sức đề kháng cho da.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 8: EXOLLONIC (Hạ nhiệt độ da):</b> Thoa tinh chất Exollonic giúp hạ nhiệt, làm dịu và cải thiện da mẫn đỏ.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 9: LIGHT THERAPY (Chiếu ánh sáng sinh học):</b> Chiếu ánh sáng xanh (Blue Light) từ công nghệ <b>CELLUMA PRO</b> để diệt khuẩn, giảm viêm, và thúc đẩy quá trình phục hồi tế bào, chuyên biệt cho từng loại da.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 10: INNOV GEL (Mặt nạ lạnh):</b> Dùng Innov Gel giúp làm dịu da và khóa ẩm sau khi chiếu đèn.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 11:&nbsp;</b></span></span><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>SPINCAL (Tái tạo tế bào):</b> Đắp lên toàn bộ khuôn mặt sau khi chiếu đèn, giúp phục hồi tế bào da, mang lại cảm giác mát lạnh và làm dịu da.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 12: SPINMEM POWDER (Mặt nạ tảo):</b> Đắp hỗn hợp Volayon và nước theo tỉ lệ 1:1, giúp hạ nhiệt da, giảm mẫn cảm, làm dịu tức thì.</span></span></p></li>\n<li>\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><b>Bước 13: FINISH (Dưỡng da):</b> Thoa sản phẩm dưỡng da cuối cùng để phục hồi và tái tạo, giúp da căng bóng và khoẻ mạnh.</span></span></p></li></ul>\n\n<hr />\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\">Hãy để <b>Volayon Verdoso</b> giúp làn da của bạn tìm lại sự cân bằng và khỏe mạnh từ bên trong.</span></span></p>\n\n<p><span style=\"font-family:Arial,Helvetica,sans-serif;\"><span style=\"font-size:20px;\"><a _ngcontent-ng-c516517738=\"\" _nghost-ng-c820698568=\"\" externallink=\"\" href=\"https://zalo.me/0965594399\" jslog=\"197247;track:generic_click,impression,attention;BardVeMetadataKey:[[&quot;r_4f2266f4400da38b&quot;,&quot;c_36f60938dcfd3a72&quot;,null,&quot;rc_8caf688353d69055&quot;,null,null,&quot;vi&quot;,null,1,null,null,1,0]]\" target=\"_blank\">ĐẶT LỊCH TƯ VẤN NGAY</a></span></span></p>",
    variants: [variant(590004761, 'Default Title', 1200000, 0, 'LT-59000476', true, 99)],
    images: ["https://bizweb.dktcdn.net/100/415/053/products/die-u-tri-chuye-n-nghie-p.jpg?v=1758790026057","https://bizweb.dktcdn.net/100/415/053/products/images-jpeg-d568abc9-822d-4a2c-acf6-860bd9c9bcf9.jpg?v=1758790016490"] }),
  // 2026-10-19: fixture mô tả THẬT từ store (BABE Stop AKN, id 27000525) — mục chia bằng đoạn chữ đậm, không <h2>;
  // xuất xứ nằm ở Mô tả ngắn, không có tag xuatxu: ⇒ kiểm tab 6 mục chuẩn + đọc xuất xứ (tests/portal/pdp-flow.spec.js).
  makeProduct({ id: 27000525, name: "BABE STOP AKN PURIFYING CLEANSING GEL: Sữa Rửa Mặt Sạch Sâu, Kiểm Soát Dầu & Hỗ Trợ Da Mụn", alias: "babe-stop-akn-purifying-cleansing-gel-sua-rua-mat-sach-sau-kiem-soat-dau-ho-tro-da-mun", type: 'SỮA RỬA MẶT', vendor: 'BABE', votes: 0,
    tags: ["Pharma Cosmetics", "sản phẩm Tây Ban Nha", "dịu nhẹ", "làm sạch sâu", "thu nhỏ lỗ chân lông", "kiểm soát dầu thừa", "da dầu", "trị mụn", "sữa rửa mặt", "BABE Stop AKN Purifying Cleansing Gel"], summary: "<p><strong>THƯƠNG HIỆU</strong>: <font color=\"#2ecc71\">BABE LABORATORIOS</font></p>\n<p><strong>XUẤT XỨ</strong>:<font color=\"#2ecc71\">&nbsp;TÂY BAN NHA&nbsp;</font></p>",
    content: "<h2>BABE STOP AKN PURIFYING CLEANSING GEL: Sữa Rửa Mặt Sạch Sâu, Kiểm Soát Dầu &amp; Hỗ Trợ Da Mụn</h2>\n<p><b>BABE STOP AKN PURIFYING CLEANSING GEL</b> là sữa rửa mặt dạng gel làm sạch chuyên sâu, được thiết kế đặc biệt cho da dầu và da mụn. Sản phẩm tạo bọt dịu nhẹ khi tiếp xúc với nước, giúp làm sạch triệt để, loại bỏ bụi bẩn và dầu thừa, mang lại làn da tươi mới và sạch thoáng. Với công thức độc đáo chứa các thành phần điều tiết bã nhờn, sữa rửa mặt này giúp kiểm soát lượng dầu trên mặt, ngăn ngừa bít tắc lỗ chân lông và hỗ trợ giảm mụn. Đặc biệt, sản phẩm có chứa <b>Pre- và Postbiotics</b> giúp chăm sóc hệ vi sinh vật trên da, củng cố hàng rào bảo vệ tự nhiên của da.</p>\n<p>&nbsp;</p>\n<p><strong>ƯU ĐIỂM NỔI BẬT:</strong></p>\n<p><b>Làm Sạch Sâu &amp; Kiểm Soát Dầu:</b> Loại bỏ hiệu quả bụi bẩn, dầu thừa và tạp chất, đồng thời điều tiết bã nhờn, giúp da không còn bóng dầu.</p>\n<p><b>Ngăn Ngừa &amp; Giảm Mụn:</b> Sự kết hợp của <b>Salicylic Acid (BHA)</b> và <b>Succinic Acid</b> giúp tẩy tế bào chết nhẹ nhàng, làm thông thoáng lỗ chân lông, ngăn ngừa mụn và hỗ trợ cải thiện các khuyết điểm trên da.</p>\n<p><b>Cân Bằng Hệ Vi Sinh Vật Da:</b> Với 3% Pre- và Postbiotics, sản phẩm giúp duy trì hệ vi sinh vật khỏe mạnh trên da, củng cố hàng rào bảo vệ da và làm dịu da.</p>\n<p><b>Dịu Nhẹ &amp; Không Gây Kích Ứng:</b> Công thức Syndet (không chứa xà phòng) không gây kích ứng, an toàn cho da nhạy cảm.</p>\n<p><b>Làm Mịn &amp; Làm Mát:</b> Mang lại cảm giác tươi mát và làm dịu da ngay lập tức, giúp da trở nên mềm mại và mịn màng hơn.</p>\n<p><b>Công thức không gây mụn (Non-comedogenic).</b></p>\n<p>&nbsp;</p>\n<p><strong>THÀNH PHẦN VÀ CÔNG DỤNG CỦA SỮA RỬA MẶT&nbsp;BABE STOP AKN PURIFYING CLEANSING GEL</strong></p>\n<p><strong>THÀNH PHẦN CHÍNH:</strong></p>\n<p><b>Salicylic Acid 0.5% (BHA):</b> Có tác dụng keratolytic (tẩy tế bào chết) và thúc đẩy đổi mới tế bào, giúp làm sạch sâu lỗ chân lông.</p>\n<p><b>Succinic Acid 1%:</b> Hỗ trợ tẩy tế bào chết và kháng khuẩn.</p>\n<p><b>Pre - Postbiotic 3%:</b> Hỗ trợ chăm sóc hệ vi sinh vật của da, củng cố hàng rào bảo vệ da.</p>\n<p><b>Zinc PCA 0.02% và Azeloglycine 0.01%:</b> Có tác dụng kháng khuẩn và điều tiết bã nhờn.</p>\n<p><b>Hyaluronic Acid 0.05%:</b> Cung cấp độ ẩm, giữ nước cho da.</p>\n<p><b>Panthenol 1% (Vitamin B5):</b> Giúp làm dịu và phục hồi da.</p>\n<p><strong>THÀNH PHẦN CHI TIẾT:</strong>&nbsp;AQUA, SODIUM COCOAMPHOACETATE, LACTOBACILLUS FERMENT, SODIUM LAURETH SULFATE, PEG-200 HYDROGENATED GLYCERYL PALMATE, PEG-120 METHYL GLUCOSE DIOLEATE, SUCCINIC ACID, SALICYLIC ACID, SODIUM HYALURONATE, PANTHENOL, ZINC PCA, POTASSIUM AZELOYL DIGLYCINATE, TETRASODIUM GLUTAMATE DIACETATE, PANTOLACTONE, POLYSORBATE 20, PEG-7 GLYCERYL COCOATE, SODIUM CHLORIDE, ETHYLHEXYLGLYCERIN, PENTYLENE GLYCOL, 1,2-HEXANEDIOL, CAPRYLYL GLYCOL, LACTIC ACID, SODIUM BENZOATE, PHENOXYETHANOL, TOCOPHEROL, SODIUM HYDROXIDE, PARFUM.</p>\n<p><strong>CÔNG DỤNG:</strong></p>\n<p>Làm sạch và làm mát da.</p>\n<p>Loại bỏ bụi bẩn và dầu thừa.</p>\n<p>Ngăn ngừa bít tắc lỗ chân lông, giảm mụn.</p>\n<p>Làm mịn và làm lì bề mặt da.</p>\n<p>Củng cố hàng rào bảo vệ da.</p>\n<p>Cân bằng và làm dịu da.</p>\n<p>&nbsp;</p>\n<p><strong>ĐỐI TƯỢNG SỬ DỤNG&nbsp;CỦA SỮA RỬA MẶT&nbsp;BABE STOP AKN PURIFYING CLEANSING GEL</strong></p>\n<p>Da dầu hoặc da dễ nổi mụn.</p>\n<p>Lý tưởng cho da hỗn hợp thiên dầu, da dầu và da có mụn.</p>\n<p>Phù hợp cho mọi loại da, kể cả da nhạy cảm hoặc da đang được điều trị.</p>\n<p>&nbsp;</p>\n<p><strong>CÁCH SỬ DỤNG&nbsp;CỦA SỮA RỬA MẶT&nbsp;BABE STOP AKN PURIFYING CLEANSING GEL</strong></p>\n<p>Làm ướt mặt.</p>\n<p>Lấy một lượng gel vừa đủ ra tay và tạo bọt.</p>\n<p>Massage nhẹ nhàng lên mặt theo chuyển động tròn.</p>\n<p>Rửa sạch lại với nhiều nước.</p>\n<p>Sử dụng hàng ngày vào buổi sáng và buổi tối để có hiệu quả tốt nhất.</p>\n<h3>&nbsp;</h3>",
    variants: [variant(270005251, 'Default Title', 274000, 0, 'BABE-AKN-GEL', true, 20)],
    images: ["https://bizweb.dktcdn.net/100/415/053/products/147b41054668444ba1200b9405b9c9f7-jpeg.jpg?v=1772270474973", "https://bizweb.dktcdn.net/100/415/053/products/z4674981318166-1a51a6dd4069f92fa77ee3e0e13fa4f6.jpg?v=1772270474973"] }),
];

// ── Tra nhanh theo id hoặc alias ────────────────────────────────────────────

const byId    = Object.fromEntries(products.map(p => [p.id, p]));
const byAlias = Object.fromEntries(products.map(p => [p.alias, p]));

module.exports = { products, byId, byAlias };
