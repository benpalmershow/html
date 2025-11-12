// Enable back/forward cache by properly cleaning up WebSocket connections
(function() {
  // Close Vercel Insights WebSocket before page unload
  window.addEventListener('pagehide', function(event) {
    if (event.persisted === false) {
      // Page is being unloaded, close any analytics WebSockets
      if (window.va && typeof window.va === 'function') {
        try {
          // Vercel Insights cleanup
          if (window.__VERCEL_INSIGHTS__) {
            window.__VERCEL_INSIGHTS__.trim();
          }
        } catch (e) {
          // Silently ignore cleanup errors
        }
      }
    }
  }, true);

  // Mark page as eligible for bfcache
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      // Page was restored from bfcache, reinitialize if needed
      document.body.classList.add('page-restored');
    }
  }, true);
})();
