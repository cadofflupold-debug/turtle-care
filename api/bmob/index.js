// /api/bmob 根路径调试端点
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Session-Token,x-session-token");

  if (req.method === "OPTIONS") return res.status(200).end();

  return res.json({
    status: "ok",
    message: "Bmob API 代理已就绪",
    time: new Date().toISOString(),
    hint: "请通过 /api/bmob/login, /api/bmob/users 等路径访问"
  });
}
