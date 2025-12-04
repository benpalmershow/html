/**
 * Time formatting utilities
 */

export function formatTimeAgo(dateString) {
    const postDate = new Date(dateString);
    if (isNaN(postDate)) return 'recently';

    const now = new Date();
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

export function startTimeUpdates() {
    // Only create one update interval globally
    if (window._timeUpdateInterval) return;

    window._timeUpdateInterval = setInterval(() => {
        document.querySelectorAll('.announcement-card').forEach(card => {
            const dateStr = card.getAttribute('data-date');
            if (dateStr) {
                const timeEl = card.querySelector('.post-time');
                if (timeEl) timeEl.textContent = formatTimeAgo(dateStr);
            }
        });
    }, 60000);
}

export function stopTimeUpdates() {
    if (window._timeUpdateInterval) {
        clearInterval(window._timeUpdateInterval);
        window._timeUpdateInterval = null;
    }
}
