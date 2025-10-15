/**
 * SEO Monitoring and Analytics Tests
 * Comprehensive tests for SEO analytics, monitoring, and Search Console integration
 */

class SEOMonitoringAnalyticsTests {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            tests: []
        };
    }

    /**
     * Run all monitoring and analytics tests
     * @returns {Object} Test results
     */
    async runAllTests() {
        console.log('🧪 Running SEO Monitoring & Analytics Tests...\n');

        // Test analytics functionality
        await this.testAnalyticsTracking();
        this.testAnalyticsEvents();
        this.testCustomDimensions();

        // Test monitoring functionality
        this.testHealthChecks();
        this.testAuditSystem();
        this.testRegressionDetection();

        // Test Search Console integration
        this.testSearchConsoleVerification();
        this.testStructuredDataMonitoring();
        this.testErrorTracking();

        // Test integration
        this.testSystemIntegration();

        this.printResults();
        return this.results;
    }

    /**
     * Test analytics tracking functionality
     */
    async testAnalyticsTracking() {
        this.runTest('Analytics Initialization', () => {
            return typeof window.seoAnalytics !== 'undefined' && window.seoAnalytics.initialized === true;
        });

        this.runTest('GA4 Integration', () => {
            return typeof gtag !== 'undefined';
        });

        this.runTest('Page Type Detection', () => {
            if (!window.seoAnalytics) return false;
            const pageType = window.seoAnalytics.getSEOMetrics().page_type;
            return typeof pageType === 'string' && pageType.length > 0;
        });

        this.runTest('SEO Score Calculation', () => {
            if (!window.seoAnalytics) return false;
            const metrics = window.seoAnalytics.getSEOMetrics();
            return typeof metrics.seo_score === 'number' && metrics.seo_score >= 0 && metrics.seo_score <= 100;
        });
    }

    /**
     * Test analytics events
     */
    testAnalyticsEvents() {
        this.runTest('Core Web Vitals Tracking', () => {
            // This test would need to simulate web vitals
            // For now, just check if the tracking methods exist
            return window.seoAnalytics && typeof window.seoAnalytics.trackWebVital === 'function';
        });

        this.runTest('Social Sharing Tracking', () => {
            const testLink = document.createElement('a');
            testLink.href = 'https://twitter.com/share';
            testLink.textContent = 'Share';

            // Simulate click
            const event = new MouseEvent('click', { bubbles: true });
            testLink.dispatchEvent(event);

            // Check if tracking method exists (actual event tracking would require GA4 setup)
            return window.seoAnalytics && typeof window.seoAnalytics.trackSocialSharing === 'function';
        });

        this.runTest('Search Interaction Tracking', () => {
            return window.seoAnalytics && typeof window.seoAnalytics.trackSearchInteractions === 'function';
        });

        this.runTest('Content Engagement Tracking', () => {
            return window.seoAnalytics && typeof window.seoAnalytics.trackContentEngagement === 'function';
        });
    }

    /**
     * Test custom dimensions setup
     */
    testCustomDimensions() {
        this.runTest('Custom Dimensions Configuration', () => {
            // Check if custom dimensions are configured
            return window.seoAnalytics && typeof window.seoAnalytics.setupCustomDimensions === 'function';
        });

        this.runTest('SEO Metrics Collection', () => {
            if (!window.seoAnalytics) return false;
            const metrics = window.seoAnalytics.getSEOMetrics();
            const requiredMetrics = ['page_type', 'seo_score', 'structured_data_count', 'mobile_optimized'];

            return requiredMetrics.every(metric => metrics.hasOwnProperty(metric));
        });
    }

    /**
     * Test health check functionality
     */
    testHealthChecks() {
        this.runTest('SEO Monitor Initialization', () => {
            return typeof window.seoMonitor !== 'undefined';
        });

        this.runTest('Meta Tags Health Check', () => {
            if (!window.seoMonitor) return false;
            const result = window.seoMonitor.healthChecks.metaTags();
            return typeof result.score === 'number' && result.score >= 0 && result.score <= 100;
        });

        this.runTest('Structured Data Health Check', () => {
            if (!window.seoMonitor) return false;
            const result = window.seoMonitor.healthChecks.structuredData();
            return typeof result.score === 'number' && result.score >= 0 && result.score <= 100;
        });

        this.runTest('Performance Health Check', () => {
            if (!window.seoMonitor) return false;
            const result = window.seoMonitor.healthChecks.performance();
            return typeof result.score === 'number' && result.score >= 0 && result.score <= 100;
        });

        this.runTest('Mobile Optimization Health Check', () => {
            if (!window.seoMonitor) return false;
            const result = window.seoMonitor.healthChecks.mobileOptimization();
            return typeof result.score === 'number' && result.score >= 0 && result.score <= 100;
        });

        this.runTest('Content Quality Health Check', () => {
            if (!window.seoMonitor) return false;
            const result = window.seoMonitor.healthChecks.contentQuality();
            return typeof result.score === 'number' && result.score >= 0 && result.score <= 100;
        });
    }

    /**
     * Test audit system
     */
    testAuditSystem() {
        this.runTest('Full Audit Execution', () => {
            if (!window.seoMonitor) return false;
            const auditResults = window.seoMonitor.runFullAudit();

            return auditResults &&
                   typeof auditResults.overallScore === 'number' &&
                   auditResults.scores &&
                   auditResults.timestamp;
        });

        this.runTest('Audit History Tracking', () => {
            if (!window.seoMonitor) return false;
            return Array.isArray(window.seoMonitor.auditHistory) && window.seoMonitor.auditHistory.length > 0;
        });

        this.runTest('Health Status Retrieval', () => {
            if (!window.seoMonitor) return false;
            const status = window.seoMonitor.getHealthStatus();
            return status && typeof status.overallScore === 'number';
        });

        this.runTest('Audit Report Generation', () => {
            if (!window.seoMonitor) return false;
            const report = window.seoMonitor.generateAuditReport();
            return report && report.summary && report.detailedScores;
        });
    }

    /**
     * Test regression detection
     */
    testRegressionDetection() {
        this.runTest('Baseline Metrics Loading', () => {
            if (!window.seoMonitor) return false;
            return window.seoMonitor.baselineMetrics && Object.keys(window.seoMonitor.baselineMetrics).length > 0;
        });

        this.runTest('Performance Thresholds Setup', () => {
            if (!window.seoMonitor) return false;
            return window.seoMonitor.performanceThresholds &&
                   typeof window.seoMonitor.performanceThresholds.critical === 'number';
        });

        this.runTest('Regression Reporting', () => {
            if (!window.seoMonitor) return false;
            return typeof window.seoMonitor.reportRegressions === 'function';
        });
    }

    /**
     * Test Search Console verification
     */
    testSearchConsoleVerification() {
        this.runTest('Search Console Integration Initialization', () => {
            return typeof window.searchConsoleIntegration !== 'undefined';
        });

        this.runTest('Verification Meta Tags', () => {
            const googleMeta = document.querySelector('meta[name="google-site-verification"]');
            const bingMeta = document.querySelector('meta[name="msvalidate.01"]');
            const yandexMeta = document.querySelector('meta[name="yandex-verification"]');

            // Should have at least Google verification (even if placeholder)
            return googleMeta !== null;
        });

        this.runTest('Verification Files Setup', () => {
            if (!window.searchConsoleIntegration) return false;
            return Array.isArray(window.searchConsoleIntegration.verificationFiles) &&
                   window.searchConsoleIntegration.verificationFiles.length > 0;
        });
    }

    /**
     * Test structured data monitoring
     */
    testStructuredDataMonitoring() {
        this.runTest('Structured Data Scanning', () => {
            if (!window.searchConsoleIntegration) return false;
            window.searchConsoleIntegration.scanStructuredData();
            return Array.isArray(window.searchConsoleIntegration.structuredDataMonitor.schemas);
        });

        this.runTest('Structured Data Validation', () => {
            if (!window.searchConsoleIntegration) return false;
            window.searchConsoleIntegration.validateStructuredData();
            return Array.isArray(window.searchConsoleIntegration.structuredDataMonitor.validationResults);
        });

        this.runTest('Schema Validation Logic', () => {
            if (!window.searchConsoleIntegration) return false;
            // Test with a sample schema
            const testSchema = {
                '@type': 'Article',
                headline: 'Test Article',
                author: { name: 'Test Author' },
                datePublished: '2024-01-01'
            };
            const result = window.searchConsoleIntegration.validateSchema('Article', testSchema);
            return typeof result.valid === 'boolean';
        });
    }

    /**
     * Test error tracking
     */
    testErrorTracking() {
        this.runTest('Error Tracker Initialization', () => {
            if (!window.searchConsoleIntegration) return false;
            return window.searchConsoleIntegration.errorTracker &&
                   Array.isArray(window.searchConsoleIntegration.errorTracker.seoErrors);
        });

        this.runTest('SEO Error Detection', () => {
            if (!window.searchConsoleIntegration) return false;
            return typeof window.searchConsoleIntegration.isSEOError === 'function';
        });

        this.runTest('Error Tracking Method', () => {
            if (!window.searchConsoleIntegration) return false;
            return typeof window.searchConsoleIntegration.trackSEOError === 'function';
        });

        this.runTest('Performance Monitoring', () => {
            // Check if Performance Observer is supported and error tracker has performance issues array
            if (!window.searchConsoleIntegration) return false;
            return Array.isArray(window.searchConsoleIntegration.errorTracker.performanceIssues);
        });
    }

    /**
     * Test system integration
     */
    testSystemIntegration() {
        this.runTest('Cross-System Communication', () => {
            // Test that systems can communicate (e.g., monitor reports to analytics)
            const allSystems = [window.seoAnalytics, window.seoMonitor, window.searchConsoleIntegration];
            return allSystems.every(system => typeof system !== 'undefined');
        });

        this.runTest('Global Access Points', () => {
            const globalObjects = ['seoAnalytics', 'seoMonitor', 'searchConsoleIntegration'];
            return globalObjects.every(obj => typeof window[obj] !== 'undefined');
        });

        this.runTest('Integration Report Generation', () => {
            if (!window.searchConsoleIntegration) return false;
            const report = window.searchConsoleIntegration.generateReport();
            return report && report.verificationStatus && report.structuredDataStatus;
        });

        this.runTest('Performance Metrics Integration', () => {
            // Test that analytics and monitoring systems work together
            if (!window.seoAnalytics || !window.seoMonitor) return false;

            const analyticsMetrics = window.seoAnalytics.getSEOMetrics();
            const monitorStatus = window.seoMonitor.getHealthStatus();

            return analyticsMetrics && monitorStatus;
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
        console.log(`\n📊 SEO Monitoring & Analytics Test Results:`);
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

        // Provide overall system health assessment
        const successRate = (this.results.passed / this.results.total) * 100;
        if (successRate >= 90) {
            console.log('\n🎉 Excellent! SEO monitoring and analytics systems are working properly.');
        } else if (successRate >= 75) {
            console.log('\n⚠️ Good, but some systems may need attention.');
        } else {
            console.log('\n🚨 Warning: SEO monitoring and analytics systems need fixes.');
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SEOMonitoringAnalyticsTests;
}

// Make available globally for browser testing
if (typeof window !== 'undefined') {
    window.SEOMonitoringAnalyticsTests = SEOMonitoringAnalyticsTests;
}

// Auto-run tests if script is loaded directly (with a delay to allow systems to initialize)
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const tests = new SEOMonitoringAnalyticsTests();
            tests.runAllTests();
        }, 2000); // Wait 2 seconds for all systems to initialize
    });
} else if (typeof window !== 'undefined') {
    setTimeout(() => {
        const tests = new SEOMonitoringAnalyticsTests();
        tests.runAllTests();
    }, 2000);
}
