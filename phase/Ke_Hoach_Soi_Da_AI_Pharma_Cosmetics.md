# Kế Hoạch Kỹ Thuật Chi Tiết: Tích Hợp Hệ Thống Soi Da AI Miễn Phí Tại Pharma Cosmetics

- **Mã kế hoạch (plan\_id)**: `PLAN-PHARMA-SKIN-AI-20260924`  
- **Phiên bản (revision)**: `1.0.0`  
- **Ngày khảo sát & lập kế hoạch**: `2026-09-24`  
- **Phiên bản Planner Skill**: `Gemini Spark Planner v3.2 (Complete Context Planning)`  
- **Kho lưu trữ mục tiêu**: `vuthiet2k/websitePharmaCosmetics`  
- **Nhánh triển khai**: `hugo-theme-sept2026`  
- **Môi trường Serverless**: `Vercel Project hugo-theme-sept2026-test` (`https://website-pharma-cosmetics.vercel.app`)  
- **Trạng thái tiếp nhận đầu vào (Intake Status)**: `enumeration=complete`, `intake=complete`  
- **Trạng thái kế hoạch**: `ready_for_review`

---

## 1\. Mục Tiêu, Phạm Vi, Baseline & Hợp Đồng Ràng Buộc

### 1.1. Mục Tiêu Kế Hoạch

Thiết lập kế hoạch kỹ thuật và truy nguyên yêu cầu để phát triển trải nghiệm **Soi da tham khảo tại thiết bị** cho Pharma Cosmetics. Đây là mục tiêu thiết kế, không phải bằng chứng rằng một “AI chẩn đoán da” đã hoàn thành hoặc có độ chính xác lâm sàng. Mọi yêu cầu dưới đây phải qua kiểm chứng bằng artifact, dữ liệu phù hợp và đánh giá có thẩm quyền trước khi được xem là đạt. Tham chiếu HER Skincare chỉ dùng để hình thành luồng UX, không chứng minh tính chính xác hay phù hợp pháp lý. Phạm vi mong muốn gồm:

1. Thu thập dữ liệu hình ảnh 3 góc mặt chuẩn hóa (Chính diện, Má trái 45°, Má phải 45°).  
2. Kiểm định chất lượng ảnh (LIQA) trên Client; MediaPipe Face Mesh là lựa chọn tích hợp cần kiểm thử, chưa có cam kết về sai số hoặc tốc độ trước khi đo trên thiết bị và bộ kiểm thử đại diện.  
3. Pipeline phân tích ảnh chỉ được bật sau khi có phương pháp/model/provider, quyền sử dụng và chất lượng được xác minh. OpenCV.js, ONNX và Cloud API trong tài liệu là phương án cần đánh giá; không cam kết “miễn phí không giới hạn”, độ chính xác hoặc tự động failover.  
4. Thử nghiệm phân loại sắc độ theo tham chiếu Monk Skin Tone; không gọi đây là khử thiên lệch cho tới khi đánh giá trên dữ liệu đa dạng và quy trình đo màu phù hợp.  
5. Hệ thống điểm kép kỹ thuật/giao diện chỉ là phép biến đổi heuristic, không đại diện nguy cơ hay sức khỏe da nếu chưa được xác nhận.  
6. Hiển thị overlay và gợi ý sản phẩm tham khảo; CRM chỉ có thể nhận dữ liệu tối thiểu sau khi consent, backend, retention và rà soát pháp lý được duyệt. Không quảng bá thành chẩn đoán hoặc phác đồ điều trị.

### 1.2. Phạm Vi Thực Hiện & Cam Kết Kỹ Thuật

- **Phạm vi lập kế hoạch**: Toàn bộ tài liệu này chỉ phục vụ mục đích lập kế hoạch, kiểm tra kiến trúc và thiết kế kỹ thuật bàn giao cho kỹ sư phần mềm. Không thực hiện các hành động sửa mã sản phẩm, cài đặt thư viện vào production, deploy hoặc gửi dữ liệu thực tế.  
- **Quy chuẩn danh xưng y tế (RULE-P0-02)**: Tuyệt đối dùng danh xưng **"Chuyên gia"**, "Chuyên gia da liễu", "Chuyên gia Pharma AI"; nghiêm cấm sử dụng các từ "Bác sĩ", "BS.", "DS." trong toàn bộ mã nguồn, giao diện UI và dữ liệu phản hồi.  
- **Cấu hình hóa Sapo Web**: Mọi văn bản hiển thị, cờ kích hoạt, ngưỡng điểm, URL phải được cấu hình hóa qua đối tượng Liquid `settings.<id>` kèm `| default:`, đăng ký trong `configs/settings_schema.json` và lưu preset tại `configs/settings_data.json`.  
- **Bảo vệ dữ liệu & an toàn xử lý**: Luật số 91/2025/QH15 là Luật Bảo vệ dữ liệu cá nhân (hiệu lực 01/01/2026), không phải Luật Khám bệnh, chữa bệnh. Che vùng mắt chỉ là phép biến đổi giảm lộ diện, không chứng minh ảnh đã ẩn danh vì phần còn lại của khuôn mặt vẫn có thể nhận dạng. Không tuyên bố tuân thủ pháp luật/GDPR/HIPAA chỉ dựa trên mask hoặc Process-and-Discard; phải rà soát mục đích, căn cứ xử lý, vai trò các bên, lưu giữ/xóa, chuyển dữ liệu và phạm vi luật áp dụng với chuyên gia pháp lý trước phát hành.
- **Vòng đời ảnh trên thiết bị**: Ảnh chỉ được giữ trong RAM để xử lý cục bộ; khi `pagehide` (kể cả điều hướng vào BFCache) phải dừng/tách stream, xóa input file và tham chiếu buffer, đặt canvas ảnh về 0×0. `sessionStorage` chỉ giữ kết quả định lượng trong tab để chuyển sang trang kết quả; không fallback sang `localStorage`/`window.name` và không lưu ảnh.

## 2\. Tổng Hợp Nguồn & Bản Đồ Ngữ Cảnh Hệ Thống

# Bản Đồ Ngữ Cảnh & Phân Tích Khoảng Cách (Context Map & Gap Analysis)

## 1\. Mục đích Hệ thống & Nhóm Người dùng

- **Mục tiêu sản phẩm**: Đối soát trải nghiệm soi da thử nghiệm trên website Pharma Cosmetics: camera/upload và kiểm tra chất lượng ảnh, heuristic Canvas/pixel, scaffold ONNX/API chưa có model/provider được duyệt, swatch MST chưa kiểm định, score heuristic và gợi ý routine/catalog tĩnh. Đây không phải hệ thống phát hiện tổn thương, chẩn đoán hoặc phác đồ y tế; phát hành cần qua các gate riêng ở mục 10.3.  
- **Nhóm người dùng**:  
  1. *Khách truy cập*: Có thể xem khảo sát và trải nghiệm tính năng camera nếu được bật; kết quả hiện tại chỉ là tham khảo kỹ thuật, không xác định bệnh hoặc tình trạng y khoa.  
  2. *Khách hàng đã đăng nhập*: Việc lưu hồ sơ hoặc theo dõi tiến trình chỉ được triển khai sau khi xác định mục đích, consent, retention và backend được duyệt.  
  3. *Chuyên gia/Tư vấn viên Pharma Cosmetics*: Có thể tiếp nhận dữ liệu tối thiểu qua CRM khi backend, nội dung thông báo, consent và quy trình xử lý đã được xác minh; không mặc định đây là báo cáo lâm sàng.  
  4. *Quản trị viên (Admin Store)*: Có thể bật/tắt tính năng theo cấu hình; chuyển Edge/Cloud chỉ khả dụng sau khi provider, dữ liệu, bảo mật và release gates được duyệt.

## 2\. Phân tích Hiện trạng vs Đích cần đạt (Gap Analysis)

| Tiêu chí | Hiện trạng (Baseline) | Đích cần đạt (Target State) | Khoảng cách cần giải quyết (Gap) |
| :---- | :---- | :---- | :---- |
| **Phương thức thu thập** | Bộ câu hỏi trắc nghiệm chữ 17 câu (`page.ai-skin-quiz.bwt`) | Kết hợp Chụp ảnh camera 3 góc mặt (Chính diện, Nghiêng trái 45°, Nghiêng phải 45°) \+ Tùy chọn làm bài kiểm tra bổ trợ | Xây dựng module Web Camera đa góc có khung căn chỉnh thời gian thực |
| **Kiểm định chất lượng ảnh** | Không có (chỉ nhập văn bản) | Live Image Quality Assurance (LIQA) trên Client dùng MediaPipe Face Mesh: kiểm tra góc nghiêng (Yaw/Pitch), khoảng cách, độ sáng, không kính, vén tóc | Thêm thư viện MediaPipe Face Mesh CDN, tính toán góc Euler và histogram ánh sáng |
| **Công nghệ phân tích ảnh** | Logic khảo sát theo câu trả lời | Thử nghiệm heuristic Canvas/pixel; decoder ONNX scaffold; Cloud adapter scaffold nhưng storefront fail-closed | Chưa có OpenCV pipeline, model/artifact hoặc provider được duyệt; không quảng bá phát hiện mụn/thâm/đỏ |
| **Trực quan hóa kết quả** | Hiển thị kết quả khảo sát | Overlay tham khảo chỉ khi có detection source đã xác thực và bật | Synthetic overlay test không xác nhận detection thật hoặc chẩn đoán |
| **Chuẩn hóa điểm số** | Điểm khảo sát hiện hữu và module thử nghiệm | Heuristic score/UI bucket và phân loại nearest-swatch trên fixture | Chưa chứng minh giá trị đo lường, độ công bằng hoặc hiệu chuẩn trên người dùng |
| **Gợi ý sản phẩm** | Gợi ý tĩnh | Matcher tĩnh trả stage labels/product handles từ catalog local | Không phải phác đồ; chưa kiểm tra tồn kho live, suitability, chống chỉ định hay hiệu quả |
| **Bảo vệ ảnh khuôn mặt** | Chỉ lưu câu trả lời khảo sát dạng JSON | Xử lý on-device mặc định; nếu có gửi ảnh phải có lựa chọn/đồng ý riêng, mask chỉ giảm lộ diện chứ không khẳng định ẩn danh; retention/provider và căn cứ xử lý phải được duyệt | Module mask client-side và allowlist CRM không nhận ảnh; hoàn tất rà soát riêng tư/pháp lý trước bật cloud |
| **Cấu hình Sapo Admin** | Chỉ có cấu hình text cho CRM Intake | Khối thiết lập hoàn chỉnh trong `settings_schema.json` & `settings_data.json` để quản trị viên kiểm soát tính năng | Thêm schema settings cho module soi da |

## 3\. Kiến trúc Tổng thể & Phân rã Module

