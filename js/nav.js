(function() {
    const navItems = [{
        text: "Home",
        href: "/index.html",
        icon: "🏠",
        image: ""
    }, {
        text: "Announcements",
        href: "/read.html",
        icon: "",
        image: "/images/announcements.png"
    }, {
        text: "Numbers",
        href: "/financials.html",
        icon: "📊",
        image: ""
    }, {
        text: "News",
        href: "/news.html",
        icon: "📰",
        image: ""
    }, {
        text: "Media",
        href: "/media.html",
        icon: "",
        image: "/images/read.png"
    }, {
        text: "Journal",
        href: "/journal.html",
        icon: "✍️",
        image: ""
    }];

    function createNavbar() {
        const nav = document.createElement('nav');
        nav.className = 'floating-nav';

        const path = window.location.pathname;
        const currentPage = path === '/' ? '/index.html' : path;

        nav.innerHTML = navItems.map(item => {
            const isActive = item.href === currentPage ? ' active' : '';
            let iconHtml = '';
            if (item.image) {
                iconHtml = `<img src="${item.image}" alt="${item.text}" class="nav-icon">`;
            } else if (item.icon) {
                iconHtml = `<span class="nav-emoji">${item.icon}</span>`;
            }

            return `
                <a href="${item.href}" class="nav-link${isActive}" title="${item.text}">
                    ${iconHtml}
                </a>
            `;
        }).join('');

        return nav;
    }

    function injectNavbar() {
        // Remove old nav elements if they exist to prevent conflicts
        const oldNav = document.querySelector('.nav-links');
        if (oldNav) {
            const parent = oldNav.parentNode;
            if(parent){
                const topLine = parent.querySelector('.nav-top-line');
                if(topLine) topLine.remove();
            }
            oldNav.remove();
        }
        const oldStyles = document.querySelector('#nav-bar-styles');
        if (oldStyles) {
            oldStyles.remove();
        }
        const oldExtraLines = document.querySelector('#nav-extra-lines');
        if(oldExtraLines) {
            oldExtraLines.remove();
        }

        const navbar = createNavbar();
        document.body.prepend(navbar);

        if (document.querySelector('#floating-nav-styles')) return;

        const style = document.createElement('style');
        style.id = 'floating-nav-styles';
        style.textContent = `
            :root {
                --nav-height: 50px;
                --nav-bg: rgba(255, 255, 255, 0.6);
                --nav-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
                --nav-icon-size: 24px;
            }

            body {
                /* Add padding to prevent content from being hidden by the floating nav */
                padding-top: 80px;
            }

            .floating-nav {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: auto;
                height: var(--nav-height);
                padding: 0 15px;
                border-radius: 25px;
                background: var(--nav-bg);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                box-shadow: var(--nav-shadow);
                border: 1px solid rgba(255, 255, 255, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                z-index: 1000;
                transition: top 0.3s;
            }

            .floating-nav a.nav-link {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                transition: all 0.3s ease;
                text-decoration: none;
                color: var(--text-primary);
            }

            .floating-nav a.nav-link:hover {
                background: rgba(0, 0, 0, 0.05);
            }

            .floating-nav a.nav-link.active {
                background: rgba(0, 0, 0, 0.1);
            }

            .floating-nav .nav-icon,
            .floating-nav .nav-emoji {
                font-size: var(--nav-icon-size);
                width: var(--nav-icon-size);
                height: var(--nav-icon-size);
                object-fit: cover;
            }
            
            .floating-nav .nav-icon {
                border-radius: 4px;
            }

            .floating-nav .nav-emoji {
                line-height: 1;
            }
        `;
        document.head.appendChild(style);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectNavbar);
    } else {
        injectNavbar();
    }
})();
