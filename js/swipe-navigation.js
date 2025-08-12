// Initialize swipe navigation
document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('swipe-container');
  if (!container) return;
  
  const wrapper = container.querySelector('.swipe-wrapper');
  let startX = 0;
  let isScrolling = false;
  let currentPage = 0;
  const pages = Array.from(document.querySelectorAll('.swipe-page'));
  const pageCount = pages.length;
  
  // Set initial position based on current page
  const currentPagePath = window.location.pathname.split('/').pop() || 'index.html';
  const currentPageIndex = pages.findIndex(page => {
    const pageName = page.dataset.page;
    return (pageName === 'home' && (currentPagePath === 'index.html' || currentPagePath === '')) || 
           (pageName && currentPagePath === `${pageName}.html`);
  });
  
  currentPage = currentPageIndex >= 0 ? currentPageIndex : 0;
  updateActivePage(currentPage);
  
  // Touch events
  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd, { passive: true });
  
  // Mouse events for desktop
  container.addEventListener('mousedown', handleMouseDown);
  
  // Update navigation links to work with swipe
  updateNavLinks();
  
  // Sync navigation links with current page
  function syncNavWithCurrentPage() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPageName = pages[currentPage]?.dataset.page || 'home';
    
    navLinks.forEach(link => {
      const linkHref = link.getAttribute('href');
      const linkPage = linkHref === 'index.html' || linkHref === '/' ? 'home' : 
                      linkHref.replace('.html', '');
      
      if (linkPage === currentPageName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  
  function handleTouchStart(e) {
    startX = e.touches[0].clientX;
    isScrolling = true;
  }
  
  function handleTouchMove(e) {
    if (!isScrolling) return;
    e.preventDefault();
    
    const x = e.touches[0].clientX;
    const diff = startX - x;
    
    if (Math.abs(diff) > 10) {
      const currentTransform = window.getComputedStyle(wrapper).transform;
      const matrix = new DOMMatrixReadOnly(currentTransform);
      const currentTranslate = matrix.m41;
      
      const newTranslate = currentTranslate - diff;
      const maxTranslate = (pageCount - 1) * -window.innerWidth;
      
      if (newTranslate <= 0 && newTranslate >= maxTranslate) {
        wrapper.style.transform = `translateX(${newTranslate}px)`;
        startX = x;
      }
    }
  }
  
  function handleTouchEnd() {
    isScrolling = false;
    snapToPage();
  }
  
  function handleMouseDown(e) {
    startX = e.clientX;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
  
  function handleMouseMove(e) {
    if (!isScrolling) isScrolling = true;
    
    const x = e.clientX;
    const diff = startX - x;
    
    if (Math.abs(diff) > 10) {
      const currentTransform = window.getComputedStyle(wrapper).transform;
      const matrix = new DOMMatrixReadOnly(currentTransform);
      const currentTranslate = matrix.m41;
      
      const newTranslate = currentTranslate - diff;
      const maxTranslate = (pageCount - 1) * -window.innerWidth;
      
      if (newTranslate <= 0 && newTranslate >= maxTranslate) {
        wrapper.style.transform = `translateX(${newTranslate}px)`;
        startX = x;
      }
    }
  }
  
  function handleMouseUp() {
    isScrolling = false;
    snapToPage();
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
  
  function updateActivePage(pageIndex) {
    wrapper.style.transition = 'none';
    wrapper.style.transform = `translateX(${-pageIndex * window.innerWidth}px)`;
    
    pages.forEach((page, index) => {
      page.classList.toggle('active', index === pageIndex);
    });
    
    // Sync navigation links
    syncNavWithCurrentPage();
  }
  
  function snapToPage(pageIndex = null, updateHistory = true) {
    let targetPage = currentPage;
    
    if (pageIndex !== null) {
      targetPage = Math.min(Math.max(0, pageIndex), pageCount - 1);
    } else {
      const currentTransform = window.getComputedStyle(wrapper).transform;
      const matrix = new DOMMatrixReadOnly(currentTransform);
      const currentTranslate = matrix.m41;
      targetPage = Math.round(Math.abs(currentTranslate) / window.innerWidth);
      targetPage = Math.min(Math.max(0, targetPage), pageCount - 1);
    }
    
    // Don't do anything if we're already on this page
    if (targetPage === currentPage) return;
    
    // Update current page
    currentPage = targetPage;
    
    // Animate to the target page
    wrapper.style.transition = 'transform 0.3s ease-out';
    wrapper.style.transform = `translateX(${-currentPage * window.innerWidth}px)`;
    
    // Update active page indicator
    pages.forEach((page, index) => {
      page.classList.toggle('active', index === currentPage);
    });
    
    // Sync navigation links
    syncNavWithCurrentPage();
    
    // Update URL if this is a direct navigation
    if (updateHistory) {
      updateUrlForPage(currentPage);
    }
    
    // Remove transition after animation completes
    setTimeout(() => {
      wrapper.style.transition = 'none';
    }, 300);
  }
  
  function updateUrlForPage(pageIndex) {
    const page = pages[pageIndex];
    if (page && page.dataset.page) {
      const url = new URL(window.location);
      if (url.pathname.endsWith('/')) {
        url.pathname = page.dataset.page === 'home' ? '/' : `/${page.dataset.page}.html`;
      } else {
        const pathParts = url.pathname.split('/');
        pathParts[pathParts.length - 1] = page.dataset.page === 'home' ? '' : `${page.dataset.page}.html`;
        url.pathname = pathParts.join('/');
      }
      window.history.pushState({ page: page.dataset.page }, '', url);
    }
  }
  
  function updateNavLinks() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      // Remove any existing click handlers to prevent duplicates
      const newLink = link.cloneNode(true);
      link.parentNode.replaceChild(newLink, link);
      
      newLink.addEventListener('click', (e) => {
        const targetHref = newLink.getAttribute('href');
        const targetPage = targetHref.replace('.html', '');
        const targetIndex = pages.findIndex(page => 
          page.dataset.page === (targetPage === '/' || targetPage === 'index' ? 'home' : targetPage)
        );
        
        if (targetIndex !== -1) {
          e.preventDefault();
          snapToPage(targetIndex);
          
          // Update URL without page reload
          const newUrl = targetHref === 'index.html' ? '/' : targetHref;
          window.history.pushState({ page: targetPage }, '', newUrl);
        }
      });
    });
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    wrapper.style.transition = 'none';
    wrapper.style.transform = `translateX(${-currentPage * window.innerWidth}px)`;
  });
  
  // Handle browser back/forward buttons
  window.addEventListener('popstate', (e) => {
    const currentPagePath = window.location.pathname.split('/').pop() || 'index.html';
    const targetIndex = pages.findIndex(page => {
      const pageName = page.dataset.page;
      return (pageName === 'home' && (currentPagePath === 'index.html' || currentPagePath === '')) || 
             (pageName && currentPagePath === `${pageName}.html`);
    });
    
    if (targetIndex !== -1 && targetIndex !== currentPage) {
      snapToPage(targetIndex, false);
    }
  });
  
  // Initial sync of navigation
  syncNavWithCurrentPage();
});
