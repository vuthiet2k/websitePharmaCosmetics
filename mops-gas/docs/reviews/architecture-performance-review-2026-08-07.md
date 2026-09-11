# MOPS ERP Lite — Architecture & Performance Review

**Review date:** 2026-08-07  
**Scope:** Google Apps Script V8 backend, Google Sheets persistence, MOPS Admin Vue client and directly related Sapo assets.  
**Review mode:** source review only; no business-code refactor, deploy, load test or production data mutation was performed.

## Executive Summary

MOPS đã có nhiều quyết định kiến trúc đúng và nên giữ: router tập trung; read/write permission ở server; request memo `_REQ`; generation-based cache invalidation; catalog cache; batch write cho OrderItems và InventoryMovements; queue Telegram claim trước, gọi mạng ngoài lock; order detail snapshot + stale-while-revalidate ở frontend; render fail-closed.

Ba nhóm rủi ro lớn nhất là:

1. **Read path còn phụ thuộc vào full-table materialization.** Repository `findById`, `findByPhone`, `findByCustomer`, `findByCode` thường gọi `findAll`; các report/list/analytics đọc nhiều sheet từ dòng 2 đến cuối rồi lọc trong V8. Đây là finding kiến trúc đã xác minh từ source, nhưng latency và ngưỡng dữ liệu cần benchmark.
2. **Command path chưa có transaction liên-sheet hoặc idempotency contract tổng quát.** Create Order ghi nhiều sheet và có cleanup best-effort; ID generation giữ lock nhưng chỉ “peek” ID trước khi append. Đây là risk data-integrity/concurrency; chưa đủ evidence để kết luận đang xảy ra duplicate trong production.
3. **Observability chưa đủ cho percentile và capacity review.** `_perfStart/_perfMark/_perfReport` chỉ log transcript khi bật setting, chưa có request correlation, sheet I/O counters, cache hit ratio, lock wait/hold, queue age hoặc p95/p99 rollup. Vì vậy chưa thể xác nhận bottleneck latency thật.

### Finding count

| Priority | Count | Meaning |
|---|---:|---|
| Critical | 1 | Có một router read-path lỗi scope biến, xác minh trực tiếp từ source. |
| High | 4 | Đủ evidence kiến trúc để xử lý/đo có mục tiêu. |
| Medium | 5 | Có impact hoặc growth risk, nhưng cần benchmark/scale trigger. |
| Low | 1 | Không nên ưu tiên trước các vấn đề I/O/correctness. |

## Review Boundaries And Evidence Rules

- **Observed:** source hiện tại, có file/line/function.
- **Official basis:** tài liệu kỹ thuật với URL; không dùng để suy ra latency MOPS nếu điều kiện không giống.
- **Need More Measurement:** source cho thấy candidate hoặc risk, nhưng không có runtime data.
- Không có benchmark source-level nào được chạy trong review này. Không có claim p50/p95/p99 của GAS/MOPS.
- `git status` cho thấy worktree đã có thay đổi ở `mops_00.js`–`mops_03.js` và frontend assets. Review không sửa các file đó.

## System Map

### Backend modules

| Module | Responsibility | Main dependencies |
|---|---|---|
| `mops_00.js` | sheet constants, router, public/authenticated dispatch, settings, auth/RBAC, ID helpers, notification enqueue | SpreadsheetApp, CacheService, PropertiesService, LockService |
| `mops_01.js` | Telegram queue, customer upsert/update, catalog pricing, coupons, inventory adjustments, shipping adapters | Repository, Sheets, LockService, UrlFetchApp |
| `mops_02.js` | orders, payments, order detail, fulfillment, product mapping/list/update, shipping/reconciliation entry points | Repository, Sheets, cache, external carrier helpers |
| `mops_03.js` | customer/CRM, imports/exports, cash transactions and Repository implementation | SpreadsheetApp, Repository contracts |
| `mops_04.js` | finance core, posting/reversal, purchase orders, bills, analytics | Repository, LockService, Sheets |
| `mops_05.js` | reports, logs, Sapo product/order sync, payment expiry, setup/repair triggers | Sheets, UrlFetchApp, Repository |

### Frontend modules

| Module | Responsibility | Evidence |
|---|---|---|
| `templates/page.mops-admin.bwt` | inert Vue template, visible preloader and empty mount host | documented in `docs/mops-admin-frontend.md` |
| `assets/mops-admin.js.bwt` | single Vue bootstrap, auth/session, API helper, tab bootstrap and render guard | lines 85–110, 1650–1790 |
| `assets/mops-admin-orders.js.bwt` | order list/detail/create/edit, local product/customer search, snapshot detail store | lines 411–446, 510–553, 222–263 |
| order snippets/template | UI markup and interactions | `snippets/mops_admin_tab_orders.bwt`, `templates/page.mops-admin.bwt` |

## Request And Data Flow

### Authenticated Admin read

```text
Vue gasGet/gasPost
→ POST GAS_URL with JSON body and token
→ doPost → _resetReqCache → JSON parse
→ _checkMaintenance → getSettings
→ _handleRead → checkPermission where required
→ domain read / Repository / SpreadsheetApp / CacheService
→ ContentService JSON
→ Promise resolution → Vue state → computed/template render
```

Evidence: `mops_00.js:242-281`, `mops_00.js:317-361`, `assets/mops-admin.js.bwt:81-110`.

### Create Order

