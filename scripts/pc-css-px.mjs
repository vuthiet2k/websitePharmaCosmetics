#!/usr/bin/env node
/*
  scripts/pc-css-px.mjs — bước sau `tailwindcss` trong `npm run build:pc` (KHOÁ cùng thư viện, R5).
  N03 (24/10/2026): CSS cũ đặt `html { font-size: 90% }` (< 768px) / 15px (≥ 1024px) ⇒ thang rem của thư viện co lại
  (`min-h-11` = 39,6px thay 44px). Đổi rem → px (1rem = 16px) CHỈ trong quy tắc có selector `.pc-` để cỡ thư viện không
  phụ thuộc CSS cũ; utility bố cục dùng chung với template cũ (p-4, mt-3…) giữ rem để không đổi giao diện trang cũ.
  Bỏ khi bật preflight + xoá CSS cũ (đợt 12, D09).
  Chạy: node scripts/pc-css-px.mjs [assets/pc-ui.css]
*/
import fs from 'node:fs';
import postcss from 'postcss';

const file = process.argv[2] || 'assets/pc-ui.css';
const css = fs.readFileSync(file, 'utf8');
const toPx = (v) => v.replace(/(^|[^\w.-])(-?\d*\.?\d+)rem\b/g, (_, pre, n) => `${pre}${+(parseFloat(n) * 16).toFixed(3)}px`);
let n = 0;
const root = postcss.parse(css);
root.walkRules((rule) => {
  if (!rule.selector.includes('.pc-')) return;
  rule.walkDecls((d) => { const v = toPx(d.value); if (v !== d.value) { d.value = v; n++; } });
});
fs.writeFileSync(file, root.toString());
console.log(`pc-css-px: ${n} khai báo rem → px trong quy tắc .pc-* (${file})`);
