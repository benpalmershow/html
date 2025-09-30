// Countdown functionality for NFL games
function updateCountdown() {
    const countdownElement = document.querySelector('.game-countdown');
    if (!countdownElement) return;

    // Game time: October 2, 2025 17:15:00 PDT (5:15 PM PDT)
    const gameTime = new Date('2025-10-02T17:15:00-07:00').getTime();
    const now = new Date().getTime();
    const distance = gameTime - now;

    // If countdown is over
    if (distance < 0) {
        countdownElement.textContent = 'Game in progress';
        return;
    }

    // Calculate time remaining
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Display the countdown
    countdownElement.textContent = ` (${days}d ${hours}h ${minutes}m ${seconds}s)`;
}

// Initialize countdown when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Start countdown timer and update every second
    updateCountdown();
    setInterval(updateCountdown, 1000);
});
