# Kế hoạch thực thi: một font toàn website, SHB theo giao diện Pharma, dọn CSS/JS

Ngày lập: 19/09/2026. Repo: `E:/PHARMA COSMETICS/websitePharmaCosmetics`.
Đối tượng thực thi: Codex với model 5.6 Luna. Đây là kế hoạch; lượt lập kế hoạch chưa sửa theme.

## 1. Mục tiêu và phạm vi đã được yêu cầu

1. Toàn bộ chữ giao diện dùng một họ font chung: heading, body, menu, button, form, giá, badge, bảng, popup, mobile navigation, các trang khách hàng, AI chat và MOPS.
2. Toàn bộ trang nội dung SHB dùng cùng hệ giao diện Pharma hiện hành: font, token màu, khung nội dung, khoảng cách, tiêu đề, card, nút, form, breadcrumb và trạng thái tương tác. Không chỉ đổi header/footer.
3. Xoá CSS/JS thực sự không dùng; bỏ selector và code cũ đã được thay thế. Không xoá chức năng còn hoạt động.
4. Giữ dữ liệu, URL, cấu hình Admin và hợp đồng nghiệp vụ hiện hành. Không dựng giao diện mới, không thiết kế lại trang chủ Pharma.

**Font đã chốt: Montserrat**, được người dùng xác nhận trong hội thoại ngày 19/09/2026 để đồng bộ phong cách menu cũ. Áp dụng cả cho các phần đang dùng Inter như body storefront, MOPS, AI chat và form. Không hỏi lại lựa chọn font, không tự đổi về Inter.

Ngoại lệ không tính là font chữ thứ hai: Font Awesome, Material Symbols, swiper-icons và glyph icon; chữ đã chuyển thành vector trong logo/ảnh. Không áp Montserrat bằng `* { font-family: ... !important }` làm hỏng icon. Chuỗi fallback hệ thống được phép để xử lý lỗi tải font. Mã/JSON/ID đang dùng monospace cũng cần rà soát và đồng bộ nếu là chữ UI; không tự mở rộng ngoại lệ monospace cho badge, eyebrow, giá.

## 2. Bối cảnh phải giữ qua phiên làm việc

- Đã chuyển `page.indexskinhealthy`, `page.skinhealthy-services`, `collection.skinhealthy`, `page.ai-skin-quiz` về `layouts/theme.bwt`.
- Đã xoá `layouts/skinhealthy.bwt`, `layouts/clean.bwt`. Không dựng lại.
- `layouts/chat.bwt` được giữ theo quyết định trước đó; `layouts/mops-admin.bwt` là shell quản trị riêng. Đồng bộ font của chúng, không gộp kiến trúc quản trị/chat vào storefront.
- Logic SHB còn dùng nằm ở `snippets/skinhealthy_content_style.bwt` và `snippets/skinhealthy_content_script.bwt`. `SHCart` lưu `sh_svc_cart` và phát `shCartChange`.
- `indexskinhealthy` không phải Home Portal. Giữ điều kiện loại nó khỏi CSS/JS, preload và skip link của Portal.
- AI chat đã bỏ CSS khoá cuộn html/body, giới hạn reset trong `.ai-skin-chat-app`, có H1 lấy dữ liệu trang.
- Working tree đang có thay đổi từ trước, gồm tài khoản, schema, rule và đợt gộp layout. Không reset/revert/clean toàn repo; không ghi đè thay đổi của người dùng.
- Lượt trước đã build và chạy 18/18 test Portal thành công. Đây chỉ là baseline lịch sử, không thay cho kiểm tra sau thay đổi lần này.

## 3. Bắt buộc đọc và nguyên tắc làm việc

Đọc `AGENTS.md`, `Rule&HDKTXD.md`, `.clinerules/01-quy-chuan-theme-sapo.md`, `.clinerules/02-du-an-pharma-cosmetics.md`, `README.md` trước khi sửa. Kiểm tra AGENTS bổ sung nếu có.

