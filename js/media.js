document.addEventListener('DOMContentLoaded', function() {
    const mediaContainer = document.getElementById('media-cards-container');
    const filterType = document.getElementById('filter-type');
    const sortBy = document.getElementById('sort-by');
    let mediaItems = [];

    function getUniqueMediaTypes(items) {
        const types = new Set();
        items.forEach(item => {
            if (item.mediaType) {
                types.add(item.mediaType);
            }
        });
        return Array.from(types).sort();
    }

    function populateFilterDropdown(types) {
        const filterType = document.getElementById('filter-type');
        while (filterType.options.length > 1) {
            filterType.remove(1);
        }
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.setAttribute('aria-label', `Filter by ${type}`);
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1) + 's';
            filterType.appendChild(option);
        });
    }

    const CACHE_KEY = 'media-data-cache-v3';
    const CACHE_DURATION = 5 * 60 * 1000;

    async function fetchMediaData() {
        mediaContainer.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i>Loading media...</div>';
        
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    mediaItems = data;
                    initializeMediaDisplay();
                    return;
                }
            }

            const __v = (document.querySelector('meta[name="last-commit"]') && 
                        document.querySelector('meta[name="last-commit"]').getAttribute('content')) || Date.now();
            const response = await fetch(`json/media.json?v=${encodeURIComponent(__v)}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Media data file not found');
                } else if (response.status >= 500) {
                    throw new Error('Server error occurred');
                } else {
                    throw new Error(`Failed to fetch media data (${response.status})`);
                }
            }

            mediaItems = await response.json();
            mediaItems = mediaItems.filter(validateMediaItem);
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: mediaItems,
                timestamp: Date.now()
            }));
            initializeMediaDisplay();
        } catch (error) {
            console.error('Error loading media data:', error);
            let errorMessage = 'Error loading media.';
            if (error.name === 'TypeError') {
                errorMessage += ' Please check your internet connection.';
            } else {
                errorMessage += ' ' + error.message;
            }
            mediaContainer.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>${errorMessage}</p><button onclick="location.reload()" class="retry-button">Try Again</button></div>`;
        }
    }

    function initializeMediaDisplay() {
        const mediaTypes = getUniqueMediaTypes(mediaItems);
        populateFilterDropdown(mediaTypes);
        if (sortBy) {
            sortBy.value = 'date-desc';
        }

        // Check for URL filter parameter
        const urlParams = new URLSearchParams(window.location.search);
        const initialFilter = urlParams.get('filter');
        if (initialFilter && mediaTypes.includes(initialFilter)) {
            filterType.value = initialFilter;
        }

        filterAndSortMedia();
    }

    function validateMediaItem(item) {
        const VALID_MEDIA_TYPES = ['movie', 'book', 'podcast', 'playlist', 'song', 'video', 'article'];
        return item && item.title && item.mediaType && VALID_MEDIA_TYPES.includes(item.mediaType);
    }

    function renderMediaCards(items) {
        mediaContainer.innerHTML = '';
        if (items.length === 0) {
            mediaContainer.innerHTML = '<p>No media items found.</p>';
            return;
        }

        // Generate schemas for all media items
        const mediaSchemas = [];

        items.forEach((item, index) => {
            const card = createMediaCard(item, index === 0);
            mediaContainer.appendChild(card);

            // Generate MediaObject schema for this item
            if (window.contentSchemaGenerator) {
                const mediaSchema = window.contentSchemaGenerator.generateMediaItemSchema(item);
                mediaSchemas.push(mediaSchema);
            }
        });

        // Inject MediaObject schemas for all items
        if (window.contentSchemaGenerator && mediaSchemas.length > 0) {
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
        // Create a URL-safe ID from the title
        const cardId = item.title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
        card.id = cardId;
        card.setAttribute('data-media-type', item.mediaType || 'unknown');
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', `${item.title} - ${item.mediaType}`);
        card.setAttribute('tabindex', '0');

        const coverContainer = document.createElement('div');
        coverContainer.className = 'media-cover-container';

        const coverImg = document.createElement('img');
        coverImg.className = 'media-cover';
        coverImg.width = 300;
        coverImg.height = 300;
        if (isFirst) {
            coverImg.setAttribute('fetchpriority', 'high');
        }

        // Add specific class for playlist covers to apply contain styling
        if (item.mediaType === 'playlist') {
            coverImg.classList.add('playlist-cover');
        }

        const altText = item.title ? `Cover image for ${item.title}` : 'Media cover image';
        coverImg.alt = altText;

        // Load the actual image immediately
        const placeholderSvg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect width=%22300%22 height=%22300%22 fill=%222C5F5A%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2224%22 fill=%22FFFFFF%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ENo Image%3C/text%3E%3C/svg%3E';
        
        if (item.cover) {
            coverImg.src = item.cover;
            coverImg.onload = function() {
                coverImg.classList.add('loaded');
            };
            coverImg.onerror = function() {
                coverImg.src = placeholderSvg;
                coverImg.classList.add('loaded');
            };
        } else {
            coverImg.src = placeholderSvg;
            coverImg.classList.add('loaded');
        }

        const typeBadge = document.createElement('div');
        typeBadge.className = 'media-type';
        const typeIcon = document.createElement('i');
        typeIcon.className = getMediaTypeIcon(item.mediaType);
        typeBadge.appendChild(typeIcon);

        if (item.status && item.status.toLowerCase() === 'reading now') {
            const readingNowBadge = document.createElement('div');
            readingNowBadge.className = 'reading-now-badge';
            readingNowBadge.textContent = 'Reading Now';
            coverContainer.appendChild(readingNowBadge);
        }

        if (item.featured) {
            const featuredBadge = document.createElement('div');
            featuredBadge.className = 'media-featured';
            featuredBadge.textContent = item.featured;
            coverContainer.appendChild(featuredBadge);
        }

        const overlay = document.createElement('div');
        overlay.className = 'media-overlay';

        const overlayContent = document.createElement('div');
        overlayContent.className = 'media-overlay-content';

        const title = document.createElement('h3');
        title.className = 'media-title';
        title.textContent = item.title;
        overlayContent.appendChild(title);

        if (item.author) {
            const author = document.createElement('div');
            author.className = 'media-author';
            if (item.mediaType === 'movie') {
                author.textContent = item.author ? `Director: ${item.author}` : '';
            } else if (item.mediaType === 'playlist') {
                author.textContent = item.author ? `Curator: ${item.author}` : '';
            } else {
                author.textContent = item.author;
            }
            overlayContent.appendChild(author);
        }

        if (item.description) {
            const description = document.createElement('div');
            description.className = 'media-description';
            description.textContent = item.description;
            overlayContent.appendChild(description);
        }

        // Add date for playlist items
        if (item.mediaType === 'playlist' && item.date) {
            const dateElement = document.createElement('div');
            dateElement.className = 'media-date-bottom';
            dateElement.textContent = item.date;
            overlayContent.appendChild(dateElement);
        }

        // Add media type specific content
        if (item.mediaType === 'movie') {
            const movieActionsContainer = document.createElement('div');
            movieActionsContainer.className = 'movie-actions-container';

            if (item.ratings) {
                if (item.ratings.rt) {
                    const rtLink = document.createElement('a');
                    rtLink.href = item.ratings.rt.url;
                    rtLink.className = 'rating-logo rt-logo';
                    rtLink.target = '_blank';
                    rtLink.rel = 'noopener noreferrer';

                    const tomatoSpan = document.createElement('span');
                    tomatoSpan.className = 'rt-tomato';
                    tomatoSpan.textContent = '🍅';

                    const scoreSpan = document.createElement('span');
                    scoreSpan.className = 'score';
                    scoreSpan.textContent = item.ratings.rt.score;

                    rtLink.appendChild(tomatoSpan);
                    rtLink.appendChild(document.createTextNode(' '));
                    rtLink.appendChild(scoreSpan);
                    movieActionsContainer.appendChild(rtLink);
                }

                if (item.ratings.imdb) {
                    const imdbLink = document.createElement('a');
                    imdbLink.href = item.ratings.imdb.url;
                    imdbLink.className = 'rating-logo imdb-logo';
                    imdbLink.target = '_blank';
                    imdbLink.rel = 'noopener noreferrer';

                    const imdbSpan = document.createElement('span');
                    imdbSpan.className = 'imdb-icon';
                    imdbSpan.textContent = 'IMDb';

                    const scoreSpan = document.createElement('span');
                    scoreSpan.className = 'score';
                    scoreSpan.textContent = item.ratings.imdb.score;

                    imdbLink.appendChild(imdbSpan);
                    imdbLink.appendChild(document.createTextNode(' '));
                    imdbLink.appendChild(scoreSpan);
                    movieActionsContainer.appendChild(imdbLink);
                }
            }

            if (item.embedUrl) {
                const trailerContainer = document.createElement('div');
                trailerContainer.className = 'trailer-container-inline';

                const trailerButton = document.createElement('button');
                trailerButton.className = 'trailer-button-inline';
                trailerButton.setAttribute('title', 'Watch Trailer');

                const buttonIcon = document.createElement('i');
                buttonIcon.className = 'fab fa-youtube';
                trailerButton.appendChild(buttonIcon);

                trailerButton.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const existingTrailer = overlayContent.querySelector('.trailer-embed');
                    if (existingTrailer) {
                        overlayContent.removeChild(existingTrailer);
                        trailerButton.innerHTML = '';
                        const resetIcon = document.createElement('i');
                        resetIcon.className = 'fab fa-youtube';
                        trailerButton.setAttribute('title', 'Watch Trailer');
                        trailerButton.appendChild(resetIcon);
                        return;
                    }

                    const trailerEmbed = document.createElement('div');
                    trailerEmbed.className = 'trailer-embed';

                    const iframe = document.createElement('iframe');
                    iframe.width = '100%';
                    iframe.height = '100%';
                    iframe.src = item.embedUrl;
                    iframe.title = `${item.title} Trailer`;
                    iframe.setAttribute('frameborder', '0');
                    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                    iframe.allowFullscreen = true;

                    trailerEmbed.appendChild(iframe);
                    overlayContent.appendChild(trailerEmbed);

                    trailerButton.innerHTML = '';
                    const closeIcon = document.createElement('i');
                    closeIcon.className = 'fas fa-times';
                    trailerButton.setAttribute('title', 'Close Trailer');
                    trailerButton.appendChild(closeIcon);
                });

                trailerContainer.appendChild(trailerButton);
                movieActionsContainer.appendChild(trailerContainer);
            }

            overlayContent.appendChild(movieActionsContainer);
        }

        if (item.mediaType === 'playlist' && item.embedUrl) {
            const trailerContainer = document.createElement('div');
            trailerContainer.className = 'trailer-container';

            const trailerButton = document.createElement('button');
            trailerButton.className = 'trailer-button';
            trailerButton.setAttribute('title', 'Preview Playlist');
            trailerButton.classList.add('playlist-button');

            const buttonIcon = document.createElement('i');
            buttonIcon.className = 'fab fa-youtube';
            trailerButton.appendChild(buttonIcon);

            trailerButton.addEventListener('click', function(e) {
                e.stopPropagation();
                const existingTrailer = trailerContainer.querySelector('.trailer-embed');
                if (existingTrailer) {
                    trailerContainer.removeChild(existingTrailer);
                    trailerButton.innerHTML = '';
                    const resetIcon = document.createElement('i');
                    resetIcon.className = 'fab fa-youtube';
                    trailerButton.setAttribute('title', 'Preview Playlist');
                    trailerButton.appendChild(resetIcon);
                    return;
                }

                const trailerEmbed = document.createElement('div');
                trailerEmbed.className = 'trailer-embed';

                const iframe = document.createElement('iframe');
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.src = item.embedUrl;
                iframe.title = `${item.title} Trailer`;
                iframe.setAttribute('frameborder', '0');
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;

                trailerEmbed.appendChild(iframe);
                trailerContainer.appendChild(trailerEmbed);

                trailerButton.innerHTML = '';
                const closeIcon = document.createElement('i');
                closeIcon.className = 'fas fa-times';
                trailerButton.setAttribute('title', 'Close Trailer');
                trailerButton.appendChild(closeIcon);
            });

            trailerContainer.appendChild(trailerButton);
            overlayContent.appendChild(trailerContainer);
        }

        if (item.rating) {
            const rating = document.createElement('div');
            rating.className = 'media-rating';
            const stars = '★'.repeat(Math.round(item.rating)) + '☆'.repeat(5 - Math.round(item.rating));
            rating.textContent = stars;
            overlayContent.appendChild(rating);
        }

        if (item.links && item.links.length > 0) {
            const linksContainer = document.createElement('div');
            // Use the same logic for all media types
            linksContainer.className =
                item.mediaType === 'song' ? 'song-links'
                : item.mediaType === 'podcast' || item.mediaType === 'playlist' ? 'podcast-links'
                : 'media-links';
            item.links.forEach(link => {
                const isXLink = (link.name && link.name.toLowerCase() === 'x') || (link.label && link.label.toLowerCase() === 'x');
                const isXIcon = link.icon && (link.icon === 'fab fa-x-twitter' || link.icon === 'fab fa-twitter');
                const linkEl = document.createElement('a');
                linkEl.href = link.url;
                linkEl.target = '_blank';
                linkEl.rel = 'noopener noreferrer';
                linkEl.setAttribute('title', link.label || link.name || '');
                // Platform-specific classes
                if (link.icon && link.icon.includes('spotify')) linkEl.className = 'spotify-link';
                else if (link.icon && link.icon.includes('apple')) linkEl.className = 'apple-link';
                else if (link.icon && link.icon.includes('youtube')) linkEl.className = 'youtube-link';
                else if (link.icon && link.icon.includes('soundcloud')) linkEl.className = 'soundcloud-link';
                else if (link.icon && link.icon.includes('amazon')) linkEl.className = 'amazon-link';
                else if (link.icon && link.icon.includes('google')) linkEl.className = 'google-link';
                else if (link.icon && link.icon.includes('rss')) linkEl.className = 'rss-link';
                else if (isXLink) linkEl.className = 'x-link';
                else linkEl.className = 'media-link';
                // Render SVG fallback for X
                if (isXLink) {
                    linkEl.innerHTML = `<svg viewBox="0 0 120 120" width="1.5em" height="1.5em" fill="white" xmlns="http://www.w3.org/2000/svg" style="display:flex;align-items:center;justify-content:center;width:1.5em;height:1.5em;"><rect width="120" height="120" rx="24" fill="black"/><path d="M85.5 34H99L74.5 62.5L102 99H80.5L62.5 76.5L41.5 99H28L54.5 68.5L28 34H50L66 54.5L85.5 34ZM81.5 92H87.5L49 41H42.5L81.5 92Z" fill="white"/></svg>`;
                } else if (link.icon) {
                    const linkIcon = document.createElement('i');
                    linkIcon.className = link.icon;
                    linkEl.appendChild(linkIcon);
                }
                linksContainer.appendChild(linkEl);
            });
            overlayContent.appendChild(linksContainer);
        }

        overlay.appendChild(overlayContent);

        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.classList.add('keyboard-focus');
                setTimeout(() => card.classList.remove('keyboard-focus'), 200);
            }
        });

        coverContainer.appendChild(coverImg);
        coverContainer.appendChild(typeBadge);
        card.appendChild(coverContainer);
        card.appendChild(overlay);

        return card;
    }

    const MEDIA_TYPE_ICONS = {
        'podcast': 'fas fa-podcast',
        'playlist': 'fas fa-music',
        'book': 'fas fa-book',
        'song': 'fas fa-music',
        'video': 'fas fa-video',
        'movie': 'fas fa-film',
        'article': 'fas fa-newspaper'
    };

    function getMediaTypeIcon(mediaType) {
        return MEDIA_TYPE_ICONS[mediaType] || 'fas fa-file-alt';
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = parseDateString(dateString);
        if (!date) {
            return dateString;
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
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
            let monthIndex = -1;
            for (let i = 0; i < monthNames.length; i++) {
                if (monthNames[i].startsWith(monthName.substring(0, 3))) {
                    monthIndex = i;
                    break;
                }
            }
            if (monthIndex !== -1) {
                return new Date(year, monthIndex, 1);
            }
        }

        let date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date;
        }
        return null;
    }

    function filterAndSortMedia() {
        const typeFilter = filterType.value;
        const sortValue = sortBy.value;

        let filtered = [...mediaItems];

        if (typeFilter !== 'all') {
            filtered = filtered.filter(item => item.mediaType === typeFilter);
        }

        filtered.sort((a, b) => {
            switch (sortValue) {
                case 'date-asc':
                    const dateA = parseDateString(a.dateAdded) || parseDateString(a.date) || new Date(0);
                    const dateB = parseDateString(b.dateAdded) || parseDateString(b.date) || new Date(0);
                    return dateA.getTime() - dateB.getTime();
                case 'date-desc':
                    const dateC = parseDateString(a.dateAdded) || parseDateString(a.date) || new Date(0);
                    const dateD = parseDateString(b.dateAdded) || parseDateString(b.date) || new Date(0);
                    return dateD.getTime() - dateC.getTime();
                case 'newest-added':
                    const dateE = parseDateString(a.dateAdded) || new Date(0);
                    const dateF = parseDateString(b.dateAdded) || new Date(0);
                    return dateF.getTime() - dateE.getTime();
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
        let existingCount = document.querySelector('.results-count');
        if (existingCount) {
            existingCount.remove();
        }

        if (filteredCount !== totalCount) {
            const countDisplay = document.createElement('div');
            countDisplay.className = 'results-count';
            let countText = `Showing ${filteredCount} of ${totalCount} items`;
            const activeFilter = filterType.value;
            if (activeFilter !== 'all') {
                const filterText = activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1) + 's';
                countText += ` in ${filterText}`;
            }
            countDisplay.textContent = countText;
            const filtersContainer = document.querySelector('.media-filters');
            filtersContainer.insertAdjacentElement('afterend', countDisplay);
        }
    }

    filterType.addEventListener('change', filterAndSortMedia);
    sortBy.addEventListener('change', filterAndSortMedia);

    fetchMediaData();
});