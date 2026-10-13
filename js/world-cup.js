// World Cup Score Card - Fetch and render live match data

async function loadWorldCupMatches() {
  try {
    const response = await fetch('json/world-cup.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    renderMatchCards(data.matches);
  } catch (error) {
    console.error('Failed to load World Cup data:', error);
  }
}

function renderMatchCards(matches) {
  const grid = document.getElementById('worldCupGrid');
  if (!grid) {
    return;
  }

  // Clear existing cards
  grid.innerHTML = '';

  // Create card for each match (latest first)
  matches.slice().sort((a, b) => {
    const dateA = new Date(a.utcDate || a.date);
    const dateB = new Date(b.utcDate || b.date);
    return dateB - dateA;
  }).forEach(match => {
    const card = createMatchCard(match);
    grid.appendChild(card);
  });

  // Initialize Lucide icons for the new cards
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function createMatchCard(match) {
  const card = document.createElement('div');
  card.className = 'indicator';
  card.id = `match-${match.id}`;
  const groupDisplay = match.group ? match.group.replace('GROUP_', 'Group ') : '';
  const teamAName = HtmlUtils.escapeHtml(match.teamA.name || 'TBD');
  const teamBName = HtmlUtils.escapeHtml(match.teamB.name || 'TBD');
  const groupDisplayEscaped = HtmlUtils.escapeHtml(groupDisplay);
  const searchLabel = HtmlUtils.escapeHtml([match.teamA.name, match.teamB.name, groupDisplay].filter(Boolean).join(' '));
  card.setAttribute('data-indicator-name', searchLabel);

  let scoreDisplay = `${(match.teamA.score ?? '')} - ${(match.teamB.score ?? '')}`;

  const extraInfo = [];
  if (match.date) extraInfo.push(`Date: ${match.date}`);
  if (match.matchDay) extraInfo.push(`Matchday: ${match.matchDay}`);
  if (match.venue) extraInfo.push(`Venue: ${HtmlUtils.escapeHtml(match.venue)}`);
  if (match.referees && match.referees.length > 0) extraInfo.push(`Referee: ${match.referees.map(r => HtmlUtils.escapeHtml(r)).join(', ')}`);
  if (match.winner) {
    const winnerName = match.winner === 'HOME_TEAM' ? match.teamA.name : match.winner === 'AWAY_TEAM' ? match.teamB.name : 'Draw';
    extraInfo.push(`Winner: ${HtmlUtils.escapeHtml(winnerName)}`);
  }
  if (match.teamA.halfTimeScore !== null || match.teamB.halfTimeScore !== null) {
    extraInfo.push(`HT: ${match.teamA.halfTimeScore ?? '-'} - ${match.teamB.halfTimeScore ?? '-'}`);
  }
  if (match.source && match.url) {
    const safeSource = HtmlUtils.escapeHtml(match.source);
    const isValidUrl = typeof match.url === 'string' && (match.url.startsWith('https://') || match.url.startsWith('http://'));
    if (isValidUrl) {
      extraInfo.push(`Source: <a href="${HtmlUtils.escapeHtml(match.url)}" target="_blank" rel="noopener noreferrer">${safeSource}</a>`);
    } else {
      extraInfo.push(`Source: ${safeSource}`);
    }
  } else if (match.source) {
    extraInfo.push(`Source: ${HtmlUtils.escapeHtml(match.source)}`);
  }

  const infoBtn = `<button class="info-btn" title="Match details" aria-label="Show match details"><i data-lucide="info" class="info-icon"></i></button>`;
  const detailsHtml = extraInfo.length > 0 ? `<div class="explanation-text" style="display:none;margin-top:6px;padding:6px;background:var(--bg-secondary);border-radius:4px;font-size:0.75rem;color:var(--text-secondary);">${extraInfo.map(info => `<div style="padding:1px 0;">${info}</div>`).join('')}</div>` : '';

  // Validate crest URLs: only allow https:// to prevent XSS via src
  const hasCrestA = match.teamA.crest && typeof match.teamA.crest === 'string' && match.teamA.crest.startsWith('https://');
  const hasCrestB = match.teamB.crest && typeof match.teamB.crest === 'string' && match.teamB.crest.startsWith('https://');
  
  card.innerHTML = `
       <div class="indicator-header">
         <div class="indicator-name">
           ${groupDisplayEscaped}
         </div>
         ${infoBtn}
       </div>
       <div class="indicator-content">
         <div class="match-score-display">
           <div class="match-team">
             ${hasCrestA ? `<img src="${HtmlUtils.escapeHtml(match.teamA.crest)}" alt="${teamAName}" class="team-crest" width="20" height="20" onerror="this.style.display='none'; this.parentNode.querySelector('.team-flag').style.display='inline-flex'">` : ''}
             <span class="team-flag" style="${hasCrestA ? 'display:none;' : ''}" aria-label="${teamAName} flag placeholder">
               <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h12l-1.2 3.5L16 12.5H4z"></path><path d="M4 5.5v13"></path><path d="M4 18.5h12"></path></svg>
             </span>
             <span class="team-name">${teamAName}</span>
           </div>
           <div class="match-score">${scoreDisplay}</div>
           <div class="match-team">
             ${hasCrestB ? `<img src="${HtmlUtils.escapeHtml(match.teamB.crest)}" alt="${teamBName}" class="team-crest" width="20" height="20" onerror="this.style.display='none'; this.parentNode.querySelector('.team-flag').style.display='inline-flex'">` : ''}
             <span class="team-flag" style="${hasCrestB ? 'display:none;' : ''}" aria-label="${teamBName} flag placeholder">
               <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h12l-1.2 3.5L16 12.5H4z"></path><path d="M4 5.5v13"></path><path d="M4 18.5h12"></path></svg>
             </span>
             <span class="team-name">${teamBName}</span>
           </div>
         </div>
         ${detailsHtml}
       </div>
     `;

  // Attach click handler to toggle explanation
  card.querySelector('.info-btn').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const expDiv = card.querySelector('.explanation-text');
    const isVisible = expDiv.style.display === 'block';
    document.querySelectorAll('#worldCupGrid .explanation-text').forEach(div => div.style.display = 'none');
    document.querySelectorAll('#worldCupGrid .info-btn').forEach(b => b.classList.remove('active'));
    if (!isVisible) {
      expDiv.style.display = 'block';
      this.classList.add('active');
    }
  });

  return card;
}

// Load match data when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadWorldCupMatches);
} else {
  loadWorldCupMatches();
}

// Auto-refresh every 30 seconds, but only when World Cup section is active
setInterval(() => {
    if (typeof currentCategory !== 'undefined' && currentCategory === 'World Cup') {
        loadWorldCupMatches();
    }
}, 30000);