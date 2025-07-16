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

      // Cover image
      const img = document.createElement('img');
      img.className = 'book-cover';
      img.src = book.cover || 'images/book-placeholder.png';
      img.alt = book.title || 'book cover';
      img.loading = 'lazy';
      card.appendChild(img);

      // Thumbs icon
      const thumb = document.createElement('div');
      thumb.className = 'book-thumb';
      if (book.thumbs === 'up') thumb.textContent = '👍';
      else if (book.thumbs === 'down') thumb.textContent = '👎';
      else thumb.textContent = '';
      card.appendChild(thumb);

      // Overlay
      const overlay = document.createElement('a');
      overlay.className = 'book-overlay';
      overlay.href = book.link || '#';
      overlay.target = '_blank';
      overlay.rel = 'noopener noreferrer';
      overlay.tabIndex = 0;
      overlay.innerHTML = `
        <div class=\"book-overlay-title\">${book.title || ''}</div>
        <div class=\"book-overlay-desc\">${book.description || ''}</div>
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
