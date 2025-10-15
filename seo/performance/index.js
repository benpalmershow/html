/**
 * Performance Optimization System
 * Main entry point for all performance optimization features
 */

import ImageOptimizer from './image-optimizer.js';
import LazyLoader from './lazy-loading.js';
import ResourcePreloader from './resource-preloader.js';
import PerformanceMonitor from './performance-monitor.js';

class PerformanceOptimizer {
    constructor(options = {}) {
        this.options = {
            enableImageOptimization: true,
            enableLazyLoading: true,
            enableResourcePreloading: true,
            enablePerformanceMonitoring: true,
            ...options
        };

        this.imageOptimizer = null;
        this.lazyLoader = null;
        this.resourcePreloader = null;
        this.performanceMonitor = null;

        this.init();
    }

    /**
     * Initialize all performance optimization systems
     */
    init() {
        // Initialize performance monitoring first to track everything
        if (this.options.enablePerformanceMonitoring) {
            this.performanceMonitor = new PerformanceMonitor(this.options.performanceMonitor);
        }

        // Initialize resource preloading early
        if (this.options.enableResourcePreloading) {
            this.resourcePreloader = new ResourcePreloader(this.options.resourcePreloader);
        }

        // Initialize image optimization
        if (this.options.enableImageOptimization) {
            this.imageOptimizer = new ImageOptimizer(this.options.imageOptimizer);
        }

        // Initialize lazy loading
        if (this.options.enableLazyLoading) {
            this.lazyLoader = new LazyLoader(this.options.lazyLoader);
        }

        // Setup performance optimization event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for performance optimization
     */
    setupEventListeners() {
        // Listen for new content being added to the page
        document.addEventListener('DOMContentLoaded', () => {
            this.optimizeNewContent();
        });

        // Listen for dynamic content changes
        if ('MutationObserver' in window) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        this.optimizeNewNodes(mutation.addedNodes);
                    }
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Listen for performance metric events
        window.addEventListener('performanceMetric', (event) => {
            this.handlePerformanceMetric(event.detail);
        });
    }

    /**
     * Optimize newly added content
     */
    optimizeNewContent() {
        if (this.imageOptimizer) {
            this.imageOptimizer.optimizeExistingImages();
        }

        if (this.lazyLoader) {
            this.lazyLoader.observeElements();
        }
    }

    /**
     * Optimize newly added DOM nodes
     * @param {NodeList} nodes - Newly added nodes
     */
    optimizeNewNodes(nodes) {
        nodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Optimize images in new content
                const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
                images.forEach(img => {
                    if (this.imageOptimizer) {
                        this.imageOptimizer.makeImageResponsive(img);
                    }
                    if (this.lazyLoader) {
                        this.lazyLoader.observe(img);
                    }
                });

                // Handle the node itself if it's an image
                if (node.tagName === 'IMG') {
                    if (this.imageOptimizer) {
                        this.imageOptimizer.makeImageResponsive(node);
                    }
                    if (this.lazyLoader) {
                        this.lazyLoader.observe(node);
                    }
                }
            }
        });
    }

    /**
     * Handle performance metric events
     * @param {Object} metric - Performance metric data
     */
    handlePerformanceMetric(metric) {
        // Log performance issues
        if (metric.name === 'LCP' && metric.value > 2500) {
            console.warn('Poor LCP detected:', metric.value);
        }
        
        if (metric.name === 'CLS' && metric.value > 0.1) {
            console.warn('Poor CLS detected:', metric.value);
        }
    }

    /**
     * Get comprehensive performance report
     * @returns {Object}
     */
    getPerformanceReport() {
        const report = {
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        if (this.performanceMonitor) {
            report.metrics = this.performanceMonitor.getPerformanceSummary();
        }

        if (this.imageOptimizer) {
            report.images = this.imageOptimizer.getImagePerformanceMetrics();
        }

        if (this.lazyLoader) {
            report.lazyLoading = this.lazyLoader.getStats();
        }

        if (this.resourcePreloader) {
            report.resources = this.resourcePreloader.getPerformanceMetrics();
        }

        return report;
    }

    /**
     * Optimize page for specific performance targets
     * @param {Object} targets - Performance targets
     */
    optimizeForTargets(targets = {}) {
        const defaultTargets = {
            LCP: 2500,
            FID: 100,
            CLS: 0.1,
            imageLoadTime: 1000
        };

        const optimizationTargets = { ...defaultTargets, ...targets };

        // Adjust image optimization based on targets
        if (this.imageOptimizer && optimizationTargets.imageLoadTime < 1000) {
            // More aggressive image optimization for faster targets
            this.imageOptimizer.preloadCriticalImages([
                '/images/logo.webp',
                '/images/favicon.ico'
            ]);
        }

        // Adjust lazy loading thresholds
        if (this.lazyLoader && optimizationTargets.LCP < 2000) {
            // Reduce lazy loading threshold for better LCP
            this.lazyLoader.options.rootMargin = '100px';
        }
    }

    /**
     * Run performance audit
     * @returns {Promise<Object>}
     */
    async runPerformanceAudit() {
        const audit = {
            timestamp: Date.now(),
            checks: []
        };

        // Check image optimization
        if (this.imageOptimizer) {
            const imageMetrics = this.imageOptimizer.getImagePerformanceMetrics();
            audit.checks.push({
                category: 'images',
                status: imageMetrics.webpSupport ? 'pass' : 'warning',
                message: imageMetrics.webpSupport ? 'WebP support detected' : 'WebP not supported',
                metrics: imageMetrics
            });
        }

        // Check lazy loading implementation
        if (this.lazyLoader) {
            const lazyStats = this.lazyLoader.getStats();
            const lazyLoadingRatio = lazyStats.totalLazyElements > 0 ? 
                lazyStats.loadedElements / lazyStats.totalLazyElements : 1;
            
            audit.checks.push({
                category: 'lazy-loading',
                status: lazyLoadingRatio > 0.8 ? 'pass' : 'warning',
                message: `${Math.round(lazyLoadingRatio * 100)}% of lazy elements loaded`,
                metrics: lazyStats
            });
        }

        // Check performance metrics
        if (this.performanceMonitor) {
            const summary = this.performanceMonitor.getPerformanceSummary();
            const coreWebVitalsPass = Object.values(summary.coreWebVitals)
                .every(metric => metric.status === 'good');
            
            audit.checks.push({
                category: 'core-web-vitals',
                status: coreWebVitalsPass ? 'pass' : 'fail',
                message: coreWebVitalsPass ? 'All Core Web Vitals pass' : 'Some Core Web Vitals need improvement',
                metrics: summary
            });
        }

        return audit;
    }

    /**
     * Clean up all performance optimization systems
     */
    cleanup() {
        if (this.performanceMonitor) {
            this.performanceMonitor.cleanup();
        }
        
        if (this.lazyLoader) {
            this.lazyLoader.destroy();
        }
        
        if (this.resourcePreloader) {
            this.resourcePreloader.cleanup();
        }
    }
}

// Export individual classes for granular usage
export {
    ImageOptimizer,
    LazyLoader,
    ResourcePreloader,
    PerformanceMonitor
};

// Export main class as default
export default PerformanceOptimizer;