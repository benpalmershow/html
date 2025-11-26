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
  
  // Add expand/collapse functionality with event delegation (attach once, works for all cards)
  feed.addEventListener('click', (e) => {
    const card = e.target.closest('.announcement-card');
    if (!card) return;
    
    // Don't expand if clicking a link or button
    if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
    
    card.classList.toggle('expanded');
  });
  
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

    // Handle image errors and ensure proper sizing
    feed.querySelectorAll('img').forEach(img => {
      if (!img.onerror) {
        img.onerror = () => {
          console.error('Image failed to load:', img.src);
          img.style.display = 'none';
        };
      }

      // For TMDB images, optimize to w500 size and set proper aspect ratio FIRST
      if (img.src.includes('themoviedb.org') || img.src.includes('tmdb.org')) {
        // Only optimize if not already optimized
        if (img.src.includes('/original/')) {
          img.src = img.src.replace('/original/', '/w500/');
          console.log('Optimized TMDB image:', img.src);
        }
        // Set 2:3 aspect ratio for movie posters
        img.width = 300;
        img.height = 450;
      }

      // Ensure images have proper dimensions to prevent CLS
      if (!img.hasAttribute('width') || !img.hasAttribute('height')) {
        // Set default dimensions if not specified
        if (!img.hasAttribute('width')) img.width = 400;
        if (!img.hasAttribute('height')) img.height = 300;
      }

      // Add loading="lazy" for non-critical images
      if (!img.hasAttribute('loading')) {
        img.loading = 'lazy';
      }

      // Add decoding="async" to prevent layout jank
      if (!img.hasAttribute('decoding')) {
        img.decoding = 'async';
      }
    });
    
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

      if (!chartConfig) {
        console.warn('Failed to generate chart config for', indicatorName);
        return;
      }

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
  // Constants for chart styling
  const CHART_COLORS = {
    PRIMARY: '#2C5F5A',
    PRIMARY_FILL: 'rgba(44, 95, 90, 0.1)', // Semi-transparent for fill
    SECONDARY: '#666',
    ACCENT: '#D4822A',
    ERROR: '#8B0000'
  };

  const CHART_CONFIG = {
    TENSION: 0.4,
    BORDER_WIDTH: 2
  };

  // Input validation
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    console.warn('Invalid or empty dataPoints provided to getChartConfig');
    return null;
  }

  if (!Array.isArray(labels) || labels.length !== dataPoints.length) {
    console.warn('Labels array must match dataPoints length');
    return null;
  }

  // Validate data points are numbers
  const validDataPoints = dataPoints.map(point => {
    const num = parseFloat(point);
    return isNaN(num) ? 0 : num; // Default to 0 for invalid values
  });

  const baseConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: indicator.name || 'Data',
        data: validDataPoints,
        borderColor: CHART_COLORS.PRIMARY,
        backgroundColor: CHART_COLORS.PRIMARY_FILL,
        borderWidth: CHART_CONFIG.BORDER_WIDTH,
        tension: CHART_CONFIG.TENSION,
        fill: true,
        pointBackgroundColor: CHART_COLORS.PRIMARY,
        pointBorderColor: CHART_COLORS.PRIMARY,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          bottom: 20
        }
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += context.parsed.y.toLocaleString();
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              // Format based on indicator type
              if (indicator.name && (indicator.name.includes('Rate') || indicator.name.includes('Yield'))) {
                return value.toFixed(2) + '%';
              }
              if (indicator.name && (indicator.name.includes('Price') || indicator.name.includes('Revenue'))) {
                return '$' + value.toLocaleString();
              }
              return value.toLocaleString();
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
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
  
  // Mixed chart for Trade Deficit with imports/exports
  if (indicator.name === 'Trade Deficit' && indicator.imports && indicator.exports) {
    const importValues = [];
    const exportValues = [];
    const deficitValues = [];
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    
    months.forEach((month, index) => {
      const importValue = indicator.imports[month];
      const exportValue = indicator.exports[month];
      const deficitValue = indicator[month];

      if (importValue && exportValue && deficitValue && 
          !importValue.startsWith('TBD') && !exportValue.startsWith('TBD') && !deficitValue.startsWith('TBD')) {
        const numImport = parseFloat(importValue.replace(/[^0-9.-]/g, ''));
        const numExport = parseFloat(exportValue.replace(/[^0-9.-]/g, ''));
        const numDeficit = parseFloat(deficitValue.replace(/[^0-9.-]/g, ''));

        if (!isNaN(numImport) && !isNaN(numExport) && !isNaN(numDeficit)) {
          importValues.push(numImport);
          exportValues.push(numExport);
          deficitValues.push(numDeficit);
          labels[labels.length - 1] = months[index].charAt(0).toUpperCase() + months[index].slice(1, 3);
        }
      }
    });

    baseConfig.type = 'bar';
    baseConfig.data = {
      labels: labels,
      datasets: [
        {
          type: 'bar',
          label: 'Imports',
          data: importValues,
          backgroundColor: 'rgba(255, 107, 107, 0.7)',
          borderColor: '#FF6B6B',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'Exports',
          data: exportValues,
          backgroundColor: 'rgba(81, 207, 102, 0.7)',
          borderColor: '#51CF66',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Trade Deficit',
          data: deficitValues,
          borderColor: '#2C5F5A',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          tension: 0.4,
          fill: false,
          yAxisID: 'y1',
          pointBackgroundColor: '#2C5F5A',
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          pointRadius: 4
        }
      ]
    };
    baseConfig.options.scales = {
      x: { display: true, grid: { display: false, drawBorder: false } },
      y: {
        display: true,
        beginAtZero: false,
        grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
        ticks: { callback: function (value) { if (value >= 1000) return (value / 1000).toFixed(1) + 'K'; return value.toLocaleString(); } },
        position: 'left',
        title: { display: true, text: 'Imports / Exports (Billions)' }
      },
      y1: {
        display: true,
        beginAtZero: false,
        grid: { display: false },
        ticks: { callback: function (value) { if (value >= 1000) return (value / 1000).toFixed(1) + 'K'; return value.toLocaleString(); } },
        position: 'right',
        title: { display: true, text: 'Trade Deficit (Billions)' }
      }
    };
    baseConfig.options.plugins.legend = { display: true, position: 'top' };
    return baseConfig;
  }
  
  // Bar chart for prediction markets
  if (indicator.category === 'Prediction Markets' || indicator.bps_probabilities) {
    baseConfig.type = 'bar';
    baseConfig.data = {
      labels: labels,
      datasets: [{
        label: 'Probability (%)',
        data: validDataPoints,
        backgroundColor: [
          CHART_COLORS.PRIMARY,
          CHART_COLORS.SECONDARY,
          CHART_COLORS.ACCENT,
          CHART_COLORS.ERROR
        ],
        borderColor: [
          CHART_COLORS.PRIMARY,
          CHART_COLORS.SECONDARY,
          CHART_COLORS.ACCENT,
          CHART_COLORS.ERROR
        ],
        borderWidth: CHART_CONFIG.BORDER_WIDTH
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
