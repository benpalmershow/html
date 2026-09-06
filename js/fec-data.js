// FEC Campaign Finance - 2026 Senate Race Data
// Renders key Senate races from json/fec-data.json as indicator cards

let fecDataLoaded = false;

async function loadFECData() {
    const container = document.getElementById('fecCardsContainer');
    if (!container) return;

    try {
        const data = await Services.dataService.fetchJSON('json/fec-data.json');
        initializeFECCards(data, container);
    } catch (err) {
        console.error('Could not load FEC data:', err);
        if (container) {
            container.innerHTML = `<div class="error-state">Failed to load campaign finance data.</div>`;
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

/* =========================================
   Party helpers
   ========================================= */

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

function getLeanInfo(note) {
    const lower = (note || '').toLowerCase();
    if (lower.startsWith('toss-up')) return { label: 'Toss-up', cls: 'fec-lean-tossup' };
    if (lower.startsWith('lean r'))  return { label: 'Lean R',  cls: 'fec-lean-r' };
    if (lower.startsWith('lean d'))  return { label: 'Lean D',  cls: 'fec-lean-d' };
    if (lower.startsWith('safe r'))  return { label: 'Safe R',  cls: 'fec-lean-r' };
    if (lower.startsWith('safe d'))  return { label: 'Safe D',  cls: 'fec-lean-d' };
    return { label: '', cls: '' };
}

/* =========================================
   Card HTML
   ========================================= */

function createFECCardHTML(race) {
    const lean = getLeanInfo(race.note);

    const leanBadge = lean.label
        ? `<span class="fec-lean-badge ${lean.cls}">${lean.label}</span>`
        : '';

    const candidateRows = (race.candidates || []).map(c => {
        const partyColor = getFECPartyColor(c.party);
        const partyLabel = getFECPartyLabel(c.party);
        const incumbentMark = c.incumbent
            ? `<span class="fec-incumbent" title="Incumbent">&#9654;</span>`
            : '';
        const fecLink = c.source_url
            ? `<a href="${c.source_url}" target="_blank" rel="noopener noreferrer" class="fec-source-link" title="FEC filing">${c.name}</a>`
            : `<span>${c.name}</span>`;

        const raised = c.receipts != null
            ? `<span class="fec-raised" title="Total raised">${fmtMoney(c.receipts)}</span>`
            : '';

        return `
            <div class="fec-candidate-row">
                <span class="fec-party-chip" style="background:${partyColor};">${partyLabel}</span>
                <span class="fec-candidate-name">${fecLink}${incumbentMark}</span>
                ${raised}
            </div>`;
    }).join('');

    const note = race.note
        ? `<div class="fec-race-note">${race.note}</div>`
        : '';

    const candidateLinks = (race.candidates || []).map(c => {
        if (!c.source_url) return '';
        return `<div><a href="${c.source_url}" target="_blank" rel="noopener noreferrer">${c.name} (FEC)</a></div>`;
    }).join('');

    const cycleInfo = race.cycle ? `<div><strong>Cycle:</strong> ${race.cycle || '2026'}</div>` : '';

    return `
        <div class="indicator-header">
            <div class="fec-race-title">
                <span class="fec-state-label">${race.state}</span>
                <span class="fec-race-label">${race.label}</span>
            </div>
            <div class="indicator-actions">
                ${leanBadge}
                <button class="info-btn" title="Race details" aria-label="Show race details">
                    <i data-lucide="info" style="width:16px;height:16px;"></i>
                </button>
            </div>
        </div>
        <div class="indicator-explanation">
            <div class="indicator-explanation-header">Race details</div>
            <div class="indicator-explanation-body">
                ${note ? `<p style="margin:0 0 6px;">${race.note}</p>` : ''}
                ${candidateLinks}
            </div>
        </div>
        <div class="indicator-content">
            <div class="fec-candidates">
                ${candidateRows}
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
        card.setAttribute('data-indicator-name', race.label);
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', race.label);
        card.innerHTML = createFECCardHTML(race);
        container.appendChild(card);
    });

    // Update last-updated timestamp if present
    if (data.lastUpdated) {
        const el = document.getElementById('lastUpdated');
        if (el) {
            const d = new Date(data.lastUpdated);
            const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            // Only update if the FEC filter is currently active to avoid clobbering the main timestamp
            const cats = document.getElementById('categories');
            if (cats && cats.dataset.filter === 'FEC Campaign Finance') {
                el.textContent = `FEC data as of ${formatted}`;
            }
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
