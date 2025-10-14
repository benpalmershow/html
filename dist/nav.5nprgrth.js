(function(){let G=[{text:"Home",href:"../index.html",icon:"\uD83C\uDFE0",image:""},{text:"Announcements",href:"../read.html",icon:"",image:"../images/announcements.png"},{text:"Numbers",href:"../financials.html",icon:"\uD83D\uDCCA",image:""},{text:"News",href:"../news.html",icon:"\uD83D\uDCF0",image:""},{text:"Media",href:"../media.html",icon:"",image:"../images/read.png"},{text:"Journal",href:"../journal.html",icon:"✍️",image:""}];function J(){let q=document.createElement("nav");q.className="floating-nav";let z=window.location.pathname,C=z==="/"?"/index.html":z;return q.innerHTML=G.map((k)=>{let B=k.href===C?" active":"",w="";if(k.image)w=`<img src="${k.image}" alt="${k.text}" class="nav-icon">`;else if(k.icon)w=`<span class="nav-emoji">${k.icon}</span>`;return`
                <a href="${k.href}" class="nav-link${B}" title="${k.text}">
                    ${w}
                </a>
            `}).join(""),q}function D(){let q=document.querySelector(".nav-links");if(q){let w=q.parentNode;if(w){let F=w.querySelector(".nav-top-line");if(F)F.remove()}q.remove()}let z=document.querySelector("#nav-bar-styles");if(z)z.remove();let C=document.querySelector("#nav-extra-lines");if(C)C.remove();let k=J();if(document.body.prepend(k),document.querySelector("#floating-nav-styles"))return;let B=document.createElement("style");B.id="floating-nav-styles",B.textContent=`
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
        `,document.head.appendChild(B)}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",D);else D()})();

//# debugId=E0BD15C2CE378C7964756E2164756E21
