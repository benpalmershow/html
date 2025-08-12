document.addEventListener('DOMContentLoaded', () => {
  // Add Font Awesome for the icons if not already loaded
  if (!document.querySelector('#font-awesome')) {
    const fontAwesome = document.createElement('link');
    fontAwesome.id = 'font-awesome';
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(fontAwesome);
  }

  // Wait for the navigation to be loaded
  const checkNav = setInterval(() => {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && navLinks.children.length > 0) {
      clearInterval(checkNav);
      
      // Create the theme toggle button
      const themeToggle = document.createElement('a');
      themeToggle.className = 'nav-link theme-toggle';
      themeToggle.href = '#';
      themeToggle.setAttribute('aria-label', 'Toggle dark mode');
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      
      // Add the theme toggle to the navigation
      navLinks.appendChild(themeToggle);

      // Check for saved user preference, if any
      const savedTheme = localStorage.getItem('theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      }

      // Add click event listener to the theme toggle button
      themeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const currentTheme = document.documentElement.getAttribute('data-theme');
        
        if (currentTheme === 'dark') {
          // Switch to light theme
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('theme', 'light');
          themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
          // Switch to dark theme
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('theme', 'dark');
          themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
      });

      // Listen for system preference changes
      const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
      
      const setThemeFromSystemPreference = (e) => {
        if (!localStorage.getItem('theme')) {  // Only auto-apply if user hasn't set a preference
          if (e.matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
          } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
          }
        }
      };
      
      // Set initial theme from system preference if no user preference is set
      if (!localStorage.getItem('theme')) {
        setThemeFromSystemPreference(prefersDarkScheme);
      }
      
      // Listen for system theme changes
      prefersDarkScheme.addListener(setThemeFromSystemPreference);
    }
  }, 100);  // Check every 100ms
});
