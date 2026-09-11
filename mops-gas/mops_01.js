
// ============================================================
// TELEGRAM ASYNC QUEUE (phase-07 Lớp 5 — BS-6/BS-10)
// Notifications sheet DÙNG LÀM queue. Cột A..J (như createNotif) + K Message | L RetryCount |
// M NextAttemptAt (ISO) | N ChatId. Vòng đời: PENDING → (gửi) → SENT | RETRY(backoff) → … → DEAD.
// DEAD = dead-letter: GIỮ nguyên trong sheet (KHÔNG mất tin), để soi/soát tay. 429/5xx/exception =
// retryable; 4xx khác (400/403 chặn) = DEAD ngay (retry vô ích).
// ============================================================
var _QUEUE_MAX_RETRY  = 5;
var _QUEUE_BATCH      = 25;
var _QUEUE_RECLAIM_MS = 300000; // 5' — PROCESSING quá lâu (crash giữa chừng) → claim lại

function _enqueueTelegram(ss, orderId, event, payload, chatId, message) {
  try {
    var sh = ss.getSheetByName(SHEET.NOTIFICATIONS);
    if (!sh) return null;
    var dateStr = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
    var notifId = 'N-' + dateStr + '-' + String(sh.getLastRow()).padStart(4, '0');
    sh.appendRow([
      notifId, orderId || '', event, 'STAFF', 'TELEGRAM', 'PENDING', '', '',
      JSON.stringify(payload || {}), nowIso(),
      String(message || ''), 0, nowIso(), String(chatId || '')
    ]);
    return notifId;
  } catch (ex) { return null; } // non-fatal — không được làm hỏng nghiệp vụ chính vì lỗi ghi notif
}

// Gửi thô 1 tin — trả {ok, code, error}. code 0 = exception mạng (retryable). Dùng bởi queue processor.
function _sendTelegramRaw(token, chatId, text) {
  try {
    var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' }),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    return { ok: code === 200, code: code, error: code === 200 ? '' : resp.getContentText().substring(0, 200) };
  } catch (ex) {
    return { ok: false, code: 0, error: ex.message || String(ex) };
  }
}

// Trigger 1' gọi hàm này. BS-10: tryLock NGẮN (2s) — bận thì thoát êm; CLAIM trong lock (mark
// PROCESSING + đặt reclaim window) rồi RELEASE; GỬI NGOÀI lock (Telegram 1-3s KHÔNG được giữ lock).
// 2026-08-10 Alert Trap: bọc _safeTriggerRun — nếu queue crash (vd Telegram token invalid, sheet
// mất cột), dev nhận Telegram alert trong 15' đầu (dedup). Impl thật ở _processBackgroundQueueImpl.
function processBackgroundQueue() {
  return _safeTriggerRun('processBackgroundQueue', function() { return _processBackgroundQueueImpl(); });
}
function _processBackgroundQueueImpl() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return; // đang có execution khác quét → để lần sau, KHÔNG crash/chờ
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.NOTIFICATIONS);
  if (!sh || sh.getLastRow() < 2) { lock.releaseLock(); return; }

  var nowMs = Date.now();
  var claimed = [];
  try {
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 14).getValues();
    for (var i = 0; i < data.length && claimed.length < _QUEUE_BATCH; i++) {
      var r = data[i];
      if (String(r[4]) !== 'TELEGRAM' && String(r[4]) !== 'FINANCE') continue; // E channel
      var status = String(r[5]);                        // F
      var nextAt = r[12] ? new Date(r[12]).getTime() : 0; // M NextAttemptAt
      var actionable = status === 'PENDING'
        || (status === 'RETRY' && nextAt <= nowMs)
        || (status === 'PROCESSING' && nextAt <= nowMs); // PROCESSING quá reclaim window = kẹt → claim lại
      if (!actionable) continue;
      var rowNum = i + 2;
      claimed.push({ row: rowNum, channel: String(r[4]), chatId: String(r[13]), message: String(r[10]), payload: String(r[8] || '{}'), retry: Number(r[11]) || 0 });
      sh.getRange(rowNum, 6).setValue('PROCESSING');
      sh.getRange(rowNum, 13).setValue(new Date(nowMs + _QUEUE_RECLAIM_MS).toISOString());
    }
  } finally {
    lock.releaseLock();
  }
  if (!claimed.length) return;

  var token = null;
  var hasTelegramJob = claimed.some(function(job) { return job.channel !== 'FINANCE'; });
  if (hasTelegramJob) token = getSettings(ss).TELEGRAM_TOKEN;
  claimed.forEach(function(job) {
    var res;
    if (job.channel === 'FINANCE') {
      try {
        var receiptJob = JSON.parse(job.payload || '{}');
        autoCreateReceipt(
          receiptJob.order_id,
          receiptJob.payment_id,
          Number(receiptJob.amount) || 0,
          receiptJob.store || ''
        );
        res = { ok: true, code: 200, error: '' };
      } catch (financeErr) {
        res = { ok: false, code: 0, error: financeErr.message || String(financeErr) };
      }
    } else {
    if (!token)          res = { ok: false, code: -1, error: 'TELEGRAM_TOKEN chưa cấu hình' };
    else if (!job.chatId) res = { ok: false, code: -2, error: 'ChatId rỗng' };
    else                  res = _sendTelegramRaw(token, job.chatId, job.message);

    }
    if (res.ok) {
      sh.getRange(job.row, 6).setValue('SENT');
      sh.getRange(job.row, 7).setValue(nowIso());
      sh.getRange(job.row, 8).setValue('');
    } else {
      // 4xx (trừ 429) hoặc chatId rỗng = retry vô ích → DEAD ngay; token thiếu (-1) = retryable (sẽ cấu hình sau)
      var nonRetryable = (res.code >= 400 && res.code < 500 && res.code !== 429) || res.code === -2;
      var newRetry = job.retry + 1;
      if (nonRetryable || newRetry >= _QUEUE_MAX_RETRY) {
        sh.getRange(job.row, 6).setValue('DEAD'); // dead-letter — GIỮ, không mất tin
        sh.getRange(job.row, 8).setValue('[' + res.code + '] ' + res.error);
        sh.getRange(job.row, 12).setValue(newRetry);
      } else {
        var backoff = Math.min(Math.pow(2, newRetry) * 30000, 1800000); // 60s→30' cap
        sh.getRange(job.row, 6).setValue('RETRY');
        sh.getRange(job.row, 8).setValue('[' + res.code + '] ' + res.error);
        sh.getRange(job.row, 12).setValue(newRetry);
        sh.getRange(job.row, 13).setValue(new Date(nowMs + backoff).toISOString());
      }
    }
  });
}

// Cài trigger 1' (chạy 1 lần trong editor GAS sau deploy). Idempotent — xoá trigger cũ cùng tên trước.
function setupQueueTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'processBackgroundQueue') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processBackgroundQueue').timeBased().everyMinutes(1).create();
  return 'Đã cài trigger processBackgroundQueue (mỗi 1 phút)';
}

// ============================================================
// WARM-UP TRIGGER (perf sprint 2026-08-06 — Phase 4)
// GAS tắt V8 context sau vài phút idle → request kế bị "cold start" (3-8s nạp lại mọi
// file mops_00..05.js + reconnect Sheet). Store ít đơn (3-4 đơn/ngày) gần như 100%
// request đều dính. Trigger keepWarm mỗi 5' đọc 1 cell trivial để giữ context alive.
// Chi phí: 1 read/5phút — không đáng kể so với 3-8s cold cứu được.
// ============================================================
function keepWarm() {
  try {
    // Chạm Settings sheet nhẹ nhất có thể — 1 cell (không getDataRange). Đủ để V8 hoạt động
    // + kết nối Sheets service warm. KHÔNG gọi getSettings() (nặng hơn, cache TTL 300s cũng
    // sẽ tự warm khi request thật đến).
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET.SETTINGS);
    if (sh) sh.getRange('A1').getValue();
  } catch (e) { /* best-effort — trigger fail không được ảnh hưởng gì */ }
}

// Cài BỘ trigger vận hành (chạy 1 lần trong Apps Script editor sau khi push code):
//   - processBackgroundQueue 1' (drain Telegram queue — Phase 2)
//   - keepWarm 5' (giữ V8 context nóng — Phase 4)
// Idempotent, gọi lại an toàn (xoá trigger cũ cùng tên trước khi cài lại).
function installPerfTriggers() {
  var targets = { processBackgroundQueue: 1, keepWarm: 5 };
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (targets[t.getHandlerFunction()]) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processBackgroundQueue').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('keepWarm').timeBased().everyMinutes(5).create();
  return 'Đã cài triggers: processBackgroundQueue (1 phút) + keepWarm (5 phút)';
}

// Convenience: create tracking-page notification (delivery = status change, instant SENT)
function notifyTrackingPage(ss, orderId, event, recipientType, payload) {
  // Tracking is represented by the Order status itself; write the audit row as SENT
  // in the original append to avoid a second Sheets RPC.
  return createNotif(ss, orderId, event, recipientType, 'TRACKING_PAGE', payload, 'SENT');
}

function _enqueueReceiptJob(ss, orderId, paymentId, amount, store) {
  try {
    var sh = ss.getSheetByName(SHEET.NOTIFICATIONS);
    if (!sh) return null;
    var dateStr = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
    var jobId = 'N-' + dateStr + '-' + String(sh.getLastRow()).padStart(4, '0');
    sh.appendRow([
      jobId, orderId || '', 'RECEIPT_AUTO_CREATE', 'SYSTEM', 'FINANCE', 'PENDING', '', '',
      JSON.stringify({ order_id: orderId, payment_id: paymentId, amount: amount, store: store || '' }),
      nowIso(), '', 0, nowIso(), ''
    ]);
    return jobId;
  } catch (e) { return null; }
}

// ============================================================
// ACTIVITY LOG
// ============================================================

function logActivity(ss, entityType, entityId, action, user) {
  try {
    var sh     = ss.getSheetByName(SHEET.ACTIVITY_LOGS);
    if (!sh)   return;
    var logId  = 'LOG' + String(sh.getLastRow()).padStart(6, '0');
    sh.appendRow([logId, entityType, entityId, action, user || 'system', nowIso()]);
  } catch (ex) { /* non-fatal */ }
}

// AuditTrail — bổ sung cho ActivityLogs, CHỈ dùng cho hành động nhạy cảm domain Finance
// (Before/After/Reason) — xem docs/architecture/security.md §3. KHÔNG có trường IP (Apps Script
// không expose IP client đáng tin cậy — xem lý do ở tài liệu đó, cột này cố tình bỏ, không phải sót).
function logAuditTrail(ss, entityType, entityId, action, before, after, reason, actorStaffId) {
  try {
    var sh = ss.getSheetByName(SHEET.AUDIT_TRAIL);
    if (!sh) return;
    var auditId = 'AUD' + String(sh.getLastRow()).padStart(6, '0');
    sh.appendRow([
      auditId, entityType, entityId, action,
      before ? JSON.stringify(before) : '',
      after  ? JSON.stringify(after)  : '',
      reason || '',
      actorStaffId || 'system',
      nowIso()
    ]);
  } catch (ex) { /* non-fatal — không được để lỗi ghi audit chặn nghiệp vụ chính */ }
}

// ============================================================
// CUSTOMER UPSERT
// ============================================================

function upsertCustomer(ss, phone, name, email) {
  var sh      = ss.getSheetByName(SHEET.CUSTOMERS);
  var lastRow = sh.getLastRow();
  var now     = nowIso();

  // create_order_admin already resolves the customer policy by phone. Reuse that
  // row in this request instead of scanning Customers a second time.
  // 2026-08-16 bug fix: KHÔNG đè tên/email khi khách đã tồn tại — chỉ điền khi ô cũ trống.
  // Bug: staff nhập "Hạnh Nguyễn" + SĐT cũ trong form tạo đơn → trước đây LUÔN ghi name mới lên
  // Customers.C → mọi đơn cũ cùng customer_id đều đổi tên hiển thị. Nghiệp vụ đúng: hồ sơ khách
  // chỉ đổi qua "Sửa khách hàng" (updateCustomer) — flow tạo đơn không được đụng.
  var cachedByPhone = _REQ.__customerByPhone;
  var cached = cachedByPhone && Object.prototype.hasOwnProperty.call(cachedByPhone, String(phone))
    ? cachedByPhone[String(phone)] : undefined;
  if (cached !== undefined) {
    if (cached && cached._row) {
      var cachedRow = cached._row;
      // Keep CreatedAt untouched: _findCustomerByPhone intentionally returns only the fields
      // needed by order pricing, so a cached-row update must not reconstruct columns C:F.
      // Chỉ ghi name nếu tên cũ TRỐNG (guard chống đè tên khách đã có hồ sơ 2026-08-16).
      if (name && !String(cached.name || '').trim()) sh.getRange(cachedRow, 3).setValue(name);
      if (email && !String(cached.email || '').trim()) sh.getRange(cachedRow, 4).setValue(email);
      sh.getRange(cachedRow, 6).setValue(now);
      return String(cached.customer_id);
    }
    // The earlier authoritative lookup found no customer. Skip the duplicate full scan below.
    lastRow = 1;
  }

  if (lastRow > 1) {
    // PERF (2026-09-05): trước đây getRange(...).getValues() chạy MỖI lần khách tự đặt đơn (không
    // qua _staffActor nên __customerByPhone rỗng, luôn rơi vào nhánh này) — full scan Customers trên
    // đường tạo đơn nóng nhất. Dùng _cachedArrayRead (đã có, cùng cơ chế Products/InventoryMovements
    // dùng) — cache 300s, tự invalidate theo _analyticsGen() (bump ở MỌI write, kể cả chính
    // upsertCustomer() tạo khách mới bên dưới, nên không đọc phải dữ liệu cũ ở lượt gọi kế tiếp).
    var data = _cachedArrayRead('customers_upsert_scan', function() {
      return sh.getRange(2, 1, lastRow - 1, 7).getValues();
    });
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][1]) === phone) {
        var row = i + 2;
        var existingName  = String(data[i][2] || '').trim();
        var existingEmail = String(data[i][3] || '').trim();
        var existingStatus = String(data[i][6] || 'active');
        // Chỉ ghi khi ô cũ TRỐNG (guard chống đè tên khách đã có hồ sơ 2026-08-16).
        if (name && !existingName)   sh.getRange(row, 3).setValue(name);
        if (email && !existingEmail) sh.getRange(row, 4).setValue(email);
        // Auto-restore soft-deleted customer khi tạo đơn mới với SĐT của khách đã ẩn:
        // rare-but-real (staff xoá nhầm rồi khách quay lại đặt) → khôi phục thay vì tạo mới cùng SĐT.
        if (existingStatus === 'deleted') {
          sh.getRange(row, 7).setValue('active');
          try { logActivity(ss, 'CUSTOMER', String(data[i][0]), 'CUSTOMER_RESTORED_ON_NEW_ORDER', 'system:upsert'); } catch (e) {}
        }
        sh.getRange(row, 6).setValue(now); // LastOrderAt
        return String(data[i][0]);         // CustomerID
      }
    }
  }

  var customerId = generateId(sh, 'CUS', 6);
  // Cột Phone phải là "Plain text" TRƯỚC KHI ghi — nếu ghi thẳng qua appendRow()
  // trong khi cột đang ở định dạng "Automatic", Sheets tự nhận "0912345678" là
  // số và LƯU LUÔN thành 912345678 (số 0 đầu mất vĩnh viễn ngay tại thời điểm
  // ghi, không phải lỗi hiển thị đọc lại như 2 lỗi trước) — set format sau khi
  // appendRow xong sẽ QUÁ TRỄ vì giá trị gốc đã bị phá. Phải ghi rỗng trước, ép
  // định dạng, rồi mới setValue số điện thoại thật.
  sh.appendRow([customerId, '', name || '', email || '', now, now, 'active']);
  var newRow = sh.getLastRow();
  _forcePlainText(sh, newRow, [2]);
  sh.getRange(newRow, 2).setValue(phone);
  return customerId;
}

// Admin sửa tay Tên/Email/CustomerGroup/DefaultDiscountPercent (docs/mops.md §16) — quyền
// customers.edit. CustomerGroup='SỈ' + DefaultDiscountPercent là chính sách giá do Owner/Admin
// duyệt trước (không phải quyết định tại chỗ của thu ngân) — đây là nơi DUY NHẤT ghi 2 field này.
function updateCustomer(payload) {
  var customerId = String(payload.customer_id || '').trim();
  if (!customerId) throw new Error('customer_id là bắt buộc');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.CUSTOMERS);
  if (!sh || sh.getLastRow() < 2) throw new Error('Không tìm thấy khách hàng: ' + customerId);

  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues();
  var row = -1;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === customerId) { row = i + 2; break; }
  }
  if (row === -1) throw new Error('Không tìm thấy khách hàng: ' + customerId);

  if (payload.name !== undefined) {
    var name = _sanitizeText(payload.name, 100);
    if (!name) throw new Error('Tên khách hàng không được để trống');
    sh.getRange(row, 3).setValue(name);
  }
  if (payload.email !== undefined) {
    sh.getRange(row, 4).setValue(_sanitizeText(payload.email, 100));
  }
  if (payload.customer_group !== undefined) {
    var group = String(payload.customer_group || 'LẺ').trim();
    if (['LẺ', 'SỈ'].indexOf(group) === -1) throw new Error('CustomerGroup phải là LẺ hoặc SỈ');
    sh.getRange(row, 10).setValue(group);
  }
  if (payload.default_discount_percent !== undefined) {
    var pct = Number(payload.default_discount_percent);
    if (isNaN(pct) || !isFinite(pct) || pct < 0 || pct > 100) throw new Error('% chiết khấu mặc định phải trong khoảng 0-100');
    sh.getRange(row, 11).setValue(pct);
  }

  // Hồ sơ CRM (cột L-T, review Drawer CRM 2026-07-16) — mỗi field chỉ ghi khi payload thật sự gửi
  // (partial update, giống 4 field phía trên), cho phép gọi riêng lẻ (vd chỉ lưu Notes từ ô quick-save
  // trong Drawer mà không đụng các field khác).
  if (payload.address_street !== undefined)   sh.getRange(row, 12).setValue(_sanitizeText(payload.address_street, 200));
  if (payload.address_ward !== undefined)     sh.getRange(row, 13).setValue(_sanitizeText(payload.address_ward, 100));
  if (payload.address_district !== undefined) sh.getRange(row, 14).setValue(_sanitizeText(payload.address_district, 100));
  if (payload.address_city !== undefined)     sh.getRange(row, 15).setValue(_sanitizeText(payload.address_city, 100));
  if (payload.birthday !== undefined)         sh.getRange(row, 16).setValue(_sanitizeText(payload.birthday, 10));
  if (payload.acquisition_channel !== undefined) {
    var channel = String(payload.acquisition_channel || '').trim();
    var validChannels = ['', 'Facebook', 'Zalo', 'Cửa hàng', 'Sapo', 'Khác'];
    if (validChannels.indexOf(channel) === -1) throw new Error('Kênh nguồn khách hàng không hợp lệ');
    sh.getRange(row, 17).setValue(channel);
  }
  if (payload.notes !== undefined) sh.getRange(row, 18).setValue(_sanitizeText(payload.notes, 2000));
  if (payload.loyalty_points !== undefined) {
    var points = Number(payload.loyalty_points);
    if (isNaN(points) || !isFinite(points) || points < 0) throw new Error('Điểm tích lũy phải là số không âm');
    sh.getRange(row, 19).setValue(points);
  }
  if (payload.membership_tier !== undefined) {
    var tier = String(payload.membership_tier || '').trim();
    var validTiers = ['', 'Silver', 'Gold', 'Diamond'];
    if (validTiers.indexOf(tier) === -1) throw new Error('Hạng thành viên không hợp lệ');
    sh.getRange(row, 20).setValue(tier);
  }

  logActivity(ss, 'CUSTOMER', customerId, 'CUSTOMER_UPDATED', payload._callerUser || 'staff');
  return { customer_id: customerId, updated: true };
}

// ============================================================
// PRODUCT VALIDATION + SERVER-SIDE PRICING
// ============================================================

function validateAndPriceItems(ss, rawItems, orderType) {
  // Cache (perf sprint 2026-08-06 — Phase 3): Products/ProductMappings hầu như không đổi trong 1 phiên
  // đặt hàng, nhưng validateAndPriceItems chạy MỌI createOrder + gọi 2 getDataRange nặng (Products ~18 cột
  // × N dòng). Đọc qua _cachedRead → CacheService 300s + gen invalidate: mọi WRITE tự bust gen ở
  // _dispatchWrite (mops_00.js) nên updateProduct/syncProducts/_adjustInventoryQty (best-effort trong
  // createOrder — bump sau khi handler return) đều đảm bảo lần sau đọc data mới. Size guard 95KB đã có
  // sẵn trong _cachedRead — catalog quá to (>95KB JSON) sẽ tự bỏ qua cache, function vẫn chạy.
  // Order writes normally contain a small, fully-qualified cart. Resolve that cart directly by
  // key instead of materializing the whole catalog; keep the full cached path for legacy carts
  // that omit variant_id and therefore need active-handle fallback semantics.
  var canUseNarrowCatalog = rawItems.length > 0 && rawItems.every(function(item) {
    return String(item.variant_id || item.variantId || '').trim() !== '';
  });
  var narrowMappingRows = [], narrowProductRows = [], narrowProductRowsByVariant = {};
  var narrowMappingSeen = {}, narrowProductSeen = {};
  if (canUseNarrowCatalog) {
    var mappingSheetN = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);
    var productSheetN = ss.getSheetByName(SHEET.PRODUCTS);
    for (var ni = 0; ni < rawItems.length; ni++) {
      var itemHandleN = String(rawItems[ni].handle || rawItems[ni].sapo_handle || '');
      var itemVariantN = String(rawItems[ni].variant_id || rawItems[ni].variantId || '');
      if (narrowMappingSeen[itemHandleN] === undefined) {
        narrowMappingSeen[itemHandleN] = true;
        var mappingRowN = _findSheetRowExact(mappingSheetN, 1, itemHandleN);
        if (mappingRowN !== -1) narrowMappingRows.push(mappingSheetN.getRange(mappingRowN, 1, 1, 10).getValues()[0]);
      }
      if (narrowProductSeen[itemVariantN] === undefined) {
        narrowProductSeen[itemVariantN] = true;
        var productRowN = _findSheetRowExact(productSheetN, 2, itemVariantN);
        if (productRowN === -1) { canUseNarrowCatalog = false; break; }
        narrowProductRowsByVariant[itemVariantN] = productRowN;
        narrowProductRows.push(productSheetN.getRange(productRowN, 1, 1, 18).getValues()[0]);
      }
    }
  }

  var mappingData = canUseNarrowCatalog ? narrowMappingRows : _cachedArrayRead('catalog_mappings', function() {
    var mappingSheet = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);
    return mappingSheet.getLastRow() > 1
      ? mappingSheet.getRange(2, 1, mappingSheet.getLastRow() - 1, 10).getValues()
      : [];
  });
  var productData = canUseNarrowCatalog ? narrowProductRows : _cachedArrayRead('catalog_products', function() {
    var productSheet = ss.getSheetByName(SHEET.PRODUCTS);
    return productSheet.getLastRow() > 1
      ? productSheet.getRange(2, 1, productSheet.getLastRow() - 1, 18).getValues() // 18 = VariantTitle (R)
      : [];
  });

  var mappings = {};
  mappingData.forEach(function(r) {
    mappings[String(r[0])] = {
      handle:           String(r[0]),
      enabled:          r[1] === true || String(r[1]).toLowerCase() === 'true',
      capabilities:     String(r[2] || ''),
      depositAmount:    Number(r[3]) || 0,
      sapoSyncRequired: r[4] === true || String(r[4]).toLowerCase() === 'true',
      displayName:      String(r[5] || ''),
      sortOrder:        Number(r[6]) || 0,
      costPrice:        Number(r[7]) || 0,
      safetyStockMin:   Number(r[8]) || 0,
      safetyStockMax:   Number(r[9]) || 0
    };
  });

  // Đa-biến-thể (2026-07-17): Products giờ có NHIỀU dòng / 1 handle (mỗi biến thể/size 1 dòng).
  // Handle KHÔNG còn là khoá duy nhất — build index kép:
  //   productsByVariant  = khoá theo VariantID (khoá chính khi bán, chọn đúng size/mẫu)
  //   productsByHandle    = handle → biến thể đầu tiên (ưu tiên active) — fallback tương thích ngược
  //                         cho item chỉ gửi handle (page.payment cũ / đơn 1-biến-thể).
  var productsByVariant = {};
  var productsByHandle  = {};
  productData.forEach(function(r) {
    var p = {
      _row:             canUseNarrowCatalog ? (narrowProductRowsByVariant[String(r[1] || '')] || 0) : 0,
      productId:        r[0],
      variantId:        String(r[1] || ''),
      handle:           String(r[2]),
      sku:              String(r[3] || ''),
      title:            String(r[4] || ''),
      vendor:           String(r[5] || ''),
      productType:      String(r[6] || ''),
      price:            Number(r[7]) || 0,
      compareAtPrice:   Number(r[8]) || 0,
      weight:           Number(r[9]) || 0,
      requiresShipping: r[10] === true || String(r[10]).toLowerCase() === 'true',
      image:            String(r[11] || ''),
      status:           String(r[12] || 'inactive'),
      updatedAt:        r[13],
      variantTitle:     String(r[17] || '') // R — nhãn biến thể/size (đa-biến-thể 2026-07-17)
    };
    if (p.variantId) productsByVariant[p.variantId] = p;
    var cur = productsByHandle[p.handle];
    if (!cur || (cur.status !== 'active' && p.status === 'active')) productsByHandle[p.handle] = p;
  });

  var resolvedItems = [];
  var totalAmount   = 0;

  rawItems.forEach(function(item) {
    var handle    = String(item.handle || item.sapo_handle || '');
    var variantId = String(item.variant_id || item.variantId || '');
    var qty       = parseInt(item.qty || item.quantity || 1, 10);

    // Mapping là TUỲ CHỌN — chỉ cần để bật đặt cọc/booking cho 1 handle cụ thể.
    // Không có mapping vẫn bán được bình thường (thanh toán đủ), miễn là sản phẩm
    // có thật + đang active bên Products (nguồn xác thực chính — xem check dưới).
    // Nếu ĐÃ có mapping nhưng bị tắt (enabled=false) thì vẫn chặn — admin có quyền
    // khoá hẳn 1 sản phẩm khỏi MOPS dù đã từng "Kết nối".
    var mapping = mappings[handle] || {
      handle: handle, enabled: true, capabilities: 'product', depositAmount: 0,
      sapoSyncRequired: false, displayName: '', sortOrder: 999,
      costPrice: 0, safetyStockMin: 0, safetyStockMax: 0
    };

    if (!mapping.enabled)
      throw new Error('Sản phẩm "' + handle + '" tạm ngưng trong MOPS');

    // Ưu tiên khoá VariantID (chọn đúng size/mẫu khách đặt); thiếu variant_id → fallback biến thể
    // đầu tiên của handle (tương thích ngược item cũ). Đơn nhiều biến thể BẮT BUỘC gửi variant_id.
    var product = variantId ? productsByVariant[variantId] : null;
    if (!product) product = productsByHandle[handle];

    if (!product)
      throw new Error('Sản phẩm "' + (variantId || handle) + '" không tồn tại (chưa sync từ SAPO?)');

    if (product.status !== 'active')
      throw new Error('Sản phẩm "' + (product.title || handle) + '" đã ngưng bán');

    var unitPrice = product.price; // SERVER-SIDE — frontend amount ignored
    var lineTotal = unitPrice * qty;
    totalAmount  += lineTotal;

    // Tên hiển thị kèm nhãn biến thể (đa-biến-thể 2026-07-17) — vào OrderItems.ProductName + phiếu
    // đóng gói giao hàng phải phân biệt được size/mẫu (vd "Kem chống nắng — Size 50ml").
    var displayName = mapping.displayName || product.title;
    if (product.variantTitle) displayName = displayName + ' — ' + product.variantTitle;

    var snapshot = {
      productId:      product.productId,
      variantId:      product.variantId,
      variantTitle:   product.variantTitle,
      handle:         handle,
      sku:            product.sku,
      title:          product.title,
      price:          unitPrice,
      compareAtPrice: product.compareAtPrice,
      image:          product.image,
      vendor:         product.vendor,
      productType:    product.productType,
      // weight (perf sprint 2026-08-06 — getOrder): chốt trong snapshot để getOrder không phải scan
      // full Products chỉ để lấy trọng lượng gợi ý gói hàng. Đơn cũ (trước sprint) thiếu field này —
      // getOrder tự fallback quét Products cho item thiếu (xem itemsMissingEnrich).
      weight:         Number(product.weight) || 0,
      qty:            qty
    };

    resolvedItems.push({
      handle:      handle,
      sku:         product.sku,
      productId:   product.productId,
      variantId:   product.variantId,
      variantTitle: product.variantTitle,
      productName: displayName,
      price:       unitPrice,
      qty:         qty,
      lineTotal:   lineTotal,
      snapshot:    JSON.stringify(snapshot),
      mapping:     mapping,
      product:     product
    });
  });

  return { items: resolvedItems, totalAmount: totalAmount };
}

// ============================================================
// COUPONS — mã giảm giá MOPS-native (KHÔNG gọi Price Rule API thật của
// SAPO — độc lập, tránh phụ thuộc mạng vào luồng thanh toán).
//
// Sheet Coupons: Code (khoá tự nhiên, giống Handle của ProductMappings),
// Enabled, ValueType ('percent'|'fixed'), Value, MinOrderAmount, MaxUses
// (0 = không giới hạn), UsedCount, StartAt, ExpiresAt, Description,
// CreatedAt, CreatedBy.
//
// v1 KHÔNG hỗ trợ: giới hạn theo sản phẩm/handle, giới hạn theo từng
// khách hàng (cần quét toàn bộ Orders theo SĐT — tốn, không phải yêu
// cầu cốt lõi ban đầu).
// ============================================================

// Chuẩn hoá 1 CSV (hoặc mảng sẵn) thành mảng token lowercase/trim, bỏ rỗng, unique.
// Dùng cho scope coupon (ScopeTypes / ScopeProducts) — chấp nhận cả chuỗi (đọc từ sheet)
// lẫn mảng (nhận từ payload FE).
function _parseCsvList(v) {
  if (v == null) return [];
  var arr = Array.isArray(v) ? v : String(v).split(',');
  var out = [], seen = {};
  arr.forEach(function(x) {
    var t = String(x || '').trim().toLowerCase();
    if (t && !seen[t]) { seen[t] = true; out.push(t); }
  });
  return out;
}

// Dùng ở 2 nơi: preview (nút "Áp dụng", không tính lượt dùng) và createOrder()
// (áp dụng thật). Không throw — luôn trả { valid, error } để caller tự quyết
// định xử lý (preview thì hiện lỗi, createOrder thì throw để chặn tạo đơn).
//
// SCOPE (phase-07 Pha B): coupon có thể giới hạn phạm vi giảm theo LOẠI sản phẩm
// (product_type) và/hoặc SẢN PHẨM cụ thể (handle). Khi có scope, giảm giá CHỈ tính trên
// subtotal của các dòng hàng đủ điều kiện — KHÔNG phải toàn đơn. Rỗng cả hai = áp dụng
// toàn đơn (tương thích ngược 100% với mọi mã cũ — hành vi byte-identical). `lineItems`
// (tuỳ chọn) = [{ handle, product_type, line_total }] đã resolve server-side
// (createOrder/updateOrder: resolvedItems; preview: _resolveCouponLineItems). Caller cũ
// KHÔNG gửi lineItems → coi như toàn đơn (chỉ an toàn với mã không scope; mọi call site đã migrate).
function _evaluateCoupon(ss, code, totalAmount, lineItems) {
  var normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return { valid: false, error: 'Vui lòng nhập mã giảm giá.' };

  var c = Repository.Coupons.findByCode(normalizedCode);
  if (!c) return { valid: false, error: 'Mã giảm giá không tồn tại.' };

  var coupon = {
    code:      normalizedCode,
    enabled:   c.enabled,
    valueType: c.value_type,
    value:     c.value,
    minOrder:  c.min_order_amount,
    maxUses:   c.max_uses,
    usedCount: c.used_count,
    startAt:   c.start_at ? new Date(c.start_at) : null,
    expiresAt: c.expires_at ? new Date(c.expires_at) : null,
    scopeTypes:    c.scope_types || [],
    scopeProducts: c.scope_products || []
  };

  if (!coupon.enabled) return { valid: false, error: 'Mã giảm giá đã bị tắt.' };

  var now = new Date();
  if (coupon.startAt   && now < coupon.startAt)   return { valid: false, error: 'Mã giảm giá chưa tới thời gian áp dụng.' };
  if (coupon.expiresAt && now > coupon.expiresAt) return { valid: false, error: 'Mã giảm giá đã hết hạn.' };
  // MinOrderAmount kiểm tra trên TỔNG đơn (ngưỡng để được dùng mã), không phải subtotal đủ điều kiện.
  if (totalAmount < coupon.minOrder) {
    return { valid: false, error: 'Đơn hàng cần tối thiểu ' + coupon.minOrder.toLocaleString('vi-VN') + 'đ để dùng mã này.' };
  }
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: 'Mã giảm giá đã hết lượt sử dụng.' };
  }

  // Cơ sở tính giảm giá — theo scope nếu có, ngược lại toàn đơn.
  var scoped = coupon.scopeTypes.length > 0 || coupon.scopeProducts.length > 0;
  var base;
  if (scoped && lineItems && lineItems.length) {
    base = 0;
    lineItems.forEach(function(li) {
      var t = String(li.product_type || li.productType || '').trim().toLowerCase();
      var h = String(li.handle || '').trim().toLowerCase();
      var match = (coupon.scopeTypes.length    && coupon.scopeTypes.indexOf(t) !== -1)
               || (coupon.scopeProducts.length && coupon.scopeProducts.indexOf(h) !== -1);
      if (match) base += Number(li.line_total || li.lineTotal || 0);
    });
    if (base <= 0) {
      return { valid: false, error: 'Mã này chỉ áp dụng cho một số sản phẩm nhất định — giỏ hàng chưa có sản phẩm phù hợp.' };
    }
  } else {
    base = totalAmount; // không scope, hoặc caller cũ không gửi lineItems → toàn đơn
  }

  var discountAmount = coupon.valueType === 'fixed' ? coupon.value : base * (coupon.value / 100);
  discountAmount = Math.round(Math.max(0, Math.min(discountAmount, base)));

  // discount_amount (snake_case) — nhất quán với mọi field khác trên wire API.
  // scoped/eligible_subtotal để preview hiển thị phạm vi áp dụng; `coupon` chỉ dùng nội bộ.
  return { valid: true, discount_amount: discountAmount, scoped: scoped, eligible_subtotal: base, coupon: coupon };
}

// Resolve line-items cho preview_coupon: FE chỉ gửi [{handle, qty}] (giỏ hàng KHÔNG biết
// product_type/giá server). Tra Products (active-preferred) lấy product_type + giá chuẩn →
// [{handle, product_type, line_total}]. Preview mang tính minh hoạ; createOrder/updateOrder
// mới là nơi tính giảm giá chính thức (cùng thuật toán, dùng resolvedItems đã resolve đầy đủ).
function _resolveCouponLineItems(ss, rawItems) {
  if (!rawItems || !rawItems.length) return [];
  // Đọc qua Repository.Products (phase-07 GĐ3.3) — active-preferred theo handle.
  var byHandle = {};
  Repository.Products.findAll().forEach(function(p) {
    var h = String(p.handle || '').trim().toLowerCase();
    if (!h) return;
    var status = String(p.status || '').toLowerCase();
    var cur = byHandle[h];
    if (!cur || (cur._status !== 'active' && status === 'active')) {
      byHandle[h] = { product_type: p.product_type, price: p.price, _status: status };
    }
  });
  var out = [];
  rawItems.forEach(function(it) {
    var h = String(it.handle || '').trim().toLowerCase();
    if (!h) return;
    var qty = parseInt(it.qty || it.quantity || 1, 10) || 1;
    var p = byHandle[h];
    if (p) out.push({ handle: h, product_type: p.product_type, line_total: p.price * qty });
  });
  return out;
}

// Tra ValueType/Value của 1 coupon theo Code — dùng để hiển thị "(x%)" trên hoá đơn/chi tiết đơn
// (getOrder(), review in đơn 2026-07-16). KHÔNG quan tâm coupon còn enabled/hết hạn hay không —
// đơn đã tạo xong rồi, chỉ cần biết % đã áp dụng lúc đó, khác mục đích check hiệu lực của _evaluateCoupon().
function _getCouponValueType(ss, code) {
  var c = Repository.Coupons.findByCode(code);
  return c ? { valueType: c.value_type, value: c.value } : null;
}

// Chỉ gọi SAU KHI đơn đã ghi thành công — best-effort, không được throw ra ngoài
// (1 lỗi đếm lượt dùng không được phép làm hỏng phản hồi cho đơn đã tạo/thanh toán
// xong). Khoá ngắn quanh đúng phần đọc-sửa-ghi UsedCount, theo khuôn pushOrderToSapo().
function _incrementCouponUsage(ss, code) {
  var normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return;
  var sh = ss.getSheetByName(SHEET.COUPONS);
  if (!sh || sh.getLastRow() < 2) return;

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    // Đọc lại trong lock qua Repository (findAll fresh) → lấy _row + used_count hiện tại.
    var c = Repository.Coupons.findByCode(normalizedCode);
    if (c) sh.getRange(c._row, 7).setValue(c.used_count + 1); // cột 7 = UsedCount
  } catch (ex) {
    // Best-effort — nuốt lỗi, không ảnh hưởng đơn đã tạo thành công.
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* best-effort */ }
  }
}

