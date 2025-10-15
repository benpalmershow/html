/**
 * Page-Specific Meta Configuration System
 * Manages dynamic meta tag generation for different page types
 */

import { extractContentMetadata } from '../utils/content-utils.js';
import { normalizeUrl } from '../utils/url-utils.js';
import { handleError } from '../utils/error-handler.js';
import seoConfig from '../config/seo-config.js';

class PageMetaConfig {
  constructor() {
    this.pageTemplates = {
      homepage: this.getHomepageTemplate(),
      news: this.getNewsTemplate(),
      portfolio: this.getPortfolioTemplate(),
      media: this.getMediaTemplate(),
      journal: this.getJournalTemplate(),
      article: this.getArticleTemplate(),
      read: this.getReadTemplate()
    };
    
    this.dynamicGenerators = {
      title: this.generateDynamicTitle.bind(this),
      description: this.generateDynamicDescription.bind(this),
      keywords: this.generateDynamicKeywords.bind(this),
      ogImage: this.generateDynamicOgImage.bind(this)
    };
  }

  /**
   * Get complete meta configuration for a page
   * @param {string} pageType - Type of page (homepage, news, etc.)
   * @param {Object} contentData - Dynamic content data
   * @param {Object} options - Additional options
   * @returns {Object} Complete meta configuration
   */
  getPageMetaConfig(pageType, contentData = {}, options = {}) {
    try {
      // Get base template
      const template = this.getPageTemplate(pageType);
      
      // Extract content metadata
      const extractedMeta = extractContentMetadata();
      
      // Generate dynamic values
      const dynamicMeta = this.generateDynamicMeta(pageType, contentData, extractedMeta);
      
      // Merge configurations with priority: contentData > dynamic > template > defaults
      const config = {
        ...template,
        ...dynamicMeta,
        ...contentData,
        pageType,
        canonicalUrl: contentData.canonicalUrl || normalizeUrl(window.location.href)
      };
      
      // Apply keyword optimization
      config.keywords = this.optimizeKeywords(config.keywords, pageType, contentData);
      
      // Validate and optimize lengths
      config.title = this.optimizeTitle(config.title, pageType);
      config.description = this.optimizeDescription(config.description, pageType);
      
      return config;
    } catch (error) {
      handleError('PageMetaConfig.getPageMetaConfig', error, { pageType, contentData, options });
      return this.getFallbackConfig(pageType);
    }
  }

  /**
   * Get page template by type
   * @param {string} pageType - Page type
   * @returns {Object} Page template
   */
  getPageTemplate(pageType) {
    return this.pageTemplates[pageType] || this.pageTemplates.homepage;
  }

  /**
   * Homepage meta template
   * @returns {Object} Homepage meta configuration
   */
  getHomepageTemplate() {
    const siteConfig = seoConfig.getSiteConfig();
    
    return {
      title: 'Howdy, Stranger - Independent Commentary & Economic Insight',
      description: 'Human-curated content, independent commentary, news, and economic insight from The Ben Palmer Show. Get unbiased analysis on markets, policy, and current events.',
      keywords: [
        'economic analysis', 'independent commentary', 'financial news', 'market insights',
        'Ben Palmer Show', 'economic commentary', 'financial analysis', 'market trends',
        'investment insights', 'policy analysis'
      ],
      ogType: 'website',
      ogImage: '/images/og-homepage.jpg',
      ogImageAlt: 'Howdy, Stranger - Independent Economic Commentary',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      priority: 1.0,
      changefreq: 'daily'
    };
  }

  /**
   * News page meta template
   * @returns {Object} News page meta configuration
   */
  getNewsTemplate() {
    return {
      title: 'Latest News & Market Analysis - Howdy, Stranger',
      description: 'Breaking news, earnings reports, policy analysis, and legal commentary with independent perspective. Stay informed with curated financial and economic news.',
      keywords: [
        'breaking news', 'market analysis', 'earnings reports', 'policy analysis',
        'financial news', 'economic news', 'legal commentary', 'market updates',
        'business news', 'investment news'
      ],
      ogType: 'website',
      ogImage: '/images/og-news.jpg',
      ogImageAlt: 'Latest News and Market Analysis',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      priority: 0.9,
      changefreq: 'hourly'
    };
  }

