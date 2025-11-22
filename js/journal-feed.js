function linkify(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

function waitForMarked() {
  return new Promise((resolve) => {
    if (window.marked) {
      resolve();
      return;
    }
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

const __v = (document.querySelector('meta[name="last-commit"]') && document.querySelector('meta[name="last-commit"]').getAttribute('content')) || Date.now();

async function loadJournalEntries() {
  try {
    await waitForMarked();
    
    const response = await fetch(`/json/journal.json?v=${encodeURIComponent(__v)}`);
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
    
    const journalFeed = document.getElementById('journal-feed');
    if (!journalFeed) {
      throw new Error('Journal feed element not found');
    }
    
    // Load all entries, handling both inline content and file references
    const articlesHTML = await Promise.all(journals.map(async (journal) => {
      if (!journal || !journal.date) {
        console.error('Invalid journal entry - missing date:', journal);
        return '';
      }
      if (!journal.entries || !Array.isArray(journal.entries)) {
        console.error('Invalid journal entry - missing or invalid entries:', journal);
        return '';
      }
      
      const entriesHTML = await Promise.all(journal.entries.map(async (entry) => {
        if (!entry || typeof entry.title !== 'string') {
          console.error('Invalid entry:', entry);
          return '';
        }

        if (!entry.content && !entry.file) {
          console.error('Entry missing content and file:', entry);
          return '';
        }
        
        const entryId = entry.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        
        let contentHtml = '';
        
        if (entry.file) {
          try {
            const fileResponse = await fetch(entry.file + '?v=' + encodeURIComponent(__v));
            const md = await fileResponse.text();
            const parts = md.split(/^---$/m);
            let content = md.trim();
            if (parts.length >= 3) {
              content = parts.slice(2).join('---').trim();
            }
            // Parse markdown to HTML if marked is available
            let htmlContent = content;
            if (window.marked) {
              try {
                htmlContent = window.marked.parse(content);
              } catch (e) {
                console.error('Failed to parse markdown, using raw content:', e);
              }
            }
            contentHtml = `<div id="${entryId}" class="entry"><div class="entry-title">${entry.title}</div><div class="entry-content">${htmlContent}</div></div>`;
          } catch (err) {
            console.error('Failed to load file:', entry.file, err);
            contentHtml = `<div id="${entryId}" class="entry"><div class="entry-title">${entry.title}</div><div class="entry-content">Unable to load content.</div></div>`;
          }
        } else if (entry.content && typeof entry.content === 'string') {
          contentHtml = `<div id="${entryId}" class="entry"><div class="entry-title">${entry.title}</div><div class="entry-content">${entry.content.includes('<') ? entry.content : linkify(entry.content)}</div></div>`;
        }
        
        return contentHtml;
      }));
      
      return `<article class="journal-entry"><div class="card-title"><time datetime="${formatDateForDateTime(journal.date)}">${formatDate(journal.date)}</time></div><div class="content">${entriesHTML.join('')}</div></article>`;
    }));
    
    journalFeed.innerHTML = articlesHTML.join('');
  } catch (error) {
    console.error('Error loading journal entries:', error);
    const journalFeed = document.getElementById('journal-feed');
    if (journalFeed) {
      journalFeed.innerHTML = '<div class="error-state">Error loading journal entries. Please try again later.</div>';
    }
  }
}

function parseDate(dateString) {
  try {
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
    if (isNaN(parsedMonth) || isNaN(parsedDay) || isNaN(parsedYear)) {
      console.error('Date parts could not be parsed:', { month, day, year });
      return new Date(0);
    }
    const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
    if (isNaN(date.getTime())) {
      console.error('Invalid date created:', dateString);
      return new Date(0);
    }
    return date;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return new Date(0);
  }
}

function formatDate(dateString) {
  try {
    const date = parseDate(dateString);
    if (isNaN(date.getTime()) || date.getTime() === 0) {
      console.error('Using original date string due to parsing failure:', dateString);
      return dateString;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return dateString;
  }
}

function formatDateForDateTime(dateString) {
  try {
    const date = parseDate(dateString);
    if (isNaN(date.getTime()) || date.getTime() === 0) {
      console.error('Using original date string for datetime attribute:', dateString);
      return dateString;
    }
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting datetime:', dateString, error);
    return dateString;
  }
}

// Load entries when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadJournalEntries);
} else {
  loadJournalEntries();
}
