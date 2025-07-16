// Dynamically generate book cards from books.json and insert into #book-cards

document.addEventListener('DOMContentLoaded', async function() {
  const container = document.getElementById('book-cards');
  if (!container) return;

  // Fetch books.json
  let books = [];
  try {
    const res = await fetch('json/books.json');
    books = await res.json();
  } catch (e) {
    container.textContent = 'Failed to load books.';
    return;
  }

  // Populate dropdowns
  const thumbsSel = document.getElementById('filter-thumbs');
  const yearSel = document.getElementById('filter-date');
  const genreSel = document.getElementById('filter-genre');
  // Populate year and genre dropdowns with all unique values from books.json
  if (yearSel && genreSel) {
    const yearSet = new Set();
    const genreSet = new Set();
    books.forEach(b => {
      if (b.date) yearSet.add(b.date);
      if (b.genre) genreSet.add(b.genre.trim());
    });
    const years = Array.from(yearSet).sort((a, b) => b.localeCompare(a)); // Descending
    const genres = Array.from(genreSet).sort((a, b) => a.localeCompare(b, undefined, {sensitivity:'base'})); // A-Z, case-insensitive
    yearSel.innerHTML = '<option value="all">All</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
    genreSel.innerHTML = '<option value="all">All</option>' + genres.map(g => `<option value="${g}">${g}</option>`).join('');
  }

  function filterBooks() {
    const thumbs = thumbsSel ? thumbsSel.value : 'all';
    const year = yearSel ? yearSel.value : 'all';
    const genre = genreSel ? genreSel.value.trim().toLowerCase() : 'all';
    container.innerHTML = '';
    books.forEach(book => {
      // Thumbs filter
      if (thumbs !== 'all' && (!book.thumbs || book.thumbs !== thumbs)) return;
      // Year filter
      if (year !== 'all' && (!book.date || book.date !== year)) return;
      // Genre filter (case-insensitive, trims)
      if (genre !== 'all' && (!book.genre || book.genre.trim().toLowerCase() !== genre)) return;

      const card = document.createElement('div');
      card.className = 'book-card';

      // Cover image or accessible label
      if (book.cover) {
        const img = document.createElement('img');
        img.className = 'book-cover';
        img.src = book.cover;
        img.alt = book.title ? `Cover of ${book.title}` : 'Book cover';
        img.loading = 'lazy';
        card.appendChild(img);
      } else {
        card.classList.add('book-cover-missing');
        card.style.background = '#f8f4e6';
        // Add visually hidden label for accessibility
        const hiddenLabel = document.createElement('span');
        hiddenLabel.className = 'book-cover-missing-label visually-hidden';
        hiddenLabel.textContent = book.title || 'Book title';
        card.appendChild(hiddenLabel);
      }

      // Overlay
      const overlay = document.createElement('a');
      overlay.className = 'book-overlay';
      overlay.target = '_blank';
      overlay.rel = 'noopener noreferrer';
      overlay.tabIndex = 0;
      let thumbsHTML = '';
      if (book.thumbs === 'up') thumbsHTML = '<div class="book-thumb">👍</div>';
      else if (book.thumbs === 'down') thumbsHTML = '<div class="book-thumb">👎</div>';
      // Truncate description to 120 characters
      let desc = book.description || '';
      if (desc.length > 120) desc = desc.slice(0, 117) + '…';
      overlay.innerHTML = `
        ${thumbsHTML}
        <div class="book-overlay-title">${book.title || ''}</div>
        <div class="book-overlay-desc">${desc}</div>
      `;
      card.appendChild(overlay);

      container.appendChild(card);
    });
  }

  if (thumbsSel) thumbsSel.onchange = filterBooks;
  if (yearSel) yearSel.onchange = filterBooks;
  if (genreSel) genreSel.onchange = filterBooks;
  filterBooks();
});
