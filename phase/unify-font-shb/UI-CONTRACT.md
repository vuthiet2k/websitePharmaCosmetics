# UI contract — Montserrat và khung Pharma

- Font UI duy nhất: `Montserrat`, fallback `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Font icon giữ nguyên: Font Awesome, Material Symbols, swiper-icons và glyph/icon SVG.
- Các alias `--pc-font-display`, `--pc-font-body`, `--font-primary`, `--font-secondary`, `--font-display`, `--font-heading`, `--sh-serif`, `--sh-sans`, `--chat-font-sans`, `--chat-font-display` đều trỏ về Montserrat. Không dùng serif/mono cho chữ UI.
- Heading, body, menu, button, label, price, badge, form và rich text đều dùng Montserrat. Giữ weight hiện có nếu font hỗ trợ; không dùng font icon làm fallback chữ.
- Storefront dùng wrapper `theme.bwt`, header/footer/topbar/search/cart/mobile nav chung. SHB giữ vai trò nội dung riêng nhưng dùng container/token/component của Pharma.
- Hub vẫn là hub; collection vẫn có tab/sidebar/filter/pagination; detail vẫn có variant/add-to-cart; AI vẫn là chat. Đồng bộ style không xoá hành vi.
- Mọi thay đổi CSS SHB phải scope theo `.pc-clinic-content` hoặc component owner. Không để reset shell SHB rò sang trang khác.
- Breakpoint nghiệm thu: 320, 390, 768, 1440, 1920px; không overflow ngang; focus, reduced-motion, empty/error/disabled state phải còn.
