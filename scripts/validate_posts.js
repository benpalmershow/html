const fs = require('fs');
const path = require('path');

const postsFilePath = path.join(__dirname, '..', 'json', 'posts.json');
const baseDir = path.join(__dirname, '..');

fs.readFile(postsFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error("Error reading posts.json:", err);
        process.exit(1);
    }

    try {
        const postsData = JSON.parse(data);
        const posts = postsData.posts;
        const brokenLinks = [];

        posts.forEach(post => {
            if (!post.file) {
                console.warn(`[WARNING] Post titled "${post.title}" has no 'file' property.`);
                return;
            }
            const postFilePath = path.join(baseDir, post.file);
            if (!fs.existsSync(postFilePath)) {
                brokenLinks.push(post);
            }
        });

        if (brokenLinks.length > 0) {
            console.error("Validation failed. The following posts have broken file links:");
            brokenLinks.forEach(post => {
                console.error(`- Title: "${post.title}", Path: "${post.file}"`);
            });
            process.exit(1); // Exit with an error code
        } else {
            console.log("Validation successful. All post file paths in json/posts.json are valid.");
        }

    } catch (parseErr) {
        console.error("Error parsing posts.json:", parseErr);
        process.exit(1);
    }
});
