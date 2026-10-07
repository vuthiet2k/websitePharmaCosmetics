# -*- coding: utf-8 -*-
"""Xuất mẫu Google Sheet tuỳ chỉnh theme từ configs/settings_schema.json + settings_data.json.

Chạy:  python scripts/export-config-sheet.py [đường_dẫn_ra.xlsx]
Mặc định ra: exports/cau-hinh-theme.xlsx -> tải lên Google Drive, mở bằng Google Sheets.

Lý do (2026-10-07): khách cần 1 bảng duy nhất để xem/đề xuất đổi giá trị và cấu trúc cấu hình;
sheet sinh tự động từ schema nên luôn khớp code — schema đổi thì chạy lại script, không sửa tay.
Cột ID là khoá để agent áp thay đổi ngược vào configs/ — tuyệt đối không sửa cột này trên sheet.
"""
import json, os, re, sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK = '--check' in sys.argv
ARGS = [a for a in sys.argv[1:] if a != '--check']
OUT = ARGS[0] if ARGS else os.path.join(ROOT, 'exports', 'cau-hinh-theme.xlsx')
SCAN_DIRS = ['templates', 'snippets', 'layouts', 'assets']

schema = json.load(open(os.path.join(ROOT, 'configs/settings_schema.json'), encoding='utf-8'))
current = json.load(open(os.path.join(ROOT, 'configs/settings_data.json'), encoding='utf-8')).get('current', {})

TYPE_VI = {
    'text': 'Chữ 1 dòng', 'textarea': 'Chữ nhiều dòng', 'checkbox': 'Bật/Tắt', 'select': 'Chọn 1 phương án',
    'color': 'Màu (#HEX)', 'image': 'Ảnh (tải lên)', 'link_list': 'Menu (chọn menu)',
    'collection': 'Danh mục SP (chọn)', 'blog': 'Blog (chọn)', 'page': 'Trang nội dung (chọn)',
}
ACTIONS = ['Giữ nguyên', 'Đổi giá trị', 'Đổi nhãn/hướng dẫn', 'Ẩn trường', 'Xoá trường', 'Di chuyển sang mục khác', 'Khác (ghi chú)']
STATUS = ['Chưa xử lý', 'Đang xử lý', 'Đã áp dụng', 'Cần trao đổi']

# --- Tìm file đang dùng mỗi trường (để agent biết sửa ở đâu) ---
texts = {}
# Bỏ comment Liquid/HTML/CSS: trường chỉ được nhắc trong comment KHÔNG tính là đang dùng
COMMENT = re.compile(r'\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}|<!--.*?-->|/\*.*?\*/', re.S)
for d in SCAN_DIRS:
    for base, _, files in os.walk(os.path.join(ROOT, d)):
        for f in files:
            if f.endswith(('.bwt', '.liquid', '.js', '.scss', '.css')) and not f.endswith('.min.js'):
                p = os.path.join(base, f)
                try:
                    texts[os.path.relpath(p, ROOT).replace('\\', '/')] = COMMENT.sub('', open(p, encoding='utf-8').read())
                except (UnicodeDecodeError, OSError):
                    pass

# Lập chỉ mục token 1 lần (quét regex cho từng trường quá chậm với ~1.400 trường)
# Token không được kết thúc bằng "-": `settings.footer_qr_enable-%}` phải ra footer_qr_enable
# (2026-10-07: lỗi này từng làm trường đang dùng bị ghi "không tìm thấy" và bị đánh dấu xoá).
TOKEN = re.compile(r'[A-Za-z0-9_](?:[A-Za-z0-9_-]*[A-Za-z0-9_])?(?:\.(?:png|jpe?g|gif|svg|webp|ico))?', re.I)
where = {}
for p, t in texts.items():
    for tok in set(TOKEN.findall(t)):
        where.setdefault(tok, []).append(p)

