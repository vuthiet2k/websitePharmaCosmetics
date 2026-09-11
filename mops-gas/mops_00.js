// ============================================================
// MOPS V2 — Google Apps Script Backend
// Checkout + Payment + Financial Management + Notifications
//
// DEPLOY: Triển khai > Triển khai mới > Web app
//         Execute as: Me (tôi)
//         Who has access: Anyone (bất kỳ ai)
//
// SECURITY: bank account info lives in the Settings sheet. SAPO_API_KEY,
//           SAPO_SECRET, TELEGRAM_TOKEN live in Script Properties (see
//           SECRET_KEYS) — NOT in the Sheet, NOT in Sapo settings.
// ============================================================

var SHEET = {
  SETTINGS:         'Settings',
  PRODUCT_MAPPINGS: 'ProductMappings',
  PRODUCTS:         'Products',
  CUSTOMERS:        'Customers',
  ORDERS:           'Orders',
  ORDER_ITEMS:      'OrderItems',
  SHIPPING:         'ShippingAddresses',
  PAYMENTS:         'Payments',
  SYNC_LOGS:        'SyncLogs',
  ACTIVITY_LOGS:    'ActivityLogs',
  NOTIFICATIONS:    'Notifications',
  STAFFS:           'Staffs',
  PERMISSIONS:      'Permissions',
  STAFF_PERMISSIONS: 'StaffPermissions', // Quyền theo từng người (docs/mops.md §11, review 16)
  CASH_TRANSACTIONS: 'CashTransactions', // V2.4 Thu Chi — legacy phẳng, giữ chạy song song trong lúc migrate sang Finance Core (xem docs/implementation/phase-01-finance-core.md)
  COUPONS:          'Coupons',

  // ── Finance Core (Phase 01 Bước 1) — xem docs/architecture/finance.md ──
  CASH_ACCOUNTS:      'CashAccounts',
  RECEIPTS:           'Receipts',
  RECEIPT_LINES:      'ReceiptLines',
  LEDGER_ENTRIES:     'LedgerEntries',
  INCOME_CATEGORIES:  'IncomeCategories',
  EXPENSE_CATEGORIES: 'ExpenseCategories',
  AUDIT_TRAIL:        'AuditTrail',

  // ── Finance Core (Phase 01 Bước 2) — Payment Voucher (Phiếu Chi) ──
  PAYMENT_VOUCHERS:      'PaymentVouchers',
  PAYMENT_VOUCHER_LINES: 'PaymentVoucherLines',

  // ── Finance Core (Phase 01 Bước 3) — Transfer + Cash Adjustment ──
  TRANSFERS:         'Transfers',
  CASH_ADJUSTMENTS:  'CashAdjustments',

  // ── Inventory (Phase 02 Bước 1) — Master Data, xem docs/architecture/inventory.md ──
  SUPPLIERS:         'Suppliers',
  PARTIES:           'Parties',

  // ── Branches (đóng gap §19/§20 mops.md, review 31) ──
  BRANCHES:          'Branches',

  // ── Bank Accounts (nhiều TK nhận VietQR, mặc định theo chi nhánh — 2026-07-21) ──
  BANK_ACCOUNTS:     'BankAccounts',

  // ── Inventory (Phase 02 Bước 2) — Purchase + Movement ──
  PURCHASE_ORDERS:      'PurchaseOrders',
  PURCHASE_ITEMS:       'PurchaseItems',
  INVENTORY_MOVEMENTS:  'InventoryMovements',

  // ── AP (Phase 04 Bước 3) — xem docs/architecture/finance.md §4.3 ──
  BILLS:             'Bills',

  // ── Returns & Refunds (docs/mops.md §13) ──
  ORDER_RETURNS:       'OrderReturns',
  ORDER_RETURN_ITEMS:  'OrderReturnItems',

  // ── Counter Discount Governance (docs/mops.md §16) ──
  DISCOUNT_LIMITS:     'DiscountLimits',

  // ── Shipping / Vận chuyển (Phase C, 2026-07-17 — xem docs/architecture/shipping.md) ──
  SHIPPING_CARRIERS:      'ShippingCarriers',    // registry đa đối tác (GHN chỉ là 1 đầu mối)
  RECONCILIATIONS:        'Reconciliations',      // phiếu đối soát COD/phí (Header)
  RECONCILIATION_ITEMS:   'ReconciliationItems',  // dòng vận đơn trong phiếu đối soát
  // Timeline vận đơn (2026-08-13, cho tab "Quản lý vận đơn"). Mỗi webhook Goship/lần
  // check_shipping_status/lần tạo/hủy shipment → ghi 1 dòng. Trước đây chỉ có
  // Orders.LastTrackedAt (snapshot); giờ có full timeline giống Sapo.
  SHIPMENT_STATUS_HISTORY: 'ShipmentStatusHistory',

  // ── REOPEN 2026-09-10 (ADR-007/T-81/T-83) — B2B Distribution + Booking slot-locking.
  // Lazy auto-create (mirror SHIPMENT_STATUS_HISTORY, KHÔNG đăng ký vào setupSheet() cũ — theo
  // đúng convention sheet mới nhất trong repo, xem _ensureShipmentHistorySheet mops_01.js). ──
  B2B_APPLICATIONS: 'B2BApplications', // MOD-04 xlsx — MST/chữ ký số BLOCKED_EXTERNAL, duyệt thủ công
  BOOKING_SLOTS:    'BookingSlots'      // capacity check cho createOrder(p,'booking')
};

// ============================================================
// ROUTER
// ============================================================

// WRITE_ROUTES — bảng phân luồng action GHI (phase-07 Giai đoạn 2, BS-3).
// Mỗi entry: { perm?, owner?, attach?, fn }. _dispatchWrite tự checkPermission/requireOwner
// rồi gắn actor field ĐÚNG như switch cũ. Handler tham chiếu ở đây an toàn nhờ function hoisting.
// KHÔNG có chiều 'lock' — switch cũ KHÔNG khóa ở tầng doPost (lock nằm trong handler) → giữ y hệt.
// attach hợp lệ: '_staffActor' | '_callerUser' (đều = name||username) · '_staffRole' | '_staffId'.
var WRITE_ROUTES = {
  // Staff Auth (không quyền)
  'staff_login':  { fn: staffLogin },
  'staff_logout': { fn: staffLogout },

  // V2 primary
  'create_order':   { fn: function(p) { return createOrder(p, null); } },
  'report_payment': { fn: reportPayment },
  'get_order':      { fn: function(p) { return getOrder(p.order_id, p.phone, p.token); } },

  'update_order_status':      { perm: 'orders.edit', attach: ['_staffActor'], fn: updateOrderStatus },
  // update_order cần _staffRole để check hạn mức chiết khấu (giống create_order_admin)
  'update_order':             { perm: 'orders.edit', attach: ['_staffActor', '_staffId', '_staffRole'], fn: updateOrder },
  'update_order_shipping':    { perm: 'orders.edit', attach: ['_staffActor'], fn: updateOrderShippingOnly },   // V6.4: partial update chỉ địa chỉ giao
  'approve_order':            { perm: 'orders.edit', attach: ['_staffActor'], fn: approveOrder },
  'update_fulfillment_status':{ perm: 'orders.edit', attach: ['_staffActor'], fn: updateFulfillmentStatus },

  // Vận đơn (Phase C — carrier-agnostic). calc_shipping_fee POST nhưng không gắn actor.
  'calc_shipping_fee': { perm: 'orders.edit', fn: shipmentCalcFee },
  'create_shipment':   { perm: 'orders.edit', attach: ['_staffActor'], fn: shipmentCreate },
  'cancel_shipment':   { perm: 'orders.edit', attach: ['_staffActor'], fn: shipmentCancel },
  'refresh_tracking':  { perm: 'orders.edit', attach: ['_staffActor'], fn: shipmentRefresh },
  // 2026-08-27 — ghi nhật ký "giục giao" nội bộ (KHÔNG có API hãng thật để giục), xem shipmentUrge.
  'urge_shipment':     { perm: 'orders.edit', attach: ['_staffActor'], fn: shipmentUrge },

  // Registry đối tác + đối soát
  'upsert_carrier':             { perm: 'orders.edit', fn: upsertCarrier },
  'toggle_carrier':             { perm: 'orders.edit', fn: toggleCarrier },
  'create_reconciliation':      { perm: 'orders.edit', attach: ['_staffActor'], fn: createReconciliation },
  'update_reconciliation_item': { perm: 'orders.edit', attach: ['_staffActor'], fn: updateReconciliationItem },
  'confirm_reconciliation':     { perm: 'orders.edit', attach: ['_staffActor'], fn: confirmReconciliation },
  'pay_reconciliation':         { perm: 'finance.post', attach: ['_staffActor'], fn: payReconciliation },

  // Products
  'sync_products':          { perm: 'products.sync', fn: syncProducts },
  'create_product_mapping': { perm: 'products.sync', fn: createProductMapping },
  'delete_product_mapping': { perm: 'products.sync', attach: ['_callerUser'], fn: deleteProductMapping },
  'create_local_product':   { perm: 'products.create', attach: ['_callerUser'], fn: createLocalProduct },
  'import_products':        { perm: 'products.create', attach: ['_callerUser'], fn: importProducts },
  'update_product':         { perm: 'products.edit', attach: ['_callerUser'], fn: updateProduct },

  'create_customer': { perm: 'customers.edit', attach: ['_staffActor'], fn: createCustomer },
  'update_customer': { perm: 'customers.edit', attach: ['_callerUser'], fn: updateCustomer },
  // 2026-08-16: soft delete + restore. deleteCustomer set Status='deleted' (không xoá dòng Sheet),
  // listCustomers mặc định ẩn khách deleted. Đơn cũ vẫn tra được customer_id. Xem docs #tab-customers.
  'delete_customer':  { perm: 'customers.edit', attach: ['_staffActor'], fn: deleteCustomer },
  'restore_customer': { perm: 'customers.edit', attach: ['_staffActor'], fn: restoreCustomer },
  'save_customer_address': { perm: 'customers.edit', attach: ['_callerUser'], fn: saveCustomerAddress },
  'set_customer_default_address': { perm: 'customers.edit', attach: ['_callerUser'], fn: setCustomerDefaultAddress },
  // 2026-08-16: sửa nội dung + soft delete cho từng địa chỉ trong sổ khách.
  'update_customer_address': { perm: 'customers.edit', attach: ['_callerUser'], fn: updateCustomerAddress },
  'delete_customer_address': { perm: 'customers.edit', attach: ['_staffActor'], fn: deleteCustomerAddress },
  // Nhập khách hàng từ file Excel/CSV (tab Khách hàng). `dry_run` trong payload = xem trước, KHÔNG ghi.
  // Xuất đi qua _handleRead export_customers (chỉ đọc, gate customers.view).
  'import_customers': { perm: 'customers.edit', attach: ['_staffActor'], fn: importCustomers },

  // create_order_admin: cần _staffRole để đối chiếu DiscountLimits (§16)
  'create_order_admin': { perm: 'orders.create', attach: ['_staffActor', '_staffRole'], fn: function(p) { return createOrder(p, null); } },
  // R2 (2026-08-21) · POS quầy 3-axis single-endpoint. Gộp create+PAID+delivered+COMPLETED
  // vào 1 GAS execution, undo stack rollback nếu step giữa fail. Xem createOrderPosComplete.
  'create_order_pos_complete': { perm: 'orders.create', attach: ['_staffActor', '_staffRole'], fn: createOrderPosComplete },

  'push_order_to_sapo':   { perm: 'orders.sapo_push', attach: ['_staffActor'], fn: pushOrderToSapo },
  'pull_orders_from_sapo':{ perm: 'orders.sapo_pull', attach: ['_callerUser'], fn: pullOrdersFromSapo },

  // Staff quản trị (không gắn actor)
  'create_staff':          { perm: 'staff.manage', fn: createStaff },
  'toggle_staff_active':   { perm: 'staff.manage', fn: toggleStaffActive },
  'reset_staff_password':  { perm: 'staff.manage', fn: resetStaffPassword },
  'update_staff':          { perm: 'staff.manage', fn: updateStaff },
  'set_staff_permissions': { perm: 'staff.manage', fn: setStaffPermissions },
  // Tự sửa profile mình — chỉ cần token hợp lệ, KHÔNG cần staff.manage
  'update_my_profile':     { fn: updateMyProfile },

  // OWNER only (siết hơn finance.admin) — _callerUser có fallback 'owner'
  'update_settings':            { owner: true, attach: ['_callerUser'], fn: updateSettings },
  // GHTK: đổi Email/Password thành Token tự động rồi ghi Script Properties. OWNER-only vì đụng SECRET_KEYS.
  'ghtk_connect_by_login':      { owner: true, attach: ['_callerUser'], fn: ghtkConnectByLogin },
  // Đọc kho lấy hàng đã có trên tài khoản GHTK; có thể lưu kho đầu tiên làm mặc định.
  'ghtk_sync_pick_addresses':   { owner: true, attach: ['_callerUser'], fn: ghtkSyncPickAddresses },
  'migrate_v1_to_finance_core': { owner: true, attach: ['_callerUser'], fn: migrateV1ToFinanceCore },
  // phase-07 Lớp 5 — drain queue Telegram thủ công (ngoài trigger 1'): flush ngay sau khi sửa token,
  // hoặc retry hàng loạt job RETRY tới hạn. Owner-only, không tham số.
  'process_queue':              { owner: true, fn: function() { processBackgroundQueue(); return { drained: true }; } },

  'create_coupon':        { perm: 'coupons.manage', attach: ['_callerUser'], fn: createCoupon },
  'toggle_coupon_active': { perm: 'coupons.manage', attach: ['_callerUser'], fn: toggleCouponActive },

  'create_cash_transaction': { perm: 'expenses.manage', attach: ['_callerUser'], fn: createCashTransaction },
  'void_cash_transaction':   { perm: 'expenses.manage', attach: ['_callerUser'], fn: voidCashTransaction },

  // Finance Core Bước 1
  'create_receipt':      { perm: 'finance.create', attach: ['_callerUser'], fn: createReceipt },
  'post_receipt':        { perm: 'finance.post',   attach: ['_callerUser'], fn: postReceipt },
  'cancel_receipt':      { perm: 'finance.cancel', attach: ['_callerUser'], fn: cancelReceipt },
  'create_cash_account': { perm: 'finance.admin',  attach: ['_callerUser'], fn: createCashAccount },
  'create_category':     { perm: 'finance.admin',  attach: ['_callerUser'], fn: createCategory },

  // Finance Core Bước 2 — Payment Voucher
  'create_payment_voucher':  { perm: 'finance.create',  attach: ['_callerUser'], fn: createPaymentVoucher },
  'submit_payment_voucher':  { perm: 'finance.create',  attach: ['_callerUser'], fn: submitPaymentVoucher },
  'approve_payment_voucher': { perm: 'finance.approve', attach: ['_callerUser'], fn: approvePaymentVoucher },
  'post_payment_voucher':    { perm: 'finance.post',    attach: ['_callerUser'], fn: postPaymentVoucher },
  'cancel_payment_voucher':  { perm: 'finance.cancel',  attach: ['_callerUser'], fn: cancelPaymentVoucher },

  // Finance Core Bước 3 — Transfer
  'create_transfer': { perm: 'finance.create', attach: ['_callerUser'], fn: createTransfer },
  'post_transfer':   { perm: 'finance.post',   attach: ['_callerUser'], fn: postTransfer },
  'cancel_transfer': { perm: 'finance.cancel', attach: ['_callerUser'], fn: cancelTransfer },

  // Finance Core Bước 3 — Cash Adjustment
  'create_cash_adjustment':  { perm: 'finance.create',  attach: ['_callerUser'], fn: createCashAdjustment },
  'submit_cash_adjustment':  { perm: 'finance.create',  attach: ['_callerUser'], fn: submitCashAdjustment },
  'approve_cash_adjustment': { perm: 'finance.approve', attach: ['_callerUser'], fn: approveCashAdjustment },
  'post_cash_adjustment':    { perm: 'finance.post',    attach: ['_callerUser'], fn: postCashAdjustment },
  'cancel_cash_adjustment':  { perm: 'finance.cancel',  attach: ['_callerUser'], fn: cancelCashAdjustment },

  // Chi nhánh
  'create_branch': { perm: 'branches.manage', attach: ['_callerUser'], fn: createBranch },
  'update_branch': { perm: 'branches.manage', attach: ['_callerUser'], fn: updateBranch },

  // Tài khoản ngân hàng VietQR (cùng quyền branches.manage, không gắn actor) — gọi Repository inline
  'create_bank_account':      { perm: 'branches.manage', fn: function(p) { return { bank_account_id: Repository.BankAccounts.create(p) }; } },
  'update_bank_account':      { perm: 'branches.manage', fn: function(p) { return { bank_account_id: Repository.BankAccounts.update(p.bank_account_id, p) }; } },
  'set_default_bank_account': { perm: 'branches.manage', fn: function(p) { return { bank_account_id: Repository.BankAccounts.setDefault(p.bank_account_id) }; } },

  // Inventory — Suppliers
  'create_supplier': { perm: 'inventory.manage', attach: ['_callerUser'], fn: createSupplier },
  'update_supplier': { perm: 'inventory.manage', attach: ['_callerUser'], fn: updateSupplier },
  'delete_supplier': { perm: 'inventory.manage', attach: ['_callerUser'], fn: deleteSupplier },

  // Inventory — Purchase Orders
  'create_purchase_order': { perm: 'inventory.manage', attach: ['_callerUser'], fn: createPurchaseOrder },
  'update_purchase_order': { perm: 'inventory.manage', attach: ['_callerUser'], fn: updatePurchaseOrder },
  'post_purchase_order':   { perm: 'inventory.manage', attach: ['_callerUser'], fn: postPurchaseOrder },
  'cancel_purchase_order': { perm: 'inventory.manage', attach: ['_callerUser'], fn: cancelPurchaseOrder },

  // V1 backward compat aliases (không quyền)
  'create_booking': { fn: function(p) { return createOrder(p, 'booking'); } },
  'get_service':    { fn: function(p) { return getMapping(p.svc_id || p.handle); } },
  'list_services':  { fn: function() { return listMappings(); } },

  // REOPEN 2026-09-10 (ADR-007/T-81) — B2B Distribution onboarding. Public write (không quyền,
  // giống create_booking) — khách/đại lý tự đăng ký. Duyệt/từ chối YÊU CẦU quyền orders.edit
  // (tái dùng permission đã có, không tạo permission string mới cho 1 tính năng nhỏ).
  'create_b2b_application': { fn: createB2BApplication },
  'approve_b2b_application': { perm: 'orders.edit', attach: ['_staffActor'], fn: approveB2BApplication },
  'reject_b2b_application':  { perm: 'orders.edit', attach: ['_staffActor'], fn: rejectB2BApplication }
};

