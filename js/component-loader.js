/**
 * Unified component loader for HTML fragments
 * Reduces duplication of fetch + parse + append patterns
 */

export async function loadComponent(url, targetSelector, options = {}) {
  const {
    type = 'html', // 'html', 'meta', 'link', 'script'
    onError = () => console.error(`Failed to load ${url}`),
    retry = 0
  } = options;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const target = document.querySelector(targetSelector);
    if (!target) throw new Error(`Target element not found: ${targetSelector}`);

    // Route by type
    switch (type) {
      case 'meta':
        appendMetaElements(tempDiv, target);
        break;
      case 'link':
        appendLinkElements(tempDiv, target);
        break;
      case 'script':
        appendScriptElements(tempDiv, target);
        break;
      default:
        target.innerHTML = html;
    }
  } catch (error) {
    onError(error);
    if (retry > 0) {
      setTimeout(() => loadComponent(url, targetSelector, { ...options, retry: retry - 1 }), 1000);
    }
  }
}

function appendMetaElements(container, target) {
  const elements = container.querySelectorAll('meta, link');
  elements.forEach(el => {
    target.appendChild(el.cloneNode(true));
  });
}

function appendLinkElements(container, target) {
  const elements = container.querySelectorAll('link');
  elements.forEach(el => {
    target.appendChild(el.cloneNode(true));
  });
}

function appendScriptElements(container, target) {
  const elements = container.querySelectorAll('script');
  elements.forEach(script => {
    const newScript = document.createElement('script');
    newScript.textContent = script.textContent;
    target.appendChild(newScript);
  });
}

/**
 * Load component when element is in viewport (lazy loading)
 */
export function loadComponentOnVisible(url, targetSelector, options = {}) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadComponent(url, targetSelector, options);
        observer.unobserve(target);
      }
    },
    { rootMargin: '100px' }
  );

  observer.observe(target);
}
