
function getReconciliation(reconId) {
  var r = Repository.Reconciliations.findById(String(reconId || '').trim());
  if (!r) throw new Error('Không tìm thấy phiếu đối soát: ' + reconId);
  r.items = Repository.ReconciliationItems.findByRecon(r.recon_id);
  r.has_discrepancy = r.items.some(function(it) { return it.cod_diff !== 0 || it.fee_diff !== 0; });
  return r;
}

// Tạo phiếu — kéo mọi vận đơn delivered/returned của 1 ĐTVC trong khoảng, CHƯA nằm trong phiếu nào.
function createReconciliation(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var carrier = String(payload.carrier_code || '').toUpperCase();
  if (!carrier) throw new Error('carrier_code là bắt buộc');
  var from = payload.from ? new Date(payload.from) : null;
  var to   = payload.to ? new Date(payload.to) : null;

  var reconciled = {};
  var itemsSh = ss.getSheetByName(SHEET.RECONCILIATION_ITEMS);
  if (itemsSh && itemsSh.getLastRow() > 1) {
    itemsSh.getRange(2, 1, itemsSh.getLastRow() - 1, 4).getValues().forEach(function(r) { reconciled[String(r[3])] = true; });
  }

  var ordSh = ss.getSheetByName(SHEET.ORDERS);
  var rows = ordSh && ordSh.getLastRow() > 1 ? ordSh.getRange(2, 1, ordSh.getLastRow() - 1, 34).getValues() : [];
  var picked = [];
  rows.forEach(function(o) {
    var orderId = String(o[0]);
    var ff = String(o[28] || '');      // AC FulfillmentStatus
    if (String(o[29] || '') !== carrier || !String(o[30] || '')) return; // AD Carrier, AE TrackingCode
    if (ff !== 'delivered' && ff !== 'returned') return;
    if (reconciled[orderId]) return;
    var created = o[10] ? new Date(o[10]) : null; // K CreatedAt
    if (from && created && created < from) return;
    if (to && created && created > to) return;
    picked.push({ orderId: orderId, tracking: String(o[30]), cod: Number(o[32]) || 0, fee: Number(o[31]) || 0, returned: ff === 'returned' });
  });
  if (!picked.length) throw new Error('Không có vận đơn (Đã giao/Đã hoàn) của ' + carrier + ' để đối soát trong khoảng đã chọn.');

  var reconId = Repository.Reconciliations.create({ carrier_code: carrier, status: 'Chờ đối soát', created_by: payload._staffActor });
  picked.forEach(function(p) {
    var codSys = p.returned ? 0 : p.cod; // đơn hoàn: không thu được COD
    Repository.ReconciliationItems.append(reconId, {
      tracking_code: p.tracking, order_id: p.orderId,
      cod_system: codSys, cod_partner: codSys, fee_system: p.fee, fee_partner: p.fee, other_fee: 0
    });
  });
  _recalcReconTotals(ss, reconId);
  logActivity(ss, 'SHIPPING', reconId, 'RECON_CREATED', payload._staffActor || 'staff');
  return getReconciliation(reconId);
}

// Sửa tay giá trị đối tác (sau khiếu nại) — đưa chênh lệch về 0 trước khi xác nhận.
function updateReconciliationItem(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reconId = String(payload.recon_id || '').trim();
  var r = Repository.Reconciliations.findById(reconId);
  if (!r) throw new Error('Không tìm thấy phiếu đối soát');
  if (r.status === 'Đã đối soát') throw new Error('Phiếu đã đối soát — không sửa được nữa');
  Repository.ReconciliationItems.updatePartner(String(payload.item_id), payload.cod_partner, payload.fee_partner, payload.other_fee);
  _recalcReconTotals(ss, reconId);
  return getReconciliation(reconId);
}

// Xác nhận đối soát — chặn nếu còn chênh lệch COD/Phí ≠ 0.
function confirmReconciliation(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reconId = String(payload.recon_id || '').trim();
  var r = Repository.Reconciliations.findById(reconId);
  if (!r) throw new Error('Không tìm thấy phiếu đối soát');
  if (r.status === 'Đã đối soát') return getReconciliation(reconId);
  var items = Repository.ReconciliationItems.findByRecon(reconId);
  if (items.some(function(it) { return it.cod_diff !== 0 || it.fee_diff !== 0; }))
    throw new Error('Còn chênh lệch COD/Phí ≠ 0 — sửa giá trị đối tác cho khớp trước khi xác nhận đối soát.');
  Repository.Reconciliations.setStatus(reconId, 'Đã đối soát');
  logActivity(ss, 'SHIPPING', reconId, 'RECON_CONFIRMED', payload._staffActor || 'staff');
  return getReconciliation(reconId);
}

// Thanh toán công nợ — sinh dòng tiền + set các đơn COD trong phiếu = PAID (tiền sạch đã về).
// R6 (2026-08-21) · COD amount source-of-truth VERIFIED:
//  - `r.net_total` = aggregate từ ReconciliationItems (shipper-reported cod_partner)
//  - KHÔNG dùng order.total_amount → không lệch khi staff override COD trong shipModal
//  - _shipmentGet(...).cod_amount (đọc từ Orders.CODAmount cột AG) là snapshot của
//    shipment amount, ghi lúc create_shipment/update. Nếu cần helper unified xem
//    mops_shared.js:_receiptAmountForCOD (chưa có call site ở đây vì reconciliation
//    đã dùng đúng nguồn shipper).
function payReconciliation(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var reconId = String(payload.recon_id || '').trim();
  var r = Repository.Reconciliations.findById(reconId);
  if (!r) throw new Error('Không tìm thấy phiếu đối soát');
  if (r.status !== 'Đã đối soát') throw new Error('Chỉ thanh toán phiếu đã đối soát (khớp chênh lệch)');
  if (r.payment_status === 'Đã thanh toán') return getReconciliation(reconId);

  var items = Repository.ReconciliationItems.findByRecon(reconId);
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (r.net_total > 0) {
      // Thu ròng về quỹ (COD thực − phí − phí khác). Idempotent theo (MOPS, RECON, reconId).
      if (!Repository.Receipts.findBySource('MOPS', 'RECON', reconId)) {
        var acctId  = String(settings.GHN_COD_ACCOUNT_ID || '');
        var account = acctId ? Repository.CashAccounts.findById(acctId) : null;
        if (!account) account = _getDefaultSalesCashAccount();
        if (!account) throw new Error('Chưa cấu hình quỹ nhận COD và không có CashAccount mặc định');
        var rid = Repository.Receipts.create({
          party_id: '', account_id: account.account_id, total_amount: r.net_total,
          note: 'Đối soát vận chuyển ' + reconId + ' (' + r.carrier_code + ')',
          document_date: nowIso(), source_system: 'MOPS', source_type: 'RECON', source_ref: reconId,
          created_by: payload._staffActor || 'system'
        });
        postDocument('RECEIPT', rid, payload._staffActor || 'system');
      }
    } else if (r.net_total < 0) {
      // Chi ròng (đơn hoàn: COD=0, shop trả phí ship + phí hoàn) → Phiếu Chi Draft, kế toán duyệt/ghi
      // sổ theo luồng Finance chuẩn (KHÔNG tự Post — giữ nguyên tắc duyệt Phiếu Chi). lines optional.
      var acctId2  = String(settings.GHN_COD_ACCOUNT_ID || '');
      var account2 = acctId2 ? Repository.CashAccounts.findById(acctId2) : null;
      if (!account2) account2 = _getDefaultSalesCashAccount();
      if (account2) {
        try {
          createPaymentVoucher({
            account_id: account2.account_id, total_amount: Math.abs(r.net_total),
            note: 'Chi đối soát vận chuyển ' + reconId + ' (' + r.carrier_code + ')',
            _callerUser: payload._staffActor || 'system'
          });
        } catch (vErr) { logActivity(ss, 'SHIPPING', reconId, 'RECON_VOUCHER_FAILED', 'system — ' + vErr.message); }
      }
    }
  } finally { lock.releaseLock(); }

  items.forEach(function(it) {
    if (it.cod_partner > 0) {
      try {
        var loc = _findOrderRow(ss, it.order_id);
        loc.sheet.getRange(loc.row, 8).setValue('PAID');
        // 3-Axis Phase 2 (2026-08-09): COD đã delivered rồi mới đối soát → PAID+delivered → COMPLETED.
        _maybeCompleteOrder(ss, loc, 'system:reconciliation');
      } catch (e) {}
    }
  });
  Repository.Reconciliations.setStatus(reconId, 'Đã đối soát', { payment_status: 'Đã thanh toán', posted_at: nowIso() });
  logActivity(ss, 'SHIPPING', reconId, 'RECON_PAID', payload._staffActor || 'staff');
  return getReconciliation(reconId);
}

// ============================================================
// BÁO CÁO VẬN ĐƠN (Phase C3) — carrier-agnostic. Gộp Orders có vận đơn theo ĐTVC + khoảng thời gian.
// ============================================================
function getShippingReport(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var from = params && params.from ? new Date(params.from) : null;
  var to   = params && params.to ? new Date(params.to) : null;
  var ordSh = ss.getSheetByName(SHEET.ORDERS);
  var rows = ordSh && ordSh.getLastRow() > 1 ? ordSh.getRange(2, 1, ordSh.getLastRow() - 1, 34).getValues() : [];
  var byCarrier = {};
  var totalWb = 0, totalFee = 0, totalCod = 0, delivered = 0, closed = 0;
  rows.forEach(function(o) {
    var carrier = String(o[29] || ''); var tracking = String(o[30] || '');
    if (!carrier || !tracking) return; // chỉ đơn đã tạo vận đơn
    var created = o[10] ? new Date(o[10]) : null;
    if (from && created && created < from) return;
    if (to && created && created > to) return;
    var ff = String(o[28] || ''); var fee = Number(o[31]) || 0; var cod = Number(o[32]) || 0;
    var c = byCarrier[carrier] || (byCarrier[carrier] = { carrier: carrier, waybills: 0, fee: 0, cod: 0, delivered: 0, closed: 0 });
    c.waybills++; c.fee += fee; c.cod += cod; totalWb++; totalFee += fee; totalCod += cod;
    if (ff === 'delivered') { c.delivered++; delivered++; }
    if (ff === 'delivered' || ff === 'returned' || ff === 'cancelled') { c.closed++; closed++; }
  });
  var carriers = Object.keys(byCarrier).map(function(k) {
    var c = byCarrier[k];
    c.avg_fee = c.waybills ? Math.round(c.fee / c.waybills) : 0;
    c.fee_cod_ratio = c.cod ? +(c.fee / c.cod).toFixed(4) : 0;
    c.success_rate = c.closed ? +(c.delivered / c.closed * 100).toFixed(1) : 0;
    c.waybill_share = totalWb ? +(c.waybills / totalWb * 100).toFixed(1) : 0;
    c.fee_share = totalFee ? +(c.fee / totalFee * 100).toFixed(1) : 0;
    return c;
  });
  return {
    total_waybills: totalWb, total_fee: totalFee, total_cod: totalCod,
    avg_fee: totalWb ? Math.round(totalFee / totalWb) : 0,
    fee_cod_ratio: totalCod ? +(totalFee / totalCod).toFixed(4) : 0,
    success_rate: closed ? +(delivered / closed * 100).toFixed(1) : 0,
    by_carrier: carriers
  };
}

