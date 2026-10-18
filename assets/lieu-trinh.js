/**
 * assets/lieu-trinh.js — Trang liệu trình (snippets/lieu_trinh_page.bwt).
 * 2026-10-17: thanh đặt lịch bám đáy mobile (đặt trên bottom-nav, đẩy nút nổi lên để không che), thu gọn "Thông tin chi tiết",
 * cuộn mượt tới neo. FAQ dùng <details> — không cần JS.
 */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    initStickyCta();
    initCollapse();
    initSmoothScroll();
    initCaseSlider();
  });

  function initStickyCta() {
    var bar = document.getElementById('peel-mobile-sticky-cta');
    var intro = document.getElementById('service-hero-section');
    var booking = document.getElementById('service-booking-section');
    if (!bar || !intro) return;
    var nav = document.querySelector('.pc-bottom-nav');
    function place() {
      // bottom-nav là position:fixed ⇒ offsetParent luôn null; đo trực tiếp khi đang hiển thị
      var h = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().height : 0;
      bar.style.bottom = h + 'px';
    }
    function update() {
      if (window.innerWidth >= 992) { bar.classList.remove('is-visible'); document.body.classList.remove('lt-sticky-on'); return; }
      place();
      var past = intro.getBoundingClientRect().bottom < 80;
      var r = booking ? booking.getBoundingClientRect() : null;
      var atBooking = r && r.top < window.innerHeight && r.bottom > 0;
      var show = past && !atBooking;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      bar.querySelectorAll('a').forEach(function (a) { a.tabIndex = show ? 0 : -1; });
      // nút nổi (liên hệ, lên đầu trang) dịch lên đúng chiều cao thanh để không bị che (UI-7.2)
      document.body.style.setProperty('--lt-sticky-h', bar.getBoundingClientRect().height + 'px');
      document.body.classList.toggle('lt-sticky-on', show);
    }
    place();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { place(); update(); }, { passive: true });
    update();
  }

  // "Thông tin chi tiết": chỉ thu gọn khi nội dung cao hơn ~1.4 lần khung thu gọn
  function initCollapse() {
    document.querySelectorAll('[data-lt-collapse]').forEach(function (box) {
      var body = box.querySelector('.lt-details__body');
      var btn = box.querySelector('[data-lt-toggle]');
      if (!body || !btn || body.scrollHeight < 720) return;
      box.classList.add('is-collapsed');
      btn.hidden = false;
      btn.addEventListener('click', function () {
        var open = box.classList.toggle('is-collapsed') === false;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.querySelector('span').textContent = open ? 'Thu gọn' : 'Xem thêm';
        if (!open) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function initSmoothScroll() {
    var page = document.getElementById('getglowing-service-page');
    if (!page) return;
    page.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
  // 2026-10-18: "Trước – sau" — trình chiếu 1 ca/lần (‹ ›, chấm, vuốt), đồng bộ thư viện kết quả trang Trước & Sau.
  function initCaseSlider() {
    var root = document.querySelector('[data-lt-slider]');
    if (!root) return;
    var slides = [].slice.call(root.querySelectorAll('.lt-slide'));
    var dots = root.querySelector('[data-lt-dots]');
    var prev = root.querySelector('[data-lt-prev]'), next = root.querySelector('[data-lt-next]');
    var index = 0;
    function render() {
      slides.forEach(function (s, k) { s.hidden = k !== index; });
      var multi = slides.length > 1;
      prev.hidden = next.hidden = !multi;
      dots.innerHTML = '';
      if (!multi) return;
      slides.forEach(function (_, k) {
        var d = document.createElement('button');
        d.type = 'button'; d.className = 'lt-dot'; d.setAttribute('aria-label', 'Xem ca ' + (k + 1));
        if (k === index) d.setAttribute('aria-current', 'true');
        d.addEventListener('click', function () { go(k); });
        dots.appendChild(d);
      });
    }
    function go(i) { index = (i + slides.length) % slides.length; render(); }
    prev.addEventListener('click', function () { go(index - 1); });
    next.addEventListener('click', function () { go(index + 1); });
    var x0 = null;
    root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40 && slides.length > 1) go(index + (dx < 0 ? 1 : -1));
    }, { passive: true });
    render();
  }
})();
