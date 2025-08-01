document.addEventListener('DOMContentLoaded', () => {
            fetch('/json/journal.min.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load journal entries: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(journals => {
            // Validate that journals is an array
            if (!Array.isArray(journals)) {
                throw new Error('Journal data is not an array');
            }

            // Sort journals by date (newest first)
            journals.sort((a, b) => {
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                return dateB - dateA; // Newest first
            });
            
            // Generate HTML for each journal entry
            const journalFeed = document.getElementById('journal-feed');
            if (!journalFeed) {
                throw new Error('Journal feed element not found');
            }

            const html = journals.map(journal => {
                // Validate journal structure
                if (!journal || !journal.date) {
                    console.warn('Invalid journal entry - missing date:', journal);
                    return '';
                }

                if (!journal.entries || !Array.isArray(journal.entries)) {
                    console.warn('Invalid journal entry - missing or invalid entries:', journal);
                    return '';
                }

                const entriesHTML = journal.entries.map(entry => {
                    // Validate entry structure
                    if (!entry || typeof entry.title !== 'string' || typeof entry.content !== 'string') {
                        console.warn('Invalid entry:', entry);
                        return '';
                    }

                    return `
                        <div class="entry">
                            <h3 class="entry-title">${entry.title}</h3>
                            <div class="entry-content">${entry.content}</div>
                        </div>
                    `;
                }).join('');
                
                return `
                    <article class="journal-entry">
                        <div class="card-title">
                            <time datetime="${formatDateForDateTime(journal.date)}">${formatDate(journal.date)}</time>
                        </div>
                        <div class="content">
                            ${entriesHTML}
                        </div>
                    </article>
                `;
            }).join('');

            journalFeed.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading journal entries:', error);
            const journalFeed = document.getElementById('journal-feed');
            if (journalFeed) {
                journalFeed.innerHTML = 
                    '<div class="error-state">Error loading journal entries. Please try again later.</div>';
            }
        });
});

// Helper function to parse date from MM/DD/YY format
function parseDate(dateString) {
    try {
        if (!dateString || typeof dateString !== 'string') {
            console.error('Invalid date string:', dateString);
            return new Date(0);
        }

        const parts = dateString.split('/');
        if (parts.length !== 3) {
            console.error('Date string format invalid:', dateString);
            return new Date(0);
        }

        const [month, day, year] = parts;
        const fullYear = year.length === 2 ? `20${year}` : year;
        
        const parsedMonth = parseInt(month, 10);
        const parsedDay = parseInt(day, 10);
        const parsedYear = parseInt(fullYear, 10);

        // Validate parsed values
        if (isNaN(parsedMonth) || isNaN(parsedDay) || isNaN(parsedYear)) {
            console.error('Date parts could not be parsed:', { month, day, year });
            return new Date(0);
        }

        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        
        // Validate that the date is actually valid
        if (isNaN(date.getTime())) {
            console.error('Invalid date created:', dateString);
            return new Date(0);
        }

        return date;
    } catch (error) {
        console.error('Error parsing date:', dateString, error);
        return new Date(0); // Return epoch if parsing fails
    }
}

// Helper function to format date for display
function formatDate(dateString) {
    try {
        const date = parseDate(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime()) || date.getTime() === 0) {
            console.warn('Using original date string due to parsing failure:', dateString);
            return dateString; // Return original string if parsing fails
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return dateString; // Return original string if error occurs
    }
}

// Helper function to format date for datetime attribute
function formatDateForDateTime(dateString) {
    try {
        const date = parseDate(dateString);
        
        if (isNaN(date.getTime()) || date.getTime() === 0) {
            console.warn('Using original date string for datetime attribute:', dateString);
            return dateString;
        }
        
        return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
    } catch (error) {
        console.error('Error formatting datetime:', dateString, error);
        return dateString;
    }
}