// skipInventoryLock (2026-09-05, sửa sau review): PHẢI là tham số hàm riêng, KHÔNG phải field trong
// payload — payload đến thẳng từ JSON.parse(e.postData.contents) ở doPost() không lọc field, nên nếu
// đọc payload.xxx làm cờ nội bộ thì bất kỳ client nào gọi create_order/create_order_admin (public,
// không cần token) cũng tự gửi được field đó để tắt khoá tồn kho mới thêm — đúng lỗ hổng review phát
// hiện. Chỉ createOrderPosComplete (nội bộ, mops_02.js) truyền true.
function createOrder(payload, forceType, skipInventoryLock) {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var _pid = _perfStart('create_order');
  _perfMark(_pid, 'enter');

  var customerName  = _sanitizeText(payload.customer_name || payload.name || '', 100);
  var customerPhone = normalizePhone(payload.phone || payload.customer_phone || '');
  var customerEmail = String(payload.email || '').trim();
  var customerNote  = _sanitizeText(payload.note || payload.customer_note || '', 500);
  // 2026-08-23 ghi chú nội bộ staff — cột AQ (43). Best-effort: field thiếu = rỗng, không throw.
  var internalNote  = _sanitizeText(payload.internal_note || '', 500);
  var appointDate   = String(payload.appointment_date || '').trim();
  var appointTime   = String(payload.appointment_time || '').trim();
  var source        = String(payload.source || 'page.payment').trim();
  var storeBranch   = _sanitizeText(payload.store || '', 100);
  var branchId      = String(payload.branch_id || '').trim(); // review 31 — resolve thật ngay trước appendRow
  var auditActor    = payload._staffActor ? 'staff:' + payload._staffActor : 'customer';
  // Phương thức thanh toán (phase vận chuyển COD 2026-07-17): 'VIETQR' (mặc định, trả trước qua QR) |
  // 'COD' (thu hộ khi giao — không cần cấu hình bank, không build QR, tiền vào khi GHN giao thành công) |
  // 'CASH' (2026-07-21: khách trả tiền mặt ngay tại quầy — không QR, không thu hộ, đơn PAID ngay lúc
  //  tạo + tự sinh Phiếu Thu vào quỹ tiền mặt; chỉ staff dùng, page.payment không bao giờ gửi CASH).
  var paymentMethod = String(payload.payment_method || 'VIETQR').toUpperCase();
  if (['VIETQR', 'COD', 'CASH'].indexOf(paymentMethod) === -1) paymentMethod = 'VIETQR';
  var isCod  = paymentMethod === 'COD';
  var isCash = paymentMethod === 'CASH';

  try {
    // Kiểm tra NGAY ĐẦU try, trước khi ghi bất kỳ dòng nào vào Orders/OrderItems/
    // Payments — buildVietQRUrl() cũng tự chặn thiếu cấu hình, nhưng nó chỉ được
    // gọi SAU KHI 3 sheet trên đã ghi xong (để lấy transRef/orderId), nên nếu để
    // guard duy nhất ở đó thì mỗi lần thiếu cấu hình sẽ để lại rác 1 đơn "ma"
    // PENDING không ai thanh toán được và không có QR. Chặn ở đây = không ghi gì cả.
    if (!isCod && !isCash && !_hasAnyReceivingBank(ss, settings)) { // COD/CASH không cần tài khoản nhận tiền (thu hộ / trả tay tại quầy)
      throw new Error(payload._staffActor
        ? 'Chưa cấu hình tài khoản nhận tiền (Mã ngân hàng / Số tài khoản) — vào MOPS Admin > Cấu hình để điền trước khi nhận đơn.'
        : 'Hệ thống tạm thời chưa thể nhận đơn, vui lòng thử lại sau ít phút hoặc liên hệ trực tiếp.');
    }

    if (!/^\d{9,11}$/.test(customerPhone)) throw new Error('Số điện thoại không hợp lệ');

    var rawItems = [];
    if (payload.items && Array.isArray(payload.items)) {
      rawItems = payload.items;
    } else if (payload.svc_ids && Array.isArray(payload.svc_ids)) {
      rawItems = payload.svc_ids.map(function(id) { return { handle: id, qty: 1 }; });
    } else if (payload.svc_id) {
      rawItems = [{ handle: payload.svc_id, qty: 1 }];
    } else if (payload.handle) {
      rawItems = [{ handle: payload.handle, qty: payload.qty || 1 }];
    }

    if (rawItems.length === 0) throw new Error('Không có sản phẩm nào trong đơn hàng');
    if (rawItems.length > 50) throw new Error('Đơn hàng không được vượt quá 50 sản phẩm');
    rawItems.forEach(function(it) {
      var q = it.qty !== undefined ? it.qty : it.quantity;
      if (q === undefined || q === null || q === '') return;
      var qn = Number(q);
      if (!Number.isInteger(qn) || qn < 1) throw new Error('Số lượng sản phẩm không hợp lệ');
    });

    var orderType = forceType || payload.order_type || 'product';

    // Validate appointDate for booking/deposit orders
    if (orderType === 'booking' || orderType === 'deposit') {
      if (!appointDate) throw new Error('Vui lòng chọn ngày hẹn');
      var parsedAppoint;
      if (/^\d{4}-\d{2}-\d{2}$/.test(appointDate)) {
        parsedAppoint = new Date(appointDate);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(appointDate)) {
        var dp = appointDate.split('/');
        parsedAppoint = new Date(parseInt(dp[2], 10), parseInt(dp[1], 10) - 1, parseInt(dp[0], 10));
      } else {
        throw new Error('Định dạng ngày hẹn không hợp lệ (dùng DD/MM/YYYY hoặc YYYY-MM-DD)');
      }
      if (isNaN(parsedAppoint.getTime())) throw new Error('Ngày hẹn không hợp lệ');
      var apToday = new Date(); apToday.setHours(0, 0, 0, 0);
      if (parsedAppoint < apToday) throw new Error('Ngày hẹn đã qua, vui lòng chọn ngày từ hôm nay trở đi');
    }

    // REOPEN 2026-09-10 (ADR-007/T-83) — capacity check TRƯỚC KHI ghi bất kỳ dòng nào (cùng
    // nguyên tắc với guard bank config/coupon phía trên). Chỉ áp dụng orderType 'booking' (đặt
    // lịch tư vấn có khung giờ) — KHÔNG áp cho 'deposit' (đặt cọc giữ sản phẩm, không có slot giờ).
    // Commit thật (tăng BookedCount) chỉ diễn ra SAU KHI ordersSheet.appendRow() ghi thành công —
    // xem _commitBookingSlot bên dưới.
    if (orderType === 'booking') {
      _checkBookingSlotCapacity(ss, appointDate, appointTime, storeBranch, settings);
    }

    _perfMark(_pid, 'validate_start');
    var validated     = validateAndPriceItems(ss, rawItems, orderType);
    var resolvedItems = validated.items;
    var totalAmount   = validated.totalAmount;
    _perfMark(_pid, 'validate_price_done');

    // Mã giảm giá — kiểm tra NGAY, trước khi ghi bất kỳ dòng nào (giống guard bank config
    // ở đầu hàm). Mã sai/hết hạn/hết lượt → báo lỗi rõ, KHÔNG âm thầm bỏ qua giảm giá rồi
    // vẫn tạo đơn full giá (khách sẽ không biết và bị thu nhầm).
    var couponCode     = String(payload.coupon_code || '').trim().toUpperCase();
    var discountAmount = 0;

    // Chiết khấu tại quầy — thủ công hoặc Khách Sỉ (docs/mops.md §16). CHỈ áp dụng cho đơn tạo từ
    // quầy (_staffActor có giá trị) — đơn khách tự đặt qua page.payment.bwt không đi qua nhánh này.
    var orderDiscountType   = '';
    var orderDiscountValue  = 0;
    var orderDiscountReason = '';
    if (payload._staffActor) {
      var clientDiscType   = String(payload.order_discount_type || '').trim();
      var clientDiscValue  = Number(payload.order_discount_value) || 0;
      var clientDiscReason = _sanitizeText(payload.order_discount_reason || '', 300);
      var wantsDiscount    = clientDiscValue > 0;

      // Loại trừ Coupon — throw rõ, KHÔNG âm thầm bỏ qua (đúng nguyên tắc coupon sai/hết hạn ở trên).
      if (couponCode && wantsDiscount) {
        throw new Error('Không thể áp dụng đồng thời mã giảm giá và chiết khấu thủ công/Khách Sỉ trên cùng 1 đơn');
      }

      // Khách Sỉ — server tự tra lại theo Phone, KHÔNG tin số client gửi cho phần chính sách.
      // Chỉ coi là "chính sách" (miễn check hạn mức Role) khi client gửi ĐÚNG khớp %/giá trị đã tra
      // được — nếu staff tự sửa % khác đi, đó là quyết định thủ công của staff, phải qua hạn mức.
      var existingCustomer = _findCustomerByPhone(ss, customerPhone);
      var isPolicyDiscount = false;
      if (existingCustomer && existingCustomer.group === 'SỈ' && existingCustomer.default_discount_percent > 0
          && clientDiscType === '%' && clientDiscValue === existingCustomer.default_discount_percent) {
        orderDiscountType  = '%';
        orderDiscountValue = existingCustomer.default_discount_percent;
        isPolicyDiscount   = true;
      }

      if (!isPolicyDiscount && wantsDiscount) {
        if (['VNĐ', '%'].indexOf(clientDiscType) === -1) throw new Error('Loại chiết khấu phải là VNĐ hoặc %');
        orderDiscountType  = clientDiscType;
        orderDiscountValue = clientDiscValue;
        // Hạn mức DiscountLimits tính theo %, nhưng loại VNĐ vẫn phải quy đổi ra % tương đương để
        // check — nếu không, staff có thể né hạn mức bằng cách gõ số tiền cố định thay vì %.
        var maxDiscPct        = _getMaxDiscountPercent(payload._staffRole);
        var equivalentPercent = clientDiscType === '%' ? clientDiscValue
          : (totalAmount > 0 ? (clientDiscValue / totalAmount * 100) : 0);
        if (equivalentPercent > maxDiscPct) {
          throw new Error('Vượt hạn mức chiết khấu cho phép (' + maxDiscPct + '%) — nhờ 1 tài khoản có Role cao hơn tạo đơn này');
        }
      }

      if (orderDiscountValue > 0) orderDiscountReason = clientDiscReason;
    }

    if (couponCode) {
      var couponResult = _evaluateCoupon(ss, couponCode, totalAmount, resolvedItems.map(function(it) {
        return { handle: it.handle, product_type: it.product.productType, line_total: it.lineTotal };
      }));
      if (!couponResult.valid) throw new Error(couponResult.error);
      discountAmount = couponResult.discount_amount;
      totalAmount    = totalAmount - discountAmount;
      _perfMark(_pid, 'coupon_done');
    } else if (orderDiscountValue > 0) {
      // VNĐ hoặc % của totalAmount TRƯỚC giảm — kẹp không vượt totalAmount (không cho tổng đơn âm).
      var orderDiscAmount = orderDiscountType === '%'
        ? Math.round(totalAmount * orderDiscountValue / 100)
        : orderDiscountValue;
      orderDiscAmount = Math.min(orderDiscAmount, totalAmount);
      totalAmount     = totalAmount - orderDiscAmount;
    }

    // Phí giao khách trả: mức mặc định dựa trên tiền hàng SAU giảm giá. Chỉ có khi đơn
    // thực sự có địa chỉ giao; phí hãng vận chuyển được ghi riêng ở Orders.AF sau này.
    var hasCustomerShipping = !!(String(payload.ship_address || '').trim() || String(payload.ship_province || '').trim());
    var customerShipping = _resolveCustomerShippingCharge(payload, totalAmount, hasCustomerShipping);
    var customerShippingFee = customerShipping.fee;

    var depositAmount = 0;
    if (orderType === 'deposit' || orderType === 'booking') {
      depositAmount = resolvedItems.reduce(function(sum, item) {
        return sum + (item.mapping.depositAmount || 0) * item.qty;
      }, 0);
      // Kẹp không vượt tổng đơn ĐÃ giảm giá — nếu không, đơn cọc có thể thu nhiều hơn
      // giá trị thật của đơn khi mã giảm giá làm totalAmount tụt xuống dưới mức cọc mặc định.
      depositAmount = Math.min(depositAmount, totalAmount);
    }
    var payAmount = (depositAmount > 0 ? depositAmount : totalAmount) + customerShippingFee;

    _perfMark(_pid, 'before_upsert_customer');
    var customerId = upsertCustomer(ss, customerPhone, customerName, customerEmail);
    _perfMark(_pid, 'upsert_customer_done');

    // Địa chỉ giao hàng — TUỲ CHỌN (review 2026-07-16), chỉ ghi khi staff/khách thực sự điền (đa số
    // đơn MOPS là cọc/mua tại quầy, không cần giao). Xem _createShippingAddress().
    var shippingAddressId = '';
    var shipAddress = String(payload.ship_address || '').trim();
    var shipProvince = String(payload.ship_province || '').trim();
    if (shipAddress || shipProvince) {
      // Phát hiện khách hàng mới (chưa có địa chỉ nào) → force save-default địa chỉ vừa nhập
      // vào hồ sơ, không cần staff tick "Lưu địa chỉ mặc định" (đúng yêu cầu spec 2026-08-11).
      var _existingAddrs = _listCustomerShippingAddresses(ss, customerId);
      var _isNewCustomerAddr = !_existingAddrs || _existingAddrs.length === 0;
      // 2026-08-16: dedupe qua _upsertShippingAddress — nếu địa chỉ trùng dòng có sẵn của khách thì
      // reuse address_id, tránh sổ địa chỉ phình lên mỗi lần tạo đơn cùng địa chỉ.
      shippingAddressId = _upsertShippingAddress(ss, {
        customer_id: customerId,
        receiver_name: String(payload.ship_receiver_name || customerName || '').trim(),
        phone: String(payload.ship_phone || customerPhone || '').trim(),
        province: shipProvince, district: String(payload.ship_district || '').trim(),
        ward: String(payload.ship_ward || '').trim(), address: shipAddress,
        province_id: String(payload.province_code || payload.ship_province_id || '').trim(),
        district_id: String(payload.district_code || payload.ship_district_id || '').trim(),
        ward_code:   String(payload.ward_code || payload.ship_ward_code || '').trim()
      });
      if (payload.save_customer_address || _isNewCustomerAddr) {
        _setCustomerDefaultShippingAddress(ss, customerId, shippingAddressId);
      }
    }

    // Chi nhánh (§20/review 31) — resolve fallback về chi nhánh IsDefault để KHÔNG đơn nào thiếu
    // BranchID ngay từ lúc tạo, kể cả đơn khách tự đặt qua page.payment (không gửi branch_id). Đồng
    // thời ghi đè storeBranch=NameVi vào cột Store cũ (P) để không vỡ 11 chỗ code cũ đang đọc cột đó
    // (getOrder()/listTransactions()/§17 revenue_by_store fallback khi BranchID rỗng).
    var branch = branchId ? Repository.Branches.findById(branchId) : null;
    if (!branch || !branch.active) branch = Repository.Branches.findDefault();
    if (branch) { branchId = branch.branch_id; storeBranch = branch.name_vi; } else { branchId = ''; }
    _perfMark(_pid, 'branch_bank_start');

    // TK ngân hàng nhận VietQR — resolve theo chi nhánh đơn (2026-07-21), GHIM vào đơn (Payments.RawData)
    // để xem lại QR luôn đúng TK ban đầu dù sau này đổi mặc định. COD/CASH không cần (không có QR trả trước).
    var bankAcct = (isCod || isCash) ? null : _resolveBankAccount(ss, branchId, settings);
    if (!isCod && !isCash && !bankAcct) {
      throw new Error(payload._staffActor
        ? 'Chưa cấu hình tài khoản nhận tiền — vào MOPS Admin > Chi nhánh > Tài khoản ngân hàng để thêm trước khi nhận đơn.'
        : 'Hệ thống tạm thời chưa thể nhận đơn, vui lòng thử lại sau ít phút hoặc liên hệ trực tiếp.');
    }

    var ordersSheet = ss.getSheetByName(SHEET.ORDERS);
    _customerShippingEnsureCols(ordersSheet);
    var orderId     = generateId(ordersSheet, 'MOPS', 4);
    _perfMark(_pid, 'gen_order_id_done');

    // Chỉ đơn 'product' mới có đường đẩy lên SAPO (xem pushOrderToSapo) — deposit/booking
    // không có khái niệm tương ứng bên SAPO nên giữ NOT_REQUIRED vĩnh viễn, không lọt vào
    // vòng đời PENDING→SYNCING→SYNCED/FAILED.
    var initialSapoSyncStatus = orderType === 'product' ? 'PENDING' : 'NOT_REQUIRED';

    // FulfillmentStatus ban đầu — 3-Axis Phase 2 (2026-08-09): TÁCH Fulfillment KHỎI Payment. STAFF
    // tạo bất kỳ method nào (VIETQR/COD/CASH) đều vào thẳng 'pending_packing' — kho không cần đợi
    // tiền về. Payment status độc lập, theo dõi ở Orders.H. Đơn KHÁCH tự đặt qua Sapo giữ nguyên
    // 'pending_approval' (chờ staff kiểm duyệt trước — approveOrder đẩy pending_packing).
    // (Cũ: STAFF+VIETQR → 'pending_payment' ép chờ trả trước, sai với chuẩn Sapo/Haravan/KiotViet.)
    var initialFulfillment = payload._staffActor ? 'pending_packing' : 'pending_approval';

    ordersSheet.appendRow([
      orderId,        // A OrderID
      customerId,     // B CustomerID
      orderType,      // C OrderType
      source,         // D Source
      totalAmount,    // E Amount
      depositAmount,  // F DepositAmount
      shippingAddressId, // G ShippingAddressID — '' nếu đơn không cần giao hàng (xem trên)
      isCash ? 'PAID' : 'PENDING', // H PaymentStatus — CASH: thu tiền mặt ngay tại quầy → PAID luôn (2026-07-21)
      initialSapoSyncStatus, // I SAPOSyncStatus
      '',             // J SAPOOrderID
      nowIso(),       // K CreatedAt
      payload._staffActor || 'customer', // L CreatedBy
      customerNote,   // M CustomerNote
      appointDate,    // N AppointmentDate
      appointTime,    // O AppointmentTime
      storeBranch,    // P Store
      couponCode,     // Q DiscountCode
      discountAmount, // R DiscountAmount
      // S-W (OriginSystem/SAPOFinancialStatus/SAPOFulfillmentStatus/SyncRetryCount/LastSyncedAt):
      // createOrder() KHÔNG tự ghi các cột này (chỉ pullOrdersFromSapo() ghi OriginSystem='SAPO' cho
      // đơn kéo về) — giữ nguyên hành vi cũ, chỉ cần placeholder rỗng ở đây để appendRow() tới được
      // đúng vị trí cột X-Z (§16) — appendRow() ghi liên tục từ cột 1, không tự "nhảy cột" được.
      '', '', '', 0, '',
      orderDiscountType,   // X OrderDiscountType (§16)
      orderDiscountValue,  // Y OrderDiscountValue
      orderDiscountReason, // Z OrderDiscountReason
      branchId,            // AA BranchID (review 31)
      '',                  // AB SAPOOrderName (createOrder không set — chỉ pullOrdersFromSapo ghi)
      initialFulfillment,  // AC FulfillmentStatus (phase vận chuyển 2026-07-17)
      // AD–AL là shipping state; CODAmount (AG) đã biết khi tạo đơn nên ghi thẳng,
      // tránh _shipmentSet() phải đọc/ghi lại cả block 9 cột sau append.
      '', '', '', isCod ? payAmount : '', '', '', '', '', '',
      customerShippingFee, customerShipping.is_manual
    ]);
    var orderRowNum = ordersSheet.getLastRow();
    // REOPEN 2026-09-10 (ADR-007/T-83) — Orders đã ghi thành công, giờ mới commit slot thật.
    if (orderType === 'booking') {
      _commitBookingSlot(ss, appointDate, appointTime, storeBranch);
    }
    // 2026-08-23 ghi cột AQ=43 (InternalNote) ĐỘC LẬP với appendRow — appendRow chỉ ghi 40 cột (đến AN),
    // AO/AP/AQ do các subsystem riêng quản lý. Nếu internalNote rỗng vẫn gọi ensureCol để sheet cũ được
    // nới cột tự động (giống pattern LabelURL). Best-effort — không throw nếu quota vượt.
    if (internalNote) {
      try { _internalNoteSet(ordersSheet, orderRowNum, internalNote); } catch (e) { /* best-effort */ }
    }
    _perfMark(_pid, 'orders_append_done');

    var itemsSheet      = ss.getSheetByName(SHEET.ORDER_ITEMS);
    var productNamesArr = [];
    var itemRowNums     = [];
    var itemUnitCosts   = []; // Phase 02 Bước 4 — song song resolvedItems, dùng lại cho InventoryMovements bên dưới
    var paymentId, transRef, createdAt, expiresAt;

    var _avgCost = _calcAvgCostBatch(); // perf: đọc InventoryMovements 1 lần cho cả vòng lặp (thay N+1)
    _perfMark(_pid, 'avg_cost_batch_done');
    try {
      // Bulk write (perf sprint 2026-08-06): 1 lần gen N ID + 1 lần setValues + 1 lần setNumberFormat
      // range thay N × (generateId scan + appendRow + 4 × setNumberFormat). Behavior-identical.
      var itemIds = generateIdsBatch(itemsSheet, 'OI', 6, resolvedItems.length);
      var itemRows = resolvedItems.map(function(item, idx) {
        var unitCost = _avgCost(item.productId, item.variantId);
        itemUnitCosts.push(unitCost);
        productNamesArr.push(item.productName + (item.qty > 1 ? ' x' + item.qty : ''));
        return [
          itemIds[idx],     // A OrderItemID
          orderId,          // B OrderID
          item.productId,   // C ProductID
          item.variantId,   // D VariantID
          item.handle,      // E Handle
          item.sku,         // F SKU
          item.productName, // G ProductName
          item.price,       // H Price
          item.qty,         // I Qty
          item.lineTotal,   // J LineTotal
          item.snapshot,    // K SnapshotJSON
          unitCost          // L UnitCost (Phase 02 Bước 4)
        ];
      });
      var itemStartRow = itemsSheet.getLastRow() + 1;
      itemsSheet.getRange(itemStartRow, 1, itemRows.length, 12).setValues(itemRows);
      // Ghi row-num vào itemRowNums NGAY sau setValues thành công (trước format) — nếu setNumberFormat
      // ném lỗi thì catch (writeErr) bên dưới vẫn có đủ row-num để dọn.
      for (var _ri = 0; _ri < itemRows.length; _ri++) itemRowNums.push(itemStartRow + _ri);
      // Format 4 cột số của toàn khối 1 lần (H Price, I Qty, J LineTotal, L UnitCost)
      _perfMark(_pid, 'items_loop_done');

      var paymentsSheet = ss.getSheetByName(SHEET.PAYMENTS);
      paymentId  = generateId(paymentsSheet, 'PAY', 6);
      transRef   = orderId;
      createdAt  = nowIso();
      expiresAt  = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      paymentsSheet.appendRow([
        paymentId,  // A PaymentID
        orderId,    // B OrderID
        transRef,   // C TransactionRef
        paymentMethod, // D Method — 'VIETQR' | 'COD' | 'CASH' (CASH thêm 2026-07-21)
        payAmount,  // E Amount
        isCash ? 'PAID' : 'PENDING',  // F Status — CASH: thu tiền mặt ngay tại quầy → PAID luôn
        createdAt,  // G CreatedAt
        isCash ? '' : expiresAt,      // H ExpiresAt — CASH không có hạn QR trả trước
        isCash ? createdAt : '',      // I PaidAt — CASH: thời điểm thu tiền = lúc tạo đơn
        '',         // J RefundAt
        '',         // K RefundNote
        // L RawData — GHIM tài khoản ngân hàng đã dùng cho đơn VietQR (2026-07-21): getOrder dựng lại QR
        // từ snapshot này, không resolve động → khách đang thanh toán không bị đổi TK giữa chừng.
        bankAcct ? JSON.stringify({ bank_account_id: bankAcct.bank_account_id, bank_code: bankAcct.bank_code, account_no: bankAcct.account_no, account_name: bankAcct.account_name }) : ''
      ]);
      _perfMark(_pid, 'payment_append_done');

    } catch (writeErr) {
      // Ghi Orders/OrderItems/Payments không có transaction thật trong GAS —
      // dọn các dòng đã ghi thành công trước khi lỗi xảy ra (thứ tự ngược),
      // KHÔNG đụng Customers (upsert customer tồn tại độc lập, vô hại dù đơn fail).
      for (var ri = itemRowNums.length - 1; ri >= 0; ri--) {
        try { itemsSheet.deleteRow(itemRowNums[ri]); } catch (e2) { /* best-effort */ }
      }
      try { ordersSheet.deleteRow(orderRowNum); } catch (e2) { /* best-effort */ }
      throw writeErr;
    }

    // Tăng lượt dùng mã CHỈ sau khi đơn đã ghi thành công — best-effort, không rollback
    // đơn/thanh toán đã tạo dù việc đếm lượt dùng có lỗi.
    if (couponCode) _incrementCouponUsage(ss, couponCode);

    // Phase 02 Bước 4 — ghi InventoryMovements (Type=OUT) cho từng dòng hàng đã bán, VÀ trừ
    // trực tiếp Products.InventoryQty (mọi Source — xem _adjustInventoryQty(), quyết định
    // 2026-07-10: SAPO không quản lý kho thật cho store này, Hướng A không còn ý nghĩa).
    // Cho phép âm (mind map dòng 31 — bán âm được phép). Best-effort, giống
    // _incrementCouponUsage() ở trên — 1 lỗi ghi log không được phép làm hỏng đơn đã tạo.
    // Bulk write (perf sprint 2026-08-06): dồn N cặp (movement, qty adjust) thành 2 lần setValues
    // thay N × (append IM + adjust cell).
    try {
      var invEntries = [];
      var qtyDeltas = [];
      var actorInv = payload._staffActor || 'customer';
      resolvedItems.forEach(function(item, idx) {
        if (!item.productId) return; // sản phẩm không map ProductID (vd dịch vụ) — bỏ qua log tồn kho
        invEntries.push({
          product_id: item.productId, variant_id: item.variantId, type: 'OUT', qty: item.qty,
          unit_cost: itemUnitCosts[idx], source_type: 'SALE', source_ref: orderId, created_by: actorInv
        });
        qtyDeltas.push({ product_id: item.productId, variant_id: item.variantId, delta: -item.qty,
          product_row: item.product && item.product._row });
      });
      if (invEntries.length) Repository.InventoryMovements.appendMany(invEntries);
      if (qtyDeltas.length) {
        // LOCK (2026-09-05): _adjustInventoryQtyBatch làm read-modify-write (đọc InventoryQty hiện
        // tại rồi +delta, mops_01.js — comment "đọc FRESH để tích luỹ đúng" giả định caller đã khoá)
        // nhưng createOrder trước đây KHÔNG khoá chỗ này — 2 đơn tạo cùng lúc cho cùng sản phẩm có
        // thể mất 1 lượt trừ kho (lost update). Khoá riêng đúng đoạn này, không khoá cả createOrder
        // (hàm rất dài, phần lớn không cần serialize) — nếu waitLock timeout, catch bên ngoài vẫn
        // nuốt lỗi này y như mọi lỗi tồn kho khác ở đây (best-effort, không chặn đơn đã tạo).
        // skipInventoryLock (tham số hàm, xem khai báo createOrder ở trên — KHÔNG đọc từ payload):
        // createOrderPosComplete gọi createOrder() trong khi ĐÃ giữ sẵn lock ngoài cho toàn bộ saga
        // (mops_02.js, biến `lock` trong createOrderPosComplete) — khoá thêm 1 lớp nữa ở đây sẽ là
        // waitLock() lồng nhau trong CÙNG 1 execution, đúng anti-pattern mà docs/mops-contract.md
        // §13.6 nói rõ là "undocumented behavior" cần tránh (autoCreateReceipt() làm mẫu: 2 lock
        // tuần tự, không lồng).
        if (skipInventoryLock) {
          _adjustInventoryQtyBatch(ss, qtyDeltas);
        } else {
          _withLock(function() { _adjustInventoryQtyBatch(ss, qtyDeltas); });
        }
      }
    } catch (moveErr) { /* best-effort — không chặn đơn hàng vì lỗi log tồn kho */ }
    _perfMark(_pid, 'inventory_done');

    var qrUrl        = (isCod || isCash) ? '' : buildVietQRUrl(bankAcct, payAmount, transRef); // COD/CASH không có QR trả trước
    var productNames = productNamesArr.join(', ');

    logActivity(ss, 'ORDER', orderId, 'ORDER_CREATED', auditActor);
    _perfMark(_pid, 'log_activity_done');

    // CASH (2026-07-21): tiền mặt đã thu ngay tại quầy → đơn PAID từ lúc tạo (cột H + Payments.Status
    // ở trên). Sinh Phiếu Thu vào quỹ TIỀN MẶT ngay, thay cho luồng confirmPayment() (VietQR) /
    // payReconciliation() (COD) mà đơn CASH không đi qua. Best-effort giống nhánh PAID ở confirmPayment:
    // 1 lỗi Finance KHÔNG được chặn đơn Sales đã ghi thành công — nuốt lỗi, log + cảnh báo owner.
    if (isCash) {
      logActivity(ss, 'ORDER', orderId, 'PAYMENT_CONFIRMED', auditActor + ' — CASH');
      if (paymentId && payAmount > 0) {
        try {
          autoCreateReceipt(orderId, paymentId, payAmount, storeBranch, 'CASH');
        } catch (financeEx) {
          logActivity(ss, 'FINANCE', orderId, 'RECEIPT_AUTO_CREATE_FAILED', 'system — ' + financeEx.message);
          notifyTelegram(ss, orderId, 'RECEIPT_AUTO_CREATE_FAILED',
            { amount: payAmount },
            settings,
            '⚠️ <b>Lỗi tạo Phiếu Thu tự động (tiền mặt)</b>\n' +
            'Đơn: ' + orderId + '\n' +
            'Số tiền: ' + payAmount.toLocaleString('vi-VN') + 'đ\n' +
            'Lỗi: ' + financeEx.message + '\n' +
            'Cần tạo Phiếu Thu thủ công hoặc xem Báo cáo → Tài chính → Đơn thiếu Phiếu Thu.'
          );
        }
      }
    }

    // N1 — ORDER_CREATED → Staff → Telegram
    // Mask SĐT: ẩn 3 ký tự cuối
    var maskedPhone = customerPhone.length > 3
      ? customerPhone.slice(0, -3) + '***'
      : '***';
    notifyTelegram(ss, orderId, 'ORDER_CREATED',
      { orderType: orderType, productNames: productNames, maskedPhone: maskedPhone, amount: payAmount },
      settings,
      '🆕 <b>Đơn mới ' + orderId + '</b>\n' +
      'Loại: ' + orderType + '\n' +
      'Dịch vụ: ' + productNames + '\n' +
      'SĐT: ' + maskedPhone + '\n' +
      'Cọc: ' + payAmount.toLocaleString('vi-VN') + 'đ\n' +
      // SECURITY (2026-09-05): customerNote là free text từ form đặt hàng (khách tự nhập) — escape
      // trước khi nối vào message parse_mode:'HTML'.
      (customerNote ? 'Ghi chú: ' + _escapeHtml(customerNote) + '\n' : '') +
      (appointDate  ? 'Hẹn: ' + appointDate + ' ' + appointTime + '\n' : '')
    );
    _perfMark(_pid, 'notify_telegram_done');
    _perfReport(_pid);

    return {
      order_id:        orderId,
      payment_id:      paymentId,
      transaction_ref: transRef,
      qr_url:          qrUrl,
      total_amount:    payAmount,
      deposit_amount:  depositAmount,
      discount_code:   couponCode || '',
      discount_amount: discountAmount,
      expire_at:       expiresAt,
      product_name:    productNames,
      order_type:      orderType,
      // V1 compat
      id:              orderId,
      status:          isCash ? 'PAID' : 'PENDING'
    };
  } catch (ex) {
    logActivity(ss, 'ORDER', customerPhone || '(unknown)', 'ORDER_CREATE_FAILED', auditActor + ' — ' + ex.message);
    _perfMark(_pid, 'ERROR:' + (ex.message || '').slice(0, 60));
    _perfReport(_pid);
    throw ex;
  }
}

// Chính sách phí giao THU KHÁCH. Không dùng ShippingFee của hãng vì đó là chi phí vận hành
// có thể khác giá shop thu khách. `customer_shipping_fee_manual=true` cho phép nhập cả 0đ.
function _resolveCustomerShippingCharge(payload, merchandiseAmount, hasShipping, existing) {
  if (!hasShipping) return { fee: 0, is_manual: false };
  var hasManualValue = payload.customer_shipping_fee !== undefined && payload.customer_shipping_fee !== null && payload.customer_shipping_fee !== '';
  var askedManual = payload.customer_shipping_fee_manual === true || String(payload.customer_shipping_fee_manual).toLowerCase() === 'true';
  var fee;
  if (askedManual && hasManualValue) {
    fee = Number(payload.customer_shipping_fee);
    if (!isFinite(fee) || fee < 0) throw new Error('Phí giao hàng không hợp lệ');
    return { fee: Math.round(fee), is_manual: true };
  }
  if (existing && existing.is_manual && !hasManualValue) return { fee: existing.fee, is_manual: true };
  // Đơn có phí được nhập nhưng thiếu cờ manual từ client cũ: tôn trọng giá cũ để không ghi đè
  // thoả thuận đã lưu. Client mới luôn gửi cờ rõ ràng.
  if (existing && existing.is_manual) return { fee: existing.fee, is_manual: true };
  return { fee: merchandiseAmount >= 500000 ? 0 : 30000, is_manual: false };
}

// ============================================================
// REPORT PAYMENT (customer self-report — "Tôi đã chuyển")
// ============================================================

function reportPayment(payload) {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id is required');

  var settings = getSettings(ss);
  var paySh    = ss.getSheetByName(SHEET.PAYMENTS);
  var payData  = paySh.getLastRow() > 1
    ? paySh.getRange(2, 1, paySh.getLastRow() - 1, 12).getValues()
    : [];

  var payRow = -1, currentStatus = '', payAmount = 0;
  for (var i = 0; i < payData.length; i++) {
    if (String(payData[i][1]) === orderId) {
      payRow        = i + 2;
      currentStatus = String(payData[i][5]);
      payAmount     = Number(payData[i][4]);
      break;
    }
  }

  if (payRow === -1) throw new Error('Không tìm thấy giao dịch cho đơn ' + orderId);

  if (currentStatus === 'PAID' || currentStatus === 'REFUNDED')
    return { order_id: orderId, status: currentStatus };
  if (currentStatus === 'EXPIRED')
    throw new Error('Giao dịch đã hết hạn. Vui lòng tạo đơn mới.');

  paySh.getRange(payRow, 6).setValue('PAYMENT_REPORTED');

  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var ordData  = ordersSh.getLastRow() > 1
    ? ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 18).getValues()
    : [];
  for (var j = 0; j < ordData.length; j++) {
    if (String(ordData[j][0]) === orderId) {
      ordersSh.getRange(j + 2, 8).setValue('PAYMENT_REPORTED');
      break;
    }
  }

  logActivity(ss, 'PAYMENT', orderId, 'PAYMENT_REPORTED', 'customer');

  // N2 — PAYMENT_REPORTED → Staff → Telegram
  notifyTelegram(ss, orderId, 'PAYMENT_REPORTED',
    { amount: payAmount },
    settings,
    '💳 <b>Khách báo đã chuyển khoản</b>\n' +
    'Đơn: ' + orderId + '\n' +
    'Số tiền: ' + payAmount.toLocaleString('vi-VN') + 'đ\n' +
    'Trạng thái: chờ xác nhận'
  );

  return { order_id: orderId, status: 'PAYMENT_REPORTED' };
}

// ============================================================
// GET ORDER
// ============================================================

