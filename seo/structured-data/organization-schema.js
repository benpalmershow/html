/**
 * Organization Schema Generator
 * Generates Organization and Website schema markup for site-wide branding
 */

import SchemaGenerator from './schema-generator.js';
import {
    seoErrorHandler,
    safeExecute
} from '../utils/error-handler.js';
import seoConfig from '../config/seo-config.js';

class OrganizationSchemaGenerator extends SchemaGenerator {
    constructor() {
        super();
    }

    /**
     * Generate organization schema for the site
     * @param {Object} options - Additional options for schema generation
     * @returns {Object} Organization schema object
     */
    generateOrganizationSchema(options = {}) {
        return safeExecute(() => {
            const siteConfig = seoConfig.getSiteConfig();

            const organizationData = {
                name: options.name || siteConfig.name,
                url: options.url || siteConfig.url,
                logo: this._prepareLogo(siteConfig, options.logo),
                description: options.description || siteConfig.description,
                foundingDate: options.foundingDate,
                founder: this._prepareFounder(options.founder),
                contactPoint: this._prepareContactPoint(options.contactPoint),
                sameAs: this._prepareSocialProfiles(siteConfig.social, options.socialProfiles)
            };

            // Remove undefined properties
            Object.keys(organizationData).forEach(key => {
                if (organizationData[key] === undefined) {
                    delete organizationData[key];
                }
            });

            const schema = this.generateBaseSchema('Organization', organizationData);

            seoErrorHandler.logDebug('organization_schema', 'Generated organization schema', {
                name: organizationData.name,
                hasSocialProfiles: organizationData.sameAs && organizationData.sameAs.length > 0,
                hasContactPoint: !!organizationData.contactPoint
            });

            return schema;
        }, 'generateOrganizationSchema', {});
    }

    /**
     * Generate website schema for the site
     * @param {Object} options - Additional options for schema generation
     * @returns {Object} Website schema object
     */
    generateWebsiteSchema(options = {}) {
        return safeExecute(() => {
            const siteConfig = seoConfig.getSiteConfig();

            const websiteData = {
                name: options.name || siteConfig.name,
                url: options.url || siteConfig.url,
                description: options.description || siteConfig.description,
                publisher: this._preparePublisher(siteConfig, options.publisher),
                potentialAction: this._prepareSearchAction(siteConfig, options.searchAction),
                inLanguage: options.language || 'en-US',
                copyrightYear: options.copyrightYear || new Date().getFullYear(),
                copyrightHolder: this._prepareCopyrightHolder(siteConfig, options.copyrightHolder)
            };

            // Remove undefined properties
            Object.keys(websiteData).forEach(key => {
                if (websiteData[key] === undefined) {
                    delete websiteData[key];
                }
            });

            const schema = this.generateBaseSchema('WebSite', websiteData);

            seoErrorHandler.logDebug('website_schema', 'Generated website schema', {
                name: websiteData.name,
                hasSearchAction: !!websiteData.potentialAction,
                language: websiteData.inLanguage
            });

            return schema;
        }, 'generateWebsiteSchema', {});
    }

    /**
     * Generate person schema for the site author/founder
     * @param {Object} options - Person data and options
     * @returns {Object} Person schema object
     */
    generatePersonSchema(options = {}) {
        return safeExecute(() => {
            const siteConfig = seoConfig.getSiteConfig();

            const personData = {
                name: options.name || siteConfig.author || 'Ben Palmer',
                url: options.url || siteConfig.url,
                description: options.description || 'Independent commentator and economic analyst',
                jobTitle: options.jobTitle || 'Independent Commentator',
                worksFor: this._prepareWorksFor(siteConfig, options.worksFor),
                sameAs: this._prepareSocialProfiles(siteConfig.social, options.socialProfiles),
                knowsAbout: options.knowsAbout || [
                    'Economic Analysis',
                    'Financial Markets',
                    'Independent Commentary',
                    'Market Research'
                ]
            };

            // Add image if provided
            if (options.image) {
                personData.image = this._preparePersonImage(options.image, siteConfig);
            }

            // Remove undefined properties
            Object.keys(personData).forEach(key => {
                if (personData[key] === undefined) {
                    delete personData[key];
                }
            });

            const schema = this.generateBaseSchema('Person', personData);

            seoErrorHandler.logDebug('person_schema', 'Generated person schema', {
                name: personData.name,
                hasImage: !!personData.image,
                hasSocialProfiles: personData.sameAs && personData.sameAs.length > 0
            });

            return schema;
        }, 'generatePersonSchema', {});
    }

