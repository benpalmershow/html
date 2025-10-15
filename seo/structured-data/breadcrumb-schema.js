/**
 * Breadcrumb Schema Generator
 * Generates BreadcrumbList schema markup for navigation context
 */

import SchemaGenerator from './schema-generator.js';
import { seoErrorHandler, safeExecute } from '../utils/error-handler.js';
import seoConfig from '../config/seo-config.js';

class BreadcrumbSchemaGenerator extends SchemaGenerator {
  constructor() {
    super();
    this.defaultBreadcrumbs = {
      'index': [{ name: 'Home', url: '/' }],
      'news': [
        { name: 'Home', url: '/' },
        { name: 'News', url: '/news.html' }
      ],
      'portfolio': [
        { name: 'Home', url: '/' },
        { name: 'Portfolio', url: '/portfolio.html' }
      ],
      'media': [
        { name: 'Home', url: '/' },
        { name: 'Media', url: '/media.html' }
      ],
      'journal': [
        { name: 'Home', url: '/' },
        { name: 'Journal', url: '/journal.html' }
      ]
    };
  }

  /**
   * Generate breadcrumb schema from navigation path
   * @param {Array<Object>} breadcrumbs - Array of breadcrumb objects {name, url}
   * @param {Object} options - Additional options
   * @returns {Object} BreadcrumbList schema object
   */
  generateFromPath(breadcrumbs, options = {}) {
    return safeExecute(() => {
      if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) {
        throw new Error('Breadcrumbs array is required and must not be empty');
      }

      const siteConfig = seoConfig.getSiteConfig();
      
      const itemListElement = breadcrumbs.map((breadcrumb, index) => {
        return this._createBreadcrumbItem(breadcrumb, index + 1, siteConfig);
      });

      const breadcrumbData = {
        itemListElement,
        numberOfItems: itemListElement.length
      };

      const schema = this.generateBaseSchema('BreadcrumbList', breadcrumbData);

      seoErrorHandler.logDebug('breadcrumb_schema', 'Generated breadcrumb schema', {
        itemCount: itemListElement.length,
        items: breadcrumbs.map(b => b.name)
      });

      return schema;
    }, 'generateBreadcrumbFromPath', {});
  }

  /**
   * Auto-detect breadcrumbs from current URL
   * @param {Object} options - Generation options
   * @returns {Object} BreadcrumbList schema object
   */
  generateFromCurrentUrl(options = {}) {
    return safeExecute(() => {
      const currentPath = window.location.pathname;
      const breadcrumbs = this._detectBreadcrumbsFromUrl(currentPath, options);
      
      return this.generateFromPath(breadcrumbs, options);
    }, 'generateBreadcrumbFromCurrentUrl', {});
  }

  /**
   * Generate breadcrumbs from existing navigation elements
   * @param {HTMLElement} navElement - Navigation element containing breadcrumbs
   * @param {Object} options - Generation options
   * @returns {Object} BreadcrumbList schema object
   */
  generateFromNavElement(navElement, options = {}) {
    return safeExecute(() => {
      if (!navElement) {
        throw new Error('Navigation element is required');
      }

      const breadcrumbs = this._extractBreadcrumbsFromNav(navElement, options);
      return this.generateFromPath(breadcrumbs, options);
    }, 'generateBreadcrumbFromNavElement', {});
  }

  /**
   * Generate breadcrumbs for specific page types
   * @param {string} pageType - Type of page (news, portfolio, media, journal)
   * @param {Object} options - Additional options including current item
   * @returns {Object} BreadcrumbList schema object
   */
  generateForPageType(pageType, options = {}) {
    return safeExecute(() => {
      let breadcrumbs = [...(this.defaultBreadcrumbs[pageType] || this.defaultBreadcrumbs['index'])];
      
      // Add current page if provided
      if (options.currentPage) {
        breadcrumbs.push({
          name: options.currentPage.name || options.currentPage.title,
          url: options.currentPage.url || window.location.href
        });
      }

      // Add category breadcrumb if provided
      if (options.category) {
        const categoryBreadcrumb = {
          name: options.category.name,
          url: options.category.url || `${breadcrumbs[breadcrumbs.length - 1].url}#${options.category.slug || options.category.name.toLowerCase()}`
        };
        
        // Insert category before current page
        if (options.currentPage) {
          breadcrumbs.splice(-1, 0, categoryBreadcrumb);
        } else {
          breadcrumbs.push(categoryBreadcrumb);
        }
      }

      return this.generateFromPath(breadcrumbs, options);
    }, 'generateBreadcrumbForPageType', {});
  }

  /**
   * Generate article breadcrumbs with category context
   * @param {Object} articleData - Article information
   * @param {Object} options - Generation options
   * @returns {Object} BreadcrumbList schema object
   */
  generateForArticle(articleData, options = {}) {
    return safeExecute(() => {
      const pageType = this._detectPageTypeFromUrl();
      let breadcrumbs = [...(this.defaultBreadcrumbs[pageType] || this.defaultBreadcrumbs['index'])];
      
      // Add category if provided
      if (articleData.category) {
        breadcrumbs.push({
          name: articleData.category,
          url: `${breadcrumbs[breadcrumbs.length - 1].url}#${articleData.category.toLowerCase().replace(/\s+/g, '-')}`
        });
      }
      
      // Add current article
      breadcrumbs.push({
        name: articleData.title || articleData.headline || 'Article',
        url: articleData.url || window.location.href
      });

      return this.generateFromPath(breadcrumbs, options);
    }, 'generateBreadcrumbForArticle', {});
  }

  /**
   * Inject breadcrumb schema into page
   * @param {Array<Object>|HTMLElement|string} source - Breadcrumb source
   * @param {Object} options - Generation and injection options
   * @returns {boolean} Success status
   */
  injectBreadcrumbSchema(source, options = {}) {
    return safeExecute(() => {
      let schema;
      
      if (Array.isArray(source)) {
        schema = this.generateFromPath(source, options);
      } else if (source instanceof HTMLElement) {
        schema = this.generateFromNavElement(source, options);
      } else if (typeof source === 'string') {
        schema = this.generateForPageType(source, options);
      } else {
        schema = this.generateFromCurrentUrl(options);
      }

      const schemaId = options.id || 'breadcrumb-schema';
      return this.injectSchema(schema, schemaId);
    }, 'injectBreadcrumbSchema', false);
  }

  /**
   * Update existing breadcrumb schema with new path
   * @param {Array<Object>} newBreadcrumbs - New breadcrumb path
   * @param {string} schemaId - ID of existing schema to update
   * @returns {boolean} Success status
   */
  updateBreadcrumbSchema(newBreadcrumbs, schemaId = 'breadcrumb-schema') {
    return safeExecute(() => {
      // Remove existing schema
      this.removeSchema(schemaId);
      
      // Generate and inject new schema
      const schema = this.generateFromPath(newBreadcrumbs);
      return this.injectSchema(schema, schemaId);
    }, 'updateBreadcrumbSchema', false);
  }

  /**
   * Create breadcrumb item for schema
   * @param {Object} breadcrumb - Breadcrumb data {name, url}
   * @param {number} position - Position in breadcrumb list
   * @param {Object} siteConfig - Site configuration
   * @returns {Object} Breadcrumb item schema object
   * @private
   */
  _createBreadcrumbItem(breadcrumb, position, siteConfig) {
    const url = this._normalizeUrl(breadcrumb.url, siteConfig);
    
    return {
      '@type': 'ListItem',
      position,
      name: breadcrumb.name,
      item: {
        '@type': 'WebPage',
        '@id': url,
        name: breadcrumb.name,
        url: url
      }
    };
  }

  /**
   * Normalize URL to absolute format
   * @param {string} url - URL to normalize
   * @param {Object} siteConfig - Site configuration
   * @returns {string} Normalized absolute URL
   * @private
   */
  _normalizeUrl(url, siteConfig) {
    if (!url) return siteConfig.url;
    
    if (url.startsWith('http')) {
      return url;
    }
    
    if (url.startsWith('/')) {
      return `${siteConfig.url}${url}`;
    }
    
    return `${siteConfig.url}/${url}`;
  }

  /**
   * Detect breadcrumbs from current URL path
   * @param {string} currentPath - Current URL path
   * @param {Object} options - Detection options
   * @returns {Array<Object>} Detected breadcrumbs
   * @private
   */
  _detectBreadcrumbsFromUrl(currentPath, options = {}) {
    // Remove file extension and leading/trailing slashes
    const cleanPath = currentPath.replace(/\.html$/, '').replace(/^\/|\/$/g, '');
    
    // Start with home
    const breadcrumbs = [{ name: 'Home', url: '/' }];
    
    if (!cleanPath || cleanPath === 'index') {
      return breadcrumbs;
    }
    
    // Split path into segments
    const segments = cleanPath.split('/').filter(segment => segment);
    
    segments.forEach((segment, index) => {
      const segmentPath = '/' + segments.slice(0, index + 1).join('/') + '.html';
      const segmentName = this._formatSegmentName(segment);
      
      breadcrumbs.push({
        name: segmentName,
        url: segmentPath
      });
    });
    
    return breadcrumbs;
  }

  /**
   * Extract breadcrumbs from navigation element
   * @param {HTMLElement} navElement - Navigation element
   * @param {Object} options - Extraction options
   * @returns {Array<Object>} Extracted breadcrumbs
   * @private
   */
  _extractBreadcrumbsFromNav(navElement, options = {}) {
    const breadcrumbs = [];
    
    // Look for common breadcrumb patterns
    const breadcrumbSelectors = [
      '.breadcrumb a, .breadcrumb span',
      '.breadcrumbs a, .breadcrumbs span',
      '[role="navigation"] a, [role="navigation"] span',
      'nav a, nav span'
    ];
    
    let breadcrumbElements = null;
    
    for (const selector of breadcrumbSelectors) {
      breadcrumbElements = navElement.querySelectorAll(selector);
      if (breadcrumbElements.length > 0) break;
    }
    
    if (!breadcrumbElements || breadcrumbElements.length === 0) {
      // Fallback to current URL detection
      return this._detectBreadcrumbsFromUrl(window.location.pathname, options);
    }
    
    Array.from(breadcrumbElements).forEach(element => {
      const name = element.textContent.trim();
      const url = element.href || element.getAttribute('data-url') || '#';
      
      if (name && name !== '>' && name !== '/' && name !== '»') {
        breadcrumbs.push({ name, url });
      }
    });
    
    return breadcrumbs.length > 0 ? breadcrumbs : this._detectBreadcrumbsFromUrl(window.location.pathname, options);
  }

  /**
   * Format URL segment into readable name
   * @param {string} segment - URL segment
   * @returns {string} Formatted name
   * @private
   */
  _formatSegmentName(segment) {
    return segment
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Detect page type from current URL
   * @returns {string} Detected page type
   * @private
   */
  _detectPageTypeFromUrl() {
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('news')) return 'news';
    if (path.includes('portfolio') || path.includes('financials')) return 'portfolio';
    if (path.includes('media')) return 'media';
    if (path.includes('journal')) return 'journal';
    
    return 'index';
  }

  /**
   * Set custom default breadcrumbs for page types
   * @param {string} pageType - Page type
   * @param {Array<Object>} breadcrumbs - Default breadcrumbs for the page type
   */
  setDefaultBreadcrumbs(pageType, breadcrumbs) {
    if (Array.isArray(breadcrumbs)) {
      this.defaultBreadcrumbs[pageType] = breadcrumbs;
      
      seoErrorHandler.logDebug('breadcrumb_config', `Set default breadcrumbs for ${pageType}`, {
        pageType,
        breadcrumbCount: breadcrumbs.length
      });
    }
  }

  /**
   * Get default breadcrumbs for a page type
   * @param {string} pageType - Page type
   * @returns {Array<Object>} Default breadcrumbs
   */
  getDefaultBreadcrumbs(pageType) {
    return [...(this.defaultBreadcrumbs[pageType] || this.defaultBreadcrumbs['index'])];
  }
}

export default BreadcrumbSchemaGenerator;