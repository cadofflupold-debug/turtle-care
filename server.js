// ===========================================================================
// Turtle care site - local proxy server (server.js)
// Usage: node server.js, then open http://localhost:3000
// Security: Bmob keys are read from environment variables or local .env only.
// ===========================================================================

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const BASE_DIR = path.resolve(__dirname);

function loadLocalEnvFile() {
  const envPath = path.join(BASE_DIR, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnvFile();

const BMOB_CONFIG = {
  applicationId: process.env.BMOB_APPLICATION_ID || "",
  restApiKey: process.env.BMOB_REST_API_KEY || "",
  safeCode: process.env.BMOB_API_SAFE_CODE || "",
  apiBase: process.env.BMOB_API_BASE || "https://api.bmobcloud.com/1",
  fileApiBase: process.env.BMOB_FILE_API_BASE || "https://api.bmobcloud.com/2"
};

function validateBmobConfig() {
  const missing = [];
  if (!BMOB_CONFIG.applicationId) missing.push("BMOB_APPLICATION_ID");
  if (!BMOB_CONFIG.restApiKey) missing.push("BMOB_REST_API_KEY");
  if (!BMOB_CONFIG.safeCode) missing.push("BMOB_API_SAFE_CODE");
  return missing;
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Session-Token,x-session-token,X-Bmob-Session-Token",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(res, filePath) {
  const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(BASE_DIR, safePath);

  if (!fullPath.startsWith(BASE_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    if (filePath.endsWith(".html")) {
      const html = data.toString("utf-8");
      const bust = `?t=${Date.now()}`;
      const modified = html
        .replace(/src="app\.js"/, `src="app.js${bust}"`)
        .replace(/href="style\.css"/, `href="style.css${bust}"`);
      res.writeHead(200, { "Content-Type": getMimeType(fullPath), "Cache-Control": "no-cache" });
      res.end(modified);
      return;
    }

    res.writeHead(200, {
      "Content-Type": getMimeType(fullPath),
      "Cache-Control": "no-cache, no-store, must-revalidate"
    });
    res.end(data);
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function proxyToBmob(req, res, bmobPath, queryString = "") {
  const missing = validateBmobConfig();
  if (missing.length) {
    return sendJson(res, 500, {
      code: "BMOB_ENV_MISSING",
      error: `Bmob environment variables missing: ${missing.join(", ")}`
    });
  }

  if (!bmobPath || bmobPath === "/") {
    return sendJson(res, 200, {
      status: "ok",
      message: "Bmob API proxy is ready",
      time: new Date().toISOString()
    });
  }

  const isFileUpload = bmobPath.startsWith("/2/files/") && req.method === "POST";
  const baseUrl = isFileUpload ? BMOB_CONFIG.fileApiBase : BMOB_CONFIG.apiBase;
  const urlPath = isFileUpload ? bmobPath.replace(/^\/2/, "") : bmobPath;
  const fullUrl = `${baseUrl}${urlPath}${queryString}`;
  const url = new URL(fullUrl);
  const rawBody = await readRequestBody(req);

  const headers = {
    "X-Bmob-Application-Id": BMOB_CONFIG.applicationId,
    "X-Bmob-REST-API-Key": BMOB_CONFIG.restApiKey,
    "X-Bmob-Safe-Code": BMOB_CONFIG.safeCode,
    "Content-Type": isFileUpload ? (req.headers["content-type"] || "application/octet-stream") : "application/json"
  };

  const sessionToken = req.headers["x-session-token"] || req.headers["x-bmob-session-token"];
  if (sessionToken) headers["X-Bmob-Session-Token"] = sessionToken;
  if (rawBody.length && req.method !== "GET" && req.method !== "HEAD") headers["Content-Length"] = rawBody.length;

  console.log(`[PROXY] ${req.method} ? ${url.pathname}${url.search}`);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: req.method,
    headers,
    timeout: 30000
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const chunks = [];
    proxyRes.on("data", chunk => chunks.push(chunk));
    proxyRes.on("end", () => {
      const responseData = Buffer.concat(chunks);
      console.log(`[RESP] ${proxyRes.statusCode} | ${responseData.toString("utf-8").substring(0, 200)}`);
      res.writeHead(proxyRes.statusCode, {
        "Content-Type": proxyRes.headers["content-type"] || "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Session-Token,x-session-token,X-Bmob-Session-Token",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
      });
      res.end(responseData);
    });
  });

  proxyReq.on("error", (err) => {
    console.error("[ERROR]", err.message);
    sendJson(res, 502, { code: 502, error: `Proxy forwarding failed: ${err.message}` });
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    sendJson(res, 504, { code: 504, error: "Bmob server response timed out" });
  });

  if (rawBody.length && req.method !== "GET" && req.method !== "HEAD") proxyReq.write(rawBody);
  proxyReq.end();
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,X-Session-Token,x-session-token,X-Bmob-Session-Token",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Max-Age": "86400"
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname === "/api/bmob" || pathname.startsWith("/api/bmob/")) {
    const bmobPath = pathname.replace(/^\/api\/bmob\/?/, "/");
    const queryString = url.search || "";
    proxyToBmob(req, res, bmobPath, queryString).catch((err) => {
      console.error("[PROXY ERROR]", err);
      sendJson(res, 502, { code: 502, error: err.message });
    });
    return;
  }

  const filePath = pathname === "/" ? "/index.html" : pathname;
  serveStaticFile(res, filePath);
});

server.listen(PORT, () => {
  console.log("");
  console.log("=========================================");
  console.log("  Turtle care site - local development server");
  console.log("=========================================");
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Directory: ${BASE_DIR}`);
  console.log("  Bmob: keys are read from environment variables or local .env");
  console.log("");
  console.log("  Press Ctrl+C to stop the server");
  console.log("=========================================\n");
});
