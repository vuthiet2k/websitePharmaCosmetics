// ============================================================
// MOPS Shared Helpers — 2026-08-21
// Helpers thuần túy, không side-effect global. Load TRƯỚC mọi file khác.
// Được sinh ra từ remediation plan 10 blind spot (docs/blind-spot-remediation.html).
//
// GHI CHÚ NHANH:
// - Toàn bộ helper dùng GAS built-in (LockService/CacheService/PropertiesService/Utilities).
// - Zero external dependency. An toàn thêm mới mà không phá code cũ.
// ============================================================

// ------------------------------------------------------------
// R7 · Timing-safe compare
// Double-HMAC pattern (Coda Hale 2011 / OWASP Cheat Sheet).
// KHÔNG dùng === trực tiếp lên hash — leak timing byte-đầu-khác.
// ------------------------------------------------------------
function _timingSafeEqual(a, b) {
  var sa = a == null ? '' : String(a);
  var sb = b == null ? '' : String(b);
  var key = Utilities.getUuid();
  var ha = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_256, sa, key, Utilities.Charset.UTF_8);
  var hb = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_256, sb, key, Utilities.Charset.UTF_8);
  // ha, hb luôn 32 byte cho SHA-256 → length luôn bằng.
  var diff = 0;
  for (var i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

// ------------------------------------------------------------
// R8 · Login rate limit — sliding window trên PropertiesService
// Durable, không evict như CacheService. 5 attempt / 15 phút / username.
// Chỉ track failure — reset khi login thành công.
// ------------------------------------------------------------
var _LOGIN_RATE_MAX = 5;
var _LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

function _checkLoginRate(username) {
  if (!username) return;
  var props = PropertiesService.getScriptProperties();
  var key = 'RL_LOGIN_' + String(username).toLowerCase();
  var now = Date.now();
  var stamps = [];
  try { stamps = JSON.parse(props.getProperty(key) || '[]') || []; } catch(e) { stamps = []; }
  stamps = stamps.filter(function(t) { return typeof t === 'number' && (now - t) < _LOGIN_RATE_WINDOW_MS; });
  if (stamps.length >= _LOGIN_RATE_MAX) {
    var oldestAge = Math.floor((now - Math.min.apply(null, stamps)) / 60000);
    var waitMin = Math.max(1, 15 - oldestAge);
    throw new Error('Đã sai quá nhiều lần. Vui lòng chờ ' + waitMin + ' phút rồi thử lại.');
  }
}

function _recordLoginFailure(username) {
  if (!username) return;
  var props = PropertiesService.getScriptProperties();
  var key = 'RL_LOGIN_' + String(username).toLowerCase();
  var now = Date.now();
  var stamps = [];
  try { stamps = JSON.parse(props.getProperty(key) || '[]') || []; } catch(e) { stamps = []; }
  stamps = stamps.filter(function(t) { return typeof t === 'number' && (now - t) < _LOGIN_RATE_WINDOW_MS; });
  stamps.push(now);
  props.setProperty(key, JSON.stringify(stamps));
}

function _resetLoginRate(username) {
  if (!username) return;
  var props = PropertiesService.getScriptProperties();
  var key = 'RL_LOGIN_' + String(username).toLowerCase();
  try { props.deleteProperty(key); } catch(e) {}
}

// Daily trigger cleanup (setup 1 lần từ editor):
// ScriptApp.newTrigger('_pruneLoginRateBuckets').timeBased().everyDays(1).atHour(3).create();
function _pruneLoginRateBuckets() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var now = Date.now();
  Object.keys(all).forEach(function(k) {
    if (k.indexOf('RL_LOGIN_') !== 0) return;
    var stamps = [];
    try { stamps = JSON.parse(all[k] || '[]') || []; } catch(e) { stamps = []; }
    stamps = stamps.filter(function(t) { return typeof t === 'number' && (now - t) < _LOGIN_RATE_WINDOW_MS; });
    if (stamps.length === 0) props.deleteProperty(k);
    else props.setProperty(k, JSON.stringify(stamps));
  });
}

// ------------------------------------------------------------
// R2 + R5 · Idempotency wrapper (CacheService 6h)
// Response cache theo key → replay = trả về response cũ (kể cả error).
// Đúng theo Stripe idempotency semantics.
// ------------------------------------------------------------
function _idempotent(key, ttlSeconds, fn) {
  if (!key) return fn();
  var cache = CacheService.getScriptCache();
  var cacheKey = 'IDEMP_' + String(key);
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) { /* fall through */ }
  }
  var result = fn();
  try { cache.put(cacheKey, JSON.stringify(result), Math.min(21600, ttlSeconds || 300)); } catch(e) {}
  return result;
}

// ------------------------------------------------------------
// R6 · COD amount source-of-truth
// Ưu tiên shipment.cod_amount (shipper thực thu), fallback order.total.
// Trả kèm source field để ghi vào Receipt cho audit.
// ------------------------------------------------------------
function _receiptAmountForCOD(order) {
  if (!order) return { amount: 0, source: 'none' };
  var cod = Number(order.cod_amount || order.CODAmount);
  var total = Number(order.total_amount || order.TotalAmount || order.total);
  if (!isNaN(cod) && cod > 0) return { amount: cod, source: 'shipment.cod_amount' };
  if (!isNaN(total) && total > 0) return { amount: total, source: 'order.total' };
  return { amount: 0, source: 'none' };
}

