// Generate sticky navbar with links to all pages
document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('main-nav');
  
  const pages = [
    { name: 'Home', file: 'index.html' },
    { name: 'News', file: 'news.html' },
    { name: 'Numbers', file: 'financials.html' },
    { name: 'Media', file: 'media.html' },
    { name: 'Tweets', file: 'journal.html' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const navHTML = `
    <div class="nav-container">
      <ul class="nav-list">
        ${pages.map(page => {
          const isActive = currentPage === page.file || (currentPage === '' && page.file === 'index.html');
           if (page.file === 'index.html') {
             return `<li><a href="${page.file}" class="nav-link nav-logo" title="Home"><picture><source srcset="images/logo-360x360.webp" type="image/webp"><img src="images/logo-360x360.webp" alt="Howdy, Stranger - Home" width="32" height="32" loading="lazy"></picture></a></li>`;
          }
          return `<li><a href="${page.file}" class="nav-link ${isActive ? 'active' : ''}">${page.name}</a></li>`;
        }).join('')}
      </ul>
      <div class="nav-right-section">
         <!-- Compact CTA Button -->
         <button class="cta-icon-btn" id="cta-toggle" aria-label="Show call to action" title="Skip the Sauces">
           <i data-lucide="newspaper" style="width: 1.2rem; height: 1.2rem;"></i>
         </button>
         <!-- Compact Hints Button -->
         <button class="hints-icon-btn" id="hints-toggle" aria-label="Show welcome hints" title="Welcome guide">
           <i data-lucide="help-circle" style="width: 1.2rem; height: 1.2rem;"></i>
         </button>
       </div>
    </div>
    <!-- Call to Action Section (modal) -->
    <div class="cta-modal" id="cta-modal" aria-hidden="true">
      <div class="cta-modal-overlay"></div>
      <section class="cta-container" aria-label="Call to action">
        <button class="cta-close-btn" aria-label="Close this message" title="Close">&times;</button>
         <div class="cta-button">
           <i data-lucide="newspaper" style="width: 2rem; height: 2rem;"></i>
          <div class="cta-text-wrapper">
            <span>Skip the Sauces, Get the Facts</span>
            <p class="cta-subtext">You could go to NPR and learn about sauces and captions or you could come here and read about things that actually affect your life.</p>
          </div>
        </div>
        <!-- Separator between CTA and Performance sections -->
        <div class="cta-separator">
          <hr class="cta-hr">
          <span class="cta-separator-text">Performance Dashboard</span>
          <hr class="cta-hr">
        </div>
        <!-- Tiny Dashboard - appears after main CTA, clearly separated -->
        <div class="cta-tiny-dashboard" id="cta-tiny-dashboard"></div>
      </section>
    </div>
    <!-- First-time visitor hints -->
    <div class="visitor-hints" id="visitor-hints" aria-hidden="true">
        <div class="hint-overlay"></div>
        <div class="hint-content" aria-describedby="hint-title">
          <button class="hint-close-btn" aria-label="Close this message" title="Close">&times;</button>
          <h3 id="hint-title">Welcome to Howdy, Stranger!</h3>
          <div class="hint-steps">
            <div class="hint-step">
              <i data-lucide="newspaper" style="width: 2rem; height: 2rem;"></i>
              <div>
                <strong>News:</strong> Latest market updates, earnings, and policy analysis
              </div>
            </div>
            <div class="hint-step">
              <i data-lucide="bar-chart-3" style="width: 2rem; height: 2rem;"></i>
              <div>
                <strong>Numbers:</strong> Economic indicators, financial data, and market trends
              </div>
            </div>
            <div class="hint-step">
              <picture>
                <source srcset="images/media.webp" type="image/webp">
                <img src="images/media.webp" alt="Media" width="32" height="32" style="width: 2rem; height: 2rem; object-fit: cover;" loading="lazy">
              </picture>
               <div>
                 <strong>Media:</strong> Curated books, films, and podcasts worth your time
               </div>
              </div>
              <div class="hint-step">
               <picture>
                <source srcset="images/read.webp" type="image/webp">
                <img src="images/read.webp" alt="Tweets" width="32" height="32" style="width: 2rem; height: 2rem; object-fit: cover;" loading="lazy">
              </picture>
               <div>
                 <strong>Tweets:</strong> Independent commentary and personal insights
               </div>
              </div>
              <div class="hint-step">
               <picture>
                 <source srcset="images/apple-touch-icon.webp" type="image/webp">
                 <img src="images/apple-touch-icon.webp" alt="Add to Home Screen" width="32" height="32" style="width: 2rem; height: 2rem; object-fit: cover;" loading="lazy">
               </picture>
              <div>
                <strong>Add to Home Screen:</strong> Tap the share icon and select "Add to Home Screen" for quick access
              </div>
              </div>
              <button class="hint-close-btn-action" id="hint-close-btn">Got it, thanks!</button>
              </div>
              </div>
  `;

  navContainer.innerHTML = navHTML;

  // Initialize Lucide icons for the navbar - wait for library if needed
  function initializeLucideIcons() {
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    } else {
      // Retry in 100ms if Lucide not yet loaded
      setTimeout(initializeLucideIcons, 100);
    }
  }

  initializeLucideIcons();

  // Initialize tiny dashboard with colored badges for all pages
  function initializeTinyDashboard() {
    const dashboardContainer = document.getElementById('cta-tiny-dashboard');
    if (!dashboardContainer) return;

    // Load tiny dashboard CSS if not already loaded
    if (!document.querySelector('link[href="css/tiny-dashboard.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'css/tiny-dashboard.css';
      document.head.appendChild(link);
    }

    // Page performance data (simulated Lighthouse scores)
    const pageData = [
      { name: 'Index', perf: 74, acc: 96, bp: 75, seo: 100 },
      { name: 'News', perf: 68, acc: 92, bp: 70, seo: 95 },
      { name: 'Numbers', perf: 82, acc: 94, bp: 80, seo: 98 },
      { name: 'Media', perf: 78, acc: 90, bp: 72, seo: 97 },
      { name: 'Tweets', perf: 85, acc: 93, bp: 78, seo: 99 }
    ];

    // Create dashboard HTML
    const dashboardHTML = `
      <div class="tiny-dashboard">
        <div class="tiny-dashboard-header">
          <span class="tiny-dashboard-title">Page Performance</span>
          <span class="tiny-dashboard-date" id="tiny-dashboard-date">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div class="tiny-dashboard-pages">
          ${pageData.map(page => `
            <div class="tiny-dashboard-page">
              <span class="tiny-dashboard-label">${page.name}:</span>
              <div class="tiny-dashboard-badges">
                <span class="tiny-badge ${getBadgeClass('perf', page.perf)}" title="Performance: ${page.perf}">P${page.perf}</span>
                <span class="tiny-badge ${getBadgeClass('acc', page.acc)}" title="Accessibility: ${page.acc}">A${page.acc}</span>
                <span class="tiny-badge ${getBadgeClass('bp', page.bp)}" title="Best Practices: ${page.bp}">B${page.bp}</span>
                <span class="tiny-badge ${getBadgeClass('seo', page.seo)}" title="SEO: ${page.seo}">S${page.seo}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    dashboardContainer.innerHTML = dashboardHTML;

    // Add performance scores table below the existing dashboard using the same format
    function addPerformanceScoresTable() {
      const scoresTableHTML = `
        <div class="tiny-dashboard">
          <div class="tiny-dashboard-header">
            <span class="tiny-dashboard-title">Website Performance</span>
          </div>
          <div class="tiny-dashboard-pages">
            <div class="tiny-dashboard-page">
              <span class="tiny-dashboard-label">Performance:</span>
              <div class="tiny-dashboard-badges">
                <span class="tiny-badge perf-50-74" title="Performance: 63">P63</span>
                <span class="tiny-badge acc-75-89" title="Accessibility: 96">A96</span>
                <span class="tiny-badge bp-50-74" title="Best Practices: 75">B75</span>
                <span class="tiny-badge seo-90-100" title="SEO: 100">S100</span>
              </div>
            </div>
            <div class="tiny-dashboard-page">
              <span class="tiny-dashboard-label">Metrics:</span>
              <div class="tiny-dashboard-badges">
                <span class="tiny-badge perf-75-89" title="First Contentful Paint: 94">FCP94</span>
                <span class="tiny-badge perf-0-49" title="Largest Contentful Paint: 10">LCP10</span>
                <span class="tiny-badge perf-50-74" title="Total Blocking Time: 75">TBT75</span>
                <span class="tiny-badge perf-50-74" title="Cumulative Layout Shift: 76">CLS76</span>
              </div>
            </div>
            <div class="tiny-dashboard-page">
              <span class="tiny-dashboard-label">Timing:</span>
              <div class="tiny-dashboard-badges">
                <span class="tiny-badge perf-90-100" title="Speed Index: 100">SI100</span>
                <span class="tiny-badge perf-0-49" title="Time to Interactive: 48">TTI48</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // Append the performance scores table after the existing dashboard
      const scoresTableContainer = document.createElement('div');
      scoresTableContainer.className = 'performance-scores-container';
      scoresTableContainer.innerHTML = scoresTableHTML;
      dashboardContainer.appendChild(scoresTableContainer);
    }

    // Call the function to add the performance scores table
    addPerformanceScoresTable();
  }

  // Helper function to get badge class based on score
  function getBadgeClass(type, score) {
    if (score < 50) return `${type}-0-49`;
    if (score < 75) return `${type}-50-74`;
    if (score < 90) return `${type}-75-89`;
    return `${type}-90-100`;
  }

  // CTA Modal toggle
  const ctaToggle = document.getElementById('cta-toggle');
  const ctaModal = document.getElementById('cta-modal');
  if (ctaToggle && ctaModal) {
    ctaToggle.addEventListener('click', () => {
      const isOpen = ctaModal.style.display === 'block';
      ctaModal.style.display = isOpen ? 'none' : 'block';
      ctaModal.classList.toggle('active', !isOpen);
      ctaModal.setAttribute('aria-hidden', isOpen);

      // Initialize tiny dashboard when CTA opens
      if (!isOpen) {
        initializeTinyDashboard();
      }
    });

    // Close CTA modal when overlay or close button is clicked
    const ctaCloseBtn = ctaModal.querySelector('.cta-close-btn');
    const ctaOverlay = ctaModal.querySelector('.cta-modal-overlay');
    [ctaCloseBtn, ctaOverlay].forEach(el => {
      if (el) {
        el.addEventListener('click', () => {
          ctaModal.style.display = 'none';
          ctaModal.classList.remove('active');
          ctaModal.setAttribute('aria-hidden', 'true');
          localStorage.setItem('ctaDismissed', 'true');
        });
      }
    });
  }

  // Hints toggle
  const hintsToggle = document.getElementById('hints-toggle');
  const visitorHints = document.getElementById('visitor-hints');
  if (hintsToggle && visitorHints) {
    hintsToggle.addEventListener('click', () => {
      if (visitorHints.style.display === 'none' || visitorHints.style.display === '') {
        visitorHints.style.display = 'block';
        visitorHints.classList.add('active');
        visitorHints.setAttribute('aria-hidden', 'false');
      } else {
        visitorHints.style.display = 'none';
        visitorHints.classList.remove('active');
        visitorHints.setAttribute('aria-hidden', 'true');
      }
    });

    // Close hints when overlay or close buttons are clicked
    const hintOverlay = visitorHints.querySelector('.hint-overlay');
    const hintCloseX = visitorHints.querySelector('.hint-close-btn');
    const hintCloseBtn = visitorHints.querySelector('#hint-close-btn');
    [hintOverlay, hintCloseX, hintCloseBtn].forEach(el => {
      if (el) {
        el.addEventListener('click', () => {
          visitorHints.style.display = 'none';
          visitorHints.classList.remove('active');
          visitorHints.setAttribute('aria-hidden', 'true');
          localStorage.setItem('hintsShown', 'true');
        });
      }
    });
  }

  // Navbar hide/show on scroll
  let lastScrollTop = 0;
  const navbar = document.getElementById('main-nav');
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    if (currentScroll > lastScrollTop && currentScroll > 100) {
      // Scrolling down and past threshold
      navbar.classList.add('nav-hidden');
    } else {
      // Scrolling up
      navbar.classList.remove('nav-hidden');
    }
    
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
  }, false);
});
