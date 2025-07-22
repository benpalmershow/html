const fs = require('fs');
const path = require('path');

// Paths
const mediaPath = path.join(__dirname, 'json/media.json');

// Read the media data
const mediaData = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));

// Define standard field order for different media types
const fieldOrder = {
  common: ['title', 'author', 'category', 'mediaType', 'description', 'date'],
  book: ['genre', 'titleColor', 'tag', 'thumbs', 'cover', 'url'],
  movie: ['embedUrl', 'ratings', 'thumbs', 'cover', 'url'],
  podcast: ['icon', 'links', 'thumbs', 'cover', 'url'],
  song: ['icon', 'links', 'thumbs', 'cover', 'url'],
  album: ['icon', 'links', 'thumbs', 'cover', 'url'],
  playlist: ['icon', 'links', 'thumbs', 'cover', 'url'],
  article: ['source', 'url', 'thumbs', 'cover']
};

// Standardize each entry
const standardizedMedia = mediaData.map(entry => {
  // Ensure mediaType and category exist
  if (!entry.mediaType || !entry.category) {
    console.warn(`Entry missing mediaType or category: ${entry.title}`);
  }

  // Standardize URLs
  if (entry.url) {
    entry.url = entry.url.split('?')[0]; // Remove query params
  }
  
  // Standardize cover image URLs
  if (entry.cover) {
    if (entry.cover.includes('via.placeholder.com') && !entry.cover.includes('text=')) {
      // Add descriptive text to placeholder images
      const mediaText = {
        'book': '📚',
        'movie': '🎬',
        'podcast': '🎙️',
        'song': '🎵',
        'album': '💿',
        'playlist': '🎧',
        'article': '📄'
      }[entry.mediaType] || '📌';
      
      entry.cover = `https://via.placeholder.com/400x400/2C5F5A/FFFFFF?text=${encodeURIComponent(mediaText + ' ' + entry.mediaType)}`;
    }
  }

  // Standardize ratings format for movies
  if (entry.ratings) {
    if (entry.ratings.rt && typeof entry.ratings.rt === 'string') {
      entry.ratings.rt = { score: entry.ratings.rt };
    }
    if (entry.ratings.imdb && typeof entry.ratings.imdb === 'string') {
      entry.ratings.imdb = { score: entry.ratings.imdb };
    }
  }

  // Standardize links array
  if (entry.links && Array.isArray(entry.links)) {
    entry.links = entry.links.map(link => ({
      label: link.label || '',
      icon: link.icon || getDefaultIcon(link.url),
      url: link.url || ''
    }));
  }

  // Create a new object with standardized field order
  const standardEntry = {};
  const entryType = entry.mediaType || 'common';
  const typeFields = fieldOrder[entryType] || [];
  const allFields = [...new Set([...fieldOrder.common, ...typeFields])];
  
  // Add fields in standard order
  allFields.forEach(field => {
    if (entry[field] !== undefined) {
      standardEntry[field] = entry[field];
    }
  });

  // Add any remaining fields that weren't in our standard order
  Object.keys(entry).forEach(key => {
    if (!standardEntry[key] && entry[key] !== undefined) {
      standardEntry[key] = entry[key];
    }
  });

  return standardEntry;
});

// Helper function to get default icon based on URL
function getDefaultIcon(url) {
  if (!url) return 'fas fa-link';
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'fab fa-youtube';
  } else if (url.includes('spotify.com')) {
    return 'fab fa-spotify';
  } else if (url.includes('apple.com') || url.includes('itunes.apple.com')) {
    return 'fab fa-apple';
  } else if (url.includes('amazon.com')) {
    return 'fab fa-amazon';
  } else if (url.includes('netflix.com')) {
    return 'fab fa-netflix';
  } else if (url.includes('imdb.com')) {
    return 'fab fa-imdb';
  } else if (url.includes('rottentomatoes.com')) {
    return 'fas fa-tomato';
  } else if (url.includes('goodreads.com')) {
    return 'fab fa-goodreads';
  } else if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'fab fa-twitter';
  } else if (url.includes('facebook.com')) {
    return 'fab fa-facebook';
  } else if (url.includes('instagram.com')) {
    return 'fab fa-instagram';
  } else if (url.includes('linkedin.com')) {
    return 'fab fa-linkedin';
  } else if (url.includes('github.com')) {
    return 'fab fa-github';
  } else {
    return 'fas fa-external-link-alt';
  }
}

// Write the standardized data back to the file
fs.writeFileSync(mediaPath, JSON.stringify(standardizedMedia, null, 2));
console.log('Successfully standardized all entries in media.json');
