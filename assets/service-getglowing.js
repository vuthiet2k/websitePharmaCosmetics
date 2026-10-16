/**
 * assets/service-getglowing.js — Trang dịch vụ GetGlowing Micro-Peel.
 * 2026-10-17: ảnh/chữ giờ render server-side từ settings gg_* (bỏ cơ chế nạp ảnh bằng JS từ page.content);
 * FAQ dùng <details> (không cần JS). Còn lại: thanh đặt lịch bám đáy trên mobile + cuộn mượt tới neo.
 */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    initStickyCta();
    initSmoothScroll();
  });

  // Hiện thanh đặt lịch khi đã cuộn qua phần giới thiệu; đặt ngay trên bottom-nav mobile để không chồng lên nhau.
  function initStickyCta() {
    var bar = document.getElementById('peel-mobile-sticky-cta');
    var intro = document.getElementById('service-hero-section');
    var booking = document.getElementById('service-booking-section');
    if (!bar || !intro) return;
    var nav = document.querySelector('.pc-bottom-nav');
    function place() {
      // bottom-nav là position:fixed ⇒ offsetParent luôn null; đo trực tiếp kích thước khi đang hiển thị
      var h = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().height : 0;
      bar.style.bottom = h + 'px';
    }
    function update() {
      if (window.innerWidth >= 992) { bar.classList.remove('is-visible'); return; }
      place();
      var past = intro.getBoundingClientRect().bottom < 80;
      var atBooking = booking && booking.getBoundingClientRect().top < window.innerHeight && booking.getBoundingClientRect().bottom > 0;
      var show = past && !atBooking;
      bar.classList.toggle('is-visible', show);
      // nút nổi (liên hệ, lên đầu trang) dịch lên đúng chiều cao thanh để không bị che (UI-7.2)
      document.body.style.setProperty('--gg-sticky-h', bar.getBoundingClientRect().height + 'px');
      document.body.classList.toggle('gg-sticky-on', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      bar.querySelectorAll('a').forEach(function (a) { a.tabIndex = show ? 0 : -1; });
    }
    place();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { place(); update(); }, { passive: true });
    update();
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
