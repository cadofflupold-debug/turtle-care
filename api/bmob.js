// ==========================================================================
// Vercel Serverless Function - Bmob REST API 代理
// 支持：普通 JSON API 请求 + 二进制文件上传
// ==========================================================================

const BMOB_CONFIG = {
  applicationId: "742f16bcc0203f6f8ec2cc222eccacc9",
  restApiKey: "4c9ce5f4b49032086bea11863d0d817e",
  safeCode: "1234567891234567",
  // 普通 API: https://api.bmobcloud.com/1/classes/TurtleRecord
  apiBase: "https://api.bmobcloud.com/1",
  // 文件上传 API: https://api.bmobcloud.com/2/files/文件名
  fileApiBase: "https://api.bmobcloud.com/2"
};

// 允许大文件上传
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4.5mb"
    }
  }
};

export default async function handler(req, res) {
  // ===== CORS 头 =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Session-Token,x-session-token,X-Bmob-Session-Token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // ===== 提取要转发的 Bmob API 路径 =====
    let pathParam = req.query.path || "";

    if (!pathParam) {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      pathParam = parsedUrl.pathname.replace(/^\/api\/bmob\/?/, "");
    }

    if (!pathParam || pathParam === "") {
      return res.json({
        status: "ok",
        message: "Bmob API 代理已就绪",
        time: new Date().toISOString()
      });
    }

    if (!pathParam.startsWith("/")) pathParam = "/" + pathParam;

    // ===== 构建查询字符串（排除 rewrite 注入的 path 参数）=====
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const searchParams = new URLSearchParams(parsedUrl.search);
    searchParams.delete("path");
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathParam}?${queryString}` : pathParam;

    // ===== 判断请求类型 =====
    // 文件上传: POST /2/files/文件名
    const isFileUpload = pathParam.startsWith("/2/files/") && req.method === "POST";

    // 选择正确的 API base URL
    // 文件上传用 fileApiBase (https://api.bmobcloud.com/2)
    // 普通 API 用 apiBase (https://api.bmobcloud.com/1)
    let baseUrl;
    let urlPath;
    if (isFileUpload) {
      // pathParam 是 /2/files/xxx.jpg，fileApiBase 是 https://api.bmobcloud.com/2
      // 所以需要去掉 pathParam 开头的 /2，变成 /files/xxx.jpg
      baseUrl = BMOB_CONFIG.fileApiBase;
      urlPath = pathParam.replace(/^\/2/, ""); // /files/xxx.jpg
    } else {
      baseUrl = BMOB_CONFIG.apiBase;
      urlPath = pathParam;
    }
    const bmobUrl = baseUrl + (queryString ? `${urlPath}?${queryString}` : urlPath);

    console.log(`[Proxy] ${req.method} → ${bmobUrl} | fileUpload: ${isFileUpload} | content-type: ${req.headers["content-type"]}`);

    // ===== 构建发往 Bmob 的请求头 =====
    const bmobHeaders = {
      "X-Bmob-Application-Id": BMOB_CONFIG.applicationId,
      "X-Bmob-REST-API-Key": BMOB_CONFIG.restApiKey,
      "X-Bmob-Safe-Code": BMOB_CONFIG.safeCode
    };

    if (isFileUpload) {
      bmobHeaders["Content-Type"] = req.headers["content-type"] || "application/octet-stream";
    } else {
      bmobHeaders["Content-Type"] = "application/json";
    }

    // 转发 session token
    const sessionToken = req.headers["x-session-token"] || req.headers["x-bmob-session-token"];
    if (sessionToken) {
      bmobHeaders["X-Bmob-Session-Token"] = sessionToken;
    }

    const fetchOpts = { method: req.method, headers: bmobHeaders };

    // ===== 处理请求体 =====
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (isFileUpload && req.body) {
        // 文件上传：把 body 转为 Buffer 以保留二进制数据
        // Vercel bodyParser 把 body 解析为 string (UTF-8)，用 latin1 编码转回 Buffer 保留原始字节
        const bodyBuffer = Buffer.from(req.body, "latin1");
        fetchOpts.body = bodyBuffer;
        bmobHeaders["Content-Length"] = bodyBuffer.length.toString();
      } else if (req.body) {
        fetchOpts.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }
    }

    // ===== 调用 Bmob API =====
    const response = await fetch(bmobUrl, fetchOpts);
    const text = await response.text();

    console.log(`[Response] ${response.status} | ${text.substring(0, 300)}`);

    // ===== 返回响应 =====
    res.status(response.status);

    if (text.startsWith("{") || text.startsWith("[")) {
      try { return res.json(JSON.parse(text)); } catch(e) {}
    }

    return res.send(text);

  } catch (err) {
    console.error("[Proxy Error]", err);
    return res.status(502).json({ code: 502, error: err.message });
  }
}
