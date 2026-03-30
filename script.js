// Custom JavaScript can be added here
// For example, dynamic content loading, form submissions, etc.

$(document).ready(function() {
    // Example: Smooth scrolling for navigation links
    $("a.nav-link").on("click", function(event) {
        if (this.hash !== "") {
            event.preventDefault();
            var hash = this.hash;
            $("html, body").animate({
                scrollTop: $(hash).offset().top
            }, 800, function() {
                window.location.hash = hash;
            });
        }
    });
    
    // Initialize Top Bar Marquee Swiper
    const topBarSwiper = new Swiper('.topBarSwiper', {
        direction: 'horizontal',
        loop: true,
        autoplay: {
            delay: 3000,
            disableOnInteraction: false
        },
        effect: 'fade',
        fadeEffect: {
            crossFade: true
        },
        speed: 500
    });
    
    // Initialize Best Sellers Carousel if exists
    const productCarousel = new Swiper('.productCarousel', {
        slidesPerView: 4,
        spaceBetween: 20,
        loop: true,
        navigation: {
            nextEl: '.control-btn .fa-chevron-right',
            prevEl: '.control-btn .fa-chevron-left'
        },
        breakpoints: {
            1200: { slidesPerView: 4 },
            992: { slidesPerView: 3 },
            768: { slidesPerView: 2 },
            576: { slidesPerView: 1 }
        }
    });
    
    // Initialize Brand Marquee Swiper
    const brandSwiper = new Swiper('.brandSwiper', {
        direction: 'horizontal',
        loop: true,
        autoplay: {
            delay: 0,
            disableOnInteraction: false
        },
        speed: 20000,
        effect: 'linear'
    });
});