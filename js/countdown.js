// Countdown functionality for game elements. Supports multiple .game-countdown elements each with a data-game-time attribute (ISO 8601 preferred).
function parseGameTime(value) {
    if (!value) return null;
    // If it looks like ISO or contains 'T', try Date parsing directly
    if (value.includes('T') || value.match(/\d{4}-\d{2}-\d{2}/)) {
        const t = Date.parse(value);
        return isNaN(t) ? null : t;
    }

    // Try to parse common human-readable formats (e.g., 'October 2, 2025 17:15:00 -0700')
    const t = Date.parse(value);
    return isNaN(t) ? null : t;
}

function updateAllCountdowns() {
    const elements = document.querySelectorAll('.game-countdown');
    if (!elements || elements.length === 0) return;

    const now = Date.now();
    elements.forEach(el => {
        const attr = el.getAttribute('data-game-time') || el.textContent || '';
        const gameTimeMs = parseGameTime(attr.trim());

        if (!gameTimeMs) {
            // If no valid time available, leave as-is or clear
            if (!el.dataset.placeholderSet) {
                el.textContent = 'TBD';
                el.dataset.placeholderSet = 'true';
            }
            return;
        }

        const distance = gameTimeMs - now;

        if (distance <= 0) {
            // Calculate hours since game started
            const hoursSinceStart = Math.abs(Math.floor(distance / (1000 * 60 * 60)));
            
            // If more than 4 hours have passed since the scheduled start time, the game is likely over
            if (hoursSinceStart >= 4) {
                el.textContent = 'Game completed';
            } else {
                el.textContent = 'Game in progress';
            }
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        el.textContent = ` (${days}d ${hours}h ${minutes}m ${seconds}s)`;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Run immediately and then every second
    updateAllCountdowns();
    setInterval(updateAllCountdowns, 1000);
});
