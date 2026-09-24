const { test, expect } = require('@playwright/test');
const { byAlias } = require('../../data/products');
const { ingredients } = require('../../data/ingredients');

test('alias /soi-da mở chế độ camera và vẫn giữ khảo sát làm phương án dự phòng', async ({ page }) => {
  const response = await page.goto('/soi-da');
  expect(response.status()).toBe(200);
  await expect(page.locator('[data-skin-scan]')).toBeVisible();
  await expect(page.locator('[data-skin-mode="camera"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#aiSkinChatApp')).toBeHidden();
  await page.locator('[data-skin-mode="quiz"]').click();
  await expect(page.locator('#aiSkinChatApp')).toBeVisible();
  await expect(page.locator('[data-skin-scan]')).toBeHidden();
});

test('soft-disable ẩn camera nhưng giữ khảo sát dùng được', async ({ page }) => {
  await page.route('**/soi-da', async route => {
    const response = await route.fetch();
    let html = await response.text();
    html = html.replace(/<nav class="pc-skin-mode-tabs"[\s\S]*?<\/nav>\s*<section class="pc-skin-scan"[\s\S]*?<p class="pc-skin-scan__disclaimer"[\s\S]*?<\/p>\s*<\/section>/, '');
    html = html.replace(/<script src="[^"]*skin-(?:liqa|deid|cv|onnx|mst|scoring|routine|visual|camera)[^"]*"[^>]*><\/script>\s*/g, '');
    html = html.replace(/<script>\s*window\.PharmaSkinScanCopy = \{[\s\S]*?<\/script>\s*/, '');
    await route.fulfill({ response, body: html });
  });
  await page.goto('/soi-da');
  await expect(page.locator('[data-skin-scan]')).toHaveCount(0);
  await expect(page.locator('[data-skin-mode]')).toHaveCount(0);
  await expect(page.locator('#aiSkinChatApp')).toBeVisible();
  await expect(page.locator('#quickRepliesContainer button').first()).toBeVisible();
  await page.locator('#quickRepliesContainer button').first().click();
  await expect(page.locator('.quiz-question-heading').last()).toContainText('Câu hỏi 1/17');
});

test('chế độ Cloud/Hybrid chưa tích hợp khóa xử lý ảnh và vẫn cho dùng khảo sát', async ({ page }) => {
  let selectedMode = 'cloud_proxy';
  let cameraRequests = 0;
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => { window.cameraRequests = (window.cameraRequests || 0) + 1; return Promise.reject(new Error('unexpected_camera_request')); } }, configurable: true });
  });
  await page.route('**/soi-da', async route => {
    const response = await route.fetch();
    const html = await response.text();
    expect(html).toContain('data-skin-analysis-mode="client_edge"');
    await route.fulfill({ response, body: html.replace('data-skin-analysis-mode="client_edge"', `data-skin-analysis-mode="${selectedMode}"`) });
  });

  for (selectedMode of ['cloud_proxy', 'hybrid']) {
    await page.goto('/soi-da');
    await expect(page.locator('[data-skin-mode-unavailable]')).toBeVisible();
    await expect(page.locator('[data-skin-mode-unavailable]')).toContainText('chưa được tích hợp hoặc phê duyệt');
    await expect(page.locator('[data-skin-camera-start]')).toBeDisabled();
    await expect(page.locator('[data-skin-open-upload]')).toBeDisabled();
    await expect(page.locator('[data-skin-upload-angle="front"]')).toBeDisabled();
    await expect(page.locator('[data-skin-analyze]')).toBeDisabled();
    await page.locator('[data-skin-mode="quiz"]').click();
    await expect(page.locator('#aiSkinChatApp')).toBeVisible();
  }
  cameraRequests = await page.evaluate(() => window.cameraRequests || 0);
  expect(cameraRequests).toBe(0);
});

