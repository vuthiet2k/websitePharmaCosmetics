# Rule 03 — Chuẩn giao diện storefront (UI Standard)

Bộ chuẩn giao diện **dùng chung cho mọi trang** của storefront Pharma Cosmetics (trang chủ, danh mục, sản phẩm,
blog/bài viết, trang nội dung, tài khoản, giỏ hàng, SHB). Viết theo kiểu bộ tiêu chí duyệt theme của theme store:
mỗi mục là một **tiêu chí đo được** + **cách kiểm**. Bổ sung cho `01-quy-chuan-theme-sapo.md` (kỹ thuật Sapo) và
`02-du-an-pharma-cosmetics.md` (vận hành repo). Khi 3 file mâu thuẫn: file chuyên sâu hơn về chủ đề đó thắng
(container → 01 mục 2.1; font → 02 "Font UI chung"; còn lại theo file này).

**Áp dụng:** mọi thay đổi `snippets/`, `templates/`, `layouts/`, `assets/*.css|*.scss.bwt`. Trang mới / khối mới
phải đạt toàn bộ mục ✱ (tự động) trước khi báo xong; mục ◇ (mắt người) kiểm trên ảnh chụp.

**Công cụ kiểm:** `npm run audit:ui` (`scripts/audit-ui.js`, Playwright thật, 1440px + 390px) — chạy trên preview
local (`npm run preview`) hoặc production (`AUDIT_URL=https://hugo-theme-sept2026-test.vercel.app npm run audit:ui`). Lệnh `/goal` (để trống) chạy trọn quy trình review → sửa → deploy theo file này.
Git Bash trên Windows: đặt `MSYS_NO_PATHCONV=1` khi truyền `AUDIT_PAGES` (đường dẫn `/…` bị đổi thành `C:/Program Files/Git/…`).
Xuất `test-results/audit-ui/report.json` + ảnh chụp toàn trang; mã lỗi in ra khớp mã tiêu chí bên dưới.

---

## UI-1. Khung & lưới

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-1.1 ✱ | Không trang nào cuộn ngang ở 390px và 1440px (`scrollWidth ≤ innerWidth`). Không phần tử hiển thị nào thò ra mép phải viewport mà không nằm trong vùng `overflow` có chủ đích (carousel). | `overflowX`, `offscreen` |
| UI-1.2 ✱ | Khung nội dung = `.container` SSOT (`--pc-container-max:1280px`, gutter 32 / 30 (≥1200) / 20px (≤680)). Ở 1440px mép trái chữ của mọi khối thân trang **trùng mép trái logo header** (sai số ≤ 2px). Khung hẹp có chủ đích (form, cột đọc) nằm **bên trong** `.container`. | `containerEdges` vs `headerLeft` |
| UI-1.2b ✱ RULE CỨNG | Cấm khung tự dựng: Tailwind `max-w-4xl…7xl mx-auto px-*`, khung riêng kiểu `.sh-container` có max-width/padding riêng, hay gắn `max-w-*`/`px-*` lên `.container` (nội dung thụt 20–160px so với logo, lề lồng nhau). Class riêng của khối (`sh-container`, `svcs-*`) chỉ để bố trí bên trong và luôn đi kèm `.container`: `class="container sh-container"`. Cột đọc hẹp = `max-w-* mx-auto` (không `px-*`) bên trong `.container`. `lint:guardrails` FAIL nếu vi phạm. | `lint:guardrails`, `audit:ui` |
| UI-1.2c | Phần tử sticky nằm dưới header (thanh menu nhóm dịch vụ, sidebar lọc…) dùng `top: var(--pc-sticky-offset)` (`storefront-v3.css`: 44px ≥992px, 57px mobile = chiều cao header khi bám đỉnh) — không ghi số riêng (từng 113px ⇒ hở khe khi cuộn). | ảnh chụp khi cuộn |
| UI-1.3 ◇ | Một trang chỉ có **một trục** căn: khối căn giữa thì cả cụm căn giữa (tiêu đề + mô tả + nút), không trộn khối căn trái và căn giữa trong cùng một dải. Dải pháp lý + bản quyền footer căn giữa. | ảnh chụp |
| UI-1.4 | Breakpoint dùng chung: `≤680` (mobile hẹp), `≤767` (mobile), `≤991` (tablet), `≥992` (desktop), `≥1200`. Không đặt breakpoint lẻ (700, 768, 800…) cho khối mới. | review code |
| UI-1.5 ◇ | Khoảng cách dọc giữa các section trên cùng trang đều nhau: desktop 64–80px, mobile 40–56px. Khoảng cách tiêu đề section → nội dung 24–32px. | ảnh chụp |

