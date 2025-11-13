(function() {
    let articlesIndex = [];

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

    // Load single article from markdown file
    async function loadArticle(filename) {
      try {
        const response = await fetch(`article/${filename}.md`);
        if (!response.ok) throw new Error('Article not found');

        const markdown = await response.text();
        const { metadata, content } = parseFrontmatter(markdown);
        const html = marked.parse(content);

        return { metadata, html };
      } catch (error) {
        console.error('Error loading article:', error);
        return null;
      }
    }

    // Generate preview text from summary
    function generatePreviewText(summary) {
      if (!summary) return 'Click to read more...';
      let previewText = summary.trim().replace(/\s+/g, ' ');
      if (previewText.length > 200) {
        previewText = previewText.substring(0, 200).trim();
        const lastSpace = previewText.lastIndexOf(' ');
        if (lastSpace > 150) {
          previewText = previewText.substring(0, lastSpace);
        }
        previewText += '...';
      }
      return previewText;
    }

    // Render article card
    function renderArticleCard(article) {
      const previewText = generatePreviewText(article.summary);
      return `
        <div class="accordion-card" data-category="${article.category}">
          <div class="accordion-header">
            <div class="accordion-title-section">
              <button class="filter-badge ${article.category}" aria-label="${article.category} category">
                <i data-lucide="${getCategoryIcon(article.category)}" class="filter-icon"></i>
              </button>
              <h2 class="accordion-title">${article.title}</h2>
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
              <p>${previewText}</p>
            </div>
            <div class="accordion-full-actions">
              <a href="?article=${article.id}" class="read-full-btn primary">
                <span>Read Full Article</span>
                <i data-lucide="arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
      `;
    }

    // Get category icon
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

      const article = await loadArticle(articleId);
      if (!article) {
        container.innerHTML = '<div class="error-message">Article not found. <a href="news.html">Return to news feed</a></div>';
        return;
      }

      container.innerHTML = article.html;

      // Execute scripts in article content
      const scripts = container.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
          newScript.async = false;
          document.head.appendChild(newScript);
        } else {
          newScript.textContent = script.textContent;
          document.head.appendChild(newScript);
        }
        script.remove();
      });

      const backButton = document.querySelector('.back-button');
      backButton.onclick = (e) => {
        e.preventDefault();
        feedView.style.display = 'block';
        articleView.style.display = 'none';
      };
      
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

      lucide.createIcons();
    }

    // Render news feed
    function renderNewsFeed() {
      const container = document.getElementById('articles-container');
      const feedView = document.getElementById('news-feed-view');
      const articleView = document.getElementById('full-article-view');

      feedView.style.display = 'block';
      articleView.style.display = 'none';

      if (articlesIndex.length === 0) {
        container.innerHTML = '<div class="error-message">No articles found.</div>';
        return;
      }

      // Sort by date (newest first)
      const sortedArticles = [...articlesIndex].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      // Render cards directly from index
      container.innerHTML = sortedArticles.map(renderArticleCard).join('');

      lucide.createIcons();
      setupAccordion();
    }

    // Load articles index from JSON
    function loadArticlesIndex() {
      return fetch('json/articles.json?v=' + Date.now())
        .then(r => {
          if (!r.ok) throw new Error('Failed to load articles index');
          return r.json();
        })
        .then(articles => {
          if (!Array.isArray(articles)) throw new Error('Invalid articles format');
          articlesIndex = articles;
          renderNewsFeed();
        })
        .catch(err => {
          console.error('Error loading articles index:', err);
          const container = document.getElementById('articles-container');
          if (container) {
            container.innerHTML = '<div class="error-message">Failed to load articles. Please refresh the page.</div>';
          }
        });
    }

    // Setup accordion functionality
    function setupAccordion() {
      const container = document.querySelector('.content');
      if (!container) return;

      const existingHandler = container._accordionHandler;
      if (existingHandler) {
        container.removeEventListener('click', existingHandler);
      }

      const handleAccordionClick = function(e) {
        const header = e.target.closest('.accordion-header');
        if (!header) return;
        if (e.target.closest('.filter-badge')) return;

        e.preventDefault();
        e.stopPropagation();

        const card = header.closest('.accordion-card');
        const content = card.querySelector('.accordion-content');
        const icon = header.querySelector('.expand-icon');

        requestAnimationFrame(() => {
          document.querySelectorAll('.accordion-card.expanded').forEach(expandedCard => {
            if (expandedCard !== card) {
              const expandedContent = expandedCard.querySelector('.accordion-content');
              const expandedIcon = expandedCard.querySelector('.expand-icon');
              expandedCard.classList.remove('expanded');
              expandedContent.style.maxHeight = '0';
              expandedIcon.style.transform = 'rotate(0deg)';
            }
          });

          const isExpanded = card.classList.contains('expanded');
          card.classList.toggle('expanded');

          if (isExpanded) {
            content.style.maxHeight = '0';
            icon.style.transform = 'rotate(0deg)';
          } else {
            setTimeout(() => {
              content.style.maxHeight = content.scrollHeight + 'px';
              icon.style.transform = 'rotate(180deg)';
            }, 10);
          }
        });
      };

      container._accordionHandler = handleAccordionClick;
      container.addEventListener('click', handleAccordionClick);
    }

    // Format date
    function formatDate(dateStr) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const [year, month, day] = dateStr.split('-');
      return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
    }

    // Router
    function initRouter() {
      const urlParams = new URLSearchParams(window.location.search);
      const articleId = urlParams.get('article');
      
      if (articleId) {
        renderFullArticle(articleId);
      } else {
        loadArticlesIndex();
      }
    }

    // Category filter
    function initFilters() {
      const filterContainer = document.querySelector('.filters');
      if (!filterContainer) return;

      const existingFilterHandler = filterContainer._filterHandler;
      if (existingFilterHandler) {
        filterContainer.removeEventListener('click', existingFilterHandler);
      }

      const handleFilterClick = function(e) {
        const filterBtn = e.target.closest('.filter-btn');
        if (!filterBtn) return;
        e.preventDefault();

        filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        filterBtn.classList.add('active');

        const category = filterBtn.dataset.category;

        requestAnimationFrame(() => {
          const cards = document.querySelectorAll('.accordion-card');
          cards.forEach(card => {
            const shouldShow = category === 'all' || card.dataset.category === category;
            card.style.display = shouldShow ? '' : 'none';

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
