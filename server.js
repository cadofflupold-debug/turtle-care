// ==========================================================================
// 龟类养护站 - 本地代理服务器 (server.js)
// 解决浏览器代理干扰 Bmob API 的问题
//
// 用法: node server.js
// 然后访问 http://localhost:3000
// ==========================================================================

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const BASE_DIR = path.resolve(__dirname);

// Bmob API 配置（从 app.js 中复制）
const BMOB_APPLICATION_ID = "742f16bcc0203f6f8ec2cc222eccacc9";
const BMOB_REST_API_KEY = "4c9ce5f4b49032086bea11863d0d817e";
const BMOB_API_SAFE_CODE = "1234567891234567";
const BMOB_API_BASE = "https://api.bmobcloud.com/1";

// MIME 类型映射
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
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

// 静态文件服务
function serveStaticFile(res, filePath) {
  const fullPath = path.join(BASE_DIR, filePath);
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
    // 对 HTML 文件注入缓存破坏参数
    if (filePath.endsWith(".html")) {
      const html = data.toString("utf-8");
      const bust = `?t=${Date.now()}`;
      const modified = html
        .replace(/src="app\.js"/, `src="app.js${bust}"`)
        .replace(/href="style\.css"/, `href="style.css${bust}"`)
        .replace(/src="[^"]*Bmob[^"]*"/g, (match) => match + bust);
      res.writeHead(200, { "Content-Type": getMimeType(fullPath), "Cache-Control": "no-cache" });
      res.end(modified);
    } else {
      res.writeHead(200, { 
        "Content-Type": getMimeType(fullPath), 
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      res.end(data);
    }
  });
}

// 转发请求到 Bmob API
function proxyToBmob(req, res, bmobPath) {
  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    // 前端发送 /api/bmob/classes/TurtleRecord → 转发到 /1/classes/TurtleRecord
    const fullUrl = `${BMOB_API_BASE}${bmobPath}`;
    const url = new URL(fullUrl);

    console.log(`[PROXY] ${req.method} → ${fullUrl}`);

    const headers = {
      "Content-Type": "application/json",
      "X-Bmob-Application-Id": BMOB_APPLICATION_ID,
      "X-Bmob-REST-API-Key": BMOB_REST_API_KEY,
      "X-Bmob-Safe-Code": BMOB_API_SAFE_CODE
    };

    // 如果请求中带有 session token，透传
    if (req.headers["x-session-token"]) {
      headers["X-Bmob-Session-Token"] = req.headers["x-session-token"];
    }

    console.log(`[PROXY] ${req.method} → ${url.pathname}${url.search}`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: req.method,
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(body)
      },
      timeout: 20000
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let responseData = "";
      proxyRes.on("data", chunk => responseData += chunk);
      proxyRes.on("end", () => {
        console.log(`[RESP] ${proxyRes.statusCode} | ${responseData.substring(0, 200)}`);
        res.writeHead(proxyRes.statusCode, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
        });
        res.end(responseData);
      });
    });

    proxyReq.on("error", (err) => {
      console.error("[ERROR]", err.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code: -1, error: `代理转发失败: ${err.message}` }));
    });

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      res.writeHead(504, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code: -1, error: "Bmob 服务器响应超时" }));
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
}

// 主 HTTP 服务器
const server = http.createServer((req, res) => {
  // CORS 预检处理
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Max-Age": "86400"
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // API 代理路由：/api/bmob/* → api.bmobcloud.com/1/*
  if (pathname.startsWith("/api/bmob/")) {
    const bmobPath = pathname.replace("/api/bmob/", "/") + url.search;
    proxyToBmob(req, res, bmobPath);
    return;
  }

  // 默认：静态文件服务
  let filePath = pathname === "/" ? "/index.html" : pathname;
  serveStaticFile(res, filePath);
});

server.listen(PORT, () => {
  console.log("");
  console.log("=========================================");
  console.log("  🐢 龟类养护站 - 本地开发服务器");
  console.log("=========================================");
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  目录: ${BASE_DIR}`);
  console.log("");
  console.log("  按 Ctrl+C 停止服务器");
  console.log("=========================================\n");
});