    /**
     * Generate complete site identity schema (Organization + Website)
     * @param {Object} options - Generation options
     * @returns {Array<Object>} Array of schema objects
     */
    generateSiteIdentitySchemas(options = {}) {
        return safeExecute(() => {
            const schemas = [];

            // Generate organization schema
            const orgSchema = this.generateOrganizationSchema(options.organization || {});
            if (orgSchema && Object.keys(orgSchema).length > 0) {
                schemas.push(orgSchema);
            }

            // Generate website schema
            const websiteSchema = this.generateWebsiteSchema(options.website || {});
            if (websiteSchema && Object.keys(websiteSchema).length > 0) {
                schemas.push(websiteSchema);
            }

            // Generate person schema if requested
            if (options.includePerson) {
                const personSchema = this.generatePersonSchema(options.person || {});
                if (personSchema && Object.keys(personSchema).length > 0) {
                    schemas.push(personSchema);
                }
            }

            seoErrorHandler.logDebug('site_identity_schemas', 'Generated site identity schemas', {
                schemaCount: schemas.length,
                types: schemas.map(s => s['@type'])
            });

            return schemas;
        }, 'generateSiteIdentitySchemas', []);
    }

    /**
     * Inject organization schema into page
     * @param {Object} options - Generation and injection options
     * @returns {boolean} Success status
     */
    injectOrganizationSchema(options = {}) {
        return safeExecute(() => {
            const schema = this.generateOrganizationSchema(options);
            const schemaId = options.id || 'organization-schema';
            return this.injectSchema(schema, schemaId);
        }, 'injectOrganizationSchema', false);
    }

    /**
     * Inject website schema into page
     * @param {Object} options - Generation and injection options
     * @returns {boolean} Success status
     */
    injectWebsiteSchema(options = {}) {
        return safeExecute(() => {
            const schema = this.generateWebsiteSchema(options);
            const schemaId = options.id || 'website-schema';
            return this.injectSchema(schema, schemaId);
        }, 'injectWebsiteSchema', false);
    }

    /**
     * Inject complete site identity schemas
     * @param {Object} options - Generation and injection options
     * @returns {Array<boolean>} Array of injection results
     */
    injectSiteIdentitySchemas(options = {}) {
        return safeExecute(() => {
            const schemas = this.generateSiteIdentitySchemas(options);
            const results = [];

            schemas.forEach((schema, index) => {
                const schemaType = schema['@type'].toLowerCase();
                const schemaId = `${schemaType}-schema-${index}`;
                results.push(this.injectSchema(schema, schemaId));
            });

            return results;
        }, 'injectSiteIdentitySchemas', []);
    }

    /**
     * Prepare logo object for schema
     * @param {Object} siteConfig - Site configuration
     * @param {string|Object} override - Override logo
     * @returns {Object} Logo schema object
     * @private
     */
    _prepareLogo(siteConfig, override) {
        if (override && typeof override === 'object') {
            return override;
        }

        const logoUrl = override || siteConfig.logo;
        if (!logoUrl) return undefined;

        const fullLogoUrl = logoUrl.startsWith('/') ? `${siteConfig.url}${logoUrl}` : logoUrl;

        return {
            '@type': 'ImageObject',
            url: fullLogoUrl,
            width: 600,
            height: 60
        };
    }

    /**
     * Prepare founder information for schema
     * @param {Object} founder - Founder information
     * @returns {Object|undefined} Founder schema object
     * @private
     */
    _prepareFounder(founder) {
        if (!founder) return undefined;

        if (typeof founder === 'string') {
            return {
                '@type': 'Person',
                name: founder
            };
        }

        return {
            '@type': 'Person',
            ...founder
        };
    }

