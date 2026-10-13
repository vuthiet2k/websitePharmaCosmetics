(function () {
  'use strict';

  // 2026-10-13 (người dùng): bỏ nút tạm dừng — dừng khi focus bàn phím, tắt autoplay khi giảm chuyển động.
  // HERO 2026-10-13 (snippets/section_hero.bwt): mỗi slide = ảnh + text + nút riêng, fade, có chấm chuyển slide + vuốt.
  // Không bật loop: loop nhân bản slide ⇒ trùng <h1>; autoplay tự quay về slide đầu khi tới slide cuối.
  var root = document.querySelector('[data-portal-hero]');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';

  var slider = root.querySelector('.portal-hero__media.swiper-container');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var userPaused = root.dataset.autoplay === 'false' || reduceMotion;
  var delay = Math.max(4000, Number(root.dataset.delay) || 5000);
  var speed = reduceMotion ? 0 : 1000;
  // Hiệu ứng zoom/lia ảnh (home-portal.css) chạy đúng hết thời gian 1 slide.
  root.style.setProperty('--pc-hero-dur', (delay + speed) + 'ms');
  var swiper;

  function stopForInteraction() {
    if (swiper && swiper.autoplay.running) swiper.autoplay.stop();
  }

  function resumeAfterInteraction() {
    if (!swiper || userPaused || root.contains(document.activeElement)) return;
    swiper.autoplay.start();
  }

  if (slider && slider.querySelectorAll('.portal-hero__slide').length > 1 && typeof Swiper === 'function') {
    swiper = new Swiper(slider, {
      slidesPerView: 1,
      loop: false,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: speed,
      allowTouchMove: true,
      pagination: { el: root.querySelector('.portal-hero__dots'), clickable: true },
      autoplay: userPaused ? false : {
        delay: delay,
        disableOnInteraction: false,
        stopOnLastSlide: false,
      },
      a11y: { enabled: false },
    });

    // 2026-10-13: bỏ dừng khi rê chuột — Hero cao 100vh nên chuột gần như luôn nằm trên Hero ⇒ autoplay bị dừng mãi.
    // Vẫn dừng khi focus bàn phím vào Hero (nút/link) để người dùng thao tác.
    root.addEventListener('focusin', function (e) { if (e.target.matches(':focus-visible')) stopForInteraction(); });
    root.addEventListener('focusout', function () { window.setTimeout(resumeAfterInteraction, 0); });
  }
  // Mũi tên trước/sau vòng lại ở 2 đầu (không bật loop, xem chú thích đầu file).
  if (swiper) {
    var nextBtn = root.querySelector('[data-hero-next]');
    var prevBtn = root.querySelector('[data-hero-prev]');
    if (nextBtn) nextBtn.addEventListener('click', function () { if (swiper.isEnd) swiper.slideTo(0); else swiper.slideNext(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { if (swiper.isBeginning) swiper.slideTo(swiper.slides.length - 1); else swiper.slidePrev(); });
  }
})();
