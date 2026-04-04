// Generate sticky navbar with links to all pages
document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('main-nav');
  const siteDataVersion = document.querySelector('meta[name="site-data-version"]')?.content || '20260320';

  const PAGES = [
    { name: 'Home', file: 'index.html', icon: 'logo-360x360.webp' },
    { name: 'Numbers', file: 'financials.html', desc: 'Economic indicators and market data', icon: 'read.webp' },
    { name: 'Media', file: 'media.html', desc: 'Books, films, and listening picks', icon: 'media.webp' },
    { name: 'Docs', file: 'journal.html', desc: 'Short-form analysis and observations', icon: 'announcements.webp' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isHomepage = currentPage === 'index.html' || currentPage === '';

  const renderNavLink = (page) => {
    const isActive = currentPage === page.file || (currentPage === '' && page.file === 'index.html');
    if (page.icon) {
      return `<li><a href="${page.file}" class="nav-link nav-icon-link ${isActive ? 'active' : ''}" title="${page.name}"><img src="images/${page.icon}" alt="${page.name}" class="nav-link-icon" width="24" height="24" loading="eager"></a></li>`;
    }
    return `<li><a href="${page.file}" class="nav-link ${isActive ? 'active' : ''}">${page.name}</a></li>`;
  };

  const navHTML = `
    <div class="nav-container">
      <ul class="nav-list">
        ${PAGES.map(renderNavLink).join('')}
      </ul>
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

  const fetchJson = (path) => fetch(path + '?v=' + encodeURIComponent(siteDataVersion))
    .then(r => r.ok ? r.json() : null);

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
  window.initializeLucideIcons = () => {
    if (window.lucide?.createIcons) {
      lucide.createIcons();
    } else {
      setTimeout(window.initializeLucideIcons, 100);
    }
  };
  window.initializeLucideIcons();



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