\[Storefront Client \- Browser\]

  │

  ├── 1\. UI Camera & 3-Angle Capture Guide (Chính diện, Trái 45°, Phải 45°)

  │     └── Client-side LIQA Engine (MediaPipe Face Mesh 468 landmarks: Yaw/Pitch/Light/Occlusion)

  │

  ├── 2\. Image Pre-processing & Privacy Shield

  │     └── Face mask (giảm lộ diện, không đồng nghĩa ẩn danh) \+ ROI Extraction (T-Zone, U-Zone)

  │

  ├── 3\. Dual-Engine Skin Analysis Pipeline

  │     ├── \[Edge Pipeline\] OpenCV.js (Color thresholding HSV/YCbCr, Hessian Matrix) \+ ONNX Runtime Web

  │     └── \[Cloud Proxy\] Vercel Serverless Function \`/api/skin-analysis\` (YouCam / Skinive / Face++ Adapter)

  │

  ├── 4\. Scoring, De-biasing & Clinical Routine Matching

  │     ├── Monk Skin Tone (MST) Normalization & Dual-score (raw\_score \-\> ui\_score)

  │     └── Experimental heuristic outputs \-\> static routine/catalog suggestions (not treatment)

  │

  ├── 5\. Result Dashboard (reference output; no diagnosis)

  │     ├── Optional overlay only with validated detection source

  │     └── Heuristic summary, catalog suggestions and conditional contact CTA

  │

  └── 6\. Medical Consent Gate & CRM Intake

        └── \`assets/crm-intake.js\` \-\> Google Apps Script Backend (Luật 91/2025/QH15 & GSP/GDP)

## 3\. Hiện Trạng, Đích Cần Đạt & Các Quyết Định Thiết Kế

# Nhật Ký Quyết Định Thiết Kế (Design Decisions)

| DEC-ID | Chủ đề | Lựa chọn đã chốt | Các phương án đã cân nhắc | Lý do kỹ thuật & Đánh đổi |
| :---- | :---- | :---- | :---- | :---- |
| `DEC-01` | Kiến trúc Động cơ Phân tích | **Trạng thái hiện tại: local thử nghiệm; Cloud fail-closed.** Chỉ xem Edge/Cloud hybrid là phương án tương lai sau khi đánh giá | 1\. Chỉ dùng Cloud API SaaS 2\. Chỉ dùng Client-side Edge 3\. Tự dựng GPU Server riêng | Chưa có model/provider thật được duyệt. Không giả định quota, miễn phí, độ chính xác hoặc tỷ lệ phân tải; lựa chọn kiến trúc phải dựa trên báo giá, giấy phép, đánh giá chất lượng và review riêng tư. |
| `DEC-02` | Quy chuẩn Thu thập Dữ liệu | **Mô hình 3 góc mặt chuẩn HER Skincare** (Chính diện, Trái 45°, Phải 45°) | 1\. Chỉ chụp 1 ảnh chính diện 2\. Quay video 360 độ | Ảnh chính diện làm mất góc cong gò má và xương hàm, gây sai lệch độ sâu nếp nhăn và đốm sắc tố. Quay video tốn băng thông và khó chuẩn hóa. 3 góc ảnh tĩnh là điểm cân bằng vàng giữa độ chính xác thị giác máy tính và trải nghiệm người dùng. |
| `DEC-03` | Kiểm định Chất lượng Ảnh (LIQA) | **LIQA cục bộ là hướng thiết kế; triển khai Face Mesh/ánh sáng hiện chỉ được kiểm chứng một phần bằng dữ liệu tổng hợp** | 1\. Chụp xong gửi server kiểm tra 2\. Không kiểm tra, phân tích trực tiếp | Chưa có benchmark thiết bị hoặc tập dữ liệu đại diện để chứng minh tốc độ, sai số góc, nhận diện occlusion hay hiệu quả tổng thể. Không dùng mốc 30ms như kết quả đo. |
| `DEC-04` | Giảm lộ diện ảnh & giới hạn lưu giữ | **Hiện tại: phân tích thử nghiệm local từ buffer trong RAM, mask chỉ áp dụng lên preview hiển thị; không truyền ảnh. Upload Cloud fail-closed cho tới consent/provider và review riêng tư/pháp lý** | 1\. Lưu ảnh gốc dài hạn 2\. Gửi ảnh không phép biến đổi | Che vùng mắt không làm ảnh khuôn mặt thành dữ liệu ẩn danh; cả ảnh che vẫn có thể là dữ liệu cá nhân. Không khẳng định tuân thủ GDPR Điều 9/HIPAA hoặc luật y tế nếu chưa xác định phạm vi áp dụng và được chuyên gia pháp lý rà soát; Luật 91/2025/QH15 là Luật Bảo vệ dữ liệu cá nhân. Phải xác minh retention, subprocessors và xóa dữ liệu của từng nhà cung cấp trước khi gửi ảnh. |
| `DEC-05` | Tham chiếu sắc độ da | **MST 10 swatch hiện dùng như tham chiếu thử nghiệm màu** | 1\. Chỉ dùng thang Fitzpatrick (FST I-VI) 2\. Không có tham chiếu màu | Phân lớp swatch tổng hợp không phải khử thiên lệch. Chưa có color checker, camera được hiệu chuẩn hoặc đánh giá trên người tham gia đa dạng; không tuyên bố phân loại công bằng/chính xác. |
| `DEC-06` | Kiến trúc Điểm số (Dual-Scoring) | **raw\_score là đầu ra heuristic; ui\_score là phép ánh xạ trình bày, không phải chỉ số sức khỏe** | 1\. Chỉ hiển thị raw\_score 2\. Điểm số cố định theo loại da | Không có cơ sở để gọi raw score là khoa học hay mô tả ui score như can thiệp tâm lý. Cả hai chỉ được hiển thị với ngữ cảnh tham khảo và cần validation trước khi dùng cho quyết định chăm sóc. |
| `DEC-07` | Tuân thủ Quy chuẩn Y tế & Thương hiệu | **Tuân thủ RULE-P0-02 (danh xưng "Chuyên gia") \+ Disclaimer y khoa** | 1\. Dùng từ "Bác sĩ AI" 2\. Không có cảnh báo y khoa | Vi phạm quy chế đối tác Sapo và quy định y tế Việt Nam nếu tự nhận là "Bác sĩ". Bắt buộc dùng "Chuyên gia Pharma AI" kèm cảnh báo kết quả mang tính chất tham khảo sơ bộ và nút điều hướng tư vấn 1:1. |
| `DEC-08` | Tích hợp CRM & Cấu hình Giao diện | **CRM intake có consent gate và allowlist ở client; chưa xác minh backend/production hoặc review pháp lý** | 1\. Gọi trực tiếp Google Apps Script từ template 2\. Gọi backend MOPS | Giữ tách biệt MOPS. E2E giả lập chỉ chứng minh client từ chối thiếu consent và lọc payload; không chứng minh dữ liệu được lưu/xóa đúng ở GAS hoặc consent production đã đầy đủ. |

## 4\. Ledger Yêu Cầu & Ma Trận Truy Nguyên Hai Chiều (Traceability Matrix)

Ma trận truy nguyên đảm bảo mọi yêu cầu từ báo cáo chuyên sâu và nền tảng HER Skincare đều được ánh xạ đầy đủ sang tiêu chí nghiệm thu (AC), đầu việc cụ thể (TASK) và kịch bản kiểm tra (CHECK), không có yêu cầu mồ côi:

| Nguồn phát sinh | REQ-ID | Tóm tắt Yêu cầu | AC-ID | TASK-ID | CHECK-ID | Trạng thái |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| `SRC-USER-REPORT` | `REQ-CAP-01` | Chụp 3 góc độc lập; không lưu ảnh Base64 | `AC-M1-01-1`, `AC-M1-01-2` | `TASK-M1-01` | `CHK-M1-01-01`, `CHK-M1-01-03` | Implemented-limited; browser/device acceptance open |
| `SRC-USER-REPORT` | `REQ-CAP-02` | Hướng dẫn chuẩn bị ảnh; kính/tóc chưa được nhận diện tự động | `AC-M1-03-2` | `TASK-M1-03` | `CHK-M1-03-03` | Partial; occlusion claims unverified |
| `SRC-USER-REPORT` | `REQ-LIQA-01` | Ước lượng hướng mặt qua landmarks | `AC-M1-02-1`, `AC-M1-02-2` | `TASK-M1-02` | `CHK-M1-02-01`, `CHK-M1-02-02` | Partial; synthetic landmarks only, accuracy open |
| `SRC-USER-REPORT` | `REQ-LIQA-02` | Kiểm tra khung/ánh sáng | `AC-M1-02-2`, `AC-M1-03-1` | `TASK-M1-02`, `TASK-M1-03` | `CHK-M1-02-03`, `CHK-M1-03-01`, `CHK-M1-03-02` | Partial; real-device validation open |
| `SRC-USER-REPORT` | `REQ-PRIV-01` | Che mắt/lông mày trên preview để giảm lộ diện; không gọi là ẩn danh | `AC-M1-04-1` | `TASK-M1-04` | `CHK-M1-04-01` | Implemented-limited; legal review open |
| `SRC-USER-REPORT` | `REQ-PRIV-02` | Không lưu ảnh trong Web Storage; consent client guard đã test, review legal/backend còn mở | `AC-M5-01-2`, `AC-M5-02-1` | `TASK-M5-01`, `TASK-M5-02` | `CHK-M5-01-02`, `CHK-M5-01-03` | Technical controls partial; legal/backend verification open |
| `SRC-USER-REPORT` | `REQ-AI-01` | OpenCV/Hessian đỏ da và nếp nhăn (mục tiêu chưa triển khai) | `AC-M2-01-1`, `AC-M2-01-2` | `TASK-M2-01` | `CHK-M2-01-01`, `CHK-M2-01-02`, `CHK-M2-01-03` | Not implemented; current Canvas heuristics are experimental |
| `SRC-USER-REPORT` | `REQ-AI-02` | ONNX lesion detection (decoder scaffold only) | `AC-M2-02-1`, `AC-M2-02-2` | `TASK-M2-02` | `CHK-M2-02-01`, `CHK-M2-02-02`, `CHK-M2-02-03` | No validated model; accuracy/performance unverified |
| `SRC-USER-REPORT` | `REQ-AI-03` | Cloud adapter endpoint; storefront use remains disabled | `AC-M2-03-1`, `AC-M2-03-2` | `TASK-M2-03` | `CHK-M2-03-01`, `CHK-M2-03-02`, `CHK-M2-03-03` | Server adapter scaffold; provider/deployment/rate-limit verification open |
| `SRC-USER-REPORT` | `REQ-SCORE-01` | Heuristic dual score (not a clinical metric) | `AC-M3-02-1`, `AC-M3-02-2` | `TASK-M3-02` | `CHK-M3-02-01`, `CHK-M3-02-02`, `CHK-M3-02-03` | Implemented; synthetic tests only, validation open |
| `SRC-USER-REPORT` | `REQ-SCORE-02` | MST swatch reference (not demonstrated debiasing) | `AC-M3-01-1`, `AC-M3-01-2` | `TASK-M3-01` | `CHK-M3-01-01`, `CHK-M3-01-02` | Implemented-limited; camera/color/population validation open |
| `SRC-USER-REPORT` | `REQ-ROUTINE-01` | Three-stage product suggestion from catalog | `AC-M3-03-1`, `AC-M3-03-2` | `TASK-M3-03` | `CHK-M3-03-01`, `CHK-M3-03-02` | Implemented-limited; catalog link test only, no treatment validation |
| `SRC-RULE-HDKTXD` | `REQ-UI-01` | Web Camera UI, khảo sát và điều hướng đa chế độ | `AC-M1-01-1`, `AC-M4-02-1` | `TASK-M1-01`, `TASK-M4-02` | `CHK-M1-01-01`, `CHK-M4-02-01` | Partial; local responsive/route tests pass, physical-device/browser acceptance open |
| `SRC-USER-REPORT` | `REQ-UI-02` | Overlay tương tác; detector/model thật chưa được nghiệm thu | `AC-M4-01-1`, `AC-M4-01-2` | `TASK-M4-01`, `TASK-M4-03` | `CHK-M4-01-01`, `CHK-M4-01-02`, `CHK-M4-03-01` | Renderer implemented; only mocked detections verified |
| `SRC-CRM-INTAKE-JS` | `REQ-CRM-01` | Client gửi allowlisted quantitative payload khi có consent | `AC-M5-01-1` | `TASK-M5-01` | `CHK-M5-01-01` | Client guard tested; production GAS/backend unverified |
| `SRC-CLINERULES-02` | `REQ-COMP-01` | RULE-P0-02 và disclaimer tham khảo | `AC-M5-02-1`, `AC-M6-01-3` | `TASK-M5-02`, `TASK-M6-01` | `CHK-M5-02-03`, `CHK-M6-01-03` | Copy/E2E partial; formal legal review open |
| `SRC-CONFIG-SCHEMA` | `REQ-CONF-01` | Sapo theme settings, preset và soft-disable | `AC-M5-03-1`, `AC-M6-02-1` | `TASK-M5-03`, `TASK-M6-02` | `CHK-M5-03-01`, `CHK-M5-03-02` | Local JSON/build/render tests pass; Sapo Admin production unverified |
| `SRC-PKG-JSON` | `REQ-TEST-01` | Playwright portal/API/CRM coverage | `AC-M6-01-1`, `AC-M6-01-2` | `TASK-M6-01` | `CHK-M6-01-01`, `CHK-M6-01-02` | Local suites pass at last recorded run; real-device/production acceptance open |

## 5\. Thứ Tự Thực Hiện, Biểu Đồ Phụ Thuộc (DAG) & Quy Tắc Tích Hợp

### 5.1. Biểu Đồ Phụ Thuộc (Directed Acyclic Graph \- DAG)

\[TASK-M1-01: Web Camera UI\] ──\> \[TASK-M1-02: MediaPipe Mesh LIQA\] ──\> \[TASK-M1-03: Ánh sáng & Occlusion\]

                                                                                │

                                                                                ▼

\[TASK-M5-03: Schema Settings\]                                      \[TASK-M1-04: Khử định danh & Tách ROI\]

       │                                                                  │                 │

       │                                       ┌──────────────────────────┘                 │

       │                                       ▼                                            ▼

\[TASK-M5-04: Router /soi-da\]      \[TASK-M2-01: OpenCV Red/Hessian\]         \[TASK-M2-02: ONNX YOLO Detection\]

       │                                       │                                            │

       │                         ┌─────────────┴────────────────────────────────────────────┘

       │                         ▼

       │                  \[TASK-M3-01: Monk Skin Tone De-biasing\]

       │                         │

       │                         ▼

       │                  \[TASK-M3-02: Dual-Scoring raw/ui\] \<─── \[TASK-M2-03: Cloud Proxy Adapter\]

       │                         │

       │                         ▼

        │                  \[TASK-M3-03: Gợi ý routine/catalog tĩnh\]

       │                         │

       │            ┌────────────┴─────────────────────────────┐

       │            ▼                                          ▼

       │    \[TASK-M4-01: Visual Overlay Canvas\]    \[TASK-M5-01: CRM Intake submitSkinAnalysis\]

       │            │                                          │

       │            ▼                                          ▼

       └──\> \[TASK-M4-02: Đa phương thức /kham-da-ai\]   \[TASK-M5-02: Medical Consent Modal\]

                    │                                          │

                    ▼                                          │

            \[TASK-M4-03: Dashboard Kết quả Soi da\] \<───────────┘

                    │

                    ▼

            \[TASK-M4-04: Dẫn nhập Section AI Guide\]

                    │

                    ▼

            \[TASK-M6-01: Playwright E2E Tests\] ──\> \[TASK-M6-02: Build & Vercel Deploy\] ──\> \[TASK-M6-03: Rollback & Risk\]

### 5.2. Thứ Tự Triển Khai Theo Lô (Phased Execution Batches)

- **Lô 1 (Nền tảng Thu thập & Thị giác Máy tính Client-Side)**: `TASK-M1-01` $ ightarrow$ `TASK-M1-02` $ ightarrow$ `TASK-M1-03` $ ightarrow$ `TASK-M1-04`.  
- **Lô 2 (Động cơ Phân tích Xử lý Ảnh & Trí tuệ Nhân tạo)**: `TASK-M2-01`, `TASK-M2-02`, `TASK-M2-03` (Thực hiện song song / độc lập theo interface).  
- **Lô 3 (Thử nghiệm swatch, điểm heuristic & gợi ý routine tĩnh)**: `TASK-M3-01` $ ightarrow$ `TASK-M3-02` $ ightarrow$ `TASK-M3-03`.  
- **Lô 4 (Giao diện Người dùng, Lớp phủ Trực quan & Storefront)**: `TASK-M4-01` $ ightarrow$ `TASK-M4-02` $ ightarrow$ `TASK-M4-03` $ ightarrow$ `TASK-M4-04`.  
- **Lô 5 (CRM Intake, Bảo mật Y tế & Cấu hình Hệ thống)**: `TASK-M5-01` $ ightarrow$ `TASK-M5-02` $ ightarrow$ `TASK-M5-03` $ ightarrow$ `TASK-M5-04`.  
- **Lô 6 (Kiểm thử Toàn diện, Đóng gói & Phát hành Vercel)**: `TASK-M6-01` $ ightarrow$ `TASK-M6-02` $ ightarrow$ `TASK-M6-03`.

## 6\. Chi Tiết Toàn Bộ 21 Nhiệm Vụ Triển Khai (6 Modules)

# Module 1: Thu Thập Ảnh 3 Góc & Động Cơ LIQA Kiểm Định Thời Gian Thực

## TASK-M1-01: Xây dựng giao diện Web Camera 3 góc mặt và Khung định vị ảo (Guidance Frame)

- **Định danh & Mục tiêu**: `TASK-M1-01` | Tạo component camera HTML5/Canvas trên trình duyệt cho phép chụp tuần tự 3 góc mặt (Chính diện, Má trái 45°, Má phải 45°) theo mô hình tham chiếu HER Skincare | Module: `M1-CAMERA-LIQA` | REQ: `REQ-CAP-01`, `REQ-CAP-02`, `REQ-UI-01` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (Mục phân tích HER Skincare), `SRC-RULE-HDKTXD` (Responsive 320px \- 1920px).  
  - Tệp hiện có: `assets/global_core.scss.bwt`, `assets/page_ai_skin_quiz.scss.bwt`.  
  - Phụ thuộc: Không (Task khởi tạo của Module 1).  
  - Điều kiện: Trình duyệt hỗ trợ `navigator.mediaDevices.getUserMedia`; có fallback tải ảnh từ file cho thiết bị không có camera hoặc từ chối quyền.  
- **Các bước thực hiện**:  
  1. Xây dựng cấu trúc HTML wrapper `.pc-skin-camera-container` gồm: viewport video stream (`<video id="skinCameraStream">`), canvas vẽ khung hướng dẫn (`<canvas id="skinGuidanceCanvas">`), bộ chỉ thị trạng thái 3 góc (Step Indicators: Step 1 Frontal, Step 2 Left Cheek, Step 3 Right Cheek), và dock điều khiển (Nút Chụp, Nút Chuyển camera trước/sau, Nút Tải ảnh lên).  
  2. Triển khai script khởi tạo camera với cấu hình tối ưu độ phân giải cho da liễu: `ideal: 1920x1080` (HD), `min: 720x480` (SD), `facingMode: 'user'`.  
  3. Xây dựng máy trạng thái chụp 3 góc (State Transition Table):

| Trạng thái hiện tại | Sự kiện kích hoạt (Event) | Điều kiện kiểm tra (Condition) | Hành động thực thi (Action) | Trạng thái kế tiếp |
| :---- | :---- | :---- | :---- | :---- |
| `IDLE` | Người dùng bấm "Bắt đầu chụp" | Đã cấp quyền `getUserMedia` | Khởi động video stream, vẽ khung chính diện, bắt đầu LIQA loop | `CAPTURING_FRONT` |
| `CAPTURING_FRONT` | Bấm chụp hoặc Auto-snap | LIQA Chính diện ĐẠT (Yaw in \[-10, 10\], Pitch in \[-15, 15\], Light OK) | Chụp frame, lưu buffer `front_image`, đổi khung hướng dẫn sang góc trái 45° | `CAPTURING_LEFT` |
| `CAPTURING_LEFT` | Bấm chụp hoặc Auto-snap | LIQA Má trái ĐẠT (Yaw in \[-50, \-40\], Pitch in \[-15, 15\], Light OK) | Chụp frame, lưu buffer `left_image`, đổi khung hướng dẫn sang góc phải 45° | `CAPTURING_RIGHT` |
| `CAPTURING_RIGHT` | Bấm chụp hoặc Auto-snap | LIQA Má phải ĐẠT (Yaw in \[40, 50\], Pitch in \[-15, 15\], Light OK) | Chụp frame, lưu buffer `right_image`, dừng camera stream | `CAPTURE_COMPLETE` |
| `ANY` | Lỗi camera / Từ chối quyền | `NotAllowedError` hoặc `NotFoundError` | Hiển thị thông báo thân thiện, mở form tải ảnh 3 góc từ máy | `FALLBACK_UPLOAD` |

5. Mã giả quản lý stream và capture:

// Pseudo-code: Camera Capture Manager

class SkinCameraManager {

  constructor(videoEl, canvasEl, onCaptureComplete) {

    this.video \= videoEl;

    this.canvas \= canvasEl;

    this.ctx \= canvasEl.getContext('2d');

    this.currentStep \= 'front'; // 'front' | 'left' | 'right'

    this.capturedImages \= { front: null, left: null, right: null };

    this.stream \= null;

    this.onComplete \= onCaptureComplete;

  }

  async startStream() {

    try {

      this.stream \= await navigator.mediaDevices.getUserMedia({

        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },

        audio: false

      });

      this.video.srcObject \= this.stream;

      await this.video.play();

      this.renderGuidanceFrame();

    } catch (err) {

      this.handleCameraFallback(err);

    }

  }

  captureAngle(angleName, liqaResult) {

    if (\!liqaResult.isValid) return { success: false, reason: liqaResult.errorReason };

    const tempCanvas \= document.createElement('canvas');

    tempCanvas.width \= this.video.videoWidth;

    tempCanvas.height \= this.video.videoHeight;

    const tCtx \= tempCanvas.getContext('2d');

    tCtx.drawImage(this.video, 0, 0);

    this.capturedImages\[angleName\] \= tempCanvas.toDataURL('image/jpeg', 0.92);

    if (angleName \=== 'front') this.setStep('left');

    else if (angleName \=== 'left') this.setStep('right');

    else if (angleName \=== 'right') {

      this.stopStream();

      this.onComplete(this.capturedImages);

    }

    return { success: true };

  }

  stopStream() {

    if (this.stream) {

      this.stream.getTracks().forEach(track \=\> track.stop());

      this.stream \= null;

    }

  }

}

- **Đầu ra**:  
  - File tạo mới: `assets/skin-camera.js.bwt` (Logic điều khiển stream, chuyển bước, fallback upload).  
  - Snippet tạo mới: `snippets/skin_scan_camera.bwt` (Markup HTML component camera, thanh tiến độ 3 bước, khung hướng dẫn).  
- **Nghiệm thu**:  
  - `AC-M1-01-1`: Cho phép mở camera trước trên cả trình duyệt iOS Safari và Android Chrome, hiển thị video stream mượt mà (30fps).  
  - `AC-M1-01-2`: Chuyển bước tuần tự Chính diện → Má trái → Má phải; giữ ảnh độc lập trong RAM để xử lý, không mã hóa Base64 hoặc ghi ảnh vào Web Storage. Xác minh vòng đời ảnh bằng E2E và thiết bị mục tiêu.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M1-01-01` | Thành công | Trình duyệt hỗ trợ camera, cấp quyền | Bấm "Bắt đầu soi da" | Camera bật, video stream hiển thị, bước 1 "Chính diện" active | `REQ-CAP-01` |
| `CHK-M1-01-02` | Ngoại lệ | Người dùng từ chối quyền (Permission denied) | Bấm "Bắt đầu soi da" | Không crash console; chuyển sang tab tải ảnh 3 file từ thư viện | `REQ-UI-01` |
| `CHK-M1-01-03` | Ràng buộc | Chưa chụp đủ 3 góc | Bấm "Xem kết quả" | Nút bị disable; thông báo yêu cầu chụp đủ 3 góc mặt | `REQ-CAP-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Người dùng sử dụng thiết bị camera góc quá hẹp hoặc camera sau gây khó định vị.  
  - *Phát hiện*: Sự kiện `loadedmetadata` của video trả về resolution \< 480px hoặc tỷ lệ khung hình không chuẩn.  
  - *Giảm thiểu & Rollback*: Bổ sung nút lật camera (`switchCamera`), tự động căn tỷ lệ CSS `object-fit: cover`, mở luồng upload ảnh nếu người dùng gặp khó khăn.

---

## TASK-M1-02: Tích hợp Google MediaPipe Face Mesh tính toán góc xoay 3D (Yaw/Pitch) và tỷ lệ khoảng cách

- **Định danh & Mục tiêu**: `TASK-M1-02` | Tích hợp thư viện MediaPipe Face Mesh (468 landmarks) trên Client để ước lượng góc quay đầu (Head Pose Estimation) và khoảng cách khuôn mặt trong thời gian thực | Module: `M1-CAMERA-LIQA` | REQ: `REQ-LIQA-01`, `REQ-LIQA-02` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (MediaPipe 468 landmarks 3D mesh).  
  - Tệp từ task trước: `assets/skin-camera.js.bwt`.  
  - Phụ thuộc: `TASK-M1-01`.  
  - Điều kiện: Thư viện MediaPipe Face Mesh nạp qua CDN (CDN jsdelivr/unpkg) hoặc nạp động khi khởi động camera để không ảnh hưởng First Contentful Paint của trang.  
- **Các bước thực hiện**:  
  1. Tải nạp module `@mediapipe/face_mesh` dạng WebAssembly bất đồng bộ khi camera bắt đầu stream.  
  2. Trích xuất các điểm mốc 3D quan trọng: Đỉnh mũi (Landmark 1), Cằm (Landmark 152), Khóe mắt trái (Landmark 33), Khóe mắt phải (Landmark 263), Tai trái (Landmark 234), Tai phải (Landmark 454).  
  3. Tính toán góc quay Yaw (ngang) và Pitch (dọc) bằng thuật toán Perspective-n-Point (PnP) hoặc hình học tọa độ vector:  
     - Vector trục ngang: $\\vec{V}*{eyes} \= P*{263} \- P\_{33}$  
     - Độ lệch tâm mũi so với trung điểm hai khóe mắt: $\\Delta X \= P\_{1}.x \- \\frac{P\_{33}.x \+ P\_{263}.x}{2}$  
     - Góc $\\text{Yaw} \\approx \\arcsin\\left(\\frac{2 \\Delta X}{|\\vec{V}\_{eyes}|}\\right) \\times \\frac{180^\\circ}{\\pi}$  
     - Góc $\\text{Pitch} \\approx \\arctan\\left(\\frac{P\_{1}.y \- \\frac{P\_{33}.y \+ P\_{263}.y}{2}}{|\\vec{V}\_{eyes}|}\\right) \\times \\frac{180^\\circ}{\\pi}$  
  4. Tính toán tỷ lệ kích thước khuôn mặt: Diện tích Bounding Box khuôn mặt so với diện tích khung hình video. Ngưỡng hợp lệ: $0.45 \\le \\text{FaceAreaRatio} \\le 0.75$.  
  5. Bảng quyết định kiểm định góc mặt (Decision Table):

| Góc cần chụp (Target) | Góc Yaw đo được (Độ) | Góc Pitch đo được (Độ) | Tỷ lệ khung mặt (Ratio) | Kết luận LIQA | Phản hồi giao diện (UI Feedback) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Chính diện (Front)** | $\[-10^\\circ, \+10^\\circ\]$ | $\[-15^\\circ, \+15^\\circ\]$ | $\[0.45, 0.75\]$ | **ĐẠT (PASS)** | Khung xanh lá; Hiện nút chụp / Tự động chụp sau 1.5s |
| **Chính diện (Front)** | $\> \+15^\\circ$ hoặc $\< \-15^\\circ$ | Bất kỳ | Bất kỳ | **LỖI GÓC** | Khung vàng; "Vui lòng nhìn thẳng vào camera" |
| **Chính diện (Front)** | Bất kỳ | $\> \+18^\\circ$ (ngửa) / $\< \-18^\\circ$ (cúi) | Bất kỳ | **LỖI PITCH** | Khung vàng; "Giữ đầu thẳng, không cúi hoặc ngửa mặt" |
| **Chính diện (Front)** | $\[-10^\\circ, \+10^\\circ\]$ | $\[-15^\\circ, \+15^\\circ\]$ | $\< 0.45$ | **LỖI KHOẢNG CÁCH** | Khung cam; "Vui lòng đưa mặt lại gần hơn" |
| **Chính diện (Front)** | $\[-10^\\circ, \+10^\\circ\]$ | $\[-15^\\circ, \+15^\\circ\]$ | $\> 0.75$ | **LỖI KHOẢNG CÁCH** | Khung cam; "Vui lòng đưa mặt ra xa một chút" |
| **Má trái (Left 45°)** | $\[-52^\\circ, \-38^\\circ\]$ | $\[-15^\\circ, \+15^\\circ\]$ | $\[0.40, 0.75\]$ | **ĐẠT (PASS)** | Khung xanh lá; "Góc má trái hoàn hảo" \-\> Sẵn sàng chụp |
| **Má trái (Left 45°)** | $\> \-35^\\circ$ | $\[-15^\\circ, \+15^\\circ\]$ | Hợp lệ | **CHƯA ĐỦ GÓC** | Khung vàng; "Nghiêng mặt sang phải thêm một chút" |
| **Má phải (Right 45°)** | $\[+38^\\circ, \+52^\\circ\]$ | $\[-15^\\circ, \+15^\\circ\]$ | $\[0.40, 0.75\]$ | **ĐẠT (PASS)** | Khung xanh lá; "Góc má phải hoàn hảo" \-\> Sẵn sàng chụp |

- **Đầu ra**:  
  - File tạo mới: `assets/skin-liqa-mesh.js.bwt` (Tích hợp MediaPipe Face Mesh, tính Yaw/Pitch/Scale).  
- **Nghiệm thu**:  
  - `AC-M1-02-1` (target chưa xác nhận): Nhận diện 468 landmarks; phải đo p50/p95 trên thiết bị mục tiêu trước khi đặt ngưỡng latency. Hiện E2E chỉ xác minh logic với landmarks tổng hợp.  
  - `AC-M1-02-2` (target chưa xác nhận): Ước lượng góc và đổi trạng thái hướng dẫn; sai số phải đo so với ground truth được gán nhãn, không được xem ±3° là đạt khi chưa có benchmark.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M1-02-01` | Thành công | Mặt chính diện, khoảng cách chuẩn | Người dùng nhìn thẳng vào khung | Khung chuyển màu xanh `#3CB371`, status hiển thị "Góc mặt chuẩn" | `REQ-LIQA-01` |
