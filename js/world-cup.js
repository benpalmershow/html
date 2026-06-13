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

  // Create card for each match
  matches.forEach(match => {
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

  const statusText = match.status ? match.status.toUpperCase() : 'MATCH';
  const url = match.url || '#';
  const explanation = match.explanation || '';
  const source = match.source || 'FIFA';

  const stageLabels = {
    GROUP_STAGE: 'Group Phase',
    LAST_32: 'Round of 32',
    LAST_16: 'Round of 16',
    QUARTER_FINAL: 'Quarter Final',
    SEMI_FINAL: 'Semi Final',
    FINAL: 'Final'
  };

  card.innerHTML = `
    <div class="indicator-header">
      <div class="indicator-name">
        ${stageLabels[match.stage] || match.stage}
        ${match.status === 'live' ? `<span class="new-badge live">${statusText}</span>` : ''}
      </div>
      <div class="indicator-actions">
        ${explanation ? `<button class="info-btn" title="Show explanation" data-explanation="${explanation.replace(/"/g, '&quot;')}"><i data-lucide="info" class="info-icon"></i></button>` : ''}
      </div>
    </div>
    <div class="indicator-agency">Source: <a href="${url}" target="_blank" rel="noopener noreferrer">${source}</a></div>
    <div class="indicator-content">
      <div class="match-score-display">
        <div class="match-team">
          <span class="team-flag">${match.teamA.flag || '🏳️'}</span>
          <span class="team-name">${match.teamA.name || 'TBD'}</span>
        </div>
        <div class="match-score">${(match.teamA.score ?? '')} - ${(match.teamB.score ?? '')}</div>
        <div class="match-team">
          <span class="team-flag">${match.teamB.flag || '🏳️'}</span>
          <span class="team-name">${match.teamB.name || 'TBD'}</span>
        </div>
      </div>
      <div class="match-meta">
        <span class="match-time">${match.time}</span>
        <span class="match-venue">${match.venue}</span>
      </div>
    </div>
  `;

  return card;
}

// Load match data when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadWorldCupMatches);
} else {
  loadWorldCupMatches();
}

// Auto-refresh every 30 seconds for live matches
setInterval(loadWorldCupMatches, 30000);
