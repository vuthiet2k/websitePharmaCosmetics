
function _postDocumentImpl(documentType, documentId, actorStaffId, postingDateOverride) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (documentType === 'RECEIPT') {
    var receipt = Repository.Receipts.findById(documentId);
    if (!receipt) throw new Error('Không tìm thấy Receipt: ' + documentId);
    if (receipt.status !== 'Draft') throw new Error('Chỉ Receipt ở trạng thái Draft mới Post được (hiện tại: ' + receipt.status + ')');

    var lines = Repository.ReceiptLines.findByReceiptId(documentId);
    var linesTotal = lines.reduce(function(sum, l) { return sum + l.amount; }, 0);
    if (lines.length && Math.abs(linesTotal - receipt.total_amount) > 0.01) {
      throw new Error('Tổng các dòng (' + linesTotal + ') không khớp Tổng tiền (' + receipt.total_amount + ')');
    }

    var postingDate = postingDateOverride || nowIso();
    Repository.LedgerEntries.append({
      document_type: 'RECEIPT', document_id: documentId, posting_date: postingDate,
      account_id: receipt.account_id, type: 'IN', amount: receipt.total_amount,
      category_id: lines.length ? lines[0].category_id : '', party_id: receipt.party_id,
      note: receipt.note || 'Thu tiền'
    });

    Repository.Receipts.updateStatus(documentId, 'Posted', { posting_date: postingDate, posted_at: postingDate });

    logActivity(ss, 'FINANCE', documentId, 'DOCUMENT_POSTED', 'staff:' + (actorStaffId || 'system'));
    logAuditTrail(ss, 'RECEIPT', documentId, 'POSTED', receipt, { status: 'Posted' }, '', actorStaffId);
    return { document_id: documentId, status: 'Posted' };
  }

  if (documentType === 'PAYMENT_VOUCHER') {
    var voucher = Repository.PaymentVouchers.findById(documentId);
    if (!voucher) throw new Error('Không tìm thấy Phiếu chi: ' + documentId);
    // Duyệt chi là CAPABILITY TUỲ CHỌN, không bắt buộc — cho Post thẳng từ Draft
    // (giống Receipt) HOẶC từ Approved (nếu đã đi qua submit/approve). Lý do đổi
    // (2026-07-07): ở giai đoạn chưa có Permission Engine/Role thật, bắt buộc
    // Approved sẽ khoá cứng luồng vận hành cho bất kỳ tài khoản nào không phải
    // literal OWNER (không ai gán được finance.approve). Khi tổ chức có Finance
    // Manager/Accountant thật, gán quyền finance.approve rồi dùng luồng
    // Draft→PendingApproval→Approved→Posted như thiết kế gốc — code không đổi gì
    // thêm, chỉ cần đi qua submit_payment_voucher/approve_payment_voucher trước.
    if (voucher.status !== 'Draft' && voucher.status !== 'Approved') {
      throw new Error('Chỉ Phiếu chi ở trạng thái Draft hoặc Approved mới Post được (hiện tại: ' + voucher.status + ')');
    }

    var pvLines = Repository.PaymentVoucherLines.findByVoucherId(documentId);
    var pvLinesTotal = pvLines.reduce(function(sum, l) { return sum + l.amount; }, 0);
    if (pvLines.length && Math.abs(pvLinesTotal - voucher.total_amount) > 0.01) {
      throw new Error('Tổng các dòng (' + pvLinesTotal + ') không khớp Tổng tiền (' + voucher.total_amount + ')');
    }

    var pvPostingDate = postingDateOverride || nowIso();
    Repository.LedgerEntries.append({
      document_type: 'PAYMENT_VOUCHER', document_id: documentId, posting_date: pvPostingDate,
      account_id: voucher.account_id, type: 'OUT', amount: voucher.total_amount,
      category_id: pvLines.length ? pvLines[0].category_id : '', party_id: voucher.party_id,
      note: voucher.note || 'Chi tiền'
    });

    Repository.PaymentVouchers.updateStatus(documentId, 'Posted', { posting_date: pvPostingDate, posted_at: pvPostingDate });

    // AP (Phase 04 Bước 3) — nếu phiếu chi này trả nợ 1 Bill, tính lại Bills.Status.
    // Nhánh duy nhất sửa vào _postDocumentImpl() cho Phase 02/04 — không đổi luồng
    // Receipt/Transfer/CashAdjustment ở trên/dưới.
    if (voucher.bill_id) _recalcBillStatus(voucher.bill_id);

    logActivity(ss, 'FINANCE', documentId, 'DOCUMENT_POSTED', 'staff:' + (actorStaffId || 'system'));
    logAuditTrail(ss, 'PAYMENT_VOUCHER', documentId, 'POSTED', voucher, { status: 'Posted' }, '', actorStaffId);
    return { document_id: documentId, status: 'Posted' };
  }

  if (documentType === 'TRANSFER') {
    var transfer = Repository.Transfers.findById(documentId);
    if (!transfer) throw new Error('Không tìm thấy Chuyển quỹ: ' + documentId);
    // Không cần duyệt — tiền vẫn trong nội bộ doanh nghiệp, không "ra ngoài" như
    // Payment Voucher (architecture/finance.md §6.3).
    if (transfer.status !== 'Draft') throw new Error('Chỉ Chuyển quỹ ở trạng thái Draft mới Post được (hiện tại: ' + transfer.status + ')');

    var trPostingDate = nowIso();
    // Sinh ĐÚNG 2 LedgerEntry cùng DocumentID — 1 OUT ở tài khoản nguồn, 1 IN ở
    // tài khoản đích. KHÔNG làm thay đổi tổng tiền toàn hệ thống (§6.3) — bất
    // biến này nên kiểm tra thủ công khi test (tổng IN cộng thêm đúng bằng tổng
    // OUT cộng thêm, không phải chỉ 1 trong 2).
    Repository.LedgerEntries.append({
      document_type: 'TRANSFER', document_id: documentId, posting_date: trPostingDate,
      account_id: transfer.from_account_id, type: 'OUT', amount: transfer.amount,
      note: transfer.note || ('Chuyển quỹ sang ' + transfer.to_account_id)
    });
    Repository.LedgerEntries.append({
      document_type: 'TRANSFER', document_id: documentId, posting_date: trPostingDate,
      account_id: transfer.to_account_id, type: 'IN', amount: transfer.amount,
      note: transfer.note || ('Chuyển quỹ từ ' + transfer.from_account_id)
    });

    Repository.Transfers.updateStatus(documentId, 'Posted', { posting_date: trPostingDate, posted_at: trPostingDate });

    logActivity(ss, 'FINANCE', documentId, 'DOCUMENT_POSTED', 'staff:' + (actorStaffId || 'system'));
    logAuditTrail(ss, 'TRANSFER', documentId, 'POSTED', transfer, { status: 'Posted' }, '', actorStaffId);
    return { document_id: documentId, status: 'Posted' };
  }

  if (documentType === 'CASH_ADJUSTMENT') {
    var adjustment = Repository.CashAdjustments.findById(documentId);
    if (!adjustment) throw new Error('Không tìm thấy Điều chỉnh quỹ: ' + documentId);
    // KHÔNG có đường tắt — Điều chỉnh quỹ LUÔN bắt buộc qua Approved trước khi
    // Post (architecture/finance.md §6.4, §7.1) — rủi ro cao nhất trong hệ
    // thống (tự thay đổi số dư không qua giao dịch kinh doanh thật), không nới
    // lỏng giống Payment Voucher.
    if (adjustment.status !== 'Approved') {
      throw new Error('Chỉ Điều chỉnh quỹ ở trạng thái Approved mới Post được (hiện tại: ' + adjustment.status + ')');
    }

    var adjPostingDate = nowIso();
    // CategoryID để trống có chủ đích — đây không phải Thu/Chi kinh doanh thật,
    // báo cáo "Chi theo danh mục" phải loại trừ theo DocumentType='CASH_ADJUSTMENT',
    // không dựa vào 1 CategoryID giả (architecture/finance.md §6.4, §11).
    Repository.LedgerEntries.append({
      document_type: 'CASH_ADJUSTMENT', document_id: documentId, posting_date: adjPostingDate,
      account_id: adjustment.account_id, type: adjustment.direction === 'INCREASE' ? 'IN' : 'OUT',
      amount: adjustment.amount, note: 'Điều chỉnh quỹ — ' + adjustment.reason
    });

    Repository.CashAdjustments.updateStatus(documentId, 'Posted', { posted_at: adjPostingDate });

    logActivity(ss, 'FINANCE', documentId, 'DOCUMENT_POSTED', 'staff:' + (actorStaffId || 'system'));
    logAuditTrail(ss, 'CASH_ADJUSTMENT', documentId, 'POSTED', adjustment, { status: 'Posted' }, adjustment.reason, actorStaffId);
    return { document_id: documentId, status: 'Posted' };
  }

  throw new Error('postDocument() chưa hỗ trợ documentType: ' + documentType);
}

// Wrapper mỏng — cùng nguyên tắc khoá như postDocument() ở trên.
function reverseDocument(documentType, documentId, reason, actorStaffId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return _reverseDocumentImpl(documentType, documentId, reason, actorStaffId);
  } finally {
    lock.releaseLock();
  }
}

function _reverseDocumentImpl(documentType, documentId, reason, actorStaffId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  reason = _sanitizeText(reason || '', 300);

  if (documentType === 'RECEIPT') {
    var receipt = Repository.Receipts.findById(documentId);
    if (!receipt) throw new Error('Không tìm thấy Receipt: ' + documentId);
    if (receipt.status !== 'Posted') throw new Error('Chỉ Receipt đã Posted mới cần đảo bút toán (hiện tại: ' + receipt.status + ')');

    var originalEntries = Repository.LedgerEntries.findByDocument('RECEIPT', documentId);
    originalEntries.forEach(function(entry) {
      Repository.LedgerEntries.append({
        document_type: 'RECEIPT', document_id: documentId, posting_date: nowIso(),
        account_id: entry.account_id, type: entry.type === 'IN' ? 'OUT' : 'IN',
        amount: entry.amount, category_id: entry.category_id, party_id: entry.party_id,
        reversal_of: entry.ledger_id,
        note: '[Hủy] Đối ứng cho bút toán ' + entry.ledger_id + ' (Receipt ' + documentId + ')' + (reason ? ' — Lý do: ' + reason : '')
      });
    });

    var cancelledAt = nowIso();
    Repository.Receipts.updateStatus(documentId, 'Cancelled', { cancelled_at: cancelledAt });

    logActivity(ss, 'FINANCE', documentId, 'DOCUMENT_REVERSED', 'staff:' + (actorStaffId || 'system'));
    logAuditTrail(ss, 'RECEIPT', documentId, 'REVERSED', receipt, { status: 'Cancelled' }, reason, actorStaffId);
    return { document_id: documentId, status: 'Cancelled' };
  }

  if (documentType === 'PAYMENT_VOUCHER') {
    var voucher2 = Repository.PaymentVouchers.findById(documentId);
    if (!voucher2) throw new Error('Không tìm thấy Phiếu chi: ' + documentId);
    if (voucher2.status !== 'Posted') throw new Error('Chỉ Phiếu chi đã Posted mới cần đảo bút toán (hiện tại: ' + voucher2.status + ')');

    var pvOriginalEntries = Repository.LedgerEntries.findByDocument('PAYMENT_VOUCHER', documentId);
    pvOriginalEntries.forEach(function(entry) {
      Repository.LedgerEntries.append({
        document_type: 'PAYMENT_VOUCHER', document_id: documentId, posting_date: nowIso(),
        account_id: entry.account_id, type: entry.type === 'IN' ? 'OUT' : 'IN',
        amount: entry.amount, category_id: entry.category_id, party_id: entry.party_id,
        reversal_of: entry.ledger_id,
        note: '[Hủy] Đối ứng cho bút toán ' + entry.ledger_id + ' (Phiếu chi ' + documentId + ')' + (reason ? ' — Lý do: ' + reason : '')
      });
    });

    var pvCancelledAt = nowIso();
    Repository.PaymentVouchers.updateStatus(documentId, 'Cancelled', { cancelled_at: pvCancelledAt });

    logActivity(ss, 'FINANCE', documentId, 'DOCUMENT_REVERSED', 'staff:' + (actorStaffId || 'system'));
    logAuditTrail(ss, 'PAYMENT_VOUCHER', documentId, 'REVERSED', voucher2, { status: 'Cancelled' }, reason, actorStaffId);
    return { document_id: documentId, status: 'Cancelled' };
  }

  if (documentType === 'TRANSFER') {
    var transfer2 = Repository.Transfers.findById(documentId);
    if (!transfer2) throw new Error('Không tìm thấy Chuyển quỹ: ' + documentId);
    if (transfer2.status !== 'Posted') throw new Error('Chỉ Chuyển quỹ đã Posted mới cần đảo bút toán (hiện tại: ' + transfer2.status + ')');

    var trOriginalEntries = Repository.LedgerEntries.findByDocument('TRANSFER', documentId);
    trOriginalEntries.forEach(function(entry) {
      Repository.LedgerEntries.append({
        document_type: 'TRANSFER', document_id: documentId, posting_date: nowIso(),
        account_id: entry.account_id, type: entry.type === 'IN' ? 'OUT' : 'IN',
        amount: entry.amount, reversal_of: entry.ledger_id,
        note: '[Hủy] Đối ứng cho bút toán ' + entry.ledger_id + ' (Chuyển quỹ ' + documentId + ')' + (reason ? ' — Lý do: ' + reason : '')
      });
    });

    var trCancelledAt = nowIso();
    Repository.Transfers.updateStatus(documentId, 'Cancelled', { cancelled_at: trCancelledAt });

    logActivity(ss, 'FINANCE', documentId, 'DOCUMENT_REVERSED', 'staff:' + (actorStaffId || 'system'));
    logAuditTrail(ss, 'TRANSFER', documentId, 'REVERSED', transfer2, { status: 'Cancelled' }, reason, actorStaffId);
    return { document_id: documentId, status: 'Cancelled' };
  }

  if (documentType === 'CASH_ADJUSTMENT') {
    var adjustment2 = Repository.CashAdjustments.findById(documentId);
    if (!adjustment2) throw new Error('Không tìm thấy Điều chỉnh quỹ: ' + documentId);
    if (adjustment2.status !== 'Posted') throw new Error('Chỉ Điều chỉnh quỹ đã Posted mới cần đảo bút toán (hiện tại: ' + adjustment2.status + ')');
    if (!reason) throw new Error('Lý do huỷ là bắt buộc đối với Điều chỉnh quỹ');

    var adjOriginalEntries = Repository.LedgerEntries.findByDocument('CASH_ADJUSTMENT', documentId);
    adjOriginalEntries.forEach(function(entry) {
      Repository.LedgerEntries.append({
        document_type: 'CASH_ADJUSTMENT', document_id: documentId, posting_date: nowIso(),
        account_id: entry.account_id, type: entry.type === 'IN' ? 'OUT' : 'IN',
        amount: entry.amount, reversal_of: entry.ledger_id,
        note: '[Hủy] Đối ứng cho bút toán ' + entry.ledger_id + ' (Điều chỉnh quỹ ' + documentId + ') — Lý do: ' + reason
      });
    });

    var adjCancelledAt = nowIso();
    Repository.CashAdjustments.updateStatus(documentId, 'Cancelled', { cancelled_at: adjCancelledAt });

    logActivity(ss, 'FINANCE', documentId, 'DOCUMENT_REVERSED', 'staff:' + (actorStaffId || 'system'));
    logAuditTrail(ss, 'CASH_ADJUSTMENT', documentId, 'REVERSED', adjustment2, { status: 'Cancelled' }, reason, actorStaffId);
    return { document_id: documentId, status: 'Cancelled' };
  }

  throw new Error('reverseDocument() chưa hỗ trợ documentType: ' + documentType);
}

