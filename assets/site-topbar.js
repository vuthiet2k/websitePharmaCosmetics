(function () {
  'use strict';
  var root = document.querySelector('[data-topbar]');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  var slider = root.querySelector('.topbar-slider');
  var pause = root.querySelector('[data-topbar-pause]');
  var paused = root.dataset.autoplay === 'false' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var swiper;
  function updatePause() {
    if (!pause) return;
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? 'Chạy thông báo' : 'Tạm dừng thông báo');
    pause.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
  }
  if (slider && slider.querySelectorAll('.swiper-slide').length > 1 && typeof Swiper === 'function') {
    swiper = new Swiper(slider, {
      slidesPerView: 1,
      loop: true,
      speed: 450,
      autoplay: paused ? false : { delay: Math.max(2000, Number(root.dataset.delay) || 4000), disableOnInteraction: false },
      a11y: { enabled: true },
    });
    if (pause) pause.addEventListener('click', function () {
      paused = !paused;
      if (paused) swiper.autoplay.stop();
      else {
        swiper.params.autoplay = { delay: Math.max(2000, Number(root.dataset.delay) || 4000), disableOnInteraction: false };
        swiper.autoplay.start();
      }
      updatePause();
    });
    slider.addEventListener('mouseenter', function () { swiper.autoplay.stop(); });
    slider.addEventListener('mouseleave', function () { if (!paused) swiper.autoplay.start(); });
  }
  updatePause();

  var langButton = root.querySelector('#langBtn');
  var langList = root.querySelector('#langList');
  var status = root.querySelector('#translation-status');
  var supported = ['vi', 'en', 'zh-CN', 'ja', 'ko'];
  var current = 'vi';
  try { current = localStorage.getItem('preferred_lang') || 'vi'; } catch (_) {}
  if (supported.indexOf(current) < 0) current = 'vi';
  var translatePromise;
  var translateTimer;
  function setUI(language) {
    var active = langList.querySelector('[data-lang="' + language + '"]');
    if (!active) return;
    root.querySelector('#langLabel').textContent = active.dataset.label;
    root.querySelector('#langFlag').src = active.dataset.flag;
    langList.querySelectorAll('[data-lang]').forEach(function (button) {
      button.setAttribute('aria-current', String(button.dataset.lang === language));
    });
    document.querySelectorAll('#drawerLangOpts [data-lang]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.lang === language);
    });
  }
  function closeLanguages(restoreFocus) {
    langList.hidden = true;
    langButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) langButton.focus();
  }
  function provider() {
    if (translatePromise) return translatePromise;
    translatePromise = new Promise(function (resolve, reject) {
      window.googleTranslateElementInit = function () {
        try {
          new google.translate.TranslateElement({ pageLanguage: 'vi', includedLanguages: supported.join(','), autoDisplay: false }, 'google_translate_element');
          resolve();
        } catch (error) { reject(error); }
      };
      var script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.onerror = function () { script.remove(); translatePromise = null; reject(new Error('Translation unavailable')); };
      document.head.appendChild(script);
    });
    return translatePromise;
  }
  function translate(language) {
    clearInterval(translateTimer);
    status.textContent = '';
    if (language === 'vi') {
      ['', '.' + location.hostname].forEach(function (domain) {
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (domain ? '; domain=' + domain : '');
      });
      location.reload();
      return;
    }
    document.cookie = 'googtrans=/vi/' + language + '; path=/; SameSite=Lax';
    provider().then(function () {
      var attempts = 0;
      translateTimer = setInterval(function () {
        var select = document.querySelector('.goog-te-combo');
        if (select) {
          clearInterval(translateTimer);
          select.value = current;
          select.dispatchEvent(new Event('change'));
        } else if (++attempts >= 30) {
          clearInterval(translateTimer);
          status.textContent = 'Chưa kết nối được dịch thuật. Vui lòng thử lại.';
        }
      }, 200);
    }).catch(function () { status.textContent = 'Chưa kết nối được dịch thuật. Vui lòng thử lại.'; });
  }
  function choose(language) {
    if (supported.indexOf(language) < 0) return;
    current = language;
    try { localStorage.setItem('preferred_lang', language); } catch (_) {}
    setUI(language);
    closeLanguages(false);
    translate(language);
  }
  langButton.addEventListener('click', function () {
    langList.hidden = !langList.hidden;
    langButton.setAttribute('aria-expanded', String(!langList.hidden));
  });
  langList.addEventListener('click', function (event) {
    var option = event.target.closest('[data-lang]');
    if (option) choose(option.dataset.lang);
  });
  root.querySelector('#langSwitcher').addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { closeLanguages(true); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    langList.hidden = false;
    langButton.setAttribute('aria-expanded', 'true');
    var options = Array.from(langList.querySelectorAll('button'));
    var index = options.indexOf(document.activeElement);
    var next = event.key === 'ArrowDown' ? index + 1 : (index < 0 ? options.length - 1 : index - 1);
    options[(next + options.length) % options.length].focus();
  });
  document.addEventListener('click', function (event) {
    if (!root.querySelector('#langSwitcher').contains(event.target)) closeLanguages(false);
    var drawerOption = event.target.closest('#drawerLangOpts [data-lang]');
    if (drawerOption) choose(drawerOption.dataset.lang);
  });
  var account = root.querySelector('#topbarAccount');
  var accountButton = account.querySelector('button');
  var accountList = account.querySelector('ul');
  accountButton.addEventListener('click', function () {
    accountList.hidden = !accountList.hidden;
    accountButton.setAttribute('aria-expanded', String(!accountList.hidden));
  });
  document.addEventListener('click', function (event) {
    if (!account.contains(event.target)) { accountList.hidden = true; accountButton.setAttribute('aria-expanded', 'false'); }
  });
  account.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { accountList.hidden = true; accountButton.setAttribute('aria-expanded', 'false'); accountButton.focus(); }
  });
  setUI(current);
  if (current !== 'vi') translate(current);
})();
