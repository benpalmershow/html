/**
 * DOM Manipulation Utilities for SEO Element Injection
 * Provides functions for safely manipulating DOM elements for SEO purposes
 */

/**
 * Safely inject meta tag into document head
 * @param {string} name - Meta tag name or property
 * @param {string} content - Meta tag content
 * @param {string} type - Type of meta tag ('name', 'property', 'http-equiv')
 */
export function injectMetaTag(name, content, type = 'name') {
  if (!name || !content) return;
  
  // Remove existing meta tag with same name/property
  const existing = document.querySelector(`meta[${type}="${name}"]`);
  if (existing) {
    existing.remove();
  }
  
  // Create and inject new meta tag
  const meta = document.createElement('meta');
  meta.setAttribute(type, name);
  meta.setAttribute('content', content);
  
  document.head.appendChild(meta);
}

/**
 * Inject Open Graph meta tag
 * @param {string} property - OG property name
 * @param {string} content - OG content
 */
export function injectOgTag(property, content) {
  injectMetaTag(property, content, 'property');
}

/**
 * Inject Twitter Card meta tag
 * @param {string} name - Twitter card name
 * @param {string} content - Twitter card content
 */
export function injectTwitterTag(name, content) {
  injectMetaTag(name, content, 'name');
}

/**
 * Inject JSON-LD structured data
 * @param {Object} schemaData - Schema.org structured data object
 * @param {string} id - Optional ID for the script tag
 */
export function injectJsonLd(schemaData, id = null) {
  if (!schemaData || typeof schemaData !== 'object') return;
  
  // Remove existing script with same ID
  if (id) {
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }
  }
  
  // Create script element
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  if (id) {
    script.id = id;
  }
  
  try {
    script.textContent = JSON.stringify(schemaData, null, 2);
    document.head.appendChild(script);
  } catch (error) {
    console.error('Failed to inject JSON-LD:', error);
  }
}

/**
 * Update or create canonical link tag
 * @param {string} url - Canonical URL
 */
export function setCanonicalUrl(url) {
  if (!url) return;
  
  // Remove existing canonical link
  const existing = document.querySelector('link[rel="canonical"]');
  if (existing) {
    existing.remove();
  }
  
  // Create new canonical link
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = url;
  
  document.head.appendChild(link);
}

/**
 * Update document title
 * @param {string} title - New page title
 */
export function setPageTitle(title) {
  if (!title) return;
  document.title = title;
}

/**
 * Add preload link for critical resources
 * @param {string} href - Resource URL
 * @param {string} as - Resource type (font, style, script, etc.)
 * @param {string} type - MIME type (optional)
 * @param {boolean} crossorigin - Whether to add crossorigin attribute
 */
export function addPreloadLink(href, as, type = null, crossorigin = false) {
  if (!href || !as) return;
  
  // Check if preload link already exists
  const existing = document.querySelector(`link[rel="preload"][href="${href}"]`);
  if (existing) return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  
  if (type) {
    link.type = type;
  }
  
  if (crossorigin) {
    link.crossOrigin = 'anonymous';
  }
  
  document.head.appendChild(link);
}

/**
 * Add DNS prefetch link
 * @param {string} domain - Domain to prefetch
 */
export function addDnsPrefetch(domain) {
  if (!domain) return;
  
  // Check if DNS prefetch already exists
  const existing = document.querySelector(`link[rel="dns-prefetch"][href="${domain}"]`);
  if (existing) return;
  
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = domain;
  
  document.head.appendChild(link);
}

/**
 * Inject robots meta tag
 * @param {string} directives - Robots directives (e.g., 'index,follow')
 */
export function setRobotsDirectives(directives) {
  if (!directives) return;
  injectMetaTag('robots', directives);
}

/**
 * Add hreflang links for internationalization
 * @param {Array<Object>} hreflangs - Array of {lang, url} objects
 */
export function addHreflangLinks(hreflangs) {
  if (!Array.isArray(hreflangs)) return;
  
  // Remove existing hreflang links
  const existing = document.querySelectorAll('link[rel="alternate"][hreflang]');
  existing.forEach(link => link.remove());
  
  // Add new hreflang links
  hreflangs.forEach(({ lang, url }) => {
    if (!lang || !url) return;
    
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = lang;
    link.href = url;
    
    document.head.appendChild(link);
  });
}

/**
 * Wait for DOM to be ready
 * @returns {Promise} Promise that resolves when DOM is ready
 */
export function waitForDom() {
  return new Promise(resolve => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve);
    } else {
      resolve();
    }
  });
}

/**
 * Safely query selector with error handling
 * @param {string} selector - CSS selector
 * @param {HTMLElement} context - Context element (default: document)
 * @returns {HTMLElement|null} Found element or null
 */
export function safeQuerySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.warn(`Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Safely query all selectors with error handling
 * @param {string} selector - CSS selector
 * @param {HTMLElement} context - Context element (default: document)
 * @returns {NodeList} Found elements
 */
export function safeQuerySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.warn(`Invalid selector: ${selector}`, error);
    return [];
  }
}

/**
 * Create and inject viewport meta tag
 * @param {string} content - Viewport content (default: responsive)
 */
export function setViewportMeta(content = 'width=device-width, initial-scale=1.0') {
  injectMetaTag('viewport', content);
}

/**
 * Batch inject multiple meta tags
 * @param {Array<Object>} metaTags - Array of {name, content, type} objects
 */
export function batchInjectMetaTags(metaTags) {
  if (!Array.isArray(metaTags)) return;
  
  metaTags.forEach(({ name, content, type = 'name' }) => {
    if (name && content) {
      injectMetaTag(name, content, type);
    }
  });
}