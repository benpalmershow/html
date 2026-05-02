// Shared HTML, Markdown, and text helpers used by content renderers.
(function () {
  'use strict';

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeHtml(html, options = {}) {
    if (!html) return '';

    const config = {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      ...(options.dompurify || {})
    };

    if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
      return window.DOMPurify.sanitize(html, config);
    }

    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll(config.FORBID_TAGS.join(',')).forEach(node => node.remove());

    template.content.querySelectorAll('*').forEach(node => {
      Array.from(node.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = attr.value.trim();

        if (name.startsWith('on')) {
          node.removeAttribute(attr.name);
          return;
        }

        if ((name === 'href' || name === 'src' || name === 'xlink:href') && /^\s*javascript:/i.test(value)) {
          node.removeAttribute(attr.name);
        }
      });
    });

    return template.innerHTML;
  }

  function parseFrontmatter(md) {
    const metadata = {};
    const match = String(md || '').match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) return { metadata, contentMd: String(md || '').trim() };

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

  function formatRelativeDate(dateString) {
    if (!dateString) return '';

    const parsedDate = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return dateString;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const articleDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    const diffDays = Math.round((articleDay.getTime() - today.getTime()) / 86400000);
    const absDays = Math.abs(diffDays);

    if (diffDays === 0) return 'today';
    if (diffDays === -1) return '1 day ago';
    if (diffDays === 1) return 'tomorrow';
    if (absDays < 30) return diffDays < 0 ? `${absDays} days ago` : `in ${absDays} days`;

    const diffMonths = (articleDay.getFullYear() - today.getFullYear()) * 12 + (articleDay.getMonth() - today.getMonth());
    const absMonths = Math.abs(diffMonths);

    if (absMonths < 12) {
      if (absMonths === 0) return diffDays < 0 ? `${absDays} days ago` : `in ${absDays} days`;
      return diffMonths < 0 ? `${absMonths} month${absMonths === 1 ? '' : 's'} ago` : `in ${absMonths} month${absMonths === 1 ? '' : 's'}`;
    }

    const diffYears = articleDay.getFullYear() - today.getFullYear();
    const absYears = Math.abs(diffYears);
    return diffYears < 0 ? `${absYears} year${absYears === 1 ? '' : 's'} ago` : `in ${absYears} year${absYears === 1 ? '' : 's'}`;
  }

  async function ensureHtmlSanitizer() {
    if (window.DOMPurify) return;

    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  window.HtmlUtils = {
    escapeHtml,
    sanitizeHtml,
    parseFrontmatter,
    formatRelativeDate,
    ensureHtmlSanitizer
  };
})();
