
// ============================================================
// CREATE LOCAL PRODUCT (sản phẩm cục bộ — không cần có trên SAPO)
//  Dùng khi chưa cấu hình SAPO_API_KEY hoặc cho dịch vụ phát sinh
//  không bán qua storefront. Ghi thẳng vào Products + ProductMappings.
//  ProductID luôn có prefix 'LOCAL' — syncProducts() bỏ qua các dòng
//  này khi soft-delete sản phẩm không còn thấy trên SAPO.
// ============================================================

function _slugify(text) {
  var s = String(text || '').trim().toLowerCase();
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/đ/g, 'd');
  s = s.replace(/[^a-z0-9\s-]/g, '');
  s = s.replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s || 'san-pham';
}

function createLocalProduct(payload) {
  var ss        = SpreadsheetApp.getActiveSpreadsheet();
  var auditUser = payload._callerUser || 'staff';

  try {
    var title = _sanitizeText(payload.title, 200);
    if (!title) throw new Error('Tên sản phẩm là bắt buộc');

    var price = Number(payload.price);
    if (isNaN(price) || !isFinite(price) || price < 0) throw new Error('Giá bán không hợp lệ');

    var deposit = payload.deposit_amount === undefined || payload.deposit_amount === '' ? 0 : Number(payload.deposit_amount);
    if (isNaN(deposit) || !isFinite(deposit) || deposit < 0) throw new Error('Tiền cọc không hợp lệ');
    if (deposit > price) throw new Error('Tiền cọc không được vượt quá giá bán');

    var sku   = _sanitizeText(payload.sku, 200);
    var image = _sanitizeText(payload.image, 200);

    // Trước đây form Thêm sản phẩm chỉ có 6/13 field thật của Products/ProductMappings — thiếu
    // Vendor/ProductType/CompareAtPrice/Weight/RequiresShipping/Barcode/Unit (docs/mops.md §1).
    // Weight đặc biệt quan trọng: nếu để 0 mãi, sản phẩm LOCAL không thể nhập hàng đúng khi Phiếu
    // nhập hàng chọn AllocationBasis=WEIGHT (§6) — landed cost của MỌI dòng khác trong phiếu đó
    // cũng sai vì chia theo tổng Weight cả phiếu.
    var compareAtPrice = payload.compare_at_price === undefined || payload.compare_at_price === '' ? 0 : Number(payload.compare_at_price);
    if (isNaN(compareAtPrice) || !isFinite(compareAtPrice) || compareAtPrice < 0) throw new Error('Giá gốc không hợp lệ');
    var weight = payload.weight === undefined || payload.weight === '' ? 0 : Number(payload.weight);
    if (isNaN(weight) || !isFinite(weight) || weight < 0) throw new Error('Khối lượng không hợp lệ');
    var vendor           = _sanitizeText(payload.vendor, 100) || 'MOPS Local';
    var productType      = _sanitizeText(payload.product_type, 100);
    var barcode          = _sanitizeText(payload.barcode, 100);
    var unit             = _sanitizeText(payload.unit, 50);
    var requiresShipping = !!payload.requires_shipping;

    var productSheet = ss.getSheetByName(SHEET.PRODUCTS);
    var mappingSheet = ss.getSheetByName(SHEET.PRODUCT_MAPPINGS);
    if (!productSheet) throw new Error('Sheet Products không tồn tại');
    if (!mappingSheet) throw new Error('Sheet ProductMappings không tồn tại');

    var existingHandles = {};
    if (productSheet.getLastRow() > 1) {
      productSheet.getRange(2, 3, productSheet.getLastRow() - 1, 1).getValues()
        .forEach(function(r) { existingHandles[String(r[0])] = true; });
    }

    var baseHandle = _slugify(title);
    var handle     = baseHandle;
    var suffix     = 2;
    while (existingHandles[handle]) {
      handle = baseHandle + '-' + suffix;
      suffix++;
    }

    var productId = generateId(productSheet, 'LOCAL', 4);
    var now       = nowIso();

    var costPrice = Number(payload.cost_price) || 0;
    if (costPrice < 0) throw new Error('Giá vốn không hợp lệ');

    // InventoryQty ban đầu — TUỲ CHỌN (review Quick Add 2026-07-16). SP LOCAL không đồng bộ từ
    // SAPO nên không ai tự điền số này ngoài staff; mặc định 0 nếu bỏ trống (dịch vụ/combo không
    // có khái niệm tồn kho), khác 0 nếu staff chủ động khai báo tồn ban đầu.
    var inventoryQty = payload.inventory_qty === undefined || payload.inventory_qty === '' ? 0 : Number(payload.inventory_qty);
    if (isNaN(inventoryQty) || !isFinite(inventoryQty) || inventoryQty < 0) throw new Error('Tồn kho ban đầu không hợp lệ');

    // Cột: ProductID, VariantID, Handle, SKU, Title, Vendor, ProductType, Price,
    //      CompareAtPrice, Weight, RequiresShipping, Image, Status, UpdatedAt, Source, InventoryQty, Barcode, VariantTitle
    // SP LOCAL là single-variant (VariantID=ProductID) → VariantTitle rỗng.
    productSheet.appendRow([productId, productId, handle, sku, title, vendor, productType, price, compareAtPrice, weight, requiresShipping, image, 'active', now, 'LOCAL', inventoryQty, barcode, '']);
    var productRowNum = productSheet.getLastRow();
    _forceNumberFormat(productSheet, productRowNum, [8, 9, 10]); // Price, CompareAtPrice, Weight

    try {
      // Cột: Handle, Enabled, Capabilities, DepositAmount, SAPOSyncRequired, DisplayName, SortOrder,
      //      CostPrice, SafetyStockMin, SafetyStockMax, Unit
      mappingSheet.appendRow([handle, true, 'deposit', deposit, false, title, 999, costPrice, 0, 0, unit]);
      _forceNumberFormat(mappingSheet, mappingSheet.getLastRow(), [4]); // DepositAmount
    } catch (writeErr) {
      // Ghi ProductMappings lỗi sau khi Products đã ghi — dọn dòng mồ côi.
      try { productSheet.deleteRow(productRowNum); } catch (e2) { /* best-effort */ }
      throw writeErr;
    }

    logActivity(ss, 'PRODUCT', handle, 'LOCAL_PRODUCT_CREATED', auditUser);
    _mappingsCacheBust();
    _memoBust('__prodRowIdx'); // vừa thêm dòng Products → index tồn kho phải tính lại
    return { handle: handle, product_id: productId };
  } catch (ex) {
    logActivity(ss, 'PRODUCT', payload.title || '(unknown)', 'LOCAL_PRODUCT_CREATE_FAILED', auditUser + ' — ' + ex.message);
    throw ex;
  }
}

// ============================================================
// IMPORT LOCAL PRODUCTS — nhận mảng JSON đã được frontend đọc từ CSV/XLSX.
// Web App GAS không nhận multipart file trực tiếp, vì vậy Excel được chuyển tại
// trình duyệt trước khi gửi. Mỗi dòng gọi chung createLocalProduct() để dùng đúng
// validation, format sheet, activity log và cơ chế chống trùng handle hiện có.
// ============================================================
var PRODUCT_IMPORT_MAX_ROWS = 50;
function importProducts(payload) {
  var rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) throw new Error('Không có dòng sản phẩm để nhập');
  if (rows.length > PRODUCT_IMPORT_MAX_ROWS) {
    throw new Error('Mỗi lô chỉ tối đa ' + PRODUCT_IMPORT_MAX_ROWS + ' sản phẩm');
  }

  var stat = { created: 0, skipped: 0, error: 0 };
  var results = [];
  rows.forEach(function(raw, index) {
    var title = String(raw && raw.title || '').trim();
    if (!title) {
      stat.skipped++;
      results.push({ row: index + 1, status: 'skipped', message: 'Thiếu tên sản phẩm' });
      return;
    }
    try {
      var product = createLocalProduct({
        title: title,
        price: raw.price === undefined || raw.price === '' ? 0 : raw.price,
        sku: raw.sku || '',
        image: raw.image || '',
        compare_at_price: raw.compare_at_price === undefined ? '' : raw.compare_at_price,
        cost_price: raw.cost_price === undefined ? '' : raw.cost_price,
        deposit_amount: raw.deposit_amount === undefined ? '' : raw.deposit_amount,
        vendor: raw.vendor || '',
        product_type: raw.product_type || '',
        unit: raw.unit || '',
        weight: raw.weight === undefined ? '' : raw.weight,
        barcode: raw.barcode || '',
        requires_shipping: raw.requires_shipping === true,
        _callerUser: payload._callerUser || 'staff'
      });
      stat.created++;
      results.push({ row: index + 1, status: 'created', handle: product.handle });
    } catch (err) {
      stat.error++;
      results.push({ row: index + 1, status: 'error', message: String(err && err.message || err).substring(0, 200) });
    }
  });
  return { stat: stat, results: results };
}

// ============================================================
// GET CUSTOMER — hồ sơ đầy đủ 1 khách hàng (Drawer CRM tab Khách hàng), gồm profile
// (địa chỉ/ghi chú/loyalty — dữ liệu nội bộ, KHÔNG bao giờ lộ qua getOrdersByContact() công khai),
// thống kê hành vi mua (tần suất, top sản phẩm) + danh sách đơn. Yêu cầu quyền customers.view.
// Tái dùng getOrdersByContact() (đã quét Orders theo customerId) để không quét lại cùng 1 sheet
// 2 lần cho cùng 1 phone — CHỈ hàm này (không phải getOrdersByContact) mới đọc thêm Customers để
// lấy hồ sơ, vì getOrdersByContact còn được gọi công khai (action get_orders_by_contact, không
// token) cho trang tra cứu đơn của khách — không được rò rỉ Notes/Address/LoyaltyPoints qua đó.
// ============================================================

function getCustomer(phone, customerId) {
  var requestedCustomer = customerId ? Repository.Customers.findById(String(customerId)) : null;
  // 2026-08-13: fallback findByPhone khi customerId có nhưng findById miss (row-index cache
  // stale sau create/edit, hoặc customer_id case mismatch). Trước đây return found:false ngay
  // → FE thấy detail thiếu địa chỉ/thông tin dù backend có data.
  if (customerId && !requestedCustomer && phone) {
    requestedCustomer = Repository.Customers.findByPhone(String(phone));
  }
  if (customerId && !requestedCustomer) return { found: false };
  // 2026-08-16: cross-check khi client truyền CẢ customer_id + phone. Precedence là customer_id
  // (line trên), nhưng nếu 2 giá trị không khớp → trả cờ `mismatch` để FE cảnh báo hoặc callers
  // biết đã truyền sai một trong hai. Không throw — giữ backward-compat, chỉ thêm metadata.
  var mismatchInfo = null;
  if (requestedCustomer && phone) {
    var reqPhoneNorm = String(phone).replace(/[^\d]/g, '');
    var curPhoneNorm = String(requestedCustomer.phone || '').replace(/[^\d]/g, '');
    // Bù 0 đầu 2 bên cho fair compare (đơn cũ có phone rụng 0 do format Sheet)
    if (reqPhoneNorm && reqPhoneNorm.charAt(0) !== '0') reqPhoneNorm = '0' + reqPhoneNorm;
    if (curPhoneNorm && curPhoneNorm.charAt(0) !== '0') curPhoneNorm = '0' + curPhoneNorm;
    if (reqPhoneNorm && curPhoneNorm && reqPhoneNorm !== curPhoneNorm) {
      mismatchInfo = {
        requested_phone: String(phone),
        actual_phone: String(requestedCustomer.phone || ''),
        note: 'customer_id thắng phone — trả về customer theo customer_id. Truyền chỉ 1 trong 2 để tránh nhầm.'
      };
    }
  }
  phone = requestedCustomer ? requestedCustomer.phone : phone;
  if (!phone) throw new Error('phone or customer_id is required');
  var contact = getOrdersByContact(phone);
  // Khách mới chưa từng đặt hàng không có trong lookup Orders. Khi gọi bằng customer_id,
  // vẫn phải trả hồ sơ CRM với lịch sử rỗng để deep-link/detail không phụ thuộc list API.
  if (!contact.customer_id && requestedCustomer) contact = { customer_id: requestedCustomer.customer_id, orders: [] };
  // 2026-08-13: thêm fallback cuối — khách MỚI tạo qua modal Manual Order chưa có đơn nào
  // + FE chỉ gửi phone (customer_id rỗng) → getOrdersByContact miss → trước đây return
  // found:false. Giờ lookup Customers.findByPhone để trả hồ sơ CRM với lịch sử rỗng.
  if (!contact.customer_id) {
    var byPhone = Repository.Customers.findByPhone(String(phone));
    if (byPhone) contact = { customer_id: byPhone.customer_id, orders: [] };
  }
  if (!contact.customer_id) return { found: false };

  var paidCount = 0, totalPaid = 0;
  contact.orders.forEach(function(o) {
    if (o.status === 'PAID') { paidCount++; totalPaid += Number(o.amount) || 0; }
  });

  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var profile = {
    name: '', phone: '', email: '', customer_group: 'LẺ', default_discount_percent: 0,
    address_street: '', address_ward: '', address_district: '', address_city: '',
    birthday: '', acquisition_channel: '', notes: '', loyalty_points: 0, membership_tier: ''
  };
  // Hồ sơ khách đọc qua Repository.Customers (phase-07 GĐ3.4).
  var c = requestedCustomer || Repository.Customers.findById(contact.customer_id);
  if (c) {
    profile = {
      name:                     c.name,
      phone:                    c.phone,
      email:                    c.email,
      customer_group:           c.customer_group || 'LẺ',
      default_discount_percent: c.default_discount_percent,
      address_street:           c.address_street,
      address_ward:             c.address_ward,
      address_district:         c.address_district,
      address_city:             c.address_city,
      birthday:                 c.birthday,
      acquisition_channel:      c.acquisition_channel,
      notes:                    c.notes,
      loyalty_points:           c.loyalty_points,
      membership_tier:          c.membership_tier
    };
  }

  // Tần suất mua — trung bình số ngày giữa các đơn liên tiếp. Cần ≥2 đơn có ngày tạo hợp lệ,
  // không thì không đủ dữ liệu để tính khoảng cách (null, KHÔNG suy đoán bằng 0).
  var avgDaysBetweenOrders = null;
  var orderDates = contact.orders
    .map(function(o) { return o.created_at ? new Date(o.created_at) : null; })
    .filter(function(d) { return d && !isNaN(d); })
    .sort(function(a, b) { return a - b; });
  if (orderDates.length >= 2) {
    var spanDays = (orderDates[orderDates.length - 1] - orderDates[0]) / 86400000;
    avgDaysBetweenOrders = Math.round(spanDays / (orderDates.length - 1));
  }

  var topProducts = _getTopProductsForOrders(ss, contact.orders.map(function(o) { return o.order_id; }));
  var addresses = _listCustomerShippingAddresses(ss, contact.customer_id);
  var defaultAddress = addresses.filter(function(a) { return a.is_default; })[0] || addresses[0] || null;

  var response = {
    found:                    true,
    customer_id:              contact.customer_id,
    name:                     profile.name,
    phone:                    profile.phone,
    email:                    profile.email,
    customer_group:           profile.customer_group,
    default_discount_percent: profile.default_discount_percent,
    address_street:           profile.address_street,
    address_ward:             profile.address_ward,
    address_district:         profile.address_district,
    address_city:             profile.address_city,
    birthday:                 profile.birthday,
    acquisition_channel:      profile.acquisition_channel,
    notes:                    profile.notes,
    loyalty_points:           profile.loyalty_points,
    membership_tier:          profile.membership_tier,
    addresses:                addresses,
    default_address:          defaultAddress,
    order_count:              contact.orders.length,
    paid_count:               paidCount,
    total_paid:               totalPaid,
    avg_days_between_orders:  avgDaysBetweenOrders,
    top_products:             topProducts,
    orders:                   contact.orders
  };
  if (mismatchInfo) response.mismatch = mismatchInfo;
  return response;
}

// Top 3 sản phẩm mua nhiều nhất của 1 khách — gộp OrderItems theo Handle (khoá ổn định,
// fallback ProductName/SKU cho dòng nhập tay không có Handle), cộng dồn Qty toàn bộ đơn của
// khách, không giới hạn theo khoảng thời gian (mục đích gợi ý mua lại, không phải báo cáo kỳ).
function _getTopProductsForOrders(ss, orderIds) {
  if (!orderIds.length) return [];
  var orderIdSet = {};
  orderIds.forEach(function(id) { orderIdSet[id] = true; });

  var itemsSh = ss.getSheetByName(SHEET.ORDER_ITEMS);
  if (!itemsSh || itemsSh.getLastRow() < 2) return [];
  var itemData = itemsSh.getRange(2, 1, itemsSh.getLastRow() - 1, 9).getValues(); // đủ tới I=Qty

  var totals = {};
  itemData.forEach(function(r) {
    if (!orderIdSet[String(r[1])]) return;
    var key  = String(r[4] || r[6] || r[5] || 'unknown'); // E Handle → G ProductName → F SKU
    var name = String(r[6] || key);
    var qty  = Number(r[8]) || 0;
    if (!totals[key]) totals[key] = { name: name, qty: 0 };
    totals[key].qty += qty;
  });

  return Object.keys(totals).map(function(k) { return totals[k]; })
    .sort(function(a, b) { return b.qty - a.qty; })
    .slice(0, 3);
}

// ============================================================
// LIST CUSTOMERS (admin dashboard — tab Khách hàng, danh sách đầy đủ)
// ============================================================

function listCustomers(params) {
  var limit = params && params.limit ? parseInt(params.limit, 10) : 500;
  // 2026-08-16: mặc định ẨN khách bị soft delete (Status='deleted'). Truyền include_deleted=true
  // ở params để hiện lại (dùng cho tab "Ẩn" nếu FE có; hoặc audit).
  var includeDeleted = !!(params && (params.include_deleted === true || params.include_deleted === 'true'));
  return _cachedRead('customers_' + limit + (includeDeleted ? '_all' : '_active'), function() {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  // Khách đọc qua Repository.Customers (phase-07 GĐ3.4); join stats từ Orders 1 lần bên dưới.
  var customers = Repository.Customers.findAll();
  if (!includeDeleted) {
    customers = customers.filter(function(c) { return String(c.status || 'active') !== 'deleted'; });
  }

  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var ordData  = ordersSh.getLastRow() > 1
    ? ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 18).getValues()
    : [];

  // Quét Orders MỘT LẦN, gộp sẵn thống kê theo CustomerID — tránh quét lại cả
  // sheet Orders cho từng khách hàng trong danh sách.
  var statsByCustomer = {};
  ordData.forEach(function(r) {
    var cid = String(r[1]);
    var s = statsByCustomer[cid];
    if (!s) { s = { orderCount: 0, paidCount: 0, totalPaid: 0 }; statsByCustomer[cid] = s; }
    s.orderCount++;
    if (String(r[7]) === 'PAID') { s.paidCount++; s.totalPaid += Number(r[4]) || 0; }
  });

  var results = customers.map(function(c) {
    var cid   = c.customer_id;
    var stats = statsByCustomer[cid] || { orderCount: 0, paidCount: 0, totalPaid: 0 };
    var importedOrders = Number(c.imported_order_count) || 0;
    var importedSpend = Number(c.imported_total_spend) || 0;
    return {
      customer_id:     cid,
      phone:           c.phone,
      name:            c.name,
      email:           c.email,
      first_order_at:  c.created_at,
      last_order_at:   c.last_order_at,
      status:          c.status || 'active',
      order_count:     stats.orderCount || importedOrders,
      paid_count:      stats.paidCount,
      total_paid:      stats.totalPaid || importedSpend,
      customer_group:  c.customer_group || 'LẺ',
      default_discount_percent: c.default_discount_percent
    };
  });

  // Sắp theo lần cuối đặt, MỚI NHẤT trước. Khách NHẬP TỪ FILE chưa có đơn nào → LastOrderAt trống →
  // `new Date('')` là NaN, mà so sánh NaN luôn trả false ⇒ comparator không nhất quán, thứ tự cả danh
  // sách trở nên khó lường (không crash nhưng trộn lộn). Quy về 0 và đẩy nhóm chưa-có-đơn xuống cuối.
  function _lastOrderTs(v) {
    if (!v) return 0;
    var t = (v instanceof Date) ? v.getTime() : new Date(v).getTime();
    return isNaN(t) ? 0 : t;
  }
  results.sort(function(a, b) {
    var ta = _lastOrderTs(a.last_order_at), tb = _lastOrderTs(b.last_order_at);
    if (tb !== ta) return tb - ta;
    return String(a.name || '').localeCompare(String(b.name || '')); // chưa có đơn → xếp theo tên
  });

  return { customers: results.slice(0, limit), total: results.length };
  });
}

