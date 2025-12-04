/**
 * Marked.js dynamic loader with event-based detection
 */

const markedLoaderCallbacks = [];
let markedLoaded = false;

// Emit event when marked loads
const originalFetchHandler = window.fetch;

export function waitForMarked() {
    return new Promise((resolve) => {
        // Check if already loaded
        if (window.marked) {
            markedLoaded = true;
            resolve(window.marked);
            return;
        }

        // Use window.loadMarked if available (from index.html's library loader)
        if (window.loadMarked && typeof window.loadMarked === 'function') {
            window.loadMarked().then(() => {
                markedLoaded = true;
                resolve(window.marked);
            });
            return;
        }

        // Fallback: Poll with timeout
        let attempts = 0;
        const maxAttempts = 100;

        const checkInterval = setInterval(() => {
            attempts++;
            if (window.marked) {
                clearInterval(checkInterval);
                markedLoaded = true;
                resolve(window.marked);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.warn('Marked.js timeout, using raw content');
                resolve(null);
            }
        }, 50);
    });
}

export function isMarkedLoaded() {
    return markedLoaded || !!window.marked;
}