  /**
   * Portfolio page meta template
   * @returns {Object} Portfolio page meta configuration
   */
  getPortfolioTemplate() {
    return {
      title: 'Investment Portfolio & Financial Analysis - Howdy, Stranger',
      description: 'Track investment performance, financial data, and market analysis with detailed portfolio insights. Transparent investment tracking and performance metrics.',
      keywords: [
        'investment portfolio', 'financial analysis', 'market data', 'investment tracking',
        'portfolio performance', 'financial metrics', 'investment returns', 'asset allocation',
        'financial planning', 'investment strategy'
      ],
      ogType: 'website',
      ogImage: '/images/og-portfolio.jpg',
      ogImageAlt: 'Investment Portfolio and Financial Analysis',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      priority: 0.8,
      changefreq: 'daily'
    };
  }

  /**
   * Media page meta template
   * @returns {Object} Media page meta configuration
   */
  getMediaTemplate() {
    return {
      title: 'Media & Content Library - Howdy, Stranger',
      description: 'Explore our media library featuring podcasts, videos, and multimedia content on economics and finance. Educational content for informed decision-making.',
      keywords: [
        'media library', 'podcasts', 'financial videos', 'economic content',
        'educational content', 'financial education', 'investment education', 'market education',
        'Ben Palmer Show podcast', 'financial media'
      ],
      ogType: 'website',
      ogImage: '/images/og-media.jpg',
      ogImageAlt: 'Media and Content Library',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      priority: 0.7,
      changefreq: 'weekly'
    };
  }

  /**
   * Journal page meta template
   * @returns {Object} Journal page meta configuration
   */
  getJournalTemplate() {
    return {
      title: 'Journal & Blog Posts - Howdy, Stranger',
      description: 'Read the latest journal entries and blog posts covering economic trends, market analysis, and commentary. In-depth analysis and personal insights.',
      keywords: [
        'journal', 'blog posts', 'economic trends', 'market commentary',
        'financial blog', 'economic blog', 'investment blog', 'market insights',
        'economic analysis', 'financial commentary'
      ],
      ogType: 'website',
      ogImage: '/images/og-journal.jpg',
      ogImageAlt: 'Journal and Blog Posts',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      priority: 0.8,
      changefreq: 'weekly'
    };
  }

  /**
   * Article page meta template
   * @returns {Object} Article page meta configuration
   */
  getArticleTemplate() {
    return {
      title: '{articleTitle} - Howdy, Stranger',
      description: '{articleExcerpt}',
      keywords: [
        'article', 'analysis', 'commentary', 'economic analysis',
        'financial analysis', 'market analysis', 'investment analysis'
      ],
      ogType: 'article',
      ogImage: '{articleImage}',
      ogImageAlt: '{articleTitle}',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      priority: 0.6,
      changefreq: 'monthly',
      // Article-specific properties
      author: 'Ben Palmer',
      section: 'Analysis',
      publishedTime: '{publishedDate}',
      modifiedTime: '{modifiedDate}'
    };
  }

  /**
   * Read page meta template
   * @returns {Object} Read page meta configuration
   */
  getReadTemplate() {
    return {
      title: 'Read - Curated Content & Analysis - Howdy, Stranger',
      description: 'Discover curated articles, analysis, and commentary on economics, finance, and current events. Quality content for informed readers.',
      keywords: [
        'curated content', 'reading list', 'articles', 'analysis',
        'economic articles', 'financial articles', 'market analysis', 'commentary',
        'recommended reading', 'financial literacy'
      ],
      ogType: 'website',
      ogImage: '/images/og-read.jpg',
      ogImageAlt: 'Curated Content and Analysis',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      priority: 0.7,
      changefreq: 'weekly'
    };
  }

