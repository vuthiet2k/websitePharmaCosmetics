# MOPS ERP Lite — Performance Architecture Playbook

**Trạng thái:** Research baseline / chưa thay đổi nghiệp vụ  
**Ngày khảo sát:** 2026-08-07  
**Phạm vi:** MOPS chạy Google Apps Script (V8) + Google Sheets, web app public và Admin Sapo.  
**Nguyên tắc bằng chứng:** không coi một con số Internet là latency của MOPS. Mọi kết luận được gắn nhãn:

| Nhãn | Ý nghĩa |
|---|---|
| **[Official]** | Hành vi/giới hạn được Google hoặc nhà cung cấp nền tảng công bố. |
| **[Observed]** | Đọc trực tiếp từ source MOPS tại thời điểm khảo sát. |
| **[Architecture]** | Suy luận thiết kế từ cơ chế đã được công bố; cần xác nhận bằng benchmark MOPS trước khi đặt SLO. |
| **[Measure]** | Không có benchmark công khai tương đương GAS; phải chạy benchmark trong spreadsheet/deployment MOPS. |

> Không có bảng benchmark chính thức của Google cho `getValues`, `appendRow`, `TextFinder`, công thức hay kích thước sheet ở 100–200.000 dòng. Vì vậy bất kỳ bảng “X ms ở 100.000 dòng” không đi kèm spreadsheet, vùng dữ liệu, deployment, percentile và ngày đo **không được dùng để quyết định kiến trúc MOPS**.

---

## 1. Executive architecture decision

### Mục tiêu UX và SLO đề xuất

Native-like không có nghĩa mọi thao tác phải hoàn tất phía server dưới 100 ms. Với GAS/Sheets, mục tiêu phải tách **thời gian cảm nhận** và **thời gian nhất quán hoàn tất**.

| Hành vi | UX target | Server target sau khi đo baseline | Quy tắc |
|---|---:|---:|---|
| Mở shell/tab, permission đã biết | phản hồi tương tác <100 ms | không gọi server trên critical path | render cache client trước |
| Mở Order/Product/Customer đã preload | nội dung hữu ích <1 s | read-model p95 <1.5 s | stale-while-revalidate hợp lệ nếu có version |
| Search local index | kết quả đầu <100 ms sau debounce | 0 RPC khi data trong index | server fallback có pagination |
| Save sửa một bản ghi | feedback ngay <100 ms | commit p95 <2 s | optimistic UI + idempotency + reconcile |
| Create order | xác nhận nhận yêu cầu ngay <150 ms | core commit p95 <3 s | notification/SAPO/analytics không nằm trên critical path |
| Dashboard | skeleton ngay; số chính <1 s warm | read model/cache p95 <2 s | không quét ledger/order full trong request UI |

Các ngưỡng trên là **SLO thiết kế**, không phải số benchmark đã đạt. Baseline/p50/p95/p99 sẽ quyết định ngưỡng cuối.

### Quyết định kiến trúc

1. **Sheets là system of record và append ledger**, không phải query engine cho mọi interaction.
2. **Tách command path khỏi query path (CQRS nhẹ):** command ghi tối thiểu, idempotent và khoá thật ngắn; query phục vụ UI từ projection/read model/cache/index.
3. **Batch boundary là đơn vị tối ưu số 1 trong GAS:** một `getValues()`/`setValues()` trên vùng cần thiết tốt hơn N RPC đơn ô. Đây là khuyến nghị chính thức của Apps Script.
4. **Cache theo tầng:** request memo → CacheService → client memory/session/IndexedDB. Cache không thay thế authorization hoặc consistency contract.
5. **Không giữ `ScriptLock` khi gọi URLFetch/Telegram/SAPO hoặc render/report nặng.** Claim state ngắn trong lock, thực hiện I/O ngoài lock, sau đó finalize idempotent.
6. **Không dùng global variable làm persistent cache.** V8 context có thể được tái sử dụng nhưng không có contract về warm lifetime; chỉ dùng global cho code/constant, request data nằm trong `_REQ` và cache dùng CacheService.
7. **Không benchmark production bằng một request.** Đo cold/warm, cache hit/miss, 1/10/100 concurrent logical clients và quota/error rate.

---

## 2. Evidence register / nguồn chính thức

