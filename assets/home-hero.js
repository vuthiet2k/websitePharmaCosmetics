(function () {
  'use strict';

  // HERO 2026-10-13 (snippets/section_hero.bwt): mỗi slide = ảnh + text + nút riêng, fade, có chấm chuyển slide + vuốt.
  // Không bật loop: loop nhân bản slide ⇒ trùng <h1>; autoplay tự quay về slide đầu khi tới slide cuối.
  var root = document.querySelector('[data-portal-hero]');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';

  var slider = root.querySelector('.portal-hero__media.swiper-container');
  var pauseButton = root.querySelector('[data-hero-pause]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var userPaused = root.dataset.autoplay === 'false' || reduceMotion;
  var delay = Math.max(4000, Number(root.dataset.delay) || 5000);
  var swiper;

  function updatePauseButton() {
    if (!pauseButton) return;
    pauseButton.setAttribute('aria-pressed', String(userPaused));
    pauseButton.setAttribute('aria-label', userPaused ? 'Chạy chuyển ảnh' : 'Tạm dừng chuyển ảnh');
    pauseButton.querySelector('[data-icon-pause]').hidden = userPaused;
    pauseButton.querySelector('[data-icon-play]').hidden = !userPaused;
  }

  function stopForInteraction() {
    if (swiper && swiper.autoplay.running) swiper.autoplay.stop();
  }

  function resumeAfterInteraction() {
    if (!swiper || userPaused || root.matches(':hover') || root.contains(document.activeElement)) return;
    swiper.autoplay.start();
  }

  if (slider && slider.querySelectorAll('.portal-hero__slide').length > 1 && typeof Swiper === 'function') {
    swiper = new Swiper(slider, {
      slidesPerView: 1,
      loop: false,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: reduceMotion ? 0 : 700,
      allowTouchMove: true,
      pagination: { el: root.querySelector('.portal-hero__dots'), clickable: true },
      autoplay: userPaused ? false : {
        delay: delay,
        disableOnInteraction: false,
        stopOnLastSlide: false,
      },
      a11y: { enabled: false },
    });

    root.addEventListener('mouseenter', stopForInteraction);
    root.addEventListener('mouseleave', resumeAfterInteraction);
    root.addEventListener('focusin', stopForInteraction);
    root.addEventListener('focusout', function () { window.setTimeout(resumeAfterInteraction, 0); });

    if (pauseButton) pauseButton.addEventListener('click', function () {
      userPaused = !userPaused;
      if (userPaused) swiper.autoplay.stop();
      else {
        swiper.params.autoplay = { delay: delay, disableOnInteraction: false, stopOnLastSlide: false };
        swiper.autoplay.start();
      }
      updatePauseButton();
    });
  } else if (pauseButton) {
    pauseButton.hidden = true;
  }
  // Mũi tên trước/sau vòng lại ở 2 đầu (không bật loop, xem chú thích đầu file).
  if (swiper) {
    var nextBtn = root.querySelector('[data-hero-next]');
    var prevBtn = root.querySelector('[data-hero-prev]');
    if (nextBtn) nextBtn.addEventListener('click', function () { if (swiper.isEnd) swiper.slideTo(0); else swiper.slideNext(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { if (swiper.isBeginning) swiper.slideTo(swiper.slides.length - 1); else swiper.slidePrev(); });
  }

  updatePauseButton();
})();