function getOrder(orderId, verifyPhone, staffToken) {
  if (!orderId) throw new Error('order_id is required');

  // Admin calls already arrive through _handleRead(), which enforces orders.view before this
  // function is invoked. Validate the supplied session token again, then take the detail-cache
  // fast path *before* opening the spreadsheet or reading Settings/Orders/Customers. Previously
  // the cache check occurred after those reads, so an otherwise valid 5-minute cache hit still
  // paid several Spreadsheet RPCs on every detail open. Customer lookup keeps its phone check
  // below, because the cached result must never bypass that authorization check.
  var detailCacheKey = 'order_detail_' + String(orderId);
  if (staffToken) {
    requireStaffToken(staffToken);
    try {
      var cachedAdminDetail = CacheService.getScriptCache().get('rc_' + detailCacheKey + '_' + _analyticsGen());
      if (cachedAdminDetail) return JSON.parse(cachedAdminDetail);
    } catch (earlyDetailCacheErr) { /* performance-only cache */ }
  }

  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var _pid = _perfStart('get_order');
  _perfMark(_pid, 'enter');

  // Read only this order row. list_transactions warms the row index; direct deep-links safely
  // fall back to TextFinder instead of materializing the complete Orders sheet.
  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var orderRowsById = _getRowIndex('orders') || {};
  var orderRow = Number(orderRowsById[String(orderId)]) || _findSheetRowExact(ordersSh, 1, orderId);
  var ord = orderRow === -1 ? null : Repository.Orders._mapRow(
    ordersSh.getRange(orderRow, 1, 1, Math.min(ordersSh.getLastColumn(), 40)).getValues()[0], orderRow);
  if (!ord) throw new Error('Không tìm thấy đơn hàng ' + orderId);
  _perfMark(_pid, 'orders_findById_done');

  // SECURITY + PERF (2026-09-05): order_id là counter tuần tự (_peekNextIds) — không phải bearer
  // secret, dò tuần tự là tầm thường. Trước fix này, gọi KHÔNG kèm cả token lẫn phone vẫn lọt qua và
  // (sau khi đọc hết Customers/OrderItems/Payments/ActivityLogs) trả FULL PII — đúng lỗ hổng mà chính
  // comment gốc của getOrderByTracking (dưới) đã mô tả PHẢI tránh nhưng code chưa từng thực thi. Fix
  // ở ĐÂY, ngay sau khi đọc xong 1 dòng Orders, KHÔNG phải redact ở cuối: không có gì để xác thực thì
  // cũng không cần đọc thêm gì — vừa đóng lỗ PII vừa tránh chi phí Spreadsheet I/O đầy đủ cho mỗi lượt
  // dò order_id ẩn danh (review 2026-09-05 chỉ ra bản redact-ở-cuối vẫn tốn I/O như cũ). Cache riêng
  // khoá (`_min`) — không được lẫn với cache bản full bên dưới.
  if (!staffToken && !verifyPhone) {
    // Dùng _cachedRead() có sẵn (mops_00.js) thay vì tự viết get/JSON.parse/size-guard/put tay —
    // review round 4 chỉ ra bản tự viết trùng logic hệt _cachedRead, dễ lệch nhau khi 1 trong 2 chỗ
    // đổi sau này. Khoá base riêng (`_min`) — không lẫn với cache bản full bên dưới.
    var minResult = _cachedRead(detailCacheKey + '_min', function() {
      var built = {
        order_id: orderId,
        status: ord.payment_status,
        order_type: ord.order_type,
        fulfillment_status: ord.fulfillment_status,
        created_at: ord.created_at,
        tracking_code: ord.tracking_code,
        shipment_timeline: [],
        id: orderId
      };
      if (ord.tracking_code) {
        try { built.shipment_timeline = _shipmentHistoryList(ss, orderId); } catch (eTimeline) { built.shipment_timeline = []; }
      }
      return built;
    });
    // PERF (2026-09-05, review round 2): nhánh sớm này trước đây return thẳng, bỏ sót _perfReport —
    // khi bật MOPS_PERF_LOG, toàn bộ traffic ẩn danh (chính là traffic muốn đo ở đây) biến mất khỏi
    // log, ngược với mục đích thêm harness.
    _perfMark(_pid, 'min_complete');
    _perfReport(_pid);
    return minResult;
  }

  // 2026-08-23 đọc internal_note (cột AQ=43) độc lập — _mapRow ở trên giới hạn 40 cột (giữ nguyên hành vi cũ).
  // Đơn cũ hoặc sheet chưa nới cột → _internalNoteGet trả '' (không throw).
  var internalNoteVal = _internalNoteGet(ordersSh, orderRow);

  var customerId = ord.customer_id;

  // Consolidate 2 lần đọc Customers cũ (verify phone + fetch name/phone) → 1 lần: đọc A/B/C tất cả rồi
  // tra khách. Repository.Customers.findById tự memo per-request nhưng ở đây chỉ cần 3 cột nên đọc thẳng.
  var custName = '', custPhone = '';
  var custMatched = null;
  var custShN = ss.getSheetByName(SHEET.CUSTOMERS);
  var customerRowsById = _getRowIndex('customers') || {};
  var customerRow = Number(customerRowsById[customerId]) || _findSheetRowExact(custShN, 1, customerId);
  if (customerRow !== -1) {
    var custRow = custShN.getRange(customerRow, 2, 1, 2).getValues()[0]; // B Phone, C Name
    custMatched = { phone: String(custRow[0] || ''), name: String(custRow[1] || '') };
  }
  if (custMatched) { custPhone = custMatched.phone; custName = custMatched.name; }
  _perfMark(_pid, 'customers_read_done');

  if (!staffToken && verifyPhone) {
    // Customer path — phone verification (anti-enumeration: same error for miss/mismatch)
    if (!custMatched || normalizePhone(custMatched.phone) !== normalizePhone(verifyPhone)) {
      throw new Error('Không tìm thấy đơn hàng ' + orderId);
    }
  }
  // Đến đây luôn là nhánh authorized/full: staffToken có giá trị, HOẶC verifyPhone đã khớp ở trên
  // (verifyPhone sai đã throw; verifyPhone rỗng + không token đã return sớm ở khối minCacheKey trên).

  // Customer lookup cache path: it remains after phone verification above. Admin calls already
  // used the early cache fast path before Spreadsheet I/O; this fallback is for a cold/missed
  // admin cache or public phone-verified lookup. The generation token changes after every write,
  // so stale detail data is never selected after a mutation.
  try {
    var cachedDetail = CacheService.getScriptCache().get('rc_' + detailCacheKey + '_' + _analyticsGen());
    if (cachedDetail) {
      _perfMark(_pid, 'detail_cache_hit');
      _perfReport(_pid);
      return JSON.parse(cachedDetail);
    }
  } catch (detailCacheErr) { /* performance-only cache */ }

  var paymentStatus  = ord.payment_status;
  var orderType      = ord.order_type;
  var merchandiseAmount = ord.total_amount;
  var customerShipping = _customerShippingGet(ss, orderId, { sheet: ordersSh, row: ord._row });
  var customerShippingFee = customerShipping.fee;
  var totalAmount    = merchandiseAmount + customerShippingFee;
  var depositAmount  = ord.deposit_amount;
  var sapoSyncStatus = ord.sapo_sync_status;
  var sapoOrderId    = ord.sapo_order_id;
  var appointDate    = ord.appointment_date;
  var appointTime    = ord.appointment_time;
  var storeBranch    = ord.store_branch;
  var discountCode       = ord.discount_code;
  var discountAmount     = ord.discount_amount;
  var orderDiscountType  = ord.order_discount_type;
  var orderDiscountValue = ord.order_discount_value;

  // Địa chỉ giao hàng (review 2026-07-16) — null nếu đơn không cần giao (đa số đơn MOPS).
  var shippingAddress = _getShippingAddress(ss, ord.shipping_address_id);

  var itemsSh  = ss.getSheetByName(SHEET.ORDER_ITEMS);
  var itemRowsByOrder = _getRowIndex('order_items') || {};
  var orderItemRows = itemRowsByOrder[orderId] || _findSheetRowsExact(itemsSh, 2, orderId);
  var itemData = _readSheetRows(itemsSh, orderItemRows, 1, 11);
  var productNames = [], items = [], suggestedPackageWeight = 0;
  var itemsMissingEnrich = [];
  itemData.forEach(function(r) {
    if (String(r[1]) === orderId) {
      productNames.push(String(r[6]) + (Number(r[8]) > 1 ? ' x' + r[8] : ''));
      // Snapshot (r[10] = K SnapshotJSON) chốt sẵn image/variantTitle/weight lúc tạo đơn — perf sprint
      // 2026-08-06 dùng thẳng để tránh scan full Products (~2800 dòng, 500-1000ms). Đơn cũ có thể thiếu
      // 1 vài field → itemsMissingEnrich để fallback quét Products cho đúng chỉ những item đó.
      var snap = null;
      if (r[10]) { try { snap = JSON.parse(r[10]); } catch (e0) { snap = null; } }
      var image = snap && snap.image ? String(snap.image) : '';
      var variantTitle = snap && snap.variantTitle ? String(snap.variantTitle) : '';
      var weight = snap && snap.weight != null ? Number(snap.weight) || 0 : null; // null = chưa biết (đơn cũ)
      var it = {
        id: r[0], handle: r[4], variant_id: r[3], sku: r[5], name: r[6],
        price: r[7], qty: r[8], lineTotal: r[9],
        image_url: image, variant_title: variantTitle,
        weight: weight != null ? weight : 0
      };
      items.push(it);
      // Fallback bắt buộc chỉ khi thiếu (đơn cũ trước 2026-08-06 không có snapshot.weight).
      if (!image || weight == null) itemsMissingEnrich.push(it);
      suggestedPackageWeight += (weight != null ? weight : 0) * (Number(r[8]) || 1);
    }
  });
  // Fallback quét Products CHỈ khi có item thiếu image/weight từ snapshot (đơn cũ). Đơn mới snapshot đầy
  // đủ → skip toàn bộ scan Products (bỏ được ~500-1000ms trên đường nóng getOrder).
  if (itemsMissingEnrich.length) {
    try {
      var productLookup = {};
      Repository.Products.findAll().forEach(function(p) {
        var k = p.handle + '|' + (p.variant_id || '');
        if (!productLookup[k] || (productLookup[k].status !== 'active' && p.status === 'active')) productLookup[k] = p;
      });
      itemsMissingEnrich.forEach(function(it) {
        var k = String(it.handle || '') + '|' + String(it.variant_id || '');
        var p = productLookup[k] || productLookup[String(it.handle || '') + '|'];
        if (!p) return;
        if (!it.image_url) it.image_url = p.image || '';
        if (!it.variant_title) it.variant_title = p.variant_title || '';
        var fetchedW = Number(p.weight) || 0;
        // Chỉ cộng dồn phần thiếu (nếu snapshot đã có weight thì đã cộng ở loop trên).
        // Đơn cũ weight=null trên object → cộng bù ở đây, giữ suggestedPackageWeight chính xác.
        if (!it.weight) { it.weight = fetchedW; suggestedPackageWeight += fetchedW * (Number(it.qty) || 1); }
      });
    } catch (enrichErr) {
      try { Logger.log('getOrder enrich fallback failed for ' + orderId + ': ' + enrichErr); } catch (_lg) {}
    }
  }
  _perfMark(_pid, 'items_enrich_done');

  // DiscountAmount (cột R) không được ghi đúng cho chiết khấu tại quầy/Khách Sỉ (chỉ createOrder()
  // ghi cho nhánh coupon) — tính lại từ Tạm tính(items) − Amount(đã giảm) cho ĐÚNG mọi trường hợp,
  // không phụ thuộc cột R (review in đơn 2026-07-16).
  var itemsSubtotal = items.reduce(function(sum, it) { return sum + (Number(it.lineTotal) || 0); }, 0);
  if (itemsSubtotal > 0) discountAmount = Math.max(0, Math.round(itemsSubtotal - merchandiseAmount));

  // % chiết khấu hiển thị trên hoá đơn — ưu tiên chiết khấu tại quầy/Khách Sỉ (đã lưu % thẳng),
  // fallback tra Coupons theo mã nếu là mã giảm giá kiểu percent. Loại 'fixed'/VNĐ → không có %,
  // chỉ hiện số tiền.
  var discountPercent = null;
  if (orderDiscountType === '%' && orderDiscountValue > 0) {
    discountPercent = orderDiscountValue;
  } else if (discountCode) {
    var couponMeta = _getCouponValueType(ss, discountCode);
    if (couponMeta && couponMeta.valueType === 'percent') discountPercent = couponMeta.value;
  }

  var paySh   = ss.getSheetByName(SHEET.PAYMENTS);
  var paymentRowsByOrder = _getRowIndex('payments_by_order') || {};
  var paymentRow = Number(paymentRowsByOrder[orderId]) || _findSheetRowExact(paySh, 2, orderId);
  var payData = paymentRow === -1 ? [] : [paySh.getRange(paymentRow, 1, 1, 12).getValues()[0]];
  _perfMark(_pid, 'payments_read_done');

  var qrUrl = null, expireAt = null, paymentId = null, transRef = null;
  var paymentMethod = 'VIETQR'; // sẽ đọc từ Payments.D bên dưới; mặc định VIETQR cho đơn chưa có dòng Payment
  var payAmount = depositAmount > 0 ? depositAmount : totalAmount;

  for (var j = 0; j < payData.length; j++) {
    if (String(payData[j][1]) === orderId) {
      paymentId     = String(payData[j][0]);
      transRef      = String(payData[j][2]);
      paymentMethod = String(payData[j][3] || 'VIETQR').toUpperCase(); // D Method — cần cho FE phân biệt VIETQR/COD/CASH
      payAmount     = Number(payData[j][4]);
      expireAt      = payData[j][7];
      var payStatus = String(payData[j][5]);
      if (payStatus === 'PENDING' || payStatus === 'PAYMENT_REPORTED') {
        // Dựng lại QR từ TK ĐÃ GHIM trong RawData (cột L, 2026-07-21) — luôn đúng TK lúc tạo đơn dù sau
        // này đổi mặc định chi nhánh. Đơn cũ (trước feature này) RawData rỗng → fallback cấu hình legacy
        // Settings. Đơn có thể được tạo lúc còn cấu hình đầy đủ rồi TK bị xoá/sửa — thiếu → qr_url: null,
        // các field khác vẫn trả về bình thường (không để việc xem lại trạng thái đơn bị vỡ theo).
        var pinnedAcct = null;
        var rawData = payData[j][11];
        if (rawData) { try { var p = JSON.parse(rawData); if (p && p.bank_code) pinnedAcct = p; } catch (ex0) { pinnedAcct = null; } }
        if (!pinnedAcct) pinnedAcct = _settingsAsBankAccount(settings);
        try { qrUrl = buildVietQRUrl(pinnedAcct, payAmount, transRef); } catch (ex) { qrUrl = null; }
      }
      break;
    }
  }

  // ActivityLogs đã ghi đầy đủ người thao tác cho các thay đổi đơn hàng/vận đơn/thanh toán.
  // Trả thẳng trong get_order để màn hình chi tiết không phải gọi thêm API và không lộ log của đơn khác.
  var activityLogs = [];
  var activitySh = ss.getSheetByName(SHEET.ACTIVITY_LOGS);
  if (activitySh && activitySh.getLastRow() > 1) {
    var activityData = _readSheetRows(activitySh, _findSheetRowsExact(activitySh, 3, orderId), 1, 6);
    activityLogs = activityData.filter(function(r) {
      return String(r[1] || '').toUpperCase() === 'ORDER' && String(r[2] || '') === orderId;
    }).map(function(r) {
      var action = String(r[3] || '');
      var labels = {
        ORDER_CREATED: 'Đơn được tạo', PAYMENT_CONFIRMED: 'Xác nhận thanh toán',
        PAYMENT_REPORTED: 'Khách báo đã chuyển khoản', ORDER_UPDATED: 'Cập nhật đơn',
        STATUS_CHANGED_TO_PAID: 'Xác nhận đã thanh toán', STATUS_CHANGED_TO_CANCELLED: 'Huỷ đơn',
        STATUS_CHANGED_TO_REFUNDED: 'Hoàn tiền', FULFILLMENT_PENDING_APPROVAL: 'Chuyển sang chờ duyệt',
        FULFILLMENT_PENDING_PAYMENT: 'Chuyển sang chờ thanh toán', FULFILLMENT_PENDING_PACKING: 'Chuyển sang chờ đóng gói',
        FULFILLMENT_READY_TO_PICK: 'Sẵn sàng lấy hàng', FULFILLMENT_DELIVERING: 'Đang giao hàng',
        FULFILLMENT_REDELIVERY: 'Chờ giao lại', FULFILLMENT_DELIVERED: 'Đã giao hàng',
        FULFILLMENT_DELIVERY_CANCELLED: 'Huỷ giao hàng', FULFILLMENT_RETURNED: 'Đã nhận hàng hoàn',
        GHN_SHIPMENT_CREATED: 'Tạo vận đơn GHN', GHN_SHIPMENT_CANCELLED: 'Huỷ vận đơn GHN',
        GOSHIP_SHIPMENT_CREATED: 'Tạo vận đơn Goship', GOSHIP_SHIPMENT_CANCELLED: 'Huỷ vận đơn Goship',
        GHTK_SHIPMENT_CREATED: 'Tạo vận đơn GHTK', GHTK_SHIPMENT_CANCELLED: 'Huỷ vận đơn GHTK',
        VTP_SHIPMENT_CREATED: 'Tạo vận đơn Viettel Post', VTP_SHIPMENT_CANCELLED: 'Huỷ vận đơn Viettel Post',
        AHAMOVE_SHIPMENT_CREATED: 'Tạo vận đơn Ahamove', AHAMOVE_SHIPMENT_CANCELLED: 'Huỷ vận đơn Ahamove',
        SELF_SHIPMENT_CREATED: 'Ghi nhận giao nội bộ', COD_DELIVERED_PENDING_RECON: 'Đã giao COD, chờ đối soát',
        SAPO_PUSH_SUCCESS: 'Đẩy đơn lên SAPO'
      };
      // Action code cho "Huỷ đóng gói" (SHIPMENT_UNPACKED) mã hoá kèm tracking phía sau dấu '|' —
      // ActivityLogs không có cột phụ, đây là cách rẻ nhất để dòng lịch sử hiển thị mã đã thu hồi
      // ("Đã huỷ đóng gói · Goship · LGH1234"). Ghép trong render, KHÔNG thêm cột schema.
      var label = labels[action];
      if (!label) {
        var m = action.match(/^(GHN|GOSHIP|GHTK|VTP|AHAMOVE)_SHIPMENT_UNPACKED(?:\|(.+))?$/);
        if (m) {
          var carrierName = { GHN: 'GHN', GOSHIP: 'Goship', GHTK: 'GHTK', VTP: 'Viettel Post', AHAMOVE: 'Ahamove' }[m[1]] || m[1];
          label = 'Huỷ đóng gói · thu hồi mã vận đơn' + (m[2] ? ' ' + m[2] : '') + ' (' + carrierName + ')';
        }
      }
      return {
        log_id: String(r[0] || ''), action: action,
        label: label || action.replace(/_/g, ' '),
        user: String(r[4] || 'system'), created_at: r[5]
      };
    });
    activityLogs.sort(function(a, b) { return new Date(a.created_at) - new Date(b.created_at); });
  }
  _perfMark(_pid, 'activity_logs_done');
  _perfReport(_pid);

  var result = {
    order_id:         orderId,
    // 2026-08-10 OCC: FE lưu _version từ đây; gửi kèm khi updateOrderStatus/updateOrder — nếu
    // khác version thật server sẽ throw OCC_CONFLICT (đơn đã được sửa ở chỗ khác).
    _version:         _readVersionAt(ordersSh, orderRow, OCC_COL.ORDERS),
    customer_id:      customerId,
    customer_name:    custName,
    customer_phone:   custPhone,
    created_at:       ord.created_at,
    created_by:       ord.created_by || '',
    activity_logs:    activityLogs,
    payment_id:       paymentId,
    payment_method:   paymentMethod, // 'VIETQR' | 'COD' | 'CASH' — nguồn sự thật để form Sửa đơn khoá/mở đúng
    transaction_ref:  transRef,
    status:           paymentStatus,
    order_type:       orderType,
    customer_note:    ord.customer_note, // M CustomerNote — cho form "Sửa đơn" prefill ghi chú
    internal_note:    internalNoteVal,   // AQ InternalNote — ghi chú nội bộ staff (2026-08-23), KHÔNG in tem/hóa đơn
    total_amount:     totalAmount,
    merchandise_amount: merchandiseAmount,
    customer_shipping_fee: customerShippingFee,
    customer_shipping_fee_manual: customerShipping.is_manual,
    deposit_amount:   depositAmount,
    pay_amount:       payAmount,
    discount_code:    discountCode,
    discount_amount:  discountAmount,
    discount_percent: discountPercent,
    // Raw chiết khấu tại quầy (X/Y/Z) — cần cho form "Sửa đơn" prefill đúng loại/giá trị/lý do
    // (discount_percent ở trên là giá trị đã suy diễn để in hoá đơn, không đủ để dựng lại form).
    order_discount_type:   orderDiscountType,
    order_discount_value:  orderDiscountValue,
    order_discount_reason: ord.order_discount_reason,
    product_name:     productNames.join(', '),
    items:            items,
    qr_url:           qrUrl,
    expire_at:        expireAt,
    appointment_date: appointDate,
    appointment_time: appointTime,
    store:            storeBranch,
    sapo_sync_status: sapoSyncStatus,
    sapo_order_id:    sapoOrderId,
    shipping_address: shippingAddress, // null nếu đơn không cần giao hàng
    fulfillment_status: ord.fulfillment_status, // AC — pipeline xử lý đơn (phase vận chuyển 2026-07-17)
    // Khối vận đơn (AD–AL). Về mặt dữ liệu đây là 1 SHIPMENT của đơn — xem SHIPMENT_COL / _shipmentGet;
    // giữ phẳng ở response để FE hiện tại không phải sửa, khi tách sheet Shipments sẽ bọc thành mảng.
    carrier:            ord.carrier,             // AD ('GOSHIP · <hãng thật>' với đơn qua aggregator)
    tracking_code:      ord.tracking_code,       // AE — mã vận đơn của HÃNG
    shipping_fee:       ord.shipping_fee,        // AF
    cod_amount:         ord.cod_amount,          // AG
    shipping_service_id: ord.shipping_service_id, // AH
    packed_at:          ord.packed_at,           // AI
    package_weight:     ord.package_weight,      // AJ — gram, cân thực lúc đóng gói
    package_dims:       ord.package_dims,        // AK — 'DxRxC' cm
    package_weight_suggested: suggestedPackageWeight,
    package_dims_suggested: [
      parseInt(settings.GHN_DEFAULT_LENGTH, 10) || 20,
      parseInt(settings.GHN_DEFAULT_WIDTH, 10) || 15,
      parseInt(settings.GHN_DEFAULT_HEIGHT, 10) || 10
    ].join('x'),
    last_tracked_at:    ord.last_tracked_at,     // AL — unix giây, mốc cập nhật gần nhất từ hãng
    label_url:          ord.label_url || '',      // AP — tem in Goship khổ A6 (2026-08-11, rỗng nếu chưa tạo/không dùng Goship)
    id:               orderId // V1 compat
  };
  // Timeline vận chuyển (2026-08-15) — inline trực tiếp vào response của get_order để trang tra cứu
  // khách hàng có đầy đủ history mà KHÔNG cần mở endpoint mới. `_shipmentHistoryList` gate qua
  // `get_shipment` (auth) — không phù hợp public. Best-effort: sheet chưa tồn tại / khách chưa có
  // tracking → mảng rỗng, không throw. FE hiện tại (admin) đọc mảng cũng vô hại (không có sẽ ignore).
  if (ord.tracking_code) {
    try { result.shipment_timeline = _shipmentHistoryList(ss, orderId); }
    catch (shipmentTimelineErr) { result.shipment_timeline = []; }
  } else {
    result.shipment_timeline = [];
  }

  // Lưu ý (2026-09-05): nhánh ẩn danh (không token, không phone) đã return sớm ở khối minCacheKey
  // phía trên với hình dạng tối giản riêng — từ đây trở xuống chỉ còn nhánh authorized/full.
  try {
    var detailJson = JSON.stringify(result);
    if (detailJson.length < 95000) {
      CacheService.getScriptCache().put('rc_' + detailCacheKey + '_' + _analyticsGen(), detailJson, 300);
    }
  } catch (detailCacheWriteErr) { /* performance-only cache */ }
  return result;
}

