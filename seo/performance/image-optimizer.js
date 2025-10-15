/**
 * Image Optimization System
 * Handles WebP conversion, responsive sizing, and lazy loading
 */

class ImageOptimizer {
    constructor() {
        this.webpSupport = null;
        this.lazyLoadObserver = null;
        this.init();
    }

    /**
     * Initialize the image optimization system
     */
    init() {
        this.detectWebPSupport();
        this.setupLazyLoading();
        this.optimizeExistingImages();
    }

    /**
     * Detect WebP support in the browser
     * @returns {Promise<boolean>}
     */
    async detectWebPSupport() {
        if (this.webpSupport !== null) {
            return this.webpSupport;
        }

        return new Promise((resolve) => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                this.webpSupport = (webP.height === 2);
                resolve(this.webpSupport);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    /**
     * Setup lazy loading for images
     */
    setupLazyLoading() {
        // Check for Intersection Observer support
        if (!('IntersectionObserver' in window)) {
            // Fallback: load all images immediately
            this.loadAllImages();
            return;
        }

        const options = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        };

        this.lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.lazyLoadObserver.unobserve(entry.target);
                }
            });
        }, options);

        // Observe all lazy images
        this.observeLazyImages();
    }

    /**
     * Observe all images marked for lazy loading
     */
    observeLazyImages() {
        const lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');
        lazyImages.forEach(img => {
            this.lazyLoadObserver.observe(img);
        });
    }

    /**
     * Load a specific image
     * @param {HTMLImageElement} img - The image element to load
     */
    async loadImage(img) {
        const src = img.dataset.src || img.src;
        const optimizedSrc = await this.getOptimizedImageSrc(src, img);
        
        // Create a new image to preload
        const imageLoader = new Image();
        
        imageLoader.onload = () => {
            img.src = optimizedSrc;
            img.classList.add('loaded');
            img.removeAttribute('data-src');
        };

        imageLoader.onerror = () => {
            // Fallback to original source
            img.src = src;
            img.classList.add('loaded', 'error');
        };

        imageLoader.src = optimizedSrc;
    }

    /**
     * Get optimized image source with WebP support and responsive sizing
     * @param {string} originalSrc - Original image source
     * @param {HTMLImageElement} img - Image element for context
     * @returns {Promise<string>}
     */
    async getOptimizedImageSrc(originalSrc, img) {
        const webpSupported = await this.detectWebPSupport();
        
        // Generate WebP version if supported
        if (webpSupported && this.shouldUseWebP(originalSrc)) {
            const webpSrc = this.generateWebPSrc(originalSrc);
            if (await this.imageExists(webpSrc)) {
                return this.getResponsiveSrc(webpSrc, img);
            }
        }

        return this.getResponsiveSrc(originalSrc, img);
    }

    /**
     * Check if WebP should be used for this image
     * @param {string} src - Image source
     * @returns {boolean}
     */
    shouldUseWebP(src) {
        const extension = src.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png'].includes(extension);
    }

    /**
     * Generate WebP source URL
     * @param {string} originalSrc - Original image source
     * @returns {string}
     */
    generateWebPSrc(originalSrc) {
        const lastDotIndex = originalSrc.lastIndexOf('.');
        if (lastDotIndex === -1) return originalSrc;
        
        return originalSrc.substring(0, lastDotIndex) + '.webp';
    }

    /**
     * Get responsive image source based on viewport and device pixel ratio
     * @param {string} src - Base image source
     * @param {HTMLImageElement} img - Image element
     * @returns {string}
     */
    getResponsiveSrc(src, img) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const imgWidth = img.offsetWidth || img.getAttribute('width') || 300;
        const targetWidth = Math.ceil(imgWidth * devicePixelRatio);

        // Define responsive breakpoints
        const breakpoints = [320, 640, 768, 1024, 1280, 1920];
        const optimalWidth = breakpoints.find(bp => bp >= targetWidth) || breakpoints[breakpoints.length - 1];

        // Check if responsive versions exist
        const responsiveSrc = this.generateResponsiveSrc(src, optimalWidth);
        return responsiveSrc;
    }

    /**
     * Generate responsive image source
     * @param {string} src - Original source
     * @param {number} width - Target width
     * @returns {string}
     */
    generateResponsiveSrc(src, width) {
        // For now, return original src
        // In a real implementation, this would generate URLs for different sizes
        // e.g., /images/photo_640w.jpg, /images/photo_1024w.jpg
        return src;
    }

    /**
     * Check if an image exists
     * @param {string} src - Image source to check
     * @returns {Promise<boolean>}
     */
    imageExists(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        });
    }

    /**
     * Load all images immediately (fallback for no Intersection Observer)
     */
    loadAllImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
        });
    }

    /**
     * Optimize existing images on the page
     */
    optimizeExistingImages() {
        const images = document.querySelectorAll('img:not([data-src]):not([loading="lazy"])');
        images.forEach(img => {
            // Add loading="lazy" to images below the fold
            if (this.isBelowFold(img)) {
                img.loading = 'lazy';
            }
        });
    }

    /**
     * Check if an element is below the fold
     * @param {HTMLElement} element - Element to check
     * @returns {boolean}
     */
    isBelowFold(element) {
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        return rect.top > viewportHeight;
    }

    /**
     * Add responsive image attributes to an image element
     * @param {HTMLImageElement} img - Image element
     * @param {Object} options - Configuration options
     */
    makeImageResponsive(img, options = {}) {
        const {
            sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
            breakpoints = [320, 640, 768, 1024, 1280, 1920]
        } = options;

        const src = img.src || img.dataset.src;
        if (!src) return;

        // Generate srcset for different breakpoints
        const srcset = breakpoints
            .map(width => `${this.generateResponsiveSrc(src, width)} ${width}w`)
            .join(', ');

        img.setAttribute('srcset', srcset);
        img.setAttribute('sizes', sizes);
    }

    /**
     * Preload critical images
     * @param {string[]} imageSrcs - Array of image sources to preload
     */
    preloadCriticalImages(imageSrcs) {
        imageSrcs.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }

    /**
     * Get performance metrics for images
     * @returns {Object}
     */
    getImagePerformanceMetrics() {
        const images = document.querySelectorAll('img');
        const metrics = {
            totalImages: images.length,
            lazyImages: document.querySelectorAll('img[loading="lazy"], img[data-src]').length,
            loadedImages: document.querySelectorAll('img.loaded').length,
            errorImages: document.querySelectorAll('img.error').length,
            webpSupport: this.webpSupport
        };

        return metrics;
    }
}

export default ImageOptimizer;