// Elections - 2026 Senate Race Data
// Renders key Senate races from json/fec-data.json as indicator cards

let fecDataLoaded = false;

async function loadFECData() {
    const container = document.getElementById('fecCardsContainer');
    if (!container) return;

    try {
        const data = await Services.dataService.fetchJSON('json/fec-data.json', { bustCache: true });
        initializeFECCards(data, container);
    } catch (err) {
        console.error('Could not load FEC data:', err);
        if (container) {
            container.innerHTML = `<div class="error-state">Failed to load election data.</div>`;
        }
    }
}

/* =========================================
   Formatting helpers
   ========================================= */

function fmtMoney(n) {
    if (n == null) return '—';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n).toLocaleString();
}

const STATE_NAMES = {
  GA:'Georgia',TX:'Texas',OH:'Ohio',NC:'North Carolina',KS:'Kansas',ME:'Maine',MI:'Michigan',IA:'Iowa',NH:'New Hampshire',AK:'Alaska',MS:'Mississippi'
};

function stateName(code){ return STATE_NAMES[code] || code; }

function getFECPartyColor(party) {
    if (party === 'DEM') return 'var(--fec-dem, #2563EB)';
    if (party === 'REP') return 'var(--fec-rep, #DC2626)';
    return 'var(--text-muted)';
}

function getFECPartyLabel(party) {
    if (party === 'DEM') return 'D';
    if (party === 'REP') return 'R';
    return party;
}

/* =========================================
   Lean badge
   ========================================= */

function createKalshiBar(race) {
    const kalshi = race.kalshi;
    if (!kalshi) return '';
    const rProb = kalshi.r || 0;
    const dProb = kalshi.d || 0;
    const kalshiUrl = race.kalshi_url || '#';
    return `
        <a href="${kalshiUrl}" target="_blank" rel="noopener noreferrer" class="kalshi-bar-link">
            <div class="kalshi-bar-container">
                <span class="kalshi-label">Kalshi:</span>
                <div class="kalshi-bar-track">
                    <div class="kalshi-bar-fill kalshi-bar-r" style="width: ${rProb}%;" title="Republican ${rProb}%"></div>
                    <div class="kalshi-bar-fill kalshi-bar-d" style="width: ${dProb}%;" title="Democratic ${dProb}%"></div>
                </div>
                <span class="kalshi-value r" style="color: var(--fec-rep);">R ${rProb}%</span>
                <span class="kalshi-value d" style="color: var(--fec-dem);">D ${dProb}%</span>
            </div>
        </a>
    `;
}

function formatFECUpdatedDate(value) {
    if (!value) return '';
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(raw + 'T00:00:00') : new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    const iso = date.toISOString();
    const diff = (Date.now() - date.getTime()) / 1000;
    let ago = 'just now';
    if (diff >= 31536000) ago = Math.floor(diff / 31536000) + 'y ago';
    else if (diff >= 2592000) ago = Math.floor(diff / 2592000) + 'mo ago';
    else if (diff >= 604800) ago = Math.floor(diff / 604800) + 'w ago';
    else if (diff >= 86400) ago = Math.floor(diff / 86400) + 'd ago';
    else if (diff >= 3600) ago = Math.floor(diff / 3600) + 'h ago';
    else if (diff >= 60) ago = Math.floor(diff / 60) + 'm ago';
    return `<time class="indicator-date" datetime="${iso}" title="${iso}">${ago}</time>`;
}

/* =========================================
   Card HTML
   ========================================= */

