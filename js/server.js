import { serve } from "bun";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";

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
    // Basic Auth helpers
    function isAuthorized(request) {
      const auth = request.headers.get("Authorization") || "";
      if (!auth.startsWith("Basic ")) return false;
      try {
        const token = auth.slice(6);
        const decoded = Buffer.from(token, "base64").toString("utf8");
        const [user, pass] = decoded.split(":");
        const expectedUser = process.env.BASIC_AUTH_USER || "admin";
        const expectedPass = process.env.BASIC_AUTH_PASS || "admin";
        return user === expectedUser && pass === expectedPass;
      } catch {
        return false;
      }
    }

    function unauthorizedResponse() {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "Content-Type": "text/plain",
          "WWW-Authenticate": "Basic realm=Private"
        }
      });
    }

    function unauthorizedResponseJson() {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": "Basic realm=Private"
        }
      });
    }
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

      // Protect private editor page with Basic Auth and discourage indexing
      if (path === "post-creator.html") {
        if (!isAuthorized(req)) return unauthorizedResponse();
        headers["X-Robots-Tag"] = "noindex, nofollow";
      }
      
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
    } else if (path === "api/update-journal") {
      // Handle journal update API
      if (!isAuthorized(req)) return unauthorizedResponseJson();
      if (req.method === "POST") {
        return handleJournalUpdate(req);
      }
    } else if (path === "api/update-post") {
      // Handle post update API
      if (!isAuthorized(req)) return unauthorizedResponseJson();
      if (req.method === "POST") {
        return handlePostUpdate(req);
      }
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

// Handle journal update API
async function handleJournalUpdate(req) {
  try {
    const data = await req.json();
    const { date, title, content } = data;
    
    if (!date || !title || !content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Read the existing journal.json file
    const journalPath = "/Users/benjaminpalmer/TBPS/html/html/json/journal.json";
    const journalData = JSON.parse(readFileSync(journalPath, "utf-8"));
    
    // Check if there's already an entry for this date
    let dateEntry = journalData.find(entry => entry.date === date);
    
    if (dateEntry) {
      // Add to existing date entry
      dateEntry.entries.unshift({ title, content });
    } else {
      // Create new date entry
      journalData.unshift({
        date,
        entries: [{ title, content }]
      });
    }
    
    // Write the updated data back to the file
    writeFileSync(journalPath, JSON.stringify(journalData, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error updating journal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Handle post update API
async function handlePostUpdate(req) {
  try {
    const data = await req.json();
    const { date, content } = data;
    
    if (!date || !content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Read the existing posts.json file
    const postsPath = "/Users/benjaminpalmer/TBPS/html/html/json/posts.json";
    const postsData = JSON.parse(readFileSync(postsPath, "utf-8"));
    
    // Add new post at the beginning of the array
    postsData.unshift({
      date,
      content
    });
    
    // Write the updated data back to the file
    writeFileSync(postsPath, JSON.stringify(postsData, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error updating posts:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

console.log("Server running at http://localhost:8000");