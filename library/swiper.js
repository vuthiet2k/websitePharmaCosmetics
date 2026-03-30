/**
 * Swiper - Mobile touch slider
 * http://www.idangero.us/swiper/
 * 
 * This is a minimal implementation for the top bar marquee
 */

function Swiper(container, params) {
    'use strict';
    
    if (!(this instanceof Swiper)) return new Swiper(container, params);
    
    var defaults = {
        direction: 'horizontal',
        speed: 300,
        autoplay: 3000,
        autoplayDisableOnInteraction: true,
        loop: true,
        effect: 'slide',
        spaceBetween: 0,
        slidesPerView: 1,
        initialSlide: 0,
        pagination: null,
        navigation: null,
        on: {}
    };
    
    params = params || {};
    
    // Merge defaults with params
    for (var key in defaults) {
        if (typeof params[key] === 'undefined') {
            params[key] = defaults[key];
        }
    }
    
    this.params = params;
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    
    if (!this.container) {
        console.error('Swiper: Container element not found');
        return;
    }
    
    // Find wrapper
    this.wrapper = this.container.querySelector('.swiper-wrapper') || this.container;
    
    // Get slides
    this.slides = this.wrapper.querySelectorAll('.swiper-slide');
    
    if (this.slides.length === 0) {
        console.error('Swiper: Slides not found');
        return;
    }
    
    // State
    this.activeIndex = params.initialSlide;
    this.isAnimating = false;
    this.autoplayTimer = null;
    
    // Initialize
    this.init = function() {
        // Set initial transform
        this.updateTranslate();
        
        // Start autoplay if enabled
        if (this.params.autoplay) {
            this.startAutoplay();
        }
        
        // Add touch events
        this.addTouchEvents();
        
        // Add click events
        this.addClickEvents();
        
        // Trigger init callback
        if (this.params.on && this.params.on.init) {
            this.params.on.init(this);
        }
    };
    
    // Update translate based on active index
    this.updateTranslate = function() {
        var slideWidth = this.slides[0].offsetWidth;
        var spaceBetween = this.params.spaceBetween;
        var offset = -this.activeIndex * (slideWidth + spaceBetween);
        
        this.wrapper.style.transitionDuration = this.params.speed + 'ms';
        this.wrapper.style.transform = 'translate3d(' + offset + 'px, 0, 0)';
    };
    
    // Slide to index
    this.slideTo = function(index, speed) {
        if (speed === undefined) speed = this.params.speed;
        
        if (this.params.loop) {
            // Handle loop
            if (index >= this.slides.length) {
                index = 0;
            } else if (index < 0) {
                index = this.slides.length - 1;
            }
        } else {
            // Clamp index
            index = Math.max(0, Math.min(index, this.slides.length - 1));
        }
        
        this.activeIndex = index;
        this.updateTranslate();
        
        // Trigger slideChange callback
        if (this.params.on && this.params.on.slideChange) {
            this.params.on.slideChange(this);
        }
    };
    
    // Next slide
    this.slideNext = function() {
        this.slideTo(this.activeIndex + 1);
    };
    
    // Previous slide
    this.slidePrev = function() {
        this.slideTo(this.activeIndex - 1);
    };
    
    // Autoplay
    this.startAutoplay = function() {
        if (this.autoplayTimer) return;
        
        var self = this;
        this.autoplayTimer = setInterval(function() {
            self.slideNext();
        }, this.params.autoplay);
    };
    
    this.stopAutoplay = function() {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
    };
    
    // Touch events
    this.addTouchEvents = function() {
        var startX = 0;
        var startY = 0;
        var currentX = 0;
        var currentY = 0;
        var diffX = 0;
        var diffY = 0;
        var isScrolling = false;
        
        this.container.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isScrolling = undefined;
            
            // Stop autoplay on interaction
            if (self.params.autoplayDisableOnInteraction) {
                self.stopAutoplay();
            }
        }, { passive: true });
        
        this.container.addEventListener('touchmove', function(e) {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
            
            diffX = currentX - startX;
            diffY = currentY - startY;
            
            // Determine if horizontal or vertical scroll
            if (typeof isScrolling === 'undefined') {
                isScrolling = !!(isScrolling || Math.abs(diffX) < Math.abs(diffY));
            }
            
            if (!isScrolling) {
                e.preventDefault();
            }
        }, { passive: false });
        
        this.container.addEventListener('touchend', function(e) {
            if (!isScrolling && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    self.slidePrev();
                } else {
                    self.slideNext();
                }
            }
            
            // Resume autoplay
            if (self.params.autoplayDisableOnInteraction && self.params.autoplay) {
                setTimeout(function() {
                    self.startAutoplay();
                }, 100);
            }
        }, { passive: true });
        
        var self = this;
    };
    
    // Click/Navigation events
    this.addClickEvents = function() {
        var self = this;
        
        // Click on slides
        this.slides.forEach(function(slide, index) {
            slide.addEventListener('click', function() {
                if (self.params.on && self.params.on.click) {
                    self.params.on.click(self, index);
                }
            });
        });
    };
    
    // Destroy
    this.destroy = function() {
        this.stopAutoplay();
    };
    
    // Initialize
    this.init();
    
    return this;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Swiper;
} else if (typeof window !== 'undefined') {
    window.Swiper = Swiper;
}
