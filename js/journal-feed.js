function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  if (window.DOMPurify) {
    return;
  }

  if (window.loadDOMPurify && typeof window.loadDOMPurify === 'function') {
    try {
      await window.loadDOMPurify();
      return;
    } catch (error) {
      console.warn('DOMPurify loader failed, using fallback sanitizer', error);
    }
  }

  await new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function linkify(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

function addTickerLinks(html) {
  if (!html) return '';

  const template = document.createElement('template');
  template.innerHTML = html;

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.includes('$')) {
        return NodeFilter.FILTER_REJECT;
      }

      const parentTag = node.parentElement?.tagName;
      if (parentTag && ['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA'].includes(parentTag)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    textNodes.push(currentNode);
  }

  const tickerRegex = /(^|[^\w/])\$([A-Z][A-Z.\-]{0,9})(?![\w.])/g;

  textNodes.forEach((node) => {
    const text = node.nodeValue;
    let match;
    let lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let hasMatch = false;

    while ((match = tickerRegex.exec(text)) !== null) {
      hasMatch = true;
      const [fullMatch, prefix, ticker] = match;
      const start = match.index;
      const prefixLength = prefix.length;
      const dollarIndex = start + prefixLength;

      if (dollarIndex > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, dollarIndex)));
      }

      const anchor = document.createElement('a');
      anchor.href = `https://www.perplexity.ai/finance/${encodeURIComponent(ticker)}`;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = `$${ticker}`;
      fragment.appendChild(anchor);

      lastIndex = dollarIndex + ticker.length + 1;
    }

    if (!hasMatch) {
      return;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode.replaceChild(fragment, node);
  });

  return template.innerHTML;
}

async function waitForMarked() {
  if (window.marked) {
    return;
  }

  // Try using the preloaded loader from posts-loader module
  if (window.loadMarked && typeof window.loadMarked === 'function') {
    return window.loadMarked();
  }

  // Fallback: polling
  return new Promise((resolve) => {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.marked) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= 50) {
        clearInterval(checkInterval);
        console.error('Marked.js not loaded');
        resolve();
      }
    }, 100);
  });
}

async function loadJournalEntries() {
  const journalFeed = document.getElementById('journal-feed');
  const siteDataVersion = document.querySelector('meta[name="site-data-version"]')?.content || '20260320';
  if (!journalFeed) {
    console.error('Journal feed element not found');
    return;
  }

  try {
    await waitForMarked();
    await ensureHtmlSanitizer();
    const response = await fetch(`json/journal.json?v=${encodeURIComponent(siteDataVersion)}`);
    if (!response.ok) {
      throw new Error(`Failed to load journal entries: ${response.status} ${response.statusText}`);
    }
    const journals = await response.json();
    
    if (!Array.isArray(journals)) {
      throw new Error('Journal data is not an array');
    }
    
    journals.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB - dateA;
    });
    
    const articlesHTML = await Promise.all(journals.map(renderJournal));
    
    journalFeed.innerHTML = articlesHTML.join('');
    
    scrollToHash();
  } catch (error) {
    console.error('Error loading journal entries:', error);
    journalFeed.innerHTML = '<div class="error-state">Error loading journal entries. Please try again later.</div>';
  }
}

async function renderJournal(journal) {
  if (!journal || !journal.date) {
    console.error('Invalid journal entry - missing date:', journal);
    return '';
  }
  if (!Array.isArray(journal.entries)) {
    console.error('Invalid journal entry - missing or invalid entries:', journal);
    return '';
  }

  const entriesHTML = await Promise.all(journal.entries.map(renderEntry));
  return `<article class="journal-entry"><div class="card-title"><time datetime="${formatDateForDateTime(journal.date)}">${formatDate(journal.date)}</time></div><div class="content">${entriesHTML.join('')}</div></article>`;
}