// ── APPLICATION LAYER — Receipts ─────────────────────────────────────────────
function createReceipt(payload) {
  var accountId = String(payload.account_id || '').trim();
  if (!accountId) throw new Error('account_id là bắt buộc');
  if (!Repository.CashAccounts.findById(accountId)) throw new Error('Tài khoản không tồn tại: ' + accountId);

  var totalAmount = Number(payload.total_amount);
  if (isNaN(totalAmount) || totalAmount <= 0) throw new Error('Số tiền không hợp lệ');

  var lines = Array.isArray(payload.lines) ? payload.lines : [];
  if (lines.length) {
    var validCategoryIds = Repository.Categories.findAll('INCOME').map(function(c) { return c.category_id; });
    lines.forEach(function(l) {
      if (validCategoryIds.indexOf(l.category_id) === -1) throw new Error('Danh mục Thu không hợp lệ: ' + l.category_id);
      if (!(Number(l.amount) > 0)) throw new Error('Số tiền dòng không hợp lệ');
    });
  }

  var receiptId = Repository.Receipts.create({
    party_id: payload.party_id || '', account_id: accountId, total_amount: totalAmount,
    note: _sanitizeText(payload.note || '', 300), document_date: payload.document_date || '',
    source_type: payload.source_type || 'MANUAL', source_ref: payload.source_ref || '',
    created_by: payload._callerUser || 'system'
  });

  if (lines.length) Repository.ReceiptLines.appendLines(receiptId, lines);

  var receiptActor = payload._callerUser || 'system';
  var ssForReceipt = SpreadsheetApp.getActiveSpreadsheet();
  logActivity(ssForReceipt, 'FINANCE', receiptId, 'RECEIPT_CREATED', receiptActor);
  logAuditTrail(ssForReceipt, 'RECEIPT', receiptId, 'CREATED', null, { status: 'Draft', total_amount: totalAmount, account_id: accountId }, '', receiptActor);
  return { receipt_id: receiptId, status: 'Draft' };
}

function postReceipt(payload) {
  var receiptId = String(payload.receipt_id || '').trim();
  if (!receiptId) throw new Error('receipt_id là bắt buộc');
  return postDocument('RECEIPT', receiptId, payload._callerUser);
}

function cancelReceipt(payload) {
  var receiptId = String(payload.receipt_id || '').trim();
  if (!receiptId) throw new Error('receipt_id là bắt buộc');
  var receipt = Repository.Receipts.findById(receiptId);
  if (!receipt) throw new Error('Không tìm thấy Receipt: ' + receiptId);

  if (receipt.status === 'Draft') {
    Repository.Receipts.updateStatus(receiptId, 'Cancelled', { cancelled_at: nowIso() });
    logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'FINANCE', receiptId, 'RECEIPT_CANCELLED', payload._callerUser || 'system');
    return { receipt_id: receiptId, status: 'Cancelled' };
  }
  if (receipt.status === 'Posted') {
    return reverseDocument('RECEIPT', receiptId, payload.reason, payload._callerUser);
  }
  throw new Error('Receipt đã ở trạng thái Cancelled từ trước');
}

function listReceipts(params) {
  var status   = params && params.status ? String(params.status) : null;
  var fromDate = params && params.from   ? new Date(params.from) : null;
  var toDate   = params && params.to     ? new Date(params.to)   : null;
  var limit    = params && params.limit  ? parseInt(params.limit, 10) : 200;

  // Đọc qua Repository.Receipts.findAll() (phase-07 Lớp 3-Finance) — trước tự getRange + mượn _COLS/_mapRow.
  var all = Repository.Receipts.findAll()
    .filter(function(r) {
      if (status && r.status !== status) return false;
      var d = r.created_at ? new Date(r.created_at) : null;
      if (fromDate && d && d < fromDate) return false;
      if (toDate   && d && d > toDate)   return false;
      return true;
    });

  all.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  return {
    receipts: all.slice(0, limit).map(function(r) { var copy = Object.assign({}, r); delete copy._row; return copy; }),
    total: all.length
  };
}

// ── APPLICATION LAYER — Payment Vouchers (Phiếu Chi, Bước 2) ─────────────────
// Vòng đời ĐẦY ĐỦ, khác Receipt: Draft → PendingApproval → Approved → Posted →
// Cancelled (docs/architecture/finance.md §7.1) — chi tiền ra luôn cần tách
// người lập khỏi người duyệt, kể cả khi hiện tại chỉ OWNER dùng được (OWNER bỏ
// qua mọi permission check qua wildcard '*', tự tạo + tự duyệt được — chấp nhận
// ở giai đoạn chưa có Finance Manager riêng, xem finance.md §16 mục rủi ro).
function createPaymentVoucher(payload) {
  var accountId = String(payload.account_id || '').trim();
  if (!accountId) throw new Error('account_id là bắt buộc');
  if (!Repository.CashAccounts.findById(accountId)) throw new Error('Tài khoản không tồn tại: ' + accountId);

  var totalAmount = Number(payload.total_amount);
  if (isNaN(totalAmount) || totalAmount <= 0) throw new Error('Số tiền không hợp lệ');

  var lines = Array.isArray(payload.lines) ? payload.lines : [];
  if (lines.length) {
    var validCategoryIds = Repository.Categories.findAll('EXPENSE').map(function(c) { return c.category_id; });
    lines.forEach(function(l) {
      if (validCategoryIds.indexOf(l.category_id) === -1) throw new Error('Danh mục Chi không hợp lệ: ' + l.category_id);
      if (!(Number(l.amount) > 0)) throw new Error('Số tiền dòng không hợp lệ');
    });
  }

  // AP (Phase 04 Bước 3) — optional: phiếu chi này trả nợ 1 Bill cụ thể.
  var billId = String(payload.bill_id || '').trim();
  if (billId) {
    var bill = Repository.Bills.findById(billId);
    if (!bill) throw new Error('Không tìm thấy Bill: ' + billId);
    if (bill.status === 'PAID' || bill.status === 'CANCELLED') {
      throw new Error('Bill này đã ' + (bill.status === 'PAID' ? 'trả đủ' : 'bị huỷ') + ', không thể lập thêm Phiếu chi');
    }
  }

  // Cọc trả NCC TRƯỚC khi nhận hàng (docs/mops.md §6) — PO còn Draft nên chưa có Bill để trả
  // trực tiếp. Loại trừ với bill_id: PO đã Posted thì Bill đã tồn tại, phải dùng bill_id thẳng,
  // không còn lý do đi qua purchase_order_id nữa (retroactive-link chỉ chạy 1 lần lúc Post).
  var purchaseOrderId = String(payload.purchase_order_id || '').trim();
  if (purchaseOrderId) {
    if (billId) throw new Error('Chỉ chọn 1 trong 2: trả nợ Bill hoặc cọc trước cho Phiếu nhập hàng, không dùng cùng lúc');
    var po = Repository.PurchaseOrders.findById(purchaseOrderId);
    if (!po) throw new Error('Không tìm thấy Phiếu nhập hàng: ' + purchaseOrderId);
    if (po.status !== 'Draft') throw new Error('Phiếu nhập hàng này đã Posted/Huỷ — dùng Bill trực tiếp (không còn ở giai đoạn cọc trước)');
  }

  var voucherId = Repository.PaymentVouchers.create({
    party_id: payload.party_id || '', account_id: accountId, total_amount: totalAmount,
    note: _sanitizeText(payload.note || '', 300), document_date: payload.document_date || '',
    attachment_url: _sanitizeText(payload.attachment_url || '', 500),
    created_by: payload._callerUser || 'system', bill_id: billId, purchase_order_id: purchaseOrderId
  });

  if (lines.length) Repository.PaymentVoucherLines.appendLines(voucherId, lines);

  var voucherActor = payload._callerUser || 'system';
  var ssForVoucher = SpreadsheetApp.getActiveSpreadsheet();
  logActivity(ssForVoucher, 'FINANCE', voucherId, 'PAYMENT_VOUCHER_CREATED', voucherActor);
  logAuditTrail(ssForVoucher, 'PAYMENT_VOUCHER', voucherId, 'CREATED', null, { status: 'Draft', total_amount: totalAmount, account_id: accountId }, '', voucherActor);
  return { voucher_id: voucherId, status: 'Draft' };
}

function submitPaymentVoucher(payload) {
  var voucherId = String(payload.voucher_id || '').trim();
  if (!voucherId) throw new Error('voucher_id là bắt buộc');
  var voucher = Repository.PaymentVouchers.findById(voucherId);
  if (!voucher) throw new Error('Không tìm thấy Phiếu chi: ' + voucherId);
  if (voucher.status !== 'Draft') throw new Error('Chỉ Phiếu chi ở trạng thái Draft mới gửi duyệt được (hiện tại: ' + voucher.status + ')');

  Repository.PaymentVouchers.updateStatus(voucherId, 'PendingApproval', {});
  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'FINANCE', voucherId, 'PAYMENT_VOUCHER_SUBMITTED', payload._callerUser || 'system');
  return { voucher_id: voucherId, status: 'PendingApproval' };
}

// decision: 'approve' | 'reject'. Reject đưa về Draft (mở khoá sửa lại), KHÔNG
// phải Cancelled — người lập sửa rồi gửi duyệt lại, không phải tạo phiếu mới.
function approvePaymentVoucher(payload) {
  var voucherId = String(payload.voucher_id || '').trim();
  if (!voucherId) throw new Error('voucher_id là bắt buộc');
  var decision = String(payload.decision || 'approve').toLowerCase();
  if (['approve', 'reject'].indexOf(decision) === -1) throw new Error('decision phải là approve hoặc reject');

  var voucher = Repository.PaymentVouchers.findById(voucherId);
  if (!voucher) throw new Error('Không tìm thấy Phiếu chi: ' + voucherId);
  if (voucher.status !== 'PendingApproval') throw new Error('Chỉ Phiếu chi ở trạng thái PendingApproval mới duyệt được (hiện tại: ' + voucher.status + ')');

  var actor = payload._callerUser || 'system';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (decision === 'reject') {
    Repository.PaymentVouchers.updateStatus(voucherId, 'Draft', {});
    logActivity(ss, 'FINANCE', voucherId, 'PAYMENT_VOUCHER_REJECTED', actor);
    logAuditTrail(ss, 'PAYMENT_VOUCHER', voucherId, 'REJECTED', voucher, { status: 'Draft' }, _sanitizeText(payload.reason || '', 300), actor);
    return { voucher_id: voucherId, status: 'Draft' };
  }

  var approvedAt = nowIso();
  Repository.PaymentVouchers.updateStatus(voucherId, 'Approved', { approved_by: actor, approved_at: approvedAt });
  logActivity(ss, 'FINANCE', voucherId, 'PAYMENT_VOUCHER_APPROVED', actor);
  logAuditTrail(ss, 'PAYMENT_VOUCHER', voucherId, 'APPROVED', voucher, { status: 'Approved' }, '', actor);
  return { voucher_id: voucherId, status: 'Approved' };
}

function postPaymentVoucher(payload) {
  var voucherId = String(payload.voucher_id || '').trim();
  if (!voucherId) throw new Error('voucher_id là bắt buộc');
  return postDocument('PAYMENT_VOUCHER', voucherId, payload._callerUser);
}

function cancelPaymentVoucher(payload) {
  var voucherId = String(payload.voucher_id || '').trim();
  if (!voucherId) throw new Error('voucher_id là bắt buộc');
  var voucher = Repository.PaymentVouchers.findById(voucherId);
  if (!voucher) throw new Error('Không tìm thấy Phiếu chi: ' + voucherId);

  if (voucher.status === 'Draft' || voucher.status === 'PendingApproval' || voucher.status === 'Approved') {
    Repository.PaymentVouchers.updateStatus(voucherId, 'Cancelled', { cancelled_at: nowIso() });
    logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'FINANCE', voucherId, 'PAYMENT_VOUCHER_CANCELLED', payload._callerUser || 'system');
    return { voucher_id: voucherId, status: 'Cancelled' };
  }
  if (voucher.status === 'Posted') {
    return reverseDocument('PAYMENT_VOUCHER', voucherId, payload.reason, payload._callerUser);
  }
  throw new Error('Phiếu chi đã ở trạng thái Cancelled từ trước');
}

function listPaymentVouchers(params) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PAYMENT_VOUCHERS);
  if (!sh || sh.getLastRow() < 2) return { vouchers: [], total: 0 };

  var status   = params && params.status ? String(params.status) : null;
  var fromDate = params && params.from   ? new Date(params.from) : null;
  var toDate   = params && params.to     ? new Date(params.to)   : null;
  var limit    = params && params.limit  ? parseInt(params.limit, 10) : 200;

  var all = sh.getRange(2, 1, sh.getLastRow() - 1, Repository.PaymentVouchers._COLS).getValues()
    .map(function(r, i) { return Repository.PaymentVouchers._mapRow(r, i + 2); })
    .filter(function(r) {
      if (status && r.status !== status) return false;
      var d = r.created_at ? new Date(r.created_at) : null;
      if (fromDate && d && d < fromDate) return false;
      if (toDate   && d && d > toDate)   return false;
      return true;
    });

  all.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  return {
    vouchers: all.slice(0, limit).map(function(r) { var copy = Object.assign({}, r); delete copy._row; return copy; }),
    total: all.length
  };
}

