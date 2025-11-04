(function() {
    // List of all articles (add new articles here)
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
       'doc-riter-trump-interview'
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

    // Render article card
    function renderArticleCard(article) {
    return `
    <div class="card-header" data-category="${article.category}">
    <time datetime="${article.date}">${formatDate(article.date)}</time>
    <i data-lucide="${article.icon || 'file-text'}" class="card-icon"></i>
    <h1>
    <a href="?article=${article.id}">${article.title}</a>
      <span class="category-badge ${article.category}">${article.category}</span>
    </h1>
    <i data-lucide="chevron-down" class="expand-icon"></i>
    </div>
    <div class="card-content">
    <div class="card-inner">
    <div class="highlights">
    <p>${article.summary}</p>
    <a href="?article=${article.id}" class="read-full-article-btn" aria-label="Read Full Article" title="Read Full Article">
    <span class="button-hint">Read Full Article</span>
    </a>
    </div>
    </div>
    </div>
    `;
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

      // Setup expand/collapse
      document.querySelectorAll('.card-header').forEach(header => {
        header.addEventListener('click', (e) => {
          if (e.target.tagName === 'A') return; // Don't toggle if clicking link
          header.classList.toggle('expanded');
          const content = header.nextElementSibling;
          content.classList.toggle('expanded');
        });
      });
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

    // Category filter
    function initFilters() {
      const filterBtns = document.querySelectorAll('.filter-btn');
      
      filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          filterBtns.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          
          const category = this.dataset.category;
          const cards = document.querySelectorAll('.card-header');
          
          cards.forEach(card => {
            const cardParent = card.parentElement;
            if (category === 'all' || card.dataset.category === category) {
              card.style.display = '';
              if (card.nextElementSibling) {
                card.nextElementSibling.style.display = '';
              }
            } else {
              card.style.display = 'none';
              if (card.nextElementSibling) {
                card.nextElementSibling.style.display = 'none';
              }
            }
          });
        });
      });
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


