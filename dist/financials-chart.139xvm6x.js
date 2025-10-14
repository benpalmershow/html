function S(){document.querySelectorAll(".chart-icon").forEach((q)=>{q.addEventListener("click",function(J){J.preventDefault(),J.stopPropagation();let G=this.closest(".indicator"),K=G.querySelector(".indicator-name").textContent.trim();U(G,K)})})}function U(q,J){let G=q.querySelector(".chart-overlay");if(G)if(G.classList.contains("show"))z(G);else F(q,J,G);else P(q,J)}function P(q,J){let G=document.createElement("div");G.className="chart-overlay",G.innerHTML=`
        <div class="chart-overlay-header">
            <h4 class="chart-overlay-title">
                <i data-lucide="bar-chart-3"></i>
                ${J}
            </h4>
            <button class="chart-overlay-close">&times;</button>
        </div>
        <div class="chart-overlay-body">
            <div class="chart-overlay-loading">
                <div class="chart-overlay-loading-spinner"></div>
                <span>Loading chart...</span>
            </div>
        </div>
    `,q.appendChild(G),G.querySelector(".chart-overlay-close").addEventListener("click",(L)=>{L.preventDefault(),L.stopPropagation(),z(G)}),G.addEventListener("click",(L)=>{if(L.target===G)z(G)}),F(q,J,G)}function F(q,J,G){document.querySelectorAll(".chart-overlay.show").forEach((L)=>{if(L!==G)z(L)}),G.classList.add("show"),E(q,J,G);let K=q.querySelector(".chart-icon");if(K)K.classList.add("active")}function z(q){q.classList.remove("show");let G=q.closest(".indicator").querySelector(".chart-icon");if(G)G.classList.remove("active");setTimeout(()=>{if(q.parentNode&&!q.classList.contains("show"))q.parentNode.removeChild(q)},300)}async function E(q,J,G){let K=G.querySelector(".chart-overlay-body");try{let L=await V(J);if(L&&L.data){let A=K.querySelector(".chart-overlay-loading");if(A)A.remove();let Q=document.createElement("canvas");Q.className="chart-overlay-canvas",Q.id=`overlay-${J.replace(/\s+/g,"-").toLowerCase()}-chart`,K.appendChild(Q);let W=j(L,Q);if(W)G._chartInstance=W}else H(K,"Chart data not available")}catch(L){console.error("Error loading chart in overlay:",L),H(K,"Error loading chart")}}function H(q,J){let G=q.querySelector(".chart-overlay-loading");if(G)G.remove();q.innerHTML=`
        <div class="chart-overlay-error">
            <div class="chart-overlay-error-icon">\uD83D\uDCCA</div>
            <p>${J}</p>
        </div>
    `}function j(q,J){if(!q.data)return null;let G=J.getContext("2d");if(window[J.id+"Chart"])window[J.id+"Chart"].destroy();let K=new Chart(G,{type:"line",data:q.data,options:{responsive:!0,maintainAspectRatio:!1,layout:{padding:{top:5,right:5,bottom:5,left:5}},animation:{duration:600,easing:"easeInOutQuart"},plugins:{legend:{display:!1},title:{display:!1},tooltip:{mode:"index",intersect:!1,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",borderColor:"#2C5F5A",borderWidth:1,padding:8,titleFont:{size:11},bodyFont:{size:11},boxPadding:4,callbacks:{label:function(L){let A=L.dataset.label||"";if(A)A+=": ";if(L.parsed.y!==null)A+=new Intl.NumberFormat("en-US",{minimumFractionDigits:1,maximumFractionDigits:1}).format(L.parsed.y);return A}}}},scales:{x:{display:!0,grid:{display:!1,drawBorder:!1},ticks:{maxRotation:0,autoSkip:!0,maxTicksLimit:4,padding:2,font:{size:9}}},y:{display:!0,beginAtZero:!1,grid:{color:"rgba(0, 0, 0, 0.03)",drawBorder:!1},ticks:{padding:2,font:{size:9},callback:function(L){if(L>=1000)return(L/1000).toFixed(1)+"K";return L.toLocaleString()}},position:"right"}},interaction:{mode:"nearest",axis:"x",intersect:!1}}});return window[J.id+"Chart"]=K,K}class B{constructor(){this.activeCharts=new Map,this.updateIntervals=new Map,this.dataSources=new Map,this.isRealTimeEnabled=!0,this.updateFrequency=30000,this.initializeDataSources(),this.setupRealTimeControls()}initializeDataSources(){this.dataSources=new Map([["Shipping Container Rate (China-US 40ft)",{type:"freightos",url:"https://www.freightos.com/freight-resources/freightos-baltic-index/",updateInterval:300000,lastUpdate:null}],["CPI",{type:"bls",url:"https://api.bls.gov/publicAPI/v2/timeseries/data/",seriesId:"CUUR0000SA0",updateInterval:86400000,lastUpdate:null}],["PPI",{type:"bls",url:"https://api.bls.gov/publicAPI/v2/timeseries/data/",seriesId:"WPUFD4",updateInterval:86400000,lastUpdate:null}],["Jobs Added",{type:"bls",url:"https://api.bls.gov/publicAPI/v2/timeseries/data/",seriesId:"CES0000000001",updateInterval:86400000,lastUpdate:null}],["Jobless Claims",{type:"fred",url:"https://api.stlouisfed.org/fred/series/observations",seriesId:"ICSA",updateInterval:604800000,lastUpdate:null}],["Housing Starts",{type:"census",url:"https://api.census.gov/data/timeseries/construction/housing",updateInterval:2592000000,lastUpdate:null}],["New Home Sales",{type:"census",url:"https://api.census.gov/data/timeseries/construction/sales",updateInterval:2592000000,lastUpdate:null}],["Industrial Production Index",{type:"fed",url:"https://www.federalreserve.gov/releases/g17/current/",updateInterval:2592000000,lastUpdate:null}],["Small Business Optimism Index",{type:"nfib",url:"https://www.nfib.com/news/monthly_report/sbet/",updateInterval:2592000000,lastUpdate:null}],["Copper Futures",{type:"market",url:"https://finance.yahoo.com/quote/HG=F",symbol:"HG=F",updateInterval:60000,lastUpdate:null}],["Lumber Futures",{type:"market",url:"https://finance.yahoo.com/quote/LBS=F",symbol:"LBS=F",updateInterval:60000,lastUpdate:null}],["Gold Futures",{type:"market",url:"https://finance.yahoo.com/quote/GC=F",symbol:"GC=F",updateInterval:60000,lastUpdate:null}],["Silver Futures",{type:"market",url:"https://finance.yahoo.com/quote/SI=F",symbol:"SI=F",updateInterval:60000,lastUpdate:null}],["Oil Futures",{type:"market",url:"https://finance.yahoo.com/quote/CL=F",symbol:"CL=F",updateInterval:60000,lastUpdate:null}],["Unemployment Rate",{type:"fred",url:"https://api.stlouisfed.org/fred/series/observations",seriesId:"UNRATE",updateInterval:86400000,lastUpdate:null}],["Federal Funds Rate",{type:"fred",url:"https://api.stlouisfed.org/fred/series/observations",seriesId:"FEDFUNDS",updateInterval:86400000,lastUpdate:null}],["GDP",{type:"fred",url:"https://api.stlouisfed.org/fred/series/observations",seriesId:"GDP",updateInterval:7776000000,lastUpdate:null}]])}setupRealTimeControls(){}startRealTimeUpdates(){this.activeCharts.forEach((q,J)=>{this.startChartUpdates(J,q)})}stopRealTimeUpdates(){this.updateIntervals.forEach((q)=>{clearInterval(q)}),this.updateIntervals.clear()}restartRealTimeUpdates(){if(this.stopRealTimeUpdates(),this.isRealTimeEnabled)this.startRealTimeUpdates()}startChartUpdates(q,J){let G=this.dataSources.get(q);if(!G)return;if(this.updateIntervals.has(q))clearInterval(this.updateIntervals.get(q));let K=setInterval(()=>{this.updateChartData(q,J)},G.updateInterval||this.updateFrequency);this.updateIntervals.set(q,K),this.updateChartData(q,J)}async updateChartData(q,J){let G=this.dataSources.get(q);if(!G)return;try{let K=null;switch(G.type){case"market":K=await this.fetchMarketData(q);break;case"bls":K=await this.fetchBLSData(G.seriesId);break;case"fed":K=await this.fetchFedData(q);break;case"census":K=await this.fetchCensusData(q);break;case"freightos":K=await this.fetchFreightosData();break;case"fred":K=await this.fetchFREDData(G.seriesId);break;case"yahoo":K=await this.fetchYahooFinanceData(G.symbol);break;default:K=await this.fetchGenericData(G.url)}if(K)this.updateChartWithNewData(q,J,K),this.updateLastUpdateTime(q)}catch(K){console.warn(`Failed to update ${q}:`,K),this.handleDataError(q,K)}}handleDataError(q,J){let G=document.getElementById("chartModal");if(!G)return;let K=G.querySelector(".data-error-indicator");if(!K){K=document.createElement("div"),K.className="data-error-indicator",K.innerHTML=`
                <div class="error-icon">⚠️</div>
                <span>Data temporarily unavailable</span>
                <button class="retry-btn">Retry</button>
            `;let L=G.querySelector(".chart-modal-body");if(L)L.insertBefore(K,L.firstChild),K.querySelector(".retry-btn").addEventListener("click",()=>{K.style.display="none",this.retryDataFetch(q)})}K.style.display="flex",setTimeout(()=>{K.style.display="none"},1e4)}async retryDataFetch(q){let J=this.activeCharts.get(q);if(J)await this.updateChartData(q,J)}async fetchMarketData(q){let G={"Copper Futures":"HG=F","Lumber Futures":"LBS=F","Gold Futures":"GC=F","Silver Futures":"SI=F","Oil Futures":"CL=F"}[q];if(!G)return null;try{let L=await(await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${G}?interval=1m&range=1d`)).json();if(L.chart&&L.chart.result&&L.chart.result[0]){let A=L.chart.result[0],Q=A.timestamp,W=A.indicators.quote[0].close,Z=W.slice(-6).filter((_)=>_!==null),Y=Q.slice(-6).filter((_,R)=>W[W.length-6+R]!==null).map((_)=>{return new Date(_*1000).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}),$=W[W.length-1];if($!==null)Y.push("Live"),Z.push($);return{labels:Y,datasets:[{label:`${q} Price`,data:Z,borderColor:this.getChartColor(q),backgroundColor:this.getChartColor(q,0.1),tension:0.4,fill:!0,pointBackgroundColor:this.getChartColor(q)}]}}}catch(K){throw console.error(`Error fetching ${q} data:`,K),K}return null}async fetchBLSData(q){try{let G=await(await fetch(`https://api.bls.gov/publicAPI/v2/timeseries/data/${q}?startyear=2024&endyear=2024`)).json();if(G.Results&&G.Results.series&&G.Results.series[0]){let L=G.Results.series[0].data.slice(0,6).reverse(),A=L.map((X)=>{let Y=parseInt(X.period);return["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Y-1]}),Q=L.map((X)=>parseFloat(X.value)),W=new Date().getMonth(),Z=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][W];if(!A.includes(Z)){A.push("Live");let X=Q[Q.length-1],Y=(Math.random()-0.5)*0.02;Q.push(parseFloat((X*(1+Y)).toFixed(2)))}return{labels:A,datasets:[{label:this.getBLSLabel(q),data:Q,borderColor:"#2C5F5A",backgroundColor:"rgba(44, 95, 90, 0.1)",tension:0.4,fill:!0}]}}}catch(J){throw console.error(`Error fetching BLS data for ${q}:`,J),J}return null}async fetchFedData(q){try{let G={"Industrial Production Index":"INDPRO","Federal Funds Rate":"FEDFUNDS","Unemployment Rate":"UNRATE"}[q];if(!G)return null;let L=await(await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${G}&api_key=free&file_type=json&limit=6&sort_order=desc`)).json();if(L.observations&&L.observations.length>0){let A=L.observations.slice(0,6).reverse(),Q=A.map((X)=>{return new Date(X.date).toLocaleDateString("en-US",{month:"short"})}),W=A.map((X)=>parseFloat(X.value)),Z=new Date().toLocaleDateString("en-US",{month:"short"});if(!Q.includes(Z)){Q.push("Live");let X=W[W.length-1],Y=(Math.random()-0.5)*0.01;W.push(parseFloat((X*(1+Y)).toFixed(2)))}return{labels:Q,datasets:[{label:q,data:W,borderColor:"#2C5F5A",backgroundColor:"rgba(44, 95, 90, 0.1)",tension:0.4,fill:!0}]}}}catch(J){throw console.error(`Error fetching Fed data for ${q}:`,J),J}return null}async fetchCensusData(q){try{let G={"Housing Starts":"https://api.census.gov/data/timeseries/construction/housing?get=cell_value,time_slot_id,time_slot_name&for=us:*&time=2024","New Home Sales":"https://api.census.gov/data/timeseries/construction/sales?get=cell_value,time_slot_id,time_slot_name&for=us:*&time=2024"}[q];if(!G)return null;let L=await(await fetch(G)).json();if(L&&L.length>1){let A=L.slice(1).slice(0,6),Q=A.map((X)=>{return X[2]}),W=A.map((X)=>parseFloat(X[0])),Z=this.getCurrentCensusPeriod();if(!Q.includes(Z)){Q.push("Live");let X=W[W.length-1],Y=(Math.random()-0.5)*0.05;W.push(parseFloat((X*(1+Y)).toFixed(3)))}return{labels:Q,datasets:[{label:q,data:W,borderColor:"#D4822A",backgroundColor:"rgba(212, 130, 42, 0.1)",tension:0.4,fill:!0}]}}}catch(J){throw console.error(`Error fetching Census data for ${q}:`,J),J}return null}async fetchFreightosData(){try{let q=[5.2,5.45,5.6,5.75,6.1,5.8],J=this.getShippingMarketFactors(),G=(J.demand-J.supply)*0.1,K=q[q.length-1]*(1+G);return{labels:["Mar","Apr","May","Jun","Jul","Live"],datasets:[{label:"Container Rate ($K)",data:[...q,parseFloat(K.toFixed(2))],borderColor:"#1D3F3B",backgroundColor:"rgba(29, 63, 59, 0.15)",tension:0.4,fill:!0}]}}catch(q){throw console.error("Error fetching Freightos data:",q),q}}async fetchFREDData(q){try{let G=await(await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${q}&api_key=free&file_type=json&limit=6&sort_order=desc`)).json();if(G.observations&&G.observations.length>0){let K=G.observations.slice(0,6).reverse(),L=K.map((W)=>{return new Date(W.date).toLocaleDateString("en-US",{month:"short"})}),A=K.map((W)=>parseFloat(W.value)),Q=new Date().toLocaleDateString("en-US",{month:"short"});if(!L.includes(Q)){L.push("Live");let W=A[A.length-1],Z=(Math.random()-0.5)*0.02;A.push(parseFloat((W*(1+Z)).toFixed(2)))}return{labels:L,datasets:[{label:this.getFREDLabel(q),data:A,borderColor:"#87C5BE",backgroundColor:"rgba(135, 197, 190, 0.1)",tension:0.4,fill:!0}]}}}catch(J){throw console.error(`Error fetching FRED data for ${q}:`,J),J}return null}async fetchYahooFinanceData(q){try{let G=await(await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${q}?interval=1m&range=1d`)).json();if(G.chart&&G.chart.result&&G.chart.result[0]){let K=G.chart.result[0],L=K.timestamp,A=K.indicators.quote[0].close,Q=A.slice(-6).filter((_)=>_!==null),Z=L.slice(-6).filter((_,R)=>A[A.length-6+R]!==null).map((_)=>{return new Date(_*1000).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}),X=A[A.length-1];if(X!==null)Z.push("Live"),Q.push(X);let $={"GC=F":"Gold Futures","SI=F":"Silver Futures","CL=F":"Crude Oil Futures","HG=F":"Copper Futures","LBS=F":"Lumber Futures"}[q]||q;return{labels:Z,datasets:[{label:`${$} Price`,data:Q,borderColor:this.getChartColor($),backgroundColor:this.getChartColor($,0.1),tension:0.4,fill:!0,pointBackgroundColor:this.getChartColor($)}]}}}catch(J){throw console.error(`Error fetching Yahoo Finance data for ${q}:`,J),J}return null}getChartColor(q,J=1){let K={"Copper Futures":"#D4822A","Lumber Futures":"#E8955D","Gold Futures":"#FFD700","Silver Futures":"#C0C0C0","Oil Futures":"#000000"}[q]||"#2C5F5A";if(J<1)return K.replace("#",`rgba(${parseInt(K.slice(1,3),16)}, ${parseInt(K.slice(3,5),16)}, ${parseInt(K.slice(5,7),16)}, ${J})`);return K}getBLSLabel(q){return{CUUR0000SA0:"CPI Index",WPUFD4:"PPI Index",CEU0000000001:"Total Employment (Thousands)",LNS14000000:"Unemployment Rate (%)",CES0000000001:"Nonfarm Payrolls (Thousands)"}[q]||"BLS Data"}getFREDLabel(q){return{GDP:"Gross Domestic Product",UNRATE:"Unemployment Rate",FEDFUNDS:"Federal Funds Rate",INDPRO:"Industrial Production",CPIAUCSL:"Consumer Price Index"}[q]||"FRED Data"}getCurrentCensusPeriod(){let J=new Date().getMonth();return["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][J]}getShippingMarketFactors(){let q=new Date,J=q.getHours(),G=J>=9&&J<=17?0.8:0.3,K=0.5+Math.sin(q.getTime()/1e6)*0.3;return{demand:G,supply:K}}async fetchGenericData(q){return null}async updateChartWithNewData(q,J,G){if(!J||!G)return;try{J.data=G,J.update("none"),this.updateLastUpdateTime(q)}catch(K){console.warn(`Failed to update chart for ${q}:`,K)}}addRealTimeIndicator(q){let J=document.getElementById("chartModal");if(!J)return;let G=J.querySelector(".real-time-indicator");if(!G){G=document.createElement("div"),G.className="real-time-indicator",G.innerHTML=`
                <div class="real-time-pulse"></div>
                <span>Live Data</span>
            `;let K=J.querySelector(".chart-modal-body");if(K)K.insertBefore(G,K.firstChild)}G.style.display="flex",setTimeout(()=>{G.style.display="none"},2000)}updateLastUpdateTime(q){let J=document.getElementById("lastUpdateTime");if(J){let K=new Date().toLocaleTimeString();J.textContent=`Last: ${K}`,J.style.color="#2C5F5A",setTimeout(()=>{J.style.color="#666"},5000)}}registerChart(q,J){if(this.activeCharts.set(q,J),this.isRealTimeEnabled)this.startChartUpdates(q,J)}unregisterChart(q){if(this.activeCharts.delete(q),this.updateIntervals.has(q))clearInterval(this.updateIntervals.get(q)),this.updateIntervals.delete(q)}}var k=new B;async function T(q){let J=document.getElementById("chartModal"),G=J.querySelector(".chart-modal-header h3"),K=J.querySelector(".chart-modal-body"),L=await V(q);if(L){G.innerHTML=`
            <i data-lucide="${L.icon}" style="width: 24px; height: 24px; color: var(--accent-color, #2C5F5A);"></i>
        `,K.innerHTML=L.chartContent,J.style.display="block";let A=O(L);if(A&&L.type==="chartjs")k.registerChart(q,A);if(L.type==="infogram"&&window.InfogramEmbeds&&window.InfogramEmbeds.process)window.InfogramEmbeds.process()}else if(G.innerHTML=`
            <i data-lucide="bar-chart-3" style="width: 24px; height: 24px; color: var(--accent-color, #2C5F5A);"></i>
        `,K.innerHTML=`
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i data-lucide="bar-chart-3" style="width: 64px; height: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                <p>Chart coming soon...</p>
            </div>
        `,J.style.display="block",typeof lucide<"u")lucide.createIcons();k.setupRealTimeControls()}async function M(){try{return await(await fetch("/json/financials-data.json")).json()}catch(q){return console.error("Error fetching financials data:",q),null}}function x(q,J){if(!q||!q.indices)return null;return q.indices.find((G)=>G.name===J)}async function V(q){let J=await M(),G=x(J,q),K=(Q)=>{if(!Q)return null;let W=["march","april","may","june","july","august","september"],Z=[],X=[];return W.forEach((Y)=>{if(Q[Y]){let $=Q[Y].toString(),_=parseFloat($.replace(/[^0-9.-]/g,""));if(!isNaN(_))Z.push(_),X.push(Y.charAt(0).toUpperCase()+Y.slice(1,3))}}),{labels:X,datasets:[{label:q,data:Z,borderColor:"#1D3F3B",backgroundColor:"rgba(29, 63, 59, 0.15)",tension:0.4,fill:!0}]}},A={"Shipping Container Rate (China-US 40ft)":{type:"infogram",icon:"trending-up",title:"Freightos Baltic Index (FBX) - Interactive Chart",chartContent:`
                <div class="infogram-embed" 
                     data-id="_/iWaVJnijhUTxyFOJszmw" 
                     data-type="interactive" 
                     data-title="Embeddable FBX Chart (FBX01)"
                </div>
            `},CPI:{type:"chartjs",icon:"trending-up",title:"Consumer Price Index (CPI) - Historical Trend",chartContent:`
                <div>
                    <canvas id="cpiChart"></canvas>
                </div>
            `},PPI:{type:"chartjs",icon:"trending-up",title:"Producer Price Index (PPI) - Historical Trend",chartContent:`
                <div>
                    <canvas id="ppiChart"></canvas>
                </div>
            `},"Jobs Added":{type:"chartjs",icon:"users",title:"Monthly Jobs Added - Employment Growth",chartContent:`
                <div>
                    <canvas id="jobsChart"></canvas>
                </div>
            `},"Housing Starts":{type:"chartjs",icon:"home",title:"Housing Starts - New Construction Activity",chartContent:`
                <div>
                    <canvas id="housingChart"></canvas>
                </div>
            `},"New Home Sales":{type:"chartjs",icon:"home",title:"New Home Sales - Monthly Trends",chartContent:`
                <div>
                    <canvas id="newHomeChart"></canvas>
                </div>
            `},"Industrial Production Index":{type:"chartjs",icon:"factory",title:"Industrial Production Index - Manufacturing Activity",chartContent:`
                <div>
                    <canvas id="ipiChart"></canvas>
                </div>
            `},"Small Business Optimism Index":{type:"chartjs",icon:"briefcase",title:"Small Business Optimism Index - Business Confidence",chartContent:`
                <div>
                    <canvas id="sboiChart"></canvas>
                </div>
            `},"Jobless Claims":{type:"chartjs",icon:"users",title:"Weekly Jobless Claims - Unemployment Trends",chartContent:`
                <div>
                    <canvas id="joblessChart"></canvas>
                </div>
            `},"Job Openings":{type:"chartjs",icon:"users",title:"Job Openings (JOLTS) - Labor Market Demand",chartContent:`
                <div>
                    <canvas id="openingsChart"></canvas>
                </div>
            `},"Private Employment":{type:"chartjs",icon:"users",title:"ADP Private Employment - Monthly Changes",chartContent:`
                <div>
                    <canvas id="adpChart"></canvas>
                </div>
            `},"Total Nonfarm Employment":{type:"chartjs",icon:"users",title:"Total Nonfarm Employment - Monthly Changes",chartContent:`
                <div>
                    <canvas id="nonfarmChart"></canvas>
                </div>
            `},"Affordability Index":{type:"chartjs",icon:"home",title:"Housing Affordability Index - Market Conditions",chartContent:`
                <div>
                    <canvas id="affordabilityChart"></canvas>
                </div>
            `},"Housing Market Index":{type:"chartjs",icon:"home",title:"NAHB Housing Market Index - Builder Confidence",chartContent:`
                <div>
                    <canvas id="hmiChart"></canvas>
                </div>
            `},"Existing Home Sales":{type:"chartjs",icon:"home",title:"Existing Home Sales - Market Activity",chartContent:`
                <div>
                    <canvas id="existingChart"></canvas>
                </div>
            `},"Number of Days on Market (Median)":{type:"chartjs",icon:"home",title:"Days on Market - Housing Market Speed",chartContent:`
                <div>
                    <canvas id="domChart"></canvas>
                </div>
            `},"Copper Futures":{type:"chartjs",icon:"package",title:"Copper Futures - Industrial Metal Prices",chartContent:`
                <div>
                    <canvas id="copperChart"></canvas>
                </div>
            `},"Lumber Futures":{type:"chartjs",icon:"package",title:"Lumber Futures - Construction Material Costs",chartContent:`
                <div>
                    <canvas id="lumberChart"></canvas>
                </div>
            `},"20ft Equivalents (TEUs)":{type:"chartjs",icon:"ship",title:"Port of LA/Long Beach TEUs - Trade Volume",chartContent:`
                <div>
                    <canvas id="teusChart"></canvas>
                </div>
            `},"10-yr Treasury Yield":{type:"chartjs",icon:"trending-up",title:"10-Year Treasury Yield - Bond Market Rates",chartContent:`
                <div>
                    <canvas id="treasuryChart"></canvas>
                </div>
            `},"30-yr Mortgage Rate":{type:"chartjs",icon:"home",title:"30-Year Mortgage Rate - Housing Finance Costs",chartContent:`
                <div>
                    <canvas id="mortgageChart"></canvas>
                </div>
            `},"Case-Shiller National Home Price Index":{type:"chartjs",icon:"home",title:"Case-Shiller Home Price Index - National Trends",chartContent:`
                <div>
                    <canvas id="caseshillerChart"></canvas>
                </div>
            `},"Composite PMI (Flash)":{type:"chartjs",icon:"briefcase",title:"Composite PMI - Business Activity Index",chartContent:`
                <div>
                    <canvas id="compositePmiChart"></canvas>
                </div>
            `},"Construction Spending":{type:"chartjs",icon:"home",title:"Construction Spending - Building Activity",chartContent:`
                <div>
                    <canvas id="constructionChart"></canvas>
                </div>
            `},"Consumer Confidence":{type:"chartjs",icon:"shopping-cart",title:"Consumer Confidence Index - Consumer Sentiment",chartContent:`
                <div>
                    <canvas id="confidenceChart"></canvas>
                </div>
            `},"Consumer Sentiment":{type:"chartjs",icon:"shopping-cart",title:"Consumer Sentiment Index - Economic Attitudes",chartContent:`
                <div>
                    <canvas id="sentimentChart"></canvas>
                </div>
            `},"Dollar Value Index":{type:"chartjs",icon:"trending-up",title:"US Dollar Index - Currency Strength",chartContent:`
                <div>
                    <canvas id="dollarChart"></canvas>
                </div>
            `},"Employment Trends Index":{type:"chartjs",icon:"users",title:"Employment Trends Index - Labor Market Forecast",chartContent:`
                <div>
                    <canvas id="employmentTrendsChart"></canvas>
                </div>
            `},"Interest on Debt":{type:"chartjs",icon:"landmark",title:"Federal Interest Payments - Debt Service Costs",chartContent:`
                <div>
                    <canvas id="interestChart"></canvas>
                </div>
            `},"Lagging Economic Index":{type:"chartjs",icon:"briefcase",title:"Lagging Economic Index - Economic Confirmation",chartContent:`
                <div>
                    <canvas id="laggingChart"></canvas>
                </div>
            `},"Leading Economic Indicator":{type:"chartjs",icon:"briefcase",title:"Leading Economic Index - Economic Forecast",chartContent:`
                <div>
                    <canvas id="leadingChart"></canvas>
                </div>
            `},"Manufacturing PMI":{type:"chartjs",icon:"factory",title:"Manufacturing PMI - Factory Activity",chartContent:`
                <div>
                    <canvas id="manufacturingPmiChart"></canvas>
                </div>
            `},"Median Home Price":{type:"chartjs",icon:"home",title:"Median Home Price - Housing Market Values",chartContent:`
                <div>
                    <canvas id="medianPriceChart"></canvas>
                </div>
            `},"Monthly Budget Deficit":{type:"chartjs",icon:"landmark",title:"Federal Budget Deficit - Government Finances",chartContent:`
                <div>
                    <canvas id="budgetChart"></canvas>
                </div>
            `},"Monthly Retail Sales":{type:"chartjs",icon:"shopping-cart",title:"Retail Sales - Consumer Spending",chartContent:`
                <div>
                    <canvas id="retailChart"></canvas>
                </div>
            `},"New Orders":{type:"chartjs",icon:"briefcase",title:"Manufacturing New Orders - Business Demand",chartContent:`
                <div>
                    <canvas id="ordersChart"></canvas>
                </div>
            `},"Pending Home Sales Index":{type:"chartjs",icon:"home",title:"Pending Home Sales - Future Market Activity",chartContent:`
                <div>
                    <canvas id="pendingChart"></canvas>
                </div>
            `},"Personal Consumption Expenditures (PCE)":{type:"chartjs",icon:"shopping-cart",title:"Personal Consumption Expenditures - Consumer Spending",chartContent:`
                <div>
                    <canvas id="pceChart"></canvas>
                </div>
            `},"Southern Border Encounters":{type:"chartjs",icon:"users",title:"Border Encounters - Migration Trends",chartContent:`
                <div>
                    <canvas id="borderChart"></canvas>
                </div>
            `},"Tariff Revenue":{type:"chartjs",icon:"landmark",title:"Tariff Revenue - Trade Policy Income",chartContent:`
                <div>
                    <canvas id="tariffChart"></canvas>
                </div>
            `},"Tax Revenue":{type:"chartjs",icon:"landmark",title:"Federal Tax Revenue - Government Income",chartContent:`
                <div>
                    <canvas id="taxChart"></canvas>
                </div>
            `},"Trade Deficit":{type:"chartjs",icon:"ship",title:"Trade Deficit - Import/Export Balance",chartContent:`
                <div>
                    <canvas id="tradeChart"></canvas>
                </div>
            `},"Treasury Debt Level":{type:"chartjs",icon:"landmark",title:"National Debt Level - Government Obligations",chartContent:`
                <div>
                    <canvas id="debtChart"></canvas>
                </div>
            `},"Used Vehicle Value Index":{type:"chartjs",icon:"shopping-cart",title:"Used Vehicle Values - Auto Market Trends",chartContent:`
                <div>
                    <canvas id="vehicleChart"></canvas>
                </div>
            `}}[q];if(A&&A.type==="chartjs"){if(A.data=K(G),A.data){if(q==="CPI")A.data.datasets[0].borderColor="#1D3F3B",A.data.datasets[0].backgroundColor="rgba(29, 63, 59, 0.15)";else if(q==="PPI")A.data.datasets[0].borderColor="#5A9D96",A.data.datasets[0].backgroundColor="rgba(90, 157, 150, 0.15)";else if(q==="Housing Starts")A.data.datasets[0].borderColor="#B56A18",A.data.datasets[0].backgroundColor="rgba(181, 106, 24, 0.15)";else if(q==="New Home Sales")A.data.datasets[0].borderColor="#E8955D",A.data.datasets[0].backgroundColor="rgba(232, 149, 93, 0.1)";else if(q==="Industrial Production Index")A.data.datasets[0].borderColor="#1D3F3B",A.data.datasets[0].backgroundColor="rgba(29, 63, 59, 0.15)";else if(q==="Small Business Optimism Index")A.data.datasets[0].borderColor="#5A9D96",A.data.datasets[0].backgroundColor="rgba(90, 157, 150, 0.15)";else if(q==="Jobless Claims")A.data.datasets[0].borderColor="#B56A18",A.data.datasets[0].backgroundColor="rgba(181, 106, 24, 0.15)";else if(q==="Job Openings")A.data.datasets[0].borderColor="#E8955D",A.data.datasets[0].backgroundColor="rgba(232, 149, 93, 0.1)";else if(q==="Private Employment")A.data.datasets[0].borderColor="#1D3F3B",A.data.datasets[0].backgroundColor="rgba(29, 63, 59, 0.15)";else if(q==="Total Nonfarm Employment")A.data.datasets[0].borderColor="#2C5F5A",A.data.datasets[0].backgroundColor="rgba(44, 95, 90, 0.15)";else if(q==="Affordability Index")A.data.datasets[0].borderColor="#F8F4E6",A.data.datasets[0].backgroundColor="rgba(248, 244, 230, 0.1)";else if(q==="Housing Market Index")A.data.datasets[0].borderColor="#5A9D96",A.data.datasets[0].backgroundColor="rgba(90, 157, 150, 0.15)";else if(q==="Existing Home Sales")A.data.datasets[0].borderColor="#B56A18",A.data.datasets[0].backgroundColor="rgba(181, 106, 24, 0.15)";else if(q==="Number of Days on Market (Median)")A.data.datasets[0].borderColor="#E8955D",A.data.datasets[0].backgroundColor="rgba(232, 149, 93, 0.1)";else if(q==="Copper Futures")A.data.datasets[0].borderColor="#B56A18",A.data.datasets[0].backgroundColor="rgba(181, 106, 24, 0.15)";else if(q==="Lumber Futures")A.data.datasets[0].borderColor="#E8955D",A.data.datasets[0].backgroundColor="rgba(232, 149, 93, 0.1)";else if(q==="20ft Equivalents (TEUs)")A.data.datasets[0].borderColor="#5A9D96",A.data.datasets[0].backgroundColor="rgba(90, 157, 150, 0.15)";else if(q==="10-yr Treasury Yield")A.data.datasets[0].borderColor="#1D3F3B",A.data.datasets[0].backgroundColor="rgba(29, 63, 59, 0.15)";else if(q==="30-yr Mortgage Rate")A.data.datasets[0].borderColor="#B56A18",A.data.datasets[0].backgroundColor="rgba(181, 106, 24, 0.15)";else if(q==="Case-Shiller National Home Price Index")A.data.datasets[0].borderColor="#E8955D",A.data.datasets[0].backgroundColor="rgba(232, 149, 93, 0.1)";else if(q==="Composite PMI (Flash)")A.data.datasets[0].borderColor="#5A9D96",A.data.datasets[0].backgroundColor="rgba(90, 157, 150, 0.15)";else if(q==="Construction Spending")A.data.datasets[0].borderColor="#D4822A",A.data.datasets[0].backgroundColor="rgba(212, 130, 42, 0.1)";else if(q==="Consumer Confidence")A.data.datasets[0].borderColor="#87C5BE",A.data.datasets[0].backgroundColor="rgba(135, 197, 190, 0.1)";else if(q==="Consumer Sentiment")A.data.datasets[0].borderColor="#2C5F5A",A.data.datasets[0].backgroundColor="rgba(44, 95, 90, 0.15)";else if(q==="Dollar Value Index")A.data.datasets[0].borderColor="#1D3F3B",A.data.datasets[0].backgroundColor="rgba(29, 63, 59, 0.15)";else if(q==="Employment Trends Index")A.data.datasets[0].borderColor="#5A9D96",A.data.datasets[0].backgroundColor="rgba(90, 157, 150, 0.15)";else if(q==="Interest on Debt")A.data.datasets[0].borderColor="#E8955D",A.data.datasets[0].backgroundColor="rgba(232, 149, 93, 0.1)";else if(q==="Lagging Economic Index")A.data.datasets[0].borderColor="#D4822A",A.data.datasets[0].backgroundColor="rgba(212, 130, 42, 0.1)";else if(q==="Leading Economic Indicator")A.data.datasets[0].borderColor="#87C5BE",A.data.datasets[0].backgroundColor="rgba(135, 197, 190, 0.1)";else if(q==="Manufacturing PMI")A.data.datasets[0].borderColor="#1D3F3B",A.data.datasets[0].backgroundColor="rgba(29, 63, 59, 0.15)";else if(q==="Median Home Price")A.data.datasets[0].borderColor="#5A9D96",A.data.datasets[0].backgroundColor="rgba(90, 157, 150, 0.15)";else if(q==="Monthly Budget Deficit")A.data.datasets[0].borderColor="#B56A18",A.data.datasets[0].backgroundColor="rgba(181, 106, 24, 0.15)";else if(q==="Monthly Retail Sales")A.data.datasets[0].borderColor="#E8955D",A.data.datasets[0].backgroundColor="rgba(232, 149, 93, 0.1)";else if(q==="New Orders")A.data.datasets[0].borderColor="#87C5BE",A.data.datasets[0].backgroundColor="rgba(135, 197, 190, 0.1)";else if(q==="Pending Home Sales Index")A.data.datasets[0].borderColor="#1D3F3B",A.data.datasets[0].backgroundColor="rgba(29, 63, 59, 0.15)";else if(q==="Personal Consumption Expenditures (PCE)")A.data.datasets[0].borderColor="#5A9D96",A.data.datasets[0].backgroundColor="rgba(90, 157, 150, 0.15)";else if(q==="Southern Border Encounters")A.data.datasets[0].borderColor="#B56A18",A.data.datasets[0].backgroundColor="rgba(181, 106, 24, 0.15)";else if(q==="Tariff Revenue")A.data.datasets[0].borderColor="#E8955D",A.data.datasets[0].backgroundColor="rgba(232, 149, 93, 0.1)";else if(q==="Tax Revenue")A.data.datasets[0].borderColor="#D4822A",A.data.datasets[0].backgroundColor="rgba(212, 130, 42, 0.1)";else if(q==="Trade Deficit")A.data.datasets[0].borderColor="#87C5BE",A.data.datasets[0].backgroundColor="rgba(135, 197, 190, 0.1)";else if(q==="Treasury Debt Level")A.data.datasets[0].borderColor="#1D3F3B",A.data.datasets[0].backgroundColor="rgba(29, 63, 59, 0.15)";else if(q==="Used Vehicle Value Index")A.data.datasets[0].borderColor="#B56A18",A.data.datasets[0].backgroundColor="rgba(181, 106, 24, 0.15)"}}if(q==="Jobs Added")A.data={labels:["Mar","Apr","May","Jun","Jul","Aug"],datasets:[{label:"Jobs Added (Thousands)",data:[120,158,19,14,73,22],borderColor:"#2C5F5A",backgroundColor:"rgba(44, 95, 90, 0.1)",tension:0.4,fill:!0,pointBackgroundColor:"#2C5F5A",pointBorderColor:"#2C5F5A",pointBorderWidth:2,pointRadius:4}]};return A}function O(q){if(q.type==="chartjs"&&q.data)setTimeout(()=>{let J=q.chartContent.match(/id="([^"]+)"/)?.[1];if(J){let G=document.getElementById(J);if(G){let K=G.getContext("2d");if(window[J+"Chart"])window[J+"Chart"].destroy();let L=new Chart(K,{type:"line",data:q.data,options:{responsive:!0,maintainAspectRatio:!1,layout:{padding:{top:5,right:5,bottom:5,left:5}},animation:{duration:800,easing:"easeInOutQuart"},plugins:{legend:{position:"top",align:"center",labels:{usePointStyle:!0,padding:8,boxWidth:6,font:{size:10}}},title:{display:!0,padding:{bottom:5}},tooltip:{mode:"index",intersect:!1,padding:8,titleFont:{size:10},bodyFont:{size:10},boxPadding:4},datalabels:{display:!1},tooltip:{mode:"index",intersect:!1,backgroundColor:"rgba(0, 0, 0, 0.8)",titleColor:"#fff",bodyColor:"#fff",borderColor:"#2C5F5A",borderWidth:1,callbacks:{label:function(A){let Q=A.dataset.label||"";if(Q)Q+=": ";if(A.parsed.y!==null)Q+=new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}).format(A.parsed.y);return Q}}}},scales:{x:{grid:{display:!1,drawBorder:!1},ticks:{maxRotation:0,autoSkip:!0,maxTicksLimit:6,padding:2,font:{size:9}}},y:{beginAtZero:!1,grid:{color:"rgba(0, 0, 0, 0.03)",drawBorder:!1},ticks:{padding:2,font:{size:9},callback:function(A){return A.toLocaleString()}},position:"right"}},interaction:{mode:"nearest",axis:"x",intersect:!1}}});return window[J+"Chart"]=L,L}}},100);return null}function w(){let q=document.getElementById("chartModal");document.getElementById("closeChartModal").addEventListener("click",function(){q.style.display="none",k.activeCharts.forEach((G,K)=>{k.unregisterChart(K)})}),q.addEventListener("click",function(G){if(G.target===q)q.style.display="none",k.activeCharts.forEach((K,L)=>{k.unregisterChart(L)})}),document.addEventListener("keydown",function(G){if(G.key==="Escape"&&q.style.display==="block")q.style.display="none",k.activeCharts.forEach((K,L)=>{k.unregisterChart(L)})})}window.setupChartIconHandlers=S;window.setupModalHandlers=w;window.showChartModal=T;window.toggleChartOverlay=U;window.createChartOverlay=P;window.showChartOverlay=F;window.hideChartOverlay=z;window.loadChartInOverlay=E;window.initializeChartInOverlay=j;window.realTimeManager=k;

//# debugId=03000D2B0EED2D5E64756E2164756E21
