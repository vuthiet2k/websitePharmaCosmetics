/**
 * data/pages.js — Trang nội dung THẬT (giả lập Sapo `pages[handle]`)
 *
 * Nguồn: https://pharmacosmetics-vn.com/ — 39 URL trong sitemap_pages_1.xml (trừ trang nội bộ MOPS admin, tra cứu đơn, so sánh SP).
 * Tiêu đề = H1 trang; `content` = khối nội dung Sapo (.rte) với trang chính sách/bài giới thiệu. Trang dựng hoàn toàn bằng template
 * của theme (page.*.bwt: Giới thiệu, Skin Health Beauty, Chuyên gia, Loyalty…) KHÔNG có nội dung Sapo ⇒ content rỗng (đúng như live).
 * Dữ liệu thô: data/pages-data.json. Ngày lấy: 2026-11-17.
 */
const pages = require('./pages-data.json');

module.exports = { pages };