  /**
   * Generate dynamic meta values
   * @param {string} pageType - Page type
   * @param {Object} contentData - Content data
   * @param {Object} extractedMeta - Extracted metadata
   * @returns {Object} Dynamic meta values
   */
  generateDynamicMeta(pageType, contentData, extractedMeta) {
    const dynamicMeta = {};
    
    // Generate dynamic title
    if (!contentData.title) {
      dynamicMeta.title = this.generateDynamicTitle(pageType, contentData, extractedMeta);
    }
    
    // Generate dynamic description
    if (!contentData.description) {
      dynamicMeta.description = this.generateDynamicDescription(pageType, contentData, extractedMeta);
    }
    
    // Generate dynamic keywords
    if (!contentData.keywords) {
      dynamicMeta.keywords = this.generateDynamicKeywords(pageType, contentData, extractedMeta);
    }
    
    // Generate dynamic OG image
    if (!contentData.ogImage) {
      dynamicMeta.ogImage = this.generateDynamicOgImage(pageType, contentData, extractedMeta);
    }
    
    return dynamicMeta;
  }

  /**
   * Generate dynamic title based on content
   * @param {string} pageType - Page type
   * @param {Object} contentData - Content data
   * @param {Object} extractedMeta - Extracted metadata
   * @returns {string} Generated title
   */
  generateDynamicTitle(pageType, contentData, extractedMeta) {
    const siteConfig = seoConfig.getSiteConfig();
    const siteName = siteConfig.name;
    
    // Use extracted title if available
    if (extractedMeta.title && extractedMeta.title !== document.title) {
      return `${extractedMeta.title} - ${siteName}`;
    }
    
    // Generate based on page type and content
    switch (pageType) {
      case 'article':
        if (contentData.headline || contentData.title) {
          return `${contentData.headline || contentData.title} - ${siteName}`;
        }
        break;
        
      case 'news':
        const newsCount = this.getNewsCount();
        if (newsCount > 0) {
          return `Latest News (${newsCount} Updates) - ${siteName}`;
        }
        break;
        
      case 'portfolio':
        const portfolioValue = this.getPortfolioValue();
        if (portfolioValue) {
          return `Investment Portfolio ($${portfolioValue}) - ${siteName}`;
        }
        break;
        
      case 'media':
        const mediaCount = this.getMediaCount();
        if (mediaCount > 0) {
          return `Media Library (${mediaCount} Items) - ${siteName}`;
        }
        break;
    }
    
    // Fallback to template
    const template = this.getPageTemplate(pageType);
    return template.title;
  }

  /**
   * Generate dynamic description based on content
   * @param {string} pageType - Page type
   * @param {Object} contentData - Content data
   * @param {Object} extractedMeta - Extracted metadata
   * @returns {string} Generated description
   */
  generateDynamicDescription(pageType, contentData, extractedMeta) {
    // Use extracted description if available
    if (extractedMeta.description) {
      return extractedMeta.description;
    }
    
    // Generate based on page type and content
    switch (pageType) {
      case 'article':
        if (contentData.excerpt || contentData.summary) {
          return contentData.excerpt || contentData.summary;
        }
        // Try to extract from content
        const articleContent = this.extractArticleExcerpt();
        if (articleContent) {
          return articleContent;
        }
        break;
        
      case 'news':
        const latestNews = this.getLatestNewsItems(3);
        if (latestNews.length > 0) {
          const headlines = latestNews.map(item => item.title).join(', ');
          return `Latest updates: ${headlines}. Stay informed with independent analysis and commentary.`;
        }
        break;
        
      case 'portfolio':
        const portfolioSummary = this.getPortfolioSummary();
        if (portfolioSummary) {
          return `Current portfolio performance: ${portfolioSummary}. Track investments and market analysis.`;
        }
        break;
    }
    
    // Fallback to template
    const template = this.getPageTemplate(pageType);
    return template.description;
  }