// ============================================================
// GET ORDERS BATCH — 2026-08-23
// Nạp chi tiết N đơn cho bulk print (Mục 3 In đơn hàng). Loop getOrder tận dụng TextFinder fast-path
// (~80ms/đơn) — 20 đơn ~1.6s, chấp nhận được. Graceful: 1 đơn lỗi không hủy batch, trả riêng errors[].
// Gate orders.view (cùng getOrder). Batch tối đa 50 đơn để tránh timeout GAS 6-phút.
// ============================================================
function getOrdersBatch(payload) {
  var ids = Array.isArray(payload.order_ids) ? payload.order_ids : [];
  if (!ids.length) return { orders: [], errors: [] };
  if (ids.length > 50) throw new Error('Batch tối đa 50 đơn/lần — chọn ít hơn để in.');
  var token = payload.token;
  var orders = [], errors = [];
  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i] || '').trim();
    if (!id) continue;
    try {
      orders.push(getOrder(id, null, token));
    } catch (e) {
      errors.push({ order_id: id, error: String((e && e.message) || e) });
    }
  }
  return { orders: orders, errors: errors };
}

// ============================================================
// CHECK CUSTOMER PHONE — 2026-08-23
// Tra nhanh KH theo SĐT khi staff gõ form Tạo đơn. Trả tóm tắt tối thiểu (không list đơn/email/PII đầy đủ)
// — FE dùng để hiện banner "SĐT này đã thuộc KH: <name>" + nút [Dùng KH cũ] / [Xem/Sửa KH]. Không cache
// (đọc 1 row nhanh, và cache stale có thể lỡ dupe check ngay sau khi vừa tạo KH mới).
// Gate customers.view: staff mới cần biết KH tồn tại — không public để tránh leak database khách qua enum.
// ============================================================
function checkCustomerPhone(payload) {
  var raw = String(payload.phone || '').trim();
  if (!raw) return { exists: false };
  var phone = normalizePhone(raw);
  if (!phone || !/^\d{9,11}$/.test(phone)) return { exists: false };
  // Repository.Customers.findByPhone tự chuẩn hóa 2 phía (đã có normPhoneVN từ 2026-08-21). Chỉ 1 read call.
  var c = Repository.Customers.findByPhone(phone);
  if (!c) return { exists: false };
  return {
    exists: true,
    customer_id: c.customer_id,
    code: c.customer_id, // MOPS dùng customer_id làm mã hiển thị
    name: c.name || '',
    phone: c.phone || phone,
    default_address: {
      address: c.address_street || '',
      ward: c.address_ward || '',
      district: c.address_district || '',
      province: c.address_city || ''
    }
    // Cố ý KHÔNG trả: email/notes/birthday/loyalty/history — không cần cho banner + hạn chế PII leak.
    // order_count skip vì tốn Orders.findAll (~500-800ms) — nếu FE thực sự cần, gọi get_customer riêng.
  };
}

// ============================================================
// GET ORDERS BY CONTACT
// ============================================================

function getOrdersByContact(phone) {
  if (!phone) throw new Error('phone is required');
  var normalPhone = normalizePhone(phone);
  var ss          = SpreadsheetApp.getActiveSpreadsheet();

  var custSh   = ss.getSheetByName(SHEET.CUSTOMERS);
  var custData = custSh.getLastRow() > 1
    ? custSh.getRange(2, 1, custSh.getLastRow() - 1, 7).getValues()
    : [];

  var customerId = null;
  for (var i = 0; i < custData.length; i++) {
    if (String(custData[i][1]) === normalPhone) { customerId = String(custData[i][0]); break; }
  }
  if (!customerId) return { orders: [] };

  // Đơn của khách đọc qua Repository.Orders (phase-07 GĐ3.5).
  // 2026-08-13 fix: map callback trước đây khai báo `var result = {...}` local mà KHÔNG return
  // → orders trả về toàn undefined → getCustomer forEach o.status throws
  // "Cannot read properties of undefined (reading 'status')". Bug pre-existing chỉ trigger khi
  // khách CÓ ĐƠN; trước em thêm findByPhone fallback ít case reach code này nên chưa lộ.
  var orders = Repository.Orders.findByCustomer(customerId).map(function(o) {
    return {
      order_id:         o.order_id,
      order_type:       o.order_type,
      amount:           o.total_amount,
      status:           o.payment_status,
      created_at:       o.created_at,
      appointment_date: o.appointment_date,
      appointment_time: o.appointment_time
    };
  });

  orders.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

  return { customer_id: customerId, orders: orders };
}

// Tra đơn theo MÃ VẬN ĐƠN (public, 2026-08-15) — phục vụ trang tra cứu khách hàng.
//
// Bảo mật: tracking code KHÔNG phải secret (in trên tem giao, khách + shipper + hàng xóm đều thấy),
// nên chỉ tracking-only tra được thông tin chung → công cụ enumeration đơn hàng nhẹ. Bù lại bằng:
//   (1) delegate sang `getOrder(orderId, verifyPhone)` — anti-enumeration built-in (miss/mismatch
//       cùng error). Khách phải nhập kèm SĐT để mở khoá full detail; không kèm SĐT vẫn tra được
//       nhưng chỉ hiện trạng thái tối giản (không PII).
//   (2) same-error khi tracking không tồn tại — không lộ khác biệt "vận đơn sai" vs "SĐT sai".
//
// Hiệu năng: Orders không index theo tracking → full-scan cột AE. Với sheet <= 5000 đơn (~150ms),
// đây là trade-off chấp nhận được cho public read (dùng ít, không critical path). Nếu về sau
// scan chậm quá thì thêm CacheService index `tracking_to_order_<gen>`.
function getOrderByTracking(trackingCode, verifyPhone) {
  var normalTracking = String(trackingCode || '').trim().toUpperCase();
  if (!normalTracking) throw new Error('Vui lòng nhập mã vận đơn');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.ORDERS);
  if (!sh || sh.getLastRow() < 2) throw new Error('Không tìm thấy vận đơn ' + trackingCode);

  // Đọc gọn 2 cột: A (OrderID) + AE (TrackingCode). Không đọc cả row để scan nhẹ.
  var lastRow = sh.getLastRow() - 1;
  var trackings = sh.getRange(2, 31, lastRow, 1).getValues(); // AE = SHIPMENT_COL.TRACKING
  var orderIds  = sh.getRange(2, 1,  lastRow, 1).getValues(); // A
  var orderId = '';
  for (var i = 0; i < trackings.length; i++) {
    if (String(trackings[i][0] || '').trim().toUpperCase() === normalTracking) {
      orderId = String(orderIds[i][0] || '');
      break;
    }
  }
  if (!orderId) throw new Error('Không tìm thấy vận đơn ' + trackingCode);

  // Delegate — getOrder tự xử lý phone verify. Wrap error cho khớp message ở nhánh miss trên
  // (anti-enumeration: không cho biết vận đơn thật hay SĐT sai).
  try {
    return getOrder(orderId, verifyPhone);
  } catch (getOrderErr) {
    throw new Error('Không tìm thấy vận đơn ' + trackingCode);
  }
}

// ============================================================
// UPDATE ORDER STATUS (staff action)
// ============================================================

// ============================================================
// FULFILLMENT STATUS — pipeline xử lý đơn (phase vận chuyển 2026-07-17)
// Cột AC (29) trên Orders. TRỤC RIÊNG cạnh PaymentStatus (cột H): Payment = tiền,
// Fulfillment = tiến độ xử lý/giao. GHN là engine cho các trạng thái giao (B4/B5).
// ============================================================
var FULFILLMENT_STATUSES = ['pending_approval','pending_payment','pending_packing','ready_to_pick','delivering','redelivery','delivered','delivery_cancelled','returned','cancelled'];
var FULFILLMENT_LABELS = {
  pending_approval:'Chờ duyệt', pending_payment:'Chờ thanh toán', pending_packing:'Chờ đóng gói',
  ready_to_pick:'Chờ lấy hàng', delivering:'Đang giao hàng', redelivery:'Chờ giao lại', delivered:'Đã giao',
  delivery_cancelled:'Hủy giao - chờ nhận', returned:'Đã hoàn trả', cancelled:'Đã hủy'
};
// Transition hợp lệ. pending_approval→pending_packing dành cho đơn COD (bỏ qua chờ thanh toán, B6).
// redelivery (Chờ giao lại — C3): giao hụt lần 1-2, còn cơ hội giao lại hoặc chuyển sang hoàn.
var FULFILLMENT_TRANSITIONS = {
  pending_approval:   ['pending_payment','pending_packing','cancelled'],
  pending_payment:    ['pending_packing','cancelled'],
  pending_packing:    ['ready_to_pick','cancelled'],
  ready_to_pick:      ['delivering','delivery_cancelled','cancelled'],
  delivering:         ['delivered','redelivery','delivery_cancelled'],
  redelivery:         ['delivering','delivered','delivery_cancelled'],
  delivered:          [],
  delivery_cancelled: ['returned'],
  returned:           [],
  cancelled:          []
};
var FULFILLMENT_COL = 29; // AC

function _findOrderRow(ss, orderId) {
  var sh = ss.getSheetByName(SHEET.ORDERS);
  if (!sh || sh.getLastRow() < 2) throw new Error('Không tìm thấy đơn hàng ' + orderId);
  var cached = _getRowIndex('orders') || {};
  var indexedRow = Number(cached[String(orderId)]) || 0;
  if (indexedRow >= 2) return { sheet: sh, row: indexedRow };
  var hit = _findSheetRowExact(sh, 1, orderId);
  if (hit !== -1) return { sheet: sh, row: hit };
  throw new Error('Không tìm thấy đơn hàng ' + orderId);
}

// updateOrderShippingOnly — V6.4 2026-08-05
// Path chuyên biệt cho FE inline address editor (modal Tạo vận đơn V6): chỉ ghi
// ShippingAddresses append + trỏ Orders.G, KHÔNG đụng items/finance/status. updateOrder()
// gốc yêu cầu FULL payload (items > 0) → fail khi user chỉ sửa địa chỉ trong shipModal
// (bug user báo 2026-08-05). Tách action riêng giữ separation of concerns + tránh phải
// hoisting cả nhánh partial-update vào updateOrder (đã ~500 dòng, sensitive).
function updateOrderShippingOnly(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id là bắt buộc');

  var receiver = String(payload.ship_receiver_name || '').trim();
  var phone    = String(payload.ship_phone || '').trim();
  var address  = String(payload.ship_address || '').trim();
  var province = String(payload.ship_province || '').trim();
  var district = String(payload.ship_district || '').trim();
  var ward     = String(payload.ship_ward || '').trim();

  if (!receiver || !phone || !address || !province || !district || !ward) {
    throw new Error('Thiếu thông tin địa chỉ giao (họ tên/SĐT/số nhà/tỉnh/quận/xã).');
  }

  var loc = _findOrderRow(ss, orderId);
  var ordersSh = loc.sheet, row = loc.row;
  // Orders schema (mops.md §10): A=OrderID, B=CustomerID, C=OrderType, D=Amount, E=Status,
  // F=CreatedAt, G=ShippingAddressID … Guard: đơn PENDING_PAYMENT vẫn cho sửa; PACKED trở đi
  // cần backend logic phức tạp hơn (đảo shipment cũ) — hiện block theo pattern updateOrder
  // (check ở FE cũng đã có editLocks warning nhưng không block server-side ở path này).
  var status = String(ordersSh.getRange(row, 5).getValue() || '').toUpperCase();
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    throw new Error('Đơn đã ' + status + ' — không sửa được địa chỉ giao.');
  }

  var customerId = String(ordersSh.getRange(row, 2).getValue() || '');

  // 2026-08-16: dedupe qua _upsertShippingAddress (tránh sinh dòng ShippingAddresses trùng khi
  // caller submit lại địa chỉ cũ đã có trong sổ).
  var addressId = _upsertShippingAddress(ss, {
    customer_id: customerId,
    receiver_name: receiver, phone: phone,
    province: province, district: district, ward: ward, address: address,
    province_id: String(payload.province_code || payload.ship_province_id || ''),
    district_id: String(payload.district_code || payload.ship_district_id || ''),
    ward_code:   String(payload.ward_code || payload.ship_ward_code || '')
  });
  ordersSh.getRange(row, 7).setValue(addressId);   // Orders.G = ShippingAddressID

  // Optional: nếu save_customer_address → set default cho customer
  if (payload.save_customer_address && customerId) {
    try { _setCustomerDefaultShippingAddress(ss, customerId, addressId); } catch (e) { /* best-effort */ }
  }

  logActivity(ss, 'ORDER', orderId, 'ORDER_SHIPPING_ADDRESS_UPDATED', payload._staffActor || 'staff');
  return { order_id: orderId, address_id: addressId, shipping_address: _getShippingAddress(ss, addressId) };
}

// Chuyển FulfillmentStatus có validate transition. force=true (GHN webhook / hook nội bộ) bỏ qua
// check transition nhưng vẫn từ chối giá trị lạ. Best-effort logActivity, không throw ra ngoài log.
// skipLock (2026-09-05, review round 2): 6/12 call site (approveOrder, _applyShippingStatus/webhook,
// 5 adapter tạo vận đơn GHN/Ahamove/GHTK/VTP/Goship-ready_to_pick) KHÔNG giữ sẵn lock nào — bump
// _version (thêm ở review round 1) mà không tự khoá ở ĐÂY thì vẫn có thể bị 1 writer khác (kể cả
// chính hàm này gọi từ 1 execution khác) ghi đè giữa lúc đọc và ghi. 2 caller ĐÃ giữ lock riêng
// (updateOrderStatus, updateFulfillmentStatus) truyền skipLock=true để tránh waitLock() lồng nhau
// (docs/mops-contract.md §13.6).
function _setFulfillmentStatus(ss, orderId, newStatus, actor, force, loc, skipLock) {
  newStatus = String(newStatus || '').trim();
  if (FULFILLMENT_STATUSES.indexOf(newStatus) === -1) throw new Error('Trạng thái xử lý đơn không hợp lệ: ' + newStatus);
  loc = loc || _findOrderRow(ss, orderId);
  function _run() {
  var cur = String(loc.sheet.getRange(loc.row, FULFILLMENT_COL).getValue() || '');
  if (cur === newStatus) {
    return { order_id: orderId, fulfillment_status: newStatus, unchanged: true,
             _version: _readVersionAt(loc.sheet, loc.row, OCC_COL.ORDERS) };
  }
  if (!force && cur) {
    var allowed = FULFILLMENT_TRANSITIONS[cur] || [];
    if (allowed.indexOf(newStatus) === -1)
      throw new Error('Không thể chuyển "' + (FULFILLMENT_LABELS[cur] || cur) + '" → "' + (FULFILLMENT_LABELS[newStatus] || newStatus) + '"');
  }
  loc.sheet.getRange(loc.row, FULFILLMENT_COL).setValue(newStatus);
  // OCC (2026-09-05): fulfillment đổi qua webhook/adapter (GHN/Goship/GHTK/VTP/Ahamove/self-ship,
  // đều đi qua hàm này) trước đây KHÔNG bump _version — 1 staff đang updateOrder/updateOrderStatus
  // dựa trên _version đọc TRƯỚC đó sẽ không phát hiện được rằng fulfillment vừa đổi ở nơi khác,
  // OCC coi như còn khớp dù dữ liệu dòng đã đổi thật (lỗ hổng đã ghi nhận ở audit correctness). Bump
  // tại ĐÂY (không sửa riêng từng caller) vì mọi đường cập nhật fulfillment đều đi qua hàm dùng chung
  // này. Không bump khi return sớm ở nhánh "cur === newStatus" phía trên — đúng ý OCC (replay/no-op
  // không phải 1 thay đổi thật).
  var _ffVer = _readVersionAt(loc.sheet, loc.row, OCC_COL.ORDERS);
  var _ffNextVer = _ffVer + 1;
  _writeVersionAt(loc.sheet, loc.row, OCC_COL.ORDERS, _ffNextVer);
  try { logActivity(ss, 'ORDER', orderId, 'FULFILLMENT_' + newStatus.toUpperCase(), actor || 'system'); } catch (e) {}
  // 3-Axis Phase 2 (2026-08-09): Auto Completion — khi Fulfillment sang 'delivered' + Payment đã
  // 'PAID' → set Order Status='COMPLETED'. Đảm bảo model Sapo/Haravan/KiotViet: PAID + delivered
  // = COMPLETED không cần bấm tay. Best-effort: lỗi ở đây KHÔNG rollback fulfillment update.
  if (newStatus === 'delivered') { try { _maybeCompleteOrder(ss, loc, actor); } catch (e) { /* silent */ } }
  return { order_id: orderId, fulfillment_status: newStatus, _version: _ffNextVer };
  }
  if (skipLock) return _run();
  return _withLock(_run);
}

// 3-Axis Phase 2 (2026-08-09) — Helper auto-completion. Gọi sau khi set Payment=PAID hoặc set
// Fulfillment=delivered. Nếu cả 2 điều kiện đạt → set Orders.Status='COMPLETED'. Log riêng để audit
// dễ hiểu. Không throw — best-effort, callers không rollback.
function _maybeCompleteOrder(ss, loc, actor) {
  if (!loc || !loc.sheet || !loc.row) return null;
  var status = String(loc.sheet.getRange(loc.row, 8).getValue() || '').toUpperCase();  // Orders.H = PaymentStatus
  var ff     = String(loc.sheet.getRange(loc.row, FULFILLMENT_COL).getValue() || '');    // Orders.AC = FulfillmentStatus
  if (status !== 'PAID' || ff !== 'delivered') return null;
  loc.sheet.getRange(loc.row, 8).setValue('COMPLETED');
  var orderId = String(loc.sheet.getRange(loc.row, 1).getValue() || '');
  try { logActivity(ss, 'ORDER', orderId, 'AUTO_COMPLETED', actor || 'system:3-axis'); } catch (e) {}
  return { order_id: orderId, status: 'COMPLETED' };
}

// Public — staff chuyển trạng thái thủ công (đóng gói xong, xác nhận nhận hàng hoàn, huỷ...).
// R10 (2026-08-21) · Bọc OCC + LockService giống updateOrderStatus — trước đây updateFulfillment
// KHÔNG check _version, KHÔNG serialize → 2 staff cùng chuyển 'ready_to_pick → delivering' + 'delivering
// → delivered' cùng lúc có thể ăn cross-state cuối = state cuối cùng thắng, staff thứ 2 tưởng đã set
// nhưng ghi đè lên nhau. Giờ: acquire lock, đọc _version, check khớp, set + bump _version, release.
function updateFulfillmentStatus(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id is required');
  var expectedVersion = payload._version; // optional — nếu FE gửi thì strict check; nếu không thì skip (backward-compat).
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ordersSh = ss.getSheetByName(SHEET.ORDERS);
    var loc = _findOrderRow(ss, orderId);
    var currentVersion = _readVersionAt(ordersSh, loc.row, OCC_COL.ORDERS);
    // Chỉ check khi client GỬI _version — client cũ chưa migrate vẫn chạy được (không đứt).
    if (expectedVersion !== undefined && expectedVersion !== null && expectedVersion !== '') {
      if (String(currentVersion) !== String(expectedVersion)) {
        throw new Error('OCC_CONFLICT: Đơn ' + orderId + ' đã được cập nhật ở nơi khác (bạn: v' + expectedVersion + ', hệ thống: v' + currentVersion + '). Tải lại rồi thử lại.');
      }
    }
    // BUG (2026-09-05, phát hiện khi review fix OCC ở _setFulfillmentStatus): hàm đó giờ đã tự bump
    // _version khi có thay đổi thật (và KHÔNG bump khi no-op) — dòng bump thủ công cũ ở đây sẽ tăng
    // _version LẦN 2 trên mọi lệnh gọi thật, và tăng NHẦM (dù không đổi gì) trên lệnh gọi trùng
    // trạng thái, làm session khác bị OCC_CONFLICT giả. Dùng thẳng result._version do
    // _setFulfillmentStatus trả về — nó đã đúng cho cả 2 trường hợp (đổi thật/không đổi).
    var result = _setFulfillmentStatus(ss, orderId, payload.fulfillment_status, payload._staffActor || 'staff', false, loc, true);
    return result;
  } finally { lock.releaseLock(); }
}

// Backfill FulfillmentStatus cho đơn CŨ (tạo TRƯỚC phase vận chuyển 2026-07-17 → cột AC rỗng nên
// không vào bucket board nào + hook PAID không đẩy được, khiến "vận chuyển chưa tham gia"). CHẠY 1 LẦN
// từ editor Apps Script sau khi deploy shipping backend (Run → backfillFulfillmentStatus). CHỈ gán cho
// dòng RỖNG (không đè trạng thái đã có). Map theo PaymentStatus (Orders cột H=8):
//   PAID/PROCESSING/COMPLETED → pending_packing (sẵn sàng đóng gói/giao)
//   CANCELLED/EXPIRED/REFUNDED → cancelled
//   còn lại (PENDING/PAYMENT_REPORTED) → pending_payment
function backfillFulfillmentStatus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.ORDERS);
  if (!sh || sh.getLastRow() < 2) return { updated: 0, total: 0 };
  var n = sh.getLastRow() - 1;
  var statuses = sh.getRange(2, 8, n, 1).getValues();               // H = PaymentStatus
  var fulfills = sh.getRange(2, FULFILLMENT_COL, n, 1).getValues(); // AC = FulfillmentStatus
  var updated = 0;
  for (var i = 0; i < n; i++) {
    if (String(fulfills[i][0] || '').trim()) continue;             // đã có trạng thái → giữ nguyên
    var pay = String(statuses[i][0] || '').trim().toUpperCase();
    var next;
    if (['PAID', 'PROCESSING', 'COMPLETED'].indexOf(pay) !== -1)       next = 'pending_packing';
    else if (['CANCELLED', 'EXPIRED', 'REFUNDED'].indexOf(pay) !== -1) next = 'cancelled';
    else                                                               next = 'pending_payment';
    sh.getRange(i + 2, FULFILLMENT_COL).setValue(next);
    updated++;
  }
  Logger.log('backfillFulfillmentStatus: cập nhật ' + updated + '/' + n + ' đơn.');
  return { updated: updated, total: n };
}

// Public — duyệt đơn khách (pending_approval → pending_payment). Đơn COD → pending_packing (B6 điều chỉnh).
function approveOrder(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id is required');
  var loc = _findOrderRow(ss, orderId);
  var cur = String(loc.sheet.getRange(loc.row, FULFILLMENT_COL).getValue() || '');
  if (cur !== 'pending_approval') throw new Error('Chỉ duyệt được đơn đang "Chờ duyệt"');
  // 3-Axis Phase 2 (2026-08-09): Approve → LUÔN vào 'pending_packing' bất kể Payment status. Kho có
  // đơn để đóng gói; Payment độc lập theo dõi ở Orders.H. (Cũ: rẽ nhánh theo payStatus/codAmount →
  // pending_payment, sai với 3-Axis chuẩn.)
  return _setFulfillmentStatus(ss, orderId, 'pending_packing', payload._staffActor || 'staff', false);
}

// ============================================================
// B2B DISTRIBUTION — REOPEN 2026-09-10 (ADR-007/T-81)
// Đăng ký đại lý B2B (MOD-04 xlsx). Xác minh MST cơ quan thuế + chữ ký số hợp đồng =
// BLOCKED_EXTERNAL (không có tích hợp thật, ADR-007) — mọi đơn vào 'pending_review', admin
// duyệt/từ chối thủ công. Mirror đúng pattern pending_approval/approveOrder ở trên (cùng
// LockService serialize + status-guard trước khi transition).
// ============================================================

function _b2bApplicationHeaders() {
  return ['ApplicationID', 'CompanyName', 'TaxCode', 'ContactName', 'Phone', 'Email',
    'Address', 'BusinessType', 'ExpectedVolume', 'Note', 'Status', 'CreatedAt',
    'ReviewedBy', 'ReviewedAt', 'ReviewNote'];
}
function _ensureB2BApplicationsSheet(ss) {
  var sh = ss.getSheetByName(SHEET.B2B_APPLICATIONS);
  if (sh) return sh;
  sh = ss.insertSheet(SHEET.B2B_APPLICATIONS);
  var headers = _b2bApplicationHeaders();
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#3CB371').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  return sh;
}
function _b2bApplicationNextId(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 'B2B00000001';
  var lastId = String(sh.getRange(last, 1).getValue() || '');
  var m = lastId.match(/^B2B(\d+)$/);
  var n = m ? parseInt(m[1], 10) + 1 : last;
  return 'B2B' + ('00000000' + n).slice(-8);
}