- Giữ Sapo Liquid `.bwt`; không đổi sang framework khác, không sửa syntax theme để chiều LiquidJS.
- Nội dung mới hoặc sửa phải dùng `settings` + default, schema + data tương ứng; giữ nguyên giá trị người dùng đã nhập. Không tự xoá field SHB chỉ vì không còn layout cũ.
- Ảnh dùng `img_url`, alt riêng, kích thước; LCP preload/eager, ảnh dưới fold lazy. Một H1/trang, meta/OG/JSON-LD đúng ngữ cảnh.
- Dùng “Chuyên gia”; không bịa nội dung, đánh giá, số liệu, thành tích hoặc cam kết y khoa.
- Giữ quyết định topbar/footer trắng trên nền mainColor; không tự đổi màu để sửa contrast trong việc đồng bộ này.
- Không thay backend MOPS/GAS, API contract, thanh toán, quyền truy cập, dữ liệu nghiệp vụ hay secrets.
- Không thêm dependency nếu công cụ hiện có đáp ứng. Không commit/push/deploy khi chưa được yêu cầu.
- Tên file mới trong kế hoạch là đề xuất, chỉ tạo nếu không có nơi phù hợp hiện hữu. Không tạo nhiều abstraction chỉ để thay font.
- Thực thi tuần tự từng gói công việc; không tự spawn agent. Sau mỗi gói ghi trạng thái, file đổi, kiểm tra và bước tiếp theo vào `STATUS.md` cùng thư mục này.
- Không cần hỏi lại cho thao tác sửa/xoá CSS/JS đã được chứng minh nằm trong phạm vi. Nếu file chưa chứng minh được thừa, giữ và ghi lý do; tiếp tục phần độc lập.

## 4. Bản đồ đầu vào đã đối chiếu repo

### Nguồn font và lớp giao diện

| Nơi | Thực trạng cần xử lý |
| --- | --- |
| `layouts/theme.bwt` | Google Fonts: Montserrat, Inter, Playfair Display, IBM Plex Mono; Tailwind CDN có font heading riêng |
| `snippets/storefront_theme.bwt` | Tải Fraunces; `--pc-font-display` là Fraunces, `--pc-font-body` là Inter |
| `snippets/header_style.bwt` | `--font-primary`, secondary, display, mono khai báo nhiều họ font |
| `assets/storefront-v3.css` | Có mapping token và override heading `!important` |
| `assets/home-portal.css` | `--f-display/body/mono/brand` khai báo trực tiếp các font khác nhau |
| `snippets/pharma_ui_kit.bwt` | Có font literal và override `!important` |
| `snippets/pc_clinical_components.bwt` | Có khai báo font trực tiếp |
| `snippets/skinhealthy_content_style.bwt` | `--sh-serif/sans/mono`, màu và style nội dung kế thừa layout SHB cũ |
| `assets/page_ai_skin_quiz.scss.bwt` | `--chat-font-sans/display` riêng |
| `layouts/chat.bwt`, `layouts/mops-admin.bwt` | Nguồn tải font riêng; MOPS có cả stack hệ thống và font icon |
| `tailwind.config.js`, `assets/page_mops_admin.scss.bwt` | Font build và các stack monospace/UI cần rà soát |

Bảng trên là điểm bắt đầu, không phải danh sách đầy đủ. Phải tìm toàn repo nguồn đang được render để phát hiện inline CSS, shorthand `font`, SVG text, style do JS sinh, content rich text và alias token khác.

### Trang SHB bắt buộc chuyển đổi

| Template | Nội dung và hành vi phải giữ |
| --- | --- |
| `templates/page.indexskinhealthy.bwt` | Hero, các section cấu hình, gallery/lightbox, before-after, journey, chương trình, chuyên gia, FAQ, CTA, JSON-LD và JS inline đang dùng |
| `templates/page.skinhealthy-services.bwt` | Hub nhóm dịch vụ; link_list/config collection; các nhánh fallback và empty state |
| `templates/collection.skinhealthy.bwt` | Tiêu đề collection, tab nhóm, sidebar/filter hiện có, lưới card, phân trang và CSS inline |
| `templates/page.skinhealthy-service-detail.bwt` | Sản phẩm Sapo thật, ảnh/mô tả/giá/variant, còn-hết lịch, add-to-cart hiện có |
| `snippets/product_grid_skinhealthy.bwt` | Card dịch vụ dùng chung hub/collection; ID, link, giá/cọc, trạng thái và hành vi chọn dịch vụ |

