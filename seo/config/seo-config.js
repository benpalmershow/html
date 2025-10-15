/**
 * SEO Configuration Manager
 * Manages site-wide and page-specific SEO settings
 */

class SEOConfig {
  constructor() {
    this.siteConfig = {
      name: 'Howdy, Stranger',
      description: 'Independent commentary, news, and economic insight',
      url: 'https://howdystranger.net',
      logo: '/images/logo.png',
      author: 'Ben Palmer',
      social: {
        twitter: '@docriter'
      }
    };

    this.defaults = {
      titleSuffix: ' - Howdy, Stranger',
      ogImage: '/images/og-default.jpg',
      twitterCard: 'summary_large_image',
      maxTitleLength: 60,
      maxDescriptionLength: 160
    };

    this.pageConfigs = {
      'index': {
        title: 'Howdy, Stranger - Independent Commentary & Economic Insight',
        description: 'Human-curated content, independent commentary, news, and economic insight from The Ben Palmer Show.',
        keywords: ['economic analysis', 'independent commentary', 'financial news', 'market insights'],
        ogImage: '/images/og-homepage.jpg'
      },
      'news': {
        title: 'Latest News & Market Analysis - Howdy, Stranger',
        description: 'Breaking news, earnings reports, policy analysis, and legal commentary with independent perspective.',
        keywords: ['breaking news', 'market analysis', 'earnings reports', 'policy analysis'],
        ogImage: '/images/og-news.jpg'
      },
      'portfolio': {
        title: 'Investment Portfolio & Financial Analysis - Howdy, Stranger',
        description: 'Track investment performance, financial data, and market analysis with detailed portfolio insights.',
        keywords: ['investment portfolio', 'financial analysis', 'market data', 'investment tracking'],
        ogImage: '/images/og-portfolio.jpg'
      },
      'media': {
        title: 'Media & Content Library - Howdy, Stranger',
        description: 'Explore our media library featuring podcasts, videos, and multimedia content on economics and finance.',
        keywords: ['media library', 'podcasts', 'financial videos', 'economic content'],
        ogImage: '/images/og-media.jpg'
      },
      'journal': {
        title: 'Journal & Blog Posts - Howdy, Stranger',
        description: 'Read the latest journal entries and blog posts covering economic trends, market analysis, and commentary.',
        keywords: ['journal', 'blog posts', 'economic trends', 'market commentary'],
        ogImage: '/images/og-journal.jpg'
      }
    };
  }

  /**
   * Get site-wide configuration
   * @returns {Object} Site configuration object
   */
  getSiteConfig() {
    return { ...this.siteConfig };
  }

  /**
   * Get default SEO settings
   * @returns {Object} Default settings object
   */
  getDefaults() {
    return { ...this.defaults };
  }

  /**
   * Get page-specific configuration
   * @param {string} pageKey - Page identifier
   * @returns {Object} Page configuration object
   */
  getPageConfig(pageKey) {
    const config = this.pageConfigs[pageKey] || {};
    return {
      ...config,
      title: config.title || `${pageKey.charAt(0).toUpperCase() + pageKey.slice(1)}${this.defaults.titleSuffix}`,
      description: config.description || this.siteConfig.description,
      ogImage: config.ogImage || this.defaults.ogImage
    };
  }

  /**
   * Set page-specific configuration
   * @param {string} pageKey - Page identifier
   * @param {Object} config - Configuration object
   */
  setPageConfig(pageKey, config) {
    if (this.validatePageConfig(config)) {
      this.pageConfigs[pageKey] = { ...config };
    } else {
      throw new Error(`Invalid page configuration for ${pageKey}`);
    }
  }

  /**
   * Update site configuration
   * @param {Object} config - Site configuration updates
   */
  updateSiteConfig(config) {
    if (this.validateSiteConfig(config)) {
      this.siteConfig = { ...this.siteConfig, ...config };
    } else {
      throw new Error('Invalid site configuration');
    }
  }

  /**
   * Validate site configuration
   * @param {Object} config - Configuration to validate
   * @returns {boolean} Validation result
   */
  validateSiteConfig(config) {
    const required = ['name', 'description', 'url'];
    return required.every(field => config[field] && typeof config[field] === 'string');
  }

  /**
   * Validate page configuration
   * @param {Object} config - Page configuration to validate
   * @returns {boolean} Validation result
   */
  validatePageConfig(config) {
    if (!config || typeof config !== 'object') return false;

    // Validate title length
    if (config.title && config.title.length > this.defaults.maxTitleLength) {
      console.warn(`Title exceeds maximum length of ${this.defaults.maxTitleLength} characters`);
      return false;
    }

    // Validate description length
    if (config.description && config.description.length > this.defaults.maxDescriptionLength) {
      console.warn(`Description exceeds maximum length of ${this.defaults.maxDescriptionLength} characters`);
      return false;
    }

    // Validate keywords array
    if (config.keywords && !Array.isArray(config.keywords)) {
      console.warn('Keywords must be an array');
      return false;
    }

    return true;
  }

  /**
   * Get complete configuration for a page
   * @param {string} pageKey - Page identifier
   * @returns {Object} Complete page configuration
   */
  getCompletePageConfig(pageKey) {
    const pageConfig = this.getPageConfig(pageKey);
    const siteConfig = this.getSiteConfig();
    const defaults = this.getDefaults();

    return {
      ...defaults,
      ...siteConfig,
      ...pageConfig,
      pageKey
    };
  }
}

// Export singleton instance
const seoConfig = new SEOConfig();
export default seoConfig;