document.addEventListener('DOMContentLoaded', () => {
  const feed = document.getElementById('announcements-container');
  if (!feed) return;

  feed.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

  const POSTS_CACHE_KEY = 'posts-data-cache';
  const POSTS_CACHE_DURATION = 0; // disabled for live updates

  function renderPosts(posts, financials = null) {
    // Build a lookup of indicator name -> category when financials data is available
    const indicatorLookup = {};
    if (financials && Array.isArray(financials.indices)) {
      financials.indices.forEach(ind => {
        if (ind && ind.name && ind.category) indicatorLookup[ind.name.toLowerCase()] = ind.category;
      });
    }

    const categoryIcons = {
      'Employment Indicators': 'users',
      'Housing Market': 'home',
      'Business Indicators': 'briefcase',
      'Consumer Indicators': 'shopping-cart',
      'Trade & Tariffs': 'ship',
      'Government': 'landmark',
      'Commodities': 'package',
      'Prediction Markets': 'trending-up',
      'Markets': 'trending-up'
    };

    feed.innerHTML = posts.map(p => {
      let content = p.content || '';
      const contentLower = content.toLowerCase();
      let foundCategory = null;
      // First try exact indicator names
      for (const name in indicatorLookup) {
        if (Object.prototype.hasOwnProperty.call(indicatorLookup, name)) {
          if (contentLower.includes(name)) { foundCategory = indicatorLookup[name]; break; }
        }
      }
      // If not found, try common agency mentions
      if (!foundCategory) {
        if (contentLower.includes('adp')) foundCategory = 'Employment Indicators';
        else if (contentLower.includes('bls')) foundCategory = 'Consumer Indicators';
        else if (contentLower.includes('fred')) foundCategory = 'Employment Indicators';
        else if (contentLower.includes('treasury')) foundCategory = 'Government';
        else if (contentLower.includes('kalshi') || contentLower.includes('polymarket')) foundCategory = 'Prediction Markets';
        else if (contentLower.includes('debt') || contentLower.includes('deficit') || contentLower.includes('national debt')) foundCategory = 'Government';
        else if (contentLower.includes('nfl') || contentLower.includes('odds') || /\b(49ers|rams|patriots|cowboys|vikings|chiefs)\b/.test(contentLower)) foundCategory = 'Prediction Markets';
      }

      const icon = foundCategory ? categoryIcons[foundCategory] || 'file-text' : '';
      let iconHtml = icon ? `<i data-lucide="${icon}"></i> ` : '';
      if (feed.classList.contains('announcements-grid')) {
        iconHtml = '';
      }

      // Remove any existing leading icons from content to avoid duplicates
      content = content.replace(/^<i[^>]*data-lucide[^>]*><\/i>\s*/, '');

      return `
        <div class="announcement-card">
          <time>${p.date}</time>
          <div class="content">${iconHtml}${content}</div>
        </div>
      `;
    }).join('') || '<div class="empty-state">No posts available.</div>';

    if (window.lucide) window.lucide.createIcons();
  }

  // Check cache first
  const cached = localStorage.getItem(POSTS_CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < POSTS_CACHE_DURATION) {
      renderPosts(data);
      return;
    }
  }

  // Optional cache-busting using meta[name="last-commit"] if present
  const metaCommit = (document.querySelector('meta[name="last-commit"]') &&
                      document.querySelector('meta[name="last-commit"]').getAttribute('content')) || '';
  const v = `${metaCommit}-${Date.now()}`;

  // Fetch posts and financials-data in parallel so we can attach category icons
  Promise.all([
    fetch(`/json/posts.json?v=${encodeURIComponent(v)}`).then(r => { if (!r.ok) throw new Error('Failed to load posts'); return r.json(); }),
    fetch(`/json/financials-data.json?v=${encodeURIComponent(v)}`).then(r => { if (!r.ok) return null; return r.json(); }).catch(() => null)
  ])
    .then(([posts, financials]) => {
    const valid = (Array.isArray(posts) ? posts : []).filter(p => p && p.date && p.content);

    // Sort posts by date descending (latest first)
    valid.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Cache the data
    localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify({ data: valid, timestamp: Date.now() }));

        renderPosts(valid, financials);
    })
    .catch(err => {
      console.error('Error loading posts:', err);
      feed.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error loading posts. ${err.message || ''}</p>
          <button onclick="location.reload()" class="retry-button">Try Again</button>
        </div>
      `;
    });
});
