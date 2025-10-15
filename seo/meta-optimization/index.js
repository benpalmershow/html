/**
 * Meta Tag Optimization System
 * Main entry point for meta tag management and social media optimization
 */

import metaManager from './meta-manager.js';
import socialMetaGenerator from './social-meta.js';
import pageMetaConfig from './page-meta-config.js';
import { handleError } from '../utils/error-handler.js';
import { waitForDom } from '../utils/dom-utils.js';

class MetaOptimizationSystem {
  constructor() {
    this.initialized = false;
    this.currentPageType = null;
    this.currentConfig = null;
  }

  /**
   * Initialize the meta optimization system
   * @param {Object} options - Initialization options
   */
  async initialize(options = {}) {
    try {
      await waitForDom();
      
      // Detect page type
      this.currentPageType = this.detectPageType();
      
      // Auto-optimize if enabled
      if (options.autoOptimize !== false) {
        await this.optimizeCurrentPage(options);
      }
      
      this.initialized = true;
      console.log('Meta optimization system initialized for page type:', this.currentPageType);
      
    } catch (error) {
      handleError('MetaOptimizationSystem.initialize', error, { options });
    }
  }

  /**
   * Optimize the current page with meta tags
   * @param {Object} contentData - Page content data
   * @param {Object} options - Optimization options
   */
  async optimizeCurrentPage(contentData = {}, options = {}) {
    try {
      if (!this.currentPageType) {
        this.currentPageType = this.detectPageType();
      }
      
      // Get page-specific meta configuration
      this.currentConfig = pageMetaConfig.getPageMetaConfig(
        this.currentPageType,
        contentData,
        options
      );
      
      // Apply basic meta tags
      metaManager.setPageMeta(this.currentConfig, {
        includeSocial: options.includeSocial !== false
      });
      
      // Generate social media tags if enabled
      if (options.includeSocial !== false) {
        await this.optimizeSocialTags(this.currentConfig, options);
      }
      
      console.log('Page optimization complete for:', this.currentPageType);
      return this.currentConfig;
      
    } catch (error) {
      handleError('MetaOptimizationSystem.optimizeCurrentPage', error, { contentData, options });
      return null;
    }
  }

  /**
   * Optimize social media tags
   * @param {Object} config - Meta configuration
   * @param {Object} options - Optimization options
   */
  async optimizeSocialTags(config, options = {}) {
    try {
      // Generate Open Graph tags
      if (options.includeOpenGraph !== false) {
        socialMetaGenerator.generateOpenGraphTags(config, options);
      }
      
      // Generate Twitter Card tags
      if (options.includeTwitterCards !== false) {
        socialMetaGenerator.generateTwitterCardTags(config, options);
      }
      
    } catch (error) {
      handleError('MetaOptimizationSystem.optimizeSocialTags', error, { config, options });
    }
  }

  /**
   * Update meta tags for dynamic content
   * @param {Object} contentData - New content data
   * @param {Object} options - Update options
   */
  async updateMetaTags(contentData, options = {}) {
    try {
      // Merge with existing config
      const updatedConfig = {
        ...this.currentConfig,
        ...contentData
      };
      
      // Re-optimize with new data
      await this.optimizeCurrentPage(updatedConfig, options);
      
    } catch (error) {
      handleError('MetaOptimizationSystem.updateMetaTags', error, { contentData, options });
    }
  }

  /**
   * Optimize meta tags for article content
   * @param {Object} articleData - Article-specific data
   * @param {Object} options - Optimization options
   */
  async optimizeArticle(articleData, options = {}) {
    try {
      const articleConfig = {
        ...articleData,
        ogType: 'article',
        pageType: 'article'
      };
      
      // Set page type for article optimization
      this.currentPageType = 'article';
      
      await this.optimizeCurrentPage(articleConfig, options);
      
    } catch (error) {
      handleError('MetaOptimizationSystem.optimizeArticle', error, { articleData, options });
    }
  }

