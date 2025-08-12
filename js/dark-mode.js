document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the index page
  const isIndexPage = window.location.pathname.endsWith('index.html') || 
                     window.location.pathname === '/' || 
                     window.location.pathname.endsWith('/');
  
  // Get current theme from localStorage or default to light
  const getCurrentTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  
  // Set theme on document element
  const setTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };
  
  // Initialize theme
  setTheme(getCurrentTheme());

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
      
          // Only add theme toggle on index page
      if (isIndexPage) {
        const themeToggle = document.createElement('a');
        themeToggle.className = 'nav-link theme-toggle';
        themeToggle.href = '#';
        themeToggle.setAttribute('role', 'button');
        themeToggle.setAttribute('aria-label', 'Toggle dark mode');
        themeToggle.title = 'Toggle dark/light mode';
        themeToggle.innerHTML = `
          <span class="theme-toggle-icon">
            <i class="fas fa-moon"></i>
            <i class="fas fa-sun" style="display: none;"></i>
          </span>
        `;
        
        // Add to navigation
        navLinks.appendChild(themeToggle);
      }

      // Check for saved user preference, if any
      const savedTheme = localStorage.getItem('theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (isIndexPage) {
          const toggleButton = document.querySelector('.theme-toggle');
          if (toggleButton) {
            toggleButton.innerHTML = '<i class="fas fa-sun"></i>';
          }
        }
      }

      // Add click event listener to the theme toggle if on index page
      if (isIndexPage) {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
          themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const currentTheme = getCurrentTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            // Update theme
            setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Update toggle icon
            const moonIcon = themeToggle.querySelector('.fa-moon');
            const sunIcon = themeToggle.querySelector('.fa-sun');
            
            if (newTheme === 'dark') {
              moonIcon.style.display = 'none';
              sunIcon.style.display = 'inline-block';
            } else {
              moonIcon.style.display = 'inline-block';
              sunIcon.style.display = 'none';
            }
            
            // Update the theme toggle
            updateThemeToggle(newTheme);
          });
        }
      }

      // Update the theme toggle on the index page
      const updateThemeToggle = (theme) => {
        if (isIndexPage) {
          const toggle = document.querySelector('.theme-toggle');
          if (toggle) {
            const moonIcon = toggle.querySelector('.fa-moon');
            const sunIcon = toggle.querySelector('.fa-sun');
            
            if (theme === 'dark') {
              moonIcon.style.display = 'none';
              sunIcon.style.display = 'inline-block';
            } else {
              moonIcon.style.display = 'inline-block';
              sunIcon.style.display = 'none';
            }
          }
        }
      };
      
      // Listen for system preference changes
      const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
      
      const setThemeFromSystemPreference = (e) => {
        if (!localStorage.getItem('theme')) {  // Only auto-apply if user hasn't set a preference
          const theme = e.matches ? 'dark' : 'light';
          setTheme(theme);
          updateThemeToggle(theme);
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
