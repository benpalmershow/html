const fallbackData={lastUpdated:"2025-06-10T12:00:00Z",indices:[{category:"Inflation Measures",agency:"BLS",name:"Consumer Price Index (CPI-U)",url:"https://www.bls.gov/cpi/",march:"319.8",april:"320.8",may:"321.5",june:"",change:"+0.22"}]};function extractNumericValue(e){if(!e||""===e||"TBD"===e||e.includes("TBD")||"—"===e)return null;const t=e.toString().replace(/[$,%,\s,]/g,""),a=parseFloat(t);return isNaN(a)?null:a}function getLastTwoValues(e){const t=[{month:"march",value:e.march},{month:"april",value:e.april},{month:"may",value:e.may},{month:"june",value:e.june}].map((e=>({...e,numeric:extractNumericValue(e.value)}))).filter((e=>null!==e.numeric));if(t.length<2)return null;const a=t.slice(-2);return{previous:a[0],current:a[1]}}function calculatePercentageChange(e,t){const isPercent=v=>"string"==typeof v&&v.trim().endsWith("%");if(isPercent(e)&&isPercent(t)){const p=parseFloat(e),c=parseFloat(t);return isNaN(p)||isNaN(c)?null:c-p}const p=parseFloat(e),c=parseFloat(t);return isNaN(p)||isNaN(c)||0===p?null:c-p}/** Calculates the changes for each index in the given array, based on the last two months of data. */function autoCalculateChanges(e){return e.map((e=>{const t=getLastTwoValues(e);if((!e.change||""===e.change||"—"===e.change)&&t){const a=calculatePercentageChange(t.previous.numeric,t.current.numeric),n=a>=0?`+${a.toFixed(2)}`:`${a.toFixed(2)}`;return{...e,change:n}}return e}))}function formatDataValue(e){return e&&""!==e&&null!=e?("string"==typeof e&&(e.includes("TBD")||e.includes("*")),e):"—"}function formatChangeValue(e){if(!e||""===e||null==e)return"—";const t=parseFloat(e.replace(/[+%]/g,""));if(isNaN(t))return e;return t>0?`+${t.toFixed(2)}%`:`${t.toFixed(2)}%`}function createTableRow(e){const t=document.createElement("tr"),a=document.createElement("td");

  // Use only the URL provided in the JSON
  let url = e.url;
  if (!url || url === "") {
    url = `https://www.google.com/search?q=${encodeURIComponent(`${e.agency} official website`)}`;
  }

  // Create the link with proper attributes
  a.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-primary); text-decoration: underline;">${e.agency}: ${e.name}</a>`;
  t.appendChild(a);
  
  ["march", "april", "may", "june"].forEach((month => {
    const n = document.createElement("td");
    n.textContent = formatDataValue(e[month]);
    n.className = "number";
    t.appendChild(n);
  }));
  
  const n = document.createElement("td");
  if (n.textContent = formatChangeValue(e.change), n.className = "number", e.change && "—" !== e.change && "" !== e.change) {
    const t = parseFloat(e.change.replace(/[+%]/g, ""));
    isNaN(t) || (t > 0 ? n.style.color = "#059669" : t < 0 && (n.style.color = "#DC2626"));
  }
  
  t.appendChild(n);
  e.category && t.setAttribute("data-category", e.category.toLowerCase().replace(/\s+/g, "-"));
  return t}function addCategoryHeaders(e){const t=document.getElementById("indicesTableBody");if(!t)return;const a={};e.forEach((e=>{const t=e.category||"Other";a[t]||(a[t]=[]),a[t].push(e)})),t.innerHTML="",Object.keys(a).forEach((e=>{const n=document.createElement("tr");n.className="category-divider";const c=document.createElement("td");c.colSpan=6,c.innerHTML=`<strong>${e}</strong>`,c.className="category-header",n.appendChild(c),t.appendChild(n),a[e].forEach((e=>{const a=createTableRow(e);t.appendChild(a)}))}))}function populateIndicesTable(e){const t=document.getElementById("indicesTableBody");t&&(t.innerHTML="",e.forEach((e=>{const a=createTableRow(e);t.appendChild(a)})))}function loadTradingViewWidget(e){const t=document.getElementById("tradingview-widget");if(!t)return;t.innerHTML="";const a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";const n={colorTheme:"light",dateRange:"12M",showChart:!0,locale:"en",largeChartUrl:"",isTransparent:!1,showSymbolLogo:!0,showFloatingTooltip:!1,width:"100%",height:"400",tabs:e.tradingViewTabs||[]};a.innerHTML=JSON.stringify(n),t.appendChild(a)}function updateLastUpdatedTimestamp(e){const t=document.getElementById("last-updated-economic");if(t&&e.lastUpdated){const a=new Date(e.lastUpdated);t.textContent=`Last updated: ${a.toLocaleDateString()}`}}function showError(e){const t=document.getElementById("indicesTableBody");t&&(t.innerHTML=`<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #666;">${e}</td></tr>`)}function processFinancialsData(e){try{if(!e||!e.indices||!Array.isArray(e.indices))throw new Error("Invalid data structure");

  // Update lastUpdated timestamp to current time
  e.lastUpdated = new Date().toISOString();

  const t=autoCalculateChanges(e.indices);
  if(t.some((e=>e.category))){addCategoryHeaders(t)}else{populateIndicesTable(t)}
  loadTradingViewWidget(e)
  updateLastUpdatedTimestamp(e)
}catch(e){showError("Error processing economic data. Please check back later.")}}async function loadFinancialsData(){const e=["./json/financials-data.json","./financials-data.json","json/financials-data.json","/json/financials-data.json","../json/financials-data.json"];for(const t of e)try{const e=await fetch(t);if(!e.ok)continue;return await e.json()}catch(e){continue}throw new Error("Could not load financials data from any path")}async function loadFinancialData(){try{const e=await fetch("/json/financials-data.json"),t=await e.json(),a=t.indices.reduce(((e,t)=>(e[t.category]||(e[t.category]=[]),e[t.category].push(t),e)),{}),n=document.getElementById("financials-container");n.innerHTML="";for(const[e,t]of Object.entries(a)){const a=document.createElement("div");a.className="category-section";const c=document.createElement("h3");c.textContent=e,a.appendChild(c);const o=document.createElement("table");o.className="financials-table";const r=document.createElement("thead");r.innerHTML="\n                <tr>\n                    <th>Indicator</th>\n                    <th>March</th>\n                    <th>April</th>\n                    <th>May</th>\n                    <th>June</th>\n                    <th>Change</th>\n                </tr>\n            ",o.appendChild(r);const i=document.createElement("tbody");t.forEach((e=>{const t=document.createElement("tr");t.innerHTML=`\n                    <td><a href="${e.url}" target="_blank">${e.name}</a></td>\n                    <td>${e.march}</td>\n                    <td>${e.april}</td>\n                    <td>${e.may}</td>\n                    <td>${e.june}</td>\n                    <td>${e.change}</td>\n                `,i.appendChild(t)})),o.appendChild(i),a.appendChild(o),n.appendChild(a)}const c=document.createElement("p");c.className="last-updated",c.textContent=`Last Updated: ${new Date(t.lastUpdated).toLocaleDateString()}`,n.appendChild(c)}catch(e){document.getElementById("financials-container").innerHTML='<p class="error">Error loading financial data. Please try again later.</p>'}}document.addEventListener("DOMContentLoaded",(async()=>{try{processFinancialsData(await loadFinancialsData())}catch(e){try{processFinancialsData(fallbackData);const e=document.getElementById("indicesTableBody");if(e&&e.children.length>0){const t=document.createElement("tr");t.innerHTML='<td colspan="6" style="text-align: center; padding: 1rem; background-color: #FEF3C7; color: #92400E; font-size: 0.9em;">⚠️ Using cached data - some information may be outdated</td>',e.insertBefore(t,e.firstChild)}}catch(e){showError("Unable to load economic data. Please refresh the page or check back later.")}}})),"undefined"!=typeof window&&(window.financialsDebug={loadFinancialsData:loadFinancialsData,processFinancialsData:processFinancialsData,autoCalculateChanges:autoCalculateChanges,extractNumericValue:extractNumericValue}),document.addEventListener("DOMContentLoaded",loadFinancialData);

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/json/financials-data.json');
        if (!response.ok) {
            throw new Error('Failed to load financials data');
        }
        const data = await response.json();
        const tableBody = document.getElementById('indicesTableBody');
        const lastUpdated = document.getElementById('last-updated-economic');

        // Update last updated timestamp
        if (lastUpdated) {
            const date = new Date(data.lastUpdated);
            lastUpdated.textContent = `Last updated: ${date.toLocaleString()}`;
        }

        // Group indices by category
        const categories = {};
        data.indices.forEach(index => {
            if (!categories[index.category]) {
                categories[index.category] = [];
            }
            categories[index.category].push(index);
        });

        // Create table rows for each category
        Object.entries(categories).forEach(([category, indices]) => {
            // Add category header
            const categoryRow = document.createElement('tr');
            categoryRow.className = 'category-header';
            const categoryCell = document.createElement('td');
            categoryCell.colSpan = 6;
            categoryCell.textContent = category;
            categoryRow.appendChild(categoryCell);
            tableBody.appendChild(categoryRow);

            // Add indices for this category
            indices.forEach(index => {
                const row = document.createElement('tr');
                
                // Name cell with link
                const nameCell = document.createElement('td');
                const nameLink = document.createElement('a');
                nameLink.href = index.url;
                nameLink.target = '_blank';
                nameLink.textContent = index.name;
                nameCell.appendChild(nameLink);
                row.appendChild(nameCell);

                // Data cells
                [index.march, index.april, index.may, index.june].forEach(value => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                });

                // Change cell
                const changeCell = document.createElement('td');
                changeCell.textContent = index.change;
                if (index.change && index.change !== '—') {
                    const change = parseFloat(index.change);
                    if (change > 0) {
                        changeCell.style.color = 'var(--positive-color, #28a745)';
                    } else if (change < 0) {
                        changeCell.style.color = 'var(--negative-color, #dc3545)';
                    }
                }
                row.appendChild(changeCell);

                tableBody.appendChild(row);
            });
        });
    } catch (error) {
        console.error('Error loading financials data:', error);
        const tableBody = document.getElementById('indicesTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="error-state">Error loading data. Please try again later.</td></tr>';
        }
    }
});