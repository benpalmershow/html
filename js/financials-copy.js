(function() {
  const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const categoriesEl = document.getElementById('categories');
  const filterBar = document.getElementById('filterBar');
  const lastUpdatedEl = document.getElementById('lastUpdated');
  let currentFilter = 'latest';
  let allData = null;

  function isValidData(value) {
    return value && value !== '' && !String(value).startsWith('TBD');
  }

  function formatChangeIndicator(percentChange) {
    if (percentChange === null || percentChange === undefined) {
      return { formatted: '—', cssClass: 'change-neutral' };
    }
    const formatted = typeof percentChange === 'number'
      ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`
      : percentChange;
    const isNeutral = formatted === '—' || formatted === '0' || formatted === '0.00' || formatted === '+0.00%';
    const cssClass = isNeutral ? 'change-neutral' : formatted.startsWith('+') ? 'change-positive' : 'change-negative';
    return { formatted, cssClass };
  }

  function calculateMoMChange(indicator) {
    const yearKeys = Object.keys(indicator).filter(k => /^\d{4}$/.test(k)).map(Number).sort((a,b) => b - a);
    let latest = null, previous = null;
    for (const yr of yearKeys) {
      for (let i = MONTHS.length - 1; i >= 0; i--) {
        if (isValidData(indicator[yr][MONTHS[i]])) {
          if (latest === null) latest = indicator[yr][MONTHS[i]];
          else if (previous === null) { previous = indicator[yr][MONTHS[i]]; break; }
        }
      }
      if (previous !== null) break;
    }
    if (latest === null) {
      for (let i = MONTHS.length - 1; i >= 0; i--) {
        if (isValidData(indicator[MONTHS[i]])) {
          if (latest === null) latest = indicator[MONTHS[i]];
          else if (previous === null) { previous = indicator[MONTHS[i]]; break; }
        }
      }
    }
    if (!latest || !previous) return null;
    const curr = parseFloat(latest.toString().replace(/[$,+A-Za-z]/g, '').replace(/,/g, ''));
    const prev = parseFloat(previous.toString().replace(/[$,+A-Za-z]/g, '').replace(/,/g, ''));
    if (isNaN(curr) || isNaN(prev) || prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }

  function detectIndicatorType(indicator) {
    if (indicator.category === 'Prediction Markets') return 'prediction';
    if (indicator.name && indicator.name.includes('Hormuz')) return 'hormuz';
    if (indicator.meeting_date) return 'fomc';
    return 'standard';
  }

  function countAvailableMonths(indicator) {
    const yearKeys = Object.keys(indicator).filter(k => /^\d{4}$/.test(k));
    let count = 0;
    if (yearKeys.length > 0) {
      count = yearKeys.reduce((acc, yr) => acc + Object.keys(indicator[yr] || {}).filter(k => MONTHS.includes(k) && isValidData(indicator[yr][k])).length, 0);
    }
    count += Object.keys(indicator).filter(k => MONTHS.includes(k) && isValidData(indicator[k])).length;
    return count;
  }

  function getStandardIndicatorData(indicator) {
    const yearKeys = Object.keys(indicator).filter(k => /^\d{4}$/.test(k)).map(Number).sort((a,b) => b - a);
    const available = [];
    MONTHS.forEach((month, idx) => {
      let value = null, year = null;
      for (const yr of yearKeys) {
        if (indicator[yr] && indicator[yr][month] !== undefined && isValidData(indicator[yr][month])) {
          value = indicator[yr][month]; year = yr; break;
        }
      }
      if (value === null && indicator[month] !== undefined && isValidData(indicator[month])) {
        value = indicator[month]; year = null;
      }
      if (value !== null) available.push({ month, label: MONTH_LABELS[idx], value, index: idx, year });
    });
    available.sort((a, b) => {
      const getYear = (item) => item.year !== null ? item.year : 2025;
      const yearA = getYear(a);
      const yearB = getYear(b);
      if (yearA !== yearB) return yearA - yearB;
      return a.index - b.index;
    });
    if (available.length === 0) return { visibleHtml: '<div class="data-row"><span class="month-label">No data</span></div>', historyHtml: '' };
    const visible = available.slice(-2);
    const history = available.slice(0, -2);
    const visibleHtml = visible.map(row => 
      `<div class="latest-data-row"><span class="month-label">${row.label}</span><span class="month-value">${row.value}</span></div>`
    ).join('');
    const historyHtml = history.map(row => 
      `<div class="data-row"><span class="month-label">${row.label}</span><span class="month-value">${row.value}</span></div>`
    ).join('');
    return { visibleHtml, historyHtml };
  }

  function renderStandardIndicator(indicator) {
    const { visibleHtml } = getStandardIndicatorData(indicator);
    return visibleHtml;
  }

  function renderPredictionIndicator(indicator) {
    const keys = Object.keys(indicator).filter(k => !['name','category','agency','source','explanation','lastUpdated','url','color','releaseDay','change_label','portwatch_url','kalshi_url','polymarket_url','meeting_date','probabilities','rate_hold_odds','rate_cut_odds','rate_hike_odds'].includes(k) && !/^\d{4}$/.test(k));
    const values = keys.slice(-3).reverse().map(k => {
      const val = indicator[k];
      if (typeof val === 'object' && val !== null) {
        const yes = parseFloat(val.yes || val.probability || 0);
        const no = parseFloat(val.no || 0);
        return `<div class="data-row"><span class="month-label">${k}</span><span class="month-value">${yes}% / ${no}%</span></div>`;
      }
      return `<div class="data-row"><span class="month-label">${k}</span><span class="month-value">${val}</span></div>`;
    }).join('');
    return values || '<div class="data-row"><span class="month-label">No data</span></div>';
  }

  function renderFOMCIndicator(indicator) {
    if (indicator.rate_hold_odds && indicator.rate_cut_odds && indicator.rate_hike_odds) {
      return `<div class="data-row"><span class="month-label">Hold</span><span class="month-value" style="color:#3b82f6">${indicator.rate_hold_odds}</span></div>
              <div class="data-row"><span class="month-label">Hike</span><span class="month-value" style="color:#f59e0b">${indicator.rate_hike_odds}</span></div>
              <div class="data-row"><span class="month-label">Cut</span><span class="month-value" style="color:#ef4444">${indicator.rate_cut_odds}</span></div>`;
    }
    return renderStandardIndicator(indicator);
  }

  function renderCardData(indicator) {
    const type = detectIndicatorType(indicator);
    switch(type) {
      case 'prediction': return renderPredictionIndicator(indicator);
      case 'fomc': return renderFOMCIndicator(indicator);
      default: return renderStandardIndicator(indicator);
    }
  }

  function getCardHistory(indicator) {
    const type = detectIndicatorType(indicator);
    if (type === 'standard') {
      const { historyHtml } = getStandardIndicatorData(indicator);
      return historyHtml;
    }
    if (type === 'fomc' && indicator.rate_hold_odds && indicator.rate_cut_odds && indicator.rate_hike_odds) {
      return '';
    }
    if (type === 'prediction') {
      const keys = Object.keys(indicator).filter(k => !['name','category','agency','source','explanation','lastUpdated','url','color','releaseDay','change_label','portwatch_url','kalshi_url','polymarket_url','meeting_date','probabilities','rate_hold_odds','rate_cut_odds','rate_hike_odds'].includes(k) && !/^\d{4}$/.test(k));
      const history = keys.slice(0, -3).reverse().map(k => {
        const val = indicator[k];
        if (typeof val === 'object' && val !== null) {
          const yes = parseFloat(val.yes || val.probability || 0);
          const no = parseFloat(val.no || 0);
          return `<div class="data-row"><span class="month-label">${k}</span><span class="month-value">${yes}% / ${no}%</span></div>`;
        }
        return `<div class="data-row"><span class="month-label">${k}</span><span class="month-value">${val}</span></div>`;
      }).join('');
      return history;
    }
    return '';
  }

  function createCard(indicator) {
    const momChange = calculateMoMChange(indicator);
    const momInfo = formatChangeIndicator(momChange);
    const agency = indicator.agency || '';
    const url = indicator.url || '#';
    const dateStr = indicator.lastUpdated ? new Date(indicator.lastUpdated).toLocaleDateString('en-US', {month:'numeric', day:'numeric'}) : '';
    const isNew = indicator.lastUpdated && (Date.now() - new Date(indicator.lastUpdated).getTime()) < (3 * 24 * 60 * 60 * 1000);
    const monthCount = countAvailableMonths(indicator);
    const hasHistory = indicator.daily && Object.keys(indicator.daily).length > 1 || 
        indicator.probabilities && Object.keys(indicator.probabilities).length > 1 ||
        indicator.monthly_history && indicator.monthly_history.length > 1 ||
        monthCount > 2;
    const historyHtml = hasHistory ? getCardHistory(indicator) : '';
    const expandBtn = hasHistory ? `<button class="expand-toggle" aria-label="Toggle history" style="width:24px;height:24px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg></button>` : '';
    return `<div class="indicator" data-name="${indicator.name.replace(/"/g, '&quot;')}">
      <div class="indicator-header" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="indicator-name">${indicator.name}${isNew ? ' <span style="font-size:0.6rem;background:var(--logo-orange);color:#fff;padding:1px 5px;border-radius:3px;font-weight:700;vertical-align:middle;">NEW</span>' : ''}</div>
        ${expandBtn}
      </div>
      <div class="indicator-agency">Source: <a href="${url}" target="_blank" rel="noopener">${agency}</a>${dateStr ? ' | ' + dateStr : ''}</div>
      ${momChange !== null ? `<div class="change-indicators"><span class="change-metric-btn ${momInfo.cssClass}">${momInfo.formatted}</span></div>` : ''}
      <div class="indicator-content" ${historyHtml ? `data-history="${encodeURIComponent(historyHtml)}"` : ''}>${renderCardData(indicator)}<div class="data-rows-container"></div></div>
    </div>`;
  }

  function renderCategories(filter) {
    if (!allData) return;
    const indices = allData.indices || [];
    let cats = [...new Set(indices.map(i => i.category))];
    cats.sort();

    let html = '';
    if (filter === 'latest') {
      const sorted = [...indices].sort((a, b) => {
        const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        if (da && db) return db - da;
        return 0;
      });
      html += `<div class="category" data-category="latest">
        <h2 class="category-title">Latest Updates</h2>
        <div class="indicators-grid">${sorted.map(createCard).join('')}</div>
      </div>`;
    } else {
      cats.forEach((cat, catIndex) => {
        const items = indices.filter(i => i.category === cat);
        html += `<div class="category" data-category="${cat}">
          <h2 class="category-title">${cat}</h2>
          <div class="indicators-grid">${items.map(createCard).join('')}</div>
        </div>`;
      });
    }
    categoriesEl.innerHTML = html;
    setupExpandHandlers();
  }

  function setupExpandHandlers(root = document) {
    root.querySelectorAll('.expand-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = btn.closest('.indicator');
        const content = card.querySelector('.indicator-content');
        const rows = card.querySelector('.data-rows-container');
        const isExpanded = card.classList.contains('expanded');
        card.classList.toggle('expanded', !isExpanded);
        if (content && content.dataset.history && !content.dataset.loaded) {
          if (rows) rows.innerHTML = decodeURIComponent(content.dataset.history);
          content.dataset.loaded = '1';
        }
        if (rows) {
          rows.style.maxHeight = isExpanded ? '0' : '1200px';
        }
      });
    });
  }

  function setupFilters() {
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      currentFilter = btn.dataset.filter;
      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCategories(currentFilter);
    });
  }

  async function loadData() {
    try {
      const inline = document.getElementById('initial-data');
      if (inline && !allData) {
        allData = JSON.parse(inline.textContent);
        lastUpdatedEl.textContent = 'Last Updated: ' + new Date(allData.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        renderCategories('latest');
      }
      const res = await fetch('json/financials-data.json?_=' + Date.now(), { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      allData = await res.json();
      lastUpdatedEl.textContent = 'Last Updated: ' + new Date(allData.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      if (currentFilter === 'latest') {
        const grid = document.querySelector('.category[data-category="latest"] .indicators-grid');
        if (grid) {
          const sorted = [...allData.indices].sort((a, b) => {
            const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
            const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
            if (da && db) return db - da;
            return 0;
          });
          const existing = new Set(Array.from(grid.querySelectorAll('.indicator')).map(el => el.dataset.name));
          const missing = sorted.filter(i => !existing.has(i.name));
          if (missing.length) {
            setTimeout(() => {
              const html = missing.map(createCard).join('');
              grid.insertAdjacentHTML('beforeend', html);
              setupExpandHandlers(grid);
            }, 50);
          }
        }
      } else {
        renderCategories(currentFilter);
      }
      load13F();
    } catch (err) {
      if (!allData) categoriesEl.innerHTML = '<div class="error">Failed to load data.</div>';
    }
  }

  async function load13F() {
    fetch('json/13f-holdings.json?_=' + Date.now(), { headers: { 'Accept': 'application/json' } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { window.holdingsData = data; get13FHtml(); })
      .catch(() => {});
  }

  function get13FHtml() {
    const firms = window.holdingsData?.firms || [];
    if (firms.length === 0) return '';
    const html = `<div class="category" data-category="13F Holdings" style="margin-top: 2rem;">
      <h2 class="category-title">13F Holdings</h2>
      <div class="indicators-grid" style="min-height: 280px;">
        ${firms.slice(0, 4).map(firm => `<div class="indicator">
          <div class="indicator-name">${firm.shortName || firm.name.split(' ')[0]}</div>
          <div class="indicator-agency">Filing: ${firm.filingDate || ''}</div>
        </div>`).join('')}
      </div>
    </div>`;
    const container = document.getElementById('categories');
    const existing = document.getElementById('latest-13f-filings');
    if (!existing) container.insertAdjacentHTML('beforeend', html);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { setupFilters(); loadData(); });
  } else {
    setupFilters();
    loadData();
  }
})();
