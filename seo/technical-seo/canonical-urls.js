/**
 * Canonical URL System
 * Generates canonical URLs for all pages and prevents duplicate content issues
 */

import { urlUtils } from '../utils/url-utils.js';
import { errorHandler } from '../utils/error-handler.js';
import { seoConfig } from '../config/seo-config.js';

class CanonicalUrlManager {
  constructor() {
    this.baseUrl = seoConfig.site.url;
    this.canonicalRules = new Map();
    this.redirectRules = new Map();
  }

  /**
   * Generate canonical URL for a given page
   * @param {string} currentUrl - Current page URL
   * @param {Object} options - Options for canonical URL generation
   * @returns {string} Canonical URL
   */
  generateCanonicalUrl(currentUrl, options = {}) {
    try {
      // Normalize the URL first
      const normalizedUrl = this.normalizeUrl(currentUrl);
      
      // Check if there's a specific canonical rule for this URL
      if (this.canonicalRules.has(normalizedUrl)) {
        return this.canonicalRules.get(normalizedUrl);
      }
      
      // Build canonical URL based on normalized URL
      const canonicalUrl = urlUtils.buildAbsoluteUrl(normalizedUrl, this.baseUrl);
      
      return canonicalUrl;
    } catch (error) {
      errorHandler.logError('CanonicalUrlManager.generateCanonicalUrl', error);
      throw error;
    }
  }

  /**
   * Normalize URL by removing unnecessary parameters and fragments
   * @param {string} url - URL to normalize
   * @returns {string} Normalized URL
   */
  normalizeUrl(url) {
    try {
      // Remove protocol and domain if present to work with relative URLs
      let normalizedUrl = url.replace(/^https?:\/\/[^\/]+/, '');
      
      // Ensure URL starts with /
      if (!normalizedUrl.startsWith('/')) {
        normalizedUrl = '/' + normalizedUrl;
      }
      
      // Parse URL to handle query parameters and fragments
      const urlObj = new URL(normalizedUrl, 'https://example.com');
      
      // Remove fragment (hash)
      urlObj.hash = '';
      
      // Handle query parameters - remove tracking and session parameters
      const paramsToRemove = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'twclid',
        'sessionid', 'sid', 'jsessionid',
        '_ga', '_gid', '_gac',
        'ref', 'referrer'
      ];
      
      paramsToRemove.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      // Reconstruct the path
      let path = urlObj.pathname;
      
      // Remove trailing slash except for root
      if (path !== '/' && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      
      // Add query string if any parameters remain
      const queryString = urlObj.searchParams.toString();
      if (queryString) {
        path += '?' + queryString;
      }
      
      // Handle index.html normalization
      if (path === '/index.html') {
        path = '/';
      }
      
      return path;
    } catch (error) {
      errorHandler.logError('CanonicalUrlManager.normalizeUrl', error);
      return url; // Return original URL if normalization fails
    }
  }

  /**
   * Set custom canonical URL for a specific page
   * @param {string} pageUrl - Page URL
   * @param {string} canonicalUrl - Canonical URL to use
   */
  setCanonicalRule(pageUrl, canonicalUrl) {
    try {
      const normalizedPageUrl = this.normalizeUrl(pageUrl);
      const fullCanonicalUrl = urlUtils.buildAbsoluteUrl(canonicalUrl, this.baseUrl);
      
      this.canonicalRules.set(normalizedPageUrl, fullCanonicalUrl);
    } catch (error) {
      errorHandler.logError('CanonicalUrlManager.setCanonicalRule', error);
      throw error;
    }
  }

  /**
   * Remove canonical rule for a page
   * @param {string} pageUrl - Page URL
   */
  removeCanonicalRule(pageUrl) {
    try {
      const normalizedPageUrl = this.normalizeUrl(pageUrl);
      this.canonicalRules.delete(normalizedPageUrl);
    } catch (error) {
      errorHandler.logError('CanonicalUrlManager.removeCanonicalRule', error);
      throw error;
    }
  }

  /**
   * Add redirect rule for duplicate content prevention
   * @param {string} fromUrl - Source URL
   * @param {string} toUrl - Target URL
   * @param {number} statusCode - HTTP status code (301 or 302)
   */
  addRedirectRule(fromUrl, toUrl, statusCode = 301) {
    try {
      const normalizedFromUrl = this.normalizeUrl(fromUrl);
      const normalizedToUrl = this.normalizeUrl(toUrl);
      
      this.redirectRules.set(normalizedFromUrl, {
        target: normalizedToUrl,
        statusCode,
        createdAt: new Date()
      });
    } catch (error) {
      errorHandler.logError('CanonicalUrlManager.addRedirectRule', error);
      throw error;
    }
  }

  /**
   * Get redirect rule for a URL
   * @param {string} url - URL to check
   * @returns {Object|null} Redirect rule or null
   */
  getRedirectRule(url) {
    try {
      const normalizedUrl = this.normalizeUrl(url);
      return this.redirectRules.get(normalizedUrl) || null;
    } catch (error) {
      errorHandler.logError('CanonicalUrlManager.getRedirectRule', error);
      return null;
    }
  }

