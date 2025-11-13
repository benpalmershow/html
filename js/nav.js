// Generate sticky navbar with links to all pages
document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('main-nav');
  
  const pages = [
    { name: 'Home', file: 'index.html' },
    { name: 'News', file: 'news.html' },
    { name: 'Numbers', file: 'financials.html' },
    { name: 'Media', file: 'media.html' },
    { name: 'Tweets', file: 'journal.html' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  const navHTML = `
    <div class="nav-container">
      <ul class="nav-list">
        ${pages.map(page => {
          const isActive = currentPage === page.file || (currentPage === '' && page.file === 'index.html');
          if (page.file === 'index.html') {
            return `<li><a href="${page.file}" class="nav-link nav-logo ${isActive ? 'active' : ''}" title="Home"><picture><source srcset="images/logo-360x360.webp" type="image/webp"><img src="images/logo-360x360.webp" alt="Howdy, Stranger - Home" width="32" height="32" loading="lazy"></picture></a></li>`;
          }
          return `<li><a href="${page.file}" class="nav-link ${isActive ? 'active' : ''}">${page.name}</a></li>`;
        }).join('')}
      </ul>
      <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded="false">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  `;

  navContainer.innerHTML = navHTML;

  // Mobile menu toggle
  const toggle = document.getElementById('nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const navList = document.querySelector('.nav-list');
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !isOpen);
      navList.classList.toggle('active');
    });

    // Close menu when a link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        toggle.setAttribute('aria-expanded', 'false');
        document.querySelector('.nav-list').classList.remove('active');
      });
    });
  }
});
