// Function to format the date
function formatDate(date) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(date).toLocaleDateString('en-US', options);
}

// Function to update the last modified date
function updateLastModified() {
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        // Get the last commit date from the meta tag
        const lastCommitMeta = document.querySelector('meta[name="last-commit"]');
        if (lastCommitMeta) {
            const lastCommitDate = lastCommitMeta.getAttribute('content');
            lastUpdatedElement.textContent = `Last updated: ${formatDate(lastCommitDate)}`;
        }
    }
}

// Run when the DOM is loaded
document.addEventListener('DOMContentLoaded', updateLastModified); 