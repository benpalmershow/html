/**
 * Technical SEO Module
 * Exports all technical SEO components for XML sitemaps, robots.txt, and canonical URLs
 */

import { SitemapGenerator } from './sitemap-generator.js';
import { RobotsTxtManager } from './robots-txt-manager.js';
import { CanonicalUrlManager } from './canonical-urls.js';

/**
 * Technical SEO Manager
 * Coordinates all technical SEO components
 */
class TechnicalSeoManager {
  constructor() {
    this.sitemapGenerator = new SitemapGenerator();
    this.robotsTxtManager = new RobotsTxtManager();
    this.canonicalUrlManager = new CanonicalUrlManager();
    
    this.initialized = false;
  }

  /**
   * Initialize technical SEO components with default settings
   */
  async initialize() {
    try {
      // Set up default robots.txt rules
      this.robotsTxtManager.setDefaultRules();
      
      // Set up default canonical URL rules
      this.canonicalUrlManager.setupDefaultRules();
      
      this.initialized = true;
      console.log('Technical SEO Manager initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Technical SEO Manager:', error);
      throw error;
    }
  }

  /**
   * Generate all technical SEO files
   * @returns {Object} Generated files content
   */
  async generateAllFiles() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const results = {};
      
      // Generate XML sitemap
      results.sitemap = await this.sitemapGenerator.generateSitemap();
      
      // Generate robots.txt
      results.robotsTxt = this.robotsTxtManager.generateRobotsTxt();
      
      // Generate sitemap index if needed
      results.sitemapIndex = this.sitemapGenerator.generateSitemapIndex();
      
      return results;
    } catch (error) {
      console.error('Failed to generate technical SEO files:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive statistics for all components
   * @returns {Object} Combined statistics
   */
  getComprehensiveStats() {
    return {
      sitemap: this.sitemapGenerator.getStats(),
      robotsTxt: this.robotsTxtManager.getStats(),
      canonicalUrls: this.canonicalUrlManager.getStats(),
      initialized: this.initialized
    };
  }

  /**
   * Validate all technical SEO components
   * @returns {Object} Validation results
   */
  async validateAll() {
    try {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        components: {}
      };

      // Validate sitemap
      try {
        await this.sitemapGenerator.discoverPages();
        validation.components.sitemap = {
          isValid: true,
          pageCount: this.sitemapGenerator.pages.length
        };
      } catch (error) {
        validation.components.sitemap = {
          isValid: false,
          error: error.message
        };
        validation.errors.push(`Sitemap validation failed: ${error.message}`);
        validation.isValid = false;
      }

      // Validate robots.txt
      try {
        const robotsTxtContent = this.robotsTxtManager.generateRobotsTxt();
        const robotsValidation = this.robotsTxtManager.validateRobotsTxt(robotsTxtContent);
        validation.components.robotsTxt = robotsValidation;
        
        if (!robotsValidation.isValid) {
          validation.errors.push(...robotsValidation.errors);
          validation.isValid = false;
        }
        validation.warnings.push(...robotsValidation.warnings);
      } catch (error) {
        validation.components.robotsTxt = {
          isValid: false,
          error: error.message
        };
        validation.errors.push(`Robots.txt validation failed: ${error.message}`);
        validation.isValid = false;
      }

      // Validate canonical URLs for main pages
      const mainPages = ['/', '/news.html', '/portfolio.html', '/media.html', '/journal.html'];
      validation.components.canonicalUrls = {};
      
      mainPages.forEach(page => {
        try {
          const pageValidation = this.canonicalUrlManager.validateCanonicalSetup(page);
          validation.components.canonicalUrls[page] = pageValidation;
          
          if (!pageValidation.isValid) {
            validation.errors.push(...pageValidation.errors.map(err => `${page}: ${err}`));
            validation.isValid = false;
          }
          validation.warnings.push(...pageValidation.warnings.map(warn => `${page}: ${warn}`));
        } catch (error) {
          validation.components.canonicalUrls[page] = {
            isValid: false,
            error: error.message
          };
          validation.errors.push(`Canonical URL validation failed for ${page}: ${error.message}`);
          validation.isValid = false;
        }
      });

      return validation;
    } catch (error) {
      console.error('Failed to validate technical SEO components:', error);
      throw error;
    }
  }
}

// Create singleton instance
const technicalSeoManager = new TechnicalSeoManager();

export {
  SitemapGenerator,
  RobotsTxtManager,
  CanonicalUrlManager,
  TechnicalSeoManager,
  technicalSeoManager
};