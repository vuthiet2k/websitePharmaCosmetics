# Runbook vận hành Soi da AI

Ngày cập nhật: 2026-09-24  
Phạm vi: theme Sapo Web, preview local và triển khai Vercel của Pharma Cosmetics.

## Trạng thái và điều kiện trước phát hành

- Camera, LIQA cơ bản, báo cáo radar, overlay và matcher routine đã có trong theme; bộ Playwright portal hiện chạy cùng bộ build.
- Chế độ storefront khả dụng hiện tại là `client_edge`. Nếu Admin chọn `cloud_proxy` hoặc `hybrid`, UI chủ động khóa camera/tải ảnh/phân tích, nêu rõ chế độ chưa tích hợp hoặc phê duyệt và vẫn cho dùng khảo sát; không gửi ảnh qua adapter Cloud. `ai_skin_scan_provider` chỉ là cấu hình dành cho tích hợp tương lai, không chọn hoặc gọi nhà cung cấp.
- Ảnh tải lên bị giới hạn 12 MiB và 32 megapixel nguồn; ảnh lưu trong phiên được thu nhỏ cạnh dài tối đa 1280 px trước khi tạo ROI/báo cáo. Đây là giới hạn RAM kỹ thuật, không phải tiêu chí chất lượng ảnh/model.
- Khi rời trang hoặc trang vào BFCache (`pagehide`), handler dừng stream, tách video khỏi stream, xóa `FileList`, xóa buffer ảnh/landmarks trong closure và đặt preview/guidance canvas về 0×0; chỉ payload định lượng đã cho phép trong `sessionStorage` được giữ để trang kết quả cùng tab dùng tiếp.
- Kết quả câu hỏi chỉ giữ loại da trong `sessionStorage` cùng tab để chuyển sang trang kết quả; điểm chi tiết/ảnh không được ghi vào `localStorage`. Legacy keys `pc_quiz_skin_type` và `pc_quiz_scores` trong `localStorage` bị xóa khi có kết quả mới hoặc khi mở trang kết quả.
- MST được ước lượng bằng khoảng cách Lab tới 10 swatch sRGB A-J; khi có landmarks, chỉ lấy hai vùng má bên trong mặt thay vì toàn ROI chữ nhật. Luồng tải ảnh không có mesh vẫn dùng ROI hình học dự phòng và kém tin cậy hơn. Đây không phải phép đo màu đã hiệu chuẩn; swatch tham chiếu theo thẻ Monk Scale trong tài liệu FDA/Dr. Ellis Monk, và đánh giá MST dùng thực tế vẫn cần ánh sáng/màu camera được kiểm soát cùng đánh giá đa vùng/đa người chấm.
- Nếu setting `ai_skin_scan_deid_enable` bật, vùng mắt được che trên bản preview hiển thị sau khi phân tích; buffer gốc vẫn được dùng cho phép đo thử nghiệm tại thiết bị. Không ghi hai bản ảnh vào Web Storage, không gửi ảnh lên CRM/Cloud. Che preview không ẩn danh khuôn mặt và không thay thế rà soát quyền riêng tư.
- Model ONNX được thẩm định chưa được cung cấp/cấu hình mặc định (`ai_skin_scan_onnx_model_url` rỗng). Khi không có model, overlay không đánh dấu lesion; các chỉ số Canvas/MST là phép đo thử nghiệm, chưa được xác nhận lâm sàng.
- Nếu cấu hình model, bắt buộc khai báo cả URL HTTPS và SHA-256 64 ký tự hex (`ai_skin_scan_onnx_model_sha256`). Trình duyệt tải tối đa 16 MiB, xác minh hash trước khi khởi tạo ONNX Runtime; thiếu/sai hash, lỗi CORS hoặc tải lỗi sẽ không chạy model và tiếp tục nhánh Canvas thử nghiệm. Chỉ lấy checksum từ artifact đã kiểm soát/được phê duyệt, không tự tính lại từ một bản tải không rõ nguồn để bỏ qua mismatch.
- Contract decoder hiện chấp nhận output hậu xử lý `[N,6]` = `[cx,cy,w,h,confidence,classId]`, hoặc YOLO raw 6-class `[1,N,10]`/`[1,10,N]` = `[cx,cy,w,h,class0..class5]`; trùng lặp được lọc bằng Gaussian Soft-NMS theo class. Class ID phải khớp thứ tự đã định nghĩa trong decoder (0-1 mụn, 2 sắc tố, 3 lỗ chân lông, 4 nếp nhăn, 5 đỏ); các layout/class count khác bị từ chối và không được xem như model tương thích. Trước khi bật cần xác minh contract/label map của artifact thật.
- Cloud API adapter chỉ là proxy tùy chọn; khi thiếu `SKIN_ANALYSIS_ADAPTER_URL` hoặc `SKIN_ANALYSIS_ADAPTER_TOKEN`, route trả `503` và giữ phương án local. Route yêu cầu `cloud_consent` + thời điểm consent, `face_mask_applied: true`, provider allowlist, ảnh JPEG/PNG/WebP Base64 hợp lệ và chỉ forward `{provider,image}` (bỏ metadata tùy ý). `face_mask_applied` chỉ là lời khai từ caller; server không xác minh mask và mask mắt không đồng nghĩa ẩn danh. Chưa xác minh nhà cung cấp thật; storefront hiện chưa có luồng gửi ảnh cloud.
- Căn cứ pháp lý: Luật số 91/2025/QH15 là Luật Bảo vệ dữ liệu cá nhân, hiệu lực 01/01/2026. Đây không phải Luật Khám bệnh, chữa bệnh. Không khẳng định tuân thủ GDPR/HIPAA hoặc quy định y tế nếu chưa xác định phạm vi áp dụng và có rà soát pháp lý. Việc che mắt/không lưu ảnh không tự nó chứng minh tuân thủ.
- Trên Vercel, rate limit 5 request/IP/phút yêu cầu KV/Redis REST (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) và ưu tiên `x-vercel-forwarded-for` làm IP do platform cung cấp; local preview mới dùng header giả lập và limiter trong bộ nhớ. Nếu thiếu KV hoặc KV lỗi, route fail-closed với `503 rate_limit_unavailable`; không dùng bộ đếm bộ nhớ theo instance.
- Vì vậy, không quảng bá kết quả hiện tại như chẩn đoán hoặc phép đo đã thẩm định. Trước khi bật ở production, chủ tính năng phải phê duyệt model/provider, quyền riêng tư, nội dung hiển thị và kết quả đánh giá trên dữ liệu kiểm thử được cho phép.

