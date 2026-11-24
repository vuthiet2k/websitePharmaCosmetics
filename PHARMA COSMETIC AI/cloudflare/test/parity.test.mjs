// Chạy: node test/parity.test.mjs  (không cần cài gì — Node ≥ 20). So kết quả Worker với bản Python và kiểm hành vi API.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AI_DIR = path.resolve(HERE, "..", "..");
const PUBLIC = path.resolve(HERE, "..", "public");

const worker = (await import("../src/index.js")).default;
const { fold, tokenize, maskPii, complianceOk } = await import("../src/index.js");

// ASSETS giả: đọc file trong public/ như Cloudflare sẽ làm
const ASSETS = {
  async fetch(req) {
    try {
      const file = await readFile(path.join(PUBLIC, new URL(req.url).pathname));
      return new Response(file, { headers: { "Content-Type": "application/json" } });
    } catch { return new Response("not found", { status: 404 }); }
  },
};
const ENV = { ASSETS, ALLOWED_ORIGINS: "https://pharmacosmetics-vn.com", RATE_LIMIT_PER_MIN: "5", MAX_CHARS: "500" };

let ipSeq = 0;
function call(pathname, { method = "GET", body, origin, ip, env = ENV } = {}) {
  const headers = { "CF-Connecting-IP": ip || `10.0.0.${++ipSeq}` };
  if (origin) headers.Origin = origin;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return worker.fetch(new Request("https://ai.example.workers.dev" + pathname, {
    method, headers, body: body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body)),
  }), env);
}
const chat = (text, opts = {}) => call("/api/v1/chat", { method: "POST", body: { messages: [{ role: "user", content: text }] }, ...opts });
const chatMsgs = (messages, opts = {}) => call("/api/v1/chat", { method: "POST", body: { messages }, ...opts });

let passed = 0;
async function t(name, fn) { await fn(); passed++; console.log("  ok  " + name); }

// ---- Song song với Python ----
const QUERIES = ["kem trị mụn", "kem tri mun", "serum cho da nám tàn nhang", "retinol", "kem chống nắng cho da dầu",
  "da nhạy cảm sau điều trị", "hyaluronic acid cấp ẩm", "địa chỉ phòng trị liệu ở đâu", "giờ mở cửa", "tazarotene",
  "obagi", "niacinamide", "sẹo rỗ", "xin chào", "abcxyz không có từ này", "mụn ẩn mụn cám theo chu kỳ"];
