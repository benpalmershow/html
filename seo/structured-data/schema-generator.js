/**
 * Schema Generator Base Class
 * Provides core functionality for generating and injecting JSON-LD structured data
 */

import { injectJsonLd } from '../utils/dom-utils.js';
import { seoErrorHandler, safeExecute } from '../utils/error-handler.js';
import seoConfig from '../config/seo-config.js';

class SchemaGenerator {
  constructor() {
    this.baseContext = 'https://schema.org';
    this.injectedSchemas = new Map();
    this.validationEnabled = true;
  }

  /**
   * Generate base schema object with common properties
   * @param {string} type - Schema.org type
   * @param {Object} additionalProps - Additional schema properties
   * @returns {Object} Base schema object
   */
  generateBaseSchema(type, additionalProps = {}) {
    return safeExecute(() => {
      const baseSchema = {
        '@context': this.baseContext,
        '@type': type,
        ...additionalProps
      };

      seoErrorHandler.logDebug('schema_generation', `Generated base schema for type: ${type}`, {
        type,
        hasAdditionalProps: Object.keys(additionalProps).length > 0
      });

      return baseSchema;
    }, 'generateBaseSchema', {});
  }

  /**
   * Validate schema object against basic requirements
   * @param {Object} schema - Schema object to validate
   * @returns {boolean} Validation result
   */
  validateSchema(schema) {
    if (!this.validationEnabled) return true;

    return safeExecute(() => {
      // Basic validation checks
      if (!schema || typeof schema !== 'object') {
        throw new Error('Schema must be a valid object');
      }

      if (!schema['@context']) {
        throw new Error('Schema must include @context property');
      }

      if (!schema['@type']) {
        throw new Error('Schema must include @type property');
      }

      // Validate @context
      if (schema['@context'] !== this.baseContext) {
        seoErrorHandler.logWarning('schema_validation', 'Non-standard @context detected', {
          expected: this.baseContext,
          actual: schema['@context']
        });
      }

      // Check for required properties based on schema type
      const validationResult = this._validateSchemaType(schema);
      
      if (validationResult.isValid) {
        seoErrorHandler.logDebug('schema_validation', `Schema validation passed for type: ${schema['@type']}`);
      } else {
        seoErrorHandler.handleSchemaError(schema['@type'], validationResult.errors, schema);
      }

      return validationResult.isValid;
    }, 'validateSchema', false);
  }

  /**
   * Inject schema into document head
   * @param {Object} schema - Schema object to inject
   * @param {string} id - Optional ID for the script element
   * @returns {boolean} Success status
   */
  injectSchema(schema, id = null) {
    return safeExecute(() => {
      if (!this.validateSchema(schema)) {
        throw new Error(`Schema validation failed for type: ${schema['@type']}`);
      }

      // Generate unique ID if not provided
      const schemaId = id || `schema-${schema['@type'].toLowerCase()}-${Date.now()}`;
      
      // Track injected schema
      this.injectedSchemas.set(schemaId, {
        schema,
        timestamp: new Date().toISOString(),
        type: schema['@type']
      });

      // Inject into DOM
      injectJsonLd(schema, schemaId);

      seoErrorHandler.logDebug('schema_injection', `Successfully injected schema: ${schema['@type']}`, {
        schemaId,
        type: schema['@type']
      });

      return true;
    }, 'injectSchema', false);
  }

