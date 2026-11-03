// N43 — đọc focusNoRing d1440 của 1 trang trong mọi báo cáo ui-verify ở ui-loop/reports/*.json (+ baseline.json).
// Chạy: node ui-loop/checks/N43-reports.mjs [path] [số báo cáo cuối]
import fs from 'node:fs';
const P = process.argv[2] || '/collections/all'; const LAST = +(process.argv[3] || 40);
const files = fs.readdirSync('ui-loop/reports').filter((f) => f.endsWith('.json')).sort().slice(-LAST).map((f) => 'ui-loop/reports/' + f);
files.push('ui-loop/baseline.json');
for (const f of files) {
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  const rows = j.pages || j.results || (Array.isArray(j) ? j : []);
  let r = Array.isArray(rows) ? rows.find((x) => x.path === P && x.vp === 'd1440') : null;
  if (!r && j[P]) r = { issues: j[P].d1440 || j[P]['d1440'] || {} };
  if (!r && j.pages && !Array.isArray(j.pages)) r = { issues: (j.pages[P] || {}).d1440 || {} };
  if (!r) continue;
  const iss = r.issues || r;
  console.log(f.replace('ui-loop/', '').padEnd(36), 'focusNoRing', String(iss.focusNoRing ?? '—').padStart(3), JSON.stringify((r.samples || {}).focusNoRing || ''));
}
