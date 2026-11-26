// Chạy: node test/llm.test.mjs — kiểm tầng LLM (Workers AI) bằng env.AI GIẢ, không gọi mạng, không tốn Neuron.
// 24/11/2026 SPEC-AI-LLM-01: LLM chỉ chọn SP + viết lời dẫn cho câu tư vấn; mọi lỗi ⇒ y hệt bản tĩnh.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(HERE, "..", "public");
const worker = (await import("../src/index.js")).default;
const { resetLlm, leadOk, outputText } = await import("../src/llm.js");
const { complianceOk } = await import("../src/index.js");

const ASSETS = {
  async fetch(req) {
    try {
      return new Response(await readFile(path.join(PUBLIC, new URL(req.url).pathname)), { headers: { "Content-Type": "application/json" } });
    } catch { return new Response("not found", { status: 404 }); }
  },
};
const BASE = { ASSETS, ALLOWED_ORIGINS: "https://pharmacosmetics-vn.com", RATE_LIMIT_PER_MIN: "1000", MAX_CHARS: "500" };

// AI giả: ghi lại mọi lượt gọi; handler(model, opts) trả kết quả
function fakeAI(handler) {
  const calls = [];
  return { calls, run: async (model, opts) => { calls.push({ model, opts }); return handler(model, opts, calls.length); } };
}
const isRewrite = (opts) => opts.messages[0].content.includes("chuẩn hoá câu tìm kiếm");

let ip = 0;
async function ask(text, env) {
  const res = await worker.fetch(new Request("https://ai.example.workers.dev/api/v1/chat", {
    method: "POST", headers: { "Content-Type": "application/json", "CF-Connecting-IP": `10.9.0.${++ip}` },
    body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
  }), env);
  return { body: await res.json(), source: res.headers.get("X-Answer-Source") };
}

let passed = 0;
async function t(name, fn) { resetLlm(); await fn(); passed++; console.log("  ok  " + name); }

const LEAD = "Dạ, với da dầu bạn nên ưu tiên kết cấu mỏng nhẹ, kiềm dầu và thoa lại sau vài giờ khi ra nắng ạ.";
const Q = "kem chống nắng cho da dầu";
const baseline = (await ask(Q, BASE)).body; // bản tĩnh (không có env.AI)

console.log("Tầng LLM (Workers AI giả):");
await t("không bật AI_LLM ⇒ không gọi AI, y hệt bản tĩnh", async () => {
  const AI = fakeAI(() => ({ response: "{}" }));
  const r = await ask(Q, { ...BASE, AI });
  assert.equal(AI.calls.length, 0);
  assert.deepEqual(r.body, baseline);
  assert.equal(r.source, "static");
});

await t("LLM chọn SP + lời dẫn hợp lệ ⇒ dùng lời dẫn, SP theo thứ tự LLM chọn (chỉ trong ứng viên)", async () => {
  const AI = fakeAI(() => ({ response: JSON.stringify({ chon: [2, 1], loi: LEAD }) }));
  const r = await ask(Q, { ...BASE, AI, AI_LLM: "on" });
  assert.equal(AI.calls.length, 1);
  assert.equal(AI.calls[0].model, "@cf/google/gemma-4-26b-a4b-it");
  assert.ok("max_completion_tokens" in AI.calls[0].opts && !("max_tokens" in AI.calls[0].opts));
  assert.equal(r.source, "llm");
  assert.equal(r.body.intent, "product");
  assert.ok(r.body.reply.startsWith(LEAD));
  assert.equal(r.body.related_products.length, 2);
  assert.deepEqual(r.body.related_products[1], baseline.related_products[0]);
  assert.ok(r.body.reply.includes("Thông tin chỉ mang tính tham khảo"));
  for (const p of r.body.related_products) assert.ok(p.url.startsWith("/products/"));
});

await t("lời dẫn vi phạm (giá/con số, bác sĩ, claim, emoji, tiếng Anh) ⇒ dùng câu tĩnh", async () => {
  for (const bad of ["Dạ, kem này giá 200k rất rẻ ạ.", "Dạ, bác sĩ khuyên dùng loại này ạ.", "Dạ, dùng là chữa khỏi dứt điểm ạ.",
    "Dạ, bạn dùng thử nhé 😊 rất hợp ạ.", "Sure, here are some sunscreens for oily skin.", "Dạ, **in đậm** ạ, rất hợp da dầu."]) {
    resetLlm();
    const AI = fakeAI(() => ({ response: JSON.stringify({ chon: [1], loi: bad }) }));
    const r = await ask(Q, { ...BASE, AI, AI_LLM: "on" });
    assert.ok(r.body.reply.startsWith("Dạ, em tìm được vài gợi ý"), bad);
    assert.ok(!r.body.reply.includes(bad), bad);
  }
});