// ------------------------------------------------------------
// R4 · Webhook security helpers
// GAS doPost KHÔNG đọc được HTTP header → 2 tầng:
//   Tầng 1 (native): URL secret token + timestamp.
//     Sender POST tới …/exec?token=<secret>&ts=<unix>
//   Tầng 2 (nếu sender ký body): HMAC verify body payload minus _signature.
// Kèm idempotency 48h qua PropertiesService để chặn replay.
// ------------------------------------------------------------

// secretName = key trong Script Properties nơi lưu shared secret.
function _verifyWebhookToken(e, secretName) {
  var token = (e && e.parameter && e.parameter.token) || '';
  var ts = Number((e && e.parameter && e.parameter.ts) || 0);
  var secret = PropertiesService.getScriptProperties().getProperty(secretName || 'WEBHOOK_SECRET') || '';
  if (!secret) throw new Error('WEBHOOK_SECRET_NOT_CONFIGURED');
  if (!_timingSafeEqual(token, secret)) throw new Error('WEBHOOK_INVALID_TOKEN');
  // Timestamp ±5 phút để chặn replay (nếu sender đưa được ts vào URL).
  if (ts > 0 && Math.abs(Date.now() - ts * 1000) > 300000) throw new Error('WEBHOOK_STALE_TIMESTAMP');
}

// Sender nhét signature vào JSON body: { "_signature": "<base64>", "...":"..." }
// Body verify = HMAC-SHA256(body_json_without_signature, secret).
function _verifyWebhookHmac(rawBody, secretName) {
  var body = String(rawBody || '');
  var parsed = {};
  try { parsed = JSON.parse(body); } catch(e) { throw new Error('WEBHOOK_INVALID_JSON'); }
  var providedSig = String(parsed._signature || '');
  if (!providedSig) throw new Error('WEBHOOK_MISSING_SIGNATURE');
  delete parsed._signature;
  var unsigned = JSON.stringify(parsed);
  var secret = PropertiesService.getScriptProperties().getProperty(secretName || 'WEBHOOK_HMAC_SECRET') || '';
  if (!secret) throw new Error('WEBHOOK_HMAC_SECRET_NOT_CONFIGURED');
  var mac = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_256, unsigned, secret, Utilities.Charset.UTF_8);
  var computed = Utilities.base64Encode(mac);
  if (!_timingSafeEqual(computed, providedSig)) throw new Error('WEBHOOK_HMAC_MISMATCH');
  return parsed; // trả lại parsed body (đã bỏ _signature) để handler dùng luôn
}

// Idempotency 48h qua PropertiesService. handler chỉ chạy 1 lần / webhookId.
// Prune bằng _pruneWebhookIdempotency() daily.
var _WEBHOOK_IDEMPOTENCY_TTL_MS = 48 * 60 * 60 * 1000;

function _webhookIdempotent(webhookId, handler) {
  if (!webhookId) throw new Error('WEBHOOK_ID_REQUIRED');
  var props = PropertiesService.getScriptProperties();
  var key = 'WH_' + String(webhookId);
  if (props.getProperty(key)) return { ok: true, replayed: true, webhook_id: webhookId };
  var result = handler();
  props.setProperty(key, String(Date.now()));
  return result || { ok: true, webhook_id: webhookId };
}

// Daily trigger cleanup:
// ScriptApp.newTrigger('_pruneWebhookIdempotency').timeBased().everyDays(1).atHour(4).create();
function _pruneWebhookIdempotency() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var cutoff = Date.now() - _WEBHOOK_IDEMPOTENCY_TTL_MS;
  Object.keys(all).forEach(function(k) {
    if (k.indexOf('WH_') !== 0) return;
    var ts = Number(all[k]);
    if (isFinite(ts) && ts < cutoff) props.deleteProperty(k);
  });
}

// ------------------------------------------------------------
// Telegram HTML escape (2026-09-05) — notifyTelegram/_enqueueTelegram gửi parse_mode:'HTML'; message
// text được LẮP GHÉP thủ công ở từng call site (tag tĩnh do code viết + field động từ user/staff,
// vd cancelReason). Không escape cả message (sẽ phá tag tĩnh cố ý), chỉ escape TỪNG giá trị động
// trước khi nối chuỗi. Telegram chỉ hiểu 1 tập thẻ nhỏ nên rủi ro giới hạn ở: link giả mạo
// (&lt;a href&gt; hợp lệ) hoặc tag lạ làm Telegram từ chối gửi cả tin nhắn (mất noti nội bộ), không
// phải XSS thật (Telegram không chạy JS).
function _escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ------------------------------------------------------------
// R2 · Undo stack cho multi-step chain
// Sheet write không rollback native → track thủ công.
// ------------------------------------------------------------
function _newUndoStack() {
  var stack = [];
  return {
    push: function(fn) { stack.push(fn); },
    rollback: function() {
      // LIFO — undo thứ tự ngược với apply.
      while (stack.length) {
        try { stack.pop()(); } catch(_) {}
      }
    },
    depth: function() { return stack.length; }
  };
}

// ------------------------------------------------------------
// R9 · Time budget helper — check còn thời gian trong 6-min GAS limit
// Client-driven continuation token: caller gọi timeLeft() giữa loop, break khi &lt; ngưỡng.
// ------------------------------------------------------------
function _makeTimeBudget(maxMs) {
  var start = Date.now();
  var budget = Math.min(maxMs || 5 * 60 * 1000, 5.5 * 60 * 1000); // chừa headroom 30s
  return {
    used: function() { return Date.now() - start; },
    left: function() { return budget - (Date.now() - start); },
    exhausted: function(safetyMs) { return (Date.now() - start) >= (budget - (safetyMs || 30000)); }
  };
}
