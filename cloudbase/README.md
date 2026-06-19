# 腾讯云 CloudBase 国内测试版部署说明

本目录用于把当前 Vercel 版项目简化迁移到腾讯云 CloudBase，目标是给中国大陆用户一个更稳定的测试入口。

## 架构

```text
大陆用户浏览器
  → CloudBase 静态网站托管：cloudbase/public
  → /api/bmob
  → CloudBase HTTP 云函数：cloudbase/functions/bmob
  → Bmob REST API
```

前端代码仍然使用相对路径 `/api/bmob`，所以只要在 CloudBase HTTP 网关里把 `/api/bmob` 关联到 `bmob` HTTP 云函数，就不需要改 `app.js`。

## 已准备的文件

- `public/`：要上传到静态网站托管的文件。
- `functions/bmob/`：Bmob 代理 HTTP 云函数。
- `cloudbaserc.example.json`：CLI 部署配置模板。
- `build-cloudbase.ps1`：从项目根目录重新复制前端文件到 `public/`。

## 第一步：创建 CloudBase 环境

1. 登录腾讯云。
2. 进入云开发 CloudBase 控制台。
3. 创建一个环境，建议地域选择上海。
4. 记下环境 ID，例如：`xxx-123456`。

官方文档说明：CloudBase 静态托管支持 HTML/CSS/JS 等静态资源；CLI 可用 `tcb hosting deploy` 上传目录；HTTP 网关可以把路径关联到云函数或静态托管。

## 第二步：配置 Bmob 环境变量

在 CloudBase 云函数 `bmob` 的环境变量中配置：

```text
BMOB_APPLICATION_ID=你的 Bmob Application ID
BMOB_REST_API_KEY=你的 Bmob REST API Key
BMOB_API_SAFE_CODE=你的 Bmob API 安全码
BMOB_API_BASE=https://api.bmobcloud.com/1
BMOB_FILE_API_BASE=https://api.bmobcloud.com/2
```

建议在控制台配置真实 Key，不要把真实 Key 写进 Git。

## 第三步：部署云函数

### 控制台方式（最简单）

1. 进入 CloudBase 控制台 → 云函数。
2. 新建 HTTP 云函数，名称：`bmob`。
3. 上传 `functions/bmob` 目录。
4. 运行环境选择 Node.js 18 或更新。
5. 启动文件使用 `scf_bootstrap`。
6. 配置上面的 Bmob 环境变量。
7. 部署。

### CLI 方式

安装并登录：

```powershell
npm i -g @cloudbase/cli
tcb login
```

复制配置：

```powershell
copy cloudbaserc.example.json cloudbaserc.json
```

把 `cloudbaserc.json` 里的 `YOUR_CLOUDBASE_ENV_ID` 改成你的环境 ID。

部署函数：

```powershell
tcb fn deploy bmob -e 你的环境ID
```

## 第四步：配置 HTTP 网关路径

在 CloudBase HTTP 网关/HTTP 访问服务里配置：

```text
/api/bmob/*  →  云函数 bmob
/api/bmob    →  云函数 bmob
/            →  静态网站托管
```

如果控制台不支持两个 `/api/bmob` 规则，就至少配置 `/api/bmob/*`，并测试 `/api/bmob` 健康检查。

健康检查成功时应返回：

```json
{"status":"ok","runtime":"cloudbase-http-function","message":"Bmob API proxy is ready"}
```

## 第五步：部署静态网站

每次前端改动后，先执行：

```powershell
cd C:\Users\CMH\Desktop\turtle\cloudbase
.\build-cloudbase.ps1
```

然后上传 `cloudbase/public` 到静态网站托管。

CLI 方式：

```powershell
tcb hosting deploy .\public -e 你的环境ID
```

## 第六步：测试

打开 CloudBase 默认域名后，测试：

1. 首页能打开；
2. 访问 `/api/bmob` 返回 ready；
3. 注册/登录；
4. 新建龟档案；
5. 获取天气和品种建议。

## 注意

- 这是国内测试版，不影响现有 Vercel 版本。
- Bmob Key 必须只放在云函数环境变量里。
- 如果之后绑定正式域名，建议使用已备案域名，并在 CloudBase HTTP 网关中把 `/` 和 `/api/bmob` 都挂到同一域名下。
