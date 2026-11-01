// N38 tiêu chí (c): chạy N lượt `ui-verify --quick /collections/all` liên tiếp, so webkit390 với m390 (touch<44, noName).
// Chạy: node ui-loop/checks/N38-quick.mjs <số lượt> <số bắt đầu>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const N = +(process.argv[2] || 5); const START = +(process.argv[3] || 1);
const OUT = 'ui-loop/evidence/N38'; fs.mkdirSync(OUT, { recursive: true });
let bad = 0;
for (let k = START; k < START + N; k++) {
  let txt = '';
  try { txt = execFileSync('node', ['scripts/ui-verify.mjs', '--quick', '/collections/all'], { encoding: 'utf8', maxBuffer: 1 << 26 }); }
  catch (e) { txt = (e.stdout || '') + (e.stderr || ''); }
  fs.writeFileSync(`${OUT}/quick-${k}.txt`, txt);
  const rep = (txt.match(/Báo cáo: (\S+\.json)/) || [])[1];
  const cmp = (txt.match(/So baseline[^\n]*/) || ['?'])[0];
  const j = JSON.parse(fs.readFileSync(rep, 'utf8'));
  const rows = (j.pages || j.results || []).filter((r) => r.path === '/collections/all');
  const g = (vp) => { const r = rows.find((x) => x.vp === vp) || { issues: {} }; return `${r.issues['touch<44'] ?? 0}/${r.issues.noName ?? 0}`; };
  const wk = g('webkit390'), m = g('m390');
  if (wk !== m) bad++;
  console.log(`lượt ${k}: webkit390 ${wk} · m390 ${m} ${wk === m ? '=' : '≠'} — ${cmp} — ${rep}`);
}
console.log(`KHÁC m390: ${bad}/${N}`);
process.exit(bad ? 1 : 0);
