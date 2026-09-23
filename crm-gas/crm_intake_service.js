/**
 * Pharma Cosmetics CRM Intake — Google Apps Script Web App độc lập.
 *
 * Cài file này vào một dự án GAS MỚI. Không sao chép vào mops-gas/ và không
 * dùng Spreadsheet ID, Script Property hoặc endpoint của MOPS.
 *
 * Cấu hình Script Properties bắt buộc sau khi chạy setupCrmSpreadsheet():
 * - CRM_SPREADSHEET_ID: ID Sheet CRM riêng (setup tự điền)
 * - CRM_DRIVE_FOLDER_ID: tuỳ chọn, thư mục Drive chứa Sheet CRM mới
 * - CRM_AUDIT_RETENTION_DAYS: tuỳ chọn, mặc định 90
 */

var CRM = {
  VERSION: '1.0.0',
  SHEETS: {
    AI: 'AI_Chat_Results',
    CONTACT: 'Contact_Leads',
    AUDIT: 'System_Audit_Logs'
  },
  AI_HEADERS: [
    'submission_id', 'created_at', 'customer_id', 'customer_name', 'customer_email',
    'customer_phone', 'session_id', 'source', 'consent', 'consent_at', 'skin_type',
    'score_summary_json', 'recommendations_json', 'answers_json', 'result_summary', 'page_url'
  ],
  CONTACT_HEADERS: [
    'submission_id', 'created_at', 'customer_id', 'customer_name', 'customer_email',
    'customer_phone', 'session_id', 'source', 'consent', 'consent_at', 'contact_name',
    'contact_phone', 'contact_email', 'message', 'branch', 'appointment_date', 'time_slot', 'page_url'
  ],
  AUDIT_HEADERS: ['created_at', 'request_id', 'action', 'status', 'http_code', 'detail']
};

function doGet() {
  return crmJson_({ success: true, service: 'pharma-crm-intake', version: CRM.VERSION });
}

function doPost(e) {
  var requestId = crmId_('req');
  var action = 'unknown';
  try {
    var payload = crmReadPayload_(e);
    action = String(payload.action || '');
    if (action === 'save_ai_chat') return handleSaveAiChat(payload, requestId);
    if (action === 'submit_contact') return handleSubmitContact(payload, requestId);
    return crmRespondError_(requestId, action, 400, 'Hành động không hợp lệ.');
  } catch (error) {
    var message = String(error && error.message || error);
    var code = /đồng ý rõ ràng/i.test(message) ? 403 : 400;
    return crmRespondError_(requestId, action, code, message);
  }
}

/** Tạo Google Sheet CRM MỚI, schema 3 tab và ghi ID vào Script Properties. */
function setupCrmSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty('CRM_SPREADSHEET_ID');
  if (existingId) throw new Error('CRM_SPREADSHEET_ID đã tồn tại; không tạo Sheet thứ hai.');

  var spreadsheet = SpreadsheetApp.create('Pharma Cosmetics — CRM Khách Hàng, Chat AI & Lead Liên Hệ');
  var folderId = props.getProperty('CRM_DRIVE_FOLDER_ID');
  if (folderId) DriveApp.getFileById(spreadsheet.getId()).moveTo(DriveApp.getFolderById(folderId));
  props.setProperty('CRM_SPREADSHEET_ID', spreadsheet.getId());
  crmEnsureSchema_(spreadsheet);
  crmAudit_(crmId_('setup'), 'setup', 'success', 201, 'Khởi tạo Sheet CRM độc lập.');
  return { spreadsheet_id: spreadsheet.getId(), url: spreadsheet.getUrl() };
}

/** Chỉ quản trị viên deploy gọi một lần qua Apps Script Execution API. */
function configureCrmDriveFolder(folderId) {
  folderId = crmText_(folderId, 100);
  if (!folderId) throw new Error('Thiếu CRM_DRIVE_FOLDER_ID.');
  DriveApp.getFolderById(folderId); // Xác minh quyền trước khi ghi cấu hình.
  PropertiesService.getScriptProperties().setProperty('CRM_DRIVE_FOLDER_ID', folderId);
  return { success: true, folder_id: folderId };
}

