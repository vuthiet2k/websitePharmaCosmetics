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
    url:           '/blogs/tin-tuc/retinol-thanh-phan-vang-chong-lao-hoa',
    excerpt:       'Retinol là dẫn xuất Vitamin A được khoa học chứng minh hiệu quả nhất trong việc làm mờ nếp nhăn, tăng collagen và đều màu da — nhưng cần dùng đúng cách.',
    content:       '<p>Retinol đã được nghiên cứu hơn 40 năm và là một trong số ít thành phần skincare được FDA công nhận có hiệu quả điều trị lão hoá da...</p>',
    image:         { src: img('d4a373/ffffff', 'Retinol Guide'), alt: 'Hướng dẫn dùng Retinol' },
    featured_image:{ src: img('d4a373/ffffff', 'Retinol Guide'), alt: 'Hướng dẫn dùng Retinol' },
    author:        'Chuyên gia Thanh Hằng',
    published_on:  '2026-04-10T08:00:00',
    created_at:    '2026-04-08T14:30:00',
    tags:          ['retinol', 'chong-lao-hoa', 'skincare-101'],
    comments_count: 14,
    blog: { handle: 'tin-tuc', title: 'Tin tức & Kiến thức' },
  },

  {
    id:            202,
    title:         'Vitamin C trong skincare: Phân biệt các dạng & chọn nồng độ phù hợp',
    alias:         'vitamin-c-skincare-phan-biet-cac-dang',
    handle:        'vitamin-c-skincare-phan-biet-cac-dang',
    url:           '/blogs/tin-tuc/vitamin-c-skincare-phan-biet-cac-dang',
    excerpt:       'L-Ascorbic Acid, Ascorbyl Glucoside, Sodium Ascorbyl Phosphate... Mỗi dạng có ưu điểm và cách dùng khác nhau. Bài viết giúp bạn chọn đúng.',
    content:       '<p>Vitamin C là antioxidant mạnh, làm sáng da, kích thích collagen và bảo vệ da khỏi tổn thương UV...</p>',
    image:         { src: img('f4a261/ffffff', 'Vitamin C Guide'), alt: 'Vitamin C trong skincare' },
    featured_image:{ src: img('f4a261/ffffff', 'Vitamin C Guide'), alt: 'Vitamin C trong skincare' },
    author:        'Chuyên gia Trần Thu Hương',
    published_on:  '2026-04-05T09:00:00',
    created_at:    '2026-04-03T11:00:00',
    tags:          ['vitamin-c', 'lam-sang', 'skincare-101'],
    comments_count: 9,
    blog: { handle: 'tin-tuc', title: 'Tin tức & Kiến thức' },
  },

  {
    id:            203,
    title:         '5 bước xây dựng routine skincare buổi sáng chuẩn chuyên gia',
    alias:         '5-buoc-routine-skincare-buoi-sang',
    handle:        '5-buoc-routine-skincare-buoi-sang',
    url:           '/blogs/tin-tuc/5-buoc-routine-skincare-buoi-sang',
    excerpt:       'Rửa mặt → Toner → Serum → Dưỡng ẩm → Chống nắng. Đơn giản nhưng mỗi bước đều có lý do khoa học. Cùng xem thứ tự đúng và sản phẩm nên dùng.',
    content:       '<p>Một routine skincare buổi sáng tốt không cần nhiều bước, nhưng cần đúng thứ tự và sản phẩm phù hợp với loại da của bạn...</p>',
    image:         { src: img('95d5b2/333333', 'AM Routine'), alt: '5 bước skincare buổi sáng' },
    featured_image:{ src: img('95d5b2/333333', 'AM Routine'), alt: '5 bước skincare buổi sáng' },
    author:        'Chuyên gia Thanh Hằng',
    published_on:  '2026-03-28T08:30:00',
    created_at:    '2026-03-26T10:00:00',
    tags:          ['routine', 'skincare-101', 'ban-chay'],
    comments_count: 22,
    blog: { handle: 'tin-tuc', title: 'Tin tức & Kiến thức' },
  },

  {
    id:            204,
    title:         'Nám da: Nguyên nhân, phân loại và phác đồ điều trị hiệu quả nhất 2026',
    alias:         'nam-da-nguyen-nhan-phac-do-dieu-tri',
    handle:        'nam-da-nguyen-nhan-phac-do-dieu-tri',
    url:           '/blogs/tin-tuc/nam-da-nguyen-nhan-phac-do-dieu-tri',
    excerpt:       'Nám là nỗi lo của hàng triệu phụ nữ Việt. Hiểu rõ nám nông, nám sâu và nám hỗn hợp giúp bạn chọn đúng phác đồ — tránh tiêu tiền vô ích.',
    content:       '<p>Nám da (melasma) là tình trạng tăng sắc tố mãn tính do nhiều yếu tố kết hợp: UV, hormon, viêm nhiễm...</p>',
    image:         { src: img('fff3e0/6d4c41', 'Nam Da Guide'), alt: 'Điều trị nám da' },
    featured_image:{ src: img('fff3e0/6d4c41', 'Nam Da Guide'), alt: 'Điều trị nám da' },
    author:        'Chuyên gia Lê Thị Lan',
    published_on:  '2026-03-15T09:00:00',
    created_at:    '2026-03-12T14:00:00',
    tags:          ['tri-nam', 'chuyen-nghiep', 'bac-si-tu-van'],
    comments_count: 31,
    blog: { handle: 'tin-tuc', title: 'Tin tức & Kiến thức' },
  },

  {
    id:            205,
    title:         'SPF, PA, UVA/UVB — Giải mã ký hiệu kem chống nắng để chọn đúng sản phẩm',
    alias:         'giai-ma-ky-hieu-kem-chong-nang-spf-pa',
    handle:        'giai-ma-ky-hieu-kem-chong-nang-spf-pa',
    url:           '/blogs/tin-tuc/giai-ma-ky-hieu-kem-chong-nang-spf-pa',
    excerpt:       'SPF50+ PA++++ nghĩa là gì? Tại sao cần bôi lại sau 2 tiếng? Bài viết giải thích đầy đủ để bạn không mua nhầm kem chống nắng nữa.',
    content:       '<p>Kem chống nắng là bước không thể bỏ qua trong bất kỳ routine skincare nào. SPF đo khả năng chống UVB, còn PA+++ đo UVA...</p>',
    image:         { src: img('90e0ef/333333', 'SPF Guide'), alt: 'Hướng dẫn kem chống nắng' },
    featured_image:{ src: img('90e0ef/333333', 'SPF Guide'), alt: 'Hướng dẫn kem chống nắng' },
    author:        'Chuyên gia Thanh Hằng',
    published_on:  '2026-03-05T08:00:00',
    created_at:    '2026-03-03T10:30:00',
    tags:          ['chong-nang', 'spf', 'skincare-101'],
    comments_count: 18,
    blog: { handle: 'tin-tuc', title: 'Tin tức & Kiến thức' },
  },

  {
    id:            206,
    title:         'Niacinamide và Zinc: Bộ đôi kiểm soát dầu nhờn, thu nhỏ lỗ chân lông',
    alias:         'niacinamide-zinc-kiem-soat-dau-nhon',
    handle:        'niacinamide-zinc-kiem-soat-dau-nhon',
    url:           '/blogs/tin-tuc/niacinamide-zinc-kiem-soat-dau-nhon',
    excerpt:       'Da dầu, lỗ chân lông to là nỗi ám ảnh của nhiều người. Niacinamide nồng độ 5-10% kết hợp Zinc PCA giúp điều tiết bã nhờn hiệu quả mà không gây khô căng.',
    content:       '<p>Niacinamide (Vitamin B3) là hoạt chất đa năng: vừa điều tiết dầu, vừa củng cố hàng rào bảo vệ da và làm đều màu da...</p>',
    image:         { src: img('2a9d8f/ffffff', 'Niacinamide Guide'), alt: 'Niacinamide và Zinc kiểm soát dầu' },
    featured_image:{ src: img('2a9d8f/ffffff', 'Niacinamide Guide'), alt: 'Niacinamide và Zinc kiểm soát dầu' },
    author:        'Chuyên gia Trần Thu Hương',
    published_on:  '2026-02-20T08:00:00',
    created_at:    '2026-02-18T09:30:00',
    tags:          ['niacinamide', 'da-dau', 'skincare-101'],
    comments_count: 11,
    blog: { handle: 'tin-tuc', title: 'Tin tức & Kiến thức' },
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
    content:       '<p>Double cleansing (làm sạch kép) là bước đầu tiên và quan trọng nhất trong mọi routine skincare hiệu quả...</p>',
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
    url: '/blogs/truoc-va-sau/hanh-trinh-8-tuan-cai-thien-da-mun-viem',
    excerpt: 'Case study thực tế: khách hàng nữ 24 tuổi, da mụn viêm mức độ trung bình, cải thiện 80% sau 8 tuần theo phác đồ kết hợp BHA + Niacinamide.',
    content: '<p>Ghi nhận tiến trình điều trị mụn viêm theo từng tuần, kèm đánh giá của chuyên gia da liễu phụ trách...</p>',
    image: { src: img('e9c46a/333333', 'Case 01'), alt: 'Case study điều trị mụn viêm' },
    featured_image: { src: img('e9c46a/333333', 'Case 01'), alt: 'Case study điều trị mụn viêm' },
    author: 'Chuyên gia Thanh Hằng', published_on: '2026-04-01T08:00:00', created_at: '2026-03-30T10:00:00',
    tags: ['case-study', 'tri-mun'], comments_count: 7,
    blog: { handle: 'truoc-va-sau', title: 'Trước & Sau Điều Trị' },
  },
  {
    id: 212, title: 'Case study: Mờ nám mảng sau 12 tuần điều trị chuẩn y khoa',
    alias: 'case-study-mo-nam-mang-12-tuan',
    handle: 'case-study-mo-nam-mang-12-tuan',
    url: '/blogs/truoc-va-sau/case-study-mo-nam-mang-12-tuan',
    excerpt: 'Khách hàng nữ 38 tuổi, nám mảng lâu năm, áp dụng phác đồ Tranexamic Acid + chống nắng nghiêm ngặt, ghi nhận cải thiện rõ sau 3 tháng.',
    content: '<p>Nám mảng là dạng khó điều trị nhất trong các loại tăng sắc tố. Case study này ghi lại lộ trình theo dõi định kỳ mỗi 2 tuần...</p>',
    image: { src: img('f4a261/333333', 'Case 02'), alt: 'Case study điều trị nám' },
    featured_image: { src: img('f4a261/333333', 'Case 02'), alt: 'Case study điều trị nám' },
    author: 'Chuyên gia Lê Thị Lan', published_on: '2026-03-20T08:00:00', created_at: '2026-03-18T10:00:00',
    tags: ['case-study', 'tri-nam'], comments_count: 15,
    blog: { handle: 'truoc-va-sau', title: 'Trước & Sau Điều Trị' },
  },
  {
    id: 213, title: 'Phục hồi hàng rào bảo vệ da sau 6 tuần cho da nhạy cảm',
    alias: 'phuc-hoi-hang-rao-bao-ve-da-6-tuan',
    handle: 'phuc-hoi-hang-rao-bao-ve-da-6-tuan',
    url: '/blogs/truoc-va-sau/phuc-hoi-hang-rao-bao-ve-da-6-tuan',
    excerpt: 'Da nhạy cảm, dễ đỏ rát do dùng mỹ phẩm sai cách nhiều năm — lộ trình phục hồi bằng Ceramide và Centella Asiatica trong 6 tuần.',
    content: '<p>Hàng rào bảo vệ da tổn thương cần thời gian và sự kiên nhẫn để phục hồi. Case study ghi lại từng mốc đánh giá...</p>',
    image: { src: img('95d5b2/333333', 'Case 03'), alt: 'Case study phục hồi da nhạy cảm' },
    featured_image: { src: img('95d5b2/333333', 'Case 03'), alt: 'Case study phục hồi da nhạy cảm' },
    author: 'Chuyên gia Thanh Hằng', published_on: '2026-03-10T08:00:00', created_at: '2026-03-08T10:00:00',
    tags: ['case-study', 'phuc-hoi-da'], comments_count: 9,
    blog: { handle: 'truoc-va-sau', title: 'Trước & Sau Điều Trị' },
  },
  {
    id: 214, title: 'Cải thiện lỗ chân lông to và bề mặt da sau liệu trình 10 tuần',
    alias: 'cai-thien-lo-chan-long-to-10-tuan',
    handle: 'cai-thien-lo-chan-long-to-10-tuan',
    url: '/blogs/truoc-va-sau/cai-thien-lo-chan-long-to-10-tuan',
    excerpt: 'Kết hợp AHA/BHA nồng độ tăng dần với Retinol liều thấp giúp cải thiện kết cấu da và lỗ chân lông rõ rệt sau 10 tuần theo dõi.',
    content: '<p>Lỗ chân lông to thường liên quan đến tăng tiết bã nhờn và mất đàn hồi collagen quanh nang lông...</p>',
    image: { src: img('90e0ef/333333', 'Case 04'), alt: 'Case study cải thiện lỗ chân lông' },
    featured_image: { src: img('90e0ef/333333', 'Case 04'), alt: 'Case study cải thiện lỗ chân lông' },
    author: 'Chuyên gia Trần Thu Hương', published_on: '2026-02-25T08:00:00', created_at: '2026-02-23T10:00:00',
    tags: ['case-study', 'lo-chan-long'], comments_count: 6,
    blog: { handle: 'truoc-va-sau', title: 'Trước & Sau Điều Trị' },
  },
  {
    id: 215, title: 'Giảm thâm sau mụn rõ rệt chỉ sau 5 tuần dùng đúng hoạt chất',
    alias: 'giam-tham-sau-mun-5-tuan',
    handle: 'giam-tham-sau-mun-5-tuan',
    url: '/blogs/truoc-va-sau/giam-tham-sau-mun-5-tuan',
    excerpt: 'Thâm sau mụn (PIH) đáp ứng tốt với Alpha Arbutin và Tranexamic Acid nồng độ phù hợp — case study khách hàng 27 tuổi.',
    content: '<p>Thâm sau mụn khác với nám ở cơ chế hình thành, nên cần phác đồ và thời gian điều trị khác nhau...</p>',
    image: { src: img('d4a373/333333', 'Case 05'), alt: 'Case study giảm thâm sau mụn' },
    featured_image: { src: img('d4a373/333333', 'Case 05'), alt: 'Case study giảm thâm sau mụn' },
    author: 'Chuyên gia Thanh Hằng', published_on: '2026-02-14T08:00:00', created_at: '2026-02-12T10:00:00',
    tags: ['case-study', 'tham-mun'], comments_count: 13,
    blog: { handle: 'truoc-va-sau', title: 'Trước & Sau Điều Trị' },
  },
  {
    id: 216, title: 'Da sáng khoẻ, đều màu hơn sau 3 tháng chăm sóc kiên trì',
    alias: 'da-sang-khoe-deu-mau-3-thang',
    handle: 'da-sang-khoe-deu-mau-3-thang',
    url: '/blogs/truoc-va-sau/da-sang-khoe-deu-mau-3-thang',
    excerpt: 'Không phải mọi cải thiện đều cần thủ thuật xâm lấn — case study da xỉn màu, không đều được cải thiện chỉ bằng routine dưỡng da đúng cách.',
    content: '<p>Đôi khi vấn đề lớn nhất của làn da chỉ là routine chưa đúng thứ tự và thiếu kiên trì...</p>',
    image: { src: img('e5989b/333333', 'Case 06'), alt: 'Case study da sáng đều màu' },
    featured_image: { src: img('e5989b/333333', 'Case 06'), alt: 'Case study da sáng đều màu' },
    author: 'Chuyên gia Lê Thị Lan', published_on: '2026-01-30T08:00:00', created_at: '2026-01-28T10:00:00',
    tags: ['case-study', 'duong-da'], comments_count: 5,
    blog: { handle: 'truoc-va-sau', title: 'Trước & Sau Điều Trị' },
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
    215: ['nhom:Thâm, nám, tăng sắc tố', 'tuoi:27', 'tuan:5', 'phacdo:Alpha Arbutin + Tranexamic Acid'],
    212: ['nhom:Thâm, nám, tăng sắc tố', 'tuoi:38', 'tuan:12', 'phacdo:Tranexamic Acid + chống nắng'],
    213: ['nhom:Đỏ da, nhạy cảm', 'tuan:6', 'phacdo:Ceramide + Centella Asiatica'],
    216: ['nhom:Lão hóa, tiền mãn kinh', 'tuan:12'],
  };
  beforeAfterArticles.forEach((a) => {
    if (baTags[a.id]) a.tags.push(`anhtruoc:${baBefore}`, `anhsau:${baAfter}`, ...baTags[a.id]);
  });
}

