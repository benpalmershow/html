#!/bin/bash
# Development server startup script for Howdy, Stranger

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "Bun is not installed. Installing..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

# Start the server
echo "Starting development server at http://localhost:8000"
bun run js/server.js
