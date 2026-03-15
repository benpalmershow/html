// Back to Top Button Functionality
(function() {
    'use strict';

    let backToTopButton;
    let scrollThreshold = 300; // Show button after scrolling 300px

    function initBackToTop() {
        // Create the button if it doesn't exist
        backToTopButton = document.getElementById('back-to-top');
        
        if (!backToTopButton) {
            backToTopButton = document.createElement('button');
            backToTopButton.id = 'back-to-top';
            backToTopButton.className = 'back-to-top';
            backToTopButton.setAttribute('aria-label', 'Back to top');
            backToTopButton.innerHTML = '↑';
            document.body.appendChild(backToTopButton);
        }

        // Add click event listener
        backToTopButton.addEventListener('click', scrollToTop);

        // Add scroll event listener
        window.addEventListener('scroll', throttle(handleScroll, 100));

        // Initial check
        handleScroll();
    }

    function handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > scrollThreshold) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    }

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Throttle function to limit scroll event firing
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackToTop);
    } else {
        initBackToTop();
    }

    // Also initialize after a short delay to handle dynamic content
    setTimeout(initBackToTop, 1000);
})();
