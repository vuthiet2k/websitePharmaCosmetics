/**
 * Layout Loader
 * Loads reusable header and footer components into pages with loading states
 */

(function() {
    'use strict';

    /**
     * Show loading state
     * @param {string} targetSelector - CSS selector for the target element
     */
    function showLoading(targetSelector) {
        const target = document.querySelector(targetSelector);
        if (target) {
            target.innerHTML = `
                <div class="layout-loading" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    background: var(--bg-cream, #F5F5F5);
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 3px solid #E0E0E0;
                        border-top-color: var(--primary-green, #3CB371);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    "></div>
                </div>
            `;

            // Add spin animation if not already present
            if (!document.getElementById('layout-loader-styles')) {
                const style = document.createElement('style');
                style.id = 'layout-loader-styles';
                style.textContent = `
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    /**
     * Show error state
     * @param {string} targetSelector - CSS selector for the target element
     * @param {string} message - Error message to display
     */
    function showError(targetSelector, message) {
        const target = document.querySelector(targetSelector);
        if (target) {
            target.innerHTML = `
                <div class="layout-error" style="
                    text-align: center;
                    padding: 20px;
                    color: var(--secondary-gray, #666);
                    font-size: 14px;
                ">
                    <i class="fas fa-exclamation-triangle" style="color: var(--warning, #FB8C00);"></i>
                    <span style="margin-left: 8px;">${message}</span>
                </div>
            `;
        }
    }

    /**
     * Load HTML component into a target element
     * @param {string} component - Component name ('header' or 'footer')
     * @param {string} targetSelector - CSS selector for the target element
     */
    async function loadComponent(component, targetSelector) {
        // Show loading state
        showLoading(targetSelector);

        try {
            const response = await fetch(`layout/${component}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load ${component}: ${response.statusText}`);
            }
            const html = await response.text();
            const target = document.querySelector(targetSelector);
            if (target) {
                target.innerHTML = html;
                onComponentLoaded(component);
            }
        } catch (error) {
            console.error(`Error loading ${component}:`, error);
            showError(targetSelector, `Không thể tải ${component}. Vui lòng tải lại trang.`);
        }
    }

    /**
     * Post-load actions after component is inserted
     * @param {string} component - Component name
     */
    function onComponentLoaded(component) {
        if (component === 'header') {
            setActiveNavLink();
            initMobileMenu();
        } else if (component === 'footer') {
            initFooterLinks();
        }

        // Dispatch custom event for other scripts to listen to
        document.dispatchEvent(new CustomEvent(`layout:${component}:loaded`));
    }

    /**
     * Set active state on navigation link based on current page
     */
    function setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-links a');

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Initialize mobile menu toggle (if exists)
     */
    function initMobileMenu() {
        const menuToggle = document.querySelector('.btn-category');
        if (menuToggle) {
            menuToggle.addEventListener('click', function() {
                const navLinks = document.querySelector('.nav-links');
                if (navLinks) {
                    navLinks.classList.toggle('mobile-open');
                }
            });
        }
    }

    /**
     * Initialize footer link hover effects
     */
    function initFooterLinks() {
        const footerLinks = document.querySelectorAll('.footer-links a, .footer-contact a');
        footerLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') {
                    e.preventDefault();
                    console.log('Footer link clicked:', this.textContent);
                }
            });
        });
    }

    /**
     * Initialize layout components
     */
    function initLayout() {
        const headerTarget = document.getElementById('layout-header');
        const footerTarget = document.getElementById('layout-footer');

        if (headerTarget) {
            loadComponent('header', '#layout-header');
        }

        if (footerTarget) {
            loadComponent('footer', '#layout-footer');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLayout);
    } else {
        initLayout();
    }

})();