// T-109 (2026-09-11): BUG THẬT phát hiện khi chuẩn bị demo data — templates/blog.bwt dùng
// {{blog.name}} (không phải .title) và {% if blog.articles_count > 0 %} (không phải
// .articles.size) để quyết định render tiêu đề trang + toàn bộ lưới bài viết. Object blogs{}
// trước đây KHÔNG có 2 field này -> tiêu đề trang trống rỗng VÀ lưới bài viết KHÔNG BAO GIỜ
// hiện (bất kể có bao nhiêu bài) — 1 empty-state ẩn tồn tại từ trước, không liên quan số lượng
// demo data. Thêm name (alias title) + description + articles_count (tính theo articles.length)
// để khớp đúng field name mà Sapo Liquid thật cung cấp (blog.name/blog.articles_count).
function withBlogMeta(blog) {
  return { ...blog, name: blog.title, description: blog.description || '', articles_count: blog.articles.length };
}

const blogs = {
  'tin-tuc': withBlogMeta({
    id:      301,
    title:   'Tin tức & Kiến thức',
    description: 'Kiến thức da liễu, thành phần hoạt chất và hướng dẫn chăm sóc da chuẩn y khoa từ đội ngũ chuyên gia Pharma Cosmetics.',
    handle:  'tin-tuc',
    url:     '/blogs/tin-tuc',
    articles: articles.filter(a => a.blog.handle === 'tin-tuc'),
  }),
  'truoc-va-sau': withBlogMeta({
    id:      302,
    title:   'Trước & Sau Điều Trị',
    description: 'Case study thực tế ghi nhận tiến trình điều trị theo từng tuần, đánh giá bởi đội ngũ chuyên gia phụ trách.',
    handle:  'truoc-va-sau',
    url:     '/blogs/truoc-va-sau',
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
    articles: ingredientArticles,
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
  'giai-phap-skin-health': withBlogMeta({
    id:      311,
    title:   'Giải pháp Skin Health',
    handle:  'giai-phap-skin-health',
    url:     '/blogs/giai-phap-skin-health',
    articles: solutionArticles,
  }),
};

// Article đơn lẻ (dùng cho template article.bwt)
const currentArticle = articles[0];

module.exports = { articles, blogs, currentArticle };
