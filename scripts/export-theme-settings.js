const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function exportSettings(outputDirectory) {
  const root = path.resolve(__dirname, '..');
  const output = path.resolve(root, outputDirectory || 'exports/theme-settings/current');
  fs.mkdirSync(output, { recursive: true });
  const schemaText = fs.readFileSync(path.join(root, 'configs/settings_schema.json'), 'utf8');
  const dataText = fs.readFileSync(path.join(root, 'configs/settings_data.json'), 'utf8');
  const schema = JSON.parse(schemaText);
  const data = JSON.parse(dataText);
  const current = data.current || {};
  fs.writeFileSync(path.join(output, 'settings_schema.json'), schemaText);
  fs.writeFileSync(path.join(output, 'settings_data.json'), dataText);
  const writeJson = (file, value) => fs.writeFileSync(path.join(output, file), JSON.stringify(value, null, 2) + '\n');
  writeJson('current.json', current);
  const groups = [];
  const rows = [['Nhóm', 'ID', 'Nhãn', 'Kiểu', 'Đã lưu', 'Giá trị đang lưu', 'Giá trị mặc định']];
  const known = new Set();
  for (const [index, group] of schema.entries()) {
    const slug = group.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const file = `${String(index + 1).padStart(2, '0')}-${slug}.json`;
    const values = {};
    for (const field of group.settings || []) {
      if (!field.id) continue;
      known.add(field.id);
      const saved = Object.prototype.hasOwnProperty.call(current, field.id);
      if (saved) values[field.id] = current[field.id];
      rows.push([group.name, field.id, field.label || '', field.type, saved ? 'Có' : 'Chưa', saved ? current[field.id] : '', field.default ?? '']);
    }
    writeJson(file, { group: group.name, values, fields: group.settings });
    groups.push({ name: group.name, file, saved: Object.keys(values).length });
  }
  const unmapped = Object.fromEntries(Object.entries(current).filter(([id]) => !known.has(id)));
  writeJson('unmapped.json', unmapped);
  for (const [id, value] of Object.entries(unmapped)) rows.push(['Chưa có trong schema', id, '', '', 'Có', value, '']);
  const csv = value => {
    let str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/^[=+@-]/.test(str)) str = "'" + str;
    return '"' + str.replace(/"/g, '""') + '"';
  };
  fs.writeFileSync(path.join(output, 'settings.csv'), '\uFEFF' + rows.map(row => row.map(csv).join(',')).join('\r\n') + '\r\n');
  writeJson('manifest.json', {
    source: 'configs/settings_data.json (current); no local environment or preview overrides',
    count: Object.keys(current).length,
    unmapped: Object.keys(unmapped).length,
    sha256: crypto.createHash('sha256').update(dataText).digest('hex'),
    groups,
  });
  fs.writeFileSync(path.join(output, 'README.md'), '# Dữ liệu cấu hình đang lưu\n\n' +
    '- `settings.csv`: bảng kiểm tra bằng Excel, có nhãn và nhóm cấu hình.\n' +
    '- `current.json`: toàn bộ giá trị hiện tại.\n' +
    '- `settings_data.json` và `settings_schema.json`: bản xuất nguyên vẹn để đối chiếu/khôi phục.\n' +
    '- Các JSON đánh số: dữ liệu tách theo từng nhóm, kèm định nghĩa trường.\n' +
    '- `unmapped.json`: các giá trị chưa có định nghĩa trong schema.\n\n' +
    'Đây là bản xuất để kiểm tra. Website vẫn đọc `configs/settings_data.json` theo chuẩn Sapo; chỉnh bản xuất không tự thay đổi website.\n');
  return { output: path.relative(root, output), count: Object.keys(current).length, groups: groups.length, unmapped: Object.keys(unmapped).length };
}

if (require.main === module) console.log(JSON.stringify(exportSettings(process.argv[2])));
module.exports = { exportSettings };
