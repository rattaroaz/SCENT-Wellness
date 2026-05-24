# Stops dev servers and removes Next.js build cache (fixes corrupted .next on Windows/OneDrive)
$ErrorActionPreference = "Continue"

& "$PSScriptRoot/clean-dev-ports.ps1"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$nextDir = Join-Path $repoRoot "frontend\.next"
if (Test-Path $nextDir) {
  Remove-Item -Recurse -Force $nextDir
  Write-Host "Removed frontend/.next"
} else {
  Write-Host "frontend/.next not present"
}

Start-Sleep -Milliseconds 300
Write-Host "Dev environment clean. Run: npm run dev"
