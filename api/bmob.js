// ==========================================================================
// Vercel Serverless Function - Bmob REST API 代理
// 支持：普通 JSON API 请求 + 二进制文件上传
// 安全说明：Bmob Key 必须通过 Vercel Environment Variables 注入，禁止写入前端代码。
// ==========================================================================

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

// 对于文件上传请求，禁用 bodyParser 以获取原始二进制数据
export const config = {
  api: {
    bodyParser: false
  }
};

// 读取可读流的全部内容为 Buffer
function readStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export default async function handler(req, res) {
  // ===== CORS 头 =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Session-Token,x-session-token,X-Bmob-Session-Token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const missing = validateBmobConfig();
  if (missing.length) {
    return res.status(500).json({
      code: "BMOB_ENV_MISSING",
      error: `Bmob 环境变量缺失：${missing.join(", ")}`
    });
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

    // ===== 构建查询字符串 =====
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const searchParams = new URLSearchParams(parsedUrl.search);
    searchParams.delete("path");
    const queryString = searchParams.toString();

    // ===== 判断请求类型 =====
    const isFileUpload = pathParam.startsWith("/2/files/") && req.method === "POST";

    // 选择正确的 API base URL
    let baseUrl, urlPath;
    if (isFileUpload) {
      baseUrl = BMOB_CONFIG.fileApiBase;
      urlPath = pathParam.replace(/^\/2/, "");
    } else {
      baseUrl = BMOB_CONFIG.apiBase;
      urlPath = pathParam;
    }
    const bmobUrl = baseUrl + (queryString ? `${urlPath}?${queryString}` : urlPath);

    console.log(`[Proxy] ${req.method} -> ${bmobUrl} | fileUpload: ${isFileUpload} | content-type: ${req.headers["content-type"]}`);

    // ===== 读取请求体 =====
    const rawBody = await readStream(req);

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

    // ===== 设置请求体 =====
    if (req.method !== "GET" && req.method !== "HEAD" && rawBody.length > 0) {
      if (isFileUpload) {
        fetchOpts.body = rawBody;
        bmobHeaders["Content-Length"] = rawBody.length.toString();
      } else {
        fetchOpts.body = rawBody.toString("utf-8");
      }
    }

    // ===== 调用 Bmob API =====
    const response = await fetch(bmobUrl, fetchOpts);
    const text = await response.text();

    console.log(`[Response] ${response.status} | ${text.substring(0, 300)}`);

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
