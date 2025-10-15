/**
 * Structured Data Module Index
 * Exports all schema generators for easy importing
 */

import SchemaGenerator from './schema-generator.js';
import ArticleSchemaGenerator from './article-schema.js';
import OrganizationSchemaGenerator from './organization-schema.js';
import BreadcrumbSchemaGenerator from './breadcrumb-schema.js';

// Create singleton instances
export const schemaGenerator = new SchemaGenerator();
export const articleSchemaGenerator = new ArticleSchemaGenerator();
export const organizationSchemaGenerator = new OrganizationSchemaGenerator();
export const breadcrumbSchemaGenerator = new BreadcrumbSchemaGenerator();

// Export classes for custom instantiation
export {
  SchemaGenerator,
  ArticleSchemaGenerator,
  OrganizationSchemaGenerator,
  BreadcrumbSchemaGenerator
};

/**
 * Convenience function to inject all site identity schemas
 * @param {Object} options - Generation options
 * @returns {Array<boolean>} Array of injection results
 */
export function injectSiteIdentitySchemas(options = {}) {
  return organizationSchemaGenerator.injectSiteIdentitySchemas(options);
}

/**
 * Convenience function to inject article schema with auto-detection
 * @param {HTMLElement|Object} source - Article element or metadata
 * @param {Object} options - Generation options
 * @returns {boolean} Injection success status
 */
export function injectArticleSchema(source, options = {}) {
  return articleSchemaGenerator.injectArticleSchema(source, options);
}

/**
 * Convenience function to inject breadcrumb schema with auto-detection
 * @param {Array<Object>|HTMLElement|string} source - Breadcrumb source
 * @param {Object} options - Generation options
 * @returns {boolean} Injection success status
 */
export function injectBreadcrumbSchema(source, options = {}) {
  return breadcrumbSchemaGenerator.injectBreadcrumbSchema(source, options);
}

/**
 * Initialize all basic schemas for a page
 * @param {Object} options - Initialization options
 * @returns {Object} Results of all schema injections
 */
export function initializePageSchemas(options = {}) {
  const results = {
    siteIdentity: false,
    breadcrumbs: false,
    article: false
  };

  // Inject site identity schemas (organization + website)
  const siteResults = injectSiteIdentitySchemas(options.siteIdentity || {});
  results.siteIdentity = siteResults.every(result => result === true);

  // Inject breadcrumbs if enabled
  if (options.breadcrumbs !== false) {
    results.breadcrumbs = injectBreadcrumbSchema(
      options.breadcrumbs?.source || window.location.pathname,
      options.breadcrumbs || {}
    );
  }

  // Inject article schema if article content is detected
  if (options.article || document.querySelector('article, .article, [role="article"]')) {
    const articleElement = options.article?.element || 
                          document.querySelector('article, .article, [role="article"]');
    
    if (articleElement) {
      results.article = injectArticleSchema(articleElement, options.article || {});
    }
  }

  return results;
}

export default {
  schemaGenerator,
  articleSchemaGenerator,
  organizationSchemaGenerator,
  breadcrumbSchemaGenerator,
  injectSiteIdentitySchemas,
  injectArticleSchema,
  injectBreadcrumbSchema,
  initializePageSchemas
};