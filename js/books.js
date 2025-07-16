// Dynamically load and display book cards from books_with_covers.json

async function fetchBooks() {
  const res = await fetch('json/books.json');
  return res.json();
}

function createBookCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card';

  // Book cover with overlayed thumb
  const imgWrap = document.createElement('div');
  imgWrap.className = 'book-cover-wrap';
  imgWrap.style.position = 'relative';
  imgWrap.style.width = '100%';
  imgWrap.style.height = '100%';

  const img = document.createElement('img');
  img.className = 'book-cover';
  img.src = book.cover || 'images/book-placeholder.png';
  img.alt = book.title || 'book cover';
  img.loading = 'lazy';
  img.style.objectFit = 'cover';
  img.style.width = '100%';
  img.style.height = '100%';
  imgWrap.appendChild(img);

  const thumb = document.createElement('div');
  thumb.className = 'book-thumb';
  thumb.style.position = 'absolute';
  thumb.style.bottom = '0';
  thumb.style.right = '0';
  if (book.thumbs === 'up') thumb.textContent = '👍';
  else if (book.thumbs === 'down') thumb.textContent = '👎';
  else thumb.textContent = '';
  imgWrap.appendChild(thumb);

  // Description overlay
  const overlay = document.createElement('div');
  overlay.className = 'book-desc-overlay';

  const overlayTitle = document.createElement('div');
  overlayTitle.className = 'book-desc-overlay-title';
  overlayTitle.textContent = book.title || '';
  overlay.appendChild(overlayTitle);

  const overlayDesc = document.createElement('div');
  overlayDesc.className = 'book-desc-overlay-desc';
  overlayDesc.textContent = book.description || '';
  overlay.appendChild(overlayDesc);

  imgWrap.appendChild(overlay);

  card.appendChild(imgWrap);

  return card;
}


let allBooks = [];

function getFilterValues() {
  return {
    thumbs: document.getElementById('filter-thumbs').value,
    year: document.getElementById('filter-date').value,
    genre: document.getElementById('filter-genre').value
  };
}

function filterBooks(books, filters) {
  return books.filter(book => {
    // Thumbs filter
    if (filters.thumbs !== 'all') {
      if (!book.thumbs || book.thumbs !== filters.thumbs) return false;
    }
    // Year filter
    if (filters.year !== 'all') {
      if (!book.date || book.date !== filters.year) return false;
    }
    // Genre filter (case-insensitive, trims)
    if (filters.genre !== 'all') {
      if (!book.genre || book.genre.trim().toLowerCase() !== filters.genre.trim().toLowerCase()) return false;
    }
    return true;
  });
}

function populateDropdowns(books) {
  // Year
  const yearSet = new Set();
  books.forEach(b => { if (b.date) yearSet.add(b.date); });
  const years = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  const yearSel = document.getElementById('filter-date');
  yearSel.innerHTML = '<option value="all">All</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
  // Genre
  const genreSet = new Set();
  books.forEach(b => { if (b.genre) genreSet.add(b.genre); });
  const genres = Array.from(genreSet).sort();
  const genreSel = document.getElementById('filter-genre');
  genreSel.innerHTML = '<option value="all">All</option>' + genres.map(g => `<option value="${g}">${g}</option>`).join('');
}

function renderBooksFiltered() {
  const filters = getFilterValues();
  const container = document.getElementById('book-cards');
  container.innerHTML = '';
  filterBooks(allBooks, filters).forEach(book => {
    container.appendChild(createBookCard(book));
  });
}

async function renderBooks() {
  allBooks = await fetchBooks();
  populateDropdowns(allBooks);
  renderBooksFiltered();
  // Add event listeners
  document.getElementById('filter-thumbs').onchange = renderBooksFiltered;
  document.getElementById('filter-date').onchange = renderBooksFiltered;
  document.getElementById('filter-genre').onchange = renderBooksFiltered;
}

document.addEventListener('DOMContentLoaded', renderBooks);
