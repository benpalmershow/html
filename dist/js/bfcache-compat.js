// Enable back/forward cache by properly cleaning up WebSocket connections
(function() {
  const cleanup = () => {
    // Close Vercel Insights WebSocket
    if (window.__VERCEL_INSIGHTS__) {
      try {
        if (typeof window.__VERCEL_INSIGHTS__.closeLast === 'function') {
          window.__VERCEL_INSIGHTS__.closeLast();
        }
      } catch (e) {
        // Silently ignore cleanup errors
      }
    }

    // Close any other open WebSockets
    if (window.WebSocket) {
      // Note: Individual WebSockets cannot be enumerated safely,
      // so ensure all are properly closed by your application code
    }
  };

  // Clean up before page unload to enable bfcache
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) {
      cleanup();
    }
  }, true);

  // Reinitialize when page is restored from bfcache
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      document.body.classList.add('page-restored');
      // Add any other reinitialization logic here
      // (e.g., re-establish WebSocket connections)
    }
  }, true);
})();