// ── APPLICATION LAYER — Transfers (Chuyển quỹ, Bước 3) ───────────────────────
// Không có Lines, không cần duyệt — Draft → Posted trực tiếp (architecture/
// finance.md §6.3).
function createTransfer(payload) {
  var fromAccountId = String(payload.from_account_id || '').trim();
  var toAccountId   = String(payload.to_account_id || '').trim();
  if (!fromAccountId || !toAccountId) throw new Error('Tài khoản nguồn và tài khoản đích là bắt buộc');
  if (fromAccountId === toAccountId) throw new Error('Tài khoản nguồn và tài khoản đích không được trùng nhau');
  if (!Repository.CashAccounts.findById(fromAccountId)) throw new Error('Tài khoản nguồn không tồn tại: ' + fromAccountId);
  if (!Repository.CashAccounts.findById(toAccountId)) throw new Error('Tài khoản đích không tồn tại: ' + toAccountId);

  var amount = Number(payload.amount);
  if (isNaN(amount) || amount <= 0) throw new Error('Số tiền không hợp lệ');

  var transferId = Repository.Transfers.create({
    from_account_id: fromAccountId, to_account_id: toAccountId, amount: amount,
    note: _sanitizeText(payload.note || '', 300), created_by: payload._callerUser || 'system'
  });

  var actor = payload._callerUser || 'system';
  var ssForTransfer = SpreadsheetApp.getActiveSpreadsheet();
  logActivity(ssForTransfer, 'FINANCE', transferId, 'TRANSFER_CREATED', actor);
  logAuditTrail(ssForTransfer, 'TRANSFER', transferId, 'CREATED', null, { status: 'Draft', amount: amount, from_account_id: fromAccountId, to_account_id: toAccountId }, '', actor);
  return { transfer_id: transferId, status: 'Draft' };
}

function postTransfer(payload) {
  var transferId = String(payload.transfer_id || '').trim();
  if (!transferId) throw new Error('transfer_id là bắt buộc');
  return postDocument('TRANSFER', transferId, payload._callerUser);
}

function cancelTransfer(payload) {
  var transferId = String(payload.transfer_id || '').trim();
  if (!transferId) throw new Error('transfer_id là bắt buộc');
  var transfer = Repository.Transfers.findById(transferId);
  if (!transfer) throw new Error('Không tìm thấy Chuyển quỹ: ' + transferId);

  if (transfer.status === 'Draft') {
    Repository.Transfers.updateStatus(transferId, 'Cancelled', { cancelled_at: nowIso() });
    logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'FINANCE', transferId, 'TRANSFER_CANCELLED', payload._callerUser || 'system');
    return { transfer_id: transferId, status: 'Cancelled' };
  }
  if (transfer.status === 'Posted') {
    return reverseDocument('TRANSFER', transferId, payload.reason, payload._callerUser);
  }
  throw new Error('Chuyển quỹ đã ở trạng thái Cancelled từ trước');
}

function listTransfers(params) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.TRANSFERS);
  if (!sh || sh.getLastRow() < 2) return { transfers: [], total: 0 };

  var status   = params && params.status ? String(params.status) : null;
  var fromDate = params && params.from   ? new Date(params.from) : null;
  var toDate   = params && params.to     ? new Date(params.to)   : null;
  var limit    = params && params.limit  ? parseInt(params.limit, 10) : 200;

  var all = sh.getRange(2, 1, sh.getLastRow() - 1, Repository.Transfers._COLS).getValues()
    .map(function(r, i) { return Repository.Transfers._mapRow(r, i + 2); })
    .filter(function(r) {
      if (status && r.status !== status) return false;
      var d = r.created_at ? new Date(r.created_at) : null;
      if (fromDate && d && d < fromDate) return false;
      if (toDate   && d && d > toDate)   return false;
      return true;
    });

  all.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  return {
    transfers: all.slice(0, limit).map(function(r) { var copy = Object.assign({}, r); delete copy._row; return copy; }),
    total: all.length
  };
}

// ── APPLICATION LAYER — Cash Adjustments (Điều chỉnh quỹ, Bước 3) ────────────
// LUÔN bắt buộc qua Approved trước khi Post — KHÔNG có đường tắt Draft→Posted
// (khác Payment Voucher). Reason bắt buộc không rỗng ở mọi bước tạo/huỷ.
function createCashAdjustment(payload) {
  var accountId = String(payload.account_id || '').trim();
  if (!accountId) throw new Error('account_id là bắt buộc');
  if (!Repository.CashAccounts.findById(accountId)) throw new Error('Tài khoản không tồn tại: ' + accountId);

  var direction = String(payload.direction || '').toUpperCase();
  if (['INCREASE', 'DECREASE'].indexOf(direction) === -1) throw new Error('direction phải là INCREASE hoặc DECREASE');

  var amount = Number(payload.amount);
  if (isNaN(amount) || amount <= 0) throw new Error('Số tiền không hợp lệ');

  var reason = _sanitizeText(payload.reason || '', 300);
  if (!reason) throw new Error('Lý do điều chỉnh là bắt buộc');

  var adjustmentId = Repository.CashAdjustments.create({
    account_id: accountId, direction: direction, amount: amount, reason: reason,
    created_by: payload._callerUser || 'system'
  });

  var actor = payload._callerUser || 'system';
  var ssForAdj = SpreadsheetApp.getActiveSpreadsheet();
  logActivity(ssForAdj, 'FINANCE', adjustmentId, 'CASH_ADJUSTMENT_CREATED', actor);
  logAuditTrail(ssForAdj, 'CASH_ADJUSTMENT', adjustmentId, 'CREATED', null, { status: 'Draft', direction: direction, amount: amount, account_id: accountId }, reason, actor);
  return { adjustment_id: adjustmentId, status: 'Draft' };
}

function submitCashAdjustment(payload) {
  var adjustmentId = String(payload.adjustment_id || '').trim();
  if (!adjustmentId) throw new Error('adjustment_id là bắt buộc');
  var adjustment = Repository.CashAdjustments.findById(adjustmentId);
  if (!adjustment) throw new Error('Không tìm thấy Điều chỉnh quỹ: ' + adjustmentId);
  if (adjustment.status !== 'Draft') throw new Error('Chỉ Điều chỉnh quỹ ở trạng thái Draft mới gửi duyệt được (hiện tại: ' + adjustment.status + ')');

  Repository.CashAdjustments.updateStatus(adjustmentId, 'PendingApproval', {});
  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'FINANCE', adjustmentId, 'CASH_ADJUSTMENT_SUBMITTED', payload._callerUser || 'system');
  return { adjustment_id: adjustmentId, status: 'PendingApproval' };
}

function approveCashAdjustment(payload) {
  var adjustmentId = String(payload.adjustment_id || '').trim();
  if (!adjustmentId) throw new Error('adjustment_id là bắt buộc');
  var decision = String(payload.decision || 'approve').toLowerCase();
  if (['approve', 'reject'].indexOf(decision) === -1) throw new Error('decision phải là approve hoặc reject');

  var adjustment = Repository.CashAdjustments.findById(adjustmentId);
  if (!adjustment) throw new Error('Không tìm thấy Điều chỉnh quỹ: ' + adjustmentId);
  if (adjustment.status !== 'PendingApproval') throw new Error('Chỉ Điều chỉnh quỹ ở trạng thái PendingApproval mới duyệt được (hiện tại: ' + adjustment.status + ')');

  var actor = payload._callerUser || 'system';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (decision === 'reject') {
    Repository.CashAdjustments.updateStatus(adjustmentId, 'Draft', {});
    logActivity(ss, 'FINANCE', adjustmentId, 'CASH_ADJUSTMENT_REJECTED', actor);
    logAuditTrail(ss, 'CASH_ADJUSTMENT', adjustmentId, 'REJECTED', adjustment, { status: 'Draft' }, _sanitizeText(payload.reason || '', 300), actor);
    return { adjustment_id: adjustmentId, status: 'Draft' };
  }

  var approvedAt = nowIso();
  Repository.CashAdjustments.updateStatus(adjustmentId, 'Approved', { approved_by: actor, approved_at: approvedAt });
  logActivity(ss, 'FINANCE', adjustmentId, 'CASH_ADJUSTMENT_APPROVED', actor);
  logAuditTrail(ss, 'CASH_ADJUSTMENT', adjustmentId, 'APPROVED', adjustment, { status: 'Approved' }, '', actor);
  return { adjustment_id: adjustmentId, status: 'Approved' };
}

function postCashAdjustment(payload) {
  var adjustmentId = String(payload.adjustment_id || '').trim();
  if (!adjustmentId) throw new Error('adjustment_id là bắt buộc');
  return postDocument('CASH_ADJUSTMENT', adjustmentId, payload._callerUser);
}

function cancelCashAdjustment(payload) {
  var adjustmentId = String(payload.adjustment_id || '').trim();
  if (!adjustmentId) throw new Error('adjustment_id là bắt buộc');
  var adjustment = Repository.CashAdjustments.findById(adjustmentId);
  if (!adjustment) throw new Error('Không tìm thấy Điều chỉnh quỹ: ' + adjustmentId);

  if (adjustment.status === 'Draft' || adjustment.status === 'PendingApproval' || adjustment.status === 'Approved') {
    Repository.CashAdjustments.updateStatus(adjustmentId, 'Cancelled', { cancelled_at: nowIso() });
    logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'FINANCE', adjustmentId, 'CASH_ADJUSTMENT_CANCELLED', payload._callerUser || 'system');
    return { adjustment_id: adjustmentId, status: 'Cancelled' };
  }
  if (adjustment.status === 'Posted') {
    if (!_sanitizeText(payload.reason || '', 300)) throw new Error('Lý do huỷ là bắt buộc đối với Điều chỉnh quỹ đã Posted');
    return reverseDocument('CASH_ADJUSTMENT', adjustmentId, payload.reason, payload._callerUser);
  }
  throw new Error('Điều chỉnh quỹ đã ở trạng thái Cancelled từ trước');
}

function listCashAdjustments(params) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.CASH_ADJUSTMENTS);
  if (!sh || sh.getLastRow() < 2) return { adjustments: [], total: 0 };

  var status   = params && params.status ? String(params.status) : null;
  var fromDate = params && params.from   ? new Date(params.from) : null;
  var toDate   = params && params.to     ? new Date(params.to)   : null;
  var limit    = params && params.limit  ? parseInt(params.limit, 10) : 200;

  var all = sh.getRange(2, 1, sh.getLastRow() - 1, Repository.CashAdjustments._COLS).getValues()
    .map(function(r, i) { return Repository.CashAdjustments._mapRow(r, i + 2); })
    .filter(function(r) {
      if (status && r.status !== status) return false;
      var d = r.created_at ? new Date(r.created_at) : null;
      if (fromDate && d && d < fromDate) return false;
      if (toDate   && d && d > toDate)   return false;
      return true;
    });

  all.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  return {
    adjustments: all.slice(0, limit).map(function(r) { var copy = Object.assign({}, r); delete copy._row; return copy; }),
    total: all.length
  };
}

// ── APPLICATION LAYER — Cash Accounts ────────────────────────────────────────
function listCashAccounts() {
  var balances = Repository.LedgerEntries.balanceForAllAccounts();
  var accounts = Repository.CashAccounts.findAll().map(function(a) {
    var copy = Object.assign({}, a);
    copy.balance = balances[a.account_id];
    return copy;
  });
  return { accounts: accounts };
}

function createCashAccount(payload) {
  var accountId = Repository.CashAccounts.create(payload);
  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'FINANCE', accountId, 'CASH_ACCOUNT_CREATED', payload._callerUser || 'owner');
  return { account_id: accountId };
}

function getCashAccountBalance(params) {
  var accountId = params && params.account_id;
  if (!accountId) throw new Error('account_id là bắt buộc');
  var asOf = params.as_of ? new Date(params.as_of) : null;
  return { account_id: accountId, balance: Repository.LedgerEntries.balanceForAccount(accountId, asOf) };
}

// ── APPLICATION LAYER — Categories ───────────────────────────────────────────
function listCategories(params) {
  var kind = params && params.kind ? String(params.kind).toUpperCase() : null;
  if (kind === 'INCOME' || kind === 'EXPENSE') return { categories: Repository.Categories.findAll(kind) };
  return { categories: Repository.Categories.findAll('INCOME').concat(Repository.Categories.findAll('EXPENSE')) };
}

function createCategory(payload) {
  var kind = String(payload.kind || '').toUpperCase();
  if (['INCOME', 'EXPENSE'].indexOf(kind) === -1) throw new Error('kind phải là INCOME hoặc EXPENSE');
  var group = _sanitizeText(payload.group || '', 60);
  var name  = _sanitizeText(payload.name || '', 60);
  if (!group || !name) throw new Error('group và name là bắt buộc');
  var categoryId = Repository.Categories.create(kind, group, name);
  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'FINANCE', categoryId, 'CATEGORY_CREATED', payload._callerUser || 'owner');
  return { category_id: categoryId };
}

// ── APPLICATION LAYER — Inventory: Suppliers (Phase 02 Bước 1) ──────────────
// createSupplier() tạo cả Suppliers row lẫn Parties row (Type=SUPPLIER) liên
// kết trong cùng 1 lệnh gọi — admin thao tác 1 màn hình, không cần quản lý
// Parties riêng (đúng nguyên tắc "Customer party trỏ Customers, không copy" ở
// finance.md §4.1, áp dụng tương tự: Party chỉ trỏ Suppliers qua RefID).
// LOCK (2026-09-05, sửa lại sau review): Repository.Suppliers.create()/Parties.create() đều tự
// generateId() — mỗi lần TỰ acquire+release LockService.getScriptLock() riêng. Bọc thêm 1 lock ngoài
// ở đây sẽ là waitLock() lồng nhau trong CÙNG 1 execution (2 lớp cho Suppliers, thêm 1 lớp nữa cho
// Parties = lồng 2 tầng) — đúng anti-pattern docs/mops-contract.md §13.6 cảnh báo tránh. 2 write nối
// tiếp không cần khoá thêm vì không có counter/số liệu dùng chung nào bị đọc-sửa-ghi ở tầng
// createSupplier() — race duy nhất (ID trùng) đã nằm trong generateId() và đã tự an toàn.
function createSupplier(payload) {
  var supplierId = Repository.Suppliers.create(payload);
  var partyId = Repository.Parties.create({
    type: 'SUPPLIER', ref_id: supplierId, name: payload.name, contact: payload.phone || ''
  });
  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'INVENTORY', supplierId, 'SUPPLIER_CREATED', payload._callerUser || 'system');
  return { supplier_id: supplierId, party_id: partyId };
}

