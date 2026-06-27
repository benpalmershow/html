/**
 * View Transitions Controller
 * Handles same-document view transitions for dynamic content updates
 * and prepares infrastructure for future cross-document transitions
 */

(function() {
  'use strict';

  // Feature detection
  const supportsViewTransitions = 'startViewTransition' in document;
  const supportsNavigationAPI = 'navigation' in window;

  // Track navigation history for direction detection
  const navigationHistory = [];
  const maxHistorySize = 10;

  /**
   * Determine navigation direction (forward/backward)
   * @param {string} currentUrl - Current page URL
   * @param {string} targetUrl - Target page URL
   * @returns {string} 'forward', 'backward', or 'none'
   */
  function determineNavigationDirection(currentUrl, targetUrl) {
    if (currentUrl === targetUrl) return 'none';
    
    // Check if we've visited the target URL before
    const targetIndex = navigationHistory.findIndex(entry => entry.url === targetUrl);
    
    if (targetIndex !== -1 && targetIndex < navigationHistory.length - 1) {
      return 'backward';
    }
    
    return 'forward';
  }

  /**
   * Update navigation history
   * @param {string} url - Current URL
   */
  function updateHistory(url) {
    navigationHistory.push({ url, timestamp: Date.now() });
    if (navigationHistory.length > maxHistorySize) {
      navigationHistory.shift();
    }
  }

  /**
   * Apply view transition with type
   * @param {Function} updateCallback - Function that updates the DOM
   * @param {string} type - Transition type ('forward', 'backward', 'default')
   * @returns {Promise} Resolves when transition completes
   */
  function applyTransition(updateCallback, type = 'default') {
    if (!supportsViewTransitions) {
      // Fallback: just run the callback
      updateCallback();
      return Promise.resolve();
    }

    const types = type === 'default' ? [] : [type];
    
    return document.startViewTransition({
      update: updateCallback,
      types: types
    }).ready.catch(err => {
      console.warn('View transition failed:', err);
      // Fallback: run the callback anyway
      updateCallback();
    });
  }

  /**
   * Intercept navigation links for SPA-style transitions
   * Note: This requires the site to be converted to SPA architecture
   * or use of the Navigation API for full-page transitions
   */
  function setupNavigationInterception() {
    // Intercept same-page anchor links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      
      // Skip external links, non-HTTP links, and downloads
const isExternalHttp = href && (href.startsWith('http://') || href.startsWith('https://')) && 
                             !href.startsWith(window.location.origin);
      if (!href || 
          isExternalHttp ||
          link.hasAttribute('download') ||
          link.target === '_blank') {
        return;
      }

      // Handle hash-based navigation (same-document)
      if (href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.slice(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          const direction = determineNavigationDirection(
            window.location.hash || '#',
            href
          );
          
          applyTransition(() => {
            targetElement.scrollIntoView({ behavior: 'smooth' });
            window.location.hash = href;
          }, direction);
        }
        return;
      }

// For same-origin page navigation, we could use the Navigation API
       // This is experimental and requires browser support
       if (supportsNavigationAPI && (href.startsWith('/') || href.endsWith('.html'))) {
         // Future: Implement Navigation API for cross-document transitions
         // Currently, we let the browser handle it normally
         updateHistory(window.location.href);
       }
    });

    // Update history on page load
    updateHistory(window.location.href);
  }

  /**
   * Handle dynamic content updates with view transitions
   * Use this when updating content dynamically (e.g., filtering, sorting)
   * @param {Function} updateFn - Function that performs DOM updates
   * @param {Object} options - Options for the transition
   * @returns {Promise}
   */
  function updateWithTransition(updateFn, options = {}) {
    const { type = 'default' } = options;
    return applyTransition(updateFn, type);
  }

  /**
   * Expose API globally for use in other scripts
   */
  window.ViewTransitions = {
    supported: supportsViewTransitions,
    apply: applyTransition,
    updateWithTransition: updateWithTransition,
    determineDirection: determineNavigationDirection,
    navigationHistory: navigationHistory
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNavigationInterception);
  } else {
    setupNavigationInterception();
  }

  // Listen for Navigation API entries (if supported)
  if (supportsNavigationAPI) {
    window.navigation.addEventListener('navigate', (event) => {
      // Only track same-origin navigation for history
      if (new URL(event.destination.url).origin === window.location.origin) {
        updateHistory(event.destination.url);
      }
    });
  }

  // Log support status
  if (supportsViewTransitions) {
    console.log('View Transitions API supported');
  } else {
    console.log('View Transitions API not supported - fallback mode enabled');
  }

})();
