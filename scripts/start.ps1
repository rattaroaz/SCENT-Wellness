# Start SCENT Wellness (backend + frontend) on Windows PowerShell
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

if (-not (Test-Path "backend\prisma\dev.db")) {
  Write-Host "Setting up database..."
  npm run setup
}

Write-Host "Starting backend (3001) and frontend (3000)..."
Write-Host "Open http://localhost:3000"
npm run dev
