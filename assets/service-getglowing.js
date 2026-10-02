/**
 * assets/service-getglowing.js
 * Script điều phối Trang dịch vụ GetGlowing Micro-Peel chuẩn y khoa.
 * Dự án: Pharma Cosmetics — Skin Health Beauty (Hà Nội).
 * Chức năng:
 *  1. Tagged Image Hydration: Bóc tách ảnh từ page.content qua Alt Text ([hero-desktop], [concern-1]..[concern-5], [product-kit], cases).
 *  2. Accordion FAQ: Mở/đóng các câu hỏi thường gặp mượt mà.
 *  3. Mobile Sticky CTA: Hiển thị thanh đặt lịch cố định bám đáy khi cuộn qua banner.
 *  4. Smooth scroll: Điều hướng êm tới các phân đoạn mục tiêu.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initTaggedImageHydration();
    initFaqAccordion();
    initMobileStickyCta();
    initSmoothScroll();
  });

  /**
   * 1. Bóc tách và ánh xạ ảnh từ vùng dữ liệu thô page.content
   */
  function initTaggedImageHydration() {
    var rawContainer = document.getElementById('service-raw-data');
    if (!rawContainer) return;

    var mapping = [
      { tag: '[hero-desktop]', targetId: 'hero-banner-img' },
      { tag: '[concern-1]', targetId: 'concern-img-1' },
      { tag: '[concern-2]', targetId: 'concern-img-2' },
      { tag: '[concern-3]', targetId: 'concern-img-3' },
      { tag: '[concern-4]', targetId: 'concern-img-4' },
      { tag: '[concern-5]', targetId: 'concern-img-5' },
      { tag: '[product-kit]', targetId: 'product-kit-img' }
    ];

    mapping.forEach(function (item) {
      var sourceImg = rawContainer.querySelector('img[alt*="' + item.tag + '"]');
      var targetImg = document.getElementById(item.targetId);
      if (sourceImg && targetImg && sourceImg.src) {
        targetImg.src = sourceImg.src;
      }
    });

    // Xử lý các ca lâm sàng Before/After (nếu có ảnh đã đối soát)
    var caseMapping = [
      { tag: '[case-01-before]', imgId: 'case-01-before-img', placeholderId: 'case-01-before-placeholder' },
      { tag: '[case-01-after]', imgId: 'case-01-after-img', placeholderId: 'case-01-after-placeholder' },
      { tag: '[case-02-before]', imgId: 'case-02-before-img', placeholderId: 'case-02-before-placeholder' },
      { tag: '[case-02-after]', imgId: 'case-02-after-img', placeholderId: 'case-02-after-placeholder' }
    ];

    caseMapping.forEach(function (item) {
      var sourceImg = rawContainer.querySelector('img[alt*="' + item.tag + '"]');
      var targetImg = document.getElementById(item.imgId);
      var placeholder = document.getElementById(item.placeholderId);
      if (sourceImg && targetImg && sourceImg.src) {
        targetImg.src = sourceImg.src;
        targetImg.classList.remove('hidden');
        if (placeholder) placeholder.style.display = 'none';
      }
    });
  }

  /**
   * 2. Accordion FAQ
   */
  function initFaqAccordion() {
    var accordion = document.getElementById('peel-faq-accordion');
    if (!accordion) return;

    var items = accordion.querySelectorAll('.pc-peel-faq-item');
    items.forEach(function (item) {
      var btn = item.querySelector('button');
      var content = item.querySelector('.pc-peel-faq-content');
      if (!btn || !content) return;

      btn.addEventListener('click', function () {
        var isExpanded = btn.getAttribute('aria-expanded') === 'true';

        // Đóng các câu hỏi khác
        items.forEach(function (otherItem) {
          if (otherItem !== item) {
            var otherBtn = otherItem.querySelector('button');
            var otherContent = otherItem.querySelector('.pc-peel-faq-content');
            if (otherBtn && otherContent) {
              otherBtn.setAttribute('aria-expanded', 'false');
              otherContent.classList.add('hidden');
            }
          }
        });

        // Đổi trạng thái câu hỏi hiện tại
        if (isExpanded) {
          btn.setAttribute('aria-expanded', 'false');
          content.classList.add('hidden');
        } else {
          btn.setAttribute('aria-expanded', 'true');
          content.classList.remove('hidden');
        }
      });
    });
  }

  /**
   * 3. Mobile Sticky CTA Bar
   */
  function initMobileStickyCta() {
    var stickyBar = document.getElementById('peel-mobile-sticky-cta');
    var heroSection = document.getElementById('service-hero-section');
    if (!stickyBar || !heroSection) return;

    function handleScroll() {
      if (window.innerWidth >= 1024) {
        stickyBar.classList.remove('is-visible');
        return;
      }
      var heroBottom = heroSection.getBoundingClientRect().bottom;
      if (heroBottom < 100) {
        stickyBar.classList.add('is-visible');
      } else {
        stickyBar.classList.remove('is-visible');
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
  }

  /**
   * 4. Smooth Scroll tới các liên kết neo (#...)
   */
  function initSmoothScroll() {
    var page = document.getElementById('getglowing-service-page');
    if (!page) return;

    var links = page.querySelectorAll('a[href^="#"]');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (href === '#' || href === '') return;
        var targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
})();
