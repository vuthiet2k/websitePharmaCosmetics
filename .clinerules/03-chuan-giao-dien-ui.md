# Rule 03 — Chuẩn giao diện storefront (UI Standard)

Bộ chuẩn giao diện **dùng chung cho mọi trang** của storefront Pharma Cosmetics (trang chủ, danh mục, sản phẩm,
blog/bài viết, trang nội dung, tài khoản, giỏ hàng, SHB). Viết theo kiểu bộ tiêu chí duyệt theme của theme store:
mỗi mục là một **tiêu chí đo được** + **cách kiểm**. Bổ sung cho `01-quy-chuan-theme-sapo.md` (kỹ thuật Sapo) và
`02-du-an-pharma-cosmetics.md` (vận hành repo). Khi 3 file mâu thuẫn: file chuyên sâu hơn về chủ đề đó thắng
(container → 01 mục 2.1; font → 02 "Font UI chung"; còn lại theo file này).

**Áp dụng:** mọi thay đổi `snippets/`, `templates/`, `layouts/`, `assets/*.css|*.scss.bwt`. Trang mới / khối mới
phải đạt toàn bộ mục ✱ (tự động) trước khi báo xong; mục ◇ (mắt người) kiểm trên ảnh chụp.

**Công cụ kiểm:** `npm run audit:ui` (`scripts/audit-ui.js`, Playwright thật, 1440px + 390px) — chạy trên preview
local (`npm run preview`) hoặc production (`AUDIT_URL=https://hugo-theme-sept2026-test.vercel.app npm run audit:ui`).
Xuất `test-results/audit-ui/report.json` + ảnh chụp toàn trang; mã lỗi in ra khớp mã tiêu chí bên dưới.

---

## UI-1. Khung & lưới

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-1.1 ✱ | Không trang nào cuộn ngang ở 390px và 1440px (`scrollWidth ≤ innerWidth`). Không phần tử hiển thị nào thò ra mép phải viewport mà không nằm trong vùng `overflow` có chủ đích (carousel). | `overflowX`, `offscreen` |
| UI-1.2 ✱ | Khung nội dung = `.container` SSOT (`--pc-container-max:1280px`, gutter 32 / 30 (≥1200) / 20px (≤680)). Ở 1440px mép trái chữ của mọi khối thân trang **trùng mép trái logo header** (sai số ≤ 2px). Khung hẹp có chủ đích (form, cột đọc) nằm **bên trong** `.container`. | `containerEdges` vs `headerLeft` |
| UI-1.3 ◇ | Một trang chỉ có **một trục** căn: khối căn giữa thì cả cụm căn giữa (tiêu đề + mô tả + nút), không trộn khối căn trái và căn giữa trong cùng một dải. Dải pháp lý + bản quyền footer căn giữa. | ảnh chụp |
| UI-1.4 | Breakpoint dùng chung: `≤680` (mobile hẹp), `≤767` (mobile), `≤991` (tablet), `≥992` (desktop), `≥1200`. Không đặt breakpoint lẻ (700, 768, 800…) cho khối mới. | review code |
| UI-1.5 ◇ | Khoảng cách dọc giữa các section trên cùng trang đều nhau: desktop 64–80px, mobile 40–56px. Khoảng cách tiêu đề section → nội dung 24–32px. | ảnh chụp |

## UI-2. Chữ (typography)

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-2.1 ✱ | Font chữ duy nhất **Montserrat** (02 "Font UI chung"). Ngoại lệ: font icon, vùng mã monospace. | `fonts` |
| UI-2.2 ✱ | Cỡ chữ chỉ lấy từ thang: **10** (đơn vị đồng hồ đếm ngược) · **11** nhãn/eyebrow · **12** meta · **13** phụ · **14** body · **15** tên SP/tiêu đề nhỏ · **16** lead/giá · **17–18** tiêu đề thẻ · **20/24** tiêu đề thẻ lớn · **26/32** tiêu đề section (mobile/desktop) · **36–46** tiêu đề trang/chương. Không cỡ lẻ (13.5, 14.5, 18.75…) và **không dùng `rem`/`em` cho cỡ chữ** — `html{font-size}` nhân `theme_font_scale` sinh cỡ lẻ (13.125, 12.6px). | `oddSizes` |
| UI-2.3 | Trang chủ dùng token `--ts-*` (khối `TYPE-SCALE` cuối `assets/home-portal-integration.css`); trang khác dùng đúng các giá trị ở UI-2.2. | review code |
| UI-2.4 | Độ đậm: 400 body · 500 nhấn nhẹ/menu · 600 tiêu đề, nút · 700 số liệu, giá · 800 chỉ cho nhấn khuyến mãi (Flash Sale). Không 300, không 560/650. | review code |
| UI-2.5 ✱ | Mỗi trang đúng **1 thẻ `<h1>`** hiển thị. | `h1` |
| UI-2.6 ◇ | Tiêu đề không vỡ 1 chữ mồ côi ở dòng cuối khi tránh được (`text-wrap:balance` cho h1/h2). Tên sản phẩm cắt **2 dòng** gọn (không lộ nửa dòng 3). | ảnh chụp |

