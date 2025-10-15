/**
 * Mobile SEO Optimizer
 * Handles mobile-specific optimizations for SEO and performance
 */

class MobileSEOOptimizer {
    constructor() {
        this.isMobile = null;
        this.viewportMeta = null;
        this.init();
    }

    /**
     * Initialize mobile SEO optimizations
     */
    init() {
        this.detectMobileDevice();
        this.validateViewportMeta();
        this.applyMobileOptimizations();
    }

    /**
     * Detect if the current device is mobile
     * @returns {boolean}
     */
    detectMobileDevice() {
        if (this.isMobile !== null) {
            return this.isMobile;
        }

        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const mobileRegex = /android|avantgo|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i;

        this.isMobile = mobileRegex.test(userAgent) ||
                       (window.innerWidth <= 768 && window.innerHeight <= 1024) ||
                       ('ontouchstart' in window);

        return this.isMobile;
    }

    /**
     * Validate viewport meta tag configuration
     * @returns {Object} Validation result
     */
    validateViewportMeta() {
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (!viewportMeta) {
            return {
                valid: false,
                error: 'Viewport meta tag not found',
                recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">'
            };
        }

        const content = viewportMeta.getAttribute('content');
        if (!content) {
            return {
                valid: false,
                error: 'Viewport meta tag has no content attribute',
                recommendation: 'Add content="width=device-width, initial-scale=1.0"'
            };
        }

        const requiredAttributes = ['width=device-width', 'initial-scale=1.0'];
        const missingAttributes = requiredAttributes.filter(attr => !content.includes(attr));

        if (missingAttributes.length > 0) {
            return {
                valid: false,
                error: 'Missing required viewport attributes',
                missing: missingAttributes,
                recommendation: 'Include width=device-width and initial-scale=1.0'
            };
        }

        this.viewportMeta = viewportMeta;
        return { valid: true };
    }

    /**
     * Apply mobile-specific optimizations
     */
    applyMobileOptimizations() {
        if (!this.isMobile) return;

        this.optimizeTouchTargets();
        this.optimizeImagesForMobile();
        this.addMobileResourceHints();
        this.optimizeCSSForMobile();
    }

    /**
     * Ensure all interactive elements meet minimum touch target size
     */
    optimizeTouchTargets() {
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');

        interactiveElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const width = parseFloat(computedStyle.width) || element.offsetWidth;
            const height = parseFloat(computedStyle.height) || element.offsetHeight;
            const minSize = 44; // WCAG minimum touch target size

            if (width < minSize || height < minSize) {
                // Add CSS class for mobile touch target optimization
                element.classList.add('mobile-touch-target');

                // Inline styles for immediate effect
                if (!element.style.minWidth || parseFloat(element.style.minWidth) < minSize) {
                    element.style.minWidth = minSize + 'px';
                }
                if (!element.style.minHeight || parseFloat(element.style.minHeight) < minSize) {
                    element.style.minHeight = minSize + 'px';
                }
            }
        });
    }

    /**
     * Optimize images for mobile devices
     */
    optimizeImagesForMobile() {
        const images = document.querySelectorAll('img');

        images.forEach(img => {
            // Add mobile-specific loading strategies
            if (!img.hasAttribute('loading')) {
                // Prioritize above-the-fold images, lazy load others
                if (this.isAboveFold(img)) {
                    img.loading = 'eager';
                } else {
                    img.loading = 'lazy';
                }
            }

            // Add mobile-optimized sizes attribute if not present
            if (!img.hasAttribute('sizes')) {
                img.setAttribute('sizes', '(max-width: 768px) 100vw, 50vw');
            }

            // Reduce quality for mobile if high DPR
            if (window.devicePixelRatio > 1) {
                img.classList.add('mobile-high-dpr');
            }
        });
    }

    /**
     * Check if image is above the fold
     * @param {HTMLImageElement} img - Image element
     * @returns {boolean}
     */
    isAboveFold(img) {
        const rect = img.getBoundingClientRect();
        return rect.top < window.innerHeight;
    }

    /**
     * Add mobile-specific resource hints
     */
    addMobileResourceHints() {
        // DNS prefetch for common mobile domains
        const mobileDomains = [
            'fonts.gstatic.com',
            'fonts.googleapis.com',
            'www.google-analytics.com'
        ];

        mobileDomains.forEach(domain => {
            if (!document.querySelector(`link[rel="dns-prefetch"][href="//${domain}"]`)) {
                const link = document.createElement('link');
                link.rel = 'dns-prefetch';
                link.href = `//${domain}`;
                document.head.appendChild(link);
            }
        });

        // Preconnect to critical mobile resources
        const criticalResources = [
            { href: 'css/body.css', as: 'style' },
            { href: 'js/nav.js', as: 'script' }
        ];

        criticalResources.forEach(resource => {
            if (!document.querySelector(`link[rel="preload"][href="${resource.href}"]`)) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.href = resource.href;
                link.as = resource.as;
                if (resource.as === 'style') {
                    link.onload = () => link.rel = 'stylesheet';
                }
                document.head.appendChild(link);
            }
        });
    }

    /**
     * Optimize CSS loading for mobile-first approach
     */
    optimizeCSSForMobile() {
        // Ensure critical CSS is loaded first
        const criticalCSS = document.querySelector('link[rel="stylesheet"][href*="body.css"]');
        if (criticalCSS && !criticalCSS.hasAttribute('media')) {
            // Add media query to load critical CSS first on mobile
            criticalCSS.setAttribute('media', 'screen');
        }

        // Defer non-critical CSS
        const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"]:not([href*="body.css"])');
        nonCriticalCSS.forEach(link => {
            if (!link.hasAttribute('media')) {
                link.setAttribute('media', 'print');
                link.onload = () => {
                    link.media = 'all';
                    link.onload = null;
                };
            }
        });
    }

    /**
     * Get mobile SEO metrics
     * @returns {Object}
     */
    getMobileSEOMetrics() {
        return {
            isMobile: this.isMobile,
            viewportValid: this.validateViewportMeta().valid,
            touchTargets: this.getTouchTargetMetrics(),
            imagesOptimized: this.getImageOptimizationMetrics(),
            performanceMetrics: this.getMobilePerformanceMetrics()
        };
    }

    /**
     * Get touch target validation metrics
     * @returns {Object}
     */
    getTouchTargetMetrics() {
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
        const validTargets = Array.from(interactiveElements).filter(el => {
            const width = el.offsetWidth;
            const height = el.offsetHeight;
            return width >= 44 && height >= 44;
        });

        return {
            totalInteractiveElements: interactiveElements.length,
            validTouchTargets: validTargets.length,
            invalidTouchTargets: interactiveElements.length - validTargets.length
        };
    }

    /**
     * Get image optimization metrics for mobile
     * @returns {Object}
     */
    getImageOptimizationMetrics() {
        const images = document.querySelectorAll('img');
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        const sizedImages = document.querySelectorAll('img[sizes]');

        return {
            totalImages: images.length,
            lazyLoadedImages: lazyImages.length,
            responsiveImages: sizedImages.length
        };
    }

    /**
     * Get mobile performance metrics
     * @returns {Object}
     */
    getMobilePerformanceMetrics() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const connectionInfo = connection ? {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
        } : null;

        return {
            devicePixelRatio: window.devicePixelRatio,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            connection: connectionInfo,
            touchSupport: 'ontouchstart' in window
        };
    }
}

export default MobileSEOOptimizer;