function listCoupons() {
  var coupons = Repository.Coupons.findAll().map(function(c) {
    return {
      code:             c.code,
      enabled:          c.enabled,
      value_type:       c.value_type,
      value:            c.value,
      min_order_amount: c.min_order_amount,
      max_uses:         c.max_uses,
      used_count:       c.used_count,
      start_at:         c.start_at || '',
      expires_at:       c.expires_at || '',
      description:      c.description,
      title:            c.title,
      scope_types:      c.scope_types,
      scope_products:   c.scope_products,
      created_at:       c.created_at || '',
      created_by:       c.created_by
    };
  });
  return { coupons: coupons };
}

function createCoupon(payload) {
  var code = String(payload.code || '').trim().toUpperCase();
  if (!code) throw new Error('Mã giảm giá là bắt buộc');
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new Error('Mã chỉ gồm chữ/số/gạch ngang, 3-30 ký tự');

  var valueType = String(payload.value_type || 'percent').toLowerCase();
  if (['percent', 'fixed'].indexOf(valueType) === -1) throw new Error('Loại giảm giá không hợp lệ');

  var value = Number(payload.value);
  if (isNaN(value) || value <= 0) throw new Error('Giá trị giảm không hợp lệ');
  if (valueType === 'percent' && value > 100) throw new Error('Giảm theo % không được vượt quá 100');

  var minOrder = Number(payload.min_order_amount) || 0;
  if (minOrder < 0) throw new Error('Đơn tối thiểu không hợp lệ');
  var maxUses = Number(payload.max_uses) || 0;
  if (maxUses < 0) throw new Error('Số lượt dùng tối đa không hợp lệ');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.COUPONS);
  if (!sh) throw new Error('Sheet Coupons không tồn tại');

  if (Repository.Coupons.findByCode(code)) throw new Error('Mã giảm giá đã tồn tại');

  var startAt   = String(payload.start_at || '').trim();
  var expiresAt = String(payload.expires_at || '').trim();
  var desc      = _sanitizeText(payload.description || '', 200);
  var title     = _sanitizeText(payload.title || '', 80);
  // Scope (Pha B) — chuẩn hoá CSV lowercase; rỗng cả hai = áp dụng toàn đơn.
  var scopeTypes    = _parseCsvList(payload.scope_types).join(',');
  var scopeProducts = _parseCsvList(payload.scope_products).join(',');

  // 16 phần tử: ..CreatedBy(11), MaxDiscountAmount(12, '' — chưa dùng), Title(13),
  // ScopeTypes(14), ScopeProducts(15). Append đủ 16 tự mở rộng sheet nếu đang thiếu cột
  // (dòng cũ để trống các cột mới → đọc ra '' / []).
  sh.appendRow([code, true, valueType, value, minOrder, maxUses, 0, startAt, expiresAt, desc, nowIso(), payload._callerUser || 'owner', '', title, scopeTypes, scopeProducts]);
  _forceNumberFormat(sh, sh.getLastRow(), [4, 5, 6, 7]); // Value, MinOrderAmount, MaxUses, UsedCount

  logActivity(ss, 'COUPON', code, 'COUPON_CREATED', payload._callerUser || 'owner');
  return { code: code };
}

function toggleCouponActive(payload) {
  var code = String(payload.code || '').trim().toUpperCase();
  if (!code) throw new Error('code là bắt buộc');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var c = Repository.Coupons.findByCode(code);
  if (!c) throw new Error('Không tìm thấy mã giảm giá: ' + code);

  var sh = ss.getSheetByName(SHEET.COUPONS);
  var newActive = !c.enabled;
  sh.getRange(c._row, 2).setValue(newActive); // cột 2 = Enabled
  logActivity(ss, 'COUPON', code, newActive ? 'COUPON_ACTIVATED' : 'COUPON_DEACTIVATED', payload._callerUser || 'owner');
  return { code: code, enabled: newActive };
}

// ============================================================
// CREATE ORDER (unified — covers product / booking / deposit)
// ============================================================

// ── SALES → INVENTORY INTEGRATION (docs/architecture/inventory.md §2.1, Phase 02 Bước 4) ──
// Giá vốn BÌNH QUÂN GIA QUYỀN (không FIFO theo lô — Google Sheets không có cấu trúc hàng
// đợi hiệu quả để trừ dần từng lô mỗi lần bán, xem docs/implementation/phase-02-inventory.md).
// Tính từ toàn bộ InventoryMovements Type=IN của sản phẩm — KHÔNG lưu tĩnh, luôn tính lại
// tại thời điểm gọi (cùng nguyên tắc "Balance không lưu" ở finance.md §9.2).
// Trả về 0 nếu sản phẩm CHƯA từng có lô nhập nào qua PurchaseOrder — nghĩa là "chưa có dữ
// liệu giá vốn", KHÔNG suy đoán từ Products.Price. Báo cáo lãi lỗ (Phase 05/06) phải tự xử
// lý UnitCost=0 là dữ liệu thiếu, không phải giá vốn thật bằng 0.
function _calcAvgCost(productId, variantId) {
  if (!productId) return 0;
  // Giá vốn bình quân theo TỪNG biến thể (2026-07-17) — findByProduct kèm variantId đã tự gộp cả các
  // dòng IN cũ có VariantID rỗng (tồn hồi single-variant) vào biến thể đang tính, nên không regress.
  var movementsIn = Repository.InventoryMovements.findByProduct(productId, variantId).filter(function(m) { return m.type === 'IN'; });
  if (!movementsIn.length) return 0;
  var totalQty = 0, totalCost = 0;
  movementsIn.forEach(function(m) { totalQty += m.qty; totalCost += m.qty * m.unit_cost; });
  return totalQty > 0 ? totalCost / totalQty : 0;
}

// perf (2026-07-25) — đọc InventoryMovements (chỉ dòng IN) ĐÚNG 1 LẦN, trả hàm cost(pid,vid) tính giá
// vốn bình quân gia quyền cho từng item TRÊN MẢNG ĐÃ ĐỌC. Thay _calcAvgCost gọi-theo-từng-món (mỗi lần
// quét full InventoryMovements = N+1 nặng trong vòng lặp createOrder/updateOrder/pull). Logic khớp HỆT
// _calcAvgCost (predicate + weighted avg) → behavior-identical. Gọi TRƯỚC vòng lặp: hợp lệ vì vòng lặp chỉ
// append OUT (SALE) — KHÔNG đổi tập IN; _reverseSaleMovements (nếu có, chạy trước) đã append reversal IN
// nên gọi sau nó là thấy đủ (giống _calcAvgCost cũ gọi trong loop sau reverse).
function _calcAvgCostBatch() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.INVENTORY_MOVEMENTS);
  var rows = _cachedArrayRead('inventory_movement_rows', function() {
    return sh && sh.getLastRow() >= 2
      ? sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues()
      : [];
  // Weighted average cost depends only on Type=IN rows. Keying this cache to the global write
  // generation forced a full InventoryMovements scan after every unrelated write (each SALE OUT
  // append included), which is the dominant cost of create/update order once movement history
  // grows. Repository.InventoryMovements bumps 'inventory_in' whenever an IN row is written.
  }, 'inventory_in');
  var ins = [];
  rows.forEach(function(r) {
    if (String(r[2]) === 'IN') ins.push({ pid: String(r[1]), vid: String(r[10] || ''), qty: Number(r[3]) || 0, cost: Number(r[4]) || 0 });
  });
  return _avgCostFromIns(ins);
}

// Tách phần tính khỏi phần đọc sheet để updateOrder() tái dùng tập IN đã quét khi đảo movement
// SALE cũ. Nhờ vậy Sửa đơn không phải quét toàn bộ InventoryMovements lần thứ ba chỉ để tính giá vốn.
function _avgCostFromIns(ins) {
  return function(productId, variantId) {
    if (!productId) return 0;
    var pid = String(productId), vid = variantId ? String(variantId) : '';
    var totalQty = 0, totalCost = 0;
    for (var i = 0; i < ins.length; i++) {
      var m = ins[i];
      if (m.pid !== pid) continue;
      if (vid && !(m.vid === vid || m.vid === '')) continue; // khớp _calcAvgCost: vid truyền → khớp hoặc rỗng
      totalQty += m.qty; totalCost += m.qty * m.cost;
    }
    return totalQty > 0 ? totalCost / totalQty : 0;
  };
}

// Cộng/trừ trực tiếp Products.InventoryQty (cột P) — ÁP DỤNG CHO MỌI SẢN PHẨM, không phân biệt
// Source=SAPO/LOCAL. Quyết định 2026-07-10: SAPO không thật sự quản lý kho cho store này (không
// bật module Kho — mind map "SAPO không cài kho"), nên Hướng A (SAPO là nguồn tồn duy nhất) không
// còn ý nghĩa thực tế — MOPS phải tự quản tồn kho để có báo cáo, cho MỌI sản phẩm. Đây là lý do
// syncProducts() (bên dưới) phải NGỪNG ghi đè cột này mỗi lần đồng bộ — nếu không số MOPS tự tính
// sẽ bị SAPO's inventory_quantity (không đáng tin, vì SAPO không quản lý kho) đè mất mỗi 6 giờ.
// Cho phép âm có chủ đích (bán âm được phép — mind map dòng 31). Best-effort, không throw ra
// ngoài — 1 lỗi cập nhật tồn kho không được phép chặn nghiệp vụ chính (đơn hàng/nhập hàng).
// perf (2026-07-25) — index (ProductID+VariantID → rowNumber) đọc Products cột A/B ĐÚNG 1 LẦN/request
// (request-memo), thay vì _adjustInventoryQty quét full Products MỖI lần gọi (N+1 nặng: nó được gọi
// theo TỪNG món trong createOrder/updateOrder/_reverseSaleMovements/postPurchaseOrder/pull). Row index
// ỔN ĐỊNH trong 1 request (không flow nào vừa THÊM dòng Products vừa adjust cùng request); createLocalProduct/
// syncProducts (có append dòng Products) gọi _memoBust('__prodRowIdx') để an toàn. Qty vẫn đọc FRESH từng
// cell khi adjust → tích luỹ đúng kể cả 2 món cùng biến thể. Behavior-identical với vòng lặp cũ.
function _productRowIndex(ss) {
  return _memo('__prodRowIdx', function() {
    var idx = { byPV: {}, firstByP: {} };
    var sh = ss.getSheetByName(SHEET.PRODUCTS);
    if (!sh || sh.getLastRow() < 2) return idx;
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues(); // A=ProductID, B=VariantID
    for (var i = 0; i < data.length; i++) {
      var pid = String(data[i][0]); if (!pid) continue;
      var vid = String(data[i][1] || '');
      var row = i + 2;
      if (idx.firstByP[pid] === undefined) idx.firstByP[pid] = row;
      var k = pid + '|' + vid;
      if (idx.byPV[k] === undefined) idx.byPV[k] = row;
    }
    return idx;
  });
}

function _adjustInventoryQty(ss, productId, variantId, delta) {
  if (!productId || !delta) return;
  try {
    var sh = ss.getSheetByName(SHEET.PRODUCTS);
    if (!sh || sh.getLastRow() < 2) return;
    // Đa-biến-thể: khớp ĐÚNG dòng (ProductID+VariantID); thiếu variantId → dòng đầu của ProductID; biến
    // thể chưa khớp → dồn dòng đầu (giữ nguyên tinh thần best-effort của bản cũ). Tra qua index memo.
    var idx = _productRowIndex(ss);
    var pid = String(productId);
    var row;
    if (variantId) {
      row = idx.byPV[pid + '|' + String(variantId)];
      if (row === undefined) row = idx.firstByP[pid];
    } else {
      row = idx.firstByP[pid];
    }
    if (row === undefined) return;
    var cell = sh.getRange(row, 16); // P = InventoryQty — đọc FRESH để tích luỹ đúng
    cell.setValue((Number(cell.getValue()) || 0) + delta);
  } catch (ex) { /* best-effort */ }
}

// Batch (perf sprint 2026-08-06): cộng delta vào Products.InventoryQty cho N cặp (productId,variantId)
// bằng 1 lần getValues + 1 lần setValues thay vì N × (getValue+setValue). Đi qua cùng _productRowIndex
// nên hành vi trùng dòng khớp bản đơn lẻ; delta dồn theo row (2 dòng cùng biến thể cộng dồn đúng).
// deltas = [{product_id, variant_id, delta}]. Silent best-effort giống bản lẻ.
function _adjustInventoryQtyBatch(ss, deltas) {
  if (!deltas || !deltas.length) return;
  try {
    var sh = ss.getSheetByName(SHEET.PRODUCTS);
    if (!sh || sh.getLastRow() < 2) return;
    var idx = _productRowIndex(ss);
    var perRow = {};
    for (var i = 0; i < deltas.length; i++) {
      var d = deltas[i];
      if (!d || !d.product_id || !d.delta) continue;
      var pid = String(d.product_id);
      var row = Number(d.product_row) || 0;
      if (row < 2) {
        if (!idx) idx = _productRowIndex(ss);
        if (d.variant_id) {
          row = idx.byPV[pid + '|' + String(d.variant_id)];
          if (row === undefined) row = idx.firstByP[pid];
        } else {
          row = idx.firstByP[pid];
        }
      }
      if (row === undefined) continue;
      perRow[row] = (perRow[row] || 0) + d.delta;
    }
    var rows = Object.keys(perRow).map(function(r) { return parseInt(r, 10); });
    if (!rows.length) return;
    rows.sort(function(a, b) { return a - b; });
    var minR = rows[0], maxR = rows[rows.length - 1];
    var range = sh.getRange(minR, 16, maxR - minR + 1, 1); // P = InventoryQty
    var vals = range.getValues();
    for (var k = 0; k < rows.length; k++) {
      var r = rows[k];
      vals[r - minR][0] = (Number(vals[r - minR][0]) || 0) + perRow[r];
    }
    range.setValues(vals);
  } catch (ex) { /* best-effort */ }
}

// Đảo ngược các InventoryMovements OUT (Type=SALE) của 1 đơn khi đơn chuyển CANCELLED/REFUNDED —
// ghi dòng đối ứng (Type=IN, note trỏ MovementID gốc), KHÔNG xoá/sửa dòng OUT gốc, đúng nguyên
// tắc append-only đã dùng cho LedgerEntries (finance.md §7.5 áp dụng tương tự sang Inventory).
// Idempotent: bỏ qua nếu đã có dòng đối ứng cho movement đó (đơn có thể bị gọi CANCELLED rồi lại
// REFUNDED, hoặc cùng 1 status gọi lại do retry). Best-effort — không throw ra ngoài, gọi từ
// updateOrderStatus() giống pattern autoCreateReceipt()/_incrementCouponUsage().
// Lập kế hoạch đảo movement SALE mà chưa ghi. updateOrder() ghép reversal IN với SALE OUT mới vào
// cùng một appendMany() để chỉ quét cột MovementID/cập nhật tồn kho một lần; caller khác vẫn dùng
// _reverseSaleMovements() bên dưới để commit ngay. entries luôn đứng trước SALE mới nên thứ tự audit
// giữ nguyên: reversal trước, rồi xuất theo giỏ mới.
function _planSaleMovementReversal(orderId, actorUser) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET.INVENTORY_MOVEMENTS);
    var ins = [], saleMovements = [], reversedNotes = {};
    if (sh && sh.getLastRow() >= 2) {
      sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues().forEach(function(r) {
        var type = String(r[2] || '');
        if (type === 'IN') {
          ins.push({ pid: String(r[1]), vid: String(r[10] || ''), qty: Number(r[3]) || 0, cost: Number(r[4]) || 0 });
        }
        if (String(r[5] || '') !== 'SALE' || String(r[6] || '') !== String(orderId)) return;
        if (type === 'OUT') {
          saleMovements.push({
            movement_id: String(r[0]), product_id: String(r[1]), variant_id: String(r[10] || ''),
            qty: Number(r[3]) || 0, unit_cost: Number(r[4]) || 0
          });
        } else if (r[7]) {
          reversedNotes[String(r[7])] = true;
        }
      });
    }

    var reversalEntries = [], qtyDeltas = [], reversalIns = [];
    saleMovements.forEach(function(m) {
      var note = '[Huỷ] Đối ứng cho ' + m.movement_id;
      if (reversedNotes[note]) return;
      reversalEntries.push({
        product_id: m.product_id, variant_id: m.variant_id, type: 'IN', qty: m.qty, unit_cost: m.unit_cost,
        source_type: 'SALE', source_ref: orderId, note: note, created_by: actorUser || 'system'
      });
      qtyDeltas.push({ product_id: m.product_id, variant_id: m.variant_id, delta: m.qty });
      reversalIns.push({ pid: m.product_id, vid: m.variant_id, qty: m.qty, cost: m.unit_cost });
    });
    return {
      entries: reversalEntries,
      qty_deltas: qtyDeltas,
      avg_cost: _avgCostFromIns(ins.concat(reversalIns))
    };
  } catch (moveErr) { /* best-effort — không chặn cập nhật trạng thái đơn vì lỗi log tồn kho */ }
}

// Perf: quét InventoryMovements ĐÚNG 1 lần, rồi batch append các dòng đối ứng + cập nhật tồn kho.
// Trả hàm tính giá vốn dựa trên tập IN sau đảo để updateOrder() dùng lại, bỏ thêm một lần full scan.
// Caller khác (updateOrderStatus) vẫn có thể bỏ qua return value, giữ nguyên public behavior.
// skipLock (2026-09-05, review): _adjustInventoryQtyBatch là read-modify-write không tự khoá.
// updateOrderStatus (mops_02.js, 2 call site) ĐÃ giữ sẵn lock cho cả hàm nên truyền skipLock=true để
// tránh waitLock() lồng nhau (docs/mops-contract.md §13.6). _applyShippingStatus (nhánh 'returned',
// gọi từ webhook/adapter — KHÔNG có lock nào ở call chain đó) để mặc định skipLock=false → tự khoá ở
// đây, đóng đúng lỗ hổng "webhook đảo kho không khoá" mà review phát hiện.
function _reverseSaleMovements(orderId, actorUser, skipLock) {
  // FIX (2026-09-05, review round 4): lock trước đây chỉ bọc _adjustInventoryQtyBatch — idempotency
  // của _planSaleMovementReversal dựa trên QUÉT LẠI InventoryMovements để phát hiện note đã đảo
  // ("reversedNotes"), nên nếu 2 lượt gọi race nhau, CẢ HAI đều plan() TRƯỚC khi bên nào ghi xong →
  // cả hai đều thấy chưa đảo, cả hai đều appendMany() → double-credit tồn kho dù có khoá phần adjust.
  // Phải khoá TRỌN VẸN plan+append+adjust để lượt thứ 2 chỉ chạy plan() SAU KHI lượt đầu đã commit
  // xong (đọc thấy note đã tồn tại → entries rỗng → không double).
  function _run() {
    var plan = _planSaleMovementReversal(orderId, actorUser);
    if (!plan) return;
    if (plan.entries.length) {
      try {
        Repository.InventoryMovements.appendMany(plan.entries);
        _adjustInventoryQtyBatch(SpreadsheetApp.getActiveSpreadsheet(), plan.qty_deltas);
        // FIX (2026-09-05, review round 5): GAS buffer ghi Sheet, chỉ đảm bảo commit thật khi
        // flush() hoặc hết execution — KHÔNG phải khi releaseLock(). Nếu thiếu flush() ở đây, lượt
        // gọi thứ 2 (đang chờ cùng waitLock) có thể acquire lock ngay sau khi lượt 1 release nhưng
        // vẫn đọc InventoryMovements CHƯA thấy note vừa ghi (chưa flush) → vẫn double-credit dù đã
        // khoá trọn plan+append+adjust. Cùng lý do createCustomer() flush() trước khi release
        // (mops_03.js, comment "đảm bảo write hoàn tất trước khi release lock").
        SpreadsheetApp.flush();
      } catch (moveErr) { /* best-effort — không chặn cập nhật trạng thái đơn vì lỗi log tồn kho */ }
    }
    return plan.avg_cost;
  }
  if (skipLock) return _run();
  return _withLock(_run);
}

// ── ShippingAddresses — địa chỉ từng đơn đồng thời là sổ địa chỉ của khách. ──
// Địa chỉ của đơn luôn append-only để lịch sử đơn không bị thay đổi. Nhân viên có thể đánh dấu một
// dòng làm mặc định; thao tác này chỉ thay cờ IsDefault, không sửa nội dung địa chỉ lịch sử.
// Phase vận chuyển GHN (2026-07-17): thêm 3 cột nối cuối K/L/M = ProvinceID/DistrictID/WardCode (MÃ
// GHN — nguồn sự thật khi gọi API GHN). Cột TÊN Province/District/Ward (E/F/G) giữ để hiển thị; District
// (F) giờ dùng lại cho TÊN quận/huyện theo master-data GHN (GHN vẫn 3 cấp), không còn để rỗng.
function _createShippingAddress(ss, data) {
  var sh = ss.getSheetByName(SHEET.SHIPPING);
  var addressId = generateId(sh, 'ADDR', 6);
  sh.appendRow([
    addressId, data.customer_id || '', _sanitizeText(data.receiver_name || '', 100),
    _sanitizeText(data.phone || '', 20), _sanitizeText(data.province || '', 100),
    _sanitizeText(data.district || '', 100), // District — TÊN quận/huyện GHN (3 cấp)
    _sanitizeText(data.ward || '', 100), _sanitizeText(data.address || '', 200),
    '', !!data.is_default,
    String(data.province_id || ''), String(data.district_id || ''), String(data.ward_code || '') // K/L/M mã GHN
  ]);
  return addressId;
}

// 2026-08-16: DEDUPE sổ địa chỉ. Trước đây mọi entry point (createOrder/createCustomer/
// saveCustomerAddress/updateOrderAddress) đều gọi thẳng _createShippingAddress → sổ địa chỉ khách
// trùng lặp (VD 7 dòng thực ra chỉ 3 địa chỉ unique). Wrapper này scan sổ địa chỉ hiện có của
// khách và trả address_id cũ nếu đã match — tiết kiệm dòng + giảm confusion cho staff khi chọn
// địa chỉ giao trong shipModal.
//
// FK mapping: ShippingAddresses.CustomerID (col B) → Customers.CustomerID (col A). Không có
// unique constraint ở tầng Sheet — dedupe làm ở tầng application. Địa chỉ được coi là "trùng" khi
// KHỚP TOÀN BỘ 9 field (receiver_name, phone, address, ward, district, province + 3 mã hành chính
// GSO/GHN) — cùng khách nhưng khác 1 field bất kỳ vẫn tạo dòng mới (VD đổi receiver_name).
function _findMatchingCustomerAddress(ss, customerId, data) {
  if (!customerId) return null;
  var addresses = _listCustomerShippingAddresses(ss, customerId);
  for (var i = 0; i < addresses.length; i++) {
    if (_shippingAddressMatches(addresses[i], {
      customer_id: customerId,
      receiver_name: data.receiver_name, phone: data.phone,
      province: data.province, district: data.district, ward: data.ward, address: data.address,
      province_id: data.province_id, district_id: data.district_id, ward_code: data.ward_code
    })) return addresses[i].address_id;
  }
  return null;
}

// Wrapper dedupe cho mọi call site tạo mới địa chỉ. Return address_id (mới hoặc reuse). Nếu match
// địa chỉ cũ + caller set is_default=true → set default lên dòng cũ. KHÔNG dùng cho updateOrder
// path (đã có _shippingAddressMatches guard riêng, giữ semantic append-only lịch sử đơn).
function _upsertShippingAddress(ss, data) {
  var existingId = _findMatchingCustomerAddress(ss, data.customer_id, data);
  if (existingId) {
    if (data.is_default) {
      try { _setCustomerDefaultShippingAddress(ss, data.customer_id, existingId); } catch (e) {}
    }
    return existingId;
  }
  return _createShippingAddress(ss, data);
}

// Migration one-shot: dedupe sổ địa chỉ hiện có. CHẠY 1 LẦN từ GAS editor (Run →
// dedupeShippingAddressesTrigger) sau khi deploy code dedupe mới. An toàn:
//  1. Scan ShippingAddresses theo tuple (customer_id + 9 field) → xác định "cụm dup"
//  2. Trong mỗi cụm: giữ dòng đầu tiên (address_id_keep), gom is_default
//  3. Scan Orders cột G (ShippingAddressID) → thay mọi ref tới dòng dup = address_id_keep
//  4. Xoá các dòng dup sau (từ dưới lên để không lệch index)
// Log kết quả ra Logger + trả về summary. Rollback: khôi phục từ Google Sheet version history.
function dedupeShippingAddressesTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.SHIPPING);
  if (!sh || sh.getLastRow() < 2) return { scanned: 0, dedup: 0, merged: {} };
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues();
  // Group by fingerprint (customer_id + 9 field). Keep first row, mark rest as dup.
  var keys = {}, dupIdMap = {}, keepIsDefault = {};
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var key = [r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[10], r[11], r[12]].map(function(v) { return String(v || '').trim().toLowerCase(); }).join('|');
    if (!keys[key]) {
      keys[key] = { keepId: String(r[0] || ''), keepRow: i + 2 };
      if (r[9] === true || String(r[9]).toUpperCase() === 'TRUE') keepIsDefault[key] = true;
    } else {
      dupIdMap[String(r[0] || '')] = keys[key].keepId;
      if (r[9] === true || String(r[9]).toUpperCase() === 'TRUE') keepIsDefault[key] = true;
    }
  }
  // Reassign Orders.G refs
  var ordSh = ss.getSheetByName(SHEET.ORDERS);
  var reassigned = 0;
  if (ordSh && ordSh.getLastRow() > 1) {
    var ordRows = ordSh.getLastRow() - 1;
    var ordAddr = ordSh.getRange(2, 7, ordRows, 1).getValues();
    var changed = false;
    for (var j = 0; j < ordAddr.length; j++) {
      var oldId = String(ordAddr[j][0] || '');
      if (dupIdMap[oldId]) {
        ordAddr[j][0] = dupIdMap[oldId];
        changed = true;
        reassigned++;
      }
    }
    if (changed) ordSh.getRange(2, 7, ordRows, 1).setValues(ordAddr);
  }
  // Sync is_default flag on keep row nếu bất kỳ dòng dup nào từng là default
  for (var key2 in keepIsDefault) {
    if (keys[key2]) {
      sh.getRange(keys[key2].keepRow, 10).setValue(true);
    }
  }
  // Delete dup rows từ dưới lên (để không lệch index)
  var dupRows = [];
  var dupIdsSet = dupIdMap;
  for (var m = 0; m < rows.length; m++) {
    if (dupIdsSet[String(rows[m][0] || '')]) dupRows.push(m + 2);
  }
  dupRows.sort(function(a, b) { return b - a; }); // reverse
  for (var n = 0; n < dupRows.length; n++) sh.deleteRow(dupRows[n]);
  Logger.log('dedupeShippingAddresses: scanned=' + rows.length + ' dup=' + dupRows.length + ' Orders reassigned=' + reassigned);
  logActivity(ss, 'MIGRATION', 'SHIPPING_ADDRESSES', 'DEDUPE_ONESHOT|scanned=' + rows.length + '|dup=' + dupRows.length + '|reassigned=' + reassigned, 'system:migration');
  return { scanned: rows.length, dedup: dupRows.length, orders_reassigned: reassigned };
}

// Update order thường gửi lại nguyên địa chỉ đang có trong form. Không append thêm một dòng lịch sử
// nếu nội dung không đổi; địa chỉ vẫn append-only khi thật sự thay đổi.
function _shippingAddressMatches(address, data) {
  if (!address || String(address.customer_id || '') !== String(data.customer_id || '')) return false;
  var pairs = [
    ['receiver_name', data.receiver_name], ['phone', data.phone], ['province', data.province],
    ['district', data.district], ['ward', data.ward], ['address', data.address],
    ['province_id', data.province_id], ['district_id', data.district_id], ['ward_code', data.ward_code]
  ];
  for (var i = 0; i < pairs.length; i++) {
    if (String(address[pairs[i][0]] || '') !== String(pairs[i][1] || '')) return false;
  }
  return true;
}

function _shippingAddressFromRow(row) {
  return {
    address_id: String(row[0] || ''), customer_id: String(row[1] || ''),
    receiver_name: String(row[2] || ''), phone: String(row[3] || ''),
    province: String(row[4] || ''), district: String(row[5] || ''), ward: String(row[6] || ''),
    address: String(row[7] || ''), is_default: row[9] === true || String(row[9]).toUpperCase() === 'TRUE',
    province_id: String(row[10] || ''), district_id: String(row[11] || ''), ward_code: String(row[12] || '')
  };
}

function _listCustomerShippingAddresses(ss, customerId) {
  var sh = ss.getSheetByName(SHEET.SHIPPING);
  if (!customerId || !sh || sh.getLastRow() < 2) return [];
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues();
  var result = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1] || '') !== String(customerId)) continue;
    // 2026-08-16: filter soft-deleted. Col I (idx 8) = Status enum: '' | 'active' | 'deleted'.
    // Backward-compat: dòng cũ chưa có Status (empty string) treat as active.
    if (String(rows[i][8] || '').toLowerCase() === 'deleted') continue;
    result.push(_shippingAddressFromRow(rows[i]));
  }
  return result.sort(function(a, b) { return Number(b.is_default) - Number(a.is_default); });
}

function _syncCustomerProfileAddress(ss, customerId, address) {
  var sh = ss.getSheetByName(SHEET.CUSTOMERS);
  if (!sh || sh.getLastRow() < 2 || !address) return;
  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') !== String(customerId)) continue;
    sh.getRange(i + 2, 12, 1, 4).setValues([[address.address, address.ward, address.district, address.province]]);
    return;
  }
}

function _setCustomerDefaultShippingAddress(ss, customerId, addressId) {
  var sh = ss.getSheetByName(SHEET.SHIPPING);
  if (!sh || sh.getLastRow() < 2) throw new Error('Chưa có địa chỉ giao hàng để chọn');
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues();
  var target = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][1] || '') !== String(customerId)) continue;
    sh.getRange(i + 2, 10).setValue(String(rows[i][0] || '') === String(addressId));
    if (String(rows[i][0] || '') === String(addressId)) target = _shippingAddressFromRow(rows[i]);
  }
  if (!target) throw new Error('Địa chỉ không thuộc khách hàng này');
  target.is_default = true;
  _syncCustomerProfileAddress(ss, customerId, target);
  return target;
}

// 2026-08-16: Sửa nội dung 1 địa chỉ trong sổ khách. Semantic destructive edit: chỉ 1 dòng
// ShippingAddresses được sửa; mọi Orders.G ref dòng đó sẽ HIỂN THỊ bản mới khi getOrder tra.
// Đây là ý muốn của user "chỉnh sửa để dùng cho các lượt sau" — sửa số nhà gõ sai → tem in đơn cũ
// cũng đổi theo. Nếu cần snapshot per-order → dùng updateOrder path (append-only, tạo dòng mới).
// Sau update: nếu địa chỉ mới trùng dòng khác của cùng khách → gộp về dòng đó, xoá dòng vừa update
// và reassign Orders.G để tránh sinh cụm dup.
function updateCustomerAddress(payload) {
  var addressId = String(payload.address_id || '').trim();
  var customerId = String(payload.customer_id || '').trim();
  if (!addressId) throw new Error('address_id là bắt buộc');
  if (!customerId) throw new Error('customer_id là bắt buộc');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.SHIPPING);
  if (!sh || sh.getLastRow() < 2) throw new Error('Không tìm thấy sổ địa chỉ');
  var lastRow = sh.getLastRow();
  var rows = sh.getRange(2, 1, lastRow - 1, 13).getValues();
  var row = -1;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === addressId) { row = i + 2; break; }
  }
  if (row === -1) throw new Error('Không tìm thấy địa chỉ: ' + addressId);
  // Guard FK: address phải thuộc đúng khách (tránh admin sửa nhầm sang KH khác qua payload lạ).
  if (String(rows[row - 2][1]) !== customerId) throw new Error('Địa chỉ không thuộc khách hàng này');
  // Chuẩn hoá payload: chỉ ghi khi field được truyền (partial update).
  var patch = {
    receiver_name: payload.receiver_name !== undefined ? _sanitizeText(payload.receiver_name, 100) : null,
    phone:         payload.phone !== undefined         ? _sanitizeText(payload.phone, 20)         : null,
    province:      payload.province !== undefined      ? _sanitizeText(payload.province, 100)     : null,
    district:      payload.district !== undefined      ? _sanitizeText(payload.district, 100)     : null,
    ward:          payload.ward !== undefined          ? _sanitizeText(payload.ward, 100)         : null,
    address:       payload.address !== undefined       ? _sanitizeText(payload.address, 200)      : null,
    province_id:   payload.province_id !== undefined ? String(payload.province_id || '')          : null,
    district_id:   payload.district_id !== undefined ? String(payload.district_id || '')          : null,
    ward_code:     payload.ward_code !== undefined   ? String(payload.ward_code || '')            : null
  };
  var colMap = { receiver_name: 3, phone: 4, province: 5, district: 6, ward: 7, address: 8, province_id: 11, district_id: 12, ward_code: 13 };
  for (var k in patch) {
    if (patch[k] !== null) sh.getRange(row, colMap[k]).setValue(patch[k]);
  }
  logActivity(ss, 'CUSTOMER', customerId, 'CUSTOMER_ADDRESS_UPDATED|' + addressId, payload._callerUser || 'staff');
  // Post-update dedupe: nếu nội dung mới TRÙNG 1 dòng khác của cùng khách → merge + reassign.
  // (Trước edit đã unique nên chỉ cần check 1 lần.)
  var updated = _getShippingAddress(ss, addressId);
  var otherAddresses = _listCustomerShippingAddresses(ss, customerId).filter(function(a) { return a.address_id !== addressId; });
  for (var m = 0; m < otherAddresses.length; m++) {
    if (_shippingAddressMatches(otherAddresses[m], {
      customer_id: customerId,
      receiver_name: updated.receiver_name, phone: updated.phone,
      province: updated.province, district: updated.district, ward: updated.ward, address: updated.address,
      province_id: updated.province_id, district_id: updated.district_id, ward_code: updated.ward_code
    })) {
      // Trùng dòng khác → reassign Orders.G, xoá dòng vừa update, giữ dòng cũ.
      var keepId = otherAddresses[m].address_id;
      _reassignOrdersAddressRef(ss, addressId, keepId);
      // Nếu dòng vừa xoá là default → giữ default trên dòng còn lại.
      if (updated.is_default) { try { _setCustomerDefaultShippingAddress(ss, customerId, keepId); } catch (e) {} }
      // Xoá dòng
      var findRow = -1;
      var scan = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
      for (var s2 = 0; s2 < scan.length; s2++) if (String(scan[s2][0]) === addressId) { findRow = s2 + 2; break; }
      if (findRow !== -1) sh.deleteRow(findRow);
      logActivity(ss, 'CUSTOMER', customerId, 'CUSTOMER_ADDRESS_MERGED|' + addressId + '→' + keepId, payload._callerUser || 'system:merge');
      return { address_id: keepId, merged_from: addressId, addresses: _listCustomerShippingAddresses(ss, customerId) };
    }
  }
  return { address_id: addressId, addresses: _listCustomerShippingAddresses(ss, customerId) };
}

// Helper: quét Orders cột G, thay mọi ref old → new. Dùng cho merge + soft-delete path.
function _reassignOrdersAddressRef(ss, oldId, newId) {
  var ordSh = ss.getSheetByName(SHEET.ORDERS);
  if (!ordSh || ordSh.getLastRow() < 2) return 0;
  var n = ordSh.getLastRow() - 1;
  var col = ordSh.getRange(2, 7, n, 1).getValues();
  var changed = 0;
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0] || '') === oldId) { col[i][0] = newId; changed++; }
  }
  if (changed) ordSh.getRange(2, 7, n, 1).setValues(col);
  return changed;
}

// 2026-08-16: Soft delete 1 địa chỉ. Set Status='deleted' vào cột I (idx 8, hiện đang bỏ trống —
// _shippingAddressFromRow không đọc col này, backward-compat). _listCustomerShippingAddresses sẽ
// filter deleted. Orders.G vẫn ref được address_id để tem/detail đơn cũ tra ra nội dung (không
// vỡ FK). Muốn khôi phục → dùng restore_customer_address (chưa expose, admin sửa tay col I).
function deleteCustomerAddress(payload) {
  var addressId = String(payload.address_id || '').trim();
  var customerId = String(payload.customer_id || '').trim();
  if (!addressId) throw new Error('address_id là bắt buộc');
  if (!customerId) throw new Error('customer_id là bắt buộc');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.SHIPPING);
  if (!sh || sh.getLastRow() < 2) throw new Error('Không tìm thấy sổ địa chỉ');
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues();
  var row = -1;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === addressId) { row = i + 2; break; }
  }
  if (row === -1) throw new Error('Không tìm thấy địa chỉ: ' + addressId);
  if (String(rows[row - 2][1]) !== customerId) throw new Error('Địa chỉ không thuộc khách hàng này');
  var wasDefault = rows[row - 2][9] === true || String(rows[row - 2][9]).toUpperCase() === 'TRUE';
  // Set Status='deleted' vào col I (idx 8). Bảo tồn dữ liệu để đơn cũ tra được.
  sh.getRange(row, 9).setValue('deleted');
  sh.getRange(row, 10).setValue(false); // Clear IsDefault để không "khách xoá default rồi vẫn được auto-select"
  logActivity(ss, 'CUSTOMER', customerId, 'CUSTOMER_ADDRESS_DELETED|' + addressId, payload._staffActor || 'staff');
  // Nếu địa chỉ vừa xoá là default → cần chọn default mới cho khách. Ưu tiên địa chỉ còn lại đầu tiên.
  var remaining = _listCustomerShippingAddresses(ss, customerId);
  if (wasDefault && remaining.length > 0) {
    try { _setCustomerDefaultShippingAddress(ss, customerId, remaining[0].address_id); } catch (e) {}
  }
  return { address_id: addressId, status: 'deleted', addresses: _listCustomerShippingAddresses(ss, customerId) };
}

