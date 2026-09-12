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
  'isotretinoin':          makeShell(4282929, 'ISOTRETINOIN (ĐƯỜNG UỐNG)', 'isotretinoin', 12,
    { image: 'https://bizweb.dktcdn.net/100/415/053/collections/isotretinoin.png?v=1771645973650' }),
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

function makeFallbackCollection(handle) {
  const demoMeta = STATIC_PAGE_DEMO_META[handle];
  const navTitle = demoMeta ? null : getNavTitleBySlug(handle);
  return {
    id: 0, name: demoMeta ? demoMeta.name : (navTitle || handle), alias: handle, url: `/${handle}`,
    description: demoMeta ? demoMeta.description : '', products_count: products.length,
    products: products.slice(0, 8),
    image: null, all_vendors: [], all_types: [],
    current_vendor: null, current_type: null,
    default_sort_by: 'created-desc', template_layout: 'collection', tags: [],
  };
}

module.exports = { collectionsData, makeFallbackCollection };
