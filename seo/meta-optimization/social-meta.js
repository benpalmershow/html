/**
 * Social Media Meta Tags Generator
 * Specialized handling for Open Graph and Twitter Card meta tags
 */

import { injectOgTag, injectTwitterTag } from '../utils/dom-utils.js';
import { validateUrl, normalizeUrl } from '../utils/url-utils.js';
import { extractContentMetadata } from '../utils/content-utils.js';
import { handleError } from '../utils/error-handler.js';
import seoConfig from '../config/seo-config.js';

class SocialMetaGenerator {
  constructor() {
    this.defaultImages = {
      article: '/images/og-article-default.jpg',
      website: '/images/og-default.jpg',
      profile: '/images/og-profile-default.jpg',
      video: '/images/og-video-default.jpg'
    };
    
    this.imageDimensions = {
      og: { width: 1200, height: 630 },
      twitter: { width: 1200, height: 600 }
    };
  }

  /**
   * Generate comprehensive Open Graph meta tags
   * @param {Object} contentData - Content metadata
   * @param {Object} options - Generation options
   */
  generateOpenGraphTags(contentData, options = {}) {
    try {
      const config = this.prepareOpenGraphConfig(contentData, options);
      
      // Basic Open Graph tags (required)
      this.injectBasicOpenGraphTags(config);
      
      // Content-specific tags
      this.injectContentSpecificOpenGraphTags(config);
      
      // Image optimization and injection
      this.injectOptimizedOpenGraphImages(config);
      
      // Optional tags based on content type
      this.injectOptionalOpenGraphTags(config);
      
      return true;
    } catch (error) {
      handleError('SocialMetaGenerator.generateOpenGraphTags', error, { contentData, options });
      return false;
    }
  }

  /**
   * Inject basic Open Graph tags
   * @param {Object} config - Prepared configuration
   */
  injectBasicOpenGraphTags(config) {
    // Required Open Graph tags
    injectOgTag('og:type', config.type);
    injectOgTag('og:title', config.title);
    injectOgTag('og:description', config.description);
    injectOgTag('og:url', config.url);
    
    // Site information
    injectOgTag('og:site_name', config.siteName);
    
    // Locale information
    if (config.locale) {
      injectOgTag('og:locale', config.locale);
    }
    
    // Alternate locales
    if (config.alternateLocales && Array.isArray(config.alternateLocales)) {
      config.alternateLocales.forEach(locale => {
        injectOgTag('og:locale:alternate', locale);
      });
    }
  }

  /**
   * Inject content-specific Open Graph tags
   * @param {Object} config - Prepared configuration
   */
  injectContentSpecificOpenGraphTags(config) {
    switch (config.type) {
      case 'article':
        this.injectArticleOpenGraphTags(config);
        break;
      case 'profile':
        this.injectProfileOpenGraphTags(config);
        break;
      case 'video.movie':
      case 'video.episode':
      case 'video.tv_show':
      case 'video.other':
        this.injectVideoOpenGraphTags(config);
        break;
      case 'music.song':
      case 'music.album':
      case 'music.playlist':
        this.injectMusicOpenGraphTags(config);
        break;
      default:
        // Website type - no additional tags needed
        break;
    }
  }

  /**
   * Inject article-specific Open Graph tags
   * @param {Object} config - Configuration object
   */
  injectArticleOpenGraphTags(config) {
    if (config.author) {
      // Handle multiple authors
      const authors = Array.isArray(config.author) ? config.author : [config.author];
      authors.forEach(author => {
        if (typeof author === 'string') {
          injectOgTag('article:author', author);
        } else if (author.name) {
          injectOgTag('article:author', author.name);
        }
      });
    }
    
    if (config.publishedTime) {
      injectOgTag('article:published_time', this.formatDateTime(config.publishedTime));
    }
    
    if (config.modifiedTime) {
      injectOgTag('article:modified_time', this.formatDateTime(config.modifiedTime));
    }
    
    if (config.expirationTime) {
      injectOgTag('article:expiration_time', this.formatDateTime(config.expirationTime));
    }
    
    if (config.section) {
      injectOgTag('article:section', config.section);
    }
    
    if (config.tags && Array.isArray(config.tags)) {
      config.tags.forEach(tag => {
        if (tag && typeof tag === 'string') {
          injectOgTag('article:tag', tag.trim());
        }
      });
    }
  }

