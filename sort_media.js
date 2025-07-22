const fs = require('fs');
const path = require('path');

// Read the media.json file
const mediaPath = path.join(__dirname, 'json', 'media.json');
const mediaData = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));

// Function to convert date to a sortable format
function getSortableDate(item) {
  if (!item.date) return new Date(0); // Handle items without date
  
  let dateStr;
  if (typeof item.date === 'string') {
    dateStr = item.date;
  } else if (item.date.month && item.date.year) {
    dateStr = `${item.date.month} ${item.date.year}`;
  } else {
    return new Date(0);
  }
  
  // Parse the date string into a Date object
  return new Date(dateStr);
}

// Sort the media items by date (newest first)
const sortedMedia = [...mediaData].sort((a, b) => {
  const dateA = getSortableDate(a);
  const dateB = getSortableDate(b);
  return dateB - dateA; // Descending order (newest first)
});

// Write the sorted data back to the file
fs.writeFileSync(mediaPath, JSON.stringify(sortedMedia, null, 2));

console.log('Media items have been sorted by date (newest first)');