test('kết quả quiz chỉ tồn tại trong tab hiện tại và trang kết quả nhận dữ liệu phiên đó', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pc_quiz_skin_type', 'aging');
    localStorage.setItem('pc_quiz_scores', '{"aging":99}');
  });
  await page.goto('/soi-da');
  await page.locator('[data-skin-mode="quiz"]').click();
  await expect(page.locator('#quickRepliesContainer button').first()).toBeVisible();
  await page.locator('#quickRepliesContainer button').first().click();

  for (let question = 1; question <= 17; question += 1) {
    await expect(page.locator('.quiz-question-heading').last()).toContainText(`Câu hỏi ${question}/17`);
    await expect(page.locator('#quickRepliesContainer button').first()).toBeVisible();
    await page.locator('#quickRepliesContainer button').first().click();
  }

  await expect(page.locator('#btnSaveAiResult')).toBeVisible();
  const stored = await page.evaluate(() => ({
    quizType: sessionStorage.getItem('pc_quiz_skin_type'),
    sessionKeys: Object.keys(sessionStorage),
    localKeys: Object.keys(localStorage)
  }));
  expect(stored.quizType).toMatch(/^(oily|dry|combination|sensitive|normal|pigmentation|aging)$/);
  expect(stored.sessionKeys).toContain('pc_quiz_skin_type');
  expect(stored.sessionKeys).not.toContain('pc_quiz_scores');
  expect(stored.localKeys).not.toContain('pc_quiz_skin_type');
  expect(stored.localKeys).not.toContain('pc_quiz_scores');

  await page.locator('#messagesFlow .btn-result-cta').click();
  await expect(page).toHaveURL(/\/pages\/ai-skin-quiz-results$/);
  await expect(page.locator('#pcQuizResultsRoot')).toHaveAttribute('data-demo', 'false');
});

test('từ chối camera mở luồng tải ba ảnh thay vì lỗi trang', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) }, configurable: true });
  });
  await page.goto('/soi-da');
  await page.locator('[data-skin-camera-start]').click();
  await expect(page.locator('[data-skin-upload]')).toBeVisible();
  await expect(page.locator('[data-skin-upload] input[type="file"]')).toHaveCount(3);
  await expect(page.locator('#skinCameraStatus')).toContainText('tải đủ ba ảnh');
});

test('ảnh tải lên quá tối bị từ chối và không cho phân tích', async ({ page }) => {
  await page.goto('/soi-da');
  await page.locator('[data-skin-open-upload]').click();
  const darkSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#222222"/></svg>');
  await page.locator('[data-skin-upload-angle="front"]').setInputFiles({ name: 'dark.svg', mimeType: 'image/svg+xml', buffer: darkSvg });
  await expect(page.locator('#skinCameraStatus')).toContainText('Không gian quá tối');
  await expect(page.locator('[data-skin-analyze]')).toBeDisabled();
  await expect(page.locator('[data-skin-step="front"]')).not.toHaveClass(/is-complete/);
});

test('từ chối file quá lớn và giảm kích thước ảnh xử lý để giữ RAM ở mức an toàn', async ({ page }) => {
  await page.goto('/soi-da');
  await page.locator('[data-skin-open-upload]').click();
  const hugeBytes = Buffer.alloc(12 * 1024 * 1024 + 1);
  await page.locator('[data-skin-upload-angle="front"]').setInputFiles({ name: 'oversized.jpg', mimeType: 'image/jpeg', buffer: hugeBytes });
  await expect(page.locator('#skinCameraStatus')).toContainText('12 MB');
  await expect(page.locator('[data-skin-analyze]')).toBeDisabled();
  const excessivePixels = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="6000"><rect width="6000" height="6000" fill="#999999"/></svg>');
  await page.locator('[data-skin-upload-angle="front"]').setInputFiles({ name: 'too-many-pixels.svg', mimeType: 'image/svg+xml', buffer: excessivePixels });
  await expect(page.locator('#skinCameraStatus')).toContainText('vượt giới hạn xử lý an toàn');

  await page.evaluate(() => { window.PharmaSkinLighting.analyze = () => ({ valid: true, reason: '' }); });
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1000"><rect width="2000" height="1000" fill="#999999"/></svg>');
  for (const input of await page.locator('[data-skin-upload] input[type="file"]').all()) {
    await input.setInputFiles({ name: 'large.svg', mimeType: 'image/svg+xml', buffer: svg });
  }
  await expect(page.locator('[data-skin-analyze]')).toBeEnabled();
  await page.locator('[data-skin-analyze]').click();
  await expect(page.locator('[data-skin-inline-report]')).toBeVisible();
  const dimensions = await page.locator('[data-skin-preview]').evaluateAll(canvases => canvases.map(canvas => [canvas.width, canvas.height]));
  expect(dimensions).toEqual([[1280, 640], [1280, 640], [1280, 640]]);
});

