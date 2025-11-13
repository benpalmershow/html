(function() {
    // List of all articles (add new articles here) - v2
    const ARTICLES = [
    'oversight-committee-report',
    'urban_crime_2020',
    'chiles-v-salazar',
    'barrett_v_us',
    'reddit-q2-2025-earnings',
    'navan-ipo',
    'vaccine-policy',
    'military-drones',
    'healthcare-costs',
    'okta-q2-2026',
    'aaup-rubio',
    'fiber-supplement',
    'trump-v-casa',
    'figma-ipo',
    'ceqa-reforms',
      'bullish-ipo',
    'peloton-stock',
      'local-bounti-q2-2025',
      'scotus-oct-2025',
      'airo-ipo',
      'robinhood-q2-2025',
      'boston-public-market',
      'circle-ipo',
      'big-beautiful-bill',
      'corrections-hood-twlo',
      'sustainable-abundance',
      'oregon-kei-trucks-sb1213',
       'doc-riter-trump-interview',
       'scotus-nov-2025',
       'trump-v-vos-selections',
       'trump-v-vos-update',
       'trump-v-vos-sauer'
    ];

    // Parse frontmatter from markdown
    function parseFrontmatter(markdown) {
      const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!match) return { metadata: {}, content: markdown };
      
      const [, frontmatter, content] = match;
      const metadata = {};
      
      frontmatter.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const key = line.substring(0, colonIndex).trim();
          let value = line.substring(colonIndex + 1).trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          metadata[key] = value;
        }
      });
      
      return { metadata, content };
    }

    

    // Load article from markdown file
    async function loadArticle(filename) {
      try {
        const response = await fetch(`article/${filename}.md`);
        if (!response.ok) throw new Error('Article not found');

        const markdown = await response.text();
        const { metadata, content } = parseFrontmatter(markdown);

        // Convert markdown to HTML using marked.js
        const html = marked.parse(content);

        return { metadata, html };
      } catch (error) {
        console.error('Error loading article:', error);
        return null;
      }
    }

    // Render article card (accordion style)
    function renderArticleCard(article) {

    return `
    <div class="accordion-card" data-category="${article.category}">
    <div class="accordion-header">
    <div class="accordion-title-section">
    <button class="filter-badge ${article.category}" aria-label="${article.category} category">
    <i data-lucide="${getCategoryIcon(article.category)}" class="filter-icon"></i>
    </button>
    <h2 class="accordion-title">
    ${article.title}
    </h2>
    </div>

    <div class="accordion-meta">
    <i data-lucide="chevron-down" class="expand-icon" aria-label="Expand article details"></i>
    </div>
    </div>

      <div class="accordion-content">
      <div class="accordion-expanded-header">
      <time class="accordion-expanded-date" datetime="${article.date}">${formatDate(article.date)}</time>
      </div>
        <div class="accordion-full-preview">
        <p>${article.summary}</p>
      </div>

      <div class="accordion-full-actions">
       <a href="news.html?article=${article.id}" class="read-full-btn primary">
          <span>Read Full Article</span>
            <i data-lucide="arrow-right"></i>
          </a>
        </div>
      </div>
    </div>
    `;
    }

    // Get category icon (matches filter button icons)
    function getCategoryIcon(category) {
      const icons = {
        'ipo': 'trending-up',
        'earnings': 'bar-chart-3',
        'policy': 'shield',
        'healthcare': 'heart',
        'legal': 'gavel',
        'political': 'vote',
        'corrections': 'edit-3'
      };
      return icons[category] || 'file-text';
    }

    // Render full article view
    async function renderFullArticle(articleId) {
    const feedView = document.getElementById('news-feed-view');
    const articleView = document.getElementById('full-article-view');
    const container = document.getElementById('article-container');

    feedView.style.display = 'none';
    articleView.style.display = 'block';

    container.innerHTML = '<div class="loading">Loading article...</div>';

    // Load article
    const article = await loadArticle(articleId);

    if (!article) {
    container.innerHTML = '<div class="error-message">Article not found. <a href="news.html">Return to news feed</a></div>';
    return;
    }

    // Article content is processed as-is without price replacements
    let processedHtml = article.html;

    container.innerHTML = `
    ${processedHtml}
    `;

    // Execute scripts in the article content
    const scripts = container.querySelectorAll('script');
    scripts.forEach(script => {
    const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
        newScript.async = false; // Ensure scripts run in order
        document.head.appendChild(newScript);
      } else {
        newScript.textContent = script.textContent;
        document.head.appendChild(newScript);
      }
      script.remove(); // Remove the original script tag
    });

    const backButton = document.querySelector('.back-button');
    let metaEl = backButton.nextElementSibling;
    if (metaEl && metaEl.classList.contains('article-meta-header')) {
    metaEl.remove();
    }
    metaEl = document.createElement('div');
    metaEl.classList.add('article-meta-header');
    metaEl.style.display = 'flex';
    metaEl.style.alignItems = 'center';
    metaEl.style.gap = '10px';
    metaEl.style.fontSize = '0.9em';
    metaEl.style.color = '#888';
    metaEl.style.marginBottom = '10px';
    let metaHtml = `<span>${formatDate(article.metadata.date)}</span>`;
      if (article.metadata.ticker) {
        metaHtml += `<span><strong>Ticker:</strong> <a href="https://www.perplexity.ai/finance/${article.metadata.ticker}" target="_blank">${article.metadata.ticker}</a></span>`;
      }
      metaHtml += `<span class="category-badge ${article.metadata.category}">${article.metadata.category}</span>`;
      metaEl.innerHTML = metaHtml;
      backButton.insertAdjacentElement('afterend', metaEl);

      // Reinitialize Lucide icons
      lucide.createIcons();
    }

    // Render news feed
    async function renderNewsFeed() {
      const feedView = document.getElementById('news-feed-view');
      const articleView = document.getElementById('full-article-view');
      const container = document.getElementById('articles-container');

      feedView.style.display = 'block';
      articleView.style.display = 'none';

      // Load metadata for each article
      const articles = await Promise.all(
        ARTICLES.map(async (id) => {
          const article = await loadArticle(id);
          if (!article) return null;
          return {
            id,
            ...article.metadata
          };
        })
      );

      // Filter out failed loads and sort by date (newest first)
      const validArticles = articles
        .filter(a => a !== null)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (validArticles.length === 0) {
        container.innerHTML = '<div class="error-message">No articles found. Please check that your markdown files are in the article/ folder.</div>';
        return;
      }

      // Render cards
      container.innerHTML = validArticles.map(renderArticleCard).join('');

      // Reinitialize Lucide icons
      lucide.createIcons();

      // Setup accordion functionality
      setupAccordion();
    }

    // Setup accordion expand/collapse functionality with performance optimizations
    function setupAccordion() {
      // Use event delegation for better performance
      const container = document.getElementById('articles-container');
      if (!container) return;

      // Remove existing listeners to prevent accumulation
      const existingHandler = container._accordionHandler;
      if (existingHandler) {
        container.removeEventListener('click', existingHandler);
      }

      // Create single event handler for all accordion interactions
      const handleAccordionClick = function(e) {
        const header = e.target.closest('.accordion-header');
        if (!header) return;

        // Don't expand if clicking on filter badge
        if (e.target.closest('.filter-badge')) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        const card = header.closest('.accordion-card');
        const content = card.querySelector('.accordion-content');
        const icon = header.querySelector('.expand-icon');

        // Use requestAnimationFrame for smoother animations
        requestAnimationFrame(() => {
          // Close other expanded cards
          document.querySelectorAll('.accordion-card.expanded').forEach(expandedCard => {
            if (expandedCard !== card) {
              const expandedContent = expandedCard.querySelector('.accordion-content');
              const expandedIcon = expandedCard.querySelector('.expand-icon');

              expandedCard.classList.remove('expanded');
              expandedContent.style.maxHeight = '0';
              expandedIcon.style.transform = 'rotate(0deg)';
            }
          });

          // Toggle current card
          const isExpanded = card.classList.contains('expanded');
          card.classList.toggle('expanded');

          if (isExpanded) {
            content.style.maxHeight = '0';
            icon.style.transform = 'rotate(0deg)';
          } else {
            // Use a small delay to ensure DOM has updated
            setTimeout(() => {
              content.style.maxHeight = content.scrollHeight + 'px';
              icon.style.transform = 'rotate(180deg)';
            }, 10);
          }
        });
      };

      // Store handler reference for cleanup
      container._accordionHandler = handleAccordionClick;
      container.addEventListener('click', handleAccordionClick);
    }

    // Format date
    function formatDate(dateStr) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const [year, month, day] = dateStr.split('-');
      return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
    }

    // Router - check URL for article parameter
    function initRouter() {
      const urlParams = new URLSearchParams(window.location.search);
      const articleId = urlParams.get('article');
      
      if (articleId) {
        renderFullArticle(articleId);
      } else {
        renderNewsFeed();
      }
    }

    // Category filter with performance optimizations
    function initFilters() {
      const filterContainer = document.querySelector('.filters');
      if (!filterContainer) return;

      // Use event delegation for better performance
      const existingFilterHandler = filterContainer._filterHandler;
      if (existingFilterHandler) {
        filterContainer.removeEventListener('click', existingFilterHandler);
      }

      const handleFilterClick = function(e) {
        const filterBtn = e.target.closest('.filter-btn');
        if (!filterBtn) return;

        e.preventDefault();

        // Update active state
        filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        filterBtn.classList.add('active');

        const category = filterBtn.dataset.category;

        // Use requestAnimationFrame for smoother filtering
        requestAnimationFrame(() => {
          const cards = document.querySelectorAll('.accordion-card');
          cards.forEach(card => {
            const shouldShow = category === 'all' || card.dataset.category === category;
            card.style.display = shouldShow ? '' : 'none';

            // Close expanded cards when filtering
            if (!shouldShow && card.classList.contains('expanded')) {
              const content = card.querySelector('.accordion-content');
              const icon = card.querySelector('.expand-icon');
              card.classList.remove('expanded');
              content.style.maxHeight = '0';
              icon.style.transform = 'rotate(0deg)';
            }
          });
        });
      };

      // Store handler reference for cleanup
      filterContainer._filterHandler = handleFilterClick;
      filterContainer.addEventListener('click', handleFilterClick);
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      initRouter();
      initFilters();
      lucide.createIcons();
    });

    // Handle browser back/forward
    window.addEventListener('popstate', initRouter);

})();
