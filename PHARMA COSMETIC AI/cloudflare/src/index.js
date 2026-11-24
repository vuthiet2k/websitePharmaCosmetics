/**
 * Pharma Cosmetics AI — API tra cứu chạy trên Cloudflare Workers (bản port của app/main.py, cùng hành vi).
 *
 * Vì sao thiết kế thế này: gói Workers miễn phí chỉ cho ~10ms CPU mỗi lần gọi ⇒ KHÔNG dựng chỉ mục lúc chạy.
 * Chỉ mục BM25 đã tính sẵn (scripts/build_cf_index.py) nằm ở public/idx/ và được nạp theo mảnh nhỏ (≤ ~60KB) qua
 * binding ASSETS, cache trong bộ nhớ isolate. Mỗi truy vấn chỉ đọc vài mảnh ứng với các từ khoá.
 *
 * Không LLM, không DB, không lưu/ghi log nội dung khách. Che SĐT/email/CMND trước khi xử lý.
 */
import STORE from "./store.json" with { type: "json" };

const VERSION = "1.1.0-cf";
const PROJECT_NAME = "Pharma Cosmetics AI Tra cứu";

// ---------- Chuẩn hoá tiếng Việt (khớp app/hybrid_rag.py) ----------
const STOP = new Set(["la", "va", "cua", "cho", "toi", "minh", "em", "anh", "chi", "co", "khong", "the", "nao", "nhu",
  "bi", "duoc", "can", "muon", "hay", "mot", "nhung", "cac", "thi", "ma", "voi", "de", "o", "tai"]);

export function fold(text) {
  return String(text || "").toLowerCase().replaceAll("đ", "d").normalize("NFD").replace(/\p{Mn}/gu, "");
}

export function tokenize(text) {
  return (fold(text).match(/[a-z0-9]+/g) || []).filter((t) => !STOP.has(t));
}

// Băm FNV-1a 32-bit — PHẢI khớp scripts/build_cf_index.py (từ đã bỏ dấu nên chỉ có a-z0-9)
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// ---------- Che thông tin cá nhân + kiểm tra phát ngôn (khớp app/guardrails.py) ----------
const PHONE_RE = /(?<!\d)(?:\+?84|0)[35789](?:[\s.\-]?\d){8}(?!\d)/g;
const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
const ID_RE = /(?<![\d.,])(?:\d{9}|\d{12})(?![\d.,])/g;

const BANNED = ["chữa khỏi dứt điểm", "cam kết khỏi 100%", "thay thế thuốc chữa bệnh", "bác sĩ kê đơn", "ai chăm sóc",
  "ai điều trị", "ai khám da", "ai tư vấn phác đồ", "ai thay thế chuyên gia"];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BANNED_RE = BANNED.map((p) => new RegExp("(?<![\\p{L}\\p{N}_])" + escapeRe(p) + "(?![\\p{L}\\p{N}_])", "iu"));

const SAFE_FALLBACK = "Dạ em chưa có thông tin phù hợp để trả lời chính xác. Bạn vui lòng liên hệ Chuyên gia của " +
  "Pharma Cosmetics để được tư vấn trực tiếp nhé ạ.";

export function maskPii(text) {
  return text.replace(PHONE_RE, "[SĐT đã ẩn]").replace(EMAIL_RE, "[email đã ẩn]").replace(ID_RE, "[số định danh đã ẩn]");
}

export function complianceOk(text) {
  return !BANNED_RE.some((rx) => rx.test(text));
}

