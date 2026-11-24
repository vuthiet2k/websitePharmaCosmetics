// Tầng LLM (Cloudflare Workers AI) — 24/11/2026 SPEC-AI-LLM-01.
// Nguyên tắc: LLM KHÔNG quyết định nội dung an toàn. Bộ lõi tĩnh (17 ý định, cảnh báo đỏ, FAQ, cửa hàng…) chạy trước, 0 Neuron.
// LLM chỉ làm 2 việc hẹp cho câu tư vấn sản phẩm:
//   1) chọn ≤3 SP thật trong danh sách ứng viên BM25 + viết lời dẫn ngắn giọng «Dạ… em – bạn» (llmChoose);
//   2) khi BM25 không ra gì: chuẩn hoá câu (thêm dấu, sửa chính tả, viết tắt) để tìm lại (llmRewrite).
// Mọi lỗi / quá thời gian / hết hạn mức 10.000 Neurons/ngày ⇒ trả null, Worker dùng câu trả lời tĩnh như cũ.
// Chỉ gửi câu hỏi ĐÃ ẩn SĐT/email/CCCD, không gửi lịch sử chat; không ghi log nội dung.

// 24/11/2026: llama-3.1-8b-instruct-fp8(-fast) không còn trong danh mục / đã ngừng (20/11/2026) ⇒ dùng Gemma 4 (MoE 4B kích hoạt, đa ngữ).
const MODEL_REPLY = "@cf/google/gemma-4-26b-a4b-it"; // ~8,2 Neuron/lượt (450 vào / 150 ra) ⇒ ~1.200 lượt/ngày miễn phí
const MODEL_REWRITE = "@cf/meta/llama-3.2-3b-instruct"; // ~2 Neuron/lượt

let offUntil = 0; // cầu dao trong isolate: hết hạn mức ⇒ tắt tới 00:00 UTC; lỗi khác ⇒ tắt 60 giây

export function resetLlm() { offUntil = 0; }

export function llmEnabled(env) {
  return !!(env && env.AI && typeof env.AI.run === "function"
    && String(env.AI_LLM || "").trim().toLowerCase() === "on" && Date.now() >= offUntil);
}

