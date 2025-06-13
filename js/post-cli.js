#!/usr/bin/env node

const posts = require('./posts.js');

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Helper function to display usage
function showUsage() {
    console.log(`
Usage: node post-cli.js <command> [options]

Commands:
  add <date> <content>    Add a new post
  delete <date>          Delete a post by date
  edit <date> <content>  Edit a post by date
  list                   List all posts

Examples:
  node post-cli.js add "6/14/25" "New post content"
  node post-cli.js delete "6/14/25"
  node post-cli.js edit "6/14/25" "Updated content"
  node post-cli.js list
`);
}

// Process commands
switch (command) {
    case 'add':
        if (args.length < 3) {
            console.error('Error: Missing date or content');
            showUsage();
            process.exit(1);
        }
        const date = args[1];
        const content = args.slice(2).join(' ');
        posts.addPost(date, content);
        break;

    case 'delete':
        if (args.length < 2) {
            console.error('Error: Missing date');
            showUsage();
            process.exit(1);
        }
        posts.deletePost(args[1]);
        break;

    case 'edit':
        if (args.length < 3) {
            console.error('Error: Missing date or content');
            showUsage();
            process.exit(1);
        }
        const editDate = args[1];
        const newContent = args.slice(2).join(' ');
        posts.editPost(editDate, newContent);
        break;

    case 'list':
        posts.listPosts();
        break;

    default:
        console.error('Error: Unknown command');
        showUsage();
        process.exit(1);
} 