function handleSaveAiChat(payload, requestId) {
  crmRequireConsent_(payload);
  crmRequire_(payload.result && payload.result.skin_type, 'Thiếu kết quả phân tích da.');
  return crmWithLock_(function() {
    if (crmSeenSubmission_(payload.submission_id)) {
      return crmRespondSuccess_(requestId, 'save_ai_chat', true);
    }
    var sheet = crmSheet_(CRM.SHEETS.AI);
    var customer = crmCustomer_(payload.customer);
    sheet.appendRow([
      crmSubmissionId_(payload), new Date(), customer.id, customer.name, customer.email, customer.phone,
      crmText_(payload.session_id, 120), crmText_(payload.source, 80), true,
      crmDate_(payload.consent_at), crmText_(payload.result.skin_type, 200),
      crmJsonText_(payload.result.scores), crmJsonText_(payload.result.recommendations),
      crmJsonText_(payload.result.answers), crmText_(payload.result.summary, 2000), crmText_(payload.page_url, 1000)
    ]);
    crmRememberSubmission_(payload.submission_id);
    return crmRespondSuccess_(requestId, 'save_ai_chat', false);
  });
}

function handleSubmitContact(payload, requestId) {
  crmRequireConsent_(payload);
  var contact = payload.contact || {};
  crmRequire_(contact.name, 'Thiếu họ tên liên hệ.');
  var normalizedPhone = crmNormalizeVnPhone_(contact.phone);
  crmRequire_(normalizedPhone, 'Số điện thoại Việt Nam không hợp lệ.');
  return crmWithLock_(function() {
    if (crmSeenSubmission_(payload.submission_id)) {
      return crmRespondSuccess_(requestId, 'submit_contact', true);
    }
    var sheet = crmSheet_(CRM.SHEETS.CONTACT);
    var customer = crmCustomer_(payload.customer);
    sheet.appendRow([
      crmSubmissionId_(payload), new Date(), customer.id, customer.name, customer.email, customer.phone,
      crmText_(payload.session_id, 120), crmText_(payload.source, 80), true, crmDate_(payload.consent_at),
      crmText_(contact.name, 200), normalizedPhone, crmEmail_(contact.email), crmText_(contact.message, 4000),
      crmText_(contact.branch, 300), crmText_(contact.appointment_date, 30), crmText_(contact.time_slot, 100),
      crmText_(payload.page_url, 1000)
    ]);
    crmRememberSubmission_(payload.submission_id);
    return crmRespondSuccess_(requestId, 'submit_contact', false);
  });
}

function crmWithLock_(writeFn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Hệ thống đang bận, vui lòng thử lại.');
  try { return writeFn(); } finally { lock.releaseLock(); }
}

function crmEnsureSchema_(spreadsheet) {
  crmCreateSheet_(spreadsheet, CRM.SHEETS.AI, CRM.AI_HEADERS);
  crmCreateSheet_(spreadsheet, CRM.SHEETS.CONTACT, CRM.CONTACT_HEADERS);
  crmCreateSheet_(spreadsheet, CRM.SHEETS.AUDIT, CRM.AUDIT_HEADERS);
  var defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0) spreadsheet.deleteSheet(defaultSheet);
}

function crmCreateSheet_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#DDF3E6');
  var dataRows = Math.max(1, sheet.getMaxRows() - 1);
  if (name === CRM.SHEETS.AI || name === CRM.SHEETS.CONTACT) {
    // Cột consent: validation checkbox không ghi false xuống các hàng trống.
    sheet.getRange(2, 9, dataRows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build()
    );
  }
  if (name === CRM.SHEETS.AUDIT) {
    sheet.getRange(2, 4, dataRows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['success', 'error'], true).setAllowInvalid(false).build()
    );
    sheet.getRange(2, 5, dataRows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireNumberBetween(100, 599).setAllowInvalid(false).build()
    );
  }
  sheet.autoResizeColumns(1, headers.length);
}