// _dispatchWrite: chạy đúng logic từng case switch cũ. Trả null nếu action không phải write
// (để doPost trả Unknown). Gắn actor field CHÍNH XÁC như bản gốc (_callerUser owner có fallback 'owner').
function _dispatchWrite(action, payload) {
  var r = WRITE_ROUTES[action];
  if (!r) return null;
  var s = null;
  if (r.owner)     s = requireOwner(payload.token);
  else if (r.perm) s = checkPermission(payload.token, r.perm);
  // Zero-Wait 2026-08-10: rate guard backstop (Vercel Edge đã lọc trước, đây phòng khi bypass).
  // s là hồ sơ staff nếu route yêu cầu quyền — dùng staff_id làm bucket. Với route không quyền
  // (staff_login/create_booking...) dùng token (rỗng khi login mới → cho phép 60 req/60s toàn cục).
  var _rlKey = (s && s.staff_id) ? String(s.staff_id) : (payload.token || 'anon');
  _rateGuard(_rlKey, 'write');
  if (s && r.attach) {
    for (var i = 0; i < r.attach.length; i++) {
      var k = r.attach[i];
      if (k === '_staffRole')       payload._staffRole = s.role;
      else if (k === '_staffId')    payload._staffId   = s.staff_id;
      else if (k === '_callerUser') { var u = s.name || s.username; payload._callerUser = r.owner ? (u || 'owner') : u; }
      else                          payload._staffActor = s.name || s.username; // '_staffActor'
    }
  }
  var out = r.fn(payload);
  _bumpAnalyticsGen(); // phase-07 BS-5: write thành công → invalidate analytics cache (không phục vụ số cũ)
  return _ok(out);
}

function doPost(e) {
  _resetReqCache(); // phase-07 BS-9: cache sạch mỗi request
  _REQ_START_MS = new Date().getTime(); // Zero-Wait 2026-08-10: đo latency toàn request
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;

    // Webhook GHN (phase vận chuyển 2026-07-17) — GHN push callback KHÔNG có field `action`, nhận diện
    // qua OrderCode. Xử lý trước maintenance/action guard để không bị chặn. Trả success để GHN không retry.
    if (!action && (payload.OrderCode || payload.order_code)) {
      return _ok(handleGhnWebhook(payload, (e && e.parameter) || {}));
    }

    // Webhook Goship (aggregator, 2026-07-27) — payload {gcode, code, status, status_text, ...}, KHÔNG có
    // `action`. Nhận diện qua `gcode`. GAS không đọc được header nên KHÔNG verify HMAC được → thay bằng
    // KHOÁ TRONG URL (`?wh=…`, lấy từ e.parameter) + mã phải khớp đơn + chỉ tin `status` + chống webhook
    // đến sai thứ tự. Phải trả HTTP 200 nếu không Goship retry sau 3' rồi bỏ sau 3 lần.
    if (!action && payload.gcode) {
      return _ok(handleGoshipWebhook(payload, (e && e.parameter) || {}));
    }

    var maint = _checkMaintenance();
    if (maint) return maint;

    if (!action) return _err('action is required');

    // BẢO MẬT (2026-07-22): lệnh ĐỌC đi qua POST (token trong body). Xử lý read trước; nếu không phải
    // read → rơi xuống switch ghi bên dưới. (get_order/list_services vẫn còn case ghi phía dưới nhưng
    // _handleRead bắt trước — cùng kết quả; giữ lại để không phải sửa thêm.)
    var _readOut = _handleRead(action, payload, true);
    if (_readOut !== null) return _readOut;

    // Ghi (write) — phân luồng qua WRITE_ROUTES (phase-07 BS-3). _dispatchWrite tự
    // checkPermission/requireOwner + gắn actor; trả null nếu action không phải write.
    var _writeOut = _dispatchWrite(action, payload);
    if (_writeOut !== null) return _writeOut;

    return _err('Unknown action: ' + action);
  } catch (ex) {
    return _err(ex.message || String(ex));
  }
}

function doGet(e) {
  _resetReqCache(); // phase-07 BS-9: cache sạch mỗi request
  _REQ_START_MS = new Date().getTime(); // Zero-Wait 2026-08-10: đo latency toàn request
  try {
    var params = e.parameter || {};
    var action = params.action;

    // health bypasses maintenance gate — must stay first
    if (action === 'health') return _healthCheck();

    var maint = _checkMaintenance();
    if (maint) return maint;

    if (!action) return _err('action is required');

    // BẢO MẬT (2026-07-22): GET chỉ phục vụ action CÔNG KHAI (checkout/tra cứu — không mang token).
    // Read cần token đã chuyển sang POST (token trong body) → token KHÔNG lộ qua query string / lịch sử
    // trình duyệt / Referer / URL redirect googleusercontent (trước đây replay được tới 6h).
    var _out = _handleRead(action, params, false);
    if (_out !== null) return _out;
    return _err('Hành động "' + action + '" phải gọi bằng POST (không được mang token qua URL).');
  } catch (ex) {
    return _err(ex.message || String(ex));
  }
}

// ============================================================
// READ DISPATCH — dùng chung cho doGet (chỉ PUBLIC) và doPost (PUBLIC + AUTHED).
// Trả về ContentService output, hoặc null nếu `action` không phải một lệnh đọc.
// allowAuthed=false (GET): chỉ chạy action trong _PUBLIC_READS — chặn mọi read cần token,
//   đảm bảo token không bao giờ đi qua query string.
// allowAuthed=true (POST): chạy cả public + authed (token nằm trong body, an toàn).
// Không cần try/catch riêng: luôn được gọi bên trong try/catch của doGet/doPost.
// ============================================================
function _handleRead(action, params, allowAuthed) {
    var _PUBLIC_READS = {
      get_order: 1, get_orders_by_contact: 1, get_order_by_tracking: 1, list_products: 1,
      list_mappings: 1, validate_mapping: 1, preview_coupon: 1, list_services: 1,
      // Zero-Wait 2026-08-10: get_cache_gen phải PUBLIC (không token) để Edge Function cache
      // gen-check hoạt động ngay cả khi FE chưa đăng nhập / token hết hạn — payload cực nhỏ.
      get_cache_gen: 1
    };
    if (!allowAuthed && !_PUBLIC_READS[action]) return null;

    // Zero-Wait 2026-08-10: get_cache_gen fast-path — trả _analyticsGen ngay, KHÔNG rate guard
    // (chính là endpoint dùng để FE polling 30s; guard sẽ tự chặn client nhanh nhất). Đọc RAM (~5ms),
    // không đụng sheet. Envelope tự chèn _gen qua _ok.
    if (action === 'get_cache_gen') return _ok({ ok: true });

    // Zero-Wait 2026-08-10: rate guard read backstop. Token trong body (POST) hoặc query (GET public).
    // Bucket bằng staff_id nếu token hợp lệ, else token/anon. Không guard get_cache_gen (đã return
    // sớm ở trên) và không guard public reads khi không có token — GET public dùng ngưỡng nới lỏng
    // bằng cách map key='anon' → 300/60s cho toàn tenant, đủ chống spam checkout.
    if (allowAuthed) {
      var _staff = null;
      try { if (params.token) _staff = requireStaffToken(params.token); } catch (e) {}
      var _rlKeyR = (_staff && _staff.staff_id) ? String(_staff.staff_id) : (params.token || 'anon');
      _rateGuard(_rlKeyR, 'read');
    }

    switch (action) {
      case 'staff_me':              return _ok(staffMe(params));
      case 'bulk_bootstrap':        return _ok(bulkBootstrap(params));
      // BUG FIX 2026-07-28: case 'get_order' TRƯỚC ĐÂY không có body, fall-through sang case 'ship_rates'
      // và gọi goshipRates(payload) thay vì getOrder — mọi request get_order (mở chi tiết đơn) đều bị GAS
      // trả lỗi "Chưa cấu hình Goship" hoặc payload sai, FE nhận success:false → hiện "Không tải được chi
      // tiết đơn". Trường hợp Goship có config, goshipRates chạy với payload thiếu rate params → cũng
      // throw. Đây là bug pre-existing từ 2026-07-27 khi thêm Goship dispatch (chèn nhầm giữa 2 case).
      case 'get_order':
        if (params.token) { checkPermission(params.token, 'orders.view'); }
        return _ok(getOrder(params.order_id, params.phone, params.token));
      // 2026-08-23 bulk fetch cho In đơn hàng hàng loạt (Mục 3 tab_orders). Graceful: 1 đơn lỗi không hủy
      // batch, trả riêng errors[]. Gate orders.view (cùng get_order). Batch tối đa 50 (guard trong hàm).
      case 'get_orders_batch':
        checkPermission(params.token, 'orders.view');
        return _ok(getOrdersBatch(params));
      // Goship aggregator (2026-07-27): chào giá ĐA HÃNG để nhân viên so sánh trước khi chọn. Tách khỏi
      // calc_shipping_fee vì trả về danh sách (n hãng × phí × ETA × % giao thành công), không phải 1 số.
      case 'ship_rates':
        checkPermission(params.token, 'orders.edit');
        return _ok(goshipRates(params));
      // Đối soát COD qua Goship — thay việc gõ tay file Excel từng hãng (shipping.md §4).
      case 'goship_invoices':
        checkPermission(params.token, 'orders.edit');
        return _ok(goshipInvoices(params));
      case 'goship_invoice_shipments':
        checkPermission(params.token, 'orders.edit');
        return _ok(goshipInvoiceShipments(params));
      case 'import_carrier_invoice':
        var _sgi = checkPermission(params.token, 'orders.edit');
        params._staffActor = _sgi.name || _sgi.username;
        return _ok(goshipImportInvoice(params));
      case 'get_orders_by_contact': return _ok(getOrdersByContact(params.phone)); // public
      case 'get_order_by_tracking': return _ok(getOrderByTracking(params.tracking_code, params.phone)); // public (2026-08-15)
      case 'get_customer':
        checkPermission(params.token, 'customers.view');
        return _ok(getCustomer(params.phone, params.customer_id));
      case 'list_customers':
        checkPermission(params.token, 'customers.view');
        return _ok(listCustomers(params));
      // 2026-08-23 tra nhanh KH theo SĐT (form Tạo đơn cảnh báo dupe). Trả tóm tắt tối thiểu — gate
      // customers.view để chặn enum SĐT khách qua public. FE debounce 400ms trước khi gọi.
      case 'check_customer_phone':
        checkPermission(params.token, 'customers.view');
        return _ok(checkCustomerPhone(params));
      // Xuất toàn bộ khách hàng (đủ field, round-trip được với file nhập). Chỉ đọc → gate customers.view.
      case 'export_customers':
        checkPermission(params.token, 'customers.view');
        return _ok(exportCustomers(params));
      // REOPEN 2026-09-10 (ADR-007/T-81) — B2B application list, tái dùng permission orders.edit
      // (không tạo permission string mới cho 1 tính năng thấp lưu lượng).
      case 'list_b2b_applications':
        checkPermission(params.token, 'orders.edit');
        return _ok(listB2BApplications(params));
      case 'list_products':  return _ok(listProducts(params));   // public (checkout widget)
      case 'get_product':
        // Product admin currently grants products.edit for the detail/editor surface;
        // reuse that existing permission instead of silently creating a new RBAC role.
        checkPermission(params.token, 'products.edit');
        return _ok(getProduct(params));
      case 'list_mappings':  return _ok(listMappings());          // public (checkout widget)

      // Master-data địa giới ĐTVC (Phase C — carrier-agnostic; mặc định GHN) cho picker địa chỉ giao.
      case 'ship_provinces':
        checkPermission(params.token, 'orders.edit');
        return _ok(shipMasterData('provinces', params));
      case 'ship_districts':
        checkPermission(params.token, 'orders.edit');
        return _ok(shipMasterData('districts', params));
      case 'ship_wards':
        checkPermission(params.token, 'orders.edit');
        return _ok(shipMasterData('wards', params));
      // Registry ĐTVC + đối soát + báo cáo vận chuyển (Phase C)
      case 'list_carriers':
        checkPermission(params.token, 'orders.edit');
        return _ok(listCarriers());
      // In tem A6 (100×150mm) — cache label_url Goship từ Orders.AP (LABEL_URL_COL=42), fallback
      // re-fetch qua /shipments/search khi cache trống (vận đơn tạo trước 2026-08-11).
      case 'get_shipment_label':
        checkPermission(params.token, 'orders.view');
        return _ok(getShipmentLabel(params));
      case 'ghtk_pick_addresses':
        checkPermission(params.token, 'orders.edit');
        return _ok(ghtkListPickAddresses());
      case 'list_reconciliations':
        checkPermission(params.token, 'orders.edit');
        return _ok(listReconciliations(params));
      case 'get_reconciliation':
        checkPermission(params.token, 'orders.edit');
        return _ok(getReconciliation(params.recon_id));
      // Quản lý vận đơn (2026-08-13) — list mọi đơn có TrackingCode + detail Sapo-style + timeline.
      // orders.view thay vì orders.edit: đây là màn hình XEM (refresh status không đổi tiền/nội dung).
      case 'list_shipments':
        checkPermission(params.token, 'orders.view');
        return _ok(listShipments(params));
      case 'get_shipment':
        checkPermission(params.token, 'orders.view');
        return _ok(getShipment(params));
      case 'get_shipping_report':
        var _shr = checkPermission(params.token, 'reports.view');
        return _ok(getShippingReport(params));
      // Xuất đơn hàng theo bộ lọc (from/to/status/fulfillment_status/branch_id) → CSV báo cáo.
      // Chỉ đọc → gate orders.view, cùng quyền list_transactions.
      case 'export_orders':
        checkPermission(params.token, 'orders.view');
        return _ok(exportOrders(params));

      case 'list_transactions':
        checkPermission(params.token, 'payments.view');
        return _ok(listTransactions(params));
      // Zero-Wait Path (2026-08-10): đóng gap từ 2026-07-11 — Ledger + Audit đọc được từ FE
      case 'list_ledger_entries':
        checkPermission(params.token, 'reports.finance.view');
        return _ok(listLedgerEntries(params));
      case 'list_audit_trail':
        checkPermission(params.token, 'audit.view');
        return _ok(listAuditTrail(params));
      case 'get_analytics':
        var _s9 = checkPermission(params.token, 'reports.view');
        params._includeFinance = _canViewFinance(_s9.role);
        return _ok(getAnalytics(params));

      // ── Site Báo cáo (tách từ Tổng quan, review 29) ──
      case 'get_sales_report':
        var _sr1 = checkPermission(params.token, 'reports.view');
        params._includeFinance = _canViewFinance(_sr1.role);
        return _ok(getSalesReport(params));
      case 'get_customer_report':
        checkPermission(params.token, 'reports.view');
        return _ok(getCustomerReport(params));
      case 'get_purchase_report':
        checkPermission(params.token, 'inventory.view');
        return _ok(getPurchaseReport(params));
      case 'get_inventory_report':
        checkPermission(params.token, 'inventory.view');
        return _ok(getInventoryReport(params));
      // review 30 — đối soát đơn PAID thiếu/chưa-Posted Receipt (gap autoCreateReceipt() best-effort
      // có thể để lại, xem catch RECEIPT_AUTO_CREATE_FAILED trong updateOrderStatus()).
      case 'get_receipt_reconciliation':
        checkPermission(params.token, 'reports.finance.view');
        return _ok(getReceiptReconciliationReport());
      case 'validate_mapping': return _ok(validateMapping(params.handle)); // public
      case 'list_notifications':
        checkPermission(params.token, 'notifications.view');
        return _ok(listNotifications(params));
      case 'list_activity_logs':
        checkPermission(params.token, 'audit.view');
        return _ok(listActivityLogs(params));
      case 'list_staffs':
        checkPermission(params.token, 'staff.manage');
        return _ok(listStaffs(params));
      case 'list_role_permissions':
        checkPermission(params.token, 'staff.manage');
        return _ok(listRolePermissions());
      // Danh mục quyền đầy đủ, nhóm theo mục quản lý — dùng để render multi-select checkbox
      // trên UI Admin (docs/mops.md §11, review 16).
      case 'list_permission_catalog':
        checkPermission(params.token, 'staff.manage');
        return _ok(listPermissionCatalog());
      case 'get_staff_permissions':
        checkPermission(params.token, 'staff.manage');
        return _ok(getStaffPermissions(params));
      case 'get_settings_status':
        requireOwner(params.token);
        return _ok(getSettingsStatus());

      case 'preview_coupon': { // public (checkout widget) — không tính lượt dùng
        var ss0 = SpreadsheetApp.getActiveSpreadsheet();
        // items (Pha B, tuỳ chọn) = [{handle, qty}] → resolve product_type/giá server-side để tính
        // đúng scope. Checkout gửi qua GET (chuỗi JSON); admin gửi qua POST (mảng đã parse) — nhận cả hai.
        // Không gửi → coi như toàn đơn (mã không scope vẫn chạy như cũ).
        var pvItems = [];
        if (params.items) {
          if (Array.isArray(params.items)) pvItems = params.items;
          else { try { pvItems = JSON.parse(params.items); } catch (e0) { pvItems = []; } }
        }
        var pvLineItems = _resolveCouponLineItems(ss0, pvItems);
        return _ok(_evaluateCoupon(ss0, params.code, Number(params.total_amount) || 0, pvLineItems));
      }
      case 'list_coupons':
        checkPermission(params.token, 'coupons.manage');
        return _ok(listCoupons());

      case 'list_cash_transactions':
        checkPermission(params.token, 'reports.finance.view');
        return _ok(listCashTransactions(params));

      // ── Finance Core (Phase 01 Bước 1) ──
      case 'list_receipts':
        checkPermission(params.token, 'finance.view');
        return _ok(listReceipts(params));
      case 'list_cash_accounts':
        checkPermission(params.token, 'finance.view');
        return _ok(listCashAccounts());
      case 'get_cash_account_balance':
        checkPermission(params.token, 'finance.view');
        return _ok(getCashAccountBalance(params));
      case 'list_categories':
        checkPermission(params.token, 'finance.view');
        return _ok(listCategories(params));

      // ── Finance Core (Phase 01 Bước 2) ──
      case 'list_payment_vouchers':
        checkPermission(params.token, 'finance.view');
        return _ok(listPaymentVouchers(params));

      // ── Finance Core (Phase 01 Bước 3) ──
      case 'list_transfers':
        checkPermission(params.token, 'finance.view');
        return _ok(listTransfers(params));
      case 'list_cash_adjustments':
        checkPermission(params.token, 'finance.view');
        return _ok(listCashAdjustments(params));

      // Chi nhánh (review 31) — chỉ cần đăng nhập, KHÔNG cần permission riêng: danh sách chi nhánh
      // phải hiển thị rộng rãi cho dropdown Tạo đơn/Thêm tài khoản quỹ, không phải dữ liệu nhạy cảm.
      case 'list_branches':
        requireStaffToken(params.token);
        return _ok(listBranches());

      // TK ngân hàng nhận VietQR (2026-07-21) — chỉ cần đăng nhập (số TK in lên QR, không nhạy cảm).
      case 'list_bank_accounts':
        requireStaffToken(params.token);
        return _ok({ bank_accounts: Repository.BankAccounts.findAll() });

      // ── Inventory (Phase 02) ──
      case 'list_suppliers':
        checkPermission(params.token, 'inventory.view');
        return _ok(listSuppliers(params));
      case 'get_supplier_detail':
        checkPermission(params.token, 'inventory.view');
        return _ok(getSupplierDetail(params.supplier_id, params.token));
      case 'list_purchase_orders':
        checkPermission(params.token, 'inventory.view');
        return _ok(listPurchaseOrders(params));

      // ── AP (Phase 04 Bước 3) — dữ liệu tài chính, dùng finance.view như Receipts/Vouchers ──
      case 'list_bills':
        checkPermission(params.token, 'finance.view');
        return _ok(listBills(params));

      // V1 compat
      case 'list_services': return _ok(listMappings());

      default:
        return null;
    }
}

