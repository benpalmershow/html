/**
 * SEO Performance Monitoring System
 * Comprehensive SEO health checks, audits, and performance regression detection
 */

class SEOMonitor {
    constructor() {
        this.healthChecks = {};
        this.auditHistory = [];
        this.baselineMetrics = {};
        this.performanceThresholds = {};
        this.init();
    }

    /**
     * Initialize SEO monitoring system
     */
    init() {
        this.setupHealthChecks();
        this.loadBaselineMetrics();
        this.setupPerformanceThresholds();
        this.startAutomatedAudits();
    }

    /**
     * Set up comprehensive health checks
     */
    setupHealthChecks() {
        this.healthChecks = {
            // Meta tags health
            metaTags: () => this.checkMetaTags(),

            // Structured data health
            structuredData: () => this.checkStructuredData(),

            // Performance health
            performance: () => this.checkPerformance(),

            // Mobile optimization health
            mobileOptimization: () => this.checkMobileOptimization(),

            // Content quality health
            contentQuality: () => this.checkContentQuality(),

            // Technical SEO health
            technicalSEO: () => this.checkTechnicalSEO(),

            // Image optimization health
            imageOptimization: () => this.checkImageOptimization(),

            // Link health
            linkHealth: () => this.checkLinkHealth(),

            // Analytics health
            analyticsHealth: () => this.checkAnalyticsHealth()
        };
    }

    /**
     * Check meta tags health
     * @returns {Object} Meta tags health report
     */
    checkMetaTags() {
        const report = {
            score: 100,
            issues: [],
            recommendations: []
        };

        // Check title tag
        const title = document.title;
        if (!title) {
            report.score -= 25;
            report.issues.push('Missing title tag');
            report.recommendations.push('Add a descriptive title tag (30-60 characters)');
        } else if (title.length < 30) {
            report.score -= 10;
            report.issues.push('Title tag too short');
            report.recommendations.push('Expand title tag to 30-60 characters');
        } else if (title.length > 60) {
            report.score -= 5;
            report.issues.push('Title tag too long');
            report.recommendations.push('Shorten title tag to under 60 characters');
        }

        // Check meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            report.score -= 20;
            report.issues.push('Missing meta description');
            report.recommendations.push('Add a meta description (120-160 characters)');
        } else {
            const descContent = metaDesc.getAttribute('content') || '';
            if (descContent.length < 120) {
                report.score -= 10;
                report.issues.push('Meta description too short');
                report.recommendations.push('Expand meta description to 120-160 characters');
            } else if (descContent.length > 160) {
                report.score -= 5;
                report.issues.push('Meta description too long');
                report.recommendations.push('Shorten meta description to under 160 characters');
            }
        }

        // Check Open Graph tags
        const ogTags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
        ogTags.forEach(tag => {
            if (!document.querySelector(`meta[property="${tag}"]`)) {
                report.score -= 2;
                report.issues.push(`Missing Open Graph ${tag}`);
                report.recommendations.push(`Add ${tag} meta tag for better social sharing`);
            }
        });

        // Check Twitter Card tags
        const twitterTags = ['twitter:card', 'twitter:title', 'twitter:description'];
        twitterTags.forEach(tag => {
            if (!document.querySelector(`meta[name="${tag}"]`)) {
                report.score -= 2;
                report.issues.push(`Missing Twitter Card ${tag}`);
                report.recommendations.push(`Add ${tag} meta tag for Twitter sharing`);
            }
        });

