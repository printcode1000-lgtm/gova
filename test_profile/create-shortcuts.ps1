param(
    [Parameter(Mandatory = $false)]
    [string]$DestinationPath = ""
)

if (-not $DestinationPath) {
    $DestinationPath = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
}

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

$sh = New-Object -ComObject WScript.Shell

function Find-ChromeBinary {
    $candidates = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -Path $candidate)) { return $candidate }
    }
    return $null
}

function Find-ChromeProfileDirectory {
    param([string]$TargetEmail)
    $userDataDir = "$env:LOCALAPPDATA\Google\Chrome\User Data"
    $localStatePath = Join-Path $userDataDir "Local State"
    $cleanTarget = $TargetEmail.Trim().ToLower()

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
        } catch {}
    }
    return $null
}

$chromePath = Find-ChromeBinary
if (-not $chromePath) {
    Write-Error "Google Chrome executable was not found."
    exit 1
}

$cmdFiles = Get-ChildItem -Path $scriptDir -Filter "*@*.cmd"

foreach ($file in $cmdFiles) {
    $email = $file.BaseName
    $profileDir = Find-ChromeProfileDirectory -TargetEmail $email

    $shortcutName = "$email - Chrome.lnk"
    $shortcutPath = Join-Path $DestinationPath $shortcutName

    $sc = $sh.CreateShortcut($shortcutPath)
    $sc.TargetPath = $chromePath
    $sc.WorkingDirectory = Split-Path -Path $chromePath -Parent

    if ($profileDir) {
        $sc.Arguments = "--new-window --profile-directory=`"$profileDir`""
        $iconCandidate = Join-Path "$env:LOCALAPPDATA\Google\Chrome\User Data\$profileDir" "Google Profile.ico"
        if (Test-Path -Path $iconCandidate) {
            $sc.IconLocation = "$iconCandidate,0"
        }
        Write-Host "[OK] Created shortcut for $email -> $profileDir ($shortcutPath)"
    } else {
        $sc.Arguments = "--new-window `"https://accounts.google.com/AddSession?Email=$email`""
        Write-Host "[WARN] Profile for $email not found locally. Shortcut set to Google Sign-in."
    }

    $sc.Save()
}
