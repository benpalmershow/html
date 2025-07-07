document.addEventListener('DOMContentLoaded', () => {
  const socialFooterHTML = `
    <footer style="position: fixed; left: 0; right: 0; bottom; border-top: 1px solid #e5e7eb; z-index: 100; padding: 1.2em 0 0.7em 0;">
      <div class="social-links" style="display: flex; justify-content: center; align-items: center; gap: 28px;">
        <a href="https://x.com/DocRiter" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg" alt="X logo" style="height: 1.7em; width: 1.7em; vertical-align: middle; transition: filter 0.2s;" />
        </a>
        <a href="https://www.youtube.com/@BenPalmerShow" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg" alt="YouTube logo" style="height: 1.7em; width: 1.7em; vertical-align: middle; filter: none; transition: filter 0.2s;" />
        </a>
        <a href="https://benpalmershow.substack.com" target="_blank" rel="noopener noreferrer" aria-label="Substack">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/substack.svg" alt="Substack logo" style="height: 1.7em; width: 1.7em; vertical-align: middle; transition: filter 0.2s;" />
        </a>
      </div>
    </footer>
  `;
  document.body.insertAdjacentHTML('beforeend', socialFooterHTML);
});