function nextUtcMidnight(now) {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

// Workers AI trả {response: string} (Llama) hoặc kiểu OpenAI {choices:[{message:{content}}]} (Gemma 4)
export function outputText(out) {
  if (typeof out === "string") return out;
  if (!out || typeof out !== "object") return null;
  if (typeof out.response === "string") return out.response;
  if (out.response && typeof out.response === "object") return JSON.stringify(out.response);
  const c = Array.isArray(out.choices) && out.choices[0];
  if (c && c.message && typeof c.message.content === "string") return c.message.content;
  if (c && typeof c.text === "string") return c.text;
  return null;
}

async function run(env, model, messages, maxTokens) {
  const ms = parseInt(env.AI_TIMEOUT_MS, 10) > 0 ? parseInt(env.AI_TIMEOUT_MS, 10) : 4000;
  let timer;
  try {
    // Gemma 4 dùng max_completion_tokens (max_tokens đã bỏ); Llama dùng max_tokens
    const lim = /gemma-4/.test(model) ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens };
    const out = await Promise.race([
      env.AI.run(model, { messages, temperature: 0.2, ...lim }),
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("timeout")), ms); }),
    ]);
    const text = outputText(out);
    if (text === null) throw new Error("bad-shape"); // dạng trả về lạ ⇒ tính là lỗi để cầu dao ngắt, không đốt Neuron mãi
    return text.trim() || null;
  } catch (e) {
    const msg = String((e && e.message) || e);
    offUntil = /neuron|quota|allocation|daily/i.test(msg) ? nextUtcMidnight(Date.now()) : Date.now() + 60000;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM_CHOOSE = [
  "Bạn là trợ lý tư vấn của cửa hàng dược mỹ phẩm Pharma Cosmetics. Xưng «em», gọi khách là «bạn», lễ phép, thân thiện.",
  "Đọc câu hỏi của khách và danh sách sản phẩm ứng viên (đánh số), rồi trả về DUY NHẤT một đối tượng JSON, không viết gì thêm:",
  "{\"chon\":[số thứ tự của tối đa 3 sản phẩm phù hợp nhất],\"loi\":\"lời dẫn\"}",
  "Quy tắc cho chon: chỉ chọn sản phẩm đúng nhu cầu (ví dụ hỏi về da mặt thì không chọn dầu gội tóc); không có sản phẩm nào phù hợp thì để [].",
  "Quy tắc cho loi: 1 đến 3 câu, tối đa 60 từ, bắt đầu bằng «Dạ», tiếng Việt có dấu; gợi ý ngắn hướng chăm sóc hợp với câu hỏi.",
  "Trong loi KHÔNG nêu tên sản phẩm, KHÔNG nêu giá hay bất kỳ con số nào, KHÔNG hứa hiệu quả hay chữa khỏi, KHÔNG chẩn đoán bệnh,",
  "KHÔNG nhắc tới bác sĩ, không dùng emoji, không dùng markdown. Danh sách sản phẩm sẽ hiện ngay bên dưới lời dẫn.",
].join("\n");

const SYSTEM_REWRITE = [
  "Bạn chuẩn hoá câu tìm kiếm mỹ phẩm, chăm sóc da bằng tiếng Việt: thêm dấu đúng, sửa lỗi chính tả, viết đầy đủ từ viết tắt, bỏ từ thừa.",
  "Chỉ trả về một dòng từ khoá ngắn (tối đa 8 từ), không giải thích, không dấu ngoặc kép.",
  "Nếu câu không liên quan tới mỹ phẩm, chăm sóc da, tóc hay sức khoẻ thì trả về đúng chữ: KHONG",
].join("\n");

// Lời dẫn của LLM phải qua cổng này; trượt ⇒ dùng câu tĩnh. complianceOk là bộ chặn claim y tế của index.js.
// 24/11/2026 review: chặn theo NHÓM từ (thuốc/hoạt chất kê đơn, thai kỳ, hứa hiệu quả, chẩn đoán, xưng hô sai, liên kết/ký hiệu)
// — khách có thể chèn lệnh vào câu hỏi, nên lời dẫn chỉ được là lời khuyên chăm sóc chung chung.
const BAN_WORDS = [
  "bác sĩ", "bs", "dược sĩ", "chuyên gia", "anh", "chị", "cô", "chú", "ông", "bà", "quý khách", "mẹ", "bé",
  "chữa", "khỏi", "dứt", "dứt điểm", "trị", "điều trị", "hết sạch", "tận gốc", "vĩnh viễn", "cam kết", "đảm bảo",
  "an toàn", "tuyệt đối", "hiệu quả", "chắc chắn", "kê đơn", "chẩn đoán", "bệnh", "viêm", "nhiễm", "nấm", "vi khuẩn",
  "thuốc", "uống", "tiêm", "kháng sinh", "corticoid", "steroid", "bầu", "thai", "bú", "sau sinh", "liều",
  "isotretinoin", "tretinoin", "adapalene", "hydroquinone", "clindamycin", "benzoyl", "mometasone", "betamethasone",
  "itraconazole", "ketoconazole", "minoxidil", "giá", "vnđ", "rẻ", "khuyến mãi", "giảm giá", "mua",
];
const BAN_RE = new RegExp(String.raw`(?<![\p{L}\p{N}])(` + BAN_WORDS.join("|") + String.raw`)(?![\p{L}\p{N}])`, "iu");
const BAD_LEAD = /(http|www\.|\.[a-z]{2,}\b|@|\]\(|[<>*#`~_|\/])/i;
const VI_MARK = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

export function leadOk(t, complianceOk) {
  if (typeof t !== "string") return false;
  const s = t.trim();
  return s.startsWith("Dạ") && s.length >= 20 && s.length <= 420 && !/\d/.test(s) && !s.includes("\n")
    && !BAD_LEAD.test(s) && !BAN_RE.test(s) && VI_MARK.test(s) && !/\p{Extended_Pictographic}/u.test(s)
    && !/(?<!^|[.!?]\s)\p{Lu}/u.test(s) && (s.match(/[.!?]/g) || []).length <= 3 // không viết hoa giữa câu (tên thuốc/hãng), ≤3 câu
    && !/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(s) && complianceOk(s);
}

// Trả { chon: [chỉ số trong products], lead: string|null } hoặc null (lỗi / không đọc được ⇒ giữ kết quả tĩnh)
export async function llmChoose(env, query, products, complianceOk) {
  const list = products.map((p, i) => `${i + 1}. ${p.title}`).join("\n");
  const text = await run(env, env.AI_MODEL_REPLY || MODEL_REPLY, [
    { role: "system", content: SYSTEM_CHOOSE },
    { role: "user", content: `Câu hỏi: ${query.trim()}\nSản phẩm ứng viên:\n${list}` },
  ], 220);
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let obj;
  try { obj = JSON.parse(m[0]); } catch { return null; }
  if (!obj || !Array.isArray(obj.chon)) return null;
  const chon = [];
  for (const v of obj.chon) {
    const n = typeof v === "number" ? v : parseInt(v, 10);
    if (!Number.isInteger(n) || n < 1 || n > products.length) return null; // số lạ ⇒ không tin cả câu trả lời
    if (!chon.includes(n - 1)) chon.push(n - 1);
  }
  if (chon.length > 3) chon.length = 3;
  return { chon, lead: leadOk(obj.loi, complianceOk) ? obj.loi.trim() : null };
}

// Trả chuỗi từ khoá đã chuẩn hoá, hoặc null
export async function llmRewrite(env, query) {
  const text = await run(env, env.AI_MODEL_REWRITE || MODEL_REWRITE, [
    { role: "system", content: SYSTEM_REWRITE },
    { role: "user", content: query.trim() },
  ], 40);
  if (!text) return null;
  const s = text.split("\n")[0].replace(/["«»]/g, "").trim();
  if (!s || s.length > 80 || /^khong\W*$/i.test(s) || !/^[\p{L}\p{N} ,.\-]+$/u.test(s)) return null;
  return s;
}