| `CHK-M1-02-02` | Biên (Góc quay) | Quay mặt lệch 25 độ ở bước Chính diện | Xoay nhẹ đầu sang một bên | Khung màu vàng, thông báo "Vui lòng nhìn thẳng vào camera" | `REQ-LIQA-01` |
| `CHK-M1-02-03` | Biên (Khoảng cách) | Đứng cách xa camera 2m (khuôn mặt nhỏ) | Giữ nguyên tư thế | Thông báo "Vui lòng đưa mặt lại gần hơn", chặn chụp tự động | `REQ-LIQA-02` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Thiết bị cấu hình yếu bị giật lag khi chạy MediaPipe liên tục 30fps.  
  - *Phát hiện*: Frame processing time vượt quá 80ms trong 3 frame liên tiếp.  
  - *Giảm thiểu & Rollback*: Tự động điều chỉnh tần suất phân tích (throttle xuống 10fps hoặc 5fps), chỉ tính toán mỗi 200ms thay vì mọi frame.

---

## TASK-M1-03: Bộ lọc Canvas kiểm tra cường độ ánh sáng và phát hiện che khuất (Occlusion)

- **Định danh & Mục tiêu**: `TASK-M1-03` | Xây dựng thuật toán phân tích histogram điểm ảnh trên HTML5 Canvas để kiểm tra ánh sáng đồng đều và kiểm tra che khuất do kính hoặc tóc | Module: `M1-CAMERA-LIQA` | REQ: `REQ-CAP-02`, `REQ-LIQA-02` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (Chuẩn mặt mộc, không kính, vén tóc, ánh sáng đồng đều).  
  - Tệp từ task trước: `assets/skin-liqa-mesh.js.bwt`.  
  - Phụ thuộc: `TASK-M1-02`.  
  - Điều kiện: Đã có tọa độ các mốc khuôn mặt từ MediaPipe để cắt đúng Vùng Da Quan Tâm (ROI).  
- **Các bước thực hiện**:  
  1. Trích xuất mảng pixel từ vùng da mặt (Face ROI Canvas) và chuyển đổi sang thang độ xám (Grayscale): $$Y \= 0.299R \+ 0.587G \+ 0.114B$$  
  2. Tính toán độ sáng trung bình $\\mu\_Y$ và độ lệch chuẩn $\\sigma\_Y$ (đại diện cho độ tương phản): $$\\mu\_Y \= \\frac{1}{N} \\sum\_{i=1}^N Y\_i, \\quad \\sigma\_Y \= \\sqrt{\\frac{1}{N} \\sum\_{i=1}^N (Y\_i \- \\mu\_Y)^2}$$  
  3. Đánh giá ánh sáng:  
     - Thiếu sáng (Underexposed): $\\mu\_Y \< 75$ \-\> Yêu cầu di chuyển đến nơi sáng hơn hoặc bật đèn.  
     - Cháy sáng (Overexposed): $\\mu\_Y \> 225$ \-\> Yêu cầu tránh ánh đèn rọi trực tiếp hoặc ngược sáng.  
     - Ánh sáng chuẩn: $85 \\le \\mu\_Y \\le 215$ và $\\sigma\_Y \\ge 35$.  
  4. Kiểm tra che khuất vùng trán và sống mũi (Occlusion Check):  
     - Dùng các điểm mốc MediaPipe vùng sống mũi (Landmarks 6, 168, 8, 9\) và vùng giữa lông mày (Landmark 10). Nếu xuất hiện đường gờ tương phản sắc nét bất thường với độ dốc gradient $\> 80$ tại vùng mắt/sống mũi \-\> Cảnh báo "Vui lòng tháo kính".  
     - Dùng các điểm mốc trán (Landmarks 10, 338, 297, 67, 109). Nếu độ phân tán màu vùng trán không khớp với màu da má (xuất hiện mảng tối của tóc che trán) \-\> Cảnh báo "Vui lòng vén tóc gọn gàng".  
- **Đầu ra**:  
  - File tạo mới: `assets/skin-liqa-lighting.js.bwt` (Hàm tính histogram, độ sáng, độ chênh lệch chiếu sáng 2 bên má, kiểm tra kính/tóc).  
- **Nghiệm thu**:  
  - `AC-M1-03-1`: Phát hiện chính xác phòng tối (\< 70 lux) và phòng ngược sáng trong thời gian thực.  
  - `AC-M1-03-2`: Cảnh báo trực quan trên UI hướng dẫn người dùng điều chỉnh trước khi cho phép chụp ảnh.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M1-03-01` | Thành công | Ánh sáng tự nhiên đồng đều ($\\mu\_Y \= 140$) | Đưa mặt vào khung | Đèn chỉ thị ánh sáng hiển thị "Ánh sáng tốt (Đạt)" | `REQ-LIQA-02` |
| `CHK-M1-03-02` | Thiếu sáng | Phòng tắt điện, tối ($\\mu\_Y \= 45$) | Bật camera trong tối | Cảnh báo "Không gian quá tối, vui lòng bật thêm đèn" | `REQ-LIQA-02` |
| `CHK-M1-03-03` | Che khuất | Người dùng đeo kính cận | Đưa mặt vào khung | Cảnh báo "Phát hiện kính mắt, vui lòng tháo kính để phân tích chuẩn xác" | `REQ-CAP-02` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Sai lệch khi nhận diện tóc giả/mũ đội đầu hoặc người có râu quai nón.  
  - *Phát hiện*: Vùng cằm có pixel tối nhưng vùng trán và má hoàn toàn sáng.  
  - *Giảm thiểu & Rollback*: Chỉ áp dụng kiểm tra tóc che ở vùng trán trên (Upper Forehead ROI), cho phép người dùng bấm "Tôi đã sẵn sàng" để bỏ qua cảnh báo sau 2 lần nhắc.

---

## TASK-M1-04: Che vùng mắt trên Preview để giảm lộ diện & Phân tách ROI (T-Zone/U-Zone)

- **Định danh & Mục tiêu**: `TASK-M1-04` | Che vùng mắt/lông mày trên bản preview hiển thị và cắt tách ROI T-Zone/U-Zone. Phép đo local thử nghiệm vẫn sử dụng buffer ảnh gốc trong RAM; không truyền ảnh trong luồng hiện tại. Mask chỉ giảm lộ diện, không làm ảnh ẩn danh. Mọi lần truyền tương lai phải được rà soát mục đích/căn cứ/provider riêng | Module: `M1-CAMERA-LIQA` | REQ: `REQ-PRIV-01`, `REQ-CAP-01` | Trạng thái: `implemented_limited; legal_review_open`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (Công nghệ Skin Atlas™ LIQA, GDPR Article 9), `SRC-PAGE-AI-QUIZ`.  
  - Tệp từ task trước: `assets/skin-liqa-mesh.js.bwt`.  
  - Phụ thuộc: `TASK-M1-02`, `TASK-M1-03`.  
  - Điều kiện: 3 ảnh chụp đã được ghi nhận vào bộ đệm RAM của trình duyệt.  
- **Các bước thực hiện**:  
  1. Dựa trên tọa độ Mesh 468 điểm, tạo mặt nạ đa giác (Polygon Mask) cho:  
     - Mắt trái: Tọa độ mốc 33, 160, 158, 133, 153, 144\.  
     - Mắt phải: Tọa độ mốc 362, 385, 387, 263, 373, 380\.  
     - Vùng lông mày trái và phải: Tọa độ mốc 70, 63, 105, 66, 107 và 300, 293, 334, 296, 336\.  
  2. Tùy chọn "Che vùng mắt trên ảnh báo cáo hiển thị" (mặc định BẬT):  
     - Tạo bản sao Canvas và phủ mask trung tính lên vùng mắt/lông mày để dựng preview. Fallback khi thiếu landmarks che dải rộng bảo thủ.  
     - Chỉ dùng buffer ảnh gốc trong RAM cho phép đo thử nghiệm tại thiết bị; preview đã che không được xem là ẩn danh và không được gửi đi. Cloud/upload tiếp tục fail-closed cho tới khi có consent/provider và duyệt riêng tư/pháp lý.  
  3. Cắt phân vùng ngữ nghĩa (Semantic ROI Cropping) thành các ảnh con (Sub-crops):  
     - `t_zone_crop`: Chứa Trán (Forehead) và Mũi (Nose) để phân tích dầu nhờn, mụn đầu đen, sợi bã nhờn, lỗ chân lông to.  
     - `u_zone_left_crop` / `u_zone_right_crop`: Chứa Gò má và Góc hàm để phân tích độ nhạy cảm, giãn mao mạch, đốm sắc tố/nám và nếp nhăn tĩnh.  
     - `neck_crop`: Vùng rãnh cổ (dưới cằm) để phân tích nếp nhăn tư thế Tech Neck.  
- **Đầu ra**:  
  - File: `assets/skin-deid-roi.js.bwt` (Tạo mask cho preview và trích xuất ROI đa tầng; không thực hiện ẩn danh).  
- **Nghiệm thu**:  
  - `AC-M1-04-1`: Preview hiển thị che vùng mắt/lông mày; phép đo tại thiết bị vẫn dùng buffer gốc trong RAM; không tuyên bố chống nhận diện/ẩn danh và không truyền ảnh.  
  - `AC-M1-04-2`: Xuất đủ 4 mảng ROI (Trán, Mũi, Má trái, Má phải, Cổ) với tỷ lệ pixel sắc nét phục vụ phân tích.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M1-04-01` | Thành công | 3 ảnh chụp khuôn mặt hoàn chỉnh | Kích hoạt phép che preview | E2E xác nhận preview che vùng mắt; phép đo vẫn đọc buffer gốc; Web Storage/CRM không chứa ảnh; không gọi ảnh đã che là ẩn danh | `REQ-PRIV-01` |
| `CHK-M1-04-02` | Tách ROI | Ảnh góc nghiêng má trái | Gọi hàm `extractUZone()` | Cắt chính xác vùng má trái từ thái dương đến viền hàm, loại bỏ tai và tóc | `REQ-CAP-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Mặt nạ che mắt lấn sang vùng bọng mắt hoặc rãnh chân chim (Crow's feet), làm mất dữ liệu phân tích nếp nhăn mắt.  
  - *Phát hiện*: Điểm nếp nhăn mắt luôn bằng 0 ở mọi bệnh nhân khi bật chế độ che mắt.  
  - *Giảm thiểu & Rollback*: Bán kính che mắt được tính toán thu hẹp chặt chẽ theo đường viền mi trên/mi dưới của MediaPipe, không che quá vùng gò má trên.

---

# Module 2: Động Cơ Phân Tích Thị Giác Máy Tính & Hybrid AI Adapter

## TASK-M2-01: Module OpenCV.js Client-Side: Không gian màu HSV/YCbCr & Ma trận Hessian Nếp nhăn

- **Định danh & Mục tiêu**: `TASK-M2-01` | Triển khai thuật toán xử lý ảnh truyền thống bằng OpenCV.js chạy WebAssembly trên trình duyệt để phát hiện vùng da ửng đỏ (Erythema) và định lượng nếp nhăn/rãnh cổ (Tech Neck) qua đạo hàm bậc hai | Module: `M2-ANALYSIS-PIPELINE` | REQ: `REQ-AI-01`, `REQ-SCORE-01` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (Mục OpenCV không gian màu HSV/YCbCr và Ma trận Hessian), `SRC-RULE-HDKTXD` (Không lỗi console JS).  
  - Tệp từ task trước: `assets/skin-deid-roi.js.bwt`.  
  - Phụ thuộc: `TASK-M1-04`.  
  - Điều kiện: Thư viện `opencv.js` bản rút gọn (chỉ chứa core \+ imgproc, \~2MB gzip) được tải bất đồng bộ khi bước chụp ảnh hoàn tất.  
- **Các bước thực hiện**:  
  1. **Thuật toán Phân tách Vùng Da & Độ Đỏ (Skin & Redness Segmentation)**:  
     - Nhận ảnh con từng vùng ROI từ Task M1-04.  
     - Chuyển đổi ma trận ảnh từ RGB sang không gian màu YCrCb và HSV: $$cv.cvtColor(src, dstYCrCb, cv.COLOR\_RGB2YCrCb)$$ $$cv.cvtColor(src, dstHSV, cv.COLOR\_RGB2HSV)$$  
     - Tạo mặt nạ vùng da lành theo dải quang phổ da người: $$0 \\le H \\le 20, \\quad 25 \\le S \\le 180, \\quad 135 \\le Cr \\le 180, \\quad 85 \\le Cb \\le 135$$  
     - Đo lường chỉ số đỏ da (Erythema Index \- EI): $$EI \= \\log\_{10}(S\_{red}) \- \\log\_{10}(S\_{green})$$ Các pixel có $EI \> \\text{Threshold}\_{erythema}$ và nằm trong vùng da được đánh dấu là vùng đỏ viêm/giãn mao mạch.  
  2. **Thuật toán Định lượng Nếp nhăn bằng Ma trận Hessian (Hessian Matrix Wrinkle Filter)**:  
     - Chuyển ảnh vùng trán, đuôi mắt và vùng cổ sang thang độ xám (Grayscale) $I(x,y)$.  
     - Áp dụng bộ lọc Gaussian lọc nhiễu lỗ chân lông nhỏ: $I\_\\sigma \= I \* G\_\\sigma$ với $\\sigma \= 1.2$.  
     - Tính các đạo hàm riêng bậc một và bậc hai theo hướng ngang ($x$) và dọc ($y$) bằng toán tử Sobel/Scharr: $$L\_{xx} \= \\frac{\\partial^2 I\_\\sigma}{\\partial x^2}, \\quad L\_{yy} \= \\frac{\\partial^2 I\_\\sigma}{\\partial y^2}, \\quad L\_{xy} \= \\frac{\\partial^2 I\_\\sigma}{\\partial x \\partial y}$$  
     - Với mỗi điểm ảnh, xây dựng Ma trận Hessian $H(x,y)$: $$H \= \\begin{bmatrix} L\_{xx} & L\_{xy} \\ L\_{xy} & L\_{yy} \\end{bmatrix}$$  
     - Tính các giá trị riêng (Eigenvalues) $\\lambda\_1, \\lambda\_2$ của ma trận $H$ ($|\\lambda\_1| \\ge |\\lambda\_2|$).  
     - Đường nếp nhăn (Ridge/Valley Line) thỏa mãn điều kiện: $\\lambda\_1 \> 0$ (cho rãnh tối) và $|\\lambda\_1| \\gg |\\lambda\_2|$.  
     - Trích xuất điểm nếp nhăn (Wrinkle Map) và tích phân chiều dài nếp nhăn trên đơn vị diện tích $cm^2$.  
  3. Bảng quyết định phát hiện nếp nhăn và độ đỏ:

| Vùng giải phẫu da (ROI) | Chỉ số toán học đo được | Ngưỡng phân loại | Tình trạng lâm sàng tương ứng | Điểm thô (raw\_score) |
| :---- | :---- | :---- | :---- | :---- |
| **Vùng má (U-Zone)** | Tỷ lệ diện tích đỏ $A\_{red} / A\_{skin}$ | $\< 2%$ | Da dịu, không viêm đỏ | $0.05$ (Rất tốt) |
| **Vùng má (U-Zone)** | Tỷ lệ diện tích đỏ $A\_{red} / A\_{skin}$ | $2% \- 6%$ | Đỏ nhẹ, nhạy cảm bề mặt | $0.25$ (Nhẹ) |
| **Vùng má (U-Zone)** | Tỷ lệ diện tích đỏ $A\_{red} / A\_{skin}$ | $\> 6%$ | Giãn mao mạch / Rosacea nghi ngờ | $0.65$ (Cần điều trị) |
| **Vùng trán & Mắt** | Mật độ rãnh Hessian $D\_{hessian}$ | $\< 5$ vệt/$cm^2$ | Da đàn hồi tốt, nếp nhăn động mờ | $0.10$ (Trẻ khỏe) |
| **Vùng trán & Mắt** | Mật độ rãnh Hessian $D\_{hessian}$ | $5 \- 15$ vệt/$cm^2$ | Nếp nhăn biểu cảm (vết chân chim) | $0.40$ (Trung bình) |
| **Vùng trán & Mắt** | Mật độ rãnh Hessian $D\_{hessian}$ | $\> 15$ vệt/$cm^2$ | Nếp nhăn tĩnh sâu, đứt gãy collagen | $0.75$ (Lão hóa sâu) |
| **Vùng rãnh cổ (Neck)** | Hessian theo phương ngang $L\_{xx}$ | $\> 3$ rãnh dài liên tục | Hội chứng nếp nhăn cổ "Tech Neck" | $0.70$ (Cần nâng cơ) |

- **Đầu ra**:  
  - File tạo mới: `assets/skin-cv-engine.js.bwt` (Triển khai thuật toán YCrCb/HSV Redness và Hessian Wrinkle Detector).  
- **Nghiệm thu**:  
  - `AC-M2-01-1` (chưa đạt): Mục tiêu ban đầu là đo thời gian và chất lượng xử lý; code hiện tại dùng heuristic Canvas/pixel, chưa phải OpenCV.js hoặc Hessian và chưa được xác nhận trên thiết bị/người thật.  
  - `AC-M2-01-2` (chưa đạt): Chỉ nghiệm thu mask nếu thuật toán có ground truth và đánh giá sai số phù hợp; không coi mảng mask rỗng/heuristic hiện tại là phát hiện hợp lệ.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M2-01-01` | Khối đỏ da | Vùng má xuất hiện mảng đỏ kích ứng | Chạy `analyzeRedness(crop)` | Phát hiện diện tích vùng đỏ chính xác, trả về tỷ lệ phần trăm và mask tọa độ | `REQ-AI-01` |
| `CHK-M2-01-02` | Nếp nhăn cổ | Vùng cổ có rãnh ngang sâu (Tech Neck) | Chạy `analyzeWrinkles(neckCrop)` | Bắt đúng các rãnh ngang qua Hessian Eigenvalues, gắn cờ `tech_neck_detected = true` | `REQ-AI-01` |
| `CHK-M2-01-03` | Nền da khỏe | Ảnh da căng mịn không nếp nhăn | Chạy phân tích | Mật độ nếp nhăn xấp xỉ 0, raw\_score \<= 0.08 | `REQ-SCORE-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*:opencv.js chiếm dung lượng bộ nhớ lớn có thể làm đơ tab trình duyệt trên thiết bị di động RAM \< 3GB.  
  - *Phát hiện*: Heap allocation vượt quá 150MB hoặc sự kiện `out of memory`.  
  - *Giảm thiểu & Rollback*: Giải phóng bộ nhớ ngay sau mỗi phép tính bằng `mat.delete()`, nạp Web Worker độc lập (`skin-cv-worker.js`) để không chặn luồng UI chính của trình duyệt.

---

## TASK-M2-02: Scaffold ONNX Runtime Web; chưa có model phát hiện mụn/sắc tố được xác thực

- **Định danh & Mục tiêu**: `TASK-M2-02` | Tích hợp mô hình học sâu siêu nhẹ (YOLOv8-nano / YOLOv11-nano INT8 quantized, dung lượng \~3.8MB) chạy suy luận trực tiếp trên trình duyệt qua ONNX Runtime Web WebAssembly/WebGL để định vị nốt mụn và đốm nâu | Module: `M2-ANALYSIS-PIPELINE` | REQ: `REQ-AI-02`, `REQ-SCORE-01` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (Kiến trúc YOLOv8 nano, Roboflow dataset, Soft-NMS).  
  - Tệp từ task trước: `assets/skin-deid-roi.js.bwt`.  
  - Phụ thuộc: `TASK-M1-04`.  
  - Điều kiện: Trình duyệt hỗ trợ WebAssembly và WebGL (chiếm \>99% thiết bị hiện đại). Mô hình `.onnx` được host tại thư mục assets hoặc CDN công cộng.  
- **Các bước thực hiện**:  
  1. Tích hợp thư viện `ort.min.js` (ONNX Runtime Web v1.17+). Cấu hình execution providers ưu tiên `webgl`, sau đó fallback sang `wasm`.  
  2. Tải mô hình `skin-yolo11n-quant.onnx` (các nhãn: `0: acne_inflammatory` \- mụn viêm, `1: acne_comedone` \- mụn ẩn/đầu đen, `2: pigmentation_spot` \- tàn nhang/đốm nâu, `3: pore_enlarged` \- lỗ chân lông to).  
  3. Tiền xử lý ảnh đầu vào (Preprocessing):  
     - Resize ảnh ROI về kích thước $640 \\times 640$ (letterbox padding giữ nguyên tỷ lệ).  
     - Chuẩn hóa ma trận điểm ảnh: Chuyển thang $0 \- 255$ về $\[0.0, 1.0\]$.  
     - Chuyển layout dữ liệu sang chuẩn NCHW: `[1, 3, 640, 640]`.  
  4. Chạy suy luận (Inference): $$output \= \\text{session.run}({ images: inputTensor })$$  
  5. Hậu xử lý (Postprocessing):  
     - Lọc Bounding Boxes qua ngưỡng tự tin $\\text{Confidence} \\ge 0.35$.  
     - Áp dụng Non-Maximum Suppression (NMS với IoU threshold \= 0.45) để loại bỏ các hộp nhận diện trùng lặp trên cùng một nốt mụn.  
     - Ánh xạ ngược tọa độ hộp giới hạn (Bounding Box $\[x\_{min}, y\_{min}, x\_{max}, y\_{max}\]$) từ tỷ lệ $640 \\times 640$ về tọa độ gốc của ảnh chụp.  
  6. Mã giả pipeline suy luận ONNX:

// Pseudo-code: Edge ONNX Inference Engine

class EdgeSkinInference {

  constructor(modelUrl) {

    this.modelUrl \= modelUrl;

    this.session \= null;

  }

  async initialize() {

    if (this.session) return;

    this.session \= await ort.InferenceSession.create(this.modelUrl, {

      executionProviders: \['webgl', 'wasm'\],

      graphOptimizationLevel: 'all'

    });

  }

  async detectLesions(canvasRoi) {

    await this.initialize();

    const { tensor, scale, padX, padY } \= this.preprocess(canvasRoi, 640, 640);

    const results \= await this.session.run({ images: tensor });

    const rawOutput \= results\[this.session.outputNames\[0\]\].data;

    const boxes \= this.postprocess(rawOutput, scale, padX, padY, 0.35, 0.45);

    return {

      acneCount: boxes.filter(b \=\> b.classId \=== 0).length,

      blackheadCount: boxes.filter(b \=\> b.classId \=== 1).length,

      spotCount: boxes.filter(b \=\> b.classId \=== 2).length,

      detections: boxes

    };

  }

}

- **Đầu ra**:  
  - File tạo mới: `assets/skin-onnx-engine.js.bwt` (Wrapper nạp ONNX Runtime, tiền xử lý ảnh, NMS và trích xuất tọa độ nốt mụn).  
- **Nghiệm thu**:  
  - `AC-M2-02-1` (chưa đo): Đặt benchmark p50/p95 riêng cho GPU/CPU sau khi chọn model/runtime và thiết bị; con số 450/1200ms chỉ là giả thuyết kế hoạch, chưa phải cam kết.  
  - `AC-M2-02-2` (chưa đạt): Chỉ nghiệm thu theo bộ dữ liệu được phép, nhãn đã thẩm định và metric precision/recall theo từng lớp; decoder/tensor tổng hợp không chứng minh khả năng nhận diện tổn thương.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M2-02-01` | Mụn viêm | Ảnh má có 5 nốt mụn đỏ sưng | Chạy `detectLesions()` | Trả về 5 bounding boxes nhãn `acne_inflammatory`, confidence \> 0.4 | `REQ-AI-02` |
