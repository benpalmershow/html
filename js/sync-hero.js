(function () {
    // Sync the index.html hero section with the first podcast entry in json/media.json
    // Hero links are sourced from media.json as a single source of truth

    async function syncHeroFromMedia() {
        const titleEl = document.querySelector('.latest-episode-title a');
        const descEl = document.querySelector('.latest-episode-desc');
        const platformsEl = document.querySelector('.latest-episode-platforms');
        const coverEl = document.querySelector('.latest-episode-cover img');

        if (!titleEl || !platformsEl) return;

        try {
            const version = document.querySelector('meta[name="site-data-version"]')?.content || 'latest';
            const response = await fetch(`json/media.json?v=${encodeURIComponent(version)}`);

            if (!response.ok) throw new Error('Failed to fetch media.json');

            const items = await response.json();

            // Find the first podcast entry
            const featured = items.find(item => item.mediaType === 'podcast');

            if (!featured) return;

            // Update title
            titleEl.textContent = featured.title;
            if (featured.author) {
                titleEl.setAttribute('aria-label', `${featured.title} by ${featured.author}`);
            }

            // Update description
            if (descEl && featured.description) {
                descEl.textContent = featured.description;
            }

            // Update cover if present
            if (coverEl && featured.cover) {
                coverEl.src = featured.cover;
            }

            // Rebuild platform links from media.json links array
            platformsEl.innerHTML = '';
            if (featured.links?.length > 0) {
                featured.links.forEach(link => {
                    const href = link.url || link.href;
                    if (!href) return;

                    const a = document.createElement('a');
                    a.href = href;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.title = link.label || link.name || href;
                    a.className = 'platform-link';

                    // Infer platform class from label/icon
                    const label = (link.label || link.name || '').toLowerCase();
                    if (label.includes('spotify')) a.classList.add('spotify');
                    else if (label.includes('apple')) a.classList.add('apple');
                    else if (label.includes('youtube')) a.classList.add('youtube');
                    else if (label.includes('amazon')) a.classList.add('amazon');

                    if (link.icon) {
                        a.innerHTML = `<i class="${link.icon}"></i>`;
                    } else {
                        a.textContent = link.label || link.name || '';
                    }

                    platformsEl.appendChild(a);
                });
            }
        } catch (err) {
            console.error('sync-hero: failed to update hero from media.json', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncHeroFromMedia);
    } else {
        syncHeroFromMedia();
    }
})();
