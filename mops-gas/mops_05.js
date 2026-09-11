
// ============================================================
// SITE "BÁO CÁO" — 4 sub-report mới tách khỏi getAnalytics() (review 29, docs/mops.md §21)
// Mỗi hàm đọc trực tiếp sheet (KHÔNG qua Repository) — cùng phong cách getAnalytics() ở trên,
// vì đây là hàm tổng hợp 1 lần/nhiều sheet, không phải CRUD 1 dòng. Không cache (90s TTL của
// getAnalytics() dùng chung 6 sheet nặng — các báo cáo này mỗi cái chỉ đọc 2-4 sheet nhẹ hơn).
// ============================================================

// ---- Báo cáo Bán hàng — theo OrderType/Source/Coupon + Chiết khấu chống thất thoát ----
function getSalesReport(params) {
  var fromDate = params && params.from ? new Date(params.from) : null;
  var toDate   = params && params.to   ? new Date(params.to)   : null;
  var includeFinance = !!(params && params._includeFinance);

  function inRange(d) {
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    return true;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 26 cột — cần tới X/Y/Z (OrderDiscountType/Value/Reason, §16) mà getAnalytics() hiện KHÔNG đọc tới.
  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var ordData  = ordersSh.getLastRow() > 1
    ? ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 26).getValues()
    : [];

  var paySh   = ss.getSheetByName(SHEET.PAYMENTS);
  var payData = paySh.getLastRow() > 1
    ? paySh.getRange(2, 1, paySh.getLastRow() - 1, 12).getValues()
    : [];

  var ordersById = {};
  ordData.forEach(function(r) {
    ordersById[String(r[0])] = {
      orderType: String(r[2]), source: String(r[3]), amount: Number(r[4]) || 0,
      createdAt: r[10] ? new Date(r[10]) : null, createdBy: String(r[11] || ''),
      discountCode: String(r[16] || ''), discountAmount: Number(r[17]) || 0,
      orderDiscountType: String(r[23] || ''), orderDiscountValue: Number(r[24]) || 0
    };
  });

  // ---- by_order_type / by_source: count = đơn tạo trong kỳ, revenue = Payments PAID trong kỳ ----
  var byOrderTypeMap = {}, bySourceMap = {};
  Object.keys(ordersById).forEach(function(orderId) {
    var o = ordersById[orderId];
    if (!o.createdAt || !inRange(o.createdAt)) return;
    if (!byOrderTypeMap[o.orderType]) byOrderTypeMap[o.orderType] = { order_type: o.orderType, count: 0, revenue: 0 };
    byOrderTypeMap[o.orderType].count++;
    if (!bySourceMap[o.source]) bySourceMap[o.source] = { source: o.source, count: 0, revenue: 0 };
    bySourceMap[o.source].count++;
  });

  payData.forEach(function(r) {
    var status = String(r[5]);
    var paidAt = r[8] ? new Date(r[8]) : null;
    if (status !== 'PAID' || !paidAt || !inRange(paidAt)) return;
    var o = ordersById[String(r[1])];
    if (!o) return;
    var amount = Number(r[4]) || 0;
    if (byOrderTypeMap[o.orderType]) byOrderTypeMap[o.orderType].revenue += amount;
    if (bySourceMap[o.source]) bySourceMap[o.source].revenue += amount;
  });

  var byOrderType = Object.keys(byOrderTypeMap).map(function(k) { return byOrderTypeMap[k]; })
    .sort(function(a, b) { return b.revenue - a.revenue; });
  var bySource = Object.keys(bySourceMap).map(function(k) { return bySourceMap[k]; })
    .sort(function(a, b) { return b.revenue - a.revenue; });

  // ---- coupon_stats: gộp theo DiscountCode, đơn tạo trong kỳ ----
  var couponMap = {};
  Object.keys(ordersById).forEach(function(orderId) {
    var o = ordersById[orderId];
    if (!o.createdAt || !inRange(o.createdAt) || !o.discountCode) return;
    if (!couponMap[o.discountCode]) couponMap[o.discountCode] = { code: o.discountCode, used_count: 0, total_discount_amount: 0 };
    couponMap[o.discountCode].used_count++;
    couponMap[o.discountCode].total_discount_amount += o.discountAmount;
  });
  var couponStats = Object.keys(couponMap).map(function(k) { return couponMap[k]; })
    .sort(function(a, b) { return b.total_discount_amount - a.total_discount_amount; });

  var result = {
    by_order_type: byOrderType,
    by_source: bySource,
    coupon_stats: couponStats,
    can_view_finance: includeFinance,
    from: (params && params.from) || null,
    to: (params && params.to) || null
  };

  // ---- discount_by_staff (chống thất thoát) — CHỈ trả khi có reports.finance.view, cùng gate
  // với các field tài chính khác của getAnalytics() (dữ liệu ai-giảm-giá-bao-nhiêu là nhạy cảm) ----
  if (includeFinance) {
    var roleByName = {};
    Repository.Staff.findAll().forEach(function(s) {
      if (s.name) roleByName[s.name] = s.role;
    });

    var discMap = {};
    Object.keys(ordersById).forEach(function(orderId) {
      var o = ordersById[orderId];
      if (!o.createdAt || !inRange(o.createdAt) || !o.orderDiscountType) return;

      var staffName = o.createdBy || '(không rõ)';
      var role      = roleByName[staffName] || 'staff';
      var maxPct    = _getMaxDiscountPercent(role);
      var effectivePct   = o.orderDiscountType === '%' ? o.orderDiscountValue : (o.amount > 0 ? o.orderDiscountValue / o.amount * 100 : 0);
      var discountAmount = o.orderDiscountType === '%' ? o.amount * o.orderDiscountValue / 100 : o.orderDiscountValue;
      var atLimit = maxPct > 0 && maxPct !== Infinity && effectivePct >= maxPct - 0.01;

      if (!discMap[staffName]) discMap[staffName] = { staff: staffName, discount_order_count: 0, total_discount_amount: 0, sum_effective_pct: 0, max_discount_percent: maxPct, at_limit_count: 0 };
      discMap[staffName].discount_order_count++;
      discMap[staffName].total_discount_amount += discountAmount;
      discMap[staffName].sum_effective_pct += effectivePct;
      if (atLimit) discMap[staffName].at_limit_count++;
    });

    result.discount_by_staff = Object.keys(discMap).map(function(name) {
      var s = discMap[name];
      return {
        staff: s.staff, discount_order_count: s.discount_order_count,
        total_discount_amount: s.total_discount_amount,
        // Làm tròn 1 chữ số thập phân ở server — template Liquid/[[ ]] không có Math trong scope.
        avg_discount_percent: s.discount_order_count > 0 ? Math.round(s.sum_effective_pct / s.discount_order_count * 10) / 10 : 0,
        max_discount_percent: s.max_discount_percent === Infinity ? null : s.max_discount_percent,
        at_limit_count: s.at_limit_count
      };
    }).sort(function(a, b) { return b.total_discount_amount - a.total_discount_amount; });
  }

  return result;
}

// ---- Báo cáo Khách hàng — theo CustomerGroup (LẺ/SỈ) + Source (SAPO/LOCAL) ----
function getCustomerReport(params) {
  var fromDate = params && params.from ? new Date(params.from) : null;
  var toDate   = params && params.to   ? new Date(params.to)   : null;

  function inRange(d) {
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    return true;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Đọc thẳng sheet Customers — KHÔNG qua listCustomers() vì hàm đó hiện thiếu map cột Source
  // (ngoài phạm vi sửa ở đây, xem docs/mops.md §21).
  var custSh   = ss.getSheetByName(SHEET.CUSTOMERS);
  var custData = custSh.getLastRow() > 1
    ? custSh.getRange(2, 1, custSh.getLastRow() - 1, 11).getValues()
    : [];

  var custMetaById = {};
  var newCustomersInRange = 0;
  var byGroupMap = {}, bySourceMap = {};
  custData.forEach(function(r) {
    var cid    = String(r[0]);
    var source = String(r[8] || '(không rõ)');
    var group  = String(r[9] || 'LẺ');
    var firstOrderAt = r[4] ? new Date(r[4]) : null;

    custMetaById[cid] = { group: group };
    if (firstOrderAt && inRange(firstOrderAt)) newCustomersInRange++;

    if (!byGroupMap[group])   byGroupMap[group]   = { group: group, customer_count: 0, revenue_in_range: 0, paid_order_count: 0 };
    byGroupMap[group].customer_count++;
    if (!bySourceMap[source]) bySourceMap[source] = { source: source, customer_count: 0 };
    bySourceMap[source].customer_count++;
  });

  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var ordData  = ordersSh.getLastRow() > 1
    ? ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 18).getValues()
    : [];
  var customerIdByOrder = {};
  ordData.forEach(function(r) { customerIdByOrder[String(r[0])] = String(r[1]); });

  var paySh   = ss.getSheetByName(SHEET.PAYMENTS);
  var payData = paySh.getLastRow() > 1
    ? paySh.getRange(2, 1, paySh.getLastRow() - 1, 12).getValues()
    : [];
  payData.forEach(function(r) {
    var status = String(r[5]);
    var paidAt = r[8] ? new Date(r[8]) : null;
    if (status !== 'PAID' || !paidAt || !inRange(paidAt)) return;
    var cid  = customerIdByOrder[String(r[1])];
    var meta = cid && custMetaById[cid];
    if (!meta) return;
    var g = meta.group;
    if (!byGroupMap[g]) byGroupMap[g] = { group: g, customer_count: 0, revenue_in_range: 0, paid_order_count: 0 };
    byGroupMap[g].revenue_in_range += Number(r[4]) || 0;
    byGroupMap[g].paid_order_count++;
  });

  var byGroup = Object.keys(byGroupMap).map(function(g) {
    var v = byGroupMap[g];
    return {
      group: v.group, customer_count: v.customer_count, revenue_in_range: v.revenue_in_range,
      avg_order_value: v.paid_order_count > 0 ? v.revenue_in_range / v.paid_order_count : 0
    };
  }).sort(function(a, b) { return b.revenue_in_range - a.revenue_in_range; });

  var bySource = Object.keys(bySourceMap).map(function(k) { return bySourceMap[k]; })
    .sort(function(a, b) { return b.customer_count - a.customer_count; });

  return {
    by_group: byGroup,
    by_source: bySource,
    new_customers_in_range: newCustomersInRange,
    from: (params && params.from) || null,
    to: (params && params.to) || null
  };
}

