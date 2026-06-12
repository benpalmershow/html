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

  // Sort matches: finished first, then live, then upcoming
  // Within each status: sort by stage order, then by id descending
  const stageOrder = { GROUP_STAGE: 0, LAST_32: 1, LAST_16: 2, QUARTER_FINAL: 3, SEMI_FINAL: 4, FINAL: 5 };
  const statusOrder = { finished: 0, live: 1, upcoming: 2 };

  const sortedMatches = [...matches].sort((a, b) => {
    const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    if (statusDiff !== 0) return statusDiff;

    const stageA = stageOrder[a.stage] ?? 99;
    const stageB = stageOrder[b.stage] ?? 99;
    const stageDiff = stageA - stageB;
    if (stageDiff !== 0) return stageDiff;

    const idA = parseInt(a.id.split('-').pop(), 10) || 0;
    const idB = parseInt(b.id.split('-').pop(), 10) || 0;
    if (statusOrder[a.status] === 0) return idB - idA;
    if (statusOrder[a.status] === 2) return idA - idB;
    return idA - idB;
  });

  // Create card for each match
  sortedMatches.forEach(match => {
    const teamA = match.teamA || {};
    const teamB = match.teamB || {};
    const card = createMatchCard({ ...match, teamA, teamB });
    grid.appendChild(card);
  });

  // Initialize Lucide icons for the new cards
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function formatScore(score) {
  return score === null || score === undefined ? '' : score;
}

function formatScoreDisplay(homeScore, awayScore) {
  return `${formatScore(homeScore)} - ${formatScore(awayScore)}`;
}

function createMatchCard(match) {
  const card = document.createElement('div');
  card.className = 'indicator';
  card.id = `match-${match.id}`;

  const statusBadgeClass = match.status === 'live' ? 'live' : '';
  const statusText = match.status ? match.status.toUpperCase() : 'MATCH';
  const url = match.url || '#';
  const explanation = match.explanation || '';
  const source = match.source || 'FIFA';

  const stageLabels = {
    GROUP_STAGE: 'Group Stage',
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
        ${match.status === 'live' ? `<span class="new-badge ${statusBadgeClass}">${statusText}</span>` : ''}
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
        <div class="match-score">${formatScoreDisplay(match.teamA.score, match.teamB.score)}</div>
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