test('màn soi da không sử dụng danh xưng y tế bị cấm', async ({ page }) => {
  await page.goto('/soi-da');
  const text = await page.locator('body').innerText();
  await expect(page.locator('[data-skin-scan] h2')).toHaveText('Phân tích ảnh 3 góc tại thiết bị');
  await expect(page.locator('[data-skin-scan] .pc-skin-scan__intro')).toContainText('phép đo Canvas thử nghiệm');
  expect(text).not.toMatch(/Bác sĩ|Bác sỹ|\bBS\.|\bDr\./i);
  expect(text).not.toMatch(/được chứng thực|AI Clinic|Trực tuyến 24\/7|Chẩn đoán da 1:1/i);
  await expect(page.locator('.chat-security-banner')).toContainText('Chính sách bảo mật');
  await expect(page.locator('.chat-security-banner')).not.toContainText('91/2025/QH15');
  const quizCopy = await page.evaluate(() => window.PharmaSkinScanCopy);
  expect(quizCopy.quizResultBadge).toBe('Kết quả tham khảo');
  expect(quizCopy.quizResultSummary).toContain('chỉ mang tính tham khảo');
  expect(JSON.stringify(quizCopy)).not.toMatch(/GSP\/GDP|chẩn đoán lâm sàng|được chỉ định/i);

  await page.locator('[data-skin-mode="quiz"]').click();
  await expect(page.locator('#messagesFlow')).toContainText(quizCopy.quizIntro);
  await expect(page.locator('#messagesFlow')).not.toContainText(/VISIA|Fitzpatrick|phác đồ y khoa chuẩn|câu hỏi lâm sàng/i);
  await page.getByRole('button', { name: /Cách tạo gợi ý/ }).click();
  await expect(page.locator('#messagesFlow')).toContainText(quizCopy.quizMethodInfo);
  await expect(page.locator('#messagesFlow')).not.toContainText(/VISIA|Fitzpatrick|chẩn đoán lâm sàng/i);

  await page.goto('/');
  const guideCopy = await page.locator('.pc-ai-guide').innerText();
  expect(guideCopy).not.toMatch(/Dr\.|chẩn đoán|phác đồ y khoa/i);
  expect(guideCopy).toContain('kết quả tham khảo');

  await page.goto('/pages/ai-skin-quiz-results');
  await expect(page.locator('.bg-amber-50')).toContainText('Lưu ý về kết quả');
  await expect(page.locator('.bg-amber-50')).not.toContainText(/kê phác đồ chính xác|chẩn đoán y khoa chính thức/i);
});

test('LIQA chặn ảnh khi chưa có khuôn mặt và chấp nhận landmarks chính diện hợp lệ', async ({ page }) => {
  await page.goto('/soi-da');
  const result = await page.evaluate(() => {
    const evaluate = window.PharmaSkinMesh.evaluate;
    const missing = evaluate(null, 'front', 16 / 9);
    const points = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    const oval = [10, 109, 67, 103, 54, 21, 162, 127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 356, 389, 251, 284, 332, 297, 338];
    oval.forEach((index, i) => { points[index] = { x: i < oval.length / 2 ? 0.3 : 0.7, y: i % 2 ? 0.2 : 0.8, z: 0 }; });
    points[33] = { x: 0.4, y: 0.35, z: 0 };
    points[263] = { x: 0.6, y: 0.35, z: 0 };
    points[1] = { x: 0.5, y: 0.43, z: 0 };
    return { missing, frontal: evaluate(points, 'front', 16 / 9) };
  });
  expect(result.missing).toMatchObject({ available: false, valid: false, reason: 'mesh_unavailable' });
  expect(result.frontal.available).toBe(true);
  expect(result.frontal.valid).toBe(true);
});

