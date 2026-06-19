param(
  [string]$ProjectRoot = ".."
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir $ProjectRoot)
$public = Join-Path $scriptDir "public"

New-Item -ItemType Directory -Force -Path $public | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $public "assets") | Out-Null

Copy-Item -LiteralPath (Join-Path $root "index.html") -Destination (Join-Path $public "index.html") -Force
Copy-Item -LiteralPath (Join-Path $root "app.js") -Destination (Join-Path $public "app.js") -Force
Copy-Item -LiteralPath (Join-Path $root "style.css") -Destination (Join-Path $public "style.css") -Force

$assets = Join-Path $root "assets"
if (Test-Path $assets) {
  Copy-Item -LiteralPath (Join-Path $assets "*") -Destination (Join-Path $public "assets") -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "CloudBase static files prepared at: $public"
