# Verify deploy key + push to GitHub (run from repo root).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$KeyPub = Join-Path $Root '.ssh_local\gova\.git_deploy_key.pub'
$SshConfig = Join-Path $Root '.ssh_config'

if (-not (Test-Path $KeyPub)) {
  throw "Deploy key not found. Expected: $KeyPub"
}

Write-Host "=== Deploy key fingerprint (must match GitHub Deploy key) ==="
ssh-keygen -lf $KeyPub
Write-Host ""
Write-Host "Expected on GitHub: SHA256:hgNXCe0+siMxJY5e+1bdRM3VYWQbLqlDJE0vT9XhHZM"
Write-Host "Add at: https://github.com/printcode1000-lgtm/gova/settings/keys"
Write-Host "Enable: Allow write access`n"

$env:GIT_SSH_COMMAND = "ssh -F `"$SshConfig`" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20"

Write-Host "=== SSH test ==="
$sshOut = ssh -F $SshConfig -o ConnectTimeout=15 -T git@github.com 2>&1 | Out-String
Write-Host $sshOut

if ($sshOut -notmatch 'successfully authenticated|Hi ') {
  throw @"
SSH failed. On GitHub, confirm Deploy key fingerprint matches above and Write access is enabled.
See doc/GITHUB_SETUP.md section 3.
"@
}

Write-Host "`n=== git push origin main ==="
git push origin main @args

Write-Host "`n=== Next steps ==="
Write-Host "1. Enable Pages: https://github.com/printcode1000-lgtm/gova/settings/pages -> GitHub Actions"
Write-Host "2. Watch: https://github.com/printcode1000-lgtm/gova/actions"
Write-Host "3. Site:  https://printcode1000-lgtm.github.io/gova/"