// ---- Báo cáo Nhập hàng — theo NCC + top sản phẩm nhập (chỉ tính PO đã Posted) ----
function getPurchaseReport(params) {
  var fromDate = params && params.from ? new Date(params.from) : null;
  var toDate   = params && params.to   ? new Date(params.to)   : null;

  function inRange(d) {
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    return true;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var poSh   = ss.getSheetByName(SHEET.PURCHASE_ORDERS);
  var poData = poSh.getLastRow() > 1
    ? poSh.getRange(2, 1, poSh.getLastRow() - 1, 17).getValues()
    : [];

  var supplierSh   = ss.getSheetByName(SHEET.SUPPLIERS);
  var supplierData = supplierSh.getLastRow() > 1
    ? supplierSh.getRange(2, 1, supplierSh.getLastRow() - 1, 7).getValues()
    : [];
  var supplierNameById = {};
  supplierData.forEach(function(r) { supplierNameById[String(r[0])] = String(r[1]); });

  var totalPurchaseAmountInRange = 0, poCountInRange = 0;
  var bySupplierMap = {}, byStatusMap = {}, postedPoIds = {};

  poData.forEach(function(r) {
    var poId       = String(r[0]);
    var supplierId = String(r[1]);
    var status     = String(r[2]);
    var createdAt  = r[7] ? new Date(r[7]) : null;
    var postedAt   = r[8] ? new Date(r[8]) : null;
    // Tổng giá trị nhập = TotalAmount + phụ phí − chiết khấu NCC, khớp đúng công thức Bill (§6 mops.md, autoCreateBill()).
    var grandTotal = (Number(r[4]) || 0) + (Number(r[10]) || 0) + (Number(r[11]) || 0) + (Number(r[12]) || 0) - (Number(r[14]) || 0);

    // by_status: đếm theo CreatedAt — phản ánh hoạt động tạo phiếu bất kể đã Post hay chưa.
    if (createdAt && inRange(createdAt)) {
      if (!byStatusMap[status]) byStatusMap[status] = { status: status, count: 0 };
      byStatusMap[status].count++;
    }

    // Giá trị nhập/Top NCC: chỉ tính PO Posted, theo PostedAt — đúng thời điểm hàng thật sự về kho.
    if (status === 'Posted' && postedAt && inRange(postedAt)) {
      totalPurchaseAmountInRange += grandTotal;
      poCountInRange++;
      postedPoIds[poId] = true;
      var supplierName = supplierNameById[supplierId] || supplierId;
      if (!bySupplierMap[supplierName]) bySupplierMap[supplierName] = { supplier: supplierName, total_amount: 0, po_count: 0 };
      bySupplierMap[supplierName].total_amount += grandTotal;
      bySupplierMap[supplierName].po_count++;
    }
  });

  var bySupplier = Object.keys(bySupplierMap).map(function(k) { return bySupplierMap[k]; })
    .sort(function(a, b) { return b.total_amount - a.total_amount; });
  var byStatus = Object.keys(byStatusMap).map(function(k) { return byStatusMap[k]; });

  var itemsSh  = ss.getSheetByName(SHEET.PURCHASE_ITEMS);
  var itemData = itemsSh.getLastRow() > 1
    ? itemsSh.getRange(2, 1, itemsSh.getLastRow() - 1, 14).getValues()
    : [];
  var productMap = {};
  itemData.forEach(function(r) {
    if (!postedPoIds[String(r[1])]) return; // chỉ tính dòng thuộc PO đã Posted trong kỳ
    var productName = String(r[3] || '');
    if (!productMap[productName]) productMap[productName] = { product_name: productName, total_qty: 0, total_cost: 0 };
    productMap[productName].total_qty  += Number(r[4]) || 0;
    productMap[productName].total_cost += Number(r[6]) || 0;
  });
  var topProducts = Object.keys(productMap).map(function(k) { return productMap[k]; })
    .sort(function(a, b) { return b.total_cost - a.total_cost; }).slice(0, 10);

  return {
    kpi: { total_purchase_amount_in_range: totalPurchaseAmountInRange, po_count_in_range: poCountInRange },
    by_supplier: bySupplier,
    top_products: topProducts,
    by_status: byStatus,
    from: (params && params.from) || null,
    to: (params && params.to) || null
  };
}

// ---- Đối soát Receipt — đơn PAID thiếu Receipt hoặc Receipt chưa Posted (review 30) ----
// Không lọc theo khoảng ngày: đây là danh sách "vấn đề cần xử lý", không phải thống kê theo kỳ —
// ẩn bớt 1 dòng cũ đi vì nó "đã qua kỳ lọc" sẽ khiến admin tưởng đã hết orphan trong khi vẫn còn.
function getReceiptReconciliationReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var paySh   = ss.getSheetByName(SHEET.PAYMENTS);
  var payData = paySh.getLastRow() > 1
    ? paySh.getRange(2, 1, paySh.getLastRow() - 1, 12).getValues()
    : [];

  // Receipt đọc qua Repository.Receipts (phase-07 Lớp 3-Finance); PAYMENTS giữ read thô (narrow scan, chưa có repo).
  var receiptStatusByPaymentId = {};
  Repository.Receipts.findAll().forEach(function(rc) {
    if (rc.source_system !== 'MOPS' || rc.source_type !== 'PAYMENT') return; // chỉ Receipt sinh từ autoCreateReceipt()
    receiptStatusByPaymentId[rc.source_ref] = rc.status; // SourceRef -> Status
  });

  var missing = [];
  payData.forEach(function(r) {
    var status = String(r[5]);
    if (status !== 'PAID') return;
    var paymentId = String(r[0]);
    var receiptStatus = receiptStatusByPaymentId[paymentId];
    if (receiptStatus === 'Posted') return; // bình thường — không đưa vào danh sách

    missing.push({
      order_id: String(r[1]), payment_id: paymentId, amount: Number(r[4]) || 0,
      paid_at: r[8] || '',
      issue: receiptStatus ? ('Phiếu Thu chưa Posted (' + receiptStatus + ')') : 'Chưa có Phiếu Thu'
    });
  });
  missing.sort(function(a, b) { return new Date(b.paid_at) - new Date(a.paid_at); });

  return { missing_receipts: missing };
}

// ---- Báo cáo Kho — tồn kho thấp (lần đầu implement so sánh SafetyStockMin) + nhập/xuất trong kỳ ----
function getInventoryReport(params) {
  var fromDate = params && params.from ? new Date(params.from) : null;
  var toDate   = params && params.to   ? new Date(params.to)   : null;

  function inRange(d) {
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    return true;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var mapSh   = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);
  var mapData = mapSh.getLastRow() > 1
    ? mapSh.getRange(2, 1, mapSh.getLastRow() - 1, 12).getValues()
    : [];
  var safetyMinByHandle = {};
  mapData.forEach(function(r) {
    var safetyMin = Number(r[8]) || 0; // I = SafetyStockMin
    if (safetyMin > 0) safetyMinByHandle[String(r[0])] = safetyMin; // A = Handle
  });

  var prodSh   = ss.getSheetByName(SHEET.PRODUCTS);
  var prodData = prodSh.getLastRow() > 1
    ? prodSh.getRange(2, 1, prodSh.getLastRow() - 1, 17).getValues()
    : [];
  var productNameById = {};
  var lowStock = [];
  prodData.forEach(function(r) {
    var productId    = String(r[0]);
    var handle       = String(r[2]);
    var title        = String(r[4] || '');
    var inventoryQty = Number(r[15]) || 0;
    productNameById[productId] = title;
    var safetyMin = safetyMinByHandle[handle];
    // Chỉ cảnh báo khi ĐÃ cấu hình SafetyStockMin (>0) — tránh false-positive với sản phẩm
    // chưa từng thiết lập ngưỡng (mặc định 0 nghĩa là "chưa cấu hình", không phải "ngưỡng = 0").
    if (safetyMin !== undefined && inventoryQty < safetyMin) {
      lowStock.push({ product_name: title, inventory_qty: inventoryQty, safety_stock_min: safetyMin });
    }
  });
  lowStock.sort(function(a, b) { return a.inventory_qty - b.inventory_qty; });

  var moveSh   = ss.getSheetByName(SHEET.INVENTORY_MOVEMENTS);
  var moveData = moveSh && moveSh.getLastRow() > 1
    ? moveSh.getRange(2, 1, moveSh.getLastRow() - 1, 10).getValues()
    : [];
  var movementMap = {};
  moveData.forEach(function(r) {
    var createdAt = r[9] ? new Date(r[9]) : null;
    if (!createdAt || !inRange(createdAt)) return;
    var name = productNameById[String(r[1])] || String(r[1]);
    var type = String(r[2]);
    if (!movementMap[name]) movementMap[name] = { product_name: name, in_qty: 0, out_qty: 0 };
    if (type === 'IN')  movementMap[name].in_qty  += Number(r[3]) || 0;
    if (type === 'OUT') movementMap[name].out_qty += Number(r[3]) || 0;
  });
  var movementsInRange = Object.keys(movementMap).map(function(k) { return movementMap[k]; })
    .sort(function(a, b) { return (b.in_qty + b.out_qty) - (a.in_qty + a.out_qty); });

  return {
    low_stock: lowStock,
    movements_in_range: movementsInRange,
    from: (params && params.from) || null,
    to: (params && params.to) || null
  };
}

// ============================================================
// LIST NOTIFICATIONS (admin dashboard)
// ============================================================

function listNotifications(params) {
  var limit  = params && params.limit ? parseInt(params.limit, 10) : 50;
  var event  = params && params.event ? String(params.event).toUpperCase() : null;
  var status = params && params.status ? String(params.status).toUpperCase() : null;

  // Zero-Wait Path (2026-08-10): wrap qua _cachedArrayRead — bump theo _analyticsGen (create_notification
  // là non-critical qua queue, cũng bump khi drain). Chunked cache né 100KB/key CacheService.
  var all = _cachedArrayRead('notifications_all', function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET.NOTIFICATIONS);
    if (!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues().map(function(r) {
      return {
        notif_id:       String(r[0]),
        order_id:       String(r[1]),
        event:          String(r[2]),
        recipient_type: String(r[3]),
        channel:        String(r[4]),
        status:         String(r[5]),
        sent_at:        r[6],
        error_msg:      String(r[7] || ''),
        created_at:     r[9]
      };
    });
  });

  var results = all.filter(function(r) {
    if (event  && String(r.event).toUpperCase()  !== event)  return false;
    if (status && String(r.status).toUpperCase() !== status) return false;
    return true;
  });
  results.sort(function(a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
  return { notifications: results.slice(0, limit), total: results.length };
}

// ============================================================
// LIST ACTIVITY LOGS
// ============================================================

function listActivityLogs(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.ACTIVITY_LOGS);
  if (!sh || sh.getLastRow() < 2) return { logs: [], total: 0 };

  var data  = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  var limit = params && params.limit ? Math.min(Number(params.limit), 500) : 200;

  // entity_type may be a single value OR comma-joined list (e.g. "ORDER,PAYMENT,CUSTOMER")
  var entityTypeRaw = params && params.entity_type ? String(params.entity_type).toUpperCase() : null;
  var entityTypes   = entityTypeRaw ? entityTypeRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : null;
  var entityId   = params && params.entity_id   ? String(params.entity_id)                 : null;
  // log_action avoids clash with router's 'action' param
  var action     = params && params.log_action  ? String(params.log_action).toUpperCase()  : null;

  var results = data
    .filter(function(r) {
      if (entityTypes && entityTypes.length && entityTypes.indexOf(String(r[1]).toUpperCase()) === -1) return false;
      if (entityId    && String(r[2]) !== entityId)                   return false;
      if (action      && String(r[3]).toUpperCase() !== action)       return false;
      return true;
    })
    .slice(0, limit)
    .map(function(r) {
      return {
        log_id:      String(r[0]),
        entity_type: String(r[1]),
        entity_id:   String(r[2]),
        action:      String(r[3]),
        user:        String(r[4] || ''),
        created_at:  r[5]
      };
    });

  results.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

  return { logs: results, total: results.length };
}

// ============================================================
// SYNC PRODUCTS (SAPO API → Products sheet)
// ============================================================