// Public — khách/đại lý tự gửi đăng ký (không quyền, giống create_booking). KHÔNG tự động verify
// MST hay chữ ký số — chỉ kiểm tra ĐỊNH DẠNG (9-11 số), KHÔNG tra cứu cơ quan thuế thật.
function createB2BApplication(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var companyName    = _sanitizeText(payload.company_name || '', 200);
  var taxCode         = String(payload.tax_code || '').replace(/[^0-9]/g, '');
  var contactName     = _sanitizeText(payload.contact_name || '', 100);
  var phone           = normalizePhone(payload.phone || '');
  var email           = String(payload.email || '').trim();
  var address         = _sanitizeText(payload.address || '', 300);
  var businessType    = _sanitizeText(payload.business_type || '', 100);
  var expectedVolume  = _sanitizeText(payload.expected_volume || '', 100);
  var note            = _sanitizeText(payload.note || '', 500);

  if (!companyName) throw new Error('Vui lòng nhập tên công ty/hộ kinh doanh');
  if (!/^\d{10,13}$/.test(taxCode)) throw new Error('Mã số thuế không đúng định dạng (10-13 số) — chỉ kiểm tra định dạng, đội ngũ kinh doanh sẽ xác minh thủ công với cơ quan thuế trước khi duyệt');
  if (!/^\d{9,11}$/.test(phone)) throw new Error('Số điện thoại không hợp lệ');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = _ensureB2BApplicationsSheet(ss);
    var id = _b2bApplicationNextId(sh);
    sh.appendRow([id, companyName, taxCode, contactName, phone, email, address,
      businessType, expectedVolume, note, 'pending_review', new Date(), '', '', '']);
    return { application_id: id, status: 'pending_review' };
  } finally {
    lock.releaseLock();
  }
}

// Admin — duyệt/từ chối đơn B2B (perm 'orders.edit', tái dùng permission có sẵn — không tạo
// permission string mới cho 1 tính năng thấp lưu lượng).
function approveB2BApplication(payload) { return _setB2BApplicationStatus(payload, 'approved'); }
function rejectB2BApplication(payload)  { return _setB2BApplicationStatus(payload, 'rejected'); }
function _setB2BApplicationStatus(payload, newStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var appId = String(payload.application_id || '').trim();
  if (!appId) throw new Error('application_id is required');
  var reviewNote = _sanitizeText(payload.review_note || '', 500);
  var staffName  = String(payload._staffActor || 'staff').trim();

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = ss.getSheetByName(SHEET.B2B_APPLICATIONS);
    if (!sh) throw new Error('Chưa có đơn đăng ký B2B nào');
    var data = sh.getDataRange().getValues();
    var rowIdx = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === appId) { rowIdx = i + 1; break; }
    }
    if (rowIdx === -1) throw new Error('Không tìm thấy đơn đăng ký ' + appId);
    var cur = String(data[rowIdx - 1][10] || '');
    if (cur !== 'pending_review') throw new Error('Chỉ duyệt/từ chối được đơn đang "Chờ duyệt"');
    sh.getRange(rowIdx, 11).setValue(newStatus);   // Status
    sh.getRange(rowIdx, 13).setValue(staffName);   // ReviewedBy
    sh.getRange(rowIdx, 14).setValue(new Date());  // ReviewedAt
    sh.getRange(rowIdx, 15).setValue(reviewNote);  // ReviewNote
    return { application_id: appId, status: newStatus };
  } finally {
    lock.releaseLock();
  }
}

// Admin read (perm 'orders.edit', xem _handleRead trong mops_00.js) — danh sách đơn B2B cho tab
// MOPS Admin mới. Không phân trang phức tạp (khối lượng B2B onboarding thấp hơn Orders nhiều).
function listB2BApplications(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.B2B_APPLICATIONS);
  if (!sh || sh.getLastRow() < 2) return { applications: [] };
  var statusFilter = String((payload && payload.status) || '').trim();
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 15).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (statusFilter && String(row[10]) !== statusFilter) continue;
    out.push({
      application_id: row[0], company_name: row[1], tax_code: row[2], contact_name: row[3],
      phone: row[4], email: row[5], address: row[6], business_type: row[7],
      expected_volume: row[8], note: row[9], status: row[10], created_at: row[11],
      reviewed_by: row[12], reviewed_at: row[13], review_note: row[14]
    });
  }
  return { applications: out };
}

// ============================================================
// BOOKING SLOT-LOCKING — REOPEN 2026-09-10 (ADR-007/T-83)
// Trước đây createOrder(p,'booking') CHỈ validate ngày hẹn hợp lệ, KHÔNG kiểm tra sức chứa theo
// khung giờ — 2 khách chọn cùng slot vẫn tạo được 2 đơn song song (không phát hiện trùng lịch).
// LockService serialize để 2 request cùng slot không cùng đọc-rồi-ghi race condition.
// ============================================================

function _bookingSlotHeaders() {
  return ['SlotKey', 'AppointDate', 'AppointTime', 'Branch', 'BookedCount', 'UpdatedAt'];
}
function _ensureBookingSlotsSheet(ss) {
  var sh = ss.getSheetByName(SHEET.BOOKING_SLOTS);
  if (sh) return sh;
  sh = ss.insertSheet(SHEET.BOOKING_SLOTS);
  var headers = _bookingSlotHeaders();
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#3CB371').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  return sh;
}
function _bookingSlotKey(appointDate, appointTime, branch) {
  return [appointDate, appointTime || 'any', branch || 'default'].join('|');
}
// Kiểm tra sức chứa TRƯỚC KHI ghi bất kỳ dòng nào (giống guard bank config/coupon ở createOrder)
// — fail-fast, không để lại đơn "ma" khi slot đã đầy. KHÔNG tăng BookedCount ở bước này (đọc
// only) — việc tăng chỉ thực hiện ở _commitBookingSlot SAU KHI Orders đã ghi thành công, tránh
// "khoá hụt" slot cho các trường hợp createOrder fail ở bước validate/coupon/pricing phía sau.
function _checkBookingSlotCapacity(ss, appointDate, appointTime, branch, settings) {
  var capacity = Number(settings.booking_slot_capacity) || 3;
  var slotKey  = _bookingSlotKey(appointDate, appointTime, branch);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = _ensureBookingSlotsSheet(ss);
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === slotKey) {
        var bookedCount = Number(data[i][4]) || 0;
        if (bookedCount >= capacity) {
          throw new Error('Khung giờ này đã đủ lịch hẹn, vui lòng chọn ngày/giờ khác.');
        }
        break;
      }
    }
  } finally {
    lock.releaseLock();
  }
}
// Tăng BookedCount thật — gọi CHỈ SAU KHI Orders.appendRow() ghi thành công (xem createOrder).
// Vẫn re-check capacity trong CÙNG 1 lock (không tin lại kết quả check ở bước trước — 2 request
// cùng slot có thể đã race giữa 2 lần lock) — nếu đã đầy khi tới đây (rất hiếm, do 2 request xen
// kẽ đúng lúc), best-effort log cảnh báo thay vì throw (đơn đã tạo rồi, không thể rollback Orders
// ở đây) — ném lỗi ở bước check trước đó là hàng rào chính.
function _commitBookingSlot(ss, appointDate, appointTime, branch) {
  var slotKey = _bookingSlotKey(appointDate, appointTime, branch);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = _ensureBookingSlotsSheet(ss);
    var data = sh.getDataRange().getValues();
    var rowIdx = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === slotKey) { rowIdx = i + 1; break; }
    }
    if (rowIdx === -1) {
      sh.appendRow([slotKey, appointDate, appointTime || '', branch || '', 1, new Date()]);
    } else {
      var bookedCount = Number(data[rowIdx - 1][4]) || 0;
      sh.getRange(rowIdx, 5).setValue(bookedCount + 1);
      sh.getRange(rowIdx, 6).setValue(new Date());
    }
  } finally {
    lock.releaseLock();
  }
}

function updateOrderStatus(payload) {
  var ss        = SpreadsheetApp.getActiveSpreadsheet();
  var _pid      = _perfStart('update_order_status');
  _perfMark(_pid, 'enter');
  var orderId   = String(payload.order_id    || '').trim();
  var newStatus = String(payload.status       || '').trim().toUpperCase();
  // Lấy từ danh tính đã xác thực server-side (checkPermission ở doPost), KHÔNG tin
  // field client tự gửi — trước đây payload.staff nhận nguyên object `this.staff`
  // từ frontend, JSON.stringify rồi String() ra literal "[object Object]", làm rác
  // toàn bộ ActivityLogs.User + nội dung Telegram cho mọi lần xác nhận PAID/CANCELLED/REFUNDED.
  var staffName = String(payload._staffActor  || 'staff').trim();
  var cancelReason = String(payload.cancel_reason || '').trim();
  var expectedVersion = payload._version; // 2026-08-10 OCC — client gửi từ get_order

  if (!orderId)   throw new Error('order_id is required');
  if (!newStatus) throw new Error('status is required');

  var valid = ['PENDING','PAYMENT_REPORTED','PAID','PROCESSING','COMPLETED','CANCELLED','EXPIRED','REFUNDED'];
  if (valid.indexOf(newStatus) === -1) throw new Error('Invalid status: ' + newStatus);

  var settings = getSettings(ss);

  // ── 2026-08-10 OCC + serialization ────────────────────────────────────────
  // Trước đây hàm này KHÔNG có lock → 2 nhân viên bấm PAID cùng lúc trên 1 đơn PENDING
  // đều đi vào nhánh "PAID lần đầu" → tạo Receipt trùng, gửi Telegram trùng, ghi log trùng.
  // Bọc _withLock để serialize; check _version để rejection sớm nếu client hold data cũ.
  // Lock covers cả receipt creation + telegram enqueue vì cả 2 đều là sheet-write nội bộ,
  // không có external API — chỉ Telegram POST đến API bên ngoài nằm trong processBackgroundQueue
  // (cron riêng, ngoài lock này).
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {

  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var orderRowsById = _getRowIndex('orders') || {};
  var orderRow = Number(orderRowsById[orderId]) || _findSheetRowExact(ordersSh, 1, orderId);
  if (orderRow === -1) throw new Error('Không tìm thấy đơn hàng ' + orderId);
  var _currentVersion = _readVersionAt(ordersSh, orderRow, OCC_COL.ORDERS);
  _checkOccVersion(expectedVersion, _currentVersion, 'Đơn ' + orderId);
  // Read the one target row, including fulfillment status, instead of materializing all Orders.
  var orderData = ordersSh.getRange(orderRow, 1, 1, Math.min(FULFILLMENT_COL, ordersSh.getLastColumn())).getValues()[0];
  var totalAmount = Number(orderData[4]) || 0;
  var customerId  = String(orderData[1] || '');
  var orderStore  = String(orderData[15] || '');
  var currentFulfillment = String(orderData[FULFILLMENT_COL - 1] || '');
  _perfMark(_pid, 'order_read_done');

  ordersSh.getRange(orderRow, 8).setValue(newStatus);

  // Đồng bộ Payments!Status — listTransactions() (tab "Đơn hàng" trên admin,
  // cột "Trạng thái") đọc trạng thái từ SHEET PAYMENTS, KHÔNG PHẢI Orders.
  // Trước đây chỉ nhánh PAID và REFUNDED-có-kèm-ghi-chú mới đồng bộ cột này —
  // nên bấm "Huỷ đơn" (CANCELLED) hoặc "Hoàn tiền" mà không có ghi chú thì
  // Orders!PaymentStatus đã đúng nhưng Payments!Status vẫn giữ nguyên PENDING,
  // khiến bảng admin hiện sai (vẫn "Chờ TT") dù backend báo cập nhật thành công.
  // Tìm dòng Payments MỘT LẦN, tái dùng cho mọi nhánh bên dưới thay vì quét lại
  // cả sheet nhiều lần.
  var paySh = ss.getSheetByName(SHEET.PAYMENTS);
  var paymentRowsByOrder = _getRowIndex('payments_by_order') || {};
  var paymentRow = Number(paymentRowsByOrder[orderId]) || _findSheetRowExact(paySh, 2, orderId);
  var currentPayStatus = '';
  var paymentId = '', paymentAmount = 0;
  var paymentData = null;
  if (paymentRow !== -1) {
    paymentData = paySh.getRange(paymentRow, 1, 1, 12).getValues()[0];
    currentPayStatus = String(paymentData[5] || '');
    paymentId        = String(paymentData[0] || '');
    paymentAmount    = Number(paymentData[4]) || 0;
  }
  _perfMark(_pid, 'payment_read_done');
  // Không cho 1 thao tác PAID (có thể đến từ UI cũ chưa refresh) ghi đè lên
  // khoản đã REFUNDED — giữ nguyên bảo vệ vốn có trước khi gộp logic.

  // ── PAID ──────────────────────────────────────────────────
  if (newStatus === 'PAID') {
    var paidAt  = nowIso();
    if (paymentRow !== -1 && currentPayStatus !== 'REFUNDED') {
      // F:I are contiguous; preserve G/H and commit Status + PaidAt in one RPC.
      paySh.getRange(paymentRow, 6, 1, 4).setValues([[newStatus, paymentData[6], paymentData[7], paidAt]]);
    }

    var custSh = ss.getSheetByName(SHEET.CUSTOMERS);
    var customerRowsById = _getRowIndex('customers') || {};
    var customerRow = Number(customerRowsById[customerId]) || _findSheetRowExact(custSh, 1, customerId);
    if (customerRow !== -1) {
      custSh.getRange(customerRow, 6).setValue(paidAt);
    }
    _perfMark(_pid, 'paid_state_written');

    // N3 — PAYMENT_CONFIRMED → Staff → Telegram
    notifyTelegram(ss, orderId, 'PAYMENT_CONFIRMED',
      { staffName: staffName, amount: totalAmount },
      settings,
      '✅ <b>Đã xác nhận thanh toán</b>\n' +
      'Đơn: ' + orderId + '\n' +
      'Tổng: ' + totalAmount.toLocaleString('vi-VN') + 'đ\n' +
      'Xác nhận bởi: ' + _escapeHtml(staffName)
    );

    // N3 — PAYMENT_CONFIRMED → Customer → Tracking page
    notifyTrackingPage(ss, orderId, 'PAYMENT_CONFIRMED', 'CUSTOMER',
      { status: 'PAID' }
    );

    // Sales → Finance integration (Phase 03 / architecture/finance.md §13.1) — sinh Receipt
    // đã Posted cho khoản tiền THỰC NHẬN (Payments.Amount — cọc hoặc đủ, KHÔNG phải
    // Orders.Amount, 2 giá trị này khác nhau với đơn order_type=deposit). Best-effort:
    // 1 lỗi ở phía Finance KHÔNG được phép chặn xác nhận thanh toán Sales đã thành công —
    // nuốt lỗi, ghi log, xử lý thủ công sau nếu cần (giống nguyên tắc _incrementCouponUsage()).
    if (paymentId && paymentAmount > 0) {
      var receiptJobId = _enqueueReceiptJob(ss, orderId, paymentId, paymentAmount, orderStore);
      if (!receiptJobId) {
        try {
        autoCreateReceipt(orderId, paymentId, paymentAmount, orderStore);
      } catch (financeEx) {
        logActivity(ss, 'FINANCE', orderId, 'RECEIPT_AUTO_CREATE_FAILED', 'system — ' + financeEx.message);
        // review 30 — trước đây lỗi này chỉ nằm im trong ActivityLogs, không ai biết trừ khi
        // tự lục Nhật ký. Cảnh báo ngay owner/admin để đối chiếu tay (xem thêm
        // get_receipt_reconciliation, §21 mops.md, liệt kê đầy đủ các đơn PAID thiếu Receipt).
        notifyTelegram(ss, orderId, 'RECEIPT_AUTO_CREATE_FAILED',
          { amount: paymentAmount },
          settings,
          '⚠️ <b>Lỗi tạo Phiếu Thu tự động</b>\n' +
          'Đơn: ' + orderId + '\n' +
          'Số tiền: ' + paymentAmount.toLocaleString('vi-VN') + 'đ\n' +
          'Lỗi: ' + financeEx.message + '\n' +
          'Cần tạo Phiếu Thu thủ công hoặc xem Báo cáo → Tài chính → Đơn thiếu Phiếu Thu.'
        );
        }
      }
    }

    // Fulfillment hook (phase vận chuyển 2026-07-17, giữ backward-compat với đơn CŨ có
    // FF='pending_payment'). Đơn MỚI sau 3-Axis Phase 2 (2026-08-09): STAFF create không còn dùng
    // 'pending_payment' nữa (đi thẳng 'pending_packing') → nhánh này chỉ chạm đơn LEGACY.
    // Đơn pull SAPO chưa có FF ('') vẫn advance để lên board pipeline (bug user báo 2026-07-18).
    // best-effort, KHÔNG chặn xác nhận PAID nếu lỗi. pending_approval để approveOrder xử lý.
    try {
      if (currentFulfillment === 'pending_payment' || currentFulfillment === '') {
        _setFulfillmentStatus(ss, orderId, 'pending_packing', 'system:paid', false, { sheet: ordersSh, row: orderRow }, true);
      }
    } catch (ffEx) { /* best-effort */ }
    // 3-Axis Phase 2 (2026-08-09): PAID + FF='delivered' → auto set Status='COMPLETED'. Chạy sau
    // khi Payment đã ghi 'PAID' (cell H đã setValue phía trên) — helper kiểm cả 2 điều kiện, chỉ
    // set khi khớp. COD delivered rồi mới đối soát (payReconciliation set PAID) sẽ hit nhánh này.
    try { _maybeCompleteOrder(ss, { sheet: ordersSh, row: orderRow }, 'system:paid'); } catch (compEx) { /* best-effort */ }
  } else if (paymentRow !== -1 && !(newStatus === 'PAID' && currentPayStatus === 'REFUNDED')) {
    paySh.getRange(paymentRow, 6).setValue(newStatus);
  }

  // ── CANCELLED ─────────────────────────────────────────────
  if (newStatus === 'CANCELLED') {
    // SECURITY (2026-09-05): cancelReason/staffName là free text nối thẳng vào message
    // parse_mode:'HTML' gửi Telegram — escape trước khi nối chuỗi (không escape cả message vì
    // '<b>...</b>' tĩnh ở trên là cố ý). Payload gửi notifyTrackingPage bên dưới giữ giá trị GỐC
    // (không escape) vì đó là field JSON lưu vào Notifications sheet, không phải sink HTML.
    var reasonText = cancelReason ? 'Lý do: ' + _escapeHtml(cancelReason) + '\n' : '';

    // N4 — ORDER_CANCELLED → Staff → Telegram
    notifyTelegram(ss, orderId, 'ORDER_CANCELLED',
      { staffName: staffName, cancelReason: cancelReason },
      settings,
      '❌ <b>Đơn bị hủy</b>\n' +
      'Đơn: ' + orderId + '\n' +
      reasonText +
      'Hủy bởi: ' + _escapeHtml(staffName)
    );

    // N4 — ORDER_CANCELLED → Customer → Tracking page
    notifyTrackingPage(ss, orderId, 'ORDER_CANCELLED', 'CUSTOMER',
      { status: 'CANCELLED', cancelReason: cancelReason }
    );

    // Phase 02 Bước 4 — đảo ngược InventoryMovements đã ghi lúc bán (nếu có)
    _reverseSaleMovements(orderId, staffName, true); // skipLock: updateOrderStatus đã giữ lock riêng

    // Fulfillment hook: huỷ đơn → pipeline 'cancelled'. force=false → chỉ huỷ được từ trạng thái
    // TRƯỚC giao (pending_*/ready_to_pick); đơn đã delivering/delivered không rớt về cancelled (best-effort).
    try { _setFulfillmentStatus(ss, orderId, 'cancelled', 'system:cancel', false, null, true); } catch (ffEx) { /* best-effort */ }
  }

  // ── REFUNDED ──────────────────────────────────────────────
  // Status đã đồng bộ ở khối chung phía trên (kể cả khi không có refund_note);
  // ở đây chỉ còn ghi 2 field phụ khi staff có nhập ghi chú hoàn tiền.
  if (newStatus === 'REFUNDED' && payload.refund_note && paymentRow !== -1) {
    paySh.getRange(paymentRow, 10).setValue(nowIso());
    // SECURITY (2026-09-05): trước đây ghi thẳng payload.refund_note không qua _sanitizeText — free
    // text từ staff (hoặc staff account bị chiếm) có thể chèn công thức Sheets (=/+/-/@) chạy khi ai
    // đó mở lại cell. Các field ghi chú khác (customer_note/internal_note, mops_02.js:198,200) đã
    // sanitize từ trước; refund_note là chỗ sót lại.
    paySh.getRange(paymentRow, 11).setValue(_sanitizeText(payload.refund_note, 500));
  }

  // Phase 02 Bước 4 — REFUNDED cũng đồng nghĩa hàng đã trả lại (hoặc không giao) — đảo
  // ngược InventoryMovements giống CANCELLED. Idempotent nên gọi lại vô hại nếu đơn đã
  // từng CANCELLED trước đó (dù trong thực tế 1 đơn không đi qua cả 2 trạng thái này).
  if (newStatus === 'REFUNDED') {
    _reverseSaleMovements(orderId, staffName, true); // skipLock: updateOrderStatus đã giữ lock riêng

    // review 30 — đóng gap đã ghi TODO từ review 12: trước đây REFUNDED chỉ đảo tồn kho,
    // KHÔNG đảo Receipt/LedgerEntries — tiền vẫn đứng nguyên trong sổ quỹ dù đơn đã hoàn,
    // làm Số dư tài khoản (Báo cáo → Tài chính) cao hơn thực tế. Best-effort giống
    // autoCreateReceipt() ở nhánh PAID — 1 lỗi Finance không được chặn xác nhận hoàn tiền Sales.
    // reverseDocument() tự throw nếu Receipt không ở trạng thái Posted (đã Cancelled từ lần
    // REFUNDED trước) — nhờ đó gọi lại nhiều lần cho cùng 1 đơn vẫn an toàn, không đảo trùng.
    if (paymentId) {
      try {
        var refundReceipt = Repository.Receipts.findBySource('MOPS', 'PAYMENT', paymentId);
        if (refundReceipt && refundReceipt.status === 'Posted') {
          reverseDocument('RECEIPT', refundReceipt.receipt_id, 'Hoàn tiền đơn ' + orderId, staffName);
        }
      } catch (financeEx) {
        logActivity(ss, 'FINANCE', orderId, 'RECEIPT_REVERSE_FAILED', 'system — ' + financeEx.message);
        notifyTelegram(ss, orderId, 'RECEIPT_REVERSE_FAILED',
          { staffName: staffName },
          settings,
          '⚠️ <b>Lỗi đảo Phiếu Thu khi hoàn tiền</b>\n' +
          'Đơn: ' + orderId + '\n' +
          'Lỗi: ' + financeEx.message + '\n' +
          'Cần đối chiếu tay Số dư tài khoản — tiền có thể vẫn đứng nhầm trong sổ quỹ.'
        );
      }
    }
  }

  logActivity(ss, 'ORDER', orderId, 'STATUS_CHANGED_TO_' + newStatus, 'staff:' + staffName);
  // 2026-08-10 OCC: bump _version cuối, ngay trước khi thoát lock — mọi client hold data cũ
  // sẽ nhận OCC_CONFLICT ở lần update kế.
  // FIX (2026-09-05, review round 2): trước đây dùng `_currentVersion` đọc ở ĐẦU hàm — nếu nhánh
  // CANCELLED/PAID phía trên đã gọi _setFulfillmentStatus và hàm đó tự bump _version (thêm ở review
  // round 1), dòng này sẽ ghi ĐÈ bằng _currentVersion+1 (giá trị CŨ+1), xoá mất lượt bump vừa rồi —
  // OCC coi như ít hơn 1 lần đổi thật đã xảy ra. Đọc tươi ngay trước khi ghi để luôn cộng thêm đúng 1
  // từ giá trị mới nhất trong CHÍNH execution này (vẫn đang giữ lock nên không có race với writer
  // khác — _setFulfillmentStatus giờ tự khoá cho mọi caller chưa có sẵn lock).
  var _finalVersion = _readVersionAt(ordersSh, orderRow, OCC_COL.ORDERS);
  _writeVersionAt(ordersSh, orderRow, OCC_COL.ORDERS, _finalVersion + 1);
  _perfMark(_pid, 'complete');
  _perfReport(_pid);

  return { order_id: orderId, status: newStatus, _version: (Number(_currentVersion) || 0) + 1 };
  } finally { lock.releaseLock(); }
}