  /**
   * Inject profile-specific Open Graph tags
   * @param {Object} config - Configuration object
   */
  injectProfileOpenGraphTags(config) {
    if (config.firstName) {
      injectOgTag('profile:first_name', config.firstName);
    }
    
    if (config.lastName) {
      injectOgTag('profile:last_name', config.lastName);
    }
    
    if (config.username) {
      injectOgTag('profile:username', config.username);
    }
    
    if (config.gender) {
      injectOgTag('profile:gender', config.gender);
    }
  }

  /**
   * Inject video-specific Open Graph tags
   * @param {Object} config - Configuration object
   */
  injectVideoOpenGraphTags(config) {
    if (config.videoUrl) {
      injectOgTag('og:video', config.videoUrl);
    }
    
    if (config.videoSecureUrl) {
      injectOgTag('og:video:secure_url', config.videoSecureUrl);
    }
    
    if (config.videoType) {
      injectOgTag('og:video:type', config.videoType);
    }
    
    if (config.videoWidth) {
      injectOgTag('og:video:width', config.videoWidth.toString());
    }
    
    if (config.videoHeight) {
      injectOgTag('og:video:height', config.videoHeight.toString());
    }
    
    if (config.videoDuration) {
      injectOgTag('video:duration', config.videoDuration.toString());
    }
    
    if (config.videoReleaseDate) {
      injectOgTag('video:release_date', this.formatDateTime(config.videoReleaseDate));
    }
  }

  /**
   * Inject music-specific Open Graph tags
   * @param {Object} config - Configuration object
   */
  injectMusicOpenGraphTags(config) {
    if (config.musicDuration) {
      injectOgTag('music:duration', config.musicDuration.toString());
    }
    
    if (config.musicAlbum) {
      injectOgTag('music:album', config.musicAlbum);
    }
    
    if (config.musicMusician) {
      const musicians = Array.isArray(config.musicMusician) ? config.musicMusician : [config.musicMusician];
      musicians.forEach(musician => {
        injectOgTag('music:musician', musician);
      });
    }
  }

  /**
   * Inject optimized Open Graph images
   * @param {Object} config - Configuration object
   */
  injectOptimizedOpenGraphImages(config) {
    const images = this.prepareImageArray(config.images || config.image);
    
    if (images.length === 0) {
      // Use default image based on content type
      const defaultImage = this.getDefaultImage(config.type);
      if (defaultImage) {
        images.push({ url: defaultImage });
      }
    }
    
    images.forEach((image, index) => {
      const imageUrl = this.resolveImageUrl(image.url || image);
      
      if (index === 0) {
        // Primary image
        injectOgTag('og:image', imageUrl);
      } else {
        // Additional images
        injectOgTag('og:image', imageUrl);
      }
      
      // Image metadata
      if (image.alt || config.imageAlt) {
        injectOgTag('og:image:alt', image.alt || config.imageAlt);
      }
      
      if (image.width || config.imageWidth) {
        injectOgTag('og:image:width', (image.width || config.imageWidth).toString());
      }
      
      if (image.height || config.imageHeight) {
        injectOgTag('og:image:height', (image.height || config.imageHeight).toString());
      }
      
      if (image.type) {
        injectOgTag('og:image:type', image.type);
      }
      
      // Secure URL if available
      if (image.secureUrl) {
        injectOgTag('og:image:secure_url', this.resolveImageUrl(image.secureUrl));
      }
    });
  }

