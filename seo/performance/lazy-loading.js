/**
 * Lazy Loading Utilities
 * Advanced lazy loading for images and content
 */

class LazyLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '50px',
            threshold: 0.1,
            enableNativeLazyLoading: true,
            fallbackDelay: 100,
            ...options
        };

        this.observer = null;
        this.init();
    }

    /**
     * Initialize lazy loading system
     */
    init() {
        // Check for native lazy loading support
        if (this.options.enableNativeLazyLoading && 'loading' in HTMLImageElement.prototype) {
            this.setupNativeLazyLoading();
        } else {
            this.setupIntersectionObserver();
        }
    }

    /**
     * Setup native lazy loading for supported browsers
     */
    setupNativeLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            img.loading = 'lazy';
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });

        // Still use Intersection Observer for other elements
        this.setupIntersectionObserver();
    }

    /**
     * Setup Intersection Observer for lazy loading
     */
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            this.fallbackLoading();
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadElement(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: this.options.rootMargin,
            threshold: this.options.threshold
        });

        this.observeElements();
    }

    /**
     * Observe all lazy-loadable elements
     */
    observeElements() {
        // Images
        const lazyImages = document.querySelectorAll('img[data-src]:not([loading="lazy"])');
        lazyImages.forEach(img => this.observer.observe(img));

        // Background images
        const lazyBackgrounds = document.querySelectorAll('[data-bg]');
        lazyBackgrounds.forEach(el => this.observer.observe(el));

        // Iframes
        const lazyIframes = document.querySelectorAll('iframe[data-src]');
        lazyIframes.forEach(iframe => this.observer.observe(iframe));

        // Custom content sections
        const lazyContent = document.querySelectorAll('[data-lazy-content]');
        lazyContent.forEach(el => this.observer.observe(el));
    }

    /**
     * Load a specific element
     * @param {HTMLElement} element - Element to load
     */
    loadElement(element) {
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
            case 'img':
                this.loadImage(element);
                break;
            case 'iframe':
                this.loadIframe(element);
                break;
            default:
                this.loadGenericElement(element);
        }
    }

    /**
     * Load an image element
     * @param {HTMLImageElement} img - Image element
     */
    loadImage(img) {
        const src = img.dataset.src;
        if (!src) return;

        // Create a new image to preload
        const imageLoader = new Image();
        
        imageLoader.onload = () => {
            img.src = src;
            img.classList.add('lazy-loaded');
            img.removeAttribute('data-src');
            this.triggerEvent(img, 'lazyloaded');
        };

        imageLoader.onerror = () => {
            img.classList.add('lazy-error');
            this.triggerEvent(img, 'lazyerror');
        };

        img.classList.add('lazy-loading');
        imageLoader.src = src;
    }

    /**
     * Load an iframe element
     * @param {HTMLIFrameElement} iframe - Iframe element
     */
    loadIframe(iframe) {
        const src = iframe.dataset.src;
        if (!src) return;

        iframe.src = src;
        iframe.classList.add('lazy-loaded');
        iframe.removeAttribute('data-src');
        this.triggerEvent(iframe, 'lazyloaded');
    }

    /**
     * Load a generic element (background images, content)
     * @param {HTMLElement} element - Element to load
     */
    loadGenericElement(element) {
        // Handle background images
        if (element.dataset.bg) {
            element.style.backgroundImage = `url(${element.dataset.bg})`;
            element.removeAttribute('data-bg');
        }

        // Handle lazy content
        if (element.dataset.lazyContent) {
            this.loadLazyContent(element);
        }

        element.classList.add('lazy-loaded');
        this.triggerEvent(element, 'lazyloaded');
    }

    /**
     * Load lazy content for an element
     * @param {HTMLElement} element - Element with lazy content
     */
    async loadLazyContent(element) {
        const contentUrl = element.dataset.lazyContent;
        if (!contentUrl) return;

        try {
            const response = await fetch(contentUrl);
            const content = await response.text();
            element.innerHTML = content;
            element.removeAttribute('data-lazy-content');
        } catch (error) {
            console.error('Failed to load lazy content:', error);
            element.classList.add('lazy-error');
        }
    }

    /**
     * Fallback loading for browsers without Intersection Observer
     */
    fallbackLoading() {
        setTimeout(() => {
            const lazyElements = document.querySelectorAll('[data-src], [data-bg], [data-lazy-content]');
            lazyElements.forEach(element => this.loadElement(element));
        }, this.options.fallbackDelay);
    }

    /**
     * Trigger custom event on element
     * @param {HTMLElement} element - Target element
     * @param {string} eventName - Event name
     */
    triggerEvent(element, eventName) {
        const event = new CustomEvent(eventName, {
            bubbles: true,
            detail: { element }
        });
        element.dispatchEvent(event);
    }

    /**
     * Add new elements to lazy loading
     * @param {HTMLElement|NodeList} elements - Elements to observe
     */
    observe(elements) {
        if (!this.observer) return;

        const elementList = elements instanceof NodeList ? elements : [elements];
        elementList.forEach(element => {
            if (element instanceof HTMLElement) {
                this.observer.observe(element);
            }
        });
    }

    /**
     * Remove elements from lazy loading observation
     * @param {HTMLElement|NodeList} elements - Elements to unobserve
     */
    unobserve(elements) {
        if (!this.observer) return;

        const elementList = elements instanceof NodeList ? elements : [elements];
        elementList.forEach(element => {
            if (element instanceof HTMLElement) {
                this.observer.unobserve(element);
            }
        });
    }

    /**
     * Load all remaining lazy elements immediately
     */
    loadAll() {
        const lazyElements = document.querySelectorAll('[data-src], [data-bg], [data-lazy-content]');
        lazyElements.forEach(element => {
            this.loadElement(element);
            if (this.observer) {
                this.observer.unobserve(element);
            }
        });
    }

    /**
     * Get lazy loading statistics
     * @returns {Object}
     */
    getStats() {
        return {
            totalLazyElements: document.querySelectorAll('[data-src], [data-bg], [data-lazy-content]').length,
            loadedElements: document.querySelectorAll('.lazy-loaded').length,
            errorElements: document.querySelectorAll('.lazy-error').length,
            loadingElements: document.querySelectorAll('.lazy-loading').length,
            observerSupport: 'IntersectionObserver' in window,
            nativeLazyLoadingSupport: 'loading' in HTMLImageElement.prototype
        };
    }

    /**
     * Destroy the lazy loader and clean up
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

export default LazyLoader;