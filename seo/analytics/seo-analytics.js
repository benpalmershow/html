/**
 * SEO Analytics Enhancement
 * Enhanced Google Analytics 4 tracking for SEO performance monitoring
 */

class SEOAnalytics {
    constructor() {
        this.initialized = false;
        this.seoMetrics = {};
        this.init();
    }

    /**
     * Initialize SEO analytics tracking
     */
    init() {
        if (this.initialized || typeof gtag === 'undefined') {
            return;
        }

        this.initialized = true;
        this.setupCustomDimensions();
        this.trackPageLoadMetrics();
        this.trackSEOHealthMetrics();
        this.setupEventListeners();
    }

    /**
     * Set up custom dimensions for SEO tracking
     */
    setupCustomDimensions() {
        // Configure custom dimensions in GA4
        // Note: These need to be set up in GA4 interface first
        gtag('config', 'G-DWEVPGLJDP', {
            custom_map: {
                'custom_parameter_1': 'page_type',
                'custom_parameter_2': 'seo_score',
                'custom_parameter_3': 'structured_data_count',
                'custom_parameter_4': 'mobile_optimized',
                'custom_parameter_5': 'core_web_vitals_score'
            }
        });
    }

    /**
     * Track page load performance metrics
     */
    trackPageLoadMetrics() {
        // Track Core Web Vitals
        if ('web-vitals' in window) {
            import('https://unpkg.com/web-vitals@3?module').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
                getCLS(this.trackWebVital.bind(this, 'CLS'));
                getFID(this.trackWebVital.bind(this, 'FID'));
                getFCP(this.trackWebVital.bind(this, 'FCP'));
                getLCP(this.trackWebVital.bind(this, 'LCP'));
                getTTFB(this.trackWebVital.bind(this, 'TTFB'));
            });
        } else {
            // Fallback: Track basic performance metrics
            this.trackBasicPerformanceMetrics();
        }

        // Track SEO-related page metrics
        this.trackSEOPageMetrics();
    }

    /**
     * Track individual Core Web Vital
     * @param {string} name - Metric name
     * @param {Object} metric - Metric data
     */
    trackWebVital(name, metric) {
        gtag('event', 'web_vitals', {
            event_category: 'Web Vitals',
            event_label: name,
            value: Math.round(metric.value * 1000), // Convert to milliseconds
            custom_parameter_5: this.getCoreWebVitalsScore(name, metric.value),
            non_interaction: true
        });

        this.seoMetrics[`${name}_score`] = metric.value;
    }

    /**
     * Get Core Web Vitals score rating
     * @param {string} name - Metric name
     * @param {number} value - Metric value
     * @returns {string} Score rating
     */
    getCoreWebVitalsScore(name, value) {
        const thresholds = {
            CLS: { good: 0.1, poor: 0.25 },
            FID: { good: 100, poor: 300 },
            FCP: { good: 1800, poor: 3000 },
            LCP: { good: 2500, poor: 4000 },
            TTFB: { good: 800, poor: 1800 }
        };

        const threshold = thresholds[name];
        if (!threshold) return 'unknown';

        if (value <= threshold.good) return 'good';
        if (value <= threshold.poor) return 'needs-improvement';
        return 'poor';
    }

    /**
     * Track basic performance metrics as fallback
     */
    trackBasicPerformanceMetrics() {
        if ('performance' in window && 'getEntriesByType' in performance) {
            window.addEventListener('load', () => {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    gtag('event', 'page_load_time', {
                        event_category: 'Performance',
                        event_label: 'DOM Content Loaded',
                        value: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
                        non_interaction: true
                    });
                }
            });
        }
    }

    /**
     * Track SEO-specific page metrics
     */
    trackSEOPageMetrics() {
        // Determine page type
        const pageType = this.getPageType();
        const seoScore = this.calculateSEOScore();

        gtag('event', 'seo_page_metrics', {
            event_category: 'SEO',
            event_label: pageType,
            custom_parameter_1: pageType,
            custom_parameter_2: seoScore,
            non_interaction: true
        });

        this.seoMetrics.page_type = pageType;
        this.seoMetrics.seo_score = seoScore;
    }

    /**
     * Determine the page type based on URL and content
     * @returns {string} Page type
     */
    getPageType() {
        const path = window.location.pathname;

        if (path === '/' || path.includes('index')) return 'homepage';
        if (path.includes('news')) return 'news';
        if (path.includes('portfolio') || path.includes('financials')) return 'portfolio';
        if (path.includes('media')) return 'media';
        if (path.includes('journal')) return 'journal';
        if (path.includes('post-creator')) return 'admin';

        return 'content';
    }

    /**
     * Calculate basic SEO score for the page
     * @returns {number} SEO score (0-100)
     */
    calculateSEOScore() {
        let score = 100;
        let deductions = 0;

        // Check for title tag
        if (!document.title || document.title.length < 30) {
            deductions += 10;
        }

        // Check for meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc || metaDesc.getAttribute('content').length < 120) {
            deductions += 10;
        }

        // Check for H1 tag
        if (!document.querySelector('h1')) {
            deductions += 15;
        }

        // Check for alt text on images
        const images = document.querySelectorAll('img');
        const imagesWithoutAlt = Array.from(images).filter(img => !img.getAttribute('alt'));
        if (imagesWithoutAlt.length > 0) {
            deductions += Math.min(imagesWithoutAlt.length * 5, 20);
        }

        // Check for structured data
        const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
        if (structuredData.length === 0) {
            deductions += 10;
        }

        return Math.max(0, score - deductions);
    }

    /**
     * Track SEO health metrics
     */
    trackSEOHealthMetrics() {
        // Track structured data presence
        const structuredDataCount = document.querySelectorAll('script[type="application/ld+json"]').length;
        this.seoMetrics.structured_data_count = structuredDataCount;

        // Track mobile optimization
        const viewport = document.querySelector('meta[name="viewport"]');
        const isMobileOptimized = viewport && viewport.getAttribute('content').includes('width=device-width');
        this.seoMetrics.mobile_optimized = isMobileOptimized;

        // Send SEO health event
        gtag('event', 'seo_health_check', {
            event_category: 'SEO',
            event_label: 'Page Health',
            custom_parameter_3: structuredDataCount,
            custom_parameter_4: isMobileOptimized ? 'yes' : 'no',
            non_interaction: true
        });
    }

    /**
     * Set up event listeners for SEO-related interactions
     */
    setupEventListeners() {
        // Track social sharing clicks
        this.trackSocialSharing();

        // Track search interactions
        this.trackSearchInteractions();

        // Track content engagement
        this.trackContentEngagement();

        // Track SEO-related errors
        this.trackSEOErrors();
    }

    /**
     * Track social sharing interactions
     */
    trackSocialSharing() {
        // Track clicks on social links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href*="twitter.com"], a[href*="facebook.com"], a[href*="linkedin.com"], a[href*="youtube.com"]');
            if (link) {
                const platform = this.getSocialPlatform(link.href);
                gtag('event', 'social_share', {
                    event_category: 'Social',
                    event_label: platform,
                    transport_type: 'beacon'
                });
            }
        });
    }

    /**
     * Get social platform from URL
     * @param {string} url - Social URL
     * @returns {string} Platform name
     */
    getSocialPlatform(url) {
        if (url.includes('twitter.com')) return 'Twitter';
        if (url.includes('facebook.com')) return 'Facebook';
        if (url.includes('linkedin.com')) return 'LinkedIn';
        if (url.includes('youtube.com')) return 'YouTube';
        if (url.includes('substack.com')) return 'Substack';
        return 'Other';
    }

    /**
     * Track search interactions
     */
    trackSearchInteractions() {
        // Track search form submissions (if any)
        const searchForms = document.querySelectorAll('form[action*="search"]');
        searchForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const input = form.querySelector('input[type="search"], input[name="q"]');
                if (input) {
                    gtag('event', 'search', {
                        event_category: 'Search',
                        event_label: input.value,
                        search_term: input.value
                    });
                }
            });
        });
    }

    /**
     * Track content engagement metrics
     */
    trackContentEngagement() {
        // Track time spent on page
        let startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            const timeSpent = Math.round((Date.now() - startTime) / 1000);
            gtag('event', 'page_engagement', {
                event_category: 'Engagement',
                event_label: 'Time on Page',
                value: timeSpent,
                non_interaction: true
            });
        });

        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollPercent = Math.round((scrollTop + windowHeight) / documentHeight * 100);

            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
            }
        });

        // Send scroll depth on page unload
        window.addEventListener('beforeunload', () => {
            if (maxScroll > 0) {
                gtag('event', 'scroll_depth', {
                    event_category: 'Engagement',
                    event_label: 'Max Scroll',
                    value: maxScroll,
                    non_interaction: true
                });
            }
        });
    }

    /**
     * Track SEO-related errors and issues
     */
    trackSEOErrors() {
        // Track JavaScript errors that might affect SEO
        window.addEventListener('error', (e) => {
            gtag('event', 'javascript_error', {
                event_category: 'SEO',
                event_label: 'JavaScript Error',
                description: `${e.message} at ${e.filename}:${e.lineno}`,
                non_interaction: true
            });
        });

        // Track missing resources (404s)
        window.addEventListener('error', (e) => {
            if (e.target && e.target.tagName === 'IMG') {
                gtag('event', 'missing_resource', {
                    event_category: 'SEO',
                    event_label: 'Missing Image',
                    description: e.target.src,
                    non_interaction: true
                });
            }
        }, true);
    }

    /**
     * Track custom SEO events
     * @param {string} eventName - Event name
     * @param {Object} parameters - Event parameters
     */
    trackSEOEvent(eventName, parameters = {}) {
        gtag('event', eventName, {
            event_category: 'SEO',
            ...parameters
        });
    }

    /**
     * Get current SEO metrics
     * @returns {Object} SEO metrics
     */
    getSEOMetrics() {
        return {
            ...this.seoMetrics,
            timestamp: Date.now(),
            url: window.location.href
        };
    }
}

export default SEOAnalytics;
