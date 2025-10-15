/**
 * Content Extraction and Processing Utilities
 * Provides functions for extracting and processing content for SEO
 */

/**
 * Extract text content from HTML element
 * @param {HTMLElement} element - Element to extract text from
 * @returns {string} Extracted text content
 */
export function extractTextContent(element) {
  if (!element) return '';
  
  // Remove script and style elements
  const clone = element.cloneNode(true);
  const scripts = clone.querySelectorAll('script, style');
  scripts.forEach(script => script.remove());
  
  return clone.textContent || clone.innerText || '';
}

/**
 * Generate meta description from content
 * @param {string} content - Content to generate description from
 * @param {number} maxLength - Maximum description length
 * @returns {string} Generated meta description
 */
export function generateMetaDescription(content, maxLength = 160) {
  if (!content || typeof content !== 'string') return '';
  
  // Clean up the content
  const cleaned = content
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  if (cleaned.length <= maxLength) return cleaned;
  
  // Find the last complete sentence within the limit
  const truncated = cleaned.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSentence > maxLength * 0.7) {
    return cleaned.substring(0, lastSentence + 1);
  } else if (lastSpace > maxLength * 0.8) {
    return cleaned.substring(0, lastSpace) + '...';
  } else {
    return truncated + '...';
  }
}

/**
 * Extract keywords from content
 * @param {string} content - Content to extract keywords from
 * @param {number} maxKeywords - Maximum number of keywords
 * @returns {Array<string>} Extracted keywords
 */
export function extractKeywords(content, maxKeywords = 10) {
  if (!content || typeof content !== 'string') return [];
  
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);
  
  // Extract words and count frequency
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Extract first image from content
 * @param {HTMLElement} element - Element to search for images
 * @returns {string|null} First image URL or null
 */
export function extractFirstImage(element) {
  if (!element) return null;
  
  const img = element.querySelector('img');
  if (!img) return null;
  
  return img.src || img.getAttribute('data-src') || null;
}

/**
 * Extract heading hierarchy from content
 * @param {HTMLElement} element - Element to extract headings from
 * @returns {Array<Object>} Array of heading objects with level and text
 */
export function extractHeadings(element) {
  if (!element) return [];
  
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  return Array.from(headings).map(heading => ({
    level: parseInt(heading.tagName.charAt(1)),
    text: extractTextContent(heading),
    id: heading.id || null
  }));
}

/**
 * Extract article metadata from content
 * @param {HTMLElement} element - Article element
 * @returns {Object} Article metadata
 */
export function extractArticleMetadata(element) {
  if (!element) return {};
  
  const metadata = {};
  
  // Extract title (first h1 or title attribute)
  const h1 = element.querySelector('h1');
  if (h1) {
    metadata.title = extractTextContent(h1);
  }
  
  // Extract author from meta tags or data attributes
  const authorMeta = element.querySelector('[name="author"], [property="article:author"]');
  if (authorMeta) {
    metadata.author = authorMeta.content;
  }
  
  // Extract publication date
  const dateMeta = element.querySelector('[name="date"], [property="article:published_time"]');
  const timeElement = element.querySelector('time[datetime]');
  if (dateMeta) {
    metadata.publishedDate = dateMeta.content;
  } else if (timeElement) {
    metadata.publishedDate = timeElement.getAttribute('datetime');
  }
  
  // Extract description
  const descMeta = element.querySelector('[name="description"], [property="og:description"]');
  if (descMeta) {
    metadata.description = descMeta.content;
  } else {
    // Generate from content
    const content = extractTextContent(element);
    metadata.description = generateMetaDescription(content);
  }
  
  // Extract image
  metadata.image = extractFirstImage(element);
  
  // Extract keywords
  const keywordsMeta = element.querySelector('[name="keywords"]');
  if (keywordsMeta) {
    metadata.keywords = keywordsMeta.content.split(',').map(k => k.trim());
  } else {
    const content = extractTextContent(element);
    metadata.keywords = extractKeywords(content);
  }
  
  return metadata;
}

/**
 * Clean and sanitize text for SEO use
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces
    .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs
    .trim();
}

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return text.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}