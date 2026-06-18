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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Session-Token,x-session-token,X-Bmob-Session-Token");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // ===== 提取要转发的 Bmob API 路径 =====
    // vercel.json rewrite: /api/bmob/:path* → /api/bmob?path=:path*
    // 所以 req.query.path 包含原始路径剩余部分（如 "classes/TurtleRecord"）
    let pathParam = req.query.path || "";

    // 兼容：如果没有 query.path，从 URL pathname 提取
    if (!pathParam) {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      pathParam = parsedUrl.pathname.replace(/^\/api\/bmob\/?/, "");
    }

    // 健康检查
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

    // ===== 构建查询字符串 =====
    // 关键：req.url 中混入了 rewrite 注入的 path 参数，需要排除它
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const searchParams = new URLSearchParams(parsedUrl.search);
    // 删除 rewrite 注入的 path 参数，只保留原始业务查询参数（如 where, order, limit 等）
    searchParams.delete("path");
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathParam}?${queryString}` : pathParam;
    const bmobUrl = `${BMOB_CONFIG.apiBase}${fullPath}`;

    console.log(`[Proxy] ${req.method} → ${bmobUrl}`);

    // ===== 构建发往 Bmob 的请求头 =====
    const bmobHeaders = {
      "Content-Type": "application/json",
      "X-Bmob-Application-Id": BMOB_CONFIG.applicationId,
      "X-Bmob-REST-API-Key": BMOB_CONFIG.restApiKey,
      "X-Bmob-Safe-Code": BMOB_CONFIG.safeCode
    };

    // 转发 session token — Bmob REST API 要求 header 名为 X-Bmob-Session-Token
    const sessionToken = req.headers["x-session-token"] || req.headers["x-bmob-session-token"];
    if (sessionToken) {
      bmobHeaders["X-Bmob-Session-Token"] = sessionToken;
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
