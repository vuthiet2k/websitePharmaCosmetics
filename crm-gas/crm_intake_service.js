/**
 * Pharma Cosmetics CRM Intake — Google Apps Script Web App độc lập.
 *
 * Cài file này vào dự án GAS CRM của cửa hàng.
 * Cấu hình Script Properties:
 * - CRM_SPREADSHEET_ID: ID Sheet CRM riêng (setupCrmSpreadsheet tự điền)
 * - CRM_DRIVE_FOLDER_ID: tuỳ chọn, thư mục Drive chứa Sheet CRM
 * - CRM_AUDIT_RETENTION_DAYS: tuỳ chọn, mặc định 90
 */

var CRM = {
  VERSION: '1.2.0',
  SHEETS: {
    AI: 'AI_Chat_Results',
    SKIN: 'Skin_Analysis_Results',
    CONTACT: 'Contact_Leads',
    AUDIT: 'System_Audit_Logs'
  },
  AI_HEADERS: [
    'submission_id', 'created_at', 'customer_id', 'customer_name', 'customer_email',
    'customer_phone', 'session_id', 'source', 'consent', 'consent_at', 'skin_type',
    'score_summary_json', 'recommendations_json', 'answers_json', 'result_summary', 'page_url'
  ],
  SKIN_HEADERS: [
    'submission_id', 'created_at', 'customer_id', 'customer_name', 'customer_email',
    'customer_phone', 'session_id', 'source', 'consent', 'consent_at', 'skin_type',
    'skin_age', 'primary_concern', 'scores_json', 'regimen_json', 'recommended_products_json', 'page_url'
  ],
  CONTACT_HEADERS: [
    'submission_id', 'created_at', 'customer_id', 'customer_name', 'customer_email',
    'customer_phone', 'session_id', 'source', 'consent', 'consent_at', 'contact_name',
    'contact_phone', 'contact_email', 'message', 'branch', 'appointment_date', 'time_slot', 'page_url'
  ],
  AUDIT_HEADERS: ['created_at', 'request_id', 'action', 'status', 'http_code', 'detail']
};