## UI-2. Chữ (typography)

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-2.1 ✱ | Font chữ duy nhất **Montserrat** (02 "Font UI chung"). Ngoại lệ: font icon, vùng mã monospace. | `fonts` |
| UI-2.2 ✱ | Cỡ chữ hiển thị chỉ ra các bậc của thang token (desktop / mobile ≤767px): `--fs-3xs` 10 · `--fs-2xs` 11 (nhãn/eyebrow) · `--fs-xs` 12 (meta) · `--fs-sm` 13 (phụ) · `--fs-body` 14 (body, nút) · `--fs-base` 15 (tên SP) · `--fs-md` 16 (lead, giá, input) · `--fs-card` 17/16 (tiêu đề thẻ) · `--fs-lg` 18/17 · `--fs-h4` 20/18 · `--fs-xl` 24/20 (thẻ lớn, h1 SP) · `--fs-h3` 28/24 · `--fs-2xl` 32/26 (tiêu đề section, h1 trang) · `--fs-display` 36/28 · `--fs-3xl` 40/32 · `--fs-hero` 46/32 · `--fs-jumbo` 56/40 · `--fs-giant` 200/100 (số 404). | `oddSizes` |
| UI-2.3 | Trang chủ dùng `--ts-*` (khối `TYPE-SCALE` cuối `assets/home-portal-integration.css`) — đây là **bí danh vai trò** trỏ về `--fs-*`, không khai báo px. | review code |
| UI-2.4 | Độ đậm: 400 body · 500 nhấn nhẹ/menu · 600 tiêu đề, nút · 700 số liệu, giá · 800 chỉ cho nhấn khuyến mãi (Flash Sale). Không 300, không 560/650. | review code |
| UI-2.5 ✱ | Mỗi trang đúng **1 thẻ `<h1>`** hiển thị. | `h1` |
| UI-2.7 | Tiêu đề (h1–h3, tiêu đề section) **không** `text-transform:uppercase`, viết hoa chữ đầu câu như trang chủ; chữ HOA chỉ cho nhãn/eyebrow 11px và nút phụ nhỏ. Khối chuẩn hoá: `HEADING-SCALE` cuối `assets/storefront-v3.css`. Nội dung nhập Hoa Từng Chữ (vd "Đội Ngũ Chuyên Gia") là dữ liệu — sửa ở nguồn nội dung khi khách đồng ý, không ép bằng CSS. | `heads` ◇ |
| UI-2.8 | Tailwind CDN `text-xs…text-6xl` đã map về `--fs-*` trong `layouts/theme.bwt`. Núm Admin "Cỡ chữ tổng thể" (`theme_font_scale`) chỉ còn tác động spacing/CSS rem cũ — không dùng nó để chỉnh cỡ chữ. | review code |
| **UI-2.9 ✱ RULE CỨNG** | **Không ghi cứng cỡ chữ.** Mọi `font-size` và phần cỡ của `font:` shorthand trong `assets/`, `snippets/`, `layouts/`, `templates/` (kể cả `style=""` inline, chuỗi HTML trong JS của template) phải là `var(--fs-*)` hoặc `var(--ts-*)`. Cấm px / rem / pt / em phân số; `clamp()` chỉ được ghép `var(--fs-*)` với `vw`. Được phép: `0` (mẹo ẩn chữ), `inherit`, `em ≥ 1` (icon/mũi tên tỉ lệ theo chữ cha), fallback bên trong `var(--fs-x, …)`. Cần cỡ mới ⇒ thêm bậc vào `snippets/design_tokens.bwt` (cả bản mobile) và cập nhật UI-2.2, không ghi số tại chỗ. Ngoại lệ có chủ đích: MOPS admin (`layouts/mops-admin.bwt`, `page_mops_admin.scss.bwt`, `mops_admin_*`, `assets/mops-*` — layout riêng không nạp design_tokens, bản in hoá đơn dùng pt) và file vendor. **Cưỡng chế:** `npm run lint:guardrails` (bước đầu của `build:sapo`) FAIL kèm file:dòng. | `lint:guardrails` |
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
| UI-5.1 ◇ | Hai họ thẻ SP, mỗi họ một kiểu: **thẻ trang chủ** (`product_grid_office_sale`, theo thiết kế trang chủ: nút viền, nhãn góc trái) và **thẻ catalog** cho mọi nơi khác (danh mục, PDP "Có thể bạn thích"/"Liên quan", đã xem, tài khoản — theo mockup `design/danh-muc/`: nhãn giảm giá dạng viên đỏ góc trái, nút xanh rừng `#003F2D` bo 8px, giá `#003F2D`). Chung: ảnh tỉ lệ cố định, tên 15/14px 600 cắt đúng 2 dòng, giá 16/15px 700 + giá gốc 13px gạch, nút 14/13px. Khối `PCARD-UNIFY` cuối `assets/storefront-v3.css`. | ảnh chụp |
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

