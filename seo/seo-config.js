/**
 * Unified SEO Configuration System
 * Centralized configuration for all SEO settings and utilities
 */

class SEOConfig {
    constructor() {
        this.config = {
            site: {
                name: 'Howdy, Stranger',
                url: 'https://howdystranger.net',
                description: 'Independent commentary, news, and economic insight from The Ben Palmer Show',
                author: 'Ben Palmer',
                language: 'en-US',
                themeColor: '#2c5f5a'
            },
            social: {
                twitter: '@DocRiter',
                youtube: 'https://www.youtube.com/@BenPalmerShow',
                substack: 'https://benpalmershow.substack.com',
                spotify: 'https://open.spotify.com/show/5re4DaXRuEkKHEYr3Mc6tJ',
                apple: 'https://podcasts.apple.com/us/podcast/the-ben-palmer-show/id1529618289',
                buyMeCoffee: 'https://www.buymeacoffee.com/howdystranger'
            },
            analytics: {
                googleAnalyticsId: 'G-DWEVPGLJDP',
                enableCoreWebVitals: true,
                enableSocialTracking: true,
                enableContentEngagement: true,
                enableErrorTracking: true
            },
            searchConsole: {
                googleVerification: 'PLACEHOLDER_GOOGLE_VERIFICATION_CODE',
                bingVerification: 'PLACEHOLDER_BING_VERIFICATION_CODE',
                yandexVerification: 'PLACEHOLDER_YANDEX_VERIFICATION_CODE'
            },
            monitoring: {
                enableAutomatedAudits: true,
                auditInterval: 3600000, // 1 hour
                enableRegressionDetection: true,
                baselineUpdateThreshold: 5 // 5 point improvement
            },
            performance: {
                enableLazyLoading: true,
                enableImageOptimization: true,
                enableResourcePreloading: true,
                enableMobileOptimization: true
            },
            content: {
                enableSchemaMarkup: true,
                enableBreadcrumbNavigation: true,
                enableStructuredData: true
            }
        };

        this.pageConfigs = {
            'index.html': {
                title: 'Howdy, Stranger - Independent Commentary & Economic Insight',
                description: 'Human-curated content, independent commentary, news, and economic insight from The Ben Palmer Show. Get unbiased analysis on markets, policy, and current events.',
                keywords: 'economic analysis, independent commentary, financial news, market insights, Ben Palmer Show, economic commentary, financial analysis, market trends, investment insights, policy analysis',
                ogImage: '/images/og-homepage.jpg',
                type: 'website'
            },
            'news.html': {
                title: 'News & Analysis - The Ben Palmer Show',
                description: 'Breaking news and latest headlines - The Ben Palmer Show hosted by HowdyStranger.',
                keywords: 'news, analysis, breaking news, headlines, Ben Palmer Show',
                ogImage: '/images/og-news.jpg',
                type: 'website'
            },
            'financials.html': {
                title: 'Financial Data & Market Analysis - The Ben Palmer Show',
                description: 'Economic indicators, financial data, and market trends analysis from The Ben Palmer Show.',
                keywords: 'financial data, market analysis, economic indicators, financials, market trends',
                ogImage: '/images/og-financials.jpg',
                type: 'website'
            },
            'portfolio.html': {
                title: 'Investment Portfolio & Holdings - The Ben Palmer Show',
                description: 'Investment portfolio analysis and holdings data from The Ben Palmer Show.',
                keywords: 'investment portfolio, holdings, investment analysis, portfolio management',
                ogImage: '/images/og-portfolio.jpg',
                type: 'website'
            },
            'media.html': {
                title: 'Media Recommendations - Books, Films & Podcasts',
                description: 'Curated recommendations for books, films, and podcasts worth your time.',
                keywords: 'books, films, podcasts, media recommendations, curated content',
                ogImage: '/images/og-media.jpg',
                type: 'website'
            },
            'journal.html': {
                title: 'Journal - Independent Commentary & Personal Insights',
                description: 'Independent commentary and personal insights from Ben Palmer.',
                keywords: 'journal, commentary, personal insights, independent analysis',
                ogImage: '/images/og-journal.jpg',
                type: 'website'
            },
            'read.html': {
                title: 'Announcements & Updates - The Ben Palmer Show',
                description: 'Latest announcements and updates from The Ben Palmer Show.',
                keywords: 'announcements, updates, news, Ben Palmer Show',
                ogImage: '/images/og-read.jpg',
                type: 'website'
            }
        };
    }