// ============================================================
// NHẬP / XUẤT KHÁCH HÀNG (2026-07-27) — tab Khách hàng > Nhập từ Excel / Xuất CSV
//
//  Mẫu file nhập (đúng tiêu đề khách gửi):  Mã khách hàng | Tên khách hàng * | Địa chỉ - SĐT | SL đơn hàng
//  3 điểm phải xử lý, không phải map 1-1:
//   1. "Địa chỉ - SĐT" là 1 cột GỘP (mẫu chỉ có SĐT) → `_splitAddrPhone` tách SĐT ra khỏi địa chỉ.
//   2. "SL đơn hàng" là số TÍNH RA từ sheet Orders → import BỎ QUA, không bao giờ ghi (nếu ghi thì
//      con số hiển thị sẽ chỏi với số đơn thật, và không có cột nào để chứa).
//   3. "Mã khách hàng" (vd CUZN03697) là mã của hệ thống CŨ, khác CustomerID do MOPS sinh (CUSxxxxxx)
//      và khác SAPOCustomerID (id số của Sapo, dùng để khớp khi đồng bộ — nhét mã lạ vào đó là phá
//      sync). → lưu ở cột RIÊNG `ExternalCode` (cột 21, nối cuối), đồng thời dùng làm khoá dedup phụ.
//
//  Dedup khi nhập: SĐT trước (khoá tự nhiên của khách trong MOPS), rồi ExternalCode. Khớp → CẬP NHẬT
//  (chỉ điền field đang trống, không ghi đè dữ liệu đã có trừ khi cột trong file có giá trị mới); không
//  khớp → tạo mới. Không bao giờ tạo trùng SĐT.
//
  //  FirstOrderAt/LastOrderAt để TRỐNG cho khách nhập mới — họ chưa có đơn nào trong MOPS; điền nowIso()
//  sẽ làm khách nhập nhảy lên đầu danh sách (sort theo lần cuối đặt) và làm sai báo cáo khách mới.
// ============================================================
var CUSTOMER_COLS = 23; // A..W — thêm ExternalCode + số liệu lịch sử import
var CUSTOMER_COL_EXTERNAL = 21;
var CUSTOMER_COL_IMPORTED_ORDERS = 22;
var CUSTOMER_COL_IMPORTED_SPEND = 23;

// ExternalCode là cột nối cuối → sheet đang chạy chỉ có 20 cột, ghi thẳng cột 21 sẽ THROW.
// Cùng cách xử lý như _shipEnsureCols: nới cột + ghi header khi cần (idempotent).
function _custEnsureCols(sheet) {
  var max = sheet.getMaxColumns();
  if (max < CUSTOMER_COLS) sheet.insertColumnsAfter(max, CUSTOMER_COLS - max);
  var headers = { 21: 'ExternalCode', 22: 'ImportedOrderCount', 23: 'ImportedTotalSpend' };
  Object.keys(headers).forEach(function(col) {
    var cell = sheet.getRange(1, Number(col));
    if (!String(cell.getValue() || '').trim()) cell.setValue(headers[col]).setFontWeight('bold').setBackground('#3CB371').setFontColor('#ffffff');
  });
}

// Chuẩn hoá SĐT Việt Nam về dạng 0xxxxxxxxx. Trả '' nếu không giống số điện thoại.
// Xử lý luôn 2 kiểu dữ liệu bẩn thường gặp trong file Excel: +84/84 ở đầu, và SĐT bị Excel/Sheets
// ăn mất số 0 (912345678) — xem ghi chú _forcePlainText để hiểu vì sao chuyện này phổ biến.
// Đọc ô theo chỉ số an toàn: dòng cũ (sheet 20 cột) ngắn hơn CUSTOMER_COLS → r[20] là undefined.
function _custCell(r, idx) { return idx < r.length ? (r[idx] == null ? '' : r[idx]) : ''; }

// Số thứ tự kế tiếp cho CustomerID, tính MỘT LẦN cho cả lô nhập.
// KHÔNG gọi generateId() trong vòng lặp: nó đọc lại cả cột A + lấy LockService mỗi lần (N+1), và vì
// lô chỉ được append ở CUỐI nên mọi dòng sẽ nhận CÙNG một mã → trùng CustomerID.
function _custNextIdSeq(sh) {
  var lastRow = sh.getLastRow();
  var maxNum = 0;
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function(r) {
      var id = String(r[0] || '');
      if (id.indexOf('CUS') === 0) {
        var num = parseInt(id.slice(3), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
  }
  return maxNum + 1;
}

function _normPhoneVN(raw) {
  var s = String(raw == null ? '' : raw).replace(/[\s.\-()]/g, '');
  if (!s) return '';
  if (s.indexOf('+84') === 0) s = '0' + s.substring(3);
  else if (s.indexOf('84') === 0 && s.length >= 11) s = '0' + s.substring(2);
  if (!/^\d+$/.test(s)) return '';
  if (s.length === 9 && /^[35789]/.test(s)) s = '0' + s; // rụng số 0 đầu
  if (s.length < 9 || s.length > 11) return '';
  if (s.charAt(0) !== '0') return '';
  return s;
}
// Tách cột gộp "Địa chỉ - SĐT" thành { phone, address }. Lấy chuỗi số DÀI NHẤT trông giống SĐT làm
// phone, phần còn lại (bỏ dấu phân cách lơ lửng) làm địa chỉ. Chỉ có địa chỉ, hoặc chỉ có SĐT, đều OK.
function _splitAddrPhone(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return { phone: '', address: '' };
  // SĐT BẮT BUỘC mở đầu bằng 0 / 84 / +84 và phải đứng sau ký tự không phải số. Nếu cho phép bắt đầu
  // bằng số bất kỳ thì "12 Nguyễn Trãi, Q1 - 0983492001" sẽ dính số 1 của "Q1" vào SĐT → hỏng cả 2 phần.
  var pats = [
    /(?:^|[^\d])((?:\+?84|0)\d{1,4}[.\-\s]\d{3,4}[.\-\s]\d{3,4})(?!\d)/g, // 0983 492 001 · 098-349-2001
    /(?:^|[^\d])((?:\+?84|0)\d{8,10})(?!\d)/g                             // 0983492001 · 02838221234
  ];
  var best = '', bestRaw = '', m;
  for (var pi = 0; pi < pats.length; pi++) {
    pats[pi].lastIndex = 0;
    while ((m = pats[pi].exec(s)) !== null) {
      var cand = _normPhoneVN(m[1]);
      if (cand && cand.length > best.length) { best = cand; bestRaw = m[1]; }
    }
    if (best) break; // kiểu có dấu phân cách khớp rồi thì không cần thử kiểu liền mạch
  }
  var addr = s;
  if (bestRaw) addr = addr.replace(bestRaw, ' ');
  addr = addr.replace(/[\s,;|\-–]+$/g, '').replace(/^[\s,;|\-–]+/g, '').replace(/\s{2,}/g, ' ').trim();
  return { phone: best, address: addr };
}

// ── XUẤT ──────────────────────────────────────────────────────────────────────────────────────
// Trả dữ liệu ĐỦ để sửa ngoài Excel rồi nhập lại (round-trip): cột đầu đúng thứ tự mẫu nhập, các cột
// sau là dữ liệu MOPS. `SL đơn hàng` tính từ Orders (chỉ để xem — nhập lại sẽ bị bỏ qua).
function exportCustomers(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.CUSTOMERS);
  var lastRow = sh.getLastRow();
  var width = Math.min(CUSTOMER_COLS, sh.getMaxColumns());
  var data = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, width).getValues() : [];

  var ordersSh = ss.getSheetByName(SHEET.ORDERS);
  var ordData = ordersSh.getLastRow() > 1
    ? ordersSh.getRange(2, 1, ordersSh.getLastRow() - 1, 8).getValues() : [];
  var cnt = {};
  ordData.forEach(function(r) { var c = String(r[1]); cnt[c] = (cnt[c] || 0) + 1; });

  function cell(r, i) { return i < r.length ? r[i] : ''; }
  var rows = data.map(function(r) {
    var addrParts = [cell(r, 11), cell(r, 12), cell(r, 13), cell(r, 14)]
      .map(function(x) { return String(x || '').trim(); }).filter(Boolean);
    return {
      external_code:  String(cell(r, CUSTOMER_COL_EXTERNAL - 1) || ''),
      imported_order_count: Number(cell(r, CUSTOMER_COL_IMPORTED_ORDERS - 1)) || 0,
      imported_total_spend: Number(cell(r, CUSTOMER_COL_IMPORTED_SPEND - 1)) || 0,
      name:           String(cell(r, 2) || ''),
      address_phone:  (addrParts.join(', ') + (addrParts.length && cell(r, 1) ? ' - ' : '') + String(cell(r, 1) || '')).trim(),
      order_count:    cnt[String(cell(r, 0))] || 0,
      customer_id:    String(cell(r, 0) || ''),
      phone:          String(cell(r, 1) || ''),
      email:          String(cell(r, 3) || ''),
      address_street: String(cell(r, 11) || ''),
      address_ward:   String(cell(r, 12) || ''),
      address_district: String(cell(r, 13) || ''),
      address_city:   String(cell(r, 14) || ''),
      customer_group: String(cell(r, 9) || 'LẺ'),
      default_discount_percent: Number(cell(r, 10)) || 0,
      status:         String(cell(r, 6) || 'active'),
      source:         String(cell(r, 8) || ''),
      notes:          String(cell(r, 17) || ''),
      birthday:       cell(r, 15) instanceof Date ? Utilities.formatDate(cell(r, 15), 'GMT+7', 'yyyy-MM-dd') : String(cell(r, 15) || ''),
      membership_tier: String(cell(r, 19) || ''),
      loyalty_points: Number(cell(r, 18)) || 0
    };
  });
  return { customers: rows, total: rows.length };
}

// ── NHẬP ──────────────────────────────────────────────────────────────────────────────────────
// Tạo hồ sơ CRM đơn lẻ. Khác import_customers: số điện thoại trùng là lỗi, không âm thầm patch hồ
// sơ hiện có. Form tạo khách cần hành vi CRUD rõ ràng; import vẫn giữ semantics upsert theo file.
function createCustomer(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.CUSTOMERS);
  if (!sh) throw new Error('Không tìm thấy sheet Customers');
  _custEnsureCols(sh);

  var name = _sanitizeText(payload.name || '', 100);
  var phone = _normPhoneVN(payload.phone || '');
  if (!name) throw new Error('Tên khách hàng là bắt buộc');
  if (!phone) throw new Error('Số điện thoại không hợp lệ');

  // 2026-08-21 (R-CUST-DUPE-RACE) · Bọc LockService cho toàn bộ dedup-check + append.
  // Trước đây 2 request concurrent cùng SĐT có thể cùng lúc đọc phones column (chưa có ai),
  // cùng bypass dedup, cùng append → duplicate. Guard bằng ScriptLock giống generateId.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('LOCK_TIMEOUT_CREATE_CUSTOMER — hệ thống bận, thử lại');
  try {
    var lastRow = sh.getLastRow();
    if (lastRow > 1) {
      var phones = sh.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < phones.length; i++) {
        if (_normPhoneVN(phones[i][0]) === phone) {
          throw new Error('Số điện thoại đã tồn tại trong hồ sơ khách hàng');
        }
      }
    }

  var group = String(payload.customer_group || 'LẺ') === 'SỈ' ? 'SỈ' : 'LẺ';
  var discount = Number(payload.default_discount_percent) || 0;
  if (discount < 0 || discount > 100) throw new Error('Chiết khấu mặc định phải từ 0 đến 100%');
  if (group !== 'SỈ') discount = 0;

  var id = 'CUS' + String(_custNextIdSeq(sh)).padStart(6, '0');
  var row = new Array(CUSTOMER_COLS);
  for (var z = 0; z < CUSTOMER_COLS; z++) row[z] = '';
  row[0] = id;
  row[1] = phone;
  row[2] = name;
  row[3] = _sanitizeText(payload.email || '', 100);
  row[6] = 'active';
  row[8] = 'local';
  row[9] = group;
  row[10] = discount;
  row[11] = _sanitizeText(payload.address_street || payload.address || '', 200);
  row[12] = _sanitizeText(payload.address_ward || '', 100);
  row[13] = _sanitizeText(payload.address_district || '', 100);
  row[14] = _sanitizeText(payload.address_city || '', 100);
  row[17] = _sanitizeText(payload.notes || '', 500);
  var targetRow = sh.getLastRow() + 1;
  sh.getRange(targetRow, 2).setNumberFormat('@');
  sh.getRange(targetRow, 1, 1, CUSTOMER_COLS).setValues([row]);
  // Nếu nhập địa chỉ cùng lúc tạo khách, tạo ngay một địa chỉ mặc định có thể tái dùng khi tạo đơn.
  if (row[11] || row[14]) {
    // 2026-08-16: dedupe qua _upsertShippingAddress — khách vừa tạo mới nên sổ rỗng, nhưng giữ
    // wrapper để consistent với các entry point khác + đề phòng import Excel có địa chỉ trùng.
    var addressId = _upsertShippingAddress(ss, {
      customer_id: id, receiver_name: name, phone: phone, address: row[11], ward: row[12],
      district: row[13], province: row[14], is_default: true
    });
    _setCustomerDefaultShippingAddress(ss, id, addressId);
  }
  logActivity(ss, 'CUSTOMER', id, 'CUSTOMER_CREATED', String(payload._staffActor || 'staff'));
  SpreadsheetApp.flush(); // đảm bảo write hoàn tất trước khi release lock (execution kế đọc thấy row mới)
  return { customer_id: id, name: name, phone: phone };
  } finally {
    lock.releaseLock();
  }
}

// Soft delete — 2026-08-16. CHỈ set Status='deleted' trong Sheet, giữ nguyên dòng dữ liệu để:
//   (a) đơn cũ vẫn tra được `customer_id` khi list_orders join Customers
//   (b) audit trail (ai xoá lúc nào — log ActivityLogs)
//   (c) undo được: user tạo đơn với SĐT của khách deleted → upsertCustomer auto-restore
// KHÔNG xoá dòng — Sheet Customers là source of truth cho hồ sơ + finance history.
function deleteCustomer(payload) {
  var customerId = String(payload.customer_id || '').trim();
  if (!customerId) throw new Error('customer_id là bắt buộc');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.CUSTOMERS);
  if (!sh || sh.getLastRow() < 2) throw new Error('Không tìm thấy khách hàng: ' + customerId);
  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var row = -1;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === customerId) { row = i + 2; break; }
  }
  if (row === -1) throw new Error('Không tìm thấy khách hàng: ' + customerId);
  var oldStatus = String(sh.getRange(row, 7).getValue() || 'active');
  if (oldStatus === 'deleted') return { customer_id: customerId, status: 'deleted', unchanged: true };
  sh.getRange(row, 7).setValue('deleted');
  logActivity(ss, 'CUSTOMER', customerId, 'CUSTOMER_DELETED', String(payload._staffActor || 'staff'));
  return { customer_id: customerId, status: 'deleted' };
}

// Khôi phục khách bị soft delete (Status='deleted' → 'active'). Dùng cho: staff xoá nhầm, hoặc
// upsertCustomer auto-restore khi tạo đơn mới với SĐT của khách đã xoá. Public function để FE có
// thể gọi qua nút "Khôi phục" ở tab Khách hàng (include_deleted=true).
function restoreCustomer(payload) {
  var customerId = String(payload.customer_id || '').trim();
  if (!customerId) throw new Error('customer_id là bắt buộc');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.CUSTOMERS);
  if (!sh || sh.getLastRow() < 2) throw new Error('Không tìm thấy khách hàng: ' + customerId);
  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var row = -1;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === customerId) { row = i + 2; break; }
  }
  if (row === -1) throw new Error('Không tìm thấy khách hàng: ' + customerId);
  sh.getRange(row, 7).setValue('active');
  logActivity(ss, 'CUSTOMER', customerId, 'CUSTOMER_RESTORED', String(payload._staffActor || 'staff'));
  return { customer_id: customerId, status: 'active' };
}