// ============================================================
// UPDATE ORDER (sửa nội dung đơn đã tạo) — action 'update_order'
// ------------------------------------------------------------
// Sửa TOÀN BỘ nội dung 1 đơn đã tạo: sản phẩm/số lượng, chiết khấu → tính lại tổng tiền,
// thông tin khách (tên/ghi chú), ngày–giờ hẹn, địa chỉ giao. Đối xứng với createOrder() nhưng
// trên đơn CÓ SẴN. Cho sửa MỌI trạng thái (quyết định 2026-07-19) nhưng CẢNH BÁO rõ khi đơn đã
// nhạy cảm (đã thu tiền / đã đẩy SAPO / đã có vận đơn) và GHI AUDIT ai sửa gì, lý do.
//
// BẤT BIẾN TÀI CHÍNH (khác createOrder — đây là điểm rủi ro nhất):
//   • Đơn CHƯA PAID  → cập nhật Payments.Amount + CODAmount, QR tự dựng lại (getOrder build từ
//     payAmount) — an toàn, chưa có tiền vào sổ.
//   • Đơn ĐÃ PAID    → KHÔNG đụng Payments/Phiếu Thu (Receipt là tiền THỰC NHẬN, append-only —
//     không im lặng sửa số đã đối soát, đúng tinh thần reverseDocument()). Chỉ cập nhật cột tiền
//     trên Orders cho khớp nội dung mới + trả cảnh báo chênh lệch để owner đối soát tay.
//   • Coupon: KHÔNG đổi UsedCount khi sửa đơn (tránh đếm trùng/âm) — chỉ tính lại GIÁ TRỊ giảm.
//
// TỒN KHO: luôn đảo ngược movement SALE cũ (_reverseSaleMovements) rồi ghi lại movement mới theo
// giỏ hàng mới — kho đúng bất kể trạng thái thanh toán (hàng thật giao đi đã đổi).
// ============================================================

function updateOrder(payload) {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var _pid     = _perfStart('update_order');
  _perfMark(_pid, 'enter');
  var orderId  = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id is required');

  var staffName = String(payload._staffActor || 'staff').trim();
  var staffId   = String(payload._staffId || staffName).trim();
  var editReason = _sanitizeText(payload.reason || payload.edit_reason || '', 300);
  var expectedVersion = payload._version; // 2026-08-10 OCC

  // 2026-08-10 OCC: serialize toàn hàm — updateOrder ghi Orders + OrderItems + Payments + đảo
  // movement kho, tính lại _calcAvgCostBatch. Rất nhiều write concurrent = corrupt tồn kho. Lock
  // toàn hàm; nếu contention thấy đau sau này sẽ tách micro-scope.
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {

  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var orderRowsById = _getRowIndex('orders') || {};
  var orderRow = Number(orderRowsById[orderId]) || _findSheetRowExact(ordersSh, 1, orderId);
  var order = orderRow === -1 ? null
    : ordersSh.getRange(orderRow, 1, 1, Math.min(40, ordersSh.getLastColumn())).getValues()[0];
  if (orderRow === -1) throw new Error('Không tìm thấy đơn hàng ' + orderId);
  var _currentVersion = _readVersionAt(ordersSh, orderRow, OCC_COL.ORDERS);
  _checkOccVersion(expectedVersion, _currentVersion, 'Đơn ' + orderId);
  _perfMark(_pid, 'orders_read_done');

  var paymentStatus = String(order[7] || '');
  var sapoOrderId   = String(order[9] || '');
  var trackingCode  = String(order[30] || '');
  var customerId    = String(order[1] || '');
  var orderType     = String(order[2] || 'product');
  var branchId      = String(order[26] || '');
  var storeBranch   = String(order[15] || '');

  var isPaid       = paymentStatus === 'PAID';
  var pushedToSapo = !!sapoOrderId;
  var hasShipment  = !!trackingCode;
  var isTerminal   = ['CANCELLED', 'EXPIRED', 'REFUNDED'].indexOf(paymentStatus) !== -1;

  // ── CHẶN sửa nội dung ảnh hưởng VẬN ĐƠN khi đơn đã có mã vận đơn (2026-07-27) ──────────────────
  // KHÔNG hãng nào (kể cả Goship) cho sửa vận đơn đã tạo — muốn đổi thì phải HUỶ rồi TẠO LẠI. Trước đây
  // chỗ này chỉ `warnings.push` rồi vẫn ghi → MOPS một đằng, hãng một nẻo, và không ai biết cho tới lúc
  // giao hỏng (shipper mang hàng tới địa chỉ cũ, hoặc thu COD sai số).
  // Guard chặn theo TỪNG TRƯỜNG: về nguyên tắc vẫn sửa được thứ không nằm trên vận đơn (ghi chú, ngày
  // hẹn). Nhưng form Sửa đơn của FE luôn gửi kèm `items` ⇒ từ UI thì coi như khoá hoàn toàn — và FE cũng
  // đã ẩn nút Sửa đơn khi có tracking_code. Guard theo trường (không phải khoá cả hàm) để lệnh gọi API
  // chỉ đổi ghi chú vẫn chạy được, và để thông báo lỗi nói đúng cái gì đang bị khoá.
  if (hasShipment) {
    var lockedEdits = [];
    var addrKeys = ['ship_address', 'ship_province', 'ship_district', 'ship_ward', 'ship_receiver_name',
                    'ship_phone', 'ship_province_id', 'ship_district_id', 'ship_ward_code',
                    'province_code', 'district_code', 'ward_code', 'full_shipping_address'];
    for (var li = 0; li < addrKeys.length; li++) {
      if (payload[addrKeys[li]] !== undefined && String(payload[addrKeys[li]]).trim() !== '') { lockedEdits.push('địa chỉ/người nhận'); break; }
    }
    if (payload.clear_shipping) lockedEdits.push('xoá địa chỉ giao');
    // Sửa giỏ hàng đổi khối lượng + giá trị hàng ⇒ đổi cước và COD đã đẩy sang hãng.
    if (Array.isArray(payload.items) && payload.items.length) lockedEdits.push('sản phẩm/số lượng');
    // Đổi phương thức khi đã có vận đơn ⇒ đổi kiểu thu tiền (COD ↔ trả trước) — hãng vận chuyển đã biết
    // đơn là COD/nonCOD ở phía họ, đổi sau khi tạo vận đơn = tiền vào 2 nguồn khác nhau, dễ lệch đối soát.
    if (payload.payment_method) lockedEdits.push('phương thức thanh toán (đã có vận đơn)');
    // Chiết khấu/coupon đổi số tiền ⇒ với đơn COD là đổi số tiền shipper phải thu.
    var codAmountNow = _shipmentGet(ss, orderId, { sheet: ordersSh, row: orderRow }).cod_amount;
    if (codAmountNow > 0 && (payload.coupon_code !== undefined || payload.order_discount_value !== undefined || payload.customer_shipping_fee !== undefined)) {
      lockedEdits.push('giảm giá/phí giao (đơn COD — đổi số tiền thu hộ)');
    }
    if (lockedEdits.length) {
      throw new Error('Đơn đã có vận đơn ' + trackingCode + ' — không sửa được ' + lockedEdits.join(', ')
        + '. Đơn vị vận chuyển KHÔNG cho sửa vận đơn đã tạo. Cách làm đúng: bấm "Huỷ vận đơn" → sửa đơn → '
        + 'đóng gói lại (cân lại nếu đổi hàng) → tạo vận đơn mới.');
    }
  }

  // Snapshot TRƯỚC khi sửa (cho AuditTrail before/after) — đọc lại items cũ để so sánh.
  var existingCustomerShipping = _customerShippingGet(ss, orderId, { sheet: ordersSh, row: orderRow });
  var before = {
    amount: Number(order[4]) || 0,
    customer_shipping_fee: existingCustomerShipping.fee,
    deposit: Number(order[5]) || 0,
    discount_code: String(order[16] || ''),
    discount_amount: Number(order[17]) || 0,
    order_discount_type: String(order[23] || ''),
    order_discount_value: Number(order[24]) || 0,
    note: String(order[12] || ''),
    // 2026-08-23 snapshot internal_note (AQ=43) — đọc riêng, không nằm trong 40-col slice của `order`.
    internal_note: _internalNoteGet(ordersSh, orderRow),
    appointment_date: String(order[13] || ''),
    appointment_time: String(order[14] || ''),
    shipping_address_id: String(order[6] || ''),
    payment_status: paymentStatus
    // payment_method: gán sau khi đọc Payments bên dưới (oldPaymentMethod chưa được set ở dòng này)
  };

  // ── Items BẮT BUỘC (form sửa luôn gửi giỏ đầy đủ) — tái dùng validate + pricing của createOrder ──
  var rawItems = [];
  if (payload.items && Array.isArray(payload.items)) rawItems = payload.items;
  if (rawItems.length === 0) throw new Error('Đơn phải có ít nhất 1 sản phẩm');
  if (rawItems.length > 50)  throw new Error('Đơn hàng không được vượt quá 50 sản phẩm');
  rawItems.forEach(function(it) {
    var q = it.qty !== undefined ? it.qty : it.quantity;
    if (q === undefined || q === null || q === '') return;
    var qn = Number(q);
    if (!Number.isInteger(qn) || qn < 1) throw new Error('Số lượng sản phẩm không hợp lệ');
  });

  var appointDate = String(payload.appointment_date || '').trim();
  var appointTime = String(payload.appointment_time || '').trim();
  if (orderType === 'booking' || orderType === 'deposit') {
    if (!appointDate) throw new Error('Vui lòng chọn ngày hẹn');
  }

  var validated     = validateAndPriceItems(ss, rawItems, orderType);
  var resolvedItems = validated.items;
  var totalAmount   = validated.totalAmount;
  _perfMark(_pid, 'validate_price_done');

  // ── Chiết khấu — mirror createOrder() §16 (chiết khấu tại quầy) + coupon (chỉ tính lại giá trị) ──
  var couponCode          = String(payload.coupon_code || '').trim().toUpperCase();
  var discountAmount      = 0;
  var orderDiscountType   = '';
  var orderDiscountValue  = 0;
  var orderDiscountReason = '';
  var clientDiscType   = String(payload.order_discount_type || '').trim();
  var clientDiscValue  = Number(payload.order_discount_value) || 0;
  var clientDiscReason = _sanitizeText(payload.order_discount_reason || '', 300);
  var wantsDiscount    = clientDiscValue > 0;

  if (couponCode && wantsDiscount)
    throw new Error('Không thể áp dụng đồng thời mã giảm giá và chiết khấu thủ công trên cùng 1 đơn');

  if (wantsDiscount) {
    if (['VNĐ', '%'].indexOf(clientDiscType) === -1) throw new Error('Loại chiết khấu phải là VNĐ hoặc %');
    orderDiscountType  = clientDiscType;
    orderDiscountValue = clientDiscValue;
    // Hạn mức Role chỉ áp khi chiết khấu THAY ĐỔI so với đơn gốc — sửa đơn (vd đổi địa chỉ) mà giữ
    // NGUYÊN chiết khấu cũ thì không bắt tài khoản quyền thấp phải xin duyệt lại (chiết khấu đã được
    // duyệt lúc tạo đơn). Đổi giá trị/loại chiết khấu → coi là quyết định mới, phải qua hạn mức.
    var discountChanged = clientDiscType !== before.order_discount_type || clientDiscValue !== before.order_discount_value;
    if (discountChanged) {
      var maxDiscPct        = _getMaxDiscountPercent(payload._staffRole);
      var equivalentPercent = clientDiscType === '%' ? clientDiscValue
        : (totalAmount > 0 ? (clientDiscValue / totalAmount * 100) : 0);
      if (equivalentPercent > maxDiscPct)
        throw new Error('Vượt hạn mức chiết khấu cho phép (' + maxDiscPct + '%) — nhờ tài khoản Role cao hơn sửa đơn này');
    }
    orderDiscountReason = clientDiscReason;
  }

  if (couponCode) {
    var couponResult = _evaluateCoupon(ss, couponCode, totalAmount, resolvedItems.map(function(it) {
      return { handle: it.handle, product_type: it.product.productType, line_total: it.lineTotal };
    }));
    if (!couponResult.valid) throw new Error(couponResult.error);
    discountAmount = couponResult.discount_amount;
    totalAmount    = totalAmount - discountAmount;
  } else if (orderDiscountValue > 0) {
    var orderDiscAmount = orderDiscountType === '%'
      ? Math.round(totalAmount * orderDiscountValue / 100)
      : orderDiscountValue;
    orderDiscAmount = Math.min(orderDiscAmount, totalAmount);
    totalAmount     = totalAmount - orderDiscAmount;
  }

  var depositAmount = 0;
  if (orderType === 'deposit' || orderType === 'booking') {
    depositAmount = resolvedItems.reduce(function(sum, item) {
      return sum + (item.mapping.depositAmount || 0) * item.qty;
    }, 0);
    depositAmount = Math.min(depositAmount, totalAmount);
  }
  var payAmount = depositAmount > 0 ? depositAmount : totalAmount;

  // ── Payment method — chấp nhận đổi VIETQR ↔ COD KHI ĐƠN CHƯA THU TIỀN (2026-07-28) ──
  // Trước: khoá cứng (comment cũ "sửa đơn không đổi VIETQR↔COD"). Nay: mở nhánh AN TOÀN duy nhất là
  // VIETQR ↔ COD trên đơn PENDING/PAYMENT_REPORTED — cả hai đều CHƯA sinh Receipt/Voucher, chỉ khác
  // Payments.Method + Orders.CODAmount + có/không QR. Các nhánh khác cấm rõ ràng để bảo toàn ledger:
  //   · Đơn PAID/REFUNDED/CANCELLED/EXPIRED → chặn (đã có Receipt/refund, đổi = viết lại lịch sử).
  //   · CASH → * hoặc * → CASH → chặn (CASH luôn PAID + auto Receipt lúc tạo; cần Voucher đảo tay,
  //     không tự động — không phát minh reversal architecture trong updateOrder).
  var paySh   = ss.getSheetByName(SHEET.PAYMENTS);
  var paymentRowsByOrder = _getRowIndex('payments_by_order') || {};
  var paymentRow = Number(paymentRowsByOrder[orderId]) || _findSheetRowExact(paySh, 2, orderId);
  var payData = paymentRow === -1 ? [] : [paySh.getRange(paymentRow, 1, 1, 12).getValues()[0]];
  var paymentMethod = 'VIETQR', oldPayAmount = 0, transRef = orderId, oldRawData = '';
  if (payData.length) {
    transRef      = String(payData[0][2]) || orderId;
    paymentMethod = String(payData[0][3] || 'VIETQR').toUpperCase();
    oldPayAmount  = Number(payData[0][4]) || 0;
    oldRawData    = String(payData[0][11] || '');
  }
  _perfMark(_pid, 'payments_read_done');
  var oldPaymentMethod = paymentMethod; // đóng băng để so sánh trước khi có thể ghi đè bên dưới
  // Audit trail — method LÚC BẮT ĐẦU sửa (trước khi swap). Nếu không có Payments row (đơn dữ liệu bất
  // thường/đơn cũ pre-2026-07), KHÔNG viết 'VIETQR' vào audit — 'VIETQR' là mặc định init loop, không
  // phải giá trị THẬT trên đơn. Ghi 'UNKNOWN' để audit trail trung thực (2026-07-28).
  before.payment_method = (paymentRow === -1) ? 'UNKNOWN' : oldPaymentMethod;
  var requestedMethod  = String(payload.payment_method || '').toUpperCase();
  var methodChanged    = requestedMethod && requestedMethod !== oldPaymentMethod;
  var newBankAcct      = null;
  if (methodChanged) {
    if (['VIETQR', 'COD', 'CASH'].indexOf(requestedMethod) === -1)
      throw new Error('Phương thức thanh toán không hợp lệ: ' + requestedMethod);
    if (isPaid)
      throw new Error('Đơn đã THU TIỀN — không đổi được phương thức thanh toán. Nếu cần: tạo Phiếu Chi hoàn tiền ở tab Tài chính rồi tạo đơn mới đúng phương thức.');
    if (oldPaymentMethod === 'CASH' || requestedMethod === 'CASH')
      throw new Error('Không đổi được phương thức có liên quan TIỀN MẶT qua Sửa đơn — CASH luôn kèm Phiếu Thu tự động, cần Voucher đảo tay ở tab Tài chính trước.');
    // Tới đây: NOT PAID + cả 2 method thuộc {VIETQR, COD} → an toàn swap (chỉ đụng Payments.Method + QR
    // + CODAmount, không đụng Receipts/Vouchers vì cả 2 đều chưa sinh).
    if (paymentRow === -1)
      throw new Error('Đơn không có dòng Payment để sửa phương thức — dữ liệu bất thường, liên hệ tech.');
    if (requestedMethod === 'VIETQR' && !_hasAnyReceivingBank(ss, settings))
      throw new Error('Chưa cấu hình tài khoản nhận tiền — vào MOPS Admin > Chi nhánh > Tài khoản ngân hàng trước khi đổi sang VietQR.');
    if (requestedMethod === 'VIETQR') {
      // Chốt TK sẽ ghim vào Payments.RawData — không đợi getOrder dựng lại QR để tránh trường hợp TK
      // mặc định của chi nhánh bị xoá giữa chừng. Trùng pattern createOrder() §payment.
      newBankAcct = _resolveBankAccount(ss, branchId, settings);
      if (!newBankAcct)
        throw new Error('Không giải được tài khoản nhận tiền cho chi nhánh này — vào Chi nhánh > Tài khoản ngân hàng để cấu hình mặc định.');
    }
    paymentMethod = requestedMethod; // cập nhật local var để mọi guard bên dưới thấy method mới
  }
  var isCod = paymentMethod === 'COD';
  // TK ngân hàng: đơn đã ghim TK trong Payments.RawData lúc tạo (2026-07-21) — QR dựng lại ở getOrder từ
  // snapshot đó + số tiền mới. Chỉ cần kiểm tra cấu hình khi request thực sự đổi sang VietQR hoặc đơn
  // cũ không có snapshot; sửa địa chỉ/ghi chú trên đơn VietQR hiện hữu không cần đọc toàn bộ BankAccounts.
  var hasBankSnapshot = !!oldRawData;
  if (!isCod && !isPaid && !hasBankSnapshot && !_hasAnyReceivingBank(ss, settings))
    throw new Error('Chưa cấu hình tài khoản nhận tiền — vào MOPS Admin > Chi nhánh > Tài khoản ngân hàng trước khi sửa đơn VietQR.');

  // ── Địa chỉ giao (append-only, giống createOrder): có ship fields → tạo dòng mới + trỏ lại; ──
  //     bỏ trống hết → gỡ giao hàng (Orders cột 7 = '').
  var shippingAddressId = String(order[6] || '');
  var shipAddress  = String(payload.ship_address || '').trim();
  var shipProvince = String(payload.ship_province || '').trim();
  if (shipAddress || shipProvince) {
    var shippingData = {
      customer_id: customerId,
      receiver_name: String(payload.ship_receiver_name || payload.customer_name || '').trim(),
      phone: String(payload.ship_phone || '').trim(),
      province: shipProvince, district: String(payload.ship_district || '').trim(),
      ward: String(payload.ship_ward || '').trim(), address: shipAddress,
      // Ưu tiên province_code/district_code/ward_code (MopsAddressMaster 2026-08-11); fallback GHN ID cũ.
      province_id: String(payload.province_code || payload.ship_province_id || '').trim(),
      district_id: String(payload.district_code || payload.ship_district_id || '').trim(),
      ward_code:   String(payload.ward_code || payload.ship_ward_code || '').trim()
    };
    var existingShippingAddress = shippingAddressId ? _getShippingAddress(ss, shippingAddressId) : null;
    if (!_shippingAddressMatches(existingShippingAddress, shippingData)) {
      shippingAddressId = _createShippingAddress(ss, shippingData);
    }
    if (payload.save_customer_address) _setCustomerDefaultShippingAddress(ss, customerId, shippingAddressId);
  } else if (payload.clear_shipping) {
    shippingAddressId = '';
  }

  var oldCustomerShipping = existingCustomerShipping;
  var hasCustomerShipping = !!shippingAddressId;
  var customerShipping = _resolveCustomerShippingCharge(payload, totalAmount, hasCustomerShipping, oldCustomerShipping);
  var customerShippingFee = customerShipping.fee;
  // Tính lại sau khi đã biết có còn địa chỉ giao hay không.
  payAmount = (depositAmount > 0 ? depositAmount : totalAmount) + customerShippingFee;

  // ── GHI TỒN KHO: lập kế hoạch đảo SALE cũ, rồi ghép với SALE mới trong một batch ở dưới. ──
  // Nhờ vậy chỉ có 1 appendMany() (1 quét MovementID) + 1 _adjustInventoryQtyBatch(), nhưng thứ tự
  // audit vẫn reversal IN trước SALE OUT mới và giá vốn vẫn tính trên tập IN sau khi hoàn kho.
  // Read only this order's existing line items. Metadata-only edits must not touch inventory.
  var itemsSheet = ss.getSheetByName(SHEET.ORDER_ITEMS);
  var itemRowsByOrder = _getRowIndex('order_items') || {};
  var oldItemRows = itemRowsByOrder[orderId] || _findSheetRowsExact(itemsSheet, 2, orderId);
  var oldItemData = _readSheetRows(itemsSheet, oldItemRows, 1, 12);
  var oldItemSignatures = oldItemData.filter(function(r) { return String(r[1]) === orderId; }).map(function(r) {
    return [String(r[2] || ''), String(r[3] || ''), String(r[4] || ''), String(Number(r[7]) || 0), String(Number(r[8]) || 0)].join('|');
  }).sort();
  var newItemSignatures = resolvedItems.map(function(item) {
    return [String(item.productId || ''), String(item.variantId || ''), String(item.handle || ''), String(Number(item.price) || 0), String(Number(item.qty) || 0)].join('|');
  }).sort();
  var itemsChanged = oldItemSignatures.length !== newItemSignatures.length;
  if (!itemsChanged) {
    for (var sig = 0; sig < oldItemSignatures.length; sig++) {
      if (oldItemSignatures[sig] !== newItemSignatures[sig]) { itemsChanged = true; break; }
    }
  }
  _perfMark(_pid, 'items_compare_done');
  var productNamesArr = [];
  resolvedItems.forEach(function(item) {
    productNamesArr.push(item.productName + (item.qty > 1 ? ' x' + item.qty : ''));
  });
  if (itemsChanged) {
    var reversalPlan = _planSaleMovementReversal(orderId, 'staff:' + staffName);
    var _avgCost = reversalPlan && reversalPlan.avg_cost;
    if (!_avgCost) _avgCost = _calcAvgCostBatch();
    _perfMark(_pid, 'inventory_reversal_planned');

    // ROLLBACK (2026-09-05): trước đây xoá OrderItems cũ rồi ghi mới không có cơ chế khôi phục — nếu
    // setValues() ghi item mới thất bại (lỗi tạm thời GAS/Sheets) SAU KHI đã deleteRows() item cũ,
    // đơn hàng bị "mất trắng" OrderItems, không có gì phục hồi (_newUndoStack đã có sẵn trong
    // mops_shared.js nhưng trước giờ chỉ dùng ở createOrderPosComplete). Dùng oldItemData đã đọc ở
    // trên (trước khi xoá) để đăng ký hành động khôi phục — appendRow lại (không cần đúng vị trí
    // dòng cũ, OrderItems chỉ tra theo OrderID cột B, không theo thứ tự dòng).
    var undo = _newUndoStack();
    var oldItemDataForOrder = oldItemData.filter(function(r) { return String(r[1]) === orderId; });
    undo.push(function() {
      oldItemDataForOrder.forEach(function(r) { try { itemsSheet.appendRow(r); } catch (undoErr) { /* best-effort rollback */ } });
    });

    var oldItemGroups = [];
    for (var og = 0; og < oldItemRows.length; og++) {
      var lastGroup = oldItemGroups[oldItemGroups.length - 1];
      if (lastGroup && oldItemRows[og] === lastGroup.start + lastGroup.count) lastGroup.count++;
      else oldItemGroups.push({ start: oldItemRows[og], count: 1 });
    }
    for (var dr = oldItemGroups.length - 1; dr >= 0; dr--) {
      try { itemsSheet.deleteRows(oldItemGroups[dr].start, oldItemGroups[dr].count); } catch (e2) { /* best-effort */ }
    }
    _perfMark(_pid, 'old_items_deleted');

    // FIX (2026-09-05, review round 4): try/rollback trước đây chỉ bọc setValues() cuối — 1 lỗi ở
    // generateIdsBatch() (tự khoá/quét riêng) hoặc ở _avgCost() bên trong forEach (đọc InventoryMovements)
    // xảy ra SAU deleteRows() nhưng TRƯỚC try cũ sẽ ném thẳng ra ngoài, undo.rollback() không bao giờ
    // chạy — đúng lại kịch bản "mất trắng OrderItems" mà bản vá này định đóng. Mở rộng try ra trọn cả
    // đoạn từ sau khi xoá item cũ đến khi ghi xong item mới.
    var itemIds, itemRows = [], invEntries = [], qtyDeltas = [], itemStartRow;
    try {
      itemIds = generateIdsBatch(itemsSheet, 'OI', 6, resolvedItems.length);
      resolvedItems.forEach(function(item, idx) {
        var unitCost = _avgCost(item.productId, item.variantId);
        itemRows.push([
          itemIds[idx], orderId, item.productId, item.variantId, item.handle, item.sku,
          item.productName, item.price, item.qty, item.lineTotal, item.snapshot, unitCost
        ]);
        if (item.productId) {
          invEntries.push({
            product_id: item.productId, variant_id: item.variantId, type: 'OUT', qty: item.qty, unit_cost: unitCost,
            source_type: 'SALE', source_ref: orderId, created_by: 'staff:' + staffName
          });
          qtyDeltas.push({
            product_id: item.productId, variant_id: item.variantId, delta: -item.qty,
            product_row: item.product && item.product._row
          });
        }
      });
      itemStartRow = itemsSheet.getLastRow() + 1;
      itemsSheet.getRange(itemStartRow, 1, itemRows.length, 12).setValues(itemRows);
    } catch (writeNewItemsErr) {
      // Ghi item mới thất bại SAU KHI item cũ đã bị xoá — khôi phục lại item cũ rồi báo lỗi thật
      // (không được best-effort nuốt lỗi ở đây như khối inventory bên dưới — mất OrderItems là mất
      // dữ liệu đơn hàng, không phải chỉ mất log tồn kho).
      undo.rollback();
      throw writeNewItemsErr;
    }
    // FIX (2026-09-05, review round 3): setNumberFormat tách RIÊNG khỏi try/rollback ở trên — nếu để
    // chung, setValues() thành công nhưng 1 trong 2 setNumberFormat() sau đó throw (lỗi tạm thời API)
    // sẽ khiến rollback() append lại item CŨ chồng lên item MỚI đã ghi thành công, tạo trùng lặp thay
    // vì khôi phục sạch. setNumberFormat chỉ là định dạng hiển thị (không mất dữ liệu nếu lỗi) nên để
    // best-effort, không rollback.
    try {
      itemsSheet.getRange(itemStartRow, 8, itemRows.length, 3).setNumberFormat('#,##0');
      itemsSheet.getRange(itemStartRow, 12, itemRows.length, 1).setNumberFormat('#,##0');
    } catch (formatErr) { /* best-effort — chỉ ảnh hưởng định dạng hiển thị, không mất dữ liệu */ }
    _perfMark(_pid, 'items_bulk_write_done');

    try {
      var allInvEntries = (reversalPlan ? reversalPlan.entries : []).concat(invEntries);
      var allQtyDeltas = (reversalPlan ? reversalPlan.qty_deltas : []).concat(qtyDeltas);
      if (allInvEntries.length) Repository.InventoryMovements.appendMany(allInvEntries);
      if (allQtyDeltas.length) _adjustInventoryQtyBatch(ss, allQtyDeltas);
    } catch (moveErr) { /* best-effort — không chặn cập nhật đơn vì lỗi log tồn kho */ }
    _perfMark(_pid, 'inventory_bulk_write_done');
  } else {
    _perfMark(_pid, 'inventory_skipped_unchanged_items');
  }

  // ── Cập nhật cột tiền + thông tin trên Orders ──
  var warnings = []; // Khai báo sớm — customer_name/phone check + Orders update đều có thể push warning (2026-07-28)
  ordersSh.getRange(orderRow, 5, 1, 3).setValues([[totalAmount, depositAmount, shippingAddressId]]); // E:G
  ordersSh.getRange(orderRow, 17, 1, 2).setValues([[couponCode, discountAmount]]); // Q:R
  ordersSh.getRange(orderRow, 24, 1, 3).setValues([[orderDiscountType, orderDiscountValue, orderDiscountReason]]); // X:Z
  if (ordersSh.getMaxColumns() >= CUSTOMER_SHIPPING_COL.IS_MANUAL) {
    ordersSh.getRange(orderRow, CUSTOMER_SHIPPING_COL.FEE, 1, 2)
      .setValues([[customerShipping.fee, !!customerShipping.is_manual]]);
  } else {
    _customerShippingSet(ss, orderId, customerShipping, { sheet: ordersSh, row: orderRow });
  }
  var noteValue = payload.note !== undefined ? _sanitizeText(payload.note, 500) : order[12];
  var appointmentDateValue = (appointDate || orderType === 'booking' || orderType === 'deposit') ? appointDate : order[13];
  var appointmentTimeValue = payload.appointment_time !== undefined ? appointTime : order[14];
  if (payload.note !== undefined || appointDate || orderType === 'booking' || orderType === 'deposit' || payload.appointment_time !== undefined) {
    ordersSh.getRange(orderRow, 13, 1, 3).setValues([[noteValue, appointmentDateValue, appointmentTimeValue]]); // M:O
  }
  // 2026-08-23 internal_note (AQ=43) — ghi độc lập (không nằm trong slice M:O). Chỉ ghi khi payload có
  // trường này (undefined = giữ nguyên). Guard `hasShipment` ở đầu hàm không chặn ghi chú, nên internal_note
  // vẫn sửa được dù đơn đã có vận đơn. Best-effort — không throw nếu sheet chưa nới cột.
  if (payload.internal_note !== undefined) {
    try { _internalNoteSet(ordersSh, orderRow, _sanitizeText(payload.internal_note, 500)); } catch (e) { /* best-effort */ }
  }
  _perfMark(_pid, 'orders_write_done');

  // ── Tên khách (Customers.Name) — SĐT là khoá định danh khách, KHÔNG sửa qua đây ──
  // Đồng thời: nếu payload gửi kèm `phone` khác giá trị hiện tại → CẢNH BÁO tường minh (2026-07-28).
  // Trước đây backend im lặng bỏ qua — FE nhập SĐT mới, nhân viên tưởng đã đổi. Giờ đọc Customers.Phone
  // 1 lần trong cùng loop để so sánh + đẩy warning, không tăng chi phí đáng kể.
  if ((payload.customer_name !== undefined || payload.phone !== undefined) && customerId) {
    try {
      var custSh = ss.getSheetByName(SHEET.CUSTOMERS);
      var customerRowsById = _getRowIndex('customers') || {};
      var customerRow = Number(customerRowsById[customerId]) || _findSheetRowExact(custSh, 1, customerId);
      if (customerRow !== -1) {
        var custRow = custSh.getRange(customerRow, 2, 1, 2).getValues()[0]; // B Phone, C Name
        if (payload.customer_name !== undefined) {
          var requestedName = _sanitizeText(payload.customer_name, 100);
          if (requestedName !== String(custRow[1] || '')) {
            custSh.getRange(customerRow, 3).setValue(requestedName); // C Name
          }
        }
        if (payload.phone !== undefined) {
          var currentPhone = String(custRow[0] || '');
          var requestedPhone = String(payload.phone || '').trim();
          if (requestedPhone && normalizePhone(requestedPhone) !== normalizePhone(currentPhone)) {
            warnings.push('SĐT khách hàng (' + currentPhone + ') KHÔNG đổi được qua Sửa đơn — SĐT là khoá định danh khách. Nếu thật sự cần đổi/gộp khách, vào tab Khách hàng.');
          }
        }
      }
    } catch (custErr) { /* best-effort */ }
  }
  // Các field không thuộc phạm vi Sửa đơn — cảnh báo im lặng đã bị bỏ qua để nhân viên khỏi ngỡ ngàng
  // khi thấy đơn vẫn giữ nguyên chi nhánh/email cũ. Không tự sửa vì đây là quyết định nghiệp vụ (chuyển
  // đơn giữa chi nhánh) hoặc field không thuộc Customers/Orders MOPS quản lý (email trong SAPO).
  if (payload.branch_id !== undefined && String(payload.branch_id).trim() && String(payload.branch_id).trim() !== branchId) {
    warnings.push('Chi nhánh của đơn (' + (branchId || 'không có') + ') KHÔNG đổi được qua Sửa đơn — cần luồng chuyển đơn giữa chi nhánh riêng (chưa hỗ trợ).');
  }
  if (payload.email !== undefined && String(payload.email).trim()) {
    warnings.push('Email khách hàng chưa thuộc phạm vi MOPS quản lý — bị bỏ qua. Nếu cần lưu email, cập nhật ở SAPO.');
  }

  // ── Payments/QR: chỉ đơn CHƯA PAID mới đổi số tiền phải trả + build lại QR (getOrder tự dựng) ──
  // (warnings đã khai báo phía trên — dùng chung cho toàn hàm)
  if (!isPaid) {
    if (paymentRow !== -1) {
      if (oldPayAmount !== payAmount) {
        paySh.getRange(paymentRow, 5).setValue(payAmount); // E Amount
        _forceNumberFormat(paySh, paymentRow, [5]);
      }
      // Đổi phương thức (VIETQR ↔ COD, đã guard NOT PAID + !CASH ở trên) — ghi Method + reset ExpiresAt +
      // RawData cho khớp method mới. QR mới do getOrder() ở return dựng lại từ RawData này (deterministic).
      if (methodChanged) {
        paySh.getRange(paymentRow, 4).setValue(requestedMethod); // D Method
        if (requestedMethod === 'COD') {
          // COD không có QR trả trước → clear hạn QR + snapshot TK cũ; CODAmount xử lý ngay sau nhánh này.
          paySh.getRange(paymentRow, 8).setValue(''); // H ExpiresAt
          paySh.getRange(paymentRow, 12).setValue(''); // L RawData (bank snapshot không còn dùng)
        } else if (requestedMethod === 'VIETQR' && newBankAcct) {
          // Gia hạn QR +15 phút giống lúc tạo mới (createOrder line 460) — đơn được coi là bắt đầu 1 chu
          // kỳ trả trước mới, khách cần đủ thời gian quét QR.
          paySh.getRange(paymentRow, 8).setValue(new Date(Date.now() + 15 * 60 * 1000).toISOString());
          paySh.getRange(paymentRow, 12).setValue(JSON.stringify({
            bank_account_id: newBankAcct.bank_account_id,
            bank_code: newBankAcct.bank_code,
            account_no: newBankAcct.account_no,
            account_name: newBankAcct.account_name
          }));
        }
      }
    }
    // CODAmount: reflect method HIỆN TẠI. Nếu vừa đổi sang VIETQR → clear về 0; nếu COD (đã hoặc vừa đổi
    // sang) → set = payAmount. _shipmentSet ghi Orders.AG (mops_01.js SHIPMENT_COL.COD).
    if (isCod) {
      _shipmentSet(ss, orderId, { cod_amount: payAmount }, { sheet: ordersSh, row: orderRow });
    } else if (methodChanged && oldPaymentMethod === 'COD') {
      _shipmentSet(ss, orderId, { cod_amount: 0 }, { sheet: ordersSh, row: orderRow });
    }
    if (methodChanged) {
      warnings.push('Đã đổi phương thức thanh toán ' + oldPaymentMethod + ' → ' + requestedMethod
        + (requestedMethod === 'VIETQR' ? '. QR đã được dựng lại theo tài khoản nhận tiền hiện tại.'
        : requestedMethod === 'COD' ? '. Số tiền thu hộ COD = ' + payAmount.toLocaleString('vi-VN') + 'đ, huỷ QR trả trước.' : ''));
    }
  } else if (payAmount !== oldPayAmount) {
    warnings.push('Đơn ĐÃ THU TIỀN (' + oldPayAmount.toLocaleString('vi-VN') + 'đ). Phiếu Thu giữ nguyên số cũ — '
      + 'chênh lệch ' + (payAmount - oldPayAmount).toLocaleString('vi-VN') + 'đ cần đối soát Tài chính thủ công '
      + '(tạo Phiếu Thu bổ sung hoặc Phiếu Chi hoàn phần dư).');
  }
  if (pushedToSapo)
    warnings.push('Đơn đã đẩy lên SAPO (' + sapoOrderId + '). Sửa ở MOPS KHÔNG tự cập nhật SAPO — chỉnh tay bên SAPO nếu cần.');
  if (hasShipment)
    // Tới được đây nghĩa là chỉ sửa thứ KHÔNG nằm trên vận đơn (ghi chú/ngày hẹn) — guard ở đầu hàm đã
    // chặn mọi thay đổi ảnh hưởng vận đơn. Vẫn nhắc để nhân viên biết đơn này đang trên đường đi.
    warnings.push('Đơn đã có vận đơn (' + trackingCode + '). Địa chỉ/sản phẩm/COD đã bị khoá — muốn đổi thì huỷ vận đơn rồi tạo lại.');
  if (isTerminal)
    warnings.push('Đơn đang ở trạng thái "' + paymentStatus + '" — đã sửa nhưng kiểm tra lại có thực sự cần thiết không.');

  // ── Audit + activity ──
  var after = {
    amount: totalAmount + customerShippingFee, customer_shipping_fee: customerShippingFee,
    deposit: depositAmount, discount_code: couponCode,
    discount_amount: discountAmount, order_discount_type: orderDiscountType,
    order_discount_value: orderDiscountValue, note: String(payload.note || before.note),
    internal_note: payload.internal_note !== undefined ? _sanitizeText(payload.internal_note, 500) : before.internal_note,
    appointment_date: appointDate, appointment_time: appointTime,
    shipping_address_id: shippingAddressId, payment_status: paymentStatus,
    payment_method: paymentMethod
  };
  logAuditTrail(ss, 'ORDER', orderId, 'ORDER_UPDATED', before, after, editReason, staffId);
  logActivity(ss, 'ORDER', orderId, 'ORDER_UPDATED', 'staff:' + staffName + (editReason ? ' — ' + editReason : ''));
  _perfMark(_pid, 'audit_activity_done');

  var result = {
    order_id: orderId,
    warnings: warnings,
    money_delta: payAmount - oldPayAmount
  };
  // 2026-08-10 OCC: bump _version cuối, trước response
  var _nextVer = (Number(_currentVersion) || 0) + 1;
  _writeVersionAt(ordersSh, orderRow, OCC_COL.ORDERS, _nextVer);
  result._version = _nextVer;
  } finally { lock.releaseLock(); }
  // PERF (2026-09-05): getOrder() ở đây chỉ dựng lại response đầy đủ cho FE, KHÔNG phải 1 phần của
  // write chính — trước đây gọi trong lúc lock còn giữ, kéo dài thêm lock span vốn đã dài nhất
  // codebase (~500 dòng) bằng cả 1 lượt đọc order/customer/items/payments đầy đủ. Chuyển ra ngoài
  // try/finally: lock đã release ở dòng trên, hành vi response không đổi (vẫn gán result.order y hệt
  // cũ, chỉ khác thời điểm — `result` là `var` nên hoist ra được ngoài block try).
  // Client cũ vẫn nhận snapshot; Admin local đã tự gọi get_order sau khi lưu nên có thể bỏ full read.
  // FIX (2026-09-05, review round 5, bug tiền-nhiệm không phải do đổi vị trí lock ở trên): getOrder()
  // có cache đầy đủ khoá theo _analyticsGen() (mops_02.js đầu hàm getOrder) — nhưng gen chỉ bump ở
  // _dispatchWrite() SAU KHI updateOrder() return xong (mops_00.js), tức TẠI ĐÂY gen vẫn là bản CŨ từ
  // trước khi ghi. Nếu 1 client khác vừa đọc order này (đổ cache full dưới gen cũ) ngay trước lượt
  // sửa này, result.order dựng lại ở đây sẽ trúng cache CŨ — trả field vừa sửa (note/amount/...) dù
  // result._version đã đúng bản mới. Bump gen SỚM ở đây (trước khi gọi getOrder) để chắc chắn cache
  // miss, đọc tươi đúng bản vừa ghi. Gọi _bumpAnalyticsGen() thêm 1 lần nữa ở _dispatchWrite sau đó
  // vô hại (chỉ tăng thêm số gen, không sai lệch gì).
  if (payload.return_order !== false) { _bumpAnalyticsGen(); result.order = getOrder(orderId, null, payload.token); }
  _perfMark(_pid, 'response_detail_done');
  _perfReport(_pid);
  return result;
}