function doGet(e) {
  var params = (e && e.parameter) || {};
  var requestId = crmId_('req_get');
  var action = String(params.action || '');

  if (action === 'get_customer_info' || action === 'lookup_customer') {
    return handleGetCustomerInfo(params, requestId);
  }

  return crmJson_({
    success: true,
    service: 'pharma-crm-intake',
    version: CRM.VERSION,
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  var requestId = crmId_('req');
  var action = 'unknown';
  try {
    var payload = crmReadPayload_(e);
    action = String(payload.action || '');
    if (action === 'save_ai_chat') return handleSaveAiChat(payload, requestId);
    if (action === 'save_skin_analysis') return handleSaveSkinAnalysis(payload, requestId);
    if (action === 'submit_contact') return handleSubmitContact(payload, requestId);
    if (action === 'get_customer_info' || action === 'lookup_customer') return handleGetCustomerInfo(payload, requestId);
    return crmRespondError_(requestId, action, 400, 'Hành động không hợp lệ: ' + action);
  } catch (error) {
    var message = String(error && error.message || error);
    var code = /đồng ý rõ ràng/i.test(message) ? 403 : 400;
    return crmRespondError_(requestId, action, code, message);
  }
}

/** Tạo Google Sheet CRM MỚI, schema 4 tab và ghi ID vào Script Properties. */
function setupCrmSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty('CRM_SPREADSHEET_ID');
  if (existingId) throw new Error('CRM_SPREADSHEET_ID đã tồn tại; không tạo Sheet thứ hai.');

  var spreadsheet = SpreadsheetApp.create('Pharma Cosmetics — CRM Khách Hàng, Chat AI, Soi Da & Lead Liên Hệ');
  var folderId = props.getProperty('CRM_DRIVE_FOLDER_ID');
  if (folderId) DriveApp.getFileById(spreadsheet.getId()).moveTo(DriveApp.getFolderById(folderId));
  props.setProperty('CRM_SPREADSHEET_ID', spreadsheet.getId());
  crmEnsureSchema_(spreadsheet);
  crmAudit_(crmId_('setup'), 'setup', 'success', 201, 'Khởi tạo Sheet CRM độc lập 4 tab.');
  return { spreadsheet_id: spreadsheet.getId(), url: spreadsheet.getUrl() };
}

function configureCrmDriveFolder(folderId) {
  folderId = crmText_(folderId, 100);
  if (!folderId) throw new Error('Thiếu CRM_DRIVE_FOLDER_ID.');
  DriveApp.getFolderById(folderId);
  PropertiesService.getScriptProperties().setProperty('CRM_DRIVE_FOLDER_ID', folderId);
  return { success: true, folder_id: folderId };
}

function handleSaveAiChat(payload, requestId) {
  crmRequireConsent_(payload);
  var resObj = payload.result || payload.analysis_result || {};
  crmRequire_(resObj.skin_type || payload.skin_type, 'Thiếu kết quả phân tích da.');
  return crmWithLock_(function() {
    if (crmSeenSubmission_(payload.submission_id)) {
      return crmRespondSuccess_(requestId, 'save_ai_chat', true, { record_id: payload.submission_id });
    }
    var sheet = crmSheet_(CRM.SHEETS.AI);
    var customer = crmCustomer_(payload.customer);
    var skinType = crmText_(resObj.skin_type || payload.skin_type, 200);
    var scores = resObj.scores || payload.scores;
    var recs = resObj.recommendations || payload.recommendations || resObj.recommend;
    var answers = resObj.answers || payload.answers;
    var summary = crmText_(resObj.summary || payload.summary || skinType, 2000);
    var subId = crmSubmissionId_(payload);

    sheet.appendRow([
      subId, new Date(), customer.id, customer.name, customer.email, customer.phone,
      crmText_(payload.session_id, 120), crmText_(payload.source || 'ai_skin_quiz', 80), true,
      crmDate_(payload.consent_at), skinType,
      crmJsonText_(scores), crmJsonText_(recs),
      crmJsonText_(answers), summary, crmText_(payload.page_url, 1000)
    ]);
    crmRememberSubmission_(payload.submission_id);
    return crmRespondSuccess_(requestId, 'save_ai_chat', false, { record_id: subId });
  });
}

function handleSaveSkinAnalysis(payload, requestId) {
  crmRequireConsent_(payload);
  var analysis = payload.analysis_result || payload.result || {};
  crmRequire_(analysis.scores || payload.scores, 'Thiếu dữ liệu điểm số soi da.');
  return crmWithLock_(function() {
    if (crmSeenSubmission_(payload.submission_id)) {
      return crmRespondSuccess_(requestId, 'save_skin_analysis', true, { record_id: payload.submission_id });
    }
    var sheet = crmSheet_(CRM.SHEETS.SKIN);
    var customer = crmCustomer_(payload.customer);
    var subId = crmSubmissionId_(payload);
    var skinType = crmText_(analysis.skin_type || payload.skin_type || 'Báo cáo soi da camera', 200);
    var skinAge = crmText_(analysis.skin_age || payload.skin_age || '', 50);
    var concern = crmText_(analysis.primary_concern || payload.primary_concern || '', 200);

    sheet.appendRow([
      subId, new Date(), customer.id, customer.name, customer.email, customer.phone,
      crmText_(payload.session_id, 120), crmText_(payload.source || 'ai_skin_scan_camera', 80), true,
      crmDate_(payload.consent_at), skinType, skinAge, concern,
      crmJsonText_(analysis.scores || payload.scores),
      crmJsonText_(analysis.regimen || payload.regimen),
      crmJsonText_(analysis.recommended_products || payload.recommended_products || []),
      crmText_(payload.page_url, 1000)
    ]);
    crmRememberSubmission_(payload.submission_id);
    return crmRespondSuccess_(requestId, 'save_skin_analysis', false, { record_id: subId });
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
      return crmRespondSuccess_(requestId, 'submit_contact', true, { record_id: payload.submission_id });
    }
    var sheet = crmSheet_(CRM.SHEETS.CONTACT);
    var customer = crmCustomer_(payload.customer);
    var subId = crmSubmissionId_(payload);

    sheet.appendRow([
      subId, new Date(), customer.id, customer.name, customer.email, customer.phone,
      crmText_(payload.session_id, 120), crmText_(payload.source || 'contact_lead', 80), true,
      crmDate_(payload.consent_at), crmText_(contact.name, 200), normalizedPhone,
      crmEmail_(contact.email), crmText_(contact.message, 4000),
      crmText_(contact.branch, 300), crmText_(contact.appointment_date, 30), crmText_(contact.time_slot, 100),
      crmText_(payload.page_url, 1000)
    ]);
    crmRememberSubmission_(payload.submission_id);
    return crmRespondSuccess_(requestId, 'submit_contact', false, { record_id: subId });
  });
}

