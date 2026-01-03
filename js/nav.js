// Generate sticky navbar with links to all pages
document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('main-nav');

  const PAGES = [
    { name: 'Home', file: 'index.html' },
    { name: 'News', file: 'news.html' },
    { name: 'Numbers', file: 'financials.html' },
    { name: 'Media', file: 'media.html' },
    { name: 'Tweets', file: 'journal.html' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const renderNavLink = (page) => {
    const isActive = currentPage === page.file || (currentPage === '' && page.file === 'index.html');
    if (page.file === 'index.html') {
      return `<li><a href="${page.file}" class="nav-link nav-logo" title="Home"><picture><source srcset="images/logo-360x360.webp" type="image/webp"><img src="images/logo-360x360.webp" alt="Howdy, Stranger - Home" width="32" height="32" loading="lazy"></picture></a></li>`;
    }
    return `<li><a href="${page.file}" class="nav-link ${isActive ? 'active' : ''}">${page.name}</a></li>`;
  };

  const navHTML = `
    <div class="nav-container">
      <ul class="nav-list">
        ${PAGES.map(renderNavLink).join('')}
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
    <div class="cta-modal" id="cta-modal" inert>
      <div class="cta-modal-overlay"></div>
      <section class="cta-container" aria-label="Call to action">
        <button class="cta-close-btn" aria-label="Close this message" title="Close">&times;</button>
         <div class="cta-button">
            <div class="cta-icon-wrapper">
              <i data-lucide="newspaper" style="width: 2rem; height: 2rem;"></i>
            </div>
            <div class="cta-text-wrapper">
              <span>Skip the Sauces, Get the Facts</span>
              <p class="cta-subtext">You could go to NPR and learn about sauces, captions, and uncertainty, or you could come here and read about things that actually affect your life.</p>
            </div>
          </div>

          </div>
      </section>
    </div>
    <!-- First-time visitor hints -->
    <div class="visitor-hints" id="visitor-hints" inert>
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
  window.initializeLucideIcons = () => {
    if (window.lucide?.createIcons) {
      lucide.createIcons();
    } else {
      setTimeout(window.initializeLucideIcons, 100);
    }
  };

  window.initializeLucideIcons();

  // Helper function to get badge class based on score
  const getBadgeClass = (type, score) => {
    if (score < 50) return `${type}-0-49`;
    if (score < 75) return `${type}-50-74`;
    if (score < 90) return `${type}-75-89`;
    return `${type}-90-100`;
  };

  // CTA Modal toggle
  const setupCtaModal = () => {
    const ctaToggle = document.getElementById('cta-toggle');
    const ctaModal = document.getElementById('cta-modal');
    if (!ctaToggle || !ctaModal) return;

    ctaToggle.addEventListener('click', () => {
      const isOpen = ctaModal.style.display === 'block';
      ctaModal.style.display = isOpen ? 'none' : 'block';
      ctaModal.classList.toggle('active', !isOpen);
      ctaModal.toggleAttribute('inert', isOpen);

      if (!isOpen) {
        // initializeTinyDashboard removed
      }
    });

    const closeCtaModal = () => {
      ctaModal.style.display = 'none';
      ctaModal.classList.remove('active');
      ctaModal.setAttribute('inert', '');
      localStorage.setItem('ctaDismissed', 'true');
    };

    const ctaCloseBtn = ctaModal.querySelector('.cta-close-btn');
    const ctaOverlay = ctaModal.querySelector('.cta-modal-overlay');
    [ctaCloseBtn, ctaOverlay].forEach(el => el?.addEventListener('click', closeCtaModal));
  };

  setupCtaModal();

  // Hints toggle
  const setupHintsModal = () => {
    const hintsToggle = document.getElementById('hints-toggle');
    const visitorHints = document.getElementById('visitor-hints');
    if (!hintsToggle || !visitorHints) return;

    const closeHints = () => {
      visitorHints.style.display = 'none';
      visitorHints.classList.remove('active');
      visitorHints.setAttribute('inert', '');
      localStorage.setItem('hintsShown', 'true');
    };

    const openHints = () => {
      visitorHints.style.display = 'block';
      visitorHints.classList.add('active');
      visitorHints.removeAttribute('inert');
    };

    hintsToggle.addEventListener('click', () => {
      const isHidden = visitorHints.style.display === 'none' || visitorHints.style.display === '';
      isHidden ? openHints() : closeHints();
    });

    const hintOverlay = visitorHints.querySelector('.hint-overlay');
    const hintCloseX = visitorHints.querySelector('.hint-close-btn');
    const hintCloseBtn = visitorHints.querySelector('#hint-close-btn');
    [hintOverlay, hintCloseX, hintCloseBtn].forEach(el => el?.addEventListener('click', closeHints));
  };

  setupHintsModal();

  // Handle coffee icon click - wait for footer to load
  const setupCoffeeLink = () => {
    const coffeeLink = navContainer.querySelector('.cta-icon-wrapper[href="#bmc-link"]');
    if (!coffeeLink) return;

    coffeeLink.addEventListener('click', (e) => {
      e.preventDefault();
      const bmcLink = document.getElementById('bmc-link');
      if (bmcLink) {
        bmcLink.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Wait for footer to load
        const checkFooter = setInterval(() => {
          const bmcLink = document.getElementById('bmc-link');
          if (bmcLink) {
            clearInterval(checkFooter);
            bmcLink.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        setTimeout(() => clearInterval(checkFooter), 5000);
      }
    });
  };

  setupCoffeeLink();

  // Navbar hide/show on scroll
  const setupNavbarScroll = () => {
    let lastScrollTop = 0;
    const navbar = document.getElementById('main-nav');
    const SCROLL_THRESHOLD = 100;

    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      const isScrollingDown = currentScroll > lastScrollTop;
      const isPastThreshold = currentScroll > SCROLL_THRESHOLD;

      if (isScrollingDown && isPastThreshold) {
        navbar.classList.add('nav-hidden');
      } else {
        navbar.classList.remove('nav-hidden');
      }

      lastScrollTop = Math.max(0, currentScroll);
    });
  };

  setupNavbarScroll();
});
