const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // Default to index.html for root
    if (pathname === '/') {
        pathname = '/index.html';
    }

    // Handle test-seo.html route
    if (pathname === '/test-seo') {
        pathname = '/test-seo.html';
    }

    const filePath = path.join(__dirname, pathname);

    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }

        // Read and serve the file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal server error');
                return;
            }

            // Set appropriate content type
            const ext = path.extname(filePath);
            let contentType = 'text/plain';

            switch (ext) {
                case '.html':
                    contentType = 'text/html';
                    break;
                case '.js':
                    contentType = 'application/javascript';
                    break;
                case '.css':
                    contentType = 'text/css';
                    break;
                case '.json':
                    contentType = 'application/json';
                    break;
                case '.png':
                    contentType = 'image/png';
                    break;
                case '.jpg':
                case '.jpeg':
                    contentType = 'image/jpeg';
                    break;
                case '.webp':
                    contentType = 'image/webp';
                    break;
            }

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

const PORT = process.argv[2] || 3001;
server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 SEO Test Server running at http://localhost:${PORT}`);
    console.log(`📊 Test your SEO system at: http://localhost:${PORT}/seo/test-seo.html`);
    console.log(`🏠 Main site: http://localhost:${PORT}/index.html`);
    console.log(`Press Ctrl+C to stop the server`);
});

process.on('SIGINT', () => {
    console.log('\n👋 Server stopped');
    process.exit(0);
});
