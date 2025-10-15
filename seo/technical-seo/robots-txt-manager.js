/**
 * Robots.txt Management System
 * Generates and manages robots.txt with proper directives and sitemap inclusion
 */

import { urlUtils } from '../utils/url-utils.js';
import { errorHandler } from '../utils/error-handler.js';
import { seoConfig } from '../config/seo-config.js';

class RobotsTxtManager {
  constructor() {
    this.baseUrl = seoConfig.site.url;
    this.directives = new Map();
    this.sitemaps = [];
    this.crawlDelay = null;
    this.lastGenerated = null;
  }

  /**
   * Set crawling directives for a user agent
   * @param {string} userAgent - User agent string (e.g., '*', 'Googlebot')
   * @param {Object} rules - Crawling rules { allow: [], disallow: [], crawlDelay: number }
   */
  setUserAgentRules(userAgent, rules) {
    try {
      this.directives.set(userAgent, {
        allow: rules.allow || [],
        disallow: rules.disallow || [],
        crawlDelay: rules.crawlDelay || null
      });
    } catch (error) {
      errorHandler.logError('RobotsTxtManager.setUserAgentRules', error);
      throw error;
    }
  }

  /**
   * Add sitemap URL to robots.txt
   * @param {string} sitemapUrl - Sitemap URL (relative or absolute)
   */
  addSitemap(sitemapUrl) {
    try {
      const fullUrl = urlUtils.buildAbsoluteUrl(sitemapUrl, this.baseUrl);
      if (!this.sitemaps.includes(fullUrl)) {
        this.sitemaps.push(fullUrl);
      }
    } catch (error) {
      errorHandler.logError('RobotsTxtManager.addSitemap', error);
      throw error;
    }
  }

  /**
   * Remove sitemap URL from robots.txt
   * @param {string} sitemapUrl - Sitemap URL to remove
   */
  removeSitemap(sitemapUrl) {
    try {
      const fullUrl = urlUtils.buildAbsoluteUrl(sitemapUrl, this.baseUrl);
      const index = this.sitemaps.indexOf(fullUrl);
      if (index > -1) {
        this.sitemaps.splice(index, 1);
      }
    } catch (error) {
      errorHandler.logError('RobotsTxtManager.removeSitemap', error);
      throw error;
    }
  }

  /**
   * Set default crawling rules for the site
   */
  setDefaultRules() {
    try {
      // Default rules for all user agents
      this.setUserAgentRules('*', {
        allow: ['/'],
        disallow: [
          '/admin/',
          '/private/',
          '/_vercel/',
          '/dist/',
          '/node_modules/',
          '/.git/',
          '/.kiro/',
          '/css/',
          '/js/',
          '/json/',
          '/images/',
          '/docs/',
          '*.json',
          '*.css',
          '*.js'
        ]
      });

      // Specific rules for Google
      this.setUserAgentRules('Googlebot', {
        allow: [
          '/',
          '/css/',
          '/js/',
          '/images/'
        ],
        disallow: [
          '/admin/',
          '/private/',
          '/_vercel/',
          '/dist/',
          '/node_modules/',
          '/.git/',
          '/.kiro/',
          '/docs/',
          '*.json'
        ]
      });

      // Specific rules for Bing
      this.setUserAgentRules('Bingbot', {
        allow: [
          '/',
          '/css/',
          '/js/',
          '/images/'
        ],
        disallow: [
          '/admin/',
          '/private/',
          '/_vercel/',
          '/dist/',
          '/node_modules/',
          '/.git/',
          '/.kiro/',
          '/docs/',
          '*.json'
        ]
      });

      // Add main sitemap
      this.addSitemap('/sitemap.xml');
      
    } catch (error) {
      errorHandler.logError('RobotsTxtManager.setDefaultRules', error);
      throw error;
    }
  }