def used_in(fid):
    hits, note = sorted(where.get(fid, [])), ''
    if not hits:
        # Trường đánh số thường được ghép tên động: 'promo_coupon_' | append: i | append: '_code'
        m = re.match(r'(.*?[_-])\d+', fid)
        if m and where.get(m.group(1)):
            hits, note = sorted(where[m.group(1)]), f"(ghép động từ '{m.group(1)}')\n"
    if not hits:
        return '(không tìm thấy trong code)'
    return note + '\n'.join(hits[:6]) + (f'\n… +{len(hits) - 6} file' if len(hits) > 6 else '')

def fmt(v):
    if v is None: return ''
    if isinstance(v, bool): return 'Bật' if v else 'Tắt'
    if isinstance(v, (dict, list)): return json.dumps(v, ensure_ascii=False)
    return str(v)

def sheet_title(i, name):
    t = re.sub(r'[\[\]\*\?/\\:]', '-', f'{i:02d} {name}')
    return t if len(t) <= 31 else t[:30].rstrip() + '…'

# --- Style ---
GREEN = '1F6F54'
F_HEAD = Font(bold=True, color='FFFFFF'); P_HEAD = PatternFill('solid', fgColor=GREEN)
P_GROUP = PatternFill('solid', fgColor='DDEFE6'); P_NOTE = PatternFill('solid', fgColor='F4F4F4')
P_EDIT = PatternFill('solid', fgColor='FFF7D6')
THIN = Side(style='thin', color='D0D0D0'); BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical='top')

def header_row(ws, cols, widths):
    ws.append(cols)
    for c, w in zip(ws[ws.max_row], widths):
        c.font, c.fill, c.alignment, c.border = F_HEAD, P_HEAD, Alignment(wrap_text=True, vertical='center'), BORDER
        ws.column_dimensions[c.column_letter].width = w
    ws.row_dimensions[ws.max_row].height = 32
    ws.freeze_panes = ws.cell(row=ws.max_row + 1, column=4)

# --check: mọi trường cấu hình phải được code thật đọc (2026-10-07: tránh lặp lại lỗi logo — trường có
# trong Admin nhưng theme vẽ cứng nên đổi cấu hình không có tác dụng). Chạy qua `npm run lint:config`.
if CHECK:
    unused = [(sec['name'], f['id']) for sec in schema for f in sec.get('settings', [])
              if f.get('id') and used_in(f['id']) == '(không tìm thấy trong code)']
    for name, fid in unused:
        print(f'  x {fid}  ({name})')
    print(f'lint:config: {len(unused)} trường cấu hình không được code đọc' if unused
          else 'lint:config: OK, mọi trường cấu hình đều được code đọc')
    sys.exit(1 if unused else 0)

wb = Workbook()

# ===== Sheet Hướng dẫn =====
g = wb.active; g.title = 'Hướng dẫn'
g.column_dimensions['A'].width = 30; g.column_dimensions['B'].width = 100
def gl(a='', b='', bold=False, fill=None):
    g.append([a, b])
    for c in g[g.max_row]:
        c.alignment = WRAP
        if bold: c.font = Font(bold=True, size=12 if not b else 11)
        if fill: c.fill = fill
gl('MẪU TUỲ CHỈNH CẤU HÌNH THEME — PHARMA COSMETICS', bold=True)
g['A1'].font = Font(bold=True, size=15, color=GREEN)
gl('Nguồn dữ liệu', 'Sinh tự động từ configs/settings_schema.json (cấu trúc) + configs/settings_data.json (giá trị đang lưu). '
   'Mỗi mục trong Admin Sapo (Giao diện › Tuỳ chỉnh) = 1 sheet đánh số 01, 02…')