const py = spawnSync("python", ["-X", "utf8", "-c", `
import json, sys
sys.path.insert(0, ${JSON.stringify(AI_DIR)})
from app.hybrid_rag import LocalHybridRAG
r = LocalHybridRAG(sys.argv[2])
qs = json.loads(sys.argv[1])
print(json.dumps({q: {"p": [(d["title"], d["score"]) for d in r.search(q, 3, "Sản phẩm")], "a": [(d["title"], d["score"]) for d in r.search(q, 2, "Bài viết")]} for q in qs}, ensure_ascii=False))
`, JSON.stringify(QUERIES), path.join(AI_DIR, "data", "knowledge_base.json")], { encoding: "utf-8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
assert.equal(py.status, 0, "Python lỗi: " + py.stderr);
const expected = JSON.parse(py.stdout);

console.log("So khớp với bản Python:");
const { search } = await import("../src/index.js");
for (const q of QUERIES) {
  await t(`khớp «${q}»`, async () => {
    const req = new Request("https://ai.example.workers.dev/");
    const p = await search(ENV, req, q, 3, 2), a = await search(ENV, req, q, 2, 1);
    // so điểm (không so thứ tự tên khi điểm bằng nhau — Python sắp xếp ổn định theo thứ tự chèn)
    assert.deepEqual(p.map((x) => x.score), expected[q].p.map((x) => x[1]), "điểm sản phẩm");
    assert.deepEqual(a.map((x) => x.score), expected[q].a.map((x) => x[1]), "điểm bài viết");
    const rank = (arr) => arr.map((x) => `${x.score}|${x.title}`);
    const pyP = expected[q].p.map((x) => `${x[1]}|${x[0]}`), pyA = expected[q].a.map((x) => `${x[1]}|${x[0]}`);
    assert.deepEqual([...rank(p)].sort(), [...pyP].sort(), "sản phẩm");
    assert.deepEqual([...rank(a)].sort(), [...pyA].sort(), "bài viết");
  });
}

console.log("Hành vi API:");
await t("chuẩn hoá tiếng Việt", () => {
  assert.equal(fold("Mụn ẩn, Đẹp"), "mun an, dep");
  assert.deepEqual(tokenize("Mụn,"), tokenize("mun"));
});
await t("không phân biệt dấu", async () => {
  const a = await (await chat("kem tri mun")).json(), b = await (await chat("kem trị mụn")).json();
  assert.ok(a.related_products.length && JSON.stringify(a.related_products) === JSON.stringify(b.related_products));
});
await t("đường dẫn thật", async () => {
  const r = await (await chat("serum cho da nám tàn nhang")).json();
  assert.ok(r.related_products.every((p) => p.url.startsWith("/products/")));
  assert.ok(r.related_articles.every((x) => x.url.startsWith("/blogs/")));
});
await t("thông tin cửa hàng thật", async () => {
  const r = await (await chat("địa chỉ phòng trị liệu ở đâu")).json();
  assert.equal(r.store_info.address, "Số 44 Ngõ 897 Giải Phóng, Hoàng Mai, Hà Nội");
  assert.ok(r.reply.includes("6h30"));
});
await t("câu hỏi chỉ về cửa hàng không kèm SP/bài viết; câu hỏi lẫn sản phẩm vẫn kèm", async () => {
  const only = await (await chat("giờ mở cửa và địa chỉ ở đâu")).json();
  assert.equal(only.related_products.length, 0); assert.equal(only.related_articles.length, 0);
  assert.ok(only.store_info && only.reply.includes("6h30"));
  const mixed = await (await chat("địa chỉ mua kem trị mụn")).json();
  assert.ok(mixed.related_products.length > 0);
});
await t("ý định: chào / làm được gì / soi da / đặt lịch ⇒ hướng dẫn, không kèm sản phẩm", async () => {
  for (const q of ["bạn có thể làm những gì", "xin chào", "tư vấn giúp mình"]) { // 24/11/2026 AC-03.2(b): «cảm ơn nhé» chuyển sang ý định thanks (kiểm ở khối kịch bản)
    const r = await (await chat(q)).json();
    assert.equal(r.related_products.length, 0, q); assert.equal(r.related_articles.length, 0, q);
    assert.ok(r.reply.includes("Em có thể giúp bạn"), q);
  }
  const skin = await (await chat("soi da giúp mình")).json();
  assert.ok(skin.reply.includes("dấu **+**") && skin.reply.includes("tab=quiz") && skin.related_products.length === 0);
  const book = await (await chat("đặt lịch với chuyên gia")).json();
  assert.ok(book.store_info && book.reply.includes("Đặt lịch") && book.related_products.length === 0);
  const real = await (await chat("mụn ẩn")).json();
  assert.ok(real.related_products.length > 0 && !real.reply.includes("Em có thể giúp bạn"));
});
await t("24/11 cảnh báo đỏ (thai kỳ / kích ứng cấp) ⇒ không SP, chuyển Chuyên gia + hotline", async () => {
  for (const q of ["tôi đang mang thai dùng retinol được không", "đang cho con bú dùng serum vitamin c được không",
    "bôi kem xong mặt sưng đỏ rát", "dùng xong bị nổi mề đay, khó thở"]) {
    const r = await (await chat(q)).json();
    assert.equal(r.related_products.length + r.related_articles.length, 0, q);
    assert.ok(r.needs_contact === true && r.store_info, q);
    assert.ok(r.reply.includes("cơ sở y tế") && r.reply.includes("Chuyên gia"), q);
  }
});
await t("24/11 FAQ giao hàng/thanh toán/đổi trả/chính hãng ⇒ hotline, không SP lạc đề", async () => {
  for (const q of ["shop có giao hàng không", "thanh toán thế nào", "có ship COD không ạ", "đổi trả thế nào",
    "hàng có chính hãng không", "còn hàng không shop"]) {
    const r = await (await chat(q)).json();
    assert.equal(r.related_products.length + r.related_articles.length, 0, q);
    assert.ok(r.needs_contact === true && r.store_info.phone && r.reply.includes("Chính sách"), q);
  }
  const mixed = await (await chat("serum vitamin c có chính hãng không")).json();
  assert.ok(mixed.related_products.length > 0 && mixed.needs_contact === true);
});
await t("24/11 tán gẫu / chỉ gửi SĐT ⇒ hướng dẫn, không SP", async () => {
  for (const q of ["chào shop, mình mới vào", "hôm nay trời đẹp quá"]) {
    const r = await (await chat(q)).json();
    assert.equal(r.related_products.length + r.related_articles.length, 0, q);
    assert.ok(r.reply.includes("Em có thể giúp bạn"), q);
  }
  // 24/11/2026 AC-03.2(a): chỉ gửi SĐT ⇒ báo đã ẩn số + hotline/Zalo, không còn ra menu
  const ph = await (await chat("0967194063")).json();
  assert.ok(ph.intent === "callback" && ph.reply.includes("đã ẩn") && !ph.reply.includes("0967194063") && ph.needs_contact === true);
  assert.equal(ph.related_products.length, 0);
  const th = await (await chat("cảm ơn nhé")).json();
  assert.ok(th.intent === "thanks" && !th.reply.includes("Em có thể giúp bạn"));
});
await t("24/11 nhãn [SĐT đã ẩn] không lọt vào tìm kiếm", async () => {
  const a = await (await chat("tư vấn retinol, sđt 0967194063")).json();
  const b = await (await chat("tư vấn retinol")).json();
  assert.deepEqual(a.related_products, b.related_products);
  assert.ok(!a.reply.includes("0967194063"));
});
await t("24/11 ngưỡng liên quan: tiêu đề phải chứa từ khoá thật", async () => {
  for (const q of ["da tôi bị mụn ẩn", "retinol", "kem chống nắng cho da dầu", "lỗ chân lông to", "dầu gội trị gàu"]) {
    assert.ok((await (await chat(q)).json()).related_products.length > 0, q);
  }
  const none = await (await chat("abcxyz không có từ này")).json();
  assert.ok(none.related_products.length === 0 && none.needs_contact === true);
});
// ---- 24/11/2026 SPEC-AI-CHAT-TONE-01: kịch bản dùng chung với tests/test_app.py + file vàng sinh từ bản Python ----
const SCEN = JSON.parse(await readFile(path.join(AI_DIR, "tests", "scenarios.json"), "utf-8")).scenarios;
const GOLDEN = JSON.parse(await readFile(path.join(AI_DIR, "tests", "golden_replies.json"), "utf-8"));
const INTENTS = ["red", "claim", "book", "skin", "callback", "faq", "price", "store", "bye", "thanks", "ack", "greet", "help", "vent", "product", "nomatch", "blocked"];
const DISCLAIMER = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn trực tiếp từ Chuyên gia.";
const DISCLAIMER_INTENTS = ["red", "skin", "claim", "nomatch", "blocked"];
const MONEY_RE = /\d[\d.,]*\s*(đ|₫|k|vnđ|nghìn|triệu)/i;
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const PRIOR_ASSISTANT = "Dạ em chào bạn ạ. Em là trợ lý tra cứu của Pharma Cosmetics.\n\nEm có thể giúp bạn:\n- ...";
const scenarioMessages = (d) => [...(d.hist ? [{ role: "user", content: "xin chào" }, { role: "assistant", content: PRIOR_ASSISTANT }] : []), { role: "user", content: d.q }];
const goldenView = (r) => ({ reply: r.reply, intent: r.intent, related_products: r.related_products, related_articles: r.related_articles,
  needs_contact: r.needs_contact, store_info: !!r.store_info });

await t("24/11 kịch bản: ≥46 dòng, mọi luật chung (Dạ, em-bạn, không emoji/số tiền/Bác sĩ, miễn trừ đúng chỗ)", async () => {
  assert.ok(SCEN.length >= 46 && new Set(SCEN.map((d) => d.id)).size === SCEN.length);
  const results = {};
  for (const d of SCEN) {
    const resp = await chatMsgs(scenarioMessages(d));
    assert.equal(resp.status, 200, d.id);
    const r = await resp.json();
    results[d.id] = r;
    assert.ok(INTENTS.includes(r.intent) && r.intent === d.intent, `${d.id} intent=${r.intent}`);
    assert.equal(r.related_products.length > 0, d.products, d.id);
    assert.equal(r.needs_contact, d.needs_contact, d.id);
    assert.equal(!!r.store_info, d.store_info, d.id);
    for (const m of d.must) assert.ok(r.reply.includes(m), `${d.id} thiếu «${m}»`);
    for (const m of d.must_not) assert.ok(!r.reply.includes(m), `${d.id} không được chứa «${m}»`);
    assert.ok(r.reply.startsWith("Dạ"), d.id);
    assert.ok(!/\b(anh\/chị|quý khách)\b/i.test(r.reply), d.id);
    // ©/®/™ có trong tên SP thật (vd «C-ESTA®») và cũng thuộc Extended_Pictographic ⇒ bỏ ra trước khi dò emoji
    assert.ok(!EMOJI_RE.test(r.reply.replace(/[©®™]/g, "")) && !MONEY_RE.test(r.reply), d.id);
    assert.ok(!r.reply.toLowerCase().includes("bác sĩ"), d.id);
    for (const p of r.related_products) assert.ok(p.url.startsWith("/products/") && !p.title.toLowerCase().includes("kê đơn"), d.id);
    for (const a of r.related_articles) assert.ok(a.url.startsWith("/blogs/"), d.id);
    assert.equal(r.reply.includes(DISCLAIMER), r.related_products.length + r.related_articles.length > 0 || DISCLAIMER_INTENTS.includes(r.intent), d.id);
    if (["bye", "thanks", "ack"].includes(r.intent)) {
      assert.ok(!r.reply.includes("Em có thể giúp bạn") && r.reply.length <= { bye: 160, thanks: 160, ack: 120 }[r.intent], d.id);
    }
    if (["callback", "claim", "red"].includes(r.intent)) assert.equal(r.related_products.length + r.related_articles.length, 0, d.id);
  }
  for (const d of SCEN) if (d.same_products_as) assert.deepEqual(results[d.id].related_products, results[d.same_products_as].related_products, d.id);
});
await t("24/11 file vàng: Worker == Python từng ký tự (reply, intent, SP, bài viết, needs_contact, store_info)", async () => {
  assert.deepEqual(Object.keys(GOLDEN).sort(), SCEN.map((d) => d.id).sort());
  for (const d of SCEN) {
    const r = await (await chatMsgs(scenarioMessages(d))).json();
    assert.deepEqual(goldenView(r), GOLDEN[d.id], d.id);
  }
});
await t("24/11 không bao giờ gợi ý SP «kê đơn»", async () => {
  for (const q of ["mụn trứng cá nặng dùng thuốc gì", "isotretinoin", "accufine", "trị mụn nặng"]) {
    const r = await (await chat(q)).json();
    assert.ok(r.related_products.every((p) => !p.title.toLowerCase().includes("kê đơn")), q);
  }
});
await t("24/11 chào lần 2 trong phiên không lặp menu; tin cũ của khách không vào tìm kiếm", async () => {
  const first = await (await chat("xin chào")).json();
  assert.ok(first.reply.includes("Em có thể giúp bạn"));
  const again = await (await chatMsgs([{ role: "user", content: "xin chào" }, { role: "assistant", content: first.reply }, { role: "user", content: "xin chào" }])).json();
  assert.ok(again.intent === "greet" && !again.reply.includes("Em có thể giúp bạn"));
  const ok = await (await chatMsgs([{ role: "user", content: "retinol" }, { role: "assistant", content: "Dạ, em tìm được..." }, { role: "user", content: "ok" }])).json();
  assert.ok(ok.intent === "ack" && ok.related_products.length === 0);
});
await t("không bịa giá", async () => {
  const r = await (await chat("giá retinol bao nhiêu")).json();
  assert.ok(!r.reply.includes("123456") && !r.reply.includes("650000"));
});
await t("che thông tin cá nhân", () => {
  assert.ok(!maskPii("sdt 0967194063 mail a@b.com").includes("0967194063"));
  assert.ok(!maskPii("mail a@b.com").includes("a@b.com"));
  assert.ok(!maskPii("gọi 0967.194.063").includes("0967.194.063"));
  assert.ok(maskPii("giá 1850000 đồng").includes("1850000"));
});
await t("kiểm tra phát ngôn theo ranh giới từ", () => {
  assert.equal(complianceOk("mai chăm sóc da"), true);
  assert.equal(complianceOk("AI chăm sóc da cho bạn"), false);
  assert.equal(complianceOk("Cam kết khỏi 100% mụn"), false);
});
await t("giới hạn đầu vào", async () => {
  assert.equal((await call("/api/v1/chat", { method: "POST", body: { messages: [] } })).status, 400);
  assert.equal((await chat("x".repeat(501))).status, 400);
  assert.equal((await call("/api/v1/chat", { method: "POST", body: { messages: [{ role: "system", content: "hi" }] } })).status, 422);
  assert.equal((await call("/api/v1/chat", { method: "POST", body: "không phải json" })).status, 422);
  assert.equal((await call("/api/v1/chat", { method: "POST", body: { messages: [{ role: "assistant", content: "hi" }] } })).status, 400);
});
await t("giới hạn tần suất theo IP", async () => {
  const ip = "203.0.113.9";
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await chat("mụn", { ip })).status);
  assert.deepEqual(codes.slice(0, 5), [200, 200, 200, 200, 200]);
  assert.ok(codes.slice(5).includes(429));
  assert.equal((await chat("mụn", { ip: "203.0.113.10" })).status, 200); // IP khác không bị ảnh hưởng
});
await t("CORS chỉ cho domain khai báo", async () => {
  const ok = await call("/", { origin: "https://pharmacosmetics-vn.com" });
  const bad = await call("/", { origin: "https://evil.example" });
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://pharmacosmetics-vn.com");
  assert.equal(bad.headers.get("access-control-allow-origin"), null);
  const pre = await call("/api/v1/chat", { method: "OPTIONS", origin: "https://pharmacosmetics-vn.com" });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-headers"), "Content-Type");
});
await t("ALLOWED_ORIGINS trống ⇒ chặn mọi domain", async () => {
  const r = await call("/", { origin: "https://pharmacosmetics-vn.com", env: { ASSETS, ALLOWED_ORIGINS: "" } });
  assert.equal(r.headers.get("access-control-allow-origin"), null);
});
await t("/ , /healthz, 404, 405", async () => {
  assert.equal((await (await call("/")).json()).status, "online");
  const h = await (await call("/healthz")).json();
  assert.ok(h.ok && h.documents > 5000 && h.store === true);
  assert.equal((await call("/docs")).status, 404);
  assert.equal((await call("/idx/meta.json")).status, 404); // chỉ mục không công khai trực tiếp
  assert.equal((await call("/api/v1/chat")).status, 405);
});

console.log(`\n${passed} kiểm tra đạt.`);
