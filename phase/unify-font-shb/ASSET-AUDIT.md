# Audit CSS/JS

| Asset/khối | Consumer đã tìm thấy | Hành động ban đầu | Bằng chứng cần trước DELETE |
| --- | --- | --- | --- |
| `assets/global_skinhealthy.scss.bwt` | trước đây chỉ được include bởi `skinhealthy_content_style.bwt` | DELETE | đã chuyển `sh-reveal`/section utility vào snippet, không còn reference |
| `assets/page_skinhealthy_home.scss.bwt` | `skinhealthy_content_style.bwt` khi `indexskinhealthy` | KEEP/trim | chỉ còn hero/section content, không còn offset shell |
| `assets/page_skinhealthy_services.scss.bwt` | hub + collection | KEEP/merge có kiểm chứng | cả hai route đang include asset và đã kiểm tra responsive |
| `assets/comp_skinhealthy_card.scss.bwt` | hub + collection | KEEP/merge có kiểm chứng | card đang được render ở hub/collection |
| `assets/page_ai_skin_quiz.scss.bwt` | `page.ai-skin-quiz.bwt` | KEEP, scope Montserrat | template vẫn include asset; không xoá |
| `snippets/skinhealthy_content_script.bwt` | layout `theme.bwt` với route SHB | KEEP/trim | SHCart/reveal đã chuyển và test độc lập |

Không xoá file chỉ vì tên “global”, “skinhealthy” hoặc không thấy `<script src>`; phải dò cả mapping `.bwt` → `.css`/`.js`, include động, build input và state mobile/modal/error.

Kết quả rà soát 19/09/2026: ba asset SHB còn lại đều có consumer thật (`page_skinhealthy_home`, `page_skinhealthy_services`, `comp_skinhealthy_card`); không có file CSS/JS SHB nào khác được xác minh đủ điều kiện DELETE. `global_skinhealthy.scss.bwt` đã xoá sau khi chuyển utility và dò reference.
