/**
 * Image Optimization Module
 * Handles responsive images, lazy loading, and format negotiation
 */

function optimizeImages() {
    const images = document.querySelectorAll('img');

    images.forEach((img, index) => {
        // Skip already optimized images
        if (img.dataset.optimized === 'true') return;

        const src = img.src;
        if (!src) return;

        // Optimize TMDB images
        if (src.includes('themoviedb.org') || src.includes('tmdb.org')) {
            optimizeTMDBImage(img, index);
        }
        // Optimize local images
        else if (src.startsWith('/') || src.includes(window.location.origin)) {
            optimizeLocalImage(img, index);
        }
        // Optimize external CDN images
        else if (src.includes('cdn.')) {
            optimizeCDNImage(img, index);
        }

        img.dataset.optimized = 'true';
    });
}

function optimizeTMDBImage(img, index) {
    // Convert /original/ to /w500/ for better compression
    if (img.src.includes('/original/')) {
        img.src = img.src.replace('/original/', '/w500/');
    } else if (!img.src.includes('/w')) {
        // If no width specified, default to w500
        img.src = img.src.replace('https://image.tmdb.org/t/p/', 'https://image.tmdb.org/t/p/w500/');
    }

    // Set proper aspect ratio (2:3 for movie posters)
    img.width = 300;
    img.height = 450;

    // First image loads eagerly, rest lazy
    img.loading = index === 0 ? 'eager' : 'lazy';
    img.fetchpriority = index === 0 ? 'high' : 'low';
    img.decoding = 'async';
}

function optimizeLocalImage(img, index) {
    // Ensure dimensions are set to prevent CLS
    if (!img.width || !img.height) {
        img.width = 400;
        img.height = 300;
    }

    // First image loads eagerly for better LCP
    img.loading = index === 0 ? 'eager' : 'lazy';
    img.fetchpriority = index === 0 ? 'high' : 'low';
    img.decoding = 'async';

    // Support responsive images with srcset
    // Only for images that already have responsive variants (files ending in -240, -360, -480)
    const hasVariants = img.src.includes('-240') || img.src.includes('-360') || img.src.includes('-480');
    if (!img.srcset && hasVariants) {
        const ext = img.src.substring(img.src.lastIndexOf('.'));
        const baseWithoutSize = img.src.replace(/-\d+\.(webp|jpg|png)$/, '');

        // Build srcset only if image filename suggests it has variants
        const sizes = ['240', '360', '480'];
        const srcset = sizes
            .map(size => `${baseWithoutSize}-${size}${ext} ${size}w`)
            .join(', ');

        img.srcset = srcset;
        img.sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw';
    }
}

function optimizeCDNImage(img, index) {
    // Ensure dimensions to prevent CLS
    if (!img.width || !img.height) {
        img.width = 400;
        img.height = 300;
    }

    img.loading = index === 0 ? 'eager' : 'lazy';
    img.fetchpriority = index === 0 ? 'high' : 'low';
    img.decoding = 'async';
}

// Run optimization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Give a small delay for images to be inserted
        setTimeout(optimizeImages, 100);
    });
} else {
    setTimeout(optimizeImages, 100);
}

// Also optimize dynamically loaded images
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeName === 'IMG') {
                    optimizeImages();
                } else if (node.nodeType === 1) { // Element node
                    const imgs = node.querySelectorAll('img');
                    if (imgs.length > 0) optimizeImages();
                }
            });
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
});

// Export for direct use
window.optimizeImages = optimizeImages;