function syncProducts(payload) {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);

  var store  = settings.SAPO_STORE;
  var apiKey = settings.SAPO_API_KEY;
  var secret = settings.SAPO_SECRET;

  if (!store || !apiKey || !secret) {
    throw new Error('SAPO_STORE, SAPO_API_KEY, SAPO_SECRET chưa được cấu hình trong Settings');
  }

  var productSheet = ss.getSheetByName(SHEET.PRODUCTS);
  var syncLogSh    = ss.getSheetByName(SHEET.SYNC_LOGS);

  var existingData = productSheet.getLastRow() > 1
    ? productSheet.getRange(2, 1, productSheet.getLastRow() - 1, 16).getValues()
    : [];

  // Đa-biến-thể (2026-07-17): khoá KÉP ProductID|VariantID — 1 sản phẩm giờ có nhiều dòng (mỗi
  // biến thể/size 1 dòng). Khoá chỉ theo ProductID như trước sẽ khiến biến thể thứ 2+ ghi đè lên
  // biến thể đầu. Dòng cũ (single-variant) đã có sẵn VariantID ở cột B nên tự thành khoá hợp lệ —
  // KHÔNG cần migrate huỷ dữ liệu, lần sync này chỉ append thêm các biến thể còn thiếu.
  var existingByRow = {};
  existingData.forEach(function(r, idx) {
    existingByRow[String(r[0]) + '|' + String(r[1])] = idx + 2;
  });

  // Fetch all products from SAPO (paginated, 250/page)
  var allProducts = [];
  try {
    var page = 1;
    while (true) {
      var url  = 'https://' + store
        + '/admin/products.json?limit=250&page=' + page
        + '&fields=id,variants,name,alias,vendor,product_type,images,status';
      // Không cần thêm 'inventory_quantity' vào fields= — đây là field CẤP VARIANT,
      // đã có sẵn trong object variant trả về khi field 'variants' được yêu cầu
      // (giống price/compare_at_price/sku/weight bên dưới, không field nào trong số
      // đó có mặt riêng trong fields= nhưng vẫn đọc được qua variant.*).
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: _sapoAuthHeaders(apiKey, secret) });

      if (resp.getResponseCode() !== 200) {
        throw new Error('SAPO API ' + resp.getResponseCode() + ': ' + resp.getContentText().substring(0, 200));
      }

      var batch = JSON.parse(resp.getContentText()).products || [];
      allProducts = allProducts.concat(batch);
      if (batch.length < 250) break;
      page++;
    }
  } catch (fetchErr) {
    // N6 — PRODUCT_SYNC_FAILED → Admin → Telegram
    var syncLogSh2 = ss.getSheetByName(SHEET.SYNC_LOGS);
    var syncErrId  = 'SYNC' + String(syncLogSh2.getLastRow()).padStart(6, '0');
    syncLogSh2.appendRow([syncErrId, 'PRODUCT', 'FAILED', 0, fetchErr.message, nowIso()]);

    notifyTelegram(ss, null, 'PRODUCT_SYNC_FAILED',
      { error: fetchErr.message },
      settings,
      '🚨 <b>Product Sync thất bại</b>\n' +
      'Lỗi: ' + fetchErr.message + '\n' +
      'Thời gian: ' + nowIso()
    );

    throw fetchErr; // re-throw so caller knows
  }

  var now          = nowIso();
  var addedCount   = 0;
  var updatedCount = 0;
  var seenIds      = {};

  allProducts.forEach(function(p) {
    var pid    = String(p.id);
    var handle = String(p.alias || p.handle || '');
    var image  = (p.images && p.images[0] && p.images[0].src) ? String(p.images[0].src) : '';
    var status = String(p.status || 'active');

    // Đa-biến-thể (2026-07-17): MỖI biến thể/size = 1 dòng Products (khoá kép pid|vid). Trước đây chỉ
    // lấy variants[0] → mất size/mẫu còn lại, đơn giao hàng không biết đóng gói biến thể nào + weight
    // sai. Nếu SAPO không trả mảng variants (hiếm) → 1 dòng rỗng vid=pid để không mất sản phẩm.
    var variants = (p.variants && p.variants.length) ? p.variants : [{}];
    variants.forEach(function(variant) {
      var vid    = String(variant.id || pid);
      var rowKey = pid + '|' + vid;
      seenIds[rowKey] = true;

      // Cột 1-15 (ProductID..Source) — luôn đồng bộ từ SAPO, không đổi.
      var row15 = [
        pid,
        vid,
        handle,
        variant.sku || '',
        p.name || p.title || '',
        p.vendor || '',
        p.product_type || '',
        Number(variant.price) || 0,
        Number(variant.compare_at_price) || 0,
        // Weight — LUÔN đọc variant.grams (integer, cố định gram) chứ KHÔNG phải variant.weight.
        // variant.weight là số theo weight_unit của store ("g"/"kg"/"oz"/"lb") nên đơn vị không xác định
        // (200g store để "kg" → weight=0.2). Hãng vận chuyển VN + phân bổ chi phí nhập cần gram chuẩn.
        // Fallback variant.weight chỉ để không vỡ nếu API cũ thiếu grams (hiếm). Xem mops.md §1 cột Weight.
        Number(variant.grams) || Number(variant.weight) || 0,
        variant.requires_shipping !== false,
        image,
        status === 'active' ? 'active' : 'inactive',
        now,
        'SAPO'
      ];

      // Cột 17 (Barcode) — KHÁC InventoryQty, đây là dữ liệu thật của SAPO (mã vạch NSX gắn trên
      // variant), không phải số MOPS tự quản — luôn đồng bộ lại mỗi lần, giống Title/Price/Image.
      var barcode = String(variant.barcode || '');

      // Cột 18 (VariantTitle) — nhãn biến thể/size từ SAPO. Ưu tiên variant.title; nếu là marker mặc
      // định "Default Title" (sản phẩm 1 biến thể) → để rỗng; fallback ghép option1/2/3. Dữ liệu SAPO
      // thật → đồng bộ lại mỗi lần cùng Barcode.
      var vTitle = String(variant.title || '');
      if (vTitle === 'Default Title') vTitle = '';
      if (!vTitle) {
        vTitle = [variant.option1, variant.option2, variant.option3]
          .filter(function(o) { return o && String(o) !== 'Default Title'; }).join(' / ');
      }

      if (existingByRow[rowKey]) {
        // Cột 9 (CompareAtPrice — "giá gốc") và Cột 16 (InventoryQty) CỐ Ý KHÔNG được ghi ở đây
        // (chốt 2026-07-11, review 19 — MOPS tự quản 2 cột này qua updateProduct()/_adjustInventoryQty(),
        // ghi đè ở đây sẽ xoá mất số admin đã tự sửa tay). Giá bán (cột 8, Price) VẪN đồng bộ lại
        // bình thường mỗi lần — admin sửa qua updateProduct() chỉ có hiệu lực tới lần sync kế tiếp,
        // không "khoá" như CompareAtPrice/InventoryQty. Vì cột 9 không liền kề cột 16, và giờ cũng
        // không liền kề cột 8→10, phải ghi 2 dải rời: 1-8 (ProductID..Price) và 10-15 (Weight..Source).
        var r = existingByRow[rowKey];
        productSheet.getRange(r, 1, 1, 8).setValues([row15.slice(0, 8)]);
        productSheet.getRange(r, 10, 1, 6).setValues([row15.slice(9, 15)]);
        productSheet.getRange(r, 17, 1, 1).setValue(barcode);   // Q Barcode
        productSheet.getRange(r, 18, 1, 1).setValue(vTitle);    // R VariantTitle (đồng bộ mỗi lần)
        updatedCount++;
      } else {
        // Biến thể MỚI lần đầu thấy (sản phẩm mới HOẶC biến thể mới của sản phẩm cũ) — seed
        // InventoryQty ban đầu từ SAPO (không có số MOPS nào để giữ lại), từ đây trở đi cột này
        // là của MOPS, syncProducts() không đụng tới nữa.
        productSheet.appendRow(row15.concat([Number(variant.inventory_quantity) || 0, barcode, vTitle]));
        addedCount++;
      }
    });
  });

  var deletedCount = 0;
  existingData.forEach(function(r) {
    var rowKey = String(r[0]) + '|' + String(r[1]);
    // Sản phẩm/biến thể cục bộ (cột Source = 'LOCAL') không tồn tại trên SAPO nên sẽ không bao giờ
    // xuất hiện trong seenIds — bỏ qua để không bị soft-delete nhầm. Biến thể SAPO bị gỡ (không còn
    // trong seenIds theo khoá kép) → soft-delete đúng dòng biến thể đó, không đụng biến thể khác.
    if (!seenIds[rowKey] && String(r[12]) !== 'deleted' && String(r[14]) !== 'LOCAL') {
      productSheet.getRange(existingByRow[rowKey], 13).setValue('deleted');
      productSheet.getRange(existingByRow[rowKey], 14).setValue(now);
      deletedCount++;
    }
  });

  var syncId = 'SYNC' + String(syncLogSh.getLastRow()).padStart(6, '0');
  var logMsg = 'added:' + addedCount + ', updated:' + updatedCount + ', deleted:' + deletedCount;
  syncLogSh.appendRow([syncId, 'PRODUCT', 'SUCCESS', addedCount + updatedCount + deletedCount, logMsg, now]);
  logActivity(ss, 'SYNC', syncId, 'PRODUCT_SYNC_COMPLETE', 'system');

  if (deletedCount > 0) {
    notifyTelegram(ss, null, 'PRODUCT_SYNC_FAILED',
      { deletedCount: deletedCount, message: logMsg },
      settings,
      '⚠️ <b>Product Sync — cảnh báo</b>\n' +
      'Đã đánh dấu xóa: ' + deletedCount + ' sản phẩm\n' + logMsg
    );
  }

  _mappingsCacheBust(); // sync đổi giá/tồn/status SP → checkout thấy ngay
  _memoBust('__prodRowIdx'); // sync có thể thêm dòng Products → index tồn kho phải tính lại
  return { added: addedCount, updated: updatedCount, deleted: deletedCount, total: allProducts.length };
}

// ============================================================
// PUSH ORDER TO SAPO (V2.4 slice — thủ công, CHỈ đơn order_type='product')
// Một chiều: chỉ tạo 1 đơn ghi nhận bên SAPO để đối soát/tồn kho, không đồng bộ
// ngược, không tự động chạy. MOPS vẫn là nguồn sự thật duy nhất về giao dịch —
// đơn này có được đẩy hay không không ảnh hưởng gì tới trạng thái thanh toán MOPS.
// KHÔNG áp dụng cho deposit/booking — SAPO không có khái niệm đặt cọc/lịch hẹn.
// ============================================================

function pushOrderToSapo(payload) {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var orderId = String(payload.order_id || '').trim();
  if (!orderId) throw new Error('order_id is required');

  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var ordData  = ordersSh.getLastRow() > 1
    ? ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 18).getValues()
    : [];

  var orderRow = -1, order = null;
  for (var i = 0; i < ordData.length; i++) {
    if (String(ordData[i][0]) === orderId) { orderRow = i + 2; order = ordData[i]; break; }
  }
  if (!order) throw new Error('Không tìm thấy đơn hàng ' + orderId);

  var orderType   = String(order[2]);
  var customerId  = String(order[1]);
  var status      = String(order[7]);
  var sapoOrderId = String(order[9] || '');

  if (orderType !== 'product') {
    throw new Error('Chỉ hỗ trợ đẩy đơn loại "product" lên SAPO — đơn này là "' + orderType + '" (đặt cọc/lịch hẹn không có khái niệm tương ứng bên SAPO).');
  }
  if (['PAID', 'PROCESSING', 'COMPLETED'].indexOf(status) === -1) {
    throw new Error('Đơn phải ở trạng thái đã thanh toán (PAID) trở lên mới đẩy được lên SAPO — hiện đang là ' + status + '.');
  }
  if (sapoOrderId) {
    // Kiểm tra sớm, rẻ — dùng snapshot đã đọc ở trên. Đây CHƯA phải lớp chống
    // trùng chính thức (xem LockService bên dưới), chỉ để trả lỗi nhanh cho
    // trường hợp phổ biến (đơn đã đẩy từ trước, không có race).
    throw new Error('Đơn này đã được đẩy lên SAPO (Mã: ' + sapoOrderId + ') — không thể tạo trùng.');
  }

  var settings = getSettings(ss);
  var store  = settings.SAPO_STORE;
  var apiKey = settings.SAPO_API_KEY;
  var secret = settings.SAPO_SECRET;
  if (!store || !apiKey || !secret) {
    throw new Error('SAPO_STORE, SAPO_API_KEY, SAPO_SECRET chưa được cấu hình trong Settings');
  }

  // OrderItems đã snapshot sẵn giá/tên lúc tạo đơn — không cần tra lại SAPO.
  var itemsSh  = ss.getSheetByName(SHEET.ORDER_ITEMS);
  var itemData = itemsSh.getLastRow() > 1
    ? itemsSh.getRange(2, 1, itemsSh.getLastRow() - 1, 11).getValues()
    : [];
  var lineItems = [];
  itemData.forEach(function(r) {
    if (String(r[1]) !== orderId) return;
    lineItems.push({
      // SAPO API 400 "Can't convert String value to Integer" (fields: line_items.N.variant_id)
      // — Google Sheets trả r[3]/r[2] dạng string cho ID lớn (tuỳ định dạng cột lúc ghi qua
      // syncProducts()); SAPO yêu cầu Integer thật trong JSON, không chấp nhận string số.
      variant_id: r[3] ? Number(r[3]) : undefined,
      product_id: r[2] ? Number(r[2]) : undefined,
      sku:        String(r[5] || ''),
      title:      String(r[6] || ''),
      quantity:   Number(r[8]) || 1,
      price:      Number(r[7]) || 0
    });
  });
  if (!lineItems.length) throw new Error('Đơn không có sản phẩm nào để đẩy lên SAPO.');

  var custSh   = ss.getSheetByName(SHEET.CUSTOMERS);
  var custData = custSh.getLastRow() > 1
    ? custSh.getRange(2, 1, custSh.getLastRow() - 1, 7).getValues()
    : [];
  var customerPhone = '', customerName = '';
  for (var c = 0; c < custData.length; c++) {
    if (String(custData[c][0]) === customerId) {
      customerPhone = String(custData[c][1]);
      customerName  = String(custData[c][2] || '');
      break;
    }
  }

  // ── Vùng găng: khoá script, đọc lại đúng ô SAPOOrderID (không dùng snapshot cũ
  // ở trên — có thể đã lỗi thời nếu 1 request khác vừa hoàn tất trong lúc chờ
  // khoá), rồi CHUYỂN NGAY sang SYNCING để "nhận cọc" ô này trước khi nhả khoá.
  // Chỉ giữ khoá cho phần đọc+ghi này — KHÔNG giữ khoá xuyên suốt lệnh gọi mạng
  // tới SAPO (có thể mất vài giây), vì LockService.getScriptLock() chặn TOÀN BỘ
  // script (kể cả generateId() ở luồng tạo đơn khác) — giữ lâu sẽ làm nghẽn app.
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var freshSapoOrderId = String(ordersSh.getRange(orderRow, 10).getValue() || '');
    if (freshSapoOrderId) {
      throw new Error('Đơn này vừa được đẩy lên SAPO (Mã: ' + freshSapoOrderId + ') — không thể tạo trùng.');
    }
    ordersSh.getRange(orderRow, 9).setValue('SYNCING'); // SAPOSyncStatus (cột I)
  } finally {
    lock.releaseLock();
  }

  // ⚠️ CẢNH BÁO: shape payload dưới đây SUY ĐOÁN theo chuẩn REST kiểu Shopify mà
  // SAPO dựa theo — repo KHÔNG có tài liệu tham khảo cho việc TẠO đơn (chỉ có ví
  // dụ ĐỌC sản phẩm ở syncProducts). PHẢI test với 1 đơn thật trên SAPO Admin
  // trước khi tin tưởng số liệu/trạng thái hiển thị đúng.
  var sapoPayload = {
    order: {
      line_items: lineItems,
      customer: { phone: customerPhone, name: customerName },
      financial_status: 'paid',
      note: 'Tạo từ MOPS — Đơn: ' + orderId,
      source_name: 'MOPS'
    }
  };

  var url = 'https://' + store + '/admin/orders.json';
  var resp;
  try {
    resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(sapoPayload),
      muteHttpExceptions: true,
      headers: _sapoAuthHeaders(apiKey, secret)
    });
    if (resp.getResponseCode() !== 200 && resp.getResponseCode() !== 201) {
      throw new Error('SAPO API ' + resp.getResponseCode() + ': ' + resp.getContentText().substring(0, 200));
    }
  } catch (fetchErr) {
    // FAILED (không phải để trống) — cho phép nhận diện + bấm lại rõ ràng, thay
    // vì im lặng quay về trạng thái trước đó khiến staff không biết đã thử và hỏng.
    ordersSh.getRange(orderRow, 9).setValue('FAILED');
    var syncLogSh = ss.getSheetByName(SHEET.SYNC_LOGS);
    var syncErrId = 'SYNC' + String(syncLogSh.getLastRow()).padStart(6, '0');
    syncLogSh.appendRow([syncErrId, 'ORDER', 'FAILED', 0, orderId + ': ' + fetchErr.message, nowIso()]);
    notifyTelegram(ss, orderId, 'SAPO_PUSH_FAILED',
      { error: fetchErr.message },
      settings,
      '🚨 <b>Đẩy đơn lên SAPO thất bại</b>\n' +
      'Đơn: ' + orderId + '\n' +
      'Lỗi: ' + fetchErr.message
    );
    throw fetchErr; // sapo_order_id vẫn trống → có thể bấm lại (FAILED không chặn retry)
  }

  var sapoOrder      = JSON.parse(resp.getContentText()).order || {};
  var newSapoOrderId = String(sapoOrder.id || '');
  if (!newSapoOrderId) {
    ordersSh.getRange(orderRow, 9).setValue('FAILED');
    throw new Error('SAPO không trả về mã đơn hợp lệ.');
  }

  ordersSh.getRange(orderRow, 9).setValue('SYNCED');        // SAPOSyncStatus (cột I)
  ordersSh.getRange(orderRow, 10).setValue(newSapoOrderId); // SAPOOrderID    (cột J)

  logActivity(ss, 'ORDER', orderId, 'SAPO_PUSH_SUCCESS', 'staff:' + (payload._staffActor || 'staff'));

  return { order_id: orderId, sapo_order_id: newSapoOrderId, sapo_sync_status: 'SYNCED' };
}