| `CHK-M2-02-02` | Tàn nhang | Vùng sống mũi và gò má có đốm nâu | Chạy `detectLesions()` | Bắt các đốm `pigmentation_spot`, tọa độ nằm chuẩn trên sống mũi | `REQ-AI-02` |
| `CHK-M2-02-03` | Fallback CPU | Trình duyệt tắt tăng tốc phần cứng WebGL | Gọi suy luận | Tự động rơi về backend `wasm`, không phát sinh lỗi ngoại lệ | `REQ-AI-02` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Tải file model `.onnx` (3.8MB) bị ngắt quãng do kết nối mạng di động chập chờn.  
  - *Phát hiện*: Lỗi `fetch` timeout hoặc hash SHA-256 của file tải về không khớp.  
  - *Giảm thiểu & Rollback*: Tự động thử lại 1 lần qua CDN dự phòng; nếu vẫn lỗi, kích hoạt chế độ Fallback sang phân tích OpenCV thuần (Task M2-01) kết hợp trắc nghiệm câu hỏi để vẫn trả ra kết quả cho người dùng.

---

## TASK-M2-03: API adapter `/api/skin-analysis` và gate tích hợp Cloud trong tương lai

- **Định danh & Mục tiêu**: `TASK-M2-03` | Endpoint `/api/skin-analysis` hiện là adapter tổng quát có consent gate, allowlist, rate limit và validation upstream; đây chưa phải tích hợp Perfect Corp/Skinive/Face++ cụ thể. Giữ Cloud storefront fail-closed cho tới khi provider, xử lý ảnh, hợp đồng dữ liệu và rà soát riêng tư/pháp lý được duyệt | Module: `M2-ANALYSIS-PIPELINE` | REQ: `REQ-AI-03`, `REQ-PRIV-02` | Trạng thái: `adapter scaffold implemented; provider/legal/deployment acceptance open`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (Cơ chế S2S Polling của Perfect Corp, Skinive Triage JSON, Face++ Rate Limits), `SRC-VERCEL-CONFIG` (`vercel.json`), `SRC-CLINERULES-02` (Biến môi trường Vercel).  
  - Tệp hiện có: `api/index.js`, `dev-server.js`.  
  - Phụ thuộc: Không (Có thể chạy độc lập hoặc song song với Edge Engine).  
  - Điều kiện hiện tại: `SKIN_ANALYSIS_ADAPTER_URL` và `SKIN_ANALYSIS_ADAPTER_TOKEN` chỉ cấu hình khi adapter/provider đích đã được kiểm tra và phê duyệt. Không tạo biến/credential cho provider cụ thể trước khi xác minh API, điều khoản, retention, subprocessors và luồng consent.  
- **Các bước thực hiện**:  
  1. Route POST `/api/skin-analysis` trong `dev-server.js` chuyển qua `api/index.js`; chỉ nhận provider allowlist, consent có thời điểm hợp lệ và payload theo schema.  
  2. Rate-limit 5 request/IP/phút: production Vercel phải có KV/Redis limiter liên-instance; thiếu/sai KV thì fail-closed `503`. Unit test mô phỏng KV và local limiter, chưa thay thế xác minh cấu hình/hoạt động trên project Vercel thật.  
  3. Adapter upstream tổng quát hiện chỉ forward `{provider,image}`. Các provider-specific adapter bên dưới là giả thuyết từ intake, chưa xác minh tài liệu API hiện hành và chưa phải code đã triển khai; phải kiểm tra lại API/điều khoản với nhà cung cấp trước khi thiết kế:  
     - **Adapter 1: Perfect Corp (YouCam API)**:  
       * Bước 1: Gửi yêu cầu lấy Pre-signed S3 URL từ Perfect Corp.  
       * Bước 2: Chỉ nghiên cứu sau khi có phê duyệt pháp lý/provider và đồng ý riêng. Không gửi ảnh từ storefront hiện tại. Cờ `face_mask_applied` do caller khai báo không chứng minh server đã áp dụng mask; mask không chứng minh ẩn danh.  
       * Bước 3: Gửi POST `/v1.0/analyze` nhận `task_id`.  
       * Bước 4: Chạy Polling lặp lại mỗi 1000ms (tối đa 15s) đến khi status \= 'success', nhận về `raw_score`, `ui_score` và `mask_urls`.  
     - **Adapter 2: Skinive.Cloud**:  
       * Gửi POST multipart đến `https://api.skinive.cloud/v1/analyze` mang token Bearer.  
       * Nhận cấu trúc JSON chứa `triage_level`, `disease_risk`, `confidence`.  
     - **Adapter 3: Face++ (Megvii)**:  
       * Gửi POST đến endpoint `https://api-us.faceplusplus.com/facepp/v3/skinanalyze`.  
       * Nhận `acne`, `dark_circle`, `stain`, `wrinkle` scores.  
  4. Chuẩn hóa đầu ra (Normalized Schema Response): Chỉ thiết kế schema sau khi contract provider được xác minh. JSON minh họa phía dưới là dữ liệu giả, không phải output provider hoặc chỉ số khách hàng thật:

{

  "success": true,

  "provider": "perfect\_corp|skinive|faceplusplus|edge\_local",

  "data": {

    "acne": { "raw": 0.32, "ui": 78, "level": "Nhẹ" },

    "pigmentation": { "raw": 0.45, "ui": 68, "level": "Trung bình" },

    "wrinkles": { "raw": 0.20, "ui": 85, "level": "Ít nếp nhăn" },

    "redness": { "raw": 0.15, "ui": 88, "level": "Bình thường" },

    "pores": { "raw": 0.50, "ui": 65, "level": "Lỗ chân lông to" },

    "skin\_type": "combination",

    "monk\_skin\_tone": 4,

    "tech\_neck\_detected": false

  }

}

  5. Không tuyên bố Process-and-Discard chỉ dựa vào biến RAM/GC: trước mọi kết nối thật phải kiểm tra logs, tracing, proxy, provider storage/retention, backups và xóa dữ liệu. Hiện adapter có thể chuyển tiếp ảnh nếu được cấu hình và request qua gate; storefront không gọi luồng này, và production adapter chưa được cấu hình/duyệt.  
- **Đầu ra**:  
  - Tệp mở rộng: `dev-server.js` (Thêm endpoint `/api/skin-analysis` xử lý proxy API).  
  - Tệp tạo mới: `scripts/skin-providers/perfect-corp.js`, `scripts/skin-providers/skinive.js`, `scripts/skin-providers/faceplusplus.js`.  
- **Nghiệm thu**:  
  - `AC-M2-03-1`: Với adapter chưa cấu hình, endpoint phải trả `503 cloud_adapter_not_configured`; khi consent/provider/payload không đạt phải từ chối, không forward. Chỉ nghiệm thu response provider sau integration test trên staging đã duyệt và đo latency thực.  
  - `AC-M2-03-2`: Secret upstream không xuất hiện trong response/log/client bundle; kiểm tra bằng test và quan sát staging. Hiện unit test chỉ xác minh Bearer header gửi upstream và response không chứa token.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M2-03-01` | Fail-closed / consent | Thiếu adapter, consent, thời điểm consent hoặc `face_mask_applied`; dữ liệu mask chỉ là caller claim | Node unit test với mock upstream | Thiếu config: `503`; consent/mask sai: `400`; invalid case không gọi upstream. Không gửi ảnh production. | `REQ-AI-03`, `REQ-PRIV-02` |
| `CHK-M2-03-02` | Secret / allowlist | Adapter mock thành công và provider ngoài allowlist | Node unit test | Secret chỉ ở header server-to-server; response không lộ token; provider lạ bị từ chối. Chưa chứng minh provider thật. | `REQ-AI-03` |
| `CHK-M2-03-03` | Rate limit | 6 request cùng IP; thiếu KV trong Vercel mode; KV mock lỗi | Node unit test mô phỏng | Local test: request vượt quota `429`; Vercel mode thiếu/lỗi KV `503 rate_limit_unavailable`, upstream không bị gọi khi limiter lỗi. Chưa có Vercel KV smoke test thật. | `REQ-AI-03` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Cloud API bên thứ 3 bị sập mạng hoặc hết quota đột ngột.  
  - *Phát hiện*: Endpoint trả về mã lỗi HTTP 401/403/429/500 hoặc timeout quá 10s.  
  - *Giảm thiểu & Rollback*: Hiện storefront khóa Cloud/Hybrid và cho người dùng chuyển sang khảo sát; không tuyên bố tự động chuyển sang Edge. Nếu sau này được bật, thiết kế và test Circuit Breaker/fallback riêng trước khi quảng bá.

---

# Module 3: Thử nghiệm swatch, heuristic scoring và gợi ý routine/catalog tĩnh

## TASK-M3-01: So khớp tham chiếu màu swatch MST (thử nghiệm, chưa phải de-biasing)

- **Định danh & Mục tiêu**: `TASK-M3-01` | Code hiện so RGB/Lab của pixel ảnh với 10 swatch A-J rồi trả mức gần nhất và hệ số heuristic. Đây chỉ là phân loại màu tham khảo; không gọi là phân loại sắc tộc, chuẩn hóa sắc tố hoặc loại bỏ thiên lệch. Không dùng kết quả này để tự điều chỉnh ngưỡng detector cho tới khi có validation | Module: `M3-SCORING-DEBIASING` | REQ: `REQ-SCORE-02` | Trạng thái: `implemented-limited; color/fairness validation open`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (Mục Algorithmic Bias, Fitzpatrick limitations và Monk Skin Tone).  
  - Tệp từ task trước: `assets/skin-deid-roi.js.bwt`.  
  - Phụ thuộc: `TASK-M1-04`.  
  - Điều kiện: Chỉ dùng ảnh tổng hợp/swatch cho kiểm thử unit. Ảnh khuôn mặt thật cần color calibration, phơi sáng/ánh sáng được kiểm soát, consent và bộ đánh giá được duyệt trước khi dùng để rút kết luận.  
- **Các bước thực hiện**:  
  1. Lấy pixel mẫu từ vùng hình học hai má khi có landmarks; fallback ROI hình học nếu không có landmarks. Đây chưa phải phân đoạn da hoặc “healthy skin patch”, và không có đảm bảo loại bỏ bóng/phản quang.  
  2. Code chuyển RGB trung bình sang Lab sRGB cố định và so khoảng cách Euclidean tới các swatch; không tính ITA. Các mô tả ITA/bảng ngưỡng/hệ số phía dưới là giả thuyết lịch sử chưa triển khai, không dùng làm tiêu chí hoặc đầu ra hiện hành.  
     - $L^\*$: Độ sáng (Lightness)  
     - $a^\*$: Trục Đỏ \- Lục (Red-Green)  
     - $b^\*$: Trục Vàng \- Lam (Yellow-Blue)  
     - Chỉ số sắc tố cá nhân (Individual Typology Angle \- ITA): $$\\text{ITA}^\\circ \= \\arctan\\left(\\frac{L^\* \- 50}{b^\*}\\right) \\times \\frac{180}{\\pi}$$  
  3. Bảng giả thuyết ITA phía dưới được giữ làm lịch sử đầu vào, không xác nhận phân bố tông da tại Việt Nam:

| MST Scale | Tên sắc thái | Thang ITA quy đổi | Tông da người Việt điển hình | Hệ số bù trừ ngưỡng Melanin ($\\kappa\_{melanin}$) | Hệ số bù trừ ngưỡng Đỏ ($\\kappa\_{erythema}$) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **MST 1 \- 2** | Sáng rất nhạt | $\> 55^\\circ$ | Rất ít gặp (Da trắng Tây phương) | $1.00$ | $1.00$ |
| **MST 3** | Trắng sáng | $45^\\circ \- 55^\\circ$ | Da trắng sáng tự nhiên / Dùng treatment | $1.05$ | $1.08$ |
| **MST 4** | Trắng vàng / Sáng vừa | $35^\\circ \- 45^\\circ$ | **Phổ biến nhất tại Việt Nam (Nhóm A)** | **$1.15$** | **$1.12$** |
| **MST 5** | Vàng tự nhiên | $25^\\circ \- 35^\\circ$ | **Phổ biến nhất tại Việt Nam (Nhóm B)** | **$1.25$** | **$1.18$** |
| **MST 6** | Bánh mật / Ngăm sáng | $15^\\circ \- 25^\\circ$ | Phổ biến (Người hay hoạt động ngoài trời) | **$1.38$** | **$1.25$** |
| **MST 7 \- 8** | Ngăm đậm | $-10^\\circ \- 15^\\circ$ | Da ngăm rám nắng sâu | $1.55$ | $1.35$ |
| **MST 9 \- 10** | Sẫm màu rất đậm | $\< \-10^\\circ$ | Rất hiếm gặp ở người bản địa VN | $1.80$ | $1.50$ |

  5. Công thức điều chỉnh ngưỡng phát hiện (Dynamic Threshold Adjustment) phía dưới chưa có trong code và chưa được đánh giá; không được sử dụng hoặc quảng bá:  
   - Ngưỡng nhận diện vết thâm/nám được co giãn động theo hàm: $$\\text{Threshold}*{pigment}(MST) \= \\text{Threshold}*{base} \\times \\kappa\_{melanin}(MST)$$  
   - **Historical claim — chưa có bằng chứng, không dùng làm yêu cầu/marketing:** hệ số giả định từng được mô tả là giảm false positive; chưa có thuật toán ITA/debiasing hoặc đánh giá đối chứng trong implementation hiện tại.  
- **Đầu ra**:  
  - File tạo mới: `assets/skin-mst-debiasing.js.bwt` (Thuật toán tính ITA, phân loại MST 1-10 và cung cấp hệ số hiệu chuẩn ngưỡng sắc thái).  
- **Nghiệm thu**:  
  - `AC-M3-01-1`: Synthetic test xác nhận 10 swatch tự phân loại theo ordinal 1–10 như định nghĩa trong code; đây chỉ chứng minh hàm nearest-swatch, không phải độ chính xác trên người dùng.  
  - `AC-M3-01-2`: Không tuyên bố hệ số bù trừ giảm sai lệch; chỉ mở nghiệm thu sau protocol color calibration, dataset được phép, subgroup metrics và phê duyệt độc lập.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M3-01-01` | Synthetic swatch | Mười mẫu màu trong fixture `tests/portal/skin-scan.spec.js` | Gọi `PharmaSkinMst.sample()` / `fromLab()` | Trả ordinal 1–10 theo đúng swatch fixture; chỉ xác nhận nearest-swatch kỹ thuật | `REQ-SCORE-02` |
| `CHK-M3-01-02` | Vùng lấy mẫu | Fixture có vùng má và nền khác màu | Gọi bộ lấy mẫu hiện có | Lấy mẫu vùng má theo fixture; không diễn giải thành MST chính xác trên người hoặc bù sai lệch | `REQ-SCORE-02` |

- Ghi chú: các dòng rủi ro cũ bên dưới (ITA, phát hiện lệch b*, Gray World) không khớp implementation; không có white-balance calibration trong code và không được xem là biện pháp đang chạy.
- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Ánh đèn vàng (Warm lighting) làm sai lệch chỉ số $b^\*$ khiến tông da bị lệch sang nhóm sẫm hơn.  
  - *Phát hiện*: Độ lệch $b^*$ cao bất thường so với kênh màu trung tính $L^*$.  
  - *Giảm thiểu & Rollback*: Áp dụng thuật toán cân bằng trắng (Gray World White Balance) trước khi đo chỉ số ITA.

---

## TASK-M3-02: Động cơ Chấm điểm Kép Dual-Scoring (raw\_score vs ui\_score) cho 5 chỉ số da

- **Định danh & Mục tiêu**: `TASK-M3-02` | Code hiện clamp năm input `raw_score` trong [0,1], ánh xạ qua sigmoid heuristic thành `ui_score` và nhãn tiếng Việt. Đây chỉ là biến đổi trình bày trên đầu vào thử nghiệm, không đo “sức khỏe”, không phải thang lâm sàng/tâm lý học và chưa được validation | Module: `M3-SCORING-DEBIASING` | REQ: `REQ-SCORE-01` | Trạng thái: `implemented-limited; validation open`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (Mục Perfect Corp YouCam Dual-scoring, raw\_score vs ui\_score).  
  - Tệp từ task trước: `assets/skin-cv-engine.js.bwt`, `assets/skin-onnx-engine.js.bwt`, `assets/skin-mst-debiasing.js.bwt`.  
  - Phụ thuộc: `TASK-M2-01`, `TASK-M2-02`, `TASK-M3-01`.  
  - Điều kiện: Đã có số lượng đếm mụn, diện tích đỏ, mật độ nếp nhăn và cấp độ MST.  
- **Các bước thực hiện**:  
  **Snapshot implementation hiện tại**: `clamp(x)=max(0,min(1,Number(x)||0))`; `ui=clamp(54,98,round(52+46/(1+exp(10*(clamp(raw)-0.35))))`. `level` dùng ngưỡng 90/75/60; `skin_age` được tính heuristic từ wrinkles/pigmentation/pores và giới hạn delta -5..+7. Không có bằng chứng để diễn giải các trường này là tình trạng da hoặc tuổi sinh học. Các công thức raw bên dưới là giả thuyết lịch sử, chưa được nối từ pixel/detector và không phải pipeline đã triển khai.  

   **Cảnh báo về nội dung phía dưới:** công thức UI/tuổi, phân hạng “hoàn hảo/tổn thương/báo động” và khuyến nghị hoạt chất trong mô tả ban đầu là giả thuyết cũ, không khớp implementation và không có validation; chúng không được dùng làm tiêu chí nghiệm thu hoặc copy storefront. Chỉ các acceptance test kỹ thuật phía dưới và mục 10.3 mô tả trạng thái hiện tại.
  1. **Công thức raw_score ban đầu — chưa triển khai/không được dùng như kết quả đo**:  
     - $Raw\_{acne} \= \\min\\left(1.0, \\frac{N\_{inflam} \\times 0.15 \+ N\_{comedone} \\times 0.04}{\\text{Area}\_{face}}\\right)$  
     - $Raw\_{pigment} \= \\min\\left(1.0, \\frac{N\_{spots} \\times 0.08 \+ \\text{Area}*{pigment} \\times 2.5}{\\text{Area}*{face} \\times \\kappa\_{melanin}}\\right)$  
     - $Raw\_{wrinkle} \= \\min\\left(1.0, \\frac{\\text{Length}*{hessian}}{\\text{Area}*{face} \\times 0.8}\\right) \+ (TechNeck ? 0.15 : 0.0)$  
     - $Raw\_{redness} \= \\min\\left(1.0, \\frac{\\text{Area}*{erythema}}{\\text{Area}*{face} \\times 0.12 \\times \\kappa\_{erythema}}\\right)$  
     - $Raw\_{pores} \= \\min\\left(1.0, \\frac{N\_{enlarged\_pores}}{\\text{Area}\_{Tzone} \\times 1.2}\\right)$  
  2. **Ánh xạ Điểm Giao diện Tâm lý học Tiêu dùng (UI Scores \- thang đo $50$ đến $100$ điểm, càng cao càng khỏe)**:  
     - Trong tâm lý người tiêu dùng làm đẹp, điểm sức khỏe $\< 50$ gây cảm giác hoang mang tiêu cực, làm nản lòng khách hàng. Do đó hệ thống áp dụng hàm chuyển đổi Sigmoid hiệu chỉnh: $$\\text{ui\_score} \= \\text{round}\\left(98 \- 45 \\times \\frac{1}{1 \+ e^{-6 \\times (Raw \- 0.35)}}\\right)$$  
     - Điểm thô $0.0$ (hoàn hảo) $\\rightarrow$ `ui_score = 98` (Làn da lý tưởng).  
     - Điểm thô $0.35$ (tổn thương trung bình) $\\rightarrow$ `ui_score = 75` (Tình trạng cần cải thiện nhẹ).  
      - Ví dụ raw 0.0, 0.35 và 0.80 thuộc công thức lịch sử chưa kiểm chứng; không diễn giải thành lý tưởng, tổn thương hoặc mức cần can thiệp.  
  3. **Tính Tuổi Da Sinh Học (Biological Skin Age)**: $$\\text{SkinAge} \= \\text{UserAge} \+ \\text{round}\\left((Raw\_{wrinkle} \+ Raw\_{pigment} \+ Raw\_{pores} \- 0.6) \\times 12\\right)$$ (Khóa trong biên độ chênh lệch tối đa $\[-5, \+7\]$ tuổi so với tuổi thật để đảm bảo tính nhân văn và tâm lý khách hàng).  
  4. Bảng phân loại mức độ và nhãn hiển thị:

