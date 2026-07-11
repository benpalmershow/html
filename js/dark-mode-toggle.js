// Dark mode toggle functionality
(function () {
  const toggle = document.getElementById('darkModeToggle');
  function updateToggle() {
    if (!toggle) return;
    const isDark = document.documentElement.classList.contains('dark-mode');
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    const label = toggle.querySelector('.dark-mode-toggle-label');
    if (label) label.textContent = isDark ? 'Dark' : 'Light';
  }
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark-mode');
      try { localStorage.setItem('darkMode', document.documentElement.classList.contains('dark-mode') ? '1' : '0'); } catch (e) {}
      updateToggle();
    });
  }
  updateToggle();
})();
