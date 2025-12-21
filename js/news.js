(function () {
    let articlesIndex = [];

    // Parse frontmatter from markdown (including YAML arrays)
    function parseFrontmatter(markdown) {
        const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!match) return { metadata: {}, content: markdown };

        const [, frontmatter, content] = match;
        const metadata = {};
        const lines = frontmatter.split('\n');

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            const colonIndex = line.indexOf(':');

            if (colonIndex > -1) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();

                // Handle arrays (resources, etc.)
                if (key === 'resources' && value === '') {
                    const resources = [];
                    i++;
                    while (i < lines.length && lines[i].startsWith('  - ')) {
                        const resourceLines = [];
                        resourceLines.push(lines[i]);
                        i++;
                        while (i < lines.length && lines[i].startsWith('    ') && !lines[i].startsWith('  - ')) {
                            resourceLines.push(lines[i]);
                            i++;
                        }

                        const resource = {};
                        resourceLines.forEach(resLine => {
                            let trimmedLine = resLine.trim();
                            // Remove leading '- ' from first array item
                            if (trimmedLine.startsWith('- ')) {
                                trimmedLine = trimmedLine.substring(2);
                            }
                            const resParts = trimmedLine.split(':');
                            if (resParts.length >= 2) {
                                const resKey = resParts[0].trim();
                                let resValue = resParts.slice(1).join(':').trim();
                                if (resValue.startsWith('"') && resValue.endsWith('"')) {
                                    resValue = resValue.slice(1, -1);
                                }
                                resource[resKey] = resValue;
                            }
                        });
                        if (Object.keys(resource).length > 0) resources.push(resource);
                    }
                    metadata[key] = resources;
                    continue;
                }

                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                metadata[key] = value;
            }
            i++;
        }

        return { metadata, content };
    }

    // Load single article from markdown file
    async function loadArticle(filename) {
        try {
            const response = await fetch(`article/${filename}.md`);
            if (!response.ok) throw new Error('Article not found');

            const markdown = await response.text();
            const { metadata, content } = parseFrontmatter(markdown);
            
            // Ensure marked is loaded
            await window.loadMarked();
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

    // Render article card as details disclosure
    function renderArticleCard(article) {
        const previewText = generatePreviewText(article.summary);
        let resourceLinksHtml = '';

        // Add resource links if present
        if (article.resources && Array.isArray(article.resources) && article.resources.length > 0) {
            resourceLinksHtml = '<div class="card-resources">';
            article.resources.forEach(resource => {
                const iconName = resource.icon || 'link';
                resourceLinksHtml += `<a href="${resource.url}" target="_blank" rel="noopener noreferrer" class="resource-link" title="${resource.title}"><i data-lucide="${iconName}" class="resource-icon"></i></a>`;
            });
            resourceLinksHtml += '</div>';
        }

        return `
        <details class="article-disclosure" data-category="${article.category}">
          <summary>
            <span class="category-icon" aria-label="${article.category} category">
              <i data-lucide="${getCategoryIcon(article.category)}"></i>
            </span>
            <span class="article-title">${article.title}</span>
            <span class="expand-icon">
              <i data-lucide="plus"></i>
            </span>
          </summary>
          <div class="disclosure-content">
            <div class="article-meta-section">
              <time class="article-date" datetime="${article.date}">${formatDate(article.date)}</time>
              ${resourceLinksHtml}
            </div>
            <div class="article-preview">
              <p>${previewText}</p>
            </div>
            <div class="article-actions">
              <a href="?article=${article.id}" class="read-full-btn">
                Read Full Article
                <i data-lucide="arrow-right"></i>
              </a>
            </div>
          </div>
        </details>
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

        container.innerHTML = `<div class="article-wrapper">${article.html}</div>`;

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
        backButton.onclick = () => {
            window.history.back();
        };

        // Create and setup back-to-top button
         let backToTopBtn = document.querySelector('.back-to-top-btn');
         if (!backToTopBtn) {
             backToTopBtn = document.createElement('button');
             backToTopBtn.className = 'back-to-top-btn';
             backToTopBtn.setAttribute('aria-label', 'Back to top');
             backToTopBtn.setAttribute('title', 'Back to top');
             backToTopBtn.innerHTML = '<i data-lucide="arrow-up"></i><span class="button-hint">Top</span>';
             document.body.appendChild(backToTopBtn);
             if (window.lucide) lucide.createIcons();
         }

        const handleBackToTopVisibility = () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        };

        backToTopBtn.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        window.addEventListener('scroll', handleBackToTopVisibility);
        handleBackToTopVisibility();

        // Remove existing meta element if present
        let metaEl = backButton.nextElementSibling;
        if (metaEl && metaEl.classList.contains('article-meta-header')) {
            metaEl.remove();
        }

        // Create and insert meta header with proper styling
        metaEl = document.createElement('div');
        metaEl.classList.add('article-meta-header');
        let metaHtml = `<span class="article-date">${formatDate(article.metadata.date)}</span>`;
        if (article.metadata.ticker) {
            metaHtml += `<span class="article-ticker"><strong>Ticker:</strong> <a href="https://www.perplexity.ai/finance/${article.metadata.ticker}" target="_blank">${article.metadata.ticker}</a></span>`;
        }
        metaHtml += `<span class="category-badge ${article.metadata.category}">${article.metadata.category}</span>`;

        metaEl.innerHTML = metaHtml;
         backButton.insertAdjacentElement('afterend', metaEl);

         if (window.lucide) lucide.createIcons();
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

         if (window.lucide) lucide.createIcons();
         setupDisclosures();
        }

    // Load articles index from JSON
    function loadArticlesIndex() {
        return fetch('json/articles.json')
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

    // Setup disclosure height measurements (native details element)
    function setupDisclosures() {
        const details = document.querySelectorAll('.article-disclosure');
        details.forEach(detail => {
            const content = detail.querySelector('.disclosure-content');
            if (content) {
                // Temporarily show to measure full height
                const wasOpen = detail.hasAttribute('open');
                detail.setAttribute('open', '');
                // Force two reflows to ensure accurate measurement
                detail.offsetHeight;
                
                // Measure full content height
                const height = content.scrollHeight;
                const style = window.getComputedStyle(content);
                const paddingTop = parseFloat(style.paddingTop) || 0;
                const paddingBottom = parseFloat(style.paddingBottom) || 0;
                // Add 20px buffer to ensure button and content aren't clipped
                const totalHeight = height + paddingTop + paddingBottom + 20;
                
                detail.style.setProperty('--content-height', `${totalHeight}px`);
                
                // Restore original state if it wasn't open
                if (!wasOpen) {
                    detail.removeAttribute('open');
                }
            }
        });
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

        const handleFilterClick = function (e) {
            const filterBtn = e.target.closest('.filter-btn');
            if (!filterBtn) return;
            e.preventDefault();

            filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            filterBtn.classList.add('active');

            const category = filterBtn.dataset.category;

            requestAnimationFrame(() => {
                const details = document.querySelectorAll('.article-disclosure');
                details.forEach(detail => {
                    const shouldShow = category === 'all' || detail.dataset.category === category;
                    detail.style.display = shouldShow ? '' : 'none';

                    // Close any open details that are being hidden
                    if (!shouldShow && detail.hasAttribute('open')) {
                        detail.removeAttribute('open');
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
         if (window.lucide) lucide.createIcons();
     });

    // Handle browser back/forward
    window.addEventListener('popstate', initRouter);

})();