  /**
   * Inject optional Open Graph tags
   * @param {Object} config - Configuration object
   */
  injectOptionalOpenGraphTags(config) {
    // Audio content
    if (config.audio) {
      const audioFiles = Array.isArray(config.audio) ? config.audio : [config.audio];
      audioFiles.forEach(audio => {
        injectOgTag('og:audio', audio.url || audio);
        if (audio.type) {
          injectOgTag('og:audio:type', audio.type);
        }
      });
    }
    
    // Determiner (a, an, the, etc.)
    if (config.determiner) {
      injectOgTag('og:determiner', config.determiner);
    }
    
    // Rich object properties
    if (config.richAttachment) {
      injectOgTag('og:rich_attachment', 'true');
    }
    
    // See also URLs
    if (config.seeAlso && Array.isArray(config.seeAlso)) {
      config.seeAlso.forEach(url => {
        if (validateUrl(url)) {
          injectOgTag('og:see_also', url);
        }
      });
    }
  }

  /**
   * Prepare Open Graph configuration from content data
   * @param {Object} contentData - Raw content data
   * @param {Object} options - Generation options
   * @returns {Object} Prepared configuration
   */
  prepareOpenGraphConfig(contentData, options) {
    const siteConfig = seoConfig.getSiteConfig();
    const pageConfig = contentData.pageConfig || {};
    
    // Extract metadata from content if not provided
    const extractedMeta = extractContentMetadata();
    
    return {
      type: contentData.ogType || pageConfig.ogType || this.determineContentType(contentData) || 'website',
      title: contentData.title || pageConfig.title || extractedMeta.title || document.title,
      description: contentData.description || pageConfig.description || extractedMeta.description,
      url: contentData.canonicalUrl || pageConfig.canonicalUrl || normalizeUrl(window.location.href),
      siteName: siteConfig.name,
      locale: contentData.locale || options.locale || 'en_US',
      alternateLocales: contentData.alternateLocales || options.alternateLocales,
      
      // Content-specific properties
      author: contentData.author || pageConfig.author || siteConfig.author,
      publishedTime: contentData.publishedTime || contentData.datePublished,
      modifiedTime: contentData.modifiedTime || contentData.dateModified,
      expirationTime: contentData.expirationTime,
      section: contentData.section || contentData.category,
      tags: contentData.tags || contentData.keywords,
      
      // Image properties
      images: contentData.images || contentData.ogImage || pageConfig.ogImage,
      image: contentData.image || contentData.ogImage || pageConfig.ogImage,
      imageAlt: contentData.imageAlt || contentData.ogImageAlt,
      imageWidth: contentData.imageWidth || this.imageDimensions.og.width,
      imageHeight: contentData.imageHeight || this.imageDimensions.og.height,
      
      // Video properties
      videoUrl: contentData.videoUrl || contentData.video,
      videoSecureUrl: contentData.videoSecureUrl,
      videoType: contentData.videoType,
      videoWidth: contentData.videoWidth,
      videoHeight: contentData.videoHeight,
      videoDuration: contentData.videoDuration,
      videoReleaseDate: contentData.videoReleaseDate,
      
      // Audio properties
      audio: contentData.audio,
      
      // Profile properties
      firstName: contentData.firstName,
      lastName: contentData.lastName,
      username: contentData.username,
      gender: contentData.gender,
      
      // Music properties
      musicDuration: contentData.musicDuration,
      musicAlbum: contentData.musicAlbum,
      musicMusician: contentData.musicMusician,
      
      // Additional properties
      determiner: contentData.determiner,
      richAttachment: contentData.richAttachment,
      seeAlso: contentData.seeAlso
    };
  }

