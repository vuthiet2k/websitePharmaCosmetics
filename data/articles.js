/**
 * data/articles.js — Bài viết blog & blog objects (giả lập Sapo `blogs[handle]`, `articles`)
 *
 * Dùng cho: section_blog.bwt, section_blog_2.bwt, article.bwt
 */

function img(color, text, size = '675x380') {
  return `https://placehold.co/${size}/${color}?text=${encodeURIComponent(text)}`;
}

// ── 5 bài viết ──────────────────────────────────────────────────────────────

const articles = [

  {
    id:            201,
    title:         'Retinol: Thành phần vàng trong chống lão hoá — Cách dùng đúng để không kích ứng',
    alias:         'retinol-thanh-phan-vang-chong-lao-hoa',
    handle:        'retinol-thanh-phan-vang-chong-lao-hoa',
    url:           '/blogs/tin-tuc-va-kien-thuc/retinol-thanh-phan-vang-chong-lao-hoa',
    excerpt:       'Retinol là dẫn xuất Vitamin A được khoa học chứng minh hiệu quả nhất trong việc làm mờ nếp nhăn, tăng collagen và đều màu da — nhưng cần dùng đúng cách.',
    content:       '<p>Retinol đã được nghiên cứu hơn 40 năm và là một trong số ít thành phần skincare được FDA công nhận có hiệu quả điều trị lão hoá da...</p>',
    image:         { src: img('d4a373/ffffff', 'Retinol Guide'), alt: 'Hướng dẫn dùng Retinol' },
    featured_image:{ src: img('d4a373/ffffff', 'Retinol Guide'), alt: 'Hướng dẫn dùng Retinol' },
    author:        'Chuyên gia Thanh Hằng',
    published_on:  '2026-04-10T08:00:00',
    created_at:    '2026-04-08T14:30:00',
    tags:          ['retinol', 'chong-lao-hoa', 'skincare-101', 'chude:Thành phần'],
    comments_count: 14,
    blog: { handle: 'tin-tuc-va-kien-thuc', title: 'Tin tức & Kiến thức' },
  },

  {
    id:            202,
    title:         'Vitamin C trong skincare: Phân biệt các dạng & chọn nồng độ phù hợp',
    alias:         'vitamin-c-skincare-phan-biet-cac-dang',
    handle:        'vitamin-c-skincare-phan-biet-cac-dang',
    url:           '/blogs/tin-tuc-va-kien-thuc/vitamin-c-skincare-phan-biet-cac-dang',
    excerpt:       'L-Ascorbic Acid, Ascorbyl Glucoside, Sodium Ascorbyl Phosphate... Mỗi dạng có ưu điểm và cách dùng khác nhau. Bài viết giúp bạn chọn đúng.',
    content:       '<p>Vitamin C là antioxidant mạnh, làm sáng da, kích thích collagen và bảo vệ da khỏi tổn thương UV...</p>',
    image:         { src: img('f4a261/ffffff', 'Vitamin C Guide'), alt: 'Vitamin C trong skincare' },
    featured_image:{ src: img('f4a261/ffffff', 'Vitamin C Guide'), alt: 'Vitamin C trong skincare' },
    author:        'Chuyên gia Trần Thu Hương',
    published_on:  '2026-04-05T09:00:00',
    created_at:    '2026-04-03T11:00:00',
    tags:          ['vitamin-c', 'lam-sang', 'chude:Làm sáng da', 'skincare-101', 'sanpham:serum-vitamin-c-15', 'hoatchat:vitamin-c'],
    comments_count: 9,
    blog: { handle: 'tin-tuc-va-kien-thuc', title: 'Tin tức & Kiến thức' },
  },

  {
    id:            203,
    title:         '5 bước xây dựng routine skincare buổi sáng chuẩn chuyên gia',
    alias:         '5-buoc-routine-skincare-buoi-sang',
    handle:        '5-buoc-routine-skincare-buoi-sang',
    url:           '/blogs/tin-tuc-va-kien-thuc/5-buoc-routine-skincare-buoi-sang',
    excerpt:       'Rửa mặt → Toner → Serum → Dưỡng ẩm → Chống nắng. Đơn giản nhưng mỗi bước đều có lý do khoa học. Cùng xem thứ tự đúng và sản phẩm nên dùng.',
    content:       '<p>Một routine skincare buổi sáng tốt không cần nhiều bước, nhưng cần đúng thứ tự và sản phẩm phù hợp với loại da của bạn...</p>',
    image:         { src: img('95d5b2/333333', 'AM Routine'), alt: '5 bước skincare buổi sáng' },
    featured_image:{ src: img('95d5b2/333333', 'AM Routine'), alt: '5 bước skincare buổi sáng' },
    author:        'Chuyên gia Thanh Hằng',
    published_on:  '2026-03-28T08:30:00',
    created_at:    '2026-03-26T10:00:00',
    tags:          ['routine', 'skincare-101', 'ban-chay', 'chude:Routine'],
    comments_count: 22,
    blog: { handle: 'tin-tuc-va-kien-thuc', title: 'Tin tức & Kiến thức' },
  },

  {
    id:            204,
    title:         'Nám da: Nguyên nhân, phân loại và phác đồ điều trị hiệu quả nhất 2026',
    alias:         'nam-da-nguyen-nhan-phac-do-dieu-tri',
    handle:        'nam-da-nguyen-nhan-phac-do-dieu-tri',
    url:           '/blogs/tin-tuc-va-kien-thuc/nam-da-nguyen-nhan-phac-do-dieu-tri',
    excerpt:       'Nám là nỗi lo của hàng triệu phụ nữ Việt. Hiểu rõ nám nông, nám sâu và nám hỗn hợp giúp bạn chọn đúng phác đồ — tránh tiêu tiền vô ích.',
    content:       '<p>Nám da (melasma) là tình trạng tăng sắc tố mãn tính do nhiều yếu tố kết hợp: UV, hormon, viêm nhiễm...</p>',
    image:         { src: img('fff3e0/6d4c41', 'Nam Da Guide'), alt: 'Điều trị nám da' },
    featured_image:{ src: img('fff3e0/6d4c41', 'Nam Da Guide'), alt: 'Điều trị nám da' },
    author:        'Chuyên gia Lê Thị Lan',
    published_on:  '2026-03-15T09:00:00',
    created_at:    '2026-03-12T14:00:00',
    tags:          ['tri-nam', 'chuyen-nghiep', 'bac-si-tu-van'],
    comments_count: 31,
    blog: { handle: 'tin-tuc-va-kien-thuc', title: 'Tin tức & Kiến thức' },
  },

  {
    id:            205,
    title:         'SPF, PA, UVA/UVB — Giải mã ký hiệu kem chống nắng để chọn đúng sản phẩm',
    alias:         'giai-ma-ky-hieu-kem-chong-nang-spf-pa',
    handle:        'giai-ma-ky-hieu-kem-chong-nang-spf-pa',
    url:           '/blogs/tin-tuc-va-kien-thuc/giai-ma-ky-hieu-kem-chong-nang-spf-pa',
    excerpt:       'SPF50+ PA++++ nghĩa là gì? Tại sao cần bôi lại sau 2 tiếng? Bài viết giải thích đầy đủ để bạn không mua nhầm kem chống nắng nữa.',
    content:       '<p>Kem chống nắng là bước không thể bỏ qua trong bất kỳ routine skincare nào. SPF đo khả năng chống UVB, còn PA+++ đo UVA...</p>',
    image:         { src: img('90e0ef/333333', 'SPF Guide'), alt: 'Hướng dẫn kem chống nắng' },
    featured_image:{ src: img('90e0ef/333333', 'SPF Guide'), alt: 'Hướng dẫn kem chống nắng' },
    author:        'Chuyên gia Thanh Hằng',
    published_on:  '2026-03-05T08:00:00',
    created_at:    '2026-03-03T10:30:00',
    tags:          ['chong-nang', 'spf', 'skincare-101'],
    comments_count: 18,
    blog: { handle: 'tin-tuc-va-kien-thuc', title: 'Tin tức & Kiến thức' },
  },

  {
    id:            206,
    title:         'Niacinamide và Zinc: Bộ đôi kiểm soát dầu nhờn, thu nhỏ lỗ chân lông',
    alias:         'niacinamide-zinc-kiem-soat-dau-nhon',
    handle:        'niacinamide-zinc-kiem-soat-dau-nhon',
    url:           '/blogs/tin-tuc-va-kien-thuc/niacinamide-zinc-kiem-soat-dau-nhon',
    excerpt:       'Da dầu, lỗ chân lông to là nỗi ám ảnh của nhiều người. Niacinamide nồng độ 5-10% kết hợp Zinc PCA giúp điều tiết bã nhờn hiệu quả mà không gây khô căng.',
    content:       '<p>Niacinamide (Vitamin B3) là hoạt chất đa năng: vừa điều tiết dầu, vừa củng cố hàng rào bảo vệ da và làm đều màu da...</p>',
    image:         { src: img('2a9d8f/ffffff', 'Niacinamide Guide'), alt: 'Niacinamide và Zinc kiểm soát dầu' },
    featured_image:{ src: img('2a9d8f/ffffff', 'Niacinamide Guide'), alt: 'Niacinamide và Zinc kiểm soát dầu' },
    author:        'Chuyên gia Trần Thu Hương',
    published_on:  '2026-02-20T08:00:00',
    created_at:    '2026-02-18T09:30:00',
    tags:          ['niacinamide', 'da-dau', 'skincare-101'],
    comments_count: 11,
    blog: { handle: 'tin-tuc-va-kien-thuc', title: 'Tin tức & Kiến thức' },
  },

];

