# **CẨM NANG QUY CHẾ, RULE & HƯỚNG DẪN KỸ THUẬT PHÁT TRIỂN THEME SAPO WEB**

# **LỜI NÓI ĐẦU & MỤC TIÊU TÀI LIỆU**

Tài liệu này là cẩm nang toàn diện dành cho các kỹ sư phần mềm, lập trình viên frontend và đối tác thiết kế (Partner) xây dựng giao diện (Theme) trên nền tảng Sapo Web. Tài liệu tổng hợp toàn bộ các quy chuẩn kiến trúc, cú pháp Liquid, danh mục đối tượng dữ liệu, kỹ thuật cấu hình, tiêu chuẩn kiểm duyệt chất lượng (Checklist Review Theme) và quy trình kinh doanh trên Kho Giao Diện Sapo.

1. # **PHẦN 1: BỘ CHECKLIST REVIEW THEME CHUẨN SAPO (ĐẦY ĐỦ TIÊU CHÍ DETAIL)**

2. **Chuẩn Cấu trúc & Thư mục Bắt buộc**: Đầy đủ 5 thư mục cốt lõi (assets, config, layout, snippets, templates). File `settings_schema.json` đúng định dạng JSON, không chứa lỗi cú pháp. File `theme.bwt` chứa đầy đủ hai thẻ Liquid bắt buộc: `{{ content_for_header }}` trước thẻ đóng `</head>` và khối `{% block "ContentPlaceHolder" %}{% endblock %}` (hoặc `{{ content_for_layout }}`) trong thẻ `<body>`.  
3. **Tiêu chuẩn Responsive & Hiển thị Đa thiết bị**: Giao diện phải tương thích mượt mà từ màn hình Mobile nhỏ nhất (320px), Tablet (768px) đến Desktop màn hình rộng (1920px). Không xuất hiện thanh cuộn ngang (horizontal scrollbar) ngoài ý muốn. Menu Mobile (Off-canvas/Hamburger) hoạt động trơn tru. Bố cục flex/grid tự động căn chỉnh phù hợp theo từng breakpoint mà không bị vỡ khung hay đè lấp chữ.  
4. **Tối ưu Hiệu năng & Mã nguồn (Performance & Quality)**: Điểm Google PageSpeed Insights đạt tiêu chuẩn tối thiểu (Desktop \>= 75, Mobile \>= 50). Toàn bộ ảnh sản phẩm, banner bắt buộc xử lý qua bộ lọc `img_url` với kích thước phù hợp (thumb, medium, large...), áp dụng thuộc tính lazy-loading (`loading="lazy"`). Mã nguồn CSS/JS phải được nén tối ưu, tuyệt đối không phát sinh lỗi JavaScript/Uncaught Exception trong Console trình duyệt.  
5. **Quy chuẩn Luồng TMĐT & Chức năng Bán hàng (E-commerce Flow)**: Variant Selector chuyển đổi mượt mà (cập nhật chính xác giá, giá so sánh, SKU, trạng thái Còn hàng/Hết hàng và đổi ảnh tương ứng theo biến thể). Giỏ hàng (Cart Page & Mini Cart AJAX) tính toán chính xác tổng tiền, số lượng sản phẩm, hỗ trợ tăng/giảm/xóa sản phẩm và cập nhật tức thì qua AJAX API mà không cần reload trang. Các Form hệ thống (Đăng ký, Đăng nhập, Liên hệ, Đăng ký nhận tin) phải validate chính xác trường dữ liệu và gửi thành công.  
6. **Tiêu chuẩn SEO Onpage & Tiêu chuẩn Bàn giao Theme**: Mỗi trang chỉ chứa duy nhất 01 thẻ `<h1>` đại diện cho tiêu đề chính. Tất cả hình ảnh phải có thuộc tính `alt` mô tả. Tối ưu đầy đủ thẻ `<title>`, `<meta name="description">` và Open Graph meta tags cho mạng xã hội. File giao diện nộp bàn giao phải nén dưới dạng .zip chuẩn, đầy đủ dữ liệu mẫu cấu hình trong `settings_data.json` để khi cài đặt theme có ngay giao diện hoàn thiện như demo.