// payload.rows: [{ external_code, name, address_phone | phone + address, email, customer_group, ... }]
// payload.dry_run = true → CHỈ đối chiếu và trả kết quả dự kiến, KHÔNG ghi gì (dùng cho bước xem trước).
// Trả per-row: { row, action: 'create'|'update'|'skip'|'error', reason, customer_id, phone, name }
// Batch: FE chia lô ≤200 dòng/lần. Đọc sheet 1 LẦN cho cả lô (không quét lại theo từng dòng), ghi
// khách mới bằng 1 lệnh setValues — cùng nguyên tắc gom I/O như đường ghi tồn kho.
// R9 (2026-08-21) · Import Excel 10k rows VERIFIED không đứt 6-min limit:
//   - FE (Assets/mops-admin-customers.js.bwt:886) tự chia BATCH=100, chạy TUẦN TỰ.
//   - Backend cap CUSTOMER_IMPORT_MAX_ROWS=200 per call → không thể quá tải.
//   - 10k rows = 100 call GAS ~vài giây/call, mỗi call độc lập với 6-min budget riêng.
//   - Upsert idempotent: batch retry an toàn (byPhone dedup index).
// Không cần continuation token server-side — client-driven chunking đã handle. Nếu 1 batch fail,
// FE chain rethrow với batch idx để user retry từ đúng chỗ.
var CUSTOMER_IMPORT_MAX_ROWS = 200;
function importCustomers(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.CUSTOMERS);
  if (!sh) throw new Error('Không tìm thấy sheet Customers');
  var rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) throw new Error('Không có dòng nào để nhập');
  if (rows.length > CUSTOMER_IMPORT_MAX_ROWS)
    throw new Error('Mỗi lần nhập tối đa ' + CUSTOMER_IMPORT_MAX_ROWS + ' dòng (đang gửi ' + rows.length + ') — chia nhỏ lô.');
  var dryRun = !!payload.dry_run;
  var actor = String(payload._staffActor || 'staff');
  function importedNumber(value) {
    if (value === undefined || value === null || value === '') return 0;
    return Math.max(0, Number(String(value).replace(/[\s,\.](?=\d{3}(?:\D|$))/g, '')) || 0);
  }

  if (!dryRun) _custEnsureCols(sh);
  var lastRow = sh.getLastRow();
  var width = Math.min(CUSTOMER_COLS, sh.getMaxColumns());
  var data = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, width).getValues() : [];

  // Index dedup: SĐT (khoá chính) + ExternalCode (khoá phụ). Dựng 1 lần cho cả lô.
  var byPhone = {}, byExt = {};
  data.forEach(function(r, i) {
    var p = _normPhoneVN(r[1]);
    if (p) byPhone[p] = i + 2;
    var ext = String(_custCell(r, CUSTOMER_COL_EXTERNAL - 1)).trim();
    if (ext) byExt[ext.toUpperCase()] = i + 2;
  });

  var results = [], toAppend = [], seenInBatch = {};
  var stat = { create: 0, update: 0, skip: 0, error: 0 };
  var idSeq = _custNextIdSeq(sh); // tính 1 lần, tăng dần trong lô

  rows.forEach(function(raw, idx) {
    var lineNo = Number(raw._line) || (idx + 1);
    function done(action, reason, extra) {
      var r = { row: lineNo, action: action, reason: reason || '' };
      if (extra) for (var k in extra) r[k] = extra[k];
      stat[action]++;
      results.push(r);
    }
    try {
      var name = _sanitizeText(raw.name || '', 100);
      // Cột gộp "Địa chỉ - SĐT": tách ra; nếu file có cột SĐT/Địa chỉ riêng thì ưu tiên cột riêng.
      var split = _splitAddrPhone(raw.address_phone || '');
      var phone = _normPhoneVN(raw.phone || split.phone);
      var street = _sanitizeText(raw.address_street || raw.address || split.address || '', 200);
      var ext = _sanitizeText(raw.external_code || '', 50);

      if (!name && !phone) { done('skip', 'dòng trống (không có tên và SĐT)'); return; }
      if (!name) { done('error', 'thiếu Tên khách hàng (bắt buộc)', { phone: phone }); return; }
      if (raw.phone && !phone) { done('error', 'SĐT "' + raw.phone + '" không hợp lệ', { name: name }); return; }

      // Trùng trong CHÍNH lô đang nhập (file có 2 dòng cùng SĐT) → chỉ lấy dòng đầu.
      var batchKey = phone || ('ext:' + ext.toUpperCase()) || ('name:' + name.toLowerCase());
      if (seenInBatch[batchKey]) { done('skip', 'trùng với dòng ' + seenInBatch[batchKey] + ' trong file', { name: name, phone: phone }); return; }
      seenInBatch[batchKey] = lineNo;

      var hitRow = (phone && byPhone[phone]) || (ext && byExt[ext.toUpperCase()]) || 0;

      if (hitRow) {
        var cur = data[hitRow - 2];
        var patch = {};
        // CHỈ điền chỗ đang trống + cập nhật tên nếu file có tên khác (tên là field khách gửi chủ ý).
        if (name && name !== String(cur[2] || '')) patch[3] = name;
        if (phone && !_normPhoneVN(cur[1])) patch[2] = phone;
        if (street && !String(cur[11] || '').trim()) patch[12] = street;
        var email = _sanitizeText(raw.email || '', 100);
        if (email && !String(cur[3] || '').trim()) patch[4] = email;
        if (ext && !String(_custCell(cur, CUSTOMER_COL_EXTERNAL - 1)).trim()) patch[CUSTOMER_COL_EXTERNAL] = ext;
        if (raw.order_count !== undefined && raw.order_count !== '' && !Number(_custCell(cur, CUSTOMER_COL_IMPORTED_ORDERS - 1))) patch[CUSTOMER_COL_IMPORTED_ORDERS] = importedNumber(raw.order_count);
        if (raw.total_spend !== undefined && raw.total_spend !== '' && !Number(_custCell(cur, CUSTOMER_COL_IMPORTED_SPEND - 1))) patch[CUSTOMER_COL_IMPORTED_SPEND] = importedNumber(raw.total_spend);
        var keys = Object.keys(patch);
        if (!keys.length) { done('skip', 'đã có, không có gì mới', { customer_id: String(cur[0]), name: name, phone: phone }); return; }
        if (!dryRun) {
          keys.forEach(function(col) {
            var c = parseInt(col, 10);
            if (c === 2) _forcePlainText(sh, hitRow, [2]); // SĐT: ép text TRƯỚC khi ghi
            sh.getRange(hitRow, c).setValue(patch[col]);
          });
        }
        done('update', 'cập nhật ' + keys.length + ' trường', { customer_id: String(cur[0]), name: name, phone: phone });
        return;
      }

      // Tạo mới. FirstOrderAt/LastOrderAt để TRỐNG (khách chưa có đơn trong MOPS).
      var newId = 'CUS' + String(idSeq++).padStart(6, '0');
      var rowArr = new Array(CUSTOMER_COLS);
      for (var z = 0; z < CUSTOMER_COLS; z++) rowArr[z] = '';
      rowArr[0]  = newId;
      rowArr[1]  = phone;
      rowArr[2]  = name;
      rowArr[3]  = _sanitizeText(raw.email || '', 100);
      rowArr[6]  = 'active';
      rowArr[8]  = 'import';
      rowArr[9]  = String(raw.customer_group || 'LẺ') === 'SỈ' ? 'SỈ' : 'LẺ';
      rowArr[10] = Number(raw.default_discount_percent) || 0;
      rowArr[11] = street;
      rowArr[12] = _sanitizeText(raw.address_ward || '', 100);
      rowArr[13] = _sanitizeText(raw.address_district || '', 100);
      rowArr[14] = _sanitizeText(raw.address_city || '', 100);
      rowArr[17] = _sanitizeText(raw.notes || '', 500);
      rowArr[CUSTOMER_COL_EXTERNAL - 1] = ext;
      rowArr[CUSTOMER_COL_IMPORTED_ORDERS - 1] = importedNumber(raw.order_count);
      rowArr[CUSTOMER_COL_IMPORTED_SPEND - 1] = importedNumber(raw.total_spend);
      if (!dryRun) toAppend.push(rowArr);
      done('create', phone ? '' : 'chưa có SĐT — sẽ không tự nhận diện lại khi khách đặt hàng',
           { customer_id: newId, name: name, phone: phone });
    } catch (e) {
      done('error', e.message);
    }
  });

  // Ghi khách mới: 1 lệnh setValues. Ép cột SĐT sang Plain text TRƯỚC khi ghi giá trị — nếu ghi trước
  // rồi mới set format thì số 0 đầu đã rụng vĩnh viễn (xem _forcePlainText).
  if (!dryRun && toAppend.length) {
    var start = sh.getLastRow() + 1;
    sh.getRange(start, 2, toAppend.length, 1).setNumberFormat('@');
    sh.getRange(start, 1, toAppend.length, CUSTOMER_COLS).setValues(toAppend);
  }
  if (!dryRun) {
    logActivity(ss, 'CUSTOMER', 'IMPORT', 'CUSTOMERS_IMPORTED', actor);
  }
  return { dry_run: dryRun, stat: stat, results: results, total: rows.length };
}

// ============================================================
// LIST TRANSACTIONS
// ============================================================

// ── Xuất đơn hàng (Export Orders) ─────────────────────────────────────────────────────────────
// Chỉ đọc, gate orders.view. Cùng bộ lọc như listTransactions (from/to/status/fulfillment_status)
// + branch_id. Trả về array of objects đủ trường cho báo cáo Excel/CSV. Không có limit (khác list
// UI 100) — nhân viên cần đầy đủ để đối soát. Join Customers (SĐT + Tên) và Branches (NameVi) bằng
// Map để tránh vòng lặp N+1: mỗi sheet đọc 1 lần, index O(1) lookup theo ID. Chỉ đọc cột cần dùng
// từ Orders (0..30, tới AE TrackingCode) — thay vì đọc cả 38 cột.
function exportOrders(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ordSh = ss.getSheetByName(SHEET.ORDERS);
  if (!ordSh || ordSh.getLastRow() < 2) return { orders: [], total: 0 };

  // Chỉ tới cột 31 (index 30 = AE TrackingCode) — không cần đọc trọn 38 cột. Math.min giữ tương thích
  // với sheet chưa mở rộng (dòng cũ chỉ có 29 cột thì phần thiếu = '' khi map).
  var width = Math.min(ordSh.getLastColumn(), 31);
  var ordData = ordSh.getRange(2, 1, ordSh.getLastRow() - 1, width).getValues();

  // Map CustomerID → {name, phone} — đọc 3 cột (A/B/C) của Customers, dựng 1 lần.
  var custSh = ss.getSheetByName(SHEET.CUSTOMERS);
  var custById = {};
  if (custSh && custSh.getLastRow() > 1) {
    custSh.getRange(2, 1, custSh.getLastRow() - 1, 3).getValues().forEach(function(r) {
      var id = String(r[0] || ''); if (!id) return;
      custById[id] = { phone: String(r[1] || ''), name: String(r[2] || '') };
    });
  }

  // Map BranchID → NameVi qua Repository (đã dùng ở mops_04 revenue_by_store).
  var branchNameById = {};
  Repository.Branches.findAll().forEach(function(b) { branchNameById[b.branch_id] = b.name_vi; });

  // Bộ lọc — nhận cả to/from là chuỗi ISO hoặc yyyy-mm-dd (JS Date parser xử lý được cả 2).
  var fromDate = params && params.from   ? new Date(params.from) : null;
  var toDate   = params && params.to     ? new Date(params.to)   : null;
  var status   = params && params.status ? String(params.status).toUpperCase() : null;
  var fulfill  = params && params.fulfillment_status ? String(params.fulfillment_status).trim() : null;
  var branchId = params && params.branch_id ? String(params.branch_id).trim() : null;

  var itemMap = {};
  var itemsSh = ss.getSheetByName(SHEET.ORDER_ITEMS);
  if (itemsSh && itemsSh.getLastRow() > 1) {
    itemsSh.getRange(2, 1, itemsSh.getLastRow() - 1, 11).getValues().forEach(function(item) {
      var itemOrderId = String(item[1] || '');
      if (!itemOrderId) return;
      var aggregate = itemMap[itemOrderId] || (itemMap[itemOrderId] = { products: [], total_quantity: 0 });
      var name = String(item[6] || '').trim();
      var quantity = Number(item[8]) || 0;
      if (name) aggregate.products.push(name + ' ×' + quantity);
      aggregate.total_quantity += quantity;
    });
  }

  var rows = [];
  ordData.forEach(function(r) {
    var created = r[10] ? new Date(r[10]) : null;
    if (fromDate && created && created < fromDate) return;
    if (toDate   && created && created > toDate)   return;
    if (status   && String(r[7]).toUpperCase() !== status) return;
    if (fulfill  && String(r[28] || '') !== fulfill) return;
    if (branchId && String(r[26] || '') !== branchId) return;

    var custId = String(r[1] || '');
    var cust   = custById[custId] || { phone: '', name: '' };
    var bId    = String(r[26] || '');
    var itemSummary = itemMap[String(r[0] || '')] || { products: [], total_quantity: 0 };
    rows.push({
      order_id:           String(r[0] || ''),
      customer_id:        custId,
      customer_name:      cust.name,
      customer_phone:     cust.phone,
      product_summary:    itemSummary.products.join(', '),
      total_quantity:     itemSummary.total_quantity,
      total_amount:       Number(r[4]) || 0,
      deposit_amount:     Number(r[5]) || 0,
      payment_status:     String(r[7] || ''),
      fulfillment_status: String(r[28] || ''),
      created_at:         created ? Utilities.formatDate(created, 'GMT+7', 'yyyy-MM-dd HH:mm:ss') : '',
      branch_id:          bId,
      branch_name:        branchNameById[bId] || String(r[15] || ''), // fallback về cột P Store cho đơn cũ chưa có BranchID
      carrier:            String(r[29] || ''),
      tracking_code:      String(r[30] || '')
    });
  });

  // Sắp theo CreatedAt giảm dần (mới nhất trước) — cùng thứ tự với danh sách UI.
  rows.sort(function(a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });

  return { orders: rows, total: rows.length };
}

function listTransactions(params) {
  // v3 (Zero-Wait 2026-08-10): chuyển từ _cachedRead → _cachedArrayRead để cache được cả response
  // lớn (100 dòng đơn có product_summary dài → dễ vượt 95KB). Bump theo _analyticsGen như cũ.
  // Envelope hiện là {transactions, total, fulfillment_counts} — _cachedArrayRead nhận vào MẢNG, nên
  // ta gói/unwrap: cache mảng transactions + fulfillment_counts + _putRowIndexes side-effect.
  var _k = 'txn_v4_' + [(params&&params.from)||'',(params&&params.to)||'',(params&&params.status)||'',(params&&params.fulfillment_status)||'',(params&&params.payment_method)||'',(params&&params.branch_id)||'',(params&&params.order_id)||'',(params&&params.limit)||'',(params&&params.offset)||''].join('|');
  return _cachedRead(_k, function() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var paySh   = ss.getSheetByName(SHEET.PAYMENTS);
  var payData = paySh.getLastRow() > 1
    ? paySh.getRange(2, 1, paySh.getLastRow() - 1, 12).getValues()
    : [];
  var paymentRowsByOrder = {};
  payData.forEach(function(p, i) {
    var paymentOrderId = String(p[1] || '');
    // getOrder() historically uses the first payment row for an order; preserve that behavior.
    if (paymentOrderId && paymentRowsByOrder[paymentOrderId] === undefined) paymentRowsByOrder[paymentOrderId] = i + 2;
  });

  // Fulfillment (phase vận chuyển 2026-07-17): board tab Đơn hàng nhóm theo FulfillmentStatus.
  // Join OrderID → FulfillmentStatus (Orders cột AC/29) + đếm TỔNG theo từng trạng thái (không giới
  // hạn bởi limit/filter — để badge board luôn đúng toàn cục).
  var ordSh = ss.getSheetByName(SHEET.ORDERS);
  var fulfillMap = {}, fulfillCounts = {}, orderMap = {}, orderRowsById = {};
  if (ordSh && ordSh.getLastRow() > 1) {
    ordSh.getRange(2, 1, ordSh.getLastRow() - 1, Math.min(ordSh.getLastColumn(), 29)).getValues().forEach(function(o, i) {
      var fs = String(o[28] || '');
      fulfillMap[String(o[0])] = fs;
      orderMap[String(o[0])] = o;
      orderRowsById[String(o[0])] = i + 2;
      if (fs) fulfillCounts[fs] = (fulfillCounts[fs] || 0) + 1;
    });
  }

  // Bảng Đơn hàng cần tên/SĐT khách, sản phẩm và số lượng. Dựng các index theo lô để tránh
  // truy vấn từng dòng đơn (N+1) khi staff mở danh sách.
  var customerById = {}, customerRowsById = {};
  var custSh = ss.getSheetByName(SHEET.CUSTOMERS);
  if (custSh && custSh.getLastRow() > 1) {
    custSh.getRange(2, 1, custSh.getLastRow() - 1, 10).getValues().forEach(function(c, i) {
      var id = String(c[0] || '');
      if (id) {
        customerById[id] = {
          phone: String(c[1] || ''),
          name:  String(c[2] || ''),
          group: String(c[9] || 'LẺ')
        };
        customerRowsById[id] = i + 2;
      }
    });
  }
  // Địa chỉ giao hàng theo đơn: join Orders.shipping_address_id (col G/index 6) → ShippingAddresses.
  // Chỉ compose 1 chuỗi ngắn cho danh sách (không kèm mã tỉnh/huyện). Detail get_order vẫn trả object
  // đầy đủ cho modal Tạo VĐ khi bấm hành động — endpoint này chỉ lo hiển thị.
  // Tối ưu 2026-08-21: đồng thời cache row-index (address_id → row_number) qua _putRowIndexes để
  // get_order sau đó hit cache thay vì TextFinder scan (`_findSheetRowExact`) — save ~100-300ms trên
  // mỗi lần mở chi tiết đơn.
  var addressById = {}, addressRowsById = {};
  var shipSh = ss.getSheetByName(SHEET.SHIPPING);
  if (shipSh && shipSh.getLastRow() > 1) {
    shipSh.getRange(2, 1, shipSh.getLastRow() - 1, 8).getValues().forEach(function(a, i) {
      var aid = String(a[0] || '');
      if (aid) {
        addressById[aid] = {
          address:  String(a[7] || ''),
          ward:     String(a[6] || ''),
          district: String(a[5] || ''),
          province: String(a[4] || '')
        };
        addressRowsById[aid] = i + 2;
      }
    });
  }

  var itemMap = {}, itemRowsByOrder = {};
  var itemsSh = ss.getSheetByName(SHEET.ORDER_ITEMS);
  if (itemsSh && itemsSh.getLastRow() > 1) {
    itemsSh.getRange(2, 1, itemsSh.getLastRow() - 1, 11).getValues().forEach(function(item, i) {
      var itemOrderId = String(item[1] || '');
      if (!itemOrderId) return;
      (itemRowsByOrder[itemOrderId] || (itemRowsByOrder[itemOrderId] = [])).push(i + 2);
      var aggregate = itemMap[itemOrderId] || (itemMap[itemOrderId] = { products: [], total_quantity: 0 });
      var name = String(item[6] || '').trim();
      var quantity = Number(item[8]) || 0;
      if (name) aggregate.products.push(name + ' ×' + quantity);
      aggregate.total_quantity += quantity;
    });
  }

  var fromDate = params && params.from   ? new Date(params.from)          : null;
  var toDate   = params && params.to     ? new Date(params.to)            : null;
  var status   = params && params.status ? String(params.status).toUpperCase() : null;
  var fulfill  = params && params.fulfillment_status ? String(params.fulfillment_status).trim() : null;
  var paymentMethod = params && params.payment_method ? String(params.payment_method).toUpperCase() : null;
  var branchId = params && params.branch_id ? String(params.branch_id).trim() : null;
  var orderId  = params && params.order_id ? String(params.order_id).trim().toUpperCase() : null;
  var limit    = params && params.limit  ? parseInt(params.limit, 10)     : 100;
  var offset   = params && params.offset ? Math.max(0, parseInt(params.offset, 10) || 0) : 0;

  // Filter rồi SORT DESC theo created_at TRƯỚC khi paginate — nếu không, page 2/3 sẽ có đơn cũ chen
  // vào page 1 tuỳ thứ tự append của Payments (không đảm bảo chronological). Cost thêm 1 sort ~O(n log n)
  // trên filtered set; đối với ~5000 đơn ≈ 5-10ms — chấp nhận được.
  var filtered = payData
    .filter(function(r) {
      if (orderId && String(r[1]).toUpperCase().indexOf(orderId) === -1) return false;
      if (status && String(r[5]) !== status) return false;
      if (paymentMethod && String(r[3] || '').toUpperCase() !== paymentMethod) return false;
      if (fulfill && (fulfillMap[String(r[1])] || '') !== fulfill) return false;
      if (branchId && String((orderMap[String(r[1])] || [])[26] || '') !== branchId) return false;
      var createdAt = r[6] ? new Date(r[6]) : null;
      if (fromDate && createdAt && createdAt < fromDate) return false;
      if (toDate   && createdAt && createdAt > toDate)   return false;
      return true;
    })
    .sort(function(a, b) { return (b[6] ? new Date(b[6]).getTime() : 0) - (a[6] ? new Date(a[6]).getTime() : 0); });

  var total = filtered.length;
  var results = filtered
    .slice(offset, offset + limit)
    .map(function(r) {
      var currentOrderId = String(r[1]);
      var order = orderMap[currentOrderId] || [];
      var customer = customerById[String(order[1] || '')] || { name: '', phone: '', group: 'LẺ' };
      var items = itemMap[currentOrderId] || { products: [], total_quantity: 0 };
      var addr = addressById[String(order[6] || '')] || null;
      var addrStr = '';
      if (addr) {
        addrStr = [addr.address, addr.ward, addr.district, addr.province]
          .filter(function(v) { return v; })
          .join(', ');
      }
      return {
        payment_id:      String(r[0]),
        order_id:        currentOrderId,
        transaction_ref: String(r[2]),
        method:          String(r[3]),
        amount:          Number(r[4]),
        status:          String(r[5]),
        created_at:      r[6],
        expires_at:      r[7],
        paid_at:         r[8],
        fulfillment_status: fulfillMap[currentOrderId] || '',
        customer_shipping_fee: Number(order[38]) || 0,
        customer_name:   customer.name,
        customer_phone:  customer.phone,
        customer_group:  customer.group,
        customer_address: addrStr,
        product_summary: items.products.join(', '),
        total_quantity:  items.total_quantity
      };
    });

  // Sort đã done trên `filtered` trước slice — không cần re-sort `results` (đã đúng chronological).
  // Bỏ dòng sort trùng (~5-10ms trên 100 items).

  // The following get_order normally follows this list request. Reuse the rows already scanned
  // here so its detail fetch can avoid rereading four complete sheets.
  _putRowIndexes({
    orders: orderRowsById,
    payments_by_order: paymentRowsByOrder,
    customers: customerRowsById,
    order_items: itemRowsByOrder,
    shipping_addresses: addressRowsById
  });

  return {
    transactions: results,
    total: total,
    offset: offset,
    page_size: limit,
    has_more: (offset + results.length) < total,
    fulfillment_counts: fulfillCounts
  };
  });
}

