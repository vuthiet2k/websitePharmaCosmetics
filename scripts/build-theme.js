'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.resolve(rootDir, 'dist');
const themeDirectories = ['assets', 'configs', 'layouts', 'snippets', 'templates'];

// Only copy the Sapo theme structure. Development files, mock data, and
// node_modules are intentionally excluded from the deployment bundle.
if (outputDir === rootDir || !outputDir.startsWith(rootDir + path.sep)) {
  throw new Error(`Invalid output directory: ${outputDir}`);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const directory of themeDirectories) {
  const sourceDir = path.join(rootDir, directory);
  const destinationDir = path.join(outputDir, directory);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Required theme directory is missing: ${directory}`);
  }

  fs.cpSync(sourceDir, destinationDir, { recursive: true });
}

const fileCount = themeDirectories.reduce((total, directory) => (
  total + fs.readdirSync(path.join(outputDir, directory), { recursive: true }).length
), 0);

console.log(`Theme deployment package created: ${path.relative(rootDir, outputDir)} (${fileCount} entries)`);
