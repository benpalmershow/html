/**
 * SEO Analytics Module
 * Enhanced Google Analytics 4 integration for SEO monitoring
 */

export { default as SEOAnalytics } from './seo-analytics.js';

// Initialize SEO analytics when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on client-side
    if (typeof window !== 'undefined') {
        import('./seo-analytics.js').then(({ default: SEOAnalytics }) => {
            window.seoAnalytics = new SEOAnalytics();
        }).catch(error => {
            console.warn('SEO Analytics initialization failed:', error);
        });
    }
});
