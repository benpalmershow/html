// Inject styles synchronously in head to prevent layout shifts
(function() {
  const style = document.createElement('style');
  style.textContent = `#social-footer { background: var(--bg-secondary); padding: 1.2em 0 1.5em 0; text-align: center; border-top: 1px solid var(--border-color); }#social-footer .social-links { display:flex;justify-content:center;align-items:center;gap:28px; }#social-footer .social-links a { display:inline-flex; align-items:center; justify-content:center; }#social-footer .social-links a img { filter: invert(0) !important; vertical-align:middle;transition:filter 0.2s; }#social-footer .social-links a img:hover { filter: invert(1) !important; }#social-footer .footer-text { margin:0;font-size:0.8em;color:#666;text-align:center; }`;
  document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', () => {
  const socialLinksHTML = `<a href="https://x.com/DocRiter" target="_blank" rel="noopener noreferrer" aria-label="X(Twitter)"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg" alt="X logo" width="27" height="27"/></a><a href="https://www.youtube.com/@BenPalmerShow" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg" alt="YouTube logo" width="27" height="27"/></a><a href="https://benpalmershow.substack.com" target="_blank" rel="noopener noreferrer" aria-label="Substack"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/substack.svg" alt="Substack logo" width="27" height="27"/></a><a href="https://open.spotify.com/show/5re4DaXRuEkKHEYr3Mc6tJ" target="_blank" rel="noopener noreferrer" aria-label="Spotify"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/spotify.svg" alt="Spotify logo" width="27" height="27"/></a><a href="https://podcasts.apple.com/us/podcast/the-ben-palmer-show/id1529618289?uo=4" target="_blank" rel="noopener noreferrer" aria-label="Apple Podcasts"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/applepodcasts.svg" alt="Apple Podcasts logo" width="27" height="27"/></a><a href="https://buymeacoffee.com/benpalmershow" target="_blank" rel="noopener noreferrer" aria-label="Buy Me A Coffee"><img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/buymeacoffee.svg" alt="Buy Me A Coffee logo" width="27" height="27"/></a>`;
  
  const footer = document.getElementById('social-footer');
  if (!footer) return;
  const socialLinks = footer.querySelector('.social-links');
  if (!socialLinks) return;
  socialLinks.innerHTML = socialLinksHTML;
});
