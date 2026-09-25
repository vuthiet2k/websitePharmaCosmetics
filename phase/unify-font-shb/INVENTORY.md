# Inventory hiện trạng

## Storefront và SHB

| Khu vực | Template/snippet | Asset trực tiếp hoặc qua layout | Hành vi cần giữ |
| --- | --- | --- | --- |
| Trang SHB | `page.indexskinhealthy.bwt` | `page_skinhealthy_home.scss.bwt`, `skinhealthy_content_*` | hero, gallery/lightbox, section cấu hình, FAQ, JSON-LD, reveal |
| Hub SHB | `page.skinhealthy-services.bwt` | `comp_skinhealthy_card.scss.bwt`, `page_skinhealthy_services.scss.bwt` | link_list, collection fallback, card dịch vụ, empty state |
| Collection SHB | `collection.skinhealthy.bwt` | cùng card/services + CSS inline | tab, sidebar, lọc, paginate, card |
| Chi tiết SHB | `page.skinhealthy-service-detail.bwt` | `page_*` và UI kit | variant, giá, add-to-cart, unavailable, description |
| Card | `product_grid_skinhealthy.bwt` | token Tailwind/clinical | ảnh, giá/cọc, link, trạng thái |
| AI | `page.ai-skin-quiz.bwt` | `page_ai_skin_quiz.scss.bwt` | chat state, reset, scroll, form |

## Font/token source

- `layouts/theme.bwt`: font request và Tailwind config storefront.
- `snippets/storefront_theme.bwt`: token `--pc-font-*` trỏ Montserrat; request font nằm một lần trong `layouts/theme.bwt`.
- `snippets/header_style.bwt`: `--font-*` legacy và asset preload.
- `assets/storefront-v3.css`: mapping storefront/clinic token.
- `assets/home-portal.css`: token Portal riêng.
- `snippets/pharma_ui_kit.bwt`, `snippets/pc_clinical_components.bwt`: CSS inline UI kit.
- `snippets/skinhealthy_content_style.bwt`, `assets/page_skinhealthy_home.scss.bwt`, `assets/page_skinhealthy_services.scss.bwt`: token SHB.
- `assets/page_ai_skin_quiz.scss.bwt`, `layouts/chat.bwt`, `layouts/mops-admin.bwt`, `assets/page_mops_admin.scss.bwt`: font riêng.

## Asset deletion status

Đã xoá `assets/global_skinhealthy.scss.bwt` sau khi chuyển utility còn dùng và xác minh không còn consumer. Ba asset SHB còn lại đều có consumer thật nên được KEEP/trim.
