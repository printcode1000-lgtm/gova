# Push to GitHub using project-local SSH config (supports paths with spaces).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$SshConfig = Join-Path $Root '.ssh_config'
$DeployKey = Join-Path $Root '.ssh_local\gova\.git_deploy_key'

if (-not (Test-Path $SshConfig)) {
  throw "Missing .ssh_config at $SshConfig"
}
if (-not (Test-Path $DeployKey)) {
  throw "Missing deploy key at $DeployKey — see doc/GITHUB_SETUP.md"
}

$env:GIT_SSH_COMMAND = "ssh -F `"$SshConfig`" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30"

Write-Host "Testing SSH..."
ssh -F $SshConfig -o ConnectTimeout=15 -T git@github.com-gova 2>&1
if ($LASTEXITCODE -ne 1 -and $LASTEXITCODE -ne 0) {
  throw "SSH test failed (exit $LASTEXITCODE). Add the deploy key — see doc/GITHUB_SETUP.md"
}

Write-Host "`nPushing to origin main..."
git push origin main @args
Write-Host "`nDone. Check Actions: https://github.com/printcode1000-lgtm/gova/actions"
Write-Host "Site (after deploy): https://printcode1000-lgtm.github.io/gova/"