// ============================================================
// PULL ORDERS FROM SAPO (docs/mops.md §10, 2026-07-10) — chiều ngược pushOrderToSapo().
// Kéo đơn có thay đổi từ SAPO về MOPS theo watermark (Settings.sapo_order_last_pulled_at),
// check trùng theo SAPOOrderID. Đơn CHƯA có → tạo Order+OrderItems mới (OriginSystem='SAPO').
// Đơn ĐÃ có → chỉ UPDATE SAPOFinancialStatus/SAPOFulfillmentStatus/LastSyncedAt.
//
// ⚠️ CHƯA TEST VỚI API THẬT — cùng mức rủi ro đã ghi trong pushOrderToSapo(): shape response
// SUY ĐOÁN theo chuẩn REST kiểu Shopify mà SAPO dựa theo (id, financial_status,
// fulfillment_status, total_price, customer{phone,name}, line_items[], modified_on).
// Tham số filter `modified_on_min` VÀ format ngày "yyyy-MM-dd HH:mm" đã verify qua
// support.sapo.vn (không phải suy đoán) — nhưng field trả về của TỪNG order vẫn chưa gọi thử
// lần nào. PHẢI test 1 lần thật (xem log SyncLogs Type=ORDER_PULL) trước khi tin tưởng số liệu.
//
// 🆕 Review đồng bộ SAPO (2026-07-15) — đã thêm trong lúc chờ test thật ở trên:
//   1. Chạy testPullOrdersFromSapoRaw() (function ngay dưới) TRƯỚC để xác nhận field name thật —
//      đặc biệt line_items vs order_lines (bảng field mapping user cung cấp ghi order_lines,
//      khác giả định gốc line_items — code bên dưới đã thử CẢ HAI, nhưng cần khoá cứng lại 1
//      cái sau khi test, bỏ fallback thừa).
//   2. Đã thêm trừ kho (InventoryMovements + Products.InventoryQty) cho line items pull về —
//      trước đây chỉ ghi snapshot OrderItems, không đụng tồn kho, sai với mọi đơn Sapo-native.
//   3. Đã thêm cột AB SAPOOrderName (mã đơn hiển thị, vd "#SON1001") để nhân viên tra chéo với
//      Sapo Admin — trước đây không có cột nào lưu field `name` của SAPO.
//   Vẫn CHƯA làm (ngoài phạm vi 3 việc trên): (a) tự tính lại PaymentStatus nội bộ khi
//   SAPOFinancialStatus đổi sang paid ở lần pull sau (mops.md §10 mục 3, vẫn chỉ là thiết kế),
//   (b) đảo ngược InventoryMovements khi đơn Sapo-native bị huỷ/hoàn sau khi đã pull, (c) Webhook
//   real-time — endpoint doPost() hiện bắt buộc payload có `action`, chưa nhận được payload thô
//   của Sapo webhook.
// ============================================================

// ── DIAGNOSTIC — chỉ chạy TAY trong Apps Script Editor (▶ Run), KHÔNG expose qua doPost().
// Mục đích: lấy 1 đơn thật từ SAPO để xác nhận đúng shape response trước khi tin tưởng
// pullOrdersFromSapo() bên dưới (xem cảnh báo "CHƯA TEST VỚI API THẬT" phía trên). Chỉ GET,
// không ghi gì vào Sheet. Sau khi chạy, mở View > Executions xem Logger.log, đối chiếu:
// line_items hay order_lines? có field name (mã đơn hiển thị, vd #SON1001) không? dòng hàng
// có product_id/variant_id/sku/quantity/price không? — rồi báo lại để khoá cứng field name
// trong pullOrdersFromSapo(), bỏ các fallback tạm đang để phòng hờ (review đồng bộ SAPO 2026-07-15).
function testPullOrdersFromSapoRaw() {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var store    = settings.SAPO_STORE;
  var apiKey   = settings.SAPO_API_KEY;
  var secret   = settings.SAPO_SECRET;
  if (!store || !apiKey || !secret) {
    throw new Error('SAPO_STORE, SAPO_API_KEY, SAPO_SECRET chưa được cấu hình trong Settings');
  }

  var url = 'https://' + store + '/admin/orders.json?limit=1&status=any';
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: _sapoAuthHeaders(apiKey, secret) });
  Logger.log('HTTP status: ' + resp.getResponseCode());
  Logger.log(resp.getContentText());

  if (resp.getResponseCode() !== 200) {
    throw new Error('SAPO API ' + resp.getResponseCode() + ': ' + resp.getContentText().substring(0, 500));
  }

  var body  = JSON.parse(resp.getContentText());
  var order = (body.orders || [])[0];
  if (!order) { Logger.log('Store chưa có đơn hàng nào để test.'); return body; }

  Logger.log('--- Field check trên đơn đầu tiên ---');
  Logger.log('id: ' + order.id + ' | name: ' + order.name + ' | order_number: ' + order.order_number);
  Logger.log('financial_status: ' + order.financial_status + ' | fulfillment_status: ' + order.fulfillment_status);
  Logger.log('total_price: ' + order.total_price);
  Logger.log('có line_items? ' + !!order.line_items + ' (length=' + (order.line_items || []).length + ')');
  Logger.log('có order_lines? ' + !!order.order_lines + ' (length=' + (order.order_lines || []).length + ')');
  var firstLine = (order.line_items || order.order_lines || [])[0];
  if (firstLine) Logger.log('dòng hàng đầu tiên: ' + JSON.stringify(firstLine));

  return order;
}

function _setSettingValue(ss, key, value) {
  var sh = ss.getSheetByName(SHEET.SETTINGS);
  if (!sh) return;
  var lastRow = sh.getLastRow();
  var data = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, 1).getValues() : [];
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      sh.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  sh.appendRow([key, value]);
}

// Upsert khách hàng riêng cho luồng pull (KHÔNG dùng chung upsertCustomer() — hàm đó phục vụ
// luồng tạo đơn trực tiếp trên MOPS, không set SAPOCustomerID/Source). Tìm theo Phone trước
// (khoá tự nhiên chung), set Source='SAPO'+SAPOCustomerID nếu khách chưa từng có trên MOPS.
function _upsertCustomerFromSapo(ss, sapoCustomerId, phone, name) {
  var sh = ss.getSheetByName(SHEET.CUSTOMERS);
  var lastRow = sh.getLastRow();
  var now = nowIso();
  phone = String(phone || '').trim();

  if (phone && lastRow > 1) {
    var data = sh.getRange(2, 1, lastRow - 1, 9).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][1]) === phone) {
        var row = i + 2;
        sh.getRange(row, 6).setValue(now); // LastOrderAt
        if (!data[i][7]) sh.getRange(row, 8).setValue(sapoCustomerId || ''); // SAPOCustomerID nếu chưa có
        return String(data[i][0]);
      }
    }
  }

  var customerId = generateId(sh, 'CUS', 6);
  sh.appendRow([customerId, '', name || '', '', now, now, 'active', sapoCustomerId || '', 'SAPO']);
  var newRow = sh.getLastRow();
  _forcePlainText(sh, newRow, [2]);
  if (phone) sh.getRange(newRow, 2).setValue(phone);
  return customerId;
}

