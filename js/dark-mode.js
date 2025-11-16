// Dark mode toggle - independent initialization
function initDarkMode() {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (!darkModeToggle) return;

  // Check for saved preference or system preference
  const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                     (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDarkMode) {
    document.documentElement.classList.add('dark-mode');
    const icon = darkModeToggle.querySelector('i[data-lucide]');
    if (icon) {
      icon.setAttribute('data-lucide', 'sun');
    }
  }

  // Attach click handler directly to button
  darkModeToggle.onclick = function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const icon = darkModeToggle.querySelector('i[data-lucide]');
    if (icon) {
      icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
      if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
      }
    }
  };
}

// Initialize on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDarkMode);
} else {
  initDarkMode();
}

// Also reinitialize if nav gets regenerated
const observer = new MutationObserver(() => {
  const btn = document.getElementById('dark-mode-toggle');
  if (btn && !btn.onclick) {
    initDarkMode();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
