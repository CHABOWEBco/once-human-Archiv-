@echo off
setlocal
cd /d "%~dp0\..\.."
where powershell.exe >nul 2>nul || (echo [FEHLER] Windows PowerShell wurde nicht gefunden. & pause & exit /b 1)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0OnceHumanArchivOverlay.ps1"
if errorlevel 1 (
  echo.
  echo [FEHLER] Das Overlay wurde beendet. Lies die Meldung oben.
  pause
)
endlocal
