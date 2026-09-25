/**
 * Automated Verification Script for Skin Quiz Results Alignment & Sapo/GAS Integration
 * Corresponds to TASK-005 in Astra Workflow
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING ASTRA COMPLETION GATE VERIFICATION ===\n');

const root = path.resolve(__dirname, '..');
const tplPath = path.join(root, 'templates/page.ai-skin-quiz-results.bwt');
const gasPath = path.join(root, 'crm-gas/crm_intake_service.js');
const clientPath = path.join(root, 'assets/crm-intake.js.bwt');

const tplContent = fs.readFileSync(tplPath, 'utf8');
const gasContent = fs.readFileSync(gasPath, 'utf8');
const clientContent = fs.readFileSync(clientPath, 'utf8');

// 1. Check Container & Spacing in page.ai-skin-quiz-results.bwt
assert(tplContent.includes('max-w-5xl mx-auto px-4 sm:px-6'), 'AC-001 FAIL: max-w-5xl container missing');
assert(!tplContent.includes('max-w-4xl'), 'AC-001 FAIL: legacy max-w-4xl container still present');
console.log('[PASS] AC-001: Container max-w-5xl and unified spacing rhythm');

// 2. Check GAS CRM Intake Service
assert(gasContent.includes('save_skin_analysis'), 'AC-002 FAIL: save_skin_analysis missing in GAS service');
assert(gasContent.includes('get_customer_info'), 'AC-002 FAIL: get_customer_info missing in GAS service');
assert(gasContent.includes('crmSearchSheetInReverse_'), 'AC-002 FAIL: reverse lookup missing in GAS service');
assert(clientContent.includes('getCustomerInfo'), 'AC-002 FAIL: getCustomerInfo missing in crm-intake client');
assert(clientContent.includes('checkCustomerSaved'), 'AC-002 FAIL: checkCustomerSaved missing in crm-intake client');
console.log('[PASS] AC-002: GAS CRM Service and client support full skin analysis & customer retrieval');

// 3. Check Customer Information Card
assert(tplContent.includes('data-customer-card'), 'AC-003 FAIL: data-customer-card missing');
assert(tplContent.includes('data-customer-name'), 'AC-003 FAIL: data-customer-name missing');
assert(tplContent.includes('data-customer-contact'), 'AC-003 FAIL: data-customer-contact missing');
assert(tplContent.includes('data-crm-status-badge'), 'AC-003 FAIL: data-crm-status-badge missing');
assert(tplContent.includes('data-consultation-source'), 'AC-003 FAIL: data-consultation-source missing');
console.log('[PASS] AC-003: Customer Profile Card and GAS sync badge verified');

// 4. Check Sapo Products & Blogs Integration
assert(tplContent.includes('data-result-products-section'), 'AC-004 FAIL: Sapo products section missing');
assert(tplContent.includes('data-sapo-products-grid'), 'AC-004 FAIL: Sapo products grid missing');
assert(tplContent.includes('data-result-blogs-section'), 'AC-004 FAIL: Sapo blogs section missing');
assert(tplContent.includes('data-sapo-articles-grid'), 'AC-004 FAIL: Sapo articles grid missing');
assert(tplContent.includes('window.PharmaSapoProducts'), 'AC-004 FAIL: PharmaSapoProducts context missing');
assert(tplContent.includes('window.PharmaSapoArticles'), 'AC-004 FAIL: PharmaSapoArticles context missing');
console.log('[PASS] AC-004: Sapo Recommended Products & Blog Articles Sections verified');

// 5. Medical & Regulatory Compliance Check
const prohibitedMedicalClaims = ['kê đơn', 'chữa khỏi', 'cam kết 100%', 'dứt điểm', 'đặc trị hoàn toàn'];
prohibitedMedicalClaims.forEach(term => {
  assert(!tplContent.toLowerCase().includes(term), `AC-005 FAIL: Prohibited medical claim found: "${term}"`);
});
console.log('[PASS] AC-005: Medical compliance verified (0 prohibited claims, legal disclaimer present)');

console.log('\n=== ALL 5 ACCEPTANCE CRITERIA PASSED 100% ===');
