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
  matches.slice().reverse().forEach(match => {
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
  const searchLabel = [match.teamA.name, match.teamB.name, groupDisplay].filter(Boolean).join(' ');
  card.setAttribute('data-indicator-name', searchLabel);

  let scoreDisplay = `${(match.teamA.score ?? '')} - ${(match.teamB.score ?? '')}`;

  const extraInfo = [];
  if (match.date) extraInfo.push(`Date: ${match.date}`);
  if (match.matchDay) extraInfo.push(`Matchday: ${match.matchDay}`);
  if (match.venue) extraInfo.push(`Venue: ${match.venue}`);
  if (match.referees && match.referees.length > 0) extraInfo.push(`Referee: ${match.referees.join(', ')}`);
  if (match.winner) {
    const winnerName = match.winner === 'HOME_TEAM' ? match.teamA.name : match.winner === 'AWAY_TEAM' ? match.teamB.name : 'Draw';
    extraInfo.push(`Winner: ${winnerName}`);
  }
  if (match.teamA.halfTimeScore !== null || match.teamB.halfTimeScore !== null) {
    extraInfo.push(`HT: ${match.teamA.halfTimeScore ?? '-'} - ${match.teamB.halfTimeScore ?? '-'}`);
  }
  if (match.source && match.url) {
    extraInfo.push(`Source: <a href="${match.url}" target="_blank" rel="noopener noreferrer">${match.source}</a>`);
  } else if (match.source) {
    extraInfo.push(`Source: ${match.source}`);
  }

  const infoBtn = `<button class="info-btn" title="Match details" aria-label="Show match details"><i data-lucide="info" class="info-icon"></i></button>`;
  const detailsHtml = extraInfo.length > 0 ? `<div class="explanation-text" style="display:none;margin-top:6px;padding:6px;background:var(--bg-secondary);border-radius:4px;font-size:0.75rem;color:var(--text-secondary);">${extraInfo.map(info => `<div style="padding:1px 0;">${info}</div>`).join('')}</div>` : '';

const hasCrestA = match.teamA.crest;
  const hasCrestB = match.teamB.crest;
  
  card.innerHTML = `
       <div class="indicator-header">
         <div class="indicator-name">
           ${groupDisplay}
         </div>
         ${infoBtn}
       </div>
       <div class="indicator-content">
         <div class="match-score-display">
           <div class="match-team">
             ${hasCrestA ? `<img src="${match.teamA.crest}" alt="${match.teamA.name}" class="team-crest" width="20" height="20" onerror="this.style.display='none'; this.parentNode.querySelector('.team-flag').style.display='inline-block'">` : ''}
             <span class="team-flag" style="${hasCrestA ? 'display:none;' : ''}">${match.teamA.flag || '🏳️'}</span>
             <span class="team-name">${match.teamA.name || 'TBD'}</span>
           </div>
           <div class="match-score">${scoreDisplay}</div>
           <div class="match-team">
             ${hasCrestB ? `<img src="${match.teamB.crest}" alt="${match.teamB.name}" class="team-crest" width="20" height="20" onerror="this.style.display='none'; this.parentNode.querySelector('.team-flag').style.display='inline-block'">` : ''}
             <span class="team-flag" style="${hasCrestB ? 'display:none;' : ''}">${match.teamB.flag || '🏳️'}</span>
             <span class="team-name">${match.teamB.name || 'TBD'}</span>
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