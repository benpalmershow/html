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

    // Check if any post contains charts and lazy load Chart.js if needed
    const hasCharts = feed.querySelector('canvas');
    if (hasCharts && typeof window.loadChartJS === 'function') {
      window.loadChartJS().then(() => {
        // Re-execute chart scripts after Chart.js loads
        executeScripts();
      });
    } else {
      executeScripts();
    }
    
    function executeScripts() {
      // Execute embedded scripts in newly added content
      const cards = Array.from(feed.querySelectorAll('.announcement-card')).slice(-posts.length);
      cards.forEach(card => {
        const scripts = card.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          if (oldScript.textContent && !oldScript.src) {
            newScript.textContent = `(function(){${oldScript.textContent}})();`;
          } else {
            newScript.textContent = oldScript.textContent;
          }
          if (oldScript.src) newScript.src = oldScript.src;
          document.body.appendChild(newScript);
        });
      });

      // Reinitialize lucide icons
      if (window.lucide) {
        window.lucide.createIcons();
      }
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
              const contentHtml = window.marked.parse(contentMd);
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

  fetch('json/posts.json?v=' + Date.now())
    .then(r => {
      if (!r.ok) throw new Error('Failed to load posts');
      return r.json();
    })
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
              const contentHtml = window.marked.parse(contentMd);
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

// Use requestIdleCallback for better performance
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    initPosts();
  }, { timeout: 2000 });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initPosts();
  });
}