## UI-3. Màu, viền, bo góc, bóng

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-3.1 | Màu lấy từ token (`snippets/design_tokens.bwt`, `--mainColor`, `--pc-brand-*`); thương hiệu: Primary `#3CB371`, Deep Forest `#003F2D`, Dark Forest `#002E23`, Secondary `#075B40`; trung tính pha xanh rừng (`#F4F7F4`, `#DCE5DF`, `#4E6560`), không xám lạnh. Đỏ chỉ cho giảm giá/khẩn cấp. | review code |
| UI-3.2 ◇ | Mỗi loại phần tử **một** kiểu bo góc trên toàn site: thẻ/khung nội dung 2px (editorial) hoặc theo bộ thẻ SP; nút cùng nhóm cùng radius; pill (999px) chỉ cho chip/tag/nút phụ dạng viên. | ảnh chụp |
| UI-3.3 ◇ | Viền 1px màu `--line`/`#DCE5DF`; bóng chỉ dùng `--shadow` nhẹ — không trộn thẻ có bóng và thẻ không bóng trong cùng lưới. | ảnh chụp |

## UI-4. Nút, liên kết, form

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-4.1 ✱ | Vùng bấm trên mobile ≥ 32×32px (khuyến nghị 44px cho nút chính). | `smallTargets` |
| UI-4.2 | Cỡ chữ nút 14px (mobile 13px), weight 600–700; nút chính cao 44–48px. Nút cùng vai trò trong cùng loại thẻ có **cùng** cỡ/độ đậm ở mọi section. | review + ảnh |
| UI-4.3 ◇ | Mỗi khối tối đa một nút chính (filled); hành động phụ dạng viền hoặc link có mũi tên "→". | ảnh chụp |
| UI-4.4 | Input/select cao ≥ 44px, chữ ≥ 14px (iOS không zoom khi focus cần ≥16px cho input trên mobile). | review |

## UI-5. Thẻ sản phẩm & lưới sản phẩm

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-5.1 ◇ | Một mẫu thẻ SP cho mọi nơi (trang chủ, danh mục, tìm kiếm, liên quan): ảnh tỉ lệ cố định 1:1, NCC 11px chữ hoa, tên 15/14px 600 cắt 2 dòng, giá 16/15px 700 + giá gốc 13px gạch, nút 14/13px. | ảnh chụp |
| UI-5.2 ◇ | Các thẻ trong một hàng cao bằng nhau; nút bám đáy thẻ thẳng hàng. | ảnh chụp |
| UI-5.3 | Không bịa dữ liệu (đánh giá sao, % đã bán) — thiếu dữ liệu thì ẩn phần tử (02 mục 7). | review |

## UI-6. Ảnh & media

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-6.1 ✱ | Không ảnh vỡ (`naturalWidth = 0`). | `imgs` BROKEN |
| UI-6.2 ✱ | Mọi `<img>` có `alt` (ảnh trang trí: `alt=""`), có `width`/`height`; ảnh dưới màn đầu `loading="lazy"`; ảnh hero/LCP preload (01 mục 4). | `imgs` NOALT |
| UI-6.3 ◇ | Ảnh trong cùng lưới cùng tỉ lệ khung (`aspect-ratio` + `object-fit:cover`), không méo. | ảnh chụp |

## UI-7. Header, footer, phần tử nổi

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-7.1 ◇ | Header giống nhau ở mọi trang (không layout riêng bỏ header — xem sự cố 18/09 ở 02 mục 7). | ảnh chụp |
| UI-7.2 ◇ | Nút nổi (lên đầu trang, Zalo/Messenger, liên hệ) không che nút chính / giá / nút giỏ trên mobile; không chồng lên bottom-nav. | ảnh chụp mobile |
| UI-7.3 ◇ | Footer: cột thương hiệu + 3 cột menu (mobile: accordion); dải pháp lý (tên HKD, địa chỉ, MST, badge "Đã thông báo BCT") **căn giữa**; dòng bản quyền căn giữa. | ảnh chụp |

## UI-8. Chất lượng chạy

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-8.1 ✱ | Không lỗi JS (`pageerror`) trên trang. Lỗi console do dịch vụ ngoài (mạng chặn ở local) ghi chú, không tính. | `errors` |
| UI-8.2 ✱ | Không trang nào trả lỗi render Liquid (chuỗi `Liquid error`, `SYSTEM.LINQ`, `{{`, `{%` lộ ra màn hình). | `liquidLeak` |
| UI-8.3 ◇ | Trạng thái rỗng (giỏ trống, danh mục 0 SP, chưa đăng nhập) có thông điệp + nút dẫn tiếp, không để khoảng trắng. | ảnh chụp |

---

## Quy trình kiểm toàn bộ sản phẩm

1. `npm run preview` → `npm run audit:ui` (danh sách trang đại diện mỗi template ở `scripts/audit-ui.js`; thêm trang mới
   vào danh sách khi tạo template/alias mới).
2. Sửa hết lỗi ✱. Mở ảnh chụp trong `test-results/audit-ui/` duyệt mục ◇ theo từng trang, ưu tiên mobile.
3. Sửa CSS **theo phạm vi** (scope class trang/section — 02 mục 3), không vá bằng selector toàn cục gây rò rỉ.
4. Chạy lại `audit:ui` tới khi sạch, rồi `build:sapo`, commit, deploy và chạy lại `audit:ui` trên production.