| ui\_score | Đánh giá tình trạng | Màu sắc hiển thị | Biểu tượng | Khuyến nghị hành động |
| :---- | :---- | :---- | :---- | :---- |
| **$90 \- 100$** | Rất khỏe / Tối ưu | Xanh ngọc lục bảo (`#10B981`) | Giọt nước / Kim cương | Duy trì bảo vệ hàng rào da & chống nắng |
| **$75 \- 89$** | Khá tốt / Có khuyết điểm nhỏ | Xanh lá thương hiệu (`#3CB371`) | Chiếc lá | Bổ sung hoạt chất chống oxy hóa & dưỡng ẩm |
| **$60 \- 74$** | Cần cải thiện / Tổn thương nhẹ | Vàng cam (`#F59E0B`) | Khiên bảo vệ | Bắt đầu phác đồ phục hồi 3 giai đoạn |
| **$50 \- 59$** | Báo động / Cần điều trị chuyên sâu | Đỏ cam (`#EF4444`) | Cảnh báo y khoa | Kết nối Chuyên gia 1:1 thăm khám trực tiếp |

- **Đầu ra**:  
  - File hiện có: `assets/skin-scoring-engine.js.bwt` (clamp/sigmoid heuristic, bucket UI và age-derived heuristic chưa validation; không tuyên bố là phép đo sức khỏe hay tuổi sinh học).  
- **Nghiệm thu**:  
  - `AC-M3-02-1`: Unit test kiểm tra `raw_score` hữu hạn được clamp [0,1], `ui_score` trong [54,98] và giảm đơn điệu khi raw tăng. Đây là kiểm tra phần mềm, không phải validation chỉ số da.  
  - `AC-M3-02-2`: Trả năm key và nhãn trung tính; nhãn không được mô tả như đánh giá/chỉ định y dược nếu chưa có thẩm định chuyên môn.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M3-02-01` | Raw value thấp | `raw_score = 0.02` | Tính `calculateUiScore()` | Giá trị hữu hạn trong [54,98]; ghi nhận 96 theo công thức hiện tại, không gắn nhãn tình trạng da | `REQ-SCORE-01` |
| `CHK-M3-02-02` | Raw value cao | `raw_score = 0.85` | Tính `calculateUiScore()` | Giá trị hữu hạn trong [54,98] và thấp hơn kết quả tại 0.02; không gọi là mức độ bệnh/an toàn | `REQ-SCORE-01` |
| `CHK-M3-02-03` | Age-derived field | Tuổi đầu vào thiếu/không hợp lệ | Gọi `PharmaSkinScoring.make()` | Trả `skin_age: null`; không tự gán tuổi mặc định hoặc gọi kết quả là tuổi sinh học | `REQ-SCORE-01`, `REQ-PRIV-02` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Người dùng chưa nhập tuổi thật làm công thức Skin Age bị lỗi tính toán.  
  - *Phát hiện*: `UserAge` bằng null hoặc không xác định.  
  - *Giảm thiểu & Rollback*: Không suy diễn tuổi thật khi thiếu input; ẩn trường này cho tới khi có căn cứ, consent, validation và cách trình bày được duyệt.

---

## TASK-M3-03: Matcher tĩnh gợi ý routine/catalog (không phải phác đồ điều trị)

- **Định danh & Mục tiêu**: `TASK-M3-03` | Ghi nhận matcher tĩnh gợi ý routine/catalog từ raw score; không phải phác đồ y khoa, không đánh giá phù hợp cá nhân hoặc tồn kho live | Module: `M3-SCORING-DEBIASING` | REQ: `REQ-ROUTINE-01` | Trạng thái: `implemented_limited`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (Cơ sở dữ liệu y khoa đối soát phác đồ tức thì), `data/ingredients.js`, `data/products.js`, `data/solutions.js`.  
  - Tệp từ task trước: `assets/skin-scoring-engine.js.bwt`.  
  - Phụ thuộc: `TASK-M3-02`.  
  - Điều kiện: Dữ liệu catalog local có trong theme; chưa chứng minh tồn kho live, suitability, chống chỉ định, hướng dẫn sử dụng hoặc hiệu quả điều trị.  
- **Các bước thực hiện**:  
  **Snapshot implementation hiện tại:** matcher chọn key có `raw_score` cao nhất rồi trả stage labels/product handles tĩnh. Ma trận/tầng hoạt chất bên dưới là giả thuyết nội dung, không phải lời khuyên y tế; mọi sản phẩm/claim cần duyệt nội dung, stock/API, suitability và pháp lý trước khi bật.  
   **Historical draft — không triển khai, không dùng làm tiêu chí nghiệm thu hay nội dung hiển thị.** Các ngưỡng và ma trận sản phẩm dưới đây chưa có bằng chứng chuyên môn/pháp lý; implementation chỉ chọn key raw score cao nhất và trả mapping tĩnh.  
   1. Xác định vấn đề da ưu tiên số 1 (Primary Concern) dựa trên chỉ số có điểm thô cao nhất ($Raw\_{max}$):  
     - Nếu $Raw\_{redness} \> 0.4$ $\\rightarrow$ Ưu tiên da nhạy cảm / phục hồi hàng rào.  
     - Nếu $Raw\_{acne} \> 0.35$ $\\rightarrow$ Ưu tiên điều trị mụn và kiềm dầu.  
     - Nếu $Raw\_{pigment} \> 0.35$ $\\rightarrow$ Ưu tiên trị thâm nám và làm đều màu da.  
     - Nếu $Raw\_{wrinkle} \> 0.35$ $\\rightarrow$ Ưu tiên chống lão hóa và tái tạo collagen.  
     - Nếu $Raw\_{pores} \> 0.4$ $\\rightarrow$ Ưu tiên thu nhỏ lỗ chân lông và tẩy tế bào chết bã nhờn.  
  2. **Bản nháp lịch sử, không triển khai:** ma trận routine/hoạt chất bên dưới không phải phác đồ chuẩn y dược và không được dùng làm nội dung hiển thị:

| Vấn đề da ưu tiên | Giai đoạn 1: Làm dịu & Cân bằng | Giai đoạn 2: Phục hồi Hàng rào bảo vệ | Giai đoạn 3: Trị liệu Chuyên sâu / Tái tạo |
| :---- | :---- | :---- | :---- |
| **Mụn & Bít tắc** | Nước tẩy trang dịu nhẹ, Gel rửa mặt BHA 1% | Serum B5 (Panthenol), Niacinamide 5% cân bằng dầu nước | Salicylic Acid (BHA 2%), Azelaic Acid 20%, Retinoid kiểm soát |
| **Thâm nám & Sắc tố** | Sữa rửa mặt tạo bọt mịn, Nước hoa hồng cấp ẩm | Serum Hyaluronic Acid đa tầng, Niacinamide 10% | Tranexamic Acid 3%, Vitamin C tinh khiết, Retinol tái tạo sắc tố |
| **Nếp nhăn & Lão hóa / Tech Neck** | Dầu tẩy trang chống oxy hóa, Toner dưỡng ẩm | Phức hợp Ceramide, Peptide tăng sinh biểu bì | Retinol 0.5% \- 1.0%, Kem nâng cơ vùng cổ Polynucleotides |
| **Đỏ & Nhạy cảm** | Nước tẩy trang Micellar không cồn, Sữa rửa mặt pH 5.5 | Chiết xuất Rau má Centella, Panthenol 10% phục hồi sâu | Kem dưỡng khóa ẩm Lipid màng sinh học, KCN vật lý dịu nhẹ |

4. Thuật toán ghép nối sản phẩm thực tế từ kho hàng Pharma Cosmetics:  
   - Lọc danh sách sản phẩm trong `data/products.js` có chứa tag hoạt chất tương ứng (`BHA`, `Niacinamide`, `Retinol`, `Tranexamic Acid`, `Centella`).  
   - Implementation hiện tại trả catalog handles tĩnh; không lọc tồn kho, không xác minh phù hợp cá nhân và không tự đảm bảo đường dẫn hay khả năng mua.  
- **Đầu ra**:  
  - File hiện có: `assets/skin-routine-matcher.js.bwt` (mapping stage labels/product handles tĩnh; không phải động cơ phác đồ, không kiểm tra tồn kho live).  
- **Nghiệm thu**:  
  - `AC-M3-03-1`: Trả ba nhãn giai đoạn tham khảo theo mapping tĩnh cho input hợp lệ; không gọi là phác đồ điều trị hoặc đảm bảo phù hợp cho mọi người.  
  - `AC-M3-03-2`: Unit/E2E kiểm tra mọi returned handle tồn tại trong catalog source và URL có format hợp lệ. Live availability, product suitability, ingredient compatibility và kết quả điều trị cần xác minh riêng, không được suy ra từ handle.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M3-03-01` | Static matcher | Fixture acne raw score cao nhất | Gọi `PharmaSkinRoutine.match()` | Trả stage/products theo mapping hiện tại; mỗi handle ánh xạ tới catalog fixture; không khẳng định có hàng | `REQ-ROUTINE-01` |
| `CHK-M3-03-02` | Không suy diễn hỗ trợ | Input không có cờ Tech Neck hoặc suitability | Gọi `PharmaSkinRoutine.match()` | Không sinh lời khuyên công thái học, chống chỉ định hay kết quả điều trị từ input không hỗ trợ | `REQ-ROUTINE-01` |

- **Rủi ro & Phục hồi**:  
   - *Rủi ro*: Catalog local tĩnh có thể không khớp tồn kho hoặc nội dung sản phẩm hiện hành.  
   - *Phát hiện*: Matcher hiện không truy vấn inventory live; không thể phát hiện hết hàng bằng logic hiện có.  
   - *Giảm thiểu & Rollback*: Không khẳng định “có sẵn hàng”; ẩn gợi ý khi catalog không resolve hoặc chờ nguồn availability được xác thực.

---

# Module 4: Giao Diện Storefront, Lớp Phủ Trực Quan Visual Mask & Trải Nghiệm Người Dùng

## TASK-M4-01: Visual Mask Canvas Overlay Renderer (Lớp phủ trực quan mụn, nếp nhăn, vùng đỏ)

- **Định danh & Mục tiêu**: `TASK-M4-01` | Overlay Canvas tham khảo; chỉ vẽ detection source tương thích, đã xác thực và được bật, không tự xác định mụn/nếp nhăn/vùng đỏ | Module: `M4-STOREFRONT-UI` | REQ: `REQ-UI-02` | Trạng thái: `implemented_limited`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `SRC-USER-REPORT` (Mục Perfect Corp mask\_urls, hiển thị trực quan các vùng da bị tổn thương ngay trên giao diện người dùng).  
  - Tệp từ module trước: `assets/skin-cv-engine.js.bwt`, `assets/skin-onnx-engine.js.bwt`.  
  - Phụ thuộc: `TASK-M2-01`, `TASK-M2-02`.  
  - Điều kiện: 3 ảnh khuôn mặt gốc đã lưu trong RAM trình duyệt kèm tọa độ bounding boxes và ma trận nhị phân (binary masks).  
- **Các bước thực hiện**:  
  1. Xây dựng component `<div class="pc-skin-visual-overlay">` chứa:  
     - Thẻ ảnh gốc hoặc Canvas nền vẽ ảnh chân dung 3 góc (có thể chuyển đổi tab giữa 3 góc: Chính diện / Má trái / Má phải).  
     - Canvas vẽ lớp phủ (Overlay Canvas) xếp chồng tuyệt đối (`position: absolute; top:0; left:0; width:100%; height:100%`).  
     - Thanh điều khiển lớp (Layer Control Chips): Nút bật/tắt \[🔴 Mụn\], \[🟡 Đốm sắc tố\], \[🟢 Nếp nhăn\], \[🟣 Vùng đỏ/nhạy cảm\].  
     - Thanh trượt so sánh (nếu được triển khai) chỉ so sánh ảnh gốc với overlay tham khảo, không gọi là lớp phủ chẩn đoán.  
  2. Logic vẽ lớp phủ chuyên biệt theo tình trạng da:  
     - **Lớp Mụn viêm (Acne)**: Vẽ vòng tròn nét đứt hoặc hộp bo góc màu đỏ viền phát sáng (`rgba(239, 68, 68, 0.85)`), bên trong có chấm tâm xác định nhân mụn.  
     - **Lớp Mụn ẩn / Đầu đen**: Chấm tròn nhỏ màu vàng cam (`rgba(245, 158, 11, 0.7)`).  
     - **Lớp Nếp nhăn (Wrinkles & Tech Neck)**: Vẽ các đường cong Bezier mảnh màu xanh dạ quang (`rgba(16, 185, 129, 0.85)`) bám theo các rãnh Hessian tại khóe mắt, trán và ngấn cổ.  
     - **Lớp Vùng Đỏ (Redness Heatmap)**: Áp dụng hiệu ứng gradient nhiệt (Alpha heatmap) màu hồng cánh sen bán trong suốt (`rgba(244, 63, 94, 0.35)`) lên các vùng da có $EI$ cao.  
  3. Mã giả dựng hình Canvas:

// Pseudo-code: Visual Mask Overlay Renderer

class VisualMaskRenderer {

  constructor(canvasEl, baseImage, detections, masks) {

    this.canvas \= canvasEl;

    this.ctx \= canvasEl.getContext('2d');

    this.baseImage \= baseImage;

    this.detections \= detections; // from ONNX

    this.masks \= masks; // from OpenCV

    this.activeLayers \= { acne: true, wrinkles: true, pigment: true, redness: true };

  }

  render() {

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.drawImage(this.baseImage, 0, 0, this.canvas.width, this.canvas.height);

    if (this.activeLayers.redness && this.masks.redness) {

      this.drawHeatmap(this.masks.redness, 'rgba(244, 63, 94, 0.3)');

    }

    if (this.activeLayers.wrinkles && this.masks.wrinkles) {

      this.drawContourLines(this.masks.wrinkles, '\#10B981', 1.5);

    }

    if (this.activeLayers.acne) {

      this.detections.filter(d \=\> d.type \=== 'acne').forEach(box \=\> {

        this.drawBox(box, '\#EF4444', 'Mụn viêm');

      });

    }

    if (this.activeLayers.pigment) {

      this.detections.filter(d \=\> d.type \=== 'spot').forEach(box \=\> {

        this.drawBox(box, '\#F59E0B', 'Đốm thâm');

      });

    }

  }

  toggleLayer(layerName) {

    this.activeLayers\[layerName\] \= \!this.activeLayers\[layerName\];

    this.render();

  }

}

- **Đầu ra**:  
  - File tạo mới: `assets/skin-visual-overlay.js.bwt` (Logic vẽ Canvas, thanh trượt Before/After, tương tác bật tắt chip).  
  - File tạo mới: `assets/skin-visual-overlay.scss.bwt` (Styling responsive cho khung overlay, thanh trượt so sánh).  
- **Nghiệm thu**:  
  - `AC-M4-01-1`: Overlay chỉ vẽ dữ liệu detection có nguồn và tọa độ hợp lệ; không hiển thị nhãn mụn/nếp nhăn/vùng bệnh nếu model tương thích đã được xác minh và nội dung được duyệt.  
  - `AC-M4-01-2`: Kiểm tra responsive scaling và toggle layer bằng synthetic detections; không coi test giả lập là độ chính xác phát hiện hoặc cam kết hiệu năng trên thiết bị thật.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M4-01-01` | Overlay synthetic | Detection fixture có bounding box hợp lệ | Render overlay | Hình học khớp tọa độ fixture; không kết luận đó là tổn thương thật | `REQ-UI-02` |
| `CHK-M4-01-02` | Ẩn lớp | Bật/tắt layer trong fixture | Toggle layer | Lớp tương ứng ẩn/hiện; không sinh nhãn/heatmap khi không có detection tương thích | `REQ-UI-02` |
| `CHK-M4-01-03` | Responsive scaling | Canvas tại hai kích thước viewport | Resize và render lại | Vị trí synthetic detection được scale nhất quán; không xác nhận độ chính xác của nguồn detection | `REQ-UI-02` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Trên màn hình Retina/High-DPI (như iPhone), Canvas bị mờ do pixel ratio khác nhau.  
  - *Phát hiện*: Độ phân giải hiển thị bị mờ đục so với video camera gốc.  
  - *Giảm thiểu & Rollback*: Tự động nhân tỷ lệ `window.devicePixelRatio` vào kích thước buffer canvas: `canvas.width = rect.width * dpr`.

---

## TASK-M4-02: Tái cấu trúc template `templates/page.ai-skin-quiz.bwt` thành trải nghiệm soi da và khảo sát tham khảo

- **Định danh & Mục tiêu**: `TASK-M4-02` | Nâng cấp template `page.ai-skin-quiz.bwt` thành trải nghiệm tham khảo đa phương thức: Tab 1 camera thử nghiệm 3 góc và Tab 2 khảo sát 17 câu; không gọi quiz là đánh giá lâm sàng hoặc camera là chẩn đoán | Module: `M4-STOREFRONT-UI` | REQ: `REQ-UI-01`, `REQ-COMP-01` | Trạng thái: `planned` tại thời điểm lập kế hoạch; xem đối soát implementation tại mục 10.3.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `templates/page.ai-skin-quiz.bwt`, `assets/page_ai_skin_quiz.scss.bwt`, `SRC-CLINERULES-02` (Font Montserrat, RULE-P0-02).  
  - Tệp từ module trước: `snippets/skin_scan_camera.bwt`, `assets/skin-camera.js.bwt`.  
  - Phụ thuộc: `TASK-M1-01`, `TASK-M4-01`.  
  - Điều kiện: Layout dùng chung `theme.bwt`, không khóa cuộn trang, responsive mượt mà.  
- **Các bước thực hiện**:  
   1. Bộ chuyển đổi phương thức (nếu được cấu hình) không được gọi camera là chẩn đoán:  
      - Nút 1: `[📷 Trải nghiệm camera tham khảo]` (chỉ khi tính năng được bật và gate phát hành cho phép).  
     - Nút 2: `[📋 Khảo sát 17 câu hỏi tham khảo]` (Bảo toàn nguyên vẹn tính năng quiz hiện tại; không mô tả là đánh giá lâm sàng).
  2. Tích hợp snippet `skin_scan_camera.bwt` vào container Tab 1:  
      - Hiển thị thông báo cấu hình về giới hạn phân tích; không quảng cáo chứng nhận y khoa/GSP/GDP hoặc gắn số hiệu luật làm bằng chứng chất lượng nếu chưa có chứng nhận và rà soát pháp lý.  
     - Hướng dẫn 3 bước chuẩn bị: 1\. Làm sạch mặt mộc, 2\. Vén tóc và tháo kính, 3\. Đứng ở nơi ánh sáng tốt.  
      - Khối camera/upload và LIQA thử nghiệm; không tự động quảng bá phân tích tổn thương hoặc chụp nếu consent/cấu hình chưa cho phép.  
  3. Xây dựng luồng kết hợp (Hybrid Combination Flow):  
     - Không đưa ra mức cải thiện “chính xác hơn 30%” nếu chưa có nghiên cứu đánh giá chứng minh. Luồng hiện tại dùng khảo sát 17 câu như một phương án riêng; việc kết hợp câu trả lời với ảnh cần đặc tả mục đích, consent, tác động tới thuật toán và kiểm định trước khi triển khai.  
   4. Lưu trạng thái/kết quả cần chuyển trang vào `sessionStorage` trong tab hiện tại (`pc_skin_scan_result`, `pc_quiz_skin_type`); không lưu ảnh mặt hoặc điểm khảo sát chi tiết vào `localStorage`; điều hướng sang `page.ai-skin-quiz-results.bwt`.  
- **Đầu ra**:  
  - Tệp cập nhật: `templates/page.ai-skin-quiz.bwt` (Tích hợp tab Camera soi da và liên kết phân tích).  
  - Tệp cập nhật: `assets/page_ai_skin_quiz.scss.bwt` (CSS cho tab switcher, camera wrapper, bảng chỉ dẫn y khoa).  
- **Nghiệm thu**:  
   - `AC-M4-02-1`: Chuyển đổi giữa camera tham khảo (nếu bật) và khảo sát; khi camera bị soft-disable, không render markup/script camera và khảo sát vẫn hoạt động.  
  - `AC-M4-02-2`: Danh xưng xuyên suốt trang là "Chuyên gia Pharma AI", tuân thủ 100% RULE-P0-02.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M4-02-01` | Soft-disable | `ai_skin_scan_enable = false` | Render trang | Camera/script không xuất hiện, khảo sát vẫn dùng được | `REQ-UI-01` |
