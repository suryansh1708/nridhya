# Stage, commit (if needed), and push to origin.
# Usage: pwsh ./scripts/push-latest.ps1 "Brief commit message"

param(
    [string]$Message = "Update site"
)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$branch = (git rev-parse --abbrev-ref HEAD).Trim()

git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "Nothing to commit." -ForegroundColor Yellow
}
else {
    git commit -m $Message
}

git push origin $branch
Write-Host "Pushed to origin/$branch" -ForegroundColor Green
