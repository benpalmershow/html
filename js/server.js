import { serve } from "bun";
import { join } from "path";
import { existsSync } from "fs";

// Create a Bun server that serves static files from the html directory
serve({
  port: 8000,
  fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;
    
    // Handle root path
    if (path === "/") {
      path = "/index.html";
    }

    // Skip Vercel and Vite scripts that won't be available locally
    if (path.includes("_vercel") || path.includes("@vercel") || path.includes("@vite")) {
      return new Response("", { status: 200 });
    }

    // Remove leading slash for file path resolution
    if (path.startsWith("/")) {
      path = path.substring(1);
    }

    // Hardcoded base path to the html directory
    const basePath = "/Users/benjaminpalmer/TBPS/html/html";
    let filePath = join(basePath, path);
    
    if (existsSync(filePath)) {
      const file = Bun.file(filePath);
      return new Response(file);
    } else {
      console.log(`File not found: ${filePath}`);
      return new Response("File not found", { status: 404 });
    }
  },
  error(error) {
    return new Response(`<pre>${error}\n${error.stack}</pre>`, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  }
});

console.log("Server running at http://localhost:8000");