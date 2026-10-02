'use strict';

/*
 * Bước 4 của build:sapo — nén sapo-dist/ thành exports/sapo-theme-<version>.zip (REQ-PACK-01) và
 * chặn cứng ngưỡng dung lượng tải lên của Sapo (REQ-SIZE-01): zip >= 5.000.000 bytes thì xoá zip,
 * in top 10 file nặng nhất trong staging và exit 1.
 *
 * archive.directory(src, false) đặt nội dung sapo-dist/ ngay tại root zip — không có thư mục bọc
 * (lỗi "Giao diện không hợp lệ" của Sapo khi zip lồng 1 cấp).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

const rootDir = path.resolve(__dirname, '..');
const stagingDir = path.join(rootDir, 'sapo-dist');
const exportsDir = path.join(rootDir, 'exports');
const { version } = require(path.join(rootDir, 'package.json'));
const zipPath = path.join(exportsDir, `sapo-theme-${version}.zip`);

const SIZE_LIMIT_BYTES = 5000000;
// Ngày cố định cho mọi entry để checksum ổn định giữa các lần build cùng nội dung.
const FIXED_ENTRY_DATE = new Date('2026-01-01T00:00:00Z');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

function createZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('warning', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(stagingDir, false, (entry) => ({ ...entry, date: FIXED_ENTRY_DATE }));
    archive.finalize();
  });
}

async function main() {
  if (!fs.existsSync(stagingDir)) throw new Error('Chưa có sapo-dist/ — chạy npm run compile:sapo trước.');
  fs.mkdirSync(exportsDir, { recursive: true });
  fs.rmSync(zipPath, { force: true });

  await createZip();

  const size = fs.statSync(zipPath).size;
  const files = walk(stagingDir).map((file) => ({
    file: path.relative(stagingDir, file).split(path.sep).join('/'),
    size: fs.statSync(file).size,
  }));
  const stagingBytes = files.reduce((total, item) => total + item.size, 0);
  const heaviest = [...files].sort((a, b) => b.size - a.size).slice(0, 10);

  if (size >= SIZE_LIMIT_BYTES) {
    fs.rmSync(zipPath, { force: true });
    console.error(`[pack:sapo] FAIL — zip ${size.toLocaleString('en-US')} bytes (${mb(size)} MB) `
      + `>= ngưỡng ${SIZE_LIMIT_BYTES.toLocaleString('en-US')} bytes. Đã xoá zip.`);
    console.error('Top 10 file nặng nhất trong sapo-dist/:');
    console.table(heaviest.map((item) => ({ file: item.file, KB: (item.size / 1024).toFixed(1) })));
    console.error('Gợi ý: nạp webfont/vendor JS qua CDN, tách bundle lớn, nén lại ảnh mặc định.');
    process.exit(1);
  }

  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
  console.log(`[pack:sapo] PASS — ${path.relative(rootDir, zipPath).split(path.sep).join('/')}`);
  console.table({
    'Số file': { value: files.length },
    'Staging (bytes)': { value: stagingBytes.toLocaleString('en-US') },
    'Zip (bytes)': { value: size.toLocaleString('en-US') },
    'Zip (MB)': { value: mb(size) },
    'Ngưỡng (bytes)': { value: SIZE_LIMIT_BYTES.toLocaleString('en-US') },
    'Còn trống': { value: `${(((SIZE_LIMIT_BYTES - size) / SIZE_LIMIT_BYTES) * 100).toFixed(1)}%` },
  });
  console.log(`SHA256: ${sha256}`);
}

main().catch((error) => {
  fs.rmSync(zipPath, { force: true });
  console.error(`[pack:sapo] FAIL — ${error.stack || error.message}`);
  process.exit(1);
});
