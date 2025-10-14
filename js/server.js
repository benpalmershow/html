import { serve } from "bun";
import { join } from "path";
import { existsSync } from "fs";

// MIME type mapping for better content type handling
const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

// Create a Bun server that serves static files from the html directory
serve({
  port: 8000,
  development: process.env.NODE_ENV !== "production",
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
      
      // Get file extension for content type
      const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";
      
      // Add caching headers for production
      const headers = {
        "Content-Type": contentType
      };
      
      if (process.env.NODE_ENV === "production") {
        // Cache static assets for 1 week in production
        if (ext !== ".html") {
          headers["Cache-Control"] = "public, max-age=604800";
        } else {
          // Don't cache HTML files as aggressively
          headers["Cache-Control"] = "no-cache";
        }
      }
      
      return new Response(file, { headers });
    } else {
      console.log(`File not found: ${filePath}`);
      return new Response("File not found", { 
        status: 404,
        headers: { "Content-Type": "text/plain" }
      });
    }
  },
  error(error) {
    return new Response(`<pre>${error}\n${error.stack}</pre>`, {
      status: 500,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }
});

console.log("Server running at http://localhost:8000");