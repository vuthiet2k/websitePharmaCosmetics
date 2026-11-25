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
import { llmChoose, llmEnabled, llmRewrite } from "./llm.js";

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
const PHONE_RE = /(?<!\d)(?:\+?84|0)[\s.\-]?[35789](?:[\s.\-]?\d){8}(?!\d)/g;
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
const STORE_WORDS = new Set("dia chi co so dau chi nhanh showroom phong tri lieu skin health giai phong hotline so dien thoai lien he gio mo cua dong zalo ha noi hoang mai ngo ngach website web phong kham hang cho toi minh em anh la va the nao nhu duoc khong co o tai ban oi vay a nhe nha di ve shop may chu nhat thu ngay le tet cuoi tuan lam viec sdt dt ko hai bay sau nam 2 3 4 5 6 7".split(" "));
const SMALL = new Set("xin chao hello hi hey alo ban oi a nhe nha ad admin shop em anh chi minh cam on thanks thank tks ok oke vang da bye tam biet".split(" "));
const GENERIC = new Set("gi lam nao tot nhat nen dung giup tu van san pham cho toi minh ban co the duoc nhung cac mot sao nhu khong hay la va cua ve voi em anh chi oi a nhe nha hoi can muon may".split(" ")); // 24/11/2026 SPEC-AI-CHAT-TONE-01 vòng 2 (E3): «mấy loại serum» không thành từ khoá «mày»
const HELP_RE = /(lam duoc gi|lam nhung gi|lam gi|giup duoc gi|giup gi|co the lam|chuc nang|ban la ai|ho tro gi|huong dan|su dung nhu the nao|ban biet gi)/;
const BOOK_RE = /(dat lich|hen lich|lich hen|dat hen|gap chuyen gia|tu van truc tiep|kham truc tiep|dang ky kham|dang ky tu van)/;
const SKIN_RE = /(soi da|phan tich da|kiem tra da|quiz|loai da cua|xac dinh loai da|tinh trang da cua|chan doan da)/;
const STORE_KEYS = ["dia chi", "co so", "o dau", "chi nhanh", "showroom", "phong tri lieu", "skin health", "giai phong",
  "hotline", "so dien thoai", "lien he", "gio mo cua", "mo cua", "dong cua", "zalo",
  "cua hang", "sdt shop", "sdt cua hang", "sdt ben", "so dt", "gio lam viec"];
// 24/11/2026 (kiểm thử điểm mù AI) — khớp app/main.py:
// Cảnh báo đỏ: thai kỳ/cho con bú hoặc phản ứng cấp ⇒ KHÔNG gợi ý sản phẩm, chuyển Chuyên gia / cơ sở y tế.
const RED_RE = /\b(me bau|ba bau|bau \d+ (?:thang|tuan)|cho be bu|dang cho bu|dang bu|mang thai|co thai|dang bau|mang bau|co bau|thai ky|bau bi|cho con bu|nuoi con bu|sung do|sung tay|sung mat|sung moi|sung mi|bi sung|phu ne|phu mat|kho tho|tuc nguc|noi me day|me day|phat ban|chay mu|ri dich|rat bong|bong rat|nong rat|bi di ung|di ung nang|bi kich ung|kich ung nang|chay mau|noi man|man do|man ngua|ngua rat)\b|(?:^\W*|\b(?:bi|da|mat|moi|tay|mi|co|vung|xong|sau|vao|boi|thoa|nam|than|lung) )do rat\b|\b(?:bi|da|mat|moi|tay|mi|co|vung|xong|sau|vao|boi|thoa|nam|than|lung) rat do\b|\bbi rat(?= (?:do|ngua|bong|sung|rat|khi|sau|luc|va|o|mat|moi|tay|co|chan|lung|tran)\b|\W*$)/; // 24/11/2026 SPEC-AI-CHAT-TONE-01 AC-01.3: «bôi xong bị rát đỏ» trước lọt cảnh báo
// 24/11/2026 SPEC-AI-CHAT-TONE-01 vòng 2 (E2): «bị rất»/«rất dở»/«đó rất» bỏ dấu trùng «bị rát»/«rát đỏ»/«đỏ rát» ⇒ chuyển sang allow-list
// Câu hỏi mua bán/chính sách: không bịa chính sách ⇒ chỉ dẫn hotline/Zalo + mục Chính sách ở cuối trang.
const FAQ_RE = /\b(giao hang|ship|cod|van chuyen|phi ship|thanh toan|chuyen khoan|tra gop|doi tra|doi hang|tra hang|hoan tien|bao hanh|chinh hang|hang that|hang gia|hang fake|nguon goc|xuat xu|con hang|het hang|khuyen mai|ma giam|voucher|don hang|dat hang|mua hang|mua online|giao bao lau|ship bao lau|bao lau nhan|giao ngoai|giao tinh|giao xa|giao noi thanh|giao toan quoc|cam ket gi|bao dam gi)\b/; // 24/11/2026 SPEC-AI-CHAT-TONE-01 vòng 2 (BUG-01, E10): «giao ngoại tỉnh», «shop cam kết gì» là câu hỏi chính sách
// Từ đệm/mua bán/tán gẫu: không tính là «từ khoá thật» khi tìm sản phẩm (tránh «giao hàng» ra sản phẩm có chữ «hàng»)
const NOISE = new Set(("giao hang ship cod van chuyen phi thanh toan khoan tra gop doi hoan tien bao hanh chinh that gia " +
  "fake nguon goc xuat xu con het khuyen mai giam voucher don dat mua online " +
  "hom nay qua troi dep moi vao dang roi lan biet vay sao nhieu luc nhe sdt email so dinh danh").split(" "));