  /**
   * Inject canonical link tag into page head
   * @param {string} canonicalUrl - Canonical URL
   * @param {Document} document - Document object (optional, defaults to global document)
   */
  injectCanonicalTag(canonicalUrl, document = globalThis.document) {
    try {
      if (!document) {
        console.warn('Document object not available for canonical tag injection');
        return;
      }
      
      // Remove existing canonical tags
      const existingCanonical = document.querySelector('link[rel="canonical"]');
      if (existingCanonical) {
        existingCanonical.remove();
      }
      
      // Create new canonical tag
      const canonicalTag = document.createElement('link');
      canonicalTag.rel = 'canonical';
      canonicalTag.href = canonicalUrl;
      
      // Insert into head
      const head = document.head || document.getElementsByTagName('head')[0];
      if (head) {
        head.appendChild(canonicalTag);
      }
      
    } catch (error) {
      errorHandler.logError('CanonicalUrlManager.injectCanonicalTag', error);
      throw error;
    }
  }

  /**
   * Set up default canonical rules for the site
   */
  setupDefaultRules() {
    try {
      // Set up common canonical rules
      
      // Homepage variations
      this.setCanonicalRule('/index.html', '/');
      this.setCanonicalRule('/home', '/');
      this.setCanonicalRule('/home.html', '/');
      
      // Remove www variations (if applicable)
      // This would be handled at server level, but we can track the rules
      
      // Set up redirect rules for common duplicate content issues
      this.addRedirectRule('/index.html', '/', 301);
      
      // Handle trailing slash consistency
      // Most pages should not have trailing slashes except root
      
    } catch (error) {
      errorHandler.logError('CanonicalUrlManager.setupDefaultRules', error);
      throw error;
    }
  }

  /**
   * Validate canonical URL setup for a page
   * @param {string} pageUrl - Page URL to validate
   * @returns {Object} Validation result
   */
  validateCanonicalSetup(pageUrl) {
    try {
      const validation = {
        isValid: true,
        warnings: [],
        errors: [],
        canonicalUrl: null,
        redirectRule: null
      };
      
      // Generate canonical URL
      try {
        validation.canonicalUrl = this.generateCanonicalUrl(pageUrl);
      } catch (error) {
        validation.errors.push(`Failed to generate canonical URL: ${error.message}`);
        validation.isValid = false;
      }
      
      // Check for redirect rules
      validation.redirectRule = this.getRedirectRule(pageUrl);
      
      // Validate canonical URL format
      if (validation.canonicalUrl) {
        if (!urlUtils.isValidUrl(validation.canonicalUrl)) {
          validation.errors.push('Generated canonical URL is not valid');
          validation.isValid = false;
        }
        
        // Check if canonical URL is different from current URL
        const normalizedPageUrl = this.normalizeUrl(pageUrl);
        const normalizedCanonicalUrl = this.normalizeUrl(validation.canonicalUrl);
        
        if (normalizedPageUrl !== normalizedCanonicalUrl.replace(this.baseUrl, '')) {
          validation.warnings.push('Canonical URL differs from current URL');
        }
      }
      
      // Check for potential duplicate content issues
      const normalizedUrl = this.normalizeUrl(pageUrl);
      if (normalizedUrl !== pageUrl) {
        validation.warnings.push('URL normalization changed the original URL');
      }
      
      return validation;
    } catch (error) {
      errorHandler.logError('CanonicalUrlManager.validateCanonicalSetup', error);
      throw error;
    }
  }

  /**
   * Get statistics about canonical URL configuration
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      canonicalRules: this.canonicalRules.size,
      redirectRules: this.redirectRules.size,
      baseUrl: this.baseUrl,
      rules: {
        canonical: Array.from(this.canonicalRules.entries()),
        redirects: Array.from(this.redirectRules.entries())
      }
    };
  }

  /**
   * Export configuration for backup or transfer
   * @returns {Object} Configuration object
   */
  exportConfiguration() {
    return {
      baseUrl: this.baseUrl,
      canonicalRules: Object.fromEntries(this.canonicalRules),
      redirectRules: Object.fromEntries(this.redirectRules),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import configuration from backup
   * @param {Object} config - Configuration object
   */
  importConfiguration(config) {
    try {
      if (config.baseUrl) {
        this.baseUrl = config.baseUrl;
      }
      
      if (config.canonicalRules) {
        this.canonicalRules = new Map(Object.entries(config.canonicalRules));
      }
      
      if (config.redirectRules) {
        this.redirectRules = new Map(Object.entries(config.redirectRules));
      }
      
    } catch (error) {
      errorHandler.logError('CanonicalUrlManager.importConfiguration', error);
      throw error;
    }
  }
}

export { CanonicalUrlManager };