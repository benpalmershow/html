class Q{constructor(){this.portfolioData=null,this.currentSort={column:null,direction:"asc"},this.initialize()}async initialize(){try{if(await this.loadPortfolioData(),this.renderPortfolioTable(),this.renderPortfolioSections(),this.setupEventListeners(),this.updateLastUpdated(),window.lucide)lucide.createIcons()}catch(j){console.error("Error initializing portfolio:",j),this.showError("Failed to load portfolio data. Please try again later.")}}showError(j){let q=document.createElement("div");q.className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative",q.role="alert",q.innerHTML=`
            <strong class="font-bold">Error: </strong>
            <span class="block sm:inline">${j}</span>
        `;let z=document.querySelector("main");if(z)z.prepend(q)}async loadPortfolioData(){try{let j=await fetch("json/portfolio.json");if(!j.ok)throw Error(`HTTP error! status: ${j.status}`);this.portfolioData=await j.json()}catch(j){throw console.error("Error loading portfolio data:",j),j}}updateLastUpdated(){if(this.portfolioData?.lastUpdated){let j=document.getElementById("last-updated");if(j){let q=new Date(this.portfolioData.lastUpdated);j.textContent=`Portfolio data last updated: ${q.toLocaleString()}`}}}renderPortfolioTable(){if(!this.portfolioData?.portfolioComparison?.stocks?.length)return;let j=document.querySelector("#portfolio-comparison-table tbody");if(!j)return;j.innerHTML="",this.portfolioData.portfolioComparison.stocks.forEach((q)=>{let z=document.createElement("tr");z.classList.add(q.highlight?"bg-blue-50":"bg-slate-50");let A=q.description||{title:q.company,short:"",full:""},J=`https://finance.yahoo.com/quote/${q.ticker}`;z.innerHTML=`
            <td class="px-3 py-2 whitespace-nowrap text-slate-700 overflow-hidden text-ellipsis">
            <a href="${J}" target="_blank" class="hover:text-blue-600 hover:underline">
            ${q.company}
            </a>
            </td>
            <td class="px-3 py-2 whitespace-nowrap font-medium text-slate-900 overflow-hidden text-ellipsis">
            ${q.ticker}
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-right font-medium text-slate-900">
            ${q.currentPrice||"-"}
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-right font-medium text-slate-900">
            ${q.october||"-"}
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-right text-slate-500">
            ${q.september||"-"}
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-right text-slate-500">
            ${q.august||"-"}
            </td>
            <td class="px-3 py-2 text-slate-600 text-xs overflow-hidden w-[52%]">
            <div class="truncate w-full group relative">
            <span class="font-medium">${A.title}</span> - ${A.short}
            ${A.full?`
            <div class="hidden group-hover:block absolute z-10 w-96 p-3 mt-1 -ml-2 text-xs bg-white border border-slate-200 rounded shadow-lg">
                    <div class="font-semibold mb-1">${A.title}</div>
                        <div>${A.full}</div>
                        </div>
                        `:""}
                    </div>
                </td>
            `,j.appendChild(z)})}renderPortfolioSections(){if(!this.portfolioData?.portfolioSections?.length)return;let j=document.getElementById("portfolio-sections");if(!j)return;this.portfolioData.portfolioSections.forEach((q)=>{let z=this.createPortfolioSection(q);if(z)j.appendChild(z)})}createPortfolioSection(j){if(!j?.id||!j.title||!j.holdings?.length)return null;let q=document.createElement("div");q.className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6";let z=document.createElement("div");z.className="p-6 border-b border-slate-200",z.innerHTML=`
            <h2 class="flex items-center justify-between text-lg font-medium text-slate-800 cursor-pointer select-none hover:text-slate-600 transition-colors" 
                data-toggle="collapse" data-target="${j.id}-holdings-grid">
                <div class="flex items-center gap-3">
                    <i data-lucide="${j.icon||"briefcase"}" class="w-5 h-5 text-slate-500"></i>
                    <span>${j.title}</span>
                </div>
                <i data-lucide="chevron-down" class="w-5 h-5 text-slate-400 transition-transform duration-200"></i>
            </h2>
            ${j.subtitle?`<p class="text-sm text-slate-500 mt-1">${j.subtitle}</p>`:""}
        `;let A=document.createElement("div");A.id=`${j.id}-holdings-grid`,A.className="p-6",A.style.display="none";let J=document.createElement("div");return J.className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",j.holdings.forEach((N)=>{let O=this.createHoldingCard(N);if(O)J.appendChild(O)}),A.appendChild(J),q.appendChild(z),q.appendChild(A),q}createHoldingCard(j){if(!j.ticker)return null;let q=document.createElement("div");q.className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:shadow-sm hover:border-slate-300 transition-all duration-200";let z=`https://finance.yahoo.com/quote/${j.ticker}`,A=j.allocation?`
            <span class="bg-${j.highlight?"blue":"slate"}-600 text-white px-2 py-1 rounded text-xs font-medium">
                ${j.allocation}
            </span>
        `:"";return q.innerHTML=`
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <a href="${z}" target="_blank" class="text-base font-semibold text-slate-700 hover:text-blue-600 transition-colors no-underline">
                    ${j.ticker}
                </a>
                ${A}
            </div>
            ${j.company?`
                <div class="text-sm text-slate-600 mb-2">
                    <a href="${z}" target="_blank" class="hover:text-blue-600 hover:underline">
                        ${j.company}
                    </a>
                </div>
            `:""}
            ${j.description?`
                <div class="text-xs text-slate-500 mb-2 line-clamp-2">
                    ${j.description}
                </div>
            `:""}
            ${j.notes?`
                <div class="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div class="font-medium text-slate-600">Notes:</div>
                    <div>${j.notes}</div>
                </div>
            `:""}
        `,q}setupEventListeners(){document.querySelectorAll("#portfolio-comparison-table th[data-sort]").forEach((j)=>{let q=j.getAttribute("data-sort");if(q)j.style.cursor="pointer",j.addEventListener("click",()=>this.sortTable(q))}),document.body.addEventListener("click",(j)=>{let q=j.target.closest('[data-toggle="collapse"]');if(q){let z=q.getAttribute("data-target"),A=document.getElementById(z),J=q.querySelector("i[data-lucide]");if(A){let N=A.style.display==="none";if(A.style.display=N?"block":"none",J)J.style.transform=N?"rotate(180deg)":""}}})}parsePercentage(j){if(j==="-"||j===void 0)return-1/0;let q=parseFloat(j);return isNaN(q)?-1/0:q}parsePrice(j){if(j==="-"||j===void 0)return-1/0;let q=j.replace("$","").replace(",",""),z=parseFloat(q);return isNaN(z)?-1/0:z}updateSortIndicators(j,q){document.querySelectorAll("th[data-sort]").forEach((A)=>{let J=A.getAttribute("data-original-text")||A.textContent.trim();A.textContent=J,A.setAttribute("data-original-text",J)});let z=document.querySelector(`th[data-sort="${j}"]`);if(z){let A=z.getAttribute("data-original-text")||z.textContent.trim();z.setAttribute("data-original-text",A),z.innerHTML=`${A} <span class="ml-1">${q==="asc"?"↑":"↓"}</span>`}}sortTable(j){if(!this.portfolioData?.portfolioComparison?.stocks?.length)return;let q=this.currentSort.column===j&&this.currentSort.direction==="asc"?"desc":"asc";this.updateSortIndicators(j,q);let A={company:(J,N)=>J.company.localeCompare(N.company),ticker:(J,N)=>J.ticker.localeCompare(N.ticker),currentPrice:(J,N)=>this.parsePrice(J.currentPrice)-this.parsePrice(N.currentPrice),october:(J,N)=>this.parsePercentage(J.october)-this.parsePercentage(N.october),september:(J,N)=>this.parsePercentage(J.september)-this.parsePercentage(N.september),august:(J,N)=>this.parsePercentage(J.august)-this.parsePercentage(N.august)}[j];if(!A)return;this.portfolioData.portfolioComparison.stocks.sort((J,N)=>{return q==="asc"?A(J,N):-A(J,N)}),this.currentSort={column:j,direction:q},this.renderPortfolioTable()}}document.addEventListener("DOMContentLoaded",()=>{if(typeof lucide<"u")lucide.createIcons();window.portfolio=new Q;function j(q){let z=document.getElementById(q);if(z)z.style.display=z.style.display==="none"?"block":"none"}window.toggleGptPortfolio=()=>j("gpt-holdings-grid"),window.toggleSeptemberPortfolio=()=>j("september-holdings-grid"),window.toggleOctoberPortfolio=()=>j("october-holdings-grid")});

//# debugId=8CA3A463915207C464756E2164756E21