// ============================================================
// Zero-Wait Path — skinny DTOs (2026-08-10)
// Trả về ARRAY (không envelope) để bulk_bootstrap gộp gọn. Không tạo endpoint mới ở FE
// để tránh migration ồn ào — bulk_bootstrap là entry point chính, list_transactions cũ
// vẫn dùng khi user áp bộ lọc chi tiết.
// ============================================================
function listOrdersLite(params) {
  // listTransactions đã đủ lite (~15 field, không kèm items). Chỉ unwrap để trả mảng.
  return listTransactions(params || {}).transactions || [];
}
function listCustomersLite(params) {
  var r = listCustomers(params || {}).customers || [];
  // Bỏ default_discount_percent + email (dùng ở drawer detail, không cần trên row) để nhẹ hơn.
  return r.map(function(c) {
    return {
      customer_id: c.customer_id, phone: c.phone, name: c.name,
      last_order_at: c.last_order_at, status: c.status,
      order_count: c.order_count, paid_count: c.paid_count,
      total_paid: c.total_paid, customer_group: c.customer_group
    };
  });
}

// ============================================================
// CASH TRANSACTIONS (THU CHI) — V2.4
// Sheet: CashTransactions | TransactionID|Type|Amount|Category|Reference|Note|Account|Status|CreatedAt|CreatedBy
//
// V1 scope — KHÔNG phải sổ quỹ đa tài khoản đầy đủ (chưa có CashAccounts/số dư
// theo từng ngân hàng — xem docs/mops-erp-roadmap.md Phase 2). Sheet này chỉ
// ghi các khoản Thu/Chi THỦ CÔNG không gắn với đơn hàng (lương, thuê nhà,
// marketing, thu khác...). Doanh thu đơn hàng đã có sẵn ở sheet Payments —
// KHÔNG nhân bản sang đây (tránh 2 nguồn số liệu lệch nhau khi 1 trong 2 sheet
// bị sửa tay). getAnalytics() cộng gộp Payments (PAID) + CashTransactions
// (INCOME) để ra doanh thu/lợi nhuận đầy đủ — xem phần "Thu Chi" ở đó.
//
// Không hard-delete giao dịch tài chính — voidCashTransaction() chỉ đổi
// Status sang VOID, giữ lại để audit (giống nguyên tắc không sửa Amount đơn
// hàng đã tạo).
// ============================================================

var CASH_TX_TYPES = ['INCOME', 'EXPENSE'];

// Danh mục cố định — không lưu Settings (tránh thêm 1 chỗ cấu hình cho danh
// sách gần như không đổi). Đồng bộ tay với FINANCE_CATEGORIES trong
// mops-admin.js.bwt — sửa 1 bên phải sửa bên kia, server luôn là nguồn xác
// thực cuối (client chỉ dùng để render dropdown).
var CASH_TX_CATEGORIES = {
  INCOME:  ['Thu khác', 'Hoàn tiền từ NCC', 'Khác'],
  EXPENSE: ['Lương nhân viên', 'Thuê mặt bằng', 'Điện nước', 'Internet', 'Marketing', 'Nguyên vật liệu', 'Vận chuyển', 'Thuế', 'Hoàn tiền khách', 'Khác']
};

function listCashTransactions(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.CASH_TRANSACTIONS);
  if (!sh || sh.getLastRow() < 2) return { transactions: [], total: 0, total_income: 0, total_expense: 0 };

  var data = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();

  var type           = params && params.type     ? String(params.type).toUpperCase() : null;
  var category       = params && params.category ? String(params.category).trim()    : null;
  var fromDate       = params && params.from     ? new Date(params.from)             : null;
  var toDate         = params && params.to       ? new Date(params.to)               : null;
  var includeVoided  = params && String(params.include_voided) === '1';
  var limit          = params && params.limit    ? parseInt(params.limit, 10)        : 200;

  var results = data
    .map(function(r) {
      return {
        transaction_id: String(r[0]),
        type:           String(r[1]),
        amount:         Number(r[2]) || 0,
        category:       String(r[3] || ''),
        reference:      String(r[4] || ''),
        note:           String(r[5] || ''),
        account:        String(r[6] || ''),
        status:         String(r[7] || 'ACTIVE'),
        created_at:     r[8],
        created_by:     String(r[9] || '')
      };
    })
    .filter(function(t) {
      if (!includeVoided && t.status === 'VOID') return false;
      if (type && t.type !== type) return false;
      if (category && t.category !== category) return false;
      var createdAt = t.created_at ? new Date(t.created_at) : null;
      if (fromDate && createdAt && createdAt < fromDate) return false;
      if (toDate   && createdAt && createdAt > toDate)   return false;
      return true;
    });

  results.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

  var totalIncome = 0, totalExpense = 0;
  results.forEach(function(t) {
    if (t.type === 'INCOME')  totalIncome  += t.amount;
    if (t.type === 'EXPENSE') totalExpense += t.amount;
  });

  return {
    transactions:  results.slice(0, limit),
    total:         results.length,
    total_income:  totalIncome,
    total_expense: totalExpense
  };
}

function createCashTransaction(payload) {
  var type = String(payload.type || '').toUpperCase();
  if (CASH_TX_TYPES.indexOf(type) === -1) throw new Error('Loại giao dịch không hợp lệ (INCOME/EXPENSE)');

  var amount = Number(payload.amount);
  if (isNaN(amount) || amount <= 0) throw new Error('Số tiền không hợp lệ');

  var category = _sanitizeText(payload.category || '', 60);
  var validCategories = CASH_TX_CATEGORIES[type] || [];
  if (!category || validCategories.indexOf(category) === -1) {
    throw new Error('Danh mục không hợp lệ cho loại ' + type);
  }

  var reference = _sanitizeText(payload.reference || '', 100);
  var note      = _sanitizeText(payload.note || '', 300);
  var account   = _sanitizeText(payload.account || 'Tiền mặt', 60);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.CASH_TRANSACTIONS);
  if (!sh) throw new Error('Sheet CashTransactions không tồn tại');

  // LOCK (2026-09-05, sửa lại sau review): generateId() TỰ acquire+release LockService.getScriptLock()
  // riêng (mops_00.js) — bọc thêm 1 lock ngoài ở đây sẽ là waitLock() lồng nhau trong CÙNG 1
  // execution, đúng anti-pattern docs/mops-contract.md §13.6 cảnh báo tránh (không phải hành vi được
  // đảm bảo — "undocumented behavior"). appendRow() sau đó không phải read-modify-write nên không
  // cần khoá thêm — generateId() đã là điểm duy nhất có race (ID trùng) và đã tự an toàn.
  var txId  = generateId(sh, 'CT', 6);
  var actor = payload._callerUser || 'owner';

  sh.appendRow([txId, type, amount, category, reference, note, account, 'ACTIVE', nowIso(), actor]);
  _forceNumberFormat(sh, sh.getLastRow(), [3]); // Amount

  logActivity(ss, 'FINANCE', txId, type === 'INCOME' ? 'CASH_INCOME_CREATED' : 'CASH_EXPENSE_CREATED', actor);
  return { transaction_id: txId };
}

function voidCashTransaction(payload) {
  var txId = String(payload.transaction_id || '').trim();
  if (!txId) throw new Error('transaction_id là bắt buộc');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET.CASH_TRANSACTIONS);
  if (!sh || sh.getLastRow() < 2) throw new Error('Không tìm thấy giao dịch: ' + txId);

  // LOCK (2026-09-05, dùng _withLock có sẵn): trước đây check-rồi-setValue KHÔNG khoá — 2 request
  // huỷ cùng lúc cho cùng transaction_id đều có thể qua được check "chưa VOID" trước khi bên nào ghi
  // xong (race đã ghi nhận ở audit). Tác động tài chính bị giới hạn (trạng thái VOID idempotent)
  // nhưng vẫn có thể sinh 2 dòng ActivityLog trùng — khoá lại cho dứt điểm.
  return _withLock(function() {
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === txId) {
        if (String(data[i][7]) === 'VOID') throw new Error('Giao dịch đã được huỷ trước đó');
        sh.getRange(i + 2, 8).setValue('VOID');
        logActivity(ss, 'FINANCE', txId, 'CASH_TX_VOIDED', payload._callerUser || 'owner');
        return { transaction_id: txId, status: 'VOID' };
      }
    }
    throw new Error('Không tìm thấy giao dịch: ' + txId);
  });
}

// ============================================================
// FINANCE CORE — Phase 01 Bước 1 (docs/architecture/finance.md, docs/implementation/
// phase-01-finance-core.md). Chạy SONG SONG với CashTransactions V1 ở trên — KHÔNG
// migrate V1 trong bước này. Chỉ Receipt được wire ở Bước 1; Payment Voucher/
// Transfer/Cash Adjustment nối vào cùng Repository + Posting Engine ở Bước 2-3.
// ============================================================

