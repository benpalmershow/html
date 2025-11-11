if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){U()});else U();function U(){document.querySelectorAll('.card-header[onclick*="toggleCard"]').forEach(X),document.querySelectorAll(".read-more-btn").forEach((A)=>{A.addEventListener("click",Z)}),$()}function X(q){let j=q.nextElementSibling;if(!j||!j.classList.contains("card-content"))return;let A=q.querySelector("time"),G=q.querySelector(".card-icon"),J=q.querySelector("h1"),E=q.querySelector(".category-badge"),L=j.querySelector(".card-inner"),V=Y(L),K=document.createElement("div");K.className="news-card",K.setAttribute("data-category",E?E.textContent.toLowerCase():"all");let O="";if(J){let Q=J.cloneNode(!0);Q.querySelectorAll(".category-badge").forEach((W)=>W.remove()),O=Q.innerHTML.trim()}K.innerHTML=`
        <div class="news-card-header">
            <i data-lucide="${G?G.getAttribute("data-lucide"):"file-text"}" class="news-card-icon"></i>
            <div class="news-card-meta">
                <div class="news-card-date">${A?A.textContent:""}</div>
                <h2 class="news-card-title">${O}</h2>
            </div>
            <div class="news-card-badge-corner">
                ${E?E.outerHTML:""}
            </div>
        </div>
        <div class="news-card-content">
            <div class="news-card-preview">${V}</div>
            <div class="news-card-actions">
                <button class="read-more-btn" data-card-id="${_()}">
                    <span class="btn-text">Read More</span>
                    <i data-lucide="chevron-down"></i>
                </button>
            </div>
            <div class="news-card-full">
                ${L?L.innerHTML:""}
            </div>
        </div>
    `;let N=q.parentNode;if(N.insertBefore(K,q),N.removeChild(q),N.removeChild(j),typeof lucide<"u")lucide.createIcons()}function Y(q){if(!q)return"Click to read more...";let j="",A=q.querySelector(".section, .highlights, p, div");if(A){let G=document.createElement("div");if(G.innerHTML=A.innerHTML,G.querySelectorAll("table, .table-container, .chart-container, blockquote, .case-questions").forEach((E)=>E.remove()),j=G.textContent||G.innerText||"",j=j.trim().replace(/\s+/g," "),j.length>200){j=j.substring(0,200).trim();let E=j.lastIndexOf(" ");if(E>150)j=j.substring(0,E);j+="..."}}return j||"Click to read the full article..."}function Z(q){let j=q.currentTarget,A=j.closest(".news-card"),G=A.querySelector(".news-card-full"),J=j.querySelector(".btn-text"),E=j.querySelector("i");if(G.classList.contains("show"))G.classList.remove("show"),J.textContent="Read More",j.classList.remove("expanded"),A.scrollIntoView({behavior:"smooth",block:"start"});else G.classList.add("show"),J.textContent="Read Less",j.classList.add("expanded"),setTimeout(()=>{if(typeof lucide<"u")lucide.createIcons()},100)}function _(){return"card_"+Math.random().toString(36).substr(2,9)}function $(){let q=document.querySelectorAll(".filter-btn");q.forEach((j)=>{j.addEventListener("click",function(){let A=this.dataset.category;q.forEach((J)=>J.classList.remove("active")),this.classList.add("active"),document.querySelectorAll(".news-card").forEach((J)=>{let E=J.dataset.category;if(A==="all"||E===A||E&&E.includes(A))J.style.display="block";else J.style.display="none"})})})}

//# debugId=1B0B492AB2F7FC9964756E2164756E21
