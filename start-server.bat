@echo off

REM SEO Test Server Startup Script (Windows)
REM This script starts a local web server for testing SEO modules

echo 🚀 Starting SEO Test Server...
echo 📊 Test your SEO system at: http://localhost:8080/test-seo.html
echo 🏠 Main site: http://localhost:8080/index.html
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
python -m http.server 8080

pause