  /**
   * Determine content type based on content data
   * @param {Object} contentData - Content data
   * @returns {string} Open Graph type
   */
  determineContentType(contentData) {
    // Check for explicit indicators
    if (contentData.isArticle || contentData.publishedTime || contentData.author) {
      return 'article';
    }
    
    if (contentData.isProfile || contentData.firstName || contentData.lastName) {
      return 'profile';
    }
    
    if (contentData.videoUrl || contentData.video) {
      return 'video.other';
    }
    
    if (contentData.audio || contentData.musicDuration) {
      return 'music.song';
    }
    
    // Check page structure for hints
    const articleElement = document.querySelector('article');
    if (articleElement) {
      return 'article';
    }
    
    const videoElement = document.querySelector('video');
    if (videoElement) {
      return 'video.other';
    }
    
    const audioElement = document.querySelector('audio');
    if (audioElement) {
      return 'music.song';
    }
    
    return 'website';
  }

  /**
   * Prepare image array from various input formats
   * @param {*} images - Images in various formats
   * @returns {Array} Normalized image array
   */
  prepareImageArray(images) {
    if (!images) return [];
    
    if (typeof images === 'string') {
      return [{ url: images }];
    }
    
    if (Array.isArray(images)) {
      return images.map(img => 
        typeof img === 'string' ? { url: img } : img
      ).filter(img => img.url);
    }
    
    if (typeof images === 'object' && images.url) {
      return [images];
    }
    
    return [];
  }

  /**
   * Get default image for content type
   * @param {string} type - Content type
   * @returns {string|null} Default image URL
   */
  getDefaultImage(type) {
    if (type.startsWith('article')) {
      return this.defaultImages.article;
    }
    
    if (type.startsWith('profile')) {
      return this.defaultImages.profile;
    }
    
    if (type.startsWith('video')) {
      return this.defaultImages.video;
    }
    
    return this.defaultImages.website;
  }

  /**
   * Resolve image URL to absolute URL
   * @param {string} imageUrl - Image URL
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
   * Format date/time for Open Graph
   * @param {Date|string|number} dateTime - Date/time value
   * @returns {string} ISO 8601 formatted date/time
   */
  formatDateTime(dateTime) {
    if (!dateTime) return '';
    
    try {
      const date = new Date(dateTime);
      return date.toISOString();
    } catch (error) {
      console.warn('Invalid date/time format:', dateTime);
      return '';
    }
  }

  /**
   * Optimize image for social sharing
   * @param {string} imageUrl - Original image URL
   * @param {Object} options - Optimization options
   * @returns {Promise<string>} Optimized image URL
   */
  async optimizeImageForSharing(imageUrl, options = {}) {
    try {
      // This would integrate with an image optimization service
      // For now, return the original URL
      const targetWidth = options.width || this.imageDimensions.og.width;
      const targetHeight = options.height || this.imageDimensions.og.height;
      
      // In a real implementation, this would:
      // 1. Resize the image to optimal dimensions
      // 2. Compress for web delivery
      // 3. Convert to optimal format (WebP with fallback)
      // 4. Generate multiple sizes for different platforms
      
      return imageUrl;
    } catch (error) {
      handleError('SocialMetaGenerator.optimizeImageForSharing', error, { imageUrl, options });
      return imageUrl;
    }
  }

  /**
   * Generate comprehensive Twitter Card meta tags
   * @param {Object} contentData - Content metadata
   * @param {Object} options - Generation options
   */
  generateTwitterCardTags(contentData, options = {}) {
    try {
      const config = this.prepareTwitterCardConfig(contentData, options);
      
      // Validate configuration
      if (!this.validateTwitterCardConfig(config)) {
        console.warn('Invalid Twitter Card configuration, using fallback');
        return false;
      }
      
      // Determine and inject card type
      const cardType = this.determineTwitterCardType(config);
      injectTwitterTag('twitter:card', cardType);
      
      // Inject basic Twitter Card tags
      this.injectBasicTwitterCardTags(config);
      
      // Inject card-specific tags
      this.injectCardSpecificTwitterTags(config, cardType);
      
      // Inject image optimization
      this.injectOptimizedTwitterImages(config, cardType);
      
      return true;
    } catch (error) {
      handleError('SocialMetaGenerator.generateTwitterCardTags', error, { contentData, options });
      return false;
    }
  }

