!function(){const t=[
        {text:"Home",href:"index.html",icon:"",},
        {text:"📻listen",href:"listen.html",icon:"📻",image:"images/listen.png"},
        {text:"📚read",href:"read.html",icon:"📚",image:"images/read.png"},
        {text:"🎥watch",href:"watch.html",icon:"🎥",image:"images/watch.png"}
    ];
    
    function n(){
        const n=function(){
            const t=window.location.pathname;
            return t.substring(t.lastIndexOf("/")+1)||"index.html"
        }();
        
        return t.map((t=>{
            const isActive = t.href===n?" active":"";
            const iconHtml = t.image ? 
                `<img src="${t.image}" alt="${t.text}" class="nav-icon">` : 
                t.icon;
            
            return `<a class="nav-link${isActive}" href="${t.href}">
                ${iconHtml}${t.text.replace(/📻|📚|🎥/, '')}
            </a>`;
        })).join("")
    }
    
    function e(){
        const t=document.querySelector(".nav-links");
        if(t){
            t.innerHTML=n();
            
            // Add styles for nav icons
            if(!document.querySelector('#nav-icon-styles')){
                const style = document.createElement('style');
                style.id = 'nav-icon-styles';
                style.textContent = `
                    .nav-icon {
                        width: 16px;
                        height: 16px;
                        margin-right: 4px;
                        vertical-align: middle;
                        object-fit: cover;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }
    
    "loading"===document.readyState?document.addEventListener("DOMContentLoaded",e):e()
}();