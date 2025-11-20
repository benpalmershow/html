const socialLinks = [
    {
        name: 'X (Twitter)',
        url: 'https://x.com/DocRiter',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg'
    },
    {
        name: 'YouTube',
        url: 'https://www.youtube.com/@BenPalmerShow',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg'
    },
    {
        name: 'Substack',
        url: 'https://benpalmershow.substack.com',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/substack.svg'
    },
    {
        name: 'Spotify',
        url: 'https://open.spotify.com/show/5re4DaXRuEkKHEYr3Mc6tJ',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/spotify.svg'
    },
    {
        name: 'Apple Podcasts',
        url: 'https://podcasts.apple.com/us/podcast/the-ben-palmer-show/id1529618289',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/applepodcasts.svg'
    },
    {
        name: 'Buy Me A Coffee',
        url: 'https://buymeacoffee.com/howdystranger',
        icon: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/buymeacoffee.svg'
    }
];

function initSocialFooter() {
    const socialContainer = document.querySelector('#social-footer .social-links');
    if (!socialContainer) return;

    socialContainer.innerHTML = socialLinks
        .map(link => `
            <a href="${link.url}" 
               target="_blank" 
               rel="noopener noreferrer" 
               aria-label="${link.name}"
               title="${link.name}">
                <img src="${link.icon}" 
                     alt="${link.name} logo" 
                     width="24" 
                     height="24"
                     loading="lazy"/>
            </a>
        `)
        .join('');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocialFooter);
} else {
    initSocialFooter();
}