function saveCustomerAddress(payload) {
  var customerId = String(payload.customer_id || '').trim();
  if (!customerId || !Repository.Customers.findById(customerId)) throw new Error('Không tìm thấy khách hàng');
  var address = String(payload.address || '').trim();
  var province = String(payload.province || '').trim();
  if (!address && !province) throw new Error('Nhập ít nhất số nhà/đường hoặc tỉnh/thành phố');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // 2026-08-16: dedupe — nếu địa chỉ này trùng dòng có sẵn trong sổ khách thì reuse address_id
  // thay vì tạo dòng thứ 8 (fix bug sổ khách có 7 dòng nhưng chỉ 3 địa chỉ unique).
  var addressId = _upsertShippingAddress(ss, {
    customer_id: customerId, receiver_name: payload.receiver_name || '', phone: payload.phone || '',
    province: province, district: payload.district || '', ward: payload.ward || '', address: address,
    province_id: payload.province_id || '', district_id: payload.district_id || '', ward_code: payload.ward_code || ''
  });
  var saved = _getShippingAddress(ss, addressId);
  if (payload.is_default !== false) saved = _setCustomerDefaultShippingAddress(ss, customerId, addressId);
  logActivity(ss, 'CUSTOMER', customerId, 'CUSTOMER_ADDRESS_SAVED', payload._callerUser || 'staff');
  return { address: saved, addresses: _listCustomerShippingAddresses(ss, customerId) };
}

function setCustomerDefaultAddress(payload) {
  var customerId = String(payload.customer_id || '').trim();
  var addressId = String(payload.address_id || '').trim();
  if (!customerId || !addressId) throw new Error('customer_id và address_id là bắt buộc');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var address = _setCustomerDefaultShippingAddress(ss, customerId, addressId);
  logActivity(ss, 'CUSTOMER', customerId, 'CUSTOMER_DEFAULT_ADDRESS_SET', payload._callerUser || 'staff');
  return { address: address, addresses: _listCustomerShippingAddresses(ss, customerId) };
}

function _getShippingAddress(ss, addressId) {
  if (!addressId) return null;
  var sh = ss.getSheetByName(SHEET.SHIPPING);
  if (!sh || sh.getLastRow() < 2) return null;
  // Ưu tiên row-index cache (được warm bởi list_transactions ngay trước get_order theo pattern
  // orders/payments/customers/order_items). Cache miss (deep-link / cache expire) fallback TextFinder
  // để không thay đổi contract hàm.
  var addressRowsById = _getRowIndex('shipping_addresses') || {};
  var row = Number(addressRowsById[String(addressId)]) || _findSheetRowExact(sh, 1, addressId);
  return row === -1 ? null : _shippingAddressFromRow(sh.getRange(row, 1, 1, 13).getValues()[0]);
}

// ============================================================
// SHIPMENT ACCESSOR (2026-07-27) — SEAM để sau này tách sheet `Shipments` mà KHÔNG viết lại adapter.
//
//  Vấn đề trước đó: 6 adapter (GHN/Ahamove/GHTK/VTP/Goship/SELF) + dispatcher + đối soát đều gọi thẳng
//  `sh.getRange(row, 30..34)`. Quyết định "1 đơn = 1 vận đơn" đúng cho hộ KD 1 kho, NHƯNG mã nguồn đang
//  bám cứng vào việc "vận đơn LÀ vài cột trên Orders" → ngày cần 1 đơn nhiều kiện (2 hãng, giao 2 lần)
//  thì phải sửa ~45 chỗ.
//
//  Cách làm: mọi nơi đọc/ghi vận đơn đi qua `_shipmentGet` / `_shipmentSet`. Hôm nay 2 hàm này map vào
//  cột Orders (lưu trữ inline, không đổi hành vi, không migrate). Khi tách sheet `Shipments` chỉ cần
//  viết lại ĐÚNG 2 hàm này + `_shipmentGet` trả mảng shipment thay vì 1 — adapter không phải sửa.
//
//  Tư duy dữ liệu (đã đúng ngay từ giờ):  Order → Shipment{carrier, tracking, service, fee, cod, packed}
//  Lưu trữ (tạm thời):                    Order.AD..AK
//
//  Lợi phụ: `_shipmentSet` gộp ghi 1 lần cho cả block cột (trước là 3–4 lần setValue rời) — bớt I/O
//  đúng hướng tối ưu đường ghi đang làm.
// ============================================================
var SHIPMENT_COL = {
  CARRIER:        30, // AD — 'GHN' | 'GHTK' | 'GOSHIP · <hãng thật>' | tên tự giao
  TRACKING:       31, // AE — mã vận đơn (mã HÃNG, khách tra được)
  FEE:            32, // AF — phí trả ĐTVC (tạm tính lúc tạo; số thực chốt ở đối soát)
  COD:            33, // AG — tiền thu hộ (0 với đơn trả trước qua VietQR)
  SERVICE:        34, // AH — gói dịch vụ / khoá tra cứu hãng ('goship:<gcode>|<rate>')
  PACKED_AT:      35, // AI 🆕 — thời điểm đóng gói xong (Lớp 2 "Đóng gói", tách khỏi trạng thái GIAO)
  PACKAGE_WEIGHT: 36, // AJ 🆕 — khối lượng CÂN THỰC (gram). Rỗng → tính từ Products.Weight × qty
  PACKAGE_DIMS:   37, // AK 🆕 — kích thước thực 'DxRxC' cm. Rỗng → dùng mặc định trong Cấu hình
  LAST_TRACKED_AT: 38 // AL 🆕 — mốc cập nhật trạng thái GẦN NHẤT từ hãng (unix giây, theo `update_time`
                      //      của webhook). Dùng để BỎ QUA webhook đến sai thứ tự / retry muộn — xem
                      //      _applyShippingStatus dùng force=true nên không tự chống được việc lùi trạng thái.
};
var SHIPMENT_COL_FIRST = 30, SHIPMENT_COL_LAST = 38;
// LABEL_URL đứng RIÊNG (col 42 = AP) — KHÔNG gộp vào SHIPMENT_COL block vì cols 39/40
// (CustomerShippingFee/Manual) và 41 (OCC_COL.ORDERS = _version) do subsystem khác quản lý.
// Nếu gộp vào block, _shipmentSet read-modify-write sẽ đè giá trị OCC/CustomerShipping vừa
// bump bởi request khác chạy đồng thời. Đọc/ghi độc lập qua _shipLabelGet/_shipLabelSet.
var LABEL_URL_COL = 42; // AP 🆕 2026-08-11 — cache tem in Goship khổ A6 (100×150mm)

// Phí giao hàng THU KHÁCH là khái niệm khác với ShippingFee (AF): AF là phí thực trả
// cho hãng vận chuyển/đối soát. Hai cột nối cuối này giữ giá khách phải trả và việc staff
// đã chỉnh tay hay chưa, để đổi giỏ hàng không vô tình ghi đè mức phí đã thoả thuận.
var CUSTOMER_SHIPPING_COL = {
  FEE: 39,       // AM — phí giao cộng vào bill khách
  IS_MANUAL: 40  // AN — true khi staff chủ động override mức mặc định
};
function _customerShippingEnsureCols(sheet) {
  var last = CUSTOMER_SHIPPING_COL.IS_MANUAL;
  var max = sheet.getMaxColumns();
  if (max < last) sheet.insertColumnsAfter(max, last - max);
  var rng = sheet.getRange(1, CUSTOMER_SHIPPING_COL.FEE, 1, 2);
  var hdr = rng.getValues()[0];
  if (!String(hdr[0] || '').trim() || !String(hdr[1] || '').trim()) {
    rng.setValues([['CustomerShippingFee', 'CustomerShippingFeeManual']])
      .setFontWeight('bold').setBackground('#3CB371').setFontColor('#ffffff');
  }
}
function _customerShippingGet(ss, orderId, loc) {
  loc = loc || _findOrderRow(ss, orderId);
  var max = loc.sheet.getMaxColumns();
  if (max < CUSTOMER_SHIPPING_COL.FEE) return { fee: 0, is_manual: false, configured: false };
  var width = Math.min(2, max - CUSTOMER_SHIPPING_COL.FEE + 1);
  var row = loc.sheet.getRange(loc.row, CUSTOMER_SHIPPING_COL.FEE, 1, width).getValues()[0];
  var rawFee = row[0];
  var rawManual = row[1];
  return {
    fee: Number(rawFee) || 0,
    is_manual: rawManual === true || String(rawManual).toLowerCase() === 'true',
    // Sheet cũ có cột mới nhưng ô dữ liệu còn trống vẫn được xem là legacy, không tự cộng phí
    // hồi tố vào bill đã tạo trước khi tính năng này phát hành.
    configured: rawFee !== '' && rawFee !== null && rawFee !== undefined
  };
}
function _customerShippingSet(ss, orderId, patch, loc) {
  loc = loc || _findOrderRow(ss, orderId);
  _customerShippingEnsureCols(loc.sheet);
  var rng = loc.sheet.getRange(loc.row, CUSTOMER_SHIPPING_COL.FEE, 1, 2);
  var row = rng.getValues()[0];
  if (patch.fee !== undefined && patch.fee !== null) row[0] = patch.fee;
  if (patch.is_manual !== undefined && patch.is_manual !== null) row[1] = !!patch.is_manual;
  rng.setValues([row]);
  _forceNumberFormat(loc.sheet, loc.row, [CUSTOMER_SHIPPING_COL.FEE]);
  return loc;
}

// 3 cột PackedAt/PackageWeight/PackageDims là cột NỐI CUỐI (2026-07-27). Sheet Orders của store đang
// chạy chỉ có 34 cột → `getRange(row, 30, 1, 8)` sẽ THROW "out of bounds" nếu chưa nới. Vì vậy:
//  · đọc: chỉ đọc tới cột đang có thật, thiếu thì coi như rỗng (đơn cũ chưa cân là hợp lệ);
//  · ghi: tự nới cột + ghi header nếu cần — không bắt buộc phải chạy setupSheet() trước mới dùng được.
// Nhờ vậy dán code.gs mới lên sheet cũ KHÔNG làm vỡ mọi lệnh đọc đơn.
function _shipEnsureCols(sheet) {
  var max = sheet.getMaxColumns();
  if (max < SHIPMENT_COL_LAST) sheet.insertColumnsAfter(max, SHIPMENT_COL_LAST - max);
  var names = ['PackedAt', 'PackageWeight', 'PackageDims', 'LastTrackedAt'];
  var rng = sheet.getRange(1, SHIPMENT_COL.PACKED_AT, 1, names.length);
  var hdr = rng.getValues()[0];
  // Ghi lại nếu bất kỳ ô header nào trống — cột thêm theo nhiều đợt (AI–AK 2026-07-27, AL cùng ngày).
  if (hdr.some(function(h) { return !String(h || '').trim(); })) {
    rng.setValues([names]).setFontWeight('bold').setBackground('#3CB371').setFontColor('#ffffff');
  }
}
// LabelURL (AP=42) — 2026-08-11 in tem A6 Goship. Đứng RIÊNG khỏi block SHIPMENT_COL vì cols 39/40
// dùng cho CustomerShippingFee/Manual và 41 dùng cho OCC_COL.ORDERS (_version). Đọc/ghi độc lập.
function _shipLabelEnsureCol(sheet) {
  var max = sheet.getMaxColumns();
  if (max < LABEL_URL_COL) sheet.insertColumnsAfter(max, LABEL_URL_COL - max);
  var rng = sheet.getRange(1, LABEL_URL_COL, 1, 1);
  if (!String(rng.getValue() || '').trim()) {
    rng.setValue('LabelURL').setFontWeight('bold').setBackground('#3CB371').setFontColor('#ffffff');
  }
}
function _shipLabelGet(sheet, row) {
  var max = sheet.getMaxColumns();
  if (max < LABEL_URL_COL) return '';
  try { return String(sheet.getRange(row, LABEL_URL_COL).getValue() || ''); } catch (e) { return ''; }
}
function _shipLabelSet(sheet, row, url) {
  _shipLabelEnsureCol(sheet);
  sheet.getRange(row, LABEL_URL_COL).setValue(String(url || ''));
}
// InternalNote (AQ=43) — 2026-08-23 ghi chú NỘI BỘ (staff/kế toán). Không lộ khách/shipper/tem in.
// Đứng RIÊNG cột như LabelURL để không lệ thuộc block khác — bulk read/write đường ghi khác không đè.
var INTERNAL_NOTE_COL = 43; // AQ 🆕 2026-08-23 — internal_note staff, KHÔNG in tem/hóa đơn
function _internalNoteEnsureCol(sheet) {
  var max = sheet.getMaxColumns();
  if (max < INTERNAL_NOTE_COL) sheet.insertColumnsAfter(max, INTERNAL_NOTE_COL - max);
  var rng = sheet.getRange(1, INTERNAL_NOTE_COL, 1, 1);
  if (!String(rng.getValue() || '').trim()) {
    rng.setValue('InternalNote').setFontWeight('bold').setBackground('#3CB371').setFontColor('#ffffff');
  }
}
function _internalNoteGet(sheet, row) {
  var max = sheet.getMaxColumns();
  if (max < INTERNAL_NOTE_COL) return '';
  try { return String(sheet.getRange(row, INTERNAL_NOTE_COL).getValue() || ''); } catch (e) { return ''; }
}
function _internalNoteSet(sheet, row, note) {
  _internalNoteEnsureCol(sheet);
  sheet.getRange(row, INTERNAL_NOTE_COL).setValue(String(note || ''));
}
// Đọc vận đơn của 1 đơn. loc (từ _findOrderRow) truyền vào để không tìm lại dòng khi caller đã có.
function _shipmentGet(ss, orderId, loc) {
  loc = loc || _findOrderRow(ss, orderId);
  var avail = Math.min(SHIPMENT_COL_LAST, loc.sheet.getMaxColumns());
  var n = SHIPMENT_COL_LAST - SHIPMENT_COL_FIRST + 1;
  var v = loc.sheet.getRange(loc.row, SHIPMENT_COL_FIRST, 1, avail - SHIPMENT_COL_FIRST + 1).getValues()[0];
  while (v.length < n) v.push(''); // cột chưa tồn tại → rỗng
  function at(col) { return v[col - SHIPMENT_COL_FIRST]; }
  var packedAt = at(SHIPMENT_COL.PACKED_AT);
  return {
    order_id: orderId,
    carrier:        String(at(SHIPMENT_COL.CARRIER) || ''),       // nhãn đầy đủ (có thể kèm hãng thật)
    carrier_code:   _shipNormCarrier(at(SHIPMENT_COL.CARRIER)),   // MÃ để dispatch
    tracking_code:  String(at(SHIPMENT_COL.TRACKING) || ''),
    shipping_fee:   Number(at(SHIPMENT_COL.FEE)) || 0,
    cod_amount:     Number(at(SHIPMENT_COL.COD)) || 0,
    service_id:     String(at(SHIPMENT_COL.SERVICE) || ''),
    packed_at:      packedAt instanceof Date ? packedAt.toISOString() : String(packedAt || ''),
    package_weight: Number(at(SHIPMENT_COL.PACKAGE_WEIGHT)) || 0,
    package_dims:   String(at(SHIPMENT_COL.PACKAGE_DIMS) || ''),
    last_tracked_at: Number(at(SHIPMENT_COL.LAST_TRACKED_AT)) || 0, // unix giây; 0 = chưa nhận cập nhật nào
    // label_url (AP=42) — đọc RIÊNG, không nằm trong block SHIPMENT_COL để tránh clobber OCC/CustomerShipping.
    label_url:      _shipLabelGet(loc.sheet, loc.row),
    _loc: loc
  };
}
// Ghi các field CÓ TRONG patch (field không truyền → giữ nguyên). 1 read + 1 write cho cả block.
// Key patch dùng tên nghiệp vụ, KHÔNG dùng số cột — đó là toàn bộ mục đích của lớp này.
function _shipmentSet(ss, orderId, patch, loc) {
  loc = loc || _findOrderRow(ss, orderId);
  _shipEnsureCols(loc.sheet);
  var n = SHIPMENT_COL_LAST - SHIPMENT_COL_FIRST + 1;
  var rng = loc.sheet.getRange(loc.row, SHIPMENT_COL_FIRST, 1, n);
  var v = rng.getValues()[0];
  var map = {
    carrier:        SHIPMENT_COL.CARRIER,
    tracking_code:  SHIPMENT_COL.TRACKING,
    shipping_fee:   SHIPMENT_COL.FEE,
    cod_amount:     SHIPMENT_COL.COD,
    service_id:     SHIPMENT_COL.SERVICE,
    packed_at:      SHIPMENT_COL.PACKED_AT,
    package_weight: SHIPMENT_COL.PACKAGE_WEIGHT,
    package_dims:   SHIPMENT_COL.PACKAGE_DIMS,
    last_tracked_at: SHIPMENT_COL.LAST_TRACKED_AT
  };
  var numeric = { shipping_fee: 1, cod_amount: 1, package_weight: 1, last_tracked_at: 1 };
  var numCols = [];
  for (var k in map) {
    if (!(k in patch) || patch[k] === undefined || patch[k] === null) continue;
    v[map[k] - SHIPMENT_COL_FIRST] = patch[k];
    if (numeric[k]) numCols.push(map[k]);
  }
  rng.setValues([v]);
  if (numCols.length) _forceNumberFormat(loc.sheet, loc.row, numCols);
  // label_url — ghi RIÊNG (khác block), tránh clobber OCC/CustomerShipping ở col 39/40/41.
  if ('label_url' in patch && patch.label_url !== undefined && patch.label_url !== null) {
    _shipLabelSet(loc.sheet, loc.row, patch.label_url);
  }
  return loc;
}

// ── Huỷ đóng gói: reset đơn về "chờ đóng gói" sau khi API hãng đã confirm huỷ mã vận đơn ───────
// Dùng chung cho 5 cancel adapter (GHN/GOSHIP/AHAMOVE/GHTK/VTP). Khác nghiệp vụ với "Huỷ đơn" (huỷ
// hẳn đơn bán hàng, fulfillment='cancelled'): nghiệp vụ này CHỈ thu hồi mã vận đơn khỏi ĐVVC, xoá
// liên kết vận đơn khỏi đơn để nhân viên chỉnh lại địa chỉ / SĐT / SP rồi tạo vận đơn mới. Vì đó là
// đi LÙI trạng thái nên _setFulfillmentStatus phải force=true (state machine bình thường không cho
// ready_to_pick → pending_packing). Không throw — API hãng đã thành công, phần dọn dữ liệu MOPS thất
// bại thì để try/catch ở caller nuốt, tránh làm nhân viên tưởng huỷ hụt trong khi mã bên ĐVVC đã bị
// thu hồi rồi.
// 2026-08-29 fix (báo cáo thật: timeline ghi "Đã huỷ đóng gói" nhưng Tình trạng đơn vẫn kẹt trạng
// thái cũ) — 2 thay đổi:
//   1. LockService giống updateFulfillmentStatus — trước đây hàm này ghi thẳng không khoá, 1 webhook/
//      cron khác chạm cùng dòng cùng lúc có thể ghi đè nhau âm thầm.
//   2. _setFulfillmentStatus fail KHÔNG còn bị nuốt câm lặng: history log phản ánh ĐÚNG kết quả thật
//      (trước đây LUÔN ghi fulfillment_status:'pending_packing' vào history dù lệnh set có fail hay
//      không — chính là nguồn gốc lệch "timeline nói 1 đằng, trạng thái đơn nói 1 nẻo") + bắn Telegram
//      cảnh báo để staff biết cần sửa tay, thay vì im lặng.
function _shipmentUnpackReset(ss, orderId, actor, carrierCode, tracking) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    _shipmentSet(ss, orderId, {
      tracking_code: '', carrier: '', shipping_fee: 0, cod_amount: 0,
      service_id: '', packed_at: '', package_weight: 0, package_dims: '',
      last_tracked_at: 0, label_url: ''
    });
    var ffOk = true, ffErr = '';
    try { _setFulfillmentStatus(ss, orderId, 'pending_packing', actor || 'staff', true, null, true); }
    catch (e) { ffOk = false; ffErr = String((e && e.message) || e); }
    try {
      _shipmentHistoryLog(ss, {
        order_id: orderId, tracking_code: String(tracking || ''), carrier: String(carrierCode || ''),
        status_raw: 'unpacked',
        status_text: ffOk ? 'Đã huỷ đóng gói · thu hồi mã vận đơn' : 'Đã thu hồi mã vận đơn — LỖI cập nhật trạng thái đơn',
        fulfillment_status: ffOk ? 'pending_packing' : '',
        note: ffOk ? '' : ('Cập nhật FulfillmentStatus thất bại: ' + ffErr),
        update_time: Math.floor(Date.now() / 1000), source: 'unpack'
      });
    } catch (e) {}
    if (!ffOk) {
      try {
        var settings = getSettings(ss);
        notifyRoutedTelegram(ss, orderId, 'SHIPMENT_SYNC_ERROR', {}, settings,
          '⚠️ <b>Huỷ đóng gói: thu hồi mã vận đơn OK nhưng KHÔNG cập nhật được trạng thái đơn</b>\n' +
          'Đơn: ' + orderId + '\nLỗi: ' + ffErr + '\nCần vào tab Đơn hàng kiểm tra/sửa tay trạng thái.');
      } catch (e2) {}
    }
  } finally {
    lock.releaseLock();
  }
}
// ============================================================
// SHIPMENT STATUS HISTORY (2026-08-13)
// ────────────────────────────────────────────────────────────────────────
// Trước 2026-08-13 chỉ có Orders.LastTrackedAt (snapshot mốc cuối cùng). Tab
// "Quản lý vận đơn" cần TIMELINE đầy đủ như Sapo: 12/08 16:40 Đã tiếp nhận →
// 12/08 18:09 Đang lấy hàng → 12/08 19:08 Đã nhập kho. Mỗi webhook Goship,
// mỗi lần check_shipping_status, mỗi lần tạo/hủy vận đơn → append 1 dòng.
// Ghi phụ + không critical path → try/catch swallow, không làm vỡ đường tạo/cập
// nhật vận đơn.
//
// Cột A HistoryID SH00000001 | B OrderID | C TrackingCode | D CarrierCode
// (normalized) | E CarrierLabel | F StatusRaw | G StatusText | H
// FulfillmentStatus | I Note | J UpdateTime (unix sec) | K CreatedAt (Date)
// | L Source ('webhook'|'refresh'|'created'|'cancelled')
// ============================================================
function _shipmentHistoryHeaders() {
  return ['HistoryID', 'OrderID', 'TrackingCode', 'CarrierCode', 'CarrierLabel',
    'StatusRaw', 'StatusText', 'FulfillmentStatus', 'Note', 'UpdateTime',
    'CreatedAt', 'Source'];
}
function _ensureShipmentHistorySheet(ss) {
  var sh = ss.getSheetByName(SHEET.SHIPMENT_STATUS_HISTORY);
  if (sh) return sh;
  sh = ss.insertSheet(SHEET.SHIPMENT_STATUS_HISTORY);
  var headers = _shipmentHistoryHeaders();
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#3CB371').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  return sh;
}
function _shipmentHistoryNextId(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 'SH00000001';
  var lastId = String(sh.getRange(last, 1).getValue() || '');
  var m = lastId.match(/^SH(\d+)$/);
  var n = m ? (parseInt(m[1], 10) + 1) : (last);
  var s = String(n);
  while (s.length < 8) s = '0' + s;
  return 'SH' + s;
}
// Idempotent-ish: same (OrderID, StatusRaw, UpdateTime) trong 60s coi như trùng — bỏ qua để tránh
// nhân đôi khi webhook Goship retry hoặc staff nhấn refresh 2 lần liên tiếp trên cùng snapshot.
function _shipmentHistoryLog(ss, entry) {
  try {
    var sh = _ensureShipmentHistorySheet(ss);
    var orderId = String(entry.order_id || entry.orderId || '');
    if (!orderId) return;
    var last = sh.getLastRow();
    // Dedup window: quét 15 dòng cuối (đủ cho spam webhook trong vòng vài giây, không quét full sheet).
    if (last >= 2) {
      var scanN = Math.min(15, last - 1);
      var recent = sh.getRange(Math.max(2, last - scanN + 1), 1, scanN, 12).getValues();
      var rawKey = String(entry.status_raw || entry.status || '');
      var upd = Number(entry.update_time || 0);
      for (var i = recent.length - 1; i >= 0; i--) {
        if (String(recent[i][1]) !== orderId) continue;
        if (String(recent[i][5]) !== rawKey) continue;
        var prevUpd = Number(recent[i][9] || 0);
        if (upd && prevUpd && Math.abs(upd - prevUpd) < 60) return; // trùng
        if (!upd && !prevUpd) {
          // Fallback dedup theo CreatedAt (không có update_time) — cùng status < 60s coi trùng.
          var prevAt = recent[i][10];
          if (prevAt instanceof Date && (Date.now() - prevAt.getTime()) < 60000) return;
        }
        break;
      }
    }
    var id = _shipmentHistoryNextId(sh);
    sh.appendRow([
      id, orderId,
      String(entry.tracking_code || ''),
      String(entry.carrier_code || _shipNormCarrier(entry.carrier) || ''),
      String(entry.carrier_label || entry.carrier || ''),
      String(entry.status_raw || entry.status || ''),
      String(entry.status_text || ''),
      String(entry.fulfillment_status || ''),
      String(entry.note || ''),
      Number(entry.update_time || 0) || '',
      new Date(),
      String(entry.source || 'webhook')
    ]);
  } catch (e) {
    try { Logger.log('shipmentHistoryLog failed: ' + e); } catch (_lg) {}
  }
}
// Đọc timeline 1 vận đơn theo OrderID, sắp xếp CreatedAt asc (cũ→mới, giống Sapo).
function _shipmentHistoryList(ss, orderId) {
  var sh = ss.getSheetByName(SHEET.SHIPMENT_STATUS_HISTORY);
  if (!sh || sh.getLastRow() < 2) return [];
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][1]) !== String(orderId)) continue;
    out.push({
      history_id: String(data[i][0]),
      tracking_code: String(data[i][2] || ''),
      carrier_code: String(data[i][3] || ''),
      carrier_label: String(data[i][4] || ''),
      status_raw: String(data[i][5] || ''),
      status_text: String(data[i][6] || ''),
      fulfillment_status: String(data[i][7] || ''),
      note: String(data[i][8] || ''),
      update_time: Number(data[i][9] || 0),
      created_at: data[i][10],
      source: String(data[i][11] || '')
    });
  }
  out.sort(function(a, b) {
    var ta = a.update_time || (a.created_at instanceof Date ? Math.floor(a.created_at.getTime() / 1000) : 0);
    var tb = b.update_time || (b.created_at instanceof Date ? Math.floor(b.created_at.getTime() / 1000) : 0);
    return ta - tb;
  });
  return out;
}

// Kiện hàng dùng để tính cước/tạo vận đơn: ưu tiên SỐ CÂN THỰC lúc đóng gói, chưa cân thì suy từ SP.
// Mọi adapter gọi hàm này thay vì tự cộng weight + tự đọc dims → cân thực có hiệu lực cho cả 6 hãng.
// `override` = payload từ FE: cho phép XEM TRƯỚC cước theo số cân vừa nhập ở modal đóng gói mà chưa lưu.
// Thứ tự ưu tiên: số nhân viên đang nhập → số đã lưu lúc đóng gói → suy từ Products.Weight × qty.
function _shipParcel(ss, orderId, settings, loc, override) {
  var shp = _shipmentGet(ss, orderId, loc);
  var weight = parseInt(override && override.package_weight, 10) || shp.package_weight;
  if (!(weight > 0)) {
    weight = _ghnOrderItems(ss, orderId).reduce(function(s, i) { return s + i.weight * i.quantity; }, 0);
  }
  var dims = _ghnDims(settings);
  var dimStr = String((override && override.package_dims) || shp.package_dims || '');
  var m = dimStr.match(/^\s*(\d+)\s*[xX*]\s*(\d+)\s*[xX*]\s*(\d+)\s*$/);
  if (m) dims = { length: parseInt(m[1], 10), width: parseInt(m[2], 10), height: parseInt(m[3], 10) };
  return { weight: weight > 0 ? weight : 200, length: dims.length, width: dims.width, height: dims.height,
           cod_amount: shp.cod_amount, weighed: weight > 0 && (shp.package_weight > 0 || !!(override && override.package_weight)) };
}

// GHTK kho lấy hàng là dữ liệu của tài khoản GHTK. Staff được đọc để chọn theo
// từng vận đơn nhưng không được ghi đè kho mặc định trong Settings.
function ghtkListPickAddresses() {
  var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  if (!settings.GHTK_TOKEN) throw new Error('Chưa cấu hình GHTK Token.');
  var addresses = _ghtkPickAddresses(settings);
  if (!addresses.length) throw new Error('GHTK không trả về kho lấy hàng. Kiểm tra Token và môi trường GHTK (prod/stg), sau đó bấm Tải lại kho.');
  var selectedId = String(settings.GHTK_PICK_ADDRESS_ID || '');
  var selectedExists = addresses.some(function(item) { return item.pick_address_id === selectedId; });
  return { addresses: addresses, selected_pick_address_id: selectedExists ? selectedId : '', selected_missing: !!(selectedId && !selectedExists) };
}
// Guard + ghi nhận ĐÓNG GÓI dùng chung cho MỌI adapter tạo vận đơn. Trước đây 6 adapter tự lặp lại 3
// guard giống nhau (loại đơn / đã có vận đơn / đúng trạng thái) — lệch nhau là sinh bug im lặng.
// PackedAt ghi Ở ĐÂY: "đã đóng gói" là mốc NỘI BỘ (Lớp 2), độc lập hãng và độc lập trạng thái GIAO —
// nên nó được ghi trước khi gọi API hãng, và vẫn có kể cả khi hãng trả lỗi.
function _shipPrepareCreate(ss, orderId, payload, opts) {
  opts = opts || {};
  var loc = _findOrderRow(ss, orderId), sh = loc.sheet, row = loc.row;
  if (opts.requireProduct !== false && String(sh.getRange(row, 3).getValue()) !== 'product')
    throw new Error('Chỉ tạo vận đơn cho đơn sản phẩm');
  var shp = _shipmentGet(ss, orderId, loc);
  if (shp.tracking_code) throw new Error('Đơn đã có vận đơn: ' + shp.tracking_code); // idempotent
  if (String(sh.getRange(row, FULFILLMENT_COL).getValue() || '') !== 'pending_packing')
    throw new Error('Chỉ tạo vận đơn khi đơn ở trạng thái "Chờ đóng gói"');

  // Số cân / kích thước THỰC từ bước đóng gói (nếu nhân viên nhập ở modal) — ghi trước khi tính cước để
  // mọi hãng dùng cùng một con số, thay vì mỗi adapter tự suy từ Products.Weight.
  var patch = {};
  var w = parseInt(payload.package_weight, 10);
  if (w > 0) patch.package_weight = w;
  var dims = String(payload.package_dims || '').trim();
  if (/^\d+\s*[xX*]\s*\d+\s*[xX*]\s*\d+$/.test(dims)) patch.package_dims = dims;
  if (!shp.packed_at) patch.packed_at = nowIso();
  if (patch.package_weight || patch.package_dims || patch.packed_at) _shipmentSet(ss, orderId, patch, loc);

  return { loc: loc, sheet: sh, row: row, shipment: _shipmentGet(ss, orderId, loc) };
}

// ============================================================
// GHN CLIENT (phase vận chuyển 2026-07-17)
//  Giao Hàng Nhanh API v2. Sandbox (dev): dev-online-gateway.ghn.vn + dashboard 5sao.ghn.dev.
//  Prod: online-gateway.ghn.vn + khachhang.ghn.vn. GHN KHÔNG có token demo công khai — đăng ký
//  tài khoản dev tại 5sao.ghn.dev để lấy Token/ShopID (Chủ cửa hàng > xem & sao chép), rồi điền vào
//  MOPS Admin > Cấu hình. GHN_ENV chọn dev/prod. Đây là GAS→GHN (server-side), không dính CORS.
// ============================================================
function _ghnBaseUrl(settings) {
  return (String(settings.GHN_ENV || 'dev').toLowerCase() === 'prod')
    ? 'https://online-gateway.ghn.vn/shiip/public-api'
    : 'https://dev-online-gateway.ghn.vn/shiip/public-api';
}

function _hasGhnConfig(settings) {
  return !!(settings.GHN_TOKEN && settings.GHN_SHOP_ID);
}

// Gọi GHN. Trả về object JSON GHN ({ code, message, data }). Throw kèm message GHN nếu HTTP/GHN lỗi.
function _ghnFetch(settings, path, method, body) {
  if (!settings.GHN_TOKEN) throw new Error('Chưa cấu hình GHN Token (MOPS Admin > Cấu hình > Vận chuyển GHN)');
  var headers = { 'Token': String(settings.GHN_TOKEN) };
  if (settings.GHN_SHOP_ID) headers['ShopId'] = String(settings.GHN_SHOP_ID);
  var opts = {
    method: (method || 'get'), headers: headers,
    contentType: 'application/json', muteHttpExceptions: true
  };
  if (body) opts.payload = JSON.stringify(body);
  var resp = UrlFetchApp.fetch(_ghnBaseUrl(settings) + path, opts);
  var code = resp.getResponseCode();
  var txt  = resp.getContentText();
  var json = null; try { json = JSON.parse(txt); } catch (e) {}
  if (code < 200 || code >= 300) {
    throw new Error('GHN API ' + code + ': ' + ((json && (json.message || json.code_message_value)) || txt.substring(0, 250)));
  }
  return json;
}

// ── GHN master-data proxy (B3) — cache CacheService 6h (tỉnh/quận/xã GHN gần như không đổi).
// Chuẩn hoá về {id/code, name} để picker frontend dùng đồng nhất. Field GHN: ProvinceID/ProvinceName,
// DistrictID/DistrictName, WardCode(string)/WardName. Nếu shape khác → testGhnMasterData() sẽ lộ ra.
function ghnProvinces() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('ghn_prov');
  if (hit) return { provinces: JSON.parse(hit), cached: true };
  var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  var res  = _ghnFetch(settings, '/master-data/province', 'get', null);
  var list = ((res && res.data) || []).map(function(p) { return { id: p.ProvinceID, name: p.ProvinceName }; });
  try { cache.put('ghn_prov', JSON.stringify(list), 21600); } catch (e) {}
  return { provinces: list };
}
function ghnDistricts(provinceId) {
  provinceId = parseInt(provinceId, 10);
  if (!provinceId) throw new Error('province_id là bắt buộc');
  var cache = CacheService.getScriptCache(), key = 'ghn_dist_' + provinceId;
  var hit = cache.get(key);
  if (hit) return { districts: JSON.parse(hit), cached: true };
  var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  var res  = _ghnFetch(settings, '/master-data/district', 'post', { province_id: provinceId });
  var list = ((res && res.data) || []).map(function(d) { return { id: d.DistrictID, name: d.DistrictName }; });
  try { cache.put(key, JSON.stringify(list), 21600); } catch (e) {}
  return { districts: list };
}
function ghnWards(districtId) {
  districtId = parseInt(districtId, 10);
  if (!districtId) throw new Error('district_id là bắt buộc');
  var cache = CacheService.getScriptCache(), key = 'ghn_ward_' + districtId;
  var hit = cache.get(key);
  if (hit) return { wards: JSON.parse(hit), cached: true };
  var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  var res  = _ghnFetch(settings, '/master-data/ward', 'post', { district_id: districtId });
  var list = ((res && res.data) || []).map(function(w) { return { code: String(w.WardCode), name: w.WardName }; });
  try { cache.put(key, JSON.stringify(list), 21600); } catch (e) {}
  return { wards: list };
}

// CHẠY TAY trong Apps Script Editor sau khi điền GHN_TOKEN + GHN_SHOP_ID (Cấu hình) — xác nhận kết
// nối + shape response GHN thật trước khi tin dùng (giống testPullOrdersFromSapoRaw cho SAPO).
function testGhnMasterData() {
  var p = ghnProvinces();
  Logger.log('Tỉnh: ' + p.provinces.length + ' — mẫu: ' + JSON.stringify(p.provinces.slice(0, 3)));
  if (p.provinces.length) {
    var d = ghnDistricts(p.provinces[0].id);
    Logger.log('Quận/huyện của ' + p.provinces[0].name + ': ' + d.districts.length + ' — mẫu: ' + JSON.stringify(d.districts.slice(0, 3)));
    if (d.districts.length) {
      var w = ghnWards(d.districts[0].id);
      Logger.log('Phường/xã của ' + d.districts[0].name + ': ' + w.wards.length + ' — mẫu: ' + JSON.stringify(w.wards.slice(0, 3)));
    }
  }
  return 'OK — xem Executions/Logs';
}

