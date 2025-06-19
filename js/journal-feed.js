document.addEventListener('DOMContentLoaded', () => {
    fetch('/json/journal.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load journal entries');
            }
            return response.json();
        })
        .then(journals => {
            // Sort journals by date (newest first)
            journals.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Generate HTML for each journal entry
            const journalFeed = document.getElementById('journal-feed');
            journalFeed.innerHTML = journals.map(journal => {
                const entriesHTML = journal.entries.map(entry => `
                    <div class="entry">
                        <h3 class="entry-title">${entry.title}</h3>
                        <div class="entry-content">${entry.content}</div>
                    </div>
                `).join('');
                
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
        })
        .catch(error => {
            console.error('Error loading journal entries:', error);
            document.getElementById('journal-feed').innerHTML = 
                '<div class="error-state">Error loading journal entries. Please try again later.</div>';
        });
});

// Helper function to format date for display
function formatDate(dateString) {
    try {
        // Handle the MM/DD/YY format in your JSON
        const [month, day, year] = dateString.split('/');
        // Convert 2-digit year to 4-digit year (assuming 20xx)
        const fullYear = year.length === 2 ? `20${year}` : year;
        const date = new Date(fullYear, month - 1, day);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return dateString; // Return original string if parsing fails
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString; // Return original string if error occurs
    }
}

// Helper function to format date for datetime attribute
function formatDateForDateTime(dateString) {
    try {
        const [month, day, year] = dateString.split('/');
        const fullYear = year.length === 2 ? `20${year}` : year;
        const date = new Date(fullYear, month - 1, day);
        
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
    } catch (error) {
        console.error('Error formatting datetime:', error);
        return dateString;
    }
}