// T-110 (2026-09-11): templates/blog.bwt dùng blogs[settings.section_blog_url] (blog.bwt:69,75)
// cho khối "Featured post hero" + "3 ô grid" ở đầu trang /?tpl=blog. settings.section_blog_url
// = "bi-quyet" (configs/settings_data.json, field type "blog" trong settings_schema.json) —
// nhưng data/articles.js trước đây chỉ có 2 blog handle (tin-tuc, truoc-va-sau) nên
// buildBlogsObj() (preview-mock.js) tự tạo fallback rỗng { articles: [] } → 2 khối đầu trang
// luôn trống bất kể phần blog.articles (blog chính = tin-tuc) bên dưới có bao nhiêu bài.
// Thêm blog "bi-quyet" (Bí Quyết Làm Đẹp) với data khớp đúng field Sapo Article/Blog thật
// (cùng schema với blog "tin-tuc" ở trên) để 2 khối spotlight hiển thị đúng như thiết kế.
const beautyTipsArticles = [
  {
    id:            221,
    title:         'Double Cleansing: Vì sao cần rửa mặt 2 bước để da sạch sâu thật sự',
    alias:         'double-cleansing-rua-mat-2-buoc-sach-sau',
    handle:        'double-cleansing-rua-mat-2-buoc-sach-sau',
    url:           '/blogs/bi-quyet/double-cleansing-rua-mat-2-buoc-sach-sau',
    excerpt:       'Dầu tẩy trang + sữa rửa mặt là công thức vàng để loại bỏ hoàn toàn kem chống nắng, bụi mịn và bã nhờn tích tụ trong ngày — bí quyết của làn da Hàn/Nhật.',
    // 2026-10-07: nội dung mẫu có H2/danh sách đánh số/blockquote để preview kiểu nội dung bài theo thiết kế.
    content:       '<p>Double cleansing (làm sạch kép) là bước đầu tiên và quan trọng nhất trong mọi routine skincare hiệu quả...</p>'
      + '<h2>1. Double Cleansing là gì?</h2><p>Double cleansing là quy trình rửa mặt 2 bước, thường bao gồm:</p>'
      + '<ol><li><strong>Bước 1:</strong> Tẩy trang (dầu/sáp tẩy trang) để loại bỏ lớp trang điểm, kem chống nắng, dầu thừa.</li>'
      + '<li><strong>Bước 2:</strong> Rửa mặt với sữa rửa mặt dịu nhẹ để làm sạch bụi bẩn còn sót lại.</li></ol>'
      + '<blockquote><p>Làn da sạch không chỉ là bề mặt, mà là nền tảng cho làn da khoẻ đẹp lâu dài.</p></blockquote>',
    image:         { src: img('ffb4a2/333333', 'Double Cleansing'), alt: 'Bí quyết double cleansing' },
    featured_image:{ src: img('ffb4a2/333333', 'Double Cleansing'), alt: 'Bí quyết double cleansing' },
    author:        'Chuyên gia Thanh Hằng',
    published_on:  '2026-04-12T08:00:00',
    created_at:    '2026-04-10T09:00:00',
    tags:          ['bi-quyet', 'lam-sach-da', 'skincare-101'],
    comments_count: 12,
    blog: { handle: 'bi-quyet', title: 'Bí Quyết Làm Đẹp' },
  },
  {
    id:            222,
    title:         'Dưỡng ẩm ban đêm đúng cách: Khoá ẩm để da phục hồi khi ngủ',
    alias:         'duong-am-ban-dem-dung-cach',
    handle:        'duong-am-ban-dem-dung-cach',
    url:           '/blogs/bi-quyet/duong-am-ban-dem-dung-cach',
    excerpt:       'Ban đêm là lúc da tự phục hồi mạnh nhất. Một lớp dưỡng ẩm khoá nước đúng cách giúp tăng hiệu quả tái tạo gấp nhiều lần so với ban ngày.',
    content:       '<p>Trong khi ngủ, tốc độ tái tạo tế bào da tăng cao — đây là "khung giờ vàng" để các dưỡng chất phục hồi phát huy tối đa tác dụng...</p>',
    image:         { src: img('cdb4db/333333', 'Night Care'), alt: 'Dưỡng ẩm ban đêm' },
    featured_image:{ src: img('cdb4db/333333', 'Night Care'), alt: 'Dưỡng ẩm ban đêm' },
    author:        'Chuyên gia Trần Thu Hương',
    published_on:  '2026-04-08T08:00:00',
    created_at:    '2026-04-06T09:00:00',
    tags:          ['bi-quyet', 'duong-am', 'skincare-101'],
    comments_count: 8,
    blog: { handle: 'bi-quyet', title: 'Bí Quyết Làm Đẹp' },
  },
  {
    id:            223,
    title:         '5 bí quyết chăm da mùa hanh khô không bị bong tróc, căng rát',
    alias:         '5-bi-quyet-cham-da-mua-hanh-kho',
    handle:        '5-bi-quyet-cham-da-mua-hanh-kho',
    url:           '/blogs/bi-quyet/5-bi-quyet-cham-da-mua-hanh-kho',
    excerpt:       'Thời tiết hanh khô khiến da dễ mất nước, bong tróc và nhạy cảm hơn. Đây là 5 điều chỉnh routine đơn giản giúp da luôn mềm mịn quanh năm.',
    content:       '<p>Khi độ ẩm không khí giảm, hàng rào bảo vệ da mất nước nhanh hơn bình thường nếu không được hỗ trợ đúng cách...</p>',
    image:         { src: img('a2d2ff/333333', 'Dry Season Care'), alt: 'Chăm da mùa hanh khô' },
    featured_image:{ src: img('a2d2ff/333333', 'Dry Season Care'), alt: 'Chăm da mùa hanh khô' },
    author:        'Chuyên gia Thanh Hằng',
    published_on:  '2026-04-02T08:00:00',
    created_at:    '2026-03-31T09:00:00',
    tags:          ['bi-quyet', 'duong-am', 'da-nhay-cam'],
    comments_count: 10,
    blog: { handle: 'bi-quyet', title: 'Bí Quyết Làm Đẹp' },
  },
  {
    id:            224,
    title:         'Cách chọn kem nền không gây bí da cho người da dầu mụn',
    alias:         'chon-kem-nen-khong-gay-bi-da-mun',
    handle:        'chon-kem-nen-khong-gay-bi-da-mun',
    url:           '/blogs/bi-quyet/chon-kem-nen-khong-gay-bi-da-mun',
    excerpt:       'Kem nền "non-comedogenic" là gì và vì sao thành phần này quan trọng với da dầu mụn? Hướng dẫn đọc bảng thành phần trước khi mua.',
    content:       '<p>Nhiều trường hợp mụn ẩn, mụn viêm tái đi tái lại xuất phát từ việc dùng sai kem nền gây bít tắc lỗ chân lông...</p>',
    image:         { src: img('bde0fe/333333', 'Makeup Tips'), alt: 'Chọn kem nền cho da mụn' },
    featured_image:{ src: img('bde0fe/333333', 'Makeup Tips'), alt: 'Chọn kem nền cho da mụn' },
    author:        'Chuyên gia Lê Thị Lan',
    published_on:  '2026-03-25T08:00:00',
    created_at:    '2026-03-23T09:00:00',
    tags:          ['bi-quyet', 'trang-diem', 'da-dau-mun'],
    comments_count: 6,
    blog: { handle: 'bi-quyet', title: 'Bí Quyết Làm Đẹp' },
  },
  {
    id:            225,
    title:         'Tẩy tế bào chết đúng tần suất: Bao lâu 1 lần là đủ, không hại da?',
    alias:         'tay-te-bao-chet-dung-tan-suat',
    handle:        'tay-te-bao-chet-dung-tan-suat',
    url:           '/blogs/bi-quyet/tay-te-bao-chet-dung-tan-suat',
    excerpt:       'Tẩy da chết quá thường xuyên là nguyên nhân phổ biến gây mỏng da, đỏ rát. Tần suất lý tưởng phụ thuộc vào loại da và hoạt chất đang dùng.',
    content:       '<p>AHA, BHA hay tẩy da chết vật lý đều cần liều lượng và tần suất phù hợp để phát huy hiệu quả mà không làm tổn thương hàng rào da...</p>',
    image:         { src: img('ffc8dd/333333', 'Exfoliation Tips'), alt: 'Tẩy tế bào chết đúng cách' },
    featured_image:{ src: img('ffc8dd/333333', 'Exfoliation Tips'), alt: 'Tẩy tế bào chết đúng cách' },
    author:        'Chuyên gia Thanh Hằng',
    published_on:  '2026-03-18T08:00:00',
    created_at:    '2026-03-16T09:00:00',
    tags:          ['bi-quyet', 'tay-te-bao-chet', 'skincare-101'],
    comments_count: 15,
    blog: { handle: 'bi-quyet', title: 'Bí Quyết Làm Đẹp' },
  },
];