test('ui_score giảm theo mức độ concern của raw_score và khớp các mốc kế hoạch', async ({ page }) => {
  await page.goto('/soi-da');
  const points = await page.evaluate(() => [0.02, 0.35, 0.85].map(raw => window.PharmaSkinScoring.make({ acne: raw, pigmentation: raw, wrinkles: raw, redness: raw, pores: raw }).scores.acne));
  expect(points[0].ui_score).toBeGreaterThanOrEqual(96);
  expect(points[1].ui_score).toBe(75);
  expect(points[2].ui_score).toBeGreaterThanOrEqual(54);
  expect(points[2].ui_score).toBeLessThanOrEqual(58);
  expect(points[0].ui_score).toBeGreaterThan(points[2].ui_score);
  expect(points[0].level).toBe('Rất khỏe');
  expect(points[2].level).toBe('Cần được chuyên gia hỗ trợ');
});

test('ONNX chỉ được khởi chạy sau khi SHA-256 khớp và checksum phải có định dạng hợp lệ', async ({ page }) => {
  await page.goto('/soi-da');
  const result = await page.evaluate(async () => {
    const bytes = new TextEncoder().encode('abc').buffer;
    const valid = await window.PharmaSkinOnnx.verifyModelBytes(bytes, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    let mismatch = '';
    try { await window.PharmaSkinOnnx.verifyModelBytes(bytes, '0'.repeat(64)); } catch (error) { mismatch = error.message; }
    let missing = '';
    try { await window.PharmaSkinOnnx.verifyModelBytes(bytes, ''); } catch (error) { missing = error.message; }
    return { validLength: valid.byteLength, mismatch, missing };
  });
  expect(result).toEqual({ validLength: 3, mismatch: 'onnx_model_hash_mismatch', missing: 'onnx_model_hash_required' });
});

test('ONNX giải mã YOLO 6-class raw ở hai layout, giữ output N×6 và từ chối shape không hỗ trợ', async ({ page }) => {
  await page.goto('/soi-da');
  const result = await page.evaluate(() => {
    const first = [320, 320, 100, 100, .1, .9, .05, .02, .01, .04];
    const duplicate = [321, 320, 100, 100, .1, .8, .05, .02, .01, .04];
    const transform = { scale: 1, padX: 0, padY: 0 };
    const source = { width: 640, height: 640 };
    const rowMajor = window.PharmaSkinOnnx.decode({ dims: [1, 2, 10], data: new Float32Array(first.concat(duplicate)) }, transform, source);
    const featureMajor = [];
    for (let feature = 0; feature < 10; feature++) featureMajor.push(first[feature], duplicate[feature]);
    const transposed = window.PharmaSkinOnnx.decode({ dims: [1, 10, 2], data: new Float32Array(featureMajor) }, transform, source);
    const legacy = window.PharmaSkinOnnx.decode({ dims: [1, 1, 6], data: new Float32Array([320, 320, 80, 60, .7, 2]) }, transform, source);
    const softened = window.PharmaSkinOnnx.nms([
      { x: 0, y: 0, width: 10, height: 10, confidence: .9, classId: 0 },
      { x: 5, y: 0, width: 10, height: 10, confidence: .8, classId: 0 }
    ]);
    let unsupported = '';
    try { window.PharmaSkinOnnx.decode({ dims: [1, 84, 8400], data: new Float32Array(1) }, transform, source); } catch (error) { unsupported = error.message; }
    return { rowMajor, transposed, legacy, softened, unsupported };
  });
  for (const detections of [result.rowMajor, result.transposed]) {
    expect(detections).toHaveLength(1); // duplicate same-class box is suppressed
    expect(detections[0]).toMatchObject({ x: 270, y: 270, width: 100, height: 100, classId: 1 });
    expect(detections[0].confidence).toBeCloseTo(.9);
  }
  expect(result.legacy).toHaveLength(1);
  expect(result.legacy[0].classId).toBe(2);
  expect(result.softened).toHaveLength(2);
  expect(result.softened[1].confidence).toBeLessThan(.8);
  expect(result.unsupported).toBe('onnx_output_format_unsupported');
});

test('MST đối chiếu đủ 10 swatch A-J bằng Lab gần nhất thay vì chia ITA thành vài mức', async ({ page }) => {
  await page.goto('/soi-da');
  const tones = await page.evaluate(() => window.PharmaSkinMst.references.map(reference => {
    const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100;
    const context = canvas.getContext('2d'); context.fillStyle = '#' + reference.hex; context.fillRect(0, 0, 100, 100);
    return window.PharmaSkinMst.sample(canvas).monk_skin_tone;
  }));
  expect(tones).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('MST lấy mẫu hai vùng má theo landmarks và bỏ qua màu nền ngoài vùng má', async ({ page }) => {
  await page.goto('/soi-da');
  const tones = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100;
    const context = canvas.getContext('2d');
    const landmarks = Array.from({ length: 468 }, () => ({ x: .5, y: .5 }));
    landmarks[234] = { x: .1, y: .5 }; landmarks[454] = { x: .9, y: .5 };
    landmarks[10] = { x: .5, y: .2 }; landmarks[152] = { x: .5, y: .8 };
    landmarks[33] = { x: .35, y: .35 }; landmarks[263] = { x: .65, y: .35 };
    landmarks[1] = { x: .5, y: .5 }; landmarks[13] = { x: .5, y: .68 };
    const paintCheeks = () => {
      context.fillStyle = '#815d44'; context.fillRect(24, 39, 22, 25); context.fillRect(54, 39, 22, 25);
    };
    context.fillStyle = '#f7ede4'; context.fillRect(0, 0, 100, 100); paintCheeks();
    const lightBackground = window.PharmaSkinMst.sample(canvas, landmarks).monk_skin_tone;
    context.fillStyle = '#2a2420'; context.fillRect(0, 0, 100, 100); paintCheeks();
    const darkBackground = window.PharmaSkinMst.sample(canvas, landmarks).monk_skin_tone;
    return [lightBackground, darkBackground];
  });
  expect(tones).toEqual([7, 7]);
});

test('LIQA ánh sáng phân biệt thiếu sáng, cháy sáng, thiếu tương phản và lệch sáng hai má', async ({ page }) => {
  await page.goto('/soi-da');
  const result = await page.evaluate(() => {
    const solid = color => { const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100; const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 100, 100); return canvas; };
    const dark = window.PharmaSkinLighting.analyze(solid('#404040'), 80);
    const bright = window.PharmaSkinLighting.analyze(solid('#eeeeee'), 80);
    const flat = window.PharmaSkinLighting.analyze(solid('#888888'), 80);
    const striped = solid('#686868'); const stripeContext = striped.getContext('2d'); stripeContext.fillStyle = '#c8c8c8'; stripeContext.fillRect(0, 0, 50, 100);
    const contrast = window.PharmaSkinLighting.analyze(striped, 80);
    const points = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5 }));
    const oval = [10, 109, 67, 103, 54, 21, 162, 127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 356, 389, 251, 284, 332, 297, 338];
    oval.forEach((index, i) => { points[index] = { x: i < oval.length / 2 ? 0.2 : 0.8, y: i % 2 ? 0.1 : 0.9 }; });
    const splitFace = solid('#888888'); const cheekContext = splitFace.getContext('2d'); cheekContext.fillStyle = '#555555'; cheekContext.fillRect(34, 48, 14, 19); cheekContext.fillStyle = '#eeeeee'; cheekContext.fillRect(52, 48, 14, 19);
    const uneven = window.PharmaSkinLighting.analyze(splitFace, 80, points);
    return { dark: dark.reason, bright: bright.reason, flat: flat.reason, contrast: contrast.reason, uneven: uneven.reason };
  });
  expect(result).toEqual({ dark: 'too_dark', bright: 'too_bright', flat: 'low_contrast', contrast: '', uneven: 'uneven_light' });
});