// Từ thuộc câu hỏi về cửa hàng (+ từ đệm): mọi từ của câu hỏi đều nằm ở đây ⇒ không gợi ý SP/bài viết (khớp app/main.py)
const STORE_WORDS = new Set("dia chi co so dau chi nhanh showroom phong tri lieu skin health giai phong hotline so dien thoai lien he gio mo cua dong zalo ha noi hoang mai ngo ngach website web phong kham hang cho toi minh em anh la va the nao nhu duoc khong co o tai ban oi vay a nhe nha di ve".split(" "));
const SMALL = new Set("xin chao hello hi hey alo ban oi a nhe nha ad admin shop em anh chi minh cam on thanks thank tks ok oke vang da bye tam biet".split(" "));
const GENERIC = new Set("gi lam nao tot nhat nen dung giup tu van san pham cho toi minh ban co the duoc nhung cac mot sao nhu khong hay la va cua ve voi em anh chi oi a nhe nha hoi can muon".split(" "));
const HELP_RE = /(lam duoc gi|lam nhung gi|lam gi|giup duoc gi|giup gi|co the lam|chuc nang|ban la ai|ho tro gi|huong dan|su dung nhu the nao|ban biet gi)/;
const BOOK_RE = /(dat lich|hen lich|lich hen|dat hen|gap chuyen gia|tu van truc tiep|kham truc tiep|dang ky kham|dang ky tu van)/;
const SKIN_RE = /(soi da|phan tich da|kiem tra da|quiz|loai da cua|xac dinh loai da|tinh trang da cua|chan doan da)/;
const STORE_KEYS = ["dia chi", "co so", "o dau", "chi nhanh", "showroom", "phong tri lieu", "skin health", "giai phong",
  "hotline", "so dien thoai", "lien he", "gio mo cua", "mo cua", "dong cua", "zalo"];
// 24/11/2026 (kiểm thử điểm mù AI) — khớp app/main.py:
// Cảnh báo đỏ: thai kỳ/cho con bú hoặc phản ứng cấp ⇒ KHÔNG gợi ý sản phẩm, chuyển Chuyên gia / cơ sở y tế.
const RED_RE = /\b(mang thai|co thai|dang bau|mang bau|co bau|thai ky|bau bi|cho con bu|nuoi con bu|sung do|sung tay|sung mat|sung moi|sung mi|bi sung|phu ne|phu mat|kho tho|tuc nguc|noi me day|me day|phat ban|chay mu|ri dich|do rat|rat bong|bong rat|nong rat|bi di ung|di ung nang|bi kich ung|kich ung nang|chay mau)\b/;
// Câu hỏi mua bán/chính sách: không bịa chính sách ⇒ chỉ dẫn hotline/Zalo + mục Chính sách ở cuối trang.
const FAQ_RE = /\b(giao hang|ship|cod|van chuyen|phi ship|thanh toan|chuyen khoan|tra gop|doi tra|doi hang|tra hang|hoan tien|bao hanh|chinh hang|hang that|hang gia|hang fake|nguon goc|xuat xu|con hang|het hang|khuyen mai|ma giam|voucher|don hang|dat hang|mua hang|mua online)\b/;
// Từ đệm/mua bán/tán gẫu: không tính là «từ khoá thật» khi tìm sản phẩm (tránh «giao hàng» ra sản phẩm có chữ «hàng»)
const NOISE = new Set(("giao hang ship cod van chuyen phi thanh toan khoan tra gop doi hoan tien bao hanh chinh that gia " +
  "fake nguon goc xuat xu con het khuyen mai giam voucher don dat mua online " +
  "hom nay qua troi dep moi vao dang roi lan biet vay sao nhieu luc nhe sdt email so dinh danh").split(" "));
const PII_TAG_RE = /\[(SĐT|email|số định danh) đã ẩn\]/g;

// ---------- Tìm kiếm BM25 trên chỉ mục đã chia mảnh ----------
const cache = new Map(); // tên mảnh -> dữ liệu (sống theo isolate)

async function loadJson(env, request, name) {
  if (cache.has(name)) return cache.get(name);
  const res = await env.ASSETS.fetch(new Request(new URL(`/idx/${name}.json`, request.url)));
  if (!res.ok) throw new Error(`Không đọc được chỉ mục ${name} (${res.status})`);
  const data = await res.json();
  cache.set(name, data);
  return data;
}