const PII_TAG_RE = /\[(SĐT|email|số định danh) đã ẩn\]/g;

// ---------- 24/11/2026 SPEC-AI-CHAT-TONE-01: ý định mới + giọng điệu (PHẢI khớp app/main.py từng ký tự) ----------
// Thứ tự ưu tiên: red > claim > book > skin > callback > faq > price > store > bye > thanks > ack > vent > greet/help > product > nomatch
// (vent đặt trước greet/help: «da tệ quá» chỉ gồm từ đệm nên nếu để sau sẽ rơi vào menu; câu chào kèm từ khoá thật vẫn ra product)
const CLAIM_RE = /(chua khoi|khoi han|khoi hoan toan|dut diem|bao lau (thi |se )?(khoi|het)|co khoi (khong|duoc)|khoi duoc khong|\bco het (khong|duoc khong|mun|nam|tham|seo|ngua|benh|nhan|nep))/;
const COMMIT_RE = /\b(cam ket|bao dam)\b/; // chỉ tính là «hỏi cam kết kết quả» khi KHÔNG phải câu hỏi chính sách (vd «cam kết chính hãng»)
const DOCTOR_RE = /(bac si|duoc si|chuyen gia|tu van vien)/;
const DOCASK_RE = /(\bco\b(?![a-z0-9 ]*\bkhuyen\b)[a-z0-9 ]*\bkhong\b|\bgap\b|\bhoi\b|noi chuyen)/;
const CB_RE = /(goi lai|lien he lai|lien lac lai|de lai so|goi cho (em|minh|toi)|tu van qua (dien thoai|sdt|zalo)|goi dien (cho|lai))/;
const CB_WORDS = new Set("goi lai lien he lac de so cho dien thoai qua tu van sdt em minh toi nhe nha nhan tin ngay som sau vui long xin ho tro".split(" "));
const PRICE_RE = /((?<!chuyen )\bgia\b(?! hoa| dinh| vi| han| tang)|bao nhieu(?! tuoi| lan| ngay| lau| phut| gio| thang| phan tram)|\btien\b)/;
const PRICE_WORDS = new Set("tien ca bang dong vnd re mac dat".split(" "));
const FAQ_FILL = new Set("chua cam ket bao dam tinh bang gi may ngay lau bao ngoai thanh noi pho toan quoc hcm sg sai gon ha huyen mat".split(" ")); // từ đệm của câu hỏi giao hàng/thanh toán («giao hàng tỉnh», «thanh toán bằng gì»)
const HOURS_RE = /(\b(chu nhat|ngay le|ngay tet|cuoi tuan|thu (2|3|4|5|6|7|hai|ba|bay|sau|nam))\b[a-z0-9 ]{0,20}\b(mo|lam|ban|dong)\b|\bco (mo|lam|ban) (cua )?(khong|ko)\b|\bmay gio (mo|dong|lam|ban)\b|\bgio (mo|dong|lam)\b|\bmay gio\W*$)/;
const WEEKEND_RE = /(chu nhat|ngay le|ngay tet|cuoi tuan)/;
const SOCIAL_RE = /\b(thoi em di day|thoi di day|bai bai|hen gap lai|chao nhe|di day|chuc ngu ngon|thank you|goodbye|good bye)\b/g;
const BYE_RE = /\b(thoi em di day|thoi di day|tam biet|bye|bai bai|hen gap lai|chao nhe|di day|chuc ngu ngon|goodbye|good bye)\b/;
const THANKS_RE = /\b(cam on|camon|thanks|thank|thank you|tks|thks)\b/;
const GREET_RE = /\b(xin chao|chao|hello|hi|hey|alo)\b/;
const VENT_RE = /\b(huhu|hu hu|hic|chan qua|chan da|chan nan|da (minh |em )?(xau|te)|tu ti|buon qua|buon vi|that vong|met moi qua|stress|lo lang)\b/;
const VENT_WORDS = new Set("huhu hic chan xau nan buon that vong met stress lang".split(" "));
const ACK_CORE = new Set("ok oke okie oki okay vang u uh um uhm hmm hm uk ukm roi da o".split(" "));
const ACK_FILL = new Set("em shop ad a nhe nha ne duoc ha ak ah".split(" "));
// 24/11/2026 SPEC-AI-LLM-01 (BUG-03): «rát» CÒN DẤU không trùng nghĩa (bỏ dấu mới trùng «rất») ⇒ khớp trên chữ có dấu trước,
// allow-list RED_RE chỉ còn lo câu gõ không dấu. Trước đây «rát đỏ», «hơi đỏ rát», «bị ửng đỏ rát» lọt ra gợi ý kem.
const ACC_RED_RE = /(?<![\p{L}\p{N}_])rát(?![\p{L}\p{N}_])/u;
// Viết tắt hay gõ (0 Neuron, khớp app/main.py)
const ABBR = { kcn: "kem chong nang", srm: "sua rua mat", tdc: "tay da chet", nhh: "nuoc hoa hong" };
const ABBR_RE = /\b(kcn|srm|tdc|nhh)\b/g;
const nfcLower = (s) => String(s || "").normalize("NFC").toLowerCase();
// Khoá «chữ bỏ dấu|các dấu» — phân biệt nám/nấm, mấy/mày, gọi/gội, dầu/đầu; coi hoà/hòa là một
function accentKey(word) {
  const w = nfcLower(word);
  const marks = (w.normalize("NFD").match(/\p{Mn}/gu) || []).sort().join("");
  return fold(w) + "|" + marks + (w.includes("đ") ? "đ" : "");
}
function accentMap(text, onlyMarked) {
  const out = new Map();
  for (const w of nfcLower(text).match(/[\p{L}\p{N}]+/gu) || []) {
    const k = accentKey(w);
    if (onlyMarked && k.endsWith("|")) continue;
    const f = fold(w);
    if (!out.has(f)) out.set(f, new Set());
    out.get(f).add(k);
  }
  return out;
}
const KEEP2 = new Set("ha uv ph bb cc".split(" ")); // chữ ≤2 ký tự vẫn là từ khoá thật (HA, UV, pH, BB/CC cream); còn lại («u», «ừ», «ờ») bị bỏ
for (const w of "camon thks okie oki okay uh um uhm hmm hm uk ukm ak ah".split(" ")) NOISE.add(w);
// 24/11/2026 SPEC-AI-CHAT-TONE-01 vòng 2 (BUG-02, E4, E5/E6): cụm KHÔNG phải từ khoá sản phẩm — danh xưng (bác sĩ…), thứ/ngày, «gọi lại/gọi điện» («gọi» ≈ «gội»)
const NONKEY_RE = /\b(?:(?:bac si|duoc si|chuyen gia|tu van vien)(?: da lieu)?|chu nhat|cuoi tuan|ngay le|ngay tet|thu (?:2|3|4|5|6|7|hai|ba|bay|sau|nam)|goi (?:dien(?: thoai)?|lai|cho|ngay|giup|minh|em|toi))\b/g;