test('khử định danh phủ mask mờ đục lên hai mắt, có fallback bảo thủ khi thiếu landmarks', async ({ page }) => {
  await page.goto('/soi-da');
  const samples = await page.evaluate(() => {
    const source = document.createElement('canvas'); source.width = 100; source.height = 100;
    const sourceContext = source.getContext('2d'); sourceContext.fillStyle = '#ffffff'; sourceContext.fillRect(0, 0, 100, 100);
    const points = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    const groups = [
      [33, 133, 160, 159, 158, 157, 173, 155, 154, 153, 145, 144, 163, 7, 246, 161, 70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
      [362, 263, 387, 386, 385, 384, 398, 382, 381, 380, 374, 373, 390, 249, 466, 388, 300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
    ];
    groups.forEach((group, side) => group.forEach((index, i) => { points[index] = { x: (side ? 0.58 : 0.28) + (i % 4) * 0.03, y: 0.34 + Math.floor(i / 4) * 0.01, z: 0 }; }));
    const sample = (canvas, x, y) => Array.from(canvas.getContext('2d').getImageData(x, y, 1, 1).data);
    return {
      leftEye: sample(window.PharmaSkinDeid.deidentify(source, true, points), 30, 36),
      rightEye: sample(window.PharmaSkinDeid.deidentify(source, true, points), 65, 36),
      cheek: sample(window.PharmaSkinDeid.deidentify(source, true, points), 30, 60),
      fallbackEyeBand: sample(window.PharmaSkinDeid.deidentify(source, true), 50, 30),
      unmasked: sample(window.PharmaSkinDeid.deidentify(source, false, points), 30, 36)
    };
  });
  expect(samples.leftEye.slice(0, 3)).toEqual([38, 51, 45]);
  expect(samples.rightEye.slice(0, 3)).toEqual([38, 51, 45]);
  expect(samples.cheek.slice(0, 3)).toEqual([255, 255, 255]);
  expect(samples.fallbackEyeBand.slice(0, 3)).toEqual([38, 51, 45]);
  expect(samples.unmasked.slice(0, 3)).toEqual([255, 255, 255]);
});

test('báo cáo vẽ radar từ raw_score và công bố đủ năm giá trị cho trình đọc màn hình', async ({ page }) => {
  await page.goto('/soi-da');
  await page.evaluate(() => {
    const scores = {
      acne: { raw_score: 0.1, ui_score: 90 }, pigmentation: { raw_score: 0.2, ui_score: 85 },
      wrinkles: { raw_score: 0.3, ui_score: 80 }, redness: { raw_score: 0.4, ui_score: 70 }, pores: { raw_score: 0.5, ui_score: 65 }
    };
    sessionStorage.setItem('pc_skin_scan_result', JSON.stringify({ scores, regimen: [], recommended_products: [] }));
  });
  await page.goto('/pages/ai-skin-quiz-results');
  await expect(page.locator('[data-scan-radar]')).toBeVisible();
  const points = await page.locator('[data-scan-radar-shape]').getAttribute('points');
  expect(points.trim().split(/\s+/)).toHaveLength(5);
  await expect(page.locator('[data-scan-radar-values] li')).toHaveCount(5);
  await expect(page.locator('[data-scan-radar-values]')).toContainText('Mụn: 0.10');
  await expect(page.locator('[data-scan-radar]')).toContainText('không phải điểm sức khỏe');
});

test('nút chụp chỉ mở sau khi LIQA trả về khuôn mặt hợp lệ', async ({ page }) => {
  await page.goto('/soi-da');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.resolve(new MediaStream()) } });
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    window.PharmaSkinMesh.evaluate = (points) => ({ available: Boolean(points), valid: Boolean(points) });
    window.PharmaSkinMesh.start = (video, callback) => { window.mockMeshCallback = callback; return Promise.resolve({ stop: () => {} }); };
  });
  const capture = page.locator('[data-skin-camera-capture]');
  await page.locator('[data-skin-camera-start]').click();
  await expect(capture).toBeDisabled();
  await page.evaluate(() => window.mockMeshCallback(null));
  await expect(page.locator('#skinCameraStatus')).toContainText('Chưa nhận diện được khuôn mặt');
  await expect(capture).toBeDisabled();
  await page.evaluate(() => window.mockMeshCallback({}));
  await expect(capture).toBeEnabled();
});