// ============================================================
// Row-level OCC (2026-08-10) — Optimistic Concurrency Control
// ============================================================
// Cột _version cuối mỗi sheet critical (Orders/Products) — client đọc `_version` từ get_order/
// getProduct, gửi kèm khi update, server so khớp → nếu khác throw OCC_CONFLICT (409-style) yêu
// cầu FE reload rồi thử lại.
//
// Cột được đặt tại chỉ số cố định (không tự dò), tránh phụ thuộc getLastColumn() có thể lệch khi
// admin thêm cột thủ công. Sheet chưa có cột → getValue trả về '' → parseInt=0 → khớp mặc định
// version=0 lần đầu; setValue tự expand sheet nếu cần.
var OCC_COL = {
  ORDERS:   41, // Orders có 40 cột hiện tại (docs/mops.md §5) — cột 41 để trống làm _version
  PRODUCTS: 19  // Products có 18 cột (variant_title cột R) — cột 19 làm _version
};

// Read version từ 1 dòng — đã có row number. Không dùng getRange(sheet, versionCol, 1, 1) để
// tiết kiệm 1 RPC nếu caller đã có đầy đủ hàng.
function _readVersionAt(sheet, row, col) {
  if (!sheet || row < 2) return 0;
  try { return parseInt(sheet.getRange(row, col).getValue(), 10) || 0; } catch (e) { return 0; }
}
function _writeVersionAt(sheet, row, col, nextVersion) {
  try { sheet.getRange(row, col).setValue(nextVersion); } catch (e) { /* best-effort — không phá write chính */ }
}

// Xử lý xung đột: expected là version client gửi kèm; current là version thật đọc từ sheet.
// null/undefined/0 ở expected = client chưa hỗ trợ OCC (payload cũ) → SKIP check (backward-compat).
// Client mới luôn gửi _version từ get_order/getProduct.
function _checkOccVersion(expected, current, entityLabel) {
  if (expected === null || expected === undefined || expected === '' || Number(expected) === 0) return;
  if (Number(expected) === Number(current)) return;
  throw new Error('OCC_CONFLICT: ' + (entityLabel || 'Bản ghi') + ' đã được cập nhật ở nơi khác (bạn: v' + expected + ', hệ thống: v' + current + '). Tải lại rồi thử lại.');
}

// ============================================================
// RESPONSE HELPERS
// ============================================================

// Zero-Wait envelope (2026-08-10): mọi response GAS đều mang `_gen` để FE/Edge dùng làm cache key
// và `_elapsed_ms` (đo từ doPost/doGet start) để chẩn đoán latency. Không đổi field cũ để backward
// compat — FE cũ chỉ đọc `success` + payload tự spread ra root vẫn hoạt động.
var _REQ_START_MS = 0;
function _ok(data) {
  var body = typeof data === 'object' && data !== null ? data : { result: data };
  body.success = true;
  try { body._gen = _analyticsGen(); } catch (e) { body._gen = '0'; }
  if (_REQ_START_MS) body._elapsed_ms = new Date().getTime() - _REQ_START_MS;
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function _err(msg) {
  var body = { success: false, error: msg };
  try { body._gen = _analyticsGen(); } catch (e) {}
  if (_REQ_START_MS) body._elapsed_ms = new Date().getTime() - _REQ_START_MS;
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// Concurrency & in-request cache helpers (phase-07 Giai đoạn 1)
// Xem docs/implementation/phase-07-gas-refactor.md — BS-2, BS-4, BS-9, BS-10.
// ============================================================

// _withLock: bọc mutation CÓ RACE (tạo ID tuần tự, giảm tồn kho, ghi ledger).
// Dùng waitLock(10000) — KHỚP NGUYÊN ngữ nghĩa 8 site lock hiện có (throw khi hết timeout).
// QUY TẮC: KHÔNG bọc read; KHÔNG giữ lock khi gọi mạng (Sapo/Telegram) — BS-2/BS-10.
// Chủ yếu dùng cho code MỚI; 8 site cũ giữ nguyên (đang chạy ổn).
function _withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// _REQ: cache theo ĐÚNG 1 request. Reset ở đầu doPost/doGet (KHÔNG gắn lên object global
// để tránh rò qua request khác khi V8 context bị tái dùng — BS-9).
// Mục đích: chống N+1 RAM-fetch khi findAll()/findById() bị gọi lặp trong cùng 1 request (BS-4).
// LUẬT: sau mọi ghi phải _memoBust(key) kẻo đọc data cũ; job batch nặng gọi _resetReqCache() giữa các bước.
var _REQ = {};
function _resetReqCache() { _REQ = {}; }
function _memo(key, fn) { return _REQ[key] !== undefined ? _REQ[key] : (_REQ[key] = fn()); }
function _memoBust(key) { delete _REQ[key]; }

// phase-07 BS-5 — Analytics cache invalidation qua GENERATION TOKEN. getAnalytics cache theo bộ
// tham số (date/groupBy/finance) → nhiều key, CacheService KHÔNG xoá được theo prefix. Nhúng gen vào
// cache key; mọi WRITE bump gen → key cũ thành không-với-tới-được = invalidate tức thì (báo cáo Tổng
// quan KHÔNG còn phục vụ số cũ sau post_receipt/tạo đơn/…). Gen TTL 6h >> analytics key TTL 90s
// (nếu gen hết hạn về '0' thì mọi analytics key 90s cũng đã hết hạn → không phục vụ nhầm).
function _analyticsGen() {
  try { return CacheService.getScriptCache().get('mops_analytics_gen') || '0'; } catch (e) { return '0'; }
}
function _bumpAnalyticsGen() {
  try {
    var c = CacheService.getScriptCache();
    var g = parseInt(c.get('mops_analytics_gen') || '0', 10) + 1;
    c.put('mops_analytics_gen', String(g), 21600);
  } catch (e) { /* best-effort */ }
}

// phase-07 perf — cache 1 hàm READ nặng (quét full sheet) theo gen: key nhúng _analyticsGen() (bump ở
// MỌI write) → tự invalidate ngay sau bất kỳ write nào ⇒ KHÔNG bao giờ stale sau thao tác, nhưng lần
// đọc lặp/đồng thời giữa 2 write thì hit cache (bỏ được full-table-scan, ~15s→~2s sàn GAS). cacheKey đã
// GỒM params. Size guard 95KB (giới hạn CacheService 100KB/key) — quá lớn thì bỏ cache, vẫn tính bình thường.
function _cachedRead(cacheKey, fn) {
  return _memo(cacheKey, function() {
    var full = 'rc_' + cacheKey + '_' + _analyticsGen();
    try { var c = CacheService.getScriptCache().get(full); if (c) return JSON.parse(c); } catch (e) {}
    var out = fn();
    try { var s = JSON.stringify(out); if (s.length < 95000) CacheService.getScriptCache().put(full, s, 300); } catch (e2) {}
    return out;
  });
}

// CacheService giới hạn kích thước mỗi key. Các bảng lớn như Products vì vậy không thể
// dùng _cachedRead() nguyên khối; lưu manifest + các phần nhỏ để request sau vẫn bỏ được
// full-sheet read mà không cần thay đổi dữ liệu hay thứ tự dòng.
// generationName is optional. Most derived arrays are invalidated by the global write
// generation; append-only projections may use a narrower generation when a write cannot
// affect their result (for example SALE OUT rows do not change average cost from IN rows).
function _cachedArrayRead(cacheKey, fn, generationName) {
  return _memo('large_' + cacheKey, function() {
    var gen = generationName ? _cacheGeneration(generationName) : _analyticsGen();
    var prefix = 'rca_' + cacheKey + '_' + gen;
    var cache = CacheService.getScriptCache();
    try {
      var manifestRaw = cache.get(prefix + '_m');
      if (manifestRaw) {
        var manifest = JSON.parse(manifestRaw);
        var keys = [];
        for (var mi = 0; mi < manifest.parts; mi++) keys.push(prefix + '_' + mi);
        var chunks = cache.getAll(keys);
        var restored = [], complete = true;
        for (var ci = 0; ci < keys.length; ci++) {
          if (!chunks[keys[ci]]) { complete = false; break; }
          restored = restored.concat(JSON.parse(chunks[keys[ci]]));
        }
        if (complete) return restored;
      }
    } catch (e) { /* performance-only cache */ }

    var out = fn() || [];
    try {
      var parts = [], current = [], currentSize = 2;
      out.forEach(function(item) {
        var encoded = JSON.stringify(item);
        if (current.length && currentSize + encoded.length + 1 > 85000) {
          parts.push(current); current = []; currentSize = 2;
        }
        current.push(item); currentSize += encoded.length + 1;
      });
      if (current.length || !parts.length) parts.push(current);
      var values = {};
      values[prefix + '_m'] = JSON.stringify({ parts: parts.length });
      parts.forEach(function(part, pi) { values[prefix + '_' + pi] = JSON.stringify(part); });
      cache.putAll(values, 300);
    } catch (e2) { /* performance-only cache */ }
    return out;
  });
}

function _cacheGeneration(name) {
  try { return CacheService.getScriptCache().get('mops_cache_gen_' + name) || '0'; }
  catch (e) { return '0'; }
}
function _bumpCacheGeneration(name) {
  try {
    var cache = CacheService.getScriptCache();
    var key = 'mops_cache_gen_' + name;
    var next = parseInt(cache.get(key) || '0', 10) + 1;
    cache.put(key, String(next), 21600);
  } catch (e) { /* performance-only cache */ }
}

// Lightweight row indexes shared between adjacent requests (for example the order-list request
// followed by get_order). Indexes use the same generation token as cached reads, so every write
// makes old row numbers unreachable immediately.
function _rowIndexCacheKey(name) {
  return 'mops_row_index_' + name + '_' + _analyticsGen();
}
function _getRowIndex(name) {
  return _memo('__row_index_' + name, function() {
    try {
      var raw = CacheService.getScriptCache().get(_rowIndexCacheKey(name));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  });
}
function _putRowIndexes(indexes) {
  var entries = {}, cache = CacheService.getScriptCache();
  try {
    Object.keys(indexes || {}).forEach(function(name) {
      var raw = JSON.stringify(indexes[name]);
      // CacheService accepts at most 100 KB per key. Skip oversized indexes; callers fall back
      // to TextFinder, never to stale or partial row locations.
      if (raw.length < 95000) {
        entries[_rowIndexCacheKey(name)] = raw;
        _REQ['__row_index_' + name] = indexes[name];
      }
    });
    if (Object.keys(entries).length) cache.putAll(entries, 300);
  } catch (e) { /* performance-only cache */ }
}

// ============================================================
// Zero-Wait Path (2026-08-10) — rate limit inbound + Vercel KV queue puller
// ============================================================
// _rateGuard: backstop rate limit tại GAS (Vercel Edge đã lọc trước). Bucket theo cửa sổ phút
// giống _goshipRateGuard (mops_01.js). Ngưỡng: write 60/60s, read 300/60s per bucket key.
// Vượt ngưỡng → throw tiếng Việt; FE hiển thị toast, không auto-retry.
var _RL_MAX = { write: 60, read: 300 };
function _rateGuard(bucketKey, kind) {
  if (!bucketKey) bucketKey = 'anon';
  var max = _RL_MAX[kind] || 60;
  var cache = CacheService.getScriptCache();
  var key = 'mops_rl_' + kind + '_' + bucketKey + '_' + Math.floor(new Date().getTime() / 60000);
  var n = parseInt(cache.get(key), 10) || 0;
  if (n >= max) {
    throw new Error('Quá tải: đã gọi ' + kind + ' quá ' + max + ' lần trong 1 phút. Chờ ~1 phút rồi thử lại.');
  }
  try { cache.put(key, String(n + 1), 120); } catch (e) {}
}

// _drainKvQueue: worker chạy 1 phút/lần bởi time trigger. Kéo (pull) tối đa 50 tác vụ từ Vercel KV
// (Redis via REST), xử lý tuần tự bằng _dispatchWrite() ĐÚNG như FE gọi trực tiếp. Item fail →
// POST nack về Edge để đẩy sang DLQ. Vercel KV làm queue thật (LPUSH/RPOP), GAS chỉ là consumer.
// Cấu hình qua Script Properties:
//   MOPS_EDGE_URL      = https://<your-vercel>.vercel.app
//   MOPS_EDGE_SECRET   = shared secret khớp với Edge (KV pop/nack auth)
// Nếu 2 property thiếu → return sớm (không lỗi), cho phép chạy MOPS mà chưa bật queue.
// 2026-08-10 Alert Trap: entry của cron trigger — bọc _safeTriggerRun để crash không im lặng
// (dev nhận Telegram trong 15' đầu, sau đó dedup). Impl thật ở _drainKvQueueImpl bên dưới.
function _drainKvQueue() {
  return _safeTriggerRun('_drainKvQueue', function() { return _drainKvQueueImpl(); });
}
function _drainKvQueueImpl() {
  var props = PropertiesService.getScriptProperties();
  var edgeUrl = props.getProperty('MOPS_EDGE_URL');
  var secret  = props.getProperty('MOPS_EDGE_SECRET');
  if (!edgeUrl || !secret) return { skipped: true, reason: 'MOPS_EDGE_URL / MOPS_EDGE_SECRET chưa cấu hình' };

  var resp = UrlFetchApp.fetch(edgeUrl.replace(/\/+$/, '') + '/api/queue/pop?batch=50', {
    method: 'get',
    headers: { 'X-Mops-Secret': secret },
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  if (code !== 200) return { skipped: true, reason: 'pop HTTP ' + code };

  var body = JSON.parse(resp.getContentText() || '{}');
  var items = (body && body.items) || [];
  if (!items.length) return { drained: 0 };

  var failed = [], ok = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    try {
      _resetReqCache(); // cách ly bộ nhớ giữa các item
      _dispatchWrite(it.action, it.payload || {});
      ok++;
    } catch (ex) {
      failed.push({ id: it.id, action: it.action, error: String((ex && ex.message) || ex), retry: (it.retry || 0) + 1 });
    }
  }

  if (failed.length) {
    // Gửi lại về Edge để retry (retry < 3) hoặc chuyển DLQ (retry >= 3). Edge quyết định.
    try {
      UrlFetchApp.fetch(edgeUrl.replace(/\/+$/, '') + '/api/queue/nack', {
        method: 'post',
        contentType: 'application/json',
        headers: { 'X-Mops-Secret': secret },
        payload: JSON.stringify({ items: failed }),
        muteHttpExceptions: true
      });
    } catch (e) { /* ignore nack failure — items vẫn còn ở Edge nếu chưa xoá */ }
  }

  return { drained: ok, failed: failed.length };
}

// ============================================================
// Zero-Wait Path — bulk bootstrap (2026-08-10)
// Gộp 6 read cần thiết cho startup MOPS Admin về 1 response.
// Server-side dự phòng khi Edge fan-out không hoạt động (thất bại KV / user gọi thẳng GAS_URL).
// ============================================================
function bulkBootstrap(params) {
  var out = { _gen: _analyticsGen() };
  var token = params && params.token;
  // Mỗi block try/catch riêng — 1 block fail không nên phá cả bootstrap.
  try {
    out.staff = token ? staffMe({ token: token }) : null;
  } catch (e) { out.staff = null; out._staffError = String(e.message || e); }
  try {
    out.branches = (typeof listBranches === 'function') ? listBranches({ token: token }) : [];
  } catch (e) { out.branches = []; }
  try {
    out.settings_public = _getPublicSettings();
  } catch (e) { out.settings_public = {}; }
  // Skinny DTO — CHỈ trả các field cần cho row list (giảm ~85% payload)
  try {
    out.orders_lite = (typeof listOrdersLite === 'function') ? listOrdersLite({ token: token, limit: params.orders_limit || 100 }) : [];
  } catch (e) { out.orders_lite = []; }
  try {
    out.customers_lite = (typeof listCustomersLite === 'function') ? listCustomersLite({ token: token, limit: params.customers_limit || 100 }) : [];
  } catch (e) { out.customers_lite = []; }
  try {
    out.products_lite = (typeof listProductsLite === 'function') ? listProductsLite({ token: token, limit: params.products_limit || 200 }) : [];
  } catch (e) { out.products_lite = []; }
  return out;
}

// ============================================================
// Alert Trap (2026-08-10) — dây báo cho mọi background trigger
// ============================================================
// _safeTriggerRun(name, fn): bọc quanh MỌI trigger cron cấp cao nhất. Try/catch, log GCP + gửi
// Telegram (kèm debounce 15 phút). Try/catch bên trong trap để không đè exception gốc — nếu gửi
// Telegram fail, error gốc vẫn được console.error để dev đọc Executions transcript.
//
// Setting mới TELEGRAM_ALERT_CHAT (ChatID Telegram nhận cảnh báo dev — có thể là nhóm dev riêng).
// Không có setting → skip Telegram, vẫn log console. Không muốn setting mới thì fallback về
// setting TELEGRAM_CHAT_ID hiện có, nhưng lộn với notification khách nên khuyến khích cấu hình riêng.
function _safeTriggerRun(triggerName, fn) {
  var startedAt = new Date().getTime();
  try {
    var out = fn();
    return out;
  } catch (err) {
    // 1. Luôn log console — vào GCP Executions transcript kể cả khi Telegram fail
    console.error('[CRITICAL TRIGGER ERROR]', triggerName, err && err.stack ? err.stack : String(err));
    // 2. Alert Telegram — try/catch riêng cho trap để không đè exception gốc lên chain caller
    try {
      _alertTelegram({
        trigger: triggerName,
        env: 'PRODUCTION',
        message: String((err && err.message) || err),
        elapsed_ms: new Date().getTime() - startedAt,
        at: new Date().toISOString()
      });
    } catch (trapErr) {
      console.error('[ALERT TRAP FAILED]', String(trapErr && trapErr.message || trapErr));
    }
    // 3. KHÔNG re-throw — trigger fail lặng lẽ, không kéo theo GAS execution mark FAILED (spam
    // email cảnh báo Google gửi mỗi lần trigger fail). Alert Telegram thay email GAS default.
  }
}

// Debounce 15 phút theo (trigger, hash-of-message). Cùng 1 lỗi lặp lại chỉ bắn 1 tin/15'.
// Cache key ngắn: sha1 rút gọn trong CacheService (100KB/key thoải mái, chỉ chứa "1"/TTL 900s).
function _alertTelegram(ctx) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s  = getSettings(ss);
  var alertChat = s.TELEGRAM_ALERT_CHAT || s.TELEGRAM_CHAT_ID; // fallback về chat notification khách
  var token = s.TELEGRAM_TOKEN;
  if (!token || !alertChat) return; // config thiếu → chỉ log console, không lỗi

  // Hash rút gọn (không dùng crypto — GAS chưa expose subtle) — hash JS bit-xor đơn giản là đủ
  // để dedup trong 15' (không phải bảo mật, chỉ chống spam)
  var raw = String(ctx.trigger) + '|' + String(ctx.message);
  var h = 0;
  for (var i = 0; i < raw.length; i++) { h = ((h << 5) - h + raw.charCodeAt(i)) | 0; }
  var cacheKey = 'mops_alert_' + Math.abs(h);

  var cache = CacheService.getScriptCache();
  if (cache.get(cacheKey)) return; // đã bắn trong 15' — skip
  cache.put(cacheKey, '1', 900);

  var text = '⚠️ <b>MOPS Trigger Error</b>\n' +
    'Trigger: <code>' + ctx.trigger + '</code>\n' +
    'Env: ' + ctx.env + '\n' +
    'Time: ' + ctx.at + '\n' +
    'Elapsed: ' + ctx.elapsed_ms + 'ms\n' +
    'Error: <code>' + String(ctx.message).substring(0, 400) + '</code>\n' +
    '<i>(dedup 15 phút — không spam thêm)</i>';

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ chat_id: alertChat, text: text, parse_mode: 'HTML' }),
    muteHttpExceptions: true
  });
}

