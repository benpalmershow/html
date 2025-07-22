const fs = require('fs');
const path = require('path');

// Read the media.json file
const mediaPath = path.join(__dirname, 'json', 'media.json');
const mediaData = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));

// Function to determine media type and category
function getMediaTypeAndCategory(entry) {
  // Check for Podcasts
  if (entry.icon && (entry.icon.includes('microphone') || entry.icon.includes('podcast'))) {
    return { mediaType: 'listen', category: 'Podcast' };
  }
  
  // Check for Playlists
  if (entry.icon && entry.icon.includes('music')) {
    return { mediaType: 'listen', category: 'Playlist' };
  }
  
  // Check for Movies
  if (entry.category === 'Movie' || entry.ratings || entry.embedUrl) {
    return { mediaType: 'watch', category: 'Movie' };
  }
  
  // Check for Books
  if (entry.genre) {
    // Map genres to categories if needed
    const category = entry.genre || 'Book';
    return { mediaType: 'read', category };
  }
  
  // Default to read if no other type is determined
  return { mediaType: 'read', category: 'Article' };
}

// Update each entry with mediaType and category
const updatedMedia = mediaData.map(entry => {
  // Skip if already has both fields
  if (entry.mediaType && entry.category) {
    return entry;
  }
  
  // Get media type and category
  const { mediaType, category } = getMediaTypeAndCategory(entry);
  
  // Create a new object with the new fields
  return {
    ...entry,
    mediaType: entry.mediaType || mediaType,
    category: entry.category || category
  };
});

// Write the updated data back to the file
fs.writeFileSync(mediaPath, JSON.stringify(updatedMedia, null, 2));

console.log('Successfully updated media.json with mediaType and category fields.');
