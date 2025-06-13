document.addEventListener('DOMContentLoaded', () => {
    fetch('/json/posts.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load posts');
            }
            return response.json();
        })
        .then(posts => {
            // Sort posts by date (newest first)
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Generate HTML for each post
            const postFeed = document.getElementById('post-feed');
            postFeed.innerHTML = posts.map(post => `
                <div class="card-title">
                    <time datetime="${post.date}">${post.date}</time>
                </div>
                <div class="content">${post.content}</div>
            `).join('');
        })
        .catch(error => {
            console.error('Error loading posts:', error);
            document.getElementById('post-feed').innerHTML = 
                '<div class="error-state">Error loading posts. Please try again later.</div>';
        });
}); 