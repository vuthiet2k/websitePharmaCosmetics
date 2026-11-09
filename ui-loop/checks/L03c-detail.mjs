// L03c — in chi tiết ảnh vi phạm từ ui-loop/evidence/L03c/<nhãn>.json (do L03c.mjs ghi). Chạy: node ui-loop/checks/L03c-detail.mjs before
import fs from 'node:fs';
const LABEL = process.argv[2] || 'before';
const a = JSON.parse(fs.readFileSync(`ui-loop/evidence/L03c/${LABEL}.json`, 'utf8'));
const lines = [];
for (const [p, v] of Object.entries(a)) {
  lines.push('\n## ' + p);
  for (const [k, dpr] of [['m390', 3], ['d1440', 1]]) {
    const inv = v[k];
    for (const i of inv.imgs.filter((x) => x.visible && x.nw > 1)) {
      const fl = [];
      if (!/svg/.test(i.fmt) && i.nw > i.dw * dpr * 1.5) fl.push(`QUÁ CỠ ${i.nw}x${i.nh}→${i.dw}x${i.dh}`);
      if ((i.bytes || 0) > 200 * 1024) fl.push(`NẶNG ${Math.round(i.bytes / 1024)}KB`);
      if (i.fold && i.loading === 'lazy') fl.push('MÀN ĐẦU lazy');
      if (!i.fold && i.loading !== 'lazy') fl.push('dưới màn đầu không lazy');
      if (fl.length) lines.push(`  ${k} ${fl.join(' | ')} :: ${i.fmt} ${i.bytes == null ? '' : Math.round(i.bytes / 1024) + 'KB'} ${i.src.replace(/^https?:\/\//, '').slice(0, 110)}`);
    }
    lines.push(`  ${k} preload ${JSON.stringify(inv.preloads).slice(0, 200)}`);
  }
}
fs.writeFileSync(`ui-loop/evidence/L03c/${LABEL}-detail.txt`, lines.join('\n'));
console.log(lines.join('\n'));