Các trang liên quan phải kiểm kê và đồng bộ các thành phần UI chung: `page.spa-services`, `page.chuyen-gia`, `page.chuyen-gia-detail`, `page.clinical-proof`, `page.dat_lich_tu_van`, `page.patient-portal`, `page.payment`, `page.ai-skin-quiz`, `page.ai-skin-quiz-results`. Đọc code/route trước khi phân loại, không mặc định tất cả đều dùng `SHCart`. Phạm vi font bao phủ cả trang còn lại của website.

### Asset SHB hiện còn được tham chiếu — CHƯA được coi là file thừa

- `assets/global_skinhealthy.scss.bwt`: đã tách phần `sh-reveal`/utility còn sống sang `skinhealthy_content_style.bwt` và xoá ở Gói E.
- `assets/page_skinhealthy_home.scss.bwt`: đang nạp cho `indexskinhealthy`.
- `assets/page_skinhealthy_services.scss.bwt`, `assets/comp_skinhealthy_card.scss.bwt`: hub/collection đang gọi.
- Hai snippet `skinhealthy_content_*`: đang được layout chung include có điều kiện; không xoá mù quáng.
- JS tương tác trang chủ SHB còn inline trong template. Không suy ra “không có file JS SHB” nghĩa là không có logic cần giữ.

## 5. Gói A — Chụp baseline và lập inventory

- [ ] Ghi nhánh, `git status --short`, danh sách thay đổi có sẵn. Không tạo baseline bằng `git reset`.
- [ ] Đọc mockup liên quan trong `design/`, đặc biệt brand guideline Home Portal, đề xuất SHB và `design/auth/`. Khung Pharma hiện hành là nguồn để đồng bộ; mockup cũ không được dùng để khôi phục font/layout đã bị thay thế.
- [ ] Lập `INVENTORY.md`: template → URL/preview route → layout → snippet → CSS → JS → token font → chức năng.
- [ ] Quét tất cả template, kể cả `customers/`, view AJAX/JSON, password, admin/chat. Phân biệt trang HTML đầy đủ với fragment/JSON, không bọc layout/H1 vào endpoint dữ liệu.
- [ ] Chụp ảnh baseline SHB 320/390/768/1440/1920px; đo header, container, H1, card, CTA, form. Lưu trong thư mục tạm được gitignore, không đưa ảnh generated vào theme.
- [ ] Ghi lỗi có sẵn riêng với lỗi mới, gồm console, asset 404, overflow, font, link/route không có dữ liệu preview.
- [ ] Liệt kê font request + computed font, không chỉ grep mã nguồn.

Checkpoint A: đủ bản đồ file thật và chức năng; xác định nơi chứa token chuẩn cùng các thành phần Pharma sẽ tái sử dụng.

## 6. Gói B — Chốt hợp đồng giao diện chung

- [ ] Ghi `UI-CONTRACT.md` ngắn: font chính, stack fallback, weight thực dùng, kiểu H1–H6/body/label/button/caption; container, gutter, section gap, card, input, button, badge, border/radius và breakpoint.
- [ ] Lấy kích thước/màu/component từ mã Pharma hiện hữu; không bịa một design system mới hoặc lấy số tùy ý rồi phủ toàn site.
- [ ] Chọn một token font gốc. Các alias `--pc-font-*`, `--font-*`, `--f-*`, `--sh-*`, `--chat-font-*` cùng trỏ đến token gốc trong giai đoạn chuyển đổi. Đảm bảo token có mặt cả trong layout độc lập.
- [ ] Xác minh setting font đã có trước khi tạo field. Nếu giữ font cố định theo quyết định người dùng, tập trung khai báo tại một nguồn; nếu cấu hình Admin đã có thì phải tiếp tục tôn trọng nó.
- [ ] Phân biệt “một mẫu UI” với “mọi trang giống bố cục”: hub vẫn là hub, collection vẫn có lọc/phân trang, chi tiết vẫn có form mua, chat vẫn có vùng hội thoại.
- [ ] Không thay cấu trúc section, thứ tự nội dung, URL hay logic nghiệp vụ nếu chỉ cần đổi class/style để đồng bộ.