function pullOrdersFromSapo(payload) {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var settings = getSettings(ss);
  var store    = settings.SAPO_STORE;
  var apiKey   = settings.SAPO_API_KEY;
  var secret   = settings.SAPO_SECRET;
  if (!store || !apiKey || !secret) {
    throw new Error('SAPO_STORE, SAPO_API_KEY, SAPO_SECRET chưa được cấu hình trong Settings');
  }

  // Watermark — mốc lần pull thành công gần nhất. Rỗng (lần đầu chạy) → lùi 24h để không kéo
  // toàn bộ lịch sử đơn hàng của store về 1 lần.
  var lastPulled = settings.sapo_order_last_pulled_at;
  var sinceDate  = lastPulled ? new Date(lastPulled) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  var modifiedMin = Utilities.formatDate(sinceDate, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm');

  var url = 'https://' + store + '/admin/orders.json?limit=250&modified_on_min='
    + encodeURIComponent(modifiedMin) + '&status=any';

  var sapoOrders = [];
  var runAt = nowIso();
  try {
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: _sapoAuthHeaders(apiKey, secret) });
    if (resp.getResponseCode() !== 200) {
      throw new Error('SAPO API ' + resp.getResponseCode() + ': ' + resp.getContentText().substring(0, 200));
    }
    sapoOrders = JSON.parse(resp.getContentText()).orders || [];
  } catch (fetchErr) {
    var syncLogSh0 = ss.getSheetByName(SHEET.SYNC_LOGS);
    var errId = 'SYNC' + String(syncLogSh0.getLastRow()).padStart(6, '0');
    syncLogSh0.appendRow([errId, 'ORDER_PULL', 'FAILED', 0, fetchErr.message, runAt]);
    notifyTelegram(ss, null, 'SAPO_PULL_FAILED', { error: fetchErr.message }, settings,
      '🚨 <b>Kéo đơn từ SAPO thất bại</b>\nLỗi: ' + fetchErr.message);
    throw fetchErr;
  }

  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var existing = ordersSh.getLastRow() > 1
    ? ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 23).getValues()
    : [];
  var rowBySapoId = {};
  existing.forEach(function(r, idx) { if (r[9]) rowBySapoId[String(r[9])] = idx + 2; }); // J = SAPOOrderID

  var itemsSh = ss.getSheetByName(SHEET.ORDER_ITEMS);
  var createdCount = 0, updatedCount = 0;

  sapoOrders.forEach(function(o) {
    var sapoId = String(o.id || '');
    if (!sapoId) return;

    var financial    = String(o.financial_status || '');
    var fulfillment   = String(o.fulfillment_status || '');
    // Mã đơn hiển thị (vd "#SON1001") — field tên chưa 100% chắc chắn tới khi chạy
    // testPullOrdersFromSapoRaw(), fallback order_number cho an toàn.
    var orderName    = String(o.name || o.order_number || '');

    if (rowBySapoId[sapoId]) {
      // ĐÃ CÓ trên MOPS — chỉ UPDATE 3 cột thô, không tạo dòng mới, không đụng PaymentStatus
      // nội bộ (đó là state machine riêng của MOPS, xem mops.md §10).
      var r = rowBySapoId[sapoId];
      ordersSh.getRange(r, 20).setValue(financial);    // T SAPOFinancialStatus
      ordersSh.getRange(r, 21).setValue(fulfillment);  // U SAPOFulfillmentStatus
      ordersSh.getRange(r, 23).setValue(runAt);        // W LastSyncedAt
      // Backfill AB cho các đơn đã pull TRƯỚC KHI có cột SAPOOrderName — không ghi đè nếu đã có.
      var orderNameCell = ordersSh.getRange(r, 28); // AB SAPOOrderName
      if (!orderNameCell.getValue() && orderName) orderNameCell.setValue(orderName);
      updatedCount++;
      return;
    }

    // CHƯA CÓ — đơn phát sinh trực tiếp trên SAPO (không qua MOPS) — tạo mới.
    var customerId = _upsertCustomerFromSapo(ss, o.customer && o.customer.id, o.customer && o.customer.phone, o.customer && o.customer.name);
    var orderId = generateId(ordersSh, 'MOPS', 4);
    ordersSh.appendRow([
      orderId, customerId, 'product', 'sapo-pull', Number(o.total_price) || 0, 0, '',    // A-G
      financial === 'paid' ? 'PAID' : 'PENDING', 'SYNCED', sapoId, runAt, 'system', '', '', '', '', '', 0, // H-R
      'SAPO', financial, fulfillment, 0, runAt,  // S-W
      '', 0, '', '',                              // X-AA: OrderDiscountType/Value/Reason/BranchID — đơn Sapo-native không có
      orderName                                   // AB SAPOOrderName 🆕
    ]);
    _forceNumberFormat(ordersSh, ordersSh.getLastRow(), [5, 6, 18, 25]);

    // Field name dòng hàng CHƯA verify với API thật (xem cảnh báo đầu file) — thử cả 2 khả năng
    // line_items (Shopify-style, giả định gốc) và order_lines (tên user cung cấp từ tài liệu SAPO)
    // cho tới khi testPullOrdersFromSapoRaw() xác nhận, lúc đó bỏ fallback thừa.
    var rawLineItems = o.line_items || o.order_lines || [];
    var _avgCost = _calcAvgCostBatch(); // perf: đọc InventoryMovements 1 lần/đơn (thay N+1 theo từng dòng)
    rawLineItems.forEach(function(li) {
      var itemId    = generateId(itemsSh, 'OI', 6);
      var qty       = Number(li.quantity || li.qty) || 0;
      var price     = Number(li.price) || 0;
      var productId = li.product_id || li.productId || '';
      var variantId = String(li.variant_id || li.variantId || '');
      var unitCost  = _avgCost(productId, variantId);
      itemsSh.appendRow([
        itemId, orderId, productId, variantId, '', li.sku || '',
        li.title || li.name || li.product_name || '', price, qty,
        price * qty, JSON.stringify(li), unitCost
      ]);
      _forceNumberFormat(itemsSh, itemsSh.getLastRow(), [8, 9, 10, 12]);

      // Bước 2 (review đồng bộ SAPO 2026-07-15) — trừ kho cho đơn Sapo-native, giống hệt nhánh
      // SALE trong createOrder() (docs/code.gs ~dòng 2448-2457). Trước bản vá này pullOrdersFromSapo()
      // chỉ ghi snapshot OrderItems, KHÔNG đụng Products.InventoryQty — sai tồn kho MOPS cho mọi
      // đơn không tạo qua MOPS Admin. Best-effort: 1 lỗi ghi log tồn kho không được chặn tạo đơn.
      if (productId) {
        try {
          Repository.InventoryMovements.append({
            product_id: productId, variant_id: variantId, type: 'OUT', qty: qty, unit_cost: unitCost,
            source_type: 'SALE', source_ref: orderId, created_by: 'system:sapo-pull'
          });
          // LOCK (2026-09-05): _adjustInventoryQty là read-modify-write không tự khoá (mops_01.js,
          // giả định caller khoá) — pullOrdersFromSapo trước đây gọi không khoá, có thể lost-update
          // nếu 2 lượt pull chạy chồng nhau hoặc trùng thời điểm với createOrder cho cùng sản phẩm.
          _withLock(function() { _adjustInventoryQty(ss, productId, variantId, -qty); });
        } catch (moveErr) { /* best-effort — không chặn đơn hàng vì lỗi log tồn kho */ }
      }
    });
    createdCount++;
  });

  // CACHE (2026-09-05, review round 4): pull_orders_from_sapo (action, qua _dispatchWrite) tự bump
  // gen sau khi trả về, nhưng pullOrdersFromSapoTrigger() (cron trực tiếp, KHÔNG qua _dispatchWrite)
  // thì không — nếu trigger này được cài (hiện chưa cài, xem comment 'MỚI — test nút chủ động trước'
  // ở pullOrdersFromSapoTrigger), Customers row mới tạo qua đây có thể không invalidate cache
  // 'customers_upsert_scan' mới thêm (P1 perf fix), gây tạo trùng Customer nếu khách đó đặt đơn MOPS
  // trong vòng 300s kế tiếp. Bump ở đây phòng trước cho cả 2 đường gọi (action lẫn cron).
  if (createdCount > 0) { try { _bumpAnalyticsGen(); } catch (e) {} }

  _setSettingValue(ss, 'sapo_order_last_pulled_at', runAt);

  var syncLogSh = ss.getSheetByName(SHEET.SYNC_LOGS);
  var syncId = 'SYNC' + String(syncLogSh.getLastRow()).padStart(6, '0');
  syncLogSh.appendRow([syncId, 'ORDER_PULL', 'SUCCESS', createdCount + updatedCount,
    'created:' + createdCount + ', updated:' + updatedCount, runAt]);
  logActivity(ss, 'SYNC', syncId, 'ORDER_PULL_COMPLETE', payload && payload._callerUser || 'system');

  return { created: createdCount, updated: updatedCount, total: sapoOrders.length, pulled_since: modifiedMin };
}

// Time-based trigger — called by GAS every 15-30 phút (cấu hình trong Apps Script Editor >
// Triggers). Không truyền _callerUser — log lại 'system' cho các lần chạy tự động.
function pullOrdersFromSapoTrigger() {
  pullOrdersFromSapo({});
}

// Time-based trigger — called by GAS every 6h
function syncProductsTrigger() {
  syncProducts({});
}

// ============================================================
// EXPIRE PENDING PAYMENTS (CRON — every 5 min)
// ============================================================

function expirePendingPayments() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var paySh   = ss.getSheetByName(SHEET.PAYMENTS);
  var now     = new Date();

  if (paySh.getLastRow() < 2) return { expired: 0 };
  var payData = paySh.getRange(2, 1, paySh.getLastRow() - 1, 12).getValues();

  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var ordData  = ordersSh.getLastRow() > 1
    ? ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 18).getValues()
    : [];

  var ordersIndex = {};
  ordData.forEach(function(r, idx) { ordersIndex[String(r[0])] = idx + 2; });

  var expiredCount = 0;
  payData.forEach(function(r, idx) {
    var s = String(r[5]);
    if (s !== 'PENDING' && s !== 'PAYMENT_REPORTED') return;
    var expiresAt = r[7] ? new Date(r[7]) : null;
    if (!expiresAt || now <= expiresAt) return;

    paySh.getRange(idx + 2, 6).setValue('EXPIRED');

    var orderId  = String(r[1]);
    var orderRow = ordersIndex[orderId];
    if (orderRow) {
      ordersSh.getRange(orderRow, 8).setValue('EXPIRED');
    }

    logActivity(ss, 'PAYMENT', String(r[0]), 'PAYMENT_EXPIRED', 'system');

    // N5 — PAYMENT_EXPIRED → Customer → Tracking page
    notifyTrackingPage(ss, orderId, 'PAYMENT_EXPIRED', 'CUSTOMER',
      { paymentId: String(r[0]), expiredAt: now.toISOString() }
    );

    expiredCount++;
  });

  return { expired: expiredCount };
}

