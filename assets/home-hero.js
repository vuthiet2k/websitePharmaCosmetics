(function () {
  'use strict';

  // HERO-FULLBG 2026-09-17: chỉ ảnh nền chuyển cảnh; nội dung/CTA đứng yên để không ngắt thao tác.
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
    pauseButton.setAttribute('aria-label', userPaused ? 'Chạy ảnh nền' : 'Tạm dừng ảnh nền');
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
      loop: true,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: reduceMotion ? 0 : 700,
      allowTouchMove: false,
      autoplay: userPaused ? false : {
        delay: delay,
        disableOnInteraction: false,
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
        swiper.params.autoplay = { delay: delay, disableOnInteraction: false };
        swiper.autoplay.start();
      }
      updatePauseButton();
    });
  } else if (pauseButton) {
    pauseButton.hidden = true;
  }

  updatePauseButton();
})();
