document.addEventListener('DOMContentLoaded', () => {
  const feed = document.getElementById('post-feed');
  if (!feed) return;

  feed.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

  // Optional cache-busting using meta[name="last-commit"] if present
  // Use the last-commit meta when available but always append a timestamp
  // to ensure a fresh fetch of posts.json (prevents stale cached JSON when
  // the meta isn't updated).
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

      // Build a lookup of indicator name -> category when financials data is available
      const indicatorLookup = {};
      if (financials && Array.isArray(financials.indices)) {
        financials.indices.forEach(ind => {
          if (ind && ind.name && ind.category) indicatorLookup[ind.name.toLowerCase()] = ind.category;
        });
      }

      // category -> lucide icon mapping (reuse icons used on financials page)
      const categoryIcons = {
        'Employment Indicators': 'users',
        'Housing Market': 'home',
        'Business Indicators': 'briefcase',
        'Consumer Indicators': 'shopping-cart',
        'Trade & Tariffs': 'ship',
        'Trade & Tariffs': 'ship',
        'Government': 'landmark',
        'Commodities': 'package',
        'Prediction Markets': 'trending-up',
        // fallback categories
        'Markets': 'trending-up'
      };

      // For each post, try to find an indicator name or agency mentioned in its content
      feed.innerHTML = valid.map(p => {
        const contentLower = (p.content || '').toLowerCase();
        let foundCategory = null;
        // First try exact indicator names
        for (const name in indicatorLookup) {
          if (Object.prototype.hasOwnProperty.call(indicatorLookup, name)) {
            if (contentLower.includes(name)) { foundCategory = indicatorLookup[name]; break; }
          }
        }
        // If not found, try common agency mentions (ADP, BLS, FRED, Treasury, Kalshi, Polymarket)
        if (!foundCategory) {
          if (contentLower.includes('adp')) foundCategory = 'Employment Indicators';
          else if (contentLower.includes('bls')) foundCategory = 'Consumer Indicators';
          else if (contentLower.includes('fred')) foundCategory = 'Employment Indicators';
          else if (contentLower.includes('treasury')) foundCategory = 'Government';
          else if (contentLower.includes('kalshi') || contentLower.includes('polymarket')) foundCategory = 'Prediction Markets';

          // Fallbacks for keywords that didn't match indicator names:
          // debt / deficit -> Government (National Debt, Budget Deficit updates)
          else if (contentLower.includes('debt') || contentLower.includes('deficit') || contentLower.includes('national debt')) foundCategory = 'Government';

          // sports-related odds -> Prediction Markets (e.g., NFL Week 5: 49ers @ Rams Odds Update)
          else if (contentLower.includes('nfl') || contentLower.includes('odds') || /\b(49ers|rams|patriots|cowboys|vikings|chiefs)\b/.test(contentLower)) foundCategory = 'Prediction Markets';
        }

        let badge = '';
        if (foundCategory) {
          const icon = categoryIcons[foundCategory] || 'file-text';
          const aria = `${foundCategory} — view related financials`;
          // Decide destination based on category
          let badgeHref = '/financials.html';
          if (foundCategory === 'Prediction Markets') badgeHref = '/financials.html';
          // allow a 'News' category to link to news.html
          if (foundCategory === 'News' || foundCategory === 'news') badgeHref = '/news.html';
          // Media category should link to media page
          if (foundCategory === 'Media') badgeHref = '/media.html';

          // Special rendering rules:
          // - Government: icon-only using lucide landmark
          // - News: use a newspaper emoji (📰) as the badge icon
          // - Media: use a text badge linking to the media page (text: "Media")
          if (foundCategory === 'Government') {
            badge = `<a class="post-badge-link post-badge-icon-only" href="${badgeHref}" aria-label="${aria}"><i data-lucide="${icon}"></i></a>`;
          } else if (badgeHref === '/news.html') {
            // emoji badge for news updates
            badge = `<a class="post-badge-link post-badge-icon-only" href="${badgeHref}" aria-label="${aria}"><span class="badge-emoji" aria-hidden="true">📰</span></a>`;
          } else if (badgeHref === '/media.html') {
            // textual badge for media links
            badge = `<a class="post-badge-link post-badge-icon-only" href="${badgeHref}" aria-label="${aria}">Media</a>`;
          } else {
            badge = `<a class="post-badge-link post-badge-icon-only" href="${badgeHref}" aria-label="${aria}"><i data-lucide="${icon}"></i></a>`;
          }
        }

        return `
        <article class="post-item" role="article">
          <div class="card-title"><time datetime="${p.date}">${p.date}</time></div>
          <div class="post-meta-badge">${badge}</div>
          <div class="content">${p.content}</div>
        </article>
      `;
      }).join('') || '<div class="empty-state">No posts available.</div>';

      if (window.lucide) window.lucide.createIcons();
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
        // if we found a category, render an icon-only badge
        // NOTE: Editors can override this by adding a `badge` object to a post in json/posts.json
        // e.g. "badge": { "icon": "landmark", "href": "/financials.html", "type": "icon-only" }
});
