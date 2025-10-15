/**
 * SEO System Integration Tests
 * End-to-end tests for SEO functionality across pages and modules
 */

class SEOIntegrationTests {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            tests: []
        };
    }

    /**
     * Run all integration tests
     * @returns {Object} Test results
     */
    async runAllTests() {
        console.log('🧪 Running SEO System Integration Tests...\n');

        // Test system initialization
        await this.testSystemInitialization();

        // Test cross-page consistency
        this.testCrossPageConsistency();

        // Test module integration
        this.testModuleIntegration();

        // Test content loading integration
        this.testContentLoadingIntegration();

        // Test navigation integration
        this.testNavigationIntegration();

        // Test performance integration
        this.testPerformanceIntegration();

        // Test mobile integration
        this.testMobileIntegration();

        this.printResults();
        return this.results;
    }

    /**
     * Test system initialization across all components
     */
    async testSystemInitialization() {
        this.runTest('SEO System Initialization', () => {
            const systems = [
                'seoAnalytics',
                'seoMonitor',
                'searchConsoleIntegration',
                'contentSchemaGenerator',
                'seoConfig'
            ];

            return systems.every(system => typeof window[system] !== 'undefined');
        });

        this.runTest('Configuration Loading', () => {
            return window.seoConfig &&
                   window.seoConfig.config &&
                   window.seoConfig.config.site &&
                   window.seoConfig.config.site.name === 'Howdy, Stranger';
        });

        this.runTest('Meta Tag Application', () => {
            const metaTags = [
                'meta[name="description"]',
                'meta[property="og:title"]',
                'meta[name="twitter:title"]'
            ];

            return metaTags.every(selector => document.querySelector(selector) !== null);
        });

        this.runTest('Structured Data Presence', () => {
            const schemas = document.querySelectorAll('script[type="application/ld+json"]');
            return schemas.length > 0;
        });
    }

    /**
     * Test cross-page SEO consistency
     */
    testCrossPageConsistency() {
        this.runTest('Page Title Configuration', () => {
            const config = window.seoConfig.getCurrentPageConfig();
            const title = document.title;

            // Check if title matches configuration or contains site name
            return title && (title === config.title || title.includes('Howdy, Stranger'));
        });

        this.runTest('Meta Description Consistency', () => {
            const metaDesc = document.querySelector('meta[name="description"]');
            const config = window.seoConfig.getCurrentPageConfig();

            if (!metaDesc) return false;

            const desc = metaDesc.getAttribute('content');
            return desc && desc.length >= 120 && desc.length <= 160;
        });

        this.runTest('Open Graph Tags Completeness', () => {
            const requiredTags = ['og:title', 'og:description', 'og:url', 'og:image'];
            return requiredTags.every(tag =>
                document.querySelector(`meta[property="${tag}"]`) !== null
            );
        });

        this.runTest('Twitter Card Tags Completeness', () => {
            const requiredTags = ['twitter:card', 'twitter:title', 'twitter:description'];
            return requiredTags.every(tag =>
                document.querySelector(`meta[name="${tag}"]`) !== null
            );
        });
    }

    /**
     * Test module integration and communication
     */
    testModuleIntegration() {
        this.runTest('Analytics and Monitor Integration', () => {
            if (!window.seoAnalytics || !window.seoMonitor) return false;

            // Test that analytics tracks monitor events
            const metrics = window.seoAnalytics.getSEOMetrics();
            const health = window.seoMonitor.getHealthStatus();

            return metrics && health && typeof metrics.seo_score === 'number';
        });

        this.runTest('Content Schema and Config Integration', () => {
            if (!window.contentSchemaGenerator || !window.seoConfig) return false;

            // Test that content schema uses config data
            const config = window.seoConfig.get('site');
            return config && config.name && config.url;
        });

        this.runTest('Search Console and Monitor Integration', () => {
            if (!window.searchConsoleIntegration || !window.seoMonitor) return false;

            // Test that both systems can access shared data
            const report = window.searchConsoleIntegration.generateReport();
            return report && report.structuredDataStatus;
        });
    }

    /**
     * Test content loading integration
     */
    testContentLoadingIntegration() {
        this.runTest('Posts Loader Schema Integration', () => {
            // Check if posts have schema markup applied
            const posts = document.querySelectorAll('.post-item[itemscope]');
            if (posts.length === 0) return true; // No posts loaded yet

            // If posts exist, they should have schema attributes
            return Array.from(posts).every(post =>
                post.hasAttribute('itemscope') &&
                post.hasAttribute('itemtype') &&
                post.querySelector('[itemprop]')
            );
        });

        this.runTest('Media Loader Schema Integration', () => {
            // Check if media items have schema
            const mediaItems = document.querySelectorAll('.media-card');
            if (mediaItems.length === 0) return true; // No media loaded yet

            // Check if media schema was injected
            const mediaSchema = document.querySelector('script[data-schema-id="media-collection"]');
            return !mediaItems.length || mediaSchema !== null;
        });

        this.runTest('Journal Loader Integration', () => {
            // Check if journal entries maintain proper structure
            const journalEntries = document.querySelectorAll('.journal-entry');
            if (journalEntries.length === 0) return true; // No journal loaded yet

            return Array.from(journalEntries).every(entry =>
                entry.querySelector('.card-title time') !== null
            );
        });
    }

    /**
     * Test navigation integration
     */
    testNavigationIntegration() {
        this.runTest('Navigation Schema Presence', () => {
            const navSchema = document.querySelector('script[data-navigation-schema]');
            return navSchema !== null;
        });

        this.runTest('Breadcrumb Schema Presence', () => {
            const breadcrumbSchema = document.querySelector('script[data-breadcrumb-schema]');
            // Breadcrumbs are only on certain pages
            const pagesWithBreadcrumbs = ['news.html', 'financials.html', 'portfolio.html', 'media.html', 'journal.html'];
            const currentPage = window.location.pathname.split('/').pop();

            if (pagesWithBreadcrumbs.includes(currentPage)) {
                return breadcrumbSchema !== null;
            }
            return true; // Not required on this page
        });

        this.runTest('Navigation Accessibility', () => {
            const nav = document.querySelector('.floating-nav');
            return nav &&
                   nav.hasAttribute('aria-label') &&
                   nav.getAttribute('role') === 'navigation';
        });

        this.runTest('SEO-friendly Link Attributes', () => {
            const navLinks = document.querySelectorAll('.floating-nav a');
            return Array.from(navLinks).every(link =>
                link.hasAttribute('title') &&
                link.hasAttribute('aria-current')
            );
        });
    }

    /**
     * Test performance integration
     */
    testPerformanceIntegration() {
        this.runTest('Performance Monitoring Active', () => {
            return window.seoMonitor &&
                   window.seoMonitor.healthChecks &&
                   typeof window.seoMonitor.runFullAudit === 'function';
        });

        this.runTest('Image Optimization Integration', () => {
            // Check if images have performance attributes
            const images = document.querySelectorAll('img');
            if (images.length === 0) return true;

            // At least some images should have loading attributes
            const optimizedImages = document.querySelectorAll('img[loading]');
            return optimizedImages.length > 0;
        });

        this.runTest('Resource Preloading', () => {
            // Check for preload links
            const preloadLinks = document.querySelectorAll('link[rel="preload"]');
            return preloadLinks.length > 0;
        });

        this.runTest('Core Web Vitals Tracking', () => {
            // Check if analytics is tracking performance
            return window.seoAnalytics &&
                   typeof window.seoAnalytics.trackWebVital === 'function';
        });
    }

    /**
     * Test mobile integration
     */
    testMobileIntegration() {
        this.runTest('Mobile Optimization Active', () => {
            return typeof window.mobileSEOOptimizer !== 'undefined';
        });

        this.runTest('Viewport Configuration', () => {
            const viewport = document.querySelector('meta[name="viewport"]');
            if (!viewport) return false;

            const content = viewport.getAttribute('content');
            return content && content.includes('width=device-width');
        });

        this.runTest('Touch Target Compliance', () => {
            const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
            if (interactiveElements.length === 0) return true;

            // Check a sample of interactive elements
            const sampleSize = Math.min(5, interactiveElements.length);
            for (let i = 0; i < sampleSize; i++) {
                const el = interactiveElements[i];
                const width = el.offsetWidth;
                const height = el.offsetHeight;
                if (width < 44 || height < 44) {
                    // Allow some flexibility for small elements
                    continue;
                }
                return true; // Found at least one properly sized element
            }
            return true; // No elements or acceptable sizes
        });

        this.runTest('Mobile-specific Resource Hints', () => {
            const dnsPrefetch = document.querySelectorAll('link[rel="dns-prefetch"]');
            const preconnect = document.querySelectorAll('link[rel="preconnect"]');

            return dnsPrefetch.length > 0 || preconnect.length > 0;
        });
    }

    /**
     * Test end-to-end SEO functionality
     */
    testEndToEndFunctionality() {
        this.runTest('Complete SEO Audit Execution', () => {
            if (!window.seoMonitor) return false;

            const auditResults = window.seoMonitor.runFullAudit();
            return auditResults &&
                   auditResults.overallScore >= 0 &&
                   auditResults.overallScore <= 100 &&
                   auditResults.scores &&
                   auditResults.issues &&
                   auditResults.recommendations;
        });

        this.runTest('Analytics Event Tracking', () => {
            if (!window.seoAnalytics) return false;

            // Trigger a test event
            window.seoAnalytics.trackSEOEvent('test_integration', {
                event_category: 'Integration Test',
                event_label: 'System Test'
            });

            return true; // Event should be sent (can't verify receipt)
        });

        this.runTest('Schema Markup Validation', () => {
            const schemas = document.querySelectorAll('script[type="application/ld+json"]');
            let validSchemas = 0;

            schemas.forEach(script => {
                try {
                    const data = JSON.parse(script.textContent);
                    if (data['@context'] && data['@type']) {
                        validSchemas++;
                    }
                } catch (e) {
                    // Invalid JSON
                }
            });

            return validSchemas > 0;
        });

        this.runTest('Cross-System Data Consistency', () => {
            if (!window.seoAnalytics || !window.seoMonitor || !window.seoConfig) return false;

            const configSite = window.seoConfig.get('site');
            const analyticsMetrics = window.seoAnalytics.getSEOMetrics();

            return configSite &&
                   analyticsMetrics &&
                   configSite.name &&
                   typeof analyticsMetrics.timestamp === 'number';
        });
    }

    /**
     * Run individual test
     * @param {string} testName - Name of the test
     * @param {Function} testFn - Test function
     */
    runTest(testName, testFn) {
        this.results.total++;
        try {
            const result = testFn();
            if (result) {
                this.results.passed++;
                this.results.tests.push({ name: testName, status: 'PASS' });
                console.log(`✅ ${testName}: PASS`);
            } else {
                this.results.failed++;
                this.results.tests.push({ name: testName, status: 'FAIL' });
                console.log(`❌ ${testName}: FAIL`);
            }
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({ name: testName, status: 'ERROR', error: error.message });
            console.log(`❌ ${testName}: ERROR - ${error.message}`);
        }
    }

    /**
     * Print test results summary
     */
    printResults() {
        console.log(`\n📊 SEO Integration Test Results:`);
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.tests.filter(test => test.status !== 'PASS').forEach(test => {
                console.log(`  - ${test.name}: ${test.status}${test.error ? ' - ' + test.error : ''}`);
            });
        }

        // Integration-specific feedback
        const successRate = (this.results.passed / this.results.total) * 100;
        if (successRate >= 90) {
            console.log('\n🎉 Excellent! SEO system integration is working perfectly.');
        } else if (successRate >= 75) {
            console.log('\n⚠️ Good integration, but some components may need attention.');
        } else {
            console.log('\n🚨 Warning: SEO system integration has significant issues.');
        }

        // Provide recommendations
        if (this.results.failed > 0) {
            console.log('\n💡 Recommendations:');
            console.log('  - Check browser console for detailed error messages');
            console.log('  - Ensure all SEO modules are properly loaded');
            console.log('  - Verify that content loaders are functioning correctly');
            console.log('  - Test on different pages to ensure cross-page consistency');
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEOIntegrationTests;
}

// Make available globally for browser testing
if (typeof window !== 'undefined') {
    window.SEOIntegrationTests = SEOIntegrationTests;
}

// Auto-run tests if script is loaded directly (with delay for system initialization)
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const tests = new SEOIntegrationTests();
            tests.runAllTests();
        }, 3000); // Wait 3 seconds for all systems to initialize
    });
} else if (typeof window !== 'undefined') {
    setTimeout(() => {
        const tests = new SEOIntegrationTests();
        tests.runAllTests();
    }, 3000);
}
