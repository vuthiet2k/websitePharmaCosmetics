'use strict';

/*
 * Bước 3 của build:sapo — dựng thư mục staging sapo-dist/ đúng cấu trúc theme Sapo (REQ-BUILD-01).
 *
 * - GIỮ NGUYÊN tên thư mục configs/ và layouts/ (số nhiều). 2026-10-05: tải gói lên Sapo thật bị báo
 *   thiếu "layouts/theme.bwt, configs/settings_data.json, configs/settings_schema.json" khi đổi sang
 *   config/ + layout/ như cẩm nang cũ ghi ⇒ trình tải lên Sapo Web đòi tên số nhiều. Không tạo thư mục
 *   rỗng sections/ locales/ vì repo không dùng.
 * - Minify .js/.css thuần và .js.bwt KHÔNG chứa Liquid. GIỮ NGUYÊN tên file (không thêm .min) vì
 *   template gọi asset theo tên qua asset_url — đổi tên sẽ vỡ toàn bộ tham chiếu.
 * - .scss.bwt và .js.bwt có Liquid copy nguyên bản: Sapo tự render Liquid/biên dịch SCSS phía server,
 *   minifier không hiểu cú pháp {{ }} / {% %} và SCSS lồng nhau.
 * - Ảnh trong assets/ chỉ copy file đạt chính sách scripts/lib/sapo-asset-policy.js.
 * - 2026-10-06: gói Sapo KHÔNG chứa asset .bwt nào. Đo CDN 3 lần tải lên: theme 1168431, 1168497 rỗng cả 79
 *   asset .bwt; theme 1168577 (đã tách 65 file không Liquid ra file thường) thì 84 file thường đủ, 14 asset .bwt
 *   còn lại VẪN rỗng ⇒ Sapo không biên dịch asset .bwt lúc tải gói lên. Build render sẵn mọi asset .bwt bằng
 *   cấu hình trong configs/ (schema default + settings_data current, đúng giá trị Sapo nhận khi tải gói):
 *     x.js.bwt   → x.js  (cùng URL, template không đổi). JS không được dùng asset_url (không biết URL CDN).
 *     x.scss.bwt → x.css (biên dịch bằng libsass như Sapo; url({{'a.svg' | asset_url}}) → url(a.svg), CSS và
 *                  ảnh cùng thư mục assets/ trên CDN) và đổi tham chiếu 'x.scss.css' → 'x.css' trong gói.
 *   Hệ quả: đổi các cấu hình mà asset đọc (màu chủ đạo, bật/tắt quickview…) trong admin Sapo chỉ có hiệu lực ở
 *   asset sau khi build + tải gói lại — danh sách in ra cuối bước build.
 */

const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');
const CleanCSS = require('clean-css');
const policy = require('./lib/sapo-asset-policy');
const { runLibsass } = require('./lib/libsass');
const { Liquid } = require('liquidjs');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'sapo-dist');

// source (repo) -> target (Sapo)
const DIRECTORY_MAP = [
  ['assets', 'assets'],
  ['configs', 'configs'],
  ['layouts', 'layouts'],
  ['snippets', 'snippets'],
  ['templates', 'templates'],
];

