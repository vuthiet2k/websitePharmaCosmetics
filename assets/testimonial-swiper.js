(function () {
  'use strict';

  if (typeof Swiper !== 'function') return;

  // 2026-10-16 (người dùng: "dùng swiper thêm animate tự chuyển động cho đồng bộ"): Đội ngũ chuyên gia + Minh chứng là
  // carousel [data-pc-cards] tự chạy 4s/lần, lặp vòng, rê chuột/focus bàn phím thì dừng; giảm chuyển động ⇒ không tự chạy.
  // Khởi tạo carousel ngoài TRƯỚC slider ảnh trong thẻ: loop nhân bản slide, bản sao cần được khởi tạo slider ảnh luôn.
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-pc-cards]').forEach(function (root) {
    if (root.dataset.ready) return;
    var vp = root.querySelector('.pc-cards__viewport');
    var count = vp.querySelectorAll('.swiper-wrapper > .swiper-slide').length;
    if (!count) return;
    root.dataset.ready = '1';
    var swiper = new Swiper(vp, {
      slidesPerView: 1, spaceBetween: 16, loop: count > 1, speed: 700, watchOverflow: true,
      autoplay: reduce || count < 2 ? false : { delay: 4000, disableOnInteraction: false },
      navigation: { prevEl: root.querySelector('.pc-brands__nav--prev'), nextEl: root.querySelector('.pc-brands__nav--next') },
      a11y: { enabled: true },
      breakpoints: { 768: { slidesPerView: 2, spaceBetween: 20 }, 1100: { slidesPerView: 3, spaceBetween: 28 } }
    });
    if (reduce || !swiper.autoplay) return;
    function stop() { swiper.autoplay.stop(); }
    function start() { if (!root.matches(':hover') && !root.querySelector(':focus-visible')) swiper.autoplay.start(); }
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', function (e) { if (e.target.matches(':focus-visible')) stop(); });
    root.addEventListener('focusout', function () { window.setTimeout(start, 0); });
  });

  document.querySelectorAll('[data-pcase-media]').forEach(function (root) {
    if (root.dataset.initialized) return;
    if (root.querySelectorAll('.swiper-slide').length < 2) return;
    root.dataset.initialized = 'true';

    new Swiper(root, {
      slidesPerView: 1,
      nested: true,
      loop: true,
      speed: 400,
      a11y: { enabled: true },
      pagination: {
        el: root.querySelector('.pcase-pagination'),
        clickable: true,
      },
      navigation: {
        prevEl: root.querySelector('.pcase-prev'),
        nextEl: root.querySelector('.pcase-next'),
      },
    });
  });
})();
