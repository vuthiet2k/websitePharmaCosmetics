'use strict';

/*
 * Bước 3 của build:sapo — dựng thư mục staging sapo-dist/ đúng cấu trúc theme Sapo (REQ-BUILD-01).
 *
 * - GIỮ NGUYÊN tên thư mục configs/ và layouts/ (số nhiều). 2026-10-05: tải gói lên Sapo thật bị báo
 *   thiếu "layouts/theme.bwt, configs/settings_data.json, configs/settings_schema.json" khi đổi sang
 *   config/ + layout/ như cẩm nang cũ ghi ⇒ trình tải lên Sapo Web đòi tên số nhiều. Không tạo thư mục
 *   rỗng sections/ locales/ vì repo không dùng.
 * - Minify .js/.css thuần và .js.bwt KHÔNG chứa Liquid. GIỮ NGUYÊN tên file (không thêm .min) vì
 *   template gọi asset theo tên qua asset_url — đổi tên sẽ vỡ toàn bộ tham chiếu.
 * - .scss.bwt và .js.bwt có Liquid copy nguyên bản: Sapo tự render Liquid/biên dịch SCSS phía server,
 *   minifier không hiểu cú pháp {{ }} / {% %} và SCSS lồng nhau.
 * - Ảnh trong assets/ chỉ copy file đạt chính sách scripts/lib/sapo-asset-policy.js.
 */

const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');
const CleanCSS = require('clean-css');
const policy = require('./lib/sapo-asset-policy');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'sapo-dist');

// source (repo) -> target (Sapo)
const DIRECTORY_MAP = [
  ['assets', 'assets'],
  ['configs', 'configs'],
  ['layouts', 'layouts'],
  ['snippets', 'snippets'],
  ['templates', 'templates'],
];

// Đuôi file hợp lệ theo từng thư mục đích.
const ALLOWED_EXTENSIONS = {
  configs: /\.json$/i,
  layouts: /\.bwt$/i,
  snippets: /\.bwt$/i,
  templates: /\.bwt$/i,
};
// Không bao giờ đóng gói: mã nguồn chưa build, source map, file hệ điều hành, file ẩn.
const EXCLUDED_FILE = /(^\.|\.scss$|\.sass$|\.ts$|\.tsx$|\.map$|\.md$|\.bak$|\.orig$|\.log$|^thumbs\.db$|^desktop\.ini$)/i;
const ALREADY_MINIFIED = /[.-](min|prod)\.(js|css)$/i;
const HAS_LIQUID = /\{\{|\{%/;

if (!outputDir.startsWith(rootDir + path.sep)) {
  throw new Error(`Thư mục output không hợp lệ: ${outputDir}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

async function minifyAsset(fileName, source) {
  if (ALREADY_MINIFIED.test(fileName)) return null;
  const isJs = /\.js$/i.test(fileName) || (/\.js\.bwt$/i.test(fileName) && !HAS_LIQUID.test(source));
  const isCss = /\.css$/i.test(fileName);
  if (isJs) {
    const result = await terserMinify(source, { compress: true, mangle: true, format: { comments: false } });
    return result.code;
  }
  if (isCss) {
    const result = new CleanCSS({ level: 1 }).minify(source);
    if (result.errors.length) throw new Error(result.errors.join('; '));
    // 2026-10-05: clean-css gặp ký tự rác ("$C" trong site-topbar.css) chỉ báo warning rồi LẶNG LẼ bỏ các
    // khối CSS phía sau ⇒ gói Sapo mất CSS mà build vẫn PASS. Coi mọi warning là lỗi.
    if (result.warnings.length) {
      const error = new Error(`${fileName}: CSS không hợp lệ — ${result.warnings.slice(0, 3).join('; ')}`);
      error.fatal = true;
      throw error;
    }
    return result.styles;
  }
  return null;
}

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const schemaIds = policy.loadSchemaImageFileIds(path.join(rootDir, 'configs', 'settings_schema.json'));
  const stats = { copied: 0, minified: 0, skipped: [], bytesIn: 0, bytesOut: 0 };
  const fatalErrors = [];

  for (const [sourceName, targetName] of DIRECTORY_MAP) {
    const sourceDir = path.join(rootDir, sourceName);
    if (!fs.existsSync(sourceDir)) throw new Error(`Thiếu thư mục theme bắt buộc: ${sourceName}/`);

    for (const sourceFile of walk(sourceDir)) {
      const relative = path.relative(sourceDir, sourceFile);
      const fileName = path.basename(sourceFile);
      const label = `${sourceName}/${relative.split(path.sep).join('/')}`;

      if (EXCLUDED_FILE.test(fileName)) { stats.skipped.push(`${label} (loại trừ)`); continue; }
      if (ALLOWED_EXTENSIONS[targetName] && !ALLOWED_EXTENSIONS[targetName].test(fileName)) {
        stats.skipped.push(`${label} (sai đuôi cho ${targetName}/)`);
        continue;
      }
      const size = fs.statSync(sourceFile).size;
      if (targetName === 'assets' && policy.isImageFile(fileName)
        && !policy.classifyAssetImage(fileName, size, schemaIds).allowed) {
        stats.skipped.push(`${label} (ảnh ngoài chính sách)`);
        continue;
      }

      const targetFile = path.join(outputDir, targetName, relative);
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      stats.bytesIn += size;

      let output = null;
      if (targetName === 'assets') {
        const source = fs.readFileSync(sourceFile, 'utf8');
        try {
          output = await minifyAsset(fileName, source);
        } catch (error) {
          if (error.fatal) { fatalErrors.push(error.message); continue; }
          console.warn(`  ! Không minify được ${label}, copy nguyên bản: ${error.message}`);
        }
        if (output !== null && Buffer.byteLength(output) >= size) output = null;
      }

      if (output !== null) {
        fs.writeFileSync(targetFile, output);
        stats.minified += 1;
        stats.bytesOut += Buffer.byteLength(output);
      } else {
        fs.copyFileSync(sourceFile, targetFile);
        stats.bytesOut += size;
      }
      stats.copied += 1;
    }
  }

  const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(2);
  console.log(`[compile:sapo] sapo-dist/: ${stats.copied} file (${stats.minified} file minify), `
    + `${mb(stats.bytesIn)} MB -> ${mb(stats.bytesOut)} MB`);
  for (const skipped of stats.skipped) console.log(`  - bỏ qua ${skipped}`);
  if (fatalErrors.length) throw new Error(`asset lỗi cú pháp, dừng đóng gói:\n  ✗ ${fatalErrors.join('\n  ✗ ')}`);
}

main().catch((error) => {
  console.error(`[compile:sapo] FAIL — ${error.stack || error.message}`);
  process.exit(1);
});
