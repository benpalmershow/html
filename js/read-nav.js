document.addEventListener('DOMContentLoaded', function() {
    const navLinks = [
        { href: 'read.html', title: 'Announcements', isLogo: true },
        { href: 'financials.html', icon: '📊', title: 'Financial Table' },
        { href: 'financials2.html', icon: '📈', title: 'Financial Dashboard' },
        { href: 'trumpvcasa.html', icon: '⚖️', title: 'Legal' },
        { href: 'fomc.html', icon: '🗒️', title: 'Monetary' },
        { href: 'ipo.html', icon: '💸', title: 'IPO News' },
        { href: 'journal.html', icon: '✍️', title: 'Journal' },
    ];

    const navContainer = document.querySelector('.nav-links');
    if (!navContainer) return;

    // Create sub-nav container
    const subNav = document.createElement('div');
    subNav.className = 'sub-nav';

    // Create top line
    const topLine = document.createElement('div');
    topLine.className = 'sub-nav-line';
    subNav.appendChild(topLine);

    // Create links container
    const linksContainer = document.createElement('div');
    linksContainer.className = 'financial-links';

    // Add each link
    navLinks.forEach((link, index) => {
        const a = document.createElement('a');
        a.href = link.href;
        a.className = 'financial-link';
        a.title = link.title;

        const logoDiv = document.createElement('div');
        logoDiv.className = 'financial-logo';
        
        if (link.isLogo) {
            const img = document.createElement('img');
            img.src = 'images/announcements.png';
            img.alt = 'Announcements';
            img.className = 'page-logo';
            logoDiv.appendChild(img);
        } else {
            logoDiv.textContent = link.icon;
        }

        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = link.title;

        logoDiv.appendChild(tooltip);
        a.appendChild(logoDiv);
        linksContainer.appendChild(a);

        // Add vertical line after Announcements icon
        if (index === 0) {
            const verticalLine = document.createElement('div');
            verticalLine.className = 'vertical-line';
            linksContainer.appendChild(verticalLine);
        }
    });

    // Create bottom line
    const bottomLine = document.createElement('div');
    bottomLine.className = 'sub-nav-line';

    // Assemble the sub-nav
    subNav.appendChild(linksContainer);
    subNav.appendChild(bottomLine);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .sub-nav {
            margin: 8px 0;
        }

        .sub-nav-line {
            height: 1px;
            background: var(--border-color);
            margin: 0 20px;
        }

        .financial-links {
            display: flex;
            flex-direction: row;
            gap: 12px;
            justify-content: center;
            padding: 8px 20px;
            flex-wrap: wrap;
            align-items: center;
        }

        .financial-link {
            text-decoration: none;
            color: var(--text-primary);
            transition: transform 0.2s ease;
        }

        .financial-link:hover {
            transform: translateY(-2px);
        }

        .financial-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px;
            border-radius: 4px;
            background: var(--bg-secondary);
            box-shadow: 0 1px 3px var(--shadow-color);
            font-size: 1.4rem;
            width: 40px;
            height: 40px;
            position: relative;
            overflow: hidden;
        }

        .page-logo {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 2px;
        }

        .vertical-line {
            width: 1px;
            height: 24px;
            background: var(--border-color);
            margin: 0 4px;
        }

        .tooltip {
            visibility: hidden;
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary);
            color: var(--text-primary);
            text-align: center;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            white-space: nowrap;
            box-shadow: 0 1px 3px var(--shadow-color);
            opacity: 0;
            transition: opacity 0.2s ease;
            z-index: 100;
        }

        .financial-logo:hover .tooltip {
            visibility: visible;
            opacity: 1;
        }

        @media (max-width: 768px) {
            .financial-links {
                flex-direction: row;
                justify-content: center;
                width: 100%;
            }
        }
    `;

    // Insert the sub-nav after the main nav
    navContainer.parentNode.insertBefore(subNav, navContainer.nextSibling);
    document.head.appendChild(style);
});