// ============================================================
// SETUP SHEET (chạy 1 lần — tạo 32 sheet + Dashboard theo docs/mops.md).
// An toàn chạy lại nhiều lần trên sheet ĐÃ CÓ DỮ LIỆU THẬT (Products/Customers/
// Orders/Payments/Coupons/PaymentVouchers) — writeHeader() chỉ ghi đè ĐÚNG dòng 1
// (header), không đụng dữ liệu từ dòng 2. Mọi cột mới đều nối đuôi, không chèn
// giữa — không phá vị trí cột cũ.
//
// Còn 2 sheet KHÔNG được hàm này tạo, PHẢI tạo tay (đúng chủ đích, xem
// docs/mops.md §11/§14): `Staffs` (12 cột) và `Permissions` (Role|Permission,
// 2 cột) — seed Permissions theo đúng 22 permission string liệt kê ở §14.
// ============================================================

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  function getOrCreate(name) {
    return ss.getSheetByName(name) || ss.insertSheet(name);
  }

  function writeHeader(sh, headers) {
    sh.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#3CB371')
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }

  // Sheet 1: Settings
  var settingsSh = getOrCreate(SHEET.SETTINGS);
  writeHeader(settingsSh, ['Key', 'Value']);
  if (settingsSh.getLastRow() < 2) {
    settingsSh.getRange(2, 1, 16, 2).setValues([
      ['BANK_CODE',        'MB'],
      ['ACCOUNT_NO',       ''],
      ['ACCOUNT_NAME',     'PHARMA COSMETICS'],
      ['TELEGRAM_CHAT_ID', ''],
      ['SAPO_STORE',       'pharmacosmetics-vn.mysapo.net'],
      ['APP_VERSION',      '2.1.0'],
      ['ENV',              'production'],
      ['MAINTENANCE',      'FALSE'],
      // GHN vận chuyển (phase 2026-07-17) — GHN_TOKEN là secret (Script Properties, không có row ở đây).
      // GHN_ENV mặc định 'dev' (sandbox 5sao.ghn.dev). Dims mặc định (cm) cho tính cước khi SP chưa có kích thước.
      ['GHN_ENV',              'dev'],
      ['GHN_SHOP_ID',          ''],
      ['GHN_FROM_DISTRICT_ID', ''],
      ['GHN_FROM_WARD_CODE',   ''],
      ['GHN_DEFAULT_LENGTH',   '20'],
      ['GHN_DEFAULT_WIDTH',    '15'],
      ['GHN_DEFAULT_HEIGHT',   '10'],
      ['GHN_COD_ACCOUNT_ID',   '']
      // SAPO_API_KEY, SAPO_SECRET, TELEGRAM_TOKEN KHÔNG có row ở đây —
      // đây là 3 secret thật, lưu qua PropertiesService (xem SECRET_KEYS).
      // Điền qua tab Cấu hình > SAPO API / Telegram trong MOPS Admin (ghi tự
      // động vào Script Properties), hoặc trực tiếp: Apps Script Editor >
      // Project Settings > Script Properties.
    ]);
  }

  // Sheet 2: ProductMappings — Unit/IsMapped (docs/mops.md §1, review 2): cột thêm cuối, an toàn
  // với dữ liệu cũ. IsMapped là computed — code phải tự set lại khi list/hiển thị, KHÔNG phải
  // giá trị nhập tay tĩnh (xem ghi chú mops.md).
  var mappingSh = getOrCreate(SHEET.PRODUCT_MAPPINGS);
  writeHeader(mappingSh, ['Handle','Enabled','Capabilities','DepositAmount','SAPOSyncRequired','DisplayName','SortOrder','CostPrice','SafetyStockMin','SafetyStockMax','Unit','IsMapped']);

  // Sheet 3: Products — Barcode (docs/mops.md §1, review 2): syncProducts() PHẢI được sửa để
  // kéo variant.barcode từ SAPO trước khi cột này có dữ liệu thật — cột chỉ tạo sẵn ở đây.
  var productSh = getOrCreate(SHEET.PRODUCTS);
  // VariantTitle (cột R, nối cuối — review 2026-07-17 đa-biến-thể): nhãn phân biệt biến thể/size
  // ("M", "Đỏ / L"...) từ SAPO variant.title. Cần cho picker chọn biến thể — Title (cột E) là tên
  // SẢN PHẨM, mọi biến thể trùng nhau nên không phân biệt được nếu thiếu cột này.
  writeHeader(productSh, ['ProductID','VariantID','Handle','SKU','Title','Vendor','ProductType','Price','CompareAtPrice','Weight','RequiresShipping','Image','Status','UpdatedAt','Source','InventoryQty','Barcode','VariantTitle']);

  // Sheet 4: Customers — SAPOCustomerID/Source (docs/mops.md §2, review 2). KHÔNG có
  // TotalSpend/TotalOrders — đã cân nhắc và bỏ (listCustomers() đã gom nhóm hiệu quả, xem mops.md).
  // +CustomerGroup/DefaultDiscountPercent (cột J/K, §16 review 22/23) — chính sách giá Khách Sỉ.
  // +Hồ sơ CRM (cột L-T 🆕, review Drawer CRM 2026-07-16) — nối CUỐI bảng đúng nguyên tắc append-only.
  // Đặt tên AcquisitionChannel (KHÔNG dùng lại "Source") — cột I `Source` hiện có đã mang nghĩa khác
  // (hệ thống tạo bản ghi: LOCAL/SAPO), trùng tên nhưng khác nghĩa với "kênh marketing khách đến từ
  // đâu" sẽ đè lẫn nhau y hệt bài học Orders.Source vs OriginSystem (mops.md §10).
  var custSh = getOrCreate(SHEET.CUSTOMERS);
  // ExternalCode (cột U/21, nối cuối 2026-07-27): mã khách của hệ thống CŨ từ file nhập (vd CUZN03697).
  // KHÁC CustomerID (MOPS sinh) và KHÁC SAPOCustomerID (id số của Sapo — nhét mã lạ vào đó là phá sync).
  // Dùng làm khoá dedup phụ khi nhập lại. Xem importCustomers/exportCustomers.
  writeHeader(custSh, ['CustomerID','Phone','Name','Email','FirstOrderAt','LastOrderAt','Status','SAPOCustomerID','Source','CustomerGroup','DefaultDiscountPercent','AddressStreet','AddressWard','AddressDistrict','AddressCity','Birthday','AcquisitionChannel','Notes','LoyaltyPoints','MembershipTier','ExternalCode']);

  // Sheet 5: Orders — 5 cột đồng bộ SAPO 2 chiều (docs/mops.md §10, review 2). Nối đuôi S-W,
  // KHÔNG chèn giữa — có ~9 chỗ getRange(...,18) hardcode trong file này, PHẢI rà lại thành 23
  // trước khi các cột mới này có dữ liệu đọc/ghi đúng (xem cảnh báo trong mops.md §10).
  // +OrderDiscountType/Value/Reason (cột X/Y/Z, §16 review 22/23) — chiết khấu thủ công/Sỉ tại quầy,
  // loại trừ với DiscountCode/DiscountAmount (coupon, cột Q/R) — xem createOrder().
  var ordersSh = getOrCreate(SHEET.ORDERS);
  // +BranchID (cột AA 🆕, review 31) — FK vào Branches, thêm CUỐI bảng đúng nguyên tắc append-only
  // (11 chỗ ordersSh.getRange(...,18/23/26) hiện có không bị ảnh hưởng, chỉ đơn giản không đọc tới).
  // +SAPOOrderName (cột AB 🆕, review đồng bộ SAPO 2026-07-15) — mã đơn hiển thị trên SAPO Admin
  // (vd "#SON1001", field `name` trong response orders.json), KHÁC OrderID (mã MOPS tự sinh) và
  // KHÁC SAPOOrderID (id số nội bộ dùng để check trùng) — mục đích DUY NHẤT là cho nhân viên tra
  // chéo với Sapo Admin, không dùng làm khoá check trùng (giữ nguyên SAPOOrderID cho việc đó).
  // FulfillmentStatus (cột AC/29, nối cuối — phase vận chuyển 2026-07-17): pipeline xử lý đơn, TRỤC
  // RIÊNG cạnh PaymentStatus (cột H). 9 trạng thái, xem FULFILLMENT_STATUSES. Nối cuối để không lệch
  // 28 cột cũ. (Cột shipping GHN: Carrier/TrackingCode/ShippingFee/CODAmount/ShippingServiceId thêm ở B2/B4.)
  // Cột AD-AH (30-34, nối cuối — phase vận chuyển GHN 2026-07-17): Carrier/TrackingCode/ShippingFee/
  // CODAmount/ShippingServiceId. Ghi bởi ghn_create_shipment (B4); CODAmount cũng set khi tạo đơn COD (B6).
  // Cột AI-AL (35-38, nối cuối 2026-07-27): PackedAt/PackageWeight(gram)/PackageDims('DxRxC' cm) — mốc
  // ĐÓNG GÓI + số đo THỰC, tách khỏi trạng thái giao; LastTrackedAt (unix giây) = mốc cập nhật gần nhất
  // từ hãng, dùng để BỎ QUA webhook đến sai thứ tự. Đọc/ghi qua SHIPMENT_COL + _shipmentGet/_shipmentSet
  // (KHÔNG getRange số cột rời rạc nữa) — đó là lớp đệm để sau tách sheet `Shipments` không phải sửa adapter.
  writeHeader(ordersSh, ['OrderID','CustomerID','OrderType','Source','Amount','DepositAmount','ShippingAddressID','PaymentStatus','SAPOSyncStatus','SAPOOrderID','CreatedAt','CreatedBy','CustomerNote','AppointmentDate','AppointmentTime','Store','DiscountCode','DiscountAmount','OriginSystem','SAPOFinancialStatus','SAPOFulfillmentStatus','SyncRetryCount','LastSyncedAt','OrderDiscountType','OrderDiscountValue','OrderDiscountReason','BranchID','SAPOOrderName','FulfillmentStatus','Carrier','TrackingCode','ShippingFee','CODAmount','ShippingServiceId','PackedAt','PackageWeight','PackageDims','LastTrackedAt','CustomerShippingFee','CustomerShippingFeeManual']);

  // Sheet 6: OrderItems — UnitCost (Phase 02 Bước 4, xem docs/architecture/inventory.md §2.1):
  // cột thêm cuối, an toàn với dữ liệu cũ (đơn hàng trước Inventory sẽ có UnitCost rỗng =
  // "chưa có dữ liệu giá vốn tại thời điểm đó", chấp nhận được vì là dữ liệu lịch sử).
  // +DiscountType/Value/Reason (cột M/N/O, §16) — spec sẵn, createOrder() CHƯA ghi (chỉ order-level
  // đã code — xem §16 review 23), để cột trống chờ khi cần chiết khấu theo từng dòng sản phẩm.
  var itemsSh = getOrCreate(SHEET.ORDER_ITEMS);
  writeHeader(itemsSh, ['OrderItemID','OrderID','ProductID','VariantID','Handle','SKU','ProductName','Price','Qty','LineTotal','SnapshotJSON','UnitCost','DiscountType','DiscountValue','DiscountReason']);

  // Sheet: DiscountLimits — RBAC lookup 2 cột (docs/mops.md §16), cùng dạng Permissions. Không sinh
  // ID, chỉnh tay bởi Owner. Role không có dòng ở đây → _getMaxDiscountPercent() trả 0 (fail-closed).
  var discLimitsSh = getOrCreate(SHEET.DISCOUNT_LIMITS);
  writeHeader(discLimitsSh, ['Role', 'MaxDiscountPercent']);

  // Sheet 7: ShippingAddresses
  var shipSh = getOrCreate(SHEET.SHIPPING);
  // ProvinceID/DistrictID/WardCode (K/L/M, nối cuối — phase vận chuyển GHN 2026-07-17): mã hành chính
  // GHN, nguồn sự thật khi gọi API GHN. Cột TÊN (E/F/G) chỉ để hiển thị.
  writeHeader(shipSh, ['AddressID','CustomerID','ReceiverName','Phone','Province','District','Ward','Address','PostalCode','IsDefault','ProvinceID','DistrictID','WardCode']);

  // Sheet 8: Payments
  var paySh = getOrCreate(SHEET.PAYMENTS);
  writeHeader(paySh, ['PaymentID','OrderID','TransactionRef','Method','Amount','Status','CreatedAt','ExpiresAt','PaidAt','RefundAt','RefundNote','RawData']);

  // Sheet 9: SyncLogs
  var syncSh = getOrCreate(SHEET.SYNC_LOGS);
  writeHeader(syncSh, ['SyncID','Type','Status','RecordCount','Message','CreatedAt']);

  // Sheet 10: ActivityLogs
  var actSh = getOrCreate(SHEET.ACTIVITY_LOGS);
  writeHeader(actSh, ['LogID','EntityType','EntityID','Action','User','CreatedAt']);

  // Sheet 11: Notifications
  var notifSh = getOrCreate(SHEET.NOTIFICATIONS);
  // K..N (phase-07 Lớp 5 queue): Message (text đã render để gửi lại), RetryCount, NextAttemptAt (ISO —
  // backoff/reclaim), ChatId (đích từng recipient khi routed). Dòng notif cũ để trống → xử lý bình thường.
  writeHeader(notifSh, ['NotifID','OrderID','Event','RecipientType','Channel','Status','SentAt','ErrorMsg','Payload','CreatedAt','Message','RetryCount','NextAttemptAt','ChatId']);

  // Sheet 12: CashTransactions — Thu Chi thủ công (V2.4, legacy — xem docs/vision/mops-erp-roadmap.md)
  var cashTxSh = getOrCreate(SHEET.CASH_TRANSACTIONS);
  writeHeader(cashTxSh, ['TransactionID','Type','Amount','Category','Reference','Note','Account','Status','CreatedAt','CreatedBy']);

  // Sheet 13: Coupons — mã giảm giá (Code là khoá tự nhiên, giống Handle của ProductMappings)
  // MaxDiscountAmount (docs/mops.md §9, review "Coupons"): trần số tiền giảm cho mã ValueType='percent'.
  var couponSh = getOrCreate(SHEET.COUPONS);
  writeHeader(couponSh, ['Code','Enabled','ValueType','Value','MinOrderAmount','MaxUses','UsedCount','StartAt','ExpiresAt','Description','CreatedAt','CreatedBy','MaxDiscountAmount','Title','ScopeTypes','ScopeProducts']);

  // ── Finance Core (Phase 01 Bước 1) — xem docs/architecture/finance.md ──
  // Sheet 14: CashAccounts
  var cashAccSh = getOrCreate(SHEET.CASH_ACCOUNTS);
  writeHeader(cashAccSh, ['AccountID','Name','Type','Branch','OpeningBalance','Active','CreatedAt']);
  if (cashAccSh.getLastRow() < 2) {
    // Seed 2 tài khoản mặc định — TÊN/SỐ DƯ ĐẦU KỲ LÀ GIẢ ĐỊNH, sửa lại đúng số
    // thật ngay trong sheet này trước khi dùng thật (không cần code lại).
    Repository.CashAccounts.create({ name: 'Tiền mặt',       type: 'CASH', opening_balance: 0 });
    Repository.CashAccounts.create({ name: 'Ngân hàng chính', type: 'BANK', opening_balance: 0 });
  }

  // Sheet 15: Receipts (Phiếu Thu) — SourceSystem+SourceType+SourceRef là bộ khoá
  // chống trùng "1 Business Event = 1 Document" (docs/architecture/finance.md §7.5)
  var receiptSh = getOrCreate(SHEET.RECEIPTS);
  writeHeader(receiptSh, ['ReceiptID','PartyID','AccountID','Status','PostingDate','DocumentDate','TotalAmount','Note','SourceSystem','SourceType','SourceRef','CreatedBy','CreatedAt','PostedAt','CancelledAt']);

  // Sheet 16: ReceiptLines
  var receiptLineSh = getOrCreate(SHEET.RECEIPT_LINES);
  writeHeader(receiptLineSh, ['LineID','ReceiptID','CategoryID','Amount','Note']);

  // Sheet 17: LedgerEntries — KHÔNG bao giờ ghi tay, chỉ Posting Engine (postDocument()/
  // reverseDocument()) được ghi vào sheet này.
  var ledgerSh = getOrCreate(SHEET.LEDGER_ENTRIES);
  writeHeader(ledgerSh, ['LedgerID','DocumentType','DocumentID','PostingDate','AccountID','Type','Amount','CategoryID','PartyID','ReversalOf','Note','CreatedAt']);

  // Sheet 18: IncomeCategories (2 cấp: Group > Name) — xem docs/vision/mops-erp-roadmap.md
  var incCatSh = getOrCreate(SHEET.INCOME_CATEGORIES);
  writeHeader(incCatSh, ['CategoryID','Group','Name','Active']);
  if (incCatSh.getLastRow() < 2) {
    [
      ['Thu bán hàng',   'Thanh toán đơn hàng'], ['Thu bán hàng', 'Thanh toán đặt cọc'], ['Thu bán hàng', 'Thanh toán công nợ'],
      ['Thu tài chính',  'Lãi ngân hàng'],       ['Thu tài chính', 'Thu hồi tạm ứng'],
      ['Thu khác',       'Thanh lý tài sản'],    ['Thu khác',      'Thu hoàn tiền'],    ['Thu khác', 'Thu khác']
    ].forEach(function(pair) { Repository.Categories.create('INCOME', pair[0], pair[1]); });
  }

  // Sheet 19: ExpenseCategories (2 cấp: Group > Name)
  var expCatSh = getOrCreate(SHEET.EXPENSE_CATEGORIES);
  writeHeader(expCatSh, ['CategoryID','Group','Name','Active']);
  if (expCatSh.getLastRow() < 2) {
    [
      ['Nhập hàng',      'Thanh toán nhập hàng'], ['Nhập hàng', 'Trả nhà cung cấp'],
      ['Nhân sự',        'Lương'], ['Nhân sự', 'Thưởng'], ['Nhân sự', 'Hoa hồng'], ['Nhân sự', 'BHXH'], ['Nhân sự', 'Phụ cấp'],
      ['Văn phòng',      'Tiền nhà'], ['Văn phòng', 'Điện'], ['Văn phòng', 'Nước'], ['Văn phòng', 'Internet'], ['Văn phòng', 'Văn phòng phẩm'],
      ['Marketing',      'Facebook Ads'], ['Marketing', 'Google Ads'], ['Marketing', 'TikTok Ads'], ['Marketing', 'KOL/KOC'], ['Marketing', 'Livestream'], ['Marketing', 'Chụp ảnh'],
      ['Thuế',           'VAT'], ['Thuế', 'Thuế TNCN'], ['Thuế', 'Thuế môn bài'], ['Thuế', 'Thuế khác'],
      ['Chi tài chính',  'Phí ngân hàng'], ['Chi tài chính', 'Lãi vay'],
      ['Khác',           'Hoàn tiền khách'], ['Khác', 'Tài trợ'], ['Khác', 'Chi khác']
    ].forEach(function(pair) { Repository.Categories.create('EXPENSE', pair[0], pair[1]); });
  }

  // Sheet 20: AuditTrail — bổ sung ActivityLogs, chỉ dùng cho hành động Finance nhạy cảm
  // (Before/After/Reason). Xem docs/architecture/security.md §3 — KHÔNG có cột IP.
  var auditTrailSh = getOrCreate(SHEET.AUDIT_TRAIL);
  writeHeader(auditTrailSh, ['AuditID','EntityType','EntityID','Action','Before','After','Reason','ActorStaffId','CreatedAt']);

  // Sheet 21: PaymentVouchers (Phiếu Chi, Bước 2) — vòng đời Draft→PendingApproval→
  // Approved→Posted→Cancelled, khác Receipt (không có bước duyệt). BillID (Phase 04 Bước 3):
  // rỗng nếu phiếu chi không liên quan trả nợ NCC. ReturnID/PurchaseOrderID (docs/mops.md §5/§13,
  // review Hoàn hàng + review 9): ReturnID = hoàn tiền khách trả hàng; PurchaseOrderID = cọc trả
  // NCC TRƯỚC khi có Bill (Bill chỉ sinh lúc PurchaseOrder→Posted) — khi Bill được tạo, code phải
  // quét PurchaseOrderID để retroactive gán BillID + gọi _recalcBillStatus() (xem mops.md §6).
  var pvSh = getOrCreate(SHEET.PAYMENT_VOUCHERS);
  writeHeader(pvSh, ['VoucherID','PartyID','AccountID','Status','PostingDate','DocumentDate','TotalAmount','Note','AttachmentURL','CreatedBy','ApprovedBy','CreatedAt','ApprovedAt','PostedAt','CancelledAt','BillID','ReturnID','PurchaseOrderID']);

  // Sheet 22: PaymentVoucherLines
  var pvLineSh = getOrCreate(SHEET.PAYMENT_VOUCHER_LINES);
  writeHeader(pvLineSh, ['LineID','VoucherID','CategoryID','Amount','Note']);

  // Sheet 23: Transfers (Chuyển quỹ, Bước 3) — không có Lines, không cần duyệt
  var transferSh = getOrCreate(SHEET.TRANSFERS);
  writeHeader(transferSh, ['TransferID','FromAccountID','ToAccountID','Amount','Status','PostingDate','Note','CreatedBy','CreatedAt','PostedAt','CancelledAt']);

  // Sheet 24: CashAdjustments (Điều chỉnh quỹ, Bước 3) — LUÔN bắt buộc qua Approved
  var adjSh = getOrCreate(SHEET.CASH_ADJUSTMENTS);
  writeHeader(adjSh, ['AdjustmentID','AccountID','Direction','Amount','Reason','Status','ApprovedBy','CreatedBy','CreatedAt','ApprovedAt','PostedAt','CancelledAt']);

  // ── Inventory (Phase 02 Bước 1) — xem docs/architecture/inventory.md ──
  // Sheet 25: Suppliers — Master Data nhà cung cấp, không seed (admin nhập tay dữ liệu thật)
  // +ContactPerson/Email/TaxCode (cột H-J 🆕, review Suppliers 2026-07-16) — nối cuối, append-only.
  var supplierSh = getOrCreate(SHEET.SUPPLIERS);
  // +Province/Ward (cột K-L 🆕, review 2026-07-16) — nối cuối, append-only, 2 cấp (bỏ Huyện).
  writeHeader(supplierSh, ['SupplierID','Name','Phone','Address','Note','Active','CreatedAt','ContactPerson','Email','TaxCode','Province','Ward']);

  // Sheet: Branches (đóng gap §19/§20 mops.md, review 31) — FK cho Orders.BranchID (cột AA, xem
  // writeHeader(ordersSh,...) bên dưới) + CashAccounts.Branch (đổi tay giá trị cũ, không phải code).
  // Seed 1 chi nhánh mặc định để _resolveBranch fallback trong createOrder() luôn có nơi để về.
  var branchSh = getOrCreate(SHEET.BRANCHES);
  // +Province/Ward (cột M-N 🆕, review 2026-07-16) — nối cuối, append-only, 2 cấp (bỏ Huyện).
  // +DefaultBankAccountID (cột O 🆕, 2026-07-21) — nối cuối, TK ngân hàng mặc định của chi nhánh.
  writeHeader(branchSh, ['BranchID','NameVi','NameEn','Phone','Email','Address','TaxCode','Active','SortOrder','IsDefault','CreatedAt','CreatedBy','Province','Ward','DefaultBankAccountID']);
  if (branchSh.getLastRow() < 2) {
    Repository.Branches.create({ name_vi: 'Chi nhánh chính', is_default: true, sort_order: 1, created_by: 'system' });
  }

  // Sheet: BankAccounts (2026-07-21) — nhiều TK nhận VietQR + 1 mặc định toàn cục. Migrate: nếu trống
  // và Settings legacy đã có BANK_CODE/ACCOUNT_NO → seed thành 1 dòng mặc định, rồi trỏ chi nhánh chính
  // vào đó (idempotent — chạy lại setupSheet không nhân đôi vì chỉ seed khi sheet đang trống).
  var bankSh = getOrCreate(SHEET.BANK_ACCOUNTS);
  writeHeader(bankSh, ['BankAccountID','BankCode','AccountNo','AccountName','IsDefault','Active','CreatedAt']);
  if (bankSh.getLastRow() < 2) {
    var _cfg = getSettings(SpreadsheetApp.getActiveSpreadsheet());
    if (_cfg.BANK_CODE && _cfg.ACCOUNT_NO) {
      var _seedId = Repository.BankAccounts.create({
        bank_code: _cfg.BANK_CODE, account_no: _cfg.ACCOUNT_NO,
        account_name: _cfg.ACCOUNT_NAME || 'PHARMA COSMETICS', is_default: true
      });
      var _mainBr = Repository.Branches.findDefault();
      if (_mainBr) Repository.Branches.update(_mainBr.branch_id, { default_bank_account_id: _seedId });
    }
  }

  // Sheet 26: Parties — hợp nhất Customer/Supplier/Employee/Other cho AR/AP (finance.md §4.1).
  // Đợt này chỉ có Party Type=SUPPLIER, tạo qua createSupplier() — không seed tay ở đây.
  var partySh = getOrCreate(SHEET.PARTIES);
  writeHeader(partySh, ['PartyID','Type','RefID','Name','Contact','Active','CreatedAt']);

  // ── Inventory (Phase 02 Bước 2) ──
  // Sheet 27: PurchaseOrders (Header, Draft→Posted→Cancelled). ShippingCost/StorageCost/
  // VATAmount/AllocationBasis/DiscountAmount/PaymentTerms/DepositPercent (docs/mops.md §6,
  // review 9-10): landed cost + cọc NCC. Bill.Amount (autoCreateBill()) PHẢI = TotalAmount +
  // ShippingCost + StorageCost + VATAmount − DiscountAmount (chi phí gộp vào công nợ NCC, đã
  // chốt review 10) — sửa call site autoCreateBill() hiện đang truyền po.total_amount thuần.
  var poSh = getOrCreate(SHEET.PURCHASE_ORDERS);
  writeHeader(poSh, ['PurchaseOrderID','SupplierID','Status','OrderDate','TotalAmount','Note','CreatedBy','CreatedAt','PostedAt','CancelledAt','ShippingCost','StorageCost','VATAmount','AllocationBasis','DiscountAmount','PaymentTerms','DepositPercent']);

  // Sheet 28: PurchaseItems (Line) — UnitCost là giá vốn CỦA LÔ NÀY, không phải giá vốn chung SP.
  // Weight/LotCode/MfgDate/ExpDate/Barcode/AllocatedCost/UnitCostLanded (docs/mops.md §6, review 1):
  // UnitCostLanded = (Qty×UnitCost + AllocatedCost) / Qty, dùng làm UnitCost khi ghi
  // InventoryMovements Type=IN lúc Posted — KHÔNG ghi vào ProductMappings.CostPrice (xem §1,
  // review 11 — cột đó không được code tự động cập nhật, giá vốn động thật là _calcAvgCost()).
  var poItemSh = getOrCreate(SHEET.PURCHASE_ITEMS);
  writeHeader(poItemSh, ['PurchaseItemID','PurchaseOrderID','ProductID','ProductName','Qty','UnitCost','LineTotal','Weight','LotCode','MfgDate','ExpDate','Barcode','AllocatedCost','UnitCostLanded','VariantID']);

  // Sheet 29: InventoryMovements — append-only, KHÔNG dùng để tính tồn hiển thị (Hướng A,
  // xem docs/architecture/inventory.md §4) — chỉ audit + nguồn giá vốn bình quân gia quyền.
  var moveSh = getOrCreate(SHEET.INVENTORY_MOVEMENTS);
  // VariantID (cột K, nối cuối — review 2026-07-17 đa-biến-thể) để tồn kho + giá vốn bình quân tính
  // theo TỪNG biến thể/size, không gộp cả sản phẩm. Nối cuối để không lệch index 10 cột cũ đang đọc.
  writeHeader(moveSh, ['MovementID','ProductID','Type','Qty','UnitCost','SourceType','SourceRef','Note','CreatedBy','CreatedAt','VariantID']);

  // ── AP (Phase 04 Bước 3) — xem docs/architecture/finance.md §4.3 ──
  // Sheet 30: Bills — Status KHÔNG nhập tay, luôn tính lại bởi _recalcBillStatus()
  var billSh = getOrCreate(SHEET.BILLS);
  writeHeader(billSh, ['BillID','PartyID','Amount','DueDate','Status','SourceSystem','SourceType','SourceRef','CreatedAt']);

  // ── Returns & Refunds (docs/mops.md §13) — MỚI, chưa từng dán production ──
  // Sheet 31: OrderReturns (Header) — IsRefunded là boolean thật, KHÔNG phải string 'Có'/'Không'.
  // TotalRefundAmount có thể khác Σ OrderReturnItems.LineTotal (có chủ đích — hoàn 1 phần).
  var orderReturnSh = getOrCreate(SHEET.ORDER_RETURNS);
  writeHeader(orderReturnSh, ['ReturnID','OrderID','CustomerID','IsRefunded','AccountID','TotalRefundAmount','Reason','Status','CreatedBy','CreatedAt','PostedAt','CancelledAt']);

  // Sheet 32: OrderReturnItems (Line) — OrderItemID để tính đúng "còn được hoàn" theo TỪNG DÒNG
  // đơn hàng (không chỉ theo ProductID). UnitCost snapshot từ OrderItems.UnitCost của dòng gốc,
  // dùng làm UnitCost khi ghi InventoryMovements Type=IN, SourceType=RETURN lúc Posted.
  var orderReturnItemSh = getOrCreate(SHEET.ORDER_RETURN_ITEMS);
  writeHeader(orderReturnItemSh, ['ReturnItemID','ReturnID','OrderItemID','ProductID','ProductName','Unit','Quantity','Price','LineTotal','UnitCost']);

  // ── Shipping / Vận chuyển (Phase C, 2026-07-17) ──
  var carriersSh = getOrCreate(SHEET.SHIPPING_CARRIERS);
  writeHeader(carriersSh, ['CarrierCode','Name','Category','Connected','ExpiryDate','SupportInvoice','SortOrder','CreatedAt']);
  if (carriersSh.getLastRow() < 2) {
    // Seed 5 hãng. Connected=false → admin bật sau khi điền credential ở tab Cấu hình. GHN/Ahamove/GHTK/
    // VTP có adapter API; SPX (Shopee Express) KHÔNG có API công khai cho đơn ngoài sàn → Category='MANUAL'
    // (đi luồng "Tự giao" — nhập mã vận đơn tay). Thêm hãng khác = thêm dòng + 1 adapter (xem GHTK mẫu).
    // GOSHIP xếp đầu: là AGGREGATOR (1 kết nối → nhiều hãng) nên với hộ kinh doanh đây là lựa chọn nên
    // bật trước; 4 hãng trực tiếp bên dưới giữ làm phương án dự phòng khi đã có hợp đồng riêng với hãng.
    carriersSh.getRange(2, 1, 6, 8).setValues([
      ['GOSHIP',      'Goship (đa hãng)',   'SELF',   false, '', true, 1, nowIso()],
      ['GHN',         'Giao Hàng Nhanh',    'SELF',   false, '', true, 2, nowIso()],
      ['AHAMOVE',     'Ahamove',            'SELF',   false, '', true, 3, nowIso()],
      ['GHTK',        'Giao Hàng Tiết Kiệm','SELF',   false, '', true, 4, nowIso()],
      ['VIETTELPOST', 'Viettel Post',       'SELF',   false, '', true, 5, nowIso()],
      ['SPX',         'Shopee Express',     'MANUAL', false, '', true, 6, nowIso()]
    ]);
  }
  var reconSh = getOrCreate(SHEET.RECONCILIATIONS);
  writeHeader(reconSh, ['ReconID','CarrierCode','Status','PaymentStatus','TotalCODPartner','TotalFeePartner','TotalOther','NetTotal','CreatedAt','CreatedBy','PostedAt','Note']);
  var reconItemSh = getOrCreate(SHEET.RECONCILIATION_ITEMS);
  writeHeader(reconItemSh, ['ReconItemID','ReconID','TrackingCode','OrderID','CODSystem','CODPartner','FeeSystem','FeePartner','OtherFee','CODDiff','FeeDiff','NetActual']);

  // Dashboard sheet — formulas only
  var dashSh = getOrCreate('Dashboard');
  dashSh.getRange('A1').setValue('MOPS V2 Dashboard').setFontSize(14).setFontWeight('bold');
  var metrics = [
    ['Tổng doanh thu (PAID)',        '=SUMIF(Payments!F:F,"PAID",Payments!E:E)'],
    ['Số đơn đã thanh toán',         '=COUNTIF(Orders!H:H,"PAID")'],
    ['Số đơn chờ xử lý',            '=COUNTIF(Orders!H:H,"PENDING")'],
    ['Tổng khách hàng',              '=COUNTA(Customers!A:A)-1'],
    ['Sản phẩm đang hoạt động',      '=COUNTIF(Products!M:M,"active")'],
    ['Giao dịch chờ xác nhận',       '=COUNTIF(Payments!F:F,"PAYMENT_REPORTED")'],
    ['Thông báo gửi thành công hôm nay', '=COUNTIFS(Notifications!F:F,"SENT",Notifications!J:J,">="&TODAY())'],
    ['Thông báo thất bại',           '=COUNTIF(Notifications!F:F,"FAILED")']
  ];
  dashSh.getRange(3, 1, metrics.length, 2).setValues(metrics);
  dashSh.getRange(3, 1, metrics.length, 1).setFontWeight('bold');

  SpreadsheetApp.getUi().alert(
    'MOPS V2 Setup hoàn tất! ✅\n\n' +
    'Bước tiếp theo:\n' +
    '1. Điền BANK_CODE, ACCOUNT_NO, ACCOUNT_NAME, TELEGRAM_CHAT_ID vào Settings\n' +
    '2. Điền SAPO_API_KEY, SAPO_SECRET, TELEGRAM_TOKEN qua tab Cấu hình trong MOPS\n' +
    '   Admin (KHÔNG ghi vào Sheet — 3 giá trị này lưu ở Script Properties)\n' +
    '3. Chạy syncProducts() để đồng bộ sản phẩm từ SAPO\n' +
    '4. Cấu hình ProductMappings: Handle + Enabled=TRUE\n' +
    '5. Tạo tay sheet Staffs (12 cột) + Permissions (Role|Permission) — xem\n' +
    '   docs/mops.md §11/§14, KHÔNG tự tạo. NHỚ thêm quyền mới orders.sapo_pull\n' +
    '   cho role owner/admin — thiếu quyền này nút đồng bộ đơn sẽ báo lỗi\n\n' +
    'Đã có sẵn:\n' +
    '- APP_VERSION=2.1.0, ENV=production, MAINTENANCE=FALSE\n' +
    '- Bật bảo trì: đặt MAINTENANCE=TRUE trong Settings\n' +
    '- Kiểm tra hệ thống: GET ?action=health\n' +
    '- 2 CashAccounts mặc định (Tiền mặt/Ngân hàng chính) — SỬA LẠI số dư đầu kỳ thật\n' +
    '- IncomeCategories/ExpenseCategories đã seed sẵn danh mục 2 cấp\n' +
    '- ✅ MỚI (2026-07-10): Products.InventoryQty giờ do MOPS tự quản cho MỌI sản phẩm\n' +
    '  (SAPO không quản lý kho thật cho store này — Hướng A đã bỏ). Tự trừ khi bán,\n' +
    '  tự cộng khi nhập hàng/huỷ đơn/hoàn tiền. syncProducts() không còn ghi đè cột này\n' +
    '- ✅ MỚI: pullOrdersFromSapo() — kéo đơn từ SAPO về, action \'pull_orders_from_sapo\'\n' +
    '  (nút chủ động) + pullOrdersFromSapoTrigger() (cron) — CHƯA TEST với API thật,\n' +
    '  gọi thử 1 lần qua nút trước khi cài cron\n\n' +
    'Time-based triggers cần cài thủ công:\n' +
    '- expirePendingPayments      → mỗi 5 phút\n' +
    '- syncProductsTrigger        → mỗi 6 giờ\n' +
    '- pullOrdersFromSapoTrigger  → mỗi 15-30 phút (MỚI — test nút chủ động trước)\n\n' +
    '⚠️ CODE CHƯA VIẾT — sheet đã có cột nhưng logic vẫn phải tự hoàn thiện (xem docs/mops.md):\n' +
    '- Orders: rà lại ~9 chỗ getRange(...,18) hardcode (khác với pullOrdersFromSapo — hàm đó\n' +
    '  tự đọc đủ 23 cột, không đụng 9 chỗ cũ) nếu các hàm khác cần đọc 5 cột sync SAPO mới\n' +
    '- autoCreateBill(): sửa amount = TotalAmount+ShippingCost+StorageCost+VATAmount−DiscountAmount\n' +
    '- syncProducts(): thêm field Barcode (SAPO variant.barcode) vào payload đồng bộ\n' +
    '- updateOrderStatus() nhánh REFUNDED: thêm reverseDocument(\'RECEIPT\',...) — hiện chỉ đảo tồn kho\n' +
    '- Toàn bộ luồng OrderReturns/PurchaseOrders cọc NCC (§6/§13 mops.md) — CHƯA có action GAS nào'
  );
}