| `CHK-M4-02-02` | Chuyển Tab | Bấm chọn tab "Khảo sát 17 câu hỏi" | Click nút tab | Chuyển sang giao diện chat trắc nghiệm quen thuộc | `REQ-UI-01` |
| `CHK-M4-02-03` | Rà soát chữ | Kiểm tra toàn bộ text trong template | Tìm từ khóa "bác sĩ", "dr." | Không tồn tại từ cấm vi phạm RULE-P0-02 | `REQ-COMP-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Xung đột CSS giữa giao diện chat cũ và giao diện camera mới.  
  - *Phát hiện*: Khung camera bị vỡ layout hoặc nút điều hướng bị đè lấp.  
  - *Giảm thiểu & Rollback*: Toàn bộ class mới được đặt tiền tố cô lập `.pc-skin-scan-*` trong một container riêng, không can thiệp vào `.ai-skin-chat-app`.

---

## TASK-M4-03: Hiển thị báo cáo tham khảo từ phiên soi da (không chẩn đoán)

- **Định danh & Mục tiêu**: `TASK-M4-03` | Trang kết quả hiển thị dữ liệu định lượng/heuristic trong session, trạng thái demo, overlay có nguồn detection và gợi ý catalog tham khảo. Không gọi là báo cáo chuyên sâu, tuổi sinh học, chẩn đoán hoặc phác đồ điều trị | Module: `M4-STOREFRONT-UI` | REQ: `REQ-UI-02`, `REQ-ROUTINE-01`, `REQ-COMP-01` | Trạng thái: `implemented-limited; model/legal validation open`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `templates/page.ai-skin-quiz-results.bwt`, `assets/skin-visual-overlay.js.bwt`, `assets/skin-routine-matcher.js.bwt`.  
  - Phụ thuộc: `TASK-M3-02`, `TASK-M3-03`, `TASK-M4-01`.  
  - Điều kiện: Đọc dữ liệu từ `sessionStorage` của tab hiện tại; nếu rỗng hiển thị bản xem trước minh họa (Demo mode).  
- **Các bước thực hiện**:  
  1. Hiển thị khối tổng quan tham khảo (không phải Clinical Summary):  
      - Hiển thị score chỉ như output heuristic tham khảo, kèm disclaimer và không dùng cụm “sức khỏe làn da” nếu chưa được duyệt.  
     - Trường `skin_age` hiện chưa validation; ẩn khỏi báo cáo cho tới khi có cơ sở/consent/review, không gắn nhãn tuổi sinh học.  
      - Nếu hiển thị swatch ordinal, phải mô tả là màu gần nhất trong palette thử nghiệm; không suy ra phân loại chính xác người dùng hoặc chuẩn hóa nhân chủng học.  
  2. Tích hợp Biểu đồ Radar 5 Chỉ số (SVG/Canvas không cần thư viện ngoài nặng nề):  
     - 5 trục tọa độ: Mụn (Acne), Sắc tố (Pigmentation), Nếp nhăn (Wrinkles), Độ đỏ (Redness), Bã nhờn (Sebum/Pores).  
      - Đường đa giác (nếu hiển thị) chỉ trực quan hóa raw heuristic; không so với “chuẩn lý tưởng” hoặc đánh giá tình trạng sức khỏe.  
   3. Nhúng overlay chỉ khi có detection source tương thích, được xác thực và bật; nếu không, không gán nhãn hình học heuristic là mụn/nếp nhăn.  
  4. Hiển thị ba nhóm gợi ý routine/catalog tĩnh, kèm thông báo tham khảo và không biểu thị như phác đồ điều trị:  
      - Các stage/product cards chỉ hiển thị sau khi catalog, giá, availability, claims và hành vi nút mua đã được xác minh; nếu không thì ẩn CTA.  
      - Bỏ các nhóm thành phần cố định; chỉ render handles từ matcher hiện tại sau khi catalog, giá, availability và nội dung được xác nhận.  
      - Giai đoạn 3: Nhãn routine tham khảo theo catalog tĩnh; không gọi là trị liệu và không hứa hiệu quả.  
  5. Cụm nút hành động cần đúng trạng thái backend/consent:  
      - `[💾 Lưu kết quả]` chỉ hiển thị khi CRM endpoint, consent notice và legal gates được phê duyệt; nếu không thì ẩn/nondispatchable.  
      - Zalo/đầu mối nhận chỉ hiển thị sau khi URL, người nhận, payload, consent và mục đích được chủ cửa hàng xác minh.  
     - `[📅 Liên hệ tư vấn]` chỉ dùng nếu URL/đơn vị nhận và nội dung đã được chủ cửa hàng xác nhận; không suy ra có phòng khám/khám soi da từ route đặt lịch chung.  
- **Đầu ra**:  
  - Tệp cập nhật: `templates/page.ai-skin-quiz-results.bwt` (Giao diện báo cáo soi da trực quan, radar chart, sản phẩm mua kèm).  
- **Nghiệm thu**:  
  - `AC-M4-03-1`: Hiển thị đúng payload session/mock, demo state và disclaimer; radar/overlay không được mô tả như dữ liệu detector đã thẩm định.  
  - `AC-M4-03-2`: Kiểm tra href format/đích test cho CTA; chỉ xác nhận production contact, CRM save hoặc lịch hẹn sau khi owner/backend xác minh. Không dùng cam kết “100%”.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M4-03-01` | Kết quả soi da | Có `pc_skin_scan_result` trong sessionStorage của tab hiện tại | Tải trang kết quả | Hiển thị điểm số tham khảo và radar; không lưu ảnh gốc/ảnh đã xử lý trong Web Storage | `REQ-UI-02`, `REQ-PRIV-02` |
| `CHK-M4-03-02` | Demo mode | Truy cập trực tiếp không qua soi da | Tải trang kết quả | Hiện cờ "Bản xem trước minh họa", không crash lỗi JS | `REQ-COMP-01` |
| `CHK-M4-03-03` | Contact CTA gate | Contact recipient, URL, payload and consent have not been approved | Render result page | Contact CTA is hidden/disabled until owner verifies recipient, destination, message payload and consent | `REQ-COMP-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Trình duyệt chặn Web Storage ở chế độ riêng tư hoặc chính sách bảo mật nghiêm ngặt.  
  - *Phát hiện*: Ngoại lệ `QuotaExceededError` hoặc `SecurityError` khi đọc/ghi `sessionStorage`.  
  - *Giảm thiểu & Rollback*: Không fallback sang `localStorage`/`window.name`; hiển thị bản demo và hướng dẫn người dùng làm lại nếu dữ liệu phiên không khả dụng.

---

## TASK-M4-04: Cập nhật snippet dẫn nhập `snippets/section_ai_guide.bwt` & Menu Điều Hướng

- **Định danh & Mục tiêu**: `TASK-M4-04` | Cập nhật nội dung khối dẫn nhập `snippets/section_ai_guide.bwt` ở trang chủ và thêm liên kết "Soi da AI miễn phí" vào menu chính/mobile | Module: `M4-STOREFRONT-UI` | REQ: `REQ-UI-01`, `REQ-CONF-01` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `snippets/section_ai_guide.bwt`, `snippets/header.bwt`, `.clinerules/02-du-an-pharma-cosmetics.md`.  
  - Phụ thuộc: `TASK-M4-02`.  
  - Điều kiện: Không sửa trực tiếp text cứng mà dùng biến cấu hình Liquid `settings.home_ai_guide_*`.  
- **Các bước thực hiện**:  
  1. Cập nhật nhãn và mô tả 3 bước trong `snippets/section_ai_guide.bwt`:  
     - Bước 1: "Chụp 3 góc mặt cùng trợ lý camera AI chuẩn hóa".  
     - Bước 2: "Phân tích 5 chỉ số da & Nhận diện nếp nhăn/đốm nâu tức thì".  
     - Bước 3: "Nhận phác đồ 3 giai đoạn hoặc kết nối chuyên gia 1:1".  
  2. Nút CTA trang chủ: Đổi nhãn nút từ "Bắt đầu Quiz da cùng AI" thành `{{ settings.home_ai_guide_cta_text | default: 'Soi da AI & Khám da miễn phí' | escape }} →`.  
  3. Cập nhật URL đích: Trỏ đến `{{ settings.home_ai_guide_cta_url | default: '/kham-da-ai' | escape }}`.  
- **Đầu ra**:  
  - Tệp cập nhật: `snippets/section_ai_guide.bwt`.  
- **Nghiệm thu**:  
  - `AC-M4-04-1`: Khối dẫn nhập trên trang chủ thể hiện rõ tính năng soi da qua camera, giao diện khớp hoàn hảo với hệ thiết kế v3.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M4-04-01` | Hiển thị trang chủ | Truy cập Trang chủ Home Portal v3 | Cuộn qua Hero | Thấy khối section dẫn nhập với 3 bước soi da AI sắc nét | `REQ-UI-01` |
| `CHK-M4-04-02` | Click CTA | Bấm nút "Soi da AI & Khám da miễn phí" | Bấm nút | Chuyển hướng trực tiếp vào trang `/kham-da-ai` | `REQ-UI-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Làm thay đổi thứ tự các section trên trang chủ.  
  - *Phát hiện*: Section 2 không còn là `section_ai_guide`.  
  - *Giảm thiểu & Rollback*: Giữ nguyên định danh `section_ai_guide` trong `valid_sections` và whitelist của `home_portal.bwt`.

---

# Module 5: CRM Intake, Bảo Mật Y Tế Luật 91 & Cấu Hình Sapo Theme

## TASK-M5-01: Mở rộng `assets/crm-intake.js.bwt` hỗ trợ lưu kết quả Soi Da AI (`save_skin_analysis`)

- **Định danh & Mục tiêu**: `TASK-M5-01` | Client SDK có thể gửi allowlisted payload soi da khi consent; test hiện chỉ mô phỏng request/response. Không gọi endpoint/luồng là an toàn hoặc production-ready khi chưa audit GAS, access control, retention, logs và quy trình xóa; giữ tách biệt MOPS | Module: `M5-CRM-COMPLIANCE-CONFIG` | REQ: `REQ-CRM-01`, `REQ-PRIV-02` | Trạng thái: `client guard implemented; backend/legal acceptance open`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `assets/crm-intake.js.bwt`, `snippets/customer_context_extractor.bwt`.  
  - Phụ thuộc: `TASK-M3-02`, `TASK-M3-03`.  
  - Điều kiện: Khách hàng phải bấm đồng ý trên Modal Đồng thuận (`consent: true`); tuyệt đối không tự động gửi ngầm khi chưa có sự xác nhận của người dùng.  
- **Các bước thực hiện**:  
  1. Thêm phương thức `submitSkinAnalysis(data)` vào đối tượng toàn cục `window.PharmaCrmIntake`:

// Excerpt: Mở rộng SDK CRM Intake cho Soi da

window.PharmaCrmIntake.submitSkinAnalysis \= function(data) {

  return send('save\_skin\_analysis', {

    submission\_id: data.submission\_id || submissionId(),

    consent: data.consent \=== true,

    consent\_at: data.consent\_at || new Date().toISOString(),

    source: 'ai\_skin\_scan\_camera',

    analysis\_result: {

      scores: data.scores, // raw & ui scores của 5 chỉ số

      monk\_skin\_tone: data.monk\_skin\_tone,

      skin\_age: data.skin\_age,

      primary\_concern: data.primary\_concern,

      tech\_neck: data.tech\_neck || false,

      regimen: data.regimen, // 3 giai đoạn hoạt chất

      recommended\_products: data.recommended\_products || \[\]

    }

  });

};

3. Bổ sung kiểm soát payload ở client để từ chối trường ảnh/data URL/Base64 trước khi gửi CRM. Đây chỉ là kiểm soát phía client, không chứng minh backend, log hoặc nhà cung cấp không lưu ảnh; không gọi đây là bảo đảm Process-and-Discard.  
4. Xử lý phản hồi và lưu mã hồ sơ soi da: Nhận `record_id` từ GAS và lưu vào `sessionStorage` để phục vụ tra cứu sau này.  
- **Đầu ra**:  
  - Tệp cập nhật: `assets/crm-intake.js.bwt` (Thêm hàm `submitSkinAnalysis`).  
- **Nghiệm thu**:  
  - `AC-M5-01-1`: Unit test hiện chỉ mô phỏng POST/response. Kết nối thật chỉ nghiệm thu trên staging được duyệt sau xác minh endpoint GAS, schema, auth, retention, log/redaction và quy trình xóa; không dùng success giả lập làm bằng chứng CRM production.  
  - `AC-M5-01-2`: Từ chối gửi ngay từ client nếu `consent !== true` với lỗi `Error: consent_required`.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M5-01-01` | Consent / client contract | `data.consent = true`, payload định lượng tối thiểu, fetch giả lập | Gọi `submitSkinAnalysis(data)` | Gửi đúng allowlist tới mock và đọc record id giả; không khẳng định đã lưu vào CRM thật | `REQ-CRM-01` |
| `CHK-M5-01-02` | Chặn Không Consent | `data.consent = false` | Gọi `submitSkinAnalysis(data)` | Promise reject lỗi `consent_required`, không gửi HTTP request | `REQ-PRIV-02` |
| `CHK-M5-01-03` | Không gửi ảnh | Kiểm tra payload JSON | Soi body request | Tuyệt đối không chứa chuỗi Base64 `data:image/jpeg...` | `REQ-PRIV-02` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Google Apps Script bị timeout hoặc quá tải hạn mức quota trong giờ cao điểm.  
  - *Phát hiện*: Request fetch vượt quá 10s hoặc trả về mã HTTP 429/500.  
  - *Giảm thiểu & Rollback*: Không khẳng định kết quả được lưu hoặc chuyên gia sẽ liên hệ nếu API thất bại; thông báo lỗi trung tính, giữ dữ liệu chỉ trong tab nếu còn sẵn và cho phép tiếp tục không gửi.

---

## TASK-M5-02: Thiết kế thông báo và cơ chế đồng ý xử lý dữ liệu (chờ rà soát pháp lý)

- **Định danh & Mục tiêu**: `TASK-M5-02` | Xây dựng thông báo/cơ chế lựa chọn riêng cho xử lý cục bộ, gửi ảnh tới dịch vụ ngoài và lưu hồ sơ CRM; nêu rõ mục đích, dữ liệu, bên nhận, thời hạn và cách rút lại/xóa sau khi nội dung được chuyên gia pháp lý duyệt. Dẫn chiếu đúng tên Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15; không tự tuyên bố GDPR/HIPAA hoặc luật khám chữa bệnh áp dụng khi chưa xác định phạm vi | Module: `M5-CRM-COMPLIANCE-CONFIG` | REQ: `REQ-PRIV-02`, `REQ-COMP-01` | Trạng thái: `blocked_pending_legal_review`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `templates/page.ai-skin-quiz.bwt` (`aiSkinCrmConsentModal`), Luật 91/2025/QH15.  
  - Phụ thuộc: `TASK-M5-01`.  
  - Điều kiện: Không ép buộc người dùng phải lưu dữ liệu mới được xem kết quả soi da (kết quả hiển thị tự do; chỉ hỏi khi người dùng bấm "Lưu hồ sơ" hoặc "Gửi cho chuyên gia").  
- **Các bước thực hiện**:  
  1. Xây dựng cấu trúc Modal HTML `.pc-skin-consent-modal` với accessibility đầy đủ (`role="dialog"`, `aria-modal="true"`, focus trap):  
     - **Tiêu đề**: `{{ settings.skin_consent_title | default: 'Xác Nhận Lưu Hồ Sơ Chăm Sóc Da Cá Nhân' | escape }}`.  
     - **Nội dung minh bạch**:  
        * **Nội dung mục đích mẫu, không dùng nếu chưa được duyệt:** mục đích lưu trữ và tư vấn phải do chủ thể kiểm soát xác định, giới hạn theo xử lý thực tế; không hứa theo dõi điều trị hoặc phác đồ phù hợp khi backend/chuyên môn chưa xác nhận.  
        * Thông báo xử lý: Chỉ nêu nơi nhận, loại dữ liệu, mục đích, thời hạn lưu, bên xử lý phụ và cách yêu cầu/xóa dữ liệu sau khi các thông tin này được xác minh với backend/provider và duyệt pháp lý. Không cam kết Process-and-Discard hoặc “không lưu ảnh” nếu chưa có bằng chứng end-to-end.  
        * Quyền và kênh thực hiện: Chỉ nêu các quyền, thời hạn xử lý và hotline/email đã xác minh với chủ thể kiểm soát; không hứa khả năng xóa nếu quy trình backend chưa vận hành và chưa có SLA được duyệt.  
        * Cảnh báo tham khảo (câu chữ phải được duyệt): "Kết quả chỉ mang tính tham khảo, không phải chẩn đoán và không thay thế đánh giá của chuyên gia y tế phù hợp."
     - **Hai nút lựa chọn**: `[Hủy / Không lưu]` và `[Tôi hiểu & Đồng ý lưu hồ sơ]`.  
  2. Xử lý sự kiện bàn phím (Phím Escape để đóng, nút Tab duy trì focus trong modal).  
- **Đầu ra**:  
  - Snippet cập nhật: `snippets/skin_consent_modal.bwt`.  
- **Nghiệm thu**:  
  - `AC-M5-02-1`: Chỉ hiển thị notice/consent sau khi nội dung theo đích xử lý, backend/provider, retention, quyền xóa/rút lại và disclaimer được xác minh, duyệt pháp lý; đến lúc đó không bật luồng lưu hồ sơ production.  
  - `AC-M5-02-2`: Bấm "Hủy" sẽ đóng modal mà không gửi dữ liệu; bấm "Đồng ý" sẽ kích hoạt luồng CRM Intake.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M5-02-01` | Mở Modal | Bấm nút "Lưu hồ sơ soi da" trên trang kết quả | Click nút | Modal mở, tiêu điểm focus vào nút "Đồng ý" | `REQ-COMP-01` |
| `CHK-M5-02-02` | Đóng bằng ESC | Đang mở modal | Bấm phím Escape | Modal ẩn, focus trả về nút kích hoạt ban đầu | `REQ-COMP-01` |
| `CHK-M5-02-03` | Rà soát nội dung | Soát notice/consent và disclaimer với nghiệp vụ/backend thật | Chủ thể kiểm soát + legal review | Chỉ nghiệm thu sau phê duyệt có lưu vết; test UI không tự chứng minh tuân thủ | `REQ-COMP-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Khách hàng bỏ qua modal vì ngại đọc văn bản dài.  
  - *Phát hiện*: Tỷ lệ chuyển đổi bấm lưu thấp.  
  - *Giảm thiểu & Rollback*: Bố cục nội dung theo dạng 3 gạch đầu dòng ngắn gọn, làm nổi bật cam kết "Không lưu ảnh mặt \- Chỉ lưu điểm số".

---

## TASK-M5-03: Đăng ký nhóm cấu hình "Soi da AI (Camera & Diagnostic)" trong `settings_schema.json` & `settings_data.json`

- **Định danh & Mục tiêu**: `TASK-M5-03` | Thêm nhóm thiết lập mới vào `configs/settings_schema.json` và preset giá trị mặc định trong `configs/settings_data.json` cho phép Admin kiểm soát toàn diện tính năng soi da | Module: `M5-CRM-COMPLIANCE-CONFIG` | REQ: `REQ-CONF-01` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `configs/settings_schema.json`, `configs/settings_data.json`, `.clinerules/02-du-an-pharma-cosmetics.md` (Quy tắc không tự ý xóa field đang có).  
  - Phụ thuộc: Không.  
  - Điều kiện: File JSON phải valid 100%, kiểm tra bằng lệnh `node -e "JSON.parse(fs.readFileSync(...))"`.  
