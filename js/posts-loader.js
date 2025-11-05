document.addEventListener('DOMContentLoaded', () => {
  const feed = document.getElementById('announcements-container');
  if (!feed) return;

  feed.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

  function renderPosts(posts) {
    feed.innerHTML = posts.map(p => `
      <div class="announcement-card">
        <time>${p.date}</time>
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
