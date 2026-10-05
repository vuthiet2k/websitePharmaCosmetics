'use strict';

/*
 * Bước 5 của build:sapo — lint cấu trúc zip theme Sapo (REQ-VALIDATE-01). Đọc thẳng buffer zip
 * (central directory + inflate từng entry để đối chiếu CRC32), không giải nén ra đĩa.
 *
 * Dùng: node scripts/validate-sapo-zip.js [đường-dẫn-zip]
 *       (mặc định exports/sapo-theme-<version>.zip)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const policy = require('./lib/sapo-asset-policy');

const rootDir = path.resolve(__dirname, '..');
const { version } = require(path.join(rootDir, 'package.json'));
const zipPath = path.resolve(process.argv[2] || path.join(rootDir, 'exports', `sapo-theme-${version}.zip`));

const SIZE_LIMIT_BYTES = 5000000;
const MAX_REPORTED_ERRORS = 30;
const summarize = (items, max = 10) => (items.length > max ? `${items.slice(0, max).join(', ')}, … (+${items.length - max})` : items.join(', '));
// 2026-10-05: Sapo Web đòi configs/ + layouts/ (số nhiều) — xác nhận khi tải gói lên Sapo thật.
const REQUIRED_DIRECTORIES = ['assets', 'configs', 'layouts', 'snippets', 'templates'];
const ALLOWED_ROOT_DIRECTORIES = new Set([...REQUIRED_DIRECTORIES, 'locales', 'sections']);
const REQUIRED_FILES = ['layouts/theme.bwt', 'configs/settings_schema.json', 'configs/settings_data.json'];
// Thuộc tính hợp lệ theo từng kiểu field — nguồn: https://support.sapo.vn/settings-schema (color, font,
// collection, blog, page, link_list, snippet, header, paragraph) + schema gốc theme Sapo đã chấp nhận
// (commit f31bbd0) cho các kiểu trang tài liệu không ghi (text, textarea, image, checkbox, select).
// 2026-10-05: Sapo báo "product_faq_blog_handle các attribute không hợp lệ: default" ⇒ kiểu chọn dữ liệu
// (collection/blog/page/link_list/snippet/font) KHÔNG có default.
const SCHEMA_SETTING_ATTRS = {
  header: ['content', 'info'], paragraph: ['content'],
  color: ['id', 'label', 'default', 'info'], font: ['id', 'label', 'info'],
  checkbox: ['id', 'label', 'default', 'info'],
  text: ['id', 'label', 'default', 'info'], textarea: ['id', 'label', 'default', 'info'],
  select: ['id', 'label', 'default', 'options'],
  radio: ['id', 'label', 'default', 'info', 'options'],
  image: ['id', 'label', 'info'],
  collection: ['id', 'label', 'info'], blog: ['id', 'label', 'info'], page: ['id', 'label', 'info'],
  link_list: ['id', 'label', 'info'], snippet: ['id', 'label', 'info'],
};
// Template bắt buộc theo https://support.sapo.vn/gioi-thieu-ve-template-liquid.
const REQUIRED_TEMPLATES = ['index', 'product', 'collection', 'cart', 'blog', 'article', 'page', 'list_collections', 'search', '404']
  .map((name) => `templates/${name}.bwt`);
const SCHEMA_SETTING_TYPES = new Set(Object.keys(SCHEMA_SETTING_ATTRS));
const JUNK_PATTERN = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini|\.git|\.gitkeep|\.vercel|node_modules)(\/|$)/i;
const SOURCE_PATTERN = /\.(scss|sass|ts|tsx|map)$/i;
const EXTENSION_RULES = { layouts: /\.bwt$/i, templates: /\.bwt$/i, snippets: /\.bwt$/i, sections: /\.bwt$/i, configs: /\.json$/i, locales: /\.json$/i };

/** Đọc central directory của zip (không hỗ trợ ZIP64 — gói theme < 5 MB không cần). */
function readZipEntries(buffer) {
  const minEocd = Math.max(0, buffer.length - 0xffff - 22);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= minEocd; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('không tìm thấy End Of Central Directory — file không phải zip hợp lệ');

  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error(`central directory hỏng tại entry ${i}`);
    const method = buffer.readUInt16LE(offset + 10);
    const crc = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    entries.push({ name, method, crc, compressedSize, size, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function readEntryData(buffer, entry) {
  const local = entry.localOffset;
  if (buffer.readUInt32LE(local) !== 0x04034b50) throw new Error(`local header hỏng: ${entry.name}`);
  const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
  const raw = buffer.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) return zlib.inflateRawSync(raw);
  throw new Error(`phương thức nén không hỗ trợ (${entry.method}): ${entry.name}`);
}

function main() {
  const errors = [];
  if (!fs.existsSync(zipPath)) {
    console.error(`FAIL: không tìm thấy ${zipPath}`);
    process.exit(1);
  }
  const buffer = fs.readFileSync(zipPath);
  if (buffer.length >= SIZE_LIMIT_BYTES) {
    errors.push(`dung lượng ${buffer.length.toLocaleString('en-US')} bytes >= ${SIZE_LIMIT_BYTES.toLocaleString('en-US')} bytes`);
  }

  const entries = readZipEntries(buffer);
  const files = entries.filter((entry) => !entry.name.endsWith('/'));
  const names = new Set(files.map((entry) => entry.name));
  const rootDirectories = new Set(entries.map((entry) => entry.name.split('/')[0]));
  const data = new Map();

  for (const entry of files) {
    const { name } = entry;
    if (name.includes('\\') || name.startsWith('/') || name.split('/').includes('..')) {
      // Compress-Archive của Windows PowerShell 5.1 ghi đường dẫn bằng '\' — đóng gói bằng npm run pack:sapo.
      errors.push(`đường dẫn không an toàn (chứa dấu \\, tuyệt đối hoặc '..'): ${name}`);
    } else if (!name.includes('/')) errors.push(`file nằm lẻ ở root zip: ${name}`);
    if (JUNK_PATTERN.test(name)) errors.push(`file rác hệ điều hành/VCS: ${name}`);
    if (SOURCE_PATTERN.test(name)) errors.push(`mã nguồn chưa build bị đóng gói: ${name}`);

    const top = name.split('/')[0];
    if (EXTENSION_RULES[top] && !EXTENSION_RULES[top].test(name)) errors.push(`sai đuôi file trong ${top}/: ${name}`);

    try {
      const content = readEntryData(buffer, entry);
      if (content.length !== entry.size || (zlib.crc32 && zlib.crc32(content) >>> 0 !== entry.crc)) {
        errors.push(`CRC/kích thước không khớp: ${name}`);
      }
      data.set(name, content);
    } catch (error) {
      errors.push(error.message);
    }
  }

  for (const directory of rootDirectories) {
    if (!ALLOWED_ROOT_DIRECTORIES.has(directory) && !names.has(directory)) {
      errors.push(`thư mục root lạ (có thể bị bọc thư mục cha): ${directory}/`);
    }
  }
  for (const directory of REQUIRED_DIRECTORIES) {
    if (![...names].some((name) => name.startsWith(`${directory}/`))) errors.push(`thiếu thư mục bắt buộc ${directory}/`);
  }
  for (const file of [...REQUIRED_FILES, ...REQUIRED_TEMPLATES]) {
    if (!names.has(file)) errors.push(`thiếu file bắt buộc ${file} ở root zip`);
  }

  // theme.bwt: 2 thẻ bắt buộc (https://support.sapo.vn/theme-bwt).
  if (data.has('layouts/theme.bwt')) {
    const theme = data.get('layouts/theme.bwt').toString('utf8');
    const headerAt = theme.indexOf('content_for_header');
    if (headerAt < 0 || headerAt > theme.toLowerCase().indexOf('</head>')) errors.push('layouts/theme.bwt: thiếu {{ content_for_header }} trước </head>');
    if (!/content_for_layout|block\s+["']ContentPlaceHolder["']/.test(theme)) errors.push('layouts/theme.bwt: thiếu {{ content_for_layout }} / block "ContentPlaceHolder"');
  }

  // include/layout trỏ tới file không có ⇒ Sapo in "snippet not found" ngay trên trang.
  const strip = (text) => text.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');
  // '<file>' | asset_url trỏ tới file không có ⇒ request 404 (checklist Sapo: không lỗi console).
  // x.scss.css / x.css / x.js do Sapo sinh từ x.scss.bwt / x.css.bwt / x.js.bwt.
  const hasAsset = (file) => names.has(`assets/${file}`) || names.has(`assets/${file}.bwt`)
    || (/\.scss\.css$/i.test(file) && names.has(`assets/${file.replace(/\.css$/i, '.bwt')}`));
  const missingAssets = new Set();
  for (const [name, content] of data) {
    if (!/\.bwt$/i.test(name)) continue;
    for (const match of strip(content.toString('utf8')).matchAll(/['"]([\w.\-]+\.[a-z0-9]+)['"]\s*\|\s*asset_url/gi)) {
      if (!hasAsset(match[1])) missingAssets.add(`${match[1]} ← ${name}`);
    }
  }
  if (missingAssets.size) errors.push(`asset_url tới file không có trong gói — ${summarize([...missingAssets], 20)}`);

  // 2026-10-05: Sapo biên dịch asset .bwt theo lô — 1 file lỗi ⇒ MỌI asset .bwt (jquery.js, global_core.scss.css…)
  // trả 200 rỗng, cả site mất CSS/JS. Chặn 2 lỗi đã gặp: min()/max() trộn đơn vị (libsass coi là hàm Sass,
  // báo "Incompatible units") và filter gõ sai kiểu `| assert_url`.
  const badAssetSyntax = [];
  for (const [name, content] of data) {
    if (!/^assets\/.+\.bwt$/i.test(name)) continue;
    const text = strip(content.toString('utf8'));
    if (/\.scss\.bwt$/i.test(name)) {
      for (const match of text.matchAll(/(?<![\w-])(min|max)\(([^()]*)\)/g)) {
        const units = new Set((match[2].match(/\d(%|px|r?em|v[wh]|ch)\b|\d%/g) || []).map((unit) => unit.slice(1)));
        if (units.size > 1) badAssetSyntax.push(`${name}: ${match[0]}`);
      }
    }
    for (const match of text.matchAll(/\|\s*(assert_url|aset_url|assets_url)\b/g)) badAssetSyntax.push(`${name}: | ${match[1]}`);
  }
  if (badAssetSyntax.length) errors.push(`asset .bwt Sapo không biên dịch được — ${summarize(badAssetSyntax, 20)}`);

  for (const [name, content] of data) {
    if (!/\.bwt$/i.test(name) || name.startsWith('assets/')) continue;
    const text = strip(content.toString('utf8'));
    for (const match of text.matchAll(/\{%-?\s*include\s+['"]([^'"]+)['"]/g)) {
      if (!names.has(`snippets/${match[1]}.bwt`)) errors.push(`${name}: include '${match[1]}' — không có snippets/${match[1]}.bwt`);
    }
    for (const match of text.matchAll(/\{%-?\s*layout\s+['"]([^'"]+)['"]/g)) {
      if (!names.has(`layouts/${match[1]}.bwt`)) errors.push(`${name}: layout '${match[1]}' — không có layouts/${match[1]}.bwt`);
    }
  }

  for (const [name, content] of data) {
    if (/\.json$/i.test(name)) {
      try { JSON.parse(content.toString('utf8').replace(/^﻿/, '')); } catch (error) {
        errors.push(`JSON không hợp lệ ${name}: ${error.message}`);
      }
    }
  }

  let schemaIds = new Set();
  if (data.has('configs/settings_schema.json')) {
    try {
      const schema = JSON.parse(data.get('configs/settings_schema.json').toString('utf8'));
      schemaIds = policy.schemaImageFileIds(schema);
      // 2026-10-05: Sapo từ chối cả gói khi gặp kiểu field lạ ("setting type không hợp lệ linklist").
      const badTypes = [];
      const badAttrs = [];
      const badValues = [];
      const seenIds = new Set();
      if (!Array.isArray(schema)) errors.push('settings_schema.json phải là mảng các nhóm { name, settings }');
      for (const group of Array.isArray(schema) ? schema : []) {
        if (!group || typeof group.name !== 'string' || !Array.isArray(group.settings)) { badValues.push(`nhóm sai cấu trúc: ${JSON.stringify(group).slice(0, 60)}`); continue; }
        for (const setting of group.settings) {
          if (!SCHEMA_SETTING_TYPES.has(setting.type)) { badTypes.push(`${setting.id || '(không id)'}: "${setting.type}"`); continue; }
          const extra = Object.keys(setting).filter((key) => key !== 'type' && !SCHEMA_SETTING_ATTRS[setting.type].includes(key));
          if (extra.length) badAttrs.push(`${setting.id || setting.type} (${setting.type}): ${extra.join(', ')}`);
          const label = setting.id || setting.type;
          if (setting.type === 'header' || setting.type === 'paragraph') {
            if (typeof setting.content !== 'string') badValues.push(`${label}: thiếu content`);
            continue;
          }
          if (!setting.id) badValues.push(`field ${setting.type} thiếu id`);
          else if (seenIds.has(setting.id)) badValues.push(`${setting.id}: trùng id`);
          else seenIds.add(setting.id);
          if (typeof setting.label !== 'string') badValues.push(`${label}: thiếu label`);
          if ('default' in setting) {
            const wanted = setting.type === 'checkbox' ? 'boolean' : 'string';
            if (typeof setting.default !== wanted) badValues.push(`${label}: default phải là ${wanted}`);
          }
          if (setting.type === 'select' || setting.type === 'radio') {
            const options = Array.isArray(setting.options) ? setting.options : [];
            if (!options.length || options.some((option) => typeof option.value !== 'string' || typeof option.label !== 'string')) badValues.push(`${label}: options phải là [{ value, label }]`);
            else if ('default' in setting && !options.some((option) => option.value === setting.default)) badValues.push(`${label}: default không nằm trong options`);
          }
        }
      }
      if (badValues.length) errors.push(`settings_schema.json sai giá trị/cấu trúc — ${summarize(badValues, 30)}`);
      if (badTypes.length) errors.push(`settings_schema.json có kiểu field Sapo không hỗ trợ — ${summarize(badTypes)}`);
      if (badAttrs.length) errors.push(`settings_schema.json có thuộc tính Sapo không chấp nhận — ${summarize(badAttrs, 30)}`);
    } catch (_) { /* đã báo ở trên */ }
  }
  for (const entry of files.filter((item) => item.name.startsWith('assets/') && policy.isImageFile(item.name))) {
    const result = policy.classifyAssetImage(entry.name, entry.size, schemaIds);
    if (!result.allowed) errors.push(`${entry.name}: ${result.reason}`);
  }

  console.log(`[validate:sapo] ${path.relative(rootDir, zipPath).split(path.sep).join('/')}: `
    + `${files.length} file, ${buffer.length.toLocaleString('en-US')} bytes, root = ${summarize([...rootDirectories].sort())}`);
  if (errors.length) {
    console.error(`FAIL: ${errors.length} lỗi cấu trúc Sapo`);
    for (const error of errors.slice(0, MAX_REPORTED_ERRORS)) console.error(`  ✗ ${error}`);
    if (errors.length > MAX_REPORTED_ERRORS) console.error(`  … và ${errors.length - MAX_REPORTED_ERRORS} lỗi khác`);
    process.exit(1);
  }
  console.log('PASS: 100% Sapo Compatible');
}

main();