Checkpoint B: ghi hợp đồng có thể review rồi tiếp tục triển khai; không tự dừng chờ phê duyệt khi chỉ áp giao diện hiện hữu theo yêu cầu.

## 7. Gói C — Đồng bộ font trên toàn website

- [ ] Hợp nhất nguồn tải font; mỗi trang chỉ tải một họ font nội dung, với đúng weight/style sử dụng và `display=swap`. Giữ resource icon độc lập.
- [ ] Sửa token gốc và alias trong các file ở bảng nguồn font; giữ Montserrat, bỏ request Inter/Fraunces/Playfair Display/IBM Plex Mono và font chữ UI khác sau chuyển đổi.
- [ ] Sửa font heading trong Tailwind CDN của layout và config build Tailwind; không tắt CDN hoặc xoá utility framework trong việc này.
- [ ] Rà CSS literal, `font:` shorthand, inline style trong template/snippet, JS tạo DOM, `!important` và selector có specificity cao. Thay tại nguồn, không chồng nhiều lớp override.
- [ ] Đảm bảo input/select/textarea/button và nội dung rich text kế thừa font chung. Nếu cần override font-family của rich text, giới hạn đúng vùng hiển thị, không sửa dữ liệu bài viết/sản phẩm.
- [ ] Rà admin/chat/password và các trang tài khoản; đổi chữ UI sang Montserrat, giữ bố cục và điều kiện quyền truy cập. MOPS vẫn dùng Material Symbols, không thay font của icon.
- [ ] Rà emoji, dấu tiếng Việt, chữ đậm/nghiêng, giá dài, title dài và wrap menu. Nếu weight 450/560/650 trước đây phụ thuộc variable font, điều chỉnh sang weight được font chung hỗ trợ hoặc tải range phù hợp.
- [ ] Build CSS sinh từ Tailwind bằng script hiện hữu; không chỉnh tay file generated làm nguồn chuẩn.

Checkpoint C: computed style ở heading/body/button/form của các họ trang dùng font chung; icon hiển thị đúng; không còn request font nội dung đã bỏ.

## 8. Gói D — Đưa tất cả trang SHB về cùng UI Pharma

Thực hiện theo thứ tự: component dùng chung → trang hub/collection → chi tiết → trang chủ SHB → các trang liên quan.