// 2026-10-03 (Bước 3): blog "chuyen-gia" và "hoat-chat" mô phỏng đúng cách Sapo lưu dữ liệu
// (bài viết + tag "khoá:giá trị", xem snippets/expert_fields.bwt và page.tra-cuu-hoat-chat.bwt) —
// thay các biến mock `doctors`/`ingredients` không tồn tại trên Sapo. Nội dung chuyển nguyên từ
// data/doctors.js + data/ingredients.js (mock preview sẵn có), chỉ đổi định dạng.
const { doctors } = require('./doctors');
const { ingredients } = require('./ingredients');

const expertArticles = doctors.map((d, i) => ({
  id: 400 + i,
  title: d.name,
  alias: d.alias,
  handle: d.alias,
  url: `/blogs/chuyen-gia/${d.alias}`,
  summary: (d.quote || '').replace(/^"|"$/g, ''),
  excerpt: (d.quote || '').replace(/^"|"$/g, ''),
  content: `<p>${d.education}</p><p>${d.bio}</p>`,
  image: { src: d.photo.src, alt: d.photo.alt },
  featured_image: { src: d.photo.src, alt: d.photo.alt },
  author: d.name,
  published_on: '2026-09-01T08:00:00',
  created_at: '2026-09-01T08:00:00',
  tags: [
    `chucdanh:${d.title}`, `chuyenkhoa:${d.specialty}`, `kinhnghiem:${d.years_experience}`,
    ...(d.stats ? [`benhnhan:${d.stats.patients_treated}`, `hieuqua:${d.stats.clinical_efficacy}`, `danhgia:${d.stats.rating}`] : []),
  ],
  comments_count: 0,
  blog: { handle: 'chuyen-gia', title: 'Đội ngũ chuyên gia' },
}));

const ingredientArticles = ingredients.map((g, i) => ({
  id: 500 + i,
  title: g.name,
  alias: g.id,
  handle: g.id,
  url: `/blogs/hoat-chat/${g.id}`,
  summary: g.summary,
  excerpt: g.summary,
  content: `<p>${g.caution}</p>${g.interaction_note ? `<p>${g.interaction_note}</p>` : ''}`,
  image: null,
  featured_image: null,
  author: 'Pharma Cosmetics',
  published_on: '2026-09-01T08:00:00',
  created_at: '2026-09-01T08:00:00',
  tags: [`nhom:${g.group}`, `inci:${g.inci_name}`, ...(g.interacts_with || []).map((h) => `tuongtac:${h}`)],
  comments_count: 0,
  blog: { handle: 'hoat-chat', title: 'Thư viện hoạt chất' },
}));

// 2026-10-03: blog "danh-gia-khach-hang" thay biến mock `patient_testimonials` — chuyển từ
// data/testimonials.js (mock preview, tên hư cấu), tiêu đề = tên khách, tag ketqua:<kết quả>.
const { testimonials } = require('./testimonials');
const testimonialArticles = testimonials.map((t, i) => ({
  id: 600 + i,
  title: t.name,
  alias: `danh-gia-${t.id}`,
  handle: `danh-gia-${t.id}`,
  url: `/blogs/danh-gia-khach-hang/danh-gia-${t.id}`,
  summary: t.quote,
  excerpt: t.quote,
  content: `<p>${t.quote}</p>`,
  image: t.avatar ? { src: t.avatar.src, alt: t.avatar.alt } : null,
  featured_image: t.avatar ? { src: t.avatar.src, alt: t.avatar.alt } : null,
  author: 'Pharma Cosmetics',
  published_on: '2026-09-01T08:00:00',
  created_at: '2026-09-01T08:00:00',
  tags: t.result_title ? [`ketqua:${t.result_title}`] : [],
  comments_count: 0,
  blog: { handle: 'danh-gia-khach-hang', title: 'Đánh giá khách hàng' },
}));

// 2026-10-03: blog FAQ "cau-hoi-san-pham" / "cau-hoi-dat-lich" / "cau-hoi-tai-khoan" thay biến mock
// `faqs.product/booking/account` — chuyển từ data/faqs.js (mock preview), tiêu đề = câu hỏi,
// content = câu trả lời.
const { faqs } = require('./faqs');
const faqArticles = (list, blogHandle, blogTitle, idBase) => list.map((f, i) => ({
  id: idBase + i,
  title: f.q,
  alias: `cau-hoi-${i + 1}`,
  handle: `cau-hoi-${i + 1}`,
  url: `/blogs/${blogHandle}/cau-hoi-${i + 1}`,
  summary: '',
  excerpt: '',
  content: `<p>${f.a}</p>`,
  image: null,
  featured_image: null,
  author: 'Pharma Cosmetics',
  published_on: '2026-09-01T08:00:00',
  created_at: '2026-09-01T08:00:00',
  tags: [],
  comments_count: 0,
  blog: { handle: blogHandle, title: blogTitle },
}));
const productFaqArticles = faqArticles(faqs.product, 'cau-hoi-san-pham', 'Câu hỏi thường gặp', 700);
const bookingFaqArticles = faqArticles(faqs.booking, 'cau-hoi-dat-lich', 'Câu hỏi đặt lịch', 800);
const accountFaqArticles = faqArticles(faqs.account, 'cau-hoi-tai-khoan', 'Câu hỏi tài khoản', 900);