await t("JSON hỏng / số thứ tự lạ ⇒ y hệt bản tĩnh", async () => {
  for (const out of ["không phải json", JSON.stringify({ chon: [9], loi: LEAD }), JSON.stringify({ chon: "1", loi: LEAD })]) {
    resetLlm();
    const AI = fakeAI(() => ({ response: out }));
    const r = await ask(Q, { ...BASE, AI, AI_LLM: "on" });
    assert.deepEqual(r.body, baseline, out);
    assert.equal(r.source, "static");
  }
});

await t("hết 10.000 Neurons ⇒ bản tĩnh, cầu dao tắt AI tới 00:00 UTC (lượt sau không gọi nữa)", async () => {
  const AI = fakeAI(() => { throw new Error("3036: You have used up your daily free allocation of 10,000 neurons"); });
  const env = { ...BASE, AI, AI_LLM: "on" };
  const r1 = await ask(Q, env);
  assert.deepEqual(r1.body, baseline);
  const r2 = await ask(Q, env);
  assert.deepEqual(r2.body, baseline);
  assert.equal(AI.calls.length, 1);
});

await t("quá thời gian chờ ⇒ bản tĩnh", async () => {
  const AI = fakeAI(() => new Promise(() => {}));
  const r = await ask(Q, { ...BASE, AI, AI_LLM: "on", AI_TIMEOUT_MS: "50" });
  assert.deepEqual(r.body, baseline);
});

await t("cảnh báo đỏ, FAQ, cửa hàng, chào hỏi, cảm ơn… KHÔNG bao giờ gọi AI (0 Neuron)", async () => {
  const AI = fakeAI(() => ({ response: JSON.stringify({ chon: [1], loi: LEAD }) }));
  const env = { ...BASE, AI, AI_LLM: "on" };
  for (const q of ["rát đỏ", "đang mang thai dùng retinol được không", "có giao hàng tỉnh không", "mấy giờ mở cửa", "xin chào",
    "cảm ơn nhé", "tạm biệt", "bao nhiêu tiền", "mụn trứng cá nặng có chữa khỏi không", "sđt của em 0912345678 gọi lại tư vấn nhé"]) {
    await ask(q, env);
  }
  assert.equal(AI.calls.length, 0);
});

await t("không gửi SĐT/email cho AI", async () => {
  const AI = fakeAI(() => ({ response: JSON.stringify({ chon: [1], loi: LEAD }) }));
  await ask("em 0912345678 mail a@b.com hỏi kem chống nắng cho da dầu", { ...BASE, AI, AI_LLM: "on" });
  assert.equal(AI.calls.length, 1);
  const sent = JSON.stringify(AI.calls[0].opts.messages);
  assert.ok(!sent.includes("0912345678") && !sent.includes("a@b.com") && !sent.includes("đã ẩn"));
});

await t("BM25 trượt ⇒ LLM chuẩn hoá câu (3B) rồi tìm lại, sau đó chọn SP (8B)", async () => {
  const AI = fakeAI((model, opts) => isRewrite(opts) ? { response: "kem chống nắng da dầu" } : { response: JSON.stringify({ chon: [1, 2], loi: LEAD }) });
  const r = await ask("zxqv wptk", { ...BASE, AI, AI_LLM: "on" });
  assert.equal(AI.calls.length, 2);
  assert.equal(AI.calls[0].model, "@cf/meta/llama-3.2-3b-instruct");
  assert.equal(r.source, "llm-rewrite");
  assert.equal(r.body.intent, "product");
  assert.equal(r.body.related_products.length, 2);
});

await t("câu chuẩn hoá lộ dấu hiệu đỏ ⇒ cảnh báo đỏ, không SP", async () => {
  const AI = fakeAI(() => ({ response: "da bị rát đỏ" }));
  const r = await ask("zxqv wptk", { ...BASE, AI, AI_LLM: "on" });
  assert.equal(r.body.intent, "red");
  assert.equal(r.body.related_products.length, 0);
  assert.equal(r.body.needs_contact, true);
  assert.ok(r.body.store_info);
});

