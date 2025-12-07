/**
 * Refactored posts loader with modular architecture
 * Handles announcements, markdown parsing, and chart rendering
 */

import { waitForMarked } from './modules/marked-loader.js';
import { parseMarkdownFile, processCharts } from './modules/markdown-parser.js';
import { formatTimeAgo, startTimeUpdates } from './modules/time-formatter.js';
import { renderFinancialCharts } from './modules/chart-renderer.js';

const CONFIG = {
    INITIAL_LOAD: 3,
    BATCH_SIZE: 10,
    POSTS_JSON_URL: 'json/posts.json'
};

let state = {
    feed: null,
    allPosts: [],
    loadedCount: 0,
    postsJsonUrl: CONFIG.POSTS_JSON_URL
};

export async function initPosts() {
    state.feed = document.getElementById('announcements-container');
    if (!state.feed) return;

    // Setup event delegation for card expansion
    setupCardExpansion();

    // Wait for markdown parser
    await waitForMarked();

    // Clear loading skeletons
    state.feed.innerHTML = '';

    try {
        // Fetch all posts metadata
        const posts = await fetchPosts();
        state.allPosts = posts;

        // Load initial batch
        const initialPosts = posts.slice(0, CONFIG.INITIAL_LOAD);
        await loadAndRenderPosts(initialPosts);

        // Start time updates (only once)
        startTimeUpdates();
    } catch (err) {
        console.error('Error loading posts:', err);
        state.feed.innerHTML = '<div class="error-state">Unable to load announcements.</div>';
    }
}

function setupCardExpansion() {
    state.feed.addEventListener('click', (e) => {
        const card = e.target.closest('.announcement-card');
        if (!card) return;

        // Don't expand if clicking links or buttons
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;

        card.classList.toggle('expanded');
    });
}

async function fetchPosts() {
    // Use pre-fetched promise from index.html if available
    const postsJson = window.postsPromise || fetch(state.postsJsonUrl)
        .then(r => {
            if (!r.ok) throw new Error('Failed to load posts');
            return r.json();
        });

    const posts = await postsJson;
    if (!Array.isArray(posts)) throw new Error('Invalid posts format');
    
    return posts;
}

async function loadAndRenderPosts(posts) {
    if (!posts || posts.length === 0) {
        state.feed.innerHTML = '<div class="empty-state">No announcements yet.</div>';
        return;
    }

    // Fetch markdown content for each post
    const postsWithContent = await Promise.all(
        posts.map(post => fetchPostContent(post))
    );

    // Filter valid posts
    const validPosts = postsWithContent.filter(p => p?.date && p?.content);

    // Render posts
    renderPosts(validPosts);

    // Update state
    state.loadedCount += validPosts.length;

    // Show load more button if needed
    if (state.loadedCount < state.allPosts.length) {
        showLoadMoreButton();
    }

    // Render any financial charts
    renderChartPlaceholders();
}

async function fetchPostContent(post) {
    if (!post.file) {
        console.warn('Post missing file reference:', post);
        return null;
    }

    try {
        let contentHtml = await parseMarkdownFile(post.file);

        // Process chart placeholders
        if (contentHtml.includes('{{chart:')) {
            contentHtml = processCharts(contentHtml);
        }

        return { ...post, content: contentHtml };
    } catch (err) {
        console.error('Failed to fetch post content:', post.file, err);
        return null;
    }
}

function renderPosts(posts) {
    const postsHTML = posts.map(p => `
        <div class="announcement-card" data-date="${p.date}">
            <div class="card-header-row">
                <time class="post-time">${formatTimeAgo(p.date)}</time>
            </div>
            <div class="content">${p.content || ''}</div>
        </div>
    `).join('');

    // Append or replace
    if (state.loadedCount === 0) {
        state.feed.innerHTML = postsHTML;
    } else {
        state.feed.insertAdjacentHTML('beforeend', postsHTML);
    }

    // Reinitialize lucide icons if available
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function renderChartPlaceholders() {
    if (!state.feed.querySelector('[data-indicator]')) return;

    if (typeof window.loadChartJS === 'function') {
        window.loadChartJS().then(() => {
            renderFinancialCharts().catch(err => console.error('Chart rendering error:', err));
        });
    } else {
        renderFinancialCharts().catch(err => console.error('Chart rendering error:', err));
    }
}

function showLoadMoreButton() {
    let btn = document.getElementById('load-more-btn');
    const container = document.querySelector('.announcements');

    if (!btn && container) {
        btn = document.createElement('button');
        btn.id = 'load-more-btn';
        btn.className = 'load-more-btn';
        btn.textContent = `Load More (${state.allPosts.length - state.loadedCount} remaining)`;
        btn.onclick = () => loadMorePosts();
        container.appendChild(btn);
    } else if (btn) {
        btn.textContent = `Load More (${state.allPosts.length - state.loadedCount} remaining)`;
        btn.style.display = 'block';
    }
}

async function loadMorePosts() {
    const btn = document.getElementById('load-more-btn');
    if (!btn || btn.disabled) return;

    try {
        btn.disabled = true;
        btn.classList.add('loading');

        const nextBatch = state.allPosts.slice(state.loadedCount, state.loadedCount + CONFIG.BATCH_SIZE);

        if (nextBatch.length === 0) {
            btn.style.display = 'none';
            return;
        }

        await loadAndRenderPosts(nextBatch);
    } catch (error) {
        console.error('Error loading more posts:', error);
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPosts);
} else {
    initPosts();
}
