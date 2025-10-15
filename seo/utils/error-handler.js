/**
 * SEO Error Handling and Logging System
 * Provides centralized error handling and logging for SEO operations
 */

class SEOErrorHandler {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.debugMode = false;
    this.maxLogEntries = 100;
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Log an error
   * @param {string} operation - SEO operation that failed
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context information
   */
  logError(operation, error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      operation,
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : null,
      context
    };

    this.errors.push(errorEntry);
    this._trimLogs();

    // Log to console in debug mode
    if (this.debugMode) {
      console.error(`[SEO Error] ${operation}:`, error, context);
    }

    // Send to external logging service if configured
    this._sendToExternalLogger(errorEntry);
  }

  /**
   * Log a warning
   * @param {string} operation - SEO operation
   * @param {string} message - Warning message
   * @param {Object} context - Additional context information
   */
  logWarning(operation, message, context = {}) {
    const warningEntry = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      operation,
      message,
      context
    };

    this.warnings.push(warningEntry);
    this._trimLogs();

    // Log to console in debug mode
    if (this.debugMode) {
      console.warn(`[SEO Warning] ${operation}:`, message, context);
    }

    this._sendToExternalLogger(warningEntry);
  }

  /**
   * Log debug information
   * @param {string} operation - SEO operation
   * @param {string} message - Debug message
   * @param {Object} context - Additional context information
   */
  logDebug(operation, message, context = {}) {
    if (!this.debugMode) return;

    const debugEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      operation,
      message,
      context
    };

    console.log(`[SEO Debug] ${operation}:`, message, context);
    this._sendToExternalLogger(debugEntry);
  }

  /**
   * Handle schema validation errors
   * @param {string} schemaType - Type of schema that failed
   * @param {Object} validationErrors - Validation error details
   * @param {Object} schemaData - The schema data that failed
   */
  handleSchemaError(schemaType, validationErrors, schemaData) {
    this.logError('schema_validation', `Schema validation failed for ${schemaType}`, {
      schemaType,
      validationErrors,
      schemaData: this.debugMode ? schemaData : '[hidden]'
    });
  }

  /**
   * Handle meta tag injection errors
   * @param {string} tagName - Name of the meta tag
   * @param {string} content - Content that failed to inject
   * @param {Error} error - The error that occurred
   */
  handleMetaTagError(tagName, content, error) {
    this.logError('meta_tag_injection', `Failed to inject meta tag: ${tagName}`, {
      tagName,
      content: content ? content.substring(0, 100) : null,
      error: error.message
    });
  }

  /**
   * Handle performance issues
   * @param {string} operation - Performance-related operation
   * @param {number} duration - Operation duration in milliseconds
   * @param {number} threshold - Performance threshold
   */
  handlePerformanceIssue(operation, duration, threshold) {
    if (duration > threshold) {
      this.logWarning('performance', `Slow SEO operation: ${operation}`, {
        operation,
        duration,
        threshold,
        exceedsBy: duration - threshold
      });
    }
  }

  /**
   * Get all logged errors
   * @returns {Array} Array of error entries
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get all logged warnings
   * @returns {Array} Array of warning entries
   */
  getWarnings() {
    return [...this.warnings];
  }

  /**
   * Get error summary
   * @returns {Object} Summary of errors and warnings
   */
  getSummary() {
    return {
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      lastError: this.errors[this.errors.length - 1] || null,
      lastWarning: this.warnings[this.warnings.length - 1] || null
    };
  }

  /**
   * Clear all logged entries
   */
  clearLogs() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Export logs for external analysis
   * @returns {Object} All logs in structured format
   */
  exportLogs() {
    return {
      timestamp: new Date().toISOString(),
      errors: this.getErrors(),
      warnings: this.getWarnings(),
      summary: this.getSummary()
    };
  }

  /**
   * Trim logs to prevent memory issues
   * @private
   */
  _trimLogs() {
    if (this.errors.length > this.maxLogEntries) {
      this.errors = this.errors.slice(-this.maxLogEntries);
    }
    if (this.warnings.length > this.maxLogEntries) {
      this.warnings = this.warnings.slice(-this.maxLogEntries);
    }
  }

  /**
   * Send logs to external logging service
   * @param {Object} logEntry - Log entry to send
   * @private
   */
  _sendToExternalLogger(logEntry) {
    // Placeholder for external logging integration
    // Could integrate with services like LogRocket, Sentry, etc.
    if (typeof window !== 'undefined' && window.gtag) {
      // Send to Google Analytics as custom event
      window.gtag('event', 'seo_error', {
        event_category: 'SEO',
        event_label: logEntry.operation,
        value: logEntry.level === 'error' ? 1 : 0
      });
    }
  }
}

/**
 * Safe execution wrapper for SEO operations
 * @param {Function} operation - Function to execute safely
 * @param {string} operationName - Name of the operation for logging
 * @param {*} fallbackValue - Value to return if operation fails
 * @returns {*} Operation result or fallback value
 */
export function safeExecute(operation, operationName, fallbackValue = null) {
  try {
    const startTime = performance.now();
    const result = operation();
    const duration = performance.now() - startTime;
    
    // Log performance issues
    seoErrorHandler.handlePerformanceIssue(operationName, duration, 100);
    
    return result;
  } catch (error) {
    seoErrorHandler.logError(operationName, error);
    return fallbackValue;
  }
}

/**
 * Async safe execution wrapper
 * @param {Function} operation - Async function to execute safely
 * @param {string} operationName - Name of the operation for logging
 * @param {*} fallbackValue - Value to return if operation fails
 * @returns {Promise<*>} Operation result or fallback value
 */
export async function safeExecuteAsync(operation, operationName, fallbackValue = null) {
  try {
    const startTime = performance.now();
    const result = await operation();
    const duration = performance.now() - startTime;
    
    seoErrorHandler.handlePerformanceIssue(operationName, duration, 200);
    
    return result;
  } catch (error) {
    seoErrorHandler.logError(operationName, error);
    return fallbackValue;
  }
}

/**
 * Validate and execute SEO operation
 * @param {Function} validator - Validation function
 * @param {Function} operation - Operation to execute if validation passes
 * @param {string} operationName - Name of the operation
 * @param {*} fallbackValue - Fallback value if validation fails
 * @returns {*} Operation result or fallback value
 */
export function validateAndExecute(validator, operation, operationName, fallbackValue = null) {
  try {
    const isValid = validator();
    if (!isValid) {
      seoErrorHandler.logWarning(operationName, 'Validation failed, skipping operation');
      return fallbackValue;
    }
    
    return safeExecute(operation, operationName, fallbackValue);
  } catch (error) {
    seoErrorHandler.logError(operationName, error);
    return fallbackValue;
  }
}

// Export singleton instance
export const seoErrorHandler = new SEOErrorHandler();
export default seoErrorHandler;