## Dấu hiệu sự cố và hành động tức thời

| Mức độ | Dấu hiệu | Hành động |
| --- | --- | --- |
| P0 – quyền riêng tư | Ảnh gốc xuất hiện trong request CRM/server, hoặc khách không đồng ý nhưng dữ liệu vẫn được gửi | Tắt tính năng ngay theo Soft Disable bên dưới; không sao chép/chuyển tiếp ảnh để điều tra; giữ lại request metadata đã khử dữ liệu và báo đầu mối bảo mật/quyền riêng tư. |
| P1 – sai lệch kết quả | Kết quả/overlay không tương ứng ảnh, model lỗi, thiết bị quá nóng/treo, hoặc người dùng phản ánh kết quả gây hiểu nhầm | Tắt camera; chuyển khách sang khảo sát câu hỏi và tư vấn Chuyên gia; lưu thời gian, URL, loại thiết bị/trình duyệt, mã lỗi và phiên bản deploy, không lưu ảnh mặt. |
| P2 – adapter cloud | `/api/skin-analysis` trả `429`, `502` hoặc `503` | Giữ đường local/quiz; kiểm tra cấu hình adapter và KV limiter. Không retry hàng loạt, không tăng quota hoặc đổi nhà cung cấp khi chưa có phê duyệt. |
| P2 – camera/LIQA | Quyền camera bị từ chối, không nhận diện mặt, ánh sáng/góc không đạt | Dùng luồng tải ảnh hoặc khảo sát; không hướng dẫn bỏ qua cảnh báo chất lượng để ép phân tích. |