gl()
gl('1. CÁCH DÙNG NHANH', bold=True, fill=P_GROUP)
for a, b in [
    ('Bước 1', 'Mở sheet "00 Mục lục" để tìm mục cần sửa (bấm link tên sheet để nhảy tới).'),
    ('Bước 2', 'Trong sheet của mục, tìm dòng theo cột "Nhóm" (= tiêu đề nhóm trong Admin, vd "Logo") và "Tên trường".'),
    ('Bước 3', 'Chỉ điền vào các cột NỀN VÀNG: "Hành động", "Giá trị mới / Đề xuất", "Ghi chú yêu cầu", "Trạng thái".'),
    ('Bước 4', 'Muốn thêm trường/nhóm/mục MỚI chưa có → ghi vào sheet "Đề xuất trường mới".'),
    ('Bước 5', 'Xong thì: File › Tải xuống › Microsoft Excel (.xlsx), gửi file (hoặc link sheet đã chia sẻ) cho dev/AI. '
               'AI đọc cột ID + Hành động để sửa đúng chỗ trong code và cập nhật lại cột Trạng thái.'),
]: gl(a, b)
gl()
gl('2. Ý NGHĨA CÁC CỘT', bold=True, fill=P_GROUP)
for a, b in [
    ('STT', 'Số thứ tự trong mục — đúng thứ tự hiển thị trong Admin Sapo.'),
    ('Nhóm', 'Tiêu đề nhóm (header) trong Admin, vd "Logo", "Banner top". Dòng nền xanh nhạt = tiêu đề nhóm; dòng nền xám = đoạn giải thích (paragraph) trong Admin.'),
    ('Tên trường', 'Nhãn hiển thị trong Admin Sapo.'),
    ('ID (không sửa)', 'Khoá kỹ thuật settings.<ID> trong code. KHÔNG được sửa — đây là cách AI/dev tìm đúng trường. Với ảnh, ID chính là tên file ảnh (vd logo.png).'),
    ('Kiểu', 'Loại ô nhập: Chữ 1 dòng, Chữ nhiều dòng, Bật/Tắt, Chọn 1 phương án, Màu, Ảnh, Menu, Danh mục, Blog, Trang.'),
    ('Yêu cầu / Hướng dẫn', 'Lấy từ dòng hướng dẫn trong Admin: kích thước ảnh đề nghị, định dạng (.PNG/.JPG), giới hạn ký tự…'),
    ('Phương án (select)', 'Với kiểu "Chọn 1 phương án": danh sách giá trị = nhãn cho phép.'),
    ('Mặc định', 'Giá trị khi chưa ai cấu hình (khai báo trong schema).'),
    ('Đang dùng', 'Giá trị đang lưu trong settings_data.json. Trống = đang dùng giá trị mặc định.'),
    ('Dùng ở file', 'File giao diện đang đọc trường này (templates/snippets/layouts/assets). "(chưa thấy dùng)" = trường có thể thừa — cân nhắc trước khi sửa.'),
    ('Hành động ★', 'Chọn từ danh sách: ' + ' · '.join(ACTIONS) + '.'),
    ('Giá trị mới / Đề xuất ★', 'Giá trị muốn đổi. Ảnh: dán link Drive/ảnh và ghi kích thước. Màu: mã #HEX. Bật/Tắt: ghi Bật hoặc Tắt. Select: ghi đúng 1 giá trị trong cột Phương án.'),
    ('Ghi chú yêu cầu ★', 'Mô tả thêm: lý do, nhãn mới muốn đổi, mục muốn chuyển sang, ảnh minh hoạ…'),
    ('Trạng thái ★', ' · '.join(STATUS) + '. Dev/AI cập nhật sau khi áp dụng.'),
]: gl(a, b)
gl()
gl('3. QUY TẮC KHI ĐỀ XUẤT', bold=True, fill=P_GROUP)
for a, b in [
    ('Ảnh', 'Luôn ghi đúng kích thước & định dạng ở cột Yêu cầu (vd Logo 313x77px .PNG). Ảnh sai tỉ lệ sẽ bị méo/mờ.'),
    ('Chữ', 'Thuật ngữ "Chuyên gia", không dùng "Bác sĩ". Không bịa số liệu (đánh giá, % đã bán, thống kê).'),
    ('Ô để trống', 'Nếu muốn ẩn nội dung, chọn Hành động "Đổi giá trị" và ghi "(để trống)" ở Giá trị mới — đừng xoá dòng.'),
    ('Không xoá dòng/cột', 'Không xoá, chèn cột hay đổi tên sheet — chỉ điền vào cột vàng. Muốn bỏ trường thì chọn "Ẩn trường"/"Xoá trường".'),
    ('Thay đổi cấu trúc', 'Đổi nhãn, di chuyển, thêm/xoá trường là thay đổi CẤU TRÚC → dev sẽ xác nhận lại trước khi làm.'),
    ('Cập nhật mẫu', 'Khi code đổi cấu trúc, dev chạy lại: python scripts/export-config-sheet.py → ra file mới, các cột ★ cũ cần chép sang theo ID.'),
]: gl(a, b)
gl()
gl('4. CẤU HÌNH NẰM Ở ĐÂU TRONG ADMIN SAPO', bold=True, fill=P_GROUP)
gl('Đường dẫn', 'Admin Sapo › Website › Giao diện › Tuỳ chỉnh giao diện › chọn mục (tên trùng tên sheet, bỏ số đầu) › nhóm (cột Nhóm) › trường (cột Tên trường).')
gl('Menu', 'Trường kiểu "Menu" chọn menu tạo ở Website › Menu. Nội dung menu sửa ở đó, không ở Tuỳ chỉnh.')
gl('Danh mục / Blog / Trang', 'Chọn đối tượng tạo sẵn ở Sản phẩm › Danh mục, Website › Bài viết, Website › Trang nội dung.')

