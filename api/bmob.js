// ==========================================================================
// Vercel Serverless Function - Bmob REST API 代理
// 支持：普通 JSON API 请求 + 二进制文件上传
// ==========================================================================

const BMOB_CONFIG = {
  applicationId: "742f16bcc0203f6f8ec2cc222eccacc9",
  restApiKey: "4c9ce5f4b49032086bea11863d0d817e",
  safeCode: "1234567891234567",
  apiBase: "https://api.bmobcloud.com/1",
  fileApiBase: "https://api.bmobcloud.com/2"
};

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
    const fullPath = queryString ? `${pathParam}?${queryString}` : pathParam;

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
    // 因为 bodyParser 被禁用，需要手动读取 req 流
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
        // 文件上传：直接转发原始二进制 Buffer
        fetchOpts.body = rawBody;
        bmobHeaders["Content-Length"] = rawBody.length.toString();
      } else {
        // 普通 JSON 请求：rawBody 是 JSON 字符串
        fetchOpts.body = rawBody.toString("utf-8");
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
