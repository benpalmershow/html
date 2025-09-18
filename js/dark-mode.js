document.addEventListener('DOMContentLoaded', () => {
  // Get current theme from localStorage or default to light
  const getCurrentTheme = () => {
    return localStorage.getItem('theme') || 'light';
  };
  
  // Set theme on document element
  const setTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      updateThemeToggle('dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      updateThemeToggle('light');
    }
  };
  
  // Toggle between light and dark theme
  const toggleTheme = () => {
    const currentTheme = getCurrentTheme();
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };
  
  // Update the theme toggle button
  const updateThemeToggle = (theme) => {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    
    const icon = toggleBtn.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fas fa-sun';
      toggleBtn.setAttribute('aria-label', 'Switch to light mode');
      toggleBtn.title = 'Switch to light mode';
    } else {
      icon.className = 'fas fa-moon';
      toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
      toggleBtn.title = 'Switch to dark mode';
    }
  };
  
  // Initialize theme
  setTheme(getCurrentTheme());
  
  // Add click event to theme toggle button
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTheme();
    });
  }
});