# ===== Sheet Mục lục =====
idx = wb.create_sheet('00 Mục lục')
header_row(idx, ['STT', 'Mục trong Admin', 'Sheet', 'Số trường', 'Nhóm con (header)', 'Chức năng / Hiển thị ở đâu'], [6, 34, 30, 10, 70, 50])
idx.freeze_panes = 'A2'

COLS = ['STT', 'Nhóm', 'Tên trường', 'ID (không sửa)', 'Kiểu', 'Yêu cầu / Hướng dẫn', 'Phương án (select)',
        'Mặc định', 'Đang dùng', 'Dùng ở file', 'Hành động ★', 'Giá trị mới / Đề xuất ★', 'Ghi chú yêu cầu ★', 'Trạng thái ★']
WIDTHS = [6, 24, 30, 28, 14, 40, 26, 30, 30, 34, 18, 36, 34, 14]
EDIT_COLS = range(11, 15)

for i, sec in enumerate(schema, 1):
    ws = wb.create_sheet(sheet_title(i, sec['name']))
    ws.append([sec['name']]); ws['A1'].font = Font(bold=True, size=14, color=GREEN)
    ws.append(['← Mục lục']); ws['A2'].hyperlink = "#'00 Mục lục'!A1"; ws['A2'].font = Font(color='0563C1', underline='single')
    header_row(ws, COLS, WIDTHS)
    ws.auto_filter.ref = f'A3:{get_column_letter(len(COLS))}3'
    dv_a = DataValidation(type='list', formula1='"' + ','.join(ACTIONS) + '"', allow_blank=True)
    dv_s = DataValidation(type='list', formula1='"' + ','.join(STATUS) + '"', allow_blank=True)
    ws.add_data_validation(dv_a); ws.add_data_validation(dv_s)
    group, n, groups, first_para = '', 0, [], ''
    for f in sec.get('settings', []):
        t = f.get('type')
        if t == 'header':
            group = f.get('content', ''); groups.append(group)
            ws.append(['', group]); fill = P_GROUP
            for c in ws[ws.max_row]: c.fill, c.font, c.border = P_GROUP, Font(bold=True), BORDER
            continue
        if t == 'paragraph':
            first_para = first_para or f.get('content', '')
            ws.append(['', group, '', '', 'Ghi chú Admin', f.get('content', '')])
            for c in ws[ws.max_row]: c.fill, c.alignment, c.border = P_NOTE, WRAP, BORDER
            ws[ws.max_row][5].font = Font(italic=True, color='555555')
            continue
        n += 1; fid = f.get('id', '')
        opts = '\n'.join(f"{o.get('value')} = {o.get('label')}" for o in f.get('options', []))
        ws.append([n, group, f.get('label', ''), fid, TYPE_VI.get(t, t), f.get('info', ''), opts,
                   fmt(f.get('default')), fmt(current.get(fid)) if fid in current else '', used_in(fid),
                   'Giữ nguyên', '', '', 'Chưa xử lý'])
        r = ws.max_row
        for c in ws[r]: c.alignment, c.border = WRAP, BORDER
        ws.cell(r, 4).font = Font(name='Consolas', size=9, color='7A1F1F')
        ws.cell(r, 10).font = Font(name='Consolas', size=8, color='555555')
        for col in EDIT_COLS: ws.cell(r, col).fill = P_EDIT
        dv_a.add(ws.cell(r, 11)); dv_s.add(ws.cell(r, 14))
    idx.append([i, sec['name'], ws.title, n, ' · '.join(dict.fromkeys(groups)), first_para])
    r = idx.max_row
    idx.cell(r, 3).hyperlink = f"#'{ws.title}'!A1"; idx.cell(r, 3).font = Font(color='0563C1', underline='single')
    for c in idx[r]: c.alignment, c.border = WRAP, BORDER

