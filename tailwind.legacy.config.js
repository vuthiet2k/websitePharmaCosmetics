/**
 * tailwind.legacy.config.js — TẠM (UI-STANDARD B.1, B.6 bước 1; việc D06, 24/10/2026).
 * Bản sao NGUYÊN VĂN cấu hình Tailwind CDN cũ (`tailwind.config = {…}` từng nằm inline trong layouts/theme.bwt) để
 * biên dịch sẵn ra assets/pc-legacy-tw.css — thay `<script src="https://cdn.tailwindcss.com">` (nguyên nhân chính L03)
 * mà không đổi giao diện. Class mới KHÔNG viết theo cấu hình này (dùng tailwind.pc.config.js). Xoá file này cùng
 * pc-legacy-tw.css ở đợt 12 khi template hết dùng class cũ.
 * (tailwind.config.js là của MOPS admin — không đụng.)
 */
module.exports = {
  // CDN quét cả DOM lúc chạy ⇒ bản dựng sẵn quét mọi nguồn có thể sinh class: markup .bwt, JS chèn DOM (assets/*.js),
  // HTML trong cấu hình theme và dữ liệu mẫu preview (nội dung bài viết / sản phẩm có class Tailwind).
  content: [
    './layouts/**/*.bwt',
    './templates/**/*.bwt',
    './snippets/**/*.bwt',
    './assets/*.js',
    './assets/*.js.bwt',
    './configs/settings_data.json',
    './data/**/*.{js,json}',
  ],
  // Class ghép động trong Liquid (CDN thấy lúc chạy, quét tĩnh không thấy): templates/page.about-us.bwt
  // `bg-{{ pillar_colors[idx0] }}-100 text-{{ pillar_colors[idx0] }}-700` với pillar_colors = emerald,teal,cyan.
  safelist: ['emerald', 'teal', 'cyan'].flatMap((c) => [`bg-${c}-100`, `text-${c}-700`]),
  // CONTAINER-SSOT 2026-10-02: tắt .container của Tailwind (640/768/1024/1280/1536) — khung trang
  // chỉ do storefront-v3.css quản lý (.clinerules 2.1), tránh chen max-width 1024px ở 1024–1199px.
  corePlugins: { preflight: false, container: false },
  theme: {
    extend: {
      colors: {
        forest: { 800: '#166B55', 900: '#0F2318' },
        clinical: { 600: '#3CB371', 700: '#267348' },
        mint: { 50: '#E8F8EE', 100: '#D7F3E3' },
        brandGold: '#B8860B',
        brandOrange: '#D79A7D',
        flashRed: '#DC2626',
        luxurySand: '#F6E3D8',
        'brand-primary': 'var(--color-brand-primary)',
        'brand-green': 'var(--color-brand-green)',
        'brand-dark': 'var(--color-brand-dark)',
        'brand-deep': 'var(--color-brand-deep)',
        'mint-light': 'var(--color-mint-light)',
        'mint-subtle': 'var(--color-mint-subtle)',
        'badge-green': 'var(--color-badge-green-bg)',
        'gold-sand': 'var(--color-gold-sand)',
        'gold-dark': 'var(--color-gold-dark)',
        peach: 'var(--color-peach)',
        'peach-light': 'var(--color-peach-light)',
        'text-main': 'var(--color-text-main)',
        'text-body': 'var(--color-text-body)',
        'text-muted': 'var(--color-text-muted)',
        'border-clinical': 'var(--color-border-clinical)',
        'bg-page': 'var(--color-bg-page)',
        'semantic-success': 'var(--color-semantic-success)',
      },
      fontFamily: {
        heading: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      // 2026-10-16 (.clinerules/03 UI-2.2): cỡ chữ theo thang token --fs-* (snippets/design_tokens.bwt) — rule cứng UI-2.9.
      fontSize: {
        xs: ['var(--fs-xs)', '1.35'], sm: ['var(--fs-sm)', '1.5'], base: ['var(--fs-base)', '1.6'], lg: ['var(--fs-lg)', '1.5'],
        xl: ['var(--fs-h4)', '1.4'], '2xl': ['var(--fs-xl)', '1.3'], '3xl': ['var(--fs-2xl)', '1.25'], '4xl': ['var(--fs-display)', '1.2'],
        '5xl': ['var(--fs-hero)', '1.1'], '6xl': ['var(--fs-hero)', '1.1'],
      },
    },
  },
};
