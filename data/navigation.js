/**
 * data/navigation.js — Menus / linklists (giả lập Sapo `linklists[handle]`)
 *
 * Proxy trong preview-mock.js cho phép: linklists['main-menu'].links
 */

function link(title, url, alias, subLinks) {
  return {
    title,
    url,
    alias: alias || '',
    active: false,
    links: subLinks || [],
  };
}

const linklists = {

  // ── Menu chính (header nav) ──────────────────────────────────────────────
  'main-menu': {
    title:  'Main Menu',
    handle: 'main-menu',
    links: [
      link('TRANG CHỦ', '/', '', []),
      link('ĐIỀU TRỊ CHUYÊN NGHIỆP', '/dieu-tri-chuyen-nghiep', 'dieu-tri-chuyen-nghiep', [
        link('Điều trị nám',      '/tri-nam',             'tri-nam'),
        link('Điều trị mụn',      '/tri-mun',             'tri-mun'),
        link('Chống lão hoá',     '/chong-lao-hoa',       'chong-lao-hoa'),
        link('Phục hồi hàng rào', '/duong-am',            'duong-am'),
      ]),
      link('MUA SẮM THEO THÀNH PHẦN', '/serum', 'serum', [
        link('Retinol',           '/retinol',              'retinol'),
        link('Vitamin C',         '/lam-sang',             'lam-sang'),
        link('Niacinamide',       '/toner-niacinamide-5-zinc', ''),
        link('AHA / BHA',         '/serum-aha-10-bha-2',   ''),
        link('Hyaluronic Acid',   '/kem-duong-am-hyaluronic-acid', ''),
        link('Ceramide',          '/kem-phuc-hoi-ceramide-niacinamide', ''),
      ]),
      link('TPCN KHOẺ & ĐẸP', '/san-pham-noi-bat', 'san-pham-noi-bat', [
        link('Collagen',          '/serum-collagen-te-bao-goc', ''),
        link('Chống nắng',        '/chong-nang',           'chong-nang'),
        link('Kem mắt',           '/kem-mat-peptide-3d',   ''),
      ]),
      link('KHUYẾN MÃI', '/khuyen-mai', 'khuyen-mai', []),
      link('BLOG', '/blogs/tin-tuc', '', []),
    ],
  },

  // ── Menu danh mục (sidebar) ──────────────────────────────────────────────
  'danh-muc': {
    title:  'Danh mục',
    handle: 'danh-muc',
    links: [
      link('Chống lão hoá',          '/chong-lao-hoa',      'chong-lao-hoa', [
        link('Retinol & Peptide',     '/retinol',            ''),
        link('Serum chống lão hoá',   '/serum',              ''),
      ]),
      link('Điều trị nám & thâm',    '/tri-nam',            'tri-nam'),
      link('Điều trị mụn',           '/tri-mun',            'tri-mun'),
      link('Dưỡng ẩm',              '/duong-am',           'duong-am'),
      link('Chống nắng',             '/chong-nang',         'chong-nang'),
      link('Làm sạch da',            '/sua-rua-mat-amino-acid', ''),
      link('Serum dưỡng da',         '/serum',              'serum'),
      link('Kem mắt',                '/kem-mat-peptide-3d', ''),
      link('Điều trị chuyên nghiệp', '/dieu-tri-chuyen-nghiep', 'dieu-tri-chuyen-nghiep'),
    ],
  },

  // ── Sidebar danh mục dành cho section_product_1 ──────────────────────────
  'cate-product-1': {
    title:  'Danh mục sản phẩm nổi bật',
    handle: 'cate-product-1',
    links: [
      link('Chống lão hoá',  '/chong-lao-hoa', 'chong-lao-hoa'),
      link('Dưỡng ẩm',      '/duong-am',       'duong-am'),
      link('Serum',          '/serum',          'serum'),
      link('Trị nám',        '/tri-nam',        'tri-nam'),
      link('Chống nắng',     '/chong-nang',     'chong-nang'),
      link('Trị mụn',        '/tri-mun',        'tri-mun'),
    ],
  },

  // ── F01/F02 (phase home-shopping-ux, 2026-09-20) — DEMO/TEST cho ô danh mục
  //    con nhóm tinh chất/serum, dùng qua settings collection_subnav_1_menu.
  //    Người dùng đã duyệt tạo linklist demo này để thấy trên bản test; sẽ tự
  //    tạo Menu/collection thật trên Sapo Admin khi triển khai production.
  //    2 ô có collection thật trong data/collections.js (da-mun-dau,
  //    top-10-kem-duong-am-...) trỏ thẳng collection; 3 ô còn lại (thâm/nám,
  //    nhạy cảm, lão hoá) CHƯA có collection con thật trong data mock nên trỏ
  //    /search?query=...&type=product — cùng cách section_solutions.bwt đang
  //    dùng cho nút "Chọn theo vấn đề da" (xem snippets/section_solutions.bwt),
  //    không phải cơ chế mới. Nhóm + từ khoá tham khảo cấu trúc Biologique
  //    Recherche (blemishes/hydration/pigmentation/sensitivity/anti-aging) và
  //    từ khoá tiếng Việt thực tế (kem trị nám/tàn nhang, serum trị thâm mụn,
  //    kem dưỡng ẩm da dầu — tìm kiếm 09/2026), KHÔNG sao chép nội dung/ảnh BR.
  'serum-nhu-cau-da': {
    title:  'Serum theo nhu cầu da',
    handle: 'serum-nhu-cau-da',
    links: [
      link('Da dầu, mụn và lỗ chân lông', '/da-mun-dau', 'da-mun-dau'),
      link('Thâm sau mụn, không đều màu', '/search?query=' + encodeURIComponent('trị thâm nám') + '&type=product', ''),
      link('Da khô, thiếu ẩm', '/top-10-kem-duong-am-chuyen-biet-tu-tam-trung-den-cao-cap-phu-hop-cho-mua-chuyen-mua', 'top-10-kem-duong-am-chuyen-biet-tu-tam-trung-den-cao-cap-phu-hop-cho-mua-chuyen-mua'),
      link('Da nhạy cảm, hỗ trợ phục hồi', '/search?query=' + encodeURIComponent('da nhạy cảm phục hồi') + '&type=product', ''),
      link('Chăm sóc dấu hiệu tuổi tác', '/search?query=' + encodeURIComponent('chống lão hoá') + '&type=product', ''),
    ],
  },

  // ── Skin Healthy — nhóm dịch vụ (cho page.skinhealthy-services.bwt) ────────
  'skinhealthy-services': {
    title:  'Nhóm dịch vụ Skin Healthy',
    handle: 'skinhealthy-services',
    links: [
      link('Chăm sóc & Duy trì', '/skinhealthy-services?group=maintenance', 'maintenance'),
      link('Điều trị chuyên sâu', '/skinhealthy-services?group=targeted',   'targeted'),
      link('Can thiệp thủ thuật', '/skinhealthy-services?group=invasive',   'invasive'),
    ],
  },

  // ── Topbar ────────────────────────────────────────────────────────────────
  'topbar': {
    title:  'Topbar',
    handle: 'topbar',
    links: [
      link('Hệ thống cửa hàng',  '/he-thong-cua-hang', ''),
      link('Chính sách đổi trả', '/chinh-sach',         ''),
      link('Hướng dẫn mua hàng', '/huong-dan-mua-hang', ''),
      link('Liên hệ',            '/lien-he',            ''),
    ],
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  'footer': {
    title:  'Footer',
    handle: 'footer',
    links: [
      link('Giới thiệu',         '/gioi-thieu',         'gioi-thieu'),
      link('Tin tức',            '/blogs/tin-tuc',       ''),
      link('Chính sách bảo mật', '/chinh-sach-bao-mat', ''),
      link('Điều khoản sử dụng', '/dieu-khoan',         ''),
      link('Tuyển dụng',         '/tuyen-dung',         ''),
      link('Hệ thống cửa hàng',  '/he-thong-cua-hang',  ''),
    ],
  },

  // ── Footer dịch vụ ────────────────────────────────────────────────────────
  'footer-dich-vu': {
    title:  'Dịch vụ',
    handle: 'footer-dich-vu',
    links: [
      link('Giao hàng nhanh',    '/chinh-sach-giao-hang', ''),
      link('Đổi trả 30 ngày',    '/chinh-sach-doi-tra',   ''),
      link('Tư vấn miễn phí',    '/lien-he',              ''),
      link('Hội viên thân thiết','/hoi-vien',             ''),
      link('Đặt lịch trực tuyến','/dat-lich-tu-van',      'dat-lich-tu-van'),
      link('Đại lý phân phối',   '/dai-ly-b2b',           ''),
    ],
  },

  // ── Mega Footer SEO (section_footer_categories.bwt) ───────────────────────
  // Cấp 1 = tiêu đề cột; cấp 2 = link con (render inline, ngăn bằng "|").
  // Kiểu danh mục sàn TMĐT. Khớp taxonomy Pharma Cosmetics.
  'footer-categories': {
    title:  'Footer Categories',
    handle: 'footer-categories',
    links: [
      link('Mỹ phẩm High-End', '/collections/all', '', [
        link('Sesderma',  '/sesderma',  'sesderma'),
        link('Atache',    '/atache',    'atache'),
        link('Profiderm', '/profiderm', 'profiderm'),
        link('Toskani',   '/toskani',   'toskani'),
        link('Sensilis',  '/sensilis',  'sensilis'),
        link('Priori',    '/priori',    'priori'),
        link('Solgar',    '/solgar',    'solgar'),
      ]),
      link('Chăm sóc da mặt', '/duong-am', 'duong-am', [
        link('Sữa rửa mặt', '/sua-rua-mat-amino-acid', ''),
        link('Tẩy trang',   '/top-san-pham-tay-trang-noi-bat', ''),
        link('Toner',       '/top-san-pham-toner-noi-bat', ''),
        link('Serum',       '/top-san-pham-serum-ban-chay', ''),
        link('Kem dưỡng',   '/top-kem-duong-noi-bat', ''),
        link('Mặt nạ',      '/top-san-pham-mat-na-ban-chay', ''),
        link('Chống nắng',  '/top-kem-chong-nang-noi-bat', ''),
        link('Kem mắt',     '/cham-soc-da-vung-mat-ban-chay', ''),
      ]),
      link('Theo công dụng', '/lam-sang', 'lam-sang', [
        link('Trị mụn',       '/tri-mun',              'tri-mun'),
        link('Làm sáng da',   '/lam-sang',             'lam-sang'),
        link('Chống lão hoá', '/chong-lao-hoa',        'chong-lao-hoa'),
        link('Dưỡng ẩm',      '/duong-am',             'duong-am'),
        link('Phục hồi da',   '/phuc-hoi-sau-xam-lan', 'phuc-hoi-sau-xam-lan'),
        link('Kiềm dầu',      '/da-mun-dau',           'da-mun-dau'),
      ]),
      link('Theo vấn đề da', '/tri-nam', 'tri-nam', [
        link('Da dầu mụn',      '/da-mun-dau',     'da-mun-dau'),
        link('Nám & tàn nhang', '/tri-nam',        'tri-nam'),
        link('Lão hoá da',      '/chong-lao-hoa',  'chong-lao-hoa'),
        link('Da nhạy cảm',     '/sensilis',       'sensilis'),
        link('Lỗ chân lông to', '/da-mun-dau',     'da-mun-dau'),
        link('Thâm & sẹo',      '/tri-nam',        'tri-nam'),
      ]),
      link('Theo hoạt chất', '/mua-sam-theo-thanh-phan', 'mua-sam-theo-thanh-phan', [
        link('Retinol',         '/retinol',                       'retinol'),
        link('Vitamin C',       '/lam-sang',                      'lam-sang'),
        link('Niacinamide',     '/toner-niacinamide-5-zinc',      ''),
        link('AHA / BHA',       '/serum-aha-10-bha-2',            ''),
        link('Hyaluronic Acid', '/kem-duong-am-hyaluronic-acid',  ''),
        link('Azelaic Acid',    '/da-mun-dau',                    ''),
        link('Tranexamic Acid', '/serum-tranexamic-acid-3',       ''),
      ]),
      link('Đặc trị (kê đơn)', '/retinol', 'retinol', [
        link('Tretinoin',     '/adapalene',      ''),
        link('Adapalene',     '/adapalene',      'adapalene'),
        link('Isotretinoin',  '/isotretinoin',   'isotretinoin'),
        link('Clascoterone',  '/clascoterone',   'clascoterone'),
        link('Clindamycin',   '/clindamycin',    'clindamycin'),
        link('Dapsone',       '/dapsone',        'dapsone'),
        link('Minoxidil',     '/minoxidil',      'minoxidil'),
      ]),
      link('TPCN & Sức khoẻ', '/san-pham-noi-bat', '', [
        link('Collagen',          '/serum-collagen-te-bao-goc', ''),
        link('Vitamin tổng hợp',  '/solgar',     'solgar'),
        link('Hỗ trợ gan',        '/solgar',     ''),
        link('Hỗ trợ tim mạch',   '/orthomol',   'orthomol'),
        link('Đẹp da từ bên trong','/san-pham-noi-bat', ''),
      ]),
      link('Liệu trình & Dịch vụ', '/dieu-tri-chuyen-nghiep', '', [
        link('Routine ban ngày',       '/san-pham-ban-chay-noi-bat',   ''),
        link('Routine ban đêm',        '/top-san-pham-serum-ban-chay', ''),
        link('Phục hồi sau xâm lấn',   '/phuc-hoi-sau-xam-lan',        'phuc-hoi-sau-xam-lan'),
        link('Điều trị chuyên nghiệp', '/dieu-tri-chuyen-nghiep',      'dieu-tri-chuyen-nghiep'),
        link('Tư vấn chuyên gia',      '/lien-he',                     ''),
      ]),
    ],
  },

};

module.exports = { linklists };