// Chuỗi giọng điệu — HẰNG SỐ (không random) để hai bản ra cùng chữ. Xưng hô «em – bạn». Giữ nguyên các chuỗi `must` của tests/scenarios.json.
const HELP_MENU_HEAD = "Em có thể giúp bạn:";
const GREET_FIRST = "Dạ em chào bạn ạ. Em là trợ lý tra cứu của Pharma Cosmetics.";
const GREET_ASK = "Bạn đang quan tâm vấn đề da nào ạ?";
const GREET_AGAIN = "Dạ em chào bạn ạ. Bạn đang quan tâm vấn đề da nào, cứ nhắn em nhé.";
const HELP_INTRO = "Dạ em là trợ lý tra cứu của Pharma Cosmetics ạ.";
const THANKS_REPLY = "Dạ không có gì ạ, em rất vui được hỗ trợ bạn. Cần gì thêm bạn cứ nhắn em nhé.";
const BYE_REPLY = "Dạ em cảm ơn bạn đã ghé Pharma Cosmetics ạ. Chúc bạn một ngày vui, cần gì bạn cứ quay lại nhắn em nhé.";
const ACK_REPLY = "Dạ vâng ạ. Bạn cần em hỗ trợ thêm gì cứ nhắn em nhé.";
const PRODUCT_OPEN = "Dạ, em tìm được vài gợi ý liên quan để bạn tham khảo ạ:";
const PRODUCT_OPEN_GREET = "Dạ em chào bạn ạ. Em tìm được vài gợi ý liên quan để bạn tham khảo ạ:";
const PRODUCT_OPEN_ALSO = "Em cũng tìm được vài gợi ý liên quan để bạn tham khảo ạ:";
const PRODUCT_CLOSE = "Bạn muốn em gợi ý kỹ hơn theo loại da, hay đặt lịch với {expert} để được tư vấn trực tiếp ạ?";
const PRICE_NOTE = "Giá có thể thay đổi theo thời điểm, bạn bấm vào từng sản phẩm để xem giá mới nhất ạ.";
const PRICE_ASK = "Dạ giá sản phẩm thay đổi theo thời điểm nên em không báo giá trực tiếp ạ. Bạn đang quan tâm sản phẩm nào hoặc vấn đề da gì, " +
  "em gửi đường dẫn để bạn xem giá mới nhất nhé.";