async function renderEntry(entry) {
  if (!entry || typeof entry.title !== 'string') {
    console.error('Invalid entry:', entry);
    return '';
  }

  if ((!entry.content || entry.content.trim() === '') && !entry.file && (!entry.title || entry.title.trim() === '')) {
    console.error('Entry missing title, content, and file:', entry);
    return '';
  }

  const entryId = createEntryId(entry.title);

  if (entry.file) {
    return renderEntryFromFile(entry, entryId);
  }

  return renderInlineEntry(entry, entryId);
}

function createEntryId(title) {
  const plainTitle = title.replace(/<[^>]*>/g, ' ');
  return plainTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderTitle(title) {
  const safeTitle = title.includes('<') ? sanitizeHtml(title) : escapeHtml(title);
  return addTickerLinks(safeTitle);
}

async function renderEntryFromFile(entry, entryId) {
  try {
    const fileResponse = await fetch(entry.file);
    const md = await fileResponse.text();
    const parts = md.split(/^---$/m);
    let content = md.trim();
  if (parts.length >= 3) {
      content = parts.slice(2).join('---').trim();
    }

    let htmlContent = content;
    if (window.marked) {
      try {
        htmlContent = window.marked.parse(content);
      } catch (e) {
        console.error('Failed to parse markdown, using raw content:', e);
      }
    }

    const safeTitle = renderTitle(entry.title);
    const safeContent = addTickerLinks(sanitizeHtml(htmlContent));
    return `<div id="${entryId}" class="entry"><div class="entry-title">${safeTitle}</div><div class="entry-content">${safeContent}</div></div>`;
  } catch (err) {
    console.error('Failed to load file:', entry.file, err);
    const safeTitle = renderTitle(entry.title);
    return `<div id="${entryId}" class="entry"><div class="entry-title">${safeTitle}</div><div class="entry-content">Unable to load content.</div></div>`;
  }
}

function renderInlineEntry(entry, entryId) {
   const safeTitle = renderTitle(entry.title);
   const rawContent = typeof entry.content === 'string' ? entry.content : '';
   let content = rawContent.includes('<') ? sanitizeHtml(rawContent) : linkify(escapeHtml(rawContent));
   content = addTickerLinks(content);
   
   // Handle paragraph breaks if content doesn't contain HTML
   if (!rawContent.includes('<')) {
     const paragraphs = content.split(/\n\n+/);
     content = paragraphs
       .filter(para => para.trim() !== '')
       .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
       .join('');
   }
   
   const contentHtml = content ? `<div class="entry-content">${content}</div>` : '';
   return `<div id="${entryId}" class="entry"><div class="entry-title">${safeTitle}</div>${contentHtml}</div>`;
}

function scrollToHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    return;
  }

  setTimeout(() => {
    const targetElement = document.getElementById(hash);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
}

function parseDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    console.error('Invalid date string:', dateString);
    return new Date(0);
  }

  const parts = dateString.split('/');
  if (parts.length !== 3) {
    console.error('Date string format invalid:', dateString);
    return new Date(0);
  }

  const [month, day, year] = parts;
  const fullYear = year.length === 2 ? `20${year}` : year;
  const parsedMonth = parseInt(month, 10);
  const parsedDay = parseInt(day, 10);
  const parsedYear = parseInt(fullYear, 10);

  if (Number.isNaN(parsedMonth) || Number.isNaN(parsedDay) || Number.isNaN(parsedYear)) {
    console.error('Date parts could not be parsed:', { month, day, year });
    return new Date(0);
  }

  const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
  if (Number.isNaN(date.getTime())) {
    console.error('Invalid date created:', dateString);
    return new Date(0);
  }

  return date;
}

function formatDate(dateString) {
  const date = parseDate(dateString);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    console.error('Using original date string due to parsing failure:', dateString);
    return dateString;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateForDateTime(dateString) {
  const date = parseDate(dateString);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    console.error('Using original date string for datetime attribute:', dateString);
    return dateString;
  }

  return date.toISOString().split('T')[0];
}

// Load entries when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadJournalEntries);
} else {
  loadJournalEntries();
}
