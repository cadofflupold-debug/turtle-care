// ==========================================================================
// Vercel Serverless Function - Bmob REST API 代理
// ==========================================================================

const BMOB_CONFIG = {
  applicationId: "742f16bcc0203f6f8ec2cc222eccacc9",
  restApiKey: "4c9ce5f4b49032086bea11863d0d817e",
  safeCode: "1234567891234567",
  apiBase: "https://api.bmobcloud.com/1"
};

export default async function handler(req, res) {
  // ===== CORS 头 =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Session-Token,x-session-token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Vercel 会在 req.query 中传入路径参数
    // vercel.json 中配置了 rewrite: /api/bmob/(.*) → /api/bmob?path=$1
    // 所以 req.query.path 包含原始路径的剩余部分
    let pathParam = req.query.path || "";
    
    // 也尝试从 req.url 中提取路径（兼容不同 Vercel 版本）
    if (!pathParam) {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      let full_path = parsedUrl.pathname.replace(/^\/api\/bmob\/?/, "");
      pathParam = full_path;
    }

    // 如果没有路径参数，返回调试信息
    if (!pathParam || pathParam === "") {
      return res.json({
        status: "ok",
        message: "Bmob API 代理已就绪",
        time: new Date().toISOString(),
        _debug: { url: req.url, query: req.query }
      });
    }

    // 确保路径以 / 开头
    if (!pathParam.startsWith("/")) pathParam = "/" + pathParam;

    // 获取查询字符串
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const queryString = parsedUrl.search || "";
    const fullPath = queryString ? pathParam + queryString : pathParam;
    const bmobUrl = `${BMOB_CONFIG.apiBase}${fullPath}`;

    console.log(`[Proxy] ${req.method} → ${bmobUrl}`);

    // ===== 构建发往 Bmob 的请求 =====
    const bmobHeaders = {
      "Content-Type": "application/json",
      "X-Bmob-Application-Id": BMOB_CONFIG.applicationId,
      "X-Bmob-REST-API-Key": BMOB_CONFIG.restApiKey,
      "X-Bmob-Safe-Code": BMOB_CONFIG.safeCode
    };

    if (req.headers["x-session-token"]) {
      bmobHeaders["x-session-token"] = req.headers["x-session-token"];
    }

    const fetchOpts = { method: req.method, headers: bmobHeaders };

    // 处理 POST/PUT 请求体
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOpts.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
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