  /**
   * Generate dynamic keywords based on content
   * @param {string} pageType - Page type
   * @param {Object} contentData - Content data
   * @param {Object} extractedMeta - Extracted metadata
   * @returns {Array} Generated keywords
   */
  generateDynamicKeywords(pageType, contentData, extractedMeta) {
    const template = this.getPageTemplate(pageType);
    let keywords = [...(template.keywords || [])];
    
    // Add content-specific keywords
    if (contentData.tags && Array.isArray(contentData.tags)) {
      keywords = keywords.concat(contentData.tags);
    }
    
    if (contentData.category) {
      keywords.push(contentData.category);
    }
    
    // Extract keywords from content
    const extractedKeywords = this.extractKeywordsFromContent();
    if (extractedKeywords.length > 0) {
      keywords = keywords.concat(extractedKeywords);
    }
    
    // Remove duplicates and limit count
    return [...new Set(keywords)].slice(0, 10);
  }

  /**
   * Generate dynamic OG image based on content
   * @param {string} pageType - Page type
   * @param {Object} contentData - Content data
   * @param {Object} extractedMeta - Extracted metadata
   * @returns {string} Generated OG image URL
   */
  generateDynamicOgImage(pageType, contentData, extractedMeta) {
    // Check for content-specific image
    if (extractedMeta.image) {
      return extractedMeta.image;
    }
    
    // Check for featured image in content
    const featuredImage = this.extractFeaturedImage();
    if (featuredImage) {
      return featuredImage;
    }
    
    // Fallback to template
    const template = this.getPageTemplate(pageType);
    return template.ogImage;
  }

  /**
   * Optimize keywords for SEO
   * @param {Array} keywords - Original keywords
   * @param {string} pageType - Page type
   * @param {Object} contentData - Content data
   * @returns {Array} Optimized keywords
   */
  optimizeKeywords(keywords, pageType, contentData) {
    if (!Array.isArray(keywords)) return [];
    
    // Filter and clean keywords
    let optimized = keywords
      .filter(keyword => keyword && typeof keyword === 'string')
      .map(keyword => keyword.trim().toLowerCase())
      .filter(keyword => keyword.length > 2 && keyword.length < 50);
    
    // Remove duplicates
    optimized = [...new Set(optimized)];
    
    // Add long-tail variations for articles
    if (pageType === 'article' && contentData.title) {
      const titleKeywords = this.extractKeywordsFromText(contentData.title);
      optimized = optimized.concat(titleKeywords);
    }
    
    // Limit to 10 keywords for optimal SEO
    return optimized.slice(0, 10);
  }

  /**
   * Optimize title for SEO
   * @param {string} title - Original title
   * @param {string} pageType - Page type
   * @returns {string} Optimized title
   */
  optimizeTitle(title, pageType) {
    if (!title) return '';
    
    const maxLength = 60;
    
    // If title is within limits, return as-is
    if (title.length <= maxLength) {
      return title;
    }
    
    // For articles, prioritize the main title over site name
    if (pageType === 'article') {
      const parts = title.split(' - ');
      if (parts.length > 1) {
        const mainTitle = parts[0];
        const siteName = parts[parts.length - 1];
        
        if (mainTitle.length <= maxLength - siteName.length - 3) {
          return `${mainTitle} - ${siteName}`;
        } else {
          // Truncate main title
          const truncatedMain = this.truncateAtWordBoundary(mainTitle, maxLength - siteName.length - 6);
          return `${truncatedMain}... - ${siteName}`;
        }
      }
    }
    
    // General truncation
    return this.truncateAtWordBoundary(title, maxLength - 3) + '...';
  }

  /**
   * Optimize description for SEO
   * @param {string} description - Original description
   * @param {string} pageType - Page type
   * @returns {string} Optimized description
   */
  optimizeDescription(description, pageType) {
    if (!description) return '';
    
    const maxLength = 160;
    
    // If description is within limits, return as-is
    if (description.length <= maxLength) {
      return description;
    }
    
    // Truncate at word boundary
    return this.truncateAtWordBoundary(description, maxLength - 3) + '...';
  }

