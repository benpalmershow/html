/**
 * SEO Monitoring Module
 * Automated SEO health checks, audits, and performance regression detection
 */

export { default as SEOMonitor } from './seo-monitor.js';

// Initialize SEO monitoring when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on client-side
    if (typeof window !== 'undefined') {
        import('./seo-monitor.js').then(({ default: SEOMonitor }) => {
            window.seoMonitor = new SEOMonitor();
        }).catch(error => {
            console.warn('SEO monitoring initialization failed:', error);
        });
    }
});