function listSuppliers(params) {
  var suppliers = Repository.Suppliers.findAll();
  if (params && params.active_only) suppliers = suppliers.filter(function(s) { return s.active; });
  return { suppliers: suppliers };
}

// LOCK (2026-09-05): Repository.Suppliers.update() làm find-row-by-scan rồi setValue riêng lẻ —
// không atomic nếu 2 request sửa cùng NCC chồng nhau. Trước đây không khoá.
function updateSupplier(payload) {
  var supplierId = String(payload.supplier_id || '').trim();
  if (!supplierId) throw new Error('supplier_id là bắt buộc');
  // Dùng _withLock (mops_00.js) thay vì tự khoá tay — reuse helper có sẵn cho đúng loại mutation này.
  return _withLock(function() {
    Repository.Suppliers.update(supplierId, payload);
    logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'INVENTORY', supplierId, 'SUPPLIER_UPDATED', payload._callerUser || 'staff');
    return { supplier_id: supplierId, updated: true };
  });
}

// Chỉ cho xoá khi CHƯA có Phiếu nhập hàng nào tham chiếu (Draft hay Posted đều chặn) — tránh
// PurchaseOrders.SupplierID mồ côi. NCC đã từng nhập hàng muốn ngừng hợp tác thì dùng Active=false
// (action update_supplier) thay vì xoá — dữ liệu lịch sử phải giữ nguyên cho đối chiếu kế toán.
function deleteSupplier(payload) {
  var supplierId = String(payload.supplier_id || '').trim();
  if (!supplierId) throw new Error('supplier_id là bắt buộc');
  // LOCK (2026-09-05, dùng _withLock có sẵn): bọc CẢ check-then-delete — trước đây không khoá, 1
  // phiếu nhập hàng có thể được tạo giữa lúc check hasPurchaseOrders và lúc remove(), để lại
  // PurchaseOrders.SupplierID mồ côi (TOCTOU, đã ghi nhận ở audit).
  return _withLock(function() {
    var hasPurchaseOrders = Repository.PurchaseOrders.findAll().some(function(po) { return po.supplier_id === supplierId; });
    if (hasPurchaseOrders) {
      throw new Error('Không thể xoá — nhà cung cấp này đã có phiếu nhập hàng. Chuyển sang "Ngừng hợp tác" thay vì xoá.');
    }
    Repository.Suppliers.remove(supplierId);
    logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'INVENTORY', supplierId, 'SUPPLIER_DELETED', payload._callerUser || 'staff');
    return { supplier_id: supplierId, deleted: true };
  });
}

// Chi tiết 1 NCC (Drawer "Xem chi tiết", review 2026-07-16) — hồ sơ + phiếu nhập hàng luôn trả
// (gate inventory.view, xem doGet). Công nợ (Bills qua Party liên kết) là DỮ LIỆU TÀI CHÍNH — chỉ
// trả kèm khi caller có `finance.view`, cùng gate với list_bills — inventory.view KHÔNG đủ quyền
// xem nợ, không được vô tình lộ qua endpoint này.
function getSupplierDetail(supplierId, staffToken) {
  if (!supplierId) throw new Error('supplier_id is required');
  var supplier = Repository.Suppliers.findById(supplierId);
  if (!supplier) return { found: false };

  var purchaseOrders = Repository.PurchaseOrders.findAll()
    .filter(function(po) { return po.supplier_id === supplierId; })
    .sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

  var totalPurchased = purchaseOrders
    .filter(function(po) { return po.status === 'Posted'; })
    .reduce(function(sum, po) { return sum + (po.total_amount || 0); }, 0);

  var result = {
    found:                 true,
    supplier:              supplier,
    total_purchased:       totalPurchased,
    purchase_order_count:  purchaseOrders.length,
    purchase_orders:       purchaseOrders.slice(0, 20) // gần nhất — đủ cho Drawer đối chiếu, không phải báo cáo đầy đủ
  };

  var staff = requireStaffToken(staffToken);
  var role  = (staff.role || 'staff').toUpperCase();
  var perms = _getPermissions(role);
  var canViewFinanceOps = role === 'OWNER' || perms.indexOf('*') !== -1 || perms.indexOf('finance.view') !== -1;
  if (canViewFinanceOps) {
    var party = Repository.Parties.findByRef('SUPPLIER', supplierId);
    var bills = party ? listBills({ party_id: party.party_id }).bills : [];
    result.total_outstanding = bills.reduce(function(sum, b) { return sum + Math.max(0, b.remaining_amount); }, 0);
    result.bills = bills;
  }

  return result;
}

// ── Branches (đóng gap §19/§20 mops.md, review 31) ──────────────────────────
function listBranches() {
  return { branches: Repository.Branches.findAll() };
}

// ============================================================
// Zero-Wait Path (2026-08-10) — đóng gap list_ledger_entries / list_audit_trail (memory 2026-07-11)
// LedgerEntries: cột entry_id | doc_type | doc_id | posted_at | account_id | direction | amount |
//                credit_account | tax_amount | tax_account | memo | created_at
// AuditTrail:    cột id | entity_type | entity_id | action | before_json | after_json | actor | at
// Cả 2 dùng _cachedArrayRead — bump theo _analyticsGen (mọi write finance/order bump).
// ============================================================
function listLedgerEntries(params) {
  var limit    = params && params.limit ? Math.min(parseInt(params.limit, 10) || 200, 500) : 200;
  var from     = params && params.from ? new Date(params.from) : null;
  var to       = params && params.to   ? new Date(params.to)   : null;
  var docType  = params && params.doc_type  ? String(params.doc_type).trim() : '';
  var account  = params && params.account_id ? String(params.account_id).trim() : '';

  var all = _cachedArrayRead('ledger_entries_all', function() {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.LEDGER_ENTRIES);
    if (!sh || sh.getLastRow() < 2) return [];
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues();
    return rows.map(function(r) {
      return {
        entry_id:       String(r[0] || ''),
        doc_type:       String(r[1] || ''),
        doc_id:         String(r[2] || ''),
        posted_at:      r[3] || '',
        account_id:     String(r[4] || ''),
        direction:      String(r[5] || ''),
        amount:         Number(r[6]) || 0,
        credit_account: String(r[7] || ''),
        tax_amount:     Number(r[8]) || 0,
        tax_account:    String(r[9] || ''),
        memo:           String(r[10] || ''),
        created_at:     r[11] || ''
      };
    });
  });

  var results = all.filter(function(e) {
    if (docType && e.doc_type !== docType) return false;
    if (account && e.account_id !== account && e.credit_account !== account) return false;
    if (from) { var d1 = e.posted_at ? new Date(e.posted_at) : null; if (!d1 || d1 < from) return false; }
    if (to)   { var d2 = e.posted_at ? new Date(e.posted_at) : null; if (!d2 || d2 > to)   return false; }
    return true;
  });

  results.sort(function(a, b) { return new Date(b.posted_at || 0) - new Date(a.posted_at || 0); });
  return { entries: results.slice(0, limit), total: results.length };
}

function listAuditTrail(params) {
  var limit    = params && params.limit ? Math.min(parseInt(params.limit, 10) || 200, 500) : 200;
  var entity   = params && params.entity_type ? String(params.entity_type).trim() : '';
  var entityId = params && params.entity_id ? String(params.entity_id).trim() : '';
  var actor    = params && params.actor ? String(params.actor).trim() : '';
  var from     = params && params.from ? new Date(params.from) : null;
  var to       = params && params.to   ? new Date(params.to)   : null;

  var all = _cachedArrayRead('audit_trail_all', function() {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.AUDIT_TRAIL);
    if (!sh || sh.getLastRow() < 2) return [];
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues();
    return rows.map(function(r) {
      return {
        id:           String(r[0] || ''),
        entity_type:  String(r[1] || ''),
        entity_id:    String(r[2] || ''),
        action:       String(r[3] || ''),
        before_json:  String(r[4] || ''),
        after_json:   String(r[5] || ''),
        actor:        String(r[6] || ''),
        at:           r[7] || ''
      };
    });
  });

  var results = all.filter(function(a) {
    if (entity   && a.entity_type !== entity) return false;
    if (entityId && a.entity_id !== entityId) return false;
    if (actor    && a.actor !== actor) return false;
    if (from) { var d1 = a.at ? new Date(a.at) : null; if (!d1 || d1 < from) return false; }
    if (to)   { var d2 = a.at ? new Date(a.at) : null; if (!d2 || d2 > to)   return false; }
    return true;
  });

  results.sort(function(a, b) { return new Date(b.at || 0) - new Date(a.at || 0); });
  return { entries: results.slice(0, limit), total: results.length };
}

function createBranch(payload) {
  var branchId = Repository.Branches.create(payload);
  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'BRANCH', branchId, 'BRANCH_CREATED', payload._callerUser || 'system');
  return { branch_id: branchId };
}

function updateBranch(payload) {
  var branchId = String(payload.branch_id || '').trim();
  if (!branchId) throw new Error('branch_id là bắt buộc');
  Repository.Branches.update(branchId, payload);
  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'BRANCH', branchId, 'BRANCH_UPDATED', payload._callerUser || 'system');
  return { branch_id: branchId };
}

// ── APPLICATION LAYER — Inventory: Purchase Orders (Phase 02 Bước 2) ────────
// Cập nhật 2026-07-10: Hướng A đã bỏ (SAPO không quản lý kho thật cho store này) —
// postPurchaseOrder() giờ CỘNG trực tiếp Products.InventoryQty (mọi Source, xem
// _adjustInventoryQty()) song song với ghi InventoryMovements (log audit + nguồn giá
// vốn cho _calcAvgCost(), Phase 02 Bước 4 — không đổi).
function createPurchaseOrder(payload) {
  var supplier = Repository.Suppliers.findById(payload.supplier_id);
  if (!supplier) throw new Error('Không tìm thấy nhà cung cấp: ' + payload.supplier_id);
  var items = payload.items || [];
  if (!items.length) throw new Error('Phiếu nhập hàng cần ít nhất 1 dòng sản phẩm');

  var allocationBasis = String(payload.allocation_basis || 'QTY').toUpperCase();
  if (['QTY', 'WEIGHT'].indexOf(allocationBasis) === -1) {
    throw new Error('allocation_basis phải là QTY hoặc WEIGHT');
  }
  var paymentTerms = String(payload.payment_terms || 'FULL').toUpperCase();
  if (['FULL', 'DEPOSIT'].indexOf(paymentTerms) === -1) {
    throw new Error('payment_terms phải là FULL hoặc DEPOSIT');
  }

  var totalAmount = 0;
  items.forEach(function(item, idx) {
    var qty = Number(item.qty), unitCost = Number(item.unit_cost);
    if (!qty || qty <= 0) throw new Error('Dòng ' + (idx + 1) + ': Số lượng phải > 0');
    if (!unitCost || unitCost <= 0) throw new Error('Dòng ' + (idx + 1) + ': Giá nhập phải > 0');
    // Phân bổ theo trọng lượng bắt buộc phải có Weight > 0 mỗi dòng, nếu không chia đều SUM/0
    // sẽ vô nghĩa (mind map dòng 41: "SUM/(kg or số lượng)" — WEIGHT không có kg thì không chia được).
    if (allocationBasis === 'WEIGHT' && !(Number(item.weight) > 0)) {
      throw new Error('Dòng ' + (idx + 1) + ': cần Weight > 0 khi phân bổ chi phí theo trọng lượng (WEIGHT)');
    }
    totalAmount += qty * unitCost;
  });

  // ✅ Cọc theo SỐ TIỀN cố định (VNĐ), không theo % (chốt 2026-07-11, review 21) — % tạo số lẻ khi
  // lập Phiếu chi, hộ kinh doanh muốn nhập thẳng số tròn. Validate cần totalAmount nên đặt sau vòng
  // lặp items ở trên (khác vị trí cũ — lúc đó còn theo %, không phụ thuộc totalAmount).
  var depositAmount = Number(payload.deposit_amount) || 0;
  if (paymentTerms === 'DEPOSIT' && !(depositAmount > 0 && depositAmount <= totalAmount)) {
    throw new Error('deposit_amount phải > 0 và không vượt quá tổng giá trị nhập khi payment_terms=DEPOSIT');
  }

  var purchaseOrderId = Repository.PurchaseOrders.create({
    supplier_id: payload.supplier_id, order_date: payload.order_date,
    total_amount: totalAmount, note: payload.note, created_by: payload.created_by,
    shipping_cost: Number(payload.shipping_cost) || 0,
    storage_cost: Number(payload.storage_cost) || 0,
    vat_amount: Number(payload.vat_amount) || 0,
    allocation_basis: allocationBasis,
    discount_amount: Number(payload.discount_amount) || 0,
    payment_terms: paymentTerms,
    deposit_amount: depositAmount
  });
  Repository.PurchaseItems.appendItems(purchaseOrderId, items);
  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'INVENTORY', purchaseOrderId, 'PURCHASE_ORDER_CREATED', payload._callerUser || 'system');
  return { purchase_order_id: purchaseOrderId, total_amount: totalAmount };
}

