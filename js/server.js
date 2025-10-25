import { serve } from "bun";
import { join, extname } from "path";

// MIME type mapping for better content type handling
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
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

const isProduction = process.env.NODE_ENV === "production";
const publicDir = join(import.meta.dir, "..");

// --- Authorization Helpers ---

function isAuthorized(request) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASS;
  if (!expectedUser || !expectedPass) {
    // If auth variables are not set, disable auth.
    // For production, you should probably return false here.
    console.warn("Basic auth credentials not set. Server is unprotected.");
    return true;
  }
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Basic ")) return false;
  try {
    const token = auth.slice(6);
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [user, pass] = decoded.split(":");
    return user === expectedUser && pass === expectedPass;
  } catch (error) {
    console.error("Error decoding auth token:", error);
    return false;
  }
}

function unauthorizedResponse(isJson = false) {
  const headers = { "WWW-Authenticate": "Basic realm=Private" };
  if (isJson) {
    headers["Content-Type"] = "application/json";
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
  }
  headers["Content-Type"] = "text/plain";
  return new Response("Unauthorized", { status: 401, headers });
}

// --- API Handlers ---

async function handleJournalUpdate(request) {
  try {
    const { date, title, content } = await request.json();
    if (!date || !title || !content) {
      return Response.json({ error: "Missing required fields: date, title, content" }, { status: 400 });
    }

    const journalPath = join(publicDir, "json/journal.json");
    const journalData = await Bun.file(journalPath).json();

    let dateEntry = journalData.find(entry => entry.date === date);
    if (dateEntry) {
      dateEntry.entries.unshift({ title, content });
    } else {
      journalData.unshift({ date, entries: [{ title, content }] });
    }

    await Bun.write(journalPath, JSON.stringify(journalData, null, 2));
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating journal:", error);
    return Response.json({ error: "Failed to update journal", details: error.message }, { status: 500 });
  }
}

async function handlePostUpdate(request) {
  try {
    const { date, content } = await request.json();
    if (!date || !content) {
      return Response.json({ error: "Missing required fields: date, content" }, { status: 400 });
    }

    const postsPath = join(publicDir, "json/posts.json");
    const postsData = await Bun.file(postsPath).json();

    postsData.unshift({ date, content });

    await Bun.write(postsPath, JSON.stringify(postsData, null, 2));
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating posts:", error);
    return Response.json({ error: "Failed to update posts", details: error.message }, { status: 500 });
  }
}

// --- Static File Server ---

async function serveStaticFile(request) {
  let path = new URL(request.url).pathname;
  if (path === "/") path = "/index.html";

  // Skip Vercel/Vite specific scripts
  if (path.includes("_vercel") || path.includes("@vercel") || path.includes("@vite")) {
    return new Response("", { status: 204 });
  }

  const filePath = join(publicDir, path);
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    console.log(`File not found: ${filePath}`);
    return new Response("File not found", { status: 404 });
  }

  const ext = extname(path).toLowerCase();
  const headers = { "Content-Type": mimeTypes[ext] || "application/octet-stream" };

  if (path.endsWith("/post-creator.html")) {
    if (!isAuthorized(request)) return unauthorizedResponse();
    headers["X-Robots-Tag"] = "noindex, nofollow";
  }

  if (isProduction) {
    headers["Cache-Control"] = ext === ".html" ? "no-cache" : "public, max-age=604800";
  }

  return new Response(file, { headers });
}

// --- Main Server ---

serve({
  port: 8000,
  development: !isProduction,
  async fetch(req) {
    const path = new URL(req.url).pathname;

    // API Router
    if (path.startsWith("/api/")) {
      if (!isAuthorized(req)) return unauthorizedResponse(true);
      if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

      if (path === "/api/update-journal") return handleJournalUpdate(req);
      if (path === "/api/update-post") return handlePostUpdate(req);
    }

    // Static file serving
    if (req.method === "GET" || req.method === "HEAD") {
      return serveStaticFile(req);
    }

    return new Response("Not Found", { status: 404 });
  },
  error(error) {
    return new Response(`<pre>${error}\n${error.stack}</pre>`, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`Server running at http://localhost:8000 (Production: ${isProduction})`);