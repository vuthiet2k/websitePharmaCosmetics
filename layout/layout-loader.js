/**
 * Layout Loader
 * Loads reusable header and footer components into pages
 */

(function() {
    'use strict';

    /**
     * Load HTML component into a target element
     * @param {string} component - Component name ('header' or 'footer')
     * @param {string} targetSelector - CSS selector for the target element
     */
    async function loadComponent(component, targetSelector) {
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
        }
    }

    /**
     * Post-load actions after component is inserted
     * @param {string} component - Component name
     */
    function onComponentLoaded(component) {
        if (component === 'header') {
            setActiveNavLink();
        }
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
