/**
 * data/articles.js — Blog & bài viết THẬT (giả lập Sapo `blogs[handle]`, `articles`)
 *
 * Nguồn: https://pharmacosmetics-vn.com/ — 18 blog trong sitemap_blogs_1.xml + 94 bài (đọc từng trang bài: JSON-LD Article, og:*,
 * khối `.rte.article-content-main`, thẻ `pc-art-tag`, và với bài Video: data-pc-video / thời lượng). Ngày lấy: 2026-11-17.
 * Dữ liệu thô nằm ở data/articles-data.json (script cào để ngoài repo). Blog KHÔNG có bài trên live (Tin tức & Kiến thức, Đội ngũ
 * chuyên gia, Đánh giá khách hàng, Câu hỏi sản phẩm/đặt lịch/tài khoản, Ý kiến chuyên gia, Giải pháp Skin Health, …) giữ NGUYÊN rỗng:
 * không bịa bài, không bịa đánh giá/ca trước-sau.
 *
 * Ghi chú: Sapo không lộ id bài viết ra HTML ⇒ `id` ở đây chỉ là số thứ tự nội bộ của preview. URL dùng dạng /blogs/<blog>/<alias>
 * (dev-server định tuyến cả /<alias> như live).
 */
const data = require('./articles-data.json');

const blogTitle = {};
data.blogs.forEach((b) => { blogTitle[b.handle] = b.title; });

const toImage = (src, alt) => (src ? { src, alt } : null);

const articles = data.articles.map((a, i) => ({
  id:             1000 + i,
  title:          a.title,
  alias:          a.alias,
  handle:         a.alias,
  url:            `/blogs/${a.blog}/${a.alias}`,
  summary:        a.summary,
  excerpt:        a.summary,
  content:        a.content,
  image:          toImage(a.image, a.title),
  featured_image: toImage(a.image, a.title),
  author:         a.author,
  published_on:   a.published,
  created_at:     a.published,
  modified_at:    a.modified || a.published,
  tags:           a.tags,
  comments_count: 0,
  blog:           { handle: a.blog, title: blogTitle[a.blog] || a.blog },
}));

function withBlogMeta(blog) {
  return { ...blog, name: blog.title, description: blog.description || '', articles_count: blog.articles.length };
}

// Blog object theo handle (Sapo: blogs[handle].articles / .name / .articles_count).
const blogs = {};
data.blogs.forEach((b, i) => {
  blogs[b.handle] = withBlogMeta({
    id:       300 + i,
    title:    b.title,
    handle:   b.handle,
    url:      `/blogs/${b.handle}`,
    description: b.description,
    // giao diện riêng blog Video / Trước & Sau (templates/blog.video.bwt, blog.truoc-va-sau.bwt) theo handle thật
    ...(b.handle === 'video' ? { template_suffix: 'video' } : {}),
    articles: articles.filter((a) => a.blog.handle === b.handle),
  });
});
// Sapo có blog tổng hợp `all` (liên kết /blogs/all/tagged/…) — gộp mọi bài, mới nhất trước.
blogs.all = withBlogMeta({ id: 299, title: 'Tất cả bài viết', handle: 'all', url: '/blogs/all', articles });

// Article đơn lẻ mặc định (template article.bwt khi không có alias trên URL)
const currentArticle = articles[0] || null;

module.exports = { articles, blogs, currentArticle };
