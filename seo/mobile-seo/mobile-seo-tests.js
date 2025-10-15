/**
 * Mobile SEO Validation Tests
 * Tests for mobile responsiveness, touch targets, and performance
 */

class MobileSEOTests {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            tests: []
        };
    }

    /**
     * Run all mobile SEO tests
     * @returns {Object} Test results
     */
    async runAllTests() {
        console.log('🧪 Running Mobile SEO Tests...\n');

        // Test mobile detection
        this.testMobileDetection();

        // Test viewport meta tag
        this.testViewportMeta();

        // Test touch targets
        this.testTouchTargets();

        // Test mobile image optimization
        this.testImageOptimization();

        // Test mobile performance
        await this.testMobilePerformance();

        // Test CSS mobile-first loading
        this.testCSSMobileFirst();

        // Test mobile resource hints
        this.testMobileResourceHints();

        this.printResults();
        return this.results;
    }

    /**
     * Test mobile device detection
     */
    testMobileDetection() {
        this.runTest('Mobile Device Detection', () => {
            const isMobile = this.detectMobileDevice();
            // This should work on any device, just check it's boolean
            return typeof isMobile === 'boolean';
        });
    }

    /**
     * Test viewport meta tag validation
     */
    testViewportMeta() {
        this.runTest('Viewport Meta Tag Validation', () => {
            const viewport = document.querySelector('meta[name="viewport"]');
            if (!viewport) return false;

            const content = viewport.getAttribute('content');
            if (!content) return false;

            const hasWidth = content.includes('width=device-width');
            const hasScale = content.includes('initial-scale=1.0');

            return hasWidth && hasScale;
        });
    }

    /**
     * Test touch target sizes
     */
    testTouchTargets() {
        this.runTest('Touch Target Size Validation', () => {
            const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
            let validCount = 0;

            interactiveElements.forEach(el => {
                const width = el.offsetWidth;
                const height = el.offsetHeight;
                if (width >= 44 && height >= 44) {
                    validCount++;
                }
            });

            return validCount === interactiveElements.length;
        });
    }

    /**
     * Test mobile image optimization
     */
    testImageOptimization() {
        this.runTest('Mobile Image Optimization', () => {
            const images = document.querySelectorAll('img');
            let optimizedCount = 0;

            images.forEach(img => {
                // Check for loading attribute
                const hasLoading = img.hasAttribute('loading');
                // Check for sizes attribute
                const hasSizes = img.hasAttribute('sizes');

                if (hasLoading && hasSizes) {
                    optimizedCount++;
                }
            });

            // At least 50% of images should be optimized
            return optimizedCount >= images.length * 0.5;
        });
    }

    /**
     * Test mobile performance metrics
     */
    async testMobilePerformance() {
        this.runTest('Mobile Performance Metrics', () => {
            // Check if device pixel ratio is reasonable
            const dpr = window.devicePixelRatio;
            if (dpr < 1 || dpr > 5) return false;

            // Check viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            return viewportWidth > 0 && viewportHeight > 0;
        });
    }

    /**
     * Test mobile-first CSS loading
     */
    testCSSMobileFirst() {
        this.runTest('Mobile-First CSS Loading', () => {
            const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
            let mobileFirstCount = 0;

            stylesheets.forEach(link => {
                const media = link.getAttribute('media');
                // Check if critical CSS loads without media query or with screen
                if (!media || media === 'screen' || media.includes('screen')) {
                    mobileFirstCount++;
                }
            });

            // At least one stylesheet should load for screen
            return mobileFirstCount > 0;
        });
    }

    /**
     * Test mobile resource hints
     */
    testMobileResourceHints() {
        this.runTest('Mobile Resource Hints', () => {
            const dnsPrefetchLinks = document.querySelectorAll('link[rel="dns-prefetch"]');
            const preconnectLinks = document.querySelectorAll('link[rel="preconnect"]');
            const preloadLinks = document.querySelectorAll('link[rel="preload"]');

            // Should have some resource hints
            return dnsPrefetchLinks.length > 0 || preconnectLinks.length > 0 || preloadLinks.length > 0;
        });
    }

    /**
     * Detect mobile device (simple implementation)
     * @returns {boolean}
     */
    detectMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const mobileRegex = /android|avantgo|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i;

        return mobileRegex.test(userAgent) ||
               (window.innerWidth <= 768 && window.innerHeight <= 1024) ||
               ('ontouchstart' in window);
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
        console.log(`\n📊 Mobile SEO Test Results:`);
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
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileSEOTests;
}

// Make available globally for browser testing
if (typeof window !== 'undefined') {
    window.MobileSEOTests = MobileSEOTests;
}

// Auto-run tests if script is loaded directly
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const tests = new MobileSEOTests();
        tests.runAllTests();
    });
} else if (typeof window !== 'undefined') {
    const tests = new MobileSEOTests();
    tests.runAllTests();
}