test('kết quả camera hiển thị ba ảnh trong trang và có thể bật tắt detection overlay', async ({ page }) => {
  await page.goto('/soi-da');
  await page.evaluate(() => {
    document.querySelector('[data-skin-scan]').dataset.skinModelUrl = 'mock-model.onnx';
    window.PharmaSkinLighting.analyze = () => ({ valid: true, reason: '' });
    const extractRois = window.PharmaSkinDeid.extractRois;
    window.__localRoiCenterPixels = [];
    window.PharmaSkinDeid.extractRois = source => {
      window.__localRoiCenterPixels.push(Array.from(source.getContext('2d').getImageData(60, 40, 1, 1).data));
      return extractRois(source);
    };
    window.PharmaSkinCV.analyzeRedness = () => ({ ratio: 0 });
    window.PharmaSkinCV.analyzeWrinkles = () => ({ density: 0, tech_neck_detected: false });
    window.PharmaSkinCV.analyzeSurface = () => ({ acne_ratio: 0, pigment_ratio: 0, texture_ratio: 0 });
    window.PharmaSkinMst.sample = () => ({ available: false });
    window.PharmaSkinScoring.make = () => ({ scores: { acne: { raw_score: 0.2, ui_score: 80, level: 'test' } }, skin_age: null });
    window.PharmaSkinRoutine.match = () => ({ primary_concern: 'acne', stages: [], products: [] });
    window.PharmaSkinOnnx.detect = () => Promise.resolve([{ x: 10, y: 12, width: 16, height: 18, confidence: 0.9, classId: 0 }]);
  });
  await page.locator('[data-skin-open-upload]').click();
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="white"/></svg>');
  for (const input of await page.locator('[data-skin-upload] input[type="file"]').all()) {
    await input.setInputFiles({ name: 'capture.svg', mimeType: 'image/svg+xml', buffer: svg });
  }
  await expect(page.locator('[data-skin-analyze]')).toBeEnabled();
  await page.locator('[data-skin-analyze]').click();
  await expect(page.locator('[data-skin-inline-report]')).toBeVisible();
  await expect(page.locator('[data-skin-analysis-method]')).toContainText('sử dụng model ONNX được cấu hình');
  await expect(page.locator('[data-skin-preview]')).toHaveCount(3);
  await expect(page).toHaveURL(/\/soi-da$/);
  const storedSkinData = await page.evaluate(() => ({
    local: Object.keys(localStorage).map(key => localStorage.getItem(key)),
    session: Object.keys(sessionStorage).map(key => sessionStorage.getItem(key)),
    result: JSON.parse(sessionStorage.getItem('pc_skin_scan_result') || 'null')
  }));
  expect(JSON.stringify(storedSkinData)).not.toMatch(/data:image|base64/i);
  expect(storedSkinData.result).toBeTruthy();
  expect(Object.keys(storedSkinData.result)).not.toEqual(expect.arrayContaining(['images', 'photos', 'originals']));
  const preview = page.locator('[data-skin-preview="front"]');
  const markedPixel = await preview.evaluate(canvas => Array.from(canvas.getContext('2d').getImageData(46, 28, 1, 1).data));
  expect(markedPixel[0]).toBe(239); // red acne marker (#EF4444)
  const localPixels = await page.evaluate(() => window.__localRoiCenterPixels);
  expect(localPixels).toHaveLength(3);
  expect(localPixels.every(pixel => pixel[0] === 255 && pixel[1] === 255 && pixel[2] === 255)).toBe(true);
  await page.locator('[data-skin-layer="acne"]').evaluate(input => { input.checked = false; input.dispatchEvent(new Event('change', { bubbles: true })); });
  const clearedPixel = await preview.evaluate(canvas => Array.from(canvas.getContext('2d').getImageData(50, 35, 1, 1).data));
  expect(clearedPixel.slice(0, 3)).toEqual([38, 51, 45]); // eye-band mask remains after toggling the detection layer off
  await page.evaluate(() => {
    const scan = document.querySelector('[data-skin-scan]');
    scan.dataset.skinModelUrl = '';
    scan.dataset.skinDeidEnabled = 'false';
  });
  await page.locator('[data-skin-analyze]').click();
  await expect(page.locator('[data-skin-analysis-method]')).toContainText('không phải kết quả từ mô hình AI đã thẩm định');
  const unmaskedPixel = await preview.evaluate(canvas => Array.from(canvas.getContext('2d').getImageData(50, 35, 1, 1).data));
  expect(unmaskedPixel.slice(0, 3)).toEqual([255, 255, 255]);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const released = await page.evaluate(() => ({
    previewSizes: Array.from(document.querySelectorAll('[data-skin-preview]'), canvas => [canvas.width, canvas.height]),
    guideSize: [document.getElementById('skinGuidanceCanvas').width, document.getElementById('skinGuidanceCanvas').height],
    uploadValues: Array.from(document.querySelectorAll('[data-skin-upload-angle]'), input => input.value),
    videoDetached: document.getElementById('skinCameraStream').srcObject === null,
    storedResult: JSON.parse(sessionStorage.getItem('pc_skin_scan_result') || 'null')
  }));
  expect(released.previewSizes).toEqual([[0, 0], [0, 0], [0, 0]]);
  expect(released.guideSize).toEqual([0, 0]);
  expect(released.uploadValues).toEqual(['', '', '']);
  expect(released.videoDetached).toBe(true);
  expect(released.storedResult).toBeTruthy();
  expect(JSON.stringify(released.storedResult)).not.toMatch(/data:image|base64|originals|images/i);
});