export async function search(env, request, query, topK, catCode) {
  const meta = await loadJson(env, request, "meta");
  const tokens = [...new Set(tokenize(query))];
  const scores = new Map();
  for (const q of tokens) {
    const shard = await loadJson(env, request, `p${fnv1a(q) % meta.pshards}`);
    const flat = shard[q];
    if (!flat) continue;
    const df = flat.length / 2;
    const idf = Math.log(1 + (meta.n - df + 0.5) / (df + 0.5));
    for (let i = 0; i < flat.length; i += 2) {
      const doc = flat[i], freq = flat[i + 1];
      if (catCode !== null && meta.cat[doc] !== catCode) continue;
      const norm = freq + meta.k1 * (1 - meta.b + meta.b * meta.len[doc] / meta.avgdl);
      scores.set(doc, (scores.get(doc) || 0) + idf * freq * (meta.k1 + 1) / norm);
    }
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, topK);
  const out = [];
  for (const [doc, score] of ranked) {
    const shard = await loadJson(env, request, `d${Math.floor(doc / meta.dshard)}`);
    const [title, url] = shard[doc % meta.dshard];
    out.push({ title, url, score: Math.round(score * 10000) / 10000 });
  }
  return out;
}

// ---------- Giới hạn tần suất (trong bộ nhớ isolate — chỉ là lớp phụ, xem docs: nên thêm Rate limiting rule ở Cloudflare) ----------
const hits = new Map();

function rateLimited(ip, limit) {
  const now = Date.now();
  const q = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (q.length >= limit) { hits.set(ip, q); return true; }
  q.push(now);
  hits.set(ip, q);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 60000) hits.delete(k);
  return false;
}

// ---------- Tiện ích HTTP ----------
function cfg(env) {
  const n = (v, d) => { const x = parseInt(v, 10); return Number.isFinite(x) && x > 0 ? x : d; };
  return {
    origins: String(env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean),
    rate: n(env.RATE_LIMIT_PER_MIN, 20),
    maxMessages: n(env.MAX_MESSAGES, 20),
    maxChars: n(env.MAX_CHARS, 500),
    expert: env.EXPERT_TITLE || "Chuyên gia",
  };
}

function corsHeaders(request, c) {
  const origin = request.headers.get("Origin");
  const h = { "Vary": "Origin" };
  if (origin && c.origins.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}

function json(body, status, extra) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...extra } });
}

