#!/usr/bin/env node
/**
 * scripts/compliance-lint.js — REOPEN 2026-09-10 (ADR-007/T-95)
 *
 * Quét templates/snippets/data theo RULE-P0-02/RULE-P0-06 (xlsx
 * "Pharma Cosmetics-20260910T092731Z-1-001/Pharma Cosmetics/*.xlsx"):
 *   - Cấm nhắc tới cơ quan y tế nhà nước / hàm ý cấp phép chính thức
 *     ("Bộ Y Tế", "cấp phép", "chứng nhận y tế", "cơ quan y tế").
 *   - Danh xưng "Bác sĩ"/"BS." được CẢNH BÁO (không tự động throw lỗi build) vì đây là nội
 *     dung/tên riêng cần con người rà soát từng chỗ trước khi đổi sang "Chuyên gia" — đổi tự
 *     động có thể làm sai lệch bằng cấp chuyên khoa (CKI/CKII) đã ghi trong data/doctors.js.
 *
 * Đây là "Audit Gatekeeper" chạy CỤC BỘ (không phải CI/CD tự động, ADR-001/ADR-007) — evidence
 * E2 (log thực thi), người vận hành xem log rồi quyết định sửa/không sửa.
 *
 * Usage: node scripts/compliance-lint.js [--fail-on-warn]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['templates', 'snippets', 'layouts', 'data'];
const EXCLUDE_DIRS = ['node_modules', 'dist', '.git'];

// RULE-P0-06 — vi phạm CỨNG (build phải fail nếu gặp).
const BANNED_PATTERNS = [
  { re: /Bộ\s*Y\s*Tế/gi, label: 'Nhắc tới "Bộ Y Tế" (cơ quan y tế nhà nước)' },
  { re: /cấp\s*phép/gi, label: 'Ngôn từ "cấp phép" (hàm ý chứng nhận chính thức từ cơ quan quản lý)' },
  { re: /chứng\s*nhận\s*y\s*tế/gi, label: 'Ngôn từ "chứng nhận y tế"' },
  { re: /cơ\s*quan\s*y\s*tế/gi, label: 'Nhắc tới "cơ quan y tế"' },
];

// RULE-P0-02 — danh xưng CẢNH BÁO (cần rà soát thủ công, không tự throw).
const WARN_PATTERNS = [
  { re: /\bBS\.\s?CK[I]{1,2}\b/g, label: 'Danh xưng "BS. CKI/CKII" — cân nhắc chuẩn hoá "Chuyên gia"' },
  { re: /\bBác\s*sĩ\b/gi, label: 'Danh xưng "Bác sĩ" — cân nhắc chuẩn hoá "Chuyên gia" (RULE-P0-02)' },
];

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(bwt|js|json)$/.test(entry.name)) files.push(full);
  }
}

function scanFile(file, violations, warnings) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const lines = content.split('\n');

  for (const { re, label } of BANNED_PATTERNS) {
    lines.forEach((line, i) => {
      if (re.test(line)) violations.push({ file: rel, line: i + 1, label, text: line.trim().slice(0, 120) });
      re.lastIndex = 0;
    });
  }
  for (const { re, label } of WARN_PATTERNS) {
    lines.forEach((line, i) => {
      if (re.test(line)) warnings.push({ file: rel, line: i + 1, label, text: line.trim().slice(0, 120) });
      re.lastIndex = 0;
    });
  }
}

function main() {
  const files = [];
  for (const d of SCAN_DIRS) {
    const full = path.join(ROOT, d);
    if (fs.existsSync(full)) walk(full, files);
  }

  const violations = [];
  const warnings = [];
  for (const f of files) scanFile(f, violations, warnings);

  console.log(`compliance-lint: quét ${files.length} file trong [${SCAN_DIRS.join(', ')}]`);
  console.log(`  Vi phạm CỨNG (RULE-P0-06): ${violations.length}`);
  console.log(`  Cảnh báo danh xưng (RULE-P0-02): ${warnings.length}`);

  if (violations.length > 0) {
    console.log('\n=== VI PHẠM CỨNG ===');
    violations.forEach(v => console.log(`  ${v.file}:${v.line} — ${v.label}\n    "${v.text}"`));
  }

  const failOnWarn = process.argv.includes('--fail-on-warn');
  if (warnings.length > 0) {
    console.log(`\n=== CẢNH BÁO DANH XƯNG (${warnings.length} chỗ, xem log đầy đủ trong evidence file) ===`);
    console.log('  Không tự động sửa (cần rà soát thủ công từng trường hợp — xem T-95 resolution');
    console.log('  trong .project-agent/EXECUTION_PLAN.yaml để biết vì sao).');
  }

  if (violations.length > 0 || (failOnWarn && warnings.length > 0)) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

main();
