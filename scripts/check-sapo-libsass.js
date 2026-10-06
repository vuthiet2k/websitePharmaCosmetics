'use strict';

/*
 * Bước kiểm tra của build:sapo — biên dịch thử mọi assets/*.scss.bwt trong sapo-dist/ bằng LIBSASS
 * (cùng bộ biên dịch Sapo dùng), sau khi render Liquid bằng giá trị thật (schema default + settings_data
 * current) giống Sapo làm trước khi biên dịch.
 *
 * Vì sao: 2026-10-05 Sapo biên dịch asset .bwt theo lô — 1 file SCSS lỗi (vd `min(100%, 520px)`:
 * "Incompatible units") làm MỌI asset .bwt trả 200 rỗng, cả site mất CSS/JS. Bản preview dùng dart-sass
 * (dễ tính hơn) nên không lộ lỗi. Dart-sass PASS ≠ Sapo PASS.
 *
 * Cần Python + gói `libsass` (pip install libsass). Thiếu thì báo FAIL kèm cách cài — không bỏ qua im lặng.
 */

const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');
const { runLibsass } = require('./lib/libsass');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'sapo-dist', 'assets');

function loadSettings() {
  const schema = JSON.parse(fs.readFileSync(path.join(rootDir, 'configs', 'settings_schema.json'), 'utf8'));
  const data = JSON.parse(fs.readFileSync(path.join(rootDir, 'configs', 'settings_data.json'), 'utf8'));
  const settings = {};
  const types = {};
  for (const group of schema) {
    for (const setting of group.settings || []) {
      if (!setting.id) continue;
      types[setting.id] = setting.type;
      if ('default' in setting) settings[setting.id] = setting.default;
    }
  }
  return { settings: Object.assign(settings, data.current || {}), types };
}

// 2026-10-05: biên dịch dưới nhiều bộ cấu hình — admin xoá trắng 1 ô màu (vd `$main-color: {{ settings.x }};`)
// làm libsass lỗi ⇒ Sapo trả rỗng MỌI asset .bwt. Mỗi biến SCSS lấy từ settings phải có `| default:`.
function buildVariants({ settings, types }) {
  const pick = (kinds, value) => Object.fromEntries(Object.keys(types).filter((id) => kinds.includes(types[id])).map((id) => [id, value]));
  return {
    'cấu hình hiện tại': settings,
    'mọi checkbox bật': { ...settings, ...pick(['checkbox'], true) },
    'mọi checkbox tắt': { ...settings, ...pick(['checkbox'], false) },
    'text/màu/select để trống': { ...settings, ...pick(['text', 'textarea', 'color', 'select'], '') },
  };
}

async function main() {
  if (!fs.existsSync(assetsDir)) throw new Error('chưa có sapo-dist/assets — chạy compile:sapo trước');
  const engine = new Liquid({ strictFilters: false, strictVariables: false });
  for (const filter of ['asset_url', 'img_url', 'file_url', 'bizweb_asset_url']) engine.registerFilter(filter, (value) => String(value));
  const variants = buildVariants(loadSettings());
  const SEP = ' :: ';

  // Mọi asset .bwt (cả .js.bwt) đi chung lô biên dịch của Sapo ⇒ Liquid lỗi ở bất kỳ file nào cũng chặn.
  const sources = {};
  const liquidErrors = [];
  const assetFiles = fs.readdirSync(assetsDir).filter((name) => name.endsWith('.bwt'));
  for (const [variant, settings] of Object.entries(variants)) {
    for (const fileName of assetFiles) {
      try {
        const rendered = await engine.parseAndRender(fs.readFileSync(path.join(assetsDir, fileName), 'utf8'), { settings });
        if (fileName.endsWith('.scss.bwt')) sources[`${fileName}${SEP}${variant}`] = rendered;
      } catch (error) {
        liquidErrors.push(`${fileName} [${variant}]: ${error.message.split('\n')[0]}`);
      }
    }
  }
  if (liquidErrors.length) throw new Error(`Liquid lỗi trong asset .bwt:\n  ✗ ${liquidErrors.join('\n  ✗ ')}`);
  const scssCount = assetFiles.filter((name) => name.endsWith('.scss.bwt')).length;

  const result = runLibsass(sources);

  const failed = Object.entries(result.errors);
  if (failed.length) {
    console.error(`[check:libsass] FAIL — ${failed.length} lượt biên dịch SCSS lỗi với libsass ${result.version}`
      + ' (Sapo sẽ trả RỖNG mọi asset .bwt):');
    for (const [name, message] of failed) console.error(`  ✗ ${name}: ${message}`);
    process.exit(1);
  }
  console.log(`[check:libsass] PASS — ${scssCount} file .scss.bwt × ${Object.keys(variants).length} bộ cấu hình biên dịch được bằng libsass ${result.version}`);
}

main().catch((error) => {
  console.error(`[check:libsass] FAIL — ${error.message}`);
  process.exit(1);
});