# **PHẦN 2: QUY CHUẨN BẮT BUỘC TRONG FILE LAYOUT MASTER (layout/theme.bwt)**

## **2.1. Hai thẻ Liquid bắt buộc tuyệt đối**

1. **Thẻ nhúng Header hệ thống**: `{{ content_for_header }}` (đặt ngay trước thẻ đóng `</head>`). Dùng để inject script theo dõi, Analytics và các ứng dụng App Store.  
2. **Khối hiển thị nội dung Template con**: `{% block "ContentPlaceHolder" %}{% endblock %}` (hoặc `{{ content_for_layout }}`). Đặt bên trong thẻ `<body>`, là điểm nạp nội dung động từ các file template.

## **2.2. Bốn thành phần giao diện bắt buộc (Core UI Requirements)**

* **Logo / Store Name**: Hiển thị logo hình ảnh hoặc biến `{{ store.name }}`, bọc trong thẻ liên kết trỏ về trang chủ `/`.  
* **Menu định hướng chính (Main Menu)**: Lấy dữ liệu động từ `linklists['main-menu']`.  
* **Menu chân trang (Footer Menu)**: Lấy dữ liệu từ `linklists['footer']`.  
* **Thanh tìm kiếm (Search Bar)**: Phải có ô nhập tìm kiếm hoặc nút icon trỏ đến trang `/search`.

## **2.3. Quy chuẩn cấu trúc thẻ `<body>`**

Thẻ `<body>` phải được gán class và id động:  
`<body class="{{ template | replace: '.', ' ' | truncatewords: 1, '' }}" id="{{ page_title | alias }}">`

# **PHẦN 3: TỔNG QUAN HỆ THỐNG & KIẾN TRÚC THEME SAPO WEB**

## **1.1. Bản chất công nghệ**

* **Sapo Web** sử dụng ngôn ngữ template **Liquid** (nguồn mở, phát triển trên nền tảng Ruby) làm bộ khung kết xuất dữ liệu động từ cơ sở dữ liệu hệ thống ra mã nguồn HTML/CSS/JS phía client.  
* Toàn bộ các file giao diện xử lý logic động trên Sapo đều có phần mở rộng là `.bwt` (thay vì `.liquid` thuần túy), được biên dịch trên máy chủ Sapo trước khi phản hồi về trình duyệt.

## **1.2. Cấu trúc thư mục chuẩn của một Theme Sapo**

Một theme đạt chuẩn bắt buộc phải tuân thủ nghiêm ngặt cấu trúc 5 thư mục cốt lõi sau:

&nbsp;