// ============================================================
// LIST MAPPINGS (was listServices)
// ============================================================

// phase-07 perf — bust cache list_mappings (gọi ở mọi write mapping/product): mapping đổi, giá/tên/ảnh/
// status SP đổi (updateProduct/syncProducts/createLocalProduct) → checkout phải thấy ngay, không chờ TTL.
function _mappingsCacheBust() {
  _memoBust('__mappings');
  try { CacheService.getScriptCache().remove('mops_mappings_result'); } catch (e) {}
}

function listMappings() {
  // Cache kết quả (output nhỏ) tránh đọc TOÀN BỘ ~2875 SP mỗi lần — checkout gọi list_services mỗi lần vào
  // trang (trước 5-10s). request-memo + CacheService TTL 300s; bust ngay khi write qua _mappingsCacheBust().
  return _memo('__mappings', function() {
    try { var _c = CacheService.getScriptCache().get('mops_mappings_result'); if (_c) return JSON.parse(_c); } catch (e0) {}

    var ss           = SpreadsheetApp.getActiveSpreadsheet();
    var mappingSheet = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);

  var mappingData = mappingSheet.getLastRow() > 1
    ? mappingSheet.getRange(2, 1, mappingSheet.getLastRow() - 1, 10).getValues()
    : [];

  // Sản phẩm đọc qua Repository.Products (phase-07 GĐ3.3) — last-wins theo handle như cũ.
  var products = {};
  Repository.Products.findAll().forEach(function(p) {
    products[p.handle] = {
      productId:      p.product_id,
      variantId:      p.variant_id,
      sku:            p.sku,
      title:          p.title,
      price:          p.price,
      compareAtPrice: p.compare_at_price,
      image:          p.image,
      status:         p.status || 'inactive'
    };
  });

  var results = [];
  mappingData.forEach(function(r) {
    var handle  = String(r[0]);
    var enabled = r[1] === true || String(r[1]).toLowerCase() === 'true';
    if (!enabled) return;

    var product = products[handle] || {};
    results.push({
      handle:        handle,
      display_name:  String(r[5] || '') || product.title || handle,
      price:         product.price || 0,
      compare_price: product.compareAtPrice || 0,
      image:         product.image || '',
      deposit:       Number(r[3]) || 0,
      capabilities:  String(r[2] || ''),
      sort_order:    Number(r[6]) || 0,
      cost_price:        Number(r[7]) || 0,
      safety_stock_min:  Number(r[8]) || 0,
      safety_stock_max:  Number(r[9]) || 0,
      // V1 backward compat
      svc_id:        handle,
      sapo_handle:   handle,
      active:        enabled
    });
  });

  results.sort(function(a, b) { return a.sort_order - b.sort_order; });

    var out = { mappings: results, services: results };
    try { CacheService.getScriptCache().put('mops_mappings_result', JSON.stringify(out), 300); } catch (e2) {}
    return out;
  });
}

// ============================================================
// GET MAPPING (was getService)
// ============================================================

function getMapping(handle) {
  if (!handle) throw new Error('handle is required');
  var all   = listMappings();
  var found = null;
  all.mappings.forEach(function(m) { if (m.handle === handle) found = m; });
  if (!found) throw new Error('Mapping không tìm thấy: ' + handle);
  return found;
}

// ============================================================
// VALIDATE MAPPING (4-step check)
// ============================================================

function validateMapping(handle) {
  if (!handle) throw new Error('handle is required');
  var ss           = SpreadsheetApp.getActiveSpreadsheet();
  var mappingSheet = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);

  var mappingData = mappingSheet.getLastRow() > 1
    ? mappingSheet.getRange(2, 1, mappingSheet.getLastRow() - 1, 10).getValues()
    : [];

  var mapping = null;
  for (var i = 0; i < mappingData.length; i++) {
    if (String(mappingData[i][0]) === handle) { mapping = mappingData[i]; break; }
  }
  // Sản phẩm: FIRST-match theo handle (KHÔNG active-preferred — giữ đúng hành vi check cũ).
  var product = null;
  var allProducts = Repository.Products.findAll();
  for (var j = 0; j < allProducts.length; j++) {
    if (allProducts[j].handle === handle) { product = allProducts[j]; break; }
  }

  var checks = {
    in_mappings:     !!mapping,
    mapping_enabled: mapping ? (mapping[1] === true || String(mapping[1]).toLowerCase() === 'true') : false,
    in_products:     !!product,
    product_active:  product ? product.status === 'active' : false
  };
  checks.valid = checks.in_mappings && checks.mapping_enabled && checks.in_products && checks.product_active;

  return { handle: handle, checks: checks };
}

// ============================================================
// LIST PRODUCTS
// ============================================================

// Sức bán (review tối ưu bảng Sản phẩm 2026-07-16) — tổng SL đã bán, gộp theo Handle, CHỈ tính
// đơn đã thật sự chốt (PAID/PROCESSING/COMPLETED — loại PENDING/PAYMENT_REPORTED/CANCELLED/
// EXPIRED/REFUNDED vì chưa/không phải doanh số thật). Quét thêm Orders+OrderItems nên chỉ chạy
// khi listProducts() được gọi với include_sales — xem comment ở đó.
function _getSoldQtyByHandle(ss) {
  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var soldStatusOrderIds = {};
  if (ordersSh && ordersSh.getLastRow() > 1) {
    ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 8).getValues().forEach(function(r) {
      var status = String(r[7] || '');
      if (['PAID', 'PROCESSING', 'COMPLETED'].indexOf(status) !== -1) soldStatusOrderIds[String(r[0])] = true;
    });
  }

  var totals = {};
  var itemsSh = ss.getSheetByName(SHEET.ORDER_ITEMS);
  if (itemsSh && itemsSh.getLastRow() > 1) {
    itemsSh.getRange(2, 1, itemsSh.getLastRow() - 1, 9).getValues().forEach(function(r) {
      if (!soldStatusOrderIds[String(r[1])]) return;
      var handle = String(r[4] || '');
      if (!handle) return;
      totals[handle] = (totals[handle] || 0) + (Number(r[8]) || 0);
    });
  }
  return totals;
}

