// nav.js - Dynamic navigation generator
(function() {
  // Navigation items (Home first, then alphabetical)
  const navItems = [
    { text: 'Home', href: 'index.html', icon: '' },
    { text: '📻listen', href: 'listen.html', icon: '' },
    { text: '📚read', href: 'read.html', icon: '' },
    { text: '🎥watch', href: 'watch.html', icon: '' }
  ];

  // Function to get current page filename
  function getCurrentPage() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  }

  // Function to generate navigation HTML
  function generateNav() {
    const currentPage = getCurrentPage();
    
    return navItems.map(item => {
      const isActive = item.href === currentPage ? ' active' : '';
      return `<a class="nav-link${isActive}" href="${item.href}">${item.text}</a>`;
    }).join('');
  }

  // Initialize navigation when DOM is loaded
  function initNav() {
    const navContainer = document.querySelector('.nav-links');
    if (navContainer) {
      navContainer.innerHTML = generateNav();
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();