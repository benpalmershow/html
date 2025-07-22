const fs = require('fs');
const path = require('path');

// Read the media.json file
const mediaPath = path.join(__dirname, 'json', 'media.json');
const mediaData = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));

// Function to determine media type and category
function getMediaTypeAndCategory(entry) {
  // Check for Podcasts
  if (entry.icon && (entry.icon.includes('microphone') || entry.icon.includes('podcast'))) {
    return { mediaType: 'podcast', category: 'Podcast' };
  }
  
  // Check for Music (Songs/Albums/Playlists)
  if (entry.icon && entry.icon.includes('music')) {
    // Check if it's a playlist (has multiple songs)
    if (entry.title && (entry.title.toLowerCase().includes('playlist') || 
                       entry.title.toLowerCase().includes('mix') ||
                       (entry.links && entry.links.length > 1))) {
      return { mediaType: 'playlist', category: 'Music' };
    }
    // Check if it's an album
    if (entry.title && (entry.title.toLowerCase().includes('album') || 
                       (entry.links && entry.links.length > 1))) {
      return { mediaType: 'album', category: 'Music' };
    }
    // Default to song
    return { mediaType: 'song', category: 'Music' };
  }
  
  // Check for Movies
  if (entry.category === 'Movie' || entry.ratings || entry.embedUrl) {
    return { mediaType: 'movie', category: 'Movie' };
  }
  
  // Check for Books
  if (entry.genre || entry.author) {
    // If it's a book with chapters, it might be an audiobook
    if (entry.links && entry.links.some(link => link.label && 
        (link.label.toLowerCase().includes('chapter') || 
         link.label.toLowerCase().includes('part')))) {
      return { mediaType: 'audiobook', category: 'Book' };
    }
    return { mediaType: 'book', category: entry.genre || 'Book' };
  }
  
  // Default to article if no other type is determined
  return { mediaType: 'article', category: 'Article' };
}

// Update each entry with mediaType and category
const updatedMedia = mediaData.map(entry => {
  // Get media type and category
  const { mediaType, category } = getMediaTypeAndCategory(entry);
  
  // Create a new object with the new fields
  return {
    ...entry,
    mediaType: mediaType,
    category: category
  };
});

// Write the updated data back to the file
fs.writeFileSync(mediaPath, JSON.stringify(updatedMedia, null, 2));

console.log('Successfully updated media.json with specific media types and categories.');
