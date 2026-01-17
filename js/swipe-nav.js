// Swipe navigation for mobile - navigate between pages with swipe gestures
(function () {
  // Page order for swipe navigation
  const PAGES = [
    { name: 'Home', file: 'index.html' },
    { name: 'News', file: 'news.html' },
    { name: 'Numbers', file: 'financials.html' },
    { name: 'Media', file: 'media.html' },
    { name: 'Tweets', file: 'journal.html' }
  ];

  const SWIPE_THRESHOLD = 50; // Minimum swipe distance in pixels
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouch = false;

  function getCurrentPageIndex() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    return PAGES.findIndex(p => p.file === currentPage);
  }

  function navigateToPage(pageIndex) {
    if (pageIndex >= 0 && pageIndex < PAGES.length) {
      window.location.href = PAGES[pageIndex].file;
    }
  }

  function handleTouchStart(e) {
    // Don't swipe if touching interactive elements
    if (isInteractiveElement(e.target)) {
      isTouch = false;
      return;
    }

    isTouch = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (!isTouch) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Check if it's more horizontal than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
      const currentIndex = getCurrentPageIndex();

      // Swipe left (positive diffX) = next page
      if (diffX > 0) {
        navigateToPage(currentIndex + 1);
      }
      // Swipe right (negative diffX) = previous page
      else {
        navigateToPage(currentIndex - 1);
      }
    }

    isTouch = false;
  }

  function isInteractiveElement(target) {
    // Don't trigger swipe on interactive elements
    const interactiveSelectors = [
      'button',
      'a',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[role="link"]',
      '.cta-modal',
      '.visitor-hints',
      '.nav-links'
    ];

    return interactiveSelectors.some(selector => 
      target.closest(selector)
    );
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Only enable on touch devices
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) {
      return;
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
  }
})();
