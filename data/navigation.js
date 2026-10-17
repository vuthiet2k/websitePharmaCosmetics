/**
 * data/navigation.js — Menus / linklists (giả lập Sapo `linklists[handle]`)
 *
 * Proxy trong preview-mock.js cho phép: linklists['main-menu'].links
 *
 * 2026-10-17: menu local = SNAPSHOT menu THẬT trên Sapo (data/sapo-menus.json, quét từ
 * https://pharmacosmetics-vn.com/?previewThemeId=1172249: header "Danh mục", menu header, chân trang, khối trang chủ).
 * Trước đây file này tự dựng menu demo với nhiều link không tồn tại trên Sapo (/tri-mun, /serum, /khuyen-mai,
 * /he-thong-cua-hang…) ⇒ localhost khác hẳn Sapo. Menu nào chưa có trên Sapo (vd bo-loc-nhanh, serum-nhu-cau-da,
 * skinhealthy-nav) thì KHÔNG khai báo ở đây — khối dùng menu đó tự ẩn, giống Sapo.
 * Sửa menu trên Sapo ⇒ cập nhật data/sapo-menus.json, không tự thêm link.
 */

const sapoMenus = require('./sapo-menus.json');

// link.object = danh mục (có ảnh) như Sapo khi link trỏ tới 1 danh mục; đọc trễ (getter) vì data/collections.js
// cũng require file này.
function toLink(raw) {
  const l = {
    title: raw.title,
    url: raw.url,
    alias: raw.alias || '',
    active: false,
    links: (raw.links || []).map(toLink),
  };
  if (l.alias) {
    Object.defineProperty(l, 'object', {
      enumerable: true,
      get: () => require('./collections').collectionsData[l.alias] || null,
    });
  }
  return l;
}

const linklists = {};
for (const [handle, menu] of Object.entries(sapoMenus)) {
  if (handle.startsWith('_')) continue;
  linklists[handle] = { title: menu.title, handle, links: (menu.links || []).map(toLink) };
}

module.exports = { linklists };