  /**
   * Inject basic Twitter Card tags
   * @param {Object} config - Prepared configuration
   */
  injectBasicTwitterCardTags(config) {
    // Required Twitter Card tags
    injectTwitterTag('twitter:title', this.truncateTwitterTitle(config.title));
    injectTwitterTag('twitter:description', this.truncateTwitterDescription(config.description));
    
    // Site and creator information
    if (config.site) {
      injectTwitterTag('twitter:site', this.formatTwitterHandle(config.site));
    }
    
    if (config.creator) {
      injectTwitterTag('twitter:creator', this.formatTwitterHandle(config.creator));
    }
    
    // Domain (optional but recommended)
    if (config.domain) {
      injectTwitterTag('twitter:domain', config.domain);
    }
  }

  /**
   * Inject card-specific Twitter tags
   * @param {Object} config - Configuration object
   * @param {string} cardType - Twitter Card type
   */
  injectCardSpecificTwitterTags(config, cardType) {
    switch (cardType) {
      case 'summary':
      case 'summary_large_image':
        // No additional tags needed for summary cards
        break;
        
      case 'app':
        this.injectAppCardTags(config);
        break;
        
      case 'player':
        this.injectPlayerCardTags(config);
        break;
        
      default:
        console.warn(`Unknown Twitter Card type: ${cardType}`);
        break;
    }
  }

  /**
   * Inject app card specific tags
   * @param {Object} config - Configuration object
   */
  injectAppCardTags(config) {
    if (config.app) {
      // iPhone app
      if (config.app.iphone) {
        injectTwitterTag('twitter:app:name:iphone', config.app.iphone.name);
        injectTwitterTag('twitter:app:id:iphone', config.app.iphone.id);
        if (config.app.iphone.url) {
          injectTwitterTag('twitter:app:url:iphone', config.app.iphone.url);
        }
      }
      
      // iPad app
      if (config.app.ipad) {
        injectTwitterTag('twitter:app:name:ipad', config.app.ipad.name);
        injectTwitterTag('twitter:app:id:ipad', config.app.ipad.id);
        if (config.app.ipad.url) {
          injectTwitterTag('twitter:app:url:ipad', config.app.ipad.url);
        }
      }
      
      // Google Play app
      if (config.app.googleplay) {
        injectTwitterTag('twitter:app:name:googleplay', config.app.googleplay.name);
        injectTwitterTag('twitter:app:id:googleplay', config.app.googleplay.id);
        if (config.app.googleplay.url) {
          injectTwitterTag('twitter:app:url:googleplay', config.app.googleplay.url);
        }
      }
    }
  }

  /**
   * Inject player card specific tags
   * @param {Object} config - Configuration object
   */
  injectPlayerCardTags(config) {
    if (config.player) {
      // Player URL (required for player cards)
      if (config.player.url) {
        injectTwitterTag('twitter:player', config.player.url);
      }
      
      // Player dimensions
      if (config.player.width) {
        injectTwitterTag('twitter:player:width', config.player.width.toString());
      }
      
      if (config.player.height) {
        injectTwitterTag('twitter:player:height', config.player.height.toString());
      }
      
      // Player stream (for live streams)
      if (config.player.stream) {
        injectTwitterTag('twitter:player:stream', config.player.stream);
        
        if (config.player.streamContentType) {
          injectTwitterTag('twitter:player:stream:content_type', config.player.streamContentType);
        }
      }
    }
  }

