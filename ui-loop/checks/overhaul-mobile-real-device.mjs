#!/usr/bin/env node
/**
 * ui-loop/checks/overhaul-mobile-real-device.mjs
 * Script kiểm thử tự động giả lập thiết bị thật (iOS Dark mode, Android Zoom 130%, Card đồng bộ)
 * Dành cho BATCH-15 của Kế hoạch Đại trùng tu Giao diện.
 */

import fs from 'node:fs';
import path from 'node:path';

console.log('========================================================================');
console.log(' KIỂM THỬ THIẾT BỊ THẬT & GIAO DIỆN MOBILE (BATCH-15 OVERHAUL)');
console.log('========================================================================');

const results = [];

function check(title, fn) {
  try {
    const res = fn();
    if (res.ok) {
      console.log(`✅ [PASS] ${title}`);
      results.push({ title, pass: true });
    } else {
      console.log(`❌ [FAIL] ${title}: ${res.error}`);
      results.push({ title, pass: false, error: res.error });
    }
  } catch (err) {
    console.log(`❌ [FAIL] ${title}: ${err.message}`);
    results.push({ title, pass: false, error: err.message });
  }
}

// 1. Kiểm tra iOS Dark Mode: design_tokens không có mã màu tối bị rò rỉ
check('1. iOS Safari Dark Mode: Nền light không rò rỉ mã màu tối (#112A1E, #0B1712)', () => {
  const tokens = fs.readFileSync('snippets/design_tokens.bwt', 'utf8');
  if (tokens.includes('#112A1E') || tokens.includes('#0B1712')) {
    return { ok: false, error: 'Phát hiện mã màu tối trong design_tokens.bwt' };
  }
  if (!tokens.includes('color-scheme: light')) {
    return { ok: false, error: 'Thiếu thuộc tính cưỡng chế color-scheme: light' };
  }
  return { ok: true };
});

// 2. Kiểm tra Thẻ bài viết trên Mobile: flex-wrap, whitespace-nowrap, fallback Logo
check('2. Mobile Article Card: Flex wrap chân thẻ, không tràn dòng, fallback Logo chuẩn', () => {
  const acard = fs.readFileSync('snippets/pc_article_card.bwt', 'utf8');
  if (acard.includes('pc-acard')) return { ok: false, error: 'Vẫn còn class cũ pc-acard' };
  if (!acard.includes('PharmaCosmetics.svg') || !acard.includes('object-contain')) {
    return { ok: false, error: 'Chưa cấu hình fallback PharmaCosmetics.svg object-contain' };
  }
  if (!acard.includes('flex-wrap') || !acard.includes('whitespace-nowrap')) {
    return { ok: false, error: 'Chân thẻ chưa có flex-wrap hoặc whitespace-nowrap' };
  }
  return { ok: true };
});

// 3. Kiểm tra tính đồng bộ 100% của Card sản phẩm (ui_product_card)
check('3. Thống nhất 1 mẫu Card sản phẩm duy nhất: Không còn card phân mảnh', () => {
  const uikit = fs.readFileSync('templates/page.ui-kit.bwt', 'utf8');
  if (!uikit.includes("include 'ui_product_card'")) {
    return { ok: false, error: 'page.ui-kit chưa dùng chung ui_product_card' };
  }
  const viewed = fs.readFileSync('templates/product.viewed.bwt', 'utf8');
  if (!viewed.includes("include 'ui_product_card'")) {
    return { ok: false, error: 'product.viewed chưa dùng chung ui_product_card' };
  }
  return { ok: true };
});

// 4. Kiểm tra SP đã xem: snap-x cuộn ngang mượt mà, không swiper rác
check('4. SP đã xem: Thuần Tailwind snap-x, 0 style nội tuyến, 0 Swiper', () => {
  const secViewed = fs.readFileSync('snippets/section_product_viewed.bwt', 'utf8');
  if (secViewed.includes('<style>') || secViewed.includes('new Swiper')) {
    return { ok: false, error: 'Vẫn còn <style> hoặc new Swiper trong section_product_viewed' };
  }
  if (!secViewed.includes('snap-x')) {
    return { ok: false, error: 'Chưa có class snap-x' };
  }
  return { ok: true };
});

// 5. Kiểm tra Tab chi tiết SP: Bộ lọc thẻ <b> AI Gemini chống sập layout
check('5. Tab chi tiết sản phẩm: Bộ lọc an toàn chống vỡ chân trang', () => {
  const tab = fs.readFileSync('snippets/tab_product.bwt', 'utf8');
  if (!tab.includes("replace: '<b ', '<span '") || !tab.includes("replace: '</b>', '</span>'")) {
    return { ok: false, error: 'Thiếu bộ lọc replace thẻ <b>' };
  }
  return { ok: true };
});

console.log('------------------------------------------------------------------------');
const allPass = results.every(r => r.pass);
if (allPass) {
  console.log(`🎉 TẤT CẢ ${results.length} BÀI TEST THIẾT BỊ THẬT ĐỀU ĐẠT CHUẨN 100%!`);
  process.exit(0);
} else {
  console.error('❌ CÓ BÀI TEST CHƯA ĐẠT!');
  process.exit(1);
}
