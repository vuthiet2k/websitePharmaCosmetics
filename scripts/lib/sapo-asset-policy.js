'use strict';

/*
 * Chính sách ảnh trong assets/ cho gói Sapo (build:sapo — 2026-10-03).
 * Dùng chung cho audit-assets.js (trước build), build-sapo-staging.js (lọc khi copy) và
 * validate-sapo-zip.js (kiểm tra ngược trong zip) để 3 bước không lệch nhau.
 *
 * Ảnh trong assets/ chỉ được phép thuộc 1 trong 3 nhóm:
 *  1. SVG hệ thống theo quy ước tên: icon-*.svg, flag-*.svg, lang-*.svg, sprite.svg.
 *  2. Icon UI nhỏ đặt tên cũ (UI_ICON_WHITELIST) — giữ nguyên file, không tạo field schema.
 *  3. Ảnh mặc định của field `type: "image"` dạng id = tên file (cơ chế Sapo: admin upload
 *     ảnh thì Sapo ghi đè assets/<id>, template gọi '<id>' | asset_url).
 * Ảnh nội dung khác (banner, ảnh demo, QR, logo đối tác...) phải là field `type: "image"`
 * id thường (vd footer_qr_image) và render qua `settings.<id> | img_url`, không nằm trong assets/.
 */

const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif', '.bmp']);
const BITMAP_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.avif', '.bmp']);

const SYSTEM_SVG_PATTERN = /^(icon-[\w.-]+|flag-[\w.-]+|lang-[\w.-]+|sprite)\.svg$/i;

// Icon UI/hệ thống dùng chung toàn trang. Một số tên (ico-select*, icon_gift, checked,
// next/prev_icon) đang được CSS tham chiếu nhưng chưa có file trong repo — vẫn liệt kê để
// tham chiếu hợp lệ; audit chỉ cảnh báo thiếu file.
const UI_ICON_WHITELIST = new Set([
  'heart.png',
  'heartadd-1.png',
  'sortdown.png',
  'soldout.png',
  'arrow-right.png',
  'lazy.png',
  'icon_youtube.png',
  'flash_-1.png',
  'ico-select.png',
  'ico-select2.png',
  'icon_gift.png',
  'checked.png',
  'next_icon.png',
  'prev_icon.png',
  'facebook_2.svg',
  'instagram_1.svg',
  'lazada.svg',
  'shopee.svg',
  'tiktok.svg',
  'whatsapp.svg',
  'logoPC.svg',
  'PharmaCosmetics.svg',
]);

// Trần dung lượng cho mỗi ảnh được phép nằm trong assets/.
const MAX_IMAGE_BYTES = 150 * 1024;

function isImageFile(fileName) {
  return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function isBitmapFile(fileName) {
  return BITMAP_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

/** Lấy id của các field `type: "image"` có id là tên file ảnh (ảnh mặc định nằm trong assets/). */
function schemaImageFileIds(schema) {
  const ids = new Set();
  for (const group of Array.isArray(schema) ? schema : []) {
    for (const setting of group.settings || []) {
      if (setting.type === 'image' && typeof setting.id === 'string' && isImageFile(setting.id)) {
        ids.add(setting.id);
      }
    }
  }
  return ids;
}

function loadSchemaImageFileIds(schemaPath) {
  return schemaImageFileIds(JSON.parse(fs.readFileSync(schemaPath, 'utf8')));
}

/**
 * Phân loại 1 file ảnh trong assets/.
 * @returns {{ allowed: boolean, category: string, reason?: string }}
 */
function classifyAssetImage(fileName, sizeBytes, schemaIds) {
  const base = path.basename(fileName);
  let category = null;
  if (SYSTEM_SVG_PATTERN.test(base)) category = 'system-svg';
  else if (UI_ICON_WHITELIST.has(base)) category = 'ui-icon';
  else if (schemaIds.has(base)) category = 'schema-default';

  if (!category) {
    return {
      allowed: false,
      category: 'forbidden',
      reason: 'ảnh nội dung/demo không được đóng gói trong assets/ — khai báo field type:"image" và render qua settings.<id> | img_url',
    };
  }
  if (sizeBytes > MAX_IMAGE_BYTES) {
    return {
      allowed: false,
      category,
      reason: `vượt trần ${Math.round(MAX_IMAGE_BYTES / 1024)} KB (${(sizeBytes / 1024).toFixed(1)} KB) — nén/resize lại`,
    };
  }
  return { allowed: true, category };
}

/** Tham chiếu '<file ảnh bitmap>' | asset_url có hợp lệ không (icon UI hoặc ảnh mặc định field schema). */
function isAllowedBitmapReference(fileName, schemaIds) {
  return UI_ICON_WHITELIST.has(fileName) || schemaIds.has(fileName) || SYSTEM_SVG_PATTERN.test(fileName);
}

module.exports = {
  IMAGE_EXTENSIONS,
  BITMAP_EXTENSIONS,
  SYSTEM_SVG_PATTERN,
  UI_ICON_WHITELIST,
  MAX_IMAGE_BYTES,
  isImageFile,
  isBitmapFile,
  schemaImageFileIds,
  loadSchemaImageFileIds,
  classifyAssetImage,
  isAllowedBitmapReference,
};
