function waitForMarked() {
  return new Promise((resolve) => {
    if (window.marked) {
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.marked) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('Marked.js not loaded, using raw content');
        resolve();
      }
    }, 100);
  });
}

async function initPosts() {
  const feed = document.getElementById('announcements-container');
  if (!feed) return;
  
  const INITIAL_LOAD = 3; // Load only 3 posts initially for best LCP
  let allPosts = [];
  let loadedCount = 0;
  
  await waitForMarked();
  
  // Clear loading skeletons after marked loads
  feed.innerHTML = '';

  function formatTimeAgo(dateString) {
    const postDate = new Date(dateString);
    if (isNaN(postDate)) return 'recently';
    
    const now = new Date();
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }

  function renderPosts(posts) {
    if (!posts || posts.length === 0) {
      feed.innerHTML = '<div class="empty-state">No announcements yet.</div>';
      return;
    }

    const postsHTML = posts.map(p => `
      <div class="announcement-card" data-date="${p.date}">
        <time class="post-time">${formatTimeAgo(p.date)}</time>
        <div class="content">${p.content || ''}</div>
      </div>
    `).join('');
    
    // Append new posts instead of replacing
    if (loadedCount === 0) {
      feed.innerHTML = postsHTML;
    } else {
      feed.insertAdjacentHTML('beforeend', postsHTML);
    }
    
    loadedCount += posts.length;

    // Reinitialize lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Update times every minute (only set once)
    if (loadedCount === posts.length) {
      setInterval(() => {
        document.querySelectorAll('.announcement-card').forEach(card => {
          const dateStr = card.getAttribute('data-date');
          if (dateStr) {
            const timeEl = card.querySelector('.post-time');
            if (timeEl) timeEl.textContent = formatTimeAgo(dateStr);
          }
        });
      }, 60000);
    }
    
    // Show load more button if there are more posts
    if (loadedCount < allPosts.length) {
      showLoadMoreButton();
    }
    
    // Render financial charts - ensure Chart.js is loaded first
    if (feed.querySelector('[data-indicator]')) {
      // Load Chart.js if there are charts
      if (typeof window.loadChartJS === 'function') {
        window.loadChartJS().then(async () => {
          console.log('Chart.js loaded, rendering charts...');
          await renderFinancialCharts();
        });
      } else {
        renderFinancialCharts().catch(err => console.error('Chart rendering error:', err));
      }
    }
  }
  
  function showLoadMoreButton() {
    let loadMoreBtn = document.getElementById('load-more-btn');
    const container = document.querySelector('.announcements');
    
    if (!loadMoreBtn && container) {
      loadMoreBtn = document.createElement('button');
      loadMoreBtn.id = 'load-more-btn';
      loadMoreBtn.className = 'load-more-btn';
      loadMoreBtn.textContent = `Load More (${allPosts.length - loadedCount} remaining)`;
      loadMoreBtn.onclick = () => loadMorePosts();
      container.appendChild(loadMoreBtn);
    } else if (loadMoreBtn) {
      loadMoreBtn.textContent = `Load More (${allPosts.length - loadedCount} remaining)`;
      loadMoreBtn.style.display = 'block';
    }
  }
  
  async function loadMorePosts() {
    const btn = document.getElementById('load-more-btn');
    if (!btn || btn.disabled) return;
    
    try {
      // Add loading state
      btn.disabled = true;
      btn.classList.add('loading');
      
      const nextBatch = allPosts.slice(loadedCount, loadedCount + 10);
      
      if (nextBatch.length === 0) {
        btn.style.display = 'none';
        return;
      }
      
      // Fetch and render next batch
      const promises = nextBatch.map(post => {
        if (!post.file) {
          console.warn('Post missing file reference:', post);
          return Promise.resolve(null);
        }
        
        return fetch(post.file + '?v=' + Date.now())
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
          })
          .then(md => {
            const parts = md.split(/^---$/m);
            let contentMd = md.trim();
            
            if (parts.length >= 3) {
              contentMd = parts.slice(2).join('---').trim();
            } else if (parts.length === 2 && !md.trimStart().startsWith('---')) {
              contentMd = md.trim();
            }
            
            if (!window.marked) {
              console.warn('Marked.js not loaded, using raw content');
              return { ...post, content: contentMd };
            }
            
            try {
              let contentHtml = window.marked.parse(contentMd);
              
              // Process chart placeholders
              if (contentHtml.includes('{{chart:')) {
                contentHtml = processCharts(contentHtml);
              }
              
              return { ...post, content: contentHtml };
            } catch (e) {
              console.error('Failed to parse markdown for', post.file, e);
              return { ...post, content: contentMd };
            }
            })
            .catch(err => {
             console.error('Failed to fetch', post.file, err);
             return null;
            });
            });
            
            const loadedPosts = await Promise.all(promises);
            const validPosts = loadedPosts.filter(p => p?.date && p?.content);
      
      if (validPosts.length > 0) {
        renderPosts(validPosts);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      // Remove loading state
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  const fetchPosts = () => window.postsPromise || fetch('json/posts.json?v=' + Date.now())
    .then(r => {
      if (!r.ok) throw new Error('Failed to load posts');
      return r.json();
    });

  fetchPosts()
    .then(posts => {
      if (!Array.isArray(posts)) throw new Error('Invalid posts format');
      
      allPosts = posts;
      const postsToLoad = posts.slice(0, INITIAL_LOAD);
      
      // Fetch and parse markdown files for initial batch
      const promises = postsToLoad.map(post => {
        if (!post.file) {
          console.warn('Post missing file reference:', post);
          return Promise.resolve(null);
        }
        
        return fetch(post.file + '?v=' + Date.now())
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
          })
          .then(md => {
            const parts = md.split(/^---$/m);
            let contentMd = md.trim();
            
            // Skip frontmatter if it exists (content between first and second ---)
            if (parts.length >= 3) {
              contentMd = parts.slice(2).join('---').trim();
            } else if (parts.length === 2 && !md.trimStart().startsWith('---')) {
              contentMd = md.trim();
            }
            
            // Parse markdown to HTML
            if (!window.marked) {
              console.warn('Marked.js not loaded, using raw content');
              return { ...post, content: contentMd };
            }
            
            try {
               let contentHtml = window.marked.parse(contentMd);
               
              // Process chart placeholders
              if (contentHtml.includes('{{chart:')) {
                contentHtml = processCharts(contentHtml);
              }
              
              return { ...post, content: contentHtml };
            } catch (e) {
              console.error('Failed to parse markdown for', post.file, e);
              return { ...post, content: contentMd };
            }
            })
            .catch(err => {
             console.error('Failed to fetch', post.file, err);
             return null;
            });
            });
            
            return Promise.all(promises);
            })
            .then(posts => {
            const validPosts = posts.filter(p => p?.date && p?.content);
            renderPosts(validPosts);
    })
    .catch(err => {
      console.error('Error loading posts:', err);
      feed.innerHTML = '<div class="error-state">Unable to load announcements.</div>';
    });
}

