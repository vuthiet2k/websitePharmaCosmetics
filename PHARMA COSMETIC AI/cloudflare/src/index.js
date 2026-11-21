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

const STORE_KEYS = ["dia chi", "co so", "o dau", "chi nhanh", "showroom", "phong tri lieu", "skin health", "giai phong",
  "hotline", "so dien thoai", "lien he", "gio mo cua", "mo cua", "dong cua", "zalo"];

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

  const query = maskPii(last.content);
  const folded = fold(query);
  const storeInfo = STORE_KEYS.some((k) => folded.includes(k)) ? STORE : null;
  let products = (await search(env, request, query, 3, 2)).map(({ title, url }) => ({ title, url }));
  let articles = (await search(env, request, query, 2, 1)).map(({ title, url }) => ({ title, url }));

  const parts = [];
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
  if (!parts.length) parts.push(SAFE_FALLBACK);
  parts.push(`Thông tin chỉ mang tính tham khảo, không thay thế tư vấn trực tiếp từ ${c.expert}.`);

  let reply = parts.join("\n\n");
  if (!complianceOk(reply)) { reply = SAFE_FALLBACK; products = []; articles = []; }
  return json({ reply, related_products: products, related_articles: articles, store_info: storeInfo }, 200, cors);
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