// ── REPOSITORY (docs/architecture/overview.md §2.3) ──────────────────────────
// Domain/Application code (Posting Engine, createReceipt()...) CHỈ gọi qua
// Repository.*, KHÔNG gọi SpreadsheetApp trực tiếp bên ngoài object này. Nếu sau
// này đổi nền tảng lưu trữ (Postgres/Supabase), chỉ cần viết lại nội dung các
// hàm dưới đây — code gọi Repository.X.method() ở nơi khác không đổi dòng nào.
var Repository = {

  // Coupons (phase-07 GĐ3) — data access SHEET.COUPONS. Cột:
  // 0 Code|1 Enabled|2 ValueType|3 Value|4 MinOrderAmount|5 MaxUses|6 UsedCount|7 StartAt|8 ExpiresAt|9 Description|10 CreatedAt|11 CreatedBy|12 MaxDiscountAmount(chưa dùng)|13 Title|14 ScopeTypes|15 ScopeProducts
  // findAll đọc theo getLastColumn() (robust): sheet 12→16 cột đều chạy — cột thiếu đọc ra '' ([] sau parse),
  // tự mở rộng khi createCoupon append đủ 16 phần tử. r[12]=MaxDiscountAmount KHÔNG map (chưa dùng).
  // ScopeTypes/ScopeProducts (Pha B): CSV lowercase — rỗng cả hai = áp dụng toàn đơn (mã cũ).
  Coupons: {
    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        code: String(r[0]).trim().toUpperCase(),
        enabled: r[1] === true || String(r[1]).toLowerCase() === 'true',
        value_type: String(r[2] || 'percent').toLowerCase(),
        value: Number(r[3]) || 0,
        min_order_amount: Number(r[4]) || 0,
        max_uses: Number(r[5]) || 0,
        used_count: Number(r[6]) || 0,
        start_at: r[7], expires_at: r[8],
        description: String(r[9] || ''),
        created_at: r[10], created_by: String(r[11] || ''),
        title: String(r[13] || ''),
        scope_types: _parseCsvList(r[14]),
        scope_products: _parseCsvList(r[15])
      };
    },
    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.COUPONS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); });
    },
    findByCode: function(code) {
      var norm = String(code || '').trim().toUpperCase();
      if (!norm) return null;
      var all = this.findAll();
      for (var i = 0; i < all.length; i++) if (all[i].code === norm) return all[i];
      return null;
    }
  },

  // Orders (phase-07 GĐ3.5) — data access SHEET.ORDERS (40 cột tới AN). Cột dùng:
  // 0 order_id|1 customer_id|2 order_type|4 total_amount|5 deposit_amount|6 shipping_address_id|7 payment_status|
  // 8 sapo_sync_status|9 sapo_order_id|10 created_at|12 customer_note|13 appointment_date|14 appointment_time|
  // 15 store_branch|16 discount_code|17 discount_amount|23 order_discount_type|24 order_discount_value|
  // 25 order_discount_reason|28 fulfillment_status|29 carrier|30 tracking_code|31 shipping_fee|32 cod_amount|33 shipping_service_id|
  // 34 packed_at|35 package_weight|36 package_dims|37 last_tracked_at|38 customer_shipping_fee|39 customer_shipping_fee_manual
  // CHỈ dùng cho READ 1/vài đơn (getOrder/getOrdersByContact). Các scan phân tích/tài chính (listTransactions/
  // analytics/finance/_getSoldQtyByHandle) đọc SUBSET hẹp cho perf + write-locator (_findOrderRow) GIỮ explicit.
  Orders: {
    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        order_id: String(r[0] || ''),
        customer_id: String(r[1] || ''),
        order_type: String(r[2] || ''),
        total_amount: Number(r[4]) || 0,
        deposit_amount: Number(r[5]) || 0,
        shipping_address_id: String(r[6] || ''),
        payment_status: String(r[7] || ''),
        sapo_sync_status: String(r[8] || ''),
        sapo_order_id: String(r[9] || ''),
        created_at: r[10],
        created_by: String(r[11] || ''),
        customer_note: String(r[12] || ''),
        appointment_date: String(r[13] || ''),
        appointment_time: String(r[14] || ''),
        store_branch: String(r[15] || ''),
        discount_code: String(r[16] || ''),
        discount_amount: Number(r[17]) || 0,
        order_discount_type: String(r[23] || ''),
        order_discount_value: Number(r[24]) || 0,
        order_discount_reason: String(r[25] || ''),
        fulfillment_status: String(r[28] || ''),
        carrier: String(r[29] || ''),
        tracking_code: String(r[30] || ''),
        shipping_fee: Number(r[31]) || 0,
        cod_amount: Number(r[32]) || 0,
        shipping_service_id: String(r[33] || ''),
        // Khối vận đơn mở rộng (2026-07-27) — packed_at + PackageWeight/Dims + LastTrackedAt. Dòng cũ
        // thiếu cột mới → getValues trả '' , đọc ra 0/'' là đúng. Không throw khi sheet chưa nới cột.
        packed_at:        r[34] instanceof Date ? r[34].toISOString() : String(r[34] || ''),
        package_weight:   Number(r[35]) || 0,
        package_dims:     String(r[36] || ''),
        last_tracked_at:  Number(r[37]) || 0,
        customer_shipping_fee: Number(r[38]) || 0,
        customer_shipping_fee_manual: r[39] === true || String(r[39]).toLowerCase() === 'true',
        // r[40] (AO=41) = _version (OCC_COL.ORDERS trong mops_00.js) — không expose ra response;
        // getOrder tự đọc riêng qua _readVersionAt.
        // AP (col 42 = r[41]) — link tem in vận đơn Goship khổ A6 (2026-08-11)
        label_url:        String(r[41] || '')
        // AQ (col 43 = r[42]) — InternalNote (staff nội bộ, 2026-08-23). CỐ Ý KHÔNG parse vào _mapRow
        // để tránh leak ra listTransactions/analytics/getOrdersBatch — internal_note chỉ nên trả về khi
        // getOrder mở modal detail. Đọc riêng qua _internalNoteGet(sheet, row) trong mops_01.js.
      };
    },
    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.ORDERS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
       // 42 cột (tới AP) — dòng cũ thiếu cột mới thì Math.min tự cắt về getLastColumn().
       var numCols = Math.min(sh.getLastColumn(), 42);
      return sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); });
    },
    findById: function(orderId) {
      // 2026-08-10 TextFinder fast-path — thay findAll() (đọc 40 × lastRow cell, ~500-800ms) bằng
      // TextFinder + read 1 dòng (~50-80ms). RowIndex cache (_getRowIndex) đã có sẵn từ listTransactions.
      var norm = String(orderId || '').trim();
      if (!norm) return null;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.ORDERS);
      if (!sh || sh.getLastRow() < 2) return null;
      var rowIdx = _getRowIndex('orders') || {};
      var row = Number(rowIdx[norm]) || _findSheetRowExact(sh, 1, norm);
      if (row === -1 || row < 2) return null;
      // 42 cột (tới AP — LabelURL). Sheet cũ thiếu cột → Math.min tự cắt.
      var numCols = Math.min(sh.getLastColumn(), 42);
      return this._mapRow(sh.getRange(row, 1, 1, numCols).getValues()[0], row);
    },
    findByCustomer: function(customerId) {
      var norm = String(customerId || '').trim();
      if (!norm) return [];
      return this.findAll().filter(function(o) { return o.customer_id === norm; });
    }
  },

  // Customers (phase-07 GĐ3.4) — data access SHEET.CUSTOMERS. Cột:
  // 0 customer_id|1 phone|2 name|3 email|4 createdAt|5 lastOrderAt|6 status|7-8 (dự phòng)|9 group|10 defaultDiscountPercent|11 addr_street|12 ward|13 district|14 city|15 birthday|16 channel|17 notes|18 loyalty|19 tier
  // CHỈ dùng cho READ list/lookup; WRITE (upsertCustomer/updateCustomer + set địa chỉ/loyalty) GIỮ explicit.
  Customers: {
    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        customer_id: String(r[0] || ''),
        phone: String(r[1] || ''),
        name: String(r[2] || ''),
        email: String(r[3] || ''),
        created_at: r[4],
        last_order_at: r[5],
        status: String(r[6] || ''),
        customer_group: String(r[9] || 'LẺ'),
        default_discount_percent: Number(r[10]) || 0,
        address_street: String(r[11] || ''),
        address_ward: String(r[12] || ''),
        address_district: String(r[13] || ''),
        address_city: String(r[14] || ''),
        birthday: String(r[15] || ''),
        acquisition_channel: String(r[16] || ''),
        notes: String(r[17] || ''),
        loyalty_points: Number(r[18]) || 0,
        membership_tier: String(r[19] || ''),
        imported_order_count: Number(r[CUSTOMER_COL_IMPORTED_ORDERS - 1]) || 0,
        imported_total_spend: Number(r[CUSTOMER_COL_IMPORTED_SPEND - 1]) || 0
      };
    },
    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.CUSTOMERS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      // 21-23 là các cột số liệu lịch sử import, cần đọc để listCustomers() fallback
      // khi khách chưa có đơn MOPS. Không dùng getLastColumn() trực tiếp vì sheet có thể
      // còn các cột mở rộng không thuộc contract Customers.
      var numCols = Math.min(sh.getLastColumn(), CUSTOMER_COLS);
      return sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); });
    },
    findById: function(customerId) {
      // 2026-08-10 TextFinder fast-path — cùng pattern như Orders.findById.
      var norm = String(customerId || '').trim();
      if (!norm) return null;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.CUSTOMERS);
      if (!sh || sh.getLastRow() < 2) return null;
      var rowIdx = _getRowIndex('customers') || {};
      var row = Number(rowIdx[norm]) || _findSheetRowExact(sh, 1, norm);
      if (row === -1 || row < 2) return null;
      var numCols = Math.min(sh.getLastColumn(), CUSTOMER_COLS);
      return this._mapRow(sh.getRange(row, 1, 1, numCols).getValues()[0], row);
    },
    // 2026-08-21 · Normalize trước compare — trước đây exact String match nên miss khi Sheet
    // lưu SĐT rụng 0 đầu (do Google Sheets tự format khi ghi số nguyên không có prefix text).
    // Bug thực tế: FE dupe check qua get_customer(phone='0912345678') trả found:false vì Sheet
    // có '912345678' → tưởng chưa có → tạo dup. Giờ _normPhoneVN cả 2 side (bù 0 đầu 9-digit).
    findByPhone: function(phone) {
      var norm = _normPhoneVN(phone);
      if (!norm) {
        // Fallback exact match cho case caller cố tình gửi phone chưa chuẩn (edge, backward-compat).
        var raw = String(phone || '');
        if (!raw) return null;
        var allRaw = this.findAll();
        for (var j = 0; j < allRaw.length; j++) if (allRaw[j].phone === raw) return allRaw[j];
        return null;
      }
      var all = this.findAll();
      for (var i = 0; i < all.length; i++) {
        if (_normPhoneVN(all[i].phone) === norm) return all[i];
      }
      return null;
    }
  },

  // Products (phase-07 GĐ3.3) — data access SHEET.PRODUCTS. Cột:
  // 0 product_id|1 variant_id|2 handle|3 sku|4 title|5 vendor|6 product_type|7 price|8 compare_at_price|9 weight|10 requires_shipping|11 image|12 status|13 updated_at|14 source|15 inventory_qty|16 barcode|17 variant_title
  // Đa-biến-thể: nhiều dòng cùng handle (mỗi variant 1 dòng). CHỈ dùng cho READ list/lookup; WRITE
  // (syncProducts/updateProduct/_adjustInventoryQty) + order-resolution (_validateAndResolveItems, dual
  // index variant/handle, thuộc risk-tier Orders) GIỮ explicit — không route qua đây.
  Products: {
    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        product_id: String(r[0] || ''),
        variant_id: String(r[1] || ''),
        handle: String(r[2] || ''),
        sku: String(r[3] || ''),
        title: String(r[4] || ''),
        vendor: String(r[5] || ''),
        product_type: String(r[6] || ''),
        price: Number(r[7]) || 0,
        compare_at_price: Number(r[8]) || 0,
        weight: Number(r[9]) || 0,
        requires_shipping: r[10] === true || String(r[10]).toLowerCase() === 'true',
        image: String(r[11] || ''),
        status: String(r[12] || ''),
        updated_at: r[13],
        source: String(r[14] || ''),
        inventory_qty: Number(r[15]) || 0,
        barcode: String(r[16] || ''),
        variant_title: String(r[17] || '')
      };
    },
    // KHÔNG filter dòng rỗng (giữ hành vi listProducts cũ map mọi dòng; getLastRow đã bỏ trailing blank).
    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PRODUCTS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      var numCols = Math.min(sh.getLastColumn(), 18);
      return sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); });
    },
    // ưu tiên dòng active (khớp productsByHandle ở order-resolution).
    findByHandle: function(handle) {
      var norm = String(handle || '');
      if (!norm) return null;
      var all = this.findAll(), found = null;
      for (var i = 0; i < all.length; i++) {
        if (all[i].handle === norm && (!found || (found.status !== 'active' && all[i].status === 'active'))) found = all[i];
      }
      return found;
    }
  },

  // Staff (phase-07 GĐ3.2) — data access SHEET.STAFFS. Cột:
  // 0 id|1 username|2 hash|3 role|4 name|5 active|6 createdAt|7 lastLogin|8 lastIp|9 telegramId|10 avatar|11 notes|12 address|13 province|14 ward
  // Sheet KHÔNG có writeHeader tự động (thiết lập tay). findAll đọc min(getLastColumn,15) — cột thiếu
  // (M/N/O ở dòng cũ) đọc ra ''. KHÔNG map password_hash (bảo mật — staffLogin tự đọc riêng). Chỉ
  // dùng cho READ: listStaffs/_getRoutedTelegramIds/_getStaffById/analytics roleByName. WRITE giữ explicit.
  Staff: {
    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        id: String(r[0] || ''),
        username: String(r[1] || ''),
        role: String(r[3] || 'staff').toLowerCase(),
        name: String(r[4] || ''),
        active: r[5] === true || String(r[5]).toLowerCase() === 'true',
        created_at: r[6] ? String(r[6]) : '',
        last_login: r[7] ? String(r[7]) : '',
        telegram_id: String(r[9] || ''),
        avatar: String(r[10] || ''),
        notes: String(r[11] || ''),
        address: String(r[12] || ''),
        province: String(r[13] || ''),
        ward: String(r[14] || '')
      };
    },
    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.STAFFS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      var numCols = Math.min(sh.getLastColumn(), 15);
      return sh.getRange(2, 1, sh.getLastRow() - 1, numCols).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); })
        .filter(function(s) { return s.id; });
    },
    findById: function(staffId) {
      var norm = String(staffId || '').trim();
      if (!norm) return null;
      var all = this.findAll();
      for (var i = 0; i < all.length; i++) if (all[i].id === norm) return all[i];
      return null;
    }
  },

  CashAccounts: {
    _COLS: 7, // AccountID|Name|Type|Branch|OpeningBalance|Active|CreatedAt

    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.CASH_ACCOUNTS);
      if (!sh || sh.getLastRow() < 2) return [];
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues().map(function(r) {
        return {
          account_id: String(r[0]), name: String(r[1]), type: String(r[2]),
          branch: String(r[3] || ''), opening_balance: Number(r[4]) || 0,
          active: r[5] === true || String(r[5]).toLowerCase() === 'true',
          created_at: r[6]
        };
      });
    },

    findById: function(accountId) {
      // 2026-08-10 TextFinder fast-path
      var norm = String(accountId || '').trim();
      if (!norm) return null;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.CASH_ACCOUNTS);
      if (!sh || sh.getLastRow() < 2) return null;
      var row = _findSheetRowExact(sh, 1, norm);
      if (row === -1) return null;
      var r = sh.getRange(row, 1, 1, this._COLS).getValues()[0];
      return {
        account_id: String(r[0]), name: String(r[1]), type: String(r[2]),
        branch: String(r[3] || ''), opening_balance: Number(r[4]) || 0,
        active: r[5] === true || String(r[5]).toLowerCase() === 'true',
        created_at: r[6]
      };
    },

    create: function(payload) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName(SHEET.CASH_ACCOUNTS);
      var name = _sanitizeText(payload.name || '', 60);
      if (!name) throw new Error('Tên tài khoản là bắt buộc');
      var type = String(payload.type || 'CASH').toUpperCase();
      if (['CASH', 'BANK', 'EWALLET'].indexOf(type) === -1) throw new Error('Loại tài khoản không hợp lệ');
      var openingBalance = Number(payload.opening_balance) || 0;
      var branch = _sanitizeText(payload.branch || '', 100);

      var accountId = generateId(sh, 'ACC', 3);
      sh.appendRow([accountId, name, type, branch, openingBalance, true, nowIso()]);
      _forceNumberFormat(sh, sh.getLastRow(), [5]);
      return accountId;
    }
  },

  // Tài khoản ngân hàng nhận VietQR (2026-07-21). Tách riêng CashAccounts (Finance) — đây là cấu
  // hình "tài khoản nhận tiền" hiển thị QR cho khách; số TK không phải secret (in lên QR). Chi nhánh
  // trỏ tới 1 dòng ở đây qua Branches.DefaultBankAccountID; resolve theo _resolveBankAccount().
  BankAccounts: {
    _COLS: 7, // BankAccountID|BankCode|AccountNo|AccountName|IsDefault|Active|CreatedAt

    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        bank_account_id: String(r[0]), bank_code: String(r[1] || ''), account_no: String(r[2] || ''),
        account_name: String(r[3] || ''),
        is_default: r[4] === true || String(r[4]).toLowerCase() === 'true',
        active: r[5] === true || String(r[5]).toLowerCase() === 'true',
        created_at: r[6]
      };
    },

    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BANK_ACCOUNTS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); });
    },

    findById: function(id) {
      // 2026-08-10 TextFinder fast-path
      var norm = String(id || '').trim();
      if (!norm) return null;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BANK_ACCOUNTS);
      if (!sh || sh.getLastRow() < 2) return null;
      var row = _findSheetRowExact(sh, 1, norm);
      if (row === -1) return null;
      return this._mapRow(sh.getRange(row, 1, 1, this._COLS).getValues()[0], row);
    },

    findDefault: function() {
      var actives = this.findAll().filter(function(a) { return a.active; });
      return actives.filter(function(a) { return a.is_default; })[0] || null;
    },

    _clearDefaultFlag: function(sh) {
      if (sh.getLastRow() < 2) return;
      var data = sh.getRange(2, 5, sh.getLastRow() - 1, 1).getValues(); // cột E IsDefault
      for (var i = 0; i < data.length; i++) {
        if (data[i][0] === true || String(data[i][0]).toLowerCase() === 'true') {
          sh.getRange(i + 2, 5).setValue(false);
        }
      }
    },

    _validate: function(bankCode, accountNo) {
      var e1 = _validateSettingValue('BANK_CODE', bankCode); if (e1) throw new Error(e1);
      var e2 = _validateSettingValue('ACCOUNT_NO', accountNo); if (e2) throw new Error(e2);
    },

    create: function(payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BANK_ACCOUNTS);
      var bankCode  = String(payload.bank_code || '').trim().toUpperCase();
      var accountNo = String(payload.account_no || '').trim();
      var name      = _sanitizeText(payload.account_name || '', 100);
      if (!name) throw new Error('Tên chủ tài khoản là bắt buộc');
      this._validate(bankCode, accountNo);
      // TK đầu tiên luôn là default — không để 0 dòng IsDefault=true.
      var isFirst = sh.getLastRow() < 2;
      var makeDefault = !!payload.is_default || isFirst;
      if (makeDefault) this._clearDefaultFlag(sh);
      var id = generateId(sh, 'BANK', 3);
      sh.appendRow([id, bankCode, '', name, makeDefault, true, nowIso()]);
      // Số TK (cột C=3) ép Plain text TRƯỚC khi ghi — số 0 đầu không rụng (cùng gốc bệnh Phone/Suppliers).
      var newRow = sh.getLastRow();
      sh.getRange(newRow, 3).setNumberFormat('@');
      sh.getRange(newRow, 3).setValue(accountNo);
      return id;
    },

    update: function(id, payload) {
      var found = this.findById(id);
      if (!found) throw new Error('Không tìm thấy tài khoản ngân hàng: ' + id);
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BANK_ACCOUNTS);

      var active = payload.active !== undefined ? !!payload.active : found.active;
      if (!active && found.is_default) {
        throw new Error('Không thể tắt tài khoản đang là Mặc định — chọn tài khoản khác làm Mặc định trước.');
      }
      var makeDefault = found.is_default;
      if (payload.is_default === true && !found.is_default) {
        this._clearDefaultFlag(sh);
        makeDefault = true;
      }

      var bankCode  = payload.bank_code  !== undefined ? String(payload.bank_code).trim().toUpperCase() : found.bank_code;
      var accountNo = payload.account_no !== undefined ? String(payload.account_no).trim()              : found.account_no;
      var name      = payload.account_name !== undefined ? _sanitizeText(payload.account_name, 100)      : found.account_name;
      this._validate(bankCode, accountNo);

      // B (BankCode), D (AccountName), E (IsDefault), F (Active) — ghi liền B..F, riêng C (AccountNo) ép
      // plain text để giữ số 0 đầu. B=2..F=6.
      sh.getRange(found._row, 2, 1, 5).setValues([[ bankCode, found.account_no, name, makeDefault, active ]]);
      sh.getRange(found._row, 3).setNumberFormat('@');
      sh.getRange(found._row, 3).setValue(accountNo);
      return id;
    },

    setDefault: function(id) {
      var found = this.findById(id);
      if (!found) throw new Error('Không tìm thấy tài khoản ngân hàng: ' + id);
      if (!found.active) throw new Error('Không thể đặt tài khoản đã tắt làm Mặc định — bật lại trước.');
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BANK_ACCOUNTS);
      this._clearDefaultFlag(sh);
      sh.getRange(found._row, 5).setValue(true);
      return id;
    }
  },

  Receipts: {
    _COLS: 15, // ReceiptID|PartyID|AccountID|Status|PostingDate|DocumentDate|TotalAmount|Note|SourceSystem|SourceType|SourceRef|CreatedBy|CreatedAt|PostedAt|CancelledAt

    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        receipt_id: String(r[0]), party_id: String(r[1] || ''), account_id: String(r[2]),
        status: String(r[3]), posting_date: r[4] || '', document_date: r[5] || '',
        total_amount: Number(r[6]) || 0, note: String(r[7] || ''),
        source_system: String(r[8] || ''), source_type: String(r[9] || 'MANUAL'), source_ref: String(r[10] || ''),
        created_by: String(r[11] || ''), created_at: r[12],
        posted_at: r[13] || '', cancelled_at: r[14] || ''
      };
    },

    // phase-07 Lớp 3-Finance: findAll() = getRange(_COLS)+map(_mapRow) — byte-identical với read inline
    // cũ trong listReceipts/getReceiptReconciliationReport (2 hàm đó nay route qua đây).
    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECEIPTS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); });
    },

    findById: function(receiptId) {
      // 2026-08-10 TextFinder fast-path
      var norm = String(receiptId || '').trim();
      if (!norm) return null;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECEIPTS);
      if (!sh || sh.getLastRow() < 2) return null;
      var row = _findSheetRowExact(sh, 1, norm);
      if (row === -1) return null;
      return this._mapRow(sh.getRange(row, 1, 1, this._COLS).getValues()[0], row);
    },

    // "1 Business Event chỉ sinh 1 Financial Document" (docs/architecture/finance.md
    // §7.5) — khoá duy nhất là bộ 3 (SourceSystem, SourceType, SourceRef), KHÔNG
    // phải chỉ SourceRef. Cần thiết từ khi có >1 nguồn có thể gọi tạo Receipt (vd
    // sau này SAPO tự đẩy đơn về song song với MOPS tự tạo — cùng SourceRef nhưng
    // khác SourceSystem thì KHÔNG được coi là trùng, ngược lại cùng cả 3 mới chặn).
    findBySource: function(sourceSystem, sourceType, sourceRef) {
      if (!sourceSystem || !sourceType || !sourceRef) return null; // rỗng = không dedup (chứng từ thủ công)
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECEIPTS);
      if (!sh || sh.getLastRow() < 2) return null;
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][8]) === sourceSystem && String(data[i][9]) === sourceType && String(data[i][10]) === sourceRef) {
          return this._mapRow(data[i], i + 2);
        }
      }
      return null;
    },

    create: function(payload) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName(SHEET.RECEIPTS);
      var receiptId = generateId(sh, 'PT', 6);
      sh.appendRow([
        receiptId, payload.party_id || '', payload.account_id, 'Draft',
        '', payload.document_date || nowIso(), payload.total_amount,
        payload.note || '', payload.source_system || '', payload.source_type || 'MANUAL', payload.source_ref || '',
        payload.created_by || 'system', nowIso(), '', ''
      ]);
      _forceNumberFormat(sh, sh.getLastRow(), [7]);
      return receiptId;
    },

    updateStatus: function(receiptId, newStatus, extra) {
      var found = this.findById(receiptId);
      if (!found) throw new Error('Không tìm thấy Receipt: ' + receiptId);
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECEIPTS);
      sh.getRange(found._row, 4).setValue(newStatus); // Status
      if (extra && extra.posting_date) sh.getRange(found._row, 5).setValue(extra.posting_date);
      if (extra && extra.posted_at)    sh.getRange(found._row, 14).setValue(extra.posted_at);
      if (extra && extra.cancelled_at) sh.getRange(found._row, 15).setValue(extra.cancelled_at);
      return found;
    }
  },

  ReceiptLines: {
    _COLS: 5, // LineID|ReceiptID|CategoryID|Amount|Note

    findByReceiptId: function(receiptId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECEIPT_LINES);
      if (!sh || sh.getLastRow() < 2) return [];
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .filter(function(r) { return String(r[1]) === receiptId; })
        .map(function(r) {
          return { line_id: String(r[0]), receipt_id: String(r[1]), category_id: String(r[2] || ''), amount: Number(r[3]) || 0, note: String(r[4] || '') };
        });
    },

    appendLines: function(receiptId, lines) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECEIPT_LINES);
      lines.forEach(function(line) {
        var lineId = generateId(sh, 'RL', 6);
        sh.appendRow([lineId, receiptId, line.category_id || '', line.amount, line.note || '']);
        _forceNumberFormat(sh, sh.getLastRow(), [4]);
      });
    }
  },

  LedgerEntries: {
    _COLS: 12, // LedgerID|DocumentType|DocumentID|PostingDate|AccountID|Type|Amount|CategoryID|PartyID|ReversalOf|Note|CreatedAt

    _mapRow: function(r) {
      return {
        ledger_id: String(r[0]), document_type: String(r[1]), document_id: String(r[2]),
        posting_date: r[3], account_id: String(r[4]), type: String(r[5]),
        amount: Number(r[6]) || 0, category_id: String(r[7] || ''), party_id: String(r[8] || ''),
        reversal_of: String(r[9] || ''), note: String(r[10] || ''), created_at: r[11]
      };
    },

    findByAccount: function(accountId, fromDate, toDate) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.LEDGER_ENTRIES);
      if (!sh || sh.getLastRow() < 2) return [];
      var mapRow = this._mapRow;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .filter(function(r) {
          if (String(r[4]) !== accountId) return false;
          var d = r[3] ? new Date(r[3]) : null;
          if (fromDate && d && d < fromDate) return false;
          if (toDate   && d && d > toDate)   return false;
          return true;
        })
        .map(mapRow);
    },

    findByDocument: function(documentType, documentId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.LEDGER_ENTRIES);
      if (!sh || sh.getLastRow() < 2) return [];
      var mapRow = this._mapRow;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .filter(function(r) { return String(r[1]) === documentType && String(r[2]) === documentId; })
        .map(mapRow);
    },

    append: function(entry) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.LEDGER_ENTRIES);
      var ledgerId = generateId(sh, 'LG', 8);
      sh.appendRow([
        ledgerId, entry.document_type, entry.document_id, entry.posting_date,
        entry.account_id, entry.type, entry.amount, entry.category_id || '',
        entry.party_id || '', entry.reversal_of || '', entry.note || '', nowIso()
      ]);
      _forceNumberFormat(sh, sh.getLastRow(), [7]);
      return ledgerId;
    },

    // Số dư = OpeningBalance + tất cả IN − tất cả OUT đến ngày X (mặc định: không
    // giới hạn, tức "hiện tại"). KHÔNG lưu số dư ở đâu — luôn tính lại khi cần
    // (docs/architecture/finance.md §9.2).
    balanceForAccount: function(accountId, asOfDate) {
      var account = Repository.CashAccounts.findById(accountId);
      if (!account) throw new Error('Không tìm thấy tài khoản: ' + accountId);
      var entries = this.findByAccount(accountId, null, asOfDate || null);
      var balance = account.opening_balance;
      entries.forEach(function(e) { balance += (e.type === 'IN' ? e.amount : -e.amount); });
      return balance;
    },

    // Đọc LedgerEntries đúng 1 LẦN cho TẤT CẢ tài khoản — dùng cho listCashAccounts()
    // (UI Cash Accounts panel) thay vì gọi balanceForAccount() N lần (N lần đọc lại
    // toàn bộ sheet). Trả về { accountId: balance, ... }.
    balanceForAllAccounts: function() {
      var accounts = Repository.CashAccounts.findAll();
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.LEDGER_ENTRIES);
      var deltaByAccount = {};
      if (sh && sh.getLastRow() > 1) {
        sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues().forEach(function(r) {
          var accountId = String(r[4]);
          var amount = Number(r[6]) || 0;
          var delta = String(r[5]) === 'IN' ? amount : -amount;
          deltaByAccount[accountId] = (deltaByAccount[accountId] || 0) + delta;
        });
      }
      var result = {};
      accounts.forEach(function(a) {
        result[a.account_id] = a.opening_balance + (deltaByAccount[a.account_id] || 0);
      });
      return result;
    }
  },

  Categories: {
    _COLS: 4, // CategoryID|Group|Name|Active

    findAll: function(kind) { // kind: 'INCOME' | 'EXPENSE'
      var sheetName = kind === 'INCOME' ? SHEET.INCOME_CATEGORIES : SHEET.EXPENSE_CATEGORIES;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (!sh || sh.getLastRow() < 2) return [];
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .filter(function(r) { return r[3] === true || String(r[3]).toLowerCase() === 'true'; })
        .map(function(r) {
          return { category_id: String(r[0]), group: String(r[1]), name: String(r[2]), kind: kind };
        });
    },

    create: function(kind, group, name) {
      var sheetName = kind === 'INCOME' ? SHEET.INCOME_CATEGORIES : SHEET.EXPENSE_CATEGORIES;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      var prefix = kind === 'INCOME' ? 'INC' : 'EXP';
      var categoryId = generateId(sh, prefix, 3);
      sh.appendRow([categoryId, group, name, true]);
      return categoryId;
    }
  },

  PaymentVouchers: {
    // Bump 16→18 (2026-07-11, review 20) — thêm ReturnID (§13, chưa có code tạo, cột dự phòng)
    // và PurchaseOrderID (§6 — cọc trả NCC TRƯỚC khi PO Posted/chưa có Bill).
    _COLS: 18, // VoucherID|PartyID|AccountID|Status|PostingDate|DocumentDate|TotalAmount|Note|AttachmentURL|CreatedBy|ApprovedBy|CreatedAt|ApprovedAt|PostedAt|CancelledAt|BillID|ReturnID|PurchaseOrderID

    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        voucher_id: String(r[0]), party_id: String(r[1] || ''), account_id: String(r[2]),
        status: String(r[3]), posting_date: r[4] || '', document_date: r[5] || '',
        total_amount: Number(r[6]) || 0, note: String(r[7] || ''), attachment_url: String(r[8] || ''),
        created_by: String(r[9] || ''), approved_by: String(r[10] || ''),
        created_at: r[11], approved_at: r[12] || '', posted_at: r[13] || '', cancelled_at: r[14] || '',
        bill_id: String(r[15] || ''), // rỗng nếu phiếu chi không liên quan trả nợ NCC (Phase 04 Bước 3)
        return_id: String(r[16] || ''), // rỗng — OrderReturns (§13) chưa có code tạo, cột dự phòng
        purchase_order_id: String(r[17] || '') // cọc trả NCC trước khi PO Posted (§6) — rỗng nếu không phải phiếu cọc
      };
    },

    findById: function(voucherId) {
      // 2026-08-10 TextFinder fast-path
      var norm = String(voucherId || '').trim();
      if (!norm) return null;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PAYMENT_VOUCHERS);
      if (!sh || sh.getLastRow() < 2) return null;
      var row = _findSheetRowExact(sh, 1, norm);
      if (row === -1) return null;
      return this._mapRow(sh.getRange(row, 1, 1, this._COLS).getValues()[0], row);
    },

    findByBillId: function(billId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PAYMENT_VOUCHERS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); })
        .filter(function(v) { return v.bill_id === billId; });
    },

    // Cọc trả NCC trước khi PO Posted — dùng ở postPurchaseOrder() để retroactive-link BillID
    // (docs/mops.md §6, bước 3) khi hàng về và Bill vừa được tạo.
    findByPurchaseOrderId: function(purchaseOrderId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PAYMENT_VOUCHERS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); })
        .filter(function(v) { return v.purchase_order_id === purchaseOrderId; });
    },

    create: function(payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PAYMENT_VOUCHERS);
      var voucherId = generateId(sh, 'PC', 6);
      sh.appendRow([
        voucherId, payload.party_id || '', payload.account_id, 'Draft',
        '', payload.document_date || nowIso(), payload.total_amount,
        payload.note || '', payload.attachment_url || '',
        payload.created_by || 'system', '', nowIso(), '', '', '',
        payload.bill_id || '', payload.return_id || '', payload.purchase_order_id || ''
      ]);
      _forceNumberFormat(sh, sh.getLastRow(), [7]);
      return voucherId;
    },

    // Retroactive-link BillID cho phiếu cọc NCC (§6 bước 3) — CHỈ đổi khoá liên kết, KHÔNG ghi lại
    // LedgerEntries (bút toán gốc đã đúng từ lúc Post cọc, không đảo/ghi lại — mops.md §6).
    setBillId: function(voucherId, billId) {
      var found = this.findById(voucherId);
      if (!found) return;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PAYMENT_VOUCHERS);
      sh.getRange(found._row, 16).setValue(billId); // col 16 = BillID
    },

    updateStatus: function(voucherId, newStatus, extra) {
      var found = this.findById(voucherId);
      if (!found) throw new Error('Không tìm thấy Phiếu chi: ' + voucherId);
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PAYMENT_VOUCHERS);
      sh.getRange(found._row, 4).setValue(newStatus); // Status
      if (extra && extra.approved_by)  sh.getRange(found._row, 11).setValue(extra.approved_by);
      if (extra && extra.posting_date) sh.getRange(found._row, 5).setValue(extra.posting_date);
      if (extra && extra.approved_at)  sh.getRange(found._row, 13).setValue(extra.approved_at);
      if (extra && extra.posted_at)    sh.getRange(found._row, 14).setValue(extra.posted_at);
      if (extra && extra.cancelled_at) sh.getRange(found._row, 15).setValue(extra.cancelled_at);
      return found;
    }
  },

  PaymentVoucherLines: {
    _COLS: 5, // LineID|VoucherID|CategoryID|Amount|Note

    findByVoucherId: function(voucherId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PAYMENT_VOUCHER_LINES);
      if (!sh || sh.getLastRow() < 2) return [];
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .filter(function(r) { return String(r[1]) === voucherId; })
        .map(function(r) {
          return { line_id: String(r[0]), voucher_id: String(r[1]), category_id: String(r[2] || ''), amount: Number(r[3]) || 0, note: String(r[4] || '') };
        });
    },

    appendLines: function(voucherId, lines) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PAYMENT_VOUCHER_LINES);
      lines.forEach(function(line) {
        var lineId = generateId(sh, 'PVL', 6);
        sh.appendRow([lineId, voucherId, line.category_id || '', line.amount, line.note || '']);
        _forceNumberFormat(sh, sh.getLastRow(), [4]);
      });
    }
  },

  Transfers: {
    _COLS: 11, // TransferID|FromAccountID|ToAccountID|Amount|Status|PostingDate|Note|CreatedBy|CreatedAt|PostedAt|CancelledAt

    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        transfer_id: String(r[0]), from_account_id: String(r[1]), to_account_id: String(r[2]),
        amount: Number(r[3]) || 0, status: String(r[4]), posting_date: r[5] || '',
        note: String(r[6] || ''), created_by: String(r[7] || ''), created_at: r[8],
        posted_at: r[9] || '', cancelled_at: r[10] || ''
      };
    },

    findById: function(transferId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.TRANSFERS);
      if (!sh || sh.getLastRow() < 2) return null;
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) === transferId) return this._mapRow(data[i], i + 2);
      }
      return null;
    },

    create: function(payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.TRANSFERS);
      var transferId = generateId(sh, 'TR', 6);
      sh.appendRow([
        transferId, payload.from_account_id, payload.to_account_id, payload.amount,
        'Draft', '', payload.note || '', payload.created_by || 'system', nowIso(), '', ''
      ]);
      _forceNumberFormat(sh, sh.getLastRow(), [4]);
      return transferId;
    },

    updateStatus: function(transferId, newStatus, extra) {
      var found = this.findById(transferId);
      if (!found) throw new Error('Không tìm thấy Chuyển quỹ: ' + transferId);
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.TRANSFERS);
      sh.getRange(found._row, 5).setValue(newStatus); // Status
      if (extra && extra.posting_date) sh.getRange(found._row, 6).setValue(extra.posting_date);
      if (extra && extra.posted_at)    sh.getRange(found._row, 10).setValue(extra.posted_at);
      if (extra && extra.cancelled_at) sh.getRange(found._row, 11).setValue(extra.cancelled_at);
      return found;
    }
  },

  CashAdjustments: {
    _COLS: 12, // AdjustmentID|AccountID|Direction|Amount|Reason|Status|ApprovedBy|CreatedBy|CreatedAt|ApprovedAt|PostedAt|CancelledAt

    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        adjustment_id: String(r[0]), account_id: String(r[1]), direction: String(r[2]),
        amount: Number(r[3]) || 0, reason: String(r[4] || ''), status: String(r[5]),
        approved_by: String(r[6] || ''), created_by: String(r[7] || ''), created_at: r[8],
        approved_at: r[9] || '', posted_at: r[10] || '', cancelled_at: r[11] || ''
      };
    },

    findById: function(adjustmentId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.CASH_ADJUSTMENTS);
      if (!sh || sh.getLastRow() < 2) return null;
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) === adjustmentId) return this._mapRow(data[i], i + 2);
      }
      return null;
    },

    create: function(payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.CASH_ADJUSTMENTS);
      var adjustmentId = generateId(sh, 'ADJ', 6);
      sh.appendRow([
        adjustmentId, payload.account_id, payload.direction, payload.amount, payload.reason,
        'Draft', '', payload.created_by || 'system', nowIso(), '', '', ''
      ]);
      _forceNumberFormat(sh, sh.getLastRow(), [4]);
      return adjustmentId;
    },

    updateStatus: function(adjustmentId, newStatus, extra) {
      var found = this.findById(adjustmentId);
      if (!found) throw new Error('Không tìm thấy Điều chỉnh quỹ: ' + adjustmentId);
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.CASH_ADJUSTMENTS);
      sh.getRange(found._row, 6).setValue(newStatus); // Status
      if (extra && extra.approved_by)  sh.getRange(found._row, 7).setValue(extra.approved_by);
      if (extra && extra.approved_at)  sh.getRange(found._row, 10).setValue(extra.approved_at);
      if (extra && extra.posted_at)    sh.getRange(found._row, 11).setValue(extra.posted_at);
      if (extra && extra.cancelled_at) sh.getRange(found._row, 12).setValue(extra.cancelled_at);
      return found;
    }
  },

  // ── Inventory (Phase 02 Bước 1) — Master Data, xem docs/architecture/inventory.md ──
  // +ContactPerson/Email/TaxCode (cột H-J 🆕, review Suppliers 2026-07-16) — nối CUỐI đúng nguyên
  // tắc append-only. KHÔNG thêm cột "Status" riêng — Active (cột F) đã đúng là khái niệm "Đang
  // hợp tác"/"Ngừng hợp tác", thêm field thứ 2 cho cùng 1 ý nghĩa sẽ tạo 2 nguồn có thể lệch nhau.
  Suppliers: {
    // Province|Ward nối thêm cuối (12) — review 2026-07-16, 2 cấp (bỏ Huyện, cấu trúc hành chính
    // từ 01/07/2025).
    _COLS: 12, // SupplierID|Name|Phone|Address|Note|Active|CreatedAt|ContactPerson|Email|TaxCode|Province|Ward

    _mapRow: function(r) {
      return {
        supplier_id: String(r[0]), name: String(r[1]), phone: String(r[2] || ''),
        address: String(r[3] || ''), note: String(r[4] || ''),
        active: r[5] === true || String(r[5]).toLowerCase() === 'true', created_at: r[6],
        contact_person: String(r[7] || ''), email: String(r[8] || ''), tax_code: String(r[9] || ''),
        province: String(r[10] || ''), ward: String(r[11] || '')
      };
    },

    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.SUPPLIERS);
      if (!sh || sh.getLastRow() < 2) return [];
      var mapRow = this._mapRow;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues().map(mapRow);
    },

    findById: function(supplierId) {
      // 2026-08-10 TextFinder fast-path
      var norm = String(supplierId || '').trim();
      if (!norm) return null;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.SUPPLIERS);
      if (!sh || sh.getLastRow() < 2) return null;
      var row = _findSheetRowExact(sh, 1, norm);
      if (row === -1) return null;
      return this._mapRow(sh.getRange(row, 1, 1, this._COLS).getValues()[0]);
    },

    // Phone ghi rỗng trước, ép Text (setNumberFormat('@')), rồi mới ghi số thật — appendRow() với
    // số thật ngay sẽ bị Sheets tự nuốt số 0 đầu NGAY LÚC GHI (không phải lỗi hiển thị đọc lại),
    // cùng bug/fix đã áp dụng cho Customers.Phone (upsertCustomer()) — sửa theo đúng bug report
    // Suppliers.Phone mất số 0 đầu (review 2026-07-16).
    create: function(payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.SUPPLIERS);
      var name = _sanitizeText(payload.name || '', 100);
      if (!name) throw new Error('Tên nhà cung cấp là bắt buộc');
      var supplierId = generateId(sh, 'SUP', 4);
      var phone = _sanitizeText(payload.phone || '', 20);
      sh.appendRow([
        supplierId, name, '', _sanitizeText(payload.address || '', 200), _sanitizeText(payload.note || '', 200),
        true, nowIso(), _sanitizeText(payload.contact_person || '', 100),
        _sanitizeText(payload.email || '', 100), _sanitizeText(payload.tax_code || '', 30),
        _sanitizeText(payload.province || '', 100), _sanitizeText(payload.ward || '', 100)
      ]);
      var newRow = sh.getLastRow();
      _forcePlainText(sh, newRow, [3]);
      sh.getRange(newRow, 3).setValue(phone);
      return supplierId;
    },

    // Partial update — chỉ ghi field có mặt trong payload, cùng mẫu updateCustomer()/Branches.update().
    update: function(supplierId, payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.SUPPLIERS);
      var found = this.findById(supplierId);
      if (!found) throw new Error('Không tìm thấy nhà cung cấp: ' + supplierId);
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
      var row = -1;
      for (var i = 0; i < data.length; i++) if (String(data[i][0]) === supplierId) { row = i + 2; break; }

      if (payload.name !== undefined) {
        var name = _sanitizeText(payload.name, 100);
        if (!name) throw new Error('Tên nhà cung cấp không được để trống');
        sh.getRange(row, 2).setValue(name);
      }
      if (payload.phone !== undefined) {
        // Ép lại Text mỗi lần sửa — phòng trường hợp cột từng bị đổi định dạng lại "Automatic".
        sh.getRange(row, 3).setNumberFormat('@').setValue(_sanitizeText(payload.phone, 20));
      }
      if (payload.address !== undefined)        sh.getRange(row, 4).setValue(_sanitizeText(payload.address, 200));
      if (payload.note !== undefined)           sh.getRange(row, 5).setValue(_sanitizeText(payload.note, 200));
      if (payload.active !== undefined)         sh.getRange(row, 6).setValue(!!payload.active);
      if (payload.contact_person !== undefined) sh.getRange(row, 8).setValue(_sanitizeText(payload.contact_person, 100));
      if (payload.email !== undefined)          sh.getRange(row, 9).setValue(_sanitizeText(payload.email, 100));
      if (payload.tax_code !== undefined)       sh.getRange(row, 10).setValue(_sanitizeText(payload.tax_code, 30));
      if (payload.province !== undefined)       sh.getRange(row, 11).setValue(_sanitizeText(payload.province, 100));
      if (payload.ward !== undefined)           sh.getRange(row, 12).setValue(_sanitizeText(payload.ward, 100));
    },

    // Xoá thật (deleteRow) — CHỈ an toàn vì deleteSupplier() (application layer) đã chặn xoá khi
    // còn PurchaseOrders tham chiếu, nên không thể phát sinh FK mồ côi. Không tự gọi hàm này trực
    // tiếp từ ngoài Repository mà bỏ qua check đó.
    remove: function(supplierId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.SUPPLIERS);
      if (!sh || sh.getLastRow() < 2) throw new Error('Không tìm thấy nhà cung cấp: ' + supplierId);
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) === supplierId) { sh.deleteRow(i + 2); return; }
      }
      throw new Error('Không tìm thấy nhà cung cấp: ' + supplierId);
    }
  },

  // Branches (đóng gap §19/§20 mops.md, review 31) — reference table tạo tay, ít dòng, giống
  // Suppliers/CashAccounts. Bất biến bắt buộc: LUÔN có đúng 1 dòng Active có IsDefault=true (dùng
  // làm fallback cho createOrder() khi staff/khách không chọn chi nhánh) — update() cố tình KHÔNG
  // cho phép trực tiếp tắt IsDefault của chi nhánh đang mặc định (chỉ cho "thêm default mới", tự
  // động un-default chi nhánh cũ) để không bao giờ rơi vào trạng thái 0 dòng true, tránh phải viết
  // thêm validate riêng (architecture-priority.md — ít logic hơn thắng).
  Branches: {
    // Province|Ward nối thêm cuối (14) — review 2026-07-16, KHÔNG chèn giữa để không lệch index
    // các cột cũ. 2 cấp (bỏ Huyện — cấu trúc hành chính từ 01/07/2025).
    // DefaultBankAccountID (15) nối cuối 2026-07-21 — TK ngân hàng nhận VietQR mặc định của chi nhánh
    // (FK → BankAccounts.BankAccountID); rỗng = dùng TK mặc định của chi nhánh chính rồi TK default toàn cục.
    // Multi-warehouse (V6.2 2026-08-05): 15 field pick_* + adapter IDs nối cột 16-30. Docs schema:
    // docs/backend-multiwarehouse-stub.md §1. Cột adapter (ghn_shop_id..viettelpost_source_id) trống
    // = hãng đó chưa hỗ trợ lấy tại kho này; adapter phase B validate và throw trước khi gọi API.
    // V6.5 2026-08-05: thêm 3 cột Goship city/district/ward code (AE/AF/AG = 31/32/33) — Goship
    // dynamic origin cần code Goship riêng (100000/100900/…), khác GSO. Adapter goshipRates/
    // goshipCreateShipment nhúng address_from raw per-request (không dùng shop_id — Goship không
    // yêu cầu register kho, chỉ cần code địa chỉ).
    _COLS: 33, // ... cột 30 PickNotes | 31 GoshipFromCity | 32 GoshipFromDistrict | 33 GoshipFromWard

    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        branch_id: String(r[0]), name_vi: String(r[1]), name_en: String(r[2] || ''),
        phone: String(r[3] || ''), email: String(r[4] || ''), address: String(r[5] || ''),
        tax_code: String(r[6] || ''),
        active: r[7] === true || String(r[7]).toLowerCase() === 'true',
        sort_order: Number(r[8]) || 0,
        is_default: r[9] === true || String(r[9]).toLowerCase() === 'true',
        created_at: r[10], created_by: String(r[11] || ''),
        province: String(r[12] || ''), ward: String(r[13] || ''),
        default_bank_account_id: String(r[14] || ''),
        // V6.2 multi-warehouse pick address + adapter IDs (cột 16-30, index 15-29)
        pick_receiver_name: String(r[15] || ''),
        pick_phone: String(r[16] || ''),
        pick_address: String(r[17] || ''),
        pick_ward: String(r[18] || ''),
        pick_district: String(r[19] || ''),
        pick_province: String(r[20] || ''),
        pick_province_code: String(r[21] || ''),
        pick_district_code: String(r[22] || ''),
        pick_ward_code: String(r[23] || ''),
        ghn_shop_id: Number(r[24]) || 0,
        ghtk_pick_address_id: String(r[25] || ''),
        goship_shop_id: String(r[26] || ''),
        vnpost_customer_code: String(r[27] || ''),
        viettelpost_source_id: String(r[28] || ''),
        pick_notes: String(r[29] || ''),
        // V6.5 Goship dynamic origin — code Goship riêng (không phải GSO)
        goship_from_city: String(r[30] || ''),
        goship_from_district: String(r[31] || ''),
        goship_from_ward: String(r[32] || '')
      };
    },

    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BRANCHES);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); })
        .sort(function(a, b) { return a.sort_order - b.sort_order; });
    },

    findById: function(branchId) {
      var all = this.findAll();
      for (var i = 0; i < all.length; i++) if (all[i].branch_id === branchId) return all[i];
      return null;
    },

    findDefault: function() {
      var actives = this.findAll().filter(function(b) { return b.active; });
      return actives.filter(function(b) { return b.is_default; })[0] || null;
    },

    _clearDefaultFlag: function(sh) {
      if (sh.getLastRow() < 2) return;
      var data = sh.getRange(2, 10, sh.getLastRow() - 1, 1).getValues(); // cột J IsDefault
      for (var i = 0; i < data.length; i++) {
        if (data[i][0] === true || String(data[i][0]).toLowerCase() === 'true') {
          sh.getRange(i + 2, 10).setValue(false);
        }
      }
    },

    create: function(payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BRANCHES);
      var nameVi = _sanitizeText(payload.name_vi || '', 100);
      if (!nameVi) throw new Error('Tên chi nhánh (Tiếng Việt) là bắt buộc');
      // Chi nhánh đầu tiên luôn phải là default — không cho phép 0 dòng IsDefault=true ngay từ đầu.
      var isFirst = sh.getLastRow() < 2;
      var makeDefault = !!payload.is_default || isFirst;
      if (makeDefault) this._clearDefaultFlag(sh);
      var branchId = generateId(sh, 'BR', 3);
      var phone = _sanitizeText(payload.phone || '', 20);
      // V6.2 multi-warehouse: '' cho pick_phone (cột Q=17) tại appendRow, ghi số thật sau _forcePlainText.
      var pickPhone = _sanitizeText(payload.pick_phone || '', 20);
      sh.appendRow([
        branchId, nameVi, _sanitizeText(payload.name_en || '', 100),
        '', _sanitizeText(payload.email || '', 100),
        _sanitizeText(payload.address || '', 200), _sanitizeText(payload.tax_code || '', 30),
        true, Number(payload.sort_order) || 0, makeDefault, nowIso(), payload.created_by || 'system',
        _sanitizeText(payload.province || '', 100), _sanitizeText(payload.ward || '', 100),
        String(payload.default_bank_account_id || ''),
        // V6.2 pick address + adapter IDs (cột 16-30)
        _sanitizeText(payload.pick_receiver_name || '', 100),
        '',   // pick_phone — ghi lại sau _forcePlainText (cột 17=Q)
        _sanitizeText(payload.pick_address || '', 200),
        _sanitizeText(payload.pick_ward || '', 100),
        _sanitizeText(payload.pick_district || '', 100),
        _sanitizeText(payload.pick_province || '', 100),
        _sanitizeText(payload.pick_province_code || '', 10),
        _sanitizeText(payload.pick_district_code || '', 10),
        _sanitizeText(payload.pick_ward_code || '', 10),
        Number(payload.ghn_shop_id) || '',
        _sanitizeText(payload.ghtk_pick_address_id || '', 50),
        _sanitizeText(payload.goship_shop_id || '', 50),
        _sanitizeText(payload.vnpost_customer_code || '', 50),
        _sanitizeText(payload.viettelpost_source_id || '', 50),
        _sanitizeText(payload.pick_notes || '', 200),
        // V6.5 Goship 3 code (city/district/ward) — cột 31/32/33
        _sanitizeText(payload.goship_from_city || '', 20),
        _sanitizeText(payload.goship_from_district || '', 20),
        _sanitizeText(payload.goship_from_ward || '', 20)
      ]);
      // Cột Phone (D=4) và cột PickPhone (Q=17) + PickProvinceCode/DistrictCode/WardCode (V/W/X = 22/23/24)
      // phải là Plain text để giữ số 0 đầu + code chuẩn GSO (01/001/00001).
      var newRow = sh.getLastRow();
      _forcePlainText(sh, newRow, [4, 17, 22, 23, 24]);
      sh.getRange(newRow, 4).setValue(phone);
      sh.getRange(newRow, 17).setValue(pickPhone);
      // Codes ghi lại từ payload để giữ nguyên "01", "001", "00001" — _sanitizeText đã trả string,
      // nhưng Sheets có thể cast lại number khi setValue nếu không _forcePlainText trước.
      if (payload.pick_province_code) sh.getRange(newRow, 22).setValue(String(payload.pick_province_code));
      if (payload.pick_district_code) sh.getRange(newRow, 23).setValue(String(payload.pick_district_code));
      if (payload.pick_ward_code)     sh.getRange(newRow, 24).setValue(String(payload.pick_ward_code));
      return branchId;
    },

    update: function(branchId, payload) {
      var found = this.findById(branchId);
      if (!found) throw new Error('Không tìm thấy chi nhánh: ' + branchId);
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BRANCHES);

      var active = payload.active !== undefined ? !!payload.active : found.active;
      if (!active && found.is_default) {
        throw new Error('Không thể tắt chi nhánh đang là Mặc định — chọn 1 chi nhánh khác làm Mặc định trước.');
      }

      var makeDefault = found.is_default;
      if (payload.is_default === true && !found.is_default) {
        this._clearDefaultFlag(sh);
        makeDefault = true;
      }
      // payload.is_default === false khi found.is_default vẫn true: cố ý BỎ QUA (xem comment đầu
      // object) — không cho tắt trực tiếp, tránh về 0 dòng default.

      // Ép cột Phone (D=4) về Plain text TRƯỚC setValues để số 0 đầu không rụng (giống Suppliers.update).
      sh.getRange(found._row, 4).setNumberFormat('@');
      sh.getRange(found._row, 2, 1, 9).setValues([[
        payload.name_vi !== undefined ? _sanitizeText(payload.name_vi, 100) : found.name_vi,
        payload.name_en !== undefined ? _sanitizeText(payload.name_en, 100) : found.name_en,
        payload.phone !== undefined ? _sanitizeText(payload.phone, 20) : found.phone,
        payload.email !== undefined ? _sanitizeText(payload.email, 100) : found.email,
        payload.address !== undefined ? _sanitizeText(payload.address, 200) : found.address,
        payload.tax_code !== undefined ? _sanitizeText(payload.tax_code, 30) : found.tax_code,
        active,
        payload.sort_order !== undefined ? (Number(payload.sort_order) || 0) : found.sort_order,
        makeDefault
      ]]);
      // Province/Ward (cột 13-14) — không liền cạnh CreatedAt/CreatedBy (11-12, không sửa) nên ghi
      // riêng 1 range.
      sh.getRange(found._row, 13, 1, 2).setValues([[
        payload.province !== undefined ? _sanitizeText(payload.province, 100) : found.province,
        payload.ward !== undefined ? _sanitizeText(payload.ward, 100) : found.ward
      ]]);
      // DefaultBankAccountID (cột 15) — TK ngân hàng mặc định của chi nhánh (rỗng = kế thừa chi nhánh chính).
      if (payload.default_bank_account_id !== undefined) {
        sh.getRange(found._row, 15).setValue(String(payload.default_bank_account_id || ''));
      }

      // V6.2 multi-warehouse — pick address + adapter IDs (cột 16-30). Update từng cột thay vì
      // 1 range 15-wide vì phần lớn update partial (chỉ đổi vài field, ví dụ chỉ điền ghn_shop_id
      // mà không đổi address). PickPhone (Q=17) và code cols (V/W/X=22/23/24) cần _forcePlainText
      // trước setValue để không rụng số 0 đầu.
      var pickPlainCols = [];
      if (payload.pick_phone !== undefined)          pickPlainCols.push(17);
      if (payload.pick_province_code !== undefined)  pickPlainCols.push(22);
      if (payload.pick_district_code !== undefined)  pickPlainCols.push(23);
      if (payload.pick_ward_code !== undefined)      pickPlainCols.push(24);
      if (pickPlainCols.length) _forcePlainText(sh, found._row, pickPlainCols);

      if (payload.pick_receiver_name !== undefined)   sh.getRange(found._row, 16).setValue(_sanitizeText(payload.pick_receiver_name, 100));
      if (payload.pick_phone !== undefined)           sh.getRange(found._row, 17).setValue(_sanitizeText(payload.pick_phone, 20));
      if (payload.pick_address !== undefined)         sh.getRange(found._row, 18).setValue(_sanitizeText(payload.pick_address, 200));
      if (payload.pick_ward !== undefined)            sh.getRange(found._row, 19).setValue(_sanitizeText(payload.pick_ward, 100));
      if (payload.pick_district !== undefined)        sh.getRange(found._row, 20).setValue(_sanitizeText(payload.pick_district, 100));
      if (payload.pick_province !== undefined)        sh.getRange(found._row, 21).setValue(_sanitizeText(payload.pick_province, 100));
      if (payload.pick_province_code !== undefined)   sh.getRange(found._row, 22).setValue(String(payload.pick_province_code || ''));
      if (payload.pick_district_code !== undefined)   sh.getRange(found._row, 23).setValue(String(payload.pick_district_code || ''));
      if (payload.pick_ward_code !== undefined)       sh.getRange(found._row, 24).setValue(String(payload.pick_ward_code || ''));
      if (payload.ghn_shop_id !== undefined)          sh.getRange(found._row, 25).setValue(Number(payload.ghn_shop_id) || '');
      if (payload.ghtk_pick_address_id !== undefined) sh.getRange(found._row, 26).setValue(_sanitizeText(payload.ghtk_pick_address_id, 50));
      if (payload.goship_shop_id !== undefined)       sh.getRange(found._row, 27).setValue(_sanitizeText(payload.goship_shop_id, 50));
      if (payload.vnpost_customer_code !== undefined) sh.getRange(found._row, 28).setValue(_sanitizeText(payload.vnpost_customer_code, 50));
      if (payload.viettelpost_source_id !== undefined) sh.getRange(found._row, 29).setValue(_sanitizeText(payload.viettelpost_source_id, 50));
      if (payload.pick_notes !== undefined)           sh.getRange(found._row, 30).setValue(_sanitizeText(payload.pick_notes, 200));
      // V6.5 Goship dynamic origin — 3 code (cột 31/32/33). Plain text để giữ leading 0 nếu có.
      var gsCols = [];
      if (payload.goship_from_city !== undefined)     gsCols.push(31);
      if (payload.goship_from_district !== undefined) gsCols.push(32);
      if (payload.goship_from_ward !== undefined)     gsCols.push(33);
      if (gsCols.length) _forcePlainText(sh, found._row, gsCols);
      if (payload.goship_from_city !== undefined)     sh.getRange(found._row, 31).setValue(_sanitizeText(payload.goship_from_city, 20));
      if (payload.goship_from_district !== undefined) sh.getRange(found._row, 32).setValue(_sanitizeText(payload.goship_from_district, 20));
      if (payload.goship_from_ward !== undefined)     sh.getRange(found._row, 33).setValue(_sanitizeText(payload.goship_from_ward, 20));
      return branchId;
    }
  },

  // ── Shipping Carriers (Phase C) — registry đa đối tác. GHN chỉ là 1 đầu mối. Credentials (token/
  // shop_id) KHÔNG lưu ở đây (giữ trong Settings/Script Properties per-carrier) — sheet này chỉ metadata
  // + trạng thái kết nối, để chia sẻ được cho kế toán mà không lộ secret. ──
  ShippingCarriers: {
    _COLS: 8, // CarrierCode|Name|Category|Connected|ExpiryDate|SupportInvoice|SortOrder|CreatedAt
    _mapRow: function(r) {
      return {
        carrier_code: String(r[0]), name: String(r[1] || ''), category: String(r[2] || 'SELF'),
        connected: r[3] === true || String(r[3]).toLowerCase() === 'true',
        expiry_date: r[4] || '', support_invoice: r[5] === true || String(r[5]).toLowerCase() === 'true',
        sort_order: Number(r[6]) || 0, created_at: r[7]
      };
    },
    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.SHIPPING_CARRIERS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues().map(function(r, i) {
        var o = self._mapRow(r); o._row = i + 2; return o;
      }).sort(function(a, b) { return a.sort_order - b.sort_order; });
    },
    findByCode: function(code) {
      var all = this.findAll();
      for (var i = 0; i < all.length; i++) if (all[i].carrier_code === String(code)) return all[i];
      return null;
    },
    upsert: function(payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.SHIPPING_CARRIERS);
      var code = String(payload.carrier_code || '').trim().toUpperCase();
      if (!code) throw new Error('carrier_code là bắt buộc');
      var found = this.findByCode(code);
      var row = [
        code, _sanitizeText(payload.name || code, 100), String(payload.category || 'SELF'),
        payload.connected !== undefined ? !!payload.connected : (found ? found.connected : false),
        String(payload.expiry_date || (found ? found.expiry_date : '')),
        payload.support_invoice !== undefined ? !!payload.support_invoice : (found ? found.support_invoice : false),
        payload.sort_order !== undefined ? (Number(payload.sort_order) || 0) : (found ? found.sort_order : 999),
        found ? found.created_at : nowIso()
      ];
      if (found) sh.getRange(found._row, 1, 1, this._COLS).setValues([row]);
      else sh.appendRow(row);
      return code;
    }
  },

  // ── Reconciliation (Phase C) — phiếu đối soát COD/phí với ĐTVC (carrier-agnostic). ──
  Reconciliations: {
    _COLS: 12, // ReconID|CarrierCode|Status|PaymentStatus|TotalCODPartner|TotalFeePartner|TotalOther|NetTotal|CreatedAt|CreatedBy|PostedAt|Note
    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum, recon_id: String(r[0]), carrier_code: String(r[1] || ''),
        status: String(r[2] || ''), payment_status: String(r[3] || ''),
        total_cod_partner: Number(r[4]) || 0, total_fee_partner: Number(r[5]) || 0,
        total_other: Number(r[6]) || 0, net_total: Number(r[7]) || 0,
        created_at: r[8], created_by: String(r[9] || ''), posted_at: r[10] || '', note: String(r[11] || '')
      };
    },
    findById: function(reconId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECONCILIATIONS);
      if (!sh || sh.getLastRow() < 2) return null;
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues();
      for (var i = 0; i < data.length; i++) if (String(data[i][0]) === reconId) return this._mapRow(data[i], i + 2);
      return null;
    },
    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECONCILIATIONS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues().map(function(r, i) { return self._mapRow(r, i + 2); });
    },
    create: function(p) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECONCILIATIONS);
      var id = generateId(sh, 'DS', 6);
      sh.appendRow([id, String(p.carrier_code || ''), p.status || 'Chờ đối soát', 'Chưa thanh toán',
        0, 0, 0, 0, nowIso(), p.created_by || 'staff', '', _sanitizeText(p.note || '', 500)]);
      return id;
    },
    updateTotals: function(reconId, t) {
      var f = this.findById(reconId); if (!f) return;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECONCILIATIONS);
      sh.getRange(f._row, 5, 1, 4).setValues([[t.total_cod_partner || 0, t.total_fee_partner || 0, t.total_other || 0, t.net_total || 0]]);
      _forceNumberFormat(sh, f._row, [5, 6, 7, 8]);
    },
    setStatus: function(reconId, status, extra) {
      var f = this.findById(reconId); if (!f) return;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECONCILIATIONS);
      sh.getRange(f._row, 3).setValue(status);
      if (extra && extra.payment_status !== undefined) sh.getRange(f._row, 4).setValue(extra.payment_status);
      if (extra && extra.posted_at !== undefined) sh.getRange(f._row, 11).setValue(extra.posted_at);
    }
  },
  ReconciliationItems: {
    _COLS: 12, // ReconItemID|ReconID|TrackingCode|OrderID|CODSystem|CODPartner|FeeSystem|FeePartner|OtherFee|CODDiff|FeeDiff|NetActual
    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum, item_id: String(r[0]), recon_id: String(r[1]), tracking_code: String(r[2] || ''),
        order_id: String(r[3] || ''), cod_system: Number(r[4]) || 0, cod_partner: Number(r[5]) || 0,
        fee_system: Number(r[6]) || 0, fee_partner: Number(r[7]) || 0, other_fee: Number(r[8]) || 0,
        cod_diff: Number(r[9]) || 0, fee_diff: Number(r[10]) || 0, net_actual: Number(r[11]) || 0
      };
    },
    findByRecon: function(reconId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECONCILIATION_ITEMS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); })
        .filter(function(x) { return x.recon_id === reconId; });
    },
    append: function(reconId, it) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECONCILIATION_ITEMS);
      var id = generateId(sh, 'DSI', 6);
      var codDiff = (Number(it.cod_system) || 0) - (Number(it.cod_partner) || 0);
      var feeDiff = (Number(it.fee_system) || 0) - (Number(it.fee_partner) || 0);
      var net = (Number(it.cod_partner) || 0) - (Number(it.fee_partner) || 0) - (Number(it.other_fee) || 0);
      sh.appendRow([id, reconId, String(it.tracking_code || ''), String(it.order_id || ''),
        Number(it.cod_system) || 0, Number(it.cod_partner) || 0, Number(it.fee_system) || 0,
        Number(it.fee_partner) || 0, Number(it.other_fee) || 0, codDiff, feeDiff, net]);
      _forceNumberFormat(sh, sh.getLastRow(), [5, 6, 7, 8, 9, 10, 11, 12]);
      return id;
    },
    // Sửa tay giá trị ĐTVC sau khiếu nại → tính lại diff/net (kế toán đưa chênh lệch về 0 trước khi chốt).
    updatePartner: function(itemId, codPartner, feePartner, otherFee) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.RECONCILIATION_ITEMS);
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) !== itemId) continue;
        var codSys = Number(data[i][4]) || 0, feeSys = Number(data[i][6]) || 0;
        var cp = Number(codPartner) || 0, fp = Number(feePartner) || 0, of = Number(otherFee) || 0;
        var row = i + 2;
        sh.getRange(row, 6, 1, 3).setValues([[cp, fp, of]]); // CODPartner/FeePartner/OtherFee
        sh.getRange(row, 10, 1, 3).setValues([[codSys - cp, feeSys - fp, cp - fp - of]]); // diffs + net
        return this._mapRow(sh.getRange(row, 1, 1, this._COLS).getValues()[0], row);
      }
      throw new Error('Không tìm thấy dòng đối soát: ' + itemId);
    }
  },

  // Party hợp nhất Customer/Supplier/Employee/Other cho chứng từ AR/AP (finance.md §4.1) —
  // Customer party trỏ thẳng Customers sheet (không copy), Supplier/Employee/Other là hàng
  // mới ở đây. Đợt Phase 02/04 này chỉ tạo Party Type=SUPPLIER (đi kèm Repository.Suppliers).
  Parties: {
    _COLS: 7, // PartyID|Type|RefID|Name|Contact|Active|CreatedAt

    _mapRow: function(r) {
      return {
        party_id: String(r[0]), type: String(r[1]), ref_id: String(r[2] || ''),
        name: String(r[3]), contact: String(r[4] || ''),
        active: r[5] === true || String(r[5]).toLowerCase() === 'true', created_at: r[6]
      };
    },

    findById: function(partyId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PARTIES);
      if (!sh || sh.getLastRow() < 2) return null;
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) === partyId) return this._mapRow(data[i]);
      }
      return null;
    },

    findByType: function(type) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PARTIES);
      if (!sh || sh.getLastRow() < 2) return [];
      var mapRow = this._mapRow;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .filter(function(r) { return String(r[1]) === type; })
        .map(mapRow);
    },

    // Tìm Party theo (Type, RefID) — dùng để tránh tạo trùng Party khi Supplier đã có Party rồi.
    findByRef: function(type, refId) {
      return this.findByType(type).filter(function(p) { return p.ref_id === refId; })[0] || null;
    },

    create: function(payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PARTIES);
      var partyId = generateId(sh, 'PTY', 5);
      sh.appendRow([
        partyId, payload.type, payload.ref_id || '', payload.name,
        payload.contact || '', true, nowIso()
      ]);
      return partyId;
    }
  },

  // ── Inventory (Phase 02 Bước 2) — xem docs/architecture/inventory.md ──
  PurchaseOrders: {
    // PurchaseOrderID|SupplierID|Status|OrderDate|TotalAmount|Note|CreatedBy|CreatedAt|PostedAt|
    // CancelledAt|ShippingCost|StorageCost|VATAmount|AllocationBasis|DiscountAmount|PaymentTerms|
    // DepositAmount — 7 cột cuối thêm 2026-07-10 (docs/mops.md §6, review 17).
    // ✅ Cột cuối đổi 2026-07-11 (review 21) từ DepositPercent (%) → DepositAmount (VNĐ trực tiếp) —
    // % tạo số lẻ khi tính ra Phiếu chi (vd 30% của 1.234.567đ = 370.370,1đ), hộ kinh doanh muốn
    // nhập thẳng số tiền cọc tròn. Tên cột trong Sheet giữ nguyên vị trí (Q), chỉ đổi Ý NGHĨA/field
    // key phía code — không cần migrate dữ liệu vì tính năng chưa từng dán production.
    _COLS: 17,

    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        purchase_order_id: String(r[0]), supplier_id: String(r[1]), status: String(r[2]),
        order_date: r[3] || '', total_amount: Number(r[4]) || 0, note: String(r[5] || ''),
        created_by: String(r[6] || ''), created_at: r[7],
        posted_at: r[8] || '', cancelled_at: r[9] || '',
        shipping_cost: Number(r[10]) || 0, storage_cost: Number(r[11]) || 0,
        vat_amount: Number(r[12]) || 0, allocation_basis: String(r[13] || 'QTY'),
        discount_amount: Number(r[14]) || 0, payment_terms: String(r[15] || 'FULL'),
        deposit_amount: Number(r[16]) || 0
      };
    },

    findById: function(purchaseOrderId) {
      // 2026-08-10 TextFinder fast-path
      var norm = String(purchaseOrderId || '').trim();
      if (!norm) return null;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PURCHASE_ORDERS);
      if (!sh || sh.getLastRow() < 2) return null;
      var row = _findSheetRowExact(sh, 1, norm);
      if (row === -1) return null;
      return this._mapRow(sh.getRange(row, 1, 1, this._COLS).getValues()[0], row);
    },

    findAll: function() {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PURCHASE_ORDERS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); });
    },

    create: function(payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PURCHASE_ORDERS);
      var purchaseOrderId = generateId(sh, 'PO', 6);
      sh.appendRow([
        purchaseOrderId, payload.supplier_id, 'Draft', payload.order_date || nowIso(),
        payload.total_amount, payload.note || '', payload.created_by || 'system', nowIso(), '', '',
        payload.shipping_cost || 0, payload.storage_cost || 0, payload.vat_amount || 0,
        payload.allocation_basis || 'QTY', payload.discount_amount || 0,
        payload.payment_terms || 'FULL', payload.deposit_amount || 0
      ]);
      _forceNumberFormat(sh, sh.getLastRow(), [5, 11, 12, 13, 15, 17]);
      return purchaseOrderId;
    },

    updateStatus: function(purchaseOrderId, newStatus, extra) {
      var found = this.findById(purchaseOrderId);
      if (!found) throw new Error('Không tìm thấy Phiếu nhập hàng: ' + purchaseOrderId);
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PURCHASE_ORDERS);
      sh.getRange(found._row, 3).setValue(newStatus); // Status
      if (extra && extra.posted_at)    sh.getRange(found._row, 9).setValue(extra.posted_at);
      if (extra && extra.cancelled_at) sh.getRange(found._row, 10).setValue(extra.cancelled_at);
      return found;
    },

    // Sửa phiếu Draft (review 2026-07-16) — ghi lại toàn bộ field editable (KHÔNG đụng Status/
    // CreatedBy/CreatedAt/PostedAt/CancelledAt — cột B,F,K-Q còn lại đều ghi lại full, đơn giản hơn
    // partial-update từng field vì updatePurchaseOrder() luôn gửi đủ cả bộ sau khi validate lại).
    update: function(purchaseOrderId, payload) {
      var found = this.findById(purchaseOrderId);
      if (!found) throw new Error('Không tìm thấy Phiếu nhập hàng: ' + purchaseOrderId);
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PURCHASE_ORDERS);
      sh.getRange(found._row, 2).setValue(payload.supplier_id);           // B SupplierID
      sh.getRange(found._row, 4).setValue(payload.order_date || found.order_date); // D OrderDate
      sh.getRange(found._row, 5).setValue(payload.total_amount);          // E TotalAmount
      sh.getRange(found._row, 6).setValue(payload.note || '');           // F Note
      sh.getRange(found._row, 11, 1, 7).setValues([[                     // K-Q ShippingCost..DepositAmount
        payload.shipping_cost || 0, payload.storage_cost || 0, payload.vat_amount || 0,
        payload.allocation_basis, payload.discount_amount || 0,
        payload.payment_terms, payload.deposit_amount || 0
      ]]);
      _forceNumberFormat(sh, found._row, [5, 11, 12, 13, 15, 17]);
      return purchaseOrderId;
    }
  },

  PurchaseItems: {
    // PurchaseItemID|PurchaseOrderID|ProductID|ProductName|Qty|UnitCost|LineTotal|Weight|LotCode|
    // MfgDate|ExpDate|Barcode|AllocatedCost|UnitCostLanded|VariantID — VariantID nối cuối (cột 15,
    // review 2026-07-17 đa-biến-thể) để nhập kho theo đúng biến thể/size. Nối cuối để không lệch
    // index; setAllocatedCost()/deleteByPurchaseOrderId() chỉ đọc cột 1/2/13-14 nên không ảnh hưởng.
    _COLS: 15,

    findByPurchaseOrderId: function(purchaseOrderId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PURCHASE_ITEMS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .map(function(r, i) { return { _row: i + 2, raw: r }; })
        .filter(function(x) { return String(x.raw[1]) === purchaseOrderId; })
        .map(function(x) { return self._mapRow(x.raw, x._row); });
    },

    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        purchase_item_id: String(r[0]), purchase_order_id: String(r[1]),
        product_id: String(r[2] || ''), product_name: String(r[3] || ''),
        qty: Number(r[4]) || 0, unit_cost: Number(r[5]) || 0, line_total: Number(r[6]) || 0,
        weight: Number(r[7]) || 0, lot_code: String(r[8] || ''), mfg_date: r[9] || '',
        exp_date: r[10] || '', barcode: String(r[11] || ''),
        allocated_cost: Number(r[12]) || 0, unit_cost_landed: Number(r[13]) || 0,
        variant_id: String(r[14] || '') // O — đa-biến-thể (2026-07-17)
      };
    },

    appendItems: function(purchaseOrderId, items) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PURCHASE_ITEMS);
      items.forEach(function(item) {
        var itemId = generateId(sh, 'POI', 6);
        var lineTotal = Number(item.qty) * Number(item.unit_cost);
        sh.appendRow([
          itemId, purchaseOrderId, item.product_id || '', item.product_name || '',
          item.qty, item.unit_cost, lineTotal,
          item.weight || 0, item.lot_code || '', item.mfg_date || '', item.exp_date || '',
          item.barcode || '', 0, 0, // AllocatedCost/UnitCostLanded — tính lúc Post, chưa có ở Draft
          item.variant_id || '' // O VariantID — đa-biến-thể (2026-07-17)
        ]);
        _forceNumberFormat(sh, sh.getLastRow(), [5, 6, 7, 8, 13, 14]);
      });
    },

    // Ghi lại AllocatedCost/UnitCostLanded sau khi tính phân bổ lúc Post (xem postPurchaseOrder()).
    // KHÔNG dùng appendRow — đây là UPDATE 2 cột cuối của dòng đã có sẵn.
    setAllocatedCost: function(purchaseItemId, allocatedCost, unitCostLanded) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PURCHASE_ITEMS);
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) === purchaseItemId) {
          sh.getRange(i + 2, 13, 1, 2).setValues([[allocatedCost, unitCostLanded]]);
          return;
        }
      }
    },

    // Sửa phiếu Draft (review 2026-07-16) — xoá toàn bộ dòng cũ trước khi ghi lại danh sách mới
    // qua appendItems(), đơn giản hơn diff từng dòng. AN TOÀN vì chỉ gọi cho PO còn Draft (chưa
    // Post → chưa có InventoryMovements/AllocatedCost nào tham chiếu các PurchaseItemID này).
    // Xoá từ dưới lên để không lệch index khi deleteRow() nhiều dòng liên tiếp.
    deleteByPurchaseOrderId: function(purchaseOrderId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.PURCHASE_ITEMS);
      if (!sh || sh.getLastRow() < 2) return;
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
      for (var i = data.length - 1; i >= 0; i--) {
        if (String(data[i][1]) === purchaseOrderId) sh.deleteRow(i + 2);
      }
    }
  },

  // Append-only, giống LedgerEntries — Type IN (nhập)/OUT (xuất bán)/ADJUST (điều chỉnh, huỷ đối
  // ứng). Hướng A (docs/architecture/inventory.md §4): sheet này CHỈ phục vụ audit + giá vốn bình
  // quân gia quyền, KHÔNG dùng để tính/hiển thị số tồn (SAPO vẫn là nguồn tồn duy nhất).
  InventoryMovements: {
    _COLS: 11, // MovementID|ProductID|Type|Qty|UnitCost|SourceType|SourceRef|Note|CreatedBy|CreatedAt|VariantID

    _mapRow: function(r) {
      return {
        movement_id: String(r[0]), product_id: String(r[1]), type: String(r[2]),
        qty: Number(r[3]) || 0, unit_cost: Number(r[4]) || 0, source_type: String(r[5] || ''),
        source_ref: String(r[6] || ''), note: String(r[7] || ''),
        created_by: String(r[8] || ''), created_at: r[9],
        variant_id: String(r[10] || '') // K — đa-biến-thể (2026-07-17)
      };
    },

    // variantId TUỲ CHỌN: truyền → lọc đúng biến thể (kèm dòng cũ VariantID rỗng = tồn của sản phẩm
    // hồi còn single-variant, vẫn thuộc biến thể đó); không truyền → mọi biến thể của sản phẩm.
    findByProduct: function(productId, variantId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.INVENTORY_MOVEMENTS);
      if (!sh || sh.getLastRow() < 2) return [];
      var mapRow = this._mapRow;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .filter(function(r) {
          if (String(r[1]) !== productId) return false;
          if (!variantId) return true;
          var v = String(r[10] || '');
          return v === variantId || v === '';
        })
        .map(mapRow);
    },

    findBySource: function(sourceType, sourceRef) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.INVENTORY_MOVEMENTS);
      if (!sh || sh.getLastRow() < 2) return [];
      var mapRow = this._mapRow;
      return sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .filter(function(r) { return String(r[5]) === sourceType && String(r[6]) === sourceRef; })
        .map(mapRow);
    },

    append: function(entry) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.INVENTORY_MOVEMENTS);
      var movementId = generateId(sh, 'IM', 8);
      sh.appendRow([
        movementId, entry.product_id, entry.type, entry.qty, entry.unit_cost || 0,
        entry.source_type || '', entry.source_ref || '', entry.note || '',
        entry.created_by || 'system', nowIso(), entry.variant_id || '' // K VariantID
      ]);
      _forceNumberFormat(sh, sh.getLastRow(), [4, 5]);
      // Average cost is derived from IN rows only — invalidate that projection here so the
      // cached read can never serve a cost computed before this lot existed.
      if (String(entry.type) === 'IN') { _bumpCacheGeneration('inventory_in'); _memoBust('large_inventory_movement_rows'); }
      return movementId;
    },

    // Batch (perf sprint 2026-08-06): ghi N movement bằng 1 setValues() + 1 setNumberFormat range,
    // thay N × appendRow (mỗi lần = 1 RPC + 1 lần gen ID + 2 setNumberFormat). Behavior-identical
    // với gọi append() N lần theo thứ tự entries; trả mảng movementId cùng thứ tự.
    appendMany: function(entries) {
      if (!entries || !entries.length) return [];
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.INVENTORY_MOVEMENTS);
      var ids = generateIdsBatch(sh, 'IM', 8, entries.length);
      var now = nowIso();
      var rows = entries.map(function(e, i) {
        return [
          ids[i], e.product_id, e.type, e.qty, e.unit_cost || 0,
          e.source_type || '', e.source_ref || '', e.note || '',
          e.created_by || 'system', now, e.variant_id || ''
        ];
      });
      var startRow = sh.getLastRow() + 1;
      sh.getRange(startRow, 1, rows.length, this._COLS).setValues(rows);
      sh.getRange(startRow, 4, rows.length, 2).setNumberFormat('#,##0'); // Qty (D) + UnitCost (E)
      if (entries.some(function(e) { return String(e.type) === 'IN'; })) {
        _bumpCacheGeneration('inventory_in');
        _memoBust('large_inventory_movement_rows');
      }
      return ids;
    }
  },

  // ── AP (Phase 04 Bước 3) — xem docs/architecture/finance.md §4.3, §2.1 ──
  // Bills.Status KHÔNG phải trường tự do — luôn tính lại bởi _recalcBillStatus()
  // mỗi khi 1 PaymentVoucher tham chiếu Bill này được Posted (finance.md §4.3).
  Bills: {
    _COLS: 9, // BillID|PartyID|Amount|DueDate|Status|SourceSystem|SourceType|SourceRef|CreatedAt

    _mapRow: function(r, rowNum) {
      return {
        _row: rowNum,
        bill_id: String(r[0]), party_id: String(r[1]), amount: Number(r[2]) || 0,
        due_date: r[3] || '', status: String(r[4]),
        source_system: String(r[5] || ''), source_type: String(r[6] || ''), source_ref: String(r[7] || ''),
        created_at: r[8]
      };
    },

    findById: function(billId) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BILLS);
      if (!sh || sh.getLastRow() < 2) return null;
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) === billId) return this._mapRow(data[i], i + 2);
      }
      return null;
    },

    // Khoá chống trùng "1 Business Event chỉ sinh 1 Financial Document" (finance.md §7.5),
    // cùng mẫu Repository.Receipts.findBySource — bắt buộc dùng bộ 3 phần, không chỉ SourceRef.
    findBySource: function(sourceSystem, sourceType, sourceRef) {
      if (!sourceSystem || !sourceType || !sourceRef) return null;
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BILLS);
      if (!sh || sh.getLastRow() < 2) return null;
      var data = sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][5]) === sourceSystem && String(data[i][6]) === sourceType && String(data[i][7]) === sourceRef) {
          return this._mapRow(data[i], i + 2);
        }
      }
      return null;
    },

    findAll: function(params) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BILLS);
      if (!sh || sh.getLastRow() < 2) return [];
      var self = this;
      var all = sh.getRange(2, 1, sh.getLastRow() - 1, this._COLS).getValues()
        .map(function(r, i) { return self._mapRow(r, i + 2); });
      if (params && params.party_id) all = all.filter(function(b) { return b.party_id === params.party_id; });
      if (params && params.status)   all = all.filter(function(b) { return b.status === params.status; });
      return all;
    },

    create: function(payload) {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BILLS);
      var billId = generateId(sh, 'BILL', 6);
      sh.appendRow([
        billId, payload.party_id, payload.amount, payload.due_date || '', 'OPEN',
        payload.source_system || '', payload.source_type || '', payload.source_ref || '', nowIso()
      ]);
      _forceNumberFormat(sh, sh.getLastRow(), [3]);
      return billId;
    },

    updateStatus: function(billId, newStatus) {
      var found = this.findById(billId);
      if (!found) throw new Error('Không tìm thấy Bill: ' + billId);
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.BILLS);
      sh.getRange(found._row, 5).setValue(newStatus); // Status
      return found;
    }
  }
};

