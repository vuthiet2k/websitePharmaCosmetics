/**
 * data/collections.js — Collections (giả lập Sapo `collections` object)
 *
 * 50 collections thật từ store pharmacosmetics-vn.mysapo.net
 * Các collection dùng trong sections active → được gán demo products.
 * Còn lại → products: [] (chỉ giữ metadata để Liquid render tên/count đúng).
 */

const { products } = require('./products');

// ── Helpers ────────────────────────────────────────────────────────────────

function pick(...ids) {
  return products.filter(p => ids.includes(p.id));
}

/** Collection có products thật (dùng cho sections active) */
function makeCollection(name, alias, id, description, selectedProducts, opts = {}) {
  const allVendors = [...new Set(selectedProducts.map(p => p.vendor).filter(Boolean))];
  const allTypes   = [...new Set(selectedProducts.map(p => p.type).filter(Boolean))];
  return {
    id,
    name,
    alias,
    url:             `/${alias}`,
    description:     description || '',
    products_count:  opts.products_count ?? selectedProducts.length,
    products:        selectedProducts,
    image:           opts.image || null,
    all_vendors:     allVendors,
    all_types:       allTypes,
    current_vendor:  null,
    current_type:    null,
    default_sort_by: opts.sort || 'manual',
    template_layout: 'collection',
    tags:            [...new Set(selectedProducts.flatMap(p => p.tags || []))],
  };
}

/** Collection shell — chỉ metadata, products rỗng (chưa cần render products) */
function makeShell(id, name, alias, products_count, opts = {}) {
  return {
    id,
    name,
    alias,
    url:             `/${alias}`,
    description:     opts.description || '',
    products_count,
    products:        [],
    image:           opts.image || null,
    all_vendors:     [],
    all_types:       [],
    current_vendor:  null,
    current_type:    null,
    default_sort_by: opts.sort || 'created-desc',
    template_layout: 'collection',
    tags:            [],
  };
}

// ── Collections thật từ store (50 items) ─────────────────────────────────

