/**
 * Resource Preloading System
 * Handles critical resource identification and preloading
 */

class ResourcePreloader {
    constructor(options = {}) {
        this.options = {
            enableDNSPrefetch: true,
            enablePreconnect: true,
            enablePreload: true,
            enablePrefetch: true,
            criticalResourceTimeout: 5000,
            ...options
        };

        this.preloadedResources = new Set();
        this.criticalResources = new Map();
        this.init();
    }

    /**
     * Initialize the resource preloader
     */
    init() {
        this.identifyCriticalResources();
        this.setupDNSPrefetch();
        this.preloadCriticalResources();
        this.setupResourceHints();
    }

    /**
     * Identify critical resources for the current page
     */
    identifyCriticalResources() {
        // Critical CSS files
        this.addCriticalResource('/css/body.css', 'style', 'high');
        
        // Critical fonts (if any)
        const fontLinks = document.querySelectorAll('link[href*="font"]');
        fontLinks.forEach(link => {
            this.addCriticalResource(link.href, 'font', 'high');
        });

        // Critical JavaScript
        this.addCriticalResource('/js/nav.js', 'script', 'high');
        this.addCriticalResource('/js/dark-mode.js', 'script', 'high');

        // Page-specific critical resources
        this.identifyPageSpecificResources();

        // Critical images (above the fold)
        this.identifyCriticalImages();
    }

    /**
     * Identify page-specific critical resources
     */
    identifyPageSpecificResources() {
        const path = window.location.pathname;
        
        switch (path) {
            case '/':
            case '/index.html':
                this.addCriticalResource('/images/logo.webp', 'image', 'high');
                break;
            case '/news.html':
                this.addCriticalResource('/js/news-preview.js', 'script', 'medium');
                this.addCriticalResource('/css/news.css', 'style', 'medium');
                break;
            case '/portfolio.html':
                this.addCriticalResource('/js/portfolio.js', 'script', 'medium');
                this.addCriticalResource('/css/financials.css', 'style', 'medium');
                break;
            case '/media.html':
                this.addCriticalResource('/js/media.js', 'script', 'medium');
                this.addCriticalResource('/css/media.css', 'style', 'medium');
                break;
            case '/journal.html':
                this.addCriticalResource('/js/journal-feed.js', 'script', 'medium');
                this.addCriticalResource('/css/journal-tweets.css', 'style', 'medium');
                break;
        }
    }