# ===== Sheet Đề xuất trường mới =====
nw = wb.create_sheet('Đề xuất trường mới')
header_row(nw, ['STT', 'Mục (sheet)', 'Nhóm (có sẵn hoặc mới)', 'Tên trường muốn thêm', 'Kiểu', 'Yêu cầu (kích thước ảnh, định dạng, giới hạn chữ…)',
                'Giá trị ban đầu', 'Hiển thị ở đâu trên web (mô tả/ảnh chụp)', 'Ghi chú', 'ID dev đặt (dev điền)', 'Trạng thái ★'],
           [6, 26, 24, 30, 18, 40, 30, 40, 30, 24, 14])
nw.freeze_panes = 'A2'
dv_t = DataValidation(type='list', formula1='"' + ','.join(TYPE_VI.values()) + '"', allow_blank=True)
dv_m = DataValidation(type='list', formula1=f"='00 Mục lục'!$C$2:$C${len(schema) + 1}", allow_blank=True)
dv_s = DataValidation(type='list', formula1='"' + ','.join(STATUS) + '"', allow_blank=True)
for dv in (dv_t, dv_m, dv_s): nw.add_data_validation(dv)
nw.append([1, sheet_title(3, schema[2]['name']) if len(schema) > 2 else '', 'Logo', '(Ví dụ) Logo phiên bản nền tối', 'Ảnh (tải lên)',
           'Kích thước đề nghị 313x77 pixels. Đuôi .PNG nền trong suốt', '', 'Header khi cuộn trang (nền tối)', 'Dòng ví dụ — xoá khi dùng', '', 'Chưa xử lý'])
for r in range(2, 52):
    if r > 2: nw.append([r - 1])
    for c in nw[r]: c.alignment, c.border = WRAP, BORDER
    dv_m.add(nw.cell(r, 2)); dv_t.add(nw.cell(r, 5)); dv_s.add(nw.cell(r, 11))
for c in nw[2]: c.font = Font(italic=True, color='777777')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print(f'OK: {os.path.relpath(OUT, ROOT)} — {len(schema)} mục, {sum(1 for s in schema for f in s["settings"] if f.get("id"))} trường')
