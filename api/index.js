/**
 * api/index.js — Vercel serverless entry point.
 *
 * Dùng lại NGUYÊN request handler thật của dev-server.js (routing, LiquidJS
 * render, cart cookie, asset compiler...) — không viết lại logic riêng cho
 * Vercel để tránh 2 codebase lệch nhau. dev-server.js tự tắt các phần chỉ
 * dành cho local (chokidar watch, WebSocket live-reload, server.listen, dev
 * toolbar) khi bị require() thay vì chạy trực tiếp — xem guard
 * `require.main === module` trong file đó.
 */
module.exports = require('../dev-server.js');
