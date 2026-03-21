function sanitizeHtml(html) {
  if (!html) return '';

  if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
    return window.DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form']
    });
  }

  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.querySelectorAll('script, style, iframe, object, embed, form').forEach(node => node.remove());

  template.content.querySelectorAll('*').forEach(node => {
    Array.from(node.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();

      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        return;
      }

      if ((name === 'href' || name === 'src' || name === 'xlink:href') && /^javascript:/i.test(value)) {
        node.removeAttribute(attr.name);
      }
    });
  });

  return template.innerHTML;
}

async function ensureHtmlSanitizer() {
  if (window.DOMPurify) return;

  await new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

async function waitForMarked() {
  if (window.marked) return;

  await new Promise(resolve => {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.marked) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= 50) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}

function parseFrontmatter(md) {
  const metadata = {};
  const match = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { metadata, contentMd: md.trim() };

  const [, frontmatter, contentMd] = match;
  frontmatter.split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon > -1) {
      const key = line.slice(0, colon).trim();
      let value = line.slice(colon + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      metadata[key] = value;
    }
  });

  return { metadata, contentMd: contentMd.trim() };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleCaseCategory(category) {
  if (!category) return '';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function wrapTables(container) {
  container.querySelectorAll('table').forEach(table => {
    if (table.parentElement?.classList.contains('table-wrapper')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  const selector = `meta[${attr}="${name}"]`;
  const element = document.head.querySelector(selector);
  if (element) {
    element.setAttribute('content', content);
  }
}

function updateDocumentMeta(slug, metadata, articleIndexEntry) {
  const title = metadata.title || articleIndexEntry?.title || 'Article';
  const description = metadata.summary || articleIndexEntry?.summary || 'Independent article and policy analysis from Howdy, Stranger.';
  const image = articleIndexEntry?.image || 'https://howdystranger.net/images/logo-1200x630.webp?v=1';
  const articleUrl = `https://howdystranger.net/news.html?article=${encodeURIComponent(slug)}`;

  document.title = `${title} - Howdy, Stranger`;
  setMeta('description', description);
  setMeta('keywords', [slug, metadata.category, 'Howdy Stranger'].filter(Boolean).join(', '));
  setMeta('og:title', title, 'property');
  setMeta('og:description', description, 'property');
  setMeta('og:url', articleUrl, 'property');
  setMeta('og:image', image, 'property');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', image);

  const canonical = document.head.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.href = articleUrl;
  }
}

function renderMetaHeader(metadata) {
  const parts = [];

  if (metadata.date) {
    parts.push(`<time class="article-date" datetime="${escapeHtml(metadata.date)}">${escapeHtml(metadata.date)}</time>`);
  }

  if (metadata.ticker && metadata.link) {
    parts.push(`<div class="article-ticker">Ticker: <a href="${escapeHtml(metadata.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(metadata.ticker)}</a></div>`);
  }

  if (metadata.category) {
    parts.push(`<span class="category-badge ${escapeHtml(metadata.category)}">${escapeHtml(titleCaseCategory(metadata.category))}</span>`);
  }

  if (!parts.length) return '';
  return `<div class="article-meta-header">${parts.join('')}</div>`;
}

function renderError(message) {
  const statusEl = document.getElementById('article-status');
  const errorEl = document.getElementById('article-error');
  const readerEl = document.getElementById('article-reader');

  statusEl.hidden = true;
  readerEl.hidden = true;
  errorEl.hidden = false;
  errorEl.innerHTML = `${escapeHtml(message)} <a href="index.html">Return home</a>.`;
}

async function loadArticle() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('article');
  const version = document.querySelector('meta[name="site-data-version"]')?.content || '20260320';

  const statusEl = document.getElementById('article-status');
  const readerEl = document.getElementById('article-reader');
  const contentEl = document.getElementById('article-content');
  const shareLinkEl = document.getElementById('article-share-link');

  if (!slug) {
    renderError('No article specified.');
    return;
  }

  try {
    await waitForMarked();
    await ensureHtmlSanitizer();

    let articleIndexEntry = null;
    try {
      const articlesResponse = await fetch(`json/articles.json?v=${encodeURIComponent(version)}`);
      if (articlesResponse.ok) {
        const articles = await articlesResponse.json();
        if (Array.isArray(articles)) {
          articleIndexEntry = articles.find(article => article.id === slug) || null;
        }
      }
    } catch (error) {
      console.warn('Could not load articles index', error);
    }

    const articlePath = `article/${encodeURIComponent(slug)}.md?v=${encodeURIComponent(version)}`;
    const articleResponse = await fetch(articlePath);
    if (!articleResponse.ok) {
      throw new Error(`File not found: ${slug}`);
    }

    const md = await articleResponse.text();
    const { metadata, contentMd } = parseFrontmatter(md);
    const parsedHtml = window.marked && typeof window.marked.parse === 'function'
      ? window.marked.parse(contentMd)
      : contentMd;

    const safeHtml = sanitizeHtml(parsedHtml);
    contentEl.innerHTML = `${renderMetaHeader(metadata)}${safeHtml}`;
    wrapTables(contentEl);

    updateDocumentMeta(slug, metadata, articleIndexEntry);

    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
      pageTitle.innerHTML = `<img src="images/announcements.webp" alt="" class="page-icon" width="20" height="20" loading="eager"> ${escapeHtml(metadata.title || articleIndexEntry?.title || 'Article')}`;
    }

    shareLinkEl.href = `news.html?article=${encodeURIComponent(slug)}`;
    shareLinkEl.setAttribute('aria-label', `Permanent link for ${metadata.title || slug}`);

    statusEl.hidden = true;
    readerEl.hidden = false;

    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  } catch (error) {
    console.error('Failed to load article:', error);
    renderError('File not found.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadArticle);
} else {
  loadArticle();
}