test('routine xuất ba giai đoạn, ingredient IDs hợp lệ và sản phẩm còn trong catalog', async ({ page }) => {
  await page.goto('/soi-da');
  const recommendations = await page.evaluate(() => {
    const scores = { acne: { raw_score: 1 }, pigmentation: { raw_score: 0 }, wrinkles: { raw_score: 0 }, redness: { raw_score: 0 }, pores: { raw_score: 0 } };
    const result = window.PharmaSkinRoutine.match(scores);
    sessionStorage.setItem('pc_skin_scan_result', JSON.stringify({ scores, skin_age: null, regimen: result.stages, recommended_products: result.products }));
    return result;
  });
  expect(recommendations.stages).toHaveLength(3);
  expect(recommendations.products).toHaveLength(3);
  for (const product of recommendations.products) {
    expect(byAlias[product.handle]).toBeTruthy();
    expect(byAlias[product.handle].available).not.toBe(false);
    expect(product.label).toBe(byAlias[product.handle].name);
    for (const ingredientId of product.ingredient_ids) expect(ingredients.some(item => item.id === ingredientId)).toBe(true);
  }
  await page.goto('/pages/ai-skin-quiz-results');
  for (const stage of [1, 2, 3]) {
    const links = page.locator(`[data-scan-stage-products="${stage}"] a`);
    await expect(links).toHaveCount(1);
    await expect(links.first()).toHaveAttribute('href', /^\/[a-z0-9-]+$/);
  }
});

