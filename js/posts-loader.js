const TimeFormatter = (function () {
    function formatTimeAgo(dateString) {
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

    function startTimeUpdates() {
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

    return { formatTimeAgo, startTimeUpdates };
})();

/* =========================================
   Carousel Module - Continuous Scroll Controller
   ========================================= */

const CarouselModule = (function () {
    let isPaused = false;
    let pauseBtn = null;\n
    function createPauseButton(container) {
        const btn = document.createElement('button');
        btn.className = 'carousel-pause-btn';
        btn.setAttribute('aria-label', 'Pause auto-scroll');
        btn.setAttribute('title', 'Pause scrolling (Space)');
        btn.innerHTML = `
            <svg class="pause-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
            <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none">
                <polygon points="6,4 20,12 6,20"/>
            </svg>
        `;
        btn.addEventListener('click', togglePause);
        return btn;
    }

    function togglePause() {
        isPaused = !isPaused;
        const track = document.querySelector('.carousel-track');
        if (!track) return;

        if (isPaused) {
            track.classList.add('paused');
            pauseBtn?.classList.add('paused');
            pauseBtn?.setAttribute('aria-label', 'Resume auto-scroll');
            pauseBtn?.querySelector('.pause-icon').style.display = 'none';
            pauseBtn?.querySelector('.play-icon').style.display = 'block';
        } else {
            track.classList.remove('paused');
            pauseBtn?.classList.remove('paused');
            pauseBtn?.setAttribute('aria-label', 'Pause auto-scroll');
            pauseBtn?.querySelector('.pause-icon').style.display = 'block';
            pauseBtn?.querySelector('.play-icon').style.display = 'none';
        }
    }

    function handleKeyDown(e) {
        if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            e.preventDefault();
            togglePause();
        }
    }

    function init(container) {
        const track = container.querySelector('.carousel-track');
        if (!track) return;

        pauseBtn = createPauseButton(container);
        container.appendChild(pauseBtn);

        // Pause on hover for better UX
        track.addEventListener('mouseenter', () => {
            if (!isPaused) track.classList.add('paused');
        });
        track.addEventListener('mouseleave', () => {
            if (!isPaused) track.classList.remove('paused');
        });

        document.addEventListener('keydown', handleKeyDown);

        // Add touch swipe pause on mobile
        let touchStartY = 0;
        track.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        track.addEventListener('touchend', () => {
            if (!isPaused) track.classList.remove('paused');
        });
    }

    return { init, togglePause, isPaused: () => isPaused };
})();