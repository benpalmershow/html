document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const mediaContainer = document.getElementById('media-cards-container');
    const filterType = document.getElementById('filter-type');
    const sortBy = document.getElementById('sort-by');

    let mediaItems = [];

    // Get all unique media types from the items
    function getUniqueMediaTypes(items) {
        const types = new Set();
        items.forEach(item => {
            if (item.mediaType) {
                types.add(item.mediaType);
            }
        });
        return Array.from(types).sort();
    }

    // Populate the filter dropdown with media types
    function populateFilterDropdown(types) {
        const filterType = document.getElementById('filter-type');

        // Keep the 'All Media' option
        while (filterType.options.length > 1) {
            filterType.remove(1);
        }

        // Add each media type as an option
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            // Capitalize first letter of each word for display
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1) + 's';
            filterType.appendChild(option);
        });
    }

    // Fetch media data
    async function fetchMediaData() {
        try {
            const response = await fetch('/json/media.json');
            if (!response.ok) {
                throw new Error('Failed to fetch media data');
            }
            mediaItems = await response.json();

            // Get unique media types and populate filter
            const mediaTypes = getUniqueMediaTypes(mediaItems);
            populateFilterDropdown(mediaTypes);

            // Set default sort to newest by date (descending)
            if (sortBy) {
                sortBy.value = 'date-desc';
            }
            filterAndSortMedia();
        } catch (error) {
            console.error('Error loading media data:', error);
            mediaContainer.innerHTML = '<p>Error loading media. Please try again later.</p>';
        }
    }

    // Render media cards
    function renderMediaCards(items) {
        // Clear existing cards
        mediaContainer.innerHTML = '';

        if (items.length === 0) {
            mediaContainer.innerHTML = '<p>No media items found.</p>';
            return;
        }

        items.forEach(item => {
            const card = createMediaCard(item);
            mediaContainer.appendChild(card);
        });
    }

    // Create a single media card with hover effect
    function createMediaCard(item) {
        const card = document.createElement('div');
        card.className = 'media-card';
        card.setAttribute('data-media-type', item.mediaType || 'unknown');
        // Create cover container with type badge
        const coverContainer = document.createElement('div');
        coverContainer.className = 'media-cover-container';

        // Add cover image with alt text validation
        const coverImg = document.createElement('img');
        coverImg.className = 'media-cover';
        coverImg.src = item.cover || 'https://via.placeholder.com/300x200/2C5F5A/FFFFFF?text=No+Image';
        // Ensure meaningful alt text
        const altText = item.title ? `Cover image for ${item.title}` : 'Media cover image';
        coverImg.alt = altText;
        coverImg.loading = 'lazy';

        // Add media type badge (icon only, no text) - using createElement for security
        const typeBadge = document.createElement('div');
        typeBadge.className = 'media-type';
        const typeIcon = document.createElement('i');
        typeIcon.className = getMediaTypeIcon(item.mediaType);
        typeBadge.appendChild(typeIcon);

        // Add reading now badge if status is 'reading now'
        if (item.status && item.status.toLowerCase() === 'reading now') {
            const readingNowBadge = document.createElement('div');
            readingNowBadge.className = 'reading-now-badge';
            readingNowBadge.textContent = 'Reading Now';
            coverContainer.appendChild(readingNowBadge);
        }

        // Add featured badge if applicable
        if (item.featured) {
            const featuredBadge = document.createElement('div');
            featuredBadge.className = 'media-featured';
            featuredBadge.textContent = item.featured;
            coverContainer.appendChild(featuredBadge);
        }

        // Create overlay for hover effect
        const overlay = document.createElement('div');
        overlay.className = 'media-overlay';

        // Create content wrapper for overlay
        const overlayContent = document.createElement('div');
        overlayContent.className = 'media-overlay-content';

        // Add title (moved to be first element in overlay)
        const title = document.createElement('h3');
        title.className = 'media-title';
        title.textContent = item.title;
        overlayContent.appendChild(title);

        // Add author/director/curator if exists
        if (item.author) {
            const author = document.createElement('div');
            author.className = 'media-author';
            // Add appropriate label based on media type
            if (item.mediaType === 'movie') {
                author.textContent = item.author ? `Director: ${item.author}` : '';
            } else if (item.mediaType === 'playlist') {
                author.textContent = item.author ? `Curator: ${item.author}` : '';
            } else {
                author.textContent = item.author;
            }
            overlayContent.appendChild(author);
        }

        // Add description if exists
        if (item.description) {
            const description = document.createElement('div');
            description.className = 'media-description';
            description.textContent = item.description;
            overlayContent.appendChild(description);
        }

        // Add YouTube trailer for movies or playlist preview if embedUrl exists
        if ((item.mediaType === 'movie' || item.mediaType === 'playlist') && item.embedUrl) {
            const trailerContainer = document.createElement('div');
            trailerContainer.className = 'trailer-container';

            // Create button with YouTube icon (different text based on media type) - using createElement for security
            const trailerButton = document.createElement('button');
            trailerButton.className = 'trailer-button';

            const buttonIcon = document.createElement('i');
            buttonIcon.className = 'fab fa-youtube';
            
            // Set title attribute for accessibility
            if (item.mediaType === 'movie') {
                trailerButton.setAttribute('title', 'Watch Trailer');
                trailerButton.classList.add('playlist-button');
            } else if (item.mediaType === 'playlist') {
                trailerButton.setAttribute('title', 'Preview Playlist');
                trailerButton.classList.add('playlist-button');
            }

            trailerButton.appendChild(buttonIcon);

            // Add click event to show trailer
            trailerButton.addEventListener('click', function (e) {
                e.stopPropagation(); // Prevent card click event

                // Check if trailer is already open
                const existingTrailer = trailerContainer.querySelector('.trailer-embed');
                if (existingTrailer) {
                    trailerContainer.removeChild(existingTrailer);
                    // Reset button to original state - using createElement for security
                    trailerButton.innerHTML = '';
                    const resetIcon = document.createElement('i');
                    resetIcon.className = 'fab fa-youtube';
                    
                    // Reset title attribute
                    if (item.mediaType === 'movie') {
                        trailerButton.setAttribute('title', 'Watch Trailer');
                    } else if (item.mediaType === 'playlist') {
                        trailerButton.setAttribute('title', 'Preview Playlist');
                    }

                    trailerButton.appendChild(resetIcon);
                    return;
                }

                // Create iframe for trailer - using createElement for security
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

                // Update button to close state - using createElement for security
                trailerButton.innerHTML = '';
                const closeIcon = document.createElement('i');
                closeIcon.className = 'fas fa-times';
                trailerButton.setAttribute('title', 'Close Trailer');
                trailerButton.appendChild(closeIcon);
            });

            trailerContainer.appendChild(trailerButton);
            overlayContent.appendChild(trailerContainer);
        }

        // Add rating if exists (moved to bottom) - using textContent for security
        if (item.rating) {
            const rating = document.createElement('div');
            rating.className = 'media-rating';
            const stars = '★'.repeat(Math.round(item.rating)) + '☆'.repeat(5 - Math.round(item.rating));
            rating.textContent = stars;
            overlayContent.appendChild(rating);
        }

        // Platform links for playlists are now handled in the main links section below

        // Add IMDB and Rotten Tomatoes ratings for movies
        if (item.mediaType === 'movie' && item.ratings) {
            const ratingsContainer = document.createElement('div');
            ratingsContainer.className = 'rating-logos';

            // Add Rotten Tomatoes rating if available - using createElement for security
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
                ratingsContainer.appendChild(rtLink);
            }

            // Add IMDB rating if available - using createElement for security
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
                ratingsContainer.appendChild(imdbLink);
            }

            overlayContent.appendChild(ratingsContainer);
        }

        // Add links if they exist
        if (item.links && item.links.length > 0) {
            const linksContainer = document.createElement('div');

            // For songs, podcasts, and playlists, use icon-only links with their respective colors
            if (item.mediaType === 'song' || item.mediaType === 'podcast' || item.mediaType === 'playlist') {
                // Use appropriate class name based on media type
                linksContainer.className = item.mediaType === 'song' ? 'song-links' : 'podcast-links';

                item.links.forEach(link => {
                    if (link.icon) {
                        const linkEl = document.createElement('a');
                        linkEl.href = link.url;
                        linkEl.className = item.mediaType === 'song' ? 'song-link' : 'podcast-link';
                        linkEl.target = '_blank';
                        linkEl.rel = 'noopener noreferrer';
                        linkEl.setAttribute('title', link.label);

                        // Add platform-specific class for styling
                        if (link.icon.includes('spotify')) linkEl.classList.add('spotify-link');
                        else if (link.icon.includes('apple')) linkEl.classList.add('apple-link');
                        else if (link.icon.includes('youtube')) linkEl.classList.add('youtube-link');
                        else if (link.icon.includes('soundcloud')) linkEl.classList.add('soundcloud-link');
                        else if (link.icon.includes('amazon')) linkEl.classList.add('amazon-link');
                        else if (link.icon.includes('google')) linkEl.classList.add('google-link');
                        else if (link.icon.includes('rss')) linkEl.classList.add('rss-link');

                        const linkIcon = document.createElement('i');
                        linkIcon.className = link.icon;
                        linkEl.appendChild(linkIcon);
                        linksContainer.appendChild(linkEl);
                    }
                });
            } else {
                // For other media types, use the original link style with text
                linksContainer.className = 'media-links';

                item.links.forEach(link => {
                    const linkEl = document.createElement('a');
                    linkEl.href = link.url;
                    linkEl.className = 'media-link';
                    linkEl.target = '_blank';
                    linkEl.rel = 'noopener noreferrer';
                    if (link.icon) {
                        const linkIcon = document.createElement('i');
                        linkIcon.className = link.icon;
                        linkEl.appendChild(linkIcon);
                        linkEl.appendChild(document.createTextNode(' ' + link.label));
                    } else {
                        linkEl.textContent = link.label;
                    }
                    linksContainer.appendChild(linkEl);
                });
            }

            overlayContent.appendChild(linksContainer);
        }

        // Add date at the bottom if exists (fixed position)
        if (item.date) {
            const date = document.createElement('div');
            date.className = 'media-date-bottom';

            // Format the date if it's a valid date string, otherwise use as is - using createElement for security
            const formattedDate = formatDate(item.date);
            const dateIcon = document.createElement('i');
            dateIcon.className = 'far fa-calendar-alt';
            date.appendChild(dateIcon);
            date.appendChild(document.createTextNode(' ' + formattedDate));

            // Append to overlay content for consistent positioning
            overlayContent.appendChild(date);
        }

        // Assemble the overlay
        overlay.appendChild(overlayContent);

        // Add all elements to the card
        coverContainer.appendChild(coverImg);
        coverContainer.appendChild(typeBadge);
        card.appendChild(coverContainer);
        card.appendChild(overlay);



        return card;
    }

    // Media type icons constant for easier maintenance
    const MEDIA_TYPE_ICONS = {
        'podcast': 'fas fa-podcast',
        'playlist': 'fas fa-music',
        'book': 'fas fa-book',
        'song': 'fas fa-music',
        'video': 'fas fa-video',
        'movie': 'fas fa-film',
        'article': 'fas fa-newspaper'
    };

    // Helper function to get appropriate icon for media type
    function getMediaTypeIcon(mediaType) {
        return MEDIA_TYPE_ICONS[mediaType] || 'fas fa-file-alt';
    }

    // Helper function to format date for display
    function formatDate(dateString) {
        if (!dateString) return '';

        // Try to parse the date
        const date = parseDateString(dateString);
        if (!date) {
            return dateString; // Return as is if can't parse
        }

        // Format as Month YYYY (e.g., January 2023)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }

    // Helper function to parse date strings in various formats
    function parseDateString(dateString) {
        if (!dateString) return null;

        // Try to parse "Month YYYY" format first (e.g., "January 2023" or "Jan 2023")
        const monthYearRegex = /^([A-Za-z]+)\s+(\d{4})$/;
        const match = dateString.match(monthYearRegex);
        if (match) {
            const monthNames = ["january", "february", "march", "april", "may", "june",
                "july", "august", "september", "october", "november", "december"];
            const monthName = match[1].toLowerCase();
            const year = parseInt(match[2]);

            // Find the month number (0-11)
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

        // Try standard date parsing as fallback
        let date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date;
        }

        return null;
    }

    // Filter and sort functions
    function filterAndSortMedia() {
        const typeFilter = filterType.value;
        const sortValue = sortBy.value;

        let filtered = [...mediaItems];

        // Apply type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(item => item.mediaType === typeFilter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortValue) {
                case 'date-asc':
                    const dateA = parseDateString(a.date) || new Date(0);
                    const dateB = parseDateString(b.date) || new Date(0);
                    // For ascending: older dates first
                    return dateA.getTime() - dateB.getTime();
                case 'date-desc':
                    const dateC = parseDateString(a.date) || new Date(0);
                    const dateD = parseDateString(b.date) || new Date(0);
                    // For descending: newer dates first (July 2025 before June 2025)
                    return dateD.getTime() - dateC.getTime();
                case 'title-asc':
                    return (a.title || '').localeCompare(b.title || '');
                case 'title-desc':
                    return (b.title || '').localeCompare(a.title || '');
                default:
                    return 0;
            }
        });

        renderMediaCards(filtered);
    }

    // Debounce function to prevent rapid-fire re-renders
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Create debounced version of filter and sort function
    const debouncedFilterAndSort = debounce(filterAndSortMedia, 300);

    // Event listeners with debouncing
    filterType.addEventListener('change', debouncedFilterAndSort);
    sortBy.addEventListener('change', debouncedFilterAndSort);

    // Initialize
    fetchMediaData();
});