// 2026-10-03: blog "y-kien-chuyen-gia" thay khối "Ý kiến chuyên gia" ghi cứng ở product.bwt. Nội
// dung = đúng câu trích dẫn cũ (mock preview); chỉ gắn 1 sản phẩm để xem được cả 2 trạng thái
// (có ý kiến / ẩn khối).
const expertOpinionArticles = [
  {
    id: 1001,
    title: 'Ý kiến chuyên gia: Kem Dưỡng Ẩm Hyaluronic Acid',
    alias: 'y-kien-kem-duong-am-hyaluronic-acid',
    handle: 'y-kien-kem-duong-am-hyaluronic-acid',
    url: '/blogs/y-kien-chuyen-gia/y-kien-kem-duong-am-hyaluronic-acid',
    summary: 'Sản phẩm này là nền tảng trong phác đồ phục hồi da tổn thương sau treatment và laser tại phòng khám của chúng tôi. Nồng độ hoạt chất kết hợp mang lại hiệu quả làm dịu mao mạch nhanh hơn đáng kể so với sản phẩm thông thường.',
    excerpt: '',
    content: '',
    image: null,
    featured_image: null,
    author: 'Chuyên gia Thanh Hằng',
    published_on: '2026-09-01T08:00:00',
    created_at: '2026-09-01T08:00:00',
    tags: ['sanpham:kem-duong-am-hyaluronic-acid', 'chuyengia:chuyen-gia-thanh-hang'],
    comments_count: 0,
    blog: { handle: 'y-kien-chuyen-gia', title: 'Ý kiến chuyên gia' },
  },
];

// 2026-10-03: blog "giai-phap-skin-health" thay biến mock `solutions` (page.spa-services) — chuyển
// nguyên từ data/solutions.js (trích xlsx Clinic), tag en:/phuhop:/tagline:.
const { solutions } = require('./solutions');
const solutionArticles = solutions.map((sol, i) => ({
  id: 1100 + i,
  title: sol.name_vi,
  alias: sol.id.toLowerCase(),
  handle: sol.id.toLowerCase(),
  url: `/blogs/giai-phap-skin-health/${sol.id.toLowerCase()}`,
  summary: sol.summary,
  excerpt: sol.summary,
  content: `<p>${sol.personalization_note || ''}</p>`,
  image: null,
  featured_image: null,
  author: 'Skin Health Beauty',
  published_on: '2026-09-01T08:00:00',
  created_at: '2026-09-01T08:00:00',
  tags: [`en:${sol.name_en}`, ...(sol.suitable_for || []).map((x) => `phuhop:${x}`), ...(sol.tagline ? [`tagline:${sol.tagline}`] : [])],
  comments_count: 0,
  blog: { handle: 'giai-phap-skin-health', title: 'Giải pháp Skin Health' },
}));

// Byline: bài viết của chuyên gia gắn tag "chuyengia:<handle>" (trước đây so khớp tên tác giả).
[...articles, ...beautyTipsArticles].forEach((a) => {
  const d = doctors.find((x) => x.name === a.author);
  if (d && !a.tags.includes(`chuyengia:${d.alias}`)) a.tags.push(`chuyengia:${d.alias}`);
});

// ── Blog objects ─────────────────────────────────────────────────────────────

// 6 bài "Trước & Sau" — case study dạng bài viết mô tả bằng chữ (KHÔNG dùng ảnh lâm sàng
// giả lập/dàn dựng — tuân thủ nguyên tắc không tự tạo bằng chứng y tế; ảnh minh hoạ chỉ là
// placeholder trung tính, không phải ảnh trước/sau thật).
const beforeAfterArticles = [
  {
    id: 211, title: 'Hành trình 8 tuần cải thiện da mụn viêm nặng',
    alias: 'hanh-trinh-8-tuan-cai-thien-da-mun-viem',
    handle: 'hanh-trinh-8-tuan-cai-thien-da-mun-viem',
    url: '/blogs/truoc-va-sau-1/hanh-trinh-8-tuan-cai-thien-da-mun-viem',
    excerpt: 'Case study thực tế: khách hàng nữ 24 tuổi, da mụn viêm mức độ trung bình, cải thiện 80% sau 8 tuần theo phác đồ kết hợp BHA + Niacinamide.',
    content: '<p>Ghi nhận tiến trình điều trị mụn viêm theo từng tuần, kèm đánh giá của chuyên gia da liễu phụ trách...</p>',
    image: { src: img('e9c46a/333333', 'Case 01'), alt: 'Case study điều trị mụn viêm' },
    featured_image: { src: img('e9c46a/333333', 'Case 01'), alt: 'Case study điều trị mụn viêm' },
    author: 'Chuyên gia Thanh Hằng', published_on: '2026-04-01T08:00:00', created_at: '2026-03-30T10:00:00',
    tags: ['case-study', 'tri-mun'], comments_count: 7,
    blog: { handle: 'truoc-va-sau-1', title: 'Trước & Sau' },
  },
  {
    id: 212, title: 'Case study: Mờ nám mảng sau 12 tuần điều trị chuẩn y khoa',
    alias: 'case-study-mo-nam-mang-12-tuan',
    handle: 'case-study-mo-nam-mang-12-tuan',
    url: '/blogs/truoc-va-sau-1/case-study-mo-nam-mang-12-tuan',
    excerpt: 'Khách hàng nữ 38 tuổi, nám mảng lâu năm, áp dụng phác đồ Tranexamic Acid + chống nắng nghiêm ngặt, ghi nhận cải thiện rõ sau 3 tháng.',
    content: '<p>Nám mảng là dạng khó điều trị nhất trong các loại tăng sắc tố. Case study này ghi lại lộ trình theo dõi định kỳ mỗi 2 tuần...</p>',
    image: { src: img('f4a261/333333', 'Case 02'), alt: 'Case study điều trị nám' },
    featured_image: { src: img('f4a261/333333', 'Case 02'), alt: 'Case study điều trị nám' },
    author: 'Chuyên gia Lê Thị Lan', published_on: '2026-03-20T08:00:00', created_at: '2026-03-18T10:00:00',
    tags: ['case-study', 'tri-nam'], comments_count: 15,
    blog: { handle: 'truoc-va-sau-1', title: 'Trước & Sau' },
  },
  {
    id: 213, title: 'Phục hồi hàng rào bảo vệ da sau 6 tuần cho da nhạy cảm',
    alias: 'phuc-hoi-hang-rao-bao-ve-da-6-tuan',
    handle: 'phuc-hoi-hang-rao-bao-ve-da-6-tuan',
    url: '/blogs/truoc-va-sau-1/phuc-hoi-hang-rao-bao-ve-da-6-tuan',
    excerpt: 'Da nhạy cảm, dễ đỏ rát do dùng mỹ phẩm sai cách nhiều năm — lộ trình phục hồi bằng Ceramide và Centella Asiatica trong 6 tuần.',
    content: '<p>Hàng rào bảo vệ da tổn thương cần thời gian và sự kiên nhẫn để phục hồi. Case study ghi lại từng mốc đánh giá...</p>',
    image: { src: img('95d5b2/333333', 'Case 03'), alt: 'Case study phục hồi da nhạy cảm' },
    featured_image: { src: img('95d5b2/333333', 'Case 03'), alt: 'Case study phục hồi da nhạy cảm' },
    author: 'Chuyên gia Thanh Hằng', published_on: '2026-03-10T08:00:00', created_at: '2026-03-08T10:00:00',
    tags: ['case-study', 'phuc-hoi-da'], comments_count: 9,
    blog: { handle: 'truoc-va-sau-1', title: 'Trước & Sau' },
  },
  {
    id: 214, title: 'Cải thiện lỗ chân lông to và bề mặt da sau liệu trình 10 tuần',
    alias: 'cai-thien-lo-chan-long-to-10-tuan',
    handle: 'cai-thien-lo-chan-long-to-10-tuan',
    url: '/blogs/truoc-va-sau-1/cai-thien-lo-chan-long-to-10-tuan',
    excerpt: 'Kết hợp AHA/BHA nồng độ tăng dần với Retinol liều thấp giúp cải thiện kết cấu da và lỗ chân lông rõ rệt sau 10 tuần theo dõi.',
    content: '<p>Lỗ chân lông to thường liên quan đến tăng tiết bã nhờn và mất đàn hồi collagen quanh nang lông...</p>',
    image: { src: img('90e0ef/333333', 'Case 04'), alt: 'Case study cải thiện lỗ chân lông' },
    featured_image: { src: img('90e0ef/333333', 'Case 04'), alt: 'Case study cải thiện lỗ chân lông' },
    author: 'Chuyên gia Trần Thu Hương', published_on: '2026-02-25T08:00:00', created_at: '2026-02-23T10:00:00',
    tags: ['case-study', 'lo-chan-long'], comments_count: 6,
    blog: { handle: 'truoc-va-sau-1', title: 'Trước & Sau' },
  },
  {
    id: 215, title: 'Giảm thâm sau mụn rõ rệt chỉ sau 5 tuần dùng đúng hoạt chất',
    alias: 'giam-tham-sau-mun-5-tuan',
    handle: 'giam-tham-sau-mun-5-tuan',
    url: '/blogs/truoc-va-sau-1/giam-tham-sau-mun-5-tuan',
    excerpt: 'Thâm sau mụn (PIH) đáp ứng tốt với Alpha Arbutin và Tranexamic Acid nồng độ phù hợp — case study khách hàng 27 tuổi.',
    content: '<p>Thâm sau mụn khác với nám ở cơ chế hình thành, nên cần phác đồ và thời gian điều trị khác nhau...</p>',
    image: { src: img('d4a373/333333', 'Case 05'), alt: 'Case study giảm thâm sau mụn' },
    featured_image: { src: img('d4a373/333333', 'Case 05'), alt: 'Case study giảm thâm sau mụn' },
    author: 'Chuyên gia Thanh Hằng', published_on: '2026-02-14T08:00:00', created_at: '2026-02-12T10:00:00',
    tags: ['case-study', 'tham-mun'], comments_count: 13,
    blog: { handle: 'truoc-va-sau-1', title: 'Trước & Sau' },
  },
  {
    id: 216, title: 'Da sáng khoẻ, đều màu hơn sau 3 tháng chăm sóc kiên trì',
    alias: 'da-sang-khoe-deu-mau-3-thang',
    handle: 'da-sang-khoe-deu-mau-3-thang',
    url: '/blogs/truoc-va-sau-1/da-sang-khoe-deu-mau-3-thang',
    excerpt: 'Không phải mọi cải thiện đều cần thủ thuật xâm lấn — case study da xỉn màu, không đều được cải thiện chỉ bằng routine dưỡng da đúng cách.',
    content: '<p>Đôi khi vấn đề lớn nhất của làn da chỉ là routine chưa đúng thứ tự và thiếu kiên trì...</p>',
    image: { src: img('e5989b/333333', 'Case 06'), alt: 'Case study da sáng đều màu' },
    featured_image: { src: img('e5989b/333333', 'Case 06'), alt: 'Case study da sáng đều màu' },
    author: 'Chuyên gia Lê Thị Lan', published_on: '2026-01-30T08:00:00', created_at: '2026-01-28T10:00:00',
    tags: ['case-study', 'duong-da'], comments_count: 5,
    blog: { handle: 'truoc-va-sau-1', title: 'Trước & Sau' },
  },
];