| Chủ đề | Nguồn | Kết luận sử dụng cho MOPS | Điều kiện/giới hạn |
|---|---|---|---|
| Batching Spreadsheet | [Apps Script Best Practices](https://developers.google.com/apps-script/guides/support/best-practices) | Minimize service calls; đọc/ghi batch; Apps Script có look-ahead read cache và write cache. | Google nêu ví dụ 70 s → 1 s cho write 100×100 khi batch, nhưng đó là sample riêng, **không suy ra latency MOPS**. |
| Spreadsheet quotas | [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas) | Execution runtime, concurrent executions và quotas là hard capacity constraint. | Quota thay đổi không báo trước; kiểm tra trang live trước capacity planning/release. |
| Cache | [Cache service](https://developers.google.com/apps-script/reference/cache/cache) | Cache item tối đa 100 KB; expiration tối đa 21.600 s; cache có thể evict sớm. | Không dùng cache cho correctness duy nhất hoặc token/session bền vững. |
| Properties | [Properties service](https://developers.google.com/apps-script/guides/properties) + quotas | Properties là persistent key/value configuration, không phải hot database/cache. | Giá trị tối đa 9 KB và quota đọc/ghi theo ngày; kiểm tra quota live. |
| Locks | [Lock service](https://developers.google.com/apps-script/reference/lock/lock-service) | `ScriptLock` serialize các mutation toàn script; `tryLock`/`waitLock` cần timeout và `finally releaseLock`. | Không có fairness/transaction database được bảo đảm. |
| V8 GAS | [V8 runtime overview](https://developers.google.com/apps-script/guides/v8-runtime) | GAS dùng modern V8 syntax/runtime. | Không phải Node.js server: không có API/GC/connection lifecycle contract Node. |
| Sheets API | [Performance guide](https://developers.google.com/sheets/api/guides/performance), [Usage limits](https://developers.google.com/sheets/api/limits) | Batch requests, field masks, exponential backoff; API per-minute quotas. | Sheets API có quota riêng; `SpreadsheetApp` và Sheets API không tự cho benchmark tương đương. |
| Sheets resource capacity | [Sheets limits](https://support.google.com/docs/answer/37603) | Spreadsheet giới hạn 10 triệu cells; công thức/format/linked data vẫn ảnh hưởng trải nghiệm. | Đây là capacity ceiling, không phải ngưỡng performance. |
| Browser UX | [web.dev Core Web Vitals](https://web.dev/articles/vitals), [INP](https://web.dev/articles/inp) | Đo responsiveness end-to-end; giảm work main-thread và long task. | Các metric này là browser UX, không đo trực tiếp GAS. |
| V8 object model | [V8: Fast properties](https://v8.dev/blog/fast-properties) | Object shape ổn định có ích trong V8 nói chung. | **Không ưu tiên cho MOPS** trước RPC/Sheets; GAS không cam kết tuning/flags V8 giống Chrome/Node. |
| CQRS | [Martin Fowler — CQRS](https://martinfowler.com/bliki/CQRS.html) | Read/write model tách khi nhu cầu đọc khác ghi. | Chỉ áp dụng “lite”; tránh event sourcing/framework phức tạp cho ERP Lite. |
| Cache pattern | [AWS caching best practices](https://aws.amazon.com/caching/best-practices/) và [Redis caching](https://redis.io/docs/latest/develop/clients/patterns/) | Cache-aside/read-through, TTL, invalidation, anti-stampede là pattern nền tảng. | Redis latency/connection-pool benchmark **không áp trực tiếp** cho CacheService. |
| Retry | [Google Cloud retry strategy](https://cloud.google.com/storage/docs/retry-strategy) | Retry transient error với exponential backoff + jitter, bounded attempts và idempotency. | Chỉ retry operation idempotent; không retry mù command tạo đơn. |

Các nguồn Google Issue Tracker, GitHub Issues, StackOverflow chỉ được dùng để tái hiện bug/version-specific và phải link issue/câu trả lời cụ thể trong ticket thay đổi. Chúng **không** là nguồn SLO/quota thay cho documentation.

---

## 3. Pipeline thực tế MOPS [Observed]

### 3.1 Entry / request processing

`mops_00.js`:

```text
Client → HTTPS/DNS/TLS/Google web-app edge
       → doPost/doGet
       → _resetReqCache()
       → _checkMaintenance() → getSettings()
       → _handleRead() hoặc _dispatchWrite()
       → token/permission khi route yêu cầu
       → Service/domain/repository/Spreadsheet/UrlFetch
       → JSON ContentService response
       → browser parse/render/event loop
```

Không thể tách chính xác DNS/TLS/Google edge duration từ Apps Script. Browser `PerformanceResourceTiming` đo được tổng client network (`fetchStart`, `requestStart`, `responseStart`, `responseEnd`); server tự đo được phần handler. Phần chênh là Google edge/network/serialization không quan sát trực tiếp.

### 3.2 Create Order hiện tại

`createOrder()` (`mops_02.js`) có marking nội bộ sẵn. Pipeline thực tế:

```text
doPost
  → maintenance/settings
  → route permission (admin)
  → validate payload
  → validateAndPriceItems
      → ProductMappings + Products (CacheService 300 s/gen; fallback sheet read)
  → coupon / customer group / discount limit
  → upsert customer; optional shipping address; branch/bank resolution
  → generateId + append Orders + number format
  → read all IN InventoryMovements for average cost
  → batch OrderItems setValues + number formats
  → generateId + append Payments + format
  → optional inventory movement appendMany + product Qty batch adjust
  → ActivityLog
  → optional Finance / enqueue notification / external follow-up
  → response QR/order
```

**Điểm mạnh:** `_REQ`, catalog `_cachedRead`, item batch write, inventory batch adjustment và marks đã có.  
**Critical observation:** command vẫn gồm nhiều sheet reads/writes, ID generation dựa sheet, và average-cost quét `InventoryMovements`. Khi volume movement tăng, đây là candidate projection/cache đầu tiên.  
**Consistency note:** `_dispatchWrite()` bump analytics generation chỉ sau handler return; thất bại/best-effort side effect không có transaction liên-sheet. Đây phải được mô hình hóa bằng state machine + compensating/idempotent worker, không bằng kỳ vọng “atomic Sheet transaction”.

### 3.3 Read/query hiện tại

Repository `findById` thường gọi `findAll`, và nhiều `findAll` đọc cả vùng data rồi linear scan (`Orders`, `Customers`, `Products`, `Coupons`, `InventoryMovements`). `_REQ` chỉ loại bỏ repeated read trong cùng request; nó không làm index liên request. Report `mops_05.js` và `getAnalytics()` đọc nhiều sheet, map/join trong memory.

**Kết luận [Architecture]:** tại 10k–200k rows, optimization lớn nhất không phải đổi `for` sang `Map` sau khi đã đọc tất cả sheet; là **không đọc toàn bộ sheet cho interaction list/detail/search**. Khi full scan không tránh được (batch report), build maps sau một read vẫn đúng hơn N×scan.

### 3.4 Queue/lock hiện tại

`processBackgroundQueue()` đã có pattern đúng: `tryLock(2s)` → claim `PROCESSING` → release → Telegram `UrlFetch` → update status. Tuy nhiên claim/finalization đang có nhiều `setValue()` theo job/dòng. Với batch >1, chuyển thành range batch hoặc Sheets API batch update là candidate sau khi benchmark, miễn không làm mất reclaim/idempotency.

### 3.5 Inventory/finance

Inventory movement và ledger là append-oriented, phù hợp audit. `Products.InventoryQty` là projection mutable. Các read “average cost / on-hand / dashboard” không nên quét full append ledger trên interaction path; cần projection theo ProductVariant và day/branch.

---

## 4. Cơ chế performance đa tầng

| Level | Cơ chế | Khi nhanh | Khi chậm/bottleneck | Áp dụng GAS/MOPS |
|---|---|---|---|---|
| 1 Algorithm | O(1) index vs O(n) scan; one pass join | Map index được xây từ data đã preload | N+1 scan, sort/filter full dataset mỗi keystroke | **High**: search, customer/product/order lookup |
| 2 Memory | RAM access, allocation, serialization | compact DTO, stable schema, reuse request result | giant arrays, JSON > cache limit, GC pressure | **High**, nhưng sau I/O |
| 3 GAS runtime | isolate start, service RPC, execution quota | short handler, lazy data access | cold execution, many service boundary crossings | **Critical** |
| 4 Sheets engine | cell storage, formulas/recalc, formatting | rectangular range batch, append ledger | whole-sheet scans, volatile/cross-sheet formulas, row-by-row writes | **Critical** |
| 5 Network | browser↔Google, UrlFetch↔vendor | cached/preloaded UI, parallel independent fetches | serial fetch, slow vendor, retry storm | **High** |
| 6 Browser | JS parse/render/layout/paint | virtual list, small DOM, async chunk render | thousands DOM rows, forced layout, long task | **High** |
| 7 UX | perceived latency | skeleton/optimistic UI/predictable state | blank screen, blocking modal, duplicate submit | **Critical** |
| 8 Maintainability | explicit cache/version/state contract | shared repository/query API | opaque global cache, duplicated index logic | **High** |
| 9 Scalability | contention/quota/data growth | bounded work/request, projection/queue | global lock, scans proportional all history | **Critical** |

### Cache: nguyên lý, không chỉ CacheService

Database/sheet access crosses a service boundary and often forces remote execution; RAM lookup stays inside the current process. Cache works only if the **hit** avoids expensive work and the value is safe to be temporarily stale. MOPS layers:

```text
L0 request memo (_REQ)      scope: one execution; exact freshness
L1 CacheService             scope: script/user/document; best-effort TTL
L2 browser memory           scope: page; instant
L3 sessionStorage/IndexedDB scope: session/device; versioned stale data
L4 Sheet                    source of record
```

Pattern quyết định:

| Data | Pattern | Invalidation | Correctness |
|---|---|---|---|
| Settings non-secret | cache-aside/read-through | explicit remove khi update + TTL | read may be 5 min stale only if update path bust succeeds; current code does bust |
| Permissions | cache-aside by role/staff | explicit remove on permission change; short TTL fallback | **server always enforces**; client permission only UX |
| Catalog | version/generation cache + client snapshot | catalog version bump on product/mapping write | order pricing must server revalidate |
| Dashboard | materialized read model + cache | write event increments generation/version | allow stale visual value with “updated at” |
| Order detail | cache-aside versioned DTO | order write bumps order version | never accept cache as authorization |

Cache stampede: at expiry many executions can miss, all scan a sheet. CacheService has no atomic `SET NX` contract exposed for this use. Use a short `ScriptLock` only around recompute/put (not external fetch); alternatively serve stale value while a single refresher recomputes. Measure lock contention before adding this complexity.

### V8: what is and is not actionable

V8 fast properties/hidden classes, closures, GC, `Map`/`Set`, JSON serialization affect pure JavaScript microbenchmarks. They do **not** outweigh Spreadsheet RPC in normal MOPS paths. Apply: stable DTO shapes, avoid retaining huge closures/arrays, build `Map` for repeated lookup in a preloaded array, serialize only compact cache DTOs. Do not apply: V8 flag tuning, assumptions about warm globals, or Chrome microbenchmark milliseconds as GAS SLO.

---

## 5. Google Apps Script + Sheets service policy

### API decision matrix

| API | Cơ chế/bottleneck | Khi dùng | Tránh/điều kiện | GAS/MOPS |
|---|---|---|---|---|
| `getRange().getValues()` | service RPC, transfers rectangular cells into V8 | known bounded rectangle; bulk read | `getDataRange()` for a narrow read; repeated per-row calls | **Critical** |
| `getDisplayValues()` | formatted strings; conversion overhead and loses typed values | UI/export exactly displayed strings | domain IDs, amounts, dates, calculation | Medium |
| `getSheetValues()` | alternate bulk read API | benchmark only if code clarity benefits | no assumed speed advantage without MOPS evidence | Low |
| `setValues()` | one rectangular write RPC | insert/update contiguous block | shape must exactly match range | **Critical** |
| `appendRow()` | convenient append; likely service call per call | isolated low-rate ledger append | loops / multi-entity command if batch position known | High |
| `setBackgrounds()` | format RPC + potentially large format work | one rectangular UI/report format change | per-cell formatting loops; formulas/CF often preferable | Medium |
| `copyTo()` | server-side copy semantics | template/range copy where semantics fit | use it as presumed faster than setValues without test | Low |
| `flush()` | forces pending changes; can add synchronization latency | only before code needs immediate calculated/read-after-write result | end of every write or UI reflex | **Critical: normally avoid** |
| `getDataRange()` | extent includes used cells; wide/format-polluted sheets enlarge data | compact Settings-like sheet | large operational table | High |
| `getLastRow/Column()` | metadata service calls in loops | once, cache local variable | calling 2–3 times in one expression | High |
| `TextFinder` | server-side textual search | one-off admin lookup on bounded column | primary index for hot search; benchmark exact matching/options | Medium |
| Named ranges | semantic indirection | stable config/small report inputs | performance index or per-request resolver | Low |
| Sheets API `values.batchGet` / `batchUpdate` | HTTP API, batching many disjoint ranges/updates | truly disjoint multi-range work and payload is measured | automatic replacement for `SpreadsheetApp`; adds auth/payload/error complexity | Medium/High after benchmark |

**Official benchmark:** Best Practices publishes a sample where alternating individual background writes cost ~70 seconds and a batched approach ~1 second. Dataset is a 100×100 grid in Google’s sample. It proves round-trip batching direction; it does not quantify orders or current MOPS.

### Sheet scale policy [Architecture]

| Rows in an operational table | Allowed interaction pattern | Required evolution |
|---:|---|---|
| 100–1,000 | bounded full read can be acceptable after measure | request memo, batch writes |
| 1,000–5,000 | no per-keystroke/full-sheet read | client catalog snapshot; server Map/index for request |
| 5,000–10,000 | detail by key must avoid `findAll()` where possible | locator/index sheet or sharded recent/history query model |
| 10,000–50,000 | dashboard/search cannot scan raw ledger | projections, pagination/cursor, time partition |
| 50,000–100,000 | raw Sheet becomes append audit/archive | daily/monthly aggregates, active vs archive sheets |
| 100,000–200,000 | Sheets no longer adequate as primary interactive query store | move hot query/read model to database/search service; keep Sheet export/audit if desired |

This table is a design guardrail, **not a Google-published latency curve**. Cell count, column count, formulas, conditional formatting, protected ranges, filters, pivots, browser hardware and concurrent editors materially change results.

Formula policy: formulas, `QUERY`, lookup formulas, pivots, `IMPORTRANGE`, conditional formats and data sources belong to spreadsheet UX/reporting—not hot transaction tables. Prefer writing immutable raw facts and calculating aggregates in controlled projection jobs. A formula cell count can be much more relevant than row count.

---

## 6. Instrumentation and performance monitor

### 6.1 Required trace schema

Replace ad-hoc `Logger.log` as primary evidence with structured, sampled trace events. Existing `_perfStart/_perfMark/_perfReport` is a useful seed but only logs enabled requests and does not yield percentile/hit/lock data.

```javascript
// Architectural sketch; do not deploy unchanged.
// Never log password, token, address, phone, full payload, or vendor secret.
{
  trace_id: 'uuid', request_id: 'idempotency key or uuid', action: 'create_order',
  outcome: 'ok|error', started_at: 'ISO', total_ms: 0,
  phases: { auth_ms: 0, settings_ms: 0, catalog_ms: 0, sheet_read_ms: 0,
            sheet_write_ms: 0, lock_wait_ms: 0, external_ms: 0, serialize_ms: 0 },
  counters: { sheet_reads: 0, sheet_writes: 0, ranges_read: 0, cells_read: 0,
              cells_written: 0, cache_hit: 0, cache_miss: 0, retry: 0 },
  cache: { settings: 'hit', catalog: 'miss' },
  lock: { name: 'script', acquired: true, wait_ms: 0, held_ms: 0 },
  data: { order_items: 2, response_bytes: 1234 },
  error_code: null
}
```

**Logger:** `console.log(JSON.stringify(event))`/Cloud Logging for sampled errors and slow traces; `Logger.log` only for development transcript. Do not append one ActivityLogs sheet row per micro-event: that makes observability itself the hot write path. Aggregate into a `PerfRollup` sheet every 5–15 minutes, or export sampled structured logs to Cloud Logging/BigQuery if an attached Google Cloud project is approved.

### 6.2 Measurements by phase

| Phase | Server measure | Client measure | Decision it enables |
|---|---|---|---|
| browser interaction | — | `performance.mark`, INP/long task, DOM nodes | virtualize/debounce/skeleton |
| network/web-app | request total; correlation trace id | Resource Timing total/TTFB where exposed | distinguish client/network vs handler |
| auth/permission | `checkPermission` duration/cache state | no separate blocking fetch | cache scope/permission bootstrap |
| Sheets | around each repository bulk operation; rows/cols/cells | — | eliminate N+1/full scan |
| cache | hit/miss/put failure/value bytes/age | client cache hit/stale | TTL, invalidation, stampede |
| lock | wait/held/timeout/contention | duplicate-save rate | reduce critical section/shard state |
| UrlFetch | vendor name/status/duration/retry | pending async status | queue/backoff/circuit breaker |
| render | — | parse/render/interactive milestones | code split/virtual list |

### 6.3 Performance dashboard

Dashboard panels (rolling 1h/24h/7d, p50/p95/p99, count, error rate):

1. Action latency: `create_order`, `get_order`, `list_products`, `list_customers`, dashboard/report, search.
2. Phase waterfall p95: sheet read/write, cache, lock wait, external API.
3. Cache: hit ratio = hits/(hits+misses), eviction/deserialize/size failures, stale served.
4. Concurrency: active executions proxy, lock timeout rate, queue depth/oldest age/reclaim count.
5. Data growth: row/cell/column/formula/conditional-format counts per sheet, projection lag.
6. Reliability: quota-like errors, execution timeout, retry distribution, duplicate/idempotency replays.
7. UX: RUM page LCP/INP, modal open-to-data, save click-to-confirm, long-task count.

Alert examples: `create_order p95 >3s for 15m`, lock timeout >0, queue oldest >5m, catalog cache hit <70% after warm-up, dashboard projection lag >5m, any quota/execution-limit error.

---

## 7. Benchmark program (mandatory before optimization)

### Methodology

* Run in a **separate benchmark spreadsheet/script deployment**, same region/account class/settings as production; never pollute Orders or consume production quota.
* Dataset matrix: 100 / 1k / 5k / 10k / 50k / 100k / 200k rows; test narrow (2 cols), MOPS-width (18/40 cols), formula-light and formula-heavy separately.
* Each cell contains realistic typed values: ID string, date, numeric amount, text; record actual used range, formulas, conditional formats, sheet cell count.
* For each case: 5 warm-up runs discarded + >=30 samples; report median, p95, p99, min/max, failures, bytes/cells, timestamp, deployment ID. Cold runs are separate: idle >=15 min is an experiment—not a guaranteed cold definition.
* Load: logical clients at 1, 10, 100; GAS does not provide a supported in-process load generator. Use authenticated external runner/Cloud Run/k6 only after security approval. Record starts, concurrency, 429/5xx/timeout and lock waits. Do **not** attempt 1,000 concurrent production calls.
* Keep only one variable changed per comparison. A `Map` microbenchmark excludes Sheet I/O; a repository benchmark includes it. Label them differently.

### Required cases and acceptance decision

| Benchmark | Dataset / method | Compare | Metric | MOPS decision |
|---|---|---|---|---|
| Bulk append | 1/10/50 OrderItem-like rows | `appendRow` loop vs one `setValues`; optionally API batchUpdate | p50/p95, RPC count | use batch only if correctness/rollback preserved |
| Lookup | 1k–200k product/customer rows | linear `find`, JS `Map` after one preload, `TextFinder`, locator sheet | lookup ms incl preload vs warm | hot lookup gets index/read model, not raw scan |
| Cache | catalog/settings DTO realistic bytes | Sheet cold vs `_REQ` vs CacheService hit | hit latency, hit ratio, serialization bytes | cache only if hit ratio and invalidation justify |
| Properties | small config 1/10 keys | Properties direct vs request memo vs Cache | median/p95/quota cost | Properties only configuration/secret overlay |
| Global vs cache | 30 spaced requests | global accidental reuse vs CacheService | correctness + hit rate | never choose global for correctness |
| Queue | 1/10/50 jobs and mocked vendor | per-cell vs contiguous batch claim/finalize | lock held/wait, throughput | preserve claim protocol first |
| Read model | raw orders ledger vs daily projection | dashboard date range | p95/cells read/projection lag | dashboard must use projection once scan exceeds SLO |
| Browser list | 100/1k/10k result items | full DOM vs virtual list | INP/long tasks/DOM count | virtualize admin list beyond measured threshold |

**Benchmark result template**

| Field | Required value |
|---|---|
| Source / benchmark | official URL, MOPS harness commit, or external reproducible URL |
| Environment | spreadsheet ID alias, region/timezone, runtime V8, deployment, browser/load runner |
| Dataset | row×column, cells, formulas/CF/protection, payload bytes |
| Method | APIs, range coordinates, repetitions/warmups, concurrency |
| Result | p50/p95/p99, error count, cache hit ratio, quota observations |
| Applicability | GAS? MOPS path? why/why not |
| Decision | adopt/reject/defer plus rollback/consistency risk |

---

## 8. Concrete MOPS roadmap

### P0 — measure and protect correctness (Critical, 1–2 sprints)

| Initiative | MOPS-specific change | Risk / cost | Estimated improvement |
|---|---|---|---|
| Structured trace + RUM | extend existing perf marks into sampled trace/rollup; trace id returned to client; no PII | Low–Medium / M | No direct latency; makes p95/root cause measurable |
| Request I/O inventory | instrument Repository wrappers and direct sheet helpers: read/write count/cells/duration | Low / S | identifies actual largest win |
| Idempotency commands | client generates idempotency key for create/update/payment; durable command state keyed by request | Medium / M | prevents duplicate order during retry/optimistic UI |
| Lock policy test | quantify lock wait/hold and audit every mutation holding ScriptLock | Medium / S | avoids collapse under concurrency |
| Data inventory | record rows/cells/formulas/CF/protected ranges and active/archive split | Low / S | capacity trigger evidence |

### P1 — remove hot full scans and N+1 (High, 2–4 sprints)

| Domain | Current observed pattern | Concrete target design | Expected improvement / caveat |
|---|---|---|---|
| Create Order | catalog cached, but customer/order/repository scans and full `InventoryMovements` read for average cost | `CatalogSnapshot` versioned; `CustomerByPhone` locator; `ProductVariantBalance/Cost` projection updated atomically with movement command | Removes history-proportional read from create path. Exact gain **measure**. Projection must rebuild/audit. |
| Order detail/list | `findById → findAll` patterns | `OrderLocator` (order id → sheet/row/version) + `OrderSummary` read DTO; items fetched only for opened detail | bounded cells per request; locator writes need lock/idempotency |
| Product | product list is public and catalog can exceed CacheService 100 KB | versioned compact public catalog chunks/page; client IndexedDB snapshot; server pricing authoritative | low perceived latency; never trust client price |
| Customer | full table scan for phone/id/list | normalized phone locator, `CustomerSummary`, server pagination/cursor | enables fast lookup at growth; GDPR/PII access gates remain server-side |
| Inventory | raw movement scans / mutable quantity update | append movement + transaction-outbox; projection per product/variant/branch; reconcile job | high impact; requires invariant/rebuild tooling |
| Dashboard/finance/analytics | multiple raw sheet scans/joins; analytics cache only 90–300s | daily/branch/status aggregate sheets; incremental projection job; dashboard reads precomputed range | largest dashboard gain; show `as_of` and lag |
| Search | do not send every keystroke to GAS | normalized tokens in local index; debounce 150–250 ms; cancel stale request; server paginated fallback | interaction improvement, not just server latency |

### P2 — command/queue/read model maturity (Medium–High, 2–6 sprints)

* **Unit of Work Lite:** a command writes a durable `Command/Outbox` record with `PENDING → APPLIED/FAILED`; core state is committed first, side effects (Sapo, Telegram, analytics) process asynchronously and idempotently. A Sheets command is not ACID across sheets.
* **Projection worker:** process bounded event batches, checkpoint watermark, mark projection version; provide rebuild-from-ledger and compare/reconcile reports.
* **Active/archive partition:** active operational data and immutable historical data separated by time, while locator abstracts location. Do not scatter date routing across service layer.
* **Sheets API evaluation:** only benchmark for a real multi-range write/read path; implement exponential backoff with jitter and request idempotency. Do not mix APIs without a single ownership/consistency convention.

### P3 — UX/client architecture (High, parallel)

1. Bootstrap minimal user/permission/menu/settings version once after login; do not fetch all tabs.
2. Route-level code splitting, skeletons with stable layout, lazy tab content, prefetch likely next tab after idle.
3. Optimistic edits with pending badge and rollback/reconcile on authoritative response. Disable duplicate submit using idempotency key—not only button state.
4. Virtualize tables; pagination/cursor for server data. Infinite scroll only with bounded retained rows.
5. Keep normalized in-memory entity store; IndexedDB for catalog/customer-summary snapshots with schema+catalog version. `localStorage` only tiny non-sensitive UI state; never token/permission authority or confidential ERP data.
6. Use `AbortController`/request sequence to ignore stale search response; debounce typing, throttle scroll/resize.
7. Measure long tasks and forced reflow; batch DOM changes and avoid read/write layout alternation.

---

## 9. Capacity, concurrency, quota and failure model

### Load tiers

| Tier | Main risk | Required behavior |
|---|---|---|
| 1 user | cold start, first cache miss | prefetch/bootstrap; measure cold separately |
| 10 users | cache miss burst, duplicate submit | idempotency; short locks; request cache |
| 100 users | ScriptLock contention, concurrent execution/quota, raw scans | projections/cache, queue, bounded pagination |
| 1,000 users | GAS/Sheets web app is likely no longer the sole interactive backend | capacity test first; split API/query store and use managed backend if SLO cannot be met |

Apps Script quota page currently documents execution/concurrency limits (including per-user and per-script concurrent execution limits) and max execution time; these are account/type dependent and subject to change. Build an automated pre-release quota review from the live official page; never hard-code a copied quota as a permanent architecture constant.

**Race rules**

* Lock only the smallest mutation critical section: ID/locator allocation, state compare-and-set, projection cursor claim.
* Use `tryLock` for best-effort periodic jobs; return/retry rather than queue workers waiting behind long locks.
* Never call vendor APIs while lock held.
* Every external action needs a deterministic idempotency key (`orderId:event:version`) and durable status; timeout does not prove vendor did not receive it.
* Queue retry uses bounded exponential backoff + jitter; classify permanent 4xx separately; dead-letter keeps evidence and supports replay.
* Cache invalidation failure must degrade to version/TTL + server authoritative validation, not silently corrupt orders.

---

## 10. What not to optimize first

| Temptation | Why rejected/deferred |
|---|---|
| Replace every `forEach` with `for` / hidden-class tuning | V8 micro-cost is normally dwarfed by Sheets RPC and full scans. Benchmark only pure compute after I/O is bounded. |
| Keep-warm as a performance guarantee | Existing `keepWarm()` is best effort; Google gives no context-lifetime guarantee. It may help a measured workload but must not be SLO dependency. |
| Make CacheService the database | eviction may happen before TTL; item/size limits; no transaction/query/index semantics. |
| `flush()` after every write | forces synchronization and often extends critical path; only use for required read-after-write/formula semantics. |
| Cache permission result only client-side | it is an UX hint, not authorization; server `checkPermission` remains source of enforcement. |
| One giant response to eliminate calls | hits CacheService/response/browser parse/memory limits; use compact DTO, chunks and prefetch evidence. |
| Raw formula dashboard | unpredictable recalculation and scan cost under data growth; materialize aggregates. |
| Benchmark from editor only | editor/manual runs do not represent deployed web-app auth, browser network, concurrency or cold behavior. |

---

## 11. Release gate / definition of done for any optimization

1. Has a trace/benchmark baseline and exact action/data path.
2. Preserves authorization, idempotency, audit trail and financial/inventory invariants.
3. Includes cache key, owner, TTL, invalidation/version, max serialized size, hit-ratio target and cold-miss behavior.
4. Includes concurrency behavior: lock scope, timeout, retry, duplicate event behavior, rollback/reconciliation.
5. Measured p50/p95/p99 on benchmark deployment at relevant dataset and load; includes cold/warm and cache hit/miss.
6. Has alert/dashboard and rollback path; no broad refactor without a measured bottleneck.
7. Diff is localized; generated/minified/frontend vendor assets untouched unless explicitly in scope.

---

## Appendix A — Current-source hotspots to validate

These are **research candidates**, not commands to rewrite:

* `mops_02.js:createOrder` already marks phases and batches order items; measure `upsertCustomer`, branch/bank lookup, ID generation, movement scan, append/format sequence before changing it.
* `mops_00.js:getSettings` has `_REQ` + ScriptCache, but `PropertiesService.getScriptProperties()` overlay is still request work; measure cache hit/miss and properties cost rather than moving secrets into cache.
* `mops_03.js:Repository.*.findAll` is a common full-sheet materialization path; introduce bounded read/index APIs before changing every caller.
* `mops_05.js` reports and `mops_04.js:getAnalytics` are intentionally multi-sheet scans; their correct replacement is a projection, not a cleverer loop.
* `mops_01.js:processBackgroundQueue` correctly avoids vendor fetch under lock; optimize claim/finalize writes only after queue throughput/lock metrics exist.
* Source-wide static count (2026-08-07) found many direct Sheet service calls across six large files; this count is a code smell inventory only, not a latency measurement.

## Appendix B — Research gaps requiring controlled benchmark

No authoritative GAS benchmark was found for: `getValues` vs `getSheetValues`, `appendRow` vs `setValues` versus Sheets API for MOPS rows, TextFinder versus locator index, named range speed, formulas at exact row counts, V8 global reuse/cold-start timing, CacheService hit latency, or PropertiesService read latency. These must remain `[Measure]` until the benchmark program records them.