## UI-9. Icon — thư viện dùng chung (RULE CỨNG, 17/10/2026)

**Thư viện duy nhất: Font Awesome 6 Free** (bản 6.5.0, CDN cdnjs) — nạp **một lần** ở `layouts/theme.bwt` (và
`layouts/chat.bwt`):
`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">`.
Đổi phiên bản = sửa đúng 2 thẻ này, cùng lúc. Không nạp thêm bộ icon khác (Bootstrap Icons, Material, Ionicons…) cho
storefront. Tra tên icon: fontawesome.com/search?o=r&m=free (chỉ lấy icon **Free**; icon Pro như `fa-sparkles`,
style `fal`/light hiện ô trống).

| Mã | Tiêu chí | Kiểm |
| :-- | :-- | :-- |
| UI-9.1 ✱ | Cú pháp v6: `<i class="fa-solid fa-house" aria-hidden="true"></i>`. Cấm tiền tố cũ `fas`/`far`/`fab`/`fa fa-…` và tên v4/v5 (`fa-times`→`fa-xmark`, `fa-user-md`→`fa-user-doctor`, `fa-search`→`fa-magnifying-glass`, `fa-check-circle`→`fa-circle-check`, `fa-shield-alt`→`fa-shield-halved`, `fa-map-marker-alt`→`fa-location-dot`…). Giá trị icon trong Admin (`*_icon` ở settings) cũng theo cú pháp này. | `lint:guardrails` |
| UI-9.2 | **Một kiểu nét**: mặc định `fa-solid` cho mọi icon giao diện; `fa-brands` cho logo mạng xã hội; `fa-regular` **chỉ** cho trạng thái "chưa chọn" của icon bật/tắt (tim yêu thích, sao) hoặc cả một cụm đồng bộ — không trộn solid/regular trong cùng một cụm (vd thanh header, bottom nav). | ảnh chụp |
| UI-9.3 ✱ | Không dùng **emoji / ký tự** làm icon trong markup (✓ ➔ ⭐ 🎁 ⚠️ ☏ ✉ →…). Mũi tên sau chữ link/nút = `fa-solid fa-arrow-right`; dấu tick = `fa-solid fa-check`. Pseudo-element cần icon: `content:"\f00c"; font-family:"Font Awesome 6 Free"; font-weight:900`. Chuỗi gán bằng `textContent` (nút trả lời nhanh chat) thì bỏ icon, không chèn emoji. | `lint:guardrails` |
| UI-9.4 ✱ | Không dùng **ảnh làm icon** (`icon_*.png/gif/jpg`). Ngoại lệ là ảnh nhãn đồ hoạ có chữ: `icon_pre_order.png` (phủ "Đặt trước" trên ảnh SP), `icon_menu_order.png` (nhãn cạnh menu). | `lint:guardrails` |
| UI-9.5 | **SVG nhúng tay** chỉ cho: logo/brand mark (`PharmaCosmetics.svg`), cờ ngôn ngữ, logo thanh toán/sàn (MoMo, ZaloPay, VNPAY, Visa, Shopee, Lazada), hình minh hoạ/khung camera, biểu đồ. Icon giao diện có trong FA Free phải dùng FA. SVG icon cũ còn lại (chủ yếu trang chủ portal, soi da, tài khoản) chuyển dần khi sửa file đó; số `<svg>` mỗi file là chỉ số baseline `inlineSvg` — **không được tăng**. | `lint:guardrails` (baseline) |
| UI-9.6 | Kích cỡ icon bằng token chữ (`font-size: var(--fs-*)`, UI-2.9), màu `currentColor` theo chữ cha; không đặt `width/height` px cho `<i>`. Icon trang trí luôn `aria-hidden="true"`; icon đứng một mình trong nút/link thì nút có `aria-label`. | review |
| UI-9.7 | Ngoại lệ có chủ đích: **MOPS admin** dùng Material Symbols (layout `mops-admin`, `mops_admin_*`, `assets/mops-*`) — không áp UI-9. | — |

---

## Quy trình kiểm toàn bộ sản phẩm

1. `npm run preview` → `npm run audit:ui` (danh sách trang đại diện mỗi template ở `scripts/audit-ui.js`; thêm trang mới
   vào danh sách khi tạo template/alias mới).
2. Sửa hết lỗi ✱. Mở ảnh chụp trong `test-results/audit-ui/` duyệt mục ◇ theo từng trang, ưu tiên mobile.
3. Sửa CSS **theo phạm vi** (scope class trang/section — 02 mục 3), không vá bằng selector toàn cục gây rò rỉ.
4. Chạy lại `audit:ui` tới khi sạch, rồi `build:sapo`, commit, deploy và chạy lại `audit:ui` trên production.
