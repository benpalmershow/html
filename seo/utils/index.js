/**
 * SEO Utilities Index
 * Exports all SEO utility functions and classes
 */

// URL utilities
export {
  normalizeUrl,
  generateCanonicalUrl,
  extractSlug,
  generateSlug,
  isValidUrl,
  isInternalUrl,
  getCurrentPath,
  getCurrentUrl
} from './url-utils.js';

// Content utilities
export {
  extractTextContent,
  generateMetaDescription,
  extractKeywords,
  extractFirstImage,
  extractHeadings,
  extractArticleMetadata,
  sanitizeText,
  truncateText
} from './content-utils.js';

// DOM utilities
export {
  injectMetaTag,
  injectOgTag,
  injectTwitterTag,
  injectJsonLd,
  setCanonicalUrl,
  setPageTitle,
  addPreloadLink,
  addDnsPrefetch,
  setRobotsDirectives,
  addHreflangLinks,
  waitForDom,
  safeQuerySelector,
  safeQuerySelectorAll,
  setViewportMeta,
  batchInjectMetaTags
} from './dom-utils.js';

// Error handling
export {
  seoErrorHandler,
  safeExecute,
  safeExecuteAsync,
  validateAndExecute
} from './error-handler.js';

// Configuration and validation
export { default as seoConfig } from '../config/seo-config.js';
export {
  validateUrl,
  validateTitle,
  validateDescription,
  validateKeywords,
  validateOgImage,
  validatePageConfiguration,
  validateSiteConfiguration
} from '../config/validation.js';