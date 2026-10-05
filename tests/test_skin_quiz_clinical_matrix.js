// 2026-10-05 — kiểm thử ma trận lâm sàng AI Skin Quiz (chạy: npm run test:quiz).
// Đọc đúng dữ liệu theme (snippets/quiz_questions_data.bwt, snippets/quiz_results_data.bwt) và engine
// assets/skin-quiz-engine.js.bwt mà trình duyệt dùng — không có bản sao logic trong test.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const engine = require(path.join(root, 'assets/skin-quiz-engine.js.bwt'));

function afterLiquidComment(file) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  return text.slice(text.indexOf('{%- endcomment -%}') + '{%- endcomment -%}'.length);
}
const questions = JSON.parse(afterLiquidComment('snippets/quiz_questions_data.bwt'));
const results = new Function('return (' + afterLiquidComment('snippets/quiz_results_data.bwt') + ')')();

// Bộ trả lời nền "da thường" (chỉ số đáp án theo id câu hỏi); kịch bản ghi đè từng câu.
const BASELINE = { 18: 0, 1: 3, 2: 2, 3: 3, 4: 1, 5: 3, 6: 3, 7: 2, 8: 3, 9: 2, 10: 0, 11: 3, 12: 1, 13: 3, 14: 0, 15: 2, 16: 1, 17: 3 };

function answersFor(overrides = {}) {
  const picks = Object.assign({}, BASELINE, overrides);
  return questions.map(q => {
    const opt = q.options[picks[q.id]];
    assert.ok(opt, `Câu ${q.id} không có đáp án #${picks[q.id]}`);
    return { question_id: q.id, answer: opt.text, skin_type: opt.skin_type || '', code: opt.code || '' };
  });
}
const evaluate = overrides => engine.evaluate(questions, answersFor(overrides));

test('dữ liệu câu hỏi: 18 câu, câu dấu hiệu cấp tính đứng đầu, Q10/Q15/Q16/Q17 không tính điểm', () => {
  assert.equal(questions.length, 18);
  assert.equal(questions[0].id, 18);
  assert.equal(questions[0].role, 'red_flag');
  const nonScoring = questions.filter(q => q.scoring === false).map(q => q.id).sort((a, b) => a - b);
  assert.deepEqual(nonScoring, [10, 15, 16, 17, 18]);
});

test('Tier 1: chọn dấu hiệu cấp tính ⇒ RED_FLAG, không xếp Case', () => {
  for (const idx of [1, 2, 3]) {
    const r = evaluate({ 18: idx, 9: 0 });
    assert.equal(r.tier, 1);
    assert.equal(r.case_id, 'RED_FLAG');
    assert.match(r.red_flag, /^red_flag_/);
  }
  assert.notEqual(evaluate({ 18: 0 }).tier, 1);
});

test('Q10 và Q17 không làm đổi điểm loại da (Q17 "Chỉ xem online" từng cộng điểm da dầu)', () => {
  const a = evaluate({ 10: 0, 17: 3 });
  for (const q10 of [1, 2, 3]) for (const q17 of [0, 1, 2]) {
    assert.deepEqual(evaluate({ 10: q10, 17: q17 }).scores, a.scores);
  }
  assert.equal(a.scores.oily, 2); // chỉ Q4 + Q14 của bộ nền, không có Q17
});

test('luật xếp 8 Case theo đúng thứ tự đã duyệt', () => {
  const cases = [
    [{ 9: 0 }, 'CASE_1', 2],
    [{ 3: 0 }, 'CASE_2', 3],
    [{ 8: 0 }, 'CASE_2', 3],
    [{ 9: 0, 3: 0 }, 'CASE_1', 2],                // mụn viêm ưu tiên hơn nám
    [{ 9: 1 }, 'CASE_5', 3],
    [{ 8: 1 }, 'CASE_6', 3],
    [{ 2: 0 }, 'CASE_4', 4],
    [{ 15: 0 }, 'CASE_4', 4],
    [{ 1: 1, 4: 0, 7: 1, 11: 0, 13: 1, 14: 3, 3: 2, 2: 1, 9: 3, 12: 2, 5: 1 }, 'CASE_3', 4],
    [{ 1: 1, 4: 2, 5: 1, 6: 1, 7: 3, 14: 1, 2: 1, 3: 2, 9: 3, 12: 2 }, 'CASE_7', 4],
    [{}, 'CASE_8', 5]
  ];
  for (const [overrides, caseId, tier] of cases) {
    const r = evaluate(overrides);
    assert.equal(r.case_id, caseId, JSON.stringify(overrides) + ' → ' + r.case_id + ' (top ' + r.top_skin_type + ')');
    assert.equal(r.tier, tier);
  }
});

