(function () {
  'use strict';

  // 2026-10-13 (người dùng): bỏ nút tạm dừng — dừng khi focus bàn phím, tắt autoplay khi giảm chuyển động.
  // HERO 2026-10-13 (snippets/section_hero.bwt): mỗi slide = ảnh + text + nút riêng, fade, vuốt để chuyển slide.
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
    if (videoHolds()) return; // slide video: chờ video chạy hết, không bật lại đếm giờ
    swiper.autoplay.start();
  }

  // ===== 2026-11-03 (người dùng): slide có video (snippets/section_hero.bwt, data-hero-video="yt" | "file") =====
  // Video tắt tiếng tự chạy; trong lúc video chạy autoplay Swiper dừng, video chạy HẾT mới sang slide kế.
  // YouTube: điều khiển qua postMessage (enablejsapi=1) — không nạp thêm thư viện iframe_api.
  // Video không phát được (chặn mạng, mã sai) sau 10s ⇒ slide coi như ảnh, autoplay chạy lại bình thường.
  // Giảm chuyển động (prefers-reduced-motion) ⇒ không tự phát video, slide hiện ảnh chờ như ảnh tĩnh.
  var slides = Array.prototype.slice.call(root.querySelectorAll('.portal-hero__slide'));
  var videos = [];
  var FAIL_MS = 14000;
  var REVEAL_MS = 3800;

  function makeVideo(slide) {
    var kind = slide.getAttribute('data-hero-video');
    var src = slide.getAttribute('data-video-src');
    var box = slide.querySelector('[data-hero-video-box]');
    if (!kind || !src || !box) return null;
    var v = { slide: slide, kind: kind, el: null, ready: false, failed: false, active: false, muted: true, timer: 0, ping: 0, reveal: 0 };

    function send(func, args) {
      if (v.kind !== 'yt' || !v.el || !v.el.contentWindow) return;
      v.el.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: args || [] }), '*');
    }
    function setPlaying(on) { slide.classList.toggle('is-playing', !!on); }
    function fail() {
      if (v.failed || slide.classList.contains('is-playing')) return;
      v.failed = true;
      slide.classList.add('is-video-failed');
      if (v.active) resumeAfterInteraction();
    }
    function ended() {
      setPlaying(false);
      window.clearTimeout(v.reveal); v.reveal = 0;
      if (!v.active) return;
      if (!swiper || userPaused) { v.restart(); return; } // 1 slide / tắt tự chuyển ⇒ phát lại
      if (swiper.isEnd) swiper.slideTo(0); else swiper.slideNext();
    }
    v.load = function () {
      if (v.el) return;
      if (v.kind === 'yt') {
        var f = document.createElement('iframe');
        f.src = src + '&origin=' + encodeURIComponent(location.origin);
        f.title = 'Video giới thiệu';
        f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
        f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        f.setAttribute('tabindex', '-1');
        f.setAttribute('aria-hidden', 'true');
        f.addEventListener('load', function () {
          var n = 0;
          window.clearInterval(v.ping);
          // Gửi "listening" lặp tới khi player trả onReady (player trong iframe có thể chưa sẵn sàng lúc load).
          v.ping = window.setInterval(function () {
            if (v.ready || ++n > 40) { window.clearInterval(v.ping); return; }
            f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'pc-hero', channel: 'widget' }), '*');
          }, 250);
        });
        v.el = f;
      } else {
        var m = document.createElement('video');
        m.muted = true; m.playsInline = true; m.preload = 'auto';
        m.setAttribute('playsinline', ''); m.setAttribute('muted', ''); m.setAttribute('aria-hidden', 'true');
        m.src = src;
        m.addEventListener('playing', function () { v.ready = true; if (v.active) setPlaying(true); });
        m.addEventListener('ended', ended);
        m.addEventListener('error', fail);
        v.el = m;
      }
      box.appendChild(v.el);
    };
    v.onMessage = function (data) {
      var state = null;
      if ((data.event === 'onReady' || data.event === 'initialDelivery') && !v.ready) {
        v.ready = true;
        send('mute');
        send('addEventListener', ['onStateChange']);
        if (v.active) send('playVideo'); else send('pauseVideo');
      } else if (data.event === 'onStateChange') {
        state = data.info;
      } else if (data.event === 'infoDelivery' && data.info && typeof data.info.playerState === 'number') {
        state = data.info.playerState;
      }
      if (state === null) return;
      if (state === 1) {
        window.clearTimeout(v.timer);
        if (!v.active) { send('pauseVideo'); return; }
        // 03/11/2026 (chủ dự án: "vẫn còn button pause — ẩn đi"): YouTube vẽ nút tạm dừng giữa khung ~3–4s mỗi lần player chuyển
        // sang đang phát (kể cả controls=0; không tắt bằng tham số; tua seekTo cũng làm nút hiện lại — đã thử). ⇒ video chạy ngầm sau
        // ảnh chờ REVEAL_MS rồi mới hiện (nút đã tự ẩn); đổi lại ~3,6s đầu của video nằm sau ảnh chờ. 1 lần mỗi lượt hiện slide.
        if (!v.reveal && !slide.classList.contains('is-playing')) {
          v.reveal = window.setTimeout(function () { if (v.active) setPlaying(true); }, REVEAL_MS);
        }
      }
      else if (state === 0) ended();
    };
    v.play = function () {
      v.active = true;
      if (v.failed) return;
      v.load();
      window.clearTimeout(v.timer);
      v.timer = window.setTimeout(fail, FAIL_MS);
      if (v.kind === 'yt') { if (v.ready) v.restart(); }
      else { try { v.el.currentTime = 0; } catch (e) {} var p = v.el.play(); if (p && p.catch) p.catch(fail); }
    };
    v.restart = function () {
      if (v.kind === 'yt') { send('seekTo', [0, true]); send('playVideo'); }
      else { v.el.currentTime = 0; v.el.play(); }
    };
    v.stop = function () {
      v.active = false;
      window.clearTimeout(v.timer);
      window.clearTimeout(v.reveal); v.reveal = 0;
      setPlaying(false);
      if (!v.el) return;
      if (v.kind === 'yt') { send('pauseVideo'); send('seekTo', [0, true]); } else { v.el.pause(); }
    };
    v.toggleSound = function (btn) {
      v.muted = !v.muted;
      if (v.kind === 'yt') send(v.muted ? 'mute' : 'unMute'); else if (v.el) v.el.muted = v.muted;
      btn.setAttribute('aria-pressed', String(!v.muted));
      btn.setAttribute('aria-label', v.muted ? 'Bật tiếng video' : 'Tắt tiếng video');
    };
    var btn = slide.querySelector('[data-hero-sound]');
    if (btn) {
      btn.addEventListener('click', function (e) { e.preventDefault(); v.toggleSound(btn); });
      btn.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); v.toggleSound(btn); } });
    }
    return v;
  }

  if (!reduceMotion) {
    slides.forEach(function (slide) { var v = makeVideo(slide); if (v) videos.push(v); });
  }
  if (videos.length) {
    window.addEventListener('message', function (e) {
      if (!/(^|\.)youtube(-nocookie)?\.com$/.test(String(e.origin).replace(/^https?:\/\//, ''))) return;
      var data;
      try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (err) { return; }
      if (!data || !data.event) return;
      videos.forEach(function (v) { if (v.el && e.source === v.el.contentWindow) v.onMessage(data); });
    });
  }

  function activeSlide() { return swiper ? swiper.slides[swiper.activeIndex] : slides[0]; }
  function videoOf(slide) {
    for (var i = 0; i < videos.length; i++) if (videos[i].slide === slide) return videos[i];
    return null;
  }
  function videoHolds() { var v = videoOf(activeSlide()); return !!(v && !v.failed); }

  function syncVideos() {
    var cur = activeSlide();
    videos.forEach(function (v) { if (v.slide !== cur && v.active) v.stop(); });
    var v = videoOf(cur);
    if (v && !v.failed) {
      if (swiper && swiper.autoplay.running) swiper.autoplay.stop();
      v.play();
    }
    // Không nạp sẵn video slide kế: iframe autoplay=1 sẽ tự chạy ngầm. Ảnh chờ che lúc video đang nạp.
  }

  if (slider && slider.querySelectorAll('.portal-hero__slide').length > 1 && typeof Swiper === 'function') {
    swiper = new Swiper(slider, {
      slidesPerView: 1,
      loop: false,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: speed,
      allowTouchMove: true,
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
    swiper.on('slideChange', function () {
      syncVideos();
      if (!videoHolds()) resumeAfterInteraction();
    });
  }
  if (videos.length) syncVideos();
  // 2026-10-16 (người dùng): bỏ chấm phân trang + mũi tên trước/sau — chỉ còn autoplay + vuốt.
})();