const STORE_OPEN = "Dạ, thông tin cửa hàng bên em đây ạ:";
const STORE_CLOSE = "Bạn cần em hỗ trợ thêm gì cứ nhắn em nhé.";
const FAQ_REPLY = "Dạ, về giao hàng, thanh toán, đổi trả, nguồn gốc và tình trạng còn hàng, chính sách có thể thay đổi theo thời điểm nên em không " +
  "trả lời thay được ạ. Bạn gọi hoặc nhắn **hotline/Zalo** bên dưới, hoặc xem mục **Chính sách** ở cuối trang website nhé.";
const FAQ_MIXED = "Về giao hàng, thanh toán, đổi trả, nguồn gốc và tình trạng còn hàng, chính sách có thể thay đổi theo thời điểm nên em không " +
  "trả lời thay được ạ. Bạn gọi hoặc nhắn **hotline/Zalo** bên dưới, hoặc xem mục **Chính sách** ở cuối trang website nhé.";
const BOOK_REPLY = "Dạ, bên em có {expert} tư vấn trực tiếp ạ. Bạn đặt lịch giúp em tại đây nhé:";
const CALLBACK_REPLY = "Dạ, để bảo vệ thông tin của bạn, em đã ẩn số điện thoại/email bạn gửi và không lưu lại ạ. Em chưa tự liên hệ lại được, " +
  "bạn gọi hoặc nhắn **hotline/Zalo** bên dưới để được hỗ trợ nhanh nhất nhé.";