// ── GHN tạo/huỷ vận đơn + tính cước (B4) ─────────────────────────────────────────────────────────
// Cột Orders: Carrier=30, TrackingCode=31, ShippingFee=32, CODAmount=33, ShippingServiceId=34.
// Weight lấy từ Products.Weight (GRAM — đã chuẩn hoá variant.grams) × Qty của từng dòng OrderItems.

function _ghnOrderItems(ss, orderId) {
  var itemsSh = ss.getSheetByName(SHEET.ORDER_ITEMS);
  var out = [];
  if (itemsSh && itemsSh.getLastRow() > 1) {
    var missing = [];
    var index = _getRowIndex('order_items') || {};
    var rows = index[String(orderId)] || _findSheetRowsExact(itemsSh, 2, orderId);
    _readSheetRows(itemsSh, rows, 1, 11).forEach(function(r) {
      if (String(r[1]) !== orderId) return; // B OrderID
      var qty = Number(r[8]) || 1;          // I Qty
      var weight = null;
      if (r[10]) {
        try {
          var snapshot = JSON.parse(r[10]);
          if (snapshot && snapshot.weight != null) weight = Number(snapshot.weight) || 0;
        } catch (e) {}
      }
      var item = { name: String(r[6] || 'Sản phẩm'), quantity: qty, weight: weight != null ? weight : 0 };
      out.push(item);
      if (weight == null) missing.push({ item: item, variant_id: String(r[3] || '') });
    });
    // Legacy OrderItems may not contain snapshot.weight. Preserve correctness with a fallback scan,
    // but new orders avoid transferring the full Products sheet on every shipping preview/create.
    if (missing.length) {
      var wByVariant = {};
      Repository.Products.findAll().forEach(function(p) { wByVariant[p.variant_id] = p.weight; });
      missing.forEach(function(m) {
        var w = Number(wByVariant[m.variant_id]) || 0;
        m.item.weight = w > 0 ? w : 200;
      });
    }
  }
  return out;
}

// Bối cảnh giao hàng của 1 đơn: tổng weight (gram), COD, mã quận/xã GHN người nhận.
function _ghnShipContext(ss, orderId) {
  var items  = _ghnOrderItems(ss, orderId);
  var weight = items.reduce(function(s, i) { return s + (i.weight * i.quantity); }, 0);
  var loc    = _findOrderRow(ss, orderId);
  var codAmount = _shipmentGet(ss, orderId, loc).cod_amount;
  var addr   = _getShippingAddress(ss, String(loc.sheet.getRange(loc.row, 7).getValue() || ''));
  return {
    weight: weight, codValue: codAmount, items: items, addr: addr,
    districtId: addr ? parseInt(addr.district_id, 10) : 0, wardCode: addr ? String(addr.ward_code || '') : ''
  };
}

function _ghnDims(settings) {
  return {
    length: parseInt(settings.GHN_DEFAULT_LENGTH, 10) || 20,
    width:  parseInt(settings.GHN_DEFAULT_WIDTH, 10)  || 15,
    height: parseInt(settings.GHN_DEFAULT_HEIGHT, 10) || 10
  };
}

// Tính cước — theo order_id (tự lấy weight/COD/địa chỉ) hoặc theo tham số thô (preview lúc nhập).
function ghnCalcFee(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasGhnConfig(settings)) throw new Error('Chưa cấu hình GHN (Token/ShopID) — MOPS Admin > Cấu hình');
  var toDistrict, toWard, weight, codValue;
  var dims = _ghnDims(settings);
  var orderId = String(payload.order_id || '').trim();
  if (orderId) {
    var ctx = _ghnShipContext(ss, orderId);
    var parcel = _shipParcel(ss, orderId, settings, null, payload); // ưu tiên số cân/kích thước thực
    toDistrict = ctx.districtId; toWard = ctx.wardCode;
    weight = parcel.weight; codValue = parcel.cod_amount;
    dims = { length: parcel.length, width: parcel.width, height: parcel.height };
  } else {
    toDistrict = parseInt(payload.to_district_id, 10); toWard = String(payload.to_ward_code || '');
    weight = parseInt(payload.weight, 10) || 0; codValue = parseInt(payload.cod_value, 10) || 0;
  }
  if (!toDistrict || !toWard) throw new Error('Thiếu quận/xã người nhận (mã GHN)');
  var res = _ghnFetch(settings, '/v2/shipping-order/fee', 'post', {
    from_district_id: parseInt(settings.GHN_FROM_DISTRICT_ID, 10),
    from_ward_code:   String(settings.GHN_FROM_WARD_CODE || ''),
    to_district_id:   toDistrict, to_ward_code: toWard,
    service_type_id:  2, // 2 = chuẩn TMĐT (hàng nhẹ). Nếu GHN yêu cầu service_id → điều chỉnh sau test.
    weight: weight > 0 ? weight : 200, length: dims.length, width: dims.width, height: dims.height,
    insurance_value: 0, cod_value: codValue || 0
  });
  return { fee: (res && res.data && res.data.total) || 0, detail: res && res.data };
}

// Tạo vận đơn GHN cho 1 đơn → chuyển pending_packing → ready_to_pick, ghi TrackingCode/ShippingFee.
function ghnCreateShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasGhnConfig(settings)) throw new Error('Chưa cấu hình GHN (Token/ShopID) — MOPS Admin > Cấu hình');
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var pre = _shipPrepareCreate(ss, orderId, payload);
  var loc = pre.loc;

  var ctx = _ghnShipContext(ss, orderId);
  if (!ctx.addr || !ctx.districtId || !ctx.wardCode)
    throw new Error('Đơn chưa có địa chỉ giao hợp lệ (thiếu mã Quận/Xã GHN)');
  var parcel = _shipParcel(ss, orderId, settings, loc); // cân thực nếu có, else suy từ Products.Weight
  // Cho FE (modal Tạo vận đơn) chọn gói dịch vụ + ghi chú giao; fallback về mặc định cũ nếu không gửi.
  var svc  = parseInt(payload.service_type_id, 10) || 2; // 2 = chuẩn TMĐT (mặc định), 1 = nhanh (Express)
  var note = ['CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG'].indexOf(String(payload.required_note)) !== -1
    ? String(payload.required_note) : 'KHONGCHOXEMHANG';
  var res = _ghnFetch(settings, '/v2/shipping-order/create', 'post', {
    payment_type_id: 1,                 // 1 = shop trả phí ship (COD chỉ thu tiền HÀNG qua cod_amount)
    required_note:   note,
    to_name:    ctx.addr.receiver_name, to_phone: ctx.addr.phone,
    to_address: ctx.addr.address, to_ward_code: ctx.wardCode, to_district_id: ctx.districtId,
    cod_amount: parcel.cod_amount || 0,
    weight: parcel.weight, length: parcel.length, width: parcel.width, height: parcel.height,
    service_type_id: svc, items: ctx.items
  });
  var data = (res && res.data) || {};
  var trackingCode = String(data.order_code || '');
  var fee = Number(data.total_fee != null ? data.total_fee : (data.fee && data.fee.main_service)) || 0;
  if (!trackingCode) throw new Error('GHN không trả về mã vận đơn — kiểm tra lại cấu hình/địa chỉ');

  _shipmentSet(ss, orderId, { carrier: 'GHN', tracking_code: trackingCode, shipping_fee: fee, service_id: svc }, loc);
  _setFulfillmentStatus(ss, orderId, 'ready_to_pick', payload._staffActor || 'staff', false);
  logActivity(ss, 'ORDER', orderId, 'GHN_SHIPMENT_CREATED', payload._staffActor || 'staff');
  return { order_id: orderId, tracking_code: trackingCode, shipping_fee: fee };
}

function ghnCancelShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var tracking = _shipmentGet(ss, orderId).tracking_code;
  if (!tracking) throw new Error('Đơn chưa có vận đơn GHN để huỷ');
  _ghnFetch(settings, '/v2/switch-status/cancel', 'post', { order_codes: [tracking] });
  // "Huỷ đóng gói" (không phải huỷ đơn): xoá liên kết vận đơn + reset về 'pending_packing'. Xem
  // _shipmentUnpackReset và docs UI: nút 'Huỷ đơn' (nghiệp vụ khác) mới đặt fulfillment='cancelled'.
  _shipmentUnpackReset(ss, orderId, payload._staffActor || 'staff', 'GHN', tracking);
  logActivity(ss, 'ORDER', orderId, 'GHN_SHIPMENT_UNPACKED|' + String(tracking || ''), payload._staffActor || 'staff');
  return { order_id: orderId, unpacked: true, tracking_code: '', carrier: '',
           shipping_fee: 0, package_weight: 0, package_dims: '', service_id: '',
           cod_amount: 0, fulfillment_status: 'pending_packing' };
}

// CHẠY TAY sau khi có 1 đơn ở "Chờ đóng gói" + đã chọn địa chỉ GHN — xác nhận tạo vận đơn thật.
function testGhnCreateShipment(orderId) {
  Logger.log(JSON.stringify(ghnCreateShipment({ order_id: orderId, _staffActor: 'test' })));
  return 'OK — xem Logs';
}

// ── GHN tracking (B5) — map trạng thái GHN → FulfillmentStatus, refresh thủ công + webhook + cron ──
function _ghnMapStatus(s) {
  s = String(s || '').toLowerCase();
  var map = {
    ready_to_pick:'ready_to_pick', picking:'ready_to_pick', picked:'ready_to_pick', storing:'ready_to_pick', money_collect_picking:'ready_to_pick',
    transporting:'delivering', sorting:'delivering', delivering:'delivering', money_collect_delivering:'delivering',
    delivered:'delivered',
    delivery_fail:'redelivery', // giao hụt — còn cơ hội giao lại (C3)
    waiting_to_return:'delivery_cancelled', return:'delivery_cancelled',
    return_transporting:'delivery_cancelled', return_sorting:'delivery_cancelled', returning:'delivery_cancelled',
    return_fail:'delivery_cancelled', exception:'delivery_cancelled', damage:'delivery_cancelled', lost:'delivery_cancelled',
    returned:'returned', cancel:'cancelled'
  };
  return map[s] || null;
}

// Áp trạng thái giao (force=true — GHN là nguồn sự thật) + side-effect: delivered→COD receipt (B6),
// returned→hoàn kho. Best-effort toàn bộ, không throw (dùng cho webhook/cron/refresh).
function _applyShippingStatus(ss, orderId, mapped, actor, settings) {
  if (!mapped) return { order_id: orderId, skipped: true };
  var changed;
  try { changed = _setFulfillmentStatus(ss, orderId, mapped, actor, true); }
  catch (e) { return { order_id: orderId, error: e.message }; }
  if (changed && changed.unchanged) return changed;
  if (mapped === 'delivered') {
    try { notifyTrackingPage(ss, orderId, 'SHIPMENT_DELIVERED', 'CUSTOMER', { status: 'delivered' }); } catch (e) {}
    try { notifyRoutedTelegram(ss, orderId, 'SHIPMENT_DELIVERED', {}, settings, '📦 <b>Đơn đã giao tới khách</b>\nĐơn: ' + orderId); } catch (e) {}
    // COD reconciliation (B6) — chỉ chạy nếu hàm đã tồn tại (typeof guard để B5 độc lập, không vỡ nếu B6 chưa dán).
    try { if (typeof _onShippingDelivered === 'function') _onShippingDelivered(ss, orderId, actor, settings); } catch (e) {}
  } else if (mapped === 'returned') {
    try { notifyRoutedTelegram(ss, orderId, 'SHIPMENT_RETURNED', {}, settings, '↩️ <b>Đơn hoàn trả về kho</b>\nĐơn: ' + orderId); } catch (e) {}
    try { _reverseSaleMovements(orderId, actor); } catch (e) {} // hoàn kho (đã variant-aware)
  }
  return changed;
}

// Refresh 1 đơn theo GHN detail (thủ công / cron). Trả trạng thái GHN thô + mapped.
// 2026-08-29: THÊM _shipmentHistoryLog — trước đây hàm này chỉ gọi _applyShippingStatus (cập nhật
// FulfillmentStatus thật) nhưng KHÔNG ghi ShipmentStatusHistory, nên tab "Trạng thái từ đối tác" luôn
// rỗng với đơn GHN dù trạng thái đơn vẫn cập nhật đúng phía dưới — staff không thấy được lịch sử. Ghi
// UNCONDITIONAL (kể cả mapped rỗng) theo đúng pattern đã chạy ổn định ở goshipRefreshTracking.
function ghnRefreshTracking(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var shp = _shipmentGet(ss, orderId);
  var tracking = shp.tracking_code;
  if (!tracking) throw new Error('Đơn chưa có vận đơn GHN');
  var res = _ghnFetch(settings, '/v2/shipping-order/detail', 'post', { order_code: tracking });
  var ghnStatus = (res && res.data && res.data.status) || '';
  var mapped = _ghnMapStatus(ghnStatus);
  _applyShippingStatus(ss, orderId, mapped, payload._staffActor || 'system:ghn-refresh', settings);
  _shipmentHistoryLog(ss, {
    order_id: orderId, tracking_code: tracking, carrier: shp.carrier,
    status_raw: String(ghnStatus || ''), status_text: '',
    fulfillment_status: mapped || '', note: '',
    update_time: Math.floor(Date.now() / 1000), source: 'refresh'
  });
  return { order_id: orderId, ghn_status: ghnStatus, fulfillment_status: mapped };
}

// Webhook GHN (gọi từ doPost khi payload không có `action` nhưng có OrderCode). GHN push {OrderCode,
// Status, ...}, KHÔNG ký HMAC ở webhook cơ bản (không có gì trong payload để verify chữ ký chính hãng).
// SECURITY (2026-09-05): comment cũ ở đây từng ghi "xác thực nhẹ bằng ShopID" nhưng code chưa từng đọc
// ShopID/bất kỳ field xác thực nào — đã kiểm tra lại, đây là lỗ hổng thật (bất kỳ ai biết OrderCode —
// vốn in trên tem, không phải bí mật — POST được lên URL public này để đổi FulfillmentStatus của đơn).
// Fix theo ĐÚNG pattern đã dùng cho Goship (mops_01.js:3833-3845, cùng giới hạn nền tảng: GAS không đọc
// được header nên không verify HMAC được) — khoá đặt ngay TRONG URL webhook khai với GHN (…/exec?wh=
// <khoá>), đọc qua e.parameter. Chưa cấu hình khoá (GHN_WEBHOOK_KEY rỗng) → vẫn chạy như cũ (tương
// thích ngược cho tới khi admin đặt khoá + đăng ký lại URL webhook với GHN kèm khoá đó).
// Trùng lặp/webhook đến 2 lần gần nhau: _shipmentHistoryLog (gọi bên dưới) đã tự dedupe theo
// (order_id, status_raw, update_time) trong cửa sổ ngắn — xem mops_01.js:1638-1662 — nên KHÔNG cần
// thêm lớp idempotency riêng ở đây cho trường hợp retry ngay lập tức. Bảo vệ chống LÙI TRẠNG THÁI do
// webhook đến trễ/sai thứ tự (như Goship làm ở dòng 3879 dựa vào payload.update_time) CHƯA thêm được ở
// đây vì payload GHN cơ bản trong code này không có field thời điểm để so sánh — cần xác nhận từ tài
// liệu API GHN thực tế trước khi thêm, không suy đoán tên field.
function handleGhnWebhook(payload, params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var wantGhnKey = String(settings.GHN_WEBHOOK_KEY || '').trim();
  if (wantGhnKey) {
    var gotGhnKey = String((params && (params.wh || params.key)) || '').trim();
    if (!_timingSafeEqual(gotGhnKey, wantGhnKey)) {
      try { logActivity(ss, 'SECURITY', 'GHN_WEBHOOK', 'WEBHOOK_BAD_KEY', 'system:ghn-webhook'); } catch (e) {}
      return { success: true, ignored: 'bad webhook key' };
    }
  }
  var orderCode = String(payload.OrderCode || payload.order_code || '').trim();
  var ghnStatus = String(payload.Status || payload.status || '').trim();
  if (!orderCode) return { success: true, ignored: 'no OrderCode' };
  // Tra OrderID theo TrackingCode (cột 31).
  var sh = ss.getSheetByName(SHEET.ORDERS);
  if (!sh || sh.getLastRow() < 2) return { success: true, ignored: 'no orders' };
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 31).getValues();
  var orderId = '';
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][30]) === orderCode) { orderId = String(data[i][0]); break; } // col 31 = index 30
  }
  if (!orderId) return { success: true, ignored: 'unknown OrderCode ' + orderCode };
  var mapped = _ghnMapStatus(ghnStatus);
  _applyShippingStatus(ss, orderId, mapped, 'system:ghn-webhook', settings);
  var shp = _shipmentGet(ss, orderId);
  _shipmentHistoryLog(ss, {
    order_id: orderId, tracking_code: shp.tracking_code, carrier: shp.carrier,
    status_raw: String(ghnStatus || ''), status_text: '',
    fulfillment_status: mapped || '', note: '',
    update_time: Math.floor(Date.now() / 1000), source: 'webhook'
  });
  return { success: true, order_id: orderId, ghn_status: ghnStatus, fulfillment_status: mapped };
}
// Kiểm khoá webhook GHN có chặn không: gọi với khoá sai, KHÔNG được đổi trạng thái. Cùng mẫu với
// testGoshipWebhookBadKey (mops_01.js ~4026).
function testGhnWebhookBadKey(orderId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var shp = _shipmentGet(ss, orderId);
  var res = handleGhnWebhook(
    { OrderCode: shp.tracking_code, Status: 'delivered' },
    { wh: 'khoa-sai-hoan-toan' }
  );
  Logger.log(JSON.stringify(res));
  Logger.log(res && res.ignored === 'bad webhook key'
    ? 'PASS — khoá sai bị chặn.'
    : (String(settings.GHN_WEBHOOK_KEY || '').trim()
        ? 'LỖI — đã đặt GHN_WEBHOOK_KEY nhưng khoá sai vẫn lọt qua.'
        : 'CHÚ Ý — chưa đặt GHN_WEBHOOK_KEY nên webhook GHN đang mở cho bất kỳ ai biết OrderCode. Đặt khoá ở Cấu hình rồi đăng ký lại URL webhook với GHN kèm khoá.'));
  return 'OK — xem Logs';
}

// Cron 30' — refresh các đơn đang trong luồng giao (ready_to_pick/delivering/delivery_cancelled).
// 2026-08-28: viết từ lâu nhưng CHƯA BAO GIỜ có trigger thật cài (không ScriptApp.newTrigger nào gọi
// hàm này) — nghĩa là auto-pull trạng thái KHÔNG chạy cho tới giờ, chỉ có nút "Nạp lại" thủ công.
// Cài bằng installShippingTrackingTriggers() (chạy 1 lần trong Apps Script editor). Best-effort từng
// đơn, không để 1 lỗi chặn cả lô. Đếm checked/updated để shippingDailyDigestTrigger tổng kết 20h.
function ghnTrackingTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasGoshipConfig(settings) && !_hasGhnConfig(settings) && !_hasAhamoveConfig(settings) && !_hasGhtkConfig(settings) && !_hasVtpConfig(settings)) return; // carrier-agnostic: chạy nếu có ÍT NHẤT 1 hãng API
  var sh = ss.getSheetByName(SHEET.ORDERS);
  if (!sh || sh.getLastRow() < 2) return;
  var inFlight = { ready_to_pick: 1, delivering: 1, redelivery: 1, delivery_cancelled: 1 };
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 31).getValues();
  var checked = 0, updated = 0;
  data.forEach(function(r, idx) {
    var ff = String(r[28] || ''); // AC FulfillmentStatus
    var tracking = String(r[30] || ''); // AE TrackingCode
    if (!tracking || !inFlight[ff]) return;
    checked++;
    // carrier-agnostic: dispatch theo Orders.Carrier (GHN chỉ là 1 adapter). Các hàm *RefreshTracking
    // không trả cờ "đã đổi trạng thái" ra ngoài nên so sánh trực tiếp cột AC trước/sau — rẻ hơn refactor
    // return shape của cả 5 adapter chỉ để phục vụ đếm cho báo cáo cuối ngày.
    try {
      shipmentRefresh({ order_id: String(r[0]), _staffActor: 'system:cron' });
      var newFf = String(sh.getRange(idx + 2, 29).getValue() || ''); // cột AC = 29
      if (newFf && newFf !== ff) updated++;
    } catch (e) {}
  });
  _accumDailyTrackingStat(ss, checked, updated);
}

// Cộng dồn số liệu mỗi lần ghnTrackingTrigger chạy (mỗi 30') vào Settings — key theo ngày hiện tại,
// tự reset khi qua ngày mới. shippingDailyDigestTrigger (20h) đọc + reset để gửi báo cáo Telegram
// cuối ngày mà KHÔNG gọi lại API hãng (đỡ tốn quota carrier so với quét lại toàn bộ đơn lúc 20h).
function _accumDailyTrackingStat(ss, checked, updated) {
  try {
    var s = getSettings(ss);
    var todayKey = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    var sameDay = String(s.shipping_cron_stat_date || '') === todayKey;
    var prevChecked = sameDay ? (Number(s.shipping_cron_checked) || 0) : 0;
    var prevUpdated = sameDay ? (Number(s.shipping_cron_updated) || 0) : 0;
    _setSettingValue(ss, 'shipping_cron_stat_date', todayKey);
    _setSettingValue(ss, 'shipping_cron_checked', prevChecked + checked);
    _setSettingValue(ss, 'shipping_cron_updated', prevUpdated + updated);
  } catch (e) {}
}

// Cron 20h hằng ngày — CHỈ tổng kết số liệu ghnTrackingTrigger đã cộng dồn suốt ngày (mỗi 30') rồi
// gửi Telegram + reset bộ đếm; không gọi lại API hãng nào. Cài cùng installShippingTrackingTriggers().
// Phase 3 (2026-08-29) — lưới an toàn CHỈ ĐỌC, KHÔNG tự sửa: so Orders.FulfillmentStatus với
// fulfillment_status của dòng ShipmentStatusHistory MỚI NHẤT có khẳng định trạng thái (bỏ qua dòng
// nhật ký thuần rỗng fulfillment_status như 'staff_urge'). Lệch → liệt kê để staff tự xem xét — KHÔNG
// tự động ghi đè, vì lệch có thể đến từ 1 thay đổi tay hợp lệ của staff SAU thời điểm timeline ghi
// (VD staff đã đóng gói lại sau lần huỷ cũ) chứ không nhất thiết là lỗi. Đọc 1 lần cả 2 sheet rồi gộp
// trong bộ nhớ — tránh quét lại History theo từng đơn (rẻ hơn nhiều với sheet lớn).
function _auditFulfillmentDrift(ss) {
  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var histSh = ss.getSheetByName(SHEET.SHIPMENT_STATUS_HISTORY);
  if (!ordersSh || ordersSh.getLastRow() < 2 || !histSh || histSh.getLastRow() < 2) return [];

  var histData = histSh.getRange(2, 1, histSh.getLastRow() - 1, 12).getValues();
  var latestByOrder = {};
  histData.forEach(function(row) {
    var orderId = String(row[1]);
    var ff = String(row[7] || '');
    if (!ff) return; // dòng nhật ký thuần (urge/created rỗng) — không khẳng định trạng thái, bỏ qua
    var createdAt = row[10] instanceof Date ? row[10].getTime() : 0;
    var prev = latestByOrder[orderId];
    if (!prev || createdAt >= prev.createdAt) {
      latestByOrder[orderId] = { ff: ff, statusText: String(row[6] || ''), source: String(row[11] || ''), createdAt: createdAt };
    }
  });

  var ordersData = ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 31).getValues();
  var mismatches = [];
  ordersData.forEach(function(r) {
    var orderId = String(r[0]);
    var ff = String(r[28] || ''); // AC FulfillmentStatus
    var tracking = String(r[30] || ''); // AE TrackingCode
    if (!tracking) return; // chưa từng có vận đơn — không có gì để đối chiếu
    var latest = latestByOrder[orderId];
    if (latest && latest.ff !== ff) {
      mismatches.push({ order_id: orderId, order_status: ff, history_status: latest.ff, history_text: latest.statusText, source: latest.source });
    }
  });
  return mismatches;
}

function shippingDailyDigestTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var todayKey = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var sameDay = String(settings.shipping_cron_stat_date || '') === todayKey;
  var checked = sameDay ? (Number(settings.shipping_cron_checked) || 0) : 0;
  var updated = sameDay ? (Number(settings.shipping_cron_updated) || 0) : 0;
  var mismatches = [];
  try { mismatches = _auditFulfillmentDrift(ss); } catch (e) {}
  var msg = '🚚 <b>Tổng kết theo dõi vận đơn hôm nay</b>\n' +
    'Đã kiểm tra: <b>' + checked + '</b> vận đơn đang giao\n' +
    'Cập nhật trạng thái: <b>' + updated + '</b> đơn';
  if (mismatches.length) {
    msg += '\n\n⚠️ <b>' + mismatches.length + ' đơn lệch trạng thái</b> (Tình trạng đơn ≠ timeline mới nhất — vào tab Vận đơn kiểm tra tay):\n' +
      mismatches.slice(0, 10).map(function(m) {
        return '• ' + m.order_id + ': đơn đang "' + m.order_status + '", timeline mới nhất "' + m.history_status + '" (' + m.source + ')';
      }).join('\n');
    if (mismatches.length > 10) msg += '\n… và ' + (mismatches.length - 10) + ' đơn khác.';
  }
  try { notifyRoutedTelegram(ss, '', 'SHIPMENT_DAILY_DIGEST', {}, settings, msg); } catch (e) {}
  _setSettingValue(ss, 'shipping_cron_checked', 0);
  _setSettingValue(ss, 'shipping_cron_updated', 0);
}

// Cài BỘ trigger theo dõi vận đơn (chạy 1 LẦN trong Apps Script editor sau khi clasp push — Apps
// Script không cho client HTTP tự cài trigger, phải chạy tay trong editor đúng theo convention
// installPerfTriggers()). Idempotent — xoá trigger cũ cùng tên trước khi cài lại nên an toàn khi
// chạy lại sau mỗi lần deploy.
function installShippingTrackingTriggers() {
  var targets = { ghnTrackingTrigger: 1, shippingDailyDigestTrigger: 1 };
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (targets[t.getHandlerFunction()]) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('ghnTrackingTrigger').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('shippingDailyDigestTrigger').timeBased().everyDays(1).atHour(20).create();
  return 'Đã cài triggers: ghnTrackingTrigger (mỗi 30 phút) + shippingDailyDigestTrigger (20h hằng ngày)';
}

function testGhnRefresh(orderId) {
  Logger.log(JSON.stringify(ghnRefreshTracking({ order_id: orderId, _staffActor: 'test' })));
  return 'OK — xem Logs';
}

// ============================================================
// AHAMOVE CLIENT (đa đối tác — 2026-07-20) — adapter thứ 2 sau GHN.
//  Ahamove Open API v1. Giao NỘI THÀNH / trong ngày, mô hình TOẠ ĐỘ (lat/lng) + service_id theo
//  THÀNH PHỐ (vd 'SGN-BIKE' cho HCM, 'HAN-BIKE' cho Hà Nội) — KHÁC HẲN GHN: KHÔNG có Tỉnh/Quận/Xã ID,
//  KHÔNG có master-data picker. Địa chỉ người nhận đẩy dạng chuỗi để Ahamove tự geocode.
//
//  ⚠️ CHƯA VERIFY SANDBOX — viết theo tài liệu Open API v1 công khai của Ahamove. Trước khi tin dùng
//  production PHẢI chạy tay testAhamoveToken() → testAhamoveEstimate(orderId) → testAhamoveCreate(orderId)
//  trong Apps Script Editor sau khi điền AHAMOVE_API_KEY + AHAMOVE_MOBILE + AHAMOVE_SERVICE_ID +
//  AHAMOVE_FROM_ADDRESS (Cấu hình). Đúng quy trình testGhn* của GHN. Mọi field/endpoint Ahamove trả
//  khác dự kiến → chỉnh ngay tại các chỗ đánh dấu [VERIFY].
//
//  Auth: token (JWT) lấy từ api_key + mobile qua get_token — KHÔNG admin nhập tay token; cache 30'.
//  Base: stg=https://apistg.ahamove.com · prod=https://api.ahamove.com. GAS→Ahamove server-side (không CORS).
// ============================================================
function _ahamoveBaseUrl(settings) {
  return (String(settings.AHAMOVE_ENV || 'stg').toLowerCase() === 'prod')
    ? 'https://api.ahamove.com'
    : 'https://apistg.ahamove.com';
}

// Đủ điều kiện hoạt động: có api_key + SĐT tài khoản + service_id (theo TP) + địa chỉ kho lấy hàng.
function _hasAhamoveConfig(settings) {
  return !!(settings.AHAMOVE_API_KEY && settings.AHAMOVE_MOBILE && settings.AHAMOVE_SERVICE_ID && settings.AHAMOVE_FROM_ADDRESS);
}

// Lấy token Ahamove từ api_key + mobile. Cache CacheService 30' (token thật sống vài giờ — cache ngắn
// để không dùng token đã hết hạn). [VERIFY] endpoint get_token + tên field 'token' theo docs v1.
function _ahamoveToken(settings) {
  if (!settings.AHAMOVE_API_KEY || !settings.AHAMOVE_MOBILE)
    throw new Error('Chưa cấu hình Ahamove (API Key + SĐT tài khoản) — MOPS Admin > Cấu hình > Vận chuyển Ahamove');
  var cache = CacheService.getScriptCache();
  var ckey  = 'aha_tok_' + String(settings.AHAMOVE_ENV || 'stg') + '_' + String(settings.AHAMOVE_MOBILE);
  var hit = cache.get(ckey);
  if (hit) return hit;
  var url = _ahamoveBaseUrl(settings) + '/v1/partner/get_token'
          + '?id=' + encodeURIComponent(String(settings.AHAMOVE_MOBILE))
          + '&api_key=' + encodeURIComponent(String(settings.AHAMOVE_API_KEY));
  var resp = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  var code = resp.getResponseCode(), txt = resp.getContentText();
  var json = null; try { json = JSON.parse(txt); } catch (e) {}
  if (code < 200 || code >= 300 || !json || !json.token)
    throw new Error('Ahamove get_token ' + code + ': ' + ((json && (json.description || json.title || json.message)) || txt.substring(0, 250)));
  try { cache.put(ckey, String(json.token), 1800); } catch (e) {}
  return String(json.token);
}

// Gọi Ahamove Open API (POST → token trong body; GET → token đã nhét sẵn ở query của `path`). Trả JSON.
function _ahamoveFetch(settings, path, method, body) {
  var opts = { method: (method || 'post'), contentType: 'application/json', muteHttpExceptions: true };
  if (body) opts.payload = JSON.stringify(body);
  var resp = UrlFetchApp.fetch(_ahamoveBaseUrl(settings) + path, opts);
  var code = resp.getResponseCode(), txt = resp.getContentText();
  var json = null; try { json = JSON.parse(txt); } catch (e) {}
  if (code < 200 || code >= 300)
    throw new Error('Ahamove API ' + code + ': ' + ((json && (json.description || json.title || json.message)) || txt.substring(0, 250)));
  return json;
}

// Điểm lấy hàng (kho shop) — từ Cấu hình. lat/lng tuỳ chọn: nếu trống, Ahamove geocode theo address.
function _ahamovePickupPoint(settings) {
  var p = {
    address: String(settings.AHAMOVE_FROM_ADDRESS || ''),
    name:    String(settings.AHAMOVE_PICKUP_NAME || settings.ACCOUNT_NAME || ''),
    mobile:  String(settings.AHAMOVE_PICKUP_MOBILE || '')
  };
  var lat = parseFloat(settings.AHAMOVE_FROM_LAT), lng = parseFloat(settings.AHAMOVE_FROM_LNG);
  if (!isNaN(lat) && !isNaN(lng)) { p.lat = lat; p.lng = lng; }
  return p;
}

// Điểm giao (người nhận) — Ahamove geocode theo chuỗi địa chỉ (ShippingAddresses KHÔNG có lat/lng).
// [VERIFY] độ tin cậy geocode; nếu sai nhiều → bổ sung cột lat/lng vào ShippingAddresses + picker bản đồ.
function _ahamoveDropPoint(ss, orderId, codAmount) {
  var loc  = _findOrderRow(ss, orderId);
  var addr = _getShippingAddress(ss, String(loc.sheet.getRange(loc.row, 7).getValue() || ''));
  if (!addr) throw new Error('Đơn chưa có địa chỉ giao');
  var full = [addr.address, addr.ward, addr.district, addr.province].filter(function (x) { return x; }).join(', ');
  if (!full) throw new Error('Địa chỉ giao rỗng — không geocode được');
  var pt = { address: full, name: addr.receiver_name, mobile: addr.phone };
  if (codAmount > 0) pt.cod = codAmount; // [VERIFY] tên field COD trên path point (v1: 'cod')
  return pt;
}

// Rút phí từ response estimate — Ahamove có thể trả object {total_price} hoặc mảng dịch vụ. [VERIFY] shape.
function _ahamovePickFee(res, serviceId) {
  if (res == null) return 0;
  if (typeof res.total_price === 'number') return res.total_price;
  var arr = Array.isArray(res) ? res : (res.services || res.data || []);
  for (var i = 0; i < arr.length; i++) {
    if (!serviceId || String(arr[i].service_id) === serviceId) return Number(arr[i].total_price || arr[i].price || 0);
  }
  return arr.length ? Number(arr[0].total_price || arr[0].price || 0) : 0;
}

// Tính cước — theo order_id (tự lấy COD + địa chỉ) hoặc theo địa chỉ thô (preview lúc nhập).
function ahamoveEstimateFee(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasAhamoveConfig(settings)) throw new Error('Chưa cấu hình Ahamove — MOPS Admin > Cấu hình');
  var token = _ahamoveToken(settings);
  var orderId = String(payload.order_id || '').trim();
  var drop;
  if (orderId) {
    drop = _ahamoveDropPoint(ss, orderId, _shipmentGet(ss, orderId).cod_amount);
  } else {
    drop = { address: String(payload.to_address || ''), name: String(payload.to_name || ''), mobile: String(payload.to_phone || '') };
    if (!drop.address) throw new Error('Thiếu địa chỉ người nhận');
  }
  var serviceId = String(payload.service_id || settings.AHAMOVE_SERVICE_ID);
  var res = _ahamoveFetch(settings, '/v1/order/estimate', 'post', {
    token: token, order_time: 0, payment_method: 'BALANCE', service_id: serviceId,
    path: [_ahamovePickupPoint(settings), drop]
  });
  return { fee: _ahamovePickFee(res, serviceId), detail: res };
}

// Tạo vận đơn Ahamove cho 1 đơn → pending_packing → ready_to_pick, ghi TrackingCode/ShippingFee.
function ahamoveCreateShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasAhamoveConfig(settings)) throw new Error('Chưa cấu hình Ahamove — MOPS Admin > Cấu hình');
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var pre = _shipPrepareCreate(ss, orderId, payload);
  var loc = pre.loc;

  var token = _ahamoveToken(settings);
  var cod = pre.shipment.cod_amount;
  var serviceId = String(payload.service_id || settings.AHAMOVE_SERVICE_ID);
  var res = _ahamoveFetch(settings, '/v1/order/create', 'post', {
    token: token, order_time: 0, payment_method: 'BALANCE', service_id: serviceId,
    path: [_ahamovePickupPoint(settings), _ahamoveDropPoint(ss, orderId, cod)],
    remarks: 'Đơn ' + orderId
  });
  // [VERIFY] tên field mã vận đơn (v1: order_id | _id) + phí (total_price | order_fee).
  var tracking = String((res && (res.order_id || res._id)) || '');
  var fee = Number((res && (res.total_price || res.order_fee || res.price)) || 0);
  if (!tracking) throw new Error('Ahamove không trả về mã vận đơn — kiểm tra cấu hình/địa chỉ: ' + JSON.stringify(res).substring(0, 200));

  _shipmentSet(ss, orderId, { carrier: 'AHAMOVE', tracking_code: tracking, shipping_fee: fee, service_id: serviceId }, loc);
  _setFulfillmentStatus(ss, orderId, 'ready_to_pick', payload._staffActor || 'staff', false);
  logActivity(ss, 'ORDER', orderId, 'AHAMOVE_SHIPMENT_CREATED', payload._staffActor || 'staff');
  return { order_id: orderId, tracking_code: tracking, shipping_fee: fee, shared_link: (res && res.shared_link) || '' };
}

function ahamoveCancelShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var tracking = _shipmentGet(ss, orderId).tracking_code;
  if (!tracking) throw new Error('Đơn chưa có vận đơn Ahamove để huỷ');
  var token = _ahamoveToken(settings);
  _ahamoveFetch(settings, '/v1/order/cancel', 'post', { token: token, order_id: tracking, comment: String(payload.comment || 'Huỷ đóng gói từ MOPS') });
  _shipmentUnpackReset(ss, orderId, payload._staffActor || 'staff', 'AHAMOVE', tracking);
  logActivity(ss, 'ORDER', orderId, 'AHAMOVE_SHIPMENT_UNPACKED|' + String(tracking || ''), payload._staffActor || 'staff');
  return { order_id: orderId, unpacked: true, tracking_code: '', carrier: '',
           shipping_fee: 0, package_weight: 0, package_dims: '', service_id: '',
           cod_amount: 0, fulfillment_status: 'pending_packing' };
}