- [ ] Dùng header/footer/topbar/search/cart/mobile navigation của `theme.bwt`; chỉ một bản mỗi thành phần.
- [ ] Thay token màu SHB hardcode đang tạo giao diện riêng bằng token Pharma tương ứng. Giữ setting nội dung SHB và dữ liệu merchant; không âm thầm xoá/ghi đè setting màu cũ. Ghi rõ field nào còn tác dụng, field nào trở thành legacy để tránh Admin có nút không hiệu lực mà không được thông báo.
- [ ] Đồng bộ width/gutter và nhịp section với khung Pharma; gỡ negative margin, offset header cố định cũ, spacing phục vụ announcement/drawer SHB đã bỏ.
- [ ] Chuẩn hóa breadcrumb, eyebrow, H1/H2, intro, section header, CTA, link, badge, border, nền và empty state bằng component/token hiện hành.
- [ ] Chuẩn hóa card dịch vụ bằng component chung hợp lý; giữ ảnh, badge, giá, cọc, link và trạng thái. Không biến dịch vụ thành sản phẩm retail nếu logic khác.
- [ ] Hub: kiểm tra đủ nhánh menu cấu hình, collection fallback, thiếu collection, nhóm không có sản phẩm.
- [ ] Collection: giữ lựa chọn nhóm/filter/query/pagination; sidebar sticky theo header chung, responsive không đè nội dung.
- [ ] Chi tiết: giữ `action=/cart/add`, method, enctype, `data-cart-form`, tên `variantId`/`quantity` và handler AJAX hiện có. Giữ liên hệ khi giá 0, disabled khi unavailable, giá so sánh và variant. Không đổi thành `SHCart` để đơn giản hoá UI.
- [ ] Trang chủ SHB: chuyển toàn bộ section thật sang type scale/container/card/button của Pharma, giữ dữ liệu/config và điều kiện hiện. Đặc biệt rà các block `sh2-*`, inline style, FAQ, gallery/lightbox, slider, before-after và hiệu ứng reveal.
- [ ] Đặt lịch và giỏ dịch vụ: giữ key storage, event, ID dịch vụ, tính cọc, query `svc`, URL cấu hình; thanh cố định không che nav đáy, nút submit hay footer. Không trộn giỏ dịch vụ với giỏ Sapo.
- [ ] Chuyên gia, minh chứng, patient portal, payment, AI quiz/results: áp UI chung đúng thành phần; giữ form/state/session/resume/API. Không viết lại backend hoặc mô tả y khoa.
- [ ] Tách CSS inline tĩnh có quy mô đáng kể sang asset phù hợp; CSS cần Liquid dùng `.scss.bwt`. Tách JS khi làm rõ ownership và tránh lặp; không ép tách JSON-LD hoặc cấu hình Liquid thành JS tĩnh.
- [ ] Không làm mất focus, trạng thái loading/error/disabled, keyboard interaction, reduced motion hoặc nội dung khi JS lỗi.

Checkpoint D: không còn hệ font/shell/khung độc lập SHB; các chức năng SHB vẫn hoạt động và trang giữ vai trò nội dung riêng.

## 9. Gói E — Dọn CSS/JS với bằng chứng

Tạo `ASSET-AUDIT.md`, mỗi dòng gồm: file/khối, reference tĩnh, reference động, nơi build/render gọi, chức năng/selector còn sống, hành động KEEP/MERGE/TRIM/DELETE, bằng chứng kiểm tra.

- [ ] Tìm reference trong layouts/templates/snippets/assets/configs/scripts/dev-server/tests và build config; kiểm tra tên ghép động, `asset_url`, `include`, settings chứa filename và script injection.
- [ ] Hiểu mapping: `x.scss.bwt` có thể được gọi bằng `x.scss.css`; `x.js.bwt` gọi bằng `x.js`. Tìm mỗi tên và basename/alias, không chỉ tìm nguyên filename nguồn.
- [ ] Phân biệt asset runtime, asset build input, vendor, generated output, fixture/test và file thiết kế tham khảo. File không được link trực tiếp vẫn có thể cần cho build.
- [x] Với `global_skinhealthy.scss.bwt`, đã chuyển selector nội dung/reveal còn dùng vào owner phù hợp, dò reference và xoá file khi không còn consumer.
- [ ] Đánh giá gộp/giữ 3 CSS home/services/card theo ownership thực tế, không đặt chỉ tiêu phải xoá cho đủ số lượng. Tránh nhồi tất cả CSS SHB vào global tải mọi trang.
- [ ] Dọn block CSS/JS inline cũ, listener khởi tạo trùng, import/include/preload trùng. Giữ khởi tạo đúng thứ tự DOM/defer, tránh thêm giỏ/đặt lịch hai lần sau một click.
- [ ] Không xoá jQuery, Swiper, LazyLoad, Tailwind, Font Awesome, module MOPS hoặc CSS vendor chỉ vì SHB không gọi trực tiếp. Chứng minh toàn bộ consumer trước khi tác động.
- [ ] Coverage trình duyệt chỉ là bằng chứng phụ: zero coverage khi tải trang không chứng minh code cho modal/mobile/hover/error/auth state là thừa.
- [ ] Với file đề nghị DELETE: không còn reference tĩnh/động/build, consumer đã chuyển, các trạng thái liên quan được test. Chưa chứng minh đủ thì KEEP và nêu rõ, không gọi là đã dọn sạch.
- [ ] Xoá chính xác file đã xác minh trong repo; không recursive delete thư mục tính từ wildcard. Không xoá `design/` hoặc `.clinerules/` trong việc dọn runtime asset.
- [ ] Sau xoá: kiểm tra asset URL render, 404 network và package build sạch không còn file đã bỏ.