function crmSheet_(name) {
  var id = PropertiesService.getScriptProperties().getProperty('CRM_SPREADSHEET_ID');
  if (!id) throw new Error('Thiếu CRM_SPREADSHEET_ID trong Script Properties.');
  var spreadsheet = SpreadsheetApp.openById(id);
  crmEnsureSchema_(spreadsheet);
  return spreadsheet.getSheetByName(name);
}

function crmReadPayload_(e) {
  var raw = e && e.postData && e.postData.contents;
  if (!raw) throw new Error('Thiếu body JSON.');
  var payload = JSON.parse(raw);
  if (!payload || typeof payload !== 'object') throw new Error('Payload không hợp lệ.');
  if (payload.website) throw new Error('Spam bị từ chối.'); // honeypot, không log PII spam
  return payload;
}

function crmRequireConsent_(payload) {
  if (payload.consent !== true || !payload.consent_at) throw new Error('Cần có sự đồng ý rõ ràng trước khi lưu.');
}
function crmRequire_(value, message) { if (!value || !String(value).trim()) throw new Error(message); }
function crmCustomer_(customer) {
  customer = customer || {};
  return { id: crmText_(customer.id, 100), name: crmText_(customer.name, 200), email: crmEmail_(customer.email), phone: crmNormalizeVnPhone_(customer.phone) || crmText_(customer.phone, 30) };
}
function crmNormalizeVnPhone_(value) {
  var digits = String(value || '').replace(/\D/g, '');
  if (digits.indexOf('84') === 0 && digits.length === 11) digits = '0' + digits.slice(2);
  return /^0\d{9}$/.test(digits) || /^0\d{10}$/.test(digits) ? digits : '';
}
function crmEmail_(value) {
  var email = crmText_(value, 254).toLowerCase();
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}
function crmText_(value, max) { return String(value == null ? '' : value).trim().slice(0, max); }
function crmJsonText_(value) { return JSON.stringify(value == null ? null : value).slice(0, 45000); }
function crmDate_(value) { var date = new Date(value); return isNaN(date.getTime()) ? new Date() : date; }
function crmId_(prefix) { return prefix + '_' + Utilities.getUuid(); }
function crmSubmissionId_(payload) { return crmText_(payload.submission_id, 120) || crmId_('sub'); }
function crmSeenSubmission_(id) { return !!id && !!CacheService.getScriptCache().get('crm_submission_' + id); }
function crmRememberSubmission_(id) { if (id) CacheService.getScriptCache().put('crm_submission_' + id, '1', 21600); }
function crmRespondSuccess_(requestId, action, duplicate) { crmAuditUnsafe_(requestId, action, 'success', 200, duplicate ? 'Bỏ qua bản ghi trùng.' : 'Đã lưu.'); return crmJson_({ success: true, request_id: requestId, duplicate: duplicate }); }
function crmRespondError_(requestId, action, code, message) { crmAudit_(requestId, action, 'error', code, message); return crmJson_({ success: false, request_id: requestId, code: code, error: message }); }
function crmAudit_(requestId, action, status, code, detail) {
  return crmWithLock_(function() { crmAuditUnsafe_(requestId, action, status, code, detail); });
}
function crmAuditUnsafe_(requestId, action, status, code, detail) {
  try {
    var id = PropertiesService.getScriptProperties().getProperty('CRM_SPREADSHEET_ID');
    if (!id) return;
    var sheet = SpreadsheetApp.openById(id).getSheetByName(CRM.SHEETS.AUDIT);
    if (sheet) sheet.appendRow([new Date(), requestId, action, status, code, crmText_(detail, 500)]);
  } catch (ignored) { /* Không làm hỏng luồng chính khi audit thất bại. */ }
}
function crmJson_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
