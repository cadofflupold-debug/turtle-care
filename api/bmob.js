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
  // ===== 始终设置 CORS 头 =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Session-Token,x-session-token");

  // ===== OPTIONS 预检 =====
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ===== 调试端点：访问 /api/bmob 时返回状态信息 =====
  const url = new URL(req.url, `http://${req.headers.host}`);
  let proxyPath = url.pathname.replace(/^\/api\/bmob/, "") || "/";
  // 如果路径就是 /api/bmob（没有子路径），返回调试信息
  if (proxyPath === "/") {
    return res.json({
      status: "ok",
      message: "Bmob API 代理已就绪",
      method: req.method,
      time: new Date().toISOString(),
      _debug: { pathname: url.pathname, search: url.search }
    });
  }

  // 保留查询字符串
  const fullPath = url.search ? proxyPath + url.search : proxyPath;

  try {
    console.log(`[Proxy] ${req.method} ${fullPath}`);

    // 构建发往 Bmob 的请求头
    const bmobHeaders = {
      "Content-Type": "application/json",
      "X-Bmob-Application-Id": BMOB_CONFIG.applicationId,
      "X-Bmob-REST-API-Key": BMOB_CONFIG.restApiKey,
      "X-Bmob-Safe-Code": BMOB_CONFIG.safeCode
    };

    if (req.headers["x-session-token"]) {
      bmobHeaders["x-session-token"] = req.headers["x-session-token"];
    }

    // 构建 fetch 选项
    const fetchOpts = { method: req.method, headers: bmobHeaders };

    // 处理请求体
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body) {
        fetchOpts.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }
    }

    // 调用 Bmob API
    const bmobUrl = `${BMOB_CONFIG.apiBase}${fullPath}`;
    const response = await fetch(bmobUrl, fetchOpts);
    const text = await response.text();

    console.log(`[Proxy Response] ${response.status} | ${text.substring(0, 300)}`);

    // 返回响应
    res.status(response.status);

    // 尝试作为 JSON 返回
    if (text.startsWith("{") || text.startsWith("[")) {
      try { return res.json(JSON.parse(text)); } catch(e) {}
    }

    return res.send(text);

  } catch (err) {
    console.error("[Proxy Error]", err);
    return res.status(502).json({ code: 502, error: err.message });
  }
}