// Map trạng thái Ahamove → FulfillmentStatus MOPS. [VERIFY] danh sách status thực tế Ahamove trả về.
// 2026-08-29 — bổ sung theo tài liệu chính thức developers.ahamove.com/en/docs/order-status-flow
// (fetch trực tiếp): BOARDED/ARRIVED/COMPLETING là sub-status NẰM TRONG giai đoạn IN_PROCESS (tài xế
// đang tới điểm lấy/điểm giao — chỉ chi tiết hoá vị trí, không phải trạng thái mới), IN_RETURN là
// sub-status của việc giao thất bại đang hoàn về (trước RETURNED). Bản cũ thiếu 4 mã này → rơi vào
// null (không đổi trạng thái) mỗi lần Ahamove gửi cập nhật vị trí tài xế, dù đơn vẫn đang tiến triển
// bình thường.
function _ahamoveMapStatus(s) {
  s = String(s || '').toUpperCase().replace(/\s+/g, '_');
  var map = {
    IDLE: 'ready_to_pick', ASSIGNING: 'ready_to_pick', ACCEPTED: 'ready_to_pick',
    IN_PROCESS: 'delivering', BOARDED: 'delivering', ARRIVED: 'delivering', COMPLETING: 'delivering',
    COMPLETED: 'delivered',
    CANCELLED: 'cancelled', FAILED: 'delivery_cancelled', IN_RETURN: 'delivery_cancelled', RETURNED: 'returned'
  };
  return map[s] || null;
}

// 2026-08-29: THÊM _shipmentHistoryLog (cùng lỗ hổng như GHN/GHTK — xem ghi chú ở ghnRefreshTracking).
function ahamoveRefreshTracking(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var shp = _shipmentGet(ss, orderId);
  var tracking = shp.tracking_code;
  if (!tracking) throw new Error('Đơn chưa có vận đơn Ahamove');
  var token = _ahamoveToken(settings);
  var res = _ahamoveFetch(settings, '/v1/order/detail?token=' + encodeURIComponent(token) + '&order_id=' + encodeURIComponent(tracking), 'get', null);
  var st = String((res && (res.status || (res.data && res.data.status))) || '');
  var mapped = _ahamoveMapStatus(st);
  _applyShippingStatus(ss, orderId, mapped, payload._staffActor || 'system:ahamove-refresh', settings);
  _shipmentHistoryLog(ss, {
    order_id: orderId, tracking_code: tracking, carrier: shp.carrier,
    status_raw: st, status_text: '',
    fulfillment_status: mapped || '', note: '',
    update_time: Math.floor(Date.now() / 1000), source: 'refresh'
  });
  return { order_id: orderId, ahamove_status: st, fulfillment_status: mapped };
}

// CHẠY TAY trong Apps Script Editor sau khi điền AHAMOVE_API_KEY + AHAMOVE_MOBILE (Cấu hình) — xác
// nhận kết nối + shape response Ahamove THẬT trước khi tin dùng (giống testGhnMasterData cho GHN).
function testAhamoveToken() {
  var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  var t = _ahamoveToken(settings);
  Logger.log('Ahamove token OK (' + t.length + ' ký tự): ' + t.substring(0, 24) + '…');
  return 'OK — xem Logs';
}
function testAhamoveEstimate(orderId) {
  Logger.log(JSON.stringify(ahamoveEstimateFee({ order_id: orderId })));
  return 'OK — xem Logs';
}
function testAhamoveCreate(orderId) {
  Logger.log(JSON.stringify(ahamoveCreateShipment({ order_id: orderId, _staffActor: 'test' })));
  return 'OK — xem Logs';
}

// ============================================================
// GHTK CLIENT (đa đối tác — 2026-07-20) — Giao Hàng Tiết Kiệm. Địa chỉ theo TÊN tỉnh/quận/xã (khớp
//  thẳng ShippingAddresses MOPS, KHÔNG cần ID) → mô hình gần MOPS nhất. Auth: header Token (tĩnh từ
//  portal GHTK). Base: prod=services.giaohangtietkiem.vn · stg=services-staging.ghtklab.com.
//  ⚠️ CHƯA VERIFY SANDBOX — theo docs GHTK API. Chạy tay testGhtkFee(orderId) → testGhtkCreate(orderId)
//  sau khi điền GHTK_TOKEN + địa chỉ kho lấy hàng (Cấu hình). Weight fee param = GRAM; products[].weight
//  = KG. [VERIFY]: mã vận đơn = order.label, phí = order.fee, danh sách status số.
// ============================================================
function _ghtkBaseUrl(settings) {
  return (String(settings.GHTK_ENV || 'stg').toLowerCase() === 'prod')
    ? 'https://services.giaohangtietkiem.vn'
    : 'https://services-staging.ghtklab.com';
}
function _hasGhtkConfig(settings) {
  // Kho API được định danh bằng pick_address_id; địa giới được lấy động theo từng kho khi gọi fee.
  // Bộ địa chỉ text chỉ còn là fallback tương thích cho tài khoản không trả danh sách kho.
  return !!(settings.GHTK_TOKEN && (settings.GHTK_PICK_ADDRESS_ID || (settings.GHTK_PICK_ADDRESS && settings.GHTK_PICK_PROVINCE && settings.GHTK_PICK_DISTRICT)));
}
function _ghtkFetch(settings, path, method, body) {
  if (!settings.GHTK_TOKEN) throw new Error('Chưa cấu hình GHTK Token — MOPS Admin > Cấu hình > Vận chuyển GHTK');
  var opts = { method: (method || 'get'), headers: { 'Token': String(settings.GHTK_TOKEN) },
               contentType: 'application/json', muteHttpExceptions: true };
  if (body) opts.payload = JSON.stringify(body);
  var resp = UrlFetchApp.fetch(_ghtkBaseUrl(settings) + path, opts);
  var code = resp.getResponseCode(), txt = resp.getContentText();
  var json = null; try { json = JSON.parse(txt); } catch (e) {}
  if (code < 200 || code >= 300 || (json && json.success === false))
    throw new Error('GHTK API ' + code + ': ' + ((json && (json.message || json.error)) || txt.substring(0, 250)));
  return json;
}

// ── Đăng nhập bằng Email/Password → lấy Token tự động (2026-07-30) ────────────────────────────
// Thay vì bắt OWNER copy-paste API Token từ khonh doanh nghiệp GHTK, gọi POST /services/shops/token
// với Email + Password của tài khoản GHTK để hệ thống tự lấy Token. KHÔNG-QUAN-TRỌNG-BỎ-QUÊN: Email
// và Password KHÔNG bao giờ được lưu (không vào Sheet Settings, không vào Script Properties, không
// vào ActivityLogs) — chỉ dùng cho 1 request lấy token rồi hủy khi scope hàm kết thúc. Chỉ TOKEN
// cuối cùng được lưu vào Script Properties (ngang bảo mật với luồng nhập tay).
function _ghtkGetToken(email, password, env) {
  if (!email || !password) throw new Error('Cần cả Email và Mật khẩu tài khoản GHTK để lấy Token.');
  var baseUrl = _ghtkBaseUrl({ GHTK_ENV: env || 'stg' });
  var resp = UrlFetchApp.fetch(baseUrl + '/services/shops/token', {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ email: String(email), password: String(password) }),
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode(), txt = resp.getContentText();
  var json = null; try { json = JSON.parse(txt); } catch (e) {}
  // 401/403: phân biệt rõ "sai tài khoản" (owner sửa được) vs "GHTK API lỗi" — thông báo khác nhau
  // để owner không mất thời gian đoán tại sao token không lấy được.
  if (code === 401 || code === 403) {
    throw new Error('Sai Email hoặc Mật khẩu GHTK (' + code + '). Kiểm tra lại tài khoản trên khonh doanh nghiệp GHTK.');
  }
  if (code < 200 || code >= 300 || (json && json.success === false)) {
    throw new Error('GHTK không cấp Token (' + code + '): ' + ((json && (json.message || json.error)) || txt.substring(0, 250)));
  }
  // GHTK trả token ở gốc response hoặc nested trong data — dò cả 2 để không phụ thuộc phiên bản API.
  var token = (json && (json.token || (json.data && json.data.token))) || '';
  if (!token) throw new Error('GHTK phản hồi thành công nhưng không có Token — kiểm tra tài liệu API mới nhất.');
  return String(token);
}

// Action `ghtk_connect_by_login` — OWNER-only qua WRITE_ROUTES. Lấy token bằng Email/Password rồi ghi
// vào Script Properties, ĐỒNG BỘ với env chọn (tránh trường hợp lấy token stg nhưng gọi API prod, 2
// môi trường token khác nhau). Bust cache Settings ngay để lệnh gọi GHTK kế tiếp dùng token mới. Log
// SECURITY với email + env (định danh account), tuyệt đối KHÔNG log password hay token.
function ghtkConnectByLogin(payload) {
  var email    = String(payload.email || '').trim();
  var password = String(payload.password || '');
  var env      = String(payload.env || '').toLowerCase();
  if (!email)    throw new Error('Vui lòng nhập Email tài khoản GHTK.');
  if (!password) throw new Error('Vui lòng nhập Mật khẩu tài khoản GHTK.');
  if (env && env !== 'stg' && env !== 'prod') throw new Error('Môi trường GHTK không hợp lệ (chỉ stg | prod).');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var effectiveEnv = env || String(settings.GHTK_ENV || 'stg').toLowerCase();

  var token = _ghtkGetToken(email, password, effectiveEnv);

  // Token vào Script Properties (SECRET_KEYS đã có 'GHTK_TOKEN' — getSettings sẽ overlay ngay lần đọc kế).
  PropertiesService.getScriptProperties().setProperty('GHTK_TOKEN', token);

  // Đồng bộ GHTK_ENV vào Sheet nếu owner chỉ định env khác cấu hình hiện tại — chỉ ghi khi thực sự
  // khác để không đụng đến các dòng Settings không đổi. GHTK_ENV là non-secret nên lưu ở Sheet.
  if (env && env !== String(settings.GHTK_ENV || 'stg').toLowerCase()) {
    var sh = ss.getSheetByName(SHEET.SETTINGS);
    if (sh) {
      var lastRow  = sh.getLastRow();
      var existing = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, 1).getValues() : [];
      var rowIdx   = -1;
      for (var i = 0; i < existing.length; i++) {
        if (String(existing[i][0]).trim() === 'GHTK_ENV') { rowIdx = i + 2; break; }
      }
      if (rowIdx > 0) sh.getRange(rowIdx, 2).setNumberFormat('@').setValue(env);
      else { sh.appendRow(['GHTK_ENV', '']); sh.getRange(sh.getLastRow(), 2).setNumberFormat('@').setValue(env); }
    }
  }

  _bustSettingsCache(); // Token/env vừa đổi → invalidate cache Settings ngay, request kế tiếp đọc mới.

  // Audit chỉ email + env — KHÔNG log password/token.
  logActivity(ss, 'SECURITY', 'GHTK_TOKEN', 'GHTK_TOKEN_AUTO_FETCHED[' + effectiveEnv + '] via ' + email, payload._callerUser || 'owner');

  return { connected: true, token_set: true, env: effectiveEnv };
}

// GHTK OpenAPI: GET /services/shipment/list_pick_add trả các kho đã cài trong tài khoản.
// MOPS chỉ đồng bộ/chọn kho hiện hữu, TUYỆT ĐỐI không tạo kho ở GHTK từ luồng này.
function _ghtkPickAddresses(settings) {
  var res = _ghtkFetch(settings, '/services/shipment/list_pick_add', 'get', null);
  // GHTK có hai shape response đang gặp: data là mảng hoặc data.data là mảng.
  var list = (res && res.data instanceof Array) ? res.data
           : (res && res.data && res.data.data instanceof Array ? res.data.data : []);
  return list.map(function(item) {
    // Tên field kho của GHTK có khác nhau giữa tài khoản/phiên bản API. Chuẩn hoá ngay tại
    // ranh giới adapter để toàn bộ fee/create chỉ dùng metadata của CHÍNH kho đã chọn.
    var location = _ghtkObjectField(item, ['location', 'pick_location', 'pickup_location', 'pick_address_detail', 'address_detail']) || {};
    var address = _ghtkFieldDeep(item, ['address', 'pick_address', 'full_address', 'pickup_address', 'street']) || _ghtkField(location, ['address', 'full_address', 'street']);
    var province = _ghtkFieldDeep(item, ['pick_province', 'province', 'city', 'province_name', 'provinceName', 'city_name', 'cityName', 'pick_province_name', 'pickProvince']) || _ghtkField(location, ['province', 'city', 'province_name', 'city_name']);
    var district = _ghtkFieldDeep(item, ['pick_district', 'district', 'district_name', 'districtName', 'pick_district_name', 'pickDistrict']) || _ghtkField(location, ['district', 'district_name']);
    var ward = _ghtkFieldDeep(item, ['pick_ward', 'ward', 'ward_name', 'wardName', 'pick_ward_name', 'pickWard']) || _ghtkField(location, ['ward', 'ward_name']);
    var parsed = _ghtkLocationFromAddress(address + ', ' + String(item.pick_name || item.name || ''));
    return {
      pick_address_id: String(item.pick_address_id || ''),
      pick_name: String(item.pick_name || ''),
      pick_tel: String(item.pick_tel || ''),
      address: address,
      // GHTK fee vẫn kiểm tra tên nơi lấy hàng. Đây là metadata động của kho API trả về,
      // tuyệt đối không lấy từ cấu hình tĩnh của một kho khác.
      pick_province: province || parsed.province,
      pick_district: district || parsed.district,
      pick_ward: ward || parsed.ward
    };
  }).filter(function(item) { return !!item.pick_address_id; });
}

// Một số response GHTK trả pick_address/location là object, không phải chuỗi. String(object)
// sẽ thành "[object Object]" và làm mất toàn bộ địa chỉ. Đọc scalar ở cả object lồng nhau.
function _ghtkField(object, keys) {
  if (!object || typeof object !== 'object') return '';
  for (var i = 0; i < keys.length; i++) {
    var value = object[keys[i]];
    if (value === undefined || value === null || typeof value === 'object') continue;
    if (String(value).trim()) return String(value).trim();
  }
  return '';
}
function _ghtkObjectField(object, keys) {
  if (!object || typeof object !== 'object') return null;
  for (var i = 0; i < keys.length; i++) {
    if (object[keys[i]] && typeof object[keys[i]] === 'object') return object[keys[i]];
  }
  return null;
}
function _ghtkFieldDeep(object, keys, depth) {
  if (!object || typeof object !== 'object' || (depth || 0) > 4) return '';
  var direct = _ghtkField(object, keys);
  if (direct) return direct;
  for (var key in object) {
    if (!Object.prototype.hasOwnProperty.call(object, key) || !object[key] || typeof object[key] !== 'object') continue;
    var nested = _ghtkFieldDeep(object[key], keys, (depth || 0) + 1);
    if (nested) return nested;
  }
  return '';
}

// Fallback chỉ để đọc các response GHTK trả toàn bộ địa chỉ trong một chuỗi. Không đoán tên
// địa giới không có trong response: nếu thiếu, caller sẽ báo rõ cần tải lại metadata kho thay
// vì đẩy việc gõ tay Tỉnh/Huyện cho người dùng.
function _ghtkLocationFromAddress(address) {
  var parts = String(address || '').split(',').map(function(part) { return part.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  var out = { province: '', district: '', ward: '' };
  for (var i = parts.length - 1; i >= 0; i--) {
    var part = parts[i];
    if (!out.province && /^(TP\.?|Thành phố|Tỉnh)\s+/i.test(part)) out.province = part;
    if (!out.district && /^(Quận|Huyện|Thị xã|Thành phố)\s+/i.test(part)) out.district = part;
    if (!out.ward && /^(Phường|Xã|Thị trấn)\s+/i.test(part)) out.ward = part;
  }
  // Một số kho GHTK dùng dạng viết tắt (P./Q./TP.) hoặc địa giới mới sau sáp nhập.
  // Chuẩn hoá được từ chính chuỗi địa chỉ kho, không yêu cầu staff nhập lại địa chỉ.
  var full = String(address || '').replace(/\s+/g, ' ').trim();
  if (!out.province && /(?:TP\.?\s*H(?:ồ|o)\s*Ch[ií]\s*Minh|H(?:ồ|o)\s*Ch[ií]\s*Minh|HCM)/i.test(full)) out.province = 'TP Hồ Chí Minh';
  if (!out.province && /(?:TP\.?\s*H[aà]\s*N(?:ộ|o)i|H[aà]\s*N(?:ộ|o)i)/i.test(full)) out.province = 'Hà Nội';
  if (!out.district) {
    var districtShort = full.match(/(?:^|[,\s])(?:Q\.?|Quận)\s*([\p{L}0-9 .-]+)/iu);
    if (districtShort) out.district = 'Quận ' + districtShort[1].trim();
  }
  if (!out.ward) {
    var wardShort = full.match(/(?:^|[,\s])(?:P\.?|Phường)\s*([\p{L}0-9 .-]+)/iu);
    if (wardShort) out.ward = 'Phường ' + wardShort[1].trim();
  }
  return _ghtkResolveLegacyWardLocation(out);
}

// GHTK fee vẫn dùng danh mục quận/huyện cũ tại một số khu vực, trong khi kho có thể trả
// phường/xã mới sau sáp nhập. Mapping này là lớp tương thích tự động theo địa chỉ của CHÍNH kho.
// Không dùng bất kỳ tỉnh/huyện của kho mặc định khác. Bổ sung dần các địa giới mới khi GHTK đổi master.
function _ghtkResolveLegacyWardLocation(location) {
  var out = { province: location.province || '', district: location.district || '', ward: location.ward || '' };
  var wardKey = _ghtkLocationKey(out.ward);
  var legacyByWard = {
    // Phường Bảy Hiền (TP.HCM mới) thuộc khu vực Quận Tân Bình trong danh mục GHTK hiện hành.
    'phuong bay hien': { province: 'TP Hồ Chí Minh', district: 'Quận Tân Bình' }
  };
  var legacy = legacyByWard[wardKey];
  if (legacy) {
    if (!out.province) out.province = legacy.province;
    if (!out.district) out.district = legacy.district;
  }
  return out;
}
function _ghtkLocationKey(value) {
  return String(value || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
function ghtkSyncPickAddresses(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!settings.GHTK_TOKEN) throw new Error('Hãy nhập hoặc kết nối GHTK Token trước khi tải kho.');
  var addresses = _ghtkPickAddresses(settings);
  if (!addresses.length) throw new Error('Tài khoản GHTK chưa có kho lấy hàng nào. Hãy tạo kho trên cổng GHTK rồi tải lại.');
  var selectedId = String(settings.GHTK_PICK_ADDRESS_ID || '');
  var selected = addresses.filter(function(item) { return item.pick_address_id === selectedId; })[0];
  if (!selected) {
    if (selectedId) {
      return { addresses: addresses, selected_pick_address_id: '', selected_missing: true,
        message: 'Kho mặc định cũ không còn trong tài khoản. Hãy chọn một kho đang có rồi bấm Lưu cấu hình.' };
    }
    selected = addresses[0]; // Chỉ tự chọn kho trong lần thiết lập đầu tiên.
    _ghtkSavePickAddressDefaults(ss, {
      GHTK_PICK_ADDRESS_ID: selected.pick_address_id,
      GHTK_PICK_NAME: selected.pick_name,
      GHTK_PICK_TEL: selected.pick_tel
    });
    _bustSettingsCache();
    logActivity(ss, 'SECURITY', 'GHTK_PICK_ADDRESS_ID', 'GHTK_PICK_ADDRESS_AUTO_SELECTED', payload._callerUser || 'owner');
  }
  return { addresses: addresses, selected_pick_address_id: selected.pick_address_id };
}
function _ghtkPickAddressIdFromBranch(ss, branchId) {
  if (!branchId || typeof Repository === 'undefined' || !Repository.Branches) return '';
  try {
    var b = Repository.Branches.findById(String(branchId));
    if (!b) return '';
    var id = String(b.ghtk_pick_address_id || '').trim();
    if (!id) throw new Error('Chi nhánh "' + (b.name_vi || branchId) + '" chưa liên kết GHTK. Vào MOPS Admin > Chi nhánh > Sửa chi nhánh > nhập GHTK Pick Address ID rồi thử lại.');
    return id;
  } catch (e) { throw e; }
}
function _ghtkResolvePickAddress(settings, pickAddressId, suppliedPick) {
  var id = String(pickAddressId || '').trim();
  if (!id) id = String(settings.GHTK_PICK_ADDRESS_ID || '').trim();
  if (!id) return null;
  var addresses = _ghtkPickAddresses(settings);
  var found = addresses.filter(function(item) { return item.pick_address_id === id; })[0];
  if (!found) throw new Error('Kho GHTK ' + id + ' không còn tồn tại hoặc chưa được tải lại.');
  // FE có thể gửi lại metadata đang hiển thị trong dropdown. Chỉ nhận phần metadata khi ID
  // đã được đối chiếu với list_pick_add ở server, nên không thể dùng địa chỉ của kho khác.
  if (suppliedPick && String(suppliedPick.pick_address_id || suppliedPick.id || '') === id) {
    // Một số kho chính chủ GHTK trả thiếu quận/huyện. Cho phép staff bổ sung metadata cho
    // RIÊNG vận đơn sau khi server đã xác thực pick_address_id; không ghi vào Settings và
    // không thể trộn dữ liệu từ kho khác.
    found.pick_province = String(suppliedPick.pick_province || suppliedPick.province || found.pick_province || '');
    found.pick_district = String(suppliedPick.pick_district || suppliedPick.district || found.pick_district || '');
    found.pick_ward = String(suppliedPick.pick_ward || suppliedPick.ward || found.pick_ward || '');
    found.address = String(suppliedPick.address || suppliedPick.pick_address || found.address || '');
    var parsed = _ghtkLocationFromAddress(found.address);
    found.pick_province = found.pick_province || parsed.province;
    found.pick_district = found.pick_district || parsed.district;
    found.pick_ward = found.pick_ward || parsed.ward;
  }
  return found;
}
function _ghtkSavePickAddressDefaults(ss, updates) {
  var sh = ss.getSheetByName(SHEET.SETTINGS);
  if (!sh) throw new Error('Settings sheet not found');
  var lastRow = sh.getLastRow();
  var rows = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, 1).getValues() : [];
  var rowByKey = {};
  rows.forEach(function(row, index) { rowByKey[String(row[0]).trim()] = index + 2; });
  Object.keys(updates).forEach(function(key) {
    var value = String(updates[key] || '');
    if (rowByKey[key]) sh.getRange(rowByKey[key], 2).setNumberFormat('@').setValue(value);
    else { sh.appendRow([key, '']); sh.getRange(sh.getLastRow(), 2).setNumberFormat('@').setValue(value); }
  });
}

// GHTK tra cứu địa chỉ theo tên lõi, khác với master-data GHN có thể trả tiền tố hành chính
// như "Thành phố Hà Nội", "Quận Ba Đình", "Phường Điện Biên". Chỉ chuẩn hoá bản sao gửi sang
// GHTK; dữ liệu địa chỉ gốc trong ShippingAddresses vẫn giữ nguyên để GHN/Goship dùng.
function _ghtkAddressName(value, level) {
  var name = String(value || '').replace(/\s+/g, ' ').trim();
  if (!name) return '';
  if (level === 'province') {
    name = name.replace(/^Thành phố\s+/i, '').replace(/^Tỉnh\s+/i, '').replace(/^TP\.?\s*/i, '');
  } else if (level === 'district') {
    name = name.replace(/^(Quận|Huyện|Thị xã|Thành phố)\s+/i, '');
  } else if (level === 'ward') {
    name = name.replace(/^(Phường|Xã|Thị trấn)\s+/i, '');
  }
  return name.trim();
}
function _ghtkPickupLocation(settings, pick) {
  // Có kho ID (mặc định hoặc chọn riêng theo đơn): chỉ tin dữ liệu động của kho đó. Cấu hình
  // thủ công là tương thích ngược cho tài khoản/API không trả được danh sách kho, không bao giờ
  // được phép ghi đè vị trí của một kho đã chọn.
  if (pick) return {
    province: _ghtkAddressName(pick.pick_province, 'province'),
    district: _ghtkAddressName(pick.pick_district, 'district'),
    ward: _ghtkAddressName(pick.pick_ward, 'ward')
  };
  return {
    province: _ghtkAddressName(settings.GHTK_PICK_PROVINCE, 'province'),
    district: _ghtkAddressName(settings.GHTK_PICK_DISTRICT, 'district'),
    ward: _ghtkAddressName(settings.GHTK_PICK_WARD, 'ward')
  };
}
function ghtkCalcFee(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasGhtkConfig(settings)) throw new Error('Chưa cấu hình GHTK — MOPS Admin > Cấu hình');
  var toProvince, toDistrict, toWard, weight, codValue, declaredValue;
  var orderId = String(payload.order_id || '').trim();
  if (orderId) {
    var loc = _findOrderRow(ss, orderId);
    var parcel = _shipParcel(ss, orderId, settings, loc, payload); // cân thực (nếu đã cân/đang nhập) hoặc suy từ SP
    weight = parcel.weight; codValue = parcel.cod_amount;
    declaredValue = Number(loc.sheet.getRange(loc.row, 5).getValue()) || codValue || 0;
    var addr = _getShippingAddress(ss, String(loc.sheet.getRange(loc.row, 7).getValue() || ''));
    if (!addr) throw new Error('Đơn chưa có địa chỉ giao');
    toProvince = _ghtkAddressName(addr.province, 'province');
    toDistrict = _ghtkAddressName(addr.district, 'district');
    toWard = _ghtkAddressName(addr.ward, 'ward');
  } else {
    toProvince = _ghtkAddressName(payload.to_province, 'province');
    toDistrict = _ghtkAddressName(payload.to_district, 'district');
    toWard = _ghtkAddressName(payload.to_ward, 'ward');
    weight = parseInt(payload.weight, 10) || 0; codValue = parseInt(payload.cod_value, 10) || 0;
    declaredValue = parseInt(payload.value, 10) || codValue || 0;
  }
  if (!toProvince || !toDistrict) throw new Error('Thiếu Tỉnh/Quận người nhận (GHTK dùng tên)');
  var resolvedPickId = String(payload.pick_address_id || '').trim();
  if (!resolvedPickId && payload.pick_branch_id) resolvedPickId = _ghtkPickAddressIdFromBranch(ss, payload.pick_branch_id);
  var pick = _ghtkResolvePickAddress(settings, resolvedPickId, payload.pick_address);
  // Theo API GHTK, khi có ID kho thì chỉ gửi pick_address_id. Không trộn thêm tên tỉnh/quận
  // kho vì GHTK sẽ tự tra kho đã đăng ký; đây cũng loại bỏ lỗi tên kho không khớp danh mục.
  var params = [];
  if (pick) {
    params.push('pick_address_id=' + encodeURIComponent(pick.pick_address_id));
  }
  // Endpoint fee GHTK vẫn validate địa chỉ lấy hàng theo tên dù request có ID. Lấy cùng object
  // kho vừa gửi pick_address_id để không thể tính phí nhầm vị trí của kho mặc định/cấu hình cũ.
  var pickLocation = _ghtkPickupLocation(settings, pick);
  var pickProvince = pickLocation.province;
  var pickDistrict = pickLocation.district;
  if (!pickProvince || !pickDistrict) {
    throw new Error('GHTK chưa trả đủ Tỉnh/Huyện cho kho đã chọn. MOPS không dùng địa chỉ tĩnh của kho khác; hãy bấm “Tải kho từ GHTK” để làm mới metadata hoặc kiểm tra địa chỉ của chính kho này trên GHTK.');
  }
  params.push('pick_province=' + encodeURIComponent(pickProvince));
  params.push('pick_district=' + encodeURIComponent(pickDistrict));
  params.push('province=' + encodeURIComponent(toProvince));
  params.push('district=' + encodeURIComponent(toDistrict));
  params.push('weight=' + (weight > 0 ? Math.round(weight) : 200));
  params.push('value=' + (declaredValue || 0));
  params.push('transport=' + encodeURIComponent(String(settings.GHTK_TRANSPORT || 'road')));
  var q = '/services/shipment/fee?' + params.join('&');
  var res = _ghtkFetch(settings, q, 'get', null);
  return { fee: (res && res.fee && (res.fee.fee || res.fee.ship_fee_only)) || 0, detail: res && res.fee };
}
function ghtkCreateShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasGhtkConfig(settings)) throw new Error('Chưa cấu hình GHTK — MOPS Admin > Cấu hình');
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var pre = _shipPrepareCreate(ss, orderId, payload);
  var loc = pre.loc, sh = pre.sheet, row = pre.row;

  var addr = _getShippingAddress(ss, String(sh.getRange(row, 7).getValue() || ''));
  if (!addr || !addr.province || !addr.district) throw new Error('Đơn thiếu Tỉnh/Quận giao (GHTK dùng tên)');
  var items = _ghnOrderItems(ss, orderId);
  var parcel = _shipParcel(ss, orderId, settings, loc);
  var cod = parcel.cod_amount;
  // GHTK: products[].weight tính bằng KG (khác param fee dùng gram). Nếu đã cân thực cả kiện mà không
  // tách được theo món → dồn vào 1 dòng "Đơn <id>" cho khớp tổng khối lượng thật.
  var products = parcel.weighed ? [] : items.map(function (i) { return { name: i.name, weight: (i.weight > 0 ? i.weight : 200) / 1000, quantity: i.quantity }; });
  if (!products.length) products = [{ name: 'Đơn ' + orderId, weight: parcel.weight / 1000, quantity: 1 }];

  var resolvedPickId = String(payload.pick_address_id || '').trim();
  if (!resolvedPickId && payload.pick_branch_id) resolvedPickId = _ghtkPickAddressIdFromBranch(ss, payload.pick_branch_id);
  var pick = _ghtkResolvePickAddress(settings, resolvedPickId, payload.pick_address);
  var order = {
      id: orderId,
      tel: addr.phone, name: addr.receiver_name, address: addr.address,
      province: _ghtkAddressName(addr.province, 'province'),
      district: _ghtkAddressName(addr.district, 'district'),
      ward: _ghtkAddressName(addr.ward, 'ward'), hamlet: 'Khác',
      // is_freeship = '1' = shop trả ship (khách chỉ trả giá trị hàng qua COD); '0' = khách trả ship cộng vào COD.
      // Trước đây hardcode '1', giờ đọc setting GHTK_FREESHIP (2026-07-28) với default '1' để backward-compat.
      is_freeship: String(settings.GHTK_FREESHIP != null && settings.GHTK_FREESHIP !== '' ? settings.GHTK_FREESHIP : '1'),
      pick_money: cod || 0, value: Number(sh.getRange(row, 5).getValue()) || cod || 0, note: 'Đơn ' + orderId,
      transport: String(settings.GHTK_TRANSPORT || 'road'), pick_option: 'cod', deliver_option: 'none'
    };
  // Khi chọn kho GHTK, ID là nguồn sự thật duy nhất. Không gửi kèm pick_name/pick_address/
  // pick_province... vì một chuỗi cũ hoặc bị lặp có thể khiến GHTK validate sai chính kho này.
  if (pick) {
    order.pick_address_id = pick.pick_address_id;
    order.pick_name = pick.pick_name || settings.GHTK_PICK_NAME || settings.ACCOUNT_NAME || 'Shop';
    order.pick_tel = pick.pick_tel || settings.GHTK_PICK_TEL || '';
    order.pick_address = pick.address || '';
    order.pick_province = _ghtkAddressName(pick.pick_province, 'province');
    order.pick_district = _ghtkAddressName(pick.pick_district, 'district');
    order.pick_ward = _ghtkAddressName(pick.pick_ward, 'ward');
  } else {
    order.pick_name = settings.GHTK_PICK_NAME || settings.ACCOUNT_NAME || 'Shop';
    order.pick_address = settings.GHTK_PICK_ADDRESS;
    order.pick_province = settings.GHTK_PICK_PROVINCE;
    order.pick_district = settings.GHTK_PICK_DISTRICT;
    order.pick_ward = settings.GHTK_PICK_WARD || '';
    order.pick_tel = settings.GHTK_PICK_TEL || '';
  }
  var res = _ghtkFetch(settings, '/services/shipment/order', 'post', {
    products: products,
    order: order
  });
  // [VERIFY] mã vận đơn = order.label; phí = order.fee.
  var o = (res && res.order) || {};
  var tracking = String(o.label || '');
  var fee = Number(o.fee || o.total_fee) || 0;
  if (!tracking) throw new Error('GHTK không trả về label — kiểm tra cấu hình/địa chỉ: ' + JSON.stringify(res).substring(0, 200));

  _shipmentSet(ss, orderId, { carrier: 'GHTK', tracking_code: tracking, shipping_fee: fee,
                              service_id: String(settings.GHTK_TRANSPORT || 'road') }, loc);
  _setFulfillmentStatus(ss, orderId, 'ready_to_pick', payload._staffActor || 'staff', false);
  logActivity(ss, 'ORDER', orderId, 'GHTK_SHIPMENT_CREATED', payload._staffActor || 'staff');
  return { order_id: orderId, tracking_code: tracking, shipping_fee: fee };
}
function ghtkCancelShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var tracking = _shipmentGet(ss, orderId).tracking_code;
  if (!tracking) throw new Error('Đơn chưa có vận đơn GHTK để huỷ');
  _ghtkFetch(settings, '/services/shipment/cancel/' + encodeURIComponent(tracking), 'post', null);
  _shipmentUnpackReset(ss, orderId, payload._staffActor || 'staff', 'GHTK', tracking);
  logActivity(ss, 'ORDER', orderId, 'GHTK_SHIPMENT_UNPACKED|' + String(tracking || ''), payload._staffActor || 'staff');
  return { order_id: orderId, unpacked: true, tracking_code: '', carrier: '',
           shipping_fee: 0, package_weight: 0, package_dims: '', service_id: '',
           cod_amount: 0, fulfillment_status: 'pending_packing' };
}
// GHTK status = SỐ. Bảng mã đối chiếu tài liệu công khai GHTK (cập nhật 2026-07-28) — trước đây chỉ có
// 13 mã phổ biến, thêm các mã còn thiếu (7 lấy hàng thất bại, 8 lấy hàng 1 phần, 11 đã lấy, 13 chờ chuyển
// hoàn, 40-45 chuyển hoàn, 260 khách nhận hàng có nhắn). Trả 'unknown' cho mã lạ để _applyShippingStatus
// log rõ (thay vì null → im lặng bỏ qua như trước). GHTK có bổ sung mã theo thời gian → dùng dải rộng
// (40-49 = chuyển hoàn, 50-59 = đã hoàn tất) thay vì liệt kê từng số.
// 2026-08-29 — VIẾT LẠI theo bảng mã CHÍNH THỨC đã verify tại api.ghtk.vn/docs/submit-order/webhook/
// (fetch trực tiếp, không suy đoán). Sửa 3 lỗi có bằng chứng cụ thể so với bản cũ:
//   1. Mã 11 "Đã đối soát công nợ TRẢ HÀNG" bị xếp nhầm vào nhóm ready_to_pick (đang ở nhóm "chờ lấy
//      hàng") — đây là đối soát SAU KHI ĐÃ HOÀN, phải thuộc nhóm returned.
//   2. Tài liệu GHTK ghi RÕ 123/127/128/45/49/410 "chỉ mang tính chất thông báo thông tin, không phải
//      trạng thái của đơn hàng" (shipper tự báo qua app, GHTK chưa xác nhận chính thức) — bản cũ coi
//      123/127/45 là trạng thái CHÍNH THỨC và tự chuyển fulfillment_status theo đó, kể cả 49 (shipper
//      tự báo "không giao được") bị xếp vào returned — có thể hoàn kho (_reverseSaleMovements) trước
//      khi GHTK xác nhận chính thức. Bỏ toàn bộ 6 mã này khỏi bảng map — để rơi vào 'unknown', KHÔNG
//      đổi fulfillment_status (ghtkRefreshTracking đã tự chặn 'unknown' từ trước, xem dưới).
//   3. Dải "40-49" và mã 260 KHÔNG tồn tại trong tài liệu chính thức (260 hoàn toàn không xuất hiện) —
//      bỏ, không suy đoán tiếp.
// Mã 13 "Đơn hàng bồi hoàn" (compensation, có thể KHÔNG kèm hoàn hàng vật lý — GHTK bồi thường khi mất/
// hỏng) — CHUYỂN từ 'returned' sang 'delivery_cancelled' (nhóm "cần nhân viên xử lý tay", cùng cách
// Goship xử lý mã 917 "thất lạc") vì gộp thẳng vào 'returned' có thể kích hoạt hoàn kho sai khi hàng
// thực ra không quay về kho. Đây là lựa chọn thận trọng, không phải số liệu tài liệu xác nhận 100% —
// nếu vận hành thực tế cho thấy nên khác đi, sửa lại dòng này.
function _ghtkMapStatus(s) {
  var n = parseInt(s, 10);
  if (isNaN(n)) return null;
  if (n === -1) return 'cancelled';
  // Chờ lấy hàng: 1 chưa tiếp nhận, 2 đã tiếp nhận, 3 đã lấy hàng/đã nhập kho, 7 không lấy được hàng,
  // 8 hoãn lấy hàng, 12 đang lấy hàng.
  if (n === 1 || n === 2 || n === 3 || n === 7 || n === 8 || n === 12) return 'ready_to_pick';
  // Đang giao: 4 đã điều phối/đang giao hàng.
  if (n === 4) return 'delivering';
  // Đã giao: 5 đã giao chưa đối soát, 6 đã đối soát.
  if (n === 5 || n === 6) return 'delivered';
  // Chờ giao lại: 9 không giao được hàng, 10 delay giao hàng.
  if (n === 9 || n === 10) return 'redelivery';
  // Huỷ giao — cần nhân viên xử lý tay: 20 đang trả hàng, 13 đơn hàng bồi hoàn (xem ghi chú trên).
  if (n === 20 || n === 13) return 'delivery_cancelled';
  // Đã trả hàng về shop: 21 đã trả hàng, 11 đã đối soát công nợ trả hàng.
  if (n === 21 || n === 11) return 'returned';
  return 'unknown'; // Mã lạ hoặc mã "thông báo" (123/127/128/45/49/410) → không đổi trạng thái đơn.
}
// 2026-08-29: THÊM _shipmentHistoryLog ở CẢ 2 nhánh (kể cả nhánh "unknown"/mã thông báo) — trước đây
// nhánh unknown chỉ Logger.log (chỉ xem được trong Apps Script editor, staff không thấy trong UI), và
// nhánh thành công không ghi history dòng nào cả (cùng lỗ hổng như GHN).
function ghtkRefreshTracking(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var loc = _findOrderRow(ss, orderId);
  var shp = _shipmentGet(ss, orderId, loc);
  var tracking = shp.tracking_code;
  if (!tracking) throw new Error('Đơn chưa có vận đơn GHTK');
  var res = _ghtkFetch(settings, '/services/shipment/v2/' + encodeURIComponent(tracking), 'get', null);
  var st = (res && res.order && res.order.status) || '';
  var mapped = _ghtkMapStatus(st);
  if (mapped === 'unknown' || mapped === null) {
    Logger.log('GHTK unknown status for ' + orderId + ': ' + st + ' (raw: ' + JSON.stringify(res).substring(0, 200) + ')');
    _shipmentHistoryLog(ss, {
      order_id: orderId, tracking_code: tracking, carrier: shp.carrier,
      status_raw: String(st || ''), status_text: '', fulfillment_status: '',
      note: 'Mã trạng thái GHTK chưa map hoặc chỉ là thông báo nội bộ (shipper tự báo) — không đổi trạng thái đơn.',
      update_time: Math.floor(Date.now() / 1000), source: 'refresh'
    });
    return { order_id: orderId, ghtk_status: st, fulfillment_status: mapped, warning: 'Mã trạng thái GHTK chưa map — xem Logs' };
  }
  _applyShippingStatus(ss, orderId, mapped, payload._staffActor || 'system:ghtk-refresh', settings);
  // Ghi mốc thời gian tracking (2026-07-28) — chuẩn bị cho webhook guard "không lùi trạng thái" khi
  // future thêm handleGhtkWebhook. Cron polling cũng dùng để biết mỗi đơn được cập nhật lần cuối khi nào.
  _shipmentSet(ss, orderId, { last_tracked_at: Math.floor(Date.now() / 1000) }, loc);
  _shipmentHistoryLog(ss, {
    order_id: orderId, tracking_code: tracking, carrier: shp.carrier,
    status_raw: String(st || ''), status_text: '',
    fulfillment_status: mapped || '', note: '',
    update_time: Math.floor(Date.now() / 1000), source: 'refresh'
  });
  return { order_id: orderId, ghtk_status: st, fulfillment_status: mapped };
}
function testGhtkFee(orderId) { Logger.log(JSON.stringify(ghtkCalcFee({ order_id: orderId }))); return 'OK — xem Logs'; }
function testGhtkCreate(orderId) { Logger.log(JSON.stringify(ghtkCreateShipment({ order_id: orderId, _staffActor: 'test' }))); return 'OK — xem Logs'; }