// 2026-10-07: tag khoá:giá trị cho trang Trước & Sau (templates/page.clinical-proof.bwt) — CHỈ để preview bố cục.
// Ảnh là khung placeholder ghi rõ [ẢNH TRƯỚC]/[ẢNH SAU], không phải ảnh khách hàng; tuổi/số tuần lấy từ excerpt mock.
{
  const baBefore = img('D5DDD8/5F7A6D', '[ẢNH TRƯỚC]', '600x600');
  const baAfter  = img('CBE6D6/2F6B4F', '[ẢNH SAU]', '600x600');
  const baTags = {
    // Tên nhóm theo artboard thiết kế (4 nhóm vấn đề da).
    211: ['nhom:Mụn', 'tuoi:24', 'tuan:8', 'phacdo:BHA + Niacinamide'],
    214: ['nhom:Mụn', 'tuan:10', 'phacdo:AHA/BHA + Retinol liều thấp'],
    215: ['nhom:Thâm – nám – tăng sắc tố', 'tuoi:27', 'tuan:5', 'phacdo:Alpha Arbutin + Tranexamic Acid'],
    212: ['nhom:Thâm – nám – tăng sắc tố', 'tuoi:38', 'tuan:12', 'phacdo:Tranexamic Acid + chống nắng'],
    213: ['nhom:Đỏ da – nhạy cảm', 'tuan:6', 'phacdo:Ceramide + Centella Asiatica'],
    216: ['nhom:Lão hóa – tiền mãn kinh', 'tuan:12'],
  };
  // 2026-10-17: ca 211/212 mô phỏng cách nhập trên trình soạn thảo Sapo — 2 ảnh đầu chèn trong Nội dung (trước, sau);
  // các ca còn lại giữ tag anhtruoc:/anhsau: (snippets/ba_case_source.bwt nhận cả 2 cách). Mọi ca chọn giao diện
  // article.truoc-va-sau như hướng dẫn docs/huong-dan-tao-ca-truoc-sau.md.
  const baInContent = [211, 212];
  beforeAfterArticles.forEach((a) => {
    a.template_suffix = 'truoc-va-sau';
    if (!baTags[a.id]) return;
    if (baInContent.includes(a.id)) {
      a.content = `<p><img src="${baBefore}" alt="" /></p><p><img src="${baAfter}" alt="" /></p>${a.content}`;
      a.tags.push(...baTags[a.id]);
    } else {
      a.tags.push(`anhtruoc:${baBefore}`, `anhsau:${baAfter}`, ...baTags[a.id]);
    }
  });

  // 2026-10-17: DỮ LIỆU DEMO cho trang test local blog.truoc-va-sau (dev-preview/templates/) — đủ các tình huống cần
  // kiểm: ca có câu chuyện đầy đủ + ảnh mốc thứ 3, ca gắn liệu trình, ca thiếu ảnh (không được hiện ở /clinical-proof),
  // ca không có tag nhom: (vào nhóm "Kết quả khác"). Tiêu đề ghi [DEMO]; KHÔNG phải ca khách hàng thật.
  const baMid = img('E3EDE6/5F7A6D', '[ẢNH TUẦN 4]', '600x600');
  const story = (extra) => `<h2>Tình trạng ban đầu</h2><p>[DEMO] Mô tả loại da, vấn đề chính và sản phẩm khách đã dùng trước khi bắt đầu.</p>`
    + `<h2>Phác đồ</h2><ul><li>Giai đoạn 1 (tuần 1–2): làm sạch dịu nhẹ, phục hồi hàng rào bảo vệ da.</li><li>Giai đoạn 2 (tuần 3–8): đưa hoạt chất điều trị vào routine, tăng dần tần suất.</li></ul>`
    + `<h2>Diễn tiến</h2>${extra || ''}<p>[DEMO] Ghi nhận theo từng mốc tái khám.</p>`
    + `<h2>Kết quả &amp; lưu ý</h2><p>[DEMO] Kết quả khác nhau tùy cơ địa; ca được đăng khi khách đồng ý.</p>`;
  const a211 = beforeAfterArticles.find((a) => a.id === 211);
  if (a211) a211.content = `<p><img src="${baBefore}" alt="" /></p><p><img src="${baAfter}" alt="" /></p>`
    + story(`<p><img src="${baMid}" alt="Mốc tuần 4" /></p>`);
  const demoCase = (id, handle, title, excerpt, tags, content, extra) => Object.assign({
    id, title, url: `/blogs/truoc-va-sau-1/${handle}`, excerpt, summary: excerpt, content,
    image: { src: baAfter, alt: title }, featured_image: { src: baAfter, alt: title },
    author: 'Chuyên gia Thanh Hằng', published_on: '2026-10-15T08:00:00', created_at: '2026-10-15T08:00:00',
    tags, comments_count: 0, template_suffix: 'truoc-va-sau', blog: { handle: 'truoc-va-sau-1', title: 'Trước & Sau' },
  }, extra || {});
  beforeAfterArticles.unshift(
    demoCase(217, 'demo-getglowing-micro-peel-6-tuan', '[DEMO] GetGlowing Micro-Peel – cải thiện bít tắc sau 6 tuần',
      '[DEMO] Ca mẫu gắn liệu trình GetGlowing Micro-Peel — hiện cả ở trang liệu trình.',
      ['nhom:Mụn', 'tuoi:29', 'tinh:Hà Nội', 'tuan:6', 'phacdo:GetGlowing Micro-Peel + phục hồi', 'lieutrinh:' + 'elaine-brennan-getglowing-micro-peel-lieu-trinh-peel-chuyen-nghiep-ho-tro-lam-sang-va-cai-thien-be-mat-da'],
      `<p><img src="${baBefore}" alt="" /></p><p><img src="${baAfter}" alt="" /></p>` + story()),
    demoCase(218, 'demo-ca-thieu-anh', '[DEMO] Ca chưa đủ ảnh – chỉ có ảnh trước',
      '[DEMO] Ca thiếu ảnh sau ⇒ KHÔNG hiện ở /clinical-proof; trang test đánh dấu "Thiếu ảnh".',
      ['nhom:Mụn', 'tuan:4'], `<p><img src="${baBefore}" alt="" /></p>` + story()),
    demoCase(219, 'demo-ca-khong-gan-nhom', '[DEMO] Ca không gắn tag nhom:',
      '[DEMO] Không có tag nhom: ⇒ vào nhóm "Kết quả khác".',
      ['tuoi:41', 'tuan:10'], `<p><img src="${baBefore}" alt="" /></p><p><img src="${baAfter}" alt="" /></p>` + story(), { author: '' }),
  );
}

