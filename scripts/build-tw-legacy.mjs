#!/usr/bin/env node
/*
  scripts/build-tw-legacy.mjs — `npm run build:tw-legacy` (TẠM, UI-STANDARD B.6 bước 1; việc D06, 24/10/2026).
  Dựng sẵn assets/pc-legacy-tw.css thay Tailwind CDN cũ (`cdn.tailwindcss.com` biên dịch trên trình duyệt — nguyên nhân
  chính L03): Tailwind 3.4 + tailwind.legacy.config.js (bản sao cấu hình CDN) + autoprefixer như CDN, không minify (minify gộp
  quy tắc ⇒ không so được từng quy tắc với CDN ở ui-loop/checks/D06.mjs). Xoá ở đợt 12 cùng file sinh.
  Chạy: node scripts/build-tw-legacy.mjs [đầu ra]
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.join(ROOT, 'ui-src', 'css', 'legacy-tw.css');
const output = path.resolve(ROOT, process.argv[2] || 'assets/pc-legacy-tw.css');
const config = require(path.join(ROOT, 'tailwind.legacy.config.js'));

process.chdir(ROOT); // content trong cấu hình là đường dẫn tương đối gốc repo
// Đích autoprefixer khớp CDN cũ (CDN thêm -webkit-text-decoration-color, -webkit-backdrop-filter vào .transition*).
const targets = ['defaults', 'safari >= 12', 'ios_saf >= 12'];
const res = await postcss([tailwindcss(config), autoprefixer({ overrideBrowserslist: targets })]).process(fs.readFileSync(input, 'utf8'), { from: input, to: output });
// Bỏ chú thích nguồn (đầu vào chỉ có chú thích + 3 @tailwind) — file sinh, không sửa tay.
const css = '/* assets/pc-legacy-tw.css — FILE SINH bởi `npm run build:tw-legacy` (D06). Không sửa tay. */\n'
  + res.css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{2,}/g, '\n').trim() + '\n';
fs.writeFileSync(output, css);
console.log(`build:tw-legacy: ${path.relative(ROOT, output)} ${css.length} B`);
