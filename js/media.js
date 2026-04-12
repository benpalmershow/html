/**
 * Media display module with optimized image loading and caching
 * 
 * Image optimization strategy:
 * - TMDB: Enforces w500 size (50KB, fast) instead of original (slow, large)
 *   Uses media.themoviedb.org CDN (CORS-friendly, faster than www.themoviedb.org)
 * - Local: WebP format in images/ directory with optional srcset for responsiveness
 * - First card: High fetch priority + sync decoding for LCP optimization
 * - Other cards: Lazy loading + async decoding to prevent layout jank
 * - Error handling: Graceful fallback to SVG placeholder on load failure
 * 
 * Caching strategy:
 * - IndexedDB storage (non-blocking, survives page reloads)
 * - 5-minute TTL with cache busting via last-commit meta tag
 * - Async cache operations (doesn't block render)
 * 
 * Rendering optimization:
 * - Batch rendering (12 items per batch) with requestIdleCallback
 * - Deferred schema generation after render completes
 * - Passive event listeners for filter/sort performance
 * 
 * See docs/media_fetch.md for cover image sourcing guidelines
 */
(function () {
    const mediaContainer = document.getElementById('media-cards-container');
    const filterType = document.getElementById('filter-type');
    const sortBy = document.getElementById('sort-by');
    let mediaItems = [];
    let isRendering = false;

    // Use IndexedDB instead of localStorage for non-blocking storage
    const DB_NAME = 'media-cache-db';
    const DB_VERSION = 1;
    const STORE_NAME = 'media-data';
    const CACHE_KEY = 'media-data-v5';
    const CACHE_DURATION = 5 * 60 * 1000;
    const BATCH_SIZE = 12;
    const VALID_MEDIA_TYPES = ['movie', 'book', 'podcast', 'playlist', 'album', 'song', 'video', 'article'];
    const PLATFORM_ICONS = {
        spotify: 'spotify-link',
        apple: 'apple-link',
        youtube: 'youtube-link',
        soundcloud: 'soundcloud-link',
        amazon: 'amazon-link',
        google: 'google-link',
        rss: 'rss-link'
    };

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    async function getCachedData() {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(CACHE_KEY);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch {
            return null;
        }
    }

    async function setCachedData(data) {
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put({ data, timestamp: Date.now() }, CACHE_KEY);
        } catch (err) {
            console.warn('Cache write failed:', err);
        }
    }

    function getUniqueMediaTypes(items) {
        const types = new Set();
        items.forEach(item => {
            if (item.mediaType) types.add(item.mediaType);
        });
        return Array.from(types).sort();
    }

    function capitalizeWord(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    function populateFilterDropdown(types) {
        if (!filterType) return;
        const fragment = document.createDocumentFragment();
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.setAttribute('aria-label', `Filter by ${type}`);
            option.textContent = capitalizeWord(type) + 's';
            fragment.appendChild(option);
        });
        while (filterType.options.length > 1) {
            filterType.remove(1);
        }
        filterType.appendChild(fragment);
    }

    async function fetchMediaData() {
        mediaContainer.innerHTML = Array(12).fill('<div class="media-card-skeleton skeleton"></div>').join('');

        try {
            // Check cache asynchronously
            const cached = await getCachedData();
            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                mediaItems = cached.data;
                initializeMediaDisplay();
                return;
            }

            const version = document.querySelector('meta[name="site-data-version"]')?.content || '20260320';

            const response = await fetch(`json/media.json?v=${encodeURIComponent(version)}`);

            if (!response.ok) {
                throw new Error(
                    response.status === 404
                        ? 'Media data file not found'
                        : response.status >= 500
                            ? 'Server error occurred'
                            : `Failed to fetch media data (${response.status})`
                );
            }

            mediaItems = await response.json();
            mediaItems = mediaItems.filter(validateMediaItem);

            // Save to cache asynchronously without blocking
            setCachedData(mediaItems);

            initializeMediaDisplay();
        } catch (error) {
            console.error('Error loading media data:', error);
            const errorMessage = error.name === 'TypeError'
                ? 'Error loading media. Please check your internet connection.'
                : `Error loading media. ${error.message}`;

            mediaContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${errorMessage}</p>
                    <button onclick="location.reload()" class="retry-button">Try Again</button>
                </div>
            `;
        }
    }

    function initializeMediaDisplay() {
        const mediaTypes = getUniqueMediaTypes(mediaItems);
        populateFilterDropdown(mediaTypes);

        // Default values
        if (sortBy) sortBy.value = 'date-desc';

        // Check for URL parameters
        const urlParams = new URLSearchParams(window.location.search);

        // Handle filter type
        const initialFilter = urlParams.get('type') || urlParams.get('filter'); // Support both
        if (initialFilter && mediaTypes.includes(initialFilter)) {
            filterType.value = initialFilter;
        }

        // Handle sort
        const initialSort = urlParams.get('sort');
        if (initialSort && sortBy.querySelector(`option[value="${initialSort}"]`)) {
            sortBy.value = initialSort;
        }

        filterAndSortMedia(false); // Pass false to avoid redundant URL update on load
    }

    function validateMediaItem(item) {
        return item?.title && item?.mediaType && VALID_MEDIA_TYPES.includes(item.mediaType);
    }

    // Use requestIdleCallback for non-critical rendering
    function scheduleRender(callback) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout: 2000 });
        } else {
            setTimeout(callback, 1);
        }
    }

    function renderMediaCards(items) {
        if (isRendering) return;
        isRendering = true;

        mediaContainer.innerHTML = '';

        if (items.length === 0) {
            const hasFilter = filterType.value !== 'all';

            mediaContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-filter"></i>
                    </div>
                    <h2 class="empty-state-title">No results found</h2>
                    <p class="empty-state-text">
                        We couldn't find any media items matching your filter criteria. Try adjusting your filters.
                    </p>
                    <div class="empty-state-actions">
                        <button class="clear-filters-btn" id="clear-filters-btn">Clear All Filters</button>
                    </div>
                </div>
            `;

            document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
                if (filterType) filterType.value = 'all';
                filterAndSortMedia();
            });

            isRendering = false;
            return;
        }

        const fragment = document.createDocumentFragment();
        let currentIndex = 0;

        function renderBatch() {
            const endIndex = Math.min(currentIndex + BATCH_SIZE, items.length);

            for (let i = currentIndex; i < endIndex; i++) {
                const card = createMediaCard(items[i], i === 0);
                fragment.appendChild(card);
            }

            // Append batch to container
            mediaContainer.appendChild(fragment);

            currentIndex = endIndex;

            if (currentIndex < items.length) {
                // Use requestIdleCallback for subsequent batches
                scheduleRender(renderBatch);
            } else {
                // Generate schemas after all cards are rendered
                scheduleRender(() => generateSchemas(items));
                isRendering = false;
            }
        }

        renderBatch();
    }

    function generateSchemas(items) {
        if (!window.contentSchemaGenerator) return;

        const mediaSchemas = items.map(item =>
            window.contentSchemaGenerator.generateMediaItemSchema(item)
        );

        if (mediaSchemas.length > 0) {
            const mediaContainerSchema = {
                "@context": "https://schema.org",
                "@type": "ItemList",
                "name": "Media Collection",
                "numberOfItems": mediaSchemas.length,
                "itemListElement": mediaSchemas.map((schema, index) => ({
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": schema
                }))
            };

            window.contentSchemaGenerator.injectSchema(mediaContainerSchema, 'media-collection');
        }
    }

    function createMediaCard(item, isFirst = false) {
        const card = document.createElement('div');
        card.className = 'media-card';
        if (item.mediaType === 'video') {
            card.classList.add('video-card');
        }
        if (item.mediaType === 'movie') {
            card.classList.add('movie-card');
        }

        // Create URL-safe ID
        const cardId = item.title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        card.id = cardId;
        card.dataset.mediaType = item.mediaType || 'unknown';
        if (item.tag) {
            card.dataset.tag = item.tag;
        }
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', `${item.title} - ${item.mediaType}`);
        card.tabIndex = 0;

        const coverContainer = document.createElement('div');
        coverContainer.className = 'media-cover-container';

        const coverImg = document.createElement('img');
        coverImg.className = 'media-cover';

        // Set proper aspect ratios based on media type to prevent CLS
        if (item.mediaType === 'movie') {
            coverImg.width = 300;
            coverImg.height = 450;
        } else if (item.mediaType === 'video' || item.mediaType === 'song') {
            coverImg.width = 300;
            coverImg.height = 169;
        } else {
            coverImg.width = 300;
            coverImg.height = 300;
        }

        // Set alt text for accessibility
        coverImg.alt = `${item.title} cover${item.author ? ` by ${item.author}` : ''}`;

        // Add image error handling with fallback
        coverImg.addEventListener('error', () => {
            coverImg.classList.add('image-error');
            coverImg.alt = `Cover image unavailable for ${item.title}`;
            console.error(`Failed to load cover for: ${item.title}`);
        });

        if (isFirst) {
            coverImg.fetchPriority = 'high';
        } else {
            coverImg.loading = 'lazy'; // Lazy load non-LCP images
        }

        if (item.mediaType === 'playlist') {
            coverImg.classList.add('playlist-cover');
        }

        coverImg.alt = item.title ? `Cover image for ${item.title}` : 'Media cover image';

        // Optimize image decoding for performance (async prevents layout jank)
        coverImg.decoding = 'async';

        const placeholderSvg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect width=%22300%22 height=%22300%22 fill=%222C5F5A%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2224%22 fill=%22FFFFFF%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ELand Unknown%3C/text%3E%3C/svg%3E';

        if (item.cover) {
            // TMDB optimization: Ensure w500 size for fast loads (50KB vs original)
            // media.themoviedb.org is CORS-friendly CDN, faster than www.themoviedb.org
            let optimizedCover = item.cover;
            if (item.cover.includes('themoviedb.org') || item.cover.includes('tmdb.org')) {
                // Normalize any original/ references to w500/ for consistency
                optimizedCover = item.cover.replace(/\/original\//, '/w500/');
            }

            coverImg.src = optimizedCover;
            if (item.coverSrcset) {
                coverImg.srcset = item.coverSrcset;
            }
            if (item.coverSizes) {
                coverImg.sizes = item.coverSizes;
            }
            coverImg.onload = () => coverImg.classList.add('loaded');
            coverImg.onerror = () => {
                coverImg.src = placeholderSvg;
                coverImg.classList.add('loaded');
            };
        } else {
            coverImg.src = placeholderSvg;
            coverImg.classList.add('loaded');
        }

        const typeBadge = document.createElement('div');
        typeBadge.className = 'media-type';
        typeBadge.innerHTML = `<i class="${getMediaTypeIcon(item.mediaType)}"></i>`;

        if (item.status?.toLowerCase() === 'reading now') {
            const badge = document.createElement('div');
            badge.className = 'reading-now-badge';
            badge.textContent = 'Reading Now';
            coverContainer.appendChild(badge);
        }

        if (item.featured) {
            const badge = document.createElement('div');
            badge.className = 'media-featured';
            badge.textContent = item.featured;
            coverContainer.appendChild(badge);
        }

        const overlay = createOverlay(item);

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.classList.add('keyboard-focus');
                setTimeout(() => card.classList.remove('keyboard-focus'), 200);
            }
        }, { passive: true });

        if (item.mediaType === 'podcast' && item.author?.includes('Doc Riter')) {
            const docRiterCover = document.createElement('div');
            docRiterCover.className = 'media-cover doc-riter-custom-cover';
            
            const dpIcon = document.createElement('img');
            dpIcon.src = 'images/logo.webp';
            dpIcon.className = 'doc-riter-custom-icon';
            dpIcon.alt = '';
            
            const dpDate = document.createElement('div');
            dpDate.className = 'doc-riter-custom-date';
            
            // Try to use title if it looks like a date, fallback to item.date
            let dateText = item.date || item.dateAdded || '';
            const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            if (item.title && months.some(m => item.title.includes(m))) {
                dateText = item.title;
            }
            dpDate.textContent = dateText;
            
            docRiterCover.appendChild(dpIcon);
            docRiterCover.appendChild(dpDate);
            coverContainer.appendChild(docRiterCover);
        } else if (item.mediaType === 'playlist') {
            // Playlist: title as cover, listen.webp icon in upper right
            const plCover = document.createElement('div');
            plCover.className = 'media-cover playlist-custom-cover';

            // listen.webp icon (upper right)
            const plIcon = document.createElement('img');
            plIcon.src = 'images/listen.webp';
            plIcon.className = 'doc-riter-custom-icon';
            plIcon.alt = '';

            // Title as cover text
            const plTitle = document.createElement('div');
            plTitle.className = 'playlist-custom-title';
            plTitle.textContent = item.title;

            plCover.appendChild(plIcon);
            plCover.appendChild(plTitle);
            coverContainer.appendChild(plCover);
        } else {
            coverContainer.appendChild(coverImg);
        }
        coverContainer.appendChild(typeBadge);
        card.appendChild(coverContainer);
        card.appendChild(overlay);

        return card;
    }

    function createOverlay(item) {
        const overlay = document.createElement('div');
        overlay.className = 'media-overlay';

        const overlayContent = document.createElement('div');
        overlayContent.className = 'media-overlay-content';

        const topRightActions = document.createElement('div');
        topRightActions.className = 'media-top-right-actions';
        
        function addActionToTop(btnElement) {
            topRightActions.appendChild(btnElement);
        }


        if (item.ratings?.imdb) {
            const imdbLink = document.createElement('a');
            imdbLink.href = item.ratings.imdb.url;
            imdbLink.className = 'action-btn imdb-btn';
            imdbLink.target = '_blank';
            imdbLink.rel = 'noopener noreferrer';
            imdbLink.title = `IMDb Score: ${item.ratings.imdb.score}`;
            
            const scoreNum = parseFloat(item.ratings.imdb.score);
            const scoreClass = 'med-rating'; // Fixed back to yellow by later CSS but keeping class logic
            
            imdbLink.innerHTML = `<span class="rating-label">IMDb</span><span class="rating-text">${item.ratings.imdb.score}</span>`;
            addActionToTop(imdbLink);
        }
        
        if (item.ratings?.rt) {
            const rtLink = document.createElement('a');
            rtLink.href = item.ratings.rt.url;
            rtLink.className = 'action-btn rt-btn';
            rtLink.target = '_blank';
            rtLink.rel = 'noopener noreferrer';
            rtLink.title = `Rotten Tomatoes: ${item.ratings.rt.score}`;
            
            const scoreNum = parseInt(item.ratings.rt.score);
            const scoreClass = 'med-rating'; // Using med for consistent color as requested
            
            rtLink.innerHTML = `<span class="rating-label">RT</span><span class="rating-text">${item.ratings.rt.score}</span>`;
            addActionToTop(rtLink);
        }

        if (item.links?.length > 0) {
            item.links.forEach(link => {
                const isXLink = link.name?.toLowerCase() === 'x' || link.label?.toLowerCase() === 'x';
                const isTrailerLink = link.label?.toLowerCase() === 'trailer';

                const linkEl = document.createElement('a');
                linkEl.href = link.url;
                linkEl.target = '_blank';
                linkEl.rel = 'noopener noreferrer';
                linkEl.title = link.label || link.name || '';
                linkEl.className = 'action-btn link-btn ' + (isXLink ? 'x-btn' : getPlatformClass(link) + '-btn');

                if (isXLink) {
                    linkEl.innerHTML = X_LINK_SVG;
                } else if (link.icon) {
                    let iconHtml = `<i class="${link.icon}"></i>`;
                    if (link.icon.includes('youtube') && link.label && item.title?.toLowerCase().includes('coachella')) {
                        const firstLetter = link.label.charAt(0).toUpperCase();
                        iconHtml += `<span class="link-label-initial">${firstLetter}</span>`;
                    }
                    linkEl.innerHTML = iconHtml;
                }
                
                if (isTrailerLink && (item.mediaType === 'movie' || item.mediaType === 'video')) {
                    addActionToTop(linkEl);
                } else {
                    addActionToTop(linkEl);
                }
            });
        }
        
        overlay.appendChild(topRightActions);

        const title = document.createElement('h2');
        title.className = 'media-title';
        title.textContent = item.title;
        overlayContent.appendChild(title);

        if (item.author) {
            const author = document.createElement('div');
            author.className = 'media-author';
            author.textContent = item.mediaType === 'movie' ? `Director: ${item.author}` : item.mediaType === 'playlist' ? `Curator: ${item.author}` : item.mediaType === 'album' ? `Artist: ${item.author}` : item.author;
            overlayContent.appendChild(author);
        }

        if (item.description) {
            const description = document.createElement('div');
            description.className = 'media-description';
            // Use innerHTML for coachella cards to render the table
            if (item.tag === 'coachella') {
                description.innerHTML = item.description;
            } else {
                description.textContent = item.description;
            }
            overlayContent.appendChild(description);
        }

        if (item.highlights?.length > 0) {
            const highlightsList = document.createElement('div');
            highlightsList.className = 'media-highlights';
            item.highlights.forEach(h => {
                const a = document.createElement('a');
                a.href = h.url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = h.label;
                a.className = 'media-highlight-link';
                highlightsList.appendChild(a);
            });
            overlayContent.appendChild(highlightsList);
        }

        if (item.mediaType === 'playlist' && item.date) {
            const dateElement = document.createElement('div');
            dateElement.className = 'media-date-bottom';
            dateElement.textContent = item.date;
            overlayContent.appendChild(dateElement);
        }

        if (item.rating) {
            const rating = document.createElement('div');
            rating.className = 'media-rating';
            rating.textContent = '★'.repeat(Math.round(item.rating)) + '☆'.repeat(5 - Math.round(item.rating));
            overlayContent.appendChild(rating);
        }

        overlay.appendChild(overlayContent);
        return overlay;
    }


    function getPlatformClass(link) {
        if (!link.icon) return 'media-link';
        for (const [platform, className] of Object.entries(PLATFORM_ICONS)) {
            if (link.icon.includes(platform)) return className;
        }
        return 'media-link';
    }

    const X_LINK_SVG = `<svg viewBox="0 0 120 120" width="1.1em" height="1.1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="display:flex;align-items:center;justify-content:center;width:1.1em;height:1.1em;"><path d="M85.5 34H99L74.5 62.5L102 99H80.5L62.5 76.5L41.5 99H28L54.5 68.5L28 34H50L66 54.5L85.5 34ZM81.5 92H87.5L49 41H42.5L81.5 92Z" fill="white"/></svg>`;

    const MEDIA_TYPE_ICONS = {
        'podcast': 'fas fa-podcast',
        'playlist': 'fas fa-music',
        'book': 'fas fa-book',
        'song': 'fas fa-music',
        'video': 'fas fa-video',
        'movie': 'fas fa-film',
        'album': 'fas fa-music',
        'article': 'fas fa-newspaper'
    };

    function getMediaTypeIcon(mediaType) {
        return MEDIA_TYPE_ICONS[mediaType] || 'fas fa-file-alt';
    }

    function parseDateString(dateString) {
        if (!dateString) return null;

        const monthYearRegex = /^([A-Za-z]+)\s+(\d{4})$/;
        const match = dateString.match(monthYearRegex);

        if (match) {
            const monthNames = ["january", "february", "march", "april", "may", "june",
                "july", "august", "september", "october", "november", "december"];
            const monthName = match[1].toLowerCase();
            const year = parseInt(match[2]);

            for (let i = 0; i < monthNames.length; i++) {
                if (monthNames[i].startsWith(monthName.substring(0, 3))) {
                    return new Date(year, i, 1);
                }
            }
        }

        const date = new Date(dateString);
        return !isNaN(date.getTime()) ? date : null;
    }

    function updateURLParams() {
        if (!filterType) return;
        const params = new URLSearchParams(window.location.search);
        const type = filterType.value;
        const sort = sortBy?.value || 'date-desc';

        if (type !== 'all') params.set('type', type);
        else params.delete('type');

        if (sort !== 'date-desc') params.set('sort', sort);
        else params.delete('sort');

        // Remove old 'filter' and 'q' params if they exist
        params.delete('filter');
        params.delete('q');

        const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({ path: newURL }, '', newURL);
    }

    function filterAndSortMedia(shouldUpdateURL = true) {
        if (shouldUpdateURL) updateURLParams();

        const typeFilter = filterType.value;
        const sortValue = sortBy?.value || 'date-desc';

        let filtered = typeFilter === 'all'
            ? [...mediaItems]
            : mediaItems.filter(item => item.mediaType === typeFilter);

        filtered.sort((a, b) => {
            switch (sortValue) {
                case 'date-asc':
                    return (parseDateString(a.dateAdded || a.date) || new Date(0)).getTime() -
                        (parseDateString(b.dateAdded || b.date) || new Date(0)).getTime();
                case 'date-desc':
                    return (parseDateString(b.dateAdded || b.date) || new Date(0)).getTime() -
                        (parseDateString(a.dateAdded || a.date) || new Date(0)).getTime();
                case 'newest-added':
                    return (parseDateString(b.dateAdded) || new Date(0)).getTime() -
                        (parseDateString(a.dateAdded) || new Date(0)).getTime();
                case 'title-asc':
                    return (a.title || '').localeCompare(b.title || '');
                case 'title-desc':
                    return (b.title || '').localeCompare(a.title || '');
                default:
                    return 0;
            }
        });

        renderMediaCards(filtered);
        updateResultsCount(filtered.length, mediaItems.length);
    }

    function updateResultsCount(filteredCount, totalCount) {
        const existingCount = document.querySelector('.results-count');
        existingCount?.remove();

        const activeFilter = filterType?.value;
        const hasFilter = activeFilter && activeFilter !== 'all';

        // Show count if filtered or different from total
        if (filteredCount !== totalCount || hasFilter) {
            const countDisplay = document.createElement('div');
            countDisplay.className = 'results-count';

            let countText = `Showing ${filteredCount} of ${totalCount} item${totalCount !== 1 ? 's' : ''}`;

            if (hasFilter) {
                countText += ` in ${capitalizeWord(activeFilter)}s`;
            }

            countDisplay.textContent = countText;
            document.querySelector('.media-filters')?.insertAdjacentElement('afterend', countDisplay);
        }
    }

    

// Use passive event listeners for better scroll performance
if (filterType) filterType.addEventListener('change', filterAndSortMedia, { passive: true });
if (sortBy) sortBy.addEventListener('change', filterAndSortMedia, { passive: true });

// Back to top functionality is handled by back-to-top.js

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        fetchMediaData();
    });
} else {
    fetchMediaData();
}
})();
