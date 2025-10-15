/**
 * Search Console Integration Module
 * Google Search Console verification and monitoring tools
 */

export { default as SearchConsoleIntegration } from './search-console-integration.js';

// Initialize Search Console integration when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on client-side
    if (typeof window !== 'undefined') {
        import('./search-console-integration.js').then(({ default: SearchConsoleIntegration }) => {
            window.searchConsoleIntegration = new SearchConsoleIntegration();
        }).catch(error => {
            console.warn('Search Console integration initialization failed:', error);
        });
    }
});
