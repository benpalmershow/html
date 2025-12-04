/**
 * Image optimization utilities
 */

const IMAGE_PRESETS = {
    tmdb: {
        sizes: { width: 300, height: 450 },
        aspectRatio: '2/3'
    },
    default: {
        sizes: { width: 400, height: 300 },
        aspectRatio: '4/3'
    }
};

export function optimizeImages(container) {
    container.querySelectorAll('img').forEach(img => {
        // Set error handler
        if (!img.onerror) {
            img.onerror = () => {
                console.error('Image failed to load:', img.src);
                img.style.display = 'none';
            };
        }

        // TMDB optimization
        if (isTmdbImage(img.src)) {
            optimizeTmdbImage(img);
        }

        // Ensure responsive dimensions
        ensureImageDimensions(img);

        // Set loading strategy
        setImageLoadingAttrs(img);
    });
}

function isTmdbImage(src) {
    return src.includes('themoviedb.org') || src.includes('tmdb.org');
}

function optimizeTmdbImage(img) {
    // Optimize URL if using original resolution
    if (img.src.includes('/original/')) {
        img.src = img.src.replace('/original/', '/w500/');
        console.log('Optimized TMDB image:', img.src);
    }

    // Set 2:3 aspect ratio for movie posters
    const preset = IMAGE_PRESETS.tmdb;
    img.width = preset.sizes.width;
    img.height = preset.sizes.height;
    img.style.aspectRatio = preset.aspectRatio;
}

function ensureImageDimensions(img) {
    const preset = IMAGE_PRESETS.default;
    
    if (!img.hasAttribute('width')) {
        img.width = preset.sizes.width;
    }
    if (!img.hasAttribute('height')) {
        img.height = preset.sizes.height;
    }
}

function setImageLoadingAttrs(img) {
    if (!img.hasAttribute('loading')) {
        img.loading = 'lazy';
    }
    if (!img.hasAttribute('decoding')) {
        img.decoding = 'async';
    }
}