function handleGetCustomerInfo(query, requestId) {
  var id = crmText_(query.customer_id || (query.customer && query.customer.id), 100);
  var phone = crmNormalizeVnPhone_(query.phone || (query.customer && query.customer.phone));
  var email = crmEmail_(query.email || (query.customer && query.customer.email));
  var sessionId = crmText_(query.session_id, 120);
  var submissionId = crmText_(query.submission_id, 120);

  if (!id && !phone && !email && !sessionId && !submissionId) {
    return crmRespondError_(requestId, 'get_customer_info', 400, 'Thiếu thông tin tra cứu (cần id, phone, email, session_id hoặc submission_id).');
  }

  var foundRecord = null;
  var foundSource = '';

  // 1. Tìm trong Skin_Analysis_Results
  try {
    var skinSheet = crmSheet_(CRM.SHEETS.SKIN);
    foundRecord = crmSearchSheetInReverse_(skinSheet, {
      subId: submissionId, id: id, phone: phone, email: email, sessionId: sessionId
    }, 'skin');
    if (foundRecord) foundSource = 'ai_skin_scan_camera';
  } catch (e) { /* bỏ qua nếu sheet chưa tạo */ }

  // 2. Nếu chưa thấy, tìm trong AI_Chat_Results
  if (!foundRecord) {
    try {
      var aiSheet = crmSheet_(CRM.SHEETS.AI);
      foundRecord = crmSearchSheetInReverse_(aiSheet, {
        subId: submissionId, id: id, phone: phone, email: email, sessionId: sessionId
      }, 'quiz');
      if (foundRecord) foundSource = 'ai_skin_quiz';
    } catch (e) { /* bỏ qua nếu sheet chưa tạo */ }
  }

  if (foundRecord) {
    return crmJson_({
      success: true,
      found: true,
      request_id: requestId,
      source: foundSource,
      record: foundRecord
    });
  }

  return crmJson_({
    success: true,
    found: false,
    request_id: requestId,
    message: 'Chưa có thông tin tư vấn nào được lưu trên hệ thống CRM với thông tin này.'
  });
}

