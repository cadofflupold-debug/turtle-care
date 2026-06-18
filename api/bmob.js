// ==========================================================================
// Vercel Serverless Function - Bmob REST API 代理
// ==========================================================================
// 作用：在 Vercel 公网部署环境下代理前端对 Bmob 后端云的所有请求
// 原因：避免浏览器直接跨域请求 Bmob API 时的网络/安全限制

const https = require("https");

// ===== Bmob 认证信息（服务端安全存储） =====
const BMOB_CONFIG = {
  applicationId: "742f16bcc0203f6f8ec2cc222eccacc9",
  restApiKey: "4c9ce5f4b49032086bea11863d0d817e",
  safeCode: "1234567891234567",
  apiBase: "https://api.bmobcloud.com/1"
};

/**
 * 转发请求到 Bmob API（使用原生 fetch 兼容 Vercel 运行时）
 */
async function bmobProxyFetch(method, fullPath, headers, body) {
  const url = `${BMOB_CONFIG.apiBase}${fullPath}`;

  // 构建请求头
  const fetchHeaders = {
    "Content-Type": "application/json",
    "X-Bmob-Application-Id": BMOB_CONFIG.applicationId,
    "X-Bmob-REST-API-Key": BMOB_CONFIG.restApiKey,
    "X-Bmob-Safe-Code": BMOB_CONFIG.safeCode
  };

  // 转发 session token
  if (headers["x-session-token"]) {
    fetchHeaders["x-session-token"] = headers["x-session-token"];
  }

  // 构建请求选项
  const fetchOptions = {
    method: method,
    headers: fetchHeaders
  };

  // 处理请求体
  if (body && method !== "GET" && method !== "HEAD") {
    if (typeof body === "object" && !(body instanceof Buffer)) {
      fetchOptions.body = JSON.stringify(body);
    } else if (body instanceof Buffer) {
      fetchOptions.body = body;
      // 文件上传使用原始 content-type
      const ct = headers["content-type"] || "";
      if (ct && !ct.includes("application/json")) {
        fetchHeaders["Content-Type"] = ct;
      }
    }
  }

  console.log(`[Bmob Proxy] ${method} ${url}`);

  const response = await fetch(url, fetchOptions);
  const responseText = await response.text();

  console.log(`[Bmob Proxy Response] status=${response.status} body=${responseText.substring(0, 200)}`);

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseText
  };
}

/**
 * Vercel Serverless Function 入口
 */
export default async function handler(req, res) {
  // 设置 CORS 头（所有响应都需要）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Session-Token,x-session-token");

  // CORS 预检
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 从 URL 中提取要转发的完整路径（含查询字符串）
    const fullUrl = new URL(req.url, `http://${req.headers.host}`);
    const proxyPath = fullUrl.pathname.replace(/^\/api\/bmob/, "") || "/";
    const queryString = fullUrl.search || "";
    const fullPath = queryString ? proxyPath + queryString : proxyPath;

    console.log(`[Request] ${req.method} ${fullPath}`);

    // 收集请求体
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      // Vercel 会自动解析 JSON body
      if (typeof req.body === "string") {
        try { body = JSON.parse(req.body); } catch(e) { body = req.body; }
      } else {
        body = req.body;
      }
    }

    // 转发到 Bmob
    const result = await bmobProxyFetch(req.method, fullPath, req.headers || {}, body);

    // 转发 Bmob 的响应状态和内容
    res.status(result.status);

    const contentType = result.headers["content-type"] || "";

    if (contentType.includes("application/json") || result.body.startsWith("{") || result.body.startsWith("[")) {
      // 尝试解析并返回 JSON
      try {
        const jsonBody = JSON.parse(result.body);
        return res.json(jsonBody);
      } catch(e) {
        // 解析失败，直接返回文本
        return res.send(result.body);
      }
    } else {
      return res.send(result.body);
    }

  } catch (error) {
    console.error("[Bmob Proxy Error]", error.message, error.stack);
    return res.status(502).json({
      code: 502,
      error: "Bmob 代理服务器错误",
      message: error.message
    });
  }
}
