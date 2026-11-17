'use strict';

// Bước 0 của build:sapo — xoá staging sapo-dist/ và các zip exports/sapo-theme-*.zip cũ.
// Không đụng dist/ (output của npm run build / Vercel).
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const exportsDir = path.join(rootDir, 'exports');

fs.rmSync(path.join(rootDir, 'sapo-dist'), { recursive: true, force: true });
if (fs.existsSync(exportsDir)) {
  for (const name of fs.readdirSync(exportsDir)) {
    if (/^sapo-theme-.*\.zip$/i.test(name)) fs.rmSync(path.join(exportsDir, name), { force: true });
  }
}
console.log('[clean:sapo] Đã xoá sapo-dist/ và exports/sapo-theme-*.zip');
