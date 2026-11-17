'use strict';

/*
 * Biên dịch SCSS bằng LIBSASS (cùng bộ biên dịch Sapo dùng) qua Python + gói `libsass`.
 * Dùng chung cho compile:sapo (biên dịch sẵn SCSS không có Liquid) và check:libsass.
 */

const { spawnSync } = require('child_process');

const PYTHON_COMPILER = `
import json, sys
try:
    import sass
except ImportError:
    print(json.dumps({"missing": True})); sys.exit(0)
files = json.load(sys.stdin)
mode = files.pop("__mode__", "check")
errors, outputs = {}, {}
for name, source in files.items():
    try:
        css = sass.compile(string=source, output_style="compressed")
        if mode == "compile": outputs[name] = css
    except sass.CompileError as error:
        errors[name] = str(error).strip().splitlines()[0][:300]
print(json.dumps({"errors": errors, "outputs": outputs, "version": sass.libsass_version}))
`;

// sources: { tên: mã SCSS }. mode 'compile' trả thêm CSS đã biên dịch.
function runLibsass(sources, mode = 'check') {
  const input = JSON.stringify({ ...sources, __mode__: mode });
  const pythonErrors = [];
  // PYTHONUTF8: Windows mặc định đọc stdin bằng cp1258 ⇒ vỡ với ký tự ngoài bảng mã (→, emoji) trong SCSS.
  const env = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };
  for (const python of ['python', 'python3', 'py']) {
    const run = spawnSync(python, ['-c', PYTHON_COMPILER], { input, encoding: 'utf8', env, maxBuffer: 256 * 1024 * 1024 });
    if (run.error || run.status !== 0) {
      pythonErrors.push(`${python}: ${run.error ? run.error.code : (run.stderr || '').trim().split('\n').pop()}`);
      continue;
    }
    const result = JSON.parse(run.stdout.trim().split('\n').pop());
    if (result.missing) break;
    result.version = String(result.version).replace(/"/g, '');
    return result;
  }
  throw new Error('không chạy được Python + libsass — cài bằng `pip install libsass` rồi chạy lại (bắt buộc: Sapo biên dịch SCSS bằng libsass).'
    + (pythonErrors.length ? ` Chi tiết: ${pythonErrors.join(' | ')}` : ''));
}

module.exports = { runLibsass };
