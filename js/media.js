// Unified media page JavaScript - creates uniform cards with cover images and hover overlays

let allMediaItems = [];
let filteredItems = [];

// DOM elements
const mediaCardsContainer = document.getElementById('media-cards');
const typeFilter = document.getElementById('filter-type');
const thumbsFilter = document.getElementById('filter-thumbs');
const categoryFilter = document.getElementById('filter-category');

// Load all media data
async function loadAllMedia() {
  try {
    const mediaResponse = await fetch('json/media.json');
    allMediaItems = await mediaResponse.json();
    
    // Sort all items by most recent date/year
    sortByMostRecent();
    
    // Populate category filter
    populateCategoryFilter();
    
    // Initial render
    filteredItems = [...allMediaItems];
    renderMediaCards();
    
  } catch (error) {
    console.error('Error loading media data:', error);
    mediaCardsContainer.innerHTML = '<p>Error loading media content.</p>';
  }
}

// Determine media type based on content structure
function getMediaType(item) {
  if (item.embedUrl) return 'watch';
  if (item.links && Array.isArray(item.links)) return 'listen';
  return 'read'; // default to read for books
}

// Sort all media items by most recent date
function sortByMostRecent() {
  allMediaItems.sort((a, b) => {
    // Extract year from date field
    const getYear = (item) => {
      if (item.date) {
        // Handle new object format {month, year} or legacy string format
        if (typeof item.date === 'object' && item.date.year) {
          return item.date.year;
        } else if (typeof item.date === 'string') {
          // Handle legacy string formats (YYYY, YYYY-MM-DD, etc.)
          const yearMatch = item.date.toString().match(/\d{4}/);
          return yearMatch ? parseInt(yearMatch[0]) : 0;
        }
      }
      return 0;
    };
    
    const yearA = getYear(a);
    const yearB = getYear(b);
    
    // Sort by year descending (most recent first)
    return yearB - yearA;
  });
}

