(function () {
    const navItems = [{
        text: "Home",
        href: "../index.html",
        icon: "",
        image: "../images/announcements.png"
    }, {
        text: "Numbers",
        href: "../financials.html",
        icon: "📊",
        image: ""
    }, {
        text: "News",
        href: "../news.html",
        icon: "📰",
        image: ""
    }, {
        text: "Media",
        href: "../media.html",
        icon: "",
        image: "../images/media.png"
    }, {
        text: "Tweets",
        href: "../journal.html",
        icon: "",
        image: "../images/read.png"
    }];

    function createNavbar() {
    const nav = document.createElement('nav');
    nav.className = 'floating-nav';

    const path = window.location.pathname;
        const currentPage = path === '/' ? '/index.html' : path;

    nav.innerHTML = navItems.map(item => {
    // Better active page detection
    const itemPath = item.href.replace('../', '/').replace('./', '/');
    const normalizedCurrent = currentPage.endsWith('/') ? currentPage : currentPage + '/';
    const normalizedItem = itemPath.endsWith('/') ? itemPath : itemPath + '/';

    const isActive = normalizedCurrent.includes(itemPath.split('/').pop().replace('.html', '')) ||
    itemPath === currentPage ||
    (currentPage === '/' && itemPath.includes('index.html')) ||
    (currentPage.includes('index.html') && itemPath.includes('index.html'));

    let iconHtml = '';
    if (item.image) {
    iconHtml = `<img src="${item.image}" alt="${item.text}" class="nav-icon">`;
    } else if (item.icon) {
    iconHtml = `<span class="nav-emoji">${item.icon}</span>`;
    }

    return `
    <a href="${item.href}" class="nav-link${isActive ? ' active' : ''}" title="${item.text}">
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
            if (parent) {
                const topLine = parent.querySelector('.nav-top-line');
                if (topLine) topLine.remove();
            }
            oldNav.remove();
        }
        const oldStyles = document.querySelector('#nav-bar-styles');
        if (oldStyles) {
            oldStyles.remove();
        }
        const oldExtraLines = document.querySelector('#nav-extra-lines');
        if (oldExtraLines) {
            oldExtraLines.remove();
        }

        const navbar = createNavbar();
        document.body.prepend(navbar);

        // Add theme toggle as separate fixed element
        const toggle = document.createElement('button');
        toggle.id = 'theme-toggle';
        toggle.className = 'theme-toggle-fixed';
        toggle.setAttribute('aria-label', 'Toggle dark mode');
        toggle.title = 'Toggle dark/light mode';
        toggle.innerHTML = `
            <div class="theme-toggle-icon">
                <i class="fas fa-moon"></i>
            </div>
        `;
        document.body.appendChild(toggle);

        // Cache DOM references
        const navbarElement = navbar;
        const toggleElement = toggle;

        // Inactivity detection
        let inactivityTimer;
        const inactivityDelay = 5000; // 5 seconds

        function resetInactivityTimer() {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                navbarElement.classList.add('hidden');
                toggleElement.classList.add('hidden');
            }, inactivityDelay);
        }

        function showNav() {
            navbarElement.classList.remove('hidden');
            toggleElement.classList.remove('hidden');
            resetInactivityTimer();
        }

        // Add event listeners for activity
        ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, showNav, true);
        });

        // Start the timer initially
        resetInactivityTimer();

        // Get or create back to top button
        const backToTopBtn = document.getElementById('back-to-top') || (() => {
            const btn = document.createElement('button');
            btn.id = 'back-to-top';
            btn.className = 'back-to-top';
            btn.setAttribute('aria-label', 'Back to top');
            btn.innerHTML = '<i data-lucide="arrow-up" style="width: 1rem; height: 1rem;"></i>';
            document.body.appendChild(btn);
            return btn;
        })();

        // Ensure icons are created
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Back to top functionality
        let lastScrollTop = 0;
        let inactivityTimerBackToTop;

        function resetInactivityTimerBackToTop() {
            clearTimeout(inactivityTimerBackToTop);
            inactivityTimerBackToTop = setTimeout(() => {
                backToTopBtn.classList.remove('show');
            }, inactivityDelay);
        }

        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const isScrollingDown = scrollTop > lastScrollTop;
            if (isScrollingDown && scrollTop > 300) {
                backToTopBtn.classList.remove('show');
            } else if (!isScrollingDown && scrollTop > 300) {
                backToTopBtn.classList.add('show');
                resetInactivityTimerBackToTop();
            } else if (scrollTop <= 300) {
                backToTopBtn.classList.remove('show');
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;

            // Hide nav when at top to make toggle visible on small screens
            if (window.innerWidth <= 768 && scrollTop === 0) {
                navbarElement.classList.add('at-top');
            } else {
                navbarElement.classList.remove('at-top');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Inactivity detection for back to top
        ['mousemove', 'keydown', 'click', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetInactivityTimerBackToTop, true);
        });

        if (document.querySelector('#floating-nav-styles')) return;

        const style = document.createElement('style');
        style.id = 'floating-nav-styles';
        style.textContent = `
            :root {
                --nav-height: 50px;
                --nav-bg: rgba(255, 255, 255, 0.4);
                --nav-shadow: 0 8px 25px rgba(0, 0, 0, 0.15), 0 15px 35px rgba(0, 0, 0, 0.1), 0 20px 40px rgba(0, 0, 0, 0.05);
                --nav-icon-size: 20px;
                --nav-active-color: #4A5568;
                --nav-hover-color: rgba(74, 85, 104, 0.1);
                --nav-active-bg: rgba(74, 85, 104, 0.2);
            }

            body {
                /* Add padding to prevent content from being hidden by the floating nav */
                padding-top: 90px;
            }

            .floating-nav {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: auto;
                height: var(--nav-height);
                padding: 0 8px;
                border-radius: 25px;
                background: var(--nav-bg);
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                box-shadow: var(--nav-shadow);
                border: 1px solid rgba(255, 255, 255, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                z-index: 1000;
                transition: all 0.3s ease;
            }

            .floating-nav.at-top {
                top: -70px;
                box-shadow: none;
            }

            .floating-nav:hover {
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18), 0 20px 45px rgba(0, 0, 0, 0.12), 0 25px 50px rgba(0, 0, 0, 0.08);
                transform: translateX(-50%) translateY(-2px);
            }

            .floating-nav a.nav-link {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                border-radius: 22px;
                transition: all 0.3s ease;
                text-decoration: none;
                color: #666;
                overflow: hidden;
            }

            .floating-nav a.nav-link:hover {
                background: var(--nav-hover-color);
                color: var(--nav-active-color);
                transform: translateY(-1px);
            }

            .floating-nav a.nav-link.active {
                background: var(--nav-active-bg);
                color: var(--nav-active-color);
                box-shadow: 0 2px 12px rgba(74, 85, 104, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3);
                border: 1px solid rgba(74, 85, 104, 0.15);
                transform: scale(1.05);
            }



            .floating-nav .nav-icon {
                width: 30px;
                height: 30px;
                object-fit: cover;
                border-radius: 50%;
            }

            .floating-nav .nav-emoji {
                font-size: var(--nav-icon-size);
                width: var(--nav-icon-size);
                height: var(--nav-icon-size);
                line-height: 1;
            }

            .floating-nav .nav-text {
                font-size: 10px;
                font-weight: 500;
                line-height: 1;
                opacity: 0.8;
                transition: opacity 0.3s ease;
            }

            .floating-nav a.nav-link:hover .nav-text,
            .floating-nav a.nav-link.active .nav-text {
                opacity: 1;
                font-weight: 600;
            }

            .floating-nav .theme-toggle {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                border-radius: 22px;
                transition: all 0.3s ease;
                text-decoration: none;
                color: #666;
                border: none;
                background: transparent;
                cursor: pointer;
                overflow: hidden;
            }

            .floating-nav .theme-toggle:hover {
                background: var(--nav-hover-color);
                color: var(--nav-active-color);
                transform: translateY(-1px);
            }

            .floating-nav .theme-toggle .theme-toggle-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
            }

            .floating-nav .theme-toggle .theme-toggle-icon i {
                font-size: 0.9rem;
            }

            .theme-toggle-fixed {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0.3rem;
                border-radius: 50%;
                transition: all 0.2s ease;
                text-decoration: none;
                background: transparent;
                border: 1px solid transparent;
                z-index: 1001;
                cursor: pointer;
                color: #666;
            }

            .theme-toggle-fixed:hover {
                background: rgba(74, 85, 104, 0.1);
                color: #4A5568;
                transform: translateY(-1px);
            }

            .theme-toggle-fixed .theme-toggle-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
            }

            .theme-toggle-fixed .theme-toggle-icon i {
                font-size: 0.9rem;
            }

            .floating-nav.hidden {
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            .theme-toggle-fixed.hidden {
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            .back-to-top {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--logo-teal);
                color: white;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: none;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                z-index: 200;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }

            .back-to-top.show {
                display: flex;
            }

            .back-to-top:hover {
                background: var(--logo-orange);
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .floating-nav {
                    gap: 4px;
                }

                .floating-nav a.nav-link {
                    min-width: 45px;
                    height: 40px;
                    padding: 2px 6px;
                }

                .floating-nav .nav-text {
                    font-size: 9px;
                }

                .theme-toggle-fixed {
                    top: 15px;
                    right: 15px;
                    width: 30px;
                    min-height: 30px;
                    padding: 0.25rem;
                }

                .theme-toggle-fixed .theme-toggle-icon {
                    width: 18px;
                    height: 18px;
                }

                .theme-toggle-fixed .theme-toggle-icon i {
                    font-size: 0.8rem;
                }

                :root {
                    --nav-icon-size: 18px;
                }
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