  /**
   * Inject optimized Twitter images
   * @param {Object} config - Configuration object
   * @param {string} cardType - Twitter Card type
   */
  injectOptimizedTwitterImages(config, cardType) {
    let imageUrl = config.twitterImage || config.image;
    
    // Use default image if none provided
    if (!imageUrl) {
      imageUrl = this.getDefaultTwitterImage(cardType, config.type);
    }
    
    if (imageUrl) {
      const resolvedImageUrl = this.resolveImageUrl(imageUrl);
      injectTwitterTag('twitter:image', resolvedImageUrl);
      
      // Image alt text
      if (config.imageAlt || config.twitterImageAlt) {
        injectTwitterTag('twitter:image:alt', config.imageAlt || config.twitterImageAlt);
      }
    }
  }

  /**
   * Prepare Twitter Card configuration from content data
   * @param {Object} contentData - Raw content data
   * @param {Object} options - Generation options
   * @returns {Object} Prepared configuration
   */
  prepareTwitterCardConfig(contentData, options) {
    const siteConfig = seoConfig.getSiteConfig();
    const pageConfig = contentData.pageConfig || {};
    
    // Extract metadata from content if not provided
    const extractedMeta = extractContentMetadata();
    
    return {
      title: contentData.title || pageConfig.title || extractedMeta.title || document.title,
      description: contentData.description || pageConfig.description || extractedMeta.description,
      
      // Twitter-specific properties
      site: contentData.twitterSite || siteConfig.social?.twitter || options.twitterSite,
      creator: contentData.twitterCreator || contentData.author || siteConfig.social?.twitter || options.twitterCreator,
      domain: contentData.domain || new URL(window.location.href).hostname,
      
      // Card type hints
      cardType: contentData.twitterCard || pageConfig.twitterCard || options.cardType,
      
      // Image properties
      image: contentData.twitterImage || contentData.image || contentData.ogImage || pageConfig.ogImage,
      twitterImage: contentData.twitterImage,
      imageAlt: contentData.twitterImageAlt || contentData.imageAlt || contentData.ogImageAlt,
      
      // App card properties
      app: contentData.twitterApp || {
        iphone: contentData.iphoneApp,
        ipad: contentData.ipadApp,
        googleplay: contentData.googleplayApp
      },
      
      // Player card properties
      player: contentData.twitterPlayer || {
        url: contentData.playerUrl || contentData.videoUrl,
        width: contentData.playerWidth || contentData.videoWidth || 480,
        height: contentData.playerHeight || contentData.videoHeight || 270,
        stream: contentData.playerStream,
        streamContentType: contentData.playerStreamContentType
      },
      
      // Content type for card type determination
      type: contentData.ogType || pageConfig.ogType || this.determineContentType(contentData) || 'website',
      
      // Additional metadata
      hasVideo: !!(contentData.videoUrl || contentData.player || contentData.twitterPlayer),
      hasApp: !!(contentData.twitterApp || contentData.iphoneApp || contentData.googleplayApp),
      isArticle: !!(contentData.isArticle || contentData.publishedTime || contentData.author)
    };
  }

  /**
   * Determine appropriate Twitter Card type based on content
   * @param {Object} config - Configuration object
   * @returns {string} Twitter Card type
   */
  determineTwitterCardType(config) {
    // If explicitly set, validate and use that
    if (config.cardType) {
      const validTypes = ['summary', 'summary_large_image', 'app', 'player'];
      if (validTypes.includes(config.cardType)) {
        return config.cardType;
      }
      console.warn(`Invalid Twitter Card type: ${config.cardType}, falling back to auto-detection`);
    }
    
    // Auto-detect based on content
    if (config.hasApp && config.app && (config.app.iphone || config.app.ipad || config.app.googleplay)) {
      return 'app';
    }
    
    if (config.hasVideo && config.player && config.player.url) {
      return 'player';
    }
    
    // Choose between summary and summary_large_image based on image presence
    if (config.image || config.twitterImage) {
      return 'summary_large_image';
    }
    
    return 'summary';
  }

