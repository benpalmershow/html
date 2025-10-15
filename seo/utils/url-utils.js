/**
 * URL Manipulation and Validation Utilities
 * Provides functions for URL handling in SEO contexts
 */

/**
 * Normalize URL by removing trailing slashes and query parameters
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
export function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const urlObj = new URL(url);
    // Remove trailing slash except for root
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    
    return `${urlObj.protocol}//${urlObj.host}${pathname}`;
  } catch {
    // Handle relative URLs
    let normalized = url.startsWith('/') ? url : `/${url}`;
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }
}

/**
 * Generate canonical URL for a page
 * @param {string} path - Page path
 * @param {string} baseUrl - Base site URL
 * @returns {string} Canonical URL
 */
export function generateCanonicalUrl(path, baseUrl = 'https://howdystranger.net') {
  const normalizedPath = normalizeUrl(path);
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  if (normalizedPath.startsWith('http')) {
    return normalizeUrl(normalizedPath);
  }
  
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Extract slug from URL path
 * @param {string} url - URL to extract slug from
 * @returns {string} URL slug
 */
export function extractSlug(url) {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
    return pathSegments[pathSegments.length - 1] || '';
  } catch {
    // Handle relative URLs
    const pathSegments = url.split('/').filter(segment => segment.length > 0);
    return pathSegments[pathSegments.length - 1] || '';
  }
}

/**
 * Generate SEO-friendly slug from text
 * @param {string} text - Text to convert to slug
 * @returns {string} SEO-friendly slug
 */
export function generateSlug(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if URL is internal (same domain)
 * @param {string} url - URL to check
 * @param {string} baseUrl - Base site URL
 * @returns {boolean} True if internal URL
 */
export function isInternalUrl(url, baseUrl = 'https://howdystranger.net') {
  if (!url) return false;
  
  // Relative URLs are internal
  if (url.startsWith('/') || !url.includes('://')) return true;
  
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseUrl);
    return urlObj.hostname === baseObj.hostname;
  } catch {
    return false;
  }
}

/**
 * Get current page path from window location
 * @returns {string} Current page path
 */
export function getCurrentPath() {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
}

/**
 * Get current page URL
 * @returns {string} Current page URL
 */
export function getCurrentUrl() {
  if (typeof window === 'undefined') return 'https://howdystranger.net';
  return window.location.href;
}