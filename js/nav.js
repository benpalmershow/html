// Generate sticky navbar with links to all pages
document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('main-nav');

  const PAGES = [
    { name: 'Home', file: 'index.html', icon: '' },
    { name: 'Numbers', file: 'financials.html', desc: 'Economic indicators and market data', icon: 'read.webp' },
    { name: 'Media', file: 'media.html', desc: 'Books, films, and listening picks', icon: 'media.webp' },
    { name: 'Tweets', file: 'journal.html', desc: 'Short-form analysis and observations', icon: 'announcements.webp' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isHomepage = currentPage === 'index.html' || currentPage === '';
  const HELP_NEW_VERSION = '2026-03-print-weekly';
  const HELP_NEW_STORAGE_KEY = 'help_new_seen_version';
  let hasHelpNewItem = true;
  try {
    hasHelpNewItem = localStorage.getItem(HELP_NEW_STORAGE_KEY) !== HELP_NEW_VERSION;
  } catch {
    hasHelpNewItem = true;
  }

  const renderNavLink = (page) => {
    const isActive = currentPage === page.file || (currentPage === '' && page.file === 'index.html');
    if (page.file === 'index.html' && !page.icon) return '';
    if (page.icon) {
      return `<li><a href="${page.file}" class="nav-link nav-icon-link ${isActive ? 'active' : ''}" title="${page.name}"><img src="images/${page.icon}" alt="${page.name}" class="nav-link-icon" width="24" height="24" loading="eager"></a></li>`;
    }
    return `<li><a href="${page.file}" class="nav-link ${isActive ? 'active' : ''}">${page.name}</a></li>`;
  };

  const navHTML = `
    <div class="nav-container">
      <a href="index.html" class="nav-link nav-logo" title="Home"><picture><source srcset="images/logo-360x360.webp" type="image/webp"><img src="images/logo-360x360.webp" alt="Howdy, Stranger - Home" width="40" height="40" loading="lazy"></picture></a>
      <ul class="nav-list">
        ${PAGES.map(renderNavLink).join('')}
      </ul>
      <div class="nav-right-section">
         <a href="one-pager.html" target="_blank" rel="noopener noreferrer" class="cta-icon-btn" aria-label="Print Weekly" title="Print Weekly">
           <i data-lucide="printer" style="width: 1.2rem; height: 1.2rem;"></i>
         </a>
         <button class="hints-icon-btn${hasHelpNewItem ? ' has-new' : ''}" id="hints-toggle" aria-label="${hasHelpNewItem ? 'Show welcome hints (1 new)' : 'Show welcome hints'}" title="Welcome guide">
           <i data-lucide="help-circle" style="width: 1.2rem; height: 1.2rem;"></i>
           ${hasHelpNewItem ? '<span class="hints-notification-badge" aria-hidden="true">1</span>' : ''}
         </button>
       </div>
    </div>
    <!-- First-time visitor hints -->
    <div class="visitor-hints" id="visitor-hints" inert>
        <div class="hint-overlay"></div>
        <div class="hint-content" aria-describedby="hint-title">
          <button class="hint-close-btn" aria-label="Close this message" title="Close">&times;</button>
          <h3 id="hint-title">Welcome to Howdy, Stranger!</h3>
          <div class="hint-steps">
            <div class="hint-step">
              <picture>
                <source srcset="images/read.webp" type="image/webp">
                <img src="images/read.webp" alt="Numbers" width="32" height="32" style="width: 2rem; height: 2rem; object-fit: cover;" loading="lazy">
              </picture>
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
                <source srcset="images/announcements.webp" type="image/webp">
                <img src="images/announcements.webp" alt="Tweets" width="32" height="32" style="width: 2rem; height: 2rem; object-fit: cover;" loading="lazy">
              </picture>
               <div>
                 <strong>Tweets:</strong> Independent commentary and personal insights
               </div>
              </div>
              <div class="hint-step">
                <i data-lucide="hand" style="width: 2rem; height: 2rem;"></i>
               <div>
                 <strong>Mobile Navigation:</strong> Swipe left or right to navigate between pages
               </div>
               </div>
              <div class="hint-step">
                <i data-lucide="expand" style="width: 2rem; height: 2rem;"></i>
               <div>
                 <strong>Expand Cards:</strong> Press <kbd class="hint-key">Enter</kbd> or click to expand, <kbd class="hint-key">Esc</kbd> to close
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
                <div class="hint-step">
                 <i data-lucide="message-circle" style="width: 2rem; height: 2rem;"></i>
                <div>
                  <strong>Contact Us:</strong> <a href="sms:+12019725637">201-972-5637 (2019PALMER)</a>
                </div>
                </div>
                <button class="hint-close-btn-action" id="hint-close-btn">Got it, thanks!</button>
              </div>
              </div>
  `;

  navContainer.innerHTML = navHTML;

  // Badge system — show counts on nav links for new content
  const FIRST_VISIT_KEY = 'new_badges_seeded';
  const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY);

  const addBadge = (file, count, storageKey, latestVal, label) => {
    if (isFirstVisit) {
      try { localStorage.setItem(storageKey, latestVal); } catch {}
      return;
    }
    if (count <= 0 && !label) return;
    const display = label || (count > 9 ? '9+' : String(count));

    const navLink = navContainer.querySelector('a.nav-link:not(.nav-logo)[href="' + file + '"]');
    if (!navLink) return;

    // Check if badge already exists
    if (navLink.querySelector('.new-count-badge')) return;

    const badge = document.createElement('span');
    badge.className = 'new-count-badge nav-badge';
    badge.textContent = display;
    badge.title = label || (count + ' new');
    badge.setAttribute('aria-hidden', 'true');
    
    navLink.appendChild(badge);
    
    navLink.addEventListener('click', () => {
      try { localStorage.setItem(storageKey, latestVal); } catch {}
    });
  };

  const cache = Date.now();
  // Numbers
  fetch('json/financials-data.json?v=' + cache).then(r => r.ok ? r.json() : null).then(data => {
    if (!data || !data.lastUpdated) return;
    const key = 'new_seen_financials';
    const seen = localStorage.getItem(key);
    if (seen === data.lastUpdated) return;
    const t = new Date(data.lastUpdated).getTime();
    const diff = Date.now() - t;
    if (diff > 2 * 86400000) return;
    addBadge('financials.html', 1, key, data.lastUpdated);
  }).catch(() => {});

  // Media
  fetch('json/media.json?v=' + cache).then(r => r.ok ? r.json() : null).then(data => {
    if (!data || !data.length) return;
    const key = 'new_seen_media';
    const seen = localStorage.getItem(key);
    const cutoff = Date.now() - 2 * 86400000;
    const sorted = data.filter(m => m.dateAdded).sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
    let count = 0;
    for (const m of sorted) {
      const t = new Date(m.dateAdded + 'T00:00:00').getTime();
      if (t < cutoff) break;
      if (seen && m.dateAdded === seen) break;
      count++;
    }
    if (sorted.length && count > 0) addBadge('media.html', count, key, sorted[0].dateAdded);
  }).catch(() => {});

  // Tweets
  fetch('json/journal.json?v=' + cache).then(r => r.ok ? r.json() : null).then(data => {
    if (!data || !data.length) return;
    const key = 'new_seen_journal';
    const seen = localStorage.getItem(key);
    const cutoff = Date.now() - 2 * 86400000;
    let count = 0;
    for (const day of data) {
      const [m, d, y] = day.date.split('/').map(Number);
      if (new Date(2000 + y, m - 1, d).getTime() < cutoff) break;
      if (seen && day.date === seen) break;
      count += (day.entries ? day.entries.length : 0);
    }
    if (count > 0) addBadge('journal.html', count, key, data[0].date);
  }).catch(() => {});

  if (isFirstVisit) {
    try { localStorage.setItem(FIRST_VISIT_KEY, '1'); } catch {}
  }

  // Initialize Lucide icons for the navbar
  window.initializeLucideIcons = () => {
    if (window.lucide?.createIcons) {
      lucide.createIcons();
    } else {
      setTimeout(window.initializeLucideIcons, 100);
    }
  };
  window.initializeLucideIcons();

  // Advanced popover management
  class PopoverManager {
    constructor(toggleBtn, popoverEl, options = {}) {
      this.toggleBtn = toggleBtn;
      this.popoverEl = popoverEl;
      this.isOpen = false;
      this.options = {
        closeOnClickOutside: options.closeOnClickOutside !== false,
        closeOnEscape: options.closeOnEscape !== false,
        returnFocusOnClose: options.returnFocusOnClose !== false,
        animationDuration: options.animationDuration || 300,
        ...options
      };
      this.init();
    }

    init() {
      this.toggleBtn.setAttribute('aria-haspopup', 'dialog');
      this.toggleBtn.setAttribute('aria-expanded', 'false');
      this.popoverEl.setAttribute('role', 'dialog');
      this.popoverEl.setAttribute('aria-modal', 'true');
      this.toggleBtn.addEventListener('click', () => this.toggle());
      if (this.options.closeOnEscape) {
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.isOpen) this.close();
        });
      }
      if (this.options.closeOnClickOutside) {
        document.addEventListener('click', (e) => {
          if (this.isOpen && !this.popoverEl.contains(e.target) && !this.toggleBtn.contains(e.target)) this.close();
        });
      }
      this.popoverEl.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') this.handleTabKey(e);
      });
    }

    handleTabKey(e) {
      const els = this.popoverEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!els.length) return;
      if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
    }

    open() {
      if (this.isOpen) return;
      this.popoverEl.style.display = 'block';
      requestAnimationFrame(() => this.popoverEl.classList.add('popover-open'));
      this.toggleBtn.setAttribute('aria-expanded', 'true');
      this.popoverEl.removeAttribute('inert');
      this.isOpen = true;
      const first = this.popoverEl.querySelector('button:not(.popover-close), [href], input, select, textarea');
      if (first) requestAnimationFrame(() => first.focus());
    }

    close() {
      if (!this.isOpen) return;
      this.popoverEl.classList.remove('popover-open');
      setTimeout(() => { this.popoverEl.style.display = 'none'; this.popoverEl.setAttribute('inert', ''); }, this.options.animationDuration);
      this.toggleBtn.setAttribute('aria-expanded', 'false');
      this.isOpen = false;
      if (this.options.returnFocusOnClose) this.toggleBtn.focus();
    }

    toggle() { this.isOpen ? this.close() : this.open(); }
  }

  // Hints modal
  const setupHintsModal = () => {
    const hintsToggle = document.getElementById('hints-toggle');
    const visitorHints = document.getElementById('visitor-hints');
    if (!hintsToggle || !visitorHints) return;

    const hintsPopover = new PopoverManager(hintsToggle, visitorHints, {
      closeOnClickOutside: true, closeOnEscape: true, returnFocusOnClose: true
    });

    const closeHints = () => { hintsPopover.close(); localStorage.setItem('hintsShown', 'true'); };

    const markHelpNewSeen = () => {
      if (!hasHelpNewItem) return;
      hasHelpNewItem = false;
      try { localStorage.setItem(HELP_NEW_STORAGE_KEY, HELP_NEW_VERSION); } catch {}
      hintsToggle.classList.remove('has-new');
      hintsToggle.setAttribute('aria-label', 'Show welcome hints');
      hintsToggle.querySelector('.hints-notification-badge')?.remove();
    };

    hintsToggle.addEventListener('click', () => markHelpNewSeen());
    const hintOverlay = visitorHints.querySelector('.hint-overlay');
    const hintCloseX = visitorHints.querySelector('.hint-close-btn');
    const hintCloseBtn = visitorHints.querySelector('#hint-close-btn');
    [hintOverlay, hintCloseX, hintCloseBtn].forEach(el => el?.addEventListener('click', closeHints));
  };
  setupHintsModal();

  // Navbar hide/show on scroll
  const setupNavbarScroll = () => {
    let lastScrollTop = 0;
    const navbar = document.getElementById('main-nav');
    const SCROLL_THRESHOLD = 100;
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScroll > lastScrollTop && currentScroll > SCROLL_THRESHOLD) {
        navbar.classList.add('nav-hidden');
      } else {
        navbar.classList.remove('nav-hidden');
      }
      lastScrollTop = Math.max(0, currentScroll);
    });
  };
  setupNavbarScroll();
});