    /**
     * Identify critical images (above the fold)
     */
    identifyCriticalImages() {
        const images = document.querySelectorAll('img');
        const viewportHeight = window.innerHeight;

        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            if (rect.top < viewportHeight) {
                const src = img.src || img.dataset.src;
                if (src) {
                    this.addCriticalResource(src, 'image', 'medium');
                }
            }
        });
    }

    /**
     * Add a critical resource to the preload queue
     * @param {string} url - Resource URL
     * @param {string} type - Resource type (style, script, font, image)
     * @param {string} priority - Priority level (high, medium, low)
     */
    addCriticalResource(url, type, priority = 'medium') {
        if (!this.criticalResources.has(url)) {
            this.criticalResources.set(url, { type, priority });
        }
    }

    /**
     * Setup DNS prefetch for external domains
     */
    setupDNSPrefetch() {
        if (!this.options.enableDNSPrefetch) return;

        const externalDomains = [
            'fonts.googleapis.com',
            'fonts.gstatic.com',
            'www.google-analytics.com',
            'www.googletagmanager.com'
        ];

        externalDomains.forEach(domain => {
            this.createResourceHint('dns-prefetch', `//${domain}`);
        });
    }

    /**
     * Preload critical resources
     */
    preloadCriticalResources() {
        if (!this.options.enablePreload) return;

        // Sort by priority
        const sortedResources = Array.from(this.criticalResources.entries())
            .sort(([, a], [, b]) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });

        sortedResources.forEach(([url, resource]) => {
            this.preloadResource(url, resource.type, resource.priority);
        });
    }

    /**
     * Preload a specific resource
     * @param {string} url - Resource URL
     * @param {string} type - Resource type
     * @param {string} priority - Priority level
     */
    preloadResource(url, type, priority) {
        if (this.preloadedResources.has(url)) return;

        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        
        // Set appropriate attributes based on resource type
        switch (type) {
            case 'style':
                link.as = 'style';
                break;
            case 'script':
                link.as = 'script';
                break;
            case 'font':
                link.as = 'font';
                link.type = 'font/woff2';
                link.crossOrigin = 'anonymous';
                break;
            case 'image':
                link.as = 'image';
                break;
        }

        // Set priority if supported
        if ('importance' in link) {
            link.importance = priority === 'high' ? 'high' : 'low';
        }

        // Add error handling
        link.onerror = () => {
            console.warn(`Failed to preload resource: ${url}`);
        };

        document.head.appendChild(link);
        this.preloadedResources.add(url);
    }

    /**
     * Setup additional resource hints
     */
    setupResourceHints() {
        // Preconnect to critical external domains
        if (this.options.enablePreconnect) {
            this.createResourceHint('preconnect', 'https://fonts.googleapis.com');
            this.createResourceHint('preconnect', 'https://fonts.gstatic.com', true);
        }

        // Prefetch likely next page resources
        if (this.options.enablePrefetch) {
            this.setupPrefetchHints();
        }
    }

    /**
     * Setup prefetch hints for likely next pages
     */
    setupPrefetchHints() {
        const currentPath = window.location.pathname;
        const prefetchCandidates = [];

        // Define likely navigation patterns
        const navigationPatterns = {
            '/': ['/news.html', '/portfolio.html'],
            '/index.html': ['/news.html', '/portfolio.html'],
            '/news.html': ['/portfolio.html', '/media.html'],
            '/portfolio.html': ['/news.html', '/media.html'],
            '/media.html': ['/journal.html', '/news.html'],
            '/journal.html': ['/news.html', '/media.html']
        };

        const candidates = navigationPatterns[currentPath] || [];
        candidates.forEach(url => {
            this.createResourceHint('prefetch', url);
        });

        // Prefetch resources for likely next pages
        this.prefetchNextPageResources(candidates);
    }

    /**
     * Prefetch resources for likely next pages
     * @param {string[]} nextPages - Array of likely next page URLs
     */
    prefetchNextPageResources(nextPages) {
        nextPages.forEach(page => {
            // Prefetch page-specific CSS and JS
            const baseName = page.replace('.html', '');
            const cssFile = `/css${baseName}.css`;
            const jsFile = `/js${baseName}.js`;

            // Check if these files exist before prefetching
            this.prefetchIfExists(cssFile, 'style');
            this.prefetchIfExists(jsFile, 'script');
        });
    }

    /**
     * Prefetch a resource if it exists
     * @param {string} url - Resource URL
     * @param {string} type - Resource type
     */
    async prefetchIfExists(url, type) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
                this.createResourceHint('prefetch', url, false, type);
            }
        } catch (error) {
            // Resource doesn't exist or network error, skip prefetch
        }
    }

    /**
     * Create a resource hint element
     * @param {string} rel - Relationship type
     * @param {string} href - Resource URL
     * @param {boolean} crossorigin - Whether to add crossorigin attribute
     * @param {string} as - Resource type for prefetch
     */
    createResourceHint(rel, href, crossorigin = false, as = null) {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        
        if (crossorigin) {
            link.crossOrigin = 'anonymous';
        }
        
        if (as) {
            link.as = as;
        }

        document.head.appendChild(link);
    }

    /**
     * Preload critical CSS and inline it
     * @param {string[]} cssUrls - Array of critical CSS URLs
     */
    async preloadAndInlineCriticalCSS(cssUrls) {
        const promises = cssUrls.map(async (url) => {
            try {
                const response = await fetch(url);
                const css = await response.text();
                return { url, css };
            } catch (error) {
                console.warn(`Failed to fetch critical CSS: ${url}`, error);
                return null;
            }
        });

        const results = await Promise.all(promises);
        const validResults = results.filter(result => result !== null);

        if (validResults.length > 0) {
            this.inlineCriticalCSS(validResults);
        }
    }

    /**
     * Inline critical CSS in the document head
     * @param {Array} cssData - Array of CSS data objects
     */
    inlineCriticalCSS(cssData) {
        const style = document.createElement('style');
        style.textContent = cssData.map(data => data.css).join('\n');
        style.setAttribute('data-critical-css', 'true');
        
        // Insert before any existing stylesheets
        const firstLink = document.querySelector('link[rel="stylesheet"]');
        if (firstLink) {
            document.head.insertBefore(style, firstLink);
        } else {
            document.head.appendChild(style);
        }

        // Load the original stylesheets asynchronously
        cssData.forEach(data => {
            this.loadStylesheetAsync(data.url);
        });
    }

    /**
     * Load stylesheet asynchronously
     * @param {string} url - Stylesheet URL
     */
    loadStylesheetAsync(url) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.media = 'print';
        link.onload = () => {
            link.media = 'all';
        };
        document.head.appendChild(link);
    }

    /**
     * Monitor resource loading performance
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');

        const criticalResourceMetrics = Array.from(this.criticalResources.keys())
            .map(url => {
                const resource = resources.find(r => r.name.includes(url));
                return resource ? {
                    url,
                    loadTime: resource.responseEnd - resource.startTime,
                    size: resource.transferSize
                } : null;
            })
            .filter(Boolean);

        return {
            preloadedCount: this.preloadedResources.size,
            criticalResourcesCount: this.criticalResources.size,
            criticalResourceMetrics,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart
        };
    }

    /**
     * Optimize resource loading based on connection type
     */
    optimizeForConnection() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            const effectiveType = connection.effectiveType;

            // Adjust preloading strategy based on connection
            switch (effectiveType) {
                case 'slow-2g':
                case '2g':
                    // Minimal preloading for slow connections
                    this.options.enablePrefetch = false;
                    break;
                case '3g':
                    // Moderate preloading
                    this.options.enablePrefetch = true;
                    break;
                case '4g':
                    // Aggressive preloading for fast connections
                    this.options.enablePrefetch = true;
                    break;
            }
        }
    }

    /**
     * Clean up preloaded resources
     */
    cleanup() {
        // Remove prefetch links after they're no longer needed
        const prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
        prefetchLinks.forEach(link => {
            setTimeout(() => {
                if (link.parentNode) {
                    link.parentNode.removeChild(link);
                }
            }, 30000); // Remove after 30 seconds
        });
    }
}

export default ResourcePreloader;