* **assets/**: Chứa tài nguyên tĩnh (style.css, app.js, icon-\*.svg, banner-placeholder.jpg).  
* **config/**: Chứa `settings_schema.json` (định nghĩa cấu hình) và `settings_data.json` (lưu trữ giá trị cấu hình).  
* **layout/**: Chứa `theme.bwt` (Layout Master).  
* **snippets/**: Chứa các đoạn code tái sử dụng (header, footer, product-item, pagination, breadcrumbs).  
* **templates/**: Chứa các file template tương ứng với từng loại URL (index, product, collection, cart, blog, article, page, list\_collections, search, 404).

## **1.3. Chi tiết vai trò từng thư mục**

1. **assets/**: Khi sử dụng biến cấu hình từ `settings_schema.json` bên trong CSS hoặc JS, bắt buộc đặt tên file có đuôi `.scss.bwt` hoặc `.js.bwt`. Gọi file qua bộ lọc: `{{ 'app.css' | asset_url | stylesheet_tag }}`. Dữ liệu cấu hình trong `settings_data.json` sẽ tự động sinh để lưu trữ các giá trị mà quản trị viên đã thiết lập.  
2. **layout/**: Chứa layout tổng thể website, mặc định là `theme.bwt`.  
3. **snippets/**: Nhúng snippet bằng thẻ `{% include 'tên-snippet' %}` (không cần đuôi `.bwt`).  
4. **templates/**: Hỗ trợ tạo template tùy chọn (Custom Templates). Khi kiểm tra template trong code, luôn dùng toán tử `contains` (ví dụ: `{% if template contains 'product' %}`).

# **PHẦN 3: CẨM NANG NGÔN NGỮ TEMPLATE LIQUID TRÊN SAPO**

## **3.1. Ba thành phần nền tảng**

* **Thẻ (Tag)**: `{% ... %}` xử lý logic, vòng lặp.  
* **Đối tượng (Object)**: `{{ ... }}` in dữ liệu ra HTML.  
* **Bộ lọc (Filter)**: `{{ biến | tên_bộ_lọc }}` định dạng và xử lý chuỗi/mảng.

## **3.2. Cú pháp & Quy tắc Logic cốt lõi**

* **Toán tử**: `==`, `!=`, `>`, `<`, `>=`, `<=`, `and`, `or`, `contains`.  
* **Quy tắc True / False**: Mọi giá trị đều là **TRUE**, ngoại trừ `false` và `null`. **Chuỗi rỗng `""` vẫn là TRUE**. Luôn dùng `{% if variable != blank %}` để kiểm tra nội dung.

## **3.3. Các loại thẻ Liquid thông dụng**

* **Thẻ điều khiển luồng (Control Flow Tags)**: `if`, `elsif`, `else`, `unless`, `case/when`. Dùng để quyết định đoạn code Liquid/HTML nào sẽ được thực thi dựa trên điều kiện.  
* **Thẻ lặp (Iteration Tags)**: `for` (hỗ trợ các tham số `limit`, `offset`, `reversed`), `cycle`, `tablerow`. Biến `forloop` hỗ trợ thuộc tính `index`, `first`, `last`, `length`. Dùng để duyệt qua mảng hoặc thực hiện khối lệnh lặp lại.  
* **Thẻ biến số (Variable Tags)**: `assign`, `capture`, `increment`, `decrement`. Dùng để khởi tạo, gán giá trị hoặc tạo biến lưu chuỗi complex/HTML.  
* **Thẻ giao diện (Theme Tags)**: `comment`, `include`, `form`, `paginate`, `raw`. Dùng để xuất HTML cho form, nhúng snippet, ghi chú hoặc xử lý phân trang.

## **3.4. Hệ thống Bộ lọc (Filters) trên Sapo**

* **HTML**: `stylesheet_tag`, `script_tag`, `img_tag`.  
* **Money**: `money`, `money_with_currency`, `money_without_currency`.  
* **String**: `append`, `handleize` (alias), `truncate`, `strip_html`, `split`, `replace`.  
* **URL**: `asset_url`, `file_url`, `img_url` (hỗ trợ các size: `thumb`, `small`, `compact`, `medium`, `large`, `grande`, `1024x1024`).

# **PHẦN 4: DANH MỤC 38 ĐỐI TƯỢNG (OBJECTS) CỦA SAPO**

## **4.1. Nhóm Đối tượng Toàn cục (Global Objects)**

* `store`, `settings`, `all_products`, `collections`, `blogs`, `pages`, `linklists`, `cart`.  
* `customer`, `template`, `page_title`, `page_description`, `current_page`, `current_tags`, `content_for_header`, `content_for_layout`.

## **4.2. Nhóm Đối tượng Ngữ cảnh / Template (Context Objects)**

* `product`, `variant`, `collection`, `article`, `blog`, `page`, `search`.  
* `line_item`, `order`, `transaction`, `shipping_method`, `address`, `comment`, `link`, `linklist`, `request`.

## **4.3. Nhóm Đối tượng Hỗ trợ (Helper Objects)**

* `paginate`, `part`, `forloop`, `form`, `country_option_tags`.

# **PHẦN 5: QUY CHUẨN CẤU HÌNH THEME QUA settings\_schema.json**

## **5.1. Cấu trúc tổng thể**

Chứa mảng JSON các Section, mỗi Section chứa danh sách các trường (`settings`) với `type`, `id`, `label`, `default`.

## **5.2. Danh mục 15 loại trường nhập liệu**

`header`, `paragraph`, `color`, `font`, `text`, `textarea`, `image`, `checkbox`, `radio`, `select`, `collection`, `blog`, `page`, `link_list`, `snippet`.

## **5.3. Kỹ thuật lập trình phòng thủ (Defensive Coding)**

Luôn kiểm tra biến rỗng trước khi render:

&nbsp;

* `{% unless settings.banner_title == blank %}`  
* `{% unless settings.home_featured_col == blank or collections[settings.home_featured_col].empty? %}`

# **PHẦN 6: KỸ THUẬT XÂY DỰNG CÁC TÍNH NĂNG CỐT LÕI**

## **6.1. Chức năng Tìm kiếm Nâng cao (Search Engine)**

* **Endpoint**: `/search?q={từ_khóa}`.  
* **Tham số**: `type` (product, article, page), `field` (name, vendor, sku, tags...), `sortby` (ví dụ: `price_min:asc`), `view` (suffix template).  
* **Ứng dụng**: Tạo `search.json.bwt` cho tính năng Live Search bằng AJAX.

## **6.2. Bộ lọc Đa tiêu chí trên Trang Danh mục**

* Sử dụng `current_tags` cho lọc theo Tag hệ thống.  
* Sử dụng Search API / AJAX cho lọc thuộc tính biến thể, giá mà không cần tải lại trang.

## **6.3. Giỏ hàng & Luồng mua hàng AJAX**

* **Thêm vào giỏ**: POST về `/cart/add` (truyền `id` biến thể và `quantity`).  
* **AJAX Endpoints**: `/cart/add.js`, `/cart.js` (GET), `/cart/change.js` (POST).

# **PHẦN 8: QUY CHẾ ĐỐI TÁC, QUY TRÌNH DUYỆT & KINH DOANH**

## **8.1. Quy trình xét duyệt Theme**

* **Bước 1**: Nộp bản thiết kế (Desktop & Mobile) qua `partner@sapo.vn`. Giới hạn duyệt tối đa 3 site cùng lúc.  
* **Bước 2**: Cắt giao diện Liquid (.bwt) khi thiết kế được thông qua.  
* **Bước 3**: Nộp site demo và file zip. Có tối đa 3 lần review để sửa lỗi.  
* **Bước 4**: Xuất bản lên Kho Giao Diện. Giá niêm yết phải đồng nhất trên mọi kênh.

## **8.2. Chính sách Doanh thu & Đối soát**

* **Tỷ lệ chia sẻ**: **70 / 30** (Đối tác nhận 70%).  
* **Thanh toán**: Đối soát trước ngày 20, thanh toán chậm nhất ngày 25 hàng tháng.  
* **Giá sàn**: Tối thiểu **300.000 VNĐ**.

## **8.3. Trách nhiệm Bảo hành & Quy định Ẩn / Hạ Theme**

* **Thời hạn sửa lỗi**: Tối đa **2 ngày làm việc** khi có thông báo lỗi.  
* **Xử phạt**: Quá 2 ngày không fix sẽ bị ẩn theme. Vượt quá 3 lần bị ẩn sẽ bị gỡ vĩnh viễn.  
* **Duy trì doanh số**: Nếu 2 tháng liên tục không có đơn hàng, đối tác phải nâng cấp hoặc chỉnh giá, nếu không theme sẽ bị ẩn.

&nbsp;

# **PHẦN 7: KĨ THUẬT NÂNG CAO, BỘ TIÊU CHUẨN TỐI ƯU HIỆU NĂNG & NÂNG CẤP KIẾN TRÚC THEME**

## **7.1. Kỹ thuật Tối ưu Hiệu năng & Đạt chuẩn Core Web Vitals (LCP, FID/INP, CLS)**

* **Tối ưu LCP (Largest Contentful Paint)**: Đối với ảnh Banner/Slider hoặc Ảnh chính của sản phẩm (Hero Image), tuyệt đối không áp dụng attribute `loading="lazy"`. Bắt buộc bổ sung thẻ `<link rel="preload" as="image" href="...">` trong thẻ `<head>` đối với ảnh Hero chính của trang.  
* **Tránh hiện tượng CLS (Cumulative Layout Shift)**: Tất cả các thẻ `<img>` bắt buộc khai báo rõ thuộc tính `width` và `height` hoặc sử dụng thuộc tính CSS `aspect-ratio` để giữ khung hiển thị trước khi tài nguyên ảnh nạp xong.  
* **Tối ưu Tải JavaScript & CSS Path (Critical CSS)**: Tách và nhúng trực tiếp Critical CSS (CSS khung giao diện trên màn hình đầu tiên) trong thẻ `<head>`. Toàn bộ các script JS không thiết yếu phải được khai báo thêm thuộc tính `defer` hoặc `async` để tránh làm cản trở quá trình dựng khung (render-blocking).

## **7.2. Cấu trúc Schema SEO Nâng cao (Structured Data)**

* **Schema Product & AggregateRating**: Nhúng JSON-LD chuẩn Schema.org vào file `product.bwt` khai báo các thông tin động: `name`, `image`, `description`, `sku`, `offers` (giá, đơn vị tiền tệ, trạng thái còn hàng) giúp hiển thị kết quả giàu thông tin (Rich Snippet) trên Google.  
* **Schema BreadcrumbList & Organization**: Tự động sinh danh mục phân cấp thanh điều hướng (Breadcrumb) theo chuẩn Google Schema để tối ưu cấu trúc website và hiển thị luồng trang trên công cụ tìm kiếm.

## **7.3. Kỹ thuật Xử lý Giỏ hàng AJAX & Tối ưu Trải nghiệm Mua hàng**

* **Debounce & Optimistic UI Update**: Sử dụng kỹ thuật Debounce khi người dùng thay đổi số lượng mặt hàng trong giỏ để giảm số lượng request gọi về server. Cập nhật giao diện tạm thời (Optimistic UI) giúp thao tác mượt mà và phản hồi tức thì.  
* **Đồng bộ hóa Trạng thái Giỏ hàng (State Management)**: Sử dụng Custom Event (ví dụ: `cart:updated`) để phát tín hiệu đồng bộ giữa Header Cart Count, Cart Drawer/Mini Cart và trang Cart Page mà không cần gọi lại trang.

## **7.4. Kỹ thuật Lập trình Phòng thủ (Defensive Coding) Nâng cao trong Liquid**

* **Kiểm tra Mảng & Đối tượng Nâng cao**: Luôn kiểm tra tồn tại và số lượng phần tử mảng trước khi thực thi vòng lặp: `{% if collection.products.size > 0 %}` để tránh sinh ra khối HTML rỗng.  
* **Xử lý Giá trị Mặc định (Fallback Values)**: Sử dụng bộ lọc `default` cho các biến giao diện hoặc cài đặt cấu hình: `{{ settings.home_title | default: store.name }}` nhằm đảm bảo website không bị khuyết nội dung khi người dùng chưa cấu hình.

*Tài liệu được biên soạn đồng bộ theo các tiêu chuẩn kỹ thuật mới nhất của nền tảng Sapo Web và quy chế quản lý đối tác Sapo.*

# **PHẦN 9: DANH MỤC TÀI LIỆU THAM KHẢO & QUY CHUẨN ĐẶC TẢ CHI TIẾT**

Dưới đây là danh mục tổng hợp toàn bộ các tài liệu hướng dẫn chính thức từ Sapo và bảng tra cứu quy chuẩn kỹ thuật đặc tả chi tiết (trích xuất từ các bảng dữ liệu nội bộ) nhằm đảm bảo tính minh bạch và đầy đủ khi phát triển Theme Sapo Web:

### **1\. Nhóm Tài liệu Hướng dẫn Chính thức từ Sapo (Support Sapo)**

* [Checklist chung](https://support.sapo.vn/checklist-chung): Bảng tiêu chí và checklist kiểm tra toàn diện quy định rõ 5 nhóm tiêu chuẩn kiểm duyệt theme: Cấu trúc thư mục/thẻ bắt buộc, Responsive & Đa thiết bị (320px \- 1920px), Tối ưu hiệu năng & mã nguồn (PageSpeed, nén tài nguyên, lazy-loading, không console error), Chức năng luồng TMĐT (Variant Selector, Giỏ hàng AJAX, Form validation) và Tiêu chuẩn SEO Onpage & Dữ liệu mẫu bàn giao.  
* [Giới thiệu Liquid](https://support.sapo.vn/gioi-thieu-liquid): Tài liệu nền tảng về ngôn ngữ template Liquid trên Sapo Web, 3 thành phần cốt lõi Tag, Object và Filter.  
* [Giới thiệu thẻ](https://support.sapo.vn/gioi-thieu-the): Phân loại 4 nhóm thẻ Liquid chính bao gồm Control Flow, Iteration, Variable và Theme Tags.  
* [Hướng dẫn sử dụng chức năng tìm kiếm trên website](https://support.sapo.vn/huong-dan-su-dung-chuc-nang-tim-kiem-tren-website): Chi tiết cú pháp tìm kiếm `/search?q=...`, toán tử AND/OR/NOT, lọc theo type, trường field, sắp xếp sortby và tham số view.  
* [Quy trình bán giao diện trên Sapo](https://support.sapo.vn/quy-trinh-ban-giao-dien-tren-sapo): Quy định 4 bước xét duyệt theme, tiêu chuẩn desktop/mobile, chính sách chia sẻ doanh thu 70/30, quy chế bảo hành và quy định ẩn/hạ theme.  
* [Giới thiệu Bộ lọc \- Filter](https://support.sapo.vn/gioi-thieu-bo-loc-filter): Hướng dẫn sử dụng các bộ lọc mảng, chuỗi, toán học, tiền tệ, URL và HTML trong Liquid.  
* [Tài liệu kỹ thuật theme.bwt](https://support.sapo.vn/theme-bwt): Quy định bắt buộc về `content_for_header`, `ContentPlaceHolder`, menu chính, menu footer và thanh tìm kiếm.  
* [Giới thiệu về Template Liquid](https://support.sapo.vn/gioi-thieu-ve-template-liquid): Cấu trúc thư mục chuẩn của theme và cơ chế hoạt động của các template con.

### **2\. Chi tiết Quy chuẩn Kỹ thuật & Bảng tra cứu Đặc tả (Google Spreadsheets)**

* [Bảng tổng hợp Liquid Basics & Checklist Review Theme](https://docs.google.com/spreadsheets/d/1tg4Zk_AN6_vq62vEV-_btuHO1nn1sd38kLxBsHUxLy0/edit?gid=1094777359#gid=1094777359): Chi tiết các quy chuẩn cú pháp, thẻ lặp, bộ lọc và checklist kiểm duyệt:  
  * **Cú pháp & Thành phần cốt lõi**: Phân định rõ `{% ... %}` (Tag xử lý logic), `{{ ... }}` (Object xuất dữ liệu), và `{{ ... | filter }}` (Filter biến đổi định dạng). Định danh Alias/Handle dùng chuẩn kebab-case không dấu để truy cập tài nguyên.  
  * **Thẻ Điều khiển & Vòng lặp**: Hỗ trợ rẽ nhánh `if/elsif/else`, `unless`, `case/when`. Khối lặp `for` hỗ trợ tham số `limit`, `offset`, `reversed` và biến ngữ cảnh `forloop` (index, index0, first, last, length). Dùng `cycle` để luân phiên chuỗi giá trị trong vòng lặp.  
  * **Thẻ Biến & Giao diện**: Dùng `assign` khởi tạo biến, `capture` gom khối HTML phức tạp, `increment/decrement` đếm số độc lập. Các thẻ giao diện gồm `include` (nhúng snippet), `form` (tạo form chuẩn CSRF), `paginate` (phân trang tối đa 50 item), `layout`, và `raw` (thoát phân tích ngoặc nhọn).  
  * **Hệ thống Bộ lọc (Filters)**: **Array** (join, first, last, index, map, size, sort); **HTML** (img\_tag, script\_tag, stylesheet\_tag); **Math** (ceil, floor, round, plus, minus, times, divided\_by, modulo); **Money** (money, money\_with\_currency, money\_without\_currency); **String** (append, prepend, downcase, upcase, capitalize, handle/handleize, truncate, truncatewords, strip\_html, replace, split); **URL** (asset\_url, file\_url, img\_url với các size 'thumb', 'small', 'medium', 'large', 'grande', '1024x1024', link\_to).  
  * **Quy trình & Checklist Review**: Đảm bảo quy trình 6 bước (Đăng ký partner \-\> Phát triển \-\> Internal QA \-\> Nộp zip \-\> Sapo Review \-\> Xuất bản). Đáp ứng 5 trụ cột checklist: Cấu trúc sạch, Responsive không vỡ layout, Hiệu năng (PageSpeed 75+, không console error), Chuẩn hóa form/luồng giỏ hàng AJAX, và Chuẩn SEO Onpage.  
* [Bảng quy chuẩn Theme.bwt, Settings Schema & Templates](https://docs.google.com/spreadsheets/d/1lrmV3eRw17dRyu2tUdel59LIucGKl5kc52Lll0bKabk/edit?gid=1942960720#gid=1942960720): Quy chuẩn chi tiết cho layout master, trường cấu hình và template đặc thù:  
  * **Quy định theme.bwt**: Bắt buộc phải có `{{ content_for_header }}` trước thẻ closing `</head>` và khối `{% block "ContentPlaceHolder" %}{% endblock %}` (hoặc `{{ content_for_layout }}`) trong thẻ `<body>`. Cung cấp đủ Logo/Store Name (link về /), Main Menu (`linklists['main-menu']`), Footer Menu (`linklists['footer']`), và thanh tìm kiếm.  
  * **Danh mục 15 Input Types trong settings\_schema.json**: `color` (mã hex), `font`, `text`, `textarea`, `image`, `checkbox`, `radio`, `select`, `collection`, `blog`, `page`, `link_list`, `snippet`, cùng các phần tử UI như `header` và `paragraph`. File assets dùng biến settings bắt buộc có đuôi `.scss.bwt` hoặc `.js.bwt`.  
  * **Lập trình phòng thủ (Defensive Coding)**: Áp dụng kiểm tra ngoại lệ bắt buộc khi truy xuất cấu hình: `{% unless settings.key == blank %}`, kiểm tra collection rỗng: `{% unless settings.col == blank or collections[settings.col].empty? %}`, và trang tĩnh rỗng: `{% unless settings.page == blank or pages[settings.page].empty? %}`.  
* [Bảng danh mục 38 Đối tượng Liquid Sapo Web](https://docs.google.com/spreadsheets/d/1tbTrTEbObUHVc592F6iNE7QJSaiLmuzJ5xiKVPAdiE8/edit?gid=1908080685#gid=1908080685): Danh mục tra cứu tra chi tiết toàn bộ 38 đối tượng Liquid phân theo phạm vi sử dụng:  
  * **Nhóm Đối tượng Toàn cục (Global Objects \- 18 đối tượng)**: `all_products`, `blogs`, `cart`, `collections`, `content_for_header`, `content_for_layout`, `current_page`, `current_tags`, `customer`, `linklists`, `pages`, `page_description`, `page_title`, `settings`, `store`, `template`.  
  * **Nhóm Đối tượng Ngữ cảnh / Template (Context Objects \- 15 đối tượng)**: `address`, `article`, `blog`, `collection`, `comment`, `customer_address`, `line_item`, `link`, `linklist`, `order`, `page`, `product`, `request`, `search`, `shipping_method`, `transaction`, `variant`.  
* **Nhóm Đối tượng Hỗ trợ (Helper Objects \- 5 đối tượng)**: `country_option_tags`, `forloop`, `form`, `paginate`, `part`.