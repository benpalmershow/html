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
            journals.sort((a, b) => new Date(b.date) - new Date(a.date));
            
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
                            <time datetime="${journal.date}">${formatDate(journal.date)}</time>
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}