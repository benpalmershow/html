(function(){let $=["oversight-committee-report","urban_crime_2020","chiles-v-salazar","barrett_v_us","reddit-q2-2025-earnings","navan-ipo","vaccine-policy","military-drones","healthcare-costs","okta-q2-2026","aaup-rubio","fiber-supplement","trump-v-casa","figma-ipo","ceqa-reforms","bullish-ipo","peloton-stock","local-bounti-q2-2025","scotus-oct-2025","airo-ipo","robinhood-q2-2025","boston-public-market","circle-ipo","big-beautiful-bill","corrections-hood-twlo","sustainable-abundance","oregon-kei-trucks-sb1213","doc-riter-trump-interview","scotus-nov-2025","trump-v-vos-selections","trump-v-vos-update","trump-v-vos-sauer"];function z(j){let J=j.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);if(!J)return{metadata:{},content:j};let[,O,M]=J,q={};return O.split(`
`).forEach((K)=>{let P=K.indexOf(":");if(P>-1){let Q=K.substring(0,P).trim(),G=K.substring(P+1).trim();if(G.startsWith('"')&&G.endsWith('"'))G=G.slice(1,-1);q[Q]=G}}),{metadata:q,content:M}}async function Y(j){try{let J=await fetch(`article/${j}.md`);if(!J.ok)throw Error("Article not found");let O=await J.text(),{metadata:M,content:q}=z(O),K=marked.parse(q);return{metadata:M,html:K}}catch(J){return console.error("Error loading article:",J),null}}function L(j){return`
    <div class="accordion-card" data-category="${j.category}">
    <div class="accordion-header">
    <div class="accordion-title-section">
    <button class="filter-badge ${j.category}" aria-label="${j.category} category">
    <i data-lucide="${N(j.category)}" class="filter-icon"></i>
    </button>
    <h2 class="accordion-title">
    ${j.title}
    </h2>
    </div>

    <div class="accordion-meta">
    <i data-lucide="chevron-down" class="expand-icon" aria-label="Expand article details"></i>
    </div>
    </div>

      <div class="accordion-content">
      <div class="accordion-expanded-header">
      <time class="accordion-expanded-date" datetime="${j.date}">${Z(j.date)}</time>
      </div>
        <div class="accordion-full-preview">
        <p>${j.summary}</p>
      </div>

      <div class="accordion-full-actions">
      <a href="?article=${j.id}" class="read-full-btn primary">
          <span>Read Full Article</span>
            <i data-lucide="arrow-right"></i>
          </a>
        </div>
      </div>
    </div>
    `}function N(j){return{ipo:"trending-up",earnings:"bar-chart-3",policy:"shield",healthcare:"heart",legal:"gavel",political:"vote",corrections:"edit-3"}[j]||"file-text"}async function T(j){let J=document.getElementById("news-feed-view"),O=document.getElementById("full-article-view"),M=document.getElementById("article-container");J.style.display="none",O.style.display="block",M.innerHTML='<div class="loading">Loading article...</div>';let q=await Y(j);if(!q){M.innerHTML='<div class="error-message">Article not found. <a href="news.html">Return to news feed</a></div>';return}let K=q.html;M.innerHTML=`
    ${K}
    `,M.querySelectorAll("script").forEach((W)=>{let X=document.createElement("script");if(W.src)X.src=W.src,X.async=!1,document.head.appendChild(X);else X.textContent=W.textContent,document.head.appendChild(X);W.remove()});let Q=document.querySelector(".back-button"),G=Q.nextElementSibling;if(G&&G.classList.contains("article-meta-header"))G.remove();G=document.createElement("div"),G.classList.add("article-meta-header"),G.style.display="flex",G.style.alignItems="center",G.style.gap="10px",G.style.fontSize="0.9em",G.style.color="#888",G.style.marginBottom="10px";let U=`<span>${Z(q.metadata.date)}</span>`;if(q.metadata.ticker)U+=`<span><strong>Ticker:</strong> <a href="https://www.perplexity.ai/finance/${q.metadata.ticker}" target="_blank">${q.metadata.ticker}</a></span>`;U+=`<span class="category-badge ${q.metadata.category}">${q.metadata.category}</span>`,G.innerHTML=U,Q.insertAdjacentElement("afterend",G),lucide.createIcons()}async function D(){let j=document.getElementById("news-feed-view"),J=document.getElementById("full-article-view"),O=document.getElementById("articles-container");j.style.display="block",J.style.display="none";let q=(await Promise.all($.map(async(K)=>{let P=await Y(K);if(!P)return null;return{id:K,...P.metadata}}))).filter((K)=>K!==null).sort((K,P)=>new Date(P.date)-new Date(K.date));if(q.length===0){O.innerHTML='<div class="error-message">No articles found. Please check that your markdown files are in the article/ folder.</div>';return}O.innerHTML=q.map(L).join(""),lucide.createIcons(),R()}function R(){let j=document.querySelector(".content");if(!j)return;let J=j._accordionHandler;if(J)j.removeEventListener("click",J);let O=function(M){let q=M.target.closest(".accordion-header");if(!q)return;if(M.target.closest(".filter-badge"))return;M.preventDefault(),M.stopPropagation();let K=q.closest(".accordion-card"),P=K.querySelector(".accordion-content"),Q=q.querySelector(".expand-icon");requestAnimationFrame(()=>{document.querySelectorAll(".accordion-card.expanded").forEach((U)=>{if(U!==K){let W=U.querySelector(".accordion-content"),X=U.querySelector(".expand-icon");U.classList.remove("expanded"),W.style.maxHeight="0",X.style.transform="rotate(0deg)"}});let G=K.classList.contains("expanded");if(K.classList.toggle("expanded"),G)P.style.maxHeight="0",Q.style.transform="rotate(0deg)";else setTimeout(()=>{P.style.maxHeight=P.scrollHeight+"px",Q.style.transform="rotate(180deg)"},10)})};j._accordionHandler=O,j.addEventListener("click",O)}function Z(j){let J=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],[O,M,q]=j.split("-");return`${J[parseInt(M)-1]} ${parseInt(q)}, ${O}`}function _(){let J=new URLSearchParams(window.location.search).get("article");if(J)T(J);else D()}function V(){let j=document.querySelector(".filters");if(!j)return;let J=j._filterHandler;if(J)j.removeEventListener("click",J);let O=function(M){let q=M.target.closest(".filter-btn");if(!q)return;M.preventDefault(),j.querySelectorAll(".filter-btn").forEach((P)=>{P.classList.remove("active")}),q.classList.add("active");let K=q.dataset.category;requestAnimationFrame(()=>{document.querySelectorAll(".accordion-card").forEach((Q)=>{let G=K==="all"||Q.dataset.category===K;if(Q.style.display=G?"":"none",!G&&Q.classList.contains("expanded")){let U=Q.querySelector(".accordion-content"),W=Q.querySelector(".expand-icon");Q.classList.remove("expanded"),U.style.maxHeight="0",W.style.transform="rotate(0deg)"}})})};j._filterHandler=O,j.addEventListener("click",O)}document.addEventListener("DOMContentLoaded",()=>{_(),V(),lucide.createIcons()}),window.addEventListener("popstate",_)})();

//# debugId=ED60557B6172A02964756E2164756E21