## 10. Gói F — Kiểm thử và bằng chứng nghiệm thu

### Lệnh nền tảng

Chạy tại repo; trên PowerShell dùng UTF-8 rõ ràng khi đọc/ghi. Dùng `rg -g` thay wildcard đường dẫn không được shell mở rộng.

```powershell
git status --short
rg --files layouts templates snippets assets scripts tests
rg -n 'font-family|fontFamily|fonts.googleapis|@font-face|--pc-font|--sh-serif|--f-display' layouts templates snippets assets tailwind.config.js
node -e "for (const f of ['settings_schema','settings_data']) JSON.parse(require('fs').readFileSync('configs/'+f+'.json','utf8')); console.log('JSON OK')"
npm run build
npm run test:portal
git diff --check
```

Kiểm tra script compliance hiện có trước khi chạy; phân biệt cảnh báo baseline và lỗi mới. Chỉ chạy `build:vercel` nếu thay build/export hoặc cần xác minh đường dẫn xuất tĩnh; script này hiện chỉ export index và MOPS, không chứng minh SHB đã render đúng.

### Ma trận route

- [ ] Bốn template SHB chính ở 320, 390, 768, 1440, 1920px; dùng `/?tpl=...` và URL thật xác minh từ `dev-server.js`/config, không dùng nhầm `?template=`.
- [ ] Hồi quy homepage, collection thường, product, search, cart, blog/article, about/contact nếu có, login/register/account, password, 404.
- [ ] Đặt lịch, payment, patient portal, AI quiz/results, chuyên gia và minh chứng.
- [ ] MOPS desktop/mobile: đăng nhập/gate và state UI có thể kiểm chứng bằng fixture an toàn; không dùng quyền thật để tạo đơn, gửi tin hoặc thu tiền.
- [ ] Layout chat giữ nguyên file: kiểm tra bằng fixture/render phù hợp nếu chưa có route thực. Không tạo route production mới chỉ để test.
- [ ] AJAX/JSON views giữ response format, không bị bọc shell hoặc thêm font/CSS.

### Kiểm tra hành vi và hình ảnh

- [ ] Một H1 trên trang HTML nội dung; không trùng header/footer/menu; metadata và JSON-LD còn nguyên nghĩa.
- [ ] Computed font ở H1/H2/H3/body/nav/CTA/price/input/select/badge/table/modal; `document.fonts` và network xác nhận font thật đã tải, không chỉ trả về tên font trong CSS.
- [ ] Font icon và pseudo-element còn đúng; không ô vuông/mất mũi tên; logo không bị đổi.
- [ ] Không overflow ngang, không cắt dấu tiếng Việt, không chồng chữ khi heading dài hoặc zoom 200%; kiểm tra focus/keyboard và reduced motion.
- [ ] Menu mobile, search, accordion, carousel, gallery/lightbox, filter/tab/pagination vẫn dùng được.
- [ ] Thêm/xoá/reset giỏ dịch vụ, lưu qua reload, URL đặt lịch, cọc đúng; thử giỏ rỗng và nhiều mục; thanh giỏ không che nav tại mobile/tablet.
- [ ] Add-to-cart sản phẩm/dịch vụ đúng một lần/click; thử variant, sold-out, giá 0, thiếu ảnh/mô tả. Mock API cần thiết, không gửi dữ liệu thật.
- [ ] Form đặt lịch và AI chat giữ nhập liệu, bước tiếp theo, reset, loading/error, scrolling; kiểm tra keyboard mobile nếu môi trường cho phép.
- [ ] Ảnh lazy phải cuộn để tải trước khi kết luận broken; LCP preload khớp đúng URL/kích thước. Kiểm tra đủ dữ liệu, thiếu dữ liệu và nội dung dài.
- [ ] Không lỗi JS mới, missing include, Liquid exception hay CSS/JS 404 do thay đổi. Lỗi ngoài mạng/third-party ghi rõ, không gộp thành PASS.
- [ ] Chụp before/after cùng route, viewport, fixture; mở ảnh để review trực quan, không chỉ tạo screenshot.