test('CRM yêu cầu consent và chỉ gửi dữ liệu định lượng, không gửi ảnh kể cả khi caller đính kèm', async ({ page }) => {
  await page.addInitScript(() => {
    window.PharmaCrmIntakeConfig = { enabled: true, endpoint: 'https://script.google.com/macros/s/test/exec', timeout_ms: '10000' };
  });
  await page.goto('/pages/ai-skin-quiz-results');
  const result = await page.evaluate(async () => {
    const sent = [];
    window.fetch = async (url, options) => {
      sent.push({ url, body: JSON.parse(options.body) });
      return { ok: true, json: async () => ({ success: true, record_id: 'test-record' }) };
    };
    const base = { scores: { acne: { raw_score: 0.2, ui_score: 80 } }, monk_skin_tone: 5, skin_age: null, regimen: ['recovery'], recommended_products: [] };
    let rejected;
    try { await window.PharmaCrmIntake.submitSkinAnalysis(Object.assign({}, base, { consent: false })); }
    catch (error) { rejected = error.message; }
    await window.PharmaCrmIntake.submitSkinAnalysis(Object.assign({}, base, {
      consent: true,
      consent_at: '2026-09-24T00:00:00.000Z',
      image: 'data:image/jpeg;base64,AA=='
    }));
    return { rejected, sent };
  });
  expect(result.rejected).toBe('consent_required');
  expect(result.sent).toHaveLength(1);
  expect(result.sent[0].body.action).toBe('save_skin_analysis');
  expect(result.sent[0].body.consent).toBe(true);
  expect(result.sent[0].body.analysis_result).toMatchObject({ monk_skin_tone: 5, scores: { acne: { ui_score: 80 } } });
  expect(JSON.stringify(result.sent[0].body)).not.toMatch(/data:image|base64|image/i);
});
