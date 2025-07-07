document.addEventListener('DOMContentLoaded', () => {
  const socialFooterHTML = `
    <footer class="site-footer-social">
      <div class="social-links">
        <a href="https://x.com/DocRiter" target="_blank" rel="noopener noreferrer">X</a>
        <a href="https://www.youtube.com/@BenPalmerShow" target="_blank" rel="noopener noreferrer">YouTube</a>
        <a href="https://benpalmershow.substack.com" target="_blank" rel="noopener noreferrer">Substack</a>
      </div>
    </footer>
  `;
  document.body.insertAdjacentHTML('beforeend', socialFooterHTML);
});