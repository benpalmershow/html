const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Path to the media.json file
const mediaPath = path.join(__dirname, '../json/media.json');

// Read the media.json file
let mediaData = [];
try {
  const fileContent = fs.readFileSync(mediaPath, 'utf8');
  mediaData = JSON.parse(fileContent);
} catch (error) {
  console.error('Error reading media.json:', error);
  process.exit(1);
}

// Function to extract ISBN from Amazon URL
function extractIsbn(url) {
  if (!url) return null;
  
  // Check for Amazon URL pattern
  const amazonMatch = url.match(/amazon[^/]+\/(?:[^/]+\/)?(?:dp|gp\/product)\/([^/?]+)/i);
  if (amazonMatch && amazonMatch[1]) {
    return amazonMatch[1];
  }
  
  return null;
}

// Function to search OpenLibrary for a book cover
async function getOpenLibraryCoverUrl(book) {
  // First try to find ISBN from Amazon URL if exists
  const amazonLink = book.links?.find(link => link.url?.includes('amazon.com'));
  const isbn = amazonLink ? extractIsbn(amazonLink.url) : null;
  
  // If we have an ISBN, try to get cover using that
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  }
  
  // If no ISBN, try searching by title and author
  try {
    const searchQuery = encodeURIComponent(`${book.title} ${book.author}`);
    const response = await axios.get(`https://openlibrary.org/search.json?q=${searchQuery}&limit=1`);
    
    if (response.data.docs && response.data.docs.length > 0) {
      const workId = response.data.docs[0].cover_i;
      if (workId) {
        return `https://covers.openlibrary.org/b/id/${workId}-L.jpg`;
      }
    }
  } catch (error) {
    console.error(`Error searching OpenLibrary for ${book.title}:`, error.message);
  }
  
  return null;
}

// Main function to update cover URLs
async function updateCoverUrls() {
  let updatedCount = 0;
  
  for (const item of mediaData) {
    if (item.mediaType === 'book' && item.cover) {
      // Skip if already using OpenLibrary
      if (item.cover.includes('openlibrary.org')) {
        console.log(`Skipping (already using OpenLibrary): ${item.title}`);
        continue;
      }
      
      console.log(`Updating cover for: ${item.title}`);
      
      try {
        const openLibraryUrl = await getOpenLibraryCoverUrl(item);
        if (openLibraryUrl) {
          console.log(`  Found OpenLibrary cover: ${openLibraryUrl}`);
          item.cover = openLibraryUrl;
          updatedCount++;
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log(`  No OpenLibrary cover found for: ${item.title}`);
        }
      } catch (error) {
        console.error(`Error updating cover for ${item.title}:`, error.message);
      }
    }
  }
  
  return updatedCount;
}

// Run the update
(async () => {
  console.log('Starting to update book cover URLs...');
  const updatedCount = await updateCoverUrls();
  
  // Write the updated data back to media.json
  fs.writeFileSync(mediaPath, JSON.stringify(mediaData, null, 2));
  
  console.log(`\nUpdate complete! Updated ${updatedCount} book covers.`);
  console.log(`The updated data has been saved to ${mediaPath}`);
})();