function processCharts(html) {
  const chartRegex = /\{\{chart:([^}]+)\}\}/g;
  const matches = [...html.matchAll(chartRegex)];
  
  if (matches.length === 0) return html;
  
  let result = html;
  let idCounter = 0;
  
  matches.forEach(match => {
    const indicatorName = match[1].trim();
    const canvasId = indicatorName.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-' + (Date.now() + idCounter++);
    const chartHTML = `<div class="chart-container" data-chart-id="${canvasId}" data-indicator="${indicatorName}"><canvas id="${canvasId}"></canvas></div>`;
    result = result.replace(match[0], chartHTML);
  });
  
  return result;
}

async function renderFinancialCharts() {
  const containers = document.querySelectorAll('[data-indicator]:not([data-rendered])');
  console.log('Found chart containers:', containers.length);
  if (containers.length === 0) return;
  
  // Ensure Chart.js is loaded
  if (!window.Chart) {
    console.log('Chart.js not found, loading...');
    if (typeof window.loadChartJS === 'function') {
      await window.loadChartJS();
    } else {
      console.warn('Chart.js not available');
      return;
    }
  }
  
  console.log('Chart.js loaded, fetching financial data...');
  
  // Load financial data
  try {
    const response = await fetch('json/financials-data.json?v=' + Date.now());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log('Financial data loaded, found', data.indices.length, 'indicators');
    
    containers.forEach(container => {
      const canvasId = container.getAttribute('data-chart-id');
      const indicatorName = container.getAttribute('data-indicator');
      console.log('Rendering chart:', indicatorName, 'canvas:', canvasId);
      
      const canvas = document.getElementById(canvasId);
      
      if (!canvas) {
        console.warn('Canvas not found:', canvasId);
        return;
      }
      
      const indicator = data.indices.find(i => i.name === indicatorName);
      
      if (!indicator) {
        console.warn('Indicator not found:', indicatorName, 'Available:', data.indices.map(i => i.name));
        return;
      }
      
      container.dataset.rendered = 'true';
      
      // Extract month data or use prediction market data
      let dataPoints = [];
      let labels = [];
      
      // Check for prediction market data first
      if (indicator.bps_probabilities) {
        labels = Object.keys(indicator.bps_probabilities);
        dataPoints = Object.values(indicator.bps_probabilities).map(v => parseFloat(v));
      } else {
        // Extract historical monthly data
        const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        
        monthKeys.forEach(month => {
          if (indicator[month]) {
            const value = parseFloat(indicator[month].replace(/[^0-9.-]/g, ''));
            if (!isNaN(value)) {
              dataPoints.push(value);
              labels.push(month.charAt(0).toUpperCase() + month.slice(1, 3));
            }
          }
        });
      }
      
      if (dataPoints.length === 0) {
        console.warn('No data points found for', indicatorName);
        return;
      }
      
      // Determine chart config based on indicator
      const chartConfig = getChartConfig(indicator, labels, dataPoints);
      
      try {
        const ctx = canvas.getContext('2d');
        new window.Chart(ctx, chartConfig);
        
        // Add click handler to navigate to financials
        container.style.cursor = 'pointer';
        container.onclick = () => {
          window.location.href = 'financials.html?filter=' + encodeURIComponent(indicator.category || 'Financial Indicators');
        };
      } catch (error) {
        console.error('Chart rendering error for', indicatorName, error);
      }
    });
  } catch (err) {
    console.error('Failed to load financial data:', err);
  }
}

