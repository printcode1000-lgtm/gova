@echo off
set "TARGET_EMAIL=hesham10125@gmail.com"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-profile.ps1" -Email "%TARGET_EMAIL%" %*