## Soft Disable qua Sapo Admin

1. Trong quản trị giao diện, mở nhóm “Soi da AI” và tắt `ai_skin_scan_enable`, sau đó lưu/publish cấu hình.
2. Kiểm tra `/kham-da-ai`: tab Camera và vùng camera không còn; khảo sát câu hỏi hiện hữu vẫn dùng được. Kiểm tra `/soi-da` không phát sinh lỗi JavaScript và có lối vào khảo sát.
3. Kiểm tra một trang mua hàng và trang chủ để xác nhận không bị ảnh hưởng.
4. Nếu admin không thể lưu hoặc cờ không có hiệu lực, thực hiện rollback Vercel.

Lưu ý: `configs/settings_data.json` là preset theme trong repo/preview, không chứng minh được giá trị đang publish ở cửa hàng Sapo. Khi xử lý production phải xác nhận trực tiếp trong Admin và trên URL production.

## Rollback Vercel

1. Ghi URL deploy đang gặp sự cố, commit SHA, thời điểm, loại sự cố và người thực hiện. Không đưa ảnh mặt, token hoặc thông tin khách hàng vào ticket/log.
2. Trong Vercel Dashboard của project đã xác nhận, chọn deployment ổn định trước sự cố và dùng chức năng rollback/promote theo quyền vận hành hiện có.
3. Kiểm tra URL production đã trỏ về deployment ổn định; xác nhận `/`, `/kham-da-ai`, trang sản phẩm và giỏ hàng hoạt động.
4. Không dùng CLI production nếu chưa xác nhận đúng project, quyền/token và sự phê duyệt phát hành. Push nhánh `hugo-theme-sept2026` chỉ tạo Preview theo quy ước dự án; không tự promote Production.

## Revert mã nguồn

Chỉ làm sau khi đã cô lập sự cố và xác định commit gây lỗi. Không reset/force-push hoặc xóa thay đổi đang có của người khác.

```powershell
git status --short
git log -5 --oneline
git revert <commit-sha>
```

Tạo revert commit riêng theo quy ước Conventional Commits tiếng Việt, chạy quality gate, rồi push nhánh làm việc để tạo Preview mới. Không commit thư mục `dist/`, `vercel-dist/`, `node_modules/`, `.vercel/` hoặc file `.env` thật.

## Quality gate sau thay đổi/rollback

```powershell
node -e "JSON.parse(require('fs').readFileSync('configs/settings_schema.json','utf8')); JSON.parse(require('fs').readFileSync('configs/settings_data.json','utf8')); console.log('settings JSON OK')"
npm run build
npm run test:portal
```

Sau đó kiểm tra preview bằng trình duyệt desktop/mobile: route soi da, khảo sát fallback, cờ disable, trang kết quả và request CRM. CRM và local/session storage chỉ được giữ dữ liệu định lượng đã cho phép; không được có ảnh, data URL hoặc Base64. Khi chưa cấu hình cloud adapter, `/api/skin-analysis` phải trả fallback an toàn, không giả lập thành công.

## Tiêu chí mở lại tính năng

- Có model/provider được phê duyệt, giấy phép và contract/output đã xác minh; model ONNX phải có URL HTTPS, CORS phù hợp, SHA-256 độc lập đã xác thực và kiểm thử chất lượng trên thiết bị cùng các nhóm tông da phù hợp. Cấu hình KV/Redis đã kiểm tra hoạt động trong môi trường Vercel để rate limit có hiệu lực liên instance.
- Privacy/consent được duyệt cho từng đích xử lý; chứng minh ảnh không bị lưu/gửi ngoài consent.
- Preview và quality gate xanh; smoke test camera, khảo sát, kết quả, CRM opt-in, cờ disable và rollback được ghi nhận.
- Chủ cửa hàng/phụ trách phát hành xác nhận bật cờ production. Không suy ra sẵn sàng production chỉ từ build xanh hoặc test dùng model giả.
