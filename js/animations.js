// Phase 1: Micro-Animations

// 1. Logo entrance with bounce/fade-in animation
function animateLogo() {
  const logo = document.querySelector('.hero-logo');
  if (!logo) return;

  logo.style.opacity = '0';
  logo.style.transform = 'scale(0.8) rotate(-5deg)';
  logo.style.filter = 'blur(10px) drop-shadow(0 6px 16px var(--shadow-color))';

  setTimeout(() => {
    logo.style.transition = 'opacity 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), transform 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), filter 1.5s ease-out';
    logo.style.opacity = '1';
    logo.style.transform = 'scale(1) rotate(0deg)';
    logo.style.filter = 'blur(0px) drop-shadow(0 6px 16px var(--shadow-color))';
  }, 100);
}

// 2. Enhanced word-by-word reveal for subtitle text (Phase 2)
function animateSubtitle() {
  const subtitle = document.querySelector('.hero-subtitle');
  if (!subtitle) return;

  const text = subtitle.textContent.trim().replace(/\s+/g, ' ');
  const words = text.split(' ').filter(word => word.length > 0);
  
  subtitle.innerHTML = words.map((word, index) => {
    const delay = 600 + (index * 80);
    return `<span class="word" style="opacity: 0; display: inline-block; transform: translateY(10px) scale(0.95);">${word}</span>`;
  }).join(' ');
  
  const wordElements = subtitle.querySelectorAll('.word');
  wordElements.forEach((word, index) => {
    setTimeout(() => {
      word.style.transition = 'opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
      word.style.opacity = '0.9';
      word.style.transform = 'translateY(0) scale(1)';
    }, 600 + (index * 80));
  });
}

// 3. Parallax scroll on hero section
function initParallax() {
  const hero = document.querySelector('.hero');
  const logo = document.querySelector('.hero-logo');
  
  if (!hero || !logo) return;

  window.addEventListener('scroll', () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    const scrolled = window.pageYOffset;
    const heroHeight = hero.offsetHeight;
    
    if (scrolled < heroHeight) {
      const parallaxOffset = scrolled * 0.3;
      logo.style.transform = `translateY(${parallaxOffset}px) scale(1)`;
    }
  });
}

// Phase 2: Custom cursor interactions
function initCustomCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  
  const interactiveElements = document.querySelectorAll('a, button, .card, .announcement-card, .nav-link');
  
  interactiveElements.forEach(element => {
    element.addEventListener('mouseenter', () => {
      document.body.style.cursor = 'pointer';
      element.style.cursor = 'pointer';
    });
    
    element.addEventListener('mouseleave', () => {
      document.body.style.cursor = 'default';
    });
  });
}

// Phase 2: Selective icon animations
function initIconAnimations() {
  const icons = document.querySelectorAll('[data-lucide]');
  
  icons.forEach(icon => {
    const parent = icon.closest('.hint-step');
    if (!parent) return;
    
    parent.addEventListener('mouseenter', () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      icon.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      icon.style.transform = 'scale(1.15) rotate(5deg)';
    });
    
    parent.addEventListener('mouseleave', () => {
      icon.style.transform = 'scale(1) rotate(0deg)';
    });
  });
}

// Initialize all animations on page load
document.addEventListener('DOMContentLoaded', () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  animateLogo();
  setTimeout(() => animateSubtitle(), 1200);
  initParallax();
  initCustomCursor();
  
  setTimeout(() => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
      initIconAnimations();
    }
  }, 100);
});
