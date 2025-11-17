document.addEventListener('DOMContentLoaded', () => {
  const feed = document.getElementById('announcements-container');
  if (!feed) return;

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

    feed.innerHTML = posts.map(p => `
      <div class="announcement-card" data-date="${p.date}">
        <time class="post-time">${formatTimeAgo(p.date)}</time>
        <div class="content">${p.content || ''}</div>
      </div>
    `).join('');

    // Execute embedded scripts in content
    const cards = feed.querySelectorAll('.announcement-card');
    cards.forEach(card => {
      const scripts = card.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        // Wrap inline scripts in IIFE to prevent variable collisions
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

    // Update times every minute
    setInterval(() => {
      document.querySelectorAll('.announcement-card').forEach(card => {
        const dateStr = card.getAttribute('data-date');
        if (dateStr) {
          card.querySelector('.post-time').textContent = formatTimeAgo(dateStr);
        }
      });
    }, 60000);
  }

  fetch('json/posts.json?v=' + Date.now())
    .then(r => {
      if (!r.ok) throw new Error('Failed to load posts');
      return r.json();
    })
    .then(posts => {
      if (!Array.isArray(posts)) throw new Error('Invalid posts format');
      
      // For posts with files, fetch and parse markdown
      const promises = posts.map(post => {
        if (post.file) {
          return fetch(post.file + '?v=' + Date.now())
            .then(r => r.text())
            .then(md => {
              const parts = md.split(/^---$/m);
              let contentMd = md.trim();
              
              // Skip frontmatter if it exists (content between first and second ---)
              if (parts.length >= 3) {
                contentMd = parts.slice(2).join('---').trim();
              } else if (parts.length === 2 && !md.trimStart().startsWith('---')) {
                // If we have a split but frontmatter isn't at the start, use original
                contentMd = md.trim();
              }
              
              try {
                const contentHtml = window.marked?.parse?.(contentMd) || contentMd;
                return { ...post, content: contentHtml };
              } catch (e) {
                console.warn('Failed to parse markdown for', post.file, e);
                return post;
              }
            })
            .catch(err => {
              console.warn('Failed to fetch', post.file);
              return post;
            });
        }
        return Promise.resolve(post);
      });

      return Promise.all(promises);
    })
    .then(posts => {
      const validPosts = posts.filter(p => p?.date && (p.content || p.file));
      renderPosts(validPosts);
    })
    .catch(err => {
      console.error('Error loading posts:', err);
      feed.innerHTML = '<div class="error-state">Unable to load announcements.</div>';
    });
});