// ---------- POST /api/v1/chat ----------
async function chat(request, env, c, cors) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (rateLimited(ip, c.rate)) return json({ detail: "Bạn gửi quá nhanh, vui lòng thử lại sau ít phút." }, 429, cors);

  let body;
  try { body = await request.json(); } catch { return json({ detail: "Nội dung gửi lên không phải JSON hợp lệ." }, 422, cors); }
  const msgs = body && body.messages;
  const valid = Array.isArray(msgs) && msgs.every((m) => m && (m.role === "user" || m.role === "assistant")
    && typeof m.content === "string" && m.content.length <= 2000);
  if (!valid) return json({ detail: "Dữ liệu tin nhắn không hợp lệ." }, 422, cors);
  if (msgs.length === 0 || msgs.length > c.maxMessages) return json({ detail: "Số lượng tin nhắn không hợp lệ." }, 400, cors);
  const last = msgs[msgs.length - 1];
  if (last.role !== "user" || !last.content.trim()) return json({ detail: "Tin nhắn cuối phải là câu hỏi của khách." }, 400, cors);
  if (last.content.length > c.maxChars) return json({ detail: `Câu hỏi tối đa ${c.maxChars} ký tự.` }, 400, cors);

  // 24/11/2026: bỏ nhãn «[SĐT đã ẩn]»… trước khi tìm — trước đây nhãn này sinh từ khoá «sdt da an» ⇒ ra sản phẩm lạc đề
  const query = maskPii(last.content).replace(PII_TAG_RE, " ");
  const folded = fold(query);
  // 23/11/2026 (chủ dự án: «người mới không hỏi ngay về sản phẩm»): nhận diện Ý ĐỊNH trước khi gợi ý sản phẩm/bài viết.
  //   Thứ tự (khớp app/main.py): red = cảnh báo y tế > book = đặt lịch > skin = soi da/quiz > faq = mua bán/chính sách
  //   > help = chào / «bạn làm được gì» / câu không có từ khoá thật ⇒ trả lời hướng dẫn, KHÔNG kèm sản phẩm/bài viết.
  const toks = folded.match(/[a-z0-9]+/g) || [];
  const content = [...new Set(toks)].filter((t) => !SMALL.has(t) && !GENERIC.has(t) && !STOP.has(t) && !NOISE.has(t));
  const hasStoreKey = STORE_KEYS.some((k) => folded.includes(k));
  const isFaq = FAQ_RE.test(folded);
  let intent = "";
  if (RED_RE.test(folded)) intent = "red";
  else if (BOOK_RE.test(folded)) intent = "book";
  else if (SKIN_RE.test(folded)) intent = "skin";
  else if (isFaq && !content.length) intent = "faq";
  else if (!hasStoreKey && !isFaq && (HELP_RE.test(folded) || !content.length)) intent = "help";
  const storeInfo = (hasStoreKey || ["book", "red", "faq"].includes(intent)) ? STORE : null;
  // câu hỏi CHỈ về cửa hàng (địa chỉ / giờ mở cửa / hotline) ⇒ không kèm sản phẩm, bài viết
  const storeOnly = !!storeInfo && toks.every((t) => STORE_WORDS.has(t));
  const noSuggest = !!intent || storeOnly || !content.length;
  // Ngưỡng liên quan: tiêu đề phải chứa ≥1 từ khoá thật của câu hỏi (điểm BM25 tuyệt đối không tách được câu lạc đề)
  const pick = async (catCode, k) => (await search(env, request, content.join(" "), 8, catCode))
    .filter((d) => tokenize(d.title).some((t) => content.includes(t))).slice(0, k).map(({ title, url }) => ({ title, url }));
  let products = noSuggest ? [] : await pick(2, 3);
  let articles = noSuggest ? [] : await pick(1, 2);
  const bookUrl = (STORE && STORE.booking_url) || "/dat-lich-tu-van";
  const skinUrl = String(env.SKIN_PAGE_URL || "/kham-da-ai").replace(/\/+$/, "");

  const parts = [];
  let needsContact = false; // true ⇒ trang chat hiện số hotline + nút Zalo
  if (intent === "red") {
    parts.push(`Dạ, trường hợp này (đang mang thai/cho con bú, hoặc da có dấu hiệu sưng, rát, dị ứng) em không gợi ý ` +
      `sản phẩm được ạ. Bạn nên **tạm ngừng sản phẩm đang dùng** và liên hệ ${c.expert} để được tư vấn trực tiếp.`);
    parts.push("Nếu sưng nhiều, khó thở, tức ngực hoặc nổi mề đay toàn thân, bạn hãy **đến cơ sở y tế gần nhất ngay**.");
    needsContact = true;
  } else if (intent === "help") {
    const thanks = /(cam on|thanks|thank|tks)/.test(folded);
    const hello = /(xin chao|chao|hello|\bhi\b|hey|alo)/.test(folded);
    parts.push(thanks ? "Dạ không có gì ạ. Cần gì thêm bạn cứ hỏi em nhé." : hello ? "Dạ chào bạn ạ." : "Dạ em là trợ lý tra cứu của Pharma Cosmetics ạ.");
    parts.push(["Em có thể giúp bạn:",
      "- **Địa chỉ, giờ mở cửa, hotline** của cửa hàng",
      "- **Soi da bằng ảnh hoặc camera**: bấm dấu **+** cạnh ô nhập",
      `- **Làm quiz xác định loại da**: [Làm quiz](${skinUrl}?tab=quiz)`,
      "- **Gợi ý sản phẩm, bài viết** khi bạn nói tình trạng da hoặc hoạt chất quan tâm (ví dụ «mụn ẩn», «retinol»)",
      `- **Đặt lịch với ${c.expert}**: [Đặt lịch tư vấn](${bookUrl})`].join("\n"));
  } else if (intent === "skin") {
    parts.push(["Em hỗ trợ soi da theo 2 cách:",
      "- **Gửi ảnh hoặc bật camera ngay trong khung chat**: bấm dấu **+** cạnh ô nhập (ảnh được phân tích ngay trên thiết bị của bạn, không gửi đi đâu)",
      `- **Làm quiz** trả lời vài câu hỏi để biết loại da: [Làm quiz](${skinUrl}?tab=quiz)`].join("\n"));
    parts.push(`Kết quả chỉ để tham khảo. Muốn có phác đồ phù hợp, bạn nên đặt lịch với ${c.expert}: [Đặt lịch tư vấn](${bookUrl})`);
  } else if (intent === "book") {
    parts.push(`Để được tư vấn trực tiếp, bạn đặt lịch với ${c.expert} ạ:`);
  }
  if (isFaq && intent !== "red") {
    parts.push("Về giao hàng, thanh toán, đổi trả, nguồn gốc hàng và tình trạng còn hàng: chính sách có thể thay đổi theo " +
      "thời điểm nên em không trả lời thay được ạ. Bạn vui lòng gọi **hotline/Zalo** bên dưới hoặc xem mục " +
      "**Chính sách** ở cuối trang website nhé.");
    needsContact = true;
  }
  if (storeInfo) {
    const lines = [`**${storeInfo.clinic_name || "Pharma Cosmetics"}**`];
    if (storeInfo.address) lines.push(`- Địa chỉ: ${storeInfo.address}`);
    if (storeInfo.phone) lines.push(`- Hotline/Zalo: ${storeInfo.phone}`);
    if (storeInfo.hours) lines.push(`- Giờ mở cửa: ${storeInfo.hours}`);
    lines.push(`- Đặt lịch với ${c.expert}: [Đặt lịch tư vấn](${storeInfo.booking_url || "/dat-lich-tu-van"})`);
    parts.push(lines.join("\n"));
  }
  if (products.length) parts.push("**Sản phẩm tham khảo** (xem giá và thành phần chi tiết tại trang sản phẩm):\n" + products.map((p) => `- [${p.title}](${p.url})`).join("\n"));
  if (articles.length) parts.push("**Bài viết tham khảo**:\n" + articles.map((a) => `- [${a.title}](${a.url})`).join("\n"));
  if (!parts.length) { parts.push(SAFE_FALLBACK); needsContact = true; }
  parts.push(`Thông tin chỉ mang tính tham khảo, không thay thế tư vấn trực tiếp từ ${c.expert}.`);

  let reply = parts.join("\n\n");
  if (!complianceOk(reply)) { reply = SAFE_FALLBACK; products = []; articles = []; needsContact = true; }
  return json({ reply, related_products: products, related_articles: articles, store_info: storeInfo, needs_contact: needsContact }, 200, cors);
}

export default {
  async fetch(request, env) {
    const c = cfg(env);
    const cors = corsHeaders(request, c);
    const { pathname } = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (pathname === "/" && request.method === "GET") return json({ status: "online", service: PROJECT_NAME, version: VERSION }, 200, cors);
    if (pathname === "/healthz" && request.method === "GET") {
      const meta = await loadJson(env, request, "meta");
      return json({ ok: true, documents: meta.n, store: true }, 200, cors);
    }
    if (pathname === "/api/v1/chat") {
      if (request.method !== "POST") return json({ detail: "Method Not Allowed" }, 405, { ...cors, Allow: "POST, OPTIONS" });
      try { return await chat(request, env, c, cors); } catch (e) { return json({ detail: "Hệ thống đang bận, vui lòng thử lại." }, 500, cors); }
    }
    return json({ detail: "Not Found" }, 404, cors);
  },
};