// Sửa phiếu Draft (review 2026-07-16) — CHỈ cho phép khi còn Draft (chưa Post → chưa có
// InventoryMovements/Bill nào phụ thuộc dữ liệu cũ). Validate giống createPurchaseOrder() y
// nguyên. Items thay TOÀN BỘ (xoá cũ, ghi lại mới) — Draft chưa Post nên chưa có AllocatedCost/
// UnitCostLanded gì cần giữ lại, không cần diff từng dòng.
function updatePurchaseOrder(payload) {
  var purchaseOrderId = String(payload.purchase_order_id || '').trim();
  if (!purchaseOrderId) throw new Error('purchase_order_id là bắt buộc');

  var po = Repository.PurchaseOrders.findById(purchaseOrderId);
  if (!po) throw new Error('Không tìm thấy Phiếu nhập hàng: ' + purchaseOrderId);
  if (po.status !== 'Draft') throw new Error('Chỉ sửa được Phiếu nhập hàng đang ở trạng thái Draft');

  var supplier = Repository.Suppliers.findById(payload.supplier_id);
  if (!supplier) throw new Error('Không tìm thấy nhà cung cấp: ' + payload.supplier_id);
  var items = payload.items || [];
  if (!items.length) throw new Error('Phiếu nhập hàng cần ít nhất 1 dòng sản phẩm');

  var allocationBasis = String(payload.allocation_basis || 'QTY').toUpperCase();
  if (['QTY', 'WEIGHT'].indexOf(allocationBasis) === -1) {
    throw new Error('allocation_basis phải là QTY hoặc WEIGHT');
  }
  var paymentTerms = String(payload.payment_terms || 'FULL').toUpperCase();
  if (['FULL', 'DEPOSIT'].indexOf(paymentTerms) === -1) {
    throw new Error('payment_terms phải là FULL hoặc DEPOSIT');
  }

  var totalAmount = 0;
  items.forEach(function(item, idx) {
    var qty = Number(item.qty), unitCost = Number(item.unit_cost);
    if (!qty || qty <= 0) throw new Error('Dòng ' + (idx + 1) + ': Số lượng phải > 0');
    if (!unitCost || unitCost <= 0) throw new Error('Dòng ' + (idx + 1) + ': Giá nhập phải > 0');
    if (allocationBasis === 'WEIGHT' && !(Number(item.weight) > 0)) {
      throw new Error('Dòng ' + (idx + 1) + ': cần Weight > 0 khi phân bổ chi phí theo trọng lượng (WEIGHT)');
    }
    totalAmount += qty * unitCost;
  });

  var depositAmount = Number(payload.deposit_amount) || 0;
  if (paymentTerms === 'DEPOSIT' && !(depositAmount > 0 && depositAmount <= totalAmount)) {
    throw new Error('deposit_amount phải > 0 và không vượt quá tổng giá trị nhập khi payment_terms=DEPOSIT');
  }

  // Guard cọc đã trả (review 2026-07-16) — deposit trước khi Post đi qua PaymentVoucher riêng
  // (purchase_order_id, chưa có BillID — xem openDepositVoucherForm()/postPurchaseOrder()). Tổng
  // tiền mới không được thấp hơn số đã Post trả NCC, tránh Bill lúc Post (=total_amount) sai lệch
  // với số NCC đã thực nhận.
  var paidDeposit = Repository.PaymentVouchers.findByPurchaseOrderId(purchaseOrderId)
    .filter(function(v) { return v.status === 'Posted'; })
    .reduce(function(sum, v) { return sum + v.total_amount; }, 0);
  if (paidDeposit > 0 && totalAmount < paidDeposit) {
    throw new Error('Tổng tiền mới (' + totalAmount.toLocaleString('vi-VN') + 'đ) thấp hơn số đã trả cọc NCC (' + paidDeposit.toLocaleString('vi-VN') + 'đ) — không thể lưu.');
  }

  Repository.PurchaseOrders.update(purchaseOrderId, {
    supplier_id: payload.supplier_id, order_date: payload.order_date, note: payload.note,
    total_amount: totalAmount, shipping_cost: Number(payload.shipping_cost) || 0,
    storage_cost: Number(payload.storage_cost) || 0, vat_amount: Number(payload.vat_amount) || 0,
    allocation_basis: allocationBasis, discount_amount: Number(payload.discount_amount) || 0,
    payment_terms: paymentTerms, deposit_amount: depositAmount
  });

  Repository.PurchaseItems.deleteByPurchaseOrderId(purchaseOrderId);
  Repository.PurchaseItems.appendItems(purchaseOrderId, items);

  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'INVENTORY', purchaseOrderId, 'PURCHASE_ORDER_UPDATED', payload._callerUser || 'system');
  return { purchase_order_id: purchaseOrderId, total_amount: totalAmount };
}

function postPurchaseOrder(payload) {
  var purchaseOrderId = payload.purchase_order_id;
  var po = Repository.PurchaseOrders.findById(purchaseOrderId);
  if (!po) throw new Error('Không tìm thấy Phiếu nhập hàng: ' + purchaseOrderId);
  if (po.status !== 'Draft') throw new Error('Chỉ Post được Phiếu nhập hàng đang ở trạng thái Draft');

  var supplier = Repository.Suppliers.findById(po.supplier_id);
  if (!supplier) throw new Error('Không tìm thấy nhà cung cấp: ' + po.supplier_id);
  var items = Repository.PurchaseItems.findByPurchaseOrderId(purchaseOrderId);
  if (!items.length) throw new Error('Phiếu nhập hàng không có dòng sản phẩm nào');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    po = Repository.PurchaseOrders.findById(purchaseOrderId); // đọc lại sau khi có lock
    if (po.status !== 'Draft') throw new Error('Phiếu nhập hàng đã được Post/Huỷ trước đó');

    // Phân bổ chi phí phụ (vận chuyển + lưu kho + VAT − chiết khấu) vào giá vốn từng dòng, theo
    // đúng mind map dòng 41 "SUM/(kg or số lượng)" — chia theo AllocationBasis của phiếu
    // (docs/mops.md §6). Tính TRONG lock, TRƯỚC khi ghi InventoryMovements — UnitCostLanded
    // (không phải UnitCost thô) mới là giá vốn thật dùng để nhập kho + tính _calcAvgCost() sau.
    var costPool = po.shipping_cost + po.storage_cost + po.vat_amount - po.discount_amount;
    var totalBasis = items.reduce(function(sum, it) {
      return sum + (po.allocation_basis === 'WEIGHT' ? it.weight : it.qty);
    }, 0);
    items.forEach(function(item) {
      var basisValue = po.allocation_basis === 'WEIGHT' ? item.weight : item.qty;
      var allocatedCost = totalBasis > 0 ? costPool * basisValue / totalBasis : 0;
      var unitCostLanded = item.qty > 0 ? (item.qty * item.unit_cost + allocatedCost) / item.qty : item.unit_cost;
      item.allocated_cost = allocatedCost;
      item.unit_cost_landed = unitCostLanded;
      Repository.PurchaseItems.setAllocatedCost(item.purchase_item_id, allocatedCost, unitCostLanded);
    });

    items.forEach(function(item) {
      // Dùng UnitCostLanded (đã gồm phân bổ chi phí phụ), KHÔNG dùng item.unit_cost thô — đây
      // là giá vốn thật sẽ được _calcAvgCost() đọc lại khi tính giá vốn bình quân lúc bán.
      Repository.InventoryMovements.append({
        product_id: item.product_id, variant_id: item.variant_id, type: 'IN', qty: item.qty, unit_cost: item.unit_cost_landed,
        source_type: 'PURCHASE', source_ref: purchaseOrderId,
        note: 'Nhập hàng từ ' + supplier.name + (item.lot_code ? ' — Lô ' + item.lot_code : ''),
        created_by: payload._callerUser || 'system'
      });
      _adjustInventoryQty(SpreadsheetApp.getActiveSpreadsheet(), item.product_id, item.variant_id, item.qty);
    });

    var party = Repository.Parties.findByRef('SUPPLIER', po.supplier_id);
    if (!party) throw new Error('Nhà cung cấp chưa có Party liên kết — dữ liệu không nhất quán: ' + po.supplier_id);
    // Bill.Amount = TotalAmount (giá nhập thuần) + chi phí phụ − chiết khấu — chi phí vận
    // chuyển GỘP vào công nợ NCC (đã chốt docs/mops.md §6, review 10), không tách riêng.
    var billAmount = po.total_amount + po.shipping_cost + po.storage_cost + po.vat_amount - po.discount_amount;
    var billId = autoCreateBill(purchaseOrderId, party.party_id, billAmount, payload._callerUser);

    // Retroactive-link BillID cho phiếu cọc NCC trả TRƯỚC khi Post (docs/mops.md §6, bước 3) —
    // lúc Post cọc chưa có Bill nào để gán (BillID='' tạm thời), giờ Bill vừa tạo thì gán lại.
    // CHỈ đổi khoá liên kết, KHÔNG ghi lại LedgerEntries (bút toán gốc đã đúng từ lúc Post cọc).
    // _recalcBillStatus() không tự trigger được vì phiếu cọc Posted TRƯỚC khi Bill tồn tại — phải
    // gọi tay đúng 1 lần ở đây, nếu không Bill.Status đứng yên ở OPEN dù cọc đã trả.
    var depositVouchers = Repository.PaymentVouchers.findByPurchaseOrderId(purchaseOrderId)
      .filter(function(v) { return !v.bill_id && v.status === 'Posted'; });
    if (depositVouchers.length) {
      depositVouchers.forEach(function(v) { Repository.PaymentVouchers.setBillId(v.voucher_id, billId); });
      _recalcBillStatus(billId);
    }

    var postedAt = nowIso();
    Repository.PurchaseOrders.updateStatus(purchaseOrderId, 'Posted', { posted_at: postedAt });
  } finally {
    lock.releaseLock();
  }

  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'INVENTORY', purchaseOrderId, 'PURCHASE_ORDER_POSTED', payload._callerUser || 'system');
  return { purchase_order_id: purchaseOrderId, status: 'Posted' };
}

// Huỷ Draft → huỷ thẳng. Huỷ Posted → CHỈ cho phép nếu Bill liên quan chưa có
// PaymentVoucher Posted nào trả (chưa trả đồng nào cho NCC) — nếu đã trả, đây
// là quyết định nghiệp vụ (hoàn tiền NCC) không phải lỗi kỹ thuật để tự xử lý,
// nên chặn và báo rõ lý do thay vì tự động đảo ngược thanh toán.
function cancelPurchaseOrder(payload) {
  var purchaseOrderId = payload.purchase_order_id;
  var po = Repository.PurchaseOrders.findById(purchaseOrderId);
  if (!po) throw new Error('Không tìm thấy Phiếu nhập hàng: ' + purchaseOrderId);
  if (po.status === 'Cancelled') throw new Error('Phiếu nhập hàng đã bị huỷ trước đó');

  if (po.status === 'Draft') {
    // Lỗ hổng đã biết (docs/mops.md §6, review 11) — PO còn Draft (chưa có Bill) nhưng đã có
    // Phiếu chi cọc trả trước (PurchaseOrderID=phiếu này, Status='Posted') thì KHÔNG được huỷ
    // thẳng, nếu không tiền cọc đã trả NCC sẽ "mất dấu" (PurchaseOrderID trỏ tới PO đã Cancelled,
    // không có Bill để đối chiếu).
    var depositPaid = Repository.PaymentVouchers.findByPurchaseOrderId(purchaseOrderId)
      .some(function(v) { return v.status === 'Posted'; });
    if (depositPaid) {
      throw new Error('Đã có Phiếu chi cọc trả trước cho phiếu nhập này — không thể huỷ trực tiếp, cần xử lý hoàn cọc thủ công trước');
    }
    Repository.PurchaseOrders.updateStatus(purchaseOrderId, 'Cancelled', { cancelled_at: nowIso() });
    logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'INVENTORY', purchaseOrderId, 'PURCHASE_ORDER_CANCELLED', payload._callerUser || 'system');
    return { purchase_order_id: purchaseOrderId, status: 'Cancelled' };
  }

  // po.status === 'Posted'
  var bill = Repository.Bills.findBySource('MOPS', 'PURCHASE_ORDER', purchaseOrderId);
  if (bill && _sumPostedVouchersForBill(bill.bill_id) > 0) {
    throw new Error('Đã có Phiếu chi trả nhà cung cấp cho phiếu nhập này — không thể huỷ trực tiếp, cần xử lý hoàn tiền thủ công trước');
  }

  var movements = Repository.InventoryMovements.findBySource('PURCHASE', purchaseOrderId)
    .filter(function(m) { return m.type === 'IN'; });
  movements.forEach(function(m) {
    Repository.InventoryMovements.append({
      product_id: m.product_id, variant_id: m.variant_id, type: 'OUT', qty: m.qty, unit_cost: m.unit_cost,
      source_type: 'PURCHASE', source_ref: purchaseOrderId,
      note: '[Huỷ] Đối ứng cho ' + m.movement_id, created_by: payload._callerUser || 'system'
    });
  });
  if (bill) Repository.Bills.updateStatus(bill.bill_id, 'CANCELLED');
  Repository.PurchaseOrders.updateStatus(purchaseOrderId, 'Cancelled', { cancelled_at: nowIso() });

  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'INVENTORY', purchaseOrderId, 'PURCHASE_ORDER_CANCELLED', payload._callerUser || 'system');
  return { purchase_order_id: purchaseOrderId, status: 'Cancelled' };
}

function listPurchaseOrders(params) {
  var orders = Repository.PurchaseOrders.findAll();
  if (params && params.status) orders = orders.filter(function(o) { return o.status === params.status; });
  orders.forEach(function(o) { o.items = Repository.PurchaseItems.findByPurchaseOrderId(o.purchase_order_id); });
  return { purchase_orders: orders };
}

// ── APPLICATION LAYER — AP: Bills (Phase 04 Bước 3, docs/architecture/finance.md §2.1, §4.3) ──
// Gọi từ postPurchaseOrder() khi PO → Posted. Idempotent qua findBySource — nếu
// postPurchaseOrder() lỡ bị gọi lại (không nên xảy ra vì đã bọc LockService, nhưng
// giữ đúng nguyên tắc bất biến #3 ở finance.md §7.5 cho mọi nguồn tự động).
function autoCreateBill(purchaseOrderId, partyId, amount, callerUser) {
  var existing = Repository.Bills.findBySource('MOPS', 'PURCHASE_ORDER', purchaseOrderId);
  if (existing) return existing.bill_id;
  var billId = Repository.Bills.create({
    party_id: partyId, amount: amount,
    source_system: 'MOPS', source_type: 'PURCHASE_ORDER', source_ref: purchaseOrderId
  });
  logActivity(SpreadsheetApp.getActiveSpreadsheet(), 'FINANCE', billId, 'BILL_CREATED', callerUser || 'system');
  return billId;
}

// Tổng tiền đã trả cho 1 Bill = SUM PaymentVoucher.TotalAmount có bill_id này VÀ đã Posted
// (Draft/PendingApproval/Approved chưa tính vì chưa thật sự chi tiền — đúng nguyên tắc "Balance/
// Report luôn tính từ chứng từ đã Posted", finance.md §9.3).
function _sumPostedVouchersForBill(billId) {
  return Repository.PaymentVouchers.findByBillId(billId)
    .filter(function(v) { return v.status === 'Posted'; })
    .reduce(function(sum, v) { return sum + v.total_amount; }, 0);
}

