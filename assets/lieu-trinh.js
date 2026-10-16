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
})();
