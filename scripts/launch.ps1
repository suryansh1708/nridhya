# Nridhya Development Server Launcher (PowerShell - Windows/Mac/Linux)
# Usage: pwsh ./scripts/launch.ps1
#        pwsh ./scripts/launch.ps1 -NoBuild

param(
    [switch]$NoBuild
)

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  NRIDHYA DEVELOPMENT SERVERS   " -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    exit 1
}

# Check for Python
$pythonCmd = if (Get-Command python3 -ErrorAction SilentlyContinue) { "python3" } 
             elseif (Get-Command python -ErrorAction SilentlyContinue) { "python" }
             else { $null }

if (-not $pythonCmd) {
    Write-Host "ERROR: Python is not installed!" -ForegroundColor Red
    exit 1
}

if (-not $NoBuild) {
    Write-Host "[0/2] Building static site (frontend)..." -ForegroundColor Yellow
    Push-Location (Join-Path $projectRoot "frontend")
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "build failed" }
    } finally {
        Pop-Location
    }
    Write-Host ""
}

Write-Host "Starting servers..." -ForegroundColor Yellow
Write-Host ""

# Start Frontend (static file server)
Write-Host "[1/2] Serving dist/ on http://localhost:8000" -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    param($root, $py)
    Set-Location "$root/dist"
    & $py -m http.server 8000
} -ArgumentList $projectRoot, $pythonCmd

# Start CMS
Write-Host "[2/2] Starting CMS on http://localhost:3001" -ForegroundColor Green
$cmsJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location "$root/local-cms"
    npm start
} -ArgumentList $projectRoot

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "  SERVERS RUNNING              " -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend: http://localhost:8000" -ForegroundColor White
Write-Host "  CMS:      http://localhost:3001" -ForegroundColor White
Write-Host "  Preview:  http://localhost:3001/preview" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""

# Wait and keep running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`nStopping servers..." -ForegroundColor Yellow
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Stop-Job $cmsJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $cmsJob -ErrorAction SilentlyContinue
    Write-Host "Servers stopped." -ForegroundColor Green
}
