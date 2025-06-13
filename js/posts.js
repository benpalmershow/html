// Posts management system
const fs = require('fs');
const path = require('path');

// Function to add a new post
function addPost(date, content) {
    try {
        // Read existing posts
        const postsPath = path.join(__dirname, '../json/posts.json');
        let posts = [];
        
        if (fs.existsSync(postsPath)) {
            const data = fs.readFileSync(postsPath, 'utf8');
            posts = JSON.parse(data);
        }

        // Add new post
        posts.push({
            date: date,
            content: content
        });

        // Sort posts by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Write back to file
        fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
        console.log('Post added successfully!');
    } catch (error) {
        console.error('Error adding post:', error);
    }
}

// Function to delete a post by date
function deletePost(date) {
    try {
        const postsPath = path.join(__dirname, '../json/posts.json');
        if (!fs.existsSync(postsPath)) {
            console.error('No posts file found');
            return;
        }

        const data = fs.readFileSync(postsPath, 'utf8');
        let posts = JSON.parse(data);

        // Filter out the post with matching date
        posts = posts.filter(post => post.date !== date);

        // Write back to file
        fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
        console.log('Post deleted successfully!');
    } catch (error) {
        console.error('Error deleting post:', error);
    }
}

// Function to edit a post
function editPost(date, newContent) {
    try {
        const postsPath = path.join(__dirname, '../json/posts.json');
        if (!fs.existsSync(postsPath)) {
            console.error('No posts file found');
            return;
        }

        const data = fs.readFileSync(postsPath, 'utf8');
        let posts = JSON.parse(data);

        // Find and update the post
        const postIndex = posts.findIndex(post => post.date === date);
        if (postIndex === -1) {
            console.error('Post not found');
            return;
        }

        posts[postIndex].content = newContent;

        // Write back to file
        fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
        console.log('Post edited successfully!');
    } catch (error) {
        console.error('Error editing post:', error);
    }
}

// Function to list all posts
function listPosts() {
    try {
        const postsPath = path.join(__dirname, '../json/posts.json');
        if (!fs.existsSync(postsPath)) {
            console.error('No posts file found');
            return;
        }

        const data = fs.readFileSync(postsPath, 'utf8');
        const posts = JSON.parse(data);
        
        console.log('\nCurrent Posts:');
        posts.forEach(post => {
            console.log(`\nDate: ${post.date}`);
            console.log(`Content: ${post.content}`);
            console.log('-------------------');
        });
    } catch (error) {
        console.error('Error listing posts:', error);
    }
}

// Export functions for use in other files
module.exports = {
    addPost,
    deletePost,
    editPost,
    listPosts
};