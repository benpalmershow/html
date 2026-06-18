// Generate sticky navbar with links to all pages
document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('main-nav');
  const dataService = window.Services?.dataService;

  // Use shared PAGES config
  const PAGES = window.SitePages || [
    { name: 'Home', file: 'index.html', icon: 'logo-360x360.webp' },
    { name: 'Numbers', file: 'financials.html', desc: 'Economic indicators and market data', icon: 'read.webp' },
    { name: 'Media', file: 'media.html', desc: 'Books, films, and listening picks', icon: 'media.webp' },
    { name: 'Docs', file: 'journal.html', desc: 'Short-form analysis and observations', icon: 'announcements.webp' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isHomepage = currentPage === 'index.html' || currentPage === '';

  // Separate home/logo page from the rest
  const homePage = PAGES[0];
  const navPages = PAGES.slice(1);

  const isHomeActive = currentPage === 'index.html' || currentPage === '';

  const renderNavLink = (page) => {
    const isActive = currentPage === page.file;
    const ariaCurrent = isActive ? 'aria-current="page"' : '';
    // Derive data-page attribute from filename (e.g., "journal.html" -> "journal")
    const pageName = page.file.replace('.html', '');
    return `<li>
      <a href="${page.file}" class="nav-link nav-icon-link ${isActive ? 'active' : ''}" aria-label="${page.name}" ${ariaCurrent} data-page="${pageName}">
        <img src="images/${page.icon}" alt="" class="nav-link-icon" width="36" height="36" loading="eager">
        <span class="nav-icon-label">${page.name}</span>
        ${isActive ? '<span class="nav-active-dot" aria-hidden="true"></span>' : ''}
      </a>
    </li>`;
  };

  // Detect stored dark mode preference
  const isDark = document.documentElement.classList.contains('dark-mode') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

const navHTML = `
    <div class="nav-container">
      <a href="${homePage.file}" class="nav-logo ${isHomeActive ? 'active' : ''}" aria-label="Howdy, Stranger – Home" ${isHomeActive ? 'aria-current="page"' : ''}>
        <img src="images/${homePage.icon}" alt="Howdy, Stranger" width="56" height="56" loading="eager">
      </a>
      <span class="nav-wordmark" aria-hidden="true">Howdy, Stranger</span>
      <ul class="nav-list" role="list">
        ${navPages.map(renderNavLink).join('')}
      </ul>
      <button class="dark-mode-toggle" id="darkModeToggle" aria-label="${isDark ? 'Switch to light mode' : 'Switch to dark mode'}" title="Toggle dark mode">
        <i data-lucide="${isDark ? 'sun' : 'moon'}"></i>
      </button>
    </div>
  `;

  navContainer.innerHTML = navHTML;
  navContainer.setAttribute('aria-label', 'Main');

  // Dark mode toggle wiring
  const dmToggle = document.getElementById('darkModeToggle');
  if (dmToggle) {
    const updateToggleIcon = () => {
      const dark = document.documentElement.classList.contains('dark-mode');
      dmToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      const icon = dmToggle.querySelector('i[data-lucide]');
      if (icon) {
        icon.setAttribute('data-lucide', dark ? 'sun' : 'moon');
        if (window.lucide?.createIcons) lucide.createIcons({ nodes: [icon] });
      }
    };
    dmToggle.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark-mode');
      try { localStorage.setItem('darkMode', document.documentElement.classList.contains('dark-mode') ? '1' : '0'); } catch {}
      updateToggleIcon();
    });
  }

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

  const fetchJson = (path) => {
    return fetch(path).then(r => r.ok ? r.json() : null).catch(() => null);
  };

  // Numbers
  fetchJson('json/financials-data.json').then(data => {
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
  fetchJson('json/media.json').then(data => {
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

  // Docs
  fetchJson('json/journal.json').then(data => {
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
  let lucideInitAttempts = 0;
  const MAX_LUCIDE_RETRIES = 10;
  window.initializeLucideIcons = () => {
    if (window.lucide?.createIcons) {
      lucide.createIcons();
    } else if (lucideInitAttempts < MAX_LUCIDE_RETRIES) {
      lucideInitAttempts++;
      setTimeout(window.initializeLucideIcons, 100);
    } else {
      console.warn('Lucide icons failed to load after', MAX_LUCIDE_RETRIES, 'attempts');
    }
  };
  window.initializeLucideIcons();



// Navbar hide/show on scroll
  const setupNavbarScroll = () => {
    let lastScrollTop = 0;
    const navbar = document.getElementById('main-nav');
    const SCROLL_THRESHOLD = 100;
    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY || document.documentElement.scrollTop;
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