Viết test hồi quy có giá trị cho thay đổi xuyên trang: font computed, SHB chung shell, asset dependency, service cart và không rò CSS sang trang khác. Có thể thêm spec riêng trong cấu trúc Playwright hiện có sau khi đọc config; không viết test chỉ grep lại đoạn code vừa sửa. Cập nhật assertion font cũ trong test theo hợp đồng mới, không xoá assertion để che lỗi.

## 11. Gói G — Bàn giao và đóng việc

- [ ] Cập nhật rule lâu dài: font chuẩn, token mapping, layout chung, component SHB, asset ownership và cách load. Thay mô tả cũ mâu thuẫn với quyết định mới.
- [ ] Cập nhật README/bản đồ file liên quan. Không để kiến trúc mới chỉ tồn tại trong `phase/`.
- [ ] Báo cáo: file đổi, file xoá kèm lý do, field cấu hình thêm/legacy nếu có, font request trước/sau, asset trước/sau có số đo thật, test command + kết quả, ảnh review và lỗi còn lại.
- [ ] Giữ nguyên mọi thay đổi có sẵn ngoài phạm vi. Không commit `dist/`, `vercel-dist/`, `node_modules/`, `.env*`, `.vercel/`.
- [ ] Archive hoặc dọn thư mục phase sau khi thông tin lâu dài đã đưa về rule/tài liệu chuẩn; không dùng phase làm nguồn rule vĩnh viễn.
- [ ] Không báo “hoàn thành toàn bộ” nếu route/state quan trọng chưa test được; liệt kê rõ giới hạn và nguyên nhân. Không báo đã deploy khi chỉ build local.

## 12. Điều kiện hoàn thành và cách tiếp tục với Luna

Hoàn thành khi cả A–G đạt, mọi route trong inventory được kiểm tra phù hợp, chữ UI dùng font chung, SHB không còn shell/design token riêng trái hợp đồng, chức năng giữ nguyên và mỗi file bị xoá có bằng chứng không còn dùng.

Mỗi lần tiếp tục phiên: đọc kế hoạch, `STATUS.md`, inventory và git diff hiện tại; làm gói đầu tiên còn dở, không bắt đầu lại hoặc lặp toàn bộ test khi không có thay đổi mới. Nếu kiểm tra thất bại: xác định nguyên nhân, sửa trong phạm vi rồi chạy lại check thất bại; không vòng lặp sửa thử vô hạn, không đánh dấu xong để né blocker. Chỉ hỏi khi thiếu quyết định ảnh hưởng nghiệp vụ/kiến trúc ngoài yêu cầu hoặc dữ liệu truy cập bắt buộc, đồng thời tiếp tục việc độc lập.

## Nhật ký hoàn tất hiện tại (19/09/2026)

- Đã thực thi A–D: inventory/runtime baseline, UI contract Montserrat, hợp nhất nguồn font/token, chuyển SHB về `theme.bwt`, khung 1180px/32px, scope reset/reveal và xoá `assets/global_skinhealthy.scss.bwt` sau khi chứng minh không còn consumer.
- Đã thực thi E: audit mapping `.bwt` → asset runtime; giữ ba asset SHB còn consumer thật, không xoá thêm file khi chưa đủ bằng chứng.
- Đã thực thi F: JSON parse, `npm run build`, computed-font/responsive matrix 40 lượt và regression Portal; assertion cũ Fraunces đã cập nhật sang Montserrat. Cảnh báo baseline 404 của preview customer API được ghi trong `STATUS.md`.
- Đã thực thi G: cập nhật rule dài hạn `.clinerules/02-du-an-pharma-cosmetics.md`, README và tài liệu audit/status. Không commit hoặc deploy.
- Detail SHB dùng shell/style chung nhưng giữ contract add-to-cart sản phẩm; `SHCart` chỉ nạp cho index/services/collection để không trộn giỏ dịch vụ với giỏ Sapo.