function listProducts(params) {
  var ss           = SpreadsheetApp.getActiveSpreadsheet();
  var mappingSheet = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);
  // Admin list does not need full image URLs for filtering, lookup, or editing. Keep the
  // public/default contract unchanged; callers may opt into the smaller projection.
  var compact       = !!(params && (String(params.compact).toLowerCase() === '1' || String(params.compact).toLowerCase() === 'true'));
  // include_sales — TUỲ CHỌN (review 2026-07-16), chỉ Admin (tab Sản phẩm, sort "Sức bán") bật
  // cờ này. Checkout widget public cũng gọi action list_products cùng hàm — KHÔNG được mặc định
  // quét thêm Orders/OrderItems mỗi lần khách tải danh sách sản phẩm.
  var soldQtyByHandle = (params && params.include_sales)
    ? _cachedRead('product_sold_qty_by_handle', function() { return _getSoldQtyByHandle(ss); })
    : null;

  var mappingHandles = {};
  var mappingUnits   = {}; // Handle -> Unit (ProductMappings col K, chỉ có ý nghĩa nếu đã "Kết nối")
  var mappingData = _cachedArrayRead('product_mappings_with_unit', function() {
    return mappingSheet && mappingSheet.getLastRow() > 1
      ? mappingSheet.getRange(2, 1, mappingSheet.getLastRow() - 1, 11).getValues()
      : [];
  });
  if (mappingData.length) {
    mappingData
      .forEach(function(r) {
        var h = String(r[0]);
        mappingHandles[h] = (r[1] === true || String(r[1]).toLowerCase() === 'true');
        mappingUnits[h]   = String(r[10] || '');
      });
  }

  // Dữ liệu sản phẩm đọc qua Repository.Products (phase-07 GĐ3.3) — mọi field text đã String() trong
  // _mapRow (SKU/Title toàn số không còn gây TypeError .toLowerCase() ở client). Join mappings + sold_qty.
  var productRows = _cachedArrayRead('products_repository_rows', function() {
    return Repository.Products.findAll();
  });
  var results = productRows.map(function(p) {
    var inMops = p.handle in mappingHandles;
    var base = {
      product_id:       p.product_id,
      variant_id:       p.variant_id,
      handle:           p.handle,
      sku:              p.sku,
      title:            p.title,
      vendor:           p.vendor,
      product_type:     p.product_type,
      price:            p.price,
      compare_at_price: p.compare_at_price,
      weight:           p.weight,
      image:            compact ? '' : p.image,
      requires_shipping: p.requires_shipping,
      status:           p.status,
      in_mops:          inMops,
      mops_enabled:     mappingHandles[p.handle] || false,
      source:           p.source,
      inventory_qty:    p.inventory_qty,
      barcode:          p.barcode,
      updated_at:       p.updated_at,
      unit:             mappingUnits[p.handle] || '',
      sold_qty:         soldQtyByHandle ? (soldQtyByHandle[p.handle] || 0) : 0,
      variant_title:    p.variant_title
    };
    return base;
  });

  if (params && params.status) {
    results = results.filter(function(p) { return p.status === params.status; });
  }

  var query = String(params && (params.q || params.search) || '').trim().toLowerCase();
  if (query) {
    results = results.filter(function(p) {
      return String(p.title || '').toLowerCase().indexOf(query) !== -1
        || String(p.sku || '').toLowerCase().indexOf(query) !== -1
        || String(p.barcode || '').toLowerCase().indexOf(query) !== -1
        || String(p.handle || '').toLowerCase().indexOf(query) !== -1
        || String(p.variant_title || '').toLowerCase().indexOf(query) !== -1;
    });
  }
  if (params && params.mapped !== undefined && String(params.mapped) !== '') {
    var mapped = String(params.mapped) === '1';
    results = results.filter(function(p) { return p.in_mops === mapped; });
  }
  if (params && params.stock) {
    results = results.filter(function(p) {
      if (p.source === 'LOCAL') return params.stock === 'all';
      var qty = Number(p.inventory_qty) || 0;
      if (params.stock === 'out_of_stock') return qty <= 0;
      if (params.stock === 'low_stock') return qty > 0 && qty < 5;
      if (params.stock === 'in_stock') return qty > 0;
      return true;
    });
  }
  if (params && params.category) {
    results = results.filter(function(p) { return p.product_type === String(params.category); });
  }

  var total = results.length;
  var page = parseInt(params && params.page, 10);
  var pageSize = parseInt(params && (params.page_size || params.pageSize), 10);
  var paged = page > 0 && pageSize > 0;
  if (paged) {
    pageSize = Math.min(Math.max(pageSize, 10), 100);
    results = results.slice((page - 1) * pageSize, page * pageSize);
  }

  return { products: results, total: total, page: paged ? page : 0, page_size: paged ? pageSize : 0, paged: paged };
}

// Zero-Wait Path — skinny DTO cho product row (2026-08-10). Reuse listProducts nhưng bật `compact`
// (bỏ image base64) + strip vài field ít dùng trên row. Trả ARRAY (không envelope) cho bulk_bootstrap.
// ============================================================
// Zero-Wait 2026-08-10 — Skinny Products Hash-Map Index (Task D)
// ============================================================
// Truy xuất giá/tồn/dòng theo variant_id trong O(1) — dùng ở createOrder / createManualOrder /
// updateOrder critical path để tránh N+1 quét full sheet (~2800 SP, 500-1000ms/lần).
//
// Payload skinny: {price, compare_at_price, cost_price, inventory_qty, deposit, source, row, product_id, handle}
// Không kèm title/image/vendor/barcode (bảo dưới 100 bytes/entry) — nếu cần thì gọi Repository.Products.findByHandle
// (đã TextFinder fast-path). Kèm `row` để write path setValue trực tiếp (không cần TextFinder lần 2).
//
// Cache theo _analyticsGen (mọi write bump gen → auto invalidate). Dùng _cachedArrayRead chunked để
// né 100KB/key khi số variant lớn (2500 variant ~200KB → 3 chunk). Trả về đối tượng plain (không Map)
// vì GAS V8 Map serialize kém với JSON.
function _getSkinnyProductIndex() {
  var arr = _cachedArrayRead('products_skinny_index', function() {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PRODUCTS);
    if (!sh || sh.getLastRow() < 2) return [];
    var numCols = Math.min(sh.getLastColumn(), 18);
    return sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues().map(function(r, i) {
      return {
        v: String(r[1] || ''),                    // variant_id (key)
        p: String(r[0] || ''),                    // product_id
        h: String(r[2] || ''),                    // handle
        pr: Number(r[7]) || 0,                    // price
        cp: Number(r[8]) || 0,                    // compare_at_price
        iq: Number(r[15]) || 0,                   // inventory_qty
        s: String(r[12] || ''),                   // status
        src: String(r[14] || ''),                 // source
        r: i + 2                                  // row (sheet)
      };
    });
  });
  // Build map after cache read (map itself không cache được — build lại từ mảng ~2ms cho 3000 items)
  var byVariant = {}, byHandle = {};
  for (var i = 0; i < arr.length; i++) {
    var e = arr[i];
    if (e.v) byVariant[e.v] = e;
    // Fallback tra theo handle (đơn cũ không có variant_id) — last-wins với active ưu tiên
    if (e.h) {
      if (!byHandle[e.h] || (byHandle[e.h].s !== 'active' && e.s === 'active')) byHandle[e.h] = e;
    }
  }
  return { byVariant: byVariant, byHandle: byHandle };
}

// API tiện dụng: tra 1 SP theo variant_id (fallback handle). Trả null nếu không tìm thấy.
// Callers: createOrder pricing validation, updateOrder qty check, inventory audit.
function _lookupSkinnyProduct(variantId, handle) {
  var idx = _getSkinnyProductIndex();
  if (variantId) {
    var byV = idx.byVariant[String(variantId).trim()];
    if (byV) return byV;
  }
  if (handle) {
    var byH = idx.byHandle[String(handle).trim()];
    if (byH) return byH;
  }
  return null;
}

function listProductsLite(params) {
  var p = Object.assign({}, params || {}, { compact: 1 });
  var r = listProducts(p).products || [];
  return r.map(function(x) {
    return {
      product_id: x.product_id, variant_id: x.variant_id, handle: x.handle,
      sku: x.sku, title: x.title, variant_title: x.variant_title,
      vendor: x.vendor, product_type: x.product_type,
      price: x.price, compare_at_price: x.compare_at_price,
      inventory_qty: x.inventory_qty, status: x.status,
      in_mops: x.in_mops, mops_enabled: x.mops_enabled, source: x.source,
      unit: x.unit
    };
  });
}

// Detail projection for the admin editor. Keep the list endpoint small while preserving the
// complete product contract at the point where the user actually opens one product.
function getProduct(params) {
  var productId = String(params && params.product_id || '').trim();
  var variantId = String(params && params.variant_id || '').trim();
  if (!productId && !variantId) throw new Error('product_id hoặc variant_id là bắt buộc');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.PRODUCTS);
  var row = variantId ? _findSheetRowExact(sh, 2, variantId) : -1;
  if (row === -1 && productId) row = _findSheetRowExact(sh, 1, productId);
  if (row === -1) throw new Error('Không tìm thấy sản phẩm');

  var p = Repository.Products._mapRow(sh.getRange(row, 1, 1, Math.min(sh.getLastColumn(), 18)).getValues()[0], row);
  if (productId && p.product_id !== productId) throw new Error('Không tìm thấy sản phẩm');

  var mappingSheet = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);
  var mappingRow = _findSheetRowExact(mappingSheet, 1, p.handle);
  var mapping = mappingRow === -1 ? null : mappingSheet.getRange(mappingRow, 1, 1, 11).getValues()[0];
  var result = {
    product_id: p.product_id, variant_id: p.variant_id, handle: p.handle, sku: p.sku,
    // 2026-08-10 OCC — FE gửi _version khi updateProduct để né race condition (2 người sửa giá/kho cùng lúc)
    _version: _readVersionAt(sh, row, OCC_COL.PRODUCTS),
    title: p.title, vendor: p.vendor, product_type: p.product_type, price: p.price,
    compare_at_price: p.compare_at_price, weight: p.weight, requires_shipping: p.requires_shipping,
    image: p.image, status: p.status, in_mops: !!mapping,
    mops_enabled: !!(mapping && (mapping[1] === true || String(mapping[1]).toLowerCase() === 'true')),
    updated_at: p.updated_at, source: p.source, inventory_qty: p.inventory_qty,
    barcode: p.barcode, unit: mapping ? String(mapping[10] || '') : '', variant_title: p.variant_title,
    detail_loaded: true
  };
  return result;
}

// ============================================================
// CREATE PRODUCT MAPPING (map 1 sản phẩm SAPO vào MOPS — "Kết nối")
//  Tạo dòng mặc định trong ProductMappings; admin tinh chỉnh
//  Capabilities/DepositAmount/SortOrder trực tiếp trong Sheet nếu cần.
// ============================================================

function createProductMapping(payload) {
  var handle = String(payload.handle || '').trim();
  if (!handle) throw new Error('handle là bắt buộc');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);
  if (!sh) throw new Error('Sheet ProductMappings không tồn tại');

  if (sh.getLastRow() > 1) {
    var existing = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i][0]).trim() === handle) throw new Error('Sản phẩm đã được map vào MOPS');
    }
  }

  var deposit = payload.deposit_amount === undefined || payload.deposit_amount === '' ? 0 : Number(payload.deposit_amount);
  if (isNaN(deposit) || !isFinite(deposit) || deposit < 0) throw new Error('Tiền cọc không hợp lệ');
  var displayName = _sanitizeText(payload.display_name || handle, 200);
  var costPrice   = Number(payload.cost_price) || 0;
  if (costPrice < 0) throw new Error('Giá vốn không hợp lệ');

  // Cột: Handle, Enabled, Capabilities, DepositAmount, SAPOSyncRequired, DisplayName, SortOrder,
  //      CostPrice, SafetyStockMin, SafetyStockMax
  sh.appendRow([handle, true, 'deposit', deposit, false, displayName, 999, costPrice, 0, 0]);

  logActivity(ss, 'PRODUCT', handle, 'MAPPING_CREATED', payload._callerUser || 'owner');
  _mappingsCacheBust();
  return { handle: handle };
}

// Gỡ khỏi MOPS ("Xóa sản phẩm" trên UI, review 2026-07-16) — hoàn tác của createProductMapping(),
// CHỈ xoá dòng ProductMappings (handle biến mất khỏi checkout/booking MOPS). KHÔNG đụng Products
// sheet — sản phẩm SAPO vẫn còn nguyên trên SAPO và trong danh sách Sản phẩm ở đây, chỉ hết
// "Trong MOPS". Cố tình không xoá cứng Products vì syncProducts() sẽ ghi đè lại Status mỗi lần
// đồng bộ (soft-delete kiểu status='deleted' sẽ tự "sống lại" nếu SP vẫn còn trên SAPO).
function deleteProductMapping(payload) {
  var handle = String(payload.handle || '').trim();
  if (!handle) throw new Error('handle là bắt buộc');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);
  if (!sh || sh.getLastRow() < 2) throw new Error('Sản phẩm chưa được map vào MOPS: ' + handle);

  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === handle) {
      sh.deleteRow(i + 2);
      logActivity(ss, 'PRODUCT', handle, 'MAPPING_DELETED', payload._callerUser || 'owner');
      _mappingsCacheBust();
      return { handle: handle };
    }
  }
  throw new Error('Sản phẩm chưa được map vào MOPS: ' + handle);
}

// ============================================================
// UPDATE PRODUCT (docs/mops.md §1, review 19 — "MOPS toàn quyền quản lý dữ liệu sản phẩm")
//  Cho phép sửa Title/Price/CompareAtPrice/InventoryQty cho MỌI sản phẩm — cả Source=SAPO lẫn
//  LOCAL. Giá bán (Price) vẫn bị syncProducts() ghi đè lại lần đồng bộ kế tiếp (chốt: "giá bán
//  vẫn cho ghi đè") — sửa ở đây chỉ có hiệu lực tới lần sync sau. CompareAtPrice/InventoryQty thì
//  syncProducts() đã né hẳn (xem hàm đó), nên sửa ở đây là vĩnh viễn tới khi tự sửa lại.
// ============================================================
function updateProduct(payload) {
  var productId = String(payload.product_id || '').trim();
  if (!productId) throw new Error('product_id là bắt buộc');
  // Đa-biến-thể (2026-07-17): các field sửa ở đây (CompareAtPrice/InventoryQty/Weight/Price) là CẤP
  // BIẾN THỂ → phải khớp đúng dòng (ProductID, VariantID), nếu chỉ khớp ProductID sẽ sửa nhầm biến
  // thể đầu. variantId rỗng (caller cũ / SP LOCAL single-variant) → khớp dòng đầu theo ProductID.
  var variantId = String(payload.variant_id || '').trim();
  var expectedVersion = payload._version; // 2026-08-10 OCC

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.PRODUCTS);
  if (!sh || sh.getLastRow() < 2) throw new Error('Không tìm thấy sản phẩm: ' + productId);

  // 2026-08-10 OCC lock — Products bị sửa concurrent nhất là InventoryQty (nhiều đơn tạo cùng lúc trừ
  // hàng) + Price (owner sửa giá). Lock serialize để OCC check-write nguyên tử.
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {

  var numCols = Math.min(sh.getLastColumn(), 18); // 18 = VariantTitle (R), cột mới nhất trên Products
  var row = variantId ? _findSheetRowExact(sh, 2, variantId) : -1;
  var handle = '';
  if (row !== -1) {
    var variantRow = sh.getRange(row, 1, 1, numCols).getValues()[0];
    if (String(variantRow[0]) !== productId) row = -1;
    else handle = String(variantRow[2] || '');
  }
  if (row === -1) {
    row = _findSheetRowExact(sh, 1, productId);
    if (row !== -1) handle = String(sh.getRange(row, 3).getValue() || '');
  }
  if (row === -1) throw new Error('Không tìm thấy sản phẩm: ' + productId);
  var _currentVersion = _readVersionAt(sh, row, OCC_COL.PRODUCTS);
  _checkOccVersion(expectedVersion, _currentVersion, 'Sản phẩm ' + productId);

  var productRow = sh.getRange(row, 1, 1, numCols).getValues()[0];

  if (payload.title !== undefined) {
    var title = _sanitizeText(payload.title, 200);
    if (!title) throw new Error('Tên sản phẩm không được để trống');
    productRow[4] = title;
  }
  if (payload.vendor !== undefined) {
    productRow[5] = _sanitizeText(payload.vendor, 100);
  }
  if (payload.product_type !== undefined) {
    productRow[6] = _sanitizeText(payload.product_type, 100);
  }
  if (payload.price !== undefined) {
    var price = Number(payload.price);
    if (isNaN(price) || !isFinite(price) || price < 0) throw new Error('Giá bán không hợp lệ');
    productRow[7] = price;
  }
  if (payload.compare_at_price !== undefined) {
    var comparePrice = Number(payload.compare_at_price);
    if (isNaN(comparePrice) || !isFinite(comparePrice) || comparePrice < 0) throw new Error('Giá gốc không hợp lệ');
    productRow[8] = comparePrice;
  }
  if (payload.weight !== undefined) {
    var weight = Number(payload.weight);
    if (isNaN(weight) || !isFinite(weight) || weight < 0) throw new Error('Khối lượng không hợp lệ');
    productRow[9] = weight;
  }
  if (payload.requires_shipping !== undefined) {
    productRow[10] = !!payload.requires_shipping;
  }
  if (payload.inventory_qty !== undefined) {
    var qty = Number(payload.inventory_qty);
    if (isNaN(qty) || !isFinite(qty)) throw new Error('Tồn kho không hợp lệ');
    productRow[15] = qty; // cho phép âm — cùng quy ước bán âm ở nơi khác
  }
  if (payload.barcode !== undefined) {
    productRow[16] = _sanitizeText(payload.barcode, 100);
  }
  productRow[13] = nowIso(); // UpdatedAt

  // Unit sống ở ProductMappings (khoá theo Handle), không phải Products — cố ý KHÔNG tự tạo mới 1
  // dòng ProductMappings chỉ để lưu Unit, vì ProductMappings.Enabled quyết định sản phẩm có bán được
  // qua MOPS hay không (xem mapping-optional checkout, mops-contract.md §2.1) — tạo ngầm ở đây có
  // thể vô tình đổi hành vi bán hàng của 1 sản phẩm SAPO chưa từng được "Kết nối". Chỉ sửa Unit khi
  // ĐÃ có dòng mapping sẵn (mọi sản phẩm LOCAL luôn có từ lúc tạo, xem createLocalProduct()).
  if (payload.unit !== undefined) {
    var mappingSheet = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);
    var mappingRow = _findSheetRowExact(mappingSheet, 1, handle);
    if (mappingRow === -1) {
      throw new Error('Sản phẩm chưa được "Kết nối" vào MOPS (ProductMappings) — chưa thể sửa Đơn vị tính');
    }
    mappingSheet.getRange(mappingRow, 11).setValue(_sanitizeText(payload.unit, 50));
  }

  sh.getRange(row, 1, 1, numCols).setValues([productRow]);

  logActivity(ss, 'PRODUCT', productId, 'PRODUCT_UPDATED', payload._callerUser || 'staff');
  _mappingsCacheBust();
  // 2026-08-10 OCC: bump _version + trả về để client cập nhật state ngay
  var _nextVer = (Number(_currentVersion) || 0) + 1;
  _writeVersionAt(sh, row, OCC_COL.PRODUCTS, _nextVer);
  return { product_id: productId, updated: true, _version: _nextVer };
  } finally { lock.releaseLock(); }
}

// ============================================================
// R2 (2026-08-21) · CASH POS 3-axis single endpoint saga
// ============================================================
// Trước đây FE chain 4 GAS call (create_order_admin → update PAID → update fulfillment=delivered
// → update COMPLETED). Nếu step giữa fail: đơn stuck PAID+delivered không COMPLETED, Receipt có
// thể đã post → sổ sách lệch, không có auto-rollback.
//
// Endpoint này gộp cả 4 mutation vào 1 execution: acquire LockService, apply forward step +
// đẩy undo callback vào stack. Fail giữa chừng → pop undoStack chạy compensating. Idempotency
// key (client sinh UUID) qua CacheService — retry an toàn trong 6h.
//
// Chỉ áp dụng cho CASH POS quầy — VietQR/COD vẫn qua chain cũ (có checkbox "Tạo vận đơn ngay",
// không cần chốt COMPLETED ở step tạo).
function createOrderPosComplete(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (String(payload.payment_method || '').toUpperCase() !== 'CASH') {
    throw new Error('create_order_pos_complete chỉ áp dụng cho CASH (POS quầy). Với VIETQR/COD dùng create_order_admin.');
  }
  if (payload.wants_shipping === true || payload.wantsShipping === true) {
    throw new Error('POS quầy không cần shipping (wants_shipping phải là false). Dùng create_order_admin cho luồng có giao hàng.');
  }

  var idempotencyKey = String(payload.idempotency_key || '').trim();
  if (!idempotencyKey) throw new Error('idempotency_key là bắt buộc — client sinh UUID cho mỗi lần bấm.');

  return _idempotent('POS_' + idempotencyKey, 21600, function() {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error('LOCK_TIMEOUT_POS_COMPLETE — hệ thống bận, thử lại');
    var undo = _newUndoStack();
    try {
      // Step 1 — Create order (CASH, wantsShipping=false). Tham số thứ 3 (skipInventoryLock=true,
      // KHÔNG phải field payload — review 2026-09-05 phát hiện field payload bị client tự set để
      // bypass khoá): lock ở trên (biến `lock`) đã serialize toàn bộ saga này, tự khoá thêm trong
      // createOrder() sẽ là waitLock() lồng nhau — xem comment ở createOrder (mops_02.js ~576).
      var createRes = createOrder(payload, null, true);
      var orderId = createRes.order_id;
      if (!orderId) throw new Error('createOrder không trả order_id');
      undo.push(function() {
        // Soft-cancel — không xoá row Orders vì để lại trail. Chỉ đặt Status=CANCELLED.
        try {
          var loc = _findOrderRow(ss, orderId);
          loc.sheet.getRange(loc.row, 8).setValue('CANCELLED'); // PaymentStatus
          loc.sheet.getRange(loc.row, FULFILLMENT_COL).setValue('cancelled');
          logActivity(ss, 'ORDER', orderId, 'POS_SAGA_ROLLBACK_STEP1', payload._staffActor || 'system');
        } catch (e) {}
      });

      // Step 2 — Payment PAID (tạo Receipt tự động qua autoCreateReceipt inside updateOrderStatus).
      var payRes = updateOrderStatus({
        order_id: orderId, status: 'PAID',
        _staffActor: payload._staffActor,
        _version: createRes._version
      });
      undo.push(function() {
        // Không rollback Receipt trực tiếp — nếu Receipt đã post, updateOrderStatus back to PENDING
        // sẽ trigger nhánh REFUNDED tự đảo. Best-effort — nếu fail cũng không rollback tiếp.
        try {
          updateOrderStatus({
            order_id: orderId, status: 'CANCELLED',
            _staffActor: payload._staffActor || 'system'
          });
          logActivity(ss, 'ORDER', orderId, 'POS_SAGA_ROLLBACK_STEP2', payload._staffActor || 'system');
        } catch (e) {}
      });

      // Step 3 — Fulfillment → delivered (giao ngay tại quầy).
      var fulRes = updateFulfillmentStatus({
        order_id: orderId, fulfillment_status: 'delivered',
        _staffActor: payload._staffActor,
        _version: payRes._version
      });
      // Không cần undo cho step này riêng — step 2 undo đã cover.

      // Step 4 — Order Status → COMPLETED (auto-completion đã có ở _maybeCompleteOrder, nhưng
      // gọi explicit để chắc chắn state cuối = COMPLETED).
      // _maybeCompleteOrder chạy inside _setFulfillmentStatus → order có thể đã COMPLETED rồi.
      // Verify + fill if not.
      var loc = _findOrderRow(ss, orderId);
      var curStatus = String(loc.sheet.getRange(loc.row, 8).getValue() || '').toUpperCase();
      if (curStatus !== 'COMPLETED') {
        // _maybeCompleteOrder chỉ chạy khi PAID + delivered; nếu chưa completed → có gì đó không đúng.
        // Throw để trigger rollback thay vì silent skip.
        throw new Error('POS_INCOMPLETE_STATE — order ' + orderId + ' expected COMPLETED but got ' + curStatus);
      }

      SpreadsheetApp.flush();
      logActivity(ss, 'ORDER', orderId, 'POS_SAGA_COMPLETE', payload._staffActor || 'staff');
      return {
        success: true,
        order_id: orderId,
        status: 'COMPLETED',
        fulfillment_status: 'delivered',
        payment_status: 'PAID',
        chain: 'complete',
        _version: fulRes._version
      };
    } catch (err) {
      undo.rollback();
      SpreadsheetApp.flush();
      try { logActivity(ss, 'ORDER', payload.order_id || '', 'POS_SAGA_ROLLED_BACK', 'system — ' + err.message); } catch(_){}
      throw new Error('POS_CHAIN_ROLLED_BACK: ' + err.message);
    } finally {
      lock.releaseLock();
    }
  });
}