```text
Client form
→ create_order(_dispatchWrite, permission if admin)
→ settings/payment guard and payload validation
→ ProductMappings + Products price resolution
→ customer/coupon/discount/branch/bank resolution
→ Orders append
→ OrderItems batch write
→ Payments append
→ inventory movement + InventoryQty projection
→ activity/finance/notification side effects
→ QR/order response
```

Evidence: `mops_02.js:175-245` and subsequent create flow; `mops_01.js:293-439`; `mops_00.js:222-239`.

### Order detail UX

```text
Order list row snapshot
→ immediate workspace detail render
→ in-memory detailStore merge
→ background get_order
→ replace detail only if response is successful and order is still expanded
→ skeleton only for missing detail groups; retain snapshot on error
```

Evidence: `assets/mops-admin-orders.js.bwt:510-553`; this is a strength to preserve.

---

## Module Reviews

## 1. Router, Middleware, Settings And Authentication

### Overview

`mops_00.js` owns `doPost`, `doGet`, `_handleRead`, `_dispatchWrite`, maintenance gate, settings, staff token lookup and permission checks. Inputs are HTTP parameters/body; outputs are JSON `ContentService` responses. Storage includes Settings/Staffs/Permissions/StaffPermissions and CacheService/PropertiesService.

### Current Flow

```text
HTTP
→ doPost/doGet
→ request memo reset
→ maintenance/settings
→ read or write route
→ token/RBAC
→ domain handler
→ JSON response
```

### Current Design

- Read actions are routed before writes; GET is restricted to public reads and authenticated reads use POST, keeping tokens out of query URLs (`mops_00.js:267-303`).
- `_REQ` is explicitly reset per request (`mops_00.js:564-571`).
- Settings uses request memo + Script Cache for Sheet config, while secret keys are overlaid from Script Properties (`mops_00.js:710-743`).
- Permission results are cached by role/staff, but server permission checks remain in the route path (`mops_00.js:1330-1523`).

### Observation

**R1 — Confirmed design strength.** Permission is not only a client-side visibility rule. `checkPermission()` runs on server routes and includes role and staff-specific permissions (`mops_00.js:1415-1439`). No change recommended.

**R0 — Critical, confirmed functional defect: authenticated Goship read routes reference an undefined variable.** `_handleRead` receives `params`, but `ship_rates`, `goship_invoices`, `goship_invoice_shipments` and `import_carrier_invoice` call `checkPermission(payload.token)` / `goship*(payload)` (`mops_00.js:336-349`). There is no `payload` parameter or local variable in `_handleRead`; invoking one of these actions reaches a `ReferenceError`, which outer request handling converts to an error response. This is a route correctness defect, not a performance conclusion.

**R2 — Need More Measurement: settings/auth critical-path cost.** Every request enters `_checkMaintenance()` and calls `getSettings()`; cache usually avoids Sheet read, but Script Properties overlay still executes per memoized request (`mops_00.js:262-263`, `mops_00.js:715-743`). Source does not establish whether this is material versus network/runtime latency.

**R3 — High: generation bump is not a transaction.** `_dispatchWrite()` calls `_bumpAnalyticsGen()` only after the handler returns (`mops_00.js:237-239`); cache invalidation is best-effort (`mops_00.js:581-587`). This is acceptable as a cache optimization, not as a data-consistency mechanism.

### Evidence / Technical Basis

