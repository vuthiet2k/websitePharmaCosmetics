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
const { spawnSync } = require('child_process');
const { Liquid } = require('liquidjs');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'sapo-dist', 'assets');

function loadSettings() {
  const schema = JSON.parse(fs.readFileSync(path.join(rootDir, 'configs', 'settings_schema.json'), 'utf8'));
  const data = JSON.parse(fs.readFileSync(path.join(rootDir, 'configs', 'settings_data.json'), 'utf8'));
  const settings = {};
  for (const group of schema) {
    for (const setting of group.settings || []) {
      if (setting.id && 'default' in setting) settings[setting.id] = setting.default;
    }
  }
  return Object.assign(settings, data.current || {});
}

const PYTHON_COMPILER = `
import json, sys
try:
    import sass
except ImportError:
    print(json.dumps({"missing": True})); sys.exit(0)
files = json.load(sys.stdin)
errors = {}
for name, source in files.items():
    try:
        sass.compile(string=source, output_style="compressed")
    except sass.CompileError as error:
        errors[name] = str(error).strip().splitlines()[0][:300]
print(json.dumps({"errors": errors, "version": sass.libsass_version}))
`;

async function main() {
  if (!fs.existsSync(assetsDir)) throw new Error('chưa có sapo-dist/assets — chạy compile:sapo trước');
  const engine = new Liquid({ strictFilters: false, strictVariables: false });
  for (const filter of ['asset_url', 'img_url', 'file_url', 'bizweb_asset_url']) engine.registerFilter(filter, (value) => String(value));
  const settings = loadSettings();

  // Mọi asset .bwt (cả .js.bwt) đi chung lô biên dịch của Sapo ⇒ Liquid lỗi ở bất kỳ file nào cũng chặn.
  const sources = {};
  const liquidErrors = [];
  for (const fileName of fs.readdirSync(assetsDir).filter((name) => name.endsWith('.bwt'))) {
    try {
      const rendered = await engine.parseAndRender(fs.readFileSync(path.join(assetsDir, fileName), 'utf8'), { settings });
      if (fileName.endsWith('.scss.bwt')) sources[fileName] = rendered;
    } catch (error) {
      liquidErrors.push(`${fileName}: ${error.message.split('\n')[0]}`);
    }
  }
  if (liquidErrors.length) throw new Error(`Liquid lỗi trong asset .bwt:\n  ✗ ${liquidErrors.join('\n  ✗ ')}`);

  const input = JSON.stringify(sources);
  let result = null;
  const pythonErrors = [];
  // PYTHONUTF8: Windows mặc định đọc stdin bằng cp1258 ⇒ vỡ với ký tự ngoài bảng mã (→, emoji) trong SCSS.
  const env = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };
  for (const python of ['python', 'python3', 'py']) {
    const run = spawnSync(python, ['-c', PYTHON_COMPILER], { input, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
    if (run.error || run.status !== 0) {
      pythonErrors.push(`${python}: ${run.error ? run.error.code : (run.stderr || '').trim().split('\n').pop()}`);
      continue;
    }
    result = JSON.parse(run.stdout.trim().split('\n').pop());
    break;
  }
  if (!result || result.missing) {
    throw new Error('không chạy được Python + libsass — cài bằng `pip install libsass` rồi chạy lại (bắt buộc: Sapo biên dịch SCSS bằng libsass).'
      + (pythonErrors.length ? ` Chi tiết: ${pythonErrors.join(' | ')}` : ''));
  }

  const failed = Object.entries(result.errors);
  if (failed.length) {
    console.error(`[check:libsass] FAIL — ${failed.length}/${Object.keys(sources).length} file SCSS lỗi với libsass ${String(result.version).replace(/"/g, "")}`
      + ' (Sapo sẽ trả RỖNG mọi asset .bwt):');
    for (const [name, message] of failed) console.error(`  ✗ ${name}: ${message}`);
    process.exit(1);
  }
  console.log(`[check:libsass] PASS — ${Object.keys(sources).length} file .scss.bwt biên dịch được bằng libsass ${String(result.version).replace(/"/g, "")}`);
}

main().catch((error) => {
  console.error(`[check:libsass] FAIL — ${error.message}`);
  process.exit(1);
});
