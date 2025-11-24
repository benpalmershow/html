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
            return `<li><a href="${page.file}" class="nav-link nav-logo ${isActive ? 'active' : ''}" title="Home"><picture><source srcset="images/logo-360x360.webp" type="image/webp"><img src="images/logo-360x360.webp" alt="Howdy, Stranger - Home" width="32" height="32" loading="lazy"></picture></a></li>`;
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
      </section>
    </div>
    <!-- First-time visitor hints -->
    <div class="visitor-hints" id="visitor-hints" aria-hidden="true">
        <div class="hint-overlay"></div>
        <div class="hint-content" aria-describedby="hint-title">
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
          </div>
          <button class="hint-close" id="hint-close-btn">Got it, thanks!</button>
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

  // CTA Modal toggle
  const ctaToggle = document.getElementById('cta-toggle');
  const ctaModal = document.getElementById('cta-modal');
  if (ctaToggle && ctaModal) {
    ctaToggle.addEventListener('click', () => {
      const isOpen = ctaModal.style.display === 'block';
      ctaModal.style.display = isOpen ? 'none' : 'block';
      ctaModal.classList.toggle('active', !isOpen);
      ctaModal.setAttribute('aria-hidden', isOpen);
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

    // Close hints when overlay or close button is clicked
    const hintOverlay = visitorHints.querySelector('.hint-overlay');
    const hintCloseBtn = visitorHints.querySelector('#hint-close-btn');
    [hintOverlay, hintCloseBtn].forEach(el => {
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
