/**
 * SEO Modules Test Script
 * Tests SEO functionality without requiring a full web server
 */

const fs = require('fs');
const path = require('path');

// Mock DOM environment for testing
global.window = {
    location: {
        href: 'http://localhost:8080/index.html',
        hostname: 'localhost',
        pathname: '/index.html'
    },
    document: {
        head: { appendChild: () => {} },
        title: '',
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => ({ setAttribute: () => {} }),
        addEventListener: () => {}
    },
    addEventListener: () => {},
    performance: { getEntriesByType: () => [] },
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
    }
};

global.document = global.window.document;

// Mock gtag for analytics testing
global.gtag = function() {
    console.log('gtag called with:', arguments);
};

// Test results
const results = {
    modules: {},
    tests: [],
    errors: []
};

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
}

function testModule(name, testFn) {
    try {
        log(`Testing ${name}...`);
        const result = testFn();
        if (result) {
            results.modules[name] = 'PASS';
            log(`${name}: ✅ PASS`);
        } else {
            results.modules[name] = 'FAIL';
            log(`${name}: ❌ FAIL`);
        }
        return result;
    } catch (error) {
        results.modules[name] = 'ERROR';
        results.errors.push(`${name}: ${error.message}`);
        log(`${name}: ❌ ERROR - ${error.message}`);
        return false;
    }
}

async function runTests() {
    log('🚀 Starting SEO Modules Test');

    // Test 1: Check if module files exist
    testModule('SEO Config File', () => {
        const configPath = path.join(__dirname, 'seo-config.js');
        return fs.existsSync(configPath);
    });

    testModule('SEO Analytics File', () => {
        const analyticsPath = path.join(__dirname, 'analytics/seo-analytics.js');
        return fs.existsSync(analyticsPath);
    });

    testModule('SEO Monitor File', () => {
        const monitorPath = path.join(__dirname, 'monitoring/seo-monitor.js');
        return fs.existsSync(monitorPath);
    });

    testModule('Search Console File', () => {
        const searchConsolePath = path.join(__dirname, 'search-console/index.js');
        return fs.existsSync(searchConsolePath);
    });

    // Test 2: Load and test SEO Config
    let seoConfig;
    try {
        const configModule = await import('./seo-config.js');
        seoConfig = new configModule.default();
        global.window.seoConfig = seoConfig;

        testModule('SEO Config Load', () => seoConfig && typeof seoConfig.get === 'function');
        testModule('SEO Config Site Data', () => seoConfig.get('site').name === 'Howdy, Stranger');
        testModule('SEO Config Page Config', () => seoConfig.getPageConfig('index.html').title);
        testModule('SEO Config Current Page', () => seoConfig.getCurrentPageConfig());
    } catch (error) {
        log(`SEO Config load failed: ${error.message}`, 'error');
        testModule('SEO Config Load', () => false);
    }

    // Test 3: Load and test SEO Analytics
    let seoAnalytics;
    try {
        const analyticsModule = await import('./analytics/seo-analytics.js');
        seoAnalytics = new analyticsModule.default();
        global.window.seoAnalytics = seoAnalytics;

        testModule('SEO Analytics Load', () => seoAnalytics && seoAnalytics.initialized === true);
        testModule('SEO Analytics Metrics', () => typeof seoAnalytics.getSEOMetrics === 'function');
    } catch (error) {
        log(`SEO Analytics load failed: ${error.message}`, 'error');
        testModule('SEO Analytics Load', () => false);
    }

    // Test 4: Load and test SEO Monitor
    let seoMonitor;
    try {
        const monitorModule = await import('./monitoring/seo-monitor.js');
        seoMonitor = new monitorModule.default();
        global.window.seoMonitor = seoMonitor;

        testModule('SEO Monitor Load', () => seoMonitor && typeof seoMonitor.runFullAudit === 'function');
        testModule('SEO Monitor Health Check', () => typeof seoMonitor.getHealthStatus === 'function');
    } catch (error) {
        log(`SEO Monitor load failed: ${error.message}`, 'error');
        testModule('SEO Monitor Load', () => false);
    }

    // Test 5: Test configuration functionality
    if (seoConfig) {
        testModule('Meta Tags Generation', () => {
            const metaTags = seoConfig.getSiteMetaTags();
            return metaTags.description && metaTags.author;
        });

        testModule('Open Graph Generation', () => {
            const ogTags = seoConfig.getOpenGraphTags();
            return ogTags['og:title'] && ogTags['og:description'];
        });

        testModule('Twitter Card Generation', () => {
            const twitterTags = seoConfig.getTwitterTags();
            return twitterTags['twitter:card'] && twitterTags['twitter:title'];
        });
    }

    // Test 6: Test monitor functionality
    if (seoMonitor) {
        testModule('Health Checks Available', () => {
            return seoMonitor.healthChecks &&
                   typeof seoMonitor.healthChecks.metaTags === 'function' &&
                   typeof seoMonitor.healthChecks.structuredData === 'function';
        });

        testModule('Audit History', () => Array.isArray(seoMonitor.auditHistory));
        testModule('Performance Thresholds', () => seoMonitor.performanceThresholds);
    }

    // Test 7: Test analytics functionality
    if (seoAnalytics) {
        testModule('SEO Metrics Collection', () => {
            const metrics = seoAnalytics.getSEOMetrics();
            return metrics && typeof metrics === 'object';
        });

        testModule('Custom Dimensions Setup', () => typeof seoAnalytics.setupCustomDimensions === 'function');
        testModule('Event Tracking', () => typeof seoAnalytics.trackSEOEvent === 'function');
    }

    // Print summary
    log('\n📊 Test Summary:');
    log(`Total modules tested: ${Object.keys(results.modules).length}`);
    const passed = Object.values(results.modules).filter(r => r === 'PASS').length;
    const failed = Object.values(results.modules).filter(r => r === 'FAIL').length;
    const errors = Object.values(results.modules).filter(r => r === 'ERROR').length;

    log(`✅ Passed: ${passed}`);
    log(`❌ Failed: ${failed}`);
    log(`💥 Errors: ${errors}`);

    if (results.errors.length > 0) {
        log('\n🚨 Errors:');
        results.errors.forEach(error => log(`  - ${error}`, 'error'));
    }

    const successRate = ((passed / Object.keys(results.modules).length) * 100).toFixed(1);
    log(`\n🎯 Overall Success Rate: ${successRate}%`);

    if (parseFloat(successRate) >= 80) {
        log('🎉 SEO system is functioning well!');
    } else if (parseFloat(successRate) >= 60) {
        log('⚠️ SEO system has some issues that need attention.');
    } else {
        log('🚨 SEO system needs significant fixes.');
    }

    return results;
}

// Run tests
runTests().then(() => {
    log('🏁 SEO Modules Test Complete');
    process.exit(0);
}).catch(error => {
    log(`💥 Test suite failed: ${error.message}`, 'error');
    process.exit(1);
});
