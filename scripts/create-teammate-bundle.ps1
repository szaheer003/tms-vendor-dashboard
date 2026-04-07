<#
.SYNOPSIS
  Builds FIS-TMS-Dashboard-Cursor-Handoff.zip — a Cursor-ready source tree for a teammate.

.DESCRIPTION
  - Excludes: node_modules, .next, out, .git, .cursor, export PDFs, review zips, embedded HTML cruft.
  - Default: does NOT run npm run build (teammate runs npm install && npm run build).
  - Zip root = project files (no extra staging folder name).

.PARAMETER RunBuild
  If set, runs npm run build before staging (use if you want a warm out\ in the zip; still excluded from zip by default).

.PARAMETER ZipName
  Output filename (default: FIS-TMS-Dashboard-Cursor-Handoff.zip).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/create-teammate-bundle.ps1

.EXAMPLE
  npm run bundle:teammate

.EXAMPLE
  npm run bundle:teammate:with-build
#>
param(
  [switch]$RunBuild,
  [string]$ZipName = "FIS-TMS-Dashboard-Cursor-Handoff.zip"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

$zipPath = Join-Path $Root $ZipName
$staging = $null

function Write-Step($n, $total, $msg) {
  Write-Host "[$n/$total] $msg"
}

$totalSteps = if ($RunBuild) { 4 } else { 4 }
# Step 1: optional build
if ($RunBuild) {
  Write-Step 1 $totalSteps "npm run build..."
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build failed. If you see EBUSY on out\, close Explorer preview / Live Server / pause OneDrive, or run without -RunBuild:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/create-teammate-bundle.ps1"
    exit $LASTEXITCODE
  }
} else {
  Write-Step 1 $totalSteps "Skipping npm run build (teammate: npm install && npm run build)."
}

try {
  $staging = Join-Path $env:TEMP ("dashboard-staging-" + [guid]::NewGuid().ToString())
  Write-Step 2 $totalSteps "Staging copy -> $staging"
  New-Item -ItemType Directory -Path $staging -Force | Out-Null

  # /E recurse; /XD skip heavy dirs; /XF skip handoff + export cruft (Dashboard-*.pdf via wildcard)
  $robocopyArgs = @(
    $Root, $staging, "/E",
    "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS",
    "/XD", "node_modules", ".next", "out", ".git", ".cursor",
    "/XF", $ZipName,
    "/XF", "FIS-TMS-Dashboard-Source-Bundle.zip",
    "/XF", "TMS_Dashboard_Review.zip",
    "/XF", "dashboard-right-here.embedded.html",
    "/XF", "TMS-Dashboard-standalone.html",
    "/XF", "TMS_RFP_Intelligence_Center_Review.html",
    "/XF", "DASHBOARD_STATE_EXPORT.md",
    "/XF", "tsconfig.tsbuildinfo",
    "/XF", "Dashboard-*.pdf"
  )
  & robocopy @robocopyArgs | Out-Null
  $rc = $LASTEXITCODE
  if ($rc -ge 8) {
    throw "robocopy failed with exit code $rc"
  }

  Write-Step 3 $totalSteps "Compressing $ZipName ..."
  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }

  # Zip contents live at archive root (not inside a GUID folder)
  $toZip = @(Get-ChildItem -LiteralPath $staging -Force | ForEach-Object { $_.FullName })
  if ($toZip.Count -eq 0) {
    throw "Staging folder is empty; nothing to zip."
  }
  Compress-Archive -LiteralPath $toZip -DestinationPath $zipPath -CompressionLevel Fastest -Force
} finally {
  if ($staging -and (Test-Path -LiteralPath $staging)) {
    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Write-Step 4 $totalSteps "Done."
$len = (Get-Item -LiteralPath $zipPath).Length
$mb = [math]::Round($len / 1MB, 2)
Write-Host "  Share: $zipPath"
Write-Host "  Size:  $mb MB ($len bytes)"
Write-Host "  Teammate: unzip, open in Cursor, run npm install && npm run build (see TEAMMATE-SETUP.md)."
