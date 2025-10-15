/**
 * Mobile SEO Module
 * Exports mobile-specific SEO optimization utilities
 */

export { default as MobileSEOOptimizer } from './mobile-optimizer.js';

// Initialize mobile SEO optimizations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on client-side
    if (typeof window !== 'undefined') {
        import('./mobile-optimizer.js').then(({ default: MobileSEOOptimizer }) => {
            window.mobileSEOOptimizer = new MobileSEOOptimizer();
        });
    }
});