// testGhtkReadiness — checklist 1 lệnh chạy trong Apps Script Editor để verify GHTK sẵn sàng dùng thật
// (2026-07-28). Theo pattern testGoshipReadiness. In PASS/FAIL cho: cấu hình đủ / connected / có đơn
// pending_packing / calc fee stub / status map coverage. KHÔNG tự bật Connected=true — user tự bấm sau.
function testGhtkReadiness(orderId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var checks = [];
  var pass = function(name) { checks.push('✅ ' + name); };
  var fail = function(name, reason) { checks.push('❌ ' + name + ' — ' + reason); };
  var warn = function(name, note) { checks.push('⚠️ ' + name + ' — ' + note); };

  // 1. Config completeness
  if (_hasGhtkConfig(settings)) pass('GHTK config đủ (TOKEN + kho API hoặc địa chỉ dự phòng)');
  else fail('GHTK config', 'thiếu GHTK_TOKEN hoặc kho lấy hàng (pick_address_id / địa chỉ dự phòng)');

  // 2. Optional pick_ward / pick_tel / pick_name
  if (!settings.GHTK_PICK_WARD) warn('GHTK_PICK_WARD trống', 'GHTK vẫn tạo được nhưng có thể sai địa chỉ lấy');
  if (!settings.GHTK_PICK_TEL) fail('GHTK_PICK_TEL', 'BẮT BUỘC — shipper cần SĐT để gọi');
  else pass('GHTK_PICK_TEL: ' + settings.GHTK_PICK_TEL);

  // 3. ENV
  var env = String(settings.GHTK_ENV || 'stg').toLowerCase();
  pass('GHTK_ENV = ' + env + (env === 'stg' ? ' (sandbox — test an toàn)' : ' (production — request thật)'));

  // 4. Transport
  var transport = String(settings.GHTK_TRANSPORT || 'road');
  if (['road', 'fly'].indexOf(transport) !== -1) pass('GHTK_TRANSPORT = ' + transport);
  else warn('GHTK_TRANSPORT = ' + transport, 'giá trị lạ, chỉ hỗ trợ road/fly');

  // 5. Freeship setting (2026-07-28 fix)
  var freeship = String(settings.GHTK_FREESHIP != null ? settings.GHTK_FREESHIP : '1');
  pass('GHTK_FREESHIP = ' + freeship + (freeship === '1' ? ' (shop trả ship, khách chỉ trả giá trị hàng)' : ' (khách trả ship cộng vào COD)'));

  // 6. Registry connected
  var carriers = Repository.ShippingCarriers.findAll();
  var ghtkRow = null;
  for (var i = 0; i < carriers.length; i++) if (carriers[i].carrier_code === 'GHTK') { ghtkRow = carriers[i]; break; }
  if (!ghtkRow) fail('ShippingCarriers registry', 'chưa seed GHTK — chạy setupSheet()');
  else if (!ghtkRow.connected) warn('GHTK connected = false', 'chưa bật trong tab Vận chuyển > Đối tác, adapter chạy được nhưng UI ẩn');
  else pass('GHTK connected = true');

  // 7. Order test
  if (orderId) {
    try {
      var loc = _findOrderRow(ss, orderId);
      var sh = loc.sheet, row = loc.row;
      var ff = String(sh.getRange(row, 29).getValue() || '');
      var addrId = String(sh.getRange(row, 7).getValue() || '');
      if (!addrId) fail('Đơn ' + orderId, 'không có ShippingAddressID (cột G)');
      else {
        var addr = _getShippingAddress(ss, addrId);
        if (!addr) fail('Đơn ' + orderId + ' addr', 'không đọc được ShippingAddress ' + addrId);
        else if (!addr.province || !addr.district) fail('Đơn ' + orderId + ' addr', 'thiếu Tỉnh/Quận (GHTK dùng tên)');
        else {
          pass('Đơn ' + orderId + ' addr: ' + addr.address + ', ' + (addr.ward || '(no ward)') + ', ' + addr.district + ', ' + addr.province);
          if (ff !== 'pending_packing') warn('Đơn ' + orderId + ' fulfillment', ff + ' — muốn tạo vận đơn phải ở pending_packing');
          else pass('Đơn ' + orderId + ' fulfillment = pending_packing (sẵn sàng tạo vận đơn)');
          // Test tính phí (không tạo vận đơn thật)
          try {
            var fee = ghtkCalcFee({ order_id: orderId });
            pass('ghtkCalcFee OK — phí dự kiến: ' + fee.fee + 'đ');
          } catch (feeErr) {
            fail('ghtkCalcFee', String(feeErr && feeErr.message || feeErr).substring(0, 200));
          }
        }
      }
    } catch (orderErr) {
      fail('Đơn ' + orderId, String(orderErr && orderErr.message || orderErr).substring(0, 200));
    }
  } else {
    warn('orderId không truyền', 'gọi testGhtkReadiness("<orderId>") để test đơn cụ thể');
  }

  // 8. Status map coverage
  var mapTest = [-1, 1, 4, 5, 20, 21, 999];
  var mapResults = mapTest.map(function(n) { return n + '→' + (_ghtkMapStatus(n) || '(null)'); });
  pass('_ghtkMapStatus samples: ' + mapResults.join(', '));

  var report = 'GHTK Readiness Check\n' + Array(60).join('=') + '\n' + checks.join('\n');
  Logger.log(report);
  return report;
}

// ============================================================
// VIETTEL POST CLIENT (đa đối tác — 2026-07-20). Địa chỉ theo ID RIÊNG của VTP (KHÁC ID GHN) → phải dò
//  tên→ID qua master-data VTP (`_vtpResolveDest`, so khớp tên chuẩn hoá — DỄ VỠ với dấu/cách viết →
//  [VERIFY] đậm). Auth: VTP_TOKEN (tĩnh từ portal) HOẶC login USERNAME/PASSWORD (cache 6h). Base:
//  prod=partner.viettelpost.vn/v2 · stg=partnerdev.viettelpost.vn/v2.
//  ⚠️ CHƯA VERIFY SANDBOX — nhiều field/endpoint theo docs v2 từ trí nhớ. VTP cập nhật trạng thái chủ
//  yếu qua WEBHOOK (refresh chủ động [VERIFY] có thể không có endpoint). Chạy tay testVtpToken() →
//  testVtpCreate(orderId). [VERIFY]: getPrice.MONEY_TOTAL, createOrder.ORDER_NUMBER, status codes.
// ============================================================
function _vtpBaseUrl(settings) {
  return (String(settings.VTP_ENV || 'stg').toLowerCase() === 'prod')
    ? 'https://partner.viettelpost.vn/v2'
    : 'https://partnerdev.viettelpost.vn/v2';
}
function _hasVtpConfig(settings) {
  var hasAuth = settings.VTP_TOKEN || (settings.VTP_USERNAME && settings.VTP_PASSWORD);
  return !!(hasAuth && settings.VTP_SENDER_PROVINCE && settings.VTP_SENDER_DISTRICT);
}
function _vtpFetch(settings, path, method, body, token) {
  var headers = {};
  if (token) headers['Token'] = String(token);
  var opts = { method: (method || 'get'), headers: headers, contentType: 'application/json', muteHttpExceptions: true };
  if (body) opts.payload = JSON.stringify(body);
  var resp = UrlFetchApp.fetch(_vtpBaseUrl(settings) + path, opts);
  var code = resp.getResponseCode(), txt = resp.getContentText();
  var json = null; try { json = JSON.parse(txt); } catch (e) {}
  if (code < 200 || code >= 300 || (json && json.error === true))
    throw new Error('VTP API ' + code + ': ' + ((json && json.message) || txt.substring(0, 250)));
  return json;
}
function _vtpToken(settings) {
  if (settings.VTP_TOKEN) return String(settings.VTP_TOKEN); // token tĩnh từ portal
  if (!settings.VTP_USERNAME || !settings.VTP_PASSWORD)
    throw new Error('Chưa cấu hình Viettel Post (Token hoặc Username+Password) — MOPS Admin > Cấu hình');
  var cache = CacheService.getScriptCache();
  var ckey = 'vtp_tok_' + String(settings.VTP_ENV || 'stg') + '_' + String(settings.VTP_USERNAME);
  var hit = cache.get(ckey);
  if (hit) return hit;
  var res = _vtpFetch(settings, '/user/Login', 'post', { USERNAME: settings.VTP_USERNAME, PASSWORD: settings.VTP_PASSWORD }, null);
  var token = (res && res.data && res.data.token) || '';
  if (!token) throw new Error('Viettel Post login thất bại: ' + JSON.stringify(res).substring(0, 200));
  try { cache.put(ckey, String(token), 21600); } catch (e) {}
  return String(token);
}
function _vtpNorm(s) {
  return String(s || '').toLowerCase()
    .replace(/^(tỉnh |thành phố |tp[. ]|quận |huyện |thị xã |phường |xã |thị trấn )/, '')
    .replace(/\s+/g, ' ').trim();
}
// Dò ID VTP của người nhận từ TÊN tỉnh/quận/xã (ShippingAddresses lưu tên GHN, không có ID VTP).
// [VERIFY] endpoint listProvinceById/listDistrict/listWards + field PROVINCE_ID/NAME... + độ chính xác match.
function _vtpResolveDest(settings, token, addr) {
  function pick(list, idField, nameField, target) {
    var t = _vtpNorm(target);
    for (var i = 0; i < list.length; i++) { if (_vtpNorm(list[i][nameField]) === t) return list[i][idField]; }
    for (var j = 0; j < list.length; j++) {
      var n = _vtpNorm(list[j][nameField]);
      if (n && (n.indexOf(t) !== -1 || t.indexOf(n) !== -1)) return list[j][idField];
    }
    return null;
  }
  var prov = _vtpFetch(settings, '/categories/listProvinceById?provinceId=-1', 'get', null, token);
  var pid = pick((prov && prov.data) || [], 'PROVINCE_ID', 'PROVINCE_NAME', addr.province);
  if (!pid) throw new Error('VTP: không khớp Tỉnh "' + addr.province + '"');
  var dist = _vtpFetch(settings, '/categories/listDistrict?provinceId=' + pid, 'get', null, token);
  var did = pick((dist && dist.data) || [], 'DISTRICT_ID', 'DISTRICT_NAME', addr.district);
  if (!did) throw new Error('VTP: không khớp Quận/Huyện "' + addr.district + '"');
  var wid = null;
  if (addr.ward) {
    var ward = _vtpFetch(settings, '/categories/listWards?districtId=' + did, 'get', null, token);
    wid = pick((ward && ward.data) || [], 'WARDS_ID', 'WARDS_NAME', addr.ward);
  }
  return { provinceId: pid, districtId: did, wardId: wid };
}
function vtpCalcFee(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasVtpConfig(settings)) throw new Error('Chưa cấu hình Viettel Post — MOPS Admin > Cấu hình');
  var token = _vtpToken(settings);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('vtpCalcFee: cần order_id (VTP tính theo ID địa giới người nhận)');
  var loc = _findOrderRow(ss, orderId);
  var parcel = _shipParcel(ss, orderId, settings, loc, payload);
  var cod = parcel.cod_amount;
  var addr = _getShippingAddress(ss, String(loc.sheet.getRange(loc.row, 7).getValue() || ''));
  if (!addr) throw new Error('Đơn chưa có địa chỉ giao');
  var dest = _vtpResolveDest(settings, token, addr);
  var res = _vtpFetch(settings, '/order/getPrice', 'post', {
    PRODUCT_WEIGHT: parcel.weight, PRODUCT_PRICE: cod || 0, MONEY_COLLECTION: cod || 0,
    ORDER_SERVICE_ADD: '', ORDER_SERVICE: String(settings.VTP_SERVICE_CODE || 'VCN'),
    SENDER_PROVINCE: parseInt(settings.VTP_SENDER_PROVINCE, 10), SENDER_DISTRICT: parseInt(settings.VTP_SENDER_DISTRICT, 10),
    RECEIVER_PROVINCE: dest.provinceId, RECEIVER_DISTRICT: dest.districtId,
    PRODUCT_TYPE: 'HH', NATIONAL_TYPE: 1
  }, token);
  var d = (res && res.data) || {};
  return { fee: Number(d.MONEY_TOTAL || d.GIA_CUOC || 0), detail: d };
}
function vtpCreateShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasVtpConfig(settings)) throw new Error('Chưa cấu hình Viettel Post — MOPS Admin > Cấu hình');
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var pre = _shipPrepareCreate(ss, orderId, payload);
  var loc = pre.loc, sh = pre.sheet, row = pre.row;

  var token = _vtpToken(settings);
  var addr = _getShippingAddress(ss, String(sh.getRange(row, 7).getValue() || ''));
  if (!addr) throw new Error('Đơn chưa có địa chỉ giao');
  var dest = _vtpResolveDest(settings, token, addr);
  var items = _ghnOrderItems(ss, orderId);
  var parcel = _shipParcel(ss, orderId, settings, loc);
  var weight = parcel.weight;
  var qty = items.reduce(function (s, i) { return s + i.quantity; }, 0) || 1;
  var cod = parcel.cod_amount;
  var listItem = items.map(function (i) {
    return { PRODUCT_NAME: i.name, PRODUCT_PRICE: 0, PRODUCT_WEIGHT: (i.weight > 0 ? i.weight : 200), PRODUCT_QUANTITY: i.quantity };
  });
  // [VERIFY] tập field createOrder v2 + ORDER_PAYMENT (3 = người gửi trả cước, thu hộ tiền hàng).
  var res = _vtpFetch(settings, '/order/createOrder', 'post', {
    ORDER_NUMBER: orderId,
    SENDER_FULLNAME: settings.VTP_SENDER_NAME || settings.ACCOUNT_NAME || 'Shop',
    SENDER_ADDRESS: settings.VTP_SENDER_ADDRESS || '', SENDER_PHONE: settings.VTP_SENDER_PHONE || '',
    SENDER_WARD: parseInt(settings.VTP_SENDER_WARD, 10) || 0,
    SENDER_DISTRICT: parseInt(settings.VTP_SENDER_DISTRICT, 10), SENDER_PROVINCE: parseInt(settings.VTP_SENDER_PROVINCE, 10),
    RECEIVER_FULLNAME: addr.receiver_name, RECEIVER_ADDRESS: addr.address, RECEIVER_PHONE: addr.phone,
    RECEIVER_WARD: dest.wardId || 0, RECEIVER_DISTRICT: dest.districtId, RECEIVER_PROVINCE: dest.provinceId,
    PRODUCT_NAME: (items[0] && items[0].name) || ('Đơn ' + orderId), PRODUCT_DESCRIPTION: 'Đơn ' + orderId,
    PRODUCT_QUANTITY: qty, PRODUCT_PRICE: cod || 0, PRODUCT_WEIGHT: weight, PRODUCT_TYPE: 'HH',
    ORDER_PAYMENT: 3, ORDER_SERVICE: String(settings.VTP_SERVICE_CODE || 'VCN'), ORDER_SERVICE_ADD: '',
    ORDER_VOUCHER: '', ORDER_NOTE: 'Đơn ' + orderId, MONEY_COLLECTION: cod || 0,
    MONEY_TOTALFEE: 0, MONEY_FEECOD: 0, MONEY_TOTAL: 0, LIST_ITEM: listItem
  }, token);
  var d = (res && res.data) || {};
  var tracking = String(d.ORDER_NUMBER || '');
  var fee = Number(d.MONEY_TOTAL || d.MONEY_TOTALFEE || 0);
  if (!tracking) throw new Error('VTP không trả về ORDER_NUMBER — kiểm tra cấu hình/địa chỉ: ' + JSON.stringify(res).substring(0, 200));

  _shipmentSet(ss, orderId, { carrier: 'VIETTELPOST', tracking_code: tracking, shipping_fee: fee,
                              service_id: String(settings.VTP_SERVICE_CODE || 'VCN') }, loc);
  _setFulfillmentStatus(ss, orderId, 'ready_to_pick', payload._staffActor || 'staff', false);
  logActivity(ss, 'ORDER', orderId, 'VTP_SHIPMENT_CREATED', payload._staffActor || 'staff');
  return { order_id: orderId, tracking_code: tracking, shipping_fee: fee };
}
function vtpCancelShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var tracking = _shipmentGet(ss, orderId).tracking_code;
  if (!tracking) throw new Error('Đơn chưa có vận đơn Viettel Post để huỷ');
  var token = _vtpToken(settings);
  // [VERIFY] updateOrder TYPE: 4 = Huỷ (theo docs v2).
  _vtpFetch(settings, '/order/updateOrder', 'post', { TYPE: 4, ORDER_NUMBER: tracking, NOTE: String(payload.comment || 'Huỷ đóng gói từ MOPS') }, token);
  _shipmentUnpackReset(ss, orderId, payload._staffActor || 'staff', 'VIETTELPOST', tracking);
  logActivity(ss, 'ORDER', orderId, 'VTP_SHIPMENT_UNPACKED|' + String(tracking || ''), payload._staffActor || 'staff');
  return { order_id: orderId, unpacked: true, tracking_code: '', carrier: '',
           shipping_fee: 0, package_weight: 0, package_dims: '', service_id: '',
           cod_amount: 0, fulfillment_status: 'pending_packing' };
}
// VTP ORDER_STATUS = SỐ. [VERIFY] danh sách mã đầy đủ (đây là nhóm phổ biến 100/200/500...).
function _vtpMapStatus(s) {
  var n = parseInt(s, 10);
  if ([100, 102, 103, 104].indexOf(n) !== -1) return 'ready_to_pick';
  if ([200, 201, 202, 300, 301].indexOf(n) !== -1) return 'delivering';
  if ([500, 501].indexOf(n) !== -1) return 'delivered';
  if ([505, 506, 507].indexOf(n) !== -1) return 'redelivery';
  if ([508, 509].indexOf(n) !== -1) return 'delivery_cancelled';
  if ([515, 516].indexOf(n) !== -1) return 'returned';
  if (n < 0 || [107].indexOf(n) !== -1) return 'cancelled';
  return null;
}
// ⚠️ VTP chủ yếu đẩy trạng thái qua WEBHOOK. Endpoint poll trạng thái [VERIFY] — có thể không tồn tại;
// nếu vậy cần handler webhook riêng (giống handleGhnWebhook). Hàm này best-effort, lỗi không chặn cron.
// 2026-08-29: THÊM _shipmentHistoryLog (cùng lỗ hổng như GHN/GHTK/Ahamove). LƯU Ý: _vtpMapStatus
// CHƯA verify được với tài liệu chính thức VTP (không tìm thấy nguồn công khai đáng tin — xem [VERIFY]
// tại _vtpMapStatus) — KHÔNG sửa bảng mã, chỉ thêm phần ghi log đang thiếu.
function vtpRefreshTracking(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var shp = _shipmentGet(ss, orderId);
  var tracking = shp.tracking_code;
  if (!tracking) throw new Error('Đơn chưa có vận đơn Viettel Post');
  var token = _vtpToken(settings);
  var res = _vtpFetch(settings, '/order/getOrderStatus', 'post', { ORDER_NUMBER: tracking }, token); // [VERIFY] endpoint
  var d = (res && res.data) || {};
  var st = d.ORDER_STATUS != null ? d.ORDER_STATUS : (Array.isArray(d) && d.length ? d[d.length - 1].ORDER_STATUS : '');
  var mapped = _vtpMapStatus(st);
  _applyShippingStatus(ss, orderId, mapped, payload._staffActor || 'system:vtp-refresh', settings);
  _shipmentHistoryLog(ss, {
    order_id: orderId, tracking_code: tracking, carrier: shp.carrier,
    status_raw: String(st == null ? '' : st), status_text: '',
    fulfillment_status: mapped || '', note: '',
    update_time: Math.floor(Date.now() / 1000), source: 'refresh'
  });
  return { order_id: orderId, vtp_status: st, fulfillment_status: mapped };
}
function testVtpToken() {
  var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  var t = _vtpToken(settings);
  Logger.log('VTP token OK (' + t.length + ' ký tự): ' + t.substring(0, 24) + '…');
  return 'OK — xem Logs';
}
function testVtpCreate(orderId) { Logger.log(JSON.stringify(vtpCreateShipment({ order_id: orderId, _staffActor: 'test' }))); return 'OK — xem Logs'; }

// ============================================================
// GOSHIP CLIENT (adapter #6 — 2026-07-27) — AGGREGATOR: 1 kết nối → nhiều hãng (GHN/GHTK/SPX/VTP/
//  J&T/Best/Ninja…). KHÁC BẢN CHẤT 4 adapter trên: Goship không phải "1 hãng" mà là cổng gom hãng →
//  `carrier` của MOPS = 'GOSHIP', hãng thật nằm trong `Orders.ShippingServiceId` (lưu 'goship:<rate>')
//  và tên hãng thật ghi kèm vào Carrier ('GOSHIP · Giao Hàng Nhanh (v3)') để báo cáo/đối soát đọc được.
//
//  Luồng 2 BƯỚC (khác mọi hãng trực tiếp): POST /rates → danh sách chào giá nhiều hãng (mỗi rate có
//  id + phí + ETA + % giao thành công) → nhân viên chọn 1 rate → POST /shipments với `rate` đó.
//  Nếu FE không gửi rate → tự chọn theo GOSHIP_AUTO_PICK ('cheapest' mặc định | 'best_success').
//
//  Địa chỉ: MÃ RIÊNG của Goship (city '100000' / district '100300' / ward '37' — KHÁC ID GHN và VTP)
//  → `_goshipResolveDest` dò TÊN → mã qua master-data, cache 6h (CacheService). Rates chỉ cần city+district.
//  Auth: Bearer. GOSHIP_TOKEN tĩnh (login trả token sống ~10 năm) HOẶC username+password+client_id+
//  client_secret → /login (cache 6h).  Base: stg=sandbox.goship.io/api/v2 · prod=api.goship.io/api/v2.
//  Trạng thái: 900–1000 (bộ mã CHUNG cho mọi hãng — hết cảnh mỗi hãng một bảng mã).
//
//  ⚠️ CHƯA VERIFY SANDBOX. Đã đối chiếu doc.goship.io (rates/shipments/cities/webhooks/invoices) nên
//  shape sát thật hơn GHTK/VTP, nhưng vẫn PHẢI chạy tay trước production:
//  testGoshipToken() → testGoshipCities() → testGoshipRates(orderId) → testGoshipCreate(orderId).
// ============================================================
function _goshipBaseUrl(settings) {
  return (String(settings.GOSHIP_ENV || 'stg').toLowerCase() === 'prod')
    ? 'https://api.goship.io/api/v2'
    : 'https://sandbox.goship.io/api/v2';
}
function _hasGoshipConfig(settings) {
  var hasAuth = settings.GOSHIP_TOKEN ||
    (settings.GOSHIP_USERNAME && settings.GOSHIP_PASSWORD && settings.GOSHIP_CLIENT_ID && settings.GOSHIP_CLIENT_SECRET);
  return !!(hasAuth && settings.GOSHIP_FROM_CITY && settings.GOSHIP_FROM_DISTRICT);
}
function _goshipToken(settings) {
  if (settings.GOSHIP_TOKEN) return String(settings.GOSHIP_TOKEN); // token tĩnh (sống ~10 năm) — khuyến nghị
  if (!settings.GOSHIP_USERNAME || !settings.GOSHIP_PASSWORD || !settings.GOSHIP_CLIENT_ID || !settings.GOSHIP_CLIENT_SECRET)
    throw new Error('Chưa cấu hình Goship (Token, hoặc Username+Password+Client ID+Client Secret) — MOPS Admin > Cấu hình');
  var cache = CacheService.getScriptCache();
  var ckey  = 'gsp_tok_' + String(settings.GOSHIP_ENV || 'stg') + '_' + String(settings.GOSHIP_USERNAME);
  var hit = cache.get(ckey);
  if (hit) return hit;
  var res = _goshipFetch(settings, '/login', 'post', {
    username: String(settings.GOSHIP_USERNAME), password: String(settings.GOSHIP_PASSWORD),
    client_id: String(settings.GOSHIP_CLIENT_ID), client_secret: String(settings.GOSHIP_CLIENT_SECRET)
  }, true);
  var token = (res && (res.access_token || (res.data && res.data.access_token))) || '';
  if (!token) throw new Error('Goship login thất bại: ' + JSON.stringify(res).substring(0, 200));
  try { cache.put(ckey, String(token), 21600); } catch (e) {}
  return String(token);
}
// ── Guard rate limit (Goship: 300 request/phút) ────────────────────────────────────────────────
// Đếm request theo TỪNG PHÚT trong CacheService. Chạm ngưỡng an toàn (240 — chừa biên vì CacheService
// không nguyên tử, 2 lần thực thi song song có thể cùng đọc 1 giá trị) → throw lỗi tiếng Việt ngay tại
// MOPS thay vì để Goship trả 429 giữa lúc nhân viên đang đóng gói. Cửa sổ phút là đủ: quota của Goship
// tính theo phút, không cần sliding window chính xác.
var GOSHIP_RATE_MAX_PER_MIN = 240;
function _goshipRateGuard() {
  var cache = CacheService.getScriptCache();
  // Không dùng Date.now() làm dữ liệu nghiệp vụ — chỉ làm khoá cửa sổ phút, sai lệch vài giây vô hại.
  var key = 'gsp_rl_' + Math.floor(new Date().getTime() / 60000);
  var n = parseInt(cache.get(key), 10) || 0;
  if (n >= GOSHIP_RATE_MAX_PER_MIN) {
    throw new Error('Đã gọi Goship quá ' + GOSHIP_RATE_MAX_PER_MIN + ' lần trong 1 phút (giới hạn Goship là 300). '
      + 'Chờ khoảng 1 phút rồi thử lại — nếu lặp lại liên tục thì có tác vụ nào đang gọi vòng lặp, báo dev.');
  }
  try { cache.put(key, String(n + 1), 120); } catch (e) {}
}
// skipAuth=true chỉ dùng cho chính /login (tránh đệ quy token).
function _goshipFetch(settings, path, method, body, skipAuth) {
  _goshipRateGuard();
  var headers = { 'Accept': 'application/json' };
  if (!skipAuth) headers['Authorization'] = 'Bearer ' + _goshipToken(settings);
  var opts = { method: (method || 'get'), headers: headers, contentType: 'application/json', muteHttpExceptions: true };
  if (body) opts.payload = JSON.stringify(body);
  var url = _goshipBaseUrl(settings) + path;
  var resp = UrlFetchApp.fetch(url, opts);
  var code = resp.getResponseCode();
  // 429 = Goship chặn dù đã guard (vd nhiều thiết bị/cron cùng lúc) → nghỉ 2s thử LẠI ĐÚNG 1 LẦN.
  // Không retry nhiều lần: các endpoint ghi (/shipments) không idempotent, retry mù dễ tạo 2 vận đơn.
  if (code === 429) {
    Utilities.sleep(2000);
    _goshipRateGuard();
    resp = UrlFetchApp.fetch(url, opts);
    code = resp.getResponseCode();
  }
  var txt = resp.getContentText();
  var json = null; try { json = JSON.parse(txt); } catch (e) {}
  if (code < 200 || code >= 300) {
    // Error extraction — Goship trả body dạng khác nhau tuỳ endpoint:
    //   1) {message: "…"}
    //   2) {error: "…"} hoặc {error_message: "…"}
    //   3) {data: {errors: {field: [msg,...]}}}     — validation shape
    //   4) {errors: {field: [msg,...]}}              — root-level validation
    //   5) plain text 'Unprocessable Entity'         — 422 với body không JSON
    // Trước 2026-08-16 chỉ bắt (1)+(2)+(3) → 422 fallback về `txt.substring` nhưng txt = 'Unprocessable Entity' plain,
    // staff không biết cụ thể vì sao. Giờ bắt thêm (4) + json.data.message + json.data.error để log rõ hơn.
    var msg = '';
    if (json) {
      if (json.message) msg = json.message;
      else if (json.error) msg = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
      else if (json.error_message) msg = json.error_message;
      else if (json.data && json.data.message) msg = json.data.message;
      else if (json.data && json.data.error) msg = typeof json.data.error === 'string' ? json.data.error : JSON.stringify(json.data.error);
      else if (json.data && json.data.errors) msg = JSON.stringify(json.data.errors);
      else if (json.errors) msg = JSON.stringify(json.errors);
    }
    if (!msg) msg = (txt || '').substring(0, 250) || 'không có nội dung phản hồi';
    if (code === 429) msg = 'Goship tạm chặn do gọi quá nhiều (429). Chờ 1 phút rồi thử lại. ' + msg;
    if (code === 401) msg = 'Goship từ chối xác thực (401) — kiểm Access Token / Client ID+Secret ở Cấu hình > Vận chuyển Goship. ' + msg;
    throw new Error('Goship API ' + code + ': ' + msg);
  }
  return json;
}
// Master data Goship (city/district/ward) — TĨNH → cache 6h để không bắn 3 request mỗi lần tạo vận đơn.
function _goshipMaster(settings, path, ckey) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(ckey);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var res  = _goshipFetch(settings, path, 'get', null);
  var list = (res && (res.data || res)) || [];
  if (!Array.isArray(list)) list = [];
  try { cache.put(ckey, JSON.stringify(list), 21600); } catch (e) {} // >100KB thì bỏ cache, không sao
  return list;
}
function goshipCities()                { return { provinces: _goshipMaster(getSettings(SpreadsheetApp.getActiveSpreadsheet()), '/cities', 'gsp_cities') }; }
function goshipDistricts(cityCode)     { return { districts: _goshipMaster(getSettings(SpreadsheetApp.getActiveSpreadsheet()), '/cities/' + encodeURIComponent(cityCode) + '/districts', 'gsp_dist_' + cityCode) }; }
function goshipWards(districtCode)     { return { wards: _goshipMaster(getSettings(SpreadsheetApp.getActiveSpreadsheet()), '/districts/' + encodeURIComponent(districtCode) + '/wards', 'gsp_ward_' + districtCode) }; }