- Official: [Apps Script Best Practices](https://developers.google.com/apps-script/guides/support/best-practices) recommends minimizing service calls and batching reads/writes.
- Official: [CacheService](https://developers.google.com/apps-script/reference/cache/cache) is best-effort and bounded; cached data must not be the only correctness source.
- MOPS evidence above.

### Suggestion

Correct R0 with the smallest route-local parameter-name fix and regression tests for every authenticated read action before any performance work. Separately, add request-level phase telemetry: auth/settings duration, cache hit/miss, serialized size and error/eviction counters. Do not move secrets to CacheService. Consider a versioned settings contract only if measured settings overhead or stale behavior justifies it.

| Dimension | Assessment |
|---|---|
| Expected gain | Unknown until measured; likely low/medium. |
| Development cost | S |
| Maintenance cost | S |
| Risk | Low |
| Complexity | Low |
| ROI | High for observability; unknown for latency |
| Confidence | ★★★★☆ |
| Priority | High for measurement, Medium for optimization |

### Trade-off

Reducing settings reads must not weaken secret isolation or server authorization. Keep the current server-side gate and cache invalidation ownership explicit.

## 2. Request Memo, Cache And Performance Instrumentation

### Overview

`_REQ` provides one-execution memoization; `_cachedRead` combines memoization, generation-keyed Script Cache, JSON serialization and a 95 KB guard; `_perf*` emits marks to Logger.

### Current Flow

```text
request reset
→ first function call
→ _REQ hit/miss
→ CacheService hit/miss
→ Sheet computation on miss
→ JSON stringify/put when within size guard
```

### Observation

**R4 — High: cache behavior is not observable enough.** `_cachedRead` does not record hit/miss, put failure, payload size, age or stampede count (`mops_00.js:589-600`). `_perf*` records only marks and total time to Logger when enabled (`mops_00.js:610-638`). This prevents evidence-based TTL/hit-ratio decisions.

**R5 — Confirmed scope limitation.** `_REQ` is per execution by design; it cannot avoid a full read across requests (`mops_00.js:564-570`). This is correct behavior, not a bug.

### Suggestion

Add sampled structured telemetry, without PII or full payloads: action, trace ID, cache key class, hit/miss, value bytes, phase durations, read/write cell counts, lock wait/held and outcome. Aggregate percentiles outside the hot path or in bounded rollups. Do not write one performance row per micro-event to ActivityLogs.

| Dimension | Assessment |
|---|---|
| Expected gain | No direct latency gain; enables correct prioritization. |
| Development cost | M |
| Maintenance cost | M |
| Risk | Low/Medium |
| Complexity | Medium |
| ROI | High |
| Confidence | ★★★★★ |
| Priority | High |

### Trade-off

Instrumentation adds CPU, serialization and logging volume. Sampling and bounded schemas are required; never include token, phone, address or secret values.

## 3. Repository And Spreadsheet Access

### Overview

`Repository` in `mops_03.js` maps rows to domain objects for Products, Customers, Orders, Coupons, finance and InventoryMovements. Some write paths remain explicit for row-sensitive mutations.

### Current Flow

```text
service/domain query
→ Repository.findById/findByPhone/findBySource
→ getLastRow/getLastColumn
→ getRange(...).getValues()
→ map/filter in V8
→ DTO/domain object
```

### Observation

**F1 — High, confirmed by source: key lookup materializes full tables.** `Orders.findById()` calls `findAll()` (`mops_03.js:1115-1129`); `Customers.findById()` and `findByPhone()` call `findAll()` (`mops_03.js:1167-1191`); `Coupons.findByCode()` calls `findAll()` (`mops_03.js:1051-1063`). This is O(rows) data transfer and mapping per cache miss, not merely an O(n) JavaScript loop.

**F2 — High, confirmed by source: Inventory lookup is history-proportional.** `InventoryMovements.findByProduct()` and `findBySource()` read the complete movement table before filtering (`mops_03.js:2530-2550`). `_calcAvgCostBatch()` has improved one create request by reading once, but still reads all movement history (`mops_01.js:705-735`).

**F3 — Medium, confirmed by source: finance dedup queries scan complete tables.** `Receipts.findBySource()` scans all receipt rows (`mops_03.js:1477-1487`), and `ReceiptLines.findByReceiptId()` scans all receipt lines (`mops_03.js:1519-1526`). Whether this is currently slow depends on row counts and invocation frequency.

**F4 — Confirmed strength: some batch opportunities were already implemented.** `InventoryMovements.appendMany()` uses one generated ID batch, one `setValues()` and one number-format range (`mops_03.js:2565-2583`). Preserve the semantic ordering and audit behavior.

### Impact

- Current: every cache miss or request path using these methods transfers rows proportional to table history.
- Growth trigger: repeated detail/search operations, increasing Products/Customers/Orders/Movements/Receipts rows, or concurrent cache misses.
- Not proven: exact milliseconds, p95 or failure threshold.

### Suggestion

Introduce bounded query APIs behind Repository, in this order:

1. Measure current row counts and call frequency.
2. Add locator/index or bounded active-range strategy for the hottest keys (OrderID, CustomerID/phone, Product variant, receipt source tuple).
3. Maintain locator metadata under the same correctness protocol as the write, with rebuild/reconciliation tooling.
4. Keep full scans for explicit exports/reports, not detail/search critical paths.

| Dimension | Assessment |
|---|---|
| Expected gain | Directional: removes history-proportional reads; quantify with benchmark. |
| Development cost | M/L |
| Maintenance cost | M/L due to index lifecycle/rebuild |
| Risk | Medium/High for stale row locators and migration |
| Complexity | Medium |
| ROI | High when row growth or p95 confirms it; Low before then |
| Confidence | ★★★★★ for bottleneck shape, ★★★☆☆ for runtime impact |
| Priority | High |

### Trade-off

An index improves reads but creates a second state to maintain. Do not add multiple indexes at once. Start with one measured hot path and a repair/rebuild command; do not replace Repository boundaries.

## 4. Orders, Payments And Fulfillment

### Overview

`mops_02.js` owns create/read/update order workflows, payment reporting, fulfillment transitions and product mapping/list operations. It interacts with Customers, Products, OrderItems, Payments, ShippingAddresses, InventoryMovements, finance and carrier adapters.

### Current Flow

Create Order:

```text
payload validation
→ catalog price/mapping resolution
→ discount/coupon/customer policy
→ customer/address/branch/bank resolution
→ Orders append
→ OrderItems batch write
→ Payments append
→ movement and inventory projection
→ activity/finance/notification side effects
→ response
```

Get Order:

```text
settings
→ Repository.Orders.findById
→ Customer full-column scan by ID
→ optional phone verification
→ shipping address
→ OrderItems full-table scan by OrderID
→ snapshot JSON enrichment; Products full scan only for legacy missing fields
→ payment/timeline response
```

Evidence: `mops_02.js:175-245`, `mops_02.js:704-820`.

### Observation

**O1 — High, confirmed: Get Order has bounded business result but unbounded storage scans.** The order detail reads all Orders through `Repository.Orders.findById()`, all Customers through a full A:C range, and all OrderItems before filtering (`mops_02.js:714`, `724-733`, `767-776`). New snapshots correctly avoid a Products scan for new orders, but legacy enrichment remains full-catalog on the fallback path (`mops_02.js:777-818`).

**O2 — Confirmed strength: frontend perceived latency is handled well.** The client renders list snapshot immediately, merges detail cache, guards stale responses by `expandedId`, and retains the snapshot on failure (`mops-admin-orders.js.bwt:510-553`). Keep this behavior while improving backend bounded reads.

**O3 — High risk, Need More Measurement for occurrence: multi-sheet create has no database transaction.** Create Order performs multiple writes and deletes some rows on write failure; customer, inventory, finance and notification side effects have best-effort paths. Source comments explicitly acknowledge no real transaction in the write block. This is a correctness risk under partial failure, not a proven incident.

**O4 — High risk, Need More Measurement: ID reservation is not atomic with append.** `generateId()`/`generateIdsBatch()` lock, scan max ID and release before the caller appends (`mops_00.js:999-1021`, `1025-1040`). Two executions can reserve the same next ID after separate lock releases. Existing behavior and low concurrency may make this rare; source alone cannot establish production duplicates.

### Suggestion

- P0: instrument create/get phases, partial-failure outcomes and duplicate/idempotency symptoms.
- P1: bounded Order/Customer/OrderItem reads and one locator pilot.
- P2: introduce durable idempotency key and command state for create/payment before optimistic retry or external retries.
- Treat inventory/finance/notification side effects as explicit state transitions with reconciliation, not implicit atomicity.

| Dimension | Assessment |
|---|---|
| Expected gain | Get Order: likely high if scans dominate; Create Order: unknown until phase data. |
| Development cost | M/L |
| Maintenance cost | M |
| Risk | Medium/High because order and financial correctness are involved |
| Complexity | Medium/High |
| ROI | High for bounded reads and idempotency; not justified for V8 micro-tuning |
| Confidence | ★★★★☆ |
| Priority | High |

### Trade-off

Do not make order creation asynchronous before a durable command/receipt contract exists. Immediate “received” UX is useful only if the user can distinguish accepted, committed, failed and needs-reconciliation states.

## 5. Product, Customer And CRM

### Overview

Product catalog/mapping supports checkout and manual order search. Customers include CRM fields, import/export and order statistics. Frontend manual search uses local Vue state.

### Current Flow

```text
Admin bootstrap/tab load
→ list_products/list_customers API
→ server Sheet read and map/join
→ Vue state
→ computed filter/sort
→ bounded result DOM
```

`listCustomers()` reads all Customers and all Orders once, builds `statsByCustomer`, maps/sorts and slices (`mops_03.js:289-348`). Frontend product search filters `products.all` and renders at most 30/50 results (`mops-admin-orders.js.bwt:222-263`).

### Observation

**P1 — High, confirmed shape: customer list is not a true server-side paginated query.** `limit` is applied after reading and mapping all customers and all orders (`mops_03.js:289-310`, `312-347`). A limit of 50 still performs full-table work.

**P2 — Medium, Need More Measurement: local product search complexity.** Each computed search filters and sorts `products.all`, while output is capped at 30/50 (`mops-admin-orders.js.bwt:222-263`). This protects DOM size but not necessarily CPU if the catalog is large. Need browser profiling with actual product counts and keystroke frequency.

**P3 — Confirmed strength: cart lookup uses a Map-like object and result cap.** `manualOrderCartMap()` avoids scanning the cart for each card, and search output is bounded. Do not optimize V8 object details before measuring browser long tasks.

### Suggestion

Keep local search for a measured catalog size. If browser long tasks or payload size become material, use a versioned compact catalog snapshot/chunks or server cursor search. For customer list, move order statistics to a maintained projection only when measured list latency/growth warrants its write complexity.

| Dimension | Assessment |
|---|---|
| Expected gain | Customer list: directional high at growth; product search: unknown. |
| Development cost | M for projection/index; S for telemetry |
| Maintenance cost | M |
| Risk | Medium for stale stats/customer data |
| Complexity | Medium |
| ROI | High for customer lookup at scale; unknown for local search |
| Confidence | ★★★★☆ for customer read shape, ★★★☆☆ for browser impact |
| Priority | High customer measurement; Medium product search |

## 6. Inventory

### Overview

Inventory is append-oriented through InventoryMovements plus mutable `Products.InventoryQty`. Average cost is recomputed from IN movements; create/update/purchase paths adjust quantities and append movements.

### Current Flow

```text
sale/purchase/status change
→ lock where mutation has race risk
→ append movement(s)
→ update Product.InventoryQty projection
→ reports/average-cost reads movement history
```

### Observation

**I1 — High, confirmed shape: average-cost and movement lookup scale with movement history.** `_calcAvgCostBatch()` reads all movement rows once per relevant request (`mops_01.js:705-735`), while Repository lookup methods also scan all movement rows (`mops_03.js:2530-2550`).

**I2 — Confirmed strength: batch movement and quantity updates reduce per-item service calls.** `appendMany()` is rectangular and preserves entry order (`mops_03.js:2568-2583`); `_adjustInventoryQtyBatch()` consolidates deltas (`mops_01.js:785-820`).

**I3 — Need More Measurement: best-effort inventory side effect.** Create Order catches movement errors and does not fail the sales order. This may be the intended operational policy, but the report cannot determine reconciliation lag or stock accuracy from source.

### Suggestion

Keep append ledger and mutable projection. Add an explicit reconciliation/rebuild monitor before introducing a full CQRS system. If movement scans exceed measured SLO, maintain ProductVariant cost/on-hand projection keyed by product/variant/branch and rebuild from the ledger.

| Dimension | Assessment |
|---|---|
| Expected gain | High only when movement history is a dominant phase. |
| Development cost | L |
| Maintenance cost | L |
| Risk | High for stock/cost drift |
| Complexity | High |
| ROI | Medium/High after benchmark; Low before |
| Confidence | ★★★★☆ |
| Priority | High measurement, Medium implementation |

## 7. Finance, Purchase And ERP Consistency

### Overview

`mops_04.js` implements receipts, payment vouchers, transfers, cash adjustments, posting/reversal, suppliers, branches, purchase orders, bills and analytics. Finance uses append ledger entries and status transitions.

### Current Flow

```text
permission
→ document lookup/validation
→ LockService for posting/reversal where configured
→ append ledger/lines or update document status
→ activity/audit
→ response
```

### Observation

**F1 — High, confirmed shape: repeated source-dedup and line queries scan complete sheets.** `Receipts.findBySource`, `ReceiptLines.findByReceiptId` and similar repository methods scan full ranges (`mops_03.js:1477-1487`, `1519-1536`).

**F2 — Confirmed architecture strength: append/reversal semantics are appropriate for audit.** The code preserves ledger history and reverses rather than deleting in posting flows. Do not replace with mutable balance-only storage for a small latency win.

**F3 — Need More Measurement: lock contention around finance posting.** The source contains `waitLock(10000)` around posting/reversal paths (`mops_04.js:135-136`, `948-951`, `1117-1124`), but no wait/hold telemetry. Cannot conclude contention is production-impacting.

### Suggestion

Add source tuple locator/dedup index only after measuring receipt/ledger row counts and duplicate-check frequency. Preserve append-only audit and rebuild/reconcile capability. Keep lock scope small and never hold it across external network work.

| Dimension | Assessment |
|---|---|
| Expected gain | Unknown; potentially high for growing ledgers. |
| Development cost | M/L |
| Maintenance cost | M |
| Risk | High if financial uniqueness/audit is weakened |
| Complexity | Medium |
| ROI | High only with evidence |
| Confidence | ★★★★☆ |
| Priority | High measurement, Medium implementation |

## 8. Dashboard, Reports And Analytics

### Overview

Reports in `mops_05.js` and `getAnalytics()` in `mops_04.js` aggregate Orders, Payments, OrderItems, Customers, ActivityLogs, CashTransactions, inventory and shipping data. Analytics has a generation-keyed Script Cache.

### Current Flow

```text
report request + date/group/finance params
→ cache key/generation lookup
→ on miss: read multiple full ranges
→ in-memory joins/maps/filters/sorts
→ JSON cache put if size allows
→ dashboard Vue state/charts/render
```

Evidence: `mops_04.js:1406-1477`; `mops_05.js:10-410`.

### Observation

**D1 — High, confirmed shape: cache miss scans multiple historical sheets.** `getAnalytics()` reads Orders, Payments, OrderItems, Customers, ActivityLogs and optional CashTransactions across their used rows (`mops_04.js:1441-1477`). Cache reduces repeated work only when the key is hit and under the value size limit.

**D2 — Medium, Need More Measurement: generation invalidation may reduce cache effectiveness under writes.** Every write route bumps the generation (`mops_00.js:237-239`), so high write frequency invalidates all analytics parameter variants. Whether this is harmful depends on dashboard read/write ratio and cache hit data.

**D3 — Need More Measurement: browser chart/render cost.** Source renders multiple charts and dashboard state, but no browser timing or long-task data is available.

### Suggestion

First measure dashboard p50/p95, cache hit ratio, rows/cells read and write frequency. If scans dominate, add precomputed daily/branch/status aggregates with visible `as_of`/lag and rebuild verification. Do not replace finance source-of-truth with a cache or formula-only dashboard.

| Dimension | Assessment |
|---|---|
| Expected gain | Directional high on cache miss at history growth; exact gain unmeasured. |
| Development cost | L |
| Maintenance cost | L |
| Risk | Medium/High for stale or incorrect aggregates |
| Complexity | High |
| ROI | High only after baseline |
| Confidence | ★★★★☆ |
| Priority | High measurement; Medium implementation |

## 9. Shipping And External APIs

### Overview

`mops_01.js` contains GHN, Ahamove, GHTK, Viettel Post and Goship adapters, master-data caches, rate guards, shipment state and webhook handlers. `mops_05.js` contains Sapo sync/push/pull. Telegram uses a background queue.

### Current Flow

```text
command/webhook/trigger
→ settings/token resolution
→ carrier/Sapo UrlFetch
→ response/status mapping
→ Sheet state update
→ retry or queue where configured
```

### Observation

**S1 — Confirmed strength: Telegram does not call the vendor under ScriptLock.** Queue claims rows under a short `tryLock(2000)`, releases, then calls Telegram and finalizes state (`mops_01.js:45-102`). Preserve this pattern.

**S2 — Medium, Need More Measurement: queue finalization uses multiple cell writes per job.** Claim/finalize paths call `setValue()` repeatedly (`mops_01.js:67-68`, `82-99`). This is a batch candidate only if queue throughput or lock contention is measured.

**S3 — High risk, Need More Measurement: external timeout/retry idempotency.** Source has status/retry/reclaim behavior, but a complete vendor-side idempotency guarantee cannot be established from the repository. Webhook duplicate/out-of-order behavior must be tested per carrier.

### Suggestion

Instrument vendor duration/status/retry and queue age first. Add deterministic event idempotency keys and reconciliation status for shipment/Sapo operations. Optimize row finalization only after measuring throughput; never merge it with vendor call under lock.

| Dimension | Assessment |
|---|---|
| Expected gain | Queue write batching: unknown; external network dominates candidate path. |
| Development cost | M |
| Maintenance cost | M |
| Risk | High if retries duplicate shipments/sync |
| Complexity | Medium |
| ROI | High for correctness telemetry; unknown for batching |
| Confidence | ★★★★☆ |
| Priority | High correctness/measurement |

## 10. Frontend Bootstrap, State And Rendering

### Overview

The Admin is one Vue 3 app. Domain assets register mixins/components; `mops-admin.js.bwt` owns bootstrap and mount. API helper posts JSON to GAS. Orders use workspace views and in-memory detail store.

### Current Flow

```text
Liquid inert template + preloader
→ local Vue asset/domain assets
→ root bootstrap
→ session token lookup
→ staff_me POST
→ initDashboard/tab resolution
→ domain API call
→ Vue reactive state/computed rendering
```

### Observation

**U1 — Confirmed strength: render integrity and failure handling are deliberate.** `docs/mops-admin-frontend.md` specifies empty host, inert template, preloader and fail-closed runtime guard. Do not remove these to hide startup errors.

**U2 — Medium, Need More Measurement: boot calls public province API eagerly.** `mounted()` calls `ensureProvincesLoaded()` after `initApp()` (`assets/mops-admin.js.bwt:1788-1790`), and API helpers use `fetch` without a measured request budget for that ancillary data. It may be parallel and non-blocking, but browser timing is unknown.

**U3 — Medium, Need More Measurement: API helper has no generic cancellation, deduplication or request timing.** `gasPost()` creates one fetch per call and parses text then JSON (`assets/mops-admin.js.bwt:85-110`). Order detail protects stale state at the caller, but other domains may not have the same guard.

**U4 — Low/Medium, Need More Measurement: local computed search repeats filter/sort on reactive changes.** The result DOM is capped, but `manualOrderMatchedProducts` scans and sorts the full local catalog (`mops-admin-orders.js.bwt:222-246`). Need actual catalog size and Chrome long-task/INP data before changing it.

### Suggestion

Add browser `performance.mark` for boot, staff_me, tab data, order detail and save-to-confirm; capture Resource Timing and long tasks in sampled non-PII telemetry. Only then decide on lazy province loading, request cancellation/deduplication, catalog indexing or code splitting.

| Dimension | Assessment |
|---|---|
| Expected gain | Unknown; potentially high perceived gain if boot waterfall is confirmed. |
| Development cost | S/M |
| Maintenance cost | S |
| Risk | Low/Medium |
| Complexity | Low/Medium |
| ROI | High for measurement; optimization conditional |
| Confidence | ★★★★☆ |
| Priority | High measurement, Medium optimization |

### Trade-off

The current snapshot/skeleton behavior improves perceived latency without weakening server authority. Keep it. Do not add persistent browser storage for sensitive order detail merely to reduce one request.

## 11. Logging, Audit And Operations

### Overview

ActivityLogs/AuditTrail/Notifications capture business and operational events. `Logger.log` is used for performance transcript and selected failures. Triggers handle queue, warm-up, sync and expiry.

### Observation

**L1 — High, confirmed: operational performance cannot currently produce percentile dashboard.** `_perfReport` outputs a text transcript and deletes in-request state (`mops_00.js:626-638`); no rollup or trace correlation exists.

**L2 — Confirmed strength: business audit is separated from performance instrumentation.** `logActivity` and finance audit paths are business records; do not overload them with every timing mark (`mops_01.js:157-183`).

### Suggestion

Add sampled structured operational events outside the business audit stream. Record only aggregate identifiers and bounded dimensions. Provide a small operator dashboard or Cloud Logging query for p95, errors, queue age, lock time and cache ratio.

| Dimension | Assessment |
|---|---|
| Expected gain | No direct path speed; high diagnosis/operations gain. |
| Development cost | M |
| Maintenance cost | M |
| Risk | Low if PII-safe |
| Complexity | Medium |
| ROI | High |
| Confidence | ★★★★★ |
| Priority | High |

---

## Consolidated Findings

| ID | Domain | Finding | Evidence type | Current impact | Growth trigger | Suggestion | Gain | Cost | Risk | ROI | Confidence | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R0 | Router/read dispatch | Goship authenticated reads use undefined `payload` instead of `_handleRead` parameter `params` | Observed | affected requests fail before domain call | every Goship read/import request | smallest route-local fix + dispatch regression coverage | Correctness, not latency | S | Low | High | ★★★★★ | Critical |
| R2 | Router/settings | Settings/auth cost not measured | Need More Measurement | Unknown critical-path overhead | Every request, cache miss | phase telemetry | Unknown | S | Low | High measurement ROI | ★★★★☆ | High |
| R3 | Cache | Generation bump is best-effort invalidation, not transaction | Observed | stale cache/failure semantics need contract | frequent writes/cache misses | explicit version/freshness contract | Correctness clarity | S/M | Medium | High | ★★★★☆ | High |
| R4 | Observability | No cache/lock/I/O percentile telemetry | Observed | cannot prove bottleneck/SLO | multi-user load | structured sampled tracing | Indirect | M | Low/Medium | High | ★★★★★ | High |
| F1 | Repository | `findById/findByPhone/findByCode` materialize full table | Observed | history-proportional reads | growing tables/cache misses | bounded query/locator pilot | Directional High | M/L | Medium | High after measure | ★★★★★ | High |
| F2 | Inventory | movement queries scan full history | Observed | cost/lookup read grows with ledger | sales/purchase history | projection/reconciliation | Directional High | L | High | Medium/High | ★★★★☆ | High |
| F3 | Finance | source/line dedup scans full tables | Observed | bounded business query, unbounded storage read | financial document growth | measured locator/index | Unknown/High | M/L | High | Conditional | ★★★★☆ | Medium |
| O1 | Orders | get_order reads Orders, Customers and OrderItems full ranges | Observed | open-detail path scales with history | order/item growth | bounded detail read | Directional High | M/L | Medium | High | ★★★★★ | High |
| O3 | Orders | multi-sheet create has no ACID transaction | Observed/risk | partial failure can need compensation | network/runtime/write failure | durable command state/reconcile | Latency neutral, integrity high | L | High | High correctness ROI | ★★★★☆ | High |
| O4 | IDs | ID peek released before append | Observed/risk | potential duplicate under race | concurrent writes | benchmark + atomic allocator/idempotency | Unknown | M | High | Conditional | ★★★★☆ | High |
| P1 | Customers | `limit` applied after full customer+order read | Observed | list cost not bounded by UI limit | customer/order growth | projection/cursor | Directional High | M/L | Medium | High | ★★★★★ | High |
| D1 | Analytics | cache miss reads many historical sheets | Observed | dashboard/report miss cost grows | writes invalidate generation | aggregate projection after baseline | Directional High | L | Medium/High | Conditional High | ★★★★☆ | High |
| S2 | Queue | per-job multi-cell finalization | Observed | possible throughput cost | queue depth | benchmark batch finalization | Unknown | M | Medium | Conditional | ★★★★☆ | Medium |
| U2/U3 | Frontend | boot/ancillary fetch/request timing not measured | Need More Measurement | perceived latency unknown | slower network/more tabs | RUM + lazy/cancel only if proven | Unknown | S/M | Low/Medium | High measurement ROI | ★★★★☆ | High |
| U4 | Frontend search | full local catalog filter/sort per reactive change | Need More Measurement | browser CPU candidate | catalog size/weak devices | profile before index/debounce | Unknown | S/M | Low | Conditional | ★★★☆☆ | Medium |
| L1 | Operations | Logger transcript cannot produce p95/p99 | Observed | no capacity/SLO evidence | production users | rollup/structured telemetry | Indirect High | M | Low | High | ★★★★★ | High |

## Confirmed Bottleneck Shapes

These are confirmed from code structure, not latency:

1. Full range materialization in key Repository lookups.
2. Full movement-history reads for inventory/cost paths.
3. Full multi-sheet scans on analytics/report cache misses.
4. Customer list reads all customers and orders before applying `limit`.
5. Get Order reads all OrderItems and Customer rows before filtering.

## High-Probability Candidates, Not Yet Confirmed Runtime Bottlenecks

1. ID collision risk under concurrent reservation/append.
2. Lock contention in finance and ID generation.
3. Queue finalization write overhead.
4. Settings/PropertiesService critical-path cost.
5. Browser boot/province fetch and local product search long tasks.

## Need More Measurement Backlog

| Scenario | Dataset/environment | Method | Metrics | Decision gate |
|---|---|---|---|---|
| `get_order` | benchmark sheet with 1k/5k/10k/50k Orders and OrderItems; V8 web-app deployment | 5 warmup + 30 samples, cold and warm | total, server phase, cells read, p50/p95/p99 | bounded locator only if SLO breach or growth projection |
| Repository lookup | 1k–200k rows realistic MOPS width | compare full scan, request memo, Map after preload, locator read | latency incl I/O, memory/payload, correctness | introduce one locator pilot if material |
| `list_customers` | customer/order matrix 1k–100k | current path vs projection/cursor prototype in isolated sheet | p50/p95, cells, response bytes | projection only if limit does not bound cost and SLO fails |
| analytics | Orders/Payments/Items/Customers/Logs matrix | cache hit/miss and generation invalidation under 1/10/100 logical clients | p95, hit ratio, cells, execution errors | aggregate model if cache miss dominates |
| ID concurrency | isolated deployment, 1/10/100 logical clients | concurrent create-like ID reservation, no production writes | duplicate IDs, lock wait, timeout | change allocator only if duplicates or unacceptable wait reproduced |
| queue | 1/10/25/50 notifications, mocked external endpoint | current per-cell finalize vs batch writes | throughput, lock hold, queue age, retries | batch only if throughput is limiting and claim semantics preserved |
| frontend boot | actual supported browsers/weak device/network profiles | browser Performance/INP/long-task trace | boot-to-interactive, staff_me, ancillary fetch, DOM/long tasks | lazy/cancel/code split only on measured cost |
| product search | actual catalog cardinalities | type 20 chars, category changes, cart changes | scripting time, long tasks, INP, allocations | local index only when filter/sort cost is material |

All benchmark runs must use a separate spreadsheet/deployment, typed realistic data, documented row/column/formula/format counts, 5 warmups plus at least 30 samples, p50/p95/p99 and concurrency/error results. Do not load-test production.

## High-ROI Recommendations

1. **Structured performance telemetry and RUM** before optimization. Low behavior risk, high decision value.
2. **Bounded-read pilot for one hot lookup**, preferably Order detail or Customer phone, with rebuild/reconciliation. Do not replace the entire Repository.
3. **Idempotency and reconciliation for create/payment/external events** before optimistic retries or async command handling.
4. **Instrument lock wait/hold and queue age**; retain the current short-claim/outside-lock external call pattern.
5. **Measure dashboard cache hit/miss and historical scan size** before committing to projections.

## Medium-ROI Recommendations

- Customer summary projection or cursor pagination after list benchmark.
- Product catalog chunking/indexing after payload/browser benchmark.
- Queue finalization batch writes after queue throughput benchmark.
- Analytics daily/branch/status projections after cache-miss baseline.
- Ancillary province data lazy loading after boot RUM.

## Explicitly Rejected Or Deferred

| Proposal | Decision | Reason |
|---|---|---|
| Replace all `forEach` with `for` | Do not optimize now | pure V8 cost is unproven and likely below Sheet I/O |
| Use global variables as persistent cache | Reject | context reuse/freshness is not a correctness contract |
| Add `flush()` after every write | Reject | may force synchronization; no source evidence requires it globally |
| Move immediately to database/microservices | Defer | no measured SLO/quota/scale evidence or migration case yet |
| Replace audit ledger with mutable balances | Reject | damages financial/inventory traceability |
| Add IndexedDB for order detail | Defer/reject for now | existing in-memory store avoids persistent PII; backend/detail baseline is not measured |
| Replace SpreadsheetApp everywhere with Sheets API | Defer | different quota/auth/error model; benchmark exact path first |

## Architecture Strengths To Preserve

- Central read/write dispatch and server-side permission enforcement.
- POST body token handling rather than token in URL.
- Request memo reset per execution.
- Settings cache with secrets kept in Script Properties overlay.
- Generation-based cache invalidation as a cache mechanism, with explicit freshness caveat.
- Batch writes already applied to OrderItems, InventoryMovements and quantity adjustments.
- Snapshot JSON in order items and client stale-while-revalidate detail UX.
- Short lock claim, external call outside lock, retry/dead-letter queue pattern.
- Append/reversal finance and inventory audit semantics.
- Vue single-root/inert-template/fail-closed render integrity contract.

## Roadmap

### P0 — Evidence and correctness gates

1. Add sampled structured traces and browser marks without PII.
2. Capture sheet read/write counts, cells, cache hit/miss/size, lock wait/hold and queue age.
3. Record current row/cell/formula/format counts for operational sheets.
4. Define idempotency/reconciliation acceptance tests for create, payment, inventory and webhooks.

### P1 — High impact, controlled scope

1. Benchmark `get_order`, `list_customers`, analytics miss and InventoryMovements.
2. Implement one bounded lookup/read-model pilot behind existing Repository boundary if gate fails.
3. Preserve append ledger and add rebuild/reconciliation for any projection.

### P2 — Only after benchmark

1. Customer/order/inventory/finance projections.
2. Queue batch finalization.
3. Catalog chunking or browser index.
4. Lazy ancillary bootstrap data and request cancellation/deduplication.

### P3 — Scale-out threshold

If measured concurrency, execution quota, lock contention, data growth or SLO shows that GAS + Sheets cannot provide bounded interactive reads, evaluate a managed query/read model while retaining Sheets as an operational/audit integration where appropriate. This is a threshold decision, not the current default.

## Sources Appendix

| Source | Claim used | GAS applicability | MOPS applicability | Caveat |
|---|---|---|---|---|
| [Apps Script Best Practices](https://developers.google.com/apps-script/guides/support/best-practices) | minimize service calls; batch reads/writes; Apps Script caching behavior | Direct | Direct to SpreadsheetApp paths | published examples are not MOPS latency benchmarks |
| [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas) | execution/concurrency/quota are capacity constraints | Direct | Direct | values can change; review live page before capacity decisions |
| [CacheService](https://developers.google.com/apps-script/reference/cache/cache) | cache scope/TTL/size and best-effort semantics | Direct | Direct | do not use as sole correctness store |
| [LockService](https://developers.google.com/apps-script/reference/lock/lock-service) | lock APIs and release semantics | Direct | Direct | no database transaction/fairness guarantee inferred |
| [V8 runtime](https://developers.google.com/apps-script/guides/v8-runtime) | GAS uses V8 runtime | Direct | Direct | Chrome/Node microbenchmarks do not define GAS latency |
| [Sheets API performance](https://developers.google.com/sheets/api/guides/performance) | batch HTTP requests, field masks and backoff | Conditional | Only for measured multi-range path | Sheets API is not automatically faster than SpreadsheetApp |
| [Sheets API limits](https://developers.google.com/sheets/api/limits) | API quotas and batch limits | Conditional | Conditional | separate quota/auth model |
| [web.dev INP](https://web.dev/articles/inp) | browser responsiveness measurement | Browser only | MOPS Admin only | does not measure GAS server latency |
| [V8 fast properties](https://v8.dev/blog/fast-properties) | object shape can influence V8 optimization | Conditional | Low priority | not a GAS guarantee or first-order evidence |
| [Martin Fowler CQRS](https://martinfowler.com/bliki/CQRS.html) | separate read/write models when justified | Architecture | Conditional | added complexity requires MOPS scale evidence |
| [AWS caching best practices](https://aws.amazon.com/caching/best-practices/) | TTL/cache-aside/invalidation concepts | Conceptual | Conditional | Redis/cloud cache benchmarks do not transfer to CacheService |
| [Redis client patterns](https://redis.io/docs/latest/develop/clients/patterns/) | cache stampede/read-through concepts | Conceptual | Conditional | no Redis is present in MOPS |

## Verification Record

Commands used during review:

```powershell
Get-ChildItem -Force
rg --files -g '!node_modules' -g '!dist' -g '!build'
git status --short
rg -n "^function |^var Repository|..." --glob 'mops_*.js'
rg -n "fetch|GAS_URL|search|render|..." frontend MOPS assets
Get-Content <relevant source ranges> -Encoding UTF8
```

No benchmark/load test, `clasp push`, deployment, production request or production spreadsheet mutation was run. Before handoff, run `git diff --check`, inspect `git status --short`, and verify the only intentional new file is this review document.
