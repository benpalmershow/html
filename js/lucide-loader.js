// Load Lucide icons on-demand after page load
(function () {
  const loadLucide = () => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lucide@0.400.0/dist/umd/lucide.js';
    script.defer = true;
    script.onload = () => window.lucide?.createIcons();
    document.head.appendChild(script);
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadLucide, { timeout: 3000 });
  } else {
    setTimeout(loadLucide, 100);
  }
})();