test('mọi Case trong luật đều có dữ liệu, tier trùng khớp, mỗi bước có từ khoá tìm sản phẩm', () => {
  const ids = Object.keys(engine.CASE_TIERS);
  assert.equal(ids.length, 8);
  for (const id of ids) {
    const c = results.cases[id];
    assert.ok(c, 'thiếu ' + id);
    assert.equal(c.tier, engine.CASE_TIERS[id], id);
    assert.ok(c.routine_am.length && c.routine_pm.length, id);
    for (const step of c.routine_am.concat(c.routine_pm)) {
      assert.ok(step.step && step.keywords.length, id + ': ' + JSON.stringify(step));
      assert.ok(Array.isArray(step.actives));
      // Sản phẩm phải lấy thật từ Sapo — dữ liệu Case không được ghi cứng tên/giá/SKU.
      for (const banned of ['sku', 'price', 'name', 'url']) assert.equal(step[banned], undefined, id + ' có ' + banned);
    }
  }
});

test('thai kỳ / sắp mang thai: ẩn bước Retinoid/BHA/AHA/Cysteamine và nhãn gợi ý Retinol', () => {
  for (const idx of [0, 2]) {
    const r = evaluate({ 16: idx, 3: 0 });
    assert.deepEqual(r.safety_flags, ['pregnancy']);
    assert.equal(r.case_id, 'CASE_2');
    const safe = engine.applySafety(results.cases.CASE_2, r.excluded_actives);
    const blocked = safe.routine_pm.filter(s => s.blocked).map(s => s.actives[0]).sort();
    assert.deepEqual(blocked, ['cysteamine', 'retinoid']);
    assert.ok(safe.routine_am.every(s => !s.blocked));
  }
  const ex = evaluate({ 16: 0 }).excluded_actives;
  assert.equal(engine.isTextAllowed('Retinol 0.5% - 1.0%', ex), false);
  assert.equal(engine.isTextAllowed('Salicylic Acid (BHA 2%)', ex), false);
  assert.equal(engine.isTextAllowed('Niacinamide 10%', ex), true);
  assert.deepEqual(evaluate({ 16: 1 }).safety_flags, []);
});

test('dị ứng nặng: cờ allergy_severe, loại hoạt chất mạnh, xếp Case 4', () => {
  const r = evaluate({ 15: 0 });
  assert.deepEqual(r.safety_flags, ['allergy_severe']);
  assert.deepEqual(r.excluded_actives.sort(), ['aha', 'bha', 'cysteamine', 'retinoid']);
});

test('lọc sản phẩm: bỏ kê toa (loai:ke-toa) và sản phẩm chứa hoạt chất bị loại', () => {
  const ex = evaluate({ 16: 0 }).excluded_actives;
  assert.equal(engine.isProductAllowed({ name: 'Altreno Lotion 0.05%', tags: ['Loai: Ke-Toa'] }, []), false);
  assert.equal(engine.isProductAllowed({ name: 'Kem Dưỡng Retinol 0.3%', alias: 'kem-duong-retinol-0-3', tags: [] }, ex), false);
  assert.equal(engine.isProductAllowed({ name: 'Serum Đêm', alias: 'serum-dem', tags: ['hoatchat:retinol'] }, ex), false);
  assert.equal(engine.isProductAllowed({ name: 'Kem Dưỡng Retinol 0.3%', tags: [] }, []), true);
  assert.equal(engine.isProductAllowed({ name: 'Sữa Rửa Mặt Amino Acid', tags: ['lam-sach-da'] }, ex), true);
});

test('câu chữ không dùng danh xưng "Bác sĩ" (RULE-P0-02)', () => {
  for (const file of ['snippets/quiz_questions_data.bwt', 'snippets/quiz_results_data.bwt', 'snippets/quiz_safety_copy.bwt']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /bác\s*sĩ/i, file);
  }
});
