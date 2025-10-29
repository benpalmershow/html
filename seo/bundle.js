/**

 * SEO Bundle - Combined SEO optimization modules

 * Reduces the number of network requests by bundling all SEO modules

 */

import { metaOptimization } from './meta-optimization/index.js';

import PerformanceOptimizer from './performance/index.js';

// Import analytics module (auto-initializes)

import './analytics/index.js';

// Import search console module (auto-initializes)

import './search-console/index.js';

// Import monitoring module (auto-initializes)

import './monitoring/index.js';

// Import content schema module (auto-initializes)

import './content-schema/index.js';

// Import seo config module (auto-initializes)

import './seo-config/index.js';

/**

 * Initialize all SEO optimization systems

 * @param {Object} options - Initialization options

 */

export async function initializeAllSEO(options = {}) {

  try {

    // Initialize meta optimization for homepage

    await metaOptimization.initialize({

      autoOptimize: true,

      includeSocial: true,

      ...options.meta

    });

    // Initialize performance optimizations

    new PerformanceOptimizer({

      enableLazyLoading: true,

      enableImageOptimization: true,

      enableResourcePreloading: true,

      ...options.performance

    });

    // Apply unified SEO configuration if available

    if (window.seoConfig && window.seoConfig.applyToPage) {

      window.seoConfig.applyToPage();

    }

    console.log('All SEO systems initialized successfully');

  } catch (error) {

    console.warn('SEO bundle initialization failed:', error);

  }

}
