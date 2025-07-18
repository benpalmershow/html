!function(){const navItems=[
    { text: "Home", href: "index.html", icon: "🏠", image: "" },
    { text: "Listen", href: "listen.html", icon: "📻", image: "images/listen.png" },
    { text: "Numbers", href: "financials.html", icon: "📊", image: "" },
    { text: "Announcements", href: "read.html", icon: "", image: "images/announcements.png" },
    { text: "News", href: "news.html", icon: "📰", image: "" },
    { text: "Books", href: "books.html", icon: "📚", image: "" },
    { text: "Journal", href: "journal.html", icon: "✍️", image: "" },
    { text: "Watch", href: "watch.html", icon: "🎥", image: "images/watch.png" }
];

    function renderNav(){
        const currentPage = (function(){
            const t = window.location.pathname;
            return t.substring(t.lastIndexOf("/")+1) || "index.html";
        })();
        return navItems.map(item => {
            const isActive = item.href === currentPage ? " active" : "";
            let iconHtml = "";
            if(item.image){
                iconHtml = `<img src="${item.image}" alt="${item.text}" class="nav-icon">`;
            } else if(item.icon){
                iconHtml = `<span class="nav-emoji">${item.icon}</span>`;
            }
            return `<a class="nav-link${isActive}" href="${item.href}" title="${item.text}">
                ${iconHtml}
            </a>`;
        }).join("");
    }
    
    function injectNav(){
        const navContainer = document.querySelector(".nav-links");
        if(navContainer){
            // Insert horizontal line above nav
            if(!document.querySelector('.nav-top-line')){
                const topLine = document.createElement('div');
                topLine.className = 'nav-top-line';
                navContainer.parentNode.insertBefore(topLine, navContainer);
            }
            navContainer.innerHTML = renderNav();
            if(!document.querySelector('#nav-bar-styles')){
                const style = document.createElement('style');
                style.id = 'nav-bar-styles';
                style.textContent = `
                    .nav-links {
                        display: flex;
                        flex-direction: row;
                        gap: 12px;
                        justify-content: center;
                        padding: 8px 20px;
                        flex-wrap: wrap;
                        align-items: center;
                    }
                    .nav-link {
                        text-decoration: none;
                        color: var(--text-primary);
                        transition: transform 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1rem;
                        width: 44px;
                        height: 44px;
                        border-radius: 8px;
                        background: none;
                        border: none;
                        position: relative;
                        box-sizing: border-box;
                        padding: 0;
                    }
                    .nav-link:hover, .nav-link.active {
                        background: var(--bg-secondary);
                        transform: translateY(-2px);
                    }
                    .nav-icon {
                        width: 24px;
                        height: 24px;
                        margin: 0;
                        vertical-align: middle;
                        object-fit: cover;
                        border-radius: 2px;
                        box-shadow: 0 1px 2px var(--shadow-color);
                        background: transparent;
                    }
                    .nav-emoji {
                        font-size: 1.4rem;
                        margin-right: 0;
                        display: inline-block;
                        vertical-align: middle;
                    }
                    .nav-home-label {
                        font-size: 1rem;
                        font-weight: 600;
                        color: var(--text-primary);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 44px;
                        height: 44px;
                        border-radius: 8px;
                        letter-spacing: 0.03em;
                        text-align: center;
                        background: none;
                        margin: 0;
                    }
                    
                    @media (max-width: 768px) {
                        .nav-links {
                            flex-direction: row;
                            justify-content: center;
                            width: 100%;
                        }
                    }
                `;
                document.head.appendChild(style);
                // Style for nav-top-line and logo-bottom-line
                const extraStyle = document.createElement('style');
                extraStyle.id = 'nav-extra-lines';
                extraStyle.textContent = `
                    .nav-top-line, .logo-bottom-line {
                        width: 100%;
                        height: 1.5px;
                        background: var(--border-color, #ccc);
                        margin: 0 0 12px 0;
                        border: none;
                    }
                    .logo-bottom-line {
                        margin: 0 0 18px 0;
                    }
                `;
                document.head.appendChild(extraStyle);
                // Insert logo-bottom-line below .main-logo if present
                const mainLogo = document.querySelector('.main-logo');
                if(mainLogo && !document.querySelector('.logo-bottom-line')){
                    const logoLine = document.createElement('div');
                    logoLine.className = 'logo-bottom-line';
                    mainLogo.parentNode.insertBefore(logoLine, mainLogo.nextSibling);
                }
            }
        }
    }
    
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", injectNav) : injectNav();
}();