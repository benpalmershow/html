/**
 * XML Sitemap Generator
 * Generates XML sitemaps for all HTML pages with proper priority and lastmod dates
 */

import { urlUtils } from '../utils/url-utils.js';
import { errorHandler } from '../utils/error-handler.js';
import { seoConfig } from '../config/seo-config.js';

class SitemapGenerator {
  constructor() {
    this.baseUrl = seoConfig.site.url;
    this.pages = [];
    this.lastGenerated = null;
  }

  /**
   * Discover all HTML pages in the site
   * @returns {Array} Array of page objects with URL and metadata
   */
  async discoverPages() {
    try {
      const pages = [];
      
      // Main pages with their priorities and change frequencies
      const mainPages = [
        { url: '/', priority: 1.0, changefreq: 'daily', lastmod: new Date() },
        { url: '/news.html', priority: 0.9, changefreq: 'daily', lastmod: new Date() },
        { url: '/portfolio.html', priority: 0.8, changefreq: 'weekly', lastmod: new Date() },
        { url: '/media.html', priority: 0.7, changefreq: 'weekly', lastmod: new Date() },
        { url: '/journal.html', priority: 0.7, changefreq: 'weekly', lastmod: new Date() },
        { url: '/financials.html', priority: 0.6, changefreq: 'monthly', lastmod: new Date() },
        { url: '/read.html', priority: 0.5, changefreq: 'monthly', lastmod: new Date() },
        { url: '/post-creator.html', priority: 0.3, changefreq: 'yearly', lastmod: new Date() }
      ];

      // Article pages with medium priority
      const articlePages = [
        { url: '/article/barrett_v_us.html', priority: 0.6, changefreq: 'monthly' },
        { url: '/article/chiles_v_salazar.html', priority: 0.6, changefreq: 'monthly' },
        { url: '/article/fiber.html', priority: 0.6, changefreq: 'monthly' },
        { url: '/article/health.html', priority: 0.6, changefreq: 'monthly' },
        { url: '/article/urban_crime_2020.html', priority: 0.6, changefreq: 'monthly' }
      ];

      // Add lastmod dates for articles (using current date as placeholder)
      articlePages.forEach(page => {
        page.lastmod = new Date();
      });

      pages.push(...mainPages, ...articlePages);
      
      this.pages = pages;
      return pages;
    } catch (error) {
      errorHandler.logError('SitemapGenerator.discoverPages', error);
      throw error;
    }
  }

  /**
   * Calculate priority based on page type and content
   * @param {string} url - Page URL
   * @param {Object} metadata - Page metadata
   * @returns {number} Priority value between 0.0 and 1.0
   */
  calculatePriority(url, metadata = {}) {
    // Homepage gets highest priority
    if (url === '/' || url === '/index.html') {
      return 1.0;
    }
    
    // News and current content get high priority
    if (url.includes('/news')) {
      return 0.9;
    }
    
    // Portfolio and financial content
    if (url.includes('/portfolio') || url.includes('/financials')) {
      return 0.8;
    }
    
    // Media and journal content
    if (url.includes('/media') || url.includes('/journal')) {
      return 0.7;
    }
    
    // Article content
    if (url.includes('/article/')) {
      return 0.6;
    }
    
    // Other pages
    return 0.5;
  }

  /**
   * Calculate last modification date
   * @param {string} url - Page URL
   * @param {Object} metadata - Page metadata
   * @returns {Date} Last modification date
   */
  calculateLastMod(url, metadata = {}) {
    // If metadata provides lastmod, use it
    if (metadata.lastmod) {
      return new Date(metadata.lastmod);
    }
    
    // For dynamic content pages, use current date
    if (url.includes('/news') || url.includes('/portfolio') || url.includes('/journal')) {
      return new Date();
    }
    
    // For static content, use a reasonable default
    return new Date('2024-01-01');
  }

  /**
   * Generate XML sitemap content
   * @returns {string} XML sitemap content
   */
  async generateSitemap() {
    try {
      await this.discoverPages();
      
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      for (const page of this.pages) {
        const fullUrl = urlUtils.buildAbsoluteUrl(page.url, this.baseUrl);
        const lastmod = page.lastmod.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        xml += '  <url>\n';
        xml += `    <loc>${fullUrl}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority.toFixed(1)}</priority>\n`;
        xml += '  </url>\n';
      }
      
      xml += '</urlset>';
      
      this.lastGenerated = new Date();
      return xml;
    } catch (error) {
      errorHandler.logError('SitemapGenerator.generateSitemap', error);
      throw error;
    }
  }

  /**
   * Generate sitemap index for large sites
   * @param {Array} sitemaps - Array of sitemap URLs
   * @returns {string} XML sitemap index content
   */
  generateSitemapIndex(sitemaps = []) {
    try {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      // Add main sitemap
      const mainSitemapUrl = urlUtils.buildAbsoluteUrl('/sitemap.xml', this.baseUrl);
      xml += '  <sitemap>\n';
      xml += `    <loc>${mainSitemapUrl}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += '  </sitemap>\n';
      
      // Add additional sitemaps if provided
      sitemaps.forEach(sitemapUrl => {
        const fullUrl = urlUtils.buildAbsoluteUrl(sitemapUrl, this.baseUrl);
        xml += '  <sitemap>\n';
        xml += `    <loc>${fullUrl}</loc>\n`;
        xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
        xml += '  </sitemap>\n';
      });
      
      xml += '</sitemapindex>';
      
      return xml;
    } catch (error) {
      errorHandler.logError('SitemapGenerator.generateSitemapIndex', error);
      throw error;
    }
  }

  /**
   * Save sitemap to file system
   * @param {string} content - XML content to save
   * @param {string} filename - Filename (default: sitemap.xml)
   */
  async saveSitemap(content, filename = 'sitemap.xml') {
    try {
      // In a real implementation, this would write to the file system
      // For now, we'll return the content for manual saving
      console.log(`Sitemap generated: ${filename}`);
      console.log(`Content length: ${content.length} characters`);
      console.log(`Pages included: ${this.pages.length}`);
      
      return {
        filename,
        content,
        pageCount: this.pages.length,
        generatedAt: this.lastGenerated
      };
    } catch (error) {
      errorHandler.logError('SitemapGenerator.saveSitemap', error);
      throw error;
    }
  }

  /**
   * Get sitemap statistics
   * @returns {Object} Sitemap statistics
   */
  getStats() {
    return {
      totalPages: this.pages.length,
      lastGenerated: this.lastGenerated,
      pagesByPriority: this.pages.reduce((acc, page) => {
        const priority = page.priority.toString();
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {}),
      pagesByChangeFreq: this.pages.reduce((acc, page) => {
        acc[page.changefreq] = (acc[page.changefreq] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

export { SitemapGenerator };