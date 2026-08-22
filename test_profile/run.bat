<# :
@echo off
setlocal
title Chrome Profiles Launcher
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Expression (Get-Content -Path '%~f0' -Raw -Encoding UTF8)"
exit /b %ERRORLEVEL%
#>

# ==========================================
# قائمة الإيميلات المستهدفة / Target Emails
# ==========================================
$TargetEmails = @(
    "hesham10125@gmail.com",
    "heshamgaber692@gmail.com",
    "heshsamhassan779@gmail.com"
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "     Google Chrome Multi-Profile Launcher    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. البحث عن مسار Google Chrome على أي جهاز
function Get-ChromePath {
    $paths = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    foreach ($p in $paths) {
        if ($p -and (Test-Path -Path $p)) { return $p }
    }
    
    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
    )
    foreach ($reg in $regPaths) {
        try {
            $val = (Get-ItemProperty -Path $reg -ErrorAction SilentlyContinue).'(default)'
            if ($val -and (Test-Path -Path $val)) { return $val }
        } catch {}
    }

    $cmd = Get-Command "chrome.exe" -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    return $null
}

# 2. البحث عن مجلد البروفايل المطابق للإيميل
function Get-ProfileDir {
    param([string]$Email)
    $userData = "$env:LOCALAPPDATA\Google\Chrome\User Data"
    $localStatePath = Join-Path $userData "Local State"
    $cleanTarget = $Email.Trim().ToLower()

    # قراءة Local State
    if (Test-Path $localStatePath) {
        try {
            $json = Get-Content -Path $localStatePath -Raw -Encoding UTF8 | ConvertFrom-Json
            $infoCache = $json.profile.info_cache
            if ($infoCache) {
                foreach ($prop in $infoCache.PSObject.Properties) {
                    $profName = $prop.Name
                    $info = $prop.Value
                    $userEmail = $info.user_name
                    if (-not $userEmail) { $userEmail = $info.email }
                    if ($userEmail -and ($userEmail.Trim().ToLower() -eq $cleanTarget)) {
                        return $profName
                    }
                }
            }
        } catch {}
    }

    # فحص ملفات Preferences الفردية كحل احتياطي
    if (Test-Path $userData) {
        $candidateDirs = Get-ChildItem -Path $userData -Directory | Where-Object { $_.Name -match '^(Default|Profile \d+)$' }
        foreach ($dir in $candidateDirs) {
            $prefFile = Join-Path $dir.FullName "Preferences"
            if (Test-Path -Path $prefFile) {
                try {
                    $prefJson = Get-Content -Path $prefFile -Raw -Encoding UTF8 | ConvertFrom-Json
                    $accEmail = $prefJson.account_info[0].email
                    if (-not $accEmail) { $accEmail = $prefJson.signin.username }
                    if (-not $accEmail) { $accEmail = $prefJson.profile.user_name }
                    if ($accEmail -and ($accEmail.Trim().ToLower() -eq $cleanTarget)) {
                        return $dir.Name
                    }
                } catch {}
            }
        }
    }

    return $null
}

# التنفيذ
$chrome = Get-ChromePath
if (-not $chrome) {
    Write-Host "[X] Google Chrome is not installed on this system." -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[*] Chrome found: $chrome" -ForegroundColor Gray
Write-Host ""

foreach ($email in $TargetEmails) {
    $prof = Get-ProfileDir -Email $email
    if ($prof) {
        Write-Host "[✔] Launching profile '$prof' for: $email" -ForegroundColor Green
        Start-Process -FilePath $chrome -ArgumentList "--new-window", "--profile-directory=`"$prof`""
    } else {
        Write-Host "[!] Profile not found for: $email. Opening Sign-In..." -ForegroundColor Yellow
        Start-Process -FilePath $chrome -ArgumentList "--new-window", "https://accounts.google.com/AddSession?Email=$email"
    }
    Start-Sleep -Milliseconds 400
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host " All profiles launched successfully!        " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Start-Sleep -Seconds 2
