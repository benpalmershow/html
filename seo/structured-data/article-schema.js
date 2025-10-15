/**
 * Article Schema Generator
 * Generates Article schema markup for news and blog content
 */

import SchemaGenerator from './schema-generator.js';
import { extractArticleMetadata, extractTextContent, sanitizeText } from '../utils/content-utils.js';
import { seoErrorHandler, safeExecute } from '../utils/error-handler.js';
import seoConfig from '../config/seo-config.js';

class ArticleSchemaGenerator extends SchemaGenerator {
  constructor() {
    super();
    this.defaultAuthor = {
      '@type': 'Person',
      name: 'Ben Palmer',
      url: 'https://howdystranger.net'
    };
  }

  /**
   * Generate article schema from HTML element
   * @param {HTMLElement} articleElement - Article element to extract data from
   * @param {Object} options - Additional options for schema generation
   * @returns {Object} Article schema object
   */
  generateFromElement(articleElement, options = {}) {
    return safeExecute(() => {
      if (!articleElement) {
        throw new Error('Article element is required for schema generation');
      }

      const metadata = extractArticleMetadata(articleElement);
      return this.generateFromMetadata(metadata, options);
    }, 'generateArticleSchemaFromElement', {});
  }

  /**
   * Generate article schema from metadata object
   * @param {Object} metadata - Article metadata
   * @param {Object} options - Additional options
   * @returns {Object} Article schema object
   */
  generateFromMetadata(metadata, options = {}) {
    return safeExecute(() => {
      const siteConfig = seoConfig.getSiteConfig();
      const currentUrl = options.url || window.location.href;
      
      // Prepare article data
      const articleData = {
        headline: this._prepareHeadline(metadata.title, options.headline),
        description: this._prepareDescription(metadata.description, options.description),
        author: this._prepareAuthor(metadata.author, options.author),
        publisher: this._preparePublisher(siteConfig, options.publisher),
        datePublished: this._prepareDatePublished(metadata.publishedDate, options.datePublished),
        dateModified: this._prepareDateModified(metadata.modifiedDate, options.dateModified),
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': currentUrl
        },
        url: currentUrl
      };

      // Add image if available
      const image = this._prepareImage(metadata.image, options.image, siteConfig);
      if (image) {
        articleData.image = image;
      }

      // Add article section/category if provided
      if (options.articleSection || metadata.section) {
        articleData.articleSection = options.articleSection || metadata.section;
      }

      // Add keywords if available
      if (metadata.keywords && metadata.keywords.length > 0) {
        articleData.keywords = metadata.keywords.join(', ');
      }

      // Add word count if calculable
      if (metadata.wordCount || options.wordCount) {
        articleData.wordCount = metadata.wordCount || options.wordCount;
      }

      // Generate the complete schema
      const schema = this.generateSchemaWithSiteConfig(articleData, 'Article');

      seoErrorHandler.logDebug('article_schema', 'Generated article schema', {
        headline: articleData.headline,
        hasImage: !!articleData.image,
        hasAuthor: !!articleData.author,
        url: currentUrl
      });

      return schema;
    }, 'generateArticleSchemaFromMetadata', {});
  }

  /**
   * Generate article schema for news content
   * @param {Object} newsData - News article data
   * @param {Object} options - Additional options
   * @returns {Object} NewsArticle schema object
   */
  generateNewsArticleSchema(newsData, options = {}) {
    return safeExecute(() => {
      const articleSchema = this.generateFromMetadata(newsData, options);
      
      // Convert to NewsArticle type
      articleSchema['@type'] = 'NewsArticle';
      
      // Add news-specific properties
      if (options.dateline || newsData.dateline) {
        articleSchema.dateline = options.dateline || newsData.dateline;
      }

      if (options.printColumn || newsData.printColumn) {
        articleSchema.printColumn = options.printColumn || newsData.printColumn;
      }

      if (options.printEdition || newsData.printEdition) {
        articleSchema.printEdition = options.printEdition || newsData.printEdition;
      }

      seoErrorHandler.logDebug('news_article_schema', 'Generated news article schema', {
        headline: articleSchema.headline,
        type: articleSchema['@type']
      });

      return articleSchema;
    }, 'generateNewsArticleSchema', {});
  }

  /**
   * Generate article schema for blog posts
   * @param {Object} blogData - Blog post data
   * @param {Object} options - Additional options
   * @returns {Object} BlogPosting schema object
   */
  generateBlogPostSchema(blogData, options = {}) {
    return safeExecute(() => {
      const articleSchema = this.generateFromMetadata(blogData, options);
      
      // Convert to BlogPosting type
      articleSchema['@type'] = 'BlogPosting';
      
      // Add blog-specific properties
      if (options.blogName || blogData.blogName) {
        articleSchema.isPartOf = {
          '@type': 'Blog',
          name: options.blogName || blogData.blogName || 'Howdy, Stranger Journal'
        };
      }

      seoErrorHandler.logDebug('blog_post_schema', 'Generated blog post schema', {
        headline: articleSchema.headline,
        type: articleSchema['@type']
      });

      return articleSchema;
    }, 'generateBlogPostSchema', {});
  }

  /**
   * Auto-detect and generate appropriate article schema
   * @param {HTMLElement} element - Content element
   * @param {Object} options - Generation options
   * @returns {Object} Appropriate article schema
   */
  autoGenerateSchema(element, options = {}) {
    return safeExecute(() => {
      const metadata = extractArticleMetadata(element);
      
      // Detect content type based on URL or element attributes
      const currentPath = window.location.pathname;
      const elementClasses = element.className || '';
      
      if (currentPath.includes('/news') || elementClasses.includes('news')) {
        return this.generateNewsArticleSchema(metadata, options);
      } else if (currentPath.includes('/journal') || elementClasses.includes('blog')) {
        return this.generateBlogPostSchema(metadata, options);
      } else {
        return this.generateFromMetadata(metadata, options);
      }
    }, 'autoGenerateArticleSchema', {});
  }

  /**
   * Inject article schema into page
   * @param {HTMLElement|Object} source - Article element or metadata object
   * @param {Object} options - Generation and injection options
   * @returns {boolean} Success status
   */
  injectArticleSchema(source, options = {}) {
    return safeExecute(() => {
      let schema;
      
      if (source instanceof HTMLElement) {
        schema = this.autoGenerateSchema(source, options);
      } else if (typeof source === 'object') {
        schema = this.generateFromMetadata(source, options);
      } else {
        throw new Error('Source must be an HTMLElement or metadata object');
      }

      const schemaId = options.id || 'article-schema';
      return this.injectSchema(schema, schemaId);
    }, 'injectArticleSchema', false);
  }

  /**
   * Prepare headline for schema
   * @param {string} title - Original title
   * @param {string} override - Override headline
   * @returns {string} Prepared headline
   * @private
   */
  _prepareHeadline(title, override) {
    const headline = override || title || 'Untitled Article';
    return sanitizeText(headline);
  }

  /**
   * Prepare description for schema
   * @param {string} description - Original description
   * @param {string} override - Override description
   * @returns {string} Prepared description
   * @private
   */
  _prepareDescription(description, override) {
    const desc = override || description || '';
    return sanitizeText(desc);
  }

  /**
   * Prepare author information for schema
   * @param {string|Object} author - Author information
   * @param {Object} override - Override author
   * @returns {Object} Author schema object
   * @private
   */
  _prepareAuthor(author, override) {
    if (override) return override;
    
    if (typeof author === 'string') {
      return {
        '@type': 'Person',
        name: sanitizeText(author)
      };
    }
    
    if (typeof author === 'object' && author.name) {
      return {
        '@type': 'Person',
        ...author
      };
    }
    
    return this.defaultAuthor;
  }

  /**
   * Prepare publisher information for schema
   * @param {Object} siteConfig - Site configuration
   * @param {Object} override - Override publisher
   * @returns {Object} Publisher schema object
   * @private
   */
  _preparePublisher(siteConfig, override) {
    if (override) return override;
    
    return {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}${siteConfig.logo}`,
        width: 600,
        height: 60
      }
    };
  }

  /**
   * Prepare publication date for schema
   * @param {string} date - Original date
   * @param {string} override - Override date
   * @returns {string} ISO date string
   * @private
   */
  _prepareDatePublished(date, override) {
    const publishDate = override || date;
    
    if (!publishDate) {
      // Use current date as fallback
      return new Date().toISOString();
    }
    
    try {
      return new Date(publishDate).toISOString();
    } catch (error) {
      seoErrorHandler.logWarning('date_parsing', 'Invalid publication date format', {
        originalDate: publishDate,
        error: error.message
      });
      return new Date().toISOString();
    }
  }

  /**
   * Prepare modification date for schema
   * @param {string} date - Original date
   * @param {string} override - Override date
   * @returns {string} ISO date string
   * @private
   */
  _prepareDateModified(date, override) {
    const modDate = override || date;
    
    if (!modDate) {
      // Use publication date or current date as fallback
      return this._prepareDatePublished(date, override);
    }
    
    try {
      return new Date(modDate).toISOString();
    } catch (error) {
      seoErrorHandler.logWarning('date_parsing', 'Invalid modification date format', {
        originalDate: modDate,
        error: error.message
      });
      return this._prepareDatePublished(date, override);
    }
  }

  /**
   * Prepare image information for schema
   * @param {string} imageUrl - Original image URL
   * @param {string|Object} override - Override image
   * @param {Object} siteConfig - Site configuration
   * @returns {Object|null} Image schema object
   * @private
   */
  _prepareImage(imageUrl, override, siteConfig) {
    let finalImageUrl = null;
    
    if (override) {
      if (typeof override === 'string') {
        finalImageUrl = override;
      } else if (override.url) {
        return override; // Already a complete image object
      }
    } else if (imageUrl) {
      finalImageUrl = imageUrl;
    }
    
    if (!finalImageUrl) return null;
    
    // Ensure absolute URL
    if (finalImageUrl.startsWith('/')) {
      finalImageUrl = `${siteConfig.url}${finalImageUrl}`;
    }
    
    return {
      '@type': 'ImageObject',
      url: finalImageUrl,
      width: 1200,
      height: 630
    };
  }
}

export default ArticleSchemaGenerator;