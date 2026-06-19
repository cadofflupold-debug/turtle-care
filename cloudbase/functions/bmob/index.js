// CloudBase HTTP Function: Bmob REST proxy
// Listen on port 9000 as required by CloudBase HTTP functions.

const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 9000);

const BMOB_CONFIG = {
  applicationId: process.env.BMOB_APPLICATION_ID || "",
  restApiKey: process.env.BMOB_REST_API_KEY || "",
  safeCode: process.env.BMOB_API_SAFE_CODE || "",
  apiBase: process.env.BMOB_API_BASE || "https://api.bmobcloud.com/1",
  fileApiBase: process.env.BMOB_FILE_API_BASE || "https://api.bmobcloud.com/2"
};

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Session-Token,x-session-token,X-Bmob-Session-Token",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    ...extra
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, corsHeaders({ "Content-Type": "application/json; charset=utf-8" }));
  res.end(JSON.stringify(payload));
}

function validateBmobConfig() {
  const missing = [];
  if (!BMOB_CONFIG.applicationId) missing.push("BMOB_APPLICATION_ID");
  if (!BMOB_CONFIG.restApiKey) missing.push("BMOB_REST_API_KEY");
  if (!BMOB_CONFIG.safeCode) missing.push("BMOB_API_SAFE_CODE");
  return missing;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function normalizeBmobPath(pathname) {
  // CloudBase HTTP gateway can be configured as /api/bmob/* or direct function path.
  let p = pathname.replace(/^\/api\/bmob\/?/, "/");
  p = p.replace(/^\/bmob\/?/, "/");
  if (!p.startsWith("/")) p = "/" + p;
  return p;
}

async function proxyToBmob(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  const missing = validateBmobConfig();
  if (missing.length) {
    return sendJson(res, 500, {
      code: "BMOB_ENV_MISSING",
      error: `Bmob environment variables missing: ${missing.join(", ")}`
    });
  }

  const incomingUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const bmobPath = normalizeBmobPath(incomingUrl.pathname);

  if (!bmobPath || bmobPath === "/") {
    return sendJson(res, 200, {
      status: "ok",
      runtime: "cloudbase-http-function",
      message: "Bmob API proxy is ready",
      time: new Date().toISOString()
    });
  }

  const isFileUpload = bmobPath.startsWith("/2/files/") && req.method === "POST";
  const baseUrl = isFileUpload ? BMOB_CONFIG.fileApiBase : BMOB_CONFIG.apiBase;
  const urlPath = isFileUpload ? bmobPath.replace(/^\/2/, "") : bmobPath;
  const query = incomingUrl.search || "";
  const targetUrl = new URL(`${baseUrl}${urlPath}${query}`);
  const rawBody = await readBody(req);

  const headers = {
    "X-Bmob-Application-Id": BMOB_CONFIG.applicationId,
    "X-Bmob-REST-API-Key": BMOB_CONFIG.restApiKey,
    "X-Bmob-Safe-Code": BMOB_CONFIG.safeCode,
    "Content-Type": isFileUpload ? (req.headers["content-type"] || "application/octet-stream") : "application/json"
  };

  const sessionToken = req.headers["x-session-token"] || req.headers["x-bmob-session-token"];
  if (sessionToken) headers["X-Bmob-Session-Token"] = sessionToken;
  if (rawBody.length && req.method !== "GET" && req.method !== "HEAD") headers["Content-Length"] = rawBody.length;

  const options = {
    hostname: targetUrl.hostname,
    port: 443,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers,
    timeout: 30000
  };

  const proxyReq = https.request(options, proxyRes => {
    const chunks = [];
    proxyRes.on("data", chunk => chunks.push(chunk));
    proxyRes.on("end", () => {
      const data = Buffer.concat(chunks);
      res.writeHead(proxyRes.statusCode || 502, corsHeaders({
        "Content-Type": proxyRes.headers["content-type"] || "application/json; charset=utf-8"
      }));
      res.end(data);
    });
  });

  proxyReq.on("error", err => sendJson(res, 502, { code: 502, error: `Bmob proxy failed: ${err.message}` }));
  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    sendJson(res, 504, { code: 504, error: "Bmob proxy timed out" });
  });

  if (rawBody.length && req.method !== "GET" && req.method !== "HEAD") proxyReq.write(rawBody);
  proxyReq.end();
}

const server = http.createServer((req, res) => {
  proxyToBmob(req, res).catch(err => sendJson(res, 502, { code: 502, error: err.message }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CloudBase Bmob proxy listening on ${PORT}`);
});
