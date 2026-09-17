# AGENTS.md — Chỉ dẫn cho AI agent làm việc trong repo này

Repo: **websitePharmaCosmetics** — theme giao diện **Sapo Web (.bwt)** cho Pharma Cosmetics
(nhánh làm việc: `hugo-theme-sept2026`).

## Bắt buộc đọc trước khi sửa bất kỳ file theme nào

1. [`Rule&HDKTXD.md`](./Rule&HDKTXD.md) — **Cẩm nang Quy chế, Rule & Hướng dẫn Kỹ thuật phát triển
   Theme Sapo Web** (nguồn chuẩn duy nhất: checklist review theme, quy chuẩn `theme.bwt`, Liquid,
   38 objects, `settings_schema.json`, kỹ thuật tính năng, hiệu năng/SEO, quy chế đối tác).
2. [`.clinerules/01-quy-chuan-theme-sapo.md`](./.clinerules/01-quy-chuan-theme-sapo.md) — bản chắt lọc
   **BẮT BUỘC** của cẩm nang (áp dụng cho mọi thay đổi `templates/`, `snippets/`, `layouts/`,
   `configs/`, `assets/`) + self-check trước khi báo hoàn thành.
3. [`.clinerules/02-du-an-pharma-cosmetics.md`](./.clinerules/02-du-an-pharma-cosmetics.md) — thực tế
   repo: lệnh dev/build/test, quy ước code & commit, giới hạn deploy Vercel, những việc phải tránh.
4. [`README.md`](./README.md) — tổng quan dự án, cấu trúc thư mục, danh mục tài liệu.

## Tóm tắt nhanh (không thay thế 2 file rule ở trên)

- Nội dung hiển thị phải **cấu hình hoá**: `settings.<id>` + `| default:` trong snippet, khai báo
  `id`/`default` ở `configs/settings_schema.json`, giá trị ở `configs/settings_data.json`.
- Liquid: chuỗi rỗng là TRUE ⇒ kiểm tra bằng `!= blank`; ảnh phải qua `img_url` + `alt` riêng +
  `width`/`height`, `loading="lazy"` (trừ ảnh hero/LCP phải preload); mỗi trang 1 `<h1>`.
- Kiểm tra tối thiểu trước khi báo xong: parse JSON config, `npm run build` khi sửa asset,
  `npm run test:portal` khi sửa snippet Home Portal.
- Commit: **conventional commits + tiếng Việt có dấu**; comment tiếng Việt nêu lý do (kèm ngày/mã
  vấn đề khi có: `REOPEN`, `T-xxx`, `MOPS`).
- Deploy: push nhánh `hugo-theme-sept2026` chỉ tạo **Preview**; production alias
  `https://hugo-theme-sept2026-test.vercel.app` chỉ đổi khi deploy thủ công
  `npx vercel --prod --yes` (**cần token/login** — máy dev không lưu credential).
- Không dựng lại `.project-agent/`; không bịa dữ liệu (đánh giá, % đã bán, thống kê);
  không commit `dist/`, `vercel-dist/`, `node_modules/`, `.env*` thật, `.vercel/`.
- **Rule phải có sẵn từ đầu dự án trong `.clinerules/`/`Rule&HDKTXD.md` — không phải thứ đi "phát hiện
  dần" qua từng phase việc.** Rule là nguyên tắc đứng vững quanh năm bất kể đang làm việc gì: cấu hình
  hoá (không hardcode), dùng "Chuyên gia" chứ không "Bác sĩ" (RULE-P0-02), ảnh phải `img_url`+`alt`
  riêng, v.v. — những thứ này *phải* nằm trong rule chuẩn trước khi bắt tay code, không đợi một phase
  cụ thể "phát hiện" ra rồi mới ghi lại.
- `phase/<tên-việc>/` vẫn dùng được để chia việc theo từng đầu việc cụ thể (báo cáo QA cần đối chiếu,
  bản nháp thiết kế...) — nhưng đó là **không gian làm việc tạm, làm xong thì thôi**: xong việc thì dọn
  (xoá hoặc archive), không để tồn tại vĩnh viễn như một nguồn rule. Bất kỳ phát hiện nào trong lúc làm
  phase mà **đứng vững lâu dài** (vd một mapping kiến trúc, một quyết định thiết kế chốt) phải được chép
  thẳng vào `.clinerules`/`Rule&HDKTXD.md` trước khi đóng phase đó — không để nó chỉ tồn tại trong
  `phase/` rồi biến mất theo phase.