# Build static dashboard and zip a shareable source bundle (excludes node_modules, .next, out, .git).
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts/create-teammate-bundle.ps1
# Skip build (e.g. out/ locked by OneDrive):  -SkipBuild
# Or: npm run bundle:teammate

param([switch]$SkipBuild)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

$zipName = "FIS-TMS-Dashboard-Source-Bundle.zip"
$zipPath = Join-Path $Root $zipName

if ($SkipBuild) {
  Write-Host "[1/4] Skipping npm run build (-SkipBuild)."
} else {
  Write-Host "[1/4] npm run build..."
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "If the error is EBUSY on out\, close apps using that folder (Explorer preview, Live Server, OneDrive sync) and retry, or run:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/create-teammate-bundle.ps1 -SkipBuild"
    exit $LASTEXITCODE
  }
}

$staging = Join-Path $env:TEMP ("dashboard-staging-" + [guid]::NewGuid().ToString())
Write-Host "[2/4] Staging copy -> $staging"
New-Item -ItemType Directory -Path $staging -Force | Out-Null

# /E all subdirs; /XD skip heavy or regenerated dirs; /XF skip this zip if re-run
robocopy $Root $staging /E /NFL /NDL /NJH /NJS /NC /NS `
  /XD node_modules .next out .git .cursor `
  /XF $zipName dashboard-right-here.embedded.html | Out-Null
$rc = $LASTEXITCODE
if ($rc -ge 8) {
  Write-Error "robocopy failed with exit code $rc"
}

Write-Host "[3/4] Compressing $zipName ..."
if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path $staging -DestinationPath $zipPath -CompressionLevel Fastest -Force

Remove-Item -LiteralPath $staging -Recurse -Force

Write-Host "[4/4] Done."
Write-Host "  Static site: $Root\out\"
Write-Host "  Share zip:   $zipPath"
