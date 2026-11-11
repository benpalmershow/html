// Load Lucide icons on-demand after page load.
// scheduler.yield() is preferred over setTimeout(..., 0) because it places
// the continuation at the front of the task queue, keeping input responsive.
(function () {
  const loadLucide = () => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lucide@0.400.0/dist/umd/lucide.js';
    script.defer = true;
    script.onload = () => window.lucide?.createIcons();
    document.head.appendChild(script);
  };

  function schedule(task, timeout) {
    if (typeof scheduler !== 'undefined' && typeof scheduler.yield === 'function') {
      scheduler.yield().then(task);
    } else if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(task, { timeout });
    } else {
      setTimeout(task, 0);
    }
  }

  schedule(loadLucide, 3000);
})();