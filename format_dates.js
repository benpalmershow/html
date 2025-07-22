const fs = require('fs');
const path = require('path');

// Read the media.json file
const mediaPath = path.join(__dirname, 'json', 'media.json');
const mediaData = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));

// Function to validate and format a date string
function formatDate(dateStr) {
  if (!dateStr) return null;
  
  // Check if the date is already in the correct format (Month YYYY)
  const monthYearRegex = /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/;
  if (monthYearRegex.test(dateStr)) {
    return dateStr; // Already in the correct format
  }
  
  // Try to parse other date formats if needed
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Format as "Month YYYY"
      return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
  } catch (e) {
    console.warn(`Could not parse date: ${dateStr}`);
  }
  
  // Return the original string if we can't parse it
  return dateStr;
}

// Update each entry with formatted dates
const updatedMedia = mediaData.map(entry => {
  if (entry.date) {
    const formattedDate = formatDate(entry.date);
    if (formattedDate && formattedDate !== entry.date) {
      return {
        ...entry,
        date: formattedDate
      };
    }
  }
  return entry;
});

// Write the updated data back to the file
fs.writeFileSync(mediaPath, JSON.stringify(updatedMedia, null, 2));

console.log('Successfully updated date formats in media.json.');