// Dò mã Goship của người nhận từ TÊN tỉnh/quận/xã (ShippingAddresses lưu tên + mã GHN, không có mã
// Goship). Dùng _vtpNorm để bỏ tiền tố "Tỉnh/TP/Quận/Huyện/Phường/Xã" trước khi so khớp.
// ⚠️ Ward là điểm dễ vỡ nhất (trùng tên trong 1 quận) → thiếu ward vẫn tạo được vận đơn ở nhiều hãng,
// nên ward = null thì bỏ trống chứ KHÔNG chặn.
function _goshipPick(list, target) {
  var t = _vtpNorm(target);
  if (!t) return null;
  for (var i = 0; i < list.length; i++) { if (_vtpNorm(list[i].name) === t) return String(list[i].id); }
  for (var j = 0; j < list.length; j++) {
    var n = _vtpNorm(list[j].name);
    if (n && (n.indexOf(t) !== -1 || t.indexOf(n) !== -1)) return String(list[j].id);
  }
  return null;
}
function _goshipResolveDest(settings, addr) {
  if (!addr) throw new Error('Đơn chưa có địa chỉ giao');
  var cityCode = _goshipPick(_goshipMaster(settings, '/cities', 'gsp_cities'), addr.province);
  if (!cityCode) throw new Error('Goship: không khớp Tỉnh/Thành "' + (addr.province || '(trống)') + '"');
  var distCode = _goshipPick(_goshipMaster(settings, '/cities/' + cityCode + '/districts', 'gsp_dist_' + cityCode), addr.district);
  if (!distCode) throw new Error('Goship: không khớp Quận/Huyện "' + (addr.district || '(trống)') + '"');
  var wardCode = null;
  if (addr.ward) {
    try { wardCode = _goshipPick(_goshipMaster(settings, '/districts/' + distCode + '/wards', 'gsp_ward_' + distCode), addr.ward); } catch (e) {}
  }
  return { city: cityCode, district: distCode, ward: wardCode };
}
// V6.5 2026-08-05 Multi-warehouse Dynamic Origin cho Goship. SSOT = Branches sheet
// (docs `docs/backend-multiwarehouse-stub.md` + mops_03 Repository.Branches). Nếu Branch có
// goship_from_city + goship_from_district → build address_from raw (name/phone/street/city/
// district/ward) từ branch → nhúng vào request /rates + /shipments. Goship KHÔNG yêu cầu
// đăng ký kho trên dashboard → mọi kho quản lý ở MOPS Admin > Chi nhánh.
// Fallback: SETTINGS.GOSHIP_FROM_* (account-level default) — backward compat cho đơn chưa
// gán branch_id, hoặc branch chưa migrate config Goship.
// Trả { name, phone, street, city, district, ward, _source } — _source để log "branch:X" vs "settings".
function _goshipResolveFromBranch(ss, branchId, settings) {
  var b = null;
  if (branchId && typeof Repository !== 'undefined' && Repository.Branches) {
    try { b = Repository.Branches.findById(String(branchId)); } catch (e) { b = null; }
  }
  var hasBranchGoship = b && b.goship_from_city && b.goship_from_district;
  if (hasBranchGoship) {
    return {
      name: String(b.pick_receiver_name || b.name_vi || settings.GOSHIP_FROM_NAME || 'Shop'),
      phone: String(b.pick_phone || settings.GOSHIP_FROM_PHONE || ''),
      street: String(b.pick_address || settings.GOSHIP_FROM_STREET || ''),
      city: String(b.goship_from_city),
      district: String(b.goship_from_district),
      ward: String(b.goship_from_ward || ''),
      _source: 'branch:' + b.branch_id
    };
  }
  // Fallback SETTINGS — dùng _goshipResolveFrom() sẵn để resolve name→code nếu SETTINGS lưu tên.
  var from = _goshipResolveFrom(settings);
  return {
    name: String(settings.GOSHIP_FROM_NAME || settings.ACCOUNT_NAME || 'Shop'),
    phone: String(settings.GOSHIP_FROM_PHONE || settings.GHTK_PICK_TEL || ''),
    street: String(settings.GOSHIP_FROM_STREET || settings.GOSHIP_FROM_ADDRESS || ''),
    city: from.city,
    district: from.district,
    ward: from.ward,
    _source: 'settings'
  };
}
// Kho lấy hàng: admin nhập MÃ Goship (khuyến nghị — lấy bằng testGoshipCities) hoặc TÊN (tự dò).
function _goshipResolveFrom(settings) {
  var city = String(settings.GOSHIP_FROM_CITY || '').trim();
  var dist = String(settings.GOSHIP_FROM_DISTRICT || '').trim();
  var ward = String(settings.GOSHIP_FROM_WARD || '').trim();
  if (!/^\d+$/.test(city)) {
    var c = _goshipPick(_goshipMaster(settings, '/cities', 'gsp_cities'), city);
    if (!c) throw new Error('Goship: không khớp Tỉnh/Thành kho lấy hàng "' + city + '"');
    city = c;
  }
  if (!/^\d+$/.test(dist)) {
    var d = _goshipPick(_goshipMaster(settings, '/cities/' + city + '/districts', 'gsp_dist_' + city), dist);
    if (!d) throw new Error('Goship: không khớp Quận/Huyện kho lấy hàng "' + dist + '"');
    dist = d;
  }
  if (ward && !/^\d+$/.test(ward)) {
    try { ward = _goshipPick(_goshipMaster(settings, '/districts/' + dist + '/wards', 'gsp_ward_' + dist), ward) || ''; } catch (e) { ward = ''; }
  }
  return { city: city, district: dist, ward: ward };
}
function _goshipDims(settings) {
  var d = _ghnDims(settings); // dùng lại kích thước kiện mặc định đã cấu hình cho GHN
  return {
    length: parseInt(settings.GOSHIP_DEFAULT_LENGTH, 10) || d.length,
    width:  parseInt(settings.GOSHIP_DEFAULT_WIDTH, 10)  || d.width,
    height: parseInt(settings.GOSHIP_DEFAULT_HEIGHT, 10) || d.height
  };
}
// Chuẩn hoá 1 rate về shape gọn cho FE (giữ nguyên `raw` để debug/verify shape thật).
function _goshipNormRate(r) {
  var rep = r.report || {};
  return {
    rate_id: String(r.id || r.rate || ''),
    carrier_name: String(r.carrier_name || r.carrier || ''),
    carrier_short_name: String(r.carrier_short_name || ''),
    carrier_logo: String(r.carrier_logo || ''),
    service: String(r.service || r.service_name || ''),
    expected: String(r.expected || ''),
    total_fee: Number(r.total_fee || r.total_amount || 0),
    cod_fee: Number(r.cod_fee || 0),
    weight_fee: Number(r.weight_fee || 0),
    insurance_fee: Number(r.insurance_fee || 0),
    success_percent: Number(rep.success_percent || 0),
    avg_time_delivery: String(rep.avg_time_delivery || ''),
    raw: r
  };
}
// Chào giá đa hãng. Theo order_id (tự lấy weight/COD/địa chỉ) hoặc tham số thô (preview lúc nhập đơn).
function goshipRates(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasGoshipConfig(settings)) throw new Error('Chưa cấu hình Goship — MOPS Admin > Cấu hình > Vận chuyển Goship');
  // V6.5: address_from theo pick_branch_id (dynamic origin, SSOT ở Branches sheet). Fallback SETTINGS
  // nếu branch chưa cấu hình Goship (backward compat + đơn không gán branch_id).
  var branchId = String(payload.pick_branch_id || '').trim();
  if (!branchId && payload.order_id) {
    // Fallback: đọc branch_id từ đơn (Orders.AA = BranchID, col 27) — không phải để override user pick,
    // mà để đảm bảo backward compat cho case FE cũ chưa gửi pick_branch_id lên.
    try {
      var loc0 = _findOrderRow(ss, String(payload.order_id).trim());
      branchId = String(loc0.sheet.getRange(loc0.row, 27).getValue() || '').trim();
    } catch (e) { /* skip */ }
  }
  var from = _goshipResolveFromBranch(ss, branchId, settings);
  var dims = _goshipDims(settings);
  var weight, codValue, amount, dest;
  var orderId = String(payload.order_id || '').trim();
  if (orderId) {
    var loc    = _findOrderRow(ss, orderId);
    var parcel = _shipParcel(ss, orderId, settings, loc, payload); // cân thực nếu đã cân / đang nhập ở modal
    weight     = parcel.weight; codValue = parcel.cod_amount;
    dims       = { length: parcel.length, width: parcel.width, height: parcel.height };
    amount     = Number(loc.sheet.getRange(loc.row, 5).getValue()) || codValue || 0; // E Amount = giá trị khai hàng
    var addr   = _getShippingAddress(ss, String(loc.sheet.getRange(loc.row, 7).getValue() || ''));
    dest       = _goshipResolveDest(settings, addr);
  } else {
    weight   = parseInt(payload.weight, 10) || 0;
    codValue = parseInt(payload.cod_value, 10) || 0;
    amount   = parseInt(payload.amount, 10) || codValue || 0;
    if (payload.to_city && payload.to_district) dest = { city: String(payload.to_city), district: String(payload.to_district), ward: payload.to_ward ? String(payload.to_ward) : null };
    else dest = _goshipResolveDest(settings, { province: payload.to_province, district: payload.to_district_name, ward: payload.to_ward_name });
  }
  var body = {
    shipment: {
      address_from: { district: from.district, city: from.city },
      address_to:   { district: dest.district, city: dest.city },
      parcel: { cod: codValue || 0, amount: amount || 0, weight: (weight > 0 ? weight : 200),
                width: dims.width, height: dims.height, length: dims.length }
    }
  };
  // Cache 60s theo ĐÚNG tham số tuyến+kiện: nhân viên bấm "Lấy chào giá" lại, đổi qua đổi lại lựa chọn,
  // hay mở lại modal → không tạo request mới. Đổi cân/kích thước/COD → khoá đổi → chào giá lại thật.
  // 60s đủ ngắn để không dùng giá cũ khi Goship điều chỉnh, đủ dài để chặn bấm liên tục.
  var cache = CacheService.getScriptCache();
  var ckey = 'gsp_rates_' + [from.city, from.district, dest.city, dest.district, dest.ward || '',
                             body.shipment.parcel.weight, dims.length, dims.width, dims.height,
                             codValue || 0, amount || 0].join('_');
  var rates = null;
  var hit = cache.get(ckey);
  if (hit) { try { rates = JSON.parse(hit); } catch (e) { rates = null; } }
  if (!rates) {
    var res = _goshipFetch(settings, '/rates', 'post', body);
    var list = (res && (res.data || res)) || [];
    if (!Array.isArray(list)) list = [];
    rates = list.map(_goshipNormRate).filter(function(r) { return r.rate_id; });
    if (!rates.length) throw new Error('Goship không trả chào giá nào cho tuyến này — kiểm tra mã địa chỉ/khối lượng.');
    // `raw` chỉ để debug, bỏ khi cache cho gọn (CacheService giới hạn 100KB/khoá).
    try { cache.put(ckey, JSON.stringify(rates.map(function(r) { var c = {}; for (var k in r) if (k !== 'raw') c[k] = r[k]; return c; })), 60); } catch (e) {}
  }
  return { rates: rates, dest: dest, from: from, dims: dims,
           weight: (weight > 0 ? weight : 200), cod_value: codValue || 0, amount: amount || 0 };
}
// Chọn tự động khi nhân viên không chỉ định rate: rẻ nhất (mặc định) hoặc tỉ lệ giao thành công cao nhất.
function _goshipAutoPick(rates, settings) {
  var mode = String((settings && settings.GOSHIP_AUTO_PICK) || 'cheapest').toLowerCase();
  var sorted = rates.slice();
  if (mode === 'best_success') {
    sorted.sort(function(a, b) { return (b.success_percent - a.success_percent) || (a.total_fee - b.total_fee); });
  } else {
    sorted.sort(function(a, b) { return (a.total_fee - b.total_fee) || (b.success_percent - a.success_percent); });
  }
  return sorted[0];
}
// Dispatcher gọi hàm này cho `calc_shipping_fee` — trả phí của phương án auto-pick + CẢ danh sách rates
// để FE dựng bảng so sánh hãng (giá trị cốt lõi của aggregator).
function goshipCalcFee(payload) {
  var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  var q = goshipRates(payload);
  var picked = _goshipAutoPick(q.rates, settings);
  return { fee: picked ? picked.total_fee : 0, rate_id: picked ? picked.rate_id : '',
           carrier_name: picked ? picked.carrier_name : '', rates: q.rates };
}
function goshipCreateShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  if (!_hasGoshipConfig(settings)) throw new Error('Chưa cấu hình Goship — MOPS Admin > Cấu hình');
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var pre = _shipPrepareCreate(ss, orderId, payload);
  var loc = pre.loc, sh = pre.sheet, row = pre.row;

  // Chào giá lại để lấy dest/weight/cod chuẩn. Rate FE gửi lên chỉ dùng nếu còn trong danh sách hiện tại
  // (rate Goship có hạn) — nếu hết hiệu lực thì rơi về auto-pick thay vì fail giữa quy trình đóng gói.
  // V6.5: forward pick_branch_id để goshipRates dùng đúng address_from theo branch.
  var q = goshipRates({ order_id: orderId, pick_branch_id: payload.pick_branch_id });
  var wantRate = String(payload.rate || payload.rate_id || '').trim();
  var picked = null;
  if (wantRate) {
    picked = q.rates.filter(function(r) { return r.rate_id === wantRate; })[0] || null;
  }
  if (!picked) picked = _goshipAutoPick(q.rates, settings);
  if (!picked) throw new Error('Không chọn được gói vận chuyển Goship');

  var addr = _getShippingAddress(ss, String(sh.getRange(row, 7).getValue() || ''));
  var res = _goshipFetch(settings, '/shipments', 'post', {
    shipment: {
      rate: picked.rate_id,
      payer: parseInt(settings.GOSHIP_PAYER, 10) === 0 ? 0 : 1, // 1 = shop trả cước (mặc định: đơn MOPS trả trước)
      order_id: orderId,
      is_recall: 0,
      address_from: {
        // V6.5: q.from giờ có full name/phone/street từ branch (SSOT) hoặc fallback SETTINGS.
        name:  String(q.from.name || settings.GOSHIP_FROM_NAME || settings.ACCOUNT_NAME || 'Shop'),
        phone: String(q.from.phone || settings.GOSHIP_FROM_PHONE || settings.GHTK_PICK_TEL || ''),
        street: String(q.from.street || settings.GOSHIP_FROM_STREET || settings.GOSHIP_FROM_ADDRESS || ''),
        ward: q.from.ward || '', district: q.from.district, city: q.from.city
      },
      address_to: {
        name:  String(addr.receiver_name || ''), phone: String(addr.phone || ''),
        street: String(addr.address || ''),
        ward: q.dest.ward || '', district: q.dest.district, city: q.dest.city
      },
      parcel: {
        cod: q.cod_value || 0, amount: q.amount || 0, weight: String(q.weight),
        // Kích thước lấy từ CÙNG bộ đã dùng để chào giá (đã tính cả số đo thực lúc đóng gói) — không đọc
        // lại mặc định, tránh cảnh phí chào theo kiện A mà tạo vận đơn theo kiện B.
        width: String(q.dims.width), height: String(q.dims.height), length: String(q.dims.length),
        metadata: String(payload.note || ('Đơn ' + orderId))
      }
    }
  });
  // Goship đôi khi để tracking_number/id/carrier ở TOP-LEVEL và trả data=[] rỗng
  // (case v3 tracking chưa attach). Nếu data là object có nội dung thì đọc data,
  // ngược lại (mảng rỗng, null, undefined) → đọc thẳng res.
  var _d = res && res.data;
  var d = (_d && typeof _d === 'object' && !Array.isArray(_d)) ? _d : (res || {});
  // Mã theo dõi: ưu tiên mã HÃNG (tracking_number) vì đó là mã khách tra được; fallback mã Goship (id).
  var tracking = String(d.tracking_number || d.id || '');
  var gcode    = String(d.id || '');
  var fee      = Number(d.fee || picked.total_fee) || 0;
  if (!tracking) throw new Error('Goship không trả mã vận đơn: ' + JSON.stringify(res).substring(0, 200));

  var carrierLabel = 'GOSHIP' + (d.carrier || picked.carrier_name ? ' · ' + String(d.carrier || picked.carrier_name) : '');
  // Link tem in vận đơn — Goship trả field khác tuỳ hãng con (label / label_url / sticker /
  // print_url). Bắt cả 4 tên; ưu tiên `label_url` (chuẩn API v2). Append `?size=a6` để in đúng
  // khổ 100×150 mà không cần call thêm endpoint. Nếu URL đã có `?size=` (Goship tự set), giữ
  // nguyên — kiểm tra bằng regex thay vì .includes để chạy được trong V8 legacy.
  var rawLabel = String(d.label_url || d.label || d.sticker || d.print_url || '').trim();
  var labelA6 = _goshipEnsureA6(rawLabel);
  _shipmentSet(ss, orderId, {
    carrier: carrierLabel,                                  // 'GOSHIP · <hãng thật>' (dispatch đọc tiền tố)
    tracking_code: tracking, shipping_fee: fee,
    service_id: 'goship:' + gcode + '|' + picked.rate_id,    // khoá tra cứu/huỷ phía Goship
    label_url: labelA6                                       // cache tem A6 để in nhanh (2026-08-11)
  }, loc);
  _setFulfillmentStatus(ss, orderId, 'ready_to_pick', payload._staffActor || 'staff', false);
  logActivity(ss, 'ORDER', orderId, 'GOSHIP_SHIPMENT_CREATED', payload._staffActor || 'staff');
  return { order_id: orderId, tracking_code: tracking, goship_code: gcode, shipping_fee: fee,
           carrier: String(d.carrier || picked.carrier_name || ''), rate_id: picked.rate_id,
           label_url: labelA6 };
}
// Append `?size=a6` (hoặc `&size=a6`) vào URL tem in để in đúng khổ 100×150mm. Nếu URL đã có
// query `size=…`, KHÔNG ép — Goship cho phép override qua param và giữ giá trị caller đưa.
function _goshipEnsureA6(url) {
  if (!url) return '';
  if (/[?&]size=/i.test(url)) return url;
  return url + (url.indexOf('?') === -1 ? '?size=a6' : '&size=a6');
}
// Public — FE gọi để lấy URL tem in Goship khổ A6 cho một đơn. Ưu tiên cache từ Orders.AO;
// nếu rỗng thì hỏi lại Goship qua endpoint search (data.label). Đơn KHÔNG phải Goship trả lỗi
// rõ để FE fallback sang template HTML tự dựng.
function getShipmentLabel(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var shp = _shipmentGet(ss, orderId);
  var carrier = String(shp.carrier || '');
  var isGoship = carrier.indexOf('GOSHIP') === 0;
  if (!isGoship) {
    return { success: false, order_id: orderId, label_url: '', carrier: carrier,
             reason: 'Đơn không dùng Goship — tem in A6 chỉ hỗ trợ vận đơn Goship. Dùng template HTML tự dựng ở FE.' };
  }
  // Cache hit — trả ngay, không đụng API (tránh 429 khi in nhiều đơn liền).
  if (shp.label_url) {
    return { success: true, order_id: orderId, label_url: shp.label_url, carrier: carrier, source: 'cache' };
  }
  // Cache miss (vận đơn tạo trước 2026-08-11, hoặc goshipCreateShipment không bắt được field).
  // Hỏi lại Goship qua endpoint search — reuse code cũ dùng cho refreshTracking.
  var settings = getSettings(ss);
  if (!_hasGoshipConfig(settings)) throw new Error('Chưa cấu hình Goship — MOPS Admin > Cấu hình');
  var code = _goshipCodeOfOrder(ss, orderId);
  if (!code) throw new Error('Đơn chưa có vận đơn Goship (thiếu mã tra cứu).');
  var res = _goshipFetch(settings, '/shipments/search?code=' + encodeURIComponent(code), 'get', null);
  var d = (res && res.data) || res || {};
  if (Array.isArray(d)) d = d[0] || {};
  var rawLabel = String(d.label_url || d.label || d.sticker || d.print_url || '').trim();
  if (!rawLabel) {
    return { success: false, order_id: orderId, label_url: '', carrier: carrier,
             reason: 'Goship không trả label URL cho vận đơn ' + code + ' — dùng template HTML tự dựng.' };
  }
  var labelA6 = _goshipEnsureA6(rawLabel);
  // Cache lại vào Orders.AO để lần sau in không phải call API.
  try { _shipmentSet(ss, orderId, { label_url: labelA6 }, shp._loc); } catch (e) { /* best-effort */ }
  return { success: true, order_id: orderId, label_url: labelA6, carrier: carrier, source: 'refetch' };
}
// Mã Goship của đơn (cột AH 'goship:<gcode>|<rate>'); fallback TrackingCode nếu chưa có.
function _goshipCodeOfOrder(ss, orderId) {
  var shp = _shipmentGet(ss, orderId);
  var m = String(shp.service_id || '').match(/^goship:([^|]+)/);
  return (m && m[1]) ? m[1] : shp.tracking_code;
}
function goshipCancelShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var code = _goshipCodeOfOrder(ss, orderId);
  if (!code) throw new Error('Đơn chưa có vận đơn Goship để huỷ');

  // Pre-check Goship status (2026-08-16 — fix 422 Unprocessable Entity): Goship API `DELETE /shipments/{code}`
  // trả 422 khi shipment ở trạng thái không cancel được (đã lấy hàng ≥ 903), hoặc đã cancel trước đó (914).
  // Trước đây error message của Goship rất mờ ('Unprocessable Entity') — staff không biết vì sao. Giờ:
  //   (a) hỏi status TRƯỚC qua /shipments/search — nếu ≥ 903 và chưa 914 thì throw error nghiệp vụ rõ ràng;
  //   (b) nếu status = 914 (đã cancel bên Goship) → không gọi DELETE nữa, chuyển thẳng sang unpack (idempotent);
  //   (c) nếu DELETE vẫn 422 sau pre-check (race điều kiện), catch parse message chi tiết hơn.
  var statusCode = null, statusText = '';
  try {
    var lookRes = _goshipFetch(settings, '/shipments/search?code=' + encodeURIComponent(code), 'get', null);
    var lookData = (lookRes && lookRes.data) || lookRes || {};
    if (Array.isArray(lookData)) lookData = lookData[0] || {};
    statusCode = parseInt(lookData.status_code != null ? lookData.status_code : lookData.shipment_status, 10);
    statusText = String(lookData.status_text || lookData.shipment_status_txt || '');
  } catch (lookErr) { /* soft fail — vẫn để DELETE thử */ }

  if (statusCode === 914) {
    // Đã cancel bên Goship — không gọi DELETE nữa, chỉ unpack MOPS state để đồng bộ.
    _shipmentUnpackReset(ss, orderId, payload._staffActor || 'staff', 'GOSHIP', code);
    logActivity(ss, 'ORDER', orderId, 'GOSHIP_SHIPMENT_UNPACKED|' + String(code || '') + '|idempotent', payload._staffActor || 'staff');
    return { order_id: orderId, unpacked: true, tracking_code: '', carrier: '',
             shipping_fee: 0, package_weight: 0, package_dims: '', service_id: '',
             cod_amount: 0, fulfillment_status: 'pending_packing',
             note: 'Đơn đã được huỷ bên Goship từ trước — MOPS chỉ đồng bộ trạng thái.' };
  }
  if (statusCode !== null && statusCode >= 903) {
    // 903+ = đã lấy hàng / đang giao / đã giao / hoàn — Goship không cho cancel nữa.
    throw new Error('Không thể huỷ đóng gói: ĐVVC đã lấy hàng (trạng thái Goship ' + statusCode + (statusText ? ' · ' + statusText : '') + '). Liên hệ ĐVVC nếu cần thu hồi.');
  }

  try {
    _goshipFetch(settings, '/shipments/' + encodeURIComponent(code), 'delete', null);
  } catch (delErr) {
    // Nếu Goship trả 422 với pattern "already cancelled" → treat idempotent, tiếp tục unpack.
    var em = String(delErr && delErr.message || '');
    if (/already.*cancel|đã huỷ|already.*canceled/i.test(em)) {
      _shipmentUnpackReset(ss, orderId, payload._staffActor || 'staff', 'GOSHIP', code);
      logActivity(ss, 'ORDER', orderId, 'GOSHIP_SHIPMENT_UNPACKED|' + String(code || '') + '|idempotent', payload._staffActor || 'staff');
      return { order_id: orderId, unpacked: true, tracking_code: '', carrier: '',
               shipping_fee: 0, package_weight: 0, package_dims: '', service_id: '',
               cod_amount: 0, fulfillment_status: 'pending_packing',
               note: 'Goship báo đơn đã huỷ trước đó — MOPS chỉ đồng bộ trạng thái.' };
    }
    throw delErr;
  }
  _shipmentUnpackReset(ss, orderId, payload._staffActor || 'staff', 'GOSHIP', code);
  logActivity(ss, 'ORDER', orderId, 'GOSHIP_SHIPMENT_UNPACKED|' + String(code || ''), payload._staffActor || 'staff');
  return { order_id: orderId, unpacked: true, tracking_code: '', carrier: '',
           shipping_fee: 0, package_weight: 0, package_dims: '', service_id: '',
           cod_amount: 0, fulfillment_status: 'pending_packing' };
}
// Bộ mã trạng thái CHUNG của Goship (900–1000) → FulfillmentStatus MOPS. Đây là lợi thế lớn nhất so với
// 4 adapter trực tiếp: 1 bảng mã cho mọi hãng. 909–913 (đối soát/COD/hoàn thành) coi như đã giao xong.
function _goshipMapStatus(s) {
  var n = parseInt(s, 10);
  if (n === 900) return 'pending_packing';
  if (n === 901 || n === 902 || n === 915) return 'ready_to_pick';
  if (n === 903 || n === 904 || n === 918 || n === 919) return 'delivering';
  if (n === 905 || n === 909 || n === 910 || n === 911 || n === 912 || n === 913 || n === 916) return 'delivered';
  if (n === 906) return 'redelivery';
  if (n === 907) return 'delivery_cancelled';
  if (n === 908) return 'returned';
  if (n === 914) return 'cancelled';
  if (n === 917) return 'delivery_cancelled'; // thất lạc — chốt tay, không tự về 'returned'
  return null;
}
function goshipRefreshTracking(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var code = _goshipCodeOfOrder(ss, orderId);
  if (!code) throw new Error('Đơn chưa có vận đơn Goship');
  var res = _goshipFetch(settings, '/shipments/search?code=' + encodeURIComponent(code), 'get', null);
  var d = (res && res.data) || res || {};
  if (Array.isArray(d)) d = d[0] || {};
  var st = d.status_code != null ? d.status_code : (d.shipment_status != null ? d.shipment_status : '');
  var mapped = _goshipMapStatus(st);
  _applyShippingStatus(ss, orderId, mapped, payload._staffActor || 'system:goship-refresh', settings);
  var shpAfter = _shipmentGet(ss, orderId);
  _shipmentHistoryLog(ss, {
    order_id: orderId, tracking_code: shpAfter.tracking_code, carrier: shpAfter.carrier,
    status_raw: String(st || ''), status_text: String(d.status_text || d.shipment_status_txt || ''),
    fulfillment_status: mapped || '', note: '',
    update_time: Math.floor(Date.now() / 1000), source: 'refresh'
  });
  return { order_id: orderId, goship_status: st, status_text: String(d.status_text || d.shipment_status_txt || ''), fulfillment_status: mapped };
}
// Webhook Goship — payload {gcode, code, status, status_text, cod, fee, tracking_url, update_time}.
//
// ⚠️ KHÔNG verify được HMAC `x-goship-hmac-sha256`: GAS Web App KHÔNG cho đọc header request (`doPost(e)`
// chỉ có parameter/postData/queryString/pathInfo). Đây là giới hạn nền tảng, không phải thiếu sót code.
// Thay bằng 4 lớp — xem docs/architecture/shipping-goship-plan.md §P2:
//   (1) KHOÁ TRONG URL: endpoint khai với Goship là `…/exec?wh=<khoá>`; đọc qua `e.parameter.wh`. Đây là
//       thứ gần nhất với HMAC mà GAS làm được. Chưa cấu hình khoá → vẫn chạy (tương thích ngược) nhưng
//       getSettingsStatus báo chưa đặt để admin thấy.
//   (2) MÃ PHẢI KHỚP vận đơn đã tồn tại trong Orders — payload lạ bị bỏ qua.
//   (3) CHỈ tin field `status`. KHÔNG bao giờ ghi tiền (cod/fee) từ webhook — tiền chỉ chốt qua đối soát.
//   (4) CHỐNG LÙI TRẠNG THÁI: bỏ qua payload có `update_time` cũ hơn mốc đã nhận (Goship retry sau 3',
//       tới 3 lần → webhook đến sai thứ tự là chuyện bình thường, mà _applyShippingStatus dùng force=true
//       nên nếu không chặn ở đây thì `delivered` bị kéo về `delivering`).
// LUÔN trả success (HTTP 200) — Goship retry 3 lần rồi bỏ; trả lỗi chỉ làm mất cập nhật, không được lợi gì.
function handleGoshipWebhook(payload, params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  // R4 (2026-08-21) · Nâng verify webhook lên timing-safe compare + idempotency 48h.
  // (1) Khoá trong URL — timing-safe compare (mops_shared.js:_timingSafeEqual) chống leak byte-đầu-khác.
  var wantKey = String(settings.GOSHIP_WEBHOOK_KEY || '').trim();
  if (wantKey) {
    var gotKey = String((params && (params.wh || params.key)) || '').trim();
    if (!_timingSafeEqual(gotKey, wantKey)) {
      try { logActivity(ss, 'SECURITY', 'GOSHIP_WEBHOOK', 'WEBHOOK_BAD_KEY', 'system:goship-webhook'); } catch (e) {}
      return { success: true, ignored: 'bad webhook key' };
    }
  }
  // (1b) Idempotency 48h — chặn replay ngay cả khi attacker lấy được URL + key.
  // Key = gcode|code + update_time — Goship retry chính đáng có cùng payload, block thứ 2 vô hại.
  var _gcodeKey = String(payload.gcode || payload.code || '').trim();
  var _upd = parseInt(payload.update_time, 10) || 0;
  if (_gcodeKey && _upd) {
    var _whId = 'GOSHIP_' + _gcodeKey + '_' + _upd;
    var _propsWH = PropertiesService.getScriptProperties();
    if (_propsWH.getProperty('WH_' + _whId)) {
      return { success: true, replayed: true, webhook_id: _whId };
    }
    // Ghi ngay để chặn race — nếu handler bên dưới fail cũng không sao (retry Goship next time).
    _propsWH.setProperty('WH_' + _whId, String(Date.now()));
  }
  var gcode = String(payload.gcode || '').trim();
  var ccode = String(payload.code || '').trim();
  if (!gcode && !ccode) return { success: true, ignored: 'no gcode/code' };
  var sh = ss.getSheetByName(SHEET.ORDERS);
  if (!sh || sh.getLastRow() < 2) return { success: true, ignored: 'no orders' };
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 34).getValues();
  var orderId = '';
  for (var i = 0; i < data.length; i++) {
    var tracking = String(data[i][30] || ''); // AE TrackingCode
    var svc      = String(data[i][33] || ''); // AH ShippingServiceId ('goship:<gcode>|<rate>')
    if ((ccode && tracking === ccode) || (gcode && (tracking === gcode || svc.indexOf('goship:' + gcode) === 0))) {
      orderId = String(data[i][0]); break;
    }
  }
  if (!orderId) return { success: true, ignored: 'unknown goship code ' + (gcode || ccode) };

  // (4) Chống lùi trạng thái do webhook đến sai thứ tự / retry muộn.
  // `update_time` = unix giây (GMT+7 theo docs Goship, nhưng so sánh tương đối nên lệch múi giờ vô hại).
  var upd = parseInt(payload.update_time, 10) || 0;
  var shp = _shipmentGet(ss, orderId);
  if (upd && shp.last_tracked_at && upd < shp.last_tracked_at) {
    return { success: true, ignored: 'stale webhook', order_id: orderId,
             update_time: upd, last_tracked_at: shp.last_tracked_at };
  }

  var mapped = _goshipMapStatus(payload.status);
  var res = _applyShippingStatus(ss, orderId, mapped, 'system:goship-webhook', settings);
  // Ghi mốc SAU khi áp trạng thái: áp lỗi thì mốc không nhích → webhook sau vẫn được xử lý lại.
  if (upd) { try { _shipmentSet(ss, orderId, { last_tracked_at: upd }, shp._loc); } catch (e) {} }
  // Append timeline entry (2026-08-13) — full history cho tab "Quản lý vận đơn". Idempotent theo
  // (order_id, status_raw, update_time) 60s window nên retry Goship không nhân đôi.
  _shipmentHistoryLog(ss, {
    order_id: orderId, tracking_code: shp.tracking_code, carrier: shp.carrier,
    status_raw: String(payload.status || ''), status_text: String(payload.status_text || ''),
    fulfillment_status: mapped || '', note: '', update_time: upd, source: 'webhook'
  });
  return { success: true, order_id: orderId, goship_status: payload.status,
           status_text: String(payload.status_text || ''), fulfillment_status: mapped,
           applied: !(res && res.unchanged) };
}
// ── Đối soát COD qua Goship (thay việc gõ tay file Excel của từng hãng — xem shipping.md §4) ──
// GET /invoices → các kỳ đối soát; GET /invoices/{code}/shipments → từng vận đơn có COD trong kỳ.
function goshipInvoices(params) {
  var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  var q = '/invoices';
  if (params && (params.from || params.to)) {
    q = '/invoices/search?from=' + encodeURIComponent(params.from || '') + '&to=' + encodeURIComponent(params.to || '');
  } else if (params && params.code) {
    q = '/invoices/search?code=' + encodeURIComponent(params.code);
  }
  var res = _goshipFetch(settings, q, 'get', null);
  var list = (res && (res.data || res)) || [];
  return { invoices: Array.isArray(list) ? list : [list] };
}
function goshipInvoiceShipments(params) {
  var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  var code = String((params && params.code) || '').trim();
  if (!code) throw new Error('code (mã kỳ đối soát Goship) là bắt buộc');
  var res = _goshipFetch(settings, '/invoices/' + encodeURIComponent(code) + '/shipments', 'get', null);
  var list = (res && (res.data || res)) || [];
  return { shipments: Array.isArray(list) ? list : [list] };
}
// Nạp số liệu ĐỐI TÁC (COD/phí thực) từ 1 kỳ Goship vào phiếu đối soát MOPS đang mở → hết phải nhập tay.
// Chỉ ghi CODPartner/FeePartner/OtherFee của các dòng KHỚP mã vận đơn; dòng không khớp giữ nguyên để
// kế toán thấy chênh lệch (đúng nguyên tắc §4.3: diff ≠ 0 thì chặn xác nhận).
function goshipImportInvoice(payload) {
  var reconId = String(payload.recon_id || '').trim();
  var code    = String(payload.invoice_code || '').trim();
  if (!reconId) throw new Error('recon_id là bắt buộc');
  if (!code)    throw new Error('invoice_code (mã kỳ đối soát Goship) là bắt buộc');
  var rows = goshipInvoiceShipments({ code: code }).shipments || [];
  var byCode = {};
  rows.forEach(function(r) {
    var k1 = String(r.tracking_number || r.code || ''), k2 = String(r.id || r.gcode || '');
    var v = { cod: Number(r.cod || r.cod_amount || 0),
              fee: Number(r.fee || r.total_fee || r.delivery_fee || 0),
              other: Number(r.return_fee || r.other_fee || 0) };
    if (k1) byCode[k1] = v;
    if (k2) byCode[k2] = v;
  });
  var items = Repository.ReconciliationItems.findByRecon(reconId);
  var updated = 0, missed = [];
  items.forEach(function(it) {
    var v = byCode[String(it.tracking_code)];
    if (!v) { missed.push(it.tracking_code); return; }
    updateReconciliationItem({ recon_id: reconId, item_id: it.item_id, tracking_code: it.tracking_code,
      cod_partner: v.cod, fee_partner: v.fee, other_fee: v.other,
      _staffActor: payload._staffActor || 'system:goship-import' });
    updated++;
  });
  return { recon_id: reconId, invoice_code: code, updated: updated, not_found: missed, partner_rows: rows.length };
}

// ── Kiểm tra tay trong Apps Script Editor (BẮT BUỘC trước khi bật production) ──
function testGoshipToken() {
  var t = _goshipToken(getSettings(SpreadsheetApp.getActiveSpreadsheet()));
  Logger.log('Goship token OK (' + t.length + ' ký tự): ' + t.substring(0, 24) + '…');
  return 'OK — xem Logs';
}
// In danh sách Tỉnh/Thành + Quận của tỉnh đầu tiên → lấy MÃ điền GOSHIP_FROM_CITY/DISTRICT.
function testGoshipCities() {
  var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  var cities = _goshipMaster(settings, '/cities', 'gsp_cities');
  Logger.log('Cities (' + cities.length + '): ' + JSON.stringify(cities.slice(0, 10)));
  if (cities.length) {
    var c0 = String(cities[0].id);
    Logger.log('Districts của ' + cities[0].name + ': ' + JSON.stringify(_goshipMaster(settings, '/cities/' + c0 + '/districts', 'gsp_dist_' + c0).slice(0, 10)));
  }
  return 'OK — xem Logs';
}
function testGoshipRates(orderId)  { Logger.log(JSON.stringify(goshipRates({ order_id: orderId }))); return 'OK — xem Logs'; }
function testGoshipCreate(orderId) { Logger.log(JSON.stringify(goshipCreateShipment({ order_id: orderId, _staffActor: 'test' }))); return 'OK — xem Logs'; }
function testGoshipRefresh(orderId){ Logger.log(JSON.stringify(goshipRefreshTracking({ order_id: orderId, _staffActor: 'test' }))); return 'OK — xem Logs'; }
function testGoshipCancel(orderId) { Logger.log(JSON.stringify(goshipCancelShipment({ order_id: orderId, _staffActor: 'test' }))); return 'OK — xem Logs'; }
function testGoshipInvoices()      { Logger.log(JSON.stringify(goshipInvoices({}))); return 'OK — xem Logs'; }

// ── GIẢ LẬP WEBHOOK (BẮT BUỘC — sandbox Goship KHÔNG bắn webhook thật, chỉ cho giả lập) ──────────
// Nếu không có hàm này thì cả nhánh webhook + bảng map 21 mã trạng thái + side-effect (hoàn kho khi
// `returned`, log COD chờ đối soát khi `delivered`) đều KHÔNG có cách nào kiểm trước production.
// Dựng payload đúng shape Goship, lấy gcode THẬT của đơn → gọi handleGoshipWebhook như Goship gọi.
//   testGoshipWebhook('MOPS-000123', 904)               → giả lập "Đang giao"
//   testGoshipWebhook('MOPS-000123', 904, 1700000000)   → chỉ định update_time (test chống lùi trạng thái)
function testGoshipWebhook(orderId, status, updateTime) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var shp = _shipmentGet(ss, orderId);
  var gcode = _goshipCodeOfOrder(ss, orderId);
  if (!gcode) { Logger.log('Đơn ' + orderId + ' chưa có vận đơn Goship — chạy testGoshipCreate trước.'); return 'THIẾU VẬN ĐƠN'; }
  var payload = {
    gcode: gcode, code: shp.tracking_code, order_id: orderId,
    status: status, status_text: _goshipStatusText(status),
    cod: 999999999, fee: 999999999, // số RÁC có chủ ý: nếu số này lọt vào sổ nghĩa là lớp (3) bị hỏng
    tracking_url: 'https://sandbox.goship.io/tracking/' + gcode,
    update_time: updateTime || Math.floor(new Date().getTime() / 1000)
  };
  // Truyền đúng khoá webhook đang cấu hình → mô phỏng request HỢP LỆ.
  var res = handleGoshipWebhook(payload, { wh: String(settings.GOSHIP_WEBHOOK_KEY || '') });
  Logger.log('payload: ' + JSON.stringify(payload));
  Logger.log('kết quả: ' + JSON.stringify(res));
  var after = _shipmentGet(ss, orderId);
  var ffNow = String(after._loc.sheet.getRange(after._loc.row, FULFILLMENT_COL).getValue() || '');
  Logger.log('FulfillmentStatus sau xử lý: ' + ffNow + ' · LastTrackedAt: ' + after.last_tracked_at);
  Logger.log('KIỂM: ShippingFee=' + after.shipping_fee + ' COD=' + after.cod_amount
    + ' → nếu thấy 999999999 thì LỖI NGHIÊM TRỌNG (webhook đã ghi tiền, phải sửa ngay).');
  return 'OK — xem Logs';
}
// Kiểm khoá webhook có chặn không: gọi với khoá sai, KHÔNG được đổi trạng thái.
function testGoshipWebhookBadKey(orderId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var gcode = _goshipCodeOfOrder(ss, orderId);
  var res = handleGoshipWebhook({ gcode: gcode, status: 905, update_time: Math.floor(new Date().getTime() / 1000) },
                                { wh: 'khoa-sai-hoan-toan' });
  Logger.log(JSON.stringify(res));
  Logger.log(res && res.ignored === 'bad webhook key'
    ? 'PASS — khoá sai bị chặn.'
    : 'CHÚ Ý — chưa đặt GOSHIP_WEBHOOK_KEY nên webhook đang mở cho bất kỳ ai biết URL. Đặt khoá ở Cấu hình > Vận chuyển Goship.');
  return 'OK — xem Logs';
}
function _goshipStatusText(s) {
  var m = { 900: 'Đơn mới', 901: 'Chờ lấy hàng', 902: 'Lấy hàng', 903: 'Đã lấy hàng', 904: 'Giao hàng',
            905: 'Giao thành công', 906: 'Giao thất bại', 907: 'Đang chuyển hoàn', 908: 'Chuyển hoàn',
            909: 'Đã đối soát', 910: 'Đã đối soát khách', 911: 'Đã trả COD cho khách', 912: 'Chờ thanh toán COD',
            913: 'Hoàn thành', 914: 'Đơn hủy', 915: 'Chậm lấy/giao', 916: 'Giao hàng một phần',
            917: 'Thất lạc hàng', 918: 'Đang lưu kho', 919: 'Đang vận chuyển', 1000: 'Đơn lỗi' };
  return m[parseInt(s, 10)] || String(s);
}
// In bảng map 21 mã Goship → FulfillmentStatus MOPS để soát mắt thường 1 lượt (không gọi API).
function testGoshipStatusMap() {
  var codes = [900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 911, 912, 913, 914, 915, 916, 917, 918, 919, 1000];
  Logger.log('Mã Goship → FulfillmentStatus MOPS');
  codes.forEach(function(c) {
    var m = _goshipMapStatus(c);
    Logger.log('  ' + c + ' (' + _goshipStatusText(c) + ') → ' + (m || '(bỏ qua — không đổi trạng thái)'));
  });
  return 'OK — xem Logs';
}

