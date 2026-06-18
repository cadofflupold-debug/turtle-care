// ==========================================================================
// Vercel Serverless Function - Bmob REST API 代理 (Catch-All 路由)
// ==========================================================================
// 文件名 [...path].js 使 Vercel 自动将 /api/bmob/* 的所有子路径
// 都路由到此函数，req.query.path 包含完整的子路径数组
// 例如: /api/bmob/login?username=xxx → req.query.path = ["login"]

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
    // ===== 从 req.query.path 重建 Bmob API 路径 =====
    // Vercel catch-all 路由: /api/bmob/login → path = ["login"]
    //                       /api/bmob/classes/TurtleRecord → path = ["classes","TurtleRecord"]
    //                       /api/bmob/users/me → path = ["users","me"]
    const pathSegments = req.query.path;
    let proxyPath;

    if (!pathSegments || (Array.isArray(pathSegments) && pathSegments.length === 0)) {
      // 没有子路径 → 调试端点
      return res.json({
        status: "ok",
        message: "Bmob API 代理已就绪",
        time: new Date().toISOString()
      });
    }

    // 把路径段拼接成 /login 或 /classes/TurtleRecord
    const segments = Array.isArray(pathSegments) ? pathSegments : [pathSegments];
    proxyPath = "/" + segments.join("/");

    // 重建查询字符串
    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryString = url.search || "";

    // 完整的 Bmob API 路径
    const fullPath = queryString ? proxyPath + queryString : proxyPath;
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
