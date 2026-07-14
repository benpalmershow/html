
  /* ==========================================
     SELF-CONTAINED FINANCIALS ENGINE
     No external dependencies before interaction.
     Charts lazy-load Chart.js from CDN on first click.
  ========================================== */
  (function(){
  'use strict';

  /* ---- Constants ---- */
  const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
  const MLABELS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  /* ---- State ---- */
  let allData=null;
  let currentFilter='latest';
  let tooltipOwner=null;

  /* ---- DOM refs ---- */
  const categoriesEl=document.getElementById('categories');
  const filterButtonsEl=document.getElementById('filter-buttons');
  const lastUpdatedEl=document.getElementById('lastUpdated');
  const tooltip=document.getElementById('explTooltip');
  const tooltipBody=document.getElementById('tooltipBody');
  const tooltipClose=document.getElementById('tooltipClose');
  const searchToggle=document.getElementById('searchToggle');
  const filterBarSearch=document.getElementById('filterBarSearch');
  const indicatorSearch=document.getElementById('indicatorSearch');

  /* ==========================================
     SEARCH TOGGLE
  ========================================== */
  if(searchToggle){
    searchToggle.addEventListener('click',function(){
      filterBarSearch.classList.toggle('open');
      if(filterBarSearch.classList.contains('open')){
        indicatorSearch.focus();
      }
    });
  }

  /* ==========================================
     SEARCH FUNCTIONALITY
  ========================================== */
  if(indicatorSearch){
    indicatorSearch.addEventListener('input',function(){
      var query=this.value.toLowerCase().trim();
      if(!query){
        render(currentFilter);
        return;
      }
      if(!allData)return;
      var indices=allData.indices||[];
      var filtered=indices.filter(function(ind){
        return ind.name&&ind.name.toLowerCase().includes(query)||
               ind.agency&&ind.agency.toLowerCase().includes(query)||
               ind.category&&ind.category.toLowerCase().includes(query);
      });
      var html='';
      if(filtered.length){
        html='<div class="category" data-category="search-results">'
          +'<h2 class="category-title">Search Results ('+filtered.length+')</h2>'
          +'<div class="indicators-grid">'+filtered.map(buildCard).join('')+'</div>'
          +'</div>';
      }else{
        html='<div style="text-align:center;padding:2rem;color:var(--text-muted);font-family:var(--font-mono)">No results found for "'+this.value+'".</div>';
      }
      categoriesEl.innerHTML=html;
      requestAnimationFrame(function(){requestAnimationFrame(renderSparklines);});
    });
  }

  /* ==========================================
     DARK MODE TOGGLE
  ========================================== */
  const darkToggle=document.getElementById('darkModeToggle');
  if(darkToggle){
    darkToggle.addEventListener('click',function(){
      var isDark=document.documentElement.classList.toggle('dark-mode');
      try{localStorage.setItem('darkMode',isDark?'1':'0');}catch(e){}
    });
  }

  /* ==========================================
     DATA UTILITIES
  ========================================== */
  function isValid(v){return v&&v!==''&&!String(v).startsWith('TBD');}

  function toNum(v){
    if(!v&&v!==0)return null;
    var s=String(v).replace(/\$/g,'').replace(/^\+/,'').replace(/[A-Za-z]/g,'').replace(/,/g,'').trim();
    var n=parseFloat(s);
    return isNaN(n)?null:n;
  }

  function fmtChange(pct){
    if(pct===null||pct===undefined)return{f:'—',cls:'change-neutral',dir:0};
    var f=(pct>=0?'+':'')+pct.toFixed(2)+'%';
    var neutral=(f==='—'||f==='+0.00%'||f==='0.00%');
    return{f,cls:neutral?'change-neutral':pct>0?'change-positive':'change-negative',dir:neutral?0:pct>0?1:-1};
  }

  function fmtCompact(n){
    if(n===null||n===undefined)return'—';
    var a=Math.abs(n);
    if(a>=1000){var k=n/1000;return(n>=0?'+':'')+( a<100000?k.toFixed(1).replace(/\.0$/,''):Math.round(k))+'K';}
    return(n>=0?'+':'')+n.toFixed(2).replace('.00','');
  }

  /* Collect all data points newest-first */
  function collectData(ind){
    var yks=Object.keys(ind).filter(k=>/^\d{4}$/.test(k)).map(Number).sort((a,b)=>b-a);
    var pts=[],covered=new Set();
    yks.forEach(yr=>{
      MONTHS.forEach((m,i)=>{
        var v=ind[yr]&&ind[yr][m];
        if(isValid(v)){pts.push({label:MLABELS[i],value:v,n:toNum(v),month:m,idx:i,year:yr});covered.add(m);}
      });
    });
    MONTHS.forEach((m,i)=>{
      if(covered.has(m))return;
      var v=ind[m];
      if(isValid(v))pts.push({label:MLABELS[i],value:v,n:toNum(v),month:m,idx:i,year:null});
    });
    pts.sort((a,b)=>{
      var ya=a.year!==null?a.year:2025,yb=b.year!==null?b.year:2025;
      if(ya!==yb)return yb-ya;
      return b.idx-a.idx;
    });
    return pts;
  }

  function calcMoM(ind){
    var pts=collectData(ind);
    if(pts.length<2)return null;
    var cur=pts[0].n,prev=pts[1].n;
    if(cur===null||prev===null||prev===0)return null;
    return((cur-prev)/Math.abs(prev))*100;
  }

  function calcYoY(ind){
    var yks=Object.keys(ind).filter(k=>/^\d{4}$/.test(k)).map(Number).sort((a,b)=>b-a);
    /* Find the most recent data point from year-nested keys */
    var latest=null;
    for(var yr of yks){
      for(var i=MONTHS.length-1;i>=0;i--){
        var v=ind[yr]&&ind[yr][MONTHS[i]];
        if(isValid(v)&&toNum(v)!==null){latest={v,n:toNum(v),yr,m:MONTHS[i]};break;}
      }
      if(latest)break;
    }
    if(!latest)return null;
    /* Look for same month in prior year - first try nested yr-1, then flat months */
    var prevV=null;
    var prevYrData=ind[latest.yr-1];
    if(prevYrData&&isValid(prevYrData[latest.m]))prevV=prevYrData[latest.m];
    else if(isValid(ind[latest.m]))prevV=ind[latest.m];
    if(!prevV)return null;
    var prevN=toNum(prevV);
    if(prevN===null||prevN===0)return null;
    return((latest.n-prevN)/Math.abs(prevN))*100;
  }

  /* ==========================================
     INDICATOR TYPE DETECTION & RENDERING
  ========================================== */
  function detectType(ind){
    if(ind.name&&(ind.name.includes('FOMC')||ind.rate_hold_odds||ind.rate_cut_odds))return'fomc';
    if(ind.name&&ind.name.includes('Recession'))return'recession';
    if(ind.name&&ind.name.includes('@'))return'sports';
    if(ind.name&&ind.name.includes('Hormuz'))return'hormuz';
    var probs=ind.probabilities||ind.propabilities;
    if(probs&&typeof probs==='object'){
      var first=Object.values(probs)[0];
      if(first&&(first['Democratic Party']!==undefined||first['Republican Party']!==undefined))return'party';
      if(first&&first.yes!==undefined)return'prediction';
      return'venezuela';
    }
    if(ind.candidates&&typeof ind.candidates==='object')return'venezuela';
    if(ind.yes_probability)return'prediction';
    return'standard';
  }

  function renderStandard(ind){
    var pts=collectData(ind);
    if(!pts.length)return{latest:'<div class="latest-data-row"><span class="month-label">No data</span></div>',hist:'',hasHist:false};
    var latest='',hist='';
    pts.slice(0,2).forEach(function(p){
      latest+='<div class="latest-data-row"><span class="month-label">'+p.label+'</span><span class="month-value">'+p.value+'</span></div>';
    });
    var histPts=pts.slice(2);
    histPts.forEach(function(p){
      hist+='<div class="data-row"><span class="month-label">'+p.label+'</span><span class="month-value">'+p.value+'</span></div>';
    });
    return{latest,hist,hasHist:histPts.length>0};
  }

  function renderPrediction(ind){
    var probs=ind.probabilities||ind.propabilities;
    if(!probs||typeof probs!=='object'){
      if(ind.yes_probability){
        var yp=parseFloat(ind.yes_probability)||0,np=parseFloat(ind.no_probability)||0;
        var html='<div class="prediction-bar-container">'
          +'<div class="prediction-bar-row"><span class="prediction-bar-label yes-value">Yes</span>'
          +'<div class="prediction-bar-track"><div class="prediction-bar-fill yes-bar" style="width:'+yp+'%"></div>'
          +'<div class="prediction-bar-fill no-bar" style="width:'+np+'%"></div></div>'
          +'<span class="prediction-bar-value yes-value">'+ind.yes_probability+'</span></div>'
          +'<div class="prediction-bar-row"><span class="prediction-bar-label no-value">No</span>'
          +'<span class="prediction-bar-value no-value">'+ind.no_probability+'</span></div></div>';
        return{latest:html,hist:'',hasHist:false};
      }
      return{latest:'<div class="data-row"><span class="month-label">No data</span></div>',hist:'',hasHist:false};
    }
    var sorted=Object.entries(probs).sort(function(a,b){return new Date(b[0])-new Date(a[0]);});
    if(!sorted.length)return{latest:'',hist:'',hasHist:false};
    var latest=sorted[0][1];
    var yp=parseFloat(latest.yes)||0,np=parseFloat(latest.no)||0;
    var latestHtml='<div class="prediction-bar-container">'
      +'<div class="prediction-bar-row"><span class="prediction-bar-label yes-value">Yes</span>'
      +'<div class="prediction-bar-track"><div class="prediction-bar-fill yes-bar" style="width:'+yp+'%"></div>'
      +'<div class="prediction-bar-fill no-bar" style="width:'+np+'%"></div></div>'
      +'<span class="prediction-bar-value yes-value">'+latest.yes+'</span></div>'
      +'<div class="prediction-bar-row"><span class="prediction-bar-label no-value">No</span>'
      +'<span class="prediction-bar-value no-value">'+latest.no+'</span></div></div>';
    var histHtml='',hasHist=sorted.length>1;
    sorted.slice(1).forEach(function(e){
      var d=new Date(e[0]+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
      histHtml+='<div class="data-row"><span class="month-label">'+d+'</span><span class="month-value"><span class="yes-value">'+e[1].yes+'</span> / <span class="no-value">'+e[1].no+'</span></span></div>';
    });
    return{latest:latestHtml,hist:histHtml,hasHist};
  }

  function renderFOMC(ind){
    if(ind.rate_hold_odds&&ind.rate_cut_odds&&ind.rate_hike_odds){
      var ho=parseFloat(ind.rate_hold_odds)||0,hi=parseFloat(ind.rate_hike_odds)||0,cu=parseFloat(ind.rate_cut_odds)||0;
      var html='<div class="fomc-stacked-bar-track">'
        +'<div class="fomc-segment fomc-hold" style="width:'+ho+'%" title="Hold">'+ind.rate_hold_odds+'</div>'
        +'<div class="fomc-segment fomc-hike" style="width:'+hi+'%" title="Hike">'+ind.rate_hike_odds+'</div>'
        +'<div class="fomc-segment fomc-cut" style="width:'+cu+'%" title="Cut">'+ind.rate_cut_odds+'</div>'
        +'</div>'
        +'<div class="fomc-legend">'
        +'<span class="fomc-legend-item"><span class="fomc-legend-dot fomc-hold"></span>Hold</span>'
        +'<span class="fomc-legend-item"><span class="fomc-legend-dot fomc-hike"></span>Hike</span>'
        +'<span class="fomc-legend-item"><span class="fomc-legend-dot fomc-cut"></span>Cut</span>'
        +'</div>';
      return{latest:html,hist:'',hasHist:false};
    }
    return renderStandard(ind);
  }

  function renderParty(ind){
    var probs=ind.probabilities||ind.propabilities;
    if(!probs)return renderStandard(ind);
    var sorted=Object.entries(probs).sort(function(a,b){return new Date(b[0])-new Date(a[0]);});
    if(!sorted.length)return{latest:'',hist:'',hasHist:false};
    var latest=sorted[0][1];
    var dem=parseFloat(latest['Democratic Party'])||0,gop=parseFloat(latest['Republican Party'])||0;
    var html='<div class="prediction-bar-container">'
      +'<div class="prediction-bar-row"><span class="prediction-bar-label" style="color:#3498db;min-width:50px">Dem</span>'
      +'<div class="prediction-bar-track"><div class="prediction-bar-fill" style="width:'+dem+'%;background:linear-gradient(90deg,#3498db,#5dade2)"></div></div>'
      +'<span class="prediction-bar-value" style="color:#3498db">'+latest['Democratic Party']+'</span></div>'
      +'<div class="prediction-bar-row"><span class="prediction-bar-label" style="color:#e74c3c;min-width:50px">GOP</span>'
      +'<div class="prediction-bar-track"><div class="prediction-bar-fill" style="width:'+gop+'%;background:linear-gradient(90deg,#e74c3c,#f1948a)"></div></div>'
      +'<span class="prediction-bar-value" style="color:#e74c3c">'+latest['Republican Party']+'</span></div>'
      +'</div>';
    return{latest:html,hist:'',hasHist:false};
  }

  function renderVenezuela(ind){
    var probs=ind.probabilities||ind.propabilities;
    var cands=probs?Object.entries(probs).sort(function(a,b){return new Date(b[0])-new Date(a[0]);})[0]:null;
    var entries=cands?Object.entries(cands[1]):ind.candidates?Object.entries(ind.candidates):[];
    if(!entries.length)return renderStandard(ind);
    entries.sort(function(a,b){return parseFloat(b[1])-parseFloat(a[1]);});
    var html='<div class="prediction-bar-container">';
    entries.forEach(function(e){
      var pv=parseFloat(e[1])||0;
      html+='<div class="prediction-bar-row"><span class="prediction-bar-label" style="min-width:60px;font-size:.65rem">'+e[0].slice(0,8)+'</span>'
        +'<div class="prediction-bar-track"><div class="prediction-bar-fill yes-bar" style="width:'+pv+'%"></div></div>'
        +'<span class="prediction-bar-value yes-value">'+e[1]+'</span></div>';
    });
    html+='</div>';
    return{latest:html,hist:'',hasHist:false};
  }

  function renderSports(ind){
    var rows=[];
    if(ind.game_title)rows.push(['Game',ind.game_title]);
    if(ind.game_time)rows.push(['Time',ind.game_time]);
    Object.keys(ind).filter(k=>k.endsWith('_win_odds')).forEach(k=>{rows.push([k.replace('_win_odds','').toUpperCase()+' Win',ind[k]]);});
    if(ind.total_points)rows.push(['Total',ind.total_points]);
    var latest=rows.slice(0,2).map(r=>'<div class="latest-data-row"><span class="month-label">'+r[0]+'</span><span class="month-value">'+r[1]+'</span></div>').join('');
    var hist=rows.slice(2).map(r=>'<div class="data-row"><span class="month-label">'+r[0]+'</span><span class="month-value">'+r[1]+'</span></div>').join('');
    return{latest,hist,hasHist:rows.length>2};
  }

  function renderHormuz(ind){
    var daily=ind.daily&&typeof ind.daily==='object'?Object.entries(ind.daily).sort((a,b)=>new Date(b[0])-new Date(a[0])):[];
    var latest=daily[0],BASELINE=115;
    if(!latest)return renderStandard(ind);
    var cnt=parseInt(latest[1],10),pct=Math.min(Math.round((cnt/BASELINE)*100),100);
    var clsMap=pct<20?'yes-bar':pct<50?'no-bar':'yes-bar'; /* reuse bar colors */
    var latestHtml='<div><div style="display:flex;align-items:baseline;gap:6px">'
      +'<span style="font-size:1.4rem;font-weight:700;color:#dc2626">'+cnt+'</span>'
      +'<span style="font-size:.7rem;color:var(--text-muted)">/day</span>'
      +'<span style="font-size:.55rem;font-weight:700;background:rgba(220,38,38,.1);color:#dc2626;border:1px solid rgba(220,38,38,.2);border-radius:3px;padding:1px 4px;margin-left:auto">Blockade</span>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;margin-top:4px">'
      +'<div class="prediction-bar-track"><div class="prediction-bar-fill" style="width:'+pct+'%;background:#dc2626"></div></div>'
      +'<span style="font-size:.6rem;color:var(--text-muted)">'+pct+'% vs baseline</span></div></div>';
    var hist=daily.slice(1,6).map(function(e){
      var d=new Date(e[0]+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
      return'<div class="data-row"><span class="month-label">'+d+'</span><span class="month-value" style="color:#dc2626">'+e[1]+'</span></div>';
    }).join('');
    return{latest:latestHtml,hist,hasHist:daily.length>1};
  }

  function renderByType(ind,type){
    switch(type){
      case'fomc':return renderFOMC(ind);
      case'prediction':case'recession':return renderPrediction(ind);
      case'party':return renderParty(ind);
      case'venezuela':return renderVenezuela(ind);
      case'sports':return renderSports(ind);
      case'hormuz':return renderHormuz(ind);
      default:return renderStandard(ind);
    }
  }

  /* ==========================================
     SPARKLINE (no deps)
  ========================================== */
  function drawSparkline(canvas,values){
    if(!values||values.length<3)return;
    var w=canvas.width=canvas.parentElement.offsetWidth||300;
    var h=canvas.height=canvas.parentElement.offsetHeight||100;
    var ctx=canvas.getContext('2d');
    var min=Math.min.apply(null,values),max=Math.max.apply(null,values);
    var range=max-min||1,pad=range*.1;
    var pts=values.map(function(v,i){return{
      x:(i/(values.length-1))*w,
      y:h-((v-min+pad)/(range+pad*2))*h
    };});
    var grd=ctx.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'rgba(44,95,90,.12)');grd.addColorStop(1,'rgba(44,95,90,0)');
    function trace(){
      ctx.moveTo(pts[0].x,pts[0].y);
      for(var i=1;i<pts.length;i++){
        var xc=(pts[i].x+pts[i-1].x)/2,yc=(pts[i].y+pts[i-1].y)/2;
        ctx.quadraticCurveTo(pts[i-1].x,pts[i-1].y,xc,yc);
      }
      ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);
    }
    ctx.beginPath();trace();
    ctx.lineTo(pts[pts.length-1].x,h);ctx.lineTo(pts[0].x,h);ctx.closePath();
    ctx.fillStyle=grd;ctx.fill();
    ctx.beginPath();trace();
    ctx.strokeStyle='rgba(44,95,90,.18)';ctx.lineWidth=1.5;ctx.lineCap='round';ctx.stroke();
  }

  function renderSparklines(){
    document.querySelectorAll('.sparkline-container canvas[data-spark]').forEach(function(c){
      if(c._done)return;c._done=true;
      try{drawSparkline(c,JSON.parse(c.dataset.spark));}catch(e){}
    });
  }

  /* ==========================================
     CARD BUILDER
  ========================================== */
  function buildCard(ind){
    var type=detectType(ind);
    var{latest,hist,hasHist}=renderByType(ind,type);
    var mom=type==='standard'||type==='fomc'?calcMoM(ind):null;
    var yoy=type==='standard'?calcYoY(ind):null;
    var momInfo=fmtChange(mom),yoyInfo=fmtChange(yoy);
    var changeHtml='';
    if(mom!==null){
      changeHtml+='<span class="change-metric-btn '+momInfo.cls+'" title="Month over Month">MoM '+momInfo.f+'</span>';
    }
    if(yoy!==null){
      changeHtml+='<span class="change-metric-btn '+yoyInfo.cls+'" title="Year over Year">YoY '+yoyInfo.f+'</span>';
    }
    var url=ind.url||'#';
    var dateStr=ind.lastUpdated?new Date(ind.lastUpdated).getMonth()+1+'/'+new Date(ind.lastUpdated).getDate():'';
    var isNew=ind.lastUpdated&&(Date.now()-new Date(ind.lastUpdated).getTime())<(3*24*60*60*1000);
    var expl=ind.explanation||(ind.explanation_text)||'';
    /* collect sparkline values for standard type */
    var sparkVals=[];
    if(type==='standard'){
      var pts=collectData(ind);
      sparkVals=pts.map(p=>p.n).filter(v=>v!==null).reverse();
    }
    var infoBtn=expl?'<button class="info-btn" data-expl="'+escQ(expl)+'" aria-label="Show explanation" title="About this indicator"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></button>':'';
    var chartBtn=(ind.category!=='Prediction Markets'&&type!=='hormuz')?'<button class="chart-btn" data-iname="'+escQ(ind.name)+'" aria-label="View chart" title="View chart"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></button>':'';
    var expandBtn=hasHist?'<button class="expand-toggle" aria-label="Toggle history"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button>':'';
    var sparkHtml=sparkVals.length>3?'<div class="sparkline-container"><canvas data-spark="'+escQ(JSON.stringify(sparkVals))+'"></canvas></div>':'';
    return '<div class="indicator" data-iname="'+escQ(ind.name)+'">'
      +'<div class="indicator-header">'
      +'<div class="indicator-name">'+ind.name+(isNew?'<span class="new-badge">New</span>':'')+'</div>'
      +'<div class="indicator-actions">'+infoBtn+chartBtn+expandBtn+'</div>'
      +'</div>'
      +'<div class="indicator-agency">Source: <a href="'+url+'" target="_blank" rel="noopener">'+ind.agency+'</a>'
      +(dateStr?' | <span class="indicator-date">'+dateStr+'</span>':'')
      +'</div>'
      +(changeHtml?'<div class="change-indicators">'+changeHtml+'</div>':'')
      +'<div class="indicator-content">'
      +latest
      +(hasHist?'<div class="data-rows-container">'+hist+'</div>':'')
      +'</div>'
      +sparkHtml
      +'</div>';
  }

  function escQ(s){return String(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  /* ==========================================
     CHART (lazy - loads Chart.js on demand)
  ========================================== */
  var chartJsLoaded=false,chartJsLoading=false,chartJsCallbacks=[];

  function ensureChartJs(cb){
    if(chartJsLoaded){cb();return;}
    chartJsCallbacks.push(cb);
    if(chartJsLoading)return;
    chartJsLoading=true;
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    s.crossOrigin='anonymous';
    s.onload=function(){chartJsLoaded=true;chartJsLoading=false;chartJsCallbacks.forEach(f=>f());chartJsCallbacks=[];};
    s.onerror=function(){chartJsLoading=false;};
    document.head.appendChild(s);
  }

  function buildLineConfig(ind){
    var pts=collectData(ind);
    var vals=pts.map(p=>p.n).filter(v=>v!==null).reverse();
    var labels=pts.map(p=>p.label).reverse().slice(pts.length-vals.length);
    return{labels,datasets:[{label:ind.name,data:vals,borderColor:'#2C5F5A',backgroundColor:'rgba(44,95,90,.1)',tension:.4,fill:true,pointRadius:3,pointHoverRadius:5}]};
  }

  function buildBudgetConfig(ind){
    var labels=[],receipts=[],outlays=[],deficit=[];
    var yks=Object.keys(ind).filter(k=>/^\d{4}$/.test(k)).map(Number).sort((a,b)=>b-a);
    yks.forEach(yr=>{
      MONTHS.forEach((m,i)=>{
        var rv=ind.receipts&&ind.receipts[yr]&&ind.receipts[yr][m];
        var ov=ind.outlays&&ind.outlays[yr]&&ind.outlays[yr][m];
        var dv=ind[yr]&&ind[yr][m];
        if(isValid(rv)&&isValid(ov)&&isValid(dv)){
          labels.push(MLABELS[i]+' '+yr);
          receipts.push(toNum(rv));outlays.push(toNum(ov));deficit.push(toNum(dv));
        }
      });
    });
    return{labels,datasets:[
      {label:'Receipts',data:receipts,type:'bar',backgroundColor:'rgba(81,207,102,.7)',borderColor:'#51CF66',borderWidth:1,yAxisID:'y'},
      {label:'Outlays',data:outlays,type:'bar',backgroundColor:'rgba(255,107,107,.7)',borderColor:'#FF6B6B',borderWidth:1,yAxisID:'y'},
      {label:'Deficit/Surplus',data:deficit,type:'line',borderColor:'#2C5F5A',backgroundColor:'rgba(44,95,90,.2)',borderWidth:2,tension:.4,fill:'origin',yAxisID:'y1',pointRadius:3}
    ]};
  }

  function openChart(card,iname){
    var existing=card.querySelector('.chart-overlay');
    if(existing){
      if(existing.classList.contains('show')){existing.classList.remove('show');}
      else{existing.classList.add('show');}
      return;
    }
    var overlay=document.createElement('div');
    overlay.className='chart-overlay show';
    overlay.innerHTML='<div class="chart-overlay-range-picker">'
      +'<button class="range-btn" data-range="3">3M</button>'
      +'<button class="range-btn" data-range="6">6M</button>'
      +'<button class="range-btn active" data-range="12">1Y</button>'
      +'<button class="chart-overlay-close" aria-label="Close chart">×</button>'
      +'</div>'
      +'<div class="chart-overlay-body"><div class="chart-loading">Loading chart…</div></div>';
    card.appendChild(overlay);
    overlay.querySelector('.chart-overlay-close').addEventListener('click',function(){overlay.classList.remove('show');});
    overlay.querySelectorAll('.range-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        overlay.querySelectorAll('.range-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        if(overlay._chart){overlay._chart.destroy();overlay._chart=null;}
        loadChartInOverlay(overlay,iname,parseInt(btn.dataset.range));
      });
    });
    ensureChartJs(function(){loadChartInOverlay(overlay,iname,12);});
  }

  function loadChartInOverlay(overlay,iname,months){
    if(!allData)return;
    var ind=allData.indices.find(x=>x.name===iname);
    if(!ind)return;
    var body=overlay.querySelector('.chart-overlay-body');
    body.innerHTML='';
    var canvas=document.createElement('canvas');
    canvas.className='chart-overlay-canvas';
    body.appendChild(canvas);
    var cfg=ind.receipts?buildBudgetConfig(ind):buildLineConfig(ind);
    /* slice to last N months */
    if(cfg.labels.length>months){cfg.labels=cfg.labels.slice(-months);cfg.datasets.forEach(d=>{d.data=d.data.slice(-months);});}
    try{
      var isMixed=cfg.datasets.some(d=>d.type==='bar');
      overlay._chart=new Chart(canvas.getContext('2d'),{
        type:isMixed?'bar':'line',
        data:cfg,
        options:{
          responsive:true,maintainAspectRatio:false,
          animation:{duration:400},
          plugins:{legend:{display:isMixed,position:'bottom',labels:{font:{size:10},padding:8,boxWidth:10}},tooltip:{mode:'index',intersect:false}},
          scales:{x:{grid:{display:false},ticks:{font:{size:9},maxRotation:0,autoSkip:true,maxTicksLimit:8}},
            y:{grid:{color:'rgba(0,0,0,.03)'},ticks:{display:false}},
            ...(isMixed?{y1:{grid:{display:false},ticks:{display:false},position:'right'}}:{})}
        }
      });
    }catch(e){body.innerHTML='<div class="chart-loading">Chart unavailable</div>';}
  }

  /* ==========================================
     FILTER & RENDER
  ========================================== */
  /* Inline SVG icons for filter buttons - no CDN needed */
  var FILTER_ICONS={
    'latest':       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'all':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    'Employment Indicators': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'Housing Market':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'Business Indicators':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    'Consumer Indicators':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    'Trade & Tariffs':       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    'Government':            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>',
    'Prediction Markets':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    'Financial Markets':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    'Commodities':           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    '13F Holdings':          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="9" y="11" width="6" height="11" rx="1"/></svg>',
    'World Cup':             '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>'
  };

  function buildFilters(data){
    var cats=[...new Set(data.indices.map(i=>i.category))];
    function btn(filter,label,icon,active){
      return '<button class="filter-btn'+(active?' active':'')+'" data-filter="'+escQ(filter)+'">'
        +icon+label+'</button>';
    }
    var html=btn('latest','Latest',FILTER_ICONS['latest'],true)
      +btn('all','All',FILTER_ICONS['all'],false);
    cats.forEach(function(c){
      html+=btn(c,c,FILTER_ICONS[c]||FILTER_ICONS['Financial Markets'],false);
    });
    html+=btn('13F Holdings','13F Holdings',FILTER_ICONS['13F Holdings'],false);
    html+=btn('World Cup','World Cup',FILTER_ICONS['World Cup'],false);
    filterButtonsEl.innerHTML=html;
  }

  function render(filter){
    currentFilter=filter;
    var data=allData;if(!data)return;
    var indices=data.indices||[];

    /* Show/hide special sections */
    var el13f=document.getElementById('section-13f');
    var elWc=document.getElementById('section-worldcup');
    var show13f=filter==='13F Holdings'||filter==='all'||filter==='latest';
    var showWc=filter==='World Cup'||filter==='all'||filter==='latest';
    el13f.style.display=show13f?'':'none';
    elWc.style.display=showWc?'':'none';

    /* Lazy-load 13F on first show */
    if(show13f&&!window._13fLoaded){window._13fLoaded=true;load13F();}
    /* Lazy-load World Cup on first show */
    if(showWc&&!window._wcLoaded){window._wcLoaded=true;loadWorldCup();}

    /* When filtered to a special section only, hide indicator categories */
    if(filter==='13F Holdings'||filter==='World Cup'){
      categoriesEl.style.display='none';
      return;
    }
    categoriesEl.style.display='';

    var html='';
    if(filter==='latest'){
      var sorted=[...indices].sort(function(a,b){
        var da=a.lastUpdated?new Date(a.lastUpdated).getTime():0;
        var db=b.lastUpdated?new Date(b.lastUpdated).getTime():0;
        return db-da;
      });
      html='<div class="category" data-category="latest">'
        +'<h2 class="category-title">Latest Updates</h2>'
        +'<div class="indicators-grid">'+sorted.map(buildCard).join('')+'</div>'
        +'</div>';
    }else if(filter==='all'){
      var cats=[...new Set(indices.map(i=>i.category))];
      cats.forEach(function(cat){
        var items=indices.filter(i=>i.category===cat);
        html+='<div class="category" data-category="'+escQ(cat)+'">'
          +'<h2 class="category-title">'+cat+'</h2>'
          +'<div class="indicators-grid">'+items.map(buildCard).join('')+'</div>'
          +'</div>';
      });
    }else{
      var items=indices.filter(i=>i.category===filter);
      if(items.length){
        html='<div class="category" data-category="'+escQ(filter)+'">'
          +'<h2 class="category-title">'+filter+'</h2>'
          +'<div class="indicators-grid">'+items.map(buildCard).join('')+'</div>'
          +'</div>';
      }else{
        html='<div style="text-align:center;padding:2rem;color:var(--text-muted);font-family:var(--font-mono)">No indicators in this category.</div>';
      }
    }
    categoriesEl.innerHTML=html;
    /* defer sparklines to avoid blocking paint */
    requestAnimationFrame(function(){requestAnimationFrame(renderSparklines);});
    /* lazy reveal for off-screen categories */
    setupLazyReveal();
  }

  function setupLazyReveal(){
    var cats=document.querySelectorAll('.category');
    if(cats.length<=2)return;
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.querySelectorAll('.indicator[style*="display:none"]').forEach(function(c){c.style.display='';});
          obs.unobserve(e.target);
        }
      });
    },{rootMargin:'200px',threshold:.01});
    cats.forEach(function(cat,i){
      if(i>1){
        cat.querySelectorAll('.indicator').forEach(function(c){c.style.display='none';});
        obs.observe(cat);
      }
    });
  }

  /* ==========================================
     EVENT DELEGATION
  ========================================== */
  /* Filter click */
  filterButtonsEl.addEventListener('click',function(e){
    var btn=e.target.closest('.filter-btn');
    if(!btn)return;
    filterButtonsEl.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    render(btn.dataset.filter);
  });

  /* Expand/collapse, info, chart */
  categoriesEl.addEventListener('click',function(e){
    /* expand toggle */
    var exp=e.target.closest('.expand-toggle');
    if(exp){
      var card=exp.closest('.indicator');
      card.classList.toggle('expanded');
      return;
    }
    /* info btn */
    var info=e.target.closest('.info-btn');
    if(info){
      var expl=info.dataset.expl;
      if(!expl)return;
      if(tooltipOwner===info&&tooltip.classList.contains('open')){hideTooltip();return;}
      showTooltip(info,expl);
      return;
    }
    /* chart btn */
    var chart=e.target.closest('.chart-btn');
    if(chart){
      var card=chart.closest('.indicator');
      var iname=chart.dataset.iname||card.dataset.iname;
      if(iname)openChart(card,iname);
      return;
    }
  });

  /* Tooltip helpers */
  tooltipClose.addEventListener('click',hideTooltip);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')hideTooltip();});
  document.addEventListener('click',function(e){
    if(!tooltip.classList.contains('open'))return;
    if(!tooltip.contains(e.target)&&!e.target.closest('.info-btn'))hideTooltip();
  });
  window.addEventListener('scroll',hideTooltip,{passive:true});

  function showTooltip(btn,text){
    tooltipBody.textContent=text;
    tooltip.style.visibility='hidden';
    tooltip.classList.add('open');
    tooltipOwner=btn;
    var r=btn.getBoundingClientRect(),tr=tooltip.getBoundingClientRect();
    var m=8,vw=window.innerWidth,vh=window.innerHeight;
    var top=r.bottom+m;
    if(top+tr.height>vh-m&&r.top-m-tr.height>m)top=r.top-m-tr.height;
    var left=Math.max(m,Math.min(r.left+r.width/2-tr.width/2,vw-tr.width-m));
    tooltip.style.top=top+'px';tooltip.style.left=left+'px';
    tooltip.style.visibility='visible';
  }

  function hideTooltip(){
    tooltip.classList.remove('open');
    tooltipOwner=null;
  }

  /* ==========================================
     DATA LOADING
     1. Fetch full JSON immediately (no inline bloat)
     2. Show skeleton while loading
  ========================================== */
  function showSkeleton(){
    categoriesEl.innerHTML='<div class="category skeleton-card">'
      +'<div class="skeleton-line long" style="height:20px;margin-bottom:12px"></div>'
      +'<div class="indicators-grid">'
      +'<div class="skeleton-card" style="padding:.75rem">'
      +'<div class="skeleton-line long"></div><div class="skeleton-line medium"></div><div class="skeleton-line short"></div>'
      +'</div>'
      +'<div class="skeleton-card" style="padding:.75rem">'
      +'<div class="skeleton-line long"></div><div class="skeleton-line medium"></div><div class="skeleton-line short"></div>'
      +'</div></div></div>';
  }

  function initWithData(data){
    allData=data;
    window.financialData=data;
    lastUpdatedEl.textContent='Last Updated: '+new Date(data.lastUpdated).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
    buildFilters(data);
    /* Read URL filter param */
    var params=new URLSearchParams(window.location.search);
    var urlFilter=params.get('filter')||'latest';
    var activeBtn=filterButtonsEl.querySelector('[data-filter="'+escQ(urlFilter)+'"]');
    if(activeBtn){
      filterButtonsEl.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      activeBtn.classList.add('active');
    }
    render(urlFilter);
    /* Preload 13F+WC on idle for latest/all views */
    if(urlFilter==='latest'||urlFilter==='all'){
      var idle='requestIdleCallback'in window?requestIdleCallback:function(f){setTimeout(f,1500);};
      idle(function(){if(!window._13fLoaded){window._13fLoaded=true;load13F();}});
      idle(function(){if(!window._wcLoaded){window._wcLoaded=true;loadWorldCup();}});
    }
  }

  async function loadData(){
    showSkeleton();
    try{
      var res=await fetch('json/financials-data.json?_='+Date.now(),{headers:{'Accept':'application/json'}});
      if(!res.ok)throw new Error('HTTP '+res.status);
      var data=await res.json();
      initWithData(data);
    }catch(err){
      categoriesEl.innerHTML='<div class="error">Failed to load data. Please try again.</div>';
    }
  }

  /* ==========================================
     WORLD CUP
  ========================================== */
  async function loadWorldCup(){
    try{
      var res=await fetch('json/world-cup.json');
      if(!res.ok)throw new Error('HTTP '+res.status);
      var data=await res.json();
      renderWorldCup(data.matches||[]);
    }catch(e){
      var g=document.getElementById('worldCupGrid');
      if(g)g.innerHTML='<div style="color:var(--text-muted);font-size:.85rem;padding:.5rem">Could not load World Cup data.</div>';
    }
  }

  function renderWorldCup(matches){
    var grid=document.getElementById('worldCupGrid');
    if(!grid)return;
    matches=matches.slice().sort(function(a,b){return new Date(b.utcDate||b.date)-new Date(a.utcDate||a.date);});
    grid.innerHTML=matches.map(function(m){
      var grp=m.group?m.group.replace('GROUP_','Group '):'';
      var score=(m.teamA.score??'')+(m.teamA.score!=null?' - ':' v ')+(m.teamB.score??'');
      var details=[];
      if(m.date)details.push('Date: '+m.date);
      if(m.venue)details.push('Venue: '+m.venue);
      if(m.winner){var wn=m.winner==='HOME_TEAM'?m.teamA.name:m.winner==='AWAY_TEAM'?m.teamB.name:'Draw';details.push('Winner: '+wn);}
      if(m.teamA.halfTimeScore!=null)details.push('HT: '+m.teamA.halfTimeScore+' - '+m.teamB.halfTimeScore);
      var detailHtml=details.length?'<div class="match-detail" id="md-'+m.id+'">'+details.map(d=>'<div>'+d+'</div>').join('')+'</div>':'';
      var crestA=m.teamA.crest?'<img src="'+m.teamA.crest+'" alt="'+escQ(m.teamA.name)+'" class="team-crest" onerror="this.style.display=\'none\'">':'';
      var crestB=m.teamB.crest?'<img src="'+m.teamB.crest+'" alt="'+escQ(m.teamB.name)+'" class="team-crest" onerror="this.style.display=\'none\'">':'';
      return '<div class="indicator">'
        +'<div class="indicator-header">'
        +'<div class="indicator-name">'+grp+'</div>'
        +(details.length?'<button class="info-btn" onclick="var d=document.getElementById(\'md-'+m.id+'\');d.classList.toggle(\'open\')" aria-label="Match details"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></button>':'')
        +'</div>'
        +'<div class="match-score-display">'
        +'<div class="match-team">'+crestA+'<span class="team-flag" style="'+(m.teamA.crest?'display:none':'')+'">'+( m.teamA.flag||'🏳️')+'</span><span class="team-name">'+m.teamA.name+'</span></div>'
        +'<div class="match-score">'+score+'</div>'
        +'<div class="match-team">'+crestB+'<span class="team-flag" style="'+(m.teamB.crest?'display:none':'')+'">'+( m.teamB.flag||'🏳️')+'</span><span class="team-name">'+m.teamB.name+'</span></div>'
        +'</div>'
        +detailHtml
        +'</div>';
    }).join('');
  }

  /* ==========================================
     13F HOLDINGS
  ========================================== */
  async function load13F(){
    try{
      var res=await fetch('json/13f-holdings.json');
      if(!res.ok)throw new Error('HTTP '+res.status);
      var data=await res.json();
      render13F(data.firms||[],data.holdings||[]);
    }catch(e){
      var c=document.getElementById('firmCardsContainer');
      if(c)c.innerHTML='<div style="color:var(--text-muted);font-size:.85rem;padding:.5rem">Could not load 13F data.</div>';
    }
  }

  function isETF(name){
    var n=name.toUpperCase();
    if(['INC','CORP','CLASS A','CLASS B','A S F'].some(s=>n.includes(s)))return false;
    return['ETF','TRUST','FUND','INDEX','SPDR','ISHARES','VANGUARD','INVESCO','DIMENSIONAL'].some(s=>n.includes(s));
  }

  function holdingColor(pct){
    pct=parseFloat(pct)||0;
    if(pct>=8)return'#E63946';if(pct>=5)return'#FF8C42';
    if(pct>=3)return'#FACC15';if(pct>=1.5)return'#33AA66';
    return'#3399CC';
  }

  function render13F(firms,holdings){
    var container=document.getElementById('firmCardsContainer');
    if(!container)return;
    container.innerHTML='';

    /* sort firms: newest filing first */
    var sorted=firms.map(function(f,i){return i;}).sort(function(a,b){
      var da=firms[a].filingDate?new Date(firms[a].filingDate):new Date('2025-11-26');
      var db=firms[b].filingDate?new Date(firms[b].filingDate):new Date('2025-11-26');
      return db-da;
    });

    sorted.forEach(function(firmIdx){
      var firm=firms[firmIdx];
      var fh=holdings.filter(h=>h.firmIndex===firmIdx).sort((a,b)=>b.value-a.value);
      if(!fh.length)return;
      var totalV=fh.reduce(function(s,h){return s+h.value;},0);
      var filedStr=firm.filingDate?((new Date(firm.filingDate).getMonth()+1)+'/'+ new Date(firm.filingDate).getDate()):'';
      var cardId='firm-'+firmIdx;
      var card=document.createElement('div');
      card.className='indicator';
      card.id=cardId;

      var listHtml=fh.slice(0,10).map(function(h,i){
        return'<div class="holding-item" data-idx="'+i+'" data-pct="'+h.pct+'">'
          +'<div><div class="holding-ticker">'+h.ticker+'</div>'
          +'<div class="holding-name">'+h.name+'</div>'
          +'<div class="holding-pct">'+h.pct+'% of portfolio</div></div></div>';
      }).join('');

      card.innerHTML='<div class="indicator-header">'
        +'<div class="indicator-name">'+firm.shortName+'</div>'
        +'<button class="expand-toggle" aria-label="Toggle details"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button>'
        +'</div>'
        +'<div class="indicator-agency">AUM: <span style="color:var(--text-primary);font-weight:600;">$'+(totalV/1000000).toFixed(1)+'M</span>'
        +' | Filed: <span class="indicator-date">'+filedStr+'</span></div>'
        +'<div class="data-rows-container">'
        +'<div class="firm-filter-buttons">'
        +'<button class="firm-filter-btn active" data-f="all">All</button>'
        +'<button class="firm-filter-btn" data-f="etf">ETF</button>'
        +'<button class="firm-filter-btn" data-f="stock">Stock</button>'
        +'</div>'
        +'<div class="firm-holdings-list" id="hl-'+firmIdx+'">'+listHtml+'</div>'
        +'<div class="firm-chart-wrapper"><canvas id="fc-'+firmIdx+'"></canvas></div>'
        +(firm.description?'<div class="firm-description">'+firm.description+'</div>':'')
        +'</div>';

      container.appendChild(card);

      /* filter state */
      var filterState={f:'all'};

      function refreshList(){
        var show=filterState.f==='etf'?fh.filter(h=>isETF(h.name)):filterState.f==='stock'?fh.filter(h=>!isETF(h.name)):fh;
        show=show.slice().sort((a,b)=>b.value-a.value);
        var hl=document.getElementById('hl-'+firmIdx);
        if(hl)hl.innerHTML=show.slice(0,10).map(function(h,i){
          return'<div class="holding-item" data-idx="'+i+'" data-pct="'+h.pct+'">'
            +'<div><div class="holding-ticker">'+h.ticker+'</div>'
            +'<div class="holding-name">'+h.name+'</div>'
            +'<div class="holding-pct">'+h.pct+'% of portfolio</div></div></div>';
        }).join('');
        /* update chart if loaded */
        var ci=window['fc'+firmIdx+'Chart'];
        if(ci){ci.data.labels=show.slice(0,10).map(h=>h.ticker);ci.data.datasets[0].data=show.slice(0,10).map(h=>h.value/1000000);ci.data.datasets[0].backgroundColor=show.slice(0,10).map(h=>holdingColor(h.pct));ci.update();}
        /* update filter btns */
        card.querySelectorAll('.firm-filter-btn').forEach(function(b){b.classList.toggle('active',b.dataset.f===filterState.f);});
      }

      card.querySelectorAll('.firm-filter-btn').forEach(function(b){
        b.addEventListener('click',function(){filterState.f=b.dataset.f;refreshList();});
      });

      /* Collapsed by default - chart draws on first expand */
      card.querySelector('.expand-toggle').addEventListener('click',function(){
        var wasExpanded=card.classList.contains('expanded');
        card.classList.toggle('expanded');
        /* Draw chart on first open */
        if(!wasExpanded&&!window['fc'+firmIdx+'Chart']){
          ensureChartJs(function(){drawFirmChart(firmIdx,fh,filterState);});
        }
      });

      /* chart draws on first expand via expand-toggle handler above */
    });
  }

  function drawFirmChart(firmIdx,fh,filterState){
    var ctx=document.getElementById('fc-'+firmIdx);
    if(!ctx||window['fc'+firmIdx+'Chart'])return;
    var show=filterState.f==='etf'?fh.filter(h=>isETF(h.name)):filterState.f==='stock'?fh.filter(h=>!isETF(h.name)):fh;
    show=show.slice(0,10);
    window['fc'+firmIdx+'Chart']=new Chart(ctx.getContext('2d'),{
      type:'doughnut',
      data:{labels:show.map(h=>h.ticker),datasets:[{data:show.map(h=>h.value/1000000),backgroundColor:show.map(h=>holdingColor(h.pct)),borderWidth:1}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return'$'+c.parsed.toFixed(1)+'M';}}}}}
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',loadData);
  }else{
    loadData();
  }

  })(); /* end IIFE */
  