// ── RUNNER P5–P7: chạy 1 lệnh, đi hết đường đọc (KHÔNG tạo/huỷ vận đơn thật) ─────────────────────
// Dùng ngay sau khi có token: kiểm auth + master data + chào giá + bảng map, in checklist PASS/FAIL.
// Tạo/huỷ vận đơn tách riêng (testGoshipCreate/testGoshipCancel) vì đó là hành động GHI, phải chủ ý.
function testGoshipReadiness(orderId) {
  var out = [];
  function step(name, fn) {
    try { var r = fn(); out.push('PASS  ' + name + (r ? ' — ' + r : '')); return true; }
    catch (e) { out.push('FAIL  ' + name + ' — ' + e.message); return false; }
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);

  step('Cấu hình đủ (_hasGoshipConfig)', function() {
    if (!_hasGoshipConfig(settings)) throw new Error('thiếu token/login hoặc GOSHIP_FROM_CITY/DISTRICT');
    return 'env=' + (settings.GOSHIP_ENV || 'stg');
  });
  step('Khoá webhook đã đặt', function() {
    if (!settings.GOSHIP_WEBHOOK_KEY) throw new Error('chưa đặt GOSHIP_WEBHOOK_KEY — webhook đang mở, xem plan §P2');
    return 'đã đặt';
  });
  var okToken = step('Lấy token', function() { return _goshipToken(settings).length + ' ký tự'; });
  if (okToken) {
    step('GET /cities', function() {
      var c = _goshipMaster(settings, '/cities', 'gsp_cities');
      if (!c.length) throw new Error('danh sách tỉnh rỗng');
      return c.length + ' tỉnh/thành';
    });
    step('Dò mã kho lấy hàng (_goshipResolveFrom)', function() {
      var f = _goshipResolveFrom(settings);
      return 'city=' + f.city + ' district=' + f.district + ' ward=' + (f.ward || '(trống)');
    });
  }
  if (orderId) {
    step('Đơn test hợp lệ', function() {
      var loc = _findOrderRow(ss, orderId);
      var ff = String(loc.sheet.getRange(loc.row, FULFILLMENT_COL).getValue() || '');
      var shp = _shipmentGet(ss, orderId, loc);
      if (shp.tracking_code) throw new Error('đơn đã có vận đơn ' + shp.tracking_code + ' — dùng đơn khác để test chào giá');
      if (ff !== 'pending_packing') throw new Error('đơn đang ở "' + ff + '", cần "pending_packing"');
      return 'ff=' + ff;
    });
    step('Dò mã địa chỉ người nhận', function() {
      var loc = _findOrderRow(ss, orderId);
      var addr = _getShippingAddress(ss, String(loc.sheet.getRange(loc.row, 7).getValue() || ''));
      var d = _goshipResolveDest(settings, addr);
      return 'city=' + d.city + ' district=' + d.district + ' ward=' + (d.ward || '(không khớp — vẫn tạo được)');
    });
    step('POST /rates', function() {
      var q = goshipRates({ order_id: orderId });
      var top = q.rates.slice(0, 5).map(function(r) {
        return r.carrier_name + '/' + (r.service || '?') + ' ' + r.total_fee + 'đ'
             + (r.expected ? ' (' + r.expected + ')' : '') + (r.success_percent ? ' ' + r.success_percent + '%' : '');
      });
      return q.rates.length + ' phương án · kiện ' + q.weight + 'g '
           + q.dims.length + 'x' + q.dims.width + 'x' + q.dims.height + 'cm\n        ' + top.join('\n        ');
    });
    step('Cache /rates (gọi lần 2 không tốn request)', function() {
      var before = parseInt(CacheService.getScriptCache().get('gsp_rl_' + Math.floor(new Date().getTime() / 60000)), 10) || 0;
      goshipRates({ order_id: orderId });
      var after = parseInt(CacheService.getScriptCache().get('gsp_rl_' + Math.floor(new Date().getTime() / 60000)), 10) || 0;
      if (after > before) throw new Error('vẫn gọi API lần 2 (cache không ăn) — kiểm khoá cache');
      return 'cache ăn';
    });
  } else {
    out.push('BỎ QUA  các bước cần đơn — gọi testGoshipReadiness("MOPS-xxxxxx") với 1 đơn đang "Chờ đóng gói"');
  }
  step('Bảng map trạng thái đủ 21 mã', function() {
    var codes = [900, 901, 902, 903, 904, 905, 906, 907, 908, 913, 914, 915, 916, 917, 918, 919];
    var miss = codes.filter(function(c) { return !_goshipMapStatus(c); });
    if (miss.length) throw new Error('mã chưa map: ' + miss.join(', '));
    return 'đủ';
  });

  Logger.log('══ GOSHIP READINESS ══');
  out.forEach(function(l) { Logger.log(l); });
  var fails = out.filter(function(l) { return l.indexOf('FAIL') === 0; }).length;
  Logger.log('══ ' + (fails ? fails + ' BƯỚC FAIL — xử lý trước khi tạo vận đơn thật' : 'TẤT CẢ PASS — chạy testGoshipCreate(orderId) để tạo vận đơn thật') + ' ══');
  return fails ? (fails + ' FAIL — xem Logs') : 'ALL PASS — xem Logs';
}

// ============================================================
// CARRIER DISPATCHER (Phase C) — GHN chỉ là 1 đầu mối. Mọi thao tác vận đơn đi qua đây, chọn adapter
// theo mã đối tác. Thêm hãng mới = thêm 1 nhánh adapter (GHTK/SPX/ViettelPost…), KHÔNG sửa nơi gọi.
// Reconciliation + báo cáo (C1/C3) đã carrier-agnostic sẵn (đọc Orders.Carrier + dữ liệu vận đơn).
// ============================================================
// Chuẩn hoá Orders.Carrier về MÃ đối tác. Cần vì Goship ghi 'GOSHIP · <hãng thật>' (giữ tên hãng thật
// cho báo cáo/đối soát đọc được) — dispatcher chỉ quan tâm tiền tố trước ' · '.
function _shipNormCarrier(raw) {
  return String(raw || '').split('·')[0].trim().toUpperCase();
}
function _carrierOfOrder(ss, orderId) {
  try { return _shipmentGet(ss, orderId).carrier_code; }
  catch (e) { return ''; }
}
// Ưu tiên GOSHIP nếu đang kết nối VÀ đã cấu hình đủ credential. Ngược lại: hãng đầu tiên VỪA connected
// VỪA has_config. Nếu không có → trả '' (caller tự throw thông báo rõ ràng) — KHÔNG fallback cứng về GHN
// (2026-07-28): fallback cũ khiến adapter GHN throw giữa flow với thông báo mơ hồ "Chưa cấu hình GHN…" dù
// admin muốn dùng hãng khác, hoặc chưa bật hãng nào. `connected=true` (admin bật toggle) không đồng nghĩa
// đủ credential — phải re-check bằng `_has*Config(settings)` để không dispatch vào adapter thiếu token.
function _shipDefaultCarrier(ss) {
  var settings = getSettings(ss);
  var configured = Repository.ShippingCarriers.findAll().filter(function(c) {
    if (!c.connected) return false;
    if (c.carrier_code === 'GOSHIP')      return _hasGoshipConfig(settings);
    if (c.carrier_code === 'GHN')         return _hasGhnConfig(settings);
    if (c.carrier_code === 'AHAMOVE')     return _hasAhamoveConfig(settings);
    if (c.carrier_code === 'GHTK')        return _hasGhtkConfig(settings);
    if (c.carrier_code === 'VIETTELPOST') return _hasVtpConfig(settings);
    return false; // SPX/SELF: luồng thủ công, KHÔNG là candidate default (nhân viên phải tick tay)
  });
  if (configured.some(function(c) { return c.carrier_code === 'GOSHIP'; })) return 'GOSHIP';
  return configured.length ? configured[0].carrier_code : '';
}
function _shipUnsupported(carrier) { throw new Error('Chưa cài đối tác vận chuyển: ' + carrier + ' — mới hỗ trợ API Goship (đa hãng)/GHN/Ahamove/GHTK/Viettel Post (và "Tự giao"/Shopee Express thủ công).'); }
// Không có hãng nào cấu hình xong — báo rõ để nhân viên biết đi đâu bấm gì, KHÔNG throw mơ hồ từ adapter
// (2026-07-28). Dùng chung cho cả shipmentCalcFee/shipmentCreate.
function _shipNoCarrier() {
  throw new Error('Chưa có đối tác vận chuyển nào được cấu hình sẵn sàng dùng. Vào MOPS Admin > Cấu hình > chọn 1 đối tác (Goship/GHN/Ahamove/GHTK/Viettel Post), nhập token/credential và BẬT kết nối. Hoặc chọn "Tự giao / hãng khác" ở modal Tạo vận đơn nếu tự giao.');
}

function shipmentCalcFee(payload) {
  var carrier = _shipNormCarrier(payload.carrier) || _shipDefaultCarrier(SpreadsheetApp.getActiveSpreadsheet());
  if (!carrier) _shipNoCarrier();
  if (carrier === 'GOSHIP') return goshipCalcFee(payload); // trả kèm `rates` → FE dựng bảng so sánh hãng
  if (carrier === 'GHN') return ghnCalcFee(payload);
  if (carrier === 'AHAMOVE') return ahamoveEstimateFee(payload);
  if (carrier === 'GHTK') return ghtkCalcFee(payload);
  if (carrier === 'VIETTELPOST') return vtpCalcFee(payload);
  _shipUnsupported(carrier);
}
function shipmentCreate(payload) {
  var carrier = _shipNormCarrier(payload.carrier) || _shipDefaultCarrier(SpreadsheetApp.getActiveSpreadsheet());
  if (!carrier) _shipNoCarrier();
  if (carrier === 'GOSHIP') return goshipCreateShipment(payload); // aggregator — hãng thật theo `rate`
  if (carrier === 'SELF') return _selfCreateShipment(payload); // tự giao / hãng khác — không gọi API
  // SPX (Shopee Express): KHÔNG có API công khai cho đơn ngoài sàn Shopee → đi luồng thủ công như SELF,
  // ghi Carrier='Shopee Express' để báo cáo/đối soát vẫn gom theo hãng. Mã vận đơn nhập tay.
  if (carrier === 'SPX') { payload.carrier_name = payload.carrier_name || 'Shopee Express'; return _selfCreateShipment(payload); }
  if (carrier === 'GHN') return ghnCreateShipment(payload); // adapter tự ghi Orders.Carrier='GHN'
  if (carrier === 'AHAMOVE') return ahamoveCreateShipment(payload); // adapter tự ghi Orders.Carrier='AHAMOVE'
  if (carrier === 'GHTK') return ghtkCreateShipment(payload); // adapter tự ghi Orders.Carrier='GHTK'
  if (carrier === 'VIETTELPOST') return vtpCreateShipment(payload); // adapter tự ghi Orders.Carrier='VIETTELPOST'
  _shipUnsupported(carrier);
}
// Vận đơn "Tự giao / hãng khác" — KHÔNG gọi API hãng nào. Ghi lại đối tác + mã vận đơn nhập tay (nếu
// có) + phí để báo cáo/đối soát vẫn thấy đơn (thay cho việc nhảy state mù "Đã đóng gói (không GHN)" cũ).
// pending_packing → ready_to_pick, giống nhánh GHN nhưng thủ công. Refresh/Cancel tự động không áp dụng
// (carrier != GHN) → FE chỉ hiện nút chuyển bước thủ công cho các đơn này.
function _selfCreateShipment(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  // requireProduct=false: đơn dịch vụ vẫn có thể "tự giao" (giao mẫu, gửi tài liệu) — giữ nguyên hành vi cũ.
  var pre = _shipPrepareCreate(ss, orderId, payload, { requireProduct: false });
  var carrierName = String(payload.carrier_name || 'Tự giao').trim() || 'Tự giao';
  var tracking    = String(payload.manual_tracking || '').trim();
  var fee         = parseInt(payload.manual_fee, 10) || 0;
  _shipmentSet(ss, orderId, { carrier: carrierName, tracking_code: tracking || undefined, shipping_fee: fee }, pre.loc);
  _setFulfillmentStatus(ss, orderId, 'ready_to_pick', payload._staffActor || 'staff', false);
  logActivity(ss, 'ORDER', orderId, 'SELF_SHIPMENT_CREATED', payload._staffActor || 'staff');
  return { order_id: orderId, tracking_code: tracking, carrier: carrierName, shipping_fee: fee, self: true };
}
// Hãng thủ công lưu carrier_code kiểu 'TỰ GIAO'/'SHOPEE EXPRESS' (uppercase từ _shipNormCarrier trên nhãn
// tiếng Việt/tên hãng gốc — không phải code SELF/SPX). Adapter API dùng code chuẩn (GHN/GOSHIP/…). Hàm
// dưới nhận diện hãng thủ công để reply "không có gì để gọi API" thay vì throw "Chưa cài đối tác".
function _shipIsManualCarrier(carrier) {
  if (!carrier) return false;
  var API = ['GHN', 'GOSHIP', 'AHAMOVE', 'GHTK', 'VIETTELPOST'];
  return API.indexOf(carrier) === -1;
}

function shipmentCancel(payload) {
  // R3 (2026-08-21) · State guard — chỉ huỷ vận đơn khi đơn còn ở 'ready_to_pick'. Trước đây FE ẩn
  // nút "Huỷ đóng gói" theo state nhưng backend KHÔNG guard → ai POST cancel_shipment trực tiếp
  // qua GAS URL (Postman/script) vẫn qua được, tracking bị huỷ ở hãng khi hàng đã lên đường →
  // khách không nhận được đơn. Guard ở đây là hàng phòng thủ cuối cùng.
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var _orderRow = _findOrderRow(ss, payload.order_id);
  var _curFul = String(_orderRow.sheet.getRange(_orderRow.row, FULFILLMENT_COL).getValue() || '').toLowerCase();
  if (_curFul && _curFul !== 'ready_to_pick') {
    throw new Error('Đơn đang ở "' + _curFul + '" — chỉ huỷ được ở "ready_to_pick" (trước khi hãng nhận hàng). Nếu cần huỷ đơn hoàn toàn, dùng nút "Huỷ đơn".');
  }
  // Carrier lấy từ ĐƠN (không phải Settings default) — huỷ vận đơn phải gọi đúng hãng đã tạo. Không có
  // carrier → order chưa từng tạo shipment, huỷ vô nghĩa. KHÔNG fallback GHN cứng (2026-07-28) để tránh
  // gọi nhầm API GHN cho vận đơn hãng khác — dữ liệu sẽ lệch.
  var carrier = _carrierOfOrder(ss, payload.order_id);
  if (!carrier) throw new Error('Đơn chưa có vận đơn — không có gì để huỷ.');
  if (_shipIsManualCarrier(carrier)) {
    // Hãng thủ công (Tự giao/Shopee Express/…): không có API để huỷ. Trả về success no-op — FE sẽ tự cập
    // nhật trạng thái nếu cần (nút Huỷ đơn ở tab Đơn hàng, luồng khác với huỷ vận đơn hãng có API).
    throw new Error('Vận đơn thủ công (' + carrier + ') — không có API để huỷ. Nếu cần huỷ đơn, dùng nút "Huỷ đơn" ở tab Đơn hàng.');
  }
  if (carrier === 'GOSHIP') return goshipCancelShipment(payload);
  if (carrier === 'GHN') return ghnCancelShipment(payload);
  if (carrier === 'AHAMOVE') return ahamoveCancelShipment(payload);
  if (carrier === 'GHTK') return ghtkCancelShipment(payload);
  if (carrier === 'VIETTELPOST') return vtpCancelShipment(payload);
  _shipUnsupported(carrier);
}
function shipmentRefresh(payload) {
  // Cùng lý do như shipmentCancel: bám vào carrier THẬT trên đơn. KHÔNG fallback GHN (2026-07-28) — refresh
  // đơn Goship bằng API GHN sẽ báo tracking không tồn tại và gây confusion khi debug.
  var carrier = _carrierOfOrder(SpreadsheetApp.getActiveSpreadsheet(), payload.order_id);
  if (!carrier) throw new Error('Đơn chưa có vận đơn — chưa có gì để cập nhật trạng thái.');
  if (_shipIsManualCarrier(carrier)) {
    // Hãng thủ công: không có API tracking. Trả no-op để nút Refresh ở FE không báo lỗi red.
    return { order_id: payload.order_id, self: true, carrier: carrier, note: 'Hãng thủ công — cập nhật trạng thái tay ở tab Đơn hàng.' };
  }
  if (carrier === 'GOSHIP') return goshipRefreshTracking(payload);
  if (carrier === 'GHN') return ghnRefreshTracking(payload);
  if (carrier === 'AHAMOVE') return ahamoveRefreshTracking(payload);
  if (carrier === 'GHTK') return ghtkRefreshTracking(payload);
  if (carrier === 'VIETTELPOST') return vtpRefreshTracking(payload);
  _shipUnsupported(carrier);
}
// Giục giao (2026-08-27) — KHÔNG hãng nào (Goship/GHN/GHTK/VTP/Ahamove) có API "ưu tiên giao gấp"
// thật. Hàm này KHÔNG giả lập gọi hãng thành công — chỉ ghi 1 dòng ShipmentStatusHistory
// (source='staff_urge') làm nhật ký nội bộ: ai giục, lúc nào, ghi chú gì — để nhân viên khác biết
// đơn đã có người theo dõi sát. Nhân viên vẫn phải tự liên hệ ĐTVC ngoài hệ thống nếu cần.
function shipmentUrge(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var shp = _shipmentGet(ss, orderId);
  if (!shp.tracking_code) throw new Error('Đơn chưa có vận đơn — chưa có gì để giục.');
  var actor = String(payload._staffActor || '').trim();
  _shipmentHistoryLog(ss, {
    order_id: orderId,
    tracking_code: shp.tracking_code,
    carrier_code: shp.carrier_code,
    carrier_label: shp.carrier,
    status_raw: '',
    status_text: 'Đã giục giao (nội bộ)' + (actor ? ' — ' + actor : ''),
    fulfillment_status: '',
    note: String(payload.note || '').trim(),
    update_time: Math.floor(Date.now() / 1000),
    source: 'staff_urge'
  });
  return { order_id: orderId, success: true };
}
function shipMasterData(kind, params) {
  var carrier = _shipNormCarrier(params && params.carrier) || 'GHN';
  if (carrier === 'GHN') {
    if (kind === 'provinces') return ghnProvinces();
    if (kind === 'districts') return ghnDistricts(params.province_id);
    if (kind === 'wards')     return ghnWards(params.district_id);
  }
  // Goship dùng MÃ RIÊNG (city/district/ward) — cùng 3 endpoint, khác bộ mã. Dùng cho picker kho lấy hàng
  // ở tab Cấu hình (province_id/district_id ở đây là mã Goship, không phải mã GHN).
  if (carrier === 'GOSHIP') {
    if (kind === 'provinces') return goshipCities();
    if (kind === 'districts') return goshipDistricts(params.province_id);
    if (kind === 'wards')     return goshipWards(params.district_id);
  }
  _shipUnsupported(carrier);
}

// ── Registry đối tác vận chuyển (list/connect/disconnect) ──
function listCarriers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  // Sheet cũ có thể đã được tạo trước khi thêm GHTK/Goship/VTP. Đồng bộ registry
  // khi đọc để FE không bị thiếu đối tác chỉ vì setupSheet() không chạy lại.
  var existing = Repository.ShippingCarriers.findAll();
  var known = existing.reduce(function(out, c) { out[c.carrier_code] = true; return out; }, {});
  [
    ['GOSHIP', 'Goship (đa hãng)', 'SELF', 1],
    ['GHN', 'Giao Hàng Nhanh', 'SELF', 2],
    ['AHAMOVE', 'Ahamove', 'SELF', 3],
    ['GHTK', 'Giao Hàng Tiết Kiệm', 'SELF', 4],
    ['VIETTELPOST', 'Viettel Post', 'SELF', 5],
    ['SPX', 'Shopee Express', 'MANUAL', 6]
  ].forEach(function(seed) {
    if (!known[seed[0]]) Repository.ShippingCarriers.upsert({
      carrier_code: seed[0], name: seed[1], category: seed[2], connected: false,
      sort_order: seed[3], support_invoice: true
    });
  });
  return { carriers: Repository.ShippingCarriers.findAll().map(function(c) {
    // has_config: đủ credential để hoạt động. GHN=token+shop; Ahamove=api_key+mobile+service+kho;
    // GHTK=token+kho; VTP=token/login+kho-ID. SPX & hãng chưa có adapter → false (đi luồng thủ công).
    c.has_config = (c.carrier_code === 'GOSHIP')      ? _hasGoshipConfig(settings)
                 : (c.carrier_code === 'GHN')         ? _hasGhnConfig(settings)
                 : (c.carrier_code === 'AHAMOVE')     ? _hasAhamoveConfig(settings)
                 : (c.carrier_code === 'GHTK')        ? _hasGhtkConfig(settings)
                 : (c.carrier_code === 'VIETTELPOST') ? _hasVtpConfig(settings)
                 : false;
    return c;
  }) };
}
function upsertCarrier(payload) { return { carrier_code: Repository.ShippingCarriers.upsert(payload) }; }
function toggleCarrier(payload) {
  var code = String(payload.carrier_code || '').trim().toUpperCase();
  var c = Repository.ShippingCarriers.findByCode(code);
  if (!c) throw new Error('Không tìm thấy đối tác: ' + code);
  if (payload.connected) {
    var settings = getSettings(SpreadsheetApp.getActiveSpreadsheet());
    var configured = (code === 'GOSHIP')      ? _hasGoshipConfig(settings)
                   : (code === 'GHN')         ? _hasGhnConfig(settings)
                   : (code === 'AHAMOVE')     ? _hasAhamoveConfig(settings)
                   : (code === 'GHTK')        ? _hasGhtkConfig(settings)
                   : (code === 'VIETTELPOST') ? _hasVtpConfig(settings)
                   : true;
    if (!configured) throw new Error('Chưa đủ cấu hình cho ' + code + '. Vào Cấu hình, lưu token/credential và địa chỉ gửi hàng trước khi bật kết nối.');
  }
  Repository.ShippingCarriers.upsert({ carrier_code: code, connected: !!payload.connected });
  return { carrier_code: code, connected: !!payload.connected };
}
// Cron cảnh báo hết hạn dịch vụ ĐTVC — trước 7 ngày bắn Telegram (cài trigger tay, như ghnTrackingTrigger).
function carrierExpiryCheckTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  Repository.ShippingCarriers.findAll().forEach(function(c) {
    if (!c.connected || !c.expiry_date) return;
    var exp = new Date(c.expiry_date); if (isNaN(exp.getTime())) return;
    var days = Math.floor((exp.getTime() - Date.now()) / 86400000);
    if (days >= 0 && days <= 7) {
      try { notifyTelegram(ss, null, 'CARRIER_EXPIRY', { carrier: c.name, days: days }, settings,
        '⏰ <b>Dịch vụ vận chuyển sắp hết hạn</b>\n' + c.name + ' còn ' + days + ' ngày (hết hạn ' + c.expiry_date + ') — cần gia hạn.'); } catch (e) {}
    }
  });
}

// ============================================================
// ĐỐI SOÁT COD & PHÍ (Phase C1) — carrier-agnostic (đọc Orders.Carrier). 3 trạng thái: Đang thu hộ
// (đơn delivering, chưa kéo vào phiếu) → Chờ đối soát (kéo vào phiếu) → Đã đối soát (khớp diff=0) →
// Đã thanh toán (sinh dòng tiền). Xem docs/architecture/shipping.md §4.
// ============================================================
function _recalcReconTotals(ss, reconId) {
  var items = Repository.ReconciliationItems.findByRecon(reconId);
  var codP = 0, feeP = 0, other = 0, net = 0;
  items.forEach(function(it) { codP += it.cod_partner; feeP += it.fee_partner; other += it.other_fee; net += it.net_actual; });
  Repository.Reconciliations.updateTotals(reconId, { total_cod_partner: codP, total_fee_partner: feeP, total_other: other, net_total: net });
}

function listReconciliations(params) {
  var all = Repository.Reconciliations.findAll();
  var carrier = params && params.carrier_code ? String(params.carrier_code).toUpperCase() : null;
  var status  = params && params.status ? String(params.status) : null;
  var res = all.filter(function(r) {
    if (carrier && r.carrier_code !== carrier) return false;
    if (status && r.status !== status) return false;
    return true;
  }).sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  return { reconciliations: res, total: res.length };
}

// ============================================================
// QUẢN LÝ VẬN ĐƠN (2026-08-13) — carrier-agnostic list + detail.
// ────────────────────────────────────────────────────────────────────────
// Trước 2026-08-13 chỉ có "Đối soát" (chỉ đơn delivered/returned trong phiếu) và "Báo cáo" (thống
// kê theo hãng). Tab "Vận đơn" mới là góc nhìn thao tác: mọi đơn có TrackingCode, mọi trạng thái —
// list để tìm nhanh + detail Sapo-style + timeline. KHÔNG duplicate Đối soát: đối soát bấm vào 1
// dòng để chỉnh COD/phí, tab này bấm vào 1 dòng để XEM lịch trình.
// ============================================================
function _shipStatusToText(ff) {
  var m = {
    pending_packing: 'Chờ đóng gói', ready_to_pick: 'Sẵn sàng lấy hàng',
    delivering: 'Đang giao hàng', redelivery: 'Chờ giao lại',
    delivered: 'Đã giao hàng', delivery_cancelled: 'Huỷ giao hàng',
    returned: 'Đã hoàn hàng', cancelled: 'Đã huỷ'
  };
  return m[String(ff || '')] || String(ff || '');
}
function _shipStatusBadge(ff) {
  var m = {
    pending_packing: 'neutral', ready_to_pick: 'info',
    delivering: 'warning', redelivery: 'warning',
    delivered: 'success', delivery_cancelled: 'error',
    returned: 'error', cancelled: 'error'
  };
  return m[String(ff || '')] || 'neutral';
}

// list_shipments — mọi đơn có TrackingCode. Không dùng Repository.Orders (nặng) — đọc thẳng cột cần
// dùng như listReconciliations làm. Params: {from,to,carrier_code,status(fulfillment),search,limit}.
function listShipments(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ordSh = ss.getSheetByName(SHEET.ORDERS);
  if (!ordSh || ordSh.getLastRow() < 2) return { shipments: [], total: 0 };
  var lastCol = Math.min(ordSh.getLastColumn(), SHIPMENT_COL_LAST);
  var data = ordSh.getRange(2, 1, ordSh.getLastRow() - 1, lastCol).getValues();

  var wantCarrier = params && params.carrier_code ? String(params.carrier_code).toUpperCase() : '';
  var wantStatus = params && params.status ? String(params.status) : '';
  var q = String((params && params.search) || '').trim().toLowerCase();
  var from = params && params.from ? new Date(params.from) : null;
  var to   = params && params.to ? new Date(params.to) : null;
  if (to) to.setHours(23, 59, 59, 999);
  var limit = Math.min(500, Math.max(20, parseInt((params && params.limit), 10) || 100));

  // Build ShippingAddress map (nếu có) để trả receiver name/phone/address cho list.
  var addrMap = {};
  var shipSh = ss.getSheetByName(SHEET.SHIPPING);
  if (shipSh && shipSh.getLastRow() > 1) {
    var addrRows = shipSh.getRange(2, 1, shipSh.getLastRow() - 1, 13).getValues();
    for (var a = 0; a < addrRows.length; a++) {
      var aid = String(addrRows[a][0] || ''); if (!aid) continue;
      addrMap[aid] = {
        name: String(addrRows[a][2] || ''), phone: String(addrRows[a][3] || ''),
        province: String(addrRows[a][4] || ''), district: String(addrRows[a][5] || ''),
        ward: String(addrRows[a][6] || ''), address: String(addrRows[a][7] || '')
      };
    }
  }
  // Customer name/phone map (fallback khi đơn không có ShippingAddress — bán tại quầy vẫn có thể tự
  // giao). Đọc 3 cột A/B/C đủ.
  var custMap = {};
  var custSh = ss.getSheetByName(SHEET.CUSTOMERS);
  if (custSh && custSh.getLastRow() > 1) {
    var custRows = custSh.getRange(2, 1, custSh.getLastRow() - 1, 3).getValues();
    for (var c = 0; c < custRows.length; c++) {
      var cid = String(custRows[c][0] || ''); if (!cid) continue;
      custMap[cid] = { phone: String(custRows[c][1] || ''), name: String(custRows[c][2] || '') };
    }
  }

  var out = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var tracking = String(r[SHIPMENT_COL.TRACKING - 1] || ''); // AE = idx 30 (1-based col 31)
    if (!tracking) continue;
    var carrierLabel = String(r[SHIPMENT_COL.CARRIER - 1] || '');
    var carrierCode = _shipNormCarrier(carrierLabel);
    if (wantCarrier && carrierCode !== wantCarrier) continue;
    var ff = String(r[28] || ''); // AC FulfillmentStatus
    if (wantStatus && ff !== wantStatus) continue;
    var createdAt = r[10] ? new Date(r[10]) : null;
    var packedAt = r[SHIPMENT_COL.PACKED_AT - 1] ? new Date(r[SHIPMENT_COL.PACKED_AT - 1]) : null;
    if (from && createdAt && createdAt < from) continue;
    if (to && createdAt && createdAt > to) continue;

    var orderId = String(r[0]);
    var customerId = String(r[1]);
    var shipAddrId = String(r[6] || ''); // G ShippingAddressID
    var addr = addrMap[shipAddrId] || null;
    var cust = custMap[customerId] || null;
    var receiverName = addr && addr.name ? addr.name : (cust ? cust.name : '');
    var receiverPhone = addr && addr.phone ? addr.phone : (cust ? cust.phone : '');
    var addressShort = addr ? [addr.address, addr.ward, addr.district, addr.province].filter(Boolean).join(', ') : '';

    if (q) {
      var hay = (tracking + ' ' + orderId + ' ' + receiverName + ' ' + receiverPhone + ' ' + carrierLabel).toLowerCase();
      if (hay.indexOf(q) === -1) continue;
    }

    out.push({
      order_id: orderId,
      tracking_code: tracking,
      carrier: carrierLabel,
      carrier_code: carrierCode,
      fulfillment_status: ff,
      status_text: _shipStatusToText(ff),
      status_badge: _shipStatusBadge(ff),
      shipping_fee: Number(r[SHIPMENT_COL.FEE - 1]) || 0,
      cod_amount: Number(r[SHIPMENT_COL.COD - 1]) || 0,
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      address_short: addressShort,
      created_at: createdAt,
      packed_at: packedAt,
      last_tracked_at: Number(r[SHIPMENT_COL.LAST_TRACKED_AT - 1]) || 0
    });
  }
  out.sort(function(a, b) {
    var ta = a.packed_at || a.created_at || 0;
    var tb = b.packed_at || b.created_at || 0;
    return new Date(tb) - new Date(ta);
  });
  var total = out.length;
  if (total > limit) out = out.slice(0, limit);
  return { shipments: out, total: total, returned: out.length };
}

// get_shipment — chi tiết cho detail view (Sapo-style). Đưa qua getOrder để reuse phần order/items/
// customer + shipment fields, rồi bổ sung timeline + reconciliation status + tracking_url.
function getShipment(params) {
  var orderId = String(params && params.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var order = getOrder(orderId, null, params && params.token);
  if (!order || !order.tracking_code) throw new Error('Đơn ' + orderId + ' chưa có vận đơn');

  var carrierCode = _shipNormCarrier(order.carrier);
  var timeline = _shipmentHistoryList(ss, orderId);
  // Đơn cũ (trước 2026-08-13) chưa có timeline → seed 1 entry gốc từ Orders để khỏi rỗng.
  if (!timeline.length) {
    var seedNote = order.package_weight ? ('Đóng gói ' + order.package_weight + 'g') : '';
    timeline.push({
      history_id: '', tracking_code: order.tracking_code, carrier_code: carrierCode,
      carrier_label: order.carrier || '',
      status_raw: '', status_text: 'Đã tạo vận đơn',
      fulfillment_status: 'ready_to_pick', note: seedNote,
      update_time: 0, created_at: order.packed_at || order.created_at, source: 'created'
    });
    if (order.last_tracked_at) {
      timeline.push({
        history_id: '', tracking_code: order.tracking_code, carrier_code: carrierCode,
        carrier_label: order.carrier || '',
        status_raw: '', status_text: _shipStatusToText(order.fulfillment_status),
        fulfillment_status: order.fulfillment_status || '', note: '',
        update_time: order.last_tracked_at,
        created_at: new Date(order.last_tracked_at * 1000), source: 'legacy'
      });
    }
  }

  // Tra reconciliation status theo tracking_code (nếu có).
  var recon = null;
  try {
    var reconItemsSh = ss.getSheetByName(SHEET.RECONCILIATION_ITEMS);
    if (reconItemsSh && reconItemsSh.getLastRow() > 1) {
      var items = reconItemsSh.getRange(2, 1, reconItemsSh.getLastRow() - 1, 5).getValues();
      for (var i = 0; i < items.length; i++) {
        // Cột schema: A ItemID | B ReconID | C TrackingCode | D OrderID | ...
        if (String(items[i][2]) === String(order.tracking_code) || String(items[i][3]) === String(orderId)) {
          var reconId = String(items[i][1]);
          try {
            var reconHead = Repository.Reconciliations.findById(reconId);
            if (reconHead) recon = { recon_id: reconId, status: reconHead.status, payment_status: reconHead.payment_status };
          } catch (rErr) { recon = { recon_id: reconId, status: '', payment_status: '' }; }
          break;
        }
      }
    }
  } catch (rSearchErr) { /* best-effort */ }

  // tracking_url — 2026-08-29 fix: trang track công khai của Goship là track.goship.io/track?code=
  // <mã vận đơn>, KHÔNG phải goship.io/tracking/<gcode> như cũ. gcode (parse từ shipping_service_id
  // 'goship:<gcode>|<rate>') là ID nội bộ Goship dùng để gọi API (huỷ/refresh), không phải mã tra cứu
  // công khai — link cũ trỏ sai domain lẫn sai ID. Mã đúng để tra cứu là order.tracking_code (chính
  // mã in trên tem/barcode). Domain track.goship.io dùng chung cho cả sandbox/prod (không tách env
  // như goship.io/sandbox.goship.io ở API). Hãng khác chưa deploy trang track dùng chung, FE render
  // nhãn "N/A" nếu rỗng.
  var trackingUrl = '';
  if (carrierCode === 'GOSHIP' && order.tracking_code) {
    trackingUrl = 'https://track.goship.io/track?code=' + encodeURIComponent(order.tracking_code);
  }

  return {
    order_id: orderId,
    tracking_code: order.tracking_code,
    carrier: order.carrier,
    carrier_code: carrierCode,
    fulfillment_status: order.fulfillment_status,
    status_text: _shipStatusToText(order.fulfillment_status),
    status_badge: _shipStatusBadge(order.fulfillment_status),
    shipping_fee: order.shipping_fee || 0,
    cod_amount: order.cod_amount || 0,
    shipping_service_id: order.shipping_service_id || '',
    packed_at: order.packed_at,
    package_weight: order.package_weight || 0,
    package_dims: order.package_dims || '',
    last_tracked_at: order.last_tracked_at || 0,
    label_url: order.label_url || '',
    tracking_url: trackingUrl,
    shipping_address: order.shipping_address || null,
    order: {
      order_id: orderId,
      created_at: order.created_at,
      created_by: order.created_by,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      merchandise_amount: order.merchandise_amount,
      customer_shipping_fee: order.customer_shipping_fee,
      discount_amount: order.discount_amount,
      discount_percent: order.discount_percent,
      total_amount: order.total_amount,
      items: order.items || [],
      customer_note: order.customer_note || ''
    },
    timeline: timeline,
    reconciliation: recon,
    activity_logs: (order.activity_logs || []).filter(function(a) {
      var act = String(a.action || '');
      return act.indexOf('SHIPMENT') !== -1 || act.indexOf('FULFILLMENT') !== -1 || act === 'COD_DELIVERED_PENDING_REC';
    })
  };
}
