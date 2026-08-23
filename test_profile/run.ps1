[CmdletBinding()]
param(
    [string[]]$Emails = @(
        "hesham10125@gmail.com",
        "heshamgaber692@gmail.com",
        "heshsamhassan779@gmail.com"
    ),
    [string]$Url = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Chrome Multi-Profile All-in-One Runner " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

# Step 1: Generate/Update local shortcuts
Write-Host "[1/2] Updating local shortcuts for this machine..." -ForegroundColor Yellow
try {
    & "$scriptDir\create-shortcuts.ps1" -DestinationPath $scriptDir
} catch {
    Write-Warning "Could not update shortcuts: $_"
}

Write-Host ""
# Step 2: Launch all profiles
Write-Host "[2/2] Launching Chrome profiles..." -ForegroundColor Yellow
try {
    & "$scriptDir\launch-profile.ps1" -Email $Emails -Url $Url
} catch {
    Write-Error "Error launching profiles: $_"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " All profiles processed successfully! " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