- **Các bước thực hiện**:  
   1. Mở rộng `configs/settings_schema.json` bằng cách thêm một Section mới: `"name": "Soi Da tham khảo"`:  
      - `ai_skin_scan_enable` (checkbox, default: `false` cho deployment mới cho tới khi release gates được duyệt, label: "Bật trải nghiệm soi da tham khảo").  
   - `ai_skin_scan_mode` (select: `client_edge` \- thử nghiệm cục bộ, `cloud_proxy` \- tắt/fail-closed tới khi provider được duyệt, `hybrid` \- tắt/fail-closed tới khi có thiết kế và kiểm định).  
     - `ai_skin_scan_provider` (select: `auto`, `perfect_corp`, `skinive`, `faceplusplus`).  
      - `ai_skin_scan_deid_enable` (checkbox, default: `true`, label: "Che vùng mắt trên preview (không phải ẩn danh)").  
     - `ai_skin_scan_min_light` (text, default: `"80"`, label: "Ngưỡng sáng tối thiểu (0-255)").  
     - `ai_skin_scan_zalo_hotline` (text, default: `"0967194063"`, label: "Số Zalo chuyên gia nhận kết quả tư vấn").  
      - `ai_skin_scan_disclaimer` (textarea; nội dung chỉ nhập sau khi chủ cửa hàng và chuyên gia pháp lý duyệt, không gọi heuristic là AI đã xác thực hoặc nêu danh xưng bị cấm).  
  2. Bổ sung các giá trị mặc định tương ứng vào `presets.default` trong `configs/settings_data.json`.  
  3. Chạy script xác thực JSON để đảm bảo không bị lỗi cú pháp dấu phẩy hoặc escape string.  
- **Đầu ra**:  
  - Tệp cập nhật: `configs/settings_schema.json`.  
  - Tệp cập nhật: `configs/settings_data.json`.  
- **Nghiệm thu**:  
  - `AC-M5-03-1`: Lệnh kiểm tra JSON parse thành công 100%, không throw exception.  
  - `AC-M5-03-2`: Các setting mới được đọc trơn tru trong Liquid qua `{{ settings.ai_skin_scan_* }}`.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M5-03-01` | Cú pháp JSON | File `settings_schema.json` đã thêm trường | Chạy `JSON.parse()` | Exit code 0, parse hợp lệ | `REQ-CONF-01` |
| `CHK-M5-03-02` | Tắt tính năng | Admin đặt `ai_skin_scan_enable = false` | Tải trang `/kham-da-ai` | Tab camera tự động ẩn, chỉ hiển thị tab khảo sát trắc nghiệm | `REQ-CONF-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Sửa nhầm làm mất các field cấu hình cũ của khách hàng trong `settings_data.json`.  
  - *Phát hiện*: Diff git cho thấy các dòng không liên quan bị xóa.  
  - *Giảm thiểu & Rollback*: Chỉ thêm trường mới ở cuối object `presets.default`, tuyệt đối không chỉnh sửa các key hiện có (`main_color`, `theme_*`, `portal_*`).

---

## TASK-M5-04: Cập nhật Router trong `dev-server.js` và `data/pages.js` hỗ trợ URL `/soi-da`

- **Định danh & Mục tiêu**: `TASK-M5-04` | Khai báo URL alias `/soi-da` trong hệ thống định tuyến của `dev-server.js` và danh mục `data/pages.js` trỏ trực tiếp đến giao diện soi da camera | Module: `M5-CRM-COMPLIANCE-CONFIG` | REQ: `REQ-UI-01` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `data/pages.js`, `dev-server.js` (Pretty-URL router).  
  - Phụ thuộc: `TASK-M4-02`.  
  - Điều kiện: Không làm gãy route `/kham-da-ai` hiện có.  
- **Các bước thực hiện**:  
  1. Trong `data/pages.js`, thêm entry mới cho page `soi-da`:

'soi-da': {

  id: 108,

  title: 'Soi Da AI Miễn Phí \- Phân Tích Làn Da Chuẩn Y Khoa 1:1',

  alias: 'soi-da',

  handle: 'soi-da',

  url: '/soi-da',

  content: '\<p\>Hệ thống soi da trực tuyến 3 góc mặt bằng trí tuệ nhân tạo\</p\>',

  published: true

}

3. Trong `dev-server.js`, bổ sung mapping router:  
   - Khi request vào `/soi-da`, gán ngữ cảnh template `page.ai-skin-quiz` với query param mặc định `mode=camera`.  
3. Cập nhật Vercel route trong `vercel.json` (nếu cần alias riêng, mặc định `/(.*)` đã chuyển tiếp vào `api/index.js`).  
- **Đầu ra**:  
  - Tệp cập nhật: `data/pages.js`.  
  - Tệp cập nhật: `dev-server.js`.  
- **Nghiệm thu**:  
  - `AC-M5-04-1`: Truy cập `http://localhost:3000/soi-da` hoặc `https://hugo-theme-sept2026-test.vercel.app/soi-da` phản hồi HTTP 200 và render giao diện soi da camera ngay lập tức.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M5-04-01` | Route mới | Truy cập URL `/soi-da` | Nhập URL trình duyệt | Trang tải thành công, mở ngay tab Camera | `REQ-UI-01` |
| `CHK-M5-04-02` | Route cũ | Truy cập URL `/kham-da-ai` | Nhập URL trình duyệt | Trang tải bình thường, giữ trọn vẹn 2 tab | `REQ-UI-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Trùng lặp handle với page thật trên hệ thống Sapo Web.  
  - *Phát hiện*: Trang bị redirect loop hoặc 404 trên Sapo thật.  
  - *Giảm thiểu & Rollback*: Hướng dẫn người dùng tạo một trang nội dung có Khung giao diện là `page.ai-skin-quiz` với đường dẫn `/soi-da` trong Sapo Admin.

---

# Module 6: Kiểm Thử Tự Động, Tích Hợp CI/CD Vercel & Kế Hoạch Rollback

## TASK-M6-01: Bộ Kiểm Thử Tự Động Playwright cho Luồng Soi Da AI (`tests/portal/skin-scan.spec.js`)

- **Định danh & Mục tiêu**: `TASK-M6-01` | Xây dựng bộ kịch bản kiểm thử tự động toàn diện bằng Playwright (`tests/portal/skin-scan.spec.js`) kiểm tra luồng camera, mock LIQA 3 góc, tính toán điểm số và hiển thị phác đồ | Module: `M6-TESTING-DEPLOYMENT` | REQ: `REQ-TEST-01` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `playwright.portal.config.js`, `package.json` (`npm run test:portal`), `.clinerules/02-du-an-pharma-cosmetics.md`.  
  - Phụ thuộc: Toàn bộ Module 1, 2, 3, 4, 5\.  
  - Điều kiện: Playwright chạy với cờ `--use-fake-device-for-media-stream` và `--use-fake-ui-for-media-stream` để giả lập camera ảo mà không cần thiết bị vật lý.  
- **Các bước thực hiện**:  
  1. Tạo file test `tests/portal/skin-scan.spec.js`.  
  2. Khởi tạo ngữ cảnh trình duyệt giả lập camera với video giả lập khuôn mặt:

// Excerpt: Playwright Fake Camera Setup

test.use({

  launchOptions: {

    args: \[

      '--use-fake-ui-for-media-stream',

      '--use-fake-device-for-media-stream',

      '--use-file-for-fake-video-capture=tests/fixtures/sample\_face.y4m'

    \]

  },

  permissions: \['camera'\]

});

4. Kịch bản Test 1 (E2E Camera Happy Path):  
   - Truy cập `/soi-da`.  
   - Xác nhận video stream hiển thị, khung hướng dẫn xuất hiện.  
   - Giả lập tín hiệu LIQA đạt chuẩn 3 góc (Chính diện, Trái 45°, Phải 45°).  
   - Bấm chụp đủ 3 ảnh $\\rightarrow$ Kiểm tra thanh tiến độ chuyển sang trạng thái "Phân tích AI".  
   - Chờ chuyển hướng sang trang kết quả $\\rightarrow$ Kiểm tra hiển thị đủ Radar chart, 5 chỉ số và phác đồ 3 giai đoạn.  
4. Kịch bản Test 2 (Fallback Upload khi không có camera):  
   - Chặn quyền camera (`permissions: []`).  
   - Tải 3 file ảnh mẫu từ fixture vào 3 input file.  
    - Kiểm tra luồng thử nghiệm không lỗi và không tuyên bố độ chính xác; kết quả phải được ghi nhãn tham khảo cho tới khi có model/dữ liệu đánh giá được phê duyệt.  
5. Kịch bản Test 3 (Compliance Linting \- RULE-P0-02):  
   - Quét toàn bộ DOM sau khi tải trang kết quả.  
   - Khẳng định không chứa các chuỗi cấm: "Bác sĩ", "Bác sỹ", "BS.", "Dr.".  
- **Đầu ra**:  
  - File tạo mới: `tests/portal/skin-scan.spec.js`.  
- **Nghiệm thu**:  
  - `AC-M6-01-1`: Bộ test chạy qua 100% với lệnh `npx playwright test tests/portal/skin-scan.spec.js`.  
  - `AC-M6-01-2`: Suite phải chạy ổn định và ghi nhận thời gian theo pipeline; ngưỡng <15 giây không phù hợp với suite hiện tại (portal full gần đây: 39 test, khoảng 1.3 phút).  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M6-01-01` | E2E camera logic | Mock getUserMedia/LIQA hoặc fake stream; không có fixture khuôn mặt đã duyệt | Chạy tự động trạng thái camera | Kiểm tra state/guard/cleanup; không dùng làm bằng chứng chất lượng nhận diện hoặc độ chính xác | `REQ-TEST-01` |
| `CHK-M6-01-02` | E2E upload tổng hợp | Upload ảnh tổng hợp không nhạy cảm | Upload và chạy luồng UI | Kiểm tra giới hạn ảnh, trạng thái UI và cleanup; không diễn giải output là phát hiện chính xác | `REQ-TEST-01` |
| `CHK-M6-01-03` | Rà soát danh xưng | Quét nội dung text toàn trang | So sánh Regex cấm | 0 vi phạm danh xưng y tế | `REQ-COMP-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Playwright chạy trên môi trường CI không có GPU làm WebGL bị tắt.  
  - *Phát hiện*: Test case báo lỗi `ort WebGL provider unavailable`.  
  - *Giảm thiểu & Rollback*: Bổ sung fallback cấu hình execution provider `wasm` trong test runner.

---

## TASK-M6-02: Quy Trình Đóng Gói, Kiểm Tra Cấu Hình JSON & Triển Khai Vercel

- **Định danh & Mục tiêu**: `TASK-M6-02` | Thiết lập quy trình kiểm tra chất lượng (Quality Gate) và đóng gói theme đạt chuẩn Sapo Web (.bwt), sẵn sàng deploy lên Vercel Preview và Vercel Production | Module: `M6-TESTING-DEPLOYMENT` | REQ: `REQ-CONF-01` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: `.clinerules/02-du-an-pharma-cosmetics.md`, `package.json`, `vercel.json`.  
  - Phụ thuộc: `TASK-M5-03`, `TASK-M6-01`.  
  - Điều kiện: Không commit các thư mục build tạm (`dist/`, `vercel-dist/`, `node_modules/`, `.vercel/`).  
- **Các bước thực hiện**:  
  1. Kiểm tra tính toàn vẹn cú pháp JSON cấu hình: `node -e "JSON.parse(require('fs').readFileSync('configs/settings_schema.json','utf8'))"` `node -e "JSON.parse(require('fs').readFileSync('configs/settings_data.json','utf8'))"`  
  2. Biên dịch CSS Tailwind và đóng gói tài nguyên theme: `npm run build:tailwind` `npm run build` (đóng gói vào `dist/` để bàn giao đối tác Sapo).  
  3. Kiểm tra preview cục bộ: `node dev-server.js` $\\rightarrow$ Mở `http://localhost:3000/soi-da` đối soát layout.  
  4. Quy trình triển khai Vercel theo quy chuẩn `.clinerules/02-du-an-pharma-cosmetics.md`:  
     - Push code lên nhánh `hugo-theme-sept2026` $\\rightarrow$ Vercel Git Integration tự động tạo **Preview Deployment**.  
     - Kiểm tra Preview URL: Kiểm tra HTTP status và header `X-Vercel-Cache: MISS` trên trang `/soi-da`.  
     - Quảng bá lên Production Alias (`https://hugo-theme-sept2026-test.vercel.app`): Thực hiện qua Vercel Dashboard ("Promote to Production") hoặc chạy CLI `npx vercel --prod --yes` khi kỹ sư có token xác thực.  
- **Đầu ra**:  
  - Bản theme đóng gói sạch: `dist/` (cho Sapo).  
  - Vercel Preview Deployment URL được xác thực hoạt động trơn tru.  