// Populate category filter with unique categories
function populateCategoryFilter() {
  const categories = new Set();
  
  allMediaItems.forEach(item => {
    if (item.genre) categories.add(item.genre);
    if (item.category) categories.add(item.category);
  });
  
  // Clear existing options except "All"
  categoryFilter.innerHTML = '<option value="all">All</option>';
  
  // Add sorted categories
  [...categories].sort().forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

// Generate YouTube thumbnail from embed URL
function getYouTubeThumbnail(embedUrl) {
  const videoIdMatch = embedUrl.match(/embed\/([^?]+)/);
  if (videoIdMatch) {
    return `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
  }
  return null;
}

// Generate cover image for different media types
function generateCoverImage(item) {
  const mediaType = getMediaType(item);
  switch (mediaType) {
    case 'read':
      return item.cover || null;
    case 'watch':
      return getYouTubeThumbnail(item.embedUrl) || null;
    case 'listen':
      // For listen items, we'll use a placeholder with icon
      return null;
    default:
      return null;
  }
}

// Get placeholder icon for media type
function getPlaceholderIcon(item) {
  // Return empty string to show no placeholder text/icons
  return '';
}

// Format date for display
function formatDate(dateObj) {
  if (!dateObj) return '';
  
  // Handle new object format {month, year}
  if (typeof dateObj === 'object' && dateObj.year) {
    return dateObj.month ? `${dateObj.month} ${dateObj.year}` : dateObj.year.toString();
  }
  
  // Handle legacy string format
  if (typeof dateObj === 'string') {
    return dateObj;
  }
  
  return '';
}

// Get YouTube watch URL from embed URL
function getYouTubeWatchUrl(embedUrl) {
  const videoIdMatch = embedUrl.match(/embed\/([^?]+)/);
  if (videoIdMatch) {
    return `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
  }
  return embedUrl;
}

// Create uniform media card HTML
function createMediaCard(item) {
  const thumbsIcon = item.thumbs === 'up' ? '👍' : item.thumbs === 'neutral' ? '😐' : '';
  const coverImage = generateCoverImage(item);
  const placeholderIcon = getPlaceholderIcon(item);
  const category = item.genre || item.category || '';
  const mediaType = getMediaType(item);
  
  // Create overlay content based on media type
  let overlayContent = '';
  let cardClickHandler = '';
  const mediaTypeIcon = mediaType ? `<img src="images/${mediaType}.png" alt="${mediaType}" class="media-type-icon">` : '';
  
  switch (mediaType) {
    case 'read':
      overlayContent = `
        ${mediaTypeIcon}
        ${thumbsIcon ? `<div class="media-overlay-thumbs">${thumbsIcon}</div>` : ''}
        <div class="media-overlay-title">${item.title}</div>
        <div class="media-overlay-desc">${item.description || ''}</div>
        <div class="media-overlay-meta">
          ${item.author ? `By ${item.author} • ` : ''}
          ${item.date ? `${formatDate(item.date)}` : ''}
          ${category ? ` • ${category}` : ''}
        </div>
      `;
      break;
    case 'watch':
      const youtubeUrl = getYouTubeWatchUrl(item.embedUrl);
      cardClickHandler = `onclick="window.open('${youtubeUrl}', '_blank')" style="cursor: pointer;"`;
      // Prepare rating logos
      const rtLogo = item.ratings?.rt ? 
        `<a href="${item.ratings.rt.url || '#'}" target="_blank" class="rating-logo rt-logo" title="View on Rotten Tomatoes">
          <span class="rt-tomato">🍅</span>
          <span class="score">${item.ratings.rt.score}</span>
        </a>` : '';
      
      const imdbLogo = item.ratings?.imdb ? 
        `<a href="${item.ratings.imdb.url || '#'}" target="_blank" class="rating-logo imdb-logo" title="View on IMDb">
          <span class="imdb-icon">IMDb</span>
          <span class="score">${item.ratings.imdb.score}</span>
        </a>` : '';
      
      overlayContent = `
        ${mediaTypeIcon}
        ${thumbsIcon ? `<div class="media-overlay-thumbs">${thumbsIcon}</div>` : ''}
        <div class="media-overlay-title">${item.title}</div>
        <div class="media-overlay-desc">${item.description || ''}</div>
        <div class="media-overlay-meta">
          ${item.date ? `${formatDate(item.date)}` : ''}
          ${category ? ` • ${category}` : ''}
        </div>
        <div class="rating-logos">
          ${rtLogo}
          ${imdbLogo}
        </div>
      `;
      break;
    case 'listen':
      // Generate listen links with Font Awesome icons
      let listenLinks = '';
      if (item.links && item.links.length > 0) {
        listenLinks = '<div class="listen-links">';
        item.links.forEach(link => {
          const platform = link.label.toLowerCase();
          let iconClass = 'fas fa-link';
          
          // Match icons to those used in listen.html
          if (platform.includes('apple') || platform.includes('podcast')) {
            iconClass = 'fab fa-apple';
          } else if (platform.includes('spotify')) {
            iconClass = 'fab fa-spotify';
          } else if (platform.includes('youtube')) {
            iconClass = 'fab fa-youtube';
          } else if (platform.includes('amazon')) {
            iconClass = 'fab fa-amazon';
          } else if (platform.includes('soundcloud')) {
            iconClass = 'fab fa-soundcloud';
          } else if (platform.includes('google') || platform.includes('play')) {
            iconClass = 'fab fa-google-play';
          } else if (platform.includes('rss') || platform.includes('feed')) {
            iconClass = 'fas fa-rss';
          }
          
          listenLinks += `
            <a href="${link.url}" target="_blank" rel="noopener" class="listen-link">
              <i class="${iconClass}"></i>
            </a>`;
        });
        listenLinks += '</div>';
        
        // Make card clickable to first link
        cardClickHandler = `onclick="window.open('${item.links[0].url}', '_blank')" style="cursor: pointer;"`;
      }
      
      overlayContent = `
        ${mediaTypeIcon}
        ${thumbsIcon ? `<div class="media-overlay-thumbs">${thumbsIcon}</div>` : ''}
        <div class="media-overlay-title">${item.title}</div>
        <div class="media-overlay-desc">${item.description || ''}</div>
        <div class="media-overlay-meta">
          ${category || ''}
        </div>
        ${listenLinks}
      `;
      break;
  }
  
  return `
    <div class="media-card" data-type="${mediaType}" data-thumbs="${item.thumbs || ''}" data-category="${category}" ${cardClickHandler}>
      ${coverImage ? 
        `<img src="${coverImage}" alt="${item.title}" class="media-cover" loading="lazy">` :
        `<div class="media-placeholder">${placeholderIcon}</div>`
      }
      
      ${item.featured ? '<div class="featured-badge">Featured</div>' : ''}
      
      <div class="media-overlay">
        ${overlayContent}
      </div>
    </div>
  `;
}

// Render all media cards
function renderMediaCards() {
  if (filteredItems.length === 0) {
    mediaCardsContainer.innerHTML = '<p style="text-align: center; color: #666; width: 100%;">No items match the current filters.</p>';
    return;
  }

  const cardsHTML = filteredItems.map(item => createMediaCard(item)).join('');
  mediaCardsContainer.innerHTML = cardsHTML;
}

// Filter media items
function filterMedia() {
  const typeValue = typeFilter.value;
  const thumbsValue = thumbsFilter.value;
  const categoryValue = categoryFilter.value;

  filteredItems = allMediaItems.filter(item => {
    // Type filter
    if (typeValue !== 'all' && getMediaType(item) !== typeValue) {
      return false;
    }

    // Thumbs filter
    if (thumbsValue !== 'all' && item.thumbs !== thumbsValue) {
      return false;
    }

    // Category filter
    if (categoryValue !== 'all') {
      const itemCategory = item.genre || item.category || '';
      if (itemCategory !== categoryValue) {
        return false;
      }
    }

    return true;
  });

  renderMediaCards();
}

// Event listeners
typeFilter.addEventListener('change', filterMedia);
thumbsFilter.addEventListener('change', filterMedia);
categoryFilter.addEventListener('change', filterMedia);

// Initialize the page
document.addEventListener('DOMContentLoaded', loadAllMedia);