  /**
   * Generate robots.txt content
   * @returns {string} Robots.txt content
   */
  generateRobotsTxt() {
    try {
      let content = '';
      
      // Add header comment
      content += '# Robots.txt for Howdy, Stranger\n';
      content += `# Generated on ${new Date().toISOString()}\n\n`;
      
      // Add user agent directives
      for (const [userAgent, rules] of this.directives) {
        content += `User-agent: ${userAgent}\n`;
        
        // Add allow directives
        rules.allow.forEach(path => {
          content += `Allow: ${path}\n`;
        });
        
        // Add disallow directives
        rules.disallow.forEach(path => {
          content += `Disallow: ${path}\n`;
        });
        
        // Add crawl delay if specified
        if (rules.crawlDelay) {
          content += `Crawl-delay: ${rules.crawlDelay}\n`;
        }
        
        content += '\n';
      }
      
      // Add sitemap URLs
      this.sitemaps.forEach(sitemapUrl => {
        content += `Sitemap: ${sitemapUrl}\n`;
      });
      
      // Add additional directives
      content += '\n# Additional directives\n';
      content += 'Host: ' + this.baseUrl.replace(/^https?:\/\//, '') + '\n';
      
      this.lastGenerated = new Date();
      return content;
    } catch (error) {
      errorHandler.logError('RobotsTxtManager.generateRobotsTxt', error);
      throw error;
    }
  }

  /**
   * Validate robots.txt content
   * @param {string} content - Robots.txt content to validate
   * @returns {Object} Validation result
   */
  validateRobotsTxt(content) {
    try {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        stats: {
          userAgents: 0,
          allowRules: 0,
          disallowRules: 0,
          sitemaps: 0
        }
      };
      
      const lines = content.split('\n');
      let currentUserAgent = null;
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Skip comments and empty lines
        if (trimmedLine.startsWith('#') || trimmedLine === '') {
          return;
        }
        
        // Check for valid directives
        if (trimmedLine.toLowerCase().startsWith('user-agent:')) {
          validation.stats.userAgents++;
          currentUserAgent = trimmedLine.split(':')[1].trim();
        } else if (trimmedLine.toLowerCase().startsWith('allow:')) {
          validation.stats.allowRules++;
        } else if (trimmedLine.toLowerCase().startsWith('disallow:')) {
          validation.stats.disallowRules++;
        } else if (trimmedLine.toLowerCase().startsWith('sitemap:')) {
          validation.stats.sitemaps++;
          
          // Validate sitemap URL
          const sitemapUrl = trimmedLine.split(':', 2)[1].trim();
          if (!urlUtils.isValidUrl(sitemapUrl)) {
            validation.warnings.push(`Line ${index + 1}: Invalid sitemap URL format`);
          }
        } else if (trimmedLine.toLowerCase().startsWith('crawl-delay:')) {
          const delay = trimmedLine.split(':')[1].trim();
          if (isNaN(delay) || delay < 0) {
            validation.errors.push(`Line ${index + 1}: Invalid crawl-delay value`);
            validation.isValid = false;
          }
        } else if (trimmedLine.toLowerCase().startsWith('host:')) {
          // Host directive is valid
        } else {
          validation.warnings.push(`Line ${index + 1}: Unknown directive "${trimmedLine}"`);
        }
      });
      
      // Check for required elements
      if (validation.stats.userAgents === 0) {
        validation.errors.push('No User-agent directives found');
        validation.isValid = false;
      }
      
      if (validation.stats.sitemaps === 0) {
        validation.warnings.push('No sitemap URLs specified');
      }
      
      return validation;
    } catch (error) {
      errorHandler.logError('RobotsTxtManager.validateRobotsTxt', error);
      throw error;
    }
  }

  /**
   * Save robots.txt to file system
   * @param {string} content - Robots.txt content to save
   */
  async saveRobotsTxt(content) {
    try {
      // Validate content before saving
      const validation = this.validateRobotsTxt(content);
      
      if (!validation.isValid) {
        throw new Error(`Invalid robots.txt content: ${validation.errors.join(', ')}`);
      }
      
      // In a real implementation, this would write to the file system
      // For now, we'll return the content for manual saving
      console.log('Robots.txt generated successfully');
      console.log(`Content length: ${content.length} characters`);
      console.log(`User agents: ${validation.stats.userAgents}`);
      console.log(`Sitemaps: ${validation.stats.sitemaps}`);
      
      if (validation.warnings.length > 0) {
        console.warn('Warnings:', validation.warnings);
      }
      
      return {
        content,
        validation,
        generatedAt: this.lastGenerated
      };
    } catch (error) {
      errorHandler.logError('RobotsTxtManager.saveRobotsTxt', error);
      throw error;
    }
  }

  /**
   * Get robots.txt statistics
   * @returns {Object} Statistics about current configuration
   */
  getStats() {
    return {
      userAgents: Array.from(this.directives.keys()),
      totalDirectives: Array.from(this.directives.values()).reduce((total, rules) => {
        return total + rules.allow.length + rules.disallow.length;
      }, 0),
      sitemapCount: this.sitemaps.length,
      sitemaps: [...this.sitemaps],
      lastGenerated: this.lastGenerated
    };
  }

  /**
   * Reset all configurations
   */
  reset() {
    this.directives.clear();
    this.sitemaps = [];
    this.crawlDelay = null;
    this.lastGenerated = null;
  }
}

export { RobotsTxtManager };