  /**
   * Get default Twitter image for card type
   * @param {string} cardType - Twitter Card type
   * @param {string} contentType - Content type
   * @returns {string|null} Default image URL
   */
  getDefaultTwitterImage(cardType, contentType) {
    // For summary cards, image is optional
    if (cardType === 'summary') {
      return null;
    }
    
    // For other card types, use appropriate default
    if (contentType && contentType.startsWith('article')) {
      return this.defaultImages.article;
    }
    
    if (contentType && contentType.startsWith('video')) {
      return this.defaultImages.video;
    }
    
    return this.defaultImages.website;
  }

  /**
   * Format Twitter handle (ensure @ prefix)
   * @param {string} handle - Twitter handle
   * @returns {string} Formatted handle
   */
  formatTwitterHandle(handle) {
    if (!handle) return '';
    
    // Remove @ if present, then add it back
    const cleanHandle = handle.replace(/^@/, '');
    return `@${cleanHandle}`;
  }

  /**
   * Truncate Twitter title to optimal length
   * @param {string} title - Original title
   * @returns {string} Truncated title
   */
  truncateTwitterTitle(title) {
    if (!title) return '';
    
    const maxLength = 70; // Twitter's recommended title length
    
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
   * Truncate Twitter description to optimal length
   * @param {string} description - Original description
   * @returns {string} Truncated description
   */
  truncateTwitterDescription(description) {
    if (!description) return '';
    
    const maxLength = 200; // Twitter's maximum description length
    
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
   * Validate Twitter Card configuration
   * @param {Object} config - Configuration to validate
   * @returns {boolean} Validation result
   */
  validateTwitterCardConfig(config) {
    // Required properties
    if (!config.title || !config.description) {
      console.warn('Missing required Twitter Card properties: title and description');
      return false;
    }
    
    // Validate title length
    if (config.title.length > 70) {
      console.warn('Twitter Card title is too long (recommended: 70 characters)');
    }
    
    // Validate description length
    if (config.description.length > 200) {
      console.warn('Twitter Card description is too long (max: 200 characters)');
    }
    
    // Validate Twitter handles
    if (config.site && !this.isValidTwitterHandle(config.site)) {
      console.warn('Invalid Twitter site handle format');
    }
    
    if (config.creator && !this.isValidTwitterHandle(config.creator)) {
      console.warn('Invalid Twitter creator handle format');
    }
    
    return true;
  }

  /**
   * Validate Twitter handle format
   * @param {string} handle - Twitter handle to validate
   * @returns {boolean} Validation result
   */
  isValidTwitterHandle(handle) {
    if (!handle) return false;
    
    // Remove @ if present
    const cleanHandle = handle.replace(/^@/, '');
    
    // Twitter handle validation: 1-15 characters, alphanumeric and underscore only
    const twitterHandleRegex = /^[a-zA-Z0-9_]{1,15}$/;
    return twitterHandleRegex.test(cleanHandle);
  }

  /**
   * Validate Open Graph configuration
   * @param {Object} config - Configuration to validate
   * @returns {boolean} Validation result
   */
  validateOpenGraphConfig(config) {
    // Required properties
    const required = ['type', 'title', 'description', 'url'];
    
    for (const prop of required) {
      if (!config[prop]) {
        console.warn(`Missing required Open Graph property: ${prop}`);
        return false;
      }
    }
    
    // Validate URL format
    if (!validateUrl(config.url)) {
      console.warn('Invalid Open Graph URL format');
      return false;
    }
    
    // Validate title length (Facebook recommends 40 characters)
    if (config.title.length > 100) {
      console.warn('Open Graph title is too long (recommended: 40 characters, max: 100)');
    }
    
    // Validate description length (Facebook recommends 125 characters)
    if (config.description.length > 300) {
      console.warn('Open Graph description is too long (recommended: 125 characters, max: 300)');
    }
    
    return true;
  }
}

// Export singleton instance
const socialMetaGenerator = new SocialMetaGenerator();
export default socialMetaGenerator;