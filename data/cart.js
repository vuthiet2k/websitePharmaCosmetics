/**
 * data/cart.js — Giỏ hàng mẫu cho preview (dữ liệu phiên của khách — live không có giỏ công khai); dòng hàng dùng 2 SP thật của catalog (giả lập Sapo `cart` object)
 */

const { products } = require('./products');

// Lấy sản phẩm thật còn hàng đầu tiên làm item mẫu
const avail = products.filter((p) => p.available);
const p1 = avail[0];
const p2 = avail[1];

const cartItems = [
  {
    id:          p1.variants[0].id,
    product_id:  p1.id,
    variant_id:  p1.variants[0].id,
    title:       p1.name,
    variant_title: p1.variants[0].title,
    url:         p1.url,
    image:       p1.featured_image,
    sku:         p1.variants[0].sku,
    quantity:    1,
    price:       p1.variants[0].price,
    compare_at_price: p1.variants[0].compare_at_price,
    line_price:  p1.variants[0].price * 1,
    product:     p1,
    variant:     p1.variants[0],
    vendor:      p1.vendor,
    properties:  {},
  },
  {
    id:          p2.variants[0].id,
    product_id:  p2.id,
    variant_id:  p2.variants[0].id,
    title:       p2.name,
    variant_title: p2.variants[0].title,
    url:         p2.url,
    image:       p2.featured_image,
    sku:         p2.variants[0].sku,
    quantity:    2,
    price:       p2.variants[0].price,
    compare_at_price: p2.variants[0].compare_at_price,
    line_price:  p2.variants[0].price * 2,
    product:     p2,
    variant:     p2.variants[0],
    vendor:      p2.vendor,
    properties:  {},
  },
];

const cart = {
  item_count:  cartItems.reduce((s, i) => s + i.quantity, 0),
  total_price: cartItems.reduce((s, i) => s + i.line_price, 0),
  items:       cartItems,
  note:        '',
  attributes:  {},
};

module.exports = { cart };
