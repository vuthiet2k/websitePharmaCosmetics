#!/usr/bin/env node
/**
 * scripts/overhaul-tracker.mjs — External State Authority & Anti-Skip Gate (Astra + Gemini Spark v3.2)
 * Quản lý trạng thái và kiểm định cơ học cho lệnh /goal trên Antigravity (Gemini 3.8 Flash + Claude/GPT).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const CHECKLIST_FILE = path.join(ROOT, 'ui-loop', 'OVERHAUL-CHECKLIST.json');

const readUtf8 = (rel) => fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : '';
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

function runCmd(cmd) {
  try {
    const res = execSync(cmd, { cwd: ROOT, stdio: 'pipe', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    return { ok: true, out: res ? res.toString() : '' };
  } catch (err) {
    return { ok: false, out: (err.stdout?.toString() || '') + '\n' + (err.stderr?.toString() || err.message) };
  }
}

function loadChecklist() {
  if (!fs.existsSync(CHECKLIST_FILE)) {
    console.error(`[OVERHAUL-ERROR] Không tìm thấy file checklist: ${CHECKLIST_FILE}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CHECKLIST_FILE, 'utf8'));
}

function saveChecklist(data) {
  fs.writeFileSync(CHECKLIST_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function evaluateBatch(batchId) {
  const errors = [];

  if (batchId === 'BATCH-01') {
    const pkg = JSON.parse(readUtf8('package.json') || '{}');
    if (!pkg.scripts?.['overhaul:status'] || !pkg.scripts?.['overhaul:verify']) {
      errors.push('package.json thiếu script overhaul:status hoặc overhaul:verify');
    }
    const goal = readUtf8('.claude/commands/goal.md');
    if (!goal.includes('overhaul-tracker.mjs')) {
      errors.push('.claude/commands/goal.md chưa tích hợp cổng overhaul-tracker.mjs');
    }
    if (!exists('ui-loop/OVERHAUL-CHECKLIST.json')) {
      errors.push('Chưa khởi tạo ui-loop/OVERHAUL-CHECKLIST.json');
    }
  }

  if (batchId === 'BATCH-02') {
    const pdp = readUtf8('templates/product.bwt');
    const pdpCss = readUtf8('assets/page_product.scss.bwt');
    if (pdp.includes('pc-pdp-trust__origin') || pdp.includes('pc_xuatxu')) {
      errors.push('BUG-02: templates/product.bwt vẫn còn khối pc-pdp-trust__origin hoặc biến pc_xuatxu');
    }
    if (pdp.includes("new Swiper('.product-relate-swiper'")) {
      errors.push('BUG-04: templates/product.bwt vẫn còn khởi tạo new Swiper cho .product-relate-swiper');
    }
    if (!pdp.includes('a-sku notranslate font-bold text-primary')) {
      errors.push('BUG-01: templates/product.bwt thiếu class font-bold text-primary trên .a-sku');
    }
    if (pdp.includes('product_sku.html("Mã: <span class=\'a-sku notranslate\'')) {
      errors.push('BUG-01: Hàm selectCallback trong templates/product.bwt vẫn ghi đè mất class font-bold text-primary của .a-sku');
    }
    if (pdpCss.includes('.pc-pdp-trust__origin')) {
      errors.push('BUG-02: assets/page_product.scss.bwt vẫn còn selector .pc-pdp-trust__origin');
    }
  }

  if (batchId === 'BATCH-03') {
    const tokens = readUtf8('snippets/design_tokens.bwt');
    if (tokens.includes('data-theme="dark"') || /#112A1E/i.test(tokens)) {
      errors.push('BUG-02: snippets/design_tokens.bwt vẫn còn khối :root[data-theme="dark"] hoặc mã màu #112A1E');
    }
    if (!tokens.includes('color-scheme: light')) {
      errors.push('UI-0.5: snippets/design_tokens.bwt mất khai báo color-scheme: light');
    }
  }

  if (batchId === 'BATCH-04') {
    const tab = readUtf8('snippets/tab_product.bwt');
    if (!tab.includes("replace: '<b ', '<span '") || !tab.includes("replace: '</b>', '</span>'")) {
      errors.push('BUG-03: snippets/tab_product.bwt chưa có bộ lọc replace thẻ <b  thành <span ');
    }
    const fallbackPart = tab.split('id="tab-1"')[1] || '';
    if (fallbackPart.includes('product.content') && !fallbackPart.includes('pc_clean_content')) {
      errors.push('BUG-03: Nhánh fallback #tab-1 trong snippets/tab_product.bwt vẫn đọc product.content gốc chưa lọc thẻ <b ');
    }
  }

  if (batchId === 'BATCH-05') {
    if (exists('assets/comp_article_card.scss.bwt')) {
      errors.push('BUG-06: Chưa xoá file assets/comp_article_card.scss.bwt');
    }
    if (readUtf8('snippets/header_style.bwt').includes('comp_article_card')) {
      errors.push('BUG-06: snippets/header_style.bwt vẫn còn dòng nạp comp_article_card.scss.css');
    }
    const acard = readUtf8('snippets/pc_article_card.bwt');
    if (acard.includes('pc-acard')) {
      errors.push('UI-0.2: snippets/pc_article_card.bwt vẫn còn class cũ .pc-acard');
    }
    if (!acard.includes('PharmaCosmetics.svg') || !acard.includes('object-contain')) {
      errors.push('BUG-05: snippets/pc_article_card.bwt chưa fallback về PharmaCosmetics.svg với object-contain nền trắng');
    }
    if (!acard.includes('flex-wrap') || !acard.includes('whitespace-nowrap')) {
      errors.push('BUG-06: snippets/pc_article_card.bwt thiếu flex-wrap hoặc whitespace-nowrap ở chân thẻ');
    }
  }

  if (batchId === 'BATCH-06') {
    const uikit = readUtf8('templates/page.ui-kit.bwt');
    const cardIncludes = (uikit.match(/include\s+'ui_product_card'/g) || []).length;
    if (cardIncludes < 2) {
      errors.push('BUG-07: templates/page.ui-kit.bwt phải gọi trực tiếp include ui_product_card ở cả mục 4 và mục 5');
    }
  }

  if (batchId === 'BATCH-07') {
    const viewed = readUtf8('snippets/section_product_viewed.bwt');
    if (viewed.includes('<style>') || viewed.includes('new Swiper')) {
      errors.push('BUG-04: snippets/section_product_viewed.bwt vẫn còn thẻ <style> hoặc new Swiper');
    }
    if (!viewed.includes('snap-x')) {
      errors.push('BUG-04: snippets/section_product_viewed.bwt chưa chuyển sang cuộn ngang snap-x Tailwind');
    }
  }

  if (batchId === 'BATCH-08') {
    if (exists('snippets/clinical_proof_body.bwt')) {
      errors.push('TASK-004: Chưa xoá file snippets/clinical_proof_body.bwt (snippet mồ côi)');
    }
    const cfgRes = runCmd('python scripts/export-config-sheet.py --check');
    if (!cfgRes.ok) {
      errors.push('lint:config FAIL sau khi dọn snippet mồ côi: ' + cfgRes.out.slice(0, 150));
    }
  }

  if (batchId === 'BATCH-09') {
    const deadUi = ['ui_badge.bwt', 'ui_button.bwt', 'ui_fab.bwt', 'ui_toast.bwt', 'ui_field.bwt', 'ui_action_bar.bwt', 'ui_swiper_nav.bwt', 'ui_modal.bwt'];
    const stillExist = deadUi.filter(f => exists(path.join('snippets', f)));
    if (stillExist.length > 0) {
      errors.push(`TASK-004: Vẫn còn các file ui_* vụn vặt chưa xoá: ${stillExist.join(', ')}`);
    }
  }

  if (batchId === 'BATCH-10') {
    const schema = JSON.parse(readUtf8('configs/settings_schema.json') || '[]');
    let paraCount = 0;
    let verboseInfoCount = 0;
    for (const sec of schema) {
      for (const f of (sec.settings || [])) {
        if (f.type === 'paragraph') paraCount++;
        if (f.info && f.type !== 'image') verboseInfoCount++;
      }
    }
    if (paraCount > 0 || verboseInfoCount > 0) {
      errors.push(`REQ-009: settings_schema.json vẫn còn ${paraCount} paragraph và ${verboseInfoCount} thuộc tính info thừa`);
    }
  }

  if (batchId === 'BATCH-11') {
    const schemaRaw = readUtf8('configs/settings_schema.json');
    if (schemaRaw.includes('_1_title') && schemaRaw.includes('_6_title')) {
      errors.push('REQ-009: Vẫn còn các họ ô nhập tay giả lập *_1_title..*_6_title trong settings_schema.json');
    }
  }

  if (batchId === 'BATCH-12') {
    const del12 = ['comp_breadcrumb.scss.bwt', 'page_404.scss.bwt', 'page_loyalty.scss.bwt', 'page_seo_directory.scss.bwt', 'page_patient_portal.scss.bwt', 'page_chuyen_gia.scss.bwt'];
    const remain12 = del12.filter(f => exists(path.join('assets', f)));
    if (remain12.length > 0) {
      errors.push(`TASK-006: Chưa xoá đủ 6 file SCSS đợt 1: ${remain12.join(', ')}`);
    }
  }

  if (batchId === 'BATCH-13') {
    const del13 = ['comp_sidebar.scss.bwt', 'comp_footer_categories.scss.bwt', 'page_blog_feed.scss.bwt', 'page_search.scss.bwt', 'comp_most_view.scss.bwt', 'page_contact.scss.bwt', 'page_promo.scss.bwt'];
    const remain13 = del13.filter(f => exists(path.join('assets', f)));
    if (remain13.length > 0) {
      errors.push(`TASK-006: Chưa xoá đủ 7 file SCSS đợt 2: ${remain13.join(', ')}`);
    }
  }

  if (batchId === 'BATCH-14') {
    const buildRes = runCmd('npm run build:sapo');
    if (!buildRes.ok) {
      errors.push('npm run build:sapo FAIL sau BATCH-14: ' + buildRes.out.slice(0, 150));
    }
  }

  if (batchId === 'BATCH-15') {
    if (!exists('ui-loop/checks/overhaul-mobile-real-device.mjs')) {
      errors.push('Chưa tạo ui-loop/checks/overhaul-mobile-real-device.mjs');
    }
  }

  if (batchId === 'BATCH-16') {
    const buildRes = runCmd('npm run build:sapo');
    if (!buildRes.ok) errors.push('Cổng build:sapo cuối chưa PASS');
  }

  return { ok: errors.length === 0, errors };
}

function handleStatus() {
  const checklist = loadChecklist();
  console.log(`\n========================================================================`);
  console.log(` PHARMA COSMETICS OVERHAUL STATUS — ${checklist.plan_id} (Rev ${checklist.revision})`);
  console.log(`========================================================================`);

  let pendingFound = null;
  let doneCount = 0;

  for (const b of checklist.batches) {
    const icon = b.status === 'DONE' ? '✅' : (b.status === 'VERIFY_FAIL' ? '❌' : '⏳');
    console.log(`${icon} [${b.id}] (${b.task_id}) ${b.name.padEnd(46)} : ${b.status} (lần: ${b.attempts}) [${b.assigned_model}]`);
    if (b.status === 'DONE') doneCount++;
    if (!pendingFound && (b.status === 'PENDING' || b.status === 'VERIFY_FAIL')) {
      pendingFound = b;
    }
  }

  const pct = Math.round((doneCount / checklist.batches.length) * 100);
  console.log(`------------------------------------------------------------------------`);
  console.log(`Tiến độ tổng: ${doneCount}/${checklist.batches.length} Batches (${pct}%)`);
  if (pendingFound) {
    console.log(`👉 BATCH TIẾP THEO: [${pendingFound.id}] ${pendingFound.name}`);
    console.log(`   Model phụ trách: ${pendingFound.assigned_model}`);
    console.log(`   File mục tiêu  : ${pendingFound.target_files.join(', ')}`);
    if (pendingFound.attempts >= 2 && pendingFound.status === 'VERIFY_FAIL') {
      console.log(`\n⚠️  [MODEL-ESCALATION-REQUIRED]: ${pendingFound.id} đã thất bại >= 2 lần trên model hiện tại.`);
      console.log(`   Hãy chuyển model sang Claude Sonnet / GPT cơ bản trên Antigravity để tiếp tục.`);
    }
  } else {
    console.log(`🎉 TẤT CẢ 16 BATCHES ĐÃ HOÀN TẤT XUẤT SẮC!`);
  }
  console.log(`========================================================================\n`);
  process.exit(0);
}

function handleVerify(batchId) {
  if (!batchId) {
    console.error('[OVERHAUL-ERROR] Cần cung cấp mã Batch: node scripts/overhaul-tracker.mjs --verify BATCH-xx');
    process.exit(1);
  }

  const checklist = loadChecklist();
  const batch = checklist.batches.find(b => b.id === batchId);
  if (!batch) {
    console.error(`[OVERHAUL-ERROR] Không tìm thấy batchId: ${batchId}`);
    process.exit(1);
  }

  // Kiểm tra phụ thuộc
  for (const depId of batch.depends_on) {
    const dep = checklist.batches.find(b => b.id === depId);
    if (!dep || dep.status !== 'DONE') {
      console.error(`[OVERHAUL-GATE-FAIL] ${batchId} bị chặn bởi phụ thuộc: ${depId} đang có trạng thái ${dep?.status || 'UNKNOWN'}`);
      process.exit(1);
    }
  }

  console.log(`[OVERHAUL-GATE] Đang kiểm tra cơ học cho: [${batchId}] ${batch.name}...`);
  const result = evaluateBatch(batchId);

  if (!result.ok) {
    batch.status = 'VERIFY_FAIL';
    batch.attempts = (batch.attempts || 0) + 1;
    batch.last_errors = result.errors;
    batch.last_verified_at = new Date().toISOString();
    saveChecklist(checklist);

    console.error(`\n❌ [GATE-REJECTED] ${batchId} KHÔNG ĐẠT CỔNG KIỂM ĐỊNH (Lần thử ${batch.attempts}):`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    console.error(`\nModel cần sửa lại đúng các lỗi trên trước khi chạy lại --verify!\n`);
    process.exit(1);
  }

  batch.status = 'DONE';
  batch.verified_at = new Date().toISOString();
  batch.last_errors = [];
  saveChecklist(checklist);

  console.log(`\n✅ [GATE-PASSED] ${batchId} ĐÃ VƯỢT QUA 100% CỔNG KIỂM ĐỊNH CƠ HỌC!`);
  console.log(`   Trạng thái đã được ghi nhận: DONE.`);
  console.log(`   Bước tiếp theo: git add <files> ui-loop/OVERHAUL-CHECKLIST.json && git commit`);
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.includes('--status')) {
  handleStatus();
} else if (args.includes('--verify')) {
  const bIndex = args.indexOf('--verify');
  handleVerify(args[bIndex + 1]);
} else {
  console.log('Sử dụng:');
  console.log('  node scripts/overhaul-tracker.mjs --status');
  console.log('  node scripts/overhaul-tracker.mjs --verify BATCH-xx');
  process.exit(0);
}
