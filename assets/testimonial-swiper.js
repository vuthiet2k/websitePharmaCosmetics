(function () {
  'use strict';

  if (typeof Swiper !== 'function') return;

  document.querySelectorAll('[data-pcase-media]').forEach(function (root) {
    if (root.dataset.initialized) return;
    if (root.querySelectorAll('.swiper-slide').length < 2) return;
    root.dataset.initialized = 'true';

    new Swiper(root, {
      slidesPerView: 1,
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