// Cài trigger 1 phút gọi _drainKvQueue. Chạy 1 LẦN từ Apps Script Editor sau khi
// đã cấu hình MOPS_EDGE_URL + MOPS_EDGE_SECRET trong Script Properties. Idempotent —
// gọi nhiều lần chỉ tạo thêm trigger trùng, nên tự dọn trigger cũ trước.
function _installDrainTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === '_drainKvQueue') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('_drainKvQueue').timeBased().everyMinutes(1).create();
  return { installed: true, function: '_drainKvQueue', interval_minutes: 1 };
}

// Public subset — Sapo webhook secret + link Admin URL không phơi ở đây. Chỉ những field FE
// cần để boot dashboard (currency, sapo domain, mops_admin_primary, feature flags).
function _getPublicSettings() {
  var s = getSettings(SpreadsheetApp.getActiveSpreadsheet());
  return {
    APP_VERSION:   s.APP_VERSION || '2.1.0',
    ENV:           s.ENV || 'production',
    MAINTENANCE:   String(s.MAINTENANCE || '').toUpperCase() === 'TRUE',
    STORE_NAME:    s.STORE_NAME || '',
    TIMEZONE:      s.TIMEZONE || 'Asia/Ho_Chi_Minh',
    CURRENCY:      s.CURRENCY || 'VND'
  };
}

function _findSheetRowExact(sheet, column, value) {
  if (!sheet || sheet.getLastRow() < 2 || value === undefined || value === null || value === '') return -1;
  // 2026-08-10: .trim() né bẫy formatting (payload có khoảng trắng thừa từ Sapo sync / paste tay
  // Excel). ID không được có leading/trailing whitespace hợp lệ; trim là chuẩn hoá lành mạnh.
  var v = String(value).trim();
  if (!v) return -1;
  try {
    var hit = sheet.getRange(2, column, sheet.getLastRow() - 1, 1)
      .createTextFinder(v).matchCase(true).matchEntireCell(true).findNext();
    return hit ? hit.getRow() : -1;
  } catch (e) { return -1; }
}

function _findSheetRowsExact(sheet, column, value) {
  if (!sheet || sheet.getLastRow() < 2 || value === undefined || value === null || value === '') return [];
  var v = String(value).trim();
  if (!v) return [];
  try {
    return sheet.getRange(2, column, sheet.getLastRow() - 1, 1)
      .createTextFinder(v).matchCase(true).matchEntireCell(true).findAll()
      .map(function(range) { return range.getRow(); })
      .sort(function(a, b) { return a - b; });
  } catch (e) { return []; }
}

// Read arbitrarily located matching rows in contiguous batches. The return order always follows
// row order, while the usual append-only case costs exactly one getValues() call.
function _readSheetRows(sheet, rows, firstColumn, numColumns) {
  if (!sheet || !rows || !rows.length) return [];
  var sorted = rows.slice().sort(function(a, b) { return a - b; });
  var out = [], start = sorted[0], prev = sorted[0];
  function readGroup(from, to) {
    var values = sheet.getRange(from, firstColumn, to - from + 1, numColumns).getValues();
    for (var i = 0; i < values.length; i++) out.push(values[i]);
  }
  for (var i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) { prev = sorted[i]; continue; }
    readGroup(start, prev);
    start = prev = sorted[i];
  }
  readGroup(start, prev);
  return out;
}

// ============================================================
// PERF benchmark harness (Phase 0 — perf sprint 2026-08-06)
// Bật/tắt qua Settings.MOPS_PERF_LOG='TRUE'. Khi tắt, mọi hàm no-op (return sớm).
// Đo bằng Date.now() vào RAM (_REQ), xả 1 lần cuối request qua Logger.log — xem trong
// Executions transcript. Không dùng ScriptCache/PropertiesService để tránh chính helper
// tự thêm I/O làm nhiễu số đo.
// ============================================================
function _perfStart(label) {
  var enabled = false;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    enabled = String((getSettings(ss).MOPS_PERF_LOG || '')).toUpperCase() === 'TRUE';
  } catch (e) {}
  if (!enabled) return null;
  var pid = label + '_' + Date.now();
  _REQ.__perf = _REQ.__perf || {};
  _REQ.__perf[pid] = { label: label, t0: Date.now(), marks: [] };
  return pid;
}
function _perfMark(pid, label) {
  if (!pid || !_REQ.__perf || !_REQ.__perf[pid]) return;
  _REQ.__perf[pid].marks.push({ label: label, t: Date.now() });
}
function _perfReport(pid) {
  if (!pid || !_REQ.__perf || !_REQ.__perf[pid]) return;
  var b = _REQ.__perf[pid];
  var out = ['[PERF ' + b.label + ']'];
  var prev = b.t0;
  for (var i = 0; i < b.marks.length; i++) {
    var m = b.marks[i];
    out.push('  +' + (m.t - prev) + 'ms  ' + m.label);
    prev = m.t;
  }
  out.push('  = ' + (Date.now() - b.t0) + 'ms TOTAL');
  Logger.log(out.join('\n'));
  delete _REQ.__perf[pid];
}