const PII_NOTE = "Em đã ẩn số điện thoại/email bạn gửi để bảo vệ thông tin của bạn ạ.";
const CLAIM_REPLY = "Dạ, hiệu quả phụ thuộc cơ địa và mức độ của từng người nên em không thể cam kết kết quả ạ. Bạn nên đặt lịch với {expert} " +
  "để được đánh giá và tư vấn lộ trình phù hợp nhé.";
const VENT_REPLY = "Dạ em hiểu, da chưa như ý thật dễ khiến bạn lo lắng ạ. Bạn kể giúp em da đang gặp vấn đề gì (ví dụ mụn, thâm, nám, khô, nhạy cảm) " +
  "để em gợi ý sát hơn, hoặc soi da bằng ảnh: bấm dấu **+** cạnh ô nhập nhé.";
const NOMATCH_REPLY = "Dạ em chưa tìm thấy thông tin phù hợp với câu hỏi này ạ. Bạn thử mô tả cụ thể hơn (ví dụ loại da, vấn đề mụn, nám, khô) " +
  "hoặc liên hệ {expert} để được tư vấn trực tiếp nhé.";
const DISCLAIMER = "Thông tin chỉ mang tính tham khảo, không thay thế tư vấn trực tiếp từ {expert}.";
// Câu miễn trừ chỉ gắn khi có SP/bài viết hoặc ý định nội dung sức khoẻ (AC-02.10, OQ-3)
const DISCLAIMER_INTENTS = ["red", "skin", "claim", "nomatch", "blocked"];
const withExpert = (s, expert) => s.replace("{expert}", expert);

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
    h["Access-Control-Expose-Headers"] = "X-Answer-Source";
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
  const masked = maskPii(last.content);
  const hasPii = new RegExp(PII_TAG_RE.source).test(masked);
  const query = masked.replace(PII_TAG_RE, " ");
  const folded = fold(query).replace(ABBR_RE, (m) => ABBR[m]);
  const expert = c.expert;

  // 24/11/2026 SPEC-AI-CHAT-TONE-01 AC-03.4: chỉ đọc tin `assistant` để biết đã gửi menu chưa (không đưa tin cũ vào tìm kiếm)
  const histMenu = msgs.slice(0, -1).some((m) => m.role === "assistant" && m.content.includes(HELP_MENU_HEAD));

  // 23/11/2026 (chủ dự án: «người mới không hỏi ngay về sản phẩm»): nhận diện Ý ĐỊNH trước khi gợi ý sản phẩm/bài viết (khớp app/main.py).
  const toks = folded.match(/[a-z0-9]+/g) || [];
  const isFaq = FAQ_RE.test(folded);
  const keywords = (f) => [...new Set(f.replace(SOCIAL_RE, " ").replace(NONKEY_RE, " ").match(/[a-z0-9]+/g) || [])]
    .filter((t) => !SMALL.has(t) && !GENERIC.has(t) && !STOP.has(t) && !NOISE.has(t)
      && !(isFaq && FAQ_FILL.has(t)) && !(t.length <= 2 && !/\d/.test(t) && !KEEP2.has(t)));
  const content = keywords(folded);
  const hasStoreKey = STORE_KEYS.some((k) => folded.includes(k)) || HOURS_RE.test(folded);
  const isCb = (hasPii || CB_RE.test(folded)) && !content.some((t) => !CB_WORDS.has(t));
  const priceOnly = PRICE_RE.test(folded) && !content.some((t) => !PRICE_WORDS.has(t));
  const storeAsk = !!STORE && hasStoreKey && (!content.length || toks.every((t) => STORE_WORDS.has(t)));
  const ventOnly = VENT_RE.test(folded) && !content.some((t) => !VENT_WORDS.has(t));
  const isAck = toks.length > 0 && toks.every((t) => ACK_CORE.has(t) || ACK_FILL.has(t)) && toks.some((t) => ACK_CORE.has(t));

  let intent = "";
  if (RED_RE.test(folded) || ACC_RED_RE.test(nfcLower(query))) intent = "red";
  else if (CLAIM_RE.test(folded) || (COMMIT_RE.test(folded) && !isFaq)) intent = "claim";
  else if (BOOK_RE.test(folded) || (DOCTOR_RE.test(folded) && DOCASK_RE.test(folded))) intent = "book";
  else if (SKIN_RE.test(folded)) intent = "skin";
  else if (isCb) intent = "callback";
  else if (isFaq && !content.length) intent = "faq";
  else if (priceOnly) intent = "price";
  else if (storeAsk) intent = "store";
  else if (!content.length && BYE_RE.test(folded)) intent = "bye";
  else if (!content.length && THANKS_RE.test(folded)) intent = "thanks";
  else if (!content.length && isAck) intent = "ack";
  else if (ventOnly) intent = "vent";
  else if (!content.length) intent = (GREET_RE.test(folded) && !HELP_RE.test(folded)) ? "greet" : "help";

  let storeInfo = (STORE && (hasStoreKey || ["book", "red", "faq", "claim", "callback"].includes(intent))) ? STORE : null;
  // Ngưỡng liên quan: tiêu đề phải chứa ≥1 từ khoá thật của câu hỏi (điểm BM25 tuyệt đối không tách được câu lạc đề)
  // 24/11/2026 SPEC-AI-LLM-01: khách gõ CÓ DẤU thì từ khớp phải cùng dấu (nám ≠ nấm) — xét 20 ứng viên thay vì 8 để bù phần bị loại
  const qAcc = accentMap(query, true);
  const rel = (title, words, acc) => {
    const tt = new Set(tokenize(title)), ta = accentMap(title, false);
    // có từ khoá trùng chữ nhưng khác dấu (nám/nấm) ⇒ lạc đề dù từ khác có khớp
    if (words.some((t) => tt.has(t) && acc.has(t) && ![...acc.get(t)].some((k) => (ta.get(t) || new Set()).has(k)))) return false;
    return words.some((t) => tt.has(t));
  };
  const pick = async (catCode, k, words = content, acc = qAcc) => {
    let hits = (await search(env, request, words.join(" "), 20, catCode)).filter((d) => rel(d.title, words, acc));
    if (catCode === 2) hits = hits.filter((d) => !fold(d.title).includes("ke don")); // 24/11/2026 AC-01.5 (OQ-2): không bao giờ gợi ý SP «kê đơn» trong chat
    return hits.slice(0, k).map(({ title, url }) => ({ title, url }));
  };
  let products = [], articles = [];
  let source = "static", lead = null; // X-Answer-Source: static | llm | llm-rewrite (theo dõi tầng LLM, không đổi JSON trả về)
  if (!intent) {
    // 24/11/2026 SPEC-AI-LLM-01: có Workers AI ⇒ lấy 8 SP ứng viên cho LLM chọn ≤3; không có ⇒ y hệt bản tĩnh (3 SP đầu)
    const useLlm = llmEnabled(env);
    products = await pick(2, useLlm ? 8 : 3);
    articles = await pick(1, 2);
    if (useLlm && !products.length && !articles.length) {
      const rw = await llmRewrite(env, query); // BM25 trượt (sai chính tả, viết tắt lạ…) ⇒ nhờ LLM chuẩn hoá rồi tìm lại 1 lần
      if (rw) {
        const rf = fold(rw).replace(ABBR_RE, (m) => ABBR[m]);
        // câu chuẩn hoá phải qua lại các ý định an toàn (đỏ, cam kết khỏi bệnh, đặt lịch, chính sách) trước khi tìm SP
        const rIntent = (RED_RE.test(rf) || ACC_RED_RE.test(nfcLower(rw))) ? "red"
          : (CLAIM_RE.test(rf) || (COMMIT_RE.test(rf) && !FAQ_RE.test(rf))) ? "claim"
          : (BOOK_RE.test(rf) || (DOCTOR_RE.test(rf) && DOCASK_RE.test(rf))) ? "book"
          : FAQ_RE.test(rf) ? "faq" : "";
        if (rIntent) {
          intent = rIntent; storeInfo = STORE || null; source = "llm-rewrite";
        } else {
          const w2 = keywords(rf);
          if (w2.length) {
            const a2 = accentMap(rw, true);
            products = await pick(2, 8, w2, a2);
            articles = await pick(1, 2, w2, a2);
            if (products.length || articles.length) source = "llm-rewrite";
          }
        }
      }
    }
    if (useLlm && !intent && products.length) {
      const ch = await llmChoose(env, query, products, complianceOk);
      if (ch) {
        products = ch.chon.map((i) => products[i]);
        lead = ch.chon.length ? ch.lead : null;
        source = source === "static" ? "llm" : source;
      }
    }
    products = products.slice(0, 3);
    if (intent) { /* ý định an toàn do câu chuẩn hoá */ } else if (products.length || articles.length) intent = "product";
    else if (VENT_RE.test(folded)) intent = "vent";
    else if (storeInfo) intent = "store";
    else intent = "nomatch";
  }
  if (!["store", "book", "red", "faq", "claim", "callback", "product"].includes(intent)) storeInfo = null; // intent không in khối cửa hàng ⇒ không trả store_info
  const bookUrl = (STORE && STORE.booking_url) || "/dat-lich-tu-van";
  const skinUrl = String(env.SKIN_PAGE_URL || "/kham-da-ai").replace(/\/+$/, "");

  const storeBlock = (si) => {
    const lines = [`**${si.clinic_name || "Pharma Cosmetics"}**`];
    if (si.address) lines.push(`- Địa chỉ: ${si.address}`);
    if (si.phone) lines.push(`- Hotline/Zalo: ${si.phone}`);
    if (si.hours) lines.push(`- Giờ mở cửa: ${si.hours}`);
    lines.push(`- Đặt lịch với ${expert}: [Đặt lịch tư vấn](${si.booking_url || "/dat-lich-tu-van"})`);
    return lines.join("\n");
  };
  const menu = [HELP_MENU_HEAD,
    "- **Địa chỉ, giờ mở cửa, hotline** của cửa hàng",
    "- **Soi da bằng ảnh hoặc camera**: bấm dấu **+** cạnh ô nhập",
    `- **Làm quiz xác định loại da**: [Làm quiz](${skinUrl}?tab=quiz)`,
    "- **Gợi ý sản phẩm, bài viết** khi bạn nói tình trạng da hoặc hoạt chất quan tâm (ví dụ «mụn ẩn», «retinol»)",
    `- **Đặt lịch với ${expert}**: [Đặt lịch tư vấn](${bookUrl})`].join("\n");

  const parts = [];
  let needsContact = ["red", "claim", "callback", "faq", "nomatch"].includes(intent); // true ⇒ trang chat hiện số hotline + nút Zalo
  if (intent === "red") {
    parts.push(`Dạ, trường hợp này (đang mang thai/cho con bú, hoặc da có dấu hiệu sưng, rát, dị ứng) em không gợi ý ` +
      `sản phẩm được ạ. Bạn nên **tạm ngừng sản phẩm đang dùng** và liên hệ ${expert} để được tư vấn trực tiếp.`);
    parts.push("Nếu sưng nhiều, khó thở, tức ngực hoặc nổi mề đay toàn thân, bạn hãy **đến cơ sở y tế gần nhất ngay**.");
    if (storeInfo) parts.push(storeBlock(storeInfo));
  } else if (intent === "claim") {
    parts.push(withExpert(CLAIM_REPLY, expert));
    if (storeInfo) parts.push(storeBlock(storeInfo));
  } else if (intent === "book") {
    parts.push(withExpert(BOOK_REPLY, expert));
    if (storeInfo) parts.push(storeBlock(storeInfo));
  } else if (intent === "skin") {
    parts.push(["Dạ, em hỗ trợ soi da theo 2 cách:",
      "- **Gửi ảnh hoặc bật camera ngay trong khung chat**: bấm dấu **+** cạnh ô nhập (ảnh được phân tích ngay trên thiết bị của bạn, không gửi đi đâu)",
      `- **Làm quiz** trả lời vài câu hỏi để biết loại da: [Làm quiz](${skinUrl}?tab=quiz)`].join("\n"));
    parts.push(`Kết quả chỉ để tham khảo. Muốn có phác đồ phù hợp, bạn nên đặt lịch với ${expert}: [Đặt lịch tư vấn](${bookUrl})`);
  } else if (intent === "callback") {
    parts.push(CALLBACK_REPLY);
    if (storeInfo) parts.push(storeBlock(storeInfo));
  } else if (intent === "faq") {
    parts.push(FAQ_REPLY);
    if (storeInfo) parts.push(storeBlock(storeInfo));
  } else if (intent === "price") {
    parts.push(PRICE_ASK);
  } else if (intent === "store") {
    parts.push(STORE_OPEN);
    if (storeInfo) parts.push(storeBlock(storeInfo));
    // chỉ nói «mở chủ nhật/ngày lễ» khi suy được từ store.hours (ANTI-FAB)
    const hoursF = fold((storeInfo || {}).hours || "");
    let weekend = "";
    if (WEEKEND_RE.test(folded) && hoursF.includes("chu nhat")) weekend = hoursF.includes("ngay le") ? "Bên em mở cả chủ nhật và ngày lễ ạ. " : "Bên em mở cả chủ nhật ạ. ";
    parts.push(weekend + STORE_CLOSE);
  } else if (intent === "bye") {
    parts.push(BYE_REPLY);
  } else if (intent === "thanks") {
    parts.push(THANKS_REPLY);
  } else if (intent === "ack") {
    parts.push(ACK_REPLY);
  } else if (intent === "vent") {
    parts.push(VENT_REPLY);
  } else if (intent === "greet") {
    if (histMenu) parts.push(GREET_AGAIN); // đã gửi menu trong phiên ⇒ chào ngắn, không lặp menu
    else parts.push(GREET_FIRST, menu, GREET_ASK);
  } else if (intent === "help") {
    parts.push(HELP_INTRO, menu);
  } else if (intent === "product") {
    if (storeInfo) {
      parts.push(STORE_OPEN, storeBlock(storeInfo), PRODUCT_OPEN_ALSO);
    } else {
      parts.push(lead || (GREET_RE.test(folded) ? PRODUCT_OPEN_GREET : PRODUCT_OPEN));
    }
    if (PRICE_RE.test(folded)) parts.push(PRICE_NOTE); // hỏi giá: không báo số tiền, chỉ dẫn xem tại trang sản phẩm
    if (products.length) parts.push("**Sản phẩm tham khảo** (xem giá và thành phần chi tiết tại trang sản phẩm):\n" + products.map((p) => `- [${p.title}](${p.url})`).join("\n"));
    if (articles.length) parts.push("**Bài viết tham khảo**:\n" + articles.map((a) => `- [${a.title}](${a.url})`).join("\n"));
    if (isFaq) { parts.push(FAQ_MIXED); needsContact = true; }
    parts.push(withExpert(PRODUCT_CLOSE, expert));
    if (hasPii) parts.push(PII_NOTE);
  } else { // nomatch
    const isFollowUp = /(?:cái|loại|sản phẩm|sp|chai|tuýp|lọ)\s*(?:đầu tiên|thứ\s*[123]|này|đó|kia|trên)/i.test(query);
    if (isFollowUp) {
      parts.push("Dạ, để em tư vấn chính xác hơn, bạn vui lòng gõ lại tên sản phẩm cụ thể mà bạn đang quan tâm giúp em nhé ạ.");
    } else {
      parts.push(withExpert(NOMATCH_REPLY, expert));
    }
  }
  if (products.length || articles.length || DISCLAIMER_INTENTS.includes(intent)) parts.push(withExpert(DISCLAIMER, expert));

  let reply = parts.join("\n\n");
  if (!complianceOk(reply)) { reply = SAFE_FALLBACK; products = []; articles = []; needsContact = true; intent = "blocked"; }
  return json({ reply, related_products: products, related_articles: articles, store_info: storeInfo, needs_contact: needsContact, intent }, 200,
    { ...cors, "X-Answer-Source": intent === "blocked" ? "static" : source });
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