// Đuôi file hợp lệ theo từng thư mục đích.
const ALLOWED_EXTENSIONS = {
  configs: /\.json$/i,
  layouts: /\.bwt$/i,
  snippets: /\.bwt$/i,
  templates: /\.bwt$/i,
};
// Không bao giờ đóng gói: mã nguồn chưa build, source map, file hệ điều hành, file ẩn.
const EXCLUDED_FILE = /(^\.|\.scss$|\.sass$|\.ts$|\.tsx$|\.map$|\.md$|\.bak$|\.orig$|\.log$|^thumbs\.db$|^desktop\.ini$)/i;
const ALREADY_MINIFIED = /[.-](min|prod)\.(js|css)$/i;
const HAS_LIQUID = /\{\{|\{%/;
const LIQUID_COMMENT = /\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g;
// url({{ 'a.svg' | asset_url }}) trong CSS: CSS nằm cùng thư mục assets/ với a.svg ⇒ đường dẫn tương đối là đủ.
const CSS_ASSET_URL = /\{\{-?\s*['"]([\w.\-]+)['"]\s*\|\s*asset_url\s*-?\}\}/g;

if (!outputDir.startsWith(rootDir + path.sep)) {
  throw new Error(`Thư mục output không hợp lệ: ${outputDir}`);
}

// Giá trị settings Sapo dùng ngay sau khi tải gói: default trong schema, ghi đè bởi settings_data.current.
function loadSettings() {
  const schema = JSON.parse(fs.readFileSync(path.join(rootDir, 'configs', 'settings_schema.json'), 'utf8'));
  const data = JSON.parse(fs.readFileSync(path.join(rootDir, 'configs', 'settings_data.json'), 'utf8'));
  const settings = {};
  for (const group of schema) {
    for (const setting of group.settings || []) {
      if (setting.id && 'default' in setting) settings[setting.id] = setting.default;
    }
  }
  return Object.assign(settings, data.current || {});
}

// handle/handleize của Sapo: bỏ dấu tiếng Việt, chữ thường, ký tự khác chữ-số → '-'.
function handleize(value) {
  return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// strictFilters: filter lạ ⇒ build lỗi, không lặng lẽ ra kết quả khác Sapo.
function createAssetEngine(usedSettings) {
  const engine = new Liquid({ strictFilters: true, strictVariables: false });
  engine.registerFilter('handle', handleize);
  engine.registerFilter('handleize', handleize);
  engine.registerFilter('asset_url', function assetUrl(value) {
    if (this.context.environments.__assetKind !== 'css') {
      throw new Error(`asset_url('${value}') trong JS — dùng đường dẫn tính từ document.currentScript (xem index.js.bwt)`);
    }
    return String(value);
  });
  const settings = loadSettings();
  // Ghi lại settings asset đã đọc ⇒ in danh sách cấu hình cần build lại khi đổi trong admin.
  const tracked = new Proxy(settings, {
    get(target, key) { if (typeof key === 'string' && key in target) usedSettings.add(key); return target[key]; },
  });
  return (source, kind) => engine.parseAndRender(source, { settings: tracked, __assetKind: kind });
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

async function minifyAsset(fileName, source) {
  if (ALREADY_MINIFIED.test(fileName)) return null;
  const isJs = /\.js$/i.test(fileName) || (/\.js\.bwt$/i.test(fileName) && !HAS_LIQUID.test(source));
  const isCss = /\.css$/i.test(fileName);
  if (isJs) {
    const result = await terserMinify(source, { compress: true, mangle: true, format: { comments: false } });
    return result.code;
  }
  if (isCss) {
    const result = new CleanCSS({ level: 1 }).minify(source);
    if (result.errors.length) throw new Error(result.errors.join('; '));
    // 2026-10-05: clean-css gặp ký tự rác ("$C" trong site-topbar.css) chỉ báo warning rồi LẶNG LẼ bỏ các
    // khối CSS phía sau ⇒ gói Sapo mất CSS mà build vẫn PASS. Coi mọi warning là lỗi.
    if (result.warnings.length) {
      const error = new Error(`${fileName}: CSS không hợp lệ — ${result.warnings.slice(0, 3).join('; ')}`);
      error.fatal = true;
      throw error;
    }
    return result.styles;
  }
  return null;
}

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const schemaIds = policy.loadSchemaImageFileIds(path.join(rootDir, 'configs', 'settings_schema.json'));
  const stats = { copied: 0, minified: 0, skipped: [], bytesIn: 0, bytesOut: 0 };
  const fatalErrors = [];
  const precompile = {}; // đường dẫn .css đích -> SCSS (đã render Liquid) chờ biên dịch libsass
  const renamedCss = new Map(); // 'x.scss.css' -> 'x.css'
  const usedSettings = new Set();
  const renderAsset = createAssetEngine(usedSettings);
  stats.plain = 0;
  stats.rendered = [];

  for (const [sourceName, targetName] of DIRECTORY_MAP) {
    const sourceDir = path.join(rootDir, sourceName);
    if (!fs.existsSync(sourceDir)) throw new Error(`Thiếu thư mục theme bắt buộc: ${sourceName}/`);

    for (const sourceFile of walk(sourceDir)) {
      const relative = path.relative(sourceDir, sourceFile);
      const fileName = path.basename(sourceFile);
      const label = `${sourceName}/${relative.split(path.sep).join('/')}`;

      if (EXCLUDED_FILE.test(fileName)) { stats.skipped.push(`${label} (loại trừ)`); continue; }
      if (ALLOWED_EXTENSIONS[targetName] && !ALLOWED_EXTENSIONS[targetName].test(fileName)) {
        stats.skipped.push(`${label} (sai đuôi cho ${targetName}/)`);
        continue;
      }
      const size = fs.statSync(sourceFile).size;
      if (targetName === 'assets' && policy.isImageFile(fileName)
        && !policy.classifyAssetImage(fileName, size, schemaIds).allowed) {
        stats.skipped.push(`${label} (ảnh ngoài chính sách)`);
        continue;
      }

      const targetFile = path.join(outputDir, targetName, relative);
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      stats.bytesIn += size;

      // Asset .bwt ⇒ render sẵn thành file thường (xem đầu file).
      if (targetName === 'assets' && /\.bwt$/i.test(fileName) && !/\.(js|scss)\.bwt$/i.test(fileName)) {
        fatalErrors.push(`${label}: asset .bwt loại lạ — Sapo không biên dịch asset .bwt khi tải gói, build chỉ render .js.bwt/.scss.bwt`);
        continue;
      }
      if (targetName === 'assets' && /\.(js|scss)\.bwt$/i.test(fileName)) {
        const isScss = /\.scss\.bwt$/i.test(fileName);
        let plain = fs.readFileSync(sourceFile, 'utf8').replace(LIQUID_COMMENT, '');
        if (isScss) plain = plain.replace(CSS_ASSET_URL, '$1');
        if (HAS_LIQUID.test(plain)) {
          try {
            plain = await renderAsset(plain, isScss ? 'css' : 'js');
            stats.rendered.push(fileName);
          } catch (error) {
            fatalErrors.push(`${label}: Liquid — ${error.message.split('\n')[0]}`);
            continue;
          }
        }
        {
          const plainName = fileName.replace(/\.scss\.bwt$/i, '.css').replace(/\.js\.bwt$/i, '.js');
          if (fs.existsSync(path.join(sourceDir, path.dirname(relative), plainName))) {
            fatalErrors.push(`${label}: trùng tên với assets/${plainName} có sẵn`);
            continue;
          }
          stats.copied += 1;
          if (/\.scss\.bwt$/i.test(fileName)) {
            precompile[path.join(path.dirname(targetFile), plainName)] = plain;
            renamedCss.set(fileName.replace(/\.bwt$/i, '.css'), plainName);
            continue;
          }
          let code;
          try {
            code = (await terserMinify(plain, { compress: true, mangle: true, format: { comments: false } })).code;
          } catch (error) {
            fatalErrors.push(`${label}: JS sau khi render không hợp lệ — ${error.message}`);
            continue;
          }
          fs.writeFileSync(path.join(path.dirname(targetFile), plainName), code);
          stats.minified += 1;
          stats.bytesOut += Buffer.byteLength(code);
          stats.plain += 1;
          continue;
        }
      }

      if (targetName !== 'assets' && renamedCss.size) {
        let text = fs.readFileSync(sourceFile, 'utf8');
        let changed = false;
        text = text.replace(/(['"])([\w.\-]+\.scss\.css)\1/g, (match, quote, name) => {
          if (!renamedCss.has(name)) return match;
          changed = true;
          return `${quote}${renamedCss.get(name)}${quote}`;
        });
        if (changed) {
          fs.writeFileSync(targetFile, text);
          stats.bytesOut += Buffer.byteLength(text);
          stats.copied += 1;
          continue;
        }
      }

      let output = null;
      if (targetName === 'assets') {
        const source = fs.readFileSync(sourceFile, 'utf8');
        try {
          output = await minifyAsset(fileName, source);
        } catch (error) {
          if (error.fatal) { fatalErrors.push(error.message); continue; }
          console.warn(`  ! Không minify được ${label}, copy nguyên bản: ${error.message}`);
        }
        if (output !== null && Buffer.byteLength(output) >= size) output = null;
      }

      if (output !== null) {
        fs.writeFileSync(targetFile, output);
        stats.minified += 1;
        stats.bytesOut += Buffer.byteLength(output);
      } else {
        fs.copyFileSync(sourceFile, targetFile);
        stats.bytesOut += size;
      }
      stats.copied += 1;
    }

    // Biên dịch sẵn SCSS ngay sau assets/ — trước khi chép layouts/snippets/templates (cần renamedCss).
    if (targetName === 'assets' && Object.keys(precompile).length) {
      const result = runLibsass(precompile, 'compile');
      for (const [file, message] of Object.entries(result.errors)) fatalErrors.push(`${path.relative(outputDir, file)}: libsass ${message}`);
      for (const [file, css] of Object.entries(result.outputs)) {
        fs.writeFileSync(file, css);
        stats.bytesOut += Buffer.byteLength(css);
        stats.plain += 1;
      }
    }
  }

  const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(2);
  console.log(`[compile:sapo] sapo-dist/: ${stats.copied} file (${stats.minified} file minify), `
    + `${mb(stats.bytesIn)} MB -> ${mb(stats.bytesOut)} MB; ${stats.plain} asset .bwt đóng gói thành .js/.css thường `
    + `(${stats.rendered.length} file render Liquid lúc build), ${renamedCss.size} tham chiếu .scss.css đổi sang .css`);
  for (const skipped of stats.skipped) console.log(`  - bỏ qua ${skipped}`);
  if (usedSettings.size) {
    console.log(`  ⓘ asset đã gắn cứng giá trị của ${usedSettings.size} cấu hình — đổi trong admin Sapo phải build + tải gói lại: `
      + [...usedSettings].sort().join(', '));
  }
  if (fatalErrors.length) throw new Error(`asset lỗi cú pháp, dừng đóng gói:\n  ✗ ${fatalErrors.join('\n  ✗ ')}`);
}

main().catch((error) => {
  console.error(`[compile:sapo] FAIL — ${error.stack || error.message}`);
  process.exit(1);
});
