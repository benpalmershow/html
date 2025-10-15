/**
 * SEO Configuration Validation Utilities
 * Provides validation functions for SEO configuration data
 */

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} Validation result
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate meta title
 * @param {string} title - Title to validate
 * @param {number} maxLength - Maximum allowed length (default: 60)
 * @returns {Object} Validation result with details
 */
export function validateTitle(title, maxLength = 60) {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required and must be a string' };
  }

  if (title.length > maxLength) {
    return { 
      valid: false, 
      error: `Title exceeds maximum length of ${maxLength} characters (current: ${title.length})` 
    };
  }

  if (title.length < 10) {
    return { 
      valid: false, 
      error: 'Title should be at least 10 characters long' 
    };
  }

  return { valid: true };
}

/**
 * Validate meta description
 * @param {string} description - Description to validate
 * @param {number} maxLength - Maximum allowed length (default: 160)
 * @returns {Object} Validation result with details
 */
export function validateDescription(description, maxLength = 160) {
  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'Description is required and must be a string' };
  }

  if (description.length > maxLength) {
    return { 
      valid: false, 
      error: `Description exceeds maximum length of ${maxLength} characters (current: ${description.length})` 
    };
  }

  if (description.length < 50) {
    return { 
      valid: false, 
      error: 'Description should be at least 50 characters long' 
    };
  }

  return { valid: true };
}

/**
 * Validate keywords array
 * @param {Array} keywords - Keywords to validate
 * @returns {Object} Validation result with details
 */
export function validateKeywords(keywords) {
  if (!keywords) {
    return { valid: true }; // Keywords are optional
  }

  if (!Array.isArray(keywords)) {
    return { valid: false, error: 'Keywords must be an array' };
  }

  if (keywords.length > 10) {
    return { valid: false, error: 'Maximum 10 keywords allowed' };
  }

  for (const keyword of keywords) {
    if (typeof keyword !== 'string' || keyword.trim().length === 0) {
      return { valid: false, error: 'All keywords must be non-empty strings' };
    }
  }

  return { valid: true };
}

/**
 * Validate Open Graph image
 * @param {string} ogImage - Image URL to validate
 * @returns {Object} Validation result with details
 */
export function validateOgImage(ogImage) {
  if (!ogImage) {
    return { valid: true }; // OG image is optional
  }

  if (typeof ogImage !== 'string') {
    return { valid: false, error: 'OG image must be a string URL' };
  }

  // Check if it's a valid URL or relative path
  if (!ogImage.startsWith('/') && !validateUrl(ogImage)) {
    return { valid: false, error: 'OG image must be a valid URL or relative path' };
  }

  // Check for common image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const hasValidExtension = imageExtensions.some(ext => 
    ogImage.toLowerCase().includes(ext)
  );

  if (!hasValidExtension) {
    return { 
      valid: false, 
      error: 'OG image should have a valid image extension (.jpg, .png, .webp, etc.)' 
    };
  }

  return { valid: true };
}

/**
 * Validate complete page configuration
 * @param {Object} config - Page configuration to validate
 * @returns {Object} Validation result with details
 */
export function validatePageConfiguration(config) {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Configuration must be an object' };
  }

  const errors = [];

  // Validate title
  if (config.title) {
    const titleValidation = validateTitle(config.title);
    if (!titleValidation.valid) {
      errors.push(titleValidation.error);
    }
  }

  // Validate description
  if (config.description) {
    const descValidation = validateDescription(config.description);
    if (!descValidation.valid) {
      errors.push(descValidation.error);
    }
  }

  // Validate keywords
  if (config.keywords) {
    const keywordsValidation = validateKeywords(config.keywords);
    if (!keywordsValidation.valid) {
      errors.push(keywordsValidation.error);
    }
  }

  // Validate OG image
  if (config.ogImage) {
    const ogImageValidation = validateOgImage(config.ogImage);
    if (!ogImageValidation.valid) {
      errors.push(ogImageValidation.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate site configuration
 * @param {Object} config - Site configuration to validate
 * @returns {Object} Validation result with details
 */
export function validateSiteConfiguration(config) {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Site configuration must be an object' };
  }

  const errors = [];
  const required = ['name', 'description', 'url'];

  // Check required fields
  for (const field of required) {
    if (!config[field] || typeof config[field] !== 'string') {
      errors.push(`${field} is required and must be a string`);
    }
  }

  // Validate URL
  if (config.url && !validateUrl(config.url)) {
    errors.push('URL must be a valid URL');
  }

  // Validate social profiles
  if (config.social && typeof config.social !== 'object') {
    errors.push('Social profiles must be an object');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}