    /**
     * Get configuration for a specific section
     * @param {string} section - Configuration section
     * @returns {Object} Section configuration
     */
    get(section) {
        return this.config[section] || {};
    }

    /**
     * Get page-specific configuration
     * @param {string} page - Page filename
     * @returns {Object} Page configuration
     */
    getPageConfig(page) {
        return this.pageConfigs[page] || {};
    }

    /**
     * Get current page configuration based on URL
     * @returns {Object} Current page configuration
     */
    getCurrentPageConfig() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return this.getPageConfig(page);
    }

    /**
     * Update configuration
     * @param {string} section - Section to update
     * @param {Object} updates - Configuration updates
     */
    update(section, updates) {
        if (this.config[section]) {
            this.config[section] = { ...this.config[section], ...updates };
        }
    }

    /**
     * Get site-wide meta tags
     * @returns {Object} Meta tags object
     */
    getSiteMetaTags() {
        const site = this.config.site;
        return {
            'description': site.description,
            'author': site.author,
            'theme-color': site.themeColor,
            'robots': 'index,follow'
        };
    }

    /**
     * Get Open Graph meta tags for current page
     * @returns {Object} Open Graph meta tags
     */
    getOpenGraphTags() {
        const pageConfig = this.getCurrentPageConfig();
        const site = this.config.site;

        return {
            'og:type': pageConfig.type || 'website',
            'og:title': pageConfig.title || site.name,
            'og:description': pageConfig.description || site.description,
            'og:url': window.location.href,
            'og:site_name': site.name,
            'og:image': pageConfig.ogImage ? site.url + pageConfig.ogImage : site.url + '/images/og-default.jpg',
            'og:image:alt': pageConfig.title || site.name,
            'og:image:width': '1200',
            'og:image:height': '630'
        };
    }

    /**
     * Get Twitter Card meta tags
     * @returns {Object} Twitter Card meta tags
     */
    getTwitterTags() {
        const pageConfig = this.getCurrentPageConfig();
        const site = this.config.site;
        const social = this.config.social;

        return {
            'twitter:card': 'summary_large_image',
            'twitter:site': social.twitter,
            'twitter:creator': social.twitter,
            'twitter:title': pageConfig.title || site.name,
            'twitter:description': pageConfig.description || site.description,
            'twitter:image': pageConfig.ogImage ? site.url + pageConfig.ogImage : site.url + '/images/og-default.jpg',
            'twitter:image:alt': pageConfig.title || site.name
        };
    }

    /**
     * Apply SEO configuration to current page
     */
    applyToPage() {
        this.applyMetaTags();
        this.applyStructuredData();
    }

    /**
     * Apply meta tags to current page
     */
    applyMetaTags() {
        const head = document.head;

        // Update title if not set
        if (!document.title) {
            const pageConfig = this.getCurrentPageConfig();
            document.title = pageConfig.title || this.config.site.name;
        }

        // Add/update meta tags
        const metaTags = {
            ...this.getSiteMetaTags(),
            ...this.getOpenGraphTags(),
            ...this.getTwitterTags()
        };

        Object.entries(metaTags).forEach(([name, content]) => {
            let meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                if (name.startsWith('og:') || name.startsWith('twitter:')) {
                    meta.setAttribute('property', name);
                } else {
                    meta.setAttribute('name', name);
                }
                head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        });
    }

    /**
     * Apply structured data to current page
     */
    applyStructuredData() {
        // This will be enhanced by the content schema generator
        // For now, just ensure basic structured data is present
        if (!document.querySelector('script[type="application/ld+json"]')) {
            // Add basic website schema if none exists
            const websiteSchema = {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": this.config.site.name,
                "url": this.config.site.url,
                "description": this.config.site.description,
                "publisher": {
                    "@type": "Organization",
                    "name": this.config.site.name,
                    "url": this.config.site.url
                }
            };

            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify(websiteSchema);
            document.head.appendChild(script);
        }
    }

    /**
     * Get configuration summary
     * @returns {Object} Configuration summary
     */
    getSummary() {
        return {
            site: this.config.site,
            enabledFeatures: {
                analytics: this.config.analytics,
                monitoring: this.config.monitoring,
                performance: this.config.performance,
                content: this.config.content
            },
            pageCount: Object.keys(this.pageConfigs).length,
            currentPage: this.getCurrentPageConfig()
        };
    }
}

// Export for use in modules
export default SEOConfig;

// Make available globally
if (typeof window !== 'undefined') {
    window.seoConfig = new SEOConfig();
}