// 2026-10-12: blog "video" (giao diện blog.video / article.video) — 14 video THẬT của kênh YouTube Pharma Cosmetics
// theo docs/Danh sách Link Iframe YouTube - Trang Blogs Bí Quyết (Pharma Cosmetics).md (mã video, tiêu đề, thời
// lượng lấy nguyên từ tài liệu). Ảnh đại diện để trống ⇒ theme tự lấy ảnh bìa YouTube (snippets/video_source.bwt).
// Mỗi bài trỏ về bài Bí Quyết liên quan trong nội dung. Ngày đăng chỉ là dữ liệu preview.
const videoDefs = [
  ['4B9RN_wcl_I', '3 sai lầm nghiêm trọng khi dùng dầu tẩy trang khiến da bị mụn', '01:23', 'Làm sạch da', 'double-cleansing-rua-mat-2-buoc-sach-sau',
    'Hướng dẫn nhũ hoá dầu tẩy trang đúng cách và chỉ ra những sai lầm khi dùng dầu tẩy trang gây bít tắc lỗ chân lông.'],
  ['lWOH7jyT97c', 'Hướng dẫn sử dụng toner đúng cách', '01:24', 'Làm sạch da', 'double-cleansing-rua-mat-2-buoc-sach-sau',
    'Cách dùng toner để cân bằng da sau bước làm sạch, chuẩn bị cho các bước dưỡng tiếp theo.'],
  ['nBlNtLT5n88', 'Cận cảnh kem dưỡng đêm GiGi New Age G4', '01:17', 'Dưỡng ẩm & phục hồi', 'duong-am-ban-dem-dung-cach',
    'Phân tích kết cấu kem dưỡng ẩm ban đêm chứa peptide tái tạo và cơ chế khoá ẩm trong lúc ngủ.'],
  ['SiYXKgJw__Q', 'Mặt nạ giảm stress cho da — Christina Unstress Optimal Hydration Mask', '01:20', 'Dưỡng ẩm & phục hồi', '5-bi-quyet-cham-da-mua-hanh-kho',
    'Cấp ẩm khẩn cấp cho làn da mất nước, đỏ rát, bong tróc trong mùa hanh khô.'],
  ['owJAHSiHkpI', 'Da mụn viêm nên dùng sữa rửa mặt nào?', '01:13', 'Làm sạch da', 'double-cleansing-rua-mat-2-buoc-sach-sau',
    'Gợi ý cách chọn sữa rửa mặt cho da mụn viêm — bước 2 của quy trình làm sạch kép.'],
  ['G3GtdkB7Src', 'Kem dưỡng phục hồi dành cho da đang điều trị mụn (treatment)', '01:14', 'Dưỡng ẩm & phục hồi', 'duong-am-ban-dem-dung-cach',
    'Chọn kem dưỡng phục hồi phù hợp cho làn da đang trong liệu trình điều trị mụn.'],
  ['dl1TfHMgSF0', 'Bôi serum liều lượng bao nhiêu là đủ?', '01:04', 'Serum & hoạt chất', 'tay-te-bao-chet-dung-tan-suat',
    'Lượng serum nên dùng cho mỗi lần thoa và thứ tự thoa trước bước khoá ẩm.'],
  ['bEZ_f-RkUoc', 'Nên đắp mặt nạ khi nào?', '01:22', 'Dưỡng ẩm & phục hồi', '5-bi-quyet-cham-da-mua-hanh-kho',
    'Thời điểm đắp mặt nạ cấp ẩm trong routine để da hấp thu tốt nhất.'],
  ['MbKvzlYKsDg', 'Couperose là gì? Cách chăm sóc da bị couperose', '02:06', 'Da nhạy cảm', '5-bi-quyet-cham-da-mua-hanh-kho',
    'Nhận biết tình trạng giãn mao mạch (couperose) và cách chăm sóc làn da nhạy cảm, khô.'],
  ['QkNOHb_aWPE', 'Cận cảnh cushion Renoderm Daylong BB Cream', '01:36', 'Chống nắng & trang điểm', 'chon-kem-nen-khong-gay-bi-da-mun',
    'Giới thiệu cushion/BB cream mỏng nhẹ, thông thoáng, không chứa thành phần gây bít tắc (non-comedogenic).'],
  ['-TdXxYfFqb0', 'Kem chống nắng Shadow SPF 30 Gel có nâng tone không?', '01:24', 'Chống nắng & trang điểm', 'chon-kem-nen-khong-gay-bi-da-mun',
    'Kem chống nắng dạng gel có hiệu ứng nâng tone — lựa chọn thay kem nền cho da dầu mụn.'],
  ['4YYquUKj4gk', 'Cách thoa lại kem chống nắng đúng cách cho da không trang điểm', '01:31', 'Chống nắng & trang điểm', 'chon-kem-nen-khong-gay-bi-da-mun',
    'Kỹ thuật thoa lại kem chống nắng giữa ngày cho da không trang điểm.'],
  ['GwHODtAvPBQ', 'Niacinamide — thành phần "must-have" trong mọi skincare routine', '01:07', 'Serum & hoạt chất', 'tay-te-bao-chet-dung-tan-suat',
    'Phục hồi màng ẩm, làm dịu và kiềm dầu sau các đợt peel/tẩy da chết BHA/AHA.'],
  ['lIdqImbX_h4', 'Serum Lacabine 2% Tranexamic Acid có tốt không?', '01:33', 'Serum & hoạt chất', 'tay-te-bao-chet-dung-tan-suat',
    'Cách kết hợp serum Tranexamic Acid 2% vào routine điều trị thâm sạm.'],
];
function videoHandle(title) {
  return title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
const videoArticles = videoDefs.map(([id, title, dur, topic, tipHandle, summary], i) => {
  const handle = videoHandle(title);
  const day = new Date(Date.UTC(2026, 9, 10 - i * 2, 1, 0, 0)).toISOString().slice(0, 19);
  const tip = beautyTipsArticles.find((a) => a.handle === tipHandle);
  return {
    id: 1001 + i,
    title,
    alias: handle,
    handle,
    url: `/blogs/video/${handle}`,
    summary,
    excerpt: summary,
    content: tip ? `<p>Video thuộc chủ đề ${topic.toLowerCase()} trên kênh YouTube Pharma Cosmetics.</p><p>Đọc bài viết chi tiết: <a href="${tip.url}">${tip.title}</a></p>` : '',
    image: null,
    featured_image: null,
    author: 'Pharma Cosmetics',
    published_on: day,
    created_at: day,
    tags: [`youtube:${id}`, `thoiluong:${dur}`, `chude:${topic}`],
    template_suffix: 'video',
    comments_count: 0,
    blog: { handle: 'video', title: 'Video Tư Vấn Skincare' },
  };
});

// 2026-10-12: gắn 3 video (chính + 2 bổ trợ) cho 5 bài Bí Quyết đúng danh sách mục 3 của tài liệu video ⇒ khối
// "Video hướng dẫn" (snippets/article_video_block.bwt) trong trang chi tiết bài.
const tipVideos = {
  221: ['4B9RN_wcl_I', 'owJAHSiHkpI', 'lWOH7jyT97c'],
  222: ['nBlNtLT5n88', 'G3GtdkB7Src', 'dl1TfHMgSF0'],
  223: ['SiYXKgJw__Q', 'bEZ_f-RkUoc', 'MbKvzlYKsDg'],
  224: ['QkNOHb_aWPE', '-TdXxYfFqb0', '4YYquUKj4gk'],
  225: ['GwHODtAvPBQ', 'lIdqImbX_h4', 'dl1TfHMgSF0'],
};
beautyTipsArticles.forEach((a) => {
  (tipVideos[a.id] || []).forEach((id) => a.tags.push(`youtube:${id}`));
});

// 2026-10-14: dữ liệu test video Facebook — 427805549152968 là video công khai thật của Fanpage Pharma Cosmetics
// (đã phát thử trong khung: nội dung kem chống nắng Daily Matte Moisturizer SPF 30+ nhà Image). Mỗi bài 1 kiểu nhập để kiểm tra snippets/video_parse.bwt:
//   1201 tag link /watch/?v=   ·   1202 metafield custom.video_url = nguyên mã iframe nút "Nhúng"
//   bài Bí Quyết 222: video chính = tag facebook:fb_video_<số> (đúng kiểu tag gây lỗi trên Sapo), YouTube thành bổ trợ.
const FB_TEST_VIDEO = '427805549152968';
const fbVideoArticle = (id, title, day, extra) => ({
  id, title, alias: videoHandle(title), handle: videoHandle(title), url: `/blogs/video/${videoHandle(title)}`,
  summary: 'Video trên Fanpage Pharma Cosmetics × Skin Health Beauty: điểm mới của kem chống nắng Daily Matte Moisturizer SPF 30+ nhà Image.',
  excerpt: 'Video trên Fanpage Pharma Cosmetics × Skin Health Beauty: điểm mới của kem chống nắng Daily Matte Moisturizer SPF 30+ nhà Image.',
  content: '', image: null, featured_image: null, author: 'Pharma Cosmetics',
  published_on: day, created_at: day, tags: ['chude:Chống nắng & trang điểm'], template_suffix: 'video', comments_count: 0,
  blog: { handle: 'video', title: 'Video Tư Vấn Skincare' },
  ...extra,
});
videoArticles.unshift(
  fbVideoArticle(1201, 'Kem chống nắng Daily Matte Moisturizer SPF 30+ bản mới nhà Image có gì nổi bật', '2026-10-12T02:00:00', {
    // video này quay dọc 720×1280 ⇒ tag khung:doc (khung 9:16); bài 1202 giữ 16:9 để kiểm tra Facebook thu video vừa khung.
    tags: [`facebook:https://www.facebook.com/watch/?v=${FB_TEST_VIDEO}`, 'khung:doc', 'chude:Chống nắng & trang điểm'],
  }),
  fbVideoArticle(1202, 'Daily Matte Moisturizer SPF 30+ — bản nhúng iframe Facebook', '2026-10-11T02:00:00', {
    metafields: { custom: { video_url: `<iframe src="https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D${FB_TEST_VIDEO}&show_text=false&width=560&t=0" width="560" height="314" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true"></iframe>` } },
  }),
);
const fbTipArticle = beautyTipsArticles.find((a) => a.id === 222);
if (fbTipArticle) fbTipArticle.tags.splice(fbTipArticle.tags.findIndex((t) => t.startsWith('youtube:')), 0, `facebook:fb_video_${FB_TEST_VIDEO}`);

// T-109 (2026-09-11): BUG THẬT phát hiện khi chuẩn bị demo data — templates/blog.bwt dùng
// {{blog.name}} (không phải .title) và {% if blog.articles_count > 0 %} (không phải
// .articles.size) để quyết định render tiêu đề trang + toàn bộ lưới bài viết. Object blogs{}
// trước đây KHÔNG có 2 field này -> tiêu đề trang trống rỗng VÀ lưới bài viết KHÔNG BAO GIỜ
// hiện (bất kể có bao nhiêu bài) — 1 empty-state ẩn tồn tại từ trước, không liên quan số lượng
// demo data. Thêm name (alias title) + description + articles_count (tính theo articles.length)
// để khớp đúng field name mà Sapo Liquid thật cung cấp (blog.name/blog.articles_count).
// ── Dữ liệu trang liệu trình (2026-10-17) — snippets/lieu_trinh_*, docs/huong-dan-tao-lieu-trinh.md ─────────────
// Sản phẩm liệu trình gắn tag vande:<handle> / hoatchat:<handle>; FAQ gắn tag sanpham:<alias sản phẩm>. Chữ = hồ sơ bàn giao IT.
const LT_GG = 'elaine-brennan-getglowing-micro-peel-lieu-trinh-peel-chuyen-nghiep-ho-tro-lam-sang-va-cai-thien-be-mat-da';
const ltArticle = (blog, id, handle, title, summary, extra) => Object.assign({
  id, title, alias: handle, handle, url: `/blogs/${blog.handle}/${handle}`, summary, excerpt: summary,
  content: `<p>${summary}</p>`, image: null, featured_image: null, author: 'Skin Health Beauty',
  published_on: '2026-10-17T08:00:00', created_at: '2026-10-17T08:00:00', tags: [], comments_count: 0, blog,
}, extra || {});
const LT_CONCERN_BLOG = { handle: 'van-de-da', title: 'Vấn đề da' };
const concernArticles = [
  ['mun-va-bit-tac', 'Mụn và bít tắc', 'Hỗ trợ giảm tích tụ tế bào sừng và tình trạng bít tắc nang lông.'],
  ['tham-sau-mun', 'Thâm sau mụn', 'Hỗ trợ cải thiện sắc tố tồn dư sau viêm, giúp màu da trông đồng đều hơn.'],
  ['sac-to-khong-dong-deu', 'Sắc tố không đồng đều', 'Hỗ trợ cải thiện các vùng tăng sắc tố nông và vẻ ngoài xỉn màu.'],
  ['be-mat-san-rap', 'Bề mặt sần ráp', 'Hỗ trợ loại bỏ tế bào sừng tích tụ, cải thiện độ mịn của bề mặt.'],
  ['dau-hieu-lao-hoa-som', 'Dấu hiệu lão hóa sớm', 'Hỗ trợ cải thiện vẻ ngoài của nếp nhăn nông, kết cấu da và độ tươi sáng.'],
].map(([h, t, d], i) => ltArticle(LT_CONCERN_BLOG, 700 + i, h, t, d));
const LT_ING_BLOG = { handle: 'hoat-chat', title: 'Thư viện hoạt chất' };
const peelActiveArticles = [
  ['resorcinol', 'Resorcinol', 'Hỗ trợ bong sừng, cải thiện tình trạng thô ráp và bề mặt da không đồng đều.', 'TÁI TẠO BỀ MẶT', 'Tiêu sừng'],
  ['salicylic-acid', 'Salicylic Acid', 'Hoạt chất BHA có tính ưa lipid, hỗ trợ làm thông thoáng nang lông và cải thiện mụn không viêm.', 'KIỂM SOÁT BÍT TẮC', 'BHA'],
  ['kojic-acid', 'Kojic Acid', 'Hỗ trợ ức chế tyrosinase, góp phần cải thiện thâm và sắc tố không đồng đều.', 'HỖ TRỢ ĐIỀU HÒA SẮC TỐ', 'Làm sáng'],
].map(([h, t, d, role, nhom], i) => ltArticle(LT_ING_BLOG, 710 + i, h, t, d, { tags: [`nhom:${nhom}`, `vaitro:${role}`] }));
const LT_FAQ_BLOG = { handle: 'cau-hoi-lieu-trinh', title: 'Câu hỏi liệu trình' };
const treatmentFaqArticles = [
  ['getglowing-co-gay-bong-da-khong', 'GetGlowing Micro-Peel có gây bong da không?', 'Có thể xuất hiện bong da trong những ngày sau trị liệu. Mức độ bong phụ thuộc vào nền da và đáp ứng của từng khách hàng.'],
  ['getglowing-can-bao-nhieu-buoi', 'Liệu trình cần bao nhiêu buổi?', 'Số buổi phụ thuộc tình trạng da và mục tiêu cải thiện. Hãng có gợi ý liệu trình tham khảo sáu buổi, cách nhau 2–6 tuần; lịch thực tế cần được cá nhân hóa.'],
  ['getglowing-da-nhay-cam', 'Da nhạy cảm có thực hiện được không?', 'Cần đánh giá riêng. Da đang kích ứng, tổn thương hoặc hàng rào bảo vệ suy yếu có thể cần trì hoãn peel.'],
  ['getglowing-cham-soc-sau-peel', 'Sau peel cần chăm sóc như thế nào?', 'Ưu tiên làm sạch dịu nhẹ, dưỡng phục hồi, chống nắng và tránh tự bóc lớp da đang bong. Chỉ sử dụng lại các hoạt chất treatment khi da đã phục hồi và được hướng dẫn phù hợp.'],
].map(([h, q, a], i) => ltArticle(LT_FAQ_BLOG, 720 + i, h, q, a, { tags: [i % 2 ? `sanpham:${LT_GG}` : 'sanpham:elaine-brennan-getglowing-micro-peel'] }));
// 2026-10-18: mock KHÔNG có article.handle (Sapo không có) — xen kẽ tag sanpham: nguyên alias / rút gọn như bài thật trên Sapo.

function withBlogMeta(blog) {
  return { ...blog, name: blog.title, description: blog.description || '', articles_count: blog.articles.length };
}

const blogs = {
  'tin-tuc-va-kien-thuc': withBlogMeta({
    id:      301,
    title:   'Tin tức & Kiến thức',
    description: 'Kiến thức da liễu, thành phần hoạt chất và hướng dẫn chăm sóc da chuẩn y khoa từ đội ngũ chuyên gia Pharma Cosmetics.',
    handle:  'tin-tuc-va-kien-thuc',
    url:     '/blogs/tin-tuc-va-kien-thuc',
    articles: articles.filter(a => a.blog.handle === 'tin-tuc-va-kien-thuc'),
  }),
  'truoc-va-sau-1': withBlogMeta({
    id:      302,
    // 2026-10-17: giao diện blog.truoc-va-sau CHỈ có ở dev-preview/templates/ (trang test local, không đóng gói).
    template_suffix: 'truoc-va-sau',
    title:   'Trước & Sau Điều Trị',
    description: 'Case study thực tế ghi nhận tiến trình điều trị theo từng tuần, đánh giá bởi đội ngũ chuyên gia phụ trách.',
    handle:  'truoc-va-sau-1',
    url:     '/blogs/truoc-va-sau-1',
    articles: beforeAfterArticles,
  }),
  'bi-quyet': withBlogMeta({
    id:      303,
    title:   'Bí Quyết Làm Đẹp',
    description: 'Mẹo và bí quyết chăm sóc da hàng ngày, dễ áp dụng, được kiểm chứng bởi đội ngũ chuyên gia Pharma Cosmetics.',
    handle:  'bi-quyet',
    url:     '/blogs/bi-quyet',
    articles: beautyTipsArticles,
  }),
  'chuyen-gia': withBlogMeta({
    id:      304,
    title:   'Đội ngũ chuyên gia',
    handle:  'chuyen-gia',
    url:     '/blogs/chuyen-gia',
    articles: expertArticles,
  }),
  'hoat-chat': withBlogMeta({
    id:      305,
    title:   'Thư viện hoạt chất',
    handle:  'hoat-chat',
    url:     '/blogs/hoat-chat',
    articles: [...ingredientArticles, ...peelActiveArticles],
  }),
  'danh-gia-khach-hang': withBlogMeta({
    id:      306,
    title:   'Đánh giá khách hàng',
    handle:  'danh-gia-khach-hang',
    url:     '/blogs/danh-gia-khach-hang',
    articles: testimonialArticles,
  }),
  'cau-hoi-san-pham': withBlogMeta({
    id:      307,
    title:   'Câu hỏi thường gặp',
    handle:  'cau-hoi-san-pham',
    url:     '/blogs/cau-hoi-san-pham',
    articles: productFaqArticles,
  }),
  'cau-hoi-dat-lich': withBlogMeta({
    id:      308,
    title:   'Câu hỏi đặt lịch',
    handle:  'cau-hoi-dat-lich',
    url:     '/blogs/cau-hoi-dat-lich',
    articles: bookingFaqArticles,
  }),
  'cau-hoi-tai-khoan': withBlogMeta({
    id:      309,
    title:   'Câu hỏi tài khoản',
    handle:  'cau-hoi-tai-khoan',
    url:     '/blogs/cau-hoi-tai-khoan',
    articles: accountFaqArticles,
  }),
  'y-kien-chuyen-gia': withBlogMeta({
    id:      310,
    title:   'Ý kiến chuyên gia',
    handle:  'y-kien-chuyen-gia',
    url:     '/blogs/y-kien-chuyen-gia',
    articles: expertOpinionArticles,
  }),
  video: withBlogMeta({
    id:      312,
    title:   'Video Tư Vấn Skincare',
    handle:  'video',
    url:     '/blogs/video',
    template_suffix: 'video',
    articles: videoArticles,
  }),
  'van-de-da': withBlogMeta({ id: 313, title: 'Vấn đề da', handle: 'van-de-da', url: '/blogs/van-de-da', articles: concernArticles }),
  'cau-hoi-lieu-trinh': withBlogMeta({ id: 314, title: 'Câu hỏi liệu trình', handle: 'cau-hoi-lieu-trinh', url: '/blogs/cau-hoi-lieu-trinh', articles: treatmentFaqArticles }),
  'giai-phap-skin-health': withBlogMeta({
    id:      311,
    title:   'Giải pháp Skin Health',
    handle:  'giai-phap-skin-health',
    url:     '/blogs/giai-phap-skin-health',
    articles: solutionArticles,
  }),
};

// 2026-10-13: tag noibat (biên tập chọn) cho cột "Tin nổi bật" ở trang tổng /tin-tuc (templates/page.tin-tuc.bwt).
// 2026-10-13: nhãn chủ đề (tag chude:) cho bài demo — thiếu thì thẻ bài lấy tag handle không dấu ("bi quyet").
const demoTopics = { 204: 'Điều trị nám', 205: 'Chống nắng', 206: 'Thành phần', 221: 'Làm sạch da', 222: 'Dưỡng ẩm & phục hồi', 223: 'Dưỡng ẩm & phục hồi', 224: 'Chống nắng & trang điểm', 225: 'Tẩy da chết' };
[...articles, ...beautyTipsArticles].forEach((a) => {
  if (demoTopics[a.id] && !a.tags.some((t) => t.startsWith('chude:'))) a.tags.push(`chude:${demoTopics[a.id]}`);
});
[204, 206, 223, 225].forEach((id) => {
  const a = [...articles, ...beautyTipsArticles].find((x) => x.id === id);
  if (a) a.tags.push('noibat');
});

// Article đơn lẻ (dùng cho template article.bwt)
const currentArticle = articles[0];

module.exports = { articles, blogs, currentArticle };