await t("LLM chuẩn hoá trả KHONG / rác ⇒ giữ «chưa tìm thấy»", async () => {
  for (const out of ["KHONG", "<script>", ""]) {
    resetLlm();
    const AI = fakeAI(() => ({ response: out }));
    const r = await ask("zxqv wptk", { ...BASE, AI, AI_LLM: "on" });
    assert.equal(r.body.intent, "nomatch", out);
    assert.equal(AI.calls.length, 1, out);
  }
});

await t("LLM bảo không SP nào hợp ⇒ không ép hiện SP lạc đề", async () => {
  const AI = fakeAI(() => ({ response: JSON.stringify({ chon: [], loi: LEAD }) }));
  const r = await ask(Q, { ...BASE, AI, AI_LLM: "on" });
  assert.equal(r.body.related_products.length, 0);
  assert.ok(!r.body.reply.includes(LEAD));
  assert.ok(r.body.reply.startsWith("Dạ"));
});

await t("Gemma 4 trả kiểu OpenAI (choices) ⇒ đọc được; dạng lạ ⇒ tính là lỗi, cầu dao ngắt", async () => {
  const AI = fakeAI(() => ({ choices: [{ message: { content: JSON.stringify({ chon: [1], loi: LEAD }) } }] }));
  const r = await ask(Q, { ...BASE, AI, AI_LLM: "on" });
  assert.equal(r.source, "llm");
  assert.ok(r.body.reply.startsWith(LEAD));
  resetLlm();
  const AI2 = fakeAI(() => ({ foo: 1 }));
  const env2 = { ...BASE, AI: AI2, AI_LLM: "on" };
  assert.deepEqual((await ask(Q, env2)).body, baseline);
  await ask(Q, env2);
  assert.equal(AI2.calls.length, 1);
  assert.equal(outputText({ response: { a: 1 } }), '{"a":1}');
});

await t("câu chuẩn hoá thành «chữa khỏi» / «đặt lịch» / «giao hàng» ⇒ claim / book / faq, không SP", async () => {
  for (const [rw, want] of [["chữa khỏi mụn", "claim"], ["đặt lịch tư vấn", "book"], ["giao hàng tỉnh", "faq"]]) {
    resetLlm();
    const AI = fakeAI(() => ({ response: rw }));
    const r = await ask("zxqv wptk", { ...BASE, AI, AI_LLM: "on" });
    assert.equal(r.body.intent, want, rw);
    assert.equal(r.body.related_products.length, 0, rw);
    assert.equal(AI.calls.length, 1, rw);
  }
});

await t("lời dẫn nguy hiểm do khách chèn lệnh ⇒ bị chặn", () => {
  for (const bad of ["Dạ, bạn có thể uống isotretinoin để trị dứt mụn ạ.", "Dạ, sản phẩm này an toàn tuyệt đối cho mẹ bầu ạ.",
    "Dạ, BS khuyên dùng ạ.", "Dạ, chị ơi dùng loại này nhé ạ.", "Dạ, xem thêm ở shopee.vn ạ.", "Dạ, bạn đang có dấu hiệu viêm da cơ địa ạ.",
    "Dạ, bạn nên dùng Melacare buổi tối ạ.", "Dạ, ~~kem~~ rất hợp da dầu ạ.", "Dạ, liên hệ shop@pharma.vn nhé ạ.", "Dạ, bôi kháng sinh và corticoid ạ."]) {
    assert.equal(leadOk(bad, complianceOk), false, bad);
  }
  assert.equal(leadOk("Dạ, da dầu nên làm sạch nhẹ nhàng. Bạn thoa kem chống nắng mỗi sáng nhé ạ.", complianceOk), true);
});

await t("cổng lời dẫn leadOk", () => {
  assert.equal(leadOk(LEAD, complianceOk), true);
  assert.equal(leadOk("Chào bạn, " + LEAD, complianceOk), false);
  assert.equal(leadOk("Dạ, dùng 2 lần mỗi ngày ạ, rất hợp da dầu.", complianceOk), true);
  assert.equal(leadOk("Dạ, kem này giảm 50% cho da dầu ạ.", complianceOk), false);
  assert.equal(leadOk("Dạ, kem này chỉ 100k cho da dầu ạ.", complianceOk), false);
  assert.equal(leadOk("Dạ, kem này chứa Vitamin C và SPF dịu nhẹ ạ.", complianceOk), true);
  assert.equal(leadOk("Dạ, kem này có giá tốt cho da dầu ạ.", complianceOk), false);
});

console.log(`\n${passed} kiểm tra LLM đạt.`);
