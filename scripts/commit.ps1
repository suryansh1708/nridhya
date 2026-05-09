# Nridhya Password-Protected Git Commit (PowerShell)
# Usage: pwsh ./scripts/commit.ps1

param(
    [string]$Message = "",
    [switch]$SetPassword,
    [switch]$ResetPassword
)

$passwordFile = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) ".commit-password"

function Get-PasswordHash {
    param([string]$Password)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Password)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha256.ComputeHash($bytes)
    return [BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

function Set-NewPassword {
    Write-Host ""
    Write-Host "=== SET COMMIT PASSWORD ===" -ForegroundColor Cyan
    Write-Host ""
    
    $password1 = Read-Host "Enter new password" -AsSecureString
    $password2 = Read-Host "Confirm password" -AsSecureString
    
    $pwd1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password1))
    $pwd2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password2))
    
    if ($pwd1 -ne $pwd2) {
        Write-Host "ERROR: Passwords do not match!" -ForegroundColor Red
        return $false
    }
    
    if ($pwd1.Length -lt 4) {
        Write-Host "ERROR: Password must be at least 4 characters!" -ForegroundColor Red
        return $false
    }
    
    $hash = Get-PasswordHash -Password $pwd1
    Set-Content -Path $passwordFile -Value $hash -NoNewline
    
    Write-Host ""
    Write-Host "Password set successfully!" -ForegroundColor Green
    Write-Host "This password file will be committed to git." -ForegroundColor Yellow
    Write-Host "The same password will work on any machine." -ForegroundColor Yellow
    Write-Host ""
    return $true
}

function Verify-Password {
    if (-not (Test-Path $passwordFile)) {
        Write-Host "No password set. Setting up now..." -ForegroundColor Yellow
        return Set-NewPassword
    }
    
    $storedHash = Get-Content -Path $passwordFile -Raw
    
    Write-Host ""
    $password = Read-Host "Enter commit password" -AsSecureString
    $pwd = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
    
    $inputHash = Get-PasswordHash -Password $pwd
    
    if ($inputHash -eq $storedHash.Trim()) {
        return $true
    } else {
        Write-Host "ERROR: Incorrect password!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Forgot password? Delete '.commit-password' file and run again to set a new one." -ForegroundColor Yellow
        return $false
    }
}

# Main logic
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  NRIDHYA SECURE COMMIT        " -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Handle password reset
if ($ResetPassword) {
    if (Test-Path $passwordFile) {
        Remove-Item $passwordFile
        Write-Host "Password file deleted." -ForegroundColor Yellow
    }
    Set-NewPassword
    exit 0
}

# Handle setting new password
if ($SetPassword) {
    Set-NewPassword
    exit 0
}

# Verify password before commit
if (-not (Verify-Password)) {
    exit 1
}

# Change to project root
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

# Show status
Write-Host ""
Write-Host "Current changes:" -ForegroundColor Yellow
git status --short

# Get commit message
if ([string]::IsNullOrEmpty($Message)) {
    Write-Host ""
    $Message = Read-Host "Enter commit message"
}

if ([string]::IsNullOrEmpty($Message)) {
    Write-Host "ERROR: Commit message is required!" -ForegroundColor Red
    exit 1
}

# Add all changes
Write-Host ""
Write-Host "Adding all changes..." -ForegroundColor Yellow
git add -A

# Commit
Write-Host "Committing..." -ForegroundColor Yellow
git commit -m $Message

if ($LASTEXITCODE -eq 0) {
    # Push
    Write-Host "Pushing to remote..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "================================" -ForegroundColor Green
        Write-Host "  COMMIT & PUSH SUCCESSFUL!    " -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
    } else {
        Write-Host "Push failed!" -ForegroundColor Red
    }
} else {
    Write-Host "Nothing to commit or commit failed." -ForegroundColor Yellow
}