// Gọi từ _postDocumentImpl() (nhánh PAYMENT_VOUCHER) ngay sau khi 1 PaymentVoucher có bill_id
// được Posted — tính lại Bills.Status, KHÔNG lưu số đã trả tĩnh ở đâu (đúng nguyên tắc "Balance
// không lưu, luôn tính", finance.md §9.2, áp dụng tương tự cho AP).
function _recalcBillStatus(billId) {
  var bill = Repository.Bills.findById(billId);
  if (!bill) return; // không throw — không được phép chặn postDocument() vì dữ liệu Bill lạ
  var paid = _sumPostedVouchersForBill(billId);
  var status = paid <= 0 ? 'OPEN' : (paid < bill.amount ? 'PARTIAL' : 'PAID');
  Repository.Bills.updateStatus(billId, status);
}

function listBills(params) {
  var bills = Repository.Bills.findAll(params);
  bills.forEach(function(b) { b.paid_amount = _sumPostedVouchersForBill(b.bill_id); b.remaining_amount = b.amount - b.paid_amount; });
  return { bills: bills };
}

// ── SALES → FINANCE INTEGRATION (docs/architecture/finance.md §13.1, §7.5) ──
// Gọi từ updateOrderStatus() khi PaymentStatus → PAID. KHÔNG throw ra ngoài ở
// call site (xem updateOrderStatus()) — 1 lỗi Finance không được phép chặn xác
// nhận thanh toán Sales đã thành công.
//
// Idempotent theo bộ khoá (SourceSystem, SourceType, SourceRef) = ('MOPS',
// 'PAYMENT', paymentId) — nguyên tắc "1 Business Event chỉ sinh 1 Financial
// Document" (§7.5). Bước kiểm tra-trùng + tạo Draft bọc trong LockService
// RIÊNG (không lồng vào lock của postDocument() bên dưới — postDocument() tự
// khoá lại từ đầu cho bước Post, xem §8.5. LockService không đảm bảo an toàn
// khi 1 execution tự gọi waitLock() lần 2 trong lúc đang giữ lock — tách 2
// đoạn khoá độc lập, chạy tuần tự, để không có rủi ro tự deadlock).
function autoCreateReceipt(orderId, paymentId, amount, store, preferAccountType) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // R5 (2026-08-21) · Idempotency VERIFIED — findBySource + reverseDocument's Posted-only guard
    // (mops_04.js:151) đã chặn cả 2 chiều: (a) không tạo Receipt trùng cho cùng paymentId, (b) không
    // reverse Receipt đã Cancelled. Luồng delivered→returned→delivered lại: autoCreateReceipt trả
    // null lần 2 (vì findBySource vẫn thấy row cũ Cancelled) → không double-post. Không cần thay
    // đổi thêm. Nếu nghiệp vụ muốn tạo Receipt MỚI cho lần re-delivered (khách trả tiền lần 2),
    // cần bàn thiết kế Receipt-per-attempt riêng — không thuộc scope R5.
    if (Repository.Receipts.findBySource('MOPS', 'PAYMENT', paymentId)) return null; // đã tạo trước đó

    var account = _getDefaultSalesCashAccount(preferAccountType);
    if (!account) throw new Error('Chưa có CashAccount nào Active để nhận doanh thu bán hàng — vào tab Tài chính tạo tài khoản trước');

    // This path already owns ScriptLock for idempotency. Do not call Repository.Receipts.create()
    // or postDocument(): both acquire the same lock and then reread the Receipt just appended.
    // Create + post the no-line auto receipt here, still under the one lock, so PAID remains
    // financially synchronous while avoiding nested-lock waits and three full-sheet rereads.
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var receiptsSh = ss.getSheetByName(SHEET.RECEIPTS);
    var receiptId = _peekNextIds(receiptsSh, 'PT', 6, 1)[0];
    var createdAt = nowIso();
    var receiptRow = receiptsSh.getLastRow() + 1;
    var note = 'Tự động từ đơn hàng ' + orderId + (store ? ' (' + store + ')' : '');
    receiptsSh.appendRow([
      receiptId, '', account.account_id, 'Draft', '', createdAt, amount,
      note, 'MOPS', 'PAYMENT', paymentId, 'system', createdAt, '', ''
    ]);
    _forceNumberFormat(receiptsSh, receiptRow, [7]);

    var postingDate = nowIso();
    var ledgerSh = ss.getSheetByName(SHEET.LEDGER_ENTRIES);
    var ledgerId = _peekNextIds(ledgerSh, 'LG', 8, 1)[0];
    ledgerSh.appendRow([
      ledgerId, 'RECEIPT', receiptId, postingDate, account.account_id, 'IN', amount,
      '', '', '', note || 'Thu tiền', nowIso()
    ]);
    _forceNumberFormat(ledgerSh, ledgerSh.getLastRow(), [7]);

    // Match postDocument(RECEIPT)'s final state and audit trail without reading Receipt/Lines again.
    receiptsSh.getRange(receiptRow, 4, 1, 2).setValues([['Posted', postingDate]]);
    receiptsSh.getRange(receiptRow, 14).setValue(postingDate);
    logActivity(ss, 'FINANCE', receiptId, 'DOCUMENT_POSTED', 'staff:system');
    logAuditTrail(ss, 'RECEIPT', receiptId, 'POSTED', {
      receipt_id: receiptId, party_id: '', account_id: account.account_id,
      status: 'Draft', total_amount: amount, note: note
    }, { status: 'Posted' }, '', 'system');
    return receiptId;
  } finally {
    lock.releaseLock();
  }
}

// COD khi giao thành công (phase vận chuyển 2026-07-17, sửa lại ở C1) — gọi từ _applyShippingStatus
// khi FulfillmentStatus→delivered. ⚠️ KHÔNG tạo Receipt/đặt PAID ngay nữa: với đối soát ĐTVC (C1),
// tiền COD chỉ "sạch" về khi ĐTVC chuyển khoản (bước "Đã thanh toán" của phiếu đối soát), nếu ghi
// Receipt tại đây sẽ ĐẾM TIỀN 2 LẦN. Ở đây chỉ log "COD đã giao, chờ đối soát" — Receipt/PaymentStatus
// thật sinh ở payReconciliation(). Đơn VietQR (CODAmount=0) đã PAID lúc thanh toán, không liên quan.
function _onShippingDelivered(ss, orderId, actor, settings) {
  var codAmount = _shipmentGet(ss, orderId).cod_amount;
  if (codAmount <= 0) return; // không phải đơn COD — không có gì để chờ đối soát
  logActivity(ss, 'ORDER', orderId, 'COD_DELIVERED_PENDING_RECON', actor || 'system:cod');
}

// Tài khoản mặc định nhận doanh thu bán hàng: ưu tiên tài khoản Active đầu tiên
// Type=BANK (khớp thực tế — mọi thanh toán VietQR về ngân hàng), fallback về bất
// kỳ tài khoản Active nào. KHÔNG hardcode AccountID (generateId() sinh ID khác
// nhau mỗi lần setupSheets() chạy trên spreadsheet mới).
// preferType (2026-07-21): ép ưu tiên 1 loại tài khoản khác — thu tiền mặt (CASH)
// phải vào quỹ Type=CASH, không phải ngân hàng. Không có loại ưu tiên → giữ mặc
// định BANK-first. Loại ưu tiên không có tài khoản Active → fallback BANK → bất kỳ.
function _getDefaultSalesCashAccount(preferType) {
  var all = Repository.CashAccounts.findAll().filter(function(a) { return a.active; });
  if (preferType) {
    var preferred = all.filter(function(a) { return a.type === String(preferType).toUpperCase(); });
    if (preferred.length) return preferred[0];
  }
  var bank = all.filter(function(a) { return a.type === 'BANK'; });
  return bank[0] || all[0] || null;
}

// ============================================================
// MIGRATE V1 → FINANCE CORE (docs/implementation/phase-01-finance-core.md mục
// "Migrate V1"). Chạy 1 lần, THỦ CÔNG — action='migrate_v1_to_finance_core',
// chỉ OWNER (requireOwner() ở router, không dùng finance.admin — đây là thao
// tác rủi ro cao nhất trong toàn bộ Finance Core, bulk-tạo chứng từ trên toàn
// bộ lịch sử CashTransactions cùng lúc).
//
// Nguyên tắc thiết kế:
// - CHỈ migrate CashTransactions.Status='ACTIVE' — VOID chưa từng có hiệu lực
//   tiền thật, bỏ qua, không tạo chứng từ tương ứng.
// - Idempotent theo cột MigratedTo tự thêm cuối sheet CashTransactions (cột
//   K/L) — chạy lại bao nhiêu lần cũng chỉ xử lý dòng CHƯA có MigratedTo. Riêng
//   nhánh INCOME có thêm lớp bảo vệ thứ 2: kiểm tra Repository.Receipts.
//   findBySource('V1_MIGRATION','CASH_TRANSACTION', txId) trước khi tạo — che
//   đúng khoảng hở nếu 1 lượt chạy trước bị dừng giữa chừng (hết 6 phút) ngay
//   sau khi Post xong Receipt nhưng TRƯỚC khi kịp ghi lại MigratedTo. Nhánh
//   EXPENSE không có khoá tương đương (PaymentVouchers không có cột Source*) —
//   chấp nhận rủi ro còn lại nhỏ, giảm thiểu bằng cách luôn dry-run trước.
// - PostingDate của LedgerEntry sinh ra LẤY THEO CreatedAt gốc của dòng V1 (qua
//   tham số postingDateOverride của postDocument(), xem ghi chú tại đó) — giữ
//   đúng timeline lịch sử cho báo cáo theo kỳ/số dư as-of-date. Receipts/
//   PaymentVouchers.CreatedAt (ngày tạo dòng chứng từ) vẫn là ngày CHẠY migrate
//   — đúng bản chất "ghi nhận muộn 1 sự kiện đã xảy ra trong quá khứ".
// - Mỗi dòng Post thẳng luôn (Draft→Posted) — dữ liệu quá khứ, không cần lại từ
//   đầu vòng đời duyệt Payment Voucher (đi theo path tắt, hợp lệ từ đợt hardening
//   2026-07-07, mops-contract.md §14.2).
// - KHÔNG xoá/sửa dữ liệu gốc trên CashTransactions — chỉ ghi thêm MigratedTo/
//   MigratedAt. Archive (đổi tên sheet, tắt hẳn tab "Sổ quỹ (V1)") là bước THỦ
//   CÔNG riêng, làm sau khi admin đối chiếu số liệu migrate khớp.
// - Chạy theo lô (`options.limit`, mặc định 50) để tránh vượt giới hạn 6 phút/
//   lần thực thi của Apps Script — gọi lại nhiều lần tới khi `remaining` = 0.
// - `dry_run` mặc định TRUE — phải truyền `dry_run:false` mới ghi thật. Bản
//   dry-run vẫn trả về đủ preview (account/category map ra sao, ngày backdate)
//   để admin đối chiếu trước khi chạy thật.
// ============================================================

// Bảng ánh xạ danh mục cũ (CASH_TX_CATEGORIES, phẳng) → danh mục mới (Group,
// Name trong IncomeCategories/ExpenseCategories, 2 cấp). Một vài danh mục cũ
// không có tương đương chính xác (vd "Marketing", "Vận chuyển", "Điện nước" gộp
// chung) — map về nhóm gần nhất, KHÔNG tự thêm subcategory mới suy đoán; tên
// danh mục gốc luôn được giữ lại trong Note của chứng từ mới để tra cứu ngược.
var V1_MIGRATE_INCOME_CATEGORY_MAP = {
  'Thu khác':         { group: 'Thu khác', name: 'Thu khác' },
  'Hoàn tiền từ NCC':  { group: 'Thu khác', name: 'Thu hoàn tiền' },
  'Khác':             { group: 'Thu khác', name: 'Thu khác' }
};
var V1_MIGRATE_EXPENSE_CATEGORY_MAP = {
  'Lương nhân viên':  { group: 'Nhân sự',      name: 'Lương' },
  'Thuê mặt bằng':    { group: 'Văn phòng',    name: 'Tiền nhà' },
  'Điện nước':        { group: 'Văn phòng',    name: 'Điện' },
  'Internet':         { group: 'Văn phòng',    name: 'Internet' },
  'Marketing':        { group: 'Khác',         name: 'Chi khác' },
  'Nguyên vật liệu':  { group: 'Nhập hàng',    name: 'Thanh toán nhập hàng' },
  'Vận chuyển':       { group: 'Khác',         name: 'Chi khác' },
  'Thuế':             { group: 'Thuế',         name: 'Thuế khác' },
  'Hoàn tiền khách':  { group: 'Khác',         name: 'Hoàn tiền khách' },
  'Khác':             { group: 'Khác',         name: 'Chi khác' }
};

function _v1MigrateCategoryId(type, oldCategory) {
  var map = type === 'INCOME' ? V1_MIGRATE_INCOME_CATEGORY_MAP : V1_MIGRATE_EXPENSE_CATEGORY_MAP;
  var target = map[oldCategory] || map['Khác'];
  var all = Repository.Categories.findAll(type);
  for (var i = 0; i < all.length; i++) {
    if (all[i].group === target.group && all[i].name === target.name) return all[i].category_id;
  }
  return null; // seed IncomeCategories/ExpenseCategories đã bị đổi tên tay — báo lỗi rõ thay vì đoán bừa
}

// Khớp theo Name của CashAccounts (không phân biệt hoa/thường, trim khoảng
// trắng) — dữ liệu V1 lưu tên tài khoản dạng text tự do ("Tiền mặt", "Ngân
// hàng ABC"...), không có khoá ngoại thật. Không khớp được → fallback tài
// khoản CASH Active đầu tiên, đánh dấu matched:false để admin biết dòng nào
// cần rà lại tay.
function _v1MigrateAccountId(oldAccountText) {
  var all = Repository.CashAccounts.findAll().filter(function(a) { return a.active; });
  var norm = String(oldAccountText || '').trim().toLowerCase();
  for (var i = 0; i < all.length; i++) {
    if (all[i].name.trim().toLowerCase() === norm) return { account_id: all[i].account_id, matched: true };
  }
  var cash = all.filter(function(a) { return a.type === 'CASH'; });
  var fallback = cash[0] || all[0];
  if (!fallback) throw new Error('Chưa có CashAccount nào Active — tạo tài khoản trước khi migrate');
  return { account_id: fallback.account_id, matched: false };
}