        return report;
    }

    /**
     * Check structured data health
     * @returns {Object} Structured data health report
     */
    checkStructuredData() {
        const report = {
            score: 100,
            issues: [],
            recommendations: []
        };

        const schemas = document.querySelectorAll('script[type="application/ld+json"]');
        if (schemas.length === 0) {
            report.score -= 30;
            report.issues.push('No structured data found');
            report.recommendations.push('Add appropriate schema markup for your content type');
            return report;
        }

        let validSchemas = 0;
        let parseErrors = 0;

        schemas.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);

                // Check for required fields based on schema type
                if (data['@type']) {
                    const schemaType = data['@type'];
                    const validation = this.validateSchemaType(schemaType, data);

                    if (validation.valid) {
                        validSchemas++;
                    } else {
                        report.score -= 5;
                        report.issues.push(`Invalid ${schemaType} schema: ${validation.errors.join(', ')}`);
                        report.recommendations.push(...validation.recommendations);
                    }
                } else {
                    report.score -= 10;
                    report.issues.push('Schema missing @type property');
                    report.recommendations.push('Add @type property to schema');
                }
            } catch (error) {
                parseErrors++;
                report.score -= 15;
                report.issues.push('Invalid JSON in structured data');
                report.recommendations.push('Fix JSON syntax in schema markup');
            }
        });

        if (parseErrors > 0) {
            report.issues.push(`${parseErrors} schema(s) have JSON parsing errors`);
        }

        return report;
    }

    /**
     * Validate specific schema type
     * @param {string} type - Schema type
     * @param {Object} data - Schema data
     * @returns {Object} Validation result
     */
    validateSchemaType(type, data) {
        const result = {
            valid: true,
            errors: [],
            recommendations: []
        };

        switch (type) {
            case 'Article':
            case 'BlogPosting':
                if (!data.headline) {
                    result.valid = false;
                    result.errors.push('Missing headline');
                    result.recommendations.push('Add headline property');
                }
                if (!data.author) {
                    result.errors.push('Missing author');
                    result.recommendations.push('Add author information');
                }
                if (!data.datePublished) {
                    result.valid = false;
                    result.errors.push('Missing publication date');
                    result.recommendations.push('Add datePublished property');
                }
                break;

            case 'Organization':
                if (!data.name) {
                    result.valid = false;
                    result.errors.push('Missing organization name');
                    result.recommendations.push('Add name property');
                }
                if (!data.url) {
                    result.errors.push('Missing organization URL');
                    result.recommendations.push('Add url property');
                }
                break;

            case 'WebSite':
                if (!data.name) {
                    result.valid = false;
                    result.errors.push('Missing website name');
                    result.recommendations.push('Add name property');
                }
                break;
        }

        return result;
    }

    /**
     * Check performance health
     * @returns {Object} Performance health report
     */
    checkPerformance() {
        const report = {
            score: 100,
            issues: [],
            recommendations: []
        };

        // Check Core Web Vitals (if available)
        if (window.performance && window.performance.getEntriesByType) {
            const navigation = window.performance.getEntriesByType('navigation')[0];
            if (navigation) {
                const loadTime = navigation.loadEventEnd - navigation.fetchStart;
                if (loadTime > 3000) {
                    report.score -= 20;
                    report.issues.push('Page load time too slow');
                    report.recommendations.push('Optimize page load time under 3 seconds');
                }
            }
        }

        // Check for render-blocking resources
        const renderBlockingCSS = document.querySelectorAll('link[rel="stylesheet"]:not([media="print"])');
        if (renderBlockingCSS.length > 3) {
            report.score -= 10;
            report.issues.push('Too many render-blocking CSS files');
            report.recommendations.push('Minimize render-blocking CSS or use media queries');
        }

        // Check for uncompressed resources
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            if (script.src.includes('.js') && !script.src.includes('.min.')) {
                report.score -= 2;
                report.issues.push('Uncompressed JavaScript file detected');
                report.recommendations.push('Minify JavaScript files');
            }
        });

        return report;
    }

    /**
     * Check mobile optimization health
     * @returns {Object} Mobile optimization health report
     */
    checkMobileOptimization() {
        const report = {
            score: 100,
            issues: [],
            recommendations: []
        };

        // Check viewport meta tag
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            report.score -= 30;
            report.issues.push('Missing viewport meta tag');
            report.recommendations.push('Add viewport meta tag for mobile responsiveness');
        } else {
            const content = viewport.getAttribute('content');
            if (!content.includes('width=device-width')) {
                report.score -= 20;
                report.issues.push('Viewport not properly configured for mobile');
                report.recommendations.push('Ensure viewport includes width=device-width');
            }
        }

        // Check touch target sizes
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
        let smallTargets = 0;

        interactiveElements.forEach(el => {
            const width = el.offsetWidth;
            const height = el.offsetHeight;
            if (width < 44 || height < 44) {
                smallTargets++;
            }
        });

        if (smallTargets > 0) {
            report.score -= Math.min(smallTargets * 5, 25);
            report.issues.push(`${smallTargets} interactive elements have touch targets smaller than 44px`);
            report.recommendations.push('Ensure all touch targets are at least 44px x 44px');
        }

        // Check font sizes for mobile readability
        const smallText = document.querySelectorAll('*');
        let smallTextCount = 0;

        smallText.forEach(el => {
            const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
            if (fontSize > 0 && fontSize < 14) {
                smallTextCount++;
            }
        });

        if (smallTextCount > 10) { // Allow some small text for labels, etc.
            report.score -= 10;
            report.issues.push('Some text may be too small for mobile readability');
            report.recommendations.push('Ensure text is at least 14px on mobile devices');
        }

        return report;
    }

    /**
     * Check content quality health
     * @returns {Object} Content quality health report
     */
    checkContentQuality() {
        const report = {
            score: 100,
            issues: [],
            recommendations: []
        };

        // Check for H1 tag
        const h1Tags = document.querySelectorAll('h1');
        if (h1Tags.length === 0) {
            report.score -= 20;
            report.issues.push('Missing H1 tag');
            report.recommendations.push('Add exactly one H1 tag per page');
        } else if (h1Tags.length > 1) {
            report.score -= 10;
            report.issues.push('Multiple H1 tags found');
            report.recommendations.push('Use only one H1 tag per page');
        }

        // Check heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let hierarchyIssues = 0;

        for (let i = 1; i < headings.length; i++) {
            const currentLevel = parseInt(headings[i].tagName.charAt(1));
            const previousLevel = parseInt(headings[i - 1].tagName.charAt(1));

            if (currentLevel > previousLevel + 1) {
                hierarchyIssues++;
            }
        }

        if (hierarchyIssues > 0) {
            report.score -= Math.min(hierarchyIssues * 5, 20);
            report.issues.push('Heading hierarchy issues detected');
            report.recommendations.push('Fix heading hierarchy (don\'t skip heading levels)');
        }

        // Check for keyword stuffing (basic check)
        const textContent = document.body.textContent || '';
        const words = textContent.toLowerCase().split(/\s+/);
        const wordCount = words.length;

        if (wordCount < 300) {
            report.score -= 15;
            report.issues.push('Content appears to be too short');
            report.recommendations.push('Add more comprehensive content (aim for 300+ words)');
        }

        return report;
    }

    /**
     * Check technical SEO health
     * @returns {Object} Technical SEO health report
     */
    checkTechnicalSEO() {
        const report = {
            score: 100,
            issues: [],
            recommendations: []
        };

        // Check for canonical URL
        const canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            report.score -= 15;
            report.issues.push('Missing canonical URL');
            report.recommendations.push('Add canonical URL to prevent duplicate content issues');
        }

        // Check robots meta tag
        const robots = document.querySelector('meta[name="robots"]');
        if (!robots) {
            report.score -= 5;
            report.issues.push('Missing robots meta tag');
            report.recommendations.push('Add robots meta tag (default: index,follow)');
        }

        // Check for sitemap link
        const sitemap = document.querySelector('link[rel="sitemap"]');
        if (!sitemap) {
            report.score -= 5;
            report.issues.push('Missing sitemap link');
            report.recommendations.push('Add XML sitemap link in robots.txt or HTML');
        }

        // Check for HTTPS
        if (window.location.protocol !== 'https:') {
            report.score -= 20;
            report.issues.push('Site not using HTTPS');
            report.recommendations.push('Implement HTTPS for security and SEO benefits');
        }

        return report;
    }

    /**
     * Check image optimization health
     * @returns {Object} Image optimization health report
     */
    checkImageOptimization() {
        const report = {
            score: 100,
            issues: [],
            recommendations: []
        };

        const images = document.querySelectorAll('img');
        if (images.length === 0) return report;

        let missingAlt = 0;
        let largeImages = 0;
        let nonOptimized = 0;

        images.forEach(img => {
            // Check for alt text
            if (!img.getAttribute('alt')) {
                missingAlt++;
            }

            // Check for loading attribute
            if (!img.hasAttribute('loading')) {
                nonOptimized++;
            }

            // Check for sizes attribute
            if (!img.hasAttribute('sizes')) {
                nonOptimized++;
            }
        });

        if (missingAlt > 0) {
            report.score -= Math.min(missingAlt * 10, 40);
            report.issues.push(`${missingAlt} images missing alt text`);
            report.recommendations.push('Add descriptive alt text to all images');
        }

        if (nonOptimized > 0) {
            report.score -= Math.min(nonOptimized * 2, 20);
            report.issues.push(`${nonOptimized} images not optimized for performance`);
            report.recommendations.push('Add loading="lazy" and sizes attributes to images');
        }

        return report;
    }

    /**
     * Check link health
     * @returns {Object} Link health report
     */
    checkLinkHealth() {
        const report = {
            score: 100,
            issues: [],
            recommendations: []
        };

        const links = document.querySelectorAll('a[href]');
        let brokenLinks = 0;
        let externalLinks = 0;

        links.forEach(link => {
            const href = link.getAttribute('href');

            if (!href) {
                brokenLinks++;
            } else if (href.startsWith('http') && !href.includes(window.location.hostname)) {
                externalLinks++;
                // Check if external links have rel attributes
                if (!link.hasAttribute('rel') || !link.getAttribute('rel').includes('noopener')) {
                    report.score -= 1;
                }
            }
        });

        if (brokenLinks > 0) {
            report.score -= Math.min(brokenLinks * 5, 20);
            report.issues.push(`${brokenLinks} links have missing or invalid href attributes`);
            report.recommendations.push('Fix broken or empty link href attributes');
        }

        if (externalLinks > 10) {
            report.score -= 5;
            report.issues.push('Many external links detected');
            report.recommendations.push('Ensure external links have rel="noopener noreferrer" for security');
        }

        return report;
    }

    /**
     * Check analytics health
     * @returns {Object} Analytics health report
     */
    checkAnalyticsHealth() {
        const report = {
            score: 100,
            issues: [],
            recommendations: []
        };

        // Check for Google Analytics
        if (typeof gtag === 'undefined') {
            report.score -= 20;
            report.issues.push('Google Analytics not detected');
            report.recommendations.push('Implement Google Analytics 4 for tracking');
        }

        // Check for SEO analytics enhancements
        if (!window.seoAnalytics) {
            report.score -= 15;
            report.issues.push('SEO analytics enhancements not loaded');
            report.recommendations.push('Initialize SEO analytics tracking');
        }

        return report;
    }

    /**
     * Load baseline metrics for regression detection
     */
    loadBaselineMetrics() {
        // Load from localStorage or set defaults
        const stored = localStorage.getItem('seo-baseline-metrics');
        if (stored) {
            try {
                this.baselineMetrics = JSON.parse(stored);
            } catch (error) {
                console.warn('Failed to load baseline metrics:', error);
            }
        }

        // Set default baseline if none exists
        if (Object.keys(this.baselineMetrics).length === 0) {
            this.baselineMetrics = {
                metaTagsScore: 100,
                structuredDataScore: 100,
                performanceScore: 100,
                mobileScore: 100,
                contentScore: 100,
                technicalScore: 100,
                imageScore: 100,
                linkScore: 100,
                analyticsScore: 100,
                lastUpdated: Date.now()
            };
        }
    }

    /**
     * Set up performance thresholds
     */
    setupPerformanceThresholds() {
        this.performanceThresholds = {
            critical: 70,  // Below this is critical
            warning: 85,   // Below this needs attention
            excellent: 95  // Above this is excellent
        };
    }

    /**
     * Start automated audits
     */
    startAutomatedAudits() {
        // Run initial audit
        this.runFullAudit();

        // Set up periodic audits
        setInterval(() => {
            this.runFullAudit();
        }, 3600000); // Run every hour

        // Run audit on page visibility change (user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.runFullAudit();
            }
        });
    }

    /**
     * Run comprehensive SEO audit
     * @returns {Object} Audit results
     */
    runFullAudit() {
        const auditResults = {
            timestamp: Date.now(),
            url: window.location.href,
            scores: {},
            issues: [],
            recommendations: [],
            regressions: []
        };

        // Run all health checks
        Object.keys(this.healthChecks).forEach(checkName => {
            const result = this.healthChecks[checkName]();
            auditResults.scores[checkName] = result.score;
            auditResults.issues.push(...result.issues);
            auditResults.recommendations.push(...result.recommendations);

            // Check for regressions
            const baselineKey = `${checkName}Score`;
            if (this.baselineMetrics[baselineKey] && result.score < this.baselineMetrics[baselineKey] - 10) {
                auditResults.regressions.push({
                    check: checkName,
                    baseline: this.baselineMetrics[baselineKey],
                    current: result.score,
                    change: result.score - this.baselineMetrics[baselineKey]
                });
            }
        });

        // Calculate overall score
        const scores = Object.values(auditResults.scores);
        auditResults.overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;

        // Store audit history
        this.auditHistory.push(auditResults);

        // Keep only last 10 audits
        if (this.auditHistory.length > 10) {
            this.auditHistory = this.auditHistory.slice(-10);
        }

        // Update baseline if score improved significantly
        if (auditResults.overallScore > this.baselineMetrics.overallScore + 5) {
            this.updateBaselineMetrics(auditResults);
        }

        // Report regressions
        if (auditResults.regressions.length > 0) {
            this.reportRegressions(auditResults.regressions);
        }

        // Track audit in analytics
        if (window.seoAnalytics) {
            window.seoAnalytics.trackSEOEvent('seo_audit_completed', {
                event_label: `Score: ${auditResults.overallScore}`,
                value: auditResults.overallScore
            });
        }

        console.log('SEO Audit Completed:', auditResults);
        return auditResults;
    }

    /**
     * Update baseline metrics
     * @param {Object} auditResults - Latest audit results
     */
    updateBaselineMetrics(auditResults) {
        Object.keys(auditResults.scores).forEach(checkName => {
            const scoreKey = `${checkName}Score`;
            this.baselineMetrics[scoreKey] = auditResults.scores[checkName];
        });

        this.baselineMetrics.overallScore = auditResults.overallScore;
        this.baselineMetrics.lastUpdated = Date.now();

        // Save to localStorage
        localStorage.setItem('seo-baseline-metrics', JSON.stringify(this.baselineMetrics));
    }

    /**
     * Report performance regressions
     * @param {Array} regressions - List of regressions
     */
    reportRegressions(regressions) {
        console.warn('SEO Performance Regressions Detected:', regressions);

        regressions.forEach(regression => {
            if (window.seoAnalytics) {
                window.seoAnalytics.trackSEOEvent('seo_regression', {
                    event_label: `${regression.check}: ${regression.change}`,
                    value: Math.abs(regression.change)
                });
            }
        });
    }

    /**
     * Get current SEO health status
     * @returns {Object} Health status
     */
    getHealthStatus() {
        const latestAudit = this.auditHistory[this.auditHistory.length - 1];
        if (!latestAudit) return null;

        return {
            overallScore: latestAudit.overallScore,
            scores: latestAudit.scores,
            issueCount: latestAudit.issues.length,
            regressionCount: latestAudit.regressions.length,
            lastAudit: latestAudit.timestamp
        };
    }

    /**
     * Generate SEO audit report
     * @returns {Object} Detailed audit report
     */
    generateAuditReport() {
        const latestAudit = this.auditHistory[this.auditHistory.length - 1];
        if (!latestAudit) return null;

        return {
            summary: {
                overallScore: latestAudit.overallScore,
                totalIssues: latestAudit.issues.length,
                totalRecommendations: latestAudit.recommendations.length,
                regressions: latestAudit.regressions.length
            },
            detailedScores: latestAudit.scores,
            issues: latestAudit.issues,
            recommendations: latestAudit.recommendations,
            regressions: latestAudit.regressions,
            baselineComparison: this.baselineMetrics,
            auditHistory: this.auditHistory.slice(-5) // Last 5 audits
        };
    }
}

export default SEOMonitor;
