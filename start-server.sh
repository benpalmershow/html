#!/bin/bash

# SEO Test Server Startup Script
# This script starts a local web server for testing SEO modules

echo "🚀 Starting SEO Test Server..."
echo "📊 Test your SEO system at: http://localhost:8080/test-seo.html"
echo "🏠 Main site: http://localhost:8080/index.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 -m http.server 8080
