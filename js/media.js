document.addEventListener('DOMContentLoaded', function() {
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
            
            // Initial render
            renderMediaCards(mediaItems);
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
        
        // Create cover container with type badge
        const coverContainer = document.createElement('div');
        coverContainer.className = 'media-cover-container';
        
        // Add cover image
        const coverImg = document.createElement('img');
        coverImg.className = 'media-cover';
        coverImg.src = item.cover || 'https://via.placeholder.com/300x200/2C5F5A/FFFFFF?text=No+Image';
        coverImg.alt = item.title;
        coverImg.loading = 'lazy';
        
        // Add media type badge
        const typeBadge = document.createElement('div');
        typeBadge.className = 'media-type';
        typeBadge.innerHTML = `<i class="${getMediaTypeIcon(item.mediaType)}"></i> ${item.mediaType || 'media'}`;
        
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
        
        // Add author if exists
        if (item.author) {
            const author = document.createElement('div');
            author.className = 'media-author';
            author.textContent = item.author;
            overlayContent.appendChild(author);
        }
        
        // Add description if exists
        if (item.description) {
            const description = document.createElement('div');
            description.className = 'media-description';
            description.textContent = item.description;
            overlayContent.appendChild(description);
        }
        
        // Add rating if exists (moved to bottom)
        if (item.rating) {
            const rating = document.createElement('div');
            rating.className = 'media-rating';
            rating.innerHTML = '★'.repeat(Math.round(item.rating)) + '☆'.repeat(5 - Math.round(item.rating));
            overlayContent.appendChild(rating);
        }
        
        // Add links if they exist
        if (item.links && item.links.length > 0) {
            const linksContainer = document.createElement('div');
            linksContainer.className = 'media-links';
            
            item.links.forEach(link => {
                const linkEl = document.createElement('a');
                linkEl.href = link.url;
                linkEl.className = 'media-link';
                linkEl.target = '_blank';
                linkEl.rel = 'noopener noreferrer';
                linkEl.innerHTML = link.icon ? 
                    `<i class="${link.icon}"></i> ${link.label}` : 
                    link.label;
                linksContainer.appendChild(linkEl);
            });
            
            overlayContent.appendChild(linksContainer);
        }
        
        // Assemble the overlay
        overlay.appendChild(overlayContent);
        
        // Add all elements to the card
        coverContainer.appendChild(coverImg);
        coverContainer.appendChild(typeBadge);
        card.appendChild(coverContainer);
        card.appendChild(overlay);
        
        // Debug: Log card structure
        console.log('Card created:', {
            hasTitle: !!title,
            hasOverlay: !!overlay,
            hasCover: !!coverImg,
            item: { title: item.title, type: item.mediaType }
        });
        
        return card;
    }
    
    // Helper function to get appropriate icon for media type
    function getMediaTypeIcon(mediaType) {
        const icons = {
            'podcast': 'fas fa-podcast',
            'playlist': 'fas fa-music',
            'book': 'fas fa-book',
            'song': 'fas fa-music',
            'video': 'fas fa-video',
            'article': 'fas fa-newspaper'
        };
        return icons[mediaType] || 'fas fa-file-alt';
    }
    
    // Helper function to format date
    function formatDate(dateString) {
        if (!dateString) return '';
        
        // Try to parse the date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // Return as is if can't parse
        }
        
        // Format as Month YYYY (e.g., January 2023)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
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
                    return new Date(a.date || 0) - new Date(b.date || 0);
                case 'date-desc':
                    return new Date(b.date || 0) - new Date(a.date || 0);
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
    
    // Event listeners
    filterType.addEventListener('change', filterAndSortMedia);
    sortBy.addEventListener('change', filterAndSortMedia);
    
    // Initialize
    fetchMediaData();
});