// posts.js
document.addEventListener('DOMContentLoaded', () => {
  fetch('/posts.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load posts');
      }
      return response.json();
    })
    .then(posts => {
      const postFeed = document.getElementById('post-feed');
      postFeed.innerHTML = posts
        .map(post => `<p><time datetime="${post.date}">${post.date}</time> - ${post.content}</p>`)
        .join('');
    })
    .catch(error => {
      console.error('Error loading posts:', error);
      document.getElementById('post-feed').innerHTML = '<p>Error loading posts. Please try again later.</p>';
    });
});