  /**
   * Truncate text at word boundary
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  truncateAtWordBoundary(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    // If we can find a good word boundary, use it
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace);
    }
    
    // Otherwise, hard truncate
    return truncated;
  }

  /**
   * Get fallback configuration for error cases
   * @param {string} pageType - Page type
   * @returns {Object} Fallback configuration
   */
  getFallbackConfig(pageType) {
    const siteConfig = seoConfig.getSiteConfig();
    
    return {
      title: `${siteConfig.name} - Independent Commentary & Economic Insight`,
      description: siteConfig.description,
      keywords: ['economic analysis', 'independent commentary', 'financial news'],
      ogType: 'website',
      ogImage: '/images/og-default.jpg',
      twitterCard: 'summary_large_image',
      robots: 'index,follow',
      canonicalUrl: normalizeUrl(window.location.href)
    };
  }

  // Helper methods for content extraction (these would be implemented based on actual DOM structure)
  
  getNewsCount() {
    try {
      const newsItems = document.querySelectorAll('.news-item, .post-item');
      return newsItems.length;
    } catch {
      return 0;
    }
  }

  getPortfolioValue() {
    try {
      const valueElement = document.querySelector('.portfolio-value, .total-value');
      return valueElement ? valueElement.textContent.replace(/[^0-9.,]/g, '') : null;
    } catch {
      return null;
    }
  }

  getMediaCount() {
    try {
      const mediaItems = document.querySelectorAll('.media-item, .podcast-item, .video-item');
      return mediaItems.length;
    } catch {
      return 0;
    }
  }

  getLatestNewsItems(count = 3) {
    try {
      const newsItems = document.querySelectorAll('.news-item, .post-item');
      return Array.from(newsItems).slice(0, count).map(item => ({
        title: item.querySelector('h2, h3, .title')?.textContent?.trim() || 'News Item'
      }));
    } catch {
      return [];
    }
  }

  getPortfolioSummary() {
    try {
      const summaryElement = document.querySelector('.portfolio-summary, .performance-summary');
      return summaryElement ? summaryElement.textContent.trim() : null;
    } catch {
      return null;
    }
  }

  extractArticleExcerpt() {
    try {
      const excerptElement = document.querySelector('.excerpt, .summary, .lead');
      if (excerptElement) {
        return excerptElement.textContent.trim();
      }
      
      // Fallback: extract from first paragraph
      const firstParagraph = document.querySelector('article p, .content p, .post-content p');
      if (firstParagraph) {
        const text = firstParagraph.textContent.trim();
        return text.length > 160 ? text.substring(0, 157) + '...' : text;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  extractFeaturedImage() {
    try {
      // Look for featured image in various common selectors
      const selectors = [
        '.featured-image img',
        '.hero-image img',
        '.post-image img',
        'article img:first-of-type',
        '.content img:first-of-type'
      ];
      
      for (const selector of selectors) {
        const img = document.querySelector(selector);
        if (img && img.src) {
          return img.src;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  extractKeywordsFromContent() {
    try {
      // Extract keywords from headings and emphasized text
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const emphasized = document.querySelectorAll('strong, em, b, i');
      
      const keywords = [];
      
      [...headings, ...emphasized].forEach(element => {
        const text = element.textContent.trim();
        const words = this.extractKeywordsFromText(text);
        keywords.push(...words);
      });
      
      return [...new Set(keywords)].slice(0, 5);
    } catch {
      return [];
    }
  }

  extractKeywordsFromText(text) {
    if (!text) return [];
    
    // Simple keyword extraction (in a real implementation, this could be more sophisticated)
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && word.length < 20)
      .filter(word => !this.isStopWord(word))
      .slice(0, 3);
  }

  isStopWord(word) {
    const stopWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ];
    return stopWords.includes(word.toLowerCase());
  }
}

// Export singleton instance
const pageMetaConfig = new PageMetaConfig();
export default pageMetaConfig;