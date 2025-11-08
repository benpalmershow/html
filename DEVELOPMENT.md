# Development Setup

This project uses a Bun-based development server to serve files with proper CORS handling.

## Prerequisites

- [Bun](https://bun.sh) runtime (automatically installed if missing)

## Starting Development Server

Run the dev script from the project root:

```bash
./dev.sh
```

Or use Bun directly:

```bash
bun run js/server.js
```

The server will start at **http://localhost:8000**

## Why a Server?

The site uses `fetch()` to load `json/posts.json` and markdown files. The `file://` protocol blocks fetch requests for security reasons (CORS policy). A local server bypasses this limitation.

## Features

- Automatic MIME type detection
- Static file serving with caching headers
- Error handling with detailed responses
- Development mode logging

## Notes

- Do not use `file://` URLs locally — always use the server
- The server auto-reloads modules in development mode
- Cache-busting query parameters (`?v=timestamp`) are already included in requests