    /**
     * Prepare contact point for schema
     * @param {Object} contactPoint - Contact information
     * @returns {Object|undefined} Contact point schema object
     * @private
     */
    _prepareContactPoint(contactPoint) {
        if (!contactPoint) return undefined;

        return {
            '@type': 'ContactPoint',
            contactType: contactPoint.contactType || 'customer service',
            ...contactPoint
        };
    }

    /**
     * Prepare social profiles array for schema
     * @param {Object} socialConfig - Social configuration from site config
     * @param {Array|Object} override - Override social profiles
     * @returns {Array|undefined} Social profiles array
     * @private
     */
    _prepareSocialProfiles(socialConfig, override) {
        if (override && Array.isArray(override)) {
            return override;
        }

        if (override && typeof override === 'object') {
            return Object.values(override).filter(url => url);
        }

        if (!socialConfig) return undefined;

        const profiles = [];

        // Convert social config to URLs
        Object.entries(socialConfig).forEach(([platform, handle]) => {
            if (!handle) return;

            let url = handle;

            // Convert handles to full URLs
            if (!handle.startsWith('http')) {
                switch (platform.toLowerCase()) {
                    case 'twitter':
                        url = `https://twitter.com/${handle.replace('@', '')}`;
                        break;
                    case 'linkedin':
                        url = `https://linkedin.com/in/${handle}`;
                        break;
                    case 'facebook':
                        url = `https://facebook.com/${handle}`;
                        break;
                    case 'instagram':
                        url = `https://instagram.com/${handle.replace('@', '')}`;
                        break;
                    case 'youtube':
                        url = `https://youtube.com/c/${handle}`;
                        break;
                    default:
                        // If it's not a recognized platform and not a URL, skip it
                        if (!handle.includes('.')) return;
                        url = handle.startsWith('http') ? handle : `https://${handle}`;
                }
            }

            profiles.push(url);
        });

        return profiles.length > 0 ? profiles : undefined;
    }

    /**
     * Prepare publisher information for website schema
     * @param {Object} siteConfig - Site configuration
     * @param {Object} override - Override publisher
     * @returns {Object} Publisher schema object
     * @private
     */
    _preparePublisher(siteConfig, override) {
        if (override) return override;

        return {
            '@type': 'Organization',
            name: siteConfig.name,
            url: siteConfig.url
        };
    }

    /**
     * Prepare search action for website schema
     * @param {Object} siteConfig - Site configuration
     * @param {Object} override - Override search action
     * @returns {Object|undefined} Search action schema object
     * @private
     */
    _prepareSearchAction(siteConfig, override) {
        if (override === false) return undefined;
        if (override && typeof override === 'object') return override;

        // Default search action (can be customized based on site's search functionality)
        return {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteConfig.url}/search?q={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
        };
    }

    /**
     * Prepare copyright holder for website schema
     * @param {Object} siteConfig - Site configuration
     * @param {Object} override - Override copyright holder
     * @returns {Object} Copyright holder schema object
     * @private
     */
    _prepareCopyrightHolder(siteConfig, override) {
        if (override) return override;

        return {
            '@type': 'Organization',
            name: siteConfig.name
        };
    }

    /**
     * Prepare works for information for person schema
     * @param {Object} siteConfig - Site configuration
     * @param {Object} override - Override works for
     * @returns {Object} Works for schema object
     * @private
     */
    _prepareWorksFor(siteConfig, override) {
        if (override) return override;

        return {
            '@type': 'Organization',
            name: siteConfig.name,
            url: siteConfig.url
        };
    }

    /**
     * Prepare person image for schema
     * @param {string|Object} image - Image URL or object
     * @param {Object} siteConfig - Site configuration
     * @returns {Object} Image schema object
     * @private
     */
    _preparePersonImage(image, siteConfig) {
        if (typeof image === 'object') return image;

        const imageUrl = image.startsWith('/') ? `${siteConfig.url}${image}` : image;

        return {
            '@type': 'ImageObject',
            url: imageUrl,
            width: 400,
            height: 400
        };
    }
}

export default OrganizationSchemaGenerator;