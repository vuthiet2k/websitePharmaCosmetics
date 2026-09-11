/**
 * data/pages.js — Trang tĩnh (giả lập Sapo `pages[handle]`)
 */

const pages = {

  'gioi-thieu': {
    id:      101,
    title:   'Giới thiệu PHARMA COSMETICS',
    alias:   'gioi-thieu',
    handle:  'gioi-thieu',
    url:     '/gioi-thieu',
    content: `<p>PHARMA COSMETICS là nền tảng dược mỹ phẩm chất lượng cao, chuyên cung cấp các sản phẩm
      điều trị da được kiểm chứng bởi chuyên gia da liễu hàng đầu.</p>`,
    published: true,
  },

  'san-pham-yeu-thich': {
    id:      102,
    title:   'Sản phẩm yêu thích',
    alias:   'san-pham-yeu-thich',
    handle:  'san-pham-yeu-thich',
    url:     '/san-pham-yeu-thich',
    content: '<p>Danh sách sản phẩm yêu thích của bạn.</p>',
    published: true,
  },

  'chinh-sach': {
    id:      103,
    title:   'Chính sách mua hàng',
    alias:   'chinh-sach',
    handle:  'chinh-sach',
    url:     '/chinh-sach',
    content: '<p>Chính sách đổi trả, giao hàng và bảo hành.</p>',
    published: true,
  },

  'lien-he': {
    id:      104,
    title:   'Liên hệ',
    alias:   'lien-he',
    handle:  'lien-he',
    url:     '/lien-he',
    content: '<p>Hotline: <strong>0967 194 063</strong> — Email: info@pharmacosmetics-vn.com</p>',
    published: true,
  },

  'chinh-sach-giao-hang': {
    id:      105,
    title:   'Chính sách giao hàng',
    alias:   'chinh-sach-giao-hang',
    handle:  'chinh-sach-giao-hang',
    url:     '/chinh-sach-giao-hang',
    content: '<p>Miễn phí vận chuyển cho đơn hàng từ 500.000₫.</p>',
    published: true,
  },

};

module.exports = { pages };