  /**
   * Remove injected schema by ID
   * @param {string} id - Schema ID to remove
   * @returns {boolean} Success status
   */
  removeSchema(id) {
    return safeExecute(() => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
        this.injectedSchemas.delete(id);
        
        seoErrorHandler.logDebug('schema_removal', `Removed schema with ID: ${id}`);
        return true;
      }
      
      seoErrorHandler.logWarning('schema_removal', `Schema with ID ${id} not found`);
      return false;
    }, 'removeSchema', false);
  }

  /**
   * Get all injected schemas
   * @returns {Map} Map of injected schemas
   */
  getInjectedSchemas() {
    return new Map(this.injectedSchemas);
  }

  /**
   * Clear all injected schemas
   */
  clearAllSchemas() {
    safeExecute(() => {
      this.injectedSchemas.forEach((_, id) => {
        this.removeSchema(id);
      });
      
      seoErrorHandler.logDebug('schema_management', 'Cleared all injected schemas');
    }, 'clearAllSchemas');
  }

  /**
   * Enable or disable schema validation
   * @param {boolean} enabled - Whether to enable validation
   */
  setValidationEnabled(enabled) {
    this.validationEnabled = enabled;
    seoErrorHandler.logDebug('schema_config', `Schema validation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Generate schema with site configuration
   * @param {Object} schemaData - Schema-specific data
   * @param {string} type - Schema type
   * @returns {Object} Complete schema object
   */
  generateSchemaWithSiteConfig(schemaData, type) {
    return safeExecute(() => {
      const siteConfig = seoConfig.getSiteConfig();
      
      const schema = this.generateBaseSchema(type, {
        ...schemaData,
        url: schemaData.url || siteConfig.url,
        publisher: schemaData.publisher || {
          '@type': 'Organization',
          name: siteConfig.name,
          url: siteConfig.url,
          logo: {
            '@type': 'ImageObject',
            url: `${siteConfig.url}${siteConfig.logo}`
          }
        }
      });

      return schema;
    }, 'generateSchemaWithSiteConfig', {});
  }

  /**
   * Batch inject multiple schemas
   * @param {Array<Object>} schemas - Array of schema objects
   * @returns {Array<boolean>} Array of injection results
   */
  batchInjectSchemas(schemas) {
    if (!Array.isArray(schemas)) {
      seoErrorHandler.logError('batch_injection', 'Schemas must be provided as an array');
      return [];
    }

    return schemas.map((schema, index) => {
      const id = `batch-schema-${index}-${Date.now()}`;
      return this.injectSchema(schema, id);
    });
  }

  /**
   * Validate schema type-specific requirements
   * @param {Object} schema - Schema to validate
   * @returns {Object} Validation result with errors
   * @private
   */
  _validateSchemaType(schema) {
    const type = schema['@type'];
    const errors = [];

    // Common validation rules for different schema types
    switch (type) {
      case 'Article':
        if (!schema.headline) errors.push('Article schema requires headline property');
        if (!schema.author) errors.push('Article schema requires author property');
        if (!schema.datePublished) errors.push('Article schema requires datePublished property');
        break;

      case 'Organization':
        if (!schema.name) errors.push('Organization schema requires name property');
        if (!schema.url) errors.push('Organization schema requires url property');
        break;

      case 'BreadcrumbList':
        if (!schema.itemListElement || !Array.isArray(schema.itemListElement)) {
          errors.push('BreadcrumbList schema requires itemListElement array');
        }
        break;

      case 'MediaObject':
        if (!schema.contentUrl && !schema.embedUrl) {
          errors.push('MediaObject schema requires contentUrl or embedUrl');
        }
        break;

      default:
        // Generic validation for unknown types
        seoErrorHandler.logWarning('schema_validation', `Unknown schema type: ${type}`, { type });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get schema statistics
   * @returns {Object} Statistics about injected schemas
   */
  getSchemaStats() {
    const stats = {
      totalSchemas: this.injectedSchemas.size,
      schemaTypes: {},
      oldestSchema: null,
      newestSchema: null
    };

    this.injectedSchemas.forEach((data, id) => {
      // Count by type
      const type = data.type;
      stats.schemaTypes[type] = (stats.schemaTypes[type] || 0) + 1;

      // Track oldest and newest
      const timestamp = new Date(data.timestamp);
      if (!stats.oldestSchema || timestamp < new Date(stats.oldestSchema.timestamp)) {
        stats.oldestSchema = { id, ...data };
      }
      if (!stats.newestSchema || timestamp > new Date(stats.newestSchema.timestamp)) {
        stats.newestSchema = { id, ...data };
      }
    });

    return stats;
  }
}

export default SchemaGenerator;