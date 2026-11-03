/** tailwind.pc.config.js — KHOÁ. Chỉ sửa qua quy trình C.6. (tailwind.config.js là của MOPS admin — không đụng) */
const colors = require('tailwindcss/colors');
const v = (name) => `var(--pc-color-${name})`;
module.exports = {
  content: ['./layouts/**/*.bwt', './templates/**/*.bwt', './snippets/**/*.bwt', './assets/pc-ui.js'],
  corePlugins: { preflight: false, container: false }, // preflight bật lại ở đợt 12
  theme: {
    screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      slate: colors.slate, // chỉ cho nền trung tính, phủ mờ
      brand: {
        DEFAULT: v('brand-primary'),
        hover: v('brand-hover'),
        deco: v('brand-deco'),
        deep: v('brand-deep'),
        darkest: v('brand-darkest'),
        tint: v('brand-tint'),
      },
      surface: { page: v('surface-page'), card: v('surface-card'), footer: v('surface-footer'), soft: v('surface-soft') },
      ink: { DEFAULT: v('ink'), secondary: v('ink-secondary'), muted: v('ink-muted') },
      price: v('price'),
      line: { DEFAULT: v('line'), control: v('line-control'), soft: v('line-soft') },
      sale: { DEFAULT: v('sale'), tint: v('sale-tint') },
      warning: { DEFAULT: v('warning'), tint: v('warning-tint') },
    },
    fontFamily: { sans: ['Montserrat', 'system-ui', 'sans-serif'] },
    fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
    fontSize: {
      xs: ['12px', '16px'], sm: ['14px', '20px'], base: ['16px', '24px'],
      lg: ['18px', '28px'], xl: ['20px', '28px'], '2xl': ['24px', '32px'],
      '3xl': ['30px', '38px'], '4xl': ['36px', '44px'],
    },
    borderRadius: { none: '0', xl: '12px', '2xl': '16px', full: '9999px' },
    boxShadow: { none: 'none' },
    dropShadow: {},
    zIndex: {
      0: '0', 10: '10', header: '30', bottomnav: '40', fab: '45',
      overlay: '50', modal: '55', toast: '60', skip: '70',
    },
    extend: { maxWidth: { content: '1280px' } },
  },
  plugins: [],
};
