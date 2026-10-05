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
const REQUIRED_FILES = ['layouts/theme.bwt', 'configs/settings_schema.json', 'configs/settings_data.json', 'templates/page.bwt'];
// Thuộc tính hợp lệ theo từng kiểu field. 2026-10-05: Sapo báo "product_faq_blog_handle các attribute không
// hợp lệ: default" ⇒ bám đúng bộ thuộc tính schema gốc của theme (bản Sapo đã chấp nhận, commit f31bbd0).
// radio/font/snippet chưa dùng trong repo — để bộ rộng, kiểm lại khi lần đầu dùng.
const SCHEMA_SETTING_ATTRS = {
  header: ['content'], paragraph: ['content'],
  checkbox: ['id', 'label', 'default', 'info'], color: ['id', 'label', 'default', 'info'],
  text: ['id', 'label', 'default', 'info'], textarea: ['id', 'label', 'default', 'info'],
  select: ['id', 'label', 'default', 'options'],
  image: ['id', 'label', 'info'], page: ['id', 'label', 'info'], link_list: ['id', 'label', 'info'],
  collection: ['id', 'label', 'info'], blog: ['id', 'label'],
  radio: ['id', 'label', 'default', 'info', 'options'], font: ['id', 'label', 'default', 'info'],
  snippet: ['id', 'label', 'info'],
};
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
  for (const file of REQUIRED_FILES) {
    if (!names.has(file)) errors.push(`thiếu file bắt buộc ${file} ở root zip`);
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
      // Danh mục kiểu hợp lệ theo Rule&HDKTXD.md (15 input types + header/paragraph).
      const badTypes = [];
      const badAttrs = [];
      for (const group of Array.isArray(schema) ? schema : []) {
        for (const setting of (group && group.settings) || []) {
          if (!SCHEMA_SETTING_TYPES.has(setting.type)) { badTypes.push(`${setting.id || '(không id)'}: "${setting.type}"`); continue; }
          const extra = Object.keys(setting).filter((key) => key !== 'type' && !SCHEMA_SETTING_ATTRS[setting.type].includes(key));
          if (extra.length) badAttrs.push(`${setting.id || setting.type} (${setting.type}): ${extra.join(', ')}`);
        }
      }
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