// Maintenance gate — returns a ContentService response if MAINTENANCE=TRUE, else null.
// Callers check: var maint = _checkMaintenance(); if (maint) return maint;
// Health endpoint MUST bypass this (see doGet — health case runs before this check).
function _checkMaintenance() {
  try {
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var cfg = getSettings(ss);
    if (String(cfg.MAINTENANCE || '').toUpperCase() === 'TRUE') {
      return ContentService
        .createTextOutput(JSON.stringify({
          success:     false,
          maintenance: true,
          message:     'Hệ thống đang bảo trì. Vui lòng thử lại sau.'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (ex) { /* non-fatal: if check fails, let request through */ }
  return null;
}

// Health check — bypasses maintenance gate intentionally.
// Returns version/env/status without any sensitive data.
// Trigger: GET ?action=health
function _healthCheck() {
  try {
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var cfg = getSettings(ss);
    return ContentService
      .createTextOutput(JSON.stringify({
        success:     true,
        version:     cfg.APP_VERSION || '2.1.0',
        env:         cfg.ENV         || 'production',
        timestamp:   new Date().toISOString(),
        maintenance: String(cfg.MAINTENANCE || '').toUpperCase() === 'TRUE',
        sheets:      { ok: true }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (ex) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success:   false,
        timestamp: new Date().toISOString(),
        error:     ex.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// SETTINGS
// ============================================================

// SECRET_KEYS live in PropertiesService (Project Settings > Script Properties in the
// Apps Script editor), NOT in the Settings sheet — a Sheet can be shared with
// accountants/marketing later; Script Properties stays visible only to whoever has
// Apps Script Editor access (a much smaller, already-trusted circle).
// getSettings() overlays them on top of the sheet-based config so every existing
// consumer (syncProducts, Telegram sender, getSettingsStatus...) keeps reading
// `settings.SAPO_API_KEY` etc. unchanged.
var SECRET_KEYS = ['SAPO_API_KEY', 'SAPO_SECRET', 'TELEGRAM_TOKEN', 'GHN_TOKEN', 'GHN_WEBHOOK_KEY', 'AHAMOVE_API_KEY', 'GHTK_TOKEN', 'VTP_TOKEN', 'VTP_PASSWORD',
                   'GOSHIP_TOKEN', 'GOSHIP_PASSWORD', 'GOSHIP_CLIENT_SECRET', 'GOSHIP_WEBHOOK_KEY'];

// phase-07 Lớp 4 — CACHE Settings. Đo được: getDataRange() sheet Settings tốn ~1.6s và getSettings
// chạy MỖI request (trong _checkMaintenance) + thường 2 lần/request → là hotspot latency lớn nhất
// điều khiển được. 2 lớp cache:
//   (1) request-memo (_memo) → đọc tối đa 1 lần/request (reset đầu doPost/doGet).
//   (2) CacheService 'mops_settings_sheet' (TTL 300s) → xoá ~1.6s cho hầu hết request giữa các lần.
// Cache CHỈ phần đọc từ Sheet (KHÔNG cache secrets — overlay live từ PropertiesService mỗi lần, vừa
// bảo mật vừa luôn mới). Bust bằng _bustSettingsCache() sau mọi ghi Settings (updateSettings/setup).
var _SETTINGS_CACHE_KEY = 'mops_settings_sheet';
function _bustSettingsCache() {
  _memoBust('__settings');
  try { CacheService.getScriptCache().remove(_SETTINGS_CACHE_KEY); } catch (e) {}
}
function getSettings(ss) {
  return _memo('__settings', function() {
    var cfg = null;
    try {
      var cached = CacheService.getScriptCache().get(_SETTINGS_CACHE_KEY);
      if (cached) cfg = JSON.parse(cached);
    } catch (e) { cfg = null; }

    if (!cfg) {
      var sh = ss.getSheetByName(SHEET.SETTINGS);
      if (!sh) throw new Error('Settings sheet not found');
      var data = sh.getDataRange().getValues();
      cfg = {};
      for (var i = 0; i < data.length; i++) {
        var key = String(data[i][0]).trim();
        var val = String(data[i][1]).trim();
        if (key) cfg[key] = val;
      }
      // Cache phần Sheet (chưa có secrets) — TTL 300s. Bust ngay khi update_settings.
      try { CacheService.getScriptCache().put(_SETTINGS_CACHE_KEY, JSON.stringify(cfg), 300); } catch (e2) {}
    }

    // Script Properties overrides the sheet once a secret has been migrated. Overlay LIVE mỗi lần
    // (KHÔNG cache secrets vào CacheService) — pre-existing plaintext trong Sheet vẫn fallback tới khi
    // key đó được lưu lại lần kế (tự xoá plaintext lúc đó).
    var secretProps = PropertiesService.getScriptProperties().getProperties();
    SECRET_KEYS.forEach(function(key) {
      var v = secretProps[key];
      if (v) cfg[key] = v;
    });
    return cfg;
  });
}

// ============================================================
// SETTINGS TAB (OWNER-only) — write-only for secrets
//  Never return the real value of SAPO_API_KEY / SAPO_SECRET /
//  TELEGRAM_TOKEN — only whether they are set. Frontend can only
//  overwrite them (blank input = leave unchanged), never read back.
// ============================================================

var SETTINGS_WRITABLE_KEYS = [
  'BANK_CODE', 'ACCOUNT_NO', 'ACCOUNT_NAME', 'TELEGRAM_CHAT_ID',
  'MAINTENANCE', 'SAPO_STORE', 'SAPO_API_KEY', 'SAPO_SECRET', 'TELEGRAM_TOKEN',
  // GHN vận chuyển (phase 2026-07-17). GHN_TOKEN là secret (→ Script Properties, write-only như SAPO).
  // GHN_ENV: 'dev' (sandbox dev-online-gateway.ghn.vn) | 'prod' (online-gateway.ghn.vn). Mặc định dev.
  'GHN_TOKEN', 'GHN_SHOP_ID', 'GHN_ENV', 'GHN_FROM_DISTRICT_ID', 'GHN_FROM_WARD_CODE',
  'GHN_DEFAULT_LENGTH', 'GHN_DEFAULT_WIDTH', 'GHN_DEFAULT_HEIGHT', 'GHN_COD_ACCOUNT_ID',
  // Khoá xác thực webhook GHN (2026-09-05, cùng cơ chế GOSHIP_WEBHOOK_KEY bên dưới — secret đặt
  // trong URL webhook khai với GHN, GAS không đọc được header nên không verify HMAC được).
  'GHN_WEBHOOK_KEY',
  // Ahamove vận chuyển (đa đối tác 2026-07-20). AHAMOVE_API_KEY là secret (→ Script Properties, write-only
  // như SAPO). Token JWT KHÔNG lưu — lấy runtime từ api_key+mobile. ENV: 'stg' (apistg) | 'prod' (api).
  'AHAMOVE_API_KEY', 'AHAMOVE_MOBILE', 'AHAMOVE_ENV', 'AHAMOVE_SERVICE_ID', 'AHAMOVE_FROM_ADDRESS',
  'AHAMOVE_FROM_LAT', 'AHAMOVE_FROM_LNG', 'AHAMOVE_PICKUP_NAME', 'AHAMOVE_PICKUP_MOBILE',
  // GHTK (đa đối tác 2026-07-20). GHTK_TOKEN secret. Địa chỉ kho lấy hàng theo TÊN tỉnh/quận/xã.
  // GHTK_FREESHIP: '1' shop trả ship (default) | '0' khách trả ship — bỏ hardcode 2026-07-28.
  'GHTK_TOKEN', 'GHTK_ENV', 'GHTK_PICK_ADDRESS_ID', 'GHTK_PICK_NAME', 'GHTK_PICK_TEL', 'GHTK_PICK_ADDRESS',
  'GHTK_PICK_PROVINCE', 'GHTK_PICK_DISTRICT', 'GHTK_PICK_WARD', 'GHTK_TRANSPORT', 'GHTK_FREESHIP',
  // Viettel Post (đa đối tác 2026-07-20). VTP_TOKEN + VTP_PASSWORD secret. SENDER_PROVINCE/DISTRICT là ID VTP.
  'VTP_TOKEN', 'VTP_USERNAME', 'VTP_PASSWORD', 'VTP_ENV', 'VTP_SERVICE_CODE',
  'VTP_SENDER_NAME', 'VTP_SENDER_PHONE', 'VTP_SENDER_ADDRESS',
  'VTP_SENDER_PROVINCE', 'VTP_SENDER_DISTRICT', 'VTP_SENDER_WARD',
  // Goship AGGREGATOR (adapter #6, 2026-07-27) — 1 kết nối → nhiều hãng. TOKEN/PASSWORD/CLIENT_SECRET là
  // secret (→ Script Properties). FROM_CITY/DISTRICT/WARD nhận MÃ Goship (lấy bằng testGoshipCities) hoặc
  // TÊN (tự dò). AUTO_PICK: 'cheapest' (mặc định) | 'best_success'. PAYER: 1 shop trả cước | 0 khách trả.
  'GOSHIP_TOKEN', 'GOSHIP_USERNAME', 'GOSHIP_PASSWORD', 'GOSHIP_CLIENT_ID', 'GOSHIP_CLIENT_SECRET',
  'GOSHIP_ENV', 'GOSHIP_FROM_NAME', 'GOSHIP_FROM_PHONE', 'GOSHIP_FROM_STREET',
  'GOSHIP_FROM_CITY', 'GOSHIP_FROM_DISTRICT', 'GOSHIP_FROM_WARD',
  'GOSHIP_AUTO_PICK', 'GOSHIP_PAYER',
  'GOSHIP_DEFAULT_LENGTH', 'GOSHIP_DEFAULT_WIDTH', 'GOSHIP_DEFAULT_HEIGHT',
  // Khoá xác thực webhook (secret): endpoint khai với Goship là `…/exec?wh=<khoá>`. GAS không đọc được
  // header nên không verify HMAC được — đây là lớp xác thực khả thi duy nhất trong GAS thuần.
  'GOSHIP_WEBHOOK_KEY'
];

// Sanity-check formats before writing — rejects obvious typos before they
// silently break syncProducts()/Telegram sending. Not a full format spec for
// SAPO's key/secret (undocumented in this repo) — just a floor to catch
// "gõ nhầm 3 ký tự rồi bấm Lưu".
function _validateSettingValue(key, value) {
  if (key === 'TELEGRAM_TOKEN') {
    if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(value)) {
      return 'Telegram Bot Token sai định dạng (phải dạng "123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")';
    }
  } else if (key === 'SAPO_API_KEY' || key === 'SAPO_SECRET') {
    if (value.length < 16 || /\s/.test(value)) {
      return (key === 'SAPO_API_KEY' ? 'API Key' : 'API Secret') + ' quá ngắn hoặc chứa khoảng trắng — kiểm tra lại giá trị copy từ Sapo Admin';
    }
  } else if (key === 'ACCOUNT_NO') {
    if (!/^\d{6,19}$/.test(value)) {
      return 'Số tài khoản phải là 6-19 chữ số';
    }
  } else if (key === 'BANK_CODE') {
    if (!/^[A-Z0-9]{2,10}$/.test(value)) {
      return 'Mã ngân hàng không hợp lệ (chỉ chữ hoa/số, 2-10 ký tự)';
    }
  }
  return null; // hợp lệ
}

function getSettingsStatus() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var cfg   = getSettings(ss);
  var audit = _getLastSettingsAudit(ss);
  return {
    bank_code:            cfg.BANK_CODE || '',
    account_no:           cfg.ACCOUNT_NO || '',
    account_name:         cfg.ACCOUNT_NAME || '',
    telegram_chat_id:     cfg.TELEGRAM_CHAT_ID || '',
    sapo_store:           cfg.SAPO_STORE || '',
    maintenance:          String(cfg.MAINTENANCE || '').toUpperCase() === 'TRUE',
    app_version:          cfg.APP_VERSION || '',
    env:                  cfg.ENV || '',
    sapo_api_key_set:     !!cfg.SAPO_API_KEY,
    sapo_secret_set:      !!cfg.SAPO_SECRET,
    telegram_token_set:   !!cfg.TELEGRAM_TOKEN,
    // GHN vận chuyển (phase 2026-07-17) — token là secret (chỉ trả *_set), phần còn lại trả giá trị.
    ghn_token_set:        !!cfg.GHN_TOKEN,
    ghn_env:              cfg.GHN_ENV || 'dev',
    ghn_shop_id:          cfg.GHN_SHOP_ID || '',
    ghn_webhook_key_set:  !!cfg.GHN_WEBHOOK_KEY,
    ghn_from_district_id: cfg.GHN_FROM_DISTRICT_ID || '',
    ghn_from_ward_code:   cfg.GHN_FROM_WARD_CODE || '',
    ghn_default_length:   cfg.GHN_DEFAULT_LENGTH || '',
    ghn_default_width:    cfg.GHN_DEFAULT_WIDTH || '',
    ghn_default_height:   cfg.GHN_DEFAULT_HEIGHT || '',
    ghn_cod_account_id:   cfg.GHN_COD_ACCOUNT_ID || '',
    // Ahamove vận chuyển (đa đối tác 2026-07-20) — api_key là secret (chỉ trả *_set), phần còn lại giá trị.
    ahamove_api_key_set:  !!cfg.AHAMOVE_API_KEY,
    ahamove_mobile:       cfg.AHAMOVE_MOBILE || '',
    ahamove_env:          cfg.AHAMOVE_ENV || 'stg',
    ahamove_service_id:   cfg.AHAMOVE_SERVICE_ID || '',
    ahamove_from_address: cfg.AHAMOVE_FROM_ADDRESS || '',
    ahamove_from_lat:     cfg.AHAMOVE_FROM_LAT || '',
    ahamove_from_lng:     cfg.AHAMOVE_FROM_LNG || '',
    ahamove_pickup_name:  cfg.AHAMOVE_PICKUP_NAME || '',
    ahamove_pickup_mobile: cfg.AHAMOVE_PICKUP_MOBILE || '',
    // GHTK (đa đối tác 2026-07-20) — token là secret (chỉ *_set), phần còn lại giá trị.
    ghtk_token_set:       !!cfg.GHTK_TOKEN,
    ghtk_env:             cfg.GHTK_ENV || 'stg',
    ghtk_pick_address_id: cfg.GHTK_PICK_ADDRESS_ID || '',
    ghtk_pick_name:       cfg.GHTK_PICK_NAME || '',
    ghtk_pick_tel:        cfg.GHTK_PICK_TEL || '',
    ghtk_pick_address:    cfg.GHTK_PICK_ADDRESS || '',
    ghtk_pick_province:   cfg.GHTK_PICK_PROVINCE || '',
    ghtk_pick_district:   cfg.GHTK_PICK_DISTRICT || '',
    ghtk_pick_ward:       cfg.GHTK_PICK_WARD || '',
    ghtk_transport:       cfg.GHTK_TRANSPORT || 'road',
    ghtk_freeship:        cfg.GHTK_FREESHIP != null && cfg.GHTK_FREESHIP !== '' ? String(cfg.GHTK_FREESHIP) : '1',
    ghtk_configured:      !!(cfg.GHTK_TOKEN && (cfg.GHTK_PICK_ADDRESS_ID || (cfg.GHTK_PICK_ADDRESS && cfg.GHTK_PICK_PROVINCE && cfg.GHTK_PICK_DISTRICT))),
    // Viettel Post (đa đối tác 2026-07-20) — token+password là secret (chỉ *_set).
    vtp_token_set:        !!cfg.VTP_TOKEN,
    vtp_password_set:     !!cfg.VTP_PASSWORD,
    vtp_username:         cfg.VTP_USERNAME || '',
    vtp_env:              cfg.VTP_ENV || 'stg',
    vtp_service_code:     cfg.VTP_SERVICE_CODE || 'VCN',
    vtp_sender_name:      cfg.VTP_SENDER_NAME || '',
    vtp_sender_phone:     cfg.VTP_SENDER_PHONE || '',
    vtp_sender_address:   cfg.VTP_SENDER_ADDRESS || '',
    vtp_sender_province:  cfg.VTP_SENDER_PROVINCE || '',
    vtp_sender_district:  cfg.VTP_SENDER_DISTRICT || '',
    vtp_sender_ward:      cfg.VTP_SENDER_WARD || '',
    // Goship aggregator (2026-07-27) — token/password/client_secret là secret (chỉ *_set).
    goship_token_set:         !!cfg.GOSHIP_TOKEN,
    goship_password_set:      !!cfg.GOSHIP_PASSWORD,
    goship_client_secret_set: !!cfg.GOSHIP_CLIENT_SECRET,
    goship_username:      cfg.GOSHIP_USERNAME || '',
    goship_client_id:     cfg.GOSHIP_CLIENT_ID || '',
    goship_env:           cfg.GOSHIP_ENV || 'stg',
    goship_from_name:     cfg.GOSHIP_FROM_NAME || '',
    goship_from_phone:    cfg.GOSHIP_FROM_PHONE || '',
    goship_from_street:   cfg.GOSHIP_FROM_STREET || '',
    goship_from_city:     cfg.GOSHIP_FROM_CITY || '',
    goship_from_district: cfg.GOSHIP_FROM_DISTRICT || '',
    goship_from_ward:     cfg.GOSHIP_FROM_WARD || '',
    goship_auto_pick:     cfg.GOSHIP_AUTO_PICK || 'cheapest',
    goship_payer:         cfg.GOSHIP_PAYER || '1',
    goship_webhook_key_set: !!cfg.GOSHIP_WEBHOOK_KEY,
    settings_updated_at:  audit.at,
    settings_updated_by:  audit.by
  };
}

// Reuses ActivityLogs (entityType=SECURITY, action=SETTINGS_UPDATED) instead of
// adding an updated_at column to the Settings sheet — one global timestamp for
// the whole Cấu hình tab, not per-field.
function _getLastSettingsAudit(ss) {
  var sh = ss.getSheetByName(SHEET.ACTIVITY_LOGS);
  if (!sh || sh.getLastRow() < 2) return { at: '', by: '' };
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    if (String(row[1]) === 'SECURITY' && String(row[3]) === 'SETTINGS_UPDATED') {
      var ts = row[5];
      return {
        at: ts instanceof Date ? ts.toISOString() : String(ts || ''),
        by: String(row[4] || '')
      };
    }
  }
  return { at: '', by: '' };
}

function updateSettings(payload) {
  var updates = payload.updates || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.SETTINGS);
  if (!sh) throw new Error('Settings sheet not found');
  var props = PropertiesService.getScriptProperties();

  var lastRow  = sh.getLastRow();
  var existing = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, 1).getValues() : [];
  var rowByKey = {};
  existing.forEach(function(r, idx) { rowByKey[String(r[0]).trim()] = idx + 2; });

  // 1) Validate ALL provided values BEFORE writing anything — an all-or-nothing
  //    save avoids a half-applied config (vd: BANK_CODE ghi rồi nhưng TELEGRAM_TOKEN
  //    bị từ chối giữa chừng).
  var toWrite = [];
  SETTINGS_WRITABLE_KEYS.forEach(function(key) {
    if (!(key in updates)) return;
    var value = String(updates[key]);
    if (key === 'MAINTENANCE') {
      value = (updates[key] === true || value.toUpperCase() === 'TRUE') ? 'TRUE' : 'FALSE';
    } else if (value === '') {
      return; // blank = "leave unchanged" — required for write-only secret fields
    }
    var err = _validateSettingValue(key, value);
    if (err) throw new Error(err);
    toWrite.push({ key: key, value: value });
  });

  // 2) Write — secrets go to Script Properties (never the Sheet); everything
  //    else goes to the Sheet as before.
  //    setNumberFormat('@') TRƯỚC setValue(): ô Settings mặc định định dạng
  //    "Automatic" nên Sheets tự suy luận kiểu — "TRUE"/"FALSE" thành Boolean
  //    (gây lỗi xác minh MAINTENANCE ở bước 3), và nghiêm trọng hơn, ACCOUNT_NO
  //    toàn chữ số (vd "0912345678", có số 0 đầu) có thể bị suy thành Number và
  //    MẤT số 0 đầu — sai số tài khoản thật trong QR mà không có lỗi báo. Ép
  //    Plain text trước khi ghi để cột B luôn giữ nguyên chuỗi đã nhập.
  var changed = [];
  toWrite.forEach(function(item) {
    if (SECRET_KEYS.indexOf(item.key) !== -1) {
      props.setProperty(item.key, item.value);
      // Blank any old plaintext copy left in the Sheet from before this migration.
      if (rowByKey[item.key]) sh.getRange(rowByKey[item.key], 2).setValue('');
    } else if (rowByKey[item.key]) {
      sh.getRange(rowByKey[item.key], 2).setNumberFormat('@').setValue(item.value);
    } else {
      sh.appendRow([item.key, '']);
      rowByKey[item.key] = sh.getLastRow();
      sh.getRange(rowByKey[item.key], 2).setNumberFormat('@').setValue(item.value);
    }
    changed.push(item.key);
  });

  // 3) Re-read what was just written and verify it matches — catches a Sheet API
  //    write that silently failed, before we ever tell the UI "đã lưu thành công".
  toWrite.forEach(function(item) {
    var actual = SECRET_KEYS.indexOf(item.key) !== -1
      ? props.getProperty(item.key)
      : String(sh.getRange(rowByKey[item.key], 2).getValue());
    // MAINTENANCE ghi chuỗi "TRUE"/"FALSE" nhưng ô Settings để định dạng "Automatic"
    // (mặc định) nên Sheets tự nhận dạng thành kiểu Boolean thật — đọc lại bằng
    // getValue() trả về boolean true/false, String() hoá thành "true"/"false" chữ
    // thường, không khớp chuỗi hoa vừa ghi dù giá trị thực tế đã đúng. Các key khác
    // (BANK_CODE, ACCOUNT_NO...) không bị Sheets tự chuyển kiểu nên vẫn so khớp
    // nguyên văn — chỉ nới lỏng riêng cho MAINTENANCE. Cùng cách chuẩn hoá đã dùng
    // khi ĐỌC MAINTENANCE ở _checkMaintenance()/getSettingsStatus() (String(...).toUpperCase()).
    var actualCmp   = item.key === 'MAINTENANCE' ? actual.toUpperCase() : actual;
    var expectedCmp = item.key === 'MAINTENANCE' ? item.value.toUpperCase() : item.value;
    if (actualCmp !== expectedCmp) {
      throw new Error('Ghi cấu hình thất bại khi xác minh lại: ' + item.key + ' — vui lòng thử lưu lại');
    }
  });

  if (changed.length) {
    _bustSettingsCache(); // phase-07 Lớp 4 — cấu hình vừa đổi phải hết cache ngay (không chờ TTL)
    logActivity(ss, 'SECURITY', changed.join(','), 'SETTINGS_UPDATED', payload._callerUser || 'owner');
  }
  return { updated: changed };
}

// ============================================================
// UNIFIED ID GENERATOR
// ============================================================

// R1 (2026-08-21) · Race order_id collision — VERIFIED an toàn:
//  - LockService.getScriptLock() serialize 2 execution cùng thời điểm.
//  - _peekNextIds đọc counter từ PropertiesService (không phụ thuộc getLastRow) → không lệch khi
//    có soft-delete hoặc row bị xoá tay.
//  - Bootstrap 1 lần từ Sheet nếu counter chưa có → migration an toàn.
//  Không cần refactor thêm. Blind spot R1 đã đóng.
function generateId(sheet, prefix, digits) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return _peekNextIds(sheet, prefix, digits, 1)[0];
  } finally {
    lock.releaseLock();
  }
}

// Batch (perf sprint 2026-08-06): sinh N ID kế tiếp trong 1 lần quét cột A. Dùng khi cần
// append nhiều dòng cùng lúc (OrderItems, InventoryMovements của 1 đơn) → thay N × generateId
// (N × waitLock + N × full-scan) bằng 1 lần. Race window bằng bản gốc: đều "gen rồi ghi", không
// atomic — nhưng số ID sinh cùng nhau nên tổng xác suất trùng không tăng.
function generateIdsBatch(sheet, prefix, digits, count) {
  if (!count || count < 1) return [];
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return _peekNextIds(sheet, prefix, digits, count);
  } finally {
    lock.releaseLock();
  }
}

// Internal — không bọc lock, caller đã bọc. The first request bootstraps the counter by scanning
// existing IDs; later requests reserve IDs in Script Properties instead of reading the whole sheet.
// Gaps after a failed write are intentional: IDs are identifiers, not a business sequence.
function _peekNextIds(sheet, prefix, digits, count) {
  var props = PropertiesService.getScriptProperties();
  var key = 'MOPS_ID_COUNTER_' + prefix + '_' + String(sheet.getName()).replace(/[^A-Za-z0-9_]/g, '_');
  var stored = Number(props.getProperty(key));
  var maxNum = isFinite(stored) && stored >= 0 ? stored : 0;
  if (!stored && sheet.getLastRow() > 1) {
    var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var id = String(ids[i][0]);
      if (id.indexOf(prefix) === 0) {
        var num = parseInt(id.slice(prefix.length), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  }
  var out = [];
  for (var j = 1; j <= count; j++) {
    out.push(prefix + String(maxNum + j).padStart(digits, '0'));
  }
  props.setProperty(key, String(maxNum + count));
  return out;
}

// ============================================================
// UTILITIES
// ============================================================

function normalizePhone(phone) {
  var p = String(phone || '').replace(/[\s\-\.\(\)]/g, '');
  if (p.indexOf('+84') === 0) p = '0' + p.slice(3);
  if (/^84\d{9}$/.test(p))   p = '0' + p.slice(2);
  return p;
}

// Chống Google Sheets formula injection (giá trị bắt đầu bằng =/+/-/@ bị Sheets
// hiểu thành công thức) + cắt độ dài. Dùng cho mọi field tự do trước khi ghi sheet.
function _sanitizeText(s, maxLen) {
  var t = String(s == null ? '' : s).trim();
  if (t && /^[=+\-@]/.test(t)) t = "'" + t;
  if (maxLen && t.length > maxLen) t = t.slice(0, maxLen);
  return t;
}

// Ép định dạng "Số" cho các cột tiền/số lượng ngay sau khi ghi. appendRow() kế
// thừa định dạng Ô của dòng liền trên; nếu dòng đó từng bị định dạng thành
// Ngày tháng (vd nhập tay lúc test, hoặc do 1 lần ghi lỗi trước đây), Apps
// Script getValues() sẽ trả về đối tượng Date cho dòng MỚI dù giá trị ghi vào
// vẫn là number thuần — Number(dateObj) sau đó ra mili-giây từ 1970, một số
// khổng lồ vô nghĩa. Đây chính là nguyên nhân "Tổng tiền" hiện sai kiểu
// "84.190.867.200.000 ₫" dù giá trị gốc chỉ là 1.000.000. Ép "#,##0" ngay sau
// appendRow (không cần ghi lại value — chỉ format ảnh hưởng cách getValue() suy
// ra kiểu dữ liệu khi đọc lại, giá trị số gốc bên dưới không đổi).
function _forceNumberFormat(sheet, rowNum, cols) {
  cols.forEach(function(col) {
    sheet.getRange(rowNum, col).setNumberFormat('#,##0');
  });
}

// Cùng gốc bệnh, ngược hướng xử lý: cột số điện thoại (toàn chữ số, thường bắt
// đầu bằng 0) bị Sheets tự nhận dạng thành Number nếu kế thừa định dạng "Automatic"
// — 0912345678 bị lưu thành 912345678, MẤT số 0 đầu vĩnh viễn. Từ đó, upsertCustomer()
// so sánh chuỗi số điện thoại mới ("0912345678") với giá trị đọc lại ("912345678")
// không bao giờ khớp → mỗi lần đặt hàng lại tạo 1 khách hàng MỚI thay vì nhận
// diện lại khách cũ, và tìm khách theo SĐT trên tab Khách hàng cũng không ra
// kết quả. Ép "Plain text" (@) TRƯỚC khi ghi để số 0 đầu không bao giờ bị rụng.
function _forcePlainText(sheet, rowNum, cols) {
  cols.forEach(function(col) {
    sheet.getRange(rowNum, col).setNumberFormat('@');
  });
}

// Nguồn sự thật DUY NHẤT cho "đã có tài khoản nhận tiền chưa" — dùng bởi
// buildVietQRUrl() (chặn sinh QR vỡ) và _isPaymentConfigured() (banner admin UI).
// Nhận thẳng `settings` (không phải `ss`) vì hầu hết caller đã có settings sẵn
// trong scope — tránh đọc lại Settings sheet lần nữa.
function _hasBankConfig(settings) {
  return !!(settings && settings.BANK_CODE && settings.ACCOUNT_NO);
}

// UrlFetchApp từ chối URL có login:password nhúng thẳng (https://user:pass@host/...)
// với lỗi "Login information disallowed" — đây là hạn chế bảo mật GAS áp dụng cho
// mọi request, không riêng SAPO. Header Authorization: Basic là cách đúng để xác
// thực HTTP Basic Auth qua UrlFetchApp.
function _sapoAuthHeaders(apiKey, secret) {
  return { 'Authorization': 'Basic ' + Utilities.base64Encode(apiKey + ':' + secret) };
}

// Chuẩn hoá cấu hình legacy trong Settings (BANK_CODE/ACCOUNT_NO/ACCOUNT_NAME) thành 1 "tài khoản
// nhận tiền" cùng shape với BankAccounts — dùng làm fallback cuối cho store chưa tạo BankAccounts nào.
function _settingsAsBankAccount(settings) {
  if (!settings || !settings.BANK_CODE || !settings.ACCOUNT_NO) return null;
  return {
    bank_account_id: '', bank_code: settings.BANK_CODE,
    account_no: settings.ACCOUNT_NO, account_name: settings.ACCOUNT_NAME || ''
  };
}

// Có ÍT NHẤT 1 tài khoản nhận tiền khả dụng không? (BankAccounts Active HOẶC cấu hình legacy Settings).
// Dùng cho guard sớm ở createOrder — chặn trước khi ghi sheet nếu store chưa cấu hình gì.
function _hasAnyReceivingBank(ss, settings) {
  var accounts = _memo('__bank_accounts_all', function() { return Repository.BankAccounts.findAll(); });
  if (accounts.some(function(a) { return a.active; })) return true;
  return _hasBankConfig(settings);
}

// Chọn tài khoản ngân hàng nhận VietQR cho 1 đơn theo chi nhánh (2026-07-21). Thứ tự ưu tiên:
//   1. TK mặc định của CHÍNH chi nhánh đơn (Branches.DefaultBankAccountID, còn Active)
//   2. TK mặc định của CHI NHÁNH CHÍNH (Branches.IsDefault) — khi chi nhánh đơn không cấu hình
//   3. TK default TOÀN CỤC (BankAccounts.IsDefault, còn Active)
//   4. TK Active bất kỳ đầu tiên
//   5. Cấu hình legacy trong Settings (BANK_CODE/ACCOUNT_NO) — tương thích ngược store cũ
// Trả { bank_account_id, bank_code, account_no, account_name } hoặc null nếu không có gì.
function _resolveBankAccount(ss, branchId, settings) {
  var accounts = _memo('__bank_accounts_all', function() { return Repository.BankAccounts.findAll(); });
  var branches = _memo('__branches_all', function() { return Repository.Branches.findAll(); });
  function pick(id) {
    if (!id) return null;
    var a = accounts.filter(function(x) { return x.bank_account_id === String(id); })[0] || null;
    return (a && a.active) ? a : null;
  }
  var branch = branchId ? (branches.filter(function(b) { return b.branch_id === String(branchId); })[0] || null) : null;
  var hit = branch ? pick(branch.default_bank_account_id) : null;                 // (1)
  if (!hit) {                                                                     // (2)
    var mainBranch = branches.filter(function(b) { return b.active && b.is_default; })[0] || null;
    if (mainBranch) hit = pick(mainBranch.default_bank_account_id);
  }
  if (!hit) hit = accounts.filter(function(a) { return a.active && a.is_default; })[0] || null; // (3)
  if (!hit) hit = accounts.filter(function(a) { return a.active; })[0] || null; // (4)
  if (hit) {
    return {
      bank_account_id: hit.bank_account_id, bank_code: hit.bank_code,
      account_no: hit.account_no, account_name: hit.account_name
    };
  }
  return _settingsAsBankAccount(settings || getSettings(ss));                      // (5)
}

function buildVietQRUrl(bankAccount, amount, transferContent) {
  // Chặn sớm — thiếu bank_code/account_no trước đây sinh ra URL vỡ dạng
  // "undefined-xxxx-compact2.png" mà VietQR trả lỗi "invalid acqId" khó hiểu với
  // khách. bankAccount = { bank_code, account_no, account_name } (từ _resolveBankAccount).
  // Caller tạo đơn (createOrder) tự resolve + kiểm tra TRƯỚC khi ghi sheet — guard ở đây
  // chỉ là lưới an toàn cuối cho caller khác (vd getOrder khi hiển thị lại QR đơn đã tồn tại).
  if (!bankAccount || !bankAccount.bank_code || !bankAccount.account_no) {
    throw new Error('Chưa cấu hình tài khoản nhận tiền (Mã ngân hàng / Số tài khoản) — vào MOPS Admin > Chi nhánh > Tài khoản ngân hàng để thêm.');
  }
  return 'https://img.vietqr.io/image/'
    + bankAccount.bank_code + '-' + bankAccount.account_no + '-compact2.png'
    + '?amount='      + amount
    + '&addInfo='     + encodeURIComponent(transferContent)
    + '&accountName=' + encodeURIComponent(bankAccount.account_name || '');
}

function nowIso() {
  return new Date().toISOString();
}

// ============================================================
// STAFF AUTH
// ============================================================

// SECURITY (2026-09-05): pepper trước đây hardcode thẳng trong source ('MOPS_PHARMA_2026') — bất kỳ
// ai có quyền mở Apps Script Editor thấy ngay, và nếu cột password_hash trong Staffs bị lộ, offline
// brute-force không cần đoán pepper vì nó đã công khai trong code. Chuyển sang PropertiesService,
// GIỮ NGUYÊN literal cũ làm fallback mặc định — mọi password_hash đã lưu vẫn khớp y hệt cho tới khi
// (nếu) admin chủ động đặt Script Property PASSWORD_PEPPER mới (lúc đó cần buộc reset mật khẩu toàn
// bộ staff, vì đổi pepper mà không đổi password_hash cũ sẽ làm mọi tài khoản đăng nhập sai).
function _getPasswordPepper() {
  try {
    return PropertiesService.getScriptProperties().getProperty('PASSWORD_PEPPER') || 'MOPS_PHARMA_2026';
  } catch (e) { return 'MOPS_PHARMA_2026'; }
}

// username must be lowercase-normalized before passing in (matches staffLogin lookup)
function _hashPassword(username, password) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    username + password + _getPasswordPepper(),
    Utilities.Charset.UTF_8
  );
  return digest.map(function(b) {
    return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0');
  }).join('');
}

function requireStaffToken(token) {
  if (!token) throw new Error('Yêu cầu đăng nhập (token thiếu)');
  var cached = CacheService.getScriptCache().get('mops_staff_token_' + token);
  if (!cached) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      logActivity(ss, 'SECURITY', token.substring(0, 8) + '…', 'TOKEN_EXPIRED', 'unknown');
    } catch(ex) {}
    throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại');
  }
  return JSON.parse(cached);
}

function staffLogin(payload) {
  var username = String(payload.username || '').trim().toLowerCase();
  var password = String(payload.password || '');
  if (!username || !password) throw new Error('Username và password là bắt buộc');

  // R8 (2026-08-21) · Rate limit sliding window trước mọi Sheet read — 5 attempt / 15 phút / username.
  // Throw sớm nếu vượt ngưỡng để attacker không nạp được stress lên GAS execution quota.
  _checkLoginRate(username);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.STAFFS);
  if (!sh || sh.getLastRow() < 2) throw new Error('Chưa có nhân viên trong hệ thống');

  var data      = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
  var staff     = null;
  var staffRow  = -1; // 1-based sheet row for LastLogin write
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][1]).trim().toLowerCase() === username) {
      staffRow = i + 2;
      staff = {
        id:            String(data[i][0]),
        username:      String(data[i][1]).trim().toLowerCase(),
        password_hash: String(data[i][2]),
        role:          String(data[i][3] || 'staff').toLowerCase(),
        name:          String(data[i][4] || data[i][1]),
        active:        data[i][5] === true || String(data[i][5]).toLowerCase() === 'true'
      };
      break;
    }
  }

  // R7 (2026-08-21) · Chống user enumeration + timing attack:
  //  1. Luôn chạy _hashPassword (~1-2ms) kể cả khi user không tồn tại — thời gian phản hồi bằng nhau.
  //  2. Compare bằng _timingSafeEqual (double-HMAC, không short-circuit ở byte đầu khác).
  var candidateHash = _hashPassword(username, password);
  var storedHash = (staff && staff.password_hash) ? staff.password_hash : 'DUMMY_HASH_NOT_STORED_ANYWHERE_ZZZZZZZZZ';
  var hashMatch = _timingSafeEqual(candidateHash, storedHash);

  // Anti-enumeration: cùng 1 message cho mọi failure path.
  var GENERIC_LOGIN_ERROR = 'Sai tên đăng nhập hoặc mật khẩu';
  if (!staff || !hashMatch) {
    _recordLoginFailure(username);
    try { logActivity(ss, 'SECURITY', '', 'LOGIN_FAILED', username); } catch(ex) {}
    throw new Error(GENERIC_LOGIN_ERROR);
  }
  if (!staff.active) {
    _recordLoginFailure(username);
    try { logActivity(ss, 'SECURITY', '', 'LOGIN_FAILED', username + ' [INACTIVE]'); } catch(ex) {}
    throw new Error('Tài khoản đã bị vô hiệu hoá');
  }
  // Thành công → reset rate-limit bucket của username này.
  _resetLoginRate(username);

  // 21600s = 6h — the hard maximum TTL CacheService allows; cannot be extended.
  // A stolen token is valid for at most this long, then requireStaffToken()
  // rejects it and the user must log in again. issued_at/expires_at are stored
  // so the frontend can show a real session countdown instead of assuming
  // tokens never expire.
  var TOKEN_TTL_SECONDS = 21600;
  var token    = Utilities.getUuid().replace(/-/g, '');
  var issuedAt = nowIso();
  CacheService.getScriptCache().put(
    'mops_staff_token_' + token,
    JSON.stringify({
      staff_id:   staff.id,
      username:   staff.username,
      role:       staff.role,
      name:       staff.name,
      issued_at:  issuedAt,
      expires_at: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString()
    }),
    TOKEN_TTL_SECONDS
  );

  // Write LastLogin (col H=8). Col I (LastIP) left blank — GAS web apps cannot access client IP.
  if (staffRow > 0) {
    try { sh.getRange(staffRow, 8).setValue(nowIso()); } catch(e) {}
  }

  try { logActivity(ss, 'SECURITY', '', 'LOGIN_SUCCESS', username); } catch(ex) {}
  return {
    token: token,
    staff: { id: staff.id, name: staff.name, role: staff.role },
    expires_at: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(),
    payment_configured: _isPaymentConfigured(ss),
    can_view_finance: _canViewFinance(staff.role)
  };
}

function staffMe(params) {
  var staff = requireStaffToken(params.token);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return { staff: staff, payment_configured: _isPaymentConfigured(ss), can_view_finance: _canViewFinance(staff.role) };
}

// Bắt buộc kiểm tra trước khi cho phép nhận đơn — thiếu 1 trong 2 giá trị này
// khiến buildVietQRUrl() sinh URL vỡ ("undefined-xxxx-compact2.png"). Trả về
// cho mọi role (không chỉ OWNER) để admin UI hiện banner bắt buộc cấu hình
// ngay khi đăng nhập, không cần đợi staff mở tab Cấu hình (vốn chỉ OWNER thấy).
//
// try/catch cố ý: staffMe()/staffLogin() gọi hàm này trên MỌI lần đăng nhập/
// kiểm tra phiên — 1 lỗi đọc Settings sheet (đổi tên, xoá, mất quyền) không
// được phép làm sập luôn cả đăng nhập của toàn bộ nhân viên (kể cả OWNER).
// Lỗi đọc → coi như "chưa cấu hình", banner cảnh báo hiện ra, nhưng vẫn đăng
// nhập được để owner còn vào sửa.
function _isPaymentConfigured(ss) {
  try {
    // 2026-07-21: "đã cấu hình" khi có TK trong BankAccounts HOẶC cấu hình legacy Settings.
    return _hasAnyReceivingBank(ss, getSettings(ss));
  } catch (ex) {
    return false;
  }
}

function staffLogout(payload) {
  if (payload.token) {
    // Log BEFORE removing — read cached staff info first for attribution
    try {
      var cached = CacheService.getScriptCache().get('mops_staff_token_' + payload.token);
      if (cached) {
        var s  = JSON.parse(cached);
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        logActivity(ss, 'SECURITY', '', 'LOGOUT', s.username);
      }
    } catch(ex) {}
    CacheService.getScriptCache().remove('mops_staff_token_' + payload.token);
  }
  return { logged_out: true };
}

// ============================================================
// PERMISSIONS — V2.2 Role-based access control
//
//  Permissions sheet: Role (col A) | Permission (col B)
//  OWNER gets wildcard '*' — bypasses all checks.
//  Cache per role (3600s); invalidate when permissions sheet is saved.
// ============================================================

function _getPermissions(role) {
  var key    = 'mops_perms_' + role;
  var cached = CacheService.getScriptCache().get(key);
  if (cached) return JSON.parse(cached);

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sh    = ss.getSheetByName(SHEET.PERMISSIONS);
  var perms = [];
  if (sh && sh.getLastRow() > 1) {
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === role) {
        var p = String(data[i][1]).trim();
        if (p) perms.push(p);
      }
    }
    // Cho phép dùng role nghiệp vụ MANAGER ngay cả khi sheet Permissions chưa
    // được seed riêng: baseline của MANAGER mặc định kế thừa ADMIN.
    if (role === 'MANAGER' && !perms.length) {
      for (var mi = 0; mi < data.length; mi++) {
        if (String(data[mi][0]).trim().toUpperCase() === 'ADMIN') {
          var inheritedPerm = String(data[mi][1]).trim();
          if (inheritedPerm) perms.push(inheritedPerm);
        }
      }
    }
  }
  CacheService.getScriptCache().put(key, JSON.stringify(perms), 3600);
  return perms;
}

// Dùng để gate tab Tài chính client-side (khoá + toast ngay khi bấm, không
// chờ round-trip riêng) — trả kèm trong staffLogin()/staffMe() giống pattern
// payment_configured. Quyền thật vẫn đi qua checkPermission('reports.finance.view')
// ở mọi action đọc dữ liệu tài chính — cờ này chỉ phục vụ UI, không phải nguồn
// xác thực duy nhất.
function _canViewFinance(role) {
  var r = (role || 'staff').toUpperCase();
  if (r === 'OWNER') return true;
  var perms = _getPermissions(r);
  return perms.indexOf('*') !== -1 || perms.indexOf('reports.finance.view') !== -1;
}

// Hạn mức % chiết khấu tự ý theo Role (docs/mops.md §16) — RBAC lookup 2 cột, cùng dạng
// Permissions. Cache 3600s giống _getPermissions(). OWNER bypass BẰNG CODE (không phải 1 dòng
// trong Sheet có thể bị xoá/gõ sai khoá luôn Owner). Role không có dòng trong DiscountLimits →
// fail-closed 0, KHÔNG unlimited — mọi chiết khấu thủ công của Role đó bị chặn cho tới khi Owner
// tự thêm dòng.
function _getMaxDiscountPercent(role) {
  var r = (role || 'staff').toUpperCase();
  if (r === 'OWNER') return Infinity;
  var key    = 'mops_disclimit_' + r;
  var cached = CacheService.getScriptCache().get(key);
  if (cached !== null) return Number(cached);

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sh    = ss.getSheetByName(SHEET.DISCOUNT_LIMITS);
  var limit = 0;
  if (sh && sh.getLastRow() > 1) {
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === r) { limit = Number(data[i][1]) || 0; break; }
    }
  }
  CacheService.getScriptCache().put(key, String(limit), 3600);
  return limit;
}

// Tra khách hàng theo Phone (khoá tự nhiên, giống upsertCustomer()) — dùng trong createOrder() để
// server tự đọc CustomerGroup/DefaultDiscountPercent, KHÔNG tin số client gửi cho phần Sỉ (§16).
// Trả null nếu khách chưa tồn tại (khách mới — luôn coi là LẺ, không có chiết khấu tự động).
function _findCustomerByPhone(ss, phone) {
  var key = String(phone || '');
  _REQ.__customerByPhone = _REQ.__customerByPhone || {};
  if (Object.prototype.hasOwnProperty.call(_REQ.__customerByPhone, key)) return _REQ.__customerByPhone[key];
  // Đọc qua Repository.Customers (phase-07 GĐ3.4) — giữ shape {customer_id, group, default_discount_percent}.
  var c = Repository.Customers.findByPhone(phone);
  var out = c ? {
    customer_id: c.customer_id,
    group: c.customer_group || 'LẺ',
    default_discount_percent: c.default_discount_percent,
    _row: c._row,
    phone: c.phone,
    name: c.name,
    email: c.email
  } : null;
  _REQ.__customerByPhone[key] = out;
  return out;
}

// THE core V2.2 function — every sensitive endpoint goes through this.
// Returns staff object if allowed; throws otherwise.
// PERMISSION_DENIED is logged before throwing.
function checkPermission(token, permission) {
  var staff = requireStaffToken(token);
  var role  = (staff.role || 'staff').toUpperCase();

  if (role === 'OWNER') return staff;          // wildcard bypass

  var perms = _getPermissions(role);
  if (perms.indexOf('*') !== -1) return staff; // role-level wildcard
  if (perms.indexOf(permission) !== -1) return staff;

  // 2026-07-10 (review 16) — quyền theo TỪNG NGƯỜI, cộng thêm vào quyền theo Role (UNION, không
  // thay thế) — vì "chia theo Role rất chung chung" (staff/accountant chỉ 2 nhóm, không đủ chi
  // tiết). Role vẫn giữ vai trò baseline + vẫn dùng cho các chỗ owner-protection khác
  // (updateStaff/toggleStaffActive/resetStaffPassword) — không xoá bỏ, chỉ cộng thêm lớp này.
  var staffPerms = _getStaffPermissions(String(staff.staff_id || ''));
  if (staffPerms.indexOf(permission) !== -1) return staff;

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    logActivity(ss, 'SECURITY', permission, 'PERMISSION_DENIED',
      staff.username + ' [' + role + ']');
  } catch(ex) {}
  throw new Error('Không có quyền thực hiện: ' + permission);
}

// ============================================================
// PERMISSIONS THEO TỪNG NGƯỜI — StaffPermissions sheet (docs/mops.md §11, review 16)
// Cột: StaffID | Permission (1 dòng / 1 quyền, giống mẫu Permissions Role|Permission nhưng
// khoá theo StaffID). Sheet này PHẢI TẠO TAY — setupSheet() không tự tạo, cùng chủ đích với
// Staffs/Permissions (bắt buộc chủ động thiết lập, không để trống rồi quên).
// ============================================================

// Danh mục ĐẦY ĐỦ mọi permission string thật mà checkPermission() đang kiểm tra trong toàn bộ
// code.gs — nhóm theo mục quản lý để UI Admin render multi-select checkbox theo nhóm. Đây LÀ
// nguồn sự thật cho danh sách quyền — thêm permission mới ở đâu trong code thì PHẢI thêm vào
// đây, không thì quyền đó không chọn được qua UI multi-select (chỉ gán được bằng tay qua sheet).
var PERMISSION_CATALOG = [
  { group: 'Quản lý bán hàng', permissions: [
    { key: 'orders.view',       label: 'Xem đơn hàng' },
    { key: 'orders.create',     label: 'Tạo đơn hàng' },
    { key: 'orders.edit',       label: 'Sửa đơn hàng' },
    { key: 'orders.sapo_push',  label: 'Đẩy đơn lên SAPO' },
    { key: 'orders.sapo_pull',  label: 'Kéo đơn từ SAPO về' }
  ]},
  { group: 'Quản lý sản phẩm & kho', permissions: [
    { key: 'products.sync',     label: 'Đồng bộ sản phẩm từ SAPO' },
    { key: 'products.create',   label: 'Tạo sản phẩm mới (LOCAL)' },
    { key: 'products.edit',     label: 'Sửa giá/tên/tồn kho sản phẩm' },
    { key: 'inventory.view',    label: 'Xem tồn kho' },
    { key: 'inventory.manage',  label: 'Quản lý nhập hàng & nhà cung cấp' }
  ]},
  { group: 'Quản lý khách hàng', permissions: [
    { key: 'customers.view',    label: 'Xem thông tin khách hàng' },
    { key: 'customers.edit',    label: 'Sửa Nhóm khách/% chiết khấu mặc định' }
  ]},
  { group: 'Thanh toán & Mã giảm giá', permissions: [
    { key: 'payments.view',     label: 'Xem giao dịch thanh toán' },
    { key: 'coupons.manage',    label: 'Quản lý mã giảm giá' }
  ]},
  { group: 'Quản lý tài chính', permissions: [
    { key: 'finance.view',      label: 'Xem sổ quỹ & báo cáo tài chính' },
    { key: 'finance.create',   label: 'Tạo phiếu thu / phiếu chi' },
    { key: 'finance.post',     label: 'Ghi sổ (Post) phiếu' },
    { key: 'finance.approve',  label: 'Duyệt phiếu chi / điều chỉnh quỹ' },
    { key: 'finance.cancel',   label: 'Huỷ phiếu đã ghi sổ' },
    { key: 'finance.admin',    label: 'Quản trị tài khoản quỹ & danh mục' },
    { key: 'expenses.manage',  label: 'Quản lý Thu Chi (V1 — CashTransactions)' }
  ]},
  { group: 'Báo cáo', permissions: [
    { key: 'reports.view',         label: 'Xem báo cáo chung' },
    { key: 'reports.finance.view', label: 'Xem báo cáo tài chính' }
  ]},
  { group: 'Hệ thống & Nhân sự', permissions: [
    { key: 'staff.manage',        label: 'Quản lý nhân viên & phân quyền' },
    { key: 'branches.manage',     label: 'Quản lý chi nhánh' },
    { key: 'notifications.view',  label: 'Xem lịch sử thông báo' },
    { key: 'audit.view',          label: 'Xem nhật ký audit' }
  ]}
];

// Permission NHẠY CẢM — chỉ OWNER được gán/gỡ những quyền này cho người khác qua
// setStaffPermissions(), tránh 1 admin có staff.manage tự cấp thêm quyền cao hơn cho ai đó
// (leo thang quyền qua đường multi-select, khác đường đổi Role đã chặn ở updateStaff()).
var SENSITIVE_PERMISSIONS = ['staff.manage', 'finance.admin', 'finance.approve'];

function _getStaffPermissions(staffId) {
  if (!staffId) return [];
  var key    = 'mops_staff_perms_' + staffId;
  var cached = CacheService.getScriptCache().get(key);
  if (cached) return JSON.parse(cached);

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sh    = ss.getSheetByName(SHEET.STAFF_PERMISSIONS);
  var perms = [];
  if (sh && sh.getLastRow() > 1) {
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === staffId) {
        var p = String(data[i][1]).trim();
        if (p) perms.push(p);
      }
    }
  }
  CacheService.getScriptCache().put(key, JSON.stringify(perms), 3600);
  return perms;
}

function _invalidateStaffPermissionsCache(staffId) {
  try { CacheService.getScriptCache().remove('mops_staff_perms_' + staffId); } catch (ex) {}
}

function listPermissionCatalog() {
  return { catalog: PERMISSION_CATALOG };
}

function getStaffPermissions(params) {
  var staffId = String(params.staff_id || '').trim();
  if (!staffId) throw new Error('staff_id là bắt buộc');
  return { staff_id: staffId, permissions: _getStaffPermissions(staffId) };
}

// Multi-select "lưu" = GHI ĐÈ TOÀN BỘ danh sách quyền của 1 người (payload.permissions là danh
// sách cuối cùng sau khi admin tick/untick checkbox trên UI) — xoá hết dòng cũ của StaffID đó,
// ghi lại đúng danh sách mới. Đơn giản hơn tính diff thêm/xoá từng dòng, và tránh sót dòng rác
// nếu UI gửi thiếu 1 quyền do lỗi mạng giữa 2 lần lưu.
function setStaffPermissions(payload) {
  var staffId = String(payload.staff_id || '').trim();
  var newPerms = payload.permissions || [];
  if (!staffId) throw new Error('staff_id là bắt buộc');
  if (!Array.isArray(newPerms)) throw new Error('permissions phải là 1 danh sách (array)');

  var caller     = requireStaffToken(payload.token);
  var callerRole = (caller.role || '').toLowerCase();
  var callerId   = String(caller.staff_id || '');

  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var staffSh = ss.getSheetByName(SHEET.STAFFS);
  var target  = _getStaffById(staffSh, staffId);
  if (!target) throw new Error('Không tìm thấy nhân viên: ' + staffId);

  if (target.role === 'owner' && callerRole !== 'owner') {
    throw new Error('Không thể sửa quyền tài khoản OWNER');
  }

  // Validate: chỉ nhận permission có trong danh mục thật (chặn gõ tay string bậy qua API).
  var validKeys = {};
  PERMISSION_CATALOG.forEach(function(g) { g.permissions.forEach(function(p) { validKeys[p.key] = true; }); });
  newPerms.forEach(function(p) {
    if (!validKeys[p]) throw new Error('Permission không hợp lệ: ' + p);
  });

  // Chặn leo thang quyền nhạy cảm — chỉ OWNER được cấp/gỡ staff.manage/finance.admin/
  // finance.approve cho NGƯỜI KHÁC (không áp dụng khi caller tự sửa mình — nhưng
  // setStaffPermissions() vốn đã đòi quyền staff.manage nên staff thường không gọi được hàm
  // này cho chính họ theo cách vòng qua).
  if (callerRole !== 'owner') {
    var oldPerms = _getStaffPermissions(staffId);
    var oldSet = {}; oldPerms.forEach(function(p) { oldSet[p] = true; });
    var newSet = {}; newPerms.forEach(function(p) { newSet[p] = true; });
    SENSITIVE_PERMISSIONS.forEach(function(sp) {
      if (newSet[sp] && !oldSet[sp]) {
        throw new Error('Chỉ OWNER mới được cấp quyền "' + sp + '" cho người khác');
      }
    });
  }

  var sh = ss.getSheetByName(SHEET.STAFF_PERMISSIONS);
  if (!sh) throw new Error('Sheet StaffPermissions không tồn tại — tạo tay theo docs/mops.md §11');

  // Xoá toàn bộ dòng cũ của StaffID này (từ dưới lên để không lệch index khi deleteRow).
  var lastRow = sh.getLastRow();
  if (lastRow > 1) {
    var data = sh.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = data.length - 1; i >= 0; i--) {
      if (String(data[i][0]).trim() === staffId) sh.deleteRow(i + 2);
    }
  }
  newPerms.forEach(function(p) { sh.appendRow([staffId, p]); });

  _invalidateStaffPermissionsCache(staffId);
  logActivity(ss, 'SECURITY', staffId, 'STAFF_PERMISSIONS_UPDATED', caller.username || callerId);
  logAuditTrail(ss, 'STAFF', staffId, 'PERMISSIONS_SET', null, { permissions: newPerms }, '', callerId);
  return { staff_id: staffId, permissions: newPerms };
}

// Hard OWNER-only gate — bypasses the Permissions sheet entirely (an ADMIN
// with a '*' wildcard row must NOT get access to raw secrets management).
// Used for: Settings tab (bank account, SAPO/Telegram credentials).
function requireOwner(token) {
  var staff = requireStaffToken(token);
  if ((staff.role || '').toUpperCase() !== 'OWNER') {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      logActivity(ss, 'SECURITY', 'settings', 'PERMISSION_DENIED', staff.username + ' [' + staff.role + ']');
    } catch(ex) {}
    throw new Error('Chỉ chủ tài khoản (OWNER) mới được truy cập Cấu hình hệ thống');
  }
  return staff;
}

// Call after saving Permissions sheet to force re-read from sheet.
function invalidatePermissionsCache(role) {
  try {
    CacheService.getScriptCache().remove('mops_perms_' + (role || '').toUpperCase());
  } catch(ex) {}
}

// ============================================================
// STAFF MANAGEMENT — V2.2
//  All endpoints protected by checkPermission(token, 'staff.manage')
//  in the doPost/doGet router.
// ============================================================

function listStaffs(params) {
  // Cột M/N/O (address/province/ward, review 2026-07-16 — 2 cấp, bỏ Huyện) đọc qua Repository.Staff.
  // Sheet Staffs KHÔNG có writeHeader() tự động (thiết lập tay) — findAll robust theo getLastColumn.
  var staffs = Repository.Staff.findAll().map(function(s) {
    return {
      id:          s.id,
      username:    s.username,
      role:        s.role,
      name:        s.name,
      active:      s.active,
      created_at:  s.created_at,
      last_login:  s.last_login,
      telegram_id: s.telegram_id,
      avatar:      s.avatar,
      notes:       s.notes,
      address:     s.address,
      province:    s.province,
      ward:        s.ward
    };
  });
  return { staffs: staffs };
}

function createStaff(payload) {
  var username   = String(payload.username || '').trim().toLowerCase();
  var password   = String(payload.password || '');
  var role       = String(payload.role || 'staff').toLowerCase();
  var name       = String(payload.name || username);
  var telegramId = String(payload.telegram_chat_id || '').trim();

  if (!username || !password) throw new Error('Username và password là bắt buộc');
  if (password.length < 8)    throw new Error('Mật khẩu phải ít nhất 8 ký tự');
  if (['owner','admin','manager','accountant','staff'].indexOf(role) === -1)
    throw new Error('Role không hợp lệ: ' + role);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.STAFFS);
  if (!sh) throw new Error('Sheet Staffs không tồn tại');

  // Unique username check
  if (sh.getLastRow() > 1) {
    var existing = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i][0]).trim().toLowerCase() === username)
        throw new Error('Username đã tồn tại: ' + username);
    }
  }

  var dateStr = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var staffId = 'S' + dateStr + String(sh.getLastRow()).padStart(3, '0');
  var hash    = _hashPassword(username, password);
  var now     = nowIso();

  // A=id B=username C=hash D=role E=name F=active G=created H=lastlogin I=lastip J=telegram K=avatar
  // L=notes M=address N=province O=ward
  sh.appendRow([staffId, username, hash, role, name, true, now, '', '', telegramId, '', '',
    _sanitizeText(payload.address || '', 200), _sanitizeText(payload.province || '', 100), _sanitizeText(payload.ward || '', 100)]);

  logActivity(ss, 'SECURITY', staffId, 'STAFF_CREATED', payload._caller || staffId);
  return { id: staffId, username: username, role: role };
}

// Admin sửa thông tin + quyền (Role) của 1 nhân viên khác — khác resetStaffPassword() (đổi mật
// khẩu) và toggleStaffActive() (bật/tắt) đã có sẵn, hàm này gộp các field còn lại: tên hiển thị,
// Role (= quyền, vì Permissions gán theo Role — đổi Role là đổi quyền ngay), Telegram, Avatar,
// Notes. KHÔNG đổi Username/Password/Active ở đây — đã có hàm riêng cho 2 cái sau, Username là
// định danh không nên đổi (tránh nhầm lẫn lịch sử log).
function updateStaff(payload) {
  var staffId = String(payload.staff_id || '').trim();
  if (!staffId) throw new Error('staff_id là bắt buộc');

  var caller     = requireStaffToken(payload.token);
  var callerRole = (caller.role || '').toLowerCase();
  var callerId   = String(caller.staff_id || '');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.STAFFS);
  var target = _getStaffById(sh, staffId);
  if (!target) throw new Error('Không tìm thấy nhân viên: ' + staffId);

  // Owner protection — chỉ OWNER được sửa tài khoản OWNER khác, VÀ chỉ OWNER được thăng ai đó
  // lên role owner (chặn leo thang quyền — 1 admin không tự phong owner cho người khác được).
  if (target.role === 'owner' && callerRole !== 'owner') {
    throw new Error('Không thể sửa tài khoản OWNER');
  }
  var newRole = payload.role !== undefined ? String(payload.role).toLowerCase() : null;
  if (newRole) {
    if (['owner','admin','manager','accountant','staff'].indexOf(newRole) === -1) {
      throw new Error('Role không hợp lệ: ' + newRole);
    }
    if (newRole === 'owner' && callerRole !== 'owner') {
      throw new Error('Chỉ OWNER mới được cấp quyền OWNER cho người khác');
    }
    // Không tự đổi role của chính mình qua đường admin — tránh tự khoá nhầm quyền, dùng
    // updateMyProfile() cho việc tự sửa (không đổi được role ở đó, đúng chủ đích).
    if (staffId === callerId) {
      throw new Error('Không thể tự đổi Role của chính mình — nhờ 1 owner/admin khác đổi giúp');
    }
  }

  var before = { role: target.role };
  if (newRole)                                sh.getRange(target.row, 4).setValue(newRole);
  if (payload.name !== undefined)             sh.getRange(target.row, 5).setValue(_sanitizeText(payload.name, 100));
  if (payload.telegram_chat_id !== undefined) sh.getRange(target.row, 10).setValue(String(payload.telegram_chat_id).trim());
  if (payload.avatar !== undefined)           sh.getRange(target.row, 11).setValue(String(payload.avatar).trim());
  if (payload.notes !== undefined)            sh.getRange(target.row, 12).setValue(_sanitizeText(payload.notes, 500));
  if (payload.address !== undefined)          sh.getRange(target.row, 13).setValue(_sanitizeText(payload.address, 200));
  if (payload.province !== undefined)         sh.getRange(target.row, 14).setValue(_sanitizeText(payload.province, 100));
  if (payload.ward !== undefined)             sh.getRange(target.row, 15).setValue(_sanitizeText(payload.ward, 100));

  logActivity(ss, 'SECURITY', staffId, 'STAFF_UPDATED', caller.username || callerId);
  if (newRole) {
    logAuditTrail(ss, 'STAFF', staffId, 'ROLE_CHANGED', before, { role: newRole }, '', callerId);
  }
  return { staff_id: staffId, updated: true };
}

function listRolePermissions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.PERMISSIONS);
  if (!sh || sh.getLastRow() < 2) return { roles: {} };

  var data  = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  var roles = {};
  for (var i = 0; i < data.length; i++) {
    var role = String(data[i][0]).trim().toUpperCase();
    var perm = String(data[i][1]).trim();
    if (!role || !perm) continue;
    if (!roles[role]) roles[role] = [];
    roles[role].push(perm);
  }
  if (!roles.MANAGER && roles.ADMIN) roles.MANAGER = roles.ADMIN.slice();
  return { roles: roles };
}

// Đọc qua Repository.Staff.findById — GIỮ nguyên signature (sh không dùng, để tương thích mọi caller)
// và shape trả về {row, id, role, active} mà các hàm WRITE (updateStaff/toggle/reset/...) đang dùng
// để nhắm dòng setValue. sh của caller vẫn là cùng sheet → row khớp.
function _getStaffById(sh, staffId) {
  var s = Repository.Staff.findById(staffId);
  if (!s) return null;
  return { row: s._row, id: s.id, role: s.role, active: s.active };
}

function toggleStaffActive(payload) {
  var staffId = String(payload.staff_id || '').trim();
  if (!staffId) throw new Error('staff_id là bắt buộc');

  var caller     = requireStaffToken(payload.token);
  var callerRole = (caller.role || '').toLowerCase();
  var callerId   = String(caller.staff_id || '');

  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var sh     = ss.getSheetByName(SHEET.STAFFS);
  var target = _getStaffById(sh, staffId);
  if (!target) throw new Error('Không tìm thấy nhân viên: ' + staffId);

  // Owner protection — only OWNER can touch an OWNER account
  if (target.role === 'owner' && callerRole !== 'owner') {
    throw new Error('Không thể thay đổi tài khoản OWNER');
  }

  // Self-lock protection — prevent deactivating own account
  var newActive = !target.active;
  if (staffId === callerId && !newActive) {
    throw new Error('Không thể tự vô hiệu hoá tài khoản của chính mình');
  }

  sh.getRange(target.row, 6).setValue(newActive);
  logActivity(ss, 'SECURITY', staffId,
    newActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
    caller.username || callerId);
  return { staff_id: staffId, active: newActive };
}

function resetStaffPassword(payload) {
  var staffId  = String(payload.staff_id || '').trim();
  var newPass  = String(payload.new_password || '');
  if (!staffId || !newPass) throw new Error('staff_id và new_password là bắt buộc');
  if (newPass.length < 8)   throw new Error('Mật khẩu phải ít nhất 8 ký tự');

  var caller     = requireStaffToken(payload.token);
  var callerRole = (caller.role || '').toLowerCase();

  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var sh     = ss.getSheetByName(SHEET.STAFFS);
  var target = _getStaffById(sh, staffId);
  if (!target) throw new Error('Không tìm thấy nhân viên: ' + staffId);

  // Owner protection — only OWNER can reset an OWNER account
  if (target.role === 'owner' && callerRole !== 'owner') {
    throw new Error('Không thể reset mật khẩu tài khoản OWNER');
  }

  // Read username from col B for hash
  var uname   = String(sh.getRange(target.row, 2).getValue()).trim().toLowerCase();
  var newHash = _hashPassword(uname, newPass);
  sh.getRange(target.row, 3).setValue(newHash);
  logActivity(ss, 'SECURITY', staffId, 'PASSWORD_RESET',
    caller.username || String(caller.staff_id || ''));
  return { staff_id: staffId, reset: true };
}

// Tự chỉnh sửa thông tin CỦA CHÍNH MÌNH — chỉ cần token hợp lệ, KHÔNG cần quyền staff.manage
// (khác updateStaff(), dành cho admin sửa NGƯỜI KHÁC). Có chủ đích KHÔNG cho đổi ở đây: Role,
// Active, Username — tránh tự leo thang quyền hoặc tự khoá tài khoản qua đường tự sửa.
function updateMyProfile(payload) {
  var caller = requireStaffToken(payload.token);
  var staffId = String(caller.staff_id || '');
  if (!staffId) throw new Error('Không xác định được tài khoản đang đăng nhập');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.STAFFS);
  var target = _getStaffById(sh, staffId);
  if (!target) throw new Error('Không tìm thấy tài khoản của bạn — có thể đã bị xoá');

  if (payload.name !== undefined)             sh.getRange(target.row, 5).setValue(_sanitizeText(payload.name, 100));
  if (payload.telegram_chat_id !== undefined) sh.getRange(target.row, 10).setValue(String(payload.telegram_chat_id).trim());
  if (payload.avatar !== undefined)           sh.getRange(target.row, 11).setValue(String(payload.avatar).trim());
  if (payload.notes !== undefined)            sh.getRange(target.row, 12).setValue(_sanitizeText(payload.notes, 500));

  // Đổi mật khẩu — tuỳ chọn, bắt buộc xác nhận mật khẩu hiện tại (token còn hạn không có nghĩa
  // là được phép đổi mật khẩu vô điều kiện — 1 phiên bị lộ không nên đủ để chiếm hẳn tài khoản).
  if (payload.new_password) {
    var newPass = String(payload.new_password);
    if (newPass.length < 8) throw new Error('Mật khẩu mới phải ít nhất 8 ký tự');
    var currentPass = String(payload.current_password || '');
    if (!currentPass) throw new Error('Cần nhập mật khẩu hiện tại để đổi mật khẩu');
    var username   = String(sh.getRange(target.row, 2).getValue()).trim().toLowerCase();
    var storedHash = String(sh.getRange(target.row, 3).getValue());
    if (_hashPassword(username, currentPass) !== storedHash) {
      throw new Error('Mật khẩu hiện tại không đúng');
    }
    sh.getRange(target.row, 3).setValue(_hashPassword(username, newPass));
    logActivity(ss, 'SECURITY', staffId, 'SELF_PASSWORD_CHANGED', caller.username || staffId);
  }

  logActivity(ss, 'SECURITY', staffId, 'SELF_PROFILE_UPDATED', caller.username || staffId);
  return { staff_id: staffId, updated: true };
}

// ============================================================
// NOTIFICATION ROUTING — V2.2
//  Routes per-event to staff with matching role + TelegramChatID
//  Staffs col J (index 9) = TelegramChatID
// ============================================================

var _EVENT_ROLES = {
  'ORDER_CREATED':       ['owner', 'admin', 'staff'],
  'ORDER_UPDATED':       ['owner', 'admin'],
  'ORDER_CANCELLED':     ['owner', 'admin', 'accountant'],
  'PAYMENT_REPORTED':    ['owner', 'admin', 'accountant'],
  'PAYMENT_CONFIRMED':   ['owner', 'admin', 'accountant'],
  'PAYMENT_REFUNDED':    ['owner', 'admin', 'accountant'],
  'PAYMENT_EXPIRED':     ['owner', 'admin', 'accountant'],
  'PRODUCT_SYNC_FAILED': ['owner', 'admin'],
  'CRON_EXPIRE_ORDER':   ['owner', 'admin']
};

function _getRoutedTelegramIds(ss, event) {
  var roles = _EVENT_ROLES[event] || ['owner', 'admin'];
  var ids   = [];
  Repository.Staff.findAll().forEach(function(s) {
    var chatId = String(s.telegram_id || '').trim(); // col J
    if (s.active && chatId && roles.indexOf(s.role) !== -1) ids.push(chatId);
  });
  return ids;
}

// Routed notify: ENQUEUE 1 job/chatId cho mọi staff khớp role của event (phase-07 Lớp 5 — async).
// Fallback TELEGRAM_CHAT_ID toàn cục nếu không staff nào có chatId. KHÔNG gửi inline → request trả
// ngay (không chờ Telegram 1-3s); processBackgroundQueue (trigger 1') gửi nền + retry + dead-letter.
function notifyRoutedTelegram(ss, orderId, event, payload, settings, message) {
  var chatIds = _getRoutedTelegramIds(ss, event);
  if (chatIds.length === 0) {
    return notifyTelegram(ss, orderId, event, payload, settings, message); // fallback global
  }
  var lastId = null;
  for (var i = 0; i < chatIds.length; i++) {
    lastId = _enqueueTelegram(ss, orderId, event, payload, chatIds[i], message);
  }
  return lastId;
}

// ============================================================
// NOTIFICATIONS — Core helpers
//
// Flow:
//   createNotif()  → append PENDING row → return notifId
//   dispatchTelegram(notifId) → send → updateNotifStatus(SENT|FAILED)
//   For TRACKING_PAGE: createNotif() → updateNotifStatus(SENT) immediately
//                      (customer polls get_order; status change IS the delivery)
// ============================================================

function createNotif(ss, orderId, event, recipientType, channel, payload, initialStatus) {
  try {
    var sh = ss.getSheetByName(SHEET.NOTIFICATIONS);
    if (!sh) return null;
    var dateStr  = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
    var lastRow  = sh.getLastRow();
    var notifId  = 'N-' + dateStr + '-' + String(lastRow).padStart(4, '0');
    var status = initialStatus || 'PENDING';
    sh.appendRow([
      notifId,
      orderId || '',
      event,
      recipientType,
      channel,
      status,
      status === 'SENT' ? nowIso() : '',  // SentAt
      '',  // ErrorMsg
      JSON.stringify(payload || {}),
      nowIso()
    ]);
    // notifyTrackingPage() creates then marks this same row SENT immediately. Keep its
    // location in request memory so updateNotifStatus() does not scan Notifications again.
    (_REQ.__notificationRowById || (_REQ.__notificationRowById = {}))[notifId] = lastRow + 1;
    return notifId;
  } catch (ex) {
    return null; // non-fatal
  }
}

function updateNotifStatus(ss, notifId, status, errorMsg) {
  try {
    if (!notifId) return;
    var sh = ss.getSheetByName(SHEET.NOTIFICATIONS);
    if (!sh || sh.getLastRow() < 2) return;
    var rows = _REQ.__notificationRowById || {};
    var row = Number(rows[notifId]) || -1;
    if (row === -1) row = _findSheetRowExact(sh, 1, notifId);
    if (row !== -1) {
      sh.getRange(row, 6, 1, 3).setValues([[status, nowIso(), errorMsg || '']]);
    }
  } catch (ex) { /* non-fatal */ }
}

function dispatchTelegram(ss, notifId, settings, message) {
  if (!settings.TELEGRAM_TOKEN || !settings.TELEGRAM_CHAT_ID) {
    updateNotifStatus(ss, notifId, 'SKIPPED', 'TELEGRAM_TOKEN or TELEGRAM_CHAT_ID not configured');
    return false;
  }
  try {
    var resp = UrlFetchApp.fetch(
      'https://api.telegram.org/bot' + settings.TELEGRAM_TOKEN + '/sendMessage',
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id:    settings.TELEGRAM_CHAT_ID,
          text:       message,
          parse_mode: 'HTML'
        }),
        muteHttpExceptions: true
      }
    );
    var ok = resp.getResponseCode() === 200;
    updateNotifStatus(ss, notifId, ok ? 'SENT' : 'FAILED',
      ok ? '' : resp.getContentText().substring(0, 200));
    return ok;
  } catch (ex) {
    updateNotifStatus(ss, notifId, 'FAILED', ex.message);
    return false;
  }
}

// phase-07 Lớp 5 — ENQUEUE (không gửi inline). Trả ngay, KHÔNG chặn request. `settings` giữ trong chữ
// ký để tương thích 13 call site; chat đích = TELEGRAM_CHAT_ID toàn cục. processBackgroundQueue gửi nền.
function notifyTelegram(ss, orderId, event, payload, settings, message) {
  return _enqueueTelegram(ss, orderId, event, payload, settings.TELEGRAM_CHAT_ID, message);
}
