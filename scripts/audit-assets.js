'use strict';

/*
 * Bước 1 của build:sapo — chặn build nếu assets/ chứa ảnh nội dung/demo (REQ-ASSET-01) hoặc
 * template còn gọi '<ảnh bitmap nội dung>' | asset_url (CHECK-002). Chính sách chi tiết ở
 * scripts/lib/sapo-asset-policy.js.
 *
 * Dùng: node scripts/audit-assets.js [--assets <dir>] [--schema <file>]
 * Exit code 1 khi có vi phạm.
 */

const fs = require('fs');
const path = require('path');
const policy = require('./lib/sapo-asset-policy');

const rootDir = path.resolve(__dirname, '..');

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index > -1 && process.argv[index + 1] ? path.resolve(process.argv[index + 1]) : fallback;
}

const assetsDir = argValue('--assets', path.join(rootDir, 'assets'));
const schemaPath = argValue('--schema', path.join(rootDir, 'configs', 'settings_schema.json'));
const liquidDirs = ['templates', 'snippets', 'layouts', 'assets'].map((dir) => path.join(rootDir, dir));

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const formatKb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const rel = (file) => path.relative(rootDir, file).split(path.sep).join('/');

const schemaIds = policy.loadSchemaImageFileIds(schemaPath);
const violations = [];
const warnings = [];
const summary = { 'system-svg': 0, 'ui-icon': 0, 'schema-default': 0 };

// 1) Quét file ảnh trong assets/.
for (const file of walk(assetsDir).filter((f) => policy.isImageFile(f))) {
  const size = fs.statSync(file).size;
  const result = policy.classifyAssetImage(file, size, schemaIds);
  if (result.allowed) summary[result.category] += 1;
  else violations.push(`${rel(file)} (${formatKb(size)}): ${result.reason}`);
}

// 2) Quét tham chiếu '<ảnh bitmap>' | asset_url trong Liquid/SCSS (bỏ qua khối comment).
const refPattern = /['"]([\w.-]+\.(?:png|jpe?g|webp|gif|ico|avif|bmp))['"]\s*\|\s*asset_url/gi;
const commentPattern = /\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g;
for (const file of liquidDirs.flatMap(walk).filter((f) => /\.(bwt|css|js)$/i.test(f))) {
  const source = fs.readFileSync(file, 'utf8').replace(commentPattern, (block) => block.replace(/[^\n]/g, ' '));
  for (const match of source.matchAll(refPattern)) {
    const name = match[1];
    const line = source.slice(0, match.index).split('\n').length;
    if (!policy.isAllowedBitmapReference(name, schemaIds)) {
      violations.push(`${rel(file)}:${line}: '${name}' | asset_url — ảnh nội dung phải dùng field type:"image" + settings.<id> | img_url`);
    } else if (policy.UI_ICON_WHITELIST.has(name) && !fs.existsSync(path.join(assetsDir, name))) {
      warnings.push(`${rel(file)}:${line}: '${name}' nằm trong whitelist nhưng chưa có file trong assets/ (link ảnh vỡ)`);
    }
  }
}

console.log('[audit:assets] Ảnh hợp lệ trong assets/:',
  `${summary['system-svg']} SVG hệ thống, ${summary['ui-icon']} icon UI whitelist, ${summary['schema-default']} ảnh mặc định field schema`);
for (const warning of [...new Set(warnings)]) console.warn(`  ! ${warning}`);

if (violations.length) {
  console.error(`[audit:assets] FAIL — ${violations.length} vi phạm chính sách asset tĩnh Sapo:`);
  for (const violation of violations) console.error(`  ✗ ${violation}`);
  process.exit(1);
}
console.log('[audit:assets] PASS — không có ảnh nội dung/demo trong assets/.');