const collectionsData = {

  // ── Meta: tất cả demo products ────────────────────────────────────────
  'all': makeCollection(
    'Tất cả sản phẩm', 'all', 0, '',
    products,
    { products_count: products.length, sort: 'created-desc' }
  ),

  // ── Sections active — có demo products ────────────────────────────────

  'san-pham-ban-chay-noi-bat': makeCollection(
    'SẢN PHẨM BÁN CHẠY NỔI BẬT', 'san-pham-ban-chay-noi-bat', 4273403, '',
    pick(1001, 1002, 1006, 1007, 1010, 1012, 1014, 1015, 1003, 1004, 1005, 1013),
    { products_count: 12 }
  ),

  'flash-sale-1': makeCollection(
    'FLASH SALE', 'flash-sale-1', 4257106, '',
    pick(1001, 1003, 1006, 1007, 1010, 1012, 1013, 1015, 1004),
    { products_count: 9 }
  ),

  // 2026-10-07: danh mục kê toa demo — settings.product_rx_collection trỏ vào đây (snippets/pc_is_rx.bwt).
  'thuoc-ke-don': makeCollection(
    'Thuốc kê đơn', 'thuoc-ke-don', 4299001, '',
    pick(1016),
    { products_count: 1 }
  ),

  'da-mun-dau': makeCollection(
    'Da Mụn & Dầu', 'da-mun-dau', 4295298, '',
    pick(1005, 1007, 1013, 1003, 1004, 1006),
    { products_count: 23, sort: 'created-desc' }
  ),

  'phuc-hoi-sau-xam-lan': makeCollection(
    'PHỤC HỒI SAU XÂM LẤN', 'phuc-hoi-sau-xam-lan', 4295239, '',
    pick(1008, 1014, 1006, 1010, 1002),
    { products_count: 15, sort: 'created-desc' }
  ),

  'cham-soc-da-vung-mat-ban-chay': makeCollection(
    'CHĂM SÓC DA VÙNG MẮT BÁN CHẠY', 'cham-soc-da-vung-mat-ban-chay', 4289307, '',
    pick(1012, 1011, 1001, 1010),
    { products_count: 18, sort: 'created-desc' }
  ),

  'top-san-pham-serum-ban-chay': makeCollection(
    'TOP SẢN PHẨM SERUM NỔI BẬT', 'top-san-pham-serum-ban-chay', 4245822, '',
    pick(1002, 1007, 1010, 1011, 1015, 1009),
    { products_count: 35, sort: 'created-desc' }
  ),

  'top-kem-duong-noi-bat': makeCollection(
    'TOP KEM DƯỠNG NỔI BẬT', 'top-kem-duong-noi-bat', 4245974, '',
    pick(1001, 1006, 1012, 1014, 1008),
    { products_count: 17 }
  ),

  'top-kem-chong-nang-noi-bat': makeCollection(
    'TOP KEM CHỐNG NẮNG NỔI BẬT', 'top-kem-chong-nang-noi-bat', 4245996, '',
    pick(1003),
    { products_count: 14 }
  ),

  'top-san-pham-toner-noi-bat': makeCollection(
    'TOP SẢN PHẨM TONER NỔI BẬT', 'top-san-pham-toner-noi-bat', 4245808, '',
    pick(1005, 1007, 1002),
    { products_count: 19, sort: 'created-desc' }
  ),

  'top-san-pham-sua-rua-mat-noi-bat': makeCollection(
    'TOP SẢN PHẨM SỮA RỬA MẶT NỔI BẬT', 'top-san-pham-sua-rua-mat-noi-bat', 4245797, '',
    pick(1004),
    { products_count: 18 }
  ),

  'top-san-pham-mat-na-ban-chay': makeCollection(
    'TOP SẢN PHẨM MẶT NẠ BÁN CHẠY', 'top-san-pham-mat-na-ban-chay', 4245818, '',
    pick(1008),
    { products_count: 19 }
  ),

  'top-san-pham-tay-da-chet-noi-bat': makeCollection(
    'TOP SẢN PHẨM TẨY DA CHẾT NỔI BẬT', 'top-san-pham-tay-da-chet-noi-bat', 4245816, '',
    pick(1007, 1005),
    { products_count: 13 }
  ),

  'top-san-pham-tay-trang-noi-bat': makeCollection(
    'TOP SẢN PHẨM TẨY TRANG NỔI BẬT', 'top-san-pham-tay-trang-noi-bat', 4245794, '',
    pick(1004),
    { products_count: 11 }
  ),

  'top-bo-san-pham-ban-chay': makeCollection(
    'TOP BỘ SẢN PHẨM BÁN CHẠY', 'top-bo-san-pham-ban-chay', 4249285, '',
    pick(1001, 1002, 1003, 1006, 1007, 1010, 1012, 1013, 1014, 1015),
    { products_count: 14, sort: 'created-desc' }
  ),

  'adapalene': makeCollection(
    'ADAPALENE', 'adapalene', 4281592, '',
    pick(1001, 1011),
    { products_count: 16,
      image: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-85.png?v=1771644280640',
      sort: 'manual' }
  ),

  // ── Shell collections — metadata thật, products rỗng ──────────────────

  'trifarotene':           makeShell(4312953, 'TRIFAROTENE', 'trifarotene', 1),
  'tazarotene':            makeShell(4312949, 'TAZAROTENE', 'tazarotene', 3),
  'marini-skinsolutions':  makeShell(4311246, 'MARINI SKINSOLUTIONS', 'marini-skinsolutions', 0,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/mss26-shopify-logos-main.png?v=1778228425657' }),
  'i-peel':                makeShell(4304667, 'I PEEL', 'i-peel', 10),
  'selvert-thermal':       makeShell(4300777, 'Selvert Thermal', 'selvert-thermal', 5,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/logo-black.png?v=1775207702790' }),
  'swiss-image':           makeShell(4299698, 'SWISS IMAGE', 'swiss-image', 12,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/logo-swiss-image-1024x516.png?v=1775034221183' }),
  'clascoterone':          makeShell(4298438, 'CLASCOTERONE', 'clascoterone', 3),
  'thuoc-dieu-tri-ghe-ngua-va-chay-ran': makeShell(4297718, 'Thuốc điều trị ghẻ ngứa và chấy rận', 'thuoc-dieu-tri-ghe-ngua-va-chay-ran', 2),
  'sensilis':              makeShell(4293633, 'SENSILIS', 'sensilis', 15,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/fc07f7e2-c12b-453f-8bd0-f015db730062.jpg?v=1773560750287' }),
  'rejuran':               makeShell(4291517, 'REJURAN', 'rejuran', 9,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/c5de1a63-4b6b-4261-ac9b-3813838e0d81.png?v=1773114924427' }),
  'mua-sam-theo-thanh-phan': makeShell(4291064, 'MUA SẮM THEO THÀNH PHẦN', 'mua-sam-theo-thanh-phan', 0),
  'synergy-therm':         makeShell(4290389, 'SYNERGY THERM', 'synergy-therm', 39,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/b9e02c75-b80a-4704-b1a1-e2316f30e32a.jpg?v=1772786175667' }),
  'dapsone':               makeShell(4285157, 'DAPSONE', 'dapsone', 8,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/isotretinoin-2.png?v=1771646859490' }),
  'clindamycin':           makeShell(4285156, 'CLINDAMYCIN', 'clindamycin', 11,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/isotretinoin-1.png?v=1771646360627' }),
  'minoxidil':             makeShell(4285154, 'MINOXIDIL', 'minoxidil', 7,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-86.png?v=1771644478270' }),
  'isotretinoin':          Object.assign(makeShell(4282929, 'ISOTRETINOIN (ĐƯỜNG UỐNG)', 'isotretinoin', 12,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/isotretinoin.png?v=1771645973650' }), { products: pick(1016) }),
  'duoc-my-pham-an-do':    makeShell(4281498, 'DƯỢC MỸ PHẨM ẤN ĐỘ', 'duoc-my-pham-an-do', 56, { sort: 'manual' }),
  'differin':              makeShell(4281221, 'DIFFERIN', 'differin', 1,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/ta-i-xuo-ng.png?v=1769568207320' }),
  'atache':                makeShell(4279757, 'Atache', 'atache', 43,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/images.png?v=1768990940977' }),
  'cumlaude-lab':          makeShell(4276385, 'Cumlaude Lab', 'cumlaude-lab', 12,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/cropped-cumlaude-logo.png?v=1768183012687' }),
  'perfect-image':         makeShell(4275867, 'PERFECT IMAGE', 'perfect-image', 11,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/fa02d7eb-3eec-43fd-b862-e9db1de29ca5.jpg?v=1767927033127' }),
  'profiderm':             makeShell(4273757, 'PROFIDERM', 'profiderm', 34,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/images.png?v=1767585420457' }),
  'toskani':               makeShell(4273430, 'Toskani', 'toskani', 17,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/5a91f5c3-70ec-44a4-9ac5-f41775415a2b.jpg?v=1767413448050' }),
  'solgar':                makeShell(4267448, 'Solgar', 'solgar', 11,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/thinh-2025-12-23-lu-c-10-29-26.png?v=1766460575387' }),
  'priori':                makeShell(4262281, 'PRIORI', 'priori', 16,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/prioriskincare-logo.jpg?v=1765272959660' }),
  'vibanquentmanka':       makeShell(4257140, 'VIBANQUENTMANKA', 'vibanquentmanka', 3,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/25dbef221f735.png?v=1764040234177' }),
  'redenyl':               makeShell(4256095, 'REDENYL', 'redenyl', 2),
  'elaine-perine':         makeShell(4255725, 'Elaine Perine', 'elaine-perine', 22,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/a01bb6fc-aac6-4481-90a3-be51086c8ff7.jpg?v=1763711398197' }),
  'nubiance':              makeShell(4252185, 'Nubiance', 'nubiance', 5,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/thinh-2025-11-12-lu-c-2-36-01-ch.png?v=1762932977710' }),
  'top-10-kem-duong-am-chuyen-biet-tu-tam-trung-den-cao-cap-phu-hop-cho-mua-chuyen-mua':
    makeShell(4246775, 'TOP 10 KEM DƯỠNG ẨM CHUYÊN BIỆT', 'top-10-kem-duong-am-chuyen-biet-tu-tam-trung-den-cao-cap-phu-hop-cho-mua-chuyen-mua', 10),
  'timeless':              makeShell(4246176, 'TIMELESS', 'timeless', 5,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/logo-timeless-vn-1024x191.png?v=1761531983367' }),
  'orthomol':              makeShell(4245823, 'ORTHOMOL', 'orthomol', 3,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/orthomol-logo.png?v=1761388465230' }),
  'vagisil':               makeShell(4245613, 'Vagisil', 'vagisil', 6,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/vagisil-logo-1400x371.png?v=1761360747710' }),
  're-perfect':            makeShell(4244216, 'RE-PERFECT', 're-perfect', 3),
  // 2026-10-09: 8 danh mục tự động theo phác đồ soi da (tạo trên Sapo 09/10/2026) — trang kết quả
  // soi da/khảo sát link tới đây (settings.skin_result_col_*). ID theo nhật ký Sapo; SP demo để thử "Sản phẩm đề xuất";
  // số sản phẩm đếm trên web 09/10/2026.
  'hoat-chat-bha-salicylic':         makeCollection('Hoạt Chất Làm Sạch & Kiềm Dầu BHA', 'hoat-chat-bha-salicylic', 4365305, '', pick(1007, 1013, 1005), { products_count: 83 }),
  'tinh-chat-niacinamide':           makeCollection('Tinh Chất Niacinamide & Kiểm Soát Dầu Nhờn', 'tinh-chat-niacinamide', 4365306, '', pick(1005, 1014, 1015), { products_count: 145 }),
  'phuc-hoi-hang-rao-bao-ve-da':     makeCollection('Phục Hồi Hàng Rào Bảo Vệ Da', 'phuc-hoi-hang-rao-bao-ve-da', 4365314, '', pick(1014, 1008, 1006), { products_count: 84 }),
  'duong-am-phuc-hoi-b5-ha':         makeCollection('Cấp Ẩm Chuyên Sâu & Phục Hồi B5 / HA', 'duong-am-phuc-hoi-b5-ha', 4365307, '', pick(1006, 1008), { products_count: 912 }),
  'lam-diu-on-dinh-nen-da':          makeCollection('Làm Dịu & Ổn Định Nền Da', 'lam-diu-on-dinh-nen-da', 4365308, '', pick(1004, 1008), { products_count: 347 }),
  'retinol-chong-lao-hoa':           makeCollection('Điều Trị Chuyên Sâu Retinoid & Chống Lão Hóa', 'retinol-chong-lao-hoa', 4365309, '', pick(1001, 1011, 1012, 1016), { products_count: 516 }),
  'tri-nam-sang-da-tranexamic-vitc': makeCollection('Mờ Thâm Nám & Hoạt Chất Sáng Da', 'tri-nam-sang-da-tranexamic-vitc', 4365310, '', pick(1002, 1015, 1009), { products_count: 293 }),
  'kem-chong-nang-pho-rong':         makeCollection('Chống Nắng Phổ Rộng & Bảo Vệ Toàn Diện', 'kem-chong-nang-pho-rong', 4365311, '', pick(1003), { products_count: 362 }),
  // 2026-10-09: 6 danh mục theo vấn đề da cho khối "Giải pháp" trang chủ (settings.home_solutions_N_collection) —
  // tạo trên Sapo 10/10/2026; ID theo nhật ký, số SP đếm trên web 10/10/2026.
  'giai-phap-mun-trung-ca':          makeCollection('Giải Pháp Mụn Trứng Cá', 'giai-phap-mun-trung-ca', 4365331, '', pick(1013, 1005, 1007), { products_count: 781 }),
  'giai-phap-nam-tan-nhang':         makeCollection('Giải Pháp Nám & Tàn Nhang', 'giai-phap-nam-tan-nhang', 4365315, '', pick(1009, 1015, 1002), { products_count: 424 }),
  'giai-phap-da-kho-thieu-am':       makeCollection('Giải Pháp Da Khô, Thiếu Ẩm', 'giai-phap-da-kho-thieu-am', 4365316, '', pick(1006, 1014), { products_count: 301 }),
  'giai-phap-lao-hoa-da':            makeCollection('Giải Pháp Lão Hóa Da', 'giai-phap-lao-hoa-da', 4365327, '', pick(1001, 1011, 1010, 1012), { products_count: 918 }),
  'giai-phap-kiem-soat-dau-thua':    makeCollection('Giải Pháp Kiểm Soát Dầu Thừa', 'giai-phap-kiem-soat-dau-thua', 4365332, '', pick(1005, 1013), { products_count: 294 }),
  'giai-phap-da-nhay-cam':           makeCollection('Giải Pháp Da Nhạy Cảm', 'giai-phap-da-nhay-cam', 4365329, '', pick(1004, 1008, 1014), { products_count: 472 }),
  // 2026-10-16: danh mục hoạt chất + thương hiệu cho 2 khối trang chủ "Tìm theo hoạt chất" / "Thương hiệu tiêu biểu"
  // (menu demo mua-sam-theo-thanh-phan / thuong-hieu ở data/navigation.js). Handle, tên, ẢNH = danh mục thật trên
  // pharmacosmetics-vn.com (CDN Sapo, lấy 16/10/2026); ID là số demo; SP = SP demo cùng hoạt chất (không có ⇒ 0).
  'retinoil'                : makeCollection('Retinol', 'retinoil', 4900001, '', pick(1001, 1011), { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/retinol.png?v=1781593815393', alt: 'Retinol' } }),
  'hyaluronic-acid-ha'      : makeCollection('Hyaluronic Acid (HA)', 'hyaluronic-acid-ha', 4900002, '', pick(1006), { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-16.png?v=1758088138843', alt: 'Hyaluronic Acid (HA)' } }),
  'niacinamide-vitamin-b3'  : makeCollection('Niacinamide (B3)', 'niacinamide-vitamin-b3', 4900003, '', pick(1005, 1014, 1015), { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-17.png?v=1758088261420', alt: 'Niacinamide (B3)' } }),
  'vitamin-c'               : makeCollection('Vitamin C', 'vitamin-c', 4900004, '', pick(1002), { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-14.png?v=1758087734690', alt: 'Vitamin C' } }),
  'salicylic-acid-bha'      : makeCollection('Salicylic Acid (BHA)', 'salicylic-acid-bha', 4900005, '', pick(1007), { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-19.png?v=1758088522077', alt: 'Salicylic Acid (BHA)' } }),
  'aha'                     : makeCollection('AHA (Glycolic Acid)', 'aha', 4900006, '', pick(1007), { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-20.png?v=1758088777343', alt: 'AHA (Glycolic Acid)' } }),
  'azelaic-acid'            : makeShell(4900007, 'Azelaic Acid', 'azelaic-acid', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-18.png?v=1758088410993', alt: 'Azelaic Acid' } }),
  'ceramides'               : makeCollection('Ceramides', 'ceramides', 4900008, '', pick(1014), { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-21.png?v=1758089327457', alt: 'Ceramides' } }),
  'peptides'                : makeCollection('Peptides', 'peptides', 4900009, '', pick(1001, 1012), { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-22.png?v=1758089462807', alt: 'Peptides' } }),
  'tranexamic-acid'         : makeCollection('Tranexamic Acid', 'tranexamic-acid', 4900010, '', pick(1015), { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-24.png?v=1758089802677', alt: 'Tranexamic Acid' } }),
  'arbutin'                 : makeShell(4900011, 'Arbutin', 'arbutin', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-23.png?v=1758089687467', alt: 'Arbutin' } }),
  'panthenol-b5'            : makeShell(4900012, 'Panthenol (B5)', 'panthenol-b5', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-25.png?v=1758089889003', alt: 'Panthenol (B5)' } }),
  'centella-asiatica'       : makeCollection('Centella Asiatica', 'centella-asiatica', 4900013, '', pick(1008), { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-35.png?v=1759467118377', alt: 'Centella Asiatica' } }),
  'vitamin-e'               : makeShell(4900014, 'Vitamin E', 'vitamin-e', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-15.png?v=1758087878043', alt: 'Vitamin E' } }),
  'mandelic-acid'           : makeShell(4900015, 'Mandelic Acid', 'mandelic-acid', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-26.png?v=1758090018777', alt: 'Mandelic Acid' } }),
  'retinal'                 : makeShell(4900016, 'Retinal', 'retinal', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/thie-t-ke-chu-a-co-te-n-27.png?v=1758090117323', alt: 'Retinal' } }),
  'zo-skin-health'          : makeShell(4900017, 'ZO SKIN HEALTH', 'zo-skin-health', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/19030461-421272671563450-1476379354919174494-n.jpg?v=1627276691763', alt: 'ZO SKIN HEALTH' } }),
  'image-skincare'          : makeShell(4900018, 'IMAGE SKINCARE', 'image-skincare', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/158382078-103148818520096-1065548044872488601-n.png?v=1621503979007', alt: 'IMAGE SKINCARE' } }),
  'skinceuticals'           : makeShell(4900019, 'SKINCEUTICALS', 'skinceuticals', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/10610846-1525941830969087-3164645298429036448-n.jpg?v=1641977444233', alt: 'SKINCEUTICALS' } }),
  'mesoestetic'             : makeShell(4900020, 'mesoestetic', 'mesoestetic', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/mesoestetic-logo.png?v=1757300363317', alt: 'mesoestetic' } }),
  'neova-smart-skincare'    : makeShell(4900021, 'NEOVA SMART SKINCARE', 'neova-smart-skincare', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/32616789-1973996162673456-5431441369375703040-n.png?v=1620030441547', alt: 'NEOVA SMART SKINCARE' } }),
  'glowbiotics'             : makeShell(4900022, 'GLOWBIOTICS', 'glowbiotics', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/67099100-794091564320193-6625176990418731008-n.png?v=1629709566507', alt: 'GLOWBIOTICS' } }),
  'comfort-zone'            : makeShell(4900023, 'Comfort Zone', 'comfort-zone', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/110321121-3074765582614310-323226281352678293-n.jpg?v=1644480992840', alt: 'Comfort Zone' } }),
  'christina'               : makeShell(4900024, 'CHRISTINA', 'christina', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/12391890-917677841619973-280952355123927199-n.jpg?v=1614916667630', alt: 'CHRISTINA' } }),
  'md-ceuticals'            : makeShell(4900025, 'MD: CEUTICALS', 'md-ceuticals', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/16174552-1838073223106405-188570372034087219-n.png?v=1621350883143', alt: 'MD: CEUTICALS' } }),
  'ivatherm'                : makeShell(4900026, 'IVATHERM', 'ivatherm', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/12963517-1194754763870104-2674068526868960152-n.png?v=1628161422637', alt: 'IVATHERM' } }),
  'martiderm'               : makeShell(4900027, 'MARTI DERMA', 'martiderm', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/106636568-125737389184979-4313554039580545210-n.jpg?v=1636626643090', alt: 'MARTI DERMA' } }),
  'teoxane'                 : makeShell(4900028, 'TEOXANE', 'teoxane', 0, { image: { src: 'https://bizweb.dktcdn.net/100/415/053/collections/61167212-296444331307958-8662855706392657920-n.png?v=1627266579963', alt: 'TEOXANE' } }),
  'sesderma':              makeShell(4239895, 'SESDERMA', 'sesderma', 47,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/images.png?v=1760084339353' }),

};

// ── Factory fallback ──────────────────────────────────────────────────────
// T-115 (2026-09-12): trang tĩnh/pháp lý (chính sách bảo mật, điều khoản, liên hệ...) trong
// Sapo THẬT là "Trang nội dung" quản lý qua Sapo Admin — theme chỉ link tới URL, KHÔNG tự viết
// nội dung pháp lý (quyết định người dùng: "sapo có sẵn, giữ nguyên — tạo data demo thôi"). Repo
// này không có backend Sapo thật nên các slug đó rơi vào fallback collection (dev-server.js#
// resolvePrettyPath, cố ý giữ nguyên cơ chế — không có template `page.bwt` generic). Trước đây
// name mặc định = raw slug (vd "chinh-sach-bao-mat" hiện thẳng làm H1) — chỉ thêm DEMO NAME/
// DESCRIPTION thân thiện cho các slug tĩnh đã biết (data/navigation.js), không đổi kiến trúc.
const STATIC_PAGE_DEMO_META = {
  'chinh-sach-bao-mat':    { name: 'Chính sách bảo mật', description: 'Nội dung chính sách bảo mật được quản lý qua Sapo Admin › Trang nội dung. Đây là bản xem trước cục bộ (dev-server), không phải nội dung pháp lý thật.' },
  'chinh-sach':            { name: 'Chính sách đổi trả', description: 'Nội dung chính sách đổi trả được quản lý qua Sapo Admin › Trang nội dung. Đây là bản xem trước cục bộ (dev-server), không phải nội dung pháp lý thật.' },
  'dieu-khoan':            { name: 'Điều khoản sử dụng', description: 'Nội dung điều khoản sử dụng được quản lý qua Sapo Admin › Trang nội dung. Đây là bản xem trước cục bộ (dev-server), không phải nội dung pháp lý thật.' },
  'chinh-sach-giao-hang':  { name: 'Chính sách giao hàng', description: 'Nội dung chính sách giao hàng được quản lý qua Sapo Admin › Trang nội dung. Đây là bản xem trước cục bộ (dev-server).' },
  'chinh-sach-doi-tra':    { name: 'Chính sách đổi trả 30 ngày', description: 'Nội dung chính sách đổi trả được quản lý qua Sapo Admin › Trang nội dung. Đây là bản xem trước cục bộ (dev-server).' },
  'huong-dan-mua-hang':    { name: 'Hướng dẫn mua hàng', description: 'Nội dung hướng dẫn mua hàng được quản lý qua Sapo Admin › Trang nội dung. Đây là bản xem trước cục bộ (dev-server).' },
  'lien-he':               { name: 'Liên hệ', description: 'Thông tin liên hệ được quản lý qua Sapo Admin › Trang nội dung. Đây là bản xem trước cục bộ (dev-server).' },
};

// T-125 (2026-09-12): báo cáo audit "Breadcrumb lộ raw slug 'dieu-tri-chuyen-nghiep'" — xác nhận
// có thật. Slug này KHÔNG nằm trong STATIC_PAGE_DEMO_META (nó là danh mục do menu điều hướng trỏ
// tới, không phải trang tĩnh) nên rơi về nhánh "name = raw slug". Không hardcode thêm từng slug:
// lấy thẳng nhãn tiếng Việt CÓ DẤU mà chính menu đang hiển thị (data/navigation.js) — nguồn sự
// thật duy nhất, tự đúng cho mọi slug placeholder khác do menu sinh ra. Không thể suy tên có dấu
// từ slug không dấu, nên đây là cách duy nhất đúng ngoài việc khai báo tay.
let _navTitleBySlug = null;
function getNavTitleBySlug(handle) {
  if (!_navTitleBySlug) {
    _navTitleBySlug = new Map();
    let linklists;
    try { ({ linklists } = require('./navigation')); } catch (e) { linklists = null; }
    const visit = (link) => {
      if (link && typeof link.url === 'string' && link.title) {
        const seg = link.url.replace(/^\/+|\/+$/g, '');
        if (seg && !seg.includes('/') && !_navTitleBySlug.has(seg)) _navTitleBySlug.set(seg, link.title);
      }
      (link && link.links ? link.links : []).forEach(visit);
    };
    Object.values(linklists || {}).forEach((ll) => (ll && ll.links ? ll.links : []).forEach(visit));
  }
  return _navTitleBySlug.get(handle) || null;
}

// T-130 (2026-09-12): báo cáo audit "Thiếu hoàn toàn bộ lọc Sidebar trên /dieu-tri-chuyen-nghiep".
// Kiểm chứng thật: bộ lọc KHÔNG hề thiếu — /collections/all render đủ 6 nhóm (Loại sản phẩm /
// Thành phần hoạt tính / Vấn đề về da / Thương hiệu / Khoảng giá / Sắp xếp). Trang
// /dieu-tri-chuyen-nghiep mất sidebar vì nó là collection PLACEHOLDER dựng từ hàm này, mà hàm lại
// trả all_vendors/all_types/tags = [] → template collection.bwt không có facet nào để dựng bộ lọc.
// Sửa đúng gốc: suy ra facet từ chính danh sách sản phẩm của collection đó, thay vì viết mới 1 bộ
// lọc thứ hai.
function makeFallbackCollection(handle) {
  const demoMeta = STATIC_PAGE_DEMO_META[handle];
  const navTitle = demoMeta ? null : getNavTitleBySlug(handle);
  const items = products.slice(0, 8);
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  return {
    id: 0, name: demoMeta ? demoMeta.name : (navTitle || handle), alias: handle, url: `/${handle}`,
    description: demoMeta ? demoMeta.description : '', products_count: products.length,
    products: items,
    image: null,
    all_vendors: uniq(items.map((p) => p.vendor)),
    all_types: uniq(items.map((p) => p.type)),
    current_vendor: null, current_type: null,
    default_sort_by: 'created-desc', template_layout: 'collection',
    tags: uniq(items.flatMap((p) => p.tags || [])),
  };
}

module.exports = { collectionsData, makeFallbackCollection };
