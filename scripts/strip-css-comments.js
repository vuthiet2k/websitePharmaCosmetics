'use strict';

const fs = require('fs');
const path = require('path');

const target = process.argv[2];

if (!target) {
  throw new Error('Usage: node scripts/strip-css-comments.js <css-file>');
}

const filePath = path.resolve(process.cwd(), target);
const css = fs.readFileSync(filePath, 'utf8');
const withoutComments = css.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '');

fs.writeFileSync(filePath, withoutComments, 'utf8');