function getChartConfig(indicator, labels, dataPoints) {
  const baseConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: indicator.name,
        data: dataPoints,
        borderColor: '#2C5F5A',
        backgroundColor: 'rgba(44, 95, 90, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              // Format based on indicator type
              if (indicator.name.includes('Rate') || indicator.name.includes('Yield')) {
                return value.toFixed(2) + '%';
              }
              if (indicator.name.includes('Price') || indicator.name.includes('Revenue')) {
                return '$' + value.toLocaleString();
              }
              return value.toLocaleString();
            }
          }
        }
      }
    }
  };
  
  // Special handling for specific indicators
  if (indicator.name === 'Lumber Futures') {
    baseConfig.options.scales.y.min = 500;
    baseConfig.options.scales.y.max = 720;
  }
  
  if (indicator.name && indicator.name.includes('Consumer Sentiment')) {
    baseConfig.options.scales.y.min = 45;
    baseConfig.options.scales.y.max = 65;
  }
  
  // Bar chart for prediction markets
  if (indicator.category === 'Prediction Markets' || indicator.bps_probabilities) {
    baseConfig.type = 'bar';
    baseConfig.data = {
      labels: Object.keys(indicator.bps_probabilities || {}),
      datasets: [{
        label: 'Probability (%)',
        data: Object.values(indicator.bps_probabilities || {}).map(v => parseFloat(v)),
        backgroundColor: ['#2C5F5A', '#666', '#D4822A', '#8B0000'],
        borderColor: ['#2C5F5A', '#666', '#D4822A', '#8B0000'],
        borderWidth: 1
      }]
    };
    baseConfig.options.scales.y.beginAtZero = true;
  }
  
  return baseConfig;
}

// Start initialization immediately for better LCP
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPosts);
} else {
  initPosts();
}
