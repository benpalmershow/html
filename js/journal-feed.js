function linkify(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
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
  if (!journalFeed) {
    console.error('Journal feed element not found');
    return;
  }

  try {
    await waitForMarked();
    const response = await fetch('/json/journal.json');
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

  if (!entry.content && !entry.file) {
    console.error('Entry missing content and file:', entry);
    return '';
  }

  const entryId = createEntryId(entry.title);

  if (entry.file) {
    return renderEntryFromFile(entry, entryId);
  }

  return renderInlineEntry(entry, entryId);
}

function createEntryId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

    return `<div id="${entryId}" class="entry"><div class="entry-title">${entry.title}</div><div class="entry-content">${htmlContent}</div></div>`;
  } catch (err) {
    console.error('Failed to load file:', entry.file, err);
    return `<div id="${entryId}" class="entry"><div class="entry-title">${entry.title}</div><div class="entry-content">Unable to load content.</div></div>`;
  }
}

function renderInlineEntry(entry, entryId) {
   let content = entry.content.includes('<') ? entry.content : linkify(entry.content);
   
   // Handle paragraph breaks if content doesn't contain HTML
   if (!entry.content.includes('<')) {
     const paragraphs = content.split(/\n\n+/);
     content = paragraphs
       .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
       .join('');
   }
   
   return `<div id="${entryId}" class="entry"><div class="entry-title">${entry.title}</div><div class="entry-content">${content}</div></div>`;
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
