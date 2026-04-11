/**
 * Pharma Cosmetics - Main JavaScript
 * Handles interactive features: countdown, tabs, carousels, etc.
 */

$(document).ready(function() {

    // ==========================================
    // Flash Sale Countdown Timer
    // ==========================================
    function initCountdown() {
        // Set countdown target (e.g., end of today or specific time)
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // If it's past the target, set for next day
        if (now >= endOfDay) {
            endOfDay.setDate(endOfDay.getDate() + 1);
        }

        function updateCountdown() {
            const currentTime = new Date();
            const timeLeft = endOfDay - currentTime;

            if (timeLeft <= 0) {
                // Reset for next day
                endOfDay.setDate(endOfDay.getDate() + 1);
                return;
            }

            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            const boxes = document.querySelectorAll('.countdown-box');
            if (boxes.length === 3) {
                boxes[0].textContent = String(hours).padStart(2, '0');
                boxes[1].textContent = String(minutes).padStart(2, '0');
                boxes[2].textContent = String(seconds).padStart(2, '0');
            }
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    initCountdown();

    // ==========================================
    // Ingredient Tab Switching
    // ==========================================
    function initIngredientTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContent = {
            'Retinol': {
                title: 'Retinol',
                description: 'Được coi là "tiêu chuẩn vàng" trong chống lão hóa, Retinol giúp thúc đẩy quá tạo tế bào, làm mờ nếp nhăn và cải thiện kết cấu da. Tại Scientific Sanctuary, chúng tôi cung cấp các sản phẩm Retinol từ nồng độ 0.3% đến 1.0% phù hợp cho cả người mới bắt đầu.',
                benefits: [
                    'Giảm nếp nhăn và vết chân chim',
                    'Làm đều màu da, mờ thâm nám',
                    'Thu nhỏ lỗ chân lông'
                ],
                colors: ['#FF6B6B', '#FF8E53']
            },
            'Vitamin B5': {
                title: 'Vitamin B5',
                description: 'Vitamin B5 (Panthenol) là thành phần dưỡng ẩm mạnh mẽ, giúp phục hồi hàng rào bảo vệ da, làm dịu kích ứng và tăng cường khả năng tự chữa lành của da. Thành phần này đặc biệt phù hợp cho da nhạy cảm và da sau điều trị.',
                benefits: [
                    'Dưỡng ẩm chuyên sâu và duy trì độ ẩm',
                    'Làm dịu da kích ứng và mẩn đỏ',
                    'Hỗ trợ phục hồi da sau peel/laser'
                ],
                colors: ['#4ECDC4', '#44A08D']
            },
            'Vitamin C': {
                title: 'Vitamin C',
                description: 'Vitamin C (Ascorbic Acid) là chất chống oxy hóa mạnh, giúp làm sáng da, mờ thâm nám và bảo vệ da khỏi tác hại của môi trường. Kết hợp cùng Vitamin E và Ferulic Acid, hiệu quả được tăng cường gấp nhiều lần.',
                benefits: [
                    'Làm sáng da, mờ vết thâm nám',
                    'Chống oxy hóa, bảo vệ da khỏi môi trường',
                    'Kích thích sản sinh collagen tự nhiên'
                ],
                colors: ['#F7971E', '#FFD200']
            },
            'Niacinamide': {
                title: 'Niacinamide',
                description: 'Niacinamide (Vitamin B3) là thành phần đa năng giúp kiểm soát dầu, thu nhỏ lỗ chân lông, làm đều màu da và củng cố hàng rào bảo vệ. Phù hợp với mọi loại da, đặc biệt là da dầu mụn.',
                benefits: [
                    'Kiểm soát nhờn và thu nhỏ lỗ chân lông',
                    'Làm đều màu da, giảm đỏ',
                    'Củng cố hàng rào bảo vệ da'
                ],
                colors: ['#A8E6CF', '#88D8B0']
            },
            'AHA/BHA': {
                title: 'AHA/BHA',
                description: 'AHA (Alpha Hydroxy Acid) và BHA (Beta Hydroxy Acid) là các chất tẩy tế bào chết hóa học giúp làm sạch sâu lỗ chân lông, mịn bề mặt da và cải thiện kết cấu da. BHA tan trong dầu nên đặc biệt hiệu quả với da dầu mụn.',
                benefits: [
                    'Tẩy tế bào chết, mịn bề mặt da',
                    'Làm sạch sâu lỗ chân lông, giảm mụn',
                    'Cải thiện kết cấu và kết cấu da'
                ],
                colors: ['#FF9A9E', '#FECFEF']
            },
            'Peptides': {
                title: 'Peptides',
                description: 'Peptides là chuỗi axit amin ngắn giúp kích thích sản sinh collagen, elastin và các protein cấu trúc khác. Đây là thành phần chống lão hóa nhẹ nhàng, phù hợp cho cả da nhạy cảm không dung nạp được Retinol.',
                benefits: [
                    'Kích thích collagen, giảm nếp nhăn',
                    'Cải thiện độ đàn hồi và săn chắc da',
                    'Nhẹ nhàng, phù hợp da nhạy cảm'
                ],
                colors: ['#667EEA', '#764BA2']
            }
        };

        tabButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const selectedTab = this.textContent.trim();

                // Update active state
                tabButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Update content if exists
                const content = tabContent[selectedTab];
                if (content) {
                    const infoSection = document.querySelector('.ingredient-info');
                    if (infoSection) {
                        // Update title
                        const titleEl = infoSection.querySelector('h3');
                        if (titleEl) titleEl.textContent = content.title;

                        // Update description
                        const descEl = infoSection.querySelector('p');
                        if (descEl) descEl.textContent = content.description;

                        // Update benefits
                        const benefitsList = infoSection.querySelector('.ingredient-benefits');
                        if (benefitsList) {
                            benefitsList.innerHTML = content.benefits.map(benefit =>
                                `<li><i class="fas fa-check"></i> ${benefit}</li>`
                            ).join('');
                        }
                    }

                    // Update images (gradient placeholders)
                    const imgContainers = document.querySelectorAll('.ingredient-img');
                    if (imgContainers.length >= 2) {
                        imgContainers[0].style.background =
                            `linear-gradient(135deg, ${content.colors[0]} 0%, ${content.colors[1]} 100%)`;
                        imgContainers[1].style.background =
                            `linear-gradient(135deg, ${content.colors[1]} 0%, ${content.colors[0]} 100%)`;
                    }
                }
            });
        });
    }

    initIngredientTabs();

    // ==========================================
    // Header Action Buttons
    // ==========================================
    function initHeaderActions() {
        // Account button
        const accountBtn = document.querySelector('.btn-account');
        if (accountBtn) {
            accountBtn.addEventListener('click', function() {
                // Placeholder: Navigate to account page
                window.location.href = '#account';
            });
        }

        // Cart button
        const cartBtn = document.querySelector('.btn-cart');
        if (cartBtn) {
            cartBtn.addEventListener('click', function() {
                // Placeholder: Navigate to cart page
                window.location.href = '#cart';
            });
        }

        // Add to cart buttons
        const addToCartBtns = document.querySelectorAll('.btn-add-cart');
        addToCartBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Update cart count
                const cartCount = document.querySelector('.cart-count');
                if (cartCount) {
                    let count = parseInt(cartCount.textContent) || 0;
                    count++;
                    cartCount.textContent = count;

                    // Visual feedback
                    this.textContent = 'Đã thêm ✓';
                    this.style.backgroundColor = 'var(--success)';
                    this.style.color = '#fff';

                    setTimeout(() => {
                        this.textContent = 'Thêm vào giỏ';
                        this.style.backgroundColor = '';
                        this.style.color = '';
                    }, 2000);
                }
            });
        });

        // Search button
        const searchBtn = document.querySelector('.search-bar button');
        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                const searchInput = document.querySelector('.search-bar input');
                if (searchInput && searchInput.value.trim()) {
                    // Placeholder: Implement search
                    console.log('Searching for:', searchInput.value);
                    window.location.href = `#search?q=${encodeURIComponent(searchInput.value.trim())}`;
                }
            });

            // Enter key search
            const searchInput = document.querySelector('.search-bar input');
            if (searchInput) {
                searchInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        searchBtn.click();
                    }
                });
            }
        }
    }

    initHeaderActions();

    // ==========================================
    // Navigation Links (if not using Swiper)
    // ==========================================
    // Smooth scrolling for anchor links (without jQuery animation conflict)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ==========================================
    // Brand Marquee Pause on Hover
    // ==========================================
    const marquee = document.querySelector('.brand-marquee');
    if (marquee) {
        marquee.addEventListener('mouseenter', function() {
            this.querySelector('.marquee-content').style.animationPlayState = 'paused';
        });
        marquee.addEventListener('mouseleave', function() {
            this.querySelector('.marquee-content').style.animationPlayState = 'running';
        });
    }

    // ==========================================
    // Scroll Animation Observer
    // ==========================================
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Animate cards on scroll
        document.querySelectorAll('.product-card, .solution-card, .testimonial-card, .feature-item').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    }

    initScrollAnimations();

    // ==========================================
    // Sticky Header Shadow on Scroll
    // ==========================================
    function initStickyHeader() {
        const header = document.querySelector('.main-header');
        if (!header) return;

        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = 'var(--shadow-sm)';
            }
        });
    }

    initStickyHeader();

});