// ── POSTING ENGINE (docs/architecture/finance.md §8) ─────────────────────────
// Dùng chung cho MỌI loại Finance Document. Cả 4 loại (Receipt/Payment Voucher/
// Transfer/Cash Adjustment) đã implement từ Bước 3 — KHÔNG tạo hàm postXxx()/
// reverseXxx() riêng cho từng loại, luôn thêm nhánh else-if vào 2 hàm này.
// Wrapper mỏng — khoá toàn bộ thân hàm bằng LockService để 2 request Post cùng
// lúc cho CÙNG 1 chứng từ không thể cả 2 cùng đọc thấy Status hợp lệ rồi cùng
// ghi Ledger (mỗi request phải đợi request trước hoàn tất + nhả khoá trước khi
// đọc lại Status). release trong finally — không bao giờ giữ khoá quá 10s chờ.
// postingDateOverride: CHỈ dùng nội bộ bởi migrateV1ToFinanceCore() để backdate
// LedgerEntry của chứng từ migrate về đúng ngày lịch sử gốc (CashTransactions.
// CreatedAt) thay vì ngày chạy migrate — KHÔNG expose qua action HTTP công khai
// nào (post_receipt/post_payment_voucher không forward tham số này) vì cho phép
// backdate bút toán tài chính tuỳ ý là rủi ro gian lận cổ điển (dồn doanh thu vào
// kỳ đã đóng sổ). Bỏ trống (undefined) ở mọi lời gọi khác → hành vi y hệt trước
// đây (luôn nowIso()).
function postDocument(documentType, documentId, actorStaffId, postingDateOverride) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return _postDocumentImpl(documentType, documentId, actorStaffId, postingDateOverride);
  } finally {
    lock.releaseLock();
  }
}