function createFECCardHTML(race) {
    const kalshi = race.kalshi || {};
    const leadingParty = kalshi.r > kalshi.d ? 'REP' : kalshi.d > kalshi.r ? 'DEM' : null;

    const candidateRows = (race.candidates || []).map(c => {
        const partyColor = getFECPartyColor(c.party);
        const partyLabel = getFECPartyLabel(c.party);
        const incumbentMark = c.incumbent
            ? `<span class="fec-incumbent" title="Incumbent">&#9654;</span>`
            : '';
        const winnerMark = leadingParty && c.party === leadingParty
            ? `<span class="fec-winner" title="Leading" aria-label="Leading">&#10003;</span>`
            : '';
        const fecLink = c.source_url
            ? `<a href="${c.source_url}" target="_blank" rel="noopener noreferrer" class="fec-source-link" title="FEC filing">${c.name}</a>`
            : `<span>${c.name}</span>`;

        const raised = c.receipts != null
            ? `<span class="fec-raised" title="Total raised">${fmtMoney(c.receipts)}</span>`
            : '';

        return `
            <div class="data-row fec-candidate-row">
                <span class="month-label fec-candidate-name"><span class="fec-party-chip" style="background:${partyColor};">${partyLabel}</span>${fecLink}${incumbentMark}${winnerMark}</span>
                <span class="month-value">${raised}</span>
            </div>`;
    }).join('');

    const latestFetch = (race.candidates || [])
        .map(c => c.fetchedAt ? new Date(c.fetchedAt) : null)
        .filter(Boolean)
        .sort((a, b) => b - a)[0];
    const updatedHtml = latestFetch ? `Updated ${formatFECUpdatedDate(latestFetch.toISOString())}` : '';

    const note = race.note ? `<p style="margin:0 0 6px;">${race.note}</p>` : '';

    const kalshiBar = createKalshiBar(race);

    const candidateLinks = (race.candidates || []).map(c => {
        const coh = c.cash_on_hand_end_period != null
            ? fmtMoney(parseFloat(c.cash_on_hand_end_period))
            : null;
        const coverageDate = c.coverage_end_date
            ? c.coverage_end_date.slice(0, 7)
            : null;
        const cohLabel = coh && coverageDate
            ? `CoH ${coh} (${coverageDate})`
            : coh ? `CoH ${coh}` : '';
        const link = c.source_url
            ? `<a href="${c.source_url}" target="_blank" rel="noopener noreferrer">${c.name}</a>`
            : `<span>${c.name}</span>`;
        return `<div class="fec-explain-row">
            <span class="fec-explain-name">${link}</span>
            ${cohLabel ? `<span class="fec-explain-coh">${cohLabel}</span>` : ''}
        </div>`;
    }).join('');

    const hasLeadingCandidate = leadingParty && (race.candidates || []).some(c => c.party === leadingParty);
    const leadingMark = leadingParty && !hasLeadingCandidate
        ? `<span class="fec-winner fec-winner-header" title="${leadingParty === 'DEM' ? 'Democrat' : 'Republican'} leading" aria-label="${leadingParty === 'DEM' ? 'Democrat' : 'Republican'} leading">&#10003;</span>`
        : '';

    return `
        <div class="indicator-header">
            <div class="indicator-name" title="${stateName(race.state)} Senate">${stateName(race.state)}<span class="week-badge fec-senate-badge" title="U.S. Senate race">Senate</span>${leadingMark}</div>
            <div class="indicator-actions">
                <button class="expand-toggle" aria-label="Toggle race details">
                    <i data-lucide="chevron-down"></i>
                </button>
            </div>
        </div>
        ${updatedHtml ? `<div class="indicator-agency">${updatedHtml}</div>` : ''}
        <div class="indicator-content">
            ${candidateRows ? `<div class="data-rows-container fec-data-visible">${candidateRows}</div>` : ''}
        </div>
        <div class="indicator-explanation">
            <div class="indicator-explanation-header">Race details</div>
            <div class="indicator-explanation-body">
                ${note}
                ${candidateLinks}
                ${kalshiBar}
                ${race.video_url ? `<a href="${race.video_url}" target="_blank" rel="noopener noreferrer" class="fec-source-link" style="display:inline-block;margin-top:6px;">Video</a>` : ''}
            </div>
        </div>`;
}

/* =========================================
   Init
   ========================================= */

function initializeFECCards(data, container) {
    container.innerHTML = '';

    if (!data.races || data.races.length === 0) {
        container.innerHTML = `<div class="loading-state">No races available.</div>`;
        return;
    }

    data.races.forEach(race => {
        const card = document.createElement('div');
        card.className = 'indicator';
        const kalshi = race.kalshi || {};
        const r = kalshi.r || 0;
        const d = kalshi.d || 0;
        if (r > d) card.classList.add('fec-card-r');
        else if (d > r) card.classList.add('fec-card-d');
        card.setAttribute('data-indicator-name', race.label);
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', race.label);
        card.innerHTML = createFECCardHTML(race);
        container.appendChild(card);
    });

    // Show data date inside the section header, never touching the main #lastUpdated element
    if (data.lastUpdated) {
        const titleEl = document.querySelector('#fec-campaign .category-name');
        if (titleEl) {
            const d = new Date(data.lastUpdated);
            const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            titleEl.innerHTML = `Elections <span class="fec-data-date">as of ${formatted}</span>`;
        }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', function () {
    // Loaded lazily via ensureLoadFEC() in financials.js;
    // this listener is a fallback for standalone usage.
    if (typeof ensureLoadFEC === 'function') return;
    loadFECData();
});