// Thêm cột MigratedTo/MigratedAt vào cuối sheet CashTransactions nếu chưa có —
// CHỈ append cột, không đụng dữ liệu 10 cột gốc (listCashTransactions() vẫn đọc
// đúng sh.getRange(2,1,...,10), không bị ảnh hưởng).
function _v1MigrateEnsureColumns(sh) {
  if (String(sh.getRange(1, 11).getValue()) !== 'MigratedTo') sh.getRange(1, 11).setValue('MigratedTo');
  if (String(sh.getRange(1, 12).getValue()) !== 'MigratedAt') sh.getRange(1, 12).setValue('MigratedAt');
}

function migrateV1ToFinanceCore(options) {
  options = options || {};
  var dryRun = options.dry_run !== false; // mặc định TRUE
  var limit  = options.limit ? parseInt(options.limit, 10) : 50;
  var actor  = options._callerUser || 'owner';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.CASH_TRANSACTIONS);
  if (!sh || sh.getLastRow() < 2) return { dry_run: dryRun, processed: 0, remaining: 0, results: [] };

  _v1MigrateEnsureColumns(sh);

  var lastRow = sh.getLastRow();
  var data = sh.getRange(2, 1, lastRow - 1, 12).getValues();

  var candidates = [];
  for (var i = 0; i < data.length; i++) {
    var status     = String(data[i][7] || '');
    var migratedTo = String(data[i][10] || '');
    if (status === 'ACTIVE' && !migratedTo) candidates.push({ row: i + 2, data: data[i] });
  }

  var remaining = candidates.length;
  var toProcess = candidates.slice(0, limit);
  var results = [];

  toProcess.forEach(function(c) {
    var r         = c.data;
    var txId      = String(r[0]);
    var type      = String(r[1]).toUpperCase();
    var amount    = Number(r[2]) || 0;
    var oldCat    = String(r[3] || '');
    var reference = String(r[4] || '');
    var note      = String(r[5] || '');
    var account   = String(r[6] || '');
    var createdAt = r[8];

    var entry = { transaction_id: txId, type: type, amount: amount, old_category: oldCat, old_account: account };

    try {
      if (['INCOME', 'EXPENSE'].indexOf(type) === -1) throw new Error('Type không hợp lệ: ' + type);

      var accountInfo = _v1MigrateAccountId(account);
      var categoryId  = _v1MigrateCategoryId(type, oldCat);
      if (!categoryId) throw new Error('Không map được danh mục "' + oldCat + '" sang Category mới');

      var docDateIso = createdAt ? new Date(createdAt).toISOString() : nowIso();
      var migratedNote = '[V1 migrate ' + txId + ', danh mục gốc: ' + oldCat + ']' +
        (note ? ' ' + note : '') + (reference ? ' (Ref: ' + reference + ')' : '');

      entry.mapped_account_id  = accountInfo.account_id;
      entry.account_matched    = accountInfo.matched;
      entry.mapped_category_id = categoryId;
      entry.posting_date       = docDateIso;

      if (!dryRun) {
        var newId, ssForLog = SpreadsheetApp.getActiveSpreadsheet();

        if (type === 'INCOME') {
          // Bỏ qua createReceipt() (app-layer công khai) — action create_receipt
          // KHÔNG cho caller tự đặt SourceSystem/SourceType/SourceRef (mops-
          // contract.md §13.5, tránh spoof dedup key qua API). Migration là mã
          // nội bộ tin cậy, tạo thẳng qua Repository giống cách autoCreateReceipt()
          // đã làm cho cùng lý do.
          var existing = Repository.Receipts.findBySource('V1_MIGRATION', 'CASH_TRANSACTION', txId);
          newId = existing ? existing.receipt_id : Repository.Receipts.create({
            party_id: '', account_id: accountInfo.account_id, total_amount: amount,
            note: _sanitizeText(migratedNote, 300), document_date: docDateIso,
            source_system: 'V1_MIGRATION', source_type: 'CASH_TRANSACTION', source_ref: txId,
            created_by: actor
          });
          if (!existing) {
            Repository.ReceiptLines.appendLines(newId, [{ category_id: categoryId, amount: amount }]);
            logActivity(ssForLog, 'FINANCE', newId, 'RECEIPT_CREATED', actor);
            logAuditTrail(ssForLog, 'RECEIPT', newId, 'CREATED', null, { status: 'Draft', total_amount: amount, account_id: accountInfo.account_id }, 'V1 migrate ' + txId, actor);
          }
          var receiptNow = Repository.Receipts.findById(newId);
          if (receiptNow.status === 'Draft') postDocument('RECEIPT', newId, actor, docDateIso);
        } else {
          // PaymentVouchers không có cột Source* — dùng createPaymentVoucher()
          // công khai bình thường, không cần bypass Repository.
          var pv = createPaymentVoucher({
            account_id: accountInfo.account_id, total_amount: amount,
            note: _sanitizeText(migratedNote, 300), document_date: docDateIso,
            lines: [{ category_id: categoryId, amount: amount }],
            _callerUser: actor
          });
          newId = pv.voucher_id;
          postDocument('PAYMENT_VOUCHER', newId, actor, docDateIso);
        }

        sh.getRange(c.row, 11).setValue(newId);
        sh.getRange(c.row, 12).setValue(nowIso());
        entry.new_document_id = newId;
        entry.new_status = 'Posted';
      }
    } catch (e) {
      entry.error = String((e && e.message) || e);
    }

    results.push(entry);
  });

  var succeeded = dryRun ? null : results.filter(function(r) { return !r.error; }).length;
  var failed    = dryRun ? null : results.filter(function(r) { return !!r.error; }).length;

  if (!dryRun && succeeded) {
    logActivity(ss, 'FINANCE', 'V1_MIGRATION', 'V1_MIGRATE_BATCH', actor);
  }

  return {
    dry_run: dryRun,
    processed: toProcess.length,
    succeeded: succeeded,
    failed: failed,
    remaining: dryRun ? remaining : (remaining - succeeded),
    results: results
  };
}

// ============================================================
// GET ANALYTICS (V2.3 — tab Tổng quan: KPI, doanh thu theo kỳ, phễu chuyển đổi,
// top dịch vụ/khách hàng, hiệu suất nhân viên). Thay thế getRevenue() — chỉ 1
// nơi gọi (loadOverview), không cần giữ song song 2 endpoint.
//
// Đọc mỗi sheet ĐÚNG 1 LẦN (Orders/Payments/OrderItems/Customers/ActivityLogs),
// tính toàn bộ số liệu trong bộ nhớ — theo đúng kỷ luật đã áp dụng ở listCustomers().
//
// Định nghĩa (cố định, để không tranh cãi con số về sau):
// - Phễu chuyển đổi lọc theo NGÀY TẠO ĐƠN (Orders.CreatedAt) — "cohort theo ngày
//   tạo": trong số đơn tạo ra ở khoảng lọc, bao nhiêu % hiện đang ở mỗi bước.
//   Mỗi bước là LUỸ KẾ (đã tới bước đó hoặc xa hơn), không phải trạng thái đúng lúc đó.
// - KPI doanh thu (hôm nay/tuần/tháng) lọc theo NGÀY THANH TOÁN THỰC (Payments.PaidAt)
//   — tiền thực nhận trong ngày đó, bất kể đơn được tạo khi nào.
// - payment_rate = paid / created (không loại cancelled/expired khỏi mẫu số —
//   định nghĩa đơn giản nhất, dễ giải thích và tái tạo lại sau này).
// - cancellation_rate = cancelled / created.
// - "Completed" trong phễu là snapshot trạng thái HIỆN TẠI của đơn tạo trong
//   khoảng lọc — không phải "đơn nào TRỞ THÀNH Completed trong khoảng lọc" (không
//   có cột CompletedAt riêng để biết chính xác thời điểm chuyển trạng thái).
// ============================================================

