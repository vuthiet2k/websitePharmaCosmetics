'use strict';

/*
 * KIT đóng gói Sapo — chạy cả quy trình bằng 1 lệnh:  node scripts/sapo-build-all.js
 *   1. clean    — xoá sapo-dist/ và exports/sapo-theme-*.zip cũ
 *   2. audit    — (bỏ khi SAPO_KEEP_ALL_IMAGES=1) chính sách ảnh assets/
 *   3. staging  — dựng sapo-dist/: RENDER asset .bwt (x.js.bwt -> x.js, x.scss.bwt -> x.css, x.css.bwt -> x.css),
 *                 minify, lọc file. ĐÂY LÀ BƯỚC SỬA LỖI "Swiper is not defined" / mất CSS: Sapo KHÔNG biên dịch
 *                 asset .bwt khi tải gói lên, file .bwt trong assets/ sẽ trả về RỖNG.
 *   4. libsass  — (bỏ khi SAPO_SKIP_LIBSASS=1) biên dịch thử SCSS bằng libsass (bộ biên dịch của Sapo)
 *   5. pack     — nén sapo-dist/ thành exports/sapo-theme-<version>.zip (< 5.000.000 byte, dấu "/", không thư mục bọc)
 *   6. validate — kiểm tra cấu trúc zip y như Sapo
 * Dừng ngay ở bước lỗi đầu tiên.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const steps = [
  ['clean-sapo.js', 'Don staging + zip cu', false],
  ['audit-assets.js', 'Kiem tra anh assets/', process.env.SAPO_KEEP_ALL_IMAGES === '1'],
  ['build-sapo-staging.js', 'Dung sapo-dist/ (render asset .bwt)', false],
  ['check-sapo-libsass.js', 'Bien dich thu SCSS bang libsass', process.env.SAPO_SKIP_LIBSASS === '1'],
  ['package-sapo.js', 'Nen zip', false],
  ['validate-sapo-zip.js', 'Kiem tra zip', false],
];

for (const [file, label, skip] of steps) {
  if (skip) {
    console.log('\n== bo qua: ' + label);
    continue;
  }
  console.log('\n== ' + label + '  (' + file + ')');
  const run = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  if (run.status !== 0) {
    console.error('\nDUNG o buoc "' + label + '" - sua loi phia tren roi chay lai.');
    process.exit(run.status || 1);
  }
}
console.log('\nXONG - zip nam trong exports/. Tai len Sapo: Giao dien > Tai len giao dien.');