- **Nghiệm thu**:  
  - `AC-M6-02-1`: Toàn bộ các lệnh lint và build chạy hoàn tất với exit code 0\.  
  - `AC-M6-02-2`: Vercel build log không phát sinh lỗi compile serverless hay thiếu module.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M6-02-01` | Lint Schema | Chạy node parse schema | Kiểm tra lệnh | Exit code 0, không có syntax error | `REQ-CONF-01` |
| `CHK-M6-02-02` | Build theme | Chạy `npm run build` | Thực thi lệnh | Sinh đầy đủ 5 thư mục trong `dist/` sạch sẽ | `REQ-CONF-01` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Push nhánh git làm đổi production alias ngoài ý muốn.  
  - *Phát hiện*: Đoạn kiểm tra deployment header trên Vercel.  
  - *Giảm thiểu & Rollback*: Bám sát rule mục 5 của `.clinerules/02`: Push nhánh `hugo-theme-sept2026` chỉ sinh Preview; production alias chỉ cập nhật khi kỹ sư xác nhận quảng bá.

---

## TASK-M6-03: Ma Trận Đánh Giá Rủi Ro, Kịch Bản Giảm Thiểu & Kế Hoạch Rollback Khẩn Cấp

- **Định danh & Mục tiêu**: `TASK-M6-03` | Xây dựng ma trận rủi ro kỹ thuật, kế hoạch ứng phó sự cố (Incident Response) và quy trình Rollback khẩn cấp cho toàn bộ module Soi da AI | Module: `M6-TESTING-DEPLOYMENT` | REQ: `REQ-PRIV-02`, `REQ-COMP-01`, `REQ-CONF-01` | Trạng thái: `planned`.  
- **Đầu vào & Điều kiện**:  
  - Nguồn: Toàn bộ các rủi ro đã nhận diện từ Module 1 đến Module 5\.  
  - Phụ thuộc: Hoàn tất các task trên.  
  - Điều kiện: Cung cấp quy trình rollback rõ ràng, không làm ảnh hưởng các luồng mua hàng và portal hiện tại của Pharma Cosmetics.  
- **Các bước thực hiện**:  
  1. **Ma trận Rủi ro Kỹ thuật & Biện pháp Giảm thiểu**:

| Mã Rủi ro | Tên Rủi ro Kỹ thuật | Xác suất | Tác động | Cơ chế Phát hiện sớm | Biện pháp Giảm thiểu & Phòng ngừa |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `RSK-01` | Trình duyệt người dùng chặn hoàn toàn quyền truy cập Camera | Cao | Trung bình | Sự kiện `catch(err)` của `getUserMedia` trả về `NotAllowedError` | Ngay lập tức mở khung Tải ảnh 3 file từ thư viện máy; hiển thị hướng dẫn bật quyền trong cài đặt trình duyệt. |
| `RSK-02` | Thiết bị cũ thiếu tài nguyên khi chạy camera/Canvas/MediaPipe | Chưa đo | Cao | Lỗi runtime, tab reload/crash, memory pressure; cần đo trên ma trận thiết bị | Đóng stream, xóa buffer/canvas khi rời trang; cho phép rời luồng camera và dùng khảo sát. Không tự chuyển ảnh lên Cloud. |
| `RSK-03` | Provider Cloud không khả dụng hoặc hết quota (chỉ áp dụng nếu tích hợp được duyệt) | Chưa đánh giá | Cao | HTTP lỗi/timeout và metric provider | Hiện Cloud/Hybrid fail-closed; không tuyên bố có Circuit Breaker hoặc Edge failover. Nếu triển khai sau này, xác định fallback, consent, quota và test riêng trước khi bật. |
| `RSK-04` | Người dùng hiểu nhầm điểm/gợi ý thử nghiệm thành chẩn đoán hoặc lời khuyên điều trị | Chưa đánh giá | Cao | Phản hồi khách hàng, review nội dung và rà soát chuyên môn/pháp lý | Dùng ngôn ngữ tham khảo, không gọi là chẩn đoán/phác đồ; tạm dừng tính năng nếu nội dung gây hiểu nhầm và chuyển tới đầu mối phụ trách. |
| `RSK-05` | Lỗi cú pháp Liquid hoặc CSS làm vỡ bố cục trang chủ | Thấp | Nghiêm trọng | Lỗi render dev-server console hoặc layout sụp trong Playwright | Thao tác trên snippet và template độc lập; chỉ liên kết qua setting; revert nhánh git ngay khi phát hiện. |

3. **Quy trình Khôi phục & Rollback Khẩn cấp (Emergency Rollback Procedures)**:  
   - **Cấp độ 1 (Tắt mềm qua cấu hình Sapo Admin)**: Quản trị viên bỏ chọn `ai_skin_scan_enable` và lưu/publish cấu hình. Sau đó xác minh trực tiếp trên cửa hàng rằng camera/script/tab không còn render và khảo sát tham khảo vẫn hoạt động. Thời gian tác vụ và hiệu lực trên production cần đo; không khẳng định “lập tức” hoặc “an toàn lâm sàng”.  
    - **Cấp độ 2 (Rollback Vercel, thời lượng chưa đo)**: Người được phân quyền xác minh deployment tốt gần nhất và dùng quy trình rollback hiện hành của Vercel; xác nhận URL/alias và smoke test sau rollback. Không cam kết thời gian cố định.  
    - **Cấp độ 3 (Revert Git commit, thời lượng chưa đo)**: Theo quy trình conventional commit/review của repo, revert đúng commit đã xác định, chạy build/test, push nhánh preview và xác minh deployment; không khẳng định thời lượng cố định hoặc build production tự động.  
- **Đầu ra**:  
  - Tài liệu quy trình vận hành và tài liệu hướng dẫn xử lý sự cố.  
- **Nghiệm thu**:  
  - `AC-M6-03-1`: Với cấu hình render có `ai_skin_scan_enable = false`, camera, script camera và tab phải vắng mặt, khảo sát vẫn dùng được, route cửa hàng/chủ trang không lỗi. Local response-mock E2E là bằng chứng mức template/client; nghiệm thu Admin production chỉ sau khi publish và xác nhận trên cửa hàng thật.  
  - Bảng kiểm thử (Checklist):

| CHECK-ID | Loại test | Input / Kịch bản | Thao tác | Expected Result | Cơ sở |
| :---- | :---- | :---- | :---- | :---- | :---- |
| `CHK-M6-03-01` | Soft-disable template | Mô phỏng Liquid đã render với `ai_skin_scan_enable = false` | Tải route và thử câu hỏi đầu | Camera/script/tab không render; khảo sát trả lời được. Chưa chứng minh thao tác Admin hoặc publish production. | `REQ-CONF-01` |
| `CHK-M6-03-02` | Cloud fail-closed hiện tại | Gọi storefront ở chế độ Cloud/Hybrid chưa được tích hợp | Chọn chế độ trong cấu hình/mock | Ảnh không được gửi; phân tích bị khóa rõ ràng; khảo sát vẫn hoạt động. Không kỳ vọng Circuit Breaker/Edge failover cho tới khi có thiết kế và implementation riêng. | `REQ-AI-03` |

- **Rủi ro & Phục hồi**:  
  - *Rủi ro*: Không có quyền truy cập Vercel Dashboard khi sự cố xảy ra vào ban đêm.  
  - *Phát hiện*: Báo động hệ thống.  
  - *Giảm thiểu & Rollback*: Bàn giao sẵn cờ Cấp độ 1 cho Quản trị viên Sapo (chỉ cần đăng nhập admin website thông thường là tắt được ngay mà không cần tài khoản Vercel hay Git).

---

## 7\. Kế Hoạch Kiểm Thử, Triển Khai Vercel & Phục Hồi Khẩn Cấp

(Đã được đặc tả chi tiết trong Module 6: TASK-M6-01, TASK-M6-02, TASK-M6-03).

## 8\. Sổ Theo Dõi Nghi Vấn & Điểm Chặn (Blockers & Unknowns)

# Sổ Theo Dõi Nghi Vấn & Điểm Chặn (Blockers & Questions Ledger)

| Q-ID | Loại (Type) | Câu hỏi kỹ thuật / Nghi vấn | Nguồn đã đối chiếu | Trạng thái & Giải pháp thiết kế (Resolution) |
| :---- | :---- | :---- | :---- | :---- |
| `Q-01` | `resolved_by_design` | Nên tạo URL độc lập `/soi-da` hay tích hợp vào `/kham-da-ai` hiện có? | `data/pages.js`, `dev-server.js`, `page.ai-skin-quiz.bwt` | **Đã giải quyết về route/UI**: Giữ `/kham-da-ai` làm trang có hai chế độ tham khảo (camera thử nghiệm và khảo sát 17 câu); `/soi-da` là alias vào camera. Đây là quyết định điều hướng, không hàm ý hệ thống chẩn đoán đã thẩm định. |
| `Q-02` | `open; storefront_cloud_disabled` | Quota/điều khoản/giá của provider Cloud và liệu có nên bật provider nào? | `SRC-USER-REPORT` (giả thuyết intake; cần kiểm tra tài liệu/contract hiện hành từng provider) | Chưa được giải quyết bằng thiết kế Hybrid. Không có provider thật/call quota đã xác minh; storefront đang khóa Cloud/Hybrid. Chỉ quyết định sau khi có báo giá, quota, SLA, retention, DPA/subprocessor, consent và test tích hợp được duyệt. |
| `Q-03` | `partially_open; no_model_asset` | Tải thư viện/model trên mạng di động và khả năng cache/reuse model? | `SRC-RULE-HDKTXD` (Core Web Vitals & PageSpeed) | Một số engine khởi động/tải runtime theo nhu cầu, nhưng template vẫn nạp script deferred; preset model URL/hash rỗng và chưa có model nén. Không có kiểm chứng IndexedDB hoặc tải/cache model 3.8MB. Cần đo network/CWV trên thiết bị và thiết kế cache có kiểm soát trước khi kết luận. |
| `Q-04` | `open_for_legal_review` | Phân loại ảnh khuôn mặt đã che mắt, chỉ số suy ra, căn cứ/mục đích xử lý, thời hạn lưu, bên xử lý phụ và chuyển dữ liệu theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15; GDPR/HIPAA có áp dụng hay không? | Văn bản chính thức Luật 91/2025/QH15; cần luật sư/chủ thể kiểm soát xác nhận phạm vi xử lý và hợp đồng nhà cung cấp | **Chưa được giải quyết bằng thiết kế kỹ thuật**: mask mắt không đồng nghĩa ẩn danh; Process-and-Discard phải được xác nhận ở từng backend/provider. Giữ cloud upload tắt cho tới khi thông báo, căn cứ xử lý, quyền rút lại/xóa, retention, subprocessors và chuyển dữ liệu được phê duyệt. Luật số 91/2025/QH15 là Luật Bảo vệ dữ liệu cá nhân, có hiệu lực 01/01/2026. |

## 9\. Báo Cáo Kiểm Tra Logic & Phản Ví Dụ (Self-Review)

# Báo Cáo Kiểm Tra Logic & Phản Ví Dụ (Self-Review & Counter-Examples)

Phương pháp: Tự kiểm tra bằng phản ví dụ (Counter-examples), đối soát ma trận yêu cầu hai chiều và xác minh tính tương thích ngược với codebase hiện có.

| REVIEW-ID | Đối tượng kiểm tra | Phản ví dụ / Kịch bản biên | Bằng chứng đối chiếu | Kết quả | Biện pháp điều chỉnh trong Kế hoạch | Kết quả sau điều chỉnh |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| `REV-01` | `REQ-CAP-01` (3 góc mặt) | Khách hàng chỉ chụp góc chính diện, tắt camera rồi đòi bấm "Xem kết quả" | Mô hình HER Skincare: từ chối phân tích khi thiếu thông tin 3D gò má | `defect_found` | Khóa nút "Xem kết quả"; máy trạng thái chỉ cho phép tính toán khi cả 3 biến `front`, `left`, `right` đều khác null (Task M1-01) | `covered` |
| `REV-02` | `REQ-SCORE-02` (Định kiến sắc thái) | Người dùng có da ngăm bánh mật tự nhiên (MST 5-6) bị thuật toán báo "Tăng sắc tố nghiêm trọng" | Báo cáo chuyên sâu: ISIC dataset thiên lệch da trắng, gây underfitting trên da sẫm | `defect_found` | Bổ sung hệ số hiệu chuẩn $\\kappa\_{melanin}$ co giãn ngưỡng phát hiện sắc tố theo chỉ số ITA cá nhân (Task M3-01) | `covered` |
| `REV-03` | `REQ-AI-03` (Quota Cloud API) | Hết 50 lượt gọi miễn phí của Skinive Sandbox giữa lúc chiến dịch marketing đang chạy | Báo cáo chuyên sâu: Gói dùng thử có hạn mức cố định | `defect_found` | Kiến trúc Hybrid Dual-Engine: Khi Cloud API báo lỗi HTTP 429/403, tự động chuyển mạch 100% sang Edge WebAssembly (Task M2-03) | `covered` |
| `REV-04` | `REQ-COMP-01` (Danh xưng y tế) | Template hoặc snippet mới vô tình lọt chữ "Bác sĩ" hoặc "Dr." | `.clinerules/02` RULE-P0-02: Cấm tuyệt đối danh xưng Bác sĩ | `defect_found` | Thiết lập bộ linter kiểm tra tự động trong Task M6-01; toàn bộ text chuẩn hóa thành "Chuyên gia Pharma AI" | `covered` |
| `REV-05` | `REQ-PRIV-01` (Bảo vệ ảnh khuôn mặt) | Ảnh mặt người dùng bị đẩy lên Google Apps Script CRM; che mắt bị nhầm là ẩn danh hoàn toàn | Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15; phạm vi GDPR/HIPAA cần xác định | `defect_found` | CRM allowlist chỉ nhận chỉ số, tuyệt đối không nhận Base64 ảnh; mask mắt không được xem là ẩn danh; retention/provider và nội dung consent vẫn cần rà soát pháp lý | `technical_control_implemented; legal_review_open` |
| `REV-06` | `REQ-UI-01` (Không có camera) | Người dùng máy tính để bàn (PC) không có webcam truy cập trang soi da | Trình duyệt ném ngoại lệ `NotFoundError` | `defect_found` | Bổ sung luồng tải 3 ảnh/khảo sát thay thế và kiểm thử lỗi quyền; E2E giả lập không thay thế kiểm thử browser/device thật (Task M1-01) | `implemented-limited; device acceptance open` |
| `REV-07` | `REQ-CONF-01` (An toàn Settings) | Kỹ sư sơ ý ghi đè hoặc làm mất các trường cấu hình cũ trong `settings_data.json` | Sự cố ngày 17/09/2026: Xóa nhầm `header_topbar_bg` | `covered` | Quy tắc chỉ thêm Section mới ở cuối schema và cuối `presets.default`, có bước kiểm tra JSON tự động trước khi commit (Task M5-03) | `covered` |
| `REV-08` | Core Web Vitals | Script/engine soi da làm tăng tải ban đầu hoặc nạp mạng không cần thiết | `Rule&HDKTXD.md` Phần 7 (Core Web Vitals) | `risk_identified` | Có `defer` và một số runtime/model chỉ tải khi gọi; chưa có bundle/network/CWV benchmark chứng minh mọi dependency lazy hoặc tác động bằng 0 lên Home. Cần đo bản build và browser network trên trang chủ/route soi da trước nghiệm thu | `measurement_open` |

## 10\. Phụ Lục Sổ Đọc Nguồn & Checkpoint Phiên

# Sổ Đọc Nguồn & Kiểm Kê Đầu Vào (Intake Inventory)

Trạng thái kiểm kê: `enumeration=complete`, `intake=complete`.

| source\_id | location | role | baseline | extent | read\_status | evidence | findings | remaining |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| `SRC-USER-REPORT` | User Prompt Context | Tài liệu phân tích kỹ thuật | 2026-09-24 | 1 tài liệu (\~120 dòng phân tích) | `full` | Tham chiếu HER Skincare, YouCam API, Skinive.Cloud, YOLOv8, MediaPipe, OpenCV, Monk Skin Tone | Quy chuẩn chụp 3 góc mặt; 5 chỉ số lâm sàng; cơ chế S2S Polling, raw\_score vs ui\_score; LIQA; bias da sẫm | Không |
| `SRC-REPO-README` | `README.md` | Tài liệu dự án | Git SHA `9439768` | 134 dòng | `full` | Tổng quan theme Sapo Web, 3 tầng kiến trúc (dev-server, Vercel, Sapo) | Cấu trúc repo, lệnh dev | Không |
| `SRC-REPO-AGENTS` | `AGENTS.md` | Hướng dẫn agent | Git SHA `65f8d62` | 42 dòng | `full` | Nguồn chuẩn duy nhất, RULE-P0-02, quy tắc commit, deploy Vercel | Phải tuân thủ Rule\&HDKTXD, không tự bịa | Không |
| `SRC-CLINERULES-02` | `.clinerules/02-du-an-pharma-cosmetics.md` | Quy chuẩn vận hành | Git SHA `ebeab9c` | 237 dòng | `full` | Chi tiết dev-server, Vercel, RULE-P0-02 ("Chuyên gia"), Home Portal v3 | Không dùng MOPS cho CRM; font Montserrat; quy chuẩn Sapo .bwt | Không |
| `SRC-RULE-HDKTXD` | `Rule&HDKTXD.md` | Cẩm nang Sapo Web | Git SHA `fad50e9` | 146 dòng | `full` | Checklist review theme Sapo, 38 objects, 15 input types, Core Web Vitals | Quy chuẩn Liquid, không hardcode, phòng thủ `!= blank` | Không |
| `SRC-PKG-JSON` | `package.json` | Cấu hình dự án | Git SHA `b0b6d0c` | 27 dòng | `full` | liquidjs, tailwindcss, playwright, sass | Runtime Node, scripts build và test | Không |
| `SRC-VERCEL-CONFIG` | `vercel.json` | Cấu hình Vercel | Git SHA `39f936f` | 20 dòng | `full` | `@vercel/node`, `api/index.js`, includeFiles | Routing toàn bộ `/(.*)` vào serverless handler | Không |
| `SRC-DEV-SERVER` | `dev-server.js` | Serverless handler / preview | Git SHA `585436c` | 1650+ dòng | `full` | Custom tags (form, paginate), custom filters, page router, asset compiler | Điểm đón route tĩnh và route động cho storefront | Không |
| `SRC-PAGE-AI-QUIZ` | `templates/page.ai-skin-quiz.bwt` | Template AI Quiz hiện có | Git SHA `8857f1a` | 290 dòng | `full` | Chat UI 1:1, 17 câu hỏi lâm sàng, modal CRM consent, recommendation | Nền tảng luồng tư vấn AI hiện tại | Không |
| `SRC-PAGE-AI-RESULTS` | `templates/page.ai-skin-quiz-results.bwt` | Template kết quả AI Quiz | Git SHA `ce1f85d` | 95 dòng | `full` | Giao diện kết quả phác đồ 3 giai đoạn, cảnh báo y tế, liên kết search | Nền tảng hiển thị phác đồ trị liệu | Không |
| `SRC-SECTION-AI-GUIDE` | `snippets/section_ai_guide.bwt` | Snippet dẫn nhập trang chủ | Git SHA `6ec53f9` | 33 dòng | `full` | Block 3 bước dẫn nhập khám da AI trên Home Portal v3 | Vị trí neo CTA dẫn vào tính năng soi da | Không |
| `SRC-CRM-INTAKE-JS` | `assets/crm-intake.js.bwt` | Client SDK gửi CRM | Git SHA `3af6141` | 51 dòng tại intake (historic) | `full at intake` | Client gửi một số action tới endpoint cấu hình; consent/payload phải xét riêng theo action | Không đủ bằng chứng để gọi là kênh an toàn/tuân thủ; cần audit GAS, auth, retention và từng luồng consent | Xác minh backend/config trước production |
| `SRC-CRM-EXTRACTOR` | `snippets/customer_context_extractor.bwt` | Snippet trích xuất ngữ cảnh | Git SHA `88ded6d` | 39 dòng | `full` | Trích xuất thông tin khách hàng đã đăng nhập | Đồng bộ thông tin cá nhân hóa khi khách hàng đồng ý | Không |
| `SRC-CONFIG-SCHEMA` | `configs/settings_schema.json` | Schema Admin cấu hình | Git SHA `2396856` | 301KB JSON | `full` | 22 nhóm cấu hình, định nghĩa type/id/label/default | Nơi đăng ký cấu hình soi da mới | Không |
| `SRC-CONFIG-DATA` | `configs/settings_data.json` | Dữ liệu cấu hình Admin | Git SHA `19bd888` | 106KB JSON | `full` | Preset giá trị mặc định cho toàn bộ website | Nơi lưu giá trị mặc định của cờ soi da | Không |
| `SRC-DATA-PAGES` | `data/pages.js` | Danh mục trang tĩnh mock | Git SHA `77872bc` | 50 dòng | `full` | Định nghĩa page handles như `kham-da-ai`, `ai-skin-quiz` | Khai báo route mới cho preview và SSR | Không |

### 10.2. Ghi chú về checkpoint Planner cũ

Checkpoint planner ban đầu từng tham chiếu thư mục `working/` và đường dẫn `/working_dir/...`; cả hai không có trong repository hiện tại (đã kiểm tra ngày 2026-09-24). Không dùng các tham chiếu cũ đó làm bằng chứng artifact còn tồn tại hoặc task đã hoàn tất; trạng thái hiện tại được quản lý theo bảng đối soát 10.3 và checkpoint triển khai ở cuối tài liệu.

### 10.3. Đối soát kế hoạch với implementation hiện tại (2026-09-24)

Đây là snapshot đối soát mã nguồn sau khi triển khai thử nghiệm trong theme; không thay thế nghiệm thu sản phẩm, đánh giá lâm sàng, kiểm thử thiết bị đại diện hay phê duyệt pháp lý. Trạng thái ở ma trận truy nguyên được cập nhật theo bằng chứng hiện có; chữ `planned` còn trong tiêu đề task/checklist mô tả trạng thái khi soạn kế hoạch và không phải bằng chứng triển khai hiện tại. Các bước, con số hiệu năng, payload mẫu và checklist trong thân task là giả thuyết/tiêu chí dự kiến cho tới khi có kết quả kiểm thử được ghi nhận. Chỉ các bằng chứng runtime/test nêu dưới đây được xem là đã kiểm tra.

| Nhóm | Bằng chứng hiện có | Trạng thái thực tế | Khoảng trống / điều kiện chưa đạt |
| :--- | :--- | :--- | :--- |
| Thu thập 3 góc, camera và fallback | `snippets/skin_scan_camera.bwt`, `assets/skin-camera.js.bwt`; portal E2E kiểm tra permission denied, upload 3 ảnh, LIQA chặn chụp và phân tích | `implemented_limited; E2E simulated` | Chưa nghiệm thu Safari iOS/Android thực, 30 fps hoặc trải nghiệm camera trên thiết bị thật. Không lưu ảnh Base64; giữ buffer trong RAM và xóa ở `pagehide`. |
| LIQA / landmarks | `assets/skin-liqa-mesh.js.bwt`, `assets/skin-liqa-lighting.js.bwt`; E2E landmarks tổng hợp và các trường hợp ánh sáng | `implemented_limited; synthetic tests` | E2E không chứng minh sai số Yaw/Pitch ±3°, thời gian <40ms, nhận diện kính/tóc hay độ chính xác trên dữ liệu người thật. Không ghi các tiêu chí đó là đạt. |
| Xử lý ảnh cổ điển | `assets/skin-cv-engine.js.bwt` hiện có heuristic Canvas/pixel | `experimental; not OpenCV` | Chưa tích hợp OpenCV.js, chưa có Hessian đã kiểm chứng; phép đo Canvas không phải phát hiện tổn thương hoặc kết quả lâm sàng. `tech_neck_detected` chưa được xác thực. |
| ONNX / phát hiện tổn thương | `assets/skin-onnx-engine.js.bwt` xác minh SHA-256, giới hạn tải, tiền xử lý/decoder/NMS; E2E kiểm tra hash và decoder bằng tensor giả | `integration scaffold; no model validated` | Preset URL/hash rỗng; chưa có artifact, nhãn/lớp đã xác minh, giấy phép, metric chất lượng hoặc test suy luận với model thật. Không tuyên bố AI phát hiện mụn/sắc tố đã hoạt động. |
| Cloud adapter | `dev-server.js` route `/api/skin-analysis`; `tests/api/skin-analysis-adapter.test.js` kiểm tra consent/allowlist/điểm upstream | `server adapter scaffold; storefront disabled` | Không có provider/credential được duyệt, chưa có kiểm chứng nhà cung cấp. Cloud/Hybrid trên storefront fail-closed; không có Circuit Breaker tự chuyển sang Edge như một số đoạn TASK-M2-03/RSK-03 đang mô tả. |
| ROI, mask và dữ liệu | `assets/skin-deid-roi.js.bwt`, `assets/skin-camera.js.bwt`; portal test xác nhận preview mask, xử lý từ ảnh gốc trong RAM, `pagehide` giải phóng buffer/canvas, session chỉ giữ số liệu | `implemented_limited; legal review open` | ROI hiện là crop hình học T/U/neck, không phải 5 ROI chuẩn hay segment theo landmarks. Mask mắt chỉ áp dụng cho preview, không ẩn danh. Cần rà soát pháp lý/quyền riêng tư và retention trước mọi phát hành/mở truyền dữ liệu. |
| MST, scoring, routine và overlay | `assets/skin-mst-debiasing.js.bwt`, `skin-scoring-engine.js.bwt`, `skin-routine-matcher.js.bwt`, `skin-visual-overlay.js.bwt`; portal tests dùng swatch/tensor/dữ liệu tổng hợp và catalog hiện tại | `implemented_limited; synthetic/catalog tests` | Swatch sRGB không chứng minh hiệu chuẩn camera hoặc độ chính xác >90%; score/routine là gợi ý thử nghiệm, không phải chỉ định chuyên môn. Overlay chỉ vẽ detection khi có model tương thích thật. |
| CRM consent / dữ liệu | `assets/crm-intake.js.bwt`; portal E2E xác nhận từ chối khi thiếu consent và allowlist chỉ gửi dữ liệu định lượng | `technical guard verified; legal review open` | Chưa xác nhận backend GAS, notice/consent production, mục đích/lưu giữ/xóa/bên nhận và quy trình rút consent. Không gửi ảnh; không bật CRM thật chỉ dựa trên test giả lập. |
| Soft-disable / config | Hai Liquid gate trong `templates/page.ai-skin-quiz.bwt`; schema và preset có `ai_skin_scan_enable`; portal E2E mô phỏng ẩn vùng camera/script và hoàn thành câu đầu khảo sát | `verified by rendered-response E2E` | Mô phỏng response xác nhận hành vi markup/client nhưng không thay cho thao tác lưu/publish và xác minh cấu hình trên Sapo Admin production. |
| Quality gate gần nhất | `npm run build` thành công (dist, 311 entries); parse `settings_schema.json` + `settings_data.json`; tuần tự `npm run test:portal` 39/39, `npm run test:skin-api` 1/1, `npm run test:crm` 2/2 (2026-09-24) | `local checks passed; browser suites rerun sequentially` | Chạy portal/CRM song song gây va chạm `test-results` (ENOENT trace và một timeout); tuần tự cả hai pass. Build báo `caniuse-lite` outdated. Không phải deploy, device acceptance hay legal approval. |

**Các điều chỉnh bắt buộc khi tiếp tục triển khai:** (1) rà các AC/TASK lịch sử để không mô tả Base64, chẩn đoán hoặc điều trị như hành vi được bật; (2) mọi mục tiêu Yaw, fps, latency, OpenCV/Hessian, model YOLO/độ chính xác, fairness và failover Cloud→Edge phải còn là target chưa đạt cho tới khi có implementation và bằng chứng; (3) giữ Cloud/CRM/model ở trạng thái fail-closed cho tới khi đủ artifact/provider, test đại diện và legal review; (4) không sửa production settings chỉ dựa trên bản kế hoạch, nhưng deployment mới phải mặc định tắt cho tới khi được phê duyệt. Không suy diễn `implemented` từ sự tồn tại của module hoặc test dữ liệu giả.

# Checkpoint Tiến Độ Triển Khai

- **plan\_id**: PLAN-PHARMA-SKIN-AI-20260924  
- **current\_phase**: IMPLEMENTATION\_RECONCILIATION\_AND\_SAFETY\_GATES  
- **status**: IN\_PROGRESS; RELEASE\_GATES\_OPEN  
- **module\_status**:  
  - Module 1: Camera/upload, LIQA và RAM cleanup đã có; thiết bị thật, camera performance, yaw accuracy và occlusion chưa nghiệm thu.  
  - Module 2: Canvas heuristic và ONNX decoder scaffold; OpenCV/Hessian chưa triển khai, model thật/provider chưa có; Cloud storefront fail-closed.  
  - Module 3: MST swatch, heuristic scoring và catalog matcher có test tổng hợp; fairness/clinical validation chưa có.  
  - Module 4: Camera/quiz UI, result view, overlay và home CTA đã có; kết quả chỉ tham khảo, detector thật chưa xác nhận.  
  - Module 5: Schema/preset, client consent guard, API adapter scaffold và route đã có; Sapo/GAS production, legal review, KV deployment chưa xác minh.  
  - Module 6: Local build/portal/API/CRM suites đã chạy; chưa thực hiện Vercel deployment, production smoke test hoặc device acceptance.  
- **verified\_artifacts**: Tham chiếu code/test trong mục 10.3; không có thư mục `working/` trong workspace hiện tại.  
- **next\_action**: Còn đối chiếu các claim lịch sử được đánh dấu tại M3 với chính sách nội dung/chuyên môn; xin các phê duyệt thiết bị/model/provider/CRM/consent và xác nhận cấu hình Sapo trước khi đóng release gates. Không deploy production trong trạng thái hiện tại.
