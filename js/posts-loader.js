document.addEventListener('DOMContentLoaded', () => {
  const feed = document.getElementById('post-feed');
  if (!feed) return;

  feed.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

  // Optional cache-busting using meta[name="last-commit"] if present
  const v = (document.querySelector('meta[name="last-commit"]') &&
             document.querySelector('meta[name="last-commit"]').getAttribute('content')) || Date.now();

  fetch(`/json/posts.json?v=${encodeURIComponent(v)}`)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load posts (${res.status})`);
      return res.json();
    })
    .then(posts => {
      const valid = (Array.isArray(posts) ? posts : []).filter(p => p && p.date && p.content);
      feed.innerHTML = valid.map(p => `
        <article class="post-item" role="article">
          <div class="card-title"><time datetime="${p.date}">${p.date}</time></div>
          <div class="content">${p.content}</div>
        </article>
      `).join('') || '<div class="empty-state">No posts available.</div>';

      if (window.lucide) window.lucide.createIcons();
    })
    .catch(err => {
      console.error('Error loading posts:', err);
      feed.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error loading posts. ${err.message || ''}</p>
          <button onclick="location.reload()" class="retry-button">Try Again</button>
        </div>
      `;
    });
});
