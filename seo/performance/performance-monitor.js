/**
 * Performance Monitoring Utilities
 * Tracks Core Web Vitals and performance metrics
 */

class PerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            enableCoreWebVitals: true,
            enableResourceTiming: true,
            enableUserTiming: true,
            enableLighthouseTracking: true,
            reportingEndpoint: null,
            performanceBudget: {
                FCP: 1800, // First Contentful Paint (ms)
                LCP: 2500, // Largest Contentful Paint (ms)
                FID: 100,  // First Input Delay (ms)
                CLS: 0.1,  // Cumulative Layout Shift
                TTFB: 800, // Time to First Byte (ms)
                TTI: 3800  // Time to Interactive (ms)
            },
            ...options
        };

        this.metrics = new Map();
        this.observers = [];
        this.init();
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        if (this.options.enableCoreWebVitals) {
            this.setupCoreWebVitals();
        }
        
        if (this.options.enableResourceTiming) {
            this.setupResourceTiming();
        }
        
        if (this.options.enableUserTiming) {
            this.setupUserTiming();
        }

        this.setupNavigationTiming();
        this.setupPerformanceBudgetValidation();
    }

    /**
     * Setup Core Web Vitals monitoring
     */
    setupCoreWebVitals() {
        // First Contentful Paint (FCP)
        this.observePerformanceEntry('paint', (entries) => {
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
                this.recordMetric('FCP', fcpEntry.startTime);
            }
        });

        // Largest Contentful Paint (LCP)
        this.observePerformanceEntry('largest-contentful-paint', (entries) => {
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
                this.recordMetric('LCP', lastEntry.startTime);
            }
        });

        // First Input Delay (FID)
        this.observePerformanceEntry('first-input', (entries) => {
            const firstInput = entries[0];
            if (firstInput) {
                const fid = firstInput.processingStart - firstInput.startTime;
                this.recordMetric('FID', fid);
            }
        });

        // Cumulative Layout Shift (CLS)
        this.observePerformanceEntry('layout-shift', (entries) => {
            let clsValue = 0;
            for (const entry of entries) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            this.recordMetric('CLS', clsValue);
        });

        // Setup Web Vitals library integration if available
        this.setupWebVitalsLibrary();
    }

    /**
     * Setup Web Vitals library integration
     */
    setupWebVitalsLibrary() {
        // Check if web-vitals library is available
        if (typeof window.webVitals !== 'undefined') {
            const { getCLS, getFID, getFCP, getLCP, getTTFB } = window.webVitals;
            
            getCLS((metric) => this.recordMetric('CLS', metric.value));
            getFID((metric) => this.recordMetric('FID', metric.value));
            getFCP((metric) => this.recordMetric('FCP', metric.value));
            getLCP((metric) => this.recordMetric('LCP', metric.value));
            getTTFB((metric) => this.recordMetric('TTFB', metric.value));
        }
    }

    /**
     * Observe performance entries of a specific type
     * @param {string} type - Performance entry type
     * @param {Function} callback - Callback function
     */
    observePerformanceEntry(type, callback) {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                callback(list.getEntries());
            });
            
            observer.observe({ type, buffered: true });
            this.observers.push(observer);
        } catch (error) {
            console.warn(`Failed to observe ${type} entries:`, error);
        }
    }

    /**
     * Setup resource timing monitoring
     */
    setupResourceTiming() {
        this.observePerformanceEntry('resource', (entries) => {
            entries.forEach(entry => {
                this.analyzeResourceTiming(entry);
            });
        });
    }

    /**
     * Analyze resource timing entry
     * @param {PerformanceResourceTiming} entry - Resource timing entry
     */
    analyzeResourceTiming(entry) {
        const resourceMetrics = {
            name: entry.name,
            type: this.getResourceType(entry),
            size: entry.transferSize,
            duration: entry.responseEnd - entry.startTime,
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
            ttfb: entry.responseStart - entry.requestStart,
            download: entry.responseEnd - entry.responseStart
        };

        // Store resource metrics
        if (!this.metrics.has('resources')) {
            this.metrics.set('resources', []);
        }
        this.metrics.get('resources').push(resourceMetrics);

        // Check for performance issues
        this.checkResourcePerformance(resourceMetrics);
    }

    /**
     * Get resource type from performance entry
     * @param {PerformanceResourceTiming} entry - Resource timing entry
     * @returns {string}
     */
    getResourceType(entry) {
        if (entry.initiatorType) {
            return entry.initiatorType;
        }

        const url = entry.name;
        if (url.includes('.css')) return 'css';
        if (url.includes('.js')) return 'script';
        if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'img';
        if (url.match(/\.(woff|woff2|ttf|otf)$/i)) return 'font';
        
        return 'other';
    }

    /**
     * Check resource performance against thresholds
     * @param {Object} resourceMetrics - Resource performance metrics
     */
    checkResourcePerformance(resourceMetrics) {
        const issues = [];

        // Check for slow resources
        if (resourceMetrics.duration > 3000) {
            issues.push(`Slow loading resource: ${resourceMetrics.name} (${resourceMetrics.duration}ms)`);
        }

        // Check for large resources
        if (resourceMetrics.size > 1000000) { // 1MB
            issues.push(`Large resource: ${resourceMetrics.name} (${(resourceMetrics.size / 1024 / 1024).toFixed(2)}MB)`);
        }

        // Check for slow TTFB
        if (resourceMetrics.ttfb > 1000) {
            issues.push(`Slow TTFB: ${resourceMetrics.name} (${resourceMetrics.ttfb}ms)`);
        }

        if (issues.length > 0) {
            this.recordPerformanceIssue('resource', issues);
        }
    }

    /**
     * Setup user timing monitoring
     */
    setupUserTiming() {
        this.observePerformanceEntry('measure', (entries) => {
            entries.forEach(entry => {
                this.recordMetric(`user_${entry.name}`, entry.duration);
            });
        });
    }

    /**
     * Setup navigation timing monitoring
     */
    setupNavigationTiming() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.recordMetric('TTFB', navigation.responseStart - navigation.requestStart);
                this.recordMetric('DOMContentLoaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
                this.recordMetric('LoadComplete', navigation.loadEventEnd - navigation.loadEventStart);
                this.recordMetric('PageLoadTime', navigation.loadEventEnd - navigation.navigationStart);
            }
        });
    }

    /**
     * Setup performance budget validation
     */
    setupPerformanceBudgetValidation() {
        // Validate budget after page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.validatePerformanceBudget();
            }, 1000);
        });
    }

    /**
     * Record a performance metric
     * @param {string} name - Metric name
     * @param {number} value - Metric value
     */
    recordMetric(name, value) {
        const timestamp = Date.now();
        const metric = { name, value, timestamp };
        
        this.metrics.set(name, metric);
        
        // Report to analytics if configured
        if (this.options.reportingEndpoint) {
            this.reportMetric(metric);
        }

        // Trigger custom event
        this.dispatchMetricEvent(metric);
    }

    /**
     * Record a performance issue
     * @param {string} category - Issue category
     * @param {Array} issues - Array of issue descriptions
     */
    recordPerformanceIssue(category, issues) {
        if (!this.metrics.has('issues')) {
            this.metrics.set('issues', []);
        }
        
        this.metrics.get('issues').push({
            category,
            issues,
            timestamp: Date.now()
        });
    }

    /**
     * Validate performance against budget
     */
    validatePerformanceBudget() {
        const budget = this.options.performanceBudget;
        const violations = [];

        Object.keys(budget).forEach(metricName => {
            const metric = this.metrics.get(metricName);
            if (metric && metric.value > budget[metricName]) {
                violations.push({
                    metric: metricName,
                    actual: metric.value,
                    budget: budget[metricName],
                    violation: metric.value - budget[metricName]
                });
            }
        });

        if (violations.length > 0) {
            this.recordPerformanceIssue('budget', violations);
            console.warn('Performance budget violations:', violations);
        }

        return violations;
    }

    /**
     * Get Lighthouse score estimation
     * @returns {Object}
     */
    getLighthouseScoreEstimation() {
        const fcp = this.metrics.get('FCP')?.value || 0;
        const lcp = this.metrics.get('LCP')?.value || 0;
        const fid = this.metrics.get('FID')?.value || 0;
        const cls = this.metrics.get('CLS')?.value || 0;

        // Simplified Lighthouse scoring algorithm
        const fcpScore = this.calculateMetricScore(fcp, 1800, 3000);
        const lcpScore = this.calculateMetricScore(lcp, 2500, 4000);
        const fidScore = this.calculateMetricScore(fid, 100, 300, true);
        const clsScore = this.calculateMetricScore(cls, 0.1, 0.25, true);

        const performanceScore = Math.round(
            (fcpScore * 0.1 + lcpScore * 0.25 + fidScore * 0.1 + clsScore * 0.15) * 100
        );

        return {
            performance: performanceScore,
            metrics: {
                FCP: { value: fcp, score: fcpScore },
                LCP: { value: lcp, score: lcpScore },
                FID: { value: fid, score: fidScore },
                CLS: { value: cls, score: clsScore }
            }
        };
    }

    /**
     * Calculate metric score based on Lighthouse methodology
     * @param {number} value - Actual metric value
     * @param {number} good - Good threshold
     * @param {number} poor - Poor threshold
     * @param {boolean} reverse - Whether lower values are better
     * @returns {number}
     */
    calculateMetricScore(value, good, poor, reverse = false) {
        if (reverse) {
            if (value <= good) return 1;
            if (value >= poor) return 0;
            return 1 - (value - good) / (poor - good);
        } else {
            if (value <= good) return 1;
            if (value >= poor) return 0;
            return 1 - (value - good) / (poor - good);
        }
    }

    /**
     * Report metric to analytics endpoint
     * @param {Object} metric - Metric object
     */
    async reportMetric(metric) {
        if (!this.options.reportingEndpoint) return;

        try {
            await fetch(this.options.reportingEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'performance_metric',
                    metric,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now()
                })
            });
        } catch (error) {
            console.warn('Failed to report metric:', error);
        }
    }

    /**
     * Dispatch custom metric event
     * @param {Object} metric - Metric object
     */
    dispatchMetricEvent(metric) {
        const event = new CustomEvent('performanceMetric', {
            detail: metric
        });
        window.dispatchEvent(event);
    }

    /**
     * Get all performance metrics
     * @returns {Object}
     */
    getMetrics() {
        const metricsObject = {};
        this.metrics.forEach((value, key) => {
            metricsObject[key] = value;
        });
        return metricsObject;
    }

    /**
     * Get performance summary
     * @returns {Object}
     */
    getPerformanceSummary() {
        const coreMetrics = ['FCP', 'LCP', 'FID', 'CLS', 'TTFB'];
        const summary = {};

        coreMetrics.forEach(metric => {
            const data = this.metrics.get(metric);
            if (data) {
                summary[metric] = {
                    value: data.value,
                    status: this.getMetricStatus(metric, data.value)
                };
            }
        });

        return {
            coreWebVitals: summary,
            lighthouseEstimation: this.getLighthouseScoreEstimation(),
            budgetViolations: this.validatePerformanceBudget(),
            resourceCount: this.metrics.get('resources')?.length || 0,
            issueCount: this.metrics.get('issues')?.length || 0
        };
    }

    /**
     * Get metric status (good, needs improvement, poor)
     * @param {string} metricName - Metric name
     * @param {number} value - Metric value
     * @returns {string}
     */
    getMetricStatus(metricName, value) {
        const thresholds = {
            FCP: { good: 1800, poor: 3000 },
            LCP: { good: 2500, poor: 4000 },
            FID: { good: 100, poor: 300 },
            CLS: { good: 0.1, poor: 0.25 },
            TTFB: { good: 800, poor: 1800 }
        };

        const threshold = thresholds[metricName];
        if (!threshold) return 'unknown';

        if (value <= threshold.good) return 'good';
        if (value <= threshold.poor) return 'needs-improvement';
        return 'poor';
    }

    /**
     * Start custom performance measurement
     * @param {string} name - Measurement name
     */
    startMeasurement(name) {
        performance.mark(`${name}-start`);
    }

    /**
     * End custom performance measurement
     * @param {string} name - Measurement name
     */
    endMeasurement(name) {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
    }

    /**
     * Clean up performance observers
     */
    cleanup() {
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers = [];
    }
}

export default PerformanceMonitor;