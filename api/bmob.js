// ==========================================================================
// Vercel Serverless Function - Bmob REST API 代理
// ==========================================================================
// 作用：在 Vercel 公网部署环境下，代理前端对 Bmob 后端云的所有请求
// 原因：避免浏览器直接跨域请求 Bmob API 时的网络/安全限制
//       同时自动注入认证头，避免在前端暴露密钥

const https = require("https");

// ===== Bmob 认证信息（服务端安全存储） =====
const BMOB_CONFIG = {
  applicationId: "742f16bcc0203f6f8ec2cc222eccacc9",
  restApiKey: "4c9ce5f4b49032086bea11863d0d817e",
  safeCode: "1234567891234567",
  apiBase: "https://api.bmobcloud.com/1"
};

/**
 * 转发请求到 Bmob API
 */
function bmobProxyRequest(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const url = `${BMOB_CONFIG.apiBase}${path}`;
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "X-Bmob-Application-Id": BMOB_CONFIG.applicationId,
        "X-Bmob-REST-API-Key": BMOB_CONFIG.restApiKey,
        "X-Bmob-Safe-Code": BMOB_CONFIG.safeCode,
        // 转发 session token（如果有）
        ...(headers["x-session-token"] && { "x-session-token": headers["x-session-token"] }),
        // 文件上传时需要正确的 Content-Type
        ...(headers["content-type"] && !headers["content-type"].includes("application/json") && { "Content-Type": headers["content-type"] })
      }
    };

    // 对于非 JSON body（如文件上传），不重新序列化
    let reqBody = body;
    if (body && typeof body === "object" && !(body instanceof Buffer)) {
      reqBody = JSON.stringify(body);
      options.headers["Content-Length"] = Buffer.byteLength(reqBody);
    } else if (body instanceof Buffer) {
      options.headers["Content-Length"] = body.length;
    }

    const req = https.request(options, (res) => {
      let data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(data);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: buffer
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.setTimeout(15000, () => { req.destroy(new Error("Bmob API 请求超时")); });

    if (reqBody) {
      req.write(reqBody);
    }
    req.end();
  });
}

/**
 * Vercel Serverless Function 入口
 */
export default async function handler(req, res) {
  // 只允许 POST / GET / PUT / DELETE 方法
  const allowedMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // CORS 预检
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Session-Token,x-session-token,X-Bmob-Application-Id,X-Bmob-REST-API-Key,X-Bmob-Safe-Code");
    return res.status(200).end();
  }

  try {
    // 从 URL 中提取要转发的路径（包含查询字符串）
    // 请求格式: /api/bmob/login?username=xxx&password=xxx
    //           /api/bmob/classes/TurtleRecord
    //           /api/bmob/users/me
    const fullUrl = new URL(req.url, `http://${req.headers.host}`);
    const proxyPath = fullUrl.pathname.replace(/^\/api\/bmob/, "") || "/";
    // 保留原始查询字符串
    const queryString = fullUrl.search;  // 包含 "?" 的完整查询字符串
    const fullPath = queryString ? proxyPath + queryString : proxyPath;

    console.log(`[Bmob Proxy] ${req.method} ${fullPath}`);

    // 收集请求 body
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await collectBody(req);
    }

    // 转发到 Bmob（包含查询字符串）
    const result = await bmobProxyRequest(req.method, fullPath, req.headers || {}, body);

    // 设置 CORS 头
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Session-Token,x-session-token");

    // 转发 Bmob 的响应
    res.status(result.status);
    
    // 尝试返回 JSON，否则返回原始内容
    const contentType = result.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      try {
        const jsonBody = JSON.parse(result.body.toString());
        return res.json(jsonBody);
      } catch(e) {
        return res.send(result.body);
      }
    } else {
      res.setHeader("Content-Type", contentType);
      return res.send(result.body);
    }

  } catch (error) {
    console.error("[Bmob Proxy Error]", error.message);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(502).json({
      code: 502,
      error: "Bmob 代理服务器错误",
      message: error.message
    });
  }
}

/**
 * 收集请求体
 */
function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) return resolve(null);
      
      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        try {
          resolve(JSON.parse(buffer.toString()));
        } catch(e) {
          resolve(buffer.toString());
        }
      } else {
        resolve(buffer); // 文件等二进制数据
      }
    });
    req.on("error", reject);
  });
}
