document.addEventListener('DOMContentLoaded', () => {
  const feed = document.getElementById('announcements-container');
  if (!feed) return;

  // Check for session-based deduplication
  const lastFetch = sessionStorage.getItem('postsLastFetch');
  const now = Date.now();
  if (lastFetch && (now - parseInt(lastFetch)) < 30000) { // 30 seconds
    return; // Skip fetch if done recently in this session
  }

  feed.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

  function parseDate(dateStr) {
    // Parse date in format "MM/DD/YY" or "MM/DD/YY HH:MM AM/PM"
    const matchWithTime = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)$/);
    if (matchWithTime) {
      let [, month, day, year, hour, minute, ampm] = matchWithTime;
      month = parseInt(month) - 1; // JS months are 0-based
      day = parseInt(day);
      year = 2000 + parseInt(year); // assume 20xx
      hour = parseInt(hour);
      minute = parseInt(minute);

      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      return new Date(year, month, day, hour, minute);
    }

    // Try date only: "MM/DD/YY"
    const matchDateOnly = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (matchDateOnly) {
      let [, month, day, year] = matchDateOnly;
      month = parseInt(month) - 1;
      day = parseInt(day);
      year = 2000 + parseInt(year);
      return new Date(year, month, day); // midnight
    }

    // Fallback
    return new Date(dateStr);
  }

  function formatTimeAgo(timestamp) {
    const now = new Date();
    const postDate = parseDate(timestamp);
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }

  function renderPosts(posts) {
  feed.innerHTML = posts.map(p => `
  <div class="announcement-card">
  <time>${formatTimeAgo(p.date)}</time>
  <div class="content">${p.content || ''}</div>
  </div>
  `).join('') || '<div class="empty-state">No posts available.</div>';

  // Execute scripts in the content
    const cards = feed.querySelectorAll('.announcement-card');
    cards.forEach(card => {
      const scripts = card.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        document.body.appendChild(newScript);
        // Remove the original script tag
        script.remove();
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  fetch('json/posts.json?v=' + Date.now())
    .then(r => {
      if (!r.ok) throw new Error('Failed to load posts JSON');
      return r.json();
    })
    .then(posts => {
      sessionStorage.setItem('postsLastFetch', Date.now().toString());
      // For each post, if it has file, fetch and parse
      const promises = posts.map(post => {
        if (post.file) {
          return fetch(post.file + '?v=' + Date.now())
            .then(r => {
              if (!r.ok) throw new Error('Failed to load ' + post.file);
              return r.text();
            })
            .then(md => {
              // Parse markdown with idle callback for non-blocking processing
              return new Promise((resolve) => {
                if ('requestIdleCallback' in window) {
                  requestIdleCallback(() => {
                    const parts = md.split(/^---$/m);
                    let contentMd;
                    if (parts.length >= 3) {
                      contentMd = parts.slice(2).join('---').trim();
                    } else {
                      contentMd = md.trim();
                    }
                    const contentHtml = marked.parse(contentMd);
                    resolve({ ...post, content: contentHtml });
                  });
                } else {
                  // Fallback for browsers without requestIdleCallback
                  setTimeout(() => {
                    const parts = md.split(/^---$/m);
                    let contentMd;
                    if (parts.length >= 3) {
                      contentMd = parts.slice(2).join('---').trim();
                    } else {
                      contentMd = md.trim();
                    }
                    const contentHtml = marked.parse(contentMd);
                    resolve({ ...post, content: contentHtml });
                  }, 0);
                }
              });
            })
            .catch(err => {
              console.warn('Failed to load ' + post.file, err);
              return post; // keep as is
            });
        } else {
          return Promise.resolve(post);
        }
      });

      return Promise.all(promises);
    })
    .then(validPosts => {
      renderPosts(validPosts.filter(p => p && p.date && p.content));
    })
    .catch(err => {
      console.error('Error loading posts:', err);
      feed.innerHTML = '<div class="error-state">Error loading posts.</div>';
    });
});