function crmSearchSheetInReverse_(sheet, criteria, type) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  var numRows = Math.min(lastRow - 1, 100);
  var startRow = lastRow - numRows + 1;
  var data = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();

  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    var rowSubId = String(row[0] || '').trim();
    var rowCustId = String(row[2] || '').trim();
    var rowEmail = String(row[4] || '').trim().toLowerCase();
    var rowPhone = crmNormalizeVnPhone_(row[5]);
    var rowSession = String(row[6] || '').trim();

    var match = false;
    if (criteria.subId && rowSubId === criteria.subId) match = true;
    else if (criteria.id && rowCustId === criteria.id) match = true;
    else if (criteria.phone && rowPhone === criteria.phone) match = true;
    else if (criteria.email && rowEmail === criteria.email) match = true;
    else if (criteria.sessionId && rowSession === criteria.sessionId) match = true;

    if (match) {
      if (type === 'skin') {
        return {
          submission_id: rowSubId,
          created_at: row[1],
          customer_id: rowCustId,
          customer_name: row[3],
          customer_email: rowEmail,
          customer_phone: rowPhone,
          session_id: rowSession,
          source: row[7],
          skin_type: row[10],
          skin_age: row[11],
          primary_concern: row[12],
          scores: crmSafeParseJson_(row[13]),
          regimen: crmSafeParseJson_(row[14]),
          recommended_products: crmSafeParseJson_(row[15]),
          page_url: row[16]
        };
      } else {
        return {
          submission_id: rowSubId,
          created_at: row[1],
          customer_id: rowCustId,
          customer_name: row[3],
          customer_email: rowEmail,
          customer_phone: rowPhone,
          session_id: rowSession,
          source: row[7],
          skin_type: row[10],
          scores: crmSafeParseJson_(row[11]),
          recommendations: crmSafeParseJson_(row[12]),
          answers: crmSafeParseJson_(row[13]),
          summary: row[14],
          page_url: row[15]
        };
      }
    }
  }
  return null;
}

function crmSafeParseJson_(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch (e) { return str; }
}

function crmWithLock_(writeFn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Hệ thống đang bận, vui lòng thử lại.');
  try { return writeFn(); } finally { lock.releaseLock(); }
}

function crmEnsureSchema_(spreadsheet) {
  crmCreateSheet_(spreadsheet, CRM.SHEETS.AI, CRM.AI_HEADERS);
  crmCreateSheet_(spreadsheet, CRM.SHEETS.SKIN, CRM.SKIN_HEADERS);
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
  if (name === CRM.SHEETS.AI || name === CRM.SHEETS.SKIN || name === CRM.SHEETS.CONTACT) {
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
  if (payload.website) throw new Error('Spam bị từ chối.');
  return payload;
}

function crmRequireConsent_(payload) {
  if (payload.consent !== true || !payload.consent_at) throw new Error('Cần có sự đồng ý rõ ràng trước khi lưu.');
}
function crmRequire_(value, message) { if (!value || !String(value).trim()) throw new Error(message); }
function crmCustomer_(customer) {
  customer = customer || {};
  return {
    id: crmText_(customer.id, 100),
    name: crmText_(customer.name, 200),
    email: crmEmail_(customer.email),
    phone: crmNormalizeVnPhone_(customer.phone) || crmText_(customer.phone, 30)
  };
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
function crmRespondSuccess_(requestId, action, duplicate, extra) {
  crmAuditUnsafe_(requestId, action, 'success', 200, duplicate ? 'Bỏ qua bản ghi trùng.' : 'Đã lưu.');
  var out = Object.assign({ success: true, request_id: requestId, duplicate: duplicate }, extra || {});
  return crmJson_(out);
}
function crmRespondError_(requestId, action, code, message) {
  crmAudit_(requestId, action, 'error', code, message);
  return crmJson_({ success: false, request_id: requestId, code: code, error: message });
}
function crmAudit_(requestId, action, status, code, detail) {
  return crmWithLock_(function() { crmAuditUnsafe_(requestId, action, status, code, detail); });
}
function crmAuditUnsafe_(requestId, action, status, code, detail) {
  try {
    var id = PropertiesService.getScriptProperties().getProperty('CRM_SPREADSHEET_ID');
    if (!id) return;
    var sheet = SpreadsheetApp.openById(id).getSheetByName(CRM.SHEETS.AUDIT);
    if (sheet) sheet.appendRow([new Date(), requestId, action, status, code, crmText_(detail, 500)]);
  } catch (ignored) {}
}
function crmJson_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
