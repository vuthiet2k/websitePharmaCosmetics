/*
  assets/pc-ui.js — THƯ VIỆN PC (KHOÁ sau đợt 0, R5). Hành vi dùng chung cho snippet ui_* (UI-STANDARD C.5), JS thuần, nạp `defer`.
  D05 (24/10/2026). Gắn qua thuộc tính data-pc-*; không đặt style trong JS (R1) — ẩn/hiện bằng thuộc tính hidden / class hidden,
  khoá cuộn nền do CSS thư viện lo (html:has(.pc-modal:not([hidden])) — components.css nhóm 10).
  - data-pc-modal  : nút [data-pc-modal-open="<id>"] mở; [data-pc-modal-close], lớp phủ, Escape đóng; focus vào popup, giữ Tab
                     trong popup, đóng thì trả focus về nút mở.
  - data-pc-toast  : 1 thông báo một lúc, tự ẩn sau 5s (dừng đếm khi rê chuột / focus vào thông báo). API: PC.toast(message, opts).
  - data-pc-swiper : khởi tạo Swiper (assets/swiper.js 6.6.2 — bản đóng gói KHÔNG có module keyboard/a11y nên tự làm phím mũi tên
                     + vùng đọc trạng thái); chấm phân trang chỉ để xem; tự chạy (data-pc-swiper-autoplay="ms") tắt khi giảm chuyển động.
  - data-pc-form   : kiểm form bằng lỗi tiếng Việt dưới từng ô (ô lỗi [data-pc-error] của ui_field), hiện tất cả lỗi cùng lúc,
                     focus ô sai đầu tiên, aria-invalid; kiểm lại khi rời ô.
*/
(function () {
  'use strict';
  if (window.PC && window.PC.__ready) return;
  var PC = window.PC = window.PC || {};
  PC.__ready = true;

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function visible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  }
  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), visible);
  }

  /* ---------- Popup ---------- */
  var openModal = null; // { el, overlay, opener }

  function overlayOf(id) { return document.querySelector('[data-pc-modal-overlay="' + id + '"]'); }

  PC.openModal = function (id, opener) {
    var el = document.getElementById(id);
    if (!el || !el.hasAttribute('data-pc-modal')) return;
    if (openModal && openModal.el !== el) PC.closeModal();
    var overlay = overlayOf(id);
    if (overlay) overlay.hidden = false;
    el.hidden = false;
    openModal = { el: el, overlay: overlay, opener: opener || document.activeElement };
    if (opener) opener.setAttribute('aria-expanded', 'true');
    var f = focusables(el);
    (f[0] || el).focus();
  };

  PC.closeModal = function () {
    if (!openModal) return;
    var m = openModal;
    openModal = null;
    m.el.hidden = true;
    if (m.overlay) m.overlay.hidden = true;
    if (m.opener && m.opener.setAttribute) {
      if (m.opener.hasAttribute('aria-expanded')) m.opener.setAttribute('aria-expanded', 'false');
      if (document.contains(m.opener)) m.opener.focus();
    }
  };

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : e.target.parentElement;
    if (!t) return;
    var opener = t.closest('[data-pc-modal-open]');
    if (opener) { e.preventDefault(); PC.openModal(opener.getAttribute('data-pc-modal-open'), opener); return; }
    if (t.closest('[data-pc-modal-close]') || t.closest('[data-pc-modal-overlay]')) { e.preventDefault(); PC.closeModal(); }
  });

  document.addEventListener('keydown', function (e) {
    if (!openModal) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); PC.closeModal(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(openModal.el);
    if (!f.length) { e.preventDefault(); openModal.el.focus(); return; }
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!openModal.el.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && (a === first || a === openModal.el)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }, true);

  // Focus lọt ra ngoài popup (bấm chuột, công cụ trợ năng) ⇒ kéo lại vào popup
  document.addEventListener('focusin', function (e) {
    if (openModal && !openModal.el.contains(e.target)) { var f = focusables(openModal.el); (f[0] || openModal.el).focus(); }
  });

  /* ---------- Thông báo ---------- */
  var TOAST_MS = 5000;
  var toastTimer = null, toastLeft = 0, toastStart = 0, toastEl = null;

  function hideToast() { if (toastEl) toastEl.classList.add('hidden'); clearTimeout(toastTimer); toastTimer = null; }
  function armToast(ms) { clearTimeout(toastTimer); toastLeft = ms; toastStart = Date.now(); toastTimer = setTimeout(hideToast, ms); }
  function bindToast(el) {
    if (el.__pcToast) return;
    el.__pcToast = true;
    var pause = function () { if (toastTimer && toastEl === el) { clearTimeout(toastTimer); toastTimer = null; toastLeft -= Date.now() - toastStart; } };
    var resume = function () { if (!toastTimer && toastEl === el && !el.classList.contains('hidden') && !el.contains(document.activeElement)) armToast(Math.max(toastLeft, 1000)); };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('focusin', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('focusout', function () { setTimeout(resume, 0); });
  }

  /* PC.toast('Đã thêm vào giỏ hàng', { actionLabel: 'Xem giỏ', actionHref: '/cart' }) — dùng lại 1 thông báo duy nhất trên trang */
  PC.toast = function (message, opts) {
    opts = opts || {};
    var all = document.querySelectorAll('[data-pc-toast]');
    var el = all[0];
    if (!el) {
      el = document.createElement('div');
      el.className = 'pc-toast hidden';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('data-pc-toast', '');
      el.innerHTML = '<span data-pc-toast-message></span>';
      document.body.appendChild(el);
    }
    for (var i = 1; i < all.length; i++) all[i].classList.add('hidden');
    var msg = el.querySelector('[data-pc-toast-message]');
    if (msg) msg.textContent = message; else el.textContent = message;
    var act = el.querySelector('[data-pc-toast-action]');
    if (opts.actionLabel && opts.actionHref) {
      if (!act) { act = document.createElement('a'); act.setAttribute('data-pc-toast-action', ''); el.appendChild(act); }
      act.textContent = opts.actionLabel; act.setAttribute('href', opts.actionHref); act.hidden = false;
    } else if (act) { act.hidden = true; }
    toastEl = el;
    bindToast(el);
    el.classList.remove('hidden');
    armToast(TOAST_MS);
    return el;
  };

  function initToasts() {
    var shown = Array.prototype.filter.call(document.querySelectorAll('[data-pc-toast]'), function (t) { return !t.classList.contains('hidden'); });
    shown.forEach(function (t, i) { if (i > 0) t.classList.add('hidden'); });
    if (shown[0]) { toastEl = shown[0]; bindToast(toastEl); armToast(TOAST_MS); }
  }

  /* ---------- Slider ---------- */
  PC.swiper = function (wrap) {
    if (!wrap || wrap.__pcSwiper || typeof window.Swiper !== 'function') return wrap && wrap.__pcSwiper;
    var id = wrap.getAttribute('data-pc-swiper');
    var box = wrap.querySelector('.swiper') || wrap.querySelector('.swiper-container');
    if (!box) return null;
    var prev = wrap.querySelector('[data-pc-swiper-prev="' + id + '"]');
    var next = wrap.querySelector('[data-pc-swiper-next="' + id + '"]');
    var dots = wrap.querySelector('[data-pc-swiper-dots="' + id + '"]');
    var delay = parseInt(wrap.getAttribute('data-pc-swiper-autoplay'), 10);
    var live = document.createElement('div');
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    wrap.appendChild(live);
    box.setAttribute('role', 'region');
    box.setAttribute('aria-roledescription', 'carousel');
    if (!box.hasAttribute('aria-label')) box.setAttribute('aria-label', wrap.getAttribute('data-pc-swiper-label') || 'Trình chiếu');
    var cfg = {
      slidesPerView: 1,
      spaceBetween: 16,
      watchOverflow: true,
      navigation: prev && next ? { prevEl: prev, nextEl: next } : false,
      pagination: dots ? { el: dots, clickable: false } : false,
      autoplay: delay > 0 && !reduceMotion.matches ? { delay: delay, disableOnInteraction: false, pauseOnMouseEnter: true } : false
    };
    var sw = new window.Swiper(box, cfg);
    var announce = function () {
      var n = sw.slides ? sw.slides.length : 0;
      if (n) live.textContent = 'Slide ' + (sw.realIndex + 1) + ' / ' + n;
    };
    if (sw.slides) Array.prototype.forEach.call(sw.slides, function (s, i, arr) {
      s.setAttribute('role', 'group');
      s.setAttribute('aria-roledescription', 'slide');
      s.setAttribute('aria-label', (i + 1) + ' / ' + arr.length);
    });
    sw.on('slideChange', function () { if (!sw.autoplay || !sw.autoplay.running) announce(); });
    // Phím mũi tên khi focus nằm trong slider (bản Swiper đóng gói thiếu module keyboard)
    wrap.addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); sw.slideNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); sw.slidePrev(); }
    });
    // Tự chạy dừng khi rê chuột / focus vào slider; tắt hẳn khi người dùng bật giảm chuyển động
    if (sw.autoplay && cfg.autoplay) {
      wrap.addEventListener('focusin', function () { sw.autoplay.stop(); });
      wrap.addEventListener('focusout', function (e) { if (!wrap.contains(e.relatedTarget) && !reduceMotion.matches) sw.autoplay.start(); });
    }
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', function () { if (reduceMotion.matches && sw.autoplay) sw.autoplay.stop(); });
    wrap.__pcSwiper = sw;
    return sw;
  };

  /* ---------- Form ---------- */
  function fieldLabel(input) {
    var lab = input.id ? document.querySelector('label[for="' + input.id + '"]') : null;
    if (!lab) lab = input.closest('label');
    var txt = lab ? (lab.querySelector('span:not([aria-hidden])') && input.type === 'checkbox' ? lab.querySelector('span:not([aria-hidden])').textContent : lab.textContent) : (input.getAttribute('aria-label') || input.name || '');
    return txt.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function phoneOk(v) { return /^(0|\+?84)\d{9}$/.test(v.replace(/[\s.\-()]/g, '')); }

  function messageFor(input) {
    var v = (input.value || '').trim();
    var label = fieldLabel(input);
    var custom = input.getAttribute('data-pc-error-message');
    if (input.type === 'checkbox') {
      return input.required && !input.checked ? 'Vui lòng đánh dấu ô "' + label + '" để tiếp tục.' : '';
    }
    if (!v) return input.required ? 'Vui lòng nhập ' + lowerFirst(label) + '.' : '';
    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Email chưa đúng định dạng, ví dụ: ten@gmail.com.';
    if (input.type === 'tel' && !phoneOk(v)) return 'Số điện thoại cần đủ 10 chữ số, bắt đầu bằng 0.';
    var vs = input.validity || {};
    if (vs.tooShort) return label + ' cần ít nhất ' + input.minLength + ' ký tự.';
    if (vs.tooLong) return label + ' tối đa ' + input.maxLength + ' ký tự.';
    if (vs.rangeUnderflow) return label + ' cần từ ' + input.min + ' trở lên.';
    if (vs.rangeOverflow) return label + ' tối đa ' + input.max + '.';
    if (vs.badInput || vs.typeMismatch || vs.patternMismatch || vs.stepMismatch) return custom || (label + ' chưa đúng định dạng.');
    return '';
  }

  function errorBox(input) {
    var ids = (input.getAttribute('aria-describedby') || '').split(/\s+/);
    for (var i = 0; i < ids.length; i++) {
      var el = ids[i] && document.getElementById(ids[i]);
      if (el && el.hasAttribute('data-pc-error')) return el;
    }
    return null;
  }

  function showError(input, msg) {
    var box = errorBox(input);
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    if (!box) return;
    var txt = box.querySelector('[data-pc-error-text]');
    if (txt) txt.textContent = msg; else box.textContent = msg;
    box.classList.toggle('hidden', !msg);
  }

  function validateField(input) { var msg = messageFor(input); showError(input, msg); return !msg; }

  function formFields(form) {
    return Array.prototype.filter.call(form.querySelectorAll('input, textarea, select'), function (i) {
      return i.type !== 'hidden' && i.type !== 'submit' && i.type !== 'button' && !i.disabled && errorBox(i);
    });
  }

  PC.form = function (form) {
    if (!form || form.__pcForm) return;
    form.__pcForm = true;
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      var bad = formFields(form).filter(function (i) { return !validateField(i); });
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        // Đưa cả khối ô (nhãn + ô + lỗi) ra giữa màn — focus() thường chỉ cuộn tối thiểu, nhãn nằm dưới header dính (D.17)
        (bad[0].closest('.pc-field') || bad[0]).scrollIntoView({ block: 'center' });
        bad[0].focus({ preventScroll: true });
      }
    }, true);
    form.addEventListener('focusout', function (e) {
      var i = e.target;
      if (!errorBox(i) || i.type === 'checkbox') return;
      if ((i.value || '').trim() || i.getAttribute('aria-invalid') === 'true') validateField(i);
    });
    var recheck = function (e) { var i = e.target; if (errorBox(i) && i.getAttribute('aria-invalid') === 'true' && !messageFor(i)) showError(i, ''); };
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);
  };

  /* ---------- Khởi tạo ---------- */
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-pc-swiper]'), PC.swiper);
    Array.prototype.forEach.call(document.querySelectorAll('form[data-pc-form]'), PC.form);
    initToasts();
  }
  PC.init = init;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
