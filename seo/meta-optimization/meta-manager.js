/**
 * Meta Tag Manager
 * Handles dynamic meta tag generation, validation, and conflict resolution
 */

import { injectMetaTag, injectOgTag, injectTwitterTag, setCanonicalUrl, setPageTitle, setRobotsDirectives } from '../utils/dom-utils.js';
import { validateUrl, normalizeUrl } from '../utils/url-utils.js';
import { handleError } from '../utils/error-handler.js';
import seoConfig from '../config/seo-config.js';

class MetaManager {
  constructor() {
    this.injectedTags = new Set();
    this.tagPriorities = new Map();
    this.validationRules = {
      title: { maxLength: 60, minLength: 10 },
      description: { maxLength: 160, minLength: 50 },
      keywords: { maxCount: 10, minCount: 1 }
    };
  }

  /**
   * Set page meta tags based on configuration
   * @param {Object} pageConfig - Page configuration object
   * @param {Object} options - Additional options
   */
  setPageMeta(pageConfig, options = {}) {
    try {
      const config = this.mergeWithDefaults(pageConfig);
      
      // Validate configuration
      if (!this.validatePageConfig(config)) {
        throw new Error('Invalid page configuration provided');
      }

      // Set basic meta tags
      this.setTitle(config.title);
      this.setDescription(config.description);
      this.setKeywords(config.keywords);
      
      // Set canonical URL
      if (config.canonicalUrl) {
        this.setCanonicalUrl(config.canonicalUrl);
      }
      
      // Set robots directives
      if (config.robots) {
        this.setRobots(config.robots);
      }
      
      // Set viewport if specified
      if (config.viewport) {
        this.setViewport(config.viewport);
      }
      
      // Generate social media tags if enabled
      if (options.includeSocial !== false) {
        this.generateSocialTags(config);
      }
      
      // Track successful injection
      this.injectedTags.add('basic-meta');
      
    } catch (error) {
      handleError('MetaManager.setPageMeta', error, { pageConfig, options });
    }
  }

  /**
   * Set page title with validation
   * @param {string} title - Page title
   */
  setTitle(title) {
    if (!title || typeof title !== 'string') {
      console.warn('Invalid title provided to MetaManager');
      return;
    }

    const validatedTitle = this.validateAndTruncateTitle(title);
    setPageTitle(validatedTitle);
    this.injectedTags.add('title');
  }

  /**
   * Set meta description with validation
   * @param {string} description - Meta description
   */
  setDescription(description) {
    if (!description || typeof description !== 'string') {
      console.warn('Invalid description provided to MetaManager');
      return;
    }

    const validatedDescription = this.validateAndTruncateDescription(description);
    injectMetaTag('description', validatedDescription);
    this.injectedTags.add('description');
  }

  /**
   * Set meta keywords
   * @param {Array|string} keywords - Keywords array or comma-separated string
   */
  setKeywords(keywords) {
    if (!keywords) return;

    let keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
    
    // Validate and limit keywords
    keywordArray = this.validateKeywords(keywordArray);
    
    if (keywordArray.length > 0) {
      injectMetaTag('keywords', keywordArray.join(', '));
      this.injectedTags.add('keywords');
    }
  }

