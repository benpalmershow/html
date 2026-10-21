/**
 * Shared Markdown and HTML helpers.
 *
 * Loaded as a plain <script> in the browser (exposes window.MarkdownUtils) and
 * required by Node tooling (scripts/build-article-index.js) so the article page
 * and the feed render identical markup from the same source.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.MarkdownUtils = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const IMAGE_SIZES = {
    'images/read.webp': [16, 16],
    'images/arrivals-of-ships.png': [1200, 800],
    'images/U.S. Department-small.png': [300, 220],
    'images/Zeekr.png': [1516, 1220]
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function stripFrontmatter(md) {
    const match = String(md || '').match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    return match ? match[2].trim() : String(md || '').trim();
  }

  function getAttr(tag, name) {
    const match = tag.match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'i'));
    return (match && (match[1] || match[2] || '')).trim();
  }

  function imageSize(src) {
    return IMAGE_SIZES[src] || [1200, 675];
  }

  function renderTableRows(rows) {
    if (rows.length < 2) return '';
    const headerCells = rows[0].split('|').slice(1, -1).map(c => c.trim());
    const bodyRows = rows.slice(2);
    let h = '<table><thead><tr>';
    headerCells.forEach(cell => {
      h += '<th>' + parseInline(cell, true) + '</th>';
    });
    h += '</tr></thead><tbody>';
    bodyRows.forEach(row => {
      const cells = row.split('|').slice(1, -1).map(c => c.trim());
      h += '<tr>';
      cells.forEach(cell => {
        h += '<td>' + parseInline(cell, true) + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table>';
    return '<div class="table-scroll">' + h + '</div>';
  }

  function renderTitle(title, link) {
    if (/<a\s/i.test(title)) return title;
    const esc = escapeHtml(title);
    if (link) {
      const ext = /^https?:\/\//i.test(link) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return '<a href="' + escapeAttr(link) + '"' + ext + '>' + esc + '</a>';
    }
    return esc;
  }

  function resolveTokens(text, urls, targets) {
    let out = String(text);
    for (let pass = 0; pass < 3; pass++) {
      const next = out
        .replace(/@@TGT(\d+)@@/g, (_, i) => (targets[Number(i)] !== undefined ? targets[Number(i)] : ''))
        .replace(/@@URL(\d+)@@/g, (_, i) => (urls[Number(i)] !== undefined ? urls[Number(i)] : ''));
      if (next === out) break;
      out = next;
    }
    return out;
  }

  function parseInline(text, autolink) {
    const htmlBlocks = [];
    const urls = [];
    const targets = [];
    let out = String(text).replace(/<[^>]*>/g, match => {
      htmlBlocks.push(match);
      return '@@HTML' + (htmlBlocks.length - 1) + '@@';
    });
    out = escapeHtml(out);

    // URLs are parked behind placeholders so emphasis rules cannot corrupt
    // paths such as /article.html?slug=urban_crime_2020.
    out = out.replace(/https?:\/\/[^\s<)]+/g, url => {
      urls.push(url);
      return '@@URL' + (urls.length - 1) + '@@';
    });
    out = out.replace(/\[([^\]]+)]\(([^\s)]+)\)/g, (_, label, url) => {
      targets.push(url);
      return '[' + label + '](@@TGT' + (targets.length - 1) + '@@)';
    });

    out = out
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/(^|[^\w])_([^_\n]+)_(?![\w])/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');

    const images = [];
    out = out.replace(/!\[([^\]]*)]\(([^\s)]+)\)/g, (_, alt, url) => {
      const src = resolveTokens(url, urls, targets);
      images.push('<img src="' + escapeAttr(src) + '" alt="' + escapeAttr(alt) + '">');
      return '@@IMAGE' + (images.length - 1) + '@@';
    });

    const links = [];
    out = out.replace(/\[([^\]]+)]\(([^\s)]+)\)/g, (_, label, url) => {
      const href = resolveTokens(url, urls, targets);
      const ext = /^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
      const safeLabel = parseInline(resolveTokens(label, urls, targets), false);
      links.push('<a href="' + escapeAttr(href) + '"' + ext + '>' + safeLabel + '</a>');
      return '@@LINK' + (links.length - 1) + '@@';
    });

    if (autolink) {
      out = out.replace(/@@URL(\d+)@@/g, (_, i) => {
        const url = urls[Number(i)];
        return '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(url) + '</a>';
      });
    }

    out = out.replace(/@@LINK(\d+)@@/g, (_, i) => links[Number(i)] || '');
    out = out.replace(/@@IMAGE(\d+)@@/g, (_, i) => images[Number(i)] || '');
    out = out.replace(/@@HTML(\d+)@@/g, (_, i) => htmlBlocks[Number(i)] || '');
    return out;
  }

  function parseMarkdown(markdown) {
    const lines = stripFrontmatter(markdown).replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let paragraph = [];
    let inCode = false;
    let inList = false;
    let inOrderedList = false;
    let inTable = false;
    let tableRows = [];
    const footnotes = {};
    function flushParagraph() {
      if (!paragraph.length) return;
      html += '<p>' + parseInline(paragraph.join(' '), true) + '</p>';
      paragraph = [];
    }
    function closeList() {
      if (inOrderedList) {
        html += '</ol>';
        inOrderedList = false;
      }
      if (inList) {
        html += '</ul>';
        inList = false;
      }
    }
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        return;
      }
      const codeFence = line.match(/^```(\S*)/);
      if (codeFence) {
        flushParagraph();
        closeList();
        if (inCode) {
          html += '</code></pre>';
          inCode = false;
        } else {
          const lang = codeFence[1] ? ' class="language-' + codeFence[1] + '"' : '';
          html += '<pre><code' + lang + '>';
          inCode = true;
        }
        return;
      }
      if (inCode) {
        html += escapeHtml(line) + '\n';
        return;
      }
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = Math.min(heading[1].length, 3);
        const slug = slugify(heading[2]);
        html += '<h' + level + ' id="' + escapeAttr(slug) + '">' + parseInline(heading[2], true) + '</h' + level + '>';
        return;
      }
      const detailsTag = line.match(/^(<details>|<\/details>|<summary>.*<\/summary>)$/);
      if (detailsTag) {
        flushParagraph();
        closeList();
        if (inTable) {
          html += renderTableRows(tableRows);
          tableRows = [];
          inTable = false;
        }
        html += trimmed;
        return;
      }
      const quote = line.match(/^>\s?(.+)$/);
      if (quote) {
        flushParagraph();
        closeList();
        html += '<blockquote>' + parseInline(quote[1], true) + '</blockquote>';
        return;
      }
      const hr = line.match(/^(-{3,}|\*{3,}|_{3,})$/);
      if (hr) {
        flushParagraph();
        closeList();
        html += '<hr>';
        return;
      }
      const item = line.match(/^[-*]\s+(.+)$/);
      if (item) {
        flushParagraph();
        if (inOrderedList) {
          html += '</ol>';
          inOrderedList = false;
        }
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        const taskMatch = item[1].match(/^\[([ xX])\]\s+(.+)$/);
        if (taskMatch) {
          const checked = taskMatch[1] !== ' ' ? ' checked' : '';
          html += '<li><input type="checkbox" disabled' + checked + '> ' + parseInline(taskMatch[2], true) + '</li>';
        } else {
          html += '<li>' + parseInline(item[1], true) + '</li>';
        }
        return;
      }
      const orderedItem = line.match(/^(\d+)\.\s+(.+)$/);
      if (orderedItem) {
        if (inTable) {
          html += renderTableRows(tableRows);
          tableRows = [];
          inTable = false;
        }
        flushParagraph();
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        if (!inOrderedList) {
          html += '<ol>';
          inOrderedList = true;
        }
        html += '<li>' + parseInline(orderedItem[2], true) + '</li>';
        return;
      }
      const tableRow = line.match(/^\|.+\|$/);
      if (tableRow) {
        flushParagraph();
        if (!inTable) {
          inTable = true;
        }
        tableRows.push(trimmed);
        return;
      }
      if (inTable) {
        html += renderTableRows(tableRows);
        tableRows = [];
        inTable = false;
      }
      const fnDef = line.match(/^\[\^(\d+)\]:\s+(.+)$/);
      if (fnDef) {
        footnotes[fnDef[1]] = fnDef[2];
        return;
      }
      paragraph.push(trimmed);
    });
    flushParagraph();
    closeList();
    if (inTable) {
      html += renderTableRows(tableRows);
      tableRows = [];
      inTable = false;
    }
    if (inCode) html += '</code></pre>';
    let result = html;
    const fnKeys = Object.keys(footnotes);
    if (fnKeys.length) {
      result = result.replace(/\[\^(\d+)\]/g, (_, num) => {
        return '<sup><a href="#fn-' + num + '" id="fnref-' + num + '">' + num + '</a></sup>';
      });
      result += '<section class="footnotes"><ol>';
      fnKeys.forEach(num => {
        result += '<li id="fn-' + num + '">' + parseInline(footnotes[num], true) + ' <a href="#fnref-' + num + '">↩</a></li>';
      });
      result += '</ol></section>';
    }
    return result;
  }

  function normalizeImages(html) {
    return String(html || '').replace(/<img\b[^>]*>/gi, tag => {
      const src = getAttr(tag, 'src');
      if (!src) return '';
      const alt = getAttr(tag, 'alt') || '';
      const size = imageSize(src);
      const attrs = 'src="' + escapeAttr(src) + '" alt="' + escapeAttr(alt) + '" width="' + size[0] + '" height="' + size[1] + '" loading="lazy" decoding="async"';
      const external = /^https?:\/\//i.test(src);
      const img = '<img ' + attrs + (external ? ' referrerpolicy="no-referrer" crossorigin="anonymous"' : '') + '>';
      return external ? '<a class="media-link" href="' + escapeAttr(src) + '" target="_blank" rel="noopener noreferrer" aria-label="Open image">' + img + '</a>' : img;
    });
  }

  function normalizeIframes(html) {
    return String(html || '').replace(/<iframe\b[^>]*>/gi, tag => {
      const src = getAttr(tag, 'src');
      if (!src) return '';
      const title = getAttr(tag, 'title') || 'Embedded video';
      return '<div class="video-placeholder" role="button" tabindex="0" data-video-src="' + escapeAttr(src) + '" aria-label="Play ' + escapeAttr(title) + '">Play video</div>';
    });
  }

  function normalizeContent(html) {
    return normalizeIframes(normalizeImages(html));
  }

  /**
   * Rewrites href/src attributes through a resolver. Used to point links that
   * were authored against another page layout at the current one.
   */
  function rewriteLinks(html, rewrite) {
    if (typeof rewrite !== 'function') return html;
    return String(html || '')
      .replace(/<a\b[^>]*href="([^"]*)"/gi, (tag, url) => tag.replace(`href="${url}"`, `href="${rewrite(url)}"`))
      .replace(/<img\b[^>]*src="([^"]*)"/gi, (tag, url) => tag.replace(`src="${url}"`, `src="${rewrite(url)}"`));
  }

  return {
    escapeHtml,
    escapeAttr,
    slugify,
    stripFrontmatter,
    getAttr,
    imageSize,
    renderTableRows,
    renderTitle,
    parseInline,
    parseMarkdown,
    normalizeImages,
    normalizeIframes,
    normalizeContent,
    rewriteLinks
  };
});
