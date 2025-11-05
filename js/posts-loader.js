document.addEventListener('DOMContentLoaded', () => {
  const feed = document.getElementById('announcements-container');
  if (!feed) return;

  feed.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

  function formatTimeAgo(timestamp) {
  const now = new Date();
  const postDate = new Date(timestamp);
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
    if (diffDays < 30) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  }

  function renderPosts(posts) {
    feed.innerHTML = posts.map(p => `
      <div class="announcement-card">
        <time>${formatTimeAgo(p.date)}</time>
        <div class="content">${p.content || ''}</div>
      </div>
    `).join('') || '<div class="empty-state">No posts available.</div>';

    if (window.lucide) window.lucide.createIcons();
  }

  fetch('json/posts.json?v=' + Date.now())
    .then(r => {
      if (!r.ok) throw new Error('Failed to load posts');
      return r.json();
    })
    .then(posts => {
      const valid = (Array.isArray(posts) ? posts : []).filter(p => p && p.date && p.content);

      // Posts are already sorted in the JSON (latest first)
      renderPosts(valid);
    })
    .catch(err => {
      console.error('Error loading posts:', err);
      feed.innerHTML = '<div class="error-state">Error loading posts.</div>';
    });
});
