/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './layouts/mops-admin.bwt',
    './templates/page.mops-admin.bwt',
    './snippets/mops_admin_*.bwt',
    './scripts/mops-tailwind.input.css'
  ],
  // Safelist z-index scale — dropdown v-if nội bộ Vue có thể xuất hiện sau initial
  // scan trong 1 số flow, giữ sẵn để không phải rebuild mỗi lần đổi z (2026-08-12).
  safelist: [
    'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50'
  ],
  theme: {
    extend: {
      colors: {
        // REOPEN 2026-09-10 (ADR-007/T-70): palette xlsx mới
        // ("Pharma Cosmetics-20260910T092731Z-1-001/Pharma Cosmetics/*.xlsx") thay thế palette
        // T-10 (Pharma_Cosmetics_Figma_Project/ — không còn tồn tại). GIỮ NGUYÊN tên token
        // Tailwind cũ (forest/clinical/mint/brandGold/brandOrange/luxurySand) để ~35
        // template/snippet đang dùng utility class cũ không cần sửa — CHỈ đổi giá trị hex.
        // Mapping: clinical-600→brand-primary, clinical-700→brand-green, forest-800→brand-dark,
        // forest-900→brand-deep, mint-50/100→mint-subtle/mint-light, brandGold→gold-dark,
        // brandOrange→peach, luxurySand→peach-light. flashRed GIỮ NGUYÊN (màu lỗi/flash-sale,
        // không có tương đương trong design system xlsx). Dùng cho layouts/theme.bwt qua
        // Tailwind CDN config nhúng riêng (không dùng chung content-scan build ở file này, vốn
        // chỉ quét mops-admin). Xem DECISIONS.md#ADR-007.
        forest: { 800: '#166B55', 900: '#0F2318' },
        clinical: { 600: '#3CB371', 700: '#267348' },
        mint: { 50: '#E8F8EE', 100: '#D7F3E3' },
        brandGold: '#B8860B',
        brandOrange: '#D79A7D',
        flashRed: '#DC2626',
        luxurySand: '#F6E3D8',
        // Token mới (tên theo đúng xlsx --color-brand-*, dùng cho markup mới M7+). T-71: trỏ
        // qua CSS custom property (định nghĩa + dark override trong snippets/pharma_ui_kit.bwt)
        // để tự động đổi màu theo prefers-color-scheme/data-theme — không dùng literal hex.
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
        'on-secondary-fixed-variant': '#4c5261',
        'on-primary-fixed': '#0f0428',
        'on-tertiary-fixed': '#191c1e',
        'on-tertiary-container': '#4c5261',
        'inverse-on-surface': '#f6f7fa',
        'secondary-container': '#eff0f5',
        'on-surface': '#16181e',
        outline: '#8b93a1',
        'surface-bright': '#ffffff',
        'surface-variant': '#eff0f5',
        'on-background': '#16181e',
        'on-primary-container': '#4529b5',
        error: '#a12233',
        'surface-dim': '#e0e2e8',
        'inverse-primary': '#c4b5fd',
        'surface-tint': 'var(--ma-primary)',
        'tertiary-fixed': '#eaeaef',
        'surface-container-highest': '#dedee3',
        'outline-variant': '#e7e9ee',
        'on-secondary': '#ffffff',
        'surface-container': '#f0f1f5',
        'on-secondary-container': '#5b6270',
        tertiary: '#8b93a1',
        primary: 'var(--ma-primary)',
        'on-error': '#ffffff',
        'primary-container': '#e5e0ff',
        'inverse-surface': '#16181e',
        'tertiary-container': '#dedee3',
        'on-tertiary': '#ffffff',
        background: 'var(--ma-page-bg)',
        'on-surface-variant': '#5b6270',
        'primary-fixed-dim': '#8b74ff',
        'secondary-fixed-dim': '#dedee3',
        'error-container': '#fde3e7',
        'secondary-fixed': '#eff0f5',
        'primary-fixed': '#a394ff',
        secondary: '#5b6270',
        surface: 'var(--ma-page-bg)',
        'on-primary-fixed-variant': 'var(--ma-primary-hover)',
        'surface-container-low': '#f6f7fa',
        'surface-container-lowest': '#ffffff',
        'on-error-container': '#a12233',
        'on-tertiary-fixed-variant': '#5b6270',
        'surface-container-high': '#eaeaef',
        'on-primary': '#ffffff',
        'tertiary-fixed-dim': '#dedee3',
        'on-secondary-fixed': '#16181e'
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem'
      },
      spacing: {
        'stack-sm': '8px',
        'stack-md': '16px',
        base: '4px',
        'margin-desktop': '16px',
        'margin-mobile': '12px',
        'container-max': '1440px',
        'stack-lg': '24px',
        gutter: '24px'
      },
      fontFamily: {
        // REOPEN 2026-09-10 (ADR-007/T-70): heading font đổi sang Playfair Display theo xlsx
        // design system (Display Title/Section Heading/Subsection Heading), thay Plus Jakarta
        // Sans (T-10). Fallback Inter/serif.
        heading: ['Playfair Display', 'Inter', 'serif'],
        'headline-lg-mobile': ['Inter', 'system-ui', 'sans-serif'],
        'label-md': ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        'headline-md': ['Inter', 'system-ui', 'sans-serif'],
        'headline-lg': ['Inter', 'system-ui', 'sans-serif'],
        'body-md': ['Inter', 'system-ui', 'sans-serif'],
        'body-lg': ['Inter', 'system-ui', 'sans-serif'],
        'body-sm': ['Inter', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'headline-lg-mobile': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.05em', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
        display: ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }]
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
