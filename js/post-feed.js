document.addEventListener('DOMContentLoaded', () => {
    const POSTS_CACHE_KEY = 'posts-data-cache';
    const POSTS_CACHE_DURATION = 3 * 60 * 1000; // 3 minutes
    const postFeed = document.getElementById('post-feed');

    // Show loading state
    postFeed.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

    async function loadPosts() {
        try {
            // Check cache first
            const cached = localStorage.getItem(POSTS_CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < POSTS_CACHE_DURATION) {
                    renderPosts(data);
                    return;
                }
            }

            const response = await fetch('/json/posts.json');
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Posts data not found');
                } else if (response.status >= 500) {
                    throw new Error('Server error occurred');
                } else {
                    throw new Error(`Failed to load posts (${response.status})`);
                }
            }

            const posts = await response.json();

            // Validate posts
            const validPosts = posts.filter(post => post && post.date && post.content);

            // Cache the data
            localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify({
                data: validPosts,
                timestamp: Date.now()
            }));

            renderPosts(validPosts);

        } catch (error) {
            console.error('Error loading posts:', error);
            
            let errorMessage = 'Error loading posts. ';
            if (error.name === 'TypeError') {
                errorMessage += 'Please check your internet connection.';
            } else {
                errorMessage += error.message;
            }
            
            postFeed.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${errorMessage}</p>
                    <button onclick="location.reload()" class="retry-button">Try Again</button>
                </div>
            `;
        }
    }

    function renderPosts(posts) {
        // Sort posts by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Generate HTML for each post
        postFeed.innerHTML = posts.map(post => `
            <article class="post-item" role="article">
                <div class="card-title">
                    <time datetime="${post.date}">${post.date}</time>
                </div>
                <div class="content">${post.content}</div>
            </article>
        `).join('');
        
        // Initialize Lucide icons after content is loaded
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    loadPosts();
}); 