function getAnalytics(params) {
  var TZ = 'Asia/Ho_Chi_Minh'; // hardcode — business VN, không dựa Session.getScriptTimeZone()

  var fromDate = params && params.from ? new Date(params.from) : null;
  var toDate   = params && params.to   ? new Date(params.to)   : null;
  var groupBy  = (params && params.group_by === 'month') ? 'month' : 'day';
  // Gate riêng cho số liệu Thu Chi/Lợi nhuận — router (doGet) đặt cờ này dựa trên
  // _canViewFinance(role), KHÔNG dựa vào 'reports.view' (quyền rộng, hầu hết staff
  // đều có để xem tab Tổng quan). Thiếu cờ này = bỏ hẳn field liên quan tài chính
  // khỏi response, không chỉ ẩn trên UI — tránh lộ qua Network tab của trình duyệt.
  var includeFinance = !!(params && params._includeFinance);

  // Cache theo đúng bộ tham số lọc — TTL ngắn (90s) để không hiển thị số liệu cũ
  // quá lâu, nhưng vẫn đỡ tải khi nhiều nhân viên cùng mở tab Tổng quan gần như
  // đồng thời (mỗi lần đều quét Orders/Payments/OrderItems/Customers/ActivityLogs
  // — tốn nhất trong các thao tác đọc sheet của cả hệ thống). Cache key PHẢI gồm
  // includeFinance — nếu không, response đã cache của 1 role có thể bị trả nhầm
  // cho role khác (lộ hoặc thiếu số liệu tài chính tuỳ thứ tự request).
  var cache    = CacheService.getScriptCache();
  // gen (phase-07 BS-5): bump ở mọi write (_dispatchWrite) → key cũ hết hiệu lực = invalidate tức thì.
  var cacheKey = 'analytics_' + _analyticsGen() + '_' + (fromDate ? fromDate.getTime() : '') + '_' + (toDate ? toDate.getTime() : '') + '_' + groupBy + '_' + (includeFinance ? 'f1' : 'f0');
  var cached   = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (ex) { /* cache hỏng — tính lại bình thường */ }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  function inRange(d) {
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    return true;
  }

  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  // 27 cột (không phải 18) — cần tới AA (BranchID, review 31) để gộp revenue_by_store theo chi
  // nhánh thật thay vì text tự do cột P (Store).
  var ordData  = ordersSh.getLastRow() > 1
    ? ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 27).getValues()
    : [];

  // review 31 — map 1 lần BranchID -> NameVi, dùng để gộp revenue_by_store bên dưới.
  var branchNameById = {};
  Repository.Branches.findAll().forEach(function(b) { branchNameById[b.branch_id] = b.name_vi; });

  var paySh   = ss.getSheetByName(SHEET.PAYMENTS);
  var payData = paySh.getLastRow() > 1
    ? paySh.getRange(2, 1, paySh.getLastRow() - 1, 12).getValues()
    : [];

  // 12 cột (không phải 11) từ Phase 02 Bước 4 — cột L UnitCost dùng để tính Gross Profit
  // bên dưới (r[11]). Đơn hàng tạo trước khi có cột này sẽ có UnitCost rỗng = 0 (Number('')).
  var itemsSh  = ss.getSheetByName(SHEET.ORDER_ITEMS);
  var itemData = itemsSh.getLastRow() > 1
    ? itemsSh.getRange(2, 1, itemsSh.getLastRow() - 1, 12).getValues()
    : [];

  var custSh   = ss.getSheetByName(SHEET.CUSTOMERS);
  var custData = custSh.getLastRow() > 1
    ? custSh.getRange(2, 1, custSh.getLastRow() - 1, 7).getValues()
    : [];

  var actSh   = ss.getSheetByName(SHEET.ACTIVITY_LOGS);
  var actData = actSh && actSh.getLastRow() > 1
    ? actSh.getRange(2, 1, actSh.getLastRow() - 1, 6).getValues()
    : [];

  var cashTxSh   = includeFinance ? ss.getSheetByName(SHEET.CASH_TRANSACTIONS) : null;
  var cashTxData = cashTxSh && cashTxSh.getLastRow() > 1
    ? cashTxSh.getRange(2, 1, cashTxSh.getLastRow() - 1, 10).getValues()
    : [];

  var now         = new Date();
  var todayKey    = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  var monthKey    = Utilities.formatDate(now, TZ, 'yyyy-MM');
  var startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // Thứ 2 đầu tuần
  startOfWeek.setHours(0, 0, 0, 0);

  var PROGRESSED = ['PAYMENT_REPORTED', 'PAID', 'PROCESSING', 'COMPLETED']; // đã qua PENDING
  var PAID_PLUS  = ['PAID', 'PROCESSING', 'COMPLETED'];                    // đã thu tiền, chưa hoàn

  // ---- Customers: FirstOrderAt theo CustomerID — phân loại khách quay lại ----
  var firstOrderAtByCustomer = {};
  var customerMetaById = {};
  custData.forEach(function(r) {
    var cid = String(r[0]);
    firstOrderAtByCustomer[cid] = r[4] ? new Date(r[4]) : null;
    customerMetaById[cid] = { phone: String(r[1]), name: String(r[2] || '') };
  });

  // ---- Orders: phễu chuyển đổi (cohort theo CreatedAt) + đơn mới hôm nay ----
  var createdCount = 0, reportedCount = 0, paidFunnelCount = 0, completedCount = 0, cancelledCount = 0, refundedCount = 0;
  var newOrdersToday = 0;
  var ordersById = {}; // orderId -> {customerId, orderType, status, createdAt, store}

  ordData.forEach(function(r) {
    var orderId    = String(r[0]);
    var customerId = String(r[1]);
    var orderType  = String(r[2]);
    var status     = String(r[7]);
    var createdAt  = r[10] ? new Date(r[10]) : null;
    // review 31 — gộp theo BranchID (cột AA, idx 26) thật thay vì Orders.Store (text tự do, §19).
    // Đơn cũ chưa có BranchID (trước khi thêm cột) vẫn rơi bucket "(chưa gắn chi nhánh)" như cũ —
    // không hồi tố, đúng quyết định đã chốt ở §20 mục 3.
    var branchIdCol = String(r[26] || '');
    var store       = (branchIdCol && branchNameById[branchIdCol]) || '(chưa gắn chi nhánh)';

    ordersById[orderId] = { customerId: customerId, orderType: orderType, status: status, createdAt: createdAt, store: store };

    if (createdAt && Utilities.formatDate(createdAt, TZ, 'yyyy-MM-dd') === todayKey) newOrdersToday++;

    if (createdAt && inRange(createdAt)) {
      createdCount++;
      if (PROGRESSED.indexOf(status) !== -1) reportedCount++;
      if (PAID_PLUS.indexOf(status)  !== -1) paidFunnelCount++;
      if (status === 'COMPLETED') completedCount++;
      if (status === 'CANCELLED') cancelledCount++;
      if (status === 'REFUNDED')  refundedCount++;
    }
  });

  // ---- Payments: doanh thu hôm nay/tuần/tháng (theo PaidAt) + revenue_series ----
  var revenueToday = 0, revenueWeek = 0, revenueMonth = 0;
  var seriesMap = {};             // key -> { revenue, order_count }
  var paidCustomersInRange = {};  // customerId -> true, cho tỷ lệ khách quay lại
  var storeMap = {};              // store -> { revenue, order_count }
  var totalRevenueInRange = 0, totalPaidOrdersInRange = 0;

  payData.forEach(function(r) {
    var orderId = String(r[1]);
    var status  = String(r[5]);
    var amount  = Number(r[4]) || 0;
    var paidAt  = r[8] ? new Date(r[8]) : null;

    if (status !== 'PAID' || !paidAt) return;

    var dayKey = Utilities.formatDate(paidAt, TZ, 'yyyy-MM-dd');
    if (dayKey === todayKey) revenueToday += amount;
    if (paidAt >= startOfWeek) revenueWeek += amount;
    if (Utilities.formatDate(paidAt, TZ, 'yyyy-MM') === monthKey) revenueMonth += amount;

    if (inRange(paidAt)) {
      var key = groupBy === 'month' ? Utilities.formatDate(paidAt, TZ, 'yyyy-MM') : dayKey;
      if (!seriesMap[key]) seriesMap[key] = { revenue: 0, order_count: 0 };
      seriesMap[key].revenue += amount;
      seriesMap[key].order_count++;
      totalRevenueInRange += amount;
      totalPaidOrdersInRange++;

      var order = ordersById[orderId];
      if (order) {
        paidCustomersInRange[order.customerId] = true;
        if (!storeMap[order.store]) storeMap[order.store] = { revenue: 0, order_count: 0 };
        storeMap[order.store].revenue += amount;
        storeMap[order.store].order_count++;
      }
    }
  });

  var revenueSeries = Object.keys(seriesMap).sort().map(function(key) {
    return { key: key, revenue: seriesMap[key].revenue, order_count: seriesMap[key].order_count };
  });

  var revenueByStore = Object.keys(storeMap).map(function(store) {
    return { store: store, revenue: storeMap[store].revenue, order_count: storeMap[store].order_count };
  }).sort(function(a, b) { return b.revenue - a.revenue; });

  var avgOrderValue = totalPaidOrdersInRange > 0 ? totalRevenueInRange / totalPaidOrdersInRange : 0;

  // ---- Khách quay lại: trong số khách có đơn PAID ở khoảng lọc, bao nhiêu người
  //      đã có đơn từ TRƯỚC ngày bắt đầu lọc (khách cũ, không phải mới trong kỳ) ----
  var returningCount = 0, totalPaidCustomers = 0;
  Object.keys(paidCustomersInRange).forEach(function(cid) {
    totalPaidCustomers++;
    var firstAt = firstOrderAtByCustomer[cid];
    if (firstAt && fromDate && firstAt < fromDate) returningCount++;
  });
  var returningCustomerRate = totalPaidCustomers > 0 ? returningCount / totalPaidCustomers : 0;

  // ---- Top Services: gộp OrderItems theo Handle, chỉ tính đơn đã thu tiền (PAID+) ----
  // ---- Gross Profit (Phase 02 Bước 4 → Reporting): CÙNG vòng lặp, CÙNG phạm vi lọc
  // (PAID+, trong khoảng ngày) — UnitCost=0 nghĩa là "chưa có dữ liệu giá vốn" (đơn tạo
  // trước Phase 02, hoặc sản phẩm chưa từng nhập qua PurchaseOrder), KHÔNG PHẢI giá vốn
  // thật bằng 0 — loại các dòng này khỏi Gross Profit thay vì tính nhầm lãi 100%, và báo
  // cáo % doanh thu đã có dữ liệu giá vốn (cogs_coverage_rate) để không ngộ nhận đây là
  // lãi gộp chuẩn kế toán trên TOÀN BỘ doanh thu (xem finance.md §11 — nguyên tắc minh bạch
  // giới hạn dữ liệu, không ngầm hiểu số liệu là đầy đủ hơn thực tế).
  var serviceMap = {};
  var lineRevenueWithKnownCost = 0, lineRevenueTotal = 0, grossProfitInRange = 0;
  itemData.forEach(function(r) {
    var order = ordersById[String(r[1])];
    if (!order || PAID_PLUS.indexOf(order.status) === -1) return;
    if (!(order.createdAt && inRange(order.createdAt))) return;

    var handle    = String(r[4]);
    var lineTotal = Number(r[9]) || 0;
    if (!serviceMap[handle]) serviceMap[handle] = { handle: handle, name: String(r[6]), revenue: 0, order_count: 0 };
    serviceMap[handle].revenue += lineTotal;
    serviceMap[handle].order_count++;

    lineRevenueTotal += lineTotal;
    var unitCost = Number(r[11]) || 0;
    if (unitCost > 0) {
      var qty = Number(r[8]) || 0;
      lineRevenueWithKnownCost += lineTotal;
      grossProfitInRange += lineTotal - (unitCost * qty);
    }
  });
  var topServices = Object.keys(serviceMap).map(function(h) { return serviceMap[h]; })
    .sort(function(a, b) { return b.revenue - a.revenue; })
    .slice(0, 10);
  var cogsCoverageRate = lineRevenueTotal > 0 ? lineRevenueWithKnownCost / lineRevenueTotal : 0;

  // ---- Top Customers: gộp Orders PAID+ theo CustomerID, trong khoảng lọc ----
  var customerStatsMap = {};
  ordData.forEach(function(r) {
    var customerId = String(r[1]);
    var status     = String(r[7]);
    var amount     = Number(r[4]) || 0;
    var createdAt  = r[10] ? new Date(r[10]) : null;
    if (PAID_PLUS.indexOf(status) === -1) return;
    if (!(createdAt && inRange(createdAt))) return;
    if (!customerStatsMap[customerId]) customerStatsMap[customerId] = { total_paid: 0, paid_count: 0 };
    customerStatsMap[customerId].total_paid += amount;
    customerStatsMap[customerId].paid_count++;
  });
  var topCustomers = Object.keys(customerStatsMap).map(function(cid) {
    var meta = customerMetaById[cid] || { phone: '', name: '' };
    return {
      customer_id: cid, phone: meta.phone, name: meta.name,
      total_paid: customerStatsMap[cid].total_paid, paid_count: customerStatsMap[cid].paid_count
    };
  }).sort(function(a, b) { return b.total_paid - a.total_paid; }).slice(0, 10);

  // ---- Staff Performance: từ ActivityLogs, Action = STATUS_CHANGED_TO_* ----
  // Chỉ có dữ liệu đúng kể từ khi sửa bug payload._staffActor trong updateOrderStatus()
  // — trước đó User bị ghi "staff:[object Object]", bị lọc bỏ bởi indexOf('staff:') === 0
  // (vẫn khớp tiền tố, nhưng staffName sẽ ra "[object Object]" — chấp nhận vì đây là
  // dữ liệu lịch sử hỏng sẵn có, không có cách khôi phục tên thật).
  var staffMap = {};
  actData.forEach(function(r) {
    var action    = String(r[3]);
    var user      = String(r[4] || '');
    var createdAt = r[5] ? new Date(r[5]) : null;
    if (action.indexOf('STATUS_CHANGED_TO_') !== 0) return;
    if (!(createdAt && inRange(createdAt))) return;
    if (user.indexOf('staff:') !== 0) return; // bỏ qua 'customer'/'system'
    var staffName = user.slice('staff:'.length);
    var newStatus = action.slice('STATUS_CHANGED_TO_'.length);
    if (!staffMap[staffName]) staffMap[staffName] = { paid_confirmed_count: 0, cancelled_count: 0, refunded_count: 0 };
    if (newStatus === 'PAID')      staffMap[staffName].paid_confirmed_count++;
    if (newStatus === 'CANCELLED') staffMap[staffName].cancelled_count++;
    if (newStatus === 'REFUNDED')  staffMap[staffName].refunded_count++;
  });
  var staffPerformance = Object.keys(staffMap).map(function(name) {
    var s = staffMap[name];
    return { staff: name, paid_confirmed_count: s.paid_confirmed_count, cancelled_count: s.cancelled_count, refunded_count: s.refunded_count };
  }).sort(function(a, b) { return b.paid_confirmed_count - a.paid_confirmed_count; });

  // ---- Thu Chi (V2.4): CashTransactions chỉ chứa khoản Thu/Chi THỦ CÔNG
  // (không gắn đơn hàng) — doanh thu đơn hàng đã tính ở revenueToday/Week/Month
  // phía trên (từ Payments). Lợi nhuận ròng = doanh thu đơn hàng + thu thủ công
  // − chi thủ công. Bỏ qua giao dịch Status=VOID. ----
  var expensesToday = 0, expensesWeek = 0, expensesMonth = 0;
  var manualIncomeToday = 0, manualIncomeWeek = 0, manualIncomeMonth = 0;
  var expenseSeriesMap = {};       // key -> amount, cho biểu đồ chi theo kỳ
  var expenseByCategoryMap = {};   // category -> { amount, count }
  var totalExpenseInRange = 0, totalManualIncomeInRange = 0;

  cashTxData.forEach(function(r) {
    var type      = String(r[1]);
    var amount    = Number(r[2]) || 0;
    var category  = String(r[3] || '');
    var status    = String(r[7] || 'ACTIVE');
    var createdAt = r[8] ? new Date(r[8]) : null;
    if (status === 'VOID' || !createdAt) return;

    var dayKey = Utilities.formatDate(createdAt, TZ, 'yyyy-MM-dd');
    if (type === 'EXPENSE') {
      if (dayKey === todayKey) expensesToday += amount;
      if (createdAt >= startOfWeek) expensesWeek += amount;
      if (Utilities.formatDate(createdAt, TZ, 'yyyy-MM') === monthKey) expensesMonth += amount;
    } else if (type === 'INCOME') {
      if (dayKey === todayKey) manualIncomeToday += amount;
      if (createdAt >= startOfWeek) manualIncomeWeek += amount;
      if (Utilities.formatDate(createdAt, TZ, 'yyyy-MM') === monthKey) manualIncomeMonth += amount;
    }

    if (!inRange(createdAt)) return;

    if (type === 'EXPENSE') {
      totalExpenseInRange += amount;
      var seriesKey = groupBy === 'month' ? Utilities.formatDate(createdAt, TZ, 'yyyy-MM') : dayKey;
      if (!expenseSeriesMap[seriesKey]) expenseSeriesMap[seriesKey] = 0;
      expenseSeriesMap[seriesKey] += amount;

      if (!expenseByCategoryMap[category]) expenseByCategoryMap[category] = { amount: 0, count: 0 };
      expenseByCategoryMap[category].amount += amount;
      expenseByCategoryMap[category].count++;
    } else if (type === 'INCOME') {
      totalManualIncomeInRange += amount;
    }
  });

  var expenseSeries = Object.keys(expenseSeriesMap).sort().map(function(key) {
    return { key: key, expense: expenseSeriesMap[key] };
  });
  var expenseByCategory = Object.keys(expenseByCategoryMap).map(function(cat) {
    return { category: cat, amount: expenseByCategoryMap[cat].amount, count: expenseByCategoryMap[cat].count };
  }).sort(function(a, b) { return b.amount - a.amount; });

  var netProfitInRange = (totalRevenueInRange + totalManualIncomeInRange) - totalExpenseInRange;

  var result = {
    kpi: {
      revenue_today: revenueToday,
      revenue_week:  revenueWeek,
      revenue_month: revenueMonth,
      new_orders_today: newOrdersToday,
      payment_rate:            createdCount > 0 ? paidFunnelCount / createdCount : 0,
      cancellation_rate:       createdCount > 0 ? cancelledCount  / createdCount : 0,
      refund_rate:             createdCount > 0 ? refundedCount   / createdCount : 0,
      returning_customer_rate: returningCustomerRate,
      avg_order_value:         avgOrderValue
    },
    revenue_series:    { granularity: groupBy, buckets: revenueSeries },
    revenue_by_store:  revenueByStore,
    funnel:            { created: createdCount, reported: reportedCount, paid: paidFunnelCount, completed: completedCount },
    top_services:      topServices,
    top_customers:     topCustomers,
    staff_performance: staffPerformance,
    can_view_finance:  includeFinance,
    from: (params && params.from) || null,
    to:   (params && params.to)   || null
  };

  // Field tài chính (Thu Chi/Lợi nhuận) CHỈ gắn vào response khi includeFinance
  // — không trả về dù là 0, để phía client phân biệt được "không có dữ liệu" với
  // "không có quyền xem" (xem comment ở đầu hàm).
  if (includeFinance) {
    result.kpi.expenses_today   = expensesToday;
    result.kpi.expenses_week    = expensesWeek;
    result.kpi.expenses_month   = expensesMonth;
    result.kpi.net_profit_today = revenueToday + manualIncomeToday - expensesToday;
    result.kpi.net_profit_week  = revenueWeek  + manualIncomeWeek  - expensesWeek;
    result.kpi.net_profit_month = revenueMonth + manualIncomeMonth - expensesMonth;
    result.expense_series      = { granularity: groupBy, buckets: expenseSeries };
    result.expense_by_category = expenseByCategory;
    result.net_profit_range    = netProfitInRange;
    result.total_revenue_range = totalRevenueInRange;
    result.total_expense_range = totalExpenseInRange;
    // Gross Profit thật (Phase 02 Bước 4 → Reporting, docs/architecture/inventory.md §2.1) —
    // KHÁC net_profit_range (= doanh thu − toàn bộ chi phí, không trừ giá vốn). Chỉ tính trên
    // các dòng OrderItems có UnitCost > 0 — cogs_coverage_rate cho biết bao nhiêu % doanh thu
    // trong kỳ THỰC SỰ có dữ liệu giá vốn, để UI không trình bày như lãi gộp chuẩn kế toán.
    result.gross_profit_range  = grossProfitInRange;
    result.cogs_coverage_rate  = cogsCoverageRate;
  }

  try {
    // CacheService giới hạn 100KB/giá trị — nếu top-list/revenue_series lớn bất
    // thường vượt ngưỡng, bỏ qua cache thay vì làm hỏng cả response (non-fatal).
    cache.put(cacheKey, JSON.stringify(result), 90);
  } catch (ex) { /* non-fatal */ }

  return result;
}
