[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string[]]$Email,

    [Parameter(Mandatory = $false, Position = 1)]
    [string]$Url = ""
)

function Find-ChromeBinary {
    $candidates = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -Path $candidate)) {
            return $candidate
        }
    }

    # Registry lookup
    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
    )
    foreach ($regPath in $regPaths) {
        try {
            $regItem = Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue
            if ($regItem -and $regItem.'(default)' -and (Test-Path -Path $regItem.'(default)')) {
                return $regItem.'(default)'
            }
        } catch {}
    }

    # PATH lookup
    $cmd = Get-Command "chrome.exe" -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    return $null
}

function Find-ChromeProfileDirectory {
    param([string]$TargetEmail)

    $userDataDir = "$env:LOCALAPPDATA\Google\Chrome\User Data"
    $localStatePath = Join-Path $userDataDir "Local State"

    $cleanTarget = $TargetEmail.Trim().ToLower()

    # 1. Inspect Local State info_cache
    if (Test-Path -Path $localStatePath) {
        try {
            $rawJson = Get-Content -Path $localStatePath -Raw -Encoding UTF8
            $localState = $rawJson | ConvertFrom-Json
            $infoCache = $localState.profile.info_cache

            if ($infoCache) {
                foreach ($prop in $infoCache.PSObject.Properties) {
                    $dirName = $prop.Name
                    $info = $prop.Value
                    $userEmail = $info.user_name
                    if (-not $userEmail) { $userEmail = $info.email }

                    if ($userEmail -and ($userEmail.Trim().ToLower() -eq $cleanTarget)) {
                        return $dirName
                    }
                }
            }
        } catch {
            Write-Warning "Could not parse Chrome Local State file: $_"
        }
    }

    # 2. Inspect profile folder Preferences files
    if (Test-Path -Path $userDataDir) {
        $candidateDirs = Get-ChildItem -Path $userDataDir -Directory | Where-Object { $_.Name -match '^(Default|Profile \d+)$' }
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

$chromePath = Find-ChromeBinary
if (-not $chromePath) {
    Write-Error "Google Chrome is not installed or could not be found on this machine."
    exit 1
}

foreach ($target in $Email) {
    $profileDir = Find-ChromeProfileDirectory -TargetEmail $target

    $argList = @()
    $targetUrl = $Url

    if ($profileDir) {
        Write-Host "[OK] Profile directory '$profileDir' matched email: $target"
        $argList += "--profile-directory=`"$profileDir`""
    } else {
        Write-Host "[INFO] No existing Chrome profile found matching '$target'."
        Write-Host "[INFO] Opening Chrome sign-in page to set up this email..."
        if (-not $targetUrl) {
            $targetUrl = "https://accounts.google.com/AddSession?Email=$target"
        }
    }

    if ($targetUrl) {
        $argList += "`"$targetUrl`""
    }

    Start-Process -FilePath $chromePath -ArgumentList $argList
    Start-Sleep -Milliseconds 400
}
