/**
 * Content Schema Module
 * Generates structured data for content types
 */

export { default as ContentSchemaGenerator } from './schema-generator.js';

// Initialize content schema generator globally
if (typeof window !== 'undefined') {
    window.contentSchemaGenerator = new ContentSchemaGenerator();
}