  /**
   * Set canonical URL with validation
   * @param {string} url - Canonical URL
   */
  setCanonicalUrl(url) {
    if (!url || !validateUrl(url)) {
      console.warn('Invalid canonical URL provided to MetaManager');
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    setCanonicalUrl(normalizedUrl);
    this.injectedTags.add('canonical');
  }

  /**
   * Set robots meta tag
   * @param {string} directives - Robots directives
   */
  setRobots(directives) {
    if (!directives || typeof directives !== 'string') {
      console.warn('Invalid robots directives provided to MetaManager');
      return;
    }

    setRobotsDirectives(directives);
    this.injectedTags.add('robots');
  }

  /**
   * Set viewport meta tag
   * @param {string} viewport - Viewport content
   */
  setViewport(viewport) {
    if (!viewport || typeof viewport !== 'string') {
      console.warn('Invalid viewport content provided to MetaManager');
      return;
    }

    injectMetaTag('viewport', viewport);
    this.injectedTags.add('viewport');
  }

  /**
   * Generate social media meta tags
   * @param {Object} config - Page configuration
   */
  generateSocialTags(config) {
    try {
      // Generate Open Graph tags
      this.generateOpenGraphTags(config);
      
      // Generate Twitter Card tags
      this.generateTwitterCardTags(config);
      
      this.injectedTags.add('social-tags');
    } catch (error) {
      handleError('MetaManager.generateSocialTags', error, { config });
    }
  }

  /**
   * Generate Open Graph meta tags
   * @param {Object} config - Page configuration
   */
  generateOpenGraphTags(config) {
    const siteConfig = seoConfig.getSiteConfig();
    
    // Basic Open Graph tags
    injectOgTag('og:type', config.ogType || 'website');
    injectOgTag('og:title', config.title);
    injectOgTag('og:description', config.description);
    injectOgTag('og:url', config.canonicalUrl || window.location.href);
    injectOgTag('og:site_name', siteConfig.name);
    
    // Image handling
    if (config.ogImage) {
      const imageUrl = this.resolveImageUrl(config.ogImage);
      injectOgTag('og:image', imageUrl);
      
      if (config.ogImageAlt) {
        injectOgTag('og:image:alt', config.ogImageAlt);
      }
      
      // Optional image dimensions
      if (config.ogImageWidth) {
        injectOgTag('og:image:width', config.ogImageWidth.toString());
      }
      if (config.ogImageHeight) {
        injectOgTag('og:image:height', config.ogImageHeight.toString());
      }
    }
    
    // Article-specific Open Graph tags
    if (config.ogType === 'article') {
      if (config.author) {
        injectOgTag('article:author', config.author);
      }
      if (config.publishedTime) {
        injectOgTag('article:published_time', config.publishedTime);
      }
      if (config.modifiedTime) {
        injectOgTag('article:modified_time', config.modifiedTime);
      }
      if (config.section) {
        injectOgTag('article:section', config.section);
      }
      if (config.tags && Array.isArray(config.tags)) {
        config.tags.forEach(tag => {
          injectOgTag('article:tag', tag);
        });
      }
    }
    
    this.injectedTags.add('open-graph');
  }

  /**
   * Generate Twitter Card meta tags
   * @param {Object} config - Page configuration
   */
  generateTwitterCardTags(config) {
    const siteConfig = seoConfig.getSiteConfig();
    
    // Determine card type
    const cardType = this.determineTwitterCardType(config);
    injectTwitterTag('twitter:card', cardType);
    
    // Basic Twitter tags
    injectTwitterTag('twitter:title', config.title);
    injectTwitterTag('twitter:description', config.description);
    
    // Site and creator
    if (siteConfig.social && siteConfig.social.twitter) {
      injectTwitterTag('twitter:site', siteConfig.social.twitter);
      injectTwitterTag('twitter:creator', siteConfig.social.twitter);
    }
    
    // Image handling
    if (config.twitterImage || config.ogImage) {
      const imageUrl = this.resolveImageUrl(config.twitterImage || config.ogImage);
      injectTwitterTag('twitter:image', imageUrl);
      
      if (config.twitterImageAlt || config.ogImageAlt) {
        injectTwitterTag('twitter:image:alt', config.twitterImageAlt || config.ogImageAlt);
      }
    }
    
    // App-specific tags (if applicable)
    if (config.twitterApp) {
      if (config.twitterApp.iphone) {
        injectTwitterTag('twitter:app:name:iphone', config.twitterApp.iphone.name);
        injectTwitterTag('twitter:app:id:iphone', config.twitterApp.iphone.id);
      }
      if (config.twitterApp.googleplay) {
        injectTwitterTag('twitter:app:name:googleplay', config.twitterApp.googleplay.name);
        injectTwitterTag('twitter:app:id:googleplay', config.twitterApp.googleplay.id);
      }
    }
    
    this.injectedTags.add('twitter-cards');
  }

  /**
   * Determine appropriate Twitter Card type based on content
   * @param {Object} config - Page configuration
   * @returns {string} Twitter Card type
   */
  determineTwitterCardType(config) {
    // If explicitly set, use that
    if (config.twitterCard) {
      return config.twitterCard;
    }
    
    // If there's a video, use player card
    if (config.video || config.twitterPlayer) {
      return 'player';
    }
    
    // If there's an app, use app card
    if (config.twitterApp) {
      return 'app';
    }
    
    // If there's an image, use summary_large_image
    if (config.ogImage || config.twitterImage) {
      return 'summary_large_image';
    }
    
    // Default to summary
    return 'summary';
  }

  /**
   * Resolve image URL to absolute URL
   * @param {string} imageUrl - Image URL (relative or absolute)
   * @returns {string} Absolute image URL
   */
  resolveImageUrl(imageUrl) {
    if (!imageUrl) return '';
    
    // If already absolute, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Convert relative URL to absolute
    const baseUrl = window.location.origin;
    return imageUrl.startsWith('/') ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
  }

  /**
   * Merge page config with defaults
   * @param {Object} pageConfig - Page-specific configuration
   * @returns {Object} Merged configuration
   */
  mergeWithDefaults(pageConfig) {
    const siteConfig = seoConfig.getSiteConfig();
    const defaults = seoConfig.getDefaults();
    
    return {
      ...defaults,
      ...siteConfig,
      ...pageConfig,
      canonicalUrl: pageConfig.canonicalUrl || window.location.href
    };
  }

  /**
   * Validate page configuration
   * @param {Object} config - Configuration to validate
   * @returns {boolean} Validation result
   */
  validatePageConfig(config) {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Check required fields
    if (!config.title || !config.description) {
      console.warn('Title and description are required for page meta');
      return false;
    }

    // Validate title length
    if (config.title.length > this.validationRules.title.maxLength) {
      console.warn(`Title exceeds maximum length of ${this.validationRules.title.maxLength} characters`);
    }

    // Validate description length
    if (config.description.length > this.validationRules.description.maxLength) {
      console.warn(`Description exceeds maximum length of ${this.validationRules.description.maxLength} characters`);
    }

    return true;
  }

  /**
   * Validate and truncate title if necessary
   * @param {string} title - Title to validate
   * @returns {string} Validated title
   */
  validateAndTruncateTitle(title) {
    const maxLength = this.validationRules.title.maxLength;
    
    if (title.length <= maxLength) {
      return title;
    }
    
    // Truncate at word boundary
    const truncated = title.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated.substring(0, maxLength - 3) + '...';
  }

  /**
   * Validate and truncate description if necessary
   * @param {string} description - Description to validate
   * @returns {string} Validated description
   */
  validateAndTruncateDescription(description) {
    const maxLength = this.validationRules.description.maxLength;
    
    if (description.length <= maxLength) {
      return description;
    }
    
    // Truncate at word boundary
    const truncated = description.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated.substring(0, maxLength - 3) + '...';
  }

  /**
   * Validate keywords array
   * @param {Array} keywords - Keywords to validate
   * @returns {Array} Validated keywords
   */
  validateKeywords(keywords) {
    if (!Array.isArray(keywords)) {
      return [];
    }
    
    return keywords
      .filter(keyword => keyword && typeof keyword === 'string')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
      .slice(0, this.validationRules.keywords.maxCount);
  }

  /**
   * Detect and resolve meta tag conflicts
   * @param {string} tagName - Meta tag name
   * @param {string} newContent - New content
   * @param {number} priority - Tag priority (higher = more important)
   */
  resolveTagConflict(tagName, newContent, priority = 1) {
    const existingPriority = this.tagPriorities.get(tagName) || 0;
    
    if (priority >= existingPriority) {
      this.tagPriorities.set(tagName, priority);
      return true; // Allow injection
    }
    
    console.warn(`Meta tag conflict detected for ${tagName}. Existing priority: ${existingPriority}, New priority: ${priority}`);
    return false; // Block injection
  }

  /**
   * Clear all injected meta tags
   */
  clearAllMeta() {
    // Remove all meta tags we've injected
    const metaTags = document.querySelectorAll('meta[data-seo-injected="true"]');
    metaTags.forEach(tag => tag.remove());
    
    // Clear tracking
    this.injectedTags.clear();
    this.tagPriorities.clear();
  }

  /**
   * Get status of injected tags
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      injectedTags: Array.from(this.injectedTags),
      tagCount: this.injectedTags.size,
      priorities: Object.fromEntries(this.tagPriorities)
    };
  }

  /**
   * Update meta tag with conflict resolution
   * @param {string} name - Meta tag name
   * @param {string} content - Meta tag content
   * @param {string} type - Meta tag type
   * @param {number} priority - Tag priority
   */
  updateMetaTag(name, content, type = 'name', priority = 1) {
    if (this.resolveTagConflict(name, content, priority)) {
      injectMetaTag(name, content, type);
      
      // Mark as SEO-injected for tracking
      const tag = document.querySelector(`meta[${type}="${name}"]`);
      if (tag) {
        tag.setAttribute('data-seo-injected', 'true');
      }
    }
  }
}

// Export singleton instance
const metaManager = new MetaManager();
export default metaManager;