  /**
   * Optimize meta tags for news content
   * @param {Object} newsData - News-specific data
   * @param {Object} options - Optimization options
   */
  async optimizeNews(newsData, options = {}) {
    try {
      const newsConfig = {
        ...newsData,
        pageType: 'news'
      };
      
      this.currentPageType = 'news';
      await this.optimizeCurrentPage(newsConfig, options);
      
    } catch (error) {
      handleError('MetaOptimizationSystem.optimizeNews', error, { newsData, options });
    }
  }

  /**
   * Optimize meta tags for portfolio content
   * @param {Object} portfolioData - Portfolio-specific data
   * @param {Object} options - Optimization options
   */
  async optimizePortfolio(portfolioData, options = {}) {
    try {
      const portfolioConfig = {
        ...portfolioData,
        pageType: 'portfolio'
      };
      
      this.currentPageType = 'portfolio';
      await this.optimizeCurrentPage(portfolioConfig, options);
      
    } catch (error) {
      handleError('MetaOptimizationSystem.optimizePortfolio', error, { portfolioData, options });
    }
  }

  /**
   * Optimize meta tags for media content
   * @param {Object} mediaData - Media-specific data
   * @param {Object} options - Optimization options
   */
  async optimizeMedia(mediaData, options = {}) {
    try {
      const mediaConfig = {
        ...mediaData,
        pageType: 'media'
      };
      
      this.currentPageType = 'media';
      await this.optimizeCurrentPage(mediaConfig, options);
      
    } catch (error) {
      handleError('MetaOptimizationSystem.optimizeMedia', error, { mediaData, options });
    }
  }

  /**
   * Detect current page type based on URL and DOM
   * @returns {string} Detected page type
   */
  detectPageType() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    // Map filenames to page types
    const pageTypeMap = {
      'index.html': 'homepage',
      '': 'homepage',
      'news.html': 'news',
      'portfolio.html': 'portfolio',
      'media.html': 'media',
      'journal.html': 'journal',
      'read.html': 'read'
    };
    
    // Check for article pages in the article directory
    if (path.includes('/article/')) {
      return 'article';
    }
    
    // Check for specific page indicators in DOM
    if (document.querySelector('article')) {
      return 'article';
    }
    
    if (document.querySelector('.news-container, .news-feed')) {
      return 'news';
    }
    
    if (document.querySelector('.portfolio-container, .financials')) {
      return 'portfolio';
    }
    
    if (document.querySelector('.media-container, .media-grid')) {
      return 'media';
    }
    
    if (document.querySelector('.journal-container, .journal-feed')) {
      return 'journal';
    }
    
    // Fallback to filename mapping
    return pageTypeMap[filename] || 'homepage';
  }

  /**
   * Get current meta configuration
   * @returns {Object|null} Current configuration
   */
  getCurrentConfig() {
    return this.currentConfig;
  }

  /**
   * Get current page type
   * @returns {string|null} Current page type
   */
  getCurrentPageType() {
    return this.currentPageType;
  }

  /**
   * Check if system is initialized
   * @returns {boolean} Initialization status
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Reset the meta optimization system
   */
  reset() {
    try {
      metaManager.clearAllMeta();
      this.currentConfig = null;
      this.currentPageType = null;
      this.initialized = false;
      
    } catch (error) {
      handleError('MetaOptimizationSystem.reset', error);
    }
  }

  /**
   * Get system status and diagnostics
   * @returns {Object} System status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      pageType: this.currentPageType,
      hasConfig: !!this.currentConfig,
      metaManagerStatus: metaManager.getStatus(),
      configSummary: this.currentConfig ? {
        title: this.currentConfig.title,
        description: this.currentConfig.description?.substring(0, 50) + '...',
        keywords: this.currentConfig.keywords?.length || 0,
        ogType: this.currentConfig.ogType
      } : null
    };
  }
}

// Create and export singleton instance
const metaOptimization = new MetaOptimizationSystem();

// Auto-initialize when DOM is ready (can be disabled with options)
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Check for auto-init disable flag
    if (!window.SEO_DISABLE_AUTO_INIT) {
      metaOptimization.initialize();
    }
  });
}

// Export individual components for direct access
export {
  metaManager,
  socialMetaGenerator,
  pageMetaConfig,
  metaOptimization as default
};

// Also export as named export for convenience
export { metaOptimization };