// ============================================================
// REPAIR LEGACY DATA — chạy TAY 1 LẦN (Apps Script Editor hoặc menu
// "⚡ PHARMA MOPS" trên Sheet). KHÔNG expose qua doGet/doPost — không phải
// action cho MOPS Admin gọi.
//
// Sửa dữ liệu đã ghi TRƯỚC 3 bản vá format trong session này:
// 1. Orders/Payments/OrderItems — ép lại định dạng Number cho cột tiền/số
//    lượng từng bị Sheets tự đổi thành Ngày tháng (kế thừa định dạng dòng trên
//    lúc appendRow, xem _forceNumberFormat).
// 2. Payments!Status — đồng bộ lại theo Orders!PaymentStatus cho đơn bị huỷ/
//    đổi trạng thái TRƯỚC khi updateOrderStatus() có bản vá đồng bộ 2 sheet.
// 3. Customers!Phone — vá số di động VN 10 số bị mất số 0 đầu (Sheets tự
//    chuyển thành Number trước khi có bản vá ép Plain Text trong upsertCustomer).
//
// An toàn chạy lại nhiều lần — dòng đã đúng sẽ không bị đổi gì thêm.
// ============================================================

function repairLegacyData() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  // ── 1) Ép định dạng Number cho toàn bộ cột tiền/số lượng ──
  function forceColumnNumber(sheetName, col) {
    var sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return;
    sh.getRange(2, col, sh.getLastRow() - 1, 1).setNumberFormat('#,##0');
  }
  forceColumnNumber(SHEET.ORDERS, 5);       // Amount
  forceColumnNumber(SHEET.ORDERS, 6);       // DepositAmount
  forceColumnNumber(SHEET.PAYMENTS, 5);     // Amount
  forceColumnNumber(SHEET.ORDER_ITEMS, 8);  // Price
  forceColumnNumber(SHEET.ORDER_ITEMS, 9);  // Qty
  forceColumnNumber(SHEET.ORDER_ITEMS, 10); // LineTotal
  log.push('✓ Đã ép định dạng Number: Orders!E,F · Payments!E · OrderItems!H,I,J');

  // ── 2) Đồng bộ Payments!Status theo Orders!PaymentStatus ──
  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var paySh    = ss.getSheetByName(SHEET.PAYMENTS);
  var ordData  = ordersSh.getLastRow() > 1
    ? ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 18).getValues()
    : [];
  var payData  = paySh.getLastRow() > 1
    ? paySh.getRange(2, 1, paySh.getLastRow() - 1, 12).getValues()
    : [];

  var paymentRowByOrderId = {};
  payData.forEach(function(r, idx) {
    paymentRowByOrderId[String(r[1])] = { row: idx + 2, status: String(r[5]) };
  });

  var statusFixCount = 0;
  ordData.forEach(function(r) {
    var orderId      = String(r[0]);
    var ordersStatus = String(r[7]);
    var payInfo      = paymentRowByOrderId[orderId];
    if (payInfo && payInfo.status !== ordersStatus) {
      paySh.getRange(payInfo.row, 6).setValue(ordersStatus);
      log.push('  Payments[' + orderId + ']: ' + payInfo.status + ' → ' + ordersStatus);
      statusFixCount++;
    }
  });
  log.push('✓ Đã đồng bộ ' + statusFixCount + ' dòng Payments!Status theo Orders!PaymentStatus');

  // ── 3) Vá Customers!Phone mất số 0 đầu — CHỈ khi khớp đúng kiểu lỗi đã biết:
  //      toàn chữ số, đúng 9 ký tự, không bắt đầu bằng 0. Số di động VN luôn 10
  //      số bắt đầu bằng 0 — suy luận này KHÔNG áp dụng cho định dạng số khác. ──
  var custSh   = ss.getSheetByName(SHEET.CUSTOMERS);
  var custData = custSh.getLastRow() > 1
    ? custSh.getRange(2, 1, custSh.getLastRow() - 1, 7).getValues()
    : [];
  var phoneFixCount = 0;
  custData.forEach(function(r, idx) {
    var phone = String(r[1]);
    if (/^\d{9}$/.test(phone)) {
      var fixed = '0' + phone;
      custSh.getRange(idx + 2, 2).setValue(fixed);
      log.push('  Customers[' + String(r[0]) + ']: ' + phone + ' → ' + fixed);
      phoneFixCount++;
    }
  });
  if (custSh.getLastRow() > 1) {
    // Plain text — không để Sheets nuốt số 0 đầu lần nữa nếu sau này sửa tay.
    custSh.getRange(2, 2, custSh.getLastRow() - 1, 1).setNumberFormat('@');
  }
  log.push('✓ Đã vá ' + phoneFixCount + ' số điện thoại mất số 0 đầu, ép Plain Text cho Customers!Phone');

  // ── 4) Vá Suppliers!Phone mất số 0 đầu — cùng bug, cùng điều kiện nhận diện, cột C
  //      (không phải B như Customers) — review Suppliers 2026-07-16. ──
  var supSh   = ss.getSheetByName(SHEET.SUPPLIERS);
  var supData = supSh && supSh.getLastRow() > 1
    ? supSh.getRange(2, 1, supSh.getLastRow() - 1, 3).getValues()
    : [];
  var supPhoneFixCount = 0;
  supData.forEach(function(r, idx) {
    var phone = String(r[2]);
    if (/^\d{9}$/.test(phone)) {
      var fixed = '0' + phone;
      supSh.getRange(idx + 2, 3).setValue(fixed);
      log.push('  Suppliers[' + String(r[0]) + ']: ' + phone + ' → ' + fixed);
      supPhoneFixCount++;
    }
  });
  if (supSh && supSh.getLastRow() > 1) {
    supSh.getRange(2, 3, supSh.getLastRow() - 1, 1).setNumberFormat('@');
  }
  log.push('✓ Đã vá ' + supPhoneFixCount + ' số điện thoại NCC mất số 0 đầu, ép Plain Text cho Suppliers!Phone');

  var summary = log.join('\n');
  Logger.log(summary);
  try {
    SpreadsheetApp.getUi().alert('Repair dữ liệu cũ hoàn tất!\n\n' + summary);
  } catch (ex) {
    // Chạy trực tiếp từ Apps Script Editor không phải lúc nào cũng có UI —
    // không sao, xem kết quả qua View > Execution log (Logger.log ở trên).
  }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ PHARMA MOPS')
    .addItem('Chạy setupSheet', 'setupSheet')
    .addItem('Repair dữ liệu cũ (Amount/Status/Phone)', 'repairLegacyData')
    .addToUi();
}
