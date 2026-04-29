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

  window.HtmlUtils = {
    escapeHtml,
    sanitizeHtml,
    